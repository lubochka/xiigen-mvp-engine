# FLOW-10 UI Spec — Phase 5 Deliverable

**Flow:** Reviews & Reputation (`reviews-reputation`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `ReputationDashboardPage.tsx` | `/reviews-reputation/reputation-dashboard` | `no-reputation`, `reputation-card`, `reputation-dashboard-page`, `reputation-loading`, `reputation-score`, `score-in-range-indicator` |
| `ReviewModerationPage.tsx` | `/reviews-reputation/review-moderation` | `moderation-empty`, `moderation-loading`, `moderation-queue`, `pending-badge`, `review-moderation-page` |
| `ReviewResponsePage.tsx` | `/reviews-reputation/review-response` | `already-responded-notice`, `no-revision-message`, `response-form`, `response-rejected`, `response-success`, `response-text-input` +3 |
| `ReviewSubmissionPage.tsx` | `/reviews-reputation/review-submission` | `rating-error`, `rating-input`, `review-form`, `review-submission-page`, `review-text-input`, `submission-success` +1 |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | ReviewSubmissionGateway — submission_gateway step entered via `POST /reviews (eligibility … | `ReputationDashboardPage.tsx` | `page-reputationdashboard` |
| 2 | ReviewModerationEngine — moderation step entered via `ReviewSubmitted event` | `ReviewModerationPage.tsx` | `page-reviewmoderation` |
| 3 | ReputationScoreAggregator — aggregation step entered via `ReviewApproved event (rolling ag… | `ReputationDashboardPage.tsx` | `page-reputationdashboard` |
| 4 | ReviewResponseOrchestrator — orchestration step entered via `OwnerResponseRequested event … | `ReputationDashboardPage.tsx` | `page-reputationdashboard` |
| 5 | ReviewSubmitted → ReviewSubmissionGateway when `` (emits `xiigen.reviews-reputation.submit… | `ReputationDashboardPage.tsx` | `page-reputationdashboard` |
| 6 | ReviewSubmissionGateway → ReviewModerationEngine when `eligibility passed` (emits `xiigen.… | `ReputationDashboardPage.tsx` | `page-reputationdashboard` |
| 7 | ReviewSubmissionGateway → ReviewRejected when `eligibility failed — terminal` (emits `xiig… | `ReputationDashboardPage.tsx` | `page-reputationdashboard` |
| 8 | ReviewModerationEngine → ReputationScoreAggregator when `moderation passed` (emits `xiigen… | `ReviewModerationPage.tsx` | `page-reviewmoderation` |
| 9 | ReviewModerationEngine → ReviewQuarantined when `moderation failed — terminal` (emits `xii… | `ReviewModerationPage.tsx` | `page-reviewmoderation` |
| 10 | ReputationScoreAggregator → ReviewResponseOrchestrator when `negative review` (emits `xiig… | `ReviewResponsePage.tsx` | `page-reviewresponse` |
| 11 | ReputationScoreAggregator → ReputationUpdated when `aggregate persisted` (emits `xiigen.re… | `ReputationDashboardPage.tsx` | `page-reputationdashboard` |
| 12 | ReviewResponseOrchestrator → OwnerResponsePublished when `terminal` (emits `xiigen.reviews… | `ReputationDashboardPage.tsx` | `page-reputationdashboard` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 12 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
