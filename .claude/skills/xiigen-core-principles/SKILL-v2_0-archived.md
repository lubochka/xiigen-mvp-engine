---
name: xiigen-core-principles-skill
version: "2.0.0"
description: >
  The 10 non-negotiable architectural principles that every XIIGen plan,
  flow, and code modification must satisfy. P1–P8 established after FLOW-33.
  P9–P10 established after the Mode C / Client Architecture session (2026-03-20).
  Any plan that violates any principle is REJECTED regardless of FC checks.
  Source: Luba's architectural mandates + DECISIONS-LOCKED.md.
author: luba
updated: "2026-03-20"
priority: SUPREME
triggers:
  - "plan a new flow"
  - "design a new feature"
  - "new task type"
  - "new factory"
  - "architecture decision"
  - "plan review"
  - "mode c"
  - "event contract"
  - "client side"
---

# XIIGen Core Principles v2.0
## 10 Non-Negotiable Requirements for Every Plan

> P1–P8 were established after flows 25–33.
> P9–P10 were established in the Mode C / Client Architecture session (2026-03-20).
> All 10 must have explicit design answers. "TBD" = plan is INCOMPLETE.

**Authoritative source for all decisions: DECISIONS-LOCKED.md**
Read it before answering any principle. It supersedes memory.

---

## PRINCIPLE 1 — Multi-Tenant by Default
*(unchanged from v1.0)*

Every entity, query, event, config, RAG index, prompt store, local model,
and background job is tenant-scoped from day one. There is no "add tenancy later."

**Plan must show:**
```
□ tenantId on every new entity, index, cache key, event
□ Multi-tenant isolation test (tenant A cannot see tenant B)
□ RAG retrieval filtered by tenantId
□ Quota and rate-limit strategy per tenant
```

**Red flags:** "shared index", "global config", "single-tenant for now"

---

## PRINCIPLE 2 — Configs in Safe Environments
*(unchanged from v1.0)*

No secret or credential lives in code or git. All tenant-specific values
live in the FREEDOM layer (ES config docs), resolved via ISecretsService.

**Plan must show:**
```
□ Every new credential: ISecretsService.getSecret(key, tenantId)
□ Every tenant-specific value: FREEDOM config, not process.env.*
□ FREEDOM/MACHINE test applied: "could a tenant want a different value?"
```

---

## PRINCIPLE 3 — Always Improve Prompts
*(unchanged from v1.0)*

Prompts are versioned PromptAsset objects. The AF-9 verdict → PromptPatch
→ A/B test → promote loop must exist from the first flow.

**Plan must show:**
```
□ Prompts stored as PromptAssets (not hardcoded strings)
□ AF-11 captures which prompt version was used per run
□ AF-9 verdict creates PromptPatch proposals
□ Promotion gate before new version becomes active
```

---

## PRINCIPLE 4 — RAG Is Always Dual: Global + Local
*(unchanged from v1.0)*

Two RAG tiers always coexist: Global (Elasticsearch, production) and
Local (in-memory or local ES, development + testing).

**Plan must show:**
```
□ Global RAG tier specified
□ Local RAG tier for docker-compose.test.yml
□ Tests use LOCAL tier only (zero cloud credentials)
□ Tenant isolation in RAG (tenant A cannot read tenant B's RAG)
```

---

## PRINCIPLE 5 — Always Improve (Self-Learning Loop)
*(unchanged from v1.0)*

Every run captures metrics that feed the improvement cycle. Improvement
must be structural (stored, versioned, promotable) — not incidental.

**Plan must show:**
```
□ Metrics captured per run: dna_score, test_score, spec_score, cost, latency
□ Improvement cycle for this feature defined
□ Improvement stored in FREEDOM layer, not just logged
```

---

## PRINCIPLE 6 — Plan and Arbitrate Every Decision Node
*(unchanged from v1.0)*

Every significant decision point must pass through an explicit arbiter.
No silent defaults. No "just use the primary model."

**Plan must show for each new T-XXX:**
```
□ Model Arbiter: competing models + fallback
□ Prompt Arbiter: prompt versions in rotation
□ RAG Arbiter: retrieval strategy selected and why
□ BFA registration: entities/events/routes registered
□ Quality Arbiter (AF-9): iron rules + quality gates defined
```

---

## PRINCIPLE 7 — Test Everything Locally
*(unchanged from v1.0)*

Every unit of logic, every flow simulation, every fabric interaction must
be testable without cloud credentials using only docker-compose.

**The four test layers (all required):**
```
Unit:         single service method in isolation (Jest, no cloud)
Simulation:   full flow, mock providers (Jest + AppModule + in-memory)
E2E:          complete lifecycle with real DI (Jest + AppModule)
Docker-local: real providers (ES, PG, Redis) in docker-compose.test.yml
```

**Plan must show:**
```
□ All 4 layers specified for new flow
□ npm test passes with ZERO cloud credentials
□ Multi-tenant isolation test in docker-local layer
```

---

## PRINCIPLE 8 — Open Source Local Model: Learn, Save, Reuse
*(unchanged from v1.0)*

Every commercial model run produces a training signal for a local OSS model.
Base model: DeepSeek-Coder-33B-Instruct (D5 decision).

**Plan must show:**
```
□ Training data captured from high-quality runs (score ≥ threshold)
□ Training data format: (input, output, score, taskType, tenantId) per-tenant
□ Local model endpoint in FREEDOM config (not hardcoded)
□ Graceful fallback: local unavailable → commercial (no error)
□ Per-tenant isolation: tenant A training data NEVER trains tenant B model
```

---

## PRINCIPLE 9 — Mode C Event-First Architecture (NEW — 2026-03-20)

**The rule:** The event contract is canonical. The implementation is advisory.
Every flow communicates via QUEUE FABRIC events only. No direct HTTP calls
between services. Any language, any framework can implement a flow as long
as it satisfies the event contract schema.

**Source:** DECISIONS-LOCKED.md D2, D3, D7, D8 + FLOW-INTEGRATION-MODE-C.md

**What this means for plans:**

The flow produces TWO canonical artifacts — not code:
1. **Event contract schemas** (JSON Schema + CloudEvents 1.0) in `contracts/events/FLOW-XX/`
2. **Flow topology** (DAG + SLAs + event gates) in `contracts/topologies/FLOW-XX.topology.json`

The generated NestJS/Python code is a **reference implementation** — it lives in
`implementations/` and is advisory, not required.

**Three event types per flow (all required):**
```
Server events:       {EventName}.schema.json           (source: "server")
Client events:       {ClientAction}.schema.json         (source: "client", clientTimestamp required)
Compensation events: {EventName}RolledBack.schema.json  (auto-generated from forward events)
```

**Three required fields on EVERY event (MACHINE — never optional):**
```
correlationId:  ties all events in one flow execution together
tenantId:       scope isolation (DNA-5)
traceparent:    W3C distributed trace (DNA-7)
```

**PII rule:** No PII in any event payload. Ever.
PII = email, firstName, lastName, phone, address, dateOfBirth, nationalId.
Downstream consumers fetch display data from the profile service using the userId in the event.

**Integration boundary (per factory in genesis prompt):**
```
INJECTABLE:     tenant may provide their own implementation
PLATFORM-ONLY:  security-critical, never overridable (KMS, audit, token management)
```

**Default integration mode:** Tenant chooses explicitly at onboarding (D2).
Mode C (event-first) is the recommended default. Mode A (platform-managed)
and Mode B (embedded logic) are available as opt-in.

**Plan must explicitly show:**
```
□ Event contract schemas defined (server + client + compensation) in contracts/events/FLOW-XX/
□ Flow topology defined in contracts/topologies/FLOW-XX.topology.json
□ Each event carries correlationId + tenantId + traceparent
□ No PII in any event payload
□ Integration boundary annotated per factory (INJECTABLE vs PLATFORM-ONLY)
□ QUEUE FABRIC is the ONLY inter-service communication channel
   (no direct HTTP between services — score 0 on event_contract::language-agnostic)
□ Compensation events auto-generated for all non-terminal forward events
□ SLA specified per event gate in topology (timeout + onTimeout event)
□ Reference implementation in implementations/ clearly marked advisory
```

**Red flags (score 0 on event_contract::language-agnostic):**
```
"direct HTTP call between services"
"shared database between services"
"gRPC between flow components"
"the service calls the other service's API"
```

---

## PRINCIPLE 10 — Client-Side Architecture (NEW — 2026-03-20)

**The rule:** Every server flow has a parallel client state machine running
at human timescale. The client must be able to resume from any step after
app close/reopen. Optimistic UI actions have explicit confirm/rollback contracts.

**Source:** DECISIONS-LOCKED.md CLIENT-1 through CLIENT-4 + PLATFORM-SPEC-CONSOLIDATED.md §5

**The fundamental asymmetry — always account for it:**
```
Server processes step:      milliseconds
User experiences step:      minutes to days
```
A 50ms server operation may result in a 24-hour user wait (email verification).
These are not the same state machine. Plan both explicitly.

**FlowStateSnapshot (required for every flow):**
Every flow must answer: "what does the client see when the app reopens?"
```
GET /flow/{flowId}/state?correlationId=X&tenantId=Y
→ { currentStep, sla: { remainingMs }, availableActions, completedSteps, blockedReason }
```
The React SDK's useFlow() hook calls this on mount and reconnect.
Without it, every app reopen risks re-triggering the flow.

**Optimistic UI — three-part contract (required for every user action):**
```
An action is optimistic if:
  - Success case is visually simple (button state, progress bar)
  - Failure case is fully reversible
  - SLA for server confirmation < 3 seconds

Three-part contract:
  1. optimisticState:     what UI shows immediately
  2. confirmationEvent:   server event that confirms success
  3. rollbackEvent:       server event that triggers UI revert

Never make payment or irreversible actions optimistic.
```

**Client state map (required per DAG node):**
```json
{
  "nodeId": "step-name",
  "clientState": {
    "screen": "ScreenComponentName",
    "humanTimescale": "description",
    "slaMs": 86400000,
    "availableActions": ["ClientEventName"],
    "appReopenBehavior": "query FlowStateSnapshot → restore to this screen",
    "errorState": { "slaBreached": { "screen": "...", "availableActions": [...] } }
  }
}
```

**Offline queue (always required):**
Client events emitted while offline queue locally in SDK (IndexedDB/AsyncStorage).
On reconnect: emit in order, deduplicate via idempotency key, reconcile with FlowStateSnapshot.

**SDK (D8 decision):**
```
Backend: @xiigen/sdk-nestjs
  XiigenModule.forFlow(), FlowContext injectable, @OnFlowEvent decorator
Frontend: @xiigen/sdk-react
  useFlow() hook, emit() with optimistic/confirm/rollback, XiigenDevTools
Phase: set by platform (env var / F245) — tenant cannot override
```

**Plan must explicitly show:**
```
□ Client state map: what screen each DAG node produces
□ Human timescale: how long users experience each step
□ FlowStateSnapshot defined (currentStep, sla, availableActions)
□ App-reopen behavior documented per step
□ Optimistic UI contracts for all user-initiated actions
   (3-part: optimisticState, confirmationEvent, rollbackEvent)
□ Payment/irreversible actions explicitly marked non-optimistic
□ Offline queue behavior documented
□ SDK usage: @xiigen/sdk-nestjs for NestJS, @xiigen/sdk-react for React
```

**Red flags:**
```
"the client calls the API and waits"   → missing optimistic design
"user just refreshes to see updates"   → missing FlowStateSnapshot
"app shows loading screen on reopen"   → missing resume behavior
"payment shows optimistic success"     → NEVER make payment optimistic
```

---

## The 10-Point Plan Validation Checklist (updated from 8-point)

Every plan handed to Claude Code must answer ALL 10.
"TBD" on any item = plan is INCOMPLETE. Do not proceed.

```
P1: Multi-Tenant
  □ Every new entity has tenantId?
  □ Every RAG search filters by tenantId?
  □ Multi-tenant isolation test specified?

P2: Safe Configs
  □ Every credential uses ISecretsService?
  □ Every tenant value in FREEDOM layer?
  □ No process.env.* for business values?

P3: Prompt Improvement
  □ Prompts stored as versioned PromptAssets?
  □ AF-11 captures which prompt version used?
  □ AF-9 verdict creates PromptPatch?

P4: Dual RAG
  □ Global RAG tier specified?
  □ Local RAG tier (docker-compose.test.yml)?
  □ Tests use LOCAL tier only?

P5: Always Improve
  □ Metrics captured per run (6 dimensions)?
  □ Improvement cycle for this feature?
  □ Improvement stored in FREEDOM?

P6: Decision Nodes Arbitrated
  □ Model arbiter config for new T-XXX?
  □ RAG arbiter config for new T-XXX?
  □ BFA registration for new entities/events?
  □ AF-9 iron rules and quality gates?

P7: Local Testability
  □ All 4 test layers (unit/sim/e2e/docker)?
  □ npm test passes with ZERO cloud credentials?
  □ Multi-tenant isolation test in docker-local?

P8: Local Model Training
  □ Training data from high-quality runs?
  □ Local model endpoint in FREEDOM config?
  □ Graceful commercial fallback?
  □ Per-tenant isolation of training data?

P9: Mode C Event-First (NEW)
  □ Event contract schemas in contracts/events/FLOW-XX/?
  □ Flow topology in contracts/topologies/FLOW-XX.topology.json?
  □ correlationId + tenantId + traceparent on every event?
  □ No PII in any event payload?
  □ Integration boundary per factory (INJECTABLE vs PLATFORM-ONLY)?
  □ QUEUE FABRIC is the only inter-service communication?
  □ Compensation events for all non-terminal forward events?
  □ SLA specified per event gate?

P10: Client-Side Architecture (NEW)
  □ Client state map: what screen each DAG node shows?
  □ Human timescale documented per step?
  □ FlowStateSnapshot defined?
  □ App-reopen behavior per step?
  □ Optimistic UI 3-part contracts for user actions?
  □ Offline queue behavior documented?
  □ SDK usage: @xiigen/sdk-nestjs + @xiigen/sdk-react?
```

A plan that cannot check all 44 boxes is INCOMPLETE.
Return to planning. Do not proceed to Gate A.
