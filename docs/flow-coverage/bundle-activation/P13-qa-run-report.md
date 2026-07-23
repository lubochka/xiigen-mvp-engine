# FLOW-00 QA Run Report — Phase 13

**Flow:** Bundle Activation (`bundle-activation`)
**Classification:** ENGINE_INTERNAL
**Status:** READY
**Spec files:** 3 | **Test blocks:** 25 | **Screenshot calls:** 25
**PNGs on disk:** 25 (OK ≥1KB: 25, BLANK <1KB: 0)

## Spec files

- `client/e2e/bundle-activation-crud.spec.ts`
- `client/e2e/bundle-activation-mock-states.spec.ts`
- `client/e2e/bundle-activation.spec.ts`

## Snapshots

| # | File | Size (KB) | Visual OK |
|--:|------|----------:|:---------:|
| 1 | `01-bundlevalidator-processing-step-entered.png` | 43.5 | ✅ |
| 2 | `02-bundleactivationorchestrator-processing.png` | 43.5 | ✅ |
| 3 | `03-bundlestatustracker-processing-step-ente.png` | 43.5 | ✅ |
| 4 | `04-bundleactivationrequested-bundlevalidato.png` | 43.5 | ✅ |
| 5 | `05-bundlevalidator-bundleactivationorchestr.png` | 43.5 | ✅ |
| 6 | `06-bundlevalidator-bundlevalidationcomplete.png` | 43.5 | ✅ |
| 7 | `07-bundleactivationorchestrator-bundleactiv.png` | 43.5 | ✅ |
| 8 | `08-flow-lifecycle-regenerated-bundlestatust.png` | 43.5 | ✅ |
| 9 | `09-bundlestatustracker-bundledegraded-when.png` | 43.5 | ✅ |
| 10 | `10-bundlestatustracker-bundlerestored-when.png` | 43.5 | ✅ |
| 11 | `c-03-before.png` | 43.5 | ✅ |
| 12 | `crud-after-create.png` | 43.5 | ✅ |
| 13 | `crud-initial-load.png` | 43.5 | ✅ |
| 14 | `crud-list-with-test-row.png` | 46.8 | ✅ |
| 15 | `default.png` | 43.5 | ✅ |
| 16 | `state-1-bundlevalidator-processing.png` | 32.4 | ✅ |
| 17 | `state-10-bundlestatustracker-bundlerestored.png` | 33.0 | ✅ |
| 18 | `state-2-bundleactivationorchestrator-processing.png` | 33.0 | ✅ |
| 19 | `state-3-bundlestatustracker-processing.png` | 32.5 | ✅ |
| 20 | `state-4-bundleactivationrequested-bundlevalidator.png` | 32.7 | ✅ |
| 21 | `state-5-bundlevalidator-bundleactivationorchestrator.png` | 33.0 | ✅ |
| 22 | `state-6-bundlevalidator-bundlevalidationcompleted.png` | 32.6 | ✅ |
| 23 | `state-7-bundleactivationorchestrator-bundleactivated.png` | 33.1 | ✅ |
| 24 | `state-8-flow-lifecycle.png` | 33.0 | ✅ |
| 25 | `state-9-bundlestatustracker-bundledegraded.png` | 33.0 | ✅ |

## Arbiters

- **PNG count match:** 25 PNGs vs 25 screenshot call(s). ✅ match.
- **File size gate:** 0 blank PNG(s) <1KB. ✅ pass.
- **Failure gate:** generator does not execute playwright; actual pass/fail column requires live run. Current verdict is based on existing disk state.
- **Naming convention:** `{NN}-{kebab-state}.png` — inspect `File` column above.

## Execution prompt

```bash
# 1) Start the stack
docker compose up --build -d

# 2) Run playwright for this flow
npx playwright test client/e2e/bundle-activation*.spec.ts --reporter=list

# 3) Verify PNGs
ls -la docs/e2e-snapshots/bundle-activation/
find docs/e2e-snapshots/bundle-activation/ -name '*.png' -size -1k  # expect no output

# 4) Regenerate this report
python scripts/gen-phase13-qa-run-report.py
```
