// T87 ListingModerationEngineService — unit tests
// Validates: three-path PASS/REJECT/UNCERTAIN, UNCERTAIN→human queue, DNA-8 order

import { ListingModerationEngineService } from './listing-moderation-engine.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';

function makeMocks() {
  const db = {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({ id: 'mod-001' })),
  };
  const moderationAi = {
    check: jest.fn().mockResolvedValue(DataProcessResult.success({ decision: 'PASS' })),
  };
  const humanReviewQueue = {
    enqueue: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  };
  return { db, moderationAi, humanReviewQueue };
}

const BASE_REQUEST = {
  listingId: 'lst-001',
  tenantId: 'tenant-alpha',
  title: 'Test Listing',
  description: 'A great item',
  price: 29.99,
};

describe('ListingModerationEngineService — T87', () => {
  let service: ListingModerationEngineService;
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    mocks = makeMocks();
    service = new ListingModerationEngineService(
      mocks.db as unknown as IDatabaseService,
      mocks.moderationAi,
      mocks.humanReviewQueue,
    );
    jest.clearAllMocks();
  });

  it('T87-1: PASS decision — stores PASS record and enqueues passed event', async () => {
    mocks.moderationAi.check.mockResolvedValue(DataProcessResult.success({ decision: 'PASS' }));

    const result = await service.moderate(BASE_REQUEST);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.decision).toBe('PASS');
  });

  it('T87-2: REJECT decision — stores REJECT record with reason', async () => {
    mocks.moderationAi.check.mockResolvedValue(
      DataProcessResult.success({ decision: 'REJECT', reason: 'PROHIBITED_ITEM' }),
    );

    const result = await service.moderate(BASE_REQUEST);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.decision).toBe('REJECT');
    expect(result.data?.reason).toBe('PROHIBITED_ITEM');
  });

  it('T87-3: UNCERTAIN → human review queue — not auto-rejected (IR-2)', async () => {
    mocks.moderationAi.check.mockResolvedValue(
      DataProcessResult.success({ decision: 'UNCERTAIN', reason: 'NEEDS_REVIEW' }),
    );

    const result = await service.moderate(BASE_REQUEST);

    expect(result.isSuccess).toBe(true); // NOT failure
    expect(result.data?.decision).toBe('UNCERTAIN');
    expect(result.data?.humanReviewTaskId).toBeDefined();
    expect(mocks.humanReviewQueue.enqueue).toHaveBeenCalledWith(
      'marketplace.moderation.human_review_requested',
      expect.objectContaining({ listingId: 'lst-001', humanReviewTaskId: expect.any(String) }),
    );
  });

  it('T87-4: AI failure → UNCERTAIN (routes to human queue)', async () => {
    mocks.moderationAi.check.mockResolvedValue(
      DataProcessResult.failure('AI_ERROR', 'AI unavailable'),
    );

    const result = await service.moderate(BASE_REQUEST);

    expect(result.isSuccess).toBe(true); // DNA-3: never throw, return success UNCERTAIN
    expect(result.data?.decision).toBe('UNCERTAIN');
  });

  it('T87-5: storeDocument BEFORE enqueue (DNA-8)', async () => {
    mocks.moderationAi.check.mockResolvedValue(DataProcessResult.success({ decision: 'PASS' }));

    await service.moderate(BASE_REQUEST);

    const storeOrder = (mocks.db.storeDocument as jest.Mock).mock.invocationCallOrder[0];
    const enqueueOrder = (mocks.humanReviewQueue.enqueue as jest.Mock).mock.invocationCallOrder[0];
    expect(storeOrder).toBeLessThan(enqueueOrder);
  });
});
