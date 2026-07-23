# CLIENT-TESTING-PLAN
## Client-Side Test Infrastructure for XIIGen Platform Flows
## Tier 3 — Read before planning Phase E of any user-facing flow
## Version: v1.0 | Date: 2026-03-20
## Companion to: CLIENT-ARCHITECTURE-SPEC.md, FLOW-EXECUTION-VISIBILITY-PLAN.md

---

## PURPOSE

The existing test matrices (T001–T013 etc.) test the server from the outside:
send event X, expect event Y within N ms. They do not test the client.

Client tests are fundamentally different:

```
Server test:  "POST /register → expect UserRegistrationInitiated within 500ms"
Client test:  "Button tapped → spinner appears → connection lost →
               reconnect → spinner resolves correctly"

Server test:  "PaymentFailed event emitted → RefundOrchestrator triggered"
Client test:  "Payment screen shows → user sees 'Processing...' → PaymentFailed arrives →
               button reverts to 'Try Again' → error message appears — not error screen"
```

This document specifies the test infrastructure, mandatory client test
categories, and the test gate that must pass in Phase E of every user-facing flow.

---

## 1. TEST INFRASTRUCTURE

### Three test layers

```
LAYER 1 — Unit tests (Jest + React Native Testing Library)
  Scope: individual components, hooks, optimistic state transitions
  Mocking: useFlow hook mocked via MockFlowProvider
  Speed: < 2s per test file
  Gate: existing npm test suite (already counted in test deltas)

LAYER 2 — Integration tests (Jest + MockFlowServer)
  Scope: full client state machine across a flow scenario
  Mocking: MockFlowServer intercepts WebSocket + REST, allows scripted responses
  Speed: 5–30s per scenario
  Gate: npm run test:client-integration -- --flow=FLOW-XX
  NEW — added to Phase E gate by this plan

LAYER 3 — E2E device tests (Detox for React Native, Cypress for web)
  Scope: pixel-level UI verification, actual device interactions
  When: pre-release only — too slow for CI gate
  Gate: npm run test:e2e (manual trigger, not in Phase E gate)
```

### MockFlowProvider (unit testing)

```typescript
// Wraps component under test with controlled flow state
<MockFlowProvider
  flowId="FLOW-01"
  initialState={{
    currentStep: "awaiting-email-verification",
    sla: { remainingMs: 43200000, isBreached: false },
    availableActions: ["ResendVerificationRequested"]
  }}
  connectionStatus="connected"
>
  <VerificationWaitingScreen />
</MockFlowProvider>

// Control state transitions in test
const { dispatch } = useMockFlow();
dispatch({ type: "SERVER_EVENT", event: "ResendRateLimited" });
// → expect rollback state to appear
```

### MockFlowServer (integration testing)

```typescript
// Scripts the server's responses to client events
const server = new MockFlowServer("FLOW-01");

server.on("ResendVerificationRequested", async (event) => {
  await delay(200);
  return { emit: "VerificationEmailSent" };
});

server.on("ChangeEmailRequested", async (event) => {
  await delay(100);
  return { emit: "VerificationEmailRevoked" };
});

// Simulate connection loss mid-scenario
server.simulateDisconnect({ after: 500, reconnectAfter: 3000 });
```

### File locations

```
client/__tests__/flows/flow-01/
  flow-01-unit.test.tsx           ← MockFlowProvider unit tests
  flow-01-integration.test.ts     ← MockFlowServer integration tests
  flow-01-offline.test.ts         ← offline queue + reconnect scenarios
  flow-01-draft.test.ts           ← draft state (if flow requires draft)

server/test/flow-01/              ← existing server tests (unchanged)
  ...
```

---

## 2. MANDATORY CLIENT TEST CATEGORIES

Every user-facing flow must have tests in these 5 categories. This is what
V24–V28 in SK-418 v1.2 validate.

### CATEGORY C1 — Optimistic state transitions

For every optimistic action defined in Pass 3:

```
C1-1: Action emitted → optimisticState applied immediately (< 1 frame)
C1-2: confirmationEvent received → optimisticState cleared, server state shown
C1-3: rollbackEvent received → rollbackState applied, error shown
C1-4: Optimistic SLA breached (server doesn't respond in time) → rollback applied

Example (FLOW-03 EventRegistrationRequested):
  C1-1: tap Register → button shows "Registering..." immediately
  C1-2: AttendeeRegistered received → button shows "Registered ✓"
  C1-3: RegistrationFailed received → button reverts to "Register", error shown
  C1-4: no response within 5s → rollback to "Register" with "Try again" hint
```

### CATEGORY C2 — App reopen / reconnect recovery

For every DAG node in Pass 3 with a defined appReopenBehavior:

```
C2-1: App closed at step X → reopen → query() called → correct screen shown
C2-2: App closed at step X with pending optimistic action →
      reopen → server has confirmed → committed state shown (not optimistic)
C2-3: App closed at step X with pending optimistic action →
      reopen → server has rejected → rollback state shown
C2-4: App closed at step X → network unavailable on reopen →
      offline state shown correctly, not blank/crash

Example (FLOW-01 awaiting-email-verification):
  C2-1: close at VerificationWaiting → reopen → VerificationWaiting shown
        with countdown (sla.remainingMs correctly populated)
  C2-2: close while ResendVerificationRequested optimistic →
        reopen → VerificationEmailSent already confirmed → button in neutral state
```

### CATEGORY C3 — Offline queue and flush

For every flow with at least one queueable action (per topology.json):

```
C3-1: Go offline → emit queueable action → queuedEvents has 1 entry
C3-2: Go offline → emit queueable action → reconnect → event flushed in order
C3-3: Go offline → emit 3 actions → reconnect → all 3 flushed FIFO
C3-4: Go offline → emit queueable action → emit non-queueable action →
      non-queueable rejected immediately, queueable queued
C3-5: Flush on reconnect → server confirms → queuedEvents cleared
C3-6: Flush on reconnect → server rejects → rollbackState applied

Example (FLOW-01 ResendVerificationRequested is queueable):
  C3-1: network off → tap Resend → queuedEvents.length = 1
  C3-2: network restores → ResendVerificationRequested sent → VerificationEmailSent received
```

### CATEGORY C4 — SLA countdown and breach

For every node with a non-null SLA:

```
C4-1: sla.remainingMs countdown decrements correctly in UI (timer)
C4-2: sla.remainingMs reaches 0 → clientState transitions to SLA_BREACHED
C4-3: SLA_BREACHED → correct error screen shown (per node errorState in topology)
C4-4: App reopen after SLA breach → breach state shown (not pre-breach state)

Example (FLOW-01 email verification, 24h SLA):
  C4-1: VerificationWaiting shows countdown decremented from initial sla.remainingMs
  C4-2: virtualClock advance to T+24h+1s → VerificationExpired screen shown
  C4-3: VerificationExpired has ResendVerificationRequested and ChangeEmailRequested buttons
```

### CATEGORY C5 — Draft state (multi-step flows only)

Only for flows where `requiresDraftState: true` in topology clientArchitecture:

```
C5-1: Fill step 1 → close app → reopen → draft found → resume offer shown
C5-2: Resume from draft → form pre-filled with saved field values
C5-3: Start fresh from draft → form starts empty, draft cleared
C5-4: Draft auto-saves on field blur (saved timestamp updates)
C5-5: Draft expires after TTL → reopen shows start-fresh (no resume offer)
C5-6: Server flow advanced past draft step → draft discarded, server state drives UI

Example (FLOW-03 event creation, 7-step form):
  C5-1: fill title + category in step 1 → close app → reopen →
        banner shows "Resume your event draft"
  C5-2: tap Resume → step 1 form pre-filled with title + category from draft
```

---

## 3. THE CLIENT INTEGRATION TEST FILE PATTERN

Every flow's Phase A produces this file as a stub. Phase E gate requires it to pass.

```typescript
// client/__tests__/flows/flow-XX/flow-XX-integration.test.ts

describe("FLOW-XX client integration", () => {

  // ── C1 Optimistic state ──────────────────────────────────────────────

  describe("C1 optimistic state transitions", () => {
    it("C1-1: [ActionName] applied immediately to optimisticState", async () => {
      const server = new MockFlowServer("FLOW-XX");
      server.on("[ActionName]", () => delay(500)); // slow server
      const { result } = renderHook(() => useFlow("FLOW-XX", { correlationId, tenantId }));

      act(() => result.current.emit("[ActionName]", payload, { optimistic: config }));

      // Optimistic state applied BEFORE server responds
      expect(result.current.optimisticState["[ActionName]"]).toEqual(config.immediateState);
    });

    it("C1-3: [ActionName] rollback on [rollbackEvent]", async () => {
      const server = new MockFlowServer("FLOW-XX");
      server.on("[ActionName]", () => ({ emit: "[rollbackEvent]" }));
      // ... test rollback state applied
    });

    it("C1-4: [ActionName] rollback on SLA breach (5s no response)", async () => {
      const server = new MockFlowServer("FLOW-XX");
      server.on("[ActionName]", () => delay(6000)); // never responds in time
      jest.useFakeTimers();
      // ... test rollback after 5s
    });
  });

  // ── C2 App reopen ────────────────────────────────────────────────────

  describe("C2 app reopen recovery", () => {
    it("C2-1: reopen at [stepName] → correct screen", async () => {
      const server = new MockFlowServer("FLOW-XX");
      server.setSnapshot({
        currentStep: "[stepName]",
        sla: { remainingMs: 43200000 },
        availableActions: ["[ActionName]"]
      });
      const { result } = renderHook(() => useFlow("FLOW-XX", { correlationId, tenantId }));
      await waitFor(() => expect(result.current.flowState?.currentStep).toBe("[stepName]"));
    });
  });

  // ── C3 Offline queue ─────────────────────────────────────────────────

  describe("C3 offline queue", () => {
    it("C3-1: queueable action queued when offline", async () => {
      const { result } = renderHook(() => useFlow("FLOW-XX", { correlationId, tenantId }));
      act(() => result.current._setConnectionStatus("offline")); // test helper
      const emitResult = await result.current.emit("[QueueableAction]", payload);
      expect(emitResult.queued).toBe(true);
      expect(result.current.queuedEvents).toHaveLength(1);
    });

    it("C3-2: queued action flushed on reconnect", async () => {
      // ... test flush in order
    });
  });

  // ── C4 SLA countdown ─────────────────────────────────────────────────

  describe("C4 SLA countdown and breach", () => {
    it("C4-2: SLA breach transitions to SLA_BREACHED", async () => {
      jest.useFakeTimers();
      const server = new MockFlowServer("FLOW-XX");
      server.setSnapshot({ currentStep: "[slaStep]", sla: { remainingMs: 1000 } });
      const { result } = renderHook(() => useFlow("FLOW-XX", { correlationId, tenantId }));

      jest.advanceTimersByTime(1001);
      expect(result.current.sla.isBreached).toBe(true);
    });
  });

  // ── C5 Draft state (if applicable) ──────────────────────────────────
  // Omit this block if requiresDraftState: false in topology.json

  describe("C5 draft state", () => {
    it("C5-1: draft persists across app close/reopen", async () => {
      // fill fields → simulate app close → create new hook instance →
      // draft found, resume offered
    });
  });

});
```

---

## 4. PHASE E GATE ADDITIONS

When this plan is integrated, every user-facing flow Phase E gate gains:

```
[NEW — CLIENT TESTING] Client integration test suite:
  npm run test:client-integration -- --flow=FLOW-XX

  Assert: all C1 tests pass (optimistic state transitions)
  Assert: all C2 tests pass (app reopen recovery for all DAG nodes)
  Assert: all C3 tests pass (if any queueable actions defined)
  Assert: all C4 tests pass (if any SLA-bearing nodes)
  Assert: all C5 tests pass (if requiresDraftState: true)

  Counts:
    C1: min 3 tests per optimistic action (C1-1 / C1-3 / C1-4)
    C2: min 1 test per DAG node with appReopenBehavior
    C3: C3-1 and C3-2 mandatory if any queueable actions exist
    C4: C4-2 mandatory if any SLA-bearing node exists
    C5: all 6 tests mandatory if requiresDraftState: true
```

---

## 5. BACKGROUND STEP TEST PATTERN

For flows with background server steps that signal the client (Section 5 of
CLIENT-ARCHITECTURE-SPEC.md):

```
[NEW — BACKGROUND SIGNALS] Background step → client signal test:
  For each backgroundStep in topology.clientArchitecture.backgroundSteps:

  TYPE 1 (new-content-available-banner):
    Test: server emits background step event while client is on relevant screen
    Assert: "new content available" banner appears
    Assert: content list is NOT silently reordered
    Assert: pull-to-refresh triggers query() and list updates

  TYPE 2 (real-time status push):
    Test: server emits status change event (FlowStateSnapshot push)
    Assert: flowState.currentStep updates without user action
    Assert: UI screen changes automatically to reflect new step

  TYPE 3 (celebration overlay):
    Test: achievement event emitted while user is on different screen
    Assert: overlay does NOT interrupt current screen
    Assert: overlay appears on next screen focus
    Assert: overlay does NOT re-appear on subsequent focus (AsyncStorage flag)
```

---

## 6. CLIENT TEST DELTA ACCOUNTING

Client integration tests add to the test delta. Include them in flow delta estimates:

```
Typical client test additions per flow:

  C1 tests: 3 per optimistic action × number of actions
            FLOW-01 has 2 optimistic actions → ~6 C1 tests
            FLOW-09 has 1 optimistic action  → ~3 C1 tests

  C2 tests: 1–2 per DAG node with appReopenBehavior
            FLOW-01 has 3 nodes → ~5 C2 tests

  C3 tests: 4–6 total if queueable actions exist

  C4 tests: 2–3 total per SLA-bearing node

  C5 tests: 6 total if draft required (FLOW-03, FLOW-08, FLOW-12)

Typical total per flow: +15 to +30 client integration tests
Add these to the flow's expected delta in STATE.json and Phase E gate.
```

---

## 7. WHAT EACH SESSION FILE MUST INCLUDE

### Phase A additions (new)

```
□ client/__tests__/flows/FLOW-XX/ directory created with stub files
□ topology.json includes clientArchitecture section:
  - requiresDraftState: true/false
  - offlineQueue.queueable[] and notQueueable[] specified
  - backgroundSteps[] specified (empty array if none)
□ MockFlowServer stub for this flow configured in test helpers
```

### Phase E additions (new)

```
□ All client integration tests pass:
  npm run test:client-integration -- --flow=FLOW-XX
□ Delta includes client test count:
  EXECUTION-LOG-E.json: client_test_delta field added
□ PHASE-COMPLETE-E.md includes client test summary:
  "C1: 6/6 ✅, C2: 5/5 ✅, C3: 4/4 ✅, C4: 2/2 ✅, C5: N/A"
```

---

## DOCUMENT QUICK-LOOKUP

| I need... | Look in... |
|-----------|-----------|
| useFlow hook contract | CLIENT-ARCHITECTURE-SPEC.md §2 |
| MockFlowProvider usage | This document §1 |
| Which test categories are mandatory | This document §2 |
| Integration test file template | This document §3 |
| Phase E gate items for client tests | This document §4 |
| Background signal test patterns | This document §5 |
| How to count client test delta | This document §6 |
| SK-418 client checks V24–V28 | SK-418 SKILL.md v1.2 |
