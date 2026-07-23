# FLOW-30 SKILLS FACTORY RAG
## PromptOps — Self-Learning Prompt Engineering Engine Extension
## Skills: SK-261 to SK-270 (10 new skills)
## Date: 2026-03-01

---

## SKILL SUMMARY TABLE

| Skill | Name | Pattern | Key Factories | Promotion Level |
|-------|------|---------|---------------|-----------------|
| SK-261 | Prompt Version Asset Management | CQRS + Immutable Versioning | F1275, F1276 | CORE |
| SK-262 | PromptOps Hybrid RAG Retrieval | Hybrid Vector+Graph | F1280, F1281 | INJECTED |
| SK-263 | Candidate Prompt Generation Pipeline | Critic→Editor→Guard | F1284, F1285, F1286 | INJECTED |
| SK-264 | Eval Suite Construction & Harvest | Harvest + Dedup | F1282, F1283 | INJECTED |
| SK-265 | Canary Promotion Pipeline | Multi-Gate Promotion | F1288, F1289, F1291 | CORE |
| SK-266 | Bandit-Based Prompt Routing | Thompson Sampling | F1290, F1293 | INJECTED |
| SK-267 | Multi-Tenant Prompt Safety | MACHINE/FREEDOM Guard | F1295, F1297 | CORE |
| SK-268 | Prompt Injection Guard Pattern | Data/Instruction Separation | F1286, F1280 | CORE |
| SK-269 | TextGrad-Style Prompt Critique | Structured Critique | F1284, F1279 | INJECTED |
| SK-270 | PromptOps Observability | Trace+Metrics+Audit | F1292, F1293, F1294 | CORE |

---

## SK-261 — Prompt Version Asset Management

PROMOTION_LEVEL: CORE
PATTERN: CQRS + Immutable Versioning
KEY_FACTORIES: F1275 (IPromptTemplateService), F1276 (IPromptVersionService), F1277 (IPromptPolicyService)
PRIMARY_FABRIC: DATABASE FABRIC (Skill 05 → Elasticsearch)

PURPOSE:
  Manages prompt templates and their versioned children as immutable assets.
  Templates define the contract (schemas, guardrails). Versions are immutable revisions.
  Status transitions: candidate → canary → active → deprecated.
  No UPDATE on text field ever. Policy document routes (taskType,nodeType,tenant,budgetMode) to version.

PATTERN IMPLEMENTATION (DNA-compliant):
  // Store new prompt version (candidate)
  var doc = new Dictionary<string,object> {
    ["promptId"] = promptId,
    ["version"] = nextVersion,
    ["parentVersion"] = currentActiveVersion,
    ["templateId"] = templateId,
    ["text"] = candidateText,
    ["status"] = "candidate",
    ["changeSummary"] = changeSummary,
    ["expectedImpact"] = expectedImpact,
    ["createdAt"] = DateTime.UtcNow,
    ["tenantId"] = context.TenantId
  };
  var result = await _promptVersionService.StoreDocument(tenantId, doc);
  // Status transition only (text never changes):
  var update = new Dictionary<string,object> { ["status"] = "canary" };
  var transition = await _promptVersionService.UpdateStatus(versionId, update);

DNA_PATTERNS_APPLIED:
  DNA-1: ParseDocument — Dictionary<string,object> for all prompt assets
  DNA-2: BuildSearchFilter — empty fields skipped on policy lookup
  DNA-3: DataProcessResult<T> — all operations return result wrapper
  DNA-5: Scope Isolation — tenantId on every ES query

IRON_RULES:
  Text field is immutable after initial store. UpdateStatus() only accepts status field.
  parentVersion is mandatory. Orphaned versions (no parent) = BUILD FAILURE.
  status enum: [candidate, canary, active, deprecated]. No freeform values.

REUSE_GUIDANCE:
  Use when: any flow needs versioned asset tracking with lineage and status lifecycle.
  Do NOT use for: typed DTOs, mutable documents, documents without parent lineage.

---

## SK-262 — PromptOps Hybrid RAG Retrieval

PROMOTION_LEVEL: INJECTED
PATTERN: Hybrid Vector+Graph Retrieval over Meta-Memory
KEY_FACTORIES: F1280 (IPromptOpsRagService), F1281 (ITraceIndexService)
PRIMARY_FABRIC: RAG FABRIC (Skill 00b → Hybrid strategy)

PURPOSE:
  Retrieves evidence packs for the optimization loop from the PromptOps RAG (meta-memory).
  Two retrieval modes: (a) vector — similar failure traces by embedding similarity;
  (b) graph — common failure patterns across traces via typed relationship traversal.
  Results merged as local UNION global patterns before returning to optimizer.
  CRITICAL: Always targets promptops_rag_{tenantId}, never operational_rag_{tenantId}.

PATTERN IMPLEMENTATION:
  var vectorResults = await _promptOpsRag.SearchAsync(query, strategy: "Vector", topK: 5);
  var graphResults  = await _promptOpsRag.SearchAsync(query, strategy: "Graph", depth: 2);
  var evidencePack  = MergeEvidencePack(vectorResults, graphResults);
  // MergeEvidencePack: deduplicate by traceId, rank by combined score, cap at maxEvidence

INDEX_NAMESPACE_ENFORCEMENT:
  // Correct:
  var idx = $"promptops_rag_{tenantId}";
  // WRONG — BUILD FAILURE:
  var idx = $"operational_rag_{tenantId}";  // NEVER cross this boundary

GRAPH_SCHEMA (typed edges):
  (TASK_TYPE) --HAS_FAILURE--> (FAILURE_MODE)
  (FAILURE_MODE) --FIXED_BY--> (PROMPT_PATCH)
  (PROMPT_PATCH) --PRODUCED--> (PROMPT_VERSION)
  (PROMPT_VERSION) --EVALUATED_BY--> (EVAL_SUITE)

DNA_PATTERNS_APPLIED:
  DNA-1: All retrieved documents as Dictionary<string,object>
  DNA-3: DataProcessResult<EvidencePack>
  DNA-5: tenantId enforced on every RAG query

IRON_RULES:
  Cross-index query (promptops + operational) = BUILD FAILURE
  Empty evidence pack must not block optimization (log warning, continue)
  Graph traversal depth capped at configurable maxDepth (default 3)

---

## SK-263 — Candidate Prompt Generation Pipeline

PROMOTION_LEVEL: INJECTED
PATTERN: Sequential Critic → Editor → Guard with Fabric Calls
KEY_FACTORIES: F1284 (IPromptCriticService), F1285 (IPromptEditorService), F1286 (IPromptGuardService)
PRIMARY_FABRIC: AI ENGINE FABRIC (Skills 06/07 → IAiProvider + AiDispatcher)

PURPOSE:
  Three-stage pipeline to generate a validated candidate prompt version from a judge verdict:
  Stage 1 (Critic): analyzes verdict+evidence → structured critique
  Stage 2 (Editor): generates new prompt text from critique
  Stage 3 (Guard): validates candidate before storage — blocks MACHINE violations, schema breaks, safety regressions

STAGE 1 — CRITIC (multi-model parallel):
  var critiqueRequest = new Dictionary<string,object> {
    ["promptText"] = activeVersionText,
    ["judgeVerdict"] = verdict,
    ["evidencePack"] = evidencePack,
    ["rubric"] = rubricDoc
  };
  var critiqueResult = await _aiFabric.GenerateAsync(
    prompt: BuildCritiquePrompt(critiqueRequest),
    strategy: "Multi",       // AiDispatcher: Claude+GPT-4+Gemini parallel
    outputSchema: CritiqueSchema
  );
  // CritiqueSchema enforces: failureModes[], missingConstraints[], ambiguityPoints[], contextEfficiencyScore

STAGE 2 — EDITOR (single primary model):
  var editRequest = new Dictionary<string,object> {
    ["critique"] = mergedCritique,
    ["activePromptText"] = activeVersionText,
    ["templateConstraints"] = templateDoc  // MACHINE fields as constraints
  };
  var candidateText = await _aiFabric.GenerateAsync(
    prompt: BuildEditorPrompt(editRequest),
    strategy: "Primary",
    outputSchema: CandidateTextSchema
  );

STAGE 3 — GUARD (required before storage):
  var guardResult = await _promptGuardService.ValidateCandidate(candidateText, templateDoc, policyDoc);
  if (!guardResult.IsSuccess) return DataProcessResult<string>.Failure("GuardRejected", guardResult.Reason);
  // Only store if guard passes
  await _promptVersionService.StoreDocument(tenantId, BuildCandidateDoc(candidateText, parentVersion));

DNA_PATTERNS_APPLIED:
  DNA-1: All inputs/outputs as Dictionary<string,object>
  DNA-3: DataProcessResult at every stage — failure propagates cleanly
  DNA-5: tenantId in every AI call context

IRON_RULES:
  Guard (Stage 3) MUST run before storage — skipping = BUILD FAILURE
  IAiProvider.GenerateAsync() only — no direct SDK calls = BUILD FAILURE
  Typed critique schema required — freetext critique cannot feed Stage 2

---

## SK-264 — Eval Suite Construction & Harvest

PROMOTION_LEVEL: INJECTED
PATTERN: Automatic Test Asset Harvest from Production Failures
KEY_FACTORIES: F1282 (IEvalCaseService), F1283 (IEvalSuiteService), F1292 (IPromptTraceService)
PRIMARY_FABRIC: DATABASE FABRIC (Skill 05 → Elasticsearch)

PURPOSE:
  Continuously harvests failed production traces into eval cases that form regression test suites.
  Deduplication prevents suite bloat. PII guard prevents sensitive data in test assets.
  Suite grows automatically as the system encounters new failure patterns.
  Max suite size enforced (default 50 cases); oldest cases pruned.

HARVEST PATTERN:
  // Step 1: PII check (MANDATORY before harvest)
  if (trace["sensitivityClass"] == "private" || trace["sensitivityClass"] == "sensitive")
    return DataProcessResult.Failure("PIIGuard", "Trace too sensitive to harvest");

  // Step 2: Deduplication check
  var similar = await _evalCaseService.SearchDocuments(tenantId, BuildSearchFilter(new {
    taskType = trace["taskType"],
    failureModes = trace["failureModes"],  // BuildSearchFilter skips if empty
    inputHash = ComputeHash(trace["inputs"])
  }));
  if (similar.Count > 0) return DataProcessResult.Success("Duplicate", similar[0]);

  // Step 3: Build eval case
  var evalCase = new Dictionary<string,object> {
    ["caseId"] = Guid.NewGuid(),
    ["sourceTraceId"] = trace["traceId"],
    ["taskType"] = trace["taskType"],
    ["nodeType"] = trace["nodeType"],
    ["inputs"] = trace["inputs"],
    ["expectedConstraints"] = ExtractConstraints(rubricDoc),
    ["scoringRubricRef"] = trace["rubricVersionId"],
    ["failureLabels"] = trace["failureModes"],
    ["tenantId"] = tenantId,
    ["harvestedAt"] = DateTime.UtcNow
  };

  // Step 4: Enforce suite size cap
  var suite = await _evalSuiteService.GetSuite(tenantId, taskType, nodeType);
  if (suite["caseCount"] >= policy["maxCasesPerSuite"])
    await _evalCaseService.PruneOldest(tenantId, taskType);

  await _evalCaseService.StoreDocument(tenantId, evalCase);

DNA_PATTERNS_APPLIED:
  DNA-1: Dictionary<string,object> for eval cases
  DNA-2: BuildSearchFilter for deduplication query
  DNA-3: DataProcessResult — PII rejection is a clean Failure, not exception
  DNA-5: tenantId on all queries

IRON_RULES:
  PII check MANDATORY before harvest — failure to check = BUILD FAILURE
  Suite cap enforced: prune before exceed, not after
  Harvested cases must include failureLabels[] (not just "failed")

---

## SK-265 — Canary Promotion Pipeline

PROMOTION_LEVEL: CORE
PATTERN: Multi-Gate Gated Promotion with Deterministic Cohort Assignment
KEY_FACTORIES: F1288 (ICanaryAssignmentService), F1289 (IPromotionDecisionService), F1291 (IRollbackService)
PRIMARY_FABRIC: QUEUE FABRIC (Skill 04) + DATABASE FABRIC (Skill 05)

PURPOSE:
  Manages safe rollout of candidate prompt versions to production.
  Deterministic cohort assignment (hash-based) ensures reproducibility.
  Monitors canary metrics vs control; auto-triggers rollback on regression.
  Multi-gate before production: eval PASS + guard clearance + canary success.

CANARY ASSIGNMENT PATTERN:
  // Deterministic — same tenantId always maps to same cohort
  var cohortId = HashToCohort(tenantId, seed: candidateId, buckets: 10);
  var isCanary = cohortId <= (rolloutPercent / 10);
  var assignment = new Dictionary<string,object> {
    ["tenantId"] = tenantId,
    ["candidateId"] = candidateId,
    ["cohortId"] = cohortId,
    ["isCanary"] = isCanary,
    ["assignedAt"] = DateTime.UtcNow
  };
  await _queueService.EnqueueAsync("canary_assignment_stream", assignment);

REGRESSION MONITORING:
  // Check at each monitoring interval
  var canaryMetrics = await _metricsService.GetWindow(candidateId, windowMinutes: 60);
  var controlMetrics = await _metricsService.GetWindow(activeVersionId, windowMinutes: 60);
  var qualityDelta = canaryMetrics["avgQuality"] - controlMetrics["avgQuality"];
  if (qualityDelta < -0.05) {
    await _queueService.EnqueueAsync("rollback_stream", BuildRegressionEvent(candidateId, qualityDelta));
    return; // IRollbackService handles the rest
  }

PROMOTION GATES (all required):
  Gate 1: eval suite PASS verdict from T453
  Gate 2: IPromptGuardService clearance (no MACHINE violation)
  Gate 3: canary metrics non-regressive (qualityDelta >= -0.02)
  Gate 4: multi-judge agreement (2-of-3 models agree quality >= threshold)
  SINGLE gate failing = REJECTED, not just delayed

IRON_RULES:
  Non-deterministic cohort assignment = BUILD FAILURE
  rolloutPercent > 50 requires explicit override + audit entry
  Auto-rollback must complete within 30 seconds
  Failed candidate archived (not deleted) always

---

## SK-266 — Bandit-Based Prompt Routing

PROMOTION_LEVEL: INJECTED
PATTERN: Thompson Sampling with Reward Decay and Variant Cap
KEY_FACTORIES: F1290 (IPromptRoutingService), F1293 (IPromptMetricsService)
PRIMARY_FABRIC: AI ENGINE FABRIC (Skill 07) + DATABASE FABRIC (Skill 05)

PURPOSE:
  Explores among active prompt variants using Thompson sampling.
  Each variant has a Beta distribution over quality reward; sampling determines which to serve.
  Reward table updated after each node execution. Variants auto-pruned if consistently losing.
  Cap: max 3 variants per (taskType, nodeType, tenant, budgetMode).

THOMPSON SAMPLING PATTERN:
  // Sample from each variant's Beta distribution
  var variants = await GetActiveVariants(context); // max 3
  var scores = variants.Select(v => SampleBeta(v["alpha"], v["beta"])).ToList();
  var selectedIndex = scores.IndexOf(scores.Max());
  var selectedVersionId = variants[selectedIndex]["versionId"];

  // Update reward after execution (called from T462 feedback):
  var quality = executionResult["judgeScore"];
  var reward = quality >= policy["minAcceptableScore"] ? 1 : 0;
  await _metricsService.UpdateReward(selectedVersionId, reward);
  // Bayesian update: alpha += reward, beta += (1 - reward)

VARIANT CAP ENFORCEMENT:
  if (activeVariants.Count >= 3) {
    // Prune variant with lowest (alpha / (alpha + beta)) = lowest expected quality
    var loser = activeVariants.OrderBy(v => v["alpha"] / (v["alpha"] + v["beta"])).First();
    await DeprecateVariant(loser["versionId"]);
    await EmitEvent("VARIANT_PRUNED", loser);
  }

DNA_PATTERNS_APPLIED:
  DNA-1: Reward table as Dictionary<string,object>
  DNA-3: DataProcessResult for all routing calls
  DNA-5: tenantId scopes variant selection

IRON_RULES:
  Selected version must be ACTIVE or CANARY — DEPRECATED = stale table = BUILD FAILURE
  Variant cap (3) enforced before adding new variant, not after
  explorationRate config cannot exceed 0.20

---

## SK-267 — Multi-Tenant Prompt Safety

PROMOTION_LEVEL: CORE
PATTERN: MACHINE/FREEDOM Boundary Enforcement via Scope Guard
KEY_FACTORIES: F1295 (ITenantPromptProfileService), F1296 (ICrossTenantLearningService), F1297 (IPromptScopeGuardService)
PRIMARY_FABRIC: CORE FABRIC (Skill 01) + DATABASE FABRIC (Skill 05)

PURPOSE:
  Enforces that tenants can customize FREEDOM fields (style, verbosity, domain hints)
  but cannot modify MACHINE fields (schemas, safety rules, output format contracts).
  Prevents cross-tenant data leakage in the learning aggregation pipeline.
  IPromptScopeGuardService runs in-process (CORE FABRIC) — no remote call for boundary check.

MACHINE/FREEDOM CHECK PATTERN:
  var machineFields = templateDoc["machineFields"] as List<string>; // from IPromptTemplateService
  foreach (var field in overrideRequest.Keys) {
    if (machineFields.Contains(field)) {
      await _auditService.LogMachineAccessAttempt(tenantId, field);
      return DataProcessResult<bool>.Failure("MachineViolation", $"Field '{field}' is MACHINE-classified");
    }
  }
  // Atomic apply of all FREEDOM fields
  var profile = BuildProfileDoc(overrideRequest.Where(f => !machineFields.Contains(f.Key)));
  await _tenantPromptProfileService.StoreDocument(tenantId, profile);

CROSS-TENANT SAFETY:
  // Only include non-sensitive traces in global learning
  var eligibleTraces = traces.Where(t =>
    t["sensitivityClass"] == "public" || t["sensitivityClass"] == "internal-aggregated"
  );
  // Global candidate always requires platform-admin approval
  var globalCandidate = await _crossTenantService.ProposeGlobalVersion(eligibleTraces);
  globalCandidate["status"] = "pending-admin-review"; // never auto-promote global

DNA_PATTERNS_APPLIED:
  DNA-4: MicroserviceBase — IPromptScopeGuardService inherits 19 components
  DNA-5: tenantId scope on all profile storage
  DNA-3: DataProcessResult — MACHINE violation is Failure, not exception

IRON_RULES:
  Any MACHINE field in override payload = reject entire request (no partial apply)
  Global cross-tenant candidate = pending-admin-review status always
  Private/sensitive traces excluded from all aggregation — no exceptions

---

## SK-268 — Prompt Injection Guard Pattern

PROMOTION_LEVEL: CORE
PATTERN: Data/Instruction Separation with Typed Delimiters
KEY_FACTORIES: F1286 (IPromptGuardService), F1280 (IPromptOpsRagService)
PRIMARY_FABRIC: AI ENGINE FABRIC (Skill 06 → validator)

PURPOSE:
  Prevents prompt injection attacks in the self-learning loop.
  Retrieved PromptOps RAG content is marked as [DATA] before injection into any prompt.
  Known injection patterns (control-plane keywords, instruction overrides) are blocked.
  Detected injections trigger SECURITY_ALERT event — never silently skipped.

INJECTION GUARD PATTERN:
  var blockedPatterns = new[] {
    "PROMOTE", "OVERRIDE MACHINE", "IGNORE PREVIOUS", "NEW INSTRUCTION",
    "SET STATUS", "DEPRECATE", "FORCE PROMOTE"
  };

  foreach (var chunk in retrievedChunks) {
    var text = chunk["text"].ToString();

    // Block known injection patterns
    if (blockedPatterns.Any(p => text.Contains(p, StringComparison.OrdinalIgnoreCase))) {
      await _queueService.EnqueueAsync("security_alerts", BuildSecurityAlert(chunk));
      return DataProcessResult.Failure("InjectionDetected", $"Chunk blocked: contains control-plane pattern");
    }

    // Mark as DATA (not INSTRUCTION)
    chunk["role"] = "data";
    chunk["delimiter"] = "<retrieved_context>";
  }

PROMPT CONSTRUCTION (safe injection):
  // Correct:
  var prompt = $"Task: {taskInstruction}\n<retrieved_context>\n{markedChunks}\n</retrieved_context>";
  // WRONG — BUILD FAILURE (no delimiter):
  var prompt = $"Task: {taskInstruction}\n{rawChunks}";

DNA_PATTERNS_APPLIED:
  DNA-3: DataProcessResult — injection detection is Failure, not exception
  DNA-5: tenantId scopes injection patterns per tenant if custom patterns configured

IRON_RULES:
  Raw chunk injection (no DATA marking) = BUILD FAILURE
  Injection detection → SECURITY_ALERT must fire — silent skip = BUILD FAILURE
  Control-plane keyword list is MACHINE (not configurable by tenant)

---

## SK-269 — TextGrad-Style Prompt Critique

PROMOTION_LEVEL: INJECTED
PATTERN: Structured Critique with Targeted Edit Recommendations
KEY_FACTORIES: F1284 (IPromptCriticService), F1279 (IJudgeRubricService)
PRIMARY_FABRIC: AI ENGINE FABRIC (Skill 07 → multi-model via AiDispatcher)

PURPOSE:
  Implements TextGrad-inspired structured critique: models analyze the "gradient" of the
  judge verdict relative to the prompt, producing specific edit recommendations rather
  than vague improvement suggestions. Outputs typed arrays for each failure category.
  Multi-model parallel critique; outputs merged before passing to editor.

CRITIQUE PROMPT STRUCTURE:
  SystemPrompt:
    You are a prompt optimization critic. Analyze the prompt and judge verdict.
    Return ONLY valid JSON matching the CritiqueSchema. No preamble, no markdown.

  CritiqueSchema (required output):
    {
      "failureModes": [{"category": string, "severity": "high|medium|low", "evidence": string}],
      "missingConstraints": [{"constraint": string, "whyNeeded": string}],
      "ambiguityPoints": [{"location": string, "ambiguity": string, "suggestion": string}],
      "formattingIssues": [{"issue": string, "fix": string}],
      "contextEfficiencyScore": float (0.0-1.0),
      "editRecommendations": [{"targetSection": string, "currentText": string, "proposedText": string, "rationale": string}]
    }

MERGE PATTERN (multi-model critiques):
  // Take union of failureModes, deduplicate by category+severity
  // Take intersection of editRecommendations where 2+ models agree
  // contextEfficiencyScore: average across models
  var merged = new Dictionary<string,object> {
    ["failureModes"] = UnionDedup(critiques.Select(c => c["failureModes"])),
    ["editRecommendations"] = IntersectByAgreement(critiques, minAgreement: 2),
    ["contextEfficiencyScore"] = critiques.Average(c => (float)c["contextEfficiencyScore"])
  };

IRON_RULES:
  Critique must use CritiqueSchema — freetext output = BUILD FAILURE
  editRecommendations must include currentText and proposedText (diff-able)
  contextEfficiencyScore required (tracks over-stuffed context)

---

## SK-270 — PromptOps Observability

PROMOTION_LEVEL: CORE
PATTERN: Three-Layer Observability (Trace / Metrics / Audit) with Separate Concerns
KEY_FACTORIES: F1292 (IPromptTraceService), F1293 (IPromptMetricsService), F1294 (IPromptAuditService)
PRIMARY_FABRIC: DATABASE FABRIC (Skill 05 → Elasticsearch)

PURPOSE:
  Three distinct observability layers, each with different retention, query pattern, and mutability:
  - Trace (F1292): per-run, raw, replayable, 30-day retention, mutable (verdict added after judging)
  - Metrics (F1293): time-windowed aggregates, 90-day retention, overwritten per window
  - Audit (F1294): append-only governance trail, 7-year retention, IMMUTABLE

TRACE DOCUMENT SCHEMA:
  {traceId, promptVersionId, ragProfileId, modelId, taskType, nodeType,
   inputTokens, outputTokens, latencyMs, judgeScore, retrievedChunks[],
   failureModes[], ragIngested, tenantId, executedAt}

METRICS DOCUMENT SCHEMA:
  {windowStart, windowEnd, taskType, nodeType, promptVersionId, tenantId, budgetMode,
   avgQuality, p50Latency, p95Latency, p99Latency, avgCost, sampleCount, modelDistribution{}}

AUDIT ENTRY SCHEMA:
  {auditId, eventType, actorId, targetId, beforeState, afterState, evidenceRef, timestamp, tenantId}
  eventType enum: [CANDIDATE_CREATED, CANARY_STARTED, PROMOTED, ROLLBACK, POLICY_CHANGED,
                   MACHINE_ACCESS_BLOCKED, INJECTION_DETECTED, GLOBAL_CANDIDATE_PROPOSED]

INDEX OPERATIONS:
  // Trace: StoreDocument + UpdateDocument (verdict fields added post-judging)
  // Metrics: StoreDocument per window (overwrites previous window for same key)
  // Audit: StoreDocument ONLY — no UpdateDocument, no DeleteDocument
  var auditOps = await _auditService.AllowedOperations(); // returns: ["store"]

DNA_PATTERNS_APPLIED:
  DNA-1: All three layers use Dictionary<string,object>
  DNA-2: BuildSearchFilter on all query paths
  DNA-3: DataProcessResult for all operations
  DNA-5: tenantId on every index operation

IRON_RULES:
  prompt_audit_{tenantId} index: StoreDocument only — any UPDATE or DELETE = BUILD FAILURE
  Trace must be written before optimization loop fires — missing trace = optimization blocked
  Metrics window must have windowStart and windowEnd (no unbounded aggregations)
