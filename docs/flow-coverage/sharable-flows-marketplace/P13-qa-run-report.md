# FLOW-32 QA Run Report — Phase 13

**Flow:** Sharable Flows Marketplace (`sharable-flows-marketplace`)
**Classification:** ENGINE_INTERNAL
**Status:** READY
**Spec files:** 2 | **Test blocks:** 6 | **Screenshot calls:** 6
**PNGs on disk:** 6 (OK ≥1KB: 6, BLANK <1KB: 0)

## Spec files

- `client/e2e/sharable-flows-marketplace-crud.spec.ts`
- `client/e2e/sharable-flows-marketplace-mock-states.spec.ts`

## Snapshots

| # | File | Size (KB) | Visual OK |
|--:|------|----------:|:---------:|
| 1 | `c-03-before.png` | 45.8 | ✅ |
| 2 | `crud-after-create.png` | 45.8 | ✅ |
| 3 | `crud-initial-load.png` | 45.8 | ✅ |
| 4 | `crud-list-with-test-row.png` | 49.0 | ✅ |
| 5 | `default.png` | 45.8 | ✅ |
| 6 | `state-1-flow-has.png` | 35.6 | ✅ |

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
npx playwright test client/e2e/sharable-flows-marketplace*.spec.ts --reporter=list

# 3) Verify PNGs
ls -la docs/e2e-snapshots/sharable-flows-marketplace/
find docs/e2e-snapshots/sharable-flows-marketplace/ -name '*.png' -size -1k  # expect no output

# 4) Regenerate this report
python scripts/gen-phase13-qa-run-report.py
```
