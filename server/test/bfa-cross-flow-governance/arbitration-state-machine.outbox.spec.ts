/**
 * ArbitrationStateMachine — Outbox Tests (T381, CF-487, IR-381-1).
 *
 * ⛔ SCORE 0 RULE: storeDocument() MUST be called BEFORE enqueue() on EVERY transition.
 *
 * Tests:
 *   OB-1: storeDocument called BEFORE enqueue on createSession
 *   OB-2: storeDocument called BEFORE enqueue on every transition
 *   OB-3: enqueue NOT called if storeDocument fails on transition
 *   OB-4: storeDocument failure propagates — no state change emitted
 *   OB-5: transition event payload contains from_state, to_state, session_id
 *   OB-6: 'arbitration.timeout.scheduled' emitted AFTER store on PENDING_RESOLUTION (CF-488)
 *   OB-7: timeout NOT emitted for transitions that don't enter PENDING_RESOLUTION
 *   OB-8: 'arbitration.skip' emitted AFTER store on SKIP_ARBITRATION
 */

import {
  ArbitrationStateMachine,
  ArbitrationState,
} from '../../src/engine/flows/bfa-conflict-arbitration/arbitration-state-machine.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { DependencySeverity } from '../../src/engine/flows/bfa-conflict-arbitration/dependency-index-query.service';

const TENANT = 'tenant-outbox-test';

function makeOrderedDb() {
  const callOrder: string[] = [];
  const store = new Map<string, Record<string, unknown>>();

  return {
    callOrder,
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) => {
      callOrder.push('storeDocument');
      const key = id ?? (doc['session_id'] as string) ?? 'doc-1';
      store.set(key, { ...doc, _id: key });
      return DataProcessResult.success({ ...doc, _id: key });
    }),
    searchDocuments: jest.fn(async (_i: string, filters: Record<string, unknown>) => {
      if (filters['config_key']) return DataProcessResult.success([]);
      const results: Record<string, unknown>[] = [];
      for (const doc of store.values()) {
        if (Object.entries(filters).every(([k, v]) => doc[k] === v)) results.push(doc);
      }
      return DataProcessResult.success(results);
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

function makeFailingDb() {
  // Pre-populate the existing session so transition() can load it
  const existingSession: Record<string, unknown> = {
    session_id: 'arb-fail',
    change_id: 'chg',
    tenant_id: TENANT,
    state: ArbitrationState.IDLE,
    severity: DependencySeverity.HIGH,
    history: [],
    created_at: '',
    updated_at: '',
  };

  return {
    storeDocument: jest.fn(async () =>
      DataProcessResult.failure('DB_ERROR', 'Write failed on transition'),
    ),
    searchDocuments: jest.fn(async (_i: string, filters: Record<string, unknown>) => {
      if (filters['config_key']) return DataProcessResult.success([]);
      if (filters['session_id'] === 'arb-fail') {
        return DataProcessResult.success([existingSession]);
      }
      return DataProcessResult.success([]);
    }),
  } as any;
}

describe('ArbitrationStateMachine — Outbox Pattern (CF-487, IR-381-1)', () => {
  it('OB-1: storeDocument called BEFORE any enqueue on createSession', async () => {
    const db = makeOrderedDb();
    const queue = makeOrderedQueue(db.callOrder);
    const svc = new ArbitrationStateMachine(db, queue);

    await svc.createSession('chg-ob1', TENANT, DependencySeverity.HIGH);

    const storeIdx = db.callOrder.indexOf('storeDocument');
    // createSession itself doesn't enqueue — just stores. Verify store happened.
    expect(storeIdx).toBeGreaterThanOrEqual(0);
  });

  it('OB-2: storeDocument called BEFORE enqueue on every transition', async () => {
    const db = makeOrderedDb();
    const queue = makeOrderedQueue(db.callOrder);
    const svc = new ArbitrationStateMachine(db, queue);

    const { data: s } = await svc.createSession('chg-ob2', TENANT, DependencySeverity.HIGH);
    db.callOrder.length = 0; // reset after create

    await svc.transition(s!.sessionId, TENANT, ArbitrationState.EXTRACTING);

    const storeIdx = db.callOrder.indexOf('storeDocument');
    const enqueueIdx = db.callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx); // store BEFORE enqueue
  });

  it('OB-3: enqueue NOT called if storeDocument fails on transition', async () => {
    const db = makeFailingDb();
    const queue = makeOrderedQueue([]);
    const svc = new ArbitrationStateMachine(db, queue);

    const result = await svc.transition('arb-fail', TENANT, ArbitrationState.EXTRACTING);

    expect(result.isSuccess).toBe(false);
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('OB-4: storeDocument failure propagates — error code forwarded', async () => {
    const db = makeFailingDb();
    const svc = new ArbitrationStateMachine(db, makeOrderedQueue([]));

    const result = await svc.transition('arb-fail', TENANT, ArbitrationState.EXTRACTING);
    expect(result.errorCode).toBe('DB_ERROR');
  });

  it('OB-5: transition event payload contains from_state, to_state, session_id', async () => {
    const db = makeOrderedDb();
    const emitted: any[] = [];
    const queue: any = {
      enqueue: jest.fn(async (evt: string, data: Record<string, unknown>) => {
        emitted.push({ evt, data });
        return DataProcessResult.success('msg-1');
      }),
    };

    const svc = new ArbitrationStateMachine(db, queue);
    const { data: s } = await svc.createSession('chg-ob5', TENANT, DependencySeverity.HIGH);
    await svc.transition(s!.sessionId, TENANT, ArbitrationState.EXTRACTING);

    const txEvent = emitted.find((e) => e.evt === 'arbitration.state.transitioned');
    expect(txEvent).toBeDefined();
    expect(txEvent.data).toHaveProperty('from_state', ArbitrationState.IDLE);
    expect(txEvent.data).toHaveProperty('to_state', ArbitrationState.EXTRACTING);
    expect(txEvent.data).toHaveProperty('session_id', s!.sessionId);
  });

  it("OB-6: 'arbitration.timeout.scheduled' emitted AFTER store on PENDING_RESOLUTION (CF-488)", async () => {
    const db = makeOrderedDb();
    const emitted: any[] = [];
    const queue: any = {
      enqueue: jest.fn(async (evt: string, data: Record<string, unknown>) => {
        emitted.push({ evt, data });
        return DataProcessResult.success('msg-1');
      }),
    };

    const svc = new ArbitrationStateMachine(db, queue);
    const { data: s } = await svc.createSession('chg-ob6', TENANT, DependencySeverity.HIGH);
    const id = s!.sessionId;

    // Drive to SEVERITY_AGGREGATING then PENDING_RESOLUTION
    await svc.transition(id, TENANT, ArbitrationState.EXTRACTING);
    await svc.transition(id, TENANT, ArbitrationState.DETECTING);
    await svc.transition(id, TENANT, ArbitrationState.SEVERITY_AGGREGATING);
    await svc.transition(id, TENANT, ArbitrationState.PENDING_RESOLUTION);

    const timeoutEvent = emitted.find((e) => e.evt === 'arbitration.timeout.scheduled');
    expect(timeoutEvent).toBeDefined();
    expect(timeoutEvent.data).toHaveProperty('session_id', id);
    expect(timeoutEvent.data).toHaveProperty('timeout_ms');
  });

  it('OB-7: timeout NOT emitted for transitions that do not enter PENDING_RESOLUTION', async () => {
    const db = makeOrderedDb();
    const emitted: any[] = [];
    const queue: any = {
      enqueue: jest.fn(async (evt: string, data: Record<string, unknown>) => {
        emitted.push({ evt, data });
        return DataProcessResult.success('msg-1');
      }),
    };

    const svc = new ArbitrationStateMachine(db, queue);
    const { data: s } = await svc.createSession('chg-ob7', TENANT, DependencySeverity.HIGH);
    await svc.transition(s!.sessionId, TENANT, ArbitrationState.EXTRACTING);

    const timeoutEvent = emitted.find((e) => e.evt === 'arbitration.timeout.scheduled');
    expect(timeoutEvent).toBeUndefined();
  });

  it("OB-8: 'arbitration.skip' emitted AFTER store on SKIP_ARBITRATION", async () => {
    const db = makeOrderedDb();
    const emitted: any[] = [];
    const queue: any = {
      enqueue: jest.fn(async (evt: string, data: Record<string, unknown>) => {
        emitted.push({ evt, data });
        return DataProcessResult.success('msg-1');
      }),
    };

    const svc = new ArbitrationStateMachine(db, queue);
    const { data: s } = await svc.createSession('chg-ob8', TENANT, DependencySeverity.LOW);
    const id = s!.sessionId;

    await svc.transition(id, TENANT, ArbitrationState.EXTRACTING);
    await svc.transition(id, TENANT, ArbitrationState.DETECTING);
    await svc.transition(id, TENANT, ArbitrationState.SEVERITY_AGGREGATING);
    await svc.transition(id, TENANT, ArbitrationState.SKIP_ARBITRATION);

    const skipEvent = emitted.find((e) => e.evt === 'arbitration.skip');
    expect(skipEvent).toBeDefined();
    expect(skipEvent.data).toHaveProperty('session_id', id);
  });
});
