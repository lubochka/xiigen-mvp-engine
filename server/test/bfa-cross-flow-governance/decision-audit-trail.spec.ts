/**
 * DecisionAuditTrail — Unit Tests (T385).
 *
 * Tests:
 *   DAT-1:  missing sessionId returns failure
 *   DAT-2:  missing tenantId returns UNSCOPED_QUERY failure
 *   DAT-3:  missing actorId returns failure
 *   DAT-4:  non-FORCE_PROCEED → single audit entry
 *   DAT-5:  FORCE_PROCEED → two entries (CF-498)
 *   DAT-6:  second entry has elevatedRisk=true (CF-498)
 *   DAT-7:  storeDocument called BEFORE enqueue for each entry (DNA-8)
 *   DAT-8:  enqueue NOT called when storeDocument fails
 *   DAT-9:  entry payload contains all required fields
 *   DAT-10: entryCount matches entries array length
 */

import { DecisionAuditTrail } from '../../src/engine/flows/bfa-conflict-arbitration/decision-audit-trail.service';
import { DecisionOption } from '../../src/engine/flows/bfa-conflict-arbitration/impact-report-generator.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-dat-test';
const ACTOR = 'actor-dat';
const SESSION = 'sess-dat-1';

function makeDb() {
  const docs = new Map<string, Record<string, unknown>>();
  const callOrder: string[] = [];
  return {
    callOrder,
    docs,
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) => {
      callOrder.push('storeDocument');
      const key = id ?? 'doc-1';
      docs.set(key, { ...doc, _id: key });
      return DataProcessResult.success({ ...doc, _id: key });
    }),
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
  } as any;
}

function makeFailingDb() {
  return {
    storeDocument: jest.fn(async () => DataProcessResult.failure('DB_ERROR', 'Write failed')),
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
  } as any;
}

function makeQueue(callOrder?: string[]) {
  const emitted: any[] = [];
  return {
    enqueue: jest.fn(async (evt: string, data: Record<string, unknown>) => {
      if (callOrder) callOrder.push('enqueue');
      emitted.push({ evt, data });
      return DataProcessResult.success('msg-1');
    }),
    _emitted: emitted,
  } as any;
}

describe('DecisionAuditTrail — Unit (T385)', () => {
  it('DAT-1: missing sessionId returns failure', async () => {
    const svc = new DecisionAuditTrail(makeDb(), makeQueue());
    const r = await svc.logEntry('', TENANT, DecisionOption.APPROVE, ACTOR);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SESSION_ID');
  });

  it('DAT-2: missing tenantId returns UNSCOPED_QUERY failure', async () => {
    const svc = new DecisionAuditTrail(makeDb(), makeQueue());
    const r = await svc.logEntry(SESSION, '', DecisionOption.APPROVE, ACTOR);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('DAT-3: missing actorId returns failure', async () => {
    const svc = new DecisionAuditTrail(makeDb(), makeQueue());
    const r = await svc.logEntry(SESSION, TENANT, DecisionOption.APPROVE, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_ACTOR_ID');
  });

  it('DAT-4: non-FORCE_PROCEED → single audit entry', async () => {
    for (const dec of [DecisionOption.APPROVE, DecisionOption.REJECT, DecisionOption.DEFER]) {
      const svc = new DecisionAuditTrail(makeDb(), makeQueue());
      const r = await svc.logEntry(SESSION, TENANT, dec, ACTOR);
      expect(r.isSuccess).toBe(true);
      expect(r.data!.entryCount).toBe(1);
      expect(r.data!.entries).toHaveLength(1);
    }
  });

  it('DAT-5: FORCE_PROCEED → two entries (CF-498)', async () => {
    const svc = new DecisionAuditTrail(makeDb(), makeQueue());
    const r = await svc.logEntry(SESSION, TENANT, DecisionOption.FORCE_PROCEED, ACTOR);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.entryCount).toBe(2);
    expect(r.data!.entries).toHaveLength(2);
  });

  it('DAT-6: second entry has elevatedRisk=true (CF-498)', async () => {
    const svc = new DecisionAuditTrail(makeDb(), makeQueue());
    const r = await svc.logEntry(SESSION, TENANT, DecisionOption.FORCE_PROCEED, ACTOR);
    expect(r.isSuccess).toBe(true);
    const standard = r.data!.entries[0];
    const elevated = r.data!.entries[1];
    expect(standard.elevatedRisk).toBe(false);
    expect(elevated.elevatedRisk).toBe(true);
  });

  it('DAT-7: storeDocument called BEFORE enqueue for each entry (DNA-8)', async () => {
    const db = makeDb();
    const queue = makeQueue(db.callOrder);
    const svc = new DecisionAuditTrail(db, queue);

    await svc.logEntry(SESSION, TENANT, DecisionOption.APPROVE, ACTOR);

    const storeIdx = db.callOrder.indexOf('storeDocument');
    const enqueueIdx = db.callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('DAT-8: enqueue NOT called when storeDocument fails', async () => {
    const db = makeFailingDb();
    const queue = makeQueue();
    const svc = new DecisionAuditTrail(db, queue);

    const r = await svc.logEntry(SESSION, TENANT, DecisionOption.APPROVE, ACTOR);
    expect(r.isSuccess).toBe(false);
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('DAT-9: entry payload contains all required fields', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new DecisionAuditTrail(db, queue);

    const r = await svc.logEntry(SESSION, TENANT, DecisionOption.APPROVE, ACTOR, { note: 'test' });
    expect(r.isSuccess).toBe(true);
    const entry = r.data!.entries[0];
    expect(entry.entryId).toBeDefined();
    expect(entry.sessionId).toBe(SESSION);
    expect(entry.tenantId).toBe(TENANT);
    expect(entry.decision).toBe(DecisionOption.APPROVE);
    expect(entry.actorId).toBe(ACTOR);
    expect(entry.elevatedRisk).toBe(false);
    expect(entry.recordedAt).toBeDefined();
  });

  it('DAT-10: entryCount matches entries array length', async () => {
    const svc = new DecisionAuditTrail(makeDb(), makeQueue());
    const r = await svc.logEntry(SESSION, TENANT, DecisionOption.FORCE_PROCEED, ACTOR);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.entryCount).toBe(r.data!.entries.length);
  });
});
