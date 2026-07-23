import { FeedScorerService } from './feed-scorer.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

describe('FeedScorerService (T77)', () => {
  const makeRequest = (overrides?: Partial<{ feedItemId: string; score: number }>) => ({
    feedItemId: overrides?.feedItemId ?? 'feed-item-001',
    tenantId: 'tenant-1',
    recipientUserId: 'user-B',
    contentType: 'post',
  });

  const makeFreedomConfigService = () => ({
    getConfig: jest
      .fn()
      .mockResolvedValue(DataProcessResult.success({ recency: 0.4, engagement: 0.6 })),
  });

  const makeDb = () => ({
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({ stored: true })),
  });

  const makeQueue = () => ({
    enqueue: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  });

  const makeAiContentService = (score: number) => ({
    scoreFeedItem: jest.fn().mockResolvedValue(DataProcessResult.success({ score })),
  });

  it('T77-1: score=0 item: FeedItemScored emitted (not filtered) — result.data.score === 0', async () => {
    const queue = makeQueue();

    const service = new FeedScorerService(
      makeAiContentService(0),
      makeFreedomConfigService(),
      makeDb() as unknown as IDatabaseService,
      queue as unknown as IQueueService,
    );

    const result = await service.scoreFeedItem(makeRequest());

    expect(result.isSuccess).toBe(true);
    expect(result.data?.score).toBe(0);
    expect(queue.enqueue).toHaveBeenCalledWith(
      'social.feed.item.scored',
      expect.objectContaining({ score: 0 }),
    );
  });

  it('T77-2: score>0 item: normal emit path', async () => {
    const queue = makeQueue();

    const service = new FeedScorerService(
      makeAiContentService(0.85),
      makeFreedomConfigService(),
      makeDb() as unknown as import('../../../fabrics/interfaces/database.interface').IDatabaseService,
      queue as unknown as IQueueService,
    );

    const result = await service.scoreFeedItem(makeRequest());

    expect(result.isSuccess).toBe(true);
    expect(result.data?.score).toBe(0.85);
    expect(queue.enqueue).toHaveBeenCalledWith(
      'social.feed.item.scored',
      expect.objectContaining({ score: 0.85 }),
    );
  });

  it('T77-3: storeDocument BEFORE enqueue (DNA-8 call order)', async () => {
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

    const service = new FeedScorerService(
      makeAiContentService(0.5),
      makeFreedomConfigService(),
      db as unknown as IDatabaseService,
      queue as unknown as IQueueService,
    );

    await service.scoreFeedItem(makeRequest());

    expect(callOrder.indexOf('storeDocument')).toBeLessThan(callOrder.indexOf('enqueue'));
  });
});
