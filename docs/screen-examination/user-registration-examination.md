# Flow UI examination — FLOW-01 user-registration

## Date: 2026-04-20 · Run: RUN-58 · Batch: D (Grammar 5 Kiosk)

## One-sentence spec (F1)
> When a new user registers for the XIIGen community platform, verify their
> email address before granting access, and deliver onboarding materials
> including workspace setup, a first flow tutorial, and a community invitation.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-01.md`)
- **anonymous** — signup + email verification pending + verify-token landing
- **tenant-user** — onboarding + first-flow tutorial (after verify)
- **tenant-admin** — invite team members post-onboarding
- **platform-support** — resend-verification support

## Grammar
**G5 Kiosk / Single Action** — one-field-at-a-time signup, celebratory verification, guided onboarding.
**Reference:** **Airbnb signup, Linear onboarding, Notion signup** — SSO buttons above email form; single page; immediate onboarding after verify; first-load dashboard with personalised suggestions (not empty state).

## F4 Business doc
`business_flows.zip / 01-user-registration.md`

## Classification
- **Q1 CRUD?** ❌ NO — 6 dedicated pages (RegistrationPage, RegistrationPendingPage, VerifyTokenPage, ResendPage, OnboardingPage, SsoPage). Good page split.
- **Q2 Error/empty?** Verify-token edge cases (expired / already-used / invalid) need friendly recovery paths. Resend page as the recovery.
- **Q3 Engineering leak?** Check tokens in URL aren't displayed; "community platform" is OK.
- **Q4 Role-correct?** ✅ Anonymous-only entry; role transitions on verify.

**Primary finding:** likely 🟡 partial — architecture is right; per-page rendering needs verification.

## 18 existing PNGs

## Planned fixes
- RegistrationPage: SSO buttons stacked above email form; single "Sign up" primary
- RegistrationPendingPage: "Check your inbox" + clear "resend" secondary + "wrong email?" tertiary
- VerifyTokenPage: celebratory confirmation → redirect to OnboardingPage within 2s
- OnboardingPage: 3-step wizard (workspace name → first-flow tutorial → invite teammates), skip allowed
- All anonymous pages: no sidebar (RUN-49 G3 ✅)

## Fresh mobility and authorization visual examination, 2026-04-30

Evidence directory: `docs/e2e-snapshots/user-registration/tenant-a-source`.

The source capture now contains 288 screenshots: 6 pages, 8 roles, and 6 cells per role. The final disk check found 288 PNG files, 0 missing expected filenames, and 0 empty files.

The stronger Playwright visual guard passed in six serial page batches on fresh Vite ports: RegistrationPage 48 passed, RegistrationPendingPage 48 passed, VerifyTokenPage 48 passed, ResendPage 48 passed, OnboardingPage 48 passed, and SsoPage 48 passed.

The examination found 0 blocked visual findings after fixes. All Flow 01 kiosk routes now render without the app sidebar for every captured role. Verify-token populated screenshots show the verified-success state; verify-token error screenshots show the expired-token recovery path; resend populated screenshots show the email input; resend error screenshots show the rate-limit message; onboarding screenshots show role-specific onboarding states; SSO screenshots show redirecting, success, and failed-authentication states.
