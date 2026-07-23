# Flow UI examination — FLOW-20 ads-platform

## Date: 2026-04-20 · Run: RUN-57 · Batch: C (Grammar 3 Card List + compound Grammar 6 Dashboard)

## One-sentence spec (F1)
> When an ad impression is recorded on the XIIGen platform, route the
> request-response through the dual-gate arbiter, debit the spend ledger,
> and emit the sponsored content event to the graph API.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-04.md`)
- **anonymous** — consent gate (ad personalisation opt-in)
- **tenant-user** — view-only (sees ads, can consent-opt-out)
- **tenant-admin (advertiser)** — primary; create campaign, set budget, inspect CTR
- **platform-admin** — auction config + revenue reconciliation
- **platform-support** — audit log

## Grammar (compound)
- **G3 Card List with State Badge** for campaign list (status: Running / Paused / Budget-exhausted / Ended)
- **G6 Dashboard** for per-campaign metrics (impressions / clicks / CTR / spend / trend chart)
- **G5 Kiosk** for ConsentGatePage (anonymous consent)

## Reference
**Google Ads dashboard**, **Meta Ads Manager**.

## Classification
- **Q1 CRUD?** 🟡 3 pages (AuctionDashboardPage / ConsentGatePage / AdsPlatformPage). Likely some CRUD.
- **Q2 Error/empty?** **P0 per REPAIR-GUIDANCE Part 5:** "Failed to fetch" appearing as a normal state AND T626 task-type jargon visible were both flagged. Needs confirmation both fixed.
- **Q3 Engineering leak?** "Dual-gate arbiter", "spend ledger", "graph API" — internal. UI copy should be "Ad review queue", "Budget", "Content event".
- **Q4 Role-correct?** ✅ 3 pages mostly cover.

**Primary finding:** NEEDS_ERROR_HANDLING (P0) — "Failed to fetch" flagged in repair guidance as visible.

## 15 existing PNGs

## Planned fixes
- Campaign card: name + status badge + budget consumed bar + CTR % + "Edit" / "Pause"
- Per-campaign dashboard: metric tiles (impressions / clicks / CTR / spend) + 30-day line chart
- ConsentGatePage: single clear opt-in / opt-out question, privacy policy linked
- Error states: "Couldn't load campaigns. Retry" with button, not "Failed to fetch"
