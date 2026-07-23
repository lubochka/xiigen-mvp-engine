// T86 ListingAnalyticsAggregator [ANALYTICS_ENGINE]
//
// Aggregates listing analytics.
// MACHINE formula (not FREEDOM config): conversionRate = inquiries / (views || 1).
// This is a MACHINE formula — must appear as literal computation in code.
// config.get("conversion_formula") = score-0.
// Aggregate-only: views are counters only — no viewerIds array (data-retention violation).
//
// Iron rules:
//   IR-1: conversionRate = inquiries / (views || 1) — MACHINE formula, not FREEDOM config
//   IR-2: no viewerIds array — views are counters only (data-retention)
//   IR-3: storeDocument BEFORE enqueue (DNA-8)
//
// Factories:
//   F244: IDatabaseService — analytics storage (DATABASE FABRIC)
//   F248: IAnalyticsService — analytics event ingestion (QUEUE FABRIC)
//   F250: IListingMetricsService — metrics aggregation (DATABASE FABRIC)

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

interface IListingMetricsService {
  aggregate(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
}

export interface ListingAnalyticsRequest {
  listingId: string;
  tenantId: string;
  views: number;
  inquiries: number;
  windowClosedAt: string;
}

export interface ListingAnalyticsResult {
  listingId: string;
  tenantId: string;
  views: number;
  inquiries: number;
  conversionRate: number;
  aggregatedAt: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-08
 * @portability MOBILE - no ClsService, listing analytics through fabric interfaces
 * @className ListingAnalyticsAggregatorService
 */
@Injectable()
export class ListingAnalyticsAggregatorService extends MicroserviceBase {
  constructor(
    /** F244: IDatabaseService — analytics storage (DATABASE FABRIC) */

    private readonly dbFabric: IDatabaseService,
    /** F248: IAnalyticsService — analytics events (QUEUE FABRIC) */

    private readonly queueFabric: IQueueService,
    /** F250: IListingMetricsService — metrics aggregation (DATABASE FABRIC) */
    private readonly metricsService: IListingMetricsService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T86',
        serviceName: 'ListingAnalyticsAggregatorService',
        flowId: 'FLOW-08',
      }),
    });
  }

  async aggregate(
    request: ListingAnalyticsRequest,
  ): Promise<DataProcessResult<ListingAnalyticsResult>> {
    const aggregatedAt = new Date().toISOString();

    // IR-1: MACHINE formula — literal code, not config lookup
    // conversionRate = inquiries / (views || 1)  ← this exact expression is required
    const conversionRate = request.inquiries / (request.views || 1);

    const analyticsId = `anal-${request.listingId}-${Date.now()}`;

    // IR-3: storeDocument BEFORE enqueue (DNA-8)
    const storeResult = await this.dbFabric.storeDocument(
      'listing-analytics',
      {
        analyticsId,
        listingId: request.listingId,
        tenantId: request.tenantId,
        views: request.views, // IR-2: counter only — no viewerIds array
        inquiries: request.inquiries,
        conversionRate, // MACHINE formula result
        windowClosedAt: request.windowClosedAt,
        aggregatedAt,
        // NO viewerIds — data-retention violation (IR-2)
      },
      analyticsId,
    );
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store analytics: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    await this.queueFabric.enqueue('marketplace.analytics.aggregated', {
      listingId: request.listingId,
      tenantId: request.tenantId,
      views: request.views,
      inquiries: request.inquiries,
      conversionRate,
      aggregatedAt,
    });

    return DataProcessResult.success({
      listingId: request.listingId,
      tenantId: request.tenantId,
      views: request.views,
      inquiries: request.inquiries,
      conversionRate,
      aggregatedAt,
    });
  }
}
