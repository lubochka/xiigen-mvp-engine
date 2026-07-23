/**
 * FLOW-10 Phase C — T171 ReputationScoreAggregator
 * 8 tests covering retraction, score clamping, published-only filter, FREEDOM config, DNA-8
 *
 * T171-1: ReviewPublished triggers score recalculation
 * T171-2: ReviewRetracted removes review from aggregate
 * T171-3: score clamped to max 5.0
 * T171-4: score clamped to min 1.0
 * T171-5: pending/flagged reviews excluded from score
 * T171-6: recency weights read from FREEDOM config
 * T171-7: DNA-8 — storeDocument before enqueue
 * T171-8: scope_isolation — reputation scores stored PRIVATE
 */

import 'reflect-metadata';
import { ReputationScoreAggregatorService } from '../../../src/engine/flows/reviews-reputation/reputation-score-aggregator.service';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { IDatabaseService } from '../../../src/fabrics/interfaces/database.interface';
import { IQueueService } from '../../../src/fabrics/interfaces/queue.interface';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeInput(
  overrides: Partial<{
    targetEntityId: string;
    targetEntityType: string;
    reviewId: string;
    action: 'PUBLISH' | 'RETRACT';
    tenantId: string;
  }> = {},
) {
  return {
    targetEntityId: 'entity-001',
    targetEntityType: 'PRODUCT',
    reviewId: 'review-001',
    action: 'PUBLISH' as const,
    tenantId: 'tenant-abc',
    ...overrides,
  };
}

function makeFreedom(weights: number[] = [1.0, 0.9, 0.8]) {
  return {
    get: jest.fn().mockImplementation(async (key: string) => {
      if (key === 'flow10_reputation_recency_weights') {
        return { flow10_reputation_recency_weights: weights };
      }
      return {};
    }),
  };
}

function makeDbWithReviews(
  reviews: Array<Record<string, unknown>>,
  callOrder?: string[],
  storeCapture?: Array<Record<string, unknown>>,
) {
  return {
    storeDocument: jest
      .fn()
      .mockImplementation(async (_idx: string, doc: Record<string, unknown>) => {
        if (callOrder) callOrder.push('db.storeDocument');
        if (storeCapture) storeCapture.push({ ...doc, _idx });
        return DataProcessResult.success({});
      }),
    searchDocuments: jest
      .fn()
      .mockImplementation(async (idx: string, filter: Record<string, unknown>) => {
        if (idx === 'xiigen-reviews' && filter['status'] === 'PUBLISHED') {
          return DataProcessResult.success(reviews.filter((r) => r['status'] === 'PUBLISHED'));
        }
        if (idx === 'xiigen-reviews') {
          return DataProcessResult.success(reviews);
        }
        return DataProcessResult.success([]);
      }),
  };
}

function makeQueue(
  callOrder?: string[],
  enqueueCapture?: Array<{ eventType: string; payload: unknown }>,
) {
  return {
    enqueue: jest.fn().mockImplementation(async (eventType: string, payload: unknown) => {
      if (callOrder) callOrder.push(`enqueue:${eventType}`);
      if (enqueueCapture) enqueueCapture.push({ eventType, payload });
      return DataProcessResult.success({});
    }),
  };
}

// ── T171-1: ReviewPublished triggers score recalculation ─────────────────────

describe('T171-1: ReviewPublished triggers score recalculation', () => {
  it('onReviewPublished calculates score from PUBLISHED reviews', async () => {
    const reviews = [
      {
        reviewId: 'r1',
        rating: 4,
        status: 'PUBLISHED',
        submittedAt: '2026-04-01T00:00:00Z',
        targetEntityId: 'entity-001',
        tenantId: 'tenant-abc',
      },
      {
        reviewId: 'r2',
        rating: 5,
        status: 'PUBLISHED',
        submittedAt: '2026-03-01T00:00:00Z',
        targetEntityId: 'entity-001',
        tenantId: 'tenant-abc',
      },
    ];
    const storeCapture: Array<Record<string, unknown>> = [];
    const db = makeDbWithReviews(reviews, undefined, storeCapture);
    const svc = new ReputationScoreAggregatorService(
      db as unknown as IDatabaseService,
      makeQueue() as unknown as IQueueService,
      makeFreedom(),
    );
    const result = await svc.onReviewPublished(makeInput());
    expect(result.isSuccess).toBe(true);
    const scoreRecord = storeCapture.find((d) => d['_idx'] === 'xiigen-reputation-scores');
    expect(scoreRecord).toBeDefined();
    expect(typeof scoreRecord!['score']).toBe('number');
    expect(scoreRecord!['reviewCount']).toBe(2);
  });
});

// ── T171-2: ReviewRetracted removes review from aggregate ────────────────────

describe('T171-2: ReviewRetracted removes review from aggregate', () => {
  it('onReviewRetracted marks review RETRACTED and recalculates from remaining PUBLISHED', async () => {
    const reviews = [
      {
        reviewId: 'r1',
        rating: 4,
        status: 'PUBLISHED',
        submittedAt: '2026-04-01T00:00:00Z',
        targetEntityId: 'entity-001',
        tenantId: 'tenant-abc',
      },
    ];
    // After retraction, no reviews remain
    const db = {
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      searchDocuments: jest
        .fn()
        .mockImplementation(async (idx: string, filter: Record<string, unknown>) => {
          if (filter['status'] === 'PUBLISHED') return DataProcessResult.success([]);
          return DataProcessResult.success(reviews);
        }),
    };
    const storeCapture: Array<Record<string, unknown>> = [];
    const captureDb = {
      storeDocument: jest
        .fn()
        .mockImplementation(async (_idx: string, doc: Record<string, unknown>) => {
          storeCapture.push({ ...doc, _idx });
          return DataProcessResult.success({});
        }),
      searchDocuments: db.searchDocuments,
    };
    const svc = new ReputationScoreAggregatorService(
      captureDb as unknown as IDatabaseService,
      makeQueue() as unknown as IQueueService,
      makeFreedom(),
    );
    const result = await svc.onReviewRetracted(makeInput({ reviewId: 'r1', action: 'RETRACT' }));
    expect(result.isSuccess).toBe(true);
    // Should have stored RETRACTED status
    const retractedRecord = storeCapture.find((d) => d['status'] === 'RETRACTED');
    expect(retractedRecord).toBeDefined();
  });
});

// ── T171-3: score clamped to max 5.0 ─────────────────────────────────────────

describe('T171-3: score clamped to max 5.0', () => {
  it('high-weight reviews above 5.0 are clamped to 5.0', async () => {
    const reviews = [
      {
        rating: 5,
        status: 'PUBLISHED',
        submittedAt: '2026-04-01T00:00:00Z',
        targetEntityId: 'entity-001',
        tenantId: 'tenant-abc',
      },
    ];
    const storeCapture: Array<Record<string, unknown>> = [];
    const db = makeDbWithReviews(reviews, undefined, storeCapture);
    // Pass absurdly high weights to force potential overflow
    const freedom = makeFreedom([100.0]);
    const svc = new ReputationScoreAggregatorService(
      db as unknown as IDatabaseService,
      makeQueue() as unknown as IQueueService,
      freedom,
    );
    await svc.onReviewPublished(makeInput());
    const scoreRecord = storeCapture.find((d) => d['_idx'] === 'xiigen-reputation-scores');
    expect(scoreRecord!['score']).toBeLessThanOrEqual(5.0);
  });
});

// ── T171-4: score clamped to min 1.0 ─────────────────────────────────────────

describe('T171-4: score clamped to min 1.0', () => {
  it('no published reviews yields score = 1.0 (floor)', async () => {
    const db = makeDbWithReviews([], undefined);
    const storeCapture: Array<Record<string, unknown>> = [];
    const captureDb = {
      storeDocument: jest
        .fn()
        .mockImplementation(async (_idx: string, doc: Record<string, unknown>) => {
          storeCapture.push({ ...doc, _idx });
          return DataProcessResult.success({});
        }),
      searchDocuments: db.searchDocuments,
    };
    const svc = new ReputationScoreAggregatorService(
      captureDb as unknown as IDatabaseService,
      makeQueue() as unknown as IQueueService,
      makeFreedom(),
    );
    await svc.onReviewPublished(makeInput());
    const scoreRecord = storeCapture.find((d) => d['_idx'] === 'xiigen-reputation-scores');
    expect(scoreRecord!['score']).toBeGreaterThanOrEqual(1.0);
  });
});

// ── T171-5: pending/flagged reviews excluded ──────────────────────────────────

describe('T171-5: pending/flagged reviews excluded from score', () => {
  it('PUBLISHED-only filter: PENDING reviews not counted', async () => {
    const reviews = [
      {
        rating: 1,
        status: 'PENDING',
        submittedAt: '2026-04-01T00:00:00Z',
        targetEntityId: 'entity-001',
        tenantId: 'tenant-abc',
      },
      {
        rating: 4,
        status: 'PUBLISHED',
        submittedAt: '2026-03-01T00:00:00Z',
        targetEntityId: 'entity-001',
        tenantId: 'tenant-abc',
      },
    ];
    const storeCapture: Array<Record<string, unknown>> = [];
    const db = makeDbWithReviews(reviews, undefined, storeCapture);
    const svc = new ReputationScoreAggregatorService(
      db as unknown as IDatabaseService,
      makeQueue() as unknown as IQueueService,
      makeFreedom([1.0]),
    );
    await svc.onReviewPublished(makeInput());
    const scoreRecord = storeCapture.find((d) => d['_idx'] === 'xiigen-reputation-scores');
    // Only the rating=4 PUBLISHED review counts
    expect(scoreRecord!['reviewCount']).toBe(1);
    expect(scoreRecord!['score']).toBeCloseTo(4.0, 1);
  });
});

// ── T171-6: recency weights from FREEDOM config ──────────────────────────────

describe('T171-6: recency weights read from FREEDOM config', () => {
  it('get called with flow10_reputation_recency_weights', async () => {
    const freedom = makeFreedom();
    const db = makeDbWithReviews([], undefined);
    const svc = new ReputationScoreAggregatorService(
      db as unknown as IDatabaseService,
      makeQueue() as unknown as IQueueService,
      freedom,
    );
    await svc.onReviewPublished(makeInput());
    expect(freedom.get).toHaveBeenCalledWith('flow10_reputation_recency_weights');
  });
});

// ── T171-7: DNA-8 storeDocument before enqueue ───────────────────────────────

describe('T171-7: DNA-8 — storeDocument before enqueue', () => {
  it('reputation score stored before reputation.updated enqueued', async () => {
    const callOrder: string[] = [];
    const reviews = [
      {
        rating: 4,
        status: 'PUBLISHED',
        submittedAt: '2026-04-01T00:00:00Z',
        targetEntityId: 'entity-001',
        tenantId: 'tenant-abc',
      },
    ];
    const db = {
      storeDocument: jest.fn().mockImplementation(async () => {
        callOrder.push('db.storeDocument');
        return DataProcessResult.success({});
      }),
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(reviews)),
    };
    const queue = {
      enqueue: jest.fn().mockImplementation(async (eventType: string) => {
        callOrder.push(`enqueue:${eventType}`);
        return DataProcessResult.success({});
      }),
    };
    const svc = new ReputationScoreAggregatorService(
      db as unknown as IDatabaseService,
      queue as unknown as IQueueService,
      makeFreedom(),
    );
    await svc.onReviewPublished(makeInput());
    const dbIdx = callOrder.indexOf('db.storeDocument');
    const enqIdx = callOrder.findIndex((c) => c.includes('reputation.updated'));
    expect(dbIdx).toBeGreaterThanOrEqual(0);
    expect(enqIdx).toBeGreaterThanOrEqual(0);
    expect(dbIdx).toBeLessThan(enqIdx);
  });
});

// ── T171-8: scope_isolation — scores stored PRIVATE ──────────────────────────

describe('T171-8: scope_isolation — reputation scores stored PRIVATE', () => {
  it('xiigen-reputation-scores stored with knowledgeScope: PRIVATE', async () => {
    const storeCapture: Array<Record<string, unknown>> = [];
    const reviews = [
      {
        rating: 4,
        status: 'PUBLISHED',
        submittedAt: '2026-04-01T00:00:00Z',
        targetEntityId: 'entity-001',
        tenantId: 'tenant-abc',
      },
    ];
    const db = {
      storeDocument: jest
        .fn()
        .mockImplementation(async (_idx: string, doc: Record<string, unknown>) => {
          storeCapture.push({ ...doc, _idx });
          return DataProcessResult.success({});
        }),
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(reviews)),
    };
    const svc = new ReputationScoreAggregatorService(
      db as unknown as IDatabaseService,
      makeQueue() as unknown as IQueueService,
      makeFreedom(),
    );
    await svc.onReviewPublished(makeInput({ tenantId: 'tenant-xyz' }));
    const scoreRecord = storeCapture.find((d) => d['_idx'] === 'xiigen-reputation-scores');
    expect(scoreRecord).toBeDefined();
    expect(scoreRecord!['knowledgeScope']).toBe('PRIVATE');
    expect(scoreRecord!['tenantId']).toBe('tenant-xyz');
  });
});
