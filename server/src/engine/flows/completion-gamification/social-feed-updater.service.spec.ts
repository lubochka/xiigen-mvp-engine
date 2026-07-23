import { DataProcessResult } from '../../../kernel/data-process-result';
import { SocialFeedUpdaterService } from './social-feed-updater.service';

describe('SocialFeedUpdaterService (T93)', () => {
  let callOrder: string[];
  let mockDb: { storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let service: SocialFeedUpdaterService;

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
    service = new SocialFeedUpdaterService(mockDb as any, mockQueue as any);
  });

  const baseInput = {
    postId: 'spo-1',
    distributionId: 'ssd-1',
    completionId: 'comp-1',
    userId: 'user-1',
    tenantId: 'tenant-1',
  };

  it('1. Happy path — storeDocument + enqueue, feedEntryId returned', async () => {
    const result = await service.execute(baseInput);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.feedEntryId).toMatch(/^sfe-/);
    expect(mockDb.storeDocument).toHaveBeenCalledTimes(1);
    expect(mockQueue.enqueue).toHaveBeenCalledTimes(1);
  });

  it('2. DNA-8: storeDocument BEFORE enqueue', async () => {
    await service.execute(baseInput);
    expect(callOrder).toEqual(['storeDocument', 'enqueue']);
  });

  it('3. social.feed.updated payload contains feedEntryId, postId, userId', async () => {
    await service.execute(baseInput);
    const [event, payload] = mockQueue.enqueue.mock.calls[0];
    expect(event).toBe('social.feed.updated');
    expect(payload.feedEntryId).toMatch(/^sfe-/);
    expect(payload.postId).toBe('spo-1');
    expect(payload.userId).toBe('user-1');
  });

  it('4. knowledge_scope: PRIVATE in stored doc', async () => {
    await service.execute(baseInput);
    const [, doc] = mockDb.storeDocument.mock.calls[0];
    expect(doc.knowledge_scope).toBe('PRIVATE');
  });

  it('5. Validation: missing postId → VALIDATION_FAILURE', async () => {
    const result = await service.execute({ ...baseInput, postId: '' });
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

  it('8. DNA-3: unexpected throw → SOCIAL_FEED_UPDATER_ERROR', async () => {
    mockDb.storeDocument.mockImplementationOnce(() => {
      throw new Error('unexpected');
    });
    const result = await service.execute(baseInput);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SOCIAL_FEED_UPDATER_ERROR');
  });
});
