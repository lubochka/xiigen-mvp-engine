# Flow UI examination — FLOW-18 visual-flow-engine

## Date: 2026-04-20 · Run: RUN-53 · Batch: A (Grammar 4 Topology Canvas)

## One-sentence spec (F1 — `FLOW-18-STEP-1-INVARIANTS.md`)
> When a designer creates a visual flow on the XIIGen engine, merge the CRDT
> edits, inject the generated code into the target module, and auto-register
> the flow with the BFA conflict detector.

## Roles (F3 — `docs/design-reviews/ROLE-ANALYSIS-BATCH-04.md`)
- **tenant-admin** — primary designer; low-code flow builder within tenant scope (only if tenant is FREEDOM-enabled). Sees ReactFlow canvas + task-type palette + publish gate.
- **platform-admin** — engine-wide flow design; cross-tenant flow registry + FREEDOM config. Same canvas with extended palette.
- **platform-support** — read-only canvas viewer for debugging; disabled controls.
- **all other roles** — excluded. FREEDOM-machine access is admin-only by design.

## State inventory (F2 — `UI-REFLECTION-STATE.md`)

22 processes total: **8 PARTIAL_UI** (user-facing) + **14 INTERNAL_ONLY** (engine-only).

PARTIAL_UI processes (missing `next_step` state across all 8):
| Process | Purpose | Missing state |
|---------|---------|---------------|
| T247 FlowCanvasInitializeGate | Canvas bootstrap | next_step |
| T248 NodeAddClassifyGate | Palette → canvas drop | next_step |
| T251 CodeGenerationGate | DAG → code emission | next_step |
| T261 AIAssistantFlowBuildingGate | Chat-aside NL → canvas edits | next_step |
| T262 CollaborationSessionGate | CRDT multi-user session | next_step |
| T264 CollaborationPermissionGate | Co-editor ACL | next_step |
| T265 MarketplacePublishGate | Publish to FLOW-32 sharable marketplace | next_step |
| T266 MarketplaceImportForkGate | Import / fork from marketplace | next_step |

INTERNAL_ONLY processes (14): edge validate, auto-layout preview, factory
registration, code injection, BFA auto-registration, sandbox create/seed/step,
iron-rule QG validation, test-report promotion, UI component render, debug
panel execution, OT conflict resolution, promotion pipeline advance, rollback
health. These are engine mechanics, correctly hidden from UI.

## Business intent (F4)
**No entry in `business_flows.zip`** (engine-internal flow). Reference drawn
from F1 + F3 + the widely-understood visual-flow-builder domain.

## Real-world reference (MARKET-REFERENCE-CATALOG §4 · G4 Topology Canvas)
- **Primary:** n8n workflow canvas, Zapier editor, Make, Retool
- **Layout convention (locked RUN-47e, confirmed in spec file comment):**
  three-column `[ Node palette ] [ Canvas (ReactFlow) ] [ AI chat aside ]`
- **Signature patterns to borrow:** dotted canvas background, node-type
  palette with type-badge per node, draggable-onto-canvas affordance, zoom
  controls at canvas corner, chat-driven "describe an edit" NL input.

## Classification (7-step protocol, Step A)

- **Q1 CRUD?** ❌ No — tenant-admin branch is a proper n8n 3-column layout (`FlowCanvasPage.tsx` lines 461–600). Fallback branch IS a CRUD-style form, but it's the legacy path.
- **Q2 Error/empty as normal?** 🟡 **Yes, partial** — `TopologySection` renders `TopologyViewer` which displays `Error: Topology response missing nodes or edges — backend may be unreachable.` when the saved-flow backend is unreachable. Visible in every PNG.
- **Q3 Engineering leak?** 🟡 **Minor** — "FLOW-18" is visible in the saved-topology header; node IDs like `n1` / `n2` shown in the Nodes list. The chat-aside copy is plain language (`Assistant: I'm your flow design assistant...`) which is good.
- **Q4 Role-correct?** ✅ Yes — tenant-admin, platform-admin, platform-support branches all distinct and documented.

**Primary finding:** NEEDS_ERROR_HANDLING (P0) — Topology viewer error surfaces as normal state on the DRAFT editing page even when the Draft canvas preview is showing successfully.

## UI/UX Pro Max P1/P2/P9 findings
- **P1 color-not-only** ✅ — node types use badge + text label (not colour alone).
- **P1 aria-labels** ✅ — zoom buttons have aria-labels on ReactFlow default controls; custom overlays use `aria-hidden` where appropriate.
- **P1 form-labels** ✅ — Flow ID input has visible label.
- **P2 loading-buttons** 🟡 — Save Canvas button has loading state via `status === 'loading'`; Publish Flow button is role-aware but doesn't disable during submit.
- **P9 nav-state-active** ✅ (RUN-49 G2).
- **P9 drawer-usage** ✅ (RUN-49 G3 — admin-only page, Sidebar correctly shown for admin roles, hidden for anonymous).

## Impeccable Nielsen H1/H2/H8/H9
- **H1 Visibility of System Status:** **1/2** — canvas status DRAFT is prominent; AI chat reports actions; but TopologyViewer error leaks as "backend unreachable" without a recovery action. Fix: either hide TopologySection when the flow is unsaved, or replace the error with "No saved topology yet — save your draft to populate" (neutral copy, no "backend" word).
- **H2 Match System / Real-world:** **1/2** — "DPO triples" in the pre-RUN-49 banner was a leak; RUN-49 G1 fixed that for non-admin. Node IDs `n1`/`n2` are system identifiers that should be human names ("Input node"). "Saved Flow Topology — FLOW-18" leaks the flow slug; should be "Saved version of this flow".
- **H8 Aesthetic and Minimalist Design:** **2/2** — three columns with clear focal point (canvas); palette column visually light; chat aside neatly bordered; good whitespace.
- **H9 Error Recovery:** **0/2** — "backend may be unreachable" is cryptic; no retry action.

**H9 = 0 → P0 per SK-540 scoring. Must fix before any aesthetic work.**

## Interface Design 3 questions (Intent First)
1. **Who is this human?** A tenant platform-admin who just got a FREEDOM feature enabled and is now composing their first custom automation — they know what they want to build but are discovering XIIGen's node vocabulary.
2. **What must they accomplish?** **Build**: drop Input → Transform → Output nodes, wire them, and save a valid draft.
3. **What should this feel like?** A scientist's bench. Cold precision. Dotted grid, calm greys, one clear focal point (the canvas), an assistant who acts on plain-language instructions. The same aesthetic as FLOW-29 (a terminal that grew a UI).

## Existing PNG evidence (pre-RUN-49 — need regeneration)

| PNG | Role | Note |
|-----|------|------|
| `c6-role-coverage/visual-flow-engine-role-tenant-admin-n8n-layout.png` | tenant-admin | ✅ shows proper 3-column n8n layout, chat aside with 2 messages, 2 palette nodes dropped, ReactFlow canvas. ❌ pre-RUN-49 banner still visible. ❌ "Error: Topology response missing nodes or edges" visible below canvas. |
| `c6-role-coverage/visual-flow-engine-role-platform-admin.png` | platform-admin | pre-RUN-49 — needs re-capture |
| `c6-role-coverage/visual-flow-engine-role-platform-support.png` | platform-support | pre-RUN-49 — needs re-capture |
| `visual-flow-engine/01..06-*.png` | (fallback path) | ❌ all 6 are BFA mock path that renders SUCCESS_CRITERIA lines as visible UI — engineering leak. Should be deleted. |

## Planned fixes (priority-ordered, for later runs)

**P0 — H9 Error Recovery (fix before aesthetic work):**
- Replace `TopologyViewer` error line "Topology response missing nodes or edges — backend may be unreachable." with neutral empty-state copy: "No saved topology yet — save your draft to populate."
- Colour from red to neutral-grey; add a "Save canvas" button alongside if possible.

**P1 — H2 jargon cleanup:**
- Replace `n1`/`n2` node IDs in the Nodes list with human names derived from node-type label.
- Change "Saved Flow Topology — FLOW-18" → "Saved version of this flow".

**P1 — Drop the BFA-mock-success-criteria PNGs:** delete `docs/e2e-snapshots/visual-flow-engine/01-*.png..06-*.png` — they render engineering text that was never meant to be user-visible.

**P2 — Regenerate role-coverage PNGs post-RUN-49:**
- tenant-admin n8n layout (banner hidden)
- platform-admin cross-tenant audit
- platform-support read-only

## Ref grammar template (for FLOW-26 + FLOW-34 to follow)

FLOW-18 validates the 3-column pattern: **palette + canvas + chat aside** is
the right anchor for any visual-flow-builder surface. FLOW-26 (meta-flow-engine)
and FLOW-34 (marketplace-plugin-adapter) should inherit this pattern where
they expose a visual composition surface.
