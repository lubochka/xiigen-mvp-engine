# XIIGen ENGINE ARCHITECTURE — FLOW-26 ADDENDUM
# Self-Developing Meta-Flow: Factory Registries & Design Records
## FLOW-26 ONLY | F1075–F1102 | Families 154–159 | DR-184–DR-197
## Date: 2026-02-27 | Baseline: Post FLOW-25 (F1074/T388/DR-183)

---

## SAVE POINT: F1102_DEFINED ✅

---

## RENUMBERING APPLIED

| Artifact | 26-* Original | FLOW-26 Final | Offset |
|----------|--------------|---------------|--------|
| Factories | F982–F1009 | F1075–F1102 | +93 |
| Families | 140–145 | 154–159 | +14 |
| Design Records | DR-164–DR-175 | DR-184–DR-195 | +20 |
| Additional DRs | — | DR-196–DR-197 | New (FLOW-24/25 integration) |

---

## SYSTEM NUMBERS (FLOW-26)

| Artifact | Start | End | Count |
|----------|-------|-----|-------|
| Factories | F1075 | F1102 | 28 |
| Families | 154 | 159 | 6 |
| Design Records | DR-184 | DR-197 | 14 |

---

## FABRIC RESOLUTION SUMMARY (FLOW-26)

| Family | Domain | Primary Fabric | Secondary Fabric |
|--------|--------|---------------|-----------------|
| 154 | Gap Detection & Capability Registry | DATABASE FABRIC (ES) | AI ENGINE FABRIC |
| 155 | Contract & Artifact Generator | AI ENGINE FABRIC | DATABASE FABRIC (ES) |
| 156 | Genesis & Validation Loop | AI ENGINE FABRIC | QUEUE FABRIC |
| 157 | Sandbox & E2E Execution | CORE FABRIC (infra) | QUEUE FABRIC |
| 158 | GitOps Assimilation | EXECUTION FABRIC (via FLOW-19) | DATABASE FABRIC |
| 159 | Promotion Ladder & Human Gate | DATABASE FABRIC (ES) | QUEUE FABRIC |

---

# ═══════════════════════════════════════════════════════
# FAMILY 154 — Gap Detection & Capability Registry
# ═══════════════════════════════════════════════════════

**Scope:** Detect capability gaps from flow intents, maintain capability registry, plan reuse strategy
**Task Types:** T389–T392
**Factories:** F1075–F1081 (7 factories)

---

### F1075 — ICapabilityGapDetectorService
**Interface:** `ICapabilityGapDetectorService`
**Fabric Resolution:** AI ENGINE FABRIC (Skill 07 — AiDispatcher) for intent parsing + DATABASE FABRIC (Skill 05 → Elasticsearch) for registry diff
**Operations:**
- `DetectGapsAsync(intentDescription, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (gapList)
- `ClassifyGapAsync(gap, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (gapClassification: MISSING_FACTORY | MISSING_OPERATION | MISSING_PROVIDER)
**Factory Resolution:** `IExternalServiceFactory<ICapabilityGapDetectorService>.CreateAsync(ctx)` → config-first routing → AI_ENGINE provider + ES provider
**DNA:** ParseDocument (gap = Dictionary<string,object>), tenantId on every query, DataProcessResult<T>, BuildSearchFilter on registry queries
**Events Emitted:** `CapabilityGapDetected` via QUEUE FABRIC (Redis Streams)
**IRON RULES:**
- IR-1075-1: Gap detection MUST use AI ENGINE FABRIC for intent parsing — no regex/keyword heuristics
- IR-1075-2: Every detected gap MUST be classified (MISSING_FACTORY | MISSING_OPERATION | MISSING_PROVIDER)
- IR-1075-3: Gap document MUST include tenantId — cross-tenant gap detection FORBIDDEN
**Design Record:** DR-184

---

### F1076 — ICapabilityRegistryService
**Interface:** `ICapabilityRegistryService`
**Fabric Resolution:** DATABASE FABRIC (Skill 05 → Elasticsearch) — index: `capability-registry-{tenantId}`; DATABASE FABRIC (Skill 05 → Redis) for distributed locks
**Operations:**
- `RegisterCapabilityAsync(capabilitySpec, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (registration)
- `GetCapabilityManifestAsync(factoryInterface, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (manifest)
- `SearchCapabilitiesAsync(filter, tenantId, ct)` → `DataProcessResult<List<Dictionary<string,object>>>` (capabilities)
- `InvalidateCacheAsync(tenantId, ct)` → `DataProcessResult<bool>`
- `AcquireLockAsync(tenantId, gapId, ct)` → `DataProcessResult<Dictionary<string,object>>` (lockHandle)
**Factory Resolution:** `IExternalServiceFactory<ICapabilityRegistryService>.CreateAsync(ctx)` → ES + Redis providers
**DNA:** ParseDocument, BuildSearchFilter (empty fields skipped), tenantId isolation, DPR<T>, Idempotency via lock
**Events Emitted:** `CapabilityRegistered`, `CapabilityHotReloaded`
**IRON RULES:**
- IR-1076-1: All registry reads MUST include tenantId in filter — cross-tenant reads FORBIDDEN
- IR-1076-2: Cache invalidation MUST precede hot-reload event emission
- IR-1076-3: Lock acquisition MUST use TTL with renewal — no infinite locks
**Design Record:** DR-185

---

### F1077 — IFlowPlannerService
**Interface:** `IFlowPlannerService`
**Fabric Resolution:** AI ENGINE FABRIC (Skill 07) for DAG planning + DATABASE FABRIC (ES) for template lookup
**Operations:**
- `PlanFlowAsync(intentDescription, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (flowPlan with DAG)
- `DetectSubFlowRequirementAsync(gap, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (subFlowReq)
**Factory Resolution:** `IExternalServiceFactory<IFlowPlannerService>.CreateAsync(ctx)` → AiDispatcher + ES
**DNA:** ParseDocument, tenantId, DPR<T>
**Events Emitted:** `FlowPlanned`, `SubFlowRequired`
**IRON RULES:**
- IR-1077-1: Flow plan MUST reference only existing factory interfaces or gaps — no hallucinated capabilities
- IR-1077-2: Sub-flow detection MUST trigger CapabilityGapDetected for recursive gaps
- IR-1077-3: Sub-flow recursion depth MUST NOT exceed FREEDOM-configurable max (default 3) — DR-195
**Design Record:** DR-184 (shared)

---

### F1078 — ICapabilityGraphService
**Interface:** `ICapabilityGraphService`
**Fabric Resolution:** RAG FABRIC (Skills 00a/00b — IRagService) for semantic search + DATABASE FABRIC (ES) for capability graph index
**Operations:**
- `SearchRelatedCapabilitiesAsync(gap, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (relatedCapabilities)
- `BuildCapabilityGraphAsync(gapList, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (graph)
**Factory Resolution:** `IExternalServiceFactory<ICapabilityGraphService>.CreateAsync(ctx)` → RAG + ES
**DNA:** ParseDocument, tenantId, DPR<T>, BuildSearchFilter
**IRON RULES:**
- IR-1078-1: Graph search MUST use RAG FABRIC — no direct vector DB calls
**Design Record:** DR-186

---

### F1079 — IReuseDecisionMatrixService
**Interface:** `IReuseDecisionMatrixService`
**Fabric Resolution:** DATABASE FABRIC (ES) for skill registry + AI ENGINE FABRIC for similarity scoring
**Operations:**
- `EvaluateReuseAsync(gap, candidates, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (decision: COPY | ADAPT | REWRITE + rationale)
- `GetReuseCandidatesAsync(gapId, tenantId, ct)` → `DataProcessResult<List<Dictionary<string,object>>>`
**Factory Resolution:** `IExternalServiceFactory<IReuseDecisionMatrixService>.CreateAsync(ctx)` → ES + AI_ENGINE
**DNA:** ParseDocument, tenantId, DPR<T>
**IRON RULES:**
- IR-1079-1: Reuse scan MUST run before any genesis — reuse-first is non-negotiable
- IR-1079-2: COPY decision requires ≥90% pattern match; ADAPT requires ≥60%; below = REWRITE — DR-192
**Design Record:** DR-187

---

### F1080 — ISelfBuildRunStateService
**Interface:** `ISelfBuildRunStateService`
**Fabric Resolution:** DATABASE FABRIC (Skill 05 → Elasticsearch) — index: `self-build-runs-{tenantId}`
**Operations:**
- `CreateRunAsync(runSpec, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (runDocument)
- `TransitionStateAsync(runId, newState, phaseData, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>`
- `GetRunAsync(runId, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>`
- `AppendPhaseHistoryAsync(runId, phaseRecord, tenantId, ct)` → `DataProcessResult<bool>`
**Factory Resolution:** `IExternalServiceFactory<ISelfBuildRunStateService>.CreateAsync(ctx)` → ES
**DNA:** ParseDocument, tenantId, DPR<T>, Idempotency (runId + phaseId dedup — DNA-7), Outbox (state persist before event — DNA-8)
**Events Emitted:** `SelfBuildRunStateChanged`
**IRON RULES:**
- IR-1080-1: State transitions MUST be persisted BEFORE event emission (DNA-8 outbox)
- IR-1080-2: Run creation MUST be idempotent by (tenantId, intentHash, gapListHash) — DNA-7
- IR-1080-3: Phase history is append-only — no deletions
**Design Record:** DR-188

---

### F1081 — ICapabilityGapNotificationService
**Interface:** `ICapabilityGapNotificationService`
**Fabric Resolution:** QUEUE FABRIC (Skill 04 — Redis Streams) for event emission + DATABASE FABRIC (ES) for notification log
**Operations:**
- `NotifyGapDetectedAsync(gapData, tenantId, ct)` → `DataProcessResult<bool>`
- `NotifyRunProgressAsync(runId, progress, tenantId, ct)` → `DataProcessResult<bool>`
**Factory Resolution:** `IExternalServiceFactory<ICapabilityGapNotificationService>.CreateAsync(ctx)` → Queue + ES
**DNA:** ParseDocument, tenantId, DPR<T>
**IRON RULES:**
- IR-1081-1: Notifications MUST go through QUEUE FABRIC — no direct HTTP callbacks

---

# ═══════════════════════════════════════════════════════
# FAMILY 155 — Contract & Artifact Generator
# ═══════════════════════════════════════════════════════

**Scope:** Generate engine artifacts: factory specs, task type contracts, event schemas, BFA drafts, flow templates
**Task Types:** T393–T396
**Factories:** F1082–F1087 (6 factories)

---

### F1082 — IContractGeneratorService
**Interface:** `IContractGeneratorService`
**Fabric Resolution:** AI ENGINE FABRIC (Skill 07 — AiDispatcher for multi-model generation) + DATABASE FABRIC (ES for existing contract lookup)
**Operations:**
- `GenerateFullContractPackAsync(gap, reuseDecision, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (contractPack: factorySpec + taskTypeContract + eventSchemas + bfaDraft)
**Factory Resolution:** `IExternalServiceFactory<IContractGeneratorService>.CreateAsync(ctx)` → AI_ENGINE + ES
**DNA:** ParseDocument, tenantId, DPR<T>
**IRON RULES:**
- IR-1082-1: Generated contracts MUST include fabricResolution field — incomplete contracts are BUILD FAILURE
- IR-1082-2: Generated factory interfaces MUST declare all DNA compliance markers
**Design Record:** DR-189

---

### F1083 — IFactorySpecGeneratorService
**Interface:** `IFactorySpecGeneratorService`
**Fabric Resolution:** AI ENGINE FABRIC + RAG FABRIC (search existing factory patterns)
**Operations:**
- `GenerateFactorySpecAsync(gap, existingPatterns, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (factorySpec)
- `ValidateFactorySpecAsync(spec, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (validationResult)
**Factory Resolution:** `IExternalServiceFactory<IFactorySpecGeneratorService>.CreateAsync(ctx)` → AI_ENGINE + RAG
**DNA:** ParseDocument, tenantId, DPR<T>
**IRON RULES:**
- IR-1083-1: Every factory spec MUST include fabricResolution declaring WHICH fabric it resolves through
- IR-1083-2: Factory spec MUST include operations with full signatures (tenantId param + DPR return)
**Design Record:** DR-189 (shared)

---

### F1084 — ITaskTypeContractGeneratorService
**Interface:** `ITaskTypeContractGeneratorService`
**Fabric Resolution:** AI ENGINE FABRIC + DATABASE FABRIC (ES — existing task type catalog lookup)
**Operations:**
- `GenerateTaskTypeAsync(gap, factorySpec, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (taskTypeContract)
- `ValidateContractCompletenessAsync(contract, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>`
**Factory Resolution:** `IExternalServiceFactory<ITaskTypeContractGeneratorService>.CreateAsync(ctx)` → AI_ENGINE + ES
**DNA:** ParseDocument, tenantId, DPR<T>
**IRON RULES:**
- IR-1084-1: Task type contract MUST include ALL required fields: ARCHETYPE, FACTORY_DEPS, FABRIC_RESOLUTION, AF_CONFIGURATION, BFA_VALIDATION, IRON_RULES, QUALITY_GATES
- IR-1084-2: Stub contracts (one-line descriptions) are BUILD FAILURE

---

### F1085 — IEventSchemaGeneratorService
**Interface:** `IEventSchemaGeneratorService`
**Fabric Resolution:** AI ENGINE FABRIC + DATABASE FABRIC (ES — existing event schema registry)
**Operations:**
- `GenerateEventSchemasAsync(factorySpec, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (schemas)
- `CheckCollisionsAsync(schemas, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (collisions)
**Factory Resolution:** `IExternalServiceFactory<IEventSchemaGeneratorService>.CreateAsync(ctx)` → AI_ENGINE + ES
**DNA:** ParseDocument, tenantId, DPR<T>
**IRON RULES:**
- IR-1085-1: Event name collisions with existing registry are CRITICAL — generation halts
- IR-1085-2: Every event schema MUST include publisher, consumers, payload fields, version

---

### F1086 — IBfaDraftGeneratorService
**Interface:** `IBfaDraftGeneratorService`
**Fabric Resolution:** AI ENGINE FABRIC + DATABASE FABRIC (ES — BFA rule index)
**Operations:**
- `GenerateBfaDraftAsync(contractPack, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (bfaDraft: conflictRules + propagationTree + entityRegistry)
- `ValidateAgainstExistingRulesAsync(draft, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>`
**Factory Resolution:** `IExternalServiceFactory<IBfaDraftGeneratorService>.CreateAsync(ctx)` → AI_ENGINE + ES
**DNA:** ParseDocument, tenantId, DPR<T>
**IRON RULES:**
- IR-1086-1: BFA draft MUST include propagation tree edges for every emitted event
- IR-1086-2: Entity registry MUST declare canonical writer and multi-DB fragment mapping
- IR-1086-3: BFA draft generation MUST invoke FLOW-25 BFA governance gate (F1028–F1074) for cross-flow impact analysis — DR-196

---

### F1087 — IFlowTemplateGeneratorService
**Interface:** `IFlowTemplateGeneratorService`
**Fabric Resolution:** AI ENGINE FABRIC + DATABASE FABRIC (ES — flow template registry) + FLOW ENGINE FABRIC (Skill 08/09 — template schema validation)
**Operations:**
- `GenerateFlowTemplateAsync(contractPack, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (flowTemplate JSON DAG)
- `ValidateTemplateAsync(template, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>`
**Factory Resolution:** `IExternalServiceFactory<IFlowTemplateGeneratorService>.CreateAsync(ctx)` → AI_ENGINE + ES + FlowOrchestrator
**DNA:** ParseDocument, tenantId, DPR<T>
**IRON RULES:**
- IR-1087-1: Flow template MUST be valid JSON DAG parseable by FlowOrchestrator (Skill 09)
- IR-1087-2: Every step in template MUST reference a factory interface resolved through a fabric via CreateAsync()
**Design Record:** DR-190

---

# ═══════════════════════════════════════════════════════
# FAMILY 156 — Genesis & Validation Loop
# ═══════════════════════════════════════════════════════

**Scope:** Generate implementation code, tests, and documentation using the full AF-1→AF-11 pipeline with bounded retries
**Task Types:** T397–T400
**Factories:** F1088–F1092 (5 factories)

---

### F1088 — IGenesisLoopService
**Interface:** `IGenesisLoopService`
**Fabric Resolution:** AI ENGINE FABRIC (Skill 07 — AiDispatcher for multi-model code generation) + QUEUE FABRIC (Skill 04 — phase events) + RAG FABRIC (Skill 00b — pattern reuse)
**Operations:**
- `RunGenesisLoopAsync(gap, factorySpec, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (codeBundle + testBundle + metadata)
- `ApplyFixFromLogsAsync(codeBundle, failureLogs, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (patchedBundle)
**Factory Resolution:** `IExternalServiceFactory<IGenesisLoopService>.CreateAsync(ctx)` → AI_ENGINE + QUEUE + RAG
**DNA:** ParseDocument, tenantId, DPR<T>, Idempotency (runId + gapId + attempt dedup — DNA-7)
**Events Emitted:** `GenesisAttemptStarted`, `GenesisAttemptCompleted`, `GenesisAttemptFailed`
**IRON RULES:**
- IR-1088-1: Genesis loop MUST run ALL 11 AF stations in order (AF-1 through AF-11) — skipping any station is FORBIDDEN
- IR-1088-2: Maximum 3 retries per gap — escalate to human after 3 failures — DR-186
- IR-1088-3: Reuse scan (AF-4) MUST run before code generation (AF-1) in every attempt
- IR-1088-4: All generated code MUST use fabric interfaces — direct provider imports = BUILD FAILURE
**Design Record:** DR-191

---

### F1089 — ICodeBundleValidatorService
**Interface:** `ICodeBundleValidatorService`
**Fabric Resolution:** AI ENGINE FABRIC (AF-6 Code Review + AF-7 DNA Compliance + AF-8 Security)
**Operations:**
- `ValidateCodeAsync(codeBundle, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (validationReport)
- `CheckDnaComplianceAsync(codeBundle, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (dnaMatrix: 9/9 pass/fail)
- `RunSecurityScanAsync(codeBundle, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (securityReport)
**Factory Resolution:** `IExternalServiceFactory<ICodeBundleValidatorService>.CreateAsync(ctx)` → AI_ENGINE
**DNA:** ParseDocument, tenantId, DPR<T>
**IRON RULES:**
- IR-1089-1: DNA compliance check MUST verify all 9 DNA patterns — partial compliance = FAIL
- IR-1089-2: Security scan MUST check for: no secrets in code, no direct provider imports, no eval/exec patterns
- IR-1089-3: Code review MUST verify MicroserviceBase inheritance (DNA-4)
**Design Record:** DR-191 (shared)

---

### F1090 — ITestBundleGeneratorService
**Interface:** `ITestBundleGeneratorService`
**Fabric Resolution:** AI ENGINE FABRIC (code generation) + RAG FABRIC (test pattern reuse)
**Operations:**
- `GenerateUnitTestsAsync(codeBundle, factorySpec, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (testArtifacts)
- `GenerateE2ETestsAsync(flowTemplate, codeBundle, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (e2eArtifacts)
- `GenerateContractTestsAsync(factorySpec, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (contractTests)
**Factory Resolution:** `IExternalServiceFactory<ITestBundleGeneratorService>.CreateAsync(ctx)` → AI_ENGINE + RAG
**DNA:** ParseDocument, tenantId, DPR<T>
**IRON RULES:**
- IR-1090-1: Test generation MUST happen before any sandbox deployment
- IR-1090-2: All tests MUST use deterministic harness (F1091) for external calls
**Design Record:** DR-192

---

### F1091 — IDeterministicTestHarnessService
**Interface:** `IDeterministicTestHarnessService`
**Fabric Resolution:** DATABASE FABRIC (ES — fixture storage) + CORE FABRIC (test infrastructure)
**Operations:**
- `GenerateHarnessAsync(codeBundle, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (harnessConfig + fixtures)
- `RecordFixturesAsync(liveCallResults, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (recordedFixtures)
- `ReplayFixturesAsync(harnessConfig, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (replayResult)
**Factory Resolution:** `IExternalServiceFactory<IDeterministicTestHarnessService>.CreateAsync(ctx)` → ES + CORE
**DNA:** ParseDocument, tenantId, DPR<T>
**IRON RULES:**
- IR-1091-1: Harness MUST intercept ALL fabric interface calls — no live external calls in CI
- IR-1091-2: Fixture recording MUST strip secrets before storage
- IR-1091-3: Replay MUST be byte-deterministic — same input → same output every run
**Design Record:** DR-192 (shared)

---

### F1092 — IFixApplicationService
**Interface:** `IFixApplicationService`
**Fabric Resolution:** AI ENGINE FABRIC (log analysis + code patching)
**Operations:**
- `ExtractFailureSignaturesAsync(testLogs, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (failureSignatures)
- `GeneratePatchAsync(codeBundle, failureSignatures, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (patchedCode)
**Factory Resolution:** `IExternalServiceFactory<IFixApplicationService>.CreateAsync(ctx)` → AI_ENGINE
**DNA:** ParseDocument, tenantId, DPR<T>
**IRON RULES:**
- IR-1092-1: Fix must not introduce new fabric violations — re-validate after every patch
- IR-1092-2: Failure signatures MUST be structured (errorType, stackTrace, affectedFile, suggestedFix) — Dictionary<string,object>

---

# ═══════════════════════════════════════════════════════
# FAMILY 157 — Sandbox & E2E Execution
# ═══════════════════════════════════════════════════════

**Scope:** Ephemeral sandbox deployment, E2E flow testing, failure signature extraction, evidence assembly
**Task Types:** T401–T404
**Factories:** F1093–F1097 (5 factories)

---

### F1093 — ISandboxOrchestratorService
**Interface:** `ISandboxOrchestratorService`
**Fabric Resolution:** CORE FABRIC (infrastructure orchestration — leverages FLOW-19 F697 container patterns) + QUEUE FABRIC (Skill 04 — sandbox lifecycle events)
**Operations:**
- `CreateSandboxAsync(codeBundle, sandboxConfig, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (sandboxEnvironment: sandboxId, namespace, endpoints, ttlExpiry)
- `TeardownSandboxAsync(sandboxId, tenantId, ct)` → `DataProcessResult<bool>` — ALWAYS RUNS (finally block)
- `GetSandboxStatusAsync(sandboxId, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (status: CREATING | READY | RUNNING | TEARING_DOWN | TORN_DOWN)
- `ExtendTtlAsync(sandboxId, extensionMinutes, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (newExpiry)
**Factory Resolution:** `IExternalServiceFactory<ISandboxOrchestratorService>.CreateAsync(ctx)` → CORE FABRIC + QUEUE FABRIC
**DNA:** ParseDocument (sandbox = Dictionary<string,object>), tenantId on every operation, DPR<T>, BuildSearchFilter on status queries, Idempotency (sandboxId + tenantId dedup — DNA-7)
**Events Emitted:** `SandboxCreated`, `SandboxReady`, `SandboxTornDown`, `SandboxTtlExpired`
**IRON RULES:**
- IR-1093-1: Sandbox creation MUST include tenant namespace isolation: `sandbox-{tenantId}-{runId}` — DR-189
- IR-1093-2: TeardownSandboxAsync MUST execute in finally block — no exceptions, no skip paths
- IR-1093-3: Sandbox TTL enforced — auto-teardown after FREEDOM-configurable timeout (default 60 min)
- IR-1093-4: Quota check MUST precede sandbox creation — tenant quota exceeded = DataProcessResult.Failure (not exception)
- IR-1093-5: Sandbox MUST NOT share network namespace with production services — FLOW-23 tenant isolation enforced via F967 ITenantIsolationEnforcerService
**Design Record:** DR-189

---

### F1094 — IEphemeralDeployService
**Interface:** `IEphemeralDeployService`
**Fabric Resolution:** CORE FABRIC (container/K8s — leverages FLOW-19 deployment patterns) + DATABASE FABRIC (ES — deploy manifests log)
**Operations:**
- `DeployAsync(sandboxId, codeBundle, deployConfig, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (deployResult: deployId, endpoints, healthCheckUrl)
- `HealthCheckAsync(sandboxId, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (healthStatus: UP | DOWN | DEGRADED + componentChecks)
- `RollbackAsync(sandboxId, deployId, tenantId, ct)` → `DataProcessResult<bool>`
**Factory Resolution:** `IExternalServiceFactory<IEphemeralDeployService>.CreateAsync(ctx)` → CORE FABRIC + ES
**DNA:** ParseDocument, tenantId, DPR<T>, Outbox (deploy record persist before event — DNA-8)
**Events Emitted:** `EphemeralDeployStarted`, `EphemeralDeployHealthy`, `EphemeralDeployFailed`
**IRON RULES:**
- IR-1094-1: Deploy MUST include health check before E2E test trigger — unhealthy = sandbox failure (not E2E failure)
- IR-1094-2: Quota check BEFORE deploy — tenant concurrent sandbox limit exceeded = DataProcessResult.Failure
- IR-1094-3: Deploy manifest MUST be logged to ES for audit — all deployments are traceable
- IR-1094-4: Deployed code MUST extend MicroserviceBase (DNA-4) — deploy gate rejects non-compliant bundles
**Design Record:** DR-189 (shared)

---

### F1095 — IE2EFlowTestService
**Interface:** `IE2EFlowTestService`
**Fabric Resolution:** FLOW ENGINE FABRIC (Skill 09 — FlowOrchestrator for flow execution) + QUEUE FABRIC (Skill 04 — test event capture) + DATABASE FABRIC (ES — test result storage)
**Operations:**
- `RunE2EAsync(sandboxId, flowTemplate, testConfig, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (e2eReport: passed, failedAssertions, coverage, duration)
- `RunIdempotencyTestAsync(sandboxId, flowTemplate, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (idempotencyResult: run1Hash, run2Hash, match)
- `RunTenantIsolationTestAsync(sandboxId, flowTemplate, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (isolationResult: crossTenantLeaks)
**Factory Resolution:** `IExternalServiceFactory<IE2EFlowTestService>.CreateAsync(ctx)` → FLOW ENGINE FABRIC + QUEUE + ES
**DNA:** ParseDocument, tenantId, DPR<T>
**Events Emitted:** `E2EStarted`, `E2EPassed`, `E2EFailed`
**IRON RULES:**
- IR-1095-1: E2E MUST execute the ORIGINAL requested flow (not a synthetic test) — validates real user intent
- IR-1095-2: E2E MUST assert three mandatory checks: output schema validation, idempotency (run twice → same result), tenantId isolation (no cross-tenant data leak)
- IR-1095-3: E2E report MUST include per-step timings and fabric resolution trace — for debug and audit
- IR-1095-4: E2E test MUST use deterministic harness (F1091) for external fabric calls — no live provider calls
**Design Record:** DR-192

---

### F1096 — IFailureSignatureExtractorService
**Interface:** `IFailureSignatureExtractorService`
**Fabric Resolution:** AI ENGINE FABRIC (Skill 07 — log analysis via AiDispatcher) + DATABASE FABRIC (ES — index: `failure-signatures-{tenantId}`)
**Operations:**
- `ExtractSignaturesAsync(failureReport, tenantId, ct)` → `DataProcessResult<List<Dictionary<string,object>>>` (failureSignatures: each has errorType, file, line, stackFragment, fixInstruction, severity)
- `ClassifyFailureTypeAsync(signature, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (classification: DNA_VIOLATION | FABRIC_MISUSE | LOGIC_ERROR | INFRA_FAILURE)
- `GetKnownSignaturesAsync(filter, tenantId, ct)` → `DataProcessResult<List<Dictionary<string,object>>>` (knownSignatures for pattern matching)
**Factory Resolution:** `IExternalServiceFactory<IFailureSignatureExtractorService>.CreateAsync(ctx)` → AI_ENGINE + ES
**DNA:** ParseDocument, tenantId, DPR<T>, BuildSearchFilter on known signatures
**IRON RULES:**
- IR-1096-1: Each signature MUST include: errorType, file, line, fixInstruction — incomplete signatures FORBIDDEN
- IR-1096-2: Signature extraction MUST use AI ENGINE FABRIC — no regex pattern matching as primary method
- IR-1096-3: Known signatures MUST be cached and reused — AI call only for novel failures (cost optimization)
**Design Record:** DR-191 (shared)

---

### F1097 — IEvidenceBundleAssemblerService
**Interface:** `IEvidenceBundleAssemblerService`
**Fabric Resolution:** DATABASE FABRIC (ES — index: `evidence-bundles-{tenantId}`) + QUEUE FABRIC (Skill 04 — assembly completion events)
**Operations:**
- `AssembleAsync(selfBuildRunId, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (evidenceBundle: 12 required sections)
- `ValidateCompletenessAsync(bundleId, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (completenessReport: missingSections, blockingGaps)
- `GenerateSummaryAsync(bundleId, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (humanReadableSummary for PR description)
**Factory Resolution:** `IExternalServiceFactory<IEvidenceBundleAssemblerService>.CreateAsync(ctx)` → ES + QUEUE
**DNA:** ParseDocument, tenantId, DPR<T>, Idempotency (runId + bundleVersion dedup — DNA-7)
**Events Emitted:** `EvidenceBundleReady`, `EvidenceBundleIncomplete`
**IRON RULES:**
- IR-1097-1: Bundle MUST include all 12 required sections — DR-187: (1) factorySpec, (2) taskTypeContract, (3) eventSchemas, (4) bfaDraft, (5) codeBundle, (6) unitTestResults, (7) e2eTestResults, (8) dnaComplianceMatrix, (9) securityScanReport, (10) sandboxDeployLog, (11) flowTemplate, (12) promotionRecommendation
- IR-1097-2: Missing DNA matrix or BFA registrations = BUILD FAILURE (cannot proceed to GitOps)
- IR-1097-3: Evidence bundle is immutable once assembled — modifications require new version
**Design Record:** DR-187

---

# ═══════════════════════════════════════════════════════
# FAMILY 158 — GitOps Assimilation
# ═══════════════════════════════════════════════════════

**Scope:** Commit generated code to version control, open PR, await CI gates, update registries upon merge
**Task Types:** T405–T408
**Factories:** F1098–F1101 (4 factories)

---

### F1098 — IGitOpsAssimilationService
**Interface:** `IGitOpsAssimilationService`
**Fabric Resolution:** EXECUTION FABRIC (FLOW-19: F697 ISourceControlService, F698 ICiCdService) + DATABASE FABRIC (ES — assimilation audit log)
**Operations:**
- `CreateBranchAsync(selfBuildRunId, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (branchRef: branchName, repositoryUrl, baseSha)
- `CommitBundleAsync(branchRef, codeBundle, evidenceSummary, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (commitRef: sha, filesChanged, diffStats)
- `GetAssimilationStatusAsync(selfBuildRunId, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (status: BRANCHED | COMMITTED | PR_OPEN | CI_RUNNING | CI_PASSED | CI_FAILED | MERGED)
**Factory Resolution:** `IExternalServiceFactory<IGitOpsAssimilationService>.CreateAsync(ctx)` → EXECUTION FABRIC + ES
**DNA:** ParseDocument, tenantId, DPR<T>, Outbox (commit persist before event — DNA-8)
**Events Emitted:** `BranchCreated`, `CodeCommitted`, `AssimilationCompleted`
**IRON RULES:**
- IR-1098-1: Branch naming: `self-build/{tenantId}/{runId}` — immutable convention — DR-191
- IR-1098-2: Evidence bundle summary MUST be included in commit message body
- IR-1098-3: BFA registration (F1086 draft) MUST be applied BEFORE PR is opened — DR-194
- IR-1098-4: Commit MUST NOT include secrets, API keys, or provider-specific configuration — security gate
**Design Record:** DR-191

---

### F1099 — IPrManagementService
**Interface:** `IPrManagementService`
**Fabric Resolution:** EXECUTION FABRIC (FLOW-19: F699 IPrManagementService pattern) + QUEUE FABRIC (Skill 04 — PR lifecycle events)
**Operations:**
- `OpenPrAsync(branchRef, evidenceBundleId, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (prRef: prNumber, prUrl, reviewers, labels)
- `AwaitCiResultAsync(prRef, timeout, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (ciResult: status, duration, failedChecks, gateResults)
- `MergePrAsync(prRef, mergeStrategy, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (mergeResult: mergeSha, mergeTimestamp)
**Factory Resolution:** `IExternalServiceFactory<IPrManagementService>.CreateAsync(ctx)` → EXECUTION FABRIC + QUEUE
**DNA:** ParseDocument, tenantId, DPR<T>
**Events Emitted:** `PrOpened`, `CiGreen`, `CiFailed`, `CiTimeout`, `PrMerged`
**IRON RULES:**
- IR-1099-1: CORE promotion PRs MUST have required reviewers (from FREEDOM config — admin-configurable reviewer list)
- IR-1099-2: CI timeout emits `CiTimeout` event and escalates — NEVER waits indefinitely (default timeout: FREEDOM-configurable, 30 min)
- IR-1099-3: PR description MUST include evidence bundle summary link and DNA compliance matrix result
- IR-1099-4: Auto-merge ONLY for INJECTED stage — MINIMAL and CORE require explicit human merge
**Design Record:** DR-191 (shared)

---

### F1100 — ICiCdGateService
**Interface:** `ICiCdGateService`
**Fabric Resolution:** EXECUTION FABRIC (FLOW-19: F698 ICiCdService) + AI ENGINE FABRIC (for semantic diff analysis)
**Operations:**
- `ValidateCiResultAsync(ciResult, evidenceBundleId, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (gateResult: passed, failedGates, recommendations)
- `RunBackwardCompatibilityCheckAsync(codeBundle, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (compatResult: breakingChanges, affectedFlows)
**Factory Resolution:** `IExternalServiceFactory<ICiCdGateService>.CreateAsync(ctx)` → EXECUTION FABRIC + AI_ENGINE
**DNA:** ParseDocument, tenantId, DPR<T>
**IRON RULES:**
- IR-1100-1: CI failure → extract failure signatures (F1096) → loopback to genesis (F1088) — automated retry path
- IR-1100-2: CI gate MUST include: security scan, DNA compliance check, backward compatibility check — all three mandatory
- IR-1100-3: Backward compatibility failure against existing FLOW-01 through FLOW-25 = BUILD FAILURE — no override
- IR-1100-4: CI gate MUST invoke FLOW-25 BFA governance (F1028–F1074) for cross-flow impact analysis — DR-196
**Design Record:** DR-194

---

### F1101 — IRegistryAssimilationService
**Interface:** `IRegistryAssimilationService`
**Fabric Resolution:** DATABASE FABRIC (ES — indices: `factory-registry`, `capability-registry-{tenantId}`, `task-type-catalog`, `event-schema-registry`)
**Operations:**
- `AssimilateFactoryAsync(factorySpec, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (assimilationResult: factoryId, registryVersion)
- `AssimilateCapabilityManifestAsync(manifest, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (manifestResult)
- `AssimilateTaskTypeAsync(taskTypeContract, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (taskTypeResult)
- `AssimilateEventSchemasAsync(schemas, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (schemaResult)
- `TriggerHotReloadAsync(tenantId, ct)` → `DataProcessResult<bool>`
**Factory Resolution:** `IExternalServiceFactory<IRegistryAssimilationService>.CreateAsync(ctx)` → ES
**DNA:** ParseDocument, tenantId, DPR<T>, Outbox (registry persist before hot-reload event — DNA-8), Idempotency (factoryId + version dedup — DNA-7)
**Events Emitted:** `FactoryAssimilated`, `CapabilityAssimilated`, `TaskTypeAssimilated`, `HotReloadTriggered`
**IRON RULES:**
- IR-1101-1: Registry update ONLY after PR merged (not on PR open) — no speculative registration
- IR-1101-2: Registry update triggers hot-reload automatically — no manual cache invalidation
- IR-1101-3: Assimilation is transactional — all-or-nothing for a single self-build run's artifacts
- IR-1101-4: Assimilation MUST verify no factory ID collision with existing F1–F1074 range
**Design Record:** DR-194 (shared)

---

# ═══════════════════════════════════════════════════════
# FAMILY 159 — Promotion Ladder & Human Gate
# ═══════════════════════════════════════════════════════

**Scope:** Stage evaluation, promotion record persistence, human approval gate for CORE stage, rollback support
**Task Types:** T409–T415
**Factories:** F1102 (1 factory — comprehensive promotion + approval operations)

---

### F1102 — IPromotionLadderService
**Interface:** `IPromotionLadderService`
**Fabric Resolution:** DATABASE FABRIC (ES — index: `promotion-ledger-{tenantId}`) + QUEUE FABRIC (Skill 04 — approval lifecycle events)
**Operations:**
- `EvaluateStageAsync(evidenceBundle, currentStage, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (promotionDecision: targetStage, rationale, criteria, confidenceScore)
- `RequestHumanApprovalAsync(decision, reviewerConfig, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (approvalRequest: approvalId, reviewers, deadline, contextUrl)
- `AwaitApprovalAsync(approvalId, timeout, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (approvalResult: APPROVED | REJECTED | TIMEOUT + reviewer + notes)
- `RecordPromotionAsync(decision, approvalResult, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (promotionRecord: recordId, fromStage, toStage, timestamp, evidence)
- `RollbackPromotionAsync(promotionRecordId, reason, tenantId, ct)` → `DataProcessResult<Dictionary<string,object>>` (rollbackResult: newStage, affectedFlows)
- `GetPromotionHistoryAsync(capabilityId, tenantId, ct)` → `DataProcessResult<List<Dictionary<string,object>>>` (promotionHistory)
**Factory Resolution:** `IExternalServiceFactory<IPromotionLadderService>.CreateAsync(ctx)` → ES + QUEUE
**DNA:** ParseDocument, tenantId, DPR<T>, Outbox (promotion persist before event — DNA-8), Idempotency (approvalId dedup — DNA-7)
**Events Emitted:** `PromotionDecided`, `ApprovalRequired`, `ApprovalReceived`, `PromotionCompleted`, `PromotionRejected`, `PromotionRolledBack`
**IRON RULES:**
- IR-1102-1: CORE promotion ALWAYS requires human approval — no config can override this — DR-188
- IR-1102-2: Stage criteria are MACHINE (fixed) — cannot be changed via FREEDOM config
- IR-1102-3: Promotion record ALWAYS stored — no silent promotions, every stage change is auditable
- IR-1102-4: Approval timeout → stage held at current level (not rejected, not promoted) — safe default
- IR-1102-5: Rollback MUST cascade — if a CORE capability is rolled back, all flows depending on it must be notified via QUEUE FABRIC
- IR-1102-6: Promotion ladder stages (DRAFT → WIRED → VALIDATED → INJECTED → MINIMAL → CORE) are additive only — demotion requires explicit rollback operation — DR-193

**Promotion Ladder Stages (MACHINE — fixed, non-configurable):**

| Stage | Entry Criteria | Exit Gate |
|-------|---------------|-----------|
| DRAFT | Gap detected, contract generated | Contract completeness validated |
| WIRED | Factory spec + task type complete | BFA draft approved, event schemas registered |
| VALIDATED | Genesis loop passed, DNA 9/9, security clear | E2E passed in sandbox |
| INJECTED | Evidence bundle complete, PR merged, CI green | Stable for FREEDOM-configurable observation period (default 7 days) |
| MINIMAL | Observation period passed, no regressions | Used by ≥2 flows successfully, admin nomination |
| CORE | Human approval gate | — (terminal stage) |

**Design Record:** DR-193

---

# ═══════════════════════════════════════════════════════
# DESIGN RECORDS (FLOW-26)
# ═══════════════════════════════════════════════════════

### DR-184 — SelfBuildRun as First-Class Runtime Entity
**Decision:** SelfBuildRun is a persistent, resumable runtime entity stored in Elasticsearch, not an in-memory orchestration object.
**Rationale:** Long-running meta-flows (30 min–24 hr) require sub-60-second recovery from interruption. ES storage with Redis cache layer enables full state recovery on restart.
**Impact:** All phase transitions update SelfBuildRun document. Each phase is idempotent via Idempotency-Key on SelfBuildRunId + phaseId. Implemented by F1080.

### DR-185 — Gap Classification: Three-Type Schema
**Decision:** Gaps classified as exactly: MISSING_FACTORY | MISSING_OPERATION | MISSING_PROVIDER.
**Rationale:** Each type maps to a different artifact generation path (new family vs. extending existing factory vs. adding new fabric provider).
**Impact:** Contract generator (F1082) routes differently per gap type. IR-1075-2 enforcement.

### DR-186 — maxRetries = 3 Default, FREEDOM-Configurable to 3–5
**Decision:** Genesis loop bounded at 3 retries by default, configurable up to 5 via FREEDOM config.
**Rationale:** Prevents infinite loops; 3 retries covers 95% of fixable issues (DNA violations, missing fields). Beyond 5 = systemic contract problem requiring human design input.
**Impact:** IR-1088-2 enforcement. `BuildEscalated` event triggers human notification after exhaustion.

### DR-187 — Evidence Bundle: 12 Required Sections
**Decision:** Evidence bundle has exactly 12 mandatory sections before GitOps phase can begin: (1) factorySpec, (2) taskTypeContract, (3) eventSchemas, (4) bfaDraft, (5) codeBundle, (6) unitTestResults, (7) e2eTestResults, (8) dnaComplianceMatrix, (9) securityScanReport, (10) sandboxDeployLog, (11) flowTemplate, (12) promotionRecommendation.
**Rationale:** Prevents partial promotions. GitOps without complete evidence = security + governance risk.
**Impact:** IR-1097-1 enforcement. Missing sections = BUILD FAILURE at assembly gate.

### DR-188 — CORE Promotion: Human Gate Non-Negotiable
**Decision:** CORE stage promotion requires human approval regardless of automation score, CI result, or tenant tier.
**Rationale:** CORE capabilities affect all tenants. Automated self-modification of production brain is a documented risk (26-self_developing.md). Human gate is the safety mechanism.
**Impact:** IR-1102-1 enforcement. No config can override. ApprovalTimeout holds stage at current level.

### DR-189 — Sandbox Namespace: `sandbox-{tenantId}-{runId}`
**Decision:** Ephemeral sandbox environments always scoped to `sandbox-{tenantId}-{runId}` namespace.
**Rationale:** Multi-tenant isolation. Cross-tenant sandbox contamination would be a critical security breach. Leverages FLOW-23 F967 ITenantIsolationEnforcerService.
**Impact:** IR-1093-1 enforcement. Teardown also uses this namespace for cleanup.

### DR-190 — Deterministic Test Harness: 100% External Call Interception
**Decision:** Unit tests must intercept ALL external calls via fabric interface fixtures. Zero live provider calls in unit tests.
**Rationale:** Live calls introduce flakiness, cost, and non-determinism. Fixture-based harness enables reliable re-runs and offline testing.
**Impact:** IR-1091-1 enforcement. Any unintercepted call = harness INCOMPLETE.

### DR-191 — GitOps Branch: `self-build/{tenantId}/{runId}`
**Decision:** Standardized branch naming convention for all self-build assimilation PRs.
**Rationale:** Traceability + tenant isolation. Branch name encodes both tenant and run for audit purposes.
**Impact:** IR-1098-1 enforcement. Registry cannot be updated until PR on this branch merges.

### DR-192 — Reuse Decision Thresholds: COPY ≥ 0.90, ADAPT ≥ 0.60
**Decision:** Similarity scoring determines COPY/ADAPT/REWRITE using fixed thresholds. COPY ≥ 0.90 (high confidence same pattern), ADAPT ≥ 0.60 (shared structure, different details), below 0.60 = REWRITE.
**Rationale:** COPY without high confidence risks subtle semantic mismatch. ADAPT is safe at 0.60+ (shared structure, different details). Below 0.60 = insufficient overlap for safe adaptation.
**Impact:** IR-1079-2 enforcement. RAG strategy = Hybrid for maximum recall.

### DR-193 — Promotion Ladder: Six Stages, Additive Only
**Decision:** DRAFT → WIRED → VALIDATED → INJECTED → MINIMAL → CORE. Promotion is additive; demotion requires explicit rollback flow (separate from self-build flow).
**Rationale:** Clarity of capability maturity. Accidental demotion could break running flows that depend on a capability at a given stage.
**Impact:** IR-1102-6 enforcement. Stage criteria defined in F1102.

### DR-194 — BFA Registration Before GitOps: Mandatory
**Decision:** All new events, APIs, and entities MUST be registered in BFA indices before PR is opened.
**Rationale:** PR review and CI must have access to BFA conflict rules for the new code. Post-merge BFA registration is too late to catch cross-flow conflicts. Leverages FLOW-25 BFA governance gate.
**Impact:** IR-1098-3, IR-1100-4 enforcement.

### DR-195 — Sub-Flow Max Depth: 3 (FREEDOM-configurable)
**Decision:** Recursive sub-flow generation limited to depth 3 by default, configurable via FREEDOM.
**Rationale:** Unbounded recursion risks combinatorial explosion of contracts, tests, and CI gates. Depth 3 covers all known real-world cases (connector → poll loop → result aggregation).
**Impact:** IR-1077-3 enforcement. Depth > config = explicit DR required to extend.

### DR-196 — FLOW-24 Integration: Learning Calendar Capability Reuse
**Decision:** FLOW-26 self-build runs MUST check FLOW-24 (F982–F1027) Learning Calendar capabilities as reuse candidates during gap detection (F1075) and reuse evaluation (F1079).
**Rationale:** FLOW-24 introduced AI Tutor patterns (adaptive scheduling, spaced repetition) that are generic enough to be reusable by self-built flows targeting education/training domains. Ignoring these would lead to redundant factory generation.
**Impact:** RAG index includes FLOW-24 skills. F1078 ICapabilityGraphService includes FLOW-24 capabilities in graph traversal.

### DR-197 — FLOW-25 Integration: BFA Governance Gate as Pre-Assimilation Check
**Decision:** FLOW-26 MUST invoke FLOW-25 BFA governance gate (F1028–F1074) at two checkpoints: (1) before BFA draft is finalized (F1086), and (2) before CI gate approves (F1100). Both checks use the FLOW-25 cross-flow impact analysis.
**Rationale:** FLOW-25 was specifically designed to answer "Does this change break any existing flow?" Self-built capabilities are the highest-risk changes because they are AI-generated. Double-checking through FLOW-25 governance catches conflicts that single-pass BFA draft generation might miss.
**Impact:** IR-1086-3 and IR-1100-4 enforcement. FLOW-25 F1028 IImpactAnalysisService is invoked as a factory dependency of F1086 and F1100.

---

# ═══════════════════════════════════════════════════════
# BACKWARD COMPATIBILITY (FLOW-26)
# ═══════════════════════════════════════════════════════

| Check | Status |
|-------|--------|
| F1–F1074 unchanged | ✅ PASS — no modifications to existing factories |
| T1–T388 unchanged | ✅ PASS — no modifications to existing task types |
| CF-1–CF-509 unchanged | ✅ PASS — no modifications to existing BFA rules |
| SK-1–SK-250 unchanged | ✅ PASS — no modifications to existing skills |
| DD-1–DD-244 unchanged | ✅ PASS — no modifications to existing design decisions |
| DR-1–DR-183 unchanged | ✅ PASS — no modifications to existing design records |
| DNA-1–DNA-9 stable | ✅ PASS — FLOW-26 enforces all 9 existing patterns |
| FLOW-01–FLOW-25 intact | ✅ PASS — existing flows not modified |
| FLOW-19 EXECUTION FABRIC reused | ✅ PASS — F697–F733 referenced via adapter, not modified |
| FLOW-23 TENANT FABRIC reused | ✅ PASS — F967 ITenantIsolationEnforcerService referenced, not modified |
| FLOW-24 LEARNING CALENDAR reused | ✅ PASS — F982–F1027 capabilities indexed for reuse, not modified (DR-196) |
| FLOW-25 BFA GOVERNANCE invoked | ✅ PASS — F1028–F1074 invoked as dependency, not modified (DR-197) |

---

## SAVE POINT: F1102_DEFINED ✅ | FAMILIES 154-159 DEFINED ✅ | DR-184-DR-197 DEFINED ✅
## Next: TASK_TYPES_CATALOG (T389–T412), then SKILLS_FACTORY_RAG, BFA_STRESS_TEST, remaining files
