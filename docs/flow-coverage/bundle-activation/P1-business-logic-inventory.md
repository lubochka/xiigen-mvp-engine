# FLOW-00 Business Logic Inventory — Phase 1 Deliverable

**Flow:** Bundle Activation (`bundle-activation`)
**Classification:** ENGINE_INTERNAL
**Source:** TOPOLOGY
**Source document:** `contracts/topologies/bundle-activation.topology.json`

**Topology shape:** 3 nodes, 7 edges. Minimum inventory items: 10.

## Business States & Transitions

1. BundleValidator — processing step entered via `system-initialized`
2. BundleActivationOrchestrator — processing step entered via `system-initialized`
3. BundleStatusTracker — processing step entered via `system-initialized`
4. BundleActivationRequested → BundleValidator when `` (emits ``)
5. BundleValidator → BundleActivationOrchestrator when `valid === true` (emits ``)
6. BundleValidator → BundleValidationCompleted when `` (emits ``)
7. BundleActivationOrchestrator → BundleActivated when `` (emits ``)
8. flow-lifecycle.regenerated → BundleStatusTracker when `` (emits ``)
9. BundleStatusTracker → BundleDegraded when `versionBelowMinimum` (emits ``)
10. BundleStatusTracker → BundleRestored when `allVersionsMet` (emits ``)

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery (edge+node formula: 7+3=10):** PASS — 10 items produced.
- **Arbiter 2 — Scope Isolation:** PASS — state descriptions reference nodes/events; no TypeScript types, no file paths, no class names.
- **Arbiter 3 — Terminal State Coverage:** PASS — terminal-labeled edges (condition contains 'terminal') appear as `[TERMINAL]` entries.
- **Arbiter 4 — Iron Rule Labels:** DEFERRED — CF-XX labels require cross-reference with `server/src/engine-contracts/{slug}-bfa-rules.ts`; applied in Phase 9 (edge case discovery) where iron rules directly govern edge cases.
- **Arbiter 5 — Branch Honest Flagging:** PASS (Branch A — no flag required).
