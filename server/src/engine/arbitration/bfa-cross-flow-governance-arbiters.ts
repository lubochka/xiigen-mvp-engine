/**
 * FLOW-25 Archetype Arbiters — 12 concern-specific arbiters (2 per archetype).
 *
 * These extend BASE_ARBITERS for FLOW-25 BFA governance task types.
 * Usage: new ArbiterRegistry([...BASE_ARBITERS, ...BFA_CONFLICT_ARBITRATION_ARCHETYPE_ARBITERS])
 *
 * Archetypes covered:
 *   INGESTION:      ingestion::immutability, ingestion::schema-validation
 *   IMPACT_ANALYSIS: impact_analysis::scope-isolation, impact_analysis::ordering-gate
 *   BLAST_RADIUS:   blast_radius::graph-traversal, blast_radius::report-completeness
 *   ARBITRATION:    arbitration::state-machine-integrity (criticalRules: IR-381-1, CF-487)
 *                   arbitration::decision-validation
 *   SYNTHESIS:      synthesis::report-safety (criticalRules: CF-489)
 *                   synthesis::decision-completeness
 *   GOVERNANCE:     governance::immutable-audit, governance::tenant-safety
 *
 * Score-0 critical rules:
 *   IR-381-1 / CF-487: persist-before-emit on state machine transitions
 *   CF-489: FORCE_PROCEED rendered without permission check
 *   CF-492: FORCE_PROCEED without rationale (decision-validation)
 */

import { ArbiterDefinition } from './arbiter-registry';

// ── INGESTION arbiters ─────────────────────────────────────────────────────

const ingestionImmutability: ArbiterDefinition = {
  id: 'ingestion::immutability',
  concern: 'Ingestion insert-only + outbox pattern (CF-487, IR-375-1)',
  minPassScore: 70,
  weight: 0.2,
  promptTemplate: `
You are an INGESTION archetype arbiter for XIIGen — BFA Cross-Flow Governance (FLOW-25).

Check the TypeScript NestJS service below against ingestion immutability rules.

CHECKS:
1. storeDocument() called BEFORE any queue.enqueue() — DNA-8 outbox pattern (IR-375-1)
   → If enqueue() appears before storeDocument(): score 0 immediately
2. Persisted document is insert-only — no update path after first write
   → Look for updateDocument(), update(), or PUT calls on same index
3. Content-addressed blob reference — sha256 hash present, not mutable pointer
   → diff_blob_ref or similar field must be sha256, never a URL or mutable ref
4. Unit test covers: duplicate intake returns existing record (idempotent, DNA-7)

Respond ONLY in JSON:
{
  "score": <0-100>,
  "passed": <score >= 70>,
  "notes": ["IR-375-1: enqueue() called at line 42 BEFORE storeDocument() at line 55 — score 0"],
  "suggestions": ["Move storeDocument() to line 40, before enqueue()"]
}

BUNDLE: {{CODE}}
`.trim(),
};

const ingestionSchemaValidation: ArbiterDefinition = {
  id: 'ingestion::schema-validation',
  concern: 'Ingestion canonical schema validation (CF-473, IR-375-2, IR-375-3)',
  minPassScore: 70,
  weight: 0.2,
  promptTemplate: `
You are an INGESTION schema validation arbiter for XIIGen — BFA Cross-Flow Governance (FLOW-25).

Check the TypeScript NestJS service below against ingestion schema rules.

CHECKS:
1. Canonical output document validated against JSON schema before emit
   → Look for schema validation call or explicit field checking before storeDocument()
2. change_type must be one of 4 valid CF-473 values — hardcoded enum, NOT free-form string
   → Check for: SCHEMA_CHANGE | API_BREAK | FLOW_MODIFICATION | DEPENDENCY_UPDATE
   → Free-form string for change_type: FAIL
3. actor field validated against auth context from MicroserviceBase (IR-375-3)
   → Actor must come from this.getAuthContext() or equivalent MicroserviceBase method
4. diff_blob_ref uses sha256 content hash (IR-375-2)
   → Look for crypto.createHash('sha256') or similar

Respond ONLY in JSON:
{
  "score": <0-100>,
  "passed": <score >= 70>,
  "notes": ["CF-473: change_type accepts free-form string instead of enum — schema violation"],
  "suggestions": ["Define enum ChangeType { SCHEMA_CHANGE, API_BREAK, FLOW_MODIFICATION, DEPENDENCY_UPDATE } and validate against it"]
}

BUNDLE: {{CODE}}
`.trim(),
};

// ── IMPACT_ANALYSIS arbiters ───────────────────────────────────────────────

const impactAnalysisScopeIsolation: ArbiterDefinition = {
  id: 'impact_analysis::scope-isolation',
  concern: 'Impact analysis tenant scope enforcement (CF-476, DNA-5, IR-376-2, IR-376-3)',
  minPassScore: 70,
  weight: 0.2,
  promptTemplate: `
You are an IMPACT_ANALYSIS scope isolation arbiter for XIIGen — BFA Cross-Flow Governance (FLOW-25).

Check the TypeScript NestJS service below against impact analysis scope rules.

CHECKS:
1. EVERY ES query includes tenantId filter via build_search_filter (CF-476, DNA-5)
   → Any searchDocuments() call without tenantId in filter: FAIL
   → tenantId must come from AsyncLocalStorage/CLS, never a parameter
2. build_search_filter skips empty entity_class and access_type fields (IR-376-1, DNA-2)
   → If entity_class or access_type can be undefined/null and they're still included in query: FAIL
3. Empty blast radius candidate set returns NONE severity — does NOT escalate (IR-376-2)
   → Look for empty array check returning NONE, not throwing or escalating
4. Unit test covers: query without tenantId is blocked with DataProcessResult failure (IR-376-3)

Respond ONLY in JSON:
{
  "score": <0-100>,
  "passed": <score >= 70>,
  "notes": ["CF-476: searchDocuments() at line 33 does not include tenantId in filter"],
  "suggestions": ["Add tenant scope to filter: build_search_filter({ tenantId: ctx.tenantId, entity_class: ... })"]
}

BUNDLE: {{CODE}}
`.trim(),
};

const impactAnalysisOrderingGate: ArbiterDefinition = {
  id: 'impact_analysis::ordering-gate',
  concern:
    'Impact analysis ordering + AI advisory precedence (CF-479, CF-480, CF-481, IR-377-1, IR-377-2, IR-378-2)',
  minPassScore: 70,
  weight: 0.2,
  promptTemplate: `
You are an IMPACT_ANALYSIS ordering gate arbiter for XIIGen — BFA Cross-Flow Governance (FLOW-25).

Check the TypeScript NestJS service below against impact analysis ordering rules.

CHECKS:
1. T377 (static) completes BEFORE T378 (semantic) starts (IR-377-1, CF-480)
   → If AI analysis is called before or concurrently with static detection: FAIL
2. Static CRITICAL result overrides AI advisory regardless of AI severity (IR-377-2, IR-378-2)
   → If AI HIGH/CRITICAL can override static CRITICAL: FAIL
3. Every TRUE_CONFLICT cites the specific CF rule that triggered it (IR-377-3, CF-479)
   → Look for CF rule citation (e.g., "CF-476") in conflict result
4. AI HIGH/CRITICAL without evidence_links is downgraded to LOW (CF-481)
   → If AI returns HIGH/CRITICAL with no evidence_links and it's not downgraded: FAIL

Respond ONLY in JSON:
{
  "score": <0-100>,
  "passed": <score >= 70>,
  "notes": ["CF-479: TRUE_CONFLICT result at line 67 does not cite specific CF rule"],
  "suggestions": ["Add cfRule field to conflict result: { ...conflict, cfRule: 'CF-476' }"]
}

BUNDLE: {{CODE}}
`.trim(),
};

// ── BLAST_RADIUS arbiters ──────────────────────────────────────────────────

const blastRadiusGraphTraversal: ArbiterDefinition = {
  id: 'blast_radius::graph-traversal',
  concern: 'Blast radius graph traversal safety (CF-485, CF-486, IR-380-1, IR-380-2)',
  minPassScore: 70,
  weight: 0.2,
  promptTemplate: `
You are a BLAST_RADIUS graph traversal arbiter for XIIGen — BFA Cross-Flow Governance (FLOW-25).

Check the TypeScript NestJS service below against blast radius traversal rules.

CHECKS:
1. Circular dependency detection uses visited set — no infinite loops (CF-486)
   → Look for a Set or Map tracking visited nodes during traversal
   → Recursive traversal without visited set: FAIL
2. Traversal stops at FREEDOM config max depth — not hardcoded (CF-485)
   → Any hardcoded depth integer (e.g., maxDepth = 10): FAIL
   → Must be read from config/IDatabaseService
3. Circular dependency detected = log + continue, NOT throw (IR-380-1)
   → If cycle detection throws an error instead of logging+continuing: FAIL
4. Blast radius report attached to ConflictReport before assembly (IR-380-2)
   → storeDocument() for blast radius report before it's attached
5. Unit test: graph with cycle → report contains circular_dependency_detected: true

Respond ONLY in JSON:
{
  "score": <0-100>,
  "passed": <score >= 70>,
  "notes": ["CF-485: maxDepth = 5 is hardcoded at line 22 — must come from FREEDOM config"],
  "suggestions": ["Read maxDepth from config: const { maxDepth } = await this.configReader.getBlastRadiusConfig()"]
}

BUNDLE: {{CODE}}
`.trim(),
};

const blastRadiusReportCompleteness: ArbiterDefinition = {
  id: 'blast_radius::report-completeness',
  concern: 'Blast radius report completeness (direct_impacts, transitive_impacts, max_hop_reached)',
  minPassScore: 70,
  weight: 0.15,
  promptTemplate: `
You are a BLAST_RADIUS report completeness arbiter for XIIGen — BFA Cross-Flow Governance (FLOW-25).

Check the TypeScript NestJS service below against blast radius report rules.

CHECKS:
1. Report includes direct_impacts count, transitive_impacts count, max_hop_reached
   → All 3 fields must be present in the blast radius report object
2. Hop depth ≤ FREEDOM config (not hardcoded integer)
   → Already checked in graph-traversal arbiter, but verify in report building too
3. Empty result (no transitive impacts) is valid — not an error
   → Look for incorrect error return on empty result

Respond ONLY in JSON:
{
  "score": <0-100>,
  "passed": <score >= 70>,
  "notes": ["Report missing max_hop_reached field — not populated when depth limit is reached"],
  "suggestions": ["Add max_hop_reached: depthLimitHit to the blast radius report object"]
}

BUNDLE: {{CODE}}
`.trim(),
};

// ── ARBITRATION arbiters ───────────────────────────────────────────────────

const arbitrationStateMachineIntegrity: ArbiterDefinition = {
  id: 'arbitration::state-machine-integrity',
  concern:
    'Arbitration FSM persist-before-emit on every transition (CF-487, IR-381-1, IR-381-2, CF-488)',
  minPassScore: 70,
  weight: 0.25,
  promptTemplate: `
You are an ARBITRATION state machine integrity arbiter for XIIGen — BFA Cross-Flow Governance (FLOW-25).

Check the TypeScript NestJS service below against arbitration FSM rules.

⛔ CRITICAL RULES (score 0 on violation):
- IR-381-1 / CF-487: storeDocument() MUST be called BEFORE enqueue() on EVERY state transition
  → Any transition that calls enqueue() (or queue.emit/publish) before storeDocument(): score 0

CHECKS:
1. State machine implements all 8 valid states:
   IDLE → EXTRACTING → DETECTING → SEVERITY_AGGREGATING →
   PENDING_RESOLUTION | SKIP_ARBITRATION → APPLYING_RESOLUTION → RESOLVED | REJECTED | ERROR
2. Persist-before-emit on EVERY transition (DNA-8, CF-487, IR-381-1) — score 0 if violated
3. Invalid transitions return DataProcessResult.failure — NOT throw (IR-381-2)
4. Timeout scheduled on PENDING_RESOLUTION entry (CF-488)

Respond ONLY in JSON:
{
  "score": <0-100>,
  "passed": <score >= 70>,
  "notes": ["IR-381-1 CRITICAL: transitionTo() calls queue.enqueue() at line 45 BEFORE storeDocument() at line 52 — score 0"],
  "suggestions": ["Move storeDocument() to before queue.enqueue() in every transition method"]
}

criticalRules: ["IR-381-1", "CF-487"]

BUNDLE: {{CODE}}
`.trim(),
};

const arbitrationDecisionValidation: ArbiterDefinition = {
  id: 'arbitration::decision-validation',
  concern:
    'Arbitration decision idempotency + FORCE_PROCEED guards (DNA-7, CF-491, CF-492, CF-493, IR-383-1, IR-383-2, IR-383-3)',
  minPassScore: 70,
  weight: 0.2,
  promptTemplate: `
You are an ARBITRATION decision validation arbiter for XIIGen — BFA Cross-Flow Governance (FLOW-25).

Check the TypeScript NestJS service below against arbitration decision rules.

CHECKS:
1. Atomic set-if-not-exists on session_id prevents duplicate decision (DNA-7, CF-493, IR-383-1) — setIfAbsent returns false on duplicate, returns existing record
   → Duplicate decision must return existing record, not create a new one
2. FORCE_PROCEED requires rationale min 50 chars (CF-492, IR-383-2)
   → If rationale.length < 50 for FORCE_PROCEED: DataProcessResult.failure
3. FORCE_PROCEED requires bfa:override permission re-validated at capture time (IR-383-3)
   → Permission must be re-checked in the capture method, not only at report render
4. Decision value must be one of 4 CF-491 options:
   REFACTOR_FLOWS | REJECT_CHANGE | COMPAT_MODE | FORCE_PROCEED
5. Unit test: duplicate decision returns success with existing decision (idempotent no-op)

Respond ONLY in JSON:
{
  "score": <0-100>,
  "passed": <score >= 70>,
  "notes": ["CF-492: FORCE_PROCEED accepts rationale of 10 chars — minimum 50 required"],
  "suggestions": ["Add check: if (decision === 'FORCE_PROCEED' && rationale.length < 50) return DataProcessResult.failure(...)"]
}

BUNDLE: {{CODE}}
`.trim(),
};

// ── SYNTHESIS arbiters ─────────────────────────────────────────────────────

const synthesisReportSafety: ArbiterDefinition = {
  id: 'synthesis::report-safety',
  concern:
    'Synthesis report FORCE_PROCEED permission gate + evidence integrity (CF-489, CF-490, IR-382-2, IR-382-3)',
  minPassScore: 70,
  weight: 0.25,
  promptTemplate: `
You are a SYNTHESIS report safety arbiter for XIIGen — BFA Cross-Flow Governance (FLOW-25).

Check the TypeScript NestJS service below against synthesis safety rules.

⛔ CRITICAL RULE (score 0 on violation):
- CF-489: FORCE_PROCEED option MUST be hidden unless actor has bfa:override permission
  → If FORCE_PROCEED appears in options[] without checking actor.permissions: score 0

CHECKS:
1. FORCE_PROCEED option hidden unless actor has bfa:override permission (CF-489, IR-382-2)
   → CRITICAL: renders all 4 options without permission check = score 0
2. Evidence links reference real document IDs — not fabricated (IR-382-3)
   → Look for evidence link validation against real ES document IDs
3. Precedent suggestion shown ONLY when 3+ matching precedents found (CF-490)
   → If precedent shown with < 3 matches: FAIL
4. Report renders correctly in all 3 channels: Web, CLI, Chat

Respond ONLY in JSON:
{
  "score": <0-100>,
  "passed": <score >= 70>,
  "notes": ["CF-489 CRITICAL: FORCE_PROCEED rendered in options[] without checking bfa:override permission — score 0"],
  "suggestions": ["Add permission check: const options = actor.permissions?.includes('bfa:override') ? [..., 'FORCE_PROCEED'] : [...]"]
}

criticalRules: ["CF-489"]

BUNDLE: {{CODE}}
`.trim(),
};

const synthesisDecisionCompleteness: ArbiterDefinition = {
  id: 'synthesis::decision-completeness',
  concern: 'Synthesis report always includes 4 decision options + mandatory fields (IR-382-1)',
  minPassScore: 70,
  weight: 0.15,
  promptTemplate: `
You are a SYNTHESIS decision completeness arbiter for XIIGen — BFA Cross-Flow Governance (FLOW-25).

Check the TypeScript NestJS service below against synthesis completeness rules.

CHECKS:
1. Report always includes exactly 4 decision options (when actor has bfa:override)
   → [ 'REFACTOR_FLOWS', 'REJECT_CHANGE', 'COMPAT_MODE', 'FORCE_PROCEED' ]
   → Without bfa:override: exactly 3 options (FORCE_PROCEED omitted)
2. impacted_flows[] has min 1 entry for CRITICAL/HIGH severity (IR-382-1)
   → CRITICAL/HIGH report with empty impacted_flows[]: FAIL
3. Severity badge present in report
4. Report assembled ONLY after ConflictReport is available

Respond ONLY in JSON:
{
  "score": <0-100>,
  "passed": <score >= 70>,
  "notes": ["IR-382-1: CRITICAL severity report has empty impacted_flows[] — minimum 1 entry required"],
  "suggestions": ["Ensure impacted_flows is populated from ConflictReport.affectedFlows before assembling report"]
}

BUNDLE: {{CODE}}
`.trim(),
};

// ── GOVERNANCE arbiters ────────────────────────────────────────────────────

const governanceImmutableAudit: ArbiterDefinition = {
  id: 'governance::immutable-audit',
  concern:
    'Governance insert-only audit + FORCE_PROCEED dual-log (CF-497, CF-498, IR-385-1, IR-385-2, IR-385-3)',
  minPassScore: 70,
  weight: 0.2,
  promptTemplate: `
You are a GOVERNANCE immutable audit arbiter for XIIGen — BFA Cross-Flow Governance (FLOW-25).

Check the TypeScript NestJS service below against governance audit rules.

CHECKS:
1. Audit records are INSERT-only — no UPDATE or DELETE path (IR-385-1)
   → Any updateDocument(), deleteDocument(), or similar on the audit index: FAIL
2. FORCE_PROCEED written to BOTH tenant log AND global override log (IR-385-2, CF-498)
   → If FORCE_PROCEED only writes to one index: FAIL
3. Audit record contains all required fields: session_id, tenant_id, decision, actor,
   timestamp, rationale, affected_flows[] (IR-385-3)
4. Audit written BEFORE arbitration session closes (CF-497)
   → Audit storeDocument() must happen before session close event

Respond ONLY in JSON:
{
  "score": <0-100>,
  "passed": <score >= 70>,
  "notes": ["IR-385-2: FORCE_PROCEED only writes to tenant log — missing global override log write"],
  "suggestions": ["Add second storeDocument() for global override log: await this.db.storeDocument('bfa-global-overrides', auditRecord)"]
}

BUNDLE: {{CODE}}
`.trim(),
};

const governanceTenantSafety: ArbiterDefinition = {
  id: 'governance::tenant-safety',
  concern:
    'Governance tenant config gate + cross-tenant safety + async analytics (CF-501, IR-386-1, IR-386-2, IR-387-1, IR-387-2, IR-388-1)',
  minPassScore: 70,
  weight: 0.2,
  promptTemplate: `
You are a GOVERNANCE tenant safety arbiter for XIIGen — BFA Cross-Flow Governance (FLOW-25).

Check the TypeScript NestJS service below against governance tenant safety rules.

CHECKS:
1. BFA does not process unconfigured tenant (F1065 config required, IR-386-1)
   → Look for config check at start of processing: if (!config) return failure
2. Unscoped query detection triggers CRITICAL alert + auto-disable (IR-386-2)
   → Alert stored BEFORE auto-disable event emitted (DNA-8)
3. Cross-tenant guard output is aggregated only — no per-tenant rows (CF-501, IR-387-1)
   → Any per-tenant identifier in cross-tenant output: FAIL
4. platform_admin role validated via MicroserviceBase auth context (IR-387-2)
   → platform_admin must come from this.getAuthContext(), not a parameter
5. Analytics emit is async fire-and-forget — does NOT block session close (IR-388-1)
   → Any awaited analytics emit that could block the main flow: FAIL

Respond ONLY in JSON:
{
  "score": <0-100>,
  "passed": <score >= 70>,
  "notes": ["IR-388-1: analytics emit is awaited at line 88 — this blocks session close"],
  "suggestions": ["Remove await from analytics emit: this.analytics.emit(event).catch(err => this.logger.error(err))"]
}

BUNDLE: {{CODE}}
`.trim(),
};

// ── Exported array ─────────────────────────────────────────────────────────

/**
 * All 12 FLOW-25 archetype arbiters.
 * Extend BASE_ARBITERS with these for FLOW-25 arbitration:
 *   new ArbiterRegistry([...BASE_ARBITERS, ...BFA_CONFLICT_ARBITRATION_ARCHETYPE_ARBITERS])
 */
export const BFA_CONFLICT_ARBITRATION_ARCHETYPE_ARBITERS: ArbiterDefinition[] = [
  // INGESTION (2)
  ingestionImmutability,
  ingestionSchemaValidation,
  // IMPACT_ANALYSIS (2)
  impactAnalysisScopeIsolation,
  impactAnalysisOrderingGate,
  // BLAST_RADIUS (2)
  blastRadiusGraphTraversal,
  blastRadiusReportCompleteness,
  // ARBITRATION (2)
  arbitrationStateMachineIntegrity,
  arbitrationDecisionValidation,
  // SYNTHESIS (2)
  synthesisReportSafety,
  synthesisDecisionCompleteness,
  // GOVERNANCE (2)
  governanceImmutableAudit,
  governanceTenantSafety,
];

/** Arbiters by archetype for selective registry construction. */
export const BFA_CONFLICT_ARBITRATION_INGESTION_ARBITERS = [
  ingestionImmutability,
  ingestionSchemaValidation,
];
export const BFA_CONFLICT_ARBITRATION_IMPACT_ANALYSIS_ARBITERS = [
  impactAnalysisScopeIsolation,
  impactAnalysisOrderingGate,
];
export const BFA_CONFLICT_ARBITRATION_BLAST_RADIUS_ARBITERS = [
  blastRadiusGraphTraversal,
  blastRadiusReportCompleteness,
];
export const BFA_CONFLICT_ARBITRATION_ARBITRATION_ARBITERS = [
  arbitrationStateMachineIntegrity,
  arbitrationDecisionValidation,
];
export const BFA_CONFLICT_ARBITRATION_SYNTHESIS_ARBITERS = [
  synthesisReportSafety,
  synthesisDecisionCompleteness,
];
export const BFA_CONFLICT_ARBITRATION_GOVERNANCE_ARBITERS = [
  governanceImmutableAudit,
  governanceTenantSafety,
];
