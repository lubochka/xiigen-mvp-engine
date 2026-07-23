/**
 * FeedbackAggregationWindow — Unit Tests (T460).
 *
 * Tests:
 *   FAW-1:  missing tenantId → UNSCOPED_QUERY
 *   FAW-2:  missing windowStartIso → MISSING_WINDOW_START
 *   FAW-3:  empty feedback window → success with zero arms, no policy update triggered
 *   FAW-4:  feedback with arm data → aggregates per arm correctly
 *   FAW-5:  policy update triggered via queue (NEVER direct call) when arms > 0
 *   FAW-6:  empty window → policy update NOT triggered
 *   FAW-7:  storeDocument() BEFORE enqueue() — DNA-8
 *   FAW-8:  DB store failure → error propagated
 *   FAW-9:  aggregationId is non-empty string
 *   FAW-10: aggregation event emitted to feedback.aggregation.completed
 */

import { FeedbackAggregationWindow } from '../../src/engine/flows/rag-optimization/feedback-aggregation-window.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-faw-test';
const WINDOW_START = '2026-01-01T00:00:00Z';

function makeDb(
  configDocs: Record<string, unknown>[] = [],
  feedbackDocs: Record<string, unknown>[] = [],
) {
  const stored: any[] = [];
  return {
    searchDocuments: jest.fn(async (index: string) => {
      if (index === 'flow29-feedback-config') return DataProcessResult.success(configDocs);
      if (index === 'flow29-feedback') return DataProcessResult.success(feedbackDocs);
      return DataProcessResult.success([]);
    }),
    storeDocument: jest.fn(async (_i: string, doc: any, id?: string) => {
      stored.push(doc);
      return DataProcessResult.success({ ...doc, _id: id ?? 'x' });
    }),
    _stored: stored,
  } as any;
}

function makeFailingDb() {
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
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

describe('FeedbackAggregationWindow — Unit (T460)', () => {
  it('FAW-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new FeedbackAggregationWindow(makeDb(), makeQueue());
    const r = await svc.aggregate('', WINDOW_START);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('FAW-2: missing windowStartIso → MISSING_WINDOW_START', async () => {
    const svc = new FeedbackAggregationWindow(makeDb(), makeQueue());
    const r = await svc.aggregate(TENANT, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_WINDOW_START');
  });

  it('FAW-3: empty feedback → success with zero arms, no policy update', async () => {
    const svc = new FeedbackAggregationWindow(makeDb([], []), makeQueue());
    const r = await svc.aggregate(TENANT, WINDOW_START);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.arms).toHaveLength(0);
    expect(r.data!.policyUpdateTriggered).toBe(false);
  });

  it('FAW-4: feedback aggregated per arm with avg reward', async () => {
    const feedback = [
      { strategy: 'hybrid-rag', rating: 4 }, // reward = 0.8
      { strategy: 'hybrid-rag', rating: 2 }, // reward = 0.4
      { strategy: 'vector-rag', rating: 5 }, // reward = 1.0
    ];
    const svc = new FeedbackAggregationWindow(makeDb([], feedback), makeQueue());
    const r = await svc.aggregate(TENANT, WINDOW_START);
    expect(r.isSuccess).toBe(true);
    const hybridArm = r.data!.arms.find((a) => a.armId === 'hybrid-rag');
    const vectorArm = r.data!.arms.find((a) => a.armId === 'vector-rag');
    expect(hybridArm?.sampleCount).toBe(2);
    expect(hybridArm?.averageReward).toBeCloseTo(0.6, 5);
    expect(vectorArm?.sampleCount).toBe(1);
  });

  it('FAW-5: arms present → policy update triggered via queue (never direct call)', async () => {
    const feedback = [{ strategy: 'vector-rag', rating: 4 }];
    const queue = makeQueue();
    const svc = new FeedbackAggregationWindow(makeDb([], feedback), queue);
    const r = await svc.aggregate(TENANT, WINDOW_START);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.policyUpdateTriggered).toBe(true);
    const policyEvent = queue._events.find((e: any) => e.evt === 'routing.policy.update.triggered');
    expect(policyEvent).toBeDefined();
  });

  it('FAW-6: empty window → policy update NOT triggered', async () => {
    const queue = makeQueue();
    const svc = new FeedbackAggregationWindow(makeDb([], []), queue);
    const r = await svc.aggregate(TENANT, WINDOW_START);
    expect(r.isSuccess).toBe(true);
    const policyEvent = queue._events.find((e: any) => e.evt === 'routing.policy.update.triggered');
    expect(policyEvent).toBeUndefined();
  });

  it('FAW-7: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
        return DataProcessResult.success('m');
      }),
    } as any;
    const svc = new FeedbackAggregationWindow(db, queue);
    await svc.aggregate(TENANT, WINDOW_START);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('FAW-8: DB store failure → error propagated', async () => {
    const svc = new FeedbackAggregationWindow(makeFailingDb(), makeQueue());
    const r = await svc.aggregate(TENANT, WINDOW_START);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('FAW-9: aggregationId is non-empty string', async () => {
    const svc = new FeedbackAggregationWindow(makeDb(), makeQueue());
    const r = await svc.aggregate(TENANT, WINDOW_START);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.aggregationId.length).toBeGreaterThan(0);
  });

  it('FAW-10: aggregation event emitted to feedback.aggregation.completed', async () => {
    const queue = makeQueue();
    const svc = new FeedbackAggregationWindow(makeDb(), queue);
    await svc.aggregate(TENANT, WINDOW_START);
    expect(queue.enqueue).toHaveBeenCalledWith(
      'feedback.aggregation.completed',
      expect.any(Object),
    );
  });
});
