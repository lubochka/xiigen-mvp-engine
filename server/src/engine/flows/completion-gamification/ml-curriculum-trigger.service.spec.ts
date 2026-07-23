import { MLCurriculumTrigger, MLCurriculumTriggerInput } from './ml-curriculum-trigger.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

describe('MLCurriculumTrigger', () => {
  let service: MLCurriculumTrigger;
  let callOrder: string[];
  let mockDb: { storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };

  const baseInput: MLCurriculumTriggerInput = {
    completionId: 'cmp-001',
    questionnaireId: 'q-001',
    userId: 'u-abc',
    tenantId: 't-xyz',
    effectiveTotal: 18,
    processedAt: '2026-04-12T10:00:00.000Z',
  };

  beforeEach(() => {
    callOrder = [];

    mockDb = {
      storeDocument: jest.fn().mockImplementation(async () => {
        callOrder.push('storeDocument');
        return DataProcessResult.success({});
      }),
    };

    mockQueue = {
      enqueue: jest.fn().mockImplementation(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success({});
      }),
    };

    service = new MLCurriculumTrigger(mockDb as any, mockQueue as any);
  });

  it('T88-1: happy path — storeDocument + enqueue ml.adaptation.requested, requestId returned', async () => {
    const result = await service.trigger(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.requestId).toMatch(/^mlr-\d+-[a-z0-9]+$/);
    expect(mockDb.storeDocument).toHaveBeenCalledTimes(1);
    expect(mockQueue.enqueue).toHaveBeenCalledTimes(1);
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'ml.adaptation.requested',
      expect.objectContaining({ requestId: result.data?.requestId }),
    );
  });

  it('T88-2: DNA-8 — storeDocument is called BEFORE enqueue', async () => {
    await service.trigger(baseInput);

    expect(callOrder).toEqual(['storeDocument', 'enqueue']);
  });

  it('T88-3: knowledge_scope is PRIVATE in stored document', async () => {
    await service.trigger(baseInput);

    const storedDoc = mockDb.storeDocument.mock.calls[0][1] as Record<string, unknown>;
    expect(storedDoc.knowledge_scope).toBe('PRIVATE');
  });

  it('T88-4: ml.adaptation.requested payload contains requestId, userId, tenantId, effectiveTotal', async () => {
    const result = await service.trigger(baseInput);

    const payload = mockQueue.enqueue.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.requestId).toBe(result.data?.requestId);
    expect(payload.userId).toBe(baseInput.userId);
    expect(payload.tenantId).toBe(baseInput.tenantId);
    expect(payload.effectiveTotal).toBe(baseInput.effectiveTotal);
  });

  it('T88-5: validation — missing completionId → VALIDATION_FAILURE', async () => {
    const result = await service.trigger({ ...baseInput, completionId: '' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  it('T88-6: validation — missing userId → VALIDATION_FAILURE', async () => {
    const result = await service.trigger({ ...baseInput, userId: '' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  it('T88-7: validation — missing tenantId → VALIDATION_FAILURE', async () => {
    const result = await service.trigger({ ...baseInput, tenantId: '' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  it('T88-8: storeDocument failure → returns failure, enqueue not called', async () => {
    mockDb.storeDocument.mockResolvedValueOnce(
      DataProcessResult.failure('DB_ERROR', 'Write failed'),
    );

    const result = await service.trigger(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  it('T88-9: DNA-3 — unexpected throw → MLCURRICULUM_TRIGGER_ERROR', async () => {
    mockDb.storeDocument.mockRejectedValueOnce(new Error('Unexpected crash'));

    const result = await service.trigger(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MLCURRICULUM_TRIGGER_ERROR');
  });

  it('T88-10: connection_type is FLOW_SCOPED in stored document', async () => {
    await service.trigger(baseInput);

    const storedDoc = mockDb.storeDocument.mock.calls[0][1] as Record<string, unknown>;
    expect(storedDoc.connection_type).toBe('FLOW_SCOPED');
  });
});
