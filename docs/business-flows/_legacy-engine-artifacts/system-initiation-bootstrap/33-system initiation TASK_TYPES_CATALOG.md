# FLOW-33 — System Initiation: Self-Building Bootstrap Engine
## TASK TYPES CATALOG — Engine Contract Extension

**FLOW Reference:** FLOW-33  
**Backward Compatibility:** T1-T246 UNCHANGED  
**New Task Types:** T247-T253  
**New Templates:** Template 50-55  

---

## TASK TYPE: T247 — Platform Bootstrap Orchestration

**ARCHETYPE:** ORCHESTRATION  
**ENTRY:** Fires on `PlatformBootRequested` OR when bootstrap sentinel is missing/outdated in Elasticsearch  
**PURPOSE:** Execute the full platform bootstrap sequence — schema registration, plan bundle import, GraphRAG seeding, core flow compilation, smoke test — in a resumable, idempotent DAG. This is the first real flow the system ever runs.

**DISTINCT FROM:**
- T103 (Tenant Onboarding) — T103 onboards a business tenant; T247 bootstraps the SYSTEM itself
- T53 (Flow Compile) — T53 compiles a single flow; T247 orchestrates the entire bootstrap pipeline including T53
- T54 (Flow Run) — T54 runs a compiled flow; T247 triggers T54 as its smoke test step

**FACTORY DEPENDENCIES:** F631, F632, F633, F635, F190, F191, F192, F194 — resolved via CreateAsync()  
**FABRIC RESOLUTION:**
- F631 → DATABASE FABRIC (Elasticsearch) + QUEUE FABRIC (Redis Streams)
- F632 → DATABASE FABRIC (Elasticsearch) + RAG FABRIC (Vector)
- F633 → DATABASE FABRIC (PostgreSQL + Elasticsearch)
- F635 → DATABASE FABRIC via F65 (GraphAI/Neo4j)
- F190 → FLOW ENGINE FABRIC (FlowDefinition storage in ES)
- F191 → FLOW ENGINE FABRIC (FlowValidation)
- F192 → FLOW ENGINE FABRIC (FlowRuntime)
- F194 → DATABASE FABRIC (SchemaRegistry in ES)

**FLOW TEMPLATE:** Template 50 — `platform-bootstrap-v1`

**Flow DAG (no-code orchestration):**
```
Trigger: PlatformBootRequested (or first-run sentinel absent)
  ↓
1. check_sentinel           F631:CheckBootstrapStatus
   ↓ (if already CORE, skip to terminal)
2. register_core_schemas    F194:RegisterSchema
   Output: CoreSchemasRegistered
  ↓
3. import_plan_bundle       F632:ValidatePlanBundle → F632:IngestSourceDocuments → F632:CompileRegistry
   Output: PlanBundleImported
  ↓
4. seed_graph_catalog       F635:InitializeGraphSchema → F635:SeedCatalogGraph
   Output: GraphCatalogSeeded
  ↓
5. coverage_scan            F191:CheckFactoryRegistry
   Output: CoverageScanCompleted
  ↓
  [Decision: missingFactories > 0?]
   ↳ YES → emit_capability_gaps (Queue: CapabilityGapDetected)
           → wait_for_gaps_resolved (wait event: CapabilityGapsResolved)
   ↳ NO  → compile_core_flows
  ↓
6. compile_core_flows       T53 via F190:StoreDefinition
   Output: CoreFlowsCompiled
  ↓
7. publish_core_flows       F190:PublishDefinition
   Output: CoreFlowsPublished
  ↓
8. smoke_run                T54 via F192:StartRun (FLOW-SMOKE-01)
   Output: SmokeRunCompleted
  ↓
9. bootstrap_done           F631:SetBootstrappedSentinel
   Emits: BootstrapCompleted
```

**AF CONFIGURATION:**
- AF-2 (Planning): decomposes T247 into phase-by-phase steps, validates against oracle counts
- AF-4 (RAG): retrieves SK-145 (Bootstrap Pattern), SK-146 (GraphRAG Init), SK-01 (Core Interfaces)
- AF-9 (Judge): validates DAG completeness, checks all factory dependencies resolve, verifies sentinel logic
- AF-11 (Feedback): stores bootstrap phase timings and coverage scan results for future improvement

**BFA VALIDATION:**
- CF-295: Validate PlanBundle ranges match session state oracle BEFORE any registry writes
- CF-296: Bootstrap sentinel MUST be written BEFORE BootstrapCompleted is emitted (outbox)
- CF-297: Schema registration for BootstrapCompleted schema MUST precede any event that emits it
- No conflict with FLOW-01–FLOW-17: T247 is SYSTEM scope, uses its own event namespace

**MACHINE/FREEDOM:**
- MACHINE: Phase order (schema → bundle → graph → coverage → compile → smoke → sentinel) — fixed
- MACHINE: Idempotency key = `platform-bootstrap-v1` — cannot change
- FREEDOM: `smokeFlowId`, `phaseTimeoutSeconds`, `requiredGateScore`, `graphValidationThreshold`

**IRON RULES:**
- MUST be idempotent — re-running produces identical state, no double-writes
- MUST abort if oracle validation fails (F632:ValidatePlanBundle returns valid=false)
- MUST NOT emit BootstrapCompleted before smoke run passes
- MUST persist phase state to ES before emitting phase event (outbox pattern)

**QUALITY GATES (AF-9 checks):**
- All 7 registry types populated with docCount matching oracle ranges
- GraphCatalogSeeded: familiesCount ≥ 83, factoriesCount ≥ 630, edgesCount > 0
- SmokeRun: statusCode = 'COMPLETED', no DLQ events
- BootstrapSentinel: version = desired version, completedAt set

---

## TASK TYPE: T248 — Plan Bundle Install Gate

**ARCHETYPE:** VALIDATION_GATE  
**ENTRY:** Fires after `PlanBundleUploaded` event — validates bundle before any registry mutation  
**PURPOSE:** Three-stage validation gate — (1) range integrity check vs session state oracle, (2) referential integrity check (all task dependencies exist in factory registry), (3) schema conformance check on extracted records. Fail-fast before any ES writes.

**DISTINCT FROM:**
- T247 (Bootstrap Orchestration) — T247 calls T248 as a sub-step; T248 can run standalone for incremental updates
- T68 (Schema Validation) — T68 validates event schemas; T248 validates plan bundle structural integrity

**FACTORY DEPENDENCIES:** F632, F194, F191 — resolved via CreateAsync()  
**FABRIC RESOLUTION:**
- F632 → DATABASE FABRIC (Elasticsearch) + RAG FABRIC (Vector)
- F194 → DATABASE FABRIC (ES — SchemaRegistry)
- F191 → FLOW ENGINE FABRIC (validation service)

**FLOW TEMPLATE:** Template 51 — `install-plan-bundle-v1`

**Flow DAG (no-code):**
```
1. parse_bundle_manifest   → extract ranges, sourceFiles, checksums
2. validate_ranges         F632:ValidatePlanBundle
   → check F1-F630, T1-T246, SK-1-SK-144, CF-1-CF-294, ST-1-ST-163, DD-1-DD-129, DR-1-DR-98
3. check_referential_integrity
   → every task dependency exists in factory range
   → every template references existing task types
   → every BFA rule references existing entities/events
4. validate_schema_conformance   F194:ValidateSchema
   → each extracted record conforms to registry schema
5. [Gate: all checks pass?]
   ↳ YES → emit PlanBundleValidated
   ↳ NO  → emit PlanBundleRejected (with structured error report) → DLQ
```

**AF CONFIGURATION:**
- AF-4 (RAG): retrieves SK-148 (Registry Compilation Pattern) + SK-149 (Referential Integrity)
- AF-9 (Judge): checks validation completeness — are all 7 artifact types checked?

**BFA VALIDATION:**
- CF-295: Range oracle check MUST run BEFORE referential integrity check
- CF-298: Rejected bundles MUST NOT partially update registries — rollback required

**MACHINE/FREEDOM:**
- MACHINE: All 3 validation stages mandatory and in order
- FREEDOM: `strictMode` (allow minor range gaps), `checksumAlgorithm`, `rejectionWebhook`

**IRON RULES:**
- MUST check ranges BEFORE writing anything to ES
- Partial validation failures MUST produce structured error report with exact gap location

**QUALITY GATES (AF-9):**
- All artifact type ranges validated (7 types)
- Zero referential integrity violations
- Schema conformance: 100% of extracted records pass

---

## TASK TYPE: T249 — GraphRAG Catalog Seed

**ARCHETYPE:** INFRASTRUCTURE_INIT  
**ENTRY:** Fires after `PlanBundleImported` during bootstrap, OR when graph integrity check detects missing nodes  
**PURPOSE:** Creates and validates the two-layer GraphRAG from the compiled registries. Catalog Graph (static plan connectivity) + Impact Graph (dynamic provider-test-flow links). Multi-tenant partitioned. Self-healing — reruns are safe.

**DISTINCT FROM:**
- T59 (Graph RAG Query) — T59 queries the graph; T249 builds and seeds it
- T248 (Install Gate) — T248 validates the bundle; T249 writes the graph from validated registries

**FACTORY DEPENDENCIES:** F635, F633, F632, F65 — resolved via CreateAsync()  
**FABRIC RESOLUTION:**
- F635 → DATABASE FABRIC via F65 (IGraphAiProvider — Neo4j/Neptune provider)
- F633 → DATABASE FABRIC (PostgreSQL + ES — Implementation Registry)
- F632 → DATABASE FABRIC (Elasticsearch — source registries)
- F65 → DATABASE FABRIC (GraphAI fabric — resolved at runtime via config)

**FLOW TEMPLATE:** Template 52 — `seed-graph-catalog-v1`

**Flow DAG (no-code):**
```
1. init_graph_schema       F635:InitializeGraphSchema
   → create constraints + indexes (unique id per label, scope+tenantId index)
2. create_family_nodes     → parse family_registry → F635 graph upsert
3. create_factory_nodes    → parse factory_registry → F635 graph upsert  
4. create_method_nodes     → derive methods from factory records → F635 graph upsert
5. create_tasktype_nodes   → parse task_type_registry → F635 graph upsert
6. create_skill_nodes      → parse skill_registry → F635 graph upsert
7. create_template_nodes   → parse flow_template_registry → F635 graph upsert
8. create_bfarule_nodes    → parse bfa_rule_registry → F635 graph upsert
9. wire_catalog_edges      → HAS_FACTORY, HAS_METHOD, DEPENDS_ON, USES_SKILL, 
                              IMPLEMENTS_TASK, USES_FACTORY, APPLIES_TO
10. validate_graph         F635:ValidateGraphIntegrity
    → counts match oracle, no dangling edges
11. store_query_templates  → Q1/Q2/Q3 stored in prompt_registry (F640)
12. emit GraphCatalogSeeded { familiesCount, factoriesCount, edgesCount }
```

**AF CONFIGURATION:**
- AF-4 (RAG): retrieves SK-146 (GraphRAG Init Pattern), SK-147 (Graph Schema)
- AF-9 (Judge): validates node counts ≥ oracle values, all query templates resolvable

**BFA VALIDATION:**
- CF-299: Graph seeding MUST use F635 via CreateAsync() — never Neo4j driver directly
- CF-300: tenantId = 'SYSTEM' on ALL catalog graph nodes — cross-tenant contamination = FAIL
- CF-301: Graph integrity check MUST run before emitting GraphCatalogSeeded

**MACHINE/FREEDOM:**
- MACHINE: Node/edge types and relationship names — fixed (documented in F635)
- MACHINE: Scope field on every node — non-negotiable
- FREEDOM: `graphProvider` (Neo4j/Neptune), `batchSize`, `parallelNodeCreation`

**IRON RULES:**
- MUST validate counts ≥ oracle BEFORE emitting success event
- MUST NOT create cross-scope edges (SYSTEM ↔ TENANT)
- Q1/Q2/Q3 query templates MUST be stored and resolvable before seeding is marked complete

**QUALITY GATES (AF-9):**
- familiesCount ≥ 83 (existing) + 2 (new FLOW-33)
- factoriesCount ≥ 630 (existing) + 10 (new FLOW-33)
- All DEPENDS_ON edges resolve to existing Factory nodes
- Q1/Q2/Q3 execute without errors against seeded graph

---

## TASK TYPE: T250 — Implement-Family Meta-Loop

**ARCHETYPE:** GENERATION_ORCHESTRATION  
**ENTRY:** Fires on `FamilyImplementationRequested { familyId, targetProviders[], priority }`  
**PURPOSE:** The central "self-building" loop. Given a family spec, orchestrates ContextPack retrieval → multi-model generation → 5-arbiter validation → retry loop → local deploy → smoke test → artifact publication. Can run N families in parallel ("factories side by side").

**DISTINCT FROM:**
- T44+ (specific flow task types) — those generate domain flows; T250 generates the factories themselves
- T58 (Self-Extend) — T58 generates new engine contracts; T250 implements an already-specified factory family

**FACTORY DEPENDENCIES:** F634, F636, F637, F638, F639, F640, F55, F192, F633 — resolved via CreateAsync()  
**FABRIC RESOLUTION:**
- F634 → DATABASE FABRIC (ES) + RAG FABRIC (Hybrid)
- F636 → FLOW ENGINE FABRIC + AI ENGINE FABRIC (AiDispatcher)
- F637 → AI ENGINE FABRIC (AiDispatcher) + DATABASE FABRIC (ES)
- F638 → RAG FABRIC (Hybrid: Graph+Vector+Merge) + DATABASE FABRIC via F65
- F639 → DATABASE FABRIC via F65 (Impact Graph) + QUEUE FABRIC
- F640 → DATABASE FABRIC (ES) + RAG FABRIC (Vector)
- F55 → EXECUTION FABRIC (CiCd — local runner mode)
- F192 → FLOW ENGINE FABRIC (FlowRuntime)
- F633 → DATABASE FABRIC (PG+ES — Implementation Registry)

**FLOW TEMPLATE:** Template 53 — `implement-family-v1`

**Flow DAG (no-code):**
```
Trigger: FamilyImplementationRequested
  ↓
1. load_family_spec         F634:GetFamilySkillPack
2. build_context_pack       F638:BuildForFamily (Hybrid RAG)
3. build_node_prompt        F640:BuildNodePrompt (AF1 template + ContextPack)
  ↓
4. generate_candidates      AF-5: AiDispatcher multi-model parallel
   [OpenAI / Claude / Gemini / DeepSeek] → N candidate implementations
5. merge_candidates         AF-10: select/merge best candidate
  ↓
6. arbiter_loop             F637:RunArbiters (all 5 must pass)
   ┌─────────────────────────────────────────────────┐
   │ A: COVERAGE  B: SECURITY  C: DNA  D: TEST  E: BFA │
   └─────────────────────────────────────────────────┘
   [Arbiter passes? YES → continue]
   [ANY fails → F637:BuildArbiterPrompt (with failure trace) → back to step 4]
   [Iteration > maxIterations → FamilyImplementationFailed → DLQ]
  ↓
7. local_deploy             F55:ICiCdProvider (local runner: dotnet build + dotnet test)
8. e2e_smoke_run            F192:StartRun (smoke flow for this family)
9. publish_artifacts        F633:UpdateImplementationStatus (→ INJECTED tier)
10. store_feedback          AF-11: F640:RecordPromptFeedback
11. emit FamilyImplementationCompleted { familyId, iterations, judgeScore }
```

**AF CONFIGURATION:**
- AF-1 (Genesis): generates implementation code from ContextPack + node prompt
- AF-4 (RAG): F638:BuildForFamily — retrieves all family context
- AF-5 (Multi-model): runs N providers in parallel (config-driven count)
- AF-6 (Code Review): automated review pass before arbiters
- AF-7 (Compliance): DNA-1..9 scan before arbiters
- AF-8 (Security): security scan (part of ARBITER-B)
- AF-9 (Judge): overall quality gate after all arbiters pass
- AF-10 (Merge): combines multi-model outputs
- AF-11 (Feedback): stores per-run outcome for prompt evolution

**BFA VALIDATION:**
- CF-302: Generated code MUST register all entities in BFA indices before promotion
- CF-303: Multi-model candidates MUST be isolated — no cross-contamination between models
- CF-304: Arbiter retry loop MUST propagate exact failure trace to next generation attempt
- Checks against FLOW-01–FLOW-17: entity/event name collisions with existing BFA indices

**MACHINE/FREEDOM:**
- MACHINE: Arbiter order and all 5 arbiters mandatory
- MACHINE: AF station order (AF-5 → AF-10 → AF-7 → AF-9) within loop
- MACHINE: Maximum iterations = 10 (no config override)
- FREEDOM: `modelProviders[]`, `parallelModelCount`, `contextPackTokenBudget`, 
           `deployTarget`, `smokeFlowId`, `promotionTierOnSuccess`

**IRON RULES:**
- ALL 5 arbiters MUST pass — no "partial pass" (e.g., BFA failing is not acceptable even if DNA passes)
- Generated code MUST NOT import specific providers (PostgreSQL, Redis, OpenAI) — always through fabric
- Generated code MUST extend MicroserviceBase — no exceptions
- Failure trace from arbiter MUST be verbatim in next generation prompt — not summarized

**QUALITY GATES (AF-9):**
- judgeScore ≥ minJudgeScore (freedom config, default 85/100)
- Local deploy: 0 build errors, 0 test failures
- Smoke run: all flow nodes complete, no DLQ events
- Implementation Registry: status = INJECTED with evidence (commitHash + ciRunId)

---

## TASK TYPE: T251 — Arbiter Consensus Gate

**ARCHETYPE:** VALIDATION_GATE  
**ENTRY:** Fires within T250 implement-family loop after each candidate generation  
**PURPOSE:** The 5-arbiter validation engine as a standalone task type — can be called independently for validating any generated artifact, not just factory implementations. Returns structured pass/fail with exact failure traces per arbiter.

**DISTINCT FROM:**
- T250 (Implement-Family) — T250 orchestrates the full loop; T251 is the arbiter gate node within it
- T45 (Quality Gate in other flows) — T251 is specialized for code generation artifacts with DNA + fabric rules

**FACTORY DEPENDENCIES:** F637, F638, F640 — resolved via CreateAsync()  
**FABRIC RESOLUTION:**
- F637 → AI ENGINE FABRIC (AiDispatcher) + DATABASE FABRIC (ES)
- F638 → RAG FABRIC (Hybrid) + DATABASE FABRIC via F65
- F640 → DATABASE FABRIC (ES)

**FLOW TEMPLATE:** Template 54 — `arbiter-consensus-v1`

**Flow DAG (no-code):**
```
1. build_arbiter_context    F638:BuildForFactory (get relevant BFA rules, DNA checklist)
2. run_arbiters_parallel    F637:RunArbiters
   [COVERAGE] [SECURITY] [DNA] [TESTING] [BFA] — run in parallel (faster)
3. collect_results          → { allPassed, results[{arbiterId, passed, score, failureTrace}] }
4. [Decision: allPassed?]
   ↳ YES → emit ArbitersAllPassed { runId, minScore }
   ↳ NO  → emit ArbitersFailed { runId, failedArbiters[], traces[] }
              → store failure in implementation_registry (for trend analysis)
```

**AF CONFIGURATION:**
- AF-5 (Multi-model): Each arbiter uses AiDispatcher with model specialized for that arbiter type
- AF-9 (Judge): post-arbiter overall quality check (score aggregation)
- AF-11 (Feedback): stores per-arbiter scores + traces for prompt improvement

**BFA VALIDATION:**
- CF-304: Failure traces MUST be verbatim — no AI paraphrasing of the failure reason
- CF-305: Arbiter prompts MUST cite which ContextPack skills they used

**MACHINE/FREEDOM:**
- MACHINE: 5 arbiters always run (even if early ones fail — collect all failures)
- FREEDOM: `arbiterModelMap` (which model runs which arbiter), `minPassScore`

**IRON RULES:**
- Must collect ALL arbiter results before emitting decision (no short-circuit)
- Failure trace must include: arbiterId, specific DNA/BFA rule violated, line reference if available

**QUALITY GATES (AF-9):**
- All 5 arbiter results present in output
- Failure traces non-empty for failed arbiters

---

## TASK TYPE: T252 — Regression Impact Trigger

**ARCHETYPE:** CHANGE_DETECTION  
**ENTRY:** Fires on `FactoryContractChanged` or `ProviderImplementationChanged` events (from repo PR merge)  
**PURPOSE:** When a factory interface changes OR a provider adds/modifies a method, compute the full blast radius (providers + flows + test suites that must rerun) and trigger a regression run. Implements the "elastic must be retested when mongo gets a new method" rule.

**DISTINCT FROM:**
- T250 (Implement-Family) — T250 builds new; T252 retests existing when change is detected
- T54 (Flow Run) — T54 runs a specific flow; T252 determines WHICH flows need rerunning

**FACTORY DEPENDENCIES:** F639, F635, F633, F55, F192 — resolved via CreateAsync()  
**FABRIC RESOLUTION:**
- F639 → DATABASE FABRIC via F65 (Impact Graph) + QUEUE FABRIC (regression events)
- F635 → DATABASE FABRIC via F65 (GraphAI — impact queries)
- F633 → DATABASE FABRIC (PG+ES — implementation registry)
- F55 → EXECUTION FABRIC (CiCd — trigger test runs)
- F192 → FLOW ENGINE FABRIC (run smoke flows)

**FLOW TEMPLATE:** Template 55 — `regression-impact-v1`

**Flow DAG (no-code):**
```
Trigger: FactoryContractChanged { factoryId, changedMethods[], type }
  ↓
1. compute_impact           F639:ComputeImpact
   → impactedProviders[], impactedFlows[], impactedTestSuites[], compatibilityPatches[]
  ↓
2. check_compatibility      → any provider missing new methods?
   ↳ YES → emit CompatibilityPatchRequired (per missing provider) → T250 loop
   ↳ NO  → continue
  ↓
3. [Fork: parallel regression branches]
   Branch A: F55 trigger contract tests for ALL impacted providers
   Branch B: F192 run smoke flows for ALL impacted flow templates
  ↓
4. join_regression_results  → { allPassed: bool, failedProviders[], failedFlows[] }
  ↓
5. [Decision: allPassed?]
   ↳ YES → emit RegressionPassed { factoryId, coveredProviders, coveredFlows }
   ↳ NO  → emit RegressionFailed (with structured failure list) → create fix tasks
```

**AF CONFIGURATION:**
- AF-4 (RAG): F638:BuildForRegression — fetches impact context from graph
- AF-9 (Judge): validates completeness of impact computation vs graph oracle

**BFA VALIDATION:**
- CF-306: Regression scope MUST include ALL providers implementing the changed interface
- CF-295 (referenced): Regression results MUST be stored before closing the change event

**MACHINE/FREEDOM:**
- MACHINE: ALL impacted providers and flows must be tested — no selective skipping
- FREEDOM: `parallelTestWorkers`, `testTimeout`, `regressionFailureWebhook`

**IRON RULES:**
- MUST NOT close a FactoryContractChanged event without regression completion (or explicit override)
- MUST detect "missing method in provider" as a compatibility patch requirement — not a test failure

**QUALITY GATES (AF-9):**
- impactedProviders count matches Impact Graph query result
- All contract test suites for impacted providers executed

---

## TASK TYPE: T253 — ContextPack Assembly

**ARCHETYPE:** RETRIEVAL  
**ENTRY:** Called by any AF node that needs RAG context before generation  
**PURPOSE:** Standalone task type for Hybrid RAG ContextPack assembly. Can be called with any combination of familyId / factoryId / taskTypeId / customConstraints. Always returns a structured ContextPack within tokenBudget. Powers "deterministic, not random" generation.

**DISTINCT FROM:**
- T59 (Graph RAG Query) — T59 is a raw graph query; T253 assembles a full ContextPack (graph + vector + merge)
- T250/T251/T252 — those call T253 as a sub-step; T253 is reusable by any new task type

**FACTORY DEPENDENCIES:** F638, F634, F635, F640 — resolved via CreateAsync()  
**FABRIC RESOLUTION:**
- F638 → RAG FABRIC (Hybrid) + DATABASE FABRIC via F65 (Graph)
- F634 → DATABASE FABRIC (ES) + RAG FABRIC (Vector — skill retrieval)
- F635 → DATABASE FABRIC via F65 (GraphAI — catalog queries)
- F640 → DATABASE FABRIC (ES — prompt pack retrieval)

**Flow DAG (no-code):**
```
Input: { scope, familyId?, factoryIds[]?, taskTypeId?, ragStrategies[], tokenBudget }
  ↓
1. graph_query              F635:ExecuteGraphQuery (Q1 or Q2 or Q3 per input params)
2. vector_search            F634:BuildContextPack (vector search filtered by graph node IDs)
3. merge_deduplicate        → combine, rank by relevance, trim to tokenBudget
4. attach_prompt_templates  F640:GetBasePrompt (node-type-specific template)
5. return ContextPack (schema: skills[], taskContracts[], bfaRules[], 
                        codeSnippets[], priorJudgments[], providerMatrix[])
```

**AF CONFIGURATION:**
- AF-4 (RAG): this IS the AF-4 implementation
- AF-9 (Judge): validates ContextPack completeness (min 1 skill, min 1 taskContract)

**MACHINE/FREEDOM:**
- MACHINE: ContextPack schema (required fields non-negotiable)
- MACHINE: Graph query runs BEFORE vector search (not interchangeable)
- FREEDOM: `ragStrategies`, `tokenBudget`, `maxSkillCount`, `includePriorJudgments`

**IRON RULES:**
- MUST cite which skills are in the ContextPack — generation nodes MUST reference them
- MUST include at least one BFA rule if taskTypeId references factories with BFA hooks
- Vector search MUST be filtered by graph node IDs — no unfiltered semantic-only retrieval

**QUALITY GATES (AF-9):**
- skills[] non-empty
- taskContracts[] non-empty
- tokenUsed ≤ tokenBudget
- graphLinkedIds populated (traceability back to graph)

---

## TEMPLATE 50 — platform-bootstrap-v1

```json
{
  "flowId": "FLOW-BOOTSTRAP-PLATFORM",
  "name": "platform-bootstrap-v1",
  "version": 1,
  "flowType": "BOOTSTRAP",
  "taskType": "T247",
  "policies": {
    "idempotencyKey": "platform-bootstrap-v1",
    "tenantScope": "SYSTEM",
    "promotionTier": "CORE",
    "resumeEnabled": true,
    "auditAllSteps": true
  },
  "trigger": {
    "eventType": "PlatformBootRequested",
    "correlationKey": "platform",
    "debounce": { "windowSeconds": 30, "policy": "latest_wins" }
  },
  "nodes": [
    { "id": "check_sentinel",         "factory": "F631:IBootstrapService",            "method": "CheckBootstrapStatus" },
    { "id": "register_core_schemas",  "factory": "F194:ISchemaRegistryService",       "method": "RegisterSchema",    "dependsOn": ["check_sentinel"] },
    { "id": "import_plan_bundle",     "factory": "F632:IPlanBundleIngestionService",  "method": "IngestSourceDocuments", "dependsOn": ["register_core_schemas"] },
    { "id": "seed_graph_catalog",     "factory": "F635:IGraphCatalogSeeder",          "method": "SeedCatalogGraph",  "dependsOn": ["import_plan_bundle"] },
    { "id": "coverage_scan",          "factory": "F191:IFlowValidationService",       "method": "CheckFactoryRegistry", "dependsOn": ["seed_graph_catalog"] },
    { "id": "compile_core_flows",     "taskType": "T53", "factory": "F190:IFlowDefinitionService", "method": "StoreDefinition", "dependsOn": ["coverage_scan"] },
    { "id": "smoke_run",              "taskType": "T54", "factory": "F192:IFlowRuntimeService",    "method": "StartRun",        "dependsOn": ["compile_core_flows"] },
    { "id": "bootstrap_done",         "factory": "F631:IBootstrapService",            "method": "SetBootstrappedSentinel", "dependsOn": ["smoke_run"],
      "emits": ["BootstrapCompleted"] }
  ]
}
```

---

## TASK TYPES SUMMARY — FLOW-33

| ID | Name | Archetype | Template | Key Factories |
|----|------|-----------|----------|---------------|
| T247 | Platform Bootstrap Orchestration | ORCHESTRATION | 50 | F631,F632,F633,F635,F190-F192,F194 |
| T248 | Plan Bundle Install Gate | VALIDATION_GATE | 51 | F632,F194,F191 |
| T249 | GraphRAG Catalog Seed | INFRASTRUCTURE_INIT | 52 | F635,F633,F632,F65 |
| T250 | Implement-Family Meta-Loop | GENERATION_ORCHESTRATION | 53 | F634-F640,F55,F192,F633 |
| T251 | Arbiter Consensus Gate | VALIDATION_GATE | 54 | F637,F638,F640 |
| T252 | Regression Impact Trigger | CHANGE_DETECTION | 55 | F639,F635,F633,F55,F192 |
| T253 | ContextPack Assembly | RETRIEVAL | inline | F638,F634,F635,F640 |

---

## STATE CHECKPOINT

```yaml
FLOW_33_TASK_CATALOG_CHECKPOINT:
  status: COMPLETE
  new_task_types: T247-T253
  new_templates: 50-55
  next_task_type: T254
  next_template: 56
  backward_compatibility: T1-T246 unchanged
  all_factory_deps_declared: true
  all_fabric_resolutions_declared: true
  next_doc: SKILLS_FACTORY_RAG (SK-145-SK-153)
```
