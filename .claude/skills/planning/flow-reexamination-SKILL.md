---
name: flow-reexamination-skill
version: "1.1.0"
description: >
  Applies the 7-pass re-examination algorithm to any flow reference plan.
  Transforms server-only plans into complete Mode C plans with event contracts,
  client state maps, E2E test matrices, and observability. v1.1: Pass 7 explicitly
  states genesis prompts are AF-1 pipeline input, not Claude Code instructions.
  Phase A additions rewritten for af-pipeline mode (INJECT phase).
author: luba
updated: "2026-03-22"
priority: HIGH
triggers:
  - "update flow plan"
  - "re-examine FLOW-"
  - "apply algorithm to"
  - "what's missing from this flow"
  - "Pass 1" / "Pass 2" / "Pass 3" through "Pass 7"
---

# FlowReexaminationSkill [Flow Algorithm v1.0]

## Purpose

Flow plans written before 2026-03-20 are server-only. They describe what
the engine generates but not what the user experiences, what events are
emitted, how the client handles each step, or how to test time-based flows.
This skill applies the 7-pass algorithm to fill every gap.

## When to Invoke

- Any flow plan marked as pre-Mode-C (v4 or earlier)
- Before producing session files for any user-facing flow
- When SK-418 FlowCompletenessChecker returns < 15/15

## Canonical Reference

Full algorithm: `FLOW-REEXAMINATION-ALGORITHM.md`
Canonical complete example: `FLOW-01-REFERENCE-PLAN-v5.md`

## The 7 Passes — Summary

```
Pass 1 — EVENT CONTRACT EXTRACTION
  Input: existing flow plan (task type contracts, iron rules, quality gates)
  Output: list of server events, client events, compensation events
  Key rule: every forward event → auto-generate {EventName}RolledBack
             unless terminal (EmailVerified, PaymentCaptured)
  Files created: contracts/events/FLOW-XX/*.schema.json

Pass 2 — CLIENT EVENT IDENTIFICATION
  Input: each step in the flow
  Output: what can the user DO at this step?
  Key rule: client events need source:"client" + sessionId + clientTimestamp
             clientTimestamp = for SLA adjudication when network delays arrival
  Files created: additional schemas in contracts/events/FLOW-XX/

Pass 3 — CLIENT STATE MAP
  Input: flow DAG nodes
  Output: what screen, what SLA, what actions, what happens on app reopen
  Key question: "What does the user see for 24 hours while the server waits?"
  Files created: clientStateMap section in contracts/topologies/FLOW-XX.topology.json

Pass 4 — RETRY AND COMPENSATION REVIEW
  Input: iron rules, factory dependencies
  Output: retry policies per event gate, compensation chain completeness
  Key rules:
    - Execution unit owns retry (not orchestrator) — D15 decision
    - Money before capacity in any compensation (refund before restore)
    - LIFO compensation order (reverse of completion)
  Files created: retry policies in topology file

Pass 5 — OBSERVABILITY ADDITIONS
  Input: flow domains and event types
  Output: phase-aware log fields, Grafana dashboard panels, alert thresholds
  Key rules:
    - develop: full payload, schema diff on failure
    - debug: contract violations, SLA position, business impact
    - production: metrics only, no PII in any log field
  Files created: infrastructure/monitoring/FLOW-XX-dashboard.json
                 docs/runbooks/FLOW-XX-runbook.md

Pass 6 — E2E TEST MATRIX
  Input: all events, time-based steps, compensation chains
  Output: complete test scenario suite
  Mandatory categories (every flow needs all of these):
    1. Happy path
    2. Idempotency (same trigger twice → same result)
    3. Rate limit / quota (limit+1 → rejection)
    4. Compensation chain (fail at step N → LIFO unwind)
    5. Virtual clock (for any EP-2 timer or SCHEDULED archetype)
    6. App reopen / resume
    7. BFA assertions (cross-flow CF rules exercised)
    8. Security boundary (wrong tenant → failure)
  Files created: contracts/tests/FLOW-XX.test-matrix.json

Pass 7 — GENESIS PROMPT + ARBITER UPDATES (v1.1: AF-1 pipeline input)
  Input: existing genesis prompts (task-delta format)
  Output: HybridGenesisPrompt format for AF-1 consumption
  
  CRITICAL (v1.1): Genesis prompts are INPUT TO THE AF PIPELINE.
  They are NOT instructions for Claude Code to follow manually.
  AF-3 retrieves them, AF-4 adds RAG context, AF-1 generates code from them.
  If implementationMode = "af-pipeline": Claude Code seeds these to ES,
  then submits contracts to FlowOrchestrator. Claude Code does NOT read
  the genesis prompt and type the service code by hand.
  
  HybridGenesisPrompt 4-section structure (for AF-1):
    Section 1 neutralIronRules[]: stack-neutral rules (AF-7 validates these)
    Section 2 conceptDescription: plain English for AF-2 planning
    Section 3 eventContracts: CONSUMES/EMITS/BOUNDARY (AF-6 validates these)
    Section 4 stackImplementations: per-stack generation frames for AF-1
  Files updated: flow reference plan genesis prompts
  New Phase A steps: NEW-A1 through NEW-A7 (A7 added in v1.1)
  New integration gate steps: NEW-E1 through NEW-E6
```

## Phase A Additions (NEW-A1 through NEW-A6)

Every flow's Phase A must include these after FLOW-35:

```
NEW-A1: Generate event contract schemas
        → server + client + compensation schemas
        → contracts/events/FLOW-XX/ (minimum 6 files)

NEW-A2: Seed integration mode config
        → INJECTABLE vs PLATFORM-ONLY per factory
        → contracts/topologies/FLOW-XX.topology.json

NEW-A3: Generate compensation event schemas
        → auto-generated from forward events
        → same directory as server events

NEW-A4: Generate retry policy spec
        → per event gate in topology
        → execution unit owns retry (D15)

NEW-A5: Generate Grafana dashboard template
        → 4 panels: funnel, SLA, retry/compensation, tenant health
        → infrastructure/monitoring/FLOW-XX-dashboard.json

NEW-A6: Create E2E test matrix stub
        → all 8 mandatory categories
        → contracts/tests/FLOW-XX.test-matrix.json

NEW-A7: Seed AF prompts (v1.1 — af-pipeline mode only)
        → 4 prompts per task type: genesis, review, compliance, judge
        → Seed to ES (xiigen-prompts index)
        → Register in AF-3 in-memory prompt map
        → Seed EngineContracts to ES (xiigen-engine-contracts index)
        → This completes the INJECT phase — AF pipeline can now generate
```

## Integration Gate Additions (NEW-E1 through NEW-E6)

Every flow's integration gate must include these after FLOW-35:

```
NEW-E1: Export/import round-trip test
        → exportBundle(FLOW-XX) → FlowBundle JSON (no code, event schemas only)
        → importBundle(FlowBundle, newTenantId) → verify isolated copy works

NEW-E2: Multi-language smoke test
        → Python FastAPI reference → TypeScript NestJS reference
        → both produce identical event sequence for T001 happy path

NEW-E3: Training trace export
        → T2-S4 TrainingTraceWriter has entry for accepted bundles
        → DPO triple exported: { prompt, chosen, rejected, scores }

NEW-E4: Chaos tests
        → kill execution unit mid-flow → compensation chain fires
        → duplicate event delivered → idempotency holds
        → advance virtual clock past SLA → timeout event emitted

NEW-E5: Observability smoke test
        → trigger T001 happy path
        → verify log entry per event (correlationId + tenantId + traceparent)
        → verify Grafana dashboard shows correct funnel state

NEW-E6: E2E test matrix execution (Layer 2)
        → run all scenarios from contracts/tests/FLOW-XX.test-matrix.json
        → virtual clock tests require test engine clock injection
        → drain dead-letter queue after run
```

## Validation — run flow-completeness-checker v1.5 after all passes

```
V0-MODE  implementationMode declared (P12) — MUST PASS FIRST
V0-SCOPE stackTargets/clientTargets enforced (P13) — MUST PASS FIRST
V1   All 7 passes complete (no open items)
V2   contracts/events/FLOW-XX/ has ≥ 6 schema files
V3   contracts/topologies/FLOW-XX.topology.json exists with clientStateMap
V4   contracts/tests/FLOW-XX.test-matrix.json with ≥ 8 scenarios
V5   infrastructure/monitoring/FLOW-XX-dashboard.json (4 panels)
V6   docs/runbooks/FLOW-XX-runbook.md
V7   Flow plan has 6 new sections (Passes 1-6 output)
V8   Genesis prompts in HybridGenesisPrompt format (AF-1 input)
V9   Phase A includes NEW-A1 through NEW-A7 (A7 = AF prompt seeding)
V10  Integration gate includes NEW-E1 through NEW-E6
V11  All optimistic actions have 3-part contract
V12  All time-based steps have virtualClock: true test
V13  All compensation chains have LIFO test
V14  DPO triple export confirmed in NEW-E3
V15  No factory interface references in event schemas
```

## Priority Order for Running Passes

```
On a server-only plan (v4 or earlier):
  Pass 1 first — everything else depends on knowing the events
  Pass 2 second — client events reference server events
  Pass 3 third — client state map references both event types
  Pass 4 independent — can run after Pass 1
  Pass 5 independent — can run after Pass 1
  Pass 6 after Pass 1-3 — test matrix references all events + client states
  Pass 7 last — updates genesis prompts with all previous outputs

Time estimate: 3-4 hours per flow (see FLOW-REEXAMINATION-ALGORITHM.md)
```

## Positive Example

```
Input: FLOW-07-REFERENCE-PLAN.md (v1, server-only)
Expected output after all 7 passes: FLOW-07-REFERENCE-PLAN-v2.md with:
  - 14 event schemas in contracts/events/FLOW-07/
    (8 server + 4 client + 2 compensation)
  - topology.json with clientStateMap for all 6 DAG nodes
  - test matrix with 12 scenarios (3 with virtualClock: true — T82 is SCHEDULED)
  - dashboard JSON with 4 panels
  - runbook with debug CLI timeline for connection strength rebalancer
  - All 7 genesis prompts updated with Mode C section
  - SK-418 returns 15/15

SK-418 gate before session files: 15/15 required.
```

## Negative Example

```
"The plan looks complete" without running SK-418 → do not proceed.
"We'll add event contracts in Phase A" → V2 fails immediately.
"The client just calls the API" → P10 violation, V3 fails.
"No tests for the 6h rebalancer timer" → V12 fails.
```
