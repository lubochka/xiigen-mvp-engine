/**
 * ArbitrationStateMachine — Unit Tests (T381).
 *
 * Tests:
 *   FSM-1: createSession returns IDLE state
 *   FSM-2: createSession is idempotent — duplicate returns existing (DNA-7)
 *   FSM-3: valid transition succeeds and updates state
 *   FSM-4: session history grows by 1 on each transition
 *   FSM-5: invalid transition returns failure (IR-381-2)
 *   FSM-6: transition from terminal state returns failure (IR-381-2)
 *   FSM-7: missing sessionId returns failure
 *   FSM-8: missing tenantId returns UNSCOPED_QUERY failure
 *   FSM-9: LOW severity resolves to SKIP_ARBITRATION (not PENDING_RESOLUTION)
 *   FSM-10: NONE severity resolves to SKIP_ARBITRATION
 *   FSM-11: MEDIUM severity resolves to PENDING_RESOLUTION
 *   FSM-12: CRITICAL severity resolves to PENDING_RESOLUTION
 */

import {
  ArbitrationStateMachine,
  ArbitrationState,
} from '../../src/engine/flows/bfa-conflict-arbitration/arbitration-state-machine.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { DependencySeverity } from '../../src/engine/flows/bfa-conflict-arbitration/dependency-index-query.service';

const TENANT = 'tenant-arb-test';

function makeDb() {
  const store = new Map<string, Record<string, unknown>>();

  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) => {
      const key = id ?? (doc['session_id'] as string) ?? 'doc-1';
      store.set(key, { ...doc, _id: key });
      return DataProcessResult.success({ ...doc, _id: key });
    }),
    searchDocuments: jest.fn(async (_i: string, filters: Record<string, unknown>) => {
      const results: Record<string, unknown>[] = [];
      for (const doc of store.values()) {
        if (Object.entries(filters).every(([k, v]) => doc[k] === v)) {
          results.push(doc);
        }
      }
      // Also serve config docs
      if (filters['config_key']) return DataProcessResult.success([]);
      return DataProcessResult.success(results);
    }),
    _store: store,
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

describe('ArbitrationStateMachine — Unit (T381)', () => {
  it('FSM-1: createSession returns IDLE state', async () => {
    const svc = new ArbitrationStateMachine(makeDb(), makeQueue());
    const result = await svc.createSession('chg-001', TENANT, DependencySeverity.HIGH);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.state).toBe(ArbitrationState.IDLE);
    expect(result.data!.changeId).toBe('chg-001');
    expect(result.data!.tenantId).toBe(TENANT);
  });

  it('FSM-2: createSession is idempotent — duplicate changeId returns existing (DNA-7)', async () => {
    const db = makeDb();
    const svc = new ArbitrationStateMachine(db, makeQueue());

    const first = await svc.createSession('chg-dup', TENANT, DependencySeverity.HIGH);
    const second = await svc.createSession('chg-dup', TENANT, DependencySeverity.HIGH);

    expect(first.data!.sessionId).toBe(second.data!.sessionId);
    expect(db.storeDocument).toHaveBeenCalledTimes(1); // only one write
  });

  it('FSM-3: valid transition succeeds and updates state', async () => {
    const db = makeDb();
    const svc = new ArbitrationStateMachine(db, makeQueue());

    const session = await svc.createSession('chg-003', TENANT, DependencySeverity.HIGH);
    const result = await svc.transition(
      session.data!.sessionId,
      TENANT,
      ArbitrationState.EXTRACTING,
    );

    expect(result.isSuccess).toBe(true);
    expect(result.data!.state).toBe(ArbitrationState.EXTRACTING);
  });

  it('FSM-4: session history grows by 1 on each transition', async () => {
    const svc = new ArbitrationStateMachine(makeDb(), makeQueue());

    const { data: s } = await svc.createSession('chg-004', TENANT, DependencySeverity.HIGH);
    const id = s!.sessionId;

    await svc.transition(id, TENANT, ArbitrationState.EXTRACTING);
    const r2 = await svc.transition(id, TENANT, ArbitrationState.DETECTING);

    expect(r2.data!.history).toHaveLength(2);
    expect(r2.data!.history[0].fromState).toBe(ArbitrationState.IDLE);
    expect(r2.data!.history[0].toState).toBe(ArbitrationState.EXTRACTING);
  });

  it('FSM-5: invalid transition returns failure (IR-381-2)', async () => {
    const svc = new ArbitrationStateMachine(makeDb(), makeQueue());
    const { data: s } = await svc.createSession('chg-005', TENANT, DependencySeverity.HIGH);

    // IDLE → RESOLVED is not a valid transition
    const result = await svc.transition(s!.sessionId, TENANT, ArbitrationState.RESOLVED);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_TRANSITION');
    expect(result.errorMessage).toContain('IR-381-2');
  });

  it('FSM-6: transition from terminal state returns failure (IR-381-2)', async () => {
    const db = makeDb();
    // Manually put session in RESOLVED state
    db._store.set('arb-terminal', {
      session_id: 'arb-terminal',
      change_id: 'chg-006',
      tenant_id: TENANT,
      state: ArbitrationState.RESOLVED,
      severity: DependencySeverity.HIGH,
      history: [],
      created_at: '',
      updated_at: '',
    });

    const svc = new ArbitrationStateMachine(db, makeQueue());
    const result = await svc.transition(
      'arb-terminal',
      TENANT,
      ArbitrationState.APPLYING_RESOLUTION,
    );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('TERMINAL_STATE');
  });

  it('FSM-7: missing sessionId returns failure', async () => {
    const svc = new ArbitrationStateMachine(makeDb(), makeQueue());
    const result = await svc.transition('', TENANT, ArbitrationState.EXTRACTING);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_SESSION_ID');
  });

  it('FSM-8: missing tenantId returns UNSCOPED_QUERY failure', async () => {
    const svc = new ArbitrationStateMachine(makeDb(), makeQueue());
    const result = await svc.createSession('chg-008', '', DependencySeverity.HIGH);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('FSM-9: LOW severity → SKIP_ARBITRATION (not PENDING_RESOLUTION)', () => {
    const svc = new ArbitrationStateMachine(makeDb(), makeQueue());
    expect(svc.resolvePostAggregationState(DependencySeverity.LOW)).toBe(
      ArbitrationState.SKIP_ARBITRATION,
    );
  });

  it('FSM-10: NONE severity → SKIP_ARBITRATION', () => {
    const svc = new ArbitrationStateMachine(makeDb(), makeQueue());
    expect(svc.resolvePostAggregationState(DependencySeverity.NONE)).toBe(
      ArbitrationState.SKIP_ARBITRATION,
    );
  });

  it('FSM-11: MEDIUM severity → PENDING_RESOLUTION', () => {
    const svc = new ArbitrationStateMachine(makeDb(), makeQueue());
    expect(svc.resolvePostAggregationState(DependencySeverity.MEDIUM)).toBe(
      ArbitrationState.PENDING_RESOLUTION,
    );
  });

  it('FSM-12: CRITICAL severity → PENDING_RESOLUTION', () => {
    const svc = new ArbitrationStateMachine(makeDb(), makeQueue());
    expect(svc.resolvePostAggregationState(DependencySeverity.CRITICAL)).toBe(
      ArbitrationState.PENDING_RESOLUTION,
    );
  });
});
