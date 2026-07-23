# FLOW-36 UI Spec — Phase 5 Deliverable

**Flow:** Feature Registry (`feature-registry`)
**Classification:** ENGINE_INTERNAL
**P2 verdict:** ADMIN_COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `FeatureRegistryPage.tsx` | `/admin/feature-registry/feature-registry` | `page-feature-registry` |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | FeatureExtractor — processing step entered via `system-initialized` | `FeatureRegistryPage.tsx` | `page-featureregistry` |
| 2 | FeatureSignalAggregator — processing step entered via `system-initialized` | `FeatureRegistryPage.tsx` | `page-featureregistry` |
| 3 | PortingCostEstimator — processing step entered via `system-initialized` | `FeatureRegistryPage.tsx` | `page-featureregistry` |
| 4 | PortingDecisionGate — processing step entered via `system-initialized` | `FeatureRegistryPage.tsx` | `page-featureregistry` |
| 5 | PlatformAdapterGenerator — processing step entered via `system-initialized` | `FeatureRegistryPage.tsx` | `page-featureregistry` |
| 6 | PlatformSimulator — processing step entered via `system-initialized` | `FeatureRegistryPage.tsx` | `page-featureregistry` |
| 7 | FeaturePortingOrchestrator — processing step entered via `system-initialized` | `FeatureRegistryPage.tsx` | `page-featureregistry` |
| 8 | FeatureExtractionRequested → FeatureExtractor when `` (emits ``) | `FeatureRegistryPage.tsx` | `page-featureregistry` |
| 9 | FeatureExtractor → FeatureExtractionCompleted when `` (emits ``) | `FeatureRegistryPage.tsx` | `page-featureregistry` |
| 10 | SignalIngested → FeatureSignalAggregator when `` (emits ``) | `FeatureRegistryPage.tsx` | `page-featureregistry` |
| 11 | PortingRequested → FeaturePortingOrchestrator when `` (emits ``) | `FeatureRegistryPage.tsx` | `page-featureregistry` |
| 12 | FeaturePortingOrchestrator → PortingDecisionGate when `` (emits ``) | `FeatureRegistryPage.tsx` | `page-featureregistry` |
| 13 | PortingDecisionGate → PortingProhibited when `portingCandidate === false` (emits ``) | `FeatureRegistryPage.tsx` | `page-featureregistry` |
| 14 | PortingDecisionGate → PortingCostEstimator when `portingCandidate === true` (emits ``) | `FeatureRegistryPage.tsx` | `page-featureregistry` |
| 15 | PortingCostEstimator → PortingDecisionGate when `` (emits ``) | `FeatureRegistryPage.tsx` | `page-featureregistry` |
| 16 | PortingDecisionGate → PortingApproved when `APPROVE` (emits ``) | `FeatureRegistryPage.tsx` | `page-featureregistry` |
| 17 | PortingDecisionGate → PortingDeferred when `DEFER` (emits ``) | `FeatureRegistryPage.tsx` | `page-featureregistry` |
| 18 | PortingDecisionGate → PortingBlocked when `BLOCK` (emits ``) | `FeatureRegistryPage.tsx` | `page-featureregistry` |
| 19 | PortingApproved → PlatformAdapterGenerator when `` (emits ``) | `FeatureRegistryPage.tsx` | `page-featureregistry` |
| 20 | PlatformAdapterGenerator → PlatformSimulator when `` (emits ``) | `FeatureRegistryPage.tsx` | `page-featureregistry` |
| 21 | PlatformSimulator → PortingComplete when `PASS` (emits ``) | `FeatureRegistryPage.tsx` | `page-featureregistry` |
| 22 | PlatformSimulator → PlatformAdapterGenerator when `FAIL` (emits ``) | `FeatureRegistryPage.tsx` | `page-featureregistry` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 22 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
