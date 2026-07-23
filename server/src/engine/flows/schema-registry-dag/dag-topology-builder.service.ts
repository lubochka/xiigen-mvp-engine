/**
 * T197 DagTopologyBuilder [DATA_PIPELINE]
 * FLOW-11: Schema Registry & DAG
 *
 * Iron rules:
 *   IR-T197-1: Only schemas with activeUntil: null (active schemas) included in topology.
 *   IR-T197-2: Edges UNIDIRECTIONAL — A→B (A depends on B).
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

interface TenantContextLookup {
  getCurrentTenantId?: () => { isSuccess: boolean; data?: string };
  get?: (key: string) => { tenantId?: string } | undefined;
}

const SCHEMA_REGISTRY_INDEX = 'xiigen-schema-registry';

export interface DagTopology {
  nodes: string[];
  edges: Array<{ from: string; to: string }>;
  schemaCount: number;
}

@Injectable()
export class DagTopologyBuilderService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbService: IDatabaseService,
    private readonly tenantContext: TenantContextLookup,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T197',
        serviceName: 'DagTopologyBuilderService',
        flowId: 'FLOW-11',
      }),
    });
  }

  private getTenantId(): string {
    const resolved = this.tenantContext.getCurrentTenantId?.();
    if (resolved?.isSuccess && typeof resolved.data === 'string' && resolved.data.length > 0) {
      return resolved.data;
    }
    const legacyTenant = this.tenantContext.get?.('tenant')?.tenantId;
    return legacyTenant ?? 'unknown';
  }
  /** Build topology from active schemas only (activeUntil: null). UNIDIRECTIONAL edges. */
  async buildTopology(): Promise<DataProcessResult<DagTopology>> {
    try {
      const tenantId = this.getTenantId();
      const result = await this.dbService.searchDocuments(SCHEMA_REGISTRY_INDEX, {
        tenantId,
        activeUntil: null,
      });
      if (!result.isSuccess) {
        return DataProcessResult.failure(
          result.errorCode ?? 'DB_ERROR',
          result.errorMessage ?? 'Failed to fetch schemas',
        );
      }
      const schemas = result.data ?? [];
      const nodes: string[] = [];
      const edges: Array<{ from: string; to: string }> = [];

      for (const schema of schemas) {
        const schemaType = String(schema['schemaType'] ?? '');
        if (schemaType && !nodes.includes(schemaType)) nodes.push(schemaType);
        const deps = (schema['dependencies'] as string[]) ?? [];
        for (const dep of deps) {
          // IR-T197-2: UNIDIRECTIONAL A→B only
          edges.push({ from: schemaType, to: dep });
        }
      }
      return DataProcessResult.success({ nodes, edges, schemaCount: schemas.length });
    } catch (err) {
      return DataProcessResult.failure(
        'TOPOLOGY_ERROR',
        `DagTopologyBuilder threw: ${String(err)}`,
      );
    }
  }
}
