// SpendGovernorPattern (SK-402)
// CF-789: reads spend_limit_usd from FREEDOM config. Halts session when exceeded.
// Returns HALT if accumulated cost_usd >= limit; CONTINUE otherwise.

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';

export interface SpendSession {
  sessionId: string;
  flowId: string;
  accumulatedCostUsd: number;
  roundCount: number;
  startedAt: string;
}

export class SpendGovernorService {
  constructor(
    private readonly db: IDatabaseService,
    private readonly freedomConfig: { getConfig(key: string): Promise<DataProcessResult<number>> },
  ) {}

  async checkSpend(
    session: SpendSession,
  ): Promise<DataProcessResult<{ verdict: 'CONTINUE' | 'HALT'; reason?: string }>> {
    const limitResult = await this.freedomConfig.getConfig('spend_limit_usd');
    if (!limitResult.isSuccess)
      return DataProcessResult.failure(limitResult.errorCode!, limitResult.errorMessage!);
    const limit = limitResult.data ?? 10;

    if (session.accumulatedCostUsd >= limit) {
      const stored = await this.db.storeDocument('spend-events', {
        sessionId: session.sessionId,
        event: 'spend.limit.exceeded',
        accumulatedCostUsd: session.accumulatedCostUsd,
        limitUsd: limit,
        at: new Date().toISOString(),
      });
      if (!stored.isSuccess)
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      return DataProcessResult.success({
        verdict: 'HALT',
        reason: `Spend limit $${limit} exceeded (accumulated: $${session.accumulatedCostUsd})`,
      });
    }

    return DataProcessResult.success({ verdict: 'CONTINUE' });
  }

  async recordRoundCost(sessionId: string, costUsd: number): Promise<DataProcessResult<number>> {
    // Store cost record, return new accumulated total
    const result = await this.db.searchDocuments('spend-events', { sessionId });
    if (!result.isSuccess)
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);

    const stored = await this.db.storeDocument('spend-events', {
      sessionId,
      event: 'round.cost',
      costUsd,
      at: new Date().toISOString(),
    });
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    const previous = (result.data ?? []).reduce(
      (sum: number, d: unknown) => sum + (((d as Record<string, unknown>).costUsd as number) ?? 0),
      0,
    );
    return DataProcessResult.success(previous + costUsd);
  }
}
