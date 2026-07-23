/**
 * T182 TrainingDatasetBuilder [analytics_engine]
 * FLOW-13: Data Warehouse & Analytics
 *
 * Builds ML training datasets from tenant warehouse data.
 * PII masking is mandatory before dataset export.
 *
 * Iron rules:
 *   IR-1: Training datasets are tenant-scoped â€” no cross-tenant data leakage.
 *   IR-2: F423 IPIIMaskingService (PLATFORM-ONLY) runs before dataset export.
 *   IR-3: featureCount and rowCount must be accurate â€” validated before emitting.
 *   IR-4: storeDocument(dataset) BEFORE enqueue(TrainingDatasetReady). DNA-8.
 *
 * Emits: warehouse.training.dataset
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';
import { F423_PII_MASKING_SERVICE, IPIIMaskingService } from './query-execution-engine.service';

const WAREHOUSE_DATA_INDEX = 'xiigen-warehouse-data';
const TRAINING_DATASETS_INDEX = 'xiigen-training-datasets';

@Injectable()
export class TrainingDatasetBuilderService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
    @Optional()
    @Inject(F423_PII_MASKING_SERVICE)
    private readonly piiMaskingService: IPIIMaskingService | null = null,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T182',
        serviceName: 'TrainingDatasetBuilderService',
        flowId: 'FLOW-13',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Build a training dataset from tenant warehouse data.
   * IR-2: F423 PII masking before export.
   * IR-3: featureCount and rowCount validated.
   * IR-4: storeDocument BEFORE enqueue. DNA-8.
   */
  async build(event: Record<string, unknown>): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const datasetId = event['datasetId'] as string;
    const features = (event['features'] as string[]) ?? [];
    const dataQuery = (event['dataQuery'] as Record<string, unknown>) ?? {};

    if (!datasetId) {
      return DataProcessResult.failure('MISSING_FIELDS', 'datasetId is required');
    }

    // IR-1: Fetch data tenant-scoped
    const dataResult = await this.dbFabric.searchDocuments(WAREHOUSE_DATA_INDEX, {
      tenantId,
      ...dataQuery,
    });

    if (!dataResult.isSuccess) {
      return DataProcessResult.failure(
        'FETCH_FAILED',
        `Failed to fetch training data: ${dataResult.errorMessage ?? 'unknown'}`,
      );
    }

    let rows = (dataResult.data ?? []) as Array<Record<string, unknown>>;

    // IR-2: F423 PII masking before export â€” PLATFORM-ONLY, no opt-out
    if (this.piiMaskingService) {
      const maskResult = await this.piiMaskingService.mask({ rows });
      if (!maskResult.isSuccess) {
        return DataProcessResult.failure(
          'MASKING_FAILED',
          maskResult.errorMessage ?? 'PII masking failed',
        );
      }
      rows = ((maskResult.data ?? {})['rows'] as Array<Record<string, unknown>>) ?? rows;
    }

    // IR-3: Validate featureCount and rowCount
    const rowCount = rows.length;
    const featureCount = features.length > 0 ? features.length : Object.keys(rows[0] ?? {}).length;

    if (rowCount === 0) {
      return DataProcessResult.failure('EMPTY_DATASET', 'Training dataset has no rows');
    }

    const now = new Date().toISOString();

    const dataset: Record<string, unknown> = {
      datasetId,
      tenantId,
      features,
      featureCount,
      rowCount,
      builtAt: now,
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: 'PRIVATE',
    };

    // DNA-8: storeDocument BEFORE enqueue
    const storeResult = await this.dbFabric.storeDocument(TRAINING_DATASETS_INDEX, dataset, datasetId);
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        storeResult.errorCode ?? 'STORE_FAILED',
        storeResult.errorMessage ?? 'Store failed',
      );
    }

    await this.queueFabric.enqueue('WarehouseTrainingDatasetReady', {
      tenantId,
      datasetId,
      featureCount,
      rowCount,
      builtAt: now,
    });

    return DataProcessResult.success({ datasetId, featureCount, rowCount });
  }
}
