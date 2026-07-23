/**
 * OutboxRelayService — polls xiigen-outbox for PENDING events and publishes them
 * via IQueueService, with idempotency-key deduplication (DNA-7).
 *
 * Process per message:
 *   1. Check xiigen-outbox-idempotency for the key (DNA-7 deduplication)
 *   2. enqueue(eventType, payload, idempotencyKey)
 *   3. Store idempotency record              (DNA-8: before final status update)
 *   4. Mark message PUBLISHED in outbox
 *
 * DNA-3: returns DataProcessResult, never throws.
 * DNA-7: idempotency-key deduplication for all queue consumers.
 * DNA-8: outbox — store before enqueue, then update after success.
 * Stage 2, S10.
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../kernel/data-process-result';

export interface OutboxMessage {
  messageId: string;
  eventType: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;
}

export interface RelayResult {
  processed: number;
  published: number;
  failed: number;
  deduplicated: number;
}

const OUTBOX_INDEX = 'xiigen-outbox';
const IDEMPOTENCY_INDEX = 'xiigen-outbox-idempotency';
const MAX_RETRIES = 3;

@Injectable()
export class OutboxRelayService {
  private readonly logger = new Logger(OutboxRelayService.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
  ) {}

  // ─── relayPendingMessages ──────────────────────────────────────────────────

  /**
   * Read all PENDING outbox messages and relay them to the queue.
   * Safe to call repeatedly — idempotency keys prevent double-publishing.
   */
  async relayPendingMessages(batchSize = 50): Promise<DataProcessResult<RelayResult>> {
    const pendingResult = await this.db.searchDocuments(
      OUTBOX_INDEX,
      { status: 'PENDING' },
      batchSize,
    );
    if (!pendingResult.isSuccess) {
      return DataProcessResult.failure(
        'OUTBOX_READ_FAILED',
        `Failed to read outbox: ${pendingResult.errorMessage}`,
      );
    }

    const messages = (pendingResult.data ?? []) as unknown as OutboxMessage[];
    const result: RelayResult = {
      processed: 0,
      published: 0,
      failed: 0,
      deduplicated: 0,
    };

    for (const msg of messages) {
      result.processed++;

      // DNA-7: check idempotency key before publishing
      const idempCheck = await this.db.getDocument(IDEMPOTENCY_INDEX, msg.idempotencyKey);
      if (idempCheck.isSuccess && idempCheck.data) {
        result.deduplicated++;
        await this._markPublished(msg);
        continue;
      }

      const enqueueResult = await this.queue.enqueue(
        msg.eventType,
        msg.payload,
        msg.idempotencyKey,
      );

      if (enqueueResult.isSuccess) {
        // DNA-8: store idempotency record BEFORE final status update
        await this.db.storeDocument(
          IDEMPOTENCY_INDEX,
          {
            key: msg.idempotencyKey,
            messageId: msg.messageId,
            publishedAt: new Date().toISOString(),
          },
          msg.idempotencyKey,
        );
        await this._markPublished(msg);
        result.published++;
      } else {
        await this._markFailed(msg, enqueueResult.errorMessage ?? 'enqueue failed');
        result.failed++;
      }
    }

    this.logger.log(
      `Outbox relay: processed=${result.processed} published=${result.published} ` +
        `failed=${result.failed} deduplicated=${result.deduplicated}`,
    );
    return DataProcessResult.success(result);
  }

  // ─── writeOutboxMessage ────────────────────────────────────────────────────

  /**
   * Write a message to the outbox (call this BEFORE enqueuing — DNA-8).
   * The relay loop will pick it up and publish it.
   */
  async writeOutboxMessage(
    eventType: string,
    payload: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<DataProcessResult<OutboxMessage>> {
    if (!eventType || !idempotencyKey) {
      return DataProcessResult.failure(
        'MISSING_PARAMS',
        'eventType and idempotencyKey are required',
      );
    }
    const now = new Date().toISOString();
    const msg: OutboxMessage = {
      messageId: `${eventType}::${idempotencyKey}`,
      eventType,
      payload,
      idempotencyKey,
      status: 'PENDING',
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.db.storeDocument(
      OUTBOX_INDEX,
      msg as unknown as Record<string, unknown>,
      msg.messageId,
    );
    if (!result.isSuccess) {
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    }
    return DataProcessResult.success(msg);
  }

  // ─── private helpers ───────────────────────────────────────────────────────

  private async _markPublished(msg: OutboxMessage): Promise<void> {
    const updated: Record<string, unknown> = {
      ...(msg as unknown as Record<string, unknown>),
      status: 'PUBLISHED',
      updatedAt: new Date().toISOString(),
    };
    await this.db.storeDocument(OUTBOX_INDEX, updated, msg.messageId);
  }

  private async _markFailed(msg: OutboxMessage, errorMessage: string): Promise<void> {
    const exhausted = msg.retryCount >= MAX_RETRIES - 1;
    const updated: Record<string, unknown> = {
      ...(msg as unknown as Record<string, unknown>),
      status: exhausted ? 'FAILED' : 'PENDING',
      retryCount: msg.retryCount + 1,
      errorMessage,
      updatedAt: new Date().toISOString(),
    };
    await this.db.storeDocument(OUTBOX_INDEX, updated, msg.messageId);
  }
}
