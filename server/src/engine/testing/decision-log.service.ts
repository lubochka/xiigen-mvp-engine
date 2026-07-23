// F1489 Decision Log — append-only round decision log (CF-792).
// Writes every RoundDecision to sessions/FLOW-XX/round-decisions.jsonl

import { DataProcessResult } from '../../kernel/data-process-result';
import { IDatabaseService } from '../../fabrics/interfaces/database.interface';
import { MetaDecisionResult } from '../flows/generation-loop/meta-decision-engine.service';

export class DecisionLogService {
  private readonly log: MetaDecisionResult[] = [];

  constructor(private readonly db: IDatabaseService) {}

  /**
   * Append a decision to the log (CF-792: append-only, never delete).
   */
  async appendDecision(decision: MetaDecisionResult): Promise<DataProcessResult<void>> {
    if (!decision.decisionId)
      return DataProcessResult.failure('MISSING_DECISION_ID', 'decisionId required');

    // DNA-8: store before continuing
    const stored = await this.db.storeDocument(
      'decision-log',
      {
        ...decision,
        loggedAt: new Date().toISOString(),
      } as unknown as Record<string, unknown>,
      decision.decisionId,
    );

    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    this.log.push(decision);
    return DataProcessResult.success(undefined);
  }

  /**
   * Get all decisions in log order (append-only — read only).
   */
  getLog(): readonly MetaDecisionResult[] {
    return [...this.log];
  }

  /**
   * Verify log is append-only (length only increases).
   */
  getCount(): number {
    return this.log.length;
  }
}
