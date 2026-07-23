<!--
  Source: FLOW-10 planning session and current engine contracts
  Canonical since: 2026-05-05
  Canonical flow: FLOW-10 reviews-reputation
  Related coverage: docs/flow-coverage/reviews-reputation/
  Related engine artifacts: server/src/engine/flows/reviews-reputation/
-->

# Reviews & Reputation

> **Flow ID**: FLOW-10
> **Slug**: reviews-reputation
> **Version**: 1.0
> **Last Updated**: 2026-05-05
> **Complexity**: Medium-high (review eligibility, moderation, reputation aggregation, owner response)
> **Depends On**: FLOW-04 or FLOW-09 for reviewer eligibility context

---

## Short Description

Handles review submission, moderation, reputation scoring, and owner response for tenant-facing community modules. The flow accepts eligible reviews, routes review text through three-path moderation, updates reputation scores from published reviews only, and lets owners respond without changing the review score.

## Long Description

FLOW-10 begins when a tenant user submits a review for a target entity. The submission gateway first checks reviewer eligibility through read-only cross-flow context. Ineligible reviews are rejected without audit records, while invalid ratings are rejected before idempotency is consumed. Eligible reviews are assigned a server-derived review ID, audited, stored, and emitted for moderation.

The moderation step scores review content and applies tenant-configurable thresholds. Reviews above the pass threshold are published. Reviews below the reject threshold are rejected for content policy. Reviews between the thresholds are marked pending and written to the human moderation queue. The uncertain path is never treated as rejection.

The reputation aggregator recalculates reputation from published reviews only. Pending, rejected, flagged, and retracted reviews are excluded. The aggregate is weighted by recency, clamped to the star-rating range of 1.0 to 5.0, stored before emitting the reputation update event, and recalculated again after retraction.

The response orchestrator lets the target owner publish a single response after ownership, idempotency, and content checks pass. Response text is stored in the private response record but is not written to audit records or queue payloads. Owner responses do not emit reputation updates because a response is not a review.

---

## Persona Descriptions

### For AI / Code Generation

```yaml
flow_id: FLOW-10
flow_slug: reviews-reputation
entry_point: POST /reviews
prerequisite: User authenticated for tenant review actions, target entity exists, eligibility context available

services:
  - review-submission-gateway:
      task_type: T169
      responsibility: Eligibility check, rating validation, review id derivation, audit write, review storage, accepted/rejected events
      events:
        emits:
          - review.rejected
          - review.accepted
          - review.submission.completed
  - review-moderation-engine:
      task_type: T170
      responsibility: PASS / REJECT / UNCERTAIN moderation using tenant thresholds
      freedom_keys:
        - flow10_moderation_pass_threshold
        - flow10_moderation_reject_threshold
      events:
        emits:
          - review.published
          - review.rejected
          - review.flagged_for_human
  - reputation-score-aggregator:
      task_type: T171
      responsibility: Recalculate score from PUBLISHED reviews only, including retraction handling
      freedom_keys:
        - flow10_reputation_recency_weights
      events:
        emits:
          - reputation.updated
  - review-response-orchestrator:
      task_type: T172
      responsibility: Owner response ownership check, response idempotency, content policy, audit, storage, notification
      events:
        emits:
          - review.response.rejected
          - review.response.published

sequence_phases:
  phase_1_submission:
    1. User submits review for a target entity.
    2. T169 checks eligibility before any write, validation, idempotency, or audit.
    3. T169 validates rating is an integer in the 1 to 5 range.
    4. T169 derives reviewId from tenant, reviewer, target entity, and target entity type.
    5. T169 writes audit only after eligibility, validation, and idempotency pass.
    6. T169 stores the accepted review before emitting review.accepted and review.submission.completed.

  phase_2_moderation:
    7. T170 reads tenant moderation thresholds from FREEDOM config.
    8. T170 writes PUBLISHED review state before emitting review.published when confidence is high enough.
    9. T170 writes REJECTED review state before emitting review.rejected when confidence is below reject threshold.
    10. T170 writes PENDING review state and human queue record before emitting review.flagged_for_human when confidence is uncertain.

  phase_3_reputation:
    11. T171 fetches only PUBLISHED reviews for the target entity and tenant.
    12. T171 applies recency weights and clamps the score to 1.0 through 5.0.
    13. T171 stores the reputation score before emitting reputation.updated.
    14. T171 marks retracted reviews as RETRACTED and recalculates from the remaining published set.

  phase_4_owner_response:
    15. T172 checks owner rights before any write or idempotency claim.
    16. T172 allows a revision only after content_policy rejection.
    17. T172 writes audit without response text.
    18. T172 stores the response before emitting review.response.published.
```

### For Product Manager

**Business Value**: Reviews build trust inside tenant communities. Reputation scores make marketplace, events, and partner interactions easier to compare while keeping subjective feedback moderated and auditable.

**User Journey Context**: A member reviews a completed interaction or entity. If the reviewer is eligible and the review passes moderation, the target entity reputation changes. If the review is uncertain, tenant staff can resolve it from a moderation queue. Owners can respond, but the response itself does not alter the score.

**Key Metrics**:
- Eligible review submission rate
- Invalid or ineligible rejection rate
- Moderation pass, reject, and uncertain distribution
- Human moderation queue age
- Reputation score movement after new reviews
- Owner response rate

**A/B Testing Opportunities**:
- Moderation pass and reject thresholds
- Human moderation copy and queue ordering
- Recency weighting for fresh reviews
- Response guidance for owners after negative reviews

### For IT Security Manager

**Security and Privacy Controls**:
- Review text is not written into audit records or queue-visible response payloads.
- Eligibility checks are read-only against peer flows.
- Tenant scope is preserved by the engine runtime and carried in stored records.
- Idempotency prevents duplicate submission, moderation, and response effects.
- Uncertain moderation outcomes are quarantined for humans rather than hidden as system failures.

**Data Sensitivity Classification**:

| Data | Classification | Retention |
|------|----------------|-----------|
| Review text | Confidential user-generated content | Tenant policy |
| Review rating | Internal | Tenant policy |
| Moderation verdict | Internal compliance record | Tenant policy |
| Reputation aggregate | Internal/public depending on tenant UI | Active entity lifetime |
| Owner response text | Confidential user-generated content | Tenant policy |
| Audit records | Internal compliance record | Compliance window |

**Attack Surface**:
- Review spam is controlled by eligibility and idempotency.
- Rating manipulation is constrained to integer values from 1 through 5.
- Cross-tenant score leakage is blocked by tenant-scoped fabric access.
- Response abuse is controlled by ownership and content policy checks.

### For DevOps

**Services Deployed**:

| Service | Critical Path? | Scaling Trigger |
|---------|----------------|-----------------|
| ReviewSubmissionGatewayService | Yes | Review submission rate |
| ReviewModerationEngineService | Yes | Moderation throughput and AI provider latency |
| ReputationScoreAggregatorService | Yes | Review publish/retract event rate |
| ReviewResponseOrchestratorService | No | Owner response volume |

**Key Alerts**:

| Alert | Threshold | Severity |
|-------|-----------|----------|
| Moderation queue age | Above tenant SLA | P2 |
| Review store failure | Any sustained failure | P1 |
| Reputation update lag | Above tenant SLA | P2 |
| Cross-tenant auth rejection regression | Any failed check | P0 |
| Unexpected review text in logs | Any occurrence | P0 |

---

## User Stories

**US-10.1 - Submit review**: As a tenant user, I want to submit a review for an eligible target entity so that my experience can improve the community trust signal.

**US-10.2 - Moderate review**: As a tenant administrator, I want questionable reviews routed to a pending queue so that uncertain content is reviewed by a human.

**US-10.3 - See reputation**: As a community member, I want published reviews reflected in a bounded reputation score so that I can compare trusted entities.

**US-10.4 - Respond to review**: As an entity owner, I want to publish a response to a review so that I can address customer feedback without changing the original score.

---

## Event Definitions

### review.accepted

| Field | Type | Description |
|-------|------|-------------|
| `reviewId` | string | Server-derived review identifier |
| `reviewerId` | string | Reviewer user identifier |
| `targetEntityId` | string | Reviewed entity identifier |
| `targetEntityType` | string | Reviewed entity type |
| `rating` | number | Integer rating from 1 through 5 |
| `status` | string | ACCEPTED |
| `tenantId` | string | Tenant scope |
| `submittedAt` | timestamp | ISO 8601 |

### review.published

| Field | Type | Description |
|-------|------|-------------|
| `reviewId` | string | Published review identifier |
| `targetEntityId` | string | Reviewed entity identifier |
| `targetEntityType` | string | Reviewed entity type |
| `rating` | number | Review rating |
| `tenantId` | string | Tenant scope |
| `moderatedAt` | timestamp | ISO 8601 |

### review.flagged_for_human

| Field | Type | Description |
|-------|------|-------------|
| `reviewId` | string | Pending review identifier |
| `status` | string | PENDING |
| `confidence` | number | Moderation confidence |
| `tenantId` | string | Tenant scope |
| `queuedAt` | timestamp | ISO 8601 |

### reputation.updated

| Field | Type | Description |
|-------|------|-------------|
| `targetEntityId` | string | Entity whose score changed |
| `score` | number | Clamped reputation score from 1.0 through 5.0 |
| `reviewCount` | number | Number of published reviews in the aggregate |
| `tenantId` | string | Tenant scope |
| `updatedAt` | timestamp | ISO 8601 |

### review.response.published

| Field | Type | Description |
|-------|------|-------------|
| `reviewId` | string | Review receiving an owner response |
| `responderId` | string | Owner or authorized responder |
| `respondedAt` | timestamp | ISO 8601 |
| `tenantId` | string | Tenant scope |

---

## FREEDOM Configuration

```yaml
flow10_moderation_pass_threshold:
  default: 0.85
  range: 0.5 to 1.0
  purpose: Confidence at or above this threshold publishes the review.

flow10_moderation_reject_threshold:
  default: 0.3
  range: 0.0 to 0.5
  purpose: Confidence below this threshold rejects the review for content policy.

flow10_reputation_recency_weights:
  default: [1.0, 0.9, 0.8, 0.7, 0.6]
  purpose: Per-position weights applied to published reviews sorted newest first.
```

---

## MACHINE Invariants

- Eligibility check must run before any write, validation, idempotency claim, or audit record.
- Invalid ratings must not consume the submission idempotency key.
- Review IDs are derived server-side, never accepted from client payloads.
- Audit records are written only after eligibility, validation, and idempotency pass.
- Store operations must complete before queue events are emitted.
- Moderation has three paths: PASS, REJECT, and UNCERTAIN.
- UNCERTAIN reviews become PENDING human-review items, never automatic rejections.
- Reputation score uses PUBLISHED reviews only.
- Reputation score is clamped to 1.0 through 5.0.
- Retractions remove reviews from the aggregate by recalculation.
- Owner response revision is allowed only after content_policy rejection.
- Owner responses do not emit reputation.updated.
- All FLOW-10 services remain FLOW_SCOPED and return DataProcessResult.
