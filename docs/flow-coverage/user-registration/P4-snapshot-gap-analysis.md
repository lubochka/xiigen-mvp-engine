# FLOW-01 Snapshot Gap Analysis — Phase 4 Deliverable

**Flow:** User Registration and Onboarding (`user-registration`)
**Classification:** TENANT_FACING
**Authoritative spec:** `client\e2e\user-registration.spec.ts`
**Snapshot dir:** `docs/e2e-snapshots/user-registration/`
**P3 input rows (TESTED+PARTIAL):** 5

| # | Business State | P3 | Verdict | PNG Evidence |
|---|---------------|-----|---------|--------------|
| 1 | SSOAndEmailAuth → EmailVerificationWaitState when `registration successful` (emits `xiigen.user-regi… | PARTIAL | PNG_EXISTS | 01-registration-form.png (26855B) |
| 2 | SSOAndEmailAuth → ? when `duplicate email or SSO error — terminal` (emits `xiigen.user-registration.… | TESTED | PNG_EXISTS | 03-duplicate-email.png (27562B) |
| 3 | EmailVerificationWaitState → OnboardingDelivery when `verification token submitted and valid` (emits… | PARTIAL | PNG_EXISTS | 04-verification-pending.png (28861B) |
| 4 | EmailVerificationWaitState → ? when `24h SLA elapsed — terminal` (emits `xiigen.user-registration.em… | PARTIAL | PNG_EXISTS | 01-registration-form.png (26855B) |
| 5 | OnboardingDelivery → ? when `all onboarding steps complete — triggers FLOW-02` (emits `xiigen.user-r… | TESTED | PNG_EXISTS | 08-onboarding-progress.png (32415B) |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery:** row count = 5 (= P3 TESTED+PARTIAL count). PASS
- **Arbiter 2 — PNG Truthfulness:** PASS — PNG_EXISTS requires file ≥1024B on disk under `docs/e2e-snapshots/user-registration/`.
- **Arbiter 3 — Screenshot-call Presence:** PASS — SCREENSHOT_CALL_EXISTS means `page.screenshot()` is present in the test block but PNG missing / < 1KB on disk.
- **Arbiter 4 — Distinction Clarity:** PASS — NO_SCREENSHOT means the test block has no `page.screenshot()` call (separate from SCREENSHOT_CALL_EXISTS).
