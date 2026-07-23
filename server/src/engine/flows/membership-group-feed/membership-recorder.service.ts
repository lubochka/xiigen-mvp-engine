/**
 * MembershipRecorder (T102) — FLOW-06 Phase 1B
 * Single responsibility: idempotent membership record creation + status-based event emit.
 *
 * Iron rules:
 *   SETNX on key membership:{userId}:{groupId} — second call returns existing as success.
 *   group.type read from stored group record via DB — NOT from request payload.
 *   PUBLIC/INVITE_ONLY → status='ACTIVE' → emit 'membership.activated'.
 *   PRIVATE (no invite token path) → status='PENDING' → emit 'membership.pending'.
 *   DNA-8: storeDocument BEFORE any event emit.
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

const MEMBERSHIPS_INDEX = 'xiigen-group-memberships';
const GROUPS_INDEX = 'xiigen-groups';

export interface MembershipRecorderInput {
  userId: string;
  groupId: string;
  assignedTier: string;
  tenantId: string;
}

export interface MembershipRecordResult {
  membershipId: string;
  status: string;
  idempotent: boolean;
}

export class MembershipRecorder {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  async record(input: MembershipRecorderInput): Promise<DataProcessResult<MembershipRecordResult>> {
    try {
      const membershipId = `membership-${input.userId}-${input.groupId}`;

      // ── SETNX: return existing if record already present ──────────────────
      const existing = await this.db.searchDocuments(MEMBERSHIPS_INDEX, {
        user_id: input.userId,
        group_id: input.groupId,
      });
      if (existing.isSuccess && (existing.data ?? []).length > 0) {
        const rec = existing.data![0] as Record<string, unknown>;
        return DataProcessResult.success({
          membershipId: (rec['membership_id'] as string) ?? membershipId,
          status: (rec['status'] as string) ?? 'ACTIVE',
          idempotent: true,
        });
      }

      // ── Read group.type from DB (not from input) ──────────────────────────
      const groupResult = await this.db.searchDocuments(GROUPS_INDEX, {
        group_id: input.groupId,
      });
      const groupType =
        groupResult.isSuccess && (groupResult.data ?? []).length > 0
          ? (((groupResult.data![0] as Record<string, unknown>)['group_type'] as string) ??
            'PUBLIC')
          : 'PUBLIC';

      // ── Determine status based on group type ──────────────────────────────
      const status = groupType === 'PRIVATE' ? 'PENDING' : 'ACTIVE';

      const now = new Date().toISOString();
      const doc: Record<string, unknown> = {
        membership_id: membershipId,
        user_id: input.userId,
        group_id: input.groupId,
        assigned_tier: input.assignedTier,
        tenant_id: input.tenantId,
        status,
        group_type: groupType,
        knowledge_scope: 'PRIVATE',
        connection_type: 'FLOW_SCOPED',
        created_at: now,
        updated_at: now,
      };

      // DNA-8: storeDocument BEFORE emit ─────────────────────────────────────
      const stored = await this.db.storeDocument(MEMBERSHIPS_INDEX, doc, membershipId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      // Emit appropriate event based on status ───────────────────────────────
      const eventType = status === 'ACTIVE' ? 'membership.activated' : 'membership.pending';
      await this.queue.enqueue(eventType, {
        membershipId,
        userId: input.userId,
        groupId: input.groupId,
        assignedTier: input.assignedTier,
        tenantId: input.tenantId,
        status,
      });

      return DataProcessResult.success({ membershipId, status, idempotent: false });
    } catch (err) {
      return DataProcessResult.failure(
        'MEMBERSHIP_RECORDER_ERROR',
        `MembershipRecorder threw: ${String(err)}`,
      );
    }
  }
}
