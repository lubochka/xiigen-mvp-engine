// T107 BookingConfirmationHandler [PROCESSING]
// @connectionType FLOW_SCOPED
// @flowId FLOW-09
//
//
// DC-06 positive assertion: PENDING is a VALID state (not a failure).
// Waitlist entries are PENDING — WaitlistJoined sets status PENDING.
// PENDING records are PRIVATE.
//
// Iron rules:
//   PENDING is a valid booking state — CONFIRMED or PENDING are both valid
//   PENDING records stored with knowledgeScope: 'PRIVATE'
//   DNA-8: storeDocument BEFORE BookingConfirmed emit
//   Idempotent by purchaseId

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface BookingConfirmationInput {
  purchaseId: string;
  userId: string;
  eventId: string;
  ticketId: string;
  confirmationType: 'PURCHASE_CONFIRMED' | 'WAITLIST_PENDING';
}

export interface BookingConfirmationResult {
  bookingId: string;
  purchaseId: string;
  ticketId: string;
  // DC-06: PENDING is a VALID state (not a failure state)
  status: 'CONFIRMED' | 'PENDING';
  confirmedAt: string;
}

export class BookingConfirmationHandler {
  constructor(
    /** DATABASE FABRIC: storeDocument + searchDocuments */
    private readonly db: IDatabaseService,
    /** QUEUE FABRIC: BookingConfirmed CloudEvent */
    private readonly queue: IQueueService,
  ) {}

  async confirmBooking(
    input: BookingConfirmationInput,
  ): Promise<DataProcessResult<BookingConfirmationResult>> {
    const bookingId = `booking-${input.purchaseId}`;

    // Idempotency
    const existing = await this.db.searchDocuments('booking-confirmations', { bookingId });
    if (existing.isSuccess && Array.isArray(existing.data) && existing.data.length > 0) {
      const rec = existing.data[0] as Record<string, unknown>;
      return DataProcessResult.success({
        bookingId,
        purchaseId: input.purchaseId,
        ticketId: input.ticketId,
        // DC-06: PENDING is valid — not a failure
        status: rec['status'] as 'CONFIRMED' | 'PENDING',
        confirmedAt: rec['confirmedAt'] as string,
      });
    }

    // DC-06: PENDING state is valid for waitlisted bookings (not a failure state)
    const status: 'CONFIRMED' | 'PENDING' =
      input.confirmationType === 'WAITLIST_PENDING' ? 'PENDING' : 'CONFIRMED';

    const confirmedAt = new Date().toISOString();

    // DNA-8: storeDocument BEFORE BookingConfirmed
    // DC-06: PENDING records are PRIVATE (knowledgeScope)
    const storeResult = await this.db.storeDocument(
      'booking-confirmations',
      {
        bookingId,
        purchaseId: input.purchaseId,
        userId: input.userId,
        eventId: input.eventId,
        ticketId: input.ticketId,
        // DC-06 positive assertion: PENDING is VALID, PENDING records are PRIVATE
        status,
        confirmedAt,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      bookingId,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store booking: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    await this.queue.enqueue('booking.confirmed', {
      bookingId,
      purchaseId: input.purchaseId,
      userId: input.userId,
      eventId: input.eventId,
      ticketId: input.ticketId,
      status,
      confirmedAt,
    });

    return DataProcessResult.success({
      bookingId,
      purchaseId: input.purchaseId,
      ticketId: input.ticketId,
      status,
      confirmedAt,
    });
  }
}
