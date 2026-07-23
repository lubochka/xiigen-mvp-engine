/**
 * FLOW-03 Phase 1A — T59 EventCreationOrchestrator Tests
 *
 * T59-1: capacity=null stored — limitless registration allowed
 * T59-2: capacity=0 stored — event closed (distinct from null)
 * T59-3: !capacity anti-pattern: capacity=0 must NOT be treated as unlimited
 * T59-4: storeDocument called BEFORE EventCreated enqueued (DNA-8 call order)
 * T59-5: VALIDATION_FAILURE shape uniform — same code for missing title, past date, missing tenantId
 * T59-6: matchingCriteria{} present in stored event schema
 * T59-7: Public event stored with knowledge_scope='GLOBAL'
 * T59-8: Private event stored with knowledge_scope='PRIVATE'
 * T59-9: PAYMENT_CONFIG_MISSING when isPaidEvent=true and no payment config found
 * MT-1:  Event record has tenant_id + connection_type + knowledge_scope
 * MT-2:  Tenant A event not returned when querying Tenant B store
 */

import 'reflect-metadata';
import {
  EventCreationOrchestrator,
  CreateEventInput,
} from '../../src/engine/flows/event-management/event-creation.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factories ─────────────────────────────────────────────────────────────

function makeMockDb(
  options: {
    existingEvents?: Array<Record<string, unknown>>;
    paymentConfigs?: Array<Record<string, unknown>>;
    maxEventsFromFreedom?: number | null;
  } = {},
) {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
  const callOrder: string[] = [];

  const existingEvents = options.existingEvents ?? [];
  const paymentConfigs = options.paymentConfigs ?? [];
  const maxEventsFromFreedom = options.maxEventsFromFreedom;

  return {
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      callOrder.push('searchDocuments');

      if (index === 'xiigen-events') {
        const matches = existingEvents.filter((e) =>
          Object.entries(filter).every(([k, v]) => v == null || e[k] === v),
        );
        return DataProcessResult.success(matches);
      }
      if (index === 'xiigen-payment-configs') {
        const matches = paymentConfigs.filter((c) =>
          Object.entries(filter).every(([k, v]) => v == null || c[k] === v),
        );
        return DataProcessResult.success(matches);
      }
      if (index === 'freedom_configs') {
        if (maxEventsFromFreedom !== null && maxEventsFromFreedom !== undefined) {
          return DataProcessResult.success([
            {
              config_key: 'flow03_max_events_per_organizer',
              config_value: String(maxEventsFromFreedom),
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
  } as any;
}

function makeMockQueue(callOrder: string[] = []) {
  const enqueued: Array<{ eventType: string; data: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (eventType: string, data: Record<string, unknown>) => {
      callOrder.push('enqueue'); // shared with DB callOrder — enables cross-mock ordering assertion
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

function makeService(dbOptions: Parameters<typeof makeMockDb>[0] = {}) {
  const db = makeMockDb(dbOptions);
  const queue = makeMockQueue(db._callOrder); // shared callOrder — DNA-8 order verifiable across mocks
  const svc = new EventCreationOrchestrator(db, queue);
  return { svc, db, queue };
}

const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

const BASE_INPUT: CreateEventInput = {
  title: 'Startup Networking Night',
  organizerId: 'org-001',
  tenantId: 'tenant-A',
  startDate: FUTURE_DATE,
  capacity: 50,
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('EventCreationOrchestrator (T59)', () => {
  it('T59-1: capacity=null stored — limitless registration allowed', async () => {
    const { svc, db } = makeService();

    const result = await svc.createEvent({ ...BASE_INPUT, capacity: null });

    expect(result.isSuccess).toBe(true);
    const stored = db._stored[0]?.doc as Record<string, unknown>;
    expect(stored['capacity']).toBeNull();
  });

  it('T59-2: capacity=0 stored — event closed (distinct from null)', async () => {
    const { svc, db } = makeService();

    const result = await svc.createEvent({ ...BASE_INPUT, capacity: 0 });

    expect(result.isSuccess).toBe(true);
    const stored = db._stored[0]?.doc as Record<string, unknown>;
    // capacity=0 must be stored as 0 (closed), NOT as null (unlimited) — IR-59-1
    expect(stored['capacity']).toBe(0);
    expect(stored['capacity']).not.toBeNull();
  });

  it('T59-3: !capacity anti-pattern would wrongly treat capacity=0 as unlimited — strict null check required', async () => {
    // This test confirms the service uses capacity === null, not !capacity.
    // If the service used !capacity, capacity=0 would be treated as unlimited (falsy).
    // The service stores capacity=0 as a closed event — only null is unlimited.
    const { svc, db } = makeService();

    const resultNull = await svc.createEvent({ ...BASE_INPUT, capacity: null });
    const resultZero = await svc.createEvent({ ...BASE_INPUT, capacity: 0 });

    expect(resultNull.isSuccess).toBe(true);
    expect(resultZero.isSuccess).toBe(true);

    const storedNull = db._stored[0]?.doc as Record<string, unknown>;
    const storedZero = db._stored[1]?.doc as Record<string, unknown>;

    // null stored as null (unlimited), 0 stored as 0 (closed) — never conflated
    expect(storedNull['capacity']).toBeNull();
    expect(storedZero['capacity']).toBe(0);
    expect(storedNull['capacity']).not.toBe(storedZero['capacity']);
  });

  it('T59-4: storeDocument called BEFORE EventCreated enqueued (DNA-8)', async () => {
    const { svc, db } = makeService();

    await svc.createEvent(BASE_INPUT);

    const callOrder = db._callOrder; // shared with queue mock — contains both 'storeDocument' and 'enqueue'
    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');

    expect(storeIdx).toBeGreaterThanOrEqual(0); // storeDocument was called
    expect(enqueueIdx).toBeGreaterThan(storeIdx); // DNA-8: enqueue AFTER store, not before
  });

  it('T59-4b: EventCreated NOT emitted when storeDocument fails', async () => {
    const db = makeMockDb();
    db.storeDocument.mockResolvedValueOnce(DataProcessResult.failure('DB_ERROR', 'disk full'));
    const queue = makeMockQueue();
    const svc = new EventCreationOrchestrator(db, queue);

    const result = await svc.createEvent(BASE_INPUT);

    expect(result.isSuccess).toBe(false);
    expect(queue._enqueued.length).toBe(0);
  });

  it('T59-5: VALIDATION_FAILURE shape uniform — missing title, past date, missing tenantId all same errorCode', async () => {
    const { svc } = makeService();
    const PAST_DATE = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    const missingTitle = await svc.createEvent({ ...BASE_INPUT, title: '' });
    const pastDate = await svc.createEvent({ ...BASE_INPUT, startDate: PAST_DATE });
    const missingTenant = await svc.createEvent({ ...BASE_INPUT, tenantId: '' });

    // All produce same error code — no field name leaked in discriminating shape (FLOW-01-RAG-03 principle)
    expect(missingTitle.isSuccess).toBe(false);
    expect(pastDate.isSuccess).toBe(false);
    expect(missingTenant.isSuccess).toBe(false);
    expect(missingTitle.errorCode).toBe('VALIDATION_FAILURE');
    expect(pastDate.errorCode).toBe('VALIDATION_FAILURE');
    expect(missingTenant.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('T59-6: matchingCriteria{} present in stored event schema', async () => {
    const { svc, db } = makeService();

    // Without explicit matchingCriteria
    await svc.createEvent(BASE_INPUT);
    const stored = db._stored[0]?.doc as Record<string, unknown>;

    expect(stored).toHaveProperty('matching_criteria');
    expect(typeof stored['matching_criteria']).toBe('object');
    expect(stored['matching_criteria']).not.toBeNull();
  });

  it('T59-7: Public event stored with knowledge_scope=GLOBAL', async () => {
    const { svc, db } = makeService();

    await svc.createEvent({ ...BASE_INPUT, isPrivate: false });

    const stored = db._stored[0]?.doc as Record<string, unknown>;
    expect(stored['knowledge_scope']).toBe('GLOBAL');
  });

  it('T59-8: Private event stored with knowledge_scope=PRIVATE', async () => {
    const { svc, db } = makeService();

    await svc.createEvent({ ...BASE_INPUT, isPrivate: true });

    const stored = db._stored[0]?.doc as Record<string, unknown>;
    expect(stored['knowledge_scope']).toBe('PRIVATE');
  });

  it('T59-8b: Paid event stored with knowledge_scope=PRIVATE regardless of isPrivate flag', async () => {
    const { svc, db } = makeService({
      paymentConfigs: [{ organizer_id: 'org-001', stripe_key: 'sk_test_xxx' }],
    });

    await svc.createEvent({ ...BASE_INPUT, isPrivate: false, isPaidEvent: true });

    const stored = db._stored[0]?.doc as Record<string, unknown>;
    expect(stored['knowledge_scope']).toBe('PRIVATE');
  });

  it('T59-9: PAYMENT_CONFIG_MISSING when isPaidEvent=true and no payment config found', async () => {
    const { svc } = makeService({ paymentConfigs: [] });

    const result = await svc.createEvent({ ...BASE_INPUT, isPaidEvent: true });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PAYMENT_CONFIG_MISSING');
  });

  it('T59-9b: isPaidEvent=true succeeds when payment config exists', async () => {
    const { svc } = makeService({
      paymentConfigs: [{ organizer_id: 'org-001', stripe_key: 'sk_test_xxx' }],
    });

    const result = await svc.createEvent({ ...BASE_INPUT, isPaidEvent: true });

    expect(result.isSuccess).toBe(true);
  });

  it('MT-1: Event record stored with tenant_id + connection_type + knowledge_scope', async () => {
    const { svc, db } = makeService();

    await svc.createEvent({ ...BASE_INPUT, tenantId: 'tenant-X' });

    const stored = db._stored[0]?.doc as Record<string, unknown>;
    expect(stored['tenant_id']).toBe('tenant-X');
    expect(stored['connection_type']).toBe('FLOW_SCOPED');
    expect(stored['knowledge_scope']).toBeDefined();
  });

  it('MT-2: Tenant A event not returned when querying Tenant B store', async () => {
    // Tenant A store already has an event from org-001
    const { svc: svcA } = makeService({
      existingEvents: [
        { event_id: 'evt-tenant-a', organizer_id: 'org-001', tenant_id: 'tenant-A' },
      ],
      maxEventsFromFreedom: 1, // rate limit = 1 so Tenant A is capped
    });
    // Tenant B store is empty
    const { svc: svcB } = makeService();

    const resultA = await svcA.createEvent({ ...BASE_INPUT, tenantId: 'tenant-A' });
    const resultB = await svcB.createEvent({ ...BASE_INPUT, tenantId: 'tenant-B' });

    // Tenant A is at rate limit — blocked
    expect(resultA.isSuccess).toBe(false);
    expect(resultA.errorCode).toBe('RATE_LIMIT_EXCEEDED');

    // Tenant B has no events — succeeds (tenant isolation)
    expect(resultB.isSuccess).toBe(true);
  });

  it('DNA-3: createEvent() returns DataProcessResult — never throws', async () => {
    const db = makeMockDb();
    db.searchDocuments.mockRejectedValue(new Error('network timeout'));
    const queue = makeMockQueue();
    const svc = new EventCreationOrchestrator(db, queue);

    const result = await svc.createEvent(BASE_INPUT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
  });
});
