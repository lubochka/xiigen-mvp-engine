/**
 * RagQualityUpdater (T595) — FLOW-38 Phase B
 *
 * Applies a qualityScore delta to each RAG pattern retrieved during a completed cycle.
 * SUCCESS_WITHIN_BUDGET → +0.05 delta; WASTED_CYCLE → -0.05 delta.
 *
 * Iron rules:
 *   CF-801: (cycleId, patternId) idempotency check FIRST — before any delta write.
 *   CF-802: cycleId reference stored with every quality update record.
 *   MACHINE delta=±0.05: delta magnitude is fixed; FREEDOM config cannot change it.
 *   MACHINE clamp=[0.0,1.0]: qualityScore clamped after delta; never negative, never >1.0.
 *   DNA-7: idempotency key = (cycleId + patternId).
 *   DNA-8: storeDocument(update batch record) BEFORE enqueue(PatternQualityUpdated).
 *   DNA-3: returns DataProcessResult<T>, never throws.
 *   DNA-5: tenantId from context — not passed to fabric methods.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';
import type { CycleOutcome } from './cycle-outcome-classifier.service';

const RAG_INDEX = 'xiigen-rag-patterns';
const IDEMPOTENCY_INDEX = 'xiigen-rag-quality-updates';

/** MACHINE: qualityScore delta magnitude — FREEDOM config cannot override this. */
const DELTA_MAGNITUDE = 0.05;

/** MACHINE: qualityScore clamp boundaries. */
const SCORE_FLOOR = 0.0;
const SCORE_CEILING = 1.0;

export interface UpdateOptions {
  cycleId: string;
  patternIds: string[];
  outcome: Extract<CycleOutcome, 'SUCCESS_WITHIN_BUDGET' | 'WASTED_CYCLE'>;
}

export interface UpdateResult {
  cycleId: string;
  updatedCount: number;
  skippedCount: number;
  clampedCount: number;
}

@Injectable()
export class RagQualityUpdater {
  private readonly logger = new Logger(RagQualityUpdater.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
  ) {}

  async update(options: UpdateOptions): Promise<DataProcessResult<UpdateResult>> {
    try {
      const { cycleId, patternIds, outcome } = options;

      if (!cycleId) {
        return DataProcessResult.failure('MISSING_CYCLE_ID', 'cycleId is required');
      }
      if (!patternIds || patternIds.length === 0) {
        return DataProcessResult.failure('NO_PATTERN_IDS', 'patternIds must be non-empty');
      }

      const delta = outcome === 'SUCCESS_WITHIN_BUDGET' ? DELTA_MAGNITUDE : -DELTA_MAGNITUDE;

      let updatedCount = 0;
      let skippedCount = 0;
      let clampedCount = 0;

      for (const patternId of patternIds) {
        // CF-801: (cycleId, patternId) idempotency check FIRST — before any read or write
        const idempotencyKey = `${cycleId}::${patternId}`;
        const idempotencyCheck = await this.db.searchDocuments(
          IDEMPOTENCY_INDEX,
          { idempotencyKey },
          1,
        );
        if (idempotencyCheck.isSuccess && (idempotencyCheck.data ?? []).length > 0) {
          this.logger.log(`RagQualityUpdater: DUPLICATE_UPDATE_BLOCKED for key=${idempotencyKey}`);
          skippedCount++;
          continue;
        }

        // Read current pattern qualityScore
        const patternResult = await this.db.searchDocuments(RAG_INDEX, { patternId }, 1);
        const patternRecord = patternResult.isSuccess
          ? ((patternResult.data ?? [])[0] as Record<string, unknown> | undefined)
          : undefined;

        const currentScore =
          typeof patternRecord?.['qualityScore'] === 'number'
            ? (patternRecord['qualityScore'] as number)
            : 0.5; // default if pattern not found

        let newScore = currentScore + delta;
        let clamped = false;

        // MACHINE clamp: [0.0, 1.0]
        if (newScore < SCORE_FLOOR) {
          newScore = SCORE_FLOOR;
          clamped = true;
        } else if (newScore > SCORE_CEILING) {
          newScore = SCORE_CEILING;
          clamped = true;
        }
        if (clamped) clampedCount++;

        // DNA-8: storeDocument the idempotency record BEFORE enqueue
        const updateRecord: Record<string, unknown> = {
          idempotencyKey,
          cycleId, // CF-802: cycleId reference stored with every write
          patternId,
          outcome,
          previousScore: currentScore,
          newScore,
          delta,
          clamped,
          appliedAt: new Date().toISOString(),
          connectionType: 'FLOW_SCOPED', // scope_isolation: per-tenant retrieval outcome
          knowledgeScope: 'PRIVATE', // per-tenant — quality updates are tenant-scoped
        };

        const storeResult = await this.db.storeDocument(
          IDEMPOTENCY_INDEX,
          updateRecord,
          idempotencyKey,
        );
        if (!storeResult.isSuccess) {
          this.logger.warn(
            `RagQualityUpdater: failed to store update record for ${idempotencyKey}: ${storeResult.errorMessage ?? 'unknown'}`,
          );
          skippedCount++;
          continue;
        }

        // Update the actual pattern qualityScore
        if (patternRecord) {
          await this.db.storeDocument(
            RAG_INDEX,
            {
              ...patternRecord,
              qualityScore: newScore,
              lastUpdatedAt: new Date().toISOString(),
              lastUpdateCycle: cycleId, // CF-802
              connectionType: 'FLOW_SCOPED', // scope_isolation: platform-wide pattern
              knowledgeScope: 'GLOBAL', // RAG patterns are platform-wide quality scores
            },
            patternId,
          );
        }

        updatedCount++;
      }

      // DNA-8: storeDocument the batch summary record before enqueue
      const batchRecord: Record<string, unknown> = {
        cycleId, // CF-802: cycleId reference
        outcome,
        updatedCount,
        skippedCount,
        clampedCount,
        processedAt: new Date().toISOString(),
        connectionType: 'FLOW_SCOPED', // scope_isolation: per-tenant batch record
        knowledgeScope: 'PRIVATE', // per-tenant — batch records are tenant-scoped
      };
      await this.db.storeDocument(
        'xiigen-rag-quality-batch-records',
        batchRecord,
        `${cycleId}-batch`,
      );

      await this.queue.enqueue('PatternQualityUpdated', {
        cycleId,
        outcome,
        updatedCount,
        skippedCount,
        clampedCount,
      });

      this.logger.log(
        `RagQualityUpdater: cycle=${cycleId} updated=${updatedCount} skipped=${skippedCount} clamped=${clampedCount}`,
      );
      return DataProcessResult.success({ cycleId, updatedCount, skippedCount, clampedCount });
    } catch (err) {
      return DataProcessResult.failure('UPDATER_ERROR', `RagQualityUpdater threw: ${String(err)}`);
    }
  }
}
