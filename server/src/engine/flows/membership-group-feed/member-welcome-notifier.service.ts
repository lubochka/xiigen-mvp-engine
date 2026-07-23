/**
 * MemberWelcomeNotifier (T108) — FLOW-06 Phase 1D (Branch C)
 * Single responsibility: send welcome notification to new member.
 *
 * Iron rules:
 *   Channel rules MACHINE — not configurable by organizer.
 *   PENDING membership sends different message from ACTIVE membership.
 *   Message wording from FREEDOM config: flow06_welcome_message_template.
 *   DNA-8: storeDocument(notification record) before emit.
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

const NOTIFICATIONS_INDEX = 'xiigen-notifications';
const FREEDOM_INDEX = 'freedom_configs';

export interface MemberWelcomeNotifierInput {
  userId: string;
  groupId: string;
  tenantId: string;
  status: 'ACTIVE' | 'PENDING';
}

export interface WelcomeNotificationResult {
  notificationId: string;
  templateKey: string;
}

export class MemberWelcomeNotifier {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  async notify(
    input: MemberWelcomeNotifierInput,
  ): Promise<DataProcessResult<WelcomeNotificationResult>> {
    try {
      // ── Fetch message template from FREEDOM config ────────────────────────
      const configResult = await this.db.searchDocuments(FREEDOM_INDEX, {
        config_key: 'flow06_welcome_message_template',
      });

      const templateConfig =
        configResult.isSuccess && (configResult.data ?? []).length > 0
          ? (configResult.data![0] as Record<string, unknown>)
          : null;

      const templateKey =
        input.status === 'ACTIVE'
          ? (((templateConfig?.['config_value'] as Record<string, unknown>)?.[
              'active'
            ] as string) ?? 'welcome_active')
          : (((templateConfig?.['config_value'] as Record<string, unknown>)?.[
              'pending'
            ] as string) ?? 'welcome_pending');

      const notificationId = `notif-welcome-${input.userId}-${input.groupId}-${Date.now()}`;
      const now = new Date().toISOString();

      const doc: Record<string, unknown> = {
        notification_id: notificationId,
        user_id: input.userId,
        group_id: input.groupId,
        tenant_id: input.tenantId,
        template_key: templateKey,
        status: input.status,
        notification_type: 'WELCOME',
        knowledge_scope: 'PRIVATE',
        connection_type: 'FLOW_SCOPED',
        created_at: now,
      };

      // DNA-8: storeDocument BEFORE emit ─────────────────────────────────────
      const stored = await this.db.storeDocument(NOTIFICATIONS_INDEX, doc, notificationId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      await this.queue.enqueue('notification.welcome', {
        notificationId,
        userId: input.userId,
        groupId: input.groupId,
        tenantId: input.tenantId,
        templateKey,
        status: input.status,
      });

      return DataProcessResult.success({ notificationId, templateKey });
    } catch (err) {
      return DataProcessResult.failure(
        'MEMBER_WELCOME_NOTIFIER_ERROR',
        `MemberWelcomeNotifier threw: ${String(err)}`,
      );
    }
  }
}
