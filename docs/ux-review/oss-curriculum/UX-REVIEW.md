# UX Review — OSS Curriculum (`oss-curriculum`)

**PNGs reviewed:** 6 | **Blockers:** 1 | **High:** 1 | **Medium:** 2 | **Low:** 1
**Overall verdict:** 🚫 Not representative

## Summary

Generic ENGINE_INTERNAL admin CRUD table. 4 of 5 CRUD captures are byte-identical (3-row table); only `crud-list-with-test-row.png` shows a 4-row state. `state-1-local-model.png` shows a mock card: "State 1: Local Model Curriculum — OSS Teaching Pipeline-specific patterns TBD" — a literal TBD placeholder. An OSS-curriculum user (instructor?) expects a curriculum builder (lessons, pipeline teaching steps, local-model results) — none of which is surfaced here.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `default.png` | 🟡 | Redundant | Same 3-row table as crud-initial-load / crud-after-create / c-03-before | Keep one |
| 2 | `crud-initial-load.png` | 🟡 | Redundant | Same | Remove |
| 3 | `crud-after-create.png` | 🟡 | Redundant | Same | Capture real transition |
| 4 | `c-03-before.png` | 🟡 | Redundant | Same | Remove |
| 5 | `crud-list-with-test-row.png` | 🟢 | Useful | Shows 4-row list | Keep |
| 6 | `state-1-local-model.png` | 🔴 | State fidelity | Content: "Local Model Curriculum — OSS Teaching Pipeline-specific patterns TBD" — a TBD placeholder | Replace with real curriculum visualization |
| — | Admin CRUD | 🔴 | Information appropriateness | Curriculum flow rendered as Name/Status/Notes CRUD — no lessons, no teaching-pipeline steps, no local-model score | Replace with curriculum editor + teaching pipeline graph |
| — | Admin CRUD | 🟠 | Copy | Rows named as UUIDs; notes column shows test spec filenames — internal test data leaks to the product page | Filter test rows; use human-readable names |
| — | Chrome | 🔵 | Banner | Missing-provider-keys banner | Dismissable |

## Cross-PNG patterns (flow-level)

- **4 of 5 CRUD PNGs are byte-identical.**
- **state-1 is a TBD placeholder** — shipping a stub state is not a state.
- No curriculum affordances (add lesson, teach, evaluate) visible.

## Business-logic phase coverage

- ✅ State 1 stub (TBD)
- ❌ Curriculum editor (lessons list, reorder)
- ❌ Teaching pipeline run + progress
- ❌ Local-model eval results (accuracy, recall)
- ❌ Publish / export curriculum
