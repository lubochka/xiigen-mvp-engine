# CLIENT-ARCHITECTURE-ADDENDUM
## What to Add to Existing Flow Plans to Pass SK-418 V24–V28
## Version: v1.0 | Date: 2026-03-20
## Applies to: FLOW-01 through FLOW-12 (all plans produced before CLIENT-ARCHITECTURE-SPEC.md)

---

## WHAT THIS IS

Every flow plan produced before CLIENT-ARCHITECTURE-SPEC.md already passes
SK-418 V1–V23. This addendum closes V24–V28 for each of those plans.

It is NOT a rewrite. It is a targeted amendment — the same pattern as
FLOW-EXECUTION-VISIBILITY-PLAN.md added gate items to existing plans.

---

## FOR EACH FLOW: THREE ADDITIONS

### Addition 1 — topology.json clientArchitecture section (→ V24)

Add to `contracts/topologies/FLOW-XX.topology.json`:

```json
{
  "clientArchitecture": {
    "requiresDraftState": [true|false],
    "draftSteps": [null | ["step-1-name", "step-2-name", ...]],
    "offlineQueue": {
      "queueable": ["EventName1", "EventName2"],
      "notQueueable": ["EventName3"],
      "notQueueableReason": {
        "EventName3": "Reason why this cannot queue"
      }
    },
    "backgroundSteps": [
      {
        "serverTask": "T-[+N]",
        "runsWhileUserViews": "ScreenName",
        "signalType": "new-content-available-banner|realtime-push|celebration|push-notification",
        "signalText": "Human-readable signal text (for TYPE 1 banners)"
      }
    ]
  }
}
```

### Addition 2 — appReopenBehavior for every DAG node (→ V25)

Each node in clientStateMap must have:
```json
"appReopenBehavior": "query FlowStateSnapshot → [specific behavior]"
```

If the node already has this field: ✅ no change needed.
If missing: add it using the node's humanTimescale and SLA as guidance.

### Addition 3 — Phase E gate client test block (→ V26)

Add to Phase E SESSION file gate section:

```
[CLIENT TESTING — V26] Client integration test suite:
  npm run test:client-integration -- --flow=FLOW-XX

  C1 tests (optimistic state): [N] tests — list each optimistic action
  C2 tests (app reopen): [N] tests — one per DAG node with appReopenBehavior
  C3 tests (offline queue): [N] tests — only if queueable actions defined
  C4 tests (SLA countdown): [N] tests — only if SLA-bearing nodes exist
  C5 tests (draft state): [N] tests — only if requiresDraftState: true

  Expected client test delta: +[total]
  Add to STATE.json: client_test_delta: [total]
```

---

## PER-FLOW ADDENDUM VALUES

### FLOW-01 — User Registration & Onboarding

```
requiresDraftState: false
  (Registration is a single call; onboarding uses completedSteps[] for
   recovery — no form values to resume. V27 passes trivially.)

offlineQueue:
  queueable: ["ResendVerificationRequested"]
    (Idempotent, low-stakes, user can safely retry on reconnect)
  notQueueable: ["ChangeEmailRequested"]
    Reason: "Email change revokes existing token — irreversible, requires live connection"

backgroundSteps: []
  (No background server steps that change visible UI)

Client test delta: +18
  C1: 6 (ResendVerificationRequested × 3 + ChangeEmailRequested non-optimistic × 0 = 6)
  C2: 6 (3 nodes × 2 scenarios each)
  C3: 4 (ResendVerificationRequested queueable)
  C4: 3 (24h SLA on email verification node)
  C5: 0 (no draft)
```

### FLOW-02 — Business Intelligence

```
requiresDraftState: false

offlineQueue:
  queueable: []
  notQueueable: (all form submissions are server-round-trip, no explicit client events)

backgroundSteps:
  - serverTask: "T51 MatchingConvergenceGate" (scheduled, runs after onboarding)
    runsWhileUserViews: "OnboardingWizard or subsequent screens"
    signalType: "realtime-push"
    signalText: null (FlowStateSnapshot push updates currentStep automatically)

Client test delta: +10
  C1: 0 (no optimistic client events in FLOW-02)
  C2: 4 (3 DAG nodes × ~1-2)
  C3: 0
  C4: 0 (no user-facing SLA)
  C5: 0
  Background signal: +6 (TYPE 2 realtime-push test)
```

### FLOW-03 — Event Creation & Promotion

```
requiresDraftState: true
  draftSteps: ["event-details", "event-pricing", "event-media"]
  draftFields: ["title", "description", "date", "location", "capacity",
                "price", "currency", "coverImageUrl"]
  auto-save triggers: ["field-blur", "step-advance", "30s-interval"]
  draft expiry: FREEDOM config draft_ttl_days (default 7)

offlineQueue:
  queueable: ["EventRegistrationRequested"]
  notQueueable: []

backgroundSteps:
  - serverTask: "T61 EventPromotionEngine" (fires after publish)
    runsWhileUserViews: "OrganizerDashboard"
    signalType: "realtime-push"
    signalText: null (EventPromoted → dashboard updates automatically)
  - serverTask: "T62 EventAnalyticsTracker" (TTL-windowed, background)
    runsWhileUserViews: "EventAnalyticsDashboard"
    signalType: "new-content-available-banner"
    signalText: "Analytics updated — pull to refresh"

Client test delta: +28
  C1: 3 (EventRegistrationRequested × 3)
  C2: 5 (3 nodes × ~2)
  C3: 4 (EventRegistrationRequested queueable)
  C4: 0
  C5: 6 (requiresDraftState: true)
  Background signals: +10
```

### FLOW-04 — Event Attendance & Management

```
requiresDraftState: false

offlineQueue:
  queueable: []
  notQueueable: ["RSVPRequested", "CheckInRequested"]
    Reason RSVPRequested: "Capacity decrement — requires live connection to prevent oversell"
    Reason CheckInRequested: "QR token has 60s TTL — cannot queue across disconnect"

backgroundSteps:
  - serverTask: "T66 PostEventFeedbackAggregator" (scheduled, opens 7-day window)
    runsWhileUserViews: "PostEventScreen"
    signalType: "realtime-push"
    signalText: null (FeedbackWindowClosed → screen updates automatically)

Client test delta: +16
  C1: 3 (RSVPRequested free events × 3)
  C2: 6 (5 nodes × ~1-2)
  C3: 0 (no queueable actions)
  C4: 6 (60s QR TTL + 7-day feedback window)
  C5: 0
  Background: +1
```

### FLOW-05 — Lesson Completion & Gamification

```
requiresDraftState: false

offlineQueue:
  queueable: ["LessonCompletionSubmitted"]
    (Evidence payload idempotent via completionId — safe to retry on reconnect)
  notQueueable: []

backgroundSteps:
  - serverTask: "T46 AchievementBroadcaster" (fires after gamification resolves)
    runsWhileUserViews: "Any screen (user may have navigated away)"
    signalType: "celebration"
    signalText: null (overlay on next screen focus)

Client test delta: +16
  C1: 3 (LessonCompletionSubmitted × 3)
  C2: 4 (3 nodes × ~1-2)
  C3: 4 (LessonCompletionSubmitted queueable)
  C4: 0
  C5: 0
  Background (celebration): +5
```

### FLOW-06 — User Groups & Communities

```
requiresDraftState: false
  (GroupJoinRequested is a single tap, not a multi-step form)

offlineQueue:
  queueable: []
  notQueueable: ["GroupJoinRequested", "GroupLeaveRequested"]
    Reason GroupJoinRequested: "Capacity slot — requires live connection"
    Reason GroupLeaveRequested: "Affects member count and content ownership"

backgroundSteps:
  - serverTask: "T74 GroupEngagementTracker" (TTL-windowed, background)
    runsWhileUserViews: "GroupHome or GroupAnalyticsDashboard"
    signalType: "new-content-available-banner"
    signalText: "Engagement stats updated — pull to refresh"

Client test delta: +14
  C1: 3 (GroupJoinRequested public groups × 3)
  C2: 5 (4 nodes × ~1-2)
  C3: 0
  C4: 3 (engagement window TTL)
  C5: 0
  Background: +3
```

### FLOW-07 — Search & Discovery (Social Connections in codebase)

Note: The codebase FLOW-07 is Social Connections (T73–T82). Apply these
values to that flow's topology.

```
requiresDraftState: false

offlineQueue:
  queueable: ["FriendRequestSent" (if optimistic)]
    (Friend request idempotent, retryable — safe to queue)
  notQueueable: []

backgroundSteps:
  - serverTask: "T77 FeedPersonalizationEngine" (scheduled every 6h)
    runsWhileUserViews: "SocialFeedScreen"
    signalType: "new-content-available-banner"
    signalText: "New connections available — pull to refresh"

Client test delta: +15
```

### FLOW-08 — Marketplace Listings (if produced in other session)

```
requiresDraftState: true
  draftSteps: ["listing-details", "listing-pricing", "listing-media"]
  draftFields: ["title", "description", "category", "price", "currency",
                "visibility", "mediaUrls"]

offlineQueue:
  queueable: ["ListingSaveRequested", "ListingViewRecorded"]
  notQueueable: []

backgroundSteps:
  - serverTask: "T80 CatalogIndexer" (background, after publication)
    runsWhileUserViews: "ListingDetail or SellerDashboard"
    signalType: "realtime-push"
    signalText: null (ListingIndexed → search visibility confirmed, UI badge updates)

Client test delta: +25
  C1: 3, C2: 5, C3: 6, C4: 0, C5: 6, Background: +5
```

### FLOW-09 — Transactional Event Participation

```
requiresDraftState: false
  (Checkout is a fast flow — ticket purchase is < 2 min, not resumable mid-step)

offlineQueue:
  queueable: []
  notQueueable: ["TicketPurchaseRequested"]
    Reason: "Payment + capacity — requires live connection, TTL-bounded reservation"

backgroundSteps:
  - serverTask: "T110 RevenueTracker, T111 PayoutOrchestrator" (async, organizer-facing)
    runsWhileUserViews: "OrganizerRevenueDashboard"
    signalType: "realtime-push"
    signalText: null (RevenueRecorded / PayoutCompleted → dashboard updates)
  - serverTask: "T107 WaitlistManager" (fires when capacity freed)
    runsWhileUserViews: "Any screen (user may be away)"
    signalType: "push-notification"
    signalText: "You're off the waitlist! Your ticket is confirmed."

Client test delta: +18
  C1: 3, C2: 6, C3: 0, C4: 3, C5: 0, Background: +6
```

### FLOW-10 — Reviews & Reputation

```
requiresDraftState: false
  (Single review form, typically < 2 min)

offlineQueue:
  queueable: []
  notQueueable: ["ReviewSubmitted", "ReviewResponseSubmitted"]
    Reason ReviewSubmitted: "Eligibility check required live (FLOW-04/09 cross-flow)"
    Reason ReviewResponseSubmitted: "Ownership check required live"

backgroundSteps:
  - serverTask: "T-[+2] ReputationScoreAggregator" (fires after ReviewPublished)
    runsWhileUserViews: "EntityProfile or ListingDetail"
    signalType: "realtime-push"
    signalText: null (ReputationUpdated → star rating updates automatically)

Client test delta: +14
  C1: 3, C2: 5, C3: 0, C4: 2, C5: 0, Background: +4
```

### FLOW-12 — Subscription & Recurring Billing

```
requiresDraftState: true
  draftSteps: ["plan-selection", "payment-method"]
  draftFields: ["selectedPlanId", "paymentMethodToken"]
  NOTE: paymentMethodToken in draft stored as opaque provider token only.
        Never raw card data.
  draft expiry: 24h (shorter than default — payment tokens expire faster)

offlineQueue:
  queueable: []
  notQueueable: ["SubscribeRequested", "SubscriptionCancelRequested"]
    Reason SubscribeRequested: "Payment validation + initial charge — live connection required"
    Reason SubscriptionCancelRequested: "Cancellation effective date calculation requires live state"

backgroundSteps:
  - serverTask: "T-[+2] RecurringBillingEngine" (scheduled monthly)
    runsWhileUserViews: "SubscriptionDashboard"
    signalType: "realtime-push"
    signalText: null (InvoicePaid / InvoicePaymentFailed → status updates automatically)

Client test delta: +22
  C1: 0 (no optimistic client events)
  C2: 6 (5 nodes × ~1-2)
  C3: 0
  C4: 2 (payment-pending SLA)
  C5: 6 (requiresDraftState: true)
  Background: +8 (realtime-push + TYPE 3 considerations)
```

---

## INTEGRATION PROMPT FOR CLAUDE CODE

```
For each flow in FLOW-01 through FLOW-12:

STEP 1: Update contracts/topologies/FLOW-XX.topology.json
  Add clientArchitecture section per per-flow values above.
  Add appReopenBehavior to any DAG node that is missing it.

STEP 2: Add client integration test stub files
  Create client/__tests__/flows/flow-XX/ directory with:
    flow-XX-integration.test.ts (stub, per CLIENT-TESTING-PLAN.md §3)

STEP 3: Note Phase E gate addition
  The next time SESSION-FLOW-XX-E.md is produced, it must include:
    npm run test:client-integration -- --flow=FLOW-XX
  Do NOT add this to already-produced session files — it applies to future sessions.

STEP 4: Install SK-418 v1.2
  cp SK-418-SKILL-v1_2.md .claude/skills/SK-418/SKILL.md
  Archive current version as SKILL-v1_1-archived.md

STEP 5: Install CLIENT-ARCHITECTURE-SPEC.md and CLIENT-TESTING-PLAN.md
  cp CLIENT-ARCHITECTURE-SPEC.md docs/CLIENT-ARCHITECTURE-SPEC.md
  cp CLIENT-TESTING-PLAN.md docs/CLIENT-TESTING-PLAN.md

STEP 6: Update SK-416 Tier 3 document list
  Add:
    Tier 3 (Client architecture — read before planning any user-facing flow):
      - docs/CLIENT-ARCHITECTURE-SPEC.md
      - docs/CLIENT-TESTING-PLAN.md

GATE:
  □ All 12 flow topology.json files have clientArchitecture section
  □ client/__tests__/flows/ directories created for all 12 flows
  □ SK-418 v1.2 installed, v1.1 archived
  □ Both spec documents placed in docs/
  □ SK-416 Tier 3 updated
  □ npm test passes (zero regressions — these are doc + stub changes only)
```
