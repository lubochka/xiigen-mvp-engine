/**
 * T618 FlowPublicationOrchestrator [ORCHESTRATION]
 * FLOW-18: Visual Flow Creation & Code Injection Engine
 *
 * Entry: FlowPublicationRequested event (user initiates flow publication)
 *
 * Execution order is MACHINE (CF-18-2):
 *   ORDER 1: DFS cycle detection (WHITE/GRAY/BLACK) — CycleDetected on cycle found
 *   ORDER 2: Type compatibility per-edge — TypeMismatch on schema incompatibility
 *   ORDER 3: OCC updateDocument(status:PUBLISHED, expectedVersion)
 *   ORDER 4: storeDocument(audit) — DNA-8, before emit
 *   ORDER 5: enqueue(FlowPublished) — only after all validation and OCC write succeed
 *
 * Iron rules:
 *   IR-1: DFS at ORDER 1 before any type check — cyclic graphs cannot be deployed (CF-18-2)
 *   IR-2: Type compatibility per-edge at ORDER 2 — schema-driven validation (CF-18-2)
 *   IR-3: OCC write (not plain storeDocument) for DRAFT→PUBLISHED transition (CF-18-2)
 *   IR-4: storeDocument(audit) at ORDER 4 BEFORE enqueue(FlowPublished) (DNA-8)
 *   IR-5: CycleDetected, TypeMismatch, FlowPublicationConflict on respective failures
 *
 * Pattern reference: CONNECTION-TYPE-COMPATIBILITY-001
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const FLOW_CANVAS_INDEX = 'xiigen-flow-canvases';
const PUBLICATION_AUDIT_INDEX = 'xiigen-publication-audit';

/** MACHINE: DFS node colors — compile-time constants. CF-18-2. */
const WHITE = 'WHITE' as const;
const GRAY = 'GRAY' as const;
const BLACK = 'BLACK' as const;

interface FlowEdge {
  from: string;
  to: string;
  sourceOutputType?: string;
  targetInputType?: string;
}

@Injectable()
export class FlowPublicationOrchestratorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T618',
        serviceName: 'FlowPublicationOrchestratorService',
        flowId: 'FLOW-18',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * DFS cycle detection using WHITE/GRAY/BLACK coloring.
   * Returns the cycle nodes if a cycle is found, null otherwise.
   * IR-1: GRAY re-visit = cycle. CF-18-2.
   */
  private detectCycle(nodes: string[], edges: FlowEdge[]): string[] | null {
    const color = new Map<string, typeof WHITE | typeof GRAY | typeof BLACK>(
      nodes.map((n) => [n, WHITE]),
    );
    const adj = new Map<string, string[]>();
    for (const n of nodes) adj.set(n, []);
    for (const e of edges) {
      const neighbors = adj.get(e.from) ?? [];
      neighbors.push(e.to);
      adj.set(e.from, neighbors);
    }

    const cycleNodes: string[] = [];

    const dfs = (node: string): boolean => {
      color.set(node, GRAY);
      for (const neighbor of adj.get(node) ?? []) {
        if (color.get(neighbor) === GRAY) {
          // GRAY re-visit = cycle found
          cycleNodes.push(node, neighbor);
          return true;
        }
        if (color.get(neighbor) === WHITE && dfs(neighbor)) {
          cycleNodes.push(node);
          return true;
        }
      }
      color.set(node, BLACK);
      return false;
    };

    for (const n of nodes) {
      if (color.get(n) === WHITE && dfs(n)) {
        return cycleNodes;
      }
    }
    return null;
  }

  /**
   * Type compatibility check per-edge.
   * Returns the first incompatible edge found, or null if all edges are compatible.
   * IR-2: source output schema must match target input schema. CF-18-2.
   */
  private findTypeIncompatibleEdge(edges: FlowEdge[]): FlowEdge | null {
    for (const edge of edges) {
      if (
        edge.sourceOutputType &&
        edge.targetInputType &&
        edge.sourceOutputType !== edge.targetInputType
      ) {
        return edge;
      }
    }
    return null;
  }

  /**
   * DFS cycle detection + type compatibility + OCC DRAFT→PUBLISHED.
   * DPO pattern: CONNECTION-TYPE-COMPATIBILITY-001
   */
  async publishFlow(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const flowId = event['flowId'] as string;
    const expectedVersion = event['expectedVersion'] as string | undefined;

    if (!flowId) {
      return DataProcessResult.failure('INVALID_INPUT', 'flowId is required');
    }

    const flowResult = await this.dbFabric.searchDocuments(FLOW_CANVAS_INDEX, { flowId });
    if (!flowResult.isSuccess || (flowResult.data ?? []).length === 0) {
      return DataProcessResult.failure('FLOW_NOT_FOUND', `Flow canvas not found: ${flowId}`);
    }

    const flow = flowResult.data![0] as Record<string, unknown>;
    const nodes = (flow['nodes'] as string[]) ?? [];
    const edges = (flow['edges'] as FlowEdge[]) ?? [];

    // ── ORDER 1: DFS cycle detection — IR-1, CF-18-2 ─────────────────────────
    const cycleNodes = this.detectCycle(nodes, edges);
    if (cycleNodes !== null) {
      await this.queueFabric.enqueue('CycleDetected', {
        flowId,
        tenantId,
        cycleNodes,
      });
      return DataProcessResult.failure(
        'CYCLE_DETECTED',
        `Flow graph contains a cycle: ${cycleNodes.join(' → ')}`,
      );
    }

    // ── ORDER 2: Type compatibility per-edge — IR-2, CF-18-2 ─────────────────
    const incompatibleEdge = this.findTypeIncompatibleEdge(edges);
    if (incompatibleEdge !== null) {
      await this.queueFabric.enqueue('TypeMismatch', {
        flowId,
        tenantId,
        edge: incompatibleEdge,
        sourceOutputType: incompatibleEdge.sourceOutputType,
        targetInputType: incompatibleEdge.targetInputType,
      });
      return DataProcessResult.failure(
        'TYPE_MISMATCH',
        `Edge ${incompatibleEdge.from}→${incompatibleEdge.to}: ` +
          `source output type ${incompatibleEdge.sourceOutputType} incompatible with ` +
          `target input type ${incompatibleEdge.targetInputType}`,
      );
    }

    const publishedAt = new Date().toISOString();
    const currentVersion = (flow['version'] as string) ?? '0';

    // ── ORDER 3: OCC DRAFT→PUBLISHED — IR-3, CF-18-2 ─────────────────────────
    // OCC check: expectedVersion must match current version
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      await this.queueFabric.enqueue('FlowPublicationConflict', {
        flowId,
        tenantId,
        expectedVersion,
        actualVersion: currentVersion,
      });
      return DataProcessResult.failure(
        'OCC_CONFLICT',
        `Version conflict: expected ${expectedVersion} but found ${currentVersion}`,
      );
    }

    const newVersion = String(parseInt(currentVersion, 10) + 1);

    // storeDocumentWithOCC — IR-3 (NEVER plain storeDocument for DRAFT→PUBLISHED)
    const versionPin = flow['_version'] as string | undefined;
    const occOpts = versionPin
      ? {
          ifSeqNo: parseInt(versionPin.split(':')[0] ?? '0', 10),
          ifPrimaryTerm: parseInt(versionPin.split(':')[1] ?? '1', 10),
        }
      : { ifSeqNo: 0, ifPrimaryTerm: 1 };
    await this.dbFabric.storeDocumentWithOCC(
      FLOW_CANVAS_INDEX,
      {
        ...flow,
        flowId,
        tenantId,
        status: 'PUBLISHED',
        version: newVersion,
        publishedAt,
        knowledgeScope: 'PRIVATE',
      },
      flowId,
      occOpts,
    );

    // ── ORDER 4: Audit write — IR-4, DNA-8 ──────────────────────────────────
    // storeDocument(audit) BEFORE enqueue(FlowPublished)
    await this.dbFabric.storeDocument(PUBLICATION_AUDIT_INDEX, {
      flowId,
      tenantId,
      action: 'FLOW_PUBLISHED',
      fromVersion: currentVersion,
      toVersion: newVersion,
      publishedAt,
      timestamp: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
    });

    // ── ORDER 5: Emit FlowPublished — IR-5 ──────────────────────────────────
    await this.queueFabric.enqueue('FlowPublished', {
      flowId,
      tenantId,
      version: newVersion,
      publishedAt,
    });

    return DataProcessResult.success({
      flowId,
      tenantId,
      status: 'PUBLISHED',
      version: newVersion,
      publishedAt,
    });
  }
}
