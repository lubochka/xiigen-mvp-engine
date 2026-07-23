# FLOW-01: USER REGISTRATION & ONBOARDING — REFERENCE PLAN v9
## Prerequisites: All infrastructure flows + FLOW-35 + FLOW-36 + FLOW-00 + FLOW-00.1 + FLOW-00.2 complete
## Date: 2026-03-22
## SK-418 v1.3 FlowCompletenessChecker: 31/31 ✅

---

## WHAT CHANGED FROM v8 → v9

| What v8 had | What v9 adds |
|-------------|-------------|
| flow_id only in STATE.json | flow_name: "User Registration & Onboarding" |
| No stackTargets / clientTargets | stackTargets: ['node-nestjs'], clientTargets: ['react-web'] |
| No stackCoupling on T47/T48/T49 | Full stackCoupling annotation per task type (V29 ✅) |
| No INCOMPATIBLE flags | T48 php-wordpress INCOMPATIBLE flagged with mitigation (V30 ✅) |
| No stateNotes on topology nodes | stateNotes per client node: stateHolderType, stateScope, propagationRisk (V31 ✅) |
| Single-text genesis prompts (NestJS-only) | HybridGenesisPrompt format: Section 1 neutral + Section 4 per-stack |
| No platform entries in coupling map | redis:platform, jest:platform, aws-ses:platform entries |
| FC-1 through FC-18 in SESSION-0 | FC-19, FC-20, FC-21 added |
| Service files: unnamed | user-registration-initiator.service.ts, email-verification-wait.service.ts, onboarding-delivery.service.ts |
| No Jira comment structure | SK-430 Rule 5: 5-section business context format |
| No lint:naming in Phase D gate | npm run lint:naming added to Phase D + Phase E gates |
| SK-418: 28/28 | SK-418 v1.3: 31/31 (V29 stackCoupling, V30 INCOMPATIBLE flags, V31 stateNotes) |

V1–V28 content unchanged from v7. Artifact numbers unchanged.

---

## WAVE ASSIGNMENT (unchanged)

```
FLOW-01: Wave 0 — sequential
  parallel_wave: null
  prerequisite: FLOW-35 + FLOW-36 + FLOW-00 + FLOW-00.1 + FLOW-00.2 ACTIVE
  downstream: FLOW-02 (Wave 1)
```

---

## STATE.json (v9)

```json
{
  "flow_id": "FLOW-01",
  "flow_name": "User Registration & Onboarding",
  "parallel_wave": null,
  "wave": 0,
  "current_phase": "session-0",
  "completed_phases": [],
  "test_baseline": null,
  "client_test_delta": 19,
  "stackTargets": ["node-nestjs"],
  "clientTargets": ["react-web"]
}
```

---

## ARTIFACT NUMBERS (unchanged)

```
Task types:  T47 SSOAndEmailAuth, T48 EmailVerificationWaitState, T49 OnboardingDelivery
Factories:   F174–F181 (8 factories)
BFA rules:   CF-1–CF-8 (verify present, do not re-seed)
Family:      1
New arbiters: routing::auth-security, routing::path-safety,
  processing::pipeline-linearity, processing::wait-state,
  orchestration::gate-event (criticalRules: IR-1),
  orchestration::fan-out-resilience
```

---

## SERVICE FILE NAMES (v9 — SK-430 Rule 1)

Pattern: `{verb}-{domain-noun}.service.ts`
Directory: `engine/flows/user-registration-onboarding/`

| Task Type | ID | Service File | Class Name |
|-----------|----|--------------| ----------|
| SSOAndEmailAuth | T47 | `user-registration-initiator.service.ts` | `UserRegistrationInitiator` |
| EmailVerificationWaitState | T48 | `email-verification-wait.service.ts` | `EmailVerificationWait` |
| OnboardingDelivery | T49 | `onboarding-delivery.service.ts` | `OnboardingDelivery` |

---

## PASSES 1–6 (unchanged from v7)

All event contracts (12 schemas), retry/compensation, observability,
E2E test matrix (11 scenarios) identical to v7. See v7 for full content.

---

## PASS 3 — CLIENT STATE MAP (v9 — adds stackCoupling per node)

### Node: registration-in-progress (T47 running)

```json
{
  "nodeId": "registration-in-progress",
  "serverTask": "T47",
  "clientState": {
    "screen": "RegistrationLoading",
    "humanTimescale": "2–5 seconds",
    "slaMs": 10000,
    "availableActions": [],
    "optimisticActions": {},
    "appReopenBehavior": "query FlowStateSnapshot → if currentStep=registration-in-progress AND stale >30s → show RegistrationFailed screen, offer retry",
    "errorState": {
      "slaBreached": {
        "screen": "RegistrationFailed",
        "availableActions": ["retry-registration"]
      }
    }
  },
  "stackCoupling": {
    "react-web:client": {
      "tier": "IMPL_VARIES",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_STATE_MODEL"],
      "neutralConcepts": [
        "show loading indicator while T47 executes",
        "if stale >30s on app reopen: show failed state"
      ],
      "implementationNotes": "useState<'loading'|'failed'>. useEffect on mount: if stale > 30s, set 'failed'. No countdown needed — 2-5s is below user perception threshold.",
      "stateNotes": {
        "stateHolderType": "useState",
        "stateHolderTypeReason": "State is local to RegistrationLoading screen. No cross-component propagation. Screen unmounts when registration completes.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "Loading state dies when navigation leaves this screen. Correct.",
        "propagationRisk": "LOW",
        "propagationRiskReason": "Only RegistrationLoadingScreen reads this state.",
        "routeGuardRequired": false,
        "exitGuardRequired": false
      }
    },
    "angular:client": {
      "tier": "IMPL_VARIES",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_STATE_MODEL"],
      "neutralConcepts": [
        "show loading indicator while T47 executes",
        "if stale >30s on app reopen: redirect to failed state"
      ],
      "implementationNotes": "Component-local boolean isLoading. CanActivateFn checks FlowStateSnapshot on route entry — if stale > 30s, returns UrlTree to /registration-failed before component mounts. No service needed; stale check is a one-shot guard.",
      "stateNotes": {
        "stateHolderType": "component-local boolean",
        "stateHolderTypeReason": "No replay needed. Loading state is not shared with any other component. Guard handles stale check at route level.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "Component-local. Destroyed on navigation.",
        "propagationRisk": "LOW",
        "propagationRiskReason": "Single component plus one CanActivate guard (which uses first() — no subscription).",
        "routeGuardRequired": true,
        "exitGuardRequired": false,
        "note": "RegistrationStalenessGuard as CanActivateFn: inject FlowStateService, call first(), check staleness, return UrlTree to /registration-failed if stale > 30s. Component itself just shows spinner."
      }
    }
  }
}
```

### Node: awaiting-email-verification (T48 running)

```json
{
  "nodeId": "awaiting-email-verification",
  "serverTask": "T48",
  "clientState": {
    "screen": "VerificationWaiting",
    "humanTimescale": "up to 24 hours",
    "slaMs": 86400000,
    "availableActions": ["ResendVerificationRequested", "ChangeEmailRequested"],
    "optimisticActions": {
      "ResendVerificationRequested": {
        "optimisticState": { "button": "disabled", "label": "Email sent!" },
        "confirmationEvent": "VerificationEmailSent",
        "rollbackEvent": "ResendRateLimited",
        "rollbackState": {
          "button": "enabled",
          "label": "Resend email",
          "error": "Too many requests. Try again in {N} minutes."
        }
      }
    },
    "appReopenBehavior": "query FlowStateSnapshot → restore VerificationWaiting screen with remainingMs countdown. If sla.remainingMs ≤ 0 → show VerificationExpired screen",
    "errorState": {
      "slaBreached": {
        "screen": "VerificationExpired",
        "availableActions": ["ResendVerificationRequested", "ChangeEmailRequested"]
      }
    }
  },
  "stackCoupling": {
    "react-web:client": {
      "tier": "STACK_COUPLED",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_STATE_MODEL", "CLIENT_LIFECYCLE"],
      "neutralConcepts": [
        "SLA countdown visible, decrements from sla.remainingMs",
        "ResendVerificationRequested: optimistic button disable, rollback on rate-limit",
        "App reopen: restore countdown from FlowStateSnapshot",
        "SLA breach: show VerificationExpired screen"
      ],
      "implementationNotes": "useState<ButtonState> for resend button ('idle'|'sent'|'rate-limited'). useEffect + setInterval(1000) for countdown. Fetch FlowStateSnapshot on mount for app reopen. if (remainingMs <= 0) navigate to /verification-expired.",
      "stateNotes": {
        "stateHolderType": "useState",
        "stateHolderTypeReason": "Button state and countdown are local to VerificationWaitingScreen. No cross-component propagation needed. SLA breach triggers navigation, not shared state.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "State lives in VerificationWaitingScreen component. Unmounts on navigation.",
        "propagationRisk": "LOW",
        "propagationRiskReason": "Only VerificationWaitingScreen reads this state.",
        "routeGuardRequired": false,
        "exitGuardRequired": false
      }
    },
    "angular:client": {
      "tier": "STACK_COUPLED",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_STATE_MODEL", "CLIENT_LIFECYCLE", "CLIENT_ROUTING"],
      "neutralConcepts": [
        "SLA countdown visible, decrements from sla.remainingMs",
        "ResendVerificationRequested: optimistic button disable, rollback on rate-limit",
        "App reopen: restore countdown from FlowStateSnapshot",
        "SLA breach: redirect to VerificationExpired screen"
      ],
      "implementationNotes": "EmailVerificationService in EmailVerificationFeatureModule. BehaviorSubject<VerificationState> for countdown + button. CanActivateFn checks sla.isBreached on route entry — returns UrlTree to /verification-expired if breached. async pipe in template for auto-cleanup.",
      "stateNotes": {
        "stateHolderType": "BehaviorSubject",
        "stateHolderTypeReason": "App reopen requires restoring current remainingMs immediately on subscribe. Late-subscribing component (navigating back) must get current state, not wait for next emission.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "EmailVerificationService in EmailVerificationFeatureModule. State destroyed when module unloads. Root scope would keep countdown alive during unrelated navigation.",
        "propagationRisk": "MEDIUM",
        "propagationRiskReason": "2-3 consumers: VerificationWaitingComponent (primary, async pipe), optional HeaderTimerBadge (if exists), VerificationExpiredGuard (CanActivateFn, uses first() — no ongoing subscription).",
        "routeGuardRequired": true,
        "exitGuardRequired": false,
        "stateConsumerMap": {
          "VerificationWaitingComponent": "Primary consumer. async pipe — auto-cleanup on destroy.",
          "VerificationExpiredGuard": "CanActivateFn. Uses first() to check sla.isBreached — no ongoing subscription. Returns UrlTree to /verification-expired if breached.",
          "HeaderTimerBadge (optional)": "If implemented: must use async pipe. Must inject the feature-module service, not a root copy."
        },
        "note": "VerificationExpiredGuard handles appReopenBehavior at the router level. The component never redirects itself. Guard fires before the component mounts — user never sees a flash of the waiting screen before redirect."
      }
    },
    "android-kotlin:client": {
      "tier": "STACK_COUPLED",
      "stackCategory": "mobile-native",
      "dimensions": ["CLIENT_STATE_MODEL", "CLIENT_LIFECYCLE"],
      "neutralConcepts": [
        "SLA countdown visible",
        "Resend button: optimistic disable, rollback on rate-limit",
        "App reopen: restore from FlowStateSnapshot"
      ],
      "implementationNotes": "VerificationViewModel with StateFlow<VerificationState>. collectAsStateWithLifecycle() in Fragment. countDownTimer or coroutine delay loop for countdown. onResume(): fetch FlowStateSnapshot.",
      "stateNotes": {
        "stateHolderType": "StateFlow",
        "stateHolderTypeReason": "Holds current state. Fragment resuming via onResume gets current remainingMs immediately (equivalent to BehaviorSubject).",
        "stateScope": "feature-scoped",
        "stateScopeReason": "ViewModel scoped to Fragment — destroyed on back stack pop.",
        "propagationRisk": "LOW",
        "propagationRiskReason": "Single VerificationFragment consumes this StateFlow.",
        "routeGuardRequired": false
      }
    },
    "php-server-rendered:client": {
      "tier": "INCOMPATIBLE",
      "stackCategory": "client-ssr",
      "dimensions": ["CLIENT_STATE_MODEL"],
      "neutralConcepts": ["SLA countdown", "optimistic button state"],
      "implementationNotes": "",
      "incompatible": true,
      "incompatibleReason": "SLA countdown and optimistic button state require persistent client-side reactive state. Server-rendered PHP has no client state layer — every interaction requires a page reload.",
      "mitigation": "Implement countdown and optimistic state as a JavaScript layer within the PHP page (React component embedded, Vue island pattern). Without JS layer, UX is degraded: user sees a spinner on page reload instead of a countdown."
    }
  }
}
```

### Node: onboarding-wizard (T49 running)

```json
{
  "nodeId": "onboarding-wizard",
  "serverTask": "T49",
  "clientState": {
    "screen": "OnboardingWizard",
    "humanTimescale": "2–15 minutes",
    "slaMs": null,
    "availableActions": ["submit-profile", "submit-questionnaire", "submit-business-data"],
    "optimisticActions": {
      "submit-profile": {
        "optimisticState": { "step": 1, "indicator": "complete" },
        "confirmationEvent": "FlowStateSnapshot.completedSteps includes 'profile'",
        "rollbackEvent": "FlowStateSnapshot.completedSteps does not include 'profile'",
        "rollbackState": { "step": 1, "indicator": "error", "error": "Could not save profile. Try again." }
      }
    },
    "appReopenBehavior": "query FlowStateSnapshot → restore OnboardingWizard at correct step based on completedSteps array. Show completed steps as checked, current step as active.",
    "errorState": {}
  },
  "stackCoupling": {
    "react-web:client": {
      "tier": "STACK_COUPLED",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_STATE_MODEL", "CLIENT_LIFECYCLE"],
      "neutralConcepts": [
        "multi-step wizard: restore correct step on app reopen",
        "submit-profile: optimistic step indicator, rollback on failure",
        "completedSteps[] from FlowStateSnapshot is authoritative"
      ],
      "implementationNotes": "useState<WizardState> with currentStep and stepStatuses. useEffect on mount: fetch FlowStateSnapshot, restore from completedSteps[]. Optimistic: setStepStatus('complete') on submit, revert to 'error' on rollback.",
      "stateNotes": {
        "stateHolderType": "useState",
        "stateHolderTypeReason": "Wizard state is local to OnboardingWizardScreen. Multiple step submissions are optimistic-local. FlowStateSnapshot is the authoritative reconciliation source.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "Wizard state lives in OnboardingWizardScreen. Unmounts after onboarding completes.",
        "propagationRisk": "LOW",
        "propagationRiskReason": "Only OnboardingWizardScreen reads step state.",
        "routeGuardRequired": false,
        "exitGuardRequired": false
      }
    },
    "angular:client": {
      "tier": "STACK_COUPLED",
      "stackCategory": "client-spa",
      "dimensions": ["CLIENT_STATE_MODEL", "CLIENT_LIFECYCLE", "CLIENT_ROUTING"],
      "neutralConcepts": [
        "multi-step wizard: restore correct step on app reopen",
        "submit-profile: optimistic step indicator, rollback on failure"
      ],
      "implementationNotes": "WizardStateService in OnboardingFeatureModule. BehaviorSubject<WizardState> with currentStep and stepStatuses. OnInit: GET FlowStateSnapshot, patch BehaviorSubject from completedSteps[]. Optimistic: next({ ...current, stepStatuses: {..., profile: 'complete'} }). Rollback: next({ ...current, stepStatuses: {..., profile: 'error'} }).",
      "stateNotes": {
        "stateHolderType": "BehaviorSubject",
        "stateHolderTypeReason": "App reopen requires restoring current wizard step immediately. User navigating back to wizard mid-flow must see correct step without waiting for server round-trip.",
        "stateScope": "feature-scoped",
        "stateScopeReason": "WizardStateService in OnboardingFeatureModule. Destroyed on module unload. No persistence needed beyond the onboarding flow.",
        "propagationRisk": "LOW",
        "propagationRiskReason": "Single OnboardingWizardComponent subscribes. Each step component reads from the same service but only the active step is mounted.",
        "routeGuardRequired": false,
        "exitGuardRequired": false,
        "note": "requiresDraftState: false — wizard step state comes from FlowStateSnapshot (server), not local storage. No CanDeactivate guard needed. If user navigates away mid-wizard, completedSteps[] persists on server for app reopen."
      }
    }
  }
}
```

### clientArchitecture section (unchanged from v7)

```json
"clientArchitecture": {
  "requiresDraftState": false,
  "draftSteps": null,
  "offlineQueue": {
    "queueable": ["ResendVerificationRequested"],
    "notQueueable": ["ChangeEmailRequested"],
    "notQueueableReason": {
      "ChangeEmailRequested": "Email change revokes existing token — irreversible side effect, requires live connection"
    }
  },
  "backgroundSteps": []
}
```

---

## PASS 7 — GENESIS PROMPTS (v9 — HybridGenesisPrompt format)

All three genesis prompts converted from single-text NestJS-only format
to the Option C hybrid structure (D-STACK-2). Section 1 contains only
XIIGen vocabulary. NestJS-specific code moves to Section 4.

### T47 UserRegistrationInitiator — HybridGenesisPrompt

```
TASK TYPE: T47 | FLOW-01 — User Registration & Onboarding

SECTION 1 — NEUTRAL IRON RULES (deliver verbatim to every stack)
  IR-1: No PII (email address, name, phone) in the UserRegistrationInitiated
        event payload. attendeeId = hash(userId+tenantId) only.
  IR-2: Registration rate-limit MUST read limit value from FREEDOM config
        key 'flow01_registration_rate_limit_per_hour'. Never hardcode the number.
  IR-3: Verification token TTL MUST read from FREEDOM config
        key 'flow01_verification_token_ttl_hours'. Never hardcode 24.
  IR-4: DNA-8: storeDocument(UserRegistrationInitiated) BEFORE enqueue().
  IR-5: DNA-5: tenantId on all database writes. Every query scoped to tenant.
  IR-6: SETNX idempotency key for duplicate registration detection:
        key = hash(tenantId + email + 'registration'). If key exists: return
        DataProcessResult.failure('DUPLICATE_REGISTRATION_IN_PROGRESS').

SECTION 2 — CONCEPT DESCRIPTION
  UserRegistrationInitiator accepts a user's registration request (via SSO or
  email+password), validates it is not a duplicate, generates a verification
  token, persists the registration event, and emits it for downstream processing.
  It is the entry point of the entire user lifecycle. It never sends the email
  directly — it emits an event that the notification service handles.

SECTION 3 — EVENT CONTRACTS
  CONSUMES: [none — HTTP entry point POST /auth/register]
  EMITS:    UserRegistrationInitiated, RegistrationRateLimitExceeded (compensation)
  INTEGRATION BOUNDARY:
    F174 IUserRepository:           INJECTABLE
    F175 IEmailVerificationQueue:   INJECTABLE
    F176 ITokenGenerationService:   INJECTABLE
    F177 IRateLimitService:         INJECTABLE
    F181 IAuditTrailService:        PLATFORM-ONLY

SECTION 4 — STACK IMPLEMENTATIONS

  node-nestjs:server ← PRIORITY
    "Generate a NestJS @Injectable() class named UserRegistrationInitiator
    extending MicroserviceBase. Inject F174–F177, F181 via constructor.
    Token generation: crypto.randomUUID() or crypto.randomBytes(32).toString('hex').
    Rate limiting: @Throttle() decorator via ThrottlerModule — reads from FREEDOM config.
    Idempotency: SET key NX EX ttl via Redis (IDatabaseService SETNX pattern).
    Return Promise<DataProcessResult<RegistrationResult>>."

  python-fastapi:server
    "[Stub — FLOW-37 priority]
    Use secrets.token_urlsafe(32) for token. slowapi for rate limiting.
    SQLAlchemy / asyncpg for F174. asyncio patterns throughout."

  php-laravel:server
    "[Stub — FLOW-37 priority]
    Str::random(64) for token. Laravel Throttle middleware for rate limiting.
    Eloquent for F174. Laravel Queue for emit."

  php-wordpress:server
    "degraded: true
    wp_generate_password(64, false) for token.
    Rate limiting via wp_transient — degraded: WordPress has no native rate
    limiter. Custom transient-based counter required. Reliability ⚠️.
    F174 via $wpdb. No native DI — manual instantiation."

  dotnet-aspnet:server
    "[Stub — FLOW-37 priority]
    RandomNumberGenerator.GetHexString(64) for token.
    ASP.NET Core RateLimiterPolicy. Entity Framework Core for F174."

  rust-axum:server
    "[Stub — FLOW-37 priority]
    rand::thread_rng().gen::<[u8; 32]>() for token.
    tower middleware for rate limiting. sqlx for F174."

  redis:platform
    "CONCEPT_NEUTRAL
    SETNX for idempotency key (IR-6) and rate-limit counter (IR-2).
    Key format: '{tenantId}:reg:{emailHash}'. TTL from FREEDOM config.
    All server stacks access Redis via IDatabaseService FABRIC — no direct Redis import."

  jest:platform
    "CONCEPT_NEUTRAL
    Standard Jest unit tests. No virtualClock needed (no TTL-gated scenario in T47).
    Mock IDatabaseService for SETNX. Mock IRateLimitService for rate-limit tests."
```

### T48 EmailVerificationWait — HybridGenesisPrompt

```
TASK TYPE: T48 | FLOW-01 — User Registration & Onboarding

SECTION 1 — NEUTRAL IRON RULES
  IR-1: Verification token TTL MUST read from FREEDOM config
        key 'flow01_verification_token_ttl_hours'. Score-0 if hardcoded.
  IR-2: No PII in EmailVerificationPending event. Token stored server-side only.
  IR-3: ResendVerificationRequested is idempotent: new token replaces old.
        SETNX key for resend rate-limit: key = hash(tenantId + userId + 'resend').
  IR-4: DNA-8: storeDocument() BEFORE any event emit on every transition.
  IR-5: On TTL expiry: emit EmailVerificationExpired. Do NOT silently expire.
  IR-6: ChangeEmailRequested revokes current token immediately before issuing new one.
        Both operations in a single atomic unit — partial revoke is a score-0 violation.

SECTION 2 — CONCEPT DESCRIPTION
  EmailVerificationWait holds the registration flow open while the user's email
  address is verified. It manages the 24-hour verification window, handles resend
  requests (idempotent, rate-limited), processes email changes (atomic token revoke
  + reissue), and emits expiry events when the window closes without verification.
  This is a long-lived stateful service — the registration is not complete until
  this task type transitions to DONE.

SECTION 3 — EVENT CONTRACTS
  CONSUMES: UserRegistrationInitiated (QUEUE FABRIC — from T47)
  EMITS:    EmailVerificationPending, VerificationEmailSent,
            ResendRateLimited, EmailVerificationExpired,
            EmailVerificationCompleted → triggers T49
  INTEGRATION BOUNDARY:
    F175 IEmailVerificationQueue:   INJECTABLE
    F176 ITokenGenerationService:   INJECTABLE
    F178 IEmailDeliveryService:     INJECTABLE
    F179 IVerificationStateStore:   INJECTABLE
    F181 IAuditTrailService:        PLATFORM-ONLY

SECTION 4 — STACK IMPLEMENTATIONS

  node-nestjs:server ← PRIORITY
    "Generate a NestJS @Injectable() class named EmailVerificationWait
    extending MicroserviceBase. TTL-triggered expiry via Bull/BullMQ delayed job
    OR @Cron() check. Job scheduled at registration time, TTL from FREEDOM config.
    Token stored in DATABASE FABRIC via F179. Resend: replace token, reschedule job.
    Return Promise<DataProcessResult<VerificationState>>."

  python-fastapi:server
    "[Stub — FLOW-37 priority]
    APScheduler or Celery beat for TTL expiry check.
    asyncio patterns. F179 via SQLAlchemy."

  php-laravel:server
    "[Stub — FLOW-37 priority]
    Laravel Scheduler in App\\Console\\Kernel for TTL check.
    Queue::later() for delayed expiry event."

  php-wordpress:server
    "INCOMPATIBLE
    wp_cron fires only on page load — unreliable for precise 24h TTL enforcement.
    Verifications may never expire if no page load occurs in 24h.
    Use php-laravel for reliable scheduled token expiry.
    Mitigation: Action Scheduler plugin provides more reliable scheduling,
    but still depends on traffic. Not suitable for security-critical TTL enforcement."

  dotnet-aspnet:server
    "[Stub — FLOW-37 priority]
    IHostedService with PeriodicTimer or Quartz.NET for TTL check."

  rust-axum:server
    "[Stub — FLOW-37 priority]
    tokio::time::sleep in spawned task for TTL expiry."

  redis:platform
    "CONCEPT_NEUTRAL
    Token storage via F179 with TTL metadata. SETNX for resend rate-limit (IR-3).
    Key: '{tenantId}:verify:{userId}'. TTL set from FREEDOM config.
    All stacks access via IDatabaseService FABRIC."

  aws-ses:platform (or equivalent email delivery service)
    "CONCEPT_NEUTRAL
    F178 IEmailDeliveryService resolves to SES, SendGrid, or Postmark via FABRIC.
    The delivery service choice does not affect T48 logic — it is INJECTABLE.
    Template: verification link with token. No PII in email body beyond the link."

  jest:platform
    "IMPL_VARIES [TEST_FRAMEWORK]
    T005 virtualClock test: simulate 25h elapsed to trigger EmailVerificationExpired.
    Mock Bull/BullMQ delayed job in NestJS. In other stacks: mock equivalent scheduler.
    virtualClock: true in test-matrix.json for T005."

  github-actions:platform
    "CONCEPT_NEUTRAL
    lint:naming gate added to CI after FLOW-00.1. tsc --noEmit. npm test.
    T48 has no additional CI requirements beyond standard gate."
```

### T49 OnboardingDelivery — HybridGenesisPrompt

```
TASK TYPE: T49 | FLOW-01 — User Registration & Onboarding

SECTION 1 — NEUTRAL IRON RULES
  IR-1: OnboardingCompleted MUST NOT emit until all wizard steps are confirmed
        complete by FlowStateSnapshot.completedSteps[]. Never emit on partial completion.
  IR-2: No PII in OnboardingCompleted payload. profileScore and matchStatus only.
  IR-3: Welcome email: best-effort. If email delivery fails, do NOT block
        OnboardingCompleted emission. Log failure, continue.
  IR-4: DNA-8: storeDocument(OnboardingCompleted) BEFORE enqueue().
  IR-5: DNA-5: tenantId on all writes.
  IR-6: Idempotency key: hash(tenantId + userId + 'onboarding-complete').
        SETNX before emitting. Duplicate detection prevents double-onboarding.

SECTION 2 — CONCEPT DESCRIPTION
  OnboardingDelivery runs after email verification completes. It orchestrates the
  delivery of the onboarding experience: persists the completed profile, sends the
  welcome email (best-effort), provisions the tenant workspace, and emits
  OnboardingCompleted which unlocks downstream flows (FLOW-02 through FLOW-07).
  It is the terminal task type of FLOW-01.

SECTION 3 — EVENT CONTRACTS
  CONSUMES: EmailVerificationCompleted (QUEUE FABRIC — from T48)
  EMITS:    OnboardingCompleted (→ unlocks FLOW-02..07 via CF-4),
            OnboardingWelcomeEmailSent, OnboardingDeliveryFailed (compensation)
  INTEGRATION BOUNDARY:
    F174 IUserRepository:           INJECTABLE
    F180 IWorkspaceProvisionService: INJECTABLE
    F178 IEmailDeliveryService:     INJECTABLE
    F181 IAuditTrailService:        PLATFORM-ONLY

SECTION 4 — STACK IMPLEMENTATIONS

  node-nestjs:server ← PRIORITY
    "Generate a NestJS @Injectable() class named OnboardingDelivery
    extending MicroserviceBase. Inject F174, F178, F180, F181 via constructor.
    Steps: (1) persist completed profile via F174, (2) send welcome email via F178
    (best-effort: catch and log, do not rethrow), (3) provision workspace via F180,
    (4) storeDocument(OnboardingCompleted) then enqueue. SETNX idempotency before step 1.
    Return Promise<DataProcessResult<OnboardingResult>>."

  python-fastapi:server
    "[Stub — FLOW-37 priority] async def, Depends() injection, asyncio patterns."

  php-laravel:server
    "[Stub — FLOW-37 priority] Job class, Queue dispatch, Eloquent for F174."

  php-wordpress:server
    "[Stub — degraded] wp_mail() for F178. $wpdb for F174. No workspace provisioning
    abstraction — F180 requires custom implementation. No DI — manual instantiation."

  dotnet-aspnet:server
    "[Stub — FLOW-37 priority] Scoped service, IServiceScopeFactory, Task<> async."

  rust-axum:server
    "[Stub — FLOW-37 priority] async fn, Arc<dyn IUserRepository>, tokio."

  redis:platform
    "CONCEPT_NEUTRAL
    SETNX for idempotency key (IR-6). TTL: 7 days (FREEDOM config key
    'flow01_onboarding_idempotency_ttl_days')."

  jest:platform
    "CONCEPT_NEUTRAL
    No virtualClock needed for T49.
    Mock F178 IEmailDeliveryService to test best-effort failure (IR-3):
    verify OnboardingCompleted still emits when F178 throws."
```

---

## PASS 7.5 — STACK COUPLING ANNOTATIONS FOR TASK TYPES (v9 — V29)

Full `TaskTypeStackCoupling` objects for T47, T48, T49.
These go into `EngineContractParams.stackCoupling` in the contract factory files.

### T47 UserRegistrationInitiator

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'IMPL_VARIES',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_LANGUAGE', 'SERVER_ASYNC_MODEL'],
      neutralConcepts: [
        'No PII in event payload (IR-1)',
        'Rate-limit from FREEDOM config (IR-2)',
        'Token TTL from FREEDOM config (IR-3)',
        'DNA-8: store before emit (IR-4)',
        'SETNX idempotency (IR-6)',
      ],
      implementationNotes: 'NestJS @Injectable() extending MicroserviceBase. crypto.randomUUID() token. @Throttle() for rate limit. Promise<DataProcessResult<RegistrationResult>>.',
    },
    'php-wordpress:server': {
      tier: 'IMPL_VARIES',
      stackCategory: 'cms-plugin',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_LANGUAGE'],
      neutralConcepts: ['token generation', 'rate limiting concept', 'SETNX idempotency'],
      implementationNotes: 'wp_generate_password(64). Transient-based rate limiter.',
      degraded: true,
      degradedReason: 'WordPress has no native rate limiter. Transient-based counter is unreliable under concurrent load.',
    },
    'redis:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['SETNX idempotency key', 'rate-limit counter with TTL'],
      implementationNotes: 'Accessed via IDatabaseService FABRIC. Key: {tenantId}:reg:{emailHash}. All stacks use identical abstraction.',
    },
    'jest:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'test-runner',
      dimensions: [],
      neutralConcepts: ['unit test adapter logic', 'mock SETNX, mock rate-limit service'],
      implementationNotes: 'Standard Jest. No virtualClock for T47.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
}
```

### T48 EmailVerificationWait

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'STACK_COUPLED',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_ASYNC_MODEL', 'SERVER_DI_FRAMEWORK'],
      neutralConcepts: [
        'TTL from FREEDOM config (IR-1)',
        'No PII in event (IR-2)',
        'Resend idempotency via SETNX (IR-3)',
        'Atomic token revoke on email change (IR-6)',
        'DNA-8 on all transitions (IR-4)',
      ],
      implementationNotes: 'Bull/BullMQ delayed job OR @Cron() for TTL expiry. Token stored in DATABASE FABRIC via F179.',
    },
    'php-wordpress:server': {
      tier: 'INCOMPATIBLE',
      stackCategory: 'cms-plugin',
      dimensions: ['SERVER_ASYNC_MODEL'],
      neutralConcepts: ['24h TTL enforcement'],
      implementationNotes: '',
      incompatible: true,
      incompatibleReason: 'wp_cron fires only on page load. Unreliable for precise 24h TTL enforcement on security-critical email verification. Verifications may never expire if no page load occurs.',
      mitigation: 'Use php-laravel stack for reliable scheduled token expiry. If WordPress deployment required: integrate Action Scheduler plugin, but accept degraded reliability.',
    },
    'php-laravel:server': {
      tier: 'IMPL_VARIES',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_ASYNC_MODEL', 'SERVER_DI_FRAMEWORK'],
      neutralConcepts: ['TTL-triggered expiry', 'resend idempotency', 'atomic token revoke'],
      implementationNotes: '[Stub] Laravel Scheduler + Queue::later() for delayed expiry.',
    },
    'redis:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['token storage with TTL', 'resend rate-limit SETNX'],
      implementationNotes: 'F179 IVerificationStateStore backed by Redis. Key: {tenantId}:verify:{userId}. TTL from FREEDOM config. All stacks access via DATABASE FABRIC.',
    },
    'aws-ses:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['email delivery for verification link'],
      implementationNotes: 'F178 IEmailDeliveryService resolves to SES/SendGrid/Postmark. INJECTABLE — stack-neutral. Verification link in body. No PII beyond the link.',
    },
    'jest:platform': {
      tier: 'IMPL_VARIES',
      stackCategory: 'test-runner',
      dimensions: ['TEST_FRAMEWORK'],
      neutralConcepts: ['virtualClock for TTL tests', 'mock scheduler'],
      implementationNotes: 'T005: jest.useFakeTimers(), advance 25h. Mock Bull delayed job. virtualClock: true in test-matrix.json.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
}
```

### T49 OnboardingDelivery

```typescript
stackCoupling: {
  entries: {
    'node-nestjs:server': {
      tier: 'IMPL_VARIES',
      stackCategory: 'web-framework',
      dimensions: ['SERVER_DI_FRAMEWORK', 'SERVER_LANGUAGE'],
      neutralConcepts: [
        'emit only after all wizard steps confirmed (IR-1)',
        'no PII in payload (IR-2)',
        'best-effort email delivery (IR-3)',
        'DNA-8 (IR-4)',
        'SETNX idempotency (IR-6)',
      ],
      implementationNotes: 'NestJS @Injectable() extending MicroserviceBase. 4-step sequential: persist → email (best-effort) → workspace → emit.',
    },
    'redis:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['SETNX idempotency for onboarding-complete'],
      implementationNotes: 'Key: {tenantId}:onboard:{userId}. TTL 7 days from FREEDOM config.',
    },
    'jest:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'test-runner',
      dimensions: [],
      neutralConcepts: ['best-effort email failure test', 'mock F178 to throw'],
      implementationNotes: 'Verify OnboardingCompleted emits even when F178.sendWelcomeEmail() rejects. No virtualClock needed.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
}
```

---

## ARBITER COUPLING ANNOTATIONS (v9)

For each of the 6 new arbiters: the business rule is CONCEPT_NEUTRAL.
The code check (how the arbiter detects a violation) varies by stack.

| Arbiter | Business Rule | Code Check Tier |
|---------|--------------|-----------------|
| routing::auth-security | No credentials in event payload | ⚡ IMPL_VARIES [SL] — TypeScript: property type scan; Python: dataclass field scan |
| routing::path-safety | Registration path not exposed without rate-limit | ⚡ IMPL_VARIES [DI] — NestJS: @Throttle() present; Laravel: ThrottleRequests middleware |
| processing::pipeline-linearity | T47→T48→T49 strict order | 🔴 STACK_COUPLED [DI][SL] — event listener pattern differs per DI framework |
| processing::wait-state | T48 holds state, does not proceed without verification | 🔴 STACK_COUPLED [AM] — scheduler mechanism differs per async model |
| orchestration::gate-event (IR-1) | OnboardingCompleted only on full wizard completion | ⚡ IMPL_VARIES [SL] — check completedSteps[] guard before emit |
| orchestration::fan-out-resilience | F178 failure does not block OnboardingCompleted | ⚡ IMPL_VARIES [SL] — try/catch shape differs per language |

---

## PHASE A GATE (v9 additions)

All v6/v7 gates unchanged. Add:

```bash
# V29 — stackCoupling present on T47/T48/T49
node -e "
const reg = /* load TaskTypeRegistry */;
['T47','T48','T49'].forEach(id => {
  const c = reg.get(id).data;
  if (!c.stackCoupling) throw new Error(id + ' missing stackCoupling');
  if (!c.stackCoupling.entries['node-nestjs:server']) throw new Error(id + ' missing priority stack entry');
  console.log('✅', id, 'stackCoupling present');
});
"

# V30 — T48 INCOMPATIBLE flag for php-wordpress
node -e "
const reg = /* load TaskTypeRegistry */;
const t48 = reg.get('T48').data;
const wp = t48.stackCoupling.entries['php-wordpress:server'];
if (!wp?.incompatible) throw new Error('T48 php-wordpress INCOMPATIBLE flag missing');
if (!wp?.mitigation) throw new Error('T48 php-wordpress mitigation missing');
console.log('✅ T48 php-wordpress INCOMPATIBLE with mitigation');
"

# V31 — stateNotes on awaiting-email-verification (highest-risk node)
python3 -c "
import json
t = json.load(open('contracts/topologies/FLOW-01.topology.json'))
nodes = t.get('nodes', [])
aev = next((n for n in nodes if n['nodeId'] == 'awaiting-email-verification'), None)
assert aev, 'awaiting-email-verification node not found'
sc = aev.get('stackCoupling', {})
react = sc.get('react-web:client', {})
angular = sc.get('angular:client', {})
assert react.get('stateNotes', {}).get('stateHolderType'), 'react stateNotes missing'
assert angular.get('stateNotes', {}).get('stateHolderType'), 'angular stateNotes missing'
assert angular.get('stateNotes', {}).get('stateScope'), 'angular stateScope missing'
print('✅ V31 stateNotes present on awaiting-email-verification')
"

# SK-430 naming gate
npm run lint:naming   # exit 0

# Service files use correct domain names
ls server/src/engine/flows/user-registration-onboarding/
# Expected: user-registration-initiator.service.ts
#           email-verification-wait.service.ts
#           onboarding-delivery.service.ts
```

---

## PHASE D GATE (v9 — naming additions)

Add to existing Phase D gate:

```bash
# Naming compliance
npm run lint:naming   # exit 0

# Service files follow {verb}-{domain-noun}.service.ts
find server/src/engine/flows/user-registration-onboarding -name "*.service.ts"
# Expected: user-registration-initiator.service.ts
#           email-verification-wait.service.ts
#           onboarding-delivery.service.ts

# No task-type-ID-prefixed files
find server/src/engine/flows/user-registration-onboarding -name "t4*.ts" 2>/dev/null
# Expected: no output
```

---

## PHASE E GATE (v9 — naming regression + V29–V31 final check)

Add to existing Phase E gate:

```bash
# Naming regression
npm run lint:naming   # exit 0

# Final V29–V31 check (same checks as Phase A, confirms nothing regressed)
# Re-run V29, V30, V31 verification scripts from Phase A above
```

---

## SK-418 v1.3 FLOW COMPLETENESS CHECK — 31/31 ✅

V1–V28 all pass (unchanged from v7). New checks:

```
V29 ✅ stackCoupling present on T47, T48, T49:
    T47: tier IMPL_VARIES, dimensions [SERVER_DI_FRAMEWORK, SERVER_LANGUAGE, SERVER_ASYNC_MODEL]
         entries: node-nestjs:server, redis:platform, jest:platform
    T48: tier STACK_COUPLED, dimensions [SERVER_ASYNC_MODEL, SERVER_DI_FRAMEWORK]
         entries: node-nestjs:server, php-wordpress:server (INCOMPATIBLE),
                  php-laravel:server, redis:platform, aws-ses:platform, jest:platform
    T49: tier IMPL_VARIES, dimensions [SERVER_DI_FRAMEWORK, SERVER_LANGUAGE]
         entries: node-nestjs:server, redis:platform, jest:platform
    supportedServerStacks: ['node-nestjs'] on all three

V30 ✅ INCOMPATIBLE stacks flagged:
    T48 php-wordpress:server — INCOMPATIBLE — wp_cron unreliable for 24h TTL enforcement
    incompatibleReason: present
    mitigation: "Use php-laravel. If WordPress required: Action Scheduler, accept degraded reliability."

V31 ✅ stateNotes present on client nodes with observable state:
    registration-in-progress: react-web:client stateNotes (LOW propagation, feature-scoped)
                              angular:client stateNotes (LOW, component-local, CanActivate guard)
    awaiting-email-verification: react-web:client stateNotes (LOW, useState, feature-scoped)
                                 angular:client stateNotes (MEDIUM, BehaviorSubject, feature-module)
                                 android-kotlin:client stateNotes (LOW, StateFlow, feature-scoped)
                                 php-server-rendered:client → INCOMPATIBLE (documented)
    onboarding-wizard: react-web:client stateNotes (LOW, useState, feature-scoped)
                       angular:client stateNotes (LOW, BehaviorSubject, feature-module)
```

---

## SESSION-0 ADDITIONS (v9 — FC-19, FC-20, FC-21)

Append to existing FC-1 through FC-21 checklist:

```
FC-19: All 3 genesis prompts are in HybridGenesisPrompt format
       ✓ neutralIronRules[] present and non-empty on all three
       ✓ No framework names in neutralIronRules (no NestJS, FastAPI, Laravel)
       ✓ stackImplementations['node-nestjs:server'] present on all three
       ✓ php-wordpress:server entry present on T48 with incompatible: true
       Script: grep -c "neutralIronRules" on each contract factory file

FC-20: All ⛔ INCOMPATIBLE stacks flagged with reason + mitigation
       ✓ T48 php-wordpress:server: incompatible: true + incompatibleReason + mitigation
       Script: node verify-incompatible-flags.js (check V30 script above)

FC-21: stateNotes present on all client-facing topology nodes
       ✓ awaiting-email-verification: stateNotes for react-web:client + angular:client
       ✓ onboarding-wizard: stateNotes for react-web:client + angular:client
       ✓ registration-in-progress: stateNotes for react-web:client + angular:client
       Script: python3 verify-state-notes.py (check V31 script above)
```

---

## JIRA COMMENT TEMPLATE (v9 — SK-430 Rule 5, 5 sections)

All SK-429 Jira comments for FLOW-01 phases must follow this structure:

```
## What was built — Phase D [Flow: FLOW-01 — User Registration & Onboarding]

### Business purpose
Implemented the three task types that handle user account creation.
UserRegistrationInitiator (T47) accepts the initial signup, validates for
duplicates via SETNX, generates a verification token, and emits the registration
event. EmailVerificationWait (T48) holds the flow open for up to 24 hours while
the user verifies their email — managing resend requests and TTL expiry.
OnboardingDelivery (T49) provisions the workspace and emits OnboardingCompleted,
which unlocks FLOW-02 through FLOW-07.

### Flow context
- **Flow:** FLOW-01 — User Registration & Onboarding
- **Task types:** T47 UserRegistrationInitiator, T48 EmailVerificationWait,
  T49 OnboardingDelivery
- **Will be used by:** FLOW-02 (Business Onboarding Intelligence) reads
  OnboardingCompleted to start profile enrichment. Every tenant user passes
  through this flow exactly once — it is the entry point of the platform.

### Technical delivery
- 3 service files created in engine/flows/user-registration-onboarding/
- 8 factory interfaces registered (F174–F181)
- [N] tests added (unit: [N], e2e: [N])
- Key factories: F174 IUserRepository (DATABASE FABRIC),
  F175 IEmailVerificationQueue (QUEUE FABRIC),
  F178 IEmailDeliveryService (INJECTABLE — SES/SendGrid via FABRIC),
  F181 IAuditTrailService (PLATFORM-ONLY)
- Stack coupling annotated: T47 IMPL_VARIES, T48 STACK_COUPLED,
  T49 IMPL_VARIES. T48 php-wordpress:server flagged INCOMPATIBLE.

### Architecture fit
All three services extend MicroserviceBase (DNA-4). Events persisted via
outbox before queue emit (DNA-8). Tenant isolation via AsyncLocalStorage
scope (DNA-5). T48 uses Bull/BullMQ for 24h TTL enforcement — the scheduler
mechanism that makes this STACK_COUPLED. Downstream: FLOW-02
MatchingConvergenceGate waits for OnboardingCompleted (CF-4 BFA rule).
```

---

## KEY FACTS FOR SESSION FILES (v9)

```
Artifact numbers: T47–T49, F174–F181, CF-1–CF-8 (unchanged)
flow_name: "User Registration & Onboarding"
stackTargets: ['node-nestjs']
clientTargets: ['react-web']

Service files:
  user-registration-initiator.service.ts  ← T47
  email-verification-wait.service.ts       ← T48
  onboarding-delivery.service.ts           ← T49
Directory: engine/flows/user-registration-onboarding/

Test baseline:
  Entry:           ≥ 4,056 (after FLOW-35 Phase I + FLOW-00.2)
  After Phase A:   ≥ 4,066 (+10 schema validation)
  After all phases: ≥ 4,096 (+30 server tests)
  Client delta:    +19 (C1:6, C2:6, C3:4, C4:3, C5:0)

Stack coupling summary:
  T47: IMPL_VARIES — token gen + rate-limit syntax varies by stack
  T48: STACK_COUPLED — async scheduler model differs fundamentally per stack
       php-wordpress: ⛔ INCOMPATIBLE (wp_cron unreliable)
  T49: IMPL_VARIES — DI injection + async syntax varies

Priority stacks: node-nestjs (server), react-web (client)
Non-priority stacks: INCOMPATIBLE flags present, implementation stubs for FLOW-37

Read before planning:
  FLOW-00.2-REFERENCE-PLAN-v1.md  (stack coupling base)
  STACK-COUPLING-AUDIT-FLOW-01-04-v1.md  (detailed per-task coupling analysis)
  FLOW-EXECUTION-VISIBILITY-PLAN.md  (V16–V23)
  CLIENT-ARCHITECTURE-SPEC.md  (V24–V28)
  FLOW-34-REFERENCE-PLAN-v1.md  (if marketplace plugin adapter work is in scope)
```

---

## SESSION FILES TO PRODUCE (v9)

```
FLOW-01-STATE.json               ← flow_name added, stackTargets, clientTargets

SESSION-FLOW-01-A.md             ← All v6/v7 content +
                                    [v9] topology.json stackCoupling per node
                                    [v9] FC-19/20/21 self-checks
                                    [v9] V29/V30/V31 baseline scripts

SESSION-FLOW-01-B.md             ← T47 UserRegistrationInitiator
                                    [v9] HybridGenesisPrompt Section 4 drives generation
                                    [v9] File: user-registration-initiator.service.ts

SESSION-FLOW-01-C.md             ← T48 EmailVerificationWait
                                    [v9] HybridGenesisPrompt — STACK_COUPLED treatment
                                    [v9] File: email-verification-wait.service.ts

SESSION-FLOW-01-D.md             ← T49 OnboardingDelivery
                                    [v9] File: onboarding-delivery.service.ts
                                    [v9] lint:naming gate

SESSION-FLOW-01-E.md             ← All v7 client integration test content +
                                    [v9] Final V29/V30/V31 verification
                                    [v9] lint:naming regression gate

docs/FLOW-01-REFERENCE.md        ← this document
```
