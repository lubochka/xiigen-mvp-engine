// T118 RegistrationAnalyticsHandler [OBSERVABILITY]
// @connectionType FLOW_SCOPED
// @flowId FLOW-09
//
//
// OBSERVABILITY pattern:
//   Entire handler in try/catch.
//   Returns DataProcessResult.success() even on error (never blocks purchase path).
//   SILENT_FAILURE by design — analytics must never block ticket confirmation.
//
// Iron rules:
//   try/catch wraps entire handler body
//   Returns success even on analytics error
//   Never returns DataProcessResult.failure — analytics failure is swallowed
//   knowledgeScope: 'PRIVATE'

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface RegistrationAnalyticsInput {
  purchaseId: string;
  userId: string;
  eventId: string;
  ticketId: string;
  purchaseType: 'INDIVIDUAL' | 'GROUP';
  ticketTier: string;
  grossAmount: number;
  currency: string;
  issuedAt: string;
}

export interface RegistrationAnalyticsSummary {
  purchaseId: string;
  recorded: boolean;
  status: 'RECORDED' | 'ANALYTICS_SKIPPED';
}

export class RegistrationAnalyticsHandler {
  constructor(
    /** DATABASE FABRIC: storeDocument analytics record */
    private readonly db: IDatabaseService,
    /** QUEUE FABRIC: analytics.recorded event */
    private readonly queue: IQueueService,
  ) {}

  async recordAnalytics(
    input: RegistrationAnalyticsInput,
  ): Promise<DataProcessResult<RegistrationAnalyticsSummary>> {
    // OBSERVABILITY: entire handler in try/catch — never blocks purchase path
    try {
      const analyticsId = `analytics-${input.purchaseId}`;
      const recordedAt = new Date().toISOString();

      // DNA-8: storeDocument BEFORE event
      await this.db.storeDocument(
        'registration-analytics',
        {
          analyticsId,
          purchaseId: input.purchaseId,
          userId: input.userId,
          eventId: input.eventId,
          ticketId: input.ticketId,
          purchaseType: input.purchaseType,
          ticketTier: input.ticketTier,
          grossAmount: input.grossAmount,
          currency: input.currency,
          issuedAt: input.issuedAt,
          recordedAt,
          connectionType: 'FLOW_SCOPED',
          knowledgeScope: 'PRIVATE',
        },
        analyticsId,
      );

      await this.queue.enqueue('analytics.registration.recorded', {
        purchaseId: input.purchaseId,
        eventId: input.eventId,
        purchaseType: input.purchaseType,
        recordedAt,
      });

      return DataProcessResult.success({
        purchaseId: input.purchaseId,
        recorded: true,
        status: 'RECORDED',
      });
    } catch (_e) {
      // OBSERVABILITY: swallow error, return success — analytics must never block purchase path
      return DataProcessResult.success({
        purchaseId: input.purchaseId,
        recorded: false,
        status: 'ANALYTICS_SKIPPED',
      });
    }
  }
}
