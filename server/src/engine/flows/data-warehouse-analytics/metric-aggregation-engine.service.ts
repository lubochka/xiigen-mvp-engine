/**
 * T174 MetricAggregationEngine [analytics_engine]
 * FLOW-13: Data Warehouse & Analytics
 *
 * Aggregates warehouse events into metric windows for tenant analytics.
 *
 * Iron rules:
 *   IR-1: Aggregation windows must include eventWindowStart and eventWindowEnd.
 *   IR-2: All metric aggregations are tenant-scoped â€” never cross-tenant.
 *   IR-3: storeDocument(metric) BEFORE enqueue(MetricAggregated). DNA-8.
 *
 * Emits: warehouse.metric.aggregated
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const WAREHOUSE_EVENTS_INDEX = 'xiigen-warehouse-events';
const WAREHOUSE_METRICS_INDEX = 'xiigen-warehouse-metrics';

@Injectable()
export class MetricAggregationEngineService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T174',
        serviceName: 'MetricAggregationEngineService',
        flowId: 'FLOW-13',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Aggregate warehouse events within a time window into metrics.
   * IR-1: eventWindowStart and eventWindowEnd are mandatory.
   * IR-2: All aggregations are tenant-scoped.
   * IR-3: storeDocument BEFORE enqueue. DNA-8.
   */
  async aggregate(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const metricType = event['metricType'] as string;
    const eventWindowStart = event['eventWindowStart'] as string;
    const eventWindowEnd = event['eventWindowEnd'] as string;

    // IR-1: Window bounds required
    if (!eventWindowStart || !eventWindowEnd) {
      return DataProcessResult.failure(
        'MISSING_WINDOW',
        'eventWindowStart and eventWindowEnd are required',
      );
    }

    // Fetch events within window â€” IR-2: always tenant-scoped
    const eventsResult = await this.dbFabric.searchDocuments(WAREHOUSE_EVENTS_INDEX, {
      tenantId,
      metricType,
    });

    if (!eventsResult.isSuccess) {
      return DataProcessResult.failure(
        'FETCH_FAILED',
        `Failed to fetch events: ${eventsResult.errorMessage ?? 'unknown'}`,
      );
    }

    const events = (eventsResult.data ?? []) as Array<Record<string, unknown>>;

    // Filter to window (host-side filter on returned results)
    const windowEvents = events.filter((e) => {
      const ts = e['occurredAt'] as string | undefined;
      if (!ts) return false;
      return ts >= eventWindowStart && ts <= eventWindowEnd;
    });

    const aggregatedValue = windowEvents.reduce((sum, e) => {
      return sum + ((e['value'] as number) ?? 0);
    }, 0);

    const now = new Date().toISOString();
    const metricId = `metric-${tenantId}-${metricType}-${eventWindowStart}`;

    const metric: Record<string, unknown> = {
      metricId,
      tenantId,
      metricType,
      eventWindowStart,
      eventWindowEnd,
      aggregatedValue,
      eventCount: windowEvents.length,
      aggregatedAt: now,
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: 'PRIVATE',
    };

    // DNA-8: storeDocument BEFORE enqueue
    const storeResult = await this.dbFabric.storeDocument(WAREHOUSE_METRICS_INDEX, metric, metricId);
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        storeResult.errorCode ?? 'STORE_FAILED',
        storeResult.errorMessage ?? 'Store failed',
      );
    }

    await this.queueFabric.enqueue('WarehouseMetricAggregated', {
      tenantId,
      metricId,
      metricType,
      eventWindowStart,
      eventWindowEnd,
      aggregatedValue,
      eventCount: windowEvents.length,
      aggregatedAt: now,
    });

    return DataProcessResult.success({
      metricId,
      aggregatedValue,
      eventCount: windowEvents.length,
    });
  }
}
