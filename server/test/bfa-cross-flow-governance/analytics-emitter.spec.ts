/**
 * AnalyticsEmitter — Unit Tests (T388).
 *
 * Tests:
 *   AE-1:  missing tenantId in emitSessionOpened → UNSCOPED_QUERY
 *   AE-2:  missing tenantId in emitDecisionCaptured → UNSCOPED_QUERY
 *   AE-3:  missing tenantId in emitArbitrationResolved → UNSCOPED_QUERY
 *   AE-4:  emitSessionOpened succeeds and emits to analytics channel
 *   AE-5:  emitDecisionCaptured succeeds and emits with decision data
 *   AE-6:  emitArbitrationResolved succeeds and emits with final state
 *   AE-7:  queue failure does NOT propagate — always returns success (CF-503)
 *   AE-8:  emitted event contains tenant_id, session_id, event_type
 *   AE-9:  FORCE_PROCEED event carries force_proceed=true in payload
 */

import { AnalyticsEmitter } from '../../src/engine/flows/bfa-conflict-arbitration/analytics-emitter.service';
import { DecisionOption } from '../../src/engine/flows/bfa-conflict-arbitration/impact-report-generator.service';
import { ArbitrationState } from '../../src/engine/flows/bfa-conflict-arbitration/arbitration-state-machine.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-ae-test';
const SESSION = 'sess-ae-1';

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

function makeFailingQueue() {
  return {
    enqueue: jest.fn(async () => {
      throw new Error('Queue unavailable');
    }),
    _emitted: [] as any[],
  } as any;
}

describe('AnalyticsEmitter — Unit (T388)', () => {
  it('AE-1: missing tenantId in emitSessionOpened → UNSCOPED_QUERY', async () => {
    const svc = new AnalyticsEmitter(makeQueue());
    const r = await svc.emitSessionOpened('', SESSION, 'chg-1');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('AE-2: missing tenantId in emitDecisionCaptured → UNSCOPED_QUERY', async () => {
    const svc = new AnalyticsEmitter(makeQueue());
    const r = await svc.emitDecisionCaptured('', SESSION, DecisionOption.APPROVE, 'actor-1', false);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('AE-3: missing tenantId in emitArbitrationResolved → UNSCOPED_QUERY', async () => {
    const svc = new AnalyticsEmitter(makeQueue());
    const r = await svc.emitArbitrationResolved('', SESSION, ArbitrationState.RESOLVED, false);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('AE-4: emitSessionOpened succeeds and emits to analytics channel', async () => {
    const queue = makeQueue();
    const svc = new AnalyticsEmitter(queue);
    const r = await svc.emitSessionOpened(TENANT, SESSION, 'chg-ae4');
    expect(r.isSuccess).toBe(true);
    expect(r.data!.emitted).toBe(true);
    expect(queue.enqueue).toHaveBeenCalledTimes(1);
    expect(queue._emitted[0].evt).toBe('analytics.bfa.event');
  });

  it('AE-5: emitDecisionCaptured succeeds and emits with decision data', async () => {
    const queue = makeQueue();
    const svc = new AnalyticsEmitter(queue);
    const r = await svc.emitDecisionCaptured(
      TENANT,
      SESSION,
      DecisionOption.REJECT,
      'actor-ae5',
      false,
    );
    expect(r.isSuccess).toBe(true);
    expect(queue._emitted[0].data).toMatchObject({
      event_type: 'bfa.decision.captured',
      decision: DecisionOption.REJECT,
      actor_id: 'actor-ae5',
    });
  });

  it('AE-6: emitArbitrationResolved succeeds and emits with final state', async () => {
    const queue = makeQueue();
    const svc = new AnalyticsEmitter(queue);
    const r = await svc.emitArbitrationResolved(TENANT, SESSION, ArbitrationState.RESOLVED, false);
    expect(r.isSuccess).toBe(true);
    expect(queue._emitted[0].data).toMatchObject({
      event_type: 'bfa.arbitration.resolved',
      final_state: ArbitrationState.RESOLVED,
      deferred: false,
    });
  });

  it('AE-7: queue failure does NOT propagate — returns success (CF-503)', async () => {
    const svc = new AnalyticsEmitter(makeFailingQueue());
    const r = await svc.emitSessionOpened(TENANT, SESSION, 'chg-ae7');
    expect(r.isSuccess).toBe(true);
    expect(r.data!.emitted).toBe(true);
  });

  it('AE-8: emitted event contains tenant_id, session_id, event_type', async () => {
    const queue = makeQueue();
    const svc = new AnalyticsEmitter(queue);
    await svc.emitSessionOpened(TENANT, SESSION, 'chg-ae8');
    const payload = queue._emitted[0].data;
    expect(payload).toHaveProperty('tenant_id', TENANT);
    expect(payload).toHaveProperty('session_id', SESSION);
    expect(payload).toHaveProperty('event_type', 'bfa.session.opened');
  });

  it('AE-9: FORCE_PROCEED event carries force_proceed=true in payload', async () => {
    const queue = makeQueue();
    const svc = new AnalyticsEmitter(queue);
    await svc.emitDecisionCaptured(
      TENANT,
      SESSION,
      DecisionOption.FORCE_PROCEED,
      'actor-ae9',
      true,
    );
    const payload = queue._emitted[0].data;
    expect(payload).toHaveProperty('force_proceed', true);
  });
});
