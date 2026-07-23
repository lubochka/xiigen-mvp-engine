/**
 * T185 DataLineageTracker [schema_registry]
 * FLOW-13: Data Warehouse & Analytics
 *
 * Tracks immutable data lineage records for warehouse data transformations.
 * Records are append-only â€” never updated once written.
 *
 * Iron rules:
 *   IR-1: Lineage records are immutable â€” never update, only append.
 *   IR-2: All lineage records include tenantId.
 *   IR-3: Cross-flow lineage entries must identify source flow explicitly.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const DATA_LINEAGE_INDEX = 'xiigen-data-lineage';

@Injectable()
export class DataLineageTrackerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T185',
        serviceName: 'DataLineageTrackerService',
        flowId: 'FLOW-13',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Record a data lineage entry.
   * IR-1: Append-only â€” each call creates a new record, never updates.
   * IR-2: tenantId always included.
   * IR-3: Cross-flow entries include sourceFlowId.
   */
  async record(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const sourceDataId = event['sourceDataId'] as string;
    const targetDataId = event['targetDataId'] as string;
    const transformationType = event['transformationType'] as string;
    const sourceFlowId = event['sourceFlowId'] as string | undefined;

    if (!sourceDataId || !targetDataId || !transformationType) {
      return DataProcessResult.failure(
        'MISSING_FIELDS',
        'sourceDataId, targetDataId, and transformationType are required',
      );
    }

    const now = new Date().toISOString();
    // IR-1: Unique lineage ID per event â€” append-only, never reuse
    const lineageId = `lineage-${tenantId}-${sourceDataId}-${targetDataId}-${Date.now()}`;

    const lineageRecord: Record<string, unknown> = {
      lineageId,
      tenantId, // IR-2: always included
      sourceDataId,
      targetDataId,
      transformationType,
      recordedAt: now,
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: 'PRIVATE',
    };

    // IR-3: Cross-flow entries must identify source flow
    if (sourceFlowId) {
      lineageRecord['sourceFlowId'] = sourceFlowId;
    }

    // IR-1: Always storeDocument â€” never searchDocuments + update
    const storeResult = await this.dbFabric.storeDocument(DATA_LINEAGE_INDEX, lineageRecord, lineageId);
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        storeResult.errorCode ?? 'STORE_FAILED',
        storeResult.errorMessage ?? 'Store failed',
      );
    }

    return DataProcessResult.success({ lineageId, tenantId });
  }

  /**
   * Query lineage chain for a data artifact â€” read-only.
   * IR-2: Always filters by tenantId.
   */
  async queryLineage(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const dataId = event['dataId'] as string;

    if (!dataId) {
      return DataProcessResult.failure('MISSING_FIELDS', 'dataId is required');
    }

    const result = await this.dbFabric.searchDocuments(DATA_LINEAGE_INDEX, {
      tenantId, // IR-2: always tenant-scoped
      sourceDataId: dataId,
    });

    if (!result.isSuccess) {
      return DataProcessResult.failure(
        'FETCH_FAILED',
        result.errorMessage ?? 'Failed to fetch lineage',
      );
    }

    return DataProcessResult.success({
      dataId,
      tenantId,
      lineageEntries: result.data ?? [],
      entryCount: (result.data ?? []).length,
    });
  }
}
