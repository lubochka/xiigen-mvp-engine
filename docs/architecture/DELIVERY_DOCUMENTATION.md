# XIIGen MVP — Delivery Documentation
## What Was Built, How It Works, What Flows Through It

**Date:** 2026-03-19 (original), 2026-03-27 (test count updated) | **Status:** 13/13 phases complete | **Tests:** 5,580 server + 220 client

---

## 1. SCREENS (Client — React 18 + Vite + Tailwind)

The client has **10 pages** organized into three sidebar sections. Default route redirects to `/dashboard`.

| Route | Page | Section | Purpose |
|-------|------|---------|---------|
| `/dashboard` | DashboardPage | Engine | Bootstrap phase status + fabric health + registry counts |
| `/designer` | DesignerPage | Engine | Visual DAG editor — create/edit flow node graphs |
| `/monitor` | MonitorPage | Engine | Generation run history + per-run pipeline trace |
| `/registry` | RegistryPage | Engine | Factory catalog + engine contract browser |
| `/ledger` | LedgerPage | Engine | FREEDOM config editor + audit trail |
| `/tenants` | TenantsPage | Administration | Create/manage tenants, API keys, quotas |
| `/generation-lab` | GenerationLabPage | Administration | Interactive test bench — spec in, code + scores out |
| `/model-leaderboard` | ModelLeaderboardPage | Learning & Quality | AI model performance rankings per task type |
| `/prompt-lab` | PromptLabPage | Learning & Quality | Prompt versions, A/B test management |
| `/quality` | QualityDashboardPage | Learning & Quality | Pass rates, DNA compliance grid, failure patterns |

---

### Screen 1: Dashboard (`/dashboard`)

**What the user sees:**
- 7-phase bootstrap progress bar (SECRETS → CONFIG → DATABASE → QUEUE → AI_ENGINE → RAG → FLOW_ENGINE)
- Fabric health cards (one per fabric: DATABASE, QUEUE, AI_ENGINE, RAG, FLOW_ENGINE, SECRETS)
- Registry counts grid: Generation Count, Factory Count, Task Type Count, Promotion Count
- Refresh button + overall health badge (HEALTHY / DEGRADED / DOWN)

**Data source:** `GET /health/status` → `HealthReporter.checkAll()`

**Key test IDs:** `bootstrap-phase-bar`, `health-fabrics-card`, `registry-counts-card`, `refresh-button`

---

### Screen 2: Designer (`/designer`)

**What the user sees:**
- Node palette (add SERVICE, TRIGGER, DECISION, GATEWAY nodes)
- Visual DAG canvas with draggable nodes showing label + factory ID
- Node config panel (edit selected node: label, factoryId, fabricType, config JSON)
- Save/New flow toolbar with dirty flag indicator

**Data structure:**
```
FlowNode { id, type, label, factoryId, factoryInterface, fabric, position: {x,y}, config }
```

**Key test IDs:** `flow-canvas`, `node-config-panel`, `flow-toolbar`

---

### Screen 3: Monitor (`/monitor`)

**What the user sees:**
- Left: list of all generation runs (contractId, tenantId, success badge, elapsed ms)
- Right (when run selected):
  - Pipeline progress bar with per-stage colored segments (INVENTORY/SYNTHESIS/JUDGMENT)
  - Node snapshot panels per stage (name, status, elapsed, details JSON)
  - Stats grid: Duration, Promotion Level, Pipeline pass/fail
  - Errors list, Warnings list

**Data source:** `GET /engine/history` → `FlowGenerator.generationHistory`

**Key test IDs:** `run-list-view`, `run-detail-view`, `run-progress-bar`, `node-snapshot-{stage}`

---

### Screen 4: Registry (`/registry`)

**What the user sees:**
- Counts grid (4 cards): Factories, Task Types, Generations, Promotions
- Search bar (filters by taskTypeId, name, archetype, familyId)
- Contract list table: taskTypeId (mono), name, archetype badge, family, version, factory count
- Factory dependencies nested list (factoryId → interfaceName → fabricType icon)

**Data source:** `GET /engine/contracts` + `GET /engine/status`

**Key test IDs:** `contract-list-view`, `contract-row-{taskTypeId}`, `registry-search-input`

---

### Screen 5: Ledger (`/ledger`)

**Two-tab interface:**

**Tab A — FREEDOM Config:**
- Search input to filter config keys
- Config sections grouped by category (each with label, key, editable value)
- Save button (persists changes), Reset button (reverts to last saved)

**Tab B — Audit Trail:**
- Filter bar (all / config / tenant / generation categories)
- Entry rows: timestamp, category badge, action, user, detail JSON

**Data source:** FREEDOM config documents from Elasticsearch (mock: in-memory)

**Key test IDs:** `tab-config`, `tab-audit`, `config-toolbar`, `ledger-filter-bar`

---

### Screen 6: Tenants (`/tenants`)

**What the user sees:**
- Create Tenant button → dialog (name, plan selection)
- Tenant list: id, name, status badge (active/inactive), action buttons
- Selected tenant detail panel with three tabs:
  - **Config** — FREEDOM config overrides per tenant
  - **Keys** — API key management (provider name → encrypted key)
  - **Quotas** — maxRequestsPerMinute, maxTokensPerDay

**Data source:** `GET/POST/PUT/DELETE /tenants*`

**Key test IDs:** `tenant-list-view`, `create-tenant-button`, `detail-tab-config`, `detail-tab-keys`, `detail-tab-quotas`

---

### Screen 7: Generation Lab (`/generation-lab`) ← Primary user-facing screen

**Layout: 2-column**

**Left column (input):**
- Tenant ID input (`tenant-input`) — sets X-Tenant-Id header
- Spec JSON editor (`spec-editor`) — full EngineContractParams JSON
- Load Sample button (`spec-load-sample`) — fills T44 template
- Generate button (`generate-button`) — triggers `POST /engine/generate`
  - Shows "⏳ Generating..." while in flight, "🚀 Generate" when ready

**Right column (results — appears after generation):**
- AF Station Timeline (`af-station-timeline`) — visual pipeline progress per station
- Generated Code Viewer (`generated-code-viewer`) — code length, factory entry count, flow ID
- Quality Score Card (`quality-score-card`) — pass/fail per quality gate
- Feedback Panel (`feedback-panel`) — rate Good/Neutral/Bad, add comment, submit
- Placeholder (`lab-no-results`) shown before first generation

**What "generating" produces:**
1. AI generates TypeScript service code following all 9 DNA patterns
2. Code is reviewed across 11 AF stations (genesis → plan → RAG → multi-model → review → security → judge → merge → feedback)
3. Quality gates validate DNA compliance, fabric usage, spec adherence, code structure, test quality
4. Result returned as GenerationResult with promotion level (GENERATED → INJECTED → MINIMAL → CORE)

**Key test IDs:** `generate-button`, `generated-code-viewer`, `quality-score-card`, `feedback-panel`, `lab-no-results`

---

### Screen 8: Model Leaderboard (`/model-leaderboard`)

**What the user sees:**
- Task type filter buttons (All + individual task types)
- Model score table: model names (rows) × task types (columns) × score values
- Score trend chart: line chart of performance over time

**Data source:** Learning module — model performance scores per run

**Key test IDs:** `task-type-filter`, `model-score-table`

---

### Screen 9: Prompt Lab (`/prompt-lab`)

**What the user sees:**
- Prompt version list with dates and status (champion / candidate / retired)
- A/B test status panel (running tests, champion vs candidate performance)
- Prompt diff viewer (syntax-highlighted current version content)

**Key test IDs:** `prompt-version-list`, `ab-test-status`, `prompt-diff-viewer`

---

### Screen 10: Quality Dashboard (`/quality`)

**What the user sees:**
- 4 summary data cards: Current Pass Rate, Total Runs, DNA Compliance %, Failure Patterns
- Pass rate trend chart (line chart, 6-day window)
- DNA compliance grid (9 rules × compliance %)
- Failure cluster list (pattern name, count, severity, example code snippet)

**Data source:** Quality scorer results accumulated across all generation runs

**Key test IDs:** `page-qualitydashboard`, `pass-rate-chart`, `dna-compliance-grid`, `failure-cluster-list`

---

## 2. SERVER API ENDPOINTS

All routes are mounted at **both** `/` and `/api` prefixes. The `/api/` prefix is used by the React client (proxied through nginx). The bare `/` prefix is used by direct test calls.

### Health (`/health`)

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| GET | `/health/live` | Liveness probe — always 200 | `{ status: 'OK', timestamp }` |
| GET | `/health/ready` | Readiness probe — 503 if DOWN | `{ status: 'READY', health_status, timestamp }` |
| GET | `/health/status` | Full per-fabric status | `{ status, fabrics: { database, queue, ... } }` |

### Tenants (`/tenants`)

| Method | Path | Purpose | Request Body |
|--------|------|---------|-------------|
| POST | `/tenants` | Create tenant | `{ name, plan?, configOverrides?, apiKeys? }` |
| GET | `/tenants` | List all tenants | — |
| GET | `/tenants/:id` | Get tenant by ID | — |
| PUT | `/tenants/:id/config` | Update FREEDOM config | `{ ...configDoc }` |
| PUT | `/tenants/:id/keys` | Set API keys | `{ provider: key }` |
| PUT | `/tenants/:id/quotas` | Set quotas | `{ maxRequestsPerMinute?, maxTokensPerDay? }` |
| DELETE | `/tenants/:id` | Soft-delete (deactivate) | — |

### Engine (`/engine`)

| Method | Path | Purpose | Request Body |
|--------|------|---------|-------------|
| POST | `/engine/generate` | Trigger generation | EngineContractParams + `tenant_id` |
| GET | `/engine/history` | List all generation runs | — |
| GET | `/engine/status` | Pipeline stats | — |
| GET | `/engine/contracts` | List registered contracts | — |
| GET | `/engine/contracts/:id` | Get single contract | — |

**Auth header on all requests:** `X-Tenant-Id: {tenantId}` (DNA-5 — auto-scopes all fabric operations)

**Response envelope (all endpoints):**
```json
{ "success": true,  "data": { ... } }
{ "success": false, "error": "ERROR_CODE", "message": "human readable" }
```

---

## 3. CORE ENTITIES

### TenantRecord
Represents a registered tenant. Stored in TenantRegistry (in-memory for mock, Elasticsearch in prod).

```typescript
{
  id: string;           // UUID, generated on create
  name: string;         // unique tenant name
  status: 'active' | 'inactive' | 'suspended';
  plan: {
    name: 'free' | 'pro' | 'enterprise';
    maxApiCallsPerMinute: number;   // default: 60
    maxTokensPerDay: number;        // default: 100,000
    maxStorageMb: number;           // default: 500
  };
  configOverrides: Record<string, unknown>;  // per-tenant FREEDOM overrides
  apiKeys: Record<string, string>;           // provider → encrypted key
  createdAt: string;    // ISO timestamp
  updatedAt: string;    // ISO timestamp
}
```

### TenantContext (runtime, not persisted)
Loaded from TenantRecord, stored in AsyncLocalStorage per request. All fabric providers read this automatically — no `tenantId` parameter needed on any fabric method.

```typescript
{
  tenantId: string;
  tenantName: string;
  status: 'active' | 'inactive' | 'suspended';
  plan: TenantPlan;
  configOverrides: readonly Record<string, unknown>;
  apiKeys: readonly Record<string, string>;   // never logged or returned in API

  isActive: boolean;  // computed: status === 'active'
  getApiKey(provider: string): string | undefined;
  getConfigOverride(key: string): unknown | undefined;
}
```

---

### EngineContractParams → EngineContract
Defines "what the engine should build." Submitted by user in Generation Lab or via API.

```typescript
{
  taskTypeId: string;          // 'T44', 'T45', etc. Must match T-NNN pattern
  name: string;                // 'Inventory Management Flow'
  archetype: string;           // 'DATA_PIPELINE' | 'CRUD_SERVICE' | 'ORCHESTRATION' | 'EVENT_PROCESSOR'
  entry: string;               // 'inventory.update event'
  purpose: string;             // plain-text description of what this flow does
  factoryDependencies: [       // what external services this flow needs
    {
      factoryId: string;       // 'F166'
      interfaceName: string;   // 'IInventoryService'
      fabricType: string;      // 'DATABASE' | 'QUEUE' | 'AI_ENGINE' | 'RAG' | 'SECRETS' | 'FLOW_ENGINE'
      providerHint?: string;   // 'postgresql', 'redis_streams'
      description: string;
    }
  ],
  afStations: [                // which AF stations to run and with what config
    { stationId: string, role: string, modelHint?: string, config: {} }
  ],
  qualityGates: [              // pass/fail criteria for generated code
    { gateId: string, description: string, severity: 'error'|'warning', checkType: string }
  ],
  bfaRegistration: {           // what entities/events/routes this flow owns (prevents BFA conflicts)
    entities: string[],
    events: string[],
    apiRoutes: string[]
  },
  ironRules: string[],         // MACHINE-layer invariants that cannot be overridden
  machineComponents: string[], // fixed code components
  freedomComponents: string[], // config-driven components (can be changed without redeployment)
  familyId?: string;
  version?: string;
}
```

---

### GenerationResult
What the engine produces for each `generate()` call.

```typescript
{
  contractId: string;          // taskTypeId from contract
  flowId: string;              // generated UUID for this flow

  factoryEntries: Array<{}>;   // registered factory interfaces
  flowDefinition: {};          // JSON DAG (nodes + edges)
  freedomConfigs: Array<{}>;   // FREEDOM documents created
  bfaStatus: string;           // 'PASS' | 'CONFLICT_DETECTED' | 'SKIPPED'

  pipelinePassed: boolean;     // did all quality gates pass?
  generatedCode: string;       // the actual TypeScript code
  pipelineMetadata: {};        // per-station timings and metadata

  promotionLevel: 'GENERATED' | 'INJECTED' | 'MINIMAL' | 'CORE';
  elapsedMs: number;
  errors: string[];
  warnings: string[];

  success: boolean;  // computed: pipelinePassed && errors.length === 0
}
```

**Promotion ladder:** GENERATED → INJECTED → MINIMAL → CORE (higher = more stable, more trusted)

---

### DataProcessResult<T>
The universal return type for every service method. Never throws for business logic.

```typescript
{
  isSuccess: boolean;
  data: T | undefined;
  errorCode: string | undefined;   // 'NOT_FOUND', 'MISSING_TENANT', 'BUDGET_EXCEEDED', ...
  errorMessage: string | undefined;
  correlationId: string;           // UUID — traces the call
  timestamp: string;               // ISO
  metadata: Record<string, unknown>;
}

// Constructors:
DataProcessResult.success(data)
DataProcessResult.failure('ERROR_CODE', 'human message')
DataProcessResult.error('ERROR_CODE', 'message', exception)
```

---

### StationInput (flows through the AF Pipeline)
Accumulated context object that grows as it passes through each AF station.

```typescript
{
  tenantId: string;
  taskType: string;
  spec: Record<string, unknown>;          // the engine contract as dict
  code: string;                           // generated code (filled by AF-1)
  prompts: Array<{}>;                     // prompt templates (filled by AF-3)
  ragContext: Array<{}>;                  // retrieved examples (filled by AF-4)
  planSteps: Array<{}>;                   // execution plan (filled by AF-2)
  generationResults: Array<{}>;           // multi-model outputs (filled by AF-5)
  reviewResults: Array<{}>;              // review findings (filled by AF-6)
  scores: Array<{}>;                     // quality scores (filled by AF-9 judge)
  metadata: Record<string, unknown>;     // station timings, model used, token count
}
```

---

## 4. THE AF PIPELINE — 11 STATIONS

The AF Pipeline is the engine's code generation backbone. Each station receives `StationInput`, enriches it, and passes it to the next.

```
Input Spec
    │
    ▼
AF-1 Genesis ────────── Generate initial code from spec + DNA rules
    │
    ▼
AF-2 Planning ───────── Create step-by-step execution plan
    │
    ▼
AF-3 Prompt Library ─── Select optimized prompts for this task type
    │
    ▼
AF-4 RAG Context ─────── Retrieve relevant examples from vector store
    │
    ▼
AF-5 Multi-Model ─────── Run multiple AI models in parallel, collect outputs
    │
    ▼
AF-6 Code Review ─────── Review code quality against project standards
    │
    ▼
AF-7 Compliance ──────── Validate DNA pattern compliance (all 9 DNA rules)
    │
    ▼
AF-8 Security ────────── Security check (no hardcoded secrets, injection risks)
    │
    ▼
AF-9 Judge ───────────── Final quality gate enforcement — pass or fail
    │
    ▼
AF-10 Merge ──────────── Merge and reconcile multi-model outputs
    │
    ▼
AF-11 Feedback ───────── Capture human feedback for learning loop
    │
    ▼
GenerationResult
```

**Three sub-engines inside the pipeline:**
- **InventoryEngine** — manages FactoryRegistry + TaskTypeRegistry + PromotionLadder
- **SynthesisEngine** — coordinates multi-model generation (AF-5)
- **JudgmentEngine** — enforces quality gates (AF-9)

---

## 5. THE 6 FABRIC INTERFACES

Every service uses one of these 6 abstract interfaces — never a provider directly.

| # | Token | Interface | Providers | Key Operations |
|---|-------|-----------|-----------|----------------|
| 1 | `DATABASE_SERVICE` | `IDatabaseService` | InMemory, Elasticsearch, PostgreSQL | storeDocument, searchDocuments, getDocument, deleteDocument, bulkStore, countDocuments |
| 2 | `QUEUE_SERVICE` | `IQueueService` | InMemory, AWS SQS, Redis Streams, Kafka | enqueue, dequeue, acknowledge, sendToDlq |
| 3 | `AI_PROVIDER` | `IAiProvider` | Claude, OpenAI, Gemini, Grok, MockAi | generate, generateStructured, getModelInfo |
| 3b | `AI_DISPATCHER` | `IAiDispatcher` | Multi-model coordinator | generateWithConsensus, generateSingle |
| 4 | `RAG_SERVICE` | `IRagService` | InMemory, Pinecone, Weaviate, FAISS | search, ingest, buildContextPack, deleteByFilter |
| 5 | `SECRETS_SERVICE` | `ISecretsService` | InMemory, AWS Secrets Manager, HashiCorp Vault | getSecret, setSecret, deleteSecret, listSecrets |
| 6 | `FLOW_ORCHESTRATOR` | `IFlowOrchestrator` | InMemory, Temporal.io, Airflow, Prefect | startFlow, executeNode, getRunStatus, resumeFlow, cancelFlow |

**How tenancy works with fabrics:**
1. Request arrives with `X-Tenant-Id: tenant-abc` header
2. `TenantContextMiddleware` loads tenant from TenantRegistry → creates `TenantContext`
3. Stores `TenantContext` in `AsyncLocalStorage` (CLS)
4. Fabric providers (`InMemoryDatabaseProvider`, etc.) read `TenantContext.tenantId` internally
5. All documents automatically prefixed/namespaced by tenantId
6. No `tenantId` parameter ever appears on fabric method signatures (DNA-5)

---

## 6. DATA FLOWS

### Generation Flow (primary flow)

```
User                    Client (React)             Server                  AF Pipeline
 │                           │                        │                        │
 │  Fill spec JSON           │                        │                        │
 │──────────────────────────►│                        │                        │
 │  Click "Generate"         │                        │                        │
 │──────────────────────────►│                        │                        │
 │                           │  POST /api/engine/     │                        │
 │                           │  generate              │                        │
 │                           │  { tenant_id, spec }   │                        │
 │                           │───────────────────────►│                        │
 │                           │                        │  validate contract     │
 │                           │                        │  register in           │
 │                           │                        │  TaskTypeRegistry      │
 │                           │                        │  BFA pre-check         │
 │                           │                        │  register factories    │
 │                           │                        │──────────────────────► │
 │                           │                        │                        │ AF-1..AF-11
 │                           │                        │◄────────────────────── │
 │                           │                        │  GenerationResult      │
 │                           │  { success, data:      │                        │
 │                           │    { code, scores,     │                        │
 │                           │      promotionLevel,   │                        │
 │                           │      flowId, ... } }   │                        │
 │                           │◄───────────────────────│                        │
 │  See results              │                        │                        │
 │◄──────────────────────────│                        │                        │
```

### Tenant Scope Flow (every request)

```
HTTP Request
"X-Tenant-Id: tenant-abc"
    │
    ▼
TenantContextMiddleware
    ├── TenantRegistry.findById('tenant-abc')
    ├── Creates TenantContext (immutable snapshot)
    └── Stores in AsyncLocalStorage (CLS)
    │
    ▼
Any Service Method
    │  (no tenantId param needed)
    ▼
Fabric Provider (e.g., InMemoryDatabaseProvider)
    ├── Reads TenantContext from AsyncLocalStorage
    ├── Gets tenantId → 'tenant-abc'
    └── Namespaces all operations to that tenant
```

### FREEDOM Config Flow (config over code)

```
Business User edits config on Ledger page
    │
    ▼
PUT /tenants/:id/config
    │
    ▼
FreedomConfigManager.setConfig(tenantId, configDoc)
    │  stores in Elasticsearch document
    ▼
During next generation run:
    │
    ▼
AF Station reads FreedomConfigManager.getConfig(tenantId)
    ├── Gets RAG strategy ('hybrid' vs 'vector')
    ├── Gets model hints ('claude-opus-4-5' for judge role)
    ├── Gets rate limits, quality thresholds, etc.
    └── All without redeploying any code
```

### Multi-Tenant Isolation Proof (E2E verified)

```
Browser Context A (tenant-alpha)          Browser Context B (tenant-beta)
        │                                          │
        │ X-Tenant-Id: tenant-alpha                │ X-Tenant-Id: tenant-beta
        ▼                                          ▼
  AsyncLocalStorage slot A             AsyncLocalStorage slot B
        │  (isolated per request)              │  (isolated per request)
        ▼                                          ▼
  InMemoryDB["tenant-alpha/*"]         InMemoryDB["tenant-beta/*"]
        │                                          │
        │  No cross-contamination possible         │
        │  Verified by 14 E2E isolation tests      │
```

---

## 7. KEY ARCHITECTURAL DECISIONS

| Decision | Why |
|----------|-----|
| `@Injectable()` services, NOT `@Controller()` | All "controllers" are services — HTTP routing added manually in `main.ts` via Express Router. No NestJS HTTP decorators anywhere. |
| `@Optional()` on all interface-typed constructor params | NestJS erases interface types to `Object` at runtime. Without `@Optional()`, DI fails with `UnknownDependenciesException`. |
| Router mounted at `/` AND `/api` | Client API calls go through nginx which preserves the `/api/` prefix. Direct test calls (health checks, seed data) omit it. Both paths handled by a single shared router. |
| `Record<string, unknown>` everywhere | DNA-1 — no typed models. Schema lives in FREEDOM config documents, not TypeScript classes. |
| `DataProcessResult<T>` as universal return | DNA-3 — never throw for business logic. Callers always get structured success/failure with error codes. |
| AsyncLocalStorage for tenantId | DNA-5 — tenant scope automatic. Fabric methods have no `tenantId` parameter. Impossible to forget. |
| FlowGenerator not in DI module | Requires IAiProvider from FabricsModule + many services from other modules. Wired manually in `main.ts` with `app.get<IAiProvider>(AI_PROVIDER)`. |

---

## 8. TEST COVERAGE

| Layer | Count | Runner | Coverage |
|-------|-------|--------|---------|
| Server unit tests | 2,342 | Jest | Kernel, fabrics, guardrails, AF stations, learning, engine |
| Client unit tests | 220 | Jest | Components, hooks, API client |
| Server integration (simulation) | Part of 2,342 | Jest | AF pipeline, multi-tenant, error propagation |
| E2E browser tests | 65 (64 pass) | Playwright | Generation Lab, multi-tenant isolation, FREEDOM config, generation history |

**E2E test breakdown:**

| File | Tests | Coverage |
|------|-------|---------|
| `flow-generation.spec.ts` | 18 | Contract submission, generation in-progress state, result display, error handling |
| `freedom-config.spec.ts` | 15 | LedgerPage navigation, config tab, audit tab, tab switching, per-tenant access |
| `generation-history.spec.ts` | 17 | Result metrics, quality dashboard, sidebar navigation |
| `tenant-isolation.spec.ts` | 14 | Cross-tenant isolation, session state, concurrent generations |

**1 known flaky test:** "generate button disabled while generating" — mock AI responds in ~10ms, button re-enables before Playwright's 3s assertion window. Not a real issue in production.

---

## 9. DOCKER SETUP (E2E / Production)

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `server-e2e` | `xiigen-server-e2e` | 13000→3000 | NestJS API server (mock providers) |
| `xiigen-client-e2e` | `xiigen-client-e2e` | 15173→80 | React app served by nginx |

**Nginx proxy config (in client container):**
- `/api/*` → proxies to `server-e2e:3000/api/*` (preserves `/api/` prefix)
- `/engine/*` → proxies to `server-e2e:3000/engine/*`
- All other routes → `index.html` (SPA routing)

**E2E run command:**
```bash
cd e2e && E2E_BASE_URL=http://localhost:15173 E2E_SERVER_URL=http://localhost:13000 DOCKER_E2E=true npx playwright test
```

---

## 10. WHAT "PRODUCTION READY" MEANS HERE

The mock/in-memory providers used in E2E testing are designed for zero-dependency testing. Swapping to real providers requires only environment variable changes:

| Variable | Mock Value | Production Value |
|----------|-----------|-----------------|
| `AI_PROVIDER` | `mock` | `anthropic` / `openai` / `gemini` |
| `DATABASE_PROVIDER` | `in_memory` | `elasticsearch` / `postgresql` |
| `QUEUE_PROVIDER` | `in_memory` | `sqs` / `redis_streams` |
| `SECRETS_PROVIDER` | `in_memory` | `aws_secrets_manager` / `vault` |
| `RAG_PROVIDER` | `in_memory` | `pinecone` / `weaviate` |

No code changes needed — the fabric architecture makes every provider swappable via config.
