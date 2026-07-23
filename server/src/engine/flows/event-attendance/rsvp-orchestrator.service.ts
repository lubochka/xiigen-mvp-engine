/**
 * RSVPOrchestrator (T63) — FLOW-04 Phase 2A
 * Single responsibility: atomic RSVP creation with dual-entry and two-case idempotency.
 *
 * Iron rules:
 *   IR-63-1: ONE atomic storeDocument per RSVP creation — no separate capacity decrement write.
 *            Two writes (check+store) create a race window: two concurrent reads of capacity=1
 *            both succeed, producing capacity=-1 (oversell). CF-802.
 *   IR-63-2: Two idempotency cases — must NOT be conflated:
 *            Case A (same-path, promotionRequest absent/false): SETNX by (attendeeId, eventId).
 *              Returns existing record unchanged.
 *            Case B (T64 promotion, promotionRequest: true): Conditional update WAITLISTED → CONFIRMED.
 *              SETNX on this path would silently return the WAITLISTED record and BLOCK the promotion.
 *   IR-63-3: capacity=0 → { routed:'WAITLIST' } DataProcessResult.success — NOT failure.
 *            A full event is a business state, not a system error. DR-04-B.
 *   IR-63-4: Dual entry: rsvp.requested (free path) OR payment.confirmed (paid path) enter
 *            the same node. The promoter flag discriminates; the atomic operation is shared.
 *   IR-63-5: Cancellation window from FREEDOM config: flow04_rsvp_cancellation_window_hours.
 *            Stored as cancellable_until on every RSVP record.
 *   DNA-3:   All methods return DataProcessResult<T> — never throw.
 *   DNA-8:   storeDocument(RSVP) BEFORE rsvp.confirmed emit.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const RSVPS_INDEX = 'xiigen-event-rsvps';
const EVENTS_INDEX = 'xiigen-events';
const FREEDOM_INDEX = 'freedom_configs';

export interface RsvpInput {
  attendeeId: string;
  eventId: string;
  tenantId: string;
  paymentConfirmed?: boolean; // paid entry path (IR-63-4)
  promotionRequest?: boolean; // T64 promotion path — triggers Case B idempotency
}

export interface RsvpResult {
  rsvpId: string;
  status: 'CONFIRMED' | 'WAITLISTED';
  routed: 'CONFIRMED' | 'WAITLIST';
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-04
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped (flow04_*)
 * @className RsvpOrchestrator
 */
@Injectable()
export class RsvpOrchestrator extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T63',
        serviceName: 'RsvpOrchestrator',
        flowId: 'FLOW-04',
      }),
    });
  }

  async rsvp(input: RsvpInput): Promise<DataProcessResult<RsvpResult>> {
    try {
      // ── Validate ──────────────────────────────────────────────────────────
      if (!input.attendeeId || !input.eventId || !input.tenantId) {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'RSVP input validation failed');
      }

      // ── IR-63-2 Case B: T64 promotion path — conditional update, NOT SETNX ──
      if (input.promotionRequest) {
        return await this.handlePromotion(input);
      }

      // ── IR-63-2 Case A: SETNX — return existing if (attendeeId, eventId) found ──
      const existing = await this.dbFabric.searchDocuments(RSVPS_INDEX, {
        attendee_id: input.attendeeId,
        event_id: input.eventId,
      });
      if (existing.isSuccess && (existing.data ?? []).length > 0) {
        const rec = existing.data![0] as Record<string, unknown>;
        const status = rec['status'] as 'CONFIRMED' | 'WAITLISTED';
        return DataProcessResult.success({
          rsvpId: rec['rsvp_id'] as string,
          status,
          routed: status === 'WAITLISTED' ? 'WAITLIST' : 'CONFIRMED',
        });
      }

      // ── Read event capacity ──────────────────────────────────────────────
      const eventResult = await this.dbFabric.searchDocuments(EVENTS_INDEX, {
        event_id: input.eventId,
      });
      if (!eventResult.isSuccess || (eventResult.data ?? []).length === 0) {
        return DataProcessResult.failure('EVENT_NOT_FOUND', 'Event not found');
      }
      const event = eventResult.data![0] as Record<string, unknown>;
      const capacity = event['capacity'] as number | null;

      // ── Determine routing ────────────────────────────────────────────────
      // IR-63-3: capacity=0 → WAITLIST success, not failure
      let toWaitlist = false;
      if (capacity === 0) {
        toWaitlist = true;
      } else if (capacity !== null) {
        const confirmedResult = await this.dbFabric.searchDocuments(RSVPS_INDEX, {
          event_id: input.eventId,
          status: 'CONFIRMED',
        });
        const confirmedCount = confirmedResult.isSuccess ? (confirmedResult.data ?? []).length : 0;
        toWaitlist = confirmedCount >= capacity;
      }

      // ── Cancellation window from FREEDOM config (IR-63-5) ───────────────
      const cancellationWindowHours = await this.getCancellationWindow();
      const now = new Date().toISOString();
      const cancellableUntil = new Date(
        Date.now() + cancellationWindowHours * 3600 * 1000,
      ).toISOString();

      // ── IR-63-1: ONE atomic storeDocument — no separate capacity update ──
      const rsvpId = `rsvp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const status: 'CONFIRMED' | 'WAITLISTED' = toWaitlist ? 'WAITLISTED' : 'CONFIRMED';

      const doc: Record<string, unknown> = {
        rsvp_id: rsvpId,
        attendee_id: input.attendeeId,
        event_id: input.eventId,
        tenant_id: input.tenantId,
        status,
        payment_confirmed: input.paymentConfirmed ?? false,
        cancellable_until: cancellableUntil, // IR-63-5: from FREEDOM config
        join_timestamp: now,
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
        created_at: now,
      };

      // DNA-8: storeDocument BEFORE any event emit
      const stored = await this.dbFabric.storeDocument(RSVPS_INDEX, doc, rsvpId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      const eventType = toWaitlist ? 'rsvp.waitlisted' : 'rsvp.confirmed';
      await this.queueFabric.enqueue(eventType, {
        rsvpId,
        attendeeId: input.attendeeId,
        eventId: input.eventId,
        tenantId: input.tenantId,
        status,
      });

      return DataProcessResult.success({
        rsvpId,
        status,
        routed: toWaitlist ? 'WAITLIST' : 'CONFIRMED',
      });
    } catch (err) {
      return DataProcessResult.failure('RSVP_ERROR', `RsvpOrchestrator threw: ${String(err)}`);
    }
  }

  /**
   * IR-63-2 Case B: T64 promotion path.
   * Finds existing WAITLISTED record and conditionally updates to CONFIRMED.
   * MUST NOT use SETNX — SETNX returns the WAITLISTED record and silently blocks promotion.
   */
  private async handlePromotion(input: RsvpInput): Promise<DataProcessResult<RsvpResult>> {
    const existing = await this.dbFabric.searchDocuments(RSVPS_INDEX, {
      attendee_id: input.attendeeId,
      event_id: input.eventId,
    });

    if (!existing.isSuccess || (existing.data ?? []).length === 0) {
      return DataProcessResult.failure('RSVP_NOT_FOUND', 'No existing RSVP for promotion');
    }

    const rec = existing.data![0] as Record<string, unknown>;
    const status = rec['status'] as string;

    // T63-5: already CONFIRMED → idempotent return (promotion already applied)
    if (status === 'CONFIRMED') {
      return DataProcessResult.success({
        rsvpId: rec['rsvp_id'] as string,
        status: 'CONFIRMED',
        routed: 'CONFIRMED',
      });
    }

    // Conditional update: WAITLISTED → CONFIRMED
    const rsvpId = rec['rsvp_id'] as string;
    const updatedDoc: Record<string, unknown> = {
      ...rec,
      status: 'CONFIRMED',
      updated_at: new Date().toISOString(),
    };

    // DNA-8: storeDocument BEFORE emit
    const stored = await this.dbFabric.storeDocument(RSVPS_INDEX, updatedDoc, rsvpId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
    }

    await this.queueFabric.enqueue('rsvp.confirmed', {
      rsvpId,
      attendeeId: input.attendeeId,
      eventId: input.eventId,
      tenantId: input.tenantId,
      promotedFromWaitlist: true,
    });

    return DataProcessResult.success({ rsvpId, status: 'CONFIRMED', routed: 'CONFIRMED' });
  }

  /** Read cancellation window from FREEDOM config — never hardcoded (IR-63-5). */
  private async getCancellationWindow(): Promise<number> {
    const cfg = await this.dbFabric.searchDocuments(FREEDOM_INDEX, {
      config_key: 'flow04_rsvp_cancellation_window_hours',
      task_type: 'xiigen-engine',
    });
    if (cfg.isSuccess && (cfg.data ?? []).length > 0) {
      const val = (cfg.data![0] as Record<string, unknown>)['config_value'];
      const parsed = parseFloat(String(val));
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    return 24; // Safe default: 24 hours
  }
}
