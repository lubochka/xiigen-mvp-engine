# FLOW-02 UI Spec — Phase 5 Deliverable

**Flow:** Profile Enrichment (`profile-enrichment`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `MatchingPage.tsx` | `/profile-enrichment/matching` | `connection-count`, `matching-complete`, `matching-in-progress`, `matching-partial`, `page-matching`, `partial-results-notice` |
| `PersonalizationPage.tsx` | `/profile-enrichment/personalization` | `feed-item`, `page-personalization`, `personalization-complete`, `personalization-completed-event`, `personalization-degraded`, `personalization-feed` |
| `QuestionnairePage.tsx` | `/profile-enrichment/questionnaire` | `debounce-pending`, `industry-input`, `page-questionnaire`, `processing`, `questionnaire-form`, `questionnaire-validation-error` +2 |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | ProfileEnrichmentFanIn — fan_in step entered via `OnboardingCompleted event from FLOW-01 (… | `MatchingPage.tsx` | `page-matching` |
| 2 | MatchingConvergenceGate — convergence step entered via `EnrichmentDataReady event (converg… | `MatchingPage.tsx` | `page-matching` |
| 3 | OnboardingCompletionBroadcast — broadcast step entered via `MatchingConverged event` | `MatchingPage.tsx` | `page-matching` |
| 4 | OnboardingCompleted → ProfileEnrichmentFanIn when `from FLOW-01 T49` (emits `xiigen.user-r… | `MatchingPage.tsx` | `page-matching` |
| 5 | ProfileEnrichmentFanIn → MatchingConvergenceGate when `` (emits `xiigen.profile-enrichment… | `MatchingPage.tsx` | `page-matching` |
| 6 | MatchingConvergenceGate → OnboardingCompletionBroadcast when `threshold reached` (emits `x… | `MatchingPage.tsx` | `page-matching` |
| 7 | MatchingConvergenceGate → ProfileEnrichmentFanIn when `below threshold, re-fan-in` (emits … | `MatchingPage.tsx` | `page-matching` |
| 8 | OnboardingCompletionBroadcast → ProfileEnrichmentComplete when `terminal — triggers downst… | `MatchingPage.tsx` | `page-matching` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 8 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
