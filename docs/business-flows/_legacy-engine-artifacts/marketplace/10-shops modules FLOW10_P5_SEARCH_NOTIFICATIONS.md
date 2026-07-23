# FLOW-10 — P5: SEARCH, DISCOVERY & NOTIFICATION HUB
## CMS + Commerce + Multi-Tenant Platform Engine
## Families 32–33 | F278–F287 | Save Point: FLOW10:MERGE:P5
## Merge Target: ENGINE_ARCHITECTURE_MERGED.md
## Sequence: F267–F277 complete (P4). This file: F278–F287 (FINAL factory file).

---

# ═══════════════════════════════════════════════════
# FAMILY 32 — SEARCH & DISCOVERY
# F278–F282 | Cross-domain search, facets, recommendations, cache
# ═══════════════════════════════════════════════════

## Family 32 Overview

**Purpose:** All search, faceting, recommendation, and CDN cache invalidation
operations. Feeds from domain events (product.updated, content.published)
via QUEUE FABRIC consumer groups — never called directly by the writing service.
Tenant isolation is mandatory: every search query MUST include tenantId filter
(DNA-5). A search query returning records from another tenant is a BOLA violation
(OWASP API1:2023) and is treated as a BUILD FAILURE.

**Search strategy via RAG FABRIC:**
  Resolved at runtime via F248.GetProviderBindingAsync("search").
  Options (tenant-configurable via FREEDOM): Elasticsearch native (default),
  external vector search (for AI-powered similarity), or hybrid.
  Service code calls IRagService.SearchAsync() — never the ES client directly.

**Fabrics used:**
  - DATABASE FABRIC (Skill 05) → Elasticsearch (primary index)
  - AI ENGINE FABRIC (Skill 06/07) → embeddings for recommendation engine
  - RAG FABRIC (Skill 00a/00b) → search strategy selection
  - QUEUE FABRIC (Skill 04) → index update event consumption

---

## F278: ISearchIndexService

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
  Used by product bulk import (F258), full re-index, migration

DeleteFromIndexAsync(tenantId: string, indexType: string, entityId: string)
  → DataProcessResult<bool>
  Called on entity delete/archive events

ReindexTenantAsync(tenantId: string, indexType: string)
  → DataProcessResult<Dictionary<string,object>>
  Full re-index for a tenant. Async — returns jobId.
  Checks F246 entitlement (large re-index = quota event in F250)

GetIndexStatusAsync(tenantId: string, indexType: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns: documentCount, lastUpdated, indexHealth, lagSeconds (vs domain)

ValidateTenantScopingAsync(tenantId: string, indexType: string)
  → DataProcessResult<Dictionary<string,object>>
  Smoke-test: verifies all documents in index have matching tenantId.
  Returns: valid (bool), missingTenantId (int), wrongTenantId (int)
  USED IN: CF-64 BFA cross-tenant exposure check
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

---

## F279: ISearchQueryService

**Description:**
  Full-text + faceted + filtered search across all indexed entity types.
  EVERY query MUST include tenantId — this is enforced at the service level
  AND validated by AF-7 (Compliance station) in the AF pipeline.
  Search strategy (ES native, vector, hybrid) is resolved via RAG FABRIC per tenant config.

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
  Only available in non-production environments (F246 entitlement gated)
```

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

---

## F280: IFacetService

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
  Cached: TTL from F248 config (default 60s)

GetFacetDefinitionsAsync(tenantId: string, indexType: string)
  → DataProcessResult<List<Dictionary<string,object>>>
  Returns configured facet fields for this entity type (from F248)

InvalidateFacetCacheAsync(tenantId: string, indexType: string)
  → DataProcessResult<bool>
  Called by ISearchIndexService after bulk re-index

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
| DNA-8 (as applicable) | Cache keys include tenantId + indexType | ✅ |

---

## F281: ICachePurgeService

**Description:**
  CDN and application cache invalidation. Called by domain event consumers
  after: content.published, product.updated, price.changed, inventory.changed.
  CDN provider (Cloudflare, Fastly, CloudFront, custom) resolved via
  F248.GetProviderBindingAsync("cdn"). Never imports CDN SDK directly.
  Purge operations are queued and batched to avoid CDN rate limits.

**FABRIC:** DATABASE FABRIC (Skill 05) → Redis (purge job queue)
  QUEUE FABRIC (Skill 04) → Redis Streams (purge event consumption)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
PurgeByUrlAsync(tenantId: string, urls: List<string>)
  → DataProcessResult<Dictionary<string,object>>
  Queues URL-based purge. CDN provider resolved via F248.
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
  Full tenant cache purge. F246 quota check (expensive operation).
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
| DNA-8 (as applicable) | CDN provider resolved via F248 — never hardcoded | ✅ |

---

## F282: IRecommendationService

**Description:**
  AI-backed content and product recommendations. "Related posts", "You may
  also like", "Frequently bought together", "Similar products". AI engine
  resolved via F248 provider binding ("ai"). Embedding generation via
  AI ENGINE FABRIC. Graph traversal (purchased-together) via DATABASE FABRIC.
  Gated by F246 entitlement check ("ai_recommendations").

**FABRIC:** AI ENGINE FABRIC (Skill 06/07) → embedding generation
  DATABASE FABRIC (Skill 05) → Elasticsearch (vector similarity) or Neo4j (graph)
  RAG FABRIC (Skill 00b) → similarity strategy selection
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

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
  Gated: F246.IsFeatureEnabledAsync("ai_personalized_recommendations")

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
| DNA-8 (as applicable) | AI recommendation gated by F246 entitlement | ✅ |

---

# ═══════════════════════════════════════════════════
# FAMILY 33 — NOTIFICATION HUB
# F283–F287 | Event-driven, template-based notifications
# ═══════════════════════════════════════════════════

## Family 33 Overview

**Purpose:** All outbound notifications to end users and admins.
Email, SMS, push notifications. Event-driven — notification services
consume domain events from QUEUE FABRIC, never called directly by domain services.
Template management supports versioning and AI-assisted personalization.
Email/SMS providers are fabric-resolved (never SendGrid/SES/Twilio directly).

**Notification trigger chain:**
  Domain event (order.created) → QUEUE consumer → F285:INotificationDispatchService
  → resolves template (F283) + channel (F284/F286) → delivers → tracks (F287)

**Fabrics used:**
  - QUEUE FABRIC (Skill 04) → Redis Streams (event consumption + dispatch)
  - AI ENGINE FABRIC (Skill 06/07) → template personalization (optional)
  - DATABASE FABRIC (Skill 05) → Elasticsearch (template store)

---

## F283: INotificationTemplateService

**Description:**
  Versioned template management for all notification types.
  Templates are config documents (FREEDOM) — tenants can customize
  platform defaults. AI-assisted template generation and optimization
  is opt-in via F246 entitlement. Templates support variable substitution
  (e.g., {{order.number}}, {{customer.firstName}}).

**FABRIC:** DATABASE FABRIC (Skill 05) → Elasticsearch provider
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
CreateTemplateAsync(tenantId: string, payload: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  payload: templateKey (e.g., "order.created.customer"),
           channel (email|sms|push), subject (email only),
           bodyHtml, bodyText, variables[], locale, status="draft"

ActivateTemplateAsync(tenantId: string, templateKey: string, versionId: string)
  → DataProcessResult<bool>
  Deactivates previous version. Immutable once activated.

GetTemplateAsync(tenantId: string, templateKey: string, locale: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns active template for key+locale. Falls back to default locale.

RenderTemplateAsync(tenantId: string, templateKey: string,
                    variables: Dictionary<string,object>, locale: string)
  → DataProcessResult<Dictionary<string,object>>
  Resolves variable substitutions. Returns rendered subject + body.
  AI personalization applied if F246.IsFeatureEnabledAsync("ai_notifications")

ListTemplatesAsync(tenantId: string, filter: Dictionary<string,object>)
  → DataProcessResult<List<Dictionary<string,object>>>
  filter: channel, locale, status — BuildSearchFilter

GenerateTemplateWithAiAsync(tenantId: string, context: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  AI generates template draft. Requires human review before activation.
  Gated by F246 entitlement.
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Templates = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | ListTemplatesAsync: filter fields optional | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | NotificationTemplateServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on all template queries | ✅ |
| DNA-6 DynamicController | DynamicController handles template endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on template list filter | ✅ |
| DNA-8 (as applicable) | AI generation gated by entitlement | ✅ |

---

## F284: INotificationDispatchService

**Description:**
  Routing engine for all notifications. Receives domain events from queue,
  resolves the correct template (F283), resolves the correct channel
  (email/SMS/push based on user preference + F248 config), and dispatches
  to the appropriate delivery service (F285, F286).
  Handles notification preferences (opt-out, channel preference, quiet hours).

**FABRIC:** QUEUE FABRIC (Skill 04) → Redis Streams (event consumption)
  DATABASE FABRIC (Skill 05) → Redis (preference cache)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
DispatchNotificationAsync(tenantId: string, event: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  event: eventType, recipientId, recipientType (customer|admin), payload{}
  Resolves: template from F283, channels from preferences, delivery from F285/F286
  Returns: dispatched[], suppressed[] (opt-out/quiet-hours), notificationId

GetNotificationPreferencesAsync(tenantId: string, recipientId: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns: channels{email:{enabled,address}, sms:{enabled,phone}, push:{enabled}},
           quietHours{}, unsubscribedTopics[]

UpdatePreferencesAsync(tenantId: string, recipientId: string,
                        patch: Dictionary<string,object>)
  → DataProcessResult<bool>

UnsubscribeAsync(tenantId: string, recipientId: string, topic: string)
  → DataProcessResult<bool>
  Respects opt-out. GDPR-compliant: logs unsubscribe event.

GetDispatchHistoryAsync(tenantId: string, filter: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  filter: recipientId, eventType, channel, dateFrom, dateTo — BuildSearchFilter
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Dispatch events = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | GetDispatchHistoryAsync: filter fields optional | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | NotificationDispatchServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on all preference + history records | ✅ |
| DNA-6 DynamicController | DynamicController handles notification endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on dispatch history filter | ✅ |
| DNA-8 (as applicable) | Opt-out/unsubscribe honored before dispatch | ✅ |

---

## F285: IEmailDeliveryService

**Description:**
  Transactional email delivery via fabric-resolved ESP (Email Service Provider).
  ESP (SendGrid, AWS SES, Postmark, SMTP) resolved via F248.GetProviderBindingAsync("email").
  Never imports ESP SDK directly. Supports single send, batch, and delivery tracking.

**FABRIC:** AI ENGINE FABRIC (Skill 06/07) → ESP provider via binding
  DATABASE FABRIC (Skill 05) → PostgreSQL (delivery records)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
SendEmailAsync(tenantId: string, payload: Dictionary<string,object>,
               idempotencyKey: string)
  → DataProcessResult<Dictionary<string,object>>
  payload: to, from (from F248 config), subject, htmlBody, textBody,
           headers{}, attachments[] (refs, not binary)
  IDEMPOTENT via F270.IIdempotencyKeyService
  Returns: messageId, status, provider, sentAt

SendBatchAsync(tenantId: string, messages: List<Dictionary<string,object>>)
  → DataProcessResult<Dictionary<string,object>>
  Returns: sent (int), failed (int), messageIds[]

GetDeliveryStatusAsync(tenantId: string, messageId: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns: status (sent|delivered|bounced|spam), events[], openedAt, clickedAt

HandleWebhookAsync(tenantId: string, providerEvent: Dictionary<string,object>)
  → DataProcessResult<bool>
  Receives ESP webhook (bounce, delivery, open, click events).
  Updates F287:IDeliveryTrackingService.
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Email records = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | N/A — keyed by messageId | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | EmailDeliveryServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on all delivery records | ✅ |
| DNA-6 DynamicController | DynamicController handles email management endpoints | ✅ |
| DNA-7 BuildQueryFilters | ESP provider resolved via AI ENGINE FABRIC | ✅ |
| DNA-8 (as applicable) | SendEmailAsync idempotent via F270 | ✅ |

---

## F286: ISmsDeliveryService

**Description:**
  SMS delivery via fabric-resolved SMS provider (Twilio, AWS SNS, Vonage).
  Provider resolved via F248.GetProviderBindingAsync("sms").
  Handles: order confirmations, password reset OTPs, shipping notifications,
  two-factor authentication codes. Respects opt-out lists.

**FABRIC:** AI ENGINE FABRIC (Skill 06/07) → SMS provider via binding
  DATABASE FABRIC (Skill 05) → PostgreSQL (SMS delivery records)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
SendSmsAsync(tenantId: string, payload: Dictionary<string,object>,
             idempotencyKey: string)
  → DataProcessResult<Dictionary<string,object>>
  payload: to (E.164 format), body (max 160 chars or split), from (virtual number)
  IDEMPOTENT via F270. OTP sends have short idempotency TTL (5 min).
  Returns: messageId, status, provider, segments (int), sentAt

GetDeliveryStatusAsync(tenantId: string, messageId: string)
  → DataProcessResult<Dictionary<string,object>>
  Returns: status (sent|delivered|failed|opted_out), deliveredAt, failureReason

HandleCarrierWebhookAsync(tenantId: string, providerEvent: Dictionary<string,object>)
  → DataProcessResult<bool>
  Updates delivery status from carrier receipt notifications

IsOptedOutAsync(tenantId: string, phoneNumber: string)
  → DataProcessResult<bool>
  Checks opt-out list before any send. TCPA compliance.
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | SMS records = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | N/A — keyed by messageId | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | SmsDeliveryServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on all SMS records + opt-out lists | ✅ |
| DNA-6 DynamicController | DynamicController handles SMS management endpoints | ✅ |
| DNA-7 BuildQueryFilters | SMS provider resolved via AI ENGINE FABRIC | ✅ |
| DNA-8 (as applicable) | Opt-out checked BEFORE every send | ✅ |

---

## F287: IDeliveryTrackingService

**Description:**
  Unified delivery analytics and compliance tracking across all channels
  (email, SMS, push, webhook). Stores delivery events, computes deliverability
  metrics, and provides data for GDPR data subject requests.
  All notification delivery status updates funnel through here.

**FABRIC:** DATABASE FABRIC (Skill 05) → Elasticsearch (delivery analytics)
  DATABASE FABRIC → PostgreSQL (compliance + GDPR records)
**RESOLUTION:** CreateAsync(FactoryResolutionContext{tenantId, environment})

**METHODS:**
```
RecordDeliveryEventAsync(tenantId: string, event: Dictionary<string,object>)
  → DataProcessResult<bool>
  event: messageId, channel, eventType (sent|delivered|bounced|opened|clicked|spam|opted_out),
         recipientId, timestamp, metadata{}
  Append-only. All channels feed into this.

GetDeliveryMetricsAsync(tenantId: string, filter: Dictionary<string,object>)
  → DataProcessResult<Dictionary<string,object>>
  filter: channel, eventType, dateFrom, dateTo, templateKey — BuildSearchFilter
  Returns: sent, delivered, bounced, opened, clicked, spamRate, deliverabilityRate

GetRecipientHistoryAsync(tenantId: string, recipientId: string)
  → DataProcessResult<List<Dictionary<string,object>>>
  GDPR use case: returns all notifications sent to a recipient.
  Used for data subject access requests.

DeleteRecipientDataAsync(tenantId: string, recipientId: string)
  → DataProcessResult<Dictionary<string,object>>
  GDPR right-to-erasure: removes PII from delivery records.
  Returns: deleted (int), anonymized (int), retained (int, legal hold)

GetBounceListAsync(tenantId: string, filter: Dictionary<string,object>)
  → DataProcessResult<List<Dictionary<string,object>>>
  Returns hard-bounced email addresses for suppression list management
```

**DNA COMPLIANCE:**
| Pattern | Enforcement | Status |
|---------|-------------|--------|
| DNA-1 ParseDocument | Delivery events = Dictionary<string,object> | ✅ |
| DNA-2 BuildSearchFilter | GetDeliveryMetricsAsync: all filter fields optional | ✅ |
| DNA-3 DataProcessResult<T> | All methods return wrapped result | ✅ |
| DNA-4 MicroserviceBase | DeliveryTrackingServiceImpl extends MicroserviceBase | ✅ |
| DNA-5 Scope Isolation | tenantId on ALL delivery records | ✅ |
| DNA-6 DynamicController | DynamicController handles delivery analytics endpoints | ✅ |
| DNA-7 BuildQueryFilters | ObjectProcessor on all metric filters | ✅ |
| DNA-8 (as applicable) | GDPR erasure path implemented — PII deletable | ✅ |

---

# ═══════════════════════════════════════════════════
# DESIGN RECORDS — DR-30, DR-31
# ═══════════════════════════════════════════════════

## DR-30: Search Tenant Isolation as Build Failure Criterion

**Decision:** Any generated search query that does NOT include tenantId
as a mandatory filter is a BUILD FAILURE.

**Enforcement layers:**
  1. F279:ISearchQueryService auto-injects tenantId — cannot be bypassed
  2. AF-7 (Compliance station): scans generated consumer code for raw ES queries
     without tenantId filter → rejects with BUILD FAILURE
  3. F278.ValidateTenantScopingAsync: smoke-test verifiable post-deployment
  4. CF-64 BFA rule: cross-tenant data exposure detected at conflict check

**Why it's a build failure (not a warning):** Search without tenantId is BOLA
(OWASP API1:2023). In a multi-tenant system, this is a data breach — every
tenant's indexed data is returned to every other tenant. No "warn and ship."

## DR-31: Notification Fan-Out via Queue, Not Direct Call

**Decision:** Domain services NEVER call F284:INotificationDispatchService
directly. They emit events to QUEUE FABRIC. Notification consumers subscribe
and call the dispatch service.

**Why:** Domain write path latency must not be affected by notification
provider latency (ESP calls can take 200ms–2s). Direct call would cascade
ESP timeouts into checkout/publish/order create latency.

**Consequence:** Notifications are eventually consistent (not synchronous).
Order confirmation email may arrive 1–3 seconds after checkout confirm.
This is acceptable per the 10-* document specification.

---

# ═══════════════════════════════════════════════════
# FAMILIES 32–33 SUMMARY
# ═══════════════════════════════════════════════════

## Family 32 — Search & Discovery

| Interface | F# | Fabric | Primary Purpose |
|-----------|-----|--------|----------------|
| ISearchIndexService | F278 | DATABASE (ES) | Index entity documents |
| ISearchQueryService | F279 | RAG + DATABASE (ES) | Full-text + faceted search |
| IFacetService | F280 | DATABASE (ES + Redis) | Dynamic facet computation |
| ICachePurgeService | F281 | DATABASE (Redis) + QUEUE | CDN cache invalidation |
| IRecommendationService | F282 | AI ENGINE + RAG | Personalized recommendations |

## Family 33 — Notification Hub

| Interface | F# | Fabric | Primary Purpose |
|-----------|-----|--------|----------------|
| INotificationTemplateService | F283 | DATABASE (ES) | Template management |
| INotificationDispatchService | F284 | QUEUE + DATABASE | Routing + preferences |
| IEmailDeliveryService | F285 | AI ENGINE (ESP binding) | Transactional email |
| ISmsDeliveryService | F286 | AI ENGINE (SMS binding) | SMS delivery |
| IDeliveryTrackingService | F287 | DATABASE (ES + PG) | Analytics + GDPR |

**DNA Compliance Total:** 10 interfaces × 8 patterns = **80/80 ✅**

---

# ═══════════════════════════════════════════════════
# FULL FACTORY REGISTRY SUMMARY — FLOW-10 (F244–F287)
# ═══════════════════════════════════════════════════

| Family | # | Interfaces | F# Range | Total Methods |
|--------|---|-----------|----------|--------------|
| 27 — Tenant Control Plane | 7 | F244–F250 | 33 |
| 28 — Content/CMS Engine | 7 | F251–F257 | 36 |
| 29 — Commerce Engine | 9 | F258–F266 | 46 |
| 30 — Workflow Lifecycle | 5 | F267–F271 | 27 |
| 31 — App Extensibility | 6 | F272–F277 | 32 |
| 32 — Search & Discovery | 5 | F278–F282 | 24 |
| 33 — Notification Hub | 5 | F283–F287 | 25 |
| **TOTAL FLOW-10** | **44** | **F244–F287** | **~223** |

**Grand DNA Compliance: 44 interfaces × 8 patterns = 352/352 ✅**

---

# ═══════════════════════════════════════════════════
# DESIGN DECISIONS — DD-30, DD-31, DD-32
# ═══════════════════════════════════════════════════

## DD-30: ESP Abstraction — AI ENGINE FABRIC for Email/SMS Providers

**Decision:** Email (F285) and SMS (F286) delivery providers are resolved through
AI ENGINE FABRIC (Skill 06/07) using the same factory pattern as AI model providers.
Provider binding key: `email`, `sms` in F248:ITenantConfigService.

**Rationale:** The factory pattern was already proven for swapping AI providers
(Claude → OpenAI → Gemini via config). The same pattern applies perfectly to ESPs —
swapping SendGrid → AWS SES → Postmark requires only an F248 config update.
No redeployment. No code change. AF-7 (Compliance) rejects any generated service code
containing `sendgrid`, `twilio`, `postmark`, or `aws-ses` as direct imports.

**Alternative rejected:** Separate "notification fabric." Over-engineering — the AI ENGINE
FABRIC's CreateAsync() pattern handles any external provider uniformly.

## DD-31: Search Tenant Isolation — Auto-Inject, Not Developer Responsibility

**Decision:** F279:ISearchQueryService auto-injects tenantId as a mandatory AND filter
on every Elasticsearch query. The developer calling SearchAsync() cannot skip it,
override it, or remove it.

**Why auto-inject not trust-the-developer:** In a multi-tenant system with
potentially 100,000+ tenants, the BOLA risk (OWASP API1:2023) of a single missed
tenantId filter is catastrophic — every tenant's data exposed. Defense in depth:
auto-inject at service level + AF-7 compliance scan + F278.ValidateTenantScopingAsync
smoke-test post-deployment.

**Consequence for development ergonomics:** Developers do not need to remember to
add tenantId to search queries. The service enforces it. This is FREEDOM removed
for safety, not restriction for restriction's sake.

## DD-32: Notification Delivery is Eventually Consistent (By Design)

**Decision:** Notifications (email, SMS) are decoupled from the domain write path
via QUEUE FABRIC. Domain services emit events; notification consumers process
asynchronously. This means: order confirmation email is NOT guaranteed to arrive
before the HTTP response to the checkout confirm call.

**Acceptable latency:** 1–5 seconds in normal operation. Up to 30 seconds under load.
SLA for notification delivery is separate from, and lower than, SLA for domain operations.

**What this enables:** Checkout confirm is fast (200ms target). ESP timeouts, ESP
outages, template rendering errors, recipient validation failures — none of these
block the core commerce operation.

**GDPR implication:** Unsubscribe requests (F284.UnsubscribeAsync) are SYNCHRONOUS
(not through queue) because GDPR requires that a recorded opt-out is immediately
honored. The async path checks F284 preferences before every dispatch.

---

# ═══════════════════════════════════════════════════
# FLOW-10 P1–P5 COMPLETION SUMMARY
# ═══════════════════════════════════════════════════

## All 44 Factory Interfaces Complete

| Phase | Families | F# Range | Interfaces | DNA Checks |
|-------|----------|----------|-----------|------------|
| P1 | 27 — Tenant Control Plane | F244–F250 | 7 | 56/56 ✅ |
| P2 | 28 — Content/CMS Engine | F251–F257 | 7 | 56/56 ✅ |
| P3 | 29 — Commerce Engine | F258–F266 | 9 | 72/72 ✅ |
| P4 | 30 — Workflow Lifecycle | F267–F271 | 5 | 40/40 ✅ |
| P4 | 31 — App Extensibility | F272–F277 | 6 | 48/48 ✅ |
| P5 | 32 — Search & Discovery | F278–F282 | 5 | 40/40 ✅ |
| P5 | 33 — Notification Hub | F283–F287 | 5 | 40/40 ✅ |
| **TOTAL** | **7 families** | **F244–F287** | **44** | **352/352 ✅** |

## Design Records Produced (DR-21 through DR-31)
| DR | Subject | Phase |
|----|---------|-------|
| DR-21 | Tenant Isolation Design | P1 |
| DR-22 | Content Revision Immutability | P2 |
| DR-23 | ES Full-Text vs. Vector for Content | P2 |
| DR-24 | Two-Phase Inventory Reservation | P3 |
| DR-25 | Payment Fabric — PCI Scope Isolation | P3 |
| DR-26 | Double-Prevention Contract | P3 |
| DR-27 | PostgreSQL vs. ES Data Split | P3 |
| DR-28 | Transactional Outbox as Event Reliability Contract | P4 |
| DR-29 | App Sandbox Isolation — Namespace Security Boundary | P4 |
| DR-30 | Search Tenant Isolation as Build Failure Criterion | P5 |
| DR-31 | Notification Fan-Out via Queue, Not Direct Call | P5 |

## Design Decisions Produced (DD-21 through DD-32)
| DD | Decision | Phase |
|----|---------|-------|
| DD-21 | Bridge vs. Shared Schema for Tenant Isolation | P1 |
| DD-22 | ES Full-Text vs. Vector for Content Search | P2 |
| DD-23 | Single-Phase vs. Two-Phase Inventory Reservation | P3 |
| DD-24 | No Raw PSP SDK in Generated Service Code | P3 |
| DD-25 | Two-Phase Inventory Reservation (expanded) | P3 |
| DD-26 | PSP Import Rejection as BUILD FAILURE | P3 |
| DD-27 | Pull vs. Push Webhook Delivery Model | P4 |
| DD-28 | Sync vs. Async Extension Points | P4 |
| DD-29 | Idempotency TTL Tiers by Operation Type | P4 |
| DD-30 | ESP Abstraction via AI ENGINE FABRIC | P5 |
| DD-31 | Search Auto-Inject Tenant Filter | P5 |
| DD-32 | Notification Eventual Consistency (By Design) | P5 |

---
## FLOW10:MERGE:P5 SAVE POINT ✅
## Status: ALL FACTORY FAMILIES COMPLETE (P1–P5)
## Next: "Start FLOW-10 P6" → FLOW10_P6_TASK_TYPES.md
## Next numbers: T83 (first FLOW-10 task type), CF-64 (first BFA rule)
## Recovery: "Show FLOW-10 P5" → Read FLOW10_P5_SEARCH_NOTIFICATIONS.md
