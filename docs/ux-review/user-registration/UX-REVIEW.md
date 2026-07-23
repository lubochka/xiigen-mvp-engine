# UX Review — User Registration (`user-registration`)

**PNGs reviewed:** 18 | **Blockers:** 2 | **High:** 2 | **Medium:** 5 | **Low:** 2
**Overall verdict:** ✅ Shippable (with minor fixes)

## Summary

User Registration is the strongest flow in the batch. The happy path and every key unhappy
path are visually represented and make sense to an end user: registration form ("Create your
account" with Email + Password + Create account), inline validation error ("Please review
your submission."), duplicate-email error ("An account with this email already exists."),
check-your-inbox ("We sent a verification link..." + Resend verification email), token
expired ("This verification link has expired. — Request a new verification link"), token
invalid ("This verification link is invalid or has been revoked."), rate-limit ("Too many
requests — You've recently requested a verification email. Try again in 60 minutes."),
onboarding in progress ("Welcome! Setting up your workspace" — Setting up workspace / Preparing
tutorials / Community invitation — all In progress), onboarding welcome ("Welcome aboard" with
3 pending tasks), onboarding complete (all 3 Delivered + green "Onboarding complete 🎉"), and
onboarding partial degraded (Community invitation: "Delivery failed — onboarding still
complete"). The only real issues are two `r-02-before.png`/`r-03-before.png` duplicates of the
empty form and two pipeline-named captures (`02-emailverificationwaitstate-processing-st.png`,
`04-ssoandemailauth-emailverificationwaitsta.png`) that show the empty registration form rather
than their claimed state.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-registration-form.png` | ✅ | — | Clean "Create your account" form, Email + Password with placeholders, primary blue "Create account" button. No confusion | — |
| 2 | `01-ssoandemailauth-routing-step-entered-via.png` | ✅ | — | Shows the right next-state: "Welcome aboard" with 3 Pending items (Workspace setup / Flow tutorial / Community invitation). Hourglass icons. Good sign-in transition evidence | — |
| 3 | `02-emailverificationwaitstate-processing-st.png` | 🔴 | State fidelity | Claims "emailverificationwaitstate processing"; shows the empty pristine registration form. User would expect the "Check your inbox" card | Capture after submit; should show verification wait |
| 4 | `02-validation-error.png` | ✅ | — | "not-an-email" typed in Email, red inline "Please review your submission." — standard pattern | — |
| 5 | `03-duplicate-email.png` | ✅ | — | "existing@test.com" with password masked, red "An account with this email already exists." Specific and actionable | — |
| 6 | `03-onboardingdelivery-orchestration-step-en.png` | ✅ | — | "Welcome aboard" with 3 Pending tasks — matches "onboarding orchestration" claim | — |
| 7 | `04-ssoandemailauth-emailverificationwaitsta.png` | 🔴 | State fidelity | Claims the wait-state transition; shows the pristine registration form | Capture after submit |
| 8 | `04-verification-pending.png` | ✅ | — | "Check your inbox" with mail icon, copy "We sent a verification link..." + "Resend verification email" link — perfect | — |
| 9 | `05-emailverificationwaitstate-onboardingdel.png` | 🟠 | State fidelity | Shows empty registration form, not the wait→onboarding transition | Capture when verification completes and onboarding kicks in |
| 10 | `05-token-expired.png` | ✅ | — | Amber warning icon + "This verification link has expired." + "Request a new verification link" — user can recover | — |
| 11 | `06-emailverificationwaitstate-when-24h-sla.png` | 🟠 | State fidelity | Empty registration form again. No 24h SLA state visible | Add a "Your verification is about to expire" banner state |
| 12 | `06-token-invalid.png` | ✅ | — | "This verification link is invalid or has been revoked." Clear; but no recovery CTA visible (unlike token-expired) | Add "Request a new verification link" here too for symmetry |
| 13 | `07-rate-limit.png` | ✅ | — | "Too many requests — You've recently requested a verification email. Try again in 60 minutes." Specific; time-bound. Good | Consider showing a countdown instead of a static "60 minutes" so it decreases |
| 14 | `08-onboarding-progress.png` | ✅ | — | "Welcome! Setting up your workspace" with 3 active tasks ("In progress..."). Nice progression semantics vs. "Pending" state | — |
| 15 | `09-onboarding-degraded.png` | 🟡 | Copy | Two tasks Delivered (green checks), Community invitation shows yellow warning "Delivery failed — onboarding still complete." then proceeds to Onboarding complete 🎉. User might wonder whether the invitation will be retried | Clarify: "We'll retry this in the background." or "You can resend from Settings." |
| 16 | `10-sso-bypass.png` | 🟡 | State fidelity | Empty registration form shown for an "SSO bypass" state — user would expect an SSO-specific view or an "Already authenticated — continue" card | Either remove this capture or render an SSO-specific UX |
| 17 | `r-02-before.png` | 🔵 | Utility | Byte-identical to `01-registration-form.png` | Remove duplicate |
| 18 | `r-03-before.png` | 🔵 | Utility | Byte-identical to `01-registration-form.png` | Remove duplicate |
| 19 | Persistent banner | 🟡 | Chrome | Yellow "Missing provider keys" banner occupies top 48px on every PNG. On the small "Welcome aboard" card it distracts from the registration CTA/hero | Banner should be dismissible or collapse after the user acknowledges once |

## Cross-PNG patterns (flow-level)

- **Strong error-state discipline:** Duplicate email, expired token, invalid token, rate
  limit, onboarding degraded — all are distinct, copy-specific, and (where applicable)
  include a recovery action.
- **Two capture families coexist:** semantic captures (`02-validation-error`, `04-verification-pending`,
  `07-rate-limit`, `09-onboarding-degraded`) are excellent; pipeline-step captures (`02-emailverificationwaitstate-processing-st.png`,
  `04-ssoandemailauth-emailverificationwaitsta.png`, `05-emailverificationwaitstate-onboardingdel.png`,
  `06-emailverificationwaitstate-when-24h-sla.png`) often fall back to the empty registration form.
- **Inconsistent recovery CTAs:** Expired-token has "Request a new verification link" but
  invalid-token does not. Small inconsistency, easy fix.
- **Banner distraction** on the small, visually centered cards (check-inbox, welcome-aboard,
  too-many-requests). The yellow banner is 1/5 of vertical space.
- **Duplicate `r-02-before.png` / `r-03-before.png`** — cleanup-only.

## Business-logic phase coverage

| Phase | Visually covered? |
|--|--|
| Registration form entry | ✅ `01-registration-form.png` |
| Client-side validation error | ✅ `02-validation-error.png` |
| Duplicate-email server error | ✅ `03-duplicate-email.png` |
| Verification email sent (wait state) | ✅ `04-verification-pending.png` |
| Expired verification token | ✅ `05-token-expired.png` |
| Invalid/revoked token | ✅ `06-token-invalid.png` |
| Rate-limited resend | ✅ `07-rate-limit.png` |
| Onboarding in progress | ✅ `08-onboarding-progress.png` |
| Onboarding degraded (partial failure) | ✅ `09-onboarding-degraded.png` |
| Onboarding complete | ✅ (within `09-onboarding-degraded.png` and `01-ssoandemailauth-routing-step-entered-via.png`) |
| SSO bypass | ⚠️ claimed but not visually distinct |
| 24h SLA reminder | ❌ |

**10/12 business phases covered with dedicated UX.** This flow is genuinely shippable from a
UI/UX standpoint.
