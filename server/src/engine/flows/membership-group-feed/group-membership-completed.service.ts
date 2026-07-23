/**
 * GroupMembershipCompleted (T103) — FLOW-06 Phase 1B
 * Single responsibility: emit GroupMembershipCompleted gate event for ACTIVE memberships.
 *
 * Iron rules:
 *   Event type exactly 'GroupMembershipCompleted' — MACHINE literal.
 *   Gate: T101 stored + T102 ACTIVE confirmed — NOT Branch B (feed) or C (notifications).
 *   PENDING memberships do NOT emit GroupMembershipCompleted from T103.
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

const MEMBERSHIPS_INDEX = 'xiigen-group-memberships';
const ACCESS_CONTROL_INDEX = 'xiigen-access-controls';

export interface GroupMembershipCompletedInput {
  userId: string;
  groupId: string;
  tenantId: string;
  membershipId: string;
}

export interface GroupMembershipCompletedResult {
  emitted: boolean;
  reason?: string;
}

export class GroupMembershipCompleted {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  async complete(
    input: GroupMembershipCompletedInput,
  ): Promise<DataProcessResult<GroupMembershipCompletedResult>> {
    try {
      // ── Gate: confirm T101 access control record exists ───────────────────
      const acResult = await this.db.searchDocuments(ACCESS_CONTROL_INDEX, {
        user_id: input.userId,
        group_id: input.groupId,
      });
      if (!acResult.isSuccess || (acResult.data ?? []).length === 0) {
        return DataProcessResult.success({ emitted: false, reason: 'access_control_not_found' });
      }

      // ── Gate: confirm T102 ACTIVE membership ──────────────────────────────
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

      // ── Emit GroupMembershipCompleted (Branch A gate) ──────────────────────
      await this.queue.enqueue('GroupMembershipCompleted', {
        membershipId: input.membershipId,
        userId: input.userId,
        groupId: input.groupId,
        tenantId: input.tenantId,
      });

      return DataProcessResult.success({ emitted: true });
    } catch (err) {
      return DataProcessResult.failure(
        'GROUP_MEMBERSHIP_COMPLETED_ERROR',
        `GroupMembershipCompleted threw: ${String(err)}`,
      );
    }
  }
}
