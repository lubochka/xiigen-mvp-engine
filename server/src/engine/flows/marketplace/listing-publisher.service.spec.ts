// T83 ListingPublisher — unit tests
// Validates: audit-first order, moderation-to-draft pattern, zero-price acceptance

import { ListingPublisherService } from './listing-publisher.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

function makeMocks() {
  const db = {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({ id: 'lst-001' })),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  };
  const priceValidator = {
    validate: jest.fn().mockResolvedValue(DataProcessResult.success({ valid: true })),
  };
  const moderationService = {
    check: jest.fn().mockResolvedValue(DataProcessResult.success({ decision: 'PASS' })),
  };
  const auditService = {
    writeAudit: jest.fn().mockResolvedValue(DataProcessResult.success({ auditId: 'aud-001' })),
  };
  const queue = {
    enqueue: jest.fn().mockResolvedValue(DataProcessResult.success({ messageId: 'msg-001' })),
  };
  return { db, priceValidator, moderationService, auditService, queue };
}

const BASE_REQUEST = {
  listingId: 'lst-001',
  tenantId: 'tenant-alpha',
  title: 'Test Listing',
  description: 'A great item',
  price: 29.99,
  categoryId: 'cat-001',
  sellerId: 'seller-001',
};

describe('ListingPublisherService — T83', () => {
  let service: ListingPublisherService;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    service = new ListingPublisherService(
      mocks.db as unknown as IDatabaseService,
      mocks.priceValidator,
      mocks.moderationService,
      mocks.auditService,
      mocks.queue as unknown as IQueueService,
    );
    jest.clearAllMocks();
  });

  it('T83-1: happy path — audit FIRST, then moderation, price, store, enqueue', async () => {
    mocks.auditService.writeAudit.mockResolvedValue(
      DataProcessResult.success({ auditId: 'aud-001' }),
    );
    mocks.moderationService.check.mockResolvedValue(
      DataProcessResult.success({ decision: 'PASS' }),
    );
    mocks.priceValidator.validate.mockResolvedValue(DataProcessResult.success({ valid: true }));
    mocks.db.storeDocument.mockResolvedValue(DataProcessResult.success({ id: 'lst-001' }));
    mocks.queue.enqueue.mockResolvedValue(DataProcessResult.success({ messageId: 'msg-001' }));

    const result = await service.publishListing(BASE_REQUEST);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('PUBLISHED');

    // IR-1: audit MUST be called before moderation
    const auditOrder = (mocks.auditService.writeAudit as jest.Mock).mock.invocationCallOrder[0];
    const moderationOrder = (mocks.moderationService.check as jest.Mock).mock
      .invocationCallOrder[0];
    expect(auditOrder).toBeLessThan(moderationOrder);
  });

  it('T83-2: moderation rejection → success({ status: DRAFT }) — never failure()', async () => {
    mocks.auditService.writeAudit.mockResolvedValue(
      DataProcessResult.success({ auditId: 'aud-002' }),
    );
    mocks.moderationService.check.mockResolvedValue(
      DataProcessResult.success({ decision: 'REJECTED', reason: 'CONTENT_POLICY' }),
    );

    const result = await service.publishListing(BASE_REQUEST);

    // IR-2: NOT failure() — success with DRAFT status
    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('DRAFT');
    expect(result.data?.moderationReason).toBe('CONTENT_POLICY');
  });

  it('T83-3: price = 0 → accepted (free listing)', async () => {
    mocks.auditService.writeAudit.mockResolvedValue(
      DataProcessResult.success({ auditId: 'aud-003' }),
    );
    mocks.moderationService.check.mockResolvedValue(
      DataProcessResult.success({ decision: 'PASS' }),
    );
    mocks.priceValidator.validate.mockResolvedValue(DataProcessResult.success({ valid: true }));
    mocks.db.storeDocument.mockResolvedValue(DataProcessResult.success({ id: 'lst-free' }));
    mocks.queue.enqueue.mockResolvedValue(DataProcessResult.success({}));

    const result = await service.publishListing({ ...BASE_REQUEST, price: 0 });

    // IR-3: price=0 is free listing — must be accepted
    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('PUBLISHED');
  });

  it('T83-4: price < 0 → failure (invalid price)', async () => {
    mocks.auditService.writeAudit.mockResolvedValue(
      DataProcessResult.success({ auditId: 'aud-004' }),
    );
    mocks.moderationService.check.mockResolvedValue(
      DataProcessResult.success({ decision: 'PASS' }),
    );

    const result = await service.publishListing({ ...BASE_REQUEST, price: -10 });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_PRICE');
  });

  it('T83-5: audit failure stops pipeline immediately', async () => {
    mocks.auditService.writeAudit.mockResolvedValue(
      DataProcessResult.failure('AUDIT_UNAVAILABLE', 'Audit service down'),
    );

    const result = await service.publishListing(BASE_REQUEST);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('AUDIT_WRITE_FAILED');
    // moderation must NOT be called if audit fails
    expect(mocks.moderationService.check).not.toHaveBeenCalled();
  });

  it('T83-6: storeDocument called BEFORE enqueue (DNA-8)', async () => {
    mocks.auditService.writeAudit.mockResolvedValue(
      DataProcessResult.success({ auditId: 'aud-006' }),
    );
    mocks.moderationService.check.mockResolvedValue(
      DataProcessResult.success({ decision: 'PASS' }),
    );
    mocks.priceValidator.validate.mockResolvedValue(DataProcessResult.success({ valid: true }));
    mocks.db.storeDocument.mockResolvedValue(DataProcessResult.success({ id: 'lst-001' }));
    mocks.queue.enqueue.mockResolvedValue(DataProcessResult.success({}));

    await service.publishListing(BASE_REQUEST);

    const storeOrder = (mocks.db.storeDocument as jest.Mock).mock.invocationCallOrder[0];
    const enqueueOrder = (mocks.queue.enqueue as jest.Mock).mock.invocationCallOrder[0];
    expect(storeOrder).toBeLessThan(enqueueOrder);
  });
});
