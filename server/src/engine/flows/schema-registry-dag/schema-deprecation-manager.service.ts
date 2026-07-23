/**
 * T200 SchemaDeprecationManager [ORCHESTRATION]
 * FLOW-11: Schema Registry & DAG
 *
 * Iron rules:
 *   IR-T200-1: updateDocument soft state only: ACTIVE→DEPRECATED→ARCHIVED.
 *   IR-T200-2: deleteDocument PROHIBITED — knowledgeScope stays PRIVATE.
 *   IR-T200-3: TTL from FREEDOM config 'flow11_schema_registry_deprecation_ttl_ms'.
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
const FREEDOM_INDEX = 'freedom_configs';

@Injectable()
export class SchemaDeprecationManagerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbService: IDatabaseService,
    private readonly tenantContext: TenantContextLookup,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T200',
        serviceName: 'SchemaDeprecationManagerService',
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
  /** Set schema as DEPRECATED (soft state). deleteDocument PROHIBITED. */
  async deprecate(schemaId: string): Promise<DataProcessResult<void>> {
    try {
      const tenantId = this.getTenantId();
      const existing = await this.dbService.getDocument(SCHEMA_REGISTRY_INDEX, schemaId);
      if (!existing.isSuccess) {
        return DataProcessResult.failure('NOT_FOUND', `Schema ${schemaId} not found`);
      }
      const doc = existing.data! as Record<string, unknown>;
      const ttlMs = await this.getDeprecationTtlMs(tenantId);
      const now = new Date().toISOString();
      const archivedAt = new Date(Date.now() + ttlMs).toISOString();

      // Soft state update only — deleteDocument PROHIBITED (IR-T200-2)
      await this.dbService.storeDocument(
        SCHEMA_REGISTRY_INDEX,
        {
          ...doc,
          status: 'DEPRECATED',
          deprecated: true,
          deprecatedAt: now,
          scheduledArchiveAt: archivedAt,
          connectionType: 'FLOW_SCOPED',
          knowledgeScope: 'PRIVATE',
        },
        schemaId,
      );

      return DataProcessResult.success(undefined as unknown as void);
    } catch (err) {
      return DataProcessResult.failure(
        'DEPRECATION_ERROR',
        `SchemaDeprecationManager threw: ${String(err)}`,
      );
    }
  }

  /** TTL from FREEDOM config. */
  private async getDeprecationTtlMs(tenantId: string): Promise<number> {
    const cfg = await this.dbService.searchDocuments(FREEDOM_INDEX, {
      tenantId,
      config_key: 'flow11_schema_registry_deprecation_ttl_ms',
      task_type: 'xiigen-engine',
    });
    if (cfg.isSuccess && (cfg.data ?? []).length > 0) {
      const val = parseInt(
        String((cfg.data![0] as Record<string, unknown>)['config_value'] ?? ''),
        10,
      );
      if (!isNaN(val) && val > 0) return val;
    }
    return 30 * 24 * 60 * 60 * 1000; // 30 days default
  }
}
