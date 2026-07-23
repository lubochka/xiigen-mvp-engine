/**
 * UnanimousVerdictAggregator — determines if a round has a unanimous winner.
 *
 * Unanimous = at least one candidate where ALL arbiters scored >= their minPassScore.
 * Returns the winning candidate or null + synthesis notes for the next round.
 *
 * A-2: Added BLOCK semantics. Candidates failing a BLOCK-class arbiter are ineligible
 * for winner selection, regardless of their aggregate score. This enforces
 * ArbiterPanelConfig.blockSemantics.blockOnFail from engine contracts.
 */

import { DataProcessResult } from '../../kernel/data-process-result';
import { GenerationRound, CandidateResult } from './generation-round';

export interface AggregationResult {
  readonly hasWinner: boolean;
  readonly winner: CandidateResult | null;
  readonly nextRoundNotes: string[]; // consolidated arbiter notes for FeedbackSynthesizer
}

export class UnanimousVerdictAggregator {
  /**
   * A-2: blockOnFail — list of arbiter IDs that produce BLOCK verdicts.
   * Any candidate with a failing BLOCK-class arbiter is ineligible for winner selection.
   * Populated from contract.arbiterConfig.blockSemantics.blockOnFail.
   * Defaults to [] (backward-compatible — no BLOCK filtering when absent).
   */
  aggregate(
    round: GenerationRound,
    blockOnFail?: readonly string[],
  ): DataProcessResult<AggregationResult> {
    // A-2: Apply BLOCK semantics — filter out candidates with failing BLOCK-class arbiters
    const eligibleCandidates = blockOnFail?.length
      ? round.candidates.filter(
          (c) => !c.verdicts.some((v) => blockOnFail.includes(v.arbiterId) && !v.passed),
        )
      : round.candidates;

    // If all candidates are blocked, return no winner with explicit note
    if (blockOnFail?.length && eligibleCandidates.length === 0) {
      return DataProcessResult.success({
        hasWinner: false,
        winner: null,
        nextRoundNotes: [
          `All candidates blocked by BLOCK-class arbiters: ${blockOnFail.join(', ')}`,
        ],
      });
    }

    // Check for a winner among eligible candidates only
    const eligibleWinner = eligibleCandidates.find((c) => c.allPassed) ?? null;
    if (eligibleWinner ?? round.winner) {
      return DataProcessResult.success({
        hasWinner: true,
        winner: eligibleWinner ?? round.winner,
        nextRoundNotes: [],
      });
    }

    // No winner — collect failure notes from the best candidate
    const best = round.bestCandidate;
    const notes: string[] = [];

    for (const verdict of best.verdicts) {
      if (!verdict.passed) {
        notes.push(`[${verdict.arbiterId}] Score: ${verdict.score}/100`);
        notes.push(...verdict.notes.map((n) => `  → ${n}`));
        notes.push(...verdict.suggestions.map((s) => `  ✓ Fix: ${s}`));
      }
    }

    return DataProcessResult.success({
      hasWinner: false,
      winner: null,
      nextRoundNotes: notes,
    });
  }
}
