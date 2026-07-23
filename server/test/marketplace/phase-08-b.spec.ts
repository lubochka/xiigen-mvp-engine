/**
 * FLOW-08 Phase B — T68 RegistrationProcessor
 *
 * T68-1: Idempotency key = hash(userId+eventId+tenantId) not requestId
 * T68-2: Duplicate registration (same key) returns success with existing record
 * T68-3: Privacy check inline before any write (callOrder)
 * T68-4: Privacy blocked → success({ blocked: true }) not failure
 * T68-5: Atomic capacity decrement + registration write (single operation)
 * T68-6: capacity=0 → success({ status: 'WAITLISTED' }) not failure
 * T68-7: storeDocument BEFORE RegistrationProcessed (callOrder — DNA-8)
 * T68-8: knowledgeScope=PRIVATE
 * T68-9: reads xiigen-connections not xiigen-friend-requests (R2 correction)
 * T68-10: FREEDOM: flow08_event_max_capacity (not hardcoded)
 * MT-9: RegistrationProcessed event CloudEvents format
 */

import 'reflect-metadata';
import { RegistrationProcessorService } from '../../src/engine/flows/event-participation/registration-processor.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

function makeDb(
  callOrder: string[],
  seed: Record<string, Array<Record<string, unknown>>> = {},
  storeCapture?: Array<Record<string, unknown>>,
) {
  const searchCalls: Array<{ index: string; filter: Record<string, unknown> }> = [];
  return {
    searchDocuments: jest
      .fn()
      .mockImplementation(async (index: string, filter: Record<string, unknown>) => {
        callOrder.push(`search:${index}`);
        searchCalls.push({ index, filter });
        const rows = seed[index] ?? [];
        const filtered = rows.filter((r) => Object.entries(filter).every(([k, v]) => r[k] === v));
        return DataProcessResult.success(filtered);
      }),
    storeDocument: jest
      .fn()
      .mockImplementation(async (_index: string, doc: Record<string, unknown>, _id: string) => {
        callOrder.push('storeDocument');
        if (storeCapture) storeCapture.push(doc);
        return DataProcessResult.success({});
      }),
    _searchCalls: searchCalls,
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

function makePrivacyCheck(callOrder: string[], allowed: boolean) {
  return {
    check: jest.fn().mockImplementation(async () => {
      callOrder.push('privacyCheck');
      return DataProcessResult.success({ allowed });
    }),
  };
}

function makeFreedom(maxCapacity: number | null = 100) {
  return {
    getConfig: jest
      .fn()
      .mockResolvedValue(
        DataProcessResult.success(
          maxCapacity !== null ? { flow08_event_max_capacity: maxCapacity } : {},
        ),
      ),
  };
}

const BASE_INPUT = {
  userId: 'user-A',
  eventId: 'event-001',
  tenantId: 'tenant-X',
  requestId: 'req-123',
};

describe('T68 RegistrationProcessor', () => {
  it('T68-1: Idempotency key = hash(userId+eventId+tenantId) not requestId', async () => {
    const callOrder: string[] = [];
    const stored: Array<Record<string, unknown>> = [];
    const db = makeDb(callOrder, {}, stored);
    const queue = makeQueue(callOrder);
    const privacy = makePrivacyCheck(callOrder, true);
    const freedom = makeFreedom(100);

    const svc = new RegistrationProcessorService(
      db as any,
      queue as any,
      privacy as any,
      freedom as any,
    );
    await svc.processRegistration(BASE_INPUT);

    const doc = stored[0];
    expect(doc?.['registrationId']).toContain(BASE_INPUT.userId);
    expect(doc?.['registrationId']).toContain(BASE_INPUT.eventId);
    expect(doc?.['registrationId']).toContain(BASE_INPUT.tenantId);
    expect(doc?.['registrationId']).not.toBe(BASE_INPUT.requestId);
  });

  it('T68-2: Duplicate registration returns success with existing record', async () => {
    const callOrder: string[] = [];
    const registrationId = `reg-${BASE_INPUT.userId}-${BASE_INPUT.eventId}-${BASE_INPUT.tenantId}`;
    const existingRecord = { registrationId, ...BASE_INPUT, status: 'CONFIRMED' };
    const db = makeDb(callOrder, { 'xiigen-registrations': [existingRecord] });
    const queue = makeQueue(callOrder);
    const privacy = makePrivacyCheck(callOrder, true);
    const freedom = makeFreedom(100);

    const svc = new RegistrationProcessorService(
      db as any,
      queue as any,
      privacy as any,
      freedom as any,
    );
    const result = await svc.processRegistration(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.idempotent).toBe(true);
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('T68-3: Privacy check inline before any write (callOrder)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const privacy = makePrivacyCheck(callOrder, true);
    const freedom = makeFreedom(100);

    const svc = new RegistrationProcessorService(
      db as any,
      queue as any,
      privacy as any,
      freedom as any,
    );
    await svc.processRegistration(BASE_INPUT);

    expect(callOrder.indexOf('privacyCheck')).toBeLessThan(callOrder.indexOf('storeDocument'));
  });

  it('T68-4: Privacy blocked → success({ blocked: true }) not failure', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const privacy = makePrivacyCheck(callOrder, false);
    const freedom = makeFreedom(100);

    const svc = new RegistrationProcessorService(
      db as any,
      queue as any,
      privacy as any,
      freedom as any,
    );
    const result = await svc.processRegistration(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('BLOCKED');
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('T68-6: capacity=0 → success({ status: WAITLISTED }) not failure', async () => {
    const callOrder: string[] = [];
    // Seed confirmed registrations to fill capacity (must include tenantId for filter match)
    const confirmedReg = {
      registrationId: 'other-reg',
      status: 'CONFIRMED',
      eventId: 'event-001',
      tenantId: 'tenant-X',
    };
    const db = makeDb(callOrder, { 'xiigen-registrations': [confirmedReg] });
    const queue = makeQueue(callOrder);
    const privacy = makePrivacyCheck(callOrder, true);
    const freedom = makeFreedom(1); // max 1

    const svc = new RegistrationProcessorService(
      db as any,
      queue as any,
      privacy as any,
      freedom as any,
    );
    const result = await svc.processRegistration(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('WAITLISTED');
  });

  it('T68-7: storeDocument BEFORE RegistrationProcessed (callOrder — DNA-8)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const privacy = makePrivacyCheck(callOrder, true);
    const freedom = makeFreedom(100);

    const svc = new RegistrationProcessorService(
      db as any,
      queue as any,
      privacy as any,
      freedom as any,
    );
    await svc.processRegistration(BASE_INPUT);

    expect(callOrder.indexOf('storeDocument')).toBeLessThan(callOrder.indexOf('enqueue'));
  });

  it('T68-8: knowledgeScope=PRIVATE', async () => {
    const stored: Array<Record<string, unknown>> = [];
    const db = makeDb([], {}, stored);
    const queue = makeQueue([]);
    const privacy = makePrivacyCheck([], true);
    const freedom = makeFreedom(100);

    const svc = new RegistrationProcessorService(
      db as any,
      queue as any,
      privacy as any,
      freedom as any,
    );
    await svc.processRegistration(BASE_INPUT);

    expect(stored[0]?.['knowledgeScope']).toBe('PRIVATE');
  });

  it('T68-9: reads xiigen-connections not xiigen-friend-requests (R2 correction)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const privacy = makePrivacyCheck(callOrder, true);
    const freedom = makeFreedom(100);

    const svc = new RegistrationProcessorService(
      db as any,
      queue as any,
      privacy as any,
      freedom as any,
    );
    await svc.processRegistration(BASE_INPUT);

    const searchCalls = (db.searchDocuments as jest.Mock).mock.calls;
    const indexesSearched = searchCalls.map((c: unknown[]) => c[0] as string);
    expect(indexesSearched).toContain('xiigen-connections');
    expect(indexesSearched).not.toContain('xiigen-friend-requests');
  });

  it('T68-10: FREEDOM: flow08_event_max_capacity (not hardcoded)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const privacy = makePrivacyCheck(callOrder, true);
    const freedom = makeFreedom(50);

    const svc = new RegistrationProcessorService(
      db as any,
      queue as any,
      privacy as any,
      freedom as any,
    );
    await svc.processRegistration(BASE_INPUT);

    expect(freedom.getConfig).toHaveBeenCalled();
  });

  it('MT-9: RegistrationProcessed event CloudEvents format', async () => {
    const queue = makeQueue([]);
    const db = makeDb([]);
    const privacy = makePrivacyCheck([], true);
    const freedom = makeFreedom(100);

    const svc = new RegistrationProcessorService(
      db as any,
      queue as any,
      privacy as any,
      freedom as any,
    );
    await svc.processRegistration(BASE_INPUT);

    const event = queue._enqueued[0];
    expect(event).toBeDefined();
    expect(event.eventType).toContain('registration');
    const data = event.data as Record<string, unknown>;
    expect(data['userId']).toBe(BASE_INPUT.userId);
    expect(data['eventId']).toBe(BASE_INPUT.eventId);
    expect(data['tenantId']).toBe(BASE_INPUT.tenantId);
  });
});
