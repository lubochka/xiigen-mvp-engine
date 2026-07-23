# UX Review — Durable Sagas & Compliance (`durable-sagas-compliance`)

**PNGs reviewed:** 6 | **Blockers:** 1 | **High:** 1 | **Medium:** 2 | **Low:** 1
**Overall verdict:** 🚫 Not representative

## Summary

All 6 PNGs show the IDENTICAL "Compliance Audit Records" page — a single "Filter by saga ID" text input and a Search button with NO results table below and no empty-state text. The filenames encode DNA-compliance assertion rules (task coverage, SDK imports, DataProcessResult), not compliance states. From a compliance-officer user's POV, this page is unusable: no default listing, no saga examples, no indication what a "saga ID" looks like, no date/status filters. Searching blank returns nothing visible.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-every-task-type-in-t287-t306-has-at-leas.png` | 🔴 | State fidelity | Depicts an empty compliance filter page; filename claims task-type coverage evidence | Capture a populated results table; rename to `compliance-audit-empty.png` |
| 2-5 | `02..05-*` | 🟡 | Redundant | Byte-identical to #01 | Keep 1; replace others with unique-state captures |
| 6 | `06-focus-areas-covered-9-named-check-evalua.png` | 🟡 | Redundant | Byte-identical; filename references "9 named checks" but no check UI is visible | Capture the named-check evaluator screen |
| — | Page content | 🟠 | Empty state | Search form with no results area and no empty-state message — user does not know if they need to enter a saga ID or can browse | Add "Enter a saga ID to view compliance evidence, or browse recent audits below" + show recent audits by default |
| — | Page content | 🟡 | Affordances | "Filter by saga ID (optional)" says optional but a blank search produces nothing — contradicts the label | If optional, blank search should return the most recent N audits; otherwise remove "(optional)" |
| — | Page content | 🔵 | Input help | No example saga ID format shown; user cannot guess the expected pattern | Placeholder should show a real example: `saga-2024-pay-abc123` |

## Cross-PNG patterns (flow-level)

- **All 6 PNGs are byte-identical.** 5 of 6 are wasted redundant captures.
- No captures of the compensation path (LIFO unwind), no failed-saga evidence, no named-check outcome — all central to durable-saga compliance.
- No indication that the system auto-refreshes or how stale the data is.

## Business-logic phase coverage

Durable-saga + compliance expected phases:
- ✅ Empty filter form — captured
- ❌ Saga in progress (steps 1..N visible)
- ❌ Saga succeeded (audit trail)
- ❌ Saga compensated / failed (LIFO unwind evidence)
- ❌ Named-check evaluation breakdown (9 rules referenced in filename)
- ❌ Export / download for auditors
