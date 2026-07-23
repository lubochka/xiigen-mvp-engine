// T105 ComplianceEscalationHandler [ORCHESTRATION]
// @connectionType FLOW_SCOPED
// @flowId FLOW-09
//
//
// COMPLIANCE_ESCALATION pattern (CF-09-3):
//   On max retry exhaustion: SIMULTANEOUSLY emit RefundFailed AND push to F284.
//   Both required — neither alone sufficient.
//
// PER_ATTEMPT_IDEMPOTENCY (CF-09-3):
//   Idempotency key = hash(tenantId + purchaseId + 'refund-attempt-' + N)
//   Attempt counter N allows each retry to proceed independently.
//
// Iron rules:
//   On exhaustion: emit RefundFailed AND push F284 (missing either = BUILD_FAILURE)
//   Per-attempt idempotency key includes attempt counter
//   retryable: true — queue consumer deduplicates per attempt key
//   F284: PLATFORM-ONLY compliance queue
//   DNA-8: storeDocument BEFORE emit
//   knowledgeScope: 'PRIVATE'

import { DataProcessResult } from '../../../kernel/data-process-result';
import type { IFreedomConfigService } from '../../../freedom/freedom-config.interface';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

interface ComplianceQueuePort {
  push(params: Record<string, unknown>): Promise<void>;
}

export interface ComplianceEscalationInput {
  purchaseId: string;
  userId: string;
  eventId: string;
  refundId: string;
  attemptNumber: number;
  maxAttempts: number;
  failureReason: string;
}

export interface ComplianceEscalationResult {
  escalationId: string;
  status: 'RETRY_QUEUED' | 'ESCALATED';
  attemptNumber: number;
}

export class ComplianceEscalationHandler {
  constructor(
    /** F284: IComplianceQueueService — PLATFORM-ONLY compliance queue */

    private readonly complianceQueue: ComplianceQueuePort,
    /** DATABASE FABRIC: storeDocument */
    private readonly db: IDatabaseService,
    /** QUEUE FABRIC: RefundFailed + retry events */
    private readonly queue: IQueueService,
    /** FREEDOM config: flow09_max_refund_attempts */

    private readonly freedom: IFreedomConfigService,
  ) {}

  async handleRefundAttempt(
    input: ComplianceEscalationInput,
  ): Promise<DataProcessResult<ComplianceEscalationResult>> {
    // PER_ATTEMPT_IDEMPOTENCY: key includes attempt counter
    const attemptKey = `refund-attempt-${input.purchaseId}-${input.attemptNumber}`;
    const escalationId = `esc-${input.purchaseId}-${input.attemptNumber}`;

    // Check per-attempt idempotency
    const existing = await this.db.searchDocuments('compliance-escalations', { attemptKey });
    if (existing.isSuccess && Array.isArray(existing.data) && existing.data.length > 0) {
      return DataProcessResult.success({
        escalationId,
        status: (existing.data[0] as Record<string, unknown>)['status'] as
          | 'RETRY_QUEUED'
          | 'ESCALATED',
        attemptNumber: input.attemptNumber,
      });
    }

    const maxAttempts = input.maxAttempts;

    if (input.attemptNumber < maxAttempts) {
      // Retry — queue next attempt
      // DNA-8: storeDocument BEFORE enqueue
      await this.db.storeDocument(
        'compliance-escalations',
        {
          escalationId,
          attemptKey,
          purchaseId: input.purchaseId,
          attemptNumber: input.attemptNumber,
          status: 'RETRY_QUEUED',
          connectionType: 'FLOW_SCOPED',
          knowledgeScope: 'PRIVATE',
        },
        escalationId,
      );

      await this.queue.enqueue('refund.retry.requested', {
        purchaseId: input.purchaseId,
        refundId: input.refundId,
        attemptNumber: input.attemptNumber + 1,
        maxAttempts,
      });

      return DataProcessResult.success({
        escalationId,
        status: 'RETRY_QUEUED',
        attemptNumber: input.attemptNumber,
      });
    }

    // CF-09-3: Max retries exhausted — SIMULTANEOUSLY emit RefundFailed AND push F284
    // Both actions required
    const escalatedAt = new Date().toISOString();

    // DNA-8: storeDocument BEFORE emits
    await this.db.storeDocument(
      'compliance-escalations',
      {
        escalationId,
        attemptKey,
        purchaseId: input.purchaseId,
        refundId: input.refundId,
        userId: input.userId,
        eventId: input.eventId,
        attemptNumber: input.attemptNumber,
        status: 'ESCALATED',
        failureReason: input.failureReason,
        escalatedAt,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      escalationId,
    );

    // Action 1: emit RefundFailed event
    await this.queue.enqueue('refund.failed', {
      purchaseId: input.purchaseId,
      refundId: input.refundId,
      userId: input.userId,
      eventId: input.eventId,
      reason: 'MAX_RETRIES_EXCEEDED',
      failureReason: input.failureReason,
      escalatedAt,
    });

    // Action 2: push to F284 compliance queue (PLATFORM-ONLY)
    await this.complianceQueue.push({
      caseType: 'REFUND_EXHAUSTED',
      purchaseId: input.purchaseId,
      refundId: input.refundId,
      userId: input.userId,
      eventId: input.eventId,
      failureReason: input.failureReason,
      attemptCount: input.attemptNumber,
      escalatedAt,
    });

    return DataProcessResult.success({
      escalationId,
      status: 'ESCALATED',
      attemptNumber: input.attemptNumber,
    });
  }
}
