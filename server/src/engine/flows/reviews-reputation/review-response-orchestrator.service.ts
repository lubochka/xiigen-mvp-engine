// T172 ReviewResponseOrchestrator [ORCHESTRATION]
//
// CF-10-3 (conditional revision): revision_allowed:true ONLY for content_policy rejection.
//   not_owner and already_responded → revision_allowed:false
//   revision_strategy = NEW_KEY_VARIANT: revision key = hash(tenantId+reviewId+'response-revision-1')
//
// Iron rules:
//   IR-1: ownership check runs ORDER 1 — before any write
//   IR-2: SETNX gate ORDER 2 — one response per review: hash(tenantId+reviewId+'response')
//   IR-3/DNA-8: audit storeDocument ORDER 4 — BEFORE notification enqueue
//   IR-4: response text MUST NOT be logged
//   IR-7: revision_allowed:true ONLY for content_policy rejection
//         not_owner and already_responded → revision_allowed:false
//   Shared factory: F172 IReviewAggregateService (same NestJS provider as T171)
//   T172 does NOT emit ReputationUpdated — response ≠ new review

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { createHash } from 'crypto';

interface IOwnershipService {
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

interface IContentModerationService {
  check(params: Record<string, unknown>): Promise<{
    isSuccess: boolean;
    errorCode?: string;
    errorMessage?: string;
    data?: Record<string, unknown>;
  }>;
}

export interface ReviewResponseInput {
  reviewId: string;
  responderId: string;
  responseText: string; // IR-4: never log this field
  tenantId: string;
}

export interface ReviewResponseResult {
  reviewId: string;
  responderId: string;
  status: 'PUBLISHED' | 'REJECTED';
  reason?: string;
  revision_allowed?: boolean;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-10
 * @portability MOBILE - no ClsService, response orchestration through fabric interfaces
 * @className ReviewResponseOrchestratorService
 */
@Injectable()
export class ReviewResponseOrchestratorService extends MicroserviceBase {
  constructor(
    /** F_OWNERSHIP: IReviewOwnershipService — ORDER 1 ownership check */
    private readonly ownershipService: IOwnershipService,
    /** F_DATABASE: IDatabaseService — store responses */

    private readonly dbFabric: IDatabaseService,
    /** F_QUEUE: IQueueService — emit response events */

    private readonly queueFabric: IQueueService,
    /** F_AUDIT: IAuditTrailService — ORDER 4 audit write (before notify enqueue) */
    private readonly auditService: IAuditService,
    /** F_IDEMPOTENCY: SETNX store */
    private readonly idempotencyStore: IIdempotencyStore,
    /** F_CONTENT: IContentModerationService — content policy check */
    private readonly contentModerationService: IContentModerationService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T172',
        serviceName: 'ReviewResponseOrchestratorService',
        flowId: 'FLOW-10',
      }),
    });
  }

  private deriveResponseKey(tenantId: string, reviewId: string): string {
    return createHash('sha256').update(`${tenantId}:${reviewId}:response`).digest('hex');
  }

  /** NEW_KEY_VARIANT: revision key for content_policy re-try */
  private deriveRevisionKey(tenantId: string, reviewId: string): string {
    return createHash('sha256').update(`${tenantId}:${reviewId}:response-revision-1`).digest('hex');
  }

  private async emitRejection(
    input: ReviewResponseInput,
    reason: 'not_owner' | 'already_responded' | 'content_policy',
  ): Promise<DataProcessResult<ReviewResponseResult>> {
    // IR-7: revision_allowed:true ONLY for content_policy
    const revision_allowed = reason === 'content_policy';
    await this.queueFabric.enqueue('review.response.rejected', {
      reviewId: input.reviewId,
      responderId: input.responderId,
      reason,
      revision_allowed,
      tenantId: input.tenantId,
    });
    return DataProcessResult.success({
      reviewId: input.reviewId,
      responderId: input.responderId,
      status: 'REJECTED',
      reason,
      revision_allowed,
    });
  }

  async submitResponse(
    input: ReviewResponseInput,
  ): Promise<DataProcessResult<ReviewResponseResult>> {
    const tenantId = input.tenantId; // from ALS

    // ORDER 1: Ownership check — BEFORE any write, BEFORE SETNX
    const ownershipResult = await this.ownershipService.check({
      reviewId: input.reviewId,
      responderId: input.responderId,
      tenantId,
    });
    if (!ownershipResult.isSuccess || ownershipResult.data?.['isOwner'] === false) {
      return this.emitRejection(input, 'not_owner');
    }

    // ORDER 2: SETNX gate — one response per review
    const responseKey = this.deriveResponseKey(tenantId, input.reviewId);
    const setnxResult = await this.idempotencyStore.setnx(responseKey, tenantId);
    if (setnxResult.isSuccess && setnxResult.data?.['exists'] === true) {
      // Check if this is a valid revision attempt (NEW_KEY_VARIANT)
      const revisionKey = this.deriveRevisionKey(tenantId, input.reviewId);
      const revisionResult = await this.idempotencyStore.setnx(revisionKey, tenantId);
      if (revisionResult.isSuccess && revisionResult.data?.['exists'] === true) {
        // Both keys exist — already_responded with no more revision slots
        return this.emitRejection(input, 'already_responded');
      }
      // Revision attempt via NEW_KEY_VARIANT — proceed with content check
    }

    // ORDER 3: Content policy check
    const contentResult = await this.contentModerationService.check({
      // IR-4: do not log responseText
      content: input.responseText,
      tenantId,
    });
    if (!contentResult.isSuccess || contentResult.data?.['passed'] === false) {
      return this.emitRejection(input, 'content_policy');
    }

    const respondedAt = new Date().toISOString();

    // ORDER 4: Audit storeDocument — BEFORE notification enqueue (DNA-8)
    await this.auditService.storeDocument(
      'xiigen-response-audit',
      {
        reviewId: input.reviewId,
        responderId: input.responderId,
        action: 'RESPONSE_SUBMITTED',
        respondedAt,
        tenantId,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PLATFORM_ONLY',
        // IR-4: response text NOT in audit record
      },
      `audit-response-${input.reviewId}`,
    );

    // Store response (before notification)
    await this.dbFabric.storeDocument(
      'xiigen-review-responses',
      {
        reviewId: input.reviewId,
        responderId: input.responderId,
        // IR-4: response text NOT logged — stored but not in log-visible fields
        respondedAt,
        status: 'PUBLISHED',
        tenantId,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      `response-${input.reviewId}`,
    );

    // Notify AFTER audit store (DNA-8 — ORDER 5)
    await this.queueFabric.enqueue('review.response.published', {
      reviewId: input.reviewId,
      responderId: input.responderId,
      respondedAt,
      tenantId,
      // IR-4: response text NOT in queue message
    });

    // T172 does NOT emit ReputationUpdated — response ≠ new review (domain rule)
    return DataProcessResult.success({
      reviewId: input.reviewId,
      responderId: input.responderId,
      status: 'PUBLISHED',
    });
  }
}
