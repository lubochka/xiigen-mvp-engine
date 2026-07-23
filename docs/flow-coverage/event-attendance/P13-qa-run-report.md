# FLOW-04 QA Run Report — Phase 13

**Flow:** Event Attendance (`event-attendance`)
**Classification:** TENANT_FACING
**Status:** PARTIAL
**Spec files:** 3 | **Test blocks:** 58 | **Screenshot calls:** 33
**PNGs on disk:** 31 (OK ≥1KB: 31, BLANK <1KB: 0)

## Spec files

- `client/e2e/event-attendance-registration.spec.ts`
- `client/e2e/event-attendance.spec.ts`
- `client/e2e/event-management-event-attendance-teaching-pipeline.spec.ts`

## Snapshots

| # | File | Size (KB) | Visual OK |
|--:|------|----------:|:---------:|
| 1 | `01-n1-processing-step-entered-via-system-in.png` | 43.6 | ✅ |
| 2 | `01-rsvp-form.png` | 35.6 | ✅ |
| 3 | `02-n2-processing-step-entered-via-system-in.png` | 43.6 | ✅ |
| 4 | `02-rsvp-validation-error.png` | 37.7 | ✅ |
| 5 | `03-n3-processing-step-entered-via-system-in.png` | 43.6 | ✅ |
| 6 | `03-rsvp-confirmed.png` | 30.1 | ✅ |
| 7 | `03b-rsvp-cancelled.png` | 29.8 | ✅ |
| 8 | `04-n4-processing-step-entered-via-system-in.png` | 43.6 | ✅ |
| 9 | `04-rsvp-waitlisted.png` | 32.9 | ✅ |
| 10 | `05-n5-processing-step-entered-via-system-in.png` | 43.6 | ✅ |
| 11 | `05-rsvp-duplicate.png` | 31.3 | ✅ |
| 12 | `06-n1-n2-when-emits.png` | 43.6 | ✅ |
| 13 | `06-rsvp-window-closed.png` | 30.5 | ✅ |
| 14 | `07-n2-n3-when-emits.png` | 43.6 | ✅ |
| 15 | `07-rsvp-error.png` | 29.6 | ✅ |
| 16 | `08-cancel-confirm-dialog.png` | 33.9 | ✅ |
| 17 | `08-n3-n4-when-emits.png` | 43.6 | ✅ |
| 18 | `09-n4-n5-when-emits.png` | 43.6 | ✅ |
| 19 | `09-rsvp-submitted.png` | 31.5 | ✅ |
| 20 | `10-attendance-dashboard.png` | 43.6 | ✅ |
| 21 | `11-attendance-empty.png` | 30.8 | ✅ |
| 22 | `12-attendance-error.png` | 28.6 | ✅ |
| 23 | `13-checkin-kiosk.png` | 30.2 | ✅ |
| 24 | `14-checkin-success.png` | 31.4 | ✅ |
| 25 | `15-checkin-not-found.png` | 31.9 | ✅ |
| 26 | `16-feedback-window.png` | 35.6 | ✅ |
| 27 | `at-02-before.png` | 35.6 | ✅ |
| 28 | `at-08-before.png` | 30.1 | ✅ |
| 29 | `at-09-before.png` | 35.6 | ✅ |
| 30 | `at-14-before.png` | 30.2 | ✅ |
| 31 | `at-15-before.png` | 30.2 | ✅ |

## Arbiters

- **PNG count match:** 31 PNGs vs 33 screenshot call(s). ❌ missing 2 PNG(s).
- **File size gate:** 0 blank PNG(s) <1KB. ✅ pass.
- **Failure gate:** generator does not execute playwright; actual pass/fail column requires live run. Current verdict is based on existing disk state.
- **Naming convention:** `{NN}-{kebab-state}.png` — inspect `File` column above.

## Execution prompt

```bash
# 1) Start the stack
docker compose up --build -d

# 2) Run playwright for this flow
npx playwright test client/e2e/event-attendance*.spec.ts --reporter=list

# 3) Verify PNGs
ls -la docs/e2e-snapshots/event-attendance/
find docs/e2e-snapshots/event-attendance/ -name '*.png' -size -1k  # expect no output

# 4) Regenerate this report
python scripts/gen-phase13-qa-run-report.py
```
