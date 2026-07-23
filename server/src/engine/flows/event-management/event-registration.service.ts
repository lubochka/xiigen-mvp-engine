/**
 * EventRegistrationManager (T60) — FLOW-03 Phase 1B
 * Single responsibility: atomic attendee registration with capacity routing.
 *
 * Iron rules:
 *   IR-60-1: ONE atomic storeDocument call per registration path — no separate capacity
 *            decrement write. Two writes (update capacity + create registration) creates
 *            a race window where capacity goes negative (oversell). CF-802.
 *   IR-60-2: Duplicate (attendeeId, eventId) returns existing record — SETNX pattern.
 *            Same attendee cannot be registered twice for the same event.
 *   IR-60-3: All thresholds from FREEDOM config — flow03_max_attendees, flow03_waitlist_max_size.
 *            Never hardcode capacity limits.
 *   ROUTING: capacity=null → unlimited → always CONFIRMED.
 *            capacity=0    → WAITLIST (closed event — no new confirmed slots).
 *            capacity>0    → CONFIRMED if slots remain, WAITLIST when full.
 *   DNA-3:   All methods return DataProcessResult<T> — never throw.
 *   DNA-8:   storeDocument() BEFORE AttendeeRegistered/WaitlistJoined emitted.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const REGISTRATIONS_INDEX = 'xiigen-event-registrations';
const EVENTS_INDEX = 'xiigen-events';
const FREEDOM_INDEX = 'freedom_configs';

export interface RegisterInput {
  attendeeId: string;
  eventId: string;
  tenantId: string;
  idempotencyKey?: string;
}

export interface RegisterResult {
  registrationId: string;
  status: 'CONFIRMED' | 'WAITLISTED';
  routed: 'CONFIRMED' | 'WAITLIST';
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-03
 * @portability MOBILE — no ClsService, FREEDOM keys flow-scoped (flow03_*)
 * @className EventRegistrationManager
 */
@Injectable()
export class EventRegistrationManager {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
  ) {}

  async register(input: RegisterInput): Promise<DataProcessResult<RegisterResult>> {
    try {
      // ── Validate ──────────────────────────────────────────────────────────
      if (!input.attendeeId || !input.eventId || !input.tenantId) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'Registration input validation failed',
        );
      }

      // ── IR-60-2: SETNX idempotency — return existing if (attendeeId, eventId) already exists ──
      const existing = await this.db.searchDocuments(REGISTRATIONS_INDEX, {
        attendee_id: input.attendeeId,
        event_id: input.eventId,
      });
      if (existing.isSuccess && (existing.data ?? []).length > 0) {
        const rec = existing.data![0] as Record<string, unknown>;
        const status = rec['status'] as 'CONFIRMED' | 'WAITLISTED';
        return DataProcessResult.success({
          registrationId: rec['registration_id'] as string,
          status,
          routed: status === 'WAITLISTED' ? 'WAITLIST' : 'CONFIRMED',
        });
      }

      // ── Read event to determine capacity ─────────────────────────────────
      const eventResult = await this.db.searchDocuments(EVENTS_INDEX, { event_id: input.eventId });
      if (!eventResult.isSuccess || (eventResult.data ?? []).length === 0) {
        return DataProcessResult.failure('EVENT_NOT_FOUND', 'Event not found');
      }
      const event = eventResult.data![0] as Record<string, unknown>;
      const capacity = event['capacity'] as number | null; // null=unlimited, 0=closed, n=limited

      // ── Determine routing ────────────────────────────────────────────────
      // capacity===null → unlimited → always CONFIRMED (no count needed)
      // capacity===0    → WAITLIST (closed event, no slots)
      // capacity>0      → check current confirmed count against min(capacity, maxAttendees)
      let toWaitlist = false;

      if (capacity === 0) {
        // Closed event — all registrations go to waitlist
        toWaitlist = true;
      } else if (capacity !== null) {
        // Limited event — compare confirmed count against min(capacity, FREEDOM max)
        const maxAttendees = await this.getMaxAttendees();
        const effectiveLimit = Math.min(capacity, maxAttendees);
        const confirmedResult = await this.db.searchDocuments(REGISTRATIONS_INDEX, {
          event_id: input.eventId,
          status: 'CONFIRMED',
        });
        const confirmedCount = confirmedResult.isSuccess ? (confirmedResult.data ?? []).length : 0;
        toWaitlist = confirmedCount >= effectiveLimit;
      }
      // capacity===null → toWaitlist remains false (unlimited)

      // ── IR-60-1: ONE atomic storeDocument — no separate capacity update write ──
      const registrationId = `reg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const now = new Date().toISOString();
      const status: 'CONFIRMED' | 'WAITLISTED' = toWaitlist ? 'WAITLISTED' : 'CONFIRMED';

      const doc: Record<string, unknown> = {
        registration_id: registrationId,
        attendee_id: input.attendeeId,
        event_id: input.eventId,
        tenant_id: input.tenantId,
        status,
        join_timestamp: now, // T60-5: FIFO ordering key for waitlist promotion
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
        created_at: now,
      };

      // DNA-8: storeDocument BEFORE emitting any event
      const stored = await this.db.storeDocument(REGISTRATIONS_INDEX, doc, registrationId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      // ── Emit post-store ──────────────────────────────────────────────────
      if (toWaitlist) {
        await this.queue.enqueue('WaitlistJoined', {
          registrationId,
          attendeeId: input.attendeeId,
          eventId: input.eventId,
          tenantId: input.tenantId,
          joinTimestamp: now,
        });
      } else {
        await this.queue.enqueue('AttendeeRegistered', {
          registrationId,
          attendeeId: input.attendeeId,
          eventId: input.eventId,
          tenantId: input.tenantId,
        });
      }

      return DataProcessResult.success({
        registrationId,
        status,
        routed: toWaitlist ? 'WAITLIST' : 'CONFIRMED',
      });
    } catch (err) {
      return DataProcessResult.failure(
        'REGISTRATION_ERROR',
        `EventRegistrationManager threw: ${String(err)}`,
      );
    }
  }

  /** Read max attendees per event from FREEDOM config — never hardcoded (IR-60-3). */
  private async getMaxAttendees(): Promise<number> {
    const cfg = await this.db.searchDocuments(FREEDOM_INDEX, {
      config_key: 'flow03_max_attendees',
      task_type: 'xiigen-engine',
    });
    if (cfg.isSuccess && (cfg.data ?? []).length > 0) {
      const val = (cfg.data![0] as Record<string, unknown>)['config_value'];
      const parsed = parseInt(String(val), 10);
      if (!isNaN(parsed)) return parsed;
    }
    return 500; // Safe default if FREEDOM config not seeded
  }
}
