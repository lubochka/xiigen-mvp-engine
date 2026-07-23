# FLOW-03: EVENT CREATION & PROMOTION — REFERENCE PLAN v5
## Prerequisites: FLOW-02 ACTIVE + FLOW-35 + FLOW-36 + FLOW-00 + FLOW-00.1 + FLOW-00.2 + FLOW-00.3 complete
## Date: 2026-03-23
## flow-completeness-checker v1.5: 33/33 ✅

---

## SCOPE DISCIPLINE

```
stackTargets:  ['node-nestjs']
clientTargets: ['react-web']

This plan contains ONLY:
  ✓ Full detail for node-nestjs:server
  ✓ Full detail for react-web:client (topology stateNotes incl. draft/localStorage)
  ✓ Platform entries (redis, jest, github-actions) — CONCEPT_NEUTRAL
  ✓ One-line INCOMPATIBLE flags (T60 php-wordpress, T60 php-server-rendered:client)
  ✓ One-line server stubs in genesis prompt Section 4

This plan does NOT contain:
  ✗ Angular stateNotes, BehaviorSubject + localStorage analysis, EventDraftService
  ✗ Angular CanDeactivateFn exit guard analysis
  ✗ Angular component-local Subject for event-registration-open
  ✗ Full coupling map entries for php-laravel:server or php-wordpress:server (non-INCOMPATIBLE)

Non-priority stack details: see STACK-COUPLING-AUDIT-FLOW-01-04-v1.md
and APPENDIX A at end of this document.
```

---

## IMPLEMENTATION MODE (P12)

```
implementationMode: "af-pipeline"
implementationModeReason: "Wave 2 user-facing flow. AF pipeline operational after FLOW-35."

WHO DOES WHAT:
  Claude Code writes:  EngineContracts, AF prompts (genesis/review/compliance/judge),
                       event schemas, topology, test matrix, Grafana dashboard, runbook
  XIIGen generates:    Service code (.service.ts files) via AF-1
  AF-6/7/8/9 judges:  Generated code quality, DNA compliance, security, scoring

Claude Code does NOT create .service.ts files for T59/T60/T61/T62.
Genesis prompts (Section 1–4) are AF-1 INPUT, not Claude Code instructions.

PRE-ALLOCATION GATE: Family and CF artifact ranges must be confirmed from
the parallel-wave pre-allocation session BEFORE Phase A executes.
SESSION-FLOW-03-A.md MUST NOT start until STATE.json shows confirmed values
(not "verify from parallel_execution table") for Family and CF.
```

---

## WHAT CHANGED FROM v4 → v5

| What v4 had | What v5 changes |
|---|---|
| No implementationMode in STATE.json | implementationMode: "af-pipeline" added (P12 ✅) |
| Phase structure: per-task-type sessions (manual pattern) | Phases follow INJECT → GENERATE → JUDGE → INTEGRATE → PROMOTE |
| SESSION files implied direct .service.ts creation | SESSION files reference afPipeline.run() — AF-1 generates service code |
| Genesis prompts not marked as AF-1 input | Genesis prompts explicitly marked as AF-1 INPUT |
| No AF prompt definitions table | 16 AF prompts defined (4 per task type × 4 task types) |
| Phase B/C gates absent | Phase B gate (afPipeline.run() + 6 P5 metrics) + Phase C gate (AF-9 ≥ 80) added |
| flow-completeness-checker v1.3: 31/31 | flow-completeness-checker v1.5: 33/33 (V0-MODE, V0-SCOPE added) |
| FLOW-00.3 absent from prerequisites | FLOW-00.3 added (cost pipeline required for af-pipeline mode) |
| Pre-allocation gate not explicit | Pre-allocation blocking comment in STATE.json and IMPLEMENTATION MODE section |

V1–V28 content and all v4 in-scope content (genesis prompts, stateNotes, coupling annotations) unchanged.

---

## WAVE ASSIGNMENT (unchanged)

```
FLOW-03: Wave 2 — parallel
  parallel_wave: 2
  wave: 2
  prerequisite: FLOW-02 ACTIVE
  downstream: FLOW-09 (Wave 3)
```

---

## STATE.json (v5)

```json
{
  "flow_id": "FLOW-03",
  "flow_name": "Event Creation & Promotion",
  "parallel_wave": 2,
  "wave": 2,
  "current_phase": "session-0",
  "completed_phases": [],
  "test_baseline": null,
  "wave_baseline_entry": "__SET_BY_PRE_ALLOCATION_SESSION__",
  "client_test_delta": 28,
  "stackTargets": ["node-nestjs"],
  "clientTargets": ["react-web"],
  "implementationMode": "af-pipeline",
  "implementationModeReason": "Wave 2 user-facing flow. AF pipeline operational after FLOW-35.",
  "pre_allocated_ranges": {
    "T": "T59–T62",
    "F": "F197–F204",
    "Family": "⛔ REQUIRED — confirm from parallel_execution table before Phase A",
    "CF": "⛔ REQUIRED — confirm from parallel_execution table before Phase A"
  },
  "pre_allocation_gate": "SESSION-FLOW-03-A.md MUST NOT execute until Family and CF values above are confirmed. Replace ⛔ strings with actual numbers from the parallel-wave pre-allocation session."
}
```

---

## ARTIFACT NUMBERS (unchanged)

```
Task types:  T59 EventCreationOrchestrator
             T60 EventRegistrationManager
             T61 EventPromotionEngine
             T62 EventAnalyticsTracker
Factories:   F197–F204 (8 factories)
BFA rules:   from parallel_execution table (do not re-seed)
Family:      from parallel_execution table
New archetypes: REGISTRATION (T60), PROMOTION (T61), ANALYTICS (T62)
New arbiters: registration::capacity-safety, registration::idempotent-attendee,
              promotion::reach-threshold, promotion::content-safety,
              analytics::counter-accuracy, analytics::ttl-enforcement
```

---

## SERVICE FILE NAMES (naming-conventions-enforcer Rule 1)

Pattern: `{verb}-{domain-noun}.service.ts`
Directory: `engine/flows/event-creation-promotion/`

| Task Type | ID | Service File | Class Name |
|-----------|----|--------------|-----------| 
| EventCreationOrchestrator | T59 | `event-creation-orchestrator.service.ts` | `EventCreationOrchestrator` |
| EventRegistrationManager | T60 | `event-registration-manager.service.ts` | `EventRegistrationManager` |
| EventPromotionEngine | T61 | `event-promotion-engine.service.ts` | `EventPromotionEngine` |
| EventAnalyticsTracker | T62 | `event-analytics-tracker.service.ts` | `EventAnalyticsTracker` |

**T60 naming exception:** `Manager` suffix is approved. `EventRegistrationManager` is the established domain term — capacity management, slot allocation, and waitlist coordination are management operations by domain convention.

---

## PASSES 1–6 (unchanged from v2)

All event contracts (10 schemas), retry/compensation, observability,
E2E test matrix (12 scenarios) identical to v2. See v2 for full content.

---

## PASS 3 — CLIENT STATE MAP (v4 — react-web only)

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
    "appReopenBehavior": "query FlowStateSnapshot → if PENDING >30s → show creation failed, offer retry. If draft exists in localStorage → show recovery prompt before re-entering form."
  },
  "stackCoupling": {
    "react-web:client": {
      "tier": "STACK_COUPLED",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_STATE_MODEL", "CLIENT_LIFECYCLE"],
      "neutralConcepts": [
        "3-step form: persist field values across steps and sessions",
        "auto-save on field-blur and 30s interval",
        "app reopen: show recovery prompt if draft exists",
        "draft TTL: discard after N days (FREEDOM config)"
      ],
      "implementationNotes": "useState<DraftEventForm> for current step and field values. useEffect with setInterval(30_000) for periodic auto-save to localStorage. onBlur handler saves individual field to localStorage. On mount: read localStorage draft — if present and not expired, show RecoveryPrompt ('Continue your event?' / 'Start fresh'). Draft key: 'event-draft:{tenantId}:{userId}'. TTL checked against draft.savedAt timestamp.",
      "stateNotes": {
        "stateHolderType": "useState + localStorage",
        "stateHolderTypeReason": "3-step form state is local to EventCreationForm screens. Draft must survive app restarts (localStorage) but does not need to cross to other parts of the app. No global store needed — draft is a personal in-progress artifact.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "EventCreationForm mounts/unmounts with the creation flow. Draft persists in localStorage independently of React state — no root-scope needed.",
        "propagationRisk": "LOW",
        "propagationRiskReason": "Only the EventCreationForm and its step sub-components read draft state. Each step reads/writes to the same useState value.",
        "routeGuardRequired": false,
        "exitGuardRequired": true,
        "note": "exitGuardRequired: true — if user navigates away mid-draft with unsaved changes, show 'Discard event?' confirmation. React Router useBlocker or prompt equivalent. Draft is auto-saved on exit if user confirms — not discarded immediately."
      }
    }
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
        "rollbackState": {
          "button": "enabled",
          "label": "Register",
          "error": "Could not complete registration. Try again."
        }
      }
    },
    "appReopenBehavior": "query FlowStateSnapshot → show correct registration status and remaining capacity"
  },
  "stackCoupling": {
    "react-web:client": {
      "tier": "IMPL_VARIES",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_STATE_MODEL"],
      "neutralConcepts": [
        "Register button: optimistic disable on tap, rollback on RegistrationFailed",
        "app reopen: restore registration status from FlowStateSnapshot"
      ],
      "implementationNotes": "useState<'idle'|'registering'|'registered'|'failed'> for button state. On tap: set 'registering'. On AttendeeRegistered confirmation: set 'registered'. On RegistrationFailed: set 'failed', show error, re-enable after 3s. On mount: fetch FlowStateSnapshot to restore status.",
      "stateNotes": {
        "stateHolderType": "useState",
        "stateHolderTypeReason": "Button state is local to EventDetailScreen. Registration status confirmed by server — no cross-screen propagation needed.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "State lives in EventDetailScreen. Unmounts on navigation.",
        "propagationRisk": "LOW",
        "propagationRiskReason": "Only EventDetailScreen reads registration button state.",
        "routeGuardRequired": false,
        "exitGuardRequired": false
      }
    }
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
  },
  "stackCoupling": {
    "react-web:client": {
      "tier": "IMPL_VARIES",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_STATE_MODEL"],
      "neutralConcepts": [
        "hide or disable Register button when capacity full",
        "app reopen: read capacity from FlowStateSnapshot"
      ],
      "implementationNotes": "No local state needed. On mount: fetch FlowStateSnapshot, read capacity.remaining. If remaining === 0: render 'Full' badge, hide Register button. Derive from server state — no useState for this node.",
      "stateNotes": {
        "stateHolderType": "derived from FlowStateSnapshot (no useState)",
        "stateHolderTypeReason": "Full state is purely server-derived. No user actions possible. No local reactive state needed.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "Derived on mount, component-local.",
        "propagationRisk": "LOW",
        "propagationRiskReason": "Single EventDetailScreen reads capacity.",
        "routeGuardRequired": false,
        "exitGuardRequired": false
      }
    }
  }
}
```

### clientArchitecture section (unchanged from v2)

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
      "signalText": null
    },
    {
      "serverTask": "T62",
      "runsWhileUserViews": "EventAnalyticsDashboard",
      "signalType": "new-content-available-banner",
      "signalText": "Analytics updated — pull to refresh",
      "silentMutationPermitted": false
    }
  ]
}
```

---

## PASS 7 — GENESIS PROMPTS (HybridGenesisPrompt format)

### T59 EventCreationOrchestrator — HybridGenesisPrompt

```
TASK TYPE: T59 | FLOW-03 — Event Creation & Promotion

SECTION 1 — NEUTRAL IRON RULES
  IR-1: EventCreated MUST be emitted (and stored via DNA-8) BEFORE any
        downstream queue work. Feed distribution is triggered by the event,
        not by inline calls. Score-0 if any downstream task is called directly.
  IR-2: capacity: null MEANS unlimited. It does NOT mean zero.
        Any check that treats null as zero is a score-0 violation.
  IR-3: DNA-5: tenantId on ALL database writes. Events never visible across tenants.
  IR-4: DNA-8: storeDocument(EventCreated) BEFORE enqueue(). Always.
  IR-5: Event metadata fields (title, date, location) read and persisted
        exactly as provided — no server-side transformation unless FREEDOM config.
  IR-6: Draft recovery: SETNX key: hash(tenantId + creatorId + 'event-creation-in-progress').

SECTION 2 — CONCEPT DESCRIPTION
  EventCreationOrchestrator is the entry point for event creation. It validates
  submitted event data, persists the event record, assigns category taxonomy,
  emits EventCreated to trigger the feed distribution pipeline, and manages the
  draft lifecycle. Status transitions: DRAFT → PUBLISHED.

SECTION 3 — EVENT CONTRACTS
  CONSUMES: [none — HTTP entry point POST /events]
  EMITS:    EventCreated, EventPublished, EventCancelledByOrganizer (compensation)
  INTEGRATION BOUNDARY:
    F197 IEventService:              INJECTABLE
    F201 IEventMediaService:         INJECTABLE
    F202 IEventNotificationService:  INJECTABLE
    F203 IEventCategoryService:      INJECTABLE
    F204 IAuditTrailService:         PLATFORM-ONLY

SECTION 4 — STACK IMPLEMENTATIONS

  node-nestjs:server ← PRIORITY (implement in this phase)
    "Generate a NestJS @Injectable() class named EventCreationOrchestrator
    extending MicroserviceBase. Inject F197, F201, F202, F203, F204 via constructor.
    SETNX idempotency before create (IR-6). Persist event via F197.
    Assign category via F203. storeDocument(EventCreated) then enqueue (IR-4, IR-1).
    capacity: null = unlimited — no zero-check (IR-2).
    Return Promise<DataProcessResult<EventCreationResult>>."

  python-fastapi:server  → [Stub — FLOW-37]
  php-laravel:server     → [Stub — FLOW-37: Eloquent + DB::transaction()]
  php-wordpress:server   → [Stub — degraded: $wpdb, no DI, NULL capacity guard]

  redis:platform — CONCEPT_NEUTRAL
    "SETNX idempotency key (IR-6): {tenantId}:event-create:{creatorId}.
    TTL from FREEDOM config. All stacks via IDatabaseService FABRIC."

  jest:platform — CONCEPT_NEUTRAL
    "No virtualClock for T59. Test IR-2: capacity=null → no validation error.
    Test IR-1: EventCreated stored before any queue call."
```

### T60 EventRegistrationManager — HybridGenesisPrompt

```
TASK TYPE: T60 | FLOW-03 — Event Creation & Promotion

SECTION 1 — NEUTRAL IRON RULES
  IR-1: Capacity check AND registration write MUST be a single atomic
        operation. Any implementation where check and write are separate
        steps with a gap between them produces a capacity race — score-0.
  IR-2: RegistrationFailed MUST be emitted on ANY failure. Never silent.
  IR-3: attendeeId ONLY in all event payloads. Never PII.
  IR-4: DNA-8: storeDocument(AttendeeRegistered) BEFORE enqueue().
  IR-5: DNA-5: tenantId on all writes. Capacity counter per-event per-tenant.
  IR-6: Idempotency: SETNX key = hash(tenantId + eventId + attendeeId).

SECTION 2 — CONCEPT DESCRIPTION
  EventRegistrationManager manages attendee slots. When a registration
  request arrives it atomically checks remaining capacity and writes the
  attendee record — no gap between check and write. Full events emit
  RegistrationClosed. Cancellations release slots and promote waitlist.

SECTION 3 — EVENT CONTRACTS
  CONSUMES: EventCreated (QUEUE FABRIC — from T59),
            EventRegistrationRequested (client event)
  EMITS:    AttendeeRegistered, RegistrationClosed, RegistrationFailed,
            RegistrationCancelled (compensation)
  INTEGRATION BOUNDARY:
    F197 IEventService:              INJECTABLE
    F198 IEventRegistrationService:  INJECTABLE
    F202 IEventNotificationService:  INJECTABLE
    F204 IAuditTrailService:         PLATFORM-ONLY

SECTION 4 — STACK IMPLEMENTATIONS

  node-nestjs:server ← PRIORITY (implement in this phase)
    "Generate a NestJS @Injectable() class named EventRegistrationManager
    extending MicroserviceBase. Inject F197, F198, F202, F204 via constructor.
    Atomic capacity check + write via F198.registerAtomically(tenantId, eventId, attendeeId)
    which uses ORM transaction or Redis MULTI/EXEC (FREEDOM config selects strategy).
    On success: storeDocument(AttendeeRegistered) then enqueue.
    On capacity full: emit RegistrationClosed then RegistrationFailed.
    SETNX idempotency before any write (IR-6).
    Return Promise<DataProcessResult<RegistrationResult>>."

  python-fastapi:server  → [Stub — FLOW-37: async transaction]
  php-laravel:server     → [Stub — FLOW-37: DB::transaction() + lockForUpdate]
  php-wordpress:server   → ⛔ INCOMPATIBLE — $wpdb no atomic read-modify-write
  dotnet-aspnet:server   → [Stub — FLOW-37: EF Core row locking]

  redis:platform — CONCEPT_NEUTRAL
    "SETNX idempotency key (IR-6): {tenantId}:reg:{eventId}:{attendeeId}. TTL 24h.
    Alternative atomic strategy: Redis MULTI/EXEC for capacity counter (FREEDOM config)."

  jest:platform — CONCEPT_NEUTRAL
    "Capacity race test (T002): two concurrent registrations for last slot.
    Assert exactly 1 AttendeeRegistered and 1 RegistrationFailed."
```

### T61 EventPromotionEngine — HybridGenesisPrompt

```
TASK TYPE: T61 | FLOW-03 — Event Creation & Promotion

SECTION 1 — NEUTRAL IRON RULES
  IR-1: Promotion target audience from FREEDOM config via F199. Never hardcode.
  IR-2: Content safety check MUST run before promotion approval.
  IR-3: PromotionReached threshold from FREEDOM config — never hardcoded.
  IR-4: EventPromotionDeferred (not failed) on non-fatal content/targeting issue.
  IR-5: DNA-8: storeDocument(EventPromoted) BEFORE enqueue().
  IR-6: Idempotency: SETNX key = hash(tenantId + eventId + 'promotion').

SECTION 2 — CONCEPT DESCRIPTION
  EventPromotionEngine runs after event publication. It evaluates content
  against safety rules, determines target audience from tenant config, and
  fires promotion distribution. Non-fatal failures defer, not cancel.

SECTION 3 — EVENT CONTRACTS
  CONSUMES: EventPublished (QUEUE FABRIC — from T59)
  EMITS:    EventPromoted, PromotionReached, EventPromotionDeferred
  INTEGRATION BOUNDARY:
    F199 IEventPromotionService:  INJECTABLE
    F200 IEventAnalyticsService:  INJECTABLE
    F203 IEventCategoryService:   INJECTABLE

SECTION 4 — STACK IMPLEMENTATIONS

  node-nestjs:server ← PRIORITY (implement in this phase)
    "Generate a NestJS @Injectable() class named EventPromotionEngine
    extending MicroserviceBase. Inject F199, F200, F203 via constructor.
    Content safety: await this.promotionSvc.checkContentSafety(tenantId, eventId).
    If unsafe: emit EventPromotionDeferred, return success(deferred).
    Target audience: from F199 per tenant config. SETNX before promotion (IR-6).
    storeDocument(EventPromoted) then enqueue (IR-5).
    Return Promise<DataProcessResult<PromotionResult>>."

  python-fastapi:server  → [Stub — FLOW-37]
  php-laravel:server     → [Stub — FLOW-37]
  php-wordpress:server   → [Stub — degraded: blocking wp_remote_post, no async]

  redis:platform — CONCEPT_NEUTRAL
    "SETNX idempotency (IR-6): {tenantId}:promote:{eventId}. TTL 1h.
    PromotionReached counter in Redis sorted set."

  jest:platform — CONCEPT_NEUTRAL
    "Mock F199.checkContentSafety → unsafe → verify EventPromotionDeferred.
    Mock audience config to verify FREEDOM reading (IR-1)."
```

### T62 EventAnalyticsTracker — HybridGenesisPrompt

```
TASK TYPE: T62 | FLOW-03 — Event Creation & Promotion

SECTION 1 — NEUTRAL IRON RULES
  IR-1: Analytics counters MUST be TTL-windowed. No unbounded accumulation.
        Window TTL from FREEDOM config — never hardcoded.
  IR-2: EventAnalyticsUpdated idempotent per eventId + windowStart.
  IR-3: DNA-5: analytics data scoped to tenantId. No cross-tenant aggregation.
  IR-4: Analytics is best-effort: failure logged, MUST NOT block upstream.
  IR-5: DNA-8: storeDocument(EventAnalyticsUpdated) BEFORE enqueue() on push.
  IR-6: Window boundaries from FREEDOM config 'flow03_analytics_window_ttl_hours'.

SECTION 2 — CONCEPT DESCRIPTION
  EventAnalyticsTracker listens to multiple upstream events and maintains
  rolling TTL-windowed counters. Counters are idempotent per window. When a
  window closes or threshold is crossed, pushes refresh banner to organiser
  dashboard. Never blocks upstream events — pure side-effect observer.

SECTION 3 — EVENT CONTRACTS
  CONSUMES: AttendeeRegistered, PromotionReached, EventPublished,
            RegistrationCancelled (QUEUE FABRIC — from T59/T60/T61)
  EMITS:    EventAnalyticsUpdated
  INTEGRATION BOUNDARY:
    F200 IEventAnalyticsService:  INJECTABLE

SECTION 4 — STACK IMPLEMENTATIONS

  node-nestjs:server ← PRIORITY (implement in this phase)
    "Generate a NestJS @Injectable() class named EventAnalyticsTracker
    extending MicroserviceBase. Inject F200 via constructor.
    Window key: {tenantId}:{eventId}:{windowStart-ISO}. TTL from FREEDOM config.
    Increment via F200.incrementWindow(). Idempotency: hash(tenantId + eventId +
    windowStart + correlationId) — skip if seen.
    Best-effort: wrap entire handler in try/catch, log and ack on failure (IR-4).
    storeDocument then enqueue when window closes (IR-5).
    Return Promise<DataProcessResult<AnalyticsResult>>."

  python-fastapi:server  → [Stub — FLOW-37: asyncio, Redis INCR + EXPIRE]
  php-laravel:server     → [Stub — FLOW-37: Redis::incr() + Cache::put() with TTL]
  php-wordpress:server   → [Stub — degraded: update_option(), no native TTL]

  redis:platform — CONCEPT_NEUTRAL
    "INCR counter + EXPIRE TTL for window (IR-1, IR-6).
    Window key: {tenantId}:analytics:{eventId}:{windowStart}.
    SET NX for event dedup (IR-2)."

  jest:platform — IMPL_VARIES [TEST_FRAMEWORK]
    "T006 virtualClock: simulate 8h TTL expiry. jest.useFakeTimers(), advance
    past window_ttl_hours. Assert old window absent. virtualClock: true."

  github-actions:platform — CONCEPT_NEUTRAL
    "Standard CI gate. No FLOW-03-specific CI additions."
```

---

---

## AF PROMPT DEFINITIONS (seeded in Phase A — NEW-A7)

For each task type, 4 prompts seeded to ES via P22 standard:

| Task Type | promptId pattern | AF station | Purpose |
|-----------|-----------------|------------|---------|
| T59 | event-creation::T59::genesis | AF-1 | Code generation instruction (Section 4 content) |
| T59 | event-creation::T59::review | AF-6 | Code review criteria (iron rules + DNA) |
| T59 | event-creation::T59::compliance | AF-7 | DNA + P1-P13 validation rules |
| T59 | event-creation::T59::judge | AF-9 | 5-component scoring + iron rules |
| T60 | event-creation::T60::genesis | AF-1 | (same pattern) |
| T60 | event-creation::T60::review | AF-6 | |
| T60 | event-creation::T60::compliance | AF-7 | |
| T60 | event-creation::T60::judge | AF-9 | |
| T61 | event-creation::T61::genesis | AF-1 | |
| T61 | event-creation::T61::review | AF-6 | |
| T61 | event-creation::T61::compliance | AF-7 | |
| T61 | event-creation::T61::judge | AF-9 | |
| T62 | event-creation::T62::genesis | AF-1 | |
| T62 | event-creation::T62::review | AF-6 | |
| T62 | event-creation::T62::compliance | AF-7 | |
| T62 | event-creation::T62::judge | AF-9 | |

Total: 16 prompts seeded. Domain: `event-creation`. connectionType: `FLOW_SCOPED`.

---

## PASS 7.5 — STACK COUPLING ANNOTATIONS FOR TASK TYPES (V29)

Priority stack + platform entries only. Non-priority stacks: see APPENDIX A.

### T59 EventCreationOrchestrator

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'IMPL_VARIES',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_LANGUAGE'],
      neutralConcepts: [
        'EventCreated before any downstream queue work (IR-1)',
        'capacity null = unlimited (IR-2)',
        'tenantId isolation (IR-3)',
        'DNA-8 store before emit (IR-4)',
        'SETNX idempotency (IR-6)',
      ],
      implementationNotes: 'NestJS @Injectable() extending MicroserviceBase. SETNX → persist → storeDocument → enqueue.',
    },
    'redis:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['SETNX idempotency for event creation (IR-6)'],
      implementationNotes: 'key={tenantId}:event-create:{creatorId}. TTL from FREEDOM config.',
    },
    'jest:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'test-runner',
      dimensions: [],
      neutralConcepts: ['IR-2 null capacity test', 'IR-1 store-before-emit test'],
      implementationNotes: 'Standard Jest. No virtualClock.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
}
```

### T60 EventRegistrationManager

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'STACK_COUPLED',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DATA_ACCESS', 'SERVER_DI_FRAMEWORK'],
      neutralConcepts: [
        'atomic capacity check + write — one operation (IR-1)',
        'RegistrationFailed always emitted on any failure (IR-2)',
        'attendeeId only — no PII (IR-3)',
        'DNA-8 (IR-4)',
        'SETNX idempotency (IR-6)',
      ],
      implementationNotes: 'NestJS + TypeORM/Prisma transaction or Redis MULTI/EXEC. F198.registerAtomically() encapsulates strategy.',
    },
    'php-wordpress:server': {
      tier: 'INCOMPATIBLE',
      incompatible: true,
      incompatibleReason: '$wpdb no atomic read-modify-write for capacity. Race between check and write → over-registration.',
      mitigation: 'Use php-laravel with DB::transaction() + lockForUpdate. WordPress: add Redis MULTI/EXEC dependency.',
    },
    'php-server-rendered:client': {
      tier: 'INCOMPATIBLE',
      incompatible: true,
      incompatibleReason: 'Optimistic registration button requires client-side reactive state. PHP page reload cannot do optimistic UI.',
      mitigation: 'React/Vue island for Register button.',
    },
    'redis:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['SETNX idempotency (IR-6)', 'optional Redis MULTI/EXEC atomic strategy'],
      implementationNotes: 'key={tenantId}:reg:{eventId}:{attendeeId}. TTL 24h.',
    },
    'jest:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'test-runner',
      dimensions: [],
      neutralConcepts: ['capacity race test (T002)', 'idempotency replay test'],
      implementationNotes: 'Concurrent mock: two registerAtomically calls, second returns race rejection.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
}
```

### T61 EventPromotionEngine

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'IMPL_VARIES',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_LANGUAGE'],
      neutralConcepts: [
        'target audience from FREEDOM config (IR-1)',
        'content safety before promotion (IR-2)',
        'PromotionReached threshold from config (IR-3)',
        'deferred not failed on non-fatal (IR-4)',
        'DNA-8 (IR-5)',
        'SETNX idempotency (IR-6)',
      ],
      implementationNotes: 'NestJS @Injectable(). Content safety via F199. SETNX → check → storeDocument → enqueue.',
    },
    'redis:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['SETNX idempotency', 'PromotionReached view counter'],
      implementationNotes: 'key={tenantId}:promote:{eventId}. TTL 1h. Sorted set for threshold.',
    },
    'jest:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'test-runner',
      dimensions: [],
      neutralConcepts: ['content safety failure → EventPromotionDeferred', 'FREEDOM config audience test'],
      implementationNotes: 'Mock F199.checkContentSafety to fail. Assert deferred emitted.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
}
```

### T62 EventAnalyticsTracker

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'IMPL_VARIES',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_DATA_ACCESS'],
      neutralConcepts: [
        'TTL-windowed counters (IR-1)',
        'idempotent per eventId + windowStart (IR-2)',
        'tenantId scoped (IR-3)',
        'best-effort (IR-4)',
        'DNA-8 (IR-5)',
        'window TTL from FREEDOM config (IR-6)',
      ],
      implementationNotes: 'NestJS @Injectable(). F200.incrementWindow(). Try/catch whole handler. Redis INCR + EXPIRE.',
    },
    'redis:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['INCR + EXPIRE for window (IR-1, IR-6)', 'SET NX for event dedup (IR-2)'],
      implementationNotes: 'Window key: {tenantId}:analytics:{eventId}:{windowStart}. Dedup key: {tenantId}:analytics-seen:{correlationId}.',
    },
    'jest:platform': {
      tier: 'IMPL_VARIES',
      stackCategory: 'test-runner',
      dimensions: ['TEST_FRAMEWORK'],
      neutralConcepts: ['virtualClock for TTL window expiry (T006)', 'idempotency replay test'],
      implementationNotes: 'jest.useFakeTimers(). virtualClock: true in test-matrix.json.',
    },
    'github-actions:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'ci-cd',
      dimensions: [],
      neutralConcepts: ['lint:naming, tsc, npm test'],
      implementationNotes: 'Standard gate.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
}
```

---

## ARBITER COUPLING ANNOTATIONS

Business rules CONCEPT_NEUTRAL. Only node-nestjs code check patterns shown.

| Arbiter | Business Rule | NestJS Code Check |
|---------|--------------|-------------------|
| registration::capacity-safety | check + write = one atomic op | F198.registerAtomically() — ORM txn or Redis MULTI/EXEC |
| registration::idempotent-attendee | duplicate = same result | SETNX before write |
| promotion::reach-threshold | threshold from config only | FREEDOM config value scan |
| promotion::content-safety | content checked before promotion | F199.checkContentSafety() call before emit |
| analytics::counter-accuracy | counters TTL-windowed, never unbounded | Redis INCR + EXPIRE pattern |
| analytics::ttl-enforcement | TTL from config, never hardcoded | FREEDOM config literal scan |

---

## PHASE A GATE (v5 — INJECT)

All v2 gates unchanged. Add:

```bash
# PRE-ALLOCATION GUARD — must run before any file creation
node -e "
const state = JSON.parse(require('fs').readFileSync('FLOW-03-STATE.json'));
const { Family, CF } = state.pre_allocated_ranges;
if (Family.startsWith('⛔') || CF.startsWith('⛔'))
  throw new Error('BLOCKED: Family/CF ranges not confirmed from pre-allocation session. Update STATE.json first.');
console.log('✅ Pre-allocation confirmed — Family:', Family, 'CF:', CF);
"

# NEW-A7: AF prompts seeded
node -e "
const es = /* ES client */;
const count = await es.count({ index: 'xiigen-prompts', body: {
  query: { bool: { must: [
    { term: { 'flowId.keyword': 'FLOW-03' }},
    { term: { 'connectionType.keyword': 'FLOW_SCOPED' }}
  ]}}
}});
if (count.body.count !== 16) throw new Error('Expected 16 AF prompts, got ' + count.body.count);
console.log('✅ NEW-A7: 16 AF prompts seeded for FLOW-03');
"

# EngineContracts seeded
node -e "
const es = /* ES client */;
for (const id of ['T59','T60','T61','T62']) {
  const doc = await es.get({ index: 'xiigen-engine-contracts', id });
  if (!doc.body._source.stackCoupling) throw new Error(id + ' missing stackCoupling');
  console.log('✅', id, 'EngineContract seeded with stackCoupling');
}
"

# V29 — stackCoupling on T59/T60/T61/T62
node -e "
const reg = /* load TaskTypeRegistry */;
['T59','T60','T61','T62'].forEach(id => {
  const c = reg.get(id).data;
  if (!c.stackCoupling) throw new Error(id + ' missing stackCoupling');
  if (!c.stackCoupling.entries['node-nestjs:server'])
    throw new Error(id + ' missing priority server entry');
  console.log('✅', id, 'stackCoupling OK');
});
"

# V30 — T60 INCOMPATIBLE flags
node -e "
const reg = /* load TaskTypeRegistry */;
const t60 = reg.get('T60').data;
const wp = t60.stackCoupling.entries['php-wordpress:server'];
if (!wp?.incompatible) throw new Error('T60 php-wordpress INCOMPATIBLE missing');
if (!wp?.mitigation) throw new Error('T60 php-wordpress mitigation missing');
const php_ssr = t60.stackCoupling.entries['php-server-rendered:client'];
if (!php_ssr?.incompatible) throw new Error('T60 php-ssr:client INCOMPATIBLE missing');
console.log('✅ T60 INCOMPATIBLE flags present');
"

# V31 — stateNotes on react-web:client
python3 -c "
import json
t = json.load(open('contracts/topologies/FLOW-03.topology.json'))
nodes = {n['nodeId']: n for n in t.get('nodes', [])}

ec = nodes['event-creation']['stackCoupling']['react-web:client']
assert 'localStorage' in ec['stateNotes']['stateHolderType'], 'draft localStorage missing'
assert ec['stateNotes']['exitGuardRequired'] == True, 'exit guard required for draft'

ero = nodes['event-registration-open']['stackCoupling']['react-web:client']
assert ero['stateNotes']['stateHolderType'] == 'useState'
assert ero['stateNotes']['propagationRisk'] == 'LOW'

erf = nodes['event-registration-full']['stackCoupling']['react-web:client']
assert 'FlowStateSnapshot' in erf['stateNotes']['stateHolderType']

print('✅ V31 stateNotes correct on all react-web:client nodes')
"

# naming-conventions-enforcer gate
npm run lint:naming   # exit 0
```

---

## PHASE B GATE (v5 — GENERATE)

```bash
# Submit each task type to AF pipeline — capture all 6 P5 metrics per run
for taskType in T59 T60 T61 T62; do
  node -e "
  const result = await afPipeline.run({
    tenantId: testTenantId,
    taskType: '${taskType}',
    spec: /* load EngineContract for ${taskType} */
  });

  const metrics = {
    taskType:       '${taskType}',
    passed:         result.passed,
    quality:        result.score,
    cost:           result.costUsd,
    latencyMs:      result.latencyMs,
    retryCount:     result.retryCount,
    dpoTriples:     result.dpoTriples ?? 0,
    modelUsed:      result.modelUsed,
    promotionLevel: result.promotionLevel,
  };

  console.log('${taskType} metrics:', JSON.stringify(metrics, null, 2));
  if (!result.passed) throw new Error('${taskType} AF pipeline FAILED — score: ' + result.score);
  if (!metrics.modelUsed) throw new Error('${taskType} modelUsed not captured');
  "
done

# Verify generated files exist
ls server/src/engine/flows/event-creation-promotion/*.service.ts
# Expected (AF-1 generated, not Claude Code written):
#   event-creation-orchestrator.service.ts
#   event-registration-manager.service.ts
#   event-promotion-engine.service.ts
#   event-analytics-tracker.service.ts
```

---

## PHASE C GATE (v5 — JUDGE)

```bash
node -e "
for (const id of ['T59','T60','T61','T62']) {
  const result = /* load latest AF-9 judgment for id */;
  console.log(id, 'AF-9 score:', result.score,
    'DNA violations:', result.dnaViolations.length,
    'security issues:', result.securityIssues.length);
  if (result.score < 80) throw new Error(id + ' score below 80: ' + result.score);
  if (result.dnaViolations.length > 0) throw new Error(id + ' has DNA violations');
}
console.log('✅ All task types pass AF-9 judgment');
"
# If 60–79: PromptOps generates PromptPatch, re-run Phase B.
# If < 60:  escalate to Luba.
```

---

## PHASE D GATE (v5 — INTEGRATE)

```bash
npm run lint:naming   # exit 0

find server/src/engine/flows/event-creation-promotion -name "*.service.ts"
# Expected: event-creation-orchestrator.service.ts
#           event-registration-manager.service.ts
#           event-promotion-engine.service.ts
#           event-analytics-tracker.service.ts

find server/src/engine/flows/event-creation-promotion -name "t5*.ts" -o -name "t6*.ts" 2>/dev/null
# Expected: no output

cd server && npm test
cd ../client && npm test
```

---

## PHASE E GATE (v5 — PROMOTE)

```bash
# Promote to INJECTED
node -e "
for (const id of ['T59','T60','T61','T62']) {
  await promotionLadder.promote(id, 'INJECTED', testTenantId);
  console.log('✅', id, 'promoted to INJECTED');
}
"

# DPO training data captured
node -e "
const dpo = await es.search({ index: 'xiigen-training-data', body: {
  query: { term: { 'flowId.keyword': 'FLOW-03' }}
}});
console.log('DPO triples captured:', dpo.body.hits.total.value);
if (dpo.body.hits.total.value < 4) throw new Error('Expected >= 4 DPO triples (one per task type)');
"

# Final verification
npm run lint:naming   # exit 0 (regression)
# Re-run V0-MODE, V0-SCOPE, V29/V30/V31 scripts from Phase A gate
```

---

## flow-completeness-checker v1.5 — 33/33 ✅

V1–V28 all pass (unchanged from v2).

```
V0-MODE ✅ implementationMode: "af-pipeline"
    SESSION files use afPipeline.run(), not create_file for services
    Phase structure: INJECT → GENERATE → JUDGE → INTEGRATE → PROMOTE
    16 AF prompts defined (4 per task type × 4), seeded in Phase A NEW-A7
    Genesis prompts explicitly marked as AF-1 INPUT
    Pre-allocation gate: Family + CF must be confirmed before Phase A

V0-SCOPE ✅ stackTargets: ['node-nestjs'], clientTargets: ['react-web']
    Topology stateNotes: react-web:client only
    No Angular/Android stateNotes in plan body

V29 ✅ stackCoupling on T59, T60, T61, T62:
    T59: IMPL_VARIES, entries: node-nestjs:server + redis:platform + jest:platform
    T60: STACK_COUPLED, entries: node-nestjs:server + php-wordpress:server (INCOMPATIBLE)
         + php-server-rendered:client (INCOMPATIBLE) + redis:platform + jest:platform
    T61: IMPL_VARIES, entries: node-nestjs:server + redis:platform + jest:platform
    T62: IMPL_VARIES, entries: node-nestjs:server + redis:platform + jest:platform
         + github-actions:platform
    supportedServerStacks: ['node-nestjs'] on all four

V30 ✅ INCOMPATIBLE stacks flagged:
    T60 php-wordpress:server — $wpdb no atomic read-modify-write
    T60 php-server-rendered:client — no client state layer for optimistic UI

V31 ✅ stateNotes present on react-web:client (declared clientTarget):
    event-creation: useState + localStorage, feature-scoped, LOW, exitGuardRequired: true
    event-registration-open: useState, feature-scoped, LOW
    event-registration-full: derived from FlowStateSnapshot, feature-scoped, LOW
```

---

## SESSION-0 ADDITIONS (FC-19, FC-20, FC-21)

```
FC-19: All 4 genesis prompts in HybridGenesisPrompt format
       ✓ neutralIronRules[] present, no framework names in Section 1
       ✓ stackImplementations['node-nestjs:server'] on all four
       ✓ T60 php-wordpress:server: incompatible: true

FC-20: INCOMPATIBLE stacks flagged with reason + mitigation
       ✓ T60 php-wordpress:server: $wpdb race + mitigation
       ✓ T60 php-server-rendered:client: no optimistic UI + mitigation

FC-21: stateNotes present on react-web:client topology nodes
       ✓ event-creation: useState + localStorage, exitGuardRequired: true
       ✓ event-registration-open: useState, LOW
       ✓ event-registration-full: derived from FlowStateSnapshot
```

---

## JIRA COMMENT TEMPLATE (naming-conventions-enforcer Rule 5)

```
## What was built — Phase D [Flow: FLOW-03 — Event Creation & Promotion]

### Business purpose
Implemented the four task types that power the event lifecycle from creation
to analytics. EventCreationOrchestrator (T59) accepts event submissions,
manages draft recovery, and emits EventCreated to trigger the feed pipeline.
EventRegistrationManager (T60) handles attendee slot allocation using an
atomic capacity check-and-write pattern — preventing over-registration races.
EventPromotionEngine (T61) runs content safety checks and distributes events
to configured audience segments. EventAnalyticsTracker (T62) maintains
TTL-windowed rolling counters, pushing a refresh banner to the organiser dashboard.

### Flow context
- **Flow:** FLOW-03 — Event Creation & Promotion (Wave 2, parallel_wave: 2)
- **Task types:** T59 EventCreationOrchestrator, T60 EventRegistrationManager,
  T61 EventPromotionEngine, T62 EventAnalyticsTracker
- **Will be used by:** FLOW-09 (Transactional Event Participation — Wave 3)
  consumes AttendeeRegistered from T60.

### Technical delivery
- 4 service files in engine/flows/event-creation-promotion/
- 8 factory interfaces registered (F197–F204)
- [N] tests added (unit: [N], e2e: [N])
- Key factories: F197 IEventService (DATABASE FABRIC),
  F198 IEventRegistrationService (INJECTABLE — atomic strategy from FREEDOM config),
  F199 IEventPromotionService (INJECTABLE — audience + content safety),
  F200 IEventAnalyticsService (INJECTABLE — windowed counters)
- Stack: node-nestjs:server. T59 IMPL_VARIES, T60 STACK_COUPLED (atomic ORM txn),
  T61 IMPL_VARIES, T62 IMPL_VARIES. T60 php-wordpress INCOMPATIBLE.

### Architecture fit
T60 uses F198.registerAtomically() — injectable factory abstracting ORM transaction
or Redis MULTI/EXEC per FREEDOM config. MACHINE/FREEDOM split for concurrency.
T62 best-effort wrapper means analytics never blocks registration pipeline.
3-step event creation form uses useState + localStorage — no global store.
```

---

## KEY FACTS FOR SESSION FILES

## KEY FACTS FOR SESSION FILES

```
flow_name: "Event Creation & Promotion"
stackTargets: ['node-nestjs']
clientTargets: ['react-web']
implementationMode: af-pipeline

AF-1 generates these files (Claude Code does NOT create them):
  event-creation-orchestrator.service.ts  ← T59
  event-registration-manager.service.ts   ← T60 (Manager exception documented)
  event-promotion-engine.service.ts        ← T61
  event-analytics-tracker.service.ts       ← T62
Directory: engine/flows/event-creation-promotion/

PRE-ALLOCATION GATE: Family + CF ranges must be confirmed in STATE.json
(replace ⛔ strings) before SESSION-FLOW-03-A.md executes.
wave_baseline_entry set by pre-allocation session — do not hardcode.

Test baseline (parallel_wave: 2 — read at execution time):
  Entry: cd server && npx jest --passWithNoTests 2>&1 | tail -1
         (use wave_baseline_entry from pre-allocation session as anchor)
  After Phase A:  wave_baseline_entry + 10  (schema validation tests)
  After Phase E:  wave_baseline_entry + 40  (server +30 AF-generated, client +10)
  Client delta:   +28 (C1:3, C2:5, C3:4, C4:0, C5:6, background:+10)

Key react-web state patterns:
  event-creation: useState + localStorage (draft) — 3-step form, exitGuard required
    React Router useBlocker for 'Discard event?' confirmation
    Draft key: 'event-draft:{tenantId}:{userId}'. auto-save: onBlur + 30s interval
  event-registration-open: useState — optimistic button, LOW
  event-registration-full: no useState — pure FlowStateSnapshot render

Stack coupling summary:
  T59: IMPL_VARIES — DI + language syntax varies
  T60: STACK_COUPLED — atomic capacity transaction differs per ORM
       php-wordpress: ⛔ INCOMPATIBLE ($wpdb race condition)
       php-server-rendered:client: ⛔ INCOMPATIBLE (no optimistic UI)
  T61: IMPL_VARIES — promotion + content safety pattern varies
  T62: IMPL_VARIES — counter increment + TTL mechanism varies

AF pipeline expectations:
  Phase A: 16 prompts + 4 contracts seeded
  Phase B: 4 afPipeline.run() calls — 6 P5 metrics captured per run
  Phase C: AF-9 score >= 80 for all four task types
  Phase E: >= 4 DPO triples captured, all promoted to INJECTED

Priority stacks: node-nestjs (server), react-web (client)
```

---

## SESSION FILES TO PRODUCE

```
FLOW-03-STATE.json               ← implementationMode: "af-pipeline"
                                    ⛔ Family + CF must be confirmed before Phase A

SESSION-FLOW-03-A.md             ← INJECT phase
                                    ⛔ FIRST: assert pre_allocated_ranges Family/CF confirmed
                                    Write EngineContracts for T59/T60/T61/T62
                                    Write 16 AF prompts (4 per task type)
                                    Seed to ES (contracts + prompts)
                                    Create event schemas, topology, test matrix
                                    FC-19/20/21 self-checks
                                    V0-MODE + V0-SCOPE + V29/V30/V31 checks
                                    NEW-A7: assert 16 prompts seeded

SESSION-FLOW-03-B.md             ← GENERATE phase
                                    Submit T59 to afPipeline.run()
                                    Submit T60 to afPipeline.run()
                                    Submit T61 to afPipeline.run()
                                    Submit T62 to afPipeline.run()
                                    Capture 6 P5 metrics per task type
                                    Verify 4 .service.ts files exist (AF-1 output)

SESSION-FLOW-03-C.md             ← JUDGE phase
                                    AF-6/7/8/9 scoring per task type
                                    PromptPatch iteration if score 60–79
                                    Escalate to Luba if score < 60
                                    All task types must reach score >= 80

SESSION-FLOW-03-D.md             ← INTEGRATE phase
                                    Wire generated services into engine module
                                    lint:naming gate (exit 0)
                                    npm test (server + client)
                                    Client integration tests (react-web): C1, C2, C3, C5, background

SESSION-FLOW-03-E.md             ← PROMOTE phase
                                    Promote T59/T60/T61/T62 to INJECTED
                                    DPO training data export (>= 4 triples)
                                    Final V0-MODE/V0-SCOPE/V29/V30/V31 verification
                                    lint:naming regression gate

docs/FLOW-03-REFERENCE.md        ← this document
```

---

## APPENDIX A — NON-PRIORITY STACKS (for FLOW-37 reference only)

Claude Code executing FLOW-03 phases MUST IGNORE this appendix entirely.

```
SERVER STACKS TO ADD IN FLOW-37:
  T59: python-fastapi, php-laravel, dotnet-aspnet, rust-axum — all IMPL_VARIES
       php-wordpress: degraded (no DI, $wpdb, NULL capacity guard needed)
  T60: python-fastapi (async txn), php-laravel (DB::transaction + lockForUpdate),
       dotnet-aspnet (EF Core row locking), rust-axum (sqlx transaction)
       — all STACK_COUPLED
       php-wordpress: ⛔ INCOMPATIBLE (already flagged)
  T61: python-fastapi, php-laravel — IMPL_VARIES
       php-wordpress: degraded (blocking wp_remote_post)
  T62: python-fastapi, php-laravel — IMPL_VARIES
       php-wordpress: degraded (update_option, no native TTL)

CLIENT STACKS TO ADD IN FLOW-37:
  angular:client — all topology nodes need:
    event-creation: BehaviorSubject + localStorage in EventDraftService,
      CanDeactivateFn exit guard, step components as separate routes
    event-registration-open: component-local Subject, LOW
    event-registration-full: component-local boolean, LOW
  android-kotlin:client — ViewModel + StateFlow, Room for draft persistence
  ios-swift:client — Combine Published + UserDefaults for draft

FULL ANALYSIS: see STACK-COUPLING-AUDIT-FLOW-01-04-v1.md
```
