// T114 WaitlistNotifierHandler [PROCESSING]
// @connectionType FLOW_SCOPED
// @flowId FLOW-09
//
//
// Notifies waitlisted users when capacity opens.
// F284: PLATFORM-ONLY compliance queue — also used for notifications here.
//
// Iron rules:
//   Notification failure MUST NOT propagate (best-effort)
//   DNA-8: storeDocument BEFORE WaitlistNotified emit
//   knowledgeScope: 'PRIVATE'

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface WaitlistNotificationInput {
  eventId: string;
  ticketTier: string;
  availableCount: number;
}

export interface WaitlistNotificationResult {
  notifiedCount: number;
  eventId: string;
}

export class WaitlistNotifierHandler {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  async notifyWaitlist(
    input: WaitlistNotificationInput,
  ): Promise<DataProcessResult<WaitlistNotificationResult>> {
    // Get FIFO waitlist entries
    const waitlistResult = await this.db.searchDocuments('waitlist-entries', {
      eventId: input.eventId,
      ticketTier: input.ticketTier,
      status: 'WAITLISTED',
    });

    if (!waitlistResult.isSuccess || !Array.isArray(waitlistResult.data)) {
      return DataProcessResult.success({ notifiedCount: 0, eventId: input.eventId });
    }

    // Sort FIFO by joinedAt
    const entries = (waitlistResult.data as Record<string, unknown>[])
      .sort((a, b) => {
        const aTime = new Date(a['joinedAt'] as string).getTime();
        const bTime = new Date(b['joinedAt'] as string).getTime();
        return aTime - bTime;
      })
      .slice(0, input.availableCount);

    let notifiedCount = 0;
    const notifiedAt = new Date().toISOString();

    for (const entry of entries) {
      const notificationId = `notif-${entry['waitlistId'] as string}`;

      // DNA-8: storeDocument BEFORE event
      await this.db.storeDocument(
        'waitlist-notifications',
        {
          notificationId,
          waitlistId: entry['waitlistId'],
          userId: entry['userId'],
          eventId: input.eventId,
          ticketTier: input.ticketTier,
          notifiedAt,
          connectionType: 'FLOW_SCOPED',
          knowledgeScope: 'PRIVATE',
        },
        notificationId,
      );

      await this.queue.enqueue('waitlist.notified', {
        notificationId,
        userId: entry['userId'],
        eventId: input.eventId,
        waitlistId: entry['waitlistId'],
        notifiedAt,
      });

      notifiedCount++;
    }

    return DataProcessResult.success({ notifiedCount, eventId: input.eventId });
  }
}
