# Flow UI examination — FLOW-13 data-warehouse-analytics

## Date: 2026-04-20 · Run: RUN-60 · Batch: F (Grammar 6 Dashboard)

## One-sentence spec (F1)
> When analytics data arrives on the XIIGen platform, route it through the
> analytics pipeline, transform it for the warehouse connector, and emit the
> CloudEvent schema for downstream consumers.

## Roles (F3 — `ROLE-ANALYSIS-BATCH-03.md`)
- **tenant-admin** — org-scoped analytics
- **business-partner** — B2B analytics (revenue / bookings / etc.)
- **platform-admin** — cross-tenant analytics ops
- **tenant-user (consumer)** — no surface

## Grammar
**G6 Dashboard** — metric tiles + time-series chart + period selector + recent list.
**Reference:** **QuickBooks** (revenue/expense), **Mixpanel** (event analytics), **Looker** (BI), **Amplitude** (product analytics).

## F4 Business doc
`business_flows.zip / 13 - finance.md`

## Classification
- **Q1 CRUD?** 🟡 `DataWarehouseAnalyticsPage` likely AdminCrudPanel default.
- **Q2 Error/empty?** Tiles with "—" if no data yet; teaching copy: "Once events flow through your pipeline, metrics appear here."
- **Q3 Engineering leak?** "CloudEvent schema", "warehouse connector" — for admin audience ok; UI copy: "Event format", "Data warehouse".
- **Q4 Role-correct?** 3 admin-side roles.

**Primary finding:** NEEDS_PURPOSE_BUILT_UI (P0) for dashboard layout.

## 24 existing PNGs

## Planned fixes
- Top row: 4 metric tiles (Total events / Unique sources / Error rate / Avg latency) each with headline number + 7d sparkline
- Middle: time-series line chart (events per day) with 7d / 30d / 90d / YTD selector
- Bottom: recent data-source activity card list + "Export to CSV" action
- Per-widget error inline ("Couldn't load Total events") + Retry
