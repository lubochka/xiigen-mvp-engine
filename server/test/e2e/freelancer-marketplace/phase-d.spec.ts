/**
 * T616 FreelancerReviewWriter — Phase D tests
 * FLOW-17: Freelancer Marketplace
 *
 * Tests: T616-1 through T616-5
 *   T616-1: Invalid direction → INVALID_DIRECTION; no write
 *   T616-2: Duplicate direction → DuplicateReviewRejected; no write
 *   T616-3: storeDocument(audit) before enqueue(FreelancerReviewSubmitted) — DNA-8
 *   T616-4: Comment excluded from audit record — PLATFORM_ONLY-safe
 *   T616-5: FreelancerReviewSubmitted payload carries required fields (no comment)
 */

import 'reflect-metadata';
import { FreelancerReviewWriterService } from '../../../src/engine/flows/freelancer-marketplace/freelancer-review-writer.service';

describe('T616 FreelancerReviewWriter', () => {
  let service: FreelancerReviewWriterService;

  // Track call order for DNA-8 verification
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
    getCurrentTenantId: jest.fn().mockReturnValue({
      isSuccess: true,
      data: 'tenant-001',
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;

    // Default: contract exists with current tenant as participant; no existing review
    mockDb.searchDocuments.mockImplementation((index: string) => {
      if (index === 'xiigen-freelancer-contracts') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ clientTenantId: 'tenant-001', freelancerTenantId: 'fl-001' }],
        });
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });

    // Default: all storeDocument calls succeed
    mockDb.storeDocument.mockImplementation(
      (index: string, _doc: Record<string, unknown>, _id?: string) => {
        callOrder.push(`storeDocument:${index}`);
        return Promise.resolve({ isSuccess: true });
      },
    );

    // Track enqueue calls
    mockQueue.enqueue.mockImplementation((eventType: string) => {
      callOrder.push(`enqueue:${eventType}`);
      return Promise.resolve({ isSuccess: true });
    });

    service = new FreelancerReviewWriterService(
      mockDb as unknown as ConstructorParameters<typeof FreelancerReviewWriterService>[0],
      mockQueue as unknown as ConstructorParameters<typeof FreelancerReviewWriterService>[1],
      mockCls as unknown as ConstructorParameters<typeof FreelancerReviewWriterService>[2],
    );
  });

  // T616-1: Invalid direction → INVALID_DIRECTION; no write
  test('T616-1: invalid direction → INVALID_DIRECTION; no storeDocument to reviews', async () => {
    const result = await service.submitReview({
      engagementId: 'eng-001',
      direction: 'INVALID_DIRECTION', // not a valid direction
      rating: 4,
      reviewerId: 'user-001',
      targetId: 'user-002',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_DIRECTION');

    // No write to reviews index
    const reviewStore = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-freelancer-reviews',
    );
    expect(reviewStore).toBeUndefined();

    // No FreelancerReviewSubmitted emitted
    expect(mockQueue.enqueue).not.toHaveBeenCalledWith(
      'FreelancerReviewSubmitted',
      expect.anything(),
    );
  });

  // T616-2: Duplicate direction → DuplicateReviewRejected; no write
  test('T616-2: duplicate direction → DuplicateReviewRejected emitted; no review write', async () => {
    // Override to return contract first (participant check), then duplicate review
    mockDb.searchDocuments.mockImplementation((index: string) => {
      if (index === 'xiigen-freelancer-contracts') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ clientTenantId: 'tenant-001', freelancerTenantId: 'fl-001' }],
        });
      }
      if (index === 'xiigen-freelancer-reviews') {
        return Promise.resolve({
          isSuccess: true,
          data: [{ reviewId: 'existing-review', direction: 'CLIENT_TO_FREELANCER' }],
        });
      }
      return Promise.resolve({ isSuccess: true, data: [] });
    });

    const result = await service.submitReview({
      engagementId: 'eng-002',
      direction: 'CLIENT_TO_FREELANCER',
      rating: 5,
      reviewerId: 'client-001',
      targetId: 'fl-001',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DUPLICATE_REVIEW');

    // DuplicateReviewRejected emitted
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'DuplicateReviewRejected',
      expect.objectContaining({
        engagementId: 'eng-002',
        direction: 'CLIENT_TO_FREELANCER',
        reason: 'ALREADY_REVIEWED_IN_DIRECTION',
      }),
    );

    // No review write
    const reviewStore = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-freelancer-reviews',
    );
    expect(reviewStore).toBeUndefined();
  });

  // T616-3: storeDocument(audit) before enqueue(FreelancerReviewSubmitted) — DNA-8
  test('T616-3: storeDocument(audit) called before enqueue(FreelancerReviewSubmitted) — DNA-8 order verified', async () => {
    const result = await service.submitReview({
      engagementId: 'eng-003',
      direction: 'CLIENT_TO_FREELANCER',
      rating: 4,
      reviewerId: 'client-001',
      targetId: 'fl-001',
      comment: 'Great work!',
    });

    expect(result.isSuccess).toBe(true);

    // DNA-8: audit storeDocument BEFORE FreelancerReviewSubmitted enqueue
    const auditIdx = callOrder.findIndex((c) => c === 'storeDocument:xiigen-review-audit');
    const emitIdx = callOrder.findIndex((c) => c === 'enqueue:FreelancerReviewSubmitted');
    expect(auditIdx).toBeGreaterThanOrEqual(0);
    expect(emitIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeLessThan(emitIdx);
  });

  // T616-4: Comment excluded from audit record — PLATFORM_ONLY-safe
  test('T616-4: comment field excluded from audit record — PLATFORM_ONLY-safe, no PII in platform audit', async () => {
    const result = await service.submitReview({
      engagementId: 'eng-004',
      direction: 'FREELANCER_TO_CLIENT',
      rating: 3,
      reviewerId: 'fl-001',
      targetId: 'client-001',
      comment: 'Payment was slow and communication poor',
    });

    expect(result.isSuccess).toBe(true);

    // Audit storeDocument should NOT include comment
    const auditStore = mockDb.storeDocument.mock.calls.find(
      (c: unknown[]) => c[0] === 'xiigen-review-audit',
    );
    expect(auditStore).toBeDefined();
    const auditRecord = auditStore![1] as Record<string, unknown>;
    // Comment intentionally excluded from audit — IR-4, CF-17-4
    expect(auditRecord).not.toHaveProperty('comment');
    // But rating, direction, and reviewId must be present
    expect(auditRecord).toHaveProperty('rating', 3);
    expect(auditRecord).toHaveProperty('direction', 'FREELANCER_TO_CLIENT');
    expect(auditRecord).toHaveProperty('reviewId');
  });

  // T616-5: FreelancerReviewSubmitted payload carries required fields (no comment)
  test('T616-5: FreelancerReviewSubmitted payload carries: reviewId, engagementId, direction, rating, reviewerId, targetId', async () => {
    const result = await service.submitReview({
      engagementId: 'eng-005',
      direction: 'CLIENT_TO_FREELANCER',
      rating: 5,
      reviewerId: 'client-005',
      targetId: 'fl-005',
      comment: 'Excellent work, on time and professional',
    });

    expect(result.isSuccess).toBe(true);

    const submittedCall = mockQueue.enqueue.mock.calls.find(
      (c: unknown[]) => c[0] === 'FreelancerReviewSubmitted',
    );
    expect(submittedCall).toBeDefined();
    const payload = submittedCall![1] as Record<string, unknown>;
    expect(payload).toHaveProperty('reviewId');
    expect(payload).toHaveProperty('engagementId', 'eng-005');
    expect(payload).toHaveProperty('direction', 'CLIENT_TO_FREELANCER');
    expect(payload).toHaveProperty('rating', 5);
    expect(payload).toHaveProperty('reviewerId', 'client-005');
    expect(payload).toHaveProperty('targetId', 'fl-005');
    expect(payload).toHaveProperty('submittedAt');
    // Comment should NOT be in event payload
    expect(payload).not.toHaveProperty('comment');
  });
});
