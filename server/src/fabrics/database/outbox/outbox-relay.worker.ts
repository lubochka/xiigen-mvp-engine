// file: server/src/fabrics/database/outbox/outbox-relay.worker.ts
// EP-5 Outbox relay background worker — polls and delivers pending outbox records.

import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  TRANSACTIONAL_OUTBOX_RELAY,
  ITransactionalOutboxRelay,
} from './transactional-outbox-relay.interface';
import { QUEUE_SERVICE, IQueueService } from '../../interfaces/queue.interface';

const BATCH_SIZE = 50;

@Injectable()
export class OutboxRelayWorker {
  private readonly logger = new Logger(OutboxRelayWorker.name);

  constructor(
    @Inject(TRANSACTIONAL_OUTBOX_RELAY)
    private readonly outboxRelay: ITransactionalOutboxRelay,
    @Inject(QUEUE_SERVICE)
    private readonly queue: IQueueService,
  ) {}

  async processOutbox(): Promise<void> {
    const records = await this.outboxRelay.getUndeliveredOutbox(BATCH_SIZE);

    for (const record of records) {
      try {
        await this.queue.enqueue(record.eventType, record.payload);
        await this.outboxRelay.markDelivered(record.id);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await this.outboxRelay.markFailed(record.id, errorMsg);
        this.logger.warn(`OutboxRelayWorker: failed to deliver ${record.id}: ${errorMsg}`);
      }
    }
  }
}
