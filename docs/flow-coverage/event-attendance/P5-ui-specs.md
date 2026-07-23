# FLOW-04 UI Spec — Phase 5 Deliverable

**Flow:** Event Attendance (`event-attendance`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `AttendanceDashboardPage.tsx` | `/event-attendance/attendance-dashboard` | `attendance-dashboard`, `attendance-empty`, `attendance-error`, `attendance-event-title`, `checkedin-count`, `checkin-attendee-input` +16 |
| `RsvpPage.tsx` | `/event-attendance/rsvp` | `attendee-id-input`, `cancel-confirm-dialog`, `cancel-rsvp-button`, `confirm-cancel-button`, `dismiss-cancel-button`, `event-id-input` +12 |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | n1 — processing step entered via `system-initialized` | `AttendanceDashboardPage.tsx` | `page-attendancedashboard` |
| 2 | n2 — processing step entered via `system-initialized` | `AttendanceDashboardPage.tsx` | `page-attendancedashboard` |
| 3 | n3 — processing step entered via `system-initialized` | `AttendanceDashboardPage.tsx` | `page-attendancedashboard` |
| 4 | n4 — processing step entered via `system-initialized` | `AttendanceDashboardPage.tsx` | `page-attendancedashboard` |
| 5 | n5 — processing step entered via `system-initialized` | `AttendanceDashboardPage.tsx` | `page-attendancedashboard` |
| 6 | n1 → n2 when `` (emits ``) | `AttendanceDashboardPage.tsx` | `page-attendancedashboard` |
| 7 | n2 → n3 when `` (emits ``) | `AttendanceDashboardPage.tsx` | `page-attendancedashboard` |
| 8 | n3 → n4 when `` (emits ``) | `AttendanceDashboardPage.tsx` | `page-attendancedashboard` |
| 9 | n4 → n5 when `` (emits ``) | `AttendanceDashboardPage.tsx` | `page-attendancedashboard` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 9 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
