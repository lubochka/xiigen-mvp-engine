// T119 ParticipationAnalyticsTracker [OBSERVABILITY]
//
// Tracks participation analytics — OBSERVABILITY pattern.
// Entire handler body in try/catch. Returns DataProcessResult.success({ tracked: false }) on error.
// Never returns failure — analytics tracking must not block the event participation pipeline.
// Aggregate counters only — no per-user participation data in stored records.
// knowledgeScope: 'GLOBAL' for aggregate metrics
//
// Factories:
//   F234: IDatabaseService — analytics record storage
//   F236: IQueueService — ParticipationTracked CloudEvent

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface ParticipationAnalyticsInput {
  tenantId: string;
  eventType: string;
  aggregatePeriod: string;
}

export interface ParticipationAnalyticsResult {
  tracked: boolean;
  aggregatePeriod?: string;
  trackedAt?: string;
}

export class ParticipationAnalyticsTrackerService {
  constructor(
    /** F234: IDatabaseService — analytics record storage */
    private readonly db: IDatabaseService,
    /** F236: IQueueService — ParticipationTracked CloudEvent */
    private readonly queue: IQueueService,
  ) {}

  async trackAnalytics(
    input: ParticipationAnalyticsInput,
  ): Promise<DataProcessResult<ParticipationAnalyticsResult>> {
    // OBSERVABILITY: entire handler in try/catch — returns success on error
    try {
      const trackedAt = new Date().toISOString();

      // DNA-8: storeDocument BEFORE enqueue
      // IR-2: aggregate only — no per-user IDs
      await this.db.storeDocument(
        'xiigen-participation-analytics',
        {
          tenantId: input.tenantId,
          eventType: input.eventType,
          aggregatePeriod: input.aggregatePeriod,
          trackedAt,
          knowledgeScope: 'GLOBAL',
        },
        `analytics-${input.eventType}-${input.aggregatePeriod}-${input.tenantId}`,
      );

      await this.queue.enqueue('participation.analytics.tracked', {
        tenantId: input.tenantId,
        eventType: input.eventType,
        aggregatePeriod: input.aggregatePeriod,
        trackedAt,
      });

      return DataProcessResult.success({
        tracked: true,
        aggregatePeriod: input.aggregatePeriod,
        trackedAt,
      });
    } catch {
      // OBSERVABILITY: return success({ tracked: false }) on any error
      return DataProcessResult.success({ tracked: false });
    }
  }
}
