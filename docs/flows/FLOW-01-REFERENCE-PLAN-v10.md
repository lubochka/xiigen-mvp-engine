# FLOW-01: USER REGISTRATION & ONBOARDING — REFERENCE PLAN v10
## Prerequisites: All infrastructure flows + FLOW-35 + FLOW-36 + FLOW-00 + FLOW-00.1 + FLOW-00.2 complete
## Date: 2026-03-22
## flow-completeness-checker v1.4: 32/32 ✅

---

## SCOPE DISCIPLINE

```
stackTargets:  ['node-nestjs']
clientTargets: ['react-web']

This plan contains ONLY:
  ✓ Full detail for node-nestjs:server
  ✓ Full detail for react-web:client (topology stateNotes)
  ✓ Platform entries (redis, jest, aws-ses) — CONCEPT_NEUTRAL
  ✓ One-line INCOMPATIBLE flags where known (T48 php-wordpress)
  ✓ One-line server stubs in genesis prompt Section 4 (for FLOW-37 reference)

This plan does NOT contain:
  ✗ Angular stateNotes, BehaviorSubject analysis, route guards
  ✗ Android-Kotlin StateFlow analysis
  ✗ PHP-server-rendered client state analysis
  ✗ Full coupling map entries for non-priority server stacks

Non-priority stack details: see STACK-COUPLING-AUDIT-FLOW-01-04-v1.md
and APPENDIX A at end of this document.
```

---

## WHAT CHANGED FROM v9 → v10

| What v9 had | What v10 changes |
|-------------|-----------------|
| angular:client full stateNotes on all 3 topology nodes | Removed — not in clientTargets |
| android-kotlin:client stateNotes on awaiting-email-verification | Removed — not in clientTargets |
| php-server-rendered:client full INCOMPATIBLE block | One-line flag in APPENDIX A |
| T47 coupling map: php-wordpress:server full entry | Removed — T47 is not INCOMPATIBLE on WP, just degraded. FLOW-37 concern. |
| T48 coupling map: php-laravel:server entry | Removed — not in stackTargets. INCOMPATIBLE flag on WP stays. |
| V31 checks angular + android + php stateNotes | V31 checks react-web:client only |
| FC-21 checks angular + react stateNotes | FC-21 checks react-web:client only |
| ~1,050 lines | ~700 lines |

All v7 content (Passes 1–6, artifact numbers, event contracts, test matrix) unchanged.
All v9 content that is within scope (genesis prompts, naming, Jira template) unchanged.

---

## WAVE ASSIGNMENT (unchanged)

```
FLOW-01: Wave 0 — sequential
  parallel_wave: null
  prerequisite: FLOW-35 + FLOW-36 + FLOW-00 + FLOW-00.1 + FLOW-00.2 ACTIVE
  downstream: FLOW-02 (Wave 1)
```

---

## STATE.json (v10)

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

## SERVICE FILE NAMES (naming-conventions-enforcer Rule 1)

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

## PASS 3 — CLIENT STATE MAP (v10 — react-web only)

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
        "stateScopeReason": "Loading state dies when navigation leaves this screen.",
        "propagationRisk": "LOW",
        "propagationRiskReason": "Only RegistrationLoadingScreen reads this state.",
        "routeGuardRequired": false,
        "exitGuardRequired": false
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

## PASS 7 — GENESIS PROMPTS (HybridGenesisPrompt format)

All three genesis prompts in Option C hybrid structure (D-STACK-2).
Section 1 contains only XIIGen vocabulary. Section 4 has full detail
for node-nestjs:server, one-line stubs for others.

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

  node-nestjs:server ← PRIORITY (implement in this phase)
    "Generate a NestJS @Injectable() class named UserRegistrationInitiator
    extending MicroserviceBase. Inject F174–F177, F181 via constructor.
    Token generation: crypto.randomUUID() or crypto.randomBytes(32).toString('hex').
    Rate limiting: @Throttle() decorator via ThrottlerModule — reads from FREEDOM config.
    Idempotency: SET key NX EX ttl via Redis (IDatabaseService SETNX pattern).
    Return Promise<DataProcessResult<RegistrationResult>>."

  python-fastapi:server  → [Stub — FLOW-37]
  php-laravel:server     → [Stub — FLOW-37]
  php-wordpress:server   → [Stub — degraded: no native rate limiter]
  dotnet-aspnet:server   → [Stub — FLOW-37]
  rust-axum:server       → [Stub — FLOW-37]

  redis:platform — CONCEPT_NEUTRAL
    "SETNX for idempotency key (IR-6) and rate-limit counter (IR-2).
    Key format: '{tenantId}:reg:{emailHash}'. TTL from FREEDOM config.
    All server stacks access Redis via IDatabaseService FABRIC."

  jest:platform — CONCEPT_NEUTRAL
    "Standard Jest unit tests. No virtualClock needed for T47.
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

  node-nestjs:server ← PRIORITY (implement in this phase)
    "Generate a NestJS @Injectable() class named EmailVerificationWait
    extending MicroserviceBase. TTL-triggered expiry via Bull/BullMQ delayed job
    OR @Cron() check. Job scheduled at registration time, TTL from FREEDOM config.
    Token stored in DATABASE FABRIC via F179. Resend: replace token, reschedule job.
    Return Promise<DataProcessResult<VerificationState>>."

  python-fastapi:server  → [Stub — FLOW-37]
  php-laravel:server     → [Stub — FLOW-37]
  php-wordpress:server   → ⛔ INCOMPATIBLE — wp_cron unreliable for 24h TTL. Use php-laravel.
  dotnet-aspnet:server   → [Stub — FLOW-37]
  rust-axum:server       → [Stub — FLOW-37]

  redis:platform — CONCEPT_NEUTRAL
    "Token storage via F179 with TTL metadata. SETNX for resend rate-limit (IR-3).
    Key: '{tenantId}:verify:{userId}'. TTL from FREEDOM config."

  aws-ses:platform — CONCEPT_NEUTRAL
    "F178 IEmailDeliveryService resolves to SES/SendGrid/Postmark via FABRIC.
    INJECTABLE — stack-neutral. Verification link in body. No PII beyond the link."

  jest:platform — IMPL_VARIES [TEST_FRAMEWORK]
    "T005 virtualClock test: simulate 25h elapsed to trigger EmailVerificationExpired.
    Mock Bull/BullMQ delayed job. virtualClock: true in test-matrix.json."
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

  node-nestjs:server ← PRIORITY (implement in this phase)
    "Generate a NestJS @Injectable() class named OnboardingDelivery
    extending MicroserviceBase. Inject F174, F178, F180, F181 via constructor.
    Steps: (1) persist completed profile via F174, (2) send welcome email via F178
    (best-effort: catch and log, do not rethrow), (3) provision workspace via F180,
    (4) storeDocument(OnboardingCompleted) then enqueue. SETNX idempotency before step 1.
    Return Promise<DataProcessResult<OnboardingResult>>."

  python-fastapi:server  → [Stub — FLOW-37]
  php-laravel:server     → [Stub — FLOW-37]
  php-wordpress:server   → [Stub — degraded: no DI, manual F180]
  dotnet-aspnet:server   → [Stub — FLOW-37]
  rust-axum:server       → [Stub — FLOW-37]

  redis:platform — CONCEPT_NEUTRAL
    "SETNX for idempotency key (IR-6). TTL: 7 days (FREEDOM config)."

  jest:platform — CONCEPT_NEUTRAL
    "No virtualClock needed for T49. Mock F178 to test best-effort failure (IR-3):
    verify OnboardingCompleted still emits when F178 throws."
```

---

## PASS 7.5 — STACK COUPLING ANNOTATIONS FOR TASK TYPES (V29)

Priority stack + platform entries only. Non-priority stacks: see APPENDIX A.

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
    'redis:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['SETNX idempotency key', 'rate-limit counter with TTL'],
      implementationNotes: 'Accessed via IDatabaseService FABRIC. Key: {tenantId}:reg:{emailHash}.',
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
      incompatible: true,
      incompatibleReason: 'wp_cron fires only on page load. Unreliable for 24h TTL.',
      mitigation: 'Use php-laravel. If WordPress required: Action Scheduler plugin, accept degraded reliability.',
    },
    'redis:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['token storage with TTL', 'resend rate-limit SETNX'],
      implementationNotes: 'F179 backed by Redis. Key: {tenantId}:verify:{userId}.',
    },
    'aws-ses:platform': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'platform-service',
      dimensions: [],
      neutralConcepts: ['email delivery for verification link'],
      implementationNotes: 'F178 resolves to SES/SendGrid/Postmark via FABRIC. INJECTABLE.',
    },
    'jest:platform': {
      tier: 'IMPL_VARIES',
      stackCategory: 'test-runner',
      dimensions: ['TEST_FRAMEWORK'],
      neutralConcepts: ['virtualClock for TTL tests', 'mock scheduler'],
      implementationNotes: 'jest.useFakeTimers(), advance 25h. Mock Bull delayed job.',
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
      implementationNotes: 'Verify OnboardingCompleted emits when F178 rejects. No virtualClock.',
    },
  },
  supportedServerStacks: ['node-nestjs'],
}
```

---

## ARBITER COUPLING ANNOTATIONS

Business rules are CONCEPT_NEUTRAL. Code checks vary by stack.
Only node-nestjs code check patterns shown (priority stack).

| Arbiter | Business Rule | NestJS Code Check |
|---------|--------------|-------------------|
| routing::auth-security | No credentials in event payload | Property type scan on event DTO |
| routing::path-safety | Registration path requires rate-limit | @Throttle() present on handler |
| processing::pipeline-linearity | T47→T48→T49 strict order | Event listener registration order |
| processing::wait-state | T48 holds state until verification | Bull/BullMQ delayed job scheduled |
| orchestration::gate-event (IR-1) | OnboardingCompleted only on full wizard | completedSteps[] guard before emit |
| orchestration::fan-out-resilience | F178 failure does not block completion | try/catch around F178 call |

---

## PHASE A GATE (v10)

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

# V31 — stateNotes on react-web:client (declared clientTarget)
python3 -c "
import json
t = json.load(open('contracts/topologies/FLOW-01.topology.json'))
nodes = t.get('nodes', [])
for node_id in ['registration-in-progress', 'awaiting-email-verification', 'onboarding-wizard']:
    node = next((n for n in nodes if n['nodeId'] == node_id), None)
    assert node, f'{node_id} not found'
    sc = node.get('stackCoupling', {})
    react = sc.get('react-web:client', {})
    assert react.get('stateNotes', {}).get('stateHolderType'), f'{node_id} react stateNotes missing'
    print(f'✅ {node_id} react-web:client stateNotes present')
"

# naming-conventions-enforcer gate
npm run lint:naming   # exit 0

# Service files use correct domain names
ls server/src/engine/flows/user-registration-onboarding/
# Expected: user-registration-initiator.service.ts
#           email-verification-wait.service.ts
#           onboarding-delivery.service.ts
```

---

## PHASE D GATE (v10 — naming additions)

Add to existing Phase D gate:

```bash
npm run lint:naming   # exit 0

find server/src/engine/flows/user-registration-onboarding -name "*.service.ts"
# Expected: user-registration-initiator.service.ts
#           email-verification-wait.service.ts
#           onboarding-delivery.service.ts

find server/src/engine/flows/user-registration-onboarding -name "t4*.ts" 2>/dev/null
# Expected: no output
```

---

## PHASE E GATE (v10 — naming regression + V29–V31 final check)

```bash
npm run lint:naming   # exit 0

# Final V29–V31 check (same scripts as Phase A — confirms nothing regressed)
```

---

## flow-completeness-checker v1.4 — 32/32 ✅

V0 scope discipline passes: stackTargets=['node-nestjs'], clientTargets=['react-web'].
Full-detail entries exist ONLY for in-scope stacks. APPENDIX A holds out-of-scope content.
V1–V28 all pass (unchanged from v7).

```
V29 ✅ stackCoupling present on T47, T48, T49:
    T47: IMPL_VARIES, entries: node-nestjs:server + redis:platform + jest:platform
    T48: STACK_COUPLED, entries: node-nestjs:server + php-wordpress:server (INCOMPATIBLE)
         + redis:platform + aws-ses:platform + jest:platform
    T49: IMPL_VARIES, entries: node-nestjs:server + redis:platform + jest:platform
    supportedServerStacks: ['node-nestjs'] on all three

V30 ✅ INCOMPATIBLE stacks flagged:
    T48 php-wordpress:server — INCOMPATIBLE — wp_cron unreliable for 24h TTL
    incompatibleReason: present. mitigation: present.

V31 ✅ stateNotes present on react-web:client (declared clientTarget):
    registration-in-progress: LOW propagation, feature-scoped, useState
    awaiting-email-verification: LOW propagation, feature-scoped, useState
    onboarding-wizard: LOW propagation, feature-scoped, useState
```

---

## SESSION-0 ADDITIONS (FC-19, FC-20, FC-21)

```
FC-19: All 3 genesis prompts are in HybridGenesisPrompt format
       ✓ neutralIronRules[] present and non-empty on all three
       ✓ No framework names in neutralIronRules
       ✓ stackImplementations['node-nestjs:server'] present on all three
       ✓ php-wordpress:server INCOMPATIBLE flag on T48

FC-20: All ⛔ INCOMPATIBLE stacks flagged with reason + mitigation
       ✓ T48 php-wordpress:server: incompatible + reason + mitigation

FC-21: stateNotes present on react-web:client topology nodes
       ✓ registration-in-progress: stateNotes for react-web:client
       ✓ awaiting-email-verification: stateNotes for react-web:client
       ✓ onboarding-wizard: stateNotes for react-web:client
```

---

## JIRA COMMENT TEMPLATE (naming-conventions-enforcer Rule 5)

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
- Stack: node-nestjs:server. T47 IMPL_VARIES, T48 STACK_COUPLED, T49 IMPL_VARIES.
  T48 php-wordpress:server flagged INCOMPATIBLE.

### Architecture fit
All three services extend MicroserviceBase (DNA-4). Events persisted via
outbox before queue emit (DNA-8). Tenant isolation via AsyncLocalStorage
scope (DNA-5). T48 uses Bull/BullMQ for 24h TTL enforcement — the scheduler
mechanism that makes this STACK_COUPLED. Downstream: FLOW-02
MatchingConvergenceGate waits for OnboardingCompleted (CF-4 BFA rule).
```

---

## KEY FACTS FOR SESSION FILES

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
  T48: STACK_COUPLED — async scheduler model differs fundamentally
       php-wordpress: ⛔ INCOMPATIBLE (wp_cron unreliable)
  T49: IMPL_VARIES — DI injection + async syntax varies

Priority stacks: node-nestjs (server), react-web (client)
```

---

## SESSION FILES TO PRODUCE

```
FLOW-01-STATE.json               ← stackTargets, clientTargets

SESSION-FLOW-01-A.md             ← topology.json with react-web:client stateNotes
                                    FC-19/20/21 self-checks
                                    V29/V30/V31 baseline scripts

SESSION-FLOW-01-B.md             ← T47 UserRegistrationInitiator
                                    HybridGenesisPrompt Section 4 drives generation
                                    File: user-registration-initiator.service.ts

SESSION-FLOW-01-C.md             ← T48 EmailVerificationWait
                                    HybridGenesisPrompt — STACK_COUPLED treatment
                                    File: email-verification-wait.service.ts

SESSION-FLOW-01-D.md             ← T49 OnboardingDelivery
                                    File: onboarding-delivery.service.ts
                                    lint:naming gate

SESSION-FLOW-01-E.md             ← Client integration tests (react-web)
                                    Final V29/V30/V31 verification
                                    lint:naming regression gate

docs/FLOW-01-REFERENCE.md        ← this document
```

---

## APPENDIX A — NON-PRIORITY STACKS (for FLOW-37 reference only)

This appendix exists so FLOW-37 (multi-stack porting) knows what to add.
Claude Code executing FLOW-01 phases MUST IGNORE this appendix entirely.

```
SERVER STACKS TO ADD IN FLOW-37:
  T47: python-fastapi, php-laravel, dotnet-aspnet, rust-axum (all IMPL_VARIES)
       php-wordpress (degraded: transient-based rate limiter)
  T48: python-fastapi, php-laravel, dotnet-aspnet, rust-axum (all IMPL_VARIES or STACK_COUPLED)
       php-wordpress: ⛔ INCOMPATIBLE (already flagged)
  T49: python-fastapi, php-laravel, dotnet-aspnet, rust-axum (all IMPL_VARIES)
       php-wordpress (degraded: no DI)

CLIENT STACKS TO ADD IN FLOW-37:
  angular:client — all 3 topology nodes need:
    BehaviorSubject analysis, stateConsumerMap, routeGuard decisions
    awaiting-email-verification is the highest-risk node (MEDIUM propagation)
  android-kotlin:client — StateFlow analysis for all 3 nodes
  php-server-rendered:client — INCOMPATIBLE for awaiting-email-verification
    (no client state layer for SLA countdown)

FULL ANALYSIS: see STACK-COUPLING-AUDIT-FLOW-01-04-v1.md
```
