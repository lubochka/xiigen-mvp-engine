/**
 * ApprovalNotifier (T113) — FLOW-06 Phase 1E (SUBFLOW-06P)
 * Single responsibility: notify admins of pending join request with approve/reject links.
 *
 * Iron rules:
 *   Triggers on JoinRequestSubmitted.
 *   Notification includes approve/reject action links.
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

const NOTIFICATIONS_INDEX = 'xiigen-notifications';
const ADMINS_INDEX = 'xiigen-group-admins';

export interface ApprovalNotifierInput {
  joinRequestId: string;
  membershipId: string;
  userId: string;
  groupId: string;
  tenantId: string;
  expiresAt: string;
}

export interface ApprovalNotificationResult {
  notifiedCount: number;
}

export class ApprovalNotifier {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  async notify(
    input: ApprovalNotifierInput,
  ): Promise<DataProcessResult<ApprovalNotificationResult>> {
    try {
      // ── Fetch group admins ────────────────────────────────────────────────
      const adminsResult = await this.db.searchDocuments(ADMINS_INDEX, {
        group_id: input.groupId,
      });

      const admins = adminsResult.isSuccess ? (adminsResult.data ?? []) : [];
      let notifiedCount = 0;

      for (const adminRec of admins) {
        const adminId = (adminRec as Record<string, unknown>)['admin_id'] as string;
        if (!adminId) continue;

        const actionLinks = {
          approve: `/api/groups/${input.groupId}/join-requests/${input.joinRequestId}/approve`,
          reject: `/api/groups/${input.groupId}/join-requests/${input.joinRequestId}/reject`,
        };

        const notificationId = `notif-approval-${adminId}-${input.joinRequestId}`;
        const now = new Date().toISOString();

        const doc: Record<string, unknown> = {
          notification_id: notificationId,
          admin_id: adminId,
          join_request_id: input.joinRequestId,
          membership_id: input.membershipId,
          group_id: input.groupId,
          user_id: input.userId,
          tenant_id: input.tenantId,
          notification_type: 'APPROVAL_REQUEST',
          action_links: actionLinks,
          expires_at: input.expiresAt,
          knowledge_scope: 'PRIVATE',
          connection_type: 'FLOW_SCOPED',
          created_at: now,
        };

        await this.db.storeDocument(NOTIFICATIONS_INDEX, doc, notificationId);
        await this.queue.enqueue('notification.approval_request', {
          notificationId,
          adminId,
          joinRequestId: input.joinRequestId,
          membershipId: input.membershipId,
          groupId: input.groupId,
          userId: input.userId,
          tenantId: input.tenantId,
          action_links: actionLinks,
        });

        notifiedCount++;
      }

      return DataProcessResult.success({ notifiedCount });
    } catch (err) {
      return DataProcessResult.failure(
        'APPROVAL_NOTIFIER_ERROR',
        `ApprovalNotifier threw: ${String(err)}`,
      );
    }
  }
}
