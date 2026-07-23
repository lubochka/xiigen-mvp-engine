# FLOW-10 QA Run Report — Phase 13

**Flow:** Reviews & Reputation (`reviews-reputation`)
**Classification:** TENANT_FACING
**Status:** READY
**Spec files:** 1 | **Test blocks:** 14 | **Screenshot calls:** 10
**PNGs on disk:** 10 (OK ≥1KB: 10, BLANK <1KB: 0)

## Spec files

- `client/e2e/reviews-reputation.spec.ts`

## Snapshots

| # | File | Size (KB) | Visual OK |
|--:|------|----------:|:---------:|
| 1 | `01-reviewsubmissiongateway-submission-gatew.png` | 34.1 | ✅ |
| 2 | `02-reviewmoderationengine-moderation-step-e.png` | 43.5 | ✅ |
| 3 | `03-reputationscoreaggregator-aggregation-st.png` | 34.1 | ✅ |
| 4 | `04-reviewresponseorchestrator-orchestration.png` | 34.1 | ✅ |
| 5 | `r-02-after.png` | 33.4 | ✅ |
| 6 | `r-02-before.png` | 31.9 | ✅ |
| 7 | `r-03-after.png` | 33.4 | ✅ |
| 8 | `r-03-before.png` | 31.9 | ✅ |
| 9 | `r-04-after.png` | 31.8 | ✅ |
| 10 | `r-04-before.png` | 31.9 | ✅ |

## Arbiters

- **PNG count match:** 10 PNGs vs 10 screenshot call(s). ✅ match.
- **File size gate:** 0 blank PNG(s) <1KB. ✅ pass.
- **Failure gate:** generator does not execute playwright; actual pass/fail column requires live run. Current verdict is based on existing disk state.
- **Naming convention:** `{NN}-{kebab-state}.png` — inspect `File` column above.

## Execution prompt

```bash
# 1) Start the stack
docker compose up --build -d

# 2) Run playwright for this flow
npx playwright test client/e2e/reviews-reputation*.spec.ts --reporter=list

# 3) Verify PNGs
ls -la docs/e2e-snapshots/reviews-reputation/
find docs/e2e-snapshots/reviews-reputation/ -name '*.png' -size -1k  # expect no output

# 4) Regenerate this report
python scripts/gen-phase13-qa-run-report.py
```
