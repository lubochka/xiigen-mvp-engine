/**
 * HumanTaskAuditTrail — Unit Tests (T421).
 *
 * Tests:
 *   HTAT-1:  missing tenantId → UNSCOPED_QUERY
 *   HTAT-2:  missing eventType → MISSING_EVENT_TYPE
 *   HTAT-3:  missing entityId → MISSING_ENTITY_ID
 *   HTAT-4:  missing actorId → MISSING_ACTOR_ID
 *   HTAT-5:  valid args → success
 *   HTAT-6:  auditId is non-empty string
 *   HTAT-7:  recordedAt is ISO string
 *   HTAT-8:  eventType echoed in result
 *   HTAT-9:  storeDocument() called BEFORE enqueue() — DNA-8
 *   HTAT-10: DB store failure → error propagated
 *   HTAT-11: audit.event.recorded event emitted
 *   HTAT-12: storeDocument called once per record() call (insert-only)
 */

import { HumanTaskAuditTrail } from '../../src/engine/flows/human-approval-gate/human-task-audit-trail.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-htat-test';
const EVENT_TYPE = 'APPROVAL_GRANTED';
const ENTITY_ID = 'task-789';
const ACTOR_ID = 'user-admin';

function makeDb() {
  return {
    storeDocument: jest.fn(async (_i: string, doc: any, id?: string) =>
      DataProcessResult.success({ ...doc, _id: id ?? 'x' }),
    ),
  } as any;
}

function makeFailingDb() {
  return {
    storeDocument: jest.fn(async () => DataProcessResult.failure('STORAGE_FAILED', 'write error')),
  } as any;
}

function makeQueue() {
  const events: any[] = [];
  return {
    enqueue: jest.fn(async (evt: string, data: any) => {
      events.push({ evt, data });
      return DataProcessResult.success('m');
    }),
    _events: events,
  } as any;
}

describe('HumanTaskAuditTrail — Unit (T421)', () => {
  it('HTAT-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new HumanTaskAuditTrail(makeDb(), makeQueue());
    const r = await svc.record('', EVENT_TYPE, ENTITY_ID, ACTOR_ID);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('HTAT-2: missing eventType → MISSING_EVENT_TYPE', async () => {
    const svc = new HumanTaskAuditTrail(makeDb(), makeQueue());
    const r = await svc.record(TENANT, '', ENTITY_ID, ACTOR_ID);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_EVENT_TYPE');
  });

  it('HTAT-3: missing entityId → MISSING_ENTITY_ID', async () => {
    const svc = new HumanTaskAuditTrail(makeDb(), makeQueue());
    const r = await svc.record(TENANT, EVENT_TYPE, '', ACTOR_ID);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_ENTITY_ID');
  });

  it('HTAT-4: missing actorId → MISSING_ACTOR_ID', async () => {
    const svc = new HumanTaskAuditTrail(makeDb(), makeQueue());
    const r = await svc.record(TENANT, EVENT_TYPE, ENTITY_ID, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_ACTOR_ID');
  });

  it('HTAT-5: valid args → success', async () => {
    const svc = new HumanTaskAuditTrail(makeDb(), makeQueue());
    const r = await svc.record(TENANT, EVENT_TYPE, ENTITY_ID, ACTOR_ID);
    expect(r.isSuccess).toBe(true);
  });

  it('HTAT-6: auditId is non-empty string', async () => {
    const svc = new HumanTaskAuditTrail(makeDb(), makeQueue());
    const r = await svc.record(TENANT, EVENT_TYPE, ENTITY_ID, ACTOR_ID);
    expect(r.data!.auditId.length).toBeGreaterThan(0);
  });

  it('HTAT-7: recordedAt is ISO string', async () => {
    const svc = new HumanTaskAuditTrail(makeDb(), makeQueue());
    const r = await svc.record(TENANT, EVENT_TYPE, ENTITY_ID, ACTOR_ID);
    expect(r.data!.recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('HTAT-8: eventType echoed in result', async () => {
    const svc = new HumanTaskAuditTrail(makeDb(), makeQueue());
    const r = await svc.record(TENANT, EVENT_TYPE, ENTITY_ID, ACTOR_ID);
    expect(r.data!.eventType).toBe(EVENT_TYPE);
  });

  it('HTAT-9: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('m');
      }),
    } as any;
    const svc = new HumanTaskAuditTrail(db, queue);
    await svc.record(TENANT, EVENT_TYPE, ENTITY_ID, ACTOR_ID);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('HTAT-10: DB store failure → error propagated', async () => {
    const svc = new HumanTaskAuditTrail(makeFailingDb(), makeQueue());
    const r = await svc.record(TENANT, EVENT_TYPE, ENTITY_ID, ACTOR_ID);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('HTAT-11: audit.event.recorded event emitted', async () => {
    const queue = makeQueue();
    const svc = new HumanTaskAuditTrail(makeDb(), queue);
    await svc.record(TENANT, EVENT_TYPE, ENTITY_ID, ACTOR_ID);
    expect(queue.enqueue).toHaveBeenCalledWith('audit.event.recorded', expect.any(Object));
  });

  it('HTAT-12: storeDocument called once per record() call (insert-only)', async () => {
    const db = makeDb();
    const svc = new HumanTaskAuditTrail(db, makeQueue());
    await svc.record(TENANT, EVENT_TYPE, ENTITY_ID, ACTOR_ID);
    expect(db.storeDocument).toHaveBeenCalledTimes(1);
  });
});
