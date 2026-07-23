# XIIGen — AI Agent Instructions
## For: Claude Code, Cursor, GitHub Copilot, Cline, Windsurf, or any AI coding assistant
## Stack: NestJS 10 + TypeScript 5 (server) | React 18 + Vite + Tailwind (client)

---

## Read This First

XIIGen is a **self-building AI code generation engine** that generates application flows on demand. It does NOT implement flows directly. The engine sits on **6 fabric interfaces** — every infrastructure provider is swappable at runtime via config.

**You are extending the ENGINE, not writing application code.**

---

## The 5-Law Checklist — Run on EVERY File

| # | Law | Pass | Fail |
|---|-----|------|------|
| 1 | Does this code mention a specific entity name (User, Product, Order)? | | **REJECT** — use generic config strings |
| 2 | Is logic driven by a generic type string loaded from config? | **APPROVE** | |
| 3 | Are you creating a new Controller for this feature? | | **REJECT** — use DynamicController |
| 4 | Are you adding a new JSON config document? | **APPROVE** | |
| 5 | Does the file or directory name use `flow-NN` numeric prefix? | | **REJECT** — use semantic slug |

**OP-8 — Read-Before-Write on test files:** Before creating any file in `__tests__/flows/{slug}/`, `server/test/e2e/{slug}/`, or `client/e2e/`, run `ls {directory}/`. If a `.test.ts` or `.spec.ts` already exists: READ it first, append new tests to the existing `describe()` block, NEVER create a second file with overlapping function names. Violation = TS2393 duplicate function implementation, fails client build.

Quick self-test: *"If I renamed every entity type, would this code still compile?"* Must be **YES**.
Quick naming test: *"Could I tell what this flow does from the directory name alone?"* Must be **YES**.

---

## 9 DNA Patterns — Enforced on ALL Code

| # | Pattern | Rule | Violation Trigger |
|---|---------|------|-------------------|
| DNA-1 | ParseDocument | `Record<string, unknown>` for all business data | `class Product {`, `interface Order {` |
| DNA-2 | BuildSearchFilter | Auto-skip empty fields in queries | Hardcoded ES query with manual field checks |
| DNA-3 | DataProcessResult | Never throw for business logic | `throw new`, `throw new NotFoundException` |
| DNA-4 | MicroserviceBase | ALL services extend this base class | `@Injectable() class MyService {` without `extends MicroserviceBase` |
| DNA-5 | Scope Isolation | Tenant scope via AsyncLocalStorage — automatic | Passing `tenantId` as method parameter |
| DNA-6 | DynamicController | No entity-specific controllers | `@Controller('products')`, `@Controller('orders')` |
| DNA-7 | Idempotency | Dedup key on all queue consumers | Queue consumer without idempotency check |
| DNA-8 | Outbox | storeDocument() BEFORE enqueue() | `enqueue()` call before `storeDocument()` |
| DNA-9 | CloudEvents | Envelope on all inter-service events | Raw data in queue without CloudEvents wrapper |

---

## 6 Fabric Interfaces — The Only Way to Access Infrastructure

| Fabric | Interface | Token | Never Do This |
|--------|-----------|-------|---------------|
| DATABASE | `IDatabaseService` | `DATABASE_SERVICE` | `import { Client } from '@elastic/elasticsearch'` |
| QUEUE | `IQueueService` | `QUEUE_SERVICE` | `import Redis from 'ioredis'` |
| AI ENGINE | `IAiProvider` | `AI_PROVIDER` | `import OpenAI from 'openai'` |
| RAG | `IRagService` | `RAG_SERVICE` | Direct vector DB calls |
| SECRETS | `ISecretsService` | `SECRETS_SERVICE` | `process.env.API_KEY` for tenant keys |
| FLOW ENGINE | `IFlowOrchestrator` | `FLOW_ORCHESTRATOR` | Hardcoded orchestration logic |

**Provider SDKs are ONLY imported inside provider files** (e.g., `elasticsearch.provider.ts`). Everywhere else uses the abstract interface.

---

## Multi-Tenant — How It Works

1. Request arrives → `TenantContextMiddleware` extracts tenant from `X-Tenant-Id` header
2. `TenantContext` stored in `AsyncLocalStorage` for request duration
3. `TenantGuard` validates tenant exists and is active
4. ALL fabric providers read tenant from AsyncLocalStorage **automatically**
5. Per-tenant API keys resolved via `TenantKeyResolver` → `SecretsService`
6. Per-tenant config via `TenantConfigResolver` → `FreedomConfigManager`

**You NEVER pass tenantId to fabric methods.** It's read internally. This is by design.

---

## Naming Convention — Semantic Slugs (ENFORCED)

All directories and files use **domain slug names**. The `flow-NN` numeric prefix is prohibited everywhere except `docs/sessions/FLOW-XX/` planning documents.

| Location | Correct | Wrong |
|----------|---------|-------|
| `server/src/engine/flows/` | `marketplace-payments/` | `flow-16/` |
| `server/test/e2e/` | `subscription-billing/` | `flow-12/` |
| `server/test/{slug}/` | `meta-arbitration-engine/` | `flow35/` |
| `server/src/engine-contracts/` | `reviews-reputation-bfa-rules.ts` | `flow-10-bfa-rules.ts` |
| `server/src/rag-init/` | `etl-data-integration.rag-seed.ts` | `flow14-etl-rag-seed.ts` |
| `client/__tests__/flows/` | `freelancer-marketplace/` | `flow-17/` |

**Complete Flow → Slug mapping:**

```
FLOW-00  bundle-activation              FLOW-21  dynamic-forms-workflows
FLOW-01  user-registration              FLOW-22  cms-publishing
FLOW-02  profile-enrichment             FLOW-23  form-builder-templates
FLOW-03  event-management               FLOW-24  ai-safety-moderation
FLOW-04  event-attendance               FLOW-25  bfa-cross-flow-governance
FLOW-05  completion-gamification        FLOW-26  meta-flow-engine
FLOW-06  user-groups-communities        FLOW-27  human-interaction-gate
FLOW-07  friend-request-social-feed     FLOW-28  blog-cms-modules
FLOW-08  marketplace                    FLOW-29  adaptive-rag-deep-research
FLOW-09  transactional-event-participation  FLOW-30  tenant-lifecycle-manager
FLOW-10  reviews-reputation             FLOW-31  design-intelligence-engine
FLOW-11  schema-registry-dag            FLOW-32  sharable-flows-marketplace
FLOW-12  subscription-billing           FLOW-33  system-initiation-bootstrap
FLOW-13  data-warehouse-analytics       FLOW-34  marketplace-plugin-adapter
FLOW-14  etl-data-integration           FLOW-35  meta-arbitration-engine
FLOW-15  saas-multi-tenancy             FLOW-36  feature-registry
FLOW-16  marketplace-payments           FLOW-37  design-system-governance
FLOW-17  freelancer-marketplace         FLOW-38  rag-quality-feedback
FLOW-18  visual-flow-engine             FLOW-39  oss-curriculum
FLOW-19  durable-sagas-compliance       FLOW-40  client-push
FLOW-20  ads-platform
```

---

## Factory Pattern

Every external dependency is a factory:

```typescript
abstract class IExternalServiceFactory<TService> {
  abstract createAsync(context: FactoryResolutionContext): Promise<DataProcessResult<TService>>;
  abstract healthCheck(context: FactoryResolutionContext): Promise<DataProcessResult<Record<string, unknown>>>;
}
```

Every factory MUST declare which fabric it resolves through via `FabricType` enum:
`DATABASE`, `QUEUE`, `AI_ENGINE`, `RAG`, `SECRETS`, `FLOW_ENGINE`

---

## AF Stations — The AI Code Generation Pipeline

11 stations organized into 3 sub-engines:

```
INVENTORY (Extract)    → AF-3 Prompt Library, AF-4 RAG Context
SYNTHESIS (Generate)   → AF-2 Planning, AF-1 Genesis, AF-5 Multi-model, AF-10 Merge
JUDGMENT  (Validate)   → AF-6 Review, AF-7 DNA Check, AF-8 Security, AF-9 Judge, AF-11 Feedback
```

Pipeline: Input → INVENTORY → SYNTHESIS → JUDGMENT → PipelineResult (pass/fail + score + promotion level)

---

## Engine Contracts (Task Types)

Each task type is a full engine contract. Required format:

```
TASK TYPE: T[n] — Name
ARCHETYPE: ORCHESTRATION | DATA_PIPELINE | AI_GENERATION | EVENT_HANDLER | INTEGRATION | VALIDATION
FACTORY DEPENDENCIES: F[n]:IInterface → FABRIC(provider)
AF CONFIGURATION: Which stations generate/review/judge
BFA VALIDATION: Entities, events, routes registered
MACHINE/FREEDOM: Fixed logic vs configurable params
IRON RULES: Violations = build failure
QUALITY GATES: What AF-9 checks
```

**One-line stubs are NEVER acceptable.** Full format required.

Contract files follow naming rule: `{domain-slug}-contracts.ts` — never `flow-NN-contracts.ts`.

---

## Guardrails

- **BFA (Business Flow Arbiter):** Detects entity ownership, route overlap, event collision across all flows
- **DNA Validator:** Enforces all 9 patterns — violations block deployment
- **Promotion Ladder:** GENERATED → INJECTED → MINIMAL → CORE

---

## FREEDOM vs MACHINE

| MACHINE (code, changes via PR) | FREEDOM (config, changes via admin UI) |
|-------------------------------|---------------------------------------|
| Mathematical formulas | Entity field definitions |
| State machine transitions | Notification templates |
| Queue coordination patterns | Approval thresholds |
| Retry/circuit breaker logic | AI model selection per step |
| Trace ID propagation | Feature flags per tenant |
| Cryptographic operations | Pricing tier rules |

If a business user might want to change it → FREEDOM. If it's core infrastructure → MACHINE.

---

## OP-2 Code Quality — Absolute Constraints

Applied to every production TypeScript file Claude Code generates or modifies:

1. **No `as any` or `: any`** — use `Record<string, unknown>`, `unknown`, or `as unknown as T`
2. **No `/* eslint-disable */` banners** — fix the lint violation instead
3. **No inline `// eslint-disable-next-line` with em-dash (—)** — use `--` (two hyphens)
4. **No `flow-NN` numeric names** in test dirs, contract files, or source files

Run before every commit:
```bash
./scripts/pre-commit-check.sh
# Expected: ALL 7 CHECKS PASSED
```

---

## Flow Documentation Gate — Documentation Ships With Code

**Code without documentation is incomplete.** Every implementation phase produces both code
artifacts and documentation artifacts. A phase is not done until both pass their gates.
This is the primary prevention mechanism for documentation gap debt.

### Required artifacts per phase

| Phase | Code gate | Documentation gate |
|-------|-----------|-------------------|
| **Phase 0 — Corpus** | BFA rules file passes `tsc` | `fixtures/design-reasoning/{slug}-design-decisions.json` exists with all 15 fields per DR record |
| **Phase 1A..1D — Services** | `jest --testPathPattern="{slug}/phase-*"` passes | `fixtures/contracts/t{NNN}.contract.json` exists for each task type + event schema JSON per emitted event |
| **Phase 2 — Integration** | Integration tests pass | `fixtures/flow-definitions/{slug}-*.topology.json` exists with n1–n8, n4 + n8 content populated |
| **Phase 3 — React pages** | Playwright tests pass | Snapshot in `docs/e2e-snapshots/{slug}/` |
| **Phase 4 — Teaching QA** | DC-01..10 proper-flow spec passes | `fixtures/arbiters/{slug}-arbiters.bulk.ndjson` exists + scope_isolation record present + SEED-N entries in teaching-pipeline.spec.ts |

### Documentation gate command

Run this after the code gate for each phase:

```bash
SLUG="your-flow-slug-here"  # e.g. subscription-billing

# DR triples (Phase 0)
ls fixtures/design-reasoning/${SLUG}-design-decisions.json 2>/dev/null \
  && echo "✅ DR triples" || echo "❌ MISSING DR triples — Phase 0 incomplete"

# Contract JSONs (one per task type — Phase 1A..1D)
python3 -c "
import re, glob, os, sys
contracts_ts = glob.glob(f'server/src/engine-contracts/${SLUG}-contracts.ts')
if not contracts_ts: sys.exit('❌ No contracts file for ${SLUG}')
ids = re.findall(r'taskTypeId.*?\"(T\d+)\"', open(contracts_ts[0]).read())
missing = [t for t in set(ids) if not os.path.exists(f'fixtures/contracts/{t.lower()}.contract.json')]
if missing: sys.exit(f'❌ MISSING contracts: {missing}')
print(f'✅ Contracts: {len(set(ids))} task types covered')
"

# Topology fixture (Phase 2)
ls fixtures/flow-definitions/${SLUG}*.topology.json 2>/dev/null \
  && echo "✅ Topology fixture" || echo "❌ MISSING topology fixture — Phase 2 incomplete"

# Arbiters + scope_isolation (Phase 4)
python3 -c "
import json, glob, sys
files = glob.glob('fixtures/arbiters/${SLUG}-arbiters.bulk.ndjson')
if not files: sys.exit('❌ MISSING arbiters NDJSON — Phase 4 incomplete')
arbs = [json.loads(l) for l in open(files[0]) if l.strip() and 'arbiterId' in l]
scope = [a for a in arbs if a.get('arbiterType') == 'scope_isolation']
if not scope: sys.exit('❌ MISSING scope_isolation arbiter (FC-32 violation)')
print(f'✅ Arbiters: {len(arbs)} records, scope_isolation present')
"

# SEED entries (Phase 4)
grep -c "SEED-" client/e2e/teaching-pipeline.spec.ts 2>/dev/null \
  && echo "✅ SEED entries exist" || echo "❌ MISSING SEED entries"
```

### What creates documentation debt

Documentation debt accumulates when:
1. Services are committed without their `t{NNN}.contract.json` files
2. Integration tests pass but the topology fixture is never created
3. Arbiters NDJSON is deferred to "TEACH-QA phase" instead of shipping with integration phase
4. SEED-N entries are left as TODO after phase completion
5. DR triples are written in the design simulation but never serialised to the fixtures directory

The Teaching QA phase should **validate** existing documentation artifacts — not **create** them
from scratch. If Teaching QA requires creating artifacts that should already exist, those phases
were not truly complete.

### Debt detection command

To audit documentation completeness for all implemented flows:

```bash
for SLUG in user-registration profile-enrichment event-management subscription-billing \
            marketplace-payments reviews-reputation schema-registry-dag data-warehouse-analytics \
            etl-data-integration saas-multi-tenancy freelancer-marketplace; do
  echo "--- $SLUG ---"
  ls fixtures/design-reasoning/${SLUG}-design-decisions.json 2>/dev/null \
    || echo "  ❌ DR triples missing"
  ls fixtures/flow-definitions/${SLUG}*.topology.json 2>/dev/null \
    || echo "  ❌ Topology fixture missing"
  python3 -c "
import json, glob
files = glob.glob('fixtures/arbiters/${SLUG}-arbiters.bulk.ndjson')
if not files: print('  ❌ Arbiters NDJSON missing')
else:
  arbs = [json.loads(l) for l in open(files[0]) if l.strip() and 'arbiterId' in l]
  scope = [a for a in arbs if a.get('arbiterType') == 'scope_isolation']
  if not scope: print('  ❌ scope_isolation arbiter missing')
  else: print(f'  ✅ {len(arbs)} arbiters')
" 2>/dev/null
done
```

---

## Directory Map

```
server/src/
├── kernel/           ← DNA primitives + multi-tenant core
├── fabrics/          ← 6 fabric layers + graph intelligence
│   ├── interfaces/   ← Abstract classes (the contracts)
│   ├── database/     ← InMemory, Elasticsearch, PostgreSQL
│   ├── queue/        ← InMemory, SQS + DLQ
│   ├── ai-engine/    ← Anthropic, OpenAI, Gemini, Grok, Ollama, Mock + dispatcher
│   ├── rag/          ← InMemory, Pinecone, LightRAG, Memgraph, NanoGraphRAG
│   ├── secrets/      ← AWS, EnvVar, InMemory
│   ├── flow-engine/  ← InMemory store + orchestrator
│   └── graph/        ← Graph Intelligence Layer (Dynamic AI Decision Architecture)
├── factories/        ← IExternalServiceFactory<T> + registry
├── engine-contracts/ ← Task type definitions (semantic slug names — no flow-NN prefix)
├── engine/
│   └── flows/        ← Per-flow implementations (semantic slugs — no flow-NN/)
├── guardrails/       ← BFA + DNA validator + promotion ladder
├── freedom/          ← FREEDOM config manager (tenant-scoped)
├── af-stations/      ← 11 stations + 3 sub-engines + pipeline
├── learning/         ← Feedback, model preference, quality scoring
├── api/              ← REST controllers
├── bootstrap/        ← Startup sequence
├── devops/           ← Logging, Docker, CI
├── doc-gen/          ← OpenAPI, diagrams
└── rag-init/         ← Pattern extraction + indexing (semantic slug file names)

server/test/
├── e2e/{slug}/       ← Per-flow e2e tests — ALL semantic dirs (e.g. marketplace-payments/)
└── {slug}/           ← Per-flow integration tests — ALL semantic dirs
```

---

## Commands

```bash
cd server && npm run start:dev          # run server
cd server && npx jest --verbose         # ~9,500 tests
cd server && npx tsc --noEmit           # type check (0 errors expected)
cd client && npm run dev                # run client
cd client && npx jest --verbose         # client tests
cd client && npm run build              # client build — MANDATORY gate for client changes
./scripts/pre-commit-check.sh           # OP-7 gate — MUST pass before every commit (10 checks)
docker compose up --build               # full stack

# Format check ORDER (Gap 2 — never reverse this):
#   write all files → prettier --write → format:check → tsc → jest → commit
```

---

## Artifact Numbers (Next Available)

```
Factory: F1519    Family: 209    Task Type: T605
BFA Rule: CF-809  Skill: SK-529  Design Record: DR-240
```
**CRITICAL:** Read from `CLAUDE.md` + `docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json` at session start. Never use cached numbers.

---

## Decision Tree

```
Need to build something? →
├─ Does a fabric already handle this?
│  └─ YES → Use the fabric interface. Done.
├─ Need a new provider for an existing fabric?
│  └─ Create provider extending the abstract interface. Register in provider-registry.
├─ Need a new task type?
│  └─ Create full engine contract. Register factories. Run BFA. Map AF stations.
│     Name contract file: {domain-slug}-contracts.ts — NOT flow-NN-contracts.ts
├─ Need a new flow?
│  └─ Define factory interfaces + task types + flow DAG template. BFA validate all.
│     Use semantic slug dir: engine/flows/{slug}/ and test/e2e/{slug}/
├─ Need to change business rules?
│  └─ Update FREEDOM config document. Zero code changes.
└─ Bug fix?
   └─ Write code. Validate against 5 Laws + 9 DNA patterns + OP-2 first.
```

---

## References

| Document | When to Read |
|----------|-------------|
| docs/architecture/ARCHITECTURE_GUIDE.md | Deep dive into all layers |
| docs/architecture/DEVELOPER_ONBOARDING.md | How-to guides for common tasks |
| docs/architecture/KNOWLEDGE_DIGEST.md | Compact reference for artifact numbers |
| .claude/skills/xiigen-engine/SKILL.md | Claude Code skill for core engine work |
| .claude/skills/xiigen-flow-builder/SKILL.md | Claude Code skill for adding new flows |
| .claude/skills/planning/naming-conventions-quick-reference.md | Full slug map + naming rules |
