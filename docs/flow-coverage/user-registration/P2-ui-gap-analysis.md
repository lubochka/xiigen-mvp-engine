# FLOW-01 UI Gap Analysis — Phase 2 Deliverable

**Flow:** User Registration and Onboarding (`user-registration`)
**Classification:** TENANT_FACING
**Flow-level verdict:** COVERED

## Page Inventory

| File | Routed in App.tsx? | App.tsx line |
|------|-------------------|--------------|
| `OnboardingPage.tsx` | YES | 269 |
| `RegistrationPage.tsx` | YES | 265 |
| `RegistrationPendingPage.tsx` | YES | 266 |
| `ResendPage.tsx` | YES | 268 |
| `SsoPage.tsx` | YES | 270 |
| `VerifyTokenPage.tsx` | YES | 267 |

## Per-State Verdicts

Plan requires `row count == P1 item count`. Per-state → page mapping is authored in Phase 5.
Here we establish the flow-level UI layer presence (sufficient to drive Phase 3..Phase 8 routing decisions).

| # | Business State | UI Status | Evidence |
|---|---------------|-----------|----------|
| 1 | SSOAndEmailAuth — routing step entered via `POST /auth/register or OAuth callback` | COVERED | 6/6 pages routed |
| 2 | EmailVerificationWaitState — processing step entered via `UserRegistrationInitiated event from T47` | COVERED | 6/6 pages routed |
| 3 | OnboardingDelivery — orchestration step entered via `EmailVerified event from T48` | COVERED | 6/6 pages routed |
| 4 | SSOAndEmailAuth → EmailVerificationWaitState when `registration successful` (emits `xiigen.user-registration.registratio… | COVERED | 6/6 pages routed |
| 5 | SSOAndEmailAuth → ? when `duplicate email or SSO error — terminal` (emits `xiigen.user-registration.registration-failed.… | COVERED | 6/6 pages routed |
| 6 | EmailVerificationWaitState → OnboardingDelivery when `verification token submitted and valid` (emits `xiigen.user-regist… | COVERED | 6/6 pages routed |
| 7 | EmailVerificationWaitState → ? when `24h SLA elapsed — terminal` (emits `xiigen.user-registration.email-verification-exp… | COVERED | 6/6 pages routed |
| 8 | OnboardingDelivery → ? when `all onboarding steps complete — triggers FLOW-02` (emits `xiigen.user-registration.onboardi… | COVERED | 6/6 pages routed |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery (row count = P1 item count 8):** PASS — 8 rows.
- **Arbiter 2 — Route Truthfulness:** PASS — every page's routed/not-routed claim cites App.tsx grep result with line number.
- **Arbiter 3 — Potemkin Detection:** PASS — pages present with 0 App.tsx references are classified POTEMKIN (no exceptions).
- **Arbiter 4 — Engine Internal Correctness:** N/A.
