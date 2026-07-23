# CLIENT-ARCHITECTURE-SPEC
## Client-Side Architecture for XIIGen Platform Flows
## Tier 3 — Read before planning any user-facing flow session
## Version: v1.0 | Date: 2026-03-20
## Companion to: FLOW-EXECUTION-VISIBILITY-PLAN.md, PARALLEL-EXECUTION-PLAN.md

---

## PURPOSE

Every flow plan documents what the server does. This document specifies what
the client does in parallel — at human timescales, across reconnects, across
app opens, and with optimistic state that may need rollback.

This is the single source of truth for:
- The `useFlow` React hook contract (full shape)
- The offline queue and reconnect protocol
- The client-side state machine lifecycle
- The draft state protocol for multi-step flows
- Background server step → client signal pattern

Flow plans reference this document. They do not duplicate it.
Flow-specific content (which screens, which actions, which steps) lives in
`contracts/topologies/FLOW-XX.topology.json`. Universal client behavior lives here.

---

## 1. THE FUNDAMENTAL ASYMMETRY

```
Server processes T47 SSOAndEmailAuth:      50ms
User experiences email verification:       up to 24 hours

Server processes T99 ReservationHoldGate:  200ms
User experiences checkout form:            2–10 minutes, interruptible

Server processes T75 FeedRebalancer:       6 hours (scheduled)
User experiences feed update:              instant (next scroll)
```

**The server and client are not the same state machine.** The server state
machine has steps that complete in milliseconds. The client state machine
has steps that last hours and must survive app closes, reconnects, and
mid-flow interruptions.

Every flow plan must specify both machines. Pass 3 of the re-examination
algorithm produces the client state map. This document specifies how the
client machine is implemented.

---

## 2. THE `useFlow` HOOK CONTRACT

The React Native + Web client uses a single hook per active flow. This is
the complete return shape — every field is mandatory in the SDK.

```typescript
interface UseFlowResult<TStep extends string, TActions extends string> {

  // ── Server-authoritative state ─────────────────────────────────────────

  flowState: FlowStateSnapshot<TStep> | null
  // null until first FlowStateSnapshot query resolves.
  // Never null after first successful query.
  // Contains: currentStep, sla, completedSteps, availableActions, blockedReason

  sla: {
    deadline: ISO | null        // null if current step has no SLA
    remainingMs: number | null  // countdown in ms; null if no SLA
    isBreached: boolean         // true if now > deadline
  }

  availableActions: TActions[]
  // Actions the server will accept right now (from FlowStateSnapshot).
  // Use to enable/disable buttons — never hardcode this in UI logic.

  // ── Client-optimistic state ────────────────────────────────────────────

  pendingActions: PendingAction<TActions>[]
  // Actions emitted to server but not yet confirmed or rolled back.
  // Use to show "pending" indicators on buttons or list items.
  // Empty array = no in-flight actions.

  optimisticState: Partial<Record<TActions, OptimisticStateEntry>>
  // Current optimistic UI state per action.
  // Entry present = action is in optimistic state (server not yet confirmed).
  // Entry absent = action is in authoritative server state.

  // ── Actions ───────────────────────────────────────────────────────────

  emit: (
    eventType: TActions,
    payload: Record<string, unknown>,
    options?: {
      optimistic?: OptimisticConfig    // if provided: apply immediately
      idempotencyKey?: string          // default: uuid(); set explicitly for retry safety
    }
  ) => Promise<EmitResult>
  // Emits a client event. If optimistic: updates optimisticState immediately,
  // then awaits confirmationEvent or rollbackEvent from server.
  // Returns: { queued: boolean } — true if offline (queued for later)

  query: () => Promise<FlowStateSnapshot<TStep>>
  // Re-fetches FlowStateSnapshot from server.
  // Called automatically on mount and reconnect.
  // Call manually when you need guaranteed-fresh state.

  // ── Connection ────────────────────────────────────────────────────────

  connectionStatus: 'connected' | 'reconnecting' | 'offline'
  // 'connected': WebSocket/SSE live, server events arriving in real time
  // 'reconnecting': connection lost, SDK attempting reconnect with backoff
  // 'offline': device has no network; events queue locally

  queuedEvents: QueuedClientEvent[]
  // Client events waiting to be sent (offline queue).
  // Flushed in order on reconnect.
  // Expose to DevTools overlay; hide in production UI.

  // ── Draft state (multi-step flows only) ──────────────────────────────

  draft: DraftState | null
  // null for single-step flows (most flows).
  // Present for multi-step flows (registration, checkout, listing creation).
  // See Section 4 for full draft protocol.
}
```

### FlowStateSnapshot shape

```typescript
interface FlowStateSnapshot<TStep extends string> {
  flowId: string
  correlationId: string
  tenantId: string
  currentStep: TStep
  sla: { deadline: ISO | null; remainingMs: number | null }
  availableActions: string[]
  completedSteps: TStep[]
  blockedReason: string | null    // non-null when server is waiting for external input
  metadata?: Record<string, unknown>  // flow-specific additions (ticket QR, review status, etc.)
}
```

### OptimisticConfig shape

```typescript
interface OptimisticConfig {
  immediateState: Record<string, unknown>   // what to show NOW (before server responds)
  confirmationEvent: string                 // server event that means "yes, commit"
  rollbackEvent: string                     // server event that means "no, revert"
  rollbackState: Record<string, unknown>    // what to show on rollback
  slaMs?: number                            // if server doesn't respond within this, roll back
                                            // default: 5000ms
}
```

### Rules for `emit`

```
1. If optimistic config provided:
   a. Apply immediateState to optimisticState immediately (synchronous)
   b. Add action to pendingActions
   c. Send event to server
   d. On confirmationEvent: remove from pendingActions, clear optimisticState entry
   e. On rollbackEvent: apply rollbackState, remove from pendingActions

2. If offline (connectionStatus = 'offline'):
   a. Add to queuedEvents (IndexedDB/AsyncStorage for durability)
   b. Return { queued: true }
   c. Do NOT apply optimistic state while offline (server can't confirm)

3. Idempotency: every queued event keeps its idempotencyKey.
   On reconnect, server deduplicates by (correlationId + eventType + idempotencyKey).

4. Ordering: queuedEvents flush in FIFO order on reconnect.
   No parallel flush — one event confirmed before next is sent.
```

---

## 3. OFFLINE QUEUE AND RECONNECT PROTOCOL

### When network is lost

```
connectionStatus → 'offline'
All pending emit() calls return { queued: true }
queuedEvents array grows
optimisticState is NOT updated for queued events
UI shows: connectionStatus indicator (reconnecting banner)
```

### On reconnect

```
Step 1: connectionStatus → 'reconnecting'
Step 2: Restore WebSocket/SSE subscription
Step 3: Call query() → get current FlowStateSnapshot
Step 4: Compare server state with local optimisticState
  - If server already processed an action (step in completedSteps):
    clear corresponding optimisticState entry (server won)
  - If server has not processed it:
    it will be sent in Step 5
Step 5: Flush queuedEvents in FIFO order
  - Each event: send → await confirmation/rollback → next
Step 6: connectionStatus → 'connected'
```

### Per-flow offline queue policy

Each flow's topology.json specifies which client events are queueable:

```json
{
  "offlineQueue": {
    "queueable": ["ResendVerificationRequested", "OnboardingStepCompleted"],
    "notQueueable": ["ChangeEmailRequested"],
    "notQueueableReason": {
      "ChangeEmailRequested": "Email change has irreversible side effects — requires live connection"
    }
  }
}
```

Rules:
- Actions with irreversible side effects → NOT queueable (payment, email change, deletion)
- Actions that are idempotent and low-stakes → queueable (resend, progress save, view tracking)
- Default: NOT queueable (conservative; flow must explicitly opt in)

### Reconnect reconciliation

After reconnect, `query()` may reveal the server processed events that the
client doesn't know about (server state advanced while offline):

```
Client was offline 3 minutes.
Server processed: EmailVerified (user clicked link in email client).
Client reconnects → query() returns currentStep: "onboarding-wizard"
Client optimisticState had: none (was waiting, no optimistic action in flight)
Result: client screen updates to OnboardingWizard — correct, no conflict.

Client was offline 3 minutes.
Client had optimistic: { ResendVerificationRequested: { button: "Sent!", disabled: true } }
Server returned: currentStep: "onboarding-wizard" (email already verified)
Result: clear optimisticState (verification is done), navigate to OnboardingWizard.
```

---

## 4. DRAFT STATE PROTOCOL (MULTI-STEP FLOWS)

Multi-step flows — where the user fills a form across multiple screens over
minutes — require explicit draft state management. Without it, a mid-form
interruption (phone call, app switch) loses user input.

### Which flows require draft state

```
Requires draft state (multi-step, interruptible):
  FLOW-01  registration + onboarding (8 steps)
  FLOW-03  event creation (7 fields across 3 screens)
  FLOW-08  listing creation (title, pricing, media, description)
  FLOW-09  checkout (billing address, payment method, confirmation)
  FLOW-12  subscription setup (plan selection, payment method)
  Any flow where a user fills a form across > 2 screens

Does NOT require draft state (single-step or non-interruptible):
  FLOW-04  QR check-in (instant, < 5s)
  FLOW-07  search (stateless, each query is independent)
  FLOW-10  review submission (single form, < 2 min)
```

### Draft state shape

```typescript
interface DraftState {
  flowId: string
  correlationId: string    // ties draft to the server flow
  currentStep: number      // which step the user was on (1-based)
  totalSteps: number
  completedSteps: number[]
  fieldValues: Record<string, unknown>  // in-progress form fields
  savedAt: ISO             // when this draft was last auto-saved
  expiresAt: ISO           // drafts expire (from FREEDOM config, default 7 days)
  isDirty: boolean         // unsaved changes since last auto-save
}
```

### Draft auto-save rules

```
1. Auto-save triggers on:
   - Every field blur (user leaves a field)
   - Every step completion (user advances)
   - Every 30 seconds while form is active

2. Storage:
   - Primary: AsyncStorage/IndexedDB (survives app close)
   - Key: "draft:{flowId}:{correlationId}:{tenantId}"

3. Expiry:
   - Drafts expire after FREEDOM config `draft_ttl_days` (default: 7)
   - Expired drafts are cleared on app open
   - UI offers "resume draft" or "start fresh" when unexpired draft found

4. Conflict resolution:
   - If server flow has advanced past the draft's step:
     discard draft, let FlowStateSnapshot drive UI
   - If server and draft agree on step: resume from draft
```

### App reopen with draft

```
User fills event creation form to step 3 of 7. Closes app.
App reopens:

1. query() → FlowStateSnapshot
   If server has no record yet (no API call made):
     currentStep: null → offer "resume from draft" or "start fresh"
   If server has partial record (step 1 submitted, steps 2-3 draft only):
     currentStep: "step-1-complete" + draft has steps 2-3 values
     → resume from step 2, pre-fill with draft.fieldValues

2. UI shows "Resume your event draft" banner
3. User taps Resume → load draft.fieldValues into form at draft.currentStep
4. User taps Start Fresh → clear draft, start from step 1
```

---

## 5. BACKGROUND STEP → CLIENT SIGNAL PATTERN

Some server steps run on a schedule or in the background and change what the
user would see — but the user is currently looking at the screen. Silently
mutating live content is bad UX. The correct pattern is a signal.

### Background steps that require client signals

```
FLOW-07  T77 FeedPersonalizationEngine (runs every 6h)
         Feed positions change → user mid-scroll should not see content jump
         Signal: "new content available" banner (pull-to-refresh to apply)

FLOW-12  T-[+2] RecurringBillingEngine (scheduled, monthly)
         Invoice paid or failed → subscription status changes
         Signal: real-time status update via FlowStateSnapshot push

FLOW-09  T107 WaitlistManager (fires when capacity freed)
         User moves from waitlist to confirmed → must be shown immediately
         Signal: push notification + in-app banner ("You're in!")

FLOW-05  T45 GamificationRewardEngine (fires on lesson complete)
         Badge earned while user is on different screen
         Signal: celebration overlay on next screen focus
```

### Signal types

```
TYPE 1 — "New content available" banner
  Use when: server changed ranked/sorted content user is browsing
  Pattern: show non-intrusive banner at top of list
           "New content available — tap to refresh"
           User pulls to refresh OR taps banner → SDK calls query()
  Never: silently reorder content mid-scroll
  Never: auto-scroll user to new position

TYPE 2 — Real-time status push
  Use when: user's own status changes (subscription, waitlist, order)
  Pattern: WebSocket/SSE delivers FlowStateSnapshot update
           SDK updates flowState automatically
           UI reacts to flowState change (no user action needed)
  Examples: "Your ticket is confirmed", "Payment failed"

TYPE 3 — Celebration / achievement overlay
  Use when: a reward event fires (badge, streak, milestone)
  Pattern: overlay appears on next screen focus (not immediately — don't interrupt)
           User dismisses overlay
           Overlay does NOT appear again on subsequent opens
  Storage: "shown:{achievementId}" in AsyncStorage

TYPE 4 — Push notification (out-of-app signal)
  Use when: user is NOT in the app when the event fires
  Pattern: OS push notification → user taps → deep link to relevant screen
           Deep link includes correlationId → SDK calls query() on open
```

### Implementation rule

Every flow plan's Pass 3 (Client State Map) must specify:
- Which server steps run in the background while the user is viewing the flow
- Which signal type applies to each background step
- What the UI shows while the signal is pending (if anything)

---

## 6. CLIENT-SIDE STATE MACHINE LIFECYCLE

The client state machine runs alongside the server flow. It has its own
lifecycle that is NOT identical to the server's.

```
Client lifecycle:
  UNINITIALISED
    → SDK not yet mounted. No FlowStateSnapshot.

  LOADING
    → SDK mounted. query() in flight. UI shows skeleton/loading state.

  ACTIVE
    → FlowStateSnapshot received. User can interact.
    → Transitions between steps as server confirms.

  PENDING_ACTION
    → emit() called with optimistic config.
    → UI in optimistic state. Awaiting confirmation or rollback.

  RECONNECTING
    → WebSocket/SSE lost. connectionStatus = 'reconnecting'.
    → UI shows reconnection banner. Actions may queue.

  OFFLINE
    → Device has no network. connectionStatus = 'offline'.
    → Actions queue. UI shows offline indicator.

  SLA_BREACHED
    → sla.isBreached = true for current step.
    → UI shows expired/timeout screen (per node errorState in topology.json).

  COMPLETED
    → Flow terminal event received (e.g. UserOnboardingCompleted, TicketIssued).
    → SDK deregisters subscriptions.
    → UI navigates to next screen.

  ERROR
    → Unrecoverable error (server returned 5xx on query(), auth expired).
    → UI shows error screen with retry option.
```

### Transition rules

```
Any state → RECONNECTING: on WebSocket/SSE disconnect
RECONNECTING → ACTIVE: on successful reconnect + query() resolves
RECONNECTING → OFFLINE: if reconnect fails after 30s (configurable)
OFFLINE → RECONNECTING: on network restore
ACTIVE → PENDING_ACTION: on any optimistic emit()
PENDING_ACTION → ACTIVE: on confirmation or rollback received
ACTIVE → SLA_BREACHED: when sla.remainingMs reaches 0
ACTIVE → COMPLETED: on terminal event received
Any state → ERROR: on auth expiry or unrecoverable server error
```

---

## 7. PER-FLOW CLIENT TOPOLOGY REQUIREMENTS

Each flow's `contracts/topologies/FLOW-XX.topology.json` must include a
`clientArchitecture` section alongside the existing `clientStateMap`. This
is what Claude Code produces in Phase A:

```json
{
  "flowId": "FLOW-XX",
  "clientStateMap": { ... },

  "clientArchitecture": {
    "requiresDraftState": false,
    "draftSteps": null,

    "backgroundSteps": [
      {
        "serverTask": "T-[+N]",
        "runsWhileUserViews": "FeedScreen",
        "signalType": "new-content-available-banner",
        "signalText": "New content available — pull to refresh"
      }
    ],

    "offlineQueue": {
      "queueable": ["ActionName"],
      "notQueueable": ["OtherAction"],
      "notQueueableReason": {
        "OtherAction": "Has irreversible side effects"
      }
    },

    "useFlowConfig": {
      "subscribeToSteps": ["step-name-1", "step-name-2"],
      "pollIntervalMs": null,
      "realtimeEnabled": true
    }
  }
}
```

---

## 8. ADDITIONS TO PLATFORM-SPEC-CONSOLIDATED.md

When PLATFORM-SPEC-CONSOLIDATED.md is produced (FLOW-35 Phase F deliverable),
Section 5 must include:

```
§5.1  useFlow hook — complete TypeScript contract (from Section 2 above)
§5.2  FlowStateSnapshot — server endpoint specification
§5.3  Offline queue — AsyncStorage/IndexedDB schema, flush protocol
§5.4  Draft state — auto-save rules, expiry, conflict resolution
§5.5  Background signals — four signal types, when to use each
§5.6  Client state machine — lifecycle states and transitions
§5.7  Client topology requirements — clientArchitecture section schema
```

---

## DOCUMENT QUICK-LOOKUP

| I need... | Look in... |
|-----------|-----------|
| useFlow hook full contract | This document §2 |
| Offline queue protocol | This document §3 |
| Draft state rules | This document §4 |
| Background signal types | This document §5 |
| Client lifecycle states | This document §6 |
| Flow-specific client screens | contracts/topologies/FLOW-XX.topology.json |
| Flow-specific offline queue policy | contracts/topologies/FLOW-XX.topology.json → clientArchitecture.offlineQueue |
| Client test scenarios | CLIENT-TESTING-PLAN.md |
| SK-418 client completeness checks | SK-418 v1.2 (V24–V28) |
