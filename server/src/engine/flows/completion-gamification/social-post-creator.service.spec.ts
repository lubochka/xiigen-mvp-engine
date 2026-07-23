import { DataProcessResult } from '../../../kernel/data-process-result';
import { SocialPostCreatorService } from './social-post-creator.service';

describe('SocialPostCreatorService (T92)', () => {
  let callOrder: string[];
  let mockDb: { storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let service: SocialPostCreatorService;

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
    service = new SocialPostCreatorService(mockDb as any, mockQueue as any);
  });

  const baseInput = {
    distributionId: 'ssd-1',
    completionId: 'comp-1',
    userId: 'user-1',
    tenantId: 'tenant-1',
  };

  it('1. Happy path — storeDocument + enqueue, postId returned', async () => {
    const result = await service.execute(baseInput);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.postId).toMatch(/^spo-/);
    expect(mockDb.storeDocument).toHaveBeenCalledTimes(1);
    expect(mockQueue.enqueue).toHaveBeenCalledTimes(1);
  });

  it('2. DNA-8: storeDocument BEFORE enqueue', async () => {
    await service.execute(baseInput);
    expect(callOrder).toEqual(['storeDocument', 'enqueue']);
  });

  it('3. social.post.created payload contains postId, distributionId, userId', async () => {
    await service.execute(baseInput);
    const [event, payload] = mockQueue.enqueue.mock.calls[0];
    expect(event).toBe('social.post.created');
    expect(payload.postId).toMatch(/^spo-/);
    expect(payload.distributionId).toBe('ssd-1');
    expect(payload.userId).toBe('user-1');
  });

  it('4. knowledge_scope: PRIVATE in stored doc', async () => {
    await service.execute(baseInput);
    const [, doc] = mockDb.storeDocument.mock.calls[0];
    expect(doc.knowledge_scope).toBe('PRIVATE');
  });

  it('5. Validation: missing distributionId → VALIDATION_FAILURE', async () => {
    const result = await service.execute({ ...baseInput, distributionId: '' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('6. Validation: missing userId → VALIDATION_FAILURE', async () => {
    const result = await service.execute({ ...baseInput, userId: '' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('7. storeDocument failure → failure, no emit', async () => {
    mockDb.storeDocument.mockResolvedValueOnce(DataProcessResult.failure('DB_ERROR', 'disk full'));
    const result = await service.execute(baseInput);
    expect(result.isSuccess).toBe(false);
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  it('8. DNA-3: unexpected throw → SOCIAL_POST_CREATOR_ERROR', async () => {
    mockDb.storeDocument.mockImplementationOnce(() => {
      throw new Error('unexpected');
    });
    const result = await service.execute(baseInput);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SOCIAL_POST_CREATOR_ERROR');
  });
});
