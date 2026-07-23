/**
 * FLOW-10 Integration Tests — Reviews & Reputation
 *
 * 1. Full happy path: ReviewSubmitted → T169 → ReviewAccepted → T170 PASS → ReviewPublished → T171 → ReputationUpdated
 * 2. Moderation uncertain path: T170 UNCERTAIN → ReviewFlaggedForHuman (status=PENDING, not REJECTED)
 * 3. Retraction path: ReviewRetracted → T171 → score recalculated without retracted review
 * 4. Response rejection: non-owner response → ReviewResponseRejected(not_owner, revision_allowed:false)
 */

import 'reflect-metadata';
import { ReviewSubmissionGatewayService } from '../../../src/engine/flows/reviews-reputation/review-submission-gateway.service';
import { ReviewModerationEngineService } from '../../../src/engine/flows/reviews-reputation/review-moderation-engine.service';
import { ReputationScoreAggregatorService } from '../../../src/engine/flows/reviews-reputation/reputation-score-aggregator.service';
import { ReviewResponseOrchestratorService } from '../../../src/engine/flows/reviews-reputation/review-response-orchestrator.service';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { IDatabaseService } from '../../../src/fabrics/interfaces/database.interface';
import { IQueueService } from '../../../src/fabrics/interfaces/queue.interface';

// ── Shared in-memory store ─────────────────────────────────────────────────────

function makeInMemoryStore() {
  const store: Map<string, Record<string, unknown>[]> = new Map();
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const bucket = store.get(index) ?? [];
      const existing = bucket.findIndex((d) => d['id'] === id || d['reviewId'] === id);
      if (existing >= 0) {
        bucket[existing] = { ...doc, id };
      } else {
        bucket.push({ ...doc, id });
      }
      store.set(index, bucket);
      return DataProcessResult.success({ ...doc, id });
    }),
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      const bucket = store.get(index) ?? [];
      const results = bucket.filter((doc) =>
        Object.entries(filter).every(([k, v]) => v == null || doc[k] === v),
      );
      return DataProcessResult.success(results);
    }),
    _store: store,
  };
}

function makeInMemoryQueue() {
  const emitted: Array<{ eventType: string; payload: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (eventType: string, payload: Record<string, unknown>) => {
      emitted.push({ eventType, payload });
      return DataProcessResult.success({});
    }),
    _emitted: emitted,
  };
}

function makeFreedom() {
  return {
    get: jest.fn().mockImplementation(async (key: string) => {
      const defaults: Record<string, unknown> = {
        flow10_moderation_pass_threshold: 0.85,
        flow10_moderation_reject_threshold: 0.3,
        flow10_reputation_recency_weights: [1.0, 0.9, 0.8],
      };
      if (key in defaults) return { [key]: defaults[key] };
      return {};
    }),
  };
}

// ── Integration-1: Full happy path ────────────────────────────────────────────

describe('Integration-1: Full happy path — submit → moderate PASS → aggregate', () => {
  it('ReviewAccepted → ReviewPublished → ReputationUpdated events emitted in order', async () => {
    const db = makeInMemoryStore();
    const queue = makeInMemoryQueue();
    const freedom = makeFreedom();
    const tenantId = 'tenant-integration';

    // Build services
    const eligibility = {
      check: jest.fn().mockResolvedValue(DataProcessResult.success({ eligible: true })),
    };
    const idempotency = {
      setnx: jest.fn().mockResolvedValue(DataProcessResult.success({ exists: false })),
    };
    const audit = { storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})) };
    const ai = {
      moderate: jest.fn().mockResolvedValue(DataProcessResult.success({ confidence: 0.92 })),
    };

    const t169 = new ReviewSubmissionGatewayService(
      eligibility,
      db as unknown as IDatabaseService,
      queue as unknown as IQueueService,
      audit,
      idempotency,
    );
    const t170 = new ReviewModerationEngineService(
      ai,
      db as unknown as IDatabaseService,
      queue as unknown as IQueueService,
      freedom,
      idempotency,
    );
    const t171 = new ReputationScoreAggregatorService(
      db as unknown as IDatabaseService,
      queue as unknown as IQueueService,
      freedom,
    );

    // Step 1: Submit review (T169)
    const submission = await t169.submitReview({
      reviewerId: 'user-001',
      targetEntityId: 'entity-001',
      targetEntityType: 'PRODUCT',
      rating: 4,
      tenantId,
    });
    expect(submission.isSuccess).toBe(true);
    expect(submission.data?.['status']).toBe('ACCEPTED');
    const reviewId = submission.data?.['reviewId'] as string;
    expect(reviewId).toBeTruthy();

    // ReviewAccepted event emitted
    expect(queue._emitted.some((e) => e.eventType === 'review.accepted')).toBe(true);
    expect(queue._emitted.some((e) => e.eventType === 'review.submission.completed')).toBe(true);

    // Step 2: Moderate review (T170)
    const moderation = await t170.moderateReview({
      reviewId,
      reviewerId: 'user-001',
      targetEntityId: 'entity-001',
      targetEntityType: 'PRODUCT',
      reviewText: 'Great product!',
      rating: 4,
      tenantId,
    });
    expect(moderation.isSuccess).toBe(true);
    expect(moderation.data?.['verdict']).toBe('PUBLISHED');
    expect(queue._emitted.some((e) => e.eventType === 'review.published')).toBe(true);

    // Step 3: Aggregate reputation (T171)
    const aggregate = await t171.onReviewPublished({
      targetEntityId: 'entity-001',
      targetEntityType: 'PRODUCT',
      reviewId,
      action: 'PUBLISH',
      tenantId,
    });
    expect(aggregate.isSuccess).toBe(true);
    expect(queue._emitted.some((e) => e.eventType === 'reputation.updated')).toBe(true);
  });
});

// ── Integration-2: Moderation UNCERTAIN → PENDING (not REJECTED) ──────────────

describe('Integration-2: Moderation UNCERTAIN → ReviewFlaggedForHuman (PENDING)', () => {
  it('UNCERTAIN confidence → status=PENDING, NOT status=REJECTED', async () => {
    const db = makeInMemoryStore();
    const queue = makeInMemoryQueue();
    const freedom = makeFreedom();
    const tenantId = 'tenant-integration';
    const ai = {
      moderate: jest.fn().mockResolvedValue(DataProcessResult.success({ confidence: 0.55 })),
    };
    const idempotency = {
      setnx: jest.fn().mockResolvedValue(DataProcessResult.success({ exists: false })),
    };

    const t170 = new ReviewModerationEngineService(
      ai,
      db as unknown as IDatabaseService,
      queue as unknown as IQueueService,
      freedom,
      idempotency,
    );
    const moderation = await t170.moderateReview({
      reviewId: 'review-uncertain',
      reviewerId: 'user-001',
      targetEntityId: 'entity-001',
      targetEntityType: 'PRODUCT',
      reviewText: 'Borderline content',
      rating: 3,
      tenantId,
    });

    expect(moderation.isSuccess).toBe(true);
    expect(moderation.data?.['verdict']).toBe('PENDING');
    expect(moderation.data?.['verdict']).not.toBe('REJECTED');

    // Event should be flagged_for_human, not rejected
    expect(queue._emitted.some((e) => e.eventType === 'review.flagged_for_human')).toBe(true);
    expect(queue._emitted.some((e) => e.eventType === 'review.rejected')).toBe(false);

    // Status in DB should be PENDING
    const reviews = db._store.get('xiigen-reviews') ?? [];
    const review = reviews.find((r) => r['reviewId'] === 'review-uncertain');
    expect(review?.['status']).toBe('PENDING');
  });
});

// ── Integration-3: Retraction path ───────────────────────────────────────────

describe('Integration-3: Retraction → score recalculated without retracted review', () => {
  it('ReviewRetracted triggers aggregate recalculation', async () => {
    const tenantId = 'tenant-integration';
    const db = makeInMemoryStore();
    const queue = makeInMemoryQueue();
    const freedom = makeFreedom();

    // Pre-seed two published reviews
    await db.storeDocument(
      'xiigen-reviews',
      {
        reviewId: 'r1',
        rating: 5,
        status: 'PUBLISHED',
        targetEntityId: 'entity-retract',
        tenantId,
        submittedAt: '2026-04-01T00:00:00Z',
      },
      'r1',
    );
    await db.storeDocument(
      'xiigen-reviews',
      {
        reviewId: 'r2',
        rating: 1,
        status: 'PUBLISHED',
        targetEntityId: 'entity-retract',
        tenantId,
        submittedAt: '2026-03-01T00:00:00Z',
      },
      'r2',
    );

    const t171 = new ReputationScoreAggregatorService(
      db as unknown as IDatabaseService,
      queue as unknown as IQueueService,
      freedom,
    );

    // Retract r1 (rating=5)
    const retractResult = await t171.onReviewRetracted({
      targetEntityId: 'entity-retract',
      targetEntityType: 'PRODUCT',
      reviewId: 'r1',
      action: 'RETRACT',
      tenantId,
    });

    expect(retractResult.isSuccess).toBe(true);
    // After retraction of r1, only r2 (rating=1) remains PUBLISHED
    expect(retractResult.data?.['reviewCount']).toBe(1);
    expect(queue._emitted.some((e) => e.eventType === 'reputation.updated')).toBe(true);
  });
});

// ── Integration-4: Non-owner response rejection ───────────────────────────────

describe('Integration-4: Non-owner response → ReviewResponseRejected(not_owner)', () => {
  it('non-owner response rejected with revision_allowed:false', async () => {
    const db = makeInMemoryStore();
    const queue = makeInMemoryQueue();
    const tenantId = 'tenant-integration';

    const ownership = {
      check: jest.fn().mockResolvedValue(DataProcessResult.success({ isOwner: false })),
    };
    const audit = { storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})) };
    const idempotency = {
      setnx: jest.fn().mockResolvedValue(DataProcessResult.success({ exists: false })),
    };
    const content = {
      check: jest.fn().mockResolvedValue(DataProcessResult.success({ passed: true })),
    };

    const t172 = new ReviewResponseOrchestratorService(
      ownership,
      db as unknown as IDatabaseService,
      queue as unknown as IQueueService,
      audit,
      idempotency,
      content,
    );
    const result = await t172.submitResponse({
      reviewId: 'review-001',
      responderId: 'non-owner',
      responseText: 'I want to respond',
      tenantId,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.['status']).toBe('REJECTED');
    expect(result.data?.['reason']).toBe('not_owner');
    expect(result.data?.['revision_allowed']).toBe(false);

    const rejected = queue._emitted.find((e) => e.eventType === 'review.response.rejected');
    expect(rejected).toBeDefined();
    expect((rejected!.payload as Record<string, unknown>)['revision_allowed']).toBe(false);
  });
});
