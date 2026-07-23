# FLOW-02: BUSINESS ONBOARDING INTELLIGENCE — REFERENCE PLAN v7
## Prerequisites: FLOW-01 ACTIVE + FLOW-35 + FLOW-36 + FLOW-00 + FLOW-00.1 + FLOW-00.2 + FLOW-00.3 complete
## Date: 2026-03-23
## flow-completeness-checker v1.5: 33/33 ✅

---

## SCOPE DISCIPLINE

```
stackTargets:  ['node-nestjs']
clientTargets: ['react-web']

This plan contains ONLY:
  ✓ Full detail for node-nestjs:server
  ✓ Full detail for react-web:client (topology stateNotes)
  ✓ Platform entries (redis, jest, github-actions) — CONCEPT_NEUTRAL
  ✓ One-line INCOMPATIBLE flags (T50 + T51 php-wordpress)
  ✓ One-line server stubs in genesis prompt Section 4

This plan does NOT contain:
  ✗ Angular stateNotes, BehaviorSubject analysis, MatchingStatusService
  ✗ Angular route guards (OnboardingCompletedGuard)
  ✗ Full coupling map entries for php-laravel:server

Non-priority stack details: see STACK-COUPLING-AUDIT-FLOW-01-04-v1.md
and APPENDIX A at end of this document.
```

---

## IMPLEMENTATION MODE (P12)

```
implementationMode: "af-pipeline"
implementationModeReason: "Wave 1 user-facing flow. AF pipeline operational after FLOW-35."

WHO DOES WHAT:
  Claude Code writes:  EngineContracts, AF prompts (genesis/review/compliance/judge),
                       event schemas, topology, test matrix, Grafana dashboard, runbook
  XIIGen generates:    Service code (.service.ts files) via AF-1
  AF-6/7/8/9 judges:  Generated code quality, DNA compliance, security, scoring

Claude Code does NOT create .service.ts files for T50/T51/T52.
Genesis prompts (Section 1–4) are AF-1 INPUT, not Claude Code instructions.
```

---

## WHAT CHANGED FROM v6 → v7

| What v6 had | What v7 changes |
|---|---|
| No implementationMode in STATE.json | implementationMode: "af-pipeline" added (P12 ✅) |
| Phase structure: per-task-type sessions (manual pattern) | Phases follow INJECT → GENERATE → JUDGE → INTEGRATE → PROMOTE |
| SESSION files implied direct .service.ts creation ("File: X.service.ts") | SESSION files reference afPipeline.run() — AF-1 generates service code |
| Genesis prompts not marked as AF-1 input | Genesis prompts explicitly marked as AF-1 INPUT |
| No AF prompt definitions table | 12 AF prompts defined (4 per task type) |
| Phase B/C gates absent | Phase B gate (afPipeline.run() + 6 P5 metrics) + Phase C gate (AF-9 ≥ 80) added |
| flow-completeness-checker v1.3: 31/31 | flow-completeness-checker v1.5: 33/33 (V0-MODE, V0-SCOPE added) |
| T50 CONSUMES: UserOnboardingCompleted | T50 CONSUMES: OnboardingCompleted — aligned to FLOW-01 T49 emit name |
| FLOW-00.3 absent from prerequisites | FLOW-00.3 added (cost pipeline required for af-pipeline mode) |

V1–V28 content and all v6 in-scope content (genesis prompts, stateNotes, coupling annotations) unchanged.

---

## WAVE ASSIGNMENT (unchanged)

```
FLOW-02: Wave 1 — sequential
  parallel_wave: null
  wave: 1
  prerequisite: FLOW-01 status = ACTIVE in flow-lifecycle index
  downstream: FLOW-03, FLOW-04, FLOW-05, FLOW-06, FLOW-07 (Wave 2 — parallel)
```

---

## STATE.json (v7)

```json
{
  "flow_id": "FLOW-02",
  "flow_name": "Business Onboarding Intelligence",
  "parallel_wave": null,
  "wave": 1,
  "current_phase": "session-0",
  "completed_phases": [],
  "test_baseline": null,
  "client_test_delta": 10,
  "stackTargets": ["node-nestjs"],
  "clientTargets": ["react-web"],
  "implementationMode": "af-pipeline",
  "implementationModeReason": "Wave 1 user-facing flow. AF pipeline operational after FLOW-35."
}
```

---

## ARTIFACT NUMBERS (unchanged)

```
Task types:  T50 ParallelProfileEnricher
             T51 MatchingConvergenceGate
             T52 OnboardingCompletionBroadcaster
Factories:   F182–F189 (8 factories)
BFA rules:   CF-4–CF-9
Family:      19
New archetypes: CONVERGENCE (T51), BROADCAST (T52)
New arbiters: convergence::join-semantics, convergence::degraded-path,
  broadcast::payload-contract, broadcast::gdpr-cascade,
  orchestration::correlationId-propagation, orchestration::branch-resilience
```

---

## SERVICE FILE NAMES (naming-conventions-enforcer Rule 1)

Pattern: `{verb}-{domain-noun}.service.ts`
Directory: `engine/flows/business-onboarding-intelligence/`

| Task Type | ID | Service File | Class Name |
|-----------|----|--------------| ----------|
| ParallelProfileEnricher | T50 | `parallel-profile-enricher.service.ts` | `ParallelProfileEnricher` |
| MatchingConvergenceGate | T51 | `matching-convergence-gate.service.ts` | `MatchingConvergenceGate` |
| OnboardingCompletionBroadcaster | T52 | `onboarding-completion-broadcaster.service.ts` | `OnboardingCompletionBroadcaster` |

---

## PASSES 1–6 (unchanged from v4)

All event contracts (13 schemas), retry/compensation, observability,
E2E test matrix (12 scenarios) identical to v4. See v4 for full content.

---

## PASS 3 — CLIENT STATE MAP (v6 — react-web only)

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
    "appReopenBehavior": "GET /flow/FLOW-02/state → resume at lastCompletedStep + 1. Server is authoritative."
  },
  "stackCoupling": {
    "react-web:client": {
      "tier": "IMPL_VARIES",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_STATE_MODEL"],
      "neutralConcepts": [
        "display current step, advance only on server confirmation",
        "app reopen: restore correct step from FlowStateSnapshot"
      ],
      "implementationNotes": "useState<{currentStep: number, totalSteps: number}> local to OnboardingWizardScreen. useEffect on mount: GET FlowStateSnapshot, restore from lastCompletedStep. Step submit: HTTP POST, await OnboardingStepCompleted response, then setState. No optimistic advance.",
      "stateNotes": {
        "stateHolderType": "useState",
        "stateHolderTypeReason": "Step state is local to OnboardingWizardScreen. No cross-screen propagation needed. Server round-trip before advancing means state is always server-confirmed.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "Wizard state unmounts when user leaves onboarding. FlowStateSnapshot on mount handles app reopen.",
        "propagationRisk": "LOW",
        "propagationRiskReason": "Only OnboardingWizardScreen reads step state.",
        "routeGuardRequired": false,
        "exitGuardRequired": false
      }
    }
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
    "note": "T51 may complete while user is on a different screen. Push signal updates UI wherever user is.",
    "appReopenBehavior": "GET /flow/FLOW-02/state → if matching-in-progress: show spinner with remainingMs. If completed while away: show MatchCompleted result."
  },
  "stackCoupling": {
    "react-web:client": {
      "tier": "STACK_COUPLED",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_STATE_MODEL", "CLIENT_LIFECYCLE"],
      "neutralConcepts": [
        "show matching spinner with SLA countdown",
        "receive T51 completion signal regardless of which screen user is on",
        "app reopen: restore match status from FlowStateSnapshot"
      ],
      "implementationNotes": "OnboardingContext (React Context) wrapping all onboarding screens. WebSocket subscription in context provider: on MatchCompleted push, update matchStatus in context state. OnboardingMatchingScreen reads matchStatus via useContext. On mount: fetch FlowStateSnapshot for app reopen. Navigate to /onboarding-complete when matchStatus !== 'in-progress'. Context provider unmounts when user leaves onboarding flow entirely.",
      "stateNotes": {
        "stateHolderType": "useContext (OnboardingContext)",
        "stateHolderTypeReason": "T51 completes while user may be on any onboarding screen. useState in OnboardingMatchingScreen alone would not receive the push if user navigated away. A feature-scoped Context provider wrapping all onboarding screens allows the WebSocket push to update state that any mounted onboarding screen can read. Zustand/Redux not needed — scope is limited to onboarding flow.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "OnboardingContext provider lives at the onboarding router outlet level. Unmounts when user exits the onboarding flow. Does not persist globally.",
        "propagationRisk": "MEDIUM",
        "propagationRiskReason": "2-3 consumers: OnboardingMatchingScreen (spinner + countdown), OnboardingWizardScreen (may still be mounted during background match), any header badge showing match progress.",
        "routeGuardRequired": false,
        "exitGuardRequired": false,
        "stateConsumerMap": {
          "OnboardingMatchingScreen": "Primary. useContext(OnboardingContext) — reads matchStatus and remainingMs.",
          "OnboardingWizardScreen": "Secondary — may be mounted if T51 starts while wizard still shows. Reads matchStatus to show 'matching started' indicator.",
          "HeaderMatchBadge (optional)": "If implemented: reads from same OnboardingContext — not root-scoped."
        },
        "note": "This is the one FLOW-02 node that needs more than useState — T51's push signal crosses screen boundaries. A feature-scoped Context (not Zustand, not root Context) is the correct React pattern here. The WebSocket connection lives in the context provider's useEffect."
      }
    }
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
    "note": "Terminal node. matchStatus may be 'pending' — valid final state.",
    "appReopenBehavior": "GET /flow/FLOW-02/state → flowComplete: true. Do not re-show onboarding. If matchStatus = 'pending', show 'Matches being prepared' in dashboard."
  },
  "stackCoupling": {
    "react-web:client": {
      "tier": "IMPL_VARIES",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_STATE_MODEL"],
      "neutralConcepts": [
        "terminal: do not re-show onboarding on app reopen",
        "display matchStatus from FlowStateSnapshot"
      ],
      "implementationNotes": "No local state needed. On mount: GET FlowStateSnapshot, read matchStatus. If matchStatus='pending': render 'Matches being prepared' banner. flowComplete: true prevents re-entry to onboarding routes.",
      "stateNotes": {
        "stateHolderType": "useState (transient — derived from FlowStateSnapshot)",
        "stateHolderTypeReason": "Terminal node. State is fully server-derived on mount. No ongoing updates. Server is authoritative.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "Component-local. Unmounts after user navigates to main dashboard.",
        "propagationRisk": "LOW",
        "propagationRiskReason": "Single OnboardingCompleteScreen reads this state.",
        "routeGuardRequired": false
      }
    }
  }
}
```

### clientArchitecture section (unchanged from v4)

```json
"clientArchitecture": {
  "requiresDraftState": false,
  "draftSteps": null,
  "offlineQueue": {
    "queueable": [],
    "notQueueable": ["OnboardingStepSubmitted", "OnboardingWizardResumed"],
    "notQueueableReason": {
      "OnboardingStepSubmitted": "Sequential and stateful — server may advance state while offline.",
      "OnboardingWizardResumed": "Ephemeral analytics. Safe to drop."
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

---

## PASS 7 — GENESIS PROMPTS (HybridGenesisPrompt format)

### T50 ParallelProfileEnricher — HybridGenesisPrompt

```
TASK TYPE: T50 | FLOW-02 — Business Onboarding Intelligence

SECTION 1 — NEUTRAL IRON RULES
  IR-1: All enrichment branches MUST run in parallel and T50 waits for ALL
        to complete or time out before emitting ProfileEnrichmentCompleted.
        Running branches sequentially is a score-0 violation.
  IR-2: A single source timeout MUST NOT halt T50. T50 continues with
        remaining sources. EnrichmentSourceFailed emitted per failed source.
  IR-3: Enrichment source list MUST come from FREEDOM config — never
        hardcoded. Score-0 if provider list is in code.
  IR-4: DNA-8: storeDocument(ProfileEnrichmentCompleted) BEFORE enqueue().
  IR-5: DNA-5: tenantId on all queries. All enrichment data scoped to tenant.
  IR-6: Per-source idempotency key: hash(enrichmentId + sourceId).
        SETNX before each source call — prevents duplicate enrichment on retry.

SECTION 2 — CONCEPT DESCRIPTION
  ParallelProfileEnricher fans out to N configured enrichment sources
  simultaneously. It waits for all branches to resolve (success or timeout),
  assembles the enriched business profile, and emits a single
  ProfileEnrichmentCompleted event. Partial failures are acceptable and
  transparent to downstream — the profile is enriched with whatever sources
  succeeded.

SECTION 3 — EVENT CONTRACTS
  CONSUMES: OnboardingCompleted (QUEUE FABRIC — from FLOW-01 T49)
  EMITS:    ProfileEnrichmentInitiated, ProfileDataAcquired,
            ProfileEnrichmentCompleted, EnrichmentSourceFailed (compensation),
            EnrichmentAborted (all sources failed)
  INTEGRATION BOUNDARY:
    F182 IBusinessProfileService:       INJECTABLE
    F184 IEnrichmentSourceService:     INJECTABLE — tenant configures own sources
    F185 IEnrichmentTimeoutService:    INJECTABLE — per-source timeout from FREEDOM
    F189 IAuditTrailService:           PLATFORM-ONLY

SECTION 4 — STACK IMPLEMENTATIONS

  node-nestjs:server ← PRIORITY (implement in this phase)
    "Generate a NestJS @Injectable() class named ParallelProfileEnricher
    extending MicroserviceBase. Inject F182, F184, F185, F189 via constructor.
    Fan-in pattern: const results = await Promise.allSettled(
      sources.map(src => this.enrichmentSource.enrich(tenantId, userId, src))
    ); Filter fulfilled/rejected. Partial failure via allSettled semantics.
    Per-source SETNX before each enrichment call (IR-6).
    storeDocument(ProfileEnrichmentCompleted) then enqueue (IR-4).
    Return Promise<DataProcessResult<EnrichmentResult>>."

  python-fastapi:server  → [Stub — FLOW-37: asyncio.gather(*tasks, return_exceptions=True)]
  php-laravel:server     → [Stub — FLOW-37: Bus::batch() + laravel/horizon]
  php-wordpress:server   → ⛔ INCOMPATIBLE — no native parallel execution in sync PHP
  dotnet-aspnet:server   → [Stub — FLOW-37: Task.WhenAll(tasks)]
  rust-axum:server       → [Stub — FLOW-37: futures::future::join_all()]

  redis:platform — CONCEPT_NEUTRAL
    "Per-source SETNX idempotency key (IR-6):
    key = {tenantId}:enrich:{enrichmentId}:{sourceId}. TTL from FREEDOM config.
    All stacks access via IDatabaseService FABRIC."

  jest:platform — CONCEPT_NEUTRAL
    "No virtualClock needed for T50.
    Mock Promise.allSettled to test partial failure path (IR-2):
    one source rejects, verify ProfileEnrichmentCompleted still emits."
```

### T51 MatchingConvergenceGate — HybridGenesisPrompt

```
TASK TYPE: T51 | FLOW-02 — Business Onboarding Intelligence

SECTION 1 — NEUTRAL IRON RULES
  IR-1: T51 MUST NOT start matching before ProfileEnrichmentCompleted is received.
        Starting on any earlier event is a score-0 convergence::join-semantics violation.
  IR-2: The degraded path (profileScore below threshold → matchStatus: pending)
        is a valid terminal state. T51 MUST emit OnboardingCompleted with
        matchStatus: "pending" — not a failure event.
  IR-3: Matching algorithm and profile score threshold MUST come from FREEDOM
        config via F183 INJECTABLE — never hardcoded.
  IR-4: DNA-8: storeDocument(MatchCompleted) BEFORE enqueueing T52.
  IR-5: T51 triggers T52 via QUEUE FABRIC after MatchCompleted — never an
        inline call or direct method invocation.
  IR-6: Idempotency key: hash(tenantId + userId + 'matching').
        SETNX before starting matching to prevent duplicate match runs.

SECTION 2 — CONCEPT DESCRIPTION
  MatchingConvergenceGate waits for all enrichment branches to complete
  (convergence), then runs the matching algorithm against the enriched profile.
  If the profile score meets the threshold: synchronous match, emits MatchCompleted
  with matchStatus: "found" or "none". If score is below threshold: deferred async
  match queued, emits MatchCompleted with matchStatus: "pending" — and
  OnboardingCompleted still fires. The platform becomes usable regardless.

SECTION 3 — EVENT CONTRACTS
  CONSUMES: ProfileEnrichmentCompleted (QUEUE FABRIC)
  EMITS:    MatchingStarted, MatchCompleted
  NOTE:     T51 triggers T52 via queue after MatchCompleted — never inline
  INTEGRATION BOUNDARY:
    F182 IBusinessProfileService:  INJECTABLE
    F183 IMatchingService:         INJECTABLE
    F186 IProfileScoringService:   INJECTABLE

SECTION 4 — STACK IMPLEMENTATIONS

  node-nestjs:server ← PRIORITY (implement in this phase)
    "Generate a NestJS @Injectable() class named MatchingConvergenceGate
    extending MicroserviceBase. Inject F182, F183, F186 via constructor.
    Entry guard: only process ProfileEnrichmentCompleted (IR-1).
    Score check: await this.scoringService.score(tenantId, profile).
    If score >= threshold (FREEDOM config): run sync match via F183.
    If score < threshold: emit MatchCompleted({ matchStatus: 'pending' }),
    enqueue deferred matching job.
    Always emit OnboardingCompleted via queue regardless of matchStatus (IR-2).
    SETNX before matching (IR-6). storeDocument before enqueue (IR-4).
    Return Promise<DataProcessResult<MatchResult>>."

  python-fastapi:server  → [Stub — FLOW-37]
  php-laravel:server     → [Stub — FLOW-37: Queue::later() for deferred match]
  php-wordpress:server   → ⛔ INCOMPATIBLE — wp_cron unreliable for deferred matching
  dotnet-aspnet:server   → [Stub — FLOW-37]

  redis:platform — CONCEPT_NEUTRAL
    "SETNX idempotency key (IR-6): {tenantId}:match:{userId}.
    Prevents duplicate match runs on retry. TTL: 24h (FREEDOM config)."

  jest:platform — IMPL_VARIES [TEST_FRAMEWORK]
    "T009 virtualClock: simulate OnboardingAbandoned SLA expiry.
    jest.useFakeTimers() + advance past FREEDOM config onboarding_sla.
    Mock F183 to test degraded path (matchStatus: pending)."

  github-actions:platform — CONCEPT_NEUTRAL
    "Standard CI gate: lint:naming, tsc --noEmit, npm test."
```

### T52 OnboardingCompletionBroadcaster — HybridGenesisPrompt

```
TASK TYPE: T52 | FLOW-02 — Business Onboarding Intelligence

SECTION 1 — NEUTRAL IRON RULES
  IR-1: OnboardingCompleted MUST ALWAYS be emitted regardless of matchStatus
        value. matchStatus: "pending" is a valid terminal state, not a failure.
        Blocking OnboardingCompleted on pending match = score-0 violation.
  IR-2: OnboardingCompleted payload MUST NOT contain PII. matchStatus and
        profileScore only. Business profile data never in payload — reference IDs only.
  IR-3: Nudges (F188 INotificationService) MUST respect user consent flags
        before sending. broadcast::gdpr-cascade arbiter enforces this.
  IR-4: F188 failure MUST NOT block OnboardingCompleted emission.
        Nudge delivery is best-effort. Log failure, continue.
  IR-5: DNA-8: storeDocument(OnboardingCompleted) BEFORE enqueue().
  IR-6: Idempotency key: hash(tenantId + userId + 'onboarding-complete').
        SETNX before emitting. Prevents double-completion on retry.

SECTION 2 — CONCEPT DESCRIPTION
  OnboardingCompletionBroadcaster is the terminal node of FLOW-02. It always
  emits OnboardingCompleted (unlocking Wave 2 flows), sends a best-effort
  welcome nudge, and records analytics. It is intentionally simple — its
  reliability guarantee is that it always fires, regardless of what the
  matching system decided.

SECTION 3 — EVENT CONTRACTS
  CONSUMES: MatchCompleted (QUEUE FABRIC — from T51)
  EMITS:    OnboardingCompleted (→ unlocks FLOW-03..07 via CF-4),
            OnboardingNudgeSent, OnboardingAnalyticsUpdated,
            OnboardingAbandoned (compensation)
  INTEGRATION BOUNDARY:
    F182 IBusinessProfileService:      INJECTABLE
    F187 IOnboardingAnalyticsService:  INJECTABLE
    F188 INotificationService:         INJECTABLE — best-effort, failure doesn't block

SECTION 4 — STACK IMPLEMENTATIONS

  node-nestjs:server ← PRIORITY (implement in this phase)
    "Generate a NestJS @Injectable() class named OnboardingCompletionBroadcaster
    extending MicroserviceBase. Inject F182, F187, F188 via constructor.
    Steps: (1) SETNX idempotency check (IR-6), (2) read consent flag via F182,
    (3) send nudge via F188 if consent = true (best-effort: catch + log, IR-4),
    (4) storeDocument(OnboardingCompleted), (5) enqueue — always (IR-1).
    Record analytics via F187. Return Promise<DataProcessResult<BroadcastResult>>."

  python-fastapi:server  → [Stub — FLOW-37]
  php-laravel:server     → [Stub — FLOW-37]
  php-wordpress:server   → [Stub — degraded: wp_mail, $wpdb, no DI]

  redis:platform — CONCEPT_NEUTRAL
    "SETNX idempotency key (IR-6): {tenantId}:onboard-complete:{userId}.
    TTL: 7 days (FREEDOM config)."

  jest:platform — CONCEPT_NEUTRAL
    "Mock F188 to throw — verify OnboardingCompleted still emits (IR-4).
    Mock consent flag = false — verify nudge NOT sent (IR-3)."
```

---

---

## AF PROMPT DEFINITIONS (seeded in Phase A — NEW-A7)

For each task type, 4 prompts seeded to ES via P22 standard:

| Task Type | promptId pattern | AF station | Purpose |
|-----------|-----------------|------------|---------|
| T50 | business-onboarding::T50::genesis | AF-1 | Code generation instruction (Section 4 content) |
| T50 | business-onboarding::T50::review | AF-6 | Code review criteria (iron rules + DNA) |
| T50 | business-onboarding::T50::compliance | AF-7 | DNA + P1-P13 validation rules |
| T50 | business-onboarding::T50::judge | AF-9 | 5-component scoring + iron rules |
| T51 | business-onboarding::T51::genesis | AF-1 | (same pattern) |
| T51 | business-onboarding::T51::review | AF-6 | |
| T51 | business-onboarding::T51::compliance | AF-7 | |
| T51 | business-onboarding::T51::judge | AF-9 | |
| T52 | business-onboarding::T52::genesis | AF-1 | |
| T52 | business-onboarding::T52::review | AF-6 | |
| T52 | business-onboarding::T52::compliance | AF-7 | |
| T52 | business-onboarding::T52::judge | AF-9 | |

Total: 12 prompts seeded. Domain: `business-onboarding`. connectionType: `FLOW_SCOPED`.

---

## PASS 7.5 — STACK COUPLING ANNOTATIONS FOR TASK TYPES (V29)

Priority stack + platform entries only. Non-priority stacks: see APPENDIX A.

### T50 ParallelProfileEnricher

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'STACK_COUPLED',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_ASYNC_MODEL', 'SERVER_LANGUAGE'],
      neutralConcepts: [
        'all branches run in parallel, T50 waits for ALL (IR-1)',
        'partial failure acceptable, does not halt (IR-2)',
        'enrichment sources from FREEDOM config (IR-3)',
        'DNA-8: store before emit (IR-4)',
        'per-source SETNX idempotency (IR-6)',
      ],
      implementationNotes: 'NestJS + Promise.allSettled([sources.map(...)]). Partial failure via allSettled semantics.',
    },
    'php-wordpress:server': {
      tier: 'INCOMPATIBLE',
      incompatible: true,
      incompatibleReason: 'No native parallel execution in synchronous PHP request lifecycle.',
      mitigation: 'Use php-laravel with Bus::batch(). WordPress: Action Scheduler sequential fallback — violates IR-1 parallelism.',
    },
    'redis:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['per-source SETNX idempotency', 'TTL-based deduplication'],
      implementationNotes: 'key={tenantId}:enrich:{enrichmentId}:{sourceId}. IDatabaseService FABRIC.',
    },
    'jest:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'test-runner',
      dimensions: [],
      neutralConcepts: ['mock partial failure', 'verify T50 completes despite one source failure'],
      implementationNotes: 'Standard Jest. Mock Promise.allSettled with one rejection. No virtualClock.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
}
```

### T51 MatchingConvergenceGate

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'STACK_COUPLED',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_ASYNC_MODEL', 'SERVER_DI_FRAMEWORK'],
      neutralConcepts: [
        'convergence: wait for ProfileEnrichmentCompleted (IR-1)',
        'degraded path emits OnboardingCompleted (IR-2)',
        'algorithm + threshold from FREEDOM config (IR-3)',
        'DNA-8 (IR-4)',
        'T52 triggered via QUEUE only (IR-5)',
        'SETNX idempotency (IR-6)',
      ],
      implementationNotes: 'NestJS @Injectable(). Entry guard on ProfileEnrichmentCompleted. Score check via F186. Deferred match via Bull job if pending. storeDocument before enqueue.',
    },
    'php-wordpress:server': {
      tier: 'INCOMPATIBLE',
      incompatible: true,
      incompatibleReason: 'wp_cron unreliable for deferred async matching. Pending matches may never complete.',
      mitigation: 'Use php-laravel with Action Scheduler for reliable deferred matching.',
    },
    'redis:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['SETNX idempotency for match deduplication'],
      implementationNotes: 'key={tenantId}:match:{userId}. TTL 24h from FREEDOM config.',
    },
    'jest:platform': {
      tier: 'IMPL_VARIES',
      stackCategory: 'test-runner',
      dimensions: ['TEST_FRAMEWORK'],
      neutralConcepts: ['virtualClock for OnboardingAbandoned SLA', 'mock F183 for degraded path'],
      implementationNotes: 'T009: jest.useFakeTimers(). virtualClock: true in test-matrix.json.',
    },
    'github-actions:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'ci-cd',
      dimensions: [],
      neutralConcepts: ['lint:naming, tsc, npm test gates'],
      implementationNotes: 'Standard gate.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
}
```

### T52 OnboardingCompletionBroadcaster

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'IMPL_VARIES',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_LANGUAGE'],
      neutralConcepts: [
        'always emit OnboardingCompleted regardless of matchStatus (IR-1)',
        'no PII in payload (IR-2)',
        'nudges respect consent (IR-3)',
        'F188 best-effort, failure does not block (IR-4)',
        'DNA-8: store before emit (IR-5)',
        'SETNX idempotency (IR-6)',
      ],
      implementationNotes: 'NestJS @Injectable() extending MicroserviceBase. 3-step: SETNX → nudge (best-effort try/catch) → storeDocument → enqueue.',
    },
    'redis:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['SETNX idempotency for completion deduplication'],
      implementationNotes: 'key={tenantId}:onboard-complete:{userId}. TTL 7 days (FREEDOM config).',
    },
    'jest:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'test-runner',
      dimensions: [],
      neutralConcepts: ['F188 throw → OnboardingCompleted still emits', 'consent=false → nudge not sent'],
      implementationNotes: 'Standard Jest. No virtualClock for T52.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
}
```

---

## ARBITER COUPLING ANNOTATIONS

Business rules are CONCEPT_NEUTRAL. Only node-nestjs code check patterns shown.

| Arbiter | Business Rule | NestJS Code Check |
|---------|--------------|-------------------|
| convergence::join-semantics | T51 MUST NOT start before ProfileEnrichmentCompleted | Entry guard: event type check before any processing |
| convergence::degraded-path | pending matchStatus must emit OnboardingCompleted | Conditional branch: if (score < threshold) enqueue with pending |
| broadcast::payload-contract | OnboardingCompleted payload contains no PII | DTO type check on event payload |
| broadcast::gdpr-cascade | nudges respect consent flags | Consent guard before F188 call |
| orchestration::correlationId-propagation | correlationId threaded through all events | Schema validator (CONCEPT_NEUTRAL) |
| orchestration::branch-resilience | T50 completes despite any single source failure | Promise.allSettled semantics |

---

## PHASE A GATE (v7 — INJECT)

All v4 gates unchanged. Add:

```bash
# NEW-A7: AF prompts seeded
node -e "
const es = /* ES client */;
const count = await es.count({ index: 'xiigen-prompts', body: {
  query: { bool: { must: [
    { term: { 'flowId.keyword': 'FLOW-02' }},
    { term: { 'connectionType.keyword': 'FLOW_SCOPED' }}
  ]}}
}});
if (count.body.count !== 12) throw new Error('Expected 12 AF prompts, got ' + count.body.count);
console.log('✅ NEW-A7: 12 AF prompts seeded for FLOW-02');
"

# EngineContracts seeded
node -e "
const es = /* ES client */;
for (const id of ['T50','T51','T52']) {
  const doc = await es.get({ index: 'xiigen-engine-contracts', id });
  if (!doc.body._source.stackCoupling) throw new Error(id + ' missing stackCoupling');
  console.log('✅', id, 'EngineContract seeded with stackCoupling');
}
"

# V29 — stackCoupling on T50/T51/T52
node -e "
const reg = /* load TaskTypeRegistry */;
['T50','T51','T52'].forEach(id => {
  const c = reg.get(id).data;
  if (!c.stackCoupling) throw new Error(id + ' missing stackCoupling');
  if (!c.stackCoupling.entries['node-nestjs:server']) throw new Error(id + ' missing priority server entry');
  console.log('✅', id, 'stackCoupling present');
});
"

# V30 — INCOMPATIBLE flags
node -e "
const reg = /* load TaskTypeRegistry */;
['T50','T51'].forEach(id => {
  const c = reg.get(id).data;
  const wp = c.stackCoupling.entries['php-wordpress:server'];
  if (!wp?.incompatible) throw new Error(id + ' php-wordpress INCOMPATIBLE flag missing');
  if (!wp?.mitigation) throw new Error(id + ' php-wordpress mitigation missing');
  console.log('✅', id, 'php-wordpress INCOMPATIBLE with mitigation');
});
"

# V31 — stateNotes on react-web:client
python3 -c "
import json
t = json.load(open('contracts/topologies/FLOW-02.topology.json'))
nodes = {n['nodeId']: n for n in t.get('nodes', [])}

mip = nodes['matching-in-progress']
react = mip['stackCoupling']['react-web:client']
assert react['stateNotes']['stateHolderType'] == 'useContext (OnboardingContext)', 'wrong stateHolderType'
assert react['stateNotes']['propagationRisk'] == 'MEDIUM', 'matching should be MEDIUM'

oip = nodes['onboarding-in-progress']
assert oip['stackCoupling']['react-web:client']['stateNotes']['stateHolderType'] == 'useState'

oc = nodes['onboarding-complete']
assert 'stateNotes' in oc['stackCoupling']['react-web:client']

print('✅ V31 stateNotes present on all 3 react-web:client nodes')
"

# naming-conventions-enforcer gate
npm run lint:naming   # exit 0
```

---

## PHASE B GATE (v7 — GENERATE)

```bash
# Submit each task type to AF pipeline — capture all 6 P5 metrics per run
for taskType in T50 T51 T52; do
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
ls server/src/engine/flows/business-onboarding-intelligence/*.service.ts
# Expected (AF-1 generated, not Claude Code written):
#   parallel-profile-enricher.service.ts
#   matching-convergence-gate.service.ts
#   onboarding-completion-broadcaster.service.ts
```

---

## PHASE C GATE (v7 — JUDGE)

```bash
# AF-9 scores for each task type
node -e "
for (const id of ['T50','T51','T52']) {
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

---

## PHASE D GATE (v7 — INTEGRATE)

```bash
npm run lint:naming   # exit 0

find server/src/engine/flows/business-onboarding-intelligence -name "*.service.ts"
# Expected: parallel-profile-enricher.service.ts
#           matching-convergence-gate.service.ts
#           onboarding-completion-broadcaster.service.ts

find server/src/engine/flows/business-onboarding-intelligence -name "t5*.ts" 2>/dev/null
# Expected: no output
```

---

## PHASE E GATE (v7 — PROMOTE)

```bash
# Promote to INJECTED
node -e "
for (const id of ['T50','T51','T52']) {
  await promotionLadder.promote(id, 'INJECTED', testTenantId);
  console.log('✅', id, 'promoted to INJECTED');
}
"

# DPO training data captured
node -e "
const dpo = await es.search({ index: 'xiigen-training-data', body: {
  query: { term: { 'flowId.keyword': 'FLOW-02' }}
}});
console.log('DPO triples captured:', dpo.body.hits.total.value);
if (dpo.body.hits.total.value < 3) throw new Error('Expected >= 3 DPO triples');
"

# Final verification
npm run lint:naming   # exit 0 (regression)
# Re-run V0-MODE, V0-SCOPE, V29/V30/V31 scripts from Phase A gate
```

---

## flow-completeness-checker v1.5 — 33/33 ✅

V1–V28 all pass (unchanged from v4).

```
V0-MODE ✅ implementationMode: "af-pipeline"
    SESSION files use afPipeline.run(), not create_file for services
    Phase structure: INJECT → GENERATE → JUDGE → INTEGRATE → PROMOTE
    12 AF prompts defined (4 per task type), seeded in Phase A NEW-A7
    Genesis prompts explicitly marked as AF-1 INPUT

V0-SCOPE ✅ stackTargets: ['node-nestjs'], clientTargets: ['react-web']
    Topology stateNotes: react-web:client only
    No Angular/Android stateNotes in plan body

V29 ✅ stackCoupling on T50, T51, T52:
    T50: STACK_COUPLED, entries: node-nestjs:server + php-wordpress:server (INCOMPATIBLE)
         + redis:platform + jest:platform
    T51: STACK_COUPLED, entries: node-nestjs:server + php-wordpress:server (INCOMPATIBLE)
         + redis:platform + jest:platform + github-actions:platform
    T52: IMPL_VARIES, entries: node-nestjs:server + redis:platform + jest:platform
    supportedServerStacks: ['node-nestjs'] on all three

V30 ✅ INCOMPATIBLE stacks flagged:
    T50 php-wordpress:server — INCOMPATIBLE — no parallel execution
    T51 php-wordpress:server — INCOMPATIBLE — wp_cron unreliable for deferred match

V31 ✅ stateNotes present on react-web:client (declared clientTarget):
    onboarding-in-progress: useState, feature-scoped, LOW
    matching-in-progress: useContext (OnboardingContext), feature-scoped, MEDIUM
    onboarding-complete: useState (transient), feature-scoped, LOW
```

---

## SESSION-0 ADDITIONS (FC-19, FC-20, FC-21)

```
FC-19: All 3 genesis prompts in HybridGenesisPrompt format
       ✓ neutralIronRules[] present, no framework names in Section 1
       ✓ stackImplementations['node-nestjs:server'] present on all three
       ✓ T50 + T51 php-wordpress:server: incompatible: true

FC-20: INCOMPATIBLE stacks flagged with reason + mitigation
       ✓ T50 php-wordpress:server: incompatible + reason + mitigation
       ✓ T51 php-wordpress:server: incompatible + reason + mitigation

FC-21: stateNotes present on react-web:client topology nodes
       ✓ matching-in-progress: useContext (OnboardingContext), MEDIUM propagation
       ✓ onboarding-in-progress: useState, LOW propagation
       ✓ onboarding-complete: useState (transient), LOW propagation
```

---

## JIRA COMMENT TEMPLATE (naming-conventions-enforcer Rule 5)

```
## What was built — Phase D [Flow: FLOW-02 — Business Onboarding Intelligence]

### Business purpose
Implemented the three task types that enrich and validate a new tenant user's
business profile after registration. ParallelProfileEnricher (T50) fans out to
N configured enrichment sources simultaneously, waiting for all to complete or
time out — building the most complete profile possible even if some sources fail.
MatchingConvergenceGate (T51) runs the matching algorithm once enrichment finishes;
if the profile score is below threshold, it defers the match and emits a
"pending" result — the user is never blocked. OnboardingCompletionBroadcaster
(T52) always emits OnboardingCompleted regardless of match outcome, unlocking
all Wave 2 flows (FLOW-03 through FLOW-07) for this tenant.

### Flow context
- **Flow:** FLOW-02 — Business Onboarding Intelligence
- **Task types:** T50 ParallelProfileEnricher, T51 MatchingConvergenceGate,
  T52 OnboardingCompletionBroadcaster
- **Will be used by:** FLOW-03 (Event Creation & Promotion) and FLOW-04–07
  all gate on OnboardingCompleted (CF-4). T51's background match result
  is pushed to the React client via OnboardingContext WebSocket.

### Technical delivery
- 3 service files in engine/flows/business-onboarding-intelligence/
- 8 factory interfaces registered (F182–F189)
- [N] tests added (unit: [N], e2e: [N])
- Key factories: F182 IBusinessProfileService (DATABASE FABRIC),
  F183 IMatchingService (INJECTABLE — algorithm from FREEDOM config),
  F184 IEnrichmentSourceService (INJECTABLE — tenant brings own sources),
  F188 INotificationService (INJECTABLE — best-effort nudges)
- Stack: node-nestjs:server. T50 STACK_COUPLED (fan-in),
  T51 STACK_COUPLED (convergence), T52 IMPL_VARIES.
  T50 + T51 php-wordpress INCOMPATIBLE.

### Architecture fit
T50 uses Promise.allSettled for fan-in — the only correct Node.js pattern for
IR-1 (all branches run) + IR-2 (partial failure OK). T51 convergence gate
enforces that matching never starts before enrichment completes (DNA-9 event
ordering). T52 always fires OnboardingCompleted — Wave 2 flows are never blocked
by match quality. OnboardingContext React provider handles T51's background push
across onboarding screens without requiring a global store.
```

---

## KEY FACTS FOR SESSION FILES

```
flow_name: "Business Onboarding Intelligence"
stackTargets: ['node-nestjs']
clientTargets: ['react-web']
implementationMode: af-pipeline

AF-1 generates these files (Claude Code does NOT create them):
  parallel-profile-enricher.service.ts     ← T50
  matching-convergence-gate.service.ts      ← T51
  onboarding-completion-broadcaster.service.ts ← T52
Directory: engine/flows/business-onboarding-intelligence/

Test baseline (read at execution time):
  Entry: cd server && npx jest --passWithNoTests 2>&1 | tail -1
  After Phase A:  entry + 10  (schema validation tests)
  After Phase E:  entry + 40  (server +30 from AF-generated code, client +10)
  Client delta:   +10 (C2:4, background push tests:+6)

Key react-web state pattern:
  onboarding-in-progress: useState — server-round-trip only, LOW
  matching-in-progress: useContext (OnboardingContext) — T51 push crosses screens, MEDIUM
  onboarding-complete: useState (transient from FlowStateSnapshot) — LOW

Stack coupling summary:
  T50: STACK_COUPLED — fan-in async model differs per stack
       php-wordpress: ⛔ INCOMPATIBLE (no parallel execution)
  T51: STACK_COUPLED — convergence + deferred background job differs per stack
       php-wordpress: ⛔ INCOMPATIBLE (wp_cron unreliable)
  T52: IMPL_VARIES — broadcast pattern, DI + async syntax varies

AF pipeline expectations:
  Phase A: 12 prompts + 3 contracts seeded
  Phase B: 3 afPipeline.run() calls — 6 P5 metrics captured per run
  Phase C: AF-9 score >= 80 for promotion
  Phase E: >= 3 DPO triples captured, all promoted to INJECTED

Priority stacks: node-nestjs (server), react-web (client)
```

---

## SESSION FILES TO PRODUCE

```
FLOW-02-STATE.json               ← implementationMode: "af-pipeline"

SESSION-FLOW-02-A.md             ← INJECT phase
                                    Write EngineContracts for T50/T51/T52
                                    Write 12 AF prompts (4 per task type)
                                    Seed to ES (contracts + prompts)
                                    Create event schemas, topology, test matrix
                                    FC-19/20/21 self-checks
                                    V0-MODE + V0-SCOPE + V29/V30/V31 checks
                                    NEW-A7: assert 12 prompts seeded

SESSION-FLOW-02-B.md             ← GENERATE phase
                                    Submit T50 to afPipeline.run()
                                    Submit T51 to afPipeline.run()
                                    Submit T52 to afPipeline.run()
                                    Capture 6 P5 metrics per task type
                                    Verify 3 .service.ts files exist (AF-1 output)

SESSION-FLOW-02-C.md             ← JUDGE phase
                                    AF-6/7/8/9 scoring per task type
                                    PromptPatch iteration if score 60–79
                                    Escalate to Luba if score < 60
                                    All task types must reach score >= 80

SESSION-FLOW-02-D.md             ← INTEGRATE phase
                                    Wire generated services into engine module
                                    lint:naming gate (exit 0)
                                    npm test (server + client)
                                    Client integration tests (react-web): C2, background push

SESSION-FLOW-02-E.md             ← PROMOTE phase
                                    Promote T50/T51/T52 to INJECTED
                                    DPO training data export (>= 3 triples)
                                    Final V0-MODE/V0-SCOPE/V29/V30/V31 verification
                                    lint:naming regression gate

docs/FLOW-02-REFERENCE.md        ← this document
```

---

## APPENDIX A — NON-PRIORITY STACKS (for FLOW-37 reference only)

Claude Code executing FLOW-02 phases MUST IGNORE this appendix entirely.

```
SERVER STACKS TO ADD IN FLOW-37:
  T50: python-fastapi (asyncio.gather), php-laravel (Bus::batch), dotnet-aspnet
       (Task.WhenAll), rust-axum (join_all) — all STACK_COUPLED
       php-wordpress: ⛔ INCOMPATIBLE (already flagged)
  T51: python-fastapi, php-laravel (Queue::later), dotnet-aspnet, rust-axum
       — IMPL_VARIES or STACK_COUPLED per stack
       php-wordpress: ⛔ INCOMPATIBLE (already flagged)
  T52: python-fastapi, php-laravel, php-wordpress (degraded) — all IMPL_VARIES

CLIENT STACKS TO ADD IN FLOW-37:
  angular:client — all 3 topology nodes need:
    onboarding-in-progress: BehaviorSubject in WizardProgressService, LOW
    matching-in-progress: BehaviorSubject in MatchingStatusService, MEDIUM propagation
      (WebSocket subscription, CanActivateFn on /onboarding-complete)
    onboarding-complete: component-local variable, CanActivateFn redirect guard
  android-kotlin:client — ViewModel + StateFlow for all 3 nodes
  ios-swift:client — Combine Published + NavigationStack

FULL ANALYSIS: see STACK-COUPLING-AUDIT-FLOW-01-04-v1.md
```
