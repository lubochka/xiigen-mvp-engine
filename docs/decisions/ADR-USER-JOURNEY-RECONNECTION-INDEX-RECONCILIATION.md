# ADR — Index Reconciliation for FLOW-18 Visual Flow Canvas

**Date:** 2026-04-15
**Status:** Accepted (locked)
**Branch:** `claude/vigorous-margulis`
**Context:** Track 0 Turn 15 (user-journey-reconnection), v22 Finding B.

---

## Context

Track 0 introduces two new flow-storage indices:
- `xiigen-flow-templates` (GLOBAL reference topologies)
- `xiigen-tenant-topologies` (PRIVATE per-tenant flows)

TopologyController (Turn 7) reads both via TenantTopologyStore, with a legacy
fallback to `xiigen-flow-definitions` (the engine-kernel index, currently empty
in production).

FLOW-18 T617 `FlowCanvasWriterService` writes visual-flow canvas records to a
THIRD index: `xiigen-flow-canvases`. Without reconciliation, flows created
through the visual canvas editor (FlowCanvasPage) are INVISIBLE to:
- FlowLibraryPage (lists only tenant-topologies + flow-templates)
- TopologyViewer (reads `/api/topology/:flowId` bridge)

This creates a three-system fragmentation problem:
  (1) CycleChain outputs → xiigen-tenant-topologies  (via TopologyPublisher, Turn 3)
  (2) Visual canvas edits → xiigen-flow-canvases     (via T617, unchanged)
  (3) Engine kernel        → xiigen-flow-definitions  (no callers)

---

## Options considered

**Option (a) — Dual-write from T617**

Modify `FlowCanvasWriterService` to ALSO write every canvas record into
`xiigen-tenant-topologies` so TopologyController's existing bridge picks it up.

Pros:
- Single read path; clean two-system convergence.
- No TopologyController changes.

Cons:
- T617 ships with carefully ordered BOLA + FLOW_IMMUTABLE guards (CF-18-1).
  Duplicating writes means duplicating those guards — higher blast radius.
- Any future change to T617's guard ordering must be applied twice.
- T617's index has its own OCC (optimistic concurrency) scheme keyed to
  `xiigen-flow-canvases`; replicating it to a second index is fragile.

**Option (b) — Extend TopologyController bridge with a third fallback — LOCKED**

Add `xiigen-flow-canvases` as a third fallback path in TopologyController.
The read order becomes:
  1. TenantTopologyStore.getById (xiigen-tenant-topologies + xiigen-flow-templates)
  2. Legacy TopologyStore.listTopologies (xiigen-flow-definitions, currently empty)
  3. [Future] Visual canvas read adapter (xiigen-flow-canvases)

Pros:
- T617 stays untouched; BOLA/OCC guards remain single-sourced.
- The bridge already has a fallback pattern (Finding X — raw passthrough for
  the engine-kernel path); adding a third fallback follows the same pattern.
- Blast radius is bounded to TopologyController + a new visual-canvas adapter.

Cons:
- Complicates the TopologyController bridge.
- Requires a mapper from the visual-canvas node/edge schema to
  TopologyNodeDef/TopologyEdgeDef (separate from Turn 7's mapper).

---

## Decision

**Locked: Option (b).**

Turn 15 does NOT modify T617 and does NOT add a third fallback to
TopologyController in this track. The visual canvas remains a separate
surface (FlowCanvasPage) with its own state machine.

The three-fallback bridge is explicitly deferred to a future track, not
inserted as MVP work. This is documented so the fragmentation is visible
and not forgotten — not hidden under an implicit "they'll unify later."

---

## Consequences

### What works in MVP
- Tenants using the Designer page (DesignerPage + FlowCanvas embedded, Option
  B from Turn 14) save flows directly into xiigen-tenant-topologies and they
  appear in FlowLibraryPage + TopologyViewer.
- Tenants using the FLOW-18 visual canvas (FlowCanvasPage + T617-T620) save
  canvas records into xiigen-flow-canvases and they are NOT visible in
  FlowLibraryPage.

### What requires follow-up
- A future track will extend TopologyController with a `xiigen-flow-canvases`
  fallback plus a canvas→TopologyContract mapper.
- Alternatively, a later track may migrate FlowCanvasPage to delegate its
  underlying storage to TenantTopologyStore (converging the two systems from
  the write side instead of the read side). This would deprecate T617's
  current writer and require migrating its BOLA/OCC guards.

### Non-consequences
- This ADR does not constrain the versioning semantics introduced in Turn 13
  (DRAFT/PUBLISHED/parentVersion) — those apply to xiigen-tenant-topologies
  records regardless of how the canvas fragmentation is eventually resolved.

---

## References
- `server/src/api/topology.controller.ts` — Turn 7 bridge with @Optional()
  TenantTopologyStore injection.
- `server/src/api/visual-flow-engine.controller.ts` — Turn 15 thin routes
  wiring T617-T620.
- `server/src/engine/flows/visual-flow-engine/flow-canvas-writer.service.ts` —
  T617 untouched by this ADR.
- Plan `robust-dreaming-star.md` v27 §Turn 15 commitment row, v22 Finding B.
