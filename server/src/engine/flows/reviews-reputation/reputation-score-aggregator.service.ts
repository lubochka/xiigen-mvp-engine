// T171 ReputationScoreAggregator [DATA_PIPELINE]
//
// CF-10-3: RETRACTION_HANDLING — first additive-subtractive aggregate in XIIGen.
//   Prior flows (FLOW-05, FLOW-06) are additive-only.
//   T171 subscribes to BOTH ReviewPublished (add) AND ReviewRetracted (remove).
//   Both handlers call the same recalculate() function — not a running counter.
//
// Iron rules:
//   IR-1: score clamped to [1.0, 5.0] before write — star-rating scale, NOT [0,1]
//   IR-3: ReviewRetracted MUST remove review from aggregate — score recalculated without it
//   ONLY PUBLISHED reviews contribute — flagged/pending excluded
//   Recency weights from FREEDOM config: flow10_reputation_recency_weights
//   Shared factory: F172 IReviewAggregateService (same provider as T172)
//   DNA-8: storeDocument(xiigen-reputation-scores) BEFORE enqueue(ReputationUpdated)
//   Named checks: retraction_removes_from_aggregate, reputation_score_clamped_1_to_5

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { IFreedomConfigService } from '../../../freedom/freedom-config.interface';

export interface ReputationAggregatorInput {
  targetEntityId: string;
  targetEntityType: string;
  reviewId: string;
  action: 'PUBLISH' | 'RETRACT';
  tenantId: string;
}

export interface ReputationAggregatorResult {
  targetEntityId: string;
  score: number;
  reviewCount: number;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-10
 * @portability MOBILE - no ClsService, reputation aggregation through fabric interfaces
 * @className ReputationScoreAggregatorService
 */
@Injectable()
export class ReputationScoreAggregatorService extends MicroserviceBase {
  constructor(
    /** F_DATABASE: IDatabaseService — fetch PUBLISHED reviews + store reputation scores */

    private readonly dbFabric: IDatabaseService,
    /** F_QUEUE: IQueueService — emit ReputationUpdated */

    private readonly queueFabric: IQueueService,
    /** F_FREEDOM: FreedomConfigManager — recency weights */
    private readonly freedom: IFreedomConfigService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T171',
        serviceName: 'ReputationScoreAggregatorService',
        flowId: 'FLOW-10',
      }),
    });
  }

  /**
   * Compute weighted average of ratings, applying recency weights.
   * Reviews are ordered by submittedAt DESC (most recent first).
   */
  private computeWeightedAverage(
    reviews: Array<Record<string, unknown>>,
    weights: number[],
  ): number {
    if (reviews.length === 0) return 0;
    let totalWeight = 0;
    let weightedSum = 0;
    for (let i = 0; i < reviews.length; i++) {
      const weight = i < weights.length ? weights[i] : (weights[weights.length - 1] ?? 1);
      const rating = reviews[i]['rating'] as number;
      weightedSum += rating * weight;
      totalWeight += weight;
    }
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Core recalculation — called for BOTH publish and retract events.
   * Fetches ALL PUBLISHED reviews, applies recency weights, clamps to [1.0, 5.0].
   */
  async recalculate(
    targetEntityId: string,
    tenantId: string,
  ): Promise<DataProcessResult<ReputationAggregatorResult>> {
    // Fetch recency weights from FREEDOM config — never hardcode (DR-10-H)
    const weightsRecord = await this.freedom.get('flow10_reputation_recency_weights');
    const recencyWeights: number[] =
      Array.isArray(weightsRecord?.['flow10_reputation_recency_weights'])
        ? (weightsRecord['flow10_reputation_recency_weights'] as number[])
        : [1.0, 0.9, 0.8, 0.7, 0.6];

    // Fetch ONLY PUBLISHED reviews — flagged/pending excluded (IR-3)
    const reviewsResult = await this.dbFabric.searchDocuments('xiigen-reviews', {
      targetEntityId,
      status: 'PUBLISHED',
      tenantId,
    });

    if (!reviewsResult.isSuccess) {
      return DataProcessResult.failure('FETCH_FAILED', 'Failed to fetch reviews for recalculation');
    }

    const publishedReviews = (reviewsResult.data ?? []) as Array<Record<string, unknown>>;

    // Sort by submittedAt DESC (most recent first) for recency weighting
    publishedReviews.sort((a, b) => {
      const aDate = String(a['submittedAt'] ?? '');
      const bDate = String(b['submittedAt'] ?? '');
      return bDate.localeCompare(aDate);
    });

    let score: number;
    const reviewCount = publishedReviews.length;

    if (reviewCount === 0) {
      score = 1.0; // Floor at minimum when no reviews
    } else {
      const rawScore = this.computeWeightedAverage(publishedReviews, recencyWeights);
      // IR-1: Clamp to [1.0, 5.0] — star-rating scale, NOT [0,1]
      // Named check: reputation_score_clamped_1_to_5
      score = Math.max(1.0, Math.min(5.0, rawScore));
    }

    const updatedAt = new Date().toISOString();

    // DNA-8: storeDocument BEFORE enqueue
    const storeResult = await this.dbFabric.storeDocument(
      'xiigen-reputation-scores',
      {
        targetEntityId,
        score,
        reviewCount,
        updatedAt,
        tenantId,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      `reputation-${targetEntityId}`,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store reputation score: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    // Emit ReputationUpdated AFTER store (DNA-8)
    await this.queueFabric.enqueue('reputation.updated', {
      targetEntityId,
      score,
      reviewCount,
      tenantId,
      updatedAt,
    });

    return DataProcessResult.success({ targetEntityId, score, reviewCount });
  }

  /** Handler for ReviewPublished events — add path */
  async onReviewPublished(
    input: ReputationAggregatorInput,
  ): Promise<DataProcessResult<ReputationAggregatorResult>> {
    return this.recalculate(input.targetEntityId, input.tenantId);
  }

  /** Handler for ReviewRetracted events — remove path (IR-3: named check retraction_removes_from_aggregate) */
  async onReviewRetracted(
    input: ReputationAggregatorInput,
  ): Promise<DataProcessResult<ReputationAggregatorResult>> {
    // Retraction removes review from aggregate by marking it RETRACTED
    // The recalculate() fetches only PUBLISHED — retracted reviews are excluded automatically
    await this.dbFabric.storeDocument(
      'xiigen-reviews',
      {
        reviewId: input.reviewId,
        status: 'RETRACTED',
        retractedAt: new Date().toISOString(),
        tenantId: input.tenantId,
        knowledgeScope: 'PRIVATE',
      },
      input.reviewId,
    );
    return this.recalculate(input.targetEntityId, input.tenantId);
  }
}
