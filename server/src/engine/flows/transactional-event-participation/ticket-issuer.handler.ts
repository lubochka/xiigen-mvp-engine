// T102 QRCodeGeneratorHandler / TicketIssuerHandler [DATA_PIPELINE]
// @connectionType FLOW_SCOPED
// @flowId FLOW-09
//
//
// PLATFORM_ONLY_QR pattern (CF-09-6):
//   F275 QR token generation is PLATFORM-ONLY — no tenant factory swap.
//   QR token integrity is a security primitive.
//
// PLAN_EXEMPLAR guard: T102 → T63 backward cross-wave route carries NOT_PLAN_EXEMPLAR guard.
//   This prevents phantom T63 PLAN_EXEMPLAR entries from FLOW-04 scaffolding being matched.
//
// Iron rules:
//   DNA-8: storeDocument TicketRecord BEFORE TicketIssued emit
//   Backward cross-wave: TicketIssued → FLOW-04 T63 RSVPOrchestrator (NOT_PLAN_EXEMPLAR guard)
//   Idempotent by (purchaseId, ticketTier)
//   F275 PLATFORM-ONLY (not tenant-configurable)
//   knowledgeScope: 'PRIVATE'

import { DataProcessResult } from '../../../kernel/data-process-result';

interface IQrService {
  generate(params: Record<string, unknown>): Promise<{
    isSuccess: boolean;
    errorCode?: string;
    errorMessage?: string;
    data?: Record<string, unknown>;
  }>;
}
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface TicketIssuanceInput {
  purchaseId: string;
  userId: string;
  eventId: string;
  ticketTier: string;
  paymentId: string;
  purchaseType: 'INDIVIDUAL' | 'GROUP';
}

export interface TicketIssuanceResult {
  ticketId: string;
  purchaseId: string;
  qrToken: string;
  issuedAt: string;
}

export class TicketIssuerHandler {
  constructor(
    /** F275: IQRService — PLATFORM-ONLY QR token generation */

    private readonly qrService: IQrService,
    /** DATABASE FABRIC: storeDocument */
    private readonly db: IDatabaseService,
    /** QUEUE FABRIC: TicketIssued CloudEvent → FLOW-04 T63 (backward cross-wave) */
    private readonly queue: IQueueService,
  ) {}

  async issueTicket(input: TicketIssuanceInput): Promise<DataProcessResult<TicketIssuanceResult>> {
    // Idempotency: content-addressed by (purchaseId, ticketTier)
    const ticketId = `ticket-${input.purchaseId}-${input.ticketTier}`;

    const existingResult = await this.db.searchDocuments('tickets', { ticketId });
    if (
      existingResult.isSuccess &&
      Array.isArray(existingResult.data) &&
      existingResult.data.length > 0
    ) {
      const existing = existingResult.data[0] as Record<string, unknown>;
      return DataProcessResult.success({
        ticketId,
        purchaseId: input.purchaseId,
        qrToken: existing['qrToken'] as string,
        issuedAt: existing['issuedAt'] as string,
      });
    }

    // F275 PLATFORM-ONLY: generate QR token via platform QR service
    const qrResult = await this.qrService.generate({
      ticketId,
      eventId: input.eventId,
      userId: input.userId,
    });

    if (!qrResult.isSuccess) {
      return DataProcessResult.failure(
        'QR_GENERATION_FAILED',
        qrResult.errorMessage ?? 'QR generation failed',
      );
    }

    const qrToken = qrResult.data?.['token'] as string;
    const issuedAt = new Date().toISOString();

    // DNA-8: storeDocument BEFORE TicketIssued emit (backward cross-wave)
    const storeResult = await this.db.storeDocument(
      'tickets',
      {
        ticketId,
        purchaseId: input.purchaseId,
        userId: input.userId,
        eventId: input.eventId,
        ticketTier: input.ticketTier,
        paymentId: input.paymentId,
        purchaseType: input.purchaseType,
        qrToken,
        status: 'ACTIVE',
        checkedIn: false,
        issuedAt,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      ticketId,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store ticket: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    // TicketIssued → backward cross-wave to FLOW-04 T63 (NOT_PLAN_EXEMPLAR guard applied at routing)
    await this.queue.enqueue('ticket.issued', {
      ticketId,
      purchaseId: input.purchaseId,
      userId: input.userId,
      eventId: input.eventId,
      issuedAt,
      // Downstream payload for FLOW-04 T63 RSVPOrchestrator
      purchaseType: input.purchaseType,
    });

    // TicketPurchaseCompleted for FLOW-10 (Social) and FLOW-13 (Analytics)
    await this.queue.enqueue('ticket.purchase.completed', {
      ticketId,
      purchaseId: input.purchaseId,
      userId: input.userId,
      eventId: input.eventId,
      purchaseType: input.purchaseType,
      ticketIssuedAt: issuedAt,
      checkedIn: false,
    });

    return DataProcessResult.success({
      ticketId,
      purchaseId: input.purchaseId,
      qrToken,
      issuedAt,
    });
  }
}
