# UX Review — Reviews & Reputation (`reviews-reputation`)

**PNGs reviewed:** 10 | **Blockers:** 0 | **High:** 2 | **Medium:** 3 | **Low:** 5
**Overall verdict:** ✅ Shippable

## Summary

This is by far the best-looking flow in the batch. Three real user-facing pages — Reputation Dashboard (4.2★/5, 18 reviews, valid range indicator), Moderation Queue (two pending reviews with Approve/Reject), and Submit Review form — all have real content, real validation, and real feedback. Biggest issue: the Reputation Dashboard shows "Entity: :entityId" because the route param literally isn't substituted — users see a colon-prefixed placeholder.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-reviewsubmissiongateway-submission-gatew.png` | 🟠 | State fidelity + copy | Filename = submission gateway; shows Reputation Dashboard with ":entityId" literal | Substitute entity ID; route here from entity page |
| 2 | `02-reviewmoderationengine-moderation-step-e.png` | 🔵 | Content | Moderation Queue with 2 pending reviews, Approve/Reject — clear | — |
| 3 | `03-reputationscoreaggregator-aggregation-st.png` | 🟡 | Redundant | Same Reputation Dashboard as #1 | Deduplicate |
| 4 | `04-reviewresponseorchestrator-orchestration.png` | 🟠 | State fidelity | Filename claims response orchestrator; shows Submit Review form | Capture a review-response thread UI |
| 5 | `r-02-before.png` | 🔵 | Form | Submit Review — clean form, Rating(1–5), Review textarea, Submit | — |
| 6 | `r-02-after.png` | 🔵 | Validation | Rating=0 → "Rating must be between 1 and 5" inline error | — |
| 7 | `r-03-before.png` | 🟡 | Redundant | Identical to r-02-before | Drop |
| 8 | `r-03-after.png` | 🔵 | Validation | Rating=6 → same inline error fires | — |
| 9 | `r-04-before.png` | 🟡 | Redundant | Identical to r-02-before | Drop |
| 10 | `r-04-after.png` | 🔵 | Success | "Review submitted successfully! Review ID: review-1776603177081" | Offer "Back to entity" link |

## Cross-PNG patterns (flow-level)

- Submit Review form and Reputation Dashboard both show ":entityId" / unclear context — a reviewer/reader has no idea WHICH entity is being reviewed. Always hydrate the route parameter.
- Validation works on both out-of-range cases (0 and 6). Good.
- Three near-identical "before" captures is excessive — one is enough.

## Business-logic phase coverage

**Visually covered:** submission form, form validation, submit success, moderation queue with Approve/Reject, reputation dashboard with score breakdown.
**Missing:** no approved/rejected empty-state of moderation queue, no response thread, no "my reviews" list.
