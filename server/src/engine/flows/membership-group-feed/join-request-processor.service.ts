/**
 * JoinRequestProcessor (T112) — FLOW-06 Phase 1E (SUBFLOW-06P)
 * Single responsibility: SUBFLOW-06P entry — create join request record for pending membership.
 *
 * Iron rules:
 *   Sole SUBFLOW-06P entry — triggers on membership.pending event.
 *   expiresAt from FREEDOM config flow06_approval_window_hours (default 72).
 *   DNA-8: storeDocument(join request record) BEFORE JoinRequestSubmitted emit.
 *   DNA-3: All methods return DataProcessResult<T> — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

const JOIN_REQUESTS_INDEX = 'xiigen-join-requests';
const FREEDOM_INDEX = 'freedom_configs';
const DEFAULT_WINDOW_HOURS = 72;

export interface JoinRequestProcessorInput {
  userId: string;
  groupId: string;
  membershipId: string;
  tenantId: string;
}

export interface JoinRequestResult {
  joinRequestId: string;
  expiresAt: string;
}

export class JoinRequestProcessor {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  async process(input: JoinRequestProcessorInput): Promise<DataProcessResult<JoinRequestResult>> {
    try {
      // ── Fetch approval window hours from FREEDOM config ───────────────────
      let windowHours = DEFAULT_WINDOW_HOURS;
      const configResult = await this.db.searchDocuments(FREEDOM_INDEX, {
        config_key: 'flow06_approval_window_hours',
      });
      if (configResult.isSuccess && (configResult.data ?? []).length > 0) {
        const val = (configResult.data![0] as Record<string, unknown>)['config_value'];
        if (typeof val === 'number') windowHours = val;
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + windowHours * 60 * 60 * 1000).toISOString();
      const joinRequestId = `jr-${input.membershipId}-${Date.now()}`;

      const doc: Record<string, unknown> = {
        join_request_id: joinRequestId,
        membership_id: input.membershipId,
        user_id: input.userId,
        group_id: input.groupId,
        tenant_id: input.tenantId,
        status: 'PENDING',
        expires_at: expiresAt,
        knowledge_scope: 'PRIVATE',
        connection_type: 'FLOW_SCOPED',
        created_at: now.toISOString(),
      };

      // DNA-8: storeDocument BEFORE JoinRequestSubmitted emit ───────────────
      const stored = await this.db.storeDocument(JOIN_REQUESTS_INDEX, doc, joinRequestId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      await this.queue.enqueue('JoinRequestSubmitted', {
        joinRequestId,
        membershipId: input.membershipId,
        userId: input.userId,
        groupId: input.groupId,
        tenantId: input.tenantId,
        expiresAt,
      });

      return DataProcessResult.success({ joinRequestId, expiresAt });
    } catch (err) {
      return DataProcessResult.failure(
        'JOIN_REQUEST_PROCESSOR_ERROR',
        `JoinRequestProcessor threw: ${String(err)}`,
      );
    }
  }
}
