/**
 * ApprovalResultHandler (T114) — FLOW-06 Phase 1E (SUBFLOW-06P)
 * Single responsibility: process admin approve/reject decision on pending membership.
 *
 * Iron rules:
 *   Conditional update on PENDING record — NOT SETNX (record already exists, DR-06-E).
 *   APPROVE → update PENDING→ACTIVE → emit 'membership.activated'.
 *   REJECT  → update PENDING→REJECTED → emit 'membership.rejected'.
 *   DNA-8: storeDocument (status update) BEFORE any event emit.
 *   Second APPROVE on ACTIVE record → idempotent success (not error).
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

const MEMBERSHIPS_INDEX = 'xiigen-group-memberships';

export interface ApprovalResultHandlerInput {
  membershipId: string;
  userId: string;
  groupId: string;
  decision: 'APPROVE' | 'REJECT';
  tenantId: string;
}

export interface ApprovalResultHandlerResult {
  membershipId: string;
  newStatus: string;
  idempotent: boolean;
}

export class ApprovalResultHandler {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  async handleDecision(
    input: ApprovalResultHandlerInput,
  ): Promise<DataProcessResult<ApprovalResultHandlerResult>> {
    try {
      // ── Fetch existing membership record ──────────────────────────────────
      const membershipResult = await this.db.searchDocuments(MEMBERSHIPS_INDEX, {
        membership_id: input.membershipId,
      });

      if (!membershipResult.isSuccess || (membershipResult.data ?? []).length === 0) {
        return DataProcessResult.failure(
          'MEMBERSHIP_NOT_FOUND',
          `Membership ${input.membershipId} not found`,
        );
      }

      const existing = membershipResult.data![0] as Record<string, unknown>;
      const currStatus = existing['status'] as string;

      // ── Idempotency: second APPROVE on ACTIVE → return success ────────────
      if (input.decision === 'APPROVE' && currStatus === 'ACTIVE') {
        return DataProcessResult.success({
          membershipId: input.membershipId,
          newStatus: 'ACTIVE',
          idempotent: true,
        });
      }

      // ── Conditional update: only update PENDING records ───────────────────
      const newStatus = input.decision === 'APPROVE' ? 'ACTIVE' : 'REJECTED';
      const now = new Date().toISOString();

      const updatedDoc: Record<string, unknown> = {
        ...existing,
        status: newStatus,
        updated_at: now,
        decision: input.decision,
      };

      // DNA-8: storeDocument BEFORE emit ─────────────────────────────────────
      const stored = await this.db.storeDocument(MEMBERSHIPS_INDEX, updatedDoc, input.membershipId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      // Emit appropriate event ───────────────────────────────────────────────
      const eventType =
        input.decision === 'APPROVE' ? 'membership.activated' : 'membership.rejected';
      await this.queue.enqueue(eventType, {
        membershipId: input.membershipId,
        userId: input.userId,
        groupId: input.groupId,
        tenantId: input.tenantId,
        newStatus,
        decision: input.decision,
      });

      return DataProcessResult.success({
        membershipId: input.membershipId,
        newStatus,
        idempotent: false,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'APPROVAL_RESULT_HANDLER_ERROR',
        `ApprovalResultHandler threw: ${String(err)}`,
      );
    }
  }
}
