# FLOW-46 QA Run Report — Phase 13

**Flow:** Platform Agent (`platform-agent`)
**Classification:** ADMIN_FACING
**Status:** PARTIAL
**Spec files:** 4 | **Test blocks:** 29 | **Screenshot calls:** 29
**PNGs on disk:** 27 (OK ≥1KB: 27, BLANK <1KB: 0)

## Spec files

- `client/e2e/platform-agent-crud.spec.ts`
- `client/e2e/platform-agent-mock-states.spec.ts`
- `client/e2e/platform-agent-teaching-pipeline.spec.ts`
- `client/e2e/platform-agent.spec.ts`

## Snapshots

| # | File | Size (KB) | Visual OK |
|--:|------|----------:|:---------:|
| 1 | `01-platformcontextenricher-data-pipeline-st.png` | 43.3 | ✅ |
| 2 | `02-patterncontributor-data-pipeline-step-en.png` | 43.3 | ✅ |
| 3 | `c-03-before.png` | 43.3 | ✅ |
| 4 | `crud-after-create.png` | 43.3 | ✅ |
| 5 | `crud-initial-load.png` | 43.3 | ✅ |
| 6 | `crud-list-with-test-row.png` | 46.3 | ✅ |
| 7 | `default.png` | 46.3 | ✅ |
| 8 | `state-1-agentrunorchestrator-orchestration.png` | 32.1 | ✅ |
| 9 | `state-10-agentrunorchestrator-platformcontextenricher.png` | 32.8 | ✅ |
| 10 | `state-11-agentrunorchestrator-superjudgearbiter.png` | 32.5 | ✅ |
| 11 | `state-12-agentrunorchestrator-agentactionpublisher.png` | 32.8 | ✅ |
| 12 | `state-13-agentrunorchestrator-patterncontributor.png` | 32.6 | ✅ |
| 13 | `state-14-agentactionpublisher-agentactionrecorded.png` | 33.3 | ✅ |
| 14 | `state-15-patterncontributor-contributionwritten.png` | 32.4 | ✅ |
| 15 | `state-16-patterncontributor-consentrequested.png` | 32.4 | ✅ |
| 16 | `state-17-agentrunorchestrator-agentsessioncompleted.png` | 33.5 | ✅ |
| 17 | `state-18-agentchatclient-agentrunorchestrator.png` | 32.8 | ✅ |
| 18 | `state-19-confirmationevent-promotedraft.png` | 32.3 | ✅ |
| 19 | `state-2-tenantscopegateway-governance.png` | 32.6 | ✅ |
| 20 | `state-20-rollbackevent-deletedraft.png` | 32.2 | ✅ |
| 21 | `state-3-platformcontextenricher-data.png` | 32.3 | ✅ |
| 22 | `state-4-superjudgearbiter-validation.png` | 32.1 | ✅ |
| 23 | `state-5-agentactionpublisher-transaction.png` | 32.2 | ✅ |
| 24 | `state-6-patterncontributor-data.png` | 32.1 | ✅ |
| 25 | `state-7-agentchatclient-routing.png` | 31.9 | ✅ |
| 26 | `state-8-agentrunrequested-agentrunorchestrator.png` | 33.5 | ✅ |
| 27 | `state-9-agentrunorchestrator-tenantscopegateway.png` | 32.8 | ✅ |

## Arbiters

- **PNG count match:** 27 PNGs vs 29 screenshot call(s). ❌ missing 2 PNG(s).
- **File size gate:** 0 blank PNG(s) <1KB. ✅ pass.
- **Failure gate:** generator does not execute playwright; actual pass/fail column requires live run. Current verdict is based on existing disk state.
- **Naming convention:** `{NN}-{kebab-state}.png` — inspect `File` column above.

## Execution prompt

```bash
# 1) Start the stack
docker compose up --build -d

# 2) Run playwright for this flow
npx playwright test client/e2e/platform-agent*.spec.ts --reporter=list

# 3) Verify PNGs
ls -la docs/e2e-snapshots/platform-agent/
find docs/e2e-snapshots/platform-agent/ -name '*.png' -size -1k  # expect no output

# 4) Regenerate this report
python scripts/gen-phase13-qa-run-report.py
```
