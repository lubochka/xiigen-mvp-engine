# XIIGen Knowledge Digest
## Compact Reference — Extracted from All Source Material
## Date: 2026-03-26 | For: Documentation & Skill Generation

> Back to the [XIIGen project overview](../../README.md)

---

## 1. WHAT XIIGen IS

XIIGen is a **self-building AI code generation engine**. It does NOT implement flows directly — it generates them. The engine sits on **fabric interfaces** that make every infrastructure provider swappable at runtime via configuration.

**Tech Stack (NestJS translation — COMPLETE):**
- Server: NestJS 10 + TypeScript 5 + Node.js 20 LTS
- Client: React 18 + Vite 5 + TypeScript + Tailwind
- Infra: Elasticsearch, Redis Streams, AWS SQS (all via fabrics)
- AI: Claude, OpenAI, Gemini, DeepSeek, Grok, Ollama (local) — design-time list. The configuration-selectable provider types today are exactly five: mock, anthropic, openai, google (Gemini) and grok (`AiProviderType` in `server/src/fabrics/ai-engine/base.ts`). Ollama exists as a provider class used only on the OSS-calibration path and is not selectable through configuration; DeepSeek is not a provider at all, only a model name on that same calibration path. This note also governs the `ai-engine/` line in the directory tree and the AI ENGINE row of the fabric table below in this document.

**Project Status:** All 13 phases COMPLETE. 10,100+ tests passing (~10,114 server + ~1,080 client). 30-point engine completeness checklist: ALL PASS. FLOW-15 through FLOW-24 implemented (55 services, T605-T649 + T367-T374). Counts are historical measurements from the sessions that produced this digest, not re-measured for this release — run the tests yourself for current numbers.

---

## 2. DIRECTORY STRUCTURE (NestJS — server/src/)

```
kernel/              ← DNA patterns + multi-tenant core (19 files)
  multi-tenant/      ← registry, context, guard, decorator, config/key/quota resolvers
fabrics/             ← 6 fabric layers + graph intelligence layer
  interfaces/        ← abstract classes: IDatabaseService, IQueueService, IAiProvider, etc.
  database/          ← InMemory, Elasticsearch, PostgreSQL providers + factory + resolver
  queue/             ← InMemory, SQS providers + DLQ handler + queue manager
  ai-engine/         ← Anthropic, OpenAI, Gemini, Grok, Ollama, Mock + dispatcher + recipes + scoring
  rag/               ← InMemory, Pinecone, LightRAG, Memgraph, NanoGraphRAG providers + factory + resolver
  secrets/           ← AWS, EnvVar, InMemory providers
  flow-engine/       ← InMemory flow store + orchestrator
  graph/             ← Dynamic AI Decision Architecture (added 2026-03-27)
    interfaces/      ← IGraphRagService, IEmbeddingService, IGraphLearningService, IGraphConfigReader
    providers/       ← ElasticsearchGraphLearningProvider
    planning/        ← Bootstrap + AI-driven planning components (×6) + cross-layer router + pipeline
    learning/        ← EdgeVersioningService (decay window) + AIDrivenRetrospectiveService
    governance/      ← TopManagerGapDetector, MutationScreener, CrossModelSimulator, RejectionReason
factories/           ← Universal factory pattern (6 files)
  factory-interfaces.ts  ← IExternalServiceFactory<T> + FactoryRegistryEntry
  factory-registry.ts    ← In-memory catalog, lookup by family/fabric/status
  resolution-context.ts  ← FactoryResolutionContext (tenantId, factoryId, fabricType, config)
  fabric-type.ts         ← FabricType enum (DATABASE, QUEUE, AI_ENGINE, RAG, SECRETS, FLOW_ENGINE)
engine-contracts/    ← Task type registry + schema + archetypes (9 files)
engine/              ← Flow generator + generation result (4 files)
guardrails/          ← BFA + DNA validator + promotion ladder (6 files)
freedom/             ← Config manager + builder + schema + secret refs (6 files)
af-stations/         ← 11 AF stations + 3 sub-engines + pipeline (15 files)
api/                 ← REST controllers: engine, tenant, health, docs, learning (7 files)
bootstrap/           ← Boot sequence + health reporter + RAG bootstrap (5 files)
devops/              ← Structured logging, correlation, Docker/CI validators (10 files)
doc-gen/             ← OpenAPI, diagrams, READMEs, service catalog (6 files)
learning/            ← Feedback, model preference, prompt A/B, quality scoring (14 files)
rag-init/            ← Pattern extraction, skill indexing, test pattern indexing (7 files)
```

Client (client/src/): api(3), components(13), hooks(8), pages(11), theme(1)

---

## 3. THE 6 FABRIC LAYERS

| Fabric | Interface | File | Providers | Key Methods |
|--------|-----------|------|-----------|-------------|
| DATABASE | `IDatabaseService` | fabrics/interfaces/database.interface.ts | InMemory, Elasticsearch, PostgreSQL | storeDocument, searchDocuments, getDocument, deleteDocument, bulkStore, countDocuments |
| QUEUE | `IQueueService` | fabrics/interfaces/queue.interface.ts | InMemory, SQS | enqueue, dequeue, acknowledge, sendToDlq |
| AI ENGINE | `IAiProvider` + `IAiDispatcher` | fabrics/interfaces/ai-provider.interface.ts | Anthropic, OpenAI, Gemini, Grok, Ollama, Mock | generate, generateStructured; dispatch (multi-model) |
| RAG | `IRagService` | fabrics/interfaces/rag.interface.ts | InMemory, Pinecone, LightRAG, Memgraph, NanoGraphRAG | search, index, delete |
| SECRETS | `ISecretsService` | fabrics/interfaces/secrets.interface.ts | AWS, EnvVar, InMemory | getSecret, setSecret, deleteSecret |
| FLOW ENGINE | `IFlowOrchestrator` | fabrics/interfaces/flow-orchestrator.interface.ts | InMemory | executeFlow, getFlowStatus |

**Critical v4 change:** No tenant_id parameter on fabric methods. Providers read TenantContext from AsyncLocalStorage internally. Callers cannot forget tenant scoping.

Each fabric has: interface → factory → fabric-resolver → provider-registry → N providers.

---

## 4. THE 9 DNA PATTERNS

| # | Pattern | Enforcement | Key Rule |
|---|---------|-------------|----------|
| DNA-1 | ParseDocument | `Record<string, unknown>` | No typed models. Schema-free dynamic docs. |
| DNA-2 | BuildSearchFilter | Auto-skip empty fields | Never hardcode filter fields. |
| DNA-3 | DataProcessResult<T> | Never throw for biz logic | `success(data)`, `failure(code, msg)`, never exceptions. |
| DNA-4 | MicroserviceBase | 19 components inherited | ALL services extend it. No exceptions. |
| DNA-5 | Scope Isolation | tenantId on every query | Automatic via AsyncLocalStorage. |
| DNA-6 | DynamicController | No entity-specific controllers | One controller for all CRUD. |
| DNA-7 | Idempotency Guard | Dedup on all queue consumers | Idempotency key on mutations. |
| DNA-8 | Outbox Pattern | storeDocument() BEFORE enqueue() | Transactional event publishing. |
| DNA-9 | CloudEvents | CloudEvent envelope | Standard envelope for inter-service events. |

**4-Law Checklist (quick reject test):**
1. Does this code mention a specific entity name? → REJECT
2. Is logic driven by a generic type string from config? → APPROVE
3. Creating a new Controller for this feature? → REJECT (use DynamicController)
4. Adding a new JSON config document? → APPROVE

---

## 5. MicroserviceBase — 19 ARCHITECTURAL COMPONENTS

| # | Component | Interface |
|---|-----------|-----------|
| 1 | Database access | IDatabaseAccess |
| 2 | Queue pub/sub | IQueuePubSub |
| 3 | Cache | ICacheAccess |
| 4 | Auth context | IAuthContext |
| 5 | Health check | IHealthCheck |
| 6 | Configuration | IConfigProvider |
| 7 | Permissions | IPermissions |
| 8 | Logging | ILogger |
| 9 | Metrics | IMetrics |
| 10 | Tracing | ITracing |
| 11 | Event bus | IEventBus |
| 12 | Notifications | INotifications |
| 13 | File storage | IFileStorage |
| 14 | Scheduler | IScheduler |
| 15 | Rate limiter | IRateLimiter |
| 16 | Circuit breaker | ICircuitBreaker |
| 17 | Retry handler | IRetryHandler |
| 18 | Scope context | IScopeContext |
| 19 | Object processor | IObjectProcessor |

---

## 6. FACTORY PATTERN

```typescript
// Universal factory — every dependency resolved through createAsync()
abstract class IExternalServiceFactory<TService> {
  abstract createAsync(context: FactoryResolutionContext): Promise<DataProcessResult<TService>>;
  abstract healthCheck(context: FactoryResolutionContext): Promise<DataProcessResult<Record<string, unknown>>>;
}

// FactoryResolutionContext contains: tenantId, factoryId, fabricType, configHints
// FactoryRegistryEntry contains: factoryId, interfaceName, familyId, fabricType, provider, methods, status
```

**FabricType enum:** DATABASE, QUEUE, AI_ENGINE, RAG, SECRETS, FLOW_ENGINE

---

## 7. ENGINE CONTRACTS (Task Types)

Full format every new task type must follow:

```
TASK TYPE: T[n] — [Name]
ARCHETYPE: [ORCHESTRATION | DATA_PIPELINE | AI_GENERATION | EVENT_HANDLER | INTEGRATION | VALIDATION]
ENTRY: [When this task fires]
PURPOSE: [What it does]
DISTINCT FROM: [Which existing T-type it differs from and why]
FACTORY DEPENDENCIES:
  F[n]:I[Interface] → [FABRIC]([provider]) — [description]
FABRIC RESOLUTION: [Each factory → which fabric layer]
AF CONFIGURATION:
  AF-1 Genesis: [model hint, prompt strategy]
  AF-4 RAG: [which patterns to search]
  AF-9 Judge: [quality gates]
BFA VALIDATION: [entities, events, routes to register]
MACHINE/FREEDOM SPLIT:
  MACHINE: [fixed logic]
  FREEDOM: [configurable params]
IRON RULES: [violations = BUILD FAILURE]
QUALITY GATES: [what AF-9 checks]
```

Contract archetypes: ORCHESTRATION, DATA_PIPELINE, AI_GENERATION, EVENT_HANDLER, INTEGRATION, VALIDATION

---

## 8. AF STATIONS (AI Pipeline)

| Station | Name | Sub-Engine | Function |
|---------|------|------------|----------|
| AF-1 | Genesis | SYNTHESIS | Generates code from spec |
| AF-2 | Planning | SYNTHESIS | Decomposes into steps |
| AF-3 | Prompt Library | INVENTORY | Retrieves domain-specific prompts |
| AF-4 | RAG Context | INVENTORY | Searches skill library for patterns |
| AF-5 | Multi-model | SYNTHESIS | Runs competing models |
| AF-6 | Code Review | JUDGMENT | Automated code review |
| AF-7 | Compliance | JUDGMENT | DNA pattern enforcement |
| AF-8 | Security | JUDGMENT | Security scan |
| AF-9 | Judge | JUDGMENT | Quality gates + iron rules |
| AF-10 | Merge | SYNTHESIS | Combines multi-model outputs |
| AF-11 | Feedback | JUDGMENT | Stores generation quality metrics |

Pipeline flow: INVENTORY (AF-3, AF-4) → SYNTHESIS (AF-2, AF-1, AF-5, AF-10) → JUDGMENT (AF-6, AF-7, AF-8, AF-9, AF-11)

---

## 9. GUARDRAILS

**BFA (Business Flow Arbiter):** Detects cross-service conflicts before code ships.
- Entity ownership: error if two flows own same entity
- API route overlap: error if two flows claim same route
- Event collision: warning if multiple flows publish same event

**Promotion Ladder:** GENERATED → INJECTED → MINIMAL → CORE
- GENERATED: just output by AF pipeline
- INJECTED: injected into flow, passes basic tests
- MINIMAL: passes DNA + BFA — deployable
- CORE: production-hardened, full test coverage

---

## 10. MULTI-TENANT KERNEL

Located in `kernel/multi-tenant/`:

| File | Purpose |
|------|---------|
| tenant-registry.service.ts | CRUD for tenants (create, activate, deactivate, list) |
| tenant-context.ts | TenantContext object (tenantId, config, keys) |
| tenant-context.middleware.ts | Sets AsyncLocalStorage per request |
| tenant.guard.ts | NestJS Guard: extracts + validates tenant from header/token |
| tenant.decorator.ts | @TenantId() param decorator |
| tenant-config.resolver.ts | Per-tenant FREEDOM config resolution |
| tenant-key.resolver.ts | Per-tenant API key resolution (AI providers get tenant's own keys) |
| tenant-quota.service.ts | Rate limits, token budgets, storage limits per tenant |

---

## 11. FREEDOM / MACHINE SPLIT

**MACHINE** (code-level, changes via PR): mathematical formulas, state transitions, queue coordination, retry/circuit breaker, trace propagation, cryptographic ops, query structure.

**FREEDOM** (config-level, changes via admin UI): entity field definitions, notification templates, workflow step order, AI model selection per step, approval thresholds, feature flags per tenant, pricing tiers.

Freedom config stored in Elasticsearch as dynamic documents (Record<string, unknown>), resolved per-tenant via FreedomConfigManager.

---

## 12. LEARNING SYSTEM (Phase 12)

| Component | File | Purpose |
|-----------|------|---------|
| FeedbackStore | feedback-store.ts | Persists generation quality data |
| ModelPreference | model-preference.ts | Tracks which model performs best per task type |
| ModelSelection | model-selection.ts | Selects model based on historical performance |
| PromptAbTester | prompt-ab-tester.ts | A/B tests prompt variants |
| PromptEvolver | prompt-evolver.ts | Evolves prompts based on feedback |
| QualityScorer | quality-scorer.ts | Scores generated code with real metrics |
| RagQualityTracker | rag-quality-tracker.ts | Tracks RAG pattern retrieval quality |
| RagWeightIntegrator | rag-weight-integrator.ts | Adjusts RAG weights based on usage outcomes |

---

## 13. CANONICAL DOCUMENTATION (from xiigen_documentation/)

7 merged documents totaling ~130K lines:

| Document | Lines | Scope |
|----------|-------|-------|
| ENGINE_ARCHITECTURE_MERGED.md | 31,119 | Master architecture: 1,338 factories, 515 task types, 31 flows, all fabrics |
| TASK_TYPES_CATALOG_MERGED.md | 30,107 | All T1–T515 engine contracts in full format |
| SKILLS_FACTORY_RAG_MERGED.md | 17,980 | Skills SK-1–SK-329, factory patterns, RAG strategies |
| V62_BFA_STRESS_TEST_MERGED.md | 19,854 | BFA rules CF-1–CF-714, stress tests ST-1–ST-430 |
| UNIFIED_SOURCE_INDEX_MERGED.md | 9,652 | Cross-reference index of all artifacts |
| MASTER_EXECUTION_PLAN_MERGED.md | 9,900 | Execution plan for all 31 flows |
| SESSION_STATE_MERGE.md | 2,809 | Session tracking and state |

**Next Available Numbers (post-FLOW-24 implementation, 2026-04-14):**
Factory: F1601, Family: 209, Task Type: T650, BFA Rule: CF-809, Skill: SK-529, Design Record: DR-240
Note: FLOW-15..23 remapped T605-T649 (original T221-T366 collided). FLOW-24 uses T367-T374 (no remap).

---

## 14. QUEUE PATTERN (MACHINE — never changes)

```
Main Queue      → incoming jobs
Consumed Queue  → jobs being processed (moved on pickup, prevents double-processing)
Archive Queue   → completed jobs (moved on finish)
Created Queue   → outgoing events for downstream services
DLQ             → failed after max retries
```

---

## 15. KEY INJECTION TOKENS

```typescript
export const DATABASE_SERVICE = Symbol('IDatabaseService');
export const QUEUE_SERVICE = Symbol('IQueueService');
export const AI_PROVIDER = Symbol('IAiProvider');
export const AI_DISPATCHER = Symbol('IAiDispatcher');
export const RAG_SERVICE = Symbol('IRagService');
export const SECRETS_SERVICE = Symbol('ISecretsService');
export const FLOW_ORCHESTRATOR = Symbol('IFlowOrchestrator');
```

---

## 16. FLOW REGISTRY (31 Flows in Canonical Docs)

| Flow | Domain | Factories | Task Types |
|------|--------|-----------|------------|
| FLOW-01 | User Registration & Onboarding | F174-F181 | T47-T49 |
| FLOW-02 | Content Management | F182-F189 | T50-T52 |
| FLOW-03 | Event Creation & Promotion | F197-F204 | T59-T62 |
| FLOW-04 | Post Publishing & Feed Distribution | F190-F196 | T53-T58 |
| FLOW-05 | Lesson Completion & Gamification | F166-F173 | T44-T46 |
| FLOW-06 | Marketplace Publishing | F225-F233 | T63-T72 |
| FLOW-07 | Friend Request & Social Feed | F234-F243 | T73-T82 |
| FLOW-08 | Multi-Tenant Payment Processing | F244-F271 | T83-T98 |
| FLOW-09 | Transactional Event Participation | F272-F287 | T99-T118 |
| FLOW-10 | Social Platform | F288-F367 | T119-T158 |
| FLOW-11 | Content Moderation & Social Graph | F325-F367 | T139-T158 |
| FLOW-12 | Chat & Messaging | F368-F383 | T159-T168 |
| FLOW-13 | Data Warehouse & Analytics | F384-F425 | T169-T188 |
| FLOW-14 | Data Pipeline & ETL | F426-F495 | T189-T198 |
| FLOW-15 | MVP Builder & App Platform | F496-F565 | T199-T218 |
| FLOW-16 | Giant Shop (E-Commerce) | F566-F579 | T219-T226 |
| FLOW-17 | Freelancer Marketplace | F580-F630 | T227-T246 |
| FLOW-18 | Visual Flow Creation | F631-F696 | T247-T268 |
| FLOW-19 | CI/CD & DevOps | F697-F727 | T269-T286 |
| FLOW-20 | Sponsored Content + Ads | F728-F851 | T287-T306 |
| FLOW-21 | Forms & Flow Automation | F852-F900 | T307-T326 |
| FLOW-22 | Visual Editor & Site Builder | F901-F944 | T327-T346 |
| FLOW-23 | Visual Editor Extended | F945-F981 | T347-T366 |
| FLOW-24 | Learning Calendar (AI Tutor) | F982-F1027 | T367-T388 |
| FLOW-25 | BFA Cross-Flow Governance | F1028-F1074 | T375-T388 |
| FLOW-26 | Self-Developing Meta-Flow Engine | F1075-F1102 | T389-T412 |
| FLOW-27 | Human Interaction Gate | F1103-F1128 | T413-T422 |
| FLOW-28 | Blog/CMS Modules *(namespace reserved — not yet implemented)* | F1129-F1175 | T423-T440 |
| FLOW-29 | Adaptive RAG Deep Research | F1176-F1247 | T441-T467 |
| FLOW-30 | PromptOps — Self-Learning Prompts | F1248-F1270 | T468-T488 |
| FLOW-31 | Design Intelligence Engine | F1271-F1338 | T489-T515 |
| FLOW-32 | *(reserved)* | — | — |
| FLOW-33 | *(see canonical docs)* | F1339+ | T516+ |
| FLOW-34 | *(feature-aware — see canonical docs)* | — | — |
| FLOW-35 | Meta-Arbitration Engine | — | — |
| FLOW-36 | Feature Registry | — | — |
| FLOW-PREREQ-01 | SpecAuditor + PrerequisiteOrderer | F1508-F1510 | T580, T581, T586 |
| FLOW-PREREQ-02 | FabricInterfaceGenerator + FreedomConfigRegistrar | F1511-F1514 | T582, T583 |
| FLOW-PREREQ-03 | ArchitectureDecisionGate + CapabilityGapFlowProposer | F1515-F1517 | T584, T585 |

---

## 17. COMPLETENESS CHECKLIST (30/30 PASS)

All items verified at NestJS translation completion:
01-tenant_registry, 02-tenant_isolation, 03-per_tenant_config, 04-per_tenant_keys,
05-per_tenant_quotas, 06-tenant_context_propagation, 07-all_fabrics_operational,
08-provider_switching, 09-dna_patterns_enforced, 10-factory_resolution,
11-engine_contracts_validate, 12-bfa_detects_conflicts, 13-promotion_ladder,
14-full_pipeline_executes, 15-multi_model_generation, 16-feedback_persists,
17-model_preference_tracks, 18-prompt_ab_works, 19-rag_quality_weights,
20-real_quality_scoring, 21-rag_patterns_indexed, 22-openapi_generated,
23-engine_dashboard_loads, 24-generation_lab_works, 25-tenant_management_works,
26-learning_dashboard_works, 27-docker_builds, 28-structured_logging,
29-health_probes, 30-ci_pipeline

---

## 18. SELF-SUFFICIENCY LAYER (Rounds 1–3 — added 2026-03-26)


Pre-generation intelligence layer. Audits every spec before any domain flow Phase A begins.

| Round | Sessions | Capability |
|-------|----------|------------|
| Round 1 | SS-01, SS-02, SS-03 | Self-knowledge: xiigen-capability-manifest + fabric registry bootstrapped + drift detection |
| Round 2 | SS-04, SS-05, SS-06 | Detection: SpecAuditService + SPEC-001/002/003 + RAG patterns + Registration UML integration tests |
| Round 3 | SS-07, SS-08, SS-09 | Resolution: FLOW-PREREQ-01/02/03 contracts, PrerequisiteCompletionGate, CapabilityGapFlowProposer |

**Key services added (Round 3):**
- `SpecAuditService` — 3-pass extraction, fabric registry check, constant scanning, overlap detection
- `PrerequisiteCompletionGateService` (T586) — in-memory tracker, emits `spec.prerequisites.met`
- `CapabilityGapFlowProposerService` (T585) — 5-level scope-gate, PENDING_LUBA_REVIEW proposals

**New ES indices:**
- `xiigen-spec-audit-reports` — audit report per specId (PENDING_RESOLUTION → RESOLVED)
- `xiigen-capability-gap-proposals` — flow proposals and overlap decisions
- `xiigen-fabric-registry` — registered fabric interfaces (aliased, searchable)
- `xiigen-capability-manifest` — FREEDOM keys + capability registrations

**Topology contracts:** `contracts/topologies/FLOW-PREREQ-01/`, `FLOW-PREREQ-02/`, `FLOW-PREREQ-03/`

**BFA rules:** CF-789 through CF-796 (8 new rules governing the prerequisite resolution loop)

---

## 19. DYNAMIC AI DECISION ARCHITECTURE (added 2026-03-27)

Graph-first confidence-gate pattern for all planning decisions. Sits inside `fabrics/graph/`.

### Pattern
```
if (edge.confidence ≥ threshold)  → use graph (bootstrap path, zero AI cost)
else                              → call IAIDecisionPipeline (4-role AI pipeline)
```

### Directory: `fabrics/graph/`

| Subdirectory | Contents |
|---|---|
| `interfaces/` | `IGraphRagService`, `IEmbeddingService`, `IGraphLearningService`, `IGraphConfigReader` |
| `providers/` | `ElasticsearchGraphLearningProvider` — graph edges stored as ES documents |
| `planning/` | Bootstrap + AI-driven implementations for 6 planning components |
| `learning/` | `EdgeVersioningService` (decay window), `AIDrivenRetrospectiveService` |
| `governance/` | `TopManagerGapDetectorService`, `MutationScreenerService`, `CrossModelSimulatorService`, `RejectionReasonService` |

### Injection Tokens (graph fabric)

```typescript
export const GRAPH_RAG_SERVICE      = 'GRAPH_RAG_SERVICE';
export const GRAPH_LEARNING_SERVICE = 'GRAPH_LEARNING_SERVICE';
export const GRAPH_CONFIG_READER    = 'GRAPH_CONFIG_READER';
export const EDGE_VERSIONING_SERVICE = 'EDGE_VERSIONING_SERVICE';
```

### Planning Components (mode-switched)

`ENGINE_DECISION_MODE=ai-driven` activates AI implementations; default = `bootstrap`.

| Component | Bootstrap class | AI-driven class |
|---|---|---|
| Node completeness | `BootstrapNodeCompletenessValidator` | `AIDrivenNodeCompletenessValidator` |
| Scope classifier | `BootstrapScopeClassifier` | `AIDrivenScopeClassifier` |
| Schema chain validator | `BootstrapSchemaChainValidator` | `AIDrivenSchemaChainValidator` |
| Assumption registry linter | `BootstrapAssumptionRegistryLinter` | `AIDrivenAssumptionRegistryLinter` |
| Blast radius calculator | `BootstrapBlastRadiusCalculator` | `AIDrivenBlastRadiusCalculator` |
| Retrospective | `BootstrapRetrospectiveService` | `AIDrivenRetrospectiveService` |

### EdgeVersioningService — Decay Window

```
candidate = current.confidence + delta
if observationCount > snapshotFlowCount + unlockCount → apply unclamped
else → clamp to [snapshotConfidence ± decayWindow]
updateEdgeWeight(effectiveDelta)
if newConfidence > snapshotConfidence → store snapshot
```

Snapshot index: `xiigen-edge-snapshots` (key: `fromEntity::relationship::toEntity`)

### GraphMutationProposal Lifecycle

```
PENDING_SCREEN → PENDING_SIMULATION → PENDING_HUMAN → APPROVED | REJECTED | ROLLED_BACK
```

- `TopManagerGapDetectorService` — detects evidence gaps; creates `PENDING_SCREEN` proposals
- `MutationScreenerService` — 3 checks: IMMUTABLE / DUPLICATE / INSUFFICIENT_EVIDENCE
- `CrossModelSimulatorService` — V9-002: `simulatorModel ≠ proposerModel` required (else SKIPPED)
- `RejectionReasonService` — storeRejectionReason, wasRejected, applyApprovedMutation, rollback

### ES Indices (graph layer)

| Index | Purpose |
|---|---|
| `xiigen-graph-proposals` | Mutation proposal lifecycle documents |
| `xiigen-graph-rejections` | Rejection history (window-based lookback) |
| `xiigen-edge-snapshots` | Highest-confidence snapshot per edge |

### V9-002 Compliance

`chosen.model ≠ rejected.model` required for `countsTowardThreshold: true`. Same-model decisions produce `SKIPPED` status in `CrossModelSimulatorService`. Enforced at AI pipeline level.

