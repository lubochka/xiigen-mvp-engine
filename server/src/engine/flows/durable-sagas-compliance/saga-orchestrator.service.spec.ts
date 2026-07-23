/**
 * SagaOrchestratorService (T621) — unit tests
 *
 * Coverage:
 *  1. Happy path — single step saga, SagaCompleted emitted
 *  2. IR-1: OCC versionPin:-1 used on init — OCC conflict → SagaAlreadyRunning (idempotent)
 *  3. IR-2: SETNX step-lock acquired before step body
 *  4. IR-3: Compensation registered before step body executes
 *  5. IR-4/DNA-8: storeDocument(checkpoint) before enqueue(SagaStepExecuted)
 */

import { SagaOrchestratorService } from './saga-orchestrator.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

describe('SagaOrchestratorService (T621)', () => {
  let mockDb: { storeDocument: jest.Mock; searchDocuments: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let mockCls: { get: jest.Mock };
  let mockSagaStateRepo: { storeDocumentWithOCC: jest.Mock };
  let mockStepLock: { acquireStepLock: jest.Mock; releaseStepLock: jest.Mock };
  let mockCompensationRegistry: {
    registerCompensation: jest.Mock;
    getCompensationStrategy: jest.Mock;
  };
  let service: SagaOrchestratorService;
  let callOrder: string[];

  const TENANT = 'tenant-t621';

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

    mockSagaStateRepo = {
      storeDocumentWithOCC: jest
        .fn()
        .mockImplementation(
          async (_index: string, _doc: unknown, _id: string, opts: { versionPin: number }) => {
            callOrder.push(`storeDocumentWithOCC:versionPin:${opts.versionPin}`);
            return DataProcessResult.success({});
          },
        ),
    };

    mockStepLock = {
      acquireStepLock: jest.fn().mockImplementation(async (sagaId: string, stepIndex: number) => {
        callOrder.push(`acquireStepLock:${stepIndex}`);
        return { acquired: true };
      }),
      releaseStepLock: jest.fn().mockResolvedValue(undefined),
    };

    mockCompensationRegistry = {
      registerCompensation: jest
        .fn()
        .mockImplementation(async (_sagaId: string, stepIndex: number, strategy: string) => {
          callOrder.push(`registerCompensation:${stepIndex}:${strategy}`);
        }),
      getCompensationStrategy: jest.fn().mockResolvedValue('REVERSE_PAYMENT'),
    };

    service = new SagaOrchestratorService(
      mockDb as any,
      mockQueue as any,
      mockCls as any,
      mockSagaStateRepo as any,
      mockStepLock as any,
      mockCompensationRegistry as any,
    );
  });

  it('T621-1: happy path — single step saga, SagaCompleted emitted', async () => {
    const result = await service.execute({
      sagaId: 'saga-001',
      sagaType: 'PAYMENT_SAGA',
      steps: [
        { stepIndex: 0, stepName: 'charge_card', compensationStrategy: 'REFUND_CARD', payload: {} },
      ],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['status']).toBe('COMPLETED');
    const completedCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'SagaCompleted');
    expect(completedCall).toBeDefined();
    expect(completedCall![1]).toHaveProperty('sagaId', 'saga-001');
  });

  it('T621-2: IR-1 — storeDocumentWithOCC uses versionPin:-1 for init', async () => {
    await service.execute({
      sagaId: 'saga-002',
      sagaType: 'TEST_SAGA',
      steps: [],
    });

    const occCall = mockSagaStateRepo.storeDocumentWithOCC.mock.calls[0];
    expect(occCall).toBeDefined();
    expect(occCall[3]).toEqual({ versionPin: -1 });
  });

  it('T621-2b: IR-1 — OCC conflict → SagaAlreadyRunning (idempotent, not error)', async () => {
    mockSagaStateRepo.storeDocumentWithOCC.mockResolvedValue(
      DataProcessResult.failure('OCC_CONFLICT', 'Saga already exists'),
    );

    const result = await service.execute({
      sagaId: 'saga-003',
      sagaType: 'TEST_SAGA',
      steps: [{ stepIndex: 0, stepName: 'step1', compensationStrategy: 'ROLLBACK', payload: {} }],
    });

    // OCC conflict is idempotent — returns success with ALREADY_RUNNING
    expect(result.isSuccess).toBe(true);
    expect(result.data!['status']).toBe('ALREADY_RUNNING');
    const alreadyRunningCall = mockQueue.enqueue.mock.calls.find(
      (c) => c[0] === 'SagaAlreadyRunning',
    );
    expect(alreadyRunningCall).toBeDefined();
  });

  it('T621-3: IR-2 — SETNX step-lock acquired before step body (call order)', async () => {
    await service.execute({
      sagaId: 'saga-004',
      sagaType: 'TEST_SAGA',
      steps: [{ stepIndex: 0, stepName: 'step1', compensationStrategy: 'ROLLBACK', payload: {} }],
    });

    const lockIdx = callOrder.findIndex((e) => e.startsWith('acquireStepLock:'));
    const storeIdx = callOrder.findIndex((e) => e.startsWith('storeDocument:xiigen-saga-steps'));
    expect(lockIdx).toBeGreaterThanOrEqual(0);
    expect(storeIdx).toBeGreaterThan(lockIdx);
  });

  it('T621-4: IR-3 — compensation registered before step body executes', async () => {
    await service.execute({
      sagaId: 'saga-005',
      sagaType: 'TEST_SAGA',
      steps: [{ stepIndex: 0, stepName: 'step1', compensationStrategy: 'REFUND', payload: {} }],
    });

    const compRegIdx = callOrder.findIndex((e) => e.startsWith('registerCompensation:'));
    const stepBodyIdx = callOrder.findIndex((e) => e.startsWith('storeDocument:xiigen-saga-steps'));
    expect(compRegIdx).toBeGreaterThanOrEqual(0);
    expect(stepBodyIdx).toBeGreaterThan(compRegIdx);
  });

  it('T621-5: IR-4/DNA-8 — checkpoint storeDocument before enqueue(SagaStepExecuted)', async () => {
    await service.execute({
      sagaId: 'saga-006',
      sagaType: 'TEST_SAGA',
      steps: [{ stepIndex: 0, stepName: 'step1', compensationStrategy: 'ROLLBACK', payload: {} }],
    });

    const checkpointIdx = callOrder.findIndex((e) =>
      e.startsWith('storeDocument:xiigen-saga-checkpoints'),
    );
    const enqueueIdx = callOrder.findIndex((e) => e === 'enqueue:SagaStepExecuted');
    expect(checkpointIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(checkpointIdx);
  });
});
