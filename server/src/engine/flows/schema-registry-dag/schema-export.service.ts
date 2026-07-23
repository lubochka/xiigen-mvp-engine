/**
 * T207 SchemaExportService [DATA_PIPELINE]
 * FLOW-11: Schema Registry & DAG
 *
 * Iron rules:
 *   IR-T207-1: Export only ACTIVE schemas (activeUntil: null).
 *   IR-T207-2: tenantId from ALS — NEVER from export request.
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

export interface ExportOptions {
  format?: 'json' | 'ndjson';
  schemaType?: string;
}

@Injectable()
export class SchemaExportService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbService: IDatabaseService,
    private readonly tenantContext: TenantContextLookup,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T207',
        serviceName: 'SchemaExportService',
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

  /** IR-T207-1: only ACTIVE schemas. IR-T207-2: tenantId from ALS. */
  async export(
    options: ExportOptions = {},
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    try {
      // IR-T207-2: tenantId from ALS — never from export request
      const tenantId = this.getTenantId();

      const filters: Record<string, unknown> = {
        tenantId,
        activeUntil: null,
        status: 'ACTIVE',
      };
      if (options.schemaType) {
        filters['schemaType'] = options.schemaType;
      }

      const result = await this.dbService.searchDocuments(SCHEMA_REGISTRY_INDEX, filters);
      if (!result.isSuccess) {
        return DataProcessResult.failure(
          result.errorCode ?? 'DB_ERROR',
          result.errorMessage ?? 'Export failed',
        );
      }
      return DataProcessResult.success(result.data ?? []);
    } catch (err) {
      return DataProcessResult.failure('EXPORT_ERROR', `SchemaExportService threw: ${String(err)}`);
    }
  }
}
