/**
 * T626 AuctionBidProcessor — Phase B tests
 * FLOW-20: Ads Platform
 *
 * Tests: T626-1 through T626-5
 *   T626-1: SETNX duplicate (lock exists) → returns previous bid; no new enqueue
 *   T626-2: Budget sufficient → DECRBY succeeds; BidAccepted emitted
 *   T626-3: Budget insufficient → INCRBY to restore; BidRejected emitted
 *   T626-4: Auction audit stored before enqueue (DNA-8)
 *   T626-5: storeDocument called for lock, budget, and audit
 */

import 'reflect-metadata';
import { AuctionBidProcessorService } from '../../../src/engine/flows/ads-platform/auction-bid-processor.service';

describe('T626 AuctionBidProcessor', () => {
  let service: AuctionBidProcessorService;

  const callOrder: string[] = [];

  const mockDb = {
    searchDocuments: jest.fn(),
    storeDocument: jest.fn(),
  };

  const mockQueue = {
    enqueue: jest.fn(),
  };

  const mockCls = {
    get: jest.fn().mockReturnValue({ tenantId: 'tenant-001' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;

    mockDb.searchDocuments.mockImplementation((index: string, filter: Record<string, unknown>) => {
      if (index === 'xiigen-auction-bid-locks') {
        // No lock by default
        return Promise.resolve({ isSuccess: true, data: [] });
      }
      if (index === 'xiigen-advertiser-budgets') {
        // Default: advertiser has 100000 cents budget
        return Promise.resolve({
          isSuccess: true,
          data: [{ budgetKey: filter['budgetKey'], balanceCents: 100000 }],
        });
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });

    mockDb.storeDocument.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocument:${index}`);
        return Promise.resolve({ isSuccess: true });
      },
    );

    mockQueue.enqueue.mockImplementation((eventType: string) => {
      callOrder.push(`enqueue:${eventType}`);
      return Promise.resolve({ isSuccess: true });
    });

    service = new AuctionBidProcessorService(
      mockDb as unknown as ConstructorParameters<typeof AuctionBidProcessorService>[0],
      mockQueue as unknown as ConstructorParameters<typeof AuctionBidProcessorService>[1],
      mockCls as unknown as ConstructorParameters<typeof AuctionBidProcessorService>[2],
    );
  });

  // T626-1: SETNX duplicate
  test('T626-1: SETNX duplicate (lock exists) → returns previous bid', async () => {
    mockDb.searchDocuments.mockImplementationOnce(
      (index: string, _filter: Record<string, unknown>) => {
        if (index === 'xiigen-auction-bid-locks') {
          return Promise.resolve({
            isSuccess: true,
            data: [{ bidId: 'bid-existing', bidAmountCents: 5000 }],
          });
        }
        return Promise.resolve({ isSuccess: true, data: [] });
      },
    );

    const result = await service.processBid({
      auctionId: 'auction-001',
      bidId: 'bid-001-new',
      advertiserId: 'adv-001',
      bidAmountCents: 5000,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual(
      expect.objectContaining({
        alreadyProcessed: true,
      }),
    );
    // No new enqueue on duplicate
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  // T626-2: Budget sufficient
  test('T626-2: Budget sufficient → DECRBY succeeds; BidAccepted emitted', async () => {
    const result = await service.processBid({
      auctionId: 'auction-002',
      bidId: 'bid-002',
      advertiserId: 'adv-002',
      bidAmountCents: 5000,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual(
      expect.objectContaining({
        status: 'ACCEPTED',
        newBudgetCents: 95000,
      }),
    );
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'BidAccepted',
      expect.objectContaining({
        bidAmountCents: 5000,
      }),
    );
  });

  // T626-3: Budget insufficient
  test('T626-3: Budget insufficient → INCRBY to restore; BidRejected emitted', async () => {
    mockDb.searchDocuments.mockImplementation((index: string, _filter: Record<string, unknown>) => {
      if (index === 'xiigen-advertiser-budgets') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ budgetKey: 'advertiser-budget:adv-003', balanceCents: 2000 }],
        });
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });

    const result = await service.processBid({
      auctionId: 'auction-003',
      bidId: 'bid-003',
      advertiserId: 'adv-003',
      bidAmountCents: 5000,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('BUDGET_INSUFFICIENT');
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'BidRejected',
      expect.objectContaining({
        reason: 'BUDGET_INSUFFICIENT',
      }),
    );
  });

  // T626-4: Audit stored before enqueue (DNA-8)
  test('T626-4: Auction audit stored before enqueue (DNA-8)', async () => {
    callOrder.length = 0;

    await service.processBid({
      auctionId: 'auction-004',
      bidId: 'bid-004',
      advertiserId: 'adv-004',
      bidAmountCents: 5000,
    });

    // Find order of audit storage and enqueue
    const auditIndex = callOrder.findIndex((c) => c === 'storeDocument:xiigen-auction-audit');
    const enqueueIndex = callOrder.findIndex((c) => c === 'enqueue:BidAccepted');

    expect(auditIndex).toBeGreaterThanOrEqual(0);
    expect(enqueueIndex).toBeGreaterThan(auditIndex); // enqueue after audit
  });

  // T626-5: storeDocument calls
  test('T626-5: storeDocument called for lock, budget, and audit', async () => {
    await service.processBid({
      auctionId: 'auction-005',
      bidId: 'bid-005',
      advertiserId: 'adv-005',
      bidAmountCents: 5000,
    });

    const storeCalls = mockDb.storeDocument.mock.calls.map((call) => call[0]);
    expect(storeCalls).toContain('xiigen-auction-bid-locks');
    expect(storeCalls).toContain('xiigen-advertiser-budgets');
    expect(storeCalls).toContain('xiigen-auction-audit');
  });
});
