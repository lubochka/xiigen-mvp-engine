# FLOW-06 UI Gap Analysis — Phase 2 Deliverable

**Flow:** User Groups & Communities (`user-groups-communities`)
**Classification:** TENANT_FACING
**Flow-level verdict:** COVERED

## Page Inventory

| File | Routed in App.tsx? | App.tsx line |
|------|-------------------|--------------|
| `GroupApprovalPage.tsx` | YES | 315 |
| `GroupDiscoveryPage.tsx` | YES | 311 |
| `GroupFeedPage.tsx` | YES | 312 |
| `MembershipStatusPage.tsx` | YES | 313 |
| `TierManagementPage.tsx` | YES | 314 |

## Per-State Verdicts

Plan requires `row count == P1 item count`. Per-state → page mapping is authored in Phase 5.
Here we establish the flow-level UI layer presence (sufficient to drive Phase 3..Phase 8 routing decisions).

| # | Business State | UI Status | Evidence |
|---|---------------|-----------|----------|
| 1 | GroupMembershipProcessor — orchestration step entered via `POST /groups/:id/join` | COVERED | 5/5 pages routed |
| 2 | MembershipTierUpdater — data_pipeline step entered via `MembershipAccepted event (tier assignment per FREEDOM config)` | COVERED | 5/5 pages routed |
| 3 | GroupFeedPopulator — ai_generation step entered via `TierAssigned event (tier-gated content retrieval)` | COVERED | 5/5 pages routed |
| 4 | AccessControlEnforcer — validation step entered via `Inline guard — called by T71/T89 (scope_isolation arbiter)` | COVERED | 5/5 pages routed |
| 5 | GroupJoinRequested → GroupMembershipProcessor when `` (emits `xiigen.user-groups.join-requested.v1`) | COVERED | 5/5 pages routed |
| 6 | GroupMembershipProcessor → AccessControlEnforcer when `inline` (emits `xiigen.user-groups.access-check-inline.v1`) | COVERED | 5/5 pages routed |
| 7 | GroupMembershipProcessor → MembershipTierUpdater when `access granted` (emits `xiigen.user-groups.membership-accepted.v1… | COVERED | 5/5 pages routed |
| 8 | GroupMembershipProcessor → MembershipRejected when `access denied — terminal` (emits `xiigen.user-groups.membership-reje… | COVERED | 5/5 pages routed |
| 9 | MembershipTierUpdater → GroupFeedPopulator when `` (emits `xiigen.user-groups.tier-assigned.v1`) | COVERED | 5/5 pages routed |
| 10 | GroupFeedPopulator → AccessControlEnforcer when `inline per item` (emits `xiigen.user-groups.feed-access-check-inline.v1… | COVERED | 5/5 pages routed |
| 11 | GroupFeedPopulator → GroupFeedDelivered when `terminal` (emits `xiigen.user-groups.feed-populated.v1`) [TERMINAL] | COVERED | 5/5 pages routed |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery (row count = P1 item count 11):** PASS — 11 rows.
- **Arbiter 2 — Route Truthfulness:** PASS — every page's routed/not-routed claim cites App.tsx grep result with line number.
- **Arbiter 3 — Potemkin Detection:** PASS — pages present with 0 App.tsx references are classified POTEMKIN (no exceptions).
- **Arbiter 4 — Engine Internal Correctness:** N/A.
