/**
 * planner.handler — Cycle 1: AI Planning
 *
 * Generates a technology-neutral plan from a user intent + constraints.
 * Uses a two-call pattern: planner AI then reviewer AI.
 * Reviewer assesses coverage, abstraction, responsibility, and dependency.
 * Grade formula: coverageScore * abstractionScore * (0.5 + 0.5 * responsibilityScore) * dependencyScore
 *
 * DNA-1: Record<string, unknown> for all fabric calls
 * DNA-3: never throw, always return DataProcessResult
 * DNA-5: tenantId from ctx, never passed to fabric
 * DNA-8: storeDocument BEFORE returning result
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IAiProvider,
  AI_PROVIDER,
  AiModelRole,
} from '../../fabrics/interfaces/ai-provider.interface';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { INodeHandler, NodeHandlerContext, NodeHandlerResult } from './node-handler.types';
import { randomUUID } from 'crypto';

const TECH_NAME_REGEX =
  /\b(nestjs|express|fastify|typeorm|prisma|sequelize|redis|elasticsearch|postgres|mysql|mongodb|kafka|rabbitmq|bull|react|vue|angular|graphql|grpc|typescript|javascript|python|java|go|rust)\b/i;

@Injectable()
export class PlannerHandler implements INodeHandler {
  readonly nodeType = 'planner';
  private readonly logger = new Logger(PlannerHandler.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly ai: IAiProvider,
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
  ) {}

  async handle(ctx: NodeHandlerContext): Promise<DataProcessResult<NodeHandlerResult>> {
    const { inputs, flowId, tenantId, runId } = ctx;

    const userIntent = String(inputs['userIntent'] ?? '').trim();
    const constraints = (inputs['constraints'] as string[] | undefined) ?? [];
    const domain = inputs['domain'] ? String(inputs['domain']) : undefined;
    const priorArtQuery = String(inputs['priorArtQuery'] ?? 'NO_PRIOR_ART');
    const successFormat = inputs['successFormat'] ? String(inputs['successFormat']) : undefined;
    const gradeThreshold =
      typeof inputs['gradeThreshold'] === 'number' ? inputs['gradeThreshold'] : 0.85;

    if (!userIntent) {
      return DataProcessResult.failure(
        'PLANNER_MISSING_INTENT',
        'userIntent is required and must not be empty',
      );
    }

    if (!constraints || constraints.length === 0) {
      return DataProcessResult.failure(
        'PLANNER_MISSING_CONSTRAINTS',
        'constraints is required and must not be empty',
      );
    }

    const reviewer = this.ai;

    // Build planner system prompt with QUESTION YOURSELF section
    const plannerSystemPrompt = this.buildPlannerSystemPrompt(constraints);

    const plannerUserPrompt = this.buildPlannerUserPrompt(
      userIntent,
      constraints,
      domain,
      priorArtQuery,
      successFormat,
    );

    // First planner call
    const plannerResult = await this.ai.generate(plannerUserPrompt, {
      systemPrompt: plannerSystemPrompt,
      role: AiModelRole.FAST,
    });
    if (!plannerResult.isSuccess) {
      return DataProcessResult.failure(
        'PLANNER_AI_FAILED',
        plannerResult.errorMessage ?? 'Planner AI call failed',
      );
    }

    let plannerRawText = String(plannerResult.data?.['text'] ?? '');
    const plannerModel = String(plannerResult.data?.['model'] ?? 'unknown');
    let plannerCost = (plannerResult.data?.['cost'] as number) ?? 0;
    const plannerTokensUsed = plannerResult.data?.['tokens_used'] as
      | Record<string, number>
      | undefined;
    let plannerInputTokens = plannerTokensUsed?.['input'] ?? 0;
    let plannerOutputTokens = plannerTokensUsed?.['output'] ?? 0;

    // Retry once if tech names found
    if (TECH_NAME_REGEX.test(plannerRawText)) {
      this.logger.warn('Planner output contains technology names — retrying with reinforcement');
      const reinforcedPrompt =
        plannerUserPrompt +
        '\n\nIMPORTANT REINFORCEMENT: Your previous response contained specific technology names (e.g. NestJS, Redis, Kafka). You MUST NOT mention any technology, framework, database, or library names. Describe steps in purely abstract, business-domain terms.';
      const retryResult = await this.ai.generate(reinforcedPrompt, {
        systemPrompt: plannerSystemPrompt,
        role: AiModelRole.FAST,
      });
      if (retryResult.isSuccess) {
        plannerRawText = String(retryResult.data?.['text'] ?? '');
        plannerCost += (retryResult.data?.['cost'] as number) ?? 0;
        const retryTokensUsed = retryResult.data?.['tokens_used'] as
          | Record<string, number>
          | undefined;
        plannerInputTokens += retryTokensUsed?.['input'] ?? 0;
        plannerOutputTokens += retryTokensUsed?.['output'] ?? 0;
      }
    }

    // Parse planner output
    let plannerOutput: Record<string, unknown>;
    try {
      plannerOutput = this.parseJson(plannerRawText);
    } catch {
      return DataProcessResult.failure(
        'PLANNER_PARSE_FAILED',
        'Failed to parse planner AI output as JSON',
      );
    }

    const steps = (plannerOutput['steps'] as Record<string, unknown>[]) ?? [];

    // Build reviewer prompt
    const reviewerSystemPrompt = this.buildReviewerSystemPrompt();
    const reviewerUserPrompt = this.buildReviewerUserPrompt(steps, userIntent, constraints);

    const reviewerResult = await reviewer.generate(reviewerUserPrompt, {
      systemPrompt: reviewerSystemPrompt,
      role: AiModelRole.FAST,
    });
    if (!reviewerResult.isSuccess) {
      return DataProcessResult.failure(
        'REVIEWER_AI_FAILED',
        reviewerResult.errorMessage ?? 'Reviewer AI call failed',
      );
    }

    const reviewerModel = String(reviewerResult.data?.['model'] ?? 'unknown');
    const reviewerRawText = String(reviewerResult.data?.['text'] ?? '');
    const reviewerCost = (reviewerResult.data?.['cost'] as number) ?? 0;
    const reviewerTokensUsed = reviewerResult.data?.['tokens_used'] as
      | Record<string, number>
      | undefined;
    const reviewerInputTokens = reviewerTokensUsed?.['input'] ?? 0;
    const reviewerOutputTokens = reviewerTokensUsed?.['output'] ?? 0;

    let reviewerOutput: Record<string, unknown>;
    try {
      reviewerOutput = this.parseJson(reviewerRawText);
    } catch {
      return DataProcessResult.failure(
        'REVIEWER_PARSE_FAILED',
        'Failed to parse reviewer AI output as JSON',
      );
    }

    // Compute grade
    const coverage =
      (reviewerOutput['coverage'] as Array<{ clause: string; verdict: string; step: number }>) ??
      [];
    const abstractionViolations = (reviewerOutput['abstractionViolations'] as string[]) ?? [];
    const responsibilityFlags = (reviewerOutput['responsibilityFlags'] as string[]) ?? [];
    const dependencyGaps = (reviewerOutput['dependencyGaps'] as string[]) ?? [];

    const coverageScore =
      coverage.length === 0
        ? 1.0
        : (() => {
            const total = coverage.reduce((sum, c) => {
              if (c.verdict === 'COVERED') return sum + 1.0;
              if (c.verdict === 'PARTIAL') return sum + 0.5;
              return sum; // MISSING = 0.0
            }, 0);
            return total / coverage.length;
          })();

    // Component scores — binary for abstraction/dependency so violations are clear signals
    const abstractionScore = abstractionViolations.length === 0 ? 1.0 : 0.0;
    const responsibilityScore =
      steps.length === 0 ? 0 : Math.max(0, 1 - responsibilityFlags.length / steps.length);
    const dependencyScore = dependencyGaps.length === 0 ? 1.0 : 0.0;

    // ── Option C (FREEDOM-ready): weighted additive formula ──────────────────
    // Weights default here; move to FREEDOM config (xiigen.planner.grade.weights)
    // when Cycle 4 DPO triples exist and config-selection (SK-523) is active.
    //
    //  w_coverage     = 0.40  — did the plan cover every intent clause?
    //  w_abstraction  = 0.35  — is the plan technology-neutral?
    //  w_responsibility = 0.15 — single responsibility per step?
    //  w_dependency   = 0.10  — are sequential dependencies declared?
    //
    // Any-violation consequences under these weights:
    //  dependency gap alone:    1.0×0.40 + 1.0×0.35 + 1.0×0.15 + 0.0×0.10 = 0.90 (passes)
    //  abstraction violation:   1.0×0.40 + 0.0×0.35 + 1.0×0.15 + 1.0×0.10 = 0.65 (fails)
    //  both violations:         1.0×0.40 + 0.0×0.35 + 1.0×0.15 + 0.0×0.10 = 0.55 (fails decisively)
    //
    // Rationale: missing dependency declarations are a format issue (fixable via
    // prompt — Option B). A plan with correct coverage + abstraction + responsibilities
    // but imperfect dependency notation should not be rejected; it should improve over
    // training rounds. Tech-neutral failure (abstraction=0) is a correctness issue → fails.
    const wCoverage = 0.4;
    const wAbstraction = 0.35;
    const wResponsibility = 0.15;
    const wDependency = 0.1;

    const grade =
      coverageScore * wCoverage +
      abstractionScore * wAbstraction +
      responsibilityScore * wResponsibility +
      dependencyScore * wDependency;
    const hasMissingCoverage = coverage.some((c) => c.verdict === 'MISSING');
    const accepted = !hasMissingCoverage && grade >= gradeThreshold;

    const reviewerGaps: string[] = [
      ...abstractionViolations,
      ...responsibilityFlags,
      ...dependencyGaps,
      ...coverage.filter((c) => c.verdict === 'MISSING').map((c) => `MISSING: ${c.clause}`),
    ];

    const visibilityId = randomUUID();

    // DNA-8: storeDocument BEFORE returning
    await this.db.storeDocument(
      'xiigen-cycle-visibility',
      {
        id: visibilityId,
        cycleType: 'CYCLE_1_PLANNER',
        flowId,
        tenantId,
        runId,
        sent: {
          userIntent,
          domain: domain ?? null,
          constraints,
          priorArtQuery,
          successFormat: successFormat ?? null,
        },
        received: {
          plannerOutput: steps,
          reviewerOutput,
        },
        decided: {
          grade,
          accepted,
          acceptedBecause: accepted ? 'grade >= threshold' : 'grade < threshold',
        },
        changed: accepted
          ? `xiigen-rag-patterns key ${flowId}/cycle1-plan updated`
          : `plan rejected at grade ${grade} — no RAG update`,
      } as Record<string, unknown>,
      visibilityId,
    );

    const totalCost = plannerCost + reviewerCost;
    return DataProcessResult.success({
      data: {
        planSteps: steps,
        grade,
        reviewerGaps,
        accepted,
        plannerModel,
        reviewerModel,
        visibilityId,
        plannerSystemPrompt,
        plannerUserPrompt,
      } as Record<string, unknown>,
      metadata: {
        cost: totalCost,
        model: plannerModel,
        tokensUsed: {
          input: plannerInputTokens + reviewerInputTokens,
          output: plannerOutputTokens + reviewerOutputTokens,
        },
      } as Record<string, unknown>,
    });
  }

  private buildPlannerSystemPrompt(constraints: string[]): string {
    return `You are an expert abstract flow planner for the XIIGen engine.
You produce technology-neutral implementation plans — never mention specific frameworks, databases, libraries, or languages.

CONSTRAINTS (must be reflected in plan):
${constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}

DEPENDENCY NOTATION — MANDATORY RULE:
Every step must list the index numbers of ALL prior steps it depends on.
A step depends on step N when it needs output, data, or state produced by step N.
- Step 1 always has "dependencies": []
- All later steps MUST declare their dependencies — never leave "dependencies": [] unless truly independent
- A step that uses the result of step 2 must include 2 in its dependencies array

Correct example for a 4-step flow:
{"steps":[
  {"index":1,"text":"Accept the incoming request and validate its basic format","intClause":"intake","dependencies":[]},
  {"index":2,"text":"Verify the requestor meets all eligibility requirements","intClause":"eligibility","dependencies":[1]},
  {"index":3,"text":"Record the outcome and update the relevant state","intClause":"record","dependencies":[1,2]},
  {"index":4,"text":"Notify the appropriate parties of the final outcome","intClause":"notification","dependencies":[3]}
]}

QUESTION YOURSELF before finalising:
1. Does every clause in the user intent map to at least one step? (intent coverage)
2. Does any step mention a specific technology name? (tech names — MUST be removed)
3. Does any step combine multiple independent responsibilities? (compound steps — must be split)
4. Does every step except step 1 explicitly list its dependencies? (required — never leave empty unless truly independent)

Respond ONLY with valid JSON. No markdown fences, no explanation.
Format: {"steps":[{"index":1,"text":"...","intClause":"...","dependencies":[]},{"index":2,"text":"...","intClause":"...","dependencies":[1]},...]}`;
  }

  private buildPlannerUserPrompt(
    userIntent: string,
    constraints: string[],
    domain?: string,
    priorArtQuery?: string,
    successFormat?: string,
  ): string {
    const lines: string[] = [
      `USER INTENT: ${userIntent}`,
      `CONSTRAINTS: ${constraints.join(', ')}`,
    ];
    if (domain) lines.push(`DOMAIN: ${domain}`);
    if (priorArtQuery && priorArtQuery !== 'NO_PRIOR_ART')
      lines.push(`PRIOR ART: ${priorArtQuery}`);
    if (successFormat) lines.push(`SUCCESS FORMAT: ${successFormat}`);
    lines.push('\nProduce the abstract plan steps as JSON.');
    return lines.join('\n');
  }

  private buildReviewerSystemPrompt(): string {
    return `You are a rigorous plan reviewer for the XIIGen engine.
Review the plan steps against the user intent and produce a structured assessment.

DEPENDENCY REVIEW RULE: Only flag a dependency gap if a step uses output from a prior step
but that prior step's index is NOT listed in the step's "dependencies" array.
Do NOT flag a gap simply because a sequential flow is "obvious" — flag it only when the
dependencies array is provably incomplete for this specific step.

Respond ONLY with valid JSON. No markdown fences.
Format:
{
  "coverage": [{"clause": "...", "verdict": "COVERED|PARTIAL|MISSING", "step": <index or 0>}],
  "abstractionViolations": ["step N: <specific technology name found>"],
  "responsibilityFlags": ["step N: <two distinct responsibilities combined>"],
  "dependencyGaps": ["step N: uses output of step M but M not in dependencies array"]
}`;
  }

  private buildReviewerUserPrompt(
    steps: Record<string, unknown>[],
    userIntent: string,
    constraints: string[],
  ): string {
    return `USER INTENT: ${userIntent}
CONSTRAINTS: ${constraints.join(', ')}

PLAN STEPS:
${JSON.stringify(steps, null, 2)}

Review the plan and return your structured assessment as JSON.`;
  }

  private parseJson(raw: string): Record<string, unknown> {
    let text = raw.trim();

    // Strip markdown fences anywhere in the response (not just at position 0).
    // Claude and other LLMs frequently wrap JSON in prose + ```json blocks.
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) {
      text = fenceMatch[1].trim();
    } else if (text.startsWith('```')) {
      // Legacy: fence at position 0 without closing fence found above
      text = text
        .split('\n')
        .slice(1)
        .join('\n')
        .replace(/```\s*$/, '')
        .trim();
    } else {
      // Extract first JSON object or array from text (handles prose prefix)
      const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) text = jsonMatch[1].trim();
    }

    return JSON.parse(text) as Record<string, unknown>;
  }
}
