/**
 * FLOW-12 Phase 1A — T209 SubscriptionPlanOrchestrator
 *
 * T209-1: float priceCents → failure('INVALID_PRICE')
 * T209-2: zero priceCents → failure('INVALID_PRICE')
 * T209-3: SETNX collision → failure('DUPLICATE_PLAN'), no OCC write
 * T209-4: OCC conflict → failure('OCC_CONFLICT'), SubscriptionPlanPublicationFailed emitted
 * T209-5: audit storeDocument called before enqueue(SubscriptionPlanPublished) — DNA-8
 * T209-6: successful publish → SubscriptionPlanPublished emitted with priceCents + billingInterval
 */

import 'reflect-metadata';
import { SubscriptionPlanOrchestratorService } from '../../../src/engine/flows/subscription-billing/subscription-plan-orchestrator.service';
import { DataProcessResult } from '../../../src/kernel/data-process-result';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    planId: 'plan-basic',
    planName: 'Basic Plan',
    priceCents: 999,
    billingInterval: 'MONTHLY',
    trialDays: 0,
    version: '1',
    ...overrides,
  };
}

function makeCls(tenantId = 'tenant-test') {
  return {
    get: jest.fn().mockReturnValue({ tenantId }),
  };
}

function makeSuccessDb(callOrder?: string[]) {
  return {
    searchDocuments: jest.fn().mockImplementation(async (index: string) => {
      if (callOrder) callOrder.push(`db.searchDocuments(${index})`);
      return DataProcessResult.success([]);
    }),
    storeDocument: jest.fn().mockImplementation(async (index: string) => {
      if (callOrder) callOrder.push(`db.storeDocument(${index})`);
      return DataProcessResult.success({});
    }),
    getDocumentWithVersion: jest
      .fn()
      .mockResolvedValue(DataProcessResult.failure('NOT_FOUND', 'no version')),
    storeDocumentWithOCC: jest.fn().mockImplementation(async (index: string) => {
      if (callOrder) callOrder.push(`db.storeDocumentWithOCC(${index})`);
      return DataProcessResult.success({ seqNo: 1, primaryTerm: 1 });
    }),
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FLOW-12 Phase 1A — T209 SubscriptionPlanOrchestrator', () => {
  // T209-1: float priceCents rejected at ORDER 1
  it('Subscription plan publish rejects float price', async () => {
    const db = makeSuccessDb();
    const queue = makeSuccessQueue();
    const svc = new SubscriptionPlanOrchestratorService(db as any, queue as any, makeCls() as any);

    const result = await svc.publishPlan(makeEvent({ priceCents: 9.99 }));

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_PRICE');
    // No db or queue interactions before integer guard
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  // T209-2: zero priceCents rejected at ORDER 1
  it('Subscription plan publish rejects zero price', async () => {
    const db = makeSuccessDb();
    const queue = makeSuccessQueue();
    const svc = new SubscriptionPlanOrchestratorService(db as any, queue as any, makeCls() as any);

    const result = await svc.publishPlan(makeEvent({ priceCents: 0 }));

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_PRICE');
  });

  // T209-3: SETNX collision — second call returns failure, no OCC write
  it('Duplicate plan slug returns failure without OCC write', async () => {
    const db = {
      ...makeSuccessDb(),
      searchDocuments: jest
        .fn()
        .mockResolvedValue(DataProcessResult.success([{ key: 'existing-key' }])),
    };
    const queue = makeSuccessQueue();
    const svc = new SubscriptionPlanOrchestratorService(db as any, queue as any, makeCls() as any);

    const result = await svc.publishPlan(makeEvent());

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DUPLICATE_PLAN');
    // OCC write must not have been called
    expect(db.storeDocumentWithOCC).not.toHaveBeenCalled();
    // No event emitted
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  // T209-4: OCC conflict → SubscriptionPlanPublicationFailed emitted
  it('Concurrent plan version conflict emits publication failed event', async () => {
    const enqueueCapture: Array<{ eventType: string; payload: unknown }> = [];
    const db = {
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      getDocumentWithVersion: jest
        .fn()
        .mockResolvedValue(DataProcessResult.success({ doc: {}, seqNo: 1, primaryTerm: 1 })),
      storeDocumentWithOCC: jest
        .fn()
        .mockResolvedValue(DataProcessResult.failure('OCC_CONFLICT', 'Version changed')),
    };
    const queue = makeSuccessQueue(undefined, enqueueCapture);
    const svc = new SubscriptionPlanOrchestratorService(db as any, queue as any, makeCls() as any);

    const result = await svc.publishPlan(makeEvent());

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('OCC_CONFLICT');
    const failEvent = enqueueCapture.find(
      (e) => e.eventType === 'SubscriptionPlanPublicationFailed',
    );
    expect(failEvent).toBeDefined();
    expect((failEvent!.payload as Record<string, unknown>)['reason']).toBe('occ_conflict');
  });

  // T209-5: audit storeDocument called BEFORE enqueue(SubscriptionPlanPublished) — DNA-8
  it('Audit record written before publication event emitted (DNA-8 outbox order)', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn().mockImplementation(async () => {
        callOrder.push('db.searchDocuments');
        return DataProcessResult.success([]);
      }),
      storeDocument: jest.fn().mockImplementation(async (index: string) => {
        callOrder.push(`db.storeDocument(${index})`);
        return DataProcessResult.success({});
      }),
      getDocumentWithVersion: jest
        .fn()
        .mockResolvedValue(DataProcessResult.failure('NOT_FOUND', 'no version')),
      storeDocumentWithOCC: jest
        .fn()
        .mockResolvedValue(DataProcessResult.success({ seqNo: 1, primaryTerm: 1 })),
    };
    const queue = makeSuccessQueue(callOrder);
    const svc = new SubscriptionPlanOrchestratorService(db as any, queue as any, makeCls() as any);

    await svc.publishPlan(makeEvent());

    const auditIdx = callOrder.findIndex((c) => c.includes('storeDocument') && c.includes('audit'));
    const enqueueIdx = callOrder.findIndex((c) => c.includes('enqueue(SubscriptionPlanPublished)'));

    expect(auditIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeLessThan(enqueueIdx);
  });

  // T209-6: successful publish → SubscriptionPlanPublished with correct payload
  it('Successful plan publish emits SubscriptionPlanPublished with price and billing interval', async () => {
    const enqueueCapture: Array<{ eventType: string; payload: unknown }> = [];
    const db = makeSuccessDb();
    const queue = makeSuccessQueue(undefined, enqueueCapture);
    const svc = new SubscriptionPlanOrchestratorService(db as any, queue as any, makeCls() as any);

    const result = await svc.publishPlan(
      makeEvent({ priceCents: 1999, billingInterval: 'ANNUAL' }),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.data?.['planId']).toBe('plan-basic');
    const published = enqueueCapture.find((e) => e.eventType === 'SubscriptionPlanPublished');
    expect(published).toBeDefined();
    const p = published!.payload as Record<string, unknown>;
    expect(p['priceCents']).toBe(1999);
    expect(p['billingInterval']).toBe('ANNUAL');
  });
});
