# FLOW-06: User Groups & Communities

## Flow Identity

- Flow ID: FLOW-06
- Flow slug: user-groups-communities
- Domain: XIIGen Community Platform - Membership
- Focus: membership tiers, group feed population, and access control
- Classification: TENANT_FACING

## User Intent

When a member joins a group on the XIIGen community platform, update their membership tier, populate their group feed with relevant content, and enforce access control based on their membership level.

## Business Process

1. A member submits a join request for a group.
2. GroupMembershipProcessor validates group membership rules, including invite-only handling.
3. MembershipTierUpdater records the accepted membership tier and emits the tier update.
4. GroupFeedPopulator selects group feed content after membership is active and scores it using tenant-tunable feed weights.
5. AccessControlEnforcer checks group membership and tier rules before protected content is delivered.
6. The flow records terminal states for accepted, rejected, and delivered feed outcomes.

## Service Responsibilities

| Task | Service | Responsibility |
| --- | --- | --- |
| T71 | GroupMembershipProcessor | Validate join eligibility, enforce invite-only behavior, store membership state before emitting membership events. |
| T72 | MembershipTierUpdater | Persist membership tier updates, prevent unauthorized admin escalation, emit tier update events after persistence. |
| T89 | GroupFeedPopulator | Populate feed items only after membership is active, clamp engagement scores, read feed weights from FREEDOM config. |
| T90 | AccessControlEnforcer | Check group config, membership, and tier access; log access decisions before emitting access events. |

## Non-Negotiable Rules

- Membership, tier, feed, and access records are tenant-scoped and group-scoped where group identity applies.
- Content is not delivered before access control and active membership are confirmed.
- Duplicate join requests must be idempotent.
- Access decisions must be recorded before events are emitted.
- Tenant-adaptable settings are FREEDOM values; task IDs, event ordering, and scope isolation are MACHINE constraints.

## Adaptation Surface

The first tenant-safe adaptation is `flow06_group_feed_weights`, a FREEDOM value consumed by GroupFeedPopulator. Tenants may tune the balance between recency and popularity without changing the membership, access-control, or event-ordering contracts.

## Completion Evidence

The flow is portable only when source auth tests, fork-local TypeScript and Jest checks, real GitHub Actions, registry publication, and role-matrix visual evidence all pass for the three-tenant cascade.
