# FLOW-07 QA Run Report — Phase 13

**Flow:** Friend Request & Social Feed (`friend-request-social-feed`)
**Classification:** TENANT_FACING
**Status:** READY
**Spec files:** 1 | **Test blocks:** 18 | **Screenshot calls:** 18
**PNGs on disk:** 31 (OK ≥1KB: 31, BLANK <1KB: 0)

## Spec files

- `client/e2e/friend-request-social-feed.spec.ts`

## Snapshots

| # | File | Size (KB) | Visual OK |
|--:|------|----------:|:---------:|
| 1 | `01-friend-request-form.png` | 35.3 | ✅ |
| 2 | `01-friendrequestprocessor-orchestration-ste.png` | 35.3 | ✅ |
| 3 | `02-friend-request-filled.png` | 35.2 | ✅ |
| 4 | `02-friendrequestresponder-orchestration-ste.png` | 33.2 | ✅ |
| 5 | `03-connectiongraphwriter-orchestration-step.png` | 33.2 | ✅ |
| 6 | `03-friend-request-accepted.png` | 35.3 | ✅ |
| 7 | `04-feeditemgenerator-ai-generation-step-ent.png` | 33.2 | ✅ |
| 8 | `04-friend-request-rejected.png` | 35.3 | ✅ |
| 9 | `05-feedscorer-ai-generation-step-entered-vi.png` | 33.2 | ✅ |
| 10 | `05-social-feed.png` | 28.0 | ✅ |
| 11 | `06-feed-zero-score-items.png` | 28.0 | ✅ |
| 12 | `06-feeddeliveryorchestrator-orchestration-s.png` | 33.2 | ✅ |
| 13 | `07-feed-privacy-filtered.png` | 28.0 | ✅ |
| 14 | `07-socialnotificationdispatcher-orchestrati.png` | 33.2 | ✅ |
| 15 | `08-mutual-connections.png` | 33.2 | ✅ |
| 16 | `08-socialgraphanalytics-observability-step.png` | 28.6 | ✅ |
| 17 | `09-connection-strength.png` | 33.2 | ✅ |
| 18 | `09-friendrequestrequested-friendrequestproc.png` | 35.3 | ✅ |
| 19 | `10-friendrequestprocessor-friendrequestresp.png` | 35.3 | ✅ |
| 20 | `10-privacy-settings-feed.png` | 28.0 | ✅ |
| 21 | `11-friendrequestresponder-connectiongraphwr.png` | 35.3 | ✅ |
| 22 | `11-social-graph-tenant-isolated.png` | 28.6 | ✅ |
| 23 | `12-connectiongraphwriter-feeditemgenerator.png` | 35.3 | ✅ |
| 24 | `13-connectiongraphwriter-socialnotification.png` | 34.0 | ✅ |
| 25 | `14-feeditemgenerator-feedscorer-when-emits.png` | 34.0 | ✅ |
| 26 | `15-feedscorer-feeddeliveryorchestrator-when.png` | 35.3 | ✅ |
| 27 | `16-feeddeliveryorchestrator-socialgraphanal.png` | 35.3 | ✅ |
| 28 | `17-socialnotificationdispatcher-socialgraph.png` | 35.3 | ✅ |
| 29 | `18-socialgraphanalytics-socialconnectionsco.png` | 35.3 | ✅ |
| 30 | `r-02-before.png` | 35.3 | ✅ |
| 31 | `r-03-before.png` | 35.3 | ✅ |

## Arbiters

- **PNG count match:** 31 PNGs vs 18 screenshot call(s). ✅ match.
- **File size gate:** 0 blank PNG(s) <1KB. ✅ pass.
- **Failure gate:** generator does not execute playwright; actual pass/fail column requires live run. Current verdict is based on existing disk state.
- **Naming convention:** `{NN}-{kebab-state}.png` — inspect `File` column above.

## Execution prompt

```bash
# 1) Start the stack
docker compose up --build -d

# 2) Run playwright for this flow
npx playwright test client/e2e/friend-request-social-feed*.spec.ts --reporter=list

# 3) Verify PNGs
ls -la docs/e2e-snapshots/friend-request-social-feed/
find docs/e2e-snapshots/friend-request-social-feed/ -name '*.png' -size -1k  # expect no output

# 4) Regenerate this report
python scripts/gen-phase13-qa-run-report.py
```
