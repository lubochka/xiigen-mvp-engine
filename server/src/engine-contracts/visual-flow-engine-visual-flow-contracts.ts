/**
 * FLOW-18: Visual Flow Creation & Code Injection Engine
 * Task types: T247–T268 (22 task types)
 * Families: 84–93 (10 families)
 * BFA rules: CF-295–CF-328 (34 rules)
 * Archetypes: VISUAL_CREATION, CODE_INJECTION, SANDBOX_TEST, COLLABORATION
 *
 * Implementation mode: af-pipeline (AF-1 generates .service.ts files)
 * Claude Code provides: EngineContracts, archetypes, interfaces, named checks
 */

// ── Flow Canvas — VISUAL_CREATION (Family 84–85) ──────────────────────────────

/** T247 — FlowCanvasInitializeGate */
export const T247_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T247',
  name: 'FlowCanvasInitializeGate',
  family: 84,
  flowId: 'FLOW-18',
  archetype: 'visual_creation',
  version: 'v1',
  description: 'Initialize a new visual flow canvas. Emits canvas.created.',
  dna9Required: true,
  ironRules: [
    'IR-247-1: Canvas ID must be globally unique (tenantId+canvasId compound key)',
    'IR-247-2: Canvas persisted in xiigen-canvases before emitting canvas.created (DNA-8)',
    'IR-247-3: Initial state is empty (no nodes, no edges)',
  ],
  events: {
    emits: ['canvas.created'],
    compensation: ['canvas.creation.failed'],
  },
};

/** T248 — NodeAddClassifyGate */
export const T248_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T248',
  name: 'NodeAddClassifyGate',
  family: 84,
  flowId: 'FLOW-18',
  archetype: 'visual_creation',
  version: 'v1',
  description:
    'Add and classify a node on the canvas. Optimistic — placeholder shown immediately. Emits node.added.',
  dna9Required: true,
  ironRules: [
    'IR-248-1: Optimistic NodeAddRequested — UI shows placeholder immediately',
    'IR-248-2: Must handle node.add.failed rollback (remove placeholder)',
    'IR-248-3: Node type must be classified before persistence',
  ],
  ironRulesStructured: [{ check: 'optimistic_rollback_on_fail', severity: 'score-0' }],
  events: {
    emits: ['node.added'],
    compensation: ['node.add.failed'],
  },
};

/** T249 — EdgeConnectValidateGate */
export const T249_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T249',
  name: 'EdgeConnectValidateGate',
  family: 84,
  flowId: 'FLOW-18',
  archetype: 'visual_creation',
  version: 'v1',
  description:
    'Validate and connect an edge on the canvas. Uses F642 DAG validator for acyclicity. Emits edge.connected.',
  dna9Required: true,
  ironRules: [
    'IR-249-1: CF-299 — DAG acyclicity check via F642 BEFORE persisting edge',
    'IR-249-2: F642 (IDAGValidatorService) injected — no inline DFS implementation',
    'IR-249-3: Cycle detected → return DataProcessResult.failure (never throw)',
  ],
  factoryDependencies: ['F642'],
  events: {
    emits: ['edge.connected'],
  },
};

/** T250 — AutoLayoutPreviewGate */
export const T250_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T250',
  name: 'AutoLayoutPreviewGate',
  family: 85,
  flowId: 'FLOW-18',
  archetype: 'visual_creation',
  version: 'v1',
  description: 'Compute and emit auto-layout preview for canvas. Emits layout.computed.',
  dna9Required: true,
  ironRules: [
    'IR-250-1: Layout algorithm selection from FREEDOM config (never hardcoded)',
    'IR-250-2: Preview only — no canvas mutation during preview',
  ],
  events: {
    emits: ['layout.computed'],
  },
};

// ── Code Generation Pipeline — CODE_INJECTION (Family 86) ────────────────────

/** T251 — CodeGenerationGate */
export const T251_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T251',
  name: 'CodeGenerationGate',
  family: 86,
  flowId: 'FLOW-18',
  archetype: 'code_injection',
  version: 'v1',
  description:
    'AI code generation with 3-model parallel consensus (2/3 majority). DNA 9/9 mandatory. Emits code.generated.',
  dna9Required: true,
  multiModelConsensus: true,
  consensusModels: ['claude-3-opus', 'gpt-4-turbo', 'gemini-1.5-pro'],
  consensusSimilarityThreshold: 0.85,
  ironRules: [
    'IR-251-1: 3-model parallel generation mandatory — single-model = score-0',
    'IR-251-2: CF-302 — generated code must pass ALL 9 DNA patterns',
    'IR-251-3: CF-303 — security scan before emit',
    'IR-251-4: Winner = highest DNA score in majority (2/3 or 3/3) group',
  ],
  ironRulesStructured: [{ check: 'dna_9_of_9_mandatory', severity: 'score-0' }],
  stackCoupling: [
    {
      stack: 'php-wordpress',
      incompatible: true,
      reason: 'no multi-model AI code generation with DNA validation pipeline',
    },
  ],
  events: {
    emits: ['code.generated'],
    compensation: ['code.generation.failed'],
  },
};

/** T252 — FactoryRegistrationGate */
export const T252_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T252',
  name: 'FactoryRegistrationGate',
  family: 86,
  flowId: 'FLOW-18',
  archetype: 'code_injection',
  version: 'v1',
  description: 'Register generated factory in the factory registry. Emits factory.registered.',
  dna9Required: true,
  ironRules: [
    'IR-252-1: CF-304 — factory ID globally unique before registration',
    'IR-252-2: Factory stored in xiigen-factories BEFORE emitting factory.registered (DNA-8)',
    'IR-252-3: CF-305 — fabric type mapping validated during registration',
  ],
  events: {
    emits: ['factory.registered'],
  },
};

/** T253 — CodeInjectionGate */
export const T253_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T253',
  name: 'CodeInjectionGate',
  family: 86,
  flowId: 'FLOW-18',
  archetype: 'code_injection',
  version: 'v1',
  description:
    'Hot-inject compiled module into running NestJS app behind feature flag (F646 + F682). Atomic persist + flag create. Emits code.injected.',
  dna9Required: true,
  ironRules: [
    'IR-253-1: CF-307 — injection only behind feature flag (F682)',
    'IR-253-2: CF-306 — injection must be reversible (rollback path required)',
    'IR-253-3: Atomic: persist + flag create in same transaction (DNA-8)',
    'IR-253-4: F646 (ICodeInjectorService) injected — no inline LazyModuleLoader',
  ],
  ironRulesStructured: [
    { check: 'feature_flag_required', severity: 'score-0' },
    { check: 'rollback_capability_present', severity: 'score-0' },
  ],
  factoryDependencies: ['F646', 'F682'],
  stackCoupling: [
    {
      stack: 'php-wordpress',
      incompatible: true,
      reason: 'no hot-injection with feature flag + instant rollback capability',
    },
  ],
  events: {
    emits: ['code.injected'],
  },
};

/** T254 — BFAAutoRegistrationGate */
export const T254_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T254',
  name: 'BFAAutoRegistrationGate',
  family: 86,
  flowId: 'FLOW-18',
  archetype: 'code_injection',
  version: 'v1',
  description:
    'Auto-generate BFA conflict rules from factory metadata and register (F650). Emits bfa.registered.',
  dna9Required: true,
  ironRules: [
    'IR-254-1: F650 (IBFAAutoRegistryService) injected — no inline rule generation',
    'IR-254-2: validateNoConflict() before registerRules() — never skip',
    'IR-254-3: Generates minimum 2 rules (FABRIC_CONFLICT + TENANT_SCOPE)',
  ],
  factoryDependencies: ['F650'],
  events: {
    emits: ['bfa.registered'],
  },
};

// ── Sandbox Execution — SANDBOX_TEST (Family 87) ─────────────────────────────

/** T255 — SandboxCreateSeedGate */
export const T255_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T255',
  name: 'SandboxCreateSeedGate',
  family: 87,
  flowId: 'FLOW-18',
  archetype: 'sandbox_test',
  version: 'v1',
  description:
    'Create and seed isolated sandbox environment. CF-310 CRITICAL: zero production data. Emits sandbox.created.',
  dna9Required: true,
  ironRules: [
    'IR-255-1: CF-310 CRITICAL — zero production data accessible in sandbox',
    'IR-255-2: CF-314 — sandbox cannot call external APIs (network blocked)',
    'IR-255-3: CF-312 — execution timeout enforced',
    'IR-255-4: Sandbox index prefix: sandbox-{tenantId}-{sessionId}',
  ],
  ironRulesStructured: [
    { check: 'sandbox_isolation_check', severity: 'BUILD_FAILURE' },
    { check: 'sandbox_no_external_apis', severity: 'score-0' },
    { check: 'sandbox_timeout_enforced', severity: 'score-0' },
  ],
  events: {
    emits: ['sandbox.created'],
    compensation: ['sandbox.execution.failed'],
  },
};

/** T256 — SandboxStepThroughExecutionGate */
export const T256_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T256',
  name: 'SandboxStepThroughExecutionGate',
  family: 87,
  flowId: 'FLOW-18',
  archetype: 'sandbox_test',
  version: 'v1',
  description:
    'Execute sandbox steps one at a time. Network isolated. Emits sandbox.step.completed.',
  dna9Required: true,
  ironRules: [
    'IR-256-1: CF-313 — sandbox quota enforced per step',
    'IR-256-2: CF-314 — no external API calls from sandbox code',
    'IR-256-3: CF-311 — no persistence outside sandbox- indices',
  ],
  ironRulesStructured: [
    { check: 'sandbox_isolation_check', severity: 'BUILD_FAILURE' },
    { check: 'sandbox_no_external_apis', severity: 'score-0' },
    { check: 'sandbox_timeout_enforced', severity: 'score-0' },
  ],
  events: {
    emits: ['sandbox.step.completed'],
    compensation: ['sandbox.execution.failed'],
  },
};

/** T257 — IronRuleQualityGateValidationGate */
export const T257_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T257',
  name: 'IronRuleQualityGateValidationGate',
  family: 87,
  flowId: 'FLOW-18',
  archetype: 'sandbox_test',
  version: 'v1',
  description: 'Run iron-rule sweep and quality gate checks in sandbox. Emits quality.validated.',
  dna9Required: true,
  ironRules: [
    'IR-257-1: All iron rules loaded from FREEDOM config (never hardcoded)',
    'IR-257-2: F656 (IR runner) injected — no inline rule evaluation',
    'IR-257-3: F657 (QG runner) injected — no inline quality scoring',
  ],
  factoryDependencies: ['F656', 'F657'],
  events: {
    emits: ['quality.validated'],
  },
};

/** T258 — TestReportPromotionDecisionGate */
export const T258_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T258',
  name: 'TestReportPromotionDecisionGate',
  family: 87,
  flowId: 'FLOW-18',
  archetype: 'sandbox_test',
  version: 'v1',
  description:
    'Assemble test report and decide whether to promote from sandbox. CF-315. Emits promotion.decided.',
  dna9Required: true,
  ironRules: [
    'IR-258-1: CF-315 CRITICAL — quality gate must pass before promotion decision',
    'IR-258-2: Promotion decision from FREEDOM config thresholds (never hardcoded)',
    'IR-258-3: Audit trail stored before emitting promotion.decided (DNA-8)',
  ],
  events: {
    emits: ['promotion.decided'],
  },
};

// ── Fabric-First UI — VISUAL_CREATION (Family 88) ────────────────────────────

/** T259 — UIComponentRenderGate */
export const T259_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T259',
  name: 'UIComponentRenderGate',
  family: 88,
  flowId: 'FLOW-18',
  archetype: 'visual_creation',
  version: 'v1',
  description: 'Render visual flow UI components via fabric-first approach. Emits ui.rendered.',
  dna9Required: true,
  ironRules: [
    'IR-259-1: Zero hardcoded UI values — all from FREEDOM config',
    'IR-259-2: Component tokens resolved via fabric, never inline',
  ],
  events: {
    emits: ['ui.rendered'],
  },
};

/** T260 — DebugPanelExecutionGate */
export const T260_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T260',
  name: 'DebugPanelExecutionGate',
  family: 88,
  flowId: 'FLOW-18',
  archetype: 'visual_creation',
  version: 'v1',
  description: 'Execute debug panel commands in isolated context. Emits debug.executed.',
  dna9Required: true,
  ironRules: [
    'IR-260-1: Debug commands isolated — no production data access',
    'IR-260-2: Timeout enforced for debug execution',
  ],
  events: {
    emits: ['debug.executed'],
  },
};

/** T261 — AIAssistantFlowBuildingGate */
export const T261_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T261',
  name: 'AIAssistantFlowBuildingGate',
  family: 88,
  flowId: 'FLOW-18',
  archetype: 'visual_creation',
  version: 'v1',
  description:
    'AI assistant suggests flow building steps. Human-gated apply. Emits ai.suggestion.generated.',
  dna9Required: true,
  ironRules: [
    'IR-261-1: Suggestions from AI only — human-gated before any apply',
    'IR-261-2: Model selection from FREEDOM config',
  ],
  events: {
    emits: ['ai.suggestion.generated'],
  },
};

// ── Collaborative Editing — COLLABORATION (Family 89) ────────────────────────

/** T262 — CollaborationSessionGate */
export const T262_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T262',
  name: 'CollaborationSessionGate',
  family: 89,
  flowId: 'FLOW-18',
  archetype: 'collaboration',
  version: 'v1',
  description: 'Create and manage a collaborative editing session. CF-320. Emits session.created.',
  dna9Required: true,
  ironRules: [
    'IR-262-1: CF-320 — permission validated before joining session',
    'IR-262-2: CF-323 — concurrent collaborator limit from FREEDOM config',
    'IR-262-3: CF-324 — session timeout enforced',
    'IR-262-4: CF-322 — no cross-tenant presence data',
  ],
  events: {
    emits: ['session.created'],
  },
};

/** T263 — OTConflictResolutionGate */
export const T263_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T263',
  name: 'OTConflictResolutionGate',
  family: 89,
  flowId: 'FLOW-18',
  archetype: 'collaboration',
  version: 'v1',
  description:
    'Resolve concurrent canvas edit conflicts via CRDT/OT (F669). CF-321 deterministic. Emits conflict.resolved.',
  dna9Required: true,
  ironRules: [
    'IR-263-1: CF-321 — OT resolution must be deterministic (no Math.random/Date.now)',
    'IR-263-2: F669 (ICRDTEngineService) injected — no inline merge logic',
    'IR-263-3: Vector clock attached to every operation',
    'IR-263-4: Operation log persisted in xiigen-crdt-operations (DNA-8)',
  ],
  ironRulesStructured: [{ check: 'crdt_deterministic', severity: 'score-0' }],
  factoryDependencies: ['F669'],
  stackCoupling: [
    {
      stack: 'php-wordpress',
      incompatible: true,
      reason: 'no CRDT/OT operational transform for concurrent editing',
    },
  ],
  events: {
    emits: ['conflict.resolved'],
  },
};

/** T264 — CollaborationPermissionGate */
export const T264_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T264',
  name: 'CollaborationPermissionGate',
  family: 89,
  flowId: 'FLOW-18',
  archetype: 'collaboration',
  version: 'v1',
  description:
    'Validate and enforce collaboration permissions. CF-325. Emits permission.validated.',
  dna9Required: true,
  ironRules: [
    'IR-264-1: CF-325 — per-operation permission check enforced',
    'IR-264-2: Role hierarchy from FREEDOM config — no hardcoded roles',
  ],
  events: {
    emits: ['permission.validated'],
  },
};

// ── Flow Marketplace — VISUAL_CREATION (Family 90) ───────────────────────────

/** T265 — MarketplacePublishGate */
export const T265_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T265',
  name: 'MarketplacePublishGate',
  family: 90,
  flowId: 'FLOW-18',
  archetype: 'visual_creation',
  version: 'v1',
  description:
    'Publish flow to the marketplace. CF-326 BFA validation before publish. Emits flow.published.',
  dna9Required: true,
  ironRules: [
    'IR-265-1: CF-326 — BFA validation passed before publish',
    'IR-265-2: Flow persisted in marketplace index BEFORE emitting flow.published (DNA-8)',
  ],
  events: {
    emits: ['flow.published'],
    compensation: ['flow.publish.failed'],
  },
};

/** T266 — MarketplaceImportForkGate */
export const T266_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T266',
  name: 'MarketplaceImportForkGate',
  family: 90,
  flowId: 'FLOW-18',
  archetype: 'visual_creation',
  version: 'v1',
  description:
    'Fork/import flow from marketplace. CF-328 CRITICAL: ALL factories must register in BFA. Emits flow.forked.',
  dna9Required: true,
  ironRules: [
    'IR-266-1: CF-327 — new IDs assigned on fork (never reuse source IDs)',
    'IR-266-2: CF-328 CRITICAL — ALL factories from imported flow must register in BFA (F650)',
    'IR-266-3: BFA registration atomic — all-or-none (partial registration fails entire import)',
  ],
  ironRulesStructured: [{ check: 'bfa_import_registration', severity: 'score-0' }],
  factoryDependencies: ['F650'],
  events: {
    emits: ['flow.forked'],
  },
};

// ── Promotion Pipeline — CODE_INJECTION (Families 91–93) ─────────────────────

/** T267 — PromotionPipelineAdvanceGate */
export const T267_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T267',
  name: 'PromotionPipelineAdvanceGate',
  family: 91,
  flowId: 'FLOW-18',
  archetype: 'code_injection',
  version: 'v1',
  description:
    'Advance staged promotion: sandbox→staging→production. CF-315 no skip. Feature flag (F682). Emits promotion.advanced.',
  dna9Required: true,
  ironRules: [
    'IR-267-1: CF-315 CRITICAL — staged: sandbox→staging→production, no skip',
    'IR-267-2: CF-316 — canary percentage from FREEDOM config',
    'IR-267-3: CF-317 — health check at each stage before advancing',
    'IR-267-4: F682 (IFeatureFlagService) injected for stage toggling',
  ],
  ironRulesStructured: [
    { check: 'staged_promotion_order', severity: 'score-0' },
    { check: 'feature_flag_required', severity: 'score-0' },
  ],
  factoryDependencies: ['F682'],
  stackCoupling: [
    {
      stack: 'php-wordpress',
      incompatible: true,
      reason: 'no staged promotion pipeline (sandbox→staging→production)',
    },
  ],
  events: {
    emits: ['promotion.advanced'],
  },
};

/** T268 — RollbackHealthGate */
export const T268_CONTRACT: Record<string, unknown> = {
  taskTypeId: 'T268',
  name: 'RollbackHealthGate',
  family: 92,
  flowId: 'FLOW-18',
  archetype: 'code_injection',
  version: 'v1',
  description:
    'Health check with rollback. emergencyOff() < 100ms (F682). Full rollback ≤2s. Emits rollback.executed or health.verified.',
  dna9Required: true,
  ironRules: [
    'IR-268-1: emergencyOff() MUST be called FIRST on health failure (< 100ms SLA)',
    'IR-268-2: CF-318 — rollback verified: total ≤2s',
    'IR-268-3: CF-319 — audit trail for every rollback',
    'IR-268-4: F682 emergencyOff + F646 rollback both injected',
    'IR-268-5: Health check from F686 (promotion audit) after rollback',
  ],
  ironRulesStructured: [
    { check: 'rollback_capability_present', severity: 'score-0' },
    { check: 'feature_flag_required', severity: 'score-0' },
  ],
  factoryDependencies: ['F682', 'F646', 'F686'],
  events: {
    emits: ['rollback.executed', 'health.verified'],
  },
};

/** All FLOW-18 contracts in an array for engine bootstrapper. */
export const FLOW_18_CONTRACTS: Record<string, unknown>[] = [
  T247_CONTRACT,
  T248_CONTRACT,
  T249_CONTRACT,
  T250_CONTRACT,
  T251_CONTRACT,
  T252_CONTRACT,
  T253_CONTRACT,
  T254_CONTRACT,
  T255_CONTRACT,
  T256_CONTRACT,
  T257_CONTRACT,
  T258_CONTRACT,
  T259_CONTRACT,
  T260_CONTRACT,
  T261_CONTRACT,
  T262_CONTRACT,
  T263_CONTRACT,
  T264_CONTRACT,
  T265_CONTRACT,
  T266_CONTRACT,
  T267_CONTRACT,
  T268_CONTRACT,
];
