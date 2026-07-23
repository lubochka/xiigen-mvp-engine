# UX Review — CMS Publishing (`cms-publishing`)

**PNGs reviewed:** 16 | **Blockers:** 8 | **High:** 2 | **Medium:** 4 | **Low:** 2
**Overall verdict:** 🚫 Not representative

## Summary

FLOW-22 "CMS Publishing" captures the same generic Name/Status/Notes/Actions admin CRUD
(green `TENANT_FACING` badge) as every other ENGINE_INTERNAL flow in this batch. Eight PNGs
are byte-identical duplicates; six are "state-N" cards with engineering acceptance copy.
For a CMS feature the user expects: content list with titles and authors, draft vs published
indicators, a publish workflow with schedule/preview, a page editor. None of that appears.
The `crud-after-create` capture fires before the new row renders, so it looks identical to
`crud-initial-load`.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `default.png` | 🔴 | State fidelity | Generic CRUD titled "CMS Publishing" with 3 placeholder rows (`ui-…`). No post titles, authors, publish state, preview. | Build a CMS-specific surface (content list with title/status/author). |
| 2 | `01-every-task-type-in-t341-t380-has-at-leas.png` | 🔴 | State fidelity | Identical to default. | Drop duplicate. |
| 3 | `02-every-plan-step-is-scoped-to-a-single-re.png` | 🔴 | State fidelity | Identical PNG. | Drop duplicate. |
| 4 | `03-no-step-imports-provider-sdks-directly-f.png` | 🔴 | State fidelity | Identical PNG. | Drop duplicate. |
| 5 | `04-no-step-creates-entity-specific-controll.png` | 🔴 | State fidelity | Identical PNG. | Drop duplicate. |
| 6 | `05-all-steps-return-dataprocessresult-t.png` | 🔴 | State fidelity | Identical PNG. | Drop duplicate. |
| 7 | `c-03-before.png` | 🔴 | State fidelity | Identical PNG. | Drop duplicate. |
| 8 | `crud-initial-load.png` | 🔴 | State fidelity | Identical PNG (3 rows). | Keep one representative capture. |
| 9 | `crud-after-create.png` | 🔴 | State fidelity | Identical to initial-load (same 3 rows) — the new record the test just created is not visible. Screenshot was taken before list re-rendered. | Await the new row before capturing. |
| 10 | `crud-list-with-test-row.png` | 🟡 | Copy | 4th row notes "created by cms-publishing-crud.spec.ts". Spec filename surfaced to users. | Use a generic human note. |
| 11 | `state-1-every-task.png` | 🟠 | Information appropriateness | "Every task type in T341-T380 has at least one plan step". Engine-internal. | Remove from tenant UI. |
| 12 | `state-2-every-plan.png` | 🟠 | Information appropriateness | "Every plan step is scoped to a single responsibility". | Remove. |
| 13 | `state-3-no-step.png` | 🟡 | Copy | "No step imports provider SDKs directly (fabric-first)". Developer language. | Hide. |
| 14 | `state-4-no-step-2.png` | 🟡 | Copy | "No step creates entity-specific controllers". | Hide. |
| 15 | `state-5-all-steps.png` | 🟡 | Copy | "All steps return DataProcessResult<T>". | Hide. |
| 16 | `state-6-focus-areas.png` | 🔵 | Polish | Focus-areas card summarises engineering scope, not publishing features. | Rewrite for content editors. |

## Cross-PNG patterns (flow-level)

- **Critical — `crud-after-create.png` looks identical to `crud-initial-load.png`** (same 3
  rows). The passing assertion is screenshot-blind: it proves nothing about the newly
  created record. Likely a timing bug in the spec.
- **8 byte-identical CRUD captures** in a 16-PNG set.
- **6 engineering-acceptance state cards** displayed on what is marked `TENANT_FACING`, which
  is the exact wrong audience.

## Business-logic phase coverage

Topology nodes for FLOW-22: author content → draft → schedule → publish → live view →
unpublish/revert.

Covered: 0 of 6 phases. Nothing depicts a post editor, a draft, a schedule picker, or a
live-preview toggle.
