/**
 * FLOW-38 Phase C — DistilledRuleExtractor (T596) Tests.
 *
 * 7 tests covering:
 *   DR-1: SUCCESS_WITHIN_BUDGET + winning node → extracts 1-3 rules
 *   DR-2: CF-807 — WASTED_CYCLE → WASTED_CYCLE_EXTRACTION_PREVENTED failure
 *   DR-3: CF-802 — cycleId stored in every extracted rule
 *   DR-4: DNA-8 — storeDocument before enqueue(DistilledRuleSeeded)
 *   MT-1: no winning node → failure (no node, no rules)
 *   MT-2: caps extracted rules at 3 (MACHINE limit)
 *   MT-3: DNA-3 — throws internally → DataProcessResult.failure (never rethrows)
 */

import 'reflect-metadata';
import { DistilledRuleExtractor } from '../../src/engine/flows/rag-quality-feedback/distilled-rule-extractor.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factory ─────────────────────────────────────────────────────────────

function makeMockDb() {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      stored.push({ index, doc, id });
      return DataProcessResult.success({ ...doc });
    }),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
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

const winningNode = {
  nodeId: 'NODE-001',
  intent: 'Apply quality delta to retrieved patterns when cycle succeeds within budget',
  constraints: [
    'CF-801: idempotency check (cycleId, patternId) before any delta write',
    'CF-802: cycleId reference stored with every quality write',
    'MACHINE delta=0.05: fixed magnitude; FREEDOM config cannot override',
  ],
  qualityCriteria: [
    'test verifies same (cycle, pattern) pair twice leaves score unchanged',
    'test verifies score clamped to 1.0 when delta would exceed ceiling',
  ],
};

beforeEach(() => jest.clearAllMocks());

describe('FLOW-38 Phase C — DistilledRuleExtractor', () => {
  it('DR-1: SUCCESS_WITHIN_BUDGET + winning node → extracts rules', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new DistilledRuleExtractor(db, queue);

    const result = await svc.extract({
      cycleId: 'CYCLE-201',
      flowId: 'FLOW-38',
      outcome: 'SUCCESS_WITHIN_BUDGET',
      winningNodeRef: winningNode,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.ruleCount).toBeGreaterThanOrEqual(1);
    expect(result.data!.ruleCount).toBeLessThanOrEqual(3);
    expect(result.data!.extractedRules.length).toBe(result.data!.ruleCount);
  });

  it('DR-2: CF-807 — WASTED_CYCLE → WASTED_CYCLE_EXTRACTION_PREVENTED', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new DistilledRuleExtractor(db, queue);

    // TypeScript enforces SUCCESS_WITHIN_BUDGET; cast to any to test runtime guard
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await svc.extract({
      cycleId: 'CYCLE-202',
      flowId: 'FLOW-38',
      outcome: 'WASTED_CYCLE' as unknown as 'SUCCESS_WITHIN_BUDGET',
      winningNodeRef: winningNode,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('WASTED_CYCLE_EXTRACTION_PREVENTED');
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('DR-3: CF-802 — cycleId stored in every extracted rule', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new DistilledRuleExtractor(db, queue);

    await svc.extract({
      cycleId: 'CYCLE-203',
      flowId: 'FLOW-38',
      outcome: 'SUCCESS_WITHIN_BUDGET',
      winningNodeRef: winningNode,
    });

    const storeCalls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    const ruleCalls = storeCalls.filter(([idx]) => idx === 'xiigen-distilled-rules');
    expect(ruleCalls.length).toBeGreaterThan(0);
    for (const [, doc] of ruleCalls) {
      expect(doc['cycleId']).toBe('CYCLE-203');
    }
  });

  it('DR-4: DNA-8 — storeDocument called before enqueue(DistilledRuleSeeded)', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new DistilledRuleExtractor(db, queue);

    const callOrder: string[] = [];
    (db.storeDocument as jest.Mock).mockImplementation(async () => {
      callOrder.push('store');
      return DataProcessResult.success({});
    });
    (queue.enqueue as jest.Mock).mockImplementation(async () => {
      callOrder.push('enqueue');
      return DataProcessResult.success('msg-1');
    });

    await svc.extract({
      cycleId: 'CYCLE-204',
      flowId: 'FLOW-38',
      outcome: 'SUCCESS_WITHIN_BUDGET',
      winningNodeRef: winningNode,
    });

    // DNA-8: every store must come before enqueue
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(enqueueIdx).toBeGreaterThan(0);
    const lastStoreBeforeEnqueue = callOrder.lastIndexOf('store', enqueueIdx - 1);
    expect(lastStoreBeforeEnqueue).toBeGreaterThanOrEqual(0);
  });

  it('MT-1: no winning node → failure', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new DistilledRuleExtractor(db, queue);

    const result = await svc.extract({
      cycleId: 'CYCLE-205',
      flowId: 'FLOW-38',
      outcome: 'SUCCESS_WITHIN_BUDGET',
      winningNodeRef: {} as Record<string, unknown>,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_WINNING_NODE');
  });

  it('MT-2: extracts at most 3 rules (MACHINE maximum)', async () => {
    const bigNode = {
      nodeId: 'NODE-BIG',
      constraints: [
        'Rule A: constraint one that is long enough to be extracted as a rule',
        'Rule B: constraint two that is long enough to be extracted as a rule',
        'Rule C: constraint three that is long enough to be extracted as a rule',
        'Rule D: constraint four that is long enough to be extracted as a rule',
        'Rule E: constraint five that is long enough to be extracted as a rule',
      ],
      qualityCriteria: [],
      intent: '',
    };
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new DistilledRuleExtractor(db, queue);

    const result = await svc.extract({
      cycleId: 'CYCLE-206',
      flowId: 'FLOW-38',
      outcome: 'SUCCESS_WITHIN_BUDGET',
      winningNodeRef: bigNode,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.ruleCount).toBeLessThanOrEqual(3);
  });

  it('MT-3: DNA-3 — unexpected throw → DataProcessResult.failure, never rethrows', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    (db.storeDocument as jest.Mock).mockRejectedValue(new Error('unexpected crash'));
    const svc = new DistilledRuleExtractor(db, queue);

    const result = await svc.extract({
      cycleId: 'CYCLE-207',
      flowId: 'FLOW-38',
      outcome: 'SUCCESS_WITHIN_BUDGET',
      winningNodeRef: winningNode,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('EXTRACTOR_ERROR');
  });
});
