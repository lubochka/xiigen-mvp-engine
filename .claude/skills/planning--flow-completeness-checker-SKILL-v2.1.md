---
name: flow-completeness-checker
version: "2.1.0"
sk_number: SK-441
description: >
  Validates that a flow reference plan is complete. 35-item checklist.
  V0-MODE + V0-SCOPE + V32 + V33 run BEFORE all other checks (v2.0).
  V1–V31 unchanged from v1.5. V32 Goal-to-Turn Mapping (via SK-534) and
  V33 Design Artifact Populated (via SK-537) added as structural pre-gates.
  A plan that fails V0 or V32 or V33 is REJECTED even if V1–V31 all pass.
layer: planning
updatedAt: "2026-04-16"
supersedes: "1.5.0"
requires: [planning-session-startup]
complements: [event-contract-designer, client-server-symmetry, e2e-test-matrix-builder,
  naming-conventions-enforcer, stack-coupling-auditor, implementation-mode-gate,
  goal-delivery-completeness, design-artifact-completeness]
---

# Flow Completeness Checker v2.1

## Purpose

A flow plan is complete when it declares its execution context (who writes the code, what stacks are in scope), its GOAL DELIVERY (which user goals each turn advances), its ARTIFACT DEPENDENCIES (every referenced design artifact is populated), AND covers all technical dimensions.

**V0, V32, V33 run FIRST and gate everything else.** A plan that routes to the wrong executor, contains out-of-scope content, leaves user goals unmapped, or depends on empty artifacts fails even if V1–V31 pass.

## When to Invoke

- "Is this flow plan ready for sessions?"
- "What's missing from FLOW-XX?"
- After any flow reference plan is produced or updated
- Automatically as step 7 of the planning pipeline

## The 36-Item Checklist (v2.1)

```
SECTION 0 — Structural pre-gates (V0-MODE, V0-SCOPE, V32, V33) — RUN FIRST

V0-MODE  Implementation mode declared and consistent (P12):
         STATE.json has implementationMode: "af-pipeline" | "manual" | "hybrid"
         implementationModeReason present
         If af-pipeline:
           Genesis prompts are AF-1 input (not Claude Code instructions)
           SESSION files reference engine.generate() or FlowOrchestrator
           No SESSION file creates .service.ts files directly
           Phase structure follows INJECT → GENERATE → JUDGE → INTEGRATE → PROMOTE
         If manual:
           Justification present (AF pipeline not yet available)
           Only valid for FLOW-00.x, FLOW-35 Phase A-C
         FAIL V0-MODE → plan REJECTED regardless of V1–V31 status

V0-SCOPE Scope discipline enforced (P13):
         STATE.json has stackTargets[] and clientTargets[]
         Topology stateNotes ONLY for declared clientTargets
         Coupling maps: full entries ONLY for declared stackTargets + platforms
         Non-priority stacks: APPENDIX A only (not plan body)
         V31/FC-21 checks scoped to declared clientTargets only
         FAIL V0-SCOPE → plan contains noise that causes wrong implementation

V32 Goal-to-Turn Mapping (NEW v2.0 — governed by SK-534):
    For every user-stated goal element the flow claims to deliver:
      ≥1 turn assigned to the goal
      verification step specified (round-trip step reference per SK-533,
        or explicit acceptance test, or concrete observable)
    Goal elements extracted from STATE.goalContext.statement (per SK-536)
    No goal is implicitly covered — all mappings explicit
    V32 output format: per-goal verdict table (APPROVED | BLOCK_UNMAPPED |
      BLOCK_UNVERIFIED | CHALLENGE)
    FAIL V32 → flow plan claims coverage it cannot verify
    Aggregate verdict: any BLOCK_* → REJECTED regardless of V1–V31

V33 Design Artifact Populated (NEW v2.0 — governed by SK-537):
    For every referenced fixture in the plan:
      contract.json / contracts.ndjson: C1 + C2 PASS (non-empty taskTypes[])
      topology.json: C1 + C2 PASS (non-empty nodes[], non-empty edges[])
      design-reasoning.json: C1 + C2 PASS (non-empty decisions[])
      arbiters bulk NDJSON: C1 + C2 PASS (≥1 domain arbiter; scope_isolation last)
      event-schemas.json: C1 + C2 PASS (non-empty schemas[])
    Check 3 (content specific) and Check 4 (matches impl): surfacing, not blocking
    Check 5 (seeded to RAG): informational
    V33 output format: per-artifact table (PASS | FAIL | PARTIAL per check)
    FAIL V33 → flow plan depends on empty or missing artifacts
    Resolution: enrich first (adds task) OR scope around (SK-531 DEFERRED)

V34 UI/UX Compliance Pre-Gate (NEW v2.1 — governed by SK-539 + FC-18):
     Fires only if the plan includes React page implementation steps (*.tsx files).
     Two sub-checks:

     V34a — Role declarations present for all planned pages:
       For every *.tsx file the plan creates, the plan text must answer Q1
       (ROLE_TIER), Q2 (ROLE_GATE), Q3 (ROUTE_GUARD), Q4 (VISIBILITY) from
       SK-539 §1. Missing answers → V34 FAIL.

     V34b — Phase 7 declared in plan structure:
       For every React pages phase in the plan, a corresponding Phase 7
       (UI/UX Compliance) step must follow it. Phase 7 absent → V34 FAIL.

     V34 PASS: V34a and V34b both pass for all pages.
     V34 FAIL: missing role declaration OR React pages phase without Phase 7 step.
               FAIL V34 → blocks V1–V31 evaluation, same as V32/V33.
     V34 N/A:  plan produces no React pages (server-only session with declared
               exemption stated explicitly: "No React pages — V34 N/A.")

SECTION A — Files that must exist (V1–V6) [unchanged from v1.5]

V1   Pass 1–7 of FLOW-REEXAMINATION-ALGORITHM.md all green

V2   contracts/events/FLOW-XX/ directory with correct schema count
     Each schema: correlationId, tenantId, timestamp, source in required[]
     No PII in any data{} block

V3   contracts/topologies/FLOW-XX.topology.json
     Must contain: DAG nodes, SLAs, clientStateMap, retry policies,
     injectable/platform-only factory annotations
     Must also contain: clientArchitecture section (V24),
     stackCoupling per node (V31)

V4   contracts/tests/FLOW-XX.test-matrix.json
     Must contain: happy path, edge cases, virtualClock tests,
     compensation chain test, BFA assertion tests
     Minimum rows: 8 (simple), 15+ (complex)

V5   infrastructure/monitoring/FLOW-XX-dashboard.json
     Must contain: 4 Grafana panels

V6   docs/runbooks/FLOW-XX-runbook.md
     Must contain: debug CLI timeline, alert thresholds

SECTION B — Content completeness (V7–V10) [unchanged from v1.5]

V7   Client event identification section present (Pass 2 output):
     For each step with user-initiated actions: events listed
     For background flows: explicitly documented

V8   All genesis prompts in HybridGenesisPrompt format (v1.3 requirement):
     Each task type prompt has 4 sections:
       Section 1 neutralIronRules[]: no framework names, no stack syntax
       Section 2 conceptDescription: plain English, no tech references
       Section 3 eventContracts: CONSUMES / EMITS / BOUNDARY (neutral)
       Section 4 stackImplementations: per StackKey generation frames
     LANGUAGE TARGET specified in Section 4 per-stack entry
     CONSUMES/EMITS/INTEGRATION BOUNDARY present (Section 3)
     (Pre-FLOW-00.2 flows: single-text format accepted for V8 — upgrade in re-review)

V9   All task type phase/integration sections present:
     Phase A: NEW-A1 through NEW-A6 minimum
     Phase E: NEW-E1 through NEW-E6 minimum

V10  FlowStateSnapshot endpoint defined for user-facing flows:
     GET /flow/FLOW-XX/state spec present
     Returns: currentStep, sla, availableActions, completedSteps
     (Exception: background flows — document explicitly)

SECTION C — Contract correctness (V11–V13) [unchanged from v1.5]

V11  All optimistic client actions have 3-part contract:
     optimisticState, confirmationEvent, rollbackEvent specified
     Non-optimistic actions explicitly documented with reason

V12  All time-based steps have virtualClock: true test

V13  All compensation chains have LIFO test

SECTION D — Training and quality (V14–V15) [unchanged from v1.5]

V14  DPO triple export: ftId, productScope: "client-capability",
     portingCandidate present on all triples

V15  No factory interface references in event contract schemas

SECTION E — Visibility, lifecycle, bundle gates (V16–V23) [unchanged from v1.5]

V16  Wave assignment declared in plan and STATE.json spec
     STATE.json includes: flow_id, flow_name, parallel_wave, wave

V17  Phase A gate includes DRY_RUN (D-VIS-2)

V18  Phase A gate includes arbiter replay (Addition 1)

V19  Phase A gate includes flow-lifecycle CAS write (D-VIS-4)
     For Wave 2+ flows: prerequisite wave check present

V20  Phase E gate includes test:flow-matrix (D-VIS-3)

V21  Phase E gate includes cross-flow edge tests

V22  Phase E gate includes blast radius + 3-case protocol (D-VIS-1)

V23  Phase E gate includes lifecycle update + bundle check

SECTION F — Client-side architecture completeness (V24–V28) [unchanged from v1.5]

V24  topology.json clientArchitecture section present:
     requiresDraftState: true|false
     offlineQueue.queueable[], notQueueable[] with reasons
     backgroundSteps[]

V25  appReopenBehavior on EVERY DAG node:
     SLA-bearing nodes: behaviour on sla.isBreached specified

V26  Phase E gate includes client integration tests:
     C1 (optimistic), C2 (reopen), C3 (offline queue if any),
     C4 (SLA countdown if any), C5 (draft if requiresDraftState)
     Client test delta in STATE.json

V27  Draft state specified if requiresDraftState: true:
     draftSteps[], draftFields[], auto-save triggers, TTL

V28  Background steps → signal type specified:
     signalType defined for every background task affecting UI

SECTION G — Stack coupling completeness (V29–V31) [unchanged from v1.5]

V29  stackCoupling annotation present on ALL task types in the plan:
     For each T-{N}:
       entries map present (min: 'node-nestjs:server' entry)
       server entry has: tier, stackCategory, dimensions, neutralConcepts,
         implementationNotes, supportedServerStacks
       neutralConcepts[] is non-empty
       neutralConcepts[] contains no framework names or stack-specific syntax
     Exception: pre-FLOW-00.2 task types (T1–T566) — annotated in FLOW-00.2
       Phase D. New flows (T567+) must include stackCoupling from first session.

V30  All ⛔ INCOMPATIBLE stacks explicitly flagged:
     For every entry where incompatible: true:
       incompatibleReason: non-empty string
       mitigation: present (alternative stack or architectural workaround)
     Exception: stacks not in stackTargets — no assessment needed
     Exception: flows where supportedServerStacks has only one entry
       and no other stacks are mentioned — V30 passes trivially

V31  Client nodes with reactive state have stateNotes per stack:
     For every topology node where:
       client entry exists AND tier != 'CONCEPT_NEUTRAL'
       AND node has optimisticActions OR appReopenBehavior OR
           backgroundSteps OR requiresDraftState
     Then each client stack entry must have stateNotes with:
       stateHolderType: non-empty string (framework-specific term)
       stateHolderTypeReason: non-empty string
       stateScope: 'feature-scoped' | 'root-scoped'
       stateScopeReason: non-empty string
       propagationRisk: 'LOW' | 'MEDIUM' | 'HIGH'
       propagationRiskReason: non-empty string
       routeGuardRequired: boolean
     Exception: CONCEPT_NEUTRAL client nodes — no stateNotes needed
     Exception: flows with no client targets — V31 passes trivially
```

## Gap Report Format (v2.0)

```
FLOW-XX COMPLETENESS: {N}/35 items pass

STRUCTURAL GAPS (SECTION 0 — blocks everything):
  V32 MISSING: Goal element "[text]" has no turn assigned
               (run SK-534 — decompose goals and assign turns, or SK-531 DEFERRED)
  V33 MISSING: contracts/topologies/flow-X.topology.json has nodes:[]
               (run SK-537 on flow-X, enrich topology before proceeding)
  V34 FAIL: plan adds PageName.tsx but no Q1/Q2/Q3/Q4 role declarations present
            (add role declaration block per SK-539 §1 before writing page)
  V34 FAIL: plan has React pages phase but no Phase 7 step declared after it
            (add Phase 7 UI/UX Compliance step to plan structure)

TECHNICAL GAPS (SECTIONS A-G):
  V8  MISSING: genesis prompts not in HybridGenesisPrompt format
               (run SK-432 HybridPromptBuilder on Pass 7 output)
  V29 MISSING: T47 has no stackCoupling annotation
               (run SK-431 StackCouplingAuditor on this task type)
  V30 MISSING: T48 php-wordpress:server — incompatibleReason absent
  V31 MISSING: awaiting-email-verification node — angular:client has no stateNotes

ESTIMATE TO COMPLETE: [time]
NEXT STEP: [specific pass or gate addition needed]

PRIORITY ORDER: V32/V33 first (structural), then V8+V29+V30+V31 (technical)
```

## Positive Example (FLOW-01 v9 — 35/35 under v2.0)

```
V0-MODE ✅ implementationMode: "af-pipeline" — all prerequisites met
V0-SCOPE ✅ stackTargets: [node-nestjs, react-web], appendixA for others
V32 ✅ All 4 goal elements mapped:
    GE-1 (design sim → flow menu): T1, T2, T3 → round-trip step 2
    GE-2 (teach/QA workflow): T4 → round-trip step 2 (teach/QA variant)
    GE-3 (admin panel, tenant private): T5 → round-trip step 6
    GE-4 (marketplace): T6, T7 → round-trip steps 3-5
V33 ✅ All referenced artifacts PASS Checks 1-2:
    contract.json populated, topology.json non-empty nodes[],
    design-reasoning.json has 5 decisions, arbiter NDJSON has panel
    Check 5 (seeded): FAIL — design-reasoning not in xiigen-rag-patterns
    (informational, not blocking — follow-up task logged)

V1-V28: all pass (unchanged from v1.2)
V29-V31: all pass (unchanged from v1.3)

RESULT: 35/35 — ready for session files (V33 Check 5 noted as follow-up)
```

## Negative Example (v27 retrospective under v2.0)

```
Review: FLOW-03-REFERENCE-PLAN-v27.md under SK-441 v2.0

V0-MODE: ✅ implementationMode declared
V0-SCOPE: ✅ scope discipline enforced
V32: ❌ 3 of 4 goal elements unmapped
     GE-2 (teach/QA workflow): no turn assigned → BLOCK_UNMAPPED
     GE-3 (admin panel): no turn assigned → BLOCK_UNMAPPED
     GE-4 (marketplace): T12 only, no verification → BLOCK_UNVERIFIED
V33: ❌ 10 of 14 referenced topology files have nodes:[]
     Plan treats all 14 as complete design input; 10 are empty

RESULT: REJECTED at SECTION 0. V1-V31 not evaluated.
        Under v1.5 (prior version): would have passed V0 and proceeded to V1-V31
        where 55 findings were accumulated. v2.0 catches coverage failures BEFORE
        investing review effort on technical completeness. ~21 review rounds saved.

REMEDIATION: map GE-2/3 turns or explicitly defer (SK-531 DEFERRED);
             enrich 10 empty topologies (adds a task) or scope around them.
```

## Integration (v2.0)

```
requires:    SK-416 (session startup)
complements: SK-419 (event contracts — fills V2, V3, V24)
             SK-420 (client symmetry — fills V7, V8, V11, V25, V27, V28)
             SK-421 (E2E test matrix — fills V4, V12, V13)
             SK-430 (naming conventions — prerequisite for V8, V16)
             SK-431 (stack coupling auditor — fills V29, V30, V31)
             SK-432 (hybrid prompt builder — fills V8 hybrid format)
             SK-434 (parallel wave coordinator — fills V16, V19)
             SK-436 (bundle version guard — fills V23)
             SK-534 (goal-delivery-completeness — governs V32) NEW v2.0
             SK-537 (design-artifact-completeness — governs V33) NEW v2.0
             SK-536 (goal-context-persistence — provides goal statement) NEW v2.0
             SK-533 (mvp-round-trip-verification — provides verification vocabulary) NEW v2.0
             SK-531 (claim-as-hypothesis — provides DEFERRED mechanism for V32/V33 gaps) NEW v2.0
             SK-539 (ui-ux-compliance — governs V34) NEW v2.1
             FC-18 (ui-ux-compliance gate — V34b references Phase 7 requirement) NEW v2.1
```

## Backward Compatibility — v2.0 → v2.1

Flows reviewed under v2.0 that passed V0-MODE + V0-SCOPE + V32 + V33 + V1–V31 (35/35) may still fail v2.1's V34 if the plan included React pages without role declarations or Phase 7 steps.

Re-reviewing a v2.0-approved flow plan under v2.1:
- If V34 FAILs on V34a: add role declaration blocks (Q1–Q4) to each page spec in the plan.
- If V34 FAILs on V34b: add Phase 7 step declaration after each React pages phase.
- If V34 passes or is N/A: plan remains approved. v2.0 verdicts on V32/V33/V1–V31 unchanged.

Server-only sessions (no React pages) are unaffected — V34 N/A passes trivially.

## Backward Compatibility — v1.5 → v2.0

Flows reviewed under v1.5 that passed V0-MODE + V0-SCOPE + V1–V31 (33/33) may still fail v2.0's V32 or V33. This is expected — v2.0 checks dimensions v1.5 did not.

Re-reviewing a v1.5-approved flow plan under v2.0:
- If V32 FAILs: flow plan has unmapped goals. Add turns or explicitly defer via SK-531.
- If V33 FAILs: flow plan depends on empty artifacts. Enrich artifacts OR scope around.
- If V32 and V33 PASS: flow plan remains approved. v1.5 verdicts on V1-V31 unchanged.

v27 of User Journey Reconnection: would pass V1-V31 under v1.5; fails V32 (3 unmapped goals) AND V33 (10 empty topologies) under v2.0.
