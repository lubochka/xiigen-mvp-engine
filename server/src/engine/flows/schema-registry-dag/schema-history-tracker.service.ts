/**
 * T201 SchemaHistoryTracker [DATA_PIPELINE]
 * FLOW-11: Schema Registry & DAG
 *
 * Iron rules:
 *   IR-T201-1: storeDocument append-only — updateDocument/deleteDocument PROHIBITED.
 *   IR-T201-2: History record appended per SchemaPublished event.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';

interface TenantContextLookup {
  getCurrentTenantId?: () => { isSuccess: boolean; data?: string };
  get?: (key: string) => { tenantId?: string } | undefined;
}

const SCHEMA_HISTORY_INDEX = 'xiigen-schema-history';

@Injectable()
export class SchemaHistoryTrackerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbService: IDatabaseService,
    private readonly tenantContext: TenantContextLookup,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T201',
        serviceName: 'SchemaHistoryTrackerService',
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
  // @EventPattern('SchemaPublished') — see engine module for event binding
  async onSchemaPublished(event: Record<string, unknown>): Promise<void> {
    await this.appendHistory(event);
  }

  /** IR-T201-1: storeDocument ONLY — never update or delete. */
  async appendHistory(event: Record<string, unknown>): Promise<DataProcessResult<void>> {
    try {
      const tenantId = this.getTenantId(event['tenantId'] as string);
      const historyId = `history-${event['schemaId'] ?? event['schemaType']}-${Date.now()}`;
      await this.dbService.storeDocument(
        SCHEMA_HISTORY_INDEX,
        {
          historyId,
          schemaId: event['schemaId'] ?? null,
          schemaType: event['schemaType'] ?? null,
          version: event['version'] ?? null,
          changeType: event['changeType'] ?? null,
          publishedAt: event['publishedAt'] ?? new Date().toISOString(),
          tenantId,
          connectionType: 'FLOW_SCOPED',
          knowledgeScope: 'PRIVATE',
        },
        historyId,
      );
      return DataProcessResult.success(undefined as unknown as void);
    } catch (err) {
      return DataProcessResult.failure(
        'HISTORY_ERROR',
        `SchemaHistoryTracker threw: ${String(err)}`,
      );
    }
  }
}
