/**
 * feedback.handler — Node handler for DPO triple capture + P5 metrics.
 *
 * Stores a complete DPO training triple to xiigen-training-data, including
 * all 5 domain-context fields (null on write, labeled on conflict resolution).
 * Also writes FlowStateSnapshot for user-facing flows.
 *
 * GAP-08: DPO triple full context format
 * GAP-04: FlowStateSnapshot write path
 * Z-1.4: prompt.system captured in DPO triple
 * Z-1.5: runtimeContext.fabricProviders captured in DPO triple
 * G-6:   DPO validity gate (validateDpoTriple) enforced before every storeDocument
 * G-1:   P18 teaching fields: curriculumTier, targetModelFamily, instructionFormat,
 *         distillationReadiness, shadowRunId
 *
 * DNA-3: returns DataProcessResult, never throws
 * DNA-8: storeDocument BEFORE enqueue
 */
import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { IAiProvider, AI_PROVIDER } from '../../fabrics/interfaces/ai-provider.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import {
  INodeHandler,
  NodeHandlerContext,
  NodeHandlerResult,
  ModelComparisonResult,
} from './node-handler.types';
import { randomUUID } from 'crypto';
import { validateDpoTriple } from './dpo-validation';
import { DpoTriple } from '../dpo-training-data.service';
import { validateCrossModelProvenance } from '../v9-validation';
import { XIIGEN_FREEDOM_KEYS, XIIGEN_FREEDOM_DEFAULTS } from '../../freedom/config-schema';
// A-4a: PersistentFeedbackStore feeds shouldEvolve() — without it, PromptEvolver always returns false
import { PersistentFeedbackStore } from '../../learning/feedback-store';
import { createFeedbackRecord } from '../../learning/feedback-types';
// A-4b: PromptEvolver wired to run when score < 0.80 (M2 IMPROVE layer)
import { PromptEvolver, type IAiProviderLike } from '../../learning/prompt-evolver';
// B-7: RagQualityTracker records pattern outcome signal
import { RagQualityTracker } from '../../learning/rag-quality-tracker';
// SS-02: RequiredProviderValidator guards DPO triples against missing fabric providers
import { RequiredProviderValidator } from '../validators/required-provider-validator';
// B-5: FREEDOM config for score history retention
import {
  IFreedomConfigService,
  FREEDOM_CONFIG_SERVICE,
} from '../../freedom/freedom-config.interface';
// G5: GraphRagSyncService — fire-and-forget DPO triple sync to nano-graphrag
import { GraphRagSyncService } from '../graph-rag-sync.service';

/**
 * Determine DPO quality classification for a training triple (V9-002 gate).
 * Storage ALWAYS proceeds regardless of the quality tag — this never blocks writes.
 */
export function determineDpoQuality(triple: Partial<DpoTriple>): {
  quality: 'CROSS_MODEL_VALID' | 'MONO_MODEL_CALIBRATION' | 'INVALID';
  countsTowardThreshold: boolean;
} {
  // INVALID: missing structural requirements
  // ROOT-C fix (FLOW-05 G9, FLOW-06 K1-G1): chosen/rejected stored as top-level strings.
  // Support both string format (current) and {code,model} object format (future).
  const t = triple as unknown as Record<string, unknown>;
  const chosenCode =
    typeof t['chosen'] === 'string'
      ? t['chosen']
      : ((t['chosen'] as Record<string, unknown> | undefined)?.['code'] as string | undefined);
  const rejectedCode =
    typeof t['rejected'] === 'string'
      ? t['rejected']
      : ((t['rejected'] as Record<string, unknown> | undefined)?.['code'] as string | undefined);
  const promptSystem = (t['prompt'] as Record<string, unknown> | undefined)?.['system'];
  if (!chosenCode || !rejectedCode || !promptSystem) {
    return { quality: 'INVALID', countsTowardThreshold: false };
  }
  // CROSS_MODEL_VALID: all quality requirements met
  const chosenModel =
    ((triple as Record<string, unknown>).chosenModel as string | undefined) ??
    ((triple as Record<string, unknown>).chosen_model as string | undefined);
  const rejectedModel =
    ((triple as Record<string, unknown>).rejectedModel as string | undefined) ??
    ((triple as Record<string, unknown>).rejected_model as string | undefined);
  const shuffleApplied = (triple as Record<string, unknown>).shuffleWasApplied as
    | boolean
    | undefined;
  const tier = (triple as Record<string, unknown>).curriculumTier as number | undefined;

  if (
    chosenModel &&
    rejectedModel &&
    chosenModel !== rejectedModel &&
    shuffleApplied === true &&
    typeof tier === 'number' &&
    tier >= 1 &&
    tier <= 5
  ) {
    return { quality: 'CROSS_MODEL_VALID', countsTowardThreshold: true };
  }
  // Everything else: mono-model calibration
  return { quality: 'MONO_MODEL_CALIBRATION', countsTowardThreshold: false };
}

@Injectable()
export class FeedbackHandler implements INodeHandler {
  readonly nodeType = 'feedback';
  private readonly logger = new Logger(FeedbackHandler.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    // A-4a: tracks feedback records so PromptEvolver.shouldEvolve() has data to count
    @Optional() private readonly feedbackStore?: PersistentFeedbackStore,
    // A-4b: evolves prompts when score < 0.80 (M2 IMPROVE layer)
    @Optional() private readonly promptEvolver?: PromptEvolver,
    // A-4b: AI provider for prompt evolution (IAiProvider → IAiProviderLike adapter)
    @Optional() @Inject(AI_PROVIDER) private readonly ai?: IAiProvider,
    // B-7: records RAG pattern usage outcome for quality weight tracking
    @Optional() private readonly ragTracker?: RagQualityTracker,
    // SS-02: validates generated code has registered fabric providers before DPO storage
    @Optional() private readonly requiredProviderValidator?: RequiredProviderValidator,
    // B-5: FREEDOM config for SCORE_HISTORY_RETENTION — 0 = unlimited (no cap)
    @Optional()
    @Inject(FREEDOM_CONFIG_SERVICE)
    private readonly freedomConfig?: IFreedomConfigService,
    // G5: GraphRagSyncService — fire-and-forget per-triple sync to nano-graphrag
    @Optional() private readonly graphRagSync?: GraphRagSyncService,
  ) {}

  /**
   * Resolve curriculum tier from contract archetype (P18).
   * ROUTING=1, DATA_PIPELINE=2, ORCHESTRATION=4, SCHEDULED=5.
   * Default=3 for unrecognized archetypes (conservative mid-scale).
   */
  private resolveCurriculumTier(archetype: string | undefined): 1 | 2 | 3 | 4 | 5 {
    const tierMap: Record<string, 1 | 2 | 3 | 4 | 5> = {
      routing: 1,
      data_pipeline: 2,
      adaptation: 2, // GAP-ARCH-01: platform adapter ports are tier-2 (comparable to data_pipeline)
      service: 3,
      transaction: 3,
      orchestration: 4,
      ai_generation: 4,
      composite: 4,
      scheduled: 5,
      fan_in: 4, // FAN_IN is ORCHESTRATION-class (parallel multi-source)
      convergence: 4, // CONVERGENCE is ORCHESTRATION-class (confidence gate)
      broadcast: 3, // BROADCAST is TRANSACTION-class (best-effort delivery)
      // FLOW-03: Event Management Platform
      registration: 3, // REGISTRATION is TRANSACTION-class (atomic slot claim)
      promotion: 3, // PROMOTION is TRANSACTION-class (content distribution)
      analytics: 2, // ANALYTICS is DATA_PIPELINE-class (aggregation + counters)
      // FLOW-04: Event Attendance & Management
      attendance: 3, // ATTENDANCE is TRANSACTION-class (atomic capacity, distributed lock)
      aggregation: 3, // AGGREGATION is TRANSACTION-class (TIME_BOUNDED_WINDOW, event-driven)
      // FLOW-05: Achievements & Gamification
      completion: 2, // COMPLETION is DATA_PIPELINE-class (aggregation + idempotency)
      gamification: 4, // GAMIFICATION is ORCHESTRATION-class (multi-signal scoring)
      'broadcast-social': 4, // BROADCAST_SOCIAL is ORCHESTRATION-class (social fan-out)
      // FLOW-06: Community Groups & Membership
      membership: 3, // MEMBERSHIP is TRANSACTION-class (role assignment + tenant isolation)
      group_feed: 2, // GROUP_FEED is DATA_PIPELINE-class (engagement scoring)
      // FLOW-10: Reviews + Reputation
      submission_gateway: 2, // SUBMISSION_GATEWAY is DATA_PIPELINE-class (standard gateway)
      moderation: 3, // MODERATION is TRANSACTION-class (complex reasoning path)
      // Note: 'aggregation' already mapped above (line 124) — no duplicate needed
      // FLOW-13: Data Warehouse & Retention
      query_engine: 3,
      retention: 3,
      schema_registry: 2,
      analytics_engine: 2,
      ingestor: 2,
      // FLOW-14: ETL / Data Integration
      transform: 2,
      modeling: 3,
      activation: 2,
      // FLOW-15: Marketplace Extensions & Add-ons
      template: 2,
      scaffolding: 2,
      sandbox: 2,
      billing: 3,
      metering: 2,
      publishing: 2,
      oauth: 2,
      ai_addon: 3,
      scaling: 2,
      enterprise: 3,
      // FLOW-20: Real-time & Streaming
      request_response: 2,
    };
    return tierMap[(archetype ?? '').toLowerCase()] ?? 3;
  }

  /**
   * Resolve distillation readiness from tier + score (P18).
   *   READY:                  tier <= 3 AND score >= 0.85
   *   TOO_COMPLEX:            tier >= 4 AND score < 0.70
   *   PENDING_SIMPLIFICATION: all other cases
   */
  private resolveDistillationReadiness(
    curriculumTier: number,
    score: number,
  ): 'READY' | 'TOO_COMPLEX' | 'PENDING_SIMPLIFICATION' {
    if (curriculumTier <= 3 && score >= 0.85) return 'READY';
    if (curriculumTier >= 4 && score < 0.7) return 'TOO_COMPLEX';
    return 'PENDING_SIMPLIFICATION';
  }

  /**
   * Read a string value from FREEDOM config (DB index: 'freedom_configs').
   * Keys are stored with task_type: 'xiigen-engine' by seedFreedomConfig().
   * Returns the default if not found or on any error.
   * DNA-3: never throws.
   */
  private async getOssConfig(key: string, defaultValue: string): Promise<string> {
    try {
      const result = await this.db.searchDocuments('freedom_configs', {
        config_key: key,
        task_type: 'xiigen-engine',
      });
      if (result.isSuccess && (result.data ?? []).length > 0) {
        const value = (result.data![0] as Record<string, unknown>)['value'];
        if (typeof value === 'string' && value.length > 0) return value;
      }
    } catch {
      // swallow — return default
    }
    return defaultValue;
  }

  /**
   * Write shadow run record to xiigen-shadow-runs after DPO triple.
   * P21: independence timeline requires gap score tracking from Phase B onward.
   * expensiveModelScore captured now; ossScore stays null until local model runs.
   * DNA-3: never throws. Failure is logged but does not block feedback response.
   */
  private async writeShadowRun(params: {
    runId: string;
    flowId: string;
    taskTypeId: string;
    tenantId: string;
    expensiveModelScore: number;
    archetypeTier: 1 | 2 | 3 | 4 | 5;
    curriculumTier: 1 | 2 | 3 | 4 | 5;
    expensiveModel: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    const doc: Record<string, unknown> = {
      shadowRunId: randomUUID(),
      taskTypeId: params.taskTypeId,
      flowId: params.flowId,
      tenantId: params.tenantId,
      runId: params.runId,
      archetypeTier: params.archetypeTier,
      curriculumTier: params.curriculumTier,
      expensiveModelScore: params.expensiveModelScore,
      ossScore: null,
      gapScore: null,
      expensiveModel: params.expensiveModel,
      ossModel: null,
      shadowStatus: 'PENDING_LOCAL_MODEL',
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.db.storeDocument(
      'xiigen-shadow-runs',
      doc,
      `${params.taskTypeId}::${params.runId}`,
    );
    if (!result.isSuccess) {
      this.logger.warn(`Shadow run write failed for ${params.taskTypeId}: ${result.errorMessage}`);
    } else {
      this.logger.debug(
        `Shadow run recorded: ${params.taskTypeId} expensiveScore=${params.expensiveModelScore.toFixed(3)}`,
      );
    }
  }

  /**
   * B-5 Fix: Append a cycle score to xiigen-run-traces scoreHistory.
   *
   * SCORE_HISTORY_RETENTION FREEDOM config controls max entries.
   * 0 = unlimited (default). > 0 = capped at N (oldest entries trimmed).
   *
   * Implementation: read-modify-write via IDatabaseService (no Painless scripts).
   * DNA-3: returns DataProcessResult, never throws.
   * DNA-8: storeDocument — no enqueue after this write.
   */
  async appendScore(taskTypeId: string, cycleScore: number): Promise<DataProcessResult<void>> {
    // Read SCORE_HISTORY_RETENTION from FREEDOM config — 0 = unlimited
    let historyRetention = 0;
    if (this.freedomConfig) {
      try {
        const configDoc = await this.freedomConfig.get('SCORE_HISTORY_RETENTION');
        if (configDoc && typeof configDoc['value'] === 'number') {
          historyRetention = configDoc['value'] as number;
        }
      } catch {
        // Swallow — use default 0 (unlimited)
      }
    }

    // Read existing trace document
    const traceResult = await this.db.getDocument('xiigen-run-traces', taskTypeId);
    const existing = traceResult.isSuccess && traceResult.data ? traceResult.data : {};

    // Build updated scoreHistory
    let scoreHistory: number[] = Array.isArray(existing['scoreHistory'])
      ? [...(existing['scoreHistory'] as number[])]
      : [];

    scoreHistory.push(cycleScore);

    // Apply cap if SCORE_HISTORY_RETENTION > 0 (max guard — 0 means no cap)
    if (historyRetention > 0 && scoreHistory.length > historyRetention) {
      scoreHistory = scoreHistory.slice(scoreHistory.length - historyRetention);
    }
    // historyRetention === 0 means no cap — no slice operation performed

    const updatedTrace: Record<string, unknown> = {
      ...existing,
      taskTypeId,
      scoreHistory,
      lastScore: cycleScore,
      updatedAt: new Date().toISOString(),
    };

    const storeResult = await this.db.storeDocument('xiigen-run-traces', updatedTrace, taskTypeId);
    if (!storeResult.isSuccess) {
      this.logger.warn(`appendScore failed for ${taskTypeId}: ${storeResult.errorMessage}`);
      return DataProcessResult.failure(
        'SCORE_APPEND_FAILED',
        storeResult.errorMessage ?? 'Failed to append score',
      );
    }

    return DataProcessResult.success(undefined);
  }

  async handle(ctx: NodeHandlerContext): Promise<DataProcessResult<NodeHandlerResult>> {
    const { contract, taskTypeId, runId, flowId, tenantId, priorOutputs, nodeConfig } = ctx;

    const generateOutput = priorOutputs.find((o) => o.nodeType === 'ai-generate');
    const scoreOutput = priorOutputs.find((o) => o.nodeType === 'score');
    const ragOutput = priorOutputs.find((o) => o.nodeType === 'rag-retrieve');
    const decomposeOutput = priorOutputs.find((o) => o.nodeType === 'decompose');

    const generatedCode = String(generateOutput?.data?.['generatedCode'] ?? '');
    const score = Number(scoreOutput?.data?.['score'] ?? 0);
    const ragPatterns = (ragOutput?.data?.['ragPatterns'] as Record<string, unknown>[]) ?? [];
    const planSteps = JSON.stringify(decomposeOutput?.data?.['planSteps'] ?? []);
    const modelComparison =
      (generateOutput?.data?.['modelComparison'] as ModelComparisonResult | null | undefined) ??
      null;
    const tripleStatus =
      (generateOutput?.data?.['tripleStatus'] as 'ACCEPTED' | 'UNDECIDED' | undefined) ??
      'ACCEPTED';

    // Z-1.4: Fetch genesis prompt text from ES — this is the system prompt for the DPO triple.
    // contract['systemPrompt'] is always undefined; the text lives in xiigen-prompts under
    // the task type's genesis document (promptType: 'genesis').
    let systemPrompt: string | null = null;
    const promptResult = await this.db.searchDocuments('xiigen-prompts', {
      taskTypeId,
      promptType: 'genesis',
    });
    if (promptResult.isSuccess && (promptResult.data ?? []).length > 0) {
      systemPrompt =
        String((promptResult.data![0] as Record<string, unknown>)['content'] ?? '') || null;
    }

    // P18: resolve OSS teaching fields from FREEDOM config (SESSION-G3A seeded these)
    const curriculumTier = this.resolveCurriculumTier(contract.archetype);
    const targetModelFamily = await this.getOssConfig(
      XIIGEN_FREEDOM_KEYS.OSS_TARGET_MODEL,
      XIIGEN_FREEDOM_DEFAULTS[XIIGEN_FREEDOM_KEYS.OSS_TARGET_MODEL] as string,
    );
    const instructionFormat = await this.getOssConfig(
      XIIGEN_FREEDOM_KEYS.OSS_INSTRUCTION_FORMAT,
      XIIGEN_FREEDOM_DEFAULTS[XIIGEN_FREEDOM_KEYS.OSS_INSTRUCTION_FORMAT] as string,
    );
    const distillationReadiness = this.resolveDistillationReadiness(curriculumTier, score);

    // Build DPO triple
    // chosen = high-quality reference or current (score >= 0.80)
    // rejected = low-quality version or prior attempt
    const isHighQuality = score >= 0.8;
    const chosen = isHighQuality ? generatedCode : String(nodeConfig?.['referenceCode'] ?? '');
    const rejected = isHighQuality ? String(nodeConfig?.['priorAttempt'] ?? '') : generatedCode;

    // Z-1.5: Resolve actual providers that ran during this execution.
    // Priority: resolvedProviders (actual) → runtimeHints (this-run override) → defaults.
    // This ensures the DPO triple captures what actually ran, not global config.
    const fabricProviders: Record<string, string> =
      Object.keys(ctx.resolvedProviders ?? {}).length > 0
        ? (ctx.resolvedProviders ?? {})
        : {
            IScopedMemoryService: ctx.runtimeHints?.memoryProvider ?? 'redis',
            ISchedulerService: ctx.runtimeHints?.schedulerProvider ?? 'bull',
            ICodeRepositoryService: ctx.runtimeHints?.repositoryProvider ?? 'zip_archive',
          };

    const triple = {
      tripleId: randomUUID(),
      runId,
      flowId,
      taskTypeId,
      tenantId,
      // Z-1.4: prompt split into system + user for full DPO context.
      // system = genesis prompt text fetched from ES (xiigen-prompts, promptType: 'genesis').
      prompt: {
        system: systemPrompt,
        user: contract.ironRules?.join('\n') ?? `Generate ${taskTypeId}`,
      },
      chosen: chosen || generatedCode,
      rejected: rejected || '',
      score,
      ragPatterns: ragPatterns.slice(0, 5).map((p) => ({ id: p['id'], title: p['title'] })),
      planSteps,
      // Z-1.5: runtime context — what actually ran during this execution
      runtimeContext: {
        projectId: ctx.projectId ?? null,
        fabricProviders,
      },
      // Domain context fields — null on write, labeled during conflict resolution
      domain: null as string | null,
      entityType: null as string | null,
      conflictType: null as string | null,
      ftId: null as string | null,
      productScope: null as string | null,
      // Multi-model comparison — records which model produced chosen/rejected and judge scores
      modelComparison: modelComparison ?? null,
      tripleStatus,
      // P18 OSS teaching fields
      curriculumTier,
      targetModelFamily,
      instructionFormat,
      distillationReadiness,
      shadowRunId: null as string | null, // populated by SESSION-G5
      // V9-002: quality tag — set before storage, never blocks write
      trainingDataQuality: undefined as
        | 'CROSS_MODEL_VALID'
        | 'MONO_MODEL_CALIBRATION'
        | 'INVALID'
        | 'INVALID_MISSING_DEPENDENCY'
        | undefined,
      countsTowardThreshold: undefined as boolean | undefined,
      v9ValidationCode: undefined as string | undefined,
      // Extended DPO fields (R21 — FLOW-14 domain context for fine-tuning routing)
      // domainContext: e.g., 'ETL_PIPELINE' for FLOW-14 triples
      // conflictsWith: patterns deliberately avoided (negative transfer learning)
      ...(nodeConfig?.['domainContext']
        ? { domainContext: String(nodeConfig['domainContext']) }
        : {}),
      ...(Array.isArray(nodeConfig?.['conflictsWith'])
        ? { conflictsWith: nodeConfig['conflictsWith'] as string[] }
        : {}),
      createdAt: new Date().toISOString(),
    };

    // ── DPO VALIDITY GATE ─────────────────────────────────────────────────────
    // G-6 fix: validateDpoTriple() runs before ANY write to training indices.
    // SINGLE_PROVIDER / SAME_MODEL / SHUFFLE_MISSING → pending index (not error)
    // INVALID_TIER → hard failure (only after SESSION-G1 adds curriculumTier)
    const validationResult = validateDpoTriple(triple as Parameters<typeof validateDpoTriple>[0]);

    if (validationResult.disposition !== 'VALID') {
      this.logger.warn(
        `DPO_VALIDITY_GATE [${validationResult.disposition}] ${taskTypeId}: ${validationResult.reason}`,
      );

      if (validationResult.disposition === 'INVALID_TIER') {
        return DataProcessResult.failure('DPO_VALIDITY_GATE', validationResult.reason);
      }

      // SINGLE_PROVIDER, SAME_MODEL, SHUFFLE_MISSING → route to pending index
      const pendingResult = await this.db.storeDocument(
        'xiigen-training-data-pending',
        {
          ...(triple as unknown as Record<string, unknown>),
          pendingReason: validationResult.disposition,
        },
        triple.tripleId,
      );
      if (!pendingResult.isSuccess) {
        this.logger.error(`Failed to store pending triple: ${pendingResult.errorMessage}`);
      }
      return DataProcessResult.success({
        data: {
          tripleId: triple.tripleId,
          score,
          promptOpsTriggered: false,
          tripleStatus: validationResult.disposition,
          domainContext: {
            domain: null,
            entityType: null,
            conflictType: null,
            ftId: null,
            productScope: null,
          },
        },
      });
    }

    // V9-002: tag quality before storage — never blocks write
    const qualityTag = determineDpoQuality(triple as unknown as Partial<DpoTriple>);
    triple.trainingDataQuality = qualityTag.quality;
    triple.countsTowardThreshold = qualityTag.countsTowardThreshold;

    // V9-002: cross-model provenance validation — enriches triple with validation code, never blocks write
    const v9Result = validateCrossModelProvenance(triple as unknown as Record<string, unknown>);
    triple.v9ValidationCode = v9Result.code;

    // SS-02: RequiredProviderValidator — tag missing fabric providers, NEVER blocks storage
    if (this.requiredProviderValidator && triple.chosen) {
      const providerCheck = await this.requiredProviderValidator.validate(
        typeof triple.chosen === 'string' ? triple.chosen : JSON.stringify(triple.chosen),
      );
      if (!providerCheck.valid) {
        triple.trainingDataQuality = 'INVALID_MISSING_DEPENDENCY';
        triple.countsTowardThreshold = false;
        this.logger.warn(
          `DPO triple ${triple.tripleId} tagged INVALID_MISSING_DEPENDENCY: ${providerCheck.missingProviders.join(', ')}`,
        );
      }
    }

    // DNA-8: storeDocument first
    // Three-way tie (UNDECIDED) routes to review index for human labeling
    const targetIndex =
      tripleStatus === 'UNDECIDED' ? 'xiigen-training-data-review' : 'xiigen-training-data';
    const storeResult = await this.db.storeDocument(
      targetIndex,
      triple as unknown as Record<string, unknown>,
      triple.tripleId,
    );

    if (!storeResult.isSuccess) {
      this.logger.error(
        `Failed to store DPO triple for ${taskTypeId}: ${storeResult.errorMessage}`,
      );
      return DataProcessResult.failure(
        'FEEDBACK_STORE_FAILED',
        storeResult.errorMessage ?? 'DPO store failed',
      );
    }

    this.logger.debug(
      `Feedback ${taskTypeId}: triple=${triple.tripleId} score=${score.toFixed(3)}`,
    );

    // G5: GraphRAG fire-and-forget sync (per-triple mode when enabled)
    try {
      const syncModeDoc = this.freedomConfig
        ? await this.freedomConfig.get(XIIGEN_FREEDOM_KEYS.GRAPHRAG_SYNC_MODE).catch(() => null)
        : null;
      const syncMode = String(syncModeDoc?.['value'] ?? 'disabled');

      if (syncMode === 'per-triple' && this.graphRagSync) {
        // Fire-and-forget: do NOT await — feedback handler returns before sync completes
        void this.graphRagSync.syncTriple(triple.tripleId, tenantId).catch((err) => {
          this.logger.warn(
            `GraphRAG syncTriple fire-and-forget failed for ${triple.tripleId}: ${String(err)}`,
          );
        });
      }
    } catch {
      // DNA-3: never throw — GraphRAG sync failure is non-blocking
    }

    // P21: write shadow run — independence timeline tracking (G-5 fix)
    await this.writeShadowRun({
      runId,
      flowId,
      taskTypeId,
      tenantId,
      expensiveModelScore: score,
      archetypeTier: triple.curriculumTier,
      curriculumTier: triple.curriculumTier,
      expensiveModel: String(modelComparison?.chosen?.model ?? 'unknown'),
    });

    // A-4a: Write FeedbackRecord so PromptEvolver.shouldEvolve() has data to count
    if (this.feedbackStore) {
      this.feedbackStore.record(
        createFeedbackRecord({
          tenantId,
          taskType: taskTypeId,
          modelId: String(modelComparison?.chosen?.model ?? 'unknown'),
          qualityScore: { total: score, dimensions: [] },
          passed: score >= 0.8,
        }),
      );
    }

    // B-5: Write model preference signal when blind judging ran (P17 MODEL_COMPARISON)
    if (modelComparison && modelComparison.shuffleWasApplied) {
      const preferenceDoc: Record<string, unknown> = {
        prefId: `${triple.tripleId}::model-pref`,
        flowId,
        taskTypeId,
        archetype: contract.archetype,
        station: 'AF-1',
        chosen: { model: modelComparison.chosen?.model, score: modelComparison.chosen?.score },
        rejected: modelComparison.rejected
          ? { model: modelComparison.rejected.model, score: modelComparison.rejected.score }
          : null,
        shuffleApplied: true,
        curriculumTier: triple.curriculumTier,
        createdAt: new Date().toISOString(),
      };
      const prefResult = await this.db.storeDocument(
        'xiigen-model-preference',
        preferenceDoc,
        preferenceDoc['prefId'] as string,
      );
      if (!prefResult.isSuccess) {
        this.logger.warn(`Failed to write model-preference signal: ${prefResult.errorMessage}`);
        // Non-blocking: DPO triple already stored — model preference is supplementary
      }
    }

    // B-7: Record RAG pattern usage outcome for quality weight tracking
    if (this.ragTracker && ragPatterns.length > 0) {
      for (const pattern of ragPatterns) {
        const patternId = pattern['id'] as string | undefined;
        if (patternId) {
          this.ragTracker.recordPatternUsage(tenantId, patternId, score >= 0.85);
        }
      }
    }

    // A-4b: PromptOps — evolve prompt when score < 0.80 and enough failures accumulated (M2)
    // promptOpsTriggered=true means "score threshold crossed" — set regardless of wiring
    let promptOpsTriggered = score < 0.8;
    if (score < 0.8 && this.promptEvolver && this.ai) {
      const shouldEvolveResult = this.promptEvolver.shouldEvolve(tenantId, taskTypeId, 'genesis');
      if (shouldEvolveResult.isSuccess && shouldEvolveResult.data) {
        // Adapter: IAiProvider → IAiProviderLike (different generate() signature)
        // Adapter: IAiProvider.generate(prompt, opts) → IAiProviderLike.generate(tenantId, prompt, opts)
        // IAiProviderLike returns DataProcessResult<Record<string,unknown>> (not string)
        const aiProviderLike: IAiProviderLike = {
          generate: async (_tid: string, prompt: string, opts?: Record<string, unknown>) =>
            this.ai!.generate(prompt, { maxTokens: (opts?.['maxTokens'] as number) ?? 2048 }).then(
              (r) =>
                r.isSuccess
                  ? DataProcessResult.success({ text: r.data?.['text'] ?? '' } as Record<
                      string,
                      unknown
                    >)
                  : DataProcessResult.failure(r.errorCode!, r.errorMessage!),
            ),
        };
        promptOpsTriggered = true;
        const evolveResult = await this.promptEvolver.evolvePrompt(
          tenantId,
          taskTypeId,
          'genesis',
          aiProviderLike,
        );
        if (evolveResult.isSuccess) {
          this.logger.log(`PromptOps: prompt evolved for ${taskTypeId} — new version stored`);
        } else {
          this.logger.debug(
            `PromptOps: evolvePrompt returned ${evolveResult.errorCode} for ${taskTypeId}`,
          );
        }
      }
    } else if (score < 0.8) {
      this.logger.debug(
        `Score ${score.toFixed(3)} < 0.80 — PromptEvolver not wired for ${taskTypeId}`,
      );
    }

    // ENG-03: write planningLayerLearning signal to xiigen-flow-lifecycle.
    // Captures routing decisions and genesis score for planning retrospective.
    // DNA-3: failure is logged but does not block feedback response.
    // DNA-8: DPO triple already stored above — lifecycle write is supplementary.
    const routerOutput = priorOutputs.find((o) => o.nodeType === 'bootstrap-cycle-router');
    const routingDecisions: unknown[] = Array.isArray(routerOutput?.data?.['routingDecisions'])
      ? (routerOutput!.data!['routingDecisions'] as unknown[])
      : [];
    const planningLearningDoc: Record<string, unknown> = {
      lifecycleId: `${flowId}::${taskTypeId}::${runId}::planning`,
      flowId,
      taskTypeId,
      archetype: contract.archetype ?? null,
      genesisScore: score,
      cycleCount:
        typeof routerOutput?.data?.['cycleCount'] === 'number'
          ? routerOutput!.data!['cycleCount']
          : 1,
      routingDecisions,
      planningLayerLearning: true,
      timestamp: new Date().toISOString(),
    };
    const lifecycleResult = await this.db.storeDocument(
      'xiigen-flow-lifecycle',
      planningLearningDoc,
      planningLearningDoc['lifecycleId'] as string,
    );
    if (!lifecycleResult.isSuccess) {
      this.logger.warn(
        `planningLayerLearning write failed for ${taskTypeId}: ${lifecycleResult.errorMessage}`,
      );
    } else {
      this.logger.debug(
        `planningLayerLearning written for ${taskTypeId} score=${score.toFixed(3)}`,
      );
    }

    return DataProcessResult.success({
      data: {
        tripleId: triple.tripleId,
        score,
        promptOpsTriggered,
        domainContext: {
          domain: triple.domain,
          entityType: triple.entityType,
          conflictType: triple.conflictType,
          ftId: triple.ftId,
          productScope: triple.productScope,
        },
      },
    });
  }
}
