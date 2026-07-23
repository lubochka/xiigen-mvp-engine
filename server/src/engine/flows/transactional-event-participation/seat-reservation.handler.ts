// T99 SeatReservationHandler [ORCHESTRATION]
// @connectionType FLOW_SCOPED
// @flowId FLOW-09
//
//
// SEAT_BEFORE_PAYMENT pattern (CF-09-1):
//   Seat TTL hold MUST happen BEFORE payment is initiated.
//   Natural order pay-then-seat creates double-booking race.
//   SILENT_FAILURE: passes unit tests, fails under concurrent load on last ticket.
//
// Iron rules:
//   reserveSeat() BEFORE enqueuePayment() (CF-09-1 — line-index enforced)
//   T113 FraudDetectorHandler called inline (FAIL_OPEN pattern)
//   DNA-8: storeDocument BEFORE enqueue
//   knowledgeScope: 'PRIVATE'
//   tenantId from ALS — never from request
//   FREEDOM: flow09_seat_ttl_seconds

import { DataProcessResult } from '../../../kernel/data-process-result';
import type { IFreedomConfigService } from '../../../freedom/freedom-config.interface';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

interface ICapacityLockService {
  reserveSeat(params: Record<string, unknown>): Promise<{
    isSuccess: boolean;
    errorCode?: string;
    errorMessage?: string;
    data?: Record<string, unknown>;
  }>;
}

interface IFraudDetectorService {
  check(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
}

export interface SeatReservationInput {
  eventId: string;
  userId: string;
  purchaseId: string;
  ticketTier: string;
  purchaseType: 'INDIVIDUAL' | 'GROUP';
}

export interface SeatReservationResult {
  purchaseId: string;
  holdId: string;
  status: 'PAYMENT_PENDING' | 'WAITLISTED';
  ttlSeconds: number;
}

export class SeatReservationHandler {
  constructor(
    /** F274: ICapacityLockService — seat TTL hold via DATABASE FABRIC */

    private readonly capacityLock: ICapacityLockService,
    /** DATABASE FABRIC: storeDocument */
    private readonly db: IDatabaseService,
    /** QUEUE FABRIC: enqueue payment processing */
    private readonly queue: IQueueService,
    /** T113 FraudDetectorHandler — inline (FAIL_OPEN pattern) */

    private readonly fraudDetector: IFraudDetectorService,
    /** FREEDOM config service */

    private readonly freedom: IFreedomConfigService,
  ) {}

  async reserveSeat(
    input: SeatReservationInput,
  ): Promise<DataProcessResult<SeatReservationResult>> {
    // Read TTL from FREEDOM config — never hardcode
    const ttlConfig = await this.freedom.get('flow09_seat_ttl_seconds');
    const ttlSeconds: number =
      typeof ttlConfig?.['flow09_seat_ttl_seconds'] === 'number'
        ? (ttlConfig['flow09_seat_ttl_seconds'] as number)
        : 300;

    // Inline fraud check — FAIL_OPEN: service down = allow purchase + audit event
    const fraudResult = await this.fraudDetector.check({
      userId: input.userId,
      eventId: input.eventId,
      purchaseId: input.purchaseId,
    });
    if (fraudResult.isSuccess && fraudResult.data?.['fraudDetected'] === true) {
      return DataProcessResult.failure('FRAUD_DETECTED', 'Purchase blocked by fraud detection');
    }

    // CF-09-1: SEAT_BEFORE_PAYMENT — reserve seat BEFORE enqueuePayment
    const holdResult = await this.capacityLock.reserveSeat({
      eventId: input.eventId,
      userId: input.userId,
      ticketTier: input.ticketTier,
      ttlSeconds,
    });

    if (!holdResult.isSuccess) {
      // Capacity full — route to waitlist
      // DNA-8: storeDocument BEFORE enqueue
      await this.db.storeDocument(
        'ticket-purchases',
        {
          purchaseId: input.purchaseId,
          userId: input.userId,
          eventId: input.eventId,
          ticketTier: input.ticketTier,
          status: 'WAITLISTED',
          purchaseType: input.purchaseType,
          createdAt: new Date().toISOString(),
          connectionType: 'FLOW_SCOPED',
          knowledgeScope: 'PRIVATE',
        },
        input.purchaseId,
      );
      await this.queue.enqueue('waitlist.join.requested', {
        purchaseId: input.purchaseId,
        userId: input.userId,
        eventId: input.eventId,
      });
      return DataProcessResult.success({
        purchaseId: input.purchaseId,
        holdId: '',
        status: 'WAITLISTED',
        ttlSeconds: 0,
      });
    }

    const holdId = holdResult.data?.['holdId'] as string;

    // DNA-8: storeDocument BEFORE enqueuePayment (outbox pattern)
    const storeResult = await this.db.storeDocument(
      'ticket-purchases',
      {
        purchaseId: input.purchaseId,
        userId: input.userId,
        eventId: input.eventId,
        ticketTier: input.ticketTier,
        status: 'PAYMENT_PENDING',
        holdId,
        purchaseType: input.purchaseType,
        ttlSeconds,
        createdAt: new Date().toISOString(),
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      input.purchaseId,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store purchase: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    // CF-09-1: payment initiated AFTER seat hold confirmed
    await this.queue.enqueue('payment.process.requested', {
      purchaseId: input.purchaseId,
      holdId,
      userId: input.userId,
      eventId: input.eventId,
      ticketTier: input.ticketTier,
    });

    return DataProcessResult.success({
      purchaseId: input.purchaseId,
      holdId,
      status: 'PAYMENT_PENDING',
      ttlSeconds,
    });
  }
}
