# FLOW-08 UI Spec — Phase 5 Deliverable

**Flow:** Marketplace (`marketplace`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED
**Authoring mode:** VALIDATE_EXISTING

## Existing Pages & Proposed Routes

| Page | Proposed Route | Data-testids Found |
|------|---------------|--------------------|
| `BootstrapStatusPage.tsx` | `/marketplace/bootstrap-status` | `audience-size`, `batch-count`, `bootstrap-complete-indicator`, `bootstrap-error`, `bootstrap-item`, `bootstrap-list-section` +5 |
| `EventDiscoveryPage.tsx` | `/marketplace/event-discovery` | `event-capacity`, `event-card`, `event-category`, `event-discovery-page`, `event-name`, `event-status` +5 |
| `EventRegistrationPage.tsx` | `/marketplace/event-registration` | `event-id`, `event-registration-page`, `existing-registration`, `rate-limit-message`, `register-btn`, `registration-blocked` +3 |
| `ParticipationStatusPage.tsx` | `/marketplace/participation-status` | `analytics-item`, `analytics-section`, `no-participation-analytics`, `no-registrations`, `participation-error`, `participation-loading` +4 |
| `PurchaseHistoryPage.tsx` | `/marketplace/purchase-history` | `no-purchases`, `purchase-amount`, `purchase-category`, `purchase-event`, `purchase-history-page`, `purchase-item` +3 |

## Per-State UI Assignment

| # | Business State | Target Page | Data-testid Hook |
|---|---------------|-------------|------------------|
| 1 | ListingPublisher — submission_gateway step entered via `POST /listings (audit write FIRST,… | `BootstrapStatusPage.tsx` | `page-bootstrapstatus` |
| 2 | ListingModerationEngine — moderation step entered via `Called inline by T83 (failure → DRA… | `BootstrapStatusPage.tsx` | `page-bootstrapstatus` |
| 3 | ListingPriceValidator — guard step entered via `Called inline by T83 (price < 0 reject, pr… | `BootstrapStatusPage.tsx` | `page-bootstrapstatus` |
| 4 | CatalogIndexer — data_pipeline step entered via `ListingPublished event (uses F227 ISearch… | `BootstrapStatusPage.tsx` | `page-bootstrapstatus` |
| 5 | ListingFeedGenerator — data_pipeline step entered via `ListingIndexed event (payload: { co… | `BootstrapStatusPage.tsx` | `page-bootstrapstatus` |
| 6 | ListingAnalyticsAggregator — analytics_engine step entered via `TTL-windowed: conversionRa… | `BootstrapStatusPage.tsx` | `page-bootstrapstatus` |
| 7 | ListingSaveRequested → ListingPublisher when `` (emits `xiigen.marketplace.save-requested.… | `BootstrapStatusPage.tsx` | `page-bootstrapstatus` |
| 8 | ListingPublisher → ListingModerationEngine when `inline` (emits `xiigen.marketplace.modera… | `BootstrapStatusPage.tsx` | `page-bootstrapstatus` |
| 9 | ListingPublisher → ListingPriceValidator when `inline` (emits `xiigen.marketplace.price-ch… | `BootstrapStatusPage.tsx` | `page-bootstrapstatus` |
| 10 | ListingPublisher → CatalogIndexer when `moderation passed` (emits `xiigen.marketplace.list… | `BootstrapStatusPage.tsx` | `page-bootstrapstatus` |
| 11 | ListingPublisher → ListingDraftSaved when `moderation failed → DRAFT` (emits `xiigen.marke… | `BootstrapStatusPage.tsx` | `page-bootstrapstatus` |
| 12 | CatalogIndexer → ListingFeedGenerator when `` (emits `xiigen.marketplace.listing-indexed.v… | `BootstrapStatusPage.tsx` | `page-bootstrapstatus` |
| 13 | ListingFeedGenerator → ListingAnalyticsAggregator when `` (emits `xiigen.marketplace.feed-… | `BootstrapStatusPage.tsx` | `page-bootstrapstatus` |
| 14 | ListingAnalyticsAggregator → MarketplaceFlowComplete when `terminal` (emits `xiigen.market… | `BootstrapStatusPage.tsx` | `page-bootstrapstatus` |

## Phase 6 Work Items

**Action:** spec validation only — pages already routed. Verify data-testid coverage for every P1 state.

## Arbiter Verdicts

- **Arbiter 1 — Per-state coverage:** row count = 14 (= P1 item count). PASS
- **Arbiter 2 — Route proposal truthfulness:** PASS — routes derived deterministically from page file names (kebab-case) + classification prefix.
- **Arbiter 3 — Data-testid grounding:** PASS — existing testids extracted directly from page source; hints for new pages follow `page-<slug>` convention.
- **Arbiter 4 — Mode correctness:** PASS — WIRE_EXISTING/AUTHOR_NEW/VALIDATE_EXISTING assigned from P2 verdict.
