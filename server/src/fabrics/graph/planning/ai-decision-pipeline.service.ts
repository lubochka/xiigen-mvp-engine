/**
 * AiDecisionPipelineService — IAIDecisionPipeline implementation.
 *
 * 4-role protocol:
 *   1. Context retrieval    — graph edges provided by caller
 *   2. N implementors       — blind, shuffled, labeled A/B/C; parallel AI calls
 *   3. AI arbiters          — iron rules per decision type; BLOCK removes from pool
 *   4. Upper manager        — synthesize when >1 candidate survives arbiters
 *
 * V9-002: chosen.model MUST differ from rejected.model.
 *   If same model, triple stored with countsTowardThreshold: false.
 *
 * DPO triples go to xiigen-planning-decisions (not xiigen-training-data).
 * Storage failure is non-fatal — logged and ignored.
 *
 * Codebase adaptations vs plan:
 *   - AI_PROVIDER (IAiProvider) replaces AI_ENGINE
 *   - GRAPH_CONFIG_READER (IGraphConfigReader) for numeric threshold
 *   - DATABASE_SERVICE (IDatabaseService) for DPO triple storage
 *   - Model names read from env vars (PLANNING_IMPLEMENTOR_MODELS,
 *     PLANNING_ARBITER_MODEL, PLANNING_MANAGER_MODEL) with sensible defaults
 *   - IAiProvider.generate(prompt, { model }) → DataProcessResult unwrap
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IAIDecisionPipeline,
  AIPipelineDecision,
  PlanningDpoTriple,
  PlanningDecisionType,
  IGraphConfigReader,
  GRAPH_CONFIG_READER,
} from './planning-abstracts';
import { GraphEdge } from '../interfaces/graph-types';
import { IAiProvider, AI_PROVIDER, IDatabaseService, DATABASE_SERVICE } from '../../interfaces';

@Injectable()
export class AiDecisionPipelineService extends IAIDecisionPipeline {
  private readonly logger = new Logger(AiDecisionPipelineService.name);
  private readonly INDEX = 'xiigen-planning-decisions';

  constructor(
    @Inject(AI_PROVIDER) private readonly ai: IAiProvider,
    @Inject(GRAPH_CONFIG_READER) private readonly config: IGraphConfigReader,
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
  ) {
    super();
  }

  async decide(input: {
    decisionType: PlanningDecisionType;
    inputs: Record<string, unknown>;
    graphContext: GraphEdge[];
    runId: string;
    archetype?: string;
    flowId?: string;
  }): Promise<AIPipelineDecision> {
    const contextBlock = this.formatGraphContext(input.graphContext);
    const prompt = this.buildDecisionPrompt(input.decisionType, input.inputs, contextBlock);

    // ROLE 1 — N Implementors (blind, shuffled, labeled)
    const implementorModels = this.getImplementorModels();
    const candidates = await this.runImplementors(prompt, implementorModels);

    // ROLE 2 — AI Arbiters (iron rules enforcement; BLOCK removes from pool)
    const ironRules = this.getIronRulesForDecision(input.decisionType);
    const evaluated = await this.runArbiters(candidates, ironRules, contextBlock);

    const surviving = evaluated.filter((c) => c.arbiterVerdict !== 'BLOCK');
    if (surviving.length === 0) {
      this.logger.warn(
        `All candidates blocked for ${input.decisionType} — falling back to bootstrap`,
      );
      throw new Error(`AI_PIPELINE_ALL_BLOCKED:${input.decisionType}`);
    }

    // ROLE 3 — Upper Manager (synthesize when >1 candidate survives)
    const winner =
      surviving.length > 1
        ? await this.runUpperManager(surviving, contextBlock, input.decisionType)
        : surviving[0];

    const runner = surviving.find((c) => c !== winner) ?? candidates.find((c) => c !== winner);

    // V9-002 compliance check: both chosen and rejected must be real different models
    // runner?.model === 'none' means no real alternative candidate existed
    const crossModel =
      runner !== undefined && runner.model !== 'none' && winner.model !== runner.model;
    const countsTowardThreshold = crossModel;
    if (!crossModel) {
      this.logger.warn(
        `V9-002: no cross-model pair (chosen: ${winner.model}, rejected: ${runner?.model ?? 'none'}). ` +
          `Triple stored with countsTowardThreshold: false`,
      );
    }

    // Store DPO triple in xiigen-planning-decisions
    const triple: PlanningDpoTriple = {
      decisionType: input.decisionType,
      category: `PLANNING_${input.decisionType}`,
      trainingCategory: 'GENERATED',
      curriculumTier: 1,
      archetype: input.archetype,
      runId: input.runId,
      flowId: input.flowId,
      chosen: {
        decision: winner.decision,
        model: winner.model,
        reasoning: winner.reasoning,
      },
      rejected: runner
        ? {
            decision: runner.decision,
            model: runner.model,
            reasoning: runner.reasoning,
          }
        : {
            decision: null,
            model: 'none',
            reasoning: 'no alternative candidate',
          },
      teachingPoint: this.deriveTeachingPoint(winner, runner, input.decisionType),
      confidence: winner.confidence ?? 0.7,
      trainingDataQuality: 'OUTCOME_PENDING',
      countsTowardThreshold,
      createdAt: new Date().toISOString(),
    };

    await this.storeDpoTriple(triple);

    return {
      decision: winner.decision,
      reasoning: winner.reasoning,
      confidence: winner.confidence ?? 0.7,
      modelUsed: winner.model,
      alternatives: surviving
        .filter((c) => c !== winner)
        .map((c) => ({
          decision: c.decision,
          reasoning: c.reasoning,
          model: c.model,
        })),
    };
  }

  // ── Private methods ────────────────────────────────────────────────────────

  private getImplementorModels(): string[] {
    const env = process.env['PLANNING_IMPLEMENTOR_MODELS'];
    if (env)
      return env
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean);
    return ['claude-sonnet-4-5', 'gpt-4o'];
  }

  private async runImplementors(prompt: string, models: string[]) {
    const shuffled = [...models].sort(() => Math.random() - 0.5);
    const labels = ['A', 'B', 'C', 'D', 'E'].slice(0, shuffled.length);

    const responses = await Promise.all(
      shuffled.map(async (model, i) => {
        const result = await this.ai.generate(`[Candidate ${labels[i]}]\n${prompt}`, { model });
        const content = result.isSuccess ? String(result.data?.['text'] ?? '') : '';
        const decision = this.parseDecision(content);
        return {
          label: labels[i],
          model,
          decision,
          reasoning: content,
          confidence: 0.7,
          arbiterVerdict: 'PENDING' as 'PENDING' | 'PASS' | 'BLOCK',
          blockReason: undefined as string | undefined,
        };
      }),
    );

    return responses;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async runArbiters(candidates: any[], ironRules: string[], context: string) {
    const arbiterModel = process.env['PLANNING_ARBITER_MODEL'] ?? 'claude-sonnet-4-5';

    for (const candidate of candidates) {
      const verdict = await this.ai.generate(
        `Evaluate candidate ${candidate.label} against these iron rules:\n` +
          `${ironRules.join('\n')}\n\nCandidate decision:\n` +
          `${JSON.stringify(candidate.decision, null, 2)}\n\n` +
          `Context:\n${context}\n\n` +
          `Reply with exactly: PASS\nor: BLOCK: <reason>`,
        { model: arbiterModel },
      );
      const content = verdict.isSuccess ? String(verdict.data?.['text'] ?? '') : 'BLOCK: ai_error';
      const firstLine = content.trim().split('\n')[0];
      // Fail-safe: default to BLOCK on ambiguous response
      candidate.arbiterVerdict = firstLine.toUpperCase().startsWith('PASS') ? 'PASS' : 'BLOCK';
      if (candidate.arbiterVerdict === 'BLOCK') {
        candidate.blockReason = firstLine;
      }
    }

    return candidates;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async runUpperManager(surviving: any[], context: string, type: string): Promise<any> {
    // FIXED: receives 'surviving' (post-BLOCK-filter), NOT 'candidates' (pre-filter)
    const managerModel = process.env['PLANNING_MANAGER_MODEL'] ?? 'claude-opus-4-5';

    const options = surviving
      .map(
        (c, i) =>
          `Option ${i + 1} (${c.model}): ${JSON.stringify(c.decision)}\nReason: ${c.reasoning}`,
      )
      .join('\n\n');

    const response = await this.ai.generate(
      `You are the technical delivery manager making a final ${type} decision.\n\n` +
        `Context from decision graph:\n${context}\n\n` +
        `Options (all have passed arbiter review):\n${options}\n\n` +
        `Select the best option and explain why. Respond with the option number first.`,
      { model: managerModel },
    );

    const content = response.isSuccess ? String(response.data?.['text'] ?? '') : '1';
    const selected = parseInt(content.match(/^[Oo]ption\s*(\d+)/)?.[1] ?? '1', 10);
    const idx = Math.max(0, Math.min(selected - 1, surviving.length - 1));
    return surviving[idx];
  }

  private formatGraphContext(edges: GraphEdge[]): string {
    if (!edges.length) return '(no prior graph context for this decision)';
    return edges
      .map(
        (e) =>
          `${e.fromEntity} → [${e.relationship}] → ${e.toEntity}` +
          ` (confidence: ${e.confidence.toFixed(2)}, obs: ${e.observationCount})` +
          (e.reasoning ? ` — ${e.reasoning}` : ''),
      )
      .join('\n');
  }

  private buildDecisionPrompt(
    type: PlanningDecisionType,
    inputs: Record<string, unknown>,
    context: string,
  ): string {
    const prompts: Record<PlanningDecisionType, string> = {
      PANEL_ASSEMBLY:
        `Select the minimum arbiter panel for a ${inputs['archetype']} task type.\n` +
        `Context: ${inputs['contextDescription']}\nPrior graph knowledge:\n${context}\n` +
        `Available arbiters: security, iron_rules, business_logic, completeness, ` +
        `skills_patterns, key_principles, completeness_advanced\n` +
        `Return: JSON array of arbiter role names. key_principles is always required.`,
      CYCLE_ROUTING:
        `Route score ${inputs['score']} for ${inputs['archetype']} at cycle ${inputs['cycle']} of ${inputs['budget']}.\n` +
        `Bottleneck sub-score: ${inputs['bottleneck']}\nPrior routing patterns:\n${context}\n` +
        `Return: one of ACCEPT | CYCLE_WITH_PATCH | CYCLE_WITH_PATTERN | ESCALATE_TO_UPPER_JUDGE\n` +
        `With patchClass (if applicable) and reasoning.`,
      ESCALATION:
        `Evaluate escalation for ${inputs['archetype']} at cycle ${inputs['cyclesUsed']}/${inputs['cycleBudget']}.\n` +
        `Surviving candidates: ${inputs['survivingCount']}\n` +
        `Challenge count: ${inputs['maxChallenges']}\nPrior escalation patterns:\n${context}\n` +
        `Return: one of ACCEPT | CYCLE_WITH_PATCH | ESCALATE_TO_UPPER_JUDGE | ESCALATE_TO_HUMAN`,
      SIGNAL_SELECTION:
        `Determine required learning signals for flow purpose: ${inputs['purpose']}.\n` +
        `Execution context: multiGenerate=${inputs['multiGenerateRan']}, ` +
        `shadow=${inputs['shadowRunActive']}, arbiter=${inputs['arbiterPanelRan']}\n` +
        `Prior signal requirements:\n${context}\n` +
        `Return: JSON array of signal types (always include OUTCOME)`,
      BUDGET_PREDICTION:
        `Predict cycle budget for ${inputs['archetype']} task type.\n` +
        `Novel patterns: ${inputs['novelPatterns']}\nClarity note: ${inputs['hasClarityNote']}\n` +
        `Inversion case: ${inputs['isInversionCase']}\nHistorical budgets:\n${context}\n` +
        `Return: integer 1-4 with rationale`,
      SCOPE_CLASSIFICATION:
        `Classify the resolution scope for gap type: ${inputs['gapType']}.\n` +
        `Service category: ${inputs['serviceCategory']}\nDescription: ${inputs['description']}\n` +
        `Prior classifications:\n${context}\n` +
        `Return: one of CONVENTION | ADAPTATION | EXTENSION | NEW_FLOW | NEW_INFRA with rationale`,
      NODE_COMPLETENESS:
        `Grade NODE completeness for ${inputs['archetype']} archetype.\n` +
        `NODE intent: ${JSON.stringify(inputs['nodeIntent'])}\n` +
        `Archetype quality standards:\n${context}\n` +
        `Score 0-1 per dimension. Return overall score and specific suggestions.`,
      SCHEMA_CHAIN:
        `Validate schema chain for flow ${inputs['flowId']}.\n` +
        `Known chain breaks:\n${context}\nReturn: breaks array (empty if clean)`,
      BLAST_RADIUS:
        `Compute blast radius for ${inputs['changeType']} on ${inputs['artifactId']}.\n` +
        `Known dependencies:\n${context}\nReturn: files array requiring update`,
      ASSUMPTION_LINT:
        `Lint assumptions in this session file excerpt:\n${inputs['excerpt']}\n` +
        `Return: violations array (empty if clean)`,
    };

    return prompts[type] ?? `Make a ${type} decision given inputs: ${JSON.stringify(inputs)}`;
  }

  private getIronRulesForDecision(type: PlanningDecisionType): string[] {
    const rules: Record<PlanningDecisionType, string[]> = {
      PANEL_ASSEMBLY: [
        'CF-PANEL-1: key_principles MUST always be in every panel — violation produces unchecked principle drift',
        'CF-PANEL-2: P20 isolation — key_principles arbiter MUST be isolated:true — violation produces cross-contamination',
        'CF-PANEL-3: panel MUST NOT be empty — violation produces no quality checks on generated code',
      ],
      CYCLE_ROUTING: [
        'CF-CYCLE-1: STOP_STRUCTURAL MUST never be overridden — violation produces infinite retry on structurally broken code',
        'CF-CYCLE-2: CycleAction MUST include the deciding evidence — violation produces unauditable routing history',
        'CF-CYCLE-3: Score < 0.50 MUST route to STOP_STRUCTURAL — violation produces wasted cycles on broken candidates',
      ],
      ESCALATION: [
        'CF-ESC-1: BLOCK verdict MUST remove candidate from pool — violation averages in a blocked result',
        'CF-ESC-2: budget exhausted MUST escalate to upper judge — violation creates infinite cycle loop',
        'CF-ESC-3: zero surviving candidates MUST produce UNDECIDED — violation forces an invalid acceptance',
      ],
      SIGNAL_SELECTION: [
        'CF-SIGNAL-1: OUTCOME signal MUST always be emitted — violation produces untracked flow executions',
        'CF-SIGNAL-2: Missing required signal MUST fail Phase F gate — violation produces permanent corpus gaps',
      ],
      BUDGET_PREDICTION: [
        'CF-DIFF-1: Budget MUST be between 1 and 4 — violation produces invalid STATE.json',
        'CF-DIFF-2: Prediction and actual MUST both be stored — violation breaks calibration loop',
      ],
      SCOPE_CLASSIFICATION: [
        'CF-SCOPE-1: CONVENTION MUST be returned when a FREEDOM config key suffices — violation over-engineers',
        'CF-SCOPE-2: NEW_INFRA MUST be last resort only — violation produces unnecessary infrastructure',
      ],
      NODE_COMPLETENESS: [
        'CF-NODE-1: Empty failureModes MUST produce hard violation — violation allows iron rules without failure coverage',
        'CF-NODE-2: Stack terminology in purpose MUST produce hard violation — violation produces stack-coupled prompts',
      ],
      SCHEMA_CHAIN: [
        'CF-CHAIN-1: Missing field in consumer MUST be reported as CHAIN_BREAK — violation produces silent data loss',
      ],
      BLAST_RADIUS: [
        'CF-BLAST-1: All files in the dependency graph MUST be reported — violation produces stale cross-references',
      ],
      ASSUMPTION_LINT: [
        'CF-ASSUME-1: Assumption without verification command MUST be flagged — violation produces unverifiable assumptions',
        'CF-ASSUME-2: Non-blocking assumption without fallback MUST be flagged — violation blocks sessions unnecessarily',
      ],
    };
    return rules[type] ?? [];
  }

  private parseDecision(content: string): unknown {
    try {
      return JSON.parse(content);
    } catch {
      return content;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private deriveTeachingPoint(winner: any, runner: any, type: PlanningDecisionType): string {
    if (!runner) return `${type}: ${winner.reasoning}`;
    return (
      `${type}: chose ${JSON.stringify(winner.decision)} (${winner.model}) ` +
      `over ${JSON.stringify(runner.decision)} (${runner.model}). ` +
      `Reason: ${winner.reasoning}`
    );
  }

  private async storeDpoTriple(triple: PlanningDpoTriple): Promise<void> {
    try {
      const id = `${triple.runId}-${triple.decisionType}-${Date.now()}`;
      await this.db.storeDocument(this.INDEX, triple as unknown as Record<string, unknown>, id);
    } catch (err) {
      // Non-fatal — triple loss is logged but doesn't block the decision
      this.logger.error(`Failed to store planning DPO triple: ${err}`);
    }
  }
}
