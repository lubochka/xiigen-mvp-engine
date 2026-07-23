# FLOW-25 QA Run Report — Phase 13

**Flow:** BFA Cross-Flow Governance (`bfa-cross-flow-governance`)
**Classification:** ENGINE_INTERNAL
**Status:** READY
**Spec files:** 3 | **Test blocks:** 12 | **Screenshot calls:** 12
**PNGs on disk:** 12 (OK ≥1KB: 12, BLANK <1KB: 0)

## Spec files

- `client/e2e/bfa-cross-flow-governance-crud.spec.ts`
- `client/e2e/bfa-cross-flow-governance-mock-states.spec.ts`
- `client/e2e/bfa-cross-flow-governance.spec.ts`

## Snapshots

| # | File | Size (KB) | Visual OK |
|--:|------|----------:|:---------:|
| 1 | `01-change-intake-parse-001-t375-content-add.png` | 45.7 | ✅ |
| 2 | `02-blast-radius-traversal-001-t380-transiti.png` | 45.7 | ✅ |
| 3 | `03-cross-tenant-guard-001-t387-cross-tenant.png` | 45.7 | ✅ |
| 4 | `c-03-before.png` | 45.7 | ✅ |
| 5 | `crud-after-create.png` | 45.7 | ✅ |
| 6 | `crud-initial-load.png` | 45.7 | ✅ |
| 7 | `crud-list-with-test-row.png` | 48.7 | ✅ |
| 8 | `default.png` | 45.7 | ✅ |
| 9 | `state-1-change-intake.png` | 35.9 | ✅ |
| 10 | `state-2-blast-radius.png` | 36.1 | ✅ |
| 11 | `state-3-arbitration-machine.png` | 35.8 | ✅ |
| 12 | `state-4-cross-tenant.png` | 36.0 | ✅ |

## Arbiters

- **PNG count match:** 12 PNGs vs 12 screenshot call(s). ✅ match.
- **File size gate:** 0 blank PNG(s) <1KB. ✅ pass.
- **Failure gate:** generator does not execute playwright; actual pass/fail column requires live run. Current verdict is based on existing disk state.
- **Naming convention:** `{NN}-{kebab-state}.png` — inspect `File` column above.

## Execution prompt

```bash
# 1) Start the stack
docker compose up --build -d

# 2) Run playwright for this flow
npx playwright test client/e2e/bfa-cross-flow-governance*.spec.ts --reporter=list

# 3) Verify PNGs
ls -la docs/e2e-snapshots/bfa-cross-flow-governance/
find docs/e2e-snapshots/bfa-cross-flow-governance/ -name '*.png' -size -1k  # expect no output

# 4) Regenerate this report
python scripts/gen-phase13-qa-run-report.py
```
