---
name: flow-completeness-checker
version: "1.5.0"
description: >
  Validates that a flow reference plan is complete. 33-item checklist.
  V0-MODE + V0-SCOPE run BEFORE all other checks (new in v1.5).
  V1–V28 unchanged. V29–V31 stack coupling (from v1.3).
  A plan that fails V0 is REJECTED even if V1–V31 all pass.
layer: planning
updatedAt: "2026-03-22"
requires: [planning-session-startup]
complements: [event-contract-designer, client-server-symmetry, e2e-test-matrix-builder,
  naming-conventions-enforcer, stack-coupling-auditor, implementation-mode-gate]
---

# Flow Completeness Checker v1.5

## Purpose

A flow plan is complete when it declares its execution context (who writes
the code, what stacks are in scope) AND covers all technical dimensions.

**V0 checks run FIRST and gate everything else.** A plan that routes to the
wrong executor or contains out-of-scope content fails even if V1–V31 pass.

## When to Invoke

- "Is this flow plan ready for sessions?"
- "What's missing from FLOW-XX?"
- After any flow reference plan is produced or updated
- Automatically as step 7 of the planning pipeline

## The 33-Item Checklist

```
SECTION 0 — Execution context (V0-MODE, V0-SCOPE) — RUN FIRST

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

SECTION A — Files that must exist (V1–V6)

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

SECTION B — Content completeness (V7–V10)

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

SECTION C — Contract correctness (V11–V13)

V11  All optimistic client actions have 3-part contract:
     optimisticState, confirmationEvent, rollbackEvent specified
     Non-optimistic actions explicitly documented with reason

V12  All time-based steps have virtualClock: true test

V13  All compensation chains have LIFO test

SECTION D — Training and quality (V14–V15)

V14  DPO triple export: ftId, productScope: "client-capability",
     portingCandidate present on all triples

V15  No factory interface references in event contract schemas

SECTION E — Visibility, lifecycle, bundle gates (V16–V23)

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

SECTION F — Client-side architecture completeness (V24–V28)

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

SECTION G — Stack coupling completeness (V29–V31) NEW in v1.3

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

## Gap Report Format

```
FLOW-XX COMPLETENESS: {N}/31 items pass

GAPS:
  V8  MISSING: genesis prompts not in HybridGenesisPrompt format
               (run SK-432 HybridPromptBuilder on Pass 7 output)
  V29 MISSING: T47 has no stackCoupling annotation
               (run SK-431 StackCouplingAuditor on this task type)
  V30 MISSING: T48 php-wordpress:server — incompatibleReason absent
  V31 MISSING: awaiting-email-verification node — angular:client has no stateNotes

ESTIMATE TO COMPLETE: [time]
NEXT STEP: [specific pass or gate addition needed]
```

## Positive Example (FLOW-01 v9 — 31/31)

```
V1–V28: all pass (unchanged from v1.2)

V29 ✅ T47: IMPL_VARIES, entries: node-nestjs:server + redis:platform + jest:platform
    T48: STACK_COUPLED, entries: node-nestjs:server + php-wordpress:server (INCOMPATIBLE)
         + php-laravel:server + redis:platform + aws-ses:platform + jest:platform
    T49: IMPL_VARIES, entries: node-nestjs:server + redis:platform + jest:platform
    neutralConcepts[] on all: no NestJS/Laravel/Python syntax

V30 ✅ T48 php-wordpress:server: incompatible: true
    incompatibleReason: "wp_cron fires only on page load — unreliable for 24h TTL"
    mitigation: "Use php-laravel. If WordPress required: Action Scheduler, accept degraded."

V31 ✅ awaiting-email-verification react-web:client:
      stateHolderType: "useState", stateScope: "feature-scoped",
      propagationRisk: "LOW", routeGuardRequired: false
    awaiting-email-verification angular:client:
      stateHolderType: "BehaviorSubject", stateScope: "feature-module",
      propagationRisk: "MEDIUM", routeGuardRequired: true,
      stateConsumerMap: {VerificationWaitingComponent, VerificationExpiredGuard}

RESULT: 31/31 — ready for session files
```

## Negative Example

```
Review: FLOW-03-REFERENCE-PLAN-v2.md (pre-FLOW-00.2)

V1–V28: all pass

V29: ❌ T59, T60, T61, T62 have no stackCoupling annotation
V30: ❌ T60 EventRegistrationManager — atomic transaction incompatibility
         for php-wordpress not flagged
V31: ❌ event-creation node (T59, requiresDraftState: true) —
         no stateNotes on react-web:client or angular:client

RESULT: 28/31 — V29/V30/V31 all gap.
Run SK-431 + SK-432 on all task types, then add stateNotes to topology nodes.
```

## Integration

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
```
