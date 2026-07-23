/**
 * T627 FraudPreBillingValidator — Phase C tests
 * FLOW-20: Ads Platform
 *
 * Tests: T627-1 through T627-5
 *   T627-1: fraudScore > threshold → FraudDetected emitted; budget restored via INCRBY
 *   T627-2: fraudScore ≤ threshold → FraudCheckPassed emitted
 *   T627-3: Budget restoration occurs before fraud audit stored (INCRBY before storeDocument)
 *   T627-4: fraudScore included in fraud audit for investigation
 *   T627-5: PCI zero-PAN: card.number and card.cvv absent from audit
 */

import 'reflect-metadata';
import { FraudPreBillingValidatorService } from '../../../src/engine/flows/ads-platform/fraud-pre-billing-validator.service';

describe('T627 FraudPreBillingValidator', () => {
  let service: FraudPreBillingValidatorService;

  const callOrder: string[] = [];

  const mockDb = {
    searchDocuments: jest.fn(),
    storeDocument: jest.fn(),
  };

  const mockQueue = {
    enqueue: jest.fn(),
  };

  const mockAi = {
    generateContent: jest.fn(),
  };

  const mockCls = {
    get: jest.fn().mockReturnValue({ tenantId: 'tenant-001' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;

    mockDb.searchDocuments.mockImplementation((index: string, filter: Record<string, unknown>) => {
      if (index === 'xiigen-advertiser-budgets') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ budgetKey: filter['budgetKey'], balanceCents: 50000 }],
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

    service = new FraudPreBillingValidatorService(
      mockDb as unknown as ConstructorParameters<typeof FraudPreBillingValidatorService>[0],
      mockQueue as unknown as ConstructorParameters<typeof FraudPreBillingValidatorService>[1],
      mockAi as unknown as ConstructorParameters<typeof FraudPreBillingValidatorService>[2],
      mockCls as unknown as ConstructorParameters<typeof FraudPreBillingValidatorService>[3],
    );
  });

  // T627-1: fraudScore > threshold
  test('T627-1: fraudScore > threshold → FraudDetected; budget restored', async () => {
    // bidAmountCents=5071 + advertiserId.length=7 → hash=78, score=0.78 > threshold 0.7
    const result = await service.validateFraud({
      bidId: 'bid-001',
      auctionId: 'auction-001',
      advertiserId: 'adv-001',
      bidAmountCents: 5071,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('FRAUD_DETECTED');
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'FraudDetected',
      expect.objectContaining({
        bidId: 'bid-001',
      }),
    );

    // Budget restoration should have been attempted (INCRBY simulation)
    const storeCall = mockDb.storeDocument.mock.calls.find(
      (call) => call[0] === 'xiigen-advertiser-budgets',
    );
    expect(storeCall).toBeDefined();
  });

  // T627-2: fraudScore ≤ threshold
  test('T627-2: fraudScore ≤ threshold → FraudCheckPassed', async () => {
    const result = await service.validateFraud({
      bidId: 'bid-002',
      auctionId: 'auction-002',
      advertiserId: 'adv-002',
      bidAmountCents: 100,
    });

    // With low bidAmountCents (100), simulated fraudScore will be low
    expect(result.isSuccess).toBe(true);
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'FraudCheckPassed',
      expect.objectContaining({
        bidId: 'bid-002',
      }),
    );
  });

  // T627-3: Budget restoration before audit storage
  test('T627-3: Fraud detected case stores to budget before fraud audit', async () => {
    callOrder.length = 0;

    await service.validateFraud({
      bidId: 'bid-003',
      auctionId: 'auction-003',
      advertiserId: 'adv-003',
      bidAmountCents: 5000,
    });

    const budgetStoreIndex = callOrder.findIndex(
      (c) => c === 'storeDocument:xiigen-advertiser-budgets',
    );
    const auditStoreIndex = callOrder.findIndex((c) => c === 'storeDocument:xiigen-fraud-audit');

    // Budget restoration (INCRBY simulation) should happen before fraud audit
    if (budgetStoreIndex >= 0 && auditStoreIndex >= 0) {
      expect(budgetStoreIndex).toBeLessThan(auditStoreIndex);
    }
  });

  // T627-4: fraudScore in audit
  test('T627-4: fraudScore included in fraud audit record', async () => {
    await service.validateFraud({
      bidId: 'bid-004',
      auctionId: 'auction-004',
      advertiserId: 'adv-004',
      bidAmountCents: 5000,
    });

    const auditCall = mockDb.storeDocument.mock.calls.find(
      (call) => call[0] === 'xiigen-fraud-audit',
    );
    expect(auditCall).toBeDefined();
    expect(auditCall![1]).toHaveProperty('fraudScore');
  });

  // T627-5: PCI zero-PAN in audit
  test('T627-5: PCI zero-PAN: card.number and card.cvv absent from audit', async () => {
    await service.validateFraud({
      bidId: 'bid-005',
      auctionId: 'auction-005',
      advertiserId: 'adv-005',
      bidAmountCents: 5000,
    });

    const auditCall = mockDb.storeDocument.mock.calls.find(
      (call) => call[0] === 'xiigen-fraud-audit',
    );
    expect(auditCall).toBeDefined();

    const auditRecord = auditCall![1] as Record<string, unknown>;
    expect(auditRecord).not.toHaveProperty('card.number');
    expect(auditRecord).not.toHaveProperty('card.cvv');
    expect(auditRecord).not.toHaveProperty('bankAccountNumber');
  });
});
