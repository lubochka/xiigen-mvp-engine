# FLOW-21 QA Run Report — Phase 13

**Flow:** Dynamic Forms & Workflows (`dynamic-forms-workflows`)
**Classification:** TENANT_FACING
**Status:** READY
**Spec files:** 3 | **Test blocks:** 17 | **Screenshot calls:** 17
**PNGs on disk:** 17 (OK ≥1KB: 17, BLANK <1KB: 0)

## Spec files

- `client/e2e/dynamic-forms-workflows-crud.spec.ts`
- `client/e2e/dynamic-forms-workflows-mock-states.spec.ts`
- `client/e2e/dynamic-forms-workflows.spec.ts`

## Snapshots

| # | File | Size (KB) | Visual OK |
|--:|------|----------:|:---------:|
| 1 | `01-every-task-type-in-t307-t340-has-at-leas.png` | 46.0 | ✅ |
| 2 | `02-every-plan-step-is-scoped-to-a-single-re.png` | 46.0 | ✅ |
| 3 | `03-no-step-imports-provider-sdks-directly-f.png` | 46.0 | ✅ |
| 4 | `04-no-step-creates-entity-specific-controll.png` | 46.0 | ✅ |
| 5 | `05-all-steps-return-dataprocessresult-t.png` | 46.0 | ✅ |
| 6 | `06-focus-areas-covered-dynamic-form-engine.png` | 46.0 | ✅ |
| 7 | `c-03-before.png` | 46.0 | ✅ |
| 8 | `crud-after-create.png` | 46.0 | ✅ |
| 9 | `crud-initial-load.png` | 46.0 | ✅ |
| 10 | `crud-list-with-test-row.png` | 49.3 | ✅ |
| 11 | `default.png` | 46.0 | ✅ |
| 12 | `state-1-every-task.png` | 35.1 | ✅ |
| 13 | `state-2-every-plan.png` | 35.6 | ✅ |
| 14 | `state-3-no-step.png` | 35.0 | ✅ |
| 15 | `state-4-no-step-2.png` | 34.4 | ✅ |
| 16 | `state-5-all-steps.png` | 34.3 | ✅ |
| 17 | `state-6-focus-areas.png` | 35.7 | ✅ |

## Arbiters

- **PNG count match:** 17 PNGs vs 17 screenshot call(s). ✅ match.
- **File size gate:** 0 blank PNG(s) <1KB. ✅ pass.
- **Failure gate:** generator does not execute playwright; actual pass/fail column requires live run. Current verdict is based on existing disk state.
- **Naming convention:** `{NN}-{kebab-state}.png` — inspect `File` column above.

## Execution prompt

```bash
# 1) Start the stack
docker compose up --build -d

# 2) Run playwright for this flow
npx playwright test client/e2e/dynamic-forms-workflows*.spec.ts --reporter=list

# 3) Verify PNGs
ls -la docs/e2e-snapshots/dynamic-forms-workflows/
find docs/e2e-snapshots/dynamic-forms-workflows/ -name '*.png' -size -1k  # expect no output

# 4) Regenerate this report
python scripts/gen-phase13-qa-run-report.py
```
