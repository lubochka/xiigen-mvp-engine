// T170 ReviewModerationEngine [ROUTING]
//
// CF-10-2: THREE_PATH_MODERATION — inverts FLOW-08 binary moderation.
//   Three outcomes: PASS → ReviewPublished, REJECT → ReviewRejected,
//   UNCERTAIN → ReviewFlaggedForHuman (PENDING state — NOT rejected).
//   Binary moderation (UNCERTAIN → REJECT) scores 0. Both patterns correct in domain.
//   DPO triple annotation: conflictsWith: 'FLOW-08-binary-moderation'
//
// Iron rules:
//   IR-2: THREE paths — PASS/REJECT/UNCERTAIN. UNCERTAIN MUST NOT auto-reject.
//   IR-7: ReviewFlaggedForHuman sets PENDING state — NOT REJECTED.
//   FREEDOM config thresholds: flow10_moderation_pass_threshold, flow10_moderation_reject_threshold
//   SETNX key: hash(tenantId + reviewId + 'moderation')
//   DNA-8: storeDocument before enqueue on ALL three paths
//
// NEGATIVE example guard (FLOW-08 binary pattern — WRONG for T170):
//   if (confidence >= threshold) emit ReviewPublished
//   else emit ReviewRejected // UNCERTAIN silently becomes REJECT — IR-2 violation

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IFreedomConfigService } from '../../../freedom/freedom-config.interface';

interface IAiModerationProvider {
  moderate(params: Record<string, unknown>): Promise<{
    isSuccess: boolean;
    errorCode?: string;
    errorMessage?: string;
    data?: Record<string, unknown>;
  }>;
}

interface IIdempotencyStore {
  setnx(
    key: string,
    tenantId?: string,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
}
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { createHash } from 'crypto';

export interface ReviewModerationInput {
  reviewId: string;
  reviewerId: string;
  targetEntityId: string;
  targetEntityType: string;
  reviewText: string;
  rating: number;
  tenantId: string;
}

export interface ReviewModerationResult {
  reviewId: string;
  verdict: 'PUBLISHED' | 'REJECTED' | 'PENDING';
  confidence: number;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-10
 * @portability MOBILE - no ClsService, review moderation through fabric interfaces
 * @className ReviewModerationEngineService
 */
@Injectable()
export class ReviewModerationEngineService extends MicroserviceBase {
  constructor(
    /** F_AI: IAiProvider — AI moderation confidence scoring */
    private readonly aiProvider: IAiModerationProvider,
    /** F_DATABASE: IDatabaseService — review status updates */

    private readonly dbFabric: IDatabaseService,
    /** F_QUEUE: IQueueService — moderation outcome events */

    private readonly queueFabric: IQueueService,
    /** F_FREEDOM: FreedomConfigManager — thresholds */
    private readonly freedom: IFreedomConfigService,
    /** F_IDEMPOTENCY: SETNX store for moderation dedup */
    private readonly idempotencyStore: IIdempotencyStore,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T170',
        serviceName: 'ReviewModerationEngineService',
        flowId: 'FLOW-10',
      }),
    });
  }

  private deriveModerationKey(tenantId: string, reviewId: string): string {
    return createHash('sha256').update(`${tenantId}:${reviewId}:moderation`).digest('hex');
  }

  async moderateReview(
    input: ReviewModerationInput,
  ): Promise<DataProcessResult<ReviewModerationResult>> {
    const moderationKey = this.deriveModerationKey(input.tenantId, input.reviewId);

    // SETNX — moderation idempotency
    const existingResult = await this.idempotencyStore.setnx(moderationKey, input.tenantId);
    if (existingResult.isSuccess && existingResult.data?.['exists'] === true) {
      // Idempotent — already moderated
      return DataProcessResult.success({
        reviewId: input.reviewId,
        verdict: 'PUBLISHED',
        confidence: 1.0,
      });
    }

    // Read thresholds from FREEDOM config — never hardcode (DR-10-H)
    const passThresholdRecord = await this.freedom.get('flow10_moderation_pass_threshold');
    const rejectThresholdRecord = await this.freedom.get('flow10_moderation_reject_threshold');
    const passThreshold: number =
      typeof passThresholdRecord?.['flow10_moderation_pass_threshold'] === 'number'
        ? (passThresholdRecord['flow10_moderation_pass_threshold'] as number)
        : 0.85;
    const rejectThreshold: number =
      typeof rejectThresholdRecord?.['flow10_moderation_reject_threshold'] === 'number'
        ? (rejectThresholdRecord['flow10_moderation_reject_threshold'] as number)
        : 0.3;

    // AI moderation scoring
    const aiResult = await this.aiProvider.moderate({
      content: input.reviewText,
      rating: input.rating,
      tenantId: input.tenantId,
    });

    const confidence: number =
      aiResult.isSuccess && typeof aiResult.data?.['confidence'] === 'number'
        ? (aiResult.data['confidence'] as number)
        : 0.5;

    const moderatedAt = new Date().toISOString();

    // CF-10-2: THREE-PATH routing — PASS / REJECT / UNCERTAIN
    if (confidence >= passThreshold) {
      // PASS → ReviewPublished
      // DNA-8: storeDocument BEFORE enqueue
      await this.dbFabric.storeDocument(
        'xiigen-reviews',
        {
          reviewId: input.reviewId,
          status: 'PUBLISHED',
          moderationVerdict: 'PASS',
          confidence,
          moderatedAt,
          tenantId: input.tenantId,
          knowledgeScope: 'PRIVATE',
        },
        input.reviewId,
      );
      await this.queueFabric.enqueue('review.published', {
        reviewId: input.reviewId,
        targetEntityId: input.targetEntityId,
        targetEntityType: input.targetEntityType,
        rating: input.rating,
        tenantId: input.tenantId,
        moderatedAt,
      });
      return DataProcessResult.success({
        reviewId: input.reviewId,
        verdict: 'PUBLISHED',
        confidence,
      });
    } else if (confidence < rejectThreshold) {
      // REJECT → ReviewRejected
      // DNA-8: storeDocument BEFORE enqueue
      await this.dbFabric.storeDocument(
        'xiigen-reviews',
        {
          reviewId: input.reviewId,
          status: 'REJECTED',
          moderationVerdict: 'REJECT',
          confidence,
          moderatedAt,
          tenantId: input.tenantId,
          knowledgeScope: 'PRIVATE',
        },
        input.reviewId,
      );
      await this.queueFabric.enqueue('review.rejected', {
        reviewId: input.reviewId,
        reason: 'content_policy',
        tenantId: input.tenantId,
        moderatedAt,
      });
      return DataProcessResult.success({
        reviewId: input.reviewId,
        verdict: 'REJECTED',
        confidence,
      });
    } else {
      // UNCERTAIN → ReviewFlaggedForHuman (PENDING state — NOT REJECTED)
      // IR-7: PENDING, not REJECTED
      // DNA-8: storeDocument BEFORE enqueue (both review record AND moderation-queue entry)
      await this.dbFabric.storeDocument(
        'xiigen-reviews',
        {
          reviewId: input.reviewId,
          status: 'PENDING',
          moderationVerdict: 'UNCERTAIN',
          confidence,
          moderatedAt,
          tenantId: input.tenantId,
          knowledgeScope: 'PRIVATE',
        },
        input.reviewId,
      );
      // Store in moderation queue with content for human reviewer
      await this.dbFabric.storeDocument(
        'xiigen-moderation-queue',
        {
          reviewId: input.reviewId,
          reviewerId: input.reviewerId,
          reviewText: input.reviewText,
          rating: input.rating,
          confidence,
          status: 'PENDING',
          queuedAt: moderatedAt,
          tenantId: input.tenantId,
          knowledgeScope: 'PRIVATE',
        },
        `modq-${input.reviewId}`,
      );
      await this.queueFabric.enqueue('review.flagged_for_human', {
        reviewId: input.reviewId,
        status: 'PENDING',
        confidence,
        tenantId: input.tenantId,
        queuedAt: moderatedAt,
      });
      return DataProcessResult.success({
        reviewId: input.reviewId,
        verdict: 'PENDING',
        confidence,
      });
    }
  }
}
