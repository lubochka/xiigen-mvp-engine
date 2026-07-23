/**
 * T177 FunnelAnalysisEngine [analytics_engine]
 * FLOW-13: Data Warehouse & Analytics
 *
 * Generates funnel analysis showing conversion rates across ordered steps.
 *
 * Iron rules:
 *   IR-1: Funnel steps must be ordered and tenant-scoped.
 *   IR-2: conversionRate = converted / entered, bounded [0, 1].
 *   IR-3: storeDocument(analysis) BEFORE enqueue(FunnelAnalysisGenerated). DNA-8.
 *
 * Emits: warehouse.funnel.analysis
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const WAREHOUSE_EVENTS_INDEX = 'xiigen-warehouse-events';
const FUNNEL_ANALYSES_INDEX = 'xiigen-funnel-analyses';

@Injectable()
export class FunnelAnalysisEngineService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T177',
        serviceName: 'FunnelAnalysisEngineService',
        flowId: 'FLOW-13',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Generate funnel analysis for a tenant-defined step sequence.
   * IR-1: Steps ordered and tenant-scoped.
   * IR-2: conversionRate bounded [0, 1].
   * IR-3: storeDocument BEFORE enqueue. DNA-8.
   */
  async analyze(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const funnelId = event['funnelId'] as string;
    const steps = (event['steps'] as string[]) ?? [];
    const analysisPeriod = event['analysisPeriod'] as string;

    if (!funnelId || steps.length < 2) {
      return DataProcessResult.failure(
        'INVALID_FUNNEL',
        'funnelId and at least 2 steps are required',
      );
    }

    // Fetch funnel events â€” IR-1: tenant-scoped with ordered steps
    const eventsResult = await this.dbFabric.searchDocuments(WAREHOUSE_EVENTS_INDEX, {
      tenantId,
      funnelId,
    });

    if (!eventsResult.isSuccess) {
      return DataProcessResult.failure(
        'FETCH_FAILED',
        `Failed to fetch funnel events: ${eventsResult.errorMessage ?? 'unknown'}`,
      );
    }

    const funnelEvents = (eventsResult.data ?? []) as Array<Record<string, unknown>>;

    // Build step counts
    const stepCounts: Record<string, number> = {};
    for (const step of steps) {
      stepCounts[step] = funnelEvents.filter((e) => e['step'] === step).length;
    }

    const entered = stepCounts[steps[0]] ?? 0;
    const converted = stepCounts[steps[steps.length - 1]] ?? 0;

    // IR-2: conversionRate = converted / entered, bounded [0, 1]
    const conversionRate = entered > 0 ? Math.min(1, Math.max(0, converted / entered)) : 0;

    const now = new Date().toISOString();
    const analysisId = `funnel-${tenantId}-${funnelId}-${analysisPeriod}`;

    const analysis: Record<string, unknown> = {
      analysisId,
      tenantId,
      funnelId,
      analysisPeriod,
      steps,
      stepCounts,
      entered,
      converted,
      conversionRate,
      analyzedAt: now,
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: 'PRIVATE',
    };

    // DNA-8: storeDocument BEFORE enqueue
    const storeResult = await this.dbFabric.storeDocument(FUNNEL_ANALYSES_INDEX, analysis, analysisId);
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        storeResult.errorCode ?? 'STORE_FAILED',
        storeResult.errorMessage ?? 'Store failed',
      );
    }

    await this.queueFabric.enqueue('WarehouseFunnelAnalysisGenerated', {
      tenantId,
      analysisId,
      funnelId,
      analysisPeriod,
      entered,
      converted,
      conversionRate,
      analyzedAt: now,
    });

    return DataProcessResult.success({ analysisId, entered, converted, conversionRate });
  }
}
