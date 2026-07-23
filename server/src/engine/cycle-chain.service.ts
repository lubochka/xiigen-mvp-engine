/**
 * CycleChainService — Orchestrates Cycles 1-3 with recursive EXPAND support.
 *
 * Closes GAP-4: when Cycle 3 returns EXPAND, each sub-node from subFlowDecomposition
 * triggers a new Cycle 1 call recursively, with parentNode flowing ONLY to the
 * challenger/arbiter context — never to the generator context.
 *
 * Two-layer context rule (XIIGEN-ARCHITECTURAL-DECISION-ADDENDUM):
 *   Generator AI receives: LOCAL FLOOR (sub-node intClause as userIntent + domain + constraints)
 *   Challenger/Arbiter AI receives: LOCAL FLOOR + parentNode (for consistency challenge only)
 *
 * The generator must discover the sub-NODE from the step text alone.
 * The arbiters verify consistency with the parent without prescribing the answer.
 *
 * DNA-3: never throw, always return DataProcessResult
 * DNA-8: storeDocument called before any emit (enforced per handler)
 */

import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { CycleTrace, ArbiterTrace } from './flows/generation-loop/session-output-formatter.service';
import { PlannerHandler } from './node-handlers/planner.handler';
import { ConvergenceHandler } from './node-handlers/convergence.handler';
import { DepthDecisionHandler } from './node-handlers/depth-decision.handler';
import { RagRetrieveHandler } from './node-handlers/rag-retrieve.handler';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../fabrics/interfaces/queue.interface';
import { IFreedomConfigService, FREEDOM_CONFIG_SERVICE } from '../freedom/freedom-config.interface';
import { XIIGEN_FREEDOM_KEYS } from '../freedom/config-schema';
import { NodeHandlerContext } from './node-handlers/node-handler.types';
import { CycleGateService } from './cycle-gate.service';
import { CycleHistoryService } from './cycle-history.service';
import { RagEvaluateHandler } from './node-handlers/rag-evaluate.handler';
import { RagQueryHandler } from './node-handlers/rag-query.handler';
import { randomUUID } from 'crypto';

// Token constants for injection — handlers are already Injectable
const PLANNER_HANDLER = PlannerHandler;
const CONVERGENCE_HANDLER = ConvergenceHandler;
const DEPTH_HANDLER = DepthDecisionHandler;

export interface CycleChainInput {
  userIntent: string;
  domain?: string;
  constraints: string[];
  priorArtQuery?: string;
  flowId: string;
  runId: string;
  tenantId: string;
  currentDepth?: number;
  terminationDepth?: number;
  /** parentNode: flows to arbiter challengerContext ONLY — never to generator */
  parentNode?: Record<string, unknown>;
  delegatedScope?: string;
}

export interface TopologyNode {
  stepText: string;
  verdict: 'LEAF' | 'EXPAND';
  depth: number;
  nodeDefinitionId?: string;
  children: TopologyNode[];
}

// ── Observability types ─────────────────────────────────────────────────────

export interface DpoRoundTrace {
  round: number;
  chosen: { model: string; score: number; text: string };
  rejected: { model: string; score: number; text: string };
  discarded: { model: string; score: number; text: string } | null;
}

export interface Cycle2StepTrace {
  stepText: string;
  depth: number;
  nodeIntent: string;
  grade: number;
  accepted: boolean;
  /** Populated when accepted=false — reason the NODE was rejected (arbiter BLOCK or grade below threshold). */
  rejectionReason?: string;
  roundsCompleted: number;
  stagnationFired: boolean;
  cycle4Id: string;
  winnerModel: string;
  winnerSelfScore: number;
  arbiters: Array<{ name: string; verdict: string; detail: string }>;
  promptSent: {
    nodePrompt: string;
    judgeSystemPrompt: string;
  };
  rounds: DpoRoundTrace[];
  /** Set when this trace originates from a sub-flow run — enables tree reconstruction. */
  subFlowRunId?: string;
  parentNodeId?: string;
}

export interface Cycle3StepTrace {
  stepText: string;
  depth: number;
  verdict: 'LEAF' | 'EXPAND';
  signalsEvaluated: string[];
  signalsTriggered: string[];
  terminationBoundApplied: boolean;
  promptSent: string;
  /** Set when this trace originates from a sub-flow run. */
  subFlowRunId?: string;
}

export interface PendingImplementation {
  cycle4Id: string;
  stepText: string;
  depth: number;
  nodeIntent: string;
  nodeSpec: Record<string, unknown>;
  targetGrade: number;
  status: string;
}

/** Tracks a parent→child sub-flow relationship when EXPAND verdict fires async queue handoff. */
export interface SubFlowRef {
  id: string; // document ID in xiigen-run-state
  parentRunId: string;
  parentStepIndex: number; // which plan step produced the EXPAND verdict
  parentNodeId: string; // the NODE that was expanded
  depth: number; // child recursion depth
  subFlowIntent: string; // intClause from EXPAND decomposition
  subFlowName: string; // descriptive name from EXPAND decomposition
  status: 'PENDING' | 'RUNNING' | 'COMPLETE' | 'FAILED';
  childRunId?: string; // set by ExpandConsumerHandler when child run starts
  connectionType: string;
  tenantId: string;
  createdAt: string;
}

/** State saved when a run pauses — either EXPAND_PENDING or CONTEXT_INSUFFICIENT. */
export interface RunSuspension {
  id: string; // document ID in xiigen-run-state
  runId: string;
  suspendedAt: string;
  suspensionReason: 'CONTEXT_INSUFFICIENT' | 'EXPAND_PENDING';
  stepIndex: number; // which step triggered suspension
  stepText: string; // step text — needed by resume endpoint to reconstruct convergence call
  gapDescription: string;
  gapRequest: string[]; // concrete questions (CI) or sub-node names (EXPAND)
  resumeWhen: string;
  connectionType: string;
  tenantId: string;
}

export interface CycleChainOutput {
  runId: string;
  flowId: string;
  grade: number;
  totalCostUsd: number;
  planSteps: Array<{ index: number; text: string; intClause: string }>;
  leafNodes: Array<Record<string, unknown>>;
  topology: TopologyNode[];

  /** Full observability — every prompt, model, score, and decision. */
  cycles: {
    cycle1: {
      grade: number;
      accepted: boolean;
      plannerModel: string;
      reviewerModel: string;
      tokensUsed: { input: number; output: number };
      costUsd: number;
      promptSent: {
        system: string;
        user: string;
      };
      planSteps: Array<{ index: number; text: string; intClause: string }>;
      reviewerGaps: string[];
    };
    cycle2: Cycle2StepTrace[];
    cycle3: Cycle3StepTrace[];
  };

  /** CYCLE-4 records ready for Claude Code implementation. */
  pendingImplementations: PendingImplementation[];

  /**
   * GAP-β: CycleTrace[] using existing SessionOutputFormatter types.
   * Parallel representation of cycle2 data — compatible with formatCycleTraces().
   */
  cycleTraces?: CycleTrace[];

  /**
   * 'COMPLETE' — all steps processed; 'SUSPENDED' — EXPAND async handoff or CI halt.
   * Absent means COMPLETE (backward-compatible with callers that predate Phase 1).
   */
  status?: 'COMPLETE' | 'SUSPENDED';

  /** SubFlowRef records created during EXPAND async handoff. */
  subFlows?: SubFlowRef[];

  /** RunSuspension records — one per suspended step (EXPAND_PENDING or CONTEXT_INSUFFICIENT). */
  suspensions?: RunSuspension[];
}

@Injectable()
export class CycleChainService {
  private readonly logger = new Logger(CycleChainService.name);

  // Accumulated cost tracker — reset per top-level run (depth=1 calls only)
  private accumulatedCostUsd = 0;

  constructor(
    @Inject(PLANNER_HANDLER) private readonly planner: PlannerHandler,
    @Inject(CONVERGENCE_HANDLER) private readonly convergence: ConvergenceHandler,
    @Inject(DEPTH_HANDLER) private readonly depthDecision: DepthDecisionHandler,
    @Optional() private readonly cycleGate?: CycleGateService,
    // FLOW-38: optional RAG retrieve + outcome recording (not present in tests — graceful no-op)
    @Optional() private readonly ragRetrieve?: RagRetrieveHandler,
    @Optional() @Inject(DATABASE_SERVICE) private readonly db?: IDatabaseService,
    // Phase 1: optional queue for async EXPAND handoff (absent → no sub-flow spawning)
    @Optional() @Inject(QUEUE_SERVICE) private readonly queue?: IQueueService,
    // G2: Cycle history — records step summaries for cross-step enrichment
    @Optional() private readonly cycleHistory?: CycleHistoryService,
    // G3: RAG applicability evaluator (post-retrieval filter)
    @Optional() private readonly ragEvaluate?: RagEvaluateHandler | null,
    // G6: RAG query reformulator (pre-retrieval query improvement)
    @Optional() private readonly ragQuery?: RagQueryHandler | null,
    // FREEDOM config for feature flags
    @Optional()
    @Inject(FREEDOM_CONFIG_SERVICE)
    private readonly freedomConfig?: IFreedomConfigService,
  ) {}

  async run(input: CycleChainInput): Promise<DataProcessResult<CycleChainOutput>> {
    const {
      userIntent,
      domain,
      constraints,
      priorArtQuery,
      flowId,
      runId,
      tenantId,
      currentDepth = 1,
      terminationDepth = 3,
      parentNode = undefined,
      delegatedScope,
    } = input;

    // Reset cost accumulator at the top-level call (depth=1)
    if (currentDepth === 1) this.accumulatedCostUsd = 0;

    // ── Cycle 1: Intent → Plan ──────────────────────────────────────────────
    const planResult = await this.planner.handle(
      this.plannerCtx({ userIntent, domain, constraints, priorArtQuery, flowId, runId, tenantId }),
    );

    if (!planResult.isSuccess) {
      return DataProcessResult.failure(
        'CYCLE_CHAIN_PLAN_FAILED',
        planResult.errorMessage ?? 'Cycle 1 planning AI call failed',
      );
    }

    const planData = planResult.data?.data ?? {};
    const planGrade = typeof planData['grade'] === 'number' ? (planData['grade'] as number) : 0;
    const planAccepted = planData['accepted'] === true;

    if (!planAccepted) {
      return DataProcessResult.failure(
        'CYCLE_CHAIN_PLAN_BELOW_THRESHOLD',
        `Cycle 1 grade ${planGrade.toFixed(2)} below threshold — plan rejected`,
      );
    }

    // Post Cycle 1 gate: spend + security check on plan output (P4 / SK-402 + SK-403)
    const planResultMeta =
      ((planResult.data as unknown as Record<string, unknown>)?.['metadata'] as
        | Record<string, unknown>
        | undefined) ?? {};
    const cycle1Cost = (planResultMeta['cost'] as number) ?? 0.02;
    this.accumulatedCostUsd += cycle1Cost;
    this.logger.log(
      JSON.stringify({
        event: 'CYCLE_1_COMPLETE',
        runId,
        grade: planGrade,
        stepCount: ((planData['planSteps'] as Array<unknown>) ?? []).length,
        cost: cycle1Cost,
        accumulatedCost: this.accumulatedCostUsd,
        accepted: planAccepted,
        model: String(planResultMeta['model'] ?? 'unknown'),
      }),
    );

    const gate1 = await this.runGate(runId, tenantId, 'CYCLE-1', JSON.stringify(planData));
    if (gate1 === 'HALT') {
      return DataProcessResult.failure('CYCLE_CHAIN_GATE_HALT', 'Cycle gate halted after Cycle 1');
    }

    const planSteps = (planData['planSteps'] as Array<Record<string, unknown>>) ?? [];

    // ── Observability: build cycle 1 trace ─────────────────────────────────────
    const planMeta = planResultMeta;
    const cycle1Trace = {
      grade: planGrade,
      accepted: planAccepted,
      plannerModel: String(planData['plannerModel'] ?? planMeta['model'] ?? 'unknown'),
      reviewerModel: String(planData['reviewerModel'] ?? planMeta['model'] ?? 'unknown'),
      tokensUsed: (planMeta['tokensUsed'] as { input: number; output: number }) ?? {
        input: 0,
        output: 0,
      },
      costUsd: typeof planMeta['cost'] === 'number' ? (planMeta['cost'] as number) : 0,
      promptSent: {
        system: String(planData['plannerSystemPrompt'] ?? ''),
        user: String(planData['plannerUserPrompt'] ?? ''),
      },
      planSteps: planSteps.map((s) => ({
        index: typeof s['index'] === 'number' ? (s['index'] as number) : 0,
        text: String(s['text'] ?? ''),
        intClause: String(s['intClause'] ?? ''),
      })),
      reviewerGaps: Array.isArray(planData['reviewerGaps'])
        ? (planData['reviewerGaps'] as string[])
        : [],
    };
    const cycle2Traces: Cycle2StepTrace[] = [];
    const cycle3Traces: Cycle3StepTrace[] = [];
    const pendingImplementations: PendingImplementation[] = [];
    const suspensions: RunSuspension[] = [];

    const leafNodes: Array<Record<string, unknown>> = [];
    const topology: TopologyNode[] = [];

    // ── Cycle 2 + 3 for each plan step ──────────────────────────────────────
    for (const step of planSteps) {
      const stepText = String(step['text'] ?? '');
      // G6: RAG query reformulation (BEFORE rag-retrieve) — improves retrieval precision
      const ragQueryEnabledDoc = this.freedomConfig
        ? await this.freedomConfig
            .get(XIIGEN_FREEDOM_KEYS.RAG_QUERY_REFORMULATION_ENABLED)
            .catch(() => null)
        : null;
      const ragQueryEnabled = ragQueryEnabledDoc?.['value'] === true;
      let retrievalQuery = stepText;
      if (ragQueryEnabled && this.ragQuery) {
        const queryResult = await this.ragQuery.reformulate(
          {
            stepText,
            constraints: constraints ?? [],
            upstreamContext: domain,
            prevCycleSummaries: [],
          },
          tenantId,
        );
        if (queryResult.isSuccess && queryResult.data?.reformulatedQuery) {
          retrievalQuery = queryResult.data.reformulatedQuery;
        }
      }

      // FLOW-38: RAG retrieve before convergence — learning loop Phase A wiring
      // Gracefully skips when ragRetrieve not provided (test mode or pre-Phase-A).
      // G6: retrievalQuery may be reformulated; falls back to stepText when G6 disabled.
      let ragResultsStr = 'NO_PRIOR_NODES';
      let retrievedPatternIds: string[] = [];
      if (this.ragRetrieve) {
        const ragCtxResult = await this.ragRetrieve.handle(
          this.ragRetrieveCtx({ query: retrievalQuery, flowId, runId, tenantId }),
        );
        if (ragCtxResult.isSuccess && ragCtxResult.data?.data?.['ragPatterns']) {
          const patterns = ragCtxResult.data.data['ragPatterns'] as Array<Record<string, unknown>>;
          ragResultsStr = JSON.stringify(patterns);
          retrievedPatternIds = patterns
            .map((p) => String(p['patternId'] ?? p['id'] ?? ''))
            .filter(Boolean);
        }
      }

      // G3: RAG applicability evaluation (post-retrieval filter)
      const ragEvalEnabledDoc = this.freedomConfig
        ? await this.freedomConfig.get(XIIGEN_FREEDOM_KEYS.RAG_EVALUATION_ENABLED).catch(() => null)
        : null;
      const ragEvalEnabled = ragEvalEnabledDoc?.['value'] === true;

      let finalRagResultsStr = ragResultsStr;
      if (ragEvalEnabled && ragResultsStr !== 'NO_PRIOR_NODES' && this.ragEvaluate) {
        let patternsForEval: Array<Record<string, unknown>> = [];
        try {
          patternsForEval = JSON.parse(ragResultsStr) as Array<Record<string, unknown>>;
        } catch {
          patternsForEval = [];
        }
        if (patternsForEval.length > 0) {
          const evalResult = await this.ragEvaluate.evaluate(
            { patterns: patternsForEval, stepText, stepContext: domain ?? '' },
            tenantId,
          );
          if (evalResult.isSuccess && evalResult.data!.applicablePatterns.length > 0) {
            finalRagResultsStr = JSON.stringify(evalResult.data!.applicablePatterns);
          }
        }
      }

      // G2: Read prev cycle summaries before convergence for cross-step enrichment
      const prevSummariesResult = this.cycleHistory
        ? await this.cycleHistory.getSummariesForRun(runId, tenantId)
        : null;
      const prevCycleSummaries =
        (prevSummariesResult?.isSuccess ? prevSummariesResult.data : []) ?? [];

      // Cycle 2: Plan step → NODE
      // CRITICAL: generator context = LOCAL FLOOR only (no parentNode)
      // challengerContext carries parentNode to arbiters — never to generators
      const convResult = await this.convergence.handle(
        this.convergenceCtx({
          stepText,
          constraints,
          upstreamContext: domain,
          flowId,
          runId,
          tenantId,
          parentNode,
          delegatedScope,
          ragResults: finalRagResultsStr,
          prevCycleSummaries,
        }),
      );

      if (!convResult.isSuccess) {
        // CONTEXT_INSUFFICIENT: store suspension record, continue to next step
        if (convResult.errorCode === 'CONTEXT_INSUFFICIENT') {
          this.logger.warn(
            `Cycle 2 CI signal for step "${stepText}": ${convResult.errorMessage ?? ''}`,
          );
          const suspId = randomUUID();
          const susp: RunSuspension = {
            id: suspId,
            runId,
            suspendedAt: new Date().toISOString(),
            suspensionReason: 'CONTEXT_INSUFFICIENT',
            stepIndex: cycle2Traces.length,
            stepText,
            gapDescription: convResult.errorMessage ?? 'Context insufficient',
            gapRequest: (convResult.metadata?.['questions'] as string[]) ?? [],
            resumeWhen: 'when gap questions are answered via PATCH /api/cycle-chain/:runId/resume',
            connectionType: 'FLOW_SCOPED',
            tenantId,
          };
          // DNA-8: store before emit
          if (this.db)
            await this.db.storeDocument(
              'xiigen-run-state',
              susp as unknown as Record<string, unknown>,
              suspId,
            );
          if (this.queue)
            await this.queue.enqueue('cycle.chain.suspended', {
              runId,
              stepIndex: cycle2Traces.length,
              suspensionReason: 'CONTEXT_INSUFFICIENT',
            } as Record<string, unknown>);
          suspensions.push(susp);
          cycle2Traces.push({
            stepText,
            depth: currentDepth,
            nodeIntent: stepText,
            grade: 0,
            accepted: false,
            rejectionReason: 'CONTEXT_INSUFFICIENT',
            roundsCompleted: 0,
            stagnationFired: false,
            cycle4Id: '',
            winnerModel: 'unknown',
            winnerSelfScore: 0,
            arbiters: [],
            promptSent: { nodePrompt: '', judgeSystemPrompt: '' },
            rounds: [],
          });
          continue;
        }
        this.logger.warn(
          `Cycle 2 failed for step "${stepText}": ${convResult.errorMessage ?? 'unknown'}`,
        );
        // Record minimal trace so the run analysis shows which step failed and why
        cycle2Traces.push({
          stepText,
          depth: currentDepth,
          nodeIntent: stepText,
          grade: 0,
          accepted: false,
          rejectionReason: convResult.errorMessage ?? 'CONVERGENCE_FAILED',
          roundsCompleted: 0,
          stagnationFired: false,
          cycle4Id: '',
          winnerModel: 'unknown',
          winnerSelfScore: 0,
          arbiters: [],
          promptSent: { nodePrompt: '', judgeSystemPrompt: '' },
          rounds: [],
        });
        continue;
      }

      const convData = convResult.data?.data ?? {};
      const stepAccepted = convData['accepted'] === true;

      // ── Observability: collect cycle 2 trace regardless of accepted status ──────
      // Rejected steps must appear in the trace so the run analysis can show why they failed
      // (arbiter verdicts, rounds, scores) rather than showing an empty Phase C.
      const convTriples = (convData['triples'] as DpoRoundTrace[] | undefined) ?? [];
      cycle2Traces.push({
        stepText,
        depth: currentDepth,
        nodeIntent: stepText,
        grade: typeof convData['grade'] === 'number' ? (convData['grade'] as number) : 0,
        accepted: stepAccepted,
        rejectionReason: !stepAccepted
          ? ((convData['rejectionReason'] as string | undefined) ?? 'GRADE_BELOW_THRESHOLD')
          : undefined,
        roundsCompleted:
          typeof convData['roundsCompleted'] === 'number'
            ? (convData['roundsCompleted'] as number)
            : 0,
        stagnationFired: convData['stagnationFired'] === true,
        cycle4Id: String(convData['cycle4Id'] ?? ''),
        winnerModel: String(convData['bestModel'] ?? 'unknown'),
        winnerSelfScore:
          typeof convData['bestScore'] === 'number' ? (convData['bestScore'] as number) : 0,
        arbiters: Array.isArray(convData['arbiterVerdicts'])
          ? (convData['arbiterVerdicts'] as Array<Record<string, unknown>>).map((v) => ({
              name: String(v['arbiter'] ?? ''),
              verdict: String(v['verdict'] ?? 'PASS'),
              detail: String(v['detail'] ?? ''),
            }))
          : [],
        promptSent: {
          nodePrompt: String(convData['nodePrompt'] ?? ''),
          judgeSystemPrompt: String(convData['judgeSystemPrompt'] ?? ''),
        },
        rounds: convTriples.map((t) => ({
          round: t.round,
          chosen: t.chosen,
          rejected: t.rejected,
          discarded: t.discarded,
        })),
      });

      // FLOW-38: record retrieval outcome after convergence step (DNA-8 — store before continuing)
      if (this.db) {
        // always record — empty patternIds is valid first-run state
        const outcomeId = randomUUID();
        await this.db.storeDocument(
          'xiigen-rag-retrieval-outcomes',
          {
            outcomeId,
            runId,
            stepText,
            flowId,
            patternIds: retrievedPatternIds,
            accepted: stepAccepted,
            grade: typeof convData['grade'] === 'number' ? convData['grade'] : 0,
            createdAt: new Date().toISOString(),
            tenantId,
            connectionType: 'FLOW_SCOPED',
          },
          outcomeId,
        );
      }

      if (!stepAccepted) {
        this.logger.warn(
          `Cycle 2 NODE rejected for step "${stepText}" (grade ${convData['grade']}) — skipping to next step`,
        );
        continue;
      }

      const winningNode = convData['winningNode'] as Record<string, unknown>;

      // G2: Record winning NODE summary for cross-step enrichment (after accepted=true)
      if (this.cycleHistory) {
        await this.cycleHistory.record({
          runId,
          stepIndex: cycle2Traces.length - 1,
          stepText,
          winningNodeSummary: this.buildNodeSummary(winningNode),
          grade: typeof convData['grade'] === 'number' ? (convData['grade'] as number) : 0,
          modelWon: String(convData['bestModel'] ?? 'unknown'),
          tenantId,
        });
      }

      if (convData['cycle4Id']) {
        pendingImplementations.push({
          cycle4Id: String(convData['cycle4Id']),
          stepText,
          depth: currentDepth,
          nodeIntent: stepText,
          nodeSpec: (convData['winningNode'] as Record<string, unknown>) ?? {},
          targetGrade: 0.95,
          status: 'PENDING_IMPLEMENTATION',
        });
      }

      // Post Cycle 2 gate: scan winning NODE for security violations + spend check (P4)
      const winningMeta = (winningNode['metadata'] as Record<string, unknown> | undefined) ?? {};
      const cycle2Cost = (winningMeta['cost'] as number) ?? 0.03;
      this.accumulatedCostUsd += cycle2Cost;
      this.logger.log(
        JSON.stringify({
          event: 'CYCLE_2_STEP_COMPLETE',
          runId,
          stepText,
          winnerModel: String(winningMeta['model'] ?? 'unknown'),
          generatorCount: Number(winningMeta['generatorCount'] ?? 1),
          judgeScore: convData['convergenceScore'] ?? 0,
          accepted: convData['accepted'] ?? false,
          cost: cycle2Cost,
          accumulatedCost: this.accumulatedCostUsd,
        }),
      );

      const gate2 = await this.runGate(runId, tenantId, 'CYCLE-2', JSON.stringify(winningNode));
      if (gate2 === 'HALT') {
        return DataProcessResult.failure(
          'CYCLE_CHAIN_GATE_HALT',
          `Cycle gate halted after Cycle 2 for step "${stepText}"`,
        );
      }

      // Cycle 3: LEAF or EXPAND?
      const depthResult = await this.depthDecision.handle(
        this.depthCtx({
          verifiedNode: winningNode,
          currentDepth,
          terminationDepth,
          flowId,
          runId,
          tenantId,
          domain,
        }),
      );

      if (!depthResult.isSuccess) {
        this.logger.warn(`Cycle 3 failed for step "${stepText}" — defaulting to LEAF`);
        cycle3Traces.push({
          stepText,
          depth: currentDepth,
          verdict: 'LEAF',
          signalsEvaluated: [],
          signalsTriggered: [],
          terminationBoundApplied: false,
          promptSent: '',
        });
        leafNodes.push(winningNode);
        topology.push({ stepText, verdict: 'LEAF', depth: currentDepth, children: [] });
        continue;
      }

      const depthData = depthResult.data?.data ?? {};
      const verdict = String(depthData['verdict'] ?? 'LEAF') as 'LEAF' | 'EXPAND';
      const subFlowDecomposition =
        (depthData['subFlowDecomposition'] as Array<{
          name: string;
          intClause: string;
          isDistinct: boolean;
        }> | null) ?? null;

      // ── Observability: collect cycle 3 trace ──────────────────────────────────
      cycle3Traces.push({
        stepText,
        depth: currentDepth,
        verdict,
        signalsEvaluated: (depthData['signalsEvaluated'] as string[]) ?? [],
        signalsTriggered: (depthData['signalsTriggered'] as string[]) ?? [],
        terminationBoundApplied: depthData['terminationBoundApplied'] === true,
        promptSent: String(depthData['promptSent'] ?? ''),
      });

      if (verdict === 'LEAF' || !subFlowDecomposition || subFlowDecomposition.length === 0) {
        leafNodes.push(winningNode);
        topology.push({ stepText, verdict: 'LEAF', depth: currentDepth, children: [] });
        continue;
      }

      // EXPAND: async queue handoff (Phase 1 — synchronous inline await removed entirely)
      // Each sub-node is registered as a SubFlowRef and spawned via queue event.
      // The current run returns SUSPENDED; ExpandConsumerHandler processes each child.
      const subFlowRefs: SubFlowRef[] = [];
      const stepIdx = cycle2Traces.length - 1;

      for (const subNode of subFlowDecomposition) {
        const refId = randomUUID();
        const ref: SubFlowRef = {
          id: refId,
          parentRunId: runId,
          parentStepIndex: stepIdx,
          parentNodeId: String(winningNode['nodeId'] ?? winningNode['id'] ?? ''),
          depth: currentDepth + 1,
          subFlowIntent: subNode.intClause,
          subFlowName: subNode.name,
          status: 'PENDING',
          connectionType: 'FLOW_SCOPED',
          tenantId,
          createdAt: new Date().toISOString(),
        };
        // DNA-8: storeDocument before emit
        if (this.db) {
          await this.db.storeDocument(
            'xiigen-run-state',
            ref as unknown as Record<string, unknown>,
            refId,
          );
        }
        subFlowRefs.push(ref);
      }

      // Emit one queue event per sub-node (idempotent: deduplication key = ref id)
      if (this.queue) {
        for (const ref of subFlowRefs) {
          await this.queue.enqueue(
            'cycle.chain.expand',
            {
              parentRunId: runId,
              subFlowRefId: ref.id,
              subFlowIntent: ref.subFlowIntent,
              subFlowName: ref.subFlowName,
              flowId,
              domain,
              constraints,
              priorArtQuery: priorArtQuery
                ? `sub-flow ${ref.subFlowName} ${priorArtQuery}`
                : undefined,
              depth: currentDepth + 1,
              terminationDepth,
              tenantId,
              parentNode: winningNode,
              delegatedScope: ref.subFlowIntent,
            } as Record<string, unknown>,
            `expand-${ref.id}`,
          );
        }
      }

      // Suspend parent run — store RunSuspension (DNA-8: before cycle.chain.suspended emit)
      const suspId = randomUUID();
      const expandSuspension: RunSuspension = {
        id: suspId,
        runId,
        suspendedAt: new Date().toISOString(),
        suspensionReason: 'EXPAND_PENDING',
        stepIndex: stepIdx,
        stepText,
        gapDescription: `Expanding into ${subFlowRefs.length} sub-flows`,
        gapRequest: subFlowRefs.map((r) => r.subFlowIntent),
        resumeWhen: 'when all child sub-flows emit cycle.chain.child.completed',
        connectionType: 'FLOW_SCOPED',
        tenantId,
      };
      if (this.db) {
        await this.db.storeDocument(
          'xiigen-run-state',
          expandSuspension as unknown as Record<string, unknown>,
          suspId,
        );
      }
      if (this.queue) {
        await this.queue.enqueue('cycle.chain.suspended', {
          runId,
          suspensionReason: 'EXPAND_PENDING',
          subFlowCount: subFlowRefs.length,
        } as Record<string, unknown>);
      }
      suspensions.push(expandSuspension);

      topology.push({ stepText, verdict: 'EXPAND', depth: currentDepth, children: [] });

      // Return SUSPENDED immediately — sub-flows are queued for async processing
      return DataProcessResult.success({
        runId,
        flowId,
        grade: 0, // partial — run is suspended, grade not final
        totalCostUsd: this.accumulatedCostUsd,
        planSteps: planSteps.map((s) => ({
          index: typeof s['index'] === 'number' ? (s['index'] as number) : 0,
          text: String(s['text'] ?? ''),
          intClause: String(s['intClause'] ?? ''),
        })),
        leafNodes,
        topology,
        cycles: {
          cycle1: cycle1Trace,
          cycle2: cycle2Traces,
          cycle3: cycle3Traces,
        },
        pendingImplementations,
        status: 'SUSPENDED',
        subFlows: subFlowRefs,
        suspensions,
        cycleTraces: cycle2Traces.map(
          (c2, idx): CycleTrace => ({
            cycleNumber: idx + 1,
            promptSent: c2.promptSent.nodePrompt,
            arbiters: c2.arbiters.map(
              (a): ArbiterTrace => ({
                arbiterId: a.name,
                verdict: a.verdict as 'PASS' | 'CONCERN' | 'BLOCK',
                correctionText: a.detail || undefined,
                round: 1,
                modelName: c2.winnerModel,
              }),
            ),
            convergenceScore: c2.grade,
            accepted: c2.accepted,
            depth: c2.depth,
            nodeIntent: c2.nodeIntent,
          }),
        ),
      });
    }

    // Overall grade: Cycle 2 teaching quality, not Cycle 1 plan quality.
    // Cycle 1 grade 1.00 does not mean the run passed — it only means the plan was coherent.
    // If Cycle 2 ran but rejected all steps, grade = 0 (correctly signals FAIL).
    // If Cycle 2 never ran (planSteps empty or loop skipped), fall back to planGrade.
    const acceptedGrades = cycle2Traces.filter((c) => c.accepted).map((c) => c.grade);
    const overallGrade =
      cycle2Traces.length === 0
        ? planGrade
        : acceptedGrades.length > 0
          ? acceptedGrades.reduce((s, g) => s + g, 0) / acceptedGrades.length
          : 0;

    return DataProcessResult.success({
      runId,
      flowId,
      grade: overallGrade,
      totalCostUsd: this.accumulatedCostUsd,
      planSteps: planSteps.map((s) => ({
        index: typeof s['index'] === 'number' ? (s['index'] as number) : 0,
        text: String(s['text'] ?? ''),
        intClause: String(s['intClause'] ?? ''),
      })),
      leafNodes,
      topology,
      cycles: {
        cycle1: cycle1Trace,
        cycle2: cycle2Traces,
        cycle3: cycle3Traces,
      },
      pendingImplementations,
      status: 'COMPLETE',
      subFlows: [],
      suspensions,
      // GAP-β: wire existing SessionOutputFormatter CycleTrace types into response
      cycleTraces: cycle2Traces.map(
        (c2, idx): CycleTrace => ({
          cycleNumber: idx + 1,
          promptSent: c2.promptSent.nodePrompt,
          arbiters: c2.arbiters.map(
            (a): ArbiterTrace => ({
              arbiterId: a.name,
              verdict: a.verdict as 'PASS' | 'CONCERN' | 'BLOCK',
              correctionText: a.detail || undefined,
              round: 1,
              modelName: c2.winnerModel,
            }),
          ),
          convergenceScore: c2.grade,
          accepted: c2.accepted,
          depth: c2.depth,
          nodeIntent: c2.nodeIntent,
        }),
      ),
    });
  }

  // ── Gate helper ────────────────────────────────────────────────────────────

  /**
   * G2: Build a concise summary of the winning NODE for cycle history.
   * Intent (first 200 chars) + first constraint if available.
   */
  private buildNodeSummary(node: Record<string, unknown>): string {
    const intent = String(node['intent'] ?? node['description'] ?? '').slice(0, 200);
    const firstConstraint = (node['constraints'] as string[] | undefined)?.[0] ?? '';
    return firstConstraint ? `${intent} Key constraint: ${firstConstraint}` : intent;
  }

  /** Run spend + security gate. Returns 'HALT' if either fires, 'CONTINUE' otherwise. */
  private async runGate(
    sessionId: string,
    tenantId: string,
    cycleLabel: string,
    nodeOutput: string,
  ): Promise<'CONTINUE' | 'HALT'> {
    if (!this.cycleGate) return 'CONTINUE';
    try {
      const result = await this.cycleGate.check({
        sessionId,
        tenantId,
        cycleLabel,
        accumulatedCostUsd: this.accumulatedCostUsd,
        nodeOutput,
      });
      return result.isSuccess ? result.data!.verdict : 'CONTINUE';
    } catch {
      return 'CONTINUE'; // DNA-3: gate failure never blocks the chain
    }
  }

  // ── Context builders ────────────────────────────────────────────────────────

  private baseContract() {
    return {
      taskTypeId: 'CYCLE-CHAIN',
      archetype: 'SERVICE',
      ironRules: [],
      handlers: [],
      machineConstants: [],
    } as unknown as import('./node-handlers/node-handler.types').NodeHandlerContext['contract'];
  }

  private plannerCtx(p: {
    userIntent: string;
    domain?: string;
    constraints: string[];
    priorArtQuery?: string;
    flowId: string;
    runId: string;
    tenantId: string;
  }): NodeHandlerContext {
    return {
      contract: this.baseContract(),
      runId: p.runId,
      flowId: p.flowId,
      taskTypeId: 'CYCLE-CHAIN',
      tenantId: p.tenantId,
      inputs: {
        userIntent: p.userIntent,
        constraints: p.constraints,
        ...(p.domain ? { domain: p.domain } : {}),
        ...(p.priorArtQuery ? { priorArtQuery: p.priorArtQuery } : {}),
      },
      priorOutputs: [],
      nodeConfig: {},
    };
  }

  private convergenceCtx(p: {
    stepText: string;
    constraints: string[];
    upstreamContext?: string;
    flowId: string;
    runId: string;
    tenantId: string;
    parentNode?: Record<string, unknown>;
    delegatedScope?: string;
    ragResults?: string;
    prevCycleSummaries?: string[];
  }): NodeHandlerContext {
    return {
      contract: this.baseContract(),
      runId: p.runId,
      flowId: p.flowId,
      taskTypeId: 'CYCLE-CHAIN',
      tenantId: p.tenantId,
      inputs: {
        stepText: p.stepText,
        constraints: p.constraints,
        // upstreamContext = same-flow prior context (not parent NODE)
        ...(p.upstreamContext ? { upstreamContext: p.upstreamContext } : {}),
        // challengerContext: parentNode flows to arbiters only — generators do NOT see this
        ...(p.parentNode
          ? {
              challengerContext: {
                parentNode: p.parentNode,
                parentDepth: 1,
                delegatedScope: p.delegatedScope ?? null,
              },
            }
          : {}),
        // FLOW-38: RAG context for generator (LOCAL FLOOR enhancement)
        ...(p.ragResults ? { ragResults: p.ragResults } : {}),
        // G1/G4-CC: previous cycle summaries for cross-step enrichment
        ...(p.prevCycleSummaries ? { prevCycleSummaries: p.prevCycleSummaries } : {}),
      },
      priorOutputs: [],
      nodeConfig: {},
    };
  }

  private ragRetrieveCtx(p: {
    query: string;
    flowId: string;
    runId: string;
    tenantId: string;
  }): NodeHandlerContext {
    return {
      contract: this.baseContract(),
      runId: p.runId,
      flowId: p.flowId,
      taskTypeId: 'CYCLE-CHAIN',
      tenantId: p.tenantId,
      inputs: {},
      priorOutputs: [],
      nodeConfig: { query: p.query, namespace: p.flowId },
    };
  }

  // ── Public resume API ──────────────────────────────────────────────────────

  /**
   * Re-runs convergence for a single CONTEXT_INSUFFICIENT suspended step with enriched constraints.
   * Called by the PATCH /api/cycle-chain/:runId/resume endpoint.
   * DNA-8: marks suspension RESOLVED in DB before returning.
   */
  async resumeSuspendedStep(
    runId: string,
    suspensionId: string,
    answers: string[],
  ): Promise<DataProcessResult<{ cycle2Trace: Cycle2StepTrace; suspensionStatus: 'RESOLVED' }>> {
    if (!this.db) {
      return DataProcessResult.failure(
        'NO_DB_SERVICE',
        'Database service not available for resume',
      );
    }

    // 1. Load suspension record by ID
    const suspResult = await this.db.getDocument('xiigen-run-state', suspensionId);
    if (!suspResult.isSuccess || !suspResult.data) {
      return DataProcessResult.failure(
        'SUSPENSION_NOT_FOUND',
        `No suspension found: ${suspensionId}`,
      );
    }
    const susp = suspResult.data as unknown as RunSuspension;

    // 2. Verify runId matches
    if (susp.runId !== runId) {
      return DataProcessResult.failure(
        'SUSPENSION_RUN_MISMATCH',
        'suspensionId does not belong to this runId',
      );
    }

    // 3. Only CONTEXT_INSUFFICIENT can be resumed this way
    if (susp.suspensionReason !== 'CONTEXT_INSUFFICIENT') {
      return DataProcessResult.failure(
        'SUSPENSION_NOT_CI',
        'Only CONTEXT_INSUFFICIENT suspensions can be resumed this way',
      );
    }

    // 4. Build enriched constraints: each answer maps to its gap question
    const enrichedConstraints = answers.map((answer, i) => {
      const question = susp.gapRequest[i] ?? `Answer to question ${i + 1}`;
      return `${question}: ${answer}`;
    });

    // 5. Re-run convergence for the suspended step with enriched context
    const convResult = await this.convergence.handle(
      this.convergenceCtx({
        stepText: susp.stepText,
        constraints: enrichedConstraints,
        upstreamContext: '',
        flowId: '',
        runId,
        tenantId: susp.tenantId,
        parentNode: undefined,
        delegatedScope: undefined,
        ragResults: 'NO_PRIOR_NODES',
      }),
    );

    if (!convResult.isSuccess) {
      return DataProcessResult.failure(
        convResult.errorCode ?? 'RESUME_CONVERGENCE_FAILED',
        `Re-run convergence failed: ${convResult.errorMessage}`,
      );
    }

    // 6. DNA-8: mark suspension RESOLVED before returning
    const resolvedSusp = {
      ...susp,
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString(),
      resolvedWith: answers,
    };
    await this.db.storeDocument(
      'xiigen-run-state',
      resolvedSusp as unknown as Record<string, unknown>,
      suspensionId,
    );

    // 7. Build Cycle2StepTrace from re-run result
    const convData = convResult.data?.data ?? {};
    const accepted = convData['accepted'] === true;
    const trace: Cycle2StepTrace = {
      stepText: susp.stepText,
      depth: 0,
      nodeIntent: susp.stepText,
      grade: typeof convData['grade'] === 'number' ? (convData['grade'] as number) : 0,
      accepted,
      rejectionReason: accepted
        ? undefined
        : String(convData['rejectionReason'] ?? 'RESUME_RE_RUN_REJECTED'),
      roundsCompleted: 0,
      stagnationFired: false,
      cycle4Id: String(convData['cycle4Id'] ?? ''),
      winnerModel: String(convData['bestModel'] ?? 'unknown'),
      winnerSelfScore:
        typeof convData['bestScore'] === 'number' ? (convData['bestScore'] as number) : 0,
      arbiters: [],
      promptSent: { nodePrompt: '', judgeSystemPrompt: '' },
      rounds: [],
    };

    return DataProcessResult.success({ cycle2Trace: trace, suspensionStatus: 'RESOLVED' });
  }

  private depthCtx(p: {
    verifiedNode: Record<string, unknown>;
    currentDepth: number;
    terminationDepth: number;
    flowId: string;
    runId: string;
    tenantId: string;
    domain?: string;
  }): NodeHandlerContext {
    return {
      contract: this.baseContract(),
      runId: p.runId,
      flowId: p.flowId,
      taskTypeId: 'CYCLE-CHAIN',
      tenantId: p.tenantId,
      inputs: {
        verifiedNode: p.verifiedNode,
        currentDepth: p.currentDepth,
        terminationDepth: p.terminationDepth,
        ...(p.domain ? { flowDomain: p.domain } : {}),
      },
      priorOutputs: [],
      nodeConfig: {},
    };
  }
}
