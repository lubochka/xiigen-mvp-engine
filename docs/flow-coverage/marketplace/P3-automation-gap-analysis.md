# FLOW-08 UI Automation Gap Analysis — Phase 3 Deliverable

**Flow:** Marketplace (`marketplace`)
**Classification:** TENANT_FACING
**P2 verdict:** COVERED

## Spec Files Found (both directories searched)

| Path | Lines | Size (B) | Role |
|------|------:|---------:|------|
| `client/e2e/marketplace-plugin-adapter-crud.spec.ts` | 98 | 4502 | AUTHORITATIVE |
| `client/e2e/sharable-flows-marketplace-crud.spec.ts` | 98 | 4502 | DUPLICATE (merge in P12) |
| `client/e2e/marketplace-plugin-adapter-mock-states.spec.ts` | 36 | 1659 | DUPLICATE (merge in P12) |
| `client/e2e/sharable-flows-marketplace-mock-states.spec.ts` | 36 | 1659 | DUPLICATE (merge in P12) |

| # | Business State | P2 Verdict | Automation | Spec File | Test | Line |
|---|---------------|------------|-----------|-----------|------|------|
| 1 | ListingPublisher — submission_gateway step entered via `POST /listings (audit write FIRST, before mo… | COVERED | NOT_TESTED | `marketplace-plugin-adapter-crud.spec.ts` | — | — |
| 2 | ListingModerationEngine — moderation step entered via `Called inline by T83 (failure → DRAFT, not er… | COVERED | NOT_TESTED | `marketplace-plugin-adapter-crud.spec.ts` | — | — |
| 3 | ListingPriceValidator — guard step entered via `Called inline by T83 (price < 0 reject, price = 0 ac… | COVERED | NOT_TESTED | `marketplace-plugin-adapter-crud.spec.ts` | — | — |
| 4 | CatalogIndexer — data_pipeline step entered via `ListingPublished event (uses F227 ISearchIndexServi… | COVERED | PARTIAL | `marketplace-plugin-adapter-crud.spec.ts` | FLOW-34 — Marketplace Plugin Adapter real CRUD | 22 |
| 5 | ListingFeedGenerator — data_pipeline step entered via `ListingIndexed event (payload: { count: N } o… | COVERED | NOT_TESTED | `marketplace-plugin-adapter-crud.spec.ts` | — | — |
| 6 | ListingAnalyticsAggregator — analytics_engine step entered via `TTL-windowed: conversionRate = inqui… | COVERED | NOT_TESTED | `marketplace-plugin-adapter-crud.spec.ts` | — | — |
| 7 | ListingSaveRequested → ListingPublisher when `` (emits `xiigen.marketplace.save-requested.v1`) | COVERED | PARTIAL | `marketplace-plugin-adapter-crud.spec.ts` | FLOW-34 — Marketplace Plugin Adapter real CRUD | 22 |
| 8 | ListingPublisher → ListingModerationEngine when `inline` (emits `xiigen.marketplace.moderation-inlin… | COVERED | PARTIAL | `marketplace-plugin-adapter-crud.spec.ts` | FLOW-34 — Marketplace Plugin Adapter real CRUD | 22 |
| 9 | ListingPublisher → ListingPriceValidator when `inline` (emits `xiigen.marketplace.price-check-inline… | COVERED | PARTIAL | `marketplace-plugin-adapter-crud.spec.ts` | FLOW-34 — Marketplace Plugin Adapter real CRUD | 22 |
| 10 | ListingPublisher → CatalogIndexer when `moderation passed` (emits `xiigen.marketplace.listing-publis… | COVERED | PARTIAL | `marketplace-plugin-adapter-crud.spec.ts` | FLOW-34 — Marketplace Plugin Adapter real CRUD | 22 |
| 11 | ListingPublisher → ListingDraftSaved when `moderation failed → DRAFT` (emits `xiigen.marketplace.lis… | COVERED | PARTIAL | `marketplace-plugin-adapter-crud.spec.ts` | FLOW-34 — Marketplace Plugin Adapter real CRUD | 22 |
| 12 | CatalogIndexer → ListingFeedGenerator when `` (emits `xiigen.marketplace.listing-indexed.v1`) | COVERED | PARTIAL | `marketplace-plugin-adapter-crud.spec.ts` | FLOW-34 — Marketplace Plugin Adapter real CRUD | 22 |
| 13 | ListingFeedGenerator → ListingAnalyticsAggregator when `` (emits `xiigen.marketplace.feed-generated.… | COVERED | PARTIAL | `marketplace-plugin-adapter-crud.spec.ts` | FLOW-34 — Marketplace Plugin Adapter real CRUD | 22 |
| 14 | ListingAnalyticsAggregator → MarketplaceFlowComplete when `terminal` (emits `xiigen.marketplace.anal… | COVERED | PARTIAL | `marketplace-plugin-adapter-crud.spec.ts` | FLOW-34 — Marketplace Plugin Adapter real CRUD | 22 |

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery:** row count = 14 (= P1 item count). PASS
- **Arbiter 2 — Both Directories Searched:** PASS — both `client/e2e/` AND `e2e/tests/` traversed; results listed in Spec Files section above.
- **Arbiter 3 — Test String Truthfulness:** PASS — TESTED/PARTIAL verdicts cite exact test/describe string with line number from the authoritative spec file.
- **Arbiter 4 — Duplicate Flagging:** PASS — 3 duplicate(s) flagged for Phase 12 consolidation.
