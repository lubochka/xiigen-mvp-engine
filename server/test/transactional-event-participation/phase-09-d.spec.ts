/**
 * FLOW-09 Phase D — T107 BookingConfirmationHandler + T118 RegistrationAnalyticsHandler
 *
 * T107-1: PENDING is a valid status (DC-06 positive assertion)
 * T107-2: CONFIRMED is a valid status
 * T107-3: PENDING records stored with knowledgeScope=PRIVATE
 * T107-4: storeDocument BEFORE BookingConfirmed (DNA-8)
 * T107-5: idempotent — duplicate returns existing
 *
 * T118-1: analytics success → returns DataProcessResult.success (OBSERVABILITY)
 * T118-2: analytics DB error → returns success (ANALYTICS_SKIPPED, not failure)
 * T118-3: analytics never throws — try/catch wraps entire body
 */

import 'reflect-metadata';
import { BookingConfirmationHandler } from '../../src/engine/flows/transactional-event-participation/booking-confirmation.handler';
import { RegistrationAnalyticsHandler } from '../../src/engine/flows/transactional-event-participation/registration-analytics.handler';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── T107 tests ────────────────────────────────────────────────────────────────

function makeBookingDb(
  callOrder: string[],
  storeCapture?: Array<Record<string, unknown>>,
  existing?: Record<string, unknown>,
) {
  return {
    storeDocument: jest
      .fn()
      .mockImplementation(async (_idx: string, doc: Record<string, unknown>) => {
        callOrder.push('storeDocument');
        if (storeCapture) storeCapture.push(doc);
        return DataProcessResult.success({});
      }),
    searchDocuments: jest
      .fn()
      .mockResolvedValue(
        existing ? DataProcessResult.success([existing]) : DataProcessResult.success([]),
      ),
  };
}

function makeBookingQueue(callOrder: string[]) {
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

const WAITLIST_INPUT = {
  purchaseId: 'purchase-001',
  userId: 'user-A',
  eventId: 'event-001',
  ticketId: 'ticket-001',
  confirmationType: 'WAITLIST_PENDING' as const,
};

const CONFIRMED_INPUT = {
  purchaseId: 'purchase-002',
  userId: 'user-B',
  eventId: 'event-001',
  ticketId: 'ticket-002',
  confirmationType: 'PURCHASE_CONFIRMED' as const,
};

describe('T107 BookingConfirmationHandler — DC-06 PENDING positive assertion', () => {
  it('T107-1: PENDING is a VALID state (DC-06 positive assertion — not a failure)', async () => {
    const callOrder: string[] = [];
    const db = makeBookingDb(callOrder);
    const queue = makeBookingQueue(callOrder);

    const handler = new BookingConfirmationHandler(db as any, queue as any);
    const result = await handler.confirmBooking(WAITLIST_INPUT);

    expect(result.isSuccess).toBe(true);
    // DC-06: PENDING is valid — success, not failure
    expect(result.data?.status).toBe('PENDING');
  });

  it('T107-2: CONFIRMED is also a valid state', async () => {
    const callOrder: string[] = [];
    const db = makeBookingDb(callOrder);
    const queue = makeBookingQueue(callOrder);

    const handler = new BookingConfirmationHandler(db as any, queue as any);
    const result = await handler.confirmBooking(CONFIRMED_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('CONFIRMED');
  });

  it('T107-3: PENDING records stored with knowledgeScope=PRIVATE (DC-06)', async () => {
    const callOrder: string[] = [];
    const storeCapture: Array<Record<string, unknown>> = [];
    const db = makeBookingDb(callOrder, storeCapture);
    const queue = makeBookingQueue(callOrder);

    const handler = new BookingConfirmationHandler(db as any, queue as any);
    await handler.confirmBooking(WAITLIST_INPUT);

    const record = storeCapture.find((d) => d['status'] === 'PENDING');
    expect(record).toBeDefined();
    // DC-06: PENDING records are PRIVATE
    expect(record?.['knowledgeScope']).toBe('PRIVATE');
  });

  it('T107-4: storeDocument BEFORE booking.confirmed enqueue (DNA-8)', async () => {
    const callOrder: string[] = [];
    const db = makeBookingDb(callOrder);
    const queue = makeBookingQueue(callOrder);

    const handler = new BookingConfirmationHandler(db as any, queue as any);
    await handler.confirmBooking(CONFIRMED_INPUT);

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('T107-5: idempotent — duplicate call returns existing record', async () => {
    const callOrder: string[] = [];
    const existing = { status: 'CONFIRMED', confirmedAt: '2026-01-01T00:00:00Z' };
    const db = makeBookingDb(callOrder, undefined, existing);
    const queue = makeBookingQueue(callOrder);

    const handler = new BookingConfirmationHandler(db as any, queue as any);
    const result = await handler.confirmBooking(CONFIRMED_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('CONFIRMED');
    // storeDocument not called on duplicate
    expect(db.storeDocument).not.toHaveBeenCalled();
  });
});

// ── T118 tests ────────────────────────────────────────────────────────────────

const ANALYTICS_INPUT = {
  purchaseId: 'purchase-001',
  userId: 'user-A',
  eventId: 'event-001',
  ticketId: 'ticket-001',
  purchaseType: 'INDIVIDUAL' as const,
  ticketTier: 'GENERAL',
  grossAmount: 100,
  currency: 'USD',
  issuedAt: '2026-04-12T00:00:00Z',
};

describe('T118 RegistrationAnalyticsHandler — OBSERVABILITY', () => {
  it('T118-1: successful recording returns DataProcessResult.success', async () => {
    const db = {
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };
    const queue = {
      enqueue: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };

    const handler = new RegistrationAnalyticsHandler(db as any, queue as any);
    const result = await handler.recordAnalytics(ANALYTICS_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('RECORDED');
  });

  it('T118-2: DB error → success with ANALYTICS_SKIPPED (never blocks purchase path)', async () => {
    const db = {
      storeDocument: jest.fn().mockRejectedValue(new Error('DB connection failed')),
    };
    const queue = {
      enqueue: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };

    const handler = new RegistrationAnalyticsHandler(db as any, queue as any);
    const result = await handler.recordAnalytics(ANALYTICS_INPUT);

    // OBSERVABILITY: never returns failure — analytics error is swallowed
    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('ANALYTICS_SKIPPED');
  });

  it('T118-3: queue error → success (ANALYTICS_SKIPPED)', async () => {
    const db = {
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };
    const queue = {
      enqueue: jest.fn().mockRejectedValue(new Error('Queue unavailable')),
    };

    const handler = new RegistrationAnalyticsHandler(db as any, queue as any);
    const result = await handler.recordAnalytics(ANALYTICS_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('ANALYTICS_SKIPPED');
  });
});
