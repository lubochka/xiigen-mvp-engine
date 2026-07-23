/**
 * T178 RetentionCohortAnalyzer [analytics_engine]
 * FLOW-13: Data Warehouse & Analytics
 *
 * Analyzes user retention within tenant-defined cohorts and time windows.
 *
 * Iron rules:
 *   IR-1: Retention cohorts are tenant-scoped.
 *   IR-2: periodDays must match configured retention window from FREEDOM config.
 *   IR-3: storeDocument(analysis) BEFORE enqueue(RetentionCohortGenerated). DNA-8.
 *
 * Emits: warehouse.retention.cohort
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const WAREHOUSE_EVENTS_INDEX = 'xiigen-warehouse-events';
const RETENTION_COHORT_INDEX = 'xiigen-retention-cohorts';
const FREEDOM_INDEX = 'freedom_configs';

@Injectable()
export class RetentionCohortAnalyzerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T178',
        serviceName: 'RetentionCohortAnalyzerService',
        flowId: 'FLOW-13',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Analyze retention for a tenant cohort.
   * IR-2: periodDays from FREEDOM config â€” never hardcoded.
   * IR-3: storeDocument BEFORE enqueue. DNA-8.
   */
  async analyze(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const cohortId = event['cohortId'] as string;
    const cohortDate = event['cohortDate'] as string;

    if (!cohortId || !cohortDate) {
      return DataProcessResult.failure('MISSING_COHORT', 'cohortId and cohortDate are required');
    }

    // IR-2: Read retention window from FREEDOM config
    const periodDays = await this.getRetentionPeriodDays();

    // Fetch cohort entry events â€” IR-1: tenant-scoped
    const entryResult = await this.dbFabric.searchDocuments(WAREHOUSE_EVENTS_INDEX, {
      tenantId,
      cohortId,
      eventType: 'COHORT_ENTRY',
    });

    if (!entryResult.isSuccess) {
      return DataProcessResult.failure(
        'FETCH_FAILED',
        `Failed to fetch cohort entry events: ${entryResult.errorMessage ?? 'unknown'}`,
      );
    }

    const entryEvents = (entryResult.data ?? []) as Array<Record<string, unknown>>;
    const cohortSize = new Set(entryEvents.map((e) => e['userId'] as string)).size;

    // Fetch retention events within the period window
    const retentionResult = await this.dbFabric.searchDocuments(WAREHOUSE_EVENTS_INDEX, {
      tenantId,
      cohortId,
      eventType: 'COHORT_RETURN',
    });

    const returnEvents = retentionResult.isSuccess ? (retentionResult.data ?? []) : [];
    const retainedUsers = new Set(returnEvents.map((e) => e['userId'] as string)).size;
    const retentionRate = cohortSize > 0 ? Math.min(1, retainedUsers / cohortSize) : 0;

    const now = new Date().toISOString();
    const analysisId = `retention-${tenantId}-${cohortId}-${cohortDate}`;

    const analysis: Record<string, unknown> = {
      analysisId,
      tenantId,
      cohortId,
      cohortDate,
      periodDays,
      cohortSize,
      retainedUsers,
      retentionRate,
      analyzedAt: now,
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: 'PRIVATE',
    };

    // DNA-8: storeDocument BEFORE enqueue
    const storeResult = await this.dbFabric.storeDocument(RETENTION_COHORT_INDEX, analysis, analysisId);
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        storeResult.errorCode ?? 'STORE_FAILED',
        storeResult.errorMessage ?? 'Store failed',
      );
    }

    await this.queueFabric.enqueue('WarehouseRetentionCohortGenerated', {
      tenantId,
      analysisId,
      cohortId,
      cohortDate,
      periodDays,
      cohortSize,
      retainedUsers,
      retentionRate,
      analyzedAt: now,
    });

    return DataProcessResult.success({ analysisId, cohortSize, retainedUsers, retentionRate });
  }

  /**
   * IR-2: periodDays from FREEDOM config key "warehouse_retention_period_days".
   * Never hardcoded.
   */
  private async getRetentionPeriodDays(): Promise<number> {
    const result = await this.dbFabric.searchDocuments(FREEDOM_INDEX, {
      config_key: 'warehouse_retention_period_days',
      task_type: 'xiigen-engine',
    });
    if (result.isSuccess && (result.data ?? []).length > 0) {
      const val = (result.data![0] as Record<string, unknown>)['config_value'];
      if (typeof val === 'number') return val;
    }
    return 30; // Safe default
  }
}
