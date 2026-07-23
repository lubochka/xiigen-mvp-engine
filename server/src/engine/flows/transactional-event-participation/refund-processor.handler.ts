// T104 RefundProcessorHandler [ORCHESTRATION]
// @connectionType FLOW_SCOPED
// @flowId FLOW-09
//
//
// Orchestrates refund: validates eligibility, releases seat, initiates payment reversal.
//
// Iron rules:
//   DNA-8: storeDocument RefundRecord BEFORE RefundInitiated emit
//   Refund eligibility window from FREEDOM config: flow09_refund_window_hours
//   knowledgeScope: 'PRIVATE'
//   Failure: DataProcessResult.failure — never throw

import { DataProcessResult } from '../../../kernel/data-process-result';
import type { IFreedomConfigService } from '../../../freedom/freedom-config.interface';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface RefundProcessorInput {
  purchaseId: string;
  userId: string;
  eventId: string;
  reason: string;
}

export interface RefundProcessorResult {
  refundId: string;
  purchaseId: string;
  status: 'INITIATED' | 'INELIGIBLE';
  reason?: string;
}

export class RefundProcessorHandler {
  constructor(
    /** DATABASE FABRIC: storeDocument + searchDocuments */
    private readonly db: IDatabaseService,
    /** QUEUE FABRIC: RefundInitiated CloudEvent */
    private readonly queue: IQueueService,
    /** FREEDOM config service */

    private readonly freedom: IFreedomConfigService,
  ) {}

  async processRefund(
    input: RefundProcessorInput,
  ): Promise<DataProcessResult<RefundProcessorResult>> {
    const refundId = `refund-${input.purchaseId}`;

    // Check idempotency
    const existing = await this.db.searchDocuments('refund-records', { refundId });
    if (existing.isSuccess && Array.isArray(existing.data) && existing.data.length > 0) {
      const rec = existing.data[0] as Record<string, unknown>;
      return DataProcessResult.success({
        refundId,
        purchaseId: input.purchaseId,
        status: rec['status'] as 'INITIATED' | 'INELIGIBLE',
      });
    }

    // Check purchase exists
    const purchaseResult = await this.db.searchDocuments('ticket-purchases', {
      purchaseId: input.purchaseId,
    });
    if (
      !purchaseResult.isSuccess ||
      !Array.isArray(purchaseResult.data) ||
      purchaseResult.data.length === 0
    ) {
      return DataProcessResult.failure(
        'PURCHASE_NOT_FOUND',
        `Purchase ${input.purchaseId} not found`,
      );
    }

    const purchase = purchaseResult.data[0] as Record<string, unknown>;

    // Refund window check from FREEDOM config
    const windowConfig = await this.freedom.get('flow09_refund_window_hours');
    const windowHours: number =
      typeof windowConfig?.['flow09_refund_window_hours'] === 'number'
        ? (windowConfig['flow09_refund_window_hours'] as number)
        : 24;

    const createdAt = new Date(purchase['createdAt'] as string);
    const windowMs = windowHours * 60 * 60 * 1000;
    const now = Date.now();

    if (now - createdAt.getTime() > windowMs) {
      await this.db.storeDocument(
        'refund-records',
        {
          refundId,
          purchaseId: input.purchaseId,
          status: 'INELIGIBLE',
          reason: 'REFUND_WINDOW_EXPIRED',
          connectionType: 'FLOW_SCOPED',
          knowledgeScope: 'PRIVATE',
        },
        refundId,
      );
      return DataProcessResult.success({
        refundId,
        purchaseId: input.purchaseId,
        status: 'INELIGIBLE',
        reason: 'REFUND_WINDOW_EXPIRED',
      });
    }

    const initiatedAt = new Date().toISOString();

    // DNA-8: storeDocument BEFORE enqueue
    const storeResult = await this.db.storeDocument(
      'refund-records',
      {
        refundId,
        purchaseId: input.purchaseId,
        userId: input.userId,
        eventId: input.eventId,
        reason: input.reason,
        status: 'INITIATED',
        initiatedAt,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      refundId,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store refund: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    await this.queue.enqueue('refund.initiated', {
      refundId,
      purchaseId: input.purchaseId,
      userId: input.userId,
      eventId: input.eventId,
      initiatedAt,
    });

    return DataProcessResult.success({
      refundId,
      purchaseId: input.purchaseId,
      status: 'INITIATED',
    });
  }
}
