# UX Review — Meta Arbitration Engine (`meta-arbitration-engine`)

**PNGs reviewed:** 6 | **Blockers:** 2 | **High:** 1 | **Medium:** 1 | **Low:** 1
**Overall verdict:** 🚫 Not representative

## Summary

Generic ENGINE_INTERNAL admin CRUD table. `state-1-flow-has.png` reads "FLOW-35 has no documented states — topology and product spec both missing, and n..." for a flow as central as the META-arbitration engine (deciding between competing model outputs / conflicting flow decisions). A user expects to see disputes, arbitration verdicts, model comparison — none visible.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `default.png` | 🟡 | Redundant | Identical to crud-initial-load / crud-after-create / c-03-before | Keep one |
| 2 | `crud-initial-load.png` | 🟡 | Redundant | Same | Remove |
| 3 | `crud-after-create.png` | 🟡 | Redundant (state fidelity) | Same pre-/post-create content | Capture true create transition |
| 4 | `c-03-before.png` | 🟡 | Redundant | Same | Remove |
| 5 | `crud-list-with-test-row.png` | 🟢 | Useful | Shows post-e2e state | Keep |
| 6 | `state-1-flow-has.png` | 🔴 | State fidelity | "no documented states — topology and product spec both missing" for the Meta Arbitration Engine | Author topology |
| — | Admin CRUD | 🔴 | Information appropriateness | An arbitration engine rendered as Name/Status/Notes — no dispute queue, no competing candidates, no verdict UI | Replace with arbitration queue: candidates A/B, scoring, verdict action |
| — | Admin CRUD | 🟠 | Copy | Internal path, test-spec row names in Notes column | Hide internal path, filter test rows |
| — | Chrome | 🔵 | Banner | Missing-provider-keys banner | Dismissable |

## Cross-PNG patterns (flow-level)

- **4 of 5 CRUD PNGs are byte-identical.**
- **state-1 is the "no topology" fallback.**
- No arbitration affordances (dispute detail, scoring, verdict) visible.

## Business-logic phase coverage

- ❌ Open dispute queue
- ❌ Candidate comparison (A vs B vs ... N)
- ❌ Verdict applied / explained
- ❌ Arbitration audit trail
- ✅ Debug CRUD list — over-captured
