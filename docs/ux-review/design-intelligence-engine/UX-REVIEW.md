# UX Review — Design Intelligence Engine (`design-intelligence-engine`)

**PNGs reviewed:** 6 | **Blockers:** 2 | **High:** 1 | **Medium:** 1 | **Low:** 1
**Overall verdict:** 🚫 Not representative

## Summary

Generic ENGINE_INTERNAL admin CRUD table. State-1 reads "FLOW-31 has no documented states — topology and product spec both missing, and n...". For a "Design Intelligence Engine" — presumably responsible for surfacing AI-design reasoning, DR triples, mutation screening — the UI surfaces none of those concepts. Only a Name/Status/Notes table with internal test rows.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `default.png` | 🟡 | Redundant | Same as crud-initial-load / crud-after-create / c-03-before | Keep one |
| 2 | `crud-initial-load.png` | 🟡 | Redundant | Same | Remove |
| 3 | `crud-after-create.png` | 🟡 | Redundant (state fidelity) | Same before/after | Capture real create transition |
| 4 | `c-03-before.png` | 🟡 | Redundant | Same | Remove |
| 5 | `crud-list-with-test-row.png` | 🟢 | Useful | Shows 4-row post-insert state | Keep |
| 6 | `state-1-flow-has.png` | 🔴 | State fidelity | "no documented states — topology and product spec both missing" | Author topology |
| — | Admin CRUD | 🔴 | Information appropriateness | A Design Intelligence Engine flattened to a CRUD table — no DR triples, no mutation screening, no top-manager gap detection | Dedicated page: DR triple browser, mutation candidates, rejection reasons |
| — | Admin CRUD | 🟠 | Copy | Test spec name (`design-intelligence-engine-crud.spec.ts`) leaks into the Notes column | Filter test rows from default list |
| — | Chrome | 🔵 | Banner | Missing-provider-keys banner | Dismissable |

## Cross-PNG patterns (flow-level)

- **4 of 5 CRUD PNGs are byte-identical.**
- **state-1 fallback.**
- No design-intelligence affordances surfaced.

## Business-logic phase coverage

- ❌ DR triple list / detail
- ❌ Mutation screen candidates + accept/reject
- ❌ Top-manager gap analysis
- ❌ Confidence timeline
- ✅ Debug CRUD list — over-captured
