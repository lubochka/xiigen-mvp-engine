# CLAUDE.md — XIIGen Engine (NestJS + React)

> Note: this is an internal engineering/methodology document — the development
> rules Claude Code follows when building XIIGen. It is part of how XIIGen is
> built, not user-facing product documentation; see the top-level README.md for
> that.

## What This Is

XIIGen is a **self-building AI code generation engine**. It generates application flows — NOT implements them directly. The engine sits on **6 fabric interfaces** that make every infrastructure provider swappable at runtime.

**Stack:** NestJS 10 + TypeScript 5 (server) | React 18 + Vite 5 + Tailwind (client)
**Status:** Active development on `claude/vigorous-margulis`. Test baseline: ~9,500 server tests passing, 0 failures.

---

## The 18 Rules

### Rule 0 — Zero Tech Debt is ABSOLUTE (Golden Rule)
**"Zero tech debt" means the ENTIRE repo is green before ANY commit — not just the phase under review.**
A failing lint / tsc / jest / format:check / client-build gate blocks the commit regardless of which prior flow introduced it. There is NO "narrow reading" where only new code must be clean. There is NO "pre-existing baseline" escape hatch. There is NO spawning of a separate task to defer a failure.

ALL failing gates — including every pre-existing failure — MUST be resolved inline in the current commit. Never bypass with `--no-verify`. Never present a "narrow vs broad reading" menu. Never frame a quality-gate failure as out-of-scope cleanup.

```
# When ./scripts/pre-commit-check.sh reports failures:
# ✅ Fix every failure now (main.ts lint, flow-47 tests, format:check warn — all of it)
# ❌ Spawn a separate "FLOW-47 cleanup" task and commit this phase green-for-itself
# ❌ "Ship A0.5 now, open a cleanup commit later"
# ❌ Carve out "out-of-scope" vs "in-scope" failures
```

**This rule overrides the "never conflate fixes" heuristic whenever a combined fix is needed to unblock a quality gate.** Document both the phase artifacts AND the pre-existing fixes in the commit body — both are required to ship.

### Rule 1 — Fabric First
Service code NEVER imports a provider SDK. All infrastructure access goes through fabric interfaces resolved at runtime.
```typescript
// ✅ @Inject(DATABASE_SERVICE) private db: IDatabaseService
// ❌ import { Client } from '@elastic/elasticsearch'
```

### Rule 2 — No Typed Models
ALL business data uses `Record<string, unknown>`. Schema lives in config documents, not TypeScript interfaces.
```typescript
// ✅ const product: Record<string, unknown> = { name: 'Widget', price: 29.99 };
// ❌ class Product { name: string; price: number; }
```

### Rule 3 — BuildSearchFilter (DNA-2)
ALL queries use dynamic filter builder. Empty/null fields auto-skipped.
```typescript
// ✅ await db.searchDocuments('products', { status: 'active', category: undefined });
// ❌ const query = { must: [{ term: { status: 'active' } }] };
```

### Rule 4 — DataProcessResult (DNA-3)
ALL service methods return `DataProcessResult<T>`. Never throw for business logic.
```typescript
// ✅ return DataProcessResult.failure('NOT_FOUND', 'Document not found');
// ❌ throw new NotFoundException('Not found');
```

### Rule 5 — MicroserviceBase (DNA-4)
ALL services extend MicroserviceBase (19 architectural components inherited). No exceptions.

### Rule 6 — Scope Isolation (DNA-5)
Tenant scope is automatic via AsyncLocalStorage. Fabric providers read TenantContext internally. No `tenantId` parameter on fabric methods.

### Rule 7 — DynamicController (DNA-6)
No entity-specific controllers. One DynamicController handles all CRUD via `/api/dynamic/{indexName}`.

### Rule 8 — Idempotency (DNA-7)
All queue consumers must deduplicate using idempotency keys.

### Rule 9 — Outbox Pattern (DNA-8)
`storeDocument()` MUST happen BEFORE `enqueue()`. Database record exists before downstream processing.

### Rule 10 — CloudEvents (DNA-9)
All inter-service events use CloudEvents envelope via `createCloudEvent()`.

### Rule 11 — No Direct HTTP Between Services
All inter-service communication via Queue Fabric events. Never `fetch()` to another service.

### Rule 12 — Factory Resolution
Every external dependency resolved via `IExternalServiceFactory.createAsync()`. Every factory declares which fabric it resolves through.

### Rule 13 — Cross-Flow Validation Before Ship
New flows MUST pass cross-flow validation against all existing flows before deployment.

### Rule 14 — Config Over Code (FREEDOM Machine)
If a business user might want to change it → FREEDOM config (Elasticsearch doc). If it's fixed logic → MACHINE code.

### Rule 15 — Explicit STOP Gates Are Absolute
Any ⛔ STOP instruction in a protocol, checklist, or user message halts ALL action immediately.
Write the required output, present it, and **wait for explicit instruction** before doing anything else.
Diagnosing the next problem, restarting infrastructure, re-running a command, or writing any code
without explicit approval after a ⛔ STOP is a Rule 15 violation — regardless of how obvious the
next step appears. User input always overrides process momentum.

### Rule 16 — Semantic Slugs (No `flow-NN` in Code Paths)
All test directories, contract files, service directories, and source files use **semantic domain slugs**.
`flow-XX` numeric names are only permitted in `docs/sessions/FLOW-XX/` planning documents and in
`flowId: "FLOW-XX"` data identifiers inside JSON.

```
✅ server/test/e2e/marketplace-payments/
✅ server/src/engine-contracts/subscription-billing-contracts.ts
✅ server/src/engine/flows/reviews-reputation/
❌ server/test/e2e/flow-12/
❌ server/src/engine-contracts/flow-12-contracts.ts
```

### Rule 17 — Documentation Artifacts Ship With Code (No Documentation Debt)

Every implementation phase produces **both** code artifacts **and** documentation artifacts.
A phase is **not done** until both exist. Skipping documentation is not deferral — it is
a build failure equivalent to skipping tests.

**Per-phase documentation requirements:**

| Phase | Required documentation artifacts |
|-------|----------------------------------|
| Phase 0 (corpus seed) | `fixtures/design-reasoning/{slug}-design-decisions.json` (DR triples, all 15 fields) |
| Phase 1A–1D (each service) | `fixtures/contracts/t{NNN}.contract.json` + `fixtures/event-schemas/{slug}/{event}.schema.json` per emitted event |
| Integration phase | `fixtures/flow-definitions/{slug}-t{NNN}.topology.json` (cycle topology, n1–n8, with n4 + n8 content) |
| After all services | `fixtures/arbiters/{slug}-arbiters.bulk.ndjson` (all domain arbiters + mandatory scope_isolation last record) |
| Before Teaching QA | DC-01..DC-10 proper-flow contract tests + SEED-N..SEED-N+4 in `client/e2e/teaching-pipeline.spec.ts` |

**Documentation gate (run after every phase gate):**

```bash
# Verify documentation artifacts alongside code for slug {slug}
SLUG="${slug}"
echo "=== Documentation Gate: $SLUG ==="

# Phase 0: DR triples exist
ls fixtures/design-reasoning/${SLUG}-design-decisions.json 2>/dev/null \
  && echo "✅ DR triples" || echo "❌ MISSING: DR triples"

# Service contracts: one per task type implemented
for T in $(grep -rn "taskTypeId" server/src/engine-contracts/${SLUG}-contracts.ts \
           | grep -oP '"T\d+"' | tr -d '"' | sort -u); do
  ls fixtures/contracts/${T,,}.contract.json 2>/dev/null \
    && echo "✅ Contract $T" || echo "❌ MISSING: fixtures/contracts/${T,,}.contract.json"
done

# Topology: cycle fixture exists
ls fixtures/flow-definitions/${SLUG}*.topology.json 2>/dev/null \
  && echo "✅ Topology fixture" || echo "❌ MISSING: topology fixture"

# Arbiters: file exists + scope_isolation present
python3 -c "
import json, glob, sys
files = glob.glob('fixtures/arbiters/${SLUG}-arbiters.bulk.ndjson')
if not files: sys.exit('❌ MISSING: arbiters NDJSON')
lines = [l for l in open(files[0]) if l.strip() and 'arbiterId' in l]
arbs = [json.loads(l) for l in lines]
scope = [a for a in arbs if a.get('arbiterType') == 'scope_isolation']
assert scope, '❌ MISSING: scope_isolation arbiter (FC-32)'
print(f'✅ Arbiters: {len(arbs)} records, scope_isolation present')
" 2>&1

# Expected: all ✅
```

**Anti-patterns (NEVER):**
- NEVER commit a service implementation without its `t{NNN}.contract.json`
- NEVER claim a flow is implemented without DR triples and topology fixture
- NEVER defer arbiters NDJSON to "TEACH-QA phase" — it ships with integration phase
- NEVER leave SEED-N entries as TODO — they ship with the service they test

---

## Quick Reference

| Need | Do This |
|------|---------||
| Database access | `@Inject(DATABASE_SERVICE) db: IDatabaseService` |
| Queue events | `@Inject(QUEUE_SERVICE) queue: IQueueService` |
| AI generation | `@Inject(AI_PROVIDER) ai: IAiProvider` |
| RAG search | `@Inject(RAG_SERVICE) rag: IRagService` |
| Secrets | `@Inject(SECRETS_SERVICE) secrets: ISecretsService` |
| Flow orchestration | `@Inject(FLOW_ORCHESTRATOR) flow: IFlowOrchestrator` |
| Return success | `DataProcessResult.success(data)` |
| Return failure | `DataProcessResult.failure('CODE', 'message')` |
| Tenant context | Automatic — read from AsyncLocalStorage |

## Commands

```bash
# Server
cd server && npm install && npm run start:dev     # run
cd server && npx jest --verbose                    # test (~9,500 tests)
cd server && npx jest --coverage                   # test with coverage
cd server && npx jest --testPathPatterns="fabrics" # test specific module
cd server && npx tsc --noEmit                      # type check (0 errors expected)

# Client
cd client && npm install && npm run dev            # run
cd client && npx jest --verbose                    # test

# Pre-commit gate (MUST pass before every git commit)
./scripts/pre-commit-check.sh
# Expected: ALL 10 CHECKS PASSED

# Absolute gate — run on EVERY phase that touches client code:
cd server && npx tsc --noEmit 2>&1 | grep -v TS5101 | grep -c "error"   # Expected: 0
cd client && npx tsc --noEmit 2>&1 | grep -v TS5101 | grep -c "error"   # Expected: 0
cd client && npm run build 2>&1 | grep -cE "^error TS|^Error:"           # Expected: 0

# Format check ORDER — ALWAYS:
#   write all files → prettier --write → format:check → tsc → jest → commit
#   NEVER: format:check → write files → commit  (stale check misses new files)

# Docker
docker compose up --build
```

## Directory Structure

```
server/src/
├── kernel/           ← DNA primitives + multi-tenant core (RARELY TOUCH)
├── fabrics/          ← 6 fabric layers: database, queue, ai-engine, rag, secrets, flow-engine
│   └── graph/        ← Graph Intelligence Layer (Dynamic AI Decision Architecture)
│       ├── interfaces/   ← IGraphRagService, IEmbeddingService, IGraphLearningService
│       ├── providers/    ← ElasticsearchGraphLearningProvider
│       ├── planning/     ← Bootstrap + AI-driven planning (5 components + pipeline + cross-layer router)
│       ├── learning/     ← EdgeVersioningService (decay window), AIDrivenRetrospectiveService
│       └── governance/   ← TopManagerGapDetector, MutationScreener, CrossModelSimulator, RejectionReason
├── factories/        ← Universal factory pattern + registry
├── engine-contracts/ ← Task type definitions + archetypes (semantic slug names, never flow-NN-*)
├── engine/           ← Flow generator + self-sufficiency services
│   ├── flows/        ← Per-flow service implementations (ALL semantic slugs, no flow-NN/)
│   ├── spec-audit/   ← SpecAuditService + SPEC-001/002/003 + OVERLAP-001
│   └── ...           ← PrerequisiteCompletionGateService, CapabilityGapFlowProposerService
├── guardrails/       ← cross-flow validation + DNA rule validator + promotion ladder
├── freedom/          ← FREEDOM config manager
├── af-stations/      ← 11 AF stations + 3 sub-engines + pipeline
├── api/              ← REST controllers
├── bootstrap/        ← Startup sequence
├── devops/           ← Logging, Docker, CI validators
├── doc-gen/          ← OpenAPI, diagrams, service catalog
├── learning/         ← Feedback, model preference, prompt A/B, quality scoring
└── rag-init/         ← Pattern extraction + skill indexing (semantic slug file names)

server/test/
├── e2e/              ← Per-flow e2e tests (ALL semantic slug dirs, no flow-NN/)
│   ├── user-registration/
│   ├── marketplace-payments/
│   ├── subscription-billing/
│   └── ... (37 semantic dirs total)
└── {slug}/           ← Per-flow integration tests (ALL semantic slug dirs)
    ├── bundle-activation/
    ├── meta-arbitration-engine/
    └── ... (45 semantic dirs total)

client/
├── src/pages/        ← Per-flow React pages (semantic slug dirs)
└── __tests__/flows/  ← Per-flow client tests (semantic slug dirs)
```

## Naming Convention — Domain Slug Map

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

## Execution Order

```
FLOW-0A → SKILL-GRAPH-S1
→ FLOW-25 → FLOW-27 → FLOW-29 → FLOW-30 → FLOW-26
→ FLOW-31 → FLOW-33
→ FEATURE-REGISTRY-S1     (addendum: schema + FT namespace, zero code)
→ FLOW-35                  (meta-arbitration engine)
→ FLOW-36                  (Feature Registry — FT-XXX artifacts)
→ FLOW-34                  (feature-aware, reads FT records)
→ FLOW-01 through FLOW-24  (any order)
→ FLOW-28                  (Blog/CMS Modules — namespace reserved F1129-F1175, T423-T440; not yet implemented)

Self-Sufficiency Layer (pre-generation gate — runs before any domain flow Phase A):
→ FLOW-PREREQ-01           (SpecAuditor: T580 + T581 + T586 — detect + order + track gaps)
→ FLOW-PREREQ-02           (PrerequisiteResolver: T582 + T583 — build interfaces + register FREEDOM keys)
→ FLOW-PREREQ-03           (ArchitectureDecisionGate: T584 + T585 — human overlap decisions + flow proposals)
```

## Artifact Boundaries (verify live against docs/state/INFRASTRUCTURE-FLOWS-STATE-v6.json)

```
Next Factory:   F1606     Next Family:   211
Next Task Type: T657      Next cross-flow validation rule: CF-842
Next Skill:     SK-529    (SK-430–528 assigned; SK-529 and above available)
Next FT-ID:     FT-001+   RESERVED — Feature Registry only (see locked decision D-FT-1)
Test baseline:  ≥ 10,100  (branch claude/vigorous-margulis, 2026-04-14)

## T-Number Remapping Summary (FLOW-15 through FLOW-24)
##   FLOW-15: T221-T224 → T605-T608   (4 services)
##   FLOW-16: T225-T228 → T609-T612   (4 services)
##   FLOW-17: T229-T232 → T613-T616   (4 services)
##   FLOW-18: T233-T236 → T617-T620   (4 services)
##   FLOW-19: T237-T240 → T621-T624   (4 services)
##   FLOW-20: T241-T244 → T625-T628   (4 services)
##   FLOW-21: T245-T248 → T629-T632   (4 services)
##   FLOW-22: T249-T252 → T633-T636   (4 services)
##   FLOW-23: T347-T366 → T637-T649   (13 services)
##   FLOW-24: T367-T374 (no remapping) (10 services)
```

## Skills Available in .claude/skills/

```
Planning skills (retrieved by the agent factory pipeline for planning sessions):
  PlanningSessionStartup       — entry point, always first
  DecisionReopeningProtocol    — challenge locked decisions via architecture decision record
  FlowCompletenessChecker      — 15-item flow validation
  ModeCEventContractDesigner   — event schema design
  ClientServerSymmetry         — client state map + optimistic UI
  E2ETestMatrixBuilder         — 8 mandatory test categories
  MetaEscalationRouter         — escalate vs algorithmic resolution
  DocumentHierarchyNavigator   — prevent competing documents
  BlastRadiusAssessor          — impact before any engine change
  CostEffectiveModelSelection  — model fitness + OSS readiness

Session output skills (Session-End Chain, mandatory after every gate):
  SessionExecutionLogSchema    — EXECUTION-LOG.json format
  PhaseCompletionPackager      — produces 3 output files
  WebSessionHandoff            — SESSION-BRIEF format
  PhaseGitReport               — git report appended to PHASE-COMPLETE

Flow design skills (130+ .md files, see SKILLS_INDEX.md):
  Foundation layer: engine internals, bootstrap boundary, flow design cycle
  Engine lifecycle layer: planning pipeline, session authoring
  Product lifecycle layer: requirement-to-flow, domain event design
  Self-awareness layer: capability state, gap-to-proposal
  Graph intelligence layer: AI decision pipeline, confidence lifecycle
  Scope isolation arbiter — scope isolation for multi-tenant flows

Orchestration skills:
  flow-reexamination                   — 7-pass algorithm for Mode C flows
  how-to-prepare-a-plan               — master 7-skill planning pipeline
  xiigen-core-principles              — core principles gate checklist (44 items)
```

## Anti-Patterns — NEVER Do These

- NEVER create `ProductsController`, `OrdersService`, or any entity-specific class
- NEVER `import { Client } from '@elastic/elasticsearch'` in service code
- NEVER `throw new Error()` for business conditions
- NEVER pass `tenantId` as parameter — it's in AsyncLocalStorage
- NEVER create `class Product { name: string }` — use `Record<string, unknown>`
- NEVER call another service via HTTP — use queue events
- NEVER `enqueue()` before `storeDocument()`
- NEVER skip cross-flow validation when adding a new flow
- NEVER use `flow-NN` numeric names for test dirs, contract files, or source files
- NEVER use `as any` or `: any` in production TypeScript files (OP-2)
- NEVER use `/* eslint-disable */` banners or em-dash inline eslint-disable comments (OP-2)
- NEVER commit a service without its `fixtures/contracts/t{NNN}.contract.json` (Rule 17)
- NEVER claim a flow complete without DR triples, topology fixture, and arbiters NDJSON (Rule 17)
- NEVER write a client test file without first running `ls __tests__/flows/{slug}/` — if a `.test.ts` already exists, read it and append; NEVER create a second file with the same function names (OP-8)
- NEVER run `format:check` before writing all files, then commit — always write → format:write → format:check → tsc → jest → commit (Gap 2 sequencing rule)

## OP-8 — Read-Before-Write on Test Files

Before creating any file in `__tests__/flows/{slug}/`, `server/test/e2e/{slug}/`, or `client/e2e/`:

```bash
ls __tests__/flows/{slug}/ 2>/dev/null
```

If a `.test.ts` or `.spec.ts` already exists with any overlapping name:
- READ the existing file first
- Append new tests to the existing `describe()` block
- NEVER create a second file with the same function names

Violation: TS2393 duplicate function implementation — fails client build.

## Vitest TSConfig Guard (run once before writing any client test file)

```bash
python -c "
import json
tsconfig = json.load(open('client/tsconfig.json'))
types = tsconfig.get('compilerOptions',{}).get('types',[])
assert 'vitest/globals' in types, \
  'BLOCKING: vitest/globals missing from client/tsconfig.json — all new tests will fail TS2307'
print('OK: vitest/globals confirmed in client tsconfig')
"
# If this fails: add \"vitest/globals\" to client/tsconfig.json compilerOptions.types
```

## Business flows — what the user wants

The XIIGen product is 48 flows. Before planning or building inside a flow, answer
"what does the user actually want here?" by reading:

1. **`docs/business-flows/PRODUCT-STATE.md`** — the current state of all 48 flows in
   product-designer voice: what's live, what's half-built, what's designed on paper,
   what's just a title.
2. **`docs/business-flows/NN-{slug}.md`** — the primary business-flow spec for that
   flow (one file per flow with a dedicated PM narrative).
3. **`docs/screen-examination/{slug}-examination.md`** — the WHO / VERB / GRAMMAR
   distillation (45 files) if the primary spec is ambiguous or missing.

Every primary spec carries a provenance header naming its source in
`business flows.zip`. Three flows were renumbered during the 2026-03 restructure —
zip-04 post-publishing → `28-blog-cms-modules.md`, zip-30 prompt-improvements →
`38-rag-quality-feedback.md`, zip-34 translate-to-alternatives →
`48-i18n-translation.md`. See `docs/business-flows/PRODUCT-STATE.md` § "Naming
conflicts" and `docs/business-flows/ZIP-TO-CANONICAL-MAPPING.md` for full provenance.

RAG seed for these specs lives at `fixtures/rag-patterns/business-flows-corpus/`
as `BUSINESS_FLOW_SPEC` pattern records (one NDJSON file per canonical flow).

Directory guide: `docs/business-flows/README.md`.

## Architecture Documents (Read Order)

1. `docs/architecture/ARCHITECTURE_GUIDE.md` — 6 fabrics, 9 DNA, factory pattern, AF pipeline
2. `docs/architecture/DEVELOPER_ONBOARDING.md` — How-tos: add provider, add task type, common mistakes
3. `docs/architecture/KNOWLEDGE_DIGEST.md` — Compact reference: all artifact numbers and interfaces
4. `docs/business-flows/README.md` — what the user wants in each flow (navigation)
5. `docs/business-flows/PRODUCT-STATE.md` — live / half-built / designed / sketched product state

## Universal Overlay Routing

For generic agent process tasks, consult the `XIIGen Universal Skills Overlay`
section in `.claude/skills/SKILL-INDEX.md`, then the matching `XIIGen Universal
Skills Overlay` trigger section in `.claude/skills/HOW-TO-USE-SKILLS.md`.

This routing supplements the active rules above. Keep `DataProcessResult<T>`
outcomes, `buildSearchFilter` / `buildSearchFilterFlat`, `Record<string, unknown>`
dynamic payloads, structured logging, and existing NestJS providers and injection
tokens as the source-boundary rules for implementation work.
