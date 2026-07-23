# FLOW-11 QA Run Report — Phase 13

**Flow:** Schema Registry DAG (`schema-registry-dag`)
**Classification:** ADMIN_FACING
**Status:** READY
**Spec files:** 1 | **Test blocks:** 14 | **Screenshot calls:** 14
**PNGs on disk:** 14 (OK ≥1KB: 14, BLANK <1KB: 0)

## Spec files

- `client/e2e/schema-registry-dag.spec.ts`

## Snapshots

| # | File | Size (KB) | Visual OK |
|--:|------|----------:|:---------:|
| 1 | `01-schemaregistrationgateway-transaction-st.png` | 31.6 | ✅ |
| 2 | `02-schemaversionmanager-validation-step-ent.png` | 31.6 | ✅ |
| 3 | `03-dagcycledetector-validation-step-entered.png` | 32.1 | ✅ |
| 4 | `04-schemacompatibilitychecker-validation-st.png` | 31.6 | ✅ |
| 5 | `05-schemapublisher-transaction-step-entered.png` | 31.6 | ✅ |
| 6 | `06-dagtopologybuilder-data-pipeline-step-en.png` | 31.6 | ✅ |
| 7 | `r-03-after.png` | 35.7 | ✅ |
| 8 | `r-03-before.png` | 32.1 | ✅ |
| 9 | `r-06-after.png` | 38.8 | ✅ |
| 10 | `r-06-before.png` | 37.7 | ✅ |
| 11 | `r-07-after.png` | 34.2 | ✅ |
| 12 | `r-07-before.png` | 37.7 | ✅ |
| 13 | `r-08-after.png` | 35.7 | ✅ |
| 14 | `r-08-before.png` | 31.6 | ✅ |

## Arbiters

- **PNG count match:** 14 PNGs vs 14 screenshot call(s). ✅ match.
- **File size gate:** 0 blank PNG(s) <1KB. ✅ pass.
- **Failure gate:** generator does not execute playwright; actual pass/fail column requires live run. Current verdict is based on existing disk state.
- **Naming convention:** `{NN}-{kebab-state}.png` — inspect `File` column above.

## Execution prompt

```bash
# 1) Start the stack
docker compose up --build -d

# 2) Run playwright for this flow
npx playwright test client/e2e/schema-registry-dag*.spec.ts --reporter=list

# 3) Verify PNGs
ls -la docs/e2e-snapshots/schema-registry-dag/
find docs/e2e-snapshots/schema-registry-dag/ -name '*.png' -size -1k  # expect no output

# 4) Regenerate this report
python scripts/gen-phase13-qa-run-report.py
```
