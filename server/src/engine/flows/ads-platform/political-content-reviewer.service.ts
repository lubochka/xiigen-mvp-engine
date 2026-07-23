/**
 * T628 PoliticalContentReviewer [ANALYSIS]
 * FLOW-20: Ads Platform
 *
 * Entry: AdContentSubmitted event (advertiser uploads ad creative for policy review)
 *
 * Execution order is MACHINE (CF-20-4):
 *   ORDER 1: Dual-model political detection (modelA + modelB in parallel)
 *   ORDER 2: Converge via Math.min(scores) for conservative consensus
 *   ORDER 3: Check divergence between models — escalate to human on ambiguity
 *   ORDER 4: storeDocument(political-audit) — stores model scores and decision
 *   ORDER 5: enqueue(PoliticalContentReviewPending) or enqueue(PoliticalContentApproved)
 *
 * Iron rules:
 *   IR-1: Dual-model isPolitical detection at ORDER 1 (CF-20-4)
 *   IR-2: Converge via Math.min(modelA, modelB) — conservative consensus (CF-20-4)
 *   IR-3: If divergence > threshold: escalate to human review (CF-20-4)
 *   IR-4: No auto-block on ambiguous cases — human review mandatory (CF-20-4)
 *   IR-5: Human decision immutable (updateDocument only on final_status transition) (CF-20-4)
 *   IR-6: tenantId from ALS only (DNA-5)
 *
 * Pattern reference: POLITICAL-DUAL-GATE-001 RAG pattern from DR-20-D
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { IAiProvider, AI_PROVIDER } from '../../../fabrics/interfaces/ai-provider.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const POLITICAL_AUDIT_INDEX = 'xiigen-political-audit';
const HUMAN_REVIEW_QUEUE_INDEX = 'xiigen-human-review-queue';

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class PoliticalContentReviewerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    @Inject(AI_PROVIDER) private readonly ai: IAiProvider,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T628',
        serviceName: 'PoliticalContentReviewerService',
        flowId: 'FLOW-20',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId?.();
    if (result?.isSuccess && result.data) {
      return result.data;
    }

    const legacyTenant = (this.tenantContext as unknown as LegacyTenantContextReader).get?.('tenant');
    const legacyTenantId = legacyTenant?.['tenantId'];
    return typeof legacyTenantId === 'string' && legacyTenantId.length > 0
      ? legacyTenantId
      : 'unknown';
  }

  /**
   * Dual-model political content analysis with human escalation.
   * DPO pattern: POLITICAL-DUAL-GATE-001
   */
  async reviewPoliticalContent(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const adId = event['adId'] as string;
    const content = event['content'] as string;
    const advertiserId = event['advertiserId'] as string;

    if (!adId || !content || !advertiserId) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'adId, content, and advertiserId are required',
      );
    }

    // ── ORDER 1: Dual-model isPolitical detection — IR-1, CF-20-4 ──────────
    // Run both models in parallel (simulated sequentially for testing)

    const scoreA = await this.runPoliticalDetectionModelA(content);
    const scoreB = await this.runPoliticalDetectionModelB(content);

    // ── ORDER 2: Converge via Math.min — IR-2, CF-20-4 ───────────────────────
    const minScore = Math.min(scoreA, scoreB);
    const maxScore = Math.max(scoreA, scoreB);
    const divergence = maxScore - minScore;

    // FREEDOM config defaults (in production, read from FREEDOM manager)
    const politicalThreshold = 0.6; // political_score_threshold
    const divergenceThreshold = 0.3; // political_divergence_threshold

    // ── ORDER 3: Check divergence — IR-3, IR-4, CF-20-4 ─────────────────────
    const requiresHumanReview = divergence > divergenceThreshold;
    const isPolitical = minScore > politicalThreshold;

    if (requiresHumanReview || (isPolitical && divergence > 0)) {
      // Escalate to human review — IR-4, CF-20-4
      const reviewId = `review-${adId}-${Date.now()}`;

      // ── ORDER 4: storeDocument(political-audit) ──────────────────────────
      const auditRecord: Record<string, unknown> = {
        reviewId,
        adId,
        advertiserId,
        tenantId,
        modelA_score: scoreA,
        modelB_score: scoreB,
        minScore,
        maxScore,
        divergence,
        status: 'PENDING_HUMAN_REVIEW',
        createdAt: new Date().toISOString(),
      };

      await this.dbFabric.storeDocument(POLITICAL_AUDIT_INDEX, auditRecord, reviewId);

      // Queue for human review
      await this.dbFabric.storeDocument(
        HUMAN_REVIEW_QUEUE_INDEX,
        {
          reviewId,
          adId,
          advertiserId,
          tenantId,
          modelA_score: scoreA,
          modelB_score: scoreB,
          divergence,
          reason: 'AMBIGUOUS_POLITICAL_CLASSIFICATION',
          queuedAt: new Date().toISOString(),
          sla_hours: 24,
        },
        reviewId,
      );

      // ── ORDER 5: enqueue(PoliticalContentReviewPending) ──────────────────
      await this.queueFabric.enqueue('PoliticalContentReviewPending', {
        reviewId,
        adId,
        advertiserId,
        tenantId,
        modelA_score: scoreA,
        modelB_score: scoreB,
        divergence,
        timestamp: new Date().toISOString(),
      });

      return DataProcessResult.success({
        adId,
        reviewId,
        status: 'PENDING_HUMAN_REVIEW',
        divergence,
        queuedAt: new Date().toISOString(),
      });
    }

    // No human review needed — auto decision
    const decision = isPolitical ? 'REJECTED' : 'APPROVED';

    // ── ORDER 4: storeDocument(political-audit) ──────────────────────────
    const auditRecord: Record<string, unknown> = {
      adId,
      advertiserId,
      tenantId,
      modelA_score: scoreA,
      modelB_score: scoreB,
      minScore,
      divergence,
      decision,
      status: 'AUTO_DECIDED',
      decidedAt: new Date().toISOString(),
    };

    await this.dbFabric.storeDocument(POLITICAL_AUDIT_INDEX, auditRecord, adId);

    // ── ORDER 5: enqueue(PoliticalContentApproved) or enqueue(PoliticalContentRejected) ──
    if (decision === 'APPROVED') {
      await this.queueFabric.enqueue('PoliticalContentApproved', {
        adId,
        advertiserId,
        tenantId,
        minScore,
        timestamp: new Date().toISOString(),
      });
    } else {
      await this.queueFabric.enqueue('PoliticalContentRejected', {
        adId,
        advertiserId,
        tenantId,
        minScore,
        reason: 'POLITICAL_CONTENT_DETECTED',
        timestamp: new Date().toISOString(),
      });
    }

    return DataProcessResult.success({
      adId,
      decision,
      minScore,
      divergence,
      decidedAt: new Date().toISOString(),
    });
  }

  /**
   * Simulated Model A political detection.
   */
  private async runPoliticalDetectionModelA(content: string): Promise<number> {
    // Deterministic simulation based on content length and hash
    const hash = content.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return ((hash % 100) + 1) / 100; // Return 0.01-1.0
  }

  /**
   * Simulated Model B political detection.
   */
  private async runPoliticalDetectionModelB(content: string): Promise<number> {
    // Different deterministic simulation
    const hash = content.length * 7;
    return ((hash % 100) + 1) / 100; // Return 0.01-1.0
  }
}
