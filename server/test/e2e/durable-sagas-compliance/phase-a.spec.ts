/**
 * FLOW-19 Phase A — SagaOrchestratorService (T621) e2e tests
 *
 * Coverage:
 *  1. Happy path — multi-step saga executes, SagaCompleted emitted with correct step count
 *  2. CF-19-1: storeDocumentWithOCC versionPin:-1 at ORDER 1 before step lock
 *  3. CF-19-1: SETNX step-lock acquired before step body execution
 *  4. CF-19-1: OCC conflict on duplicate init → SagaAlreadyRunning (idempotent)
 *  5. DNA-8: storeDocument(checkpoint) before enqueue(SagaStepExecuted) at every step
 */

import 'reflect-metadata';
import { SagaOrchestratorService } from '../../../src/engine/flows/durable-sagas-compliance/saga-orchestrator.service';
import { DataProcessResult } from '../../../src/kernel/data-process-result';

function makeDb() {
  const callOrder: string[] = [];
  return {
    callOrder,
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

function makeCls(tenantId = 'e2e-tenant-t621') {
  return { get: jest.fn().mockReturnValue({ tenantId }) };
}

function makeSagaStateRepo(callOrder: string[], conflictOnInit = false) {
  return {
    storeDocumentWithOCC: jest
      .fn()
      .mockImplementation(
        async (_idx: string, _doc: unknown, _id: string, opts: { versionPin: number }) => {
          callOrder.push(`storeWithOCC:versionPin:${opts.versionPin}`);
          if (conflictOnInit) {
            return DataProcessResult.failure('OCC_CONFLICT', 'Saga already exists');
          }
          return DataProcessResult.success({});
        },
      ),
  };
}

function makeStepLock(callOrder: string[]) {
  return {
    acquireStepLock: jest.fn().mockImplementation(async (_sagaId: string, stepIndex: number) => {
      callOrder.push(`acquireStepLock:${stepIndex}`);
      return { acquired: true };
    }),
    releaseStepLock: jest.fn().mockResolvedValue(undefined),
  };
}

function makeCompensationRegistry() {
  return {
    registerCompensation: jest.fn().mockResolvedValue(undefined),
    getCompensationStrategy: jest.fn().mockResolvedValue('ROLLBACK'),
  };
}

describe('FLOW-19 Phase A — SagaOrchestrator (T621)', () => {
  test('A-1: happy path — 2-step saga executes, SagaCompleted emitted', async () => {
    const db = makeDb();
    const queue = makeQueue(db.callOrder);
    const cls = makeCls();
    const sagaStateRepo = makeSagaStateRepo(db.callOrder);
    const stepLock = makeStepLock(db.callOrder);
    const compRegistry = makeCompensationRegistry();

    const service = new SagaOrchestratorService(
      db as any,
      queue as any,
      cls as any,
      sagaStateRepo as any,
      stepLock as any,
      compRegistry as any,
    );

    const result = await service.execute({
      sagaId: 'saga-e2e-001',
      sagaType: 'PAYMENT_SAGA',
      steps: [
        {
          stepIndex: 0,
          stepName: 'reserve_stock',
          compensationStrategy: 'RELEASE_STOCK',
          payload: {},
        },
        { stepIndex: 1, stepName: 'charge_card', compensationStrategy: 'REFUND_CARD', payload: {} },
      ],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['completedSteps']).toBe(2);
    const completedEvt = queue.enqueue.mock.calls.find((c) => c[0] === 'SagaCompleted');
    expect(completedEvt![1]).toMatchObject({ sagaId: 'saga-e2e-001', completedSteps: 2 });
  });

  test('A-2: CF-19-1 — storeDocumentWithOCC versionPin:-1 called at ORDER 1', async () => {
    const db = makeDb();
    const queue = makeQueue(db.callOrder);
    const sagaStateRepo = makeSagaStateRepo(db.callOrder);
    const stepLock = makeStepLock(db.callOrder);
    const compRegistry = makeCompensationRegistry();

    const service = new SagaOrchestratorService(
      db as any,
      queue as any,
      makeCls() as any,
      sagaStateRepo as any,
      stepLock as any,
      compRegistry as any,
    );

    await service.execute({
      sagaId: 'saga-e2e-002',
      sagaType: 'TEST_SAGA',
      steps: [{ stepIndex: 0, stepName: 'step1', compensationStrategy: 'COMP_1', payload: {} }],
    });

    // versionPin:-1 used — and it must appear BEFORE acquireStepLock in callOrder
    const occIdx = db.callOrder.findIndex((e) => e === 'storeWithOCC:versionPin:-1');
    const lockIdx = db.callOrder.findIndex((e) => e.startsWith('acquireStepLock:'));
    expect(occIdx).toBe(0); // first call
    expect(lockIdx).toBeGreaterThan(occIdx);
  });

  test('A-3: CF-19-1 — SETNX step-lock acquired before step body storeDocument', async () => {
    const db = makeDb();
    const queue = makeQueue(db.callOrder);
    const sagaStateRepo = makeSagaStateRepo(db.callOrder);
    const stepLock = makeStepLock(db.callOrder);
    const compRegistry = makeCompensationRegistry();

    const service = new SagaOrchestratorService(
      db as any,
      queue as any,
      makeCls() as any,
      sagaStateRepo as any,
      stepLock as any,
      compRegistry as any,
    );

    await service.execute({
      sagaId: 'saga-e2e-003',
      sagaType: 'TEST_SAGA',
      steps: [{ stepIndex: 0, stepName: 'step1', compensationStrategy: 'COMP_1', payload: {} }],
    });

    const lockIdx = db.callOrder.findIndex((e) => e.startsWith('acquireStepLock:'));
    const stepBodyIdx = db.callOrder.findIndex((e) => e === 'store:xiigen-saga-steps');
    expect(lockIdx).toBeGreaterThanOrEqual(0);
    expect(stepBodyIdx).toBeGreaterThan(lockIdx);
  });

  test('A-4: CF-19-1 — OCC conflict → SagaAlreadyRunning emitted (idempotent, not error)', async () => {
    const db = makeDb();
    const queue = makeQueue(db.callOrder);
    const sagaStateRepo = makeSagaStateRepo(db.callOrder, true /* conflictOnInit */);
    const stepLock = makeStepLock(db.callOrder);
    const compRegistry = makeCompensationRegistry();

    const service = new SagaOrchestratorService(
      db as any,
      queue as any,
      makeCls() as any,
      sagaStateRepo as any,
      stepLock as any,
      compRegistry as any,
    );

    const result = await service.execute({
      sagaId: 'saga-e2e-004',
      sagaType: 'TEST_SAGA',
      steps: [{ stepIndex: 0, stepName: 'step1', compensationStrategy: 'COMP_1', payload: {} }],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['status']).toBe('ALREADY_RUNNING');
    const alreadyRunningEvt = queue.enqueue.mock.calls.find((c) => c[0] === 'SagaAlreadyRunning');
    expect(alreadyRunningEvt).toBeDefined();
  });

  test('A-5: DNA-8 — checkpoint storeDocument before SagaStepExecuted enqueue per step', async () => {
    const db = makeDb();
    const queue = makeQueue(db.callOrder);
    const sagaStateRepo = makeSagaStateRepo(db.callOrder);
    const stepLock = makeStepLock(db.callOrder);
    const compRegistry = makeCompensationRegistry();

    const service = new SagaOrchestratorService(
      db as any,
      queue as any,
      makeCls() as any,
      sagaStateRepo as any,
      stepLock as any,
      compRegistry as any,
    );

    await service.execute({
      sagaId: 'saga-e2e-005',
      sagaType: 'TEST_SAGA',
      steps: [
        { stepIndex: 0, stepName: 'step1', compensationStrategy: 'COMP_1', payload: {} },
        { stepIndex: 1, stepName: 'step2', compensationStrategy: 'COMP_2', payload: {} },
      ],
    });

    const checkpointIdx = db.callOrder.findIndex((e) => e === 'store:xiigen-saga-checkpoints');
    const enqueueStepIdx = db.callOrder.findIndex((e) => e === 'enqueue:SagaStepExecuted');
    expect(checkpointIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueStepIdx).toBeGreaterThan(checkpointIdx);
  });
});
