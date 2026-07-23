// T84 CatalogIndexer — unit tests
// Validates: F227 injection, version-keyed idempotency, storeDocument before enqueue

import { CatalogIndexerService } from './catalog-indexer.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

function makeMocks() {
  const db = {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({ id: 'idx-001' })),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  };
  const searchIndex = {
    index: jest.fn().mockResolvedValue(DataProcessResult.success({ docId: 'idx-001' })),
  };
  const queue = {
    enqueue: jest.fn().mockResolvedValue(DataProcessResult.success({ messageId: 'msg-001' })),
  };
  return { db, searchIndex, queue };
}

const BASE_REQUEST = {
  listingId: 'lst-001',
  tenantId: 'tenant-alpha',
  title: 'Test Listing',
  description: 'A great item',
  price: 29.99,
  categoryId: 'cat-001',
  sellerId: 'seller-001',
  indexVersion: 'v1',
};

describe('CatalogIndexerService — T84', () => {
  let service: CatalogIndexerService;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    service = new CatalogIndexerService(
      mocks.db as unknown as IDatabaseService,
      mocks.searchIndex,
      mocks.queue as unknown as IQueueService,
    );
    jest.clearAllMocks();
  });

  it('T84-1: happy path — indexes via F227 then stores then enqueues', async () => {
    const result = await service.indexListing(BASE_REQUEST);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.listingId).toBe('lst-001');
    expect(result.data?.indexVersion).toBe('v1');
    expect(mocks.searchIndex.index).toHaveBeenCalled();
  });

  it('T84-2: version-keyed idempotency — deterministic docId from listingId+version', async () => {
    await service.indexListing(BASE_REQUEST);

    const searchIndexCall = (mocks.searchIndex.index as jest.Mock).mock.calls[0][0];
    expect(searchIndexCall.docId).toBe('idx-lst-001-v1');
  });

  it('T84-3: storeDocument called BEFORE enqueue (DNA-8)', async () => {
    await service.indexListing(BASE_REQUEST);

    const storeOrder = (mocks.db.storeDocument as jest.Mock).mock.invocationCallOrder[0];
    const enqueueOrder = (mocks.queue.enqueue as jest.Mock).mock.invocationCallOrder[0];
    expect(storeOrder).toBeLessThan(enqueueOrder);
  });

  it('T84-4: search index failure propagates as failure', async () => {
    mocks.searchIndex.index.mockResolvedValue(
      DataProcessResult.failure('INDEX_UNAVAILABLE', 'Search down'),
    );

    const result = await service.indexListing(BASE_REQUEST);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INDEX_FAILED');
  });

  it('T84-5: enqueues CatalogIndexed event after store', async () => {
    await service.indexListing(BASE_REQUEST);

    expect(mocks.queue.enqueue).toHaveBeenCalledWith(
      'marketplace.catalog.indexed',
      expect.objectContaining({ listingId: 'lst-001', indexVersion: 'v1' }),
    );
  });
});
