# Flow UI examination — FLOW-12 subscription-billing

## Date: 2026-04-20 · Run: RUN-57 · Batch: C (Grammar 3 Card List)

## One-sentence spec (F1)
> When a customer changes their subscription on the XIIGen platform, calculate
> proration, emit the billing event to the billing engine, and update the
> subscription lifecycle state.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-03.md`)
- **tenant-user** — view current plan + invoices, upgrade/downgrade
- **tenant-admin** — org-wide billing + payment methods + team seats
- **business-partner** — B2B invoicing
- **platform-admin** — cross-tenant revenue ops

## Grammar
**G3 Card List with State Badge** — invoice list with `PAID` / `FAILED` / `VOIDED` / `OPEN` badges.
**Reference:** **Stripe billing portal**, Paddle, Chargebee.

## F4 Business doc
`business_flows.zip / 12 - ERP systems.md`

## Classification
- **Q1 CRUD?** 🟡 3 pages exist (SubscriptionPlanPage / SubscribePage / BillingDashboardPage). Needs PNG inspection.
- **Q2 Error/empty?** **P0 HIGH RISK** — if the default PNG shows a `FAILED` invoice as the dominant card, it leaks an error as normal state. Per the MARKET-REFERENCE-CATALOG hard rule: "FAILED never dominant anchor."
- **Q3 Engineering leak?** "Billing engine", "lifecycle state" may leak; use "Invoice status", "Plan status".
- **Q4 Role-correct?** ✅ 4 roles each with distinct view.

**Primary finding:** likely NEEDS_EMPTY_STATE (P1) + verify no FAILED-as-anchor (P0).

## 9 existing PNGs

## Planned fixes
- Current plan card at top (plan name + price + next renewal date + manage CTA)
- Invoice list below, newest first, with badge per invoice
- Retry action on FAILED invoices (inline)
- Download-PDF per invoice
- Empty state: "No invoices yet — your first invoice will appear here on [date]"
