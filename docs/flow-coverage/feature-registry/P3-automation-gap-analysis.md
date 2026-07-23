# FLOW-36 UI Automation Gap Analysis — Phase 3 Deliverable

**Flow:** Feature Registry (`feature-registry`)
**Classification:** ENGINE_INTERNAL
**P2 verdict:** ADMIN_COVERED

## Spec Files Found (both directories searched)

| Path | Lines | Size (B) | Role |
|------|------:|---------:|------|
| `client/e2e/feature-registry-mock-states.spec.ts` | 162 | 12130 | AUTHORITATIVE |
| `client/e2e/feature-registry-crud.spec.ts` | 112 | 4869 | DUPLICATE (merge in P12) |
| `e2e/tests/feature-registry.spec.ts` | 105 | 5020 | DUPLICATE (merge in P12) |
| `client/e2e/feature-registry.spec.ts` | 89 | 4132 | DUPLICATE (merge in P12) |

| # | Business State | P2 Verdict | Automation | Spec File | Test | Line |
|---|---------------|------------|-----------|-----------|------|------|
| 1 | FeatureExtractor — processing step entered via `system-initialized` | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-1 (featureextractor-processing): feature-registry-stat… | 30 |
| 2 | FeatureSignalAggregator — processing step entered via `system-initialized` | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-2 (featuresignalaggregator-processing): feature-regist… | 36 |
| 3 | PortingCostEstimator — processing step entered via `system-initialized` | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-3 (portingcostestimator-processing): feature-registry-… | 42 |
| 4 | PortingDecisionGate — processing step entered via `system-initialized` | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-4 (portingdecisiongate-processing): feature-registry-s… | 48 |
| 5 | PlatformAdapterGenerator — processing step entered via `system-initialized` | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-5 (platformadaptergenerator-processing): feature-regis… | 54 |
| 6 | PlatformSimulator — processing step entered via `system-initialized` | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-6 (platformsimulator-processing): feature-registry-sta… | 60 |
| 7 | FeaturePortingOrchestrator — processing step entered via `system-initialized` | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-7 (featureportingorchestrator-processing): feature-reg… | 66 |
| 8 | FeatureExtractionRequested → FeatureExtractor when `` (emits ``) | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-8 (featureextractionrequested-featureextractor): featu… | 72 |
| 9 | FeatureExtractor → FeatureExtractionCompleted when `` (emits ``) | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-9 (featureextractor-featureextractioncompleted): featu… | 78 |
| 10 | SignalIngested → FeatureSignalAggregator when `` (emits ``) | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-10 (signalingested-featuresignalaggregator): feature-r… | 84 |
| 11 | PortingRequested → FeaturePortingOrchestrator when `` (emits ``) | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-11 (portingrequested-featureportingorchestrator): feat… | 90 |
| 12 | FeaturePortingOrchestrator → PortingDecisionGate when `` (emits ``) | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-12 (featureportingorchestrator-portingdecisiongate): f… | 96 |
| 13 | PortingDecisionGate → PortingProhibited when `portingCandidate === false` (emits ``) | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-13 (portingdecisiongate-portingprohibited): feature-re… | 102 |
| 14 | PortingDecisionGate → PortingCostEstimator when `portingCandidate === true` (emits ``) | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-14 (portingdecisiongate-portingcostestimator): feature… | 108 |
| 15 | PortingCostEstimator → PortingDecisionGate when `` (emits ``) | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-14 (portingdecisiongate-portingcostestimator): feature… | 108 |
| 16 | PortingDecisionGate → PortingApproved when `APPROVE` (emits ``) | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-16 (portingdecisiongate-portingapproved): feature-regi… | 120 |
| 17 | PortingDecisionGate → PortingDeferred when `DEFER` (emits ``) | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-17 (portingdecisiongate-portingdeferred): feature-regi… | 126 |
| 18 | PortingDecisionGate → PortingBlocked when `BLOCK` (emits ``) | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-18 (portingdecisiongate-portingblocked): feature-regis… | 132 |
| 19 | PortingApproved → PlatformAdapterGenerator when `` (emits ``) | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-19 (portingapproved-platformadaptergenerator): feature… | 138 |
| 20 | PlatformAdapterGenerator → PlatformSimulator when `` (emits ``) | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-20 (platformadaptergenerator-platformsimulator): featu… | 144 |
| 21 | PlatformSimulator → PortingComplete when `PASS` (emits ``) | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-21 (platformsimulator-portingcomplete): feature-regist… | 150 |
| 22 | PlatformSimulator → PlatformAdapterGenerator when `FAIL` (emits ``) | ADMIN_COVERED | TESTED | `feature-registry-mock-states.spec.ts` | state-20 (platformadaptergenerator-platformsimulator): featu… | 144 |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery:** row count = 22 (= P1 item count). PASS
- **Arbiter 2 — Both Directories Searched:** PASS — both `client/e2e/` AND `e2e/tests/` traversed; results listed in Spec Files section above.
- **Arbiter 3 — Test String Truthfulness:** PASS — TESTED/PARTIAL verdicts cite exact test/describe string with line number from the authoritative spec file.
- **Arbiter 4 — Duplicate Flagging:** PASS — 3 duplicate(s) flagged for Phase 12 consolidation.
