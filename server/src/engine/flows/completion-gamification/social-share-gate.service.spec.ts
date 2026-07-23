import { DataProcessResult } from '../../../kernel/data-process-result';
import { SocialShareGateService } from './social-share-gate.service';

describe('SocialShareGateService (T90)', () => {
  let callOrder: string[];
  let mockDb: { storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let service: SocialShareGateService;

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
      }),
    };
    service = new SocialShareGateService(mockDb as any, mockQueue as any);
  });

  const baseInput = {
    completionId: 'comp-1',
    questionnaireId: 'q-1',
    userId: 'user-1',
    tenantId: 'tenant-1',
    privacySetting: 'PUBLIC',
  };

  it('1. private user: returns {shared:false}, no storeDocument, no enqueue', async () => {
    const result = await service.execute({ ...baseInput, privacySetting: 'PRIVATE' });
    expect(result.isSuccess).toBe(true);
    expect(result.data?.shared).toBe(false);
    expect(result.data?.shareIntentId).toBeUndefined();
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  it('2. public user: returns {shared:true}, storeDocument + enqueue called', async () => {
    const result = await service.execute({ ...baseInput, privacySetting: 'PUBLIC' });
    expect(result.isSuccess).toBe(true);
    expect(result.data?.shared).toBe(true);
    expect(result.data?.shareIntentId).toMatch(/^ssi-/);
    expect(mockDb.storeDocument).toHaveBeenCalledTimes(1);
    expect(mockQueue.enqueue).toHaveBeenCalledTimes(1);
  });

  it('3. DNA-8: storeDocument BEFORE social.share.approved enqueue', async () => {
    await service.execute({ ...baseInput, privacySetting: 'PUBLIC' });
    expect(callOrder).toEqual(['storeDocument', 'enqueue']);
  });

  it('4. social.share.approved payload contains shareIntentId, userId, tenantId', async () => {
    await service.execute({ ...baseInput, privacySetting: 'PUBLIC' });
    const [event, payload] = mockQueue.enqueue.mock.calls[0];
    expect(event).toBe('social.share.approved');
    expect(payload.shareIntentId).toMatch(/^ssi-/);
    expect(payload.userId).toBe('user-1');
    expect(payload.tenantId).toBe('tenant-1');
  });

  it('5. knowledge_scope: PRIVATE in stored doc', async () => {
    await service.execute({ ...baseInput, privacySetting: 'PUBLIC' });
    const [, doc] = mockDb.storeDocument.mock.calls[0];
    expect(doc.knowledge_scope).toBe('PRIVATE');
  });

  it('6. privacySetting case-insensitive "private" → shared:false', async () => {
    const result = await service.execute({ ...baseInput, privacySetting: 'private' });
    expect(result.isSuccess).toBe(true);
    expect(result.data?.shared).toBe(false);
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  it('7. Validation: missing completionId → VALIDATION_FAILURE', async () => {
    const result = await service.execute({ ...baseInput, completionId: '' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('8. Validation: missing userId → VALIDATION_FAILURE', async () => {
    const result = await service.execute({ ...baseInput, userId: '' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('9. storeDocument failure → failure, no emit', async () => {
    mockDb.storeDocument.mockResolvedValueOnce(DataProcessResult.failure('DB_ERROR', 'disk full'));
    const result = await service.execute({ ...baseInput, privacySetting: 'PUBLIC' });
    expect(result.isSuccess).toBe(false);
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  it('10. DNA-3: unexpected throw → SOCIAL_SHARE_GATE_ERROR', async () => {
    mockDb.storeDocument.mockImplementationOnce(() => {
      throw new Error('unexpected');
    });
    const result = await service.execute({ ...baseInput, privacySetting: 'PUBLIC' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SOCIAL_SHARE_GATE_ERROR');
  });
});
