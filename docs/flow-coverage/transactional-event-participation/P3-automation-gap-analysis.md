# FLOW-09 UI Automation Gap Analysis — Phase 3 Deliverable

**Flow:** Transactional Event Participation (`transactional-event-participation`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED

## Spec Files Found (both directories searched)

| Path | Lines | Size (B) | Role |
|------|------:|---------:|------|
| `client/e2e/transactional-event-participation.spec.ts` | 234 | 9412 | AUTHORITATIVE |

| # | Business State | P2 Verdict | Automation | Spec File | Test | Line |
|---|---------------|------------|-----------|-----------|------|------|
| 1 | EventParticipationOrchestrator — orchestration step entered via `POST /events/:id/participate (calls… | COVERED | PARTIAL | `transactional-event-participation.spec.ts` | R-05: WaitlistPage form has event-id-input field | 119 |
| 2 | TicketInventoryManager — data_pipeline step entered via `ParticipationRequested event (atomic capaci… | COVERED | NOT_TESTED | `transactional-event-participation.spec.ts` | — | — |
| 3 | PaymentEligibilityGate — validation step entered via `InventoryReserved event` | COVERED | NOT_TESTED | `transactional-event-participation.spec.ts` | — | — |
| 4 | TicketIssuer — data_pipeline step entered via `PaymentCleared event` | COVERED | NOT_TESTED | `transactional-event-participation.spec.ts` | — | — |
| 5 | RefundOrchestrator — orchestration step entered via `RefundRequested event (compensating txn)` | COVERED | NOT_TESTED | `transactional-event-participation.spec.ts` | — | — |
| 6 | AttendanceTokenService — processing step entered via `TicketIssued event (QR token, 60s TTL)` | COVERED | PARTIAL | `transactional-event-participation.spec.ts` | R-04: QRCodePage renders QR display area | 100 |
| 7 | TokenRedemptionProcessor — processing step entered via `TokenRedemptionRequested event (at check-in)… | COVERED | NOT_TESTED | `transactional-event-participation.spec.ts` | — | — |
| 8 | ParticipationAnalytics — observability step entered via `Aggregate participation metrics (TTL-window… | COVERED | NOT_TESTED | `transactional-event-participation.spec.ts` | — | — |
| 9 | ParticipationRequested → EventParticipationOrchestrator when `` (emits `xiigen.transactional-event.p… | COVERED | NOT_TESTED | `transactional-event-participation.spec.ts` | — | — |
| 10 | EventParticipationOrchestrator → TicketInventoryManager when `inline T113 passed` (emits `xiigen.tra… | COVERED | NOT_TESTED | `transactional-event-participation.spec.ts` | — | — |
| 11 | EventParticipationOrchestrator → ParticipationRejected when `eligibility failed — terminal` (emits `… | COVERED | NOT_TESTED | `transactional-event-participation.spec.ts` | — | — |
| 12 | TicketInventoryManager → PaymentEligibilityGate when `` (emits `xiigen.transactional-event.inventory… | COVERED | NOT_TESTED | `transactional-event-participation.spec.ts` | — | — |
| 13 | TicketInventoryManager → SoldOut when `capacity=0 — terminal` (emits `xiigen.transactional-event.inv… | COVERED | NOT_TESTED | `transactional-event-participation.spec.ts` | — | — |
| 14 | PaymentEligibilityGate → TicketIssuer when `` (emits `xiigen.transactional-event.payment-cleared.v1`… | COVERED | NOT_TESTED | `transactional-event-participation.spec.ts` | — | — |
| 15 | PaymentEligibilityGate → RefundOrchestrator when `payment declined → compensating refund` (emits `xi… | COVERED | PARTIAL | `transactional-event-participation.spec.ts` | R-06: RefundPage renders refund request form | 136 |
| 16 | TicketIssuer → AttendanceTokenService when `` (emits `xiigen.transactional-event.ticket-issued.v1`) | COVERED | NOT_TESTED | `transactional-event-participation.spec.ts` | — | — |
| 17 | AttendanceTokenService → TokenRedemptionProcessor when `` (emits `xiigen.transactional-event.token-i… | COVERED | NOT_TESTED | `transactional-event-participation.spec.ts` | — | — |
| 18 | TokenRedemptionProcessor → ParticipationAnalytics when `` (emits `xiigen.transactional-event.token-r… | COVERED | NOT_TESTED | `transactional-event-participation.spec.ts` | — | — |
| 19 | RefundOrchestrator → ParticipationAnalytics when `` (emits `xiigen.transactional-event.refund-proces… | COVERED | PARTIAL | `transactional-event-participation.spec.ts` | R-06: RefundPage renders refund request form | 136 |
| 20 | ParticipationAnalytics → ParticipationFlowComplete when `terminal` (emits `xiigen.transactional-even… | COVERED | NOT_TESTED | `transactional-event-participation.spec.ts` | — | — |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery:** row count = 20 (= P1 item count). PASS
- **Arbiter 2 — Both Directories Searched:** PASS — both `client/e2e/` AND `e2e/tests/` traversed; results listed in Spec Files section above.
- **Arbiter 3 — Test String Truthfulness:** PASS — TESTED/PARTIAL verdicts cite exact test/describe string with line number from the authoritative spec file.
- **Arbiter 4 — Duplicate Flagging:** N/A — 0 duplicate(s) flagged for Phase 12 consolidation.
