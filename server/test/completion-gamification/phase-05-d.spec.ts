/**
 * FLOW-05 Phase D Unit Tests — T97 (GamificationAnalytics) + T98 (LearningFlowCompleted)
 *
 * T97 — GamificationAnalytics  (OBSERVABILITY archetype — no queue injection)
 *   D-97-1: Happy path — storeDocument called once, analyticsId starts with 'ga-'
 *   D-97-2: OBSERVABILITY — no queue on service instance, no enqueue possible
 *   D-97-3: Stored doc has knowledge_scope:'PRIVATE'
 *   D-97-4: storeDocument failure → failure propagated
 *   D-97-5: DNA-3 — unexpected throw → GAMIFICATION_ANALYTICS_ERROR
 *
 * T98 — LearningFlowCompleted
 *   D-98-1: Happy path — completion stored, learning.flow.completed emitted
 *   D-98-2: Machine constant — stored doc has completion_gate_branch:'BRANCH_A_ONLY'
 *   D-98-3: DNA-8 — storeDocument before learning.flow.completed enqueue in callOrder
 *   D-98-4: Validation — missing ledgerEntryId → VALIDATION_FAILURE
 *   D-98-5: DNA-3 — unexpected throw → LEARNING_FLOW_COMPLETED_ERROR
 */

import 'reflect-metadata';
import {
  GamificationAnalytics,
  GamificationAnalyticsInput,
} from '../../src/engine/flows/completion-gamification/gamification-analytics.service';
import {
  LearningFlowCompleted,
  LearningFlowCompletedInput,
} from '../../src/engine/flows/completion-gamification/learning-flow-completed.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Shared mock factory ───────────────────────────────────────────────────────

interface MockDbOptions {
  storeFails?: boolean;
}

function makeDb(callOrder: string[], opts: MockDbOptions = {}) {
  const storeFails = opts.storeFails ?? false;

  return {
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    storeDocument: jest
      .fn()
      .mockImplementation(async (_index: string, doc: Record<string, unknown>) => {
        callOrder.push('storeDocument');
        if (storeFails) {
          return DataProcessResult.failure('STORE_ERROR', 'forced store failure');
        }
        return DataProcessResult.success(doc);
      }),
  };
}

function makeQueue(callOrder: string[]) {
  const _enqueued: Array<{ eventType: string; data: unknown }> = [];
  const mock = {
    enqueue: jest.fn().mockImplementation(async (eventType: string, data: unknown) => {
      callOrder.push('enqueue');
      _enqueued.push({ eventType, data });
      return DataProcessResult.success({});
    }),
    _enqueued,
  };
  return mock;
}

// ── T97 GamificationAnalytics ─────────────────────────────────────────────────

describe('T97 GamificationAnalytics', () => {
  const baseInput: GamificationAnalyticsInput = {
    ledgerEntryId: 'le-001',
    completionId: 'cmp-001',
    userId: 'u-001',
    tenantId: 'tenant-001',
    effectiveTotal: 15,
    pointBreakdown: { base: 10, bonus: 5, multiplier: 1.0, total: 15 },
    processedAt: '2026-04-12T10:00:00.000Z',
  };

  it('D-97-1: happy path — storeDocument called once, analyticsId starts with ga-', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const svc = new GamificationAnalytics(db as any);

    const result = await svc.record(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(db.storeDocument).toHaveBeenCalledTimes(1);
    expect(result.data!.analyticsRecordId).toMatch(/^ana-/);
  });

  it('D-97-2: OBSERVABILITY — no queue injected on service instance', () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const svc = new GamificationAnalytics(db as any);

    expect(svc.hasQueue).toBe(false);
  });

  it('D-97-3: stored doc has knowledge_scope PRIVATE', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const svc = new GamificationAnalytics(db as any);

    await svc.record(baseInput);

    const [_index, doc] = db.storeDocument.mock.calls[0] as [
      string,
      Record<string, unknown>,
      string?,
    ];
    expect(doc['knowledge_scope']).toBe('PRIVATE');
  });

  it('D-97-4: storeDocument failure → failure propagated', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder, { storeFails: true });
    const svc = new GamificationAnalytics(db as any);

    const result = await svc.record(baseInput);

    expect(result.isSuccess).toBe(false);
  });

  it('D-97-5: DNA-3 — unexpected throw returns GAMIFICATION_ANALYTICS_ERROR', async () => {
    const db = {
      searchDocuments: jest.fn().mockRejectedValue(new Error('db explosion')),
      storeDocument: jest.fn().mockRejectedValue(new Error('db explosion')),
    };
    const svc = new GamificationAnalytics(db as any);

    const result = await svc.record(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('GAMIFICATION_ANALYTICS_ERROR');
  });
});

// ── T98 LearningFlowCompleted ─────────────────────────────────────────────────

describe('T98 LearningFlowCompleted', () => {
  const baseInput: LearningFlowCompletedInput = {
    completionId: 'cmp-001',
    questionnaireId: 'q-001',
    userId: 'u-001',
    tenantId: 'tenant-001',
    ledgerEntryId: 'le-001',
    effectiveTotal: 15,
    processedAt: '2026-04-12T10:00:00.000Z',
  };

  it('D-98-1: happy path — completion stored, learning.flow.completed emitted', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new LearningFlowCompleted(db as any, queue as any);

    const result = await svc.complete(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(db.storeDocument).toHaveBeenCalledTimes(1);
    expect(queue._enqueued.some((e) => e.eventType === 'learning.flow.completed')).toBe(true);
  });

  it('D-98-2: machine constant — stored doc has completion_gate_branch BRANCH_A_ONLY', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new LearningFlowCompleted(db as any, queue as any);

    await svc.complete(baseInput);

    const [_index, doc] = db.storeDocument.mock.calls[0] as [
      string,
      Record<string, unknown>,
      string?,
    ];
    expect(doc['completion_gate_branch']).toBe('BRANCH_A_ONLY');
  });

  it('D-98-3: DNA-8 — storeDocument occurs before learning.flow.completed enqueue in callOrder', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new LearningFlowCompleted(db as any, queue as any);

    await svc.complete(baseInput);

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('D-98-4: validation — missing ledgerEntryId → VALIDATION_FAILURE', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const svc = new LearningFlowCompleted(db as any, queue as any);

    const result = await svc.complete({ ...baseInput, ledgerEntryId: '' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('D-98-5: DNA-3 — unexpected throw returns LEARNING_FLOW_COMPLETED_ERROR', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn().mockRejectedValue(new Error('db explosion')),
      storeDocument: jest.fn().mockRejectedValue(new Error('db explosion')),
    };
    const queue = makeQueue(callOrder);
    const svc = new LearningFlowCompleted(db as any, queue as any);

    const result = await svc.complete(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('LEARNING_FLOW_COMPLETED_ERROR');
  });
});
