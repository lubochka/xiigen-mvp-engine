/**
 * T198 SchemaSearchService [DATA_PIPELINE]
 * FLOW-11: Schema Registry & DAG
 *
 * Iron rules:
 *   IR-T198-1: tenantId filter required on every query.
 *   IR-T198-2: empty result = DataProcessResult.success([]) not failure.
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

export interface SchemaSearchFilters {
  schemaType?: string;
  version?: string;
  status?: string;
  changeType?: string;
}

@Injectable()
export class SchemaSearchService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbService: IDatabaseService,
    private readonly tenantContext: TenantContextLookup,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T198',
        serviceName: 'SchemaSearchService',
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

  /** IR-T198-1: tenantId required. IR-T198-2: empty = success([]). */
  async search(
    filters: SchemaSearchFilters,
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    try {
      const tenantId = this.getTenantId();
      const result = await this.dbService.searchDocuments(SCHEMA_REGISTRY_INDEX, {
        tenantId,
        ...filters,
      });
      if (!result.isSuccess) {
        return DataProcessResult.failure(
          result.errorCode ?? 'DB_ERROR',
          result.errorMessage ?? 'Search failed',
        );
      }
      // IR-T198-2: empty result = success, not failure
      return DataProcessResult.success(result.data ?? []);
    } catch (err) {
      return DataProcessResult.failure('SEARCH_ERROR', `SchemaSearchService threw: ${String(err)}`);
    }
  }
}
