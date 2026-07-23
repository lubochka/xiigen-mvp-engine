// T565 RoundSummaryProcessor [META_COLLECTION]
// Assembles RoundSummary from per-round arbiter scores stored in ES.
// DNA-8: storeDocument before enqueue.

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface ArbiterScore {
  arbiterId: string;
  score: number;
  verdict: 'PASS' | 'FAIL' | 'SKIP';
  comment?: string;
}

export interface RoundSummary {
  summaryId: string;
  sessionId: string;
  flowId: string;
  roundNumber: number;
  modelId: string;
  taskTypeId: string;
  arbiterScores: ArbiterScore[];
  averageScore: number;
  passingCount: number;
  failingCount: number;
  costUsd: number;
  createdAt: string;
}

export class RoundSummaryProcessor {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  async processRound(
    sessionId: string,
    roundNumber: number,
    flowId: string,
    modelId: string,
    taskTypeId: string,
    arbiterScores: ArbiterScore[],
    costUsd: number,
  ): Promise<DataProcessResult<RoundSummary>> {
    if (!sessionId) return DataProcessResult.failure('MISSING_SESSION', 'sessionId required');
    if (arbiterScores.length === 0)
      return DataProcessResult.failure('NO_SCORES', 'At least one arbiter score required');

    const passing = arbiterScores.filter((s) => s.verdict === 'PASS');
    const failing = arbiterScores.filter((s) => s.verdict === 'FAIL');
    const averageScore = arbiterScores.reduce((sum, s) => sum + s.score, 0) / arbiterScores.length;

    const summary: RoundSummary = {
      summaryId: `${sessionId}::round::${roundNumber}`,
      sessionId,
      flowId,
      roundNumber,
      modelId,
      taskTypeId,
      arbiterScores,
      averageScore,
      passingCount: passing.length,
      failingCount: failing.length,
      costUsd,
      createdAt: new Date().toISOString(),
    };

    // DNA-8: store before emit
    const stored = await this.db.storeDocument(
      'round-summaries',
      { ...summary } as unknown as Record<string, unknown>,
      summary.summaryId,
    );
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('meta.round.summary.ready', {
      summaryId: summary.summaryId,
      sessionId,
      roundNumber,
    });

    return DataProcessResult.success(summary);
  }
}
