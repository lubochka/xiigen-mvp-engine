# FLOW-00 UI Spec — Phase 5 Deliverable

**Flow:** Bundle Activation (`bundle-activation`)
**Classification:** ENGINE_INTERNAL
**P2 verdict:** ADMIN_COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `BundleActivationPage.tsx` | `/admin/bundle-activation/bundle-activation` | `page-bundle-activation` |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | BundleValidator — processing step entered via `system-initialized` | `BundleActivationPage.tsx` | `page-bundleactivation` |
| 2 | BundleActivationOrchestrator — processing step entered via `system-initialized` | `BundleActivationPage.tsx` | `page-bundleactivation` |
| 3 | BundleStatusTracker — processing step entered via `system-initialized` | `BundleActivationPage.tsx` | `page-bundleactivation` |
| 4 | BundleActivationRequested → BundleValidator when `` (emits ``) | `BundleActivationPage.tsx` | `page-bundleactivation` |
| 5 | BundleValidator → BundleActivationOrchestrator when `valid === true` (emits ``) | `BundleActivationPage.tsx` | `page-bundleactivation` |
| 6 | BundleValidator → BundleValidationCompleted when `` (emits ``) | `BundleActivationPage.tsx` | `page-bundleactivation` |
| 7 | BundleActivationOrchestrator → BundleActivated when `` (emits ``) | `BundleActivationPage.tsx` | `page-bundleactivation` |
| 8 | flow-lifecycle.regenerated → BundleStatusTracker when `` (emits ``) | `BundleActivationPage.tsx` | `page-bundleactivation` |
| 9 | BundleStatusTracker → BundleDegraded when `versionBelowMinimum` (emits ``) | `BundleActivationPage.tsx` | `page-bundleactivation` |
| 10 | BundleStatusTracker → BundleRestored when `allVersionsMet` (emits ``) | `BundleActivationPage.tsx` | `page-bundleactivation` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 10 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
