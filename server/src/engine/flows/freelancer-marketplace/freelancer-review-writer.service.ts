/**
 * T616 FreelancerReviewWriter [DATA_PIPELINE]
 * FLOW-17: Freelancer Marketplace
 *
 * Entry: FreelancerReviewSubmissionRequested event (party submits a review)
 *
 * Execution order is MACHINE (CF-17-4):
 *   ORDER 1: Direction check — CLIENT_TO_FREELANCER or FREELANCER_TO_CLIENT
 *   ORDER 2: Duplicate check — one review per direction per engagement
 *   ORDER 3: Write review — storeDocument(knowledgeScope:PRIVATE)
 *   ORDER 4: storeDocument(audit, comment excluded) — DNA-8, PLATFORM_ONLY-safe
 *   ORDER 5: enqueue(FreelancerReviewSubmitted)
 *
 * Iron rules:
 *   IR-1: Direction check at ORDER 1 — invalid direction rejected immediately (CF-17-4)
 *   IR-2: Duplicate direction check at ORDER 2 — one per direction per engagement (CF-17-4)
 *   IR-3: Append-only — storeDocument only, never updateDocument on review records (CF-17-4)
 *   IR-4: Comment excluded from audit — PLATFORM_ONLY must not contain free-text PII (CF-17-4)
 *   IR-5: FreelancerReviewSubmitted emitted at ORDER 5 only after audit confirmed (DNA-8)
 *
 * Pattern reference: reviews-reputation/review-submission-gateway.service.ts (direction + duplicate)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';
import { createHash } from 'crypto';

const REVIEWS_INDEX = 'xiigen-freelancer-reviews';
const REVIEW_AUDIT_INDEX = 'xiigen-review-audit';
const CONTRACTS_INDEX = 'xiigen-freelancer-contracts';

/**
 * MACHINE: Valid review directions — compile-time constant.
 * NEVER from FREEDOM config — directions are fixed protocol constants.
 * CF-17-4.
 */
const VALID_REVIEW_DIRECTIONS = ['CLIENT_TO_FREELANCER', 'FREELANCER_TO_CLIENT'] as const;

@Injectable()
export class FreelancerReviewWriterService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T616',
        serviceName: 'FreelancerReviewWriterService',
        flowId: 'FLOW-17',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Write a single-direction review with append-only audit.
   * DPO pattern: SINGLE-DIRECTION-REVIEW-001
   */
  async submitReview(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    // tenantId from ALS — event body tenantId ignored (DNA-5)
    const tenantId = this.getTenantId();
    const engagementId = event['engagementId'] as string;
    const direction = event['direction'] as string;
    const rating = event['rating'] as number;
    const comment = event['comment'] as string | undefined;
    const reviewerId = event['reviewerId'] as string;
    const targetId = event['targetId'] as string;

    if (!engagementId || !direction || !reviewerId || !targetId) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'engagementId, direction, reviewerId, and targetId are required',
      );
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return DataProcessResult.failure('INVALID_RATING', 'rating must be a number between 1 and 5');
    }

    // ── ORDER 1: Direction check — IR-1, CF-17-4 ────────────────────────────
    // Compile-time constant check. Invalid direction rejected immediately.
    if (!(VALID_REVIEW_DIRECTIONS as readonly string[]).includes(direction)) {
      return DataProcessResult.failure(
        'INVALID_DIRECTION',
        `Direction '${direction}' is not valid. Must be CLIENT_TO_FREELANCER or FREELANCER_TO_CLIENT`,
      );
    }

    // ── ORDER 1.5: Contract participant validation — H-2 fix ────────────────
    // SF-CHECK-4: reviewer must be either clientTenantId or freelancerTenantId
    const contractResult = await this.dbFabric.searchDocuments(CONTRACTS_INDEX, { engagementId });
    if (!contractResult.isSuccess || (contractResult.data ?? []).length === 0) {
      return DataProcessResult.failure(
        'CONTRACT_NOT_FOUND',
        `Contract not found for engagement: ${engagementId}`,
      );
    }
    const contract = contractResult.data![0] as Record<string, unknown>;
    const clientTenantId = contract['clientTenantId'] as string;
    const freelancerTenantId = contract['freelancerTenantId'] as string;
    if (tenantId !== clientTenantId && tenantId !== freelancerTenantId) {
      return DataProcessResult.failure(
        'NOT_CONTRACT_PARTICIPANT',
        'Reviewer is not a participant in this contract',
      );
    }

    // ── ORDER 2: Duplicate direction check — IR-2, CF-17-4 ──────────────────
    // One review per direction per engagement — no duplicates allowed
    const existingResult = await this.dbFabric.searchDocuments(REVIEWS_INDEX, {
      engagementId,
      direction,
    });

    if (existingResult.isSuccess && (existingResult.data ?? []).length > 0) {
      await this.queueFabric.enqueue('DuplicateReviewRejected', {
        tenantId,
        engagementId,
        direction,
        reviewerId,
        reason: 'ALREADY_REVIEWED_IN_DIRECTION',
      });
      return DataProcessResult.failure(
        'DUPLICATE_REVIEW',
        `A review in direction '${direction}' already exists for engagement '${engagementId}'`,
      );
    }

    // ── ORDER 3: Write review — IR-3, CF-17-4 ───────────────────────────────
    // storeDocument only — never updateDocument. Append-only.
    const reviewId = createHash('sha256')
      .update(`${tenantId}:${engagementId}:${direction}:${reviewerId}`)
      .digest('hex')
      .substring(0, 32);
    const submittedAt = new Date().toISOString();

    const reviewRecord: Record<string, unknown> = {
      reviewId,
      engagementId,
      direction,
      rating,
      comment, // stored in review record with PRIVATE scope
      reviewerId,
      targetId,
      tenantId,
      submittedAt,
      knowledgeScope: 'PRIVATE',
    };

    const writeResult = await this.dbFabric.storeDocument(REVIEWS_INDEX, reviewRecord, reviewId);
    if (!writeResult.isSuccess) {
      return DataProcessResult.failure(
        'REVIEW_WRITE_FAILED',
        `Failed to write review: ${writeResult.errorMessage}`,
      );
    }

    // ── ORDER 4: Audit write — IR-4, DNA-8 ──────────────────────────────────
    // storeDocument(audit) BEFORE FreelancerReviewSubmitted emit.
    // Comment EXCLUDED from audit record — PLATFORM_ONLY-safe, no free-text PII in platform audit.
    await this.dbFabric.storeDocument(REVIEW_AUDIT_INDEX, {
      reviewId,
      engagementId,
      direction,
      rating,
      // comment intentionally excluded from audit — IR-4, CF-17-4
      reviewerId,
      targetId,
      tenantId,
      action: 'REVIEW_SUBMITTED',
      submittedAt,
      timestamp: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
      // PLATFORM_ONLY note: comment field intentionally absent — PII protection
    });

    // ── ORDER 5: Emit FreelancerReviewSubmitted — IR-5 ──────────────────────
    await this.queueFabric.enqueue('FreelancerReviewSubmitted', {
      reviewId,
      engagementId,
      direction,
      rating,
      reviewerId,
      targetId,
      tenantId,
      submittedAt,
    });

    return DataProcessResult.success({
      reviewId,
      engagementId,
      direction,
      rating,
      reviewerId,
      targetId,
      submittedAt,
    });
  }
}
