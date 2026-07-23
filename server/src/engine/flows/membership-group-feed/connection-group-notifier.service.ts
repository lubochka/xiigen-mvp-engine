/**
 * ConnectionGroupNotifier (T110) — FLOW-06 Phase 1D (Branch C)
 * Single responsibility: best-effort connection notifications for group join.
 *
 * Iron rules:
 *   Best-effort — entire body in try/catch, returns success on error.
 *   Max 5 connection notifications per join event (from FREEDOM config
 *     flow06_max_connection_notifications, default 5).
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

const CONNECTIONS_INDEX = 'xiigen-connections';
const NOTIFICATIONS_INDEX = 'xiigen-notifications';
const FREEDOM_INDEX = 'freedom_configs';
const DEFAULT_MAX = 5;

export interface ConnectionGroupNotifierInput {
  userId: string;
  groupId: string;
  tenantId: string;
}

export interface ConnectionNotifyResult {
  notifiedCount: number;
  maxApplied: number;
}

export class ConnectionGroupNotifier {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  async notify(
    input: ConnectionGroupNotifierInput,
  ): Promise<DataProcessResult<ConnectionNotifyResult>> {
    try {
      // ── Fetch max from FREEDOM config (default 5) ─────────────────────────
      let maxNotifications = DEFAULT_MAX;
      try {
        const configResult = await this.db.searchDocuments(FREEDOM_INDEX, {
          config_key: 'flow06_max_connection_notifications',
        });
        if (configResult.isSuccess && (configResult.data ?? []).length > 0) {
          const val = (configResult.data![0] as Record<string, unknown>)['config_value'];
          if (typeof val === 'number') maxNotifications = val;
        }
      } catch (_) {
        // degradable — use default
      }

      // ── Fetch connections ─────────────────────────────────────────────────
      let connections: Array<Record<string, unknown>> = [];
      try {
        const connResult = await this.db.searchDocuments(
          CONNECTIONS_INDEX,
          {
            user_id: input.userId,
          },
          maxNotifications,
        );
        if (connResult.isSuccess) {
          connections = (connResult.data ?? []).slice(0, maxNotifications);
        }
      } catch (_) {
        // degradable — no connections found
      }

      let notifiedCount = 0;
      for (const conn of connections) {
        try {
          const connectionId = (conn as Record<string, unknown>)['connection_id'] as string;
          const notificationId = `notif-conn-${connectionId}-${input.groupId}-${Date.now()}`;
          const now = new Date().toISOString();

          const doc: Record<string, unknown> = {
            notification_id: notificationId,
            connection_id: connectionId,
            group_id: input.groupId,
            user_id: input.userId,
            tenant_id: input.tenantId,
            notification_type: 'CONNECTION_JOINED_GROUP',
            knowledge_scope: 'PRIVATE',
            connection_type: 'FLOW_SCOPED',
            created_at: now,
          };

          await this.db.storeDocument(NOTIFICATIONS_INDEX, doc, notificationId);
          await this.queue.enqueue('notification.connection_group', {
            notificationId,
            connectionId,
            groupId: input.groupId,
            userId: input.userId,
            tenantId: input.tenantId,
          });
          notifiedCount++;
        } catch (_) {
          // best-effort: skip failed notification
        }
      }

      return DataProcessResult.success({ notifiedCount, maxApplied: maxNotifications });
    } catch (_err) {
      // Best-effort: always return success
      return DataProcessResult.success({ notifiedCount: 0, maxApplied: DEFAULT_MAX });
    }
  }
}
