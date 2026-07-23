# FLOW-12 QA Run Report — Phase 13

**Flow:** Subscription Billing (`subscription-billing`)
**Classification:** TENANT_FACING
**Status:** READY
**Spec files:** 1 | **Test blocks:** 9 | **Screenshot calls:** 9
**PNGs on disk:** 9 (OK ≥1KB: 9, BLANK <1KB: 0)

## Spec files

- `client/e2e/subscription-billing.spec.ts`

## Snapshots

| # | File | Size (KB) | Visual OK |
|--:|------|----------:|:---------:|
| 1 | `01-subscriptionanalyticsaggregator-data-pip.png` | 47.4 | ✅ |
| 2 | `r-02-after.png` | 39.1 | ✅ |
| 3 | `r-02-before.png` | 37.8 | ✅ |
| 4 | `r-03-after.png` | 40.8 | ✅ |
| 5 | `r-03-before.png` | 37.8 | ✅ |
| 6 | `r-05-after.png` | 33.7 | ✅ |
| 7 | `r-05-before.png` | 32.9 | ✅ |
| 8 | `r-06-after.png` | 32.5 | ✅ |
| 9 | `r-06-before.png` | 32.9 | ✅ |

## Arbiters

- **PNG count match:** 9 PNGs vs 9 screenshot call(s). ✅ match.
- **File size gate:** 0 blank PNG(s) <1KB. ✅ pass.
- **Failure gate:** generator does not execute playwright; actual pass/fail column requires live run. Current verdict is based on existing disk state.
- **Naming convention:** `{NN}-{kebab-state}.png` — inspect `File` column above.

## Execution prompt

```bash
# 1) Start the stack
docker compose up --build -d

# 2) Run playwright for this flow
npx playwright test client/e2e/subscription-billing*.spec.ts --reporter=list

# 3) Verify PNGs
ls -la docs/e2e-snapshots/subscription-billing/
find docs/e2e-snapshots/subscription-billing/ -name '*.png' -size -1k  # expect no output

# 4) Regenerate this report
python scripts/gen-phase13-qa-run-report.py
```
