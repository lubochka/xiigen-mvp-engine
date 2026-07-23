/**
 * T176 CohortAnalysisEngine [analytics_engine]
 * FLOW-13: Data Warehouse & Analytics
 *
 * Generates cohort analysis for tenant-scoped user segments.
 *
 * Iron rules:
 *   IR-1: Cohort definitions are tenant-scoped â€” no cross-tenant cohort membership.
 *   IR-2: All cross-flow data joins must include tenantId predicate.
 *   IR-3: storeDocument(analysis) BEFORE enqueue(CohortAnalysisGenerated). DNA-8.
 *
 * Emits: warehouse.cohort.analysis
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const WAREHOUSE_EVENTS_INDEX = 'xiigen-warehouse-events';
const COHORT_ANALYSIS_INDEX = 'xiigen-cohort-analyses';

@Injectable()
export class CohortAnalysisEngineService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T176',
        serviceName: 'CohortAnalysisEngineService',
        flowId: 'FLOW-13',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Generate cohort analysis for a tenant-defined cohort.
   * IR-1: Cohort membership is tenant-scoped.
   * IR-2: All joins include tenantId.
   * IR-3: storeDocument BEFORE enqueue. DNA-8.
   */
  async analyze(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const cohortId = event['cohortId'] as string;
    const cohortPeriod = event['cohortPeriod'] as string;
    const cohortDefinition = event['cohortDefinition'] as Record<string, unknown>;

    if (!cohortId || !cohortPeriod) {
      return DataProcessResult.failure('MISSING_COHORT', 'cohortId and cohortPeriod are required');
    }

    // Fetch cohort events â€” IR-1+IR-2: always tenant-scoped with tenantId in predicate
    const eventsResult = await this.dbFabric.searchDocuments(WAREHOUSE_EVENTS_INDEX, {
      tenantId,
      cohortId,
    });

    if (!eventsResult.isSuccess) {
      return DataProcessResult.failure(
        'FETCH_FAILED',
        `Failed to fetch cohort events: ${eventsResult.errorMessage ?? 'unknown'}`,
      );
    }

    const events = (eventsResult.data ?? []) as Array<Record<string, unknown>>;

    const memberCount = new Set(events.map((e) => e['userId'] as string)).size;
    const eventCount = events.length;

    const now = new Date().toISOString();
    const analysisId = `cohort-${tenantId}-${cohortId}-${cohortPeriod}`;

    const analysis: Record<string, unknown> = {
      analysisId,
      tenantId,
      cohortId,
      cohortPeriod,
      cohortDefinition: cohortDefinition ?? {},
      memberCount,
      eventCount,
      analyzedAt: now,
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: 'PRIVATE',
    };

    // DNA-8: storeDocument BEFORE enqueue
    const storeResult = await this.dbFabric.storeDocument(COHORT_ANALYSIS_INDEX, analysis, analysisId);
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        storeResult.errorCode ?? 'STORE_FAILED',
        storeResult.errorMessage ?? 'Store failed',
      );
    }

    await this.queueFabric.enqueue('WarehouseCohortAnalysisGenerated', {
      tenantId,
      analysisId,
      cohortId,
      cohortPeriod,
      memberCount,
      eventCount,
      analyzedAt: now,
    });

    return DataProcessResult.success({ analysisId, memberCount, eventCount });
  }
}
