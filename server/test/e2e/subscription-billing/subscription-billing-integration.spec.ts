/**
 * FLOW-12 Integration Tests — Subscription & Recurring Billing
 *
 * INT-1: SubscriptionActivated emitted by T210 (SubscriptionLifecycleManagerService), not T211
 * INT-2: T211 RecurringBillingEngineService does NOT have @EventPattern('SubscriptionActivated')
 * INT-3: DunningFailed carries subscriptionId + invoiceId + finalAttemptNumber
 * INT-4: SubscriptionActivated carries priceCents (integer), billingInterval, activatedAt, subscriptionId
 * INT-5: T211 iron rules describe CANCELLED→InvoiceVoided at ORDER 1
 */

import 'reflect-metadata';
import { SubscriptionLifecycleManagerService } from '../../../src/engine/flows/subscription-billing/subscription-lifecycle-manager.service';
import { RecurringBillingEngineService } from '../../../src/engine/flows/subscription-billing/recurring-billing-engine.service';
import { DataProcessResult } from '../../../src/kernel/data-process-result';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeCls(tenantId = 'tenant-test') {
  return { get: jest.fn().mockReturnValue({ tenantId }) };
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

function makeT210Db() {
  return {
    searchDocuments: jest.fn().mockImplementation(async (index: string) => {
      if (index.includes('plans')) return DataProcessResult.success([makeActivePlan()]);
      return DataProcessResult.success([]);
    }),
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  };
}

function makeT210Queue(capture: Array<{ eventType: string; payload: unknown }>) {
  return {
    enqueue: jest.fn().mockImplementation(async (et: string, payload: unknown) => {
      capture.push({ eventType: et, payload });
      return DataProcessResult.success({});
    }),
  };
}

function makeValidPaymentService() {
  return { validate: jest.fn().mockResolvedValue(DataProcessResult.success({ valid: true })) };
}

function makeT211Db(
  sub: Record<string, unknown>,
  dunningSchedule: Array<Record<string, unknown>>,
  lockHeld = false,
) {
  return {
    searchDocuments: jest
      .fn()
      .mockImplementation(async (index: string, filters: Record<string, unknown>) => {
        if (index.includes('subscription')) return DataProcessResult.success([sub]);
        if (index.includes('lock'))
          return lockHeld
            ? DataProcessResult.success([{ lockKey: 'held' }])
            : DataProcessResult.success([]);
        if (index.includes('freedom') || index === 'freedom_configs') {
          return DataProcessResult.success([
            { config_key: 'subscription_billing_dunning_schedule', config_value: dunningSchedule },
          ]);
        }
        return DataProcessResult.success([]);
      }),
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  };
}

function makeT211Queue(capture: Array<{ eventType: string; payload: unknown }>) {
  return {
    enqueue: jest.fn().mockImplementation(async (et: string, payload: unknown) => {
      capture.push({ eventType: et, payload });
      return DataProcessResult.success({});
    }),
  };
}

// ── Integration Tests ─────────────────────────────────────────────────────────

describe('FLOW-12 Integration Tests', () => {
  // INT-1: SubscriptionActivated emitted by T210, not T211
  it('INT-1: SubscriptionActivated emitted by T210 SubscriptionLifecycleManagerService', async () => {
    const capture: Array<{ eventType: string; payload: unknown }> = [];
    const db = makeT210Db();
    const queue = makeT210Queue(capture);
    const svc = new SubscriptionLifecycleManagerService(
      db as any,
      queue as any,
      makeCls() as any,
      makeValidPaymentService(),
    );

    await svc.subscribe({
      subscriberId: 'user-001',
      planId: 'plan-basic',
      paymentMethodId: 'pm-vault-xyz',
    });

    const activated = capture.find((e) => e.eventType === 'SubscriptionActivated');
    expect(activated).toBeDefined();
  });

  // INT-2: T211 does NOT handle SubscriptionActivated
  it('INT-2: T211 RecurringBillingEngineService does NOT process SubscriptionActivated', async () => {
    // T211 entry point is processBillingCycle — a scheduled job, not @EventPattern
    // Verify the service only has processBillingCycle as public entry — not onSubscriptionActivated
    const proto = RecurringBillingEngineService.prototype;
    expect(typeof proto.processBillingCycle).toBe('function');
    // No @EventPattern for SubscriptionActivated
    expect(
      (proto as unknown as Record<string, unknown>)['onSubscriptionActivated'],
    ).toBeUndefined();
  });

  // INT-3: DunningFailed carries subscriptionId + invoiceId + finalAttemptNumber
  it('INT-3: DunningFailed event carries subscriptionId, invoiceId, finalAttemptNumber', async () => {
    const capture: Array<{ eventType: string; payload: unknown }> = [];
    const sub = {
      subscriptionId: 'sub-001',
      status: 'ACTIVE',
      priceCents: 999,
      billingInterval: 'MONTHLY',
      paymentMethodId: 'pm-vault',
      tenantId: 'tenant-test',
    };
    const schedule = [{ attempt: 0, wait_hours: 24 }]; // 1-entry schedule — attempt 0 is final
    const db = makeT211Db(sub, schedule);
    const queue = makeT211Queue(capture);
    const failPayment = {
      charge: jest.fn().mockResolvedValue(DataProcessResult.failure('CHARGE_FAILED', 'declined')),
    };
    const svc = new RecurringBillingEngineService(
      db as any,
      queue as any,
      makeCls() as any,
      failPayment,
    );

    await svc.processBillingCycle({
      subscriptionId: 'sub-001',
      periodKey: '2026-04',
      attemptNumber: 0,
    });

    const dunningFailed = capture.find((e) => e.eventType === 'DunningFailed');
    expect(dunningFailed).toBeDefined();
    const p = dunningFailed!.payload as Record<string, unknown>;
    expect(p['subscriptionId']).toBe('sub-001');
    expect(p['invoiceId']).toBeTruthy();
    expect(typeof p['finalAttemptNumber']).toBe('number');
  });

  // INT-4: SubscriptionActivated carries required fields
  it('INT-4: SubscriptionActivated carries priceCents (integer), billingInterval, activatedAt, subscriptionId', async () => {
    const capture: Array<{ eventType: string; payload: unknown }> = [];
    const db = makeT210Db();
    const queue = makeT210Queue(capture);
    const svc = new SubscriptionLifecycleManagerService(
      db as any,
      queue as any,
      makeCls() as any,
      makeValidPaymentService(),
    );

    await svc.subscribe({
      subscriberId: 'user-001',
      planId: 'plan-basic',
      paymentMethodId: 'pm-vault-xyz',
    });

    const activated = capture.find((e) => e.eventType === 'SubscriptionActivated');
    expect(activated).toBeDefined();
    const p = activated!.payload as Record<string, unknown>;
    expect(Number.isInteger(p['priceCents'])).toBe(true);
    expect(p['billingInterval']).toBeTruthy();
    expect(p['activatedAt']).toBeTruthy();
    expect(p['subscriptionId']).toBeTruthy();
  });

  // INT-5: T211 iron rules encode CANCELLED→InvoiceVoided at ORDER 1
  it('INT-5: T211 iron rules: CANCELLED subscription → InvoiceVoided at ORDER 1 (before lock)', async () => {
    const capture: Array<{ eventType: string; payload: unknown }> = [];
    const callOrder: string[] = [];
    const sub = {
      subscriptionId: 'sub-001',
      status: 'CANCELLED',
      priceCents: 999,
      billingInterval: 'MONTHLY',
      paymentMethodId: 'pm-vault',
      tenantId: 'tenant-test',
    };
    const db = {
      searchDocuments: jest.fn().mockImplementation(async (index: string) => {
        callOrder.push(`db.searchDocuments(${index})`);
        if (index.includes('subscription')) return DataProcessResult.success([sub]);
        return DataProcessResult.success([]);
      }),
      storeDocument: jest.fn().mockImplementation(async (index: string) => {
        callOrder.push(`db.storeDocument(${index})`);
        return DataProcessResult.success({});
      }),
    };
    const queue = {
      enqueue: jest.fn().mockImplementation(async (et: string, p: unknown) => {
        callOrder.push(`queue.enqueue(${et})`);
        capture.push({ eventType: et, payload: p });
        return DataProcessResult.success({});
      }),
    };
    const payment = { charge: jest.fn() };
    const svc = new RecurringBillingEngineService(
      db as any,
      queue as any,
      makeCls() as any,
      payment,
    );

    await svc.processBillingCycle({
      subscriptionId: 'sub-001',
      periodKey: '2026-04',
      attemptNumber: 0,
    });

    // InvoiceVoided must be emitted
    const voided = capture.find((e) => e.eventType === 'InvoiceVoided');
    expect(voided).toBeDefined();

    // No lock stored — status check happened before lock acquisition
    const lockStores = callOrder.filter((c) => c.includes('storeDocument') && c.includes('lock'));
    expect(lockStores).toHaveLength(0);

    // No charge attempted
    expect(payment.charge).not.toHaveBeenCalled();

    // The subscription search (ORDER 1) happened before InvoiceVoided emit
    const subSearchIdx = callOrder.findIndex(
      (c) => c.includes('searchDocuments') && c.includes('subscription'),
    );
    const voidedIdx = callOrder.findIndex((c) => c.includes('enqueue(InvoiceVoided)'));
    expect(subSearchIdx).toBeLessThan(voidedIdx);
  });
});
