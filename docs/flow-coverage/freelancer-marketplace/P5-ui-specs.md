# FLOW-17 UI Spec — Phase 5 Deliverable

**Flow:** Freelancer Marketplace (`freelancer-marketplace`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `GigPostingPage.tsx` | `/freelancer-marketplace/gig-posting` | `budget-input`, `gig-error`, `gig-id`, `gig-posting-page`, `gig-status`, `gig-success` +3 |
| `MilestoneDashboardPage.tsx` | `/freelancer-marketplace/milestone-dashboard` | `milestone-dashboard-page`, `review-comment-input`, `review-direction-select`, `review-error`, `review-rating-input`, `review-success` +1 |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | Every task type in T229-T245 has at least one plan step | `GigPostingPage.tsx` | `page-gigposting` |
| 2 | Every plan step is scoped to a single responsibility (single task type) | `GigPostingPage.tsx` | `page-gigposting` |
| 3 | No step imports provider SDKs directly (fabric-first) | `GigPostingPage.tsx` | `page-gigposting` |
| 4 | No step creates entity-specific controllers | `GigPostingPage.tsx` | `page-gigposting` |
| 5 | All steps return DataProcessResult<T> | `GigPostingPage.tsx` | `page-gigposting` |
| 6 | Focus areas covered: N-step LIFO compensation, escrow ledger, deliverable store | `GigPostingPage.tsx` | `page-gigposting` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 6 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
