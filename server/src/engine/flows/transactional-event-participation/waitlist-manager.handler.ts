// T106 WaitlistManagerHandler [PROCESSING]
// @connectionType FLOW_SCOPED
// @flowId FLOW-09
//
//
// DR-04-B reuse: FIFO waitlist by joinTimestamp
//
// Iron rules:
//   FIFO by joinTimestamp — same enforcement as T64 (FLOW-04)
//   DNA-8: storeDocument BEFORE WaitlistJoined emit
//   knowledgeScope: 'PRIVATE'

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface WaitlistInput {
  purchaseId: string;
  userId: string;
  eventId: string;
  ticketTier: string;
}

export interface WaitlistResult {
  waitlistId: string;
  purchaseId: string;
  position: number;
  status: 'WAITLISTED';
  joinedAt: string;
}

export class WaitlistManagerHandler {
  constructor(
    /** DATABASE FABRIC: storeDocument + searchDocuments */
    private readonly db: IDatabaseService,
    /** QUEUE FABRIC: WaitlistJoined CloudEvent */
    private readonly queue: IQueueService,
  ) {}

  async joinWaitlist(input: WaitlistInput): Promise<DataProcessResult<WaitlistResult>> {
    const waitlistId = `wait-${input.purchaseId}`;

    // Idempotency
    const existing = await this.db.searchDocuments('waitlist-entries', { waitlistId });
    if (existing.isSuccess && Array.isArray(existing.data) && existing.data.length > 0) {
      const rec = existing.data[0] as Record<string, unknown>;
      return DataProcessResult.success({
        waitlistId,
        purchaseId: input.purchaseId,
        position: rec['position'] as number,
        status: 'WAITLISTED',
        joinedAt: rec['joinedAt'] as string,
      });
    }

    // FIFO position by joinTimestamp
    const currentQueue = await this.db.searchDocuments('waitlist-entries', {
      eventId: input.eventId,
      ticketTier: input.ticketTier,
      status: 'WAITLISTED',
    });
    const position =
      currentQueue.isSuccess && Array.isArray(currentQueue.data) ? currentQueue.data.length + 1 : 1;

    const joinedAt = new Date().toISOString();

    // DNA-8: storeDocument BEFORE WaitlistJoined
    const storeResult = await this.db.storeDocument(
      'waitlist-entries',
      {
        waitlistId,
        purchaseId: input.purchaseId,
        userId: input.userId,
        eventId: input.eventId,
        ticketTier: input.ticketTier,
        position,
        joinedAt,
        status: 'WAITLISTED',
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      waitlistId,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store waitlist entry: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    await this.queue.enqueue('waitlist.joined', {
      waitlistId,
      purchaseId: input.purchaseId,
      userId: input.userId,
      eventId: input.eventId,
      position,
      joinedAt,
    });

    return DataProcessResult.success({
      waitlistId,
      purchaseId: input.purchaseId,
      position,
      status: 'WAITLISTED',
      joinedAt,
    });
  }
}
