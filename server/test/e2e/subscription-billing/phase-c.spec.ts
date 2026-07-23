/**
 * FLOW-12 Phase 2A — T211 RecurringBillingEngine
 *
 * T211-1: CANCELLED → InvoiceVoided, no lock, no charge
 * T211-2: PAUSED → InvoiceVoided, no charge
 * T211-3: lock false (concurrent run) → no invoice, no charge
 * T211-4: successful charge → InvoicePaid with priceCents + billingInterval
 * T211-5: failed charge (not final) → InvoicePaymentFailed with nextRetryAt
 * T211-6: failed charge (final attempt) → DunningFailed
 * T211-7: dunning schedule from FREEDOM config, not hardcoded
 * T211-8: audit storeDocument before enqueue — DNA-8
 */

import 'reflect-metadata';
import { RecurringBillingEngineService } from '../../../src/engine/flows/subscription-billing/recurring-billing-engine.service';
import { DataProcessResult } from '../../../src/kernel/data-process-result';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    subscriptionId: 'sub-001',
    periodKey: '2026-04',
    attemptNumber: 0,
    ...overrides,
  };
}

function makeCls(tenantId = 'tenant-test') {
  return { get: jest.fn().mockReturnValue({ tenantId }) };
}

function makeSubscription(status = 'ACTIVE'): Record<string, unknown> {
  return {
    subscriptionId: 'sub-001',
    status,
    priceCents: 999,
    billingInterval: 'MONTHLY',
    paymentMethodId: 'pm-vault-abc',
    tenantId: 'tenant-test',
  };
}

function makeDb(
  sub: Record<string, unknown> | null,
  lockHeld = false,
  dunningSchedule?: Array<Record<string, unknown>>,
  callOrder?: string[],
) {
  return {
    searchDocuments: jest
      .fn()
      .mockImplementation(async (index: string, filters: Record<string, unknown>) => {
        if (callOrder) callOrder.push(`db.searchDocuments(${index})`);
        if (index.includes('subscription')) {
          return sub ? DataProcessResult.success([sub]) : DataProcessResult.success([]);
        }
        if (index.includes('lock')) {
          return lockHeld
            ? DataProcessResult.success([{ lockKey: 'held' }])
            : DataProcessResult.success([]);
        }
        if (index.includes('freedom') || index === 'freedom_configs') {
          const sched = dunningSchedule ?? [
            { attempt: 0, wait_hours: 24 },
            { attempt: 1, wait_hours: 72 },
            { attempt: 2, wait_hours: 168 },
          ];
          return DataProcessResult.success([
            { config_key: 'subscription_billing_dunning_schedule', config_value: sched },
          ]);
        }
        return DataProcessResult.success([]);
      }),
    storeDocument: jest.fn().mockImplementation(async (index: string) => {
      if (callOrder) callOrder.push(`db.storeDocument(${index})`);
      return DataProcessResult.success({});
    }),
  };
}

function makePaymentService(success = true) {
  return {
    charge: jest
      .fn()
      .mockResolvedValue(
        success
          ? DataProcessResult.success({ transactionRef: 'txn-001' })
          : DataProcessResult.failure('CHARGE_FAILED', 'card declined'),
      ),
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

describe('FLOW-12 Phase 2A — T211 RecurringBillingEngine', () => {
  // T211-1: CANCELLED → InvoiceVoided, no lock, no charge
  it('Cancelled subscription voids invoice without acquiring lock or charging', async () => {
    const capture: Array<{ eventType: string; payload: unknown }> = [];
    const db = makeDb(makeSubscription('CANCELLED'));
    const queue = makeQueue(undefined, capture);
    const payment = makePaymentService();
    const svc = new RecurringBillingEngineService(
      db as any,
      queue as any,
      makeCls() as any,
      payment,
    );

    const result = await svc.processBillingCycle(makeEvent());

    expect(result.isSuccess).toBe(true);
    // InvoiceVoided emitted
    const voided = capture.find((e) => e.eventType === 'InvoiceVoided');
    expect(voided).toBeDefined();
    // No charge or lock
    expect(payment.charge).not.toHaveBeenCalled();
    // No lock stored
    const lockStores = (db.storeDocument as jest.Mock).mock.calls.filter((c: unknown[]) =>
      (c[0] as string).includes('lock'),
    );
    expect(lockStores).toHaveLength(0);
  });

  // T211-2: PAUSED → InvoiceVoided, no charge
  it('Paused subscription voids invoice without charging', async () => {
    const capture: Array<{ eventType: string; payload: unknown }> = [];
    const db = makeDb(makeSubscription('PAUSED'));
    const queue = makeQueue(undefined, capture);
    const payment = makePaymentService();
    const svc = new RecurringBillingEngineService(
      db as any,
      queue as any,
      makeCls() as any,
      payment,
    );

    await svc.processBillingCycle(makeEvent());

    const voided = capture.find((e) => e.eventType === 'InvoiceVoided');
    expect(voided).toBeDefined();
    expect(payment.charge).not.toHaveBeenCalled();
  });

  // T211-3: lock held by concurrent run → no invoice, no charge
  it('Concurrent billing run skips when lock already held', async () => {
    const capture: Array<{ eventType: string; payload: unknown }> = [];
    const db = makeDb(makeSubscription('ACTIVE'), true);
    const queue = makeQueue(undefined, capture);
    const payment = makePaymentService();
    const svc = new RecurringBillingEngineService(
      db as any,
      queue as any,
      makeCls() as any,
      payment,
    );

    const result = await svc.processBillingCycle(makeEvent());

    expect(result.isSuccess).toBe(true);
    expect((result.data as Record<string, unknown>)['skipped']).toBe(true);
    expect(payment.charge).not.toHaveBeenCalled();
    // No InvoicePaid, InvoicePaymentFailed, DunningFailed emitted
    expect(capture).toHaveLength(0);
  });

  // T211-4: successful charge → InvoicePaid with priceCents + billingInterval
  it('Successful charge emits InvoicePaid with price and billing interval', async () => {
    const capture: Array<{ eventType: string; payload: unknown }> = [];
    const db = makeDb(makeSubscription('ACTIVE'));
    const queue = makeQueue(undefined, capture);
    const svc = new RecurringBillingEngineService(
      db as any,
      queue as any,
      makeCls() as any,
      makePaymentService(true),
    );

    const result = await svc.processBillingCycle(makeEvent());

    expect(result.isSuccess).toBe(true);
    const paid = capture.find((e) => e.eventType === 'InvoicePaid');
    expect(paid).toBeDefined();
    const p = paid!.payload as Record<string, unknown>;
    expect(p['priceCents']).toBe(999);
    expect(p['billingInterval']).toBe('MONTHLY');
  });

  // T211-5: failed charge (not final) → InvoicePaymentFailed with nextRetryAt
  it('Non-final payment failure emits InvoicePaymentFailed with next retry time', async () => {
    const capture: Array<{ eventType: string; payload: unknown }> = [];
    const db = makeDb(makeSubscription('ACTIVE'));
    const queue = makeQueue(undefined, capture);
    const svc = new RecurringBillingEngineService(
      db as any,
      queue as any,
      makeCls() as any,
      makePaymentService(false),
    );

    await svc.processBillingCycle(makeEvent({ attemptNumber: 0 }));

    const failed = capture.find((e) => e.eventType === 'InvoicePaymentFailed');
    expect(failed).toBeDefined();
    const p = failed!.payload as Record<string, unknown>;
    expect(p['nextRetryAt']).toBeTruthy();
    expect(p['attemptNumber']).toBe(0);
  });

  // T211-6: failed charge (final attempt) → DunningFailed
  it('Final payment failure emits DunningFailed', async () => {
    const capture: Array<{ eventType: string; payload: unknown }> = [];
    // dunning schedule has 3 entries — attempt 2 (0-indexed) is the last
    const db = makeDb(makeSubscription('ACTIVE'), false, [
      { attempt: 0, wait_hours: 24 },
      { attempt: 1, wait_hours: 72 },
      { attempt: 2, wait_hours: 168 },
    ]);
    const queue = makeQueue(undefined, capture);
    const svc = new RecurringBillingEngineService(
      db as any,
      queue as any,
      makeCls() as any,
      makePaymentService(false),
    );

    await svc.processBillingCycle(makeEvent({ attemptNumber: 2 }));

    const dunningFailed = capture.find((e) => e.eventType === 'DunningFailed');
    expect(dunningFailed).toBeDefined();
    const p = dunningFailed!.payload as Record<string, unknown>;
    expect(p['finalAttemptNumber']).toBe(2);
    expect(p['subscriptionId']).toBe('sub-001');
    expect(p['invoiceId']).toBeTruthy();
  });

  // T211-7: dunning schedule from FREEDOM config — not hardcoded
  it('Dunning retry schedule sourced from FREEDOM config, not hardcoded', async () => {
    const db = makeDb(makeSubscription('ACTIVE'), false, [
      { attempt: 0, wait_hours: 48 }, // non-default values — must come from config
      { attempt: 1, wait_hours: 96 },
    ]);
    const queue = makeQueue();
    const svc = new RecurringBillingEngineService(
      db as any,
      queue as any,
      makeCls() as any,
      makePaymentService(false),
    );

    await svc.processBillingCycle(makeEvent({ attemptNumber: 0 }));

    // Verify searchDocuments was called with the FREEDOM config key
    const freedomCalls = (db.searchDocuments as jest.Mock).mock.calls.filter((c: unknown[]) => {
      const filters = c[1] as Record<string, unknown>;
      return filters?.['config_key'] === 'subscription_billing_dunning_schedule';
    });
    expect(freedomCalls.length).toBeGreaterThan(0);
  });

  // T211-8: audit storeDocument BEFORE enqueue — DNA-8
  it('Audit record written before InvoicePaid event emitted (DNA-8 outbox order)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(makeSubscription('ACTIVE'), false, undefined, callOrder);
    const queue = makeQueue(callOrder);
    const svc = new RecurringBillingEngineService(
      db as any,
      queue as any,
      makeCls() as any,
      makePaymentService(true),
    );

    await svc.processBillingCycle(makeEvent());

    const auditIdx = callOrder.findIndex((c) => c.includes('storeDocument') && c.includes('audit'));
    const enqueueIdx = callOrder.findIndex((c) => c.includes('enqueue(InvoicePaid)'));

    expect(auditIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThanOrEqual(0);
    expect(auditIdx).toBeLessThan(enqueueIdx);
  });
});
