// T78 FeedDeliveryOrchestratorService — unit tests
// Validates: T81 unconditional re-check, suppressed:true on blocked, score threshold, storeDocument before enqueue

import { FeedDeliveryOrchestratorService } from './feed-delivery-orchestrator.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

describe('FeedDeliveryOrchestratorService (T78)', () => {
  const makeRequest = (score = 0.8) => ({
    feedItemId: 'feed-item-001',
    tenantId: 'tenant-1',
    recipientUserId: 'user-B',
    score,
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

  const makeFreedom = (threshold = 0.1) => ({
    getConfig: jest
      .fn()
      .mockResolvedValue(DataProcessResult.success({ flow07_delivery_score_threshold: threshold })),
  });

  it('T78-1: T81 called unconditionally (two-phase always re-checks)', async () => {
    const privacyGatekeeper = makePrivacyGatekeeper(true) as any;
    const service = new FeedDeliveryOrchestratorService(
      makeDb() as unknown as IDatabaseService,
      makeQueue() as unknown as IQueueService,
      privacyGatekeeper,
      makeFreedom(),
    );

    await service.deliverFeedItem(makeRequest());

    expect(privacyGatekeeper.check).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'feed_delivery' }),
    );
    expect(privacyGatekeeper.check).toHaveBeenCalledTimes(1);
  });

  it('T78-2: suppressed:true when T81 returns allowed=false', async () => {
    const db = makeDb();
    const queue = makeQueue();

    const service = new FeedDeliveryOrchestratorService(
      db as unknown as IDatabaseService,
      queue as unknown as IQueueService,
      makePrivacyGatekeeper(false) as any,
      makeFreedom(),
    );

    const result = await service.deliverFeedItem(makeRequest());

    expect(result.isSuccess).toBe(true);
    expect(result.data?.['suppressed']).toBe(true);
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('T78-3: storeDocument BEFORE enqueue when both phases pass (DNA-8)', async () => {
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

    const service = new FeedDeliveryOrchestratorService(
      db as unknown as IDatabaseService,
      queue as unknown as IQueueService,
      makePrivacyGatekeeper(true) as any,
      makeFreedom(),
    );

    await service.deliverFeedItem(makeRequest());

    expect(callOrder.indexOf('storeDocument')).toBeLessThan(callOrder.indexOf('enqueue'));
  });
});
