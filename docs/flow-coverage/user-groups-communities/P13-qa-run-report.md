# FLOW-06 QA Run Report — Phase 13

**Flow:** User Groups & Communities (`user-groups-communities`)
**Classification:** TENANT_FACING
**Status:** READY
**Spec files:** 1 | **Test blocks:** 11 | **Screenshot calls:** 11
**PNGs on disk:** 23 (OK ≥1KB: 23, BLANK <1KB: 0)

## Spec files

- `client/e2e/user-groups-communities.spec.ts`

## Snapshots

| # | File | Size (KB) | Visual OK |
|--:|------|----------:|:---------:|
| 1 | `01-group-discovery.png` | 34.6 | ✅ |
| 2 | `01-groupmembershipprocessor-orchestration-s.png` | 28.9 | ✅ |
| 3 | `02-membershiptierupdater-data-pipeline-step.png` | 27.8 | ✅ |
| 4 | `02-public-join-confirmed.png` | 30.7 | ✅ |
| 5 | `03-groupfeedpopulator-ai-generation-step-en.png` | 27.8 | ✅ |
| 6 | `03-private-join-pending.png` | 30.2 | ✅ |
| 7 | `04-accesscontrolenforcer-validation-step-en.png` | 28.9 | ✅ |
| 8 | `04-membership-pending.png` | 35.4 | ✅ |
| 9 | `05-admin-approval.png` | 44.6 | ✅ |
| 10 | `05-groupjoinrequested-groupmembershipproces.png` | 28.9 | ✅ |
| 11 | `06-group-feed.png` | 48.3 | ✅ |
| 12 | `06-groupmembershipprocessor-accesscontrolen.png` | 28.9 | ✅ |
| 13 | `07-groupmembershipprocessor-membershiptieru.png` | 28.8 | ✅ |
| 14 | `07-locked-content.png` | 40.5 | ✅ |
| 15 | `08-groupmembershipprocessor-membershiprejec.png` | 28.8 | ✅ |
| 16 | `08-membership-idempotent.png` | 44.0 | ✅ |
| 17 | `09-membershiptierupdater-groupfeedpopulator.png` | 27.8 | ✅ |
| 18 | `09-tier-upgrade.png` | 39.0 | ✅ |
| 19 | `10-groupfeedpopulator-accesscontrolenforcer.png` | 27.1 | ✅ |
| 20 | `10-membership-rejected.png` | 33.7 | ✅ |
| 21 | `11-groupfeedpopulator-groupfeeddelivered-wh.png` | 27.1 | ✅ |
| 22 | `r-02-before.png` | 46.6 | ✅ |
| 23 | `r-03-before.png` | 46.6 | ✅ |

## Arbiters

- **PNG count match:** 23 PNGs vs 11 screenshot call(s). ✅ match.
- **File size gate:** 0 blank PNG(s) <1KB. ✅ pass.
- **Failure gate:** generator does not execute playwright; actual pass/fail column requires live run. Current verdict is based on existing disk state.
- **Naming convention:** `{NN}-{kebab-state}.png` — inspect `File` column above.

## Execution prompt

```bash
# 1) Start the stack
docker compose up --build -d

# 2) Run playwright for this flow
npx playwright test client/e2e/user-groups-communities*.spec.ts --reporter=list

# 3) Verify PNGs
ls -la docs/e2e-snapshots/user-groups-communities/
find docs/e2e-snapshots/user-groups-communities/ -name '*.png' -size -1k  # expect no output

# 4) Regenerate this report
python scripts/gen-phase13-qa-run-report.py
```
