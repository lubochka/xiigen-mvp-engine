# UX Review — System Initiation Bootstrap (`system-initiation-bootstrap`)

**PNGs reviewed:** 6 | **Blockers:** 2 | **High:** 1 | **Medium:** 1 | **Low:** 1
**Overall verdict:** 🚫 Not representative

## Summary

Generic dynamic-CRUD admin page with the same template as all other Family-B flows. CRUD captures mostly duplicate each other (2 rows vs 1 row). The `state-1-flow-has.png` renders the fallback text "FLOW-33 has no documented states — topology and product spec both missing" — this flow, which is supposed to be the BOOTSTRAP (system initiation!) of the whole engine, has no documented states at all. For a flow whose role is to initialize the platform, the user has no visibility into boot phases (kernel ready / fabrics online / seed complete) — only a Name/Status/Notes CRUD table.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `default.png` | 🟡 | Redundant | Same as crud-initial-load / crud-after-create / c-03-before | Keep one, drop three |
| 2 | `crud-initial-load.png` | 🟡 | Redundant | Same | Remove |
| 3 | `crud-after-create.png` | 🟡 | Redundant (state fidelity) | "after create" shows same state as "before" | Capture real before/after |
| 4 | `c-03-before.png` | 🟡 | Redundant | Same | Remove |
| 5 | `crud-list-with-test-row.png` | 🟢 | Useful | Shows the 2-row post-e2e list | Keep |
| 6 | `state-1-flow-has.png` | 🔴 | State fidelity | "FLOW-33 has no documented states — topology and product spec both missing, and n..." for the system-BOOTSTRAP flow | Author topology for bootstrap phases (pre-init / fabrics-up / ready) |
| — | Admin CRUD | 🔴 | Information appropriateness | A generic Name/Status/Notes table for "System Initiation Bootstrap" — user cannot see bootstrap sequence, fabric health, or seed progress | Build a dedicated bootstrap status page (checklist + progress bars for each fabric and seed step) |
| — | Admin CRUD | 🟠 | Copy / trust | Internal API path `/api/dynamic/xiigen-system-initiation-bootstrap` exposed in the page subtitle | Hide internal path |
| — | Chrome | 🔵 | Banner | Missing-provider-keys banner persistent | Dismissable |

## Cross-PNG patterns (flow-level)

- **4 of 5 CRUD PNGs are byte-identical.**
- **state-1 is a "no topology" fallback** — for the flow responsible for initializing the platform, this is doubly concerning.
- The flow surfaces nothing about the actual bootstrap lifecycle.

## Business-logic phase coverage

- ❌ Pre-initialization (waiting for fabrics)
- ❌ Fabrics online (DB, queue, AI, RAG, secrets, flow — health per fabric)
- ❌ Seed data loading progress
- ❌ Ready-to-serve confirmation
- ❌ Failed boot / recovery
- ✅ Debug CRUD list — over-captured
