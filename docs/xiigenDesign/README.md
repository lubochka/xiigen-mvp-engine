# XIIGen — Self-Building AI Code Generation Engine

> **LIVE IMPLEMENTATION — Branch: claude/vigorous-margulis**
> Stack: Node.js 22 + TypeScript 5 + NestJS 11 + React 18 + Vite 5
> Tests: 10,470 passing (server) + ~1,080 (client) | tsc: 0 errors
> Flows implemented: 24 domain flows (FLOW-01..24) + 16 infrastructure flows (FLOW-25..40) + FLOW-45

---

## UPDATE NOTES (2026-04-14)

This document was originally written during the Node.js migration planning phase (P1-P26).
Below are the **actual implementation values** from the live codebase:

| Artifact | Design doc value | Actual codebase value |
|----------|-----------------|----------------------|
| Factories | F1-F1483 | F1-F1600+ (highest referenced: F1592) |
| Task Types | T1-T564 | T1-T649 + T367-T374 (398 unique task types) |
| BFA Rules | CF-1-CF-788 | CF-1-CF-809+ (94 unique rule IDs in bfa-rules.ts files) |
| Skills | SK-1-SK-401 | SK-1-SK-529 (469 skill .md files) |
| Services | ~200 (design) | 378 service files in server/src/engine/flows/ |
| Test suites | ~50 (design) | 151 e2e spec files + 600+ unit test suites |
| Flow dirs | ~30 (design) | 45 flow directories |
| Client pages | ~20 (design) | 71 React page components |
| Package manager | pnpm | **npm** (actual) |
| Node.js | 20 LTS | **22.16.0** (actual) |
| NestJS | 10 | **11.1.16** (actual) |

---

## Quick Start

### Server (NestJS / TypeScript)
```bash
cd server && npm install
npm run start:dev                # nest start --watch
npx jest --verbose               # 10,470 tests
npx tsc --noEmit                 # 0 errors expected
```

### Client (React 18 / Vite 5)
```bash
cd client && npm install
npm run dev                      # Vite dev server
npx vitest run                   # ~1,080 tests
npm run build                    # Production build
```

---

## Stack (Actual)

| Layer | Technology |
|---|---|
| Backend language | TypeScript 5 (strict) |
| Backend runtime | Node.js 22.16.0 |
| Backend framework | NestJS 11.1.16 |
| Frontend | React 18 + Vite 5 + TypeScript + Tailwind CSS |
| Package manager | npm (not pnpm) |
| Testing (server) | Jest 29 + ts-jest |
| Testing (client) | Vitest 4.1.4 |
| Multi-tenancy | Kernel-level (TenantContext + AsyncLocalStorage via nestjs-cls) |

---

## Actual Project Structure

```
server/
├── src/
│   ├── kernel/               # DNA primitives + multi-tenant core
│   ├── fabrics/              # 6 fabric layers: database, queue, ai-engine, rag, secrets, flow-engine
│   │   └── graph/            # Graph Intelligence Layer
│   ├── factories/            # Universal factory pattern + registry
│   ├── engine-contracts/     # Task type definitions + archetypes
│   ├── engine/               # Flow generator + self-sufficiency services
│   │   └── flows/            # 45 flow directories with 378 services
│   ├── guardrails/           # BFA + DNA validator + promotion ladder
│   ├── freedom/              # FREEDOM config manager
│   ├── af-stations/          # 11 AF stations + 3 sub-engines + pipeline
│   ├── api/                  # REST controllers (DynamicController pattern)
│   ├── bootstrap/            # Startup sequence + history seeds
│   ├── devops/               # Logging, Docker, CI validators
│   ├── doc-gen/              # OpenAPI, diagrams, service catalog
│   ├── learning/             # Feedback, model preference, prompt A/B
│   └── rag-init/             # Pattern extraction + skill indexing
├── test/
│   └── e2e/                  # 151 e2e spec files across 45 flow dirs

client/
├── src/
│   ├── pages/                # 71 React page components (per-flow pages)
│   ├── components/           # Shared UI components
│   ├── hooks/                # React Query hooks
│   └── api/                  # API client + endpoints
├── __tests__/flows/          # Per-flow client tests
└── e2e/                      # Playwright + topology tests
```

---

## Fabric Architecture (Actual)

| Fabric | Interface | Providers |
|--------|-----------|-----------|
| DATABASE | `IDatabaseService` | Elasticsearch (primary), in-memory (test) |
| QUEUE | `IQueueService` | In-memory queue (current), Redis Streams (planned) |
| AI_ENGINE | `IAiProvider` + `AiDispatcher` | Anthropic, OpenAI, Gemini, MockAiProvider |
| RAG | `IRagService` | InMemoryRagProvider, LightRAG, Memgraph, NanoGraphRAG |
| SECRETS | `ISecretsService` | Environment-based (current) |
| FLOW_ENGINE | `IFlowOrchestrator` | CycleChainService + AF pipeline |

## DNA Compliance (All 9 Patterns — Enforced)

| DNA | Pattern | Enforcement |
|-----|---------|-------------|
| DNA-1 | Record<string, unknown> | No typed business models anywhere |
| DNA-2 | BuildSearchFilter | Auto-skip null/undefined fields |
| DNA-3 | DataProcessResult<T> | Never throw for business logic |
| DNA-4 | MicroserviceBase | All services extend it (19 components) |
| DNA-5 | AsyncLocalStorage | TenantContext via nestjs-cls ClsService |
| DNA-6 | DynamicController | /api/dynamic/{indexName} — no entity controllers |
| DNA-7 | Idempotency | SETNX dedup keys on all queue consumers |
| DNA-8 | Outbox | storeDocument() BEFORE enqueue() always |
| DNA-9 | CloudEvents | createCloudEvent() envelope on all events |

## Flow Implementation Status

| Range | Flows | Status |
|-------|-------|--------|
| FLOW-01..14 | User Registration through ETL | ✅ COMPLETE (prior sessions) |
| FLOW-15..24 | SaaS Multi-Tenancy through AI Safety | ✅ COMPLETE (55 new services, T605-T649 + T367-T374) |
| FLOW-25..40 | Infrastructure flows | ✅ COMPLETE (existing implementations + TEACH-QA) |
| FLOW-41..44 | Platform adapters | 📦 EXTERNAL_REPO (Canva/Miro/Webflow/Framer) |
| FLOW-45 | History Bootstrap | ✅ COMPLETE (BootstrapFromDocumentsService) |

## Artifact Boundaries (Current — 2026-04-14)

```
Next Factory:   F1601     Next Family:   209
Next Task Type: T650      Next BFA Rule: CF-809
Next Skill:     SK-529
Test baseline:  10,470 server + ~1,080 client
Branch:         claude/vigorous-margulis
```
