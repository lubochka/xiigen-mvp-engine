# UX Review — Adaptive RAG / Deep Research (`adaptive-rag-deep-research`)

**PNGs reviewed:** 6 | **Blockers:** 2 | **High:** 1 | **Medium:** 1 | **Low:** 1
**Overall verdict:** 🚫 Not representative

## Summary

Generic ENGINE_INTERNAL admin CRUD table, Family-B pattern. `state-1-flow-has.png` shows "FLOW-29 has no documented states — topology and product spec both missing, and n...". A flow named "Adaptive RAG / Deep Research" should expose retrieval iterations, context windows, cited sources, adaptive retrieval depth — none of that is visible. Users see only Name/Status/Notes rows.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `default.png` | 🟡 | Redundant | Same as crud-initial-load / crud-after-create / c-03-before | Keep one |
| 2 | `crud-initial-load.png` | 🟡 | Redundant | Same | Remove |
| 3 | `crud-after-create.png` | 🟡 | Redundant (state fidelity) | Same before/after | Capture real transition |
| 4 | `c-03-before.png` | 🟡 | Redundant | Same | Remove |
| 5 | `crud-list-with-test-row.png` | 🟢 | Useful | Shows 4-row post-insert state | Keep |
| 6 | `state-1-flow-has.png` | 🔴 | State fidelity | "FLOW-29 has no documented states — topology and product spec both missing, and n..." | Author topology |
| — | Admin CRUD | 🔴 | Information appropriateness | An Adaptive-RAG / Deep-Research flow rendered as a 4-column Name/Status/Notes CRUD — no query interface, no retrieval iterations, no citations | Dedicated research console: query input, iterative retrieval timeline, cited sources panel |
| — | Admin CRUD | 🟠 | Copy | Test spec name visible in Notes column | Filter test rows |
| — | Chrome | 🔵 | Banner | Missing-provider-keys banner | Dismissable |

## Cross-PNG patterns (flow-level)

- **4 of 5 CRUD PNGs are byte-identical.**
- **state-1 is "no topology" fallback.**
- No RAG/research-specific affordances surfaced.

## Business-logic phase coverage

- ❌ Query entry (deep vs quick toggle)
- ❌ Iterative retrieval timeline (pass 1 → pass N)
- ❌ Cited sources + confidence
- ❌ Answer synthesis
- ❌ Research session history
- ✅ Debug CRUD list — over-captured
