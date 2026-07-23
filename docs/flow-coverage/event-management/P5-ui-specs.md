# FLOW-03 UI Spec — Phase 5 Deliverable

**Flow:** Event Management (`event-management`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `EventCreationPage.tsx` | `/event-management/event-creation` | `back-to-events-link`, `cancel-link`, `capacity-input`, `created-event-id`, `event-created`, `event-creation-error` +11 |
| `EventListPage.tsx` | `/event-management/event-list` | `create-event-button`, `create-first-event-link`, `event-capacity-label`, `event-count`, `event-item`, `event-list` +8 |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | EventCreationOrchestrator — orchestration step entered via `POST /events (create draft)` | `EventCreationPage.tsx` | `page-eventcreation` |
| 2 | EventRegistrationManager — processing step entered via `EventPublished event (atomic capac… | `EventCreationPage.tsx` | `page-eventcreation` |
| 3 | EventPromotionEngine — processing step entered via `EventPromotionRequested event (content… | `EventCreationPage.tsx` | `page-eventcreation` |
| 4 | EventAnalyticsTracker — observability step entered via `TTL-windowed counter (views, regis… | `EventCreationPage.tsx` | `page-eventcreation` |
| 5 | EventCreationRequested → EventCreationOrchestrator when `` (emits `xiigen.event-management… | `EventCreationPage.tsx` | `page-eventcreation` |
| 6 | EventCreationOrchestrator → EventRegistrationManager when `` (emits `xiigen.event-manageme… | `EventCreationPage.tsx` | `page-eventcreation` |
| 7 | EventCreationOrchestrator → EventPromotionEngine when `promotion enabled` (emits `xiigen.e… | `EventCreationPage.tsx` | `page-eventcreation` |
| 8 | EventRegistrationManager → EventAnalyticsTracker when `` (emits `xiigen.event-management.r… | `EventCreationPage.tsx` | `page-eventcreation` |
| 9 | EventPromotionEngine → EventAnalyticsTracker when `` (emits `xiigen.event-management.promo… | `EventCreationPage.tsx` | `page-eventcreation` |
| 10 | EventAnalyticsTracker → EventLifecycleComplete when `terminal` (emits `xiigen.event-manage… | `EventCreationPage.tsx` | `page-eventcreation` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 10 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
