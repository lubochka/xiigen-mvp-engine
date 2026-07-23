# UX Review — Visual Flow Engine (`visual-flow-engine`)

**PNGs reviewed:** 6 | **Blockers:** 1 | **High:** 2 | **Medium:** 2 | **Low:** 1
**Overall verdict:** 🚫 Not representative

## Summary

All 6 PNGs depict the IDENTICAL empty "Visual Flow Canvas" designer page (Flow ID placeholder "flow-my-workflow", 2 hardcoded mock nodes n1/n2, 0 edges). The filenames 01-06 encode DNA-compliance assertion rules (task-type coverage, no SDK imports, DataProcessResult returns), NOT different business states — so there is no state coverage whatsoever. A user reviewing these PNGs learns only that the designer page loads; nothing about what visual-flow-engine actually does. The page itself is also essentially a scaffold — nodes are not editable from the UI, "Publish Flow" is disabled with no hint why.

## Per-PNG findings

| # | File | Severity | Axis | Finding (user-perspective) | Suggested fix |
|--:|------|:-------:|------|----------------------------|---------------|
| 1 | `01-every-task-type-in-t246-t286-has-at-leas.png` | 🔴 | State fidelity | File named after a test assertion but depicts the generic empty designer; provides zero visual evidence for the claim | Either capture the actual task-type coverage registry/list UI, or rename file to reflect what it truly shows (`designer-empty-draft.png`) |
| 2 | `02-every-plan-step-is-scoped-to-a-single-re.png` | 🟡 | Redundant capture | Visually identical to #01 | Remove — one representative capture is enough |
| 3 | `03-no-step-imports-provider-sdks-directly-f.png` | 🟡 | Redundant capture | Visually identical to #01 | Remove — one representative capture is enough |
| 4 | `04-no-step-creates-entity-specific-controll.png` | 🟡 | Redundant capture | Visually identical to #01 | Remove |
| 5 | `05-all-steps-return-dataprocessresult-t.png` | 🟡 | Redundant capture | Visually identical to #01 | Remove |
| 6 | `06-focus-areas-covered-crdt-code-injection.png` | 🟡 | Redundant capture | Visually identical to #01; filename promises CRDT / code-injection evidence but shows none | Capture the CRDT collab session + code-injection guard screens; rename |
| — | Page content (all 6) | 🟠 | Affordances | "Publish Flow" is disabled but there is no tooltip/hint explaining the gating condition (no edges? DRAFT status?). "Add edge" link is the only interaction; no node-editing UI visible | Disabled button should show tooltip; inline validation on Flow ID field |
| — | Page content (all 6) | 🟠 | Empty state | "Nodes (2)" shows pre-populated `n1 Input→string`, `n2 Transform→number` but user never added them — feels like leftover demo data, not a true empty state | Start with 0 nodes and a prominent empty-state CTA ("Drag a node from the palette to begin"); or label the pre-populated nodes as "Example" |
| — | Page content (all 6) | 🔵 | Hierarchy | Yellow "Missing provider keys" banner overlaps the top of the page title | Reduce banner height, or dismiss-once |

## Cross-PNG patterns (flow-level)

- **All 6 PNGs are byte-identical content.** This is the headline blocker — there is no state coverage, only one asset repeated with 6 different filenames.
- The flow topology is not visualized at all — the canvas area is empty; nodes are listed as a text list, not as graph cards.
- "Save Canvas" is enabled but "Publish Flow" is disabled with no explanation.

## Business-logic phase coverage

Flow phases that should appear (canvas design → validation → publish → run/monitor) are NOT covered:
- ✅ Draft (empty canvas) — covered by the one repeated shot
- ❌ Node-added / edge-added state
- ❌ Validation-failure state
- ❌ Publish confirmation / published flow
- ❌ Running flow / monitoring view

Six PNGs of identical draft-canvas means 5 of the 6 should be replaced with captures of the missing phases.
