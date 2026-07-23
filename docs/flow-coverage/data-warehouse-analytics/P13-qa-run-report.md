# FLOW-13 QA Run Report — Phase 13

**Flow:** Data Warehouse & Analytics (`data-warehouse-analytics`)
**Classification:** ADMIN_FACING
**Status:** READY
**Spec files:** 3 | **Test blocks:** 16 | **Screenshot calls:** 16
**PNGs on disk:** 16 (OK ≥1KB: 16, BLANK <1KB: 0)

## Spec files

- `client/e2e/data-warehouse-analytics-crud.spec.ts`
- `client/e2e/data-warehouse-analytics-mock-states.spec.ts`
- `client/e2e/data-warehouse-analytics.spec.ts`

## Snapshots

| # | File | Size (KB) | Visual OK |
|--:|------|----------:|:---------:|
| 1 | `01-every-task-type-in-t169-t188-has-at-leas.png` | 43.8 | ✅ |
| 2 | `02-every-plan-step-is-scoped-to-a-single-re.png` | 43.8 | ✅ |
| 3 | `03-no-step-imports-provider-sdks-directly-f.png` | 43.8 | ✅ |
| 4 | `04-no-step-creates-entity-specific-controll.png` | 43.8 | ✅ |
| 5 | `05-all-steps-return-dataprocessresult-t.png` | 43.8 | ✅ |
| 6 | `c-03-before.png` | 43.8 | ✅ |
| 7 | `crud-after-create.png` | 43.8 | ✅ |
| 8 | `crud-initial-load.png` | 43.8 | ✅ |
| 9 | `crud-list-with-test-row.png` | 46.9 | ✅ |
| 10 | `default.png` | 43.8 | ✅ |
| 11 | `state-1-every-task.png` | 35.3 | ✅ |
| 12 | `state-2-every-plan.png` | 35.8 | ✅ |
| 13 | `state-3-no-step.png` | 35.2 | ✅ |
| 14 | `state-4-no-step-2.png` | 34.6 | ✅ |
| 15 | `state-5-all-steps.png` | 34.6 | ✅ |
| 16 | `state-6-focus-areas.png` | 36.1 | ✅ |

## Arbiters

- **PNG count match:** 16 PNGs vs 16 screenshot call(s). ✅ match.
- **File size gate:** 0 blank PNG(s) <1KB. ✅ pass.
- **Failure gate:** generator does not execute playwright; actual pass/fail column requires live run. Current verdict is based on existing disk state.
- **Naming convention:** `{NN}-{kebab-state}.png` — inspect `File` column above.

## Execution prompt

```bash
# 1) Start the stack
docker compose up --build -d

# 2) Run playwright for this flow
npx playwright test client/e2e/data-warehouse-analytics*.spec.ts --reporter=list

# 3) Verify PNGs
ls -la docs/e2e-snapshots/data-warehouse-analytics/
find docs/e2e-snapshots/data-warehouse-analytics/ -name '*.png' -size -1k  # expect no output

# 4) Regenerate this report
python scripts/gen-phase13-qa-run-report.py
```
