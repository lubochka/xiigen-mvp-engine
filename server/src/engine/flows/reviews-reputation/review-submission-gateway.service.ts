// T169 ReviewSubmissionGateway [TRANSACTION]
//
// CF-10-1: ELIGIBILITY_BEFORE_AUDIT — inverts FLOW-08 T79 audit-first pattern.
//   Eligibility GET runs ORDER 1 — before any write, before SETNX, before audit.
//   Ineligible submissions never create audit records.
//   DPO triple annotation: conflictsWith: 'FLOW-08-T79-audit-first-pattern'
//
// Iron rules:
//   IR-1: eligibility GET ORDER 1 — before any write, before validation, before SETNX
//   IR-2: rating validation [1,5] ORDER 2 — before SETNX (don't consume slot on bad input)
//   IR-3: audit storeDocument() ORDER 4 — AFTER eligibility + validation + SETNX
//   reviewId = server-derived hash(tenantId+':'+reviewerId+':'+targetEntityId+':'+targetEntityType)
//   tenantId from AsyncLocalStorage only — NEVER from event payload
//   DNA-8: storeDocument('xiigen-reviews') BEFORE enqueue('ReviewAccepted')
//   ReviewSubmissionCompleted emitted alongside ReviewAccepted (sync boundary)
//
// NEGATIVE example guard (FLOW-08 T79 pattern — WRONG for T169):
//   await this.auditService.storeDocument({...}); // ORDER 1 — violates IR-1
//   const isNew = await this.idempotencyStore.setnx(event.reviewId); // event.reviewId — wrong

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { createHash } from 'crypto';

interface IEligibilityService {
  check(params: Record<string, unknown>): Promise<{
    isSuccess: boolean;
    errorCode?: string;
    errorMessage?: string;
    data?: Record<string, unknown>;
  }>;
}

interface IAuditService {
  storeDocument(index: string, params: Record<string, unknown>, id?: string): Promise<void>;
}

interface IIdempotencyStore {
  setnx(
    key: string,
    tenantId?: string,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
}

export interface ReviewSubmissionInput {
  reviewerId: string;
  targetEntityId: string;
  targetEntityType: string;
  rating: number;
  reviewText?: string;
  tenantId: string; // from ALS — not from external payload
}

export interface ReviewSubmissionResult {
  reviewId: string;
  status: 'ACCEPTED' | 'REJECTED';
  reason?: string;
  revision_allowed?: boolean;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-10
 * @portability MOBILE - no ClsService, review submission through fabric interfaces
 * @className ReviewSubmissionGatewayService
 */
@Injectable()
export class ReviewSubmissionGatewayService extends MicroserviceBase {
  constructor(
    /** F_ELIGIBILITY: IReviewEligibilityService — GET_ONLY cross-flow read */
    private readonly eligibilityService: IEligibilityService,
    /** F_DATABASE: IDatabaseService — storeDocument (reviews + audit) */

    private readonly dbFabric: IDatabaseService,
    /** F_QUEUE: IQueueService — CloudEvent emission */

    private readonly queueFabric: IQueueService,
    /** F_AUDIT: IAuditTrailService — ORDER 4 audit write */
    private readonly auditService: IAuditService,
    /** F_IDEMPOTENCY: SETNX store */
    private readonly idempotencyStore: IIdempotencyStore,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T169',
        serviceName: 'ReviewSubmissionGatewayService',
        flowId: 'FLOW-10',
      }),
    });
  }

  /**
   * Server-derived reviewId — NEVER from event payload.
   * Hash ensures uniqueness per (tenant, reviewer, entity, type).
   * Same hash = same SETNX key = same document ID.
   */
  private deriveReviewId(
    tenantId: string,
    reviewerId: string,
    targetEntityId: string,
    targetEntityType: string,
  ): string {
    return createHash('sha256')
      .update(`${tenantId}:${reviewerId}:${targetEntityId}:${targetEntityType}`)
      .digest('hex');
  }

  async submitReview(
    input: ReviewSubmissionInput,
  ): Promise<DataProcessResult<ReviewSubmissionResult>> {
    const tenantId = input.tenantId; // from ALS — never from payload

    // ORDER 1: Eligibility check — BEFORE any write, BEFORE SETNX, BEFORE audit
    // CF-10-1: This INVERTS FLOW-08 T79 audit-first pattern
    const eligibilityResult = await this.eligibilityService.check({
      reviewerId: input.reviewerId,
      targetEntityId: input.targetEntityId,
      targetEntityType: input.targetEntityType,
      tenantId,
    });
    if (!eligibilityResult.isSuccess || eligibilityResult.data?.['eligible'] === false) {
      // No audit write on ineligible path — IR-1
      await this.queueFabric.enqueue('review.rejected', {
        reviewerId: input.reviewerId,
        targetEntityId: input.targetEntityId,
        reason: 'not_eligible',
        tenantId,
      });
      return DataProcessResult.success({
        reviewId: '',
        status: 'REJECTED',
        reason: 'not_eligible',
        revision_allowed: false,
      });
    }

    // ORDER 2: Rating validation [1,5] — BEFORE SETNX (don't consume idempotency slot on bad input)
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      // No SETNX consumed on invalid rating — IR-2
      await this.queueFabric.enqueue('review.rejected', {
        reviewerId: input.reviewerId,
        targetEntityId: input.targetEntityId,
        reason: 'invalid_rating',
        tenantId,
      });
      return DataProcessResult.success({
        reviewId: '',
        status: 'REJECTED',
        reason: 'invalid_rating',
        revision_allowed: false,
      });
    }

    // Server-derived reviewId — never from event payload (DR-10-G)
    const reviewId = this.deriveReviewId(
      tenantId,
      input.reviewerId,
      input.targetEntityId,
      input.targetEntityType,
    );

    // ORDER 3: SETNX — idempotency check
    // Returns existing record if duplicate
    const existingResult = await this.idempotencyStore.setnx(reviewId, tenantId);
    if (existingResult.isSuccess && existingResult.data?.['exists'] === true) {
      // Idempotent — return existing success
      return DataProcessResult.success({
        reviewId,
        status: 'ACCEPTED',
      });
    }

    const submittedAt = new Date().toISOString();

    // ORDER 4: Audit storeDocument() — AFTER eligibility + validation + SETNX
    // CF-10-1: audit ONLY happens here, never before eligibility
    await this.auditService.storeDocument(
      'xiigen-review-audit',
      {
        reviewId,
        reviewerId: input.reviewerId,
        targetEntityId: input.targetEntityId,
        targetEntityType: input.targetEntityType,
        rating: input.rating,
        action: 'SUBMITTED',
        tenantId,
        submittedAt,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PLATFORM_ONLY',
      },
      `audit-${reviewId}`,
    );

    // ORDER 5: storeDocument before enqueue — DNA-8
    const storeResult = await this.dbFabric.storeDocument(
      'xiigen-reviews',
      {
        reviewId,
        reviewerId: input.reviewerId,
        targetEntityId: input.targetEntityId,
        targetEntityType: input.targetEntityType,
        rating: input.rating,
        status: 'ACCEPTED',
        tenantId,
        submittedAt,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      reviewId,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store review: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    // Emit ReviewAccepted + ReviewSubmissionCompleted (sync boundary — DR-10-I)
    await this.queueFabric.enqueue('review.accepted', {
      reviewId,
      reviewerId: input.reviewerId,
      targetEntityId: input.targetEntityId,
      targetEntityType: input.targetEntityType,
      rating: input.rating,
      status: 'ACCEPTED',
      tenantId,
      submittedAt,
    });

    await this.queueFabric.enqueue('review.submission.completed', {
      reviewId,
      status: 'ACCEPTED',
      tenantId,
      submittedAt,
    });

    return DataProcessResult.success({
      reviewId,
      status: 'ACCEPTED',
    });
  }
}
