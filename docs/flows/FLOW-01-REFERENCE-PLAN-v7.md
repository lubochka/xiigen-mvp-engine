# FLOW-01: USER REGISTRATION & ONBOARDING — REFERENCE PLAN v7
## Mode C / Client Architecture / Session Output complete re-examination
## Updated: 2026-03-20 (v7 — client architecture: V24–V28 added)
## Prerequisites: All infrastructure flows complete + FLOW-35 + FLOW-36 + FLOW-00 complete
## Date: 2026-03-20
## SK-418 FlowCompletenessChecker: 28/28 ✅

---

## WHAT CHANGED FROM v6

| What v6 had | What v7 adds |
|-------------|-------------|
| SK-418: 15/15 (missing V16–V23) | SK-418: 28/28 — V16–V23 visibility + V24–V28 client arch |
| No clientArchitecture in topology | topology.json clientArchitecture section (V24) |
| No appReopenBehavior on all nodes | V25: all 3 nodes have appReopenBehavior (was already present in Pass 3) |
| No client integration tests in Phase E | V26: npm run test:client-integration gate + C1–C4 stubs |
| V27 gap: requiresDraftState not declared | V27: requiresDraftState: false (single-step flow — passes trivially) |
| V28 gap: backgroundSteps not declared | V28: backgroundSteps: [] (no background steps — passes trivially) |

All event contracts, artifact numbers, passes 1–7, test matrix, and
visibility gates V1–V23 are unchanged from v6.

---

## WAVE ASSIGNMENT (unchanged)

```
FLOW-01: Wave 0 — sequential
  parallel_wave: null
  prerequisite: FLOW-35 + FLOW-36 + FLOW-00 ACTIVE
  downstream: FLOW-02 (Wave 1)
```

STATE.json:
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

## PASSES 1–7 (unchanged from v5 — see v5 for full content)

All event contracts (12 schemas), client state map, retry/compensation,
observability, E2E test matrix (11 scenarios), and genesis prompts are
identical to v5. Pass 3 CLIENT STATE MAP below has been updated with
the clientArchitecture addition for V24–V28.

---

## PASS 3 — CLIENT STATE MAP (updated for v7)

**Topology:** `contracts/topologies/FLOW-01.topology.json`

All three DAG nodes are unchanged from v6. The `clientArchitecture`
section below is the v7 addition.

### Node: registration-in-progress (T47 running) — unchanged

```json
{
  "nodeId": "registration-in-progress",
  "serverTask": "T47",
  "clientState": {
    "screen": "RegistrationLoading",
    "humanTimescale": "2–5 seconds",
    "slaMs": 10000,
    "availableActions": [],
    "optimisticActions": {},
    "appReopenBehavior": "query FlowStateSnapshot → if currentStep=registration-in-progress AND stale >30s → show RegistrationFailed screen, offer retry",
    "errorState": {
      "slaBreached": {
        "screen": "RegistrationFailed",
        "availableActions": ["retry-registration"]
      }
    }
  }
}
```

### Node: awaiting-email-verification (T48 running) — unchanged

```json
{
  "nodeId": "awaiting-email-verification",
  "serverTask": "T48",
  "clientState": {
    "screen": "VerificationWaiting",
    "humanTimescale": "up to 24 hours",
    "slaMs": 86400000,
    "availableActions": [
      "ResendVerificationRequested",
      "ChangeEmailRequested"
    ],
    "optimisticActions": {
      "ResendVerificationRequested": {
        "optimisticState": { "button": "disabled", "label": "Email sent!" },
        "confirmationEvent": "VerificationEmailSent",
        "rollbackEvent": "ResendRateLimited",
        "rollbackState": {
          "button": "enabled",
          "label": "Resend email",
          "error": "Too many requests. Try again in {N} minutes."
        }
      }
    },
    "appReopenBehavior": "query FlowStateSnapshot → restore VerificationWaiting screen with remainingMs countdown. If sla.remainingMs ≤ 0 → show VerificationExpired screen",
    "errorState": {
      "slaBreached": {
        "screen": "VerificationExpired",
        "availableActions": ["ResendVerificationRequested", "ChangeEmailRequested"]
      }
    }
  }
}
```

### Node: onboarding-wizard (T49 running) — unchanged

```json
{
  "nodeId": "onboarding-wizard",
  "serverTask": "T49",
  "clientState": {
    "screen": "OnboardingWizard",
    "humanTimescale": "2–15 minutes",
    "slaMs": null,
    "availableActions": ["submit-profile", "submit-questionnaire", "submit-business-data"],
    "optimisticActions": {
      "submit-profile": {
        "optimisticState": { "step": 1, "indicator": "complete" },
        "confirmationEvent": "FlowStateSnapshot.completedSteps includes 'profile'",
        "rollbackEvent": "FlowStateSnapshot.completedSteps does not include 'profile'",
        "rollbackState": { "step": 1, "indicator": "error", "error": "Could not save profile. Try again." }
      }
    },
    "appReopenBehavior": "query FlowStateSnapshot → restore OnboardingWizard at correct step based on completedSteps array. Show completed steps as checked, current step as active.",
    "errorState": {}
  }
}
```

### FlowStateSnapshot contract (unchanged)

```
GET /flow/FLOW-01/state?correlationId={uuid}&tenantId={uuid}

Response:
{
  flowId: "FLOW-01",
  correlationId: "uuid",
  currentStep: "awaiting-email-verification",
  sla: { deadline: "2026-03-21T10:00:00Z", remainingMs: 43200000 },
  availableActions: ["ResendVerificationRequested", "ChangeEmailRequested"],
  completedSteps: ["registration-in-progress"],
  blockedReason: null
}
```

### clientArchitecture section [NEW v7 — V24–V28]

Add to `contracts/topologies/FLOW-01.topology.json` root object:

```json
"clientArchitecture": {
  "requiresDraftState": false,
  "draftSteps": null,
  "offlineQueue": {
    "queueable": ["ResendVerificationRequested"],
    "notQueueable": ["ChangeEmailRequested"],
    "notQueueableReason": {
      "ChangeEmailRequested": "Email change revokes existing token — irreversible side effect, requires live connection"
    }
  },
  "backgroundSteps": []
}
```

**Why ResendVerificationRequested is queueable:**
Idempotent (same token resent), low-stakes (user taps Resend, goes offline
briefly, reconnects — replay is safe). The server deduplicates via
correlationId + clientTimestamp.

**Why ChangeEmailRequested is NOT queueable:**
Has irreversible side effects: old token is revoked immediately on receipt.
A queued ChangeEmailRequested replaying hours later after reconnect would
revoke a token the user may have already verified. Requires live connection.

**Why backgroundSteps is empty:**
All server tasks in FLOW-01 run synchronously in response to user actions.
T47, T48, T49 do not run on a schedule or in the background while the
user is viewing the app. No background signals needed.

---

## PHASE A — CONTRACTS + ARBITERS + MODE C FOUNDATIONS (~2.5h)

**All NEW-A1 through NEW-A6 from v5 apply unchanged.**

**Gate (v6 items marked [v6], v7 additions marked [NEW v7]):**

```
□ 2 enum entries added: ROUTING, PROCESSING
□ 3 EngineContracts (T47, T48, T49)
□ 6 new arbiters registered
□ DAG JSON seeded
□ CF-1–CF-8 verified present
□ 12 event schema files in contracts/events/FLOW-01/
□ topology.json with integration boundaries + retry policies + clientStateMap
□ test-matrix.json stub with 11 scenarios
□ dashboard.json with 4 panels
□ Baseline snapshot: FLOW-01-A-baseline.json

[v6 — D-VIS-2] DRY_RUN:
  npm run bootstrap:dry-run -- --flow=FLOW-01
  Assert: DryRunValidationReport.valid = true

[v6 — Addition 1] Arbiter replay:
  For each of 6 new arbiters:
    replayArbiterOnBundle against accepted bundles in same archetype
    Assert: wouldHaveBlocked = false

[v6 — D-VIS-4] Lifecycle CAS:
  CAS write: FLOW-01 NOT_STARTED → GENERATED (per tenant)
  If CAS fails: STOP

[NEW v7 — V24] topology.json clientArchitecture section written:
  requiresDraftState: false
  offlineQueue.queueable: ["ResendVerificationRequested"]
  offlineQueue.notQueueable: ["ChangeEmailRequested"] with reason
  backgroundSteps: []
  Validate JSON: python3 -c "import json; json.load(open('contracts/topologies/FLOW-01.topology.json'))"

[NEW v7 — V26] Create client test stub:
  mkdir -p client/__tests__/flows/flow-01
  Create client/__tests__/flows/flow-01/flow-01-integration.test.ts
  (see Session Files section for stub content)

□ npx tsc --noEmit = 0 errors
□ Tests: ≥ 4,066 (entry 4,056 + 10 schema validation tests)
```

---

## PHASES B, C, D — GENERATION LOOPS (unchanged from v6)

All generation loop content, RoundDecision handling, and ESCALATE options
are identical to v6.

---

## PHASE E — BFA + INTEGRATION GATE (~1.5h)

**All NEW-E1 through NEW-E6 from v5 apply. V16–V23 gates from v6 apply.**

**Gate (v7 additions marked [NEW v7]):**

```
□ BFA governance PASS
□ NEW-E1 through NEW-E6 all pass
□ Event chain: T47→T48→T49→UserOnboardingCompleted (CF-4)
□ DPO triples: 3 entries, ftId populated, productScope: "client-capability"
□ No PII in any log entry
□ All 11 test matrix scenarios pass

[v6 — D-VIS-3] test:flow-matrix:
  npm run test:flow-matrix -- --flow=FLOW-01
  All 11 scenarios pass (T005, T008 virtualClock)

[v6 — cross-flow edge tests]:
  npm run test:cross-flow
  FLOW-01_to_FLOW-02.edge.spec.ts present (stub acceptable if FLOW-02 not yet ACTIVE)

[v6 — D-VIS-1] T521 blast radius + 3-case protocol

[v6 — SK-436] Bundle version check:
  FLOW-01 in bundles: B-001, B-002, B-003, B-004

[v6 — D-VIS-4] Lifecycle: FLOW-01 → PROMOTED → ACTIVE

[NEW v7 — V26] Client integration tests:
  npm run test:client-integration -- --flow=FLOW-01

  C1 tests (optimistic state — 6 tests):
    ResendVerificationRequested × 3 (C1-1 immediate state, C1-3 rollback, C1-4 SLA breach)
    submit-profile optimistic × 3 (C1-1, C1-3, C1-4)
  C2 tests (app reopen — 6 tests):
    registration-in-progress: 2 scenarios
    awaiting-email-verification: 2 scenarios (active + SLA breached)
    onboarding-wizard: 2 scenarios (mid-step, completed steps restore)
  C3 tests (offline queue — 4 tests):
    ResendVerificationRequested queued while offline
    Queued event flushed on reconnect in FIFO order
    Expired SLA event dropped on reconnect (not replayed)
    Non-queueable ChangeEmailRequested rejected immediately when offline
  C4 tests (SLA countdown — 3 tests):
    Email verification countdown: remainingMs decrements correctly
    SLA breach at T+24h+1s → VerificationExpired screen
    App reopen after breach → breach state shown (not pre-breach)
  C5: N/A (requiresDraftState: false)

  Expected client test delta: +19
  Add to STATE.json: "client_test_delta": 19

□ Tests: ≥ 4,096 (entry 4,066 + 30 server tests)
□ Client test delta: +19 (all C1–C4, it.todo() stubs pass trivially)
□ FLOW-01-STATE.json saved
```

---

## SK-418 FLOW COMPLETENESS CHECK — 28/28 ✅

```
V1  ✅ All 7 passes complete
V2  ✅ 12 schemas in contracts/events/FLOW-01/
V3  ✅ contracts/topologies/FLOW-01.topology.json with clientStateMap + clientArchitecture
V4  ✅ contracts/tests/FLOW-01.test-matrix.json with 11 scenarios
V5  ✅ infrastructure/monitoring/FLOW-01-dashboard.json (4 panels)
V6  ✅ docs/runbooks/FLOW-01-runbook.md (debug CLI timeline, alerts)
V7  ✅ Client events: ResendVerificationRequested + ChangeEmailRequested identified
    ChangeEmailRequested explicitly NOT optimistic — documented with reason
V8  ✅ All 3 genesis prompts have Mode C CONSUMES/EMITS/BOUNDARY sections
V9  ✅ Phase A includes NEW-A1 through NEW-A6
    Phase E gate includes NEW-E1 through NEW-E6
V10 ✅ FlowStateSnapshot: GET /flow/FLOW-01/state with remainingMs countdown
V11 ✅ ResendVerificationRequested has 3-part optimistic contract
    ChangeEmailRequested explicitly NOT optimistic with reason
V12 ✅ T005 (25h token expiry), T008 (12h app reopen) — virtualClock: true
V13 ✅ LIFO compensation chain: UserOnboardingAborted → VerificationEmailRevoked
    → UserRegistrationRolledBack
V14 ✅ DPO triples: 3, ftId populated, productScope: "client-capability"
V15 ✅ No factory interface types in event schemas
V16 ✅ Wave 0, parallel_wave: null declared in plan and STATE.json
V17 ✅ DRY_RUN in Phase A gate (D-VIS-2)
V18 ✅ Arbiter replay for 6 new arbiters in Phase A gate
V19 ✅ Lifecycle CAS write NOT_STARTED → GENERATED in Phase A gate
V20 ✅ test:flow-matrix in Phase E gate (D-VIS-3)
    T005, T008 virtualClock scenarios explicitly called out
V21 ✅ FLOW-01_to_FLOW-02.edge.spec.ts named (stub or real)
V22 ✅ 3-case blast radius protocol (CASE A/B/C) in Phase E gate
V23 ✅ Lifecycle PROMOTED → ACTIVE + B-001/B-002/B-003/B-004 bundle check

V24 ✅ topology.json clientArchitecture section:
    requiresDraftState: false
    offlineQueue.queueable: ["ResendVerificationRequested"]
    offlineQueue.notQueueable: ["ChangeEmailRequested"] with reason
    backgroundSteps: []

V25 ✅ appReopenBehavior on ALL 3 DAG nodes:
    registration-in-progress: stale >30s → RegistrationFailed + retry
    awaiting-email-verification: restore countdown + SLA breach → VerificationExpired
    onboarding-wizard: restore step from completedSteps[]

V26 ✅ Phase E gate includes client integration tests:
    npm run test:client-integration -- --flow=FLOW-01
    C1: 6 tests, C2: 6 tests, C3: 4 tests, C4: 3 tests, C5: N/A
    Expected client test delta: +19
    STATE.json: client_test_delta: 19

V27 ✅ requiresDraftState: false — V27 passes trivially
    FLOW-01 registration is a single trigger (POST /auth/register)
    Onboarding uses completedSteps[] from FlowStateSnapshot for recovery
    No form values need to persist across app closes

V28 ✅ backgroundSteps: [] — V28 passes trivially
    T47, T48, T49 all run in direct response to user actions or events
    No scheduled or background tasks change visible UI in FLOW-01
```

---

## KEY FACTS FOR SESSION FILES (updated v7)

```
Artifact numbers: T47–T49, F174–F181, CF-1–CF-8 (unchanged)

Test baseline:
  FLOW-01 entry:    ≥ 4,056 (after FLOW-35 Phase I)
  After Phase A:    ≥ 4,066 (+10 schema validation tests)
  After all phases: ≥ 4,096 (+30 server tests)
  Client delta:     +19 (C1–C4 stub tests, it.todo() — counted separately)

Wave: 0 (sequential — parallel_wave: null)
Outbound edges: FLOW-01 → FLOW-02 (one edge test file)
Bundle membership: B-001, B-002, B-003, B-004

flow-lifecycle:
  Phase A: NOT_STARTED → GENERATED (CAS)
  Phase E: GENERATED → PROMOTED → ACTIVE

Client architecture (V24–V28):
  requiresDraftState: false
  queueable: ResendVerificationRequested
  notQueueable: ChangeEmailRequested (reason: irreversible token revoke)
  backgroundSteps: none
  Client test delta: +19 (C1:6, C2:6, C3:4, C4:3, C5:0)

Read before planning:
  FLOW-EXECUTION-VISIBILITY-PLAN.md (V16–V23 gates)
  CLIENT-ARCHITECTURE-SPEC.md (V24–V28 gates)
  CLIENT-ARCHITECTURE-ADDENDUM.md (FLOW-01 per-flow values)
```

---

## SESSION FILES TO PRODUCE (updated v7)

```
FLOW-01-STATE.json               ← parallel_wave: null, wave: 0,
                                    client_test_delta: 19

SESSION-FLOW-01-A.md             ← [v6] DRY_RUN + arbiter replay + lifecycle CAS
                                    [v7] topology.json clientArchitecture + test stub creation

SESSION-FLOW-01-B.md             ← SSOAndEmailAuth [T47] (unchanged)
SESSION-FLOW-01-C.md             ← EmailVerification [T48] (unchanged)
SESSION-FLOW-01-D.md             ← OnboardingDelivery [T49] (unchanged)

SESSION-FLOW-01-E.md             ← [v6] flow-matrix + cross-flow + lifecycle + bundle
                                    [v7] V26 client integration tests gate:
                                         npm run test:client-integration -- --flow=FLOW-01
                                         C1–C4 stub implementations (it.todo → real tests)
                                         client_test_delta: 19 in EXECUTION-LOG

docs/FLOW-01-REFERENCE.md        ← this document
```

### Client test stub (produced in Phase A)

File: `client/__tests__/flows/flow-01/flow-01-integration.test.ts`

```typescript
/**
 * FLOW-01 Client Integration Tests
 * Categories: C1 (optimistic), C2 (app reopen), C3 (offline queue), C4 (SLA)
 * Expected delta: +19
 * See docs/CLIENT-TESTING-PLAN.md for category definitions.
 * See docs/CLIENT-ARCHITECTURE-SPEC.md for MockFlowProvider / MockFlowServer API.
 * STUBS — implement during SESSION-FLOW-01-E.md execution.
 */

describe('FLOW-01 Client Integration', () => {

  // C1 — Optimistic state (6 tests)
  describe('C1: Optimistic actions', () => {
    it.todo('ResendVerificationRequested: button shows "Email sent!" immediately on tap');
    it.todo('ResendVerificationRequested: button reverts on ResendRateLimited');
    it.todo('ResendVerificationRequested: SLA breach (5s no server response) → rollback');
    it.todo('submit-profile: step indicator shows complete immediately');
    it.todo('submit-profile: indicator reverts on FlowStateSnapshot profile not in completedSteps');
    it.todo('submit-profile: SLA breach → rollback to error state');
  });

  // C2 — App reopen (6 tests)
  describe('C2: App reopen behavior', () => {
    it.todo('registration-in-progress: stale >30s → RegistrationFailed screen');
    it.todo('registration-in-progress: fresh → RegistrationLoading screen');
    it.todo('awaiting-email-verification: countdown restored from sla.remainingMs');
    it.todo('awaiting-email-verification: sla.isBreached = true → VerificationExpired screen');
    it.todo('onboarding-wizard: restores at correct step from completedSteps[]');
    it.todo('onboarding-wizard: completed steps shown as checked');
  });

  // C3 — Offline queue (4 tests)
  describe('C3: Offline queue', () => {
    it.todo('ResendVerificationRequested: queued when connectionStatus = offline');
    it.todo('ResendVerificationRequested: queued event flushed in order on reconnect');
    it.todo('ChangeEmailRequested: rejected immediately when offline (not-queueable)');
    it.todo('reconnect after SLA breach: expired queued events dropped, not replayed');
  });

  // C4 — SLA countdown (3 tests)
  describe('C4: SLA bearing nodes', () => {
    it.todo('awaiting-email-verification: countdown visible, decrements from sla.remainingMs');
    it.todo('awaiting-email-verification: at T+24h+1s sla.isBreached = true');
    it.todo('awaiting-email-verification: sla.isBreached triggers VerificationExpired UI');
  });

  // C5 — N/A (requiresDraftState: false)

});
```

Every SESSION file ends with Phase Completion Package (SK-427 v1.1).

⛔ STOP — Read CLIENT-ARCHITECTURE-SPEC.md before Phase A.
