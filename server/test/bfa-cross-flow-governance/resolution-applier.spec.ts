/**
 * ResolutionApplier — Unit Tests (T384).
 *
 * Tests:
 *   RA-1:  missing sessionId returns failure
 *   RA-2:  missing tenantId returns UNSCOPED_QUERY failure
 *   RA-3:  no captured decision returns NO_DECISION_FOUND (IR-384-1)
 *   RA-4:  APPROVE → final state RESOLVED
 *   RA-5:  REJECT → final state REJECTED
 *   RA-6:  DEFER → deferred=true, finalState=null, no FSM transition
 *   RA-7:  FORCE_PROCEED → final state RESOLVED with forceProceed=true
 *   RA-8:  storeDocument called BEFORE enqueue (DNA-8)
 *   RA-9:  enqueue NOT called when ResolutionApplier storeDocument fails
 *   RA-10: resolution event contains session_id, decision, final_state
 *   RA-11: DEFER emits arbitration.resolution.deferred event
 *   RA-12: APPROVE/REJECT emit arbitration.resolution.applied event
 */

import { ResolutionApplier } from '../../src/engine/flows/bfa-conflict-arbitration/resolution-applier.service';
import {
  ArbitrationStateMachine,
  ArbitrationState,
} from '../../src/engine/flows/bfa-conflict-arbitration/arbitration-state-machine.service';
import { DecisionOption } from '../../src/engine/flows/bfa-conflict-arbitration/impact-report-generator.service';
import { DependencySeverity } from '../../src/engine/flows/bfa-conflict-arbitration/dependency-index-query.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-ra-test';

/**
 * Index-aware in-memory DB shared by both FSM and ResolutionApplier.
 * Uses separate Maps per index so session docs don't pollute decision lookups.
 */
function makeSharedDb(decision: DecisionOption, sessionId: string) {
  const sessions = new Map<string, Record<string, unknown>>();
  const decisions = new Map<string, Record<string, unknown>>();
  const resolutions = new Map<string, Record<string, unknown>>();

  const decisionId = `dec-test-${sessionId}`;

  sessions.set(sessionId, {
    session_id: sessionId,
    change_id: 'chg-test',
    tenant_id: TENANT,
    state: ArbitrationState.PENDING_RESOLUTION,
    severity: DependencySeverity.HIGH,
    history: [],
    created_at: '',
    updated_at: '',
  });

  decisions.set(decisionId, {
    decision_id: decisionId,
    session_id: sessionId,
    tenant_id: TENANT,
    decision,
    force_proceed: decision === DecisionOption.FORCE_PROCEED,
    actor_id: 'actor-ra',
    captured_at: '',
  });

  function mapFor(index: string) {
    if (index.includes('session')) return sessions;
    if (index.includes('decision')) return decisions;
    if (index.includes('resolution')) return resolutions;
    return null;
  }

  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id?: string) => {
      const key =
        id ??
        (doc['session_id'] as string) ??
        (doc['decision_id'] as string) ??
        (doc['resolution_id'] as string) ??
        'doc-1';
      const m = mapFor(index);
      if (m) m.set(key, { ...doc, _id: key });
      return DataProcessResult.success({ ...doc, _id: key });
    }),
    searchDocuments: jest.fn(async (index: string, filters: Record<string, unknown>) => {
      if (filters['config_key']) return DataProcessResult.success([]);
      const m = mapFor(index);
      if (!m) return DataProcessResult.success([]);
      const results: Record<string, unknown>[] = [];
      for (const doc of m.values()) {
        if (Object.entries(filters).every(([k, v]) => doc[k] === v)) results.push(doc);
      }
      return DataProcessResult.success(results);
    }),
    _sessions: sessions,
  } as any;
}

function makeNoDecisionDb(sessionId: string) {
  const sessions = new Map<string, Record<string, unknown>>();
  sessions.set(sessionId, {
    session_id: sessionId,
    change_id: 'chg-nd',
    tenant_id: TENANT,
    state: ArbitrationState.PENDING_RESOLUTION,
    severity: DependencySeverity.HIGH,
    history: [],
    created_at: '',
    updated_at: '',
  });
  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) =>
      DataProcessResult.success({ ...doc, _id: id ?? 'doc-1' }),
    ),
    searchDocuments: jest.fn(async (index: string, filters: Record<string, unknown>) => {
      if (filters['config_key']) return DataProcessResult.success([]);
      if (index.includes('session') && filters['session_id'] === sessionId) {
        return DataProcessResult.success([sessions.get(sessionId)!]);
      }
      if (index.includes('session')) {
        // allow FSM to write back updated session state
        const results: Record<string, unknown>[] = [];
        for (const doc of sessions.values()) {
          if (Object.entries(filters).every(([k, v]) => doc[k] === v)) results.push(doc);
        }
        return DataProcessResult.success(results);
      }
      return DataProcessResult.success([]); // no decision found
    }),
  } as any;
}

function makeQueue() {
  const emitted: any[] = [];
  return {
    enqueue: jest.fn(async (evt: string, data: Record<string, unknown>) => {
      emitted.push({ evt, data });
      return DataProcessResult.success('msg-1');
    }),
    _emitted: emitted,
  } as any;
}

function makeSvc(decision: DecisionOption, sessionId: string) {
  const db = makeSharedDb(decision, sessionId);
  const queue = makeQueue();
  const fsm = new ArbitrationStateMachine(db, queue);
  const svc = new ResolutionApplier(db, queue, fsm);
  return { db, queue, fsm, svc };
}

describe('ResolutionApplier — Unit (T384)', () => {
  it('RA-1: missing sessionId returns failure', async () => {
    const { svc } = makeSvc(DecisionOption.APPROVE, 'x');
    const r = await svc.applyResolution('', TENANT);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SESSION_ID');
  });

  it('RA-2: missing tenantId returns UNSCOPED_QUERY failure', async () => {
    const { svc } = makeSvc(DecisionOption.APPROVE, 'x');
    const r = await svc.applyResolution('sess-ra2', '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('RA-3: no captured decision returns NO_DECISION_FOUND (IR-384-1)', async () => {
    const db = makeNoDecisionDb('sess-ra3');
    const queue = makeQueue();
    const fsm = new ArbitrationStateMachine(db, queue);
    const svc = new ResolutionApplier(db, queue, fsm);

    const r = await svc.applyResolution('sess-ra3', TENANT);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('NO_DECISION_FOUND');
    expect(r.errorMessage).toContain('IR-384-1');
  });

  it('RA-4: APPROVE → finalState=RESOLVED, deferred=false', async () => {
    const { svc } = makeSvc(DecisionOption.APPROVE, 'sess-ra4');
    const r = await svc.applyResolution('sess-ra4', TENANT);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.finalState).toBe(ArbitrationState.RESOLVED);
    expect(r.data!.deferred).toBe(false);
    expect(r.data!.decision).toBe(DecisionOption.APPROVE);
  });

  it('RA-5: REJECT → finalState=REJECTED', async () => {
    const { svc } = makeSvc(DecisionOption.REJECT, 'sess-ra5');
    const r = await svc.applyResolution('sess-ra5', TENANT);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.finalState).toBe(ArbitrationState.REJECTED);
  });

  it('RA-6: DEFER → deferred=true, finalState=null', async () => {
    const { svc } = makeSvc(DecisionOption.DEFER, 'sess-ra6');
    const r = await svc.applyResolution('sess-ra6', TENANT);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.deferred).toBe(true);
    expect(r.data!.finalState).toBeNull();
  });

  it('RA-7: FORCE_PROCEED → finalState=RESOLVED, forceProceed=true', async () => {
    const { svc } = makeSvc(DecisionOption.FORCE_PROCEED, 'sess-ra7');
    const r = await svc.applyResolution('sess-ra7', TENANT);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.finalState).toBe(ArbitrationState.RESOLVED);
    expect(r.data!.forceProceed).toBe(true);
  });

  it('RA-8: storeDocument called BEFORE enqueue (DNA-8) on ResolutionApplier own writes', async () => {
    const callOrder: string[] = [];
    const db = makeSharedDb(DecisionOption.APPROVE, 'sess-ra8');
    const origStore = db.storeDocument;
    db.storeDocument = jest.fn(async (index: string, ...args: any[]) => {
      if (index.includes('resolution')) callOrder.push('res-store');
      return origStore(index, ...args);
    });
    const queue = makeQueue();
    const origEnqueue = queue.enqueue;
    queue.enqueue = jest.fn(async (evt: string, ...args: any[]) => {
      if (evt === 'arbitration.resolution.applied') callOrder.push('res-enqueue');
      return origEnqueue(evt, ...args);
    });
    const fsm = new ArbitrationStateMachine(db, queue);
    const svc = new ResolutionApplier(db, queue, fsm);

    await svc.applyResolution('sess-ra8', TENANT);

    const storeIdx = callOrder.indexOf('res-store');
    const enqueueIdx = callOrder.indexOf('res-enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('RA-9: enqueue NOT called when ResolutionApplier storeDocument fails', async () => {
    const db = makeSharedDb(DecisionOption.APPROVE, 'sess-ra9');
    const origStore = db.storeDocument;
    db.storeDocument = jest.fn(async (index: string, ...args: any[]) => {
      if (index.includes('resolution')) {
        return DataProcessResult.failure('DB_ERROR', 'Write failed');
      }
      return origStore(index, ...args);
    });
    const queue = makeQueue();
    const fsm = new ArbitrationStateMachine(db, queue);
    const svc = new ResolutionApplier(db, queue, fsm);

    const r = await svc.applyResolution('sess-ra9', TENANT);

    expect(r.isSuccess).toBe(false);
    const appliedEvt = queue._emitted.find((e: any) => e.evt === 'arbitration.resolution.applied');
    expect(appliedEvt).toBeUndefined();
  });

  it('RA-10: resolution event contains session_id, decision, final_state', async () => {
    const { svc, queue } = makeSvc(DecisionOption.APPROVE, 'sess-ra10');
    await svc.applyResolution('sess-ra10', TENANT);

    const evt = queue._emitted.find((e: any) => e.evt === 'arbitration.resolution.applied');
    expect(evt).toBeDefined();
    expect(evt.data).toHaveProperty('session_id', 'sess-ra10');
    expect(evt.data).toHaveProperty('decision', DecisionOption.APPROVE);
    expect(evt.data).toHaveProperty('final_state', ArbitrationState.RESOLVED);
  });

  it('RA-11: DEFER emits arbitration.resolution.deferred event', async () => {
    const { svc, queue } = makeSvc(DecisionOption.DEFER, 'sess-ra11');
    await svc.applyResolution('sess-ra11', TENANT);

    const evt = queue._emitted.find((e: any) => e.evt === 'arbitration.resolution.deferred');
    expect(evt).toBeDefined();
    expect(evt.data).toHaveProperty('session_id', 'sess-ra11');
  });

  it('RA-12: APPROVE/REJECT emit arbitration.resolution.applied event', async () => {
    for (const [dec, sessId] of [
      [DecisionOption.APPROVE, 'sess-ra12a'],
      [DecisionOption.REJECT, 'sess-ra12b'],
    ] as const) {
      const { svc, queue } = makeSvc(dec, sessId);
      await svc.applyResolution(sessId, TENANT);
      const evt = queue._emitted.find((e: any) => e.evt === 'arbitration.resolution.applied');
      expect(evt).toBeDefined();
    }
  });
});
