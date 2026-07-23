# FLOW-06 UI Automation Gap Analysis — Phase 3 Deliverable

**Flow:** User Groups & Communities (`user-groups-communities`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED

## Spec Files Found (both directories searched)

No `*.spec.ts` found matching `user-groups-communities` in either `client/e2e/` or `e2e/tests/`.

| # | Business State | P2 Verdict | Automation | Spec File | Test | Line |
|---|---------------|------------|-----------|-----------|------|------|
| 1 | GroupMembershipProcessor — orchestration step entered via `POST /groups/:id/join` | COVERED | NOT_TESTED | `—` | — | — |
| 2 | MembershipTierUpdater — data_pipeline step entered via `MembershipAccepted event (tier assignment pe… | COVERED | NOT_TESTED | `—` | — | — |
| 3 | GroupFeedPopulator — ai_generation step entered via `TierAssigned event (tier-gated content retrieva… | COVERED | NOT_TESTED | `—` | — | — |
| 4 | AccessControlEnforcer — validation step entered via `Inline guard — called by T71/T89 (scope_isolati… | COVERED | NOT_TESTED | `—` | — | — |
| 5 | GroupJoinRequested → GroupMembershipProcessor when `` (emits `xiigen.user-groups.join-requested.v1`) | COVERED | NOT_TESTED | `—` | — | — |
| 6 | GroupMembershipProcessor → AccessControlEnforcer when `inline` (emits `xiigen.user-groups.access-che… | COVERED | NOT_TESTED | `—` | — | — |
| 7 | GroupMembershipProcessor → MembershipTierUpdater when `access granted` (emits `xiigen.user-groups.me… | COVERED | NOT_TESTED | `—` | — | — |
| 8 | GroupMembershipProcessor → MembershipRejected when `access denied — terminal` (emits `xiigen.user-gr… | COVERED | NOT_TESTED | `—` | — | — |
| 9 | MembershipTierUpdater → GroupFeedPopulator when `` (emits `xiigen.user-groups.tier-assigned.v1`) | COVERED | NOT_TESTED | `—` | — | — |
| 10 | GroupFeedPopulator → AccessControlEnforcer when `inline per item` (emits `xiigen.user-groups.feed-ac… | COVERED | NOT_TESTED | `—` | — | — |
| 11 | GroupFeedPopulator → GroupFeedDelivered when `terminal` (emits `xiigen.user-groups.feed-populated.v1… | COVERED | NOT_TESTED | `—` | — | — |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery:** row count = 11 (= P1 item count). PASS
- **Arbiter 2 — Both Directories Searched:** PASS — both `client/e2e/` AND `e2e/tests/` traversed; results listed in Spec Files section above.
- **Arbiter 3 — Test String Truthfulness:** PASS — TESTED/PARTIAL verdicts cite exact test/describe string with line number from the authoritative spec file.
- **Arbiter 4 — Duplicate Flagging:** N/A — 0 duplicate(s) flagged for Phase 12 consolidation.
