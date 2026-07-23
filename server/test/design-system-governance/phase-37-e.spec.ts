/**
 * FLOW-37 Phase E — StackPortingOrchestrator (T593) Tests.
 *
 * 5 tests covering:
 *   OR-1: COMPLETE status when all stacks port successfully
 *   OR-2: PARTIAL status when some stacks are incompatible
 *   OR-3: DNA-7 — already processed portingRunId returns existing result
 *
 *   MT-1: missing portingRunId → MISSING_PORTING_RUN_ID failure
 *   MT-2: empty taskTypeIds → NO_TASK_TYPES failure
 */

import 'reflect-metadata';
import { StackPortingOrchestrator } from '../../src/engine/flows/engine-self-awareness/stack-porting-orchestrator.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

function makeMockDb(
  compatibilityReports: Array<Record<string, unknown>> = [],
  existingRun?: Record<string, unknown>,
) {
  return {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    searchDocuments: jest.fn(async (index: string, filter?: Record<string, unknown>) => {
      if (index === 'xiigen-porting-run-idempotency' && existingRun) {
        return DataProcessResult.success([existingRun]);
      }
      if (index === 'xiigen-compatibility-reports') {
        // Return matching report if any
        const match = compatibilityReports.find(
          (r) => r['taskTypeId'] === filter?.['taskTypeId'] && r['stackId'] === filter?.['stackId'],
        );
        return DataProcessResult.success(match ? [match] : []);
      }
      return DataProcessResult.success([]);
    }),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  } as any;
}

function makeMockQueue() {
  return {
    enqueue: jest.fn().mockResolvedValue(DataProcessResult.success('msg-1')),
    dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    sendToDlq: jest.fn().mockResolvedValue(DataProcessResult.success('dlq-1')),
    waitFor: jest.fn().mockResolvedValue(DataProcessResult.failure('TIMEOUT', '')),
  } as any;
}

beforeEach(() => jest.clearAllMocks());

describe('FLOW-37 Phase E — StackPortingOrchestrator', () => {
  it('OR-1: COMPLETE status when all stacks port successfully', async () => {
    // No incompatible reports → all stacks port
    const db = makeMockDb([]);
    const queue = makeMockQueue();
    const svc = new StackPortingOrchestrator(db, queue);

    const result = await svc.orchestrate({
      portingRunId: 'RUN-001',
      taskTypeIds: ['T-100'],
      registeredStacks: ['stack-react', 'stack-vue'],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.completionStatus).toBe('COMPLETE');
    expect(result.data!.stacksPortedSuccessfully).toBe(2);
    expect(result.data!.stacksIncompatible).toBe(0);
  });

  it('OR-2: PARTIAL status when some stacks are incompatible', async () => {
    // One incompatible report for stack-legacy
    const compatibilityReports = [
      { taskTypeId: 'T-101', stackId: 'stack-legacy', compatibility: 'INCOMPATIBLE' },
    ];
    const db = makeMockDb(compatibilityReports);
    const queue = makeMockQueue();
    const svc = new StackPortingOrchestrator(db, queue);

    const result = await svc.orchestrate({
      portingRunId: 'RUN-002',
      taskTypeIds: ['T-101'],
      registeredStacks: ['stack-react', 'stack-legacy'],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.completionStatus).toBe('PARTIAL');
    expect(result.data!.stacksPortedSuccessfully).toBe(1);
    expect(result.data!.stacksIncompatible).toBe(1);
  });

  it('OR-3: DNA-7 — already processed portingRunId returns existing result', async () => {
    const existingResult = {
      portingRunId: 'RUN-003',
      stacksPortedSuccessfully: 2,
      stacksFailed: 0,
      stacksIncompatible: 0,
      completionStatus: 'COMPLETE',
    };
    const existingRun = { idempotencyKey: 'RUN-003', orchestrateResult: existingResult };
    const db = makeMockDb([], existingRun);
    const queue = makeMockQueue();
    const svc = new StackPortingOrchestrator(db, queue);

    const result = await svc.orchestrate({
      portingRunId: 'RUN-003',
      taskTypeIds: ['T-102'],
      registeredStacks: ['stack-react'],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.completionStatus).toBe('COMPLETE');
    // Must NOT re-store or re-enqueue (idempotent)
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('MT-1: missing portingRunId → MISSING_PORTING_RUN_ID failure', async () => {
    const svc = new StackPortingOrchestrator(makeMockDb(), makeMockQueue());
    const result = await svc.orchestrate({
      portingRunId: '',
      taskTypeIds: ['T-100'],
      registeredStacks: ['stack-react'],
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_PORTING_RUN_ID');
  });

  it('MT-2: empty taskTypeIds → NO_TASK_TYPES failure', async () => {
    const svc = new StackPortingOrchestrator(makeMockDb(), makeMockQueue());
    const result = await svc.orchestrate({
      portingRunId: 'RUN-004',
      taskTypeIds: [],
      registeredStacks: ['stack-react'],
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_TASK_TYPES');
  });
});
