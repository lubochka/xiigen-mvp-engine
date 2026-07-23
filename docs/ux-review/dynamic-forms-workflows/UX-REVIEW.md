# UX Review — Dynamic Forms & Workflows (`dynamic-forms-workflows`)

**PNGs reviewed:** 17 | **Blockers:** 9 | **High:** 2 | **Medium:** 4 | **Low:** 2
**Overall verdict:** 🚫 Not representative

## Summary

FLOW-21 ships as a generic admin CRUD list ("Name / Status / Notes / Actions") backed by
`/api/dynamic/xiigen-dynamic-forms-workflows`, plus six "mock state" cards that each render
a single sentence of architectural acceptance criteria ("Every task type in T307-T340 has at
least one plan step"). Nine of the seventeen captures are byte-identical renders of the same
CRUD list; the remaining cards are meta/engineering text, not product UI. A user looking at
these PNGs cannot tell what a "dynamic form" or "workflow" actually does in the product — the
feature's tenant-facing surface is absent from the capture set.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `default.png` | 🔴 | State fidelity | Shows generic admin CRUD with 3 rows of `ui-1776…` placeholder records. No hint of forms, workflows, conditions, branching — all of which are the feature's selling points. | Either build a feature-specific surface, or gate captures behind a flow that demonstrates a form being built/run. |
| 2 | `01-every-task-type-in-t307-t340-has-at-leas.png` | 🔴 | State fidelity | Identical to `default.png`. Filename references an engineering acceptance criterion, not a user flow. | Drop — duplicate. |
| 3 | `02-every-plan-step-is-scoped-to-a-single-re.png` | 🔴 | State fidelity | Identical PNG, different filename. | Drop — duplicate. |
| 4 | `03-no-step-imports-provider-sdks-directly-f.png` | 🔴 | State fidelity | Identical PNG. | Drop — duplicate. |
| 5 | `04-no-step-creates-entity-specific-controll.png` | 🔴 | State fidelity | Identical PNG. | Drop — duplicate. |
| 6 | `05-all-steps-return-dataprocessresult-t.png` | 🔴 | State fidelity | Identical PNG. | Drop — duplicate. |
| 7 | `06-focus-areas-covered-dynamic-form-engine.png` | 🔴 | State fidelity | Identical PNG. | Drop — duplicate. |
| 8 | `c-03-before.png` | 🔴 | State fidelity | Identical PNG. | Drop — duplicate. |
| 9 | `crud-initial-load.png` | 🔴 | State fidelity | Identical PNG. | Keep only one "list" capture. |
| 10 | `crud-after-create.png` | 🔴 | State fidelity | Identical to `default.png` — no new row is visible, so the "after-create" state is indistinguishable from "before-create". Test claims to assert a successful create but screenshot does not prove it. | Wait for the new row to render before capturing; assert presence visually. |
| 11 | `crud-list-with-test-row.png` | 🟡 | Copy | This one actually DIFFERS — a 4th row `e2e-1776602615048` with notes "created by dynamic-forms-workflows-crud.spec.ts". Filename leakage into tenant-visible Notes column is ugly. | Use a neutral human note ("test record") rather than the spec file path. |
| 12 | `state-1-every-task.png` | 🟠 | Information appropriateness | Renders a card titled "State 1" with the engineering sentence "Every task type in T307-T340 has at least one plan step". A user never needs to see T-numbers; this is internal validation surfaced as product UI. | Remove from the tenant surface or move under a clearly-labelled "Engine diagnostics" admin page. |
| 13 | `state-2-every-plan.png` | 🟠 | Information appropriateness | Same "mock state" shell; text: "Every plan step is scoped to a single responsibility (single task type)". Internal. | As above. |
| 14 | `state-3-no-step.png` | 🟡 | Copy | "No step imports provider SDKs directly (fabric-first)". Fabric/SDK language is developer speak. | Hide from tenant UI. |
| 15 | `state-4-no-step-2.png` | 🟡 | Copy | "No step creates entity-specific controllers". Internal. | Hide. |
| 16 | `state-5-all-steps.png` | 🟡 | Copy | "All steps return DataProcessResult<T>". Engineer-facing. | Hide. |
| 17 | `state-6-focus-areas.png` | 🔵 | Polish | "Focus areas covered: dynamic form engine, workflow state machine, conditional lo…" — last word truncated by ellipsis in card. | Widen card or wrap text. |

## Cross-PNG patterns (flow-level)

- **9 of 17 PNGs are byte-identical duplicates** of the same generic CRUD list. The numbered
  filenames (`01-…`, `02-…`, etc.) refer to engineering acceptance criteria, not user phases.
  From a user-validation standpoint, this capture set is a single screenshot repeated.
- **Six "state-N" cards expose engine acceptance language to tenant UI**. A non-engineer user
  would not understand "T307-T340", "DataProcessResult<T>", "fabric-first".
- **The flow's tenant value proposition (form building, workflow branching) is not depicted
  anywhere.** A reviewer cannot assess UX for a feature that has no captured UI.

## Business-logic phase coverage

Topology nodes for FLOW-21 (form template design → publish → tenant render → submit → workflow
step execution → completion).

Covered: 0 of 6 phases. Every capture is either the admin CRUD list or an acceptance-criterion
placeholder. There is no capture of a form being authored, rendered, submitted, or progressed
through a workflow state.
