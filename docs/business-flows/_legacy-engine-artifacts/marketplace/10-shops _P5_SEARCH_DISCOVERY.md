# FLOW-10 — P5: SEARCH & DISCOVERY
## CMS + Commerce + Multi-Tenant Platform Engine
## Family 36 | F315–F319 | Save Point: FLOW10:MERGE:P5
## Merge Target: ENGINE_ARCHITECTURE_MERGED.md
## Sequence: F309–F314 complete (P4). This file: F315–F319.

---

# ═══════════════════════════════════════════════════
# FAMILY 36 — SEARCH & DISCOVERY
# F315–F319 | Cross-domain search, facets, recommendations, cache
# ═══════════════════════════════════════════════════

## Family Overview

**Purpose:** All search, faceting, recommendation, and CDN cache invalidation
operations. Feeds from domain events (product.updated, content.published)
via QUEUE FABRIC consumer groups — never called directly by the writing service.
Tenant isolation is mandatory: every search query MUST include tenantId filter
(DNA-5). A search query returning records from another tenant is a BOLA violation
(OWASP API1:2023) and is treated as a BUILD FAILURE.

**Search strategy via RAG FABRIC:**
  Resolved at runtime via F245.GetProviderBindingAsync("search").
  Options (tenant-configurable via FREEDOM): Elasticsearch native (default),
  external vector search (for AI-powered similarity), or hybrid.
  Service code calls IRagService.SearchAsync() — never the ES client directly.

**Composition with FLOW-08 (not duplication):**
  - F245 ITenantConfigService — provider bindings (CDN, search strategy, AI)
  - F251 ITenantEntitlementService — AI recommendation entitlement gate
  - F250 ITenantAuditService — re-index audit trail

**Composition with FLOW-10:**
  - F288 IProductCatalogService (Family 32) — product index source
  - F297 IContentEntityService (Family 33) — content index source
  - F307 IOutboxEventService (Family 34) — index update events

**Fabrics used:**
  - DATABASE FABRIC (Skill 05) → Elasticsearch (primary index)
  - AI ENGINE FABRIC (Skill 06/07) → embeddings for recommendation engine
  - RAG FABRIC (Skill 00a/00b) → search strategy selection
  - QUEUE FABRIC (Skill 04) → index update event consumption

---

## F315: ISearchIndexService

**Description:**
  Indexes entity documents (products, content, orders, users) into the
  search infrastructure. Called by queue consumers, not by domain services.
  The domain service emits an event; the search consumer calls IndexDocumentAsync.
  This decoupling ensures the primary write path is never blocked by indexing.

**FABRIC:** DATABASE FABRIC (Skill 05) → Elasticsearch provider
  QUEUE FABRIC (Skill 04) → Redis Streams (index event consumption)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
IndexDocumentAsync(tenantId: string, indexType: string,
                   document: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  indexType: "product" | "content" | "order" | "customer" | custom
  document: MUST contain tenantId and entityId at minimum
  Idempotent: re-indexing same entityId overwrites previous document
  Returns: indexedId, indexType, indexedAt, shardInfo

BulkIndexAsync(tenantId: string, indexType: string,
               documents: List<Dictionary<string,object>>)
  → DataProcessResult<Dictionary<string,object>>
  Returns: indexed (int), failed (int), errors[]
  Used by product bulk import (F288), full re-index, migration

DeleteFromIndexAsync(tenantId: string, indexType: string, entityId: string)
  → DataProcessResult<bool>
  Called on entity delete/archive events

ReindexTenantAsync(tenantId: string, indexType: string)
  → DataProcessResult<Dictionary<string,object>>
  Full re-index for a tenant. Async — returns jobId.
  Checks F251 entitlement (large re-index = quota event in F250)

GetIndexStatusAsync(tenantId: string, indexType: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns: documentCount, lastUpdated, indexHealth, lagSeconds (vs domain)

ValidateTenantScopingAsync(tenantId: string, indexType: string)
  → DataProcessResult<Dictionary<string,object>>
  Smoke-test: verifies all documents in index have matching tenantId.
  Returns: valid (bool), missingTenantId (int), wrongTenantId (int)
  USED IN: CF-96 BFA cross-tenant exposure check (FLOW-10 BFA rules)
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Index documents = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | BulkIndex + status: empty fields auto-skipped | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | SearchIndexServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId REQUIRED on every indexed document — IRON RULE | ✅ |
| DNA-6 DynamicController | DynamicController handles index management endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on bulk filter | ✅ |
| DNA-8 (as applicable) | ValidateTenantScopingAsync is a BFA-callable diagnostic | ✅ |
| DNA-9 Saga Compensation | ReindexTenantAsync is idempotent — re-run safe | ✅ |

---

## F316: ISearchQueryService

**Description:**
  Full-text + faceted + filtered search across all indexed entity types.
  EVERY query MUST include tenantId — this is enforced at the service level
  AND validated by AF-7 (Compliance station) in the AF pipeline.
  Search strategy (ES native, vector, hybrid) is resolved via RAG FABRIC
  per tenant config.

**FABRIC:** RAG FABRIC (Skill 00a/00b) → search strategy provider
  DATABASE FABRIC (Skill 05) → Elasticsearch (default strategy)
  AI ENGINE FABRIC (Skill 06/07) → vector embeddings (if vector/hybrid strategy)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
SearchAsync(tenantId: string, query: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  query: q (fullText), indexType, filters{}, sortBy, page, pageSize
  MANDATORY: tenantId filter injected automatically (cannot be overridden)
  filters are ADDITIVE to tenantId (BuildSearchFilter handles empty fields)
  Returns: hits[], total, took (ms), facets{} (if requested)

MultiIndexSearchAsync(tenantId: string, query: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  Searches across multiple indexTypes in one query (product + content + etc)
  Returns: results by indexType{}

GetSearchSuggestionsAsync(tenantId: string, prefix: string, indexType: string)
  → DataProcessResult<List<Dictionary<string,object>>>
  Autocomplete/typeahead for search UI

ExplainSearchAsync(tenantId: string, query: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  Debug endpoint: returns relevance scoring breakdown per result
  Only available in non-production environments (F251 entitlement gated)
```

**IRON RULE: AUTO-INJECT TENANT FILTER**
  F316 auto-injects tenantId as a mandatory AND filter on every Elasticsearch query.
  The developer calling SearchAsync() CANNOT skip it, override it, or remove it.
  This is DNA-5 enforcement at the deepest level. See DR-35 + DD-47.

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Search results = Dictionary<string,object> hits | ✅ |
| DNA-2 BuildSearchFilter | All filter fields optional; tenantId is auto-injected | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | SearchQueryServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId ALWAYS injected — cannot be bypassed | ✅ |
| DNA-6 DynamicController | DynamicController handles search query endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on all filter construction | ✅ |
| DNA-8 (as applicable) | Search strategy resolved via RAG FABRIC per tenant config | ✅ |
| DNA-9 Saga Compensation | N/A — read-only operations | ✅ |

---

## F317: IFacetService

**Description:**
  Dynamic facet computation for filtering UIs (price ranges, categories,
  brands, availability, tags). Facets are tenant-scoped and computed against
  the live search index. Facet definitions are configurable per entity type
  (FREEDOM). Cached in Redis with configurable TTL to reduce re-computation.

**FABRIC:** DATABASE FABRIC (Skill 05) → Elasticsearch (aggregations)
  DATABASE FABRIC (Skill 05) → Redis (facet result cache)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
ComputeFacetsAsync(tenantId: string, indexType: string,
                   baseFilter: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  baseFilter: current active filters (facets computed within filtered context)
  Returns: facets{fieldName: {type: range|terms, buckets:[], count}}
  Cached: TTL from F245 config (default 60s)

GetFacetDefinitionsAsync(tenantId: string, indexType: string)
  → DataProcessResult<List<Dictionary<string,object>>>
  Returns configured facet fields for this entity type (from F245)

InvalidateFacetCacheAsync(tenantId: string, indexType: string)
  → DataProcessResult<bool>
  Called by F315 after bulk re-index

UpsertFacetDefinitionAsync(tenantId: string, indexType: string,
                            definition: Dictionary<string,object>)
  → DataProcessResult<bool>
  Admin: configure which fields are facetable for this entity type
  definition: fieldName, facetType (range|terms), label, sortOrder
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Facet results = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | baseFilter: empty fields auto-skipped | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | FacetServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on all ES aggregation queries | ✅ |
| DNA-6 DynamicController | DynamicController handles facet endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on baseFilter construction | ✅ |
| DNA-8 (as applicable) | Cache keys include tenantId + indexType (no cross-tenant cache leak) | ✅ |
| DNA-9 Saga Compensation | Cache invalidation is idempotent — safe to re-run | ✅ |

---

## F318: ICachePurgeService

**Description:**
  CDN and application cache invalidation. Called by domain event consumers
  after: content.published, product.updated, price.changed, inventory.changed.
  CDN provider (Cloudflare, Fastly, CloudFront, custom) resolved via
  F245.GetProviderBindingAsync("cdn"). Never imports CDN SDK directly.
  Purge operations are queued and batched to avoid CDN rate limits.

**FABRIC:** DATABASE FABRIC (Skill 05) → Redis (purge job queue)
  QUEUE FABRIC (Skill 04) → Redis Streams (purge event consumption)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
PurgeByUrlAsync(tenantId: string, urls: List<string>)
  → DataProcessResult<Dictionary<string,object>>
  Queues URL-based purge. CDN provider resolved via F245.
  Returns: purgeJobId, urlCount, status="queued"

PurgeByTagAsync(tenantId: string, tags: List<string>)
  → DataProcessResult<Dictionary<string,object>>
  Tag-based surrogate cache key purge (for CDNs that support it)
  tags: ["product:123", "collection:456", "content:789"]

PurgeByPatternAsync(tenantId: string, patterns: List<string>)
  → DataProcessResult<Dictionary<string,object>>
  Wildcard/prefix purge (e.g., "/products/*")

GetPurgeStatusAsync(tenantId: string, purgeJobId: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns: status, purgedUrls (int), failedUrls (int), completedAt

PurgeAllAsync(tenantId: string)
  → DataProcessResult<Dictionary<string,object>>
  Full tenant cache purge. F251 quota check (expensive operation).
  Returns: jobId, estimatedUrls, status="queued"
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Purge records = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | N/A — list-based operations | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | CachePurgeServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on all purge records + CDN tag namespacing | ✅ |
| DNA-6 DynamicController | DynamicController handles purge endpoints | ✅ |
| DNA-7 BuildQueryFilters | N/A for purge operations | ✅ |
| DNA-8 (as applicable) | CDN provider resolved via F245 — never hardcoded | ✅ |
| DNA-9 Saga Compensation | Purge is idempotent — re-purge is safe | ✅ |

---

## F319: IRecommendationService

**Description:**
  AI-backed content and product recommendations. "Related posts", "You may
  also like", "Frequently bought together", "Similar products". AI engine
  resolved via F245 provider binding ("ai"). Embedding generation via
  AI ENGINE FABRIC. Graph traversal (purchased-together) via DATABASE FABRIC.
  Gated by F251 entitlement check ("ai_recommendations").

**FABRIC:** AI ENGINE FABRIC (Skill 06/07) → embedding generation
  DATABASE FABRIC (Skill 05) → Elasticsearch (vector similarity) or Neo4j (graph)
  RAG FABRIC (Skill 00b) → similarity strategy selection
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})
**COMPOSES:** F245 (ITenantConfigService) for AI provider binding, F251 (ITenantEntitlementService) for feature gate, F315 (ISearchIndexService) for embedding index, F288 (IProductCatalogService) for product metadata, F297 (IContentEntityService) for content metadata

**METHODS:**
```
GetSimilarContentAsync(tenantId: string, contentId: string,
                        context: Dictionary<string,object>)
  → DataProcessResult<List<Dictionary<string,object>>>
  context: limit, strategy (vector|tag_overlap|hybrid), filters{}
  Returns: recommendations[] each with entityId, score, reasons[]

GetSimilarProductsAsync(tenantId: string, productId: string,
                         context: Dictionary<string,object>)
  → DataProcessResult<List<Dictionary<string,object>>>

GetFrequentlyBoughtTogetherAsync(tenantId: string, productId: string, limit: int)
  → DataProcessResult<List<Dictionary<string,object>>>
  Graph-based: uses order line item co-occurrence

GetPersonalizedRecommendationsAsync(tenantId: string, customerId: string,
                                     context: Dictionary<string,object>)
  → DataProcessResult<List<Dictionary<string,object>>>
  context: entityType (product|content), limit, channel
  Gated: F251.IsFeatureEnabledAsync("ai_personalized_recommendations")

RecordInteractionAsync(tenantId: string, event: Dictionary<string,object>)
  → DataProcessResult<bool>
  event: customerId, entityId, entityType, interaction (view|purchase|click)
  Feeds recommendation model improvement pipeline
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Recommendation results = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | context.filters: empty fields auto-skipped | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | RecommendationServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on all queries + recommendation records | ✅ |
| DNA-6 DynamicController | DynamicController handles recommendation endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on context.filters | ✅ |
| DNA-8 (as applicable) | AI recommendation gated by F251 entitlement | ✅ |
| DNA-9 Saga Compensation | N/A — read-only + append-only interaction log | ✅ |

---

# ═══════════════════════════════════════════════════
# DESIGN RECORD — DR-35
# ═══════════════════════════════════════════════════

## DR-35: Search Tenant Isolation as Build Failure Criterion

**CONTEXT:** In a multi-tenant search system, missing tenantId filter on a single
query exposes EVERY tenant's data to EVERY other tenant. This is BOLA
(OWASP API1:2023) — not a warning, not a log entry, but a data breach.

**Decision:** Any generated search query that does NOT include tenantId as a
mandatory filter is a BUILD FAILURE.

**Enforcement layers (defense in depth):**
  1. **F316 auto-inject:** ISearchQueryService auto-injects tenantId as mandatory
     AND filter. Cannot be bypassed, overridden, or removed by calling code.
  2. **AF-7 (Compliance station):** Scans generated consumer code for raw ES queries
     without tenantId filter → rejects with BUILD FAILURE.
  3. **F315.ValidateTenantScopingAsync:** Post-deployment smoke-test verifies all
     documents in index have matching tenantId.
  4. **BFA rule CF-96:** Cross-tenant data exposure detected at conflict check.

**Consequence for developer ergonomics:** Developers do NOT need to remember to
add tenantId to search queries. The service enforces it. This is FREEDOM removed
for safety, not restriction for restriction's sake. No "warn and ship."

---

# ═══════════════════════════════════════════════════
# DESIGN DECISIONS — DD-46, DD-47
# ═══════════════════════════════════════════════════

## DD-46: ESP/CDN Abstraction via AI ENGINE FABRIC Provider Binding

**Decision:** CDN providers (F318) and later email/SMS providers (F322/F323 in P6)
are resolved through the same factory pattern as AI model providers, using
F245.GetProviderBindingAsync() with binding keys "cdn", "email", "sms".

**Rationale:** The factory pattern proven for AI providers (Claude → OpenAI → Gemini
via config) applies identically to external service providers. Swapping
Cloudflare → Fastly → CloudFront requires only F245 config update.
No redeployment. No code change. AF-7 (Compliance) rejects any generated code
containing `cloudflare`, `fastly`, or `cloudfront` as direct imports.

**Alternative rejected:** Separate "CDN fabric" or "notification fabric" — 
over-engineering. The existing fabric + factory pattern handles any external
provider uniformly.

## DD-47: Search Auto-Inject Tenant Filter — Not Developer Responsibility

**Decision:** F316.SearchAsync() auto-injects tenantId as a mandatory AND filter.
The calling code cannot override or remove it.

**Why auto-inject, not trust-the-developer:** In a multi-tenant system with
potentially 100,000+ tenants, the BOLA risk of a single missed tenantId filter
is catastrophic — every tenant's data exposed. Defense in depth: auto-inject at
service level + AF-7 compliance scan + F315.ValidateTenantScopingAsync
smoke-test post-deployment.

**This is FREEDOM removed for safety:** Developers do not need to remember to add
tenantId to search queries. The service enforces it. This improves both security
AND developer experience simultaneously.

---

# ═══════════════════════════════════════════════════
# FAMILY 36 SUMMARY
# ═══════════════════════════════════════════════════

| Interface | F# | Fabric | Primary Purpose | Composes |
|-----------|-----|--------|----------------|----------|
| ISearchIndexService | F315 | DATABASE (ES) + QUEUE | Index entity documents | F288, F297, F307 |
| ISearchQueryService | F316 | RAG + DATABASE (ES) | Full-text + faceted search (tenant auto-inject) | F315 |
| IFacetService | F317 | DATABASE (ES + Redis) | Dynamic facet computation + cache | F316, F245 |
| ICachePurgeService | F318 | DATABASE (Redis) + QUEUE | CDN cache invalidation via fabric | F245 |
| IRecommendationService | F319 | AI ENGINE + RAG + DATABASE | Personalized recommendations | F245, F251, F315 |

**Total Methods:** 5 interfaces × ~5 methods avg = **~24 methods**
**DNA Compliance Total:** 5 interfaces × 9 patterns = **45/45 ✅**
**Design Records:** DR-35
**Design Decisions:** DD-46, DD-47
**Composition Dependencies:** F245, F250, F251 (FLOW-08), F288, F297, F307 (FLOW-10 P1-P3)

---

## MERGE INSTRUCTIONS

When merging into ENGINE_ARCHITECTURE_MERGED.md:

1. Append Family 36 after Family 35 (Extensibility Platform)
2. Update the merge audit table with:
   ```
   | 2026-02-26 | FLOW-10 P5 merge | F315-F319 (+5) | — | — | Family 36, DR-35, DD-46-DD-47, 45/45 DNA |
   ```
3. Update system state:
   ```
   FACTORIES: F1-F319 (319 total)
   FAMILIES: 1-36 (36 total)
   ```

## System State Update (Post Family 36 / FLOW-10 Phase 5)

| Metric | Pre-Phase 5 | Post-Phase 5 | Delta |
|--------|-------------|-------------|-------|
| Factory Interfaces | F314 | F319 | +5 |
| Factory Families | 35 | 36 | +1 |
| Methods | ~1601 est | ~1625 est | +24 |
| DNA Checks | all pass | 45/45 new | ✅ |
| Design Records | DR-34 | DR-35 | +1 |
| Design Decisions | DD-45 | DD-47 | +2 |

---

## PHASE 5 COMPLETE: Family 36 (F315-F319), 5 factories, ~24 methods, DR-35, DD-46+DD-47, 45/45 DNA ✅

---
## SAVE POINT: FLOW10:MERGE:P5 ✅
## Next: Phase 6 — Notification Hub (Family 37, F320-F324)
## Recovery: "Continue FLOW-10 from P6" → Start P6
