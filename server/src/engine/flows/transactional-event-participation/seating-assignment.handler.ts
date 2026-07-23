// T117 SeatingAssignmentHandler [DATA_PIPELINE]
// @connectionType FLOW_SCOPED
// @flowId FLOW-09
//
//
// Assigns specific seats to ticket holders.
//
// Iron rules:
//   Seat assignment must be idempotent (ticketId + seatId)
//   DNA-8: storeDocument BEFORE SeatAssigned emit
//   knowledgeScope: 'PRIVATE'

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface SeatingAssignmentInput {
  ticketId: string;
  userId: string;
  eventId: string;
  seatId: string;
  section: string;
  row: string;
}

export interface SeatingAssignmentResult {
  assignmentId: string;
  ticketId: string;
  seatId: string;
  section: string;
  row: string;
  assignedAt: string;
}

export class SeatingAssignmentHandler {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  async assignSeat(
    input: SeatingAssignmentInput,
  ): Promise<DataProcessResult<SeatingAssignmentResult>> {
    const assignmentId = `assign-${input.ticketId}-${input.seatId}`;

    // Idempotency
    const existing = await this.db.searchDocuments('seat-assignments', { assignmentId });
    if (existing.isSuccess && Array.isArray(existing.data) && existing.data.length > 0) {
      const rec = existing.data[0] as Record<string, unknown>;
      return DataProcessResult.success({
        assignmentId,
        ticketId: input.ticketId,
        seatId: input.seatId,
        section: input.section,
        row: input.row,
        assignedAt: rec['assignedAt'] as string,
      });
    }

    // Verify seat not already assigned
    const seatCheck = await this.db.searchDocuments('seat-assignments', {
      seatId: input.seatId,
      eventId: input.eventId,
    });
    if (seatCheck.isSuccess && Array.isArray(seatCheck.data) && seatCheck.data.length > 0) {
      return DataProcessResult.failure(
        'SEAT_ALREADY_ASSIGNED',
        `Seat ${input.seatId} already assigned`,
      );
    }

    const assignedAt = new Date().toISOString();

    // DNA-8: storeDocument BEFORE event
    const storeResult = await this.db.storeDocument(
      'seat-assignments',
      {
        assignmentId,
        ticketId: input.ticketId,
        userId: input.userId,
        eventId: input.eventId,
        seatId: input.seatId,
        section: input.section,
        row: input.row,
        assignedAt,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      assignmentId,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store assignment: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    await this.queue.enqueue('seat.assigned', {
      assignmentId,
      ticketId: input.ticketId,
      userId: input.userId,
      eventId: input.eventId,
      seatId: input.seatId,
      assignedAt,
    });

    return DataProcessResult.success({
      assignmentId,
      ticketId: input.ticketId,
      seatId: input.seatId,
      section: input.section,
      row: input.row,
      assignedAt,
    });
  }
}
