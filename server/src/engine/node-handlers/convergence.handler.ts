/**
 * convergence.handler — Cycle 2: Self-Judge Teaching Round NODE Generation
 *
 * Delegates the N-round self-judge loop to TeachingRoundService.
 * Each round: 3 providers (Gemini/OpenAI/Claude) self-generate + self-judge.
 * Best NODE selected by highest self-score across all rounds.
 * CYCLE-4 handoff record stored after rounds complete (DNA-8).
 * Arbiter panel evaluates winning node.
 *
 * Architecture decision (v4.0):
 *   Provider assignment is topology (Node1=Gemini, Node2=OpenAI, Node3=Claude).
 *   No env var controls provider routing. Missing key → graceful mock degradation.
 *
 * DNA-1: Record<string, unknown> for all fabric calls
 * DNA-3: never throw, always return DataProcessResult
 * DNA-5: tenantId from ctx, never passed to fabric
 * DNA-8: storeDocument BEFORE returning result
 */

import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import {
  IAiProvider,
  AI_PROVIDER,
  AiModelRole,
} from '../../fabrics/interfaces/ai-provider.interface';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import {
  IFreedomConfigService,
  FREEDOM_CONFIG_SERVICE,
} from '../../freedom/freedom-config.interface';
import { XIIGEN_FREEDOM_KEYS } from '../../freedom/config-schema';
import { DataProcessResult } from '../../kernel/data-process-result';
import { INodeHandler, NodeHandlerContext, NodeHandlerResult } from './node-handler.types';
import { TeachingRoundService } from '../teaching-round.service';
import { randomUUID } from 'crypto';

// FREEDOM config keys — override via POST /api/freedom-config to change per-environment
// Dev default (single arbiter) prevents silent $20 burns on first run.
// Production override: ["Domain","Principles","IronRules","Security"] for full validation.
const ARBITER_CONFIG_KEY_PREFIX = 'xiigen.convergence.arbiters';
const SAFE_DEFAULT_ARBITERS = ['IronRules'];

/**
 * Two-layer context rule (XIIGEN-ARCHITECTURAL-DECISION-ADDENDUM):
 *   Generator AI receives: LOCAL FLOOR only (stepText, constraints, upstreamContext, ragResults)
 *   Arbiter AI receives: LOCAL FLOOR + challengerContext (parentNode, delegatedScope)
 *
 * parentNode MUST NOT appear in the generator/teaching round prompts.
 * parentNode is provided to arbiters so they can raise consistency concerns.
 */
interface ChallengerContext {
  parentNode?: Record<string, unknown>;
  parentDepth?: number;
  delegatedScope?: string;
}

interface ArbiterVerdict {
  arbiter: string;
  verdict: 'PASS' | 'CONCERN' | 'BLOCK';
  criterion: string;
  detail: string;
}

/** G4: Dynamic arbiter result — one per uncovered constraint */
interface DynamicArbiterResult {
  concern: string;
  verdict: 'PASS' | 'CONCERN' | 'BLOCK';
  reason: string;
  evaluationId: string;
}

@Injectable()
export class ConvergenceHandler implements INodeHandler {
  readonly nodeType = 'convergence';
  private readonly logger = new Logger(ConvergenceHandler.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly ai: IAiProvider, // arbiters only
    private readonly teachingRound: TeachingRoundService, // owns N-round loop
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Optional()
    @Inject(FREEDOM_CONFIG_SERVICE)
    private readonly freedomConfig: IFreedomConfigService | null = null,
  ) {}

  async handle(ctx: NodeHandlerContext): Promise<DataProcessResult<NodeHandlerResult>> {
    const { inputs, flowId, tenantId, runId } = ctx;

    const stepText = String(inputs['stepText'] ?? '').trim();
    const constraints = (inputs['constraints'] as string[] | undefined) ?? [];
    const stepType = String(inputs['stepType'] ?? 'REGISTRATION');
    const upstreamContext = inputs['upstreamContext']
      ? String(inputs['upstreamContext'])
      : undefined;
    const ragResults = String(inputs['ragResults'] ?? 'NO_PRIOR_NODES');
    const gradeThreshold =
      typeof inputs['gradeThreshold'] === 'number' ? inputs['gradeThreshold'] : 0.85;
    // G1/G4-CC: previous cycle summaries injected by CycleChainService for cross-step enrichment
    const prevCycleSummaries = inputs['prevCycleSummaries'] as string[] | undefined;

    // Two-layer context: challenger context is SEPARATE from generator context (never merged)
    const challengerCtx = (inputs['challengerContext'] as ChallengerContext | undefined) ?? {};
    const parentNode = challengerCtx.parentNode ?? null;
    const delegatedScope = challengerCtx.delegatedScope ?? null;
    const explicitChallengerRoles = inputs['challengerRoles'] as string[] | undefined;

    if (!stepText) {
      return DataProcessResult.failure(
        'CONVERGENCE_MISSING_STEP',
        'stepText is required and must not be empty',
      );
    }
    if (!constraints || constraints.length === 0) {
      return DataProcessResult.failure(
        'CONVERGENCE_MISSING_CONSTRAINTS',
        'constraints is required and must not be empty',
      );
    }

    // Read FREEDOM config for round parameters — caller owns config reads, not TeachingRoundService
    const minRounds = await this.getConfig<number>(XIIGEN_FREEDOM_KEYS.CONVERGENCE_MIN_ROUNDS, 10);
    const maxRounds = await this.getConfig<number>(XIIGEN_FREEDOM_KEYS.CONVERGENCE_MAX_ROUNDS, 20);
    const stagnationDrift = await this.getConfig<number>(
      XIIGEN_FREEDOM_KEYS.CONVERGENCE_STAGNATION_DRIFT,
      0.1,
    );

    // Parse retrieved patterns from ragResults string (for CI check below)
    let retrievedPatterns: Array<Record<string, unknown>> = [];
    if (ragResults !== 'NO_PRIOR_NODES') {
      try {
        retrievedPatterns = JSON.parse(ragResults) as Array<Record<string, unknown>>;
      } catch {
        /* ignore parse errors */
      }
    }

    // CONTEXT_INSUFFICIENT check — SK-452 pre-flight (rule-based, no AI call)
    // Fires BEFORE teaching rounds to halt under-constrained or over-specified steps.
    const contextCheck = this.evaluateContextSufficiency({ stepText, retrievedPatterns });
    if (!contextCheck.sufficient) {
      this.logger.warn(
        `ConvergenceHandler: CI signal for "${stepText.slice(0, 60)}" — ${contextCheck.gap}`,
      );
      return DataProcessResult.failure(
        'CONTEXT_INSUFFICIENT',
        contextCheck.gap ?? 'Context insufficient',
        { questions: contextCheck.questions ?? [] },
      );
    }

    // Build prompts — generator receives LOCAL FLOOR only (no parentNode)
    const nodePrompt = this.buildNodePrompt(stepText, constraints, upstreamContext, ragResults);
    const judgeSystemPrompt = this.buildJudgeSystemPrompt();

    // G1: Build differentiated nodePromptB for slot 1 (Model B) when FREEDOM enabled
    const modelBEnriched = await this.getConfig<boolean>(
      XIIGEN_FREEDOM_KEYS.CONVERGENCE_MODEL_B_ENRICHED,
      false,
    );
    const nodePromptB =
      modelBEnriched && prevCycleSummaries?.length
        ? this.buildEnrichedNodePrompt(
            stepText,
            constraints,
            upstreamContext,
            ragResults,
            prevCycleSummaries,
          )
        : undefined;

    // Compute topology depth: parentDepth + 1 (parentDepth=0 → this node is depth 1).
    // parentDepth absent (top-level call) → depth = 0.
    const nodeDepth = challengerCtx.parentDepth != null ? challengerCtx.parentDepth + 1 : 0;

    // Run N teaching rounds via TeachingRoundService — loop is NOT here
    const roundResult = await this.teachingRound.run({
      nodePrompt,
      judgeSystemPrompt,
      stepText,
      constraints,
      minRounds,
      maxRounds,
      stagnationDrift,
      flowId,
      runId,
      tenantId,
      depth: nodeDepth,
      nodeIntent: stepText,
      nodePromptB,
    });

    if (!roundResult.isSuccess) {
      return DataProcessResult.failure(
        'CONVERGENCE_ROUNDS_FAILED',
        roundResult.errorMessage ?? 'Teaching rounds failed',
      );
    }

    const { bestOutput, bestModel, bestScore, triples } = roundResult.data!;

    // Parse bestOutput → NODE spec
    const parsedNode = this.tryParseNode(bestOutput);
    const winningNode: Record<string, unknown> = {
      ...(parsedNode ?? this.makeMinimalNode(bestOutput, stepText, constraints)),
      metadata: {
        model: bestModel,
        bestSelfScore: bestScore,
        roundsCompleted: triples.length,
        stagnationFired: triples.length < maxRounds,
        cost: 0, // populated after arbiters complete
      } as Record<string, unknown>,
    };

    // ── DNA-8: Store CYCLE-4 handoff BEFORE arbiters ──────────────────────────
    const cycle4Id = randomUUID();
    await this.db.storeDocument(
      'xiigen-training-data',
      {
        id: cycle4Id,
        station: 'CYCLE-4',
        curriculumTier: 1,
        knowledgeScope: 'PRIVATE',
        status: 'PENDING_IMPLEMENTATION',
        nodeSpec: bestOutput,
        implementingModel: 'claude-code',
        targetGrade: 0.95,
        bestTeachingModel: bestModel,
        bestTeachingScore: bestScore,
        totalDpoTriples: triples.length,
        depth: nodeDepth,
        nodeIntent: stepText,
        flowId,
        runId,
        tenantId,
        stepText,
        timestamp: new Date().toISOString(),
      } as Record<string, unknown>,
      cycle4Id,
    );

    // ── Arbiter panel ─────────────────────────────────────────────────────────
    // Explicit list wins; else FREEDOM config; else safe default (1 arbiter)
    const configuredArbiters = await this.readArbiterConfig(stepType);
    const arbiterNames = explicitChallengerRoles ?? configuredArbiters;

    const arbiterVerdicts: ArbiterVerdict[] = [];
    let blockCount = 0;
    let arbiterCostTotal = 0;

    for (const arbiterName of arbiterNames) {
      // Arbiters receive parentNode (challenger context) — teaching round did NOT
      const arbiterPrompt = this.buildArbiterPrompt(
        arbiterName,
        winningNode,
        stepText,
        constraints,
        parentNode,
        delegatedScope,
      );
      const arbiterResult = await this.ai.generate(arbiterPrompt, {
        maxTokens: 256,
        temperature: 0,
        role: AiModelRole.FAST,
      });

      if (arbiterResult.isSuccess) {
        arbiterCostTotal += (arbiterResult.data?.['cost'] as number) ?? 0;
        const arbiterText = String(arbiterResult.data?.['text'] ?? '');
        const parsed = this.tryParseArbiter(arbiterText);
        const rawVerdict = parsed?.verdict ?? 'PASS';
        const typedVerdict: 'PASS' | 'CONCERN' | 'BLOCK' =
          rawVerdict === 'BLOCK' ? 'BLOCK' : rawVerdict === 'CONCERN' ? 'CONCERN' : 'PASS';
        const verdict: ArbiterVerdict = {
          arbiter: arbiterName,
          verdict: typedVerdict,
          criterion: parsed?.criterion ?? arbiterName,
          detail: parsed?.detail ?? arbiterText,
        };
        arbiterVerdicts.push(verdict);
        if (verdict.verdict === 'BLOCK') blockCount++;
      } else {
        arbiterVerdicts.push({
          arbiter: arbiterName,
          verdict: 'CONCERN',
          criterion: arbiterName,
          detail: 'Arbiter call failed — treating as CONCERN',
        });
      }
    }

    // Grade: self-judge score on 0-10 scale → normalise to 0-1. Blocks zero the grade.
    const normalisedScore = bestScore / 10;
    const baseGrade = normalisedScore * (blockCount === 0 ? 1.0 : 0.0);
    const baseAccepted = blockCount === 0 && normalisedScore >= gradeThreshold;

    // G4: Dynamic arbiter expansion — check for uncovered constraints when base arbiters pass
    const dynamicArbitersEnabled = await this.getConfig<boolean>(
      XIIGEN_FREEDOM_KEYS.CONVERGENCE_DYNAMIC_ARBITERS,
      false,
    );

    let dynamicArbiterResults: DynamicArbiterResult[] = [];
    let dynamicBlock = false;

    if (dynamicArbitersEnabled && baseAccepted && winningNode) {
      // Get base arbiter expertise names for context
      const baseArbiterNames = arbiterNames.filter(Boolean);
      dynamicArbiterResults = await this.runDynamicArbiters(
        winningNode,
        constraints,
        baseArbiterNames,
        tenantId,
        prevCycleSummaries,
      );
      dynamicBlock = dynamicArbiterResults.some((r) => r.verdict === 'BLOCK');
    }

    const grade = dynamicBlock ? 0 : baseGrade;
    const accepted = baseAccepted && !dynamicBlock;

    // Build rejectionReason when not accepted — enables cycle2Traces observability (Plan B Phase 0)
    const rejectionReason: string | undefined = accepted
      ? undefined
      : dynamicBlock
        ? `Dynamic arbiter BLOCK: ${dynamicArbiterResults
            .filter((r) => r.verdict === 'BLOCK')
            .map((r) => r.concern)
            .join(', ')}`
        : blockCount > 0
          ? `ARBITER_BLOCK: ${arbiterVerdicts
              .filter((v) => v.verdict === 'BLOCK')
              .map((v) => `${v.arbiter} — ${v.detail}`)
              .join('; ')}`
          : `GRADE_BELOW_THRESHOLD: grade=${grade.toFixed(3)} threshold=${gradeThreshold}`;

    // ── Store accepted NODE to xiigen-node-definitions (DNA-8: before visibility) ──
    const nodeDefinitionId = randomUUID();
    if (accepted) {
      await this.db.storeDocument(
        'xiigen-node-definitions',
        {
          id: nodeDefinitionId,
          nodeId: nodeDefinitionId,
          flowId,
          runId,
          tenantId,
          stepText,
          stepType,
          winningNode,
          grade,
          depth: challengerCtx.parentDepth != null ? challengerCtx.parentDepth + 1 : 1,
          parentLinked: parentNode !== null,
          delegatedScope: delegatedScope ?? null,
          createdAt: new Date().toISOString(),
        } as Record<string, unknown>,
        nodeDefinitionId,
      );
    }

    // ── Visibility record (DNA-8: before returning) ────────────────────────────
    const visibilityId = randomUUID();
    await this.db.storeDocument(
      'xiigen-cycle-visibility',
      {
        id: visibilityId,
        cycleType: 'CYCLE-2',
        flowId,
        tenantId,
        runId,
        sent: {
          stepText,
          constraints,
          stepType,
          upstreamContext: upstreamContext ?? null,
          ragResults,
          minRounds,
          maxRounds,
        },
        received: {
          bestOutput,
          bestModel,
          bestScore,
          roundsCompleted: triples.length,
        },
        decided: {
          grade,
          accepted,
          normalisedScore,
          arbiterVerdicts: arbiterVerdicts
            .map((v) => ({ [v.arbiter]: v.verdict }))
            .reduce((a, b) => ({ ...a, ...b }), {}),
          dynamicArbiterResults,
          cycle4Id,
        },
        changed: accepted
          ? `winning NODE (model ${bestModel}, selfScore ${bestScore.toFixed(1)}/10) stored`
          : `NODE rejected — grade ${grade.toFixed(3)} below threshold or ${blockCount} BLOCK verdict(s)`,
      } as Record<string, unknown>,
      visibilityId,
    );

    // Patch metadata.cost with full cycle total
    (winningNode['metadata'] as Record<string, unknown>)['cost'] = arbiterCostTotal;

    return DataProcessResult.success({
      data: {
        winningNode,
        bestOutput,
        bestModel,
        bestScore,
        roundsCompleted: triples.length,
        stagnationFired: triples.length < maxRounds,
        arbiterVerdicts,
        dynamicArbiterResults,
        grade,
        accepted,
        rejectionReason,
        visibilityId,
        cycle4Id,
        nodePrompt,
        judgeSystemPrompt,
        triples,
      } as Record<string, unknown>,
      metadata: {
        cost: arbiterCostTotal,
        model: bestModel,
      } as Record<string, unknown>,
    });
  }

  /**
   * Read arbiter list from FREEDOM config.
   * Key pattern: xiigen.convergence.arbiters.{stepType}
   * Safe default: ['IronRules'] — prevents silent burns when config absent.
   * DNA-3: never throws.
   */
  private async readArbiterConfig(stepType: string): Promise<string[]> {
    try {
      const key = `${ARBITER_CONFIG_KEY_PREFIX}.${stepType.toLowerCase()}`;
      const record = await this.freedomConfig?.get(key);
      if (record && Array.isArray(record['value']) && (record['value'] as unknown[]).length > 0) {
        return record['value'] as string[];
      }
    } catch {
      /* DNA-3 */
    }
    return SAFE_DEFAULT_ARBITERS;
  }

  /**
   * G4: Identify which NODE constraints are not covered by base arbiters.
   * Uses AI judge with FAST role for efficiency. Returns [] on failure (DNA-3).
   */
  private async identifyUncoveredConcerns(
    nodeConstraints: string[],
    baseArbiterNames: string[],
    prevCycleSummaries?: string[],
  ): Promise<string[]> {
    if (nodeConstraints.length === 0) return [];

    const cycleContext = prevCycleSummaries?.length
      ? [
          '',
          'Previous cycle decisions (concerns already identified in prior steps):',
          ...prevCycleSummaries.map((s, i) => `  Step ${i + 1}: ${s}`),
          'Consider these when judging which current constraints are truly uncovered.',
        ].join('\n')
      : '';

    const prompt = [
      'Identify which of the following NODE constraints are NOT adequately covered',
      'by any of the base arbiters listed.',
      '',
      `Base arbiters (their concern domains): ${baseArbiterNames.join(', ')}`,
      cycleContext,
      '',
      'NODE constraints:',
      ...nodeConstraints.map((c, i) => `  ${i + 1}. ${c}`),
      '',
      'Return ONLY valid JSON: { "uncovered": ["constraint text", ...] }',
      'Include a constraint only if its concern domain is absent from all base arbiters.',
      'If all constraints are covered: { "uncovered": [] }',
    ].join('\n');

    try {
      const result = await this.ai.generate(prompt, { role: AiModelRole.FAST });
      const parsed = JSON.parse(String(result.data?.['text'] ?? '{}')) as { uncovered?: string[] };
      return Array.isArray(parsed.uncovered) ? parsed.uncovered : [];
    } catch {
      return [];
    }
  }

  /**
   * G4: Build an evaluation prompt for a single dynamic arbiter concern.
   */
  private buildDynamicArbiterPrompt(concern: string, node: Record<string, unknown>): string {
    return [
      'Evaluate whether the following NODE design adequately addresses this constraint:',
      `Constraint: "${concern}"`,
      `NODE: ${JSON.stringify({ intent: node['intent'], structure: node['structure'] })}`,
      '',
      'Return ONLY valid JSON: { "verdict": "PASS"|"CONCERN"|"BLOCK", "reason": "<one sentence>" }',
      'BLOCK if the constraint is violated or entirely unaddressed.',
      'CONCERN if it is partially addressed but has risk.',
      'PASS if the constraint is clearly satisfied.',
    ].join('\n');
  }

  /**
   * G4: Parse dynamic arbiter AI response.
   */
  private parseDynamicArbiterResponse(text: string): {
    verdict: DynamicArbiterResult['verdict'];
    reason: string;
  } {
    try {
      const parsed = JSON.parse(text) as { verdict?: string; reason?: string };
      const verdict = (['PASS', 'CONCERN', 'BLOCK'] as const).includes(
        parsed.verdict as DynamicArbiterResult['verdict'],
      )
        ? (parsed.verdict as DynamicArbiterResult['verdict'])
        : 'CONCERN';
      return { verdict, reason: parsed.reason ?? 'No reason provided' };
    } catch {
      return { verdict: 'CONCERN', reason: 'Arbiter response parse failed' };
    }
  }

  /**
   * G4: Run dynamic arbiters for uncovered constraints.
   * DNA-8: stores each evaluation result to xiigen-dynamic-arbiter-results before continuing.
   */
  private async runDynamicArbiters(
    winningNode: Record<string, unknown>,
    constraints: string[],
    baseArbiterNames: string[],
    tenantId: string,
    prevCycleSummaries?: string[],
  ): Promise<DynamicArbiterResult[]> {
    const nodeConstraints = (winningNode['constraints'] as string[] | undefined) ?? constraints;
    const uncoveredConcerns = await this.identifyUncoveredConcerns(
      nodeConstraints,
      baseArbiterNames,
      prevCycleSummaries,
    );

    if (uncoveredConcerns.length === 0) return [];

    const results: DynamicArbiterResult[] = [];
    for (const concern of uncoveredConcerns) {
      const evalId = randomUUID();
      const prompt = this.buildDynamicArbiterPrompt(concern, winningNode);
      const evalResult = await this.ai.generate(prompt, { role: AiModelRole.FAST });
      const parsed = this.parseDynamicArbiterResponse(String(evalResult.data?.['text'] ?? ''));
      results.push({ concern, ...parsed, evaluationId: evalId });
      // DNA-8: store before continuing loop
      await this.db.storeDocument(
        'xiigen-dynamic-arbiter-results',
        {
          id: evalId,
          concern,
          verdict: parsed.verdict,
          reason: parsed.reason,
          tenantId,
          connectionType: 'FLOW_SCOPED',
          knowledgeScope: 'PRIVATE',
          createdAt: new Date().toISOString(),
        } as Record<string, unknown>,
        evalId,
      );
    }
    return results;
  }

  /**
   * G1: Build an enriched nodePrompt for slot 1 (Model B) that includes
   * previous cycle summaries as additional context.
   */
  private buildEnrichedNodePrompt(
    stepText: string,
    constraints: string[],
    upstreamContext: string | undefined,
    ragResults: string,
    prevCycleSummaries: string[],
  ): string {
    const base = this.buildNodePrompt(stepText, constraints, upstreamContext, ragResults);
    const cycleSection = [
      'PREVIOUS CYCLES (context from earlier steps in this run):',
      ...prevCycleSummaries.map((s, i) => `  Step ${i + 1}: ${s}`),
    ].join('\n');
    return `${base}\n\n${cycleSection}`;
  }

  private buildJudgeSystemPrompt(): string {
    return [
      'You are evaluating a NODE specification you just produced.',
      'Score it 0–10 on four criteria:',
      '  - Structure (0-2.5): all four NODE fields present and well-formed',
      '  - Intent (0-2.5): purpose is technology-neutral and user-facing',
      '  - Constraints (0-2.5): each constraint is specific and enforceable',
      '  - Quality (0-2.5): acceptance criteria are measurable and complete',
      '9.5+ = production-ready with no modifications needed.',
      '7–9.4 = usable but has improvable gaps.',
      'Below 7 = structural or intent gaps present.',
      'Respond ONLY with valid JSON, no extra text:',
      '{ "score": <number 0-10>, "reasoning": "<one sentence>" }',
    ].join('\n');
  }

  private buildNodePrompt(
    stepText: string,
    constraints: string[],
    upstreamContext?: string,
    ragResults?: string,
  ): string {
    const systemSection = [
      'You are an expert abstract NODE designer for the XIIGen engine.',
      'Generate a technology-neutral NODE specification for the given step.',
      '',
      'CONSTRAINTS:',
      ...constraints.map((c, i) => `${i + 1}. ${c}`),
      '',
      'QUESTION YOURSELF before finalising:',
      '1. Does this node have a single, clear responsibility? (single responsibility)',
      '2. Are all constraints reflected in the node specification? (constraint coverage)',
      '3. Are failure modes specific and meaningful? (failure mode specificity)',
      '4. Are there any technology names or library references? (technology neutrality — MUST be removed)',
      '',
      'Respond ONLY with valid JSON. No markdown fences.',
      'Format:',
      '{',
      '  "structure": { "inputShape": [], "outputShape": [], "triggers": [], "emits": [], "dependencies": [] },',
      '  "intent": { "purpose": "...", "invariants": [], "failureModes": [], "domainConcepts": [] },',
      '  "constraints": [],',
      '  "quality": { "scoringCriteria": [], "acceptanceThreshold": 0.85, "degradationAcceptable": false }',
      '}',
    ].join('\n');

    const userLines = [`STEP: ${stepText}`, `CONSTRAINTS: ${constraints.join(', ')}`];
    if (upstreamContext) userLines.push(`UPSTREAM CONTEXT: ${upstreamContext}`);
    if (ragResults && ragResults !== 'NO_PRIOR_NODES') userLines.push(`PRIOR NODES: ${ragResults}`);
    userLines.push('\nGenerate the NODE specification as JSON.');

    return `${systemSection}\n\n---\n\n${userLines.join('\n')}`;
  }

  private buildArbiterPrompt(
    arbiterName: string,
    node: Record<string, unknown>,
    stepText: string,
    constraints: string[],
    parentNode: Record<string, unknown> | null,
    delegatedScope: string | null,
  ): string {
    let prompt = `You are the ${arbiterName} arbiter for the XIIGen engine.
Evaluate this NODE specification for the ${arbiterName} criterion only.

STEP: ${stepText}
CONSTRAINTS: ${constraints.join(', ')}

NODE:
${JSON.stringify(node, null, 2)}`;

    if (parentNode) {
      prompt += `\n\nPARENT NODE (for consistency checking — raise CONCERN if this NODE conflicts):
${JSON.stringify(parentNode, null, 2)}`;
      if (delegatedScope) {
        prompt += `\n\nDELEGATED SCOPE from parent: "${delegatedScope}"
Raise CONCERN if this NODE's scope exceeds or misses what the parent delegated.`;
      }
    }

    prompt += `\n\nReturn JSON: {"verdict": "PASS|CONCERN|BLOCK", "criterion": "${arbiterName}", "detail": "..."}`;
    return prompt;
  }

  private tryParseNode(text: string): Record<string, unknown> | null {
    try {
      let raw = text.trim();
      if (raw.startsWith('```')) {
        raw = raw
          .split('\n')
          .slice(1)
          .join('\n')
          .replace(/```\s*$/, '')
          .trim();
      }
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private tryParseArbiter(
    text: string,
  ): { verdict: string; criterion: string; detail: string } | null {
    try {
      let raw = text.trim();
      if (raw.startsWith('```')) {
        raw = raw
          .split('\n')
          .slice(1)
          .join('\n')
          .replace(/```\s*$/, '')
          .trim();
      }
      return JSON.parse(raw) as { verdict: string; criterion: string; detail: string };
    } catch {
      return null;
    }
  }

  private makeMinimalNode(
    text: string,
    stepText: string,
    constraints: string[],
  ): Record<string, unknown> {
    return {
      structure: { inputShape: [], outputShape: [], triggers: [], emits: [], dependencies: [] },
      intent: {
        purpose: stepText,
        invariants: [],
        failureModes: ['processing failure'],
        domainConcepts: [],
      },
      constraints,
      quality: { scoringCriteria: [], acceptanceThreshold: 0.85, degradationAcceptable: false },
      rawText: text,
    };
  }

  /**
   * SK-452 pre-flight: evaluate three context-sufficiency rules before rounds fire.
   * Rule-based — no AI call. Returns { sufficient: true } when all rules pass.
   *
   * Rule 1 — BUNDLED_RESPONSIBILITIES: stepText contains " and " joining two distinct actions.
   * Rule 2 — NO_DOMAIN_CONSTRAINT: empty RAG + generic verb + no domain-qualifying noun (all three required).
   * Rule 3 — SINGLE_APPROACH: step is fully specified (entity + action + outcome) — no design choice possible.
   */
  private evaluateContextSufficiency(opts: {
    stepText: string;
    retrievedPatterns: Array<Record<string, unknown>>;
  }): { sufficient: boolean; gap?: string; questions?: string[] } {
    const { stepText, retrievedPatterns } = opts;
    const lower = stepText.toLowerCase();

    // Rule 1 — BUNDLED_RESPONSIBILITIES
    if (/ and /i.test(stepText)) {
      const parts = stepText.split(/ and /i);
      const VERBS = [
        'validate',
        'check',
        'store',
        'send',
        'create',
        'update',
        'delete',
        'get',
        'fetch',
        'register',
        'grant',
        'revoke',
        'verify',
        'process',
        'generate',
        'build',
        'remove',
        'assign',
        'confirm',
        'notify',
        'log',
      ];
      const p0 = parts[0]?.toLowerCase() ?? '';
      const p1 = parts[1]?.toLowerCase() ?? '';
      const p0HasVerb = VERBS.some((v) => p0.includes(v));
      const p1HasVerb = VERBS.some((v) => p1.includes(v));
      if (p0HasVerb && p1HasVerb) {
        const a = parts[0]?.trim() ?? '';
        const b = parts[1]?.trim() ?? '';
        return {
          sufficient: false,
          gap: `BUNDLED_RESPONSIBILITIES: "${a}" and "${b}" appear to be two distinct user-facing actions`,
          questions: [
            `Is "${a}" a separate concern from "${b}"?`,
            `Can "${a}" succeed while "${b}" fails independently?`,
            `Should these be two separate steps in the flow?`,
          ],
        };
      }
    }

    // Rule 2 — NO_DOMAIN_CONSTRAINT (all three conditions must be true simultaneously)
    if (retrievedPatterns.length === 0) {
      const GENERIC_VERBS = ['store', 'validate', 'send', 'check', 'create', 'update', 'delete'];
      const hasGenericVerb = GENERIC_VERBS.some(
        (v) => lower.startsWith(v) || lower.includes(` ${v} `),
      );
      if (hasGenericVerb) {
        const DOMAIN_NOUNS = [
          'email',
          'invoice',
          'order',
          'payment',
          'subscription',
          'account',
          'profile',
          'token',
          'session',
          'address',
          'preference',
          'notification',
          'appointment',
          'product',
          'cart',
          'transaction',
          'contract',
          'license',
        ];
        const hasDomainNoun = DOMAIN_NOUNS.some((d) => lower.includes(d));
        if (!hasDomainNoun) {
          const verb =
            GENERIC_VERBS.find((v) => lower.startsWith(v) || lower.includes(` ${v} `)) ??
            'operation';
          return {
            sufficient: false,
            gap: `NO_DOMAIN_CONSTRAINT: "${stepText}" uses a generic verb (${verb}) with no domain-qualifying noun and no RAG patterns available`,
            questions: [
              `What specific business entity is this ${verb} operation targeting?`,
              `What domain rules govern this ${verb}?`,
              `What is the expected output format for this domain?`,
            ],
          };
        }
      }
    }

    // Rule 3 — SINGLE_APPROACH (over-specified — implementation derivable from step alone)
    const hasArticleEntity = /\b(the|a|an)\s+\w+\b/i.test(stepText);
    const hasImplVerb = /\b(return|insert|save|persist|emit|push|write)\b/i.test(stepText);
    const hasExplicitTarget =
      /\b(with|into|in)\s+the\s+(response|body|database|queue|table|payload)\b/i.test(stepText);
    if (hasArticleEntity && hasImplVerb && hasExplicitTarget) {
      return {
        sufficient: false,
        gap: `SINGLE_APPROACH: "${stepText}" is fully specified — implementation derivable from text alone, no design choice possible`,
        questions: [
          `What design choice should the model make for this step?`,
          `Is there an alternative approach worth considering?`,
          `What trade-offs should the model evaluate?`,
        ],
      };
    }

    return { sufficient: true };
  }

  private async getConfig<T>(key: string, fallback: T): Promise<T> {
    try {
      const record = await this.freedomConfig?.get(key);
      const val = record?.['value'];
      return (val !== undefined && val !== null ? val : fallback) as T;
    } catch {
      return fallback;
    }
  }
}
