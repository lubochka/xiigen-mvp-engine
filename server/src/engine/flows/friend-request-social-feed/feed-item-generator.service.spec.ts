// T76 FeedItemGeneratorService — unit tests
// Validates: T81 before storeDocument, skipped:true on blocked, storeDocument before enqueue

import { FeedItemGeneratorService } from './feed-item-generator.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

describe('FeedItemGeneratorService (T76)', () => {
  const makeRequest = () => ({
    activityId: 'act-001',
    sourceUserId: 'user-A',
    targetUserId: 'user-B',
    tenantId: 'tenant-1',
    activityType: 'post_created',
  });

  const makePrivacyGatekeeper = (allowed: boolean) => ({
    check: jest.fn().mockResolvedValue(DataProcessResult.success({ allowed })),
  });

  const makeDb = () => ({
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({ stored: true })),
  });

  const makeQueue = () => ({
    enqueue: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  });

  const makeAiContentService = () => ({
    generateFeedItem: jest
      .fn()
      .mockResolvedValue(DataProcessResult.success({ content: 'Generated feed content' })),
  });

  const makeFreedom = () => ({
    getConfig: jest
      .fn()
      .mockResolvedValue(DataProcessResult.success({ flow07_feed_items_per_connection: 10 })),
  });

  it('T76-1: T81 called BEFORE storeDocument and enqueue (call order spy)', async () => {
    const callOrder: string[] = [];
    const privacyGatekeeper = {
      check: jest.fn().mockImplementation(async () => {
        callOrder.push('privacy');
        return DataProcessResult.success({ allowed: true });
      }),
    } as any;
    const db = {
      storeDocument: jest.fn().mockImplementation(async () => {
        callOrder.push('storeDocument');
        return DataProcessResult.success({ stored: true });
      }),
    };
    const queue = {
      enqueue: jest.fn().mockImplementation(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success({});
      }),
    };

    const service = new FeedItemGeneratorService(
      makeAiContentService(),
      queue as unknown as IQueueService,
      db as unknown as IDatabaseService,
      privacyGatekeeper,
      makeFreedom(),
    );

    await service.generateFeedItem(makeRequest());

    expect(callOrder[0]).toBe('privacy');
    expect(callOrder.indexOf('privacy')).toBeLessThan(callOrder.indexOf('storeDocument'));
    expect(callOrder.indexOf('privacy')).toBeLessThan(callOrder.indexOf('enqueue'));
  });

  it('T76-2: skipped:true when T81 returns allowed=false — no store or enqueue', async () => {
    const db = makeDb();
    const queue = makeQueue();

    const service = new FeedItemGeneratorService(
      makeAiContentService(),
      queue as unknown as IQueueService,
      db as unknown as IDatabaseService,
      makePrivacyGatekeeper(false) as any,
      makeFreedom(),
    );

    const result = await service.generateFeedItem(makeRequest());

    expect(result.isSuccess).toBe(true);
    expect(result.data?.skipped).toBe(true);
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('T76-3: storeDocument BEFORE enqueue when privacy allows (DNA-8 call order)', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn().mockImplementation(async () => {
        callOrder.push('storeDocument');
        return DataProcessResult.success({ stored: true });
      }),
    };
    const queue = {
      enqueue: jest.fn().mockImplementation(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success({});
      }),
    };

    const service = new FeedItemGeneratorService(
      makeAiContentService(),
      queue as unknown as IQueueService,
      db as unknown as IDatabaseService,
      makePrivacyGatekeeper(true) as any,
      makeFreedom(),
    );

    await service.generateFeedItem(makeRequest());

    expect(callOrder.indexOf('storeDocument')).toBeLessThan(callOrder.indexOf('enqueue'));
  });
});
