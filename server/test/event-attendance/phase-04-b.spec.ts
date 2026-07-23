/**
 * FLOW-04 Phase 2B — T64 WaitlistManager Tests
 *
 * T64-1: FIFO — among multiple WAITLISTED, promotes attendee with earliest join_timestamp
 * T64-2: No waitlisted → success({ promoted: false }) — not failure
 * T64-3: Calls rsvpOrchestrator.rsvp() with promotionRequest:true for the correct attendee
 * T64-4: rsvp() called BEFORE WaitlistPromotionCompleted emitted (DNA-8)
 * T64-5: T63 failure → WaitlistPromotionCompleted NOT emitted, returns failure
 * T64-6: No waitlisted → queue untouched (no spurious events)
 * MT-1:  tenantId threaded through to T63 rsvp() call
 * DNA-3: promoteNext() returns DataProcessResult — never throws
 */

import 'reflect-metadata';
import {
  WaitlistManager,
  PromoteNextInput,
} from '../../src/engine/flows/event-attendance/waitlist-manager.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factories ─────────────────────────────────────────────────────────────

interface MockDbOptions {
  waitlistedRsvps?: Array<Record<string, unknown>>;
}

function makeMockDb(options: MockDbOptions = {}) {
  const callOrder: string[] = [];
  const waitlistedRsvps = options.waitlistedRsvps ?? [];

  return {
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      callOrder.push('searchDocuments');
      if (index === 'xiigen-event-rsvps') {
        const matches = waitlistedRsvps.filter((r) =>
          Object.entries(filter).every(([k, v]) => v == null || r[k] === v),
        );
        return DataProcessResult.success(matches);
      }
      return DataProcessResult.success([]);
    }),
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
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

function makeMockRsvpOrchestrator(callOrder: string[] = [], result?: DataProcessResult<any>) {
  return {
    rsvp: jest.fn(async (input: Record<string, unknown>) => {
      callOrder.push('rsvp');
      if (result) return result;
      return DataProcessResult.success({
        rsvpId: `promoted-${input['attendeeId']}`,
        status: 'CONFIRMED',
        routed: 'CONFIRMED',
      });
    }),
  } as any;
}

function makeService(dbOptions: MockDbOptions = {}, rsvpResult?: DataProcessResult<any>) {
  const db = makeMockDb(dbOptions);
  const queue = makeMockQueue(db._callOrder);
  const rsvpOrch = makeMockRsvpOrchestrator(db._callOrder, rsvpResult);
  const svc = new WaitlistManager(db, queue, rsvpOrch);
  return { svc, db, queue, rsvpOrch };
}

const BASE_INPUT: PromoteNextInput = {
  eventId: 'evt-001',
  tenantId: 'tenant-A',
};

// Timestamps in strict ascending order (FIFO)
const T1 = '2026-01-01T10:00:00.000Z'; // earliest
const T2 = '2026-01-01T11:00:00.000Z';
const T3 = '2026-01-01T12:00:00.000Z'; // latest

function makeWaitlisted(attendeeId: string, joinTimestamp: string): Record<string, unknown> {
  return {
    rsvp_id: `rsvp-${attendeeId}`,
    attendee_id: attendeeId,
    event_id: 'evt-001',
    status: 'WAITLISTED',
    join_timestamp: joinTimestamp,
    tenant_id: 'tenant-A',
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('WaitlistManager (T64)', () => {
  it('T64-1: FIFO — promotes attendee with earliest join_timestamp regardless of array order', async () => {
    // Array is in reverse timestamp order — FIFO sort must pick att-001 (T1 = earliest)
    const { svc, rsvpOrch } = makeService({
      waitlistedRsvps: [
        makeWaitlisted('att-003', T3), // latest  — must NOT be promoted
        makeWaitlisted('att-001', T1), // earliest — MUST be promoted
        makeWaitlisted('att-002', T2), // middle
      ],
    });

    const result = await svc.promoteNext(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.promoted).toBe(true);
    expect(result.data!.attendeeId).toBe('att-001');
    const rsvpCall = rsvpOrch.rsvp.mock.calls[0][0];
    expect(rsvpCall.attendeeId).toBe('att-001');
    expect(rsvpCall.promotionRequest).toBe(true);
  });

  it('T64-2: No waitlisted → success({ promoted: false }) — not failure', async () => {
    // IR-64-2: empty waitlist is a valid business state
    const { svc } = makeService({ waitlistedRsvps: [] });

    const result = await svc.promoteNext(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.promoted).toBe(false);
  });

  it('T64-3: Calls rsvpOrchestrator.rsvp() with promotionRequest:true for correct attendee', async () => {
    const { svc, rsvpOrch } = makeService({
      waitlistedRsvps: [makeWaitlisted('att-001', T1)],
    });

    await svc.promoteNext(BASE_INPUT);

    expect(rsvpOrch.rsvp).toHaveBeenCalledTimes(1);
    const call = rsvpOrch.rsvp.mock.calls[0][0];
    expect(call.promotionRequest).toBe(true);
    expect(call.attendeeId).toBe('att-001');
    expect(call.eventId).toBe('evt-001');
  });

  it('T64-4: rsvp() called BEFORE WaitlistPromotionCompleted emitted (DNA-8)', async () => {
    const { svc, db } = makeService({
      waitlistedRsvps: [makeWaitlisted('att-001', T1)],
    });

    await svc.promoteNext(BASE_INPUT);

    const callOrder = db._callOrder;
    const rsvpIdx = callOrder.indexOf('rsvp');
    const enqueueIdx = callOrder.lastIndexOf('enqueue'); // WaitlistPromotionCompleted

    expect(rsvpIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(rsvpIdx); // DNA-8: store (via T63) before emit
  });

  it('T64-5: T63 failure → WaitlistPromotionCompleted NOT emitted, returns failure', async () => {
    const failResult = DataProcessResult.failure('PROMOTION_FAILED', 'T63 store error');
    const { svc, queue } = makeService(
      { waitlistedRsvps: [makeWaitlisted('att-001', T1)] },
      failResult,
    );

    const result = await svc.promoteNext(BASE_INPUT);

    expect(result.isSuccess).toBe(false);
    expect(queue._enqueued.length).toBe(0); // IR-64-4: no emit on T63 failure
  });

  it('T64-6: No waitlisted → queue untouched (no spurious events)', async () => {
    const { svc, queue } = makeService({ waitlistedRsvps: [] });

    await svc.promoteNext(BASE_INPUT);

    expect(queue._enqueued.length).toBe(0);
  });

  it('MT-1: tenantId threaded through to T63 rsvp() call', async () => {
    const { svc, rsvpOrch } = makeService({
      waitlistedRsvps: [makeWaitlisted('att-001', T1)],
    });

    await svc.promoteNext({ eventId: 'evt-001', tenantId: 'tenant-Z' });

    const call = rsvpOrch.rsvp.mock.calls[0][0];
    expect(call.tenantId).toBe('tenant-Z');
  });

  it('DNA-3: promoteNext() returns DataProcessResult — never throws', async () => {
    const db = makeMockDb();
    db.searchDocuments.mockRejectedValue(new Error('network timeout'));
    const queue = makeMockQueue();
    const rsvpOrch = makeMockRsvpOrchestrator();
    const svc = new WaitlistManager(db, queue, rsvpOrch);

    const result = await svc.promoteNext(BASE_INPUT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
  });
});
