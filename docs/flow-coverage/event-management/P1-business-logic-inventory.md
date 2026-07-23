# FLOW-03 Business Logic Inventory — Phase 1 Deliverable

**Flow:** Event Management (`event-management`)
**Classification:** TENANT_FACING
**Source:** TOPOLOGY
**Source document:** `contracts/topologies/event-management.topology.json`

**Topology shape:** 4 nodes, 6 edges. Minimum inventory items: 10.

## Business States & Transitions

1. EventCreationOrchestrator — orchestration step entered via `POST /events (create draft)`
2. EventRegistrationManager — processing step entered via `EventPublished event (atomic capacity ops, null capacity = unlimited)`
3. EventPromotionEngine — processing step entered via `EventPromotionRequested event (content safety check required)`
4. EventAnalyticsTracker — observability step entered via `TTL-windowed counter (views, registrations, conversions)`
5. EventCreationRequested → EventCreationOrchestrator when `` (emits `xiigen.event-management.creation-requested.v1`)
6. EventCreationOrchestrator → EventRegistrationManager when `` (emits `xiigen.event-management.event-published.v1`)
7. EventCreationOrchestrator → EventPromotionEngine when `promotion enabled` (emits `xiigen.event-management.promotion-requested.v1`)
8. EventRegistrationManager → EventAnalyticsTracker when `` (emits `xiigen.event-management.registration-recorded.v1`)
9. EventPromotionEngine → EventAnalyticsTracker when `` (emits `xiigen.event-management.promotion-published.v1`)
10. EventAnalyticsTracker → EventLifecycleComplete when `terminal` (emits `xiigen.event-management.analytics-finalized.v1`) [TERMINAL]

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery (edge+node formula: 6+4=10):** PASS — 10 items produced.
- **Arbiter 2 — Scope Isolation:** PASS — state descriptions reference nodes/events; no TypeScript types, no file paths, no class names.
- **Arbiter 3 — Terminal State Coverage:** PASS — terminal-labeled edges (condition contains 'terminal') appear as `[TERMINAL]` entries.
- **Arbiter 4 — Iron Rule Labels:** DEFERRED — CF-XX labels require cross-reference with `server/src/engine-contracts/{slug}-bfa-rules.ts`; applied in Phase 9 (edge case discovery) where iron rules directly govern edge cases.
- **Arbiter 5 — Branch Honest Flagging:** PASS (Branch A — no flag required).
