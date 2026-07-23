// T102 QRCodeGeneratorHandler [DATA_PIPELINE]
// @connectionType FLOW_SCOPED
// @flowId FLOW-09
//
//
// PLATFORM_ONLY_QR (CF-09-6): F275 is PLATFORM-ONLY — no tenant factory swap.
// PLAN_EXEMPLAR guard on T102→T63 backward cross-wave route.
//
// Iron rules:
//   F275 PLATFORM-ONLY — no IExternalServiceFactory.createAsync() for QR
//   DNA-8: storeDocument QR record BEFORE event
//   Backward cross-wave: TicketIssued → FLOW-04 T63 (NOT_PLAN_EXEMPLAR guard)
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

export interface QRCodeGenerationInput {
  ticketId: string;
  userId: string;
  eventId: string;
  purchaseId: string;
}

export interface QRCodeGenerationResult {
  ticketId: string;
  qrToken: string;
  generatedAt: string;
}

export class QRCodeGeneratorHandler {
  constructor(
    /** F275: IQRService — PLATFORM-ONLY (not tenant-configurable) */

    private readonly qrService: IQrService,
    /** DATABASE FABRIC: storeDocument */
    private readonly db: IDatabaseService,
    /** QUEUE FABRIC: ticket.qr.generated event */
    private readonly queue: IQueueService,
  ) {}

  async generateQRCode(
    input: QRCodeGenerationInput,
  ): Promise<DataProcessResult<QRCodeGenerationResult>> {
    // Idempotency: one QR token per ticketId
    const existing = await this.db.searchDocuments('ticket-qr-codes', { ticketId: input.ticketId });
    if (existing.isSuccess && Array.isArray(existing.data) && existing.data.length > 0) {
      const rec = existing.data[0] as Record<string, unknown>;
      return DataProcessResult.success({
        ticketId: input.ticketId,
        qrToken: rec['qrToken'] as string,
        generatedAt: rec['generatedAt'] as string,
      });
    }

    // F275 PLATFORM-ONLY: generate via platform QR service
    const qrResult = await this.qrService.generate({
      ticketId: input.ticketId,
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
    const generatedAt = new Date().toISOString();

    // DNA-8: storeDocument BEFORE event
    const storeResult = await this.db.storeDocument(
      'ticket-qr-codes',
      {
        ticketId: input.ticketId,
        purchaseId: input.purchaseId,
        userId: input.userId,
        eventId: input.eventId,
        qrToken,
        generatedAt,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      input.ticketId,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store QR record: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    await this.queue.enqueue('ticket.qr.generated', {
      ticketId: input.ticketId,
      purchaseId: input.purchaseId,
      generatedAt,
    });

    return DataProcessResult.success({ ticketId: input.ticketId, qrToken, generatedAt });
  }
}
