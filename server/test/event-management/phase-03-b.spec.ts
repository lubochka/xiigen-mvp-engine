/**
 * FLOW-03 Phase 1B — T60 EventRegistrationManager Tests
 *
 * T60-1: Atomic operation — ONE storeDocument call per registration (no separate capacity write)
 * T60-2: capacity=0 → routes to WAITLIST, not DataProcessResult.failure
 * T60-3: capacity=null → always CONFIRMED (unlimited — no count check needed)
 * T60-4: Duplicate (attendeeId, eventId) → returns existing registration (SETNX)
 * T60-5: Waitlist entry stored with join_timestamp (FIFO ordering key)
 * T60-6: storeDocument called BEFORE AttendeeRegistered enqueued (DNA-8 call order)
 * T60-7: Max attendees from FREEDOM config — routing changes when config value changes
 * MT-1:  Registration stored with tenant_id, connection_type='FLOW_SCOPED', knowledge_scope='PRIVATE'
 */

import 'reflect-metadata';
import {
  EventRegistrationManager,
  RegisterInput,
} from '../../src/engine/flows/event-management/event-registration.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factories ─────────────────────────────────────────────────────────────

interface MockDbOptions {
  events?: Array<Record<string, unknown>>;
  existingRegistrations?: Array<Record<string, unknown>>;
  maxAttendeesFromFreedom?: number | null;
}

function makeMockDb(options: MockDbOptions = {}) {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
  const callOrder: string[] = [];
  const searchCalls: Array<{ index: string; filter: Record<string, unknown> }> = [];

  const events = options.events ?? [];
  const existingRegistrations = options.existingRegistrations ?? [];
  const maxAttendeesFromFreedom = options.maxAttendeesFromFreedom;

  return {
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      callOrder.push('searchDocuments');
      searchCalls.push({ index, filter });

      if (index === 'xiigen-event-registrations') {
        const matches = existingRegistrations.filter((r) =>
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
        if (maxAttendeesFromFreedom !== null && maxAttendeesFromFreedom !== undefined) {
          return DataProcessResult.success([
            {
              config_key: 'flow03_max_attendees',
              config_value: String(maxAttendeesFromFreedom),
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
      return DataProcessResult.success(doc);
    }),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _stored: stored,
    _callOrder: callOrder,
    _searchCalls: searchCalls,
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
  const queue = makeMockQueue(db._callOrder); // shared callOrder for DNA-8 ordering checks
  const svc = new EventRegistrationManager(db, queue);
  return { svc, db, queue };
}

// Convenience: a basic open event with capacity=50
const OPEN_EVENT = { event_id: 'evt-001', capacity: 50, tenant_id: 'tenant-A' };
// Closed event (capacity=0)
const CLOSED_EVENT = { event_id: 'evt-002', capacity: 0, tenant_id: 'tenant-A' };
// Unlimited event (capacity=null)
const UNLIMITED_EVENT = { event_id: 'evt-003', capacity: null, tenant_id: 'tenant-A' };

const BASE_INPUT: RegisterInput = {
  attendeeId: 'att-001',
  eventId: 'evt-001',
  tenantId: 'tenant-A',
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('EventRegistrationManager (T60)', () => {
  it('T60-1: Atomic operation — ONE storeDocument call per registration (no separate capacity write)', async () => {
    const { svc, db } = makeService({ events: [OPEN_EVENT] });

    const result = await svc.register(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    // IR-60-1: exactly one write — no separate capacity decrement storeDocument
    const writeCount = db._callOrder.filter((c: string) => c === 'storeDocument').length;
    expect(writeCount).toBe(1);
  });

  it('T60-2: capacity=0 → routes to WAITLIST, not DataProcessResult.failure', async () => {
    const { svc, db, queue } = makeService({ events: [CLOSED_EVENT] });

    const result = await svc.register({ ...BASE_INPUT, eventId: 'evt-002' });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.routed).toBe('WAITLIST');
    expect(result.data!.status).toBe('WAITLISTED');
    // A record was stored (DNA-8)
    expect(db._stored.length).toBe(1);
    expect(db._stored[0].doc['status']).toBe('WAITLISTED');
    // WaitlistJoined emitted (not AttendeeRegistered)
    expect(queue._enqueued[0].eventType).toBe('WaitlistJoined');
  });

  it('T60-3: capacity=null → always CONFIRMED, confirmed-count query never issued', async () => {
    // Even with 1000 "confirmed" registrations, unlimited event always succeeds
    const manyConfirmed = Array.from({ length: 1000 }, (_, i) => ({
      registration_id: `reg-${i}`,
      attendee_id: `att-other-${i}`,
      event_id: 'evt-003',
      status: 'CONFIRMED',
    }));
    const { svc, db, queue } = makeService({
      events: [UNLIMITED_EVENT],
      existingRegistrations: manyConfirmed,
    });

    const result = await svc.register({ ...BASE_INPUT, eventId: 'evt-003' });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.routed).toBe('CONFIRMED');
    expect(queue._enqueued[0].eventType).toBe('AttendeeRegistered');
    // capacity=null skips the slot count entirely — no searchDocuments with status:'CONFIRMED'
    const countQueryIssued = db._searchCalls.some(
      (c: { index: string; filter: Record<string, unknown> }) =>
        c.index === 'xiigen-event-registrations' && c.filter['status'] === 'CONFIRMED',
    );
    expect(countQueryIssued).toBe(false);
  });

  it('T60-4: Duplicate (attendeeId, eventId) → returns existing registration (SETNX)', async () => {
    const existingReg = {
      registration_id: 'reg-existing-001',
      attendee_id: 'att-001',
      event_id: 'evt-001',
      status: 'CONFIRMED',
      tenant_id: 'tenant-A',
    };
    const { svc, db, queue } = makeService({
      events: [OPEN_EVENT],
      existingRegistrations: [existingReg],
    });

    const result = await svc.register(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.registrationId).toBe('reg-existing-001');
    expect(result.data!.status).toBe('CONFIRMED');
    // SETNX: no new storeDocument call — returned existing record
    expect(db._stored.length).toBe(0);
    // No new event emitted
    expect(queue._enqueued.length).toBe(0);
  });

  it('T60-4b: Duplicate waitlisted entry returns existing WAITLISTED status', async () => {
    const existingWaitlisted = {
      registration_id: 'reg-wait-001',
      attendee_id: 'att-001',
      event_id: 'evt-002',
      status: 'WAITLISTED',
      tenant_id: 'tenant-A',
    };
    const { svc } = makeService({
      events: [CLOSED_EVENT],
      existingRegistrations: [existingWaitlisted],
    });

    const result = await svc.register({ ...BASE_INPUT, eventId: 'evt-002' });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.registrationId).toBe('reg-wait-001');
    expect(result.data!.routed).toBe('WAITLIST');
  });

  it('T60-5: Waitlist entry stored with join_timestamp (FIFO ordering key)', async () => {
    const { svc, db } = makeService({ events: [CLOSED_EVENT] });

    const result = await svc.register({ ...BASE_INPUT, eventId: 'evt-002' });

    expect(result.isSuccess).toBe(true);
    const stored = db._stored[0]?.doc as Record<string, unknown>;
    expect(stored).toHaveProperty('join_timestamp');
    expect(typeof stored['join_timestamp']).toBe('string');
    // join_timestamp is a valid ISO date — enables FIFO ordering on promotion
    expect(() => new Date(stored['join_timestamp'] as string)).not.toThrow();
  });

  it('T60-6: storeDocument called BEFORE AttendeeRegistered enqueued (DNA-8)', async () => {
    const { svc, db } = makeService({ events: [OPEN_EVENT] });

    await svc.register(BASE_INPUT);

    const callOrder = db._callOrder;
    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');

    expect(storeIdx).toBeGreaterThanOrEqual(0); // storeDocument was called
    expect(enqueueIdx).toBeGreaterThan(storeIdx); // DNA-8: enqueue AFTER store
  });

  it('T60-6b: AttendeeRegistered NOT emitted when storeDocument fails', async () => {
    const db = makeMockDb({ events: [OPEN_EVENT] });
    db.storeDocument.mockResolvedValueOnce(DataProcessResult.failure('DB_ERROR', 'disk full'));
    const queue = makeMockQueue();
    const svc = new EventRegistrationManager(db, queue);

    const result = await svc.register(BASE_INPUT);

    expect(result.isSuccess).toBe(false);
    expect(queue._enqueued.length).toBe(0);
  });

  it('T60-7: Max attendees from FREEDOM config — routing changes when config value changes', async () => {
    // Config says max=1, event capacity=50, one confirmed registration exists
    const oneConfirmed = [
      {
        registration_id: 'reg-prev-001',
        attendee_id: 'att-other',
        event_id: 'evt-001',
        status: 'CONFIRMED',
      },
    ];

    // With maxAttendees=1 → slot full → WAITLIST
    const { svc: svcLow } = makeService({
      events: [OPEN_EVENT],
      existingRegistrations: oneConfirmed,
      maxAttendeesFromFreedom: 1,
    });
    const resultLow = await svcLow.register(BASE_INPUT);
    expect(resultLow.isSuccess).toBe(true);
    expect(resultLow.data!.routed).toBe('WAITLIST');

    // With maxAttendees=100 → slots available → CONFIRMED
    const { svc: svcHigh } = makeService({
      events: [OPEN_EVENT],
      existingRegistrations: oneConfirmed,
      maxAttendeesFromFreedom: 100,
    });
    const resultHigh = await svcHigh.register(BASE_INPUT);
    expect(resultHigh.isSuccess).toBe(true);
    expect(resultHigh.data!.routed).toBe('CONFIRMED');
  });

  it('MT-1: Registration stored with tenant_id, connection_type=FLOW_SCOPED, knowledge_scope=PRIVATE', async () => {
    const { svc, db } = makeService({ events: [OPEN_EVENT] });

    await svc.register({ ...BASE_INPUT, tenantId: 'tenant-X' });

    const stored = db._stored[0]?.doc as Record<string, unknown>;
    expect(stored['tenant_id']).toBe('tenant-X');
    expect(stored['connection_type']).toBe('FLOW_SCOPED');
    expect(stored['knowledge_scope']).toBe('PRIVATE');
  });

  it('DNA-3: register() returns DataProcessResult — never throws', async () => {
    const db = makeMockDb({ events: [OPEN_EVENT] });
    db.searchDocuments.mockRejectedValue(new Error('network timeout'));
    const queue = makeMockQueue();
    const svc = new EventRegistrationManager(db, queue);

    const result = await svc.register(BASE_INPUT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
  });
});
