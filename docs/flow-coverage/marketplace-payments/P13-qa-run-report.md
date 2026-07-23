# FLOW-16 QA Run Report — Phase 13

**Flow:** Marketplace Payments (`marketplace-payments`)
**Classification:** TENANT_FACING
**Status:** READY
**Spec files:** 1 | **Test blocks:** 6 | **Screenshot calls:** 6
**PNGs on disk:** 6 (OK ≥1KB: 6, BLANK <1KB: 0)

## Spec files

- `client/e2e/marketplace-payments.spec.ts`

## Snapshots

| # | File | Size (KB) | Visual OK |
|--:|------|----------:|:---------:|
| 1 | `01-every-task-type-in-t241-t268-has-at-leas.png` | 28.5 | ✅ |
| 2 | `02-every-plan-step-is-scoped-to-a-single-re.png` | 28.5 | ✅ |
| 3 | `03-no-step-imports-provider-sdks-directly-f.png` | 28.5 | ✅ |
| 4 | `04-no-step-creates-entity-specific-controll.png` | 28.5 | ✅ |
| 5 | `05-all-steps-return-dataprocessresult-t.png` | 28.5 | ✅ |
| 6 | `06-focus-areas-covered-ep-5-outbox-dna-9-id.png` | 28.5 | ✅ |

## Arbiters

- **PNG count match:** 6 PNGs vs 6 screenshot call(s). ✅ match.
- **File size gate:** 0 blank PNG(s) <1KB. ✅ pass.
- **Failure gate:** generator does not execute playwright; actual pass/fail column requires live run. Current verdict is based on existing disk state.
- **Naming convention:** `{NN}-{kebab-state}.png` — inspect `File` column above.

## Execution prompt

```bash
# 1) Start the stack
docker compose up --build -d

# 2) Run playwright for this flow
npx playwright test client/e2e/marketplace-payments*.spec.ts --reporter=list

# 3) Verify PNGs
ls -la docs/e2e-snapshots/marketplace-payments/
find docs/e2e-snapshots/marketplace-payments/ -name '*.png' -size -1k  # expect no output

# 4) Regenerate this report
python scripts/gen-phase13-qa-run-report.py
```
