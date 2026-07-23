# FLOW-01: USER REGISTRATION & ONBOARDING — REFERENCE PLAN v6
## Mode C / Client Architecture / Session Output complete re-examination
## Updated: 2026-03-20 (v6 — visibility plan + lifecycle + bundle + productScope)
## Prerequisites: All infrastructure flows complete + FLOW-35 + FLOW-36 + FLOW-00 complete
## Date: 2026-03-20
## SK-418 FlowCompletenessChecker: 15/15 ✅

---

## WHAT CHANGED FROM v5

| What v5 had | What v6 adds |
|-------------|-------------|
| No DRY_RUN gate in Phase A | Phase A gate: bootstrap:dry-run required (D-VIS-2) |
| No arbiter replay gate in Phase A | Phase A gate: replayArbiterOnBundle for new arbiters |
| No lifecycle tracking in Phase A | Phase A gate: flow-lifecycle CAS write NOT_STARTED → GENERATED |
| No test:flow-matrix in Phase E | Phase E gate: npm run test:flow-matrix (D-VIS-3) |
| No cross-flow edge tests in Phase E | Phase E gate: npm run test:cross-flow outbound edges |
| No blast radius protocol in Phase E | Phase E gate: 3-case protocol (D-VIS-1) |
| No lifecycle update in Phase E | Phase E gate: flow-lifecycle → PROMOTED → ACTIVE |
| No bundle version check in Phase E | Phase E gate: bundle version check for B-001/B-002/B-004 |
| DPO triple missing productScope | NEW-E3: productScope: "client-capability" added |
| Prerequisites missing FLOW-00 | Prerequisites: FLOW-00 required (bundle activation before flow runs) |
| Wave assignment missing | FLOW-01 is Wave 0 — sequential, parallel_wave: null |
| STATE.json missing parallel fields | STATE.json: parallel_wave: null, wave: 0 |

All event contracts, artifact numbers, passes 1–7, and test matrix are unchanged.

---

## WAVE ASSIGNMENT

```
FLOW-01: Wave 0 — sequential
  parallel_wave: null
  prerequisite: FLOW-35 + FLOW-36 + FLOW-00 ACTIVE
  downstream: FLOW-02 (Wave 1)
```

STATE.json for FLOW-01 sessions must include:
```json
{
  "flow_id": "FLOW-01",
  "parallel_wave": null,
  "wave": 0
}
```

---

## ARTIFACT NUMBERS (verified, unchanged)

```
Task types:  T47 SSOAndEmailAuth, T48 EmailVerificationWaitState, T49 OnboardingDelivery
Factories:   F174–F181 (8 factories)
BFA rules:   CF-1–CF-8 (verify present, do not re-seed)
Family:      1
New arbiters: routing::auth-security, routing::path-safety,
  processing::pipeline-linearity, processing::wait-state,
  orchestration::gate-event (criticalRules: IR-1),
  orchestration::fan-out-resilience
```

---

[PASSES 1–7 UNCHANGED FROM v5 — see v5 for full content]

All event contracts, client state map, retry/compensation, observability,
E2E test matrix, and genesis prompts are identical to v5.

---

## PHASE A — CONTRACTS + ARBITERS + MODE C FOUNDATIONS (~2.5h)

**All NEW-A1 through NEW-A6 from v5 apply unchanged.**

**Gate (v6 additions marked [NEW v6]):**

```
□ 2 enum entries added: ROUTING, PROCESSING
□ 3 EngineContracts (T47, T48, T49)
□ 6 new arbiters registered
□ DAG JSON seeded to flow-definitions index
□ CF-1–CF-8 verified present (not re-seeded)
□ 12 event schema files in contracts/events/FLOW-01/
□ topology.json with integration boundaries + retry policies + clientStateMap
□ test-matrix.json stub with 11 scenarios
□ dashboard.json with 4 panels
□ Baseline snapshot: FLOW-01-A-baseline.json

[NEW v6 — Addition 3 / D-VIS-2] DRY_RUN passes:
  npm run bootstrap:dry-run -- --flow=FLOW-01
  Assert: DryRunValidationReport.valid = true
  Gate fails if any errors — do not proceed to Phase B

[NEW v6 — Addition 1] Arbiter replay:
  For each of the 6 new arbiters registered this phase:
    run replayArbiterOnBundle against all accepted bundles in same archetype
    Assert: wouldHaveBlocked = false for all promoted bundles
    If wouldHaveBlocked = true: escalate before proceeding to Phase B

[NEW v6 — Addition 4 / D-VIS-4] flow-lifecycle CAS write:
  CAS write: FLOW-01 NOT_STARTED → GENERATED (per tenant)
  If CAS fails: STOP — report conflict, await instruction
  Verify: GET /lifecycle/flows/FLOW-01 returns status=GENERATED

□ npx tsc --noEmit = 0 errors
□ Tests: ≥ 4,066 (entry 4,056 + 10 schema validation tests)
```

---

## PHASES B, C, D — GENERATION LOOPS (unchanged from v5)

All generation loop content, RoundDecision handling, ESCALATE options,
and per-task-type round progressions are identical to v5.

---

## PHASE E — BFA + INTEGRATION GATE (~1.5h)

**All NEW-E1 through NEW-E6 from v5 apply. Gate updated for v6.**

**NEW-E3 updated (v6):**
```
NEW-E3: Training trace export
  After ACCEPT on each of T47, T48, T49:
    DPO triple exported: {
      ftId,                              ← assigned by FLOW-36 Phase B
      taskTypeId,                        ← T47 | T48 | T49
      productScope: "client-capability", ← [NEW v6] explicit scope
      prompt_version, chosen_bundle, rejected_candidates, scores,
      portingCandidate: true
    }
  Assert: 3 DPO triples in training-traces, all with ftId populated (not null)
  Assert: all 3 triples have productScope: "client-capability"
```

**Gate (v6 additions):**

```
□ BFA governance PASS
□ NEW-E1 through NEW-E6 all pass (including updated NEW-E3)
□ Event chain: T47→T48→T49→UserOnboardingCompleted (CF-4)
□ DPO triples: 3 entries, ftId populated, productScope: "client-capability"
□ No PII in any log entry
□ All 11 test matrix scenarios pass

[NEW v6 — Addition 2 / D-VIS-3] test:flow-matrix:
  npm run test:flow-matrix -- --flow=FLOW-01
  Assert: all 11 scenarios pass
  Assert: T005 and T008 (virtualClock: true) ran with clock injection

[NEW v6 — Addition 2] Cross-flow edge tests:
  npm run test:cross-flow (outbound edges from FLOW-01)
  FLOW-01 outbound edges:
    FLOW-01_to_FLOW-02.edge.spec.ts
  Assert: edge test passes OR is a stub (acceptable if FLOW-02 not yet generated)
  Claude Code creates FLOW-01_to_FLOW-02.edge.spec.ts if not already present
  (stub implementation if FLOW-02 not yet ACTIVE)

[NEW v6 — Addition 5 / D-VIS-1] T521 blast radius + 3-case protocol:
  Compute blast radius before promotion
  CASE A (score ≤ threshold): auto-promote → run edge tests → ACTIVE
  CASE B (score > threshold): REGRESSED → EscalationBriefing → ⛔ STOP
  CASE C (no affected flows): ACTIVE immediately

[NEW v6 — bundle version check]:
  FLOW-01 is in bundles: B-001, B-002, B-003, B-004
  For each: verify new FLOW-01 version ≥ bundle.minFlowVersions.FLOW-01
  If any bundle below minimum: emit BundleDegraded (FLOW-00 T-[+2] handles)

[NEW v6 — Addition 4 / D-VIS-4] flow-lifecycle update:
  FLOW-01 → PROMOTED (or TESTING if human gate pending)
  After edge tests pass: FLOW-01 → ACTIVE
  Verify: GET /lifecycle/flows/FLOW-01 returns status=ACTIVE

□ Tests: ≥ 4,096 (entry 4,066 + 30 new tests across phases B–E)
□ FLOW-01-STATE.json saved
```

---

## SK-418 FLOW COMPLETENESS CHECK — 15/15 (unchanged)

All 15 checks pass as in v5. V14 updated:
```
V14 ✅ DPO triple export confirmed in NEW-E3 (3 triples, productScope: "client-capability")
```

---

## KEY FACTS FOR SESSION FILES (updated v6)

```
Artifact numbers: T47–T49, F174–F181, CF-1–CF-8 (unchanged)

Test baseline:
  FLOW-01 entry:    ≥ 4,056 (after FLOW-35 Phase I)
  After Phase A:    ≥ 4,066 (+10)
  After all phases: ≥ 4,096 (+30)

Wave: 0 (sequential — parallel_wave: null)
Outbound edges: FLOW-01 → FLOW-02 (one edge test file)

Bundle membership: B-001, B-002, B-003, B-004
  Bundle version check required in Phase E gate

flow-lifecycle transitions:
  Phase A: NOT_STARTED → GENERATED (CAS)
  Phase E: GENERATED → PROMOTED → ACTIVE

Decisions governing this flow:
  D-VIS-1: blast_radius_promotion_threshold
  D-VIS-2: DRY_RUN required before Phase B
  D-VIS-3: test:flow-matrix required in Phase E
  D-VIS-4: lifecycle tracking at Phase A and E
  D-BUNDLE-2: defaultFreedomConfig additive only

Read before planning: FLOW-EXECUTION-VISIBILITY-PLAN.md
```

---

## SESSION FILES TO PRODUCE (updated v6)

```
FLOW-01-STATE.json               ← parallel_wave: null, wave: 0
SESSION-FLOW-01-A.md             ← [v6] adds DRY_RUN + arbiter replay + lifecycle CAS
SESSION-FLOW-01-B.md             ← SSOAndEmailAuth [T47] (unchanged)
SESSION-FLOW-01-C.md             ← EmailVerification [T48] (unchanged)
SESSION-FLOW-01-D.md             ← OnboardingDelivery [T49] (unchanged)
SESSION-FLOW-01-E.md             ← [v6] adds flow-matrix + cross-flow + lifecycle + bundle check
docs/FLOW-01-REFERENCE.md        ← this document
```

Every SESSION file ends with Phase Completion Package (SK-427).

⛔ STOP — Read FLOW-EXECUTION-VISIBILITY-PLAN.md before planning Phase A.
