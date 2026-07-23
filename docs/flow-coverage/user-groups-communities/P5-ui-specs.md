# FLOW-06 UI Spec — Phase 5 Deliverable

**Flow:** User Groups & Communities (`user-groups-communities`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `GroupApprovalPage.tsx` | `/user-groups-communities/group-approval` | `approval-confirmed`, `approval-queue`, `page-group-approval`, `rejection-confirmed` |
| `GroupDiscoveryPage.tsx` | `/user-groups-communities/group-discovery` | `category-filter`, `group-joined`, `group-list`, `group-search-form`, `page-group-discovery`, `request-sent-badge` +3 |
| `GroupFeedPage.tsx` | `/user-groups-communities/group-feed` | `feed-empty-state`, `group-feed`, `locked-content-fe-003`, `page-group-feed`, `upgrade-cta` |
| `MembershipStatusPage.tsx` | `/user-groups-communities/membership-status` | `access-levels`, `current-tier`, `join-date`, `membership-active`, `membership-pending`, `membership-rejected` +3 |
| `TierManagementPage.tsx` | `/user-groups-communities/tier-management` | `confirm-tier-change`, `current-tier-label`, `feed-adjustment-preview`, `group-requirement-label`, `page-tier-management`, `tier-management` +1 |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | GroupMembershipProcessor — orchestration step entered via `POST /groups/:id/join` | `GroupApprovalPage.tsx` | `page-groupapproval` |
| 2 | MembershipTierUpdater — data_pipeline step entered via `MembershipAccepted event (tier ass… | `TierManagementPage.tsx` | `page-tiermanagement` |
| 3 | GroupFeedPopulator — ai_generation step entered via `TierAssigned event (tier-gated conten… | `TierManagementPage.tsx` | `page-tiermanagement` |
| 4 | AccessControlEnforcer — validation step entered via `Inline guard — called by T71/T89 (sco… | `GroupApprovalPage.tsx` | `page-groupapproval` |
| 5 | GroupJoinRequested → GroupMembershipProcessor when `` (emits `xiigen.user-groups.join-requ… | `GroupApprovalPage.tsx` | `page-groupapproval` |
| 6 | GroupMembershipProcessor → AccessControlEnforcer when `inline` (emits `xiigen.user-groups.… | `GroupApprovalPage.tsx` | `page-groupapproval` |
| 7 | GroupMembershipProcessor → MembershipTierUpdater when `access granted` (emits `xiigen.user… | `MembershipStatusPage.tsx` | `page-membershipstatus` |
| 8 | GroupMembershipProcessor → MembershipRejected when `access denied — terminal` (emits `xiig… | `MembershipStatusPage.tsx` | `page-membershipstatus` |
| 9 | MembershipTierUpdater → GroupFeedPopulator when `` (emits `xiigen.user-groups.tier-assigne… | `TierManagementPage.tsx` | `page-tiermanagement` |
| 10 | GroupFeedPopulator → AccessControlEnforcer when `inline per item` (emits `xiigen.user-grou… | `GroupFeedPage.tsx` | `page-groupfeed` |
| 11 | GroupFeedPopulator → GroupFeedDelivered when `terminal` (emits `xiigen.user-groups.feed-po… | `GroupFeedPage.tsx` | `page-groupfeed` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 11 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
