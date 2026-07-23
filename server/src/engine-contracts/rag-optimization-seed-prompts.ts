/**
 * FLOW-29 Seed Prompts — genesis prompts for T441–T467 (Adaptive RAG Deep Research Engine).
 *
 * Tier-2 platform-level genesis prompts seeded into PromptLibrary at bootstrap.
 * The arbitration loop improves these prompts across rounds via FeedbackSynthesizer.
 *
 * connection_type: FLOW_SCOPED (belongs to FLOW-29 — not tenant-exportable)
 * flow_id: FLOW-29
 */

/** Shape of a FLOW-29 genesis prompt record. */
export interface Flow29GenesisPrompt {
  readonly taskType: string;
  readonly promptText: string;
  readonly connection_type: 'FLOW_SCOPED';
  readonly flow_id: 'FLOW-29';
  readonly version: string;
}

// ── ORCHESTRATION ─────────────────────────────────────────────────────────

export const T441_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T441',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating AdaptiveRagRouter for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a query object (Record<string, unknown>) with required fields: query_text, tenant_id context
2. Reads the active bandit policy from FREEDOM config (key: flow29_bandit_policy)
3. Routes to exactly one of: VECTOR, GRAPH, HYBRID, SELF_REFLECT based on policy weights
4. Records the routing decision via IDatabaseService (storeDocument BEFORE enqueue — DNA-8)
5. Emits routing.decision.recorded CloudEvent via IQueueService (DNA-9)
6. Returns DataProcessResult<{ mode: string; confidence: number; routingId: string }>

## Critical Iron Rules
- storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern
- Route selection MUST be deterministic given the same policy — no random selection outside policy
- Policy read MUST come from FREEDOM config — never hardcoded
- SELF_REFLECT mode is a valid no-retrieval path — do not force retrieval

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- NEVER import DB/queue SDK directly — inject IDatabaseService and IQueueService

## Output
A single TypeScript file containing AdaptiveRagRouter.
Include only the service — no controllers, no modules.
`.trim(),
};

// ── RETRIEVAL ─────────────────────────────────────────────────────────────

export const T442_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T442',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating VectorRetrievalStep for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a query embedding and filter criteria (Record<string, unknown>)
2. Executes tenant-scoped vector similarity search via IRagService
3. Returns top-k results with score and source metadata
4. Stores a retrieval record via IDatabaseService (storeDocument BEFORE enqueue — DNA-8)
5. Emits retrieval.vector.completed CloudEvent

## Critical Iron Rules
- Tenant scope is automatic via AsyncLocalStorage — NEVER pass tenantId to IRagService
- All search results remain scoped to the calling tenant — cross-tenant leakage is CF-476 violation
- top_k MUST come from FREEDOM config — never hardcoded
- Empty result set is a valid success, not an error

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- Use IRagService for all vector operations — never direct DB queries

## Output
A single TypeScript file containing VectorRetrievalStep.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T443_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T443',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating GraphRAGCommunityQuery for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a query and community-level filter (Record<string, unknown>)
2. Queries the graph knowledge base at community granularity via IRagService
3. Expands query across related community summaries
4. Returns results with community_id, relevance_score, and summary_excerpt
5. Records query execution via IDatabaseService and emits CloudEvent

## Critical Iron Rules
- Community queries MUST be tenant-scoped — no cross-tenant community data
- Query expansion depth MUST come from FREEDOM config (key: flow29_community_depth)
- Empty community result is a valid success — return empty array, not error

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- NEVER import graph SDK — use IRagService interface

## Output
A single TypeScript file containing GraphRAGCommunityQuery.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T444_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T444',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating HybridRetrievalFusion for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts results from VectorRetrievalStep and GraphRAGCommunityQuery
2. Fuses results using Reciprocal Rank Fusion (RRF) algorithm
3. Output shape MUST be compatible with RerankerStep (T458) — same item interface (CF-606)
4. Returns unified ranked list with fusion_score and source_type for each item
5. Records fusion metrics via IDatabaseService

## Critical Iron Rules
- CF-606: Output shape MUST match RerankerStep input — items MUST have { content, score, source_type }
- RRF constant k=60 comes from FREEDOM config (key: flow29_rrf_k) — not hardcoded
- Empty inputs from both sources yields empty fused output — not an error
- Deduplication by content hash BEFORE fusion scoring

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing HybridRetrievalFusion.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T458_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T458',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating RerankerStep for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a list of retrieval result items (each with content, score, source_type)
2. Reranks by relevance using IAiProvider cross-encoder scoring
3. Returns reranked list with updated rerank_score and original_rank
4. Records reranking via IDatabaseService

## Critical Iron Rules
- Input MUST accept items with { content, score, source_type } — same shape as HybridRetrievalFusion output (CF-606)
- top_n after reranking comes from FREEDOM config — never hardcoded
- Empty input list → return empty list (not error)
- AI scoring MUST be tenant-scoped — inject IAiProvider

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- Use IAiProvider for cross-encoder — never import model SDK

## Output
A single TypeScript file containing RerankerStep.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T463_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T463',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating MultiHopGraphTraversal for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a start node ID and traversal depth limit
2. Performs multi-hop graph traversal via IRagService (NOT direct graph queries)
3. Maintains a visited-set to prevent cycles — never revisit a node
4. Returns collected nodes and edges with hop depth for each
5. Records traversal session via IDatabaseService

## Critical Iron Rules
- Max depth MUST come from FREEDOM config (key: flow29_max_hop_depth) — never hardcoded
- visited-set guard MUST prevent infinite cycles — hard guard, not optional
- Traversal MUST be tenant-scoped — cross-tenant node access is forbidden
- Empty graph or disconnected node → return partial result, not error

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- Use IRagService for all graph operations — never raw DB queries

## Output
A single TypeScript file containing MultiHopGraphTraversal.
Include only the service — no controllers, no modules.
`.trim(),
};

// ── ROUTING ───────────────────────────────────────────────────────────────

export const T445_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T445',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating BanditModelSelector for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a context object (Record<string, unknown>) with query features
2. Reads active bandit arm weights from FREEDOM config (key: flow29_bandit_arms)
3. Selects a model/strategy arm using epsilon-greedy or UCB1 algorithm
4. Records the selection decision via IDatabaseService (storeDocument BEFORE enqueue — DNA-8)
5. Emits bandit.arm.selected CloudEvent
6. Returns selected arm name and exploration flag

## Critical Iron Rules
- storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern
- Arm weights MUST come from FREEDOM config — never hardcoded
- Algorithm choice (epsilon vs UCB1) from FREEDOM config (key: flow29_bandit_algorithm)
- Selection MUST be deterministic given same weights + seed — testable

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing BanditModelSelector.
Include only the service — no controllers, no modules.
`.trim(),
};

// ── GUARD ─────────────────────────────────────────────────────────────────

export const T446_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T446',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating BudgetEnforcementGate for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts current token count and cost estimate for a request
2. Reads tenant budget limits from FREEDOM config
3. Returns BUDGET_EXCEEDED failure if either limit is breached — hard stop, no bypass
4. Records enforcement event via IDatabaseService when limit is exceeded
5. Returns success with remaining budget info when within limits

## Critical Iron Rules
- Budget limits MUST come from FREEDOM config — never hardcoded per-tenant constants
- BUDGET_EXCEEDED is a hard stop — no override mechanism exists on this service
- Both token limit AND cost limit are independently enforced
- Zero remaining budget is still a success if current request fits

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing BudgetEnforcementGate.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T454_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T454',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating EvalQualityGate for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts evaluation scores: hallucination_rate and coverage_score
2. Reads pass thresholds from FREEDOM config (key: flow29_eval_thresholds)
3. Returns QUALITY_GATE_FAILED failure if either score breaches threshold — hard stop
4. Records gate outcome via IDatabaseService
5. Returns success with quality summary when scores pass

## Critical Iron Rules
- Thresholds MUST come from FREEDOM config — never hardcoded
- QUALITY_GATE_FAILED is a hard stop — no override on this service
- Both hallucination AND coverage are independently checked
- Gate result MUST be stored before downstream continues — DNA-8

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing EvalQualityGate.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T457_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T457',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating ContextEfficiencyCheck for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a context window allocation plan (token counts per section)
2. Reads the max context budget from FREEDOM config (key: flow29_context_budget)
3. Returns CONTEXT_OVER_BUDGET failure if total allocation exceeds budget — hard stop
4. Returns optimization suggestions (Record<string, unknown>) when within budget
5. Records check result via IDatabaseService

## Critical Iron Rules
- Context budget MUST come from FREEDOM config — never hardcoded
- CONTEXT_OVER_BUDGET is a hard stop — no bypass mechanism
- Suggestions are informational only — never auto-applied by this service
- Zero-allocation inputs are valid (returns empty suggestions, success)

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing ContextEfficiencyCheck.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T459_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T459',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating SelfReflectionGuard for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a query and current context (Record<string, unknown>)
2. Evaluates whether retrieval is necessary using IAiProvider
3. Returns SELF_REFLECT decision (no retrieval needed) or PROCEED_RETRIEVAL decision
4. Records the reflection decision via IDatabaseService (storeDocument BEFORE enqueue — DNA-8)
5. Emits reflection.decided CloudEvent

## Critical Iron Rules
- storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern
- SELF_REFLECT is a valid non-error outcome — skip retrieval path entirely
- Reflection threshold confidence comes from FREEDOM config — never hardcoded
- AI evaluation MUST be tenant-scoped via IAiProvider

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- Use IAiProvider for evaluation — never import model SDK

## Output
A single TypeScript file containing SelfReflectionGuard.
Include only the service — no controllers, no modules.
`.trim(),
};

// ── LEARNING ──────────────────────────────────────────────────────────────

export const T447_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T447',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating RoutingPolicyUpdater for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a feedback signal (Record<string, unknown>) with arm_id and reward
2. Updates bandit policy weights stored in IDatabaseService (ASYNC via queue — never on live path)
3. Records policy update event via IDatabaseService (storeDocument BEFORE enqueue — DNA-8)
4. Returns DataProcessResult<{ updated: boolean; newWeights: Record<string, unknown> }>

## Critical Iron Rules (SCORE-0 — any violation = contract rejection)
- This service MUST be async-only — NEVER called synchronously on the live retrieval path
- Policy updates MUST be triggered via queue events — never direct method calls from routers
- storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern
- Policy changes take effect on NEXT request — never mutate in-flight requests

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing RoutingPolicyUpdater.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T449_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T449',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating UserFeedbackIngest for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a feedback record linked to the 6-tuple run context: (tenant, session, query_id, model, strategy, timestamp)
2. Validates completeness of all 6-tuple fields — MISSING_RUN_CONTEXT_FIELD on any missing field
3. Stores the feedback via IDatabaseService (INSERT-ONLY — no update after write)
4. Emits feedback.ingested CloudEvent via IQueueService (DNA-8: store BEFORE enqueue)
5. Returns idempotent result for duplicate feedback (same 6-tuple + same rating)

## Critical Iron Rules
- All 6 context tuple fields MUST be present — reject with MISSING_RUN_CONTEXT_FIELD on any gap
- storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern
- IMMUTABLE: no update/delete methods
- Duplicate feedback (same 6-tuple + rating) returns existing record — idempotent, no error

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing UserFeedbackIngest.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T460_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T460',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating FeedbackAggregationWindow for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Reads raw feedback records from IDatabaseService for a given time window
2. Aggregates signals per bandit arm (average reward, sample count)
3. Triggers RoutingPolicyUpdater via IQueueService when window is complete (never direct call)
4. Records aggregation result via IDatabaseService (storeDocument BEFORE enqueue — DNA-8)

## Critical Iron Rules
- storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern
- RoutingPolicyUpdater MUST be triggered via queue — NEVER called directly
- Window size comes from FREEDOM config (key: flow29_feedback_window_minutes) — never hardcoded
- Empty window (no feedback) is valid — record zero-signal result, do not trigger update

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing FeedbackAggregationWindow.
Include only the service — no controllers, no modules.
`.trim(),
};

// ── OBSERVABILITY ─────────────────────────────────────────────────────────

export const T448_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T448',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating TraceSpanCapture for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a span descriptor (Record<string, unknown>) with span_name, trace_id, duration_ms
2. Emits the span via IQueueService to a configured observability channel — QUEUE FABRIC ONLY
3. Returns DataProcessResult<{ captured: boolean; spanId: string }>

## Critical Iron Rules (SCORE-0 — any violation = contract rejection)
- ZERO OpenTelemetry SDK imports — not even @opentelemetry/api
- ZERO direct HTTP to any observability endpoint — queue fabric only
- Span emission MUST be fire-and-forget — failures MUST NOT propagate to caller
- All span data flows via IQueueService — never storeDocument (spans are ephemeral)

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- NEVER import any observability SDK — emit to queue channel only

## Output
A single TypeScript file containing TraceSpanCapture.
Include only the service — no controllers, no modules.
`.trim(),
};

// ── GOVERNANCE ────────────────────────────────────────────────────────────

export const T450_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T450',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating PromptVersionPromoter for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a promotion request (promptId, targetStage: CANDIDATE | ACTIVE | ARCHIVED)
2. Validates the stage transition is on the approved ladder: CANDIDATE→ACTIVE, ACTIVE→ARCHIVED only
3. Writes the promotion record via IDatabaseService (IMMUTABLE — no rollback path on this service)
4. Emits prompt.version.promoted CloudEvent via IQueueService (DNA-8: store BEFORE enqueue)
5. Returns DataProcessResult<{ promoted: boolean; newStage: string; promptId: string }>

## Critical Iron Rules
- ONLY valid transitions: CANDIDATE→ACTIVE and ACTIVE→ARCHIVED — all others return INVALID_TRANSITION
- storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern
- IMMUTABLE: no rollback method on this service
- Duplicate promotion attempt (same promptId + same targetStage) returns ALREADY_PROMOTED

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing PromptVersionPromoter.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T452_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T452',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating KnowledgeGraphEditGate for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a graph edit proposal (Record<string, unknown>) with edit_type and affected_nodes
2. Calls the FLOW-25 BFA governance gate before allowing any structural edit
3. Returns GRAPH_EDIT_BLOCKED if BFA gate rejects — edit MUST NOT proceed
4. Records gate decision via IDatabaseService (storeDocument BEFORE enqueue — DNA-8)
5. Returns DataProcessResult<{ allowed: boolean; gateRef: string }>

## Critical Iron Rules
- FLOW-25 BFA gate MUST be called before any structural graph edit — no bypass
- storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern
- GRAPH_EDIT_BLOCKED halts the edit — caller is responsible for not proceeding
- BFA gate call MUST be via IQueueService or IDatabaseService — not direct import

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing KnowledgeGraphEditGate.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T455_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T455',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating PromotionPipelineGate for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a promotion candidate (Record<string, unknown>) with artifact_id and target_env
2. Calls the FLOW-25 BFA governance gate to validate promotion is safe
3. Returns PROMOTION_BLOCKED if BFA gate rejects — promotion MUST NOT proceed
4. Records gate outcome via IDatabaseService (storeDocument BEFORE enqueue — DNA-8)
5. Returns DataProcessResult<{ allowed: boolean; gateRef: string }>

## Critical Iron Rules
- FLOW-25 BFA gate MUST be called before any environment promotion — no bypass
- storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern
- PROMOTION_BLOCKED halts the pipeline — no partial promotion
- Gate call MUST be through fabric interfaces — never direct FLOW-25 service import

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing PromotionPipelineGate.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T462_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T462',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating ControlPlaneGraphEdit for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a versioned graph edit (Record<string, unknown>) with edit_id, version, and patch
2. Verifies the edit has BFA approval via KnowledgeGraphEditGate (never bypass)
3. Applies the edit atomically via IDatabaseService — each edit is versioned, never mutate in place
4. Emits graph.edit.applied CloudEvent via IQueueService (DNA-8: store BEFORE enqueue)
5. Returns DataProcessResult<{ applied: boolean; editId: string; newVersion: string }>

## Critical Iron Rules
- BFA approval MUST be verified via KnowledgeGraphEditGate — no direct edit without approval
- storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern
- Each edit creates a new version record — NEVER mutate the previous version
- Rollback is handled by RAGStrategyRollback (T466) — not this service

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing ControlPlaneGraphEdit.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T466_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T466',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating RAGStrategyRollback for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a rollback request with target_version and artifact_id
2. Updates the active pointer to point to target_version — POINTER SWAP ONLY (no deletion)
3. Records rollback event via IDatabaseService (storeDocument BEFORE enqueue — DNA-8)
4. Emits strategy.rollback.applied CloudEvent
5. Returns DataProcessResult<{ rolledBack: boolean; activeVersion: string }>

## Critical Iron Rules
- Rollback is a POINTER SWAP only — NEVER delete versions
- storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern
- Previous active version MUST remain accessible (not deleted, not archived by this service)
- Rolling back to a non-existent version returns VERSION_NOT_FOUND failure

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing RAGStrategyRollback.
Include only the service — no controllers, no modules.
`.trim(),
};

// ── BUILD ─────────────────────────────────────────────────────────────────

export const T451_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T451',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating DomainProfileCompiler for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a domain specification (Record<string, unknown>) with domain_id and source_docs
2. Compiles a domain knowledge profile ASYNCHRONOUSLY — trigger via queue, not blocking call
3. Stores partial progress checkpoints via IDatabaseService
4. Emits domain.profile.compiled CloudEvent when complete (DNA-8: store BEFORE enqueue)
5. Returns DataProcessResult<{ jobId: string; status: 'QUEUED' }>

## Critical Iron Rules
- Compilation MUST be async — return QUEUED status immediately, never block caller
- Compilation triggered via IQueueService — never inline processing on request path
- storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern
- Partial failure in compilation → checkpoint what succeeded, emit error event, do not throw

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing DomainProfileCompiler.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T464_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T464',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating CommunitySummaryGenerator for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a community node set (Record<string, unknown>) with community_id and member_nodes
2. Generates a community summary ASYNCHRONOUSLY via IAiProvider (triggered via queue)
3. Stores the summary via IDatabaseService (storeDocument BEFORE enqueue — DNA-8)
4. Emits community.summary.generated CloudEvent
5. Returns DataProcessResult<{ jobId: string; status: 'QUEUED' }>

## Critical Iron Rules
- Summary generation MUST be async — return QUEUED immediately, never block
- Use IAiProvider for summarization — never import model SDK
- storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern
- Empty community (zero members) → store empty summary, emit event, return success

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- Use IAiProvider for all AI operations — never import model SDK

## Output
A single TypeScript file containing CommunitySummaryGenerator.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T465_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T465',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating DomainGraphIndexRebuild for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a rebuild specification (Record<string, unknown>) with domain_id and index_version
2. Triggers an ASYNC index rebuild via IQueueService — live queries continue using previous index
3. Creates the new index alongside the old (dual-index pattern) — never rebuild in-place
4. Emits index.rebuild.completed CloudEvent when done (DNA-8: store BEFORE enqueue)
5. Returns DataProcessResult<{ jobId: string; status: 'QUEUED'; previousIndex: string }>

## Critical Iron Rules
- Rebuild MUST be async — live queries keep using previous index during rebuild
- NEVER rebuild in-place — always create new index, swap pointer when complete
- storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern
- Rebuild failure MUST leave previous index intact and active

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing DomainGraphIndexRebuild.
Include only the service — no controllers, no modules.
`.trim(),
};

// ── EVALUATION ────────────────────────────────────────────────────────────

export const T453_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T453',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating RAGAssetVersionCompare for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts two RAG asset version IDs (version_a, version_b) and an eval dataset reference
2. Runs comparative evaluation via IAiProvider on the eval dataset
3. Returns comparison results: { winner: string; scoreA: number; scoreB: number; metrics: Record<string, unknown> }
4. Records comparison result via IDatabaseService (storeDocument BEFORE enqueue — DNA-8)
5. Emits asset.comparison.completed CloudEvent

## Critical Iron Rules
- storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern
- Evaluation MUST be reproducible — record eval dataset ref + scores together
- Tie (equal scores) is a valid result — returns winner: 'TIE'
- Use IAiProvider for evaluation scoring — never import scoring library

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- Use IAiProvider for all AI scoring — never import model SDK

## Output
A single TypeScript file containing RAGAssetVersionCompare.
Include only the service — no controllers, no modules.
`.trim(),
};

// ── EXPERIMENTATION ───────────────────────────────────────────────────────

export const T456_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T456',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating ABTestAllocator for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a subject_id and experiment_id
2. Allocates to variant using deterministic hash (hash(subject_id + experiment_id) % 100)
3. Reads variant definitions and traffic splits from FREEDOM config
4. Records allocation via IDatabaseService (storeDocument BEFORE enqueue — DNA-8)
5. Returns DataProcessResult<{ variant: string; experimentId: string; allocationHash: number }>

## Critical Iron Rules
- Allocation MUST be deterministic — same subject_id + experiment_id always yields same variant
- Traffic splits MUST come from FREEDOM config — never hardcoded percentages
- storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern
- Each subject gets one allocation per experiment — idempotent (same subject+experiment returns same variant)

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing ABTestAllocator.
Include only the service — no controllers, no modules.
`.trim(),
};

// ── ANALYSIS ──────────────────────────────────────────────────────────────

export const T461_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T461',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating ImprovementSuggestionEngine for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Reads aggregated feedback and evaluation results from IDatabaseService
2. Uses IAiProvider to generate improvement suggestions
3. Stores suggestions via IDatabaseService (storeDocument BEFORE enqueue — DNA-8)
4. Emits suggestions.ready CloudEvent via IQueueService for HUMAN REVIEW
5. Returns DataProcessResult<{ suggestions: Record<string, unknown>[]; requiresHumanReview: true }>

## Critical Iron Rules (SCORE-0 — any violation = contract rejection)
- Suggestions MUST NEVER be auto-applied — requiresHumanReview is always true
- This service ONLY queues suggestions for review — NEVER triggers any system change
- storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern
- The emitted event goes to a HUMAN REVIEW queue — not an automation trigger

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- Use IAiProvider for generation — never import model SDK

## Output
A single TypeScript file containing ImprovementSuggestionEngine.
Include only the service — no controllers, no modules.
`.trim(),
};

// ── UI ────────────────────────────────────────────────────────────────────

export const T467_GENESIS_PROMPT: Flow29GenesisPrompt = {
  taskType: 'T467',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-29',
  version: '1.0.0',
  promptText: `
You are generating ControlPlaneNodeRenderer for the XIIGen Adaptive RAG Deep Research Engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Reads control plane node definitions from IDatabaseService (never hardcoded)
2. Renders node descriptors (Record<string, unknown>) for frontend consumption
3. Reads ALL display configuration from FREEDOM config — zero hardcoded UI values
4. Handles empty node list gracefully — returns empty array with success, not error
5. Returns DataProcessResult<{ nodes: Record<string, unknown>[]; renderVersion: string }>

## Critical Iron Rules
- ZERO hardcoded UI values — all labels, colors, icons come from FREEDOM config
- Empty node list is a valid success — return empty array, never error
- Node data MUST be tenant-scoped — cross-tenant nodes forbidden
- renderVersion comes from FREEDOM config — never hardcoded

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- NO frontend framework imports — pure data transformation

## Output
A single TypeScript file containing ControlPlaneNodeRenderer.
Include only the service — no controllers, no modules.
`.trim(),
};

// ── Aggregated array ───────────────────────────────────────────────────────

/** All 27 FLOW-29 genesis prompts for bulk seeding. */
export const RAG_OPTIMIZATION_GENESIS_PROMPTS: Flow29GenesisPrompt[] = [
  T441_GENESIS_PROMPT,
  T442_GENESIS_PROMPT,
  T443_GENESIS_PROMPT,
  T444_GENESIS_PROMPT,
  T445_GENESIS_PROMPT,
  T446_GENESIS_PROMPT,
  T447_GENESIS_PROMPT,
  T448_GENESIS_PROMPT,
  T449_GENESIS_PROMPT,
  T450_GENESIS_PROMPT,
  T451_GENESIS_PROMPT,
  T452_GENESIS_PROMPT,
  T453_GENESIS_PROMPT,
  T454_GENESIS_PROMPT,
  T455_GENESIS_PROMPT,
  T456_GENESIS_PROMPT,
  T457_GENESIS_PROMPT,
  T458_GENESIS_PROMPT,
  T459_GENESIS_PROMPT,
  T460_GENESIS_PROMPT,
  T461_GENESIS_PROMPT,
  T462_GENESIS_PROMPT,
  T463_GENESIS_PROMPT,
  T464_GENESIS_PROMPT,
  T465_GENESIS_PROMPT,
  T466_GENESIS_PROMPT,
  T467_GENESIS_PROMPT,
];
