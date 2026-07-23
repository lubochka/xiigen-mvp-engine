# FLOW-02: BUSINESS ONBOARDING INTELLIGENCE — REFERENCE PLAN v3
## Mode C / Client Architecture / Session Output complete re-examination
## Updated: 2026-03-20 (v3 — visibility plan + lifecycle + bundle + productScope)
## Prerequisites: FLOW-01 ACTIVE + FLOW-35 + FLOW-36 + FLOW-00 complete
## Date: 2026-03-20
## SK-418 FlowCompletenessChecker: 15/15 ✅

---

## WHAT CHANGED FROM v2

| What v2 had | What v3 adds |
|-------------|-------------|
| No DRY_RUN gate in Phase A | Phase A gate: bootstrap:dry-run required (D-VIS-2) |
| No arbiter replay gate in Phase A | Phase A gate: replayArbiterOnBundle for new arbiters |
| No lifecycle tracking in Phase A | Phase A gate: flow-lifecycle CAS write NOT_STARTED → GENERATED |
| No test:flow-matrix in Phase E | Phase E gate: npm run test:flow-matrix (D-VIS-3) |
| No cross-flow edge tests | Phase E gate: test:cross-flow outbound AND inbound edges |
| No blast radius protocol in Phase E | Phase E gate: 3-case protocol (D-VIS-1) |
| No lifecycle update in Phase E | Phase E gate: flow-lifecycle → PROMOTED → ACTIVE |
| No bundle version check in Phase E | Phase E gate: bundle version check for B-001/B-002 |
| DPO triple missing productScope | NEW-E3: productScope: "client-capability" added |
| Prerequisites missing FLOW-00 | Prerequisites: FLOW-00 required |
| Wave assignment missing | FLOW-02 is Wave 1 — sequential, parallel_wave: null |

All event contracts, artifact numbers, passes 1–7, and test matrix unchanged.

---

## WAVE ASSIGNMENT

```
FLOW-02: Wave 1 — sequential
  parallel_wave: null
  prerequisite: FLOW-01 status = ACTIVE in flow-lifecycle index
  downstream: FLOW-03, FLOW-04, FLOW-05, FLOW-07 (Wave 2 — parallel)
```

**Critical:** FLOW-02 must verify FLOW-01 is ACTIVE before beginning Phase A.
The flow-lifecycle gate enforces this:
```
□ GET /lifecycle/flows/FLOW-01 returns status=ACTIVE
  If NOT ACTIVE: STOP — FLOW-01 has not completed
```

STATE.json:
```json
{
  "flow_id": "FLOW-02",
  "parallel_wave": null,
  "wave": 1
}
```

---

## ARTIFACT NUMBERS (verified, unchanged)

```
Task types:  T50 ParallelProfileEnricher, T51 MatchingConvergenceGate,
             T52 OnboardingCompletionBroadcaster
Factories:   F182–F189 (8 factories)
BFA rules:   CF-4–CF-9 (verify present, do not re-seed)
Family:      19
New archetypes: CONVERGENCE (T51), BROADCAST (T52)
New arbiters: convergence::join-semantics, convergence::degraded-path,
  broadcast::payload-contract, broadcast::gdpr-cascade,
  orchestration::correlationId-propagation, orchestration::branch-resilience
```

---

[PASSES 1–7 UNCHANGED FROM v2 — see v2 for full content]

---

## PHASE A — CONTRACTS + ARBITERS + MODE C FOUNDATIONS

**All NEW-A1 through NEW-A6 from v2 apply unchanged.**

**Gate (v3 additions):**

```
□ 2 enum entries added: CONVERGENCE, BROADCAST
□ 3 EngineContracts (T50, T51, T52)
□ 6 new arbiters registered
□ DAG JSON seeded
□ CF-4–CF-9 verified present
□ 13 event schema files in contracts/events/FLOW-02/
□ topology.json with clientStateMap
□ test-matrix.json stub with 12 scenarios
□ dashboard.json with 4 panels

[NEW v3] FLOW-01 dependency gate:
  GET /lifecycle/flows/FLOW-01 → status must be ACTIVE
  If not ACTIVE: STOP and report

[NEW v3 — D-VIS-2] DRY_RUN:
  npm run bootstrap:dry-run -- --flow=FLOW-02
  Assert: valid = true

[NEW v3 — Addition 1] Arbiter replay:
  For each of the 6 new arbiters:
    replayArbiterOnBundle against accepted bundles in same archetype
    Assert: wouldHaveBlocked = false

[NEW v3 — D-VIS-4] flow-lifecycle CAS:
  CAS: FLOW-02 NOT_STARTED → GENERATED
  If CAS fails: STOP

□ npx tsc --noEmit = 0 errors
□ Tests: ≥ 4,106 (entry 4,096 + 10)
```

---

## PHASES B, C, D — GENERATION LOOPS (unchanged from v2)

T50 ParallelProfileEnricher, T51 MatchingConvergenceGate,
T52 OnboardingCompletionBroadcaster — all per v2.

---

## PHASE E — BFA + INTEGRATION GATE

**All NEW-E1 through NEW-E6 from v2 apply. Gate updated for v3.**

**NEW-E3 updated (v3):**
```
NEW-E3: Training trace export
  DPO triple exported per task type: {
    ftId,
    taskTypeId,
    productScope: "client-capability",  ← [NEW v3]
    prompt_version, chosen_bundle, rejected_candidates, scores,
    portingCandidate: true
  }
  Assert: 3 DPO triples, ftId populated, productScope: "client-capability"
```

**Gate (v3 additions):**

```
□ BFA governance PASS — CF-4–CF-9 pass
□ NEW-E1 through NEW-E6 all pass
□ Degraded integration: matching timeout → OnboardingCompleted(pending) fires
□ FLOW-03/04/05/07 gate unlocked after OnboardingCompleted (CF-4)
□ DPO triples: 3 entries, ftId populated, productScope: "client-capability"

[NEW v3 — D-VIS-3] test:flow-matrix:
  npm run test:flow-matrix -- --flow=FLOW-02
  All 12 scenarios pass
  T002, T003 (virtualClock: true) ran with clock injection

[NEW v3] Cross-flow edge tests (FLOW-02 has both inbound AND outbound):
  Inbound (from FLOW-01):
    FLOW-01_to_FLOW-02.edge.spec.ts — implement real assertions here
    (This is where the FLOW-01→FLOW-02 stub gets its real implementation)
    Assert: UserOnboardingCompleted triggers T50 correctly
    Assert: tenant isolation: FLOW-01 event for tenant-A doesn't trigger tenant-B FLOW-02
  Outbound (to Wave 2 flows):
    FLOW-02_to_FLOW-03.edge.spec.ts (stub — FLOW-03 not yet generated)
    FLOW-02_to_FLOW-04.edge.spec.ts (stub)
    FLOW-02_to_FLOW-05.edge.spec.ts (stub)
    FLOW-02_to_FLOW-07.edge.spec.ts (stub)
  npm run test:cross-flow
  Assert: FLOW-01_to_FLOW-02 passes with real assertions
  Assert: outbound stubs skip without failing

[NEW v3 — D-VIS-1] T521 blast radius + 3-case protocol:
  CASE A/B/C per FLOW-EXECUTION-VISIBILITY-PLAN.md

[NEW v3] Bundle version check:
  FLOW-02 is in bundles: B-001, B-002, B-003, B-004
  Verify version ≥ bundle.minFlowVersions.FLOW-02 for each

[NEW v3 — D-VIS-4] flow-lifecycle update:
  FLOW-02 → PROMOTED → ACTIVE

□ Tests: ≥ 4,136 (entry 4,106 + 30)
□ FLOW-02-STATE.json saved
```

---

## SK-418 FLOW COMPLETENESS CHECK — 15/15 (unchanged)

V14 updated:
```
V14 ✅ DPO triple export confirmed (3 triples, productScope: "client-capability")
```

---

## KEY FACTS FOR SESSION FILES (updated v3)

```
Wave: 1 (sequential — parallel_wave: null)
Dependency gate: FLOW-01 must be ACTIVE before Phase A

Inbound edge test: FLOW-01_to_FLOW-02 — implement real assertions in Phase E
Outbound edge stubs: FLOW-02_to_FLOW-03/04/05/07 (stubs, filled in by those flows)

Bundle membership: B-001, B-002, B-003, B-004

flow-lifecycle:
  Phase A: NOT_STARTED → GENERATED (CAS, verify FLOW-01 ACTIVE first)
  Phase E: → PROMOTED → ACTIVE

Note: FLOW-02 always completes (T52 always emits OnboardingCompleted).
matchStatus="pending" is a valid terminal state, not a failure.
The degraded path is transparent to the user.

Read before planning:
  FLOW-EXECUTION-VISIBILITY-PLAN.md
  PARALLEL-EXECUTION-PLAN.md (for Wave 2 context)
```

---

## SESSION FILES TO PRODUCE (updated v3)

```
FLOW-02-STATE.json               ← parallel_wave: null, wave: 1
SESSION-FLOW-02-A.md             ← [v3] adds FLOW-01 dependency gate + DRY_RUN + CAS
SESSION-FLOW-02-B.md             ← ParallelProfileEnricher [T50] (unchanged)
SESSION-FLOW-02-C.md             ← MatchingConvergenceGate [T51] (unchanged)
SESSION-FLOW-02-D.md             ← OnboardingBroadcaster [T52] (unchanged)
SESSION-FLOW-02-E.md             ← [v3] adds flow-matrix + edge tests (real inbound) + lifecycle + bundle
docs/FLOW-02-REFERENCE.md
```

Every SESSION file ends with Phase Completion Package (SK-427).

⛔ STOP — Verify FLOW-01 is ACTIVE before Phase A.
Read FLOW-EXECUTION-VISIBILITY-PLAN.md before planning.
