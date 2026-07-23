// T100 PaymentProcessorHandler [DATA_PIPELINE]
// @connectionType FLOW_SCOPED
// @flowId FLOW-09
//
//
// Processes payment capture after seat hold is confirmed.
// F273: IPaymentService — INJECTABLE (tenant-configurable PSP)
//
// Iron rules:
//   DNA-8: storeDocument PaymentRecord BEFORE PaymentProcessed emit
//   Idempotency: SETNX on (purchaseId + 'payment')
//   F273 INJECTABLE — tenants choose their own PSP
//   knowledgeScope: 'PRIVATE'
//   tenantId from ALS

import { DataProcessResult } from '../../../kernel/data-process-result';

interface IPaymentService {
  capture(params: Record<string, unknown>): Promise<{
    isSuccess: boolean;
    errorCode?: string;
    errorMessage?: string;
    data?: Record<string, unknown>;
  }>;
}
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface PaymentInput {
  purchaseId: string;
  holdId: string;
  userId: string;
  eventId: string;
  amount: number;
  currency: string;
  paymentMethodId: string;
}

export interface PaymentResult {
  paymentId: string;
  purchaseId: string;
  status: 'COMPLETED' | 'FAILED';
  transactionRef: string;
}

export class PaymentProcessorHandler {
  constructor(
    /** F273: IPaymentService — INJECTABLE tenant PSP */

    private readonly paymentService: IPaymentService,
    /** DATABASE FABRIC: storeDocument */
    private readonly db: IDatabaseService,
    /** QUEUE FABRIC: PaymentProcessed CloudEvent */
    private readonly queue: IQueueService,
  ) {}

  async processPayment(input: PaymentInput): Promise<DataProcessResult<PaymentResult>> {
    const paymentId = `pay-${input.purchaseId}`;

    // Idempotency: SETNX on (purchaseId + 'payment')
    const existingResult = await this.db.searchDocuments('payment-records', {
      paymentId,
    });
    if (
      existingResult.isSuccess &&
      Array.isArray(existingResult.data) &&
      existingResult.data.length > 0
    ) {
      const existing = existingResult.data[0] as Record<string, unknown>;
      return DataProcessResult.success({
        paymentId,
        purchaseId: input.purchaseId,
        status: existing['status'] as 'COMPLETED' | 'FAILED',
        transactionRef: existing['transactionRef'] as string,
      });
    }

    // Capture payment via INJECTABLE PSP
    const captureResult = await this.paymentService.capture({
      purchaseId: input.purchaseId,
      amount: input.amount,
      currency: input.currency,
      paymentMethodId: input.paymentMethodId,
    });

    if (!captureResult.isSuccess) {
      return DataProcessResult.failure(
        'PAYMENT_FAILED',
        captureResult.errorMessage ?? 'Payment capture failed',
      );
    }

    const transactionRef =
      (captureResult.data?.['transactionRef'] as string) ?? `txn-${Date.now()}`;
    const processedAt = new Date().toISOString();

    // DNA-8: storeDocument BEFORE emit
    const storeResult = await this.db.storeDocument(
      'payment-records',
      {
        paymentId,
        purchaseId: input.purchaseId,
        userId: input.userId,
        eventId: input.eventId,
        amount: input.amount,
        currency: input.currency,
        transactionRef,
        status: 'COMPLETED',
        processedAt,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      paymentId,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store payment: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    await this.queue.enqueue('payment.processed', {
      paymentId,
      purchaseId: input.purchaseId,
      userId: input.userId,
      eventId: input.eventId,
      transactionRef,
      processedAt,
    });

    return DataProcessResult.success({
      paymentId,
      purchaseId: input.purchaseId,
      status: 'COMPLETED',
      transactionRef,
    });
  }
}
