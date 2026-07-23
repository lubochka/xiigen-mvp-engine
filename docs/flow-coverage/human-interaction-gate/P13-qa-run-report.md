# FLOW-27 QA Run Report — Phase 13

**Flow:** Human Interaction Gate (`human-interaction-gate`)
**Classification:** ENGINE_INTERNAL
**Status:** READY
**Spec files:** 3 | **Test blocks:** 23 | **Screenshot calls:** 23
**PNGs on disk:** 23 (OK ≥1KB: 23, BLANK <1KB: 0)

## Spec files

- `client/e2e/human-interaction-gate-crud.spec.ts`
- `client/e2e/human-interaction-gate-mock-states.spec.ts`
- `client/e2e/human-interaction-gate.spec.ts`

## Snapshots

| # | File | Size (KB) | Visual OK |
|--:|------|----------:|:---------:|
| 1 | `01-dna-1-record-string-unknown-no-typed-mod.png` | 44.0 | ✅ |
| 2 | `02-dna-2-buildsearchfilter-dynamic-queries.png` | 44.0 | ✅ |
| 3 | `03-dna-3-dataprocessresult-t-no-throws-for.png` | 44.0 | ✅ |
| 4 | `04-dna-4-microservicebase-19-inherited-comp.png` | 44.0 | ✅ |
| 5 | `05-dna-5-scope-isolation-via-asynclocalstor.png` | 44.0 | ✅ |
| 6 | `06-dna-6-dynamiccontroller-all-crud-via-api.png` | 42.8 | ✅ |
| 7 | `07-dna-7-idempotency-via-queue-deduplicatio.png` | 42.8 | ✅ |
| 8 | `08-dna-8-outbox-pattern-storedocument-befor.png` | 44.0 | ✅ |
| 9 | `09-dna-9-cloudevents-envelope-for-inter-ser.png` | 44.0 | ✅ |
| 10 | `c-03-before.png` | 44.0 | ✅ |
| 11 | `crud-after-create.png` | 44.0 | ✅ |
| 12 | `crud-initial-load.png` | 44.0 | ✅ |
| 13 | `crud-list-with-test-row.png` | 47.0 | ✅ |
| 14 | `default.png` | 47.0 | ✅ |
| 15 | `state-1-dna-record.png` | 33.1 | ✅ |
| 16 | `state-2-dna-buildsearchfilter.png` | 33.1 | ✅ |
| 17 | `state-3-dna-dataprocessresult.png` | 33.4 | ✅ |
| 18 | `state-4-dna-microservicebase.png` | 33.4 | ✅ |
| 19 | `state-5-dna-scope.png` | 33.2 | ✅ |
| 20 | `state-6-dna-dynamiccontroller.png` | 34.4 | ✅ |
| 21 | `state-7-dna-idempotency.png` | 32.9 | ✅ |
| 22 | `state-8-dna-outbox.png` | 32.1 | ✅ |
| 23 | `state-9-dna-cloudevents.png` | 32.0 | ✅ |

## Arbiters

- **PNG count match:** 23 PNGs vs 23 screenshot call(s). ✅ match.
- **File size gate:** 0 blank PNG(s) <1KB. ✅ pass.
- **Failure gate:** generator does not execute playwright; actual pass/fail column requires live run. Current verdict is based on existing disk state.
- **Naming convention:** `{NN}-{kebab-state}.png` — inspect `File` column above.

## Execution prompt

```bash
# 1) Start the stack
docker compose up --build -d

# 2) Run playwright for this flow
npx playwright test client/e2e/human-interaction-gate*.spec.ts --reporter=list

# 3) Verify PNGs
ls -la docs/e2e-snapshots/human-interaction-gate/
find docs/e2e-snapshots/human-interaction-gate/ -name '*.png' -size -1k  # expect no output

# 4) Regenerate this report
python scripts/gen-phase13-qa-run-report.py
```
