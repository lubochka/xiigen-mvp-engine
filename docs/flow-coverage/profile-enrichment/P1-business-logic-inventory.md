# FLOW-02 Business Logic Inventory — Phase 1 Deliverable

**Flow:** Profile Enrichment (`profile-enrichment`)
**Classification:** TENANT_FACING
**Source:** TOPOLOGY
**Source document:** `contracts/topologies/profile-enrichment.topology.json`

**Topology shape:** 3 nodes, 5 edges. Minimum inventory items: 8.

## Business States & Transitions

1. ProfileEnrichmentFanIn — fan_in step entered via `OnboardingCompleted event from FLOW-01 (T49)`
2. MatchingConvergenceGate — convergence step entered via `EnrichmentDataReady event (convergence_threshold_from_freedom_config)`
3. OnboardingCompletionBroadcast — broadcast step entered via `MatchingConverged event`
4. OnboardingCompleted → ProfileEnrichmentFanIn when `from FLOW-01 T49` (emits `xiigen.user-registration.onboarding-completed.v1`)
5. ProfileEnrichmentFanIn → MatchingConvergenceGate when `` (emits `xiigen.profile-enrichment.enrichment-data-ready.v1`)
6. MatchingConvergenceGate → OnboardingCompletionBroadcast when `threshold reached` (emits `xiigen.profile-enrichment.matching-converged.v1`)
7. MatchingConvergenceGate → ProfileEnrichmentFanIn when `below threshold, re-fan-in` (emits `xiigen.profile-enrichment.needs-more-data.v1`)
8. OnboardingCompletionBroadcast → ProfileEnrichmentComplete when `terminal — triggers downstream flows` (emits `xiigen.profile-enrichment.completed.v1`) [TERMINAL]

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery (edge+node formula: 5+3=8):** PASS — 8 items produced.
- **Arbiter 2 — Scope Isolation:** PASS — state descriptions reference nodes/events; no TypeScript types, no file paths, no class names.
- **Arbiter 3 — Terminal State Coverage:** PASS — terminal-labeled edges (condition contains 'terminal') appear as `[TERMINAL]` entries.
- **Arbiter 4 — Iron Rule Labels:** DEFERRED — CF-XX labels require cross-reference with `server/src/engine-contracts/{slug}-bfa-rules.ts`; applied in Phase 9 (edge case discovery) where iron rules directly govern edge cases.
- **Arbiter 5 — Branch Honest Flagging:** PASS (Branch A — no flag required).
