/**
 * RoutingPolicyUpdater — Unit Tests (T447).
 *
 * Tests:
 *   RPU-1:  missing tenantId → UNSCOPED_QUERY (CF-476)
 *   RPU-2:  missing armId → MISSING_ARM_ID
 *   RPU-3:  invalid reward (NaN) → INVALID_REWARD
 *   RPU-4:  policy update succeeds with new weights
 *   RPU-5:  storeDocument() BEFORE enqueue() — DNA-8 (score-0 async rule)
 *   RPU-6:  new weight reflects EMA update formula
 *   RPU-7:  DB policy read failure → propagates error
 *   RPU-8:  DB store failure → propagates error, enqueue NOT called
 *   RPU-9:  update event emitted to routing.policy.updated channel
 *   RPU-10: policyId is non-empty string
 */

import { RoutingPolicyUpdater } from '../../src/engine/flows/rag-optimization/routing-policy-updater.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-rpu-test';
const SESSION = 'sess-rpu-1';
const ARM = 'vector-rag';

function makeDb(policyDocs: Record<string, unknown>[] = []) {
  const stored: Record<string, unknown>[] = [];
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.success(policyDocs)),
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) => {
      stored.push({ ...doc, _id: id ?? 'doc-1' });
      return DataProcessResult.success({ ...doc, _id: id ?? 'doc-1' });
    }),
    _stored: stored,
  } as any;
}

function makeFailingReadDb() {
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.failure('DB_ERROR', 'Read failed')),
    storeDocument: jest.fn(async () => DataProcessResult.success({})),
  } as any;
}

function makeFailingWriteDb() {
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
    storeDocument: jest.fn(async () => DataProcessResult.failure('STORAGE_FAILED', 'Write failed')),
  } as any;
}

function makeQueue() {
  const events: any[] = [];
  return {
    enqueue: jest.fn(async (evt: string, data: Record<string, unknown>) => {
      events.push({ evt, data });
      return DataProcessResult.success('msg-1');
    }),
    _events: events,
  } as any;
}

describe('RoutingPolicyUpdater — Unit (T447)', () => {
  it('RPU-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new RoutingPolicyUpdater(makeDb(), makeQueue());
    const r = await svc.applyFeedback('', ARM, 0.8, SESSION);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('RPU-2: missing armId → MISSING_ARM_ID', async () => {
    const svc = new RoutingPolicyUpdater(makeDb(), makeQueue());
    const r = await svc.applyFeedback(TENANT, '', 0.8, SESSION);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_ARM_ID');
  });

  it('RPU-3: invalid reward (NaN) → INVALID_REWARD', async () => {
    const svc = new RoutingPolicyUpdater(makeDb(), makeQueue());
    const r = await svc.applyFeedback(TENANT, ARM, NaN, SESSION);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('INVALID_REWARD');
  });

  it('RPU-4: policy update succeeds and returns newWeights', async () => {
    const svc = new RoutingPolicyUpdater(makeDb([]), makeQueue());
    const r = await svc.applyFeedback(TENANT, ARM, 0.9, SESSION);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.updated).toBe(true);
    expect(typeof r.data!.newWeights).toBe('object');
    expect(r.data!.newWeights[ARM]).toBeDefined();
  });

  it('RPU-5: storeDocument() called BEFORE enqueue() — DNA-8 (score-0)', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn(async () => DataProcessResult.success([])),
      storeDocument: jest.fn(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('msg-1');
      }),
    } as any;
    const svc = new RoutingPolicyUpdater(db, queue);
    await svc.applyFeedback(TENANT, ARM, 0.8, SESSION);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('RPU-6: EMA update formula: new_w = old_w + 0.1 * (reward - old_w)', async () => {
    const initialPolicy = [
      {
        tenant_id: TENANT,
        active: true,
        mode_weights: { [ARM]: 1.0 },
      },
    ];
    const svc = new RoutingPolicyUpdater(makeDb(initialPolicy), makeQueue());
    const r = await svc.applyFeedback(TENANT, ARM, 0.0, SESSION);
    expect(r.isSuccess).toBe(true);
    // EMA: 1.0 + 0.1 * (0.0 - 1.0) = 0.9
    expect(r.data!.newWeights[ARM]).toBeCloseTo(0.9, 5);
  });

  it('RPU-7: DB policy read failure → propagates error', async () => {
    const svc = new RoutingPolicyUpdater(makeFailingReadDb(), makeQueue());
    const r = await svc.applyFeedback(TENANT, ARM, 0.8, SESSION);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('DB_ERROR');
  });

  it('RPU-8: DB store failure → error propagated, enqueue NOT called', async () => {
    const queue = makeQueue();
    const svc = new RoutingPolicyUpdater(makeFailingWriteDb(), queue);
    const r = await svc.applyFeedback(TENANT, ARM, 0.8, SESSION);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('RPU-9: update event emitted to routing.policy.updated channel', async () => {
    const queue = makeQueue();
    const svc = new RoutingPolicyUpdater(makeDb([]), queue);
    await svc.applyFeedback(TENANT, ARM, 0.8, SESSION);
    expect(queue.enqueue).toHaveBeenCalledWith('routing.policy.updated', expect.any(Object));
  });

  it('RPU-10: policyId is non-empty string', async () => {
    const svc = new RoutingPolicyUpdater(makeDb([]), makeQueue());
    const r = await svc.applyFeedback(TENANT, ARM, 0.8, SESSION);
    expect(r.isSuccess).toBe(true);
    expect(typeof r.data!.policyId).toBe('string');
    expect(r.data!.policyId.length).toBeGreaterThan(0);
  });
});
