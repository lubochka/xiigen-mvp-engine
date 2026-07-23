/**
 * GroupMembershipCompletedApproval (T115) — FLOW-06 Phase 1E (SUBFLOW-06P)
 * Single responsibility: emit GroupMembershipCompleted on APPROVE path only.
 *
 * Iron rules:
 *   Same event type 'GroupMembershipCompleted' as T103 — MACHINE literal.
 *   Only fires on APPROVE decision (not REJECT).
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

const MEMBERSHIPS_INDEX = 'xiigen-group-memberships';

export interface GroupMembershipCompletedApprovalInput {
  membershipId: string;
  userId: string;
  groupId: string;
  tenantId: string;
  decision: 'APPROVE' | 'REJECT';
}

export interface GroupMembershipCompletedApprovalResult {
  emitted: boolean;
  reason?: string;
}

export class GroupMembershipCompletedApproval {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  async complete(
    input: GroupMembershipCompletedApprovalInput,
  ): Promise<DataProcessResult<GroupMembershipCompletedApprovalResult>> {
    try {
      // ── Only APPROVE decision triggers GroupMembershipCompleted ──────────
      if (input.decision !== 'APPROVE') {
        return DataProcessResult.success({ emitted: false, reason: 'decision_is_reject' });
      }

      // ── Verify membership is now ACTIVE ───────────────────────────────────
      const membershipResult = await this.db.searchDocuments(MEMBERSHIPS_INDEX, {
        membership_id: input.membershipId,
      });

      if (!membershipResult.isSuccess || (membershipResult.data ?? []).length === 0) {
        return DataProcessResult.success({ emitted: false, reason: 'membership_not_found' });
      }

      const membership = membershipResult.data![0] as Record<string, unknown>;
      if (membership['status'] !== 'ACTIVE') {
        return DataProcessResult.success({ emitted: false, reason: 'membership_not_active' });
      }

      // ── Emit GroupMembershipCompleted (MACHINE literal) ───────────────────
      await this.queue.enqueue('GroupMembershipCompleted', {
        membershipId: input.membershipId,
        userId: input.userId,
        groupId: input.groupId,
        tenantId: input.tenantId,
        approvalPath: true,
      });

      return DataProcessResult.success({ emitted: true });
    } catch (err) {
      return DataProcessResult.failure(
        'GROUP_MEMBERSHIP_COMPLETED_APPROVAL_ERROR',
        `GroupMembershipCompletedApproval threw: ${String(err)}`,
      );
    }
  }
}
