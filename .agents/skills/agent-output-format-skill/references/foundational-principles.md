# XIIGen Foundational Principles — 8 Non-Negotiable Requirements

## Purpose

These 8 principles apply to ALL plans, ALL flows, ALL new features.
They are NOT optional considerations. They are HARD GATES.

A plan that violates any principle is rejected — no exceptions,
no "we'll add it later," no "out of scope for this phase."

## Origin

Extracted from Flows 25–33 canonical documents + multi-tenant-support.md.
Each principle has a source document, a one-sentence rule, and a concrete
plan gate question.

---

## The 8 Principles

### P1 — MULTI-TENANT BY DESIGN
**Source:** multi-tenant-support.md, Flow 26 (self-developing multi-tenant)
**Rule:** Every feature is tenant-isolated by design, not by convention.
**What this means:**
- `tenant_id` on EVERY query, EVERY document, EVERY cache key, EVERY event
- Shared schema default with `tenant_id` row-level scoping
- Separate schema/instance graduation for enterprise tenants
- AsyncLocalStorage or ClsService for tenant context propagation
- tenant-A data NEVER visible to tenant-B — structurally enforced
- Per-tenant quotas and rate limits on all resource-consuming operations

**Plan gate question:** "Does every new factory, service, config, event,
cache key, and index include tenant_id scoping? Can tenant-A's data
leak to tenant-B through any path (cache, queue, search, log)?"

**Negative example:** A skill creates a global in-memory cache without
tenant_id in the key. All tenants see each other's cached results.

---

### P2 — SAFE CONFIG STORAGE
**Source:** multi-tenant-support.md (crypto + key management section)
**Rule:** Configs live in secure environments with per-tenant encryption.
**What this means:**
- Configs stored via FREEDOM fabric pattern — never hardcoded
- Per-tenant encryption keys with NIST SP 800-57 lifecycle
- Connector credentials isolated per tenant — never shared
- No secrets in code, logs, error messages, or telemetry
- Environment-specific config resolution (dev/staging/prod)
- Config changes audited and reversible

**Plan gate question:** "Are all configs stored through fabric interfaces?
Are secrets per-tenant? Can a config change be rolled back? Are secrets
excluded from all log/trace/error output?"

**Negative example:** An AI provider API key stored in a shared .env file
used by all tenants. One tenant's key rotation breaks all other tenants.

---

### P3 — ALWAYS IMPROVE PROMPTS (PromptOps)
**Source:** Flow 30 (prompt improvements)
**Rule:** Prompts are versioned assets with policies, not static strings.
**What this means:**
- PromptTemplate + PromptVersion + PromptPatch as engine assets
- Every prompt has: taskType, version, parentVersion, status (candidate/canary/active)
- Judge→Improve loop: poor results trigger optimization sub-flow
- A/B testing: candidate versions tested against eval sets before promotion
- Per-tenant/per-taskType prompt policies (explore/exploit weights)
- Cost/quality/latency tracked per prompt version per model

**Plan gate question:** "Does this plan version its prompts? Is there a
judge cycle that detects poor quality and triggers improvement? Are prompt
changes tested before promotion to production?"

**Negative example:** A hardcoded prompt string in af3-prompt-library.ts
that gets edited in-place without versioning or evaluation.

---

### P4 — RAG STORAGE (General + Local)
**Source:** Flow 29 (adaptive RAG), Flow 32 (RAG initialization)
**Rule:** Knowledge is saved in RAG. Local RAG exists for local testing.
**What this means:**
- All generated knowledge, patterns, and decisions stored in RAG
- Adaptive retrieval: vector/graph/hybrid per task type (not one-size-fits-all)
- GraphRAG for cross-document synthesis and multi-hop reasoning
- Vector RAG for similarity and local questions
- RAG structures are editable and inspectable (not black boxes)
- Local RAG implementation for Docker-based testing (in-memory or local ES)
- Scores, feedback, and provenance linked to traces

**Plan gate question:** "Where does knowledge produced by this plan get stored?
Is there a local RAG for testing without cloud dependencies? Is retrieval
strategy configurable per task type?"

**Negative example:** Skills stored as flat files only. No RAG indexing.
Local testing requires cloud ES connection.

---

### P5 — ALWAYS IMPROVE (Self-Developing Engine)
**Source:** Flow 26 (self-developing engine)
**Rule:** Every fix and feature must make the ENGINE better, not just the output.
**What this means:**
- Gap detection: engine identifies missing capabilities automatically
- Contract-first creation: new interfaces + task types BEFORE implementation
- Validation crucible: automated tests in sandboxed environment
- Assimilation: validated code submitted to core infrastructure via Git
- Meta-flow lifecycle: describe → generate → test → promote → extend core
- Fixes propagate to engine (AF stations, skills, DNA guards) — not just output files
- retroactive-development principle: fix in T-XXX → re-validate ALL flows using T-XXX

**Plan gate question:** "Does this plan extend the engine's core capabilities?
After this plan ships, can the engine generate MORE types of flows than before?
Are fixes applied at the engine level, not just patched in output?"

**Negative example:** A bug fix applied directly to a generated service file
without updating the AF station or skill that produced the wrong output.

---

### P6 — PLANNING + ARBITRATING DECISIONS (BFA)
**Source:** Flow 25 (Business Flow Arbiter)
**Rule:** Every decision node goes through BFA. No unilateral architectural changes.
**What this means:**
- BFA cross-flow impact analysis BEFORE any deployment
- Decision Record (DR-xxx) for every architectural decision
- Human approval required for breaking changes
- New entities/events/APIs registered in BFA indices
- Conflict checks against ALL existing flows (not just the one being changed)
- "Halt on breaking impact" — system stops, doesn't auto-resolve conflicts

**Plan gate question:** "Does this plan register new entities/events/APIs
in BFA? Are cross-flow conflicts checked? Is there a DR entry for every
architectural decision? Are breaking changes gated on human approval?"

**Negative example:** A new flow publishes `order.completed` events without
checking that FLOW-08 already publishes the same event — causing duplicate
processing in downstream consumers.

---

### P7 — LOCAL TESTING (Unit + Simulate + Docker)
**Source:** Flow 33 (system initiation), multi-tenant-support.md
**Rule:** Every component testable locally. Unit, simulation, and Docker.
**What this means:**
- Unit tests for every logical unit (DNA→unit, fabric→integration)
- Simulation of every flow using real engine contracts as fixtures
- Docker-local testing for all 6 fabric providers (ES, PG, Redis, SQS/LocalStack, AI mock)
- MAPE-K control loop: monitor → analyze → plan → execute
- Hermetic environments: reproducible builds with pinned dependencies
- Tenant isolation e2e tests verifiable locally
- `npm test` must pass with ZERO cloud dependencies (all mocked or containerized)

**Plan gate question:** "Can every component this plan creates be tested
locally without cloud accounts? Is there a Docker test configuration?
Does the plan include test specs for unit, simulation, AND e2e levels?"

**Negative example:** A plan adds an AI provider integration but all tests
require a live OpenAI API key. No mock provider. No Docker test path.

---

### P8 — OPEN SOURCE MODEL TRAINING (Cost Optimization)
**Source:** Flow 29 (adaptive RAG routing), Flow 30 (prompt improvements)
**Rule:** Use external AI to train internal models. Reduce future AI costs.
**What this means:**
- Early stage: use open source models (Llama, Mistral, etc.) locally
- External AI calls (Claude, GPT-4o, Gemini) produce traces + scores
- Those traces become training data for platform's own model
- Routing learning: contextual bandits or preference-conditioned routers
- Cost/quality/latency tracked per model per task type
- Goal: shift traffic from expensive external models to trained internal models
- Budget modes: Fast (cheap model) / Balanced / Thorough (best model)

**Plan gate question:** "Does this plan track AI call costs per model?
Is there a path for training data collection from external AI responses?
Can the system route to cheaper models for tasks where quality is sufficient?"

**Negative example:** All AF stations hardcoded to use Claude Opus with no
cost tracking, no model selection logic, and no training data capture.

---

## The Principles Gate (for planning-skill)

Before a plan is approved, it must answer ALL 8 questions.
This is a new gate in the planning workflow — **Gate 7.5** (between Gate 7
"Plan first" and the plan-review-skill SESSION-0).

### Quick Checklist

```
FOUNDATIONAL PRINCIPLES GATE — [plan name] — [date]

[ ] P1: Multi-tenant — tenant_id on every new artifact? No leak paths?
[ ] P2: Safe config — all configs via fabric? Per-tenant secrets?
[ ] P3: PromptOps — prompts versioned? Judge+improve cycle exists?
[ ] P4: RAG storage — knowledge stored in RAG? Local RAG for testing?
[ ] P5: Self-developing — engine gets better, not just output?
[ ] P6: BFA — decisions arbitrated? Cross-flow conflicts checked?
[ ] P7: Local testing — unit + sim + Docker for every component?
[ ] P8: Model training — cost tracked? Training data captured? Routing?

For each NO: either add it to the plan or document WHY this principle
doesn't apply to this specific plan (with Luba's explicit approval).

RESULT: [ALL YES — proceed] / [NO on P[N] — add or justify before proceeding]
```

---

## How This Integrates

```
planning-skill (8 gates)
  ├── Gate 0: Infrastructure Discovery
  ├── Gate 1: DNA Regression Safety
  ├── Gate 2: Fabric Resolution Map
  ├── Gate 3: Flow Template Validation
  ├── Gate 4: Decision Log (DR entries)
  ├── Gate 5: Test Coverage Matrix
  ├── Gate 6: Canonical Doc Sync
  └── NEW → Gate 7: Foundational Principles (8 checks)

plan-review-skill (15 FCs + 3 gates)
  └── SESSION-0: FC-1 through FC-15 (includes Principles, Chain Arithmetic, Blast Radius, API Shape)
```
