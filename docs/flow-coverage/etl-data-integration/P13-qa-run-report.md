# FLOW-14 QA Run Report — Phase 13

**Flow:** ETL Data Integration (`etl-data-integration`)
**Classification:** ADMIN_FACING
**Status:** READY
**Spec files:** 3 | **Test blocks:** 16 | **Screenshot calls:** 16
**PNGs on disk:** 16 (OK ≥1KB: 16, BLANK <1KB: 0)

## Spec files

- `client/e2e/etl-data-integration-crud.spec.ts`
- `client/e2e/etl-data-integration-mock-states.spec.ts`
- `client/e2e/etl-data-integration.spec.ts`

## Snapshots

| # | File | Size (KB) | Visual OK |
|--:|------|----------:|:---------:|
| 1 | `01-every-task-type-in-t189-t200-has-at-leas.png` | 43.2 | ✅ |
| 2 | `02-every-plan-step-is-scoped-to-a-single-re.png` | 43.2 | ✅ |
| 3 | `03-no-step-imports-provider-sdks-directly-f.png` | 43.2 | ✅ |
| 4 | `04-no-step-creates-entity-specific-controll.png` | 43.2 | ✅ |
| 5 | `05-all-steps-return-dataprocessresult-t.png` | 43.2 | ✅ |
| 6 | `c-03-before.png` | 43.2 | ✅ |
| 7 | `crud-after-create.png` | 43.2 | ✅ |
| 8 | `crud-initial-load.png` | 43.2 | ✅ |
| 9 | `crud-list-with-test-row.png` | 46.4 | ✅ |
| 10 | `default.png` | 46.4 | ✅ |
| 11 | `state-1-every-task.png` | 32.6 | ✅ |
| 12 | `state-2-every-plan.png` | 33.1 | ✅ |
| 13 | `state-3-no-step.png` | 32.5 | ✅ |
| 14 | `state-4-no-step-2.png` | 31.9 | ✅ |
| 15 | `state-5-all-steps.png` | 31.8 | ✅ |
| 16 | `state-6-focus-areas.png` | 33.2 | ✅ |

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
npx playwright test client/e2e/etl-data-integration*.spec.ts --reporter=list

# 3) Verify PNGs
ls -la docs/e2e-snapshots/etl-data-integration/
find docs/e2e-snapshots/etl-data-integration/ -name '*.png' -size -1k  # expect no output

# 4) Regenerate this report
python scripts/gen-phase13-qa-run-report.py
```
