/**
 * CheckInProcessor (T65) — FLOW-04 Phase 2C
 * Single responsibility: validate and record attendee check-in at an event.
 *
 * Iron rules:
 *   IR-65-1: Only CONFIRMED RSVPs may check in.
 *            WAITLISTED / absent RSVP → DataProcessResult.success({ checkedIn: false, reason }).
 *            A non-confirmed attendee presenting at the door is a business state, not a system error.
 *   IR-65-2: Idempotent by (attendeeId, eventId) — duplicate check-in returns existing record,
 *            no new storeDocument, no new event emit.
 *   IR-65-3: ONE storeDocument per check-in — the check-in record carries rsvp_id, checked_in_at,
 *            tenant_id, connection_type, knowledge_scope.
 *   DNA-3:   All methods return DataProcessResult<T> — never throw.
 *   DNA-8:   storeDocument(check-in) BEFORE AttendeeCheckedIn emit.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const RSVPS_INDEX = 'xiigen-event-rsvps';
const CHECKINS_INDEX = 'xiigen-event-checkins';

export interface CheckInInput {
  attendeeId: string;
  eventId: string;
  tenantId: string;
}

export interface CheckInResult {
  checkedIn: boolean;
  checkinId?: string;
  reason?: 'NOT_CONFIRMED' | 'NO_RSVP' | 'ALREADY_CHECKED_IN';
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-04
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped
 * @className CheckInProcessor
 */
@Injectable()
export class CheckInProcessor extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T65',
        serviceName: 'CheckInProcessor',
        flowId: 'FLOW-04',
      }),
    });
  }

  async checkIn(input: CheckInInput): Promise<DataProcessResult<CheckInResult>> {
    try {
      // ── Validate ──────────────────────────────────────────────────────────
      if (!input.attendeeId || !input.eventId || !input.tenantId) {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'CheckIn input validation failed');
      }

      // ── IR-65-2: Idempotency — return existing check-in if found ──────────
      const existingCheckin = await this.dbFabric.searchDocuments(CHECKINS_INDEX, {
        attendee_id: input.attendeeId,
        event_id: input.eventId,
      });
      if (existingCheckin.isSuccess && (existingCheckin.data ?? []).length > 0) {
        const rec = existingCheckin.data![0] as Record<string, unknown>;
        return DataProcessResult.success({
          checkedIn: true,
          checkinId: rec['checkin_id'] as string,
          reason: 'ALREADY_CHECKED_IN',
        });
      }

      // ── IR-65-1: Validate RSVP status ─────────────────────────────────────
      const rsvpResult = await this.dbFabric.searchDocuments(RSVPS_INDEX, {
        attendee_id: input.attendeeId,
        event_id: input.eventId,
      });

      if (!rsvpResult.isSuccess || (rsvpResult.data ?? []).length === 0) {
        // No RSVP on file — business state, not a system error
        return DataProcessResult.success({ checkedIn: false, reason: 'NO_RSVP' });
      }

      const rsvp = rsvpResult.data![0] as Record<string, unknown>;
      const status = rsvp['status'] as string;

      if (status !== 'CONFIRMED') {
        // WAITLISTED or other non-confirmed status — business state
        return DataProcessResult.success({ checkedIn: false, reason: 'NOT_CONFIRMED' });
      }

      // ── IR-65-3: ONE atomic storeDocument ────────────────────────────────
      const checkinId = `chk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const now = new Date().toISOString();

      const doc: Record<string, unknown> = {
        checkin_id: checkinId,
        attendee_id: input.attendeeId,
        event_id: input.eventId,
        rsvp_id: rsvp['rsvp_id'] as string,
        tenant_id: input.tenantId,
        checked_in_at: now,
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
        created_at: now,
      };

      // DNA-8: storeDocument BEFORE emit
      const stored = await this.dbFabric.storeDocument(CHECKINS_INDEX, doc, checkinId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      await this.queueFabric.enqueue('AttendeeCheckedIn', {
        checkinId,
        attendeeId: input.attendeeId,
        eventId: input.eventId,
        tenantId: input.tenantId,
        rsvpId: rsvp['rsvp_id'] as string,
      });

      return DataProcessResult.success({ checkedIn: true, checkinId });
    } catch (err) {
      return DataProcessResult.failure('CHECKIN_ERROR', `CheckInProcessor threw: ${String(err)}`);
    }
  }
}
