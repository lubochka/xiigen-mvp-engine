# UX Review — ETL Data Integration (`etl-data-integration`)

**PNGs reviewed:** 16 | **Blockers:** 8 | **High:** 2 | **Medium:** 4 | **Low:** 2
**Overall verdict:** 🚫 Not representative

## Summary

FLOW-14 renders the same generic Name/Status/Notes/Actions admin CRUD (yellow `ADMIN_FACING`
badge) that every other ENGINE_INTERNAL flow in this batch ships. Eight captures are
byte-identical, and the six "state-N" cards surface engineer language ("T189-T200", "single
responsibility", "DataProcessResult<T>") to what should be a data-engineering operator
surface. An ETL user needs to see sources, sinks, schedules, run history, mappings, and
failure diagnostics — none of which exist in this capture set.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `default.png` | 🔴 | State fidelity | Generic admin CRUD titled "ETL Data Integration" with 4 placeholder rows. No source/sink config, no job schedule, no run log — all of which are the feature's primary value. | Build an ETL-specific surface (sources list, job configs, run history). |
| 2 | `01-every-task-type-in-t189-t200-has-at-leas.png` | 🔴 | State fidelity | Identical to `default.png`. | Drop duplicate. |
| 3 | `02-every-plan-step-is-scoped-to-a-single-re.png` | 🔴 | State fidelity | Identical PNG. | Drop duplicate. |
| 4 | `03-no-step-imports-provider-sdks-directly-f.png` | 🔴 | State fidelity | Identical PNG. | Drop duplicate. |
| 5 | `04-no-step-creates-entity-specific-controll.png` | 🔴 | State fidelity | Identical PNG. | Drop duplicate. |
| 6 | `05-all-steps-return-dataprocessresult-t.png` | 🔴 | State fidelity | Identical PNG. | Drop duplicate. |
| 7 | `c-03-before.png` | 🔴 | State fidelity | Identical PNG. | Drop duplicate. |
| 8 | `crud-initial-load.png` | 🔴 | State fidelity | Identical PNG. | Keep one representative list capture. |
| 9 | `crud-after-create.png` | 🔴 | State fidelity | Identical PNG to default — no new row visible. | Wait for row to render, then capture. |
| 10 | `crud-list-with-test-row.png` | 🟡 | Copy | Added row has notes "created by etl-data-integration-crud.spec.ts". Spec filename in tenant-visible column. | Use a human note ("smoke test entry"). |
| 11 | `state-1-every-task.png` | 🟠 | Information appropriateness | "Every task type in T189-T200 has at least one plan step" — internal acceptance text. | Remove from admin UI. |
| 12 | `state-2-every-plan.png` | 🟠 | Information appropriateness | "Every plan step is scoped to a single responsibility (single task type)". | Remove. |
| 13 | `state-3-no-step.png` | 🟡 | Copy | "No step imports provider SDKs directly (fabric-first)". Developer speak. | Hide. |
| 14 | `state-4-no-step-2.png` | 🟡 | Copy | "No step creates entity-specific controllers". | Hide. |
| 15 | `state-5-all-steps.png` | 🟡 | Copy | "All steps return DataProcessResult<T>". Return-type identifier in UI. | Hide. |
| 16 | `state-6-focus-areas.png` | 🔵 | Polish | Focus-areas card likely truncated — brief copy summarising engineering scope rather than ETL features. | Rewrite as user-facing ETL feature list. |

## Cross-PNG patterns (flow-level)

- **8 byte-identical CRUD captures** named for engineering phases. The repeat is visible
  in the artifact set, not in the rendered UI.
- **All 6 state-N cards carry engineering acceptance language** rather than operator-useful
  copy.
- **No ETL-specific concepts present**: no source, sink, schedule, mapping, run, failure,
  backfill, or replay affordances appear.

## Business-logic phase coverage

Topology nodes for FLOW-14: source config → schema discovery → mapping → transform →
sink write → run → failure/retry → backfill.

Covered: 0 of 8. Every capture is either admin CRUD or acceptance-criterion placeholder.
