# XIIGen — Self-Building AI Code Generation Engine

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE)

**Fabric-first AI code generation engine for agentic workflows — developed with Claude Code, Codex and Cursor, and shipping the agent skill libraries it is built with ([`.claude/skills/`](./.claude/skills/), [`.agents/skills/`](./.agents/skills/)).**

_Last verified: 2026-07-23_

## What is XIIGen?

XIIGen is a fabric-first AI code generation engine that generates application flows
on demand — flow definitions, generated services, configuration documents, and
cross-flow validations — rather than implementing features by hand. It sits on six
swappable fabric interfaces (database, queue, AI model, RAG strategy, secrets store,
and flow orchestrator), so every infrastructure provider can be replaced at runtime
through configuration alone.

Service code never imports a provider SDK; it depends on an interface, and the
concrete provider is resolved when the process boots. Generated code is not trusted
on faith: nine structural DNA rules are machine-checked in the guardrails layer, and
a separate judge model scores each result. The repository currently carries 46
generated-flow directories under `server/src/engine/flows/`. With the default
configuration the engine boots fully offline — `AI_PROVIDER=mock`, every fabric
`in_memory` — so the server runs and the tests pass with zero API keys and no
external services.

## What ships working out of the box

XIIGen is an engine, but this repository ships seeded with real, running product
flows — the ones almost every new product rebuilds from scratch. The product is
specified as 48 canonical flows, while the engine currently carries 46 generated-flow
implementation directories under `server/src/engine/flows/`; the two numbers describe
different things — product scope versus implementation directories on disk. Fourteen
of those flows are live today, meaning a user can complete them end to end. The table
below lists the seven live product categories, plus three modules whose back-end
services and tests already pass but that are one small, named route or page away from
being visible. Statuses come from
[`docs/business-flows/FLOW-BY-FLOW-STATUS.md`](./docs/business-flows/FLOW-BY-FLOW-STATUS.md).

| Module | What a user can do | Status (Live / One route away) | Key code path |
|--------|--------------------|--------------------------------|---------------|
| **Onboarding** | A new member signs up with SSO or email, verifies their address, walks a three-step wizard, and lands on a personalised dashboard. | Live | [`server/src/engine/flows/user-registration/`](./server/src/engine/flows/user-registration/) |
| **Events** | An organiser creates, promotes, and publishes an event through a four-step wizard; members RSVP, attend, and move through the paid-ticket pipeline. | Live | [`server/src/engine/flows/event-management/`](./server/src/engine/flows/event-management/) |
| **Gamification** | A member completes an activity, earns XP, extends a streak, and collects badges on a celebratory completion screen. | Live | [`server/src/engine/flows/completion-gamification/`](./server/src/engine/flows/completion-gamification/) |
| **Social** | Members post to a feed, send and accept friend requests, join topic groups, and leave star-rating reviews that build a reputation score. | Live | [`server/src/engine/flows/friend-request-social-feed/`](./server/src/engine/flows/friend-request-social-feed/) |
| **Marketplace** | A seller lists a product and buyers browse a public marketplace with filters and search, then purchase. | Live | [`server/src/engine/flows/marketplace/`](./server/src/engine/flows/marketplace/) |
| **Billing** | A customer picks a plan, views invoices across paid, failed, and open states, and manages their subscription. | Live | [`server/src/engine/flows/subscription-billing/`](./server/src/engine/flows/subscription-billing/) |
| **Platform ops** | An admin registers schema versions against a dependency graph, monitors the platform agent, and watches a deep-research run's budget in real time. | Live | [`server/src/engine/flows/schema-registry-dag/`](./server/src/engine/flows/schema-registry-dag/) |
| **Blog** | The publishing pipeline of 18 services runs; adding the missing public `/blog` and `/blog/:slug` reader routes surfaces it. | One route away | [`server/src/engine/flows/blog-cms-modules/`](./server/src/engine/flows/blog-cms-modules/) |
| **Dynamic forms** | The form-submission back-end is built; adding the missing public `/forms/:schemaId` page surfaces it. | One route away | [`server/src/engine/flows/dynamic-forms-workflows/`](./server/src/engine/flows/dynamic-forms-workflows/) |
| **Privacy & consent** | The consent enforcer runs server-side; adding the missing user-facing `/settings/privacy` page surfaces it. | One route away | [`server/src/engine/flows/ads-platform/`](./server/src/engine/flows/ads-platform/) |

New to the project? Start with the [FAQ](./faq/README.md). Its ten questions cover
what this engine does and does not do — including whether it trains model weights —
each answered with anchors into real files of this repository.

## Searchable Use Cases

Real capabilities you can search for, each answered by code in this repository:

- **Swap the AI model provider at runtime (Anthropic, OpenAI, Gemini, Grok)** — every provider sits behind one interface in [`server/src/fabrics/ai-engine/`](./server/src/fabrics/ai-engine/); the default is a mock provider, so the engine boots with no API keys.
- **Validate AI-generated code with structural rules** — nine DNA rules are machine-checked in [`server/src/guardrails/dna-validator.ts`](./server/src/guardrails/dna-validator.ts).
- **Score generated code with a judge model** — the judgment stage lives in [`server/src/af-stations/af6-code-review.ts`](./server/src/af-stations/af6-code-review.ts) and the arbiter loop in [`server/src/engine/arbitration/arbiter.service.ts`](./server/src/engine/arbitration/arbiter.service.ts).
- **Multi-tenant isolation with AsyncLocalStorage in NestJS** — the tenant kernel is [`server/src/kernel/multi-tenant/`](./server/src/kernel/multi-tenant/).
- **Orchestrate flows from DAG topology JSON** — cycle topologies live in [`contracts/topologies/`](./contracts/topologies/) and execute through [`server/src/fabrics/interfaces/flow-orchestrator.interface.ts`](./server/src/fabrics/interfaces/flow-orchestrator.interface.ts).
- **GraphRAG behind a swappable interface** — see [`server/src/fabrics/interfaces/graph-rag.interface.ts`](./server/src/fabrics/interfaces/graph-rag.interface.ts) and [`server/src/fabrics/graph/`](./server/src/fabrics/graph/).
- **Build preference-training signal from judge disagreement (no weight training)** — [`server/src/learning/dpo-training-pipeline.service.ts`](./server/src/learning/dpo-training-pipeline.service.ts) collects and cleans the signal; the engine itself trains no model weights.
- **A working Claude Code / Codex / Cursor skill library in a real project** — [`.claude/skills/`](./.claude/skills/), [`.agents/skills/`](./.agents/skills/), [`CLAUDE.md`](./CLAUDE.md), [`AGENTS.md`](./AGENTS.md) and [`.cursorrules`](./.cursorrules).

## Key Capabilities

- **Fabric-First.** Every piece of infrastructure is reached through an interface
  (`IDatabaseService`, `IQueueService`, `IAiProvider`, and so on). Swapping a
  provider is a configuration change, not a code change.
- **9 DNA patterns.** A set of non-negotiable architectural rules for generated
  code — no typed business models, dynamic filter building, result wrappers instead
  of thrown exceptions, automatic tenant scope, and more. They are machine-checked
  in [`server/src/guardrails/dna-validator.ts`](./server/src/guardrails/dna-validator.ts).
- **Factory Pattern.** Each external dependency is resolved through a factory's
  `createAsync()`: read config, resolve from the registry, validate, health-check,
  and fall back if needed.
- **MACHINE vs FREEDOM.** Fixed business logic lives in code (MACHINE);
  configurable parameters live in configuration documents (FREEDOM). Changing a
  value a business user might tune should not require touching code.
- **Multi-Tenant Kernel.** Tenant context is propagated through AsyncLocalStorage.
  Fabric providers read the tenant scope internally, so callers cannot forget to
  isolate a tenant.
- **46 flow directories** currently live under
  [`server/src/engine/flows/`](./server/src/engine/flows/), each a generated-flow
  implementation area.

## Stack

| Layer | Technology |
|-------|-----------|
| Server | NestJS 11, TypeScript 5 |
| Client | React 18, Vite 5, Tailwind CSS, TypeScript 5 |
| Tests | Jest (server and client), Playwright (client end-to-end) |

## Quick Start

### Prerequisites

- Node.js 20 LTS or newer (CI runs on Node 24)
- npm 10+
- Docker and Docker Compose (for the containerized mode)

### Configuration

```bash
cp .env.example .env
```

The defaults are deliberately offline: `AI_PROVIDER=mock` and all infrastructure
providers start `in_memory` — the engine boots and the tests run with no API keys
and no external services. Each fabric selects its provider from an environment
variable:

| Variable | Default | Other options |
|----------|---------|---------------|
| `DATABASE_PROVIDER` | `in_memory` | `elasticsearch` |
| `QUEUE_PROVIDER` | `in_memory` | `redis_streams` |
| `AI_PROVIDER` | `mock` | `anthropic`, `openai`, `gemini`, `grok` |
| `RAG_PROVIDER` | `in_memory` | `split`, `fanout`, `tiered`, `hybrid` |
| `SECRETS_PROVIDER` | `in_memory` | `env_var`, `aws` |

### Run Locally

```bash
# Server
cd server
npm install
npm run start:dev

# Client (separate terminal)
cd client
npm install
npm run dev
```

### Run Tests

Test counts change as the engine grows — run the tests yourself for the current
counts.

```bash
# Server tests
cd server && npm test

# Client tests
cd client && npm test
```

### Run with Docker

```bash
docker compose up --build
```

By default this starts the `server` (NestJS) and `client` (React, served by nginx)
services. The optional `infra` profile additionally starts Elasticsearch, Redis,
and a nano-graphrag service:

```bash
docker compose --profile infra up --build
```

## Where to Start Reading

For the engine internals, read in this order:

1. [`docs/architecture/ARCHITECTURE_GUIDE.md`](./docs/architecture/ARCHITECTURE_GUIDE.md)
   — the 6 fabrics, the DNA patterns, the factory pattern, and the pipeline.
2. [`docs/architecture/DEVELOPER_ONBOARDING.md`](./docs/architecture/DEVELOPER_ONBOARDING.md)
   — how to add a provider, add a task type, and avoid common mistakes.
3. [`docs/business-flows/README.md`](./docs/business-flows/README.md) — what each
   business flow is meant to do.

Note: `docs/` is also a working archive of sessions — accurate at the time they
were written, not maintained as user documentation.

## FAQ

Ten questions, ten code-anchored answers — the index lives in [faq/](./faq/README.md):

1. [Does the agent actually check its own work, or does it just say it did?](./faq/does-the-agent-actually-check-its-own-work.md)
2. [Is this a hybrid architecture, or a wrapper around one model?](./faq/is-this-a-hybrid-architecture-or-a-wrapper-around-one-model.md)
3. [Can the AI invent the algorithm, or does it only type the code?](./faq/can-the-ai-invent-the-algorithm-or-does-it-only-type-the-code.md)
4. [Does this engine train models, or use new training methods?](./faq/does-this-engine-train-models-or-use-new-training-methods.md)
5. [What does "agentic" mean in this project, concretely?](./faq/what-does-agentic-mean-in-this-project.md)
6. [How does this change the developer's role?](./faq/how-does-this-change-the-developers-role.md)
7. [Which coding agent does this bet on — Claude, Codex, or Cursor?](./faq/which-coding-agent-does-this-bet-on-claude-codex-or-cursor.md)
8. [Is this a real system, or a demo?](./faq/is-this-a-real-system-or-a-demo.md)
9. [Isn't this just vibe coding with extra steps?](./faq/isnt-this-just-vibe-coding-with-extra-steps.md)
10. [How does this relate to today's trends — local LLMs, agent frameworks, AI gateways?](./faq/how-does-this-relate-to-local-llms-agent-frameworks-ai-gateways.md)

## Architecture at a Glance

```
┌─────────────────────────────────────────────────────────┐
│  CLIENT — React 18 + Vite + TypeScript + Tailwind        │
├─────────────────────────────────────────────────────────┤
│  API — NestJS Controllers                                │
├─────────────────────────────────────────────────────────┤
│  AF STATIONS — staged AI pipeline                        │
│  inventory (prompts + RAG) → synthesis (plan + generate) │
│  → judgment (review + DNA + security + score + feedback) │
├─────────────────────────────────────────────────────────┤
│  ENGINE — contracts + factories + guardrails + freedom   │
├─────────────────────────────────────────────────────────┤
│  FABRICS — 6 swappable layers + graph intelligence       │
│  DATABASE · QUEUE · AI ENGINE · RAG · SECRETS · FLOW      │
├─────────────────────────────────────────────────────────┤
│  KERNEL — DNA primitives + multi-tenant core             │
│  DataProcessResult · BuildSearchFilter · scope isolation │
└─────────────────────────────────────────────────────────┘
```

## Repository Map

| Path | Contents |
|------|----------|
| `server/` | The NestJS engine: kernel, fabrics, engine contracts, `engine/flows`, guardrails, AF stations, and API controllers |
| `client/` | React 18 + Vite + Tailwind dashboards |
| `adapters/` | Third-party integration adapters (for example `stripe`, `figma`, `canva`, `shopify`, `notion`) |
| `packages/` | Publishable SDKs (`plugin-sdk`, `friend-request-privacy-sdk`) |
| `contracts/` | JSON event and bundle schemas |
| `fixtures/` | Seed data: contracts, arbiters, design-reasoning, and flow definitions |
| `e2e/` | Playwright end-to-end fixtures and specs |
| `scripts/` | Build, lint, and state-management scripts |
| `docs/` | Architecture guides, business-flow specs, and the session archive |
| `.claude/skills/`, `.agents/skills/` | Agent skill library |

## Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE_GUIDE.md](./docs/architecture/ARCHITECTURE_GUIDE.md) | The 6 layers, DNA patterns, and AF pipeline in depth |
| [DEVELOPER_ONBOARDING.md](./docs/architecture/DEVELOPER_ONBOARDING.md) | How to add providers, task types, and flows |
| [KNOWLEDGE_DIGEST.md](./docs/architecture/KNOWLEDGE_DIGEST.md) | Compact reference of interfaces and patterns |
| [business-flows/README.md](./docs/business-flows/README.md) | Navigation for the business-flow specifications |
| [docs/README.md](./docs/README.md) | Map of the docs/ tree: maintained documentation vs the working session archive |
| [faq/README.md](./faq/README.md) | Ten frequently asked questions with code-anchored answers |
| [README-TEACHING.md](./README-TEACHING.md) | Operational guide for the RAG/teaching pipeline — not an introduction to XIIGen |

## Design-Time Reference

The merged documents under [`docs/xiigenDesign/`](./docs/xiigenDesign/) —
`ENGINE_ARCHITECTURE_MERGED.md`, `TASK_TYPES_CATALOG_MERGED.md`,
`SKILLS_FACTORY_RAG_MERGED.md`, `V62_BFA_STRESS_TEST_MERGED.md`,
`UNIFIED_SOURCE_INDEX_MERGED.md`, `MASTER_EXECUTION_PLAN_MERGED.md`, and
`SESSION_STATE_MERGE.md` — capture the design-time state (31 flows as designed);
the engine has since grown to 46 flow directories. Any counts inside these
documents are design-time numbering and describe the plan, not the current code.

## Evidence and Snapshots

This public release does not include end-to-end run screenshots. They were
excluded to keep tenant and personal data out of the public tree; flow
behaviour is verified by the end-to-end test suite (see "Run Tests" above)
rather than by captured images. Some internal reports under `docs/` still quote
absolute paths from the machines that produced them; those point at material
that is not part of this release.

## Related Projects

XIIGen mvp is the application layer of the `xiigen-open-llm` ecosystem: the
trainable core lives in the open-source `xiigen-open-llm` project under the same
AGPL license. This repository builds and cleans training signal (DPO triples from
arbiter disagreement, promotion of good answers into RAG patterns) and consumes
ready model manifests through its provider interface — it does not train model
weights itself.

> `xiigen-open-llm` is a planned companion repository; until it is published this
> is a described relationship, not a link.

## Third-Party Notices

This distribution bundles third-party material under its own licenses.
See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) for attributions.

## License

XIIGen is free software, released under the GNU Affero General Public License,
version 3 (SPDX: `AGPL-3.0-only`). See [LICENSE](./LICENSE) for the full license text
and [NOTICE](./NOTICE) for the copyright notice.
