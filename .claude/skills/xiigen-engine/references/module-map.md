# Module Map Reference

## Server Modules (server/src/)

### kernel/ (19 files) — RARELY TOUCH
The foundation. DNA primitives and multi-tenant core.

| File | Purpose | DNA |
|------|---------|-----|
| data-process-result.ts | success/failure wrapper | DNA-3 |
| build-search-filter.ts | Dynamic filter, auto-skip empty | DNA-2 |
| parse-document.ts | Record<string,unknown> converter | DNA-1 |
| microservice-base.ts | 19-component base class | DNA-4 |
| scope-isolation.ts | ScopeContext, validateScope, enforceScope | DNA-5 |
| dynamic-controller.ts | Generic CRUD controller | DNA-6 |
| cloud-events.ts | CloudEvent envelope factory | DNA-9 |
| kernel.module.ts | NestJS module wiring | — |
| multi-tenant/*.ts | 8 files: registry, context, guard, decorator, config/key/quota resolvers | DNA-5 |

### fabrics/ (68 files) — WHEN ADDING PROVIDERS
The 6 swappable infrastructure layers.

```
fabrics/
├── interfaces/      ← 6 abstract classes (the contracts)
├── database/        ← InMemory, Elasticsearch, PostgreSQL + factory + resolver + registry
├── queue/           ← InMemory, SQS + DLQ handler + queue manager + factory + resolver
├── ai-engine/       ← 5 providers + dispatcher + recipes + scoring + cost + tokens
├── rag/             ← InMemory + factory + resolver
├── secrets/         ← AWS, EnvVar, InMemory + factory + resolver + registry
└── flow-engine/     ← InMemory store + orchestrator + factory + resolver
```

### factories/ (6 files) — WHEN REGISTERING NEW FACTORIES
Universal factory pattern.

| File | Purpose |
|------|---------|
| factory-interfaces.ts | IExternalServiceFactory<T> + FactoryRegistryEntry |
| factory-registry.ts | In-memory catalog, lookup by family/fabric/status |
| resolution-context.ts | FactoryResolutionContext (tenantId, factoryId, fabricType) |
| fabric-type.ts | FabricType enum |

### engine-contracts/ — WHEN ADDING TASK TYPES
Task type definitions and validation.

**Core files:**

| File | Purpose |
|------|---------|
| contract-schema.ts | EngineContract type + FactoryDependency + AfStationMapping + QualityGate |
| archetypes.ts | 6 contract archetypes (VALIDATION, TRANSACTION, ORCHESTRATION, DATA_PIPELINE, etc.) |
| task-type-registry.ts | Registry for all task types |
| sample-contracts.ts | Example contracts (T44-T46 style) |
| template-renderer.ts | Renders contract to code template |
| backward-compat.ts | Validates new contracts don't break existing |
| bfa-validator.stub.ts | IBfaValidator interface |

**Per-flow contract files (semantic slug names — no flow-NN- prefix):**
```
bundle-activation-contracts.ts
user-registration-bfa-rules.ts
profile-enrichment-matching-contracts.ts  ← profile-enrichment-bfa-rules.ts
event-management-contracts.ts             ← event-management-bfa-rules.ts
event-attendance-contracts.ts             ← event-attendance-bfa-rules.ts
completion-gamification-contracts.ts      ← completion-gamification-bfa-rules.ts
user-groups-communities-membership-group-feed-contracts.ts
user-groups-communities-user-groups-contracts.ts
user-groups-communities-bfa-rules.ts
friend-request-social-feed-social-feed-contracts.ts
friend-request-social-feed-bfa-rules.ts
marketplace-contracts.ts                  ← marketplace-bfa-rules.ts
marketplace-payments-marketplace-contracts.ts
marketplace-event-participation-contracts.ts
transactional-event-participation-transactional-event-contracts.ts
transactional-event-participation-bfa-rules.ts
reviews-reputation-contracts.ts           ← reviews-reputation-bfa-rules.ts
schema-registry-dag-contracts.ts          ← schema-registry-dag-bfa-rules.ts
subscription-billing-contracts.ts         ← subscription-billing-bfa-rules.ts
data-warehouse-analytics-contracts.ts
data-pipeline-etl-contracts.ts
... (see engine-contracts/ directory for full list)
```

**Naming rule:** All contract files must use `{domain-slug}-contracts.ts` format.
Never create `flow-NN-contracts.ts`. See `naming-conventions-quick-reference.md`.

### guardrails/ (6 files) — WHEN ADDING VALIDATION RULES
BFA, DNA enforcement, promotion ladder.

| File | Purpose |
|------|---------|
| bfa.ts | BusinessFlowArbiter — cross-flow conflict detection |
| dna-validator.ts | DnaPatternValidator — 9 pattern checks |
| dna.interceptor.ts | NestJS interceptor for runtime DNA enforcement |
| promotion-ladder.ts | GENERATED → INJECTED → MINIMAL → CORE |

### freedom/ (6 files) — WHEN CHANGING CONFIG SYSTEM
FREEDOM layer — admin-configurable values.

| File | Purpose |
|------|---------|
| config-manager.ts | Tenant-scoped config CRUD |
| config-builder.ts | Build config from schema + overrides |
| config-schema.ts | Validate config documents |
| secret-reference.ts | Config values pointing to secrets |

### af-stations/ (15 files) — WHEN MODIFYING AI PIPELINE
11 stations + 3 sub-engines + pipeline orchestrator.

| File | Purpose |
|------|---------|
| base.ts | StationInput type, base station class |
| af1-genesis.ts | Code generation from spec |
| af2-planning.ts | Task decomposition |
| af3-prompt-library.ts | Prompt retrieval (versioned) |
| af4-rag-context.ts | RAG pattern search (quality-weighted) |
| af6-code-review.ts | Automated review |
| af8-security.ts | Security scan |
| af11-feedback.ts | Quality metric storage |
| inventory-engine.ts | Sub-engine: AF-3 + AF-4 |
| synthesis-engine.ts | Sub-engine: AF-2 + AF-1 |
| judgment-engine.ts | Sub-engine: AF-6 + AF-7 + AF-8 + AF-9 + AF-11 |
| af-pipeline.ts | Full pipeline orchestration |
| pipeline-config.ts | Station enable/disable + model hints |

### learning/ (14 files) — WHEN IMPROVING FEEDBACK LOOP
AI learning system.

| File | Purpose |
|------|---------|
| feedback-store.ts | Persist generation quality data |
| feedback-types.ts | FeedbackEntry, FeedbackQuery types |
| quality-scorer.ts | Multi-dimensional code scoring |
| model-preference.ts | Track best model per task type |
| model-selection.ts | Select model from historical data |
| prompt-ab-tester.ts | A/B test prompt variants |
| prompt-evolver.ts | Evolve prompts from feedback |
| prompt-version-store.ts | Version prompt variants |
| prompt-types.ts | PromptVariant, PromptExperiment types |
| rag-quality-tracker.ts | Track RAG pattern retrieval quality |
| rag-weight-integrator.ts | Adjust RAG weights from outcomes |
| dispatcher-integration.ts | Wire learning into AI dispatcher |

### rag-init/ — WHEN ADDING RAG SEED FILES
Pattern extraction and skill indexing. All files use **semantic slug names**.

```
analytics-rag-seed.ts
etl-data-integration.rag-seed.ts
event-attendance.rag-seed.ts
event-management.rag-seed.ts
freelancer-marketplace-ip-management.rag-seed.ts
friend-request-social-feed.rag-seed.ts
marketplace.rag-seed.ts
saas-multi-tenancy-ai-addons.rag-seed.ts
saas-multi-tenancy-billing-lifecycle.rag-seed.ts
saas-multi-tenancy-enterprise-platform.rag-seed.ts
saas-multi-tenancy-mvp-builder.rag-seed.ts
saas-multi-tenancy-publishing-infra.rag-seed.ts
sharable-flows-marketplace.rag-seed.ts
warehouse-ingestion-rag-seed.ts
... and supporting infrastructure files (index.ts, rag-indexer.service.ts, etc.)
```

**Naming rule:** New RAG seed files must be `{domain-slug}.rag-seed.ts` — never `flow14-etl-rag-seed.ts`.

### engine/flows/ — PER-FLOW IMPLEMENTATIONS
All subdirectories use **semantic slugs** — no `flow-NN/` subdirectories.

```
bundle-activation/          bfa-conflict-arbitration/
business-onboarding/        client-push/
completion-gamification/    design-system-governance/
engine-self-awareness/      event-attendance/
event-management/           event-participation/
feature-registry/           flow-extension-engine/
friend-request-social-feed/ generation-loop/
human-approval-gate/        marketplace/
membership-group-feed/      meta-arbitration/
oss-curriculum/             rag-optimization/
rag-quality-feedback/       reviews-reputation/
schema-registry-dag/        subscription-billing/
tenant-lifecycle/           transactional-event-participation/
user-groups-communities/    user-registration/
```

### Other Modules

| Module | Files | Purpose |
|--------|-------|---------|
| engine/ | 4+ | Flow generator + generation result + self-sufficiency services |
| api/ | 7 | REST controllers: engine, tenant, health, docs, learning |
| bootstrap/ | 5 | Startup sequence, health reporter, RAG bootstrap |
| devops/ | 10 | Structured logging, correlation middleware, Docker/CI validators |
| doc-gen/ | 6 | OpenAPI, diagrams, READMEs, service catalog generators |

---

## Client Modules (client/src/)

| Module | Files | Purpose |
|--------|-------|---------|
| api/ | 3 | HTTP client for engine API |
| components/dashboard/ | — | Engine dashboard widgets |
| components/generationlab/ | — | Code generation UI |
| components/tenants/ | — | Tenant management |
| components/learning/ | — | Learning dashboard |
| components/designer/ | — | Flow designer |
| components/monitor/ | — | System monitor |
| components/registry/ | — | Factory/contract registry viewer |
| components/freedom/ | — | FREEDOM config editor |
| hooks/ | 8 | React hooks for engine state |
| pages/{slug}/ | 11+ | Per-flow page components (semantic slug dirs) |
| theme/ | 1 | Tailwind theme config |

**Naming rule:** `client/src/pages/{slug}/` and `client/__tests__/flows/{slug}/` — never `pages/flow01/` or `__tests__/flows/flow-01/`.
