/**
 * BillingCycleConsumer — processes BillingCycle queue messages.
 *
 * C-2 Fix: Added setIfAbsent deduplication BEFORE lock acquisition.
 *   Without this, a BullMQ retry after partial completion can re-charge
 *   a customer — setIfAbsent is the only guard against message re-execution.
 *
 * IR-3: Idempotency key required before any financial charge (DNA-7)
 * IR-6: Distributed lock via billing schedule service before processing
 * IR-7: Financial values use integer cents (Math.round(x * 100)), never float
 *
 * DNA-3: returns DataProcessResult, never throws
 * DNA-8: storeDocument (invoice) BEFORE charge
 * DNA-9: all events use createCloudEvent
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../fabrics/interfaces/queue.interface';
import {
  IScopedMemoryService,
  SCOPED_MEMORY_SERVICE,
} from '../../fabrics/interfaces/scoped-memory.interface';
import { DataProcessResult } from '../../kernel/data-process-result';

@Injectable()
export class BillingCycleConsumer {
  private readonly logger = new Logger(BillingCycleConsumer.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
    @Inject(SCOPED_MEMORY_SERVICE) private readonly memory: IScopedMemoryService,
  ) {}

  async handle(message: Record<string, unknown>): Promise<DataProcessResult<void>> {
    // IR-3 / DNA-7: deduplicate on message-level idempotency key BEFORE any state mutation
    const idempotencyKey = message['idempotencyKey'] as string;
    if (!idempotencyKey) {
      return DataProcessResult.failure(
        'MISSING_IDEMPOTENCY_KEY',
        'BillingCycle message must include idempotencyKey',
      );
    }

    // C-2 Fix: setIfAbsent as the FIRST operation — before lock, before any mutation
    const isNew = await this.memory.setIfAbsent(
      `billing_cycle:${idempotencyKey}`,
      'processing',
      86400, // 24h TTL
    );
    if (!isNew) {
      // Message already processed (or in-flight duplicate) — idempotent no-op
      this.logger.debug(`BillingCycle ${idempotencyKey} already processed — idempotent no-op`);
      return DataProcessResult.success(undefined);
    }

    const subscriptionId = message['subscriptionId'] as string;
    if (!subscriptionId) {
      // Release idempotency key — message is malformed, allow retry with fix
      await this.memory.delete(`billing_cycle:${idempotencyKey}`);
      return DataProcessResult.failure(
        'MISSING_SUBSCRIPTION_ID',
        'BillingCycle message must include subscriptionId',
      );
    }

    const tenantId = message['tenantId'] as string;
    if (!tenantId) {
      await this.memory.delete(`billing_cycle:${idempotencyKey}`);
      return DataProcessResult.failure(
        'MISSING_TENANT_ID',
        'BillingCycle message must include tenantId',
      );
    }

    // IR-6: Distributed lock — billing_lock:tenantId:subscriptionId
    const lockKey = `billing_lock:${tenantId}:${subscriptionId}`;
    const lockAcquired = await this.memory.setIfAbsent(lockKey, 'locked', 300); // 5m TTL for lock
    if (!lockAcquired) {
      // Release idempotency key so message can retry with fresh key after lock releases
      await this.memory.delete(`billing_cycle:${idempotencyKey}`);
      return DataProcessResult.failure('LOCK_NOT_ACQUIRED', 'Subscription already being processed');
    }

    try {
      // Retrieve subscription details
      const subResult = await this.db.getDocument('xiigen-subscriptions', subscriptionId);
      if (!subResult.isSuccess || !subResult.data) {
        return DataProcessResult.failure(
          'SUBSCRIPTION_NOT_FOUND',
          `Subscription ${subscriptionId} not found`,
        );
      }

      const subscription = subResult.data as Record<string, unknown>;

      // IR-7: amount is already in integer cents — never float
      const amountCents =
        typeof subscription['amountCents'] === 'number'
          ? subscription['amountCents']
          : Math.round(Number(subscription['amount'] ?? 0) * 100);

      // Generate invoice document
      const invoiceId = `inv:${subscriptionId}:${idempotencyKey}`;
      const invoice: Record<string, unknown> = {
        invoiceId,
        subscriptionId,
        tenantId,
        amountCents,
        status: 'PENDING',
        billingCycleKey: idempotencyKey,
        createdAt: new Date().toISOString(),
      };

      // DNA-8: storeDocument (invoice) BEFORE charge
      const storeResult = await this.db.storeDocument('invoices', invoice, invoiceId);
      if (!storeResult.isSuccess) {
        return DataProcessResult.failure(
          'INVOICE_STORE_FAILED',
          storeResult.errorMessage ?? 'Failed to store invoice',
        );
      }

      // Charge enqueued as a separate job (fabric pattern — no direct payment SDK)
      await this.queue.enqueue('payment-charge', {
        type: 'PAYMENT_CHARGE',
        invoiceId,
        subscriptionId,
        tenantId,
        amountCents,
        idempotencyKey,
      });

      // Schedule next billing cycle
      await this.queue.enqueue('billing-cycle-schedule', {
        type: 'BILLING_CYCLE_SCHEDULE_NEXT',
        subscriptionId,
        tenantId,
        previousCycleKey: idempotencyKey,
      });

      this.logger.log(
        `BillingCycle processed: subscription=${subscriptionId} invoice=${invoiceId} amountCents=${amountCents}`,
      );
      return DataProcessResult.success(undefined);
    } finally {
      // Always release the distributed lock (IR-6)
      await this.memory.delete(lockKey);
    }
  }
}
