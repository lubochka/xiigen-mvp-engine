// T110 EarlyAccessGateHandler [PROCESSING]
// @connectionType FLOW_SCOPED
// @flowId FLOW-09
//
//
// Controls early access to ticket purchase before general sale.
// DR-03-E reuse: reads GLOBAL published event aggregate.
// T112 FeeCalculator called inline (INLINE_PURE).
//
// Iron rules:
//   GLOBAL event aggregate read is intentional (DR-03-E) — not a scope violation
//   T112 FeeCalculator called inline — result stored in RevenueRecord by this handler
//   DNA-8: storeDocument BEFORE EarlyAccessGranted emit
//   knowledgeScope: 'PRIVATE' for access records

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { FeeCalculatorHandler } from './fee-calculator.handler';

export interface EarlyAccessInput {
  userId: string;
  eventId: string;
  purchaseId: string;
  grossAmount: number;
  currency: string;
  ticketTier: string;
}

export interface EarlyAccessResult {
  accessId: string;
  userId: string;
  eventId: string;
  granted: boolean;
  feeBreakdown?: Record<string, unknown>;
}

export class EarlyAccessGateHandler {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
    /** T112 FeeCalculatorHandler — inline pure, no side effects */
    private readonly feeCalculator: FeeCalculatorHandler,
  ) {}

  async checkEarlyAccess(input: EarlyAccessInput): Promise<DataProcessResult<EarlyAccessResult>> {
    const accessId = `access-${input.userId}-${input.eventId}`;

    // Read GLOBAL event aggregate (DR-03-E — intentional cross-scope read)
    const eventResult = await this.db.searchDocuments('xiigen-events-global', {
      eventId: input.eventId,
    });

    const event =
      eventResult.isSuccess && Array.isArray(eventResult.data) && eventResult.data.length > 0
        ? (eventResult.data[0] as Record<string, unknown>)
        : null;

    if (!event) {
      return DataProcessResult.failure('EVENT_NOT_FOUND', `Event ${input.eventId} not found`);
    }

    const hasEarlyAccess = event['earlyAccessEnabled'] === true;

    if (!hasEarlyAccess) {
      return DataProcessResult.success({
        accessId,
        userId: input.userId,
        eventId: input.eventId,
        granted: false,
      });
    }

    // T112 inline-pure: calculate fees without side effects
    const feeResult = await this.feeCalculator.calculate({
      grossAmount: input.grossAmount,
      currency: input.currency,
      purchaseId: input.purchaseId,
      ticketTier: input.ticketTier,
    });

    const grantedAt = new Date().toISOString();

    // DNA-8: storeDocument BEFORE event
    await this.db.storeDocument(
      'early-access-grants',
      {
        accessId,
        userId: input.userId,
        eventId: input.eventId,
        purchaseId: input.purchaseId,
        feeBreakdown: feeResult.isSuccess ? feeResult.data : null,
        grantedAt,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      accessId,
    );

    await this.queue.enqueue('early.access.granted', {
      accessId,
      userId: input.userId,
      eventId: input.eventId,
      grantedAt,
    });

    return DataProcessResult.success({
      accessId,
      userId: input.userId,
      eventId: input.eventId,
      granted: true,
      feeBreakdown: feeResult.isSuccess
        ? (feeResult.data as unknown as Record<string, unknown>)
        : undefined,
    });
  }
}
