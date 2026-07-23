/**
 * CancellationProcessor (T67) — FLOW-04 Phase 2E
 * Single responsibility: cancel an RSVP within its configured cancellation window,
 * then trigger waitlist promotion to fill any freed CONFIRMED slot.
 *
 * Iron rules:
 *   IR-67-1: Cancellation window enforced — if cancellable_until has passed,
 *            return DataProcessResult.success({ cancelled: false, reason: 'WINDOW_CLOSED' }).
 *            An expired window is a business state, not a system error.
 *   IR-67-2: Already-cancelled RSVP → idempotent success({ cancelled: false, reason: 'ALREADY_CANCELLED' }).
 *   IR-67-3: CONFIRMED cancellation frees a slot → call WaitlistManager.promoteNext() after emit.
 *            WAITLISTED cancellation removes from queue only — no slot freed, no promotion.
 *   IR-67-4: ONE storeDocument (status update CONFIRMED/WAITLISTED → CANCELLED).
 *            No separate capacity write — capacity is always derived from confirmed-RSVP count.
 *   DNA-3:   All methods return DataProcessResult<T> — never throw.
 *   DNA-8:   storeDocument(cancelled RSVP) BEFORE RsvpCancelled emit.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { WaitlistManager } from './waitlist-manager.service';

const RSVPS_INDEX = 'xiigen-event-rsvps';

export interface CancelRsvpInput {
  attendeeId: string;
  eventId: string;
  tenantId: string;
}

export interface CancelRsvpResult {
  cancelled: boolean;
  rsvpId?: string;
  reason?: 'WINDOW_CLOSED' | 'ALREADY_CANCELLED';
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-04
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped (flow04_*)
 * @className CancellationProcessor
 */
@Injectable()
export class CancellationProcessor extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly waitlistManager: WaitlistManager,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T67',
        serviceName: 'CancellationProcessor',
        flowId: 'FLOW-04',
      }),
    });
  }

  async cancel(input: CancelRsvpInput): Promise<DataProcessResult<CancelRsvpResult>> {
    try {
      // ── Validate ──────────────────────────────────────────────────────────
      if (!input.attendeeId || !input.eventId || !input.tenantId) {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'Cancel input validation failed');
      }

      // ── Find RSVP ─────────────────────────────────────────────────────────
      const rsvpResult = await this.dbFabric.searchDocuments(RSVPS_INDEX, {
        attendee_id: input.attendeeId,
        event_id: input.eventId,
      });

      if (!rsvpResult.isSuccess || (rsvpResult.data ?? []).length === 0) {
        return DataProcessResult.failure(
          'RSVP_NOT_FOUND',
          'No RSVP found for this attendee and event',
        );
      }

      const rsvp = rsvpResult.data![0] as Record<string, unknown>;
      const rsvpId = rsvp['rsvp_id'] as string;
      const status = rsvp['status'] as string;

      // ── IR-67-2: Idempotency — already cancelled ───────────────────────────
      if (status === 'CANCELLED') {
        return DataProcessResult.success({ cancelled: false, rsvpId, reason: 'ALREADY_CANCELLED' });
      }

      // ── IR-67-1: Cancellation window check ────────────────────────────────
      const cancellableUntil = rsvp['cancellable_until'] as string | undefined;
      if (cancellableUntil && new Date(cancellableUntil).getTime() < Date.now()) {
        return DataProcessResult.success({ cancelled: false, rsvpId, reason: 'WINDOW_CLOSED' });
      }

      // ── IR-67-4: ONE storeDocument — status → CANCELLED ───────────────────
      const wasConfirmed = status === 'CONFIRMED';
      const updatedDoc: Record<string, unknown> = {
        ...rsvp,
        status: 'CANCELLED',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // DNA-8: store BEFORE emit
      const stored = await this.dbFabric.storeDocument(RSVPS_INDEX, updatedDoc, rsvpId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      await this.queueFabric.enqueue('RsvpCancelled', {
        rsvpId,
        attendeeId: input.attendeeId,
        eventId: input.eventId,
        tenantId: input.tenantId,
        wasConfirmed,
      });

      // ── IR-67-3: CONFIRMED slot freed → promote next from waitlist ─────────
      if (wasConfirmed) {
        await this.waitlistManager.promoteNext({
          eventId: input.eventId,
          tenantId: input.tenantId,
        });
      }

      return DataProcessResult.success({ cancelled: true, rsvpId });
    } catch (err) {
      return DataProcessResult.failure(
        'CANCELLATION_ERROR',
        `CancellationProcessor threw: ${String(err)}`,
      );
    }
  }
}
