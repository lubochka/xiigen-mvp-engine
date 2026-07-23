// T69 PurchaseHistoryRecorder [DATA_PIPELINE]
//
// Records purchase in xiigen-purchase-history with schema queryable by FLOW-07 T76.
// storeDocument BEFORE PurchaseRecorded emit (DNA-8)
// knowledgeScope: 'PRIVATE'
// Schema: { userId, eventId, tenantId, purchasedAt, purchaseAmount, eventCategory }
// SETNX idempotency on (userId + eventId + tenantId)
//
// Factories:
//   F234: IDatabaseService — purchase history records
//   F236: IQueueService — PurchaseRecorded CloudEvent

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface PurchaseHistoryInput {
  userId: string;
  eventId: string;
  tenantId: string;
  purchaseAmount: number;
  eventCategory: string;
  purchasedAt?: string;
}

export interface PurchaseHistoryResult {
  purchaseId: string;
  userId: string;
  eventId: string;
  tenantId: string;
  status: 'RECORDED';
  idempotent?: boolean;
}

export class PurchaseHistoryRecorderService {
  constructor(
    /** F234: IDatabaseService — purchase history records */
    private readonly db: IDatabaseService,
    /** F236: IQueueService — PurchaseRecorded CloudEvent */
    private readonly queue: IQueueService,
  ) {}

  async recordPurchase(
    input: PurchaseHistoryInput,
  ): Promise<DataProcessResult<PurchaseHistoryResult>> {
    const purchaseId = `purchase-${input.userId}-${input.eventId}-${input.tenantId}`;
    const purchasedAt = input.purchasedAt ?? new Date().toISOString();

    // SETNX idempotency on (userId + eventId + tenantId)
    const existingResult = await this.db.searchDocuments('xiigen-purchase-history', {
      purchaseId,
      tenantId: input.tenantId,
    });
    if (
      existingResult.isSuccess &&
      Array.isArray(existingResult.data) &&
      existingResult.data.length > 0
    ) {
      return DataProcessResult.success({
        purchaseId,
        userId: input.userId,
        eventId: input.eventId,
        tenantId: input.tenantId,
        status: 'RECORDED',
        idempotent: true,
      });
    }

    // DNA-8: storeDocument BEFORE enqueue
    const storeResult = await this.db.storeDocument(
      'xiigen-purchase-history',
      {
        purchaseId,
        userId: input.userId,
        eventId: input.eventId,
        tenantId: input.tenantId,
        purchasedAt,
        purchaseAmount: input.purchaseAmount,
        eventCategory: input.eventCategory,
        knowledgeScope: 'PRIVATE',
      },
      purchaseId,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store purchase: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    // Enqueue after store (DNA-8)
    await this.queue.enqueue('participation.purchase.recorded', {
      purchaseId,
      userId: input.userId,
      eventId: input.eventId,
      tenantId: input.tenantId,
      eventCategory: input.eventCategory,
      purchasedAt,
    });

    return DataProcessResult.success({
      purchaseId,
      userId: input.userId,
      eventId: input.eventId,
      tenantId: input.tenantId,
      status: 'RECORDED',
    });
  }
}
