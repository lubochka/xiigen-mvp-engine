# FLOW-30 BFA STRESS TEST
## PromptOps — Self-Learning Prompt Engineering Engine Extension
## BFA Rules: CF-570 to CF-594 (25 rules)
## Stress Tests: ST-340 to ST-354 (15 tests)
## Date: 2026-03-01

---

## BFA CONFLICT RULES (FLOW-30)

### CF-570 — PromptOps RAG Cross-Index Contamination
SEVERITY: CRITICAL
APPLIES_TO: Any service querying IRagService or IDatabaseService in FLOW-30 context
RULE: Any query that references both promptops_rag_{tenantId} AND operational_rag_{tenantId}
      in the same search request = BUILD FAILURE
DETECTION: Static analysis — scan for multi-index RAG queries; AI semantic scan for
           implicit cross-contamination via shared embedding spaces
RESOLUTION: Split into two separate queries. Never merge promptops and operational contexts.
BACKWARD_COMPAT: Does not conflict with FLOW-01–FLOW-29 (they use operational_rag only).

### CF-571 — Single-Judge Auto-Promotion
SEVERITY: CRITICAL
APPLIES_TO: T454 (Promotion Decision Gate), T456 (Production Promotion Gate)
RULE: A single model judge verdict ALONE cannot promote a candidate to CANARY or ACTIVE.
      CANARY requires: eval PASS + guard clearance. ACTIVE additionally requires: canary success.
DETECTION: Static — IPromotionDecisionService.StoreDocument() call must be preceded by
           evidence bundle with at minimum: evalSuiteResult + guardResult
AI_SCAN: Detects if judge score alone is used as sole gate in promotion code path
RESOLUTION: Add missing gates. Evidence bundle is mandatory before promotion event.
BUILD_FAILURE_CODE: SINGLE_JUDGE_PROMOTION

### CF-572 — Prompt Version Text Mutation
SEVERITY: CRITICAL
APPLIES_TO: Any call to IPromptVersionService.UpdateDocument() or UpdateAsync()
RULE: Text field of a PromptVersion cannot be updated after initial store.
      Only status field transitions are allowed via UpdateStatus().
DETECTION: Static — scan for UpdateDocument() calls on prompt_versions index that include
           "text" field in the update payload
RESOLUTION: Create a new PromptVersion (candidate) instead of mutating existing.
BUILD_FAILURE_CODE: VERSION_TEXT_MUTATED

### CF-573 — Missing parentVersion Lineage
SEVERITY: HIGH
APPLIES_TO: T452 (Candidate Prompt Generation)
RULE: Every PromptVersion document must have a non-null parentVersion field.
      Orphaned candidates (no parent) cannot proceed through promotion pipeline.
DETECTION: Static — scan for StoreDocument() on prompt_versions without parentVersion in payload;
           AI scan for implicit orphaning through conditional parentVersion assignment
RESOLUTION: Always set parentVersion = currentActiveVersion at candidate creation time.
BUILD_FAILURE_CODE: ORPHANED_PROMPT_VERSION

### CF-574 — Audit Log Mutation Attempt
SEVERITY: CRITICAL
APPLIES_TO: Any write to prompt_audit_{tenantId} index
RULE: prompt_audit_{tenantId} is append-only. UpdateDocument() and DeleteDocument() calls
      against this index = BUILD FAILURE
DETECTION: Static — whitelist of allowed operations: StoreDocument only
AI_SCAN: Detects soft-delete patterns (status=deleted field in audit documents)
RESOLUTION: Audit entries are permanent. If correction needed, add corrective entry.
BUILD_FAILURE_CODE: AUDIT_LOG_MUTATED

### CF-575 — Prompt Injection Silent Skip
SEVERITY: CRITICAL
APPLIES_TO: T465 (Prompt Injection Guard), SK-268
RULE: When IPromptGuardService detects an injection pattern in retrieved content,
      it MUST emit a SECURITY_ALERT event. Silent skip (log-only) = BUILD FAILURE.
DETECTION: Static — scan for injection detection code paths without EnqueueAsync(security_alerts)
AI_SCAN: Semantic detection of "catch and continue" patterns in guard code
RESOLUTION: Every detected injection must emit event AND return Failure (never continue).
BUILD_FAILURE_CODE: INJECTION_SILENTLY_SKIPPED

### CF-576 — Raw Chunk Injection Without DATA Marker
SEVERITY: HIGH
APPLIES_TO: Any prompt construction using PromptOps RAG retrieved content
RULE: Retrieved content from IPromptOpsRagService must be marked role="data" and wrapped
      in <retrieved_context> delimiter before injection into any prompt.
DETECTION: Static — scan for prompt string concatenation that directly embeds chunk["text"]
           without role assignment and delimiter wrapping
RESOLUTION: Apply SK-268 pattern: mark chunk["role"]="data", wrap in delimiter.
BUILD_FAILURE_CODE: RAW_CHUNK_INJECTION

### CF-577 — PII in Eval Suite Harvest
SEVERITY: CRITICAL
APPLIES_TO: T459 (Eval Suite Harvest from Failure)
RULE: Traces with sensitivityClass="private" or "sensitive" must be excluded from eval harvest.
      Eval cases containing PII = BUILD FAILURE.
DETECTION: Static — sensitivityClass check must appear BEFORE StoreDocument() in T459
AI_SCAN: Semantic detection of PII patterns (names, emails, phone numbers) in eval case content
RESOLUTION: Add sensitivityClass gate as first step in harvest flow. Return Failure, not exception.
BUILD_FAILURE_CODE: PII_IN_EVAL_SUITE

### CF-578 — Variant Cap Violation (>3 active per context)
SEVERITY: HIGH
APPLIES_TO: T462 (Prompt Policy Router), IPromptRoutingService (F1290)
RULE: Maximum 3 active prompt variants per (taskType, nodeType, tenant, budgetMode) at any time.
      Adding a 4th without pruning a loser = BUILD FAILURE.
DETECTION: Static — check for variant count validation before AddVariant() call;
           AI scan for variant list management that doesn't enforce cap
RESOLUTION: Apply SK-266 auto-prune pattern before adding new variant.
BUILD_FAILURE_CODE: VARIANT_CAP_EXCEEDED

### CF-579 — Exploration Rate Exceeding Cap
SEVERITY: MEDIUM
APPLIES_TO: T445 (Prompt Version Selection Gate), T462 (Prompt Policy Router)
RULE: explorationRate config value must not exceed 0.20 (20% canary traffic).
      Values > 0.20 in policy documents = BUILD FAILURE.
DETECTION: Static — scan IPromptPolicyService documents for explorationRate > 0.20
RESOLUTION: Cap at 0.20 in policy schema validator. Policy with > 0.20 rejected at store.
BUILD_FAILURE_CODE: EXPLORATION_RATE_EXCESSIVE

### CF-580 — MACHINE Field Override by Tenant
SEVERITY: CRITICAL
APPLIES_TO: T460 (Tenant Prompt Override Application), SK-267
RULE: Tenant override requests containing any MACHINE-classified field must be rejected entirely.
      Partial apply (skip MACHINE field, apply FREEDOM fields) = BUILD FAILURE.
DETECTION: Static — IPromptScopeGuardService.ValidateOverride() must be called BEFORE any
           ITenantPromptProfileService.StoreDocument() call in T460
AI_SCAN: Detects conditional MACHINE field bypass logic
RESOLUTION: Reject entire override request if any MACHINE field present. Return Failure with field list.
BUILD_FAILURE_CODE: MACHINE_FIELD_OVERRIDE_ATTEMPTED

### CF-581 — Global Candidate Auto-Promotion Without Admin Review
SEVERITY: CRITICAL
APPLIES_TO: T461 (Cross-Tenant Learning Aggregation)
RULE: Any candidate proposed by ICrossTenantLearningService must have status="pending-admin-review".
      Auto-promotion to CANARY or ACTIVE for global candidates = BUILD FAILURE.
DETECTION: Static — ICrossTenantLearningService output must always set status="pending-admin-review"
AI_SCAN: Semantic check for direct promotion calls following cross-tenant aggregation
RESOLUTION: Add platform-admin approval gate before any status transition for global candidates.
BUILD_FAILURE_CODE: GLOBAL_CANDIDATE_AUTO_PROMOTED

### CF-582 — Cross-Tenant Trace Leakage in Aggregation
SEVERITY: CRITICAL
APPLIES_TO: T461 (Cross-Tenant Learning Aggregation), SK-267
RULE: ICrossTenantLearningService must only include traces with sensitivityClass="public"
      or "internal-aggregated". Any private/sensitive trace in cross-tenant aggregation = BUILD FAILURE.
DETECTION: Static — sensitivityClass filter must appear as first filter in aggregation query
AI_SCAN: Check for aggregation queries without explicit sensitivityClass constraint
RESOLUTION: Add sensitivityClass="public","internal-aggregated" as mandatory filter in ICrossTenantLearningService.
BUILD_FAILURE_CODE: CROSS_TENANT_TRACE_LEAKAGE

### CF-583 — Canary Non-Deterministic Assignment
SEVERITY: HIGH
APPLIES_TO: T455 (Canary Rollout Coordinator), SK-265
RULE: Tenant cohort assignment for canary MUST be deterministic (hash-based).
      Random assignment (Guid.NewGuid(), Random.NextDouble()) = BUILD FAILURE.
DETECTION: Static — scan for non-deterministic random calls in ICanaryAssignmentService
RESOLUTION: Use HashToCohort(tenantId, candidateId, buckets) pattern from SK-265.
BUILD_FAILURE_CODE: NON_DETERMINISTIC_CANARY

### CF-584 — Eval Suite Bypass (< 3 cases PASS verdict)
SEVERITY: HIGH
APPLIES_TO: T453 (Candidate Evaluation on Eval Suite)
RULE: Eval suite with fewer than 3 cases cannot produce PASS verdict.
      Minimum evidence threshold: MARGINAL if < 3 cases, PASS if >= 3.
      Bypassing threshold to force PASS = BUILD FAILURE.
DETECTION: Static — scan for eval result overrides that set verdict=PASS without case count check
RESOLUTION: Add case count gate in ICandidateEvaluatorService before verdict assignment.
BUILD_FAILURE_CODE: INSUFFICIENT_EVAL_EVIDENCE

### CF-585 — Canary Rollout Exceeding 50% Without Override Flag
SEVERITY: HIGH
APPLIES_TO: T455 (Canary Rollout Coordinator)
RULE: rolloutPercent > 50 requires explicit override flag AND audit entry.
      Exceeding 50% without override = BUILD FAILURE.
DETECTION: Static — rolloutPercent > 50 check in ICanaryAssignmentService
RESOLUTION: Add override flag validation and mandatory audit entry write before high-percent rollout.
BUILD_FAILURE_CODE: UNSAFE_CANARY_ROLLOUT

### CF-586 — Rollback Timeout Violation
SEVERITY: HIGH
APPLIES_TO: T457 (Rollback Trigger)
RULE: Rollback must complete within 30 seconds of REGRESSION_DETECTED event.
      Timeout without completion = escalate + page on-call.
DETECTION: Static — ensure IRollbackService has timeout enforcement (SLA: 30s)
AI_SCAN: Detects missing timeout handling in rollback orchestration
RESOLUTION: Add CancellationToken with 30s timeout. On timeout: escalate event, do not silently fail.
BUILD_FAILURE_CODE: ROLLBACK_TIMEOUT

### CF-587 — Failed Candidate Deletion (Not Archive)
SEVERITY: HIGH
APPLIES_TO: T457 (Rollback Trigger), T454 (Promotion Decision Gate)
RULE: Failed or rejected prompt candidates must be ARCHIVED (status=rejected/deprecated),
      never deleted from prompt_versions_{tenantId}.
DETECTION: Static — scan for DeleteDocument() calls on prompt_versions index in failure paths
RESOLUTION: Change status to "rejected" via UpdateStatus(). Never delete prompt versions.
BUILD_FAILURE_CODE: FAILED_CANDIDATE_DELETED

### CF-588 — Missing Trace Before Optimization Fire
SEVERITY: HIGH
APPLIES_TO: T449 (Prompt Improvement Trigger Gate)
RULE: Optimization sub-flow cannot start if trace for the triggering run is not persisted
      in IPromptTraceService. Missing trace = optimization blocked (not failed).
DETECTION: Static — T449 must check IPromptTraceService for traceId before emitting event
RESOLUTION: Add trace existence check in T449. If missing: log warning, block optimization, emit TRACE_MISSING alert.
BUILD_FAILURE_CODE: OPTIMIZATION_WITHOUT_TRACE

### CF-589 — Duplicate Optimization for Same Trace
SEVERITY: MEDIUM
APPLIES_TO: T449 (Prompt Improvement Trigger Gate)
RULE: The same traceId cannot trigger more than one optimization sub-flow.
      Idempotency key on StartOptimizationFlow event = traceId.
DETECTION: Static — QUEUE FABRIC consumer must deduplicate by traceId within cooldown window
RESOLUTION: Use Redis SETNX with TTL = cooldownMinutes as idempotency gate before EnqueueAsync.
BUILD_FAILURE_CODE: DUPLICATE_OPTIMIZATION_TRIGGER

### CF-590 — Critique Without Typed Schema Output
SEVERITY: HIGH
APPLIES_TO: T451 (Prompt Critique Sub-Flow), SK-269
RULE: IPromptCriticService output must conform to CritiqueSchema (typed arrays).
      Freetext critique output cannot feed T452 editor.
DETECTION: AI_SCAN — checks if IPromptCriticService output validation enforces CritiqueSchema
RESOLUTION: Add JSON schema validation on IPromptCriticService output before merging critiques.
BUILD_FAILURE_CODE: UNSTRUCTURED_CRITIQUE

### CF-591 — Context Efficiency Metric Missing
SEVERITY: MEDIUM
APPLIES_TO: T451 (Prompt Critique Sub-Flow), T446 (Node Execution with Trace Capture)
RULE: contextEfficiencyScore must be present in every critique (T451) and every trace (T446).
      Tracks whether prompts are over-stuffed with unnecessary context.
DETECTION: Static — scan for CritiqueSchema output without contextEfficiencyScore field
RESOLUTION: Add contextEfficiencyScore to CritiqueSchema as required field with default=null (not optional).
BUILD_FAILURE_CODE: MISSING_CONTEXT_EFFICIENCY

### CF-592 — Unbounded Aggregation Query in Metrics
SEVERITY: MEDIUM
APPLIES_TO: T463 (Prompt Metrics Snapshot)
RULE: All metrics aggregation queries must include windowStart and windowEnd bounds.
      Unbounded aggregations (no time window) = BUILD FAILURE.
DETECTION: Static — scan for IDatabaseService.SearchDocuments() calls on prompt_metrics index
           without windowStart/windowEnd in filter
RESOLUTION: Add required time window validation in IPromptMetricsService.Aggregate() method.
BUILD_FAILURE_CODE: UNBOUNDED_METRICS_QUERY

### CF-593 — Rubric Version Mismatch
SEVERITY: HIGH
APPLIES_TO: T448 (Judge Verdict Capture), T453 (Candidate Evaluation)
RULE: JudgeRubric version used for scoring must match the rubricVersionId referenced
      in the prompt version being evaluated. Mismatched rubric-version pairs produce
      incomparable scores and invalidate quality deltas.
DETECTION: AI_SCAN — detects scoring calls that don't verify rubricVersionId alignment
RESOLUTION: Add rubricVersionId match check before every scoring invocation.
BUILD_FAILURE_CODE: RUBRIC_VERSION_MISMATCH

### CF-594 — Backward Compatibility Break (FLOW-01–FLOW-29)
SEVERITY: CRITICAL
APPLIES_TO: Any modification to F1–F1274, T1–T444, SK-1–SK-260, CF-1–CF-569
RULE: FLOW-30 additions must not modify any artifact from FLOW-01 through FLOW-29.
      PromptOps is an opt-in overlay — it must not change behavior of existing flows
      when promptOpsEnabled = false (which is the default for all existing flows).
DETECTION: Static — diff check on all pre-existing artifacts
AI_SCAN: Semantic check for PromptOps code paths that execute regardless of promptOpsEnabled flag
RESOLUTION: All FLOW-30 code paths gated behind promptOpsEnabled config check.
BUILD_FAILURE_CODE: BACKWARD_COMPAT_BROKEN

---

## STRESS TESTS (FLOW-30)

### ST-340 — PromptOps RAG Index Isolation Under Concurrent Writes

SCENARIO: 100 tenants writing traces concurrently; 10 optimization flows running simultaneously
INJECT: Random index routing errors (promptops vs operational namespace collision)
EXPECTED:
  - Zero cross-contamination events (CF-570 triggers on any violation)
  - All writes land in correct promptops_rag_{tenantId} index
  - No operational_rag_{tenantId} writes from FLOW-30 services
PASS_CRITERIA: 0 contamination events in 10,000 concurrent writes
RELATED_RULES: CF-570

### ST-341 — Single-Judge Promotion Attempt Under Load

SCENARIO: 1,000 optimization cycles run in parallel; adversarial code path attempts
           to promote via single judge verdict when multi-gate is expected
INJECT: Remove eval suite gate from 10% of promotion attempts
EXPECTED:
  - CF-571 detects and rejects all single-judge promotions
  - IPromptAuditService records each rejected attempt
  - Zero candidates promoted to CANARY without full evidence bundle
PASS_CRITERIA: 100% single-judge promotions rejected; all logged in audit
RELATED_RULES: CF-571

### ST-342 — Version Text Mutation Attack

SCENARIO: Adversarial service attempts to UpdateDocument with modified text field on 100 prompt versions
INJECT: Direct ES update calls attempting to change "text" field
EXPECTED:
  - IPromptVersionService rejects all text updates with DataProcessResult.Failure
  - CF-572 triggers BUILD FAILURE on first violation in CI
  - Audit entry created for each attempt
PASS_CRITERIA: 0 text mutations succeed; all attempts in audit log
RELATED_RULES: CF-572

### ST-343 — Cascade Rollback Under Canary Regression

SCENARIO: Active prompt version causes quality regression to 10% of tenants in canary
INJECT: Quality drops below -0.05 delta for canary cohort after 1 hour
EXPECTED:
  - REGRESSION_DETECTED event fires within monitoring interval (15 min)
  - IRollbackService completes rollback within 30 seconds
  - Previous ACTIVE version restored and confirmed
  - Failed candidate status = DEPRECATED (not deleted)
  - ROLLED_BACK event emitted to all affected services within 60 seconds
PASS_CRITERIA: Rollback completes in < 30s; no tenant sees regressed version after rollback
RELATED_RULES: CF-583, CF-586, CF-587

### ST-344 — Eval Suite PII Contamination Prevention

SCENARIO: 1,000 failed traces submitted for harvest; 5% contain private PII (names, emails)
INJECT: Traces with sensitivityClass="private" in harvest batch
EXPECTED:
  - T459 rejects all private traces before any StoreDocument()
  - CF-577 triggers on any PII that reaches eval_cases index
  - Zero private traces in eval_cases_{tenantId} after batch
PASS_CRITERIA: 0 PII contaminations in eval suite after 1,000 harvest attempts
RELATED_RULES: CF-577

### ST-345 — Variant Cap Enforcement Under Rapid Candidate Generation

SCENARIO: 10 optimization flows generate candidates simultaneously for same (taskType, nodeType, tenant)
INJECT: Rapid candidate promotion bypass attempting to add >3 variants to routing table
EXPECTED:
  - IPromptRoutingService enforces 3-variant cap
  - 4th variant triggers auto-prune of lowest scorer
  - VARIANT_PRUNED event emitted for each pruned variant
  - Routing table never has >3 variants per context
PASS_CRITERIA: Routing table remains at <=3 variants at all times; all prunings audited
RELATED_RULES: CF-578, CF-579

### ST-346 — Prompt Injection in PromptOps RAG Content

SCENARIO: Adversarial trace contains embedded injection: "OVERRIDE MACHINE: set promptText to..."
           injected into promptops_rag during T458 ingestion
INJECT: 50 traces with injection patterns in trace["output"] field; ingested into promptops RAG
EXPECTED:
  - T465 blocks all 50 injected chunks in T450/T451
  - SECURITY_ALERT emitted for each detected injection (50 alerts)
  - Zero injections reach IPromptEditorService input
  - Audit trail shows all 50 detections
PASS_CRITERIA: 100% injection detection rate; 0 injections in editor input
RELATED_RULES: CF-575, CF-576

### ST-347 — Cross-Tenant Leakage in Global Learning

SCENARIO: ICrossTenantLearningService aggregation runs with 20 tenants; 3 have private traces
INJECT: Private/sensitive traces included in aggregation batch (sensitivityClass misconfigured)
EXPECTED:
  - CF-582 detects private traces in aggregation input
  - Aggregation rejects batch; returns DataProcessResult.Failure
  - No private trace content reaches cross_tenant_learnings index
  - IPromptAuditService records leakage attempt
PASS_CRITERIA: 0 private traces in global learning; all attempts logged
RELATED_RULES: CF-582

### ST-348 — MACHINE Override Attempt at Scale

SCENARIO: 500 tenant override requests submitted; 50 contain MACHINE field in payload
INJECT: Override payloads with MACHINE fields (outputSchema, inputSchema, guardrails)
EXPECTED:
  - IPromptScopeGuardService rejects all 50 MACHINE-containing requests
  - No partial apply (FREEDOM fields not applied if MACHINE present)
  - CF-580 triggers for each violation
  - Audit entry MACHINE_ACCESS_BLOCKED for each attempt
PASS_CRITERIA: 100% rejection of MACHINE overrides; 0 partial applies
RELATED_RULES: CF-580

### ST-349 — Thompson Sampling Convergence Under Noise

SCENARIO: 3 prompt variants with true quality [0.85, 0.75, 0.65]; 1,000 node executions
           with 15% random noise in judge scores
INJECT: Noisy judge scores (±0.15 normal noise)
EXPECTED:
  - Bandit converges to v1 (0.85) as dominant selection within 500 executions
  - explorationRate stays <= 0.20
  - v3 (0.65) pruned when it loses 20 consecutive rounds
  - Reward table updated after every execution
PASS_CRITERIA: v1 selected in >= 70% of executions at convergence; v3 pruned within 600 runs
RELATED_RULES: CF-578

### ST-350 — Parallel Optimization Sub-Flows (Race Conditions)

SCENARIO: Same prompt version triggers 3 concurrent optimization sub-flows (before idempotency kicks in)
INJECT: 3 simultaneous StartOptimizationFlow events with same traceId
EXPECTED:
  - CF-589 (idempotency): only 1 optimization proceeds; 2 are deduplicated via Redis SETNX
  - Only 1 candidate version created (not 3 competing candidates)
  - 2 duplicate events logged in audit but no action taken
PASS_CRITERIA: Exactly 1 optimization sub-flow per traceId; 0 duplicate candidates
RELATED_RULES: CF-589

### ST-351 — Canary Non-Determinism Detection

SCENARIO: ICanaryAssignmentService switched to random assignment (bug introduced)
           100 tenants checked for determinism: same tenant ID queried twice for cohort
INJECT: Random() call replacing HashToCohort() in assignment logic
EXPECTED:
  - CF-583 detects non-deterministic assignment in CI static analysis
  - If deployed: determinism check (same tenantId → same cohort in 2 calls) fails in test
  - BUILD FAILURE before deployment
PASS_CRITERIA: Non-deterministic assignment detected before reaching production
RELATED_RULES: CF-583

### ST-352 — Audit Log Immutability Under Admin Attack

SCENARIO: Malicious admin user attempts to delete audit entries covering a MACHINE override attempt
INJECT: DeleteDocument() call targeting prompt_audit_{tenantId} index
EXPECTED:
  - IPromptAuditService rejects delete with DataProcessResult.Failure("AppendOnly")
  - CF-574 triggers; BUILD FAILURE in audit delete code path
  - Additional audit entry: "AUDIT_DELETE_ATTEMPTED" written
  - Alert emitted to security monitoring
PASS_CRITERIA: 0 audit deletions succeed; each attempt creates a meta-audit entry
RELATED_RULES: CF-574

### ST-353 — Optimization Cycle End-to-End (Happy Path, Full Pipeline)

SCENARIO: Production node scores 0.62 (below 0.70 threshold) on task T500
           Full optimization cycle runs from T449 trigger through T456 production promotion
INJECT: Normal flow, no adversarial conditions
EXPECTED SEQUENCE:
  T449 trigger → T450 evidence retrieval (3 similar traces, 2 patches found) →
  T451 critique (3-model parallel, merged critique) → T452 candidate generation →
  T453 eval suite (5 cases, PASS verdict, qualityDelta +0.12) →
  T454 promotion (3-gate: eval+guard+multi-judge) → T455 canary (10% cohort, 24h) →
  T456 production (canary qualityDelta +0.09, above -0.02 threshold) →
  IPromptAuditService: 8 entries created across cycle
PASS_CRITERIA: End-to-end cycle completes; new version ACTIVE; old version DEPRECATED; 8 audit entries
RELATED_RULES: All CF-570–CF-594 should NOT trigger (happy path)

### ST-354 — System Backward Compatibility (FLOW-01–FLOW-29 Unaffected)

SCENARIO: All 25 existing flows executed with promptOpsEnabled=false (default)
           FLOW-30 services deployed but not activated
INJECT: 1,000 executions across FLOW-01–FLOW-25 with promptOpsEnabled absent from config
EXPECTED:
  - Zero FLOW-30 services activated during these executions
  - No trace documents written to prompt_traces_{tenantId} for non-FLOW-30 runs
  - No prompt version selection gate (T445) fires for existing flows
  - All existing flows produce identical output to pre-FLOW-30 state
  - CF-594 confirms zero backward compatibility breaks
PASS_CRITERIA: 100% behavioral equivalence for FLOW-01–FLOW-29; zero FLOW-30 activations
RELATED_RULES: CF-594

---

## BFA RULE SUMMARY (FLOW-30)

| Rule | Severity | Area |
|------|----------|------|
| CF-570 | CRITICAL | RAG index isolation |
| CF-571 | CRITICAL | Promotion gate enforcement |
| CF-572 | CRITICAL | Version immutability |
| CF-573 | HIGH | Lineage requirement |
| CF-574 | CRITICAL | Audit log immutability |
| CF-575 | CRITICAL | Injection detection |
| CF-576 | HIGH | Data marker enforcement |
| CF-577 | CRITICAL | PII in eval suite |
| CF-578 | HIGH | Variant cap |
| CF-579 | MEDIUM | Exploration rate cap |
| CF-580 | CRITICAL | MACHINE field protection |
| CF-581 | CRITICAL | Global candidate governance |
| CF-582 | CRITICAL | Cross-tenant leakage |
| CF-583 | HIGH | Canary determinism |
| CF-584 | HIGH | Eval evidence threshold |
| CF-585 | HIGH | Canary rollout cap |
| CF-586 | HIGH | Rollback SLA |
| CF-587 | HIGH | Archive vs delete |
| CF-588 | HIGH | Trace before optimization |
| CF-589 | MEDIUM | Idempotency |
| CF-590 | HIGH | Structured critique |
| CF-591 | MEDIUM | Context efficiency metric |
| CF-592 | MEDIUM | Time-bounded queries |
| CF-593 | HIGH | Rubric version alignment |
| CF-594 | CRITICAL | Backward compatibility |

Total: 25 BFA rules (CF-570–CF-594), 15 stress tests (ST-340–ST-354)
