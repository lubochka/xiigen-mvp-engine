# UX Review — Schema Registry & DAG (`schema-registry-dag`)

**PNGs reviewed:** 14 | **Blockers:** 5 | **High:** 3 | **Medium:** 3 | **Low:** 3
**Overall verdict:** ⚠️ Needs fixes

## Summary

This flow has real UI — three working pages (Schema Registry search, DAG Visualization, Submit Schema Version) — and the r-* before/after pairs do illustrate meaningful user outcomes. But the numbered capture suite 01–06 is broken: all six claim different engine steps and every one shows the same "DAG Visualization with FLOW-11 typed in, no graph yet" placeholder. Biggest user-facing gap: the empty states never tell a schema admin what to do next.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-schemaregistrationgateway-transaction-st.png` | 🔴 | State fidelity | Claims registration-gateway step; shows DAG page with empty viz | Capture the Submit Schema form, not DAG page |
| 2 | `02-schemaversionmanager-validation-step-ent.png` | 🔴 | State fidelity | Claims version validation; identical DAG empty | Capture version-history UI or validation feedback |
| 3 | `03-dagcycledetector-validation-step-entered.png` | 🟠 | State fidelity | Shows Schema Registry search page, not DAG cycle detection | Capture a cycle detection error panel |
| 4 | `04-schemacompatibilitychecker-validation-st.png` | 🔴 | State fidelity | Claims compatibility check; identical DAG empty | Capture compatibility diff UI |
| 5 | `05-schemapublisher-transaction-step-entered.png` | 🔴 | State fidelity | Claims publisher transaction; identical DAG empty | Capture publish-success toast/state |
| 6 | `06-dagtopologybuilder-data-pipeline-step-en.png` | 🔴 | State fidelity | Claims DAG topology build result; identical DAG empty | Capture after "Visualize" click with rendered graph |
| 7 | `r-03-before.png` | 🟡 | Empty state | Schema Registry search with zero explanation of what to type | Add "Try: UserSchema" or list top schemas below |
| 8 | `r-03-after.png` | 🔵 | Polish | Search returns one card — works, but no pagination cues | Show "1 result" count |
| 9 | `r-06-before.png` | 🟡 | Empty state | DAG page shows just an input and button, no example/help | Show placeholder mermaid diagram as hint |
| 10 | `r-06-after.png` | 🔵 | Rendering | Graph renders as plain text "graph TD;" — mermaid code, not diagram | Render the mermaid source, not print it |
| 11 | `r-07-before.png` | 🔵 | Copy | "Schema type is required" — red text alone with no icon | Add inline aria-invalid styling and icon |
| 12 | `r-07-after.png` | 🟠 | Affordance | Clean form but "Submit Schema" provides no help for JSON structure | Add link to schema examples |
| 13 | `r-08-before.png` | 🟡 | Hierarchy | Submit form identical to r-07 but no inline error shown | Consider merging captures — redundant |
| 14 | `r-08-after.png` | 🟠 | Feedback | "Status: QUEUED" — user has no way to track further | Add "View in registry" link after submission |

## Cross-PNG patterns (flow-level)

- 01, 02, 04, 05, 06 all show the same pre-action "DAG Visualization" page — suite provides no evidence of the 6 engine phases it claims to illustrate.
- r-* pairs are useful; numbered 01–06 should be deleted or re-captured.
- Mermaid output rendering as raw text (r-06-after) is a real user-visible bug.

## Business-logic phase coverage

**Visually covered:** schema submit form, submit-success QUEUED state, registry search + result, DAG page (with raw mermaid).
**Missing:** no incompatibility diff UI, no cycle-detection error, no version history, no rejection path.
