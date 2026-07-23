# UX Review — User Groups & Communities (`user-groups-communities`)

**PNGs reviewed:** 23 | **Blockers:** 6 | **High:** 4 | **Medium:** 5 | **Low:** 2
**Overall verdict:** ⚠️ Needs fixes

## Summary

This is the best-realised flow in the batch. It actually ships end-user-facing UX:
Discover Groups (real cards with category, member count, tier badge, Join/Request-to-Join
CTAs), Membership Status (Active Member / Awaiting Admin Approval / Join Request Rejected),
Admin Pending Approvals (Alice/Bob/Carol rows with green Approve / red Reject buttons),
Group Feed with access-tier paywall ("Upgrade to access this content" + Upgrade to Premium),
and Tier Management with a feed-impact preview. The business logic, empty states, error
states, and tier semantics are all visible to the user. Primary issues: (a) the pipeline-step
captures (`01-groupmembershipprocessor-*` through `11-groupfeedpopulator-*`) all show
loading-placeholder or the unrelated Pending Approvals list — so they fail state fidelity;
(b) the Group Feed has an obvious rendering bug where the locked "Expert Masterclass" row
overlaps with the upgrade CTA column; (c) the paywall CTA "Upgrade to Premium" appears
twice with different purple colors on nearly identical screens.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-group-discovery.png` | 🟡 | Empty state | Discover Groups search form ships with only an empty box + disabled-looking "Search Groups" button; no list of groups visible until first interaction | Show a default list or "Featured Groups" on load |
| 2 | `01-groupmembershipprocessor-orchestration-s.png` | 🔴 | State fidelity | Claims orchestration step, shows "Pending Approvals — No pending join requests" | Capture the actual orchestrator state (request in-flight) |
| 3 | `02-public-join-confirmed.png` | ✅ | — | Green card "You have joined the group!" + "View Group Feed →" link — good confirmation UX | — |
| 4 | `02-membershiptierupdater-data-pipeline-step.png` | 🔴 | State fidelity | Claims tier pipeline; shows "Tier Management — Loading tier information..." only | Capture loaded state mid-update, not the loading indicator |
| 5 | `03-private-join-pending.png` | ✅ | — | Yellow card "Join Request Sent — Your request is awaiting admin approval." with "View Membership Status →" — clear + actionable | — |
| 6 | `03-groupfeedpopulator-ai-generation-step-en.png` | 🔴 | State fidelity | Claims AI feed generation; shows "Group Feed — Loading your group feed..." only | Show in-progress generation with streamed feed items or skeleton |
| 7 | `04-membership-pending.png` | ✅ | — | "Awaiting Admin Approval" with "Request expires in 72 hours." — good detail | — |
| 8 | `04-accesscontrolenforcer-validation-step-en.png` | 🔴 | State fidelity | Claims access-control validation step; shows "Membership Status — Loading…" | Capture the ACL check (allowed/blocked) not its loading indicator |
| 9 | `05-admin-approval.png` | ✅ | — | Pending Approvals with 3 real rows: Alice Johnson / Bob Williams / Carol Martinez, requested+expiry timestamps, Approve (green) / Reject (red) buttons — excellent admin UX | — |
| 10 | `05-groupjoinrequested-groupmembershipproces.png` | 🔴 | State fidelity | Claims join-requested step; shows "Pending Approvals — No pending join requests" | Should show the request about to be routed |
| 11 | `06-group-feed.png` | 🟠 | Layout / bug | Group Feed has a **rendering defect**: the locked third card ("Expert Masterclass") has "Upgrade to access this content" overlapping / obscuring the card's own title and description — text is cut off / ghosted | Fix z-index or layout so the upgrade CTA renders cleanly beside the card or lightly overlays blurred content |
| 12 | `06-groupmembershipprocessor-accesscontrolen.png` | 🔴 | State fidelity | Claims processor→ACL transition; shows "Pending Approvals — No pending join requests" | Capture routing between services |
| 13 | `07-locked-content.png` | 🟠 | Layout / bug | Same layout defect as 06: locked row overlaps with the upgrade CTA | Same fix |
| 14 | `07-groupmembershipprocessor-membershiptieru.png` | 🔴 | State fidelity | Claims tier update; shows "Membership Status — Loading…" | — |
| 15 | `08-membership-idempotent.png` | ✅ | — | "Membership Status — Active Member" with Current Tier (PREMIUM badge), Access Levels (premium/standard/open_access), Joined date, and a blue "Upgrade Available" card — clean, informative | — |
| 16 | `08-groupmembershipprocessor-membershiprejec.png` | 🔴 | State fidelity | Claims rejection path; shows "Pending Approvals — No pending join requests" | Should show rejection UX (admin reject click + confirmation) |
| 17 | `09-tier-upgrade.png` | 🟡 | Copy | "Feed Adjustment Preview — Upgrading to PREMIUM will: + Add access to premium content, + Retain access to standard and open_access content, + Up to 50 new posts will be added to your feed." Good content but the `+` bullet is ambiguous as a leading character — users may read it as "and also" vs list marker | Use a check-mark icon or standard bullet |
| 18 | `09-membershiptierupdater-groupfeedpopulator.png` | 🔴 | State fidelity | Claims tier→feed propagation; shows "Tier Management — Loading tier information…" | — |
| 19 | `10-membership-rejected.png` | 🟡 | Copy | Red card "Join Request Rejected — Your request to join this group was not approved. Please contact the group admin for more information." No admin contact link | Add "Contact admin" or "View other groups" CTA |
| 20 | `10-groupfeedpopulator-accesscontrolenforcer.png` | 🔴 | State fidelity | Claims feed→ACL step; shows "Group Feed — Loading your group feed…" | — |
| 21 | `11-groupfeedpopulator-groupfeeddelivered-wh.png` | 🔴 | State fidelity | Claims feed delivered; shows "Group Feed — Loading your group feed…" | Capture after feed loads |
| 22 | `r-02-before.png` | 🔵 | Utility | "Discover Groups" with Advanced Algebra Study (FREE, 142 members, Join) / Elite Calculus Club (PREMIUM, 28 members, Request to Join) / Geometry Masters (STANDARD, 75 members, Join) — this is the hero moment, but it's labelled `r-02-before` — unclear what "r" or "before" means | Rename to something descriptive like `discover-groups-populated.png` |
| 23 | `r-03-before.png` | 🔵 | Utility | Byte-identical to `r-02-before.png` | Remove duplicate |

## Cross-PNG patterns (flow-level)

- **Two capture families coexist:** the semantic per-state captures (`NN-short-slug.png`) are
  strong and diverse; the pipeline-step captures (`NN-service-service-step.png`) are all
  loading / empty-state placeholders. The capture harness for the second family needs a
  wait-for-state-change assertion, not just a route navigate.
- **Paywall rendering bug** recurs on both `06-group-feed.png` and `07-locked-content.png` —
  the locked row's title/description text collides with the "Upgrade to access this content"
  overlay. This is user-visible and repeatable.
- **"Upgrade to Premium" / "Upgrade Now" / "Request to Join" / "Confirm Upgrade" / "Join"**
  are five different CTAs across the tier-upgrade flow — reasonable but worth a style-guide
  review so button hierarchy is consistent.
- The admin approval screen (Alice/Bob/Carol) uses fixture names; that's acceptable in a
  shipping-candidate screenshot but worth noting to avoid it leaking to real deploys.
- Persistent yellow "Missing provider keys" banner is present on all 23; it does not obscure
  primary content.

## Business-logic phase coverage

| Phase | Visually covered? |
|--|--|
| Group discovery (search + browse) | ✅ via `01-group-discovery.png`, `r-02-before.png` |
| Public join (immediate) | ✅ `02-public-join-confirmed.png` |
| Private join request | ✅ `03-private-join-pending.png` |
| Awaiting admin approval | ✅ `04-membership-pending.png` |
| Admin approves/rejects | ✅ `05-admin-approval.png` |
| Feed delivered (with tier) | ✅ `06-group-feed.png` (with paywall bug) |
| Locked content / paywall | ✅ `07-locked-content.png` (with bug) |
| Idempotent rejoin | ✅ `08-membership-idempotent.png` |
| Tier upgrade preview + confirm | ✅ `09-tier-upgrade.png` |
| Rejection | ✅ `10-membership-rejected.png` |
| GroupMembershipProcessor orchestration (pipeline) | ❌ only loading screens |
| AccessControlEnforcer validation (pipeline) | ❌ only loading screens |
| MembershipTierUpdater pipeline | ❌ only loading screens |
| GroupFeedPopulator AI generation | ❌ only loading screens |

Business-user coverage is effectively complete. Pipeline/transition coverage is not.
