# FLOW-09 QA Run Report — Phase 13

**Flow:** Transactional Event Participation (`transactional-event-participation`)
**Classification:** TENANT_FACING
**Status:** READY
**Spec files:** 1 | **Test blocks:** 30 | **Screenshot calls:** 32
**PNGs on disk:** 32 (OK ≥1KB: 32, BLANK <1KB: 0)

## Spec files

- `client/e2e/transactional-event-participation.spec.ts`

## Snapshots

| # | File | Size (KB) | Visual OK |
|--:|------|----------:|:---------:|
| 1 | `01-eventparticipationorchestrator-orchestra.png` | 24.3 | ✅ |
| 2 | `01-ticket-purchase-form.png` | 31.5 | ✅ |
| 3 | `02-ticketinventorymanager-data-pipeline-ste.png` | 24.3 | ✅ |
| 4 | `02-waitlist-form.png` | 30.1 | ✅ |
| 5 | `03-booking-pending.png` | 24.8 | ✅ |
| 6 | `03-paymenteligibilitygate-validation-step-e.png` | 24.3 | ✅ |
| 7 | `04-qr-code-display.png` | 24.8 | ✅ |
| 8 | `04-ticketissuer-data-pipeline-step-entered.png` | 24.3 | ✅ |
| 9 | `05-refundorchestrator-orchestration-step-en.png` | 24.3 | ✅ |
| 10 | `05-waitlist-event-input.png` | 30.1 | ✅ |
| 11 | `06-attendancetokenservice-processing-step-e.png` | 24.3 | ✅ |
| 12 | `06-refund-form.png` | 30.7 | ✅ |
| 13 | `07-purchase-form-input.png` | 31.5 | ✅ |
| 14 | `07-tokenredemptionprocessor-processing-step.png` | 24.3 | ✅ |
| 15 | `08-booking-confirmed.png` | 24.3 | ✅ |
| 16 | `08-participationanalytics-observability-ste.png` | 24.3 | ✅ |
| 17 | `09-participationrequested-eventparticipatio.png` | 24.3 | ✅ |
| 18 | `09-waitlist-position.png` | 30.1 | ✅ |
| 19 | `10-eventparticipationorchestrator-ticketinv.png` | 24.3 | ✅ |
| 20 | `10-refund-reason-input.png` | 30.7 | ✅ |
| 21 | `11-eventparticipationorchestrator-participa.png` | 24.3 | ✅ |
| 22 | `12-ticketinventorymanager-paymenteligibilit.png` | 24.3 | ✅ |
| 23 | `13-ticketinventorymanager-soldout-when-capa.png` | 24.3 | ✅ |
| 24 | `14-paymenteligibilitygate-ticketissuer-when.png` | 24.3 | ✅ |
| 25 | `15-paymenteligibilitygate-refundorchestrato.png` | 30.7 | ✅ |
| 26 | `16-ticketissuer-attendancetokenservice-when.png` | 31.5 | ✅ |
| 27 | `17-attendancetokenservice-tokenredemptionpr.png` | 24.3 | ✅ |
| 28 | `18-tokenredemptionprocessor-participationan.png` | 24.3 | ✅ |
| 29 | `19-refundorchestrator-participationanalytic.png` | 30.7 | ✅ |
| 30 | `20-participationanalytics-participationflow.png` | 24.3 | ✅ |
| 31 | `r-07-after.png` | 31.5 | ✅ |
| 32 | `r-10-after.png` | 31.8 | ✅ |

## Arbiters

- **PNG count match:** 32 PNGs vs 32 screenshot call(s). ✅ match.
- **File size gate:** 0 blank PNG(s) <1KB. ✅ pass.
- **Failure gate:** generator does not execute playwright; actual pass/fail column requires live run. Current verdict is based on existing disk state.
- **Naming convention:** `{NN}-{kebab-state}.png` — inspect `File` column above.

## Execution prompt

```bash
# 1) Start the stack
docker compose up --build -d

# 2) Run playwright for this flow
npx playwright test client/e2e/transactional-event-participation*.spec.ts --reporter=list

# 3) Verify PNGs
ls -la docs/e2e-snapshots/transactional-event-participation/
find docs/e2e-snapshots/transactional-event-participation/ -name '*.png' -size -1k  # expect no output

# 4) Regenerate this report
python scripts/gen-phase13-qa-run-report.py
```
