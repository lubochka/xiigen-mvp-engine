# FLOW-09 Business Logic Inventory — Phase 1 Deliverable

**Flow:** Transactional Event Participation (`transactional-event-participation`)
**Classification:** TENANT_FACING
**Source:** TOPOLOGY
**Source document:** `contracts/topologies/transactional-event-participation.topology.json`

**Topology shape:** 8 nodes, 12 edges. Minimum inventory items: 20.

## Business States & Transitions

1. EventParticipationOrchestrator — orchestration step entered via `POST /events/:id/participate (calls T113 EligibilityCompositeChecker inline)`
2. TicketInventoryManager — data_pipeline step entered via `ParticipationRequested event (atomic capacity decrement)`
3. PaymentEligibilityGate — validation step entered via `InventoryReserved event`
4. TicketIssuer — data_pipeline step entered via `PaymentCleared event`
5. RefundOrchestrator — orchestration step entered via `RefundRequested event (compensating txn)`
6. AttendanceTokenService — processing step entered via `TicketIssued event (QR token, 60s TTL)`
7. TokenRedemptionProcessor — processing step entered via `TokenRedemptionRequested event (at check-in)`
8. ParticipationAnalytics — observability step entered via `Aggregate participation metrics (TTL-windowed)`
9. ParticipationRequested → EventParticipationOrchestrator when `` (emits `xiigen.transactional-event.participation-requested.v1`)
10. EventParticipationOrchestrator → TicketInventoryManager when `inline T113 passed` (emits `xiigen.transactional-event.eligibility-passed.v1`)
11. EventParticipationOrchestrator → ParticipationRejected when `eligibility failed — terminal` (emits `xiigen.transactional-event.eligibility-failed.v1`) [TERMINAL]
12. TicketInventoryManager → PaymentEligibilityGate when `` (emits `xiigen.transactional-event.inventory-reserved.v1`)
13. TicketInventoryManager → SoldOut when `capacity=0 — terminal` (emits `xiigen.transactional-event.inventory-exhausted.v1`) [TERMINAL]
14. PaymentEligibilityGate → TicketIssuer when `` (emits `xiigen.transactional-event.payment-cleared.v1`)
15. PaymentEligibilityGate → RefundOrchestrator when `payment declined → compensating refund` (emits `xiigen.transactional-event.payment-failed.v1`)
16. TicketIssuer → AttendanceTokenService when `` (emits `xiigen.transactional-event.ticket-issued.v1`)
17. AttendanceTokenService → TokenRedemptionProcessor when `` (emits `xiigen.transactional-event.token-issued.v1`)
18. TokenRedemptionProcessor → ParticipationAnalytics when `` (emits `xiigen.transactional-event.token-redeemed.v1`)
19. RefundOrchestrator → ParticipationAnalytics when `` (emits `xiigen.transactional-event.refund-processed.v1`)
20. ParticipationAnalytics → ParticipationFlowComplete when `terminal` (emits `xiigen.transactional-event.analytics-recorded.v1`) [TERMINAL]

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery (edge+node formula: 12+8=20):** PASS — 20 items produced.
- **Arbiter 2 — Scope Isolation:** PASS — state descriptions reference nodes/events; no TypeScript types, no file paths, no class names.
- **Arbiter 3 — Terminal State Coverage:** PASS — terminal-labeled edges (condition contains 'terminal') appear as `[TERMINAL]` entries.
- **Arbiter 4 — Iron Rule Labels:** DEFERRED — CF-XX labels require cross-reference with `server/src/engine-contracts/{slug}-bfa-rules.ts`; applied in Phase 9 (edge case discovery) where iron rules directly govern edge cases.
- **Arbiter 5 — Branch Honest Flagging:** PASS (Branch A — no flag required).
