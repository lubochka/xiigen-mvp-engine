# XIIGen Architecture Guide
## Deep Dive — Fabric-First Engine Design

> Back to the [XIIGen project overview](../../README.md) · architecture questions answered with code anchors: [FAQ](../../faq/README.md)

---

## 1. Core Philosophy

XIIGen follows one guiding principle: **build the engine, not the flows**. The engine generates complete application flows including services, configurations, and validations. When you need a new capability, you extend the engine (new factory interfaces, new engine contracts, new AF station mappings) — you do not write application-level service code.

Three rules govern every decision:

1. **Fabric-first:** Service code never talks to a provider directly. All infrastructure access goes through abstract fabric interfaces resolved at runtime.
2. **Config over code:** If a business user might want to change it, it must be a dynamic configuration document (FREEDOM), not compiled code (MACHINE).
3. **Generic over specific:** No entity names in code. No entity-specific controllers. One generic system serves unlimited entity types via configuration.

---

## 2. Layer 0 — Fabric Interfaces

Every component talks ONLY through fabric interfaces. There are 6 fabrics:

### 2.1 Database Fabric

**Interface:** `IDatabaseService` (fabrics/interfaces/database.interface.ts)
**Injection Token:** `DATABASE_SERVICE`
**Providers:** InMemory, Elasticsearch, PostgreSQL

The database fabric handles all document storage. Key design choices:
- No `tenant_id` parameter — providers read `TenantContext` from AsyncLocalStorage internally
- `searchDocuments` uses `BuildSearchFilter` (DNA-2) — empty fields auto-skipped
- Returns `DataProcessResult<T>` (DNA-3) — never throws for business logic
- `bulkStore` for batch operations, `countDocuments` for aggregation

```typescript
// Correct usage — fabric interface, tenant-scoped automatically
const result = await this.databaseService.storeDocument('products', {
  name: 'Widget', category: 'hardware', price: 29.99
});

// WRONG — never import a provider directly
import { Client } from '@elastic/elasticsearch'; // ← DNA VIOLATION
```

### 2.2 Queue Fabric

**Interface:** `IQueueService` (fabrics/interfaces/queue.interface.ts)
**Injection Token:** `QUEUE_SERVICE`
**Providers:** InMemory, SQS
**Pattern:** Main → Consumed → Archive → DLQ

Every inter-service call is an event through the queue. Never direct HTTP between services.

```typescript
// Enqueue with CloudEvents envelope (DNA-9) and idempotency key (DNA-7)
await this.queueService.enqueue('order.created', orderData, idempotencyKey);

// Dequeue with consumer groups
const messages = await this.queueService.dequeue('order-processing', 10);

// DLQ for poison messages
await this.queueService.sendToDlq('order-processing', failedMessage, 'Parse error');
```

### 2.3 AI Engine Fabric

**Interface:** `IAiProvider` + `IAiDispatcher` (fabrics/interfaces/ai-provider.interface.ts)
**Injection Token:** `AI_PROVIDER`, `AI_DISPATCHER`
**Providers:** Anthropic (Claude), OpenAI, Gemini, Grok, Ollama (local, $0), Mock

> Design-time list. The configuration-selectable provider types today are exactly five — mock, anthropic, openai, google (Gemini) and grok (`AiProviderType` in `server/src/fabrics/ai-engine/base.ts`); Ollama exists as a provider class used only on the OSS-calibration path and is not selectable through configuration. This note applies to every provider list in this document.

**Per-tenant keys:** Each provider resolves API keys via `TenantKeyResolver`

**`TenantKeyResolver` two-level resolution:**
1. Tenant key — loaded from `byok-keys` (Elasticsearch) per request by `TenantContextMiddleware`
2. System fallback — set in-memory via `setSystemKey()` at module init (ephemeral, resets on restart)

**`BOOTSTRAP_*` key lifecycle (first-boot mechanism, not permanent architecture):**

On first boot with `BOOTSTRAP_*` env vars present:
- `fabrics.module.ts` reads them once → calls `keyResolver.setSystemKey()` for each provider
- `BootstrapSeeder` encrypts them → writes to `xiigen-byok-keys` in Elasticsearch as master tenant's provider pool

After first boot — **delete `BOOTSTRAP_*` from `.env`**:
- `fabrics.module.ts` reads empty strings, no system keys set
- Per-request path takes over: `TenantContextMiddleware` reads `byok-keys` → `tenant.apiKeys`
- `TenantKeyResolver.getKey()` finds the tenant key; no system fallback needed

**Alternative (zero-.env-keys flow, correct for production):**
- Never put keys in `.env` at all
- Start server, then call `PUT /api/tenants/{masterTenantId}/keys` with the 3 provider keys
- `ByokKeyStoreService` encrypts + persists; per-request loading works immediately
- `TENANT_KEY_ENCRYPTION_SECRET` is the only permanent entry in `.env`

The AI Engine has two levels:
- `IAiProvider` — single model: `generate()`, `generateStructured()`
- `IAiDispatcher` — multi-model orchestration: runs competing models in parallel, aggregates results via execution recipes

Model roles: `PRIMARY`, `FAST`, `CROSS_VALIDATE`, `JUDGE`

### 2.4 RAG Fabric

**Interface:** `IRagService` (fabrics/interfaces/rag.interface.ts)
**Injection Token:** `RAG_SERVICE`
**Providers:** InMemory, Pinecone (cloud vector — namespace-isolated per tenant), LightRAG (local graph+vector, Docker @ localhost:19100), Memgraph (local in-memory graph DB, Cypher HTTP @ localhost:7474), NanoGraphRAG (local GraphRAG FastAPI @ localhost:19300)
**Strategies:** Split, FanOut, Tiered, Hybrid, Graph, Vector, Multi (selected via FREEDOM config)

### 2.5 Secrets Fabric

**Interface:** `ISecretsService` (fabrics/interfaces/secrets.interface.ts)
**Injection Token:** `SECRETS_SERVICE`
**Providers:** AWS Secrets Manager, Environment Variables, InMemory

### 2.6 Flow Engine Fabric

**Interface:** `IFlowOrchestrator` (fabrics/interfaces/flow-orchestrator.interface.ts)
**Injection Token:** `FLOW_ORCHESTRATOR`
**Providers:** InMemory

Flow definitions are JSON DAGs stored in Elasticsearch. The orchestrator reads the DAG and executes step by step with events between steps. Adding a flow = adding a JSON document, not writing orchestration code.

---

## 3. Layer 1 — Factory Pattern

Every external dependency is a factory with a typed interface.

### IExternalServiceFactory<T>

```typescript
abstract class IExternalServiceFactory<TService> {
  abstract createAsync(context: FactoryResolutionContext): Promise<DataProcessResult<TService>>;
  abstract healthCheck(context: FactoryResolutionContext): Promise<DataProcessResult<Record<string, unknown>>>;
}
```

**Resolution flow:** read config → resolve from registry → validate capability → health check → fallback → escalate

### FactoryResolutionContext

Contains: `tenantId`, `factoryId`, `fabricType`, `configHints`

### FactoryRegistryEntry

Contains: `factoryId` (F166...), `interfaceName`, `familyId`, `fabricType` (which fabric it resolves through), `provider`, `methods`, `status` (promotion level)

### FabricType Enum

```typescript
enum FabricType {
  DATABASE = 'DATABASE',
  QUEUE = 'QUEUE',
  AI_ENGINE = 'AI_ENGINE',
  RAG = 'RAG',
  SECRETS = 'SECRETS',
  FLOW_ENGINE = 'FLOW_ENGINE',
}
```

Every factory MUST declare which fabric it resolves through. This is critical — it's how the engine knows which infrastructure layer a generated service will use.

---

## 4. Layer 2 — Engine Contracts (Task Types)

Each task type is a full ENGINE CONTRACT describing what the engine knows how to build. The contract format:

```
TASK TYPE: T[n] — [Name]
ARCHETYPE: [one of 6]
ENTRY: [trigger condition]
PURPOSE: [what it produces]
DISTINCT FROM: [existing T-type, and how]
FACTORY DEPENDENCIES:
  F[n]:I[Interface] → [FABRIC]([provider]) — [desc]
FABRIC RESOLUTION: [mapping table]
AF CONFIGURATION: [which stations, models, prompts]
BFA VALIDATION: [entities, events, routes]
MACHINE/FREEDOM: [what's fixed vs configurable]
IRON RULES: [violations = build failure]
QUALITY GATES: [AF-9 checks]
```

**6 Archetypes:**
- ORCHESTRATION — multi-step flow coordination
- DATA_PIPELINE — ETL / data transformation
- AI_GENERATION — AI-driven content/code generation
- EVENT_HANDLER — single event → reaction
- INTEGRATION — external system bridge
- VALIDATION — cross-flow or cross-service validation

---

## 5. Layer 3 — AF Stations (AI Pipeline)

The AI pipeline that generates code has 11 stations organized into 3 sub-engines:

### INVENTORY (Extract)
- **AF-3 Prompt Library:** Retrieves domain-specific prompts from versioned store
- **AF-4 RAG Context:** Searches skill library for reusable patterns, weighted by quality

### SYNTHESIS (Generate)
- **AF-2 Planning:** Decomposes the task into steps
- **AF-1 Genesis:** Generates code from spec using AI Engine Fabric
- **AF-5 Multi-model:** Runs competing models in parallel
- **AF-10 Merge:** Combines multi-model outputs

### JUDGMENT (Validate)
- **AF-6 Code Review:** Automated code review
- **AF-7 Compliance:** DNA pattern enforcement (all 9)
- **AF-8 Security:** Security vulnerability scan
- **AF-9 Judge:** Quality gates + iron rules + scoring
- **AF-11 Feedback:** Stores quality metrics for learning loop

### Pipeline Execution

```
Input (StationInput) → INVENTORY → enriched input
  → SYNTHESIS → generated code
  → JUDGMENT → pass/fail + score
  → PROMOTION: GENERATED → (if pass) MINIMAL
  → FEEDBACK: stored for learning
```

Each stage is timed. The pipeline respects PipelineConfig for station enable/disable. Run count and pass rate are tracked across executions.

---

## 6. Layer 4 — Guardrails

### 6.1 DNA Pattern Validator

Enforces 9 patterns on all generated code. The `DnaPatternValidator` is used by AF-7 and AF-9. Each violation has a severity (error blocks, warning is advisory).

| Pattern | What It Checks |
|---------|---------------|
| DNA-1 ParseDocument | No `class Product {}` — must use `Record<string, unknown>` |
| DNA-2 BuildSearchFilter | No hardcoded filter fields — must use dynamic filter builder |
| DNA-3 DataProcessResult | No `throw new Error()` for business logic — use `DataProcessResult.failure()` |
| DNA-4 MicroserviceBase | Service files must extend MicroserviceBase |
| DNA-5 Scope Isolation | Every query must include tenant scope |
| DNA-6 DynamicController | No entity-specific controllers |
| DNA-7 Idempotency | Mutations must have idempotency keys |
| DNA-8 Outbox | storeDocument() must happen BEFORE enqueue() |
| DNA-9 CloudEvents | Inter-service events must use CloudEvents envelope |

### 6.2 Business Flow Arbiter (BFA)

Cross-flow conflict detection. Before any new flow's code ships:
- **Entity ownership:** Error if two flows claim the same entity
- **API route overlap:** Error if two flows register the same route
- **Event collision:** Warning if multiple flows publish the same event type

### 6.3 Promotion Ladder

State machine for generated code maturity:
```
GENERATED → INJECTED → MINIMAL → CORE
```

Transitions require specific gates: basic tests (→INJECTED), DNA+BFA pass (→MINIMAL), full test coverage (→CORE).

---

## 7. The Kernel

### 7.1 DNA Primitives (kernel/)

| File | DNA# | Purpose |
|------|------|---------|
| parse-document.ts | DNA-1 | Converts any JSON to `Record<string, unknown>` |
| build-search-filter.ts | DNA-2 | Builds ES query, auto-skips empty fields |
| data-process-result.ts | DNA-3 | `success()`, `failure()`, `notFound()` wrappers |
| microservice-base.ts | DNA-4 | 19 architectural component slots |
| scope-isolation.ts | DNA-5 | `ScopeContext`, `validateScope()`, `enforceScope()` |
| dynamic-controller.ts | DNA-6 | Generic CRUD for all entity types |
| cloud-events.ts | DNA-9 | `createCloudEvent()` envelope factory |

### 7.2 Multi-Tenant Core (kernel/multi-tenant/)

Tenant isolation is kernel-level, not an addon:

1. **TenantRegistry** — CRUD for tenants (create, activate, deactivate, list)
2. **TenantContext** — object carrying tenantId, config, keys through AsyncLocalStorage
3. **TenantContextMiddleware** — NestJS middleware that sets AsyncLocalStorage per request
4. **TenantGuard** — extracts tenant from X-Tenant-Id header or JWT, validates exists + active
5. **@TenantId()** — parameter decorator for direct injection into controller methods
6. **TenantConfigResolver** — resolves FREEDOM config per tenant
7. **TenantKeyResolver** — resolves API keys per tenant (AI providers use tenant's own keys)
8. **TenantQuotaService** — rate limits, token budgets, storage limits per tenant

---

## 8. FREEDOM Config System

The FREEDOM layer stores all business-configurable parameters as dynamic JSON documents in Elasticsearch, keyed by `(tenantId, configKey)`.

**FreedomConfigManager** (freedom/config-manager.ts):
- `getConfig(key)` — reads from tenant-scoped storage
- `setConfig(key, value)` — writes config document
- `buildConfig(schema, overrides)` — builds from schema with tenant overrides

**ConfigSchema** (freedom/config-schema.ts): Validates that config documents conform to expected shape.

**SecretReference** (freedom/secret-reference.ts): Config values that reference secrets are resolved through the Secrets Fabric — the FREEDOM layer never stores actual secrets.

---

## 9. Learning System

Closes the AI feedback loop. Components:

- **FeedbackStore** — persists generation quality data per artifact
- **QualityScorer** — scores generated code on multiple dimensions (DNA compliance, test coverage, code complexity)
- **ModelPreference** — tracks which AI model performs best per task type
- **ModelSelection** — selects optimal model based on historical performance data
- **PromptAbTester** — A/B tests prompt variants for the same task
- **PromptEvolver** — evolves prompts based on quality feedback
- **RagQualityTracker** — tracks which RAG patterns contribute to better generation
- **RagWeightIntegrator** — adjusts RAG retrieval weights based on outcome data

---

## 10. Graph Intelligence Layer (Dynamic AI Decision Architecture)

Added 2026-03-27. Sits at `fabrics/graph/`. Provides confidence-gated planning decisions that learn over time.

### Architecture Pattern

```
Planning request
  │
  ▼
Graph query: does an edge exist for this decision context?
  │
  ├─ confidence ≥ threshold → use graph response (bootstrap path, zero AI cost)
  │
  └─ confidence < threshold → IAIDecisionPipeline (4-role AI protocol)
                                  ├─ Implementors (blind, shuffled)
                                  ├─ AI Arbiters (iron rules, BLOCK removes)
                                  ├─ Upper Manager (final selection)
                                  └─ DPO triple storage
```

### Graph Fabric (fabrics/graph/)

| Directory | Contents |
|---|---|
| `interfaces/` | `IGraphRagService` — query, updateEdgeWeight, upsertEdge; `IGraphConfigReader` — numeric config via `.get(key, fallback)` |
| `providers/` | `ElasticsearchGraphLearningProvider` — edges stored as ES documents in `xiigen-graph-edges` |
| `planning/` | 6 planning components × 2 (bootstrap + AI-driven); `AIDecisionPipelineService`; `GraphCrossLayerRouter` |
| `learning/` | `EdgeVersioningService` — decay window clamping + snapshot tracking; `AIDrivenRetrospectiveService` — active learning loop |
| `governance/` | 4 governance services for `GraphMutationProposal` lifecycle |

### Mode Switch

`process.env.ENGINE_DECISION_MODE`:
- `'bootstrap'` (default) — uses static graph lookups, no AI calls
- `'ai-driven'` — activates AI-driven implementations when graph confidence is low

All 6 planning component tokens switch in `graph.module.ts` factories.

### EdgeVersioningService — Decay Window Protection

Prevents large confidence swings from single observations:

```
effectiveDelta = clamp(candidate, snapshot - window, snapshot + window)
                 UNLESS observationCount > snapshotFlowCount + unlockCount
graphRag.updateEdgeWeight(effectiveDelta)
```

Config keys: `engine.governance.decayWindow` (default 0.20), `engine.governance.decayUnlockCount` (default 10)

### GraphMutationProposal Lifecycle

```
TopManagerGapDetectorService → PENDING_SCREEN
    ↓
MutationScreenerService → PENDING_SIMULATION (pass) | REJECTED (IMMUTABLE/DUPLICATE/INSUFFICIENT)
    ↓
CrossModelSimulatorService (V9-002: simulatorModel ≠ proposerModel) → PENDING_HUMAN
    ↓
RejectionReasonService.applyApprovedMutation() → APPROVED
                     .storeRejectionReason()  → REJECTED
                     .rollback()              → ROLLED_BACK
```

### Active Learning Loop (AIDrivenRetrospectiveService)

`runR1(flowId)` pipeline:
1. Load `RoutingDecisionOutcome` records from `xiigen-flow-lifecycle`
2. Classify: `SUCCESS_WITHIN_BUDGET` / `WASTED_CYCLE` / `ESCALATION_REQUIRED`
3. Call `learning.updateEdge()` with ±0.05 delta
4. Load arbiter signals from `xiigen-training-data`
5. `promoteEdgeIfThresholdMet()` — triggers graph promotion ladder
6. `upgradeTripleQuality()` — OUTCOME_PENDING DPO triples → VALIDATED

---

## 11. Self-Sufficiency Layer (Pre-Generation Intelligence)

Before any domain flow's Phase A begins, the engine audits the spec against its own capabilities and fills gaps autonomously. This is the self-extension loop built in Rounds 1–3 (SS-01..SS-09).

### FLOW-PREREQ-01 — SpecAuditor (T580, T581, T586)

**Trigger:** `spec.submitted` — fires before any domain flow Phase A.

- **T580 SpecAuditOrchestrator:** Parses spec content (UML, requirements, JSON). Extracts service references via 3-pass extraction (Actors: line → prose patterns → structured JSON). Checks each against `xiigen-fabric-registry` using match queries on the aliases field. Detects MACHINE constant candidates (formula weights, time constants, model names). Emits typed `PREREQ_GAP` events for every gap found.
- **T581 PrerequisiteOrderer:** Builds dependency graph from gaps. Topological sort — `OVERLAP_DETECTED` before `MISSING_FABRIC_INTERFACE` in the same service category. Classifies each gap as autonomously resolvable or human-escalation. Dispatches to FLOW-PREREQ-02 and FLOW-PREREQ-03.
- **T586 PrerequisiteCompletionGate:** Tracks dispatched vs resolved gap counts per specId. Emits `spec.prerequisites.met` when all gaps resolved → original flow resumes.

Iron rules: CF-789 (audit must run before Phase A), CF-790 (all gaps emitted), CF-791 (OVERLAP before INTERFACE ordering).

Named checks: SPEC-001 (missing interfaces), SPEC-002 (MACHINE constants at spec time), SPEC-003 (cross-domain overlaps).

### FLOW-PREREQ-02 — PrerequisiteResolver (T582, T583)

**Trigger:** `prereq.resolution.ordered`

- **T582 FabricInterfaceGenerator:** Autonomous interface generation pipeline — convergence → multi-model generation (3 providers) → 7-arbiter panel → compile check → registry field extraction → register in `xiigen-fabric-registry`. Emits `fabric.interface.ready`. Stores Tier-1 `DESIGN_REASONING` DPO triple.
- **T583 FreedomConfigRegistrar:** Applies FREEDOM-001 classification (SK-451 security-break test). Routes to register as FREEDOM key with safe default, document as MACHINE invariant, or escalate to human.

Iron rules: CF-792 (no SDK imports), CF-793 (mock provider required), CF-794 (DPO Tier 1).

### FLOW-PREREQ-03 — ArchitectureDecisionGate (T584, T585)

**Trigger:** `prereq.overlap.escalated` / `prereq.gap.unresolvable`

- **T584 OverlapDecisionCapture:** Two topologies — request (escalate to human with previous architecture decisions as context) and decision-received (store as `ARCHITECTURE_DECISION` RAG pattern, emit `prereq.overlap.resolved`). Iron rule: CF-795 (never auto-resolve), CF-796 (store decision as RAG pattern).
- **T585 CapabilityGapFlowProposer:** Bootstrap boundary service. Applies solution-scope-gate hierarchy (SK-434): CONVENTION → ADAPTATION → EXTENSION → NEW_FLOW → NEW_INFRA. Stores proposals with `PENDING_LUBA_REVIEW` status — all proposals require human approval before execution.

### Self-Sufficiency ES Indices

| Index | Purpose |
|-------|---------|
| `xiigen-spec-audit-reports` | Audit results per specId |
| `xiigen-capability-gap-proposals` | Flow proposals + overlap decisions (PENDING_LUBA_REVIEW) |
| `xiigen-fabric-registry` | Registered fabric interfaces |
| `xiigen-capability-manifest` | FREEDOM keys + registered capabilities |

---

## 12. What Happens When You Add a New Flow

You are NOT writing service code. You ARE extending the engine:

1. **Register new factory interfaces** in the factory registry. Each must declare which fabric it resolves through.
2. **Create full engine contracts** (task types) with the complete format: archetype, factory deps, fabric resolution, AF config, BFA validation, quality gates.
3. **Map AF stations** — how AF-1 generates, AF-4 retrieves patterns, AF-9 validates.
4. **Register in BFA** — new entities, events, routes checked against existing flows.
5. **Create flow template** — JSON DAG for FlowOrchestrator. Each step = factory interface resolved through a fabric via createAsync().
6. **Verify DNA compliance** — all generated services: MicroserviceBase, DataProcessResult, no typed models, BuildSearchFilter, scope isolation, DynamicController.

---

## 13. Testing

All tests use Jest with in-memory providers (no external services needed).

```bash
# Run all server tests
cd server && npx jest --verbose

# Run specific module
npx jest --testPathPattern="fabrics/database"

# Run with coverage
npx jest --coverage
```

Test counts after Dynamic AI Decision Architecture (2026-03-27): 5,800 server tests + 220 client tests = 6,020 total.
Test counts after FLOW-15..24 implementation (2026-04-14): 10,100+ server tests + ~1,080 client tests = ~11,200 total. 55 services across 10 flows (T605-T649 + T367-T374).

Both lines above are historical measurements at their stated dates and were not re-measured for this release. Test counts change as the engine grows — run the tests yourself for current numbers (see the root README).
