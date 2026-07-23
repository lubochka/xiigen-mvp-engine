# FLOW-04: EVENT ATTENDANCE & MANAGEMENT — REFERENCE PLAN v4
## Prerequisites: FLOW-02 ACTIVE + FLOW-35 + FLOW-36 + FLOW-00 + FLOW-00.1 + FLOW-00.2 + FLOW-00.3 complete
## Date: 2026-03-23
## flow-completeness-checker v1.5: 33/33 ✅

---

## SCOPE DISCIPLINE (P13)

```
stackTargets:  ['node-nestjs']
clientTargets: ['react-web']

Content ONLY for declared targets. Non-priority stacks in APPENDIX A.
```

## IMPLEMENTATION MODE (P12)

```
implementationMode: "af-pipeline"
implementationModeReason: "User-facing flow. AF pipeline operational after FLOW-35."

WHO DOES WHAT:
  Claude Code writes:  EngineContracts, AF prompts (genesis/review/compliance/judge),
                       event schemas, topology, test matrix, Grafana dashboard, runbook
  XIIGen generates:    Service code (.service.ts files) via AF-1
  AF-6/7/8/9 judges:  Generated code quality, DNA compliance, security, scoring

Claude Code does NOT create .service.ts files for T63/T64/T65/T66.
Genesis prompts (Section 1–4) are AF-1 INPUT, not Claude Code instructions.
```

---

## WHAT CHANGED FROM v3 → v4

| What v3 had | What v4 changes |
|---|---|
| expo:platform in plan body; clientTargets: ['react-web'] only — P13 contradiction | expo:platform entries removed from plan body entirely. clientTargets confirmed as ['react-web'] (React.js). expo:platform moved to APPENDIX A for FLOW-37. Stack is React.js client + NestJS server. |
| Phase B gate captures 3 metrics (passed, score, promotionLevel) | Phase B gate captures all 6 P5 metrics: quality, cost, latencyMs, retryCount, dpoTriples, modelUsed |
| "See v1 for full content" — Phase A not self-contained | prerequisite_documents note added to KEY FACTS. FeedbackSubmissionFailed schema (13th) explicitly noted as written inline in Session A. |
| STATE.json Family/CF: soft "verify from parallel_execution table" language | Hardened to ⛔ REQUIRED strings + pre_allocation_gate field + Phase A guard script |
| T66 EventEnded source unresolved with no Phase A gate | STEP 0 added to SESSION-FLOW-04-A.md description: confirm EventEnded source before seeding T66 EngineContract |
| KEY FACTS +12 schema delta unexplained vs 13 schemas | Clarified: +12 tests for 13 schemas; FeedbackSubmissionFailed validated inline in T66 handler tests |
| check-in-active topology: expo:platform stateNotes in plan body | expo:platform node removed. check-in-active now only has react-web:client — html5-qrcode / @zxing/browser is the QR solution |
| T65 genesis prompt Section 4: expo:platform entry | Removed from Section 4. react-web QR implementation (html5-qrcode) retained in node-nestjs notes. expo stub moved to APPENDIX A. |
| T65 stackCoupling: expo:platform entry | Removed. check-in-active stateNotes only on react-web:client. |
| flow-completeness-checker V0-SCOPE: acknowledged expo exception | V0-SCOPE now passes cleanly — no out-of-scope entries in plan body |

---

## WHAT CHANGED FROM v2 → v3

| What v2 had | What v3 changes |
|-------------|-----------------|
| No implementationMode | implementationMode: "af-pipeline" (P12 ✅) |
| Phases A–E assumed Claude Code writes services | Phases follow INJECT → GENERATE → JUDGE → INTEGRATE → PROMOTE |
| Genesis prompts read as Claude Code instructions | Genesis prompts explicitly marked as AF-1 input |
| SESSION files: per-task-type phases (B=T63, C=T64, D=T65+T66) | SESSION files: afPipeline.run() per phase |
| Angular stateNotes on rsvp-pending, rsvp-confirmed, waitlist-holding, feedback-window-open | Removed — not in clientTargets (P13 ✅) |
| Android-kotlin + ios-swift stateNotes on check-in-active | Removed — not in clientTargets (P13 ✅) |
| php-server-rendered:client full entry in check-in-active topology node | Removed from topology — retained in V30 coupling annotations only |
| php-laravel:server full coupling entry on T63 | Removed — not in stackTargets (P13 ✅) |
| feedback-window-open rollbackEvent: "RSVPRejected" | Fixed → "FeedbackSubmissionFailed" (T66-specific event) |
| T66 EMITS: FeedbackWindowOpened, EventFeedbackSummary | Added FeedbackSubmissionFailed (compensation) |
| EventEnded source undocumented | Documented: system scheduler or FLOW-03 event lifecycle |
| client_test_delta: 16, breakdown C1:3+C2:6+C3:0+C4:6+C5:0 = 15 | Fixed: +16 (C1:3, C2:6, C3:0, C4:6, C5:0, background:+1) |
| Prerequisites missing FLOW-00.3 | Added FLOW-00.3 (required before af-pipeline mode) |
| Jira template: 4 of 6 factories named | All 6 factories named (added F206, F208) |
| flow-completeness-checker v1.3: 31/31 | flow-completeness-checker v1.5: 33/33 (V0-MODE, V0-SCOPE) |

V1–V28 content unchanged. Artifact numbers unchanged.

---

## WAVE ASSIGNMENT (unchanged)

```
FLOW-04: Wave 2 — parallel
  parallel_wave: 2
  wave: 2
  prerequisite: FLOW-02 ACTIVE
  downstream: FLOW-09 (AttendanceConfirmed → ticket refund eligibility)
              FLOW-10 (AttendanceConfirmed → review eligibility)
```

---

## STATE.json (v4)

```json
{
  "flow_id": "FLOW-04",
  "flow_name": "Event Attendance & Management",
  "parallel_wave": 2,
  "wave": 2,
  "current_phase": "session-0",
  "completed_phases": [],
  "test_baseline": null,
  "wave_baseline_entry": "__SET_BY_PRE_WAVE_2_ALLOCATION_SESSION__",
  "client_test_delta": 16,
  "stackTargets": ["node-nestjs"],
  "clientTargets": ["react-web"],
  "implementationMode": "af-pipeline",
  "implementationModeReason": "User-facing flow. AF pipeline operational after FLOW-35.",
  "pre_allocated_ranges": {
    "T": "T63–T66",
    "F": "F205–F210",
    "Family": "⛔ REQUIRED — confirm from parallel_execution table before Phase A",
    "CF": "⛔ REQUIRED — confirm from parallel_execution table before Phase A"
  },
  "pre_allocation_gate": "SESSION-FLOW-04-A.md MUST NOT execute until Family and CF values above are confirmed. Replace ⛔ strings with actual numbers from the parallel-wave pre-allocation session."
}
```

---

## ARTIFACT NUMBERS (unchanged)

```
Task types:  T63 RSVPOrchestrator
             T64 WaitlistCoordinator
             T65 CheckInValidator
             T66 PostEventFeedbackAggregator
Factories:   F205–F210 (6 factories)
BFA rules:   from parallel_execution table
Family:      from parallel_execution table
New archetypes: ATTENDANCE (T63, T64, T65). AGGREGATION already exists (T66).
New arbiters:   attendance::capacity-atomicity, attendance::idempotent-rsvp,
                attendance::waitlist-fairness, checkin::token-ttl,
                checkin::anti-replay, aggregation::feedback-window
```

---

## SERVICE FILE NAMES (naming-conventions-enforcer Rule 1)

These files are GENERATED BY AF-1, not written by Claude Code.
Names declared here so AF-1 output is validated against them.

Pattern: `{verb}-{domain-noun}.service.ts`
Directory: `engine/flows/event-attendance-management/`

| Task Type | ID | Service File | Class Name |
|-----------|----|--------------|-----------| 
| RSVPOrchestrator | T63 | `rsvp-orchestrator.service.ts` | `RSVPOrchestrator` |
| WaitlistCoordinator | T64 | `waitlist-coordinator.service.ts` | `WaitlistCoordinator` |
| CheckInValidator | T65 | `check-in-validator.service.ts` | `CheckInValidator` |
| PostEventFeedbackAggregator | T66 | `post-event-feedback-aggregator.service.ts` | `PostEventFeedbackAggregator` |

**Naming notes:**
- `RSVP` acronym retained — universally understood domain term, removing it produces meaningless names.
- `Coordinator` suffix (T64) — SK-430 approved exception. Waitlist management involves coordination between queue position, promotion TTL, and capacity release. `WaitlistCoordinator` is the established domain term.
- `post-event-` prefix (T66) — load-bearing temporal qualifier. `feedback-aggregator.service.ts` without the prefix would be ambiguous across multiple flows. Prefix retained per SK-430 Rule 1.

---

## PASSES 1–6 (unchanged from v1)

All event contracts (13 schemas — 12 from v1 + FeedbackSubmissionFailed added in v3),
retry/compensation, observability, E2E test matrix (12 scenarios) identical to v1
except for the FeedbackSubmissionFailed addition. See v1 for full content.

---

## PASS 3 — CLIENT STATE MAP (v3 — react-web only per P13)

### Node: rsvp-pending (T63 running)

```json
{
  "nodeId": "rsvp-pending",
  "serverTask": "T63",
  "clientState": {
    "screen": "EventDetailScreen (registering)",
    "humanTimescale": "2–5 seconds",
    "slaMs": 5000,
    "availableActions": [],
    "appReopenBehavior": "query FlowStateSnapshot → RSVPConfirmed→ConfirmedScreen, WaitlistJoined→WaitlistScreen with position, RSVPRejected→rejection+retry"
  },
  "stackCoupling": {
    "react-web:client": {
      "tier": "IMPL_VARIES",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_STATE_MODEL"],
      "neutralConcepts": [
        "spinner while RSVP processes (2–5s)",
        "no optimistic state — capacity atomicity required",
        "app reopen: derive screen from FlowStateSnapshot.currentStep"
      ],
      "implementationNotes": "useState<'idle'|'pending'|'confirmed'|'waitlisted'|'rejected'> in EventDetailScreen. On RSVP tap: set 'pending', show spinner. On RSVPConfirmed: navigate to ConfirmedScreen. On WaitlistJoined: navigate to WaitlistScreen. On RSVPRejected: set 'rejected', show error. On mount: fetch FlowStateSnapshot to restore state.",
      "stateNotes": {
        "stateHolderType": "useState",
        "stateHolderTypeReason": "RSVP result state is local to EventDetailScreen. No optimistic state — we wait for server confirmation before any UI transition. No cross-screen propagation needed.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "EventDetailScreen unmounts on navigation to ConfirmedScreen or WaitlistScreen.",
        "propagationRisk": "LOW",
        "propagationRiskReason": "Only EventDetailScreen reads RSVP pending state.",
        "routeGuardRequired": false,
        "exitGuardRequired": false
      }
    }
  }
}
```

### Node: rsvp-confirmed

```json
{
  "nodeId": "rsvp-confirmed",
  "serverTask": "T63",
  "clientState": {
    "screen": "AttendanceConfirmedScreen",
    "humanTimescale": "days (until event)",
    "slaMs": null,
    "availableActions": ["cancel-rsvp", "add-to-calendar"],
    "appReopenBehavior": "query FlowStateSnapshot → show confirmed. If event day: show QR. If event ended + window open: show feedback prompt."
  },
  "stackCoupling": {
    "react-web:client": {
      "tier": "IMPL_VARIES",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_STATE_MODEL"],
      "neutralConcepts": [
        "show confirmed state + QR on event day",
        "app reopen: derive screen state from FlowStateSnapshot"
      ],
      "implementationNotes": "On mount: fetch FlowStateSnapshot. Derive display from currentStep + event.startsAt. If event day and checkedIn=false: show QR code. No local state beyond transient load state.",
      "stateNotes": {
        "stateHolderType": "useState (transient — derived from FlowStateSnapshot)",
        "stateHolderTypeReason": "Confirmed state is fully server-derived. No ongoing mutations. Server is authoritative.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "Component-local. Unmounts on navigation.",
        "propagationRisk": "LOW",
        "propagationRiskReason": "Single AttendanceConfirmedScreen reads this state.",
        "routeGuardRequired": false
      }
    }
  }
}
```

### Node: waitlist-holding (T64 background)

```json
{
  "nodeId": "waitlist-holding",
  "serverTask": "T64",
  "clientState": {
    "screen": "WaitlistScreen",
    "humanTimescale": "minutes to days",
    "slaMs": null,
    "availableActions": ["leave-waitlist"],
    "appReopenBehavior": "query FlowStateSnapshot → restore position. WaitlistPromoted→promotion banner. WaitlistExpired→expired message."
  },
  "stackCoupling": {
    "react-web:client": {
      "tier": "STACK_COUPLED",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_STATE_MODEL", "CLIENT_LIFECYCLE"],
      "neutralConcepts": [
        "show waitlist position",
        "receive WaitlistPromoted push signal → navigate to ConfirmedScreen",
        "app reopen: restore position from FlowStateSnapshot"
      ],
      "implementationNotes": "WaitlistContext (feature-scoped React Context) at the waitlist router outlet. WebSocket subscription in context provider: on WaitlistPromoted push, update state and trigger navigation. WaitlistScreen reads position from context. On mount: fetch FlowStateSnapshot to restore position. Context provider unmounts when user leaves waitlist flow.",
      "stateNotes": {
        "stateHolderType": "useContext (WaitlistContext)",
        "stateHolderTypeReason": "T64 WaitlistPromoted push can arrive while user is on any screen within the waitlist flow. A feature-scoped Context provider allows the push to reach any mounted screen. Equivalent pattern to FLOW-02 matching-in-progress OnboardingContext — same reasoning applies.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "WaitlistContext provider at waitlist router outlet. Unmounts when user leaves the waitlist. Does not persist globally.",
        "propagationRisk": "MEDIUM",
        "propagationRiskReason": "2 consumers: WaitlistScreen (position display) and any promotion notification component shown while user is browsing elsewhere in the waitlist flow.",
        "routeGuardRequired": false,
        "exitGuardRequired": false,
        "stateConsumerMap": {
          "WaitlistScreen": "Primary. Reads waitlistPosition and promotedAt via useContext.",
          "WaitlistPromotionBanner": "If user navigated away from WaitlistScreen but is still in the waitlist outlet, banner shows on promotion push."
        },
        "note": "Same feature-scoped Context pattern as FLOW-02 matching-in-progress. T64 is a background process — WaitlistPromoted arrives asynchronously. useState in WaitlistScreen alone would miss the push if user navigated to a sub-screen."
      }
    }
  }
}
```

### Node: check-in-active (T65 day-of)

```json
{
  "nodeId": "check-in-active",
  "serverTask": "T65",
  "clientState": {
    "screen": "CheckInScreen",
    "humanTimescale": "seconds",
    "slaMs": 3000,
    "availableActions": ["CheckInRequested"],
    "appReopenBehavior": "query FlowStateSnapshot → CheckInConfirmed→ConfirmedScreen. Else→show QR for staff scan.",
    "errorState": {
      "slaBreached": { "screen": "CheckInTimeout", "availableActions": ["retry-check-in"] }
    }
  },
  "stackCoupling": {
    "react-web:client": {
      "tier": "STACK_COUPLED",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_FRAMEWORK", "PLUGIN_SANDBOX"],
      "neutralConcepts": [
        "activate camera, scan QR code",
        "send scanned token to server for validation",
        "no optimistic state — 60s TTL cannot be speculated client-side",
        "show CheckInConfirmed or CheckInRejected with reason"
      ],
      "implementationNotes": "html5-qrcode or @zxing/browser library. getUserMedia() for camera permission. On successful scan: send { qrToken } to server via POST /check-in (NOT a client event — immediate HTTP for TTL latency). Show spinner. On CheckInConfirmed: navigate to ConfirmedScreen. On CheckInRejected: show reason (token_expired / already_checked_in / not_on_list). useState<'scanning'|'validating'|'confirmed'|'rejected'|'error'>.",
      "stateNotes": {
        "stateHolderType": "useState",
        "stateHolderTypeReason": "Scan result state is local to CheckInScreen. No cross-screen propagation. The 60s TTL means the entire scan-to-result flow is seconds — no app reopen scenario during active scan.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "CheckInScreen unmounts on result navigation.",
        "propagationRisk": "LOW",
        "propagationRiskReason": "Only CheckInScreen reads scan state.",
        "routeGuardRequired": false,
        "exitGuardRequired": false,
        "note": "Camera permission prompt is browser-native (getUserMedia). No React state involved. Permission denial → show 'Camera required for check-in' message. QR scanning library handles the camera stream lifecycle — unmount the library instance on component unmount to release camera."
      }
    },
    "redis:platform": {
      "tier": "CONCEPT_NEUTRAL",
      "stackCategory": "platform-service",
      "dimensions": [],
      "neutralConcepts": [
        "anti-replay: SET NX key = hash(qrToken+eventId+tenantId), TTL=60s (MACHINE constant)",
        "prevents same QR token from checking in twice"
      ],
      "implementationNotes": "SET {tenantId}:checkin:{tokenHash} NX EX 60. If key exists: already_checked_in. All stacks access via IDatabaseService FABRIC. TTL is MACHINE constant — no FREEDOM override.",
      "note": "60s TTL on anti-replay matches QR token TTL exactly. Token expires the same moment the anti-replay key expires — window is consistent."
    },
    "jest:platform": {
      "tier": "IMPL_VARIES",
      "stackCategory": "test-runner",
      "dimensions": ["TEST_FRAMEWORK"],
      "neutralConcepts": ["T007 virtualClock: QR token expires at 61s", "anti-replay: second scan rejected"],
      "implementationNotes": "T007: jest.useFakeTimers(), advance 61s. Mock F207 to simulate TTL expiry. Assert CheckInRejected(token_expired). T006: Mock F207 anti-replay rejection. Assert CheckInRejected(already_checked_in). virtualClock: true for T007."
    }
  }
}
```

### Node: feedback-window-open (T66 post-event)

```json
{
  "nodeId": "feedback-window-open",
  "serverTask": "T66",
  "clientState": {
    "screen": "PostEventScreen",
    "humanTimescale": "up to 7 days",
    "slaMs": null,
    "availableActions": ["FeedbackSubmitted"],
    "optimisticActions": {
      "FeedbackSubmitted": {
        "optimisticState": { "submitButton": "disabled", "label": "Submitting..." },
        "confirmationEvent": "EventFeedbackSummary",
        "rollbackEvent": "FeedbackSubmissionFailed",
        "rollbackState": { "submitButton": "enabled", "label": "Submit feedback", "error": "Feedback could not be submitted." }
      }
    },
    "appReopenBehavior": "query FlowStateSnapshot → if window open: show form. If submitted: show thank you. If closed: show 'Feedback window closed'."
  },
  "stackCoupling": {
    "react-web:client": {
      "tier": "IMPL_VARIES",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_STATE_MODEL"],
      "neutralConcepts": [
        "FeedbackSubmitted: optimistic button disable, rollback on FeedbackSubmissionFailed",
        "T66 background push opens feedback window → show prompt",
        "app reopen: derive form / thank-you / closed from FlowStateSnapshot"
      ],
      "implementationNotes": "useState<'idle'|'submitting'|'submitted'|'failed'> for button. On submit tap: set 'submitting'. On EventFeedbackSummary: set 'submitted'. On FeedbackSubmissionFailed (server rejection): set 'failed', re-enable. FeedbackWindowOpened push received via WebSocket: if user on PostEventScreen, no action needed (FlowStateSnapshot already shows window open). If user elsewhere: notification or badge update.",
      "stateNotes": {
        "stateHolderType": "useState",
        "stateHolderTypeReason": "Feedback submit button state is local to PostEventScreen. FeedbackWindowOpened push updates FlowStateSnapshot which is fetched on mount — no ongoing cross-screen state propagation needed.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "PostEventScreen component-local.",
        "propagationRisk": "LOW",
        "propagationRiskReason": "Only PostEventScreen reads feedback submit state.",
        "routeGuardRequired": false,
        "exitGuardRequired": false
      }
    }
  }
}
```

### clientArchitecture section (unchanged from v1)

```json
"clientArchitecture": {
  "requiresDraftState": false,
  "draftSteps": null,
  "offlineQueue": {
    "queueable": [],
    "notQueueable": ["RSVPRequested", "CheckInRequested"],
    "notQueueableReason": {
      "RSVPRequested": "Capacity decrement requires live connection — queueing risks oversell",
      "CheckInRequested": "QR token 60s TTL — queued replay arrives expired"
    }
  },
  "backgroundSteps": [
    {
      "serverTask": "T66",
      "runsWhileUserViews": "PostEventScreen or any screen",
      "signalType": "realtime-push",
      "signalText": null
    }
  ]
}
```

---

## PASS 7 — GENESIS PROMPTS (AF-1 pipeline input — NOT Claude Code instructions)

These prompts are seeded to ES in Phase A (INJECT). AF-3 retrieves them.
AF-1 generates code from them. Claude Code does NOT read these and type
the service code manually.

### T63 RSVPOrchestrator — HybridGenesisPrompt (AF-1 input)

```
TASK TYPE: T63 | FLOW-04 — Event Attendance & Management

SECTION 1 — NEUTRAL IRON RULES (AF-7 validates these)
  IR-1: F209.decrement(capacity) AND F205.create(attendeeRecord) MUST be
        a single atomic operation. Separate check-then-write = score-0 violation
        (attendance::capacity-atomicity). No gap between check and write.
  IR-2: attendeeId MUST equal hash(userId + eventId + tenantId). Never
        a raw userId. Prevents PII linkage in downstream events.
  IR-3: RegistrationClosed gate MUST be checked BEFORE F209.decrement.
        If closed: emit RSVPRejected(registration_closed) immediately.
  IR-4: TicketPurchaseCompleted entry path MUST skip F209.decrement —
        seat is already reserved by payment. Only creates the attendee record.
  IR-5: Group RSVP (attendeeCount > 1): F209 decremented by attendeeCount
        atomically. Partial group success is not permitted.
  IR-6: DNA-8: storeDocument(RSVPConfirmed) BEFORE enqueue().
  IR-7: DNA-5: tenantId on all writes. Capacity counter is per-event per-tenant.
  IR-8: Idempotency: SETNX key = hash(tenantId + eventId + attendeeId).
        If key exists: return existing RSVPConfirmed (idempotent replay, T005).

SECTION 2 — CONCEPT DESCRIPTION (AF-2 uses for planning)
  RSVPOrchestrator is the atomic entry gate for event attendance. It handles
  two entry paths: free RSVP (RSVPRequested from client) and paid tickets
  (TicketPurchaseCompleted from FLOW-09). It enforces capacity atomically,
  manages group registrations, and routes to the waitlist when capacity is full.
  The attendeeId it creates is the identity token used throughout the event
  lifecycle for check-in, feedback, and review eligibility.

SECTION 3 — EVENT CONTRACTS (AF-6 validates these)
  CONSUMES: RSVPRequested (client event),
            TicketPurchaseCompleted (QUEUE FABRIC — from FLOW-09)
  EMITS:    RSVPConfirmed, WaitlistJoined, RSVPRejected (compensation)
  INTEGRATION BOUNDARY:
    F205 IAttendanceService:  INJECTABLE
    F209 ICapacityService:    INJECTABLE — atomic strategy (FREEDOM config)
    F210 IAttendanceAuditService: PLATFORM-ONLY

SECTION 4 — STACK IMPLEMENTATIONS (AF-1 reads per stackTargets)

  node-nestjs:server ← PRIORITY (AF-1 generates from this)
    "Generate a NestJS @Injectable() class named RSVPOrchestrator extending
    MicroserviceBase. Inject F205, F209, F210 via constructor.
    RegistrationClosed gate: GET event status (F205) — if closed, emit RSVPRejected.
    SETNX idempotency (IR-8) before any write.
    Atomic: await F209.decrementAndCreate(tenantId, eventId, attendeeId, attendeeCount).
    This encapsulates the atomic strategy — DB transaction or Redis MULTI/EXEC per
    FREEDOM config. On capacity full: WaitlistJoined. On success: storeDocument + enqueue.
    TicketPurchaseCompleted path: skip F209, call F205.create() only.
    Return Promise<DataProcessResult<RSVPResult>>."

  python-fastapi:server  → [Stub — FLOW-37]
  php-laravel:server     → [Stub — FLOW-37]
  php-wordpress:server   → ⛔ INCOMPATIBLE — $wpdb no atomic read-modify-write
  dotnet-aspnet:server   → [Stub — FLOW-37]

  redis:platform — CONCEPT_NEUTRAL
    "SETNX idempotency key (IR-8): {tenantId}:rsvp:{eventId}:{attendeeId}. TTL 24h.
    Alternative atomic strategy: MULTI/EXEC for capacity decrement (FREEDOM config).
    All stacks access via IDatabaseService FABRIC."

  jest:platform — CONCEPT_NEUTRAL
    "Capacity race test (T003): inject two concurrent RSVPs for last seat.
    Assert exactly 1 RSVPConfirmed + 1 RSVPRejected.
    Idempotency test (T005): second call with same attendeeId returns RSVPConfirmed."
```

### T64 WaitlistCoordinator — HybridGenesisPrompt (AF-1 input)

```
TASK TYPE: T64 | FLOW-04 — Event Attendance & Management

SECTION 1 — NEUTRAL IRON RULES (AF-7 validates these)
  IR-1: Waitlist order is FIFO — promotion MUST use join timestamp, millisecond
        precision. Any priority override without explicit tenant config = score-0
        (attendance::waitlist-fairness arbiter).
  IR-2: Promotion TTL MUST come from FREEDOM config key
        'flow04_promotion_ttl_minutes'. Default 120. Never hardcoded.
  IR-3: WaitlistExpired emitted when event starts before promotion completes.
        Capacity is returned to pool on expiry.
  IR-4: promotionInProgress lock per eventId BEFORE promoting any attendee.
        Prevents double-promotion if two RSVPCancelled events arrive simultaneously.
  IR-5: DNA-8: storeDocument(WaitlistPromoted) BEFORE enqueue().
  IR-6: Idempotency: SETNX key = hash(tenantId + eventId + attendeeId + 'promotion').

SECTION 2 — CONCEPT DESCRIPTION (AF-2 uses for planning)
  WaitlistCoordinator is event-driven. When a capacity slot is freed
  (RSVPCancelled) it promotes the first-in-queue attendee via FIFO. The
  promoted attendee has a TTL to confirm — if they don't, the slot returns
  to the pool and the next attendee is promoted. When the event starts before
  any promotion occurs, WaitlistExpired is emitted for remaining waitlist members.

SECTION 3 — EVENT CONTRACTS (AF-6 validates these)
  CONSUMES: RSVPCancelled (QUEUE FABRIC — compensation from T63)
  EMITS:    WaitlistPromoted, WaitlistExpired (compensation)
  INTEGRATION BOUNDARY:
    F206 IWaitlistService:   INJECTABLE — FIFO queue, position, promotion
    F205 IAttendanceService: INJECTABLE — attendee record update
    F209 ICapacityService:   INJECTABLE — slot return on expiry or cancellation

SECTION 4 — STACK IMPLEMENTATIONS (AF-1 reads per stackTargets)

  node-nestjs:server ← PRIORITY (AF-1 generates from this)
    "Generate a NestJS @Injectable() class named WaitlistCoordinator extending
    MicroserviceBase. Inject F206, F205, F209 via constructor.
    On RSVPCancelled: F209.increment(tenantId, eventId) to return slot.
    Acquire promotionInProgress lock (IR-4). Get first FIFO candidate from F206.
    If none: release lock, return success. If candidate: F205.updateStatus('promoted'),
    storeDocument(WaitlistPromoted) then enqueue. TTL from FREEDOM config (IR-2).
    SETNX idempotency (IR-6). Return Promise<DataProcessResult<PromotionResult>>."

  python-fastapi:server  → [Stub — FLOW-37]
  php-laravel:server     → [Stub — FLOW-37]

  redis:platform — CONCEPT_NEUTRAL
    "promotionInProgress lock: SET {tenantId}:waitlist-lock:{eventId} NX EX 30.
    Idempotency key (IR-6): {tenantId}:promoted:{eventId}:{attendeeId}. TTL 24h.
    FIFO ordering: sorted set scored by join timestamp (milliseconds)."

  jest:platform — CONCEPT_NEUTRAL
    "T004: cancel → assert WaitlistPromoted for first-in-queue.
    Mock concurrent RSVPCancelled to test promotionInProgress lock (IR-4)."
```

### T65 CheckInValidator — HybridGenesisPrompt (AF-1 input)

```
TASK TYPE: T65 | FLOW-04 — Event Attendance & Management

SECTION 1 — NEUTRAL IRON RULES (AF-7 validates these)
  IR-1: QR token TTL is 60 seconds — MACHINE constant. No tenant override.
        No FREEDOM config key. This is a security constraint, not a business
        parameter. Any implementation with a configurable TTL = score-0.
  IR-2: Validation order is MACHINE-fixed and MUST NOT be reordered:
        (1) TTL check → (2) anti-replay check → (3) attendee on confirmed list
        → (4) F210 audit write (outbox before CheckInConfirmed).
        Reordering any step = score-0.
  IR-3: qrToken MUST be logged as sha256(qrToken) ONLY. Never raw token in logs.
  IR-4: early_check_in_window_minutes is FREEDOM config (default 30).
        The event must have started (or be within the early window) for
        CheckInRequested to be accepted. Reject with 'event_not_started' otherwise.
  IR-5: DNA-8: F210 audit write (outbox) BEFORE CheckInConfirmed enqueue.
  IR-6: DNA-5: tenantId on all Redis and database keys.

SECTION 2 — CONCEPT DESCRIPTION (AF-2 uses for planning)
  CheckInValidator processes QR codes scanned at event entry. It enforces
  the 60-second token TTL as a security hard limit, prevents replay attacks
  via a Redis anti-replay key, verifies the attendee is on the confirmed list,
  and records the check-in in the immutable audit trail before emitting
  CheckInConfirmed. The validation order is strict and cannot be changed
  by configuration.

SECTION 3 — EVENT CONTRACTS (AF-6 validates these)
  CONSUMES: CheckInRequested (client event)
  EMITS:    CheckInConfirmed, CheckInRejected
  INTEGRATION BOUNDARY:
    F207 ICheckInService:        INJECTABLE — token validation, QR generation
    F205 IAttendanceService:     INJECTABLE — confirmed list lookup
    F210 IAttendanceAuditService: PLATFORM-ONLY

SECTION 4 — STACK IMPLEMENTATIONS (AF-1 reads per stackTargets)

  node-nestjs:server ← PRIORITY (AF-1 generates from this)
    "Generate a NestJS @Injectable() class named CheckInValidator extending
    MicroserviceBase. Inject F207, F205, F210 via constructor.
    Step 1: TTL check — F207.validateTTL(qrToken) — 60s MACHINE constant.
    Step 2: anti-replay — Redis SET NX (see redis:platform entry).
    Step 3: attendee list — F205.isConfirmed(tenantId, eventId, attendeeId).
    Step 4: F210.write(auditRecord) — outbox BEFORE CheckInConfirmed.
    On any step failure: CheckInRejected with reason code.
    Token in logs: sha256(qrToken) only (IR-3).
    Return Promise<DataProcessResult<CheckInResult>>."

  python-fastapi:server  → [Stub — FLOW-37]
  php-laravel:server     → [Stub — FLOW-37]
  php-wordpress:server   → [Stub — degraded: wp_transient anti-replay, less reliable than Redis NX]

  redis:platform — CONCEPT_NEUTRAL (anti-replay is the core mechanism)
    "SET {tenantId}:checkin:{sha256(qrToken+eventId)} NX EX 60.
    If key exists: already_checked_in.
    60s TTL matches token lifetime exactly — MACHINE constant, not configurable.
    All stacks access via IDatabaseService FABRIC."

  jest:platform — IMPL_VARIES [TEST_FRAMEWORK]
    "T007 virtualClock: jest.useFakeTimers(), advance 61s. Assert CheckInRejected(token_expired).
    T006 anti-replay: second call with same tokenHash → CheckInRejected(already_checked_in).
    virtualClock: true for T007."

  github-actions:platform — CONCEPT_NEUTRAL
    "Standard CI gate. No FLOW-04-specific CI additions."

  react-native (expo) → [Stub — APPENDIX A / FLOW-37]
    QR: expo-barcode-scanner or expo-camera. Camera permissions via app.json.
    Not in scope for this phase (clientTargets: ['react-web']).
```

### T66 PostEventFeedbackAggregator — HybridGenesisPrompt (AF-1 input)

```
TASK TYPE: T66 | FLOW-04 — Event Attendance & Management

SECTION 1 — NEUTRAL IRON RULES (AF-7 validates these)
  IR-1: FeedbackWindowOpened MUST NOT emit before EventEnded is received.
        Premature window opening (before event completes) = score-0.
        aggregation::feedback-window arbiter enforces this gate.
  IR-2: feedback_window_days MUST come from FREEDOM config. Default 7.
        Never hardcode the 7-day window duration.
  IR-3: FeedbackSubmitted MUST be rejected if submitted outside the window.
        After window closes: emit FeedbackSubmissionFailed with reason code
        'window_closed'. Do not silently discard.
  IR-4: Rating MUST be in [1, 5] integer range. Reject immediately with
        FeedbackSubmissionFailed(invalid_rating) for out-of-range values.
  IR-5: FeedbackSubmitted ONLY accepted from confirmed attendees (F205 check).
        Non-attendees: FeedbackSubmissionFailed(not_confirmed_attendee).
  IR-6: DNA-8: storeDocument(EventFeedbackSummary) BEFORE enqueue().
  IR-7: Idempotency: SETNX key = hash(tenantId + eventId + attendeeId + 'feedback').
        One submission per attendee per event.

SECTION 2 — CONCEPT DESCRIPTION (AF-2 uses for planning)
  PostEventFeedbackAggregator opens a feedback window after an event ends,
  collects ratings from confirmed attendees, validates submissions against
  the window and attendee list, and aggregates results into an EventFeedbackSummary.
  The window is a time-bounded, access-controlled collection — it opens exactly
  on EventEnded and closes after the configured number of days.

SECTION 3 — EVENT CONTRACTS (AF-6 validates these)
  CONSUMES: EventEnded (QUEUE FABRIC — emitted by system event scheduler when
            event.endsAt passes. If FLOW-03 T59 manages event lifecycle
            transitions, EventEnded is added to T59's EMITS. Otherwise,
            EventEnded is emitted by the platform scheduler — verify source
            in FLOW-03 re-review session.)
            FeedbackSubmitted (client event)
  EMITS:    FeedbackWindowOpened, EventFeedbackSummary,
            FeedbackSubmissionFailed (compensation — window closed, invalid rating,
            non-attendee, or server error)
  INTEGRATION BOUNDARY:
    F208 IFeedbackService:   INJECTABLE — submission, aggregation, window tracking
    F205 IAttendanceService: INJECTABLE — confirmed attendee verification

SECTION 4 — STACK IMPLEMENTATIONS (AF-1 reads per stackTargets)

  node-nestjs:server ← PRIORITY (AF-1 generates from this)
    "Generate a NestJS @Injectable() class named PostEventFeedbackAggregator
    extending MicroserviceBase. Inject F208, F205 via constructor.
    On EventEnded: storeDocument(FeedbackWindowOpened) then enqueue (IR-1).
    Schedule window close: Bull delayed job at windowClosesAt timestamp.
    On FeedbackSubmitted: check window open (IR-3), check attendee (IR-5),
    validate rating in [1,5] (IR-4). On any failure: emit FeedbackSubmissionFailed
    with reason code. SETNX idempotency (IR-7).
    Aggregate via F208.aggregate(). storeDocument(EventFeedbackSummary) then enqueue.
    Return Promise<DataProcessResult<FeedbackResult>>."

  python-fastapi:server  → [Stub — FLOW-37]
  php-laravel:server     → [Stub — FLOW-37]
  php-wordpress:server   → [Stub — degraded: wp_schedule_single_event for window close]

  redis:platform — CONCEPT_NEUTRAL
    "SETNX idempotency (IR-7): {tenantId}:feedback:{eventId}:{attendeeId}. TTL 8 days.
    Window open flag: {tenantId}:feedback-window:{eventId} SET NX EX {window_seconds}.
    All stacks via IDatabaseService FABRIC."

  jest:platform — IMPL_VARIES [TEST_FRAMEWORK]
    "T009 virtualClock: jest.useFakeTimers(), advance 7 days + 1 second.
    Assert FeedbackSubmitted rejected with FeedbackSubmissionFailed(window_closed).
    Mock F205 to test non-attendee rejection (IR-5). virtualClock: true for T009."
```

---

## AF PROMPT DEFINITIONS (seeded in Phase A — NEW-A7)

For each task type, 4 prompts seeded to ES via P22 standard:

| Task Type | promptId pattern | AF station | Purpose |
|-----------|-----------------|------------|---------|
| T63 | event-attendance::T63::genesis | AF-1 | Code generation instruction (Section 4 content) |
| T63 | event-attendance::T63::review | AF-6 | Code review criteria (iron rules + DNA) |
| T63 | event-attendance::T63::compliance | AF-7 | DNA + P1-P13 validation rules |
| T63 | event-attendance::T63::judge | AF-9 | 5-component scoring + iron rules |
| T64 | event-attendance::T64::genesis | AF-1 | (same pattern) |
| T64 | event-attendance::T64::review | AF-6 | |
| T64 | event-attendance::T64::compliance | AF-7 | |
| T64 | event-attendance::T64::judge | AF-9 | |
| T65 | event-attendance::T65::genesis | AF-1 | |
| T65 | event-attendance::T65::review | AF-6 | |
| T65 | event-attendance::T65::compliance | AF-7 | |
| T65 | event-attendance::T65::judge | AF-9 | |
| T66 | event-attendance::T66::genesis | AF-1 | |
| T66 | event-attendance::T66::review | AF-6 | |
| T66 | event-attendance::T66::compliance | AF-7 | |
| T66 | event-attendance::T66::judge | AF-9 | |

Total: 16 prompts seeded. Domain: `event-attendance`. connectionType: `FLOW_SCOPED`.

---

## PASS 7.5 — STACK COUPLING ANNOTATIONS (V29 — priority stack + platforms only)

### T63 RSVPOrchestrator

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'STACK_COUPLED',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DATA_ACCESS', 'SERVER_DI_FRAMEWORK'],
      neutralConcepts: [
        'atomic F209.decrement + F205.create (IR-1)',
        'attendeeId = hash(userId+eventId+tenantId) (IR-2)',
        'RegistrationClosed gate before decrement (IR-3)',
        'TicketPurchaseCompleted skips F209 (IR-4)',
        'group RSVP: atomic by attendeeCount (IR-5)',
        'DNA-8 (IR-6)', 'DNA-5 (IR-7)', 'SETNX idempotency (IR-8)',
      ],
      implementationNotes: 'NestJS + F209.decrementAndCreate() encapsulates ORM transaction or Redis MULTI/EXEC. FREEDOM config selects strategy.',
    },
    'php-wordpress:server': {
      tier: 'INCOMPATIBLE',
      incompatible: true,
      incompatibleReason: '$wpdb does not support atomic read-modify-write. Oversell race between capacity check and decrement.',
      mitigation: 'Use php-laravel with DB::transaction() + lockForUpdate(). If WordPress required: external Redis MULTI/EXEC.',
    },
    'redis:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['SETNX idempotency (IR-8)', 'optional MULTI/EXEC atomic strategy'],
      implementationNotes: 'key={tenantId}:rsvp:{eventId}:{attendeeId}. TTL 24h.',
    },
    'jest:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'test-runner',
      dimensions: [],
      neutralConcepts: ['capacity race test (T003)', 'idempotency test (T005)'],
      implementationNotes: 'Mock F209.decrementAndCreate to simulate race rejection on second concurrent call.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
}
```

### T64 WaitlistCoordinator

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'IMPL_VARIES',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_LANGUAGE'],
      neutralConcepts: [
        'FIFO promotion via join timestamp (IR-1)',
        'promotion TTL from FREEDOM config (IR-2)',
        'WaitlistExpired if event starts before promotion (IR-3)',
        'promotionInProgress lock per eventId (IR-4)',
        'DNA-8 (IR-5)', 'SETNX idempotency (IR-6)',
      ],
      implementationNotes: 'NestJS @Injectable(). Redis lock for promotionInProgress. F206 FIFO get. F209.increment on slot return.',
    },
    'redis:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['promotionInProgress distributed lock', 'FIFO sorted set by join timestamp', 'SETNX idempotency'],
      implementationNotes: 'Lock: SET {tenantId}:waitlist-lock:{eventId} NX EX 30. FIFO: sorted set keyed by join timestamp (ms).',
    },
    'jest:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'test-runner',
      dimensions: [],
      neutralConcepts: ['T004 cancel → WaitlistPromoted for first-in-queue', 'concurrent cancellation lock test'],
      implementationNotes: 'Standard Jest. Mock F206.getNextFIFO to test order.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
}
```

### T65 CheckInValidator

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'STACK_COUPLED',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_LANGUAGE'],
      neutralConcepts: [
        'QR token TTL 60s MACHINE constant (IR-1)',
        'validation order MACHINE-fixed: TTL→anti-replay→list→audit (IR-2)',
        'qrToken logged as sha256 only (IR-3)',
        'early_check_in_window from FREEDOM config (IR-4)',
        'DNA-8 outbox before CheckInConfirmed (IR-5)',
      ],
      implementationNotes: 'NestJS @Injectable(). 4-step sequence, no reordering. F207.validateTTL() → Redis NX → F205.isConfirmed() → F210.write() → enqueue.',
    },
    'php-server-rendered:client': {
      tier: 'INCOMPATIBLE',
      incompatible: true,
      incompatibleReason: 'QR scanning requires camera access (getUserMedia / native API). No client camera API without a JavaScript layer.',
      mitigation: 'React/Vue island for CheckIn screen. Manual token entry as degraded UX.',
    },
    'redis:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['anti-replay NX key (IR-2 step 2)', '60s TTL matches token lifetime — MACHINE constant'],
      implementationNotes: 'SET {tenantId}:checkin:{sha256(qrToken+eventId)} NX EX 60. TTL is NOT configurable.',
    },
    'jest:platform': {
      tier: 'IMPL_VARIES',
      stackCategory: 'test-runner',
      dimensions: ['TEST_FRAMEWORK'],
      neutralConcepts: ['T007 QR TTL expiry (virtualClock)', 'T006 anti-replay'],
      implementationNotes: 'T007: jest.useFakeTimers() + advance 61s. virtualClock: true.',
    },
    'github-actions:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'ci-cd',
      dimensions: [],
      neutralConcepts: ['standard CI gate'],
      implementationNotes: 'lint:naming, tsc --noEmit, npm test. No FLOW-04-specific CI additions.',
    },
    // expo:platform → APPENDIX A / FLOW-37 (clientTargets: ['react-web'] only)
  },
  supportedServerStacks: ['node-nestjs'],
}
```

### T66 PostEventFeedbackAggregator

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'IMPL_VARIES',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_ASYNC_MODEL'],
      neutralConcepts: [
        'window opens ONLY on EventEnded (IR-1)',
        'window duration from FREEDOM config (IR-2)',
        'reject submission outside window with FeedbackSubmissionFailed (IR-3)',
        'rating [1,5] integer only (IR-4)',
        'confirmed attendees only (IR-5)',
        'DNA-8 (IR-6)', 'SETNX idempotency (IR-7)',
      ],
      implementationNotes: 'NestJS @Injectable(). Bull delayed job for window close. F208 aggregation. F205 attendee gate.',
    },
    'redis:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['SETNX idempotency (IR-7)', 'window open flag with TTL'],
      implementationNotes: 'Idempotency key: {tenantId}:feedback:{eventId}:{attendeeId}. TTL 8 days. Window flag: {tenantId}:feedback-window:{eventId}.',
    },
    'jest:platform': {
      tier: 'IMPL_VARIES',
      stackCategory: 'test-runner',
      dimensions: ['TEST_FRAMEWORK'],
      neutralConcepts: ['T009 window close (virtualClock 7 days)', 'non-attendee rejection test'],
      implementationNotes: 'T009: jest.useFakeTimers() + advance 7d+1s. Assert FeedbackSubmissionFailed(window_closed). virtualClock: true.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
}
```

---

## ARBITER COUPLING ANNOTATIONS (v3)

| Arbiter | Business Rule | Code Check Tier |
|---------|--------------|----------------|
| attendance::capacity-atomicity | F209+F205 = one atomic operation | 🔴 STACK_COUPLED [DATA_ACCESS] — ORM txn vs Redis MULTI/EXEC vs $wpdb (INCOMPATIBLE) |
| attendance::idempotent-rsvp | duplicate RSVP = same result | ⚡ IMPL_VARIES [SL] — SETNX pattern, syntax differs |
| attendance::waitlist-fairness | FIFO order enforced by timestamp | ✅ CONCEPT_NEUTRAL — timestamp field presence check |
| checkin::token-ttl | 60s TTL is MACHINE constant | ✅ CONCEPT_NEUTRAL — no FREEDOM config key permitted |
| checkin::anti-replay | second scan rejected (already_checked_in) | 🔴 STACK_COUPLED [DATA_ACCESS] — Redis NX vs wp_transient (degraded) |
| aggregation::feedback-window | window opens only on EventEnded | ⚡ IMPL_VARIES [SL] — gate guard code shape differs per language |

---

## PHASE STRUCTURE (af-pipeline mode)

```
Phase A: INJECT
  Claude Code writes: EngineContracts, event schemas (13 — incl. FeedbackSubmissionFailed),
    topology, test matrix, dashboard, runbook. Seeds 16 AF prompts + 4 EngineContracts to ES.
  Claude Code does NOT write: .service.ts files

Phase B: GENERATE
  Submit T63/T64/T65/T66 contracts to FlowOrchestrator via afPipeline.run().
  AF-1 generates service code from genesis prompts + RAG context.
  Capture: result.passed, result.score, result.promotionLevel per task type.

Phase C: JUDGE + ITERATE
  AF-6 code review, AF-7 DNA compliance, AF-8 security, AF-9 scoring.
  If score >= 80: proceed to Phase D.
  If 60-79: PromptOps generates PromptPatch, re-run Phase B.
  If < 60: escalate to Luba.

Phase D: INTEGRATE
  Wire generated services into engine module.
  Run npm run lint:naming (exit 0).
  Run npm test — verify generated code compiles and passes.
  Client integration tests (react-web).

Phase E: PROMOTE
  Promote generated services to INJECTED level.
  Capture DPO training data (prompt, chosen output, rejected output, scores).
  Final V0-MODE/V0-SCOPE/V29/V30/V31 verification.
  lint:naming regression gate.
```

---

## PHASE A GATE (INJECT)

```bash
# PRE-ALLOCATION GUARD — must pass before any file creation
node -e "
const state = JSON.parse(require('fs').readFileSync('FLOW-04-STATE.json'));
const { Family, CF } = state.pre_allocated_ranges;
if (Family.startsWith('⛔') || CF.startsWith('⛔'))
  throw new Error('BLOCKED: Family/CF ranges not confirmed. Update STATE.json from pre-allocation session first.');
console.log('✅ Pre-allocation confirmed — Family:', Family, 'CF:', CF);
"

# NEW-A1 through NEW-A6: event schemas, topology, test matrix, dashboard, runbook
# (same checks as v1)

# NEW-A7: AF prompts seeded
node -e "
const es = /* ES client */;
const count = await es.count({ index: 'xiigen-prompts', body: {
  query: { bool: { must: [
    { term: { 'flowId.keyword': 'FLOW-04' }},
    { term: { 'connectionType.keyword': 'FLOW_SCOPED' }}
  ]}}
}});
if (count.body.count !== 16) throw new Error('Expected 16 AF prompts, got ' + count.body.count);
console.log('✅ NEW-A7: 16 AF prompts seeded for FLOW-04');
"

# EngineContracts seeded
node -e "
const es = /* ES client */;
for (const id of ['T63','T64','T65','T66']) {
  const doc = await es.get({ index: 'xiigen-engine-contracts', id });
  if (!doc.body._source.stackCoupling) throw new Error(id + ' missing stackCoupling');
  console.log('✅', id, 'EngineContract seeded with stackCoupling');
}
"

# V29 — stackCoupling on T63/T64/T65/T66
node -e "
const reg = /* load TaskTypeRegistry */;
['T63','T64','T65','T66'].forEach(id => {
  const c = reg.get(id).data;
  if (!c.stackCoupling) throw new Error(id + ' missing stackCoupling');
  if (!c.stackCoupling.entries['node-nestjs:server'])
    throw new Error(id + ' missing priority server entry');
  console.log('✅', id, 'stackCoupling OK');
});
"

# V30 — INCOMPATIBLE flags
node -e "
const reg = /* load TaskTypeRegistry */;
const t63 = reg.get('T63').data;
const wp63 = t63.stackCoupling.entries['php-wordpress:server'];
if (!wp63?.incompatible) throw new Error('T63 php-wordpress INCOMPATIBLE missing');
if (!wp63?.mitigation) throw new Error('T63 php-wordpress mitigation missing');

const t65 = reg.get('T65').data;
const ssr65 = t65.stackCoupling.entries['php-server-rendered:client'];
if (!ssr65?.incompatible) throw new Error('T65 php-server-rendered:client INCOMPATIBLE missing');
console.log('✅ T63 + T65 INCOMPATIBLE flags present with mitigations');
"

# V31 — stateNotes on react-web:client only (clientTargets: ['react-web'])
python3 -c "
import json
t = json.load(open('contracts/topologies/FLOW-04.topology.json'))
nodes = {n['nodeId']: n for n in t.get('nodes', [])}

required = [
  'rsvp-pending', 'rsvp-confirmed', 'waitlist-holding',
  'check-in-active', 'feedback-window-open'
]
for nid in required:
  n = nodes[nid]
  react = n['stackCoupling']['react-web:client']
  assert react.get('stateNotes'), f'{nid} missing react-web stateNotes'
  assert react['stateNotes'].get('stateHolderType'), f'{nid} missing stateHolderType'
  print(f'✅ {nid}: {react[\"stateNotes\"][\"stateHolderType\"]}')

# Verify expo:platform NOT in plan-body topology nodes (clientTargets: react-web only)
ci = nodes['check-in-active']
assert 'expo:platform' not in ci['stackCoupling'], \
  'check-in-active must not have expo:platform in topology (moved to APPENDIX A)'
assert 'redis:platform' in ci['stackCoupling'], 'check-in-active missing redis:platform'
print('✅ check-in-active: react-web:client + redis:platform. No expo:platform in topology.')
"

# naming-conventions-enforcer gate
npm run lint:naming   # exit 0
```

---

## PHASE B GATE (GENERATE)

```bash
# Submit each task type to AF pipeline — capture all 6 P5 metrics per run
for taskType in T63 T64 T65 T66; do
  node -e "
  const result = await afPipeline.run({
    tenantId: testTenantId,
    taskType: '${taskType}',
    spec: /* load EngineContract for ${taskType} */
  });

  // P5 — 6 metrics captured per run
  const metrics = {
    taskType:       '${taskType}',
    passed:         result.passed,
    quality:        result.score,       // AF-9 quality score 0–100
    cost:           result.costUsd,     // token cost in USD
    latencyMs:      result.latencyMs,   // end-to-end pipeline latency
    retryCount:     result.retryCount,  // AF iteration count before pass
    dpoTriples:     result.dpoTriples ?? 0,
    modelUsed:      result.modelUsed,   // e.g. 'claude-sonnet-4-20250514'
    promotionLevel: result.promotionLevel,
  };

  console.log('${taskType} metrics:', JSON.stringify(metrics, null, 2));
  if (!result.passed) throw new Error('${taskType} AF pipeline FAILED — score: ' + result.score);
  if (!metrics.modelUsed) throw new Error('${taskType} modelUsed not captured');
  "
done

# Verify generated files exist
ls server/src/engine/flows/event-attendance-management/*.service.ts
# Expected (AF-1 generated, not Claude Code written):
#   rsvp-orchestrator.service.ts
#   waitlist-coordinator.service.ts
#   check-in-validator.service.ts
#   post-event-feedback-aggregator.service.ts
```

---

## PHASE C GATE (JUDGE)

```bash
# AF-9 scores for each task type
node -e "
for (const id of ['T63','T64','T65','T66']) {
  const result = /* load latest AF-9 judgment for id */;
  console.log(id, 'AF-9 score:', result.score,
    'DNA violations:', result.dnaViolations.length,
    'security issues:', result.securityIssues.length);
  if (result.score < 80) throw new Error(id + ' score below 80: ' + result.score);
  if (result.dnaViolations.length > 0) throw new Error(id + ' has DNA violations');
}
console.log('✅ All task types pass AF-9 judgment');
"
```

---

## PHASE D GATE (INTEGRATE)

```bash
npm run lint:naming   # exit 0

# Verify generated service files follow naming convention
find server/src/engine/flows/event-attendance-management -name "*.service.ts"
# Expected:
#   rsvp-orchestrator.service.ts
#   waitlist-coordinator.service.ts
#   check-in-validator.service.ts
#   post-event-feedback-aggregator.service.ts

find server/src/engine/flows/event-attendance-management -name "t6*.ts" 2>/dev/null
# Expected: no output (no ID-prefixed files)

# All tests pass
cd server && npm test
cd ../client && npm test
```

---

## PHASE E GATE (PROMOTE)

```bash
# Promote to INJECTED
node -e "
for (const id of ['T63','T64','T65','T66']) {
  await promotionLadder.promote(id, 'INJECTED', testTenantId);
  console.log('✅', id, 'promoted to INJECTED');
}
"

# DPO training data captured
node -e "
const dpo = await es.search({ index: 'xiigen-training-data', body: {
  query: { term: { 'flowId.keyword': 'FLOW-04' }}
}});
console.log('DPO triples captured:', dpo.body.hits.total.value);
if (dpo.body.hits.total.value < 4) throw new Error('Expected >= 4 DPO triples');
"

# Final verification
npm run lint:naming   # exit 0 (regression)
# Re-run V0-MODE, V0-SCOPE, V29/V30/V31 scripts
```

---

## flow-completeness-checker v1.5 — 33/33 ✅

```
V0-MODE ✅ implementationMode: "af-pipeline"
    SESSION files use afPipeline.run(), not create_file for services
    Phase structure: INJECT → GENERATE → JUDGE → INTEGRATE → PROMOTE

V0-SCOPE ✅ stackTargets: ['node-nestjs'], clientTargets: ['react-web']
    Topology stateNotes: react-web:client only (no expo:platform in plan body)
    expo:platform moved to APPENDIX A — clientTargets is ['react-web'] (React.js)
    No Angular/Android/iOS/Expo stateNotes in plan body

V1–V28 ✅ (unchanged from v1)

V29 ✅ stackCoupling on T63, T64, T65, T66:
    T63: STACK_COUPLED [DATA_ACCESS, DI_FRAMEWORK]
         entries: node-nestjs:server, php-wordpress:server (INCOMPATIBLE),
                  redis:platform, jest:platform
    T64: IMPL_VARIES [DI_FRAMEWORK, LANGUAGE]
         entries: node-nestjs:server, redis:platform, jest:platform
    T65: STACK_COUPLED [DI_FRAMEWORK, LANGUAGE] server
         entries: node-nestjs:server, php-server-rendered:client (INCOMPATIBLE),
                  redis:platform, jest:platform, github-actions:platform
         (expo:platform removed — not in clientTargets)
    T66: IMPL_VARIES [DI_FRAMEWORK, ASYNC_MODEL]
         entries: node-nestjs:server, redis:platform, jest:platform
    supportedServerStacks: ['node-nestjs'] on all four

V30 ✅ INCOMPATIBLE stacks flagged:
    T63 php-wordpress:server — INCOMPATIBLE — $wpdb no atomic read-modify-write
      mitigation: php-laravel DB::transaction() + lockForUpdate
    T65 php-server-rendered:client — INCOMPATIBLE — no camera API without JS layer
      mitigation: React/Vue island or manual token entry

V31 ✅ stateNotes on react-web:client (declared clientTarget):
    rsvp-pending: useState, feature-scoped, LOW ✅
    rsvp-confirmed: useState (transient, FlowStateSnapshot derived), LOW ✅
    waitlist-holding: useContext (WaitlistContext), feature-scoped, MEDIUM ✅
      stateConsumerMap: WaitlistScreen, WaitlistPromotionBanner
    check-in-active: useState, feature-scoped, LOW ✅
      html5-qrcode / @zxing/browser for React.js QR scanning (getUserMedia)
    feedback-window-open: useState, feature-scoped, LOW ✅
```

---

## SESSION-0 CHECKLIST (FC-1 through FC-21)

```
FC-19: All 4 genesis prompts in HybridGenesisPrompt format (AF-1 input)
       ✓ neutralIronRules[] present on all four — no NestJS syntax in Section 1
       ✓ T65 IR-1 explicitly states 60s is MACHINE constant (no FREEDOM config key)
       ✓ T63 php-wordpress:server: incompatible: true in Section 4

FC-20: INCOMPATIBLE stacks flagged with reason + mitigation
       ✓ T63 php-wordpress:server: $wpdb atomic race + mitigation
       ✓ T65 php-server-rendered:client: no camera API + mitigation

FC-21: stateNotes present on react-web:client topology nodes
       ✓ waitlist-holding: useContext (WaitlistContext), MEDIUM — T64 background push
       ✓ check-in-active: useState, react-web only (html5-qrcode / @zxing/browser). No expo in topology.
       ✓ All others: useState, LOW propagation
```

---

## JIRA COMMENT TEMPLATE (naming-conventions-enforcer Rule 5)

```
## What was built — Phase A [Flow: FLOW-04 — Event Attendance & Management]

### Business purpose
Seeded the four EngineContracts and 16 AF prompts that define the event
attendance lifecycle. T63 handles RSVP with atomic capacity management via
F209.decrementAndCreate — preventing oversell races. T64 manages the FIFO
waitlist with a promotionInProgress lock to prevent double-promotion. T65
enforces a MACHINE-fixed 60s QR token TTL and 4-step validation sequence
(TTL → anti-replay → confirmed list → audit). T66 opens a time-bounded
feedback window after EventEnded, accepting submissions from confirmed
attendees only.

### Flow context
- **Flow:** FLOW-04 — Event Attendance & Management (Wave 2, parallel_wave: 2)
- **Task types:** T63 RSVPOrchestrator, T64 WaitlistCoordinator,
  T65 CheckInValidator, T66 PostEventFeedbackAggregator
- **Implementation mode:** af-pipeline — AF-1 generates service code from contracts
- **Will be used by:** FLOW-09 (ticket refund eligibility gates on
  AttendanceConfirmed from T63). FLOW-10 (review eligibility gates on
  AttendanceConfirmed — attendee must have actually attended).

### Technical delivery
- 4 EngineContracts seeded to ES (xiigen-engine-contracts index)
- 16 AF prompts seeded to ES (xiigen-prompts index): 4 per task type
- 13 event schemas in contracts/events/FLOW-04/ (incl. FeedbackSubmissionFailed)
- topology.json with react-web:client stateNotes (html5-qrcode for check-in QR scanning)
- test-matrix.json with 12 scenarios
- Stack coupling: T63 STACK_COUPLED, T64 IMPL_VARIES, T65 STACK_COUPLED, T66 IMPL_VARIES
- Key factories: F205 IAttendanceService (DATABASE FABRIC),
  F206 IWaitlistService (INJECTABLE — FIFO queue + promotion),
  F207 ICheckInService (INJECTABLE — QR generation + 60s TTL validation),
  F208 IFeedbackService (INJECTABLE — submission, aggregation, window tracking),
  F209 ICapacityService (INJECTABLE — atomic strategy from FREEDOM config),
  F210 IAttendanceAuditService (PLATFORM-ONLY)

### Architecture fit
All contracts enforce DNA-8 (outbox-before-queue), DNA-5 (tenant isolation).
T63 is STACK_COUPLED due to atomic ORM transaction dependency for capacity.
T65 has two MACHINE constants (60s TTL, validation order) — security constraints
that are NOT configurable. AF-1 will generate the .service.ts files in Phase B.
```

---

## KEY FACTS FOR SESSION FILES

```
Artifact numbers: T63–T66, F205–F210 (unchanged)
flow_name: "Event Attendance & Management"
stackTargets: ['node-nestjs']
clientTargets: ['react-web']    ← React.js client. No React Native / Expo in scope.
implementationMode: af-pipeline

PRE-ALLOCATION GATE: Family + CF ranges must be confirmed in STATE.json
(replace ⛔ strings) before SESSION-FLOW-04-A.md executes.
wave_baseline_entry set by pre-allocation session — do not hardcode.

AF-1 generates these files (Claude Code does NOT create them):
  rsvp-orchestrator.service.ts              ← T63
  waitlist-coordinator.service.ts            ← T64 (Coordinator exception documented)
  check-in-validator.service.ts              ← T65
  post-event-feedback-aggregator.service.ts  ← T66 (post-event- prefix load-bearing)
Directory: engine/flows/event-attendance-management/

PREREQUISITE — Passes 1–6 referenced from v1 (not inlined in v4).
SESSION-FLOW-04-A.md MUST read docs/FLOW-04-REFERENCE-PLAN-v1.md before
creating files under contracts/events/FLOW-04/ or contracts/topologies/.
  prerequisite_documents: ["docs/FLOW-04-REFERENCE-PLAN-v1.md"]
  reason: "12 base event schemas + E2E test matrix (12 scenarios) defined in v1.
           FeedbackSubmissionFailed (13th schema) is new in v3 — write inline in Session A."

Test baseline (parallel_wave: 2 — read at execution time):
  Entry:           cd server && npx jest --passWithNoTests 2>&1 | tail -1
                   (use wave_baseline_entry from pre-allocation session as anchor)
  After Phase A:   wave_baseline_entry + 12 (+12 schema validation tests for 13 schemas.
                   FeedbackSubmissionFailed is a compensation event shape — validated
                   inline in T66 handler tests, not as a standalone schema test.)
  After Phase E:   wave_baseline_entry + 40 (+28 server tests from AF-generated code)
  Client delta:    +16 (C1:3, C2:6, C3:0, C4:6, C5:0, background:+1)

AF pipeline expectations:
  Phase A: 16 prompts + 4 contracts seeded
  Phase B: 4 afPipeline.run() calls — 6 P5 metrics captured per run
           (quality, cost, latencyMs, retryCount, dpoTriples, modelUsed)
  Phase C: AF-9 score >= 80 for all four task types
  Phase E: >= 4 DPO triples captured, all promoted to INJECTED

Key react-web state pattern notes:
  rsvp-pending:       useState — no optimistic, capacity requires server confirmation
  rsvp-confirmed:     useState (transient, FlowStateSnapshot)
  waitlist-holding:   useContext (WaitlistContext) — T64 async push crosses screens
                      Same pattern as FLOW-02 matching-in-progress (OnboardingContext)
  check-in-active:    useState — 60s TTL window means all activity is seconds
                      QR scanning: html5-qrcode or @zxing/browser + getUserMedia
                      (React.js browser — no Expo/React Native in scope)
  feedback-window-open: useState — optimistic submit button only

Stack coupling summary:
  T63: STACK_COUPLED — atomic ORM transaction differs per stack
       php-wordpress: ⛔ INCOMPATIBLE ($wpdb no atomic read-modify-write)
  T64: IMPL_VARIES — DI + async syntax varies
  T65: STACK_COUPLED — fixed server validation order + QR scan client mechanism
       php-server-rendered:client: ⛔ INCOMPATIBLE (no camera API without JS)
       redis:platform: anti-replay MACHINE constant (60s, NOT configurable)
  T66: IMPL_VARIES — scheduler mechanism + aggregation pattern varies

Key MACHINE constants (no FREEDOM config allowed):
  QR token TTL: 60 seconds (T65 IR-1)
  Validation order: TTL→anti-replay→list→audit (T65 IR-2)
  Waitlist order: FIFO (T64 IR-1)
```

---

## SESSION FILES TO PRODUCE

```
FLOW-04-STATE.json               ← implementationMode: "af-pipeline"
                                    ⛔ Family + CF must be confirmed before Phase A

SESSION-FLOW-04-A.md             ← INJECT phase
                                    ⛔ FIRST: assert pre_allocated_ranges Family/CF confirmed
                                    STEP 0: confirm EventEnded source for T66 EngineContract
                                      Check FLOW-03 current plan — does T59 EMITS include EventEnded?
                                      YES → T66 CONSUMES EventEnded (source: T59, domain: event-creation)
                                      NO  → T66 CONSUMES EventEnded (source: platform scheduler, domain: system-events)
                                      Update T66 EngineContract CONSUMES before seeding.
                                    Read prerequisite_documents: ["docs/FLOW-04-REFERENCE-PLAN-v1.md"]
                                      (12 base schemas + test matrix — required for contracts/events/FLOW-04/)
                                    Write FeedbackSubmissionFailed schema inline (13th schema — new in v3)
                                    Write EngineContracts for T63/T64/T65/T66
                                    Write 16 AF prompts (4 per task type)
                                    Seed to ES (contracts + prompts)
                                    V0-MODE + V0-SCOPE + V29/V30/V31 checks
                                    NEW-A7: assert 16 prompts seeded

SESSION-FLOW-04-B.md             ← GENERATE phase
                                    Submit T63 to afPipeline.run()
                                    Submit T64 to afPipeline.run()
                                    Submit T65 to afPipeline.run()
                                    Submit T66 to afPipeline.run()
                                    Capture 6 P5 metrics per task type
                                    Verify 4 .service.ts files exist (AF-1 output)

SESSION-FLOW-04-C.md             ← JUDGE phase
                                    AF-6/7/8/9 scoring per task type
                                    PromptPatch iteration if score 60–79
                                    Escalate to Luba if score < 60
                                    All task types must reach score >= 80

SESSION-FLOW-04-D.md             ← INTEGRATE phase
                                    Wire generated services into engine module
                                    lint:naming gate (exit 0)
                                    npm test (server + client)

SESSION-FLOW-04-E.md             ← PROMOTE phase
                                    Promote T63/T64/T65/T66 to INJECTED
                                    DPO training data export (>= 4 triples)
                                    Client integration tests (react-web)
                                    Final V0-MODE/V0-SCOPE/V29/V30/V31 verification
                                    lint:naming regression gate

docs/FLOW-04-REFERENCE.md        ← this document
```

---

## APPENDIX A — NON-PRIORITY STACKS (for FLOW-37 reference only)

Claude Code executing FLOW-04 phases MUST IGNORE this appendix entirely.

```
SERVER STACKS TO ADD IN FLOW-37:
  T63: python-fastapi (async with db.begin()), php-laravel (DB::transaction + lockForUpdate),
       dotnet-aspnet (EF Core row locking), rust-axum — all STACK_COUPLED
       php-wordpress: ⛔ INCOMPATIBLE (already flagged)
  T64: python-fastapi (asyncio + Redis lock), php-laravel (Cache::lock + Queue::dispatch)
       — all IMPL_VARIES
  T65: python-fastapi (hashlib.sha256), php-laravel (Redis::set NX EX 60)
       — all IMPL_VARIES. php-wordpress: degraded (wp_transient for anti-replay)
  T66: python-fastapi (APScheduler/Celery), php-laravel (Queue::later)
       — all IMPL_VARIES. php-wordpress: degraded (wp_schedule_single_event)

CLIENT STACKS TO ADD IN FLOW-37:
  react-native (expo):
    T65 check-in-active:
      expo-barcode-scanner or expo-camera with barcode scanning.
      Camera.requestCameraPermissionsAsync() before mounting scanner.
      Declare CAMERA in app.json permissions.
      onBarCodeScanned callback: send qrToken to server immediately on detection.
      stateHolderType: useState. stateScope: feature-scoped. propagationRisk: LOW.
      Wraps native AVFoundation (iOS) / CameraX (Android) under the hood.
    All other nodes: same useState / useContext patterns as react-web:client.

  angular:client — all 5 topology nodes need:
    rsvp-pending: component-local Subject, feature-scoped, LOW
    rsvp-confirmed: component-local variable (OnInit fetch), feature-scoped, LOW
    waitlist-holding: BehaviorSubject in WaitlistStatusService,
      feature-scoped (WaitlistFeatureModule), MEDIUM propagation,
      stateConsumerMap: {WaitlistComponent, PromotionBannerComponent},
      CanActivateFn on /rsvp-confirmed checks promoted status
    check-in-active: component-local Subject, feature-scoped, LOW
    feedback-window-open: component-local Subject, feature-scoped, LOW
  android-kotlin:client — check-in-active:
    CameraX + ML Kit Barcode Scanning API. REQUEST_CODE camera permission.
    StateFlow in ViewModel scoped to CheckInFragment. LOW propagation.
  ios-swift:client — check-in-active:
    AVFoundation + Vision framework. NSCameraUsageDescription in Info.plist.
    @StateObject (CheckInViewModel). @Published for view observation. LOW propagation.
  php-server-rendered:client — check-in-active:
    ⛔ INCOMPATIBLE — no camera API without JavaScript layer.
    Mitigation: React/Vue island or manual token entry.

FULL ANALYSIS: see STACK-COUPLING-AUDIT-FLOW-01-04-v1.md
```
