# Functional Spec — FLOW-18 Visual Flow Engine

**Grammar:** G4 Topology canvas
**Primary role tiers:** TENANT_OPS (flow author), PLATFORM_OPS
**Current state:** **Designed** — 4 services; no canvas UI.

## 1. Summary

A drag-drop canvas where a tenant composes a flow by placing node types on a topology and connecting them with edges. Node palette on the left (triggers, actions, gates, transforms, outputs). Inspector on the right. Deploy button saves + activates the flow. Think n8n / Zapier / draw.io for flow authoring, but fully XIIGen-native.

## 2. Roles & modes

| Role | Route | What |
|---|---|---|
| **TENANT_OPS** | `/admin/flow-builder/:id` | Compose flows visually, test, deploy |
| **PLATFORM_OPS** | `/admin/engine/flow-templates/` | Curate node library, approve custom nodes |

**Modes:** Design (edit canvas), Preview (simulated run), Active (deployed), Debug (trace execution on canvas).

## 3. User stories

### Story 3.1 — Author composes a new flow

**Screens:** `/admin/flow-builder/new` → canvas → inspector → deploy.

1. Blank canvas; grid background; zoom + pan controls.
2. **Node palette** left rail with categories (Triggers / Actions / Gates / Transforms / Outputs). Drag a node onto the canvas.
3. Node appears with default config; **Inspector** right panel shows node type, config fields, input schema, output schema.
4. Connect nodes by dragging from output port to input port — edge auto-routes; validation highlights type mismatches.
5. **Deploy** button top-right → preview validation errors (if any) → confirm → flow live.

### Story 3.2 — Author tests the flow with sample data

**Trigger:** **Test run** button.

1. Test pane opens at bottom: sample input editor + **Run** button.
2. Execution animates on canvas: each node pulses as it executes; edges highlight as data flows.
3. Results per node visible in the test pane; click a node to see its specific input+output.
4. Errors on nodes render with red outline + tooltip.

### Story 3.3 — Author debugs a live flow

**Screens:** live flow → **Debug** tab.

1. Debug tab shows the canvas with last-run execution state overlaid (success / failed / skipped per node).
2. Click a failed node → error detail, input that caused failure, retry affordance.
3. Timeline scrubber at the bottom: replay recent runs.

## 4. Screen structure

- **Canvas** with zoom/pan.
- **Node palette** (left, collapsible).
- **Inspector** (right, per selected node).
- **Test pane** (bottom, collapsible).
- **Top bar** with title, state, Deploy button, branch picker.

## 5. Edge cases

| Case | Behaviour |
|---|---|
| Cycle in graph | Deploy blocked with *"This flow has a cycle — break it before deploying"*; cycle highlighted. |
| Type mismatch on edge | Edge rendered red; inspector shows detail + **Fix mapping** helper. |
| Node deleted but connected by other nodes | Prompt: *"This node is referenced by 3 others — delete and break those connections?"* |
| Deploy fails validation | Blocked with specific errors per node. |
| Canvas has 500+ nodes | Virtualise render; mini-map for navigation. |

## 6. Problematic states

- **Empty canvas** → helper text *"Drag a trigger from the left to start."*
- **Undo history full** → *"Too many changes — consider saving and reloading."*
- **Network offline on save** → local draft preserved; sync on reconnect; yellow dot on save button.
- **Deploy fails** → banner with validation errors; canvas still editable.
- **Node library stale** → banner *"New node types available — reload to see them"*.

## 7. Visual direction

**Grammar:** G4 Topology canvas.

**Feel:** *Precise · Calm · Expert*. Inspired by engineering tools, not toy builders.

**Reference UIs:** n8n, Zapier editor, Temporal UI, Figma nodes.

**Colour world:** grey canvas, distinct colour per node category (blue triggers, green actions, amber gates, purple transforms, red outputs-with-side-effects). Edges neutral; failure red; success green.

**Signature:** the **execution animation** during test runs — data flowing along edges + nodes pulsing. Makes the flow understandable at a glance.

**Anti-patterns:**
- Pretty but low-information nodes (icons only without labels).
- Animated backgrounds that distract from the graph.
- Forcing grid-snap that fights natural layout.

## 8. Acceptance criteria

- [ ] Drag-drop canvas with zoom/pan/mini-map.
- [ ] Left palette + right inspector + bottom test pane.
- [ ] Edge routing with validation.
- [ ] Test-run animation on canvas.
- [ ] Debug tab with execution overlay + timeline scrubber.
- [ ] Cycle detection, type validation on deploy.
- [ ] All 5 problematic states covered.
