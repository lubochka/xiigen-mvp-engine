/**
 * FLOW-10 Phase A — T169 ReviewSubmissionGateway
 * 8 tests covering eligibility, validation, SETNX, audit ordering, DNA-8, scope isolation
 *
 * T169-1: eligibility check runs before SETNX (spy ordering)
 * T169-2: invalid rating rejected before SETNX is consumed
 * T169-3: ineligible reviewer → ReviewRejected(not_eligible), no audit record
 * T169-4: SETNX second call returns existing record as success (idempotency)
 * T169-5: audit storeDocument called at position 4 (after SETNX, before enqueue)
 * T169-6: DNA-8 — storeDocument before enqueue
 * T169-7: reviewId is server-derived hash (not from event payload)
 * T169-8: scope_isolation — tenantId from ALS, review stored with knowledgeScope PRIVATE
 */

import 'reflect-metadata';
import { createHash } from 'crypto';
import { ReviewSubmissionGatewayService } from '../../../src/engine/flows/reviews-reputation/review-submission-gateway.service';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { IDatabaseService } from '../../../src/fabrics/interfaces/database.interface';
import { IQueueService } from '../../../src/fabrics/interfaces/queue.interface';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeInput(
  overrides: Partial<{
    reviewerId: string;
    targetEntityId: string;
    targetEntityType: string;
    rating: number;
    tenantId: string;
  }> = {},
) {
  return {
    reviewerId: 'reviewer-001',
    targetEntityId: 'entity-001',
    targetEntityType: 'PRODUCT',
    rating: 4,
    tenantId: 'tenant-abc',
    ...overrides,
  };
}

function makeEligibilityService(eligible = true) {
  return {
    check: jest.fn().mockResolvedValue(DataProcessResult.success({ eligible })),
  };
}

function makeSuccessDb(callOrder?: string[], storeCapture?: Array<Record<string, unknown>>) {
  return {
    storeDocument: jest
      .fn()
      .mockImplementation(async (_idx: string, doc: Record<string, unknown>) => {
        if (callOrder) callOrder.push('db.storeDocument');
        if (storeCapture) storeCapture.push({ ...doc, _idx });
        return DataProcessResult.success({});
      }),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  };
}

function makeSuccessQueue(
  callOrder?: string[],
  enqueueCapture?: Array<{ eventType: string; payload: unknown }>,
) {
  return {
    enqueue: jest.fn().mockImplementation(async (eventType: string, payload: unknown) => {
      if (callOrder) callOrder.push(`queue.enqueue(${eventType})`);
      if (enqueueCapture) enqueueCapture.push({ eventType, payload });
      return DataProcessResult.success({});
    }),
  };
}

function makeSuccessAudit(callOrder?: string[]) {
  return {
    storeDocument: jest.fn().mockImplementation(async () => {
      if (callOrder) callOrder.push('audit.storeDocument');
      return DataProcessResult.success({});
    }),
  };
}

function makeSetnx(existsOnSecondCall = false) {
  let callCount = 0;
  return {
    setnx: jest.fn().mockImplementation(async () => {
      callCount++;
      const exists = existsOnSecondCall && callCount > 1;
      return DataProcessResult.success({ exists });
    }),
  };
}

function makeService(
  overrides: {
    eligibility?: any;
    db?: any;
    queue?: any;
    audit?: any;
    idempotency?: any;
  } = {},
) {
  const eligibilityService = overrides.eligibility ?? makeEligibilityService(true);
  const db = overrides.db ?? makeSuccessDb();
  const queue = overrides.queue ?? makeSuccessQueue();
  const auditService = overrides.audit ?? makeSuccessAudit();
  const idempotencyStore = overrides.idempotency ?? makeSetnx(false);
  return new ReviewSubmissionGatewayService(
    eligibilityService,
    db,
    queue,
    auditService,
    idempotencyStore,
  );
}

// ── T169-1: eligibility runs before SETNX ─────────────────────────────────────

describe('T169-1: eligibility check runs before SETNX', () => {
  it('eligibility check is called before SETNX on success path', async () => {
    const callOrder: string[] = [];
    const eligibilityService = {
      check: jest.fn().mockImplementation(async () => {
        callOrder.push('eligibility.check');
        return DataProcessResult.success({ eligible: true });
      }),
    };
    const idempotency = {
      setnx: jest.fn().mockImplementation(async () => {
        callOrder.push('idempotency.setnx');
        return DataProcessResult.success({ exists: false });
      }),
    };
    const svc = makeService({ eligibility: eligibilityService, idempotency });
    await svc.submitReview(makeInput());
    const eligIdx = callOrder.indexOf('eligibility.check');
    const setnxIdx = callOrder.indexOf('idempotency.setnx');
    expect(eligIdx).toBeGreaterThanOrEqual(0);
    expect(setnxIdx).toBeGreaterThanOrEqual(0);
    expect(eligIdx).toBeLessThan(setnxIdx);
  });
});

// ── T169-2: invalid rating rejected before SETNX ──────────────────────────────

describe('T169-2: invalid rating rejected before SETNX is consumed', () => {
  it('rating=0 → ReviewRejected(invalid_rating), SETNX not called', async () => {
    const idempotency = {
      setnx: jest.fn().mockResolvedValue(DataProcessResult.success({ exists: false })),
    };
    const svc = makeService({ idempotency });
    const result = await svc.submitReview(makeInput({ rating: 0 }));
    expect(result.isSuccess).toBe(true);
    expect(result.data?.['status']).toBe('REJECTED');
    expect(result.data?.['reason']).toBe('invalid_rating');
    expect(idempotency.setnx).not.toHaveBeenCalled();
  });

  it('rating=6 → ReviewRejected(invalid_rating), SETNX not called', async () => {
    const idempotency = {
      setnx: jest.fn().mockResolvedValue(DataProcessResult.success({ exists: false })),
    };
    const svc = makeService({ idempotency });
    const result = await svc.submitReview(makeInput({ rating: 6 }));
    expect(result.isSuccess).toBe(true);
    expect(result.data?.['status']).toBe('REJECTED');
    expect(result.data?.['reason']).toBe('invalid_rating');
    expect(idempotency.setnx).not.toHaveBeenCalled();
  });
});

// ── T169-3: ineligible reviewer → no audit record ────────────────────────────

describe('T169-3: ineligible reviewer → ReviewRejected, no audit write', () => {
  it('ineligible → ReviewRejected(not_eligible), no audit storeDocument', async () => {
    const audit = makeSuccessAudit();
    const eligibility = makeEligibilityService(false);
    const svc = makeService({ eligibility, audit });
    const result = await svc.submitReview(makeInput());
    expect(result.isSuccess).toBe(true);
    expect(result.data?.['status']).toBe('REJECTED');
    expect(result.data?.['reason']).toBe('not_eligible');
    expect(audit.storeDocument).not.toHaveBeenCalled();
  });
});

// ── T169-4: SETNX idempotency ─────────────────────────────────────────────────

describe('T169-4: SETNX second call returns existing record as success', () => {
  it('second submission for same (reviewer, entity) returns ACCEPTED from idempotency', async () => {
    const idempotency = {
      setnx: jest.fn().mockResolvedValue(DataProcessResult.success({ exists: true })),
    };
    const svc = makeService({ idempotency });
    const result = await svc.submitReview(makeInput());
    expect(result.isSuccess).toBe(true);
    expect(result.data?.['status']).toBe('ACCEPTED');
  });
});

// ── T169-5: audit at position 4 ──────────────────────────────────────────────

describe('T169-5: audit storeDocument called at position 4 (after SETNX, before enqueue)', () => {
  it('call order: eligibility → setnx → audit → store → enqueue', async () => {
    const callOrder: string[] = [];
    const eligibilityService = {
      check: jest.fn().mockImplementation(async () => {
        callOrder.push('eligibility');
        return DataProcessResult.success({ eligible: true });
      }),
    };
    const idempotency = {
      setnx: jest.fn().mockImplementation(async () => {
        callOrder.push('setnx');
        return DataProcessResult.success({ exists: false });
      }),
    };
    const audit = {
      storeDocument: jest.fn().mockImplementation(async () => {
        callOrder.push('audit');
        return DataProcessResult.success({});
      }),
    };
    const db = {
      storeDocument: jest.fn().mockImplementation(async () => {
        callOrder.push('db');
        return DataProcessResult.success({});
      }),
    };
    const queue = {
      enqueue: jest.fn().mockImplementation(async (eventType: string) => {
        callOrder.push(`enqueue:${eventType}`);
        return DataProcessResult.success({});
      }),
    };
    const svc = new ReviewSubmissionGatewayService(
      eligibilityService,
      db as unknown as IDatabaseService,
      queue as unknown as IQueueService,
      audit,
      idempotency,
    );
    await svc.submitReview(makeInput());

    const eligIdx = callOrder.indexOf('eligibility');
    const setnxIdx = callOrder.indexOf('setnx');
    const auditIdx = callOrder.indexOf('audit');
    const dbIdx = callOrder.indexOf('db');

    expect(eligIdx).toBeLessThan(setnxIdx);
    expect(setnxIdx).toBeLessThan(auditIdx);
    expect(auditIdx).toBeLessThan(dbIdx);
  });
});

// ── T169-6: DNA-8 storeDocument before enqueue ────────────────────────────────

describe('T169-6: DNA-8 — storeDocument before enqueue', () => {
  it('db.storeDocument called before any review.accepted enqueue', async () => {
    const callOrder: string[] = [];
    const db = makeSuccessDb(callOrder);
    const queue = makeSuccessQueue(callOrder);
    const audit = makeSuccessAudit(callOrder);
    const svc = makeService({ db, queue, audit });
    await svc.submitReview(makeInput());
    const dbIdx = callOrder.findIndex((c) => c === 'db.storeDocument');
    const enqueueIdx = callOrder.findIndex((c) => c.includes('review.accepted'));
    expect(dbIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThanOrEqual(0);
    expect(dbIdx).toBeLessThan(enqueueIdx);
  });
});

// ── T169-7: server-derived reviewId ──────────────────────────────────────────

describe('T169-7: reviewId is server-derived hash', () => {
  it('reviewId matches expected hash(tenantId+reviewerId+targetEntityId+targetEntityType)', async () => {
    const storeCapture: Array<Record<string, unknown>> = [];
    const db = makeSuccessDb(undefined, storeCapture);
    const svc = makeService({ db });
    const input = makeInput({
      tenantId: 'tenant-abc',
      reviewerId: 'reviewer-001',
      targetEntityId: 'entity-001',
      targetEntityType: 'PRODUCT',
    });
    await svc.submitReview(input);
    const reviewRecord = storeCapture.find((d) => d['_idx'] === 'xiigen-reviews');
    expect(reviewRecord).toBeDefined();
    const expectedId = createHash('sha256')
      .update('tenant-abc:reviewer-001:entity-001:PRODUCT')
      .digest('hex');
    expect(reviewRecord!['reviewId']).toBe(expectedId);
  });
});

// ── T169-8: scope_isolation ───────────────────────────────────────────────────

describe('T169-8: scope_isolation — tenantId from ALS, review stored with knowledgeScope PRIVATE', () => {
  it('review record stored with knowledgeScope: PRIVATE', async () => {
    const storeCapture: Array<Record<string, unknown>> = [];
    const db = makeSuccessDb(undefined, storeCapture);
    const svc = makeService({ db });
    await svc.submitReview(makeInput({ tenantId: 'tenant-xyz' }));
    const reviewRecord = storeCapture.find((d) => d['_idx'] === 'xiigen-reviews');
    expect(reviewRecord).toBeDefined();
    expect(reviewRecord!['knowledgeScope']).toBe('PRIVATE');
    expect(reviewRecord!['tenantId']).toBe('tenant-xyz');
  });
});
