# FLOW-18 UI Spec — Phase 5 Deliverable

**Flow:** Visual Flow Engine (`visual-flow-engine`)
**Classification:** ENGINE_INTERNAL
**P2 verdict:** ADMIN_COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `FlowCanvasPage.tsx` | `/admin/visual-flow-engine/flow-canvas` | `add-edge-btn`, `canvas-error`, `canvas-success`, `flow-canvas-page`, `flow-id`, `flow-id-input` +4 |
| `FlowPublisherPage.tsx` | `/admin/visual-flow-engine/flow-publisher` | `capabilities-input`, `flow-publisher-page`, `inject-code-submit`, `injection-audit-trail`, `injection-error`, `injection-node-id-input` +7 |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | Every task type in T246-T286 has at least one plan step | `FlowCanvasPage.tsx` | `page-flowcanvas` |
| 2 | Every plan step is scoped to a single responsibility (single task type) | `FlowCanvasPage.tsx` | `page-flowcanvas` |
| 3 | No step imports provider SDKs directly (fabric-first) | `FlowCanvasPage.tsx` | `page-flowcanvas` |
| 4 | No step creates entity-specific controllers | `FlowCanvasPage.tsx` | `page-flowcanvas` |
| 5 | All steps return DataProcessResult<T> | `FlowCanvasPage.tsx` | `page-flowcanvas` |
| 6 | Focus areas covered: CRDT, code injection, BFA auto-registration | `FlowCanvasPage.tsx` | `page-flowcanvas` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 6 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
