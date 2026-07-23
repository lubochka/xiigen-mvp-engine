# Adaptation Plan - Type A - Event Attendance

Flow: FLOW-04 Event Attendance
Tenant: acme-corp
Adapted module name: event-attendance-acme-onsite-check-in
Version: 1.0.1

## Summary

Acme Corp adapts Event Attendance into an onsite check-in package with a shorter
cancellation period and a shorter post-event feedback window. The source module
remains structurally unchanged: tenant-specific behavior is represented as
flow-scoped configuration values and surfaced in the Acme tenant view.

## Changed Values

| Tenant-facing behavior | Platform value | Acme value | Evidence |
|---|---:|---:|---|
| Attendee cancellation window | 24 hours | 6 hours | Acme organiser view shows the shortened cancellation policy |
| Post-event feedback window | 24 hours | 12 hours | Acme feedback-window state shows feedback open for 12 hours |

## Applied Surface

- `docs/adaptation-surface/adaptation-surface-event-attendance.json`
- `docs/adaptation-surface/tenant-profile-acme-corp-event-attendance.json`
- `client/src/pages/event-attendance/AttendanceDashboardPage.tsx`
- `client/e2e/event-attendance.spec.ts`

## Verification Plan

1. Run the FLOW-04 Playwright source suite with the live Docker server at
   `E2E_API_BASE=http://localhost:33002`.
2. Capture adapted screenshots under
   `docs/e2e-snapshots/event-attendance/tenant-a-v1.0.1/`.
3. Run server TypeScript and scoped FLOW-04 Jest after adaptation.
4. Run client TypeScript.
5. Run the standard portability/auth scans and the repo pre-commit gate before
   committing Phase 4.

## Plain-Language UI Requirement

The rendered UI must not expose configuration key names. It should say:

"Acme onsite attendance policy: cancel up to 6 hours before start; feedback
stays open for 12 hours."

That sentence proves the adapted values are visible to reviewers without showing
engine internals to tenant users.
