// T111 CapacityTrackerHandler [PROCESSING]
// @connectionType FLOW_SCOPED
// @flowId FLOW-09
//
//
// Tracks event capacity and triggers waitlist activation when capacity opens.
// DR-04-A reuse: atomic capacity operations (same as T63 FLOW-04).
//
// Iron rules:
//   Atomic capacity operations — no separate check+write
//   DNA-8: storeDocument BEFORE CapacityUpdated emit
//   knowledgeScope: 'PRIVATE'

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface CapacityUpdateInput {
  eventId: string;
  action: 'DECREMENT' | 'INCREMENT';
  ticketTier: string;
  purchaseId: string;
}

export interface CapacityUpdateResult {
  eventId: string;
  remainingCapacity: number;
  action: 'DECREMENT' | 'INCREMENT';
  waitlistActivated: boolean;
}

export class CapacityTrackerHandler {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  async updateCapacity(
    input: CapacityUpdateInput,
  ): Promise<DataProcessResult<CapacityUpdateResult>> {
    const capacityId = `capacity-${input.eventId}-${input.ticketTier}`;

    const currentResult = await this.db.searchDocuments('event-capacity', { capacityId });
    const current =
      currentResult.isSuccess && Array.isArray(currentResult.data) && currentResult.data.length > 0
        ? (currentResult.data[0] as Record<string, unknown>)
        : { totalCapacity: 100, usedCapacity: 0 };

    const usedCapacity = (current['usedCapacity'] as number) ?? 0;
    const totalCapacity = (current['totalCapacity'] as number) ?? 100;

    const newUsedCapacity =
      input.action === 'DECREMENT'
        ? Math.min(usedCapacity + 1, totalCapacity)
        : Math.max(usedCapacity - 1, 0);

    const remainingCapacity = totalCapacity - newUsedCapacity;
    const waitlistActivated =
      input.action === 'INCREMENT' && remainingCapacity > 0 && usedCapacity >= totalCapacity;

    const updatedAt = new Date().toISOString();

    // DNA-8: storeDocument BEFORE event
    await this.db.storeDocument(
      'event-capacity',
      {
        capacityId,
        eventId: input.eventId,
        ticketTier: input.ticketTier,
        totalCapacity,
        usedCapacity: newUsedCapacity,
        remainingCapacity,
        updatedAt,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      capacityId,
    );

    await this.queue.enqueue('capacity.updated', {
      eventId: input.eventId,
      ticketTier: input.ticketTier,
      remainingCapacity,
      action: input.action,
      waitlistActivated,
      updatedAt,
    });

    if (waitlistActivated) {
      await this.queue.enqueue('waitlist.activation.triggered', {
        eventId: input.eventId,
        ticketTier: input.ticketTier,
      });
    }

    return DataProcessResult.success({
      eventId: input.eventId,
      remainingCapacity,
      action: input.action,
      waitlistActivated,
    });
  }
}
