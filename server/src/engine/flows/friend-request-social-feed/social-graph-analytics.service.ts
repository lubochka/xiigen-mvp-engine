// T82 SocialGraphAnalytics [DATA_PIPELINE]
//
// Emits social graph analytics events (connection growth, feed engagement).
// OBSERVABILITY pattern: entire handler in try/catch, returns success even on error.
// Aggregate-only: counters only — no per-user identifiers in payloads or stored records.
// Per-user data in analytics payload = BUILD_FAILURE.
// knowledgeScope: 'GLOBAL' for aggregate metrics
//
// Factories:
//   F238: IConnectionGraphService — aggregate counts
//   F234: IDatabaseService — analytics record storage
//   F236: IQueueService — SocialGraphAnalyticsEmitted CloudEvent

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

interface IConnectionGraphService {
  getAggregateConnectionGrowth(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
  getAggregateFeedEngagement(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
}

export interface SocialGraphAnalyticsRequest {
  tenantId: string;
  eventType: 'connection_growth' | 'feed_engagement';
  aggregatePeriod: string;
}

export interface SocialGraphAnalyticsResult {
  eventType: 'connection_growth' | 'feed_engagement';
  aggregatePeriod: string;
  totalCount: number;
  emittedAt: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-07
 * @portability MOBILE - aggregate-only analytics with tenant-scoped inputs
 * @className SocialGraphAnalyticsService
 */
@Injectable()
export class SocialGraphAnalyticsService extends MicroserviceBase {
  constructor(
    /** F238: IConnectionGraphService — aggregate counts */
    private readonly connectionGraphService: IConnectionGraphService,
    /** F234: IDatabaseService — analytics record storage */
    private readonly dbFabric: IDatabaseService,
    /** F236: IQueueService — SocialGraphAnalyticsEmitted CloudEvent */
    private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T82',
        serviceName: 'SocialGraphAnalyticsService',
        flowId: 'FLOW-07',
      }),
    });
  }

  async emitAnalytics(
    request: SocialGraphAnalyticsRequest,
  ): Promise<DataProcessResult<SocialGraphAnalyticsResult>> {
    // OBSERVABILITY: entire body in try/catch — returns success on error
    try {
      // ── STEP 1: Compute aggregate counts (IR-1 — NO userIds in output) ───────────
      let totalCount = 0;

      if (request.eventType === 'connection_growth') {
        const growthResult = await this.connectionGraphService.getAggregateConnectionGrowth({
          tenantId: request.tenantId,
          period: request.aggregatePeriod,
        });
        totalCount =
          growthResult.isSuccess && typeof growthResult.data?.['totalNewConnections'] === 'number'
            ? growthResult.data['totalNewConnections']
            : 0;
      } else if (request.eventType === 'feed_engagement') {
        const engagementResult = await this.connectionGraphService.getAggregateFeedEngagement({
          tenantId: request.tenantId,
          period: request.aggregatePeriod,
        });
        totalCount =
          engagementResult.isSuccess &&
          typeof engagementResult.data?.['totalEngagements'] === 'number'
            ? engagementResult.data['totalEngagements']
            : 0;
      }

      const emittedAt = new Date().toISOString();

      // ── STEP 2: storeDocument analytics record (DNA-8) ───────────────────────────
      // IR-1: payload contains NO userId — aggregate counts only
      // knowledgeScope: 'GLOBAL' — aggregate metrics
      const analyticsPayload: Record<string, unknown> = {
        tenantId: request.tenantId,
        eventType: request.eventType,
        aggregatePeriod: request.aggregatePeriod,
        totalCount,
        emittedAt,
        knowledgeScope: 'GLOBAL',
      };

      await this.dbFabric.storeDocument(
        'xiigen-social-graph-analytics',
        analyticsPayload,
        `analytics-${request.eventType}-${request.aggregatePeriod}-${Date.now()}`,
      );

      // ── STEP 3: enqueue SocialGraphAnalyticsEmitted (DNA-8 — after store) ────────
      await this.queueFabric.enqueue('social.graph.analytics.emitted', analyticsPayload);

      return DataProcessResult.success({
        eventType: request.eventType,
        aggregatePeriod: request.aggregatePeriod,
        totalCount,
        emittedAt,
      });
    } catch {
      // OBSERVABILITY: return success on any error — analytics must not block pipeline
      return DataProcessResult.success({
        eventType: request.eventType,
        aggregatePeriod: request.aggregatePeriod,
        totalCount: 0,
        emittedAt: new Date().toISOString(),
      });
    }
  }
}
