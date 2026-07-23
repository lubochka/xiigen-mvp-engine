# XIIGen — FLOW-32 BFA CONFLICT RULES & STRESS TESTS
## Flow: First RAG Initialization — Production Bootstrap
## Date: 2026-03-01
## New BFA Rules: CF-510–CF-525 | New Stress Tests: ST-300–ST-315
## Extends: CF-1–CF-509 and ST-1–ST-299 (unchanged)

---

# SECTION 1 — CONFLICT RULES (CF-510–CF-525)

## CF-510: RAG Index Naming Conflict with FLOW-09 Search Indices
```
TYPE:       INDEX_NAMING
SEVERITY:   CRITICAL
TRIGGER:    Any new RAG index created in Elasticsearch
CONDITION:  RAG index name overlaps with FLOW-09 search index aliases
CHECK:
  IEntityRegistry.GetIndexAliases("FLOW-09") → existing search aliases
  New RAG index name ∩ existing aliases → CONFLICT
RESOLUTION OPTIONS:
  REFACTOR: Add prefix "rag-" to all RAG indices (e.g., rag-bm25-{tenantId})
  REJECT: Block creation of conflicting index
  COMPAT_WRAPPER: Register alias routing rules (RAG reads from rag-*, search reads from search-*)
  FORCE_PROCEED: Allowed only if ImpactAnalysis confirms zero read overlap
REGISTERED_ENTITIES: rag-bm25-*, rag-vector-*, rag-manifest-*, rag-eval-*
PROTECTS: FLOW-09 SearchIndexService (F261–F280)
```

## CF-511: Embedding Model Not Registered Before Vector Index Build
```
TYPE:       ORDERING
SEVERITY:   CRITICAL
TRIGGER:    F1085:IVectorIndexService.IndexChunkAsync() called
CONDITION:  No embedding model registration found in F1094:IMetadataSchemaRegistryService
            for the model declared in chunk.metadata.embedding_model
CHECK:
  Prior to index write: GetSchemaAsync("embedding_model_registry") → must contain model entry
  If not found → CONFLICT (vector dimension unknown → corrupt index)
RESOLUTION OPTIONS:
  REFACTOR: Register embedding model config before any vector index writes (T389 step ordering)
  REJECT: Block index write until model is registered
  COMPAT_WRAPPER: Default to "text-embedding-3-large" if no model declared
PROTECTS: FLOW-32 vector index integrity
```

## CF-512: Tenant RAG Bootstrap Before Tenant Provisioning Complete
```
TYPE:       DEPENDENCY
SEVERITY:   CRITICAL
TRIGGER:    T389 rag.bootstrap.requested for a tenantId
CONDITION:  FLOW-15 tenant lifecycle event tenant.provisioned NOT found for tenantId
CHECK:
  IEntityRegistry.GetTenantStatus(tenantId) → must be "active"
  If pending or absent → CONFLICT
RESOLUTION OPTIONS:
  REJECT: Block bootstrap until tenant.provisioned received
  COMPAT_WRAPPER: Queue bootstrap event; auto-retry when tenant activated
PROTECTS: FLOW-15 tenant isolation guarantees
```

## CF-513: Canary Ramp Without Bootstrap Validation Gate
```
TYPE:       GATE
SEVERITY:   CRITICAL
TRIGGER:    F1123:ICanaryRolloutService.SetCanaryPercentAsync() called with percent > 0
CONDITION:  F1122:IBootstrapValidatorService.ValidateCoverageAsync() not completed successfully for tenantId
CHECK:
  Manifest index: bootstrap_validation_passed = true must exist for tenantId
  If absent → CONFLICT
RESOLUTION OPTIONS:
  REJECT: Block canary activation until validation passes
  FORCE_PROCEED: Requires explicit admin override with written justification
PROTECTS: Prevents serving customers from an under-indexed RAG system
```

## CF-514: RAG BM25 Index Sharing with FLOW-09 SearchIndexService
```
TYPE:       INDEX_ISOLATION
SEVERITY:   HIGH
TRIGGER:    F1084:IBm25IndexService registration
CONDITION:  IBm25IndexService target index name = ISearchIndexService (FLOW-09) index name
CHECK:
  F261 (ISearchIndexService) registered indices vs F1084 target indices → intersection check
RESOLUTION OPTIONS:
  REFACTOR: Use distinct index names (rag-bm25-{tenantId} vs search-{tenantId})
  REJECT: Block F1084 if naming conflict detected
PROTECTS: FLOW-09 search quality (RAG and search must have independently tunable BM25 parameters)
```

## CF-515: Vector Index Dimension Mismatch
```
TYPE:       SCHEMA
SEVERITY:   CRITICAL
TRIGGER:    F1085:IVectorIndexService.IndexChunkAsync() called with a vector
CONDITION:  vector.Length ≠ registered model dimension in F1094 schema registry
CHECK:
  GetDimensionAsync(embeddingModel) → expected_dim
  chunk.embedding.Length → actual_dim
  actual_dim ≠ expected_dim → CONFLICT (Elasticsearch will reject write; corrupt index)
RESOLUTION OPTIONS:
  REJECT: Block write; surface error with expected vs actual dimension
  REFACTOR: Re-embed chunk with correct model before writing
PROTECTS: Vector index structural integrity
```

## CF-516: Cache Key Missing TenantId (Cross-Tenant Leak Risk)
```
TYPE:       SECURITY
SEVERITY:   CRITICAL
TRIGGER:    F1089:IRetrievalCacheService or F1092:IRerankCacheService write
CONDITION:  Cache key does NOT include tenantId in its hash components
CHECK:
  AF-8 Security scan: cache key = hash(query, filters) — if tenantId absent → CONFLICT
  AF-8 checks cache key construction in generated code
RESOLUTION OPTIONS:
  REFACTOR: Cache key = hash(query + sorted(filters) + tenantId) always
  REJECT: Block generated code if cache key construction violates this rule
PROTECTS: Multi-tenant data isolation (DNA-5); prevents tenant A reading tenant B cached results
```

## CF-517: Routing Activates Before Skill Mapping Index Populated
```
TYPE:       DEPENDENCY
SEVERITY:   HIGH
TRIGGER:    F1099:ITaskTypeRouterService.GetRoutingConfigAsync() called
CONDITION:  F1100:ISkillMappingService returns empty results for all task types
CHECK:
  Manifest index: skill_mapping_index_seeded = true must exist for tenantId
  If absent or false → CONFLICT
RESOLUTION OPTIONS:
  REJECT: Block routing until mapping index populated (T396 cold start seed must run first)
  COMPAT_WRAPPER: Use default strategy (hybrid, all sources) until mapping available
PROTECTS: FLOW-32 routing quality; prevents 100% queries getting wrong strategy
```

## CF-518: Sub-Query Count Exceeds Config Limit
```
TYPE:       RESOURCE
SEVERITY:   MEDIUM
TRIGGER:    F1101:IQueryPlannerService.PlanAsync() returns sub-queries
CONDITION:  sub-queries.Count > config["maxSubQueries"]
CHECK:
  Planning output length > maxSubQueries (default 5) → CONFLICT
RESOLUTION OPTIONS:
  REFACTOR: Collapse sub-queries; increase maxSubQueries in FREEDOM config
  REJECT: Truncate to maxSubQueries; log warning
PROTECTS: Latency budget (parallel sub-queries multiply backend load)
```

## CF-519: Reranker Operates on Non-Security-Trimmed Results
```
TYPE:       DATA_FLOW
SEVERITY:   CRITICAL
TRIGGER:    F1090:INeuralRerankerService.RerankAsync() called
CONDITION:  Input candidates NOT confirmed security-trimmed by F1087:IMetadataFilterService
CHECK:
  AF-8 traces data flow: recall result → security trim → reranker
  If security trim step absent in DAG before reranker → CONFLICT
RESOLUTION OPTIONS:
  REJECT: Block reranker call if security trim step not in execution trace
  REFACTOR: Insert F1087.ApplySecurityTrimAsync() before reranker in T392 flow
PROTECTS: Prevents security-bypassed chunks reaching users via reranker
```

## CF-520: Abstention Audit Fires After Response Returned
```
TYPE:       ORDERING
SEVERITY:   HIGH
TRIGGER:    F1108:IGradedResponseBuilder.BuildResponseAsync() called for HEDGE/ABSTAIN
CONDITION:  F1107:IAbstentionAuditService.LogAbstentionAsync() called AFTER response returned to caller
CHECK:
  OTel trace: span(abstention_audit).end_time > span(response_returned).start_time → CONFLICT
RESOLUTION OPTIONS:
  REFACTOR: Audit must be awaited BEFORE BuildResponseAsync() returns
  REJECT: Block generated code if audit-after-response ordering detected
PROTECTS: Audit log completeness; prevents lost abstention events if response call fails
```

## CF-521: Eval Run Uses Production RAG Index
```
TYPE:       ISOLATION
SEVERITY:   HIGH
TRIGGER:    F1112:IEvaluationSchedulerService.ScheduleEvalRunAsync()
CONDITION:  Eval queries route to production index instead of isolated eval index
CHECK:
  Eval run config must contain: eval_index_prefix ≠ production_index_prefix
  If same → CONFLICT (eval load pollutes production metrics; eval results polluted by prod state)
RESOLUTION OPTIONS:
  REFACTOR: Create shadow eval index; snapshot production index for eval runs
  REJECT: Block eval run if index config targets production
PROTECTS: Production performance SLOs; eval result validity
```

## CF-522: RAGAS LLM Evaluator Calls Not Logged
```
TYPE:       COST
SEVERITY:   MEDIUM
TRIGGER:    F1111:IRagasMetricsService evaluator LLM calls
CONDITION:  F1118:IGenAiEventLogService.LogEventAsync() not called for each evaluator call
CHECK:
  AF-7 Compliance: every IAiProvider.GenerateAsync() call in evaluation path → must have paired F1118 log
RESOLUTION OPTIONS:
  REFACTOR: Wrap all evaluator calls with F1118 logging
PROTECTS: Cost visibility; prevents surprise billing from high-volume eval runs
```

## CF-523: Tenant RAG Index Naming Pattern Violation
```
TYPE:       NAMING
SEVERITY:   HIGH
TRIGGER:    F1084:IBm25IndexService or F1085:IVectorIndexService index creation for tenant
CONDITION:  Index name does NOT follow pattern: {env}-rag-{type}-{tenantId}
            (e.g., prod-rag-bm25-tenant123 | prod-rag-vector-tenant123)
CHECK:
  Index name regex: ^[a-z]+-rag-(bm25|vector|manifest|eval)-[a-z0-9-]+$
  Failure → CONFLICT
RESOLUTION OPTIONS:
  REFACTOR: Rename index at provisioning time
  REJECT: Block index creation if pattern invalid
PROTECTS: Operations (index management, backup, monitoring rely on naming pattern)
```

## CF-524: Cross-Tenant Alias Sharing in RAG Indices
```
TYPE:       ALIAS
SEVERITY:   CRITICAL
TRIGGER:    Any Elasticsearch alias creation across FLOW-32 indices
CONDITION:  An alias points to indices from > 1 tenantId
CHECK:
  IEntityRegistry: alias → index mapping → validate all indices in alias belong to same tenantId
  Cross-tenant alias → CONFLICT
RESOLUTION OPTIONS:
  REJECT: Block alias creation. Cross-tenant aliasing forbidden.
  COMPAT_WRAPPER: Use per-tenant aliases only ({env}-rag-bm25-{tenantId}-alias)
PROTECTS: Multi-tenant data isolation (DNA-5); prevents cross-tenant data leakage via alias
```

## CF-525: Fallback Responses Indexed by FLOW-09 Content Indexer
```
TYPE:       FLOW_BOUNDARY
SEVERITY:   MEDIUM
TRIGGER:    F1105:IFallbackResponseService or F1108:IGradedResponseBuilder output
CONDITION:  Fallback response published to event bus consumed by FLOW-09 content indexing pipeline
CHECK:
  Fallback response event payload must NOT include content_type: "indexable"
  Must include: content_type: "response_only" (consumed only by UI layer, not indexers)
RESOLUTION OPTIONS:
  REFACTOR: Add content_type field to fallback response schema; filter in FLOW-09 consumer
  REJECT: Block fallback response event if content_type missing
PROTECTS: FLOW-09 search index quality (prevents low-confidence RAG responses polluting search index)
```

---

# SECTION 2 — STRESS TESTS (ST-300–ST-315)

## ST-300: Bootstrap With Zero Existing Sources
**Testing: T389 + T396 bootstrap when source catalog is empty**

### Setup
```
Condition: New tenant provisioned. Source catalog contains 0 sources.
Expected: Bootstrap completes with coverage = 0%. blockServingIfBelowThreshold=true → system not activated.
```

### BFA Trace
```
STEP 1 (Change Detection): Detects rag.bootstrap.requested for tenant with no sources
STEP 2 (Registry Refresh): F1081 returns empty source list
STEP 3 (Context Discovery): F1120 coverage analysis: 0 task types covered
STEP 4 (Collision Analysis): CF-513 evaluates: bootstrap validation must pass before canary
  → F1122.ValidateCoverageAsync() returns is_ready: false
  → canary blocked
STEP 5 (Resolution Menu): Presented to admin:
  REFACTOR: Register sources and re-trigger bootstrap
  COMPAT_WRAPPER: Activate with default strategy (hybrid, no source filtering)
  FORCE_PROCEED: Require admin explicit override
STEP 6 (Outcome): System correctly blocks serving. Alert fired via F1119.
```

**VERDICT: ✅ CF-513 gate works correctly. Coverage 0% → serving blocked.**

---

## ST-301: RAG Index Name Collision with FLOW-09
**Testing: CF-510 prevents index naming overlap**

### Setup
```
Condition: FLOW-09 has index alias "search-{tenantId}-v1". 
           FLOW-32 attempts to create BM25 index "search-{tenantId}-v1".
```

### BFA Trace
```
STEP 1: IChangeDetector: index creation request for "search-{tenantId}-v1"
STEP 2: IEntityRegistry: finds "search-{tenantId}-v1" registered by FLOW-09
STEP 3: Context Discovery: F261 (ISearchIndexService) owns alias
STEP 4: Collision Analysis: CF-510 fires — CRITICAL severity
STEP 5: Resolution Menu:
  REFACTOR: Rename to "rag-bm25-{tenantId}-v1"
  REJECT: Block RAG index creation
STEP 6: Engineer selects REFACTOR. Engine regenerates with "rag-" prefix.
```

**VERDICT: ✅ CF-510 catches collision. FLOW-09 search unaffected.**

---

## ST-302: Vector Dimension Mismatch Mid-Ingestion
**Testing: CF-515 catches dimension error before corrupt write**

### Setup
```
Condition: Embedding model registered as "text-embedding-3-large" (dim=3072).
           Chunk submitted with vector of dim=1536 (wrong model used in enrichment).
```

### BFA Trace
```
STEP 1: F1085.IndexChunkAsync() called with 1536-dim vector
STEP 2: F1094.GetSchemaAsync("embedding_model_registry") → expected_dim = 3072
STEP 3: actual_dim (1536) ≠ expected_dim (3072) → CF-515 fires
STEP 4: DataProcessResult.Fail("DIMENSION_MISMATCH: expected 3072, got 1536")
STEP 5: Pipeline pauses. Checkpoint written. Alert via F1119.
STEP 6: Engineer fix: re-embed chunk with correct model. Resume from checkpoint.
```

**VERDICT: ✅ CF-515 prevents corrupt vector index write. Resumability works.**

---

## ST-303: Cross-Tenant Cache Hit Attack
**Testing: CF-516 prevents tenant B reading tenant A cached results**

### Setup
```
Condition: Tenant A queries "What is MicroserviceBase?" → cached with key = hash("What is MicroserviceBase?").
           Tenant B queries same question → cache lookup.
           IF cache key has no tenantId → tenant B gets tenant A's results (data leak).
```

### BFA Trace
```
STEP 1: AF-8 Security scan reviews F1089 cache key construction in generated code
STEP 2: Finds cache key = hash(query + filters) — tenantId ABSENT
STEP 3: CF-516 fires — CRITICAL severity
STEP 4: Resolution: REJECT — block generated code
STEP 5: AF-1 Genesis regenerates with: hash(query + sorted(filters) + tenantId)
STEP 6: AF-8 re-scan confirms fix. Code promoted.
```

**VERDICT: ✅ CF-516 catches security flaw at generation time. Tenant isolation preserved.**

---

## ST-304: Reranker Receives Non-Security-Trimmed Results
**Testing: CF-519 blocks reranker from seeing untrimmed chunks**

### Setup
```
Condition: T392 DAG generated without F1087 security trim step before F1090 reranker.
           User with limited ACL submits query. Reranker receives chunks from restricted sources.
```

### BFA Trace
```
STEP 1: AF-8 traces data flow in generated T392 DAG
STEP 2: Finds: F1083 recall → F1090 reranker (F1087 security trim ABSENT)
STEP 3: CF-519 fires — CRITICAL severity
STEP 4: Resolution: REJECT — block generated DAG
STEP 5: AF-2 Planning regenerates T392 DAG with F1087 inserted between F1083 and F1090
STEP 6: AF-8 re-confirms. DAG promoted.
```

**VERDICT: ✅ CF-519 catches missing security trim. No unauthorized chunk reaches reranker.**

---

## ST-305: Abstention Audit After Response Returned
**Testing: CF-520 ordering enforcement**

### Setup
```
Condition: Generated T398 code: builds response → returns to caller → logs abstention.
           If service crashes between return and log → abstention event lost.
```

### BFA Trace
```
STEP 1: OTel trace analysis: span(abstention_audit).start_time > span(response_returned).end_time
STEP 2: CF-520 fires — HIGH severity
STEP 3: Resolution: REFACTOR — audit must complete before response returned
STEP 5: AF-1 Genesis regenerates: await audit.LogAbstentionAsync(); then return response.
STEP 6: OTel re-trace confirms ordering. Code promoted.
```

**VERDICT: ✅ CF-520 catches wrong ordering. Audit guaranteed before response.**

---

## ST-306: Canary Ramp Without Bootstrap Validation
**Testing: CF-513 blocks premature canary activation**

### Setup
```
Condition: Engineer manually calls ICanaryRolloutService.SetCanaryPercentAsync(5) 
           before bootstrap validation has completed.
```

### BFA Trace
```
STEP 1: IChangeDetector: canary ramp requested (percent=5)
STEP 2: IEntityRegistry: bootstrap manifest for tenantId → bootstrap_validation_passed = null
STEP 3: CF-513 fires — CRITICAL severity
STEP 4: Resolution: REJECT — block canary activation
STEP 5: Alert fired. Engineer triggers T396 cold start seed first.
STEP 6: After T396 + F1122 validation pass → bootstrap_validation_passed = true → canary proceeds.
```

**VERDICT: ✅ CF-513 gate works. Customers not served from under-indexed RAG.**

---

## ST-307: Multi-Tenant Alias Sharing (Cross-Tenant Data Leak via Alias)
**Testing: CF-524 prevents cross-tenant alias**

### Setup
```
Condition: Alias "rag-bm25-prod-alias" points to rag-bm25-{tenantA} AND rag-bm25-{tenantB}.
           Query from tenantA → alias → returns results from BOTH tenants.
```

### BFA Trace
```
STEP 1: IEntityRegistry maps alias → [tenantA-index, tenantB-index]
STEP 2: CF-524 fires — CRITICAL severity  
STEP 3: Resolution: REJECT — block alias. Engineer creates per-tenant aliases.
STEP 4: rag-bm25-{tenantA}-alias → tenantA index only
         rag-bm25-{tenantB}-alias → tenantB index only
STEP 5: Zero cross-tenant alias. CF-524 cleared.
```

**VERDICT: ✅ CF-524 catches cross-tenant alias. DNA-5 isolation enforced.**

---

## ST-308: Eval Run Targeting Production Index
**Testing: CF-521 isolation**

### Setup
```
Condition: Eval run config has eval_index_prefix = "prod-rag-" (same as production).
           10,000 synthetic eval queries flood production index → metrics polluted.
```

### BFA Trace
```
STEP 1: F1112 eval run config submitted
STEP 2: Config check: eval_index_prefix = production_index_prefix → CONFLICT
STEP 3: CF-521 fires — HIGH severity
STEP 4: Resolution: REFACTOR — add eval_index_prefix = "eval-rag-"
STEP 5: Eval run creates shadow snapshot. Production index untouched.
```

**VERDICT: ✅ CF-521 prevents eval load on production.**

---

## ST-309: RAGAS LLM Costs Not Logged
**Testing: CF-522 mandatory cost tracking**

### Setup
```
Condition: AF-7 compliance scan on generated T393 code.
           F1111.ComputeFaithfulnessAsync() calls IAiProvider.GenerateAsync() — 
           no paired F1118.LogEventAsync() call found.
```

### BFA Trace
```
STEP 1: AF-7 scans all IAiProvider.GenerateAsync() calls in T393 generated code
STEP 2: Finds: F1111 evaluator call — no F1118 log wrapper
STEP 3: CF-522 fires — MEDIUM severity
STEP 4: AF-1 Genesis regenerates with F1118 logging wrapper on all evaluator calls
STEP 5: AF-7 re-scan confirms. Cost visibility restored.
```

**VERDICT: ✅ CF-522 catches missing cost log. All LLM costs visible.**

---

## ST-310: Fallback Response Indexed by FLOW-09
**Testing: CF-525 flow boundary enforcement**

### Setup
```
Condition: HEDGE fallback response published on event bus.
           FLOW-09 content indexer consumes "response.generated" events → indexes fallback.
           Next search query returns a low-confidence hedged answer as "authoritative" content.
```

### BFA Trace
```
STEP 1: IEntityRegistry: F1108 publishes response.generated event
STEP 2: FLOW-09 ISearchIndexService registered as consumer of response.generated
STEP 3: CF-525 fires — MEDIUM severity
STEP 4: Resolution: REFACTOR
  - F1108 adds content_type: "response_only" to fallback event payload
  - FLOW-09 consumer adds filter: skip if content_type = "response_only"
STEP 5: Fallback responses no longer indexed. Search quality preserved.
```

**VERDICT: ✅ CF-525 prevents hedged answers polluting search index.**

---

## ST-311: Routing Activates Before Skill Mapping Populated
**Testing: CF-517 ordering dependency**

### Setup
```
Condition: New tenant RAG bootstrap. T391 routing receives first query.
           F1100 skill mapping index not yet seeded (cold start seeder still running).
           All queries get default "hybrid, all sources" strategy (degraded quality).
```

### BFA Trace
```
STEP 1: F1099 routing called. F1100 returns empty skill list for task type.
STEP 2: Manifest check: skill_mapping_index_seeded = null
STEP 3: CF-517 fires — HIGH severity
STEP 4: Resolution: COMPAT_WRAPPER
  - Queue query with retry
  - Use default strategy (hybrid, all sources) with degraded-quality flag
  - Alert admin: routing quality degraded until T396 seeding complete
STEP 5: After T396 completes, CF-517 clears. Full routing resumes.
```

**VERDICT: ✅ CF-517 catches ordering gap. Degraded-mode fallback with alert.**

---

## ST-312: Synthetic Queries Without Synthetic Flag
**Testing: T394 Iron Rule — synthetic tagging**

### Setup
```
Condition: Generated T394 code stores synthetic queries in golden set without setting synthetic: true.
           Next eval run uses synthetic + real queries mixed without differentiation.
           Results: inflated precision (synthetic are trivially answerable from their source chunks).
```

### BFA Trace
```
STEP 1: AF-7 Compliance: scans T394 generated code
STEP 2: Finds F1109.AddGoldenQueryAsync() called without synthetic: true in query dict
STEP 3: T394 Iron Rule violation — BUILD FAILURE
STEP 4: AF-1 Genesis regenerates with synthetic: true in all F1110 output
STEP 5: AF-7 re-scan confirms. Code promoted.
```

**VERDICT: ✅ Synthetic flag enforced. Golden set quality preserved.**

---

## ST-313: ABSTAIN Verdict Returns Factual Claim
**Testing: T398 Iron Rule — no hallucination on ABSTAIN**

### Setup
```
Condition: Generated T398 code. Confidence score = 0.25 (ABSTAIN). 
           LLM fallback template called — LLM generates: "Based on context, X is defined as..."
           This is a factual claim invented by LLM when retrieval failed.
```

### BFA Trace
```
STEP 1: AF-8 Security + AF-9 Judge scan T398 generated code
STEP 2: ABSTAIN path calls F1105 with LLM enabled → LLM can generate facts
STEP 3: T398 Iron Rule violation — BUILD FAILURE
STEP 4: AF-1 Genesis regenerates: ABSTAIN verdict → F1105 uses STATIC template only
  Template: "I cannot find a reliable answer in the available sources. 
             Related sources: {source_list}. Please consult: {escalation_path}"
STEP 5: AF-9 confirms: no LLM call on ABSTAIN path. Code promoted.
```

**VERDICT: ✅ ABSTAIN path generates zero invented facts.**

---

## ST-314: BM25 Sequential Instead of Parallel (T390 Iron Rule)
**Testing: parallel recall enforcement**

### Setup
```
Condition: Generated T390 code: await bm25Result = F1084.SearchAsync(); 
           await vectorResult = F1085.SearchAsync(); (sequential)
           Latency = BM25_latency + vector_latency (additive) instead of max(both).
           P95 violation: 500ms + 500ms = 1000ms vs parallel P95 500ms.
```

### BFA Trace
```
STEP 1: AF-6 Code Review: static analysis of generated T390
STEP 2: Finds sequential await pattern on F1084 + F1085 calls
STEP 3: T390 Iron Rule violation — BUILD FAILURE
STEP 4: AF-1 Genesis regenerates with Task.WhenAll([bm25Task, vectorTask])
STEP 5: AF-6 re-scan confirms parallel execution. P95 latency budget met.
```

**VERDICT: ✅ Parallel recall enforced. Latency budget preserved.**

---

## ST-315: Canary Rollback Trigger Silent (No Alert)
**Testing: F1123 rollback must emit audit event**

### Setup
```
Condition: Precision@K drops from 0.80 to 0.65 after canary ramp to 20%.
           F1123.RollbackAsync() called. Canary set to 0%.
           No alert event emitted → ops team unaware of rollback.
```

### BFA Trace
```
STEP 1: F1112 eval comparison: precision drop = 0.15 (> 0.05 threshold)
STEP 2: F1123.RollbackAsync() triggered
STEP 3: AF-9 Judge checks: F1119 alert event must be emitted within 60s of rollback
STEP 4: Generated code: canary_percent → 0 but no F1119.FireAlertAsync() call
STEP 5: T389 Iron Rule violation: rollback must always be audited + alerted
STEP 6: AF-1 Genesis regenerates: RollbackAsync() includes:
  await _alertService.FireAlertAsync({type: "CANARY_ROLLBACK", reason, precision_drop}, tenantId)
  await _abstentionAudit.LogAbstentionAsync({event: "CANARY_ROLLBACK"}, tenantId)
STEP 7: AF-8 confirms no silent rollback. Ops always notified.
```

**VERDICT: ✅ Rollback always audited and alerted. No silent failures.**

---

# SECTION 3 — STRESS TEST SUMMARY

| Test | Conflict Rule | Severity | Result |
|------|--------------|----------|--------|
| ST-300 | CF-513 | CRITICAL | ✅ Bootstrap validation gate works |
| ST-301 | CF-510 | CRITICAL | ✅ Index naming conflict caught |
| ST-302 | CF-515 | CRITICAL | ✅ Dimension mismatch prevented |
| ST-303 | CF-516 | CRITICAL | ✅ Cache key isolation enforced |
| ST-304 | CF-519 | CRITICAL | ✅ Security trim ordering enforced |
| ST-305 | CF-520 | HIGH | ✅ Audit before response ordering fixed |
| ST-306 | CF-513 | CRITICAL | ✅ Canary blocked without validation |
| ST-307 | CF-524 | CRITICAL | ✅ Cross-tenant alias blocked |
| ST-308 | CF-521 | HIGH | ✅ Eval uses isolated index |
| ST-309 | CF-522 | MEDIUM | ✅ LLM costs logged |
| ST-310 | CF-525 | MEDIUM | ✅ Fallback not indexed by FLOW-09 |
| ST-311 | CF-517 | HIGH | ✅ Routing degraded mode + alert |
| ST-312 | T394 Iron Rule | BUILD FAIL | ✅ Synthetic flag enforced |
| ST-313 | T398 Iron Rule | BUILD FAIL | ✅ ABSTAIN generates no facts |
| ST-314 | T390 Iron Rule | BUILD FAIL | ✅ Parallel recall enforced |
| ST-315 | T389 Iron Rule | BUILD FAIL | ✅ Rollback always alerted |

**All 16 stress tests PASS. Zero undetected failures.**

---

# SECTION 4 — BACKWARD COMPATIBILITY

- CF-1–CF-509: UNCHANGED
- ST-1–ST-299: UNCHANGED
- FLOW-32 conflict rules are additive only
- FLOW-32 does not modify BFA rules for existing flows (FLOW-01 through FLOW-25)
- New entities registered in BFA: rag-bm25-*, rag-vector-*, rag-manifest-*, rag-eval-*, rag-routing-*
