# FLOW-10 — P7b: TASK TYPE ENGINE CONTRACTS (T117–T124) + AF MAP + TEMPLATES
## CMS + Commerce + Multi-Tenant Platform Engine
## Save Point: FLOW10:MERGE:P7b
## Merge Target: TASK_TYPES_CATALOG_MERGED.md
## Sequence: T103–T116 complete (P7a). This file: T117–T124 + AF Map + Templates 20–24.

---

# Remap: source T97→T117, T98→T118, T99→T119, T100→T120, T101→T121,
#         T102→T122, T103→T123, T104→T124 (all +20)
# Templates: source 18→20, 19→21, 20→22, 21→23, 22→24 (all +2)
# Factory remap: see P7a header for full table

---

# ═══════════════════════════════════════════════════
# DOMAIN: PRODUCT PROPAGATION — T117–T119
# Archetypes: FAN_OUT, BATCH
# ═══════════════════════════════════════════════════

## TASK TYPE: T117 — Product Update Fan-Out

**ARCHETYPE:** FAN_OUT
**ENTRY:** product.updated event from QUEUE FABRIC (emitted by F288.UpdateProductAsync)
**PURPOSE:** Propagate product update to all downstream consumers in parallel: search index (F315), CDN cache purge (F318), facet cache invalidation (F317), recommendation signal (F319.RecordInteractionAsync). Uses allSettled semantics: all consumers attempted; partial failures logged but don't block others.
**DISTINCT FROM:**
- T107 (Content Publish Gate): state transition gate for content. T117 is pure fan-out propagation — no state machine.
- T79 (FLOW-07 Four-Way Fork): collects sub-weights. T117 broadcasts change notification.

**FACTORY DEPENDENCIES:** F288, F315, F317, F318, F319
**FABRIC RESOLUTION:**
- F288 (IProductCatalogService) → DATABASE FABRIC → Elasticsearch (source read)
- F315 (ISearchIndexService) → DATABASE FABRIC → Elasticsearch + QUEUE FABRIC
- F317 (IFacetService) → DATABASE FABRIC → Elasticsearch + Redis
- F318 (ICachePurgeService) → DATABASE FABRIC → Redis + QUEUE FABRIC
- F319 (IRecommendationService) → AI ENGINE FABRIC + RAG FABRIC

**AF CONFIGURATION:**
- AF-1 Genesis: allSettled parallel dispatch to 4 consumers
- AF-2 Planning: readProduct(F288) → parallelFanOut[index(F315), facetInvalidate(F317), cachePurge(F318), recommendationSignal(F319)] → collectResults → logPartialFailures → emit
- AF-4 RAG: SK-51 (Fan-Out with Cache Purge), T79 allSettled pattern
- AF-6 Code Review: allSettled (not Promise.all — partial failure must not block)
- AF-9 Judge: 8 quality gates

**BFA VALIDATION:** CF-120 (Search index lag), CF-121 (CDN stale after propagation)

**MACHINE:** allSettled; partial failure logged not blocking; tenantId propagated; only infrastructure services (F315, F317, F318, F319)
**FREEDOM:** Active consumers per tenant (F245); propagation failure alert threshold; cache purge strategy

**IRON RULES:**
- IR-117-1: allSettled — Promise.all (fail-fast) = BUILD FAILURE
- IR-117-2: All targets via factory interfaces — direct ES/Redis = BUILD FAILURE
- IR-117-3: tenantId propagated to all consumers (DNA-5)
- IR-117-4: Partial failures logged; MUST NOT throw
- IR-117-5: No domain service calls in fan-out (only F315, F317, F318, F319)
- IR-117-6: DataProcessResult.Success even with partial failures
- IR-117-7: Product read uses tenantId scoping
- IR-117-8: Recommendation signal only when F251 enables ("ai_recommendations")

**QUALITY GATES (AF-9):**
- QG-117-1: event → all 4 consumers called
- QG-117-2: One fails → other 3 complete (allSettled)
- QG-117-3: Search index updated
- QG-117-4: Facet cache invalidated
- QG-117-5: CDN purge enqueued
- QG-117-6: tenantId in all 4 downstream calls
- QG-117-7: DataProcessResult has per-consumer status
- QG-117-8: Partial failure logged with consumer name

---

## TASK TYPE: T118 — Bulk Product Import Processor

**ARCHETYPE:** BATCH
**ENTRY:** product.bulk_import_requested event from QUEUE FABRIC, OR F288.BulkImportProductsAsync called
**PURPOSE:** Process large-scale product imports (100s-10,000s) without blocking write path. Validate each record, upsert to catalog (F288), bulk-index to search (F315.BulkIndexAsync), handle validation errors gracefully (skip-and-report). Emit progress events. Complete with product.bulk_import_completed.
**DISTINCT FROM:**
- T117: real-time single-product propagation. T118: bulk batch with async progress.
- T103 (Onboarding): provision BATCH concept. T118: first true data-ingestion BATCH.

**FACTORY DEPENDENCIES:** F245, F250, F251, F288, F305, F315, F317, F318
**FABRIC RESOLUTION:**
- F288 → DATABASE FABRIC → Elasticsearch
- F315 → DATABASE FABRIC → Elasticsearch + QUEUE FABRIC
- F317 → DATABASE FABRIC → Elasticsearch + Redis
- F318 → DATABASE FABRIC → Redis + QUEUE FABRIC
- F251 → DATABASE FABRIC → Elasticsearch (quota)
- F305 → DATABASE FABRIC → PostgreSQL + FLOW ENGINE FABRIC
- F250 → QUEUE FABRIC → Redis Streams (metering)

**AF CONFIGURATION:**
- AF-1: Chunked batch processor with progress events and error collection
- AF-2: validateBatchSize(F251) → startWorkflow(F305) → processBatch(chunks of 100) → validate → upsert(F288) → bulkIndex(F315) → progress → invalidateFacets(F317) → purgeCdn(F318) → meter(F250) → emit
- AF-4 RAG: F305 workflow, F315 bulk index, F251 quota
- AF-8 Security: Import file must not be processed without quota check
- AF-9 Judge: 8 quality gates

**BFA VALIDATION:** CF-122 (Import quota exceeded mid-batch), CF-123 (Import overwrites with wrong tenantId)

**MACHINE:** Chunk 100 (configurable, bounded by F251); quota check first; skip-and-record errors; progress per 100; metering after completion
**FREEDOM:** Chunk size (10-500); error strategy (skip-and-report | stop-on-first); facet invalidation toggle

**IRON RULES:**
- IR-118-1: Quota checked via F251 before processing — unbounded = BUILD FAILURE
- IR-118-2: Validation errors collected and in completion event — silent discard = BUILD FAILURE
- IR-118-3: tenantId on all records (DNA-5, CF-123 prevention)
- IR-118-4: Products as Dictionary<string,object> (DNA-1)
- IR-118-5: Progress tracked in F305 — manual counter = BUILD FAILURE
- IR-118-6: Bulk index via F315.BulkIndexAsync — individual IndexDocumentAsync = BUILD FAILURE
- IR-118-7: Metering via F250 after completion
- IR-118-8: Completion event: total, accepted, rejected, errorSummary[]

**QUALITY GATES (AF-9):**
- QG-118-1: 1,000 products → 10 chunks processed
- QG-118-2: Quota exceeded mid-batch → stops, partial results reported
- QG-118-3: Invalid record → skipped and in errorSummary
- QG-118-4: All accepted products have tenantId in index
- QG-118-5: Progress events at each chunk boundary
- QG-118-6: Facet cache invalidated after completion
- QG-118-7: Metering updated with count
- QG-118-8: Completion event has all 4 summary fields

---

## TASK TYPE: T119 — Price Change Propagation Gate

**ARCHETYPE:** FAN_OUT
**ENTRY:** product.price_changed event from QUEUE FABRIC (emitted by F289 or F288 on price field change)
**PURPOSE:** Specialized price propagation beyond T117. Handles: search index price update (F315), price CDN cache purge (F318), cart recalculation trigger for active carts with this product (F291 — enqueue recalculate events), price rule cache invalidation (F289), recommendation signal (F319). Emits price.propagated.
**DISTINCT FROM:**
- T117: general product field changes. T119: price-specific with cart recalculation cascade.
- T115: refund at PSP level. T119: catalog-level price propagation before orders.

**FACTORY DEPENDENCIES:** F288, F289, F291, F315, F318, F319
**FABRIC RESOLUTION:**
- F288 → DATABASE FABRIC → Elasticsearch
- F289 → DATABASE FABRIC → Elasticsearch + AI ENGINE FABRIC
- F291 → DATABASE FABRIC → Redis + PostgreSQL
- F315 → DATABASE FABRIC → Elasticsearch + QUEUE FABRIC
- F318 → DATABASE FABRIC → Redis + QUEUE FABRIC
- F319 → AI ENGINE FABRIC + RAG FABRIC

**AF CONFIGURATION:**
- AF-1: Price fan-out with cart recalculation trigger
- AF-2: readPrice → parallelFanOut[searchUpdate(F315), purgePriceCache(F318), invalidateRuleCache(F289), enqueueCartRecalc(F291), recommendationSignal(F319)] → collect → emit
- AF-4 RAG: SK-51, T117 allSettled reuse, F291 cart pattern
- AF-9 Judge: 8 quality gates

**BFA VALIDATION:** CF-120 (Stale price in index), CF-121 (CDN old price), CF-111 (Cart has old price at checkout)

**MACHINE:** allSettled; cart recalc enqueued (not inline); price rule cache via F289; tenantId enforced
**FREEDOM:** Cart recalc timing (immediate vs. lazy on next view); AI recommendation signal gate

**IRON RULES:**
- IR-119-1: allSettled semantics (same as T117)
- IR-119-2: Cart recalc MUST be enqueued — inline mutation = BUILD FAILURE
- IR-119-3: Price rule cache via F289 — direct Redis DEL = BUILD FAILURE
- IR-119-4: All consumers via factory interfaces (DNA-4)
- IR-119-5: tenantId (DNA-5)
- IR-119-6: DataProcessResult.Success with partial failures
- IR-119-7: price.propagated event with timestamp + affectedSkuCount
- IR-119-8: Price read from F288/F289 (not stale event payload on retry)

**QUALITY GATES (AF-9):**
- QG-119-1: Price change → search updated
- QG-119-2: CDN purge enqueued
- QG-119-3: Active cart with product → recalc enqueued
- QG-119-4: Price rule cache invalidated
- QG-119-5: allSettled — one failure doesn't block
- QG-119-6: Event has tenantId, productId, affectedSkuCount
- QG-119-7: Price from F288 at propagation time
- QG-119-8: tenantId on all 5 consumer calls

---

# ═══════════════════════════════════════════════════
# DOMAIN: APP EXTENSIBILITY — T120–T122
# Archetypes: PROVISION, EVENT
# ═══════════════════════════════════════════════════

## TASK TYPE: T120 — App Installation Orchestrator

**ARCHETYPE:** PROVISION
**ENTRY:** HTTP POST to /apps/{appId}/install — tenant admin triggers
**PURPOSE:** Multi-step idempotent install (Template 23): validate app (F309) → validate scopes vs manifest → grant scopes (F312) → create installation (F310) → register webhooks (F311) → bind metafields (F313) → activate extension points (F314) → emit app.installed via F307 outbox. Rollback on failure via F308.
**DISTINCT FROM:**
- T103 (Tenant Onboarding): provisions infrastructure. T120 provisions app within active tenant. Same archetype, different domain.
- T122 (Uninstall): compensating pair.

**FACTORY DEPENDENCIES:** F260, F305, F307, F308, F309, F310, F311, F312, F313, F314
**FABRIC RESOLUTION:**
- F309 (IAppRegistryService) → DATABASE FABRIC → Elasticsearch
- F310 (IAppInstallationService) → DATABASE FABRIC → PostgreSQL + QUEUE FABRIC
- F311 (IWebhookDeliveryService) → QUEUE FABRIC + DATABASE FABRIC → PostgreSQL
- F312 (IScopePermissionService) → DATABASE FABRIC → PostgreSQL
- F313 (IMetafieldService) → DATABASE FABRIC → Elasticsearch + PostgreSQL
- F314 (IExtensionPointService) → QUEUE FABRIC + DATABASE FABRIC → PostgreSQL
- F260 (IIdempotencyKeyService) → DATABASE FABRIC → Redis + PostgreSQL
- F305 (IWorkflowExecutionService) → DATABASE FABRIC → PostgreSQL + FLOW ENGINE FABRIC
- F307 (IOutboxEventService) → DATABASE FABRIC → PostgreSQL + QUEUE FABRIC
- F308 (IDurableCompensationService) → DATABASE FABRIC → PostgreSQL

**AF CONFIGURATION:**
- AF-1: Install handler executing Template 23 via factories
- AF-2: validateApp(F309) → validateScopes → grantScopes(F312) → createInstallation(F310) → registerWebhooks(F311) → bindMetafields(F313) → activateExtensions(F314) → outbox(F307) → emit
- AF-4 RAG: SK-52 (App Permission Scope), T103 provision-with-rollback pattern
- AF-8 Security: Scopes ONLY from manifest — escalation = BUILD FAILURE
- AF-9 Judge: 10 quality gates

**BFA VALIDATION:** CF-124 (Scope escalation), CF-125 (Duplicate installation)

**MACHINE:** Idempotent: same appId+tenantId → returns existing; scopes subset of manifest; rollback: step N fails → reverse N-1..1 via F308; HMAC key generated per webhook
**FREEDOM:** Custom config per app; optional scopes; extension activation timing

**IRON RULES:**
- IR-120-1: Scope validation vs manifest MANDATORY — extra scope = BUILD FAILURE
- IR-120-2: Idempotent via F260 — duplicate = returns existing
- IR-120-3: Rollback for steps 3-7 via F308
- IR-120-4: HMAC key generated per webhook (F311)
- IR-120-5: app.installed via F307 outbox
- IR-120-6: tenantId + installationId namespace (DNA-5)
- IR-120-7: Tracked in F305
- IR-120-8: No typed AppInstallation (DNA-1)
- IR-120-9: Version must be "published" (not draft)
- IR-120-10: Scope escalation → DataProcessResult.Failure

**QUALITY GATES (AF-9):**
- QG-120-1: Valid install → record, scopes, webhooks, extensions
- QG-120-2: Scope escalation → Failure, no partial state
- QG-120-3: Duplicate → returns existing (idempotent)
- QG-120-4: Step 5 fails → steps 3,4 rolled back
- QG-120-5: HMAC key per webhook
- QG-120-6: app.installed outbox in same PG transaction
- QG-120-7: Extensions activated in F314
- QG-120-8: Metafield defs in F313 with installationId namespace
- QG-120-9: F305 shows all 8 steps
- QG-120-10: Unpublished version → Failure

---

## TASK TYPE: T121 — Webhook Event Router

**ARCHETYPE:** EVENT
**ENTRY:** Any domain event with registered webhook subscriptions in F311 (order.created, product.updated, content.published, etc.)
**PURPOSE:** Route domain event to all registered webhook subscriptions for topic + tenantId. Per subscription: verify scope (F312), sign with HMAC-SHA256 (F311), enqueue delivery with retry policy. Fan-out delivery — all subscriptions dispatched in parallel. Log each attempt.
**DISTINCT FROM:**
- T117 (Product Fan-Out): propagates to internal infrastructure. T121 routes to external app endpoints.
- T124 (Notification Dispatch): delivers to end users (email/SMS). T121 delivers to app developer endpoints.

**FACTORY DEPENDENCIES:** F250, F311, F312
**FABRIC RESOLUTION:**
- F311 (IWebhookDeliveryService) → QUEUE FABRIC → Redis Streams + DATABASE FABRIC → PostgreSQL
- F312 (IScopePermissionService) → DATABASE FABRIC → PostgreSQL
- F250 (ITenantAuditService) → DATABASE FABRIC → Elasticsearch

**AF CONFIGURATION:**
- AF-1: Webhook router consumer handling any event topic
- AF-2: readEvent → findSubscriptions(F311) → forEach: checkScope(F312) → signPayload → enqueueDelivery → logAttempt(F250)
- AF-4 RAG: SK-53 (Webhook HMAC Signing), F311 delivery pattern
- AF-8 Security: HMAC per-installation key — no shared key across tenants
- AF-9 Judge: 6 quality gates

**BFA VALIDATION:** CF-126 (Cross-tenant webhook delivery), CF-127 (Scope-unauthorized delivery)

**MACHINE:** Subscription lookup filtered by tenantId + topic; scope check per subscription; HMAC per-installation; delivery enqueued (not inline HTTP)
**FREEDOM:** Payload format per subscription; delivery timeout

**IRON RULES:**
- IR-121-1: Subscription lookup MUST include tenantId — cross-tenant = BUILD FAILURE
- IR-121-2: Scope check MUST precede delivery
- IR-121-3: HMAC per-installation key — shared key = BUILD FAILURE
- IR-121-4: Delivery enqueued — inline HTTP = BUILD FAILURE
- IR-121-5: F250 audit per delivery attempt
- IR-121-6: tenantId (DNA-5)
- IR-121-7: No subscriptions → Success with empty set
- IR-121-8: Scope-unauthorized → skipped (not error)

**QUALITY GATES (AF-9):**
- QG-121-1: order.created → delivered to all topic+tenant subscriptions
- QG-121-2: Cross-tenant lookup → empty set
- QG-121-3: Scope-unauthorized → skipped, logged
- QG-121-4: HMAC signature present
- QG-121-5: Delivery enqueued
- QG-121-6: Metering record for count

---

## TASK TYPE: T122 — App Uninstall Cleanup Gate

**ARCHETYPE:** PROVISION
**ENTRY:** HTTP DELETE to /apps/{installationId}/uninstall, OR tenant offboarding (T106) calls for each app
**PURPOSE:** Reverse T120 steps: deactivate extensions (F314) → revoke webhooks (F311) → remove metafields (F313) → revoke scopes (F312) → mark uninstalled (F310) → queue data cleanup → emit app.uninstalled via F307 outbox.
**DISTINCT FROM:**
- T120: compensating pair — installs. T122 uninstalls.
- T106: removes entire tenant. T122 removes single app.

**FACTORY DEPENDENCIES:** F260, F307, F310, F311, F312, F313, F314
**FABRIC RESOLUTION:**
- F307 → DATABASE FABRIC → PostgreSQL + QUEUE FABRIC
- F310 → DATABASE FABRIC → PostgreSQL + QUEUE FABRIC
- F311 → QUEUE FABRIC + DATABASE FABRIC → PostgreSQL
- F312 → DATABASE FABRIC → PostgreSQL
- F313 → DATABASE FABRIC → Elasticsearch + PostgreSQL
- F314 → QUEUE FABRIC + DATABASE FABRIC → PostgreSQL
- F260 → DATABASE FABRIC → Redis + PostgreSQL

**AF CONFIGURATION:**
- AF-1: Uninstall handler reversing T120 steps
- AF-2: validate → deactivateExtensions(F314) → revokeWebhooks(F311) → removeMetafields(F313) → revokeScopes(F312) → markUninstalled(F310) → queueCleanup → outbox(F307)
- AF-4 RAG: T120 reverse, SK-52
- AF-8 Security: Only installationId-namespaced data deleted
- AF-9 Judge: 6 quality gates

**BFA VALIDATION:** CF-125 (Uninstall already-uninstalled — idempotent), CF-128 (App data survives uninstall)

**MACHINE:** Idempotent: already-uninstalled = Success; reverse of T120; data cleanup async (not blocking); HMAC keys revoked with webhooks
**FREEDOM:** Data retention (default: 30 days then purge); admin notification

**IRON RULES:**
- IR-122-1: Extensions deactivated FIRST
- IR-122-2: HMAC keys revoked with webhooks
- IR-122-3: Metafield cleanup for namespace queued
- IR-122-4: app.uninstalled via F307 outbox
- IR-122-5: Already-uninstalled → Success (idempotent)
- IR-122-6: Only installationId-namespace deleted
- IR-122-7: tenantId (DNA-5)
- IR-122-8: Wrong tenantId → DataProcessResult.Failure

**QUALITY GATES (AF-9):**
- QG-122-1: Extensions deactivated in F314
- QG-122-2: Webhooks removed, HMAC keys revoked
- QG-122-3: Metafields removed from F313 for namespace
- QG-122-4: Scopes revoked in F312
- QG-122-5: Installation marked uninstalled in F310
- QG-122-6: app.uninstalled outbox event

---

# ═══════════════════════════════════════════════════
# DOMAIN: SEARCH & NOTIFICATIONS — T123–T124
# Archetypes: FAN_OUT, ASYNC
# ═══════════════════════════════════════════════════

## TASK TYPE: T123 — Generic Search Index Sync Consumer

**ARCHETYPE:** FAN_OUT
**ENTRY:** QUEUE FABRIC consumer — ANY entity change event (product.updated, content.published, order.created, etc.). Consumer group: "search-index-sync"
**PURPOSE:** Generic CQRS read-model updater. Routes by entityType to correct source factory (F288 for products, F297 for content, F294 for orders), fetches current entity state from authoritative source, indexes into search infrastructure (F315), invalidates facet cache (F317). ALWAYS fetches from source (not stale event payload).
**DISTINCT FROM:**
- T117 (Product Fan-Out): propagates to multiple consumers. T123 is the search-specific sync consumer.
- T118 (Bulk Import): batch with its own bulk indexing. T123 handles real-time single-entity sync.

**FACTORY DEPENDENCIES:** F288, F294, F297, F315, F317
**FABRIC RESOLUTION:**
- F288 (IProductCatalogService) → DATABASE FABRIC → Elasticsearch (product source)
- F297 (IContentEntityService) → DATABASE FABRIC → Elasticsearch (content source)
- F294 (IOrderService) → DATABASE FABRIC → PostgreSQL (order source)
- F315 (ISearchIndexService) → DATABASE FABRIC → Elasticsearch + QUEUE FABRIC
- F317 (IFacetService) → DATABASE FABRIC → Elasticsearch + Redis

**AF CONFIGURATION:**
- AF-1: Generic search sync consumer routing by entityType to correct source
- AF-2: parseEvent → determineEntityType → fetchFromSource(F288|F297|F294) → indexDocument(F315) → invalidateFacets(F317) → emit
- AF-4 RAG: SK-51, F315/F317 patterns, T117 fan-out reuse
- AF-8 Security: Validate event.tenantId matches fetched entity's tenantId
- AF-9 Judge: 6 quality gates

**BFA VALIDATION:** CF-120 (Search index lag), CF-96 (Cross-tenant exposure)

**MACHINE:** Event-driven via consumer group (exactly-once); ALWAYS fetch from source (not event payload); tenantId validation: event.tenantId = entity.tenantId
**FREEDOM:** Which entity types indexed per tenant; indexing lag alert threshold

**IRON RULES:**
- IR-123-1: ALWAYS fetch from source — never index stale event payload
- IR-123-2: tenantId in event MUST match entity — mismatch = BUILD FAILURE
- IR-123-3: F315 via QUEUE consumer, never inline with domain write
- IR-123-4: Facet cache invalidated after every index update
- IR-123-5: All index documents include tenantId (DNA-5)
- IR-123-6: Entity not found → DataProcessResult.Failure
- IR-123-7: content.archived → F315.DeleteFromIndexAsync (not update)
- IR-123-8: All reads/writes tenantId-scoped (DNA-5)

**QUALITY GATES (AF-9):**
- QG-123-1: product.updated → fetched from F288 → indexed in F315
- QG-123-2: content.archived → F315.DeleteFromIndexAsync
- QG-123-3: Fetched tenantId matches event tenantId
- QG-123-4: Facet cache invalidated
- QG-123-5: Retry → idempotent overwrite
- QG-123-6: tenantId on all indexed documents

---

## TASK TYPE: T124 — Notification Dispatch Consumer

**ARCHETYPE:** ASYNC
**ENTRY:** QUEUE FABRIC consumer — any domain event with notification trigger (order.created → confirmation, content.published → alert, checkout.abandoned → remarketing). Consumer group: "notification-dispatch"
**PURPOSE:** Event-to-notification routing. Check preferences (F321), resolve template (F320), render with variables, dispatch via channel (F322 email / F323 SMS). Respects opt-out and quiet hours. Records delivery via F324. Idempotent via F260.
**DISTINCT FROM:**
- T121 (Webhook Router): delivers to app endpoints (B2B). T124 delivers to end users (email/SMS/push).
- T117 (Product Fan-Out): dispatches to infrastructure. T124 dispatches to humans.

**FACTORY DEPENDENCIES:** F260, F320, F321, F322, F323, F324
**FABRIC RESOLUTION:**
- F320 (INotificationTemplateService) → DATABASE FABRIC → Elasticsearch
- F321 (INotificationDispatchService) → QUEUE FABRIC → Redis Streams + DATABASE FABRIC
- F322 (IEmailDeliveryService) → AI ENGINE FABRIC → ESP via binding
- F323 (ISmsDeliveryService) → AI ENGINE FABRIC → SMS via binding
- F324 (IDeliveryTrackingService) → DATABASE FABRIC → Elasticsearch + PostgreSQL
- F260 (IIdempotencyKeyService) → DATABASE FABRIC → Redis + PostgreSQL

**AF CONFIGURATION:**
- AF-1: Notification dispatch consumer routing events to templates and channels
- AF-2: parseEvent → resolveRecipient → checkPreferences(F321) → resolveTemplate(F320) → render → dispatch(F322|F323) → track(F324)
- AF-4 RAG: F320-F324 patterns, SK-49 (Idempotency)
- AF-5 Multi-model: AI personalization when F251 enables ("ai_notifications")
- AF-8 Security: ESP credentials from F245 (never hardcoded); GDPR deletion in F324
- AF-9 Judge: 8 quality gates
- AF-10 Merge: Multi-model for AI subject lines (optional)

**BFA VALIDATION:** CF-129 (Duplicate notification), CF-130 (Notification to opted-out recipient)

**MACHINE:** Idempotency key: tenantId:correlationId:recipientId:channel via F260; opt-out checked via F321 BEFORE render; quiet hours checked; delivery in F324 append-only
**FREEDOM:** Trigger events per tenant (F245); templates customizable (F320); AI personalization (F251 gate); channel preference per recipient

**IRON RULES:**
- IR-124-1: Opt-out check MUST precede template render
- IR-124-2: Send idempotent via F260 — duplicate event = one notification
- IR-124-3: ESP via F322 only — direct SendGrid/SES = BUILD FAILURE
- IR-124-4: SMS via F323 only — direct Twilio = BUILD FAILURE
- IR-124-5: Delivery in F324 (append-only)
- IR-124-6: tenantId on all lookups and records (DNA-5)
- IR-124-7: AI personalization only when F251 enables
- IR-124-8: Opt-out → DataProcessResult.Success (not error)

**QUALITY GATES (AF-9):**
- QG-124-1: order.created → confirmation email via F322
- QG-124-2: Opted-out → not sent; F324 records suppressed
- QG-124-3: Same event twice → idempotent, one email
- QG-124-4: Template rendered with correct variables
- QG-124-5: Quiet hours → queued for later (not dropped)
- QG-124-6: F324 delivery record with status + channel
- QG-124-7: AI personalization applied when enabled
- QG-124-8: Opt-out → Success (no send, no error)

---

# ═══════════════════════════════════════════════════
# AF STATION MAP — FLOW-10 (T103–T124)
# 11 stations × 22 task types = 242 cells
# ═══════════════════════════════════════════════════

| Station | T103 | T104 | T105 | T106 | T107 | T108 | T109 | T110 | T111 | T112 | T113 |
|---------|------|------|------|------|------|------|------|------|------|------|------|
| **AF-1** | Provision pipeline (Tpl 24) | Isolation 3-strategy | Entitlement provisioner | Offboarding pipeline | Publish gate + outbox | Review multi-path | Archive gate | Media processor | Timer publisher | Cart freeze + reserve | Payment + order |
| **AF-2** | 8 sequential | 5 steps (3 paths) | 6 steps | 10 steps | 7 steps | 5 steps | 5 steps | 7 steps | 4 steps | 7 steps | 10 steps |
| **AF-3** | Idempotent provision | DB routing, RLS | Feature flags | GDPR deletion | State machine, outbox | Editorial workflow | Content archive | Media processing | Scheduled publish | Cart freeze | Transactional commerce |
| **AF-4** | SK-44, F246 | SK-44 | F251, F245 | SK-44, T103 | SK-45, SK-46, EP-1 | SK-45, EP-1, T107 | SK-45, SK-51, T107 | F299, F251 | SK-47, SK-46, T107 | SK-48, SK-49 | SK-49, SK-48, SK-46, SK-50 |
| **AF-5** | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Alt-text (opt) | N/A | N/A | N/A |
| **AF-6** | No direct DB; rollback | No raw DB strings | Plan via F251 | Legal hold check | Transition+outbox atomic | Role check; notify queued | History preserved | Quota check; AI via fabric | Idempotent; missed timer | Reservation idempotent | Idempotent capture; PSP via F293 |
| **AF-7** | DNA 1-9; tenantId step 1 | DNA-5 activated | DNA-5 entitlements | GDPR erasure verified | DNA-1,3,5 | DNA-1,3,5 | DNA-1,3,5; no delete | DNA-1,3,5 | DNA-1,3,5; timer tenantId | DNA-1,3,5 | DNA-1,3,5; PCI raw card |
| **AF-8** | No secrets in config | No schema cross-leak | Downgrade disables | Physical delete evidence | Author permission | Reviewer role only | Editor/admin only | Magic-byte validation | Timer payload signed | Server-computed price | Raw card NEVER in service |
| **AF-9** | 10 QGs | 8 QGs | 8 QGs | 10 QGs | 8 QGs | 8 QGs | 6 QGs | 8 QGs | 8 QGs | 8 QGs | 10 QGs |
| **AF-10** | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Multi-model alt-text | N/A | N/A | N/A |
| **AF-11** | Onboarding duration | Activation per strategy | N/A | Offboarding duration | Publish latency | Review cycle time | N/A | Alt-text quality | Scheduled vs actual | Checkout latency | Payment rates |

| Station | T114 | T115 | T116 | T117 | T118 | T119 | T120 | T121 | T122 | T123 | T124 |
|---------|------|------|------|------|------|------|------|------|------|------|------|
| **AF-1** | Fulfillment SM | Return+refund | Expiry handler | allSettled fan-out | Chunked batch | Price fan-out+recalc | Install pipeline (Tpl 23) | Webhook router | Uninstall reverse | Generic index sync | Notification dispatch |
| **AF-2** | 7 steps | 7 steps | 6 steps | 5 (parallel) | 10 steps | 5 (parallel) | 8 steps | 5 per sub | 8 steps (reverse) | 6 steps | 7 steps |
| **AF-3** | Order fulfillment | Refund processing | Checkout abandon | Product propagation | Batch import | Price propagation | App install, scope | Webhook routing | App uninstall | CQRS read model | Notification dispatch |
| **AF-4** | SK-45 adapted, EP-1 | SK-49, SK-50, T113 | SK-47, SK-49, T112 | SK-51, T79 | F305, F315 bulk | SK-51, T117, F291 | SK-52, T103 | SK-53, F311 | T120 reverse | SK-51, F315/F317 | F320-F324, SK-49 |
| **AF-5** | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | AI personalization (opt) |
| **AF-6** | Shipment idempotent | Refund idempotent | Idempotent release | allSettled; factory | Chunk bounded; quota | Cart recalc enqueued | Scope vs manifest | HMAC; delivery enqueued | All T120 removed | Source fetch not payload | Opt-out before render |
| **AF-7** | DNA-1,3,5 | DNA-3,5 | DNA-5; timer tenantId | DNA-1,3,5 propagated | DNA-1,3,5 all records | DNA-1,3,5; price via F288 | DNA-1,3,5; namespace | DNA-5; scope check | DNA-1,3,5; namespace | DNA-1,3,5; entity match | DNA-1,3,5; GDPR opt-out |
| **AF-8** | Carrier via F295 | PSP via F293 | Timer not spoofable | Tenant data only | Import quota enforced | Tenant prices only | Scopes from manifest | Per-install HMAC key | Namespace-scoped delete | Entity tenantId match | ESP from F245 |
| **AF-9** | 8 QGs | 8 QGs | 6 QGs | 8 QGs | 8 QGs | 8 QGs | 10 QGs | 6 QGs | 6 QGs | 6 QGs | 8 QGs |
| **AF-10** | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Multi-model subject (opt) |
| **AF-11** | Fulfillment time | Refund rates | Abandonment rates | Propagation latency | Import success | Price propagation | Install rates | Delivery rates | N/A | Indexing lag | Open/click/delivery |

---

# ═══════════════════════════════════════════════════
# FLOW TEMPLATES 20–24 (DAG JSON Structure)
# Remapped from source Templates 18–22 (+2 offset)
# All factory refs use actual FLOW-10 numbers
# ═══════════════════════════════════════════════════

## Template 20: content-publishing-pipeline-v1

```json
{
  "flowName": "content-publishing-pipeline",
  "version": "1.0.0",
  "description": "CMS content lifecycle: authoring → review → publish → archive",
  "steps": [
    {
      "stepId": "content-draft",
      "taskType": "T108",
      "factoryRef": "F298",
      "trigger": "content.submit_for_review",
      "transitions": [{"on": "success", "to": "content-review"}]
    },
    {
      "stepId": "content-review",
      "taskType": "T108",
      "factoryRef": "F298",
      "trigger": "reviewer.action",
      "transitions": [
        {"on": "approve_now", "to": "content-publish"},
        {"on": "approve_schedule", "to": "content-schedule"},
        {"on": "reject", "to": "content-draft"}
      ]
    },
    {
      "stepId": "content-publish",
      "taskType": "T107",
      "factoryRef": "F298",
      "trigger": "publish_now",
      "parallelFanOut": [
        {"factory": "F315", "task": "T123", "queue": "search-sync"},
        {"factory": "F318", "task": "T117", "queue": "cache-purge"},
        {"factory": "F321", "task": "T124", "queue": "notifications"}
      ],
      "transitions": [
        {"on": "success", "to": "content-live"},
        {"on": "archive", "to": "content-archive"}
      ]
    },
    {
      "stepId": "content-schedule",
      "taskType": "T108",
      "factoryRef": "F303",
      "trigger": "schedule_timer_set",
      "timerRef": "F306",
      "timerFires": "T111",
      "transitions": [{"on": "timer_fired", "to": "content-publish"}]
    },
    {
      "stepId": "content-live",
      "taskType": "TERMINAL_STATE",
      "description": "Content is published and live"
    },
    {
      "stepId": "content-archive",
      "taskType": "T109",
      "factoryRef": "F298",
      "parallelFanOut": [
        {"factory": "F315", "task": "T123", "action": "delete_from_index"},
        {"factory": "F318", "task": "T117", "action": "purge_cache"}
      ]
    }
  ],
  "freedomConfig": {
    "reviewEnabled": true,
    "selfReviewAllowed": false,
    "scheduledPublishEnabled": true,
    "sideEffects": ["search", "cdn", "notifications"]
  }
}
```

---

## Template 21: commerce-checkout-pipeline-v1

```json
{
  "flowName": "commerce-checkout-pipeline",
  "version": "1.0.0",
  "description": "Full commerce lifecycle: cart → checkout → payment → fulfillment → delivery",
  "steps": [
    {
      "stepId": "cart-active",
      "taskType": "ENTRY_STATE",
      "description": "Customer has active cart via F291"
    },
    {
      "stepId": "checkout-create",
      "taskType": "T112",
      "factoryRef": "F292",
      "trigger": "customer.checkout_initiate",
      "idempotencyRef": "F260",
      "timerRef": "F306",
      "timerDuration": "10m",
      "timerExpiry": "T116",
      "transitions": [
        {"on": "success", "to": "checkout-active"},
        {"on": "inventory_conflict", "to": "cart-active"}
      ]
    },
    {
      "stepId": "checkout-active",
      "taskType": "ORCHESTRATION_STATE",
      "substeps": ["update-shipping", "select-rate", "apply-coupon"],
      "factoryRefs": ["F292", "F295", "F289"]
    },
    {
      "stepId": "checkout-confirm",
      "taskType": "T113",
      "factoryRef": "F292",
      "trigger": "customer.submit_payment",
      "idempotencyRef": "F260",
      "outboxRef": "F307",
      "transitions": [
        {"on": "success", "to": "order-created"},
        {"on": "payment_declined", "to": "checkout-active"},
        {"on": "inventory_conflict", "to": "checkout-active"}
      ]
    },
    {
      "stepId": "order-created",
      "taskType": "T114",
      "factoryRef": "F294",
      "trigger": "order.paid",
      "parallelFanOut": [
        {"factory": "F295", "action": "create_shipment"},
        {"factory": "F321", "task": "T124", "queue": "notifications"}
      ],
      "transitions": [
        {"on": "shipped", "to": "order-fulfilled"},
        {"on": "cancel", "to": "order-cancelled"}
      ]
    },
    {
      "stepId": "order-fulfilled",
      "taskType": "T114",
      "trigger": "shipment.delivered_confirmed",
      "transitions": [
        {"on": "delivered", "to": "order-delivered"},
        {"on": "return_initiated", "to": "order-return"}
      ]
    },
    {
      "stepId": "order-delivered",
      "taskType": "TERMINAL_STATE"
    },
    {
      "stepId": "order-return",
      "taskType": "T115",
      "factoryRef": "F294",
      "idempotencyRef": "F260"
    },
    {
      "stepId": "order-cancelled",
      "taskType": "COMPENSATION_STATE",
      "compensation": ["void_payment(F293)", "release_inventory(F290)"]
    }
  ],
  "freedomConfig": {
    "paymentMode": "authorize_then_capture",
    "checkoutExpiryMinutes": 10,
    "returnWindowDays": 30
  }
}
```

---

## Template 22: product-propagation-pipeline-v1

```json
{
  "flowName": "product-propagation-pipeline",
  "version": "1.0.0",
  "description": "Product change propagation: catalog update → fan-out to search/cache/recommendations",
  "steps": [
    {
      "stepId": "product-updated",
      "taskType": "ENTRY_EVENT",
      "trigger": "product.updated | product.created | product.price_changed",
      "factoryRef": "F288"
    },
    {
      "stepId": "propagation-fan-out",
      "taskType": "T117",
      "semantics": "allSettled",
      "parallelBranches": [
        {"branch": "search-sync", "taskType": "T123", "factory": "F315"},
        {"branch": "facet-invalidate", "taskType": "T123", "factory": "F317"},
        {"branch": "cdn-purge", "taskType": "T117", "factory": "F318"},
        {"branch": "recommendation-signal", "taskType": "T117", "factory": "F319", "entitlementGate": "ai_recommendations"}
      ]
    },
    {
      "stepId": "price-propagation",
      "taskType": "T119",
      "trigger": "product.price_changed",
      "additionalBranches": [
        {"branch": "cart-recalculation", "factory": "F291", "mode": "enqueue"}
      ]
    },
    {
      "stepId": "bulk-import-path",
      "taskType": "T118",
      "trigger": "product.bulk_import_requested",
      "workflowRef": "F305"
    }
  ],
  "freedomConfig": {
    "activeConsumers": ["search", "cache", "recommendations"],
    "priceChangeTriggerCartRecalc": true,
    "bulkImportChunkSize": 100
  }
}
```

---

## Template 23: app-installation-pipeline-v1

```json
{
  "flowName": "app-installation-pipeline",
  "version": "1.0.0",
  "description": "App/plugin install, configure, and uninstall lifecycle",
  "steps": [
    {
      "stepId": "validate-app",
      "taskType": "T120",
      "factory": "F309",
      "trigger": "admin.install_app",
      "transitions": [
        {"on": "valid", "to": "grant-scopes"},
        {"on": "invalid_version", "to": "FAILED"}
      ]
    },
    {
      "stepId": "grant-scopes",
      "taskType": "T120",
      "factory": "F312",
      "rollbackOn": "failure",
      "rollback": "F312.RevokeScopesAsync"
    },
    {
      "stepId": "create-installation",
      "taskType": "T120",
      "factory": "F310",
      "idempotencyRef": "F260",
      "rollbackOn": "failure",
      "rollback": "F310.UninstallAppAsync"
    },
    {
      "stepId": "register-webhooks",
      "taskType": "T120",
      "factory": "F311",
      "rollbackOn": "failure",
      "rollback": "F311.RevokeWebhookAsync"
    },
    {
      "stepId": "bind-metafields",
      "taskType": "T120",
      "factory": "F313",
      "rollbackOn": "failure",
      "rollback": "F313.DeleteMetafieldAsync(namespace)"
    },
    {
      "stepId": "activate-extension-points",
      "taskType": "T120",
      "factory": "F314",
      "rollbackOn": "failure",
      "rollback": "F314.DeactivateHandlerAsync"
    },
    {
      "stepId": "emit-installed",
      "taskType": "T120",
      "outboxRef": "F307",
      "event": "app.installed"
    },
    {
      "stepId": "uninstall-path",
      "taskType": "T122",
      "trigger": "admin.uninstall_app",
      "reverseOf": ["activate-extension-points", "register-webhooks", "bind-metafields", "grant-scopes", "create-installation"],
      "outboxEvent": "app.uninstalled"
    }
  ],
  "freedomConfig": {
    "optionalScopesGrantable": true,
    "extensionPointMode": "immediate"
  }
}
```

---

## Template 24: tenant-onboarding-pipeline-v1

```json
{
  "flowName": "tenant-onboarding-pipeline",
  "version": "1.0.0",
  "description": "Full tenant lifecycle: onboard → configure → activate. Inverse: offboard.",
  "steps": [
    {
      "stepId": "validate-registration",
      "taskType": "T103",
      "factory": "F244",
      "trigger": "admin.provision_tenant",
      "idempotencyRef": "F260",
      "transitions": [
        {"on": "valid", "to": "register-identity"},
        {"on": "duplicate", "to": "RETURN_EXISTING"}
      ]
    },
    {
      "stepId": "register-identity",
      "taskType": "T103",
      "factory": "F244",
      "auditRef": "F250",
      "rollbackOn": "failure"
    },
    {
      "stepId": "determine-isolation",
      "taskType": "T103",
      "factory": "F246",
      "strategies": ["shared_schema", "separate_schema", "dedicated_db"],
      "strategySelector": "tier_based"
    },
    {
      "stepId": "provision-resources",
      "taskType": "T103",
      "factory": "F246",
      "idempotencyRef": "F260",
      "rollbackOn": "failure"
    },
    {
      "stepId": "activate-isolation-routing",
      "taskType": "T104",
      "factory": "F246",
      "trigger": "resources.provisioned",
      "smokeTest": "F315.ValidateTenantScopingAsync"
    },
    {
      "stepId": "configure-entitlements",
      "taskType": "T105",
      "factory": "F251",
      "trigger": "isolation.activated",
      "configRef": "F245",
      "meteringRef": "F250"
    },
    {
      "stepId": "activate-tenant",
      "taskType": "T103",
      "factory": "F244",
      "statusTransition": "configuring → active",
      "outboxRef": "F307",
      "event": "tenant.onboarded"
    },
    {
      "stepId": "offboarding-path",
      "taskType": "T106",
      "trigger": "admin.offboard_tenant",
      "confirmationRequired": true,
      "legalHoldCheck": true,
      "reverseOf": ["activate-tenant", "configure-entitlements", "activate-isolation-routing", "provision-resources", "register-identity"],
      "outboxEvent": "tenant.offboarded"
    }
  ],
  "freedomConfig": {
    "defaultIsolationStrategy": "shared_schema",
    "enterpriseIsolationStrategy": "dedicated_db",
    "welcomeNotificationEnabled": true,
    "offboardingRetentionDays": 30
  }
}
```

---

# ═══════════════════════════════════════════════════
# P7a + P7b COMPLETION SUMMARY
# ═══════════════════════════════════════════════════

## Task Type Sequence — FLOW-10 (T103–T124)

| Range | Domain | Archetypes | Count |
|-------|--------|-----------|-------|
| T103–T106 | Tenant Control Plane | PROVISION (×3), ORCHESTRATION (×1) | 4 |
| T107–T111 | Content Lifecycle | STATE_MACHINE (×3), COMPUTATION (×1), SCHEDULED (×1) | 5 |
| T112–T116 | Commerce Checkout | ORCHESTRATION (×1), TRANSACTIONAL (×2), STATE_MACHINE (×1), SCHEDULED (×1) | 5 |
| T117–T119 | Product Propagation | FAN_OUT (×2), BATCH (×1) | 3 |
| T120–T122 | App Extensibility | PROVISION (×2), EVENT (×1) | 3 |
| T123–T124 | Search/Notification | FAN_OUT (×1), ASYNC (×1) | 2 |
| **Total** | **6 domains** | **10 archetype variants** | **22** |

## Iron Rules: 22 task types × ~8 avg = **~192 iron rules**
## Quality Gates: 22 task types × ~8 avg = **~172 quality gates**
## AF Station Map: 11 stations × 22 tasks = **242 cells** ✅
## Flow Templates: 20–24 (5 DAG JSON definitions) ✅

---

## FLOW10:MERGE:P7b SAVE POINT ✅
## P7a + P7b = ALL 22 TASK TYPES COMPLETE (T103–T124)
## Next: Phase 8 — BFA Conflict Rules + Stress Tests
## Recovery: "Continue FLOW-10 from P8" → Start P8
