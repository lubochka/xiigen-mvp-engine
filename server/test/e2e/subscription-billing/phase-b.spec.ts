/**
 * FLOW-12 Phase 1B — T210 SubscriptionLifecycleManager
 *
 * T210-1: invalid payment → failure('PAYMENT_INVALID'), no state write
 * T210-2: plan not ACTIVE → failure('PLAN_NOT_ACTIVE')
 * T210-3: SETNX collision → failure('ALREADY_SUBSCRIBED')
 * T210-4: trialDays > 0 → status='TRIALING', trialEndsAt set
 * T210-5: trialDays === 0 → status='ACTIVE'
 * T210-6: storeDocument called before enqueue(SubscriptionActivated) — DNA-8
 * T210-7: payment service uses FLOW09_PAYMENT_SERVICE token (not a newly registered provider)
 */

import 'reflect-metadata';
import {
  SubscriptionLifecycleManagerService,
  FLOW09_PAYMENT_SERVICE,
} from '../../../src/engine/flows/subscription-billing/subscription-lifecycle-manager.service';
import { DataProcessResult } from '../../../src/kernel/data-process-result';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    subscriberId: 'subscriber-001',
    planId: 'plan-basic',
    paymentMethodId: 'pm-vault-abc123',
    ...overrides,
  };
}

function makeActivePlan(trialDays = 0): Record<string, unknown> {
  return {
    planId: 'plan-basic',
    status: 'ACTIVE',
    priceCents: 999,
    billingInterval: 'MONTHLY',
    trialDays,
    activeUntil: null,
  };
}

function makeCls(tenantId = 'tenant-test') {
  return { get: jest.fn().mockReturnValue({ tenantId }) };
}

function makeValidPaymentService() {
  return {
    validate: jest.fn().mockResolvedValue(DataProcessResult.success({ valid: true })),
  };
}

function makeInvalidPaymentService() {
  return {
    validate: jest.fn().mockResolvedValue(DataProcessResult.failure('INVALID', 'invalid card')),
  };
}

function makeDb(
  planOverride?: Record<string, unknown> | null,
  setnxCollision = false,
  callOrder?: string[],
) {
  const plan = planOverride !== undefined ? planOverride : makeActivePlan();
  return {
    searchDocuments: jest
      .fn()
      .mockImplementation(async (index: string, filters: Record<string, unknown>) => {
        if (callOrder) callOrder.push(`db.searchDocuments(${index})`);
        // SETNX index
        if (index.includes('idempotency') && setnxCollision) {
          return DataProcessResult.success([{ key: 'existing' }]);
        }
        // Plans index
        if (index.includes('plans')) {
          return plan ? DataProcessResult.success([plan]) : DataProcessResult.success([]);
        }
        return DataProcessResult.success([]);
      }),
    storeDocument: jest.fn().mockImplementation(async (index: string) => {
      if (callOrder) callOrder.push(`db.storeDocument(${index})`);
      return DataProcessResult.success({});
    }),
  };
}

function makeQueue(callOrder?: string[], capture?: Array<{ eventType: string; payload: unknown }>) {
  return {
    enqueue: jest.fn().mockImplementation(async (eventType: string, payload: unknown) => {
      if (callOrder) callOrder.push(`queue.enqueue(${eventType})`);
      if (capture) capture.push({ eventType, payload });
      return DataProcessResult.success({});
    }),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FLOW-12 Phase 1B — T210 SubscriptionLifecycleManager', () => {
  // T210-1: invalid payment → no state write
  it('Invalid payment method rejects subscription activation without state write', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new SubscriptionLifecycleManagerService(
      db as any,
      queue as any,
      makeCls() as any,
      makeInvalidPaymentService(),
    );

    const result = await svc.subscribe(makeEvent());

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PAYMENT_INVALID');
    // No subscription stored
    const storeCalls = (db.storeDocument as jest.Mock).mock.calls.filter((c: unknown[]) =>
      (c[0] as string).includes('subscription'),
    );
    expect(storeCalls).toHaveLength(0);
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  // T210-2: plan not ACTIVE → failure(PLAN_NOT_ACTIVE)
  it('Inactive plan blocks subscription creation', async () => {
    const inactivePlan = {
      planId: 'plan-basic',
      status: 'ARCHIVED',
      priceCents: 999,
      billingInterval: 'MONTHLY',
      trialDays: 0,
      activeUntil: null,
    };
    const db = makeDb(inactivePlan);
    const queue = makeQueue();
    const svc = new SubscriptionLifecycleManagerService(
      db as any,
      queue as any,
      makeCls() as any,
      makeValidPaymentService(),
    );

    const result = await svc.subscribe(makeEvent());

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PLAN_NOT_ACTIVE');
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  // T210-3: SETNX collision → failure(ALREADY_SUBSCRIBED)
  it('Duplicate subscription request returns already-subscribed failure', async () => {
    const db = makeDb(undefined, true);
    const queue = makeQueue();
    const svc = new SubscriptionLifecycleManagerService(
      db as any,
      queue as any,
      makeCls() as any,
      makeValidPaymentService(),
    );

    const result = await svc.subscribe(makeEvent());

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('ALREADY_SUBSCRIBED');
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  // T210-4: trialDays > 0 → status=TRIALING, trialEndsAt set
  it('Trial period subscription enters TRIALING status with trial end date', async () => {
    const capture: Array<{ eventType: string; payload: unknown }> = [];
    const db = makeDb(makeActivePlan(14));
    const queue = makeQueue(undefined, capture);
    const svc = new SubscriptionLifecycleManagerService(
      db as any,
      queue as any,
      makeCls() as any,
      makeValidPaymentService(),
    );

    const result = await svc.subscribe(makeEvent());

    expect(result.isSuccess).toBe(true);
    expect(result.data?.['status']).toBe('TRIALING');
    expect(result.data?.['trialEndsAt']).toBeTruthy();

    const activated = capture.find((e) => e.eventType === 'SubscriptionActivated');
    expect(activated).toBeDefined();
    expect((activated!.payload as Record<string, unknown>)['status']).toBe('TRIALING');
  });

  // T210-5: trialDays === 0 → status=ACTIVE
  it('No-trial subscription enters ACTIVE status immediately', async () => {
    const capture: Array<{ eventType: string; payload: unknown }> = [];
    const db = makeDb(makeActivePlan(0));
    const queue = makeQueue(undefined, capture);
    const svc = new SubscriptionLifecycleManagerService(
      db as any,
      queue as any,
      makeCls() as any,
      makeValidPaymentService(),
    );

    const result = await svc.subscribe(makeEvent());

    expect(result.isSuccess).toBe(true);
    expect(result.data?.['status']).toBe('ACTIVE');

    const activated = capture.find((e) => e.eventType === 'SubscriptionActivated');
    expect(activated).toBeDefined();
    expect((activated!.payload as Record<string, unknown>)['status']).toBe('ACTIVE');
  });

  // T210-6: storeDocument called before enqueue(SubscriptionActivated) — DNA-8
  it('Subscription record stored before SubscriptionActivated event emitted (DNA-8 outbox order)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(undefined, false, callOrder);
    const queue = makeQueue(callOrder);
    const svc = new SubscriptionLifecycleManagerService(
      db as any,
      queue as any,
      makeCls() as any,
      makeValidPaymentService(),
    );

    await svc.subscribe(makeEvent());

    const storeIdx = callOrder.findIndex(
      (c) => c.includes('storeDocument') && c.includes('subscription'),
    );
    const enqueueIdx = callOrder.findIndex((c) => c.includes('enqueue(SubscriptionActivated)'));

    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThanOrEqual(0);
    expect(storeIdx).toBeLessThan(enqueueIdx);
  });

  // T210-7: FLOW09_PAYMENT_SERVICE is the injection token — not a new provider
  it('Payment service token reused from FLOW-09 (billing lock ordering compliance)', () => {
    // Verify the exported token is defined and is a Symbol
    expect(FLOW09_PAYMENT_SERVICE).toBeDefined();
    expect(typeof FLOW09_PAYMENT_SERVICE).toBe('symbol');
    // Verify the description identifies it as the FLOW-09 payment provider
    expect(FLOW09_PAYMENT_SERVICE.toString()).toContain('FLOW09');
  });
});
