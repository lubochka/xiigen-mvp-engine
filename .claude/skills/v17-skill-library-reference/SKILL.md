---
name: v17-skill-library-reference
version: "1.0.0"
description: >
  Complete reference map of the V17-skills library (xiigen_v18_complete).
  Every session working with XIIGen must load this to know what already exists,
  where each skill lives, which language alternatives are available per skill,
  and how to retrieve the right file for the current stack (Node.js/TypeScript).
  
  Without this skill, sessions default to the C# primary implementation
  and miss the TypeScript, Python, Java, Rust, and PHP alternatives that
  already exist for every skill.
author: luba
updated: "2026-03-18"
priority: MANDATORY
triggers:
  - "v17 skill"
  - "skill library"
  - "xiigen skill"
  - "existing skill"
  - "which skill"
  - "skill reference"
  - "alternatives"
---

# V17 Skill Library Reference

## CRITICAL: How the Library Is Structured

Every V17 skill has this layout:

```
V17-skills/
└── [NN]-[skill-name]/
    ├── SKILL.md                          ← SPEC (stack-agnostic, always read this first)
    ├── Implementation/                   ← C# primary (DO NOT USE for NestJS projects)
    │   └── *.cs
    └── alternatives/
        ├── nodejs/                       ← TypeScript — USE THIS for NestJS
        │   └── [skill-name].ts
        ├── python/                       ← Python alternative
        ├── java/                         ← Java alternative
        ├── rust/                         ← Rust alternative
        └── php/                          ← PHP alternative
```

**Rule for the current stack (NestJS + TypeScript):**
1. Read `SKILL.md` for the spec and concepts
2. Read `alternatives/nodejs/[skill-name].ts` for the TypeScript implementation
3. Ignore `Implementation/*.cs` — that is the original .NET 9 version

**Exception skills with different alternative categories:**
- Skill 26 (`web-flow-editor`): alternatives are `react/`, `vue/`, `svelte/`, `angular/`, `solid/`
- Skill 27 (`k8s-deployment`): alternatives are `k8s-helm/`, `render/`, `railway/`, `fly-io/`, `docker-compose/`
- Top-level `alternatives/`: RAG backends (10 options) + DevOps hosting (13 options)

---

## Layer Map — Build Order

Skills are organized in dependency layers. Lower layers must exist before higher ones.

| Layer | Skills | Purpose |
|-------|--------|---------|
| L0 Foundation | 00a, 00b | RAG interfaces + planner |
| L1 Foundation | 01, 02 | Core interfaces + MicroserviceBase, ObjectProcessor |
| L2 Storage | 03, 04, 05 | Elasticsearch, Redis, Database Fabric |
| L3 AI | 06, 07 | AI Providers, AI Dispatcher |
| L4 Flow Engine | 08, 09, 14, 15 | Flow Definition, Orchestrator, Debugger, API Gateway |
| L5 AI Pipeline | 10, 11, 12, 13, 16, 39 | Figma Parser, Transform, Review, Feedback, Context, Bridge |
| L6 Generation | 17, 18, 19, 28, 33, 34 | Code Gen, Docs, Design System, Prompts, Swagger |
| L7 Infrastructure | 20, 21, 22, 23, 24, 32, 35, 36, 37, 38 | Auth, Permissions, Logger, Monitoring, Notifications, CI/CD, MCP, Logging, Safe Code, Optimization |
| L8 QA | 29, 30, 31, 27, 26 | Unit Tests, E2E, UI Testing, Deployment, Web Editor |
| L9 Domain | 40–63, 25 | Business flows, React Native client |

---

## Complete Skill Index

### Foundation Layer (L0–L1)

| Skill | Directory | Description | Node.js Alt |
|-------|-----------|-------------|------------|
| 00a | `00a-rag-interfaces` | Generic RAG contracts — swap Neo4j/Pinecone/ES-kNN/CosmosDB via DI | `alternatives/nodejs/rag-interfaces.ts` |
| 00b | `00b-rag-planner` | AI-driven query planning — decides what context to fetch and where to store | `alternatives/nodejs/rag-planner.ts` |
| 01 | `01-core-interfaces` | DataProcessResult, IDatabaseService, IQueueService, IAiProvider, MicroserviceBase | `alternatives/nodejs/core-interfaces.ts` |
| 02 | `02-object-processor` | ParseDocument (DNA-1), BuildQueryFilters (DNA-2), dynamic object handling | `alternatives/nodejs/object-processor.ts` |

### Storage Layer (L2)

| Skill | Directory | Description | Node.js Alt |
|-------|-----------|-------------|------------|
| 03 | `03-elasticsearch-datastore` | Elasticsearch provider implementing IDatabaseService | `alternatives/nodejs/elasticsearch-datastore.ts` |
| 04 | `04-redis-queue-service` | Redis Streams provider implementing IQueueService | `alternatives/nodejs/redis-queue-service.ts` |
| 05 | `05-database-fabric` | Factory pattern — swap ES/Mongo/PostgreSQL/Redis/CosmosDB/Neo4j via config | `alternatives/nodejs/database-fabric.ts` |

### AI Layer (L3)

| Skill | Directory | Description | Node.js Alt |
|-------|-----------|-------------|------------|
| 06 | `06-ai-providers` | Claude, OpenAI, Gemini, DeepSeek implementations of IAiProvider with retry | `alternatives/nodejs/ai-providers.ts` |
| 07 | `07-ai-dispatcher` | Fan-out to N models in parallel, score responses, select best or generate consensus | `alternatives/nodejs/ai-dispatcher.ts` |

### Flow Engine Layer (L4)

| Skill | Directory | Description | Node.js Alt |
|-------|-----------|-------------|------------|
| 08 | `08-flow-definition` | DAG-based flow model with validation, CRUD, pre-built flow templates | `alternatives/nodejs/flow-definition.ts` |
| 09 | `09-flow-orchestrator` | DAG execution engine — topological traversal, parallel fan-out/fan-in, state | `alternatives/nodejs/flow-orchestrator.ts` |
| 14 | `14-node-debugger` | Captures/stores/queries debug data for every flow node execution | `alternatives/nodejs/node-debug-service.ts` |
| 15 | `15-api-gateway` | API gateway with trace-ID polling, WebSocket live updates, rate limiting | `alternatives/nodejs/api-gateway.ts` |

### AI Pipeline Layer (L5)

| Skill | Directory | Description | Node.js Alt |
|-------|-----------|-------------|------------|
| 10 | `10-figma-parser` | Parses Figma API JSON into structured HTML/CSS/component trees | `alternatives/nodejs/figma-parser.ts` |
| 11 | `11-ai-transform` | Multi-model code gen with parallel dispatch, feedback injection, prompt versioning | `alternatives/nodejs/ai-transform.ts` |
| 11e | `11-ai-transform-executor` | Step executor variant — prepares prompts, dispatches, collects results | `alternatives/nodejs/ai-transform-executor.ts` |
| 12 | `12-ai-review` | AI code review — validates quality, security, architecture compliance | `alternatives/nodejs/ai-review.ts` |
| 12e | `12-ai-review-executor` | Evaluates multiple outputs, scores against criteria, selects best | `alternatives/nodejs/ai-review-executor.ts` |
| 13 | `13-feedback-service` | Stores/retrieves node execution feedback, scores, improvement suggestions | `alternatives/nodejs/feedback-service.ts` |
| 16 | `16-ai-context-service` | Assembles RAG + feedback + history + design patterns into AI context packages | `alternatives/nodejs/ai-context-service.ts` |
| 39 | `39-figma-plugin-bridge` | Connects Figma plugins to XIIGen flow engine via webhook/polling | `alternatives/nodejs/figma-plugin-bridge.ts` |

### Generation Layer (L6)

| Skill | Directory | Description | Node.js Alt |
|-------|-----------|-------------|------------|
| 17 | `17-code-generator` | Transforms AI output into production-ready project structures, multi-stack | `alternatives/nodejs/code-generator.ts` |
| 18 | `18-documentation-service` | Auto-generates README, API docs, architecture docs, Mermaid diagrams | `alternatives/nodejs/documentation-service.ts` |
| 19 | `19-design-system-service` | Extracts design tokens from Figma, builds themes, generates platform styles | `alternatives/nodejs/design-system-service.ts` |
| 28 | `28-prompt-engineering` | Prompt template management, versioning, A/B testing, optimization | `alternatives/nodejs/prompt-template-service.ts` |
| 33 | `33-documentation` | Documentation generation service (alternative to 18) | `alternatives/nodejs/documentation-service.ts` |
| 34 | `34-swagger-openapi` | OpenAPI 3.0 spec generation from flow definitions | `alternatives/nodejs/swagger-openapi-service.ts` |

### Infrastructure Layer (L7)

| Skill | Directory | Description | Node.js Alt |
|-------|-----------|-------------|------------|
| 20 | `20-auth-service` | JWT auth — register, login, refresh, token validation | `alternatives/nodejs/auth-service.ts` |
| 21 | `21-permissions-service` | Role-based access control, permission checking, resource guards | `alternatives/nodejs/permissions-service.ts` |
| 22 | `22-logger-service` | Structured logging to Elasticsearch, log levels, correlation IDs | `alternatives/nodejs/logger-service.ts` |
| 23 | `23-monitoring-service` | Health dashboards, metrics, alerting, performance tracking | `alternatives/nodejs/monitoring-service.ts` |
| 24 | `24-notification-service` | Multi-channel notifications — push, email, SMS, WhatsApp | `alternatives/nodejs/notification-service.ts` |
| 32 | `32-devops-cicd` | CI/CD pipeline generation — GitHub Actions, GitLab CI, etc. | `alternatives/nodejs/ci-cd-service.ts` |
| 35 | `35-mcp-server` | MCP server for AI API access via Claude tools protocol | `alternatives/nodejs/mcp-server-service.ts` |
| 36 | `36-logging` | Advanced logging and exception middleware | `alternatives/nodejs/logging-service.ts` |
| 37 | `37-safe-code` | Security scanning, vulnerability management, safe code patterns | `alternatives/nodejs/safe-code-service.ts` |
| 38 | `38-optimization` | Resource management, performance optimization, caching strategies | `alternatives/nodejs/optimization-service.ts` |

### QA Layer (L8)

| Skill | Directory | Description | Node.js Alt |
|-------|-----------|-------------|------------|
| 26 | `26-web-flow-editor` | Visual flow editor UI | `alternatives/react/FlowEditor.tsx` (also: vue, svelte, angular, solid) |
| 27 | `27-k8s-deployment` | Kubernetes + Helm deployment | `alternatives/k8s-helm/helm-chart.yaml` (also: render, railway, fly-io, docker-compose) |
| 29 | `29-unit-testing` | Unit test generator for flow nodes and services | `alternatives/nodejs/unit-test-generator.ts` |
| 30 | `30-e2e-testing` | E2E test generator for complete flows | `alternatives/nodejs/e2e-test-generator.ts` |
| 31 | `31-ui-testing` | UI test generator — Playwright/Cypress for frontend | `alternatives/nodejs/ui-testing.ts` |

### Domain Layer (L9) — Business Flow Skills

| Skill | Directory | Description | Node.js Alt |
|-------|-----------|-------------|------------|
| 25 | `25-react-native-client` | React Native mobile client | `alternatives/nodejs/web-client.ts` |
| 40 | `40-content-generation-pipeline` | Audio→text→images→video→music→scheduled posts | `alternatives/nodejs/content-pipeline.ts` |
| 41 | `41-whatsapp-diet-flow` | WhatsApp diet tracking with AI calorie analysis | `alternatives/nodejs/whatsapp-diet.ts` |
| 42 | `42-chat-service` | Real-time chat between entities | `alternatives/nodejs/chat-service.ts` |
| 43 | `43-calculator-metrics` | Metrics and scoring calculations | `alternatives/nodejs/calculator-service.ts` |
| 44 | `44-moderation-service` | AI + human content moderation | `alternatives/nodejs/moderation-service.ts` |
| 45 | `45-design-patterns` | 19 design patterns with when/how/anti-patterns in 6 languages | `alternatives/nodejs/design-patterns.ts` |
| 46 | `46-feed-service` | Feed generation and management | `alternatives/nodejs/feed-service.ts` |
| 47 | `47-matching-service` | Entity matching and recommendation | `alternatives/nodejs/matching-service.ts` |
| 48 | `48-analytics-service` | Analytics, metrics, event tracking | `alternatives/nodejs/analytics-service.ts` |
| 49 | `49-connections-service` | Social graph connections | `alternatives/nodejs/connection-service.ts` |
| 50 | `50-groups-service` | Group management and membership | `alternatives/nodejs/groups-service.ts` |
| 51 | `51-questionnaire-service` | Dynamic questionnaire and survey engine | `alternatives/nodejs/questionnaire-service.ts` |
| 52 | `52-post-service` | Post creation, feed, reactions | `alternatives/nodejs/post-service.ts` |
| 53 | `53-event-management-service` | Event scheduling, tickets, attendance | `alternatives/nodejs/event-management-service.ts` |
| 54 | `54-ranking-service` | Ranking, leaderboards, scoring | `alternatives/nodejs/ranking-service.ts` |
| 55 | `55-validation-service` | Input validation, business rule validation | `alternatives/nodejs/validation-service.ts` |
| 56 | `56-payment-service` | Payment processing, subscriptions, billing | `alternatives/nodejs/payment-service.ts` |
| 57 | `57-weight-calculator-service` | Weight/scoring calculation engine | `alternatives/nodejs/weight-calculator-service.ts` |
| 58 | `58-sso-service` | Single sign-on, OAuth, SAML integration | `alternatives/nodejs/sso-service.ts` |
| 59 | `59-learning-service` | Learning management, courses, progress | `alternatives/nodejs/learning-service.ts` |
| 60 | `60-gamification-service` | Points, badges, achievements, streaks | `alternatives/nodejs/gamification-service.ts` |
| 61 | `61-marketplace-service` | Marketplace listings, transactions, reviews | `alternatives/nodejs/marketplace-service.ts` |
| 62 | `62-calendar-service` | Calendar, scheduling, availability | `alternatives/nodejs/calendar-service.ts` |
| 63 | `63-ticketing-service` | Support tickets, issue tracking | `alternatives/nodejs/ticketing-service.ts` |

---

## Top-Level Alternatives Catalog (50 options)

Located at `V17-skills/alternatives/` — these are framework-level swaps, not skill implementations.

### RAG Backends (10 options) — `alternatives/rag/` and `alternatives/rag-advanced/`

| Option | Best For | Files |
|--------|----------|-------|
| Elasticsearch kNN | Default, already in docker-compose | `rag/elasticsearch-knn/` |
| Neo4j GraphRAG | Production, complex graph queries | `rag/neo4j/` |
| Pinecone | Managed vector, high scale | `rag/pinecone/` |
| CosmosDB Graph | Azure-native | `rag/cosmosdb/` |
| Azure AI Search | Azure-native, hybrid | `rag/azure-ai-search/` |
| LightRAG | Budget, 80-90% fewer API calls | `rag-advanced/` |
| nano-graphrag | Full control, hackable | `rag-advanced/` |
| LangChain KG | Already in LangChain ecosystem | `rag-advanced/` |
| Neptune + Bedrock | AWS-first enterprise | `rag-advanced/` |
| HybridRAG (DIY) | Maximum flexibility | `rag-advanced/` |

**Quick pick:** Prototype → Elasticsearch kNN | Production → Neo4j | Budget → LightRAG

### DevOps Hosting (13 options) — `alternatives/devops/`

| Option | Best For | File |
|--------|----------|------|
| Railway | Fast GitHub deploy | `PaaS_Railway_Render_Fly_Vercel.cs` |
| Render | Heroku replacement | `PaaS_Railway_Render_Fly_Vercel.cs` |
| Fly.io | Global edge, low latency | `PaaS_Railway_Render_Fly_Vercel.cs` |
| GKE/EKS/AKS/DO | Managed K8s | `ManagedK8s_GKE_EKS_AKS_DO.tf` |
| Nomad/Swarm/K3s | Lightweight | `Lightweight_Enterprise_Nomad_Swarm_K3s.hcl` |
| OpenShift/Rancher | Enterprise | `Lightweight_Enterprise_Nomad_Swarm_K3s.hcl` |

**Quick pick:** Prototype → Railway | Production → Render/AKS | Enterprise → OpenShift

### Mobile Client — `alternatives/clients/`
- `native-kotlin/FlowRunner.kt` — Android native client

---

## How to Use This Skill

### Finding a skill for your current task

1. **Identify which layer** your task belongs to (L0–L9)
2. **Find the skill number** in the index above
3. **Read `SKILL.md`** for the spec (stack-agnostic, always authoritative)
4. **Read the Node.js alternative** at `alternatives/nodejs/[skill-name].ts`
5. **Do NOT read** `Implementation/*.cs` unless you need to understand the C# primary

### Adapting TypeScript alternatives for NestJS

The V17 TypeScript alternatives are standalone TypeScript — no NestJS decorators.
When adapting for the current NestJS server, apply these transformations:

| V17 TypeScript pattern | NestJS equivalent |
|----------------------|-------------------|
| `class X implements IX` | `@Injectable() class X extends MicroserviceBase` |
| Constructor injection | `@Inject(TOKEN) private svc: IService` |
| `tenant_id` as parameter | Remove — read from `AsyncLocalStorage` via `TenantContext` |
| `prefix` parameter in DB calls | Remove — providers read tenant context internally |
| Direct ES/Redis imports | Replace with `IDatabaseService` / `IQueueService` fabric interfaces |

### Key difference: tenantId handling

V17 alternatives pass `prefix` (tenant namespace) explicitly to every DB call.
The current NestJS server removed this — tenantId flows through AsyncLocalStorage.

```typescript
// V17 alternative (DO NOT copy):
db.storeDocument(index, this.serviceName, id, doc)  // serviceName as prefix

// Current NestJS server (correct):
db.storeDocument(index, doc, id)  // tenant context read internally
```

---

## File at the Root of xiigen_v18_complete

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Commands, DNA rules, quick reference — READ THIS IN EVERY SESSION |
| `MASTER_PLAN.md` | Build order and phase descriptions for V16 skill creation |
| `SKILL_FACTORY.md` | Template for creating new skills in the V17 format |
| `CONSOLIDATION_STATE.md` | Status of which skills have been built/merged |
| `DOC_RAG_INDEX.md` | RAG index of all documentation |
| `V17-skills/alternatives/ALTERNATIVES.md` | Full catalog of 50 framework alternatives |
| `.cursorrules` | Cursor IDE rules |
| `.github/copilot-instructions.md` | GitHub Copilot instructions |
