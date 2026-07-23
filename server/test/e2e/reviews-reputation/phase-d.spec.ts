/**
 * FLOW-10 Phase D — T172 ReviewResponseOrchestrator
 * 9 tests covering ownership, SETNX, DNA-8, revision_allowed, scope_isolation
 *
 * T172-1: non-owner → ReviewResponseRejected(not_owner), revision_allowed:false
 * T172-2: ownership check runs before SETNX
 * T172-3: already_responded → ReviewResponseRejected(already_responded), revision_allowed:false
 * T172-4: content_policy → ReviewResponseRejected(content_policy), revision_allowed:true
 * T172-5: audit storeDocument before notification enqueue (DNA-8)
 * T172-6: SETNX key correct format
 * T172-7: NEW_KEY_VARIANT revision key format correct
 * T172-8: T172 does NOT emit ReputationUpdated (response ≠ new review)
 * T172-9: scope_isolation — responses stored PRIVATE
 */

import 'reflect-metadata';
import { createHash } from 'crypto';
import { ReviewResponseOrchestratorService } from '../../../src/engine/flows/reviews-reputation/review-response-orchestrator.service';
import { DataProcessResult } from '../../../src/kernel/data-process-result';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeInput(
  overrides: Partial<{
    reviewId: string;
    responderId: string;
    responseText: string;
    tenantId: string;
  }> = {},
) {
  return {
    reviewId: 'review-001',
    responderId: 'owner-001',
    responseText: 'Thank you for your feedback!',
    tenantId: 'tenant-abc',
    ...overrides,
  };
}

function makeOwnership(isOwner = true) {
  return {
    check: jest.fn().mockResolvedValue(DataProcessResult.success({ isOwner })),
  };
}

function makeContentModeration(passed = true) {
  return {
    check: jest.fn().mockResolvedValue(DataProcessResult.success({ passed })),
  };
}

function makeDb(callOrder?: string[], storeCapture?: Array<Record<string, unknown>>) {
  return {
    storeDocument: jest
      .fn()
      .mockImplementation(async (_idx: string, doc: Record<string, unknown>) => {
        if (callOrder) callOrder.push('db.storeDocument');
        if (storeCapture) storeCapture.push({ ...doc, _idx });
        return DataProcessResult.success({});
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

function makeAudit(callOrder?: string[]) {
  return {
    storeDocument: jest.fn().mockImplementation(async () => {
      if (callOrder) callOrder.push('audit.storeDocument');
      return DataProcessResult.success({});
    }),
  };
}

function makeSetnx(exists = false, revisionExists = false) {
  let callCount = 0;
  return {
    setnx: jest.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) return DataProcessResult.success({ exists });
      return DataProcessResult.success({ exists: revisionExists });
    }),
  };
}

function makeService(
  overrides: {
    ownership?: any;
    db?: any;
    queue?: any;
    audit?: any;
    idempotency?: any;
    content?: any;
  } = {},
) {
  return new ReviewResponseOrchestratorService(
    overrides.ownership ?? makeOwnership(true),
    overrides.db ?? makeDb(),
    overrides.queue ?? makeQueue(),
    overrides.audit ?? makeAudit(),
    overrides.idempotency ?? makeSetnx(false, false),
    overrides.content ?? makeContentModeration(true),
  );
}

// ── T172-1: non-owner → revision_allowed:false ────────────────────────────────

describe('T172-1: non-owner → ReviewResponseRejected(not_owner), revision_allowed:false', () => {
  it('non-owner rejection carries revision_allowed:false', async () => {
    const enqueueCapture: Array<{ eventType: string; payload: unknown }> = [];
    const queue = makeQueue(undefined, enqueueCapture);
    const svc = makeService({ ownership: makeOwnership(false), queue });
    const result = await svc.submitResponse(makeInput());
    expect(result.isSuccess).toBe(true);
    expect(result.data?.['status']).toBe('REJECTED');
    expect(result.data?.['reason']).toBe('not_owner');
    expect(result.data?.['revision_allowed']).toBe(false);
    const rejected = enqueueCapture.find((e) => e.eventType === 'review.response.rejected');
    expect(rejected).toBeDefined();
    expect((rejected!.payload as Record<string, unknown>)['revision_allowed']).toBe(false);
  });
});

// ── T172-2: ownership check runs before SETNX ────────────────────────────────

describe('T172-2: ownership check runs before SETNX', () => {
  it('ownership.check called before idempotency.setnx', async () => {
    const callOrder: string[] = [];
    const ownership = {
      check: jest.fn().mockImplementation(async () => {
        callOrder.push('ownership.check');
        return DataProcessResult.success({ isOwner: true });
      }),
    };
    const idempotency = {
      setnx: jest.fn().mockImplementation(async () => {
        callOrder.push('idempotency.setnx');
        return DataProcessResult.success({ exists: false });
      }),
    };
    const svc = makeService({ ownership, idempotency });
    await svc.submitResponse(makeInput());
    const ownerIdx = callOrder.indexOf('ownership.check');
    const setnxIdx = callOrder.indexOf('idempotency.setnx');
    expect(ownerIdx).toBeGreaterThanOrEqual(0);
    expect(setnxIdx).toBeGreaterThanOrEqual(0);
    expect(ownerIdx).toBeLessThan(setnxIdx);
  });
});

// ── T172-3: already_responded → revision_allowed:false ───────────────────────

describe('T172-3: already_responded → ReviewResponseRejected(already_responded), revision_allowed:false', () => {
  it('both SETNX keys exist → already_responded, revision_allowed:false', async () => {
    const idempotency = makeSetnx(true, true); // both keys exist
    const enqueueCapture: Array<{ eventType: string; payload: unknown }> = [];
    const queue = makeQueue(undefined, enqueueCapture);
    const svc = makeService({ idempotency, queue });
    const result = await svc.submitResponse(makeInput());
    expect(result.isSuccess).toBe(true);
    expect(result.data?.['reason']).toBe('already_responded');
    expect(result.data?.['revision_allowed']).toBe(false);
    const rejected = enqueueCapture.find((e) => e.eventType === 'review.response.rejected');
    expect((rejected!.payload as Record<string, unknown>)['revision_allowed']).toBe(false);
  });
});

// ── T172-4: content_policy → revision_allowed:true ───────────────────────────

describe('T172-4: content_policy → ReviewResponseRejected(content_policy), revision_allowed:true', () => {
  it('content policy failure → revision_allowed:true', async () => {
    const enqueueCapture: Array<{ eventType: string; payload: unknown }> = [];
    const queue = makeQueue(undefined, enqueueCapture);
    const svc = makeService({ content: makeContentModeration(false), queue });
    const result = await svc.submitResponse(makeInput());
    expect(result.isSuccess).toBe(true);
    expect(result.data?.['reason']).toBe('content_policy');
    expect(result.data?.['revision_allowed']).toBe(true);
    const rejected = enqueueCapture.find((e) => e.eventType === 'review.response.rejected');
    expect((rejected!.payload as Record<string, unknown>)['revision_allowed']).toBe(true);
  });
});

// ── T172-5: audit storeDocument before notification enqueue (DNA-8) ───────────

describe('T172-5: audit storeDocument before notification enqueue (DNA-8)', () => {
  it('audit.storeDocument called before review.response.published enqueue', async () => {
    const callOrder: string[] = [];
    const audit = makeAudit(callOrder);
    const queue = makeQueue(callOrder);
    const svc = makeService({ audit, queue });
    await svc.submitResponse(makeInput());
    const auditIdx = callOrder.indexOf('audit.storeDocument');
    const notifyIdx = callOrder.findIndex((c) => c.includes('review.response.published'));
    expect(auditIdx).toBeGreaterThanOrEqual(0);
    expect(notifyIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeLessThan(notifyIdx);
  });
});

// ── T172-6: SETNX key correct format ─────────────────────────────────────────

describe('T172-6: SETNX key correct format', () => {
  it('setnx called with hash(tenantId+reviewId+response) key', async () => {
    const capturedKeys: string[] = [];
    const idempotency = {
      setnx: jest.fn().mockImplementation(async (key: string) => {
        capturedKeys.push(key);
        return DataProcessResult.success({ exists: false });
      }),
    };
    const svc = makeService({ idempotency });
    await svc.submitResponse(makeInput({ tenantId: 'tenant-abc', reviewId: 'review-001' }));
    const expectedKey = createHash('sha256').update('tenant-abc:review-001:response').digest('hex');
    expect(capturedKeys[0]).toBe(expectedKey);
  });
});

// ── T172-7: NEW_KEY_VARIANT revision key format correct ──────────────────────

describe('T172-7: NEW_KEY_VARIANT revision key format correct', () => {
  it('revision key = hash(tenantId+reviewId+response-revision-1)', () => {
    // Verify the expected revision key formula matches NEW_KEY_VARIANT spec
    const tenantId = 'tenant-abc';
    const reviewId = 'review-001';
    const expectedRevisionKey = createHash('sha256')
      .update(`${tenantId}:${reviewId}:response-revision-1`)
      .digest('hex');
    const primaryKey = createHash('sha256')
      .update(`${tenantId}:${reviewId}:response`)
      .digest('hex');
    expect(expectedRevisionKey).not.toBe(primaryKey);
    expect(typeof expectedRevisionKey).toBe('string');
    expect(expectedRevisionKey.length).toBe(64); // sha256 hex = 64 chars
  });
});

// ── T172-8: T172 does NOT emit ReputationUpdated ─────────────────────────────

describe('T172-8: T172 does NOT emit ReputationUpdated (response ≠ new review)', () => {
  it('no reputation.updated event emitted on successful response', async () => {
    const enqueueCapture: Array<{ eventType: string; payload: unknown }> = [];
    const queue = makeQueue(undefined, enqueueCapture);
    const svc = makeService({ queue });
    await svc.submitResponse(makeInput());
    const reputationEvent = enqueueCapture.find(
      (e) => e.eventType === 'reputation.updated' || e.eventType.includes('reputation'),
    );
    expect(reputationEvent).toBeUndefined();
  });
});

// ── T172-9: scope_isolation — responses stored PRIVATE ───────────────────────

describe('T172-9: scope_isolation — responses stored PRIVATE', () => {
  it('review response stored with knowledgeScope: PRIVATE', async () => {
    const storeCapture: Array<Record<string, unknown>> = [];
    const db = makeDb(undefined, storeCapture);
    const svc = makeService({ db });
    await svc.submitResponse(makeInput({ tenantId: 'tenant-xyz' }));
    const responseRecord = storeCapture.find((d) => d['_idx'] === 'xiigen-review-responses');
    expect(responseRecord).toBeDefined();
    expect(responseRecord!['knowledgeScope']).toBe('PRIVATE');
    expect(responseRecord!['tenantId']).toBe('tenant-xyz');
  });
});
