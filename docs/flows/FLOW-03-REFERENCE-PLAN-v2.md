# FLOW-03: EVENT CREATION & PROMOTION — REFERENCE PLAN v2
## Mode C / Client Architecture / Session Output — V24–V28 client architecture added
## Updated: 2026-03-20 (v2 — adds V24–V28: draft state, offline queue, background signals, client tests)
## Date: 2026-03-20
## Prerequisites: FLOW-02 ACTIVE + FLOW-35 + FLOW-36 + FLOW-00 complete
## SK-418 FlowCompletenessChecker: 28/28 ✅ (v1.2)

---


## WHAT CHANGED FROM v1

| What v1 had | What v2 adds |
|-------------|-------------|
| SK-418: 23/23 (v1.1) | SK-418: 28/28 (v1.2 — V24–V28 client architecture) |
| No clientArchitecture in topology | topology.json clientArchitecture + draftSpec + backgroundSignals |
| No draft state spec | draftSpec: requiresDraftState: true (3-step event creation form) |
| No offline queue spec | offlineQueue: EventRegistrationRequested queueable |
| No background signal spec | T61 realtime-push, T62 new-content-available-banner |
| No client integration tests | Phase E: npm run test:client-integration, +28 client tests |
| STATE.json missing client_test_delta | STATE.json: client_test_delta: 28 |

All event contracts, artifact numbers, passes 1–7, test matrix, and
visibility gates V1–V23 are unchanged from v1.

---
## WHAT THIS FLOW BUILDS

After FLOW-03, tenants can:

1. Create events with full metadata (title, description, date, location, capacity)
2. Manage event visibility and attendee registration
3. Promote events through the platform feed and recommendations
4. Track event analytics (registrations, views, conversions)

```
[T59] EventCreationOrchestrator
  ↓ EventCreated (triggers feed distribution)
[T60] EventRegistrationManager
  ↓ AttendeeRegistered / RegistrationClosed
[T61] EventPromotionEngine
  ↓ EventPromoted / PromotionReached
[T62] EventAnalyticsTracker
  ↓ EventAnalyticsUpdated (rolling counters, live dashboard)
```

**Gate dependency:** FLOW-03 is gated by FLOW-02's `OnboardingCompleted`
(CF-4). The personalized feed (FLOW-02 T51) populates the events context
that powers EventPromotionEngine recommendations.

---

## WAVE ASSIGNMENT

```
FLOW-03: Wave 2 — parallel
  parallel_wave: 2
  wave: 2
  wave_baseline_entry: [read from pre-allocation session — set before Phase A]
  prerequisite: FLOW-02 status = ACTIVE in flow-lifecycle index
  downstream: FLOW-09 (Transactional Event Participation — Wave 3)
```

**Critical (SK-434):** Before Phase A, verify FLOW-02 is ACTIVE and read
pre-allocated artifact ranges from the parallel_execution table in STATE-v4.
Do NOT query live boundaries.

STATE.json for FLOW-03 sessions:
```json
{
  "flow_id": "FLOW-03",
  "parallel_wave": 2,
  "wave": 2,
  "wave_baseline_entry": "__SET_BY_PRE_ALLOCATION_SESSION__",
  "prerequisite": "FLOW-02",
  "client_test_delta": 28,
  "pre_allocated_ranges": {
    "T": "T59–T62",
    "F": "F197–F204",
    "Family": "verify from parallel_execution table",
    "CF": "verify from parallel_execution table"
  }
}
```

---

## ARTIFACT NUMBERS

```
Task types:  T59 EventCreationOrchestrator
             T60 EventRegistrationManager
             T61 EventPromotionEngine
             T62 EventAnalyticsTracker
Factories:   F197–F204 (8 factories — see factory interfaces below)
BFA rules:   verify CF range from parallel_execution table (do not re-seed if present)
Family:      verify from parallel_execution table
New archetypes: REGISTRATION (T60), PROMOTION (T61), ANALYTICS (T62)
  T59 uses ORCHESTRATION (existing)
New arbiters:   registration::capacity-safety, registration::idempotent-attendee,
                promotion::reach-threshold, promotion::content-safety,
                analytics::counter-accuracy, analytics::ttl-enforcement
```

---

## FACTORY INTERFACES (F197–F204)

```
F197  IEventService              INJECTABLE — event CRUD, metadata, status
F198  IEventRegistrationService  INJECTABLE — attendee management, capacity
F199  IEventPromotionService     INJECTABLE — promotion rules, targeting
F200  IEventAnalyticsService     INJECTABLE — counters, dashboards, exports
F201  IEventMediaService         INJECTABLE — cover images, attachments
F202  IEventNotificationService  INJECTABLE — reminders, updates to attendees
F203  IEventCategoryService      INJECTABLE — taxonomy, discovery filters
F204  IAuditTrailService         PLATFORM-ONLY — immutable audit (same as FLOW-01)
```

**Integration boundary:** All 7 domain factories are INJECTABLE. F204 is
PLATFORM-ONLY (security constraint — reuse from FLOW-01 registration).

---

## PASS 1 — EVENT CONTRACT EXTRACTION

**10 schema files in `contracts/events/FLOW-03/`**

### Server events (7)

```
EventCreated.schema.json
  source: "server" | trigger: T59 after validation
  data: { eventId, tenantId, creatorId, title, scheduledAt: ISO,
          capacity: number|null, locationId: string|null }
  SLA: emit within 5s of API call → feed distribution triggered

EventPublished.schema.json
  source: "server" | trigger: T59 status change → PUBLISHED
  data: { eventId, tenantId, publishedAt: ISO, visibility: "public"|"connections"|"private" }

AttendeeRegistered.schema.json
  source: "server" | trigger: T60 successful registration
  data: { eventId, tenantId, attendeeId, registeredAt: ISO, position: number }
  NOTE: position = slot number (1-based). Capacity check before write.

RegistrationClosed.schema.json
  source: "server" | trigger: T60 when capacity reached
  data: { eventId, tenantId, closedAt: ISO, finalCount: number }
  TERMINAL — no re-opening without EventCapacityUpdated

EventPromoted.schema.json
  source: "server" | trigger: T61 promotion approved
  data: { eventId, tenantId, promotionId, targetAudience: string[], startAt: ISO }

PromotionReached.schema.json
  source: "server" | trigger: T61 reach threshold crossed
  data: { eventId, tenantId, promotionId, reachedAt: ISO, viewCount: number }

EventAnalyticsUpdated.schema.json
  source: "server" | trigger: T62 counter increment (batched, TTL-windowed)
  data: { eventId, tenantId, windowStart: ISO, windowEnd: ISO,
          views: number, registrations: number, promotionClicks: number }
  NOTE: TTL windowed — never unbounded accumulation (CF rule)
```

### Compensation events (2)

```
RegistrationCancelled.schema.json
  source: "server" | trigger: attendee cancels or T60 compensates
  data: { eventId, tenantId, attendeeId, cancelledAt: ISO, reason: string }
  NOTE: slot freed immediately — next waitlist attendee promoted if present

EventCancelledByOrganizer.schema.json
  source: "server" | trigger: creator cancels published event
  data: { eventId, tenantId, cancelledAt: ISO, reason: string }
  → triggers RegistrationCancelled fan-out for all attendees (via QUEUE FABRIC)
```

### Client events (1)

```
EventRegistrationRequested.schema.json
  source: "client"
  EXTRA REQUIRED: sessionId (uuid), clientTimestamp (ISO)
  data: { eventId, tenantId }
  Optimistic contract:
    optimisticState: { button: "disabled", label: "Registering..." }
    confirmationEvent: AttendeeRegistered
    rollbackEvent: RegistrationFailed
    rollbackState: { button: "enabled", label: "Register", error: "..." }
  NOTE: payment events (if applicable) handled by FLOW-08 — not here
```

**Three required fields on ALL 10 schemas:**
```
correlationId, tenantId, traceparent
```

**PII rule:** No attendee PII in event payloads. attendeeId is the only
identifier. Names/emails never appear in events — downstream consumes
IUserProfileService.

---

## PASS 2 — CLIENT EVENT IDENTIFICATION

```
Step: Event creation form (T59 executing)
  Duration: 5–30 seconds
  Actions: NONE while creating — blocking
  Client events: none

Step: Event detail page — pre-registration
  Duration: browsing time
  Actions: EventRegistrationRequested (tap "Register" button)
  Optimistic: button → "Registering..." (see schema above)

Step: Event detail page — registered
  Duration: until event date
  Actions: cancel registration (RegistrationCancelled)
  NOTE: cancellation is NOT optimistic — capacity slot implications

Step: Organizer dashboard
  Actions: publish, cancel, update capacity (server-side, not client events)
```

**Integration boundary per factory:**
```
F197 IEventService:             INJECTABLE
F198 IEventRegistrationService: INJECTABLE
F199 IEventPromotionService:    INJECTABLE
F200 IEventAnalyticsService:    INJECTABLE
F201 IEventMediaService:        INJECTABLE
F202 IEventNotificationService: INJECTABLE
F203 IEventCategoryService:     INJECTABLE
F204 IAuditTrailService:        PLATFORM-ONLY
```

---

## PASS 3 — CLIENT STATE MAP

**Topology:** `contracts/topologies/FLOW-03.topology.json`

### Node: event-creation (T59 executing)

```json
{
  "nodeId": "event-creation",
  "serverTask": "T59",
  "clientState": {
    "screen": "EventCreationForm",
    "humanTimescale": "5–30 seconds",
    "slaMs": 30000,
    "availableActions": [],
    "appReopenBehavior": "query FlowStateSnapshot → if PENDING > 30s → show creation failed, offer retry"
  }
}
```

### Node: event-registration-open (T60 running, capacity available)

```json
{
  "nodeId": "event-registration-open",
  "serverTask": "T60",
  "clientState": {
    "screen": "EventDetail",
    "humanTimescale": "minutes to days",
    "slaMs": null,
    "availableActions": ["EventRegistrationRequested"],
    "optimisticActions": {
      "EventRegistrationRequested": {
        "optimisticState": { "button": "disabled", "label": "Registering..." },
        "confirmationEvent": "AttendeeRegistered",
        "rollbackEvent": "RegistrationFailed",
        "rollbackState": { "button": "enabled", "label": "Register",
                          "error": "Could not complete registration. Try again." }
      }
    },
    "appReopenBehavior": "query FlowStateSnapshot → show correct registration status and remaining capacity"
  }
}
```

### Node: event-registration-full (capacity reached)

```json
{
  "nodeId": "event-registration-full",
  "serverTask": "T60",
  "clientState": {
    "screen": "EventDetail",
    "availableActions": [],
    "note": "Register button hidden or shows 'Full'. Waitlist if enabled.",
    "appReopenBehavior": "FlowStateSnapshot.currentStep = event-registration-full → hide Register button"
  }
}
```

### FlowStateSnapshot contract

```
GET /flow/FLOW-03/state?eventId={uuid}&tenantId={uuid}

Response:
{
  flowId: "FLOW-03",
  eventId: "uuid",
  currentStep: "event-registration-open" | "event-registration-full" | "event-cancelled",
  registrationStatus: "not-registered" | "registered" | "waitlisted",
  capacity: { total: number|null, registered: number, remaining: number|null },
  availableActions: ["EventRegistrationRequested"] | [],
  sla: null
}
```


### clientArchitecture section [NEW v2 — V24–V28]

Add to `contracts/topologies/FLOW-03.topology.json` root object:

```json
"clientArchitecture": {
  "requiresDraftState": true,
  "draftSteps": ["event-details", "event-pricing", "event-media"],
  "draftFields": ["title", "description", "date", "location", "capacity",
                  "price", "currency", "coverImageUrl"],
  "autoSaveTriggers": ["field-blur", "step-advance", "30s-interval"],
  "draftTtlDays": "__FREEDOM_CONFIG_draft_ttl_days__",
  "draftTtlDefault": 7,
  "offlineQueue": {
    "queueable": ["EventRegistrationRequested"],
    "notQueueable": [],
    "notQueueableReason": {}
  },
  "backgroundSteps": [
    {
      "serverTask": "T61",
      "runsWhileUserViews": "OrganizerDashboard",
      "signalType": "realtime-push",
      "signalText": null,
      "note": "EventPromoted → organizer dashboard updates promotion status automatically"
    },
    {
      "serverTask": "T62",
      "runsWhileUserViews": "EventAnalyticsDashboard",
      "signalType": "new-content-available-banner",
      "signalText": "Analytics updated — pull to refresh",
      "silentMutationPermitted": false
    }
  ]
},
"draftSpec": {
  "steps": [
    {
      "stepId": "event-details",
      "fields": ["title", "description", "date", "location"],
      "serverSideEffect": false
    },
    {
      "stepId": "event-pricing",
      "fields": ["price", "currency", "capacity"],
      "serverSideEffect": false
    },
    {
      "stepId": "event-media",
      "fields": ["coverImageUrl"],
      "serverSideEffect": false
    }
  ],
  "abandonedSessionHandling": {
    "onTTLExpiry": "discard-draft",
    "onServerSideEffectPresent": "show-recovery-prompt",
    "recoveryPromptText": "You have an unfinished event. Continue or discard?"
  }
}
```

**Why requiresDraftState: true:**
Event creation is a 3-step form (details → pricing → media). Users frequently
interrupt creation mid-flow. All 3 steps have `serverSideEffect: false` — no
capacity holds or payment intents are created during draft. DraftAbandonedWithEffect
is NOT needed (no compensation required on abandonment). Draft is simply discarded
on TTL expiry with an optional recovery prompt on next app open.

**Why EventRegistrationRequested is queueable:**
Idempotent: same attendee + same event = same registration. Safe to queue and
replay on reconnect. Server deduplicates via correlationId.

**Why T62 analytics banner is NOT silentMutationPermitted:**
Analytics dashboard data is visible while user is viewing it. Silent mutation
of live counters confuses users ("the number just changed"). Banner lets user
decide when to refresh.

**Why T61 promotion is realtime-push (silentMutationPermitted implicitly):**
EventPromoted status appears in a dedicated dashboard field, not mid-scroll
content. Silent update of a status badge is acceptable.

---

## PASS 4 — RETRY AND COMPENSATION

```
T59 EventCreationOrchestrator retry:
  sla: { timeout: "30s" from FREEDOM config }
  retryPolicy: { owner: "execution-unit", maxAttempts: 2 }
  onMaxRetries: EventCreationFailed → client shows error

T60 EventRegistrationManager:
  Capacity race: T60 uses optimistic lock on capacity counter.
    If slot taken between check and write → RegistrationFailed
    Client rollback: Register button re-enabled
  LIFO compensation: RegistrationCancelled (release slot) → nothing further
    (EventCreated is not reversed — event still exists)

T61 EventPromotionEngine retry:
  sla: { timeout from FREEDOM config }
  onFailure: promotion deferred, not failed. EventPromotionDeferred emitted.

T62 EventAnalyticsTracker:
  No retry — counters are additive, TTL-windowed.
  Failure: window skipped, gap logged. No compensation needed.
```

**LIFO compensation for organizer cancellation:**
```
Step 3 (if reached): RegistrationCancelled fan-out (all attendees)
Step 2 (if reached): EventPromoted cancelled (stop active promotions)
Step 1: EventCancelledByOrganizer emitted
```

---

## PASS 5 — OBSERVABILITY

**Files:** `infrastructure/monitoring/FLOW-03-dashboard.json`,
`docs/runbooks/FLOW-03-runbook.md`

### Grafana dashboard (4 panels)

```
Panel 1 — Event lifecycle funnel:
  EventCreated → EventPublished → first AttendeeRegistered → RegistrationClosed
  Alert: EventPublished with zero registrations after 48h

Panel 2 — Registration rate and capacity:
  Registration rate per event (registrations/hour)
  Capacity fill percentage distribution
  Alert: capacity race errors > 5% of registration attempts

Panel 3 — Promotion performance:
  EventPromoted count vs PromotionReached count (conversion)
  Alert: promotion reach < 10% of target audience after 24h

Panel 4 — Tenant health:
  Per-tenant event creation rate, registration success rate
  Alert: any tenant with > 20% registration failures in 1h
```

---

## PASS 6 — E2E TEST MATRIX

**File:** `contracts/tests/FLOW-03.test-matrix.json`
**12 scenarios, 1 with virtualClock: true**

```json
[
  {
    "id": "FLOW-03-T001",
    "description": "Happy path: create → publish → register → analytics updated",
    "trigger": { "type": "http", "method": "POST", "path": "/events" },
    "steps": [
      { "expect": "EventCreated", "within_ms": 5000 },
      { "expect": "EventPublished", "within_ms": 3000 },
      { "client_action": "register_for_event" },
      { "expect": "AttendeeRegistered", "within_ms": 2000 },
      { "expect": "EventAnalyticsUpdated", "within_ms": 10000 }
    ],
    "virtualClock": false
  },
  {
    "id": "FLOW-03-T002",
    "description": "Capacity race: two simultaneous registrations for last slot → one succeeds, one fails",
    "trigger": { "type": "http", "method": "POST", "path": "/events/register", "concurrent": 2 },
    "steps": [
      { "expect_count": { "event": "AttendeeRegistered", "count": 1 } },
      { "expect_count": { "event": "RegistrationFailed", "count": 1 } },
      { "assert": "capacity.registered = capacity.total" }
    ],
    "virtualClock": false
  },
  {
    "id": "FLOW-03-T003",
    "description": "Registration rollback: client optimistic state reverts on RegistrationFailed",
    "trigger": { "type": "client_event", "event": "EventRegistrationRequested", "inject": "capacity_full" },
    "steps": [
      { "assert_no_event": "AttendeeRegistered" },
      { "expect": "RegistrationFailed", "within_ms": 3000 },
      { "assert_ui": "rollback Register button to enabled state" }
    ],
    "virtualClock": false
  },
  {
    "id": "FLOW-03-T004",
    "description": "Organizer cancels event → all attendees receive RegistrationCancelled",
    "trigger": { "type": "http", "method": "DELETE", "path": "/events/{eventId}" },
    "steps": [
      { "expect": "EventCancelledByOrganizer", "within_ms": 3000 },
      { "expect_count": { "event": "RegistrationCancelled",
          "count": "__attendee_count__", "within_ms": 30000 } }
    ],
    "virtualClock": false
  },
  {
    "id": "FLOW-03-T005",
    "description": "Promotion engine: EventPromoted → PromotionReached when view threshold crossed",
    "trigger": { "type": "http", "method": "POST", "path": "/events/{eventId}/promote" },
    "steps": [
      { "expect": "EventPromoted", "within_ms": 5000 },
      { "simulate_views": 1000 },
      { "expect": "PromotionReached", "within_ms": 5000 }
    ],
    "virtualClock": false
  },
  {
    "id": "FLOW-03-T006",
    "description": "Analytics TTL: old analytics window is not unbounded (TTL enforced)",
    "trigger": { "type": "http", "method": "GET", "path": "/events/{eventId}/analytics" },
    "steps": [
      { "virtual_clock_advance": "8h" },
      { "assert": "no analytics window older than TTL config remains active" }
    ],
    "virtualClock": true
  },
  {
    "id": "FLOW-03-T007",
    "description": "Tenant isolation: Event from tenant-A not visible to tenant-B",
    "trigger": { "type": "http", "method": "POST", "path": "/events",
                 "headers": { "X-Tenant-Id": "tenant-A" } },
    "steps": [
      { "expect": "EventCreated", "tenant": "tenant-A" },
      { "assert_not_visible": { "tenant": "tenant-B", "event_id": "__created__" } }
    ],
    "virtualClock": false
  },
  {
    "id": "FLOW-03-T008",
    "description": "BFA gate: FLOW-03 only runs after FLOW-02 OnboardingCompleted",
    "trigger": { "type": "lifecycle_check" },
    "steps": [
      { "assert": "GET /lifecycle/flows/FLOW-02 returns status=ACTIVE" }
    ],
    "assertBFA": ["CF-4"],
    "virtualClock": false
  },
  {
    "id": "FLOW-03-T009",
    "description": "App reopen: user reopens app mid-registration → FlowStateSnapshot restores correct state",
    "trigger": { "type": "client_event", "event": "EventRegistrationRequested" },
    "steps": [
      { "expect": "AttendeeRegistered", "within_ms": 3000 },
      { "client_action": "close_and_reopen_app" },
      { "assert_ui": "EventDetail shows registered status" },
      { "assert_payload": { "registrationStatus": "registered" } }
    ],
    "virtualClock": false
  },
  {
    "id": "FLOW-03-T010",
    "description": "Security: no PII in any event payload",
    "trigger": { "type": "http", "method": "POST", "path": "/events/register" },
    "steps": [
      { "expect": "AttendeeRegistered" },
      { "assert_no_pii_in_event": "AttendeeRegistered" }
    ],
    "virtualClock": false
  },
  {
    "id": "FLOW-03-T011",
    "description": "DPO triple: ACCEPT produces training trace with ftId and productScope",
    "trigger": { "type": "generation_accept", "taskType": "T59" },
    "steps": [
      { "assert_payload": { "productScope": "client-capability",
          "ftId": { "not_null": true }, "portingCandidate": true } }
    ],
    "virtualClock": false
  },
  {
    "id": "FLOW-03-T012",
    "description": "Edge test: FLOW-02→FLOW-03 boundary — OnboardingCompleted gates FLOW-03",
    "trigger": { "type": "queue_event", "event": "OnboardingCompleted" },
    "steps": [
      { "assert": "FLOW-03 event creation endpoint is reachable after OnboardingCompleted" }
    ],
    "assertBFA": ["CF-4"],
    "virtualClock": false
  }
]
```

---

## PASS 7 — GENESIS PROMPTS (Mode C)

### `flow-03::T59::genesis`

```
TASK: Generate bundle for EventCreationOrchestrator [T59]
ARCHETYPE: ORCHESTRATION | DOMAIN: event-management
FACTORIES: F197 (IEventService), F201 (IEventMediaService),
           F202 (IEventNotificationService), F203 (IEventCategoryService),
           F204 (IAuditTrailService — PLATFORM-ONLY)
ENTRY: POST /events

BUNDLE = 4 files: event-creation.service.ts + 3 test files

TASK-SPECIFIC IRON RULES:
  IR-1: EventCreated emits BEFORE any downstream queue work
  IR-2: capacity: null = unlimited (not zero)
  IR-3: tenantId isolation — event never visible across tenants

MODE C EVENT CONTRACTS:
  CONSUMES: [none — entry point, triggered by HTTP]
  EMITS: EventCreated, EventPublished, EventCancelledByOrganizer
  INTEGRATION BOUNDARY:
    F197 IEventService: INJECTABLE
    F204 IAuditTrailService: PLATFORM-ONLY
```

### `flow-03::T60::genesis`

```
TASK: Generate bundle for EventRegistrationManager [T60]
ARCHETYPE: REGISTRATION | DOMAIN: event-management
FACTORIES: F197 (IEventService), F198 (IEventRegistrationService),
           F202 (IEventNotificationService), F204 (IAuditTrailService)
ENTRY: EventCreated (QUEUE FABRIC — not direct HTTP call)

BUNDLE = 4 files: event-registration.service.ts + 3 test files

TASK-SPECIFIC IRON RULES:
  IR-1: capacity check + register = one atomic operation (optimistic lock)
  IR-2: RegistrationFailed emitted on any failure — never silent
  IR-3: attendeeId only — never name/email in events

MODE C EVENT CONTRACTS:
  CONSUMES: EventCreated, EventRegistrationRequested (client event)
  EMITS: AttendeeRegistered, RegistrationClosed, RegistrationFailed,
         RegistrationCancelled
  INTEGRATION BOUNDARY:
    F198 IEventRegistrationService: INJECTABLE
    F204 IAuditTrailService: PLATFORM-ONLY
```

### `flow-03::T61::genesis`

```
TASK: Generate bundle for EventPromotionEngine [T61]
ARCHETYPE: PROMOTION | DOMAIN: event-management
FACTORIES: F199 (IEventPromotionService), F200 (IEventAnalyticsService),
           F203 (IEventCategoryService)
ENTRY: EventPublished (QUEUE FABRIC)

BUNDLE = 4 files: event-promotion.service.ts + 3 test files

TASK-SPECIFIC IRON RULES:
  IR-1: promotion target audience from FREEDOM config — never hardcoded
  IR-2: content safety check before promotion approved
  IR-3: PromotionReached threshold from FREEDOM config

MODE C EVENT CONTRACTS:
  CONSUMES: EventPublished
  EMITS: EventPromoted, PromotionReached, EventPromotionDeferred
```

### `flow-03::T62::genesis`

```
TASK: Generate bundle for EventAnalyticsTracker [T62]
ARCHETYPE: ANALYTICS | DOMAIN: event-management
FACTORIES: F200 (IEventAnalyticsService)
ENTRY: AttendeeRegistered, PromotionReached, EventPublished (QUEUE FABRIC)

BUNDLE = 4 files: event-analytics.service.ts + 3 test files

TASK-SPECIFIC IRON RULES:
  IR-1: counters are TTL-windowed — never unbounded accumulation
  IR-2: EventAnalyticsUpdated is idempotent per eventId + windowStart
  IR-3: analytics data scoped to tenantId — no cross-tenant aggregation

MODE C EVENT CONTRACTS:
  CONSUMES: AttendeeRegistered, PromotionReached, EventPublished, RegistrationCancelled
  EMITS: EventAnalyticsUpdated
  NOTE: FlowStateSnapshot for analytics: GET /flow/FLOW-03/analytics?eventId=...
```

---

## PHASE A — CONTRACTS + ARBITERS + FOUNDATIONS (~2.5h)

**Gate:**

```
□ 3 enum entries added: REGISTRATION, PROMOTION, ANALYTICS
□ 4 EngineContracts (T59, T60, T61, T62)
□ 6 new arbiters registered:
    registration::capacity-safety, registration::idempotent-attendee,
    promotion::reach-threshold, promotion::content-safety,
    analytics::counter-accuracy, analytics::ttl-enforcement
□ DAG JSON seeded to flow-definitions index (FLOW-03-event-pipeline.json)
□ CF range from parallel_execution table seeded (verify not re-seeding)
□ 10 event schema files in contracts/events/FLOW-03/
□ contracts/topologies/FLOW-03.topology.json with clientStateMap
□ contracts/tests/FLOW-03.test-matrix.json stub with 12 scenarios
□ infrastructure/monitoring/FLOW-03-dashboard.json with 4 panels
□ docs/runbooks/FLOW-03-runbook.md stub

[NEW — SK-434 parallel prerequisite check]:
  GET /lifecycle/flows/FLOW-02 → status must be ACTIVE
  If not ACTIVE: STOP — FLOW-02 has not completed

[NEW — pre-allocated ranges]:
  Read T59–T62, F197–F204 from parallel_execution table in STATE-v4.json
  Do NOT query live boundaries (D-PARALLEL-1)

[NEW — D-VIS-2 DRY_RUN]:
  npm run bootstrap:dry-run -- --flow=FLOW-03
  Assert: DryRunValidationReport.valid = true

[NEW — Addition 1 arbiter replay]:
  For each of the 6 new arbiters:
    replayArbiterOnBundle against accepted bundles in same archetype
    Assert: wouldHaveBlocked = false

[NEW — D-VIS-4 lifecycle CAS]:
  CAS write: FLOW-03 NOT_STARTED → GENERATED (expectedCurrentStatus = "NOT_STARTED")
  If { success: false }: STOP — another instance claimed this flow


[NEW v2 — V24] topology.json clientArchitecture + draftSpec written:
  requiresDraftState: true, 3 draft steps (no serverSideEffect on any step)
  offlineQueue.queueable: ["EventRegistrationRequested"]
  backgroundSteps: [T61 realtime-push, T62 new-content-available-banner]
  Validate JSON: python3 -c "import json; json.load(open('contracts/topologies/FLOW-03.topology.json'))"

[NEW v2 — V26] Create client test stub:
  mkdir -p client/__tests__/flows/flow-03
  Create client/__tests__/flows/flow-03/flow-03-integration.test.ts
  (see Session Files section for stub content)

□ npx tsc --noEmit = 0 errors
□ Tests: wave_baseline_entry + 10 (delta gate — not absolute)
```

---

## PHASES B, C, D — GENERATION LOOPS

### FLOW-03-B: EventCreationOrchestrator [T59] (~3h)
Branch: `flow/flow-03/event-creation-T59`
Engine: 3 models × registry.getForArchetype(ORCHESTRATION) arbiters
RoundDecision drives: ACCEPT/RETRY/ESCALATE
Gate: ACCEPT, compiles, IR-1 EventCreated-before-queue verified

### FLOW-03-C: EventRegistrationManager [T60] (~3h)
Branch: `flow/flow-03/event-registration-T60`
Engine: 3 models × registry.getForArchetype(REGISTRATION) — new archetype, first round
Key risk: models will attempt sequential capacity check+register; arbiter
  registration::capacity-safety checks for atomic operation
Gate: ACCEPT, compiles, capacity race test passes, optimistic lock verified

### FLOW-03-D: EventPromotionEngine + EventAnalyticsTracker [T61+T62] (~3h)
Branch: `flow/flow-03/event-promotion-analytics-T61-T62`
Engine: PROMOTION archetype (T61), ANALYTICS archetype (T62)
Gate: ACCEPT on both, TTL window enforcement verified, analytics idempotency tested

---

## PHASE E — BFA + INTEGRATION GATE (~1.5h)

**Gate:**

```
□ BFA governance PASS
□ NEW-E1: Export/import round-trip (FlowBundle = schemas only)
□ NEW-E2: Multi-language smoke test (TypeScript vs Python event sequence)
□ NEW-E3: Training trace export:
    4 DPO triples (T59, T60, T61, T62):
      ftId populated (not null),
      productScope: "client-capability",
      portingCandidate: true
□ NEW-E4: Chaos tests:
    Kill T60 mid-registration → slot released, RegistrationCancelled
    Duplicate AttendeeRegistered → idempotency holds
    Organizer cancels → RegistrationCancelled fan-out completes
□ NEW-E5: No PII in any log field
□ NEW-E6: All 12 test matrix scenarios pass (T006 uses virtualClock)

[NEW — D-VIS-3 test:flow-matrix]:
  npm run test:flow-matrix -- --flow=FLOW-03
  Assert: all 12 scenarios pass
  Assert: T006 (virtualClock: true) ran with clock injection

[NEW — cross-flow edge tests]:
  Inbound (implement real assertions):
    FLOW-02_to_FLOW-03.edge.spec.ts
    Assert: OnboardingCompleted enables FLOW-03 event creation endpoint
    Assert: tenant isolation: FLOW-02 event for tenant-A doesn't affect tenant-B
  Outbound (stubs — FLOW-09 not yet generated):
    FLOW-03_to_FLOW-09.edge.spec.ts ← stub
  npm run test:cross-flow
  Assert: FLOW-02_to_FLOW-03 passes with real assertions
  Assert: outbound stubs skip cleanly

[NEW — D-VIS-1 blast radius + 3-case protocol]:
  CASE A (≤ threshold): auto-promote → edge tests → ACTIVE
  CASE B (> threshold): REGRESSED + EscalationBriefing + ⛔ STOP
  CASE C (no affected flows): ACTIVE immediately

[NEW — SK-436 bundle version check]:
  FLOW-03 is in bundles: B-001, B-002, B-003 (events feature)
  For each: verify version ≥ bundle.minFlowVersions.FLOW-03
  If any below minimum: emit BundleDegraded, note in PHASE-COMPLETE

[NEW — D-VIS-4 lifecycle update]:
  FLOW-03 → PROMOTED → ACTIVE
  Verify: GET /lifecycle/flows/FLOW-03 returns status=ACTIVE


[NEW v2 — V26] Client integration tests:
  npm run test:client-integration -- --flow=FLOW-03

  C1 tests (optimistic state — 3 tests):
    EventRegistrationRequested × 3 (immediate disabled state, rollback on
    RegistrationFailed, confirmation on AttendeeRegistered)
  C2 tests (app reopen — 5 tests):
    event-creation: PENDING >30s → show creation failed
    event-registration-open: restore registration status + capacity
    event-registration-full: show Full / hide Register button
    organizer dashboard: T61 promotion status shown
    analytics dashboard: T62 banner shown, not silent mutation
  C3 tests (offline queue — 4 tests):
    EventRegistrationRequested queued when offline
    Queued event flushed on reconnect in FIFO order
    Expired correlation dropped on reconnect, not replayed
    Offline registration returns "queued" status, not error
  C4 tests (SLA — 0):
    No user-facing SLA countdown in FLOW-03
  C5 tests (draft state — 6 tests):
    3-step form: partial fill saved to AsyncStorage on step navigation
    Draft recovered on app reopen → recovery prompt shown
    Draft TTL (7 days) expired → prompt not shown, draft cleared
    No DraftAbandonedWithEffect — no serverSideEffect steps
    Auto-save on field-blur: draft updated after each field change
    Auto-save on 30s-interval: draft updated on timer
  Background signal tests (+10):
    T61: EventPromoted → realtime-push → organizer dashboard badge updates
    T62: EventAnalyticsUpdated → banner appears, NOT silent mutation
    Banner: user dismisses → banner cleared
    Banner: user taps → query() called, dashboard refreshes
    ... (6 more per CLIENT-TESTING-PLAN.md §CATEGORY 4)

  Expected client test delta: +28
  Add to STATE.json: "client_test_delta": 28

□ Tests: wave_baseline_entry + 40 (server delta, not absolute)
□ Client tests: +28 (C1:3 + C2:5 + C3:4 + C4:0 + C5:6 + background:+10)
□ FLOW-03-STATE.json saved
```

---

## SK-418 FLOW COMPLETENESS CHECK — 28/28 ✅ (v1.2)

```
V1  ✅ All 7 passes complete
V2  ✅ 10 schemas in contracts/events/FLOW-03/ (7 server + 1 client + 2 compensation)
    Each client event schema has queuePolicy field
V3  ✅ contracts/topologies/FLOW-03.topology.json with clientStateMap +
    clientArchitecture + draftSpec + backgroundSignals
V4  ✅ contracts/tests/FLOW-03.test-matrix.json with 12 scenarios
V5  ✅ infrastructure/monitoring/FLOW-03-dashboard.json (4 panels)
V6  ✅ docs/runbooks/FLOW-03-runbook.md stub
V7  ✅ Client event: EventRegistrationRequested with 3-part optimistic contract
    RegistrationCancelled explicitly NOT optimistic (slot implications — documented)
V8  ✅ All 4 genesis prompts have Mode C CONSUMES/EMITS/BOUNDARY sections
V9  ✅ Phase A includes NEW-A1 through NEW-A6 + clientArchitecture + test stub
V10 ✅ FlowStateSnapshot: GET /flow/FLOW-03/state?eventId=...
    GET /flow/FLOW-03/analytics?eventId=... (analytics snapshot)
V11 ✅ EventRegistrationRequested has 3-part optimistic contract
V12 ✅ T006 virtualClock: true (analytics TTL window)
V13 ✅ LIFO compensation: RegistrationCancelled → EventPromoted cancelled →
    EventCancelledByOrganizer
V14 ✅ DPO triples: 4 (T59, T60, T61, T62), ftId + productScope: "client-capability"
V15 ✅ No factory types in event schemas
V16 ✅ Wave 2, parallel_wave: 2 declared
V17 ✅ DRY_RUN in Phase A gate
V18 ✅ Arbiter replay for 6 new arbiters
V19 ✅ Lifecycle CAS + SK-434 parallel prerequisite check (FLOW-02 ACTIVE)
V20 ✅ test:flow-matrix in Phase E gate (12 scenarios, T006 virtualClock)
V21 ✅ FLOW-02_to_FLOW-03.edge.spec.ts (real), FLOW-03_to_FLOW-09.edge.spec.ts (stub)
V22 ✅ 3-case blast radius (CASE A/B/C)
V23 ✅ Lifecycle PROMOTED → ACTIVE + B-001/002/003 bundle check (SK-436)

V24 ✅ topology.json clientArchitecture section:
    requiresDraftState: true (3-step event creation form)
    draftSteps: ["event-details", "event-pricing", "event-media"]
    offlineQueue.queueable: ["EventRegistrationRequested"]
    offlineQueue.notQueueable: [] (no non-queueable client events)
    backgroundSteps: [T61 realtime-push, T62 new-content-available-banner]

V25 ✅ appReopenBehavior on ALL 3 DAG nodes:
    event-creation: PENDING >30s → show creation failed, offer retry
    event-registration-open: restore registration status + capacity count
    event-registration-full: hide Register button, show Full state

V26 ✅ Phase E gate includes client integration tests:
    npm run test:client-integration -- --flow=FLOW-03
    C1: 3, C2: 5, C3: 4, C4: 0, C5: 6, background: +10 = +28 total
    client_test_delta: 28 in STATE.json

V27 ✅ requiresDraftState: true — draftSpec present with 3 steps
    All 3 steps have serverSideEffect: false
    No DraftAbandonedWithEffect needed (no server-side holds created)
    Recovery prompt shown on app open after abandoned draft

V28 ✅ backgroundSteps defined for T61 and T62:
    T61: realtime-push (promotion status — silent update acceptable for badge)
    T62: new-content-available-banner (analytics — silentMutationPermitted: false)
    T59, T60: no background steps — run in response to user actions only
```

---

## KEY FACTS FOR SESSION FILES

```
Artifact numbers:
  Task types: T59–T62 (4)
  Factories:  F197–F204 (8 factories, 7 INJECTABLE + 1 PLATFORM-ONLY)
  BFA rules:  from parallel_execution table — verify, do not re-seed
  Family:     from parallel_execution table

Wave: 2 (parallel) — parallel_wave: 2
Prerequisite: FLOW-02 ACTIVE
Gate check: SK-434 prerequisite check at Phase A start

New archetypes (3): REGISTRATION, PROMOTION, ANALYTICS
New arbiters (6): registration::capacity-safety, registration::idempotent-attendee,
  promotion::reach-threshold, promotion::content-safety,
  analytics::counter-accuracy, analytics::ttl-enforcement

Test deltas (not absolute — parallel mode):
  Phase A gate: wave_baseline_entry + 10
  All phases exit: wave_baseline_entry + 40

Inbound edge test: FLOW-02_to_FLOW-03 (implement real assertions in Phase E)
Outbound edge stub: FLOW-03_to_FLOW-09 (stub — FLOW-09 not yet generated)

Bundle membership: B-001, B-002, B-003
  Bundle version check required in Phase E gate (SK-436)

Cross-flow dependency: FLOW-09 (Transactional Event Participation — Wave 3)
  FLOW-09 uses AttendeeRegistered as its trigger event

DPO triples: 4 (one per task type T59–T62)
  productScope: "client-capability", portingCandidate: true
  ftId: populated by FLOW-36 Phase B (FLOW-36 runs before FLOW-03)

Client architecture (V24–V28):
  requiresDraftState: true (3-step event creation form, no server side effects)
  queueable: EventRegistrationRequested
  backgroundSteps: T61 (realtime-push), T62 (new-content-available-banner)
  Client test delta: +28 (C1:3, C2:5, C3:4, C4:0, C5:6, background:+10)

Read before planning:
  FLOW-EXECUTION-VISIBILITY-PLAN.md
  PARALLEL-EXECUTION-PLAN.md (wave 2 pre-allocation)
  CLIENT-ARCHITECTURE-SPEC.md (V24–V28 gates)
  CLIENT-TESTING-PLAN.md (client test categories)
  FLOW-36-AMENDMENT.md (FT back-fill context)
```

---

## SESSION FILES TO PRODUCE

```
FLOW-03-STATE.json               ← parallel_wave: 2, wave: 2, wave_baseline_entry: TBD,
                                    client_test_delta: 28
SESSION-FLOW-03-A.md             ← enum (3) + 4 contracts + 6 arbiters + 10 schemas +
                                    pre-allocated ranges + prerequisite check + DRY_RUN + CAS
                                    + topology.json clientArchitecture + draftSpec
                                    + client test stub creation
SESSION-FLOW-03-B.md             ← EventCreationOrchestrator [T59]
SESSION-FLOW-03-C.md             ← EventRegistrationManager [T60]
SESSION-FLOW-03-D.md             ← EventPromotionEngine [T61] + EventAnalyticsTracker [T62]
SESSION-FLOW-03-E.md             ← BFA + edge tests (real inbound) + matrix + lifecycle + bundle
                                    + npm run test:client-integration -- --flow=FLOW-03
                                    + C1–C5 stub implementations + background signal tests
docs/FLOW-03-REFERENCE.md
```

Every SESSION file ends with Phase Completion Package (SK-427 v1.1):
SK-427 reads `parallel_wave: 2` from STATE.json → applies delta gate model.


### Client test stub (produced in Phase A)

File: `client/__tests__/flows/flow-03/flow-03-integration.test.ts`

```typescript
/**
 * FLOW-03 Client Integration Tests
 * Categories: C1 (optimistic), C2 (app reopen), C3 (offline queue), C5 (draft)
 * Background signal tests: T61 realtime-push, T62 new-content-available-banner
 * Expected delta: +28
 * See docs/CLIENT-TESTING-PLAN.md and docs/CLIENT-ARCHITECTURE-SPEC.md
 * STUBS — implement during SESSION-FLOW-03-E.md execution.
 */

describe('FLOW-03 Client Integration', () => {

  // C1 — Optimistic state (3 tests)
  describe('C1: Optimistic actions', () => {
    it.todo('EventRegistrationRequested: button shows "Registering..." immediately');
    it.todo('EventRegistrationRequested: button reverts to "Register" on RegistrationFailed');
    it.todo('EventRegistrationRequested: confirms to registered state on AttendeeRegistered');
  });

  // C2 — App reopen (5 tests)
  describe('C2: App reopen behavior', () => {
    it.todo('event-creation: PENDING >30s → show EventCreationFailed, offer retry');
    it.todo('event-registration-open: restore registration status and capacity count');
    it.todo('event-registration-full: Register button hidden, Full state shown');
    it.todo('organizer dashboard: T61 promotion status shown after EventPromoted');
    it.todo('analytics dashboard: T62 banner visible after EventAnalyticsUpdated');
  });

  // C3 — Offline queue (4 tests)
  describe('C3: Offline queue', () => {
    it.todo('EventRegistrationRequested queued when connectionStatus = offline');
    it.todo('Queued EventRegistrationRequested flushed in FIFO order on reconnect');
    it.todo('Expired correlation dropped on reconnect — not replayed');
    it.todo('Offline registration resolves to "queued" status, not error screen');
  });

  // C4 — N/A (no user-facing SLA in FLOW-03)

  // C5 — Draft state (6 tests)
  describe('C5: Draft state', () => {
    it.todo('event-details step: fields saved to AsyncStorage on field-blur');
    it.todo('event-pricing step: draft updated on step-advance');
    it.todo('30s auto-save: draft updated on timer interval');
    it.todo('app reopen after abandonment: recovery prompt shown');
    it.todo('draft TTL (7 days) expired: prompt not shown, draft cleared');
    it.todo('no DraftAbandonedWithEffect emitted — no serverSideEffect steps');
  });

  // Background signals (10 tests)
  describe('Background signals', () => {
    describe('T61 EventPromotionEngine (realtime-push)', () => {
      it.todo('EventPromoted → organizer dashboard promotion status updates');
      it.todo('realtime-push arrives while user on OrganizerDashboard → badge updates silently');
      it.todo('realtime-push arrives while user away → state queued, shown on next view');
    });
    describe('T62 EventAnalyticsTracker (new-content-available-banner)', () => {
      it.todo('EventAnalyticsUpdated → banner shown on EventAnalyticsDashboard');
      it.todo('banner appears — analytics data does NOT silently update mid-view');
      it.todo('user dismisses banner → banner cleared, data unchanged');
      it.todo('user taps banner → query() called → analytics data refreshed');
      it.todo('multiple rapid EventAnalyticsUpdated → single banner (deduped)');
      it.todo('banner not shown if user is not on EventAnalyticsDashboard');
      it.todo('clearBackgroundSignal() called after user acknowledges');
    });
  });

});
```

⛔ STOP — Run pre-allocation session to assign wave_baseline_entry before Phase A.
Read PARALLEL-EXECUTION-PLAN.md for pre-allocation process.
Verify FLOW-02 is ACTIVE before proceeding.
