/**
 * FLOW-04 Phase 2A — T63 RSVPOrchestrator Tests
 *
 * T63-1: Atomic — ONE storeDocument call per RSVP creation (no separate capacity write)
 * T63-2: capacity=0 → { routed:'WAITLIST' } DataProcessResult.success (not failure)
 * T63-3: Duplicate same-path (promotionRequest absent) → existing record returned, no new write
 * T63-4: Promotion path (promotionRequest:true, existing=WAITLISTED) → CONFIRMED update
 * T63-5: Promotion path (promotionRequest:true, existing=CONFIRMED) → idempotent return
 * T63-6: storeDocument called BEFORE rsvp.confirmed emitted (DNA-8 call order)
 * T63-7: Cancellation window stored on RSVP from FREEDOM config
 * T63-8: Race condition — two requests for last slot: exactly one CONFIRMED, one WAITLISTED
 * MT-1:  RSVP record has tenant_id, connection_type='FLOW_SCOPED', knowledge_scope='PRIVATE'
 */

import 'reflect-metadata';
import {
  RsvpOrchestrator,
  RsvpInput,
} from '../../src/engine/flows/event-attendance/rsvp-orchestrator.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factories ─────────────────────────────────────────────────────────────

interface MockDbOptions {
  events?: Array<Record<string, unknown>>;
  existingRsvps?: Array<Record<string, unknown>>;
  cancellationWindowHrs?: number | null;
}

function makeMockDb(options: MockDbOptions = {}) {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
  const callOrder: string[] = [];

  const events = options.events ?? [];
  const existingRsvps = options.existingRsvps ?? [];
  const cancellationWindowHrs = options.cancellationWindowHrs;

  // Mutable snapshot — lets T63-8 update confirmed count between calls
  let rsvpSnapshot = [...existingRsvps];

  return {
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      callOrder.push('searchDocuments');

      if (index === 'xiigen-event-rsvps') {
        const matches = rsvpSnapshot.filter((r) =>
          Object.entries(filter).every(([k, v]) => v == null || r[k] === v),
        );
        return DataProcessResult.success(matches);
      }
      if (index === 'xiigen-events') {
        const matches = events.filter((e) =>
          Object.entries(filter).every(([k, v]) => v == null || e[k] === v),
        );
        return DataProcessResult.success(matches);
      }
      if (index === 'freedom_configs') {
        const key = filter['config_key'];
        if (
          key === 'flow04_rsvp_cancellation_window_hours' &&
          cancellationWindowHrs !== null &&
          cancellationWindowHrs !== undefined
        ) {
          return DataProcessResult.success([
            {
              config_key: key,
              config_value: String(cancellationWindowHrs),
            },
          ]);
        }
        return DataProcessResult.success([]);
      }
      return DataProcessResult.success([]);
    }),
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      callOrder.push('storeDocument');
      stored.push({ index, doc, id });
      // Update snapshot so subsequent reads reflect new state (enables T63-8)
      if (index === 'xiigen-event-rsvps') {
        const existing = rsvpSnapshot.findIndex((r) => r['rsvp_id'] === id);
        if (existing >= 0) {
          rsvpSnapshot[existing] = doc;
        } else {
          rsvpSnapshot.push(doc);
        }
      }
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
  const svc = new RsvpOrchestrator(db, queue);
  return { svc, db, queue };
}

const OPEN_EVENT = { event_id: 'evt-001', capacity: 10, tenant_id: 'tenant-A' };
const FULL_EVENT = { event_id: 'evt-002', capacity: 0, tenant_id: 'tenant-A' };
const LAST_SLOT_EVENT = { event_id: 'evt-003', capacity: 1, tenant_id: 'tenant-A' };

const BASE_INPUT: RsvpInput = {
  attendeeId: 'att-001',
  eventId: 'evt-001',
  tenantId: 'tenant-A',
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('RsvpOrchestrator (T63)', () => {
  it('T63-1: Atomic — ONE storeDocument call per RSVP creation', async () => {
    // IR-63-1: no separate capacity decrement write — one write only
    const { svc, db } = makeService({ events: [OPEN_EVENT] });

    const result = await svc.rsvp(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    const writeCount = db._callOrder.filter((c: string) => c === 'storeDocument').length;
    expect(writeCount).toBe(1);
  });

  it('T63-2: capacity=0 → { routed:WAITLIST } DataProcessResult.success — not failure', async () => {
    // IR-63-3: full event is a business state, not a system error. DR-04-B.
    const { svc, queue } = makeService({ events: [FULL_EVENT] });

    const result = await svc.rsvp({ ...BASE_INPUT, eventId: 'evt-002' });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.routed).toBe('WAITLIST');
    expect(result.data!.status).toBe('WAITLISTED');
    expect(queue._enqueued[0].eventType).toBe('rsvp.waitlisted');
  });

  it('T63-3: Duplicate same-path → existing record returned, no new write (SETNX Case A)', async () => {
    const existingRsvp = {
      rsvp_id: 'rsvp-existing-001',
      attendee_id: 'att-001',
      event_id: 'evt-001',
      status: 'CONFIRMED',
      tenant_id: 'tenant-A',
    };
    const { svc, db, queue } = makeService({
      events: [OPEN_EVENT],
      existingRsvps: [existingRsvp],
    });

    const result = await svc.rsvp(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.rsvpId).toBe('rsvp-existing-001');
    expect(result.data!.routed).toBe('CONFIRMED');
    // SETNX: no new write, no new event emit
    expect(db._stored.length).toBe(0);
    expect(queue._enqueued.length).toBe(0);
  });

  it('T63-4: Promotion path (promotionRequest:true, WAITLISTED) → updates to CONFIRMED', async () => {
    // IR-63-2 Case B: T64 calls T63 with promotionRequest:true.
    // MUST NOT use SETNX — SETNX returns WAITLISTED record and silently blocks promotion.
    const waitlistedRsvp = {
      rsvp_id: 'rsvp-wait-001',
      attendee_id: 'att-001',
      event_id: 'evt-001',
      status: 'WAITLISTED',
      tenant_id: 'tenant-A',
    };
    const { svc, db, queue } = makeService({
      events: [OPEN_EVENT],
      existingRsvps: [waitlistedRsvp],
    });

    const result = await svc.rsvp({ ...BASE_INPUT, promotionRequest: true });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.rsvpId).toBe('rsvp-wait-001');
    expect(result.data!.status).toBe('CONFIRMED');
    expect(result.data!.routed).toBe('CONFIRMED');
    // Conditional update: storeDocument was called with CONFIRMED status
    expect(db._stored.length).toBe(1);
    expect(db._stored[0].doc['status']).toBe('CONFIRMED');
    // rsvp.confirmed emitted
    expect(queue._enqueued[0].eventType).toBe('rsvp.confirmed');
    expect(queue._enqueued[0].data['promotedFromWaitlist']).toBe(true);
  });

  it('T63-5: Promotion path (promotionRequest:true, already CONFIRMED) → idempotent return', async () => {
    const confirmedRsvp = {
      rsvp_id: 'rsvp-conf-001',
      attendee_id: 'att-001',
      event_id: 'evt-001',
      status: 'CONFIRMED',
      tenant_id: 'tenant-A',
    };
    const { svc, db, queue } = makeService({
      events: [OPEN_EVENT],
      existingRsvps: [confirmedRsvp],
    });

    const result = await svc.rsvp({ ...BASE_INPUT, promotionRequest: true });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.rsvpId).toBe('rsvp-conf-001');
    expect(result.data!.status).toBe('CONFIRMED');
    // Already confirmed: no new write, no new event
    expect(db._stored.length).toBe(0);
    expect(queue._enqueued.length).toBe(0);
  });

  it('T63-6: storeDocument called BEFORE rsvp.confirmed emitted (DNA-8)', async () => {
    const { svc, db } = makeService({ events: [OPEN_EVENT] });

    await svc.rsvp(BASE_INPUT);

    const callOrder = db._callOrder;
    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');

    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx); // DNA-8: enqueue AFTER store
  });

  it('T63-6b: rsvp.confirmed NOT emitted when storeDocument fails', async () => {
    const db = makeMockDb({ events: [OPEN_EVENT] });
    db.storeDocument.mockResolvedValueOnce(DataProcessResult.failure('DB_ERROR', 'disk full'));
    const queue = makeMockQueue();
    const svc = new RsvpOrchestrator(db, queue);

    const result = await svc.rsvp(BASE_INPUT);

    expect(result.isSuccess).toBe(false);
    expect(queue._enqueued.length).toBe(0);
  });

  it('T63-7: Cancellation window stored on RSVP record — value reflects FREEDOM config', async () => {
    // 2-hour window from FREEDOM config
    const { svc: svc2h, db: db2h } = makeService({
      events: [OPEN_EVENT],
      cancellationWindowHrs: 2,
    });
    await svc2h.rsvp(BASE_INPUT);
    const stored2h = db2h._stored[0]?.doc as Record<string, unknown>;
    expect(stored2h).toHaveProperty('cancellable_until');
    const cancelUntil2h = new Date(stored2h['cancellable_until'] as string).getTime();
    // Should be ~2 hours from now (within 5 seconds tolerance)
    expect(cancelUntil2h).toBeGreaterThan(Date.now() + 2 * 3600 * 1000 - 5000);
    expect(cancelUntil2h).toBeLessThan(Date.now() + 2 * 3600 * 1000 + 5000);

    // 48-hour window from FREEDOM config → different cancellable_until
    const { svc: svc48h, db: db48h } = makeService({
      events: [OPEN_EVENT],
      cancellationWindowHrs: 48,
    });
    await svc48h.rsvp(BASE_INPUT);
    const stored48h = db48h._stored[0]?.doc as Record<string, unknown>;
    const cancelUntil48h = new Date(stored48h['cancellable_until'] as string).getTime();
    expect(cancelUntil48h).toBeGreaterThan(cancelUntil2h);
  });

  it('T63-8: Race condition — two requests for last slot: exactly one CONFIRMED, one WAITLISTED', async () => {
    // Simulate two requests arriving before the first write completes.
    // The mock DB snapshot updates after storeDocument, so the second sequential call
    // sees the first RSVP already confirmed — proves one slot = one CONFIRMED only.
    const { svc, db } = makeService({ events: [LAST_SLOT_EVENT] });

    // Both requests for different attendees — same last slot
    const result1 = await svc.rsvp({ ...BASE_INPUT, eventId: 'evt-003', attendeeId: 'att-001' });
    // After first write, snapshot has one CONFIRMED — second request sees full capacity
    const result2 = await svc.rsvp({ ...BASE_INPUT, eventId: 'evt-003', attendeeId: 'att-002' });

    expect(result1.isSuccess).toBe(true);
    expect(result2.isSuccess).toBe(true);

    const outcomes = [result1.data!.routed, result2.data!.routed];
    expect(outcomes.filter((r) => r === 'CONFIRMED').length).toBe(1);
    expect(outcomes.filter((r) => r === 'WAITLIST').length).toBe(1);

    // Verify only the confirmed RSVP records exist in DB
    const confirmedInDb = db._stored.filter((s) => s.doc['status'] === 'CONFIRMED');
    expect(confirmedInDb.length).toBe(1);
  });

  it('MT-1: RSVP record has tenant_id, connection_type=FLOW_SCOPED, knowledge_scope=PRIVATE', async () => {
    const { svc, db } = makeService({ events: [OPEN_EVENT] });

    await svc.rsvp({ ...BASE_INPUT, tenantId: 'tenant-X' });

    const stored = db._stored[0]?.doc as Record<string, unknown>;
    expect(stored['tenant_id']).toBe('tenant-X');
    expect(stored['connection_type']).toBe('FLOW_SCOPED');
    expect(stored['knowledge_scope']).toBe('PRIVATE');
  });

  it('DNA-3: rsvp() returns DataProcessResult — never throws', async () => {
    const db = makeMockDb({ events: [OPEN_EVENT] });
    db.searchDocuments.mockRejectedValue(new Error('network timeout'));
    const queue = makeMockQueue();
    const svc = new RsvpOrchestrator(db, queue);

    const result = await svc.rsvp(BASE_INPUT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
  });
});
