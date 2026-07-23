/**
 * CycleOutcomeClassifier (T594) — FLOW-38 Phase B
 *
 * Classifies a completed generation cycle as SUCCESS_WITHIN_BUDGET, WASTED_CYCLE,
 * or ESCALATION_REQUIRED, based on the presence and score of a stored DPO triple.
 *
 * Iron rules:
 *   NO-OUTCOME-NO-UPDATE: if no DPO triple exists for cycleId → no classification, no downstream update.
 *   CF-802: cycleId reference stored with every outcome record.
 *   DNA-7: idempotency — if cycle already classified, return existing result.
 *   DNA-8: storeDocument(outcome record) BEFORE enqueue(RagQualityUpdateRequested).
 *   DNA-3: returns DataProcessResult<T>, never throws.
 *   DNA-5: tenantId from context — not passed to fabric methods.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';

export type CycleOutcome = 'SUCCESS_WITHIN_BUDGET' | 'WASTED_CYCLE' | 'ESCALATION_REQUIRED';

export interface ClassifyOptions {
  cycleId: string;
  flowId: string;
  dpoTripleRef: Record<string, unknown>;
}

export interface ClassifyResult {
  cycleId: string;
  outcome: CycleOutcome;
  classificationBasis: Record<string, unknown>;
}

const OUTCOME_INDEX = 'xiigen-cycle-outcomes';
// TRAINING_INDEX reserved for future DPO triple promotion

/** DPO score threshold (0–10 scale) that distinguishes SUCCESS from WASTED. */
const SUCCESS_THRESHOLD = 7.0;
/** Escalate when score is extremely low and might indicate model failure. */
const ESCALATION_THRESHOLD = 2.0;

@Injectable()
export class CycleOutcomeClassifier {
  private readonly logger = new Logger(CycleOutcomeClassifier.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
  ) {}

  async classify(options: ClassifyOptions): Promise<DataProcessResult<ClassifyResult>> {
    try {
      const { cycleId, flowId, dpoTripleRef } = options;

      if (!cycleId) {
        return DataProcessResult.failure('MISSING_CYCLE_ID', 'cycleId is required');
      }

      // DNA-7: idempotency — check if cycle already classified
      const existingResult = await this.db.searchDocuments(OUTCOME_INDEX, { cycleId }, 1);
      if (existingResult.isSuccess && (existingResult.data ?? []).length > 0) {
        const existing = existingResult.data![0] as Record<string, unknown>;
        this.logger.log(
          `CycleOutcomeClassifier: cycle ${cycleId} already classified — returning existing`,
        );
        return DataProcessResult.success({
          cycleId,
          outcome: existing['outcome'] as CycleOutcome,
          classificationBasis: (existing['classificationBasis'] as Record<string, unknown>) ?? {},
        });
      }

      // NO-OUTCOME-NO-UPDATE: if no DPO triple, do not classify and do not trigger update
      if (!dpoTripleRef || !dpoTripleRef['tripleId']) {
        this.logger.log(
          `CycleOutcomeClassifier: no DPO triple for cycle ${cycleId} — skipping (no-outcome-no-update)`,
        );
        return DataProcessResult.failure(
          'NO_DPO_TRIPLE',
          `No DPO triple reference for cycle ${cycleId} — classification skipped per no-outcome-no-update rule`,
        );
      }

      const score =
        typeof dpoTripleRef['score'] === 'number' ? (dpoTripleRef['score'] as number) : 0;

      let outcome: CycleOutcome;
      if (score <= ESCALATION_THRESHOLD) {
        outcome = 'ESCALATION_REQUIRED';
      } else if (score >= SUCCESS_THRESHOLD) {
        outcome = 'SUCCESS_WITHIN_BUDGET';
      } else {
        outcome = 'WASTED_CYCLE';
      }

      const classificationBasis: Record<string, unknown> = {
        dpoScore: score,
        successThreshold: SUCCESS_THRESHOLD,
        escalationThreshold: ESCALATION_THRESHOLD,
        tripleId: dpoTripleRef['tripleId'],
        classifiedAt: new Date().toISOString(),
      };

      const outcomeRecord: Record<string, unknown> = {
        cycleId, // CF-802: cycleId reference stored with every record
        flowId,
        outcome,
        classificationBasis,
        createdAt: new Date().toISOString(),
        connectionType: 'FLOW_SCOPED', // scope_isolation: per-tenant cycle outcome
        knowledgeScope: 'PRIVATE', // per-tenant — cycle outcomes are tenant-scoped
      };

      // DNA-8: storeDocument BEFORE enqueue
      const storeResult = await this.db.storeDocument(OUTCOME_INDEX, outcomeRecord, cycleId);
      if (!storeResult.isSuccess) {
        return DataProcessResult.failure(
          'OUTCOME_STORE_FAILED',
          `Failed to store outcome for cycle ${cycleId}: ${storeResult.errorMessage ?? 'unknown'}`,
        );
      }

      // Emit downstream only for SUCCESS_WITHIN_BUDGET and WASTED_CYCLE (not ESCALATION_REQUIRED)
      if (outcome === 'SUCCESS_WITHIN_BUDGET' || outcome === 'WASTED_CYCLE') {
        await this.queue.enqueue('RagQualityUpdateRequested', {
          cycleId,
          flowId,
          outcome,
          patternIds: (dpoTripleRef['retrievedPatternIds'] as string[] | undefined) ?? [],
        });
      }

      this.logger.log(`CycleOutcomeClassifier: cycle=${cycleId} outcome=${outcome}`);
      return DataProcessResult.success({ cycleId, outcome, classificationBasis });
    } catch (err) {
      return DataProcessResult.failure(
        'CLASSIFIER_ERROR',
        `CycleOutcomeClassifier threw: ${String(err)}`,
      );
    }
  }
}
