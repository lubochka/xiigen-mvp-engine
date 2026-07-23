# Flow UI examination — FLOW-17 freelancer-marketplace

## Date: 2026-04-20 · Run: RUN-57 · Batch: C (Grammar 3 Card List)

## One-sentence spec (F1)
> When a freelancer completes a deliverable on the XIIGen marketplace, lock
> the escrow ledger, store the deliverable, and execute the N-step LIFO
> compensation chain if the milestone is disputed.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-04.md`)
- **anonymous** — browse public gigs
- **tenant-user (client)** — posts gigs, reviews bids, funds escrow, reviews deliverables
- **freelancer** — primary worker; posts profile, bids, submits deliverables
- **tenant-admin** — moderation + dispute adjudication
- **business-partner** — B2B bulk hiring
- **platform-admin / platform-support** — cross-tenant dispute + support

## Grammar
**G3 Card List with State Badge** — gig cards + freelancer profile cards + milestone dashboard.
**Reference:** **Upwork, Fiverr** (gig cards); milestone timeline = Stripe Connect pattern.

## Classification
- **Q1 CRUD?** 🟡 2 pages (GigPostingPage / MilestoneDashboardPage). Not enough for 6+ roles — likely branched via RoleScopedView.
- **Q2 Error/empty?** "No gigs posted yet" / "No active milestones".
- **Q3 Engineering leak?** "Escrow ledger lock", "N-step LIFO compensation chain", "disputed" domain terms — "disputed" is fine, others must not leak.
- **Q4 Role-correct?** Critical dual-persona: client posts gigs / freelancer posts services (same scaffold, different fields). Needs verification.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) for missing public browse (`/gigs`, `/freelancers`) + NEEDS_ROLE_BRANCH for client vs freelancer author variants.

## 6 existing PNGs

## Planned fixes
- Gig card: title + price range + bids count + "Place bid" / "View details" CTA
- Freelancer profile: skills + rating stars + portfolio thumbnails + "Hire" CTA
- Milestone timeline: dots on a line with status per milestone (Funded / In-progress / Submitted / Approved / Released)
- Dual-persona GigPostingPage: form fields differ for client vs freelancer but layout shared
