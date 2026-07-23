/**
 * TrainingTraceWriter — persists every generation round for LLM fine-tuning.
 *
 * Writes a structured trace document per round. DB is optional:
 * without it the trace is acknowledged but not persisted (no-op fallback).
 *
 * connection_type: TENANT_EXPORTABLE — traces belong to the tenant that ran the loop.
 */

import { Injectable, Optional, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { GenerationRound } from './generation-round';

@Injectable()
export class TrainingTraceWriter {
  constructor(@Optional() @Inject(DATABASE_SERVICE) private readonly db?: IDatabaseService) {}

  async write(input: {
    round: GenerationRound;
    prompt: string;
  }): Promise<DataProcessResult<string>> {
    const traceId = `trace-${input.round.tenantId}-${input.round.taskType}-r${input.round.roundNumber}-${Date.now()}`;

    const trace: Record<string, unknown> = {
      traceId,
      tenantId: input.round.tenantId,
      taskType: input.round.taskType,
      roundNumber: input.round.roundNumber,
      promptUsed: input.prompt.slice(0, 500),
      candidates: input.round.candidates.map((c) => ({
        model: c.candidate.model,
        codeLength: c.candidate.code.length,
        avgScore: c.avgScore,
        allPassed: c.allPassed,
        failedArbiters: c.failedArbiters,
      })),
      winner: input.round.winner ? input.round.winner.candidate.model : null,
      createdAt: new Date().toISOString(),
      connection_type: 'TENANT_EXPORTABLE',
    };

    if (this.db) {
      const result = await this.db.storeDocument('xiigen-training-traces', trace, traceId);
      if (!result.isSuccess)
        return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
      return DataProcessResult.success(traceId);
    }

    // No DB — acknowledge without persisting
    return DataProcessResult.success(traceId);
  }
}
