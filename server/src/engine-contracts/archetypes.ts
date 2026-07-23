/**
 * ContractArchetype — classifies engine contracts by purpose.
 *
 * Each engine contract (task type) has exactly one archetype.
 * Used for categorization, template selection, and AF station configuration.
 *
 * Phase 6.3: Engine contract foundation type.
 */

export enum ContractArchetype {
  /** Single-service data operations (CRUD, transforms). */
  SERVICE = 'service',
  /** Multi-step data pipeline (ETL, aggregation). */
  DATA_PIPELINE = 'data_pipeline',
  /** Multi-service orchestration (joins, saga, choreography). */
  ORCHESTRATION = 'orchestration',
  /** AI-driven generation (code gen, content gen, analysis). */
  AI_GENERATION = 'ai_generation',
  /** Composite: combines multiple archetypes. */
  COMPOSITE = 'composite',
  // ── FLOW-25: BFA Cross-Flow Governance ─────────────────────────────────────
  /** Parse + normalize + persist raw input (insert-only, content-addressed). */
  INGESTION = 'ingestion',
  /** Extract, detect, analyze, aggregate — scoped impact queries + AI advisory. */
  IMPACT_ANALYSIS = 'impact_analysis',
  /** Transitive graph traversal — cycle-safe, depth-limited, FREEDOM-configured. */
  BLAST_RADIUS = 'blast_radius',
  /** State machine, human capture, resolution apply — persist-before-emit on every transition. */
  ARBITRATION = 'arbitration',
  /** Assemble human-readable conflict/impact reports for Web/CLI/Chat channels. */
  SYNTHESIS = 'synthesis',
  /** Immutable audit trail, tenant isolation gate, cross-tenant guard, analytics emit. */
  GOVERNANCE = 'governance',
  // ── FLOW-29: Adaptive RAG Deep Research Engine ─────────────────────────────
  /** Fetch content from vector/graph indexes — tenant-scoped, result-fidelity enforced. */
  RETRIEVAL = 'retrieval',
  /** Dynamic request routing via bandit policy — deterministic given same policy + seed. */
  ROUTING = 'routing',
  /** Hard-stop enforcement gate — threshold from FREEDOM config, never hardcoded. */
  GUARD = 'guard',
  /** Policy updates from feedback — always async, never on live request path. */
  LEARNING = 'learning',
  /** Cross-cutting trace and span emission via QUEUE FABRIC only — zero SDK imports. */
  OBSERVABILITY = 'observability',
  /** Async construction/compilation — non-blocking, idempotent trigger, partial-failure tolerant. */
  BUILD = 'build',
  /** Comparative quality assessment — evidence required, numeric scores, never boolean. */
  EVALUATION = 'evaluation',
  /** A/B allocation and result collection — deterministic hash, tenant-scoped results. */
  EXPERIMENTATION = 'experimentation',
  /** AI-driven suggestion from data — human-gated apply, evidence required before emit. */
  ANALYSIS = 'analysis',
  /** Fabric-first frontend rendering — zero hardcoded values, all from FREEDOM config. */
  UI = 'ui',
  // ── FLOW-33: System Initiation — Self-Building Bootstrap ─────────────────
  /** Lifecycle states with idempotency locks — sentinel-read-first enforced. */
  STATE_MACHINE = 'state_machine',
  /** Bounded retry loop with arbiter feedback injection — retry count from FREEDOM config. */
  AI_GENERATION_LOOP = 'ai_generation_loop',
  /** Parallel multi-arbiter voting — ≥4/5 quorum required, never sequential. */
  AI_CONSENSUS = 'ai_consensus',
  /** Graph traversal for downstream impact — blast radius before any promotion. */
  CHANGE_DETECTION = 'change_detection',
  // ── FLOW-35: Meta-Arbitration Engine ──────────────────────────────────────
  /** Collects and aggregates arbiter outputs into a structured round summary. */
  META_COLLECTION = 'meta_collection',
  /** Applies meta-arbiter policies to produce a final RoundDecision (CONTINUE/ESCALATE/HALT/ACCEPT). */
  META_DECISION = 'meta_decision',
  // ── FLOW-36: Feature Registry ─────────────────────────────────────────────
  /** Mock platform runtime execution for adapter validation — local-only, zero cloud credentials. */
  SIMULATION = 'simulation',
  // ── FLOW-00: Bundle Activation ────────────────────────────────────────────
  /** Pre-activation validation gate — checks structure, dependencies, and cross-flow BFA before any provisioning. */
  VALIDATION = 'validation',
  // ── FLOW-01: User Registration & Onboarding ───────────────────────────────
  /** Async wait state — idempotent poll loop, state stored in DATABASE FABRIC, transitions on event arrival. */
  PROCESSING = 'processing',
  // ── FLOW-02: Profile Enrichment & Matching ────────────────────────────────
  /** Parallel fan-out to multiple sources, allSettled merge — partial failure tolerant. */
  FAN_IN = 'fan_in',
  /** Confidence-gated convergence — entry guard + degraded success path. */
  CONVERGENCE = 'convergence',
  /** Unconditional gate event emission + consent-gated notification side effects. */
  BROADCAST = 'broadcast',
  // ── FLOW-05: Achievements & Gamification ──────────────────────────────────
  /** Completion event with idempotency gate — setIfAbsent enforced before emit. */
  COMPLETION = 'completion',
  /** Multi-signal score aggregation — award thresholds from FREEDOM config only. */
  GAMIFICATION = 'gamification',
  /** Social broadcast — discriminated payload required; no flat payload ACCEPTS. */
  BROADCAST_SOCIAL = 'broadcast-social',
  // ── FLOW-06: Community Groups & Membership ────────────────────────────────
  /** Tenant + group dual-scope isolation — role hierarchy without self-promotion. */
  MEMBERSHIP = 'membership',
  /** Engagement-scored feed — weights from FREEDOM config, score clamped 0-1. */
  GROUP_FEED = 'group_feed',
  // ── FLOW-10: Reviews + Reputation ────────────────────────────────────────
  /** Multi-phase submission gateway — eligibility-first, ordered execution steps. */
  SUBMISSION_GATEWAY = 'submission_gateway',
  /** Three-path moderation — PASS / REJECT / UNCERTAIN with human-queue routing. */
  MODERATION = 'moderation',
  /** Additive and retractive score aggregation — scoreRange-clamped output. */
  AGGREGATION = 'aggregation',
  // ── FLOW-13: Data Warehouse & Retention ───────────────────────────────────
  /** Dynamic query execution — tenant-scoped, quota-checked, backpressure-aware. */
  QUERY_ENGINE = 'query_engine',
  /** Data lifecycle and purge management — legal-hold aware, tombstone-based, approval-gated. */
  RETENTION = 'retention',
  /** Schema versioning and evolution — additive auto-approve, breaking-change approval-gated. */
  SCHEMA_REGISTRY_ARCHETYPE = 'schema_registry',
  /** Aggregation and analytical query execution — quota-enforced, time-windowed. */
  ANALYTICS_ENGINE = 'analytics_engine',
  /** Batch ingestion pipeline — append-only zones, time-windowed batch IDs. */
  INGESTOR = 'ingestor',
  // ── FLOW-14: ETL / Data Integration ───────────────────────────────────────
  /** Data transformation pipeline — zone-promotion ordered, PII-gated, SCD2-safe. */
  TRANSFORM = 'transform',
  /** Dimensional modeling — SCD2 enforced, no direct dimension updates. */
  MODELING = 'modeling',
  /** Reverse ETL activation — queue fabric only, cross-tenant join blocked. */
  ACTIVATION = 'activation',
  // ── FLOW-15: Marketplace Extensions & Add-ons ─────────────────────────────
  /** Reusable artifact template — scaffold-driven, zero hardcoded values. */
  TEMPLATE_ARCHETYPE = 'template',
  /** Project/app scaffolding — template-driven, idempotent generation. */
  SCAFFOLDING = 'scaffolding',
  /** Isolated sandbox execution — ephemeral, tenant-scoped, zero cloud credentials. */
  SANDBOX = 'sandbox',
  /** Billing and payment processing — idempotency-gated, PCI-scoped. */
  BILLING = 'billing',
  /** Usage and consumption metering — append-only ledger, quota-enforced. */
  METERING = 'metering',
  /** Artifact and package publishing — version-immutable, approval-gated. */
  PUBLISHING = 'publishing',
  /** OAuth flow handler — PKCE per-exchange, BYOK-rotation safe. */
  OAUTH = 'oauth',
  /** AI feature add-on — model-selected, human-gated apply, evidence required. */
  AI_ADDON = 'ai_addon',
  /** Auto-scaling and capacity management — event-log driven, circuit-breaker safe. */
  SCALING = 'scaling',
  /** Enterprise-tier feature — silo-graduated, vault-isolated, one-way promotion. */
  ENTERPRISE = 'enterprise',
  // ── FLOW-20: Real-time & Streaming ────────────────────────────────────────
  /** Synchronous request-response — conservative multi-model, per-field auth, tenant-edge resolved. */
  REQUEST_RESPONSE = 'request_response',
  // ── FLOW-18: Visual Flow Creation & Code Injection Engine ─────────────────
  /** Visual canvas manipulation, DAG editing, UI rendering, marketplace operations. */
  VISUAL_CREATION = 'visual_creation',
  /** AI code generation, factory registration, hot-injection, and promotion pipeline. */
  CODE_INJECTION = 'code_injection',
  /** Isolated sandbox execution, iron-rule sweep, quality gate, and promotion decision. */
  SANDBOX_TEST = 'sandbox_test',
  /** Multi-user CRDT/OT collaborative editing, presence, and permission enforcement. */
  COLLABORATION = 'collaboration',
  // ── FLOW-41/42/43/44: Platform Adapter Extensions ─────────────────────────
  /** Port existing pipeline logic to a new SDK target — 90 % reuse, adapter-only translation layer. */
  ADAPTATION = 'adaptation',
}

/** All valid archetype values. */
export const ALL_ARCHETYPES: readonly ContractArchetype[] = Object.values(ContractArchetype);

/** Check if a string is a valid ContractArchetype. */
export function isValidArchetype(value: string): value is ContractArchetype {
  return ALL_ARCHETYPES.includes(value as ContractArchetype);
}
