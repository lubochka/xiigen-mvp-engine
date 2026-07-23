# FLOW-01 UI Automation Gap Analysis — Phase 3 Deliverable

**Flow:** User Registration and Onboarding (`user-registration`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED

## Spec Files Found (both directories searched)

| Path | Lines | Size (B) | Role |
|------|------:|---------:|------|
| `client/e2e/user-registration.spec.ts` | 128 | 6514 | AUTHORITATIVE |

| # | Business State | P2 Verdict | Automation | Spec File | Test | Line |
|---|---------------|------------|-----------|-----------|------|------|
| 1 | SSOAndEmailAuth — routing step entered via `POST /auth/register or OAuth callback` | COVERED | NOT_TESTED | `user-registration.spec.ts` | — | — |
| 2 | EmailVerificationWaitState — processing step entered via `UserRegistrationInitiated event from T47` | COVERED | NOT_TESTED | `user-registration.spec.ts` | — | — |
| 3 | OnboardingDelivery — orchestration step entered via `EmailVerified event from T48` | COVERED | NOT_TESTED | `user-registration.spec.ts` | — | — |
| 4 | SSOAndEmailAuth → EmailVerificationWaitState when `registration successful` (emits `xiigen.user-regi… | COVERED | PARTIAL | `user-registration.spec.ts` | FLOW-01 — User Registration | 30 |
| 5 | SSOAndEmailAuth → ? when `duplicate email or SSO error — terminal` (emits `xiigen.user-registration.… | COVERED | TESTED | `user-registration.spec.ts` | R-03: duplicate email error | 54 |
| 6 | EmailVerificationWaitState → OnboardingDelivery when `verification token submitted and valid` (emits… | COVERED | PARTIAL | `user-registration.spec.ts` | FLOW-01 — User Registration | 30 |
| 7 | EmailVerificationWaitState → ? when `24h SLA elapsed — terminal` (emits `xiigen.user-registration.em… | COVERED | PARTIAL | `user-registration.spec.ts` | FLOW-01 — User Registration | 30 |
| 8 | OnboardingDelivery → ? when `all onboarding steps complete — triggers FLOW-02` (emits `xiigen.user-r… | COVERED | TESTED | `user-registration.spec.ts` | FLOW-01 — User Registration | 30 |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery:** row count = 8 (= P1 item count). PASS
- **Arbiter 2 — Both Directories Searched:** PASS — both `client/e2e/` AND `e2e/tests/` traversed; results listed in Spec Files section above.
- **Arbiter 3 — Test String Truthfulness:** PASS — TESTED/PARTIAL verdicts cite exact test/describe string with line number from the authoritative spec file.
- **Arbiter 4 — Duplicate Flagging:** N/A — 0 duplicate(s) flagged for Phase 12 consolidation.
