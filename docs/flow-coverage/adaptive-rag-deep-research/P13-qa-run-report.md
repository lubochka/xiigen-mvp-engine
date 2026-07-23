# FLOW-29 QA Run Report — Phase 13

**Flow:** Adaptive RAG / Deep Research (`adaptive-rag-deep-research`)
**Classification:** ENGINE_INTERNAL
**Status:** READY
**Spec files:** 2 | **Test blocks:** 6 | **Screenshot calls:** 6
**PNGs on disk:** 6 (OK ≥1KB: 6, BLANK <1KB: 0)

## Spec files

- `client/e2e/adaptive-rag-deep-research-crud.spec.ts`
- `client/e2e/adaptive-rag-deep-research-mock-states.spec.ts`

## Snapshots

| # | File | Size (KB) | Visual OK |
|--:|------|----------:|:---------:|
| 1 | `c-03-before.png` | 46.0 | ✅ |
| 2 | `crud-after-create.png` | 46.0 | ✅ |
| 3 | `crud-initial-load.png` | 46.0 | ✅ |
| 4 | `crud-list-with-test-row.png` | 49.3 | ✅ |
| 5 | `default.png` | 49.3 | ✅ |
| 6 | `state-1-flow-has.png` | 36.0 | ✅ |

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
npx playwright test client/e2e/adaptive-rag-deep-research*.spec.ts --reporter=list

# 3) Verify PNGs
ls -la docs/e2e-snapshots/adaptive-rag-deep-research/
find docs/e2e-snapshots/adaptive-rag-deep-research/ -name '*.png' -size -1k  # expect no output

# 4) Regenerate this report
python scripts/gen-phase13-qa-run-report.py
```
