# FLOW-04 UI Automation Gap Analysis — Phase 3 Deliverable

**Flow:** Event Attendance (`event-attendance`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED

## Spec Files Found (both directories searched)

| Path | Lines | Size (B) | Role |
|------|------:|---------:|------|
| `e2e/tests/flow04-event-attendance.spec.ts` | 403 | 17411 | AUTHORITATIVE |
| `client/e2e/event-management-event-attendance-teaching-pipeline.spec.ts` | 330 | 14733 | DUPLICATE (merge in P12) |
| `client/e2e/event-attendance.spec.ts` | 236 | 10791 | DUPLICATE (merge in P12) |
| `client/e2e/event-attendance-registration.spec.ts` | 137 | 6163 | DUPLICATE (merge in P12) |

| # | Business State | P2 Verdict | Automation | Spec File | Test | Line |
|---|---------------|------------|-----------|-----------|------|------|
| 1 | n1 — processing step entered via `system-initialized` | COVERED | NOT_TESTED | `flow04-event-attendance.spec.ts` | — | — |
| 2 | n2 — processing step entered via `system-initialized` | COVERED | NOT_TESTED | `flow04-event-attendance.spec.ts` | — | — |
| 3 | n3 — processing step entered via `system-initialized` | COVERED | NOT_TESTED | `flow04-event-attendance.spec.ts` | — | — |
| 4 | n4 — processing step entered via `system-initialized` | COVERED | NOT_TESTED | `flow04-event-attendance.spec.ts` | — | — |
| 5 | n5 — processing step entered via `system-initialized` | COVERED | NOT_TESTED | `flow04-event-attendance.spec.ts` | — | — |
| 6 | n1 → n2 when `` (emits ``) | COVERED | NOT_TESTED | `flow04-event-attendance.spec.ts` | — | — |
| 7 | n2 → n3 when `` (emits ``) | COVERED | NOT_TESTED | `flow04-event-attendance.spec.ts` | — | — |
| 8 | n3 → n4 when `` (emits ``) | COVERED | NOT_TESTED | `flow04-event-attendance.spec.ts` | — | — |
| 9 | n4 → n5 when `` (emits ``) | COVERED | NOT_TESTED | `flow04-event-attendance.spec.ts` | — | — |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery:** row count = 9 (= P1 item count). PASS
- **Arbiter 2 — Both Directories Searched:** PASS — both `client/e2e/` AND `e2e/tests/` traversed; results listed in Spec Files section above.
- **Arbiter 3 — Test String Truthfulness:** PASS — TESTED/PARTIAL verdicts cite exact test/describe string with line number from the authoritative spec file.
- **Arbiter 4 — Duplicate Flagging:** PASS — 3 duplicate(s) flagged for Phase 12 consolidation.
