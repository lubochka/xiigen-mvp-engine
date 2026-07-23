/**
 * SkillFaithfulMockProvider — mock AI provider that returns skill-compliant outputs.
 *
 * Instead of generic placeholder text, each call type returns output satisfying
 * the relevant skill's output contract:
 *
 *   - Planner system prompt (SK-520): 3+ steps, no tech names, intClause per step,
 *     dependency chain declared
 *   - Reviewer system prompt: clean assessment (no violations, no gaps)
 *   - Judge call ('OUTPUT TO EVALUATE' in prompt): score JSON in 0–10 range,
 *     model-specific values that guarantee spread ≥ 1.0 across 3 instances
 *   - Depth Decision system prompt (SK-521): LEAF cites not-triggered signals;
 *     EXPAND cites triggered signal + ≥ 2 sub-nodes
 *   - Default (teaching round gen call / nodePrompt): well-formed NODE spec JSON
 *
 * Score spread guarantee (V9-002 + SK-452):
 *   mock-gemini = 7.4, mock-openai = 6.0, mock-claude = 6.2
 *   chosen = mock-gemini(7.4), rejected = mock-claude(6.2): spread = 1.2 ≥ 1.0 ✓
 *   chosen.model ≠ rejected.model ✓
 *
 * Activation: process.env['MOCK_MODE'] = 'skill_faithful' (test setup only).
 * The provider is wired in FabricsModule when AI_PROVIDER=mock + MOCK_MODE=skill_faithful.
 */

import { IAiProvider, AiModelRole } from '../../interfaces/ai-provider.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { randomUUID } from 'crypto';

/** Per-model judge scores — deterministic, ensures spread ≥ 1.0 (SK-452). */
const MODEL_JUDGE_SCORES: Record<string, number> = {
  'mock-gemini': 7.4,
  'mock-openai': 6.0,
  'mock-claude': 6.2,
  'mock-sf': 7.0, // explicit — prevents implicit DEFAULT_JUDGE_SCORE fallthrough
};
const DEFAULT_JUDGE_SCORE = 7.0;

export interface SkillFaithfulMockOptions {
  /** Override the judge score regardless of modelId. Used for SINGLE_WINNER tests. */
  scoreOverride?: number;
  /**
   * Per-call judge scores — consumed in order on each judge call.
   * When exhausted, the last entry is repeated. Used for VARIABLE mode tests.
   * Takes precedence over scoreOverride.
   */
  variableScores?: number[];
}

export class SkillFaithfulMockProvider extends IAiProvider {
  private judgeCallCount = 0;

  constructor(
    private readonly modelId: string = 'mock-sf',
    private readonly sfOptions: SkillFaithfulMockOptions = {},
  ) {
    super();
  }

  async generate(
    prompt: string,
    options?: {
      systemPrompt?: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
      role?: AiModelRole;
    },
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    try {
      const sys = options?.systemPrompt ?? '';

      // 1. Judge call — teaching round self-judge (no systemPrompt option; marker in prompt)
      if (prompt.includes('OUTPUT TO EVALUATE')) {
        return this.judgeResponse();
      }

      // 2. Planner call — Cycle 1 plan step generation
      if (
        sys.includes('abstract flow planner') ||
        sys.includes('technology-neutral implementation plans')
      ) {
        return this.plannerResponse();
      }

      // 3. Reviewer call — Cycle 1 plan review pass
      if (sys.includes('rigorous plan reviewer')) {
        return this.reviewerResponse();
      }

      // 4. Depth Decision call — Cycle 3 LEAF/EXPAND verdict
      if (sys.includes('Depth Decider')) {
        return this.depthDecisionResponse(prompt);
      }

      // 5. Default — NODE spec generation (Cycle 2 teaching round gen call)
      return this.nodeSpecResponse();
    } catch (err) {
      return DataProcessResult.failure(
        'SF_MOCK_ERROR',
        `SkillFaithfulMockProvider.generate threw: ${String(err)}`,
      );
    }
  }

  async generateStructured(
    _prompt: string,
    _outputSchema: Record<string, unknown>,
    _options?: {
      systemPrompt?: string;
      model?: string;
      role?: AiModelRole;
    },
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    return DataProcessResult.success({
      data: { result: 'skill_faithful_structured' },
      model: this.modelId,
      tokens_used: { input: 50, output: 50 },
      cost: 0,
      request_id: randomUUID(),
    });
  }

  getModelInfo(): Record<string, unknown> {
    return {
      provider: 'skill-faithful-mock',
      model_id: this.modelId,
      display_name: `SkillFaithfulMock (${this.modelId})`,
      max_tokens: 4096,
      context_window: 128_000,
      cost_per_input_token: 0.0,
      cost_per_output_token: 0.0,
      capabilities: { structured_output: true, mock: true, skill_faithful: true },
      version: 'sf-mock-1.0',
    };
  }

  // ── Private response builders ─────────────────────────────────────────────

  /**
   * Judge response — returns per-model score JSON.
   * Fixed scores ensure score spread ≥ 1.0 (SK-452) and chosen.model ≠ rejected.model (V9-002).
   * variableScores (if set) are consumed in order per judge call — for VARIABLE mode tests.
   * scoreOverride (if set) replaces the model-lookup score — for SINGLE_WINNER tests.
   */
  private judgeResponse(): DataProcessResult<Record<string, unknown>> {
    let score: number;
    if (this.sfOptions.variableScores && this.sfOptions.variableScores.length > 0) {
      const idx = Math.min(this.judgeCallCount, this.sfOptions.variableScores.length - 1);
      score = this.sfOptions.variableScores[idx]!;
      this.judgeCallCount++;
    } else if (this.sfOptions.scoreOverride !== undefined) {
      score = this.sfOptions.scoreOverride;
    } else {
      score = MODEL_JUDGE_SCORES[this.modelId] ?? DEFAULT_JUDGE_SCORE;
    }
    return DataProcessResult.success({
      text: JSON.stringify({
        score,
        reasoning: `SF mock (${this.modelId}): NODE spec evaluated at ${score} — deterministic assessment.`,
      }),
      model: this.modelId,
      tokens_used: { input: 80, output: 25 },
      cost: 0,
      request_id: randomUUID(),
    });
  }

  /**
   * SK-520 compliant planner response:
   *   - 3 steps with one responsibility each (no "and" bundling)
   *   - No technology, framework, database, or library names
   *   - Each step has intClause
   *   - Dependency chain explicitly declared
   */
  private plannerResponse(): DataProcessResult<Record<string, unknown>> {
    return DataProcessResult.success({
      text: JSON.stringify({
        steps: [
          {
            index: 1,
            text: 'Capture the identity credential submitted by the requester',
            intClause: 'so the system can verify who is performing the action',
            dependencies: [],
          },
          {
            index: 2,
            text: 'Confirm the credential satisfies uniqueness and validity rules',
            intClause: 'so duplicate records are prevented before commitment is made',
            dependencies: [1],
          },
          {
            index: 3,
            text: 'Persist the verified identity to the registrant store',
            intClause: 'so the identity can be retrieved on subsequent interactions',
            dependencies: [2],
          },
        ],
        coverage: [],
        abstractionViolations: [],
        responsibilityFlags: [],
        dependencyGaps: [],
      }),
      model: this.modelId,
      tokens_used: { input: 120, output: 200 },
      cost: 0,
      request_id: randomUUID(),
    });
  }

  /**
   * Reviewer response — clean assessment (no violations, no gaps).
   * Passes PlannerHandler review check without triggering retry.
   */
  private reviewerResponse(): DataProcessResult<Record<string, unknown>> {
    return DataProcessResult.success({
      text: JSON.stringify({
        coverage: [],
        abstractionViolations: [],
        responsibilityFlags: [],
        dependencyGaps: [],
      }),
      model: this.modelId,
      tokens_used: { input: 100, output: 80 },
      cost: 0,
      request_id: randomUUID(),
    });
  }

  /**
   * SK-521 compliant depth decision response:
   *   - LEAF: cites at least one signal as not-triggered
   *   - EXPAND: cites at least one triggered signal + ≥ 2 sub-nodes
   * Multi-responsibility detection: "and" appears 2+ times or explicit markers.
   */
  private depthDecisionResponse(prompt: string): DataProcessResult<Record<string, unknown>> {
    const andCount = (prompt.match(/ and /gi) ?? []).length;
    const hasMultipleResponsibilities =
      andCount > 1 ||
      prompt.toLowerCase().includes('multiple responsibilities') ||
      prompt.toLowerCase().includes('sub-flow');

    const text = hasMultipleResponsibilities
      ? JSON.stringify({
          verdict: 'EXPAND',
          justification:
            'SIGNAL-1 triggered: intent.purpose contains multiple independent clauses — at least 2 distinct responsibilities detected.',
          subNodes: [
            'Handle first responsibility from delegated scope',
            'Handle second responsibility from delegated scope',
          ],
        })
      : JSON.stringify({
          verdict: 'LEAF',
          justification:
            'SIGNAL-1 checked: single responsibility in intent.purpose — not triggered. ' +
            'SIGNAL-2 checked: no branching across more than 2 paths — not triggered. ' +
            'Proceeding to executor.',
        });

    return DataProcessResult.success({
      text,
      model: this.modelId,
      tokens_used: { input: 100, output: 80 },
      cost: 0,
      request_id: randomUUID(),
    });
  }

  /**
   * NODE spec generation — default response for Cycle 2 teaching round gen calls.
   * Returns a minimal but well-formed NODE spec JSON.
   */
  private nodeSpecResponse(): DataProcessResult<Record<string, unknown>> {
    return DataProcessResult.success({
      text: JSON.stringify({
        intent: {
          purpose: 'Handle the delegated responsibility from the parent scope',
        },
        contracts: {
          accepts: 'scope-specific input from upstream context',
          emits: 'processed result to the registrant pipeline',
        },
        constraints: [
          'Must not access parent scope state directly',
          'Must emit a typed result on completion',
          'Must record the outcome to the audit store before emitting',
        ],
        acceptanceCriteria: [
          'Result emitted contains all fields declared in contracts.emits',
          'Audit store record exists before result is emitted (DNA-8)',
        ],
      }),
      model: this.modelId,
      tokens_used: { input: 100, output: 150 },
      cost: 0,
      request_id: randomUUID(),
    });
  }
}
