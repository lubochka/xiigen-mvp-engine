# FLOW-33 — System Initiation: Self-Building Bootstrap Engine
## ENGINE ARCHITECTURE — Factory Registry Extension

**FLOW Reference:** FLOW-33  
**Domain:** System Initiation — Platform Bootstrap + Implement-Family Meta-Engine  
**Backward Compatibility:** F1-F630 (Families 1-83) UNCHANGED  
**New Factories:** F631-F640  
**New Families:** 84-85  
**Source Documents:** 33-system initiation.md, 33-system initiation deep research 2-8.md

---

## ANCHOR RULES (from basic_prompt.txt — always enforced)

- Every factory resolves through an existing FABRIC — never to a provider directly
- All services extend MicroserviceBase (CORE FABRIC / Skill 01)
- No typed models — Dictionary<string,object> via ParseDocument (DNA-1)
- DataProcessResult<T> on all returns — never throw for business logic (DNA-3)
- Scope isolation: tenantId on every query (DNA-5)
- DynamicController — no entity-specific controllers (DNA-6)

---

## FAMILY 84 — Platform Bootstrap Fabric

**Purpose:** Provides the "minimum kernel" needed for the system to install itself. Manages plan bundle ingestion, registry population, GraphRAG catalog seeding, and the implementation status registry. SYSTEM-scoped. Idempotent by design.

**Scope:** SYSTEM tenant. All operations keyed on `platform-bootstrap-v1` idempotency marker.

**Fabric Dependencies:**
- DATABASE FABRIC (Skill 05) → Elasticsearch (registry storage) + PostgreSQL (relational status)
- QUEUE FABRIC (Skill 04) → Redis Streams (bootstrap events)
- AI ENGINE FABRIC (Skill 07) → AiDispatcher (gap analysis)
- RAG FABRIC (Skill 00b) → IRagService Hybrid (graph+vector for catalog seeding)
- FLOW ENGINE FABRIC (Skill 09) → FlowOrchestrator (bootstrap flow execution)

---

### F631 — IBootstrapService

**Interface:** `IBootstrapService`  
**Family:** 84 — Platform Bootstrap Fabric  
**Fabric Resolution:** DATABASE FABRIC (Skill 05) → Elasticsearch provider + QUEUE FABRIC (Skill 04)

**Purpose:** Manages the bootstrap lifecycle — checks if already bootstrapped, advances the state machine, and writes/reads the bootstrap sentinel document.

**Methods:**
```
CheckBootstrapStatus(tenantId: string) → DataProcessResult<BootstrapStatusDoc>
  // Reads platform-config/bootstrap from ES; returns current phase + version

AdvanceBootstrapPhase(context: BootstrapPhaseContext) → DataProcessResult<BootstrapStatusDoc>
  // Idempotent phase advancement; skips if phase already complete
  // context: Dictionary<string,object> { phaseId, phaseVersion, outputSummary }

SetBootstrappedSentinel(tenantId: string, version: int) → DataProcessResult<bool>
  // Writes BootstrapCompleted sentinel; triggers BootstrapCompleted event via queue

ResetBootstrap(tenantId: string, reason: string) → DataProcessResult<bool>
  // MACHINE only — admin-triggered reset for re-installation
```

**DNA Compliance:**
- DNA-1: BootstrapStatusDoc = Dictionary<string,object> — no typed model
- DNA-2: BuildSearchFilter skips empty tenantId or phaseId
- DNA-3: All methods return DataProcessResult<T> — no throws
- DNA-5: tenantId = 'SYSTEM' for platform scope; per-tenant for tenant bootstrap

**MACHINE/FREEDOM:**
- MACHINE: Phase order is fixed (validate → ingest → graph → compile → test → sentinel)
- FREEDOM: `phaseTimeoutSeconds`, `retryPolicy`, `smokeFlowId` — admin-configurable

**Events Emitted:**
- `BootstrapPhaseAdvanced` → Queue (for orchestrator to trigger next node)
- `BootstrapCompleted` → Queue (platform enters "normal mode")
- `BootstrapFailed` → DLQ (with phase trace for recovery)

**Iron Rules:**
- MUST be idempotent — re-running does NOT double-create registries
- MUST write phase to ES before emitting phase event (outbox pattern)
- MUST NOT run if sentinel version >= desired version

---

### F632 — IPlanBundleIngestionService

**Interface:** `IPlanBundleIngestionService`  
**Family:** 84 — Platform Bootstrap Fabric  
**Fabric Resolution:** DATABASE FABRIC (Skill 05) → Elasticsearch (registry writes) + RAG FABRIC (Skill 00b) → Vector provider (chunk embedding)

**Purpose:** Translates the 7 merged plan documents into machine-readable runtime registries in Elasticsearch + vector chunks for RAG retrieval. This is the "plan → runtime artifacts" translation layer.

**Methods:**
```
ValidatePlanBundle(bundleRef: Dictionary<string,object>) → DataProcessResult<BundleValidationReport>
  // Checks that ranges match session state oracle (F1-F630, T1-T246, SK-1-SK-144…)
  // Returns: { valid: bool, gaps: [], mismatches: [] }

IngestSourceDocuments(bundleId: string, sources: List<Dictionary<string,object>>) 
  → DataProcessResult<IngestionSummary>
  // Chunks, embeds, and stores each source doc; links chunk metadata to artifact IDs
  // sources: [{ docType: 'ENGINE_ARCHITECTURE', path: '...', idRange: 'F1-F630' }]

CompileRegistry(registryType: string, sourceDocId: string) 
  → DataProcessResult<RegistryCompilationResult>
  // Parses source doc and emits canonical registry docs to ES
  // registryType: 'factory_registry' | 'task_type_registry' | 'skill_registry' | 
  //               'bfa_rule_registry' | 'stress_test_registry' | 'prompt_registry'

GenerateFamilySkillPacks(familyIds: List<string>) → DataProcessResult<SkillPackSummary>
  // Auto-derives FamilySkillPack docs by correlating skills' "Used by" lists with families

MarkBundleInstalled(bundleId: string, checksums: Dictionary<string,string>) 
  → DataProcessResult<bool>
  // Writes installed_plan_version + checksums; makes rerun safe (idempotent)
```

**DNA Compliance:**
- DNA-1: All registry records = Dictionary<string,object> — extractor produces dicts, not typed classes
- DNA-2: BuildSearchFilter on all registry lookups
- DNA-5: SYSTEM scope; tenantId = 'SYSTEM' on all writes

**MACHINE/FREEDOM:**
- MACHINE: Registry schema structure (factoryId, familyId, fabricResolution fields mandatory)
- FREEDOM: `chunkSize`, `embeddingModel`, `registryIndexPrefix` — admin-configurable

**Events Emitted:**
- `PlanBundleIngested` → Queue
- `RegistryCompiled { registryType, docCount }` → Queue
- `FamilySkillPacksGenerated` → Queue
- `PlanBundleInstalled` → Queue

**Iron Rules:**
- MUST validate ranges BEFORE compiling registries — fail fast on mismatch
- MUST NOT overwrite existing registry docs unless bundle version > installed version
- MUST produce referential integrity report (all task dependencies exist in factory registry)

---

### F633 — IImplementationRegistryService

**Interface:** `IImplementationRegistryService`  
**Family:** 84 — Platform Bootstrap Fabric  
**Fabric Resolution:** DATABASE FABRIC (Skill 05) → PostgreSQL provider (relational status tracking) + Elasticsearch (search + document storage)

**Purpose:** Tracks implementation status at every level: Family → Factory → Method → Provider → Tests → Flows. Enables the engine to know what's built, what's tested, and what code/tests are reachable for any given artifact. Powers the regression impact query.

**Methods:**
```
RegisterFactory(record: Dictionary<string,object>) → DataProcessResult<string>
  // record: { factoryId, interfaceName, familyId, methods[], fabricResolution, status }
  // status: 'PLANNED' | 'GENERATED' | 'INJECTED' | 'MINIMAL' | 'CORE'

RegisterProviderImplementation(record: Dictionary<string,object>) → DataProcessResult<string>
  // record: { providerId, factoryId, methodName, sigHash, repoPath, version, 
  //           testSuiteIds[], status, lastTestedAt }

UpdateImplementationStatus(artifactType: string, artifactId: string, 
  status: string, evidence: Dictionary<string,object>) → DataProcessResult<bool>
  // evidence: { commitHash, ciRunId, testResultsPath, judgeScore }

GetFactoryStatus(factoryId: string) → DataProcessResult<FactoryStatusReport>
  // Returns: { factoryId, providers[], methods[], tests[], flows[], promotionTier }

GetFamilyProgress(familyId: string) → DataProcessResult<FamilyProgressReport>
  // Returns: { familyId, factoryCount, implementedCount, testedCount, deployedCount }

FindImplementationsByInterface(interfaceName: string) → DataProcessResult<List<Dictionary<string,object>>>
  // Used by regression flow: all providers implementing this interface

RegisterTestSuite(record: Dictionary<string,object>) → DataProcessResult<string>
  // record: { suiteId, suiteType: 'contract'|'unit'|'integration'|'e2e', 
  //           coversMethods[], factoryId, repoPath, lastRunStatus, lastRunAt }
```

**DNA Compliance:**
- DNA-1: All records are Dictionary<string,object>
- DNA-2: BuildSearchFilter skips empty factoryId, familyId, status
- DNA-5: scope field on every record ('SYSTEM' | tenantId)

**MACHINE/FREEDOM:**
- MACHINE: Status promotion order (PLANNED→GENERATED→INJECTED→MINIMAL→CORE) — cannot skip
- FREEDOM: `statusRetentionDays`, `testSuiteTimeout`, `minJudgeScore` — admin-configurable

**Events Emitted:**
- `ImplementationStatusChanged { factoryId, from, to }` → Queue
- `FactoryFullyCovered { factoryId, testCount }` → Queue
- `RegressionTriggerRequired { factoryId, changedMethods[], impactedFlows[] }` → Queue

**Iron Rules:**
- MUST NOT promote to CORE without all methods having contract tests registered
- MUST record evidence (commitHash + ciRunId) before any status change
- repoPath MUST be resolvable via F54:ISourceControlProvider before registering

---

### F634 — IFamilySkillPackService

**Interface:** `IFamilySkillPackService`  
**Family:** 84 — Platform Bootstrap Fabric  
**Fabric Resolution:** DATABASE FABRIC (Skill 05) → Elasticsearch (skill pack storage) + RAG FABRIC (Skill 00b) → IRagService (skill retrieval)

**Purpose:** Manages Family Skill Packs — the pre-built, structured knowledge bundles that AF-4 retrieves during code generation. One SkillPack per factory family, containing factory list, fabric resolution, events, BFA hooks, test matrix, and prompt templates.

**Methods:**
```
CreateFamilySkillPack(familyId: string, spec: Dictionary<string,object>) 
  → DataProcessResult<string>
  // spec: { factories[], events[], bfaHooks[], testMatrix, promptTemplates[] }

GetFamilySkillPack(familyId: string) → DataProcessResult<Dictionary<string,object>>
  // Returns complete skill pack for AF-4 retrieval

GetFactorySkill(factoryId: string) → DataProcessResult<Dictionary<string,object>>
  // Returns: { intent, methodSemantics, fabricPattern, errorModel, 
  //            idempotencyRules, telemetry, contractTests, exampleDicts }

SearchSkillsByFabric(fabricType: string) → DataProcessResult<List<Dictionary<string,object>>>
  // fabricType: 'DATABASE' | 'QUEUE' | 'AI_ENGINE' | 'RAG' | 'FLOW_ENGINE'

BuildContextPack(query: Dictionary<string,object>) → DataProcessResult<ContextPack>
  // query: { familyId?, factoryIds[]?, taskTypeId?, ragStrategies[], tokenBudget }
  // Executes Hybrid RAG (Graph query → Vector search → merge)
  // Returns ContextPack: { skills[], taskContracts[], bfaRules[], codeSnippets[], 
  //                         priorJudgments[], providerMatrix[] }
```

**DNA Compliance:**
- DNA-1: SkillPack = Dictionary<string,object> — no typed SkillPackModel class
- DNA-2: BuildSearchFilter on all skill searches
- DNA-5: scope = 'SYSTEM' for plan-level skills; tenantId for tenant-specific overrides

**MACHINE/FREEDOM:**
- MACHINE: ContextPack schema (required fields: skills, taskContracts, bfaRules)
- FREEDOM: `ragStrategy`, `tokenBudget`, `maxSkillCount` — per-node configurable

**Events Emitted:**
- `ContextPackBuilt { queryId, skillCount, tokenUsed }` → Queue (for AF-4 telemetry)

---

### F635 — IGraphCatalogSeeder

**Interface:** `IGraphCatalogSeeder`  
**Family:** 84 — Platform Bootstrap Fabric  
**Fabric Resolution:** DATABASE FABRIC (Skill 05) → F65:IGraphAiProvider (Neo4j/Neptune via GraphRAG fabric)

**Purpose:** Creates and maintains the two-layer GraphRAG: (A) Catalog Graph — static plan connectivity (families → factories → methods → tasks → skills → templates), and (B) Impact Graph — dynamic runtime connectivity (provider implementations → test suites → flows).

**Methods:**
```
InitializeGraphSchema(scope: string) → DataProcessResult<SchemaInitResult>
  // Creates constraints + indexes: unique on id per label, index on (scope, tenantId)
  // Labels: Family, Factory, Method, TaskType, Skill, Template, BfaRule, 
  //          ProviderImpl, TestSuite, FlowDef

SeedCatalogGraph(planBundleId: string) → DataProcessResult<CatalogGraphSeedResult>
  // Parses registries → creates all nodes + edges for Catalog Graph
  // Returns: { familiesCount, factoriesCount, methodsCount, edgesCount }

UpsertProviderImplementation(record: Dictionary<string,object>) → DataProcessResult<bool>
  // Updates Impact Graph when a provider is registered/changed
  // record: { providerId, factoryId, methodName, sigHash, repoPath, testSuiteId }

ExecuteGraphQuery(queryTemplate: string, params: Dictionary<string,object>) 
  → DataProcessResult<List<Dictionary<string,object>>>
  // queryTemplate: 'GetFamilyContext' | 'GetFactoryImpact' | 'GetTaskBuildContext'
  // Executes stored Cypher query templates via F65 — NEVER direct Neo4j driver

ValidateGraphIntegrity(scope: string) → DataProcessResult<IntegrityReport>
  // Checks: every DEPENDS_ON edge resolves, every USES_SKILL edge resolves
  // Returns: { valid, missingNodes[], danglingEdges[] }
```

**Graph Node Labels (Catalog Graph):**
```
Family    { id, name, flowSource, scope, tenantId? }
Factory   { id, interface, familyId, scope, tenantId? }
Method    { id, factoryId, name, sigHash, scope }
TaskType  { id, archetype, entry, scope }
Skill     { id, name, scope }
Template  { id, name, sourceTaskType, scope }
BfaRule   { id, severity, scope }
```

**Graph Relationship Types:**
```
(Family)-[:HAS_FACTORY]->(Factory)
(Factory)-[:HAS_METHOD]->(Method)
(TaskType)-[:DEPENDS_ON]->(Factory)
(TaskType)-[:USES_SKILL]->(Skill)
(Template)-[:IMPLEMENTS_TASK]->(TaskType)
(Template)-[:USES_FACTORY]->(Factory)
(BfaRule)-[:APPLIES_TO]->(Factory|TaskType|Template)
(ProviderImpl)-[:IMPLEMENTS]->(Method)       ← Impact Graph
(TestSuite)-[:COVERS]->(Method)              ← Impact Graph
(FlowDef)-[:USES_FACTORY]->(Factory)         ← Impact Graph
```

**Stored Query Templates (in prompt_registry):**
```
Q1: GetFamilyContext(familyId, scope)
  → factories in family + methods + tasks + skills + templates

Q2: GetFactoryImpact(factoryId, scope)
  → tasks + flows + provider impls + test suites

Q3: GetTaskBuildContext(taskTypeId, scope)
  → factories + methods + skills + BFA rules + templates
```

**DNA Compliance:**
- DNA-1: All node/edge records = Dictionary<string,object>
- DNA-5: scope + tenantId on EVERY node and edge — graph queries always filter by scope
- MUST use F65 IGraphAiProvider — NEVER import Neo4j driver directly

**Iron Rules:**
- MUST validate graph integrity after seeding — fail if counts deviate >5% from registry oracle
- MUST use tenantId partitioning on all nodes (scope='SYSTEM' for plan-level)
- MUST NOT allow tenant graph queries to cross scope boundaries

---

## FAMILY 85 — Implement-Family Meta-Engine

**Purpose:** The core "self-building" meta-flow engine. Orchestrates the multi-model generation + arbiter loop that takes a family spec + ContextPack and produces validated, tested, deployed implementations. Powers the "factories side by side" parallel generation strategy.

**Scope:** SYSTEM or per-tenant. Generates code for SYSTEM-scope factories during bootstrap; for TENANT-scope factories during tenant customization.

**Fabric Dependencies:**
- AI ENGINE FABRIC (Skills 06/07) → IAiProvider + AiDispatcher (multi-model generation)
- RAG FABRIC (Skill 00b) → IRagService Hybrid (ContextPack retrieval)
- QUEUE FABRIC (Skill 04) → Redis Streams (arbiter result events)
- DATABASE FABRIC (Skill 05) → Elasticsearch (run state persistence)
- FLOW ENGINE FABRIC (Skill 09) → FlowOrchestrator (meta-flow execution)

---

### F636 — IImplementFamilyOrchestrator

**Interface:** `IImplementFamilyOrchestrator`  
**Family:** 85 — Implement-Family Meta-Engine  
**Fabric Resolution:** FLOW ENGINE FABRIC (Skill 09) → FlowOrchestrator + AI ENGINE FABRIC (Skill 07) → AiDispatcher

**Purpose:** Top-level orchestrator for the implement-family-v1 meta-flow. Accepts a family spec, retrieves ContextPack, launches multi-model generation candidates, runs the arbiter loop, and manages promotion.

**Methods:**
```
StartFamilyImplementation(spec: Dictionary<string,object>) → DataProcessResult<RunId>
  // spec: { familyId, factories[], targetProviders[], tenantId, priority }
  // Returns runId for polling

GetRunStatus(runId: string) → DataProcessResult<RunStatusReport>
  // Returns: { runId, phase, arbitersStatus[], currentIteration, lastError }

RetryFromPhase(runId: string, phase: string) → DataProcessResult<bool>
  // Resumes a failed run from a specific phase — uses persisted run state

CancelRun(runId: string, reason: string) → DataProcessResult<bool>

GetImplementationHistory(familyId: string, limit: int) 
  → DataProcessResult<List<Dictionary<string,object>>>
  // Returns past runs with judge scores + arbiter outcomes
```

**Implement-Family DAG (no-code orchestration):**
```
1. LoadFamilySpec         → F634:GetFamilySkillPack
2. BuildContextPack       → F634:BuildContextPack (Hybrid RAG)
3. GenerateCandidates     → AF-5 multi-model (F636→AiDispatcher, N models in parallel)
4. MergeCandidates        → AF-10 (select/merge best candidate)
5. ArbiterLoop            → F637:IArbitrationEngine (all 5 arbiters must pass)
   A: Coverage            → does impl fully cover spec + required methods?
   B: Security            → secrets, authZ, tenant scoping, injection, PII
   C: DNA Compliance      → ParseDocument, BuildSearchFilter, CreateAsync, DataProcessResult
   D: Testing             → unit + contract + integration generated AND passing
   E: BFA Dependencies    → cross-flow rules + schema + propagation indices
   ↳ Loop if any fails: feed failure report back to AF-1/AF-5 with exact trace, retry
6. LocalDeploy            → F55:ICiCdProvider (local runner mode)
7. E2ESmokeRun            → F192:IFlowRuntimeService (smoke flow execution)
8. PublishArtifacts       → F633:IImplementationRegistryService (update status)
9. StoreFeedback          → AF-11 (for prompt self-improvement)
```

**DNA Compliance:**
- DNA-3: RunId, RunStatusReport = DataProcessResult wrapping Dictionaries
- DNA-5: tenantId on run state documents
- DNA-4: IImplementFamilyOrchestrator extends MicroserviceBase

**MACHINE/FREEDOM:**
- MACHINE: Arbiter order (Coverage→Security→DNA→Testing→BFA) — cannot reorder
- MACHINE: Loop limit = 10 iterations max before escalation
- FREEDOM: `maxIterations`, `modelProviders[]`, `parallelModelCount`, `smokeFlowId`

**Events Emitted:**
- `FamilyImplementationStarted { runId, familyId }` → Queue
- `ArbiterLoopCompleted { runId, iterations, allPassed }` → Queue
- `FamilyImplementationCompleted { runId, familyId, promotionTier }` → Queue
- `FamilyImplementationFailed { runId, familyId, failedArbiter, trace }` → DLQ

---

### F637 — IArbitrationEngine

**Interface:** `IArbitrationEngine`  
**Family:** 85 — Implement-Family Meta-Engine  
**Fabric Resolution:** AI ENGINE FABRIC (Skill 07) → AiDispatcher (each arbiter = AI call) + DATABASE FABRIC (Skill 05) → Elasticsearch (arbiter result storage)

**Purpose:** Runs the 5-arbiter validation loop on generated code. Each arbiter is an AI-powered judge with a deterministic prompt grounded in ContextPack. Returns pass/fail with an exact failure trace for regeneration.

**Methods:**
```
RunArbiters(runId: string, candidate: Dictionary<string,object>, 
  contextPack: Dictionary<string,object>) → DataProcessResult<ArbitrationResult>
  // candidate: { code[], tests[], registryUpdates[], bfaRegistrations[] }
  // Returns: { allPassed: bool, results: [{ arbiterId, passed, score, failureTrace }] }

RunSingleArbiter(arbiterId: string, candidate: Dictionary<string,object>,
  contextPack: Dictionary<string,object>) → DataProcessResult<ArbiterResult>
  // arbiterId: 'COVERAGE' | 'SECURITY' | 'DNA' | 'TESTING' | 'BFA'

GetArbiterHistory(runId: string) → DataProcessResult<List<Dictionary<string,object>>>
  // Returns all arbiter runs for a given runId (for feedback/analysis)

BuildArbiterPrompt(arbiterId: string, candidate: Dictionary<string,object>,
  contextPack: Dictionary<string,object>, priorFailures: List<Dictionary<string,object>>) 
  → DataProcessResult<string>
  // Assembles the structured arbiter prompt from ContextPack + prior failure trace
```

**Arbiter Prompt Structure (for each arbiter, fed to IAiProvider.GenerateAsync):**
```
[ARBITER: {arbiterId}]
GOAL: Validate that the candidate implementation satisfies {arbiterCriteria}
SCOPE: {familyId} / {factories[]}
CONTEXT_PACK:
  Skills used: {skills[].id}
  Task contracts: {taskContracts[].id}
  BFA rules in scope: {bfaRules[].id}
CANDIDATE_CODE: {code_summary}
PRIOR_FAILURES: {priorFailures[].failureTrace}
DNA_CHECKLIST: [DNA-1..DNA-9 items relevant to this arbiter]
OUTPUT FORMAT:
  { passed: bool, score: 0-100, failureTrace: string, suggestedFix: string }
```

**5 Arbiter Definitions:**
```
ARBITER-A: COVERAGE
  Checks: All factory methods implemented, all required providers covered,
          all method signatures match interface contract
  Iron Rule: 0% methods missing = PASS

ARBITER-B: SECURITY
  Checks: No hardcoded secrets, authZ on all methods, tenantId on all DB calls,
          no SQL/NoSQL injection vectors, PII not logged
  Iron Rule: Any security violation = FAIL (no partial pass)

ARBITER-C: DNA_COMPLIANCE
  Checks: DNA-1 (no typed models), DNA-2 (BuildSearchFilter), 
          DNA-3 (DataProcessResult), DNA-4 (MicroserviceBase), 
          DNA-5 (scope isolation), DNA-6 (DynamicController)
  Iron Rule: Any DNA violation = FAIL (BUILD FAILURE)

ARBITER-D: TESTING
  Checks: Contract tests exist and pass, unit tests for all methods,
          integration tests with fabric stubs, no hardcoded provider imports in tests
  Iron Rule: 0 contract tests = FAIL

ARBITER-E: BFA_DEPENDENCIES
  Checks: All entities registered in BFA indices, no conflicts with CF rules,
          events/APIs conform to schema registry, propagation indices updated
  Iron Rule: Any unregistered entity that appears in existing BFA rules = FAIL
```

**DNA Compliance:**
- DNA-1: ArbiterResult = Dictionary<string,object>
- DNA-3: All returns DataProcessResult<T>
- DNA-4: IArbitrationEngine extends MicroserviceBase

---

### F638 — IContextPackBuilder

**Interface:** `IContextPackBuilder`  
**Family:** 85 — Implement-Family Meta-Engine  
**Fabric Resolution:** RAG FABRIC (Skill 00b) → IRagService Hybrid (Graph+Vector+Merge) + DATABASE FABRIC (Skill 05) → F65:IGraphAiProvider (Graph queries)

**Purpose:** Assembles a ContextPack for any generation task by executing the Hybrid RAG pattern: Graph query → filter Vector search → merge → deduplicate. This is what every AF node calls to "talk to the graph."

**Methods:**
```
BuildForFamily(familyId: string, opts: Dictionary<string,object>) 
  → DataProcessResult<Dictionary<string,object>>
  // Executes Q1: GetFamilyContext → then vector search filtered by factory IDs
  // opts: { tokenBudget, includeCodeSnippets, includePriorJudgments }

BuildForFactory(factoryId: string, opts: Dictionary<string,object>) 
  → DataProcessResult<Dictionary<string,object>>
  // Executes Q2: GetFactoryImpact + GetTaskBuildContext

BuildForTaskType(taskTypeId: string, opts: Dictionary<string,object>) 
  → DataProcessResult<Dictionary<string,object>>
  // Executes Q3: GetTaskBuildContext → vector search for skills + task contracts

BuildForRegression(changedFactoryId: string, changedMethods: List<string>) 
  → DataProcessResult<Dictionary<string,object>>
  // Returns impacted providers + flows + test suites — for regression scope

BuildCustom(graphConstraints: Dictionary<string,object>, 
  ragQueries: List<Dictionary<string,object>>, tokenBudget: int) 
  → DataProcessResult<Dictionary<string,object>>
  // Arbitrary graph constraints + vector queries — for advanced nodes
```

**ContextPack Schema:**
```json
{
  "queryId": "string",
  "scope": "SYSTEM|tenantId",
  "skills": [ { "skillId", "name", "patternSteps", "dnaNotes", "citedFrom" } ],
  "taskContracts": [ { "taskTypeId", "archetype", "ironRules", "qualityGates" } ],
  "bfaRules": [ { "cfId", "severity", "conflict", "resolution" } ],
  "codeSnippets": [ { "factoryId", "providerId", "repoPath", "method", "snippet" } ],
  "priorJudgments": [ { "runId", "arbiterId", "score", "failureTrace" } ],
  "providerMatrix": [ { "fabricType", "providers": [ { "id", "status" } ] } ],
  "graphLinkedIds": { "families": [], "factories": [], "tasks": [], "skills": [] },
  "tokenUsed": 0
}
```

**DNA Compliance:**
- DNA-1: ContextPack = Dictionary<string,object> with schema validated at runtime
- DNA-5: scope field controls graph partition
- MUST use F635:ExecuteGraphQuery — NEVER embed Cypher in service code

---

### F639 — IRegressionImpactAnalyzer

**Interface:** `IRegressionImpactAnalyzer`  
**Family:** 85 — Implement-Family Meta-Engine  
**Fabric Resolution:** DATABASE FABRIC (Skill 05) → F65:IGraphAiProvider (Impact Graph) + QUEUE FABRIC (Skill 04) → Redis Streams (regression trigger events)

**Purpose:** Detects when a factory interface or provider changes and computes the full regression blast radius — which providers, flows, and test suites must be retested. Implements rule #5 from the system initiation spec (elastic must be retested when mongo gets a new method).

**Methods:**
```
ComputeImpact(changeEvent: Dictionary<string,object>) → DataProcessResult<ImpactReport>
  // changeEvent: { type: 'INTERFACE_CHANGED'|'PROVIDER_CHANGED', 
  //                factoryId, changedMethods[], newSignatureHash? }
  // Returns: { impactedProviders[], impactedFlows[], impactedTestSuites[], 
  //             compatibilityPatchesNeeded[] }

TriggerRegressionRun(impactReport: Dictionary<string,object>) → DataProcessResult<string>
  // Emits RegressionRunRequested event for all impacted providers
  // Returns: correlationId for tracking

GetRegressionHistory(factoryId: string) → DataProcessResult<List<Dictionary<string,object>>>
  // Returns past regression runs, outcomes, and patches applied

RegisterImplementationLink(link: Dictionary<string,object>) → DataProcessResult<bool>
  // link: { factoryId, interfaceName, methods[], providers[], testSuites[], usedByFlows[] }
  // Stores in Implementation Registry + updates Impact Graph edges
```

**Impact Computation Logic:**
```
1. Graph query: Impact(factoryId) → all (ProviderImpl)-[:IMPLEMENTS]->(Method)
2. Graph query: Impact(factoryId) → all (FlowDef)-[:USES_FACTORY]->(Factory)
3. Graph query: Impact(factoryId) → all (TestSuite)-[:COVERS]->(Method)
4. For each changed method: find providers that implement it → add to retestList
5. For each flow using the factory: add smoke test to retestList
6. If new methods added: find if any provider is missing it → compatibilityPatch needed
```

**DNA Compliance:**
- DNA-1: ImpactReport = Dictionary<string,object>
- DNA-3: All returns DataProcessResult<T>
- DNA-5: scope isolation — never cross tenant boundaries in impact query

**Events Emitted:**
- `RegressionRunRequested { correlationId, impactedCount, scope }` → Queue
- `CompatibilityPatchRequired { factoryId, providerId, missingMethods[] }` → Queue

---

### F640 — IPromptPackService

**Interface:** `IPromptPackService`  
**Family:** 85 — Implement-Family Meta-Engine  
**Fabric Resolution:** DATABASE FABRIC (Skill 05) → Elasticsearch (prompt storage + versioning) + RAG FABRIC (Skill 00b) → Vector provider (prompt similarity search)

**Purpose:** Manages the prompt library — base prompts, node-specific prompts, arbiter prompts, and AF station templates. Enables prompt versioning and feedback-driven prompt improvement.

**Methods:**
```
GetBasePrompt(promptId: string, version: int?) → DataProcessResult<Dictionary<string,object>>
  // promptId: 'IMPLEMENT_FAMILY' | 'ARBITER_COVERAGE' | 'ARBITER_DNA' | 
  //           'ARBITER_SECURITY' | 'ARBITER_TESTING' | 'ARBITER_BFA' | 'AF1_GENESIS'

StorePromptVersion(promptId: string, template: Dictionary<string,object>) 
  → DataProcessResult<int>
  // Returns new version number; previous version preserved

BuildNodePrompt(nodeType: string, contextPack: Dictionary<string,object>, 
  overrides: Dictionary<string,object>?) → DataProcessResult<string>
  // Assembles final prompt: base template + ContextPack injection + overrides
  // nodeType: 'AF1'|'AF4'|'AF6'|'AF7'|'AF8'|'AF9'|'ARBITER_A'...'ARBITER_E'

RecordPromptFeedback(promptId: string, version: int, 
  feedback: Dictionary<string,object>) → DataProcessResult<bool>
  // feedback: { runId, arbiterId, score, failureTrace, improvementSuggestion }
  // Powers AF-11 feedback loop for prompt evolution

GetPromptPerformanceReport(promptId: string) → DataProcessResult<Dictionary<string,object>>
  // Returns: { versions[], avgScoreByVersion, failurePatterns[], trendDirection }
```

**Base Prompt Template (Stable — MACHINE):**
```
[XIIGEN GENERATION PROMPT]
Goal:        {goal}
Scope:       {tenantId} / {familyId} / {factories[]}
Constraints: [Fabric-First] [Factory-First] [Genie DNA 1-9] [No typed models]
             [DataProcessResult] [MicroserviceBase] [Scope isolation]
ContextPack:
  Skills:           {skills[].id}: {skills[].name}
  Task Contracts:   {taskContracts[].id}
  BFA Rules:        {bfaRules[].id}
  Prior Failures:   {priorJudgments[].failureTrace}
Expected Outputs:
  {expectedOutputs[]}
Mandatory Steps:
  1. Restate the target contract (interface + methods + fabric mapping)
  2. List the retrieved skills you will apply
  3. Generate code/tests ONLY using those skills
  4. Self-check against DNA patterns + BFA + test matrix
  5. Output: patch plan (files changed + registries updated)
```

---

## FACTORY REGISTRY SUMMARY — FLOW-33

| Factory | Interface | Family | Fabric Resolution |
|---------|-----------|--------|-------------------|
| F631 | IBootstrapService | 84 | DATABASE(ES) + QUEUE(Redis) |
| F632 | IPlanBundleIngestionService | 84 | DATABASE(ES) + RAG(Vector) |
| F633 | IImplementationRegistryService | 84 | DATABASE(PG+ES) |
| F634 | IFamilySkillPackService | 84 | DATABASE(ES) + RAG(Hybrid) |
| F635 | IGraphCatalogSeeder | 84 | DATABASE via F65(GraphAI/Neo4j) |
| F636 | IImplementFamilyOrchestrator | 85 | FLOW_ENGINE + AI_ENGINE |
| F637 | IArbitrationEngine | 85 | AI_ENGINE(AiDispatcher) + DATABASE(ES) |
| F638 | IContextPackBuilder | 85 | RAG(Hybrid) + DATABASE via F65 |
| F639 | IRegressionImpactAnalyzer | 85 | DATABASE via F65(Impact Graph) + QUEUE |
| F640 | IPromptPackService | 85 | DATABASE(ES) + RAG(Vector) |

---

## DIRECTORY STRUCTURE (what the engine generates into)

```
/src
  /backend
    /Kernel                        (MicroserviceBase, DNA-1..9, DataProcessResult)
    /Fabrics
      /DatabaseFabric              (IDatabaseService + ES/Mongo/PG/Redis providers)
      /QueueFabric                 (IQueueService + Redis Streams)
      /AiFabric                    (IAiProvider + AiDispatcher)
      /RagFabric                   (IRagService + Hybrid/Graph/Vector strategies)
      /ExecutionFabric             (F54-F58: git, CI/CD, artifact, container, schema)
    /Factories
      /Family_84_PlatformBootstrap
        /F631_IBootstrapService/
          Interface.cs
          FactoryRegistration.json
          Prompts/
          Tests/Contract/ Tests/Integration/
        /F632_IPlanBundleIngestionService/  ...
        /F633_IImplementationRegistryService/  ...
        /F634_IFamilySkillPackService/  ...
        /F635_IGraphCatalogSeeder/  ...
      /Family_85_ImplementFamilyMetaEngine
        /F636_IImplementFamilyOrchestrator/  ...
        /F637_IArbitrationEngine/  ...
        /F638_IContextPackBuilder/  ...
        /F639_IRegressionImpactAnalyzer/  ...
        /F640_IPromptPackService/  ...
    /Registries
      /Schemas/factory_registry/
      /Schemas/task_type_registry/
      /Schemas/skill_registry/
      /Schemas/bfa_rule_registry/
      /Schemas/implementation_registry/
      /Schemas/prompt_registry/
    /Flows
      /Templates/install-plan-bundle-v1.json
      /Templates/platform-bootstrap-v1.json
      /Templates/implement-family-v1.json
      /Templates/regression-flow-v1.json
    /Rag
      /Ingestion/   (chunking, embedding, graph extraction)
      /GraphSchema/ (Cypher constraint scripts, query templates)
      /VectorIndexes/
  /client
    /app/
    /flow-designer/    (fabric-first — config-driven, no platform-specific values)
    /flow-monitor/
  /infra
    docker-compose.yml   (ES, PG, Redis, Neo4j for local dev)
  /tests
    /e2e/  /smoke/  /load/
/tools
  /cli/  (bootstrap, ingest-rag, run-regression, seed-graph)
```

---

## FLOW-33 STATE CHECKPOINT

```yaml
FLOW_33_ARCHITECTURE_CHECKPOINT:
  status: COMPLETE
  new_factories: F631-F640
  new_families: [84: Platform Bootstrap Fabric, 85: Implement-Family Meta-Engine]
  next_factory: F641
  next_family: 86
  fabric_resolutions_verified: true
  backward_compatibility: F1-F630 unchanged
  key_artifacts:
    - install-plan-bundle-v1 flow template (stored via F190)
    - platform-bootstrap-v1 flow template
    - implement-family-v1 meta-flow template
    - GraphRAG Catalog + Impact Graph schema
    - ContextPack schema
    - Base prompt template (MACHINE)
    - 5 arbiter definitions (COVERAGE/SECURITY/DNA/TESTING/BFA)
  next_doc: TASK_TYPES_CATALOG (T247-T253)
```
