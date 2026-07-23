# FLOW-09 Snapshot Gap Analysis — Phase 4 Deliverable

**Flow:** Transactional Event Participation (`transactional-event-participation`)
**Classification:** TENANT_FACING
**Authoritative spec:** `client\e2e\transactional-event-participation.spec.ts`
**Snapshot dir:** `docs/e2e-snapshots/transactional-event-participation/`
**P3 input rows (TESTED+PARTIAL):** 4

| # | Business State | P3 | Verdict | PNG Evidence |
|---|---------------|-----|---------|--------------|
| 1 | EventParticipationOrchestrator — orchestration step entered via `POST /events/:id/participate (calls… | PARTIAL | SCREENSHOT_CALL_EXISTS | screenshot call(s) present; no matching PNG on disk |
| 2 | AttendanceTokenService — processing step entered via `TicketIssued event (QR token, 60s TTL)` | PARTIAL | SCREENSHOT_CALL_EXISTS | screenshot call for 04-qr-code-display.png; PNG missing on disk |
| 3 | PaymentEligibilityGate → RefundOrchestrator when `payment declined → compensating refund` (emits `xi… | PARTIAL | SCREENSHOT_CALL_EXISTS | screenshot call for 06-refund-form.png; PNG missing on disk |
| 4 | RefundOrchestrator → ParticipationAnalytics when `` (emits `xiigen.transactional-event.refund-proces… | PARTIAL | SCREENSHOT_CALL_EXISTS | screenshot call for 06-refund-form.png; PNG missing on disk |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery:** row count = 4 (= P3 TESTED+PARTIAL count). PASS
- **Arbiter 2 — PNG Truthfulness:** PASS — PNG_EXISTS requires file ≥1024B on disk under `docs/e2e-snapshots/transactional-event-participation/`.
- **Arbiter 3 — Screenshot-call Presence:** PASS — SCREENSHOT_CALL_EXISTS means `page.screenshot()` is present in the test block but PNG missing / < 1KB on disk.
- **Arbiter 4 — Distinction Clarity:** PASS — NO_SCREENSHOT means the test block has no `page.screenshot()` call (separate from SCREENSHOT_CALL_EXISTS).
