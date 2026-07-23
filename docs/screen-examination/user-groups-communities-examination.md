# Flow UI examination — FLOW-06 user-groups-communities

## Date: 2026-04-20 · Run: RUN-57 · Batch: C (Grammar 3 Card List with State Badge)

## One-sentence spec (F1)
> When a member joins a group on the XIIGen community platform, update their
> membership tier, populate their group feed with relevant content, and enforce
> access control based on their membership level.

## Roles (F3)
- **anonymous** — browse public groups (preview only)
- **tenant-user** — member; browse / request-to-join / view feed / leave
- **tenant-admin** — group owner — approve members, manage tiers, set access rules
- **platform-support** — read-only audit

## Grammar
**G3 Card List with State Badge** — group cards with member count + privacy badge + join-state chip.
**Reference:** Facebook Groups, Discord server list, Slack workspace directory.

## Classification
- **Q1 CRUD?** 🟡 Existing pages (GroupDiscoveryPage / GroupFeedPage / MembershipStatusPage / GroupApprovalPage / TierManagementPage) are multiple surfaces; needs PNG inspection for CRUD vs card-list rendering.
- **Q2 Error/empty?** "No groups yet" empty state on first load — needs teaching copy.
- **Q3 Engineering leak?** Medium — "membership tier", "access control" may leak; reword to "Role in group", "Who can see".
- **Q4 Role-correct?** ✅ 4 roles each have a dedicated page.

**Primary finding:** Likely 🟡 partial — multi-page architecture is good; per-page rendering needs sweep.

## 23 existing PNGs
See PNG-INVENTORY FLOW-06 section.

## Planned fixes
- Card grid default view (not CRUD table) for GroupDiscoveryPage
- Per-card state badge: Open / Private / Closed / Member / Pending-request
- Empty state: "Join a group to connect with members who share your interests" + suggestions
