// T76 FeedItemGenerator [AI_GENERATION]
//
// Generates feed items from social graph activity.
// Execution order (STRICT):
//   1. T81 IPrivacyGatekeeperService (inline — action='feed_item') BEFORE emit
//      If allowed=false: return DataProcessResult.success({ skipped: true })
//   2. Read FREEDOM config for flow07_feed_items_per_connection
//   3. AI generation
//   4. storeDocument with knowledgeScope='PRIVATE' (H-3 — feed items are PRIVATE not GLOBAL)
//   5. enqueue FeedItemGenerated
//
// Factories:
//   F239: IAiContentService — AI-driven feed item generation
//   F236: IQueueService — FeedItemGenerated CloudEvent
//   F234: IDatabaseService — feed item record storage (PRIVATE scope)
//   T81: IPrivacyGatekeeperService — inline (NEVER via queue)
//   FREEDOM: flow07_feed_items_per_connection

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { IPrivacyGatekeeperService } from './privacy-gatekeeper.service';

interface IAiContentService {
  generateFeedItem(params: Record<string, unknown>): Promise<{
    isSuccess: boolean;
    errorCode?: string;
    errorMessage?: string;
    data?: Record<string, unknown>;
  }>;
}

interface IFreedomConfigService {
  getConfig(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
}

export interface FeedItemGenerateRequest {
  activityId: string;
  sourceUserId: string;
  targetUserId: string;
  tenantId: string;
  activityType: string;
}

export interface FeedItemGenerateResult {
  feedItemId?: string;
  skipped?: boolean;
  status?: 'GENERATED' | 'BLOCKED';
  activityId?: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-07
 * @portability MOBILE - no ClsService, privacy gate consumed through interface
 * @className FeedItemGeneratorService
 */
@Injectable()
export class FeedItemGeneratorService extends MicroserviceBase {
  constructor(
    /** F239: IAiContentService — AI-driven feed item generation */
    private readonly aiContentService: IAiContentService,
    /** F236: IQueueService — FeedItemGenerated CloudEvent */
    private readonly queueFabric: IQueueService,
    /** F234: IDatabaseService — feed item record storage */
    private readonly dbFabric: IDatabaseService,
    /** T81 IPrivacyGatekeeperService — inline privacy guard */
    private readonly privacyGatekeeper: IPrivacyGatekeeperService,
    /** FREEDOM config service */
    private readonly freedomConfigService: IFreedomConfigService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T76',
        serviceName: 'FeedItemGeneratorService',
        flowId: 'FLOW-07',
      }),
    });
  }

  async generateFeedItem(
    request: FeedItemGenerateRequest,
  ): Promise<DataProcessResult<FeedItemGenerateResult>> {
    // ── STEP 1: T81 IPrivacyGatekeeperService BEFORE store/emit (IR-1) ─────────────
    const privacyResult = await this.privacyGatekeeper.check({
      userId: request.targetUserId,
      tenantId: request.tenantId,
      action: 'feed_item',
      requesterId: request.sourceUserId,
    });

    if (!privacyResult.isSuccess) {
      return DataProcessResult.failure(
        'PRIVACY_CHECK_ERROR',
        privacyResult.errorMessage ?? 'Privacy check failed',
      );
    }

    if (!privacyResult.data?.allowed) {
      // Return skipped:true — no storeDocument, no emit
      return DataProcessResult.success({ skipped: true });
    }

    // ── STEP 2: Read FREEDOM config for max items count ──────────────────────────
    await this.freedomConfigService.getConfig({
      key: 'flow07_feed_items_per_connection',
      tenantId: request.tenantId,
    });

    // ── STEP 3: AI generation ────────────────────────────────────────────────────
    const generationResult = await this.aiContentService.generateFeedItem({
      activityId: request.activityId,
      activityType: request.activityType,
      sourceUserId: request.sourceUserId,
      targetUserId: request.targetUserId,
      tenantId: request.tenantId,
    });

    if (!generationResult.isSuccess) {
      return DataProcessResult.failure(
        'GENERATION_FAILED',
        generationResult.errorMessage ?? 'Feed item generation failed',
      );
    }

    const feedItemId = `feed-item-${request.activityId}-${Date.now()}`;
    const generatedAt = new Date().toISOString();

    // ── STEP 4: storeDocument with knowledgeScope='PRIVATE' (H-3) ────────────────
    const storeResult = await this.dbFabric.storeDocument(
      'xiigen-feed-items',
      {
        feedItemId,
        activityId: request.activityId,
        sourceUserId: request.sourceUserId,
        targetUserId: request.targetUserId,
        tenantId: request.tenantId,
        activityType: request.activityType,
        content: generationResult.data,
        status: 'GENERATED',
        generatedAt,
        knowledgeScope: 'PRIVATE',
      },
      feedItemId,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store feed item: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    // ── STEP 5: enqueue FeedItemGenerated (DNA-8 — after store) ─────────────────
    await this.queueFabric.enqueue('social.feed.item.generated', {
      feedItemId,
      activityId: request.activityId,
      sourceUserId: request.sourceUserId,
      targetUserId: request.targetUserId,
      tenantId: request.tenantId,
      activityType: request.activityType,
      generatedAt,
    });

    return DataProcessResult.success({
      feedItemId,
      status: 'GENERATED',
      activityId: request.activityId,
    });
  }
}
