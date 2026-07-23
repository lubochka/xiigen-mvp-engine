// T103 QRCodeValidatorHandler [VALIDATION]
// @connectionType FLOW_SCOPED
// @flowId FLOW-09
//
//
// PLATFORM_ONLY_QR (CF-09-6): F275 validation is PLATFORM-ONLY.
//
// Iron rules:
//   F275 PLATFORM-ONLY validation — tenants cannot inject custom validator
//   Validates ticket status is CONFIRMED before redemption (UPSTREAM-EVENT-NOT-TRIGGER-001)
//   DNA-3: validation failure returns DataProcessResult.failure — never throws
//   knowledgeScope: 'PRIVATE'

import { DataProcessResult } from '../../../kernel/data-process-result';

interface IQrService {
  validate(params: Record<string, unknown>): Promise<{
    isSuccess: boolean;
    errorCode?: string;
    errorMessage?: string;
    data?: Record<string, unknown>;
  }>;
}
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface QRCodeValidationInput {
  qrToken: string;
  eventId: string;
  scannedAt: string;
}

export interface QRCodeValidationResult {
  valid: boolean;
  ticketId: string;
  userId: string;
  reason?: string;
}

export class QRCodeValidatorHandler {
  constructor(
    /** F275: IQRService — PLATFORM-ONLY QR validation */

    private readonly qrService: IQrService,
    /** DATABASE FABRIC: read ticket record */
    private readonly db: IDatabaseService,
    /** QUEUE FABRIC: ticket.validated event */
    private readonly queue: IQueueService,
  ) {}

  async validateQRCode(
    input: QRCodeValidationInput,
  ): Promise<DataProcessResult<QRCodeValidationResult>> {
    // F275 PLATFORM-ONLY: validate token integrity
    const tokenResult = await this.qrService.validate({
      token: input.qrToken,
      eventId: input.eventId,
    });

    if (!tokenResult.isSuccess) {
      return DataProcessResult.failure(
        'QR_VALIDATION_FAILED',
        tokenResult.errorMessage ?? 'QR token validation failed',
      );
    }

    const ticketId = tokenResult.data?.['ticketId'] as string;
    const userId = tokenResult.data?.['userId'] as string;

    // Verify ticket status is ACTIVE (CONFIRMED) — UPSTREAM-EVENT-NOT-TRIGGER-001
    const ticketResult = await this.db.searchDocuments('tickets', { ticketId });
    if (
      !ticketResult.isSuccess ||
      !Array.isArray(ticketResult.data) ||
      ticketResult.data.length === 0
    ) {
      return DataProcessResult.failure('TICKET_NOT_FOUND', `Ticket ${ticketId} not found`);
    }

    const ticket = ticketResult.data[0] as Record<string, unknown>;
    if (ticket['status'] !== 'ACTIVE') {
      return DataProcessResult.success({
        valid: false,
        ticketId,
        userId,
        reason: `Ticket status: ${ticket['status']}`,
      });
    }

    if (ticket['checkedIn'] === true) {
      return DataProcessResult.success({
        valid: false,
        ticketId,
        userId,
        reason: 'ALREADY_CHECKED_IN',
      });
    }

    // DNA-8: storeDocument BEFORE event
    await this.db.storeDocument(
      'ticket-validations',
      {
        ticketId,
        userId,
        eventId: input.eventId,
        scannedAt: input.scannedAt,
        valid: true,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      `val-${ticketId}-${input.scannedAt}`,
    );

    await this.queue.enqueue('ticket.validated', {
      ticketId,
      userId,
      eventId: input.eventId,
      scannedAt: input.scannedAt,
    });

    return DataProcessResult.success({ valid: true, ticketId, userId });
  }
}
