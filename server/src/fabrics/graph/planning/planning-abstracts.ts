/**
 * Abstract class boundaries for all 12 dynamic AI planning components.
 * These are the contracts both BootstrapXxx and AIDrivenXxx implementations satisfy.
 *
 * Also exports IGraphConfigReader — a minimal config interface used by all bootstrap
 * classes. Backed by FreedomConfigManager in production; easily mocked in tests.
 *
 * Phase 2: Bootstrap implementations only (graph traversal, no AI).
 * Phase 3: AI-driven implementations added alongside.
 */

// ── Config reader ──────────────────────────────────────────────────────────────

/** Minimal config interface used by bootstrap classes to read threshold values. */
export interface IGraphConfigReader {
  get(key: string, fallback: number): Promise<number>;
}

/** Injection token for IGraphConfigReader. */
export const GRAPH_CONFIG_READER = 'GRAPH_CONFIG_READER';

// ── Panel assembly ─────────────────────────────────────────────────────────────

export interface ArbiterPanel {
  arbiters: string[];
  source: 'bootstrap-graph-query' | 'ai-pipeline' | 'fallback-invariant';
  reasoning?: string;
}

export abstract class IArbiterPanelHandler {
  abstract assemblePanel(params: {
    archetype: string;
    context: {
      crossFlowEvents: boolean;
      newAlgorithmicPattern: boolean;
      isFirstOfArchetype: boolean;
      runId: string;
    };
  }): Promise<ArbiterPanel>;
}

// ── Escalation ─────────────────────────────────────────────────────────────────

export type EscalationAction =
  | 'ACCEPT'
  | 'CYCLE_WITH_PATCH'
  | 'ESCALATE_TO_UPPER_JUDGE'
  | 'ESCALATE_TO_HUMAN'
  | 'UNDECIDED';

export interface EscalationResult {
  action: EscalationAction;
  reasoning: string;
  chosen?: unknown;
}

export interface ArbiterPanelVerdicts {
  candidates: Array<{ id: string; score: number; lowestSubScore: string; challenges: number }>;
  blocks: Array<{ candidateId: string; reason: string; arbiterRole: string }>;
}

export abstract class IEscalationHandler {
  abstract evaluate(params: {
    verdicts: ArbiterPanelVerdicts;
    cyclesUsed: number;
    cycleBudget: number;
    archetype: string;
    runId: string;
  }): Promise<EscalationResult>;
}

// ── Cycle routing ──────────────────────────────────────────────────────────────

export type CycleAction =
  | 'ACCEPT'
  | 'ACCEPT_INVERSION'
  | 'CYCLE_WITH_PATCH'
  | 'CYCLE_WITH_PATTERN'
  | 'STOP_STRUCTURAL'
  | 'ESCALATE_TO_UPPER_JUDGE';

export interface CycleRouteResult {
  action: CycleAction;
  bottleneck?: string;
  patchClass?: 'DETAIL_GAP' | 'PATTERN_MISSING';
  note?: string;
  /** Graph edge that drove the decision (for audit and DPO attribution). */
  decidingEdge?: {
    fromEntity: string;
    relationship: string;
    toEntity: string;
    confidence: number;
  };
}

export abstract class ICycleRouter {
  abstract route(params: {
    score: number;
    archetype: string;
    cycle: number;
    budget: number;
    subScores: Record<string, number>;
    runId: string;
  }): Promise<CycleRouteResult>;
}

// ── Signal selection ───────────────────────────────────────────────────────────

export type SignalType =
  | 'OUTCOME'
  | 'DPO_TRIPLE'
  | 'PROMPT_PATCH'
  | 'GAP_SIGNAL'
  | 'CALIBRATION'
  | 'DESIGN_FLAW'
  | 'MODEL_COMPARISON'
  | 'SHADOW_RUN'
  | 'ARBITER_VERDICT';

export interface RequiredSignals {
  required: SignalType[];
  reasoning: string;
}

export abstract class ISignalRouter {
  abstract computeRequired(flowContext: {
    flowId: string;
    purpose: string;
    isMultiCycle: boolean;
    capabilityMissing: boolean;
    genesisPromptChanged: boolean;
    topologyWasWrong: boolean;
    multiGenerateRan: boolean;
    shadowRunActive: boolean;
    arbiterPanelRan: boolean;
  }): Promise<RequiredSignals>;

  abstract verifyEmitted(
    required: SignalType[],
    emitted: SignalType[],
  ): {
    passed: boolean;
    missing: SignalType[];
    message: string;
  };
}

// ── Difficulty prediction ──────────────────────────────────────────────────────

export abstract class IDifficultyPredictor {
  abstract predict(params: {
    archetype: string;
    novelPatterns: string[];
    hasClarityNote: boolean;
    isInversionCase: boolean;
  }): Promise<{ budget: number; rationale: string; confidence: number }>;
}

// ── NODE completeness ──────────────────────────────────────────────────────────

export interface NodeRepresentation {
  intent: {
    purpose: string;
    failureModes?: string[];
    invariants?: string[];
    domainConcepts?: string[];
  };
  constraints?: Array<{ ruleId?: string; description: string }>;
}

export abstract class INodeCompletenessValidator {
  abstract validate(params: { node: NodeRepresentation; archetype: string }): Promise<{
    passed: boolean;
    hardViolations: string[];
    aiGrading?: { overallScore: number; suggestions: string[] };
  }>;
}

// ── Scope classification ───────────────────────────────────────────────────────

export type ScopeLadderLevel = 'CONVENTION' | 'ADAPTATION' | 'EXTENSION' | 'NEW_FLOW' | 'NEW_INFRA';

export abstract class IScopeClassifier {
  abstract classify(params: {
    gapType: string;
    serviceCategory: string;
    description: string;
  }): Promise<{ level: ScopeLadderLevel; rationale: string; estimatedEffort: string }>;
}

// ── Schema chain validation ────────────────────────────────────────────────────

export abstract class ISchemaChainValidator {
  abstract validateChain(flowId: string): Promise<{
    valid: boolean;
    breaks: Array<{ producer: string; consumer: string; missingField: string }>;
  }>;
}

// ── Assumption registry linting ────────────────────────────────────────────────

export abstract class IAssumptionRegistryLinter {
  abstract lint(sessionFileContent: string): Promise<{
    passed: boolean;
    violations: string[];
  }>;
}

// ── Blast radius ───────────────────────────────────────────────────────────────

export abstract class IBlastRadiusCalculator {
  abstract calculate(params: {
    changeType: string;
    artifactId: string;
    description: string;
  }): Promise<{
    knownDependents: string[];
    verificationCommands: string[];
  }>;
}

// ── Retrospective ──────────────────────────────────────────────────────────────

export abstract class IRetrospectiveService {
  abstract runR1(flowId: string): Promise<{
    calibration: Record<string, number>;
    clearToProceed: boolean;
    promotionResults: Array<{ archetype: string; arbiter: string; result: string }>;
  }>;
}

// ── Cross-layer curriculum routing ────────────────────────────────────────────

export abstract class ICrossLayerCurriculumRouter {
  abstract routePlanningToCodeGen(triple: unknown): Promise<void>;
  abstract routeCodeGenBlockToPlanning(blockEvent: {
    checkId: string;
    archetype: string;
    arbiterRole: string;
    runId: string;
  }): Promise<void>;
}

// ── AI Decision Pipeline (Phase 3) ────────────────────────────────────────────

/**
 * All planning decision types handled by the AI pipeline.
 * Each maps to a set of iron rules (CF-PANEL-*, CF-CYCLE-*, etc.)
 * and a decision-specific prompt in AiDecisionPipelineService.
 */
export type PlanningDecisionType =
  | 'PANEL_ASSEMBLY'
  | 'CYCLE_ROUTING'
  | 'ESCALATION'
  | 'SIGNAL_SELECTION'
  | 'BUDGET_PREDICTION'
  | 'SCOPE_CLASSIFICATION'
  | 'NODE_COMPLETENESS'
  | 'SCHEMA_CHAIN'
  | 'BLAST_RADIUS'
  | 'ASSUMPTION_LINT';

/**
 * DPO triple stored in xiigen-planning-decisions index.
 * V9-002: chosen.model MUST differ from rejected.model for
 * countsTowardThreshold to be true.
 */
export interface PlanningDpoTriple {
  decisionType: PlanningDecisionType;
  category: string;
  trainingCategory: 'GENERATED' | 'REINFORCEMENT';
  curriculumTier: 1;
  archetype?: string;
  runId: string;
  flowId?: string;
  chosen: {
    decision: unknown;
    model: string;
    reasoning: string;
  };
  rejected: {
    decision: unknown;
    model: string;
    reasoning: string;
  };
  teachingPoint: string;
  confidence: number;
  trainingDataQuality: 'OUTCOME_PENDING' | 'VALIDATED';
  countsTowardThreshold: boolean;
  derivedFrom?: string;
  createdAt: string;
}

/** Result returned by IAIDecisionPipeline.decide(). */
export interface AIPipelineDecision {
  decision: unknown;
  reasoning: string;
  confidence: number;
  modelUsed: string;
  alternatives: Array<{ decision: unknown; reasoning: string; model: string }>;
}

/**
 * The AI decision pipeline boundary.
 * Injected into all AIDrivenXxx classes via AI_DECISION_PIPELINE token.
 *
 * 4-role protocol:
 *   1. Context retrieval    — graph edges provided by caller
 *   2. N implementors       — blind, shuffled, labeled A/B/C
 *   3. AI arbiters          — iron rules enforcement; BLOCK removes from pool
 *   4. Upper manager        — synthesize when arbiters disagree
 *
 * V9-002: chosen.model MUST differ from rejected.model.
 */
export abstract class IAIDecisionPipeline {
  abstract decide(input: {
    decisionType: PlanningDecisionType;
    inputs: Record<string, unknown>;
    graphContext: import('../interfaces/graph-types').GraphEdge[];
    runId: string;
    archetype?: string;
    flowId?: string;
  }): Promise<AIPipelineDecision>;
}
