# FLOW-01 QA Run Report — Phase 13

**Flow:** User Registration and Onboarding (`user-registration`)
**Classification:** TENANT_FACING
**Status:** READY
**Spec files:** 1 | **Test blocks:** 16 | **Screenshot calls:** 18
**PNGs on disk:** 18 (OK ≥1KB: 18, BLANK <1KB: 0)

## Spec files

- `client/e2e/user-registration.spec.ts`

## Snapshots

| # | File | Size (KB) | Visual OK |
|--:|------|----------:|:---------:|
| 1 | `01-registration-form.png` | 33.8 | ✅ |
| 2 | `01-ssoandemailauth-routing-step-entered-via.png` | 36.6 | ✅ |
| 3 | `02-emailverificationwaitstate-processing-st.png` | 36.6 | ✅ |
| 4 | `02-validation-error.png` | 34.7 | ✅ |
| 5 | `03-duplicate-email.png` | 34.3 | ✅ |
| 6 | `03-onboardingdelivery-orchestration-step-en.png` | 36.6 | ✅ |
| 7 | `04-ssoandemailauth-emailverificationwaitsta.png` | 33.8 | ✅ |
| 8 | `04-verification-pending.png` | 35.8 | ✅ |
| 9 | `05-emailverificationwaitstate-onboardingdel.png` | 33.8 | ✅ |
| 10 | `05-token-expired.png` | 29.8 | ✅ |
| 11 | `06-emailverificationwaitstate-when-24h-sla.png` | 33.8 | ✅ |
| 12 | `06-token-invalid.png` | 28.9 | ✅ |
| 13 | `07-rate-limit.png` | 33.1 | ✅ |
| 14 | `08-onboarding-progress.png` | 39.1 | ✅ |
| 15 | `09-onboarding-degraded.png` | 40.0 | ✅ |
| 16 | `10-sso-bypass.png` | 41.2 | ✅ |
| 17 | `r-02-before.png` | 33.8 | ✅ |
| 18 | `r-03-before.png` | 33.8 | ✅ |

## Arbiters

- **PNG count match:** 18 PNGs vs 18 screenshot call(s). ✅ match.
- **File size gate:** 0 blank PNG(s) <1KB. ✅ pass.
- **Failure gate:** generator does not execute playwright; actual pass/fail column requires live run. Current verdict is based on existing disk state.
- **Naming convention:** `{NN}-{kebab-state}.png` — inspect `File` column above.

## Execution prompt

```bash
# 1) Start the stack
docker compose up --build -d

# 2) Run playwright for this flow
npx playwright test client/e2e/user-registration*.spec.ts --reporter=list

# 3) Verify PNGs
ls -la docs/e2e-snapshots/user-registration/
find docs/e2e-snapshots/user-registration/ -name '*.png' -size -1k  # expect no output

# 4) Regenerate this report
python scripts/gen-phase13-qa-run-report.py
```
