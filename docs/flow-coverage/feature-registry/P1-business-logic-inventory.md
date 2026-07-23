# FLOW-36 Business Logic Inventory — Phase 1 Deliverable

**Flow:** Feature Registry (`feature-registry`)
**Classification:** ENGINE_INTERNAL
**Source:** TOPOLOGY
**Source document:** `contracts/topologies/feature-registry.topology.json`

**Topology shape:** 7 nodes, 15 edges. Minimum inventory items: 22.

## Business States & Transitions

1. FeatureExtractor — processing step entered via `system-initialized`
2. FeatureSignalAggregator — processing step entered via `system-initialized`
3. PortingCostEstimator — processing step entered via `system-initialized`
4. PortingDecisionGate — processing step entered via `system-initialized`
5. PlatformAdapterGenerator — processing step entered via `system-initialized`
6. PlatformSimulator — processing step entered via `system-initialized`
7. FeaturePortingOrchestrator — processing step entered via `system-initialized`
8. FeatureExtractionRequested → FeatureExtractor when `` (emits ``)
9. FeatureExtractor → FeatureExtractionCompleted when `` (emits ``)
10. SignalIngested → FeatureSignalAggregator when `` (emits ``)
11. PortingRequested → FeaturePortingOrchestrator when `` (emits ``)
12. FeaturePortingOrchestrator → PortingDecisionGate when `` (emits ``)
13. PortingDecisionGate → PortingProhibited when `portingCandidate === false` (emits ``)
14. PortingDecisionGate → PortingCostEstimator when `portingCandidate === true` (emits ``)
15. PortingCostEstimator → PortingDecisionGate when `` (emits ``)
16. PortingDecisionGate → PortingApproved when `APPROVE` (emits ``)
17. PortingDecisionGate → PortingDeferred when `DEFER` (emits ``)
18. PortingDecisionGate → PortingBlocked when `BLOCK` (emits ``)
19. PortingApproved → PlatformAdapterGenerator when `` (emits ``)
20. PlatformAdapterGenerator → PlatformSimulator when `` (emits ``)
21. PlatformSimulator → PortingComplete when `PASS` (emits ``)
22. PlatformSimulator → PlatformAdapterGenerator when `FAIL` (emits ``)

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery (edge+node formula: 15+7=22):** PASS — 22 items produced.
- **Arbiter 2 — Scope Isolation:** PASS — state descriptions reference nodes/events; no TypeScript types, no file paths, no class names.
- **Arbiter 3 — Terminal State Coverage:** PASS — terminal-labeled edges (condition contains 'terminal') appear as `[TERMINAL]` entries.
- **Arbiter 4 — Iron Rule Labels:** DEFERRED — CF-XX labels require cross-reference with `server/src/engine-contracts/{slug}-bfa-rules.ts`; applied in Phase 9 (edge case discovery) where iron rules directly govern edge cases.
- **Arbiter 5 — Branch Honest Flagging:** PASS (Branch A — no flag required).
