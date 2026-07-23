# FLOW-08 Business Logic Inventory — Phase 1 Deliverable

**Flow:** Marketplace (`marketplace`)
**Classification:** TENANT_FACING
**Source:** TOPOLOGY
**Source document:** `contracts/topologies/marketplace.topology.json`

**Topology shape:** 6 nodes, 8 edges. Minimum inventory items: 14.

## Business States & Transitions

1. ListingPublisher — submission_gateway step entered via `POST /listings (audit write FIRST, before moderation/price/persist)`
2. ListingModerationEngine — moderation step entered via `Called inline by T83 (failure → DRAFT, not error)`
3. ListingPriceValidator — guard step entered via `Called inline by T83 (price < 0 reject, price = 0 accept as free)`
4. CatalogIndexer — data_pipeline step entered via `ListingPublished event (uses F227 ISearchIndexService from FLOW-07)`
5. ListingFeedGenerator — data_pipeline step entered via `ListingIndexed event (payload: { count: N } only)`
6. ListingAnalyticsAggregator — analytics_engine step entered via `TTL-windowed: conversionRate = inquiries / (views || 1)`
7. ListingSaveRequested → ListingPublisher when `` (emits `xiigen.marketplace.save-requested.v1`)
8. ListingPublisher → ListingModerationEngine when `inline` (emits `xiigen.marketplace.moderation-inline.v1`)
9. ListingPublisher → ListingPriceValidator when `inline` (emits `xiigen.marketplace.price-check-inline.v1`)
10. ListingPublisher → CatalogIndexer when `moderation passed` (emits `xiigen.marketplace.listing-published.v1`)
11. ListingPublisher → ListingDraftSaved when `moderation failed → DRAFT` (emits `xiigen.marketplace.listing-drafted.v1`)
12. CatalogIndexer → ListingFeedGenerator when `` (emits `xiigen.marketplace.listing-indexed.v1`)
13. ListingFeedGenerator → ListingAnalyticsAggregator when `` (emits `xiigen.marketplace.feed-generated.v1`)
14. ListingAnalyticsAggregator → MarketplaceFlowComplete when `terminal` (emits `xiigen.marketplace.analytics-recorded.v1`) [TERMINAL]

## Arbiter Verdicts

- **Arbiter 1 — Goal Delivery (edge+node formula: 8+6=14):** PASS — 14 items produced.
- **Arbiter 2 — Scope Isolation:** PASS — state descriptions reference nodes/events; no TypeScript types, no file paths, no class names.
- **Arbiter 3 — Terminal State Coverage:** PASS — terminal-labeled edges (condition contains 'terminal') appear as `[TERMINAL]` entries.
- **Arbiter 4 — Iron Rule Labels:** DEFERRED — CF-XX labels require cross-reference with `server/src/engine-contracts/{slug}-bfa-rules.ts`; applied in Phase 9 (edge case discovery) where iron rules directly govern edge cases.
- **Arbiter 5 — Branch Honest Flagging:** PASS (Branch A — no flag required).
