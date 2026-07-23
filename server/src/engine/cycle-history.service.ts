/**
 * CycleHistoryService — accumulates per-run cycle history for cross-step enrichment.
 *
 * Records a summary of the winning NODE for each convergence step in a run.
 * Retrieved by CycleChainService before each convergence call to enable
 * differentiated prompt routing (G1) and dynamic arbiter enrichment (G4-CC).
 *
 * DNA-3: never throws — returns DataProcessResult
 * DNA-8: storeDocument BEFORE returning success
 * DNA-1: all business data as Record<string, unknown>
 */

import { Injectable, Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../kernel/data-process-result';

export interface CycleHistoryRecord {
  id: string; // `${runId}::step-${stepIndex}` — deterministic
  runId: string;
  stepIndex: number;
  stepText: string; // first 120 chars only
  winningNodeSummary: string;
  grade: number;
  modelWon: string;
  createdAt: string;
  tenantId: string;
  connectionType: 'FLOW_SCOPED';
  knowledgeScope: 'PRIVATE';
}

export interface RecordParams {
  runId: string;
  stepIndex: number;
  stepText: string;
  winningNodeSummary: string;
  grade: number;
  modelWon: string;
  tenantId: string;
}

@Injectable()
export class CycleHistoryService {
  private readonly INDEX = 'xiigen-cycle-history';

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  async record(params: RecordParams): Promise<DataProcessResult<CycleHistoryRecord>> {
    try {
      const id = `${params.runId}::step-${params.stepIndex}`;
      const stepText = params.stepText.slice(0, 120);

      const doc: CycleHistoryRecord = {
        id,
        runId: params.runId,
        stepIndex: params.stepIndex,
        stepText,
        winningNodeSummary: params.winningNodeSummary,
        grade: params.grade,
        modelWon: params.modelWon,
        createdAt: new Date().toISOString(),
        tenantId: params.tenantId,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      };

      // DNA-8: storeDocument BEFORE returning
      const storeResult = await this.db.storeDocument(
        this.INDEX,
        doc as unknown as Record<string, unknown>,
        id,
      );

      if (!storeResult.isSuccess) {
        return DataProcessResult.failure(
          'CYCLE_HISTORY_ERROR',
          `Failed to store cycle history: ${storeResult.errorMessage ?? 'unknown'}`,
        );
      }

      return DataProcessResult.success(doc);
    } catch (err) {
      return DataProcessResult.failure(
        'CYCLE_HISTORY_ERROR',
        `CycleHistoryService.record threw: ${String(err)}`,
      );
    }
  }

  async getSummariesForRun(runId: string, tenantId: string): Promise<DataProcessResult<string[]>> {
    try {
      const result = await this.db.searchDocuments(this.INDEX, { runId, tenantId });

      if (!result.isSuccess) {
        // Empty result is not a failure — return empty array
        return DataProcessResult.success([]);
      }

      const records = (result.data ?? []) as Array<Record<string, unknown>>;

      // Sort by stepIndex ascending
      const sorted = [...records].sort(
        (a, b) => (a['stepIndex'] as number) - (b['stepIndex'] as number),
      );

      const summaries = sorted.map((r) => String(r['winningNodeSummary'] ?? ''));

      return DataProcessResult.success(summaries);
    } catch (err) {
      return DataProcessResult.failure(
        'CYCLE_HISTORY_ERROR',
        `CycleHistoryService.getSummariesForRun threw: ${String(err)}`,
      );
    }
  }
}
