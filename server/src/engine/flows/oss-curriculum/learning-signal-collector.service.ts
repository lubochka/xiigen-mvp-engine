/**
 * LearningSignalCollector (T599) — FLOW-39 Phase A
 *
 * Collects exactly 3 learning signals from a completed shadow run grade result.
 *
 * Iron rules:
 *   IRON-3-SIGNAL: Exactly 3 signals must be stored: grade_trend, rag_context_size,
 *                  graph_context_size. No more, no fewer.
 *   DNA-7: Idempotency key checked before signal extraction — same result = idempotent.
 *   DNA-8: storeDocument(signal-record) BEFORE enqueue(LearningSignalRecorded).
 *   DNA-3: returns DataProcessResult<T>, never throws.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

const SIGNALS_INDEX = 'xiigen-learning-signals';
const SHADOW_RUNS_INDEX = 'xiigen-shadow-runs';

/** IRON-3-SIGNAL: exactly these 3 keys, in this order. MACHINE constant. */
export const LEARNING_SIGNAL_KEYS = [
  'grade_trend',
  'rag_context_size',
  'graph_context_size',
] as const;
export type LearningSignalKey = (typeof LEARNING_SIGNAL_KEYS)[number];

export type GradeTrend = 'IMPROVING' | 'DECLINING' | 'STATIC';

export interface CollectSignalsOptions {
  shadowRunId: string;
  ossModel: string;
  cycleId: string;
  grade: number;
  ragContextSize: number;
  graphContextSize: number;
}

export interface CollectSignalsResult {
  signalRecordId: string;
  signals: Record<LearningSignalKey, unknown>;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-39
 * @portability MOBILE - no direct tenant context, fabric-only signal collection
 * @className LearningSignalCollector
 */
@Injectable()
export class LearningSignalCollector extends MicroserviceBase {
  private readonly logger = new Logger(LearningSignalCollector.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T599',
        serviceName: 'LearningSignalCollector',
        flowId: 'FLOW-39',
      }),
    });
  }

  async collect(options: CollectSignalsOptions): Promise<DataProcessResult<CollectSignalsResult>> {
    try {
      const { shadowRunId, ossModel, cycleId, grade, ragContextSize, graphContextSize } = options;

      if (!shadowRunId) {
        return DataProcessResult.failure('MISSING_SHADOW_RUN_ID', 'shadowRunId is required');
      }
      if (!ossModel || !cycleId) {
        return DataProcessResult.failure(
          'MISSING_REQUIRED_FIELDS',
          'ossModel and cycleId are required',
        );
      }

      // DNA-7: idempotency check before any write
      const idempotencyKey = `signals-${shadowRunId}`;
      const existingCheck = await this.dbFabric.searchDocuments(SIGNALS_INDEX, { idempotencyKey }, 1);
      if (existingCheck.isSuccess && (existingCheck.data ?? []).length > 0) {
        const existing = existingCheck.data![0] as Record<string, unknown>;
        this.logger.log(
          `LearningSignalCollector: shadow run ${shadowRunId} already processed — returning existing`,
        );
        return DataProcessResult.success(existing['collectResult'] as CollectSignalsResult);
      }

      // Compute grade_trend by reading previous grade for same ossModel + station
      const prevGradeCheck = await this.dbFabric.searchDocuments(SHADOW_RUNS_INDEX, { ossModel }, 5);

      let gradeTrend: GradeTrend = 'STATIC';
      if (prevGradeCheck.isSuccess && (prevGradeCheck.data ?? []).length > 0) {
        const records = (prevGradeCheck.data as Array<Record<string, unknown>>)
          .filter((r) => r['shadowRunId'] !== shadowRunId && r['grade'] !== null)
          .sort((a, b) =>
            String(b['submittedAt'] ?? '').localeCompare(String(a['submittedAt'] ?? '')),
          );

        if (records.length > 0) {
          const prevGrade = records[0]['grade'] as number;
          if (grade > prevGrade + 0.01) {
            gradeTrend = 'IMPROVING';
          } else if (grade < prevGrade - 0.01) {
            gradeTrend = 'DECLINING';
          }
        }
      }

      // IRON-3-SIGNAL: exactly 3 signals — MACHINE constant
      const signals: Record<LearningSignalKey, unknown> = {
        grade_trend: gradeTrend,
        rag_context_size: ragContextSize,
        graph_context_size: graphContextSize,
      };

      // Validate exactly 3 signal keys
      const signalKeys = Object.keys(signals);
      if (signalKeys.length !== 3 || !LEARNING_SIGNAL_KEYS.every((k) => signalKeys.includes(k))) {
        return DataProcessResult.failure(
          'SIGNAL_COUNT_MISMATCH',
          `IRON-3-SIGNAL violation: expected exactly 3 signals ${LEARNING_SIGNAL_KEYS.join(',')}, got ${signalKeys.join(',')}`,
        );
      }

      const signalRecordId = `SIG-${shadowRunId}`;
      const collectResult: CollectSignalsResult = { signalRecordId, signals };

      const signalRecord: Record<string, unknown> = {
        signalRecordId,
        idempotencyKey,
        shadowRunId,
        ossModel,
        cycleId,
        grade,
        signals,
        collectResult,
        collectedAt: new Date().toISOString(),
      };

      // DNA-8: storeDocument BEFORE enqueue
      const storeResult = await this.dbFabric.storeDocument(SIGNALS_INDEX, signalRecord, signalRecordId);
      if (!storeResult.isSuccess) {
        return DataProcessResult.failure(
          'SIGNAL_STORE_FAILED',
          `Failed to store learning signals for ${shadowRunId}: ${storeResult.errorMessage ?? 'unknown'}`,
        );
      }

      await this.queueFabric.enqueue('LearningSignalRecorded', {
        signalRecordId,
        shadowRunId,
        ossModel,
        cycleId,
        gradeTrend,
      });

      this.logger.log(
        `LearningSignalCollector: shadowRun=${shadowRunId} ossModel=${ossModel} trend=${gradeTrend}`,
      );
      return DataProcessResult.success(collectResult);
    } catch (err) {
      return DataProcessResult.failure(
        'SIGNAL_COLLECTOR_ERROR',
        `LearningSignalCollector threw: ${String(err)}`,
      );
    }
  }
}
