# FLOW-10 Business Logic Inventory — Phase 1 Deliverable

**Flow:** Reviews & Reputation (`reviews-reputation`)
**Classification:** TENANT_FACING
**Source:** TOPOLOGY
**Source document:** `contracts/topologies/reviews-reputation.topology.json`

**Topology shape:** 4 nodes, 8 edges. Minimum inventory items: 12.

## Business States & Transitions

1. ReviewSubmissionGateway — submission_gateway step entered via `POST /reviews (eligibility check + audit write + event emit)`
2. ReviewModerationEngine — moderation step entered via `ReviewSubmitted event`
3. ReputationScoreAggregator — aggregation step entered via `ReviewApproved event (rolling aggregate by entity)`
4. ReviewResponseOrchestrator — orchestration step entered via `OwnerResponseRequested event (stub — blocked by P1-1_F10)`
5. ReviewSubmitted → ReviewSubmissionGateway when `` (emits `xiigen.reviews-reputation.submitted.v1`)
6. ReviewSubmissionGateway → ReviewModerationEngine when `eligibility passed` (emits `xiigen.reviews-reputation.review-accepted.v1`)
7. ReviewSubmissionGateway → ReviewRejected when `eligibility failed — terminal` (emits `xiigen.reviews-reputation.review-rejected.v1`) [TERMINAL]
8. ReviewModerationEngine → ReputationScoreAggregator when `moderation passed` (emits `xiigen.reviews-reputation.review-approved.v1`)
9. ReviewModerationEngine → ReviewQuarantined when `moderation failed — terminal` (emits `xiigen.reviews-reputation.review-quarantined.v1`) [TERMINAL]
10. ReputationScoreAggregator → ReviewResponseOrchestrator when `negative review` (emits `xiigen.reviews-reputation.owner-response-requested.v1`)
11. ReputationScoreAggregator → ReputationUpdated when `aggregate persisted` (emits `xiigen.reviews-reputation.reputation-updated.v1`)
12. ReviewResponseOrchestrator → OwnerResponsePublished when `terminal` (emits `xiigen.reviews-reputation.owner-response-published.v1`) [TERMINAL]

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery (edge+node formula: 8+4=12):** PASS — 12 items produced.
- **Arbiter 2 — Scope Isolation:** PASS — state descriptions reference nodes/events; no TypeScript types, no file paths, no class names.
- **Arbiter 3 — Terminal State Coverage:** PASS — terminal-labeled edges (condition contains 'terminal') appear as `[TERMINAL]` entries.
- **Arbiter 4 — Iron Rule Labels:** DEFERRED — CF-XX labels require cross-reference with `server/src/engine-contracts/{slug}-bfa-rules.ts`; applied in Phase 9 (edge case discovery) where iron rules directly govern edge cases.
- **Arbiter 5 — Branch Honest Flagging:** PASS (Branch A — no flag required).
