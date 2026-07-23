/**
 * HistoryBootstrapOrchestrator (T604) — FLOW-45 Phase D
 *
 * Orchestrates the full history bootstrap pipeline:
 *   1. Seed arch-philosophy.json (BootstrapFromDocumentsService)
 *   2. Retrieve seeded patterns (ArchPhilosophyRetriever)
 *   3. Summarize by patternType (PhilosophyPatternSummarizer)
 *   4. Store completion record + emit HistoryBootstrapCompleted
 *
 * DNA-7: idempotent per bootstrapRunId.
 * DNA-8: storeDocument to xiigen-bootstrap-completions BEFORE enqueue.
 * DNA-3: returns DataProcessResult<T>, never throws.
 */

import { Injectable, Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../kernel/data-process-result';
import { BootstrapFromDocumentsService } from './bootstrap-from-documents.service';
import { ArchPhilosophyRetriever } from './arch-philosophy-retriever.service';
import { PhilosophyPatternSummarizer } from './philosophy-pattern-summarizer.service';

const COMPLETIONS_INDEX = 'xiigen-bootstrap-completions';
const IDEMPOTENCY_INDEX = 'xiigen-bootstrap-orchestrator-idempotency';

export interface BootstrapOrchestrationOptions {
  bootstrapRunId: string;
}

export interface BootstrapOrchestrationResult {
  bootstrapRunId: string;
  seedCount: number;
  retrievedCount: number;
  summarizedGroups: number;
  completionStatus: 'COMPLETE' | 'PARTIAL' | 'FAILED';
}

@Injectable()
export class HistoryBootstrapOrchestrator {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
    private readonly seeder: BootstrapFromDocumentsService,
    private readonly retriever: ArchPhilosophyRetriever,
    private readonly summarizer: PhilosophyPatternSummarizer,
  ) {}

  async orchestrate(
    options: BootstrapOrchestrationOptions,
  ): Promise<DataProcessResult<BootstrapOrchestrationResult>> {
    const { bootstrapRunId } = options;

    if (!bootstrapRunId) {
      return DataProcessResult.failure('MISSING_BOOTSTRAP_RUN_ID', 'bootstrapRunId is required');
    }

    try {
      // DNA-7: idempotency check
      const existing = await this.db.searchDocuments(IDEMPOTENCY_INDEX, { bootstrapRunId });
      if (existing.isSuccess && (existing.data as Array<unknown>).length > 0) {
        const record = (existing.data as Array<Record<string, unknown>>)[0];
        return DataProcessResult.success(
          record['orchestrationResult'] as BootstrapOrchestrationResult,
        );
      }

      // Step 1: Seed
      const seedResult = await this.seeder.seedArchPhilosophy();
      const seedCount = seedResult.isSuccess ? seedResult.data!.patternsSeeded : 0;

      // Step 2: Retrieve
      const retrieveResult = await this.retriever.retrieve();
      const retrievedCount = retrieveResult.isSuccess ? retrieveResult.data!.totalReturned : 0;

      // Step 3: Summarize
      let summarizedGroups = 0;
      if (retrieveResult.isSuccess && retrievedCount > 0) {
        const sumResult = await this.summarizer.summarize({
          summarizationRunId: `${bootstrapRunId}-summary`,
          patterns: retrieveResult.data!.patterns,
        });
        if (sumResult.isSuccess) {
          summarizedGroups = sumResult.data!.groupsCreated;
        }
      }

      // Determine completion status
      let completionStatus: 'COMPLETE' | 'PARTIAL' | 'FAILED';
      if (seedCount > 0 && retrievedCount > 0 && summarizedGroups > 0) {
        completionStatus = 'COMPLETE';
      } else if (seedCount > 0) {
        completionStatus = 'PARTIAL';
      } else {
        completionStatus = 'FAILED';
      }

      const orchestrationResult: BootstrapOrchestrationResult = {
        bootstrapRunId,
        seedCount,
        retrievedCount,
        summarizedGroups,
        completionStatus,
      };

      // DNA-8: store completion record BEFORE enqueue
      const completionDoc: Record<string, unknown> = {
        ...orchestrationResult,
        completedAt: new Date().toISOString(),
      };
      await this.db.storeDocument(COMPLETIONS_INDEX, completionDoc, bootstrapRunId);
      await this.db.storeDocument(
        IDEMPOTENCY_INDEX,
        { bootstrapRunId, orchestrationResult },
        bootstrapRunId,
      );

      await this.queue.enqueue('HistoryBootstrapCompleted', { bootstrapRunId, completionStatus });

      return DataProcessResult.success(orchestrationResult);
    } catch (err) {
      return DataProcessResult.failure(
        'HISTORY_BOOTSTRAP_ORCHESTRATOR_ERROR',
        `HistoryBootstrapOrchestrator threw: ${String(err)}`,
      );
    }
  }
}
