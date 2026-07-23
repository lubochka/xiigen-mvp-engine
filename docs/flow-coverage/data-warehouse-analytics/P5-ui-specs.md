# FLOW-13 UI Spec — Phase 5 Deliverable

**Flow:** Data Warehouse & Analytics (`data-warehouse-analytics`)
**Classification:** ADMIN_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `DataWarehouseAnalyticsPage.tsx` | `/admin/data-warehouse-analytics/data-warehouse-analytics` | `page-data-warehouse-analytics` |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | Every task type in T169-T188 has at least one plan step | `DataWarehouseAnalyticsPage.tsx` | `page-datawarehouseanalytics` |
| 2 | Every plan step is scoped to a single responsibility (single task type) | `DataWarehouseAnalyticsPage.tsx` | `page-datawarehouseanalytics` |
| 3 | No step imports provider SDKs directly (fabric-first) | `DataWarehouseAnalyticsPage.tsx` | `page-datawarehouseanalytics` |
| 4 | No step creates entity-specific controllers | `DataWarehouseAnalyticsPage.tsx` | `page-datawarehouseanalytics` |
| 5 | All steps return DataProcessResult<T> | `DataWarehouseAnalyticsPage.tsx` | `page-datawarehouseanalytics` |
| 6 | Focus areas covered: analytics pipeline, warehouse connectors, 16 CloudEvent schemas | `DataWarehouseAnalyticsPage.tsx` | `page-datawarehouseanalytics` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 6 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
