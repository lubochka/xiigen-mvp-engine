# FLOW-09 UI Spec — Phase 5 Deliverable

**Flow:** Transactional Event Participation (`transactional-event-participation`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `BookingConfirmationPage.tsx` | `/transactional-event-participation/booking-confirmation` | `booking-confirmation-page`, `booking-error`, `booking-id`, `booking-status`, `loading`, `pending-message` +2 |
| `QRCodePage.tsx` | `/transactional-event-participation/q-r-code` | `loading`, `qr-code-display`, `qr-code-page`, `qr-error`, `ticket-id` |
| `RefundPage.tsx` | `/transactional-event-participation/refund` | `purchase-id-input`, `reason-input`, `refund-error-state`, `refund-ineligible-state`, `refund-initiated-state`, `refund-page` +2 |
| `TicketPurchasePage.tsx` | `/transactional-event-participation/ticket-purchase` | `confirmed-state`, `error-state`, `event-id-input`, `payment-pending-state`, `purchase-button`, `reserving-state` +2 |
| `WaitlistPage.tsx` | `/transactional-event-participation/waitlist` | `error-state`, `event-id-input`, `join-waitlist-button`, `joined-state`, `joining-state`, `waitlist-page` +1 |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | EventParticipationOrchestrator — orchestration step entered via `POST /events/:id/particip… | `BookingConfirmationPage.tsx` | `page-bookingconfirmation` |
| 2 | TicketInventoryManager — data_pipeline step entered via `ParticipationRequested event (ato… | `BookingConfirmationPage.tsx` | `page-bookingconfirmation` |
| 3 | PaymentEligibilityGate — validation step entered via `InventoryReserved event` | `BookingConfirmationPage.tsx` | `page-bookingconfirmation` |
| 4 | TicketIssuer — data_pipeline step entered via `PaymentCleared event` | `BookingConfirmationPage.tsx` | `page-bookingconfirmation` |
| 5 | RefundOrchestrator — orchestration step entered via `RefundRequested event (compensating t… | `BookingConfirmationPage.tsx` | `page-bookingconfirmation` |
| 6 | AttendanceTokenService — processing step entered via `TicketIssued event (QR token, 60s TT… | `BookingConfirmationPage.tsx` | `page-bookingconfirmation` |
| 7 | TokenRedemptionProcessor — processing step entered via `TokenRedemptionRequested event (at… | `BookingConfirmationPage.tsx` | `page-bookingconfirmation` |
| 8 | ParticipationAnalytics — observability step entered via `Aggregate participation metrics (… | `BookingConfirmationPage.tsx` | `page-bookingconfirmation` |
| 9 | ParticipationRequested → EventParticipationOrchestrator when `` (emits `xiigen.transaction… | `BookingConfirmationPage.tsx` | `page-bookingconfirmation` |
| 10 | EventParticipationOrchestrator → TicketInventoryManager when `inline T113 passed` (emits `… | `BookingConfirmationPage.tsx` | `page-bookingconfirmation` |
| 11 | EventParticipationOrchestrator → ParticipationRejected when `eligibility failed — terminal… | `BookingConfirmationPage.tsx` | `page-bookingconfirmation` |
| 12 | TicketInventoryManager → PaymentEligibilityGate when `` (emits `xiigen.transactional-event… | `BookingConfirmationPage.tsx` | `page-bookingconfirmation` |
| 13 | TicketInventoryManager → SoldOut when `capacity=0 — terminal` (emits `xiigen.transactional… | `BookingConfirmationPage.tsx` | `page-bookingconfirmation` |
| 14 | PaymentEligibilityGate → TicketIssuer when `` (emits `xiigen.transactional-event.payment-c… | `BookingConfirmationPage.tsx` | `page-bookingconfirmation` |
| 15 | PaymentEligibilityGate → RefundOrchestrator when `payment declined → compensating refund` … | `RefundPage.tsx` | `page-refund` |
| 16 | TicketIssuer → AttendanceTokenService when `` (emits `xiigen.transactional-event.ticket-is… | `TicketPurchasePage.tsx` | `page-ticketpurchase` |
| 17 | AttendanceTokenService → TokenRedemptionProcessor when `` (emits `xiigen.transactional-eve… | `BookingConfirmationPage.tsx` | `page-bookingconfirmation` |
| 18 | TokenRedemptionProcessor → ParticipationAnalytics when `` (emits `xiigen.transactional-eve… | `BookingConfirmationPage.tsx` | `page-bookingconfirmation` |
| 19 | RefundOrchestrator → ParticipationAnalytics when `` (emits `xiigen.transactional-event.ref… | `RefundPage.tsx` | `page-refund` |
| 20 | ParticipationAnalytics → ParticipationFlowComplete when `terminal` (emits `xiigen.transact… | `BookingConfirmationPage.tsx` | `page-bookingconfirmation` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 20 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
