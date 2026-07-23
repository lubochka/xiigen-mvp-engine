// T78 FeedDeliveryOrchestrator [ORCHESTRATION]
//
// Delivers scored feed items to recipients.
// Two-phase privacy: T78 re-checks T81 UNCONDITIONALLY — T76's check result is IRRELEVANT.
// Even if T76 passed T81, T78 MUST call T81 again (privacy settings can change).
//
// Iron rules:
//   T81 called UNCONDITIONALLY — not conditioned on T76 output
//   If T81 allowed=false: return DataProcessResult.success({ suppressed: true }) — NOT failure
//   score below FREEDOM threshold → success({ delivered: false, reason: 'BELOW_THRESHOLD' }) — NOT failure
//   storeDocument BEFORE FeedDelivered emit (DNA-8)
//   FREEDOM: flow07_delivery_score_threshold, flow07_max_feed_inserts_per_connection
//
// Factories:
//   F234: IDatabaseService — feed delivery record storage
//   F236: IQueueService — FeedDelivered CloudEvent
//   T81: IPrivacyGatekeeperService — inline (UNCONDITIONAL — NOT reading T76 output)
//   FREEDOM: score threshold config

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { IPrivacyGatekeeperService } from './privacy-gatekeeper.service';

interface IFreedomConfigService {
  getConfig(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
}

export interface FeedDeliveryRequest {
  feedItemId: string;
  tenantId: string;
  recipientUserId: string;
  score: number;
}

export interface FeedDeliveryResult {
  feedItemId?: string;
  suppressed?: boolean;
  delivered?: boolean;
  deliveredAt?: string;
  reason?: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-07
 * @portability MOBILE - no ClsService, privacy gate consumed through interface
 * @className FeedDeliveryOrchestratorService
 */
@Injectable()
export class FeedDeliveryOrchestratorService extends MicroserviceBase {
  constructor(
    /** F234: IDatabaseService — feed delivery record storage */
    private readonly dbFabric: IDatabaseService,
    /** F236: IQueueService — FeedDelivered CloudEvent */
    private readonly queueFabric: IQueueService,
    /** T81 IPrivacyGatekeeperService — UNCONDITIONAL re-check (NOT reading T76 result) */
    private readonly privacyGatekeeper: IPrivacyGatekeeperService,
    /** FREEDOM config service — delivery threshold */
    private readonly freedomConfigService: IFreedomConfigService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T78',
        serviceName: 'FeedDeliveryOrchestratorService',
        flowId: 'FLOW-07',
      }),
    });
  }

  async deliverFeedItem(
    request: FeedDeliveryRequest,
  ): Promise<DataProcessResult<FeedDeliveryResult>> {
    // ── STEP 1: T81 UNCONDITIONAL re-check — privacy settings may have changed ────
    // NOTE: T78 NEVER reads T76's privacy check result — calls T81 independently
    const privacyResult = await this.privacyGatekeeper.check({
      userId: request.recipientUserId,
      tenantId: request.tenantId,
      action: 'feed_delivery',
    });

    if (!privacyResult.isSuccess) {
      return DataProcessResult.failure(
        'PRIVACY_CHECK_ERROR',
        privacyResult.errorMessage ?? 'Privacy check failed',
      );
    }

    if (!privacyResult.data?.allowed) {
      // success({ suppressed: true }) — NOT failure
      return DataProcessResult.success({ suppressed: true });
    }

    // ── STEP 2: Read FREEDOM threshold ───────────────────────────────────────────
    const thresholdResult = await this.freedomConfigService.getConfig({
      key: 'flow07_delivery_score_threshold',
      tenantId: request.tenantId,
    });
    const threshold =
      thresholdResult.isSuccess &&
      typeof thresholdResult.data?.['flow07_delivery_score_threshold'] === 'number'
        ? thresholdResult.data['flow07_delivery_score_threshold']
        : 0;

    // ── STEP 3: Score below threshold → success({ delivered: false }) — NOT failure
    if (request.score < threshold) {
      return DataProcessResult.success({ delivered: false, reason: 'BELOW_THRESHOLD' });
    }

    const deliveredAt = new Date().toISOString();

    // ── STEP 4: storeDocument (DNA-8) ────────────────────────────────────────────
    const storeResult = await this.dbFabric.storeDocument(
      'xiigen-feed-deliveries',
      {
        feedItemId: request.feedItemId,
        recipientUserId: request.recipientUserId,
        tenantId: request.tenantId,
        status: 'DELIVERED',
        score: request.score,
        deliveredAt,
        knowledgeScope: 'PRIVATE',
      },
      `delivery-${request.feedItemId}-${request.recipientUserId}`,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store delivery: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    // ── STEP 5: enqueue FeedDelivered (DNA-8 — after store) ──────────────────────
    await this.queueFabric.enqueue('social.feed.item.delivered', {
      feedItemId: request.feedItemId,
      recipientUserId: request.recipientUserId,
      tenantId: request.tenantId,
      deliveredAt,
    });

    return DataProcessResult.success({
      feedItemId: request.feedItemId,
      delivered: true,
      deliveredAt,
    });
  }
}
