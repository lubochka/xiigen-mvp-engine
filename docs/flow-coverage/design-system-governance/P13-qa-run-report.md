# FLOW-37 QA Run Report — Phase 13

**Flow:** Design System Governance (`design-system-governance`)
**Classification:** ENGINE_INTERNAL
**Status:** READY
**Spec files:** 3 | **Test blocks:** 10 | **Screenshot calls:** 10
**PNGs on disk:** 10 (OK ≥1KB: 10, BLANK <1KB: 0)

## Spec files

- `client/e2e/design-system-governance-crud.spec.ts`
- `client/e2e/design-system-governance-mock-states.spec.ts`
- `client/e2e/design-system-governance.spec.ts`

## Snapshots

| # | File | Size (KB) | Visual OK |
|--:|------|----------:|:---------:|
| 1 | `01-hybrid-genesis-prompt-001-stack-aware-ge.png` | 45.4 | ✅ |
| 2 | `02-design-debt-analysis-001-design-complexi.png` | 45.4 | ✅ |
| 3 | `c-03-before.png` | 45.4 | ✅ |
| 4 | `crud-after-create.png` | 45.4 | ✅ |
| 5 | `crud-initial-load.png` | 45.4 | ✅ |
| 6 | `crud-list-with-test-row.png` | 48.4 | ✅ |
| 7 | `default.png` | 45.4 | ✅ |
| 8 | `state-1-design-system.png` | 35.4 | ✅ |
| 9 | `state-2-hybrid-genesis.png` | 35.6 | ✅ |
| 10 | `state-3-design-debt.png` | 35.6 | ✅ |

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
npx playwright test client/e2e/design-system-governance*.spec.ts --reporter=list

# 3) Verify PNGs
ls -la docs/e2e-snapshots/design-system-governance/
find docs/e2e-snapshots/design-system-governance/ -name '*.png' -size -1k  # expect no output

# 4) Regenerate this report
python scripts/gen-phase13-qa-run-report.py
```
