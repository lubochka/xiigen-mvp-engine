# FLOW-10 UI Automation Gap Analysis — Phase 3 Deliverable

**Flow:** Reviews & Reputation (`reviews-reputation`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED

## Spec Files Found (both directories searched)

| Path | Lines | Size (B) | Role |
|------|------:|---------:|------|
| `client/e2e/reviews-reputation.spec.ts` | 147 | 7970 | AUTHORITATIVE |

| # | Business State | P2 Verdict | Automation | Spec File | Test | Line |
|---|---------------|------------|-----------|-----------|------|------|
| 1 | ReviewSubmissionGateway — submission_gateway step entered via `POST /reviews (eligibility check + au… | COVERED | PARTIAL | `reviews-reputation.spec.ts` | FLOW-10 — Reviews & Reputation | 18 |
| 2 | ReviewModerationEngine — moderation step entered via `ReviewSubmitted event` | COVERED | PARTIAL | `reviews-reputation.spec.ts` | R-05: Moderation page shows pending reviews | 67 |
| 3 | ReputationScoreAggregator — aggregation step entered via `ReviewApproved event (rolling aggregate by… | COVERED | PARTIAL | `reviews-reputation.spec.ts` | R-06: Reputation dashboard shows entity score | 80 |
| 4 | ReviewResponseOrchestrator — orchestration step entered via `OwnerResponseRequested event (stub — bl… | COVERED | NOT_TESTED | `reviews-reputation.spec.ts` | — | — |
| 5 | ReviewSubmitted → ReviewSubmissionGateway when `` (emits `xiigen.reviews-reputation.submitted.v1`) | COVERED | TESTED | `reviews-reputation.spec.ts` | FLOW-10 — Reviews & Reputation | 18 |
| 6 | ReviewSubmissionGateway → ReviewModerationEngine when `eligibility passed` (emits `xiigen.reviews-re… | COVERED | TESTED | `reviews-reputation.spec.ts` | FLOW-10 — Reviews & Reputation | 18 |
| 7 | ReviewSubmissionGateway → ReviewRejected when `eligibility failed — terminal` (emits `xiigen.reviews… | COVERED | TESTED | `reviews-reputation.spec.ts` | FLOW-10 — Reviews & Reputation | 18 |
| 8 | ReviewModerationEngine → ReputationScoreAggregator when `moderation passed` (emits `xiigen.reviews-r… | COVERED | TESTED | `reviews-reputation.spec.ts` | FLOW-10 — Reviews & Reputation | 18 |
| 9 | ReviewModerationEngine → ReviewQuarantined when `moderation failed — terminal` (emits `xiigen.review… | COVERED | TESTED | `reviews-reputation.spec.ts` | FLOW-10 — Reviews & Reputation | 18 |
| 10 | ReputationScoreAggregator → ReviewResponseOrchestrator when `negative review` (emits `xiigen.reviews… | COVERED | TESTED | `reviews-reputation.spec.ts` | FLOW-10 — Reviews & Reputation | 18 |
| 11 | ReputationScoreAggregator → ReputationUpdated when `aggregate persisted` (emits `xiigen.reviews-repu… | COVERED | TESTED | `reviews-reputation.spec.ts` | FLOW-10 — Reviews & Reputation | 18 |
| 12 | ReviewResponseOrchestrator → OwnerResponsePublished when `terminal` (emits `xiigen.reviews-reputatio… | COVERED | TESTED | `reviews-reputation.spec.ts` | FLOW-10 — Reviews & Reputation | 18 |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery:** row count = 12 (= P1 item count). PASS
- **Arbiter 2 — Both Directories Searched:** PASS — both `client/e2e/` AND `e2e/tests/` traversed; results listed in Spec Files section above.
- **Arbiter 3 — Test String Truthfulness:** PASS — TESTED/PARTIAL verdicts cite exact test/describe string with line number from the authoritative spec file.
- **Arbiter 4 — Duplicate Flagging:** N/A — 0 duplicate(s) flagged for Phase 12 consolidation.
