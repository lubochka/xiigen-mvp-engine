// T77 FeedScorer [AI_GENERATION]
//
// Scores feed items for personalization relevance.
// CRITICAL: score=0 is VALID — item still emits. Filtering on score = BUILD_FAILURE.
// T78 decides what to do with scored items.
//
// Factories:
//   F239: IAiContentService — scoring model calls
//   FREEDOM: scoring weights (FREEDOM config only — never hardcoded)
//   F234: IDatabaseService — scored record storage
//   F236: IQueueService — FeedScored CloudEvent

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

interface IAiContentService {
  scoreFeedItem(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
}

interface IFreedomConfigService {
  getConfig(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
}

export interface FeedScoreRequest {
  feedItemId: string;
  tenantId: string;
  recipientUserId: string;
  contentType: string;
}

export interface FeedScoreResult {
  feedItemId: string;
  recipientUserId: string;
  score: number;
  scoredAt: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-07
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped
 * @className FeedScorerService
 */
@Injectable()
export class FeedScorerService extends MicroserviceBase {
  constructor(
    /** F239: IAiContentService — scoring model calls */
    private readonly aiContentService: IAiContentService,
    /** FREEDOM config service — scoring weights */
    private readonly freedomConfigService: IFreedomConfigService,
    /** F234: IDatabaseService — scored record storage */
    private readonly dbFabric: IDatabaseService,
    /** F236: IQueueService — FeedScored CloudEvent */
    private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T77',
        serviceName: 'FeedScorerService',
        flowId: 'FLOW-07',
      }),
    });
  }

  async scoreFeedItem(request: FeedScoreRequest): Promise<DataProcessResult<FeedScoreResult>> {
    // ── STEP 1: Read scoring weights from FREEDOM config (IR-2 — never hardcoded) ──
    const weightsResult = await this.freedomConfigService.getConfig({
      key: 'flow07_feed_scoring_weights',
      tenantId: request.tenantId,
    });
    const weights = weightsResult.isSuccess ? weightsResult.data : {};

    // ── STEP 2: Score via AI scoring model ───────────────────────────────────────
    const scoringResult = await this.aiContentService.scoreFeedItem({
      feedItemId: request.feedItemId,
      recipientUserId: request.recipientUserId,
      tenantId: request.tenantId,
      contentType: request.contentType,
      weights,
    });

    // IR-1: score=0 is VALID — do NOT filter. Use 0 if scoring fails.
    const score: number =
      scoringResult.isSuccess && typeof scoringResult.data?.['score'] === 'number'
        ? scoringResult.data['score']
        : 0;

    const scoredAt = new Date().toISOString();

    // ── STEP 3: storeDocument scored record (DNA-8) ───────────────────────────────
    const storeResult = await this.dbFabric.storeDocument(
      'xiigen-feed-scores',
      {
        feedItemId: request.feedItemId,
        recipientUserId: request.recipientUserId,
        tenantId: request.tenantId,
        contentType: request.contentType,
        score,
        scoredAt,
        knowledgeScope: 'PRIVATE',
      },
      `score-${request.feedItemId}-${request.recipientUserId}`,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store score: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    // ── STEP 4: enqueue FeedScored (DNA-8 — after store) — score=0 still emits ────
    await this.queueFabric.enqueue('social.feed.item.scored', {
      feedItemId: request.feedItemId,
      recipientUserId: request.recipientUserId,
      tenantId: request.tenantId,
      score,
      scoredAt,
    });

    return DataProcessResult.success({
      feedItemId: request.feedItemId,
      recipientUserId: request.recipientUserId,
      score,
      scoredAt,
    });
  }
}
