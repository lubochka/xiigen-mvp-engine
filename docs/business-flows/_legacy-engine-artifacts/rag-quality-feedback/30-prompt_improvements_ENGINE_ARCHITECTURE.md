# FLOW-30 ENGINE ARCHITECTURE
## PromptOps — Self-Learning Prompt Engineering Engine Extension
## Date: 2026-03-01 | Status: FLOW-30 SPECIFICATION

---

## STARTING NUMBERS (FLOW-30)
> Assumes FLOW-26 through FLOW-29 consumed F1075–F1274, T389–T444, Families 154–173
> FLOW-30 begins at: F1275 / Family 175 / T445

```
Factory:         F1275    Family: 175
Task Type:       T445
BFA Rule:        CF-570
Stress Test:     ST-340
Skill:           SK-261
Design Decision: DD-265
Design Record:   DR-200
Template:        90
```

---

## FLOW-30 DOMAIN OVERVIEW

FLOW-30 adds **PromptOps** as a first-class engine capability. Every node execution in XIIGen
now produces a replayable trace. When judge scores fall below threshold or user feedback is
negative, an optimization sub-flow fires: it retrieves similar failure evidence from the
PromptOps RAG, runs a Critic→Editor→Guard pipeline, generates a candidate prompt version,
tests it on harvested eval suites, and canary-promotes it only if multiple gates pass.

Prompts are **immutable versioned assets** — the engine never silently mutates production
prompts. Promotion requires: eval suite pass + canary traffic gate + multi-judge agreement
(or judge + deterministic checks). Tenants can modify FREEDOM parts (style, domain hints)
but never MACHINE parts (schemas, safety rules, output format contracts).

---

## LAYER 0 — FABRIC USAGE MAP (FLOW-30)

All FLOW-30 services use ONLY existing fabric interfaces. No new fabrics are introduced.

| Fabric | Skills | How FLOW-30 uses it |
|--------|--------|---------------------|
| DATABASE FABRIC | Skill 05 | Prompt versions, traces, eval suites, policies — all in Elasticsearch |
| QUEUE FABRIC | Skill 04 | Optimization sub-flow trigger events, canary result events |
| AI ENGINE FABRIC | Skills 06/07 | Critic, Editor, Guard, Evaluator — all via IAiProvider.GenerateAsync() |
| RAG FABRIC | Skills 00a/00b | PromptOps RAG (meta-memory): hybrid vector+graph over traces/patches |
| CORE FABRIC | Skill 01 | MicroserviceBase inherited by every FLOW-30 service |
| FLOW ENGINE FABRIC | Skills 08/09 | Optimization loop as a JSON DAG in FlowOrchestrator |

---

## LAYER 1 — FACTORY REGISTRY (FLOW-30)

### FAMILY 175 — Prompt Asset Control Plane
> DATABASE FABRIC (Skill 05 → Elasticsearch provider)

| Factory | Interface | Fabric Resolution | Purpose |
|---------|-----------|-------------------|---------|
| F1275 | IPromptTemplateService | DATABASE FABRIC (ES) | Immutable prompt templates: taskType, nodeType, inputSchema, outputSchema, guardrails, templateText |
| F1276 | IPromptVersionService | DATABASE FABRIC (ES) | Versioned prompt revisions with lineage: version, parentVersion, status, evalResultsSummary |
| F1277 | IPromptPolicyService | DATABASE FABRIC (ES) | Routing policies: (taskType,nodeType,tenant,budgetMode) → allowed versions + exploration weights |
| F1278 | IPromptPatchService | DATABASE FABRIC (ES) | Optimization patches with provenance: traceId, judgeVerdict, failureModes, suggestedEdits |
| F1279 | IJudgeRubricService | DATABASE FABRIC (ES) | Versioned evaluation rubrics: criteria, scoring scale, fail conditions, required evidence |

Resolution contract:
  IPromptTemplateService  → CreateAsync(ctx) → DATABASE FABRIC → ES index: prompt_templates_{tenantId}
  IPromptVersionService   → CreateAsync(ctx) → DATABASE FABRIC → ES index: prompt_versions_{tenantId}
  IPromptPolicyService    → CreateAsync(ctx) → DATABASE FABRIC → ES index: prompt_policies_{tenantId}
  IPromptPatchService     → CreateAsync(ctx) → DATABASE FABRIC → ES index: prompt_patches_{tenantId}
  IJudgeRubricService     → CreateAsync(ctx) → DATABASE FABRIC → ES index: judge_rubrics_{tenantId}

DNA compliance: All documents stored as Dictionary<string,object> via ParseDocument (DNA-1).
BuildSearchFilter skips empty fields (DNA-2). All responses return DataProcessResult<T> (DNA-3).
Scope isolation: tenantId on every query (DNA-5).

---

### FAMILY 176 — PromptOps RAG (Meta-Memory)
> RAG FABRIC (Skill 00b) + DATABASE FABRIC (Skill 05)
> CRITICAL: Separate index space from Operational RAG — no cross-contamination

| Factory | Interface | Fabric Resolution | Purpose |
|---------|-----------|-------------------|---------|
| F1280 | IPromptOpsRagService | RAG FABRIC (00b → Hybrid strategy) | Hybrid vector+graph retrieval over prompt traces, patches, failure summaries |
| F1281 | ITraceIndexService | DATABASE FABRIC (ES) | Indexes run traces for PromptOps learning: promptVersion, retrievalMode, model, cost, judgeResult |
| F1282 | IEvalCaseService | DATABASE FABRIC (ES) | Eval cases harvested from failures: inputs, expectedConstraints, scoringRubricRef, failureLabels |
| F1283 | IEvalSuiteService | DATABASE FABRIC (ES) | Eval suites per (taskType,nodeType,tenant): cases[], passThresholds, lastRunResult |

PromptOps RAG retrieval strategy:
  IRagService.SearchAsync(query, strategy: "Hybrid") →
    vector-search: "similar trace / similar failure explanation"
    graph-search:  "common failure patterns across traces for this taskType"
    merge: local similarity UNION global pattern summaries

IRON RULE: promptops_rag_{tenantId} MUST NOT overlap with operational_rag_{tenantId}.
Any query crossing index boundaries = BUILD FAILURE.

---

### FAMILY 177 — Prompt Optimization Engine
> AI ENGINE FABRIC (Skills 06/07 → IAiProvider + AiDispatcher)

| Factory | Interface | Fabric Resolution | Purpose |
|---------|-----------|-------------------|---------|
| F1284 | IPromptCriticService | AI ENGINE FABRIC (Skill 07 → multi-model) | Analyzes judge verdict + trace → failureModes[], missingConstraints[], ambiguityPoints[] |
| F1285 | IPromptEditorService | AI ENGINE FABRIC (Skill 07 → primary model) | Generates concrete prompt edits from critique → candidate PromptVersion text + changeSummary |
| F1286 | IPromptGuardService | AI ENGINE FABRIC (Skill 06 → validator) | Validates candidate against PromptPolicy: no MACHINE violation, no schema break, no safety regression |
| F1287 | ICandidateEvaluatorService | AI ENGINE FABRIC (Skill 07 → judge) | Runs candidate on EvalSuite → quality delta, groundedness delta, cost delta vs active version |

AF Station Mapping for Optimization Sub-Flow:
  AF-3 (Prompt Library) → retrieves IPromptVersionService (F1276) → active version for task
  AF-4 (RAG Context)    → retrieves IPromptOpsRagService (F1280) → similar failures + successful patches
  AF-5 (Multi-model)    → runs IPromptCriticService (F1284) across Claude+GPT-4+Gemini in parallel
  AF-6 (Code Review)    → IPromptEditorService (F1285) proposes edits
  AF-7 (Compliance)     → IPromptGuardService (F1286) validates no MACHINE violation
  AF-9 (Judge)          → ICandidateEvaluatorService (F1287) scores quality delta
  AF-11 (Feedback)      → IPromptPatchService (F1278) stores patch with full provenance

---

### FAMILY 178 — Canary Promotion Pipeline
> QUEUE FABRIC (Skill 04) + DATABASE FABRIC (Skill 05)

| Factory | Interface | Fabric Resolution | Purpose |
|---------|-----------|-------------------|---------|
| F1288 | ICanaryAssignmentService | QUEUE FABRIC (04 → Redis Streams) | Deterministic tenant cohort assignment for canary rollout |
| F1289 | IPromotionDecisionService | DATABASE FABRIC (ES) | Stores promotion verdicts: candidateId, verdict, evidence, promotedBy, promotedAt |
| F1290 | IPromptRoutingService | AI ENGINE FABRIC (Skill 07) | Bandit-based explore/exploit routing: Thompson sampling over prompt version reward history |
| F1291 | IRollbackService | QUEUE FABRIC (04 → Redis Streams) | Triggers rollback event on canary regression; archives failed candidate |

Promotion Ladder (FLOW-30):
  CANDIDATE → [eval suite pass] → CANARY → [canary traffic gate] → ACTIVE → [deprecated on next]
  Any step can → REJECTED (archived with failure reason + evidence bundle)

IRON RULES:
  CANDIDATE requires: parent version lineage + eval suite assigned
  CANARY requires: eval suite pass + IPromptGuardService clearance
  ACTIVE requires: canary pass + multi-judge agreement OR judge + deterministic schema check
  Single-model judge verdict ALONE cannot promote to ACTIVE = BUILD FAILURE

---

### FAMILY 179 — PromptOps Observability
> DATABASE FABRIC (Skill 05 → Elasticsearch)

| Factory | Interface | Fabric Resolution | Purpose |
|---------|-----------|-------------------|---------|
| F1292 | IPromptTraceService | DATABASE FABRIC (ES) | Per-node trace: promptVersionId, ragProfileId, modelId, tokens, latencyMs, judgeScore |
| F1293 | IPromptMetricsService | DATABASE FABRIC (ES) | Aggregate metrics per (taskType, promptVersion, tenant, budgetMode) |
| F1294 | IPromptAuditService | DATABASE FABRIC (ES) | Immutable audit log: all promotions, rollbacks, policy changes — append-only |

---

### FAMILY 180 — Multi-Tenant PromptOps Safety
> CORE FABRIC (Skill 01) + DATABASE FABRIC (Skill 05)

| Factory | Interface | Fabric Resolution | Purpose |
|---------|-----------|-------------------|---------|
| F1295 | ITenantPromptProfileService | DATABASE FABRIC (ES) | Tenant-specific FREEDOM overrides: style, verbosity, domain hints |
| F1296 | ICrossTenantLearningService | DATABASE FABRIC (ES) | Global learning aggregation from non-sensitive traces across tenants |
| F1297 | IPromptScopeGuardService | CORE FABRIC (Skill 01) | Enforces MACHINE/FREEDOM boundary — MACHINE parts are read-only per tenant |

Multi-tenant safety contract:
  FREEDOM (tenant can change): style, verbosity, domain hints, language, tone
  MACHINE (immutable per tenant): outputSchema, inputSchema, guardrails, safety constraints
  IPromptScopeGuardService.ValidateOverride(tenantId, field, value) → DataProcessResult<bool>
    returns Failure if field is MACHINE-classified

---

## FAMILY SUMMARY (FLOW-30)

| Family | Name | Factories | Primary Fabric |
|--------|------|-----------|----------------|
| 175 | Prompt Asset Control Plane | F1275–F1279 | DATABASE FABRIC (ES) |
| 176 | PromptOps RAG (Meta-Memory) | F1280–F1283 | RAG FABRIC + DATABASE FABRIC |
| 177 | Prompt Optimization Engine | F1284–F1287 | AI ENGINE FABRIC |
| 178 | Canary Promotion Pipeline | F1288–F1291 | QUEUE FABRIC + DATABASE FABRIC |
| 179 | PromptOps Observability | F1292–F1294 | DATABASE FABRIC (ES) |
| 180 | Multi-Tenant PromptOps Safety | F1295–F1297 | CORE FABRIC + DATABASE FABRIC |

Total FLOW-30: 23 factories (F1275–F1297) across 6 families (175–180)

---

## DESIGN DECISIONS (FLOW-30)

DD-265: PromptOps RAG MUST be separate from Operational RAG
  Separate ES index namespaces; IPromptScopeGuardService validates index prefix before every write.
  Cross-contamination risks: prompt injection, PII leakage, retrieval poisoning.

DD-266: Promotion requires multi-gate (not single judge)
  ACTIVE promotion: eval suite pass AND canary gate AND (multi-judge agreement OR judge+deterministic check).
  Single-gate is insufficient — LLM-as-judge has documented bias/inconsistency.

DD-267: Prompt Versions are immutable after creation
  No UPDATE on text field. Only status transitions: candidate→canary→active→deprecated.
  IPromptVersionService.UpdateAsync() rejects text changes with DataProcessResult.Failure.

DD-268: Bandit routing for explore/exploit (cap: 3 active variants per context)
  IPromptRoutingService uses Thompson sampling over (promptVersionId, qualityReward, costReward).
  Avoids prompt variant sprawl. Auto-prune candidates failing eval suites.

DD-269: Cross-tenant learning requires non-sensitive gate
  ICrossTenantLearningService only aggregates traces where sensitivityClass = "public" or "internal-aggregated".

---

## DESIGN RECORDS (FLOW-30)

DR-200: ES Index Structure
  prompt_templates_{tenantId}    prompt_versions_{tenantId}    prompt_policies_{tenantId}
  prompt_patches_{tenantId}      judge_rubrics_{tenantId}      prompt_traces_{tenantId}
  prompt_metrics_{tenantId}      prompt_audit_{tenantId}       promptops_rag_{tenantId}
  eval_cases_{tenantId}          eval_suites_{tenantId}        canary_assignments_{tenantId}
  promotion_decisions_{tenantId} tenant_prompt_profiles_{tenantId}

DR-201: Optimization Sub-Flow Trigger Conditions
  judgeScore < policy.minAcceptableScore (default 0.70)
  userFeedback = "negative" AND feedbackText.length > 0
  costPerToken > policy.budgetCeiling AND qualityScore < minAcceptableScore + 0.10
  consecutiveSubthresholdRuns >= 3

DR-202: Backward Compatibility
  FLOW-30 is opt-in overlay: promptOpsEnabled: true in flow config.
  F1–F1274, T1–T444, CF-1–CF-569, SK-1–SK-260 — all unchanged.

---

## BACKWARD COMPATIBILITY STATEMENT

All previously defined artifacts (F1–F1274, T1–T444, CF-1–CF-569, SK-1–SK-260) are unchanged.
FLOW-30 is additive only. PromptOps activates per (taskType, nodeType) via config flag.
