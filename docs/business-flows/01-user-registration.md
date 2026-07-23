<!--
  Source: business flows.zip / 01-user-registration.md
  Canonical since: 2026-04-22
  Canonical flow: FLOW-01 user-registration
  Related deep-research: docs/business-flows/_deep-research/user-registration/ (if present)
  Related legacy engine artifacts: docs/business-flows/_legacy-engine-artifacts/user-registration/ (if present)
-->

# User Registration & SSO Onboarding

> **Flow ID**: FLOW-01  
> **Drawio Diagram**: Registration  
> **Version**: 1.0  
> **Last Updated**: 2026-02-25  

---

## Short Description

Handles new user sign-up through multiple SSO providers (Google, Facebook, LinkedIn, Figma) or email-based registration, including email verification, account creation, initial questionnaire delivery via chat, and onboarding completion tracking.

## Long Description

This flow is the entry point for every user into the Small Business Networking platform. It supports two primary registration paths: SSO-based (Google, Facebook, LinkedIn, Figma) and traditional email/password registration.

For SSO registration, the user authenticates with their chosen provider, the Auth Service validates the OAuth token, retrieves the user profile, and creates or merges the account. For email registration, the user submits credentials, receives a verification email with a time-limited token, and must verify before gaining full access.

Once the account is created and activated, the system triggers the onboarding sequence: the Questionnaire Service generates a personalized initial questionnaire and the Messaging Service delivers it to the user via an in-app chat message. The flow completes when the user finishes the questionnaire, at which point the system publishes `UserOnboardingCompleted` to trigger downstream personalization (matching, feed adaptation, learning programs).

---

## Persona Descriptions

### For AI / Code Generation

```yaml
flow_id: FLOW-01
entry_points:
  - POST /auth/sso/{provider}  # SSO path (Google, Facebook, LinkedIn, Figma)
  - POST /auth/register         # Email/password path
  - GET /auth/verify?token=     # Email verification callback

services:
  - auth-service:     Validates OAuth/credentials, issues JWT, publishes auth events
  - user-service:     Creates user profile, manages onboarding state machine
  - email-service:    Sends verification emails (consumes UserRegistrationInitiated)
  - questionnaire-service: Generates initial questionnaire (consumes UserCreated/UserActivated)
  - messaging-service:     Delivers questionnaire via chat (consumes QuestionnaireRequired)

event_chain:
  sso_path:
    1. UserSSOAuthenticated → user-service
    2. UserCreated → questionnaire-service, analytics-service
    3. QuestionnaireRequired → messaging-service
    4. QuestionnaireSent → audit-service
    5. QuestionnaireCompleted → user-service, analytics-service
    6. UserOnboardingCompleted → messaging-service, dashboard-service
  
  email_path:
    1. UserRegistrationInitiated → email-service
    2. VerificationEmailSent → audit-service
    3. EmailVerified → user-service
    4. UserCreated → questionnaire-service, analytics-service
    5. UserActivated → questionnaire-service, notification-service
    6. QuestionnaireRequired → messaging-service
    7. QuestionnaireSent → audit-service
    8. QuestionnaireCompleted → user-service, analytics-service
    9. UserOnboardingCompleted → messaging-service, dashboard-service

data_stores:
  - PostgreSQL: user credentials, tokens, sessions (auth-service)
  - MongoDB: user profiles, questionnaire responses (user-service, questionnaire-service)
  - Redis: session cache, rate limiting, token blacklist (auth-service)

error_handling:
  - SSO provider timeout: retry with exponential backoff (3 attempts, 1s/2s/4s)
  - Duplicate email on SSO: merge profiles if SSO email matches existing email-registered account
  - Verification token expired: allow re-send with new 24hr token
  - Dead letter queue: all failed event handlers write to DLQ for manual review

idempotency:
  - All event handlers must be idempotent (use userId + eventType as dedup key)
  - UserCreated handler checks if profile already exists before creating
```

### For Product Manager

**Business Value**: This is the funnel entry point — every user's first experience with the platform. Registration friction directly impacts conversion rates.

**Key Metrics to Track**:
- Registration completion rate (started vs. completed) by provider
- Email verification rate and time-to-verify
- Questionnaire completion rate after registration
- Drop-off points in the onboarding funnel
- SSO vs. email registration split
- Time from registration start to onboarding complete

**Feature Dependencies**: This flow must be complete before any other flow can function. Matching (FLOW-02), Events (FLOW-03), and all social features depend on having registered, onboarded users.

**A/B Testing Opportunities**:
- Number of questionnaire questions shown initially (5 vs. 10 vs. progressive)
- Questionnaire delivery method (modal popup vs. chat message vs. email)
- Skip-questionnaire option with reduced matching quality

**User Journey Context**: User arrives at landing page → sees anonymized stats and upcoming events → clicks "Sign up with Google" → authenticates → lands on dashboard → receives chat message with questionnaire → completes questionnaire → sees first match suggestions.

### For IT Security Manager

**Authentication Architecture**:
- OAuth2/OpenID Connect integration with Google, Facebook, LinkedIn, Figma
- JWT tokens with short-lived access tokens (15 min) and longer refresh tokens (7 days)
- Refresh token rotation: old refresh token invalidated on each use
- Tokens stored in httpOnly, Secure, SameSite cookies (not localStorage)

**Data Sensitivity**:
- PII collected: email, name, profile picture (from SSO), business details (from questionnaire)
- Classification: Confidential (user credentials), Internal (profile data)
- Password hashing: bcrypt with cost factor 12 (email registration path)
- SSO tokens: never stored long-term, exchanged for platform JWT immediately

**Attack Surface**:
- OAuth redirect URI validation (strict whitelist, no open redirects)
- Rate limiting: 5 registration attempts per IP per 15 minutes
- CSRF protection on all auth endpoints
- Verification token: cryptographically random, single-use, 24hr expiry
- Account enumeration prevention: same response for "email exists" and "email not found"

**Compliance**:
- GDPR: consent capture at registration, right to deletion support
- Audit trail: all auth events logged with IP, user-agent, timestamp
- Data retention: verification tokens purged after 24hrs, failed attempts logged for 90 days

**Audit Trail**: All 10 events in this flow are published to the event bus and can be consumed by an Audit Service for compliance logging.

### For DevOps

**Services to Deploy**:
| Service | Tech Stack | Scaling | Health Check |
|---------|-----------|---------|-------------|
| auth-service | Nest.js + TypeScript | Horizontal, CPU-based (>70%) | GET /health + JWT validation test |
| user-service | Nest.js + TypeScript | Horizontal, request-based | GET /health + DB connectivity |
| email-service | Nest.js + TypeScript | Queue-depth based | GET /health + SMTP connectivity |
| questionnaire-service | Nest.js + TypeScript | Horizontal, request-based | GET /health + MongoDB ping |
| messaging-service | Python + FastAPI | WebSocket connection count | GET /health + Redis ping |

**Infrastructure Dependencies**:
- PostgreSQL: auth-service primary store (connection pool: 20-50)
- MongoDB: user-service, questionnaire-service (replica set recommended)
- Redis: session store, rate limiter, token blacklist (Sentinel for HA)
- Kafka: event bus for all domain events (topic: `user-events`)
- RabbitMQ: email queue (`email-queue`) for reliable delivery

**Monitoring & Alerting**:
- Alert: registration success rate drops below 95%
- Alert: email verification rate drops below 70% (24hr window)
- Alert: SSO provider response time > 3s
- Alert: dead letter queue depth > 10 messages
- Dashboard: registration funnel visualization by provider, region, time

**Failure Blast Radius**: Auth service failure = complete registration block. User service failure = registrations queue up in Kafka (auto-recover on restart). Email service failure = verifications delayed but not lost (RabbitMQ durability).

**SLAs**: Registration endpoint: p99 < 2s. Email delivery: within 60s. Questionnaire delivery: within 5s of account activation.

---

## User Story

**Primary**: As a small business owner, I want to sign up quickly using my Google/Facebook/LinkedIn account, so that I can start networking with other business owners without creating yet another username and password.

**Secondary**: As a business owner who prefers email registration, I want to create an account with my email and password, so that I maintain control over my login credentials without depending on social providers.

**Onboarding**: As a newly registered user, I want to receive a guided questionnaire via chat, so that the platform can understand my business needs and start showing me relevant matches immediately.

## Business Flow (Happy Path)

### SSO Path
1. User clicks "Sign up with Google" on the landing page
2. Frontend redirects to Google OAuth consent screen
3. User approves permissions (email, profile)
4. Google redirects back with authorization code
5. Auth Service exchanges code for access token with Google
6. Auth Service fetches user profile from Google
7. Auth Service checks if user email exists in the database
8. Auth Service creates new user record (status: active)
9. Auth Service generates platform JWT (access + refresh tokens)
10. Auth Service publishes `UserSSOAuthenticated` event
11. User Service consumes event, creates full user profile with defaults
12. User Service publishes `UserCreated` event
13. Questionnaire Service consumes event, generates initial questionnaire
14. Questionnaire Service publishes `QuestionnaireRequired` event
15. Messaging Service consumes event, delivers questionnaire via chat
16. Messaging Service publishes `QuestionnaireSent` event
17. User fills out questionnaire in the chat interface
18. Questionnaire Service validates and stores responses
19. Questionnaire Service publishes `QuestionnaireCompleted` event
20. User Service updates onboarding status to complete
21. User Service publishes `UserOnboardingCompleted` event
22. Dashboard loads with personalized content

### Email Path
1. User clicks "Sign up with Email" on the landing page
2. User enters email, password, and basic profile data
3. Auth Service validates input (email format, password strength)
4. Auth Service checks email doesn't already exist
5. Auth Service creates pending user record
6. Auth Service generates verification token (24hr expiry)
7. Auth Service publishes `UserRegistrationInitiated` event
8. Email Service consumes event, sends verification email
9. Email Service publishes `VerificationEmailSent` event
10. User clicks verification link in email
11. Auth Service validates token (exists, not expired)
12. Auth Service updates user status to verified
13. Auth Service publishes `EmailVerified` event
14. User Service consumes event, activates account
15. User Service publishes `UserActivated` event
16. (Steps 13-22 from SSO path continue from here)

## Scenarios

### Scenario 1: SSO with Existing Email Account
- User previously registered via email, now tries Google SSO with same email
- System detects email match, merges accounts, links SSO provider
- User gains both login methods going forward

### Scenario 2: SSO with New Provider
- User already registered via Google, now links Facebook account
- System adds Facebook as additional SSO provider to existing account
- User can log in with either provider

### Scenario 3: Registration During Maintenance
- One SSO provider is temporarily unavailable
- System shows available providers, disables unavailable one with "temporarily unavailable" message
- User can choose alternative provider or email registration

### Scenario 4: Mobile Registration
- User registers through React Native mobile app
- Same flow but OAuth uses system browser or in-app browser tab
- Deep link callback returns to app after SSO approval

### Scenario 5: Multi-Tenant Registration
- User registers and selects a specific business community/tenant
- Tenant context is stored with user profile from the start
- Questionnaire may vary per tenant

## Edge Cases

1. **OAuth token expires mid-registration**: Auth code has short validity (~10 min). If user takes too long on consent screen, redirect fails. Show "Session expired, please try again" and restart.

2. **Duplicate SSO callback**: User double-clicks approve or browser retries. Event handlers must be idempotent — check if user already created before processing.

3. **Email already exists (different case)**: "John@Email.com" vs "john@email.com". Normalize all emails to lowercase before uniqueness check.

4. **Verification link clicked twice**: Token is single-use. Second click returns "Already verified" with redirect to login.

5. **Verification token expired**: 24hr limit passed. Show "Link expired" with "Resend verification email" button. Generate new token, invalidate old one.

6. **SSO provider returns incomplete data**: Google returns email but no name. Create account with email only, prompt user to complete profile manually.

7. **Concurrent registration with same email**: Two requests arrive simultaneously. Database unique constraint on email catches the second one. Return "Email already registered" gracefully.

8. **User abandons after registration, before questionnaire**: Account exists but onboarding incomplete. Send reminder via email after 24hrs and 72hrs. After 30 days, mark as dormant.

9. **Questionnaire Service down during registration**: Registration succeeds, questionnaire delivery fails. Message goes to dead letter queue. User sees dashboard without questionnaire. Retry mechanism delivers questionnaire when service recovers.

10. **Rate limiting triggered**: User (or attacker) exceeds 5 attempts per 15 min. Return HTTP 429 with retry-after header. Log IP for security monitoring.

## Business Logic

### Password Strength Rules (Email Registration)
- Minimum 8 characters
- At least one uppercase, one lowercase, one digit, one special character
- Not in common password list (top 10,000)
- Not similar to email address

### Verification Token Rules
- Cryptographically random (256-bit)
- Single-use (deleted after verification)
- 24-hour expiry
- One active token per email at a time (new request invalidates old token)

### Account Merge Logic (SSO + Existing Email)
- Match on normalized email address
- If existing account has password: keep password, add SSO link
- If existing account is SSO-only: add new SSO provider
- Merge preserves the older account's userId (foreign keys remain valid)

### Onboarding Completion Criteria
- Profile created: ✓ (automatic)
- Questionnaire completed: ✓ (user action required)
- Business details submitted: ✓ (part of questionnaire)
- All three steps complete → publish `UserOnboardingCompleted`

## Event Definitions

| Event | Publisher | Consumers | Key Payload Fields |
|-------|-----------|-----------|-------------------|
| `UserSSOAuthenticated` | Auth Service | User Service | userId, provider, email, name, profilePicture, accessToken, isNewUser |
| `UserRegistrationInitiated` | Auth Service | Email Service | email, registrationToken, userId, tokenExpiry |
| `VerificationEmailSent` | Email Service | Audit Service | email, emailId, sentAt, verificationLink |
| `EmailVerified` | Auth Service | User Service | userId, email, verifiedAt, ipAddress |
| `UserCreated` | User Service | Questionnaire Service, Analytics Service | userId, email, registrationMethod, createdAt, onboardingSteps |
| `UserActivated` | User Service | Questionnaire Service, Notification Service | userId, activatedAt, enabledFeatures |
| `QuestionnaireRequired` | Questionnaire Service | Messaging Service | userId, questionnaireId, dueDate |
| `QuestionnaireSent` | Messaging Service | Audit Service | userId, messageId, questionnaireLink, sentAt |
| `QuestionnaireCompleted` | Questionnaire Service | User Service, Analytics Service | userId, questionnaireId, responses, completedAt |
| `UserOnboardingCompleted` | User Service | Messaging Service, Dashboard Service | userId, onboardingSteps, completedAt |

## Services Involved

| Service | Role in Flow | Database | Scales On |
|---------|-------------|----------|-----------|
| Auth Service | Entry point, SSO validation, JWT issuance, email verification | PostgreSQL + Redis | CPU (auth is compute-heavy with bcrypt) |
| User Service | Profile creation, onboarding state management | MongoDB + PostgreSQL | Request count |
| Email Service | Sends verification emails | — (stateless) | Queue depth (RabbitMQ `email-queue`) |
| Questionnaire Service | Generates and manages initial questionnaire | MongoDB | Request count |
| Messaging Service | Delivers questionnaire via chat | MongoDB + Redis | WebSocket connections |
| Analytics Service | Tracks registration funnel metrics | Elasticsearch | Event throughput |
| Audit Service | Logs all events for compliance | Elasticsearch | Event throughput |


To extend the XIIGen platform (V61) with the **User Registration & SSO Onboarding** flow, the integration should follow the existing microservices-based, engine-first architecture. This process involves incorporating several new services while utilizing the established generic interfaces and the unified flow system.

### Architectural Integration Strategy

The new services required for this flow must inherit from the established `MicroserviceBase` and utilize the platform's generic `IDatabaseService` and `IQueueService` to ensure consistency across the Kubernetes cluster.

* **Auth Service (Core SSO & JWT)**:
* **Role**: Serves as the primary entry point for OAuth2/OIDC authentication with Google, Facebook, LinkedIn, and Figma.
* **Extension**: It must integrate with the **API Gateway** to extract and pass `UserId` and `Role` claims into the generic engine context.
* **Database**: Uses the generic `PostgreSQL` interface for persistent credential storage and `Redis` for time-limited verification tokens.


* **User Service (Profile & State Management)**:
* **Role**: Manages the user's profile and current onboarding state.
* **Flow Trigger**: Listens for the `UserRegistered` event. It persists profile data using the generic `MongoDB` interface to support flexible schema requirements for business-specific profile fields.


* **Questionnaire & Messaging Integration**:
* **Questionnaire Service**: Generates personalized initial questionnaires based on the registration method and user data.
* **Messaging Service**: Acts as a WebSocket-based delivery system. It receives a `QuestionnaireRequired` event and delivers a chat-based link to the user.
* **Execution**: This service should be modeled as a **Complex Task Type** within the `TASK_TYPES_CATALOG`, ensuring it adheres to strict output contracts before proceeding to the next flow phase.



### Flow Event Mapping within the Orchestrator

The registration process is managed through a series of asynchronous events handled by the platform's message queue:

| Event Name | Source Service | Targeted Downstream Services | Data Payload |
| --- | --- | --- | --- |
| `UserRegistered` | Auth Service | User Service, Email Service | `userId`, `email`, `registrationMethod` |
| `UserActivated` | User Service | Questionnaire Service, Notification Service | `userId`, `activatedAt`, `enabledFeatures` |
| `QuestionnaireCompleted` | Questionnaire Service | User Service, Analytics Service | `userId`, `responses`, `completedAt` |
| `UserOnboardingCompleted` | User Service | Messaging Service, Dashboard Service | `userId`, `onboardingSteps`, `completedAt` |

### Downstream Personalization (V61 Integration)

The completion of the registration flow serves as a critical trigger for the platform's AI-driven features:

* **Matching & Feed Adaptation**: The `UserOnboardingCompleted` event should be published to the **Multimodel Orchestrator**. This allows the orchestrator to initiate matching algorithms or adjust the user's primary feed based on the survey results collected.
* **Audit & Compliance**: Every registration event must be piped through the **Audit Service** (using Elasticsearch) to maintain compliance logs, as specified in the registration flow design.

### Implementation in React Native Client

The **React Native client** will be extended with new registration forms and a chat-based onboarding interface. These components will interact with the **API Gateway**, which manages the redirection to SSO providers and handles the secure storage of the issued JWT.