// T86 ListingAnalyticsAggregatorService — unit tests
// Validates: MACHINE formula (not config), aggregate-only (no viewerIds), DNA-8 order

import { ListingAnalyticsAggregatorService } from './listing-analytics-aggregator.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

function makeMocks() {
  const db = {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({ id: 'anal-001' })),
  };
  const queue = {
    enqueue: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  };
  const metricsService = {};
  return { db, queue, metricsService };
}

describe('ListingAnalyticsAggregatorService — T86', () => {
  let service: ListingAnalyticsAggregatorService;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    service = new ListingAnalyticsAggregatorService(
      mocks.db as unknown as IDatabaseService,
      mocks.queue as unknown as IQueueService,
      mocks.metricsService as unknown as ConstructorParameters<
        typeof ListingAnalyticsAggregatorService
      >[2],
    );
    jest.clearAllMocks();
  });

  it('T86-1: MACHINE formula — conversionRate = inquiries / (views || 1)', async () => {
    const result = await service.aggregate({
      listingId: 'lst-001',
      tenantId: 'tenant-alpha',
      views: 100,
      inquiries: 15,
      windowClosedAt: new Date().toISOString(),
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.conversionRate).toBe(0.15); // 15 / 100
  });

  it('T86-2: safe division — views=0 uses (views || 1) = 1', async () => {
    const result = await service.aggregate({
      listingId: 'lst-002',
      tenantId: 'tenant-alpha',
      views: 0,
      inquiries: 5,
      windowClosedAt: new Date().toISOString(),
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.conversionRate).toBe(5); // 5 / 1 (safe divisor)
  });

  it('T86-3: storeDocument BEFORE enqueue (DNA-8)', async () => {
    await service.aggregate({
      listingId: 'lst-003',
      tenantId: 'tenant-alpha',
      views: 50,
      inquiries: 3,
      windowClosedAt: new Date().toISOString(),
    });

    const storeOrder = (mocks.db.storeDocument as jest.Mock).mock.invocationCallOrder[0];
    const enqueueOrder = (mocks.queue.enqueue as jest.Mock).mock.invocationCallOrder[0];
    expect(storeOrder).toBeLessThan(enqueueOrder);
  });

  it('T86-4: stored document has NO viewerIds (aggregate-only — IR-2)', async () => {
    await service.aggregate({
      listingId: 'lst-004',
      tenantId: 'tenant-alpha',
      views: 10,
      inquiries: 1,
      windowClosedAt: new Date().toISOString(),
    });

    const storeArgs = (mocks.db.storeDocument as jest.Mock).mock.calls[0][1];
    expect(storeArgs['viewerIds']).toBeUndefined();
    expect(storeArgs['perUserHistory']).toBeUndefined();
  });

  it('T86-5: store failure returns failure result (DNA-3)', async () => {
    mocks.db.storeDocument.mockResolvedValue(DataProcessResult.failure('STORE_ERROR', 'DB down'));

    const result = await service.aggregate({
      listingId: 'lst-005',
      tenantId: 'tenant-alpha',
      views: 10,
      inquiries: 1,
      windowClosedAt: new Date().toISOString(),
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('STORE_FAILED');
  });
});
