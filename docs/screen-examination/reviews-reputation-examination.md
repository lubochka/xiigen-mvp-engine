# Flow UI examination — FLOW-10 reviews-reputation

## Date: 2026-04-20 · Run: RUN-57 · Batch: C (Grammar 3 Card List + inline form)

## One-sentence spec (F1)
> When a member submits a review on the XIIGen community platform, score
> the review for quality, update the subject's reputation ledger, and route
> borderline reviews through the moderation queue.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-02.md`)
- **tenant-user** — reviewer + reviewed subject (seller / freelancer / event)
- **tenant-admin** — moderator (overlap with FLOW-24)
- **anonymous** — read public reviews on public listings

## Grammar
**G3 Card List with State Badge** + inline star-rating form.
**Reference:** Yelp, Google Maps reviews, Amazon product reviews, Etsy shop reviews.

## Classification
- **Q1 CRUD?** 🟡 4 pages exist (ReviewSubmissionPage / ReviewModerationPage / ReputationDashboardPage / ReviewResponsePage). Needs PNG inspection.
- **Q2 Error/empty?** "No reviews yet" empty state with CTA to write first review.
- **Q3 Engineering leak?** "Quality score", "reputation ledger" should be "Review quality", "Trust score".
- **Q4 Role-correct?** ✅ 4 pages split roles.

**Primary finding:** NEEDS_EMPTY_STATE (P1); likely 🟡 partial.

## 10 existing PNGs

## Planned fixes
- Review card: reviewer avatar + name + star rating + date + body
- Reply action for reviewed subject (inline under each review)
- Moderation queue: Grammar 2 Verdict Grid for borderline reviews (Keep / Remove / Request-revision)
- Reputation dashboard: star distribution chart + review velocity
