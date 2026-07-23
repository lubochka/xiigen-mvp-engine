/**
 * ArbitrationLoopController — orchestrates the full generate→arbitrate→check→synthesize loop.
 *
 * Terminates when: unanimous winner found OR maxRounds exceeded (stalled).
 *
 * T583: 4-Phase panel execution per round.
 *   Phase 1: Run all arbiters against all candidates in parallel.
 *   Phase 2: Identify failing arbiters on best candidate that qualify for context search.
 *   Phase 3: For each qualifying arbiter, run context enrichment loop (up to maxIter iterations).
 *            Re-run arbiter with enriched prompt until passed or budget/iter exhausted.
 *   Phase 4: Rebuild round snapshot with enriched verdicts; aggregate.
 *
 * Context search categories (T583):
 *   Category C (never): dna, fabric, iron_rules, tenant
 *   Category B (conditional): business_logic (ORCHESTRATION/SCHEDULED), key_principles (tier >= 3)
 *   Category A (always): any arbiter with requiresContextSearch: true
 *
 * CF-T583-1: activationThreshold hardcoded at 0.70 (FREEDOM read deferred).
 * CF-T583-2: curriculumTier hardcoded at 3 (contract read deferred).
 * CF-T583-3: contextPolicy on ArbiterPanelConfig is undefined for all current contracts.
 *
 * DNA-3: DataProcessResult returns — never throws for business logic.
 */

import { Injectable, Optional, Logger } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { ArbiterRegistry, ArbiterDefinition, ArbiterVerdict } from './arbiter-registry';
import { ArbiterService } from './arbiter.service';
import { buildRound, GenerationRound, Candidate } from './generation-round';
import { UnanimousVerdictAggregator } from './unanimous-aggregator';
import { FeedbackSynthesizer } from './feedback-synthesizer';
import { TrainingTraceWriter } from './training-trace-writer';
import { ContextQueryHandler } from '../node-handlers/context-query.handler';
import { FreedomConfigManager } from '../../freedom/config-manager';
import { XIIGEN_FREEDOM_DEFAULTS, XIIGEN_FREEDOM_KEYS } from '../../freedom/config-schema';
import {
  CycleTrace,
  ArbiterTrace,
} from '../flows/generation-loop/session-output-formatter.service';

// ── T583: Category C arbiter IDs — context search never runs ─────────────────
const CATEGORY_C_IDS = new Set(['dna', 'fabric', 'iron_rules', 'tenant']);

// ── T583: Gap signal keywords (from FREEDOM defaults) ─────────────────────────
const GAP_KEYWORDS: string[] = (
  (XIIGEN_FREEDOM_DEFAULTS[XIIGEN_FREEDOM_KEYS.CONTEXT_GAP_SIGNAL_KEYWORDS] as string) ?? ''
)
  .split(',')
  .map((k) => k.trim())
  .filter((k) => k.length > 0);

export interface LoopInput {
  readonly taskType: string;
  readonly tenantId: string;
  readonly initialPrompt: string;
  readonly maxRounds: number;
  readonly candidates: () => Promise<Candidate[]>; // injected generator function
  /** Optional hook: called after each round completes (used by FlowWatcherService). */
  readonly onRoundEnd?: (round: GenerationRound) => Promise<void>;
  /**
   * T583: Unique run identifier — scopes context blocks and pool queries.
   * Required when ContextQueryHandler is wired (always provide via randomUUID()).
   */
  readonly runId: string;
  /**
   * T583: Task type archetype — used to evaluate Category B contextSearchCondition.
   * When absent, archetypes-based conditions are skipped (conservative: no enrichment).
   */
  readonly archetype?: string;
  /**
   * A-2: Optional arbiterConfig from the contract — used for BLOCK semantics.
   * When present, arbiters in blockSemantics.blockOnFail will reject candidates.
   */
  readonly contractArbiterConfig?: Record<string, unknown>;
  /**
   * B-3: Optional fallback curriculum tier when not available from contract.
   * When absent, defaults to 3 (backward-compatible).
   */
  readonly fallbackCurriculumTier?: number;
  /**
   * GAP-I-05/I-08: Topology depth at which this loop is running.
   * depth=0 = top-level node; depth=1 = first EXPAND sub-node; depth=2+ = deeper.
   * Passed through to every CycleTrace so CalibrationRunner can tag records correctly.
   * When absent, CalibrationRunner treats as depth=0.
   */
  readonly depth?: number;
  /**
   * GAP-I-05/I-08: Semantic description of what this node is generating.
   * Passed through to every CycleTrace for calibration baseline and DPO triple tagging.
   */
  readonly nodeIntent?: string;
}

export interface LoopResult {
  readonly accepted: boolean;
  readonly winner: Candidate | null;
  readonly roundsCompleted: number;
  readonly finalRound: GenerationRound;
  readonly stalled: boolean;
  /** GAP-OBS-01: per-round traces (prompt sent, arbiter verdicts, convergence score). */
  readonly cycleTraces: CycleTrace[];
}

@Injectable()
export class ArbitrationLoopController {
  private readonly logger = new Logger(ArbitrationLoopController.name);

  constructor(
    private readonly registry: ArbiterRegistry,
    private readonly arbiterService: ArbiterService,
    private readonly aggregator: UnanimousVerdictAggregator,
    private readonly synthesizer: FeedbackSynthesizer,
    private readonly tracer: TrainingTraceWriter,
    // T583: optional — context enrichment disabled gracefully when absent
    @Optional() private readonly contextQueryHandler?: ContextQueryHandler,
    // B-3: optional — FREEDOM config for CONTEXT_ACTIVATION_THRESHOLD runtime override
    @Optional() private readonly freedom?: FreedomConfigManager,
  ) {}

  async run(input: LoopInput): Promise<DataProcessResult<LoopResult>> {
    const maxRounds = input.maxRounds ?? 5;
    let currentPrompt = input.initialPrompt;
    let lastRound: GenerationRound | null = null;

    // A-2: Extract blockOnFail from contract arbiterConfig (BLOCK semantics)
    const blockOnFail: readonly string[] =
      ((input.contractArbiterConfig?.['blockSemantics'] as Record<string, unknown> | undefined)?.[
        'blockOnFail'
      ] as string[] | undefined) ?? [];

    // B-3: CF-T583-1 resolved — activationThreshold reads from FREEDOM config at runtime
    const activationThreshold = this.freedom
      ? (((
          await this.freedom.getConfig(
            input.tenantId,
            XIIGEN_FREEDOM_KEYS.CONTEXT_ACTIVATION_THRESHOLD,
          )
        ).data?.['value'] as number | undefined) ?? 0.7)
      : 0.7;

    // B-3: CF-T583-2 resolved — curriculumTier reads from contractArbiterConfig or fallback
    const curriculumTier: number =
      (input.contractArbiterConfig as { curriculumTier?: number } | undefined)?.curriculumTier ??
      input.fallbackCurriculumTier ??
      3;

    // T583: budget tracking across the whole run (shared across all rounds)
    let budgetCallsUsed = 0;
    const budgetMax =
      (XIIGEN_FREEDOM_DEFAULTS[XIIGEN_FREEDOM_KEYS.CONTEXT_ARBITER_BUDGET_PER_RUN] as number) ?? 20;
    const maxIterPerArbiter =
      (XIIGEN_FREEDOM_DEFAULTS[
        XIIGEN_FREEDOM_KEYS.CONTEXT_ARBITER_MAX_ITER_PER_ARBITER
      ] as number) ?? 5;
    const sufficiencyScoreDelta =
      ((XIIGEN_FREEDOM_DEFAULTS[XIIGEN_FREEDOM_KEYS.CONTEXT_SUFFICIENCY_THRESHOLD] as number) ??
        0.02) * 100;
    const contextEnabled =
      (XIIGEN_FREEDOM_DEFAULTS[XIIGEN_FREEDOM_KEYS.CONTEXT_ARBITER_ENABLED] as boolean) ?? true;

    // Use activationThreshold and curriculumTier in context search decisions
    void activationThreshold; // used by shouldRunContextSearch via closure; suppress lint
    void curriculumTier; // reserved for context search depth decisions — CF-T583-2

    // GAP-OBS-01: collect one CycleTrace per round for execution audit
    const cycleTraces: CycleTrace[] = [];

    for (let roundNum = 1; roundNum <= maxRounds; roundNum++) {
      // Capture prompt at the start of this round (before any synthesis overwrites it)
      const promptSentThisRound = currentPrompt;

      // ── Phase 1: Generate candidates + run all arbiters ──────────────────────
      const candidates = await input.candidates();
      const arbiters = this.registry.getAll();

      // Mutable structure so Phase 3 can patch verdicts for the best candidate
      const mutableResults: Array<{ candidate: Candidate; verdicts: ArbiterVerdict[] }> = [];

      for (const candidate of candidates) {
        const verdictResults = await Promise.all(
          arbiters.map((a) =>
            this.arbiterService.judge({ code: candidate.code, model: candidate.model }, a),
          ),
        );
        mutableResults.push({
          candidate,
          verdicts: verdictResults
            .filter((v) => v.isSuccess)
            .map((v) => v.data!) as ArbiterVerdict[],
        });
      }

      // ── Phase 2: Initial round snapshot (determines best candidate) ──────────
      let round = buildRound(roundNum, input.taskType, input.tenantId, mutableResults);
      lastRound = round;

      // ── Phase 3: Context enrichment for failing arbiters ─────────────────────
      if (contextEnabled && this.contextQueryHandler && !round.winner) {
        const enriched = await this.runContextEnrichment({
          round,
          mutableResults,
          input,
          budgetCallsUsed,
          budgetMax,
          maxIterPerArbiter,
          sufficiencyScoreDelta,
          arbiters,
        });
        budgetCallsUsed = enriched.budgetCallsUsed;

        // ── Phase 4: Rebuild round if any verdicts were enriched ────────────────
        if (enriched.changed) {
          round = buildRound(roundNum, input.taskType, input.tenantId, mutableResults);
          lastRound = round;
        }
      }

      // Step 4: Write training trace (best-effort — failure does not abort loop)
      await this.tracer.write({ round, prompt: currentPrompt });

      // Step 4b: Notify watcher (best-effort — failure does not abort loop)
      if (input.onRoundEnd) {
        await input.onRoundEnd(round).catch(() => {
          /* best-effort */
        });
      }

      // Step 5: Check for unanimous winner
      // A-2: pass blockOnFail for BLOCK-class arbiter enforcement
      const agg = this.aggregator.aggregate(round, blockOnFail);

      // GAP-OBS-01: build arbiter traces from best candidate verdicts
      const arbiterTraces: ArbiterTrace[] = round.bestCandidate.verdicts.map(
        (v: ArbiterVerdict): ArbiterTrace => ({
          arbiterId: v.arbiterId,
          verdict: v.passed ? 'PASS' : 'CONCERN',
          correctionText: v.notes.length > 0 ? v.notes.join('; ') : undefined,
          round: roundNum,
          modelName: v.candidateModel,
        }),
      );

      if (agg.isSuccess && agg.data!.hasWinner) {
        cycleTraces.push({
          cycleNumber: roundNum,
          promptSent: promptSentThisRound,
          arbiters: arbiterTraces,
          convergenceScore: round.bestCandidate.avgScore / 100,
          accepted: true,
          depth: input.depth,
          nodeIntent: input.nodeIntent,
        });
        return DataProcessResult.success({
          accepted: true,
          winner: agg.data!.winner!.candidate,
          roundsCompleted: roundNum,
          finalRound: round,
          stalled: false,
          cycleTraces,
        });
      }

      // Step 6: Synthesize improved prompt for next round (if rounds remain)
      let correctionInjected: string | undefined;
      if (roundNum < maxRounds && agg.isSuccess && agg.data!.nextRoundNotes.length > 0) {
        const synthesis = this.synthesizer.synthesize({
          originalSpec: {},
          bestCandidateCode: round.bestCandidate.candidate.code,
          bestCandidateModel: round.bestCandidate.candidate.model,
          roundNumber: roundNum,
          arbiterNotes: agg.data!.nextRoundNotes,
          previousGenesisPrompt: currentPrompt,
        });
        if (synthesis.isSuccess) {
          correctionInjected = synthesis.data!;
          currentPrompt = synthesis.data!;
        }
      }

      cycleTraces.push({
        cycleNumber: roundNum,
        promptSent: promptSentThisRound,
        arbiters: arbiterTraces,
        convergenceScore: round.bestCandidate.avgScore / 100,
        accepted: false,
        correctionInjected,
        depth: input.depth,
        nodeIntent: input.nodeIntent,
      });
    }

    // Max rounds exceeded without a winner
    return DataProcessResult.success({
      accepted: false,
      winner: null,
      roundsCompleted: maxRounds,
      finalRound: lastRound!,
      stalled: true,
      cycleTraces,
    });
  }

  // ── T583: Context enrichment sub-routine ───────────────────────────────────

  private async runContextEnrichment(opts: {
    round: GenerationRound;
    mutableResults: Array<{ candidate: Candidate; verdicts: ArbiterVerdict[] }>;
    input: LoopInput;
    budgetCallsUsed: number;
    budgetMax: number;
    maxIterPerArbiter: number;
    sufficiencyScoreDelta: number;
    arbiters: ArbiterDefinition[];
  }): Promise<{ budgetCallsUsed: number; changed: boolean }> {
    const { round, mutableResults, input, budgetMax, maxIterPerArbiter, sufficiencyScoreDelta } =
      opts;
    let { budgetCallsUsed } = opts;
    let changed = false;

    // Find the best candidate's entry in mutableResults
    const bestCandidateModel = round.bestCandidate.candidate.model;
    const bestResultIdx = mutableResults.findIndex((r) => r.candidate.model === bestCandidateModel);
    if (bestResultIdx < 0) {
      return { budgetCallsUsed, changed };
    }

    const bestResult = mutableResults[bestResultIdx];
    const enrichedVerdicts = [...bestResult.verdicts];

    for (let vi = 0; vi < enrichedVerdicts.length; vi++) {
      const verdict = enrichedVerdicts[vi];
      if (verdict.passed) continue; // only enrich failing arbiters

      const arbiterDef = this.registry.getById(verdict.arbiterId);
      if (!arbiterDef.isSuccess) continue;

      if (!this.shouldRunContextSearch(arbiterDef.data!, verdict, input.archetype)) continue;

      const gapSignal = this.detectGapSignal(verdict.notes);
      if (!gapSignal) continue;

      this.logger.log(
        `T583: Context enrichment — arbiter=${verdict.arbiterId} score=${verdict.score} ` +
          `gap="${gapSignal}" round=${round.roundNumber}`,
      );

      // Enrichment iterations for this arbiter
      let currentVerdict: ArbiterVerdict = { ...verdict, contextInsufficiencySignal: gapSignal };
      let iterationChanged = false;

      for (let iter = 1; iter <= maxIterPerArbiter; iter++) {
        if (budgetCallsUsed + 2 > budgetMax) {
          this.logger.warn(
            `T583: Budget exhausted (${budgetCallsUsed}/${budgetMax}) — stopping enrichment`,
          );
          break;
        }

        const enrichResult = await this.contextQueryHandler!.executeQuery({
          arbiterId: verdict.arbiterId,
          gapDescription: gapSignal,
          budgetCallsUsed,
          budgetMax,
          iterationNumber: iter,
          verdictBefore: String(currentVerdict.score),
          runId: input.runId,
          tenantId: input.tenantId,
        });

        if (!enrichResult.isSuccess) {
          this.logger.warn(
            `T583: executeQuery failed for arbiter=${verdict.arbiterId}: ${enrichResult.errorMessage}`,
          );
          break;
        }

        budgetCallsUsed = enrichResult.data!.budgetCallsUsed;
        const disposition = enrichResult.data!.disposition;

        if (disposition === 'BUDGET_EXHAUSTED') break;
        if (disposition === 'ZERO_RESULTS' || disposition === 'AI_FAILED') break;
        // disposition === 'ENRICHED'

        // Re-run arbiter with injected context prepended to prompt
        const enrichedArbiter: ArbiterDefinition = {
          ...arbiterDef.data!,
          promptTemplate:
            enrichResult.data!.injectionBlock + '\n' + arbiterDef.data!.promptTemplate,
        };

        const rerunResult = await this.arbiterService.judge(
          { code: bestResult.candidate.code, model: bestResult.candidate.model },
          enrichedArbiter,
        );

        if (!rerunResult.isSuccess) {
          this.logger.warn(
            `T583: Arbiter re-run failed for ${verdict.arbiterId}: ${rerunResult.errorMessage}`,
          );
          break;
        }

        const newVerdict = rerunResult.data!;
        const scoreDelta = newVerdict.score - currentVerdict.score;

        this.logger.log(
          `T583: Arbiter re-run — arbiter=${verdict.arbiterId} ` +
            `score=${currentVerdict.score}→${newVerdict.score} passed=${newVerdict.passed} iter=${iter}`,
        );

        currentVerdict = { ...newVerdict, contextInsufficiencySignal: gapSignal };
        iterationChanged = true;

        // Sufficiency check: stop if passed or score improved enough
        if (newVerdict.passed || scoreDelta >= sufficiencyScoreDelta) {
          break;
        }
      }

      if (iterationChanged) {
        enrichedVerdicts[vi] = currentVerdict;
        changed = true;
      }
    }

    if (changed) {
      mutableResults[bestResultIdx] = { ...bestResult, verdicts: enrichedVerdicts };
    }

    return { budgetCallsUsed, changed };
  }

  // ── T583: Helpers ───────────────────────────────────────────────────────────

  /**
   * Determine whether an arbiter qualifies for context search.
   * Category C: never. Category A: always when failing. Category B: conditional.
   */
  private shouldRunContextSearch(
    arbiter: ArbiterDefinition,
    verdict: ArbiterVerdict,
    archetype?: string,
  ): boolean {
    // Category C — hard-excluded IDs
    if (CATEGORY_C_IDS.has(arbiter.id)) return false;
    // Only enrich failing arbiters
    if (verdict.passed) return false;
    // Category A — always search when failing
    if (arbiter.requiresContextSearch === true) return true;
    // Category B — conditional
    if (arbiter.contextSearchCondition) {
      const cond = arbiter.contextSearchCondition;
      if (cond.archetypes !== undefined) {
        // Need archetype from LoopInput; skip if unknown (conservative)
        return archetype ? cond.archetypes.includes(archetype) : false;
      }
      if (cond.minCurriculumTier !== undefined) {
        // CF-T583-2: curriculumTier hardcoded at 3 for now
        const hardcodedTier = 3;
        return hardcodedTier >= cond.minCurriculumTier;
      }
    }
    return false;
  }

  /**
   * Scan arbiter notes for gap signal keywords.
   * Returns the first keyword found (used as gapDescription), or undefined.
   */
  private detectGapSignal(notes: string[]): string | undefined {
    const combined = notes.join(' ').toLowerCase();
    for (const keyword of GAP_KEYWORDS) {
      if (combined.includes(keyword.toLowerCase())) {
        return keyword;
      }
    }
    return undefined;
  }
}
