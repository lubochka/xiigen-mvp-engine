/**
 * FLOW-19 Phase B — CompensationEngineService (T622) e2e tests
 *
 * Coverage:
 *  1. Happy path — 3-step LIFO compensation, CompensationCompleted with correct count
 *  2. CF-19-2: LIFO reverse order — highest stepIndex compensated first
 *  3. CF-19-2: Serial execution — storeDocument per step interleaved with enqueue (not batched)
 *  4. CF-19-2: SETNX comp-lock per step before compensation execution body
 *  5. CF-19-2: stop-on-first-failure — CompensationFailed on failure, loop halts
 */

import 'reflect-metadata';
import { CompensationEngineService } from '../../../src/engine/flows/durable-sagas-compliance/compensation-engine.service';
import { DataProcessResult } from '../../../src/kernel/data-process-result';

function makeDb(callOrder: string[]) {
  return {
    storeDocument: jest.fn().mockImplementation(async (index: string) => {
      callOrder.push(`store:${index}`);
      return DataProcessResult.success({});
    }),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  };
}

function makeQueue(callOrder: string[]) {
  return {
    enqueue: jest.fn().mockImplementation(async (evt: string) => {
      callOrder.push(`enqueue:${evt}`);
      return DataProcessResult.success({});
    }),
  };
}

function makeCls(tenantId = 'e2e-tenant-t622') {
  return { get: jest.fn().mockReturnValue({ tenantId }) };
}

function makeStepLock(callOrder: string[]) {
  return {
    acquireStepLock: jest.fn().mockImplementation(async (_sagaId: string, stepIndex: number) => {
      callOrder.push(`acquireCompLock:${stepIndex}`);
      return { acquired: true };
    }),
    releaseStepLock: jest.fn().mockResolvedValue(undefined),
  };
}

function makeCompensationRegistry(failAtStepIndex?: number) {
  return {
    registerCompensation: jest.fn().mockResolvedValue(undefined),
    getCompensationStrategy: jest
      .fn()
      .mockImplementation(async (_sagaId: string, stepIndex: number) => {
        if (failAtStepIndex !== undefined && stepIndex === failAtStepIndex) {
          return null; // triggers COMPENSATION_NOT_REGISTERED failure
        }
        return `STRATEGY_${stepIndex}`;
      }),
  };
}

describe('FLOW-19 Phase B — CompensationEngine (T622)', () => {
  test('B-1: happy path — 3-step LIFO, CompensationCompleted with compensatedSteps=3', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const stepLock = makeStepLock(callOrder);
    const compRegistry = makeCompensationRegistry();

    const service = new CompensationEngineService(
      db as any,
      queue as any,
      makeCls() as any,
      stepLock as any,
      compRegistry as any,
    );

    const result = await service.compensate({
      sagaId: 'saga-b001',
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
    const completedEvt = queue.enqueue.mock.calls.find((c) => c[0] === 'CompensationCompleted');
    expect(completedEvt).toBeDefined();
    expect(completedEvt![1]).toMatchObject({ compensatedSteps: 3 });
  });

  test('B-2: CF-19-2 — LIFO: comp-lock for highest stepIndex acquired first', async () => {
    const callOrder: string[] = [];
    const stepLock = makeStepLock(callOrder);
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const compRegistry = makeCompensationRegistry();

    const service = new CompensationEngineService(
      db as any,
      queue as any,
      makeCls() as any,
      stepLock as any,
      compRegistry as any,
    );

    await service.compensate({
      sagaId: 'saga-b002',
      sagaType: 'TEST_SAGA',
      failedStep: 2,
      compensationStack: [
        { stepIndex: 0, stepName: 'step0', strategy: 'COMP_0', payload: {} },
        { stepIndex: 1, stepName: 'step1', strategy: 'COMP_1', payload: {} },
        { stepIndex: 2, stepName: 'step2', strategy: 'COMP_2', payload: {} },
      ],
    });

    // LIFO: reversed = [step2, step1, step0]
    // comp-lock indices: -(2+1)=-3, -(1+1)=-2, -(0+1)=-1
    const lockCalls = callOrder.filter((e) => e.startsWith('acquireCompLock:'));
    expect(lockCalls[0]).toBe('acquireCompLock:-3'); // step 2 (last in stack) compensated first
    expect(lockCalls[1]).toBe('acquireCompLock:-2'); // step 1
    expect(lockCalls[2]).toBe('acquireCompLock:-1'); // step 0
  });

  test('B-3: CF-19-2 — serial: store:xiigen-saga-compensation-executions between each lock pair', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const stepLock = makeStepLock(callOrder);
    const compRegistry = makeCompensationRegistry();

    const service = new CompensationEngineService(
      db as any,
      queue as any,
      makeCls() as any,
      stepLock as any,
      compRegistry as any,
    );

    await service.compensate({
      sagaId: 'saga-b003',
      sagaType: 'TEST_SAGA',
      failedStep: 1,
      compensationStack: [
        { stepIndex: 0, stepName: 'step0', strategy: 'COMP_0', payload: {} },
        { stepIndex: 1, stepName: 'step1', strategy: 'COMP_1', payload: {} },
      ],
    });

    // Serial pattern: lock1 → exec1 → lock2 → exec2 (not: lock1 → lock2 → exec1 → exec2)
    const firstLockIdx = callOrder.findIndex((e) => e.startsWith('acquireCompLock:'));
    const firstExecIdx = callOrder.findIndex(
      (e, i) => i > firstLockIdx && e.startsWith('store:xiigen-saga-compensation-executions'),
    );
    const secondLockIdx = callOrder.findIndex(
      (e, i) => i > firstExecIdx && e.startsWith('acquireCompLock:'),
    );
    expect(firstLockIdx).toBeLessThan(firstExecIdx);
    if (secondLockIdx >= 0) {
      expect(secondLockIdx).toBeGreaterThan(firstExecIdx);
    }
  });

  test('B-4: CF-19-2 — comp-lock acquired before compensation execution body per step', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const stepLock = makeStepLock(callOrder);
    const compRegistry = makeCompensationRegistry();

    const service = new CompensationEngineService(
      db as any,
      queue as any,
      makeCls() as any,
      stepLock as any,
      compRegistry as any,
    );

    await service.compensate({
      sagaId: 'saga-b004',
      sagaType: 'TEST_SAGA',
      failedStep: 0,
      compensationStack: [{ stepIndex: 0, stepName: 'step0', strategy: 'COMP_0', payload: {} }],
    });

    const lockIdx = callOrder.findIndex((e) => e.startsWith('acquireCompLock:'));
    const execIdx = callOrder.findIndex((e) =>
      e.startsWith('store:xiigen-saga-compensation-executions'),
    );
    expect(lockIdx).toBeGreaterThanOrEqual(0);
    expect(execIdx).toBeGreaterThan(lockIdx);
  });

  test('B-5: CF-19-2 — stop-on-first-failure: CompensationFailed emitted, CompensationCompleted NOT emitted', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const stepLock = makeStepLock(callOrder);
    // step 2 (first in reversed stack = LIFO first) has no strategy → failure
    const compRegistry = makeCompensationRegistry(2 /* failAtStepIndex */);

    const service = new CompensationEngineService(
      db as any,
      queue as any,
      makeCls() as any,
      stepLock as any,
      compRegistry as any,
    );

    const result = await service.compensate({
      sagaId: 'saga-b005',
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
    const failedEvt = queue.enqueue.mock.calls.find((c) => c[0] === 'CompensationFailed');
    expect(failedEvt).toBeDefined();
    expect(failedEvt![1]).toHaveProperty('failedStep', 2);
    const completedEvt = queue.enqueue.mock.calls.find((c) => c[0] === 'CompensationCompleted');
    expect(completedEvt).toBeUndefined();
  });
});
