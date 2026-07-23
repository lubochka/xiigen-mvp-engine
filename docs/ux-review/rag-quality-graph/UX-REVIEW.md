# UX Review — RAG Quality Graph (`rag-quality-graph`)

**PNGs reviewed:** 7 | **Blockers:** 0 | **High:** 2 | **Medium:** 3 | **Low:** 2
**Overall verdict:** ⚠️ Needs fixes

## Summary

ENGINE_INTERNAL flow with the standard admin-CRUD table plus a single mock state card that literally displays the text "Learning Handoff-specific patterns TBD". The "TBD" string shipped verbatim from planning into the user interface — this is the single worst user-facing string across all 10 flows in the batch. Everything else is the boilerplate admin list.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-learning-handoff-specific-patterns-tbd.png` | 🟠 | State fidelity | Filename = learning handoff; shows generic CRUD | Re-capture against state-1 card |
| 2 | `c-03-before.png` | 🟡 | Redundant | Same CRUD | Drop |
| 3 | `crud-after-create.png` | 🔵 | Copy | Same opaque ui-* records | Human-readable names |
| 4 | `crud-initial-load.png` | 🟡 | Redundant | Same CRUD | Drop |
| 5 | `crud-list-with-test-row.png` | 🔵 | Copy leak | "created by rag-quality-graph-crud.spec.ts" shows test-path to end user | Filter spec-origin metadata |
| 6 | `default.png` | 🟡 | Redundant | Same CRUD | Drop |
| 7 | `state-1-learning-handoff.png` | 🟠 | Copy | Card body literally says "Learning Handoff-specific patterns TBD" | Replace TBD with actual content; never ship "TBD" to users |

## Cross-PNG patterns (flow-level)

- 5/7 captures are the same generic CRUD list — no flow-specific proof.
- Single state card has placeholder content. This is a strong signal that planning-doc text ("*specific patterns TBD*") was piped directly into a user-facing string.
- Only 2 records in the table (vs. 3 elsewhere) — capture created fewer fixtures.

## Business-logic phase coverage

**Visually covered:** admin list CRUD, one mock-state card with placeholder content.
**Missing:** all actual RAG quality content — score distributions, retrieval accuracy, handoff events, feedback loop. The mock state card admits this itself by saying "TBD".
