/**
 * GenerationRound — immutable state snapshot of one generation round.
 *
 * Stores: round number, N candidates, all arbiter verdicts per candidate.
 * Computes: best candidate (highest average score), unanimous winner.
 */

import { ArbiterVerdict } from './arbiter-registry';

export interface Candidate {
  readonly model: string;
  readonly code: string;
  readonly taskType: string;
  readonly generatedAt: string;
}

export interface CandidateResult {
  readonly candidate: Candidate;
  readonly verdicts: ArbiterVerdict[]; // one per arbiter
  readonly avgScore: number;
  readonly allPassed: boolean; // unanimous check for this candidate
  readonly failedArbiters: string[]; // ids of arbiters that did not pass
}

export interface GenerationRound {
  readonly roundNumber: number;
  readonly taskType: string;
  readonly tenantId: string;
  readonly createdAt: string;
  readonly candidates: CandidateResult[];
  readonly winner: CandidateResult | null; // non-null when unanimous found
  readonly bestCandidate: CandidateResult; // highest avgScore regardless of unanimous
}

export function buildRound(
  roundNumber: number,
  taskType: string,
  tenantId: string,
  results: Array<{ candidate: Candidate; verdicts: ArbiterVerdict[] }>,
): GenerationRound {
  const candidateResults: CandidateResult[] = results.map(({ candidate, verdicts }) => {
    const avg =
      verdicts.length > 0 ? verdicts.reduce((s, v) => s + v.score, 0) / verdicts.length : 0;
    const allPassed = verdicts.length > 0 && verdicts.every((v) => v.passed);
    const failedArbiters = verdicts.filter((v) => !v.passed).map((v) => v.arbiterId);
    return { candidate, verdicts, avgScore: avg, allPassed, failedArbiters };
  });

  const winner = candidateResults.find((r) => r.allPassed) ?? null;
  const sorted = [...candidateResults].sort((a, b) => b.avgScore - a.avgScore);
  const best = sorted[0] ?? {
    candidate: { model: '', code: '', taskType, generatedAt: '' },
    verdicts: [],
    avgScore: 0,
    allPassed: false,
    failedArbiters: [],
  };

  return {
    roundNumber,
    taskType,
    tenantId,
    createdAt: new Date().toISOString(),
    candidates: candidateResults,
    winner,
    bestCandidate: best,
  };
}
