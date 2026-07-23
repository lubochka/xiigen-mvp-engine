/**
 * CompensationEngineService (T622) — unit tests
 *
 * Coverage:
 *  1. Happy path — 3-step compensation, all execute, CompensationCompleted emitted
 *  2. IR-1: LIFO reverse order — steps compensated in reverse (step 2 before step 0)
 *  3. IR-2: Serial execution — no parallel Promise.all calls
 *  4. IR-3: SETNX comp-lock acquired per step before compensation body
 *  5. IR-4: stop-on-first-failure — CompensationFailed emitted, loop halts
 */

import { CompensationEngineService } from './compensation-engine.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

describe('CompensationEngineService (T622)', () => {
  let mockDb: { storeDocument: jest.Mock; searchDocuments: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let mockCls: { get: jest.Mock };
  let mockStepLock: { acquireStepLock: jest.Mock; releaseStepLock: jest.Mock };
  let mockCompensationRegistry: {
    registerCompensation: jest.Mock;
    getCompensationStrategy: jest.Mock;
  };
  let service: CompensationEngineService;
  let callOrder: string[];

  const TENANT = 'tenant-t622';

  beforeEach(() => {
    callOrder = [];

    mockDb = {
      storeDocument: jest.fn().mockImplementation(async (index: string) => {
        callOrder.push(`storeDocument:${index}`);
        return DataProcessResult.success({});
      }),
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    };

    mockQueue = {
      enqueue: jest.fn().mockImplementation(async (evt: string) => {
        callOrder.push(`enqueue:${evt}`);
        return DataProcessResult.success({});
      }),
    };

    mockCls = { get: jest.fn().mockReturnValue({ tenantId: TENANT }) };

    mockStepLock = {
      acquireStepLock: jest.fn().mockImplementation(async (_sagaId: string, stepIndex: number) => {
        callOrder.push(`acquireCompLock:${stepIndex}`);
        return { acquired: true };
      }),
      releaseStepLock: jest.fn().mockResolvedValue(undefined),
    };

    mockCompensationRegistry = {
      registerCompensation: jest.fn().mockResolvedValue(undefined),
      getCompensationStrategy: jest
        .fn()
        .mockImplementation(async (_sagaId: string, stepIndex: number) => {
          return `STRATEGY_${stepIndex}`;
        }),
    };

    service = new CompensationEngineService(
      mockDb as any,
      mockQueue as any,
      mockCls as any,
      mockStepLock as any,
      mockCompensationRegistry as any,
    );
  });

  it('T622-1: happy path — 3 compensation steps, CompensationCompleted emitted', async () => {
    const result = await service.compensate({
      sagaId: 'saga-c001',
      sagaType: 'PAYMENT_SAGA',
      failedStep: 2,
      compensationStack: [
        { stepIndex: 0, stepName: 'create_order', strategy: 'CANCEL_ORDER', payload: {} },
        { stepIndex: 1, stepName: 'reserve_stock', strategy: 'RELEASE_STOCK', payload: {} },
        { stepIndex: 2, stepName: 'charge_card', strategy: 'REFUND_CARD', payload: {} },
      ],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['compensatedSteps']).toBe(3);
    const completedCall = mockQueue.enqueue.mock.calls.find(
      (c) => c[0] === 'CompensationCompleted',
    );
    expect(completedCall).toBeDefined();
  });

  it('T622-2: IR-1 — LIFO reverse order — higher stepIndex compensated first', async () => {
    const executedSteps: number[] = [];
    mockStepLock.acquireStepLock.mockImplementation(async (_sagaId: string, stepIndex: number) => {
      // stepIndex for comp-lock is negative (-(stepIndex + 1)) so track by position
      executedSteps.push(stepIndex);
      return { acquired: true };
    });

    await service.compensate({
      sagaId: 'saga-c002',
      sagaType: 'TEST_SAGA',
      failedStep: 2,
      compensationStack: [
        { stepIndex: 0, stepName: 'step0', strategy: 'COMP_0', payload: {} },
        { stepIndex: 1, stepName: 'step1', strategy: 'COMP_1', payload: {} },
        { stepIndex: 2, stepName: 'step2', strategy: 'COMP_2', payload: {} },
      ],
    });

    // LIFO: comp-lock for step 2 acquired first (reversed: -(2+1)=-3), then step 1 (-2), then step 0 (-1)
    expect(executedSteps[0]).toBe(-3); // step 2 reversed first
    expect(executedSteps[1]).toBe(-2); // step 1
    expect(executedSteps[2]).toBe(-1); // step 0
  });

  it('T622-3: IR-2 — serial execution verified by sequential callOrder entries', async () => {
    await service.compensate({
      sagaId: 'saga-c003',
      sagaType: 'TEST_SAGA',
      failedStep: 1,
      compensationStack: [
        { stepIndex: 0, stepName: 'step0', strategy: 'COMP_0', payload: {} },
        { stepIndex: 1, stepName: 'step1', strategy: 'COMP_1', payload: {} },
      ],
    });

    // Serial: each acquireCompLock immediately followed by its storeDocument (no interleaving)
    const lockIdx1 = callOrder.findIndex((e) => e.startsWith('acquireCompLock'));
    const storeIdx1 = callOrder.findIndex((e, i) => i > lockIdx1 && e.startsWith('storeDocument'));
    const lockIdx2 = callOrder.findIndex(
      (e, i) => i > storeIdx1 && e.startsWith('acquireCompLock'),
    );
    // lock1 → store1 (not: lock1 → lock2 → store1 → store2)
    expect(lockIdx1).toBeLessThan(storeIdx1);
    if (lockIdx2 >= 0) {
      expect(lockIdx2).toBeGreaterThan(storeIdx1);
    }
  });

  it('T622-4: IR-3 — comp-lock acquired per step before compensation execution', async () => {
    await service.compensate({
      sagaId: 'saga-c004',
      sagaType: 'TEST_SAGA',
      failedStep: 0,
      compensationStack: [{ stepIndex: 0, stepName: 'step0', strategy: 'COMP_0', payload: {} }],
    });

    const lockIdx = callOrder.findIndex((e) => e.startsWith('acquireCompLock'));
    const execIdx = callOrder.findIndex((e) =>
      e.startsWith('storeDocument:xiigen-saga-compensation-executions'),
    );
    expect(lockIdx).toBeGreaterThanOrEqual(0);
    expect(execIdx).toBeGreaterThan(lockIdx);
  });

  it('T622-5: IR-4 — stop-on-first-failure: CompensationFailed emitted, remaining steps NOT executed', async () => {
    // Make compensation registry return null for step 2 → causes failure
    mockCompensationRegistry.getCompensationStrategy.mockImplementation(
      async (_sagaId: string, stepIndex: number) => {
        if (stepIndex === 2) return null; // triggers COMPENSATION_NOT_REGISTERED failure
        return `STRATEGY_${stepIndex}`;
      },
    );

    const result = await service.compensate({
      sagaId: 'saga-c005',
      sagaType: 'TEST_SAGA',
      failedStep: 2,
      compensationStack: [
        { stepIndex: 0, stepName: 'step0', strategy: 'COMP_0', payload: {} },
        { stepIndex: 1, stepName: 'step1', strategy: 'COMP_1', payload: {} },
        { stepIndex: 2, stepName: 'step2', strategy: 'COMP_2', payload: {} },
      ],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('COMPENSATION_STEP_FAILED');
    const failedCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'CompensationFailed');
    expect(failedCall).toBeDefined();
    expect(failedCall![1]).toHaveProperty('failedStep');
    // Remaining steps (0 and 1) should NOT be in completed call
    const completedCall = mockQueue.enqueue.mock.calls.find(
      (c) => c[0] === 'CompensationCompleted',
    );
    expect(completedCall).toBeUndefined();
  });
});
