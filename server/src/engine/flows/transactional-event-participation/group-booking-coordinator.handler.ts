// T108 GroupBookingCoordinatorHandler [ORCHESTRATION]
// @connectionType FLOW_SCOPED
// @flowId FLOW-09
//
//
// ALL_OR_NOTHING_GROUP pattern (CF-09-4):
//   ALL group ticket issuances in ONE db.transaction().
//   Any member failure triggers full rollback — no partial success.
//   SILENT_FAILURE: loop outside transaction compiles; partial success only visible under production failure.
//
// Iron rules:
//   ALL issuances inside db.transaction() — BUILD_FAILURE if loop is outside
//   GroupBookingCompleted emitted only after all members confirmed
//   DNA-8: storeDocument BEFORE GroupBookingCompleted
//   knowledgeScope: 'PRIVATE'

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

interface ITransactionalDb {
  searchDocuments(
    index: string,
    filter: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: unknown }>;
  storeDocument(
    index: string,
    doc: Record<string, unknown>,
    id?: string,
  ): Promise<{ isSuccess: boolean; errorCode?: string; errorMessage?: string }>;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

export interface GroupMember {
  userId: string;
  ticketTier: string;
}

export interface GroupBookingInput {
  groupId: string;
  organizerId: string;
  eventId: string;
  members: GroupMember[];
  purchaseId: string;
}

export interface GroupBookingResult {
  groupId: string;
  purchaseId: string;
  ticketCount: number;
  status: 'CONFIRMED';
  completedAt: string;
}

export class GroupBookingCoordinatorHandler {
  constructor(
    /** DATABASE FABRIC: transaction + storeDocument */
    private readonly db: ITransactionalDb,
    /** QUEUE FABRIC: GroupBookingCompleted CloudEvent */
    private readonly queue: IQueueService,
  ) {}

  async coordinateGroupBooking(
    input: GroupBookingInput,
  ): Promise<DataProcessResult<GroupBookingResult>> {
    // Idempotency
    const existing = await this.db.searchDocuments('group-bookings', { groupId: input.groupId });
    if (existing.isSuccess && Array.isArray(existing.data) && existing.data.length > 0) {
      const rec = existing.data[0] as Record<string, unknown>;
      return DataProcessResult.success({
        groupId: input.groupId,
        purchaseId: input.purchaseId,
        ticketCount: rec['ticketCount'] as number,
        status: 'CONFIRMED',
        completedAt: rec['completedAt'] as string,
      });
    }

    // CF-09-4: ALL_OR_NOTHING_GROUP — all issuances in ONE transaction
    // Any member failure triggers full rollback
    let issuedTickets: Record<string, unknown>[];
    try {
      issuedTickets = await this.db.transaction(async () => {
        const tickets: Record<string, unknown>[] = [];
        for (const member of input.members) {
          const ticketId = `ticket-${input.purchaseId}-${member.userId}`;
          const storeResult = await this.db.storeDocument(
            'tickets',
            {
              ticketId,
              purchaseId: input.purchaseId,
              userId: member.userId,
              eventId: input.eventId,
              ticketTier: member.ticketTier,
              groupId: input.groupId,
              status: 'ACTIVE',
              checkedIn: false,
              issuedAt: new Date().toISOString(),
              connectionType: 'FLOW_SCOPED',
              knowledgeScope: 'PRIVATE',
            },
            ticketId,
          );
          if (!storeResult.isSuccess) {
            return Promise.reject(
              Error(
                `Member ${member.userId} ticket issuance failed: ${storeResult.errorMessage ?? 'unknown'}`,
              ),
            );
          }
          tickets.push({ ticketId, userId: member.userId });
        }
        return tickets;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Group booking transaction failed';
      return DataProcessResult.failure('GROUP_BOOKING_FAILED', msg);
    }

    const completedAt = new Date().toISOString();

    // DNA-8: storeDocument BEFORE GroupBookingCompleted
    const storeResult = await this.db.storeDocument(
      'group-bookings',
      {
        groupId: input.groupId,
        purchaseId: input.purchaseId,
        organizerId: input.organizerId,
        eventId: input.eventId,
        ticketCount: issuedTickets.length,
        memberCount: input.members.length,
        status: 'CONFIRMED',
        completedAt,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      input.groupId,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store group booking: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    await this.queue.enqueue('group.booking.completed', {
      groupId: input.groupId,
      purchaseId: input.purchaseId,
      eventId: input.eventId,
      ticketCount: issuedTickets.length,
      completedAt,
    });

    return DataProcessResult.success({
      groupId: input.groupId,
      purchaseId: input.purchaseId,
      ticketCount: issuedTickets.length,
      status: 'CONFIRMED',
      completedAt,
    });
  }
}
