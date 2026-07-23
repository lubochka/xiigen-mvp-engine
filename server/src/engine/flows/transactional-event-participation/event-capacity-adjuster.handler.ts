// T116 EventCapacityAdjusterHandler [PROCESSING]
// @connectionType FLOW_SCOPED
// @flowId FLOW-09
//
//
// Adjusts event capacity (e.g., venue change, organizer request).
// DR-04-A reuse: atomic capacity operations.
//
// Iron rules:
//   Capacity adjustments must not create negative available seats
//   DNA-8: storeDocument BEFORE CapacityAdjusted emit
//   FREEDOM: capacity adjustment requires approval workflow (flow09_capacity_change_requires_approval)
//   knowledgeScope: 'PRIVATE'

import { DataProcessResult } from '../../../kernel/data-process-result';
import type { IFreedomConfigService } from '../../../freedom/freedom-config.interface';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface CapacityAdjustmentInput {
  eventId: string;
  ticketTier: string;
  newCapacity: number;
  adjustmentReason: string;
  requestedBy: string;
}

export interface CapacityAdjustmentResult {
  adjustmentId: string;
  eventId: string;
  previousCapacity: number;
  newCapacity: number;
  status: 'APPLIED' | 'PENDING_APPROVAL';
}

export class EventCapacityAdjusterHandler {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,

    private readonly freedom: IFreedomConfigService,
  ) {}

  async adjustCapacity(
    input: CapacityAdjustmentInput,
  ): Promise<DataProcessResult<CapacityAdjustmentResult>> {
    const adjustmentId = `adj-${input.eventId}-${Date.now()}`;

    // Check if approval required from FREEDOM config
    const approvalConfig = await this.freedom.get('flow09_capacity_change_requires_approval');
    const requiresApproval: boolean =
      typeof approvalConfig?.['flow09_capacity_change_requires_approval'] === 'boolean'
        ? (approvalConfig['flow09_capacity_change_requires_approval'] as boolean)
        : false;

    // Read current capacity
    const capacityId = `capacity-${input.eventId}-${input.ticketTier}`;
    const currentResult = await this.db.searchDocuments('event-capacity', { capacityId });
    const previousCapacity: number =
      currentResult.isSuccess && Array.isArray(currentResult.data) && currentResult.data.length > 0
        ? (((currentResult.data[0] as Record<string, unknown>)['totalCapacity'] as number) ?? 0)
        : 0;

    const status = requiresApproval ? 'PENDING_APPROVAL' : 'APPLIED';
    const adjustedAt = new Date().toISOString();

    // DNA-8: storeDocument BEFORE event
    const storeResult = await this.db.storeDocument(
      'capacity-adjustments',
      {
        adjustmentId,
        eventId: input.eventId,
        ticketTier: input.ticketTier,
        previousCapacity,
        newCapacity: input.newCapacity,
        adjustmentReason: input.adjustmentReason,
        requestedBy: input.requestedBy,
        status,
        adjustedAt,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      adjustmentId,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store adjustment: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    await this.queue.enqueue('capacity.adjusted', {
      adjustmentId,
      eventId: input.eventId,
      ticketTier: input.ticketTier,
      previousCapacity,
      newCapacity: input.newCapacity,
      status,
      adjustedAt,
    });

    return DataProcessResult.success({
      adjustmentId,
      eventId: input.eventId,
      previousCapacity,
      newCapacity: input.newCapacity,
      status,
    });
  }
}
