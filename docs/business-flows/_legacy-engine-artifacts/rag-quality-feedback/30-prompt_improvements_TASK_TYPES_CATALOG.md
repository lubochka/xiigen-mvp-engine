# FLOW-30 TASK TYPES CATALOG
## PromptOps — Self-Learning Prompt Engineering Engine Extension
## Task Types: T445–T465 (21 contracts)
## Date: 2026-03-01

---

## TEMPLATE REFERENCE

TASK TYPE: T___
ARCHETYPE: [ORCHESTRATION | AI_GENERATION | JUDGMENT | EVENT_PROCESSING | COMPLIANCE]
ENTRY: Fires when [condition]
PURPOSE: [One-sentence purpose]
DISTINCT FROM: [closest existing task type and why this is different]
FACTORY DEPENDENCIES: F___ — resolved via CreateAsync()
FABRIC RESOLUTION: F___→FABRIC(provider)
AF CONFIGURATION: [Which AF stations are active]
BFA VALIDATION: [Cross-flow conflict checks]
MACHINE/FREEDOM: [What's fixed vs configurable]
IRON RULES: [Violations = BUILD FAILURE]
QUALITY GATES: [What AF-9 checks]

---

## T445 — Prompt Version Selection Gate

TASK TYPE: T445
ARCHETYPE: ORCHESTRATION
ENTRY: Fires at the start of every node execution when promptOpsEnabled = true
PURPOSE: Select the active prompt version for this (taskType, nodeType, tenant, budgetMode) using policy routing, with canary variant exploration at configured rate
DISTINCT FROM: T1 (Genesis entry) — T445 is a pre-execution routing gate layered on top, not a genesis trigger
FACTORY DEPENDENCIES: F1276 (IPromptVersionService), F1277 (IPromptPolicyService), F1290 (IPromptRoutingService) — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1276 → DATABASE FABRIC (ES) → prompt_versions_{tenantId}
  F1277 → DATABASE FABRIC (ES) → prompt_policies_{tenantId}
  F1290 → AI ENGINE FABRIC (Skill 07) → bandit routing engine
AF CONFIGURATION:
  AF-3 (Prompt Library): retrieves policy for context
  AF-9 (Judge): validates selected version is not deprecated
BFA VALIDATION:
  Check: no prompt_version_conflict with FLOW-25 BFA governance rules
  Check: selected version approved by IPromptScopeGuardService (F1297)
MACHINE/FREEDOM:
  MACHINE: policy lookup logic, bandit algorithm, deprecation enforcement
  FREEDOM: explorationRate (0–0.20), budgetMode preference, preferred model family
IRON RULES:
  DEPRECATED prompt version must never be selected — BUILD FAILURE
  explorationRate must not exceed 0.20 (prevents unstable production traffic)
  If no active version exists for context: fallback to global default, log warning
QUALITY GATES (AF-9):
  Selected version has valid parentVersion lineage
  Policy document exists and is not expired
  BudgetMode constraint satisfied (e.g. Fast mode cannot select Thorough-tier prompts)

---

## T446 — Node Execution with Trace Capture

TASK TYPE: T446
ARCHETYPE: AI_GENERATION
ENTRY: Fires immediately after T445 selects a prompt version; wraps actual node execution
PURPOSE: Execute node with selected prompt version and capture a complete, replayable trace: promptVersionId, ragProfileId, modelId, inputTokens, outputTokens, latencyMs, judgeScore, retrievedChunks
DISTINCT FROM: T2 (standard AI generation) — T446 adds mandatory trace envelope around any existing generation task; it is an overlay, not a replacement
FACTORY DEPENDENCIES: F1292 (IPromptTraceService), F1281 (ITraceIndexService), F1276 (IPromptVersionService) — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1292 → DATABASE FABRIC (ES) → prompt_traces_{tenantId}
  F1281 → DATABASE FABRIC (ES) → promptops_rag_{tenantId} (write path)
  F1276 → DATABASE FABRIC (ES) → prompt_versions_{tenantId} (read: confirm active)
AF CONFIGURATION:
  AF-1 (Genesis): executes underlying node generation
  AF-4 (RAG Context): records which retrieval strategy + chunks were used
  AF-11 (Feedback): writes trace to IPromptTraceService before any other action
BFA VALIDATION:
  Check: trace index is promptops_rag_{tenantId}, NOT operational_rag_{tenantId}
  Check: trace document includes all required fields (BUILD FAILURE if missing)
MACHINE/FREEDOM:
  MACHINE: required trace fields, index routing, idempotency key (traceId)
  FREEDOM: trace retention policy (days), additional custom metadata fields
IRON RULES:
  Trace MUST be written before optimization loop can fire — missing trace = optimization blocked
  traceId must be globally unique (UUID v4) — duplicate = BUILD FAILURE
  Retrieved chunks must be recorded (context efficiency tracking)
QUALITY GATES (AF-9):
  All required trace fields present and non-null
  latencyMs recorded (rejects if < 0)
  judgeScore in [0.0, 1.0] range

---

## T447 — Multi-Model Prompt Run

TASK TYPE: T447
ARCHETYPE: ORCHESTRATION
ENTRY: Fires when PromptPolicy specifies multiModelEnabled = true for this context
PURPOSE: Run same prompt version across 2+ AI models in parallel (Claude, GPT-4, Gemini) using AiDispatcher; capture per-model outputs for comparative judging
DISTINCT FROM: T5 (standard multi-model) — T447 is specifically for prompt optimization comparison, using the same promptVersionId across all models, producing structured comparison artifacts
FACTORY DEPENDENCIES: F1276 (IPromptVersionService), F1284 (IPromptCriticService), F1292 (IPromptTraceService) — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1276 → DATABASE FABRIC (ES) → prompt_versions_{tenantId}
  F1284 → AI ENGINE FABRIC (Skill 07 → AiDispatcher) → parallel multi-model
  F1292 → DATABASE FABRIC (ES) → prompt_traces_{tenantId}
AF CONFIGURATION:
  AF-5 (Multi-model): runs AiDispatcher with allSettled pattern
  AF-9 (Judge): scores each model output against IJudgeRubricService (F1279)
  AF-10 (Merge): aggregates per-model scores into comparison artifact
  AF-11 (Feedback): writes per-model trace entries
BFA VALIDATION:
  Check: all models called through IAiProvider.GenerateAsync() — never direct SDK calls
  Check: allSettled (not Promise.all) — partial failures must not block trace capture
MACHINE/FREEDOM:
  MACHINE: allSettled pattern, per-model trace capture, IAiProvider routing
  FREEDOM: which models to include, max concurrent models (2–4), timeout per model
IRON RULES:
  Direct API calls (new OpenAIClient(), new AnthropicClient()) = BUILD FAILURE
  At least 2 models required (single-model defeats the purpose)
  Each model output must generate its own trace entry
QUALITY GATES (AF-9):
  All model outputs captured (even partial/failed)
  Comparison artifact includes: modelId, score, latencyMs, tokenCost per model
  Winner selection uses rubric score, not latency alone

---

## T448 — Judge Verdict Capture & Scoring

TASK TYPE: T448
ARCHETYPE: JUDGMENT
ENTRY: Fires after T446 or T447 completes; processes judge output against rubric
PURPOSE: Score node output against IJudgeRubricService rubric, produce structured verdict (score, failureModes[], passedGates[], improvementHints[]), store verdict linked to traceId
DISTINCT FROM: T9 (standard quality gate) — T448 produces a structured PromptOps-formatted verdict that feeds the optimization loop, not just a pass/fail for deployment
FACTORY DEPENDENCIES: F1279 (IJudgeRubricService), F1292 (IPromptTraceService), F1278 (IPromptPatchService) — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1279 → DATABASE FABRIC (ES) → judge_rubrics_{tenantId}
  F1292 → DATABASE FABRIC (ES) → prompt_traces_{tenantId} (update verdict fields)
  F1278 → DATABASE FABRIC (ES) → prompt_patches_{tenantId} (write if trigger met)
AF CONFIGURATION:
  AF-9 (Judge): primary — runs structured rubric evaluation
  AF-7 (Compliance): secondary — checks DNA pattern compliance of generated output
  AF-11 (Feedback): writes structured verdict to trace
BFA VALIDATION:
  Check: rubric version matches prompt version lineage (no mismatched rubric-prompt pairs)
  Check: verdict stored in prompt_traces_{tenantId}, not operational_rag_{tenantId}
MACHINE/FREEDOM:
  MACHINE: rubric evaluation logic, verdict schema, required fields
  FREEDOM: minAcceptableScore threshold (default 0.70), which criteria are weighted higher
IRON RULES:
  Verdict must include failureModes[] even if empty (BUILD FAILURE if null)
  judgeScore must use rubric from IJudgeRubricService — hardcoded scores = BUILD FAILURE
  Verdict linked to traceId (orphaned verdicts = BUILD FAILURE)
QUALITY GATES (AF-9):
  verdict.score in [0.0, 1.0]
  failureModes[] is a typed list (not freetext blob)
  improvementHints[] present if score < 0.80

---

## T449 — Prompt Improvement Trigger Gate

TASK TYPE: T449
ARCHETYPE: ORCHESTRATION
ENTRY: Fires after T448; evaluates trigger conditions to decide if optimization sub-flow should start
PURPOSE: Gatekeeper that reads DR-201 trigger conditions and emits a StartOptimizationFlow event to QUEUE FABRIC if any condition is met; prevents optimization spam with cooldown
DISTINCT FROM: T448 (verdict capture) — T449 is the decision gate, T448 is the measurement; separated for testability and independent configurability
FACTORY DEPENDENCIES: F1277 (IPromptPolicyService), F1288 (ICanaryAssignmentService) — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1277 → DATABASE FABRIC (ES) → prompt_policies_{tenantId}
  F1288 → QUEUE FABRIC (04 → Redis Streams) → optimization trigger stream
AF CONFIGURATION:
  AF-9 (Judge): reads trigger conditions from policy
  AF-11 (Feedback): emits StartOptimizationFlow event
BFA VALIDATION:
  Check: cooldown period respected (no duplicate optimization for same promptVersionId within cooldown window)
  Check: optimization budget not exhausted for this tenant this billing period
MACHINE/FREEDOM:
  MACHINE: trigger condition logic (DR-201), event schema, cooldown enforcement
  FREEDOM: minAcceptableScore, budgetCeiling, cooldownMinutes (default 60), maxOptimizationsPerDay
IRON RULES:
  Must not emit StartOptimizationFlow if cooldown window active = silent skip + log
  Must not emit if optimization budget exhausted = Failure with reason
  Event must carry: traceId, promptVersionId, verdictSummary, tenantId
QUALITY GATES (AF-9):
  Trigger conditions evaluated against persisted policy (not hardcoded thresholds)
  Event idempotent: same traceId cannot trigger twice

---

## T450 — Evidence Pack Retrieval

TASK TYPE: T450
ARCHETYPE: ORCHESTRATION
ENTRY: Fires as Step 1 of the Optimization Sub-Flow (after T449 trigger)
PURPOSE: Retrieve evidence pack from PromptOps RAG: (a) similar failure traces for this taskType, (b) successful prompt patches that fixed similar failures, (c) prior eval suite results for this prompt version
DISTINCT FROM: T6 (standard RAG retrieval) — T450 specifically targets IPromptOpsRagService with hybrid vector+graph strategy; never touches operational RAG
FACTORY DEPENDENCIES: F1280 (IPromptOpsRagService), F1281 (ITraceIndexService), F1282 (IEvalCaseService) — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1280 → RAG FABRIC (00b → Hybrid strategy) → promptops_rag_{tenantId}
  F1281 → DATABASE FABRIC (ES) → promptops_rag_{tenantId} (trace index)
  F1282 → DATABASE FABRIC (ES) → eval_cases_{tenantId}
AF CONFIGURATION:
  AF-4 (RAG Context): hybrid retrieval — vector for local similarity, graph for global patterns
  AF-9 (Judge): validates evidence pack completeness before proceeding
BFA VALIDATION:
  Check: retrieval targets promptops_rag_{tenantId} ONLY — cross-index query = BUILD FAILURE
  Check: evidence pack includes at least 1 trace + 1 rubric reference
MACHINE/FREEDOM:
  MACHINE: hybrid retrieval strategy, index isolation, evidence schema
  FREEDOM: topK (default 5 traces, 3 patches), graphDepth (default 2 hops)
IRON RULES:
  Query must NOT include operational_rag_{tenantId} in any form = BUILD FAILURE
  Empty evidence pack must not block optimization (proceed with empty context, log warning)
QUALITY GATES (AF-9):
  Evidence pack schema valid: {similarTraces[], successfulPatches[], priorEvalResults[]}
  Each item includes: traceId or patchId, score, taskType, failureModes[]

---

## T451 — Prompt Critique Sub-Flow

TASK TYPE: T451
ARCHETYPE: AI_GENERATION
ENTRY: Fires after T450 evidence pack is ready
PURPOSE: Run IPromptCriticService across 2–3 models in parallel (Claude, GPT-4, Gemini) to produce structured critique: failureModes[], missingConstraints[], ambiguityPoints[], formattingIssues[], contextEfficiencyScore
DISTINCT FROM: T447 (multi-model execution) — T451 is specifically critique generation, not task execution; models receive (prompt+verdict+evidence), not (prompt+task)
FACTORY DEPENDENCIES: F1284 (IPromptCriticService), F1279 (IJudgeRubricService) — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1284 → AI ENGINE FABRIC (Skill 07 → AiDispatcher) → multi-model critique
  F1279 → DATABASE FABRIC (ES) → judge_rubrics_{tenantId}
AF CONFIGURATION:
  AF-5 (Multi-model): runs IPromptCriticService across models with allSettled
  AF-6 (Code Review): validates critique structure
  AF-10 (Merge): aggregates per-model critiques into unified critique document
BFA VALIDATION:
  Check: critique input includes judge verdict (not just prompt text alone)
  Check: critique references rubric version (no rubric-less critique)
MACHINE/FREEDOM:
  MACHINE: critique schema, required fields, allSettled pattern
  FREEDOM: which models participate in critique, critique temperature (default 0.3)
IRON RULES:
  Critique must produce typed arrays, not freetext — BUILD FAILURE if unstructured
  All models called via IAiProvider.GenerateAsync() — never direct SDK = BUILD FAILURE
  contextEfficiencyScore required (tracks "did we stuff unnecessary context?")
QUALITY GATES (AF-9):
  failureModes[] has at least 1 item (or explicit "no_failure" marker)
  All critique fields non-null
  Multi-model critiques merged before proceeding (not passed separately)

---

## T452 — Candidate Prompt Generation

TASK TYPE: T452
ARCHETYPE: AI_GENERATION
ENTRY: Fires after T451 critique is complete
PURPOSE: IPromptEditorService generates concrete candidate PromptVersion from merged critique: new template text, changeSummary, expectedImpact, parentVersionId (lineage preserved)
DISTINCT FROM: T451 (critique) — T452 produces the actual new prompt text; T451 only identifies problems; these are separated for independent rollback
FACTORY DEPENDENCIES: F1285 (IPromptEditorService), F1275 (IPromptTemplateService), F1276 (IPromptVersionService), F1286 (IPromptGuardService) — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1285 → AI ENGINE FABRIC (Skill 07 → primary model) → prompt editor
  F1275 → DATABASE FABRIC (ES) → prompt_templates_{tenantId} (read: base schema)
  F1276 → DATABASE FABRIC (ES) → prompt_versions_{tenantId} (write: new candidate)
  F1286 → AI ENGINE FABRIC (Skill 06 → validator) → guard check before write
AF CONFIGURATION:
  AF-1 (Genesis): IPromptEditorService generates candidate text
  AF-7 (Compliance): IPromptGuardService validates before storing
  AF-11 (Feedback): writes candidate with status=CANDIDATE to IPromptVersionService
BFA VALIDATION:
  Check: candidate text passes IPromptGuardService before storage
  Check: parentVersionId set to current active version (lineage required)
MACHINE/FREEDOM:
  MACHINE: parentVersionId linkage, status=CANDIDATE assignment, guard check order
  FREEDOM: editor model choice, max candidate text length, changeSummary style
IRON RULES:
  Candidate without parentVersionId = BUILD FAILURE (lineage is mandatory)
  IPromptGuardService MUST run before IPromptVersionService.StoreDocument() = BUILD FAILURE if skipped
  MACHINE fields from IPromptTemplateService cannot be overwritten in candidate
QUALITY GATES (AF-9):
  Candidate has: version, parentVersion, changeSummary, expectedImpact, status=CANDIDATE
  Guard cleared (no MACHINE violation, no schema break, no safety regression)
  Candidate text length within IPromptTemplateService bounds

---

## T453 — Candidate Evaluation on Eval Suite

TASK TYPE: T453
ARCHETYPE: JUDGMENT
ENTRY: Fires after T452 produces a validated candidate
PURPOSE: ICandidateEvaluatorService runs candidate against IEvalSuiteService test cases; computes quality delta, groundedness delta, cost delta vs current active version; verdict: PASS / FAIL / MARGINAL
DISTINCT FROM: T448 (verdict capture for live runs) — T453 evaluates against synthetic/harvested test suite offline, not live traffic
FACTORY DEPENDENCIES: F1283 (IEvalSuiteService), F1287 (ICandidateEvaluatorService), F1282 (IEvalCaseService) — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1283 → DATABASE FABRIC (ES) → eval_suites_{tenantId}
  F1287 → AI ENGINE FABRIC (Skill 07 → judge) → candidate evaluator
  F1282 → DATABASE FABRIC (ES) → eval_cases_{tenantId}
AF CONFIGURATION:
  AF-9 (Judge): ICandidateEvaluatorService runs eval suite
  AF-7 (Compliance): verifies eval case inputs haven't been corrupted by candidate prompt
  AF-11 (Feedback): writes eval result linked to candidateId
BFA VALIDATION:
  Check: eval suite exists for this (taskType, nodeType) before running — skip with warning if empty
  Check: eval suite has minimum passThreshold defined
MACHINE/FREEDOM:
  MACHINE: delta computation formula, PASS/FAIL/MARGINAL verdict enum, required eval fields
  FREEDOM: passThreshold (default: quality delta >= 0.05 or cost delta <= -0.10), evalCaseCount
IRON RULES:
  Eval suite with < 3 cases produces MARGINAL verdict only (insufficient evidence for PASS)
  Negative quality delta = immediate FAIL — candidate cannot proceed to canary
  All eval cases run (no early exit optimization that skips failing cases)
QUALITY GATES (AF-9):
  Verdict is one of: PASS / FAIL / MARGINAL (no freeform strings)
  Delta values all present: qualityDelta, groundednessDelta, costDelta, tokenDelta
  Eval report linked to candidateId and evalSuiteId

---

## T454 — Promotion Decision Gate

TASK TYPE: T454
ARCHETYPE: ORCHESTRATION
ENTRY: Fires after T453 with PASS or MARGINAL verdict
PURPOSE: Multi-gate promotion decision: requires eval suite PASS + IPromptGuardService clearance + (multi-judge agreement OR judge + deterministic check); stores decision in IPromotionDecisionService; emits CANARY_APPROVED or REJECTED event
DISTINCT FROM: T453 (eval) and T456 (production promotion) — T454 is the governance gate between eval and canary; three separate stages for independent auditability
FACTORY DEPENDENCIES: F1286 (IPromptGuardService), F1289 (IPromotionDecisionService), F1279 (IJudgeRubricService) — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1286 → AI ENGINE FABRIC (Skill 06 → validator) → guard validation
  F1289 → DATABASE FABRIC (ES) → promotion_decisions_{tenantId}
  F1279 → DATABASE FABRIC (ES) → judge_rubrics_{tenantId}
AF CONFIGURATION:
  AF-7 (Compliance): IPromptGuardService re-validates (second pass before canary)
  AF-9 (Judge): multi-judge agreement check (minimum 2 of 3 models agree on score)
  AF-11 (Feedback): writes promotion decision with full evidence bundle
BFA VALIDATION:
  Check: MARGINAL verdict requires human review flag (cannot auto-proceed to canary)
  Check: promotion decision includes evidence bundle (eval result + guard result + judge scores)
MACHINE/FREEDOM:
  MACHINE: multi-gate requirement, evidence bundle schema, CANARY_APPROVED event format
  FREEDOM: humanReviewRequired threshold (default MARGINAL), judgeAgreementThreshold (2-of-3)
IRON RULES:
  Single judge verdict ALONE cannot emit CANARY_APPROVED = BUILD FAILURE
  MARGINAL without humanReviewFlag = BUILD FAILURE
  Evidence bundle must be stored before event emission (no evidence = no promotion)
QUALITY GATES (AF-9):
  promotionDecision includes: candidateId, verdict, evidence[], decidedAt, decidedBy(multi-judge)
  CANARY_APPROVED event carries: candidateId, tenantCohort, rolloutPercent

---

## T455 — Canary Rollout Coordinator

TASK TYPE: T455
ARCHETYPE: ORCHESTRATION
ENTRY: Fires after CANARY_APPROVED event from T454
PURPOSE: ICanaryAssignmentService assigns deterministic tenant cohort (hash-based, not random) to receive candidate prompt version; monitors canary metrics vs control; enforces rollout percentage cap
DISTINCT FROM: T454 (promotion decision) — T455 is the operational rollout management; T454 is the governance decision; separation enables rollback without re-running governance
FACTORY DEPENDENCIES: F1288 (ICanaryAssignmentService), F1293 (IPromptMetricsService), F1290 (IPromptRoutingService) — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1288 → QUEUE FABRIC (04 → Redis Streams) → canary_assignment_stream
  F1293 → DATABASE FABRIC (ES) → prompt_metrics_{tenantId}
  F1290 → AI ENGINE FABRIC (Skill 07) → bandit routing update
AF CONFIGURATION:
  AF-11 (Feedback): writes canary assignment to IPromptTraceService for affected tenants
  AF-9 (Judge): monitors canary quality delta vs control at intervals
BFA VALIDATION:
  Check: canary cohort is deterministic (same tenantId always gets same cohort assignment)
  Check: rolloutPercent <= canaryMaxPercent from policy (default 10%)
MACHINE/FREEDOM:
  MACHINE: hash-based deterministic assignment, rolloutPercent enforcement, monitoring interval
  FREEDOM: canaryDurationHours (default 24), canaryMaxPercent (default 10%), monitoringIntervalMinutes
IRON RULES:
  Non-deterministic canary assignment = BUILD FAILURE (reproducibility required)
  rolloutPercent > 50 requires explicit override flag and audit log entry
  Canary must not exceed canaryDurationHours without a promotion or rollback decision
QUALITY GATES (AF-9):
  Canary metrics sampled at each monitoringInterval
  Regression detection: if canary qualityDelta < -0.05, emit REGRESSION_DETECTED immediately
  All canary assignments stored with tenantId, cohortId, candidateId, assignedAt

---

## T456 — Production Promotion Gate

TASK TYPE: T456
ARCHETYPE: ORCHESTRATION
ENTRY: Fires after canary period completes without regression
PURPOSE: Final gate: promote candidate to ACTIVE status, deprecate previous active version, update IPromptRoutingService reward table, write promotion audit entry; emit PROMOTED event to all affected services
DISTINCT FROM: T454 (canary approval) and T455 (canary rollout) — T456 is the irreversible production promotion; requires canary success evidence, not just eval suite pass
FACTORY DEPENDENCIES: F1276 (IPromptVersionService), F1289 (IPromotionDecisionService), F1294 (IPromptAuditService), F1290 (IPromptRoutingService) — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1276 → DATABASE FABRIC (ES) → prompt_versions_{tenantId} (status update)
  F1289 → DATABASE FABRIC (ES) → promotion_decisions_{tenantId}
  F1294 → DATABASE FABRIC (ES) → prompt_audit_{tenantId} (append-only)
  F1290 → AI ENGINE FABRIC (Skill 07) → reward table update
AF CONFIGURATION:
  AF-9 (Judge): validates canary metrics meet productionPromotionThreshold
  AF-11 (Feedback): writes final promotion record to audit log
BFA VALIDATION:
  Check: canary success evidence present in IPromotionDecisionService
  Check: previous active version set to DEPRECATED (not deleted) before new ACTIVE set
MACHINE/FREEDOM:
  MACHINE: status transition order (CANARY→ACTIVE, old→DEPRECATED), audit write, event emission
  FREEDOM: productionPromotionThreshold (default canary quality >= control - 0.02)
IRON RULES:
  ACTIVE promotion without canary success evidence = BUILD FAILURE
  Previous ACTIVE version must be DEPRECATED first (no two ACTIVE versions simultaneously)
  Audit entry is append-only — no UPDATE or DELETE on prompt_audit_{tenantId}
QUALITY GATES (AF-9):
  Promotion record: candidateId, newStatus=ACTIVE, previousActiveId, deprecatedAt, canaryEvidenceRef
  PROMOTED event emitted to all services using this (taskType, nodeType) within 5 minutes

---

## T457 — Rollback Trigger

TASK TYPE: T457
ARCHETYPE: EVENT_PROCESSING
ENTRY: Fires when REGRESSION_DETECTED event emitted by T455, or explicit admin rollback request
PURPOSE: IRollbackService immediately restores previous ACTIVE prompt version; archives failed candidate with failure evidence; updates IPromptRoutingService to remove candidate from bandit arms; emits ROLLED_BACK event
DISTINCT FROM: T456 (promotion) — T457 is the inverse; separated to enable independent testing of rollback path
FACTORY DEPENDENCIES: F1291 (IRollbackService), F1276 (IPromptVersionService), F1294 (IPromptAuditService) — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1291 → QUEUE FABRIC (04 → Redis Streams) → rollback_event_stream
  F1276 → DATABASE FABRIC (ES) → prompt_versions_{tenantId}
  F1294 → DATABASE FABRIC (ES) → prompt_audit_{tenantId} (append-only)
AF CONFIGURATION:
  AF-9 (Judge): validates rollback target exists and is in DEPRECATED status
  AF-11 (Feedback): writes rollback event to audit log
BFA VALIDATION:
  Check: rollback target version exists and was previously ACTIVE
  Check: failed candidate archived (not deleted) with regression evidence
MACHINE/FREEDOM:
  MACHINE: rollback sequence, archive (not delete) policy, audit write
  FREEDOM: rollbackNotificationChannels[], rollbackConfirmationRequired (default false for auto-rollback)
IRON RULES:
  Rollback must complete within 30 seconds — timeout = escalate + page
  Failed candidate must be archived (not deleted) = BUILD FAILURE if deleted
  Audit entry required for every rollback — no silent rollback
QUALITY GATES (AF-9):
  Rollback verified: previous version confirmed ACTIVE after rollback
  ROLLED_BACK event emitted with: fromVersionId, toVersionId, reason, rollbackAt

---

## T458 — PromptOps RAG Ingestion

TASK TYPE: T458
ARCHETYPE: EVENT_PROCESSING
ENTRY: Fires after any trace is written (T446 completes) and after any patch stored (T452 completes)
PURPOSE: Index trace + patch into IPromptOpsRagService for future retrieval; extract structured relationships (taskType→failureMode→fix→promptVersion) into graph layer
DISTINCT FROM: T6 (standard RAG indexing) — T458 targets promptops_rag_{tenantId} exclusively with graph relationship extraction, not just vector embedding
FACTORY DEPENDENCIES: F1280 (IPromptOpsRagService), F1281 (ITraceIndexService), F1278 (IPromptPatchService) — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1280 → RAG FABRIC (00b → Graph strategy) → promptops_rag_{tenantId} (write: graph + vector)
  F1281 → DATABASE FABRIC (ES) → promptops_rag_{tenantId} (write: trace index)
  F1278 → DATABASE FABRIC (ES) → prompt_patches_{tenantId} (read: patch data)
AF CONFIGURATION:
  AF-4 (RAG Context): extracts graph relationships from trace+patch
  AF-11 (Feedback): confirms ingestion success, updates trace with ragIngested=true flag
BFA VALIDATION:
  Check: write target is promptops_rag_{tenantId} — any write to operational_rag_{tenantId} = BUILD FAILURE
  Check: graph relationships use typed edge types: (TASK_TYPE, HAS_FAILURE, FAILURE_MODE), (FAILURE_MODE, FIXED_BY, PROMPT_PATCH)
MACHINE/FREEDOM:
  MACHINE: graph schema, edge types, index namespace enforcement
  FREEDOM: vectorEmbeddingModel, graphMaxDepth (default 3), retentionDays
IRON RULES:
  operational_rag index contamination = BUILD FAILURE — separate namespaces are non-negotiable
  Graph relationships must use typed edge types (no freeform relationship labels)
QUALITY GATES (AF-9):
  traceId/patchId confirmed in promptops_rag index after ingestion
  Graph edges created with typed labels and valid entity references

---

## T459 — Eval Suite Harvest from Failure

TASK TYPE: T459
ARCHETYPE: EVENT_PROCESSING
ENTRY: Fires when T448 verdict has failureModes[] non-empty and judgeScore < harvestThreshold
PURPOSE: Extract new IEvalCase from the failed trace: inputs, expectedConstraints from rubric, scoringRubricRef, failure labels; append to IEvalSuiteService for (taskType, nodeType); cap suite size at maxCases
DISTINCT FROM: T458 (RAG ingestion) — T459 focuses on building regression test assets; T458 focuses on retrieval memory
FACTORY DEPENDENCIES: F1282 (IEvalCaseService), F1283 (IEvalSuiteService), F1292 (IPromptTraceService) — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1282 → DATABASE FABRIC (ES) → eval_cases_{tenantId}
  F1283 → DATABASE FABRIC (ES) → eval_suites_{tenantId}
  F1292 → DATABASE FABRIC (ES) → prompt_traces_{tenantId} (read: failed trace)
AF CONFIGURATION:
  AF-4 (RAG Context): retrieves rubric to build expectedConstraints
  AF-9 (Judge): validates harvested case is non-duplicate before appending
  AF-11 (Feedback): confirms case added, updates eval suite lastUpdated
BFA VALIDATION:
  Check: harvested case does not contain PII (sensitivityClass check before harvest)
  Check: duplicate detection — same inputs+failureModes not stored twice
MACHINE/FREEDOM:
  MACHINE: deduplication logic, PII guard, eval case schema
  FREEDOM: harvestThreshold (default 0.65), maxCasesPerSuite (default 50), dedupeWindowDays
IRON RULES:
  PII in eval case = BUILD FAILURE — sensitivityClass check mandatory before harvest
  Suite size cap enforced: oldest cases pruned when maxCasesPerSuite exceeded
QUALITY GATES (AF-9):
  Harvested case schema: {caseId, inputs, expectedConstraints, scoringRubricRef, failureLabels[], harvestedAt}
  Deduplication confirmed before storage

---

## T460 — Tenant Prompt Override Application

TASK TYPE: T460
ARCHETYPE: ORCHESTRATION
ENTRY: Fires when tenant updates ITenantPromptProfileService with a FREEDOM-layer override
PURPOSE: Apply tenant FREEDOM overrides (style, domain hints, verbosity) to active prompt version; validate override fields against IPromptScopeGuardService before applying; store merged prompt view in tenant profile
DISTINCT FROM: T445 (version selection) — T460 is the override application step; T445 selects the base version; separation keeps MACHINE/FREEDOM boundary auditable
FACTORY DEPENDENCIES: F1295 (ITenantPromptProfileService), F1297 (IPromptScopeGuardService), F1276 (IPromptVersionService) — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1295 → DATABASE FABRIC (ES) → tenant_prompt_profiles_{tenantId}
  F1297 → CORE FABRIC (Skill 01) → scope guard (in-process validation)
  F1276 → DATABASE FABRIC (ES) → prompt_versions_{tenantId} (read: base version)
AF CONFIGURATION:
  AF-7 (Compliance): IPromptScopeGuardService validates each override field
  AF-9 (Judge): confirms merged prompt is still schema-valid after override
BFA VALIDATION:
  Check: no MACHINE field appears in override payload — each field validated individually
  Check: merged prompt passes schema validation from IPromptTemplateService
MACHINE/FREEDOM:
  MACHINE: which fields are FREEDOM vs MACHINE (from IPromptTemplateService definition)
  FREEDOM: all fields in ITenantPromptProfileService.freedomFields[]
IRON RULES:
  Any MACHINE field in override payload = BUILD FAILURE (immediate reject, no partial apply)
  Override must be applied atomically — partial override stored = BUILD FAILURE
  Merged prompt view stored per tenant, not modified on base version
QUALITY GATES (AF-9):
  All override fields classified as FREEDOM before application
  Merged prompt view schema valid
  Override stored with: tenantId, appliedFields[], baseVersionId, appliedAt

---

## T461 — Cross-Tenant Learning Aggregation

TASK TYPE: T461
ARCHETYPE: AI_GENERATION
ENTRY: Fires on schedule (configurable, default daily) via FlowOrchestrator cron trigger
PURPOSE: ICrossTenantLearningService aggregates PromptPatches from non-sensitive traces across tenants; produces global pattern summaries; proposes global prompt version candidates for review
DISTINCT FROM: T458 (per-tenant RAG ingestion) — T461 is the cross-tenant aggregation producing global insights, not per-tenant traces
FACTORY DEPENDENCIES: F1296 (ICrossTenantLearningService), F1280 (IPromptOpsRagService), F1284 (IPromptCriticService) — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1296 → DATABASE FABRIC (ES) → cross_tenant_learnings (global, no tenantId scope)
  F1280 → RAG FABRIC (00b → Graph strategy) → global_promptops_rag (separate from per-tenant)
  F1284 → AI ENGINE FABRIC (Skill 07) → pattern summarization
AF CONFIGURATION:
  AF-4 (RAG Context): retrieves patches from non-sensitive tenant traces
  AF-5 (Multi-model): multi-model pattern summarization
  AF-11 (Feedback): stores global patterns in cross_tenant_learnings index
BFA VALIDATION:
  Check: only sensitivityClass="public" or "internal-aggregated" traces included
  Check: global candidate proposals require platform-admin review before promotion (not auto-promote)
MACHINE/FREEDOM:
  MACHINE: sensitivityClass gate, global-vs-tenant scope, platform-admin review requirement
  FREEDOM: aggregationSchedule (cron), minTenantsForGlobalPromosal (default 3), learningWindowDays
IRON RULES:
  Any trace with sensitivityClass="private" or "sensitive" = excluded from aggregation = BUILD FAILURE if included
  Global candidates must go through platform-admin approval before any tenant sees them
QUALITY GATES (AF-9):
  Aggregation report: patternCount, tenantsContributing, topFailureModes[], candidateGlobalVersions[]
  Each global candidate linked to evidence: minTenantsCount, avgQualityDelta

---

## T462 — Prompt Policy Router

TASK TYPE: T462
ARCHETYPE: ORCHESTRATION
ENTRY: Fires when IPromptRoutingService receives a routing request from T445
PURPOSE: Thompson sampling bandit selects prompt version for (taskType, nodeType, tenant, budgetMode); updates reward table after each selection; enforces 3-variant cap; auto-prunes underperformers
DISTINCT FROM: T445 (selection gate) — T462 is the routing algorithm implementation; T445 is the calling gate; separation allows routing algorithm to be swapped without changing selection logic
FACTORY DEPENDENCIES: F1290 (IPromptRoutingService), F1293 (IPromptMetricsService) — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1290 → AI ENGINE FABRIC (Skill 07) → bandit engine
  F1293 → DATABASE FABRIC (ES) → prompt_metrics_{tenantId} (reward history)
AF CONFIGURATION:
  AF-9 (Judge): validates reward table is up-to-date before selection
  AF-11 (Feedback): updates reward table after node execution result fed back
BFA VALIDATION:
  Check: no more than 3 active variants per (taskType, nodeType, tenant, budgetMode)
  Check: deprecated versions never returned as routing targets
MACHINE/FREEDOM:
  MACHINE: Thompson sampling algorithm, 3-variant cap, reward table update formula
  FREEDOM: explorationRate (default 0.10), rewardDecayFactor, pruneThreshold (default: 20 consecutive losses)
IRON RULES:
  More than 3 active variants = auto-prune lowest scorer, emit VARIANT_PRUNED event
  DEPRECATED version selected by bandit = BUILD FAILURE (stale reward table)
QUALITY GATES (AF-9):
  Selected version confirmed ACTIVE or CANARY (not CANDIDATE or DEPRECATED)
  Reward table updated within last maxStalenessMinutes (default 5)

---

## T463 — Prompt Metrics Snapshot

TASK TYPE: T463
ARCHETYPE: EVENT_PROCESSING
ENTRY: Fires on schedule (default every 15 minutes) and after every promotion/rollback event
PURPOSE: Aggregate per-run metrics into IPromptMetricsService: rolling quality average, cost trend, latency p50/p95/p99, model distribution, per-version comparison — stored per (taskType, promptVersion, tenant, budgetMode)
DISTINCT FROM: T446 (per-run trace) — T463 produces aggregated time-series, not individual run data; separate for different retention and query patterns
FACTORY DEPENDENCIES: F1293 (IPromptMetricsService), F1292 (IPromptTraceService) — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1293 → DATABASE FABRIC (ES) → prompt_metrics_{tenantId}
  F1292 → DATABASE FABRIC (ES) → prompt_traces_{tenantId} (read: raw traces)
AF CONFIGURATION:
  AF-11 (Feedback): writes aggregated metrics snapshot
BFA VALIDATION:
  Check: metrics snapshot linked to specific time window (no unbounded aggregations)
  Check: per-version breakdown present (not collapsed across versions)
MACHINE/FREEDOM:
  MACHINE: aggregation window, required metric fields, per-version breakdown
  FREEDOM: snapshotIntervalMinutes (default 15), retentionDays (default 90)
IRON RULES:
  Unbounded aggregation query (no time window) = BUILD FAILURE
  Metrics must be per-version (not collapsed) to support version comparison
QUALITY GATES (AF-9):
  Snapshot: windowStart, windowEnd, perVersion[{versionId, avgQuality, avgCost, p95Latency, sampleCount}]

---

## T464 — Prompt Audit Log Entry

TASK TYPE: T464
ARCHETYPE: EVENT_PROCESSING
ENTRY: Fires after every state transition: CANDIDATE→CANARY, CANARY→ACTIVE, ACTIVE→DEPRECATED, any rollback, any policy change, any MACHINE field access attempt
PURPOSE: Write append-only audit entry to IPromptAuditService; entry includes: eventType, actorId (human or system), targetId, before/after state, evidenceRef, timestamp
DISTINCT FROM: T463 (metrics) — T464 is for governance/compliance audit trail, not operational monitoring
FACTORY DEPENDENCIES: F1294 (IPromptAuditService) — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1294 → DATABASE FABRIC (ES) → prompt_audit_{tenantId} (append-only, no UPDATE/DELETE)
AF CONFIGURATION:
  AF-11 (Feedback): writes audit entry
BFA VALIDATION:
  Check: no UPDATE or DELETE operations on prompt_audit_{tenantId} — append-only enforced at fabric level
  Check: every promotion, rollback, policy change has a corresponding audit entry
MACHINE/FREEDOM:
  MACHINE: append-only enforcement, required fields, eventType enum
  FREEDOM: retentionPolicy (default 7 years for compliance), auditNotificationChannels
IRON RULES:
  UPDATE or DELETE on prompt_audit = BUILD FAILURE (immutability non-negotiable)
  Audit entry without actorId = BUILD FAILURE (anonymous actions prohibited)
QUALITY GATES (AF-9):
  Entry: {auditId, eventType, actorId, targetId, beforeState, afterState, evidenceRef, timestamp}
  eventType from enum: [CANDIDATE_CREATED, CANARY_STARTED, PROMOTED, ROLLBACK, POLICY_CHANGED, MACHINE_ACCESS_BLOCKED]

---

## T465 — Prompt Injection Guard

TASK TYPE: T465
ARCHETYPE: COMPLIANCE
ENTRY: Fires before every use of retrieved context in prompt construction (after T450 evidence retrieval and in T451 critique)
PURPOSE: Validate that retrieved content from PromptOps RAG does not contain embedded instructions that could hijack the optimization flow; mark retrieved chunks as [DATA] not [INSTRUCTION]; reject chunks with control-plane override patterns
DISTINCT FROM: AF-8 (security scan) — T465 is specifically prompt-injection prevention in the PromptOps meta-learning loop; AF-8 handles generated code security
FACTORY DEPENDENCIES: F1286 (IPromptGuardService), F1280 (IPromptOpsRagService) — resolved via CreateAsync()
FABRIC RESOLUTION:
  F1286 → AI ENGINE FABRIC (Skill 06 → validator) → injection pattern detection
  F1280 → RAG FABRIC (00b) → promptops_rag_{tenantId} (read: retrieved chunks)
AF CONFIGURATION:
  AF-7 (Compliance): primary — IPromptGuardService scans each chunk
  AF-8 (Security): secondary — escalate if injection attempt detected
BFA VALIDATION:
  Check: all retrieved chunks marked with role="data" before injected into prompt
  Check: detected injection patterns trigger SECURITY_ALERT event, NOT silent skip
MACHINE/FREEDOM:
  MACHINE: role="data" marking, injection pattern list, escalation policy
  FREEDOM: injectionSensitivity level (default: HIGH), customBlockPatterns[]
IRON RULES:
  Injecting retrieved content without [DATA] delimiter = BUILD FAILURE
  Detected injection pattern silently skipped (not escalated) = BUILD FAILURE
  Any chunk containing control-plane keywords (e.g. "PROMOTE", "OVERRIDE MACHINE") = blocked + SECURITY_ALERT
QUALITY GATES (AF-9):
  All chunks marked role="data" before prompt construction
  Injection scan completed for all retrieved chunks (not sampled)
  SECURITY_ALERT emitted for any detected pattern (audit entry required)

---

## TASK TYPE SUMMARY (FLOW-30)

| Task Type | Name | Archetype | Key Factories |
|-----------|------|-----------|---------------|
| T445 | Prompt Version Selection Gate | ORCHESTRATION | F1276, F1277, F1290 |
| T446 | Node Execution with Trace Capture | AI_GENERATION | F1292, F1281, F1276 |
| T447 | Multi-Model Prompt Run | ORCHESTRATION | F1276, F1284, F1292 |
| T448 | Judge Verdict Capture & Scoring | JUDGMENT | F1279, F1292, F1278 |
| T449 | Prompt Improvement Trigger Gate | ORCHESTRATION | F1277, F1288 |
| T450 | Evidence Pack Retrieval | ORCHESTRATION | F1280, F1281, F1282 |
| T451 | Prompt Critique Sub-Flow | AI_GENERATION | F1284, F1279 |
| T452 | Candidate Prompt Generation | AI_GENERATION | F1285, F1275, F1276, F1286 |
| T453 | Candidate Evaluation on Eval Suite | JUDGMENT | F1283, F1287, F1282 |
| T454 | Promotion Decision Gate | ORCHESTRATION | F1286, F1289, F1279 |
| T455 | Canary Rollout Coordinator | ORCHESTRATION | F1288, F1293, F1290 |
| T456 | Production Promotion Gate | ORCHESTRATION | F1276, F1289, F1294, F1290 |
| T457 | Rollback Trigger | EVENT_PROCESSING | F1291, F1276, F1294 |
| T458 | PromptOps RAG Ingestion | EVENT_PROCESSING | F1280, F1281, F1278 |
| T459 | Eval Suite Harvest from Failure | EVENT_PROCESSING | F1282, F1283, F1292 |
| T460 | Tenant Prompt Override Application | ORCHESTRATION | F1295, F1297, F1276 |
| T461 | Cross-Tenant Learning Aggregation | AI_GENERATION | F1296, F1280, F1284 |
| T462 | Prompt Policy Router | ORCHESTRATION | F1290, F1293 |
| T463 | Prompt Metrics Snapshot | EVENT_PROCESSING | F1293, F1292 |
| T464 | Prompt Audit Log Entry | EVENT_PROCESSING | F1294 |
| T465 | Prompt Injection Guard | COMPLIANCE | F1286, F1280 |

Total FLOW-30: 21 task types (T445–T465), 3 templates (90–92)

---

## TEMPLATES (FLOW-30)

Template 90: Standard PromptOps Execution Wrapper (T445→T446→T448→T449)
Template 91: Optimization Sub-Flow (T450→T451→T452→T453→T454→T455→T456)
Template 92: Multi-Tenant PromptOps (T460→T461 with T465 guard)
