/**
 * HumanResolutionCapture — Outbox Tests (T383, DNA-8).
 *
 * Tests:
 *   OB-1: storeDocument called BEFORE enqueue
 *   OB-2: enqueue NOT called when storeDocument fails
 *   OB-3: event payload contains decision_id, session_id, decision, actor_id
 *   OB-4: FORCE_PROCEED event carries force_proceed=true
 *   OB-5: SESSION_NOT_FOUND — neither store nor enqueue called
 */

import { HumanResolutionCapture } from '../../src/engine/flows/bfa-conflict-arbitration/human-resolution-capture.service';
import { DecisionOption } from '../../src/engine/flows/bfa-conflict-arbitration/impact-report-generator.service';
import { ArbitrationState } from '../../src/engine/flows/bfa-conflict-arbitration/arbitration-state-machine.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-ob-cap';
const ACTOR = 'actor-ob';
const LONG_RATIONALE = 'This is a very long rationale of more than fifty characters for testing.';

function makePendingSession(sessionId: string): Record<string, unknown> {
  return { session_id: sessionId, tenant_id: TENANT, state: ArbitrationState.PENDING_RESOLUTION };
}

function makeOrderedDb(sessionId: string) {
  const callOrder: string[] = [];
  const decisions = new Map<string, Record<string, unknown>>();

  return {
    callOrder,
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) => {
      callOrder.push('storeDocument');
      const key = id ?? 'doc-1';
      decisions.set(key, { ...doc, _id: key });
      return DataProcessResult.success({ ...doc, _id: key });
    }),
    searchDocuments: jest.fn(async (_i: string, filters: Record<string, unknown>) => {
      if ((_i as string).includes('sessions') && filters['session_id'] === sessionId) {
        return DataProcessResult.success([makePendingSession(sessionId)]);
      }
      if ((_i as string).includes('decisions')) {
        const sid = filters['session_id'] as string;
        const existing = [...decisions.values()].find((d) => d['session_id'] === sid);
        return DataProcessResult.success(existing ? [existing] : []);
      }
      return DataProcessResult.success([]);
    }),
  } as any;
}

function makeOrderedQueue(callOrder: string[]) {
  const emitted: any[] = [];
  return {
    enqueue: jest.fn(async (evt: string, data: Record<string, unknown>) => {
      callOrder.push('enqueue');
      emitted.push({ evt, data });
      return DataProcessResult.success('msg-1');
    }),
    _emitted: emitted,
  } as any;
}

function makeFailingDb(sessionId: string) {
  return {
    storeDocument: jest.fn(async () => DataProcessResult.failure('DB_ERROR', 'Write failed')),
    searchDocuments: jest.fn(async (_i: string, filters: Record<string, unknown>) => {
      if ((_i as string).includes('sessions') && filters['session_id'] === sessionId) {
        return DataProcessResult.success([makePendingSession(sessionId)]);
      }
      return DataProcessResult.success([]);
    }),
  } as any;
}

describe('HumanResolutionCapture — Outbox (T383, DNA-8)', () => {
  it('OB-1: storeDocument called BEFORE enqueue', async () => {
    const db = makeOrderedDb('sess-ob1');
    const queue = makeOrderedQueue(db.callOrder);
    const svc = new HumanResolutionCapture(db, queue);

    await svc.captureDecision('sess-ob1', TENANT, DecisionOption.APPROVE, ACTOR, []);

    const storeIdx = db.callOrder.indexOf('storeDocument');
    const enqueueIdx = db.callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('OB-2: enqueue NOT called when storeDocument fails', async () => {
    const db = makeFailingDb('sess-ob2');
    const queue = makeOrderedQueue([]);
    const svc = new HumanResolutionCapture(db, queue);

    const r = await svc.captureDecision('sess-ob2', TENANT, DecisionOption.APPROVE, ACTOR, []);

    expect(r.isSuccess).toBe(false);
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('OB-3: event payload contains decision_id, session_id, decision, actor_id', async () => {
    const db = makeOrderedDb('sess-ob3');
    const queue = makeOrderedQueue(db.callOrder);
    const svc = new HumanResolutionCapture(db, queue);

    await svc.captureDecision('sess-ob3', TENANT, DecisionOption.REJECT, ACTOR, []);

    const evt = queue._emitted.find((e: any) => e.evt === 'arbitration.decision.captured');
    expect(evt).toBeDefined();
    expect(evt.data).toHaveProperty('session_id', 'sess-ob3');
    expect(evt.data).toHaveProperty('decision', DecisionOption.REJECT);
    expect(evt.data).toHaveProperty('actor_id', ACTOR);
    expect(evt.data).toHaveProperty('decision_id');
  });

  it('OB-4: FORCE_PROCEED event carries force_proceed=true', async () => {
    const db = makeOrderedDb('sess-ob4');
    const queue = makeOrderedQueue(db.callOrder);
    const svc = new HumanResolutionCapture(db, queue);

    await svc.captureDecision(
      'sess-ob4',
      TENANT,
      DecisionOption.FORCE_PROCEED,
      ACTOR,
      ['bfa:override'],
      LONG_RATIONALE,
    );

    const evt = queue._emitted.find((e: any) => e.evt === 'arbitration.decision.captured');
    expect(evt.data).toHaveProperty('force_proceed', true);
  });

  it('OB-5: SESSION_NOT_FOUND — neither store nor enqueue called', async () => {
    const db: any = {
      storeDocument: jest.fn(),
      searchDocuments: jest.fn(async () => DataProcessResult.success([])),
    };
    const queue = makeOrderedQueue([]);
    const svc = new HumanResolutionCapture(db, queue);

    await svc.captureDecision('ghost', TENANT, DecisionOption.APPROVE, ACTOR, []);

    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});
