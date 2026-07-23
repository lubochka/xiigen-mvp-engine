/**
 * FLOW-04 Phase 2C — T65 CheckInProcessor Tests
 *
 * T65-1: CONFIRMED RSVP → check-in recorded, AttendeeCheckedIn emitted
 * T65-2: No RSVP found → success({ checkedIn: false, reason:'NO_RSVP' }) — not failure
 * T65-3: WAITLISTED RSVP → success({ checkedIn: false, reason:'NOT_CONFIRMED' }) — not failure
 * T65-4: Duplicate check-in (already CHECKED_IN) → idempotent return, no new write, no new emit
 * T65-5: storeDocument called BEFORE AttendeeCheckedIn emitted (DNA-8)
 * T65-6: storeDocument failure → AttendeeCheckedIn NOT emitted
 * MT-1:  Check-in record has tenant_id, connection_type='FLOW_SCOPED', knowledge_scope='PRIVATE'
 * DNA-3: checkIn() returns DataProcessResult — never throws
 */

import 'reflect-metadata';
import {
  CheckInProcessor,
  CheckInInput,
} from '../../src/engine/flows/event-attendance/check-in-processor.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factories ─────────────────────────────────────────────────────────────

interface MockDbOptions {
  rsvps?: Array<Record<string, unknown>>;
  existingCheckins?: Array<Record<string, unknown>>;
}

function makeMockDb(options: MockDbOptions = {}) {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
  const callOrder: string[] = [];

  const rsvps = options.rsvps ?? [];
  const existingCheckins = options.existingCheckins ?? [];

  return {
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      callOrder.push('searchDocuments');

      if (index === 'xiigen-event-rsvps') {
        const matches = rsvps.filter((r) =>
          Object.entries(filter).every(([k, v]) => v == null || r[k] === v),
        );
        return DataProcessResult.success(matches);
      }
      if (index === 'xiigen-event-checkins') {
        const matches = existingCheckins.filter((c) =>
          Object.entries(filter).every(([k, v]) => v == null || c[k] === v),
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

function makeService(dbOptions: MockDbOptions = {}) {
  const db = makeMockDb(dbOptions);
  const queue = makeMockQueue(db._callOrder);
  const svc = new CheckInProcessor(db, queue);
  return { svc, db, queue };
}

const CONFIRMED_RSVP: Record<string, unknown> = {
  rsvp_id: 'rsvp-001',
  attendee_id: 'att-001',
  event_id: 'evt-001',
  status: 'CONFIRMED',
  tenant_id: 'tenant-A',
};

const WAITLISTED_RSVP: Record<string, unknown> = {
  rsvp_id: 'rsvp-002',
  attendee_id: 'att-001',
  event_id: 'evt-001',
  status: 'WAITLISTED',
  tenant_id: 'tenant-A',
};

const EXISTING_CHECKIN: Record<string, unknown> = {
  checkin_id: 'chk-existing-001',
  attendee_id: 'att-001',
  event_id: 'evt-001',
  tenant_id: 'tenant-A',
};

const BASE_INPUT: CheckInInput = {
  attendeeId: 'att-001',
  eventId: 'evt-001',
  tenantId: 'tenant-A',
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('CheckInProcessor (T65)', () => {
  it('T65-1: CONFIRMED RSVP → check-in recorded and AttendeeCheckedIn emitted', async () => {
    const { svc, db, queue } = makeService({ rsvps: [CONFIRMED_RSVP] });

    const result = await svc.checkIn(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.checkedIn).toBe(true);
    expect(result.data!.checkinId).toBeDefined();
    // ONE write to checkins index
    expect(db._stored.length).toBe(1);
    expect(db._stored[0].index).toBe('xiigen-event-checkins');
    // AttendeeCheckedIn emitted
    expect(queue._enqueued.length).toBe(1);
    expect(queue._enqueued[0].eventType).toBe('AttendeeCheckedIn');
  });

  it('T65-2: No RSVP found → success({ checkedIn: false, reason: NO_RSVP }) — not failure', async () => {
    // IR-65-1: absent RSVP is a business state — attendee never registered
    const { svc, db, queue } = makeService({ rsvps: [] });

    const result = await svc.checkIn(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.checkedIn).toBe(false);
    expect(result.data!.reason).toBe('NO_RSVP');
    expect(db._stored.length).toBe(0);
    expect(queue._enqueued.length).toBe(0);
  });

  it('T65-3: WAITLISTED RSVP → success({ checkedIn: false, reason: NOT_CONFIRMED }) — not failure', async () => {
    // IR-65-1: non-confirmed status is a business state — no check-in allowed
    const { svc, db, queue } = makeService({ rsvps: [WAITLISTED_RSVP] });

    const result = await svc.checkIn(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.checkedIn).toBe(false);
    expect(result.data!.reason).toBe('NOT_CONFIRMED');
    expect(db._stored.length).toBe(0);
    expect(queue._enqueued.length).toBe(0);
  });

  it('T65-4: Duplicate check-in → idempotent return, no new write, no new emit', async () => {
    // IR-65-2: SETNX by (attendeeId, eventId) — existing check-in returned unchanged
    const { svc, db, queue } = makeService({
      rsvps: [CONFIRMED_RSVP],
      existingCheckins: [EXISTING_CHECKIN],
    });

    const result = await svc.checkIn(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.checkedIn).toBe(true);
    expect(result.data!.checkinId).toBe('chk-existing-001');
    expect(result.data!.reason).toBe('ALREADY_CHECKED_IN');
    // No new write, no new event
    expect(db._stored.length).toBe(0);
    expect(queue._enqueued.length).toBe(0);
  });

  it('T65-5: storeDocument called BEFORE AttendeeCheckedIn emitted (DNA-8)', async () => {
    const { svc, db } = makeService({ rsvps: [CONFIRMED_RSVP] });

    await svc.checkIn(BASE_INPUT);

    const callOrder = db._callOrder;
    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');

    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx); // DNA-8: store before emit
  });

  it('T65-6: storeDocument failure → AttendeeCheckedIn NOT emitted', async () => {
    const db = makeMockDb({ rsvps: [CONFIRMED_RSVP] });
    db.storeDocument.mockResolvedValueOnce(DataProcessResult.failure('DB_ERROR', 'disk full'));
    const queue = makeMockQueue();
    const svc = new CheckInProcessor(db, queue);

    const result = await svc.checkIn(BASE_INPUT);

    expect(result.isSuccess).toBe(false);
    expect(queue._enqueued.length).toBe(0);
  });

  it('MT-1: Check-in record has tenant_id, connection_type=FLOW_SCOPED, knowledge_scope=PRIVATE', async () => {
    const { svc, db } = makeService({ rsvps: [{ ...CONFIRMED_RSVP, tenant_id: 'tenant-X' }] });

    await svc.checkIn({ ...BASE_INPUT, tenantId: 'tenant-X' });

    const stored = db._stored[0]?.doc as Record<string, unknown>;
    expect(stored['tenant_id']).toBe('tenant-X');
    expect(stored['connection_type']).toBe('FLOW_SCOPED');
    expect(stored['knowledge_scope']).toBe('PRIVATE');
    expect(stored['rsvp_id']).toBe('rsvp-001');
    expect(stored['checked_in_at']).toBeDefined();
  });

  it('DNA-3: checkIn() returns DataProcessResult — never throws', async () => {
    const db = makeMockDb();
    db.searchDocuments.mockRejectedValue(new Error('network timeout'));
    const queue = makeMockQueue();
    const svc = new CheckInProcessor(db, queue);

    const result = await svc.checkIn(BASE_INPUT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
  });
});
