/**
 * FiveArbiterConsensusGate — T540 [AI_CONSENSUS].
 *
 * 5 specialized arbiters run in PARALLEL via Promise.allSettled.
 * Quorum threshold: ≥4/5 required (score-0 violation if wrong threshold or sequential).
 *
 * Arbiters: architecture, security, dna, business, integration.
 * Arbiter prompts are stored in this service — NOT in ArbiterRegistry.
 *
 * DNA-3: All methods return DataProcessResult — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import type {
  Flow33Ai,
  Flow33ArbiterResult,
  Flow33ConsensusResult,
  Flow33ConsensusVerdict,
} from './flow33-shared-interfaces';

export type ArbiterVerdict = 'PASS' | 'FAIL';
export type ConsensusVerdict = Flow33ConsensusVerdict;

export type ArbiterResult = Flow33ArbiterResult & { score: number };

export type ConsensusResult = Flow33ConsensusResult & {
  passedCount: number;
  totalCount: number;
  verdicts: ArbiterResult[];
};

/** Internal arbiter prompt templates — seeded here, NOT in ArbiterRegistry. */
const ARBITER_PROMPTS: Record<string, string> = {
  architecture:
    'You are the Architecture Arbiter. Review the following generated code bundle for structural soundness: DAG ordering, service decomposition, orchestration correctness. Score 0-10. Reply JSON: { score: number, passed: boolean, notes: string }. Bundle: {{BUNDLE}}',
  security:
    'You are the Security Arbiter. Review the following generated code bundle for security compliance: no direct SDK imports, tenant isolation enforced, no hardcoded secrets. Score 0-10. Reply JSON: { score: number, passed: boolean, notes: string }. Bundle: {{BUNDLE}}',
  dna: 'You are the DNA Compliance Arbiter. Review the following generated code bundle for all 9 DNA patterns: DNA-1 no typed models, DNA-2 BuildSearchFilter, DNA-3 DataProcessResult, DNA-4 MicroserviceBase, DNA-5 AsyncLocalStorage, DNA-6 DynamicController, DNA-7 idempotency, DNA-8 outbox, DNA-9 CloudEvents. Score 0-10. Reply JSON: { score: number, passed: boolean, notes: string }. Bundle: {{BUNDLE}}',
  business:
    'You are the Business Logic Arbiter. Review the following generated code bundle for domain correctness: FREEDOM config used for all configurable values, correct index names, correct event naming conventions. Score 0-10. Reply JSON: { score: number, passed: boolean, notes: string }. Bundle: {{BUNDLE}}',
  integration:
    'You are the Integration Arbiter. Review the following generated code bundle for fabric interface correctness: all external access via fabric injection, no direct HTTP between services, queue events follow CloudEvents envelope. Score 0-10. Reply JSON: { score: number, passed: boolean, notes: string }. Bundle: {{BUNDLE}}',
};

const PASS_SCORE_THRESHOLD = 7;

export class FiveArbiterConsensusGate {
  constructor(private readonly ai: Flow33Ai) {}

  /**
   * Parse arbiter AI response to ArbiterResult.
   */
  private parseVerdict(arbiterId: string, raw: string): ArbiterResult {
    try {
      const parsed = JSON.parse(raw);
      const score = Number(parsed.score ?? 0);
      const passed =
        typeof parsed.passed === 'boolean' ? parsed.passed : score >= PASS_SCORE_THRESHOLD;
      return { arbiterId, score, passed, notes: String(parsed.notes ?? '') };
    } catch {
      return {
        arbiterId,
        score: 0,
        passed: false,
        notes: `Failed to parse arbiter response: ${raw.slice(0, 100)}`,
      };
    }
  }

  /**
   * Run consensus gate — 5 arbiters in PARALLEL via Promise.allSettled.
   *
   * ⛔ Score-0 violations enforced:
   *   - Sequential execution instead of Promise.allSettled
   *   - Quorum threshold < 4 (must be ≥4/5)
   */
  async runConsensus(bundle: Record<string, unknown>): Promise<DataProcessResult<ConsensusResult>> {
    const bundleJson = JSON.stringify(bundle);

    // ⚠️ ALL 5 arbiters MUST run in PARALLEL — Promise.allSettled guarantees this
    const [arch, sec, dna, biz, integ] = await Promise.allSettled([
      this.ai.generate(ARBITER_PROMPTS['architecture'].replace('{{BUNDLE}}', bundleJson)),
      this.ai.generate(ARBITER_PROMPTS['security'].replace('{{BUNDLE}}', bundleJson)),
      this.ai.generate(ARBITER_PROMPTS['dna'].replace('{{BUNDLE}}', bundleJson)),
      this.ai.generate(ARBITER_PROMPTS['business'].replace('{{BUNDLE}}', bundleJson)),
      this.ai.generate(ARBITER_PROMPTS['integration'].replace('{{BUNDLE}}', bundleJson)),
    ]);

    const arbiterIds = ['architecture', 'security', 'dna', 'business', 'integration'];
    const settled = [arch, sec, dna, biz, integ];

    const verdicts: ArbiterResult[] = settled.map((r, i) => {
      if (r.status === 'fulfilled' && r.value.isSuccess && r.value.data) {
        return this.parseVerdict(arbiterIds[i], r.value.data);
      }
      return {
        arbiterId: arbiterIds[i],
        score: 0,
        passed: false,
        notes: 'Arbiter call failed or returned no data',
      };
    });

    const passedCount = verdicts.filter((v) => v.passed).length;
    const totalCount = 5;

    // ⚠️ Quorum MUST be ≥4/5 — any lower threshold = score-0
    let verdict: ConsensusVerdict;
    if (passedCount >= 4) {
      verdict = 'APPROVED';
    } else if (passedCount === 3) {
      verdict = 'NEEDS_REVISION';
    } else {
      verdict = 'REJECTED';
    }

    return DataProcessResult.success({ verdict, verdicts, passedCount, totalCount });
  }
}
