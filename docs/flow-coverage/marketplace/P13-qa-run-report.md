# FLOW-08 QA Run Report — Phase 13

**Flow:** Marketplace (`marketplace`)
**Classification:** TENANT_FACING
**Status:** PARTIAL
**Spec files:** 7 | **Test blocks:** 38 | **Screenshot calls:** 38
**PNGs on disk:** 14 (OK ≥1KB: 14, BLANK <1KB: 0)

## Spec files

- `client/e2e/freelancer-marketplace.spec.ts`
- `client/e2e/marketplace-payments.spec.ts`
- `client/e2e/marketplace-plugin-adapter-crud.spec.ts`
- `client/e2e/marketplace-plugin-adapter-mock-states.spec.ts`
- `client/e2e/marketplace.spec.ts`
- `client/e2e/sharable-flows-marketplace-crud.spec.ts`
- `client/e2e/sharable-flows-marketplace-mock-states.spec.ts`

## Snapshots

| # | File | Size (KB) | Visual OK |
|--:|------|----------:|:---------:|
| 1 | `01-listingpublisher-submission-gateway-step.png` | 30.2 | ✅ |
| 2 | `02-listingmoderationengine-moderation-step.png` | 30.2 | ✅ |
| 3 | `03-listingpricevalidator-guard-step-entered.png` | 30.2 | ✅ |
| 4 | `04-catalogindexer-data-pipeline-step-entere.png` | 30.2 | ✅ |
| 5 | `05-listingfeedgenerator-data-pipeline-step.png` | 30.2 | ✅ |
| 6 | `06-listinganalyticsaggregator-analytics-eng.png` | 30.2 | ✅ |
| 7 | `07-listingsaverequested-listingpublisher-wh.png` | 30.2 | ✅ |
| 8 | `08-listingpublisher-listingmoderationengine.png` | 30.2 | ✅ |
| 9 | `09-listingpublisher-listingpricevalidator-w.png` | 30.2 | ✅ |
| 10 | `10-listingpublisher-catalogindexer-when-mod.png` | 30.2 | ✅ |
| 11 | `11-listingpublisher-listingdraftsaved-when.png` | 30.2 | ✅ |
| 12 | `12-catalogindexer-listingfeedgenerator-when.png` | 30.2 | ✅ |
| 13 | `13-listingfeedgenerator-listinganalyticsagg.png` | 30.2 | ✅ |
| 14 | `14-listinganalyticsaggregator-marketplacefl.png` | 30.2 | ✅ |

## Arbiters

- **PNG count match:** 14 PNGs vs 38 screenshot call(s). ❌ missing 24 PNG(s).
- **File size gate:** 0 blank PNG(s) <1KB. ✅ pass.
- **Failure gate:** generator does not execute playwright; actual pass/fail column requires live run. Current verdict is based on existing disk state.
- **Naming convention:** `{NN}-{kebab-state}.png` — inspect `File` column above.

## Execution prompt

```bash
# 1) Start the stack
docker compose up --build -d

# 2) Run playwright for this flow
npx playwright test client/e2e/marketplace*.spec.ts --reporter=list

# 3) Verify PNGs
ls -la docs/e2e-snapshots/marketplace/
find docs/e2e-snapshots/marketplace/ -name '*.png' -size -1k  # expect no output

# 4) Regenerate this report
python scripts/gen-phase13-qa-run-report.py
```
