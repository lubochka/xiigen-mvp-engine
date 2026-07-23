/**
 * LearningHandoffService — assembles the Phase F learning handoff record.
 *
 * A-3 Fix: Added propagationSignals field to handoff schema.
 *   propagationSignals tracks which graph edges were updated during retrospective,
 *   enabling FLOW-34 pattern discovery to learn from FLOW-12 execution results.
 *
 * DNA-3: returns DataProcessResult, never throws
 * DNA-8: storeDocument before any downstream queue events
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../kernel/data-process-result';
import { AIDrivenRetrospectiveService } from '../fabrics/graph/planning/ai-driven-retrospective.service';

export interface LearningHandoffParams {
  flowId: string;
  taskTypeId: string;
  cycleScore: number;
  calibrationTriples: Record<string, unknown>[];
  edgesUpdated: number;
  runId: string;
}

@Injectable()
export class LearningHandoffService {
  private readonly logger = new Logger(LearningHandoffService.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    // A-3: retrospective service provides propagationSignals
    @Optional() private readonly retrospectiveService?: AIDrivenRetrospectiveService,
  ) {}

  /**
   * Assemble and store a Phase F learning handoff record.
   *
   * A-3 Fix: Includes propagationSignals from AIDrivenRetrospectiveService
   * so FLOW-34 pattern discovery can learn from edge updates.
   */
  async buildHandoff(
    params: LearningHandoffParams,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const propagationSignals = this.retrospectiveService
      ? this.retrospectiveService.getPropagationSignals()
      : [];

    const handoff: Record<string, unknown> = {
      flowId: params.flowId,
      taskTypeId: params.taskTypeId,
      cycleScore: params.cycleScore,
      calibrationTriples: params.calibrationTriples,
      edgesUpdated: params.edgesUpdated,
      // A-3 fix: propagationSignals included so FLOW-34 can learn from this run
      propagationSignals,
      propagationSignalCount: propagationSignals.length,
      runId: params.runId,
      completedAt: new Date().toISOString(),
    };

    // DNA-8: storeDocument before any downstream enqueue
    const storeResult = await this.db.storeDocument(
      'xiigen-learning-handoffs',
      handoff,
      `${params.taskTypeId}:${params.runId}`,
    );

    if (!storeResult.isSuccess) {
      this.logger.warn(
        `LearningHandoff store failed for ${params.taskTypeId}: ${storeResult.errorMessage}`,
      );
      return DataProcessResult.failure(
        'HANDOFF_STORE_FAILED',
        storeResult.errorMessage ?? 'Failed to store learning handoff',
      );
    }

    this.logger.log(
      `LearningHandoff stored for ${params.taskTypeId} ` +
        `(${propagationSignals.length} propagation signals, score=${params.cycleScore.toFixed(3)})`,
    );

    return DataProcessResult.success(handoff);
  }
}
