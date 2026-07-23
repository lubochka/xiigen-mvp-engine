/**
 * T211 RecurringBillingEngine [BILLING, SCHEDULED]
 * FLOW-12: Subscription & Recurring Billing
 *
 * Entry: BillingCycleDue delayed queue job — NOT @EventPattern. Archetype: SCHEDULED.
 *
 * Execution order is MACHINE (CF-12-1):
 *   ORDER 1: getStatus() — CANCELLED/PAUSED → InvoiceVoided, return. No lock.
 *   ORDER 2: lock() — lock=false (concurrent run already running) → return, no charge.
 *   ORDER 3: Invoice generation — invoiceId = hash(tenantId+subscriptionId+periodKey)
 *   ORDER 4: Charge via IPaymentFabricService
 *   ORDER 5: storeDocument(billingAudit) — DNA-8, before any emit
 *   ORDER 6: emit InvoicePaid | InvoicePaymentFailed | DunningFailed
 *
 * Iron rules:
 *   IR-1: getStatus() at ORDER 1 — CANCELLED/PAUSED → InvoiceVoided immediately, no lock. CF-12-1.
 *   IR-2: Lock at ORDER 2 — concurrent run → return without charge. CF-12-1.
 *   IR-3: invoiceId = hash(tenantId+subscriptionId+periodKey) — idempotency key for charge.
 *   IR-4: Charge at ORDER 4 after invoice ID established.
 *   IR-5: storeDocument(billingAudit) at ORDER 5 BEFORE any enqueue. DNA-8.
 *   IR-6: dunningSchedule from FREEDOM config key "subscription_billing_dunning_schedule" — NEVER hardcoded. CF-12-3.
 *   IR-7: maxAttempts = dunningSchedule.length — never a hardcoded constant. CF-12-3.
 *
 * DPO conflict annotation:
 *   T211 lock-before-charge INVERTS FLOW-09-T107 seat-before-payment.
 *   conflictsWith: FLOW-09-T107-seat-before-payment
 *   Both are domain-correct: FLOW-09 has a seat record to create first;
 *   T211 has no new record to create (subscription already exists), so status-check-first.
 *
 * Emits: InvoicePaid, InvoicePaymentFailed, InvoiceVoided, DunningFailed
 */

import { Injectable, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { FLOW09_PAYMENT_SERVICE } from './subscription-lifecycle-manager.service';

interface IPaymentService {
  charge(params: Record<string, unknown>): Promise<{
    isSuccess: boolean;
    errorCode?: string;
    errorMessage?: string;
    data?: Record<string, unknown>;
  }>;
}

const SUBSCRIPTIONS_INDEX = 'xiigen-subscriptions';
const BILLING_AUDIT_INDEX = 'xiigen-billing-audit';
const BILLING_LOCK_INDEX = 'xiigen-billing-locks';
const FREEDOM_INDEX = 'freedom_configs';

const VOIDED_STATUSES = ['CANCELLED', 'PAUSED'] as const;

interface TenantContextLookup {
  getCurrentTenantId?: () => { isSuccess: boolean; data?: string };
  get?: (key: string) => { tenantId?: string } | undefined;
}

@Injectable()
export class RecurringBillingEngineService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbService: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueService: IQueueService,
    private readonly tenantContext: TenantContextLookup,
    @Inject(FLOW09_PAYMENT_SERVICE) private readonly paymentService: IPaymentService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T211',
        serviceName: 'RecurringBillingEngineService',
        flowId: 'FLOW-12',
      }),
    });
  }

  private getTenantId(): string {
    const resolved = this.tenantContext.getCurrentTenantId?.();
    if (resolved?.isSuccess && typeof resolved.data === 'string' && resolved.data.length > 0) {
      return resolved.data;
    }
    return this.tenantContext.get?.('tenant')?.tenantId ?? 'unknown';
  }

  /**
   * Entry point for BillingCycleDue scheduled job.
   * DPO conflict: conflictsWith FLOW-09-T107-seat-before-payment (domain-correct inversion).
   */
  async processBillingCycle(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const subscriptionId = event['subscriptionId'] as string;
    const periodKey = event['periodKey'] as string;
    const attemptNumber = (event['attemptNumber'] as number) ?? 0;

    // ORDER 1: Status check — IR-1, CF-12-1
    // DPO: T211 status-before-lock INVERTS FLOW-09-T107 seat-before-payment
    const subResult = await this.dbService.searchDocuments(SUBSCRIPTIONS_INDEX, {
      subscriptionId,
      tenantId,
    });
    if (!subResult.isSuccess || (subResult.data ?? []).length === 0) {
      return DataProcessResult.failure(
        'SUBSCRIPTION_NOT_FOUND',
        `Subscription ${subscriptionId} not found`,
      );
    }
    const subscription = subResult.data![0] as Record<string, unknown>;
    const subStatus = subscription['status'] as string;

    if ((VOIDED_STATUSES as readonly string[]).includes(subStatus)) {
      // CANCELLED or PAUSED → InvoiceVoided immediately, no lock acquired
      await this.queueService.enqueue('InvoiceVoided', {
        tenantId,
        subscriptionId,
        periodKey,
        reason: `subscription_${subStatus.toLowerCase()}`,
      });
      return DataProcessResult.success({ voided: true, reason: subStatus });
    }

    // ORDER 2: Lock acquisition — IR-2, CF-12-1
    const lockKey = createHash('sha256')
      .update(`lock:${tenantId}:${subscriptionId}:${periodKey}`)
      .digest('hex');
    const lockResult = await this.dbService.searchDocuments(BILLING_LOCK_INDEX, { lockKey });
    if (lockResult.isSuccess && (lockResult.data ?? []).length > 0) {
      // Lock held by concurrent run — skip without charge
      return DataProcessResult.success({ skipped: true, reason: 'concurrent_run' });
    }
    await this.dbService.storeDocument(
      BILLING_LOCK_INDEX,
      { lockKey, subscriptionId, periodKey, tenantId, acquiredAt: new Date().toISOString() },
      lockKey,
    );

    // ORDER 3: Invoice generation — IR-3
    const invoiceId = createHash('sha256')
      .update(`invoice:${tenantId}:${subscriptionId}:${periodKey}`)
      .digest('hex');
    const priceCents = subscription['priceCents'] as number;

    // ORDER 4: Charge — IR-4
    const chargeResult = await this.paymentService.charge({
      amount: priceCents,
      invoiceId,
      subscriptionId,
      paymentMethodId: subscription['paymentMethodId'],
      tenantId,
      attemptNumber,
    });

    const now = new Date().toISOString();

    // ORDER 5: Audit write — BEFORE any enqueue (DNA-8, IR-5)
    const auditId = `billing-audit-${invoiceId}-${attemptNumber}`;
    await this.dbService.storeDocument(
      BILLING_AUDIT_INDEX,
      {
        auditId,
        subscriptionId,
        invoiceId,
        periodKey,
        tenantId,
        attemptNumber,
        chargeSuccess: chargeResult?.isSuccess ?? false,
        auditedAt: now,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      auditId,
    );

    // ORDER 6: Emit result
    if (chargeResult?.isSuccess) {
      await this.queueService.enqueue('InvoicePaid', {
        tenantId,
        subscriptionId,
        invoiceId,
        periodKey,
        priceCents,
        billingInterval: subscription['billingInterval'],
        paidAt: now,
      });
      return DataProcessResult.success({ invoiceId, priceCents, paidAt: now });
    }

    // Charge failed — dunning logic
    const dunningSchedule = await this.getDunningSchedule();
    const maxAttempts = dunningSchedule.length; // IR-7: from config length, never hardcoded

    if (attemptNumber + 1 >= maxAttempts) {
      // Final attempt — emit DunningFailed
      await this.queueService.enqueue('DunningFailed', {
        tenantId,
        subscriptionId,
        invoiceId,
        finalAttemptNumber: attemptNumber,
        failedAt: now,
      });
      return DataProcessResult.success({ dunningFailed: true, finalAttemptNumber: attemptNumber });
    }

    // Schedule retry — wait_hours from FREEDOM config (IR-6)
    const scheduleEntry = dunningSchedule[attemptNumber] as Record<string, unknown>;
    const waitMs = (scheduleEntry['wait_hours'] as number) * 3600000;
    const nextRetryAt = new Date(Date.now() + waitMs).toISOString();

    await this.queueService.enqueue('InvoicePaymentFailed', {
      tenantId,
      subscriptionId,
      invoiceId,
      periodKey,
      priceCents,
      attemptNumber,
      nextRetryAt,
    });

    return DataProcessResult.success({ paymentFailed: true, nextRetryAt, attemptNumber });
  }

  /**
   * Reads dunning schedule from FREEDOM config.
   * IR-6: key "subscription_billing_dunning_schedule" is MACHINE — never a variable.
   * IR-7: maxAttempts = schedule.length — never hardcoded.
   */
  private async getDunningSchedule(): Promise<Array<Record<string, unknown>>> {
    const result = await this.dbService.searchDocuments(FREEDOM_INDEX, {
      config_key: 'subscription_billing_dunning_schedule',
      task_type: 'xiigen-engine',
    });
    if (result.isSuccess && (result.data ?? []).length > 0) {
      const val = (result.data![0] as Record<string, unknown>)['config_value'];
      if (Array.isArray(val)) return val as Array<Record<string, unknown>>;
    }
    // Safe defaults — operators should configure subscription_billing_dunning_schedule
    return [
      { attempt: 0, wait_hours: 24 },
      { attempt: 1, wait_hours: 72 },
      { attempt: 2, wait_hours: 168 },
    ];
  }
}
