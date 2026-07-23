/**
 * GroupAdminNotifier (T109) — FLOW-06 Phase 1D (Branch C)
 * Single responsibility: notify group admins of new join request/membership.
 *
 * Iron rules:
 *   Per-admin rate limit key: admin-notify:{tenantId}:{adminId}:{groupId}.
 *   PRIVATE groups include approve/reject action links in notification.
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

const NOTIFICATIONS_INDEX = 'xiigen-notifications';
const RATE_LIMIT_INDEX = 'xiigen-rate-limits';
const ADMINS_INDEX = 'xiigen-group-admins';

export interface GroupAdminNotifierInput {
  userId: string;
  groupId: string;
  tenantId: string;
  groupType: string;
  membershipId?: string;
}

export interface AdminNotificationResult {
  notifiedCount: number;
  rateLimited: number;
}

export class GroupAdminNotifier {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  async notify(
    input: GroupAdminNotifierInput,
  ): Promise<DataProcessResult<AdminNotificationResult>> {
    try {
      // ── Fetch group admins ────────────────────────────────────────────────
      const adminsResult = await this.db.searchDocuments(ADMINS_INDEX, {
        group_id: input.groupId,
      });

      const admins = adminsResult.isSuccess ? (adminsResult.data ?? []) : [];
      let notifiedCount = 0;
      let rateLimited = 0;

      for (const adminRec of admins) {
        const adminId = (adminRec as Record<string, unknown>)['admin_id'] as string;
        if (!adminId) continue;

        // ── Per-admin rate limit check ────────────────────────────────────
        const rateLimitKey = `admin-notify:${input.tenantId}:${adminId}:${input.groupId}`;
        const rateLimitResult = await this.db.searchDocuments(RATE_LIMIT_INDEX, {
          rate_limit_key: rateLimitKey,
        });
        if (rateLimitResult.isSuccess && (rateLimitResult.data ?? []).length > 0) {
          rateLimited++;
          continue;
        }

        // ── Build action links for PRIVATE groups ─────────────────────────
        const actionLinks =
          input.groupType === 'PRIVATE' && input.membershipId
            ? {
                approve: `/api/groups/${input.groupId}/memberships/${input.membershipId}/approve`,
                reject: `/api/groups/${input.groupId}/memberships/${input.membershipId}/reject`,
              }
            : undefined;

        const notificationId = `notif-admin-${adminId}-${input.groupId}-${Date.now()}`;
        const now = new Date().toISOString();

        const doc: Record<string, unknown> = {
          notification_id: notificationId,
          admin_id: adminId,
          group_id: input.groupId,
          user_id: input.userId,
          tenant_id: input.tenantId,
          notification_type: 'ADMIN_JOIN_NOTIFY',
          knowledge_scope: 'PRIVATE',
          connection_type: 'FLOW_SCOPED',
          created_at: now,
          ...(actionLinks ? { action_links: actionLinks } : {}),
        };

        await this.db.storeDocument(NOTIFICATIONS_INDEX, doc, notificationId);

        await this.queue.enqueue('notification.admin', {
          notificationId,
          adminId,
          groupId: input.groupId,
          userId: input.userId,
          tenantId: input.tenantId,
          ...(actionLinks ? { action_links: actionLinks } : {}),
        });

        notifiedCount++;
      }

      return DataProcessResult.success({ notifiedCount, rateLimited });
    } catch (err) {
      return DataProcessResult.failure(
        'GROUP_ADMIN_NOTIFIER_ERROR',
        `GroupAdminNotifier threw: ${String(err)}`,
      );
    }
  }
}
