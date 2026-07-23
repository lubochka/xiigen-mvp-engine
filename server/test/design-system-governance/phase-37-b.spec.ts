/**
 * FLOW-37 Phase B — StackCouplingAuditor (T590) Tests.
 *
 * 11 tests covering:
 *   SA-1: classifies CONCEPT_NEUTRAL stacks correctly
 *   SA-2: classifies INCOMPATIBLE stacks correctly; hasIncompatibles=true
 *   SA-3: CF-805 — evaluates all 10 coupling dimensions per stack
 *   SA-4: D-STACK-1 — only 4 valid categories (CONCEPT_NEUTRAL / IMPL_VARIES / STACK_COUPLED / INCOMPATIBLE)
 *   SA-5: DNA-7 — same taskTypeId + stack returns existing audit (idempotent)
 *   SA-6: DNA-8 — storeDocument before enqueue(CouplingAuditComplete)
 *   SA-7: DNA-3 — throws internally → DataProcessResult.failure
 *
 *   MT-1: missing taskTypeId → failure
 *   MT-2: empty registeredStacks → failure
 *   MT-3: CF-800 — audit output contains required taskTypeId field for downstream T591
 *   MT-4: stacksAudited equals registeredStacks.length
 */

import 'reflect-metadata';
import {
  StackCouplingAuditor,
  COUPLING_DIMENSIONS_10,
} from '../../src/engine/flows/engine-self-awareness/stack-coupling-auditor.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

function makeMockDb(existingAudit?: Record<string, unknown>) {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      stored.push({ index, doc, id });
      return DataProcessResult.success({ ...doc });
    }),
    searchDocuments: jest.fn(async (index: string) => {
      if (index === 'xiigen-coupling-audits' && existingAudit) {
        return DataProcessResult.success([existingAudit]);
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

const neutralSpec = {}; // no explicit overrides → defaults to CONCEPT_NEUTRAL
const incompatibleSpec = { data_model: { 'stack-legacy': 'INCOMPATIBLE' } };

beforeEach(() => jest.clearAllMocks());

describe('FLOW-37 Phase B — StackCouplingAuditor', () => {
  it('SA-1: CONCEPT_NEUTRAL stack classified correctly', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new StackCouplingAuditor(db, queue);

    const result = await svc.audit({
      taskTypeId: 'T-001',
      genesisPromptSpec: neutralSpec,
      registeredStacks: ['stack-react'],
    });

    expect(result.isSuccess).toBe(true);
    const classification = result.data!.couplingClassifications.find(
      (c) => c.stackId === 'stack-react',
    );
    expect(classification?.category).toBe('CONCEPT_NEUTRAL');
  });

  it('SA-2: INCOMPATIBLE stack detected; hasIncompatibles=true', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new StackCouplingAuditor(db, queue);

    const result = await svc.audit({
      taskTypeId: 'T-002',
      genesisPromptSpec: incompatibleSpec,
      registeredStacks: ['stack-legacy'],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.hasIncompatibles).toBe(true);
    const classification = result.data!.couplingClassifications.find(
      (c) => c.stackId === 'stack-legacy',
    );
    expect(classification?.category).toBe('INCOMPATIBLE');
  });

  it('SA-3: CF-805 — dimensionsEvaluated is always 10', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new StackCouplingAuditor(db, queue);

    const result = await svc.audit({
      taskTypeId: 'T-003',
      genesisPromptSpec: neutralSpec,
      registeredStacks: ['stack-vue'],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.dimensionsEvaluated).toBe(10);
    // All 10 dimensions present in classification
    const classification = result.data!.couplingClassifications[0];
    const evaluatedDims = Object.keys(classification.dimensions);
    expect(evaluatedDims.length).toBe(10);
    for (const dim of COUPLING_DIMENSIONS_10) {
      expect(evaluatedDims).toContain(dim);
    }
  });

  it('SA-4: D-STACK-1 — only valid coupling categories used', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new StackCouplingAuditor(db, queue);
    const validCategories = new Set([
      'CONCEPT_NEUTRAL',
      'IMPL_VARIES',
      'STACK_COUPLED',
      'INCOMPATIBLE',
    ]);

    const result = await svc.audit({
      taskTypeId: 'T-004',
      genesisPromptSpec: neutralSpec,
      registeredStacks: ['stack-a', 'stack-b'],
    });

    expect(result.isSuccess).toBe(true);
    for (const classification of result.data!.couplingClassifications) {
      expect(validCategories.has(classification.category)).toBe(true);
      for (const dimCat of Object.values(classification.dimensions)) {
        expect(validCategories.has(dimCat)).toBe(true);
      }
    }
  });

  it('SA-5: DNA-7 — already audited taskTypeId returns existing result', async () => {
    const existingAudit = {
      auditId: 'AUDIT-T-005-existing',
      auditResult: {
        taskTypeId: 'T-005',
        couplingClassifications: [],
        dimensionsEvaluated: 10,
        stacksAudited: 1,
        hasIncompatibles: false,
        auditId: 'AUDIT-T-005-existing',
      },
    };
    const db = makeMockDb(existingAudit);
    const queue = makeMockQueue();
    const svc = new StackCouplingAuditor(db, queue);

    const result = await svc.audit({
      taskTypeId: 'T-005',
      genesisPromptSpec: neutralSpec,
      registeredStacks: ['stack-react'],
    });

    expect(result.isSuccess).toBe(true);
    // Must NOT re-store or re-enqueue
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('SA-6: DNA-8 — storeDocument before enqueue(CouplingAuditComplete)', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    const svc = new StackCouplingAuditor(db, queue);

    const callOrder: string[] = [];
    (db.storeDocument as jest.Mock).mockImplementation(async () => {
      callOrder.push('store');
      return DataProcessResult.success({});
    });
    (queue.enqueue as jest.Mock).mockImplementation(async () => {
      callOrder.push('enqueue');
      return DataProcessResult.success('msg-1');
    });

    await svc.audit({
      taskTypeId: 'T-006',
      genesisPromptSpec: neutralSpec,
      registeredStacks: ['stack-vue'],
    });

    expect(callOrder.indexOf('store')).toBeLessThan(callOrder.indexOf('enqueue'));
  });

  it('SA-7: DNA-3 — throws internally → DataProcessResult.failure', async () => {
    const db = makeMockDb();
    const queue = makeMockQueue();
    (db.storeDocument as jest.Mock).mockRejectedValue(new Error('unexpected crash'));
    const svc = new StackCouplingAuditor(db, queue);

    const result = await svc.audit({
      taskTypeId: 'T-007',
      genesisPromptSpec: neutralSpec,
      registeredStacks: ['stack-react'],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('AUDITOR_ERROR');
  });

  it('MT-1: missing taskTypeId → failure', async () => {
    const svc = new StackCouplingAuditor(makeMockDb(), makeMockQueue());
    const result = await svc.audit({
      taskTypeId: '',
      genesisPromptSpec: {},
      registeredStacks: ['stack-a'],
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TASK_TYPE_ID');
  });

  it('MT-2: empty registeredStacks → failure', async () => {
    const svc = new StackCouplingAuditor(makeMockDb(), makeMockQueue());
    const result = await svc.audit({
      taskTypeId: 'T-001',
      genesisPromptSpec: {},
      registeredStacks: [],
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_REGISTERED_STACKS');
  });

  it('MT-3: CF-800 — audit result contains taskTypeId for downstream T591', async () => {
    const db = makeMockDb();
    const svc = new StackCouplingAuditor(db, makeMockQueue());
    const result = await svc.audit({
      taskTypeId: 'T-008',
      genesisPromptSpec: neutralSpec,
      registeredStacks: ['stack-vue'],
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.taskTypeId).toBe('T-008');
  });

  it('MT-4: stacksAudited equals registeredStacks.length', async () => {
    const svc = new StackCouplingAuditor(makeMockDb(), makeMockQueue());
    const result = await svc.audit({
      taskTypeId: 'T-009',
      genesisPromptSpec: neutralSpec,
      registeredStacks: ['s1', 's2', 's3'],
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.stacksAudited).toBe(3);
  });
});
