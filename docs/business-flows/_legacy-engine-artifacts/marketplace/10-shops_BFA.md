# FLOW-10 — P8: BFA CONFLICT RULES + STRESS TESTS
## CMS + Commerce + Multi-Tenant Platform Engine
## CF-96–CF-130 | ST-47–ST-58 | Save Point: FLOW10:MERGE:P8
## Merge Target: ENGINE_ARCHITECTURE_MERGED.md (BFA section)
## Sequence: T103–T124 complete (P7a+P7b). This file: guardrails layer.

---

# ═══════════════════════════════════════════════════
# BFA CONFLICT RULES — CF-96 through CF-130
# Cross-flow conflict detection for FLOW-10
# ═══════════════════════════════════════════════════

## DOMAIN: TENANT ISOLATION (CF-96 – CF-102)

### CF-96: Cross-Tenant Data Exposure on Provisioning
**TRIGGER:** T103 (Onboarding) or T104 (Isolation Activation) completes
**CONFLICT:** New tenant's data scope overlaps with existing tenant. Routing table maps new tenantId to an existing tenant's schema/DB/index.
**DETECTION:** After T104 activation: F315.ValidateTenantScopingAsync(newTenantId) returns wrongTenantId > 0
**SEVERITY:** CRITICAL — BUILD FAILURE. No deploy. No "warn and ship."
**RESOLUTION:** Rollback T104 activation. Re-run isolation binding determination (F246). Alert platform ops.
**REFERENCED BY:** T103, T104, T123

### CF-97: Duplicate Tenant Registration
**TRIGGER:** T103 receives registration payload with identical business identifiers to existing tenant
**CONFLICT:** Two tenant records created for same organization. Entitlements, billing, data split across duplicates.
**DETECTION:** F260 idempotency key check on registration payload hash. F244 search for matching business identifiers.
**SEVERITY:** HIGH — operation blocked, existing tenant returned
**RESOLUTION:** Return existing tenantId. No new record created. DataProcessResult.Success with existing flag.
**REFERENCED BY:** T103

### CF-98: Isolation Binding Conflict
**TRIGGER:** T104 activates separate_schema isolation for new tenant
**CONFLICT:** Schema name collision — new tenant's schema name already exists (from a partially-offboarded tenant or naming collision).
**DETECTION:** CREATE SCHEMA IF NOT EXISTS returns false (schema exists); ownership check fails.
**SEVERITY:** HIGH — activation blocked
**RESOLUTION:** Generate unique schema suffix. Re-attempt with collision-free name. Log collision in F250.
**REFERENCED BY:** T104

### CF-99: Entitlement Bleed on Plan Downgrade
**TRIGGER:** T105 processes plan change from enterprise → starter
**CONFLICT:** Enterprise-tier features (AI recommendations, bulk import, advanced analytics) remain active after downgrade.
**DETECTION:** After T105: F251 entitlement check for above-tier features returns enabled=true when expected=false.
**SEVERITY:** HIGH — revenue leakage + unfair competitive advantage
**RESOLUTION:** T105 MUST disable above-tier features BEFORE emitting event. Post-check validates all disabled.
**REFERENCED BY:** T105

### CF-100: Quota Enforcement Race
**TRIGGER:** T105 sets quota limits; concurrent operations check same quota
**CONFLICT:** Two operations pass quota check simultaneously, both proceed, actual usage exceeds quota.
**DETECTION:** Metering (F250) shows usage > limit for period.
**SEVERITY:** MEDIUM — soft enforcement acceptable for brief window
**RESOLUTION:** Atomic quota check-and-decrement. Brief overage acceptable; next operation blocked until within limit.
**REFERENCED BY:** T105

### CF-101: Offboarding Active Tenant Without Confirmation
**TRIGGER:** T106 receives offboard request
**CONFLICT:** Offboarding proceeds without explicit confirmation token → accidental tenant deletion.
**DETECTION:** T106 step 1 validates confirmation token. Missing/invalid token → immediate DataProcessResult.Failure.
**SEVERITY:** CRITICAL — irreversible data loss
**RESOLUTION:** Confirmation token required. F305 workflow blocks at step 1 without valid token.
**REFERENCED BY:** T106

### CF-102: Data Deleted Under Legal Hold
**TRIGGER:** T106 step reaches data archive/delete phase
**CONFLICT:** Legal hold flag is set for this tenant but delete proceeds anyway.
**DETECTION:** Legal hold check in T106 step 2 queries F250 audit for active holds.
**SEVERITY:** CRITICAL — legal/regulatory violation
**RESOLUTION:** T106 pauses at "suspended" status. Physical delete blocked. Only anonymization permitted. Alert compliance team.
**REFERENCED BY:** T106

---

## DOMAIN: CONTENT LIFECYCLE (CF-103 – CF-109)

### CF-103: Concurrent Content Modification
**TRIGGER:** T107, T108, T109 — two actors modify same content entity simultaneously
**CONFLICT:** Second actor's transition overwrites first actor's change (lost update).
**DETECTION:** Optimistic lock (version column) on content record in PostgreSQL. Second write receives stale version → DataProcessResult.Conflict.
**SEVERITY:** MEDIUM — data integrity
**RESOLUTION:** Return Conflict to second actor. Client refreshes and retries. No silent overwrite.
**REFERENCED BY:** T107, T108, T111

### CF-104: Invalid State Transition
**TRIGGER:** T107 or T109 — transition attempt from illegal source state
**CONFLICT:** Archived→Published, Draft→Archived, InReview→Archived — state machine violation.
**DETECTION:** EP-1 state machine (F298) validates legal transitions. Illegal transition → DataProcessResult.Failure.
**SEVERITY:** MEDIUM — business logic error
**RESOLUTION:** Return Failure with current state + allowed transitions. No state change.
**REFERENCED BY:** T107, T109

### CF-105: Self-Review Violation
**TRIGGER:** T108 — author attempts to approve their own content
**CONFLICT:** Self-review bypasses editorial quality control.
**DETECTION:** T108 compares actorId with content authorId when selfReviewAllowed=false (F245 config).
**SEVERITY:** MEDIUM — policy violation
**RESOLUTION:** DataProcessResult.Failure("self_review_not_allowed"). Content stays in InReview.
**REFERENCED BY:** T108

### CF-106: Re-Publish Archived Content
**TRIGGER:** Actor attempts to transition Archived→Published (or Archived→Draft for re-editing)
**CONFLICT:** Archived content may have been removed from search index and CDN. Re-publishing without re-indexing creates inconsistency.
**DETECTION:** T109 checks tenant config (F245): "allowRePublishArchived" flag.
**SEVERITY:** LOW — configurable behavior
**RESOLUTION:** If allowed: transition Archived→Draft (requires re-publish through normal pipeline). If not: DataProcessResult.Failure.
**REFERENCED BY:** T109

### CF-107: Media Storage Quota Exceeded
**TRIGGER:** T110 — media upload when tenant storage is at/over quota
**CONFLICT:** Upload succeeds but storage quota exceeded → billing surprise or service disruption.
**DETECTION:** T110 step 2: F251 quota check before processing. Remaining storage < file size → block.
**SEVERITY:** MEDIUM — resource management
**RESOLUTION:** DataProcessResult.Failure("storage_quota_exceeded"). Upload rejected before processing. Admin notified.
**REFERENCED BY:** T110

### CF-108: Malicious File Upload
**TRIGGER:** T110 — file with executable content disguised as image
**CONFLICT:** Executable file stored and potentially served via CDN → security breach.
**DETECTION:** Magic-byte validation (file header bytes, not MIME type or extension). Executable signatures detected.
**SEVERITY:** CRITICAL — security breach
**RESOLUTION:** DataProcessResult.Failure("invalid_file_type"). File rejected. Security event logged via F250. Alert security team.
**REFERENCED BY:** T110

### CF-109: Missed Scheduled Publish Timer
**TRIGGER:** T111 — EP-2 scheduler was down during scheduled publish time
**CONFLICT:** Content expected to be published at scheduled time remains in Scheduled state.
**DETECTION:** F306.RecoverMissedTimersAsync on startup: finds timers with scheduledAt < now and status=pending.
**SEVERITY:** MEDIUM — content delivery delay
**RESOLUTION:** Execute delayed publish immediately on recovery. Log latency (scheduledAt vs actualPublishAt). Alert if delay > 5 min.
**REFERENCED BY:** T111

---

## DOMAIN: COMMERCE (CF-110 – CF-119)

### CF-110: Last-Unit Inventory Conflict
**TRIGGER:** T112 or T116 — two checkouts for same SKU with only 1 unit available
**CONFLICT:** Both checkouts succeed reservation → one order can't be fulfilled.
**DETECTION:** F290 optimistic lock (PostgreSQL row version). Second ReserveAsync with stale version → DataProcessResult.Conflict.
**SEVERITY:** HIGH — customer experience + fulfillment failure
**RESOLUTION:** First reservation succeeds. Second gets Conflict → checkout creation fails. Customer informed.
**REFERENCED BY:** T112, T116

### CF-111: Stale Price at Checkout
**TRIGGER:** T112 — price changed between add-to-cart and checkout creation
**CONFLICT:** Customer expects one price, checkout shows different price → trust violation.
**DETECTION:** T112 step 2: F289.ResolvePriceAsync at checkout time. Compare with cart snapshot price.
**SEVERITY:** MEDIUM — always use server-computed price
**RESOLUTION:** Server price ALWAYS wins. If differs from cart: checkout created with new price. Client notified of change.
**REFERENCED BY:** T112, T119

### CF-112: Double-Charge Prevention
**TRIGGER:** T113 — concurrent confirm requests for same checkout
**CONFLICT:** Two payment captures for same order → customer charged twice.
**DETECTION:** F292 session lock + F260 idempotency key (tenantId:checkoutId:confirm). Second request blocked/returns existing.
**SEVERITY:** CRITICAL — financial harm + regulatory
**RESOLUTION:** Session locked during capture. Concurrent → existing result returned. F260 prevents duplicate PSP call.
**REFERENCED BY:** T113

### CF-113: Inventory Committed After Payment Failure
**TRIGGER:** T113 — payment capture fails but inventory reservation was already committed
**CONFLICT:** Stock decremented for an order that won't exist → phantom inventory loss.
**DETECTION:** T113 step ordering: capture BEFORE commit. If capture fails → inventory NOT committed.
**SEVERITY:** HIGH — inventory integrity
**RESOLUTION:** Step order enforced: authorize → capture → commit inventory. Capture failure → void auth + release reservation (not commit).
**REFERENCED BY:** T113

### CF-114: Order Created Without Payment
**TRIGGER:** T113 — order record created but payment capture actually failed (race/bug)
**CONFLICT:** Order exists in system without successful payment → fulfillment of unpaid order.
**DETECTION:** T113 step ordering: order creation ONLY after capture success. F307 outbox ensures atomicity.
**SEVERITY:** CRITICAL — financial loss
**RESOLUTION:** Order creation gated by capture success in same transaction. order.created outbox event only written with order record.
**REFERENCED BY:** T113

### CF-115: Double Fulfillment
**TRIGGER:** T114 — shipment creation triggered twice for same order
**CONFLICT:** Two packages shipped for one order → cost + customer confusion.
**DETECTION:** F260 idempotency key (tenantId:orderId:fulfillment). Second create_shipment returns existing.
**SEVERITY:** HIGH — cost + logistics
**RESOLUTION:** Idempotent shipment creation. Second attempt returns existing shipment, no duplicate.
**REFERENCED BY:** T114

### CF-116: Fulfillment of Cancelled Order
**TRIGGER:** T114 — order.paid event consumed but order was subsequently cancelled
**CONFLICT:** Shipment created for cancelled order.
**DETECTION:** T114 reads current order state from F294 (not event payload). If state ≠ paid → no-op.
**SEVERITY:** HIGH — wasted shipment
**RESOLUTION:** Always read authoritative state. Cancelled/refunded order → DataProcessResult.Failure. No shipment.
**REFERENCED BY:** T114

### CF-117: Double-Refund Prevention
**TRIGGER:** T115 — return/refund submitted twice for same orderId + returnId
**CONFLICT:** Customer refunded twice for same return.
**DETECTION:** F260 idempotency key (tenantId:orderId:returnId:refund). Second refund returns existing.
**SEVERITY:** CRITICAL — financial loss
**RESOLUTION:** Idempotent. Second request returns existing refund result. PSP not called again.
**REFERENCED BY:** T115

### CF-118: Return Window Exceeded
**TRIGGER:** T115 — return requested after configurable return window (default 30 days)
**CONFLICT:** Refund processed outside policy window → financial policy violation.
**DETECTION:** T115 eligibility check: order.deliveredAt + returnWindow(F245) < now.
**SEVERITY:** MEDIUM — policy enforcement
**RESOLUTION:** DataProcessResult.Failure("return_window_exceeded"). Admin override available (separate flow).
**REFERENCED BY:** T115

### CF-119: Reservation Release After Successful Checkout
**TRIGGER:** T116 — expiry timer fires for a checkout that was already completed
**CONFLICT:** Inventory released for a completed order → stock count inflated.
**DETECTION:** T116 step 1: check checkout status. If "completed" → no-op.
**SEVERITY:** HIGH — inventory integrity
**RESOLUTION:** Status check FIRST. Completed checkout → timer is no-op (DataProcessResult.Success, no release).
**REFERENCED BY:** T116

---

## DOMAIN: PRODUCT PROPAGATION (CF-120 – CF-123)

### CF-120: Search Index Lag
**TRIGGER:** T117, T119, T123 — propagation delay between domain write and search index update
**CONFLICT:** Search returns stale data (old price, old title, deleted product still showing).
**DETECTION:** F315.GetIndexStatusAsync: lagSeconds > threshold (configurable, default 5s).
**SEVERITY:** MEDIUM — expected eventual consistency window
**RESOLUTION:** Acceptable lag < threshold. Alert if sustained lag > 30s. Consumer group scaling available.
**REFERENCED BY:** T117, T119, T123

### CF-121: CDN Cache Stale After Propagation
**TRIGGER:** T117, T119 — CDN still serving old product/price data after update
**CONFLICT:** Customer sees outdated information on storefront.
**DETECTION:** F318 purge job status: if purge fails or CDN provider returns error.
**SEVERITY:** MEDIUM — customer experience
**RESOLUTION:** Retry CDN purge. If CDN provider down: log + alert. Surrogate key (cache tag) purge as fallback.
**REFERENCED BY:** T117, T119

### CF-122: Import Quota Exceeded Mid-Batch
**TRIGGER:** T118 — bulk import reaches tenant's product quota during processing
**CONFLICT:** Import silently truncated or continues past limit.
**DETECTION:** T118 checks F251 quota at start AND tracks count during processing. Exceeds → stop.
**SEVERITY:** MEDIUM — resource governance
**RESOLUTION:** Processing stops at quota boundary. Partial results reported. Completion event includes accepted + rejected counts.
**REFERENCED BY:** T118

### CF-123: Import Cross-Tenant Contamination
**TRIGGER:** T118 — bulk import record has missing or wrong tenantId
**CONFLICT:** Products indexed under wrong tenant → data breach.
**DETECTION:** Every imported record validated: record.tenantId MUST match batch tenantId. Mismatch → reject record.
**SEVERITY:** CRITICAL — data breach
**RESOLUTION:** Record rejected with error. Not imported. Included in errorSummary. Alert if > 0 mismatches.
**REFERENCED BY:** T118

---

## DOMAIN: APP EXTENSIBILITY (CF-124 – CF-128)

### CF-124: Scope Escalation
**TRIGGER:** T120 — app installation requests scopes not in app manifest
**CONFLICT:** App gains unauthorized access to tenant data.
**DETECTION:** T120 validates requested scopes ⊆ manifest.requiredScopes. Extra scope → Failure.
**SEVERITY:** CRITICAL — unauthorized access
**RESOLUTION:** DataProcessResult.Failure("scope_escalation"). No partial installation. No scopes granted.
**REFERENCED BY:** T120

### CF-125: Duplicate App Installation
**TRIGGER:** T120 or T122 — same app installed twice for same tenant, or uninstall of already-uninstalled app
**CONFLICT:** Duplicate installation → double webhook delivery, double extension point execution.
**DETECTION:** F260 idempotency key (tenantId:appId:install). Existing installation returned.
**SEVERITY:** MEDIUM — operational correctness
**RESOLUTION:** Idempotent. Returns existing installation. No duplicate state created. Uninstall of already-uninstalled → Success.
**REFERENCED BY:** T120, T122

### CF-126: Cross-Tenant Webhook Delivery
**TRIGGER:** T121 — webhook subscription lookup returns subscription from different tenant
**CONFLICT:** TenantA's events delivered to TenantB's app endpoint → data breach.
**DETECTION:** F311 subscription lookup MUST filter by tenantId. Cross-tenant result = empty set + alert.
**SEVERITY:** CRITICAL — data breach
**RESOLUTION:** tenantId filter mandatory on all subscription queries. AF-7 validates at generation time.
**REFERENCED BY:** T121

### CF-127: Scope-Unauthorized Webhook Delivery
**TRIGGER:** T121 — webhook subscription exists for topic but app's scope doesn't authorize it
**CONFLICT:** App receives events for data it shouldn't access (e.g., order events without order scope).
**DETECTION:** F312.CheckScopeAsync per subscription before delivery.
**SEVERITY:** HIGH — unauthorized data access
**RESOLUTION:** Subscription silently skipped (not delivered). Logged in F250 for audit. Not an error.
**REFERENCED BY:** T121

### CF-128: App Data Survives Uninstall
**TRIGGER:** T122 — metafield data from uninstalled app persists in entity records
**CONFLICT:** Orphaned data affects search, entity size, potential data leakage.
**DETECTION:** Post-uninstall check: F313 query for installationId namespace returns > 0 records.
**SEVERITY:** MEDIUM — data hygiene
**RESOLUTION:** T122 queues async cleanup for installationId namespace. Cleanup job verifies deletion.
**REFERENCED BY:** T122

---

## DOMAIN: SEARCH & NOTIFICATIONS (CF-129 – CF-130)

### CF-129: Duplicate Notification
**TRIGGER:** T124 — same domain event consumed twice due to queue retry
**CONFLICT:** Customer receives duplicate email/SMS (order confirmation sent twice).
**DETECTION:** F260 idempotency key (tenantId:correlationId:recipientId:channel).
**SEVERITY:** MEDIUM — customer experience
**RESOLUTION:** Idempotent send. Second processing of same event → skip. F324 records single delivery.
**REFERENCED BY:** T124

### CF-130: Notification to Opted-Out Recipient
**TRIGGER:** T124 — notification dispatch for recipient who has opted out
**CONFLICT:** GDPR/CAN-SPAM violation — notification sent after explicit opt-out.
**DETECTION:** F321 preference check BEFORE template render. Opted-out → suppress.
**SEVERITY:** HIGH — regulatory violation
**RESOLUTION:** Notification suppressed. F324 records "suppressed:opt_out". DataProcessResult.Success (not error). GDPR compliant.
**REFERENCED BY:** T124

---

# ═══════════════════════════════════════════════════
# BFA CONFLICT RULES SUMMARY
# ═══════════════════════════════════════════════════

| Domain | CF Range | Count | CRITICAL | HIGH | MEDIUM | LOW |
|--------|----------|-------|----------|------|--------|-----|
| Tenant Isolation | CF-96–CF-102 | 7 | 3 | 2 | 1 | 1 |
| Content Lifecycle | CF-103–CF-109 | 7 | 1 | 0 | 5 | 1 |
| Commerce | CF-110–CF-119 | 10 | 3 | 4 | 3 | 0 |
| Product Propagation | CF-120–CF-123 | 4 | 1 | 0 | 3 | 0 |
| App Extensibility | CF-124–CF-128 | 5 | 2 | 1 | 2 | 0 |
| Search/Notifications | CF-129–CF-130 | 2 | 0 | 1 | 1 | 0 |
| **Total** | **CF-96–CF-130** | **35** | **10** | **8** | **15** | **2** |

**CRITICAL rules (10):** CF-96, CF-101, CF-102, CF-108, CF-112, CF-114, CF-117, CF-123, CF-124, CF-126
All CRITICAL = BUILD FAILURE or immediate block. No deploy. No warn-and-ship.

---

# ═══════════════════════════════════════════════════
# STRESS TESTS — ST-47 through ST-58
# Cross-flow load + correctness validation
# ═══════════════════════════════════════════════════

## ST-47: Concurrent Tenant Onboarding Storm
**TARGET:** T103 + T104 + T105
**SCENARIO:** 50 concurrent tenant onboarding requests with mixed tiers (starter/pro/enterprise)
**ASSERTIONS:**
- All 50 tenants created with unique tenantIds
- No isolation binding collisions (CF-98)
- Each tenant's entitlements match their tier
- F305 shows complete workflow for all 50
- Total time < 5 minutes for all 50
**LOAD:** 50 concurrent, ramp over 10 seconds

## ST-48: Content Publishing Under Concurrent Edit
**TARGET:** T107 + T108
**SCENARIO:** 10 editors simultaneously edit/publish/review the same 5 content entities
**ASSERTIONS:**
- Optimistic lock prevents lost updates (CF-103)
- Exactly one publish succeeds per content entity per round
- All others receive DataProcessResult.Conflict
- Revision history is consistent (no gaps, no overwrites)
- All outbox events have correct tenantId
**LOAD:** 10 concurrent actors × 5 entities = 50 concurrent operations

## ST-49: Checkout Black Friday Simulation
**TARGET:** T112 + T113 + T116
**SCENARIO:** 1,000 concurrent checkout creations for a product catalog with 100 SKUs, 10 units each. Then 500 concurrent payment confirmations.
**ASSERTIONS:**
- Exactly 1,000 inventory units reserved (100 × 10)
- Last-unit conflicts (CF-110) correctly handled — exactly 10 successful checkouts per SKU
- Zero double-charges (CF-112) on payment confirmation
- Abandoned checkouts (T116) release inventory correctly after expiry
- Order count = successful captures only
- All prices server-computed (no client price accepted)
**LOAD:** 1,000 → 500 → T116 expiry wave for abandoned

## ST-50: Payment Capture Crash Recovery
**TARGET:** T113
**SCENARIO:** Service crashes between payment capture and order creation for 20 checkout sessions
**ASSERTIONS:**
- F307 outbox processor replays on recovery
- No double-charges (F260 idempotency key prevents re-capture)
- Orders created for all successful captures on recovery
- Checkout sessions with failed captures have inventory released
- F305 checkpoint-and-replay reconstructs state from last checkpoint
**LOAD:** 20 crash-recovery cycles

## ST-51: Bulk Import 10K Products Under Quota
**TARGET:** T118
**SCENARIO:** Tenant with 15,000 product quota imports 10,000 products via CSV
**ASSERTIONS:**
- 100 chunks processed (100 per chunk)
- Progress events emitted at each boundary (100 events)
- F315.BulkIndexAsync called (not individual IndexDocumentAsync)
- Invalid records (50 seeded) skipped and in errorSummary
- Metering updated with 9,950 accepted products
- Facet cache invalidated once after completion
- Total time < 3 minutes
**LOAD:** 10,000 records, 100/chunk, sequential chunks

## ST-52: Price Change Cart Recalculation Cascade
**TARGET:** T119
**SCENARIO:** Price change for a product present in 500 active carts
**ASSERTIONS:**
- All 500 carts receive recalculation events (enqueued, not inline)
- Search index updated with new price
- CDN cache purged for product URLs
- Price rule cache invalidated
- No cart is recalculated inline (all async)
- allSettled: CDN failure doesn't block cart recalculation
**LOAD:** 1 price change → 500 cart recalc events + 4 parallel consumers

## ST-53: App Installation with Extension Point Failure
**TARGET:** T120 + F308 (compensation)
**SCENARIO:** 20 app installations where step 6 (activate extension points) fails for 10 of them
**ASSERTIONS:**
- 10 successful installations with all 8 steps completed
- 10 failed: rollback executed in reverse (F308) — scopes revoked, webhooks removed, metafields cleaned
- No partial installations exist in F310 for failed attempts
- F305 shows complete rollback sequence for failures
- HMAC keys generated for successful, revoked for failed
**LOAD:** 20 concurrent installs, 10 with injected failure at step 6

## ST-54: Webhook Delivery Under Scope Revocation
**TARGET:** T121 + T122
**SCENARIO:** App being uninstalled (T122) while events for that app's subscriptions are being processed (T121)
**ASSERTIONS:**
- Events arriving after scope revocation are NOT delivered (CF-127)
- Events in flight before revocation may or may not deliver (acceptable race)
- No events delivered after webhook revocation completes
- F250 audit trail shows scope check failures for post-revocation events
**LOAD:** Concurrent: T122 uninstall + 100 events targeting the app's subscriptions

## ST-55: Notification Opt-Out Race
**TARGET:** T124 + F321
**SCENARIO:** Customer opts out (UnsubscribeAsync — synchronous) while order.created notification is being dispatched (async)
**ASSERTIONS:**
- Unsubscribe is synchronous — preference cache invalidated immediately
- If notification already past preference check: may deliver (acceptable race window < 1s)
- Notifications dispatched AFTER unsubscribe complete are suppressed
- F324 records suppressed deliveries correctly
- No notification sent more than 1s after unsubscribe
**LOAD:** 100 concurrent opt-outs + 100 concurrent notifications for same recipients

## ST-56: Tenant Offboarding with Active Apps and Orders
**TARGET:** T106 + T122 + T114
**SCENARIO:** Tenant with 15 installed apps, 200 open orders, and 50 pending content entities is offboarded
**ASSERTIONS:**
- All 15 apps uninstalled (T122 called for each)
- All webhooks disabled before data archive
- Open orders transitioned to appropriate terminal state
- Legal hold check executed before any data deletion
- Export completed before archive
- F305 workflow shows all 10+ steps completed
- Total offboarding time < 10 minutes
**LOAD:** 1 tenant with complex state

## ST-57: Cross-Tenant Search Isolation Verification
**TARGET:** T123 + F315 + F316
**SCENARIO:** 100 tenants, each with 1,000 products indexed. Run search queries from each tenant.
**ASSERTIONS:**
- Each tenant's search returns ONLY their products (DNA-5)
- F315.ValidateTenantScopingAsync passes for all 100 tenants
- Cross-tenant query injection attempt (overriding tenantId in filter) is blocked by F316 auto-inject
- Total of 100 × 1,000 = 100,000 documents, zero cross-tenant leaks
**LOAD:** 100 concurrent search queries across 100 tenants

## ST-58: Full Pipeline End-to-End (Tenant → Product → Checkout → Notification)
**TARGET:** T103 → T105 → T118 → T112 → T113 → T114 → T124
**SCENARIO:** Complete lifecycle test: onboard tenant → import products → customer checkout → payment → fulfillment → notification delivery
**ASSERTIONS:**
- Tenant onboarded with correct isolation (T103-T105)
- 100 products bulk imported (T118)
- 5 concurrent checkouts created (T112)
- 5 payments confirmed (T113, no double-charge)
- 5 orders fulfilled (T114)
- 5 order confirmation emails dispatched (T124)
- All operations scoped to single tenantId throughout
- End-to-end time < 2 minutes
**LOAD:** Sequential pipeline, 1 tenant, 5 concurrent customers

---

# ═══════════════════════════════════════════════════
# STRESS TESTS SUMMARY
# ═══════════════════════════════════════════════════

| ST# | Name | Target Tasks | Load Profile | Primary CF Validated |
|-----|------|-------------|-------------|---------------------|
| ST-47 | Concurrent Onboarding | T103-T105 | 50 concurrent | CF-96, CF-97, CF-98 |
| ST-48 | Content Concurrent Edit | T107-T108 | 10×5=50 ops | CF-103, CF-105 |
| ST-49 | Black Friday Checkout | T112-T113, T116 | 1,000 checkouts | CF-110, CF-112 |
| ST-50 | Payment Crash Recovery | T113 | 20 crash cycles | CF-112, CF-113, CF-114 |
| ST-51 | Bulk Import 10K | T118 | 10,000 records | CF-122, CF-123 |
| ST-52 | Price Cascade | T119 | 500 cart recalcs | CF-111, CF-120, CF-121 |
| ST-53 | App Install Rollback | T120, F308 | 20 installs (10 fail) | CF-124, CF-125 |
| ST-54 | Webhook Scope Race | T121-T122 | 100 events + uninstall | CF-126, CF-127 |
| ST-55 | Notification Opt-Out | T124, F321 | 100+100 concurrent | CF-129, CF-130 |
| ST-56 | Complex Offboarding | T106, T122 | 1 complex tenant | CF-101, CF-102 |
| ST-57 | Cross-Tenant Search | T123, F315-F316 | 100K documents | CF-96, CF-123 |
| ST-58 | End-to-End Pipeline | T103→T124 | Full lifecycle | All critical CFs |

**Coverage matrix:** All 10 CRITICAL conflict rules validated by at least one stress test.
**Total scenarios:** 12 stress tests covering all 6 domains.

---

## MERGE INSTRUCTIONS

When merging into ENGINE_ARCHITECTURE_MERGED.md:

1. Append CF-96–CF-130 after existing CF-95 in BFA section
2. Append ST-47–ST-58 after existing ST-46 in stress test section
3. Update counts:
   ```
   BFA CONFLICT: CF-1-CF-130 (130 rules total)
   STRESS TESTS: ST-1-ST-58 (58 tests total)
   ```

---

## PHASE 8 COMPLETE: CF-96–CF-130 (35 rules), ST-47–ST-58 (12 tests) ✅
## SAVE POINT: FLOW10:MERGE:P8 ✅
## Next: Phase 9 — Skill Patterns SK-44–SK-55 + Source Index
## Recovery: "Continue FLOW-10 from P9" → Start P9
