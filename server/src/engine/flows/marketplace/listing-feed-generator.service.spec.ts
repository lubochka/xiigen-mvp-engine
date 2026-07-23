// T85 ListingFeedGeneratorService — unit tests
// Validates: count-only payload (no IDs), DNA-8 storeDocument before enqueue

import { ListingFeedGeneratorService } from './listing-feed-generator.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

function makeMocks(listingCount = 5) {
  const db = {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({ id: 'feed-001' })),
    searchDocuments: jest.fn().mockResolvedValue(
      DataProcessResult.success(
        Array.from({ length: listingCount }, (_, i) => ({
          listingId: `lst-${i}`,
          tenantId: 'tenant-alpha',
        })),
      ),
    ),
  };
  const queue = {
    enqueue: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  };
  return { db, queue };
}

describe('ListingFeedGeneratorService — T85', () => {
  it('T85-1: happy path — generates count-only feed payload', async () => {
    const mocks = makeMocks(3);
    const service = new ListingFeedGeneratorService(
      mocks.db as unknown as IDatabaseService,
      mocks.queue as unknown as IQueueService,
    );

    const result = await service.generateFeed({ tenantId: 'tenant-alpha', buyerId: 'buyer-001' });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.count).toBe(3);
    expect((result.data as unknown as Record<string, unknown>)?.['listingId']).toBeUndefined();
    expect((result.data as unknown as Record<string, unknown>)?.['ids']).toBeUndefined();
  });

  it('T85-2: IR-1 — enqueued event payload has count only, no listing IDs', async () => {
    const mocks = makeMocks(5);
    const service = new ListingFeedGeneratorService(
      mocks.db as unknown as IDatabaseService,
      mocks.queue as unknown as IQueueService,
    );

    await service.generateFeed({ tenantId: 'tenant-alpha', buyerId: 'buyer-001' });

    const enqueueCall = (mocks.queue.enqueue as jest.Mock).mock.calls[0];
    const payload = enqueueCall[1] as Record<string, unknown>;
    expect(payload['count']).toBeDefined();
    expect(payload['listingId']).toBeUndefined();
    expect(payload['ids']).toBeUndefined();
    expect(payload['referenceIds']).toBeUndefined();
  });

  it('T85-3: storeDocument BEFORE enqueue (DNA-8)', async () => {
    const mocks = makeMocks(2);
    const service = new ListingFeedGeneratorService(
      mocks.db as unknown as IDatabaseService,
      mocks.queue as unknown as IQueueService,
    );

    await service.generateFeed({ tenantId: 'tenant-alpha', buyerId: 'buyer-001' });

    const storeOrder = (mocks.db.storeDocument as jest.Mock).mock.invocationCallOrder[0];
    const enqueueOrder = (mocks.queue.enqueue as jest.Mock).mock.invocationCallOrder[0];
    expect(storeOrder).toBeLessThan(enqueueOrder);
  });

  it('T85-4: respects maxCount limit', async () => {
    const mocks = makeMocks(50);
    const service = new ListingFeedGeneratorService(
      mocks.db as unknown as IDatabaseService,
      mocks.queue as unknown as IQueueService,
    );

    const result = await service.generateFeed({
      tenantId: 'tenant-alpha',
      buyerId: 'buyer-001',
      maxCount: 10,
    });

    expect(result.data?.count).toBe(10); // capped at maxCount
  });

  it('T85-5: store failure returns failure result (DNA-3)', async () => {
    const mocks = makeMocks(5);
    mocks.db.storeDocument.mockResolvedValue(DataProcessResult.failure('STORE_ERROR', 'DB down'));
    const service = new ListingFeedGeneratorService(
      mocks.db as unknown as IDatabaseService,
      mocks.queue as unknown as IQueueService,
    );

    const result = await service.generateFeed({ tenantId: 'tenant-alpha', buyerId: 'buyer-001' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('STORE_FAILED');
  });
});
