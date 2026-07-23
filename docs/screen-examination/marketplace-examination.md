# Flow UI examination — FLOW-08 marketplace

## Date: 2026-04-20 · Run: RUN-57 · Batch: C (Grammar 3 Card List with State Badge)

## One-sentence spec (F1)
> When a seller lists a product on the XIIGen marketplace, validate the listing
> against the catalog, advance the tenant state machine to the active state, and
> make the listing discoverable to buyers.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-02.md`)
- **anonymous** — browse public marketplace, filter, search
- **public-marketplace-visitor** — permalink landing on specific listing
- **tenant-user (buyer)** — primary browse + filter + purchase
- **tenant-admin (seller admin)** — listing management + inventory
- **business-partner (vendor)** — vendor publish + metrics

## Grammar
**G3 Card List with State Badge** — product grid with price top-right + state badge (Active / Sold / Out-of-stock / Draft).
**Reference:** Etsy, Shopify storefront, Amazon product grid.

## F4 Business doc
`business_flows.zip / 06-marketplace-publishing.md`

## Classification
- **Q1 CRUD?** 🟡 5 existing pages (BootstrapStatusPage / EventDiscoveryPage / EventRegistrationPage / ParticipationStatusPage / PurchaseHistoryPage). Needs PNG inspection.
- **Q2 Error/empty?** Empty cart / no-purchases state needs teaching copy.
- **Q3 Engineering leak?** "Tenant state machine", "active state" must not appear in UI.
- **Q4 Role-correct?** ✅ 5-role coverage via per-page split.

**Primary finding:** Likely 🟡 partial — multi-page split is good but card-grid rendering for product listings needs confirmation.

## 14 existing PNGs
See PNG-INVENTORY FLOW-08 section.

## Planned fixes
- Product grid: card per item, price top-right, rating stars, "Buy" CTA
- Filter sidebar (category / price / rating)
- Empty state per role: "Start selling" (admin) / "Browse featured items" (buyer)
