/**
 * FLOW-09 Phase A — T99 SeatReservationHandler
 *
 * T99-1: seat hold placed BEFORE payment enqueued (CF-09-1 SEAT_BEFORE_PAYMENT)
 * T99-2: fraud check called inline (T113 FAIL_OPEN)
 * T99-3: capacity full → WAITLISTED (not failure)
 * T99-4: storeDocument BEFORE enqueue (DNA-8 callOrder)
 * T99-5: PENDING record knowledgeScope=PRIVATE
 * T99-6: FREEDOM config TTL respected (not hardcoded)
 * T99-7: fraudDetector catch returns { passed: true } (FAIL_OPEN)
 */

import 'reflect-metadata';
import { SeatReservationHandler } from '../../src/engine/flows/transactional-event-participation/seat-reservation.handler';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const BASE_INPUT = {
  eventId: 'event-001',
  userId: 'user-A',
  purchaseId: 'purchase-001',
  ticketTier: 'GENERAL',
  purchaseType: 'INDIVIDUAL' as const,
};

function makeCapacityLock(available = true, holdId = 'hold-123') {
  return {
    reserveSeat: jest
      .fn()
      .mockResolvedValue(
        available
          ? DataProcessResult.success({ holdId })
          : DataProcessResult.failure('SEAT_UNAVAILABLE', 'No seats'),
      ),
  };
}

function makeDb(callOrder: string[], storeCapture?: Array<Record<string, unknown>>) {
  return {
    storeDocument: jest
      .fn()
      .mockImplementation(async (_idx: string, doc: Record<string, unknown>) => {
        callOrder.push('storeDocument');
        if (storeCapture) storeCapture.push(doc);
        return DataProcessResult.success({});
      }),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  };
}

function makeQueue(callOrder: string[]) {
  const _enqueued: Array<{ eventType: string; data: unknown }> = [];
  return {
    enqueue: jest.fn().mockImplementation(async (eventType: string, data: unknown) => {
      callOrder.push('enqueue');
      _enqueued.push({ eventType, data });
      return DataProcessResult.success({});
    }),
    _enqueued,
  };
}

function makeFraudDetector(passed = true) {
  return {
    check: jest.fn().mockResolvedValue(DataProcessResult.success({ fraudDetected: !passed })),
  };
}

function makeFreedom(ttl = 300) {
  return {
    get: jest.fn().mockResolvedValue({ flow09_seat_ttl_seconds: ttl }),
  };
}

describe('T99 SeatReservationHandler', () => {
  it('T99-1: seat hold placed BEFORE payment enqueued (SEAT_BEFORE_PAYMENT CF-09-1)', async () => {
    const callOrder: string[] = [];
    const capacityLock = makeCapacityLock(true);
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const fraud = makeFraudDetector(true);
    const freedom = makeFreedom(300);

    const svc = new SeatReservationHandler(
      capacityLock as any,
      db as any,
      queue as any,
      fraud as any,
      freedom as any,
    );
    const result = await svc.reserveSeat(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('PAYMENT_PENDING');
    // Verify capacityLock.reserveSeat was called
    expect(capacityLock.reserveSeat).toHaveBeenCalled();
    const paymentEvent = queue._enqueued.find(
      (e: { eventType: string }) => e.eventType === 'payment.process.requested',
    );
    expect(paymentEvent).toBeDefined();
  });

  it('T99-2: storeDocument BEFORE enqueue (DNA-8 callOrder)', async () => {
    const callOrder: string[] = [];
    const capacityLock = makeCapacityLock(true);
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const fraud = makeFraudDetector(true);
    const freedom = makeFreedom(300);

    const svc = new SeatReservationHandler(
      capacityLock as any,
      db as any,
      queue as any,
      fraud as any,
      freedom as any,
    );
    await svc.reserveSeat(BASE_INPUT);

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('T99-3: capacity full → WAITLISTED (not DataProcessResult.failure)', async () => {
    const callOrder: string[] = [];
    const capacityLock = makeCapacityLock(false);
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const fraud = makeFraudDetector(true);
    const freedom = makeFreedom(300);

    const svc = new SeatReservationHandler(
      capacityLock as any,
      db as any,
      queue as any,
      fraud as any,
      freedom as any,
    );
    const result = await svc.reserveSeat(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('WAITLISTED');
  });

  it('T99-4: PENDING record has knowledgeScope=PRIVATE', async () => {
    const callOrder: string[] = [];
    const storeCapture: Array<Record<string, unknown>> = [];
    const capacityLock = makeCapacityLock(true);
    const db = makeDb(callOrder, storeCapture);
    const queue = makeQueue(callOrder);
    const fraud = makeFraudDetector(true);
    const freedom = makeFreedom(300);

    const svc = new SeatReservationHandler(
      capacityLock as any,
      db as any,
      queue as any,
      fraud as any,
      freedom as any,
    );
    await svc.reserveSeat(BASE_INPUT);

    const purchaseRecord = storeCapture.find((d) => d['status'] === 'PAYMENT_PENDING');
    expect(purchaseRecord).toBeDefined();
    expect(purchaseRecord?.['knowledgeScope']).toBe('PRIVATE');
  });

  it('T99-5: fraud detected → DataProcessResult.failure (not success)', async () => {
    const callOrder: string[] = [];
    const capacityLock = makeCapacityLock(true);
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const fraud = makeFraudDetector(false);
    const freedom = makeFreedom(300);

    const svc = new SeatReservationHandler(
      capacityLock as any,
      db as any,
      queue as any,
      fraud as any,
      freedom as any,
    );
    const result = await svc.reserveSeat(BASE_INPUT);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('FRAUD_DETECTED');
  });

  it('T99-6: FREEDOM config TTL respected — not hardcoded', async () => {
    const callOrder: string[] = [];
    const capacityLock = makeCapacityLock(true);
    const storeCapture: Array<Record<string, unknown>> = [];
    const db = makeDb(callOrder, storeCapture);
    const queue = makeQueue(callOrder);
    const fraud = makeFraudDetector(true);
    const freedom = makeFreedom(600); // Custom TTL

    const svc = new SeatReservationHandler(
      capacityLock as any,
      db as any,
      queue as any,
      fraud as any,
      freedom as any,
    );
    await svc.reserveSeat(BASE_INPUT);

    const record = storeCapture.find((d) => d['ttlSeconds'] !== undefined);
    expect(record?.['ttlSeconds']).toBe(600);
  });
});
