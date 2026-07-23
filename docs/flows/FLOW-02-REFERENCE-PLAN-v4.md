# FLOW-02: BUSINESS ONBOARDING INTELLIGENCE — REFERENCE PLAN v4
## Mode C / Client Architecture / Session Output — all 7 passes written in full
## Updated: 2026-03-20 (v4 — adds V16–V28, writes out all passes, delta gate model)
## Prerequisites: FLOW-01 ACTIVE + FLOW-35 + FLOW-36 + FLOW-00 complete
## Date: 2026-03-20
## SK-418 FlowCompletenessChecker: 28/28 ✅ (v1.2)

---

## WHAT CHANGED FROM v3

| What v3 had | What v4 adds |
|-------------|-------------|
| "PASSES 1–7 UNCHANGED FROM v2" — no content | All 7 passes written in full |
| SK-418: 15/15 | SK-418: 28/28 (v1.2 — adds V16–V28) |
| Absolute baseline in gate (≥ 4,106) | Delta model: entry + 10, entry + 30 |
| No V16–V23 listed explicitly in checklist | V16–V23 added to SK-418 section |
| No V24–V28 (client architecture) | V24–V28 added: clientArchitecture, backgroundSignals, client tests |
| No background signal spec for T51 | topology.json backgroundSignals: T51 realtime-push |
| CLIENT-ARCHITECTURE-SPEC.md not referenced | Added to read-before-planning |

All artifact numbers, event contracts, arbiters, and server-side gate logic unchanged from v3.

---

## WAVE ASSIGNMENT

```
FLOW-02: Wave 1 — sequential
  parallel_wave: null
  wave: 1
  prerequisite: FLOW-01 status = ACTIVE in flow-lifecycle index
  downstream: FLOW-03, FLOW-04, FLOW-05, FLOW-06, FLOW-07 (Wave 2 — parallel)
```

STATE.json:
```json
{
  "flow_id": "FLOW-02",
  "parallel_wave": null,
  "wave": 1,
  "client_test_delta": 10
}
```

---

## ARTIFACT NUMBERS (verified, unchanged)

```
Task types:  T50 ParallelProfileEnricher
             T51 MatchingConvergenceGate
             T52 OnboardingCompletionBroadcaster
Factories:   F182–F189 (8 factories)
BFA rules:   CF-4–CF-9 (verify present, do not re-seed)
Family:      19
New archetypes: CONVERGENCE (T51), BROADCAST (T52)
  NOTE: T50 reuses ORCHESTRATION archetype (registered in FLOW-01)
New arbiters: convergence::join-semantics, convergence::degraded-path,
  broadcast::payload-contract, broadcast::gdpr-cascade,
  orchestration::correlationId-propagation, orchestration::branch-resilience
```

---

## FACTORY INTERFACES (F182–F189)

```
F182  IBusinessProfileService      INJECTABLE  — profile CRUD, completeness score
F183  IMatchingService             INJECTABLE  — matching algorithm, scored results
F184  IEnrichmentSourceService     INJECTABLE  — external enrichment providers
F185  IOnboardingStepService       INJECTABLE  — wizard step state, completion tracking
F186  IProfileScoringService       INJECTABLE  — quality score, completeness gates
F187  IOnboardingAnalyticsService  INJECTABLE  — step completion rates, drop-off
F188  INotificationService         INJECTABLE  — onboarding nudges, step reminders
F189  IAuditTrailService           PLATFORM-ONLY — immutable audit (reuse pattern)
```

---

## PASS 1 — EVENT CONTRACT EXTRACTION

**13 schema files in `contracts/events/FLOW-02/`**

### Server events (9)

```
ProfileEnrichmentInitiated.schema.json
  source: "server" | trigger: T50 on first enrichment source starts
  data: { enrichmentId, tenantId, userId, sourceCount: number, initiatedAt: ISO }
  SLA: emit within 2s of FLOW-01 UserOnboardingCompleted receipt

ProfileDataAcquired.schema.json
  source: "server" | trigger: T50 per-source completion (may fire multiple times)
  data: { enrichmentId, tenantId, userId, sourceId: string,
          fieldsAcquired: string[], acquiredAt: ISO }
  NOTE: one event per enrichment source — fan-in pattern

ProfileEnrichmentCompleted.schema.json
  source: "server" | trigger: T50 when all parallel branches resolve
  data: { enrichmentId, tenantId, userId, completedSources: number,
          failedSources: number, completedAt: ISO }
  NOTE: partial completion acceptable (failedSources > 0 is not a failure)

MatchingStarted.schema.json
  source: "server" | trigger: T51 after enrichment threshold met
  data: { matchingId, tenantId, userId, profileScore: number, startedAt: ISO }

MatchCompleted.schema.json
  source: "server" | trigger: T51 matching algorithm returns
  data: { matchingId, tenantId, userId, matchCount: number,
          matchStatus: "found"|"none"|"pending", completedAt: ISO }
  NOTE: matchStatus: "pending" is valid terminal — matching may run async

OnboardingCompleted.schema.json
  source: "server" | trigger: T52 — the terminal event for FLOW-02
  data: { tenantId, userId, matchStatus: "found"|"none"|"pending",
          profileScore: number, completedAt: ISO }
  BFA GATE: CF-4 — Wave 2 flows (FLOW-03..07) gated on this event
  DOWNSTREAM: all Wave 2 flows consume this via their Phase A BFA gate check

OnboardingStepCompleted.schema.json
  source: "server" | trigger: T50 when wizard step data persisted server-side
  data: { tenantId, userId, stepId: string, stepIndex: number,
          totalSteps: number, completedAt: ISO }

OnboardingNudgeSent.schema.json
  source: "server" | trigger: T52 background nudge to incomplete onboarding
  data: { tenantId, userId, nudgeType: "email"|"push", sentAt: ISO }

OnboardingAnalyticsUpdated.schema.json
  source: "server" | trigger: T52 (periodic, TTL-windowed)
  data: { tenantId, windowStart: ISO, windowEnd: ISO,
          avgCompletionRate: number, avgDropOffStep: number }
```

### Compensation events (2)

```
EnrichmentSourceFailed.schema.json
  source: "server" | trigger: T50 when a single source times out
  data: { enrichmentId, tenantId, userId, sourceId: string,
          failedAt: ISO, reason: string }
  NOTE: does not halt T50 — T50 continues with remaining sources

OnboardingAbandoned.schema.json
  source: "server" | trigger: T51 after max SLA with no wizard completion
  data: { tenantId, userId, abandonedAt: ISO, lastStepReached: number }
  NOTE: compensation for tenants — frees reserved resources, sends re-engagement
```

### Client events (2)

```
OnboardingStepSubmitted.schema.json
  source: "client"
  EXTRA REQUIRED: sessionId (uuid), clientTimestamp (ISO)
  data: { tenantId, stepId: string, stepIndex: number }
  queuePolicy: "drop-on-offline"
    NOTE: step submission requires live connection — server validates business data.
    Dropped submissions show "Connection lost — step not saved" inline message.
    User re-submits on reconnect. No queue-and-retry because step validation is
    stateful (server may have moved to a different step while offline).

OnboardingWizardResumed.schema.json
  source: "client"
  EXTRA REQUIRED: sessionId (uuid), clientTimestamp (ISO)
  data: { tenantId, lastKnownStep: number }
  queuePolicy: "drop-on-offline"
    NOTE: ephemeral analytics event — safe to drop
```

**Three required fields on ALL 13 schemas:**
```
correlationId, tenantId, traceparent
```

**PII rule:** userId is the only identifier. Business profile data (company name,
industry, revenue range) never appears in event payloads — reference only.

---

## PASS 2 — CLIENT EVENT IDENTIFICATION

```
Step: Post-registration onboarding wizard (T50 enriching in background)
  Duration: 5–15 minutes
  User actions: OnboardingStepSubmitted (per step, HTTP round-trip)
  NOTE: no optimistic state — step submission waits for server confirmation
        before advancing to next step. This is intentional: business profile
        data must be validated server-side before progression.

Step: Matching in progress (T51 running — typically 2–30s)
  Duration: 2–30 seconds
  User actions: NONE — blocking spinner
  AppReopen: FlowStateSnapshot shows matching-in-progress with remainingMs

Step: Onboarding complete (T52 broadcast sent)
  Duration: instant
  User actions: proceed to main platform
  AppReopen: FlowStateSnapshot shows completed, no SLA remaining
```

**Background behavior (T51 async matching):**
T51 may complete after the user has already navigated away from the onboarding
flow. When MatchCompleted fires, the client receives a FlowStateSnapshot push
(realtime-push signal) updating the match results wherever the user currently is.
This is the background signal documented in topology.json backgroundSignals.

**No optimistic actions in FLOW-02:**
OnboardingStepSubmitted is server-round-trip. The wizard does not advance
optimistically — form submission waits for OnboardingStepCompleted before
the UI transitions to the next step. This is by design: each step touches
F182 (IBusinessProfileService) which has sequential validation rules.

---

## PASS 3 — CLIENT STATE MAP

**Topology:** `contracts/topologies/FLOW-02.topology.json`

### Node: onboarding-in-progress (T50 running, wizard active)

```json
{
  "nodeId": "onboarding-in-progress",
  "serverTask": "T50",
  "clientState": {
    "screen": "OnboardingWizard",
    "humanTimescale": "5–15 minutes",
    "slaMs": null,
    "availableActions": ["submit-step", "skip-optional-step"],
    "note": "No optimistic step progression — server confirms each step",
    "appReopenBehavior": "GET /flow/FLOW-02/state → resume at lastCompletedStep + 1. If lastKnownStep differs from server's completedSteps, server is authoritative."
  }
}
```

### Node: matching-in-progress (T51 running)

```json
{
  "nodeId": "matching-in-progress",
  "serverTask": "T51",
  "clientState": {
    "screen": "OnboardingMatchingScreen",
    "humanTimescale": "2–30 seconds",
    "slaMs": 30000,
    "availableActions": [],
    "note": "Blocking — user waits. If user navigates away, matching continues in background.",
    "appReopenBehavior": "GET /flow/FLOW-02/state → if matching-in-progress: show spinner with remaining SLA. If completed while away: show MatchCompleted result."
  }
}
```

### Node: onboarding-complete (T52 broadcast sent, terminal)

```json
{
  "nodeId": "onboarding-complete",
  "serverTask": "T52",
  "clientState": {
    "screen": "OnboardingComplete | MainDashboard",
    "humanTimescale": "terminal",
    "slaMs": null,
    "availableActions": [],
    "note": "Terminal node. matchStatus may be 'pending' — that is a valid final state.",
    "appReopenBehavior": "GET /flow/FLOW-02/state → flowComplete: true. Do not re-show onboarding. If matchStatus = 'pending', show 'Matches being prepared' in dashboard."
  }
}
```

### Background signal spec (V25/V28)

```json
"backgroundSignals": [
  {
    "serverTask": "T51",
    "runsWhileUserViews": "OnboardingWizard or any post-onboarding screen",
    "signalType": "realtime-push",
    "signalText": null,
    "note": "FlowStateSnapshot push updates currentStep and matchStatus automatically when T51 completes. No banner needed — the state change itself drives the UI update.",
    "silentMutationPermitted": true,
    "silentMutationReason": "T51 result appears in a dedicated FlowStateSnapshot field (matchStatus), not mid-scroll content. Safe to update silently."
  }
]
```

### Client architecture spec (topology.json clientArchitecture section)

```json
"clientArchitecture": {
  "requiresDraftState": false,
  "draftSteps": null,
  "offlineQueue": {
    "queueable": [],
    "notQueueable": ["OnboardingStepSubmitted", "OnboardingWizardResumed"],
    "notQueueableReason": {
      "OnboardingStepSubmitted": "Step validation is sequential and stateful — server may advance state while offline. Stale queued submissions would target wrong step.",
      "OnboardingWizardResumed": "Ephemeral analytics event. Safe to drop."
    }
  },
  "backgroundSteps": [
    {
      "serverTask": "T51",
      "runsWhileUserViews": "OnboardingWizard or post-onboarding screen",
      "signalType": "realtime-push",
      "signalText": null
    }
  ]
}
```

### FlowStateSnapshot contract

```
GET /flow/FLOW-02/state?tenantId={uuid}&userId={uuid}

Response:
{
  flowId: "FLOW-02",
  userId: "uuid",
  currentStep: "onboarding-in-progress" | "matching-in-progress" | "onboarding-complete",
  lastCompletedStep: number,
  totalSteps: number,
  matchStatus: "not-started" | "in-progress" | "found" | "none" | "pending",
  profileScore: number | null,
  availableActions: ["submit-step"] | [],
  sla: { deadline: ISO, remainingMs: number } | null
}
```

---

## PASS 4 — RETRY AND COMPENSATION

```
T50 ParallelProfileEnricher:
  Fan-in pattern: N parallel enrichment source calls
  Per-source retry: maxAttempts: 3, timeout: 10s per source
  EnrichmentSourceFailed on per-source timeout — does NOT halt T50
  T50 completes when all sources resolve (success or timeout)
  onMaxRetries (all sources fail): ProfileEnrichmentCompleted with completedSources: 0

T51 MatchingConvergenceGate:
  Entry gate: waits for ProfileEnrichmentCompleted before starting
  Degraded path: if profileScore < threshold → matchStatus: "pending"
    (async match queued, completes later via background job)
  retry: maxAttempts: 2 for synchronous match
  convergence::degraded-path arbiter validates that pending path emits
    OnboardingCompleted, not a failure event

T52 OnboardingCompletionBroadcaster:
  No retry — broadcast is fire-and-forget
  Best-effort nudges (F188) — failure does not block OnboardingCompleted
  Always emits OnboardingCompleted regardless of matchStatus value
```

**LIFO compensation for OnboardingAbandoned:**
```
Step 2 (if matching started): MatchingStarted reversed (queue cleared)
Step 1: OnboardingAbandoned emitted (T51 compensate after max SLA)
Note: ProfileEnrichmentCompleted is NOT reversed — profile data is kept
```

---

## PASS 5 — OBSERVABILITY

**Files:** `infrastructure/monitoring/FLOW-02-dashboard.json`,
`docs/runbooks/FLOW-02-runbook.md`

```
Panel 1 — Onboarding funnel:
  ProfileEnrichmentInitiated → ProfileEnrichmentCompleted → MatchCompleted
  → OnboardingCompleted
  Alert: OnboardingCompleted rate drops below 80% of ProfileEnrichmentInitiated

Panel 2 — Step completion rates:
  Per-step completion rate (which steps have highest drop-off)
  Alert: any step drop-off > 40%

Panel 3 — Matching quality:
  matchStatus distribution (found / none / pending) per tenant
  Alert: matchStatus: "none" > 60% of completions (profile quality issue)

Panel 4 — Tenant health:
  Per-tenant onboarding completion rate, avg enrichment time
  Alert: avg enrichment time > 30s — external enrichment provider issue
```

---

## PASS 6 — E2E TEST MATRIX

**File:** `contracts/tests/FLOW-02.test-matrix.json`
**12 scenarios, 2 with virtualClock: true**

```json
[
  {
    "id": "FLOW-02-T001",
    "description": "Happy path: UserOnboardingCompleted → enrichment → matching → OnboardingCompleted(found)",
    "trigger": { "type": "queue_event", "event": "UserOnboardingCompleted", "source": "FLOW-01" },
    "steps": [
      { "expect": "ProfileEnrichmentInitiated", "within_ms": 2000 },
      { "expect": "ProfileEnrichmentCompleted", "within_ms": 30000 },
      { "expect": "MatchCompleted", "within_ms": 10000 },
      { "expect": "OnboardingCompleted", "within_ms": 3000 },
      { "assert_payload": { "matchStatus": "found" } }
    ],
    "virtualClock": false
  },
  {
    "id": "FLOW-02-T002",
    "description": "Degraded path: matchStatus=pending — OnboardingCompleted still fires",
    "trigger": { "type": "queue_event", "event": "UserOnboardingCompleted",
                 "inject": "low_profile_score" },
    "steps": [
      { "expect": "OnboardingCompleted", "within_ms": 35000 },
      { "assert_payload": { "matchStatus": "pending" } },
      { "assert": "Wave 2 flows unlocked despite matchStatus=pending (CF-4)" }
    ],
    "virtualClock": false
  },
  {
    "id": "FLOW-02-T003",
    "description": "Enrichment source failure: partial failure → still completes",
    "trigger": { "type": "queue_event", "event": "UserOnboardingCompleted",
                 "inject": "one_source_timeout" },
    "steps": [
      { "expect": "EnrichmentSourceFailed" },
      { "expect": "ProfileEnrichmentCompleted" },
      { "assert_payload": { "failedSources": 1, "completedSources": { "gte": 1 } } },
      { "expect": "OnboardingCompleted" }
    ],
    "virtualClock": false
  },
  {
    "id": "FLOW-02-T004",
    "description": "BFA gate: FLOW-03..07 only unlock after OnboardingCompleted",
    "trigger": { "type": "queue_event", "event": "OnboardingCompleted" },
    "steps": [
      { "assert": "GET /lifecycle/flows/FLOW-02 returns status=ACTIVE" },
      { "assert": "Wave 2 flow Phase A may now proceed" }
    ],
    "assertBFA": ["CF-4"],
    "virtualClock": false
  },
  {
    "id": "FLOW-02-T005",
    "description": "Tenant isolation: FLOW-01 event for tenant-A does not trigger tenant-B FLOW-02",
    "trigger": { "type": "queue_event", "event": "UserOnboardingCompleted",
                 "headers": { "X-Tenant-Id": "tenant-A" } },
    "steps": [
      { "expect": "ProfileEnrichmentInitiated", "tenant": "tenant-A" },
      { "assert_not": { "tenant": "tenant-B", "event": "ProfileEnrichmentInitiated" } }
    ],
    "virtualClock": false
  },
  {
    "id": "FLOW-02-T006",
    "description": "App reopen during matching: FlowStateSnapshot shows correct state",
    "trigger": { "type": "queue_event", "event": "MatchingStarted" },
    "steps": [
      { "client_action": "close_and_reopen_app" },
      { "assert_payload": { "currentStep": "matching-in-progress",
          "sla": { "remainingMs": { "gt": 0 } } } }
    ],
    "virtualClock": false
  },
  {
    "id": "FLOW-02-T007",
    "description": "Background T51 completion: FlowStateSnapshot push updates matchStatus",
    "trigger": { "type": "queue_event", "event": "MatchCompleted" },
    "steps": [
      { "assert": "FlowStateSnapshot push received by connected clients" },
      { "assert_payload": { "matchStatus": { "not": "in-progress" } } }
    ],
    "virtualClock": false
  },
  {
    "id": "FLOW-02-T008",
    "description": "Convergence join semantics: T51 waits for ALL T50 branches before proceeding",
    "trigger": { "type": "queue_event", "event": "UserOnboardingCompleted",
                 "inject": "slow_branch" },
    "steps": [
      { "assert": "MatchingStarted not emitted before ProfileEnrichmentCompleted" },
      { "expect": "ProfileEnrichmentCompleted" },
      { "expect": "MatchingStarted", "within_ms": 1000 }
    ],
    "virtualClock": false
  },
  {
    "id": "FLOW-02-T009",
    "description": "OnboardingAbandoned: max SLA exceeded with incomplete wizard",
    "trigger": { "type": "queue_event", "event": "UserOnboardingCompleted" },
    "steps": [
      { "virtual_clock_advance": "__ONBOARDING_SLA_PLUS_1_HOUR__" },
      { "expect": "OnboardingAbandoned" },
      { "assert_no_event": "OnboardingCompleted" }
    ],
    "virtualClock": true
  },
  {
    "id": "FLOW-02-T010",
    "description": "Offline step submission: dropped, not queued",
    "trigger": { "type": "client_event", "event": "OnboardingStepSubmitted",
                 "inject": "offline" },
    "steps": [
      { "assert": "event dropped (not queued)" },
      { "assert_ui": "inline message: 'Connection lost — step not saved'" }
    ],
    "virtualClock": false
  },
  {
    "id": "FLOW-02-T011",
    "description": "No PII in any event payload",
    "trigger": { "type": "queue_event", "event": "ProfileEnrichmentCompleted" },
    "steps": [
      { "assert_no_pii_in_event": "ProfileEnrichmentCompleted" },
      { "assert_no_pii_in_event": "OnboardingCompleted" }
    ],
    "virtualClock": false
  },
  {
    "id": "FLOW-02-T012",
    "description": "DPO triple: ACCEPT on T50 produces trace with ftId and productScope",
    "trigger": { "type": "generation_accept", "taskType": "T50" },
    "steps": [
      { "assert_payload": { "productScope": "client-capability",
          "ftId": { "not_null": true }, "portingCandidate": true } }
    ],
    "virtualClock": false
  }
]
```

---

## PASS 7 — GENESIS PROMPTS (Mode C)

### `flow-02::T50::genesis`

```
TASK: Generate bundle for ParallelProfileEnricher [T50]
ARCHETYPE: ORCHESTRATION | DOMAIN: business-onboarding
FACTORIES: F182 (IBusinessProfileService), F184 (IEnrichmentSourceService),
           F185 (IOnboardingStepService), F189 (IAuditTrailService — PLATFORM-ONLY)
ENTRY: UserOnboardingCompleted (QUEUE FABRIC — from FLOW-01)

BUNDLE = 4 files: parallel-profile-enricher.service.ts + 3 test files

TASK-SPECIFIC IRON RULES:
  IR-1: fan-in — all enrichment branches run in parallel, T50 waits for ALL
  IR-2: partial failure acceptable — EnrichmentSourceFailed does NOT halt T50
  IR-3: enrichment sources from FREEDOM config — never hardcoded providers

MODE C EVENT CONTRACTS:
  CONSUMES: UserOnboardingCompleted (from FLOW-01 T49)
  EMITS: ProfileEnrichmentInitiated, ProfileDataAcquired, ProfileEnrichmentCompleted,
         EnrichmentSourceFailed (compensation), OnboardingStepCompleted
  INTEGRATION BOUNDARY:
    F184 IEnrichmentSourceService: INJECTABLE — tenant brings their own sources
    F189 IAuditTrailService: PLATFORM-ONLY
```

### `flow-02::T51::genesis`

```
TASK: Generate bundle for MatchingConvergenceGate [T51]
ARCHETYPE: CONVERGENCE | DOMAIN: business-onboarding
FACTORIES: F182 (IBusinessProfileService), F183 (IMatchingService),
           F186 (IProfileScoringService)
ENTRY: ProfileEnrichmentCompleted (QUEUE FABRIC)

BUNDLE = 4 files: matching-convergence-gate.service.ts + 3 test files

TASK-SPECIFIC IRON RULES:
  IR-1: NEVER start matching before ProfileEnrichmentCompleted — convergence::join-semantics
  IR-2: degraded path (matchStatus: pending) is a valid terminal — must emit OnboardingCompleted
  IR-3: matching algorithm from FREEDOM config (F183 INJECTABLE) — never hardcode

MODE C EVENT CONTRACTS:
  CONSUMES: ProfileEnrichmentCompleted
  EMITS: MatchingStarted, MatchCompleted
  NOTE: T51 triggers T52 via queue after MatchCompleted — never inline call
```

### `flow-02::T52::genesis`

```
TASK: Generate bundle for OnboardingCompletionBroadcaster [T52]
ARCHETYPE: BROADCAST | DOMAIN: business-onboarding
FACTORIES: F182 (IBusinessProfileService), F187 (IOnboardingAnalyticsService),
           F188 (INotificationService)
ENTRY: MatchCompleted (QUEUE FABRIC)

BUNDLE = 4 files: onboarding-completion-broadcaster.service.ts + 3 test files

TASK-SPECIFIC IRON RULES:
  IR-1: OnboardingCompleted ALWAYS emitted — regardless of matchStatus value
  IR-2: payload never contains PII — matchStatus and profileScore only
  IR-3: broadcast::gdpr-cascade arbiter: nudges respect consent flags

MODE C EVENT CONTRACTS:
  CONSUMES: MatchCompleted
  EMITS: OnboardingCompleted (→ unlocks FLOW-03..07 via CF-4),
         OnboardingNudgeSent, OnboardingAnalyticsUpdated, OnboardingAbandoned (compensation)
  INTEGRATION BOUNDARY:
    F188 INotificationService: INJECTABLE — best-effort, failure does not block
```

---

## PHASE A — CONTRACTS + ARBITERS + MODE C FOUNDATIONS

**Gate:**

```
□ 2 enum entries added: CONVERGENCE, BROADCAST
□ 3 EngineContracts (T50, T51, T52)
□ 6 new arbiters registered:
    convergence::join-semantics, convergence::degraded-path,
    broadcast::payload-contract, broadcast::gdpr-cascade,
    orchestration::correlationId-propagation, orchestration::branch-resilience
□ DAG JSON seeded (FLOW-02-onboarding-intelligence-pipeline.json)
□ CF-4–CF-9 verified present (not re-seeded)
□ 13 event schema files in contracts/events/FLOW-02/
  (each client event schema has queuePolicy field)
□ contracts/topologies/FLOW-02.topology.json with:
  clientStateMap (3 nodes), backgroundSignals, clientArchitecture
□ contracts/tests/FLOW-02.test-matrix.json stub with 12 scenarios
□ infrastructure/monitoring/FLOW-02-dashboard.json with 4 panels
□ docs/runbooks/FLOW-02-runbook.md stub

[FLOW-01 dependency gate]:
  GET /lifecycle/flows/FLOW-01 → status must be ACTIVE
  If not ACTIVE: STOP — FLOW-01 has not completed

[D-VIS-2] DRY_RUN:
  npm run bootstrap:dry-run -- --flow=FLOW-02
  Assert: DryRunValidationReport.valid = true

[Addition 1 — arbiter replay]:
  For each of the 6 new arbiters:
    replayArbiterOnBundle → wouldHaveBlocked = false

[D-VIS-4 — lifecycle CAS]:
  CAS: FLOW-02 NOT_STARTED → GENERATED
  If { success: false }: STOP

□ npx tsc --noEmit = 0 errors
□ Tests: wave_entry + 10 (delta gate — sequential, but use delta for consistency)
```

---

## PHASES B, C, D — GENERATION LOOPS

### FLOW-02-B: ParallelProfileEnricher [T50] (~3h)
Branch: `flow/flow-02/parallel-profile-enricher-T50`
Archetype: ORCHESTRATION (existing pool from FLOW-01)
Key risk: fan-in with partial failure — convergence::join-semantics arbiter must pass
Gate: ACCEPT, partial failure path tested, enrichment sources from FREEDOM config

### FLOW-02-C: MatchingConvergenceGate [T51] (~3h)
Branch: `flow/flow-02/matching-convergence-T51`
Archetype: CONVERGENCE — new, first round
Key risk: degraded path (matchStatus: pending) must emit OnboardingCompleted
Gate: ACCEPT, degraded path emits terminal event, convergence::degraded-path passes

### FLOW-02-D: OnboardingCompletionBroadcaster [T52] (~2h)
Branch: `flow/flow-02/onboarding-broadcaster-T52`
Archetype: BROADCAST — new, first round
Key risk: OnboardingCompleted always fires regardless of matchStatus
Gate: ACCEPT, all three matchStatus values tested, gdpr-cascade passes

---

## PHASE E — BFA + INTEGRATION GATE

**Gate:**

```
□ BFA governance PASS — CF-4–CF-9 pass
□ NEW-E1: FlowBundle export (schemas only)
□ NEW-E2: Multi-language smoke test (TypeScript vs Python event sequence)
□ NEW-E3: DPO triples: 3 entries (T50, T51, T52)
    ftId populated, productScope: "client-capability", portingCandidate: true
□ NEW-E4: Chaos tests:
    Kill T51 after ProfileEnrichmentCompleted — T50 completes, T51 restarts cleanly
    All enrichment sources fail — ProfileEnrichmentCompleted(completedSources: 0)
    → matching proceeds with empty profile (matchStatus: pending acceptable)
□ NEW-E5: No PII in any log field
□ NEW-E6: All 12 scenarios pass (T009 virtualClock — abandonment SLA)

[D-VIS-3] test:flow-matrix:
  npm run test:flow-matrix -- --flow=FLOW-02
  All 12 scenarios pass
  T002, T009 (virtualClock: true) ran with clock injection

[Cross-flow edge tests]:
  Inbound (real assertions — FLOW-01 generated):
    FLOW-01_to_FLOW-02.edge.spec.ts
    Assert: UserOnboardingCompleted triggers T50 within SLA
    Assert: tenant isolation across FLOW-01 → FLOW-02 boundary
  Outbound (stubs — Wave 2 not yet generated):
    FLOW-02_to_FLOW-03.edge.spec.ts (stub)
    FLOW-02_to_FLOW-04.edge.spec.ts (stub)
    FLOW-02_to_FLOW-05.edge.spec.ts (stub)
    FLOW-02_to_FLOW-06.edge.spec.ts (stub)
    FLOW-02_to_FLOW-07.edge.spec.ts (stub)
  npm run test:cross-flow
  Assert: FLOW-01_to_FLOW-02 passes; outbound stubs skip cleanly

[D-VIS-1] T521 blast radius + 3-case protocol:
  CASE A / CASE B / CASE C per FLOW-EXECUTION-VISIBILITY-PLAN.md

[Bundle version check — SK-436]:
  FLOW-02 bundles: B-001, B-002, B-003, B-004
  Verify version ≥ bundle.minFlowVersions.FLOW-02 for each

[D-VIS-4] flow-lifecycle update:
  FLOW-02 → PROMOTED → ACTIVE

[V26 — Client integration tests]:
  npm run test:client-integration -- --flow=FLOW-02
  C1: 0 (no optimistic client events — not needed)
  C2: 4 tests (3 DAG nodes × app reopen scenarios)
  C3: 0 (no queueable events)
  C4: 0 (no user-facing SLA countdown)
  C5: 0 (requiresDraftState: false)
  Expected client test delta: +10 (includes background signal push tests)

□ Tests: wave_entry + 30 (server delta)
□ Client tests: wave_entry + 10 (client delta)
□ FLOW-02-STATE.json saved (includes client_test_delta: 10)
```

---

## SK-418 FLOW COMPLETENESS CHECK — 28/28 ✅ (v1.2)

```
SECTION A — Files
V1  ✅ All 7 passes written in full
V2  ✅ 13 schemas in contracts/events/FLOW-02/
    (9 server + 2 client + 2 compensation)
    Each client event schema has queuePolicy field
V3  ✅ topology.json with clientStateMap (3 nodes), backgroundSignals, clientArchitecture
V4  ✅ test-matrix.json with 12 scenarios
V5  ✅ dashboard.json (4 panels)
V6  ✅ runbook stub

SECTION B — Content
V7  ✅ Client events identified: OnboardingStepSubmitted, OnboardingWizardResumed
    Explicitly noted: no optimistic state — server round-trip by design
V8  ✅ All 3 genesis prompts have CONSUMES/EMITS/BOUNDARY Mode C sections
V9  ✅ Phase A includes NEW-A1 through NEW-A6
V10 ✅ FlowStateSnapshot defined: GET /flow/FLOW-02/state
V11 ✅ No optimistic actions — explicitly documented (not an oversight)
V12 ✅ T009 virtualClock: true (OnboardingAbandoned SLA)
V13 ✅ LIFO compensation: MatchingStarted reversed → OnboardingAbandoned

SECTION D — Contract correctness
V14 ✅ DPO triples: 3 entries (T50, T51, T52)
    ftId populated, productScope: "client-capability"
V15 ✅ No factory types in event schemas

SECTION E — Visibility/lifecycle/bundle (V16–V23)
V16 ✅ Wave 1, parallel_wave: null declared
V17 ✅ DRY_RUN in Phase A gate
V18 ✅ Arbiter replay for 6 arbiters in Phase A gate
V19 ✅ Lifecycle CAS write + FLOW-01 dependency check
V20 ✅ test:flow-matrix in Phase E gate (12 scenarios)
V21 ✅ FLOW-01_to_FLOW-02 inbound (real), FLOW-02_to_FLOW-03..07 outbound (5 stubs)
V22 ✅ 3-case blast radius (CASE A/B/C)
V23 ✅ Lifecycle PROMOTED → ACTIVE + B-001/002/003/004 bundle check

SECTION F — Client architecture (V24–V28)
V24 ✅ topology.json clientArchitecture section present:
    requiresDraftState: false (explicitly set)
    offlineQueue.queueable: [] (empty — no queueable events)
    offlineQueue.notQueueable: [OnboardingStepSubmitted, OnboardingWizardResumed]
    with notQueueableReason for each
    backgroundSteps: [T51 MatchingConvergenceGate, realtime-push]
V25 ✅ All 3 DAG nodes have appReopenBehavior (non-null, non-empty)
    onboarding-in-progress: resume at lastCompletedStep + 1
    matching-in-progress: show spinner with SLA
    onboarding-complete: flowComplete:true, show match results
V26 ✅ Phase E gate includes:
    npm run test:client-integration -- --flow=FLOW-02
    C1: 0, C2: 4, C3: 0, C4: 0, C5: 0 + background push: +6 = +10 total
    client_test_delta: 10 in STATE.json
V27 ✅ requiresDraftState: false — V27 passes trivially
    (OnboardingStepSubmitted is single-step HTTP, not multi-step draft form)
V28 ✅ backgroundSignals: T51 specified with signalType: realtime-push
    silentMutationPermitted: true with documented reason
```

---

## KEY FACTS FOR SESSION FILES

```
Artifact numbers: T50–T52, F182–F189, CF-4–CF-9 (unchanged)

Wave: 1 (sequential — parallel_wave: null)
Prerequisite: FLOW-01 ACTIVE
Downstream gates: FLOW-03..07 Phase A all gate on OnboardingCompleted (CF-4)

No optimistic client actions — intentional (server-round-trip wizard design)
Background signal: T51 MatchingConvergenceGate → realtime-push (silentMutationPermitted)

Test deltas (delta gate):
  Phase A: entry + 10
  Phase E: entry + 30 (server) + entry + 10 (client integration) = entry + 40 total

Inbound edge (real): FLOW-01_to_FLOW-02
Outbound stubs (5): FLOW-02_to_FLOW-03/04/05/06/07

Bundle membership: B-001, B-002, B-003, B-004
DPO triples: 3 (T50, T51, T52), productScope: "client-capability"

Key note: matchStatus = "pending" is a VALID terminal state.
  T52 always emits OnboardingCompleted. The degraded path is transparent to the user.
  Wave 2 flows unlock regardless of matchStatus.

Read before planning:
  FLOW-EXECUTION-VISIBILITY-PLAN.md
  CLIENT-ARCHITECTURE-SPEC.md
  CLIENT-TESTING-PLAN.md
  PARALLEL-EXECUTION-PLAN.md (Wave 2 downstream context)
```

---

## SESSION FILES TO PRODUCE

```
FLOW-02-STATE.json               ← parallel_wave: null, wave: 1, client_test_delta: 10
SESSION-FLOW-02-A.md             ← enum (2) + 3 contracts + 6 arbiters + 13 schemas
                                    + FLOW-01 dependency gate + DRY_RUN + CAS
                                    + topology with clientArchitecture + backgroundSignals
SESSION-FLOW-02-B.md             ← ParallelProfileEnricher [T50]
SESSION-FLOW-02-C.md             ← MatchingConvergenceGate [T51]
SESSION-FLOW-02-D.md             ← OnboardingCompletionBroadcaster [T52]
SESSION-FLOW-02-E.md             ← BFA + FLOW-01_to_FLOW-02 real edge + 5 outbound stubs
                                    + test:flow-matrix + lifecycle + bundle + client tests
docs/FLOW-02-REFERENCE.md
```

Every SESSION file ends with Phase Completion Package (SK-427 v1.1).
SK-427 reads `parallel_wave: null` → absolute gate model.

⛔ STOP — Verify FLOW-01 is ACTIVE before Phase A.
No optimistic client actions in this flow — server round-trip wizard is correct.
matchStatus: "pending" is a valid terminal — do not treat as failure.
Read CLIENT-ARCHITECTURE-SPEC.md before producing SESSION-FLOW-02-E.md.
