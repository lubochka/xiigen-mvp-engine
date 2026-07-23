# UX Review — Sharable Flows Marketplace (`sharable-flows-marketplace`)

**PNGs reviewed:** 6 | **Blockers:** 1 | **High:** 1 | **Medium:** 2 | **Low:** 1
**Overall verdict:** 🚫 Not representative

## Summary

Generic ENGINE_INTERNAL admin CRUD table. 4 of 5 CRUD captures are byte-identical 3-row tables; only `crud-list-with-test-row.png` shows a 4th row. `state-1-flow-has.png` is the "no documented states" placeholder. For a flow labelled "Marketplace" (which suggests browsing, installing, rating shared flows), there is no marketplace UI at all — just a raw records table. A user expecting an App Store-like UI will find none.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `default.png` | 🟡 | Redundant | Identical to crud-initial-load / crud-after-create / c-03-before | Keep one |
| 2 | `crud-initial-load.png` | 🟡 | Redundant | Same 3-row table | Remove |
| 3 | `crud-after-create.png` | 🟡 | Redundant (state fidelity) | "after create" shows same state as "before" | Capture real create transition |
| 4 | `c-03-before.png` | 🟡 | Redundant | Same 3-row table | Remove |
| 5 | `crud-list-with-test-row.png` | 🟢 | Useful | Shows 4-row state with the e2e test row | Keep |
| 6 | `state-1-flow-has.png` | 🔴 | State fidelity | "FLOW-32 has no documented states — topology and product spec both missing" | Author topology |
| — | Admin CRUD | 🔴 | Information appropriateness | A "Marketplace" that shows only Name/Status/Notes records — no cover image, no tags, no author, no install count, no install button | Replace with grid of flow cards: name, author, tags, preview, install CTA |
| — | Admin CRUD | 🟠 | Copy | Row names are unreadable UUIDs (`ui-1776451889518`) instead of human flow names | Substitute real flow titles in list |
| — | Chrome | 🔵 | Banner | Missing-provider-keys banner | Dismissable |

## Cross-PNG patterns (flow-level)

- **4 of 5 CRUD PNGs are byte-identical 3-row tables.**
- **state-1 is the "no topology" fallback.**
- No marketplace affordances (discover / install / rate) — the flow's name is misleading relative to its UI.

## Business-logic phase coverage

- ❌ Marketplace browse (grid)
- ❌ Flow detail / preview
- ❌ Install / copy to my tenant
- ❌ Ratings and review submission
- ❌ Publisher's "my flows" area
- ✅ Debug record list — over-captured
