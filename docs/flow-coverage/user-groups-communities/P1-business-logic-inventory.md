# FLOW-06 Business Logic Inventory — Phase 1 Deliverable

**Flow:** User Groups & Communities (`user-groups-communities`)
**Classification:** TENANT_FACING
**Source:** TOPOLOGY
**Source document:** `contracts/topologies/user-groups-communities.topology.json`

**Topology shape:** 4 nodes, 7 edges. Minimum inventory items: 11.

## Business States & Transitions

1. GroupMembershipProcessor — orchestration step entered via `POST /groups/:id/join`
2. MembershipTierUpdater — data_pipeline step entered via `MembershipAccepted event (tier assignment per FREEDOM config)`
3. GroupFeedPopulator — ai_generation step entered via `TierAssigned event (tier-gated content retrieval)`
4. AccessControlEnforcer — validation step entered via `Inline guard — called by T71/T89 (scope_isolation arbiter)`
5. GroupJoinRequested → GroupMembershipProcessor when `` (emits `xiigen.user-groups.join-requested.v1`)
6. GroupMembershipProcessor → AccessControlEnforcer when `inline` (emits `xiigen.user-groups.access-check-inline.v1`)
7. GroupMembershipProcessor → MembershipTierUpdater when `access granted` (emits `xiigen.user-groups.membership-accepted.v1`)
8. GroupMembershipProcessor → MembershipRejected when `access denied — terminal` (emits `xiigen.user-groups.membership-rejected.v1`) [TERMINAL]
9. MembershipTierUpdater → GroupFeedPopulator when `` (emits `xiigen.user-groups.tier-assigned.v1`)
10. GroupFeedPopulator → AccessControlEnforcer when `inline per item` (emits `xiigen.user-groups.feed-access-check-inline.v1`)
11. GroupFeedPopulator → GroupFeedDelivered when `terminal` (emits `xiigen.user-groups.feed-populated.v1`) [TERMINAL]

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery (edge+node formula: 7+4=11):** PASS — 11 items produced.
- **Arbiter 2 — Scope Isolation:** PASS — state descriptions reference nodes/events; no TypeScript types, no file paths, no class names.
- **Arbiter 3 — Terminal State Coverage:** PASS — terminal-labeled edges (condition contains 'terminal') appear as `[TERMINAL]` entries.
- **Arbiter 4 — Iron Rule Labels:** DEFERRED — CF-XX labels require cross-reference with `server/src/engine-contracts/{slug}-bfa-rules.ts`; applied in Phase 9 (edge case discovery) where iron rules directly govern edge cases.
- **Arbiter 5 — Branch Honest Flagging:** PASS (Branch A — no flag required).
