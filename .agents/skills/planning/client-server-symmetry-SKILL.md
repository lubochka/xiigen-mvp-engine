---
name: client-server-symmetry
sk: SK-420
description: >
  Applies the client perspective to any flow that was designed server-first.
  Identifies the parallel client state machine, the human-timescale experience,
  optimistic UI contracts, and app-reopen recovery for each server step.
  Use during Pass 2 and Pass 3 of the re-examination algorithm.
layer: planning
version: 1.0.0
createdAt: 2026-03-20
requires: [SK-416, SK-419]
complements: [SK-418, SK-421]
---

# ClientServerSymmetry [SK-420]

## Purpose

Every server flow has a parallel client experience. The server processes
steps in milliseconds. The user experiences them over minutes, hours, or days.
These are not the same state machine. This skill surfaces the client state
machine that must exist alongside the server flow.

## When AF-4 RAG Retrieves This Skill

- Pass 2 or Pass 3 of re-examination algorithm
- "What does the user see when..."
- "How does the client handle this step?"
- "App reopen during [flow step]"
- Any discussion of loading states, waiting screens, or UX during a flow

## Pattern

### The fundamental asymmetry

```
Server processes T47 SSOAndEmailAuth:    50ms
User experiences email verification:     up to 24 hours

Server processes T93 ReservationHold:    200ms
User experiences checkout form:          2–10 minutes, interruptible

Server processes T82 Rebalancer:         6 hours (scheduled)
User experiences feed update:            instant (next scroll)
```

For each server step, ask:
1. **What screen does the user see?** (not what the server is doing)
2. **What is the human timescale?** (seconds, minutes, hours, days)
3. **What can the user DO while the server processes?**
4. **What happens if the user closes and reopens the app?**

### Client state map entry (per DAG node)

```json
{
  "nodeId": "awaiting-email-verification",
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
        "optimisticState": { "button": "disabled", "label": "Sent!" },
        "confirmationEvent": "VerificationEmailSent",
        "rollbackEvent": "ResendRateLimited",
        "rollbackState": { "button": "enabled", "label": "Resend",
                           "error": "Too many requests. Try again in {N}s." }
      }
    },
    "appReopenBehavior": "query FlowStateSnapshot → restore to this screen with countdown",
    "errorState": {
      "slaBreached": {
        "screen": "VerificationExpired",
        "availableActions": ["ResendVerificationRequested", "ChangeEmailRequested"]
      }
    }
  }
}
```

### FlowStateSnapshot — the app-reopen contract

Every flow must answer: "what does `useFlow` return when the app reopens?"

```typescript
// Called by React SDK on mount and reconnect
GET /flow/{flowId}/state?correlationId=X&tenantId=Y

Response: {
  flowId: "FLOW-01",
  correlationId: "uuid",
  currentStep: "awaiting-email-verification",  // what the user sees
  sla: { deadline: "ISO", remainingMs: 43200000 },
  availableActions: ["ResendVerificationRequested", "ChangeEmailRequested"],
  completedSteps: ["registration-initiated"],
  blockedReason: null
}
```

The client uses `remainingMs` to drive the countdown timer.
The client uses `currentStep` to render the correct screen.
The client uses `availableActions` to enable/disable buttons.
None of this requires re-triggering the server flow.

### Optimistic UI — the three-part contract

For any action where the user should see instant feedback:

```
1. optimisticState  → what the UI shows immediately (before server responds)
2. confirmationEvent → server event that confirms the action succeeded
3. rollbackEvent    → server event that triggers UI revert (action failed)
```

Rule: an action is optimistic only if:
- The success case is visually simple (button state change, progress bar step)
- The failure case is fully reversible (no data loss, no navigation change)
- The SLA for confirmation is < 3 seconds (user is still on the screen)

Non-optimistic actions (wait for server before updating UI):
- Any payment-related action
- Any action that navigates to a new screen
- Any action with irreversible side effects

### Offline queue

Client events emitted while offline queue in SDK (IndexedDB/AsyncStorage).
On reconnect:
1. Emit queued events in order
2. SDK deduplicates via idempotency key (correlationId + eventType + clientTimestamp)
3. Query FlowStateSnapshot to reconcile optimistic state with server state

## Positive Example

```
Server step: T93 ReservationHoldGate (200ms processing)
Client perspective:

Screen: EventParticipationForm → tap "Register"
Human timescale: user is watching a spinner (2-5 seconds typical)
Available actions during processing: none (blocking UI while reserving)
App reopen if registration started: FlowStateSnapshot shows
  currentStep: "payment-pending" or "reservation-active"
Optimistic: NO — reservation involves capacity decrement, cannot be optimistic

Server step: T101 ParticipationCancellationSaga (may take 30 seconds)
Client perspective:

Screen: CancellationConfirmation
Human timescale: user sees "Cancelling..." spinner (15-30 seconds)
Available actions: none (compensation saga in progress)
Optimistic: NO — involves refund and capacity restore, never optimistic
App reopen: FlowStateSnapshot shows currentStep: "cancellation-in-progress"
  → user sees same cancellation screen, not home screen
```

## Negative Example

```
WRONG: Only documenting server-side behavior
  "T48 validates token and emits EmailVerified"
  → Missing: what does the user see for 24 hours while waiting?
  → Missing: what screen appears on app reopen?
  → Missing: what happens when resend is tapped?

WRONG: Making payment action optimistic
  "Show 'Payment Successful' immediately, confirm with server later"
  → Payment is never optimistic. Server confirmation is required.
  → Optimistic payment creates double-charge risk.

WRONG: Not defining app-reopen behavior
  "The verification screen shows"
  → How? FlowStateSnapshot must be specified.
  → Without it, every app reopen re-triggers T47.
```

## Integration

```
requires:    SK-416 (session startup)
             SK-419 (event contracts — client events need schemas)
complements: SK-418 (completeness checker — fills V7, V8, V11)
             SK-421 (E2E test matrix — client behavior needs tests)
```

## Test

```
Given: Pass 3 for T99 TimedWeightEvolver (SCHEDULED archetype, EP-2 timer)

Expected client perspective:
  - No user-facing screen (T99 runs in background)
  - Human timescale: background process, user unaware
  - Available actions: none directly
  - App reopen: FlowStateSnapshot won't show T99 as current step
    (background steps are transparent to user)
  - The client DOES see the result: feed positions change after T99 completes
  - Client state: "new content available" banner (not a screen)

Key insight: background steps have client effects (feed refresh)
even though they have no client interaction.
```
