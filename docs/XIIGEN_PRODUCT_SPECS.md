# XIIGen Product Specifications

**Version:** 2.0 | **Date:** 2026-04-15 | **Branch:** claude/vigorous-margulis
**Stack:** Node.js 22 + NestJS 11 + TypeScript 5 | React 18 + Vite 5 + Tailwind CSS
**Test baseline:** 10,470 server + ~1,080 client | **Flows:** 45 directories | **Services:** 378

---

## How to Read This Document

Each flow specification follows the same structure:

1. **Flow Overview** — What the flow does, in plain language
2. **Business Logic** — Step-by-step system behavior
3. **Entities** — Data objects created and managed
4. **Services & Task Types** — Implementation with code references
5. **User Interface** — Client pages with e2e screenshot references
6. **User Journey** — End-to-end user experience from test scenarios
7. **Cross-Flow Correlations** — Dependencies and event connections
8. **Testing Coverage** — Unit, e2e, QA automation tests
9. **Document References** — Session docs, design docs, contracts

---

# FLOW-01: User Registration & Onboarding

**Slug:** `user-registration` | **Task Types:** T47, T48, T49
**Services:** 3 | **Client Pages:** 6 | **E2E Snapshots:** 10
**Contract:** `server/src/engine-contracts/user-registration-contracts.ts`
**BFA Rules:** `server/src/engine-contracts/user-registration-bfa-rules.ts` (CF-01-1..CF-01-4)

---

## 1. Flow Overview

FLOW-01 handles the complete lifecycle of a new user joining the XIIGen community platform. When someone decides to register, the system validates their email address, creates their account, sends a verification email with a secure token, and after verification, guides them through an onboarding process that sets up their workspace, introduces them to key features, and invites them to the community.

The flow is designed with security as a priority: passwords are never stored in plain text (SHA-256 hashed), verification tokens are stored only as hashes (the raw token appears only in the email), and every step uses idempotency keys to prevent duplicate accounts even under network retries.

---

## 2. Business Logic

### Step 1 — Registration (T47: RegistrationService)

1. User submits email and password on the registration form
2. System validates input — if any field is empty or email format is invalid, returns a uniform validation error (the error message intentionally does not reveal which specific field failed, to prevent enumeration attacks — design decision FLOW-01-RAG-03)
3. System checks idempotency: if the same idempotency key was used before, returns the previous result without creating a duplicate (DNA-7)
4. System checks email uniqueness against the `xiigen-user-registrations` index — this check happens BEFORE any write (iron rule CF-1)
5. If email already exists, returns `DUPLICATE_EMAIL` failure
6. System creates the user record with `status: 'unverified'` and an empty `onboarding_materials: []` array (design record DR-03: downstream services read this array)
7. System stores the document FIRST, then emits `AccountCreated` event (DNA-8: outbox pattern)
8. User sees "Pending Verification" page

### Step 2 — Email Verification (T48: EmailVerificationService)

1. On receiving `AccountCreated`, the system generates a 256-bit random token
2. System stores a SHA-256 hash of the token (FLOW-01-RAG-02: raw token NEVER stored in database)
3. System stores the token record FIRST, then emits `VerificationEmailRequested` with the raw token (DNA-8)
4. System schedules a 24-hour expiry callback via `ISchedulerService` — the scheduler fires the expiry event, NOT the service directly (architecture decision D-01-1)
5. User receives the email and clicks the verification link
6. System hashes the submitted token and compares against stored hash
7. If valid: marks user as `verified`, emits `EmailVerified` event
8. If expired: returns `TOKEN_EXPIRED` — user can request resend
9. If invalid: returns `TOKEN_INVALID`

**Resend flow:** Users can request a new verification email, but this is rate-limited. The enforcement of rate limiting is fixed (MACHINE), but the window duration reads from FREEDOM config key `flow01_resend_rate_limit_minutes` (default: 60 minutes). When a new token is issued, the old token is marked `superseded` — never deleted (FLOW-01-RAG-04).

### Step 3 — Onboarding (T49: OnboardingDeliveryService)

1. After email verification, the onboarding process begins
2. System delivers three types of onboarding materials: workspace setup, a first flow tutorial, and a community invitation
3. Progress is tracked per step — if the user closes the browser and returns, they resume from the last incomplete step (iron rule CF-4)
4. `OnboardingCompleted` event is only emitted after ALL three material types are present in the `onboarding_materials` array (iron rules OD-6, OD-7)
5. Social sharing parameters (audience weights, caps, similarity threshold) come from FREEDOM config — never hardcoded (FLOW-01-RAG-06)

---

## 3. Entities

| Entity | Index | Key Fields | Scope |
|--------|-------|-----------|-------|
| UserRegistration | `xiigen-user-registrations` | user_id, email, credentials_hash, status (unverified/verified), onboarding_materials[], invite_code, tenant_id | PRIVATE (per-tenant) |
| VerificationToken | `xiigen-verification-tokens` | token_id, member_id, token_hash, status (active/consumed/expired/superseded), expires_at | PRIVATE |
| ResendAttempt | `xiigen-resend-attempts` | attempt_id, member_id, email, attempted_at | PRIVATE |
| OnboardingProgress | (within user record) | onboarding_materials[], completed_steps, completed_at | PRIVATE |

---

## 4. Services & Task Types

| Task Type | Service | File | Archetype | Key Pattern |
|-----------|---------|------|-----------|-------------|
| T47 | RegistrationService | `server/src/engine/flows/user-registration/registration.service.ts` | ROUTING | Email uniqueness before write (CF-1), DNA-7 idempotency, DNA-8 outbox |
| T48 | EmailVerificationService | `server/src/engine/flows/user-registration/email-verification.service.ts` | ORCHESTRATION | Token hashing (RAG-02), scheduler callback (D-01-1), rate limiting (CF-3) |
| T49 | OnboardingDeliveryService | `server/src/engine/flows/user-registration/onboarding-delivery.service.ts` | ORCHESTRATION | Resume from last step (CF-4), 3 material types required (OD-6/7) |

**Fabric dependencies:** DATABASE (IDatabaseService), QUEUE (IQueueService), SCHEDULER (ISchedulerService), FREEDOM (IFreedomConfigService)

---

## 5. User Interface

The flow has 6 React pages in `client/src/pages/user-registration/`:

| Page | File | Purpose |
|------|------|---------|
| Registration Form | `RegistrationPage.tsx` | Email + password submission form. Playwright test hook: `existing@test.com` triggers deterministic DUPLICATE_EMAIL |
| Pending Verification | `RegistrationPendingPage.tsx` | "Check your email" screen after successful registration |
| Token Verification | `VerifyTokenPage.tsx` | Processes verification link — shows success, expired, or invalid state |
| Resend Verification | `ResendPage.tsx` | Rate-limited resend form |
| SSO Login | `SsoPage.tsx` | Single sign-on bypass path |
| Onboarding | `OnboardingPage.tsx` | Step-by-step onboarding with progress tracking |

### E2E Screenshots

All snapshots are in `docs/e2e-snapshots/user-registration/`:

| # | Screenshot | What It Shows |
|---|-----------|---------------|
| 1 | `01-registration-form.png` | Empty registration form with email and password fields |
| 2 | `02-validation-error.png` | Uniform validation error (no field name revealed) |
| 3 | `03-duplicate-email.png` | "Email already registered" error state |
| 4 | `04-verification-pending.png` | "Check your email" pending verification screen |
| 5 | `05-token-expired.png` | Expired token error with resend option |
| 6 | `06-token-invalid.png` | Invalid token error |
| 7 | `07-rate-limit.png` | Rate limit exceeded on resend |
| 8 | `08-onboarding-progress.png` | Onboarding in progress with step checklist |
| 9 | `09-onboarding-degraded.png` | Graceful degradation when AI service unavailable |
| 10 | `10-sso-bypass.png` | SSO login bypass screen |

---

## 6. User Journey

**Happy path** (from e2e tests):

1. User navigates to `/register` — sees the registration form (screenshot 01)
2. User enters email and password, clicks "Register"
3. System validates input, checks email uniqueness, creates account
4. User is redirected to `/register/pending-verification` (screenshot 04)
5. User receives email with verification link
6. User clicks link → `/verify?token=...` — system validates token
7. On success, user is redirected to `/onboarding`
8. User completes 3 onboarding steps (workspace, tutorial, community) (screenshot 08)
9. On completion, `OnboardingCompleted` event fires → FLOW-02 begins profile enrichment

**Error paths** (from e2e tests):

- **Duplicate email:** User tries to register with existing email → sees "already registered" (screenshot 03)
- **Invalid form:** User submits empty fields → uniform validation error (screenshot 02)
- **Expired token:** User clicks old verification link → sees "token expired" with resend option (screenshot 05)
- **Rate limit exceeded:** User requests too many resend emails → sees rate limit message (screenshot 07)
- **SSO bypass:** Enterprise users skip email verification via SSO (screenshot 10)

---

## 7. Cross-Flow Correlations

| Direction | Flow | Event | Description |
|-----------|------|-------|-------------|
| **Produces →** | FLOW-02 (Profile Enrichment) | `OnboardingCompleted` | Triggers profile enrichment after onboarding |
| **Produces →** | FLOW-05 (Gamification) | `AccountCreated` | Awards registration completion points |
| **Produces →** | FLOW-06 (Groups) | `OnboardingCompleted` | Enables community group invitations |
| **Consumes ←** | FLOW-15 (SaaS) | Tenant context | Registration operates within tenant scope |

**Important distinction (DC-10):** `OnboardingCompleted` (FLOW-01) is NOT the same as `PersonalizationCompleted` (FLOW-02). The FLOW-01→FLOW-02 gate verifies this.

---

## 8. Testing Coverage

| Category | Count | Location |
|----------|-------|----------|
| Server e2e tests | 6 spec files | `server/test/e2e/user-registration/` |
| Design contract tests (DC-01..DC-10) | 10 tests | `user-registration-proper-flow.e2e.spec.ts` |
| Client e2e (Playwright) | In teaching-pipeline | `client/e2e/teaching-pipeline.spec.ts` |
| E2E screenshots | 10 images | `docs/e2e-snapshots/user-registration/` |
| BFA rules | CF-01-1..CF-01-4 | `user-registration-bfa-rules.ts` |

**Key design contract tests:**
- DC-01: Email uniqueness checked BEFORE storeDocument (CF-1)
- DC-02: Idempotency via duplicate idempotency key returns same result (DNA-7)
- DC-03: Credentials never appear in queue events (CF-8: no password in AccountCreated)
- DC-04: Token stored before email event emitted (DNA-8)
- DC-05: Resend rate-limit reads from FREEDOM config, never hardcoded (CF-3)
- DC-06: Onboarding resumes from last incomplete step on app-reopen (CF-4)
- DC-07: OnboardingCompleted only fires when all 3 material types present
- DC-10: FLOW-01→FLOW-02 cross-flow gate — distinct event names

---

## 9. Document References

| Document | Location | Key Content |
|----------|----------|-------------|
| Invariants extraction | `docs/sessions/FLOW-01/FLOW-01-STEP-1-INVARIANTS.md` | 9 DNA rules, 4 BFA rules, 5 iron rules, 5 MACHINE constraints, 5 FREEDOM items |
| Cycle 1 context | `docs/sessions/FLOW-01/FLOW-01-STEP-2-CYCLE1-CONTEXT.md` | RAG context for genesis prompt |
| Cycle 1 test | `docs/sessions/FLOW-01/FLOW-01-STEP-3-CYCLE1-TEST.md` | First generation cycle test results |
| Cycle 2 template | `docs/sessions/FLOW-01/FLOW-01-STEP-4-CYCLE2-TEMPLATE.md` | Refined template after cycle 1 |
| Cycle 3 context | `docs/sessions/FLOW-01/FLOW-01-STEP-6-CYCLE3-CONTEXT.md` | Third generation cycle |
| Handoff contract | `docs/sessions/FLOW-01/FLOW-01-STEP-8-HANDOFF-CONTRACT.md` | Service interface contract for next phase |
| Chain review | `docs/sessions/FLOW-01/FLOW-01-STEP-10-CHAIN-REVIEW.md` | End-to-end chain validation |
| Live run results | `docs/sessions/FLOW-01/final-flow-testing/FLOW-01-LIVE-RUN-RESULTS.json` | Actual generation run scores |
| Architecture decisions | `docs/sessions/FLOW-01/final-flow-testing/FLOW-01-ARCHITECTURE-DECISIONS.json` | D-01-1 (scheduler callback), D-01-2 (rate limit interface), D-01-3 |
| Implementation state | `docs/sessions/FLOW-01/FLOW-01-IMPL-STATE.json` | Phase tracking for implementation |
| Gap sessions | `docs/sessions/FLOW-01/final-flow-testing/SESSION-GAP-R0..R16.md` | 17 gap closure sessions |
| Design simulation (xiigen) | `docs/xiigenDesign/ENGINE_ARCHITECTURE_MERGED.md` (FLOW-01 section ~line 731) | Factory interfaces F174-F181 |
| Task types catalog | `docs/xiigenDesign/TASK_TYPES_CATALOG_MERGED.md` (FLOW-01 section) | T47-T49 contract definitions |

---

---

# FLOW-02: Profile Enrichment & Matching

**Slug:** `profile-enrichment` | **Task Types:** T50, T51, T52
**Services:** 7 | **Client Pages:** 3 | **E2E Snapshots:** 10
**Contract:** `server/src/engine-contracts/profile-enrichment-contracts.ts`
**BFA Rules:** `server/src/engine-contracts/profile-enrichment-bfa-rules.ts` (CF-02-1..CF-02-4)

---

## 1. Flow Overview

After a new developer completes registration (FLOW-01), FLOW-02 enriches their profile with skill data, runs compatibility scoring to match them with relevant projects and businesses, and personalizes their content feed. The flow uses a fan-in architecture: multiple independent data enrichment processes run in parallel (profile data, analytics segmentation, learning program assignment), then converge at a matching gate that scores compatibility across all available projects.

A key design feature is **graceful degradation**: the feed personalization service reads 4 independent signals (profile, segment, curriculum, match scores), each with its own named fallback. Even if all 4 signals fail, the system produces a feed using trending content — the user always sees something useful.

---

## 2. Business Logic

### Step 1 — Profile Fan-In (T50: ProfileEnrichmentFanIn)

FLOW-02 begins when `OnboardingCompleted` arrives from FLOW-01. Three independent enrichment tracks run:

1. **Business Profile (A1):** Collects professional information, skills, interests. Stores to `xiigen-business-profiles`
2. **Analytics Segmentation (A2):** Assigns the user to behavioral segments based on registration data. Stores to `xiigen-analytics-segments`
3. **Learning Program Assignment (A3):** Assigns an initial learning track based on stated skill level. Stores to `xiigen-learning-programs`

Each track is independent — failure of one does not block others.

### Step 2 — Compatibility Scoring (T51: MatchingConvergenceGate)

After the fan-in completes, the matching engine runs:

1. System reads all available matching profiles from `xiigen-matching-profiles` (GLOBAL scope only)
2. Applies configurable algorithm weights from FREEDOM config
3. Has a 30-second MACHINE timeout — if scoring takes longer, returns partial results as a **success** mode (design decision FLOW-02-RAG-timeout-as-success-mode)
4. `partialResults: true` is NOT a failure — the user sees matches with a "more matches loading" indicator
5. Results stored to `xiigen-business-matches` before any downstream event (DNA-8)
6. SETNX idempotency prevents duplicate matching runs (DNA-7)

### Step 3 — Feed Personalization & Broadcast (T52: OnboardingCompletionBroadcast)

1. Feed personalization reads 4 signals with individual fallbacks:
   - `profileSignal` from A1 → fallback: generic profile
   - `segmentSignal` from A2 → fallback: default segment
   - `curriculumSignal` from A3 → fallback: beginner track
   - `matchSignal` from B1 → fallback: trending content
2. Produces a personalized feed even with 0/4 signals available (always degrades gracefully)
3. Stores feed to `xiigen-personalization-feeds`
4. Emits `PersonalizationCompleted` event to downstream flows

---

## 3. Entities

| Entity | Index | Key Fields | Scope |
|--------|-------|-----------|-------|
| BusinessProfile | `xiigen-business-profiles` | profile_id, user_id, skills[], interests[], experience_level | PRIVATE |
| AnalyticsSegment | `xiigen-analytics-segments` | segment_id, user_id, segment_type, confidence_score | PRIVATE |
| LearningProgram | `xiigen-learning-programs` | program_id, user_id, track_name, difficulty_level | PRIVATE |
| BusinessMatch | `xiigen-business-matches` | scoring_id, user_id, matched_business_ids[], top_score, partial_results | PRIVATE |
| PersonalizationFeed | `xiigen-personalization-feeds` | feed_id, user_id, content_items[], signals_used, degraded | PRIVATE |

---

## 4. Services & Task Types

| Task Type | Service | File | Key Pattern |
|-----------|---------|------|-------------|
| T50 | BusinessProfileService | `profile-enrichment/business-profile.service.ts` | Fan-in track A1 |
| T50 | AnalyticsSegmentationService | `profile-enrichment/analytics-segmentation.service.ts` | Fan-in track A2 |
| T50 | LearningProgramService | `profile-enrichment/learning-program.service.ts` | Fan-in track A3 |
| T51 | CompatibilityScoringService | `profile-enrichment/compatibility-scoring.service.ts` | 30s timeout-as-success, SETNX |
| T51 | ConnectionSuggestionService | `profile-enrichment/connection-suggestion.service.ts` | Friend suggestions from match data |
| T52 | FeedPersonalizationService | `profile-enrichment/feed-personalization.service.ts` | 4 signals with fallbacks |
| T52 | PersonalizationCompletionService | `profile-enrichment/personalization-completion.service.ts` | Broadcast completion |

---

## 5. User Interface

| Page | File | Purpose |
|------|------|---------|
| Questionnaire | `client/src/pages/profile-enrichment/QuestionnairePage.tsx` | Skills and interests input form |
| Matching | `client/src/pages/profile-enrichment/MatchingPage.tsx` | Shows matching progress and results |
| Personalization | `client/src/pages/profile-enrichment/PersonalizationPage.tsx` | Personalized feed with content recommendations |

### E2E Screenshots (`docs/e2e-snapshots/profile-enrichment/`)

| # | Screenshot | What It Shows |
|---|-----------|---------------|
| 1 | `01-questionnaire-form.png` | Skills and interests questionnaire |
| 2 | `02-validation-error.png` | Questionnaire validation error |
| 3 | `03-debounce-pending.png` | Debounced input pending state |
| 4 | `04-processing.png` | Profile enrichment in progress |
| 5 | `05-matching-in-progress.png` | Compatibility scoring running |
| 6 | `06-matching-partial.png` | Partial matches (timeout-as-success mode) |
| 7 | `07-matching-complete.png` | Full match results displayed |
| 8 | `08-personalization-feed.png` | Personalized content feed |
| 9 | `09-personalization-completed-event.png` | Completion event confirmation |
| 10 | `10-personalization-degraded.png` | Degraded mode — trending content shown when signals unavailable |

---

## 6. User Journey

**Happy path:**

1. User completes FLOW-01 onboarding → `OnboardingCompleted` event fires
2. User is redirected to questionnaire page (screenshot 01)
3. User fills in skills, interests, experience level
4. System runs 3 parallel enrichment tracks (screenshot 04)
5. Matching engine scores compatibility with businesses (screenshot 05)
6. Results appear as match cards with compatibility percentages (screenshot 07)
7. Personalized content feed is generated (screenshot 08)
8. `PersonalizationCompleted` fires → FLOW-07 can suggest friends

**Degraded path:**

- AI matching unavailable → partial results shown with trending fallback (screenshot 10)
- Timeout during scoring → partial matches returned as success (screenshot 06)

---

## 7. Cross-Flow Correlations

| Direction | Flow | Event | Description |
|-----------|------|-------|-------------|
| **Consumes ←** | FLOW-01 | `OnboardingCompleted` | Triggers profile enrichment |
| **Produces →** | FLOW-07 (Social Feed) | `PersonalizationCompleted` | Enables friend suggestions from match data |
| **Produces →** | FLOW-13 (Analytics) | Profile segment data | Analytics warehouse ingests segment assignments |

---

## 8. Testing Coverage

| Category | Location |
|----------|----------|
| Server e2e tests | `server/test/e2e/profile-enrichment/` |
| Client e2e (Playwright) | `client/e2e/profile-enrichment.spec.ts` |
| E2E screenshots | `docs/e2e-snapshots/profile-enrichment/` (10 images) |
| BFA rules | CF-02-1..CF-02-4 in `profile-enrichment-bfa-rules.ts` |

---

## 9. Document References

| Document | Location | Key Content |
|----------|----------|-------------|
| Invariants | `docs/sessions/FLOW-02/FLOW-02-STEP-1-INVARIANTS.md` | Flow identity, DNA rules, FREEDOM/MACHINE classification |
| Cycle 1 context | `docs/sessions/FLOW-02/FLOW-02-STEP-2-CYCLE1-CONTEXT.md` | RAG context for genesis prompt |
| Handoff contract | `docs/sessions/FLOW-02/FLOW-02-STEP-8-HANDOFF-CONTRACT.md` | Service interface contract |
| Chain review | `docs/sessions/FLOW-02/FLOW-02-STEP-10-CHAIN-REVIEW.md` | End-to-end validation |
| Implementation state | `docs/sessions/FLOW-02/FLOW-02-IMPL-STATE.json` | Phase tracking |

---

---

# FLOW-03: Event Management Platform

**Slug:** `event-management` | **Task Types:** T59, T60, T61, T62
**Services:** 4 | **Client Pages:** 2 | **E2E Snapshots:** 11
**Contract:** `server/src/engine-contracts/event-management-contracts.ts`
**BFA Rules:** `server/src/engine-contracts/event-management-bfa-rules.ts` (CF-03-1..CF-03-4)

---

## 1. Flow Overview

FLOW-03 manages the full event lifecycle on the XIIGen community platform. Organizers can create events with configurable capacity limits, promote them through AI-generated content, track registrations, and monitor engagement analytics. The flow supports both free and paid events, public and private visibility, and has a deliberate three-state capacity model: `null` = unlimited, `0` = closed (no registrations), any positive number = limited seats.

---

## 2. Business Logic

### Step 1 — Event Creation (T59: EventCreationOrchestrator)

1. Organizer fills out the event creation form with title, date, capacity, and visibility settings
2. System validates all required fields
3. **Critical capacity rule (IR-59-1):** `capacity === null` means unlimited seats. `capacity === 0` means the event is closed to registrations. The system uses strict null check — NOT `!capacity` (which would incorrectly treat 0 as unlimited). Using `!capacity` is a BUILD_FAILURE (CF-03-2)
4. If `isPaidEvent === true`, the system checks that a payment config exists in `xiigen-payment-configs` — missing payment config returns `PAYMENT_CONFIG_MISSING` (CF-03-3)
5. The `matchingCriteria` object is required in the stored event schema because downstream node B1 reads it for attendee matching
6. Public events are stored with `knowledgeScope: 'GLOBAL'`, private/paid with `'PRIVATE'`
7. Document stored BEFORE `EventCreated` event emitted (DNA-8)

### Step 2 — Registration Management (T60: EventRegistrationManager)

1. When users register for an event, the system checks remaining capacity
2. For limited events, registration is rejected when capacity is reached
3. Idempotency key prevents duplicate registrations (DNA-7)
4. Registration record stored before `AttendeeRegistered` event (DNA-8)

### Step 3 — AI Promotion (T61: EventPromotionEngine)

1. Generates promotional content through the AI fabric
2. Creates promotional campaigns with configurable targeting
3. Promotional materials stored before distribution events

### Step 4 — Analytics Tracking (T62: EventAnalyticsTracker)

1. Tracks event engagement metrics: views, registrations, attendance rate
2. Aggregates analytics per event and per organizer
3. Feeds data to FLOW-13 (Data Warehouse) for cross-event analysis

---

## 3. Entities

| Entity | Index | Key Fields | Scope |
|--------|-------|-----------|-------|
| Event | `xiigen-events` | event_id, title, organizer_id, start_date, capacity (null/0/n), is_private, is_paid_event, matching_criteria | GLOBAL or PRIVATE |
| EventRegistration | `xiigen-event-registrations` | registration_id, event_id, user_id, status | PRIVATE |
| PromotionCampaign | `xiigen-promotion-campaigns` | campaign_id, event_id, content, targeting | PRIVATE |
| EventAnalytics | `xiigen-event-analytics` | event_id, views, registrations, attendance_rate | PRIVATE |

---

## 4. Services & Task Types

| Task Type | Service | File | Key Pattern |
|-----------|---------|------|-------------|
| T59 | EventCreationOrchestrator | `event-management/event-creation.service.ts` | Strict null capacity check (IR-59-1), paid event gate (CF-03-3) |
| T60 | EventRegistrationManager | `event-management/event-registration.service.ts` | Capacity enforcement, idempotent registration |
| T61 | EventPromotionEngine | `event-management/event-promotion.service.ts` | AI-generated promotional content |
| T62 | EventAnalyticsTracker | `event-management/event-analytics.service.ts` | Engagement metrics aggregation |

---

## 5. User Interface

| Page | File | Purpose |
|------|------|---------|
| Event List | `client/src/pages/event-management/EventListPage.tsx` | Browse and search events |
| Event Creation | `client/src/pages/event-management/EventCreationPage.tsx` | Create new events with capacity/visibility settings |

### E2E Screenshots (`docs/e2e-snapshots/event-management/`)

| # | Screenshot | What It Shows |
|---|-----------|---------------|
| 1 | `01-event-list.png` | Event listing page with cards |
| 2 | `02-event-list-empty.png` | Empty state — no events created yet |
| 3 | `03-event-list-error.png` | Error state — API failure |
| 4 | `04-navigate-to-create.png` | Navigation to create event form |
| 5 | `05-event-creation-form.png` | Event creation form with all fields |
| 5b | `05b-form-submitted.png` | Form in submission state |
| 6 | `06-validation-error.png` | Validation error on required fields |
| 7 | `07-unlimited-checked.png` | "Unlimited capacity" checkbox enabled |
| 8 | `08-event-created.png` | Success — event created confirmation |
| 9 | `09-event-creation-error.png` | Error during event creation |
| 10 | `10-event-duplicate.png` | Duplicate event idempotency detection |

---

## 6. User Journey

**Happy path:**

1. Organizer navigates to event list page (screenshot 01)
2. Clicks "Create Event" button (screenshot 04)
3. Fills in title, date, capacity settings (screenshot 05)
4. For unlimited events, checks "Unlimited" checkbox (screenshot 07)
5. Submits form → event created confirmation (screenshot 08)
6. Event appears in list → attendees can register via FLOW-04

**Error paths:**

- **Missing fields:** Validation error shown (screenshot 06)
- **Duplicate submission:** Idempotency returns existing event (screenshot 10)
- **API failure:** Error state with retry option (screenshot 09)

---

## 7. Cross-Flow Correlations

| Direction | Flow | Event | Description |
|-----------|------|-------|-------------|
| **Produces →** | FLOW-04 (Attendance) | `EventCreated` | Enables RSVP and check-in |
| **Produces →** | FLOW-09 (Transactional) | `EventCreated` | Enables paid event participation |
| **Produces →** | FLOW-08 (Marketplace) | Event listing data | Events can appear as marketplace items |
| **Produces →** | FLOW-13 (Analytics) | Event metrics | Analytics warehouse ingests engagement data |

---

## 8. Testing Coverage

| Category | Location |
|----------|----------|
| Server e2e tests | `server/test/e2e/event-management/event-management.e2e.spec.ts` |
| Client e2e (Playwright) | `client/e2e/event-management.spec.ts` |
| E2E screenshots | `docs/e2e-snapshots/event-management/` (11 images) |
| BFA rules | CF-03-1..CF-03-4 in `event-management-bfa-rules.ts` |

---

## 9. Document References

| Document | Location | Key Content |
|----------|----------|-------------|
| Invariants | `docs/sessions/FLOW-03/FLOW-03-STEP-1-INVARIANTS.md` | 9 DNA rules + flow-specific constraints |
| Cycle 1 context | `docs/sessions/FLOW-03/FLOW-03-STEP-2-CYCLE1-CONTEXT.md` | RAG context |
| Handoff contract | `docs/sessions/FLOW-03/FLOW-03-STEP-8-HANDOFF-CONTRACT.md` | Service interface |
| Chain review | `docs/sessions/FLOW-03/FLOW-03-STEP-10-CHAIN-REVIEW.md` | End-to-end validation |
| Implementation state | `docs/sessions/FLOW-03/FLOW-03-IMPL-STATE.json` | Phase tracking |
| Teaching QA | `client/e2e/event-management-event-attendance-teaching-pipeline.spec.ts` | Combined FLOW-03+04 teaching pipeline |

---

---

# FLOW-04: Event Attendance & Check-In

**Slug:** `event-attendance` | **Task Types:** T63, T64, T65, T66
**Services:** 5 | **Client Pages:** 2 | **E2E Snapshots:** 17
**Contract:** `server/src/engine-contracts/event-attendance-contracts.ts`
**BFA Rules:** `server/src/engine-contracts/event-attendance-bfa-rules.ts` (CF-04-1..CF-04-4)

---

## 1. Flow Overview

FLOW-04 handles everything that happens after an event is created (FLOW-03): RSVP submission, waitlist management with automatic promotion, QR-code check-in at the event, cancellation with configurable windows, and post-event feedback collection. The flow has sophisticated idempotency handling with two distinct cases — standard RSVP deduplication and waitlist-to-confirmed promotion — which must NOT be conflated.

---

## 2. Business Logic

### Step 1 — RSVP Submission (T63: RSVPOrchestrator)

1. Attendee submits RSVP for an event
2. System performs ONE atomic storeDocument per RSVP — no separate capacity decrement write. Two-write approaches create race conditions where concurrent reads of `capacity=1` both succeed, causing oversell (CF-802, IR-63-1)
3. **Two idempotency cases (IR-63-2):**
   - **Case A (standard RSVP):** SETNX by (attendeeId, eventId) — returns existing record if already submitted
   - **Case B (waitlist promotion):** When `promotionRequest: true` (from T64), performs conditional update WAITLISTED → CONFIRMED. SETNX on this path would silently return the WAITLISTED record and BLOCK the promotion
4. When event is full (`capacity=0`): returns `{ routed: 'WAITLIST' }` as a DataProcessResult.**success** — a full event is a business state, not a system error (IR-63-3, DR-04-B)
5. **Dual entry point (IR-63-4):** Both free RSVPs (`rsvp.requested`) and paid confirmations (`payment.confirmed`) enter the same orchestrator node, discriminated by the `paymentConfirmed` flag
6. Cancellation window read from FREEDOM config `flow04_rsvp_cancellation_window_hours`, stored as `cancellable_until` on every RSVP record (IR-63-5)

### Step 2 — Waitlist Management (T64: WaitlistManager)

1. Maintains ordered waitlist with priority
2. When a confirmed attendee cancels, the first waitlisted person is automatically promoted
3. Promotion triggers Case B idempotency path in T63 — conditional update, not SETNX

### Step 3 — Check-In (T65: CheckInProcessor)

1. At the event, attendees check in via QR code or manual lookup
2. System validates RSVP exists and status is CONFIRMED
3. Records check-in timestamp
4. Emits `AttendeeCheckedIn` event for gamification (FLOW-05)

### Step 4 — Feedback Collection (T66: FeedbackWindowController)

1. After the event ends, a feedback collection window opens
2. Window duration configured via FREEDOM config
3. Attendees can submit feedback during the window
4. Window closes automatically after configured duration

### Cancellation (CancellationProcessor)

1. Attendees can cancel if current time is within `cancellable_until`
2. Cancellation triggers waitlist promotion
3. Cancellation confirmation dialog shown to prevent accidental cancellations

---

## 3. Entities

| Entity | Index | Key Fields | Scope |
|--------|-------|-----------|-------|
| RSVP | `xiigen-event-rsvps` | rsvp_id, attendee_id, event_id, status (CONFIRMED/WAITLISTED/CANCELLED), cancellable_until | PRIVATE |
| WaitlistEntry | (within RSVP) | position, promoted_at | PRIVATE |
| CheckIn | `xiigen-event-checkins` | checkin_id, rsvp_id, event_id, checked_in_at | PRIVATE |
| FeedbackWindow | `xiigen-feedback-windows` | event_id, opens_at, closes_at, status | PRIVATE |

---

## 4. Services & Task Types

| Task Type | Service | File | Key Pattern |
|-----------|---------|------|-------------|
| T63 | RsvpOrchestrator | `event-attendance/rsvp-orchestrator.service.ts` | Atomic single-write RSVP, two-case idempotency, capacity=0→success |
| T64 | WaitlistManager | `event-attendance/waitlist-manager.service.ts` | Priority-ordered waitlist, auto-promotion |
| T65 | CheckInProcessor | `event-attendance/check-in-processor.service.ts` | QR code validation, timestamp recording |
| T66 | FeedbackWindowController | `event-attendance/feedback-window.service.ts` | Timed feedback collection window |
| — | CancellationProcessor | `event-attendance/cancellation-processor.service.ts` | Window-based cancellation with waitlist trigger |

---

## 5. User Interface

| Page | File | Purpose |
|------|------|---------|
| RSVP Page | `client/src/pages/event-attendance/RsvpPage.tsx` | RSVP submission, cancellation, status display |
| Attendance Dashboard | `client/src/pages/event-attendance/AttendanceDashboardPage.tsx` | Organizer view: attendee list, check-in status, analytics |

### E2E Screenshots (`docs/e2e-snapshots/event-attendance/`)

| # | Screenshot | What It Shows |
|---|-----------|---------------|
| 1 | `01-rsvp-form.png` | RSVP submission form |
| 2 | `02-rsvp-validation-error.png` | Validation error on RSVP form |
| 3 | `03-rsvp-confirmed.png` | Confirmed RSVP with cancellation option |
| 3b | `03b-rsvp-cancelled.png` | Cancelled RSVP state |
| 4 | `04-rsvp-waitlisted.png` | Waitlisted state with position |
| 5 | `05-rsvp-duplicate.png` | Duplicate RSVP attempt (idempotency) |
| 6 | `06-rsvp-window-closed.png` | Registration window closed |
| 7 | `07-rsvp-error.png` | RSVP error state |
| 8 | `08-cancel-confirm-dialog.png` | Cancellation confirmation dialog |
| 9 | `09-rsvp-submitted.png` | RSVP submitted state |
| 10 | `10-attendance-dashboard.png` | Organizer attendance dashboard |
| 11 | `11-attendance-empty.png` | Empty attendance dashboard |
| 12 | `12-attendance-error.png` | Dashboard error state |
| 13 | `13-checkin-kiosk.png` | Check-in kiosk interface |
| 14 | `14-checkin-success.png` | Successful check-in confirmation |
| 15 | `15-checkin-not-found.png` | Check-in: RSVP not found |
| 16 | `16-feedback-window.png` | Post-event feedback form |

---

## 6. User Journey

**Happy path — Attendee:**

1. User navigates to event details → clicks "RSVP" (screenshot 01)
2. Submits RSVP → sees "Confirmed" status with cancellation option (screenshot 03)
3. At event, approaches check-in kiosk (screenshot 13)
4. Scans QR code → confirmed check-in (screenshot 14)
5. After event, feedback window opens (screenshot 16)
6. FLOW-05 awards attendance points

**Waitlist path:**

1. User RSVPs to a full event → sees "Waitlisted" with position number (screenshot 04)
2. Another attendee cancels → user automatically promoted to confirmed
3. User receives promotion notification

**Cancellation path:**

1. Confirmed attendee clicks "Cancel RSVP"
2. Confirmation dialog appears (screenshot 08)
3. On confirm → status changes to Cancelled (screenshot 03b)
4. First waitlisted person automatically promoted

---

## 7. Cross-Flow Correlations

| Direction | Flow | Event | Description |
|-----------|------|-------|-------------|
| **Consumes ←** | FLOW-03 | `EventCreated` | Event must exist before RSVPs |
| **Produces →** | FLOW-05 (Gamification) | `AttendeeCheckedIn` | Awards attendance points |
| **Produces →** | FLOW-10 (Reviews) | Attendance confirmed | Enables event reviews after check-in |
| **Consumes ←** | FLOW-09 (Transactional) | `payment.confirmed` | Paid event registration path |

---

## 8. Testing Coverage

| Category | Location |
|----------|----------|
| Server e2e tests | `server/test/e2e/event-attendance/event-attendance.e2e.spec.ts` |
| Client e2e (Playwright) | `client/e2e/event-attendance.spec.ts` + `event-attendance-registration.spec.ts` |
| Teaching pipeline | `client/e2e/event-management-event-attendance-teaching-pipeline.spec.ts` |
| E2E screenshots | `docs/e2e-snapshots/event-attendance/` (17 images) |
| BFA rules | CF-04-1..CF-04-4 in `event-attendance-bfa-rules.ts` |

---

## 9. Document References

| Document | Location | Key Content |
|----------|----------|-------------|
| Invariants | `docs/sessions/FLOW-04/FLOW-04-STEP-1-INVARIANTS.md` | DNA rules + RSVP-specific constraints |
| Cycle tests | `docs/sessions/FLOW-04/FLOW-04-STEP-3/5/7-*.md` | Generation cycle test results |
| Handoff contract | `docs/sessions/FLOW-04/FLOW-04-STEP-8-HANDOFF-CONTRACT.md` | Service interface |
| Implementation state | `docs/sessions/FLOW-04/FLOW-04-IMPL-STATE.json` | Phase tracking |

---

---

# FLOW-05: Completion & Gamification

**Slug:** `completion-gamification` | **Task Types:** T44-T46, T83-T98
**Services:** 16 | **Client Pages:** 4 | **E2E Snapshots:** 0 (directory exists but empty)
**Contract:** `server/src/engine-contracts/completion-gamification-contracts.ts`
**BFA Rules:** `server/src/engine-contracts/completion-gamification-bfa-rules.ts` (CF-05-1..CF-05-4)

---

## 1. Flow Overview

FLOW-05 is the gamification engine that drives user engagement across the entire XIIGen platform. When a learner completes any lesson, quiz, or learning module, the gamification pipeline kicks in: records the completion, calculates points (server-side only — never from client input), updates the immutable ledger, checks for level-ups and achievements, manages learning streaks with timezone-aware daily calculations, triggers ML-driven curriculum adaptation, and shares accomplishments through the social feed.

The flow is the largest among domain flows with 16 services, each with its own unit test file co-located in the service directory.

---

## 2. Business Logic

### Step 1 — Completion Recording (T83: CompletionRecorder)

1. When a learning event completes (lesson, quiz, module), the completion is recorded
2. Stores raw completion data including questionnaire results
3. Emits `LessonCompleted` event to trigger the gamification pipeline

### Step 2 — Points Calculation (T84: PointsCalculator)

1. **Critical security rule (CF-05-1, IR-84-1):** The `earnedPoints` field is STRUCTURALLY ABSENT from the input interface. It is not zero-checked or ignored — the field simply does not exist in the TypeScript interface. This prevents point farming: clients cannot submit arbitrary scores
2. Points are calculated server-side by reading `questionnaireResult.scorePercent` from `xiigen-questionnaire-results` by questionnaireId (IR-84-2)
3. Never trusts a `scorePercent` forwarded in the event — always reads from the database
4. Output is a full breakdown: `{ base, bonus, multiplier, total }` — NOT a single number (IR-84-3). The downstream LedgerUpdater consumes the full breakdown

### Step 3 — Ledger Update (T85: LedgerUpdater)

1. Records points in an immutable, append-only ledger using BigInt storage
2. Ledger entries cannot be modified after creation — audit trail requirement
3. Each entry includes the full point breakdown from T84

### Step 4 — Level Check (T86: LevelUpChecker)

1. Evaluates current total points against level thresholds
2. Level formula: `×1.5 + 100` (MACHINE constant — not configurable)
3. If level-up occurs, emits `LevelUp` event

### Step 5 — Achievement Gate (T87: AchievementGate)

1. Checks unlockable achievements based on completion patterns
2. Achievement definitions are FREEDOM-configurable per tenant
3. Unlocked achievements emit `AchievementUnlocked`

### Step 6 — Streak Management (T96: StreakManager)

1. Computes learning streak in the learner's LOCAL timezone (IR-96-1)
2. `userTimezoneOffset` (minutes east of UTC) is REQUIRED — absence is a BUILD_FAILURE (CF-05-2)
3. Local date calculation: `Math.floor((utcMs + offsetMin*60000) / 86_400_000)` — NEVER `toISOString().slice(0,10)` which uses UTC midnight (IR-96-2)
4. Grace hours from FREEDOM config: `flow05_streak_grace_hours` (default 2 hours past local midnight)
5. Streak multiplier: `flow05_streak_multiplier_step` (default 0.1 per day, capped at `flow05_streak_multiplier_max` = 2.0)

### Step 7 — ML Curriculum Adaptation (T88: MLCurriculumTrigger)

1. Triggers AI-driven curriculum adaptation based on completion patterns
2. Adapts difficulty level and content selection per learner
3. ML model selection from FREEDOM config

### Step 8 — Social Sharing Pipeline (T89-T95)

1. **SocialShareGate (T89):** Consent gate — only shares if user has opted in
2. **SocialShareDistributor (T90):** Distributes achievement posts to social feeds
3. **SocialPostCreator (T91):** Creates formatted social posts
4. **SocialFeedUpdater (T92):** Updates the social feed with achievement content
5. **SocialNotificationSender (T93):** Sends notifications to connections
6. **SocialAnalyticsRecorder (T94):** Tracks social engagement metrics

### Analytics (T97: GamificationAnalytics)

Aggregates gamification engagement metrics across all learners.

---

## 3. Entities

| Entity | Index | Key Fields | Scope |
|--------|-------|-----------|-------|
| CompletionRecord | `xiigen-completion-records` | completion_id, user_id, lesson_id, score_percent | PRIVATE |
| PointsCalculation | `xiigen-points-calculations` | calc_id, completion_id, base/bonus/multiplier/total | PRIVATE |
| LedgerEntry | `xiigen-ledger-entries` | ledger_id, user_id, points, immutable (append-only, BigInt) | PRIVATE |
| Level | `xiigen-user-levels` | user_id, current_level, total_points | PRIVATE |
| Achievement | `xiigen-achievements` | achievement_id, user_id, unlocked_at | PRIVATE |
| StreakRecord | `xiigen-streak-records` | streak_id, user_id, current_streak, local_date, multiplier | PRIVATE |

---

## 4. Services & Task Types

| Task Type | Service | Key Pattern |
|-----------|---------|-------------|
| T83 | CompletionRecorder | Raw completion storage + event emission |
| T84 | PointsCalculator | Server-side only (CF-05-1), DB read (IR-84-2), breakdown output (IR-84-3) |
| T85 | LedgerUpdater | Immutable append-only, BigInt |
| T86 | LevelUpChecker | Level formula ×1.5+100 (MACHINE) |
| T87 | AchievementGate | FREEDOM-configurable achievement definitions |
| T88 | MLCurriculumTrigger | AI-driven curriculum adaptation |
| T89 | SocialShareGate | Consent-based sharing gate |
| T90 | SocialShareDistributor | Achievement distribution to feeds |
| T91 | SocialPostCreator | Formatted social post creation |
| T92 | SocialFeedUpdater | Feed content updates |
| T93 | SocialNotificationSender | Connection notifications |
| T94 | SocialAnalyticsRecorder | Social engagement metrics |
| T96 | StreakManager | Timezone-aware local date calculation (IR-96-2) |
| T97 | GamificationAnalytics | Engagement aggregation |
| T98 | LearningFlowCompleted | Flow completion orchestration |
| T95 | MLAdaptationProcessor | ML model adaptation processing |

All 16 services have co-located `.spec.ts` unit test files.

---

## 5. User Interface

| Page | File | Purpose |
|------|------|---------|
| Gamification Dashboard | `completion-gamification/GamificationDashboardPage.tsx` | Points, level, achievements, streak display |
| Learning Progress | `completion-gamification/LearningProgressPage.tsx` | Curriculum progress tracking |
| Lesson Completion | `completion-gamification/LessonCompletionPage.tsx` | Completion confirmation + points awarded |
| Social Learning | `completion-gamification/SocialLearningPage.tsx` | Social feed of achievements |

---

## 6. User Journey

**Happy path:**

1. Learner completes a lesson/quiz → completion recorded
2. Server calculates points from stored quiz score (never from client)
3. Points added to immutable ledger
4. Level check runs — if threshold crossed, level-up notification shown
5. Achievement check — any new achievements unlocked
6. Streak updated using learner's local timezone
7. If opted-in to social sharing, achievement posted to social feed
8. ML curriculum adaptation adjusts next lesson difficulty

---

## 7. Cross-Flow Correlations

| Direction | Flow | Event | Description |
|-----------|------|-------|-------------|
| **Consumes ←** | ALL domain flows | Completion events | Gamification triggered by any completion |
| **Consumes ←** | FLOW-04 | `AttendeeCheckedIn` | Awards attendance points |
| **Produces →** | FLOW-07 (Social Feed) | Achievement posts | Social sharing of accomplishments |
| **Produces →** | FLOW-13 (Analytics) | Gamification metrics | Engagement data for warehouse |

---

## 8. Testing Coverage

| Category | Location |
|----------|----------|
| 16 co-located unit tests | `server/src/engine/flows/completion-gamification/*.spec.ts` |
| Server e2e tests (2 files) | `server/test/e2e/completion-gamification/` |
| Design contract tests | `completion-gamification-proper-flow.e2e.spec.ts` |
| Client e2e | `client/e2e/lesson-completion.spec.ts` |
| Topology QA | `client/e2e/topology/completion-gamification-topology-qa.spec.ts` |
| BFA rules | CF-05-1..CF-05-4 in `completion-gamification-bfa-rules.ts` |

---

## 9. Document References

| Document | Location | Key Content |
|----------|----------|-------------|
| Invariants | `docs/sessions/FLOW-05/FLOW-05-STEP-1-INVARIANTS.md` | DNA + gamification iron rules |
| Chain review | `docs/sessions/FLOW-05/FLOW-05-STEP-10-CHAIN-REVIEW.md` | End-to-end validation |
| Implementation state | `docs/sessions/FLOW-05/FLOW-05-IMPL-STATE.json` | Phase tracking |
| Engine Architecture | `docs/xiigenDesign/ENGINE_ARCHITECTURE_MERGED.md` (Family 23-24) | Factory interfaces F166-F173 |

---

---

# FLOW-06: User Groups & Communities

**Slug:** `user-groups-communities` | **Task Types:** T71-T72, T89-T90, T99-T118
**Services:** 4 (core) + 20 (membership-group-feed) = 24 total | **Client Pages:** 5
**Contract:** `server/src/engine-contracts/user-groups-communities-contracts.ts` + `user-groups-communities-membership-group-feed-contracts.ts`
**BFA Rules:** `server/src/engine-contracts/user-groups-communities-bfa-rules.ts` (CF-06-1..CF-06-4)

---

## 1. Flow Overview

FLOW-06 manages community groups where members connect around shared interests. The flow supports two group types: open-join groups (anyone can join) and invite-only groups (require a valid invitation). Groups have configurable membership tiers that control access to different content levels. The flow handles join/leave processing, tier assignment and upgrades, content feed curation per tier, admin notifications, approval workflows, and group analytics.

The flow is split across two service directories: `user-groups-communities/` (4 core services) and `membership-group-feed/` (20 extended services handling the full membership lifecycle).

---

## 2. Business Logic

### Step 1 — Group Membership Processing (T71: GroupMembershipProcessor)

1. User requests to join or leave a group
2. For invite-only groups: validates the invitation ID before processing (IR-2)
3. All membership records are dual-scoped: both `tenantId` AND `groupId` (IR-3)
4. Membership record stored BEFORE membership event emitted (DNA-8, IR-1)
5. Emits `MemberJoined` or `MemberLeft` events

### Step 2 — Access Control (AccessControlEnforcer)

1. Validates member permissions based on their tier
2. Enforces tier-specific content access rules
3. Higher tiers can see more content categories

### Step 3 — Tier Management (MembershipTierUpdater)

1. Assigns initial tier on join (default: BASIC)
2. Processes tier upgrades/downgrades based on activity
3. Tier changes trigger feed content re-curation

### Step 4 — Group Feed (GroupFeedPopulator)

1. Curates content feed specific to each tier level
2. Higher-tier members see exclusive content
3. Feed updated on membership changes and content additions

### Step 5 — Extended Membership Pipeline (20 services)

The `membership-group-feed/` directory handles the complete lifecycle:
- Join request validation and processing
- Approval workflows for invite-only groups
- Welcome messages and admin notifications
- Content feed seeding and adjustment
- Group activity analytics
- Connection notifications
- Content profiling and caching

---

## 3. Entities

| Entity | Index | Key Fields | Scope |
|--------|-------|-----------|-------|
| GroupMembership | `xiigen-group-memberships` | membership_id, user_id, group_id, tier, status | PRIVATE (dual: tenant+group) |
| Group | `xiigen-groups` | group_id, name, type (OPEN/INVITE_ONLY), tenant_id | PRIVATE |
| GroupFeed | `xiigen-group-feeds` | feed_id, group_id, tier_level, content_items | PRIVATE |
| JoinRequest | `xiigen-join-requests` | request_id, user_id, group_id, status | PRIVATE |

---

## 4. Services

**Core (user-groups-communities/):**
- GroupMembershipProcessor — join/leave processing with invite validation
- AccessControlEnforcer — tier-based permission checking
- GroupFeedPopulator — tier-specific feed curation
- MembershipTierUpdater — tier assignment and changes

**Extended (membership-group-feed/, 20 services):**
JoinRequestValidator, MembershipTierAssigner, MembershipActivator, MembershipRecorder, MemberJoinedNotificationSender, ContentFeedSeeder, TierContentSelector, FeedComposer, FeedAnalyticsRecorder, NotificationDispatcher, WelcomeMessageSender, GroupActivityNotifier, AdminNotificationSender, ApprovalRequestSender, ApprovalStatusTracker, AccessGrantedRecorder, MembershipFinalizer, TierUpgradeProcessor, TierDowngradeProcessor, TierChangeAnalytics

---

## 5. User Interface

| Page | File | Purpose |
|------|------|---------|
| Group Discovery | `GroupDiscoveryPage.tsx` | Browse and search available groups |
| Group Feed | `GroupFeedPage.tsx` | View group content feed (tier-filtered) |
| Membership Status | `MembershipStatusPage.tsx` | Current membership and tier info |
| Group Approval | `GroupApprovalPage.tsx` | Admin: approve/reject join requests |
| Tier Management | `TierManagementPage.tsx` | Admin: manage membership tiers |

---

## 6. User Journey

**Happy path (open group):**
1. User browses groups → finds interesting community
2. Clicks "Join" → immediately becomes a BASIC tier member
3. Group feed loads with tier-appropriate content
4. Welcome message sent, admin notified
5. Over time, activity earns tier upgrades → more content unlocked

**Invite-only path:**
1. User receives group invitation
2. Uses invitation to request membership
3. Admin reviews and approves request
4. On approval: membership activated, feed seeded, welcome sent

---

## 7. Cross-Flow Correlations

| Direction | Flow | Event | Description |
|-----------|------|-------|-------------|
| **Consumes ←** | FLOW-01 | `OnboardingCompleted` | Enables group invitations after registration |
| **Produces →** | FLOW-07 (Social Feed) | Group activity events | Published to social feed |
| **Produces →** | FLOW-05 (Gamification) | Community participation | Awards group participation points |

---

## 8. Testing & Documents

| Category | Location |
|----------|----------|
| Core unit tests | `user-groups-communities/*.spec.ts` (4 files) |
| Server e2e | `server/test/e2e/user-groups-communities/` |
| Client e2e | `client/e2e/group-membership.spec.ts` |
| BFA rules | CF-06-1..CF-06-4 |
| Session docs | `docs/sessions/FLOW-06/` (13 files) |

---

---

# FLOW-07: Friend Request & Social Feed

**Slug:** `friend-request-social-feed` | **Task Types:** T73-T82
**Services:** 10 | **Client Pages:** 4 | **E2E Snapshots:** 0
**Contract:** `server/src/engine-contracts/friend-request-social-feed-contracts.ts`
**BFA Rules:** `server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts` (CF-07-1..CF-07-4)

---

## 1. Flow Overview

FLOW-07 implements the complete social networking layer for the XIIGen platform. Users can send and respond to friend requests, building a bidirectional social graph. The system generates personalized feeds using AI-driven relevance scoring, delivers content through an orchestration pipeline, and maintains privacy controls. A critical design rule: a feed score of 0 is VALID — the item still emits. Filtering based on score is a BUILD_FAILURE; only the delivery orchestrator (T78) decides what to show.

---

## 2. Business Logic

### Social Graph Construction

1. **Friend Request Processor (T73):** Handles sending friend requests. Validates no duplicate pending requests. Stores request BEFORE notification (DNA-8)
2. **Friend Request Responder (T74):** Processes accept/reject responses. On accept, triggers bidirectional graph write
3. **Connection Graph Writer (T75):** Creates bidirectional edges in the social graph. Both directions stored atomically
4. **Mutual Connection Counter (T80):** Calculates mutual friend counts for "people you may know" suggestions

### Content Feed Pipeline

5. **Feed Item Generator (T76):** Creates feed items from user actions (posts, achievements, group activities)
6. **Feed Scorer (T77):** AI-driven relevance scoring. `score=0` is valid — item still emits (filtering on score is BUILD_FAILURE). Scoring weights from FREEDOM config only
7. **Feed Delivery Orchestrator (T78):** Decides final feed composition and delivers personalized content
8. **Social Notification Dispatcher (T79):** Sends notifications for social events (new friend, likes, comments)

### Privacy & Analytics

9. **Privacy Gatekeeper (T81):** Enforces visibility rules — users can control who sees their content
10. **Social Graph Analytics (T82):** Tracks social graph metrics: network density, engagement patterns

---

## 3. Entities

| Entity | Index | Key Fields | Scope |
|--------|-------|-----------|-------|
| FriendRequest | `xiigen-friend-requests` | request_id, from_user_id, to_user_id, status | PRIVATE |
| Connection | `xiigen-connections` | connection_id, user_a_id, user_b_id, connected_at | PRIVATE |
| FeedItem | `xiigen-feed-items` | item_id, user_id, content_type, relevance_score | PRIVATE |
| SocialNotification | `xiigen-social-notifications` | notification_id, user_id, type, read | PRIVATE |

---

## 4. User Interface

| Page | File | Purpose |
|------|------|---------|
| Friend Request | `FriendRequestPage.tsx` | Send/receive friend requests |
| Connections | `ConnectionsPage.tsx` | View connections and mutual friends |
| Social Feed | `SocialFeedPage.tsx` | Personalized content feed |
| Social Graph | `SocialGraphPage.tsx` | Network visualization |

---

## 5. Cross-Flow Correlations

| Direction | Flow | Event | Description |
|-----------|------|-------|-------------|
| **Consumes ←** | FLOW-02 | `PersonalizationCompleted` | Friend suggestions from matching |
| **Consumes ←** | FLOW-05 | Achievement posts | Achievement sharing in feed |
| **Consumes ←** | FLOW-06 | Group activities | Group content in feed |
| **Produces →** | FLOW-13 (Analytics) | Social metrics | Engagement data |

---

## 6. Testing & Documents

| Category | Location |
|----------|----------|
| 10 co-located unit tests | `friend-request-social-feed/*.spec.ts` |
| Server e2e (2 files) | `server/test/e2e/friend-request-social-feed/` |
| Client e2e | `client/e2e/social-connections.spec.ts` |
| Design simulation | `docs/sessions/FLOW-07/FLOW-07-DESIGN-SIMULATION-R1.md` |
| Session docs | `docs/sessions/FLOW-07/` (16 files) |

---

---

# FLOW-08: Marketplace Listings & Catalog

**Slug:** `marketplace` | **Task Types:** T83-T88 | **Services:** 6 | **Client Pages:** 5
**Contract:** `server/src/engine-contracts/marketplace-contracts.ts`

## Overview
The marketplace enables sellers to publish product/service listings that go through AI-assisted moderation before appearing in a searchable catalog. Services handle listing publication, catalog indexing for faceted search, content moderation, feed generation, price validation, and analytics tracking.

**Services:** ListingPublisher, CatalogIndexer, ListingModerationEngine, ListingFeedGenerator, ListingPriceValidator, ListingAnalyticsAggregator

**Pages:** BootstrapStatusPage, EventDiscoveryPage, EventRegistrationPage, ParticipationStatusPage, PurchaseHistoryPage

**Cross-flows:** FLOW-16 (payments), FLOW-10 (reviews), FLOW-17 (freelancer services)

**Docs:** `docs/sessions/FLOW-08/` (18 files including 2 design simulations)

---

# FLOW-09: Transactional Event Participation

**Slug:** `transactional-event-participation` (services in `event-participation/`) | **Task Types:** T67-T72
**Services:** 6 | **Client Pages:** 5
**Contract:** `server/src/engine-contracts/transactional-event-participation-contracts.ts` + `marketplace-event-participation-contracts.ts`

## Overview
Manages paid event participation — ticket purchase orchestration, invitation broadcasting, registration with payment validation, and purchase history tracking with duplicate detection. The flow bridges FLOW-03 (events) with FLOW-16 (payments).

**Services:** ParticipationBootstrapOrchestrator (T67), EventInvitationBroadcaster (T68), RegistrationProcessor (T69), PurchaseHistoryRecorder (T70), PurchaseOverlapAnalyzer (T71), ParticipationAnalyticsTracker (T72)

**Pages:** EventDiscoveryPage, EventRegistrationPage, ParticipationStatusPage, PurchaseHistoryPage, BootstrapStatusPage

**Cross-flows:** FLOW-03 (event data), FLOW-16 (payment processing), FLOW-05 (participation points)

**Docs:** `docs/sessions/FLOW-09/` (17 files including 2 design simulations + implementation plan)

---

# FLOW-10: Reviews & Reputation

**Slug:** `reviews-reputation` | **Task Types:** T169-T172 | **Services:** 4 | **Client Pages:** 4
**Contract:** `server/src/engine-contracts/reviews-reputation-contracts.ts`
**BFA Rules:** CF-10-1..CF-10-4

## Overview
Review submission with AI-assisted moderation, multi-dimensional reputation scoring, and review response orchestration. Reviews feed into a composite reputation score using configurable weighting factors.

**Services:** ReviewSubmissionGateway (T169), ReviewModerationEngine (T170), ReputationScoreAggregator (T171), ReviewResponseOrchestrator (T172)

**Pages:** ReviewListPage, ReviewSubmitPage, ReputationPage, ReviewResponsePage

**Cross-flows:** FLOW-08 (listing reviews), FLOW-04 (event reviews after check-in), FLOW-17 (freelancer trust scoring)

**Client e2e:** `client/e2e/reviews-reputation.spec.ts` | **Server e2e:** 7 spec files
**Docs:** `docs/sessions/FLOW-10/` (17 files including 2 design simulations)

---

# FLOW-11: Schema Registry & DAG

**Slug:** `schema-registry-dag` | **Task Types:** T189-T208 | **Services:** 20 | **Client Pages:** 3
**Contract:** `server/src/engine-contracts/schema-registry-dag-contracts.ts`
**BFA Rules:** CF-11-1..CF-11-4

## Overview
Engine-internal flow managing schema versioning, DAG dependency topology, compatibility checking, migration orchestration, and schema search. This is the backbone of the engine's data model management — every flow's schema definitions pass through this registry.

**Key Services:** SchemaRegistrationGateway, SchemaVersionManager, DagCycleDetector, DagDependencyTracker, SchemaCompatibilityChecker, SchemaPublisher, DagTopologyBuilder, SchemaMigrationOrchestrator, SchemaValidationService, SchemaQualityAnalyzer (+ 10 more)

**Pages:** SchemaRegistryPage, DagVisualizerPage, SchemaMigrationPage

**Cross-flows:** Used by ALL flows for schema validation. FLOW-14 (ETL) uses schemas for transformation. FLOW-18 (Visual Flow) renders DAG topologies.

**Client e2e:** `client/e2e/schema-registry-dag.spec.ts` | **Server e2e:** 11 spec files
**Docs:** `docs/sessions/FLOW-11/` (13 files)

---

# FLOW-12: Subscription & Recurring Billing

**Slug:** `subscription-billing` | **Task Types:** T209-T212 | **Services:** 4 | **Client Pages:** 3
**Contract:** `server/src/engine-contracts/subscription-billing-contracts.ts`
**BFA Rules:** CF-12-1..CF-12-4
**Playwright Screenshots:** 8 images in `client/playwright-results/subscription-billing-*`

## Overview
SaaS subscription management with plan orchestration, lifecycle state machine (TRIAL → ACTIVE → PAST_DUE → CANCELLED), recurring billing with retry/dunning logic, and subscription analytics (MRR, churn, LTV).

**Services:** SubscriptionPlanOrchestrator (T209), SubscriptionLifecycleManager (T210), RecurringBillingEngine (T211), SubscriptionAnalyticsAggregator (T212)

**Pages:** SubscriptionPlansPage, SubscriptionDashboardPage, BillingHistoryPage

**Playwright test screenshots:**
- Plan publish form, validation errors, TRIALING status display
- Subscription list with all status types, payment method fields, MRR metric card

**Cross-flows:** FLOW-15 (tenant billing), FLOW-16 (payment processing), FLOW-13 (billing metrics)

**Client e2e:** `client/e2e/subscription-billing.spec.ts` | **Server e2e:** 6 spec files
**Docs:** `docs/sessions/FLOW-12/` (13 files)

---

# FLOW-13: Data Warehouse & Analytics

**Slug:** `data-warehouse-analytics` | **Task Types:** T169-T188 | **Services:** 15
**Contract:** `server/src/engine-contracts/data-warehouse-analytics-contracts.ts`
**No client pages** (server-only analytics engine)

## Overview
Central analytics engine that ingests events from ALL domain flows, normalizes them into a warehouse schema, executes analytical queries, generates KPI dashboards, and runs funnel analysis. The warehouse is the single source of truth for business intelligence.

**Key Services:** WarehouseIngestionOrchestrator, EventNormalizationPipeline, QueryExecutionEngine, MetricAggregationEngine, KpiDashboardGenerator, FunnelAnalysisEngine (+ 9 more)

**Cross-flows:** Consumes events from ALL domain flows. FLOW-14 feeds transformed data. FLOW-20 uses for ad targeting.

**Docs:** `docs/sessions/FLOW-13/` (13 files)

---

# FLOW-14: ETL & Data Integration

**Slug:** `etl-data-integration` | **Task Types:** T213-T224 | **Services:** 12
**Contract:** `server/src/engine-contracts/etl-data-integration-contracts.ts`
**No client pages** (server-only data pipeline)

## Overview
Extract-Transform-Load pipeline for data integration. Handles connector registration, webhook ingestion, raw-to-staging transformation with schema drift detection, dimensional modeling, mart/KPI building, identity resolution across sources, and reverse ETL push to external systems.

**Key Services:** ConnectorRegistrationHandler (T213), EtlSyncSagaHandler (T214), WebhookIngestionHandler (T215), BackfillCoordinator (T216), RawToStagingTransformer (T217), SchemaDriftDetector (T218), DimensionalModelBuilder (T219), MartKpiBuilder (T220), IdentityJoinResolver (T221), CrossFlowAnalyticsExecutor (T222), ReverseEtlPushHandler (T223), WarehouseProvisioningHandler (T224)

**Cross-flows:** Feeds FLOW-13 (analytics). Uses FLOW-11 (schemas). FLOW-19 (sagas) provides compensation patterns.

**Docs:** `docs/sessions/FLOW-14/` (13 files)

---

---

# FLOW-15: SaaS Multi-Tenancy

**Slug:** `saas-multi-tenancy` | **Tasks:** T605-T608 | **Services:** 4 | **Pages:** 2

## Overview
Tenant provisioning lifecycle — creates isolated tenant environments, manages per-tenant configuration through FREEDOM config with Optimistic Concurrency Control (OCC), materializes quota budgets, and handles lifecycle transitions (activate/suspend/deactivate). This flow provides the multi-tenant foundation for the entire platform.

**Services:** TenantProvisioningOrchestrator (T605), TenantConfigurationManager (T606 — OCC for config writes), TenantQuotaMaterializer (T607), TenantLifecycleManager (T608)

**Key iron rule:** T606 uses `storeDocumentWithOCC()` for configuration updates — concurrent config changes fail gracefully instead of silently overwriting.

**Cross-flows:** Foundation for ALL multi-tenant operations. FLOW-12 handles billing. FLOW-30 extends with health scoring.
**Docs:** `docs/sessions/FLOW-15/` (13 files + last-phase-testing-plan/ with 83 files)

---

# FLOW-16: Marketplace Payments

**Slug:** `marketplace-payments` | **Tasks:** T609-T612 | **Services:** 4 | **Pages:** 2
**BFA Rules:** CF-16-1..CF-16-4

## Overview
Payment processing for marketplace transactions: checkout validation with inventory reservation via OCC, payment splitting between platform and seller based on commission rules, escrow management with state machine (HELD → RELEASED → REFUNDED), and scheduled seller payouts.

**Services:** MarketplaceCheckoutGateway (T609 — `storeDocumentWithOCC` for inventory), MarketplacePaymentSplitter (T610), MarketplaceEscrowController (T611 — state machine with OCC), SellerPayoutWriter (T612)

**Cross-flows:** FLOW-08 (listing data), FLOW-17 (milestone payments), FLOW-12 (billing infra)
**Docs:** `docs/sessions/FLOW-16/` (13 files)

---

# FLOW-17: Freelancer Marketplace

**Slug:** `freelancer-marketplace` | **Tasks:** T613-T616 | **Services:** 4 | **Pages:** 2
**BFA Rules:** CF-17-1..CF-17-4

## Overview
Service marketplace for freelancers: gig acceptance with SETNX locking to prevent double-booking, milestone-based contracts with OCC state transitions, delivery verification with escrow release, and freelancer review collection.

**Services:** GigAcceptanceLockGateway (T613 — SETNX prevents double-booking), MilestoneContractManager (T614 — OCC for milestones), DeliveryGateEscrowController (T615 — verify then release), FreelancerReviewWriter (T616)

**Cross-flows:** FLOW-08 (listings), FLOW-16 (escrow), FLOW-10 (review infra), FLOW-05 (freelancer badges)
**Docs:** `docs/sessions/FLOW-17/` (13 files)

---

# FLOW-18: Visual Flow Engine

**Slug:** `visual-flow-engine` | **Tasks:** T617-T620 | **Services:** 4 | **Pages:** 2
**BFA Rules:** CF-18-1..CF-18-4

## Overview
Visual canvas editor for designing engine flows: drag-and-drop node creation, custom node type registration with validation, code injection for custom logic, and flow publication with DRAFT → PUBLISHED state machine using OCC.

**Services:** FlowCanvasWriter (T617 — node positions + orphan detection), FlowPublicationOrchestrator (T618 — `storeDocumentWithOCC` for DRAFT→PUBLISHED), NodeTypeRegistrar (T619 — validation ORDER 2), CodeInjectionProcessor (T620 — `flow.status==='PUBLISHED'` check ORDER 1)

**Cross-flows:** FLOW-26 (meta-flow self-extension), FLOW-11 (schema validation), FLOW-25 (BFA validates published flows)
**Docs:** `docs/sessions/FLOW-18/` (13 files)

---

# FLOW-19: Durable Sagas & Compliance

**Slug:** `durable-sagas-compliance` | **Tasks:** T621-T624 | **Services:** 4 | **Pages:** 2
**BFA Rules:** CF-19-1..CF-19-4

## Overview
Saga orchestration with durable state and compensation. Manages long-running distributed transactions with checkpoints, executes compensation actions on failure (in reverse step order), writes immutable compliance audit trails, and enforces data retention policies.

**Services:** SagaOrchestrator (T621 — multi-step with checkpoints), CompensationEngine (T622 — reverse-order compensation), ComplianceAuditWriter (T623 — immutable audit trail), DataRetentionEnforcer (T624 — retention policy enforcement)

**Cross-flows:** FLOW-14 (ETL sync sagas), FLOW-16 (payment sagas), FLOW-09 (transactional registrations)
**Docs:** `docs/sessions/FLOW-19/` (13 files)

---

# FLOW-20: Ads Platform

**Slug:** `ads-platform` | **Tasks:** T625-T628 | **Services:** 4 | **Pages:** 2
**BFA Rules:** CF-20-1..CF-20-4

## Overview
Advertising platform with privacy compliance: GDPR/CCPA consent gate enforcement (consent check BEFORE any ad serving), real-time bid auction processing, fraud detection pre-billing validation, and political content review compliance.

**Services:** ConsentGateEnforcer (T625 — consent FIRST, before any ad), AuctionBidProcessor (T626 — real-time auctions), FraudPreBillingValidator (T627 — fraud flag before billing), PoliticalContentReviewer (T628 — political ad compliance)

**Cross-flows:** FLOW-13 (audience targeting data), FLOW-12 (ad spend billing), FLOW-24 (content moderation patterns)
**Docs:** `docs/sessions/FLOW-20/` (13 files)

---

# FLOW-21: Dynamic Forms & Workflows

**Slug:** `dynamic-forms-workflows` | **Tasks:** T629-T632 | **Services:** 4
**BFA Rules:** CF-21-1..CF-21-4

## Overview
Dynamic form builder with workflow automation: schema-driven form publication with version control, submission processing with validation, workflow automation dispatch with per-(submissionId, ruleId) SETNX locking, and PII-free submission analytics.

**Services:** FormSchemaPublisher (T629 — OCC for schema versions), FormSubmissionProcessor (T630 — validate before process), AutomationDispatcher (T631 — SETNX ORDER 3), SubmissionAnalyticsCollector (T632 — PII-free metrics)

**Cross-flows:** FLOW-23 (templates), FLOW-27 (approval workflows), FLOW-22 (CMS workflows)
**Docs:** `docs/sessions/FLOW-21/` (13 files)

---

# FLOW-22: CMS Publishing

**Slug:** `cms-publishing` | **Tasks:** T633-T636 | **Services:** 4
**BFA Rules:** CF-22-1..CF-22-4

## Overview
Content management and publishing pipeline: version-controlled content publishing with OCC-protected DRAFT → PUBLISHED state machine, multi-step approval workflows with role-based gates, scheduled publication dispatch, and content engagement analytics.

**Services:** ContentVersionPublisher (T633 — `storeDocumentWithOCC` for state transitions), ContentApprovalWorkflow (T634 — multi-step approval), ContentScheduleDispatcher (T635 — scheduled publication), ContentAnalyticsAggregator (T636 — engagement metrics)

**Cross-flows:** FLOW-28 (blog features), FLOW-21 (workflow automation), FLOW-24 (content moderation)
**Docs:** `docs/sessions/FLOW-22/` (13 files)

---

# FLOW-23: Form Builder & Templates

**Slug:** `form-builder-templates` | **Tasks:** T637-T649 | **Services:** 13 | **Pages:** 1
**BFA Rules:** CF-23-1..CF-23-4

## Overview
Template-based form builder — the largest single batch of FLOW-15..24 with 13 services. Covers JSON schema validation, version-controlled template publishing, template instantiation with SETNX locking, PII-free usage analytics, pure computation layout solving, read-only rendering, CMS data binding, JSONPath slot resolution, collaborative editing with IETF idempotency, AI-scored code export with quality gates, OWASP API1 permission enforcement, and CloudEvents webhook triggers.

**Services:**
- T637: TemplateSchemaValidator (JSON Schema ORDER 1)
- T638: TemplateVersionPublisher (OCC for versions)
- T639: TemplateInstantiationEngine (SETNX lock)
- T640: TemplateUsageAnalytics (PII-free, append-only)
- T641: LayoutSolverInvoke (pure computation, no AI)
- T642: TemplateModeRender (read-only, verifyReadOnly)
- T643: CmsDataBindingSet (DATA_PIPELINE, DNA-1)
- T644: DynamicDataSlotResolve (JSONPath)
- T645: DataPanelSlotMap (JSONPath binding)
- T646: CollaborativeEditingSync (IETF idempotency, F970)
- T647: CodeExportGate (AF-9 score fractional [0.0,1.0])
- T648: PermissionEnforcer (role from auth context ONLY, OWASP API1)
- T649: WebhookTriggerGate (CloudEvents F969, F970 idempotency)

**Cross-flows:** FLOW-21 (form creation), FLOW-22 (CMS binding), FLOW-18 (drag-and-drop patterns)
**Docs:** `docs/sessions/FLOW-23/` (13 files)

---

# FLOW-24: AI Safety & Moderation (Learning)

**Slug:** `ai-safety-moderation` | **Tasks:** T367-T374 | **Services:** 1 (core) + 9 (planned)
**BFA Rules:** CF-24-1..CF-24-4

## Overview
AI-driven learning platform with mandatory safety moderation. Covers consent enrollment, lesson composition with a mandatory safety gate (all AI-generated content must pass safety review before publication), quiz grading with server-side score recomputation (client scores rejected — DD-226), timezone-aware learning streak evaluation, personalized lesson scheduling, domain pack delivery, calendar sync, and multi-dimensional progress tracking. Four services are FREEDOM-gated (graceful skip when feature disabled).

**Services:**
- T367: ConsentAndEnrollmentGate — consent check for all outcomes
- T368-S1: ComposeStage — AI lesson composition
- T368-S2: SafetyGateStage — mandatory safety review
- T368-S3: PublishStage — publish to xiigen-published-lessons (GLOBAL intentional)
- T369: QuizGradingGate — client score rejected, server recomputes (DD-226)
- T370: LearningStreakEvaluationGate — timezone from F982 only (DD-223)
- T371: PersonalizedLessonScheduler — FREEDOM-gated
- T372: DomainPackDeliveryGate — FREEDOM-gated: missing → success({skipped:true})
- T373: CalendarSyncConnectorGate — F1018 factory only (DD-225)
- T374: AdvancedProgressTracker — FREEDOM-gated

**Key iron rules:**
- Safety gate is MANDATORY — no bypass even for admin
- Client quiz scores are REJECTED — server always recomputes from stored answers
- Timezone comes from F982 factory ONLY — never from client request

**Cross-flows:** FLOW-05 (learning points), FLOW-20 (content moderation patterns), FLOW-29 (RAG for lesson content)
**Docs:** `docs/sessions/FLOW-24/` (13 files)

---

*End of domain flow specifications. Infrastructure flows (FLOW-25..45) handle engine self-management and are documented in `docs/xiigenDesign/ENGINE_ARCHITECTURE_MERGED.md`.*
