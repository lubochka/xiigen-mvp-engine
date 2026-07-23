/**
 * T192 DagDependencyTracker [DATA_PIPELINE, @EventPattern]
 * FLOW-11: Schema Registry & DAG
 *
 * Iron rules:
 *   IR-T192-1: @EventPattern('SchemaPublished') consumer — NOT inline.
 *              HTTP response returns before rebuild begins.
 *   IR-T192-2: UNIDIRECTIONAL edges only — A→B (A depends on B).
 *              DPO triple: conflictsWith: 'FLOW-07-T75-bidirectional-graph-write'
 *   IR-T192-3: Full rebuild: read ALL schemas for tenantId, not incremental.
 *   IR-T192-4: storeDocument(dagNode) BEFORE enqueue(DagRebuildCompleted). DNA-8.
 *   IR-T192-5: Written records: { knowledgeScope: 'PRIVATE', connectionType: 'FLOW_SCOPED' }.
 *
 * DPO conflict annotation:
 *   conflictsWith: 'FLOW-07-T75-bidirectional-graph-write'
 *   FLOW-07 T75 writes bidirectional edges (A→B AND B→A).
 *   T192 writes UNIDIRECTIONAL only (A→B). Both patterns are domain-correct.
 *   INVERTS FLOW-07 T75 bidirectional graph write.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

interface TenantContextLookup {
  getCurrentTenantId?: () => { isSuccess: boolean; data?: string };
  get?: (key: string) => { tenantId?: string } | undefined;
}

const SCHEMA_REGISTRY_INDEX = 'xiigen-schema-registry';
const DAG_TOPOLOGY_INDEX = 'xiigen-dag-topology';

@Injectable()
export class DagDependencyTrackerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbService: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueService: IQueueService,
    private readonly tenantContext: TenantContextLookup,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T192',
        serviceName: 'DagDependencyTrackerService',
        flowId: 'FLOW-11',
      }),
    });
  }

  private getTenantId(fallback?: string): string {
    const resolved = this.tenantContext.getCurrentTenantId?.();
    if (resolved?.isSuccess && typeof resolved.data === 'string' && resolved.data.length > 0) {
      return resolved.data;
    }
    const legacyTenant = this.tenantContext.get?.('tenant')?.tenantId;
    return legacyTenant ?? fallback ?? 'unknown';
  }
  /**
   * IR-T192-1: @EventPattern('SchemaPublished') consumer — NOT inline.
   * DPO triple: conflictsWith: 'FLOW-07-T75-bidirectional-graph-write'
   * UNIDIRECTIONAL edges only (this flow) vs BIDIRECTIONAL (FLOW-07 T75).
   *
   * executionModel: EVENT_DRIVEN — triggered by SchemaPublished queue event.
   */
  // @EventPattern('SchemaPublished') — see engine module for event binding
  async onSchemaPublished(event: Record<string, unknown>): Promise<void> {
    const tenantId = this.getTenantId(event['tenantId'] as string);
    await this.rebuild(tenantId, event['schemaType'] as string);
  }

  async rebuild(
    tenantId: string,
    triggerSchemaType: string,
  ): Promise<DataProcessResult<{ nodeCount: number }>> {
    try {
      // IR-T192-3: Full rebuild — read ALL active schemas for tenant
      const schemasResult = await this.dbService.searchDocuments(SCHEMA_REGISTRY_INDEX, {
        tenantId,
        activeUntil: null,
        status: 'ACTIVE',
      });
      const schemas = schemasResult.isSuccess ? (schemasResult.data ?? []) : [];

      // Build topology: UNIDIRECTIONAL edges only (A→B = A depends on B)
      // DPO triple: conflictsWith FLOW-07-T75-bidirectional-graph-write
      const edges: Array<{ from: string; to: string }> = [];
      for (const schema of schemas) {
        const schemaType = String(schema['schemaType'] ?? '');
        const deps = (schema['dependencies'] as string[]) ?? [];
        for (const dep of deps) {
          // IR-T192-2: UNIDIRECTIONAL — A→B only, never B→A
          edges.push({ from: schemaType, to: dep });
        }
      }

      const dagNodeId = `dag-topology-${tenantId}`;
      const dagNode: Record<string, unknown> = {
        dagNodeId,
        tenantId,
        schemaCount: schemas.length,
        edges,
        edgeCount: edges.length,
        rebuiltAt: new Date().toISOString(),
        triggerSchemaType,
        // UNIDIRECTIONAL only — DPO triple annotation
        edgeModel: 'UNIDIRECTIONAL',
        dpoConflict: 'FLOW-07-T75-bidirectional-graph-write',
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      };

      // DNA-8: storeDocument BEFORE enqueue
      const stored = await this.dbService.storeDocument(DAG_TOPOLOGY_INDEX, dagNode, dagNodeId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      await this.queueService.enqueue('DagRebuildCompleted', {
        tenantId,
        schemaType: triggerSchemaType,
        nodeCount: schemas.length,
        edgeCount: edges.length,
        rebuiltAt: new Date().toISOString(),
      });

      return DataProcessResult.success({ nodeCount: schemas.length });
    } catch (err) {
      return DataProcessResult.failure(
        'DAG_REBUILD_ERROR',
        `DagDependencyTracker threw: ${String(err)}`,
      );
    }
  }
}
