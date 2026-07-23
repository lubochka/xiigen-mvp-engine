/**
 * MultiHopGraphTraversal — T463 RETRIEVAL service for FLOW-29.
 *
 * Multi-hop graph traversal via IRagService.
 * visited-set guard prevents cycles — hard guard, not optional.
 *
 * Iron rules:
 *   VISITED:    visited-set MUST prevent cycles — hard guard
 *   MAX_DEPTH:  from FREEDOM config — never hardcoded
 *   CF-476:     tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:      All methods return DataProcessResult<T> — never throw
 *   DNA-8:      storeDocument() BEFORE enqueue()
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { IRagService } from '../../../fabrics/interfaces/rag.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface TraversedNode {
  readonly nodeId: string;
  readonly hopDepth: number;
  readonly content: string;
  readonly metadata: Record<string, unknown>;
}

export interface TraversalResult {
  readonly traversalId: string;
  readonly nodes: TraversedNode[];
  readonly edgesTraversed: number;
  readonly maxDepthReached: boolean;
}

// ── Constants ────────────────────────────────────────────────────────────────

const TRAVERSAL_INDEX = 'flow29-graph-traversals';
const TRAVERSAL_EVENT = 'retrieval.graph.traversal.completed';
const DEFAULT_MAX_DEPTH = 3;

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class MultiHopGraphTraversal {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
    private readonly rag: IRagService,
  ) {}

  /**
   * Traverse a graph starting from startNodeId up to maxDepth hops.
   *
   * visited-set prevents cycles — hard guard.
   * Empty or disconnected start node returns partial result, not error.
   */
  async traverse(
    tenantId: string,
    startNodeId: string,
    maxDepth: number = DEFAULT_MAX_DEPTH,
  ): Promise<DataProcessResult<TraversalResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!startNodeId || startNodeId.trim() === '') {
      return DataProcessResult.failure('MISSING_START_NODE', 'startNodeId is required');
    }
    if (maxDepth < 1) {
      return DataProcessResult.failure('INVALID_MAX_DEPTH', 'maxDepth must be >= 1');
    }

    const visited = new Set<string>();
    const nodes: TraversedNode[] = [];
    let edgesTraversed = 0;
    let maxDepthReached = false;

    // BFS traversal with visited-set cycle guard
    const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: startNodeId, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.nodeId)) continue;
      visited.add(current.nodeId);

      if (current.depth > maxDepth) {
        maxDepthReached = true;
        break;
      }

      // Fetch node via RAG (graph index)
      const nodeResult = await this.rag.search(current.nodeId, {
        filters: { node_id: current.nodeId, tenant_id: tenantId },
      });
      const nodeData = nodeResult.isSuccess ? (nodeResult.data ?? [])[0] : null;

      if (nodeData) {
        nodes.push({
          nodeId: current.nodeId,
          hopDepth: current.depth,
          content: String(nodeData['content'] ?? ''),
          metadata: (nodeData['metadata'] as Record<string, unknown>) ?? {},
        });

        if (current.depth < maxDepth) {
          const neighbors = (nodeData['neighbors'] as string[] | undefined) ?? [];
          for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
              queue.push({ nodeId: neighbor, depth: current.depth + 1 });
              edgesTraversed++;
            }
          }
        } else {
          maxDepthReached = true;
        }
      }
    }

    const traversalId = `trav-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const traversedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      traversal_id: traversalId,
      tenant_id: tenantId,
      start_node_id: startNodeId,
      nodes_visited: nodes.length,
      edges_traversed: edgesTraversed,
      max_depth_reached: maxDepthReached,
      traversed_at: traversedAt,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.db.storeDocument(TRAVERSAL_INDEX, doc, traversalId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store traversal record',
      );
    }

    await this.queue.enqueue(TRAVERSAL_EVENT, {
      traversal_id: traversalId,
      tenant_id: tenantId,
      nodes_visited: nodes.length,
      traversed_at: traversedAt,
    });

    return DataProcessResult.success({ traversalId, nodes, edgesTraversed, maxDepthReached });
  }
}
