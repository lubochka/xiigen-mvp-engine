# Flow 04 Event Attendance - Post-Certification UX Follow-Ups

Date: 2026-05-03

Scope: close the non-blocking UX follow-ups recorded during the FLOW-04
mobility/auth certification: Hebrew right-to-left capture, mobile source
screenshots, and RSVP attendee-detail grammar.

## Evidence

| Cell | Evidence | Result |
|---|---|---|
| RSVP mobile details | `docs/e2e-snapshots/event-attendance/post-cert-ux/01-rsvp-mobile-details.png` | passed |
| Attendance Hebrew right-to-left | `docs/e2e-snapshots/event-attendance/post-cert-ux/02-attendance-he-rtl.png` | passed |
| Attendance mobile organiser | `docs/e2e-snapshots/event-attendance/post-cert-ux/03-attendance-mobile-organiser.png` | passed |

## Changes

- RSVP form copy now asks for "Ticket or guest code" and "Event code" instead
  of attendee/event IDs.
- RSVP outcome copy uses sentence-case statuses and human confirmation language.
- Check-in kiosk copy now asks for a guest code.
- Attendance counters, RSVP rows, organiser header, and refund rows stack cleanly
  on mobile.
- FLOW-04 Playwright coverage now asserts Hebrew document direction and no
  horizontal overflow for the new RTL/mobile cells.

## Verification

- `npx tsc --noEmit` from `client`: passed.
- `npx playwright test e2e/event-attendance.spec.ts --grep "AT-ux" --project=chromium-desktop --workers=1`: 3 passed.
- `npx playwright test e2e/event-attendance.spec.ts --project=chromium-desktop --workers=1`: 32 passed, 17 skipped because the local server was not running for server-dependent P1/API blocks.
- `npx tsc --noEmit -p server/tsconfig.json`: passed.
- `npx jest --testPathPatterns=event-attendance --runInBand`: 9 suites / 128 tests passed.
- FLOW-04 throw/service/ClsService portability scan: 0 failure lines.

Background Vite proxy warnings for `/api/tenant/.../key-status` appeared because
the server was not required for these mock-driven UI cells. They did not affect
the tests or screenshots.

## Mandate Check

- Swap test: RSVP, organiser, and policy surfaces remain task-specific.
- Squint test: primary action and current policy are visible on mobile and RTL.
- Signature test: state counters, policy strip, RSVP rows, and check-in status
  remain visible.
- AI-slop test: no gradient text, decorative glow, emoji action icons, or hero
  metric template introduced.
- Token test: no new one-off color system introduced.
- Non-technical reviewer test: event participants see guest/event language
  rather than internal IDs.

Blocked findings: 0.
