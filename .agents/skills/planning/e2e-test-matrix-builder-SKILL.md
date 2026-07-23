---
name: e2e-test-matrix-builder
sk: SK-421
description: >
  Builds the complete E2E test matrix for any flow. Covers happy paths,
  edge cases, virtual clock tests for time-based steps, compensation chain
  tests, optimistic UI tests, BFA assertions, and synthetic monitor
  configuration. Use during Pass 6 of the re-examination algorithm.
layer: planning
version: 1.0.0
createdAt: 2026-03-20
requires: [SK-419, SK-420]
complements: [SK-418]
---

# E2ETestMatrixBuilder [SK-421]

## Purpose

The E2E test matrix is the executable specification of a flow's behavior.
It defines what the system must do, not how it does it. This skill ensures
every branch, every time-based step, and every compensation chain has a test
scenario before sessions produce code.

## When AF-4 RAG Retrieves This Skill

- Pass 6 of re-examination algorithm
- "Write the test matrix for FLOW-XX"
- "What tests does T### need?"
- "How do we test the 24h verification timeout?"
- Any flow with EP-2 timers, SCHEDULED archetype, or compensation events

## Pattern

### Test matrix row format

```json
{
  "id": "FLOW-XX-T{NNN}",
  "layer": "component | integration | synthetic",
  "description": "human-readable scenario name",
  "trigger": {
    "type": "http | client_event | virtual_clock | queue_event",
    "method": "POST | GET | DELETE",
    "path": "/api/...",
    "payload": {}
  },
  "steps": [
    { "expect": "EventName", "within_ms": 500 },
    { "client_action": "action_name", "virtual_clock_advance": "5m" },
    { "assert_ui": "ScreenName" },
    { "assert_payload": { "field.path": "expected_value" } },
    { "assert_no_event": "EventThatShouldNotFire" }
  ],
  "assertBFA": ["CF-N"],
  "virtualClock": true | false,
  "assertNoEvent": ["XPAwarded"]
}
```

### Mandatory scenario categories (every flow needs all of these)

**1. Happy path** — minimum complete execution
```
What it verifies: the system works end-to-end in the success case
Structure: trigger → all expected events in sequence → terminal event
Count: 1 per entry point (most flows have 1–3 entry points)
```

**2. Idempotency** — same trigger twice → same result
```
What it verifies: DNA-8 idempotency keys work
Structure: trigger same event twice → assert 1 terminal event, not 2
Count: 1 per service that has F260 idempotency (all transaction/payment flows)
```

**3. Rate limit / quota** — limit+1 requests → rejection
```
What it verifies: T89 rate control and per-service limits
Structure: send (limit) requests → (limit+1)th → assert 429 with Retry-After
Count: 1 for flows with rate-limited entry points
```

**4. Compensation chain** — fail at step N → LIFO unwind
```
What it verifies: saga compensation is complete and in correct order
Structure: succeed through N steps → fail at N+1 → assert N events in reverse
Count: 1 per compensation chain in the flow
Critical: LIFO order is verified, not just "compensation fired"
```

**5. Virtual clock scenarios** — required for ANY time-based step
```
Triggered by: EP-2 timer, SCHEDULED archetype, SLA timeout, TTL
virtualClock: true (required field)
Structure: advance clock past deadline → assert timeout event → assert consequence

Rule: if a task type has SCHEDULED archetype or EP-2 timer,
at least one virtual clock test is MANDATORY.
No exception: you cannot test a 24h timeout in real time.
```

**6. App-reopen / resume** — close app at step N, reopen
```
What it verifies: FlowStateSnapshot returns correct state
Structure: reach step N → advance virtual clock → simulate app reopen
           → assert FlowStateSnapshot.currentStep = correct value
           → assert UI renders correct screen with correct SLA remaining
```

**7. BFA assertions** — cross-flow constraints
```
What it verifies: CF rules are enforced
Structure: complete flow → assert downstream event consumed by correct flow
           OR assert that a prohibited event (e.g. XPAwarded in FLOW-09) never fires
Count: 1 per CF rule that can be exercised from this flow's entry point
```

**8. Security boundary** — wrong tenant / missing auth
```
What it verifies: tenantId isolation, auth enforcement
Structure: request with wrong tenantId → assert DataProcessResult.failure
           OR request without auth → assert 401
```

### Synthetic monitor configuration (Layer 3)

```json
{
  "flowId": "FLOW-XX",
  "syntheticMonitor": {
    "scenario": "FLOW-XX-T001",
    "runIntervalMinutes": 15,
    "expectedMaxDurationMs": 5000,
    "alertOnDeviation": true,
    "tenantId": "synthetic-monitor-tenant"
  }
}
```

The synthetic monitor runs the happy path scenario every 15 minutes
in production. It alerts if the scenario fails or takes longer than expected.
This is the canary that catches production regressions before real users do.

### Virtual clock requirement decision tree

```
Does this flow contain any of:
  □ SCHEDULED archetype (T82, T111, T116, T82)
  □ EP-2 Durable Timer reference
  □ SLA timeout in topology (timeout != "none")
  □ TTL-based token (verification, reservation, checkout)

If YES to any:
  → At least one test row MUST have virtualClock: true
  → The engine virtual clock injection point must be identified
  → Test documents what time advance triggers the expected event

If NO to all:
  → virtualClock: false on all rows (no virtual clock needed)
```

## Positive Example

```
Flow: FLOW-01 — 11 test scenarios

Happy path:          T001 (email registration to onboarding complete)
Happy path:          T009 (SSO registration — skips email verification)
Idempotency:         T006 (concurrent sends → newest token valid)
Rate limit:          T003 (6th registration → 429)
Compensation chain:  T011 (SLA breach → UserRegistrationRolledBack) [virtualClock]
Virtual clock:       T004 (token expires after 25h → "Link expired") [virtualClock]
App reopen:          T008 (app closed at 12h → resumes VerificationWaiting screen) [virtualClock]
BFA assertion:       T010 (UserOnboardingCompleted gates FLOW-02 — CF-4)
Security:            T002 (duplicate email → same response as unknown, IR-4)
Edge case:           T005 (resend rate limit — 4th resend rejected)
Edge case:           T007 (6 partial onboarding combinations → gate never fires)

3 scenarios require virtualClock: true (T004, T008, T011)
```

## Negative Example

```
Flow: FLOW-07 T82 ConnectionStrengthRebalancer (SCHEDULED archetype)

WRONG: No virtual clock test
  → T82 runs every 6 hours
  → Without virtual clock, this cannot be tested in CI
  → Must have: advance clock 6h → assert ConnectionStrengthUpdated

WRONG: Missing compensation test for FLOW-09
  → T101 is the compensation service for participation cancellation
  → Without a compensation chain test, LIFO order is untested
  → Must have: succeed T93+T94+T95+T96 → cancel → assert LIFO order

WRONG: BFA assertion missing for FLOW-09
  → CF-94: FLOW-09 must NOT award XP
  → Without assertNoEvent: ["XPAwarded"], this is never verified
```

## Integration

```
requires:    SK-419 (event contracts — test matrix references event names)
             SK-420 (client-server symmetry — app reopen and optimistic tests)
complements: SK-418 (completeness checker — fills V4, V12, V13)
```

## Test

```
Given: build test matrix for FLOW-08 T91 PoolToSiloMigrationOrchestrator

Expected mandatory scenarios:
  □ Happy path: plan → approve → execute → binding updated → event emitted
  □ Virtual clock: migration saga with drain timeout (virtualClock: true)
  □ Compensation: fail at step 6 → steps 5–1 compensated in reverse
  □ Security: TENANT_MIGRATION_STARTED emitted before data movement
  □ BFA: CF-65 — binding change notifies FLOW-02 (assertBFA: ["CF-65"])

Missing if any of these absent from the matrix.
```
