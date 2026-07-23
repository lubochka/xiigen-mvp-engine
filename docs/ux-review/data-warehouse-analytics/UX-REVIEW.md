# UX Review — Data Warehouse & Analytics (`data-warehouse-analytics`)

**PNGs reviewed:** 16 | **Blockers:** 8 | **High:** 2 | **Medium:** 4 | **Low:** 2
**Overall verdict:** 🚫 Not representative

## Summary

FLOW-13 ships the same generic Name/Status/Notes/Actions admin CRUD (yellow `ADMIN_FACING`
badge) as the other ENGINE_INTERNAL flows in this batch. Eight captures are byte-identical,
and the six "state-N" acceptance cards expose engine-internal language. For a data-warehouse
tool the user needs to see datasets, query interface, dashboards, schema browser, refresh
status, cost/performance — none of these appear. The "crud-initial-load" / "crud-after-create"
pair even shows the same 2 rows, contradicting the filename's implied state change.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `default.png` | 🔴 | State fidelity | Generic CRUD with 2 placeholder rows. No dataset browser, no query editor, no dashboard. | Build a DW-specific surface; capture it. |
| 2 | `01-every-task-type-in-t169-t188-has-at-leas.png` | 🔴 | State fidelity | Identical to default. | Drop duplicate. |
| 3 | `02-every-plan-step-is-scoped-to-a-single-re.png` | 🔴 | State fidelity | Identical PNG. | Drop duplicate. |
| 4 | `03-no-step-imports-provider-sdks-directly-f.png` | 🔴 | State fidelity | Identical PNG. | Drop duplicate. |
| 5 | `04-no-step-creates-entity-specific-controll.png` | 🔴 | State fidelity | Identical PNG. | Drop duplicate. |
| 6 | `05-all-steps-return-dataprocessresult-t.png` | 🔴 | State fidelity | Identical PNG. | Drop duplicate. |
| 7 | `c-03-before.png` | 🔴 | State fidelity | Identical PNG. | Drop duplicate. |
| 8 | `crud-initial-load.png` | 🔴 | State fidelity | Identical PNG (2 rows). | Keep one representative capture. |
| 9 | `crud-after-create.png` | 🔴 | State fidelity | Visually identical to initial-load (same 2 rows). The "after create" moment was captured before the new row actually appeared. The test claim and the PNG diverge. | Wait for row to render, assert visually. |
| 10 | `crud-list-with-test-row.png` | 🟡 | Copy | Does show a 3rd `e2e-…` row with notes "created by data-warehouse-analytics-crud.spec.ts". Spec filename leakage. | Use a neutral test-record note. |
| 11 | `state-1-every-task.png` | 🟠 | Information appropriateness | "Every task type in T169-T188 has at least one plan step". Engine jargon. | Remove from UI surface. |
| 12 | `state-2-every-plan.png` | 🟠 | Information appropriateness | "Every plan step is scoped to a single responsibility". | Remove. |
| 13 | `state-3-no-step.png` | 🟡 | Copy | "No step imports provider SDKs directly (fabric-first)". | Hide. |
| 14 | `state-4-no-step-2.png` | 🟡 | Copy | "No step creates entity-specific controllers". | Hide. |
| 15 | `state-5-all-steps.png` | 🟡 | Copy | "All steps return DataProcessResult<T>". | Hide. |
| 16 | `state-6-focus-areas.png` | 🔵 | Polish | Focus-areas card summary is engineering-scoped, not user-scoped. | Rewrite for data-platform users. |

## Cross-PNG patterns (flow-level)

- **Critical — `crud-after-create.png` proves nothing**: same 2 rows as `crud-initial-load.png`.
  The capture fires too early (before the new row renders). Every passing assertion that
  depends on the "after-create" screenshot is likely a false positive.
- **8 byte-identical CRUD list captures** under different engineering-phase filenames.
- **6 engine-internal state cards** exposing T-numbers and fabric-first language to the UI.

## Business-logic phase coverage

Topology nodes for FLOW-13: dataset ingest → model compile → query → dashboard → refresh
schedule → failure diagnostics.

Covered: 0 of 6 phases. Nothing depicts a dataset, a query result, a dashboard widget, or a
refresh status.
