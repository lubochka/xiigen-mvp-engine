/**
 * PhilosophyPatternSummarizer (T603) — FLOW-45 Phase C
 *
 * Groups retrieved ARCH_PATTERN records by patternType and stores a
 * summary document per group to xiigen-philosophy-summaries.
 *
 * DNA-7: idempotent per summarizationRunId.
 * DNA-8: storeDocument BEFORE enqueue(PhilosophySummaryReady).
 * DNA-3: returns DataProcessResult<T>, never throws.
 */

import { Injectable, Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../kernel/data-process-result';

const SUMMARIES_INDEX = 'xiigen-philosophy-summaries';
const IDEMPOTENCY_INDEX = 'xiigen-philosophy-summarizer-idempotency';

export interface SummarizeOptions {
  summarizationRunId: string;
  patterns: Array<Record<string, unknown>>;
}

export interface SummarizeResult {
  summarizationRunId: string;
  groupsCreated: number;
  patternsProcessed: number;
}

@Injectable()
export class PhilosophyPatternSummarizer {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
  ) {}

  async summarize(options: SummarizeOptions): Promise<DataProcessResult<SummarizeResult>> {
    const { summarizationRunId, patterns } = options;

    if (!summarizationRunId) {
      return DataProcessResult.failure(
        'MISSING_SUMMARIZATION_RUN_ID',
        'summarizationRunId is required',
      );
    }

    try {
      // DNA-7: idempotency check
      const existing = await this.db.searchDocuments(IDEMPOTENCY_INDEX, { summarizationRunId });
      if (existing.isSuccess && (existing.data as Array<unknown>).length > 0) {
        const record = (existing.data as Array<Record<string, unknown>>)[0];
        return DataProcessResult.success(record['summarizeResult'] as SummarizeResult);
      }

      // Group by patternType
      const groups = new Map<string, Array<Record<string, unknown>>>();
      for (const pattern of patterns) {
        const pt = String(pattern['patternType'] ?? 'UNKNOWN');
        if (!groups.has(pt)) groups.set(pt, []);
        groups.get(pt)!.push(pattern);
      }

      // DNA-8: storeDocument per group BEFORE enqueue
      for (const [patternType, groupPatterns] of groups) {
        const summaryDoc: Record<string, unknown> = {
          summarizationRunId,
          patternType,
          patternCount: groupPatterns.length,
          patternIds: groupPatterns.map((p) => p['patternId']),
          summarizedAt: new Date().toISOString(),
          knowledgeScope: 'GLOBAL',
        };
        await this.db.storeDocument(
          SUMMARIES_INDEX,
          summaryDoc,
          `${summarizationRunId}-${patternType}`,
        );
      }

      const summarizeResult: SummarizeResult = {
        summarizationRunId,
        groupsCreated: groups.size,
        patternsProcessed: patterns.length,
      };

      // DNA-8: store idempotency record BEFORE enqueue
      await this.db.storeDocument(
        IDEMPOTENCY_INDEX,
        { summarizationRunId, summarizeResult },
        summarizationRunId,
      );

      // Emit event
      await this.queue.enqueue('PhilosophySummaryReady', {
        summarizationRunId,
        groupsCreated: groups.size,
      });

      return DataProcessResult.success(summarizeResult);
    } catch (err) {
      return DataProcessResult.failure(
        'PHILOSOPHY_PATTERN_SUMMARIZER_ERROR',
        `PhilosophyPatternSummarizer threw: ${String(err)}`,
      );
    }
  }
}
