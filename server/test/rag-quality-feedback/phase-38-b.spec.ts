/**
 * FLOW-38 Phase B — CycleOutcomeClassifier (T594) + RagQualityUpdater (T595) Tests.
 *
 * 11 tests covering:
 *   RQ-1: score >= 7.0 → SUCCESS_WITHIN_BUDGET
 *   RQ-2: score 2.1–6.9 → WASTED_CYCLE
 *   RQ-3: score <= 2.0 → ESCALATION_REQUIRED (no downstream emit)
 *   RQ-4: no DPO triple → failure (no-outcome-no-update iron rule)
 *   RQ-5: DNA-7 idempotency — already classified cycle → return existing result
 *   RQ-6: DNA-8 + CF-802 — storeDocument before enqueue; cycleId in record
 *
 *   MT-1: SUCCESS_WITHIN_BUDGET → qualityScore delta +0.05
 *   MT-2: WASTED_CYCLE → qualityScore delta -0.05
 *   MT-3: CF-801 — (cycleId, patternId) pair submitted twice → DUPLICATE_UPDATE_BLOCKED
 *   MT-4: MACHINE clamp — score + delta > 1.0 → clamped to 1.0
 *   MT-5: DNA-8 — storeDocument(idempotency record) called before enqueue
 */

import 'reflect-metadata';
import { CycleOutcomeClassifier } from '../../src/engine/flows/rag-quality-feedback/cycle-outcome-classifier.service';
import { RagQualityUpdater } from '../../src/engine/flows/rag-quality-feedback/rag-quality-updater.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factory ─────────────────────────────────────────────────────────────

function makeMockDb(
  existingOutcome?: Record<string, unknown>,
  existingPattern?: Record<string, unknown>,
) {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      stored.push({ index, doc, id });
      return DataProcessResult.success({ ...doc });
    }),
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      if (index === 'xiigen-cycle-outcomes' && existingOutcome) {
        return DataProcessResult.success([existingOutcome]);
      }
      if (
        index === 'xiigen-rag-patterns' &&
        existingPattern &&
        filter['patternId'] === existingPattern['patternId']
      ) {
        return DataProcessResult.success([existingPattern]);
      }
      // Idempotency index: empty by default
      if (index === 'xiigen-rag-quality-updates') {
        return DataProcessResult.success([]);
      }
      return DataProcessResult.success([]);
    }),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _stored: stored,
  } as any;
}

function makeMockQueue() {
  const enqueued: Array<{ eventType: string; data: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (eventType: string, data: Record<string, unknown>) => {
      enqueued.push({ eventType, data });
      return DataProcessResult.success('msg-1');
    }),
    dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    sendToDlq: jest.fn().mockResolvedValue(DataProcessResult.success('dlq-1')),
    waitFor: jest.fn().mockResolvedValue(DataProcessResult.failure('TIMEOUT', '')),
    _enqueued: enqueued,
  } as any;
}

beforeEach(() => jest.clearAllMocks());

// ── CycleOutcomeClassifier (RQ-1..RQ-6) ─────────────────────────────────────

describe('FLOW-38 Phase B — CycleOutcomeClassifier', () => {
  it('RQ-1: DPO triple with score >= 7.0 → SUCCESS_WITHIN_BUDGET', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new CycleOutcomeClassifier(db, queue);

    const result = await svc.classify({
      cycleId: 'CYCLE-001',
      flowId: 'FLOW-38',
      dpoTripleRef: { tripleId: 'DPO-001', score: 8.5 },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.outcome).toBe('SUCCESS_WITHIN_BUDGET');
    expect(result.data!.cycleId).toBe('CYCLE-001');
  });

  it('RQ-2: DPO triple with score 2.1–6.9 → WASTED_CYCLE', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new CycleOutcomeClassifier(db, queue);

    const result = await svc.classify({
      cycleId: 'CYCLE-002',
      flowId: 'FLOW-38',
      dpoTripleRef: { tripleId: 'DPO-002', score: 5.0 },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.outcome).toBe('WASTED_CYCLE');
  });

  it('RQ-3: DPO triple with score <= 2.0 → ESCALATION_REQUIRED; no enqueue', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new CycleOutcomeClassifier(db, queue);

    const result = await svc.classify({
      cycleId: 'CYCLE-003',
      flowId: 'FLOW-38',
      dpoTripleRef: { tripleId: 'DPO-003', score: 1.5 },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.outcome).toBe('ESCALATION_REQUIRED');
    // ESCALATION_REQUIRED must NOT trigger downstream queue event
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('RQ-4: no DPO triple → failure (no-outcome-no-update iron rule)', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new CycleOutcomeClassifier(db, queue);

    const result = await svc.classify({
      cycleId: 'CYCLE-004',
      flowId: 'FLOW-38',
      dpoTripleRef: {} as Record<string, unknown>,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_DPO_TRIPLE');
    expect(queue.enqueue).not.toHaveBeenCalled();
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('RQ-5: DNA-7 idempotency — already classified cycle returns existing result', async () => {
    const existing = {
      cycleId: 'CYCLE-005',
      outcome: 'SUCCESS_WITHIN_BUDGET',
      classificationBasis: { dpoScore: 9.0 },
    };
    const db = makeMockDb(existing);
    const queue = makeMockQueue();
    const svc = new CycleOutcomeClassifier(db, queue);

    const result = await svc.classify({
      cycleId: 'CYCLE-005',
      flowId: 'FLOW-38',
      dpoTripleRef: { tripleId: 'DPO-005', score: 9.0 },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.outcome).toBe('SUCCESS_WITHIN_BUDGET');
    // Must NOT store again — idempotency
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('RQ-6: DNA-8 — storeDocument before enqueue; CF-802 — cycleId in outcome record', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new CycleOutcomeClassifier(db, queue);

    const storeOrder: string[] = [];
    (db.storeDocument as jest.Mock).mockImplementation(async () => {
      storeOrder.push('store');
      return DataProcessResult.success({});
    });
    (queue.enqueue as jest.Mock).mockImplementation(async () => {
      storeOrder.push('enqueue');
      return DataProcessResult.success('msg-1');
    });

    await svc.classify({
      cycleId: 'CYCLE-006',
      flowId: 'FLOW-38',
      dpoTripleRef: { tripleId: 'DPO-006', score: 8.0 },
    });

    // DNA-8: store must come before enqueue
    expect(storeOrder).toEqual(['store', 'enqueue']);

    // CF-802: cycleId present in stored outcome record
    const storeCalls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    const outcomeDoc = storeCalls[0][1];
    expect(outcomeDoc['cycleId']).toBe('CYCLE-006');
  });
});

// ── RagQualityUpdater (MT-1..MT-5) ───────────────────────────────────────────

describe('FLOW-38 Phase B — RagQualityUpdater', () => {
  it('MT-1: SUCCESS_WITHIN_BUDGET → qualityScore delta +0.05', async () => {
    const existingPattern = { patternId: 'PAT-001', qualityScore: 0.6 };
    const db = makeMockDb(undefined, existingPattern);
    const queue = makeMockQueue();
    const svc = new RagQualityUpdater(db, queue);

    const result = await svc.update({
      cycleId: 'CYCLE-101',
      patternIds: ['PAT-001'],
      outcome: 'SUCCESS_WITHIN_BUDGET',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.updatedCount).toBe(1);
    expect(result.data!.skippedCount).toBe(0);

    // Verify the stored updated pattern has score + 0.05
    const storeCalls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    const patternUpdate = storeCalls.find(([idx]) => idx === 'xiigen-rag-patterns');
    expect(patternUpdate).toBeDefined();
    expect(patternUpdate![1]['qualityScore'] as number).toBeCloseTo(0.65, 5);
  });

  it('MT-2: WASTED_CYCLE → qualityScore delta -0.05', async () => {
    const existingPattern = { patternId: 'PAT-002', qualityScore: 0.7 };
    const db = makeMockDb(undefined, existingPattern);
    const queue = makeMockQueue();
    const svc = new RagQualityUpdater(db, queue);

    const result = await svc.update({
      cycleId: 'CYCLE-102',
      patternIds: ['PAT-002'],
      outcome: 'WASTED_CYCLE',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.updatedCount).toBe(1);

    const storeCalls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    const patternUpdate = storeCalls.find(([idx]) => idx === 'xiigen-rag-patterns');
    expect(patternUpdate![1]['qualityScore'] as number).toBeCloseTo(0.65, 5);
  });

  it('MT-3: CF-801 — same (cycleId, patternId) twice → DUPLICATE_UPDATE_BLOCKED', async () => {
    // On second call, idempotency check returns existing record
    let callCount = 0;
    const db = makeMockDb();
    (db.searchDocuments as jest.Mock).mockImplementation(
      async (index: string, filter: Record<string, unknown>) => {
        if (index === 'xiigen-rag-quality-updates') {
          callCount++;
          if (callCount > 1) {
            // Second invocation: idempotency record exists
            return DataProcessResult.success([{ idempotencyKey: filter['idempotencyKey'] }]);
          }
        }
        return DataProcessResult.success([]);
      },
    );
    const queue = makeMockQueue();
    const svc = new RagQualityUpdater(db, queue);

    // First update
    await svc.update({
      cycleId: 'CYCLE-103',
      patternIds: ['PAT-003'],
      outcome: 'SUCCESS_WITHIN_BUDGET',
    });

    // Reset store mock to track second call separately
    (db.storeDocument as jest.Mock).mockClear();

    // Second update — should be blocked
    const result = await svc.update({
      cycleId: 'CYCLE-103',
      patternIds: ['PAT-003'],
      outcome: 'SUCCESS_WITHIN_BUDGET',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.skippedCount).toBe(1);
    expect(result.data!.updatedCount).toBe(0);
    // No pattern store on the second call
    const storeCalls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    const patternUpdates = storeCalls.filter(([idx]) => idx === 'xiigen-rag-patterns');
    expect(patternUpdates.length).toBe(0);
  });

  it('MT-4: MACHINE clamp — qualityScore clamped at ceiling 1.0', async () => {
    const existingPattern = { patternId: 'PAT-004', qualityScore: 0.98 };
    const db = makeMockDb(undefined, existingPattern);
    const queue = makeMockQueue();
    const svc = new RagQualityUpdater(db, queue);

    const result = await svc.update({
      cycleId: 'CYCLE-104',
      patternIds: ['PAT-004'],
      outcome: 'SUCCESS_WITHIN_BUDGET',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.clampedCount).toBe(1);

    const storeCalls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    const patternUpdate = storeCalls.find(([idx]) => idx === 'xiigen-rag-patterns');
    expect(patternUpdate![1]['qualityScore']).toBe(1.0);
  });

  it('MT-5: DNA-8 — storeDocument(idempotency record) called before enqueue', async () => {
    const existingPattern = { patternId: 'PAT-005', qualityScore: 0.5 };
    const db = makeMockDb(undefined, existingPattern);
    const queue = makeMockQueue();
    const svc = new RagQualityUpdater(db, queue);

    const callOrder: string[] = [];
    (db.storeDocument as jest.Mock).mockImplementation(async () => {
      callOrder.push('store');
      return DataProcessResult.success({});
    });
    (queue.enqueue as jest.Mock).mockImplementation(async () => {
      callOrder.push('enqueue');
      return DataProcessResult.success('msg-1');
    });

    await svc.update({
      cycleId: 'CYCLE-105',
      patternIds: ['PAT-005'],
      outcome: 'SUCCESS_WITHIN_BUDGET',
    });

    // At least one store must occur before the final enqueue
    const lastEnqueue = callOrder.lastIndexOf('enqueue');
    const lastStoreBefore = callOrder.lastIndexOf('store', lastEnqueue - 1);
    expect(lastStoreBefore).toBeGreaterThanOrEqual(0);
    expect(lastStoreBefore).toBeLessThan(lastEnqueue);
  });
});
