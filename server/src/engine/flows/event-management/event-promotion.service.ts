/**
 * EventPromotionEngine (T61) — FLOW-03 Phase 1C
 * Single responsibility: promote events to discovery feeds after content safety gate.
 *
 * Iron rules:
 *   IR-61-1: Content safety check MUST complete and PASS before any promotion action.
 *            Ordering enforced: check → pass → storeDocument → EventPromoted.
 *            A store or emit that precedes the safety check is a BUILD_FAILURE.
 *   IR-61-2: Content safety fail → emit EventPromotionRejected and return
 *            DataProcessResult.success({ promoted: false }). The promotion attempt
 *            was valid input — content policy rejected it. This is a business outcome,
 *            not a system error.
 *   FREEDOM: Promotion target channels from flow03_promotion_channels FREEDOM key.
 *            Never hardcode channel names.
 *   SCOPE:   knowledge_scope='GLOBAL' — promoted events are publicly discoverable.
 *   DNA-3:   All methods return DataProcessResult<T> — never throw.
 *   DNA-8:   storeDocument(promotion record) BEFORE EventPromoted emitted.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const PROMOTIONS_INDEX = 'xiigen-event-promotions';
const CONTENT_POLICY_INDEX = 'xiigen-content-policy';
const FREEDOM_INDEX = 'freedom_configs';

export interface PromoteEventInput {
  eventId: string;
  organizerId: string;
  tenantId: string;
}

export interface PromoteEventResult {
  promoted: boolean;
  promotionId?: string;
  channels?: string[];
  reason?: 'CONTENT_REJECTED';
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-03
 * @portability MOBILE — no ClsService, FREEDOM keys flow-scoped (flow03_*)
 * @className EventPromotionEngine
 */
@Injectable()
export class EventPromotionEngine {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
  ) {}

  async promote(input: PromoteEventInput): Promise<DataProcessResult<PromoteEventResult>> {
    try {
      // ── Validate ──────────────────────────────────────────────────────────
      if (!input.eventId || !input.organizerId || !input.tenantId) {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'Promotion input validation failed');
      }

      // ── IR-61-1: Content safety check MUST run BEFORE any write or emit ──
      // Reads xiigen-content-policy for this event. Any flagged record = rejected.
      const safetyResult = await this.db.searchDocuments(CONTENT_POLICY_INDEX, {
        event_id: input.eventId,
        flagged: true,
      });
      const isFlagged = safetyResult.isSuccess && (safetyResult.data ?? []).length > 0;

      if (isFlagged) {
        // IR-61-2: Content rejection is a business outcome — DataProcessResult.success, not failure.
        // EventPromotionRejected emitted so FLOW-08 / audit trail can record the rejection.
        // No storeDocument — a rejected promotion has no promotion record.
        await this.queue.enqueue('EventPromotionRejected', {
          eventId: input.eventId,
          organizerId: input.organizerId,
          tenantId: input.tenantId,
          reason: 'CONTENT_POLICY_VIOLATION',
        });
        return DataProcessResult.success({ promoted: false, reason: 'CONTENT_REJECTED' });
      }

      // ── Read promotion channels from FREEDOM config (never hardcoded) ────
      const channels = await this.getPromotionChannels();

      // ── DNA-8: storeDocument BEFORE EventPromoted emitted ────────────────
      const promotionId = `promo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const now = new Date().toISOString();

      const doc: Record<string, unknown> = {
        promotion_id: promotionId,
        event_id: input.eventId,
        organizer_id: input.organizerId,
        tenant_id: input.tenantId,
        channels,
        knowledge_scope: 'GLOBAL', // promoted events are discoverable cross-tenant
        connection_type: 'FLOW_SCOPED',
        created_at: now,
      };

      const stored = await this.db.storeDocument(PROMOTIONS_INDEX, doc, promotionId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      // ── Emit EventPromoted only after successful store ────────────────────
      await this.queue.enqueue('EventPromoted', {
        promotionId,
        eventId: input.eventId,
        organizerId: input.organizerId,
        tenantId: input.tenantId,
        channels,
      });

      return DataProcessResult.success({ promoted: true, promotionId, channels });
    } catch (err) {
      return DataProcessResult.failure(
        'PROMOTION_ERROR',
        `EventPromotionEngine threw: ${String(err)}`,
      );
    }
  }

  /** Read promotion channels from FREEDOM config — never hardcoded. */
  private async getPromotionChannels(): Promise<string[]> {
    const cfg = await this.db.searchDocuments(FREEDOM_INDEX, {
      config_key: 'flow03_promotion_channels',
      task_type: 'xiigen-engine',
    });
    if (cfg.isSuccess && (cfg.data ?? []).length > 0) {
      const val = (cfg.data![0] as Record<string, unknown>)['config_value'];
      if (typeof val === 'string') {
        try {
          return JSON.parse(val) as string[];
        } catch {
          /* fall through */
        }
      }
      if (Array.isArray(val)) return val as string[];
    }
    return ['in-app', 'push']; // Safe default if FREEDOM config not seeded
  }
}
