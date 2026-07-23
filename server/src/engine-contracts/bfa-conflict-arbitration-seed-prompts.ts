/**
 * FLOW-25 Seed Prompts — genesis prompts for T375–T388 (BFA Cross-Flow Governance).
 *
 * Tier-2 platform-level genesis prompts seeded into PromptLibrary at bootstrap.
 * The arbitration loop improves these prompts across rounds via FeedbackSynthesizer.
 *
 * connection_type: FLOW_SCOPED (belongs to FLOW-25 — not tenant-exportable)
 * flow_id: FLOW-25
 */

/** Shape of a FLOW-25 genesis prompt record. */
export interface Flow25GenesisPrompt {
  readonly taskType: string;
  readonly promptText: string;
  readonly connection_type: 'FLOW_SCOPED';
  readonly flow_id: 'FLOW-25';
  readonly version: string;
}

// ── INGESTION (Family-147) ─────────────────────────────────────────────────

export const T375_GENESIS_PROMPT: Flow25GenesisPrompt = {
  taskType: 'T375',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-25',
  version: '1.0.0',
  promptText: `
You are generating ChangeIntakeParser for the XIIGen BFA governance engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a raw BFA change request (PR diff, schema migration, API contract change)
2. Validates change_type against CF-473 enum (4 valid values: SCHEMA_CHANGE, API_BREAK, FLOW_MODIFICATION, DEPENDENCY_UPDATE)
3. Content-addresses the diff via sha256 hash (IR-375-2) — never store mutable pointers
4. Stores the ChangeDocument via IDatabaseService (INSERT-ONLY — no update path after first write)
5. Emits parsed-change CloudEvent via IQueueService ONLY AFTER successful storeDocument() (DNA-8, IR-375-1)
6. Returns existing record for duplicate intake (same sha256 — idempotent no-op, DNA-7)

## Critical Iron Rules
- storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern (IR-375-1)
- change_type MUST be validated against CF-473 enum — NOT a free-form string
- diff_blob_ref MUST be sha256 content hash — NOT a mutable pointer (IR-375-2)
- actor MUST be validated against auth context from MicroserviceBase (IR-375-3)
- Duplicate intake (same sha256): return existing record — idempotent, no error

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- NEVER import DB/queue SDK directly — inject IDatabaseService and IQueueService

## Output
A single TypeScript file containing ChangeIntakeParser.
Include only the service — no controllers, no modules.
`.trim(),
};

// ── IMPACT_ANALYSIS (Family-148) ──────────────────────────────────────────

export const T376_GENESIS_PROMPT: Flow25GenesisPrompt = {
  taskType: 'T376',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-25',
  version: '1.0.0',
  promptText: `
You are generating DependencyIndexQuery for the XIIGen BFA governance engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a ChangeDocument and resolves all direct + transitive dependencies
2. Queries ES dependency graph via IDatabaseService using build_search_filter (DNA-2)
3. EVERY query MUST include tenantId filter via build_search_filter — never bypass (CF-476)
4. build_search_filter MUST skip empty entity_class and access_type fields (IR-376-1, DNA-2)
5. Empty result set (no dependencies found) returns NONE severity — NOT an error (IR-376-2)
6. Unscoped query detection (missing tenantId) returns DataProcessResult.failure — never silently pass (IR-376-3)
7. Short-TTL query cache via second IDatabaseService injection (Redis)

## Critical Iron Rules
- EVERY ES query MUST include tenantId via build_search_filter (CF-476, DNA-5)
- Empty dependency set → NONE severity (not an escalation, IR-376-2)
- Unscoped query → DataProcessResult.failure (IR-376-3)
- Cache key MUST include tenantId prefix

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- NEVER import Elasticsearch client directly — use IDatabaseService

## Output
A single TypeScript file containing DependencyIndexQuery.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T377_GENESIS_PROMPT: Flow25GenesisPrompt = {
  taskType: 'T377',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-25',
  version: '1.0.0',
  promptText: `
You are generating StaticConflictDetector for the XIIGen BFA governance engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Applies CF rule set (CF-473 through CF-479) against resolved dependencies from T376
2. Detects TRUE_CONFLICT cases where CF rules are violated
3. EVERY TRUE_CONFLICT MUST cite the specific CF rule that triggered it (IR-377-3, CF-479)
4. Stores conflict results via IDatabaseService BEFORE emitting conflict.detected event (DNA-8)
5. This service MUST complete BEFORE T378 (SemanticImpactAnalyzer) runs (IR-377-1, CF-480)
6. Static CRITICAL result ALWAYS overrides AI advisory — hardcoded precedence (IR-377-2)

## Critical Iron Rules
- EVERY TRUE_CONFLICT MUST cite specific CF rule: e.g. "CF-476: unscoped query detected"
- Static CRITICAL always overrides AI HIGH/CRITICAL — this is hardcoded, not configurable
- storeDocument() MUST be called BEFORE enqueue() (DNA-8)
- T377 is authoritative — AI is only advisory

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- NEVER import DB client directly — use IDatabaseService

## Output
A single TypeScript file containing StaticConflictDetector.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T378_GENESIS_PROMPT: Flow25GenesisPrompt = {
  taskType: 'T378',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-25',
  version: '1.0.0',
  promptText: `
You are generating SemanticImpactAnalyzer for the XIIGen BFA governance engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Runs AFTER T377 (StaticConflictDetector) completes — AI is advisory only (IR-378-1)
2. Uses IAiProvider (AI_ENGINE FABRIC — NEVER import AI SDK directly) for multi-model semantic analysis
3. Produces advisory severity score with evidence_links
4. AI HIGH/CRITICAL result WITHOUT evidence_links MUST be downgraded to LOW (CF-481)
5. Validates evidence_links reference real document IDs via IDatabaseService
6. Stores advisory result before returning (DNA-8)

## Critical Iron Rules
- AI result is ADVISORY ONLY — static CRITICAL from T377 always takes precedence (IR-378-2)
- AI HIGH/CRITICAL without evidence_links → downgraded to LOW (CF-481)
- NEVER import AI SDK directly — always inject IAiProvider via AI_ENGINE FABRIC
- T378 MUST run AFTER T377 completes (IR-378-1, CF-480)

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- NEVER import AI SDK or DB client directly — inject via fabric interfaces

## Output
A single TypeScript file containing SemanticImpactAnalyzer.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T379_GENESIS_PROMPT: Flow25GenesisPrompt = {
  taskType: 'T379',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-25',
  version: '1.0.0',
  promptText: `
You are generating SeverityAggregator for the XIIGen BFA governance engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Receives static conflict results from T377 + AI advisory results from T378
2. Merges into a single ConflictReport with final severity
3. Static CRITICAL ALWAYS overrides AI advisory — no exceptions, hardcoded
4. Stores ConflictReport via IDatabaseService BEFORE emitting conflict.severity.resolved (DNA-8)
5. Severity thresholds from FREEDOM config (IDatabaseService) — NEVER hardcoded

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- storeDocument() BEFORE enqueue() (DNA-8)

## Output
A single TypeScript file containing SeverityAggregator.
Include only the service — no controllers, no modules.
`.trim(),
};

// ── BLAST_RADIUS (Family-149) ─────────────────────────────────────────────

export const T380_GENESIS_PROMPT: Flow25GenesisPrompt = {
  taskType: 'T380',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-25',
  version: '1.0.0',
  promptText: `
You are generating BlastRadiusCalculator for the XIIGen BFA governance engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Traverses the dependency graph transitively (BFS or DFS) from the changed entity outward
2. Uses a visited set for cycle detection — NO infinite loops (CF-486)
3. On cycle detected: LOG the cycle + CONTINUE traversal — NEVER throw (IR-380-1)
4. Max traversal depth from FREEDOM config via IDatabaseService — NEVER a hardcoded integer (CF-485)
5. Report includes: direct_impacts (count), transitive_impacts (count), max_hop_reached (boolean)
6. Empty result (no transitive impacts) is valid — NOT an error
7. Stores BlastRadiusReport BEFORE attaching to ConflictReport (IR-380-2, DNA-8)

## Test coverage required
- Graph with cycle → circular_dependency_detected: true in report (CF-486)
- Graph at max depth → max_hop_reached: true
- Empty graph → direct_impacts: 0, transitive_impacts: 0, no error

## Critical Iron Rules
- Cycle detection MUST use visited set — infinite loop = build failure (CF-486)
- Max depth MUST come from FREEDOM config — never hardcoded (CF-485)
- Circular dep: log + continue — NEVER throw (IR-380-1)
- Blast radius report stored BEFORE attaching to ConflictReport (IR-380-2)

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- NEVER import DB client directly — use IDatabaseService

## Output
A single TypeScript file containing BlastRadiusCalculator.
Include only the service — no controllers, no modules.
`.trim(),
};

// ── ARBITRATION (Family-150) ──────────────────────────────────────────────

export const T381_GENESIS_PROMPT: Flow25GenesisPrompt = {
  taskType: 'T381',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-25',
  version: '1.0.0',
  promptText: `
You are generating ArbitrationStateMachine for the XIIGen BFA governance engine.

## Task
Generate a NestJS service (TypeScript) that implements an 8-state FSM:

STATES (must all be implemented):
  IDLE → EXTRACTING → DETECTING → SEVERITY_AGGREGATING →
  PENDING_RESOLUTION | SKIP_ARBITRATION →
  APPLYING_RESOLUTION → RESOLVED | REJECTED | ERROR

## ⛔ CRITICAL RULE (score 0 on violation):
storeDocument() MUST be called BEFORE enqueue() on EVERY state transition.
This is DNA-8 outbox pattern. Any state transition that emits before persisting = score 0.

## Example of correct transition:
async transitionTo(sessionId: string, newState: ArbitrationState): Promise<DataProcessResult<void>> {
  // ✅ DNA-8: persist BEFORE emit
  const persisted = await this.db.storeDocument('bfa_sessions', { session_id: sessionId, state: newState, updated_at: new Date().toISOString() });
  if (!persisted.isSuccess) return DataProcessResult.failure('PERSIST_FAILED', persisted.errorMessage!);
  // Only emit after successful persist
  await this.queue.enqueue('bfa-state-transitions', { session_id: sessionId, state: newState });
  // ✅ Schedule timeout when entering PENDING_RESOLUTION (CF-488)
  if (newState === ArbitrationState.PENDING_RESOLUTION) {
    await this.timeoutService.schedule(sessionId, this.config.timeoutDuration);
  }
  return DataProcessResult.success(undefined);
}

## Iron Rules
- storeDocument() BEFORE enqueue() on EVERY transition (CF-487, IR-381-1) — score 0 on violation
- ALL 8 states MUST be implemented
- Invalid transitions → DataProcessResult.failure — NEVER throw (IR-381-2)
- Timeout MUST be scheduled on PENDING_RESOLUTION entry (CF-488)
- LOW severity routes to SKIP_ARBITRATION — not PENDING_RESOLUTION

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing ArbitrationStateMachine.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T382_GENESIS_PROMPT: Flow25GenesisPrompt = {
  taskType: 'T382',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-25',
  version: '1.0.0',
  promptText: `
You are generating ImpactReportGenerator for the XIIGen BFA governance engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Assembles a human-readable BFA conflict/impact report from ConflictReport + blast radius
2. Renders in 3 channels: Web (HTML), CLI (terminal), Chat (markdown)
3. Report ALWAYS includes exactly 4 decision options

## ⛔ CRITICAL RULE (score 0 on violation):
FORCE_PROCEED option MUST be hidden unless actor has bfa:override permission.
Rendering FORCE_PROCEED to unauthorized actor = CF-489 violation = score 0.

## Report rules
- evidence_links MUST reference real document IDs — never fabricated (IR-382-3)
- Precedent suggestions shown ONLY when 3+ matching precedents found (CF-490)
- CRITICAL/HIGH severity: impacted_flows[] MUST have min 1 entry (IR-382-1)
- Severity badge MUST always be present
- Report stored via IDatabaseService BEFORE returning to actor (DNA-8)

## Decision options structure (when actor has bfa:override):
  [ 'REFACTOR_FLOWS', 'REJECT_CHANGE', 'COMPAT_MODE', 'FORCE_PROCEED' ]
When actor lacks bfa:override:
  [ 'REFACTOR_FLOWS', 'REJECT_CHANGE', 'COMPAT_MODE' ]  ← FORCE_PROCEED omitted

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing ImpactReportGenerator.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T383_GENESIS_PROMPT: Flow25GenesisPrompt = {
  taskType: 'T383',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-25',
  version: '1.0.0',
  promptText: `
You are generating HumanResolutionCapture for the XIIGen BFA governance engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts a human resolution decision (REFACTOR_FLOWS | REJECT_CHANGE | COMPAT_MODE | FORCE_PROCEED)
2. Atomic set-if-not-exists idempotency on session_id — duplicate decision returns existing record (IR-383-1, DNA-7, CF-493). Use IScopedMemoryService.setIfAbsent() — no separate check + write
3. Validates decision is one of 4 CF-491 options
4. FORCE_PROCEED: validates rationale >= 50 chars (CF-492, IR-383-2)
5. FORCE_PROCEED: re-validates bfa:override permission at capture time (IR-383-3) — not just at report render
6. Stores decision BEFORE emitting decision.captured event (DNA-8)

## Iron Rules
- setIfAbsent on session_id — duplicate = return existing (DNA-7, CF-493, IR-383-1). Mechanism: IScopedMemoryService.setIfAbsent() — atomic, no separate check + write
- FORCE_PROCEED rationale < 50 chars → DataProcessResult.failure (CF-492, IR-383-2)
- bfa:override re-validated at capture time — not just at render (IR-383-3)
- Decision MUST be one of 4 CF-491 values

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing HumanResolutionCapture.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T384_GENESIS_PROMPT: Flow25GenesisPrompt = {
  taskType: 'T384',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-25',
  version: '1.0.0',
  promptText: `
You are generating ResolutionApplier for the XIIGen BFA governance engine.

## Task
Generate a NestJS service (TypeScript) that executes one of 4 resolution paths:
1. REFACTOR_FLOWS → emit flow.refactor events via IQueueService (after storeDocument)
2. REJECT_CHANGE  → mark change as rejected in IDatabaseService, emit rejection event
3. COMPAT_MODE    → activate compatibility layer document in IDatabaseService, emit compat event
4. FORCE_PROCEED  → override with dual audit write (tenant log + global override log) via T385

## Iron Rules
- Resolution record MUST be stored BEFORE any downstream events (DNA-8)
- ALL 4 resolution paths MUST be implemented
- FORCE_PROCEED path MUST notify T385 (DecisionAuditTrail) for dual-log write

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing ResolutionApplier.
Include only the service — no controllers, no modules.
`.trim(),
};

// ── GOVERNANCE (Family-152) ───────────────────────────────────────────────

export const T385_GENESIS_PROMPT: Flow25GenesisPrompt = {
  taskType: 'T385',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-25',
  version: '1.0.0',
  promptText: `
You are generating DecisionAuditTrail for the XIIGen BFA governance engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Writes immutable INSERT-ONLY audit records — NO update or delete code path (IR-385-1)
2. Required fields: session_id, tenant_id, decision, actor, timestamp, rationale, affected_flows[] (IR-385-3)
3. FORCE_PROCEED: writes to BOTH tenant audit log AND global override log (IR-385-2, CF-498)
4. Audit MUST be written BEFORE arbitration session closes (CF-497)
5. Retention config from FREEDOM config — never hardcoded

## Iron Rules
- INSERT-ONLY — no update/delete path allowed (IR-385-1)
- FORCE_PROCEED → write to tenant log AND global override log (IR-385-2)
- All 7 required fields must be present in every record (IR-385-3)
- Audit written BEFORE session closes (CF-497, DNA-8)

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
- DNA-8: storeDocument() BEFORE any downstream events

## Output
A single TypeScript file containing DecisionAuditTrail.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T386_GENESIS_PROMPT: Flow25GenesisPrompt = {
  taskType: 'T386',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-25',
  version: '1.0.0',
  promptText: `
You are generating MultiTenantIsolationGate for the XIIGen BFA governance engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Gates BFA processing — tenant MUST have F1065 BFA config (IR-386-1)
   → No config: return DataProcessResult.failure immediately
2. Detects unscoped queries (missing tenantId in ES query):
   → Trigger CRITICAL alert stored via IDatabaseService (IR-386-2)
   → Emit auto-disable event via IQueueService AFTER alert stored (DNA-8)
3. Validates platform_admin role via MicroserviceBase auth context (IR-387-2)

## Iron Rules
- No F1065 BFA config → DataProcessResult.failure — no processing (IR-386-1)
- Unscoped query → CRITICAL alert + auto-disable (store THEN emit) (IR-386-2)
- platform_admin validation via MicroserviceBase — never via tenantId param

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing MultiTenantIsolationGate.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T387_GENESIS_PROMPT: Flow25GenesisPrompt = {
  taskType: 'T387',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-25',
  version: '1.0.0',
  promptText: `
You are generating CrossTenantConflictGuard for the XIIGen BFA governance engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Produces AGGREGATED cross-tenant conflict analytics — NO per-tenant rows in output (CF-501, IR-387-1)
2. Requires platform_admin role validated via MicroserviceBase auth context (IR-387-2)
3. Queries use global-scope (no tenant filter) but output is aggregated counts/rates only
4. Stores aggregated report via IDatabaseService (no tenant identifiers in stored doc)

## Iron Rules
- Output MUST be aggregated only — NO per-tenant identifiers in response (CF-501, IR-387-1)
- platform_admin role MUST be validated via MicroserviceBase auth context (IR-387-2)
- NEVER expose per-tenant data even in intermediate processing

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- DNA-8: storeDocument() before returning

## Output
A single TypeScript file containing CrossTenantConflictGuard.
Include only the service — no controllers, no modules.
`.trim(),
};

export const T388_GENESIS_PROMPT: Flow25GenesisPrompt = {
  taskType: 'T388',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-25',
  version: '1.0.0',
  promptText: `
You are generating AnalyticsEmitter for the XIIGen BFA governance engine.

## Task
Generate a NestJS service (TypeScript) that:
1. Stores analytics event via IDatabaseService BEFORE async emit (DNA-8)
2. Emits analytics event via IQueueService as async fire-and-forget (IR-388-1)
3. Analytics emit MUST NOT block session close — fire and forget, do not await result
4. Emit failure MUST NOT propagate — log error, continue

## Iron Rules
- Async fire-and-forget — NEVER block session close (IR-388-1)
- storeDocument() BEFORE async emit (DNA-8)
- Emit failure MUST be swallowed — log only, do not rethrow

## XIIGen DNA Rules (MUST follow)
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)

## Output
A single TypeScript file containing AnalyticsEmitter.
Include only the service — no controllers, no modules.
`.trim(),
};

// ── Aggregated array ───────────────────────────────────────────────────────

/** All 14 FLOW-25 genesis prompts for bulk seeding. */
export const BFA_CONFLICT_ARBITRATION_GENESIS_PROMPTS: Flow25GenesisPrompt[] = [
  T375_GENESIS_PROMPT,
  T376_GENESIS_PROMPT,
  T377_GENESIS_PROMPT,
  T378_GENESIS_PROMPT,
  T379_GENESIS_PROMPT,
  T380_GENESIS_PROMPT,
  T381_GENESIS_PROMPT,
  T382_GENESIS_PROMPT,
  T383_GENESIS_PROMPT,
  T384_GENESIS_PROMPT,
  T385_GENESIS_PROMPT,
  T386_GENESIS_PROMPT,
  T387_GENESIS_PROMPT,
  T388_GENESIS_PROMPT,
];
