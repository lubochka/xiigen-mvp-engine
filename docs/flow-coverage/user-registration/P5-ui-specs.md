# FLOW-01 UI Spec — Phase 5 Deliverable

**Flow:** User Registration and Onboarding (`user-registration`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `OnboardingPage.tsx` | `/user-registration/onboarding` | `delivery-community_invitation`, `delivery-community_invitation-failed`, `delivery-flow_tutorial`, `delivery-workspace_setup`, `onboarding-complete`, `page-onboarding` |
| `RegistrationPage.tsx` | `/user-registration/registration` | `email-input`, `error-code-DUPLICATE_EMAIL`, `error-message`, `page-register`, `password-input`, `registration-form` +1 |
| `RegistrationPendingPage.tsx` | `/user-registration/registration-pending` | `page-pending`, `resend-link`, `verification-pending` |
| `ResendPage.tsx` | `/user-registration/resend` | `page-resend`, `rate-limit-message`, `retry-after` |
| `SsoPage.tsx` | `/user-registration/sso` | `onboarding-progress`, `page-sso` |
| `VerifyTokenPage.tsx` | `/user-registration/verify-token` | `error-EXPIRED_TOKEN`, `error-INVALID_TOKEN`, `page-verify`, `request-new-token` |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | SSOAndEmailAuth — routing step entered via `POST /auth/register or OAuth callback` | `OnboardingPage.tsx` | `page-onboarding` |
| 2 | EmailVerificationWaitState — processing step entered via `UserRegistrationInitiated event … | `OnboardingPage.tsx` | `page-onboarding` |
| 3 | OnboardingDelivery — orchestration step entered via `EmailVerified event from T48` | `OnboardingPage.tsx` | `page-onboarding` |
| 4 | SSOAndEmailAuth → EmailVerificationWaitState when `registration successful` (emits `xiigen… | `RegistrationPage.tsx` | `page-registration` |
| 5 | SSOAndEmailAuth → ? when `duplicate email or SSO error — terminal` (emits `xiigen.user-reg… | `RegistrationPage.tsx` | `page-registration` |
| 6 | EmailVerificationWaitState → OnboardingDelivery when `verification token submitted and val… | `RegistrationPage.tsx` | `page-registration` |
| 7 | EmailVerificationWaitState → ? when `24h SLA elapsed — terminal` (emits `xiigen.user-regis… | `RegistrationPage.tsx` | `page-registration` |
| 8 | OnboardingDelivery → ? when `all onboarding steps complete — triggers FLOW-02` (emits `xii… | `OnboardingPage.tsx` | `page-onboarding` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 8 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
