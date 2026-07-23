# Functional Spec — FLOW-13 Data Warehouse & Analytics

**Grammar:** G6 Dashboard + G3 Card list (saved queries)
**Primary role tiers:** TENANT_OPS (analyst), PLATFORM_OPS
**Current state:** **Half-built** — 15 services on disk, no marketplace wiring, pages are stubs.
**Primary unblock:** wire the pipeline + build the admin dashboard.

---

## 1. Summary

A tenant's analyst queries aggregated activity data across their community — engagement, retention, cohorts, revenue — through a dashboard that combines metric tiles, trend charts, cohort tables, and a saved-query library. Platform admins see cross-tenant rollups. Warehouse + ETL services exist but the dashboard experience is absent.

---

## 2. Roles & modes

| Role | Route | What they do |
|---|---|---|
| **TENANT_OPS** (analyst) | `/admin/analytics/` | View dashboards, run queries, save queries, schedule reports |
| **PLATFORM_OPS** | `/admin/engine/analytics/` | Cross-tenant metrics, pipeline health |

**Modes:**
- **Preset dashboards:** Overview / Growth / Engagement / Revenue / Retention — ship with sensible defaults.
- **Custom query builder:** power users drag dimensions and measures onto a canvas.
- **Scheduled reports:** email-delivered PDFs weekly/monthly.
- **Drill-down:** any chart → click to see underlying rows.

---

## 3. User stories

### Story 3.1 — Analyst opens the overview dashboard

**Screens:** `/admin/analytics/` overview.

**Happy path:**
1. Page loads with 6-8 metric tiles (MAU, DAU, retention cohort, total events, revenue, ARPU) + 2-3 trend charts + top-5 content list.
2. Date range picker top-right (presets: 7d / 30d / 90d / custom); changes apply to all widgets live.
3. Each tile has a small trend arrow (up / down with delta) + comparison to previous period.

### Story 3.2 — Analyst drills into a chart

**Trigger:** analyst clicks a data point on a trend chart.

**Happy path:**
1. Side panel slides in with the specific rows contributing to that point: event type, count, top users/posts/items.
2. Export CSV / JSON button for that specific slice.

### Story 3.3 — Analyst builds a custom query

**Screens:** `/admin/analytics/query/new` → query builder → save → dashboard.

**Happy path:**
1. Query builder three-pane: left (dimension + measure library), centre (canvas — drag dimensions to rows, measures to columns), right (chart type + filter config).
2. Live preview: dataset updates as they drag.
3. Save as: name + description + icon + dashboard to add to.
4. Saved query appears in the Saved queries card list.

### Story 3.4 — Analyst schedules a weekly report

**Trigger:** analyst clicks "Schedule" on a dashboard.

**Happy path:**
1. Schedule wizard: frequency (daily / weekly / monthly), format (PDF / CSV / XLSX), recipients (email addresses + Slack channel).
2. On schedule: report appears in the Scheduled reports card list with next-send timestamp.

### Story 3.5 — Platform admin watches pipeline health

**Screens:** `/admin/engine/analytics/`.

**Happy path:**
1. Dashboard shows pipeline stages (Ingest → Transform → Load → Serve) with per-stage metrics (throughput, error rate, latency).
2. Alert row shows any warehouse freshness lag beyond SLO.

---

## 4. Screen structure & UI elements

### 4.1 `/admin/analytics/` overview dashboard

Metric tiles (grid) + trend charts (flexible widths) + top-N card lists. All widgets respond to the date range picker.

### 4.2 Query builder

Three-pane. Left: searchable dimension + measure catalogue grouped by domain (users / events / marketplace / billing). Centre: drag-drop canvas. Right: chart config + filters.

### 4.3 Saved queries

G3 card list. Each card: name, description, last-run timestamp, run-count, **Run** / **Edit** / **Schedule** / **Delete** actions.

### 4.4 Scheduled reports

G3 card list. Each: name, frequency, recipients, last-sent timestamp, next-send, status badge (Active / Paused / Failed).

---

## 5. Edge cases

| Case | Expected behaviour |
|---|---|
| Query takes >30s | Show *"Running — this may take a minute"* with partial results as they stream. **Cancel** available. |
| Empty dataset | Friendly empty state per widget: *"No data for this period — try a different range."* |
| Warehouse stale (> 1 hour behind real-time) | Top banner: *"Data is 2 hours behind — pipeline delayed"* with link to health dashboard. |
| User has no analyst role | `/admin/analytics/` redirects to `/404`. |
| Saved query references a dimension that was removed | Card shows *"Query broken — 1 dimension missing"* with **Edit** to fix. |

---

## 6. Problematic states

| State | What the user sees |
|---|---|
| **Empty** (new tenant, no data yet) | *"Data will appear as people use your community."* + expected time-to-first-data. |
| **Loading** | Skeleton tiles + chart placeholders. |
| **Query failed** | Inline error on the specific widget (not the whole page): *"Couldn't load — retry"*. |
| **Scheduled report failed** | Card state "Failed" + error detail + **Retry** + **Edit**. |
| **Export failed** | Toast with retry. |
| **Permission denied** | `/404`. |
| **Warehouse down** | Full-page banner: *"Warehouse temporarily unavailable — we're restoring service. Your saved queries are safe."* |

---

## 7. Visual direction

**Grammar:** G6 Dashboard.

**Feel:** *Precise · Calm · Analytical*. Numbers should feel trustworthy. Avoid glossy infographics.

**Reference UIs:** Amplitude, Mixpanel, Tableau, Looker.

**Colour world:**
- Neutral chrome; one accent colour for chart lines
- Series colours limited to 5-7 distinct palette (colour-blind safe)
- Red reserved for negative deltas, green for positive, never reversed

**Signature:** the **date range picker** in the top-right that propagates to every widget simultaneously with one click.

**Anti-patterns:**
- 3D pie charts
- Too many decimal places (rounded to meaningful precision)
- Dashboards with >10 widgets (breaks scanability)

---

## 8. Acceptance criteria

- [ ] Overview dashboard renders with 6-8 metric tiles + trend charts + top-N lists.
- [ ] Date range picker propagates to all widgets in <200ms.
- [ ] Chart drill-down opens side panel with underlying rows.
- [ ] Query builder three-pane with live preview.
- [ ] Scheduled reports email + Slack delivery.
- [ ] Platform admin pipeline health dashboard.
- [ ] All 7 problematic states documented treatment.
