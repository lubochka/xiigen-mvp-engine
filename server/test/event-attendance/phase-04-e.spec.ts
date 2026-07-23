/**
 * FLOW-04 Phase 2E — T67 CancellationProcessor Tests
 *
 * T67-1: CONFIRMED RSVP within window → cancelled, RsvpCancelled emitted, WaitlistManager called
 * T67-2: WAITLISTED RSVP within window → cancelled, RsvpCancelled emitted, WaitlistManager NOT called
 * T67-3: Cancellation window expired → success({ cancelled:false, reason:'WINDOW_CLOSED' })
 * T67-4: Already-CANCELLED RSVP → idempotent success({ cancelled:false, reason:'ALREADY_CANCELLED' })
 * T67-5: No RSVP found → failure (RSVP_NOT_FOUND)
 * T67-6: storeDocument called BEFORE RsvpCancelled emitted (DNA-8)
 * T67-7: storeDocument failure → RsvpCancelled NOT emitted, WaitlistManager NOT called
 * MT-1:  Cancelled RSVP record preserves tenant_id on update
 * DNA-3: cancel() returns DataProcessResult — never throws
 */

import 'reflect-metadata';
import {
  CancellationProcessor,
  CancelRsvpInput,
} from '../../src/engine/flows/event-attendance/cancellation-processor.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factories ─────────────────────────────────────────────────────────────

interface MockDbOptions {
  rsvp?: Record<string, unknown> | null;
}

const FUTURE = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // window open
const PAST = new Date(Date.now() - 24 * 3600 * 1000).toISOString(); // window closed

function makeMockDb(options: MockDbOptions = {}) {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
  const callOrder: string[] = [];
  const rsvp = options.rsvp ?? null;

  return {
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      callOrder.push('searchDocuments');
      if (index === 'xiigen-event-rsvps' && rsvp) {
        const matches = [rsvp].filter((r) =>
          Object.entries(filter).every(([k, v]) => v == null || r[k] === v),
        );
        return DataProcessResult.success(matches);
      }
      return DataProcessResult.success([]);
    }),
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      callOrder.push('storeDocument');
      stored.push({ index, doc, id });
      return DataProcessResult.success(doc);
    }),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _stored: stored,
    _callOrder: callOrder,
  } as any;
}

function makeMockQueue(callOrder: string[] = []) {
  const enqueued: Array<{ eventType: string; data: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (eventType: string, data: Record<string, unknown>) => {
      callOrder.push('enqueue');
      enqueued.push({ eventType, data });
      return DataProcessResult.success({});
    }),
    dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    sendToDlq: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    waitFor: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _enqueued: enqueued,
  } as any;
}

function makeMockWaitlistManager(callOrder: string[] = []) {
  const calls: Array<Record<string, unknown>> = [];
  return {
    promoteNext: jest.fn(async (input: Record<string, unknown>) => {
      callOrder.push('promoteNext');
      calls.push(input);
      return DataProcessResult.success({ promoted: false });
    }),
    _calls: calls,
  } as any;
}

function makeService(dbOptions: MockDbOptions = {}) {
  const db = makeMockDb(dbOptions);
  const queue = makeMockQueue(db._callOrder);
  const wlMgr = makeMockWaitlistManager(db._callOrder);
  const svc = new CancellationProcessor(db, queue, wlMgr);
  return { svc, db, queue, wlMgr };
}

const BASE_INPUT: CancelRsvpInput = {
  attendeeId: 'att-001',
  eventId: 'evt-001',
  tenantId: 'tenant-A',
};

function makeRsvp(status: string, cancellableUntil = FUTURE): Record<string, unknown> {
  return {
    rsvp_id: 'rsvp-001',
    attendee_id: 'att-001',
    event_id: 'evt-001',
    status,
    tenant_id: 'tenant-A',
    cancellable_until: cancellableUntil,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('CancellationProcessor (T67)', () => {
  it('T67-1: CONFIRMED RSVP within window → cancelled, RsvpCancelled emitted, WaitlistManager called', async () => {
    const { svc, db, queue, wlMgr } = makeService({ rsvp: makeRsvp('CONFIRMED', FUTURE) });

    const result = await svc.cancel(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.cancelled).toBe(true);
    expect(result.data!.rsvpId).toBe('rsvp-001');
    // RSVP updated to CANCELLED
    expect(db._stored[0].doc['status']).toBe('CANCELLED');
    // RsvpCancelled emitted
    expect(queue._enqueued[0].eventType).toBe('RsvpCancelled');
    expect(queue._enqueued[0].data['wasConfirmed']).toBe(true);
    // IR-67-3: slot freed → WaitlistManager called
    expect(wlMgr.promoteNext).toHaveBeenCalledTimes(1);
    expect(wlMgr._calls[0]['eventId']).toBe('evt-001');
  });

  it('T67-2: WAITLISTED RSVP → cancelled, RsvpCancelled emitted, WaitlistManager NOT called', async () => {
    // IR-67-3: WAITLISTED cancellation removes from queue only — no slot freed
    const { svc, db, queue, wlMgr } = makeService({ rsvp: makeRsvp('WAITLISTED', FUTURE) });

    const result = await svc.cancel(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.cancelled).toBe(true);
    expect(db._stored[0].doc['status']).toBe('CANCELLED');
    expect(queue._enqueued[0].eventType).toBe('RsvpCancelled');
    expect(queue._enqueued[0].data['wasConfirmed']).toBe(false);
    // No slot freed — no promotion
    expect(wlMgr.promoteNext).not.toHaveBeenCalled();
  });

  it('T67-3: Cancellation window expired → success({ cancelled:false, reason:WINDOW_CLOSED })', async () => {
    // IR-67-1: expired window is a business state — not a system error
    const { svc, db, queue, wlMgr } = makeService({ rsvp: makeRsvp('CONFIRMED', PAST) });

    const result = await svc.cancel(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.cancelled).toBe(false);
    expect(result.data!.reason).toBe('WINDOW_CLOSED');
    expect(db._stored.length).toBe(0);
    expect(queue._enqueued.length).toBe(0);
    expect(wlMgr.promoteNext).not.toHaveBeenCalled();
  });

  it('T67-4: Already-CANCELLED RSVP → idempotent success({ cancelled:false, reason:ALREADY_CANCELLED })', async () => {
    // IR-67-2: idempotent — cancelling a cancelled RSVP is a no-op
    const { svc, db, queue } = makeService({ rsvp: makeRsvp('CANCELLED', FUTURE) });

    const result = await svc.cancel(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.cancelled).toBe(false);
    expect(result.data!.reason).toBe('ALREADY_CANCELLED');
    expect(db._stored.length).toBe(0);
    expect(queue._enqueued.length).toBe(0);
  });

  it('T67-5: No RSVP found → failure (RSVP_NOT_FOUND)', async () => {
    const { svc } = makeService({ rsvp: null });

    const result = await svc.cancel(BASE_INPUT);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('RSVP_NOT_FOUND');
  });

  it('T67-6: storeDocument called BEFORE RsvpCancelled emitted (DNA-8)', async () => {
    const { svc, db } = makeService({ rsvp: makeRsvp('CONFIRMED', FUTURE) });

    await svc.cancel(BASE_INPUT);

    const callOrder = db._callOrder;
    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');

    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx); // DNA-8: store before emit
  });

  it('T67-7: storeDocument failure → RsvpCancelled NOT emitted, WaitlistManager NOT called', async () => {
    const db = makeMockDb({ rsvp: makeRsvp('CONFIRMED', FUTURE) });
    db.storeDocument.mockResolvedValueOnce(DataProcessResult.failure('DB_ERROR', 'disk full'));
    const queue = makeMockQueue();
    const wlMgr = makeMockWaitlistManager();
    const svc = new CancellationProcessor(db, queue, wlMgr);

    const result = await svc.cancel(BASE_INPUT);

    expect(result.isSuccess).toBe(false);
    expect(queue._enqueued.length).toBe(0);
    expect(wlMgr.promoteNext).not.toHaveBeenCalled();
  });

  it('MT-1: Cancelled RSVP record preserves tenant_id on update', async () => {
    const rsvp = { ...makeRsvp('CONFIRMED', FUTURE), tenant_id: 'tenant-Z' };
    const { svc, db } = makeService({ rsvp });

    await svc.cancel({ ...BASE_INPUT, tenantId: 'tenant-Z' });

    const stored = db._stored[0]?.doc as Record<string, unknown>;
    expect(stored['tenant_id']).toBe('tenant-Z');
    expect(stored['status']).toBe('CANCELLED');
    expect(stored['cancelled_at']).toBeDefined();
  });

  it('DNA-3: cancel() returns DataProcessResult — never throws', async () => {
    const db = makeMockDb();
    db.searchDocuments.mockRejectedValue(new Error('network timeout'));
    const queue = makeMockQueue();
    const wlMgr = makeMockWaitlistManager();
    const svc = new CancellationProcessor(db, queue, wlMgr);

    const result = await svc.cancel(BASE_INPUT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
  });
});
