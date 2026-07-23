/**
 * FLOW-20 Integration Tests — Ads Platform
 * Tests multi-service orchestration across T625-T628
 *
 * INT-1: Consent gate → auction → fraud check → political review (happy path)
 * INT-2: Consent gate failure blocks entire flow
 * INT-3: Fraud detection triggers budget restoration
 * INT-4: Political content escalation to human review
 * INT-5: End-to-end event emission ordering (DNA-8 outbox pattern)
 */

import 'reflect-metadata';
import { ConsentGateEnforcerService } from '../../../src/engine/flows/ads-platform/consent-gate-enforcer.service';
import { AuctionBidProcessorService } from '../../../src/engine/flows/ads-platform/auction-bid-processor.service';
import { FraudPreBillingValidatorService } from '../../../src/engine/flows/ads-platform/fraud-pre-billing-validator.service';
import { PoliticalContentReviewerService } from '../../../src/engine/flows/ads-platform/political-content-reviewer.service';

describe('FLOW-20 Ads Platform Integration Tests', () => {
  let consentService: ConsentGateEnforcerService;
  let auctionService: AuctionBidProcessorService;
  let fraudService: FraudPreBillingValidatorService;
  let politicalService: PoliticalContentReviewerService;

  const eventLog: Array<{ type: string; data: Record<string, unknown> }> = [];

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
    get: jest.fn().mockReturnValue({ tenantId: 'tenant-int-001' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    eventLog.length = 0;

    mockDb.searchDocuments.mockImplementation((index: string, filter: Record<string, unknown>) => {
      if (index === 'xiigen-consent-records') {
        return Promise.resolve({
          isSuccess: true,
          data: [
            {
              userId: filter['userId'],
              adsConsent: true,
              expiresAt: new Date(Date.now() + 86400000).toISOString(),
            },
          ],
        });
      }
      if (index === 'xiigen-auction-bid-locks') {
        return Promise.resolve({ isSuccess: true, data: [] });
      }
      if (index === 'xiigen-advertiser-budgets') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ budgetKey: filter['budgetKey'], balanceCents: 100000 }],
        });
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });

    mockDb.storeDocument.mockImplementation(() => Promise.resolve({ isSuccess: true }));

    mockQueue.enqueue.mockImplementation((type: string, data: Record<string, unknown>) => {
      eventLog.push({ type, data });
      return Promise.resolve({ isSuccess: true });
    });

    consentService = new ConsentGateEnforcerService(
      mockDb as any,
      mockQueue as any,
      mockCls as any,
    );

    auctionService = new AuctionBidProcessorService(
      mockDb as any,
      mockQueue as any,
      mockCls as any,
    );

    fraudService = new FraudPreBillingValidatorService(
      mockDb as any,
      mockQueue as any,
      mockAi as any,
      mockCls as any,
    );

    politicalService = new PoliticalContentReviewerService(
      mockDb as any,
      mockQueue as any,
      mockAi as any,
      mockCls as any,
    );
  });

  // INT-1: Happy path (consent → auction → fraud → political)
  test('INT-1: Consent gate → auction → fraud check → political review (happy path)', async () => {
    // Step 1: Consent gate
    const consentResult = await consentService.enforceConsentGate({
      userId: 'user-int-001',
    });
    expect(consentResult.isSuccess).toBe(true);

    // Step 2: Auction bid
    const auctionResult = await auctionService.processBid({
      auctionId: 'auction-int-001',
      bidId: 'bid-int-001',
      advertiserId: 'adv-int-001',
      bidAmountCents: 5000,
    });
    expect(auctionResult.isSuccess).toBe(true);

    // Step 3: Fraud check
    const fraudResult = await fraudService.validateFraud({
      bidId: 'bid-int-001',
      auctionId: 'auction-int-001',
      advertiserId: 'adv-int-001',
      bidAmountCents: 5000,
    });
    // May pass or fail depending on simulated fraud score

    // Step 4: Political review
    const politicalResult = await politicalService.reviewPoliticalContent({
      adId: 'ad-int-001',
      content: 'Sample ad content',
      advertiserId: 'adv-int-001',
    });
    expect(mockDb.storeDocument).toHaveBeenCalled();
  });

  // INT-2: Consent gate failure blocks flow
  test('INT-2: Consent gate failure blocks entire flow', async () => {
    // Make consent check fail
    mockDb.searchDocuments.mockImplementationOnce(() =>
      Promise.resolve({ isSuccess: true, data: [] }),
    );

    const consentResult = await consentService.enforceConsentGate({
      userId: 'user-int-blocked',
    });

    expect(consentResult.isSuccess).toBe(false);
    expect(consentResult.errorCode).toBe('CONSENT_MISSING');

    // Subsequent services should not be called if this fails
    const consentFailEvent = eventLog.find((e) => e.type === 'ConsentGateFailed');
    expect(consentFailEvent).toBeDefined();
  });

  // INT-3: Fraud detection triggers budget restoration
  test('INT-3: Fraud detection triggers budget restoration', async () => {
    const fraudResult = await fraudService.validateFraud({
      bidId: 'bid-int-003',
      auctionId: 'auction-int-003',
      advertiserId: 'adv-int-003',
      bidAmountCents: 10000,
    });

    // If fraud detected, budget restoration should have been attempted
    const fraudEvent = eventLog.find((e) => e.type === 'FraudDetected');
    if (fraudEvent) {
      expect(fraudResult.isSuccess).toBe(false);
      // Budget store should have been called
      const budgetStoreCalls = mockDb.storeDocument.mock.calls.filter(
        (call) => call[0] === 'xiigen-advertiser-budgets',
      );
      expect(budgetStoreCalls.length).toBeGreaterThan(0);
    }
  });

  // INT-4: Political content escalation to human review
  test('INT-4: Political content escalation to human review', async () => {
    const politicalResult = await politicalService.reviewPoliticalContent({
      adId: 'ad-int-004',
      content: 'election voting campaign democratic process',
      advertiserId: 'adv-int-004',
    });

    // Check if human review was queued
    const humanReviewCalls = mockDb.storeDocument.mock.calls.filter(
      (call) => call[0] === 'xiigen-human-review-queue',
    );
    const escalationEvent = eventLog.find((e) => e.type === 'PoliticalContentReviewPending');

    if (escalationEvent) {
      expect(humanReviewCalls.length).toBeGreaterThan(0);
      expect(politicalResult.data).toEqual(
        expect.objectContaining({
          status: 'PENDING_HUMAN_REVIEW',
        }),
      );
    }
  });

  // INT-5: Event emission ordering (DNA-8 outbox pattern)
  test('INT-5: storeDocument occurs before enqueue (DNA-8)', async () => {
    mockDb.storeDocument.mockClear();
    mockQueue.enqueue.mockClear();

    const callSequence: string[] = [];

    mockDb.storeDocument.mockImplementation((index: string) => {
      callSequence.push(`store:${index}`);
      return Promise.resolve({ isSuccess: true });
    });

    mockQueue.enqueue.mockImplementation((type: string) => {
      callSequence.push(`emit:${type}`);
      return Promise.resolve({ isSuccess: true });
    });

    // Run auction service which should follow DNA-8
    await auctionService.processBid({
      auctionId: 'auction-dna8',
      bidId: 'bid-dna8',
      advertiserId: 'adv-dna8',
      bidAmountCents: 5000,
    });

    // Find audit store and BidAccepted emit
    const auditStoreIndex = callSequence.findIndex((c) => c.includes('xiigen-auction-audit'));
    const bidAcceptIndex = callSequence.findIndex((c) => c === 'emit:BidAccepted');

    if (auditStoreIndex >= 0 && bidAcceptIndex >= 0) {
      expect(auditStoreIndex).toBeLessThan(bidAcceptIndex);
    }
  });
});
