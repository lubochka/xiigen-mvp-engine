# UX Review — RAG Quality Feedback (`rag-quality-feedback`)

**PNGs reviewed:** 6 | **Blockers:** 1 | **High:** 1 | **Medium:** 2 | **Low:** 1
**Overall verdict:** 🚫 Not representative

## Summary

Generic ENGINE_INTERNAL admin CRUD table. 4 of 5 CRUD captures are byte-identical (2-row table); only `crud-list-with-test-row.png` shows the 3-row state. `state-1-learning-loop.png` shows a truncated mock card: "State 1: Learning Loop — RAG Quality Feedback-specific patterns TBD" — a literal TBD placeholder shipped as the state fixture. A RAG-quality-feedback user would expect to see scored RAG responses, feedback submissions, quality trends — none of this is surfaced.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `default.png` | 🟡 | Redundant | Same 2-row table as crud-initial-load / crud-after-create / c-03-before | Keep one |
| 2 | `crud-initial-load.png` | 🟡 | Redundant | Same | Remove |
| 3 | `crud-after-create.png` | 🟡 | Redundant | Same before/after | Capture true transition |
| 4 | `c-03-before.png` | 🟡 | Redundant | Same | Remove |
| 5 | `crud-list-with-test-row.png` | 🟢 | Useful | Shows 3-row list with the e2e row | Keep |
| 6 | `state-1-learning-loop.png` | 🔴 | State fidelity | Text content is literally "Learning Loop — RAG Quality Feedback-specific patterns TBD" — a TBD placeholder, not a state | Replace fixture with real Learning-Loop visualization |
| — | Admin CRUD | 🔴 | Information appropriateness | A feedback-quality console reduced to Name/Status/Notes rows — no thumbs up/down, no score distribution, no example responses | Replace with feedback dashboard: response card + thumbs + score histogram |
| — | Admin CRUD | 🟠 | Copy | Row names are UUIDs; notes are "created via UI form" / "created by rag-quality-feedback-crud.spec.ts" — internal test artifacts leaked into the product | Hide rows created by tests from the UI filter; use human-readable names |
| — | Chrome | 🔵 | Banner | Missing-provider-keys banner | Dismissable |

## Cross-PNG patterns (flow-level)

- **4 of 5 CRUD PNGs are byte-identical.**
- **state-1 content is a `TBD` placeholder** — flow has "mock state 1" but it's just a promise of future content.
- Test-spec names visible in Notes column degrade trust.

## Business-logic phase coverage

- ✅ State 1 stub (TBD)
- ❌ User submits thumbs up / down on a RAG answer
- ❌ Quality trend chart over time
- ❌ Low-quality cluster → retraining queue
- ❌ Per-model feedback breakdown
