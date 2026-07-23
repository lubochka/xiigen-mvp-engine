// T115 TicketTransferHandler [DATA_PIPELINE]
// @connectionType FLOW_SCOPED
// @flowId FLOW-09
//
//
// Transfers ticket ownership from one user to another.
//
// Iron rules:
//   Both old and new owner records updated atomically
//   DNA-8: storeDocument BEFORE TicketTransferred emit
//   Idempotent by (ticketId + newUserId)
//   knowledgeScope: 'PRIVATE'

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface TicketTransferInput {
  ticketId: string;
  fromUserId: string;
  toUserId: string;
  eventId: string;
  transferReason?: string;
}

export interface TicketTransferResult {
  transferId: string;
  ticketId: string;
  fromUserId: string;
  toUserId: string;
  transferredAt: string;
}

export class TicketTransferHandler {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  async transferTicket(
    input: TicketTransferInput,
  ): Promise<DataProcessResult<TicketTransferResult>> {
    const transferId = `transfer-${input.ticketId}-${input.toUserId}`;

    // Idempotency
    const existing = await this.db.searchDocuments('ticket-transfers', { transferId });
    if (existing.isSuccess && Array.isArray(existing.data) && existing.data.length > 0) {
      const rec = existing.data[0] as Record<string, unknown>;
      return DataProcessResult.success({
        transferId,
        ticketId: input.ticketId,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        transferredAt: rec['transferredAt'] as string,
      });
    }

    // Verify ticket exists and belongs to fromUser
    const ticketResult = await this.db.searchDocuments('tickets', { ticketId: input.ticketId });
    if (
      !ticketResult.isSuccess ||
      !Array.isArray(ticketResult.data) ||
      ticketResult.data.length === 0
    ) {
      return DataProcessResult.failure('TICKET_NOT_FOUND', `Ticket ${input.ticketId} not found`);
    }

    const ticket = ticketResult.data[0] as Record<string, unknown>;
    if (ticket['userId'] !== input.fromUserId) {
      return DataProcessResult.failure(
        'TRANSFER_UNAUTHORIZED',
        'Ticket does not belong to fromUser',
      );
    }

    const transferredAt = new Date().toISOString();

    // DNA-8: storeDocument BEFORE TicketTransferred
    const storeResult = await this.db.storeDocument(
      'ticket-transfers',
      {
        transferId,
        ticketId: input.ticketId,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        eventId: input.eventId,
        transferReason: input.transferReason,
        transferredAt,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      transferId,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store transfer: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    await this.queue.enqueue('ticket.transferred', {
      transferId,
      ticketId: input.ticketId,
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      eventId: input.eventId,
      transferredAt,
    });

    return DataProcessResult.success({
      transferId,
      ticketId: input.ticketId,
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      transferredAt,
    });
  }
}
