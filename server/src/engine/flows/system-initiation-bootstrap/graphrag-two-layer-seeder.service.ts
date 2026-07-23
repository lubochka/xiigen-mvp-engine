/**
 * GraphRAGTwoLayerSeeder — T537 [DATA_PIPELINE].
 *
 * Constructs self-knowledge GraphRAG in two strict layers.
 * Layer 1: index engine contracts, task types, factory interfaces.
 * Layer 2: build cross-flow dependency graph edges.
 *
 * CF-743: Layer 2 MUST NOT start before Layer 1 is 100% complete.
 *
 * DNA-3: All methods return DataProcessResult — never throw.
 * DNA-8: storeDocument() BEFORE enqueue() on each batch.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { randomUUID } from 'crypto';
import type {
  Flow33DocumentUpdater,
  Flow33Queue,
  Flow33RagIndexer,
} from './flow33-shared-interfaces';

export type LayerStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED';

export interface SeedingBatch {
  batchId: string;
  layer: 1 | 2;
  nodeIds: string[];
  indexedAt: string;
}

export interface GraphRAGSeedingResult {
  seedingRunId: string;
  layer1NodeCount: number;
  layer2EdgeCount: number;
  completedAt: string;
}

export interface GraphRAGNode {
  nodeId: string;
  nodeType: 'task_type' | 'factory_interface' | 'engine_contract' | 'cf_rule';
  content: string;
  metadata: Record<string, unknown>;
}

export interface GraphRAGEdge {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  edgeType: 'depends_on' | 'shares_entity' | 'shares_event' | 'cross_flow';
  flowId: string;
}

export class GraphRAGTwoLayerSeeder {
  constructor(
    private readonly db: Flow33DocumentUpdater,
    private readonly rag: Flow33RagIndexer,
    private readonly queue: Flow33Queue,
  ) {}

  /**
   * Get Layer 1 status — used to gate Layer 2 start (CF-743).
   */
  async getLayer1Status(tenantId: string): Promise<DataProcessResult<LayerStatus>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    const result = await this.db.searchDocuments('flow33-graphrag-seeding-state', {
      tenantId,
      layer: 1,
    });
    if (!result.isSuccess)
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    if (!result.data?.length) return DataProcessResult.success('NOT_STARTED');
    return DataProcessResult.success(result.data[0]['status'] as LayerStatus);
  }

  /**
   * Seed Layer 1 — index engine contracts, task types, factory interfaces.
   * Each batch is idempotent by nodeId (content-addressed).
   */
  async seedLayer1(
    tenantId: string,
    nodes: GraphRAGNode[],
  ): Promise<DataProcessResult<SeedingBatch>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!nodes.length)
      return DataProcessResult.failure(
        'EMPTY_BATCH',
        'At least one node required for Layer 1 seeding',
      );

    const batchId = randomUUID();
    const indexedAt = new Date().toISOString();

    // Mark layer 1 IN_PROGRESS
    await this.db.storeDocument(
      'flow33-graphrag-seeding-state',
      { tenantId, layer: 1, status: 'IN_PROGRESS', startedAt: indexedAt },
      `${tenantId}-layer1`,
    );

    const indexedNodeIds: string[] = [];
    for (const node of nodes) {
      // Idempotency: content-addressed by nodeId
      const existing = await this.db.searchDocuments('flow33-graphrag-nodes', {
        nodeId: node.nodeId,
        tenantId,
      });
      if (existing.isSuccess && existing.data?.length) {
        indexedNodeIds.push(node.nodeId);
        continue;
      }

      const doc: Record<string, unknown> = { ...node, tenantId, indexedAt, layer: 1 };
      // DNA-8: store BEFORE RAG index
      const stored = await this.db.storeDocument('flow33-graphrag-nodes', doc, node.nodeId);
      if (!stored.isSuccess) {
        await this.db.updateDocument('flow33-graphrag-seeding-state', `${tenantId}-layer1`, {
          status: 'FAILED',
          failedAt: new Date().toISOString(),
        });
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      await this.rag.indexDocument('flow33-graphrag', doc);
      indexedNodeIds.push(node.nodeId);
    }

    // Mark layer 1 COMPLETE
    await this.db.updateDocument('flow33-graphrag-seeding-state', `${tenantId}-layer1`, {
      status: 'COMPLETE',
      completedAt: new Date().toISOString(),
    });

    const batch: SeedingBatch = { batchId, layer: 1, nodeIds: indexedNodeIds, indexedAt };
    // DNA-8: store batch record BEFORE emit
    await this.db.storeDocument(
      'flow33-graphrag-batches',
      batch as unknown as Record<string, unknown>,
      batchId,
    );
    await this.queue.enqueue('graphrag.layer1.completed', {
      batchId,
      tenantId,
      nodeCount: indexedNodeIds.length,
      indexedAt,
    });

    return DataProcessResult.success(batch);
  }

  /**
   * Seed Layer 2 — build cross-flow dependency graph edges.
   * CF-743: BLOCKED until Layer 1 status = COMPLETE.
   */
  async seedLayer2(
    tenantId: string,
    edges: GraphRAGEdge[],
  ): Promise<DataProcessResult<SeedingBatch>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');

    // CF-743: Verify Layer 1 is COMPLETE before Layer 2 starts
    const layer1Status = await this.getLayer1Status(tenantId);
    if (!layer1Status.isSuccess)
      return DataProcessResult.failure(layer1Status.errorCode!, layer1Status.errorMessage!);
    if (layer1Status.data !== 'COMPLETE') {
      return DataProcessResult.failure(
        'LAYER1_NOT_COMPLETE',
        `Layer 2 cannot start until Layer 1 is COMPLETE (CF-743). Current status: ${layer1Status.data}`,
      );
    }

    if (!edges.length)
      return DataProcessResult.failure(
        'EMPTY_BATCH',
        'At least one edge required for Layer 2 seeding',
      );

    const batchId = randomUUID();
    const indexedAt = new Date().toISOString();
    const indexedEdgeIds: string[] = [];

    for (const edge of edges) {
      // Idempotency: content-addressed by edgeId
      const existing = await this.db.searchDocuments('flow33-graphrag-edges', {
        edgeId: edge.edgeId,
        tenantId,
      });
      if (existing.isSuccess && existing.data?.length) {
        indexedEdgeIds.push(edge.edgeId);
        continue;
      }

      const doc: Record<string, unknown> = { ...edge, tenantId, indexedAt, layer: 2 };
      // DNA-8: store BEFORE RAG index
      const stored = await this.db.storeDocument('flow33-graphrag-edges', doc, edge.edgeId);
      if (!stored.isSuccess)
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

      await this.rag.indexDocument('flow33-graphrag-edges', doc);
      indexedEdgeIds.push(edge.edgeId);
    }

    const batch: SeedingBatch = { batchId, layer: 2, nodeIds: indexedEdgeIds, indexedAt };
    // DNA-8: store batch BEFORE emit
    await this.db.storeDocument(
      'flow33-graphrag-batches',
      batch as unknown as Record<string, unknown>,
      batchId,
    );
    await this.queue.enqueue('graphrag.layer2.completed', {
      batchId,
      tenantId,
      edgeCount: indexedEdgeIds.length,
      indexedAt,
    });

    return DataProcessResult.success(batch);
  }
}
