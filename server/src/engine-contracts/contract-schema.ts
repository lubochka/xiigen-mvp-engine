/**
 * Engine Contract Schema — defines the full format for engine contracts (task types).
 *
 * Each contract describes what the engine knows how to build:
 *   - Factory dependencies (which services, which fabrics)
 *   - AF station mapping (which AI pipeline generates/reviews/judges)
 *   - Quality gates (what the judge checks)
 *   - BFA registration (cross-flow conflict data)
 *   - Iron rules (what violations = build failure)
 *   - MACHINE vs FREEDOM split
 *
 * DNA-1: All toDict() produce Record<string, unknown> with snake_case keys.
 * DNA-3: validate() returns DataProcessResult.
 *
 * Phase 6.3: Engine contract foundation.
 * S1: Extended with IronRuleSpec, HandlerSpec, MachineConstantSpec, CrossFlowFactorySpec,
 *     GateEventSpec and 12+ optional EngineContract fields for pre-FLOW-01 engine build.
 */

import { DataProcessResult } from '../kernel/data-process-result';
import { FabricType, isValidFabricType } from '../factories/fabric-type';
import { ContractArchetype, isValidArchetype } from './archetypes';
import type { TaskTypeStackCoupling } from './stack-coupling';

// ── S1 Sub-types ──────────────────────────────────────

/**
 * Structured iron rule specification.
 * The ironRulesStructured field is the preferred representation when present;
 * ironRules (string[]) is retained for backward compatibility.
 */
export interface IronRuleSpec {
  /** Unique rule identifier (e.g., 'IR-1'). */
  id: string;
  /** Human-readable description of what the rule enforces. */
  description: string;
  /** Named check ID referenced by an arbiter (e.g., 'throttle_decorator_present'). */
  check?: string;
  /** Arbitrary parameters passed to the check implementation. */
  parameters?: Record<string, unknown>;
  /** Scope requirement — which document fields must be present and what entities it applies to. */
  scopeRequirement?: { fields: string[]; appliesTo?: string[] };
  /** Authorization gate — caller role constraints for this rule. */
  authorizationGate?: { requiredCallerRole: string; selfActionBlocked?: boolean };
  /** Enum constraint — a field must be one of the listed values. */
  enumConstraint?: { field: string; values: string[] };
}

/** Handler spec for pipeline/composite execution models. */
export interface HandlerSpec {
  /** Handler class or function name. */
  name: string;
  /** Execution order within the pipeline (lower = earlier). */
  order?: number;
  /** Condition expression that controls whether this handler runs. */
  condition?: string;
  /** What to do when condition evaluates to false. */
  conditionBehavior?: 'skip_if_false' | 'fail_if_false';
}

/** A fixed engine constant that must never come from FREEDOM config (MACHINE territory). */
export interface MachineConstantSpec {
  /** Constant key / name. */
  key: string;
  /** Value — string, number, or ordered list. */
  value: string | number | string[];
  /** Semantic type of the constant. */
  type?: 'constant' | 'formula' | 'ordering' | 'state_machine';
  /** When true, this value MUST be hardcoded; config override is forbidden. */
  neverFromConfig?: boolean;
}

/** Describes a factory declared in another flow that this contract depends on. */
export interface CrossFlowFactorySpec {
  /** Factory identifier of the dependency (e.g., 'F200'). */
  factoryId: string;
  /** The flow that owns / declares the factory. */
  fromFlow: string;
  /** What to do when the factory is absent at resolution time. */
  fallback?: 'register_if_absent' | 'error' | 'skip_if_absent';
  /** Classification of the cross-flow dependency relationship. */
  dependencyType?: 'cross-wave-hard' | 'flow-owned' | 'shared-same-wave-soft';
}

/** Gate event emitted when this contract completes or transitions. */
export interface GateEventSpec {
  /** CloudEvents type of the event (e.g., 'user.registered'). */
  eventType: string;
  /** Service / task type that emits the event. */
  emittedBy: string;
  /** When true, downstream tasks cannot start until this event is received. */
  blocksDownstream?: boolean;
}

// ── Arbiter Panel Config (SK-442, FC-26) ──────────────────────────────────────

/**
 * Minimum panel requirement — which arbiter IDs must be present and what quorum is needed.
 * FC-26: every contract with ORCHESTRATION or AI_GENERATION archetype must have
 * minPanel.required.length >= 3.
 */
export interface ArbiterMinPanel {
  /** Arbiter IDs that MUST produce a verdict for this contract. */
  readonly required: readonly string[];
  /** Minimum number of verdicts required before score is computed. */
  readonly quorum: number;
}

/**
 * Block semantics — which arbiter verdicts produce a hard BLOCK outcome.
 * A BLOCK from any listed arbiter halts the round. It is NEVER averaged.
 * P17: BLOCK class verdicts cannot be diluted by high scores from other arbiters.
 */
export interface ArbiterBlockSemantics {
  /** Arbiter IDs whose FAIL verdict escalates to BLOCK (not soft failure). */
  readonly blockOnFail: readonly string[];
}

/**
 * Upper judge — resolves disagreement between panel members.
 * Activated when two or more arbiters disagree above the threshold.
 */
export interface ArbiterUpperJudge {
  /** Arbiter ID or model key used as the tiebreaker. */
  readonly judgeId: string;
  /** Score disagreement (0–100) that triggers upper judge. */
  readonly disagreementThreshold: number;
}

/**
 * Full arbiter panel configuration for an EngineContract.
 * Required by FC-26 for ORCHESTRATION and AI_GENERATION archetypes.
 * When present, takes precedence over the legacy `arbiters?: string[]` field.
 *
 * Minimum panel per archetype (enforced at Gate A by FC-26):
 *   AI_GENERATION / ORCHESTRATION: ['dna', 'fabric', 'business_logic', 'key_principles', 'iron_rules']
 *   DATA_PIPELINE:                 ['dna', 'fabric', 'business_logic']
 *   ROUTING / SERVICE:             ['dna', 'fabric']
 */
export interface ArbiterPanelConfig {
  /** Minimum panel per archetype. */
  readonly minPanel: ArbiterMinPanel;
  /** Which arbiters produce BLOCK-level verdicts (never averaged). */
  readonly blockSemantics: ArbiterBlockSemantics;
  /** Escalation gate: what happens when aggregate score is below threshold. */
  readonly escalationGate: {
    readonly minAggregateScore: number;
    readonly onFail: 'RETRY' | 'ESCALATE' | 'HALT';
  };
  /** Upper judge for disagreement resolution. Optional. */
  readonly upperJudge?: ArbiterUpperJudge;
  /**
   * T583: Context enrichment policy for this contract.
   * Undefined = use engine FREEDOM defaults (enabled: true, searchMode: 'pool_only').
   * CF-T583-3: contextPolicy is undefined for all current contracts (deferred).
   */
  readonly contextPolicy?: {
    /** Disable context search for this contract. Default from FREEDOM: true (enabled). */
    readonly enabled?: boolean;
    /** Override search mode. Default from FREEDOM: 'pool_only'. */
    readonly searchMode?: string;
  };
}

// ── FactoryDependency ────────────────────────────────

/** A factory the engine contract depends on. */
export interface FactoryDependency {
  /** Factory identifier (F166, F167, ...). */
  readonly factoryId: string;
  /** Interface name (IInventoryService, ...). */
  readonly interfaceName: string;
  /** Which fabric this factory resolves through. */
  readonly fabricType: FabricType;
  /** Preferred provider hint (e.g., 'postgresql', 'redis_streams'). */
  readonly providerHint?: string;
  /** Human-readable description. */
  readonly description: string;
}

/** Serialize FactoryDependency to dict (DNA-1). */
export function factoryDependencyToDict(dep: FactoryDependency): Record<string, unknown> {
  return {
    factory_id: dep.factoryId,
    interface_name: dep.interfaceName,
    fabric_type: dep.fabricType,
    provider_hint: dep.providerHint ?? null,
    description: dep.description,
  };
}

// ── AfStationMapping ─────────────────────────────────

/** How an AF station is configured for this contract. */
export interface AfStationMapping {
  /** Station identifier (AF-1, AF-4, AF-9, ...). */
  readonly stationId: string;
  /** Role: generate, review, judge, multi_model, rag_context, prompt_library. */
  readonly role: string;
  /** Model hint for this station (e.g., MODEL_HINT_FROM_FREEDOM). */
  readonly modelHint?: string;
  /** Additional station config. */
  readonly config: Record<string, unknown>;
}

/** Serialize AfStationMapping to dict (DNA-1). */
export function afStationMappingToDict(mapping: AfStationMapping): Record<string, unknown> {
  return {
    station_id: mapping.stationId,
    role: mapping.role,
    model_hint: mapping.modelHint ?? null,
    config: { ...mapping.config },
  };
}

// ── QualityGate ──────────────────────────────────────

/** A quality check the judge (AF-9) enforces. */
export interface QualityGate {
  /** Gate identifier (QG-01, QG-02, ...). */
  readonly gateId: string;
  /** Human-readable description. */
  readonly description: string;
  /** Severity: 'error' (blocks), 'warning' (advisory). */
  readonly severity: 'error' | 'warning';
  /** Check type: dna_compliance, fabric_usage, spec_adherence, code_structure, test_quality. */
  readonly checkType: string;
}

/** Serialize QualityGate to dict (DNA-1). */
export function qualityGateToDict(gate: QualityGate): Record<string, unknown> {
  return {
    gate_id: gate.gateId,
    description: gate.description,
    severity: gate.severity,
    check_type: gate.checkType,
  };
}

// ── BfaRegistration ──────────────────────────────────

/** BFA conflict detection data for cross-flow validation. */
export interface BfaRegistration {
  /** Entity names this contract manages (e.g., ['inventory_item', 'stock_level']). */
  readonly entities: readonly string[];
  /** Event names this contract emits (e.g., ['inventory.updated', 'stock.low']). */
  readonly events: readonly string[];
  /** API routes this contract exposes (e.g., ['/api/inventory', '/api/stock']). */
  readonly apiRoutes: readonly string[];
}

/** Serialize BfaRegistration to dict (DNA-1). */
export function bfaRegistrationToDict(bfa: BfaRegistration): Record<string, unknown> {
  return {
    entities: [...bfa.entities],
    events: [...bfa.events],
    api_routes: [...bfa.apiRoutes],
  };
}

// ── FLOW-10 Extension Interfaces ──────────────────────────────────────────────

export interface ExecutionStep {
  /** Execution order index (1-based) */
  order: number;
  /** Short name for this step */
  name: string;
  /** Human-readable description of what this step does */
  description: string;
  /** Optional reference to an Iron Rule enforced by this step */
  ironRuleRef?: string;
  /** Action to take on step failure (R1: X1-2_F15) */
  onStepFailure?: string;
  /** Name of the step that failed (R1: X1-2_F15) */
  failedStep?: string;
}

export interface ModerationPathSpec {
  /** Moderation verdict this path handles: 'PASS' | 'REJECT' | 'UNCERTAIN' */
  outcome: string;
  /** CloudEvent type to emit when this path is taken */
  emit: string;
  /** Whether this path ends the flow (no further processing) */
  terminal: boolean;
  /** Route to human moderation queue (UNCERTAIN path) */
  humanQueue?: boolean;
  /** Trigger compensating transaction (REJECT path) */
  compensation?: boolean;
  /** Optional human-readable note for this path */
  note?: string;
}

export interface AggregationSpec {
  /** CloudEvent types that ADD a record to the aggregate */
  addEvents: string[];
  /** CloudEvent types that REMOVE a record from the aggregate */
  removeEvents: string[];
  /** Whether to recalculate the aggregate score when a record is removed */
  recalculateOnRemove: boolean;
  /** Filter expression: only records matching this condition contribute to aggregate */
  filterCondition?: string;
  /** Declared score output range, e.g. [1.0, 5.0] for star ratings */
  scoreRange?: [number, number];
}

export interface CrossFlowReadDependency {
  /** The flow this contract reads data from */
  flowId: string;
  /** Type of data being read */
  dataType: string;
  /** Access is strictly read-only; no side effects allowed on the peer flow */
  accessPattern: 'GET_ONLY';
  /** Event or condition that triggers the read */
  trigger?: string;
  /** Fabric interface used to perform the read */
  serviceInterface: string;
  /** How this contract behaves if the peer flow returns an error */
  failureBehavior: string;
  /** Whether the peer flow must be in ACTIVE status for the read to proceed */
  peerFlowMustBeActive: boolean;
}

export interface ConditionalRevisionSpec {
  /** Rejection reasons for which one revision is permitted */
  allowedFor: string[];
  /** Rejection reasons for which revision is NOT permitted */
  notAllowedFor: string[];
  /** Idempotency strategy for the revision attempt */
  strategy: 'CLEAR_SETNX' | 'NEW_KEY_VARIANT' | 'REVISION_FLAG';
  /** Maximum number of revisions allowed per original submission */
  maxRevisions: number;
  /** Field name in the event payload that marks this as a revision */
  revisionFlagInPayload: string;
}

// ── FLOW-15 EC-4 Spec Interfaces (R1) ─────────────────────────────────────────

export interface CryptographicExchangeSpec {
  protocol: 'OAUTH_PKCE' | 'OAUTH_TOKEN_EXCHANGE';
  ephemeralSecret: {
    name: string;
    generatedPer: 'exchange';
    neverReuse: true;
    storageScope: 'transient_session';
  };
  tokenVault: {
    factory: string;
    separateFrom?: string;
    encrypted: true;
  };
}

export interface SecurityComparisonSpec {
  field: string;
  method: 'timing_safe';
  requiredApi: 'crypto.timingSafeEqual';
  prohibitedPatterns: string[];
  violation: 'score-0';
}

export interface EventSourcedStateSpec {
  eventType: string;
  stateField: string;
  initialState: string;
  prohibits: 'mutable_state_store';
  derivationMethod: 'replay_events';
}

export interface StorageConstraintSpec {
  field: string;
  requiredStorage: 'postgresql' | 'redis' | 'in_memory';
  prohibitedStorage: string[];
  reason: string;
  violation: 'score-0';
}

export interface KeyVersioningSpec {
  strategy: 'CREATE_NEW_VERSION';
  prohibitedStrategies: string[];
  versionField: string;
  incrementalVersion: true;
  violation: 'score-0';
}

export interface DurableSagaSpec {
  sagaType: 'EP4';
  steps: Array<{
    name: string;
    order: number;
    checkpoint: true;
    onFailure: string;
  }>;
  checkpointStore: string;
  crashRecoveryTest: string;
}

export interface PreviewIsolationSpec {
  separateFromProduction: true;
  ephemeralUrl: true;
  ttlConfigKey: string;
}

export interface QuotaCoordinationSpec {
  quotaService: string;
  checkBeforeScale: true;
  overQuotaAction: 'reject' | 'queue';
}

// ── FLOW-14 ETL Spec Interfaces ───────────────────────────────────────────────

/**
 * EP4SagaCycleSpec — T190/T192 durable saga cycle order.
 * cycleOrder is fixed: rate_check → poll_page → land_raw → commit_cursor.
 */
export interface EP4SagaCycleSpec {
  cycleOrder: ['rate_check', 'poll_page', 'land_raw', 'commit_cursor'];
  cursorMonotonic: true;
  crashRecoverable: true;
}

/**
 * HmacVerificationSpec — T191 webhook timing-safe HMAC (CF-211).
 */
export interface HmacVerificationSpec {
  algorithm: 'sha256';
  timingSafe: true; // constant-time compare — CF-211
  onInvalid: 'return_200_no_event'; // prevent replay probing
}

/**
 * ScdVersioningPolicySpec — T195 SCD-2 version-only strategy (DR-62).
 */
export interface ScdVersioningPolicySpec {
  strategy: 'version_only'; // DR-62: never update, only version
  atomicCloseOpen: true; // both in single transaction
  appendOnlyFacts: true;
}

/**
 * PiiGateSpec — T196 PII classification before mart write (DR-63).
 */
export interface PiiGateSpec {
  factory: 'F462'; // PLATFORM-ONLY — IPiiClassificationService
  requiredBeforeMartWrite: true; // DR-63
  allowedOnlyIfZeroPiiFields: true;
}

/**
 * ZonePromotionOrderSpec — T200 raw→staging→core→mart only (CF-192).
 */
export interface ZonePromotionOrderSpec {
  order: ['raw', 'staging', 'core', 'mart']; // CF-192
  skipProhibited: true;
}

/**
 * ReverseEtlModeSpec — T199 queue-fabric-only transport (DR-64).
 */
export interface ReverseEtlModeSpec {
  transport: 'queue_fabric_only'; // DR-64
  directHttpProhibited: true;
}

/**
 * BackfillGapDetectionSpec — T192 cursor gap replay.
 */
export interface BackfillGapDetectionSpec {
  detectCursorGaps: true;
  replayGapRange: true;
}

/**
 * QuarantineOnFailureSpec — all ETL tasks, no silent drops.
 */
export interface QuarantineOnFailureSpec {
  triggerOnAnyNormalizationError: true; // never silent drop
  emitRecordQuarantined: true;
}

/**
 * AtomicDimVersioningSpec — T195 close+open in single transaction.
 */
export interface AtomicDimVersioningSpec {
  closeOldAndOpenNewAtomic: true; // both in single transaction
  orphanedDimProhibited: true;
}

// ── FLOW-13 Extension Types ───────────────────────────────────────────────────

export interface SecurityGateLayer {
  order: number;
  service: string;
  type: 'INLINE_SERVICE' | 'PLATFORM_ONLY_FACTORY';
  action: string;
  onFail: {
    emit: string;
    reason: string;
    returnImmediately: true;
  };
  canBeDisabled?: false;
  noOptOut?: boolean;
  note?: string;
}

export interface SecurityGateSpec {
  layers: SecurityGateLayer[];
  appliedBeforeAction: string;
}

export interface IrreversibleOperationSpec {
  action: string;
  requiresApprovalToken: true;
  tokenValidationService: string;
  onMissingToken: string;
  payloadConstraint?: {
    emit: string;
    allowedFields: string[];
    prohibitedFields: string[];
  };
}

export interface BackpressureSpec {
  service: string;
  method: string;
  depthConfigKey: string;
  onThresholdExceeded: {
    action: 'reject';
    emit: string;
    reason: string;
  };
}

export interface SchemaEvolutionPolicySpec {
  additive: {
    changes: string[];
    approval: 'auto_approved';
  };
  breaking: {
    changes: string[];
    approval: 'explicit_tenant_required';
    onRejected: string;
  };
}

// ── NodeRepresentation ────────────────────────────────

/**
 * Stack-neutral representation of a capability's structure, intent, constraints, quality.
 * Built during planning phase convergence BEFORE genesis prompts are written.
 * Genesis prompts DERIVE from this NODE, not the other way around.
 * Until convergence.handler exists: populate manually in planning sessions.
 */
export interface NodeRepresentation {
  structure: {
    inputShape: Record<string, unknown>; // what this capability receives
    outputShape: Record<string, unknown>; // what this capability produces
    dependencies: string[]; // taskTypeIds this depends on
    triggers: string[]; // events/conditions that start this
    emits: string[]; // events this produces
  };
  intent: {
    purpose: string; // ONE sentence, plain language, NO stack names
    invariants: string[]; // always true about behavior (not implementation)
    failureModes: string[]; // how it fails and what happens
    domainConcepts: string[]; // abstract concepts this capability implements
  };
  // Note: constraints = ironRules (already on EngineContract — do not duplicate)
  // Note: quality = qualityGates (already on EngineContract — do not duplicate)
  convergenceHistory?: {
    rounds: number;
    contextRequestsEmitted: string[];
    consensusReachedAt: string; // ISO timestamp
    verifiedBy: string[]; // model roles that reached consensus
  };
}

// ── EngineContract ────────────────────────────────────

/** Full engine contract (task type) — what the engine knows how to build. */
export interface EngineContractParams {
  /** Task type ID (T44, T45, ...). */
  readonly taskTypeId: string;
  /**
   * Machine identifier for the flow this contract belongs to (e.g. "FLOW-33").
   *
   * Business purpose: Allows the task type registry, Jira reporter, and any
   * dashboard to group contracts by flow without parsing filenames or comments.
   * Required by SK-430 Rule 3.
   */
  readonly flowId?: string;
  /**
   * Human-readable name for the flow this contract belongs to.
   * Must match the Authoritative Domain Name Table in DECISIONS-LOCKED.md (D-NAMING-1).
   *
   * Business purpose: Every log line, Jira comment, and error message that
   * references this contract can display the flow's business name rather than
   * an opaque identifier. Eliminates the "what is FLOW-33?" question.
   * Required by SK-430 Rule 3.
   */
  readonly flowName?: string;
  /** Human-readable name. */
  readonly name: string;
  /**
   * Contract archetype. Accepts ContractArchetype enum values or any future string
   * archetype. Unknown string values trigger a console.warn (never a throw) so
   * new archetypes can be introduced without breaking existing contract validation.
   */
  readonly archetype: ContractArchetype | string;
  /** What triggers this task type. */
  readonly entry: string;
  /** Purpose description. */
  readonly purpose: string;
  /** What this is distinct from (other task types). */
  readonly distinctFrom?: string;
  /** Factory dependencies — each must declare a fabric type. */
  readonly factoryDependencies: readonly FactoryDependency[];
  /** AF station mapping — how the AI pipeline handles this contract. */
  readonly afStations: readonly AfStationMapping[];
  /** Quality gates — what the judge checks. */
  readonly qualityGates: readonly QualityGate[];
  /** BFA registration — cross-flow conflict data. */
  readonly bfaRegistration: BfaRegistration;
  /** Iron rules — violations = build failure (legacy string form for backward compat). */
  readonly ironRules: readonly string[];
  /** MACHINE components — fixed, invariant logic. */
  readonly machineComponents: readonly string[];
  /** FREEDOM components — admin-configurable parameters. */
  readonly freedomComponents: readonly string[];
  /** Family ID this contract belongs to. */
  readonly familyId?: string;
  /** Version string. */
  readonly version?: string;
  /**
   * Stack coupling classification for this task type.
   *
   * Business purpose: Allows the planning pipeline (SK-431 StackCouplingAuditor)
   * and the code generator (FlowGenerator) to know which implementation sections
   * apply for the target stack, and to flag incompatibilities before an
   * implementation session begins.
   *
   * Optional for backward compatibility — pre-FLOW-00.2 contracts without this
   * field are treated as IMPL_VARIES on node-nestjs only (single-stack assumption).
   *
   * Phase D of FLOW-00.2 back-fills this field on all existing contracts.
   * Phase E back-fills user flow contracts (T47–T66).
   */
  readonly stackCoupling?: TaskTypeStackCoupling;

  // ── S1 optional extensions ──────────────────────────────────────────────────

  /**
   * Structured iron rule specifications (S1).
   * Preferred over ironRules (string[]) when present.
   * ironRules string array is retained for backward compatibility.
   */
  readonly ironRulesStructured?: readonly IronRuleSpec[];

  /** Handler pipeline specs for pipeline/composite execution models (S1). */
  readonly handlers?: readonly HandlerSpec[];

  /** Fixed engine constants that must never come from FREEDOM config (S1). */
  readonly machineConstants?: readonly MachineConstantSpec[];

  /** Arbiter IDs applied to this contract's outputs (S1). Legacy — use arbiterConfig for new contracts. */
  readonly arbiters?: readonly string[];

  /**
   * Structured arbiter panel configuration (SK-442).
   * When present, takes precedence over `arbiters` string array.
   * Required by FC-26 for ORCHESTRATION and AI_GENERATION archetypes.
   * BUG-8: T47/T48/T49 missing this field — add it before Phase B re-run.
   */
  readonly arbiterConfig?: ArbiterPanelConfig;

  /** Gate event emitted when this contract completes or transitions (S1). */
  readonly gateEvent?: GateEventSpec;

  /** Cross-flow factory dependencies for multi-flow orchestration (S1). */
  readonly crossFlowFactoryDependencies?: readonly CrossFlowFactorySpec[];

  /**
   * Execution model for this task type (S1).
   * Controls how the engine runner schedules and invokes this contract.
   */
  readonly executionModel?:
    | 'pipeline'
    | 'inline'
    | 'inline-pure'
    | 'request_response'
    | 'scheduled'
    | 'hybrid-sync-async';

  /**
   * Entry point type (S1).
   * Describes how external callers trigger this task type.
   */
  readonly entryType?: 'HTTP' | 'EVENT' | 'DUAL' | 'INLINE_ONLY' | 'MULTI' | 'SCHEDULED';

  /** When true, this task type is a pure function (no side effects, fully deterministic) (S1). */
  readonly pureFunction?: boolean;

  /**
   * Failure behavior for this task type (S1).
   * FAIL_OPEN: failures are tolerated and execution continues.
   * FAIL_CLOSED: any failure halts the pipeline.
   */
  readonly failureBehavior?: 'FAIL_OPEN' | 'FAIL_CLOSED';

  /**
   * MACHINE/FREEDOM split structured form (S1).
   * machine: fixed logic items (string labels or structured specs).
   * freedom: admin-configurable parameter names.
   */
  readonly machineFreedom?: {
    machine: (string | Record<string, unknown>)[];
    freedom: string[];
  };

  /**
   * NODE: verified stack-neutral representation of this capability.
   * Built through convergence before genesis prompts are authored.
   * Manually populated until convergence.handler is active (Group E).
   * Bridge rule: node.intent.domainConcepts[] → stackCoupling[stack].neutralConcepts[]
   */
  readonly node?: NodeRepresentation;

  // ── FLOW-10 extension fields ──────────────────────────────────────────────
  /** Ordered execution steps for multi-phase gateway contracts */
  readonly executionOrder?: { steps: ExecutionStep[] };
  /** Three-way moderation outcome routing (PASS / REJECT / UNCERTAIN) */
  readonly moderationPaths?: ModerationPathSpec[];
  /** How UNCERTAIN moderation verdicts are resolved */
  readonly uncertaintyBehavior?: 'HUMAN_QUEUE' | 'AUTO_REJECT' | 'AUTO_APPROVE';
  /** Additive and retractive aggregation specification for score aggregators */
  readonly aggregation?: AggregationSpec;
  /** Cross-flow read dependencies — GET_ONLY, no side effects */
  readonly crossFlowReadDependencies?: CrossFlowReadDependency[];
  /** Conditional revision policy (content-policy path only) */
  readonly conditionalRevision?: ConditionalRevisionSpec;

  // ── FLOW-13 extension fields ──────────────────────────────────────────────
  /** Multi-layer ordered security gate specification (FLOW-13) */
  readonly multiLayerSecurityGate?: SecurityGateSpec;
  /** Irreversible action guard — approval token required (FLOW-13 T186) */
  readonly irreversibleOperation?: IrreversibleOperationSpec;
  /** Queue depth backpressure gate (FLOW-13 T169) */
  readonly backpressure?: BackpressureSpec;
  /** Additive vs. breaking schema change handling (FLOW-13 T171) */
  readonly schemaEvolutionPolicy?: SchemaEvolutionPolicySpec;
  /**
   * IDs of task types invoked inline (not via factory injection).
   * Example: T173 sets inlineInvokes: ["T187"] — T187 QuotaManager is instantiated
   * directly in T173's constructor. F426 does NOT exist. Never generate factory
   * injection for T187.
   */
  readonly inlineInvokes?: string[];
  /** CloudEvent types emitted by this task type */
  readonly emits?: string[];

  // ── FLOW-14 ETL extension fields ──────────────────────────────────────────
  /** EP-4 durable saga cycle spec (T190/T192) */
  readonly ep4SagaCycle?: EP4SagaCycleSpec;
  /** HMAC timing-safe verification spec (T191, CF-211) */
  readonly hmacVerification?: HmacVerificationSpec;
  /** SCD-2 version-only policy (T195, DR-62) */
  readonly scdVersioningPolicy?: ScdVersioningPolicySpec;
  /** PII gate before mart write (T196, DR-63) */
  readonly piiGate?: PiiGateSpec;
  /** Zone promotion order enforcement (T200, CF-192) */
  readonly zonePromotionOrder?: ZonePromotionOrderSpec;
  /** Reverse ETL queue-fabric-only transport (T199, DR-64) */
  readonly reverseEtlMode?: ReverseEtlModeSpec;
  /** Backfill gap detection and replay (T192) */
  readonly backfillGapDetection?: BackfillGapDetectionSpec;
  /** Quarantine on any normalization error — never silent drop */
  readonly quarantineOnFailure?: QuarantineOnFailureSpec;
  /** Atomic dimension versioning — close+open in single transaction (T195) */
  readonly atomicDimVersioning?: AtomicDimVersioningSpec;
  /**
   * Cross-tenant join guard — all join inputs must carry matching tenantId (T197, CF-204).
   * Covers X1-1_F14 co-commit.
   */
  readonly crossTenantJoinGuard?: { enforceOnAllInputs: true };
  /**
   * ETL execution step ordering (covers X1-1_F14).
   * String array form for lightweight FLOW-14 contracts.
   */
  readonly etlExecutionOrder?: string[];

  // ── FLOW-15 EC-4 extension fields (R1) ───────────────────────────────────
  /** OAuth PKCE / token exchange cryptographic spec (T_START+23) */
  readonly cryptographicExchange?: CryptographicExchangeSpec;
  /** Timing-safe HMAC comparison specs (T_START+24) */
  readonly securityComparisons?: SecurityComparisonSpec[];
  /** Event-sourced state spec — circuit breaker / state derivation (T_START+33) */
  readonly eventSourcedState?: EventSourcedStateSpec;
  /** Storage medium constraints — e.g. syncCursor must be in postgresql (T_START+5) */
  readonly storageConstraints?: StorageConstraintSpec[];
  /** BYOK key versioning — create-new-version only strategy (T_END) */
  readonly keyVersioning?: KeyVersioningSpec;
  /** EP-4 durable saga spec (T_START+16, T_START+34, T_START+38) */
  readonly durableSaga?: DurableSagaSpec;
  /** Preview environment isolation spec (T_START+4, T_START+17) */
  readonly previewIsolation?: PreviewIsolationSpec;
  /** Quota coordination before scale operations (T_START+27, T_START+31) */
  readonly quotaCoordination?: QuotaCoordinationSpec;

  // ── FLOW-20 REQUEST_RESPONSE extension fields (GAP-NEW-79) ────────────────
  /**
   * Service Level Objective in milliseconds (required for REQUEST_RESPONSE archetype).
   * Controls synchronous response time budget.
   */
  readonly sloMs?: number;
  /**
   * Cache policy for synchronous request/response handlers (GAP-NEW-79).
   * Ignored for async archetypes.
   */
  readonly cachePolicy?: 'no-cache' | 'read-through' | 'write-through';

  /**
   * Multi-arbiter consensus mode (N2 / FLOW-34).
   * When present, GenericNodeExecutor collects results from all arbiters and
   * requires at least `required` to pass before proceeding.
   * Returns DataProcessResult.failure('ARBITER_REJECTED') when threshold not met.
   *
   * FLOW-34 example: { required: 4, total: 5 } — 4 of 5 arbiters must pass.
   * Reusable by FLOW-20, FLOW-24 by declaring this field in their EngineContracts.
   */
  readonly arbiterConsensus?: {
    required: number; // minimum number of arbiters that must pass
    total: number; // total number of arbiters in the pool
  };
}

export class EngineContract {
  readonly taskTypeId: string;
  readonly flowId: string;
  readonly flowName: string;
  readonly name: string;
  /** Accepts ContractArchetype enum values or any future string archetype. */
  readonly archetype: ContractArchetype | string;
  readonly entry: string;
  readonly purpose: string;
  readonly distinctFrom: string;
  readonly factoryDependencies: readonly FactoryDependency[];
  readonly afStations: readonly AfStationMapping[];
  readonly qualityGates: readonly QualityGate[];
  readonly bfaRegistration: BfaRegistration;
  readonly ironRules: readonly string[];
  readonly machineComponents: readonly string[];
  readonly freedomComponents: readonly string[];
  readonly familyId: string;
  readonly version: string;
  readonly stackCoupling: TaskTypeStackCoupling | undefined;

  // ── S1 optional extensions ────────────────────────────────────────────────
  readonly ironRulesStructured: readonly IronRuleSpec[] | undefined;
  readonly handlers: readonly HandlerSpec[] | undefined;
  readonly machineConstants: readonly MachineConstantSpec[] | undefined;
  readonly arbiters: readonly string[] | undefined;
  readonly arbiterConfig: ArbiterPanelConfig | undefined;
  readonly gateEvent: GateEventSpec | undefined;
  readonly crossFlowFactoryDependencies: readonly CrossFlowFactorySpec[] | undefined;
  readonly executionModel:
    | 'pipeline'
    | 'inline'
    | 'inline-pure'
    | 'request_response'
    | 'scheduled'
    | 'hybrid-sync-async'
    | undefined;
  readonly entryType: 'HTTP' | 'EVENT' | 'DUAL' | 'INLINE_ONLY' | 'MULTI' | 'SCHEDULED' | undefined;
  readonly pureFunction: boolean | undefined;
  readonly failureBehavior: 'FAIL_OPEN' | 'FAIL_CLOSED' | undefined;
  readonly machineFreedom:
    | { machine: (string | Record<string, unknown>)[]; freedom: string[] }
    | undefined;
  readonly node: NodeRepresentation | undefined;

  // ── FLOW-10 extension fields ──────────────────────────────────────────────
  readonly executionOrder: { steps: ExecutionStep[] } | undefined;
  readonly moderationPaths: ModerationPathSpec[] | undefined;
  readonly uncertaintyBehavior: 'HUMAN_QUEUE' | 'AUTO_REJECT' | 'AUTO_APPROVE' | undefined;
  readonly aggregation: AggregationSpec | undefined;
  readonly crossFlowReadDependencies: CrossFlowReadDependency[] | undefined;
  readonly conditionalRevision: ConditionalRevisionSpec | undefined;

  // ── FLOW-13 extension fields ──────────────────────────────────────────────
  readonly multiLayerSecurityGate: SecurityGateSpec | undefined;
  readonly irreversibleOperation: IrreversibleOperationSpec | undefined;
  readonly backpressure: BackpressureSpec | undefined;
  readonly schemaEvolutionPolicy: SchemaEvolutionPolicySpec | undefined;
  readonly inlineInvokes: string[] | undefined;
  readonly emits: string[] | undefined;

  // ── FLOW-14 ETL extension fields ──────────────────────────────────────────
  readonly ep4SagaCycle: EP4SagaCycleSpec | undefined;
  readonly hmacVerification: HmacVerificationSpec | undefined;
  readonly scdVersioningPolicy: ScdVersioningPolicySpec | undefined;
  readonly piiGate: PiiGateSpec | undefined;
  readonly zonePromotionOrder: ZonePromotionOrderSpec | undefined;
  readonly reverseEtlMode: ReverseEtlModeSpec | undefined;
  readonly backfillGapDetection: BackfillGapDetectionSpec | undefined;
  readonly quarantineOnFailure: QuarantineOnFailureSpec | undefined;
  readonly atomicDimVersioning: AtomicDimVersioningSpec | undefined;
  readonly crossTenantJoinGuard: { enforceOnAllInputs: true } | undefined;
  readonly etlExecutionOrder: string[] | undefined;

  // ── FLOW-15 EC-4 extension fields (R1) ─────────────────────────────────────
  readonly cryptographicExchange: CryptographicExchangeSpec | undefined;
  readonly securityComparisons: SecurityComparisonSpec[] | undefined;
  readonly eventSourcedState: EventSourcedStateSpec | undefined;
  readonly storageConstraints: StorageConstraintSpec[] | undefined;
  readonly keyVersioning: KeyVersioningSpec | undefined;
  readonly durableSaga: DurableSagaSpec | undefined;
  readonly previewIsolation: PreviewIsolationSpec | undefined;
  readonly quotaCoordination: QuotaCoordinationSpec | undefined;

  // ── FLOW-20 REQUEST_RESPONSE extension fields (GAP-NEW-79) ────────────────
  /** SLO in milliseconds for REQUEST_RESPONSE archetype. */
  readonly sloMs: number | undefined;
  /** Cache policy for REQUEST_RESPONSE archetype. */
  readonly cachePolicy: 'no-cache' | 'read-through' | 'write-through' | undefined;

  // ── FLOW-34 multi-arbiter consensus (N2) ──────────────────────────────────
  /** Multi-arbiter voting gate — requires `required` of `total` arbiters to pass. */
  readonly arbiterConsensus: { required: number; total: number } | undefined;

  constructor(params: EngineContractParams) {
    this.taskTypeId = params.taskTypeId;
    this.flowId = params.flowId ?? '';
    this.flowName = params.flowName ?? '';
    this.name = params.name;
    this.archetype = params.archetype;
    this.entry = params.entry;
    this.purpose = params.purpose;
    this.distinctFrom = params.distinctFrom ?? '';
    this.factoryDependencies = [...params.factoryDependencies];
    this.afStations = [...params.afStations];
    this.qualityGates = [...params.qualityGates];
    this.bfaRegistration = params.bfaRegistration;
    this.ironRules = [...params.ironRules];
    this.machineComponents = [...params.machineComponents];
    this.freedomComponents = [...params.freedomComponents];
    this.familyId = params.familyId ?? '';
    this.version = params.version ?? '1.0.0';
    this.stackCoupling = params.stackCoupling;
    // S1 extensions
    this.ironRulesStructured = params.ironRulesStructured
      ? [...params.ironRulesStructured]
      : undefined;
    this.handlers = params.handlers ? [...params.handlers] : undefined;
    this.machineConstants = params.machineConstants ? [...params.machineConstants] : undefined;
    this.arbiters = params.arbiters ? [...params.arbiters] : undefined;
    // FC-26: auto-assign default arbiterConfig for ORCHESTRATION/AI_GENERATION when not provided.
    // Prevents FC-26 validation failures for contracts defined before G7.
    this.arbiterConfig =
      params.arbiterConfig ??
      (params.archetype === ContractArchetype.ORCHESTRATION ||
      params.archetype === ContractArchetype.AI_GENERATION
        ? ({
            minPanel: {
              required: ['dna', 'fabric', 'business_logic', 'key_principles', 'iron_rules'],
              quorum: 5,
            },
            blockSemantics: { blockOnFail: ['iron_rules', 'key_principles'] },
            escalationGate: { minAggregateScore: 0.7, onFail: 'RETRY' },
          } as ArbiterPanelConfig)
        : undefined);
    this.gateEvent = params.gateEvent;
    this.crossFlowFactoryDependencies = params.crossFlowFactoryDependencies
      ? [...params.crossFlowFactoryDependencies]
      : undefined;
    this.executionModel = params.executionModel;
    this.entryType = params.entryType;
    this.pureFunction = params.pureFunction;
    this.failureBehavior = params.failureBehavior;
    this.machineFreedom = params.machineFreedom;
    this.node = params.node;
    // FLOW-10 extension fields
    this.executionOrder = params.executionOrder;
    this.moderationPaths = params.moderationPaths ? [...params.moderationPaths] : undefined;
    this.uncertaintyBehavior = params.uncertaintyBehavior;
    this.aggregation = params.aggregation;
    this.crossFlowReadDependencies = params.crossFlowReadDependencies
      ? [...params.crossFlowReadDependencies]
      : undefined;
    this.conditionalRevision = params.conditionalRevision;
    // FLOW-13 extension fields
    this.multiLayerSecurityGate = params.multiLayerSecurityGate;
    this.irreversibleOperation = params.irreversibleOperation;
    this.backpressure = params.backpressure;
    this.schemaEvolutionPolicy = params.schemaEvolutionPolicy;
    this.inlineInvokes = params.inlineInvokes ? [...params.inlineInvokes] : undefined;
    this.emits = params.emits ? [...params.emits] : undefined;
    // FLOW-14 ETL extension fields
    this.ep4SagaCycle = params.ep4SagaCycle;
    this.hmacVerification = params.hmacVerification;
    this.scdVersioningPolicy = params.scdVersioningPolicy;
    this.piiGate = params.piiGate;
    this.zonePromotionOrder = params.zonePromotionOrder;
    this.reverseEtlMode = params.reverseEtlMode;
    this.backfillGapDetection = params.backfillGapDetection;
    this.quarantineOnFailure = params.quarantineOnFailure;
    this.atomicDimVersioning = params.atomicDimVersioning;
    this.crossTenantJoinGuard = params.crossTenantJoinGuard;
    this.etlExecutionOrder = params.etlExecutionOrder ? [...params.etlExecutionOrder] : undefined;
    // FLOW-15 EC-4 extension fields (R1)
    this.cryptographicExchange = params.cryptographicExchange;
    this.securityComparisons = params.securityComparisons
      ? [...params.securityComparisons]
      : undefined;
    this.eventSourcedState = params.eventSourcedState;
    this.storageConstraints = params.storageConstraints
      ? [...params.storageConstraints]
      : undefined;
    this.keyVersioning = params.keyVersioning;
    this.durableSaga = params.durableSaga;
    this.previewIsolation = params.previewIsolation;
    this.quotaCoordination = params.quotaCoordination;
    // FLOW-20 REQUEST_RESPONSE extension fields (GAP-NEW-79)
    this.sloMs = params.sloMs;
    this.cachePolicy = params.cachePolicy;
    // FLOW-34 multi-arbiter consensus (N2)
    this.arbiterConsensus = params.arbiterConsensus;
  }

  /**
   * Validate this contract. Returns failure with all validation errors.
   * DNA-3: returns DataProcessResult.
   *
   * S1: Unknown archetype values trigger console.warn (not a hard error) to allow
   * future archetypes to be introduced without breaking existing contract validation.
   */
  validate(): DataProcessResult<boolean> {
    const errors: string[] = [];

    if (!this.taskTypeId) {
      errors.push('taskTypeId is required');
    }
    if (!this.name) {
      errors.push('name is required');
    }
    if (!isValidArchetype(this.archetype as string)) {
      // Warn only — do not block on unknown archetypes (forward compatibility)
      console.warn(
        `[EngineContract] Unknown archetype: '${this.archetype}' on ${this.taskTypeId} — treating as valid`,
      );
    }
    if (this.factoryDependencies.length === 0) {
      errors.push('At least one factory dependency is required');
    }

    // Validate each factory dependency has a valid fabric type
    for (const dep of this.factoryDependencies) {
      if (!dep.factoryId) {
        errors.push('Factory dependency missing factoryId');
      }
      if (!dep.fabricType) {
        errors.push(`Factory ${dep.factoryId || '?'} missing fabric_type`);
      } else if (!isValidFabricType(dep.fabricType)) {
        errors.push(`Factory ${dep.factoryId} has invalid fabric_type: '${dep.fabricType}'`);
      }
    }

    if (this.qualityGates.length === 0) {
      errors.push('At least one quality gate is required');
    }

    // Validate quality gate severity
    for (const gate of this.qualityGates) {
      if (gate.severity !== 'error' && gate.severity !== 'warning') {
        errors.push(`Quality gate ${gate.gateId} has invalid severity: '${gate.severity}'`);
      }
    }

    // FC-26: ORCHESTRATION and AI_GENERATION contracts must have arbiterConfig
    if (
      (this.archetype === ContractArchetype.ORCHESTRATION ||
        this.archetype === ContractArchetype.AI_GENERATION) &&
      !this.arbiterConfig
    ) {
      errors.push(
        `FC-26: contract with archetype ${this.archetype} must have arbiterConfig. ` +
          'Minimum panel: dna, fabric, business_logic, key_principles, iron_rules.',
      );
    }

    if (errors.length > 0) {
      return DataProcessResult.failure('CONTRACT_VALIDATION_FAILED', errors.join('; '));
    }

    return DataProcessResult.success(true);
  }

  /**
   * Serialize to dict (DNA-1: snake_case keys, Record<string, unknown>).
   * S1 optional fields are included only when present.
   */
  toDict(): Record<string, unknown> {
    const base: Record<string, unknown> = {
      task_type_id: this.taskTypeId,
      flow_id: this.flowId,
      flow_name: this.flowName,
      name: this.name,
      archetype: this.archetype,
      entry: this.entry,
      purpose: this.purpose,
      distinct_from: this.distinctFrom,
      factory_dependencies: this.factoryDependencies.map(factoryDependencyToDict),
      af_stations: this.afStations.map(afStationMappingToDict),
      quality_gates: this.qualityGates.map(qualityGateToDict),
      bfa_registration: bfaRegistrationToDict(this.bfaRegistration),
      iron_rules: [...this.ironRules],
      machine_components: [...this.machineComponents],
      freedom_components: [...this.freedomComponents],
      family_id: this.familyId,
      version: this.version,
      stack_coupling: this.stackCoupling ?? null,
    };
    // S1 optional extensions — only include when set
    if (this.ironRulesStructured !== undefined)
      base['iron_rules_structured'] = [...this.ironRulesStructured];
    if (this.handlers !== undefined) base['handlers'] = [...this.handlers];
    if (this.machineConstants !== undefined) base['machine_constants'] = [...this.machineConstants];
    if (this.arbiters !== undefined) base['arbiters'] = [...this.arbiters];
    if (this.arbiterConfig !== undefined)
      base['arbiter_config'] = this.arbiterConfig as unknown as Record<string, unknown>;
    if (this.gateEvent !== undefined) base['gate_event'] = this.gateEvent;
    if (this.crossFlowFactoryDependencies !== undefined)
      base['cross_flow_factory_dependencies'] = [...this.crossFlowFactoryDependencies];
    if (this.executionModel !== undefined) base['execution_model'] = this.executionModel;
    if (this.entryType !== undefined) base['entry_type'] = this.entryType;
    if (this.pureFunction !== undefined) base['pure_function'] = this.pureFunction;
    if (this.failureBehavior !== undefined) base['failure_behavior'] = this.failureBehavior;
    if (this.machineFreedom !== undefined) base['machine_freedom'] = this.machineFreedom;
    return base;
  }
}
