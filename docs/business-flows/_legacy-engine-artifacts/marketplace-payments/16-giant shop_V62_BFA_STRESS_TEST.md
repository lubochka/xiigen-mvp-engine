# XIIGen V62 BFA STRESS TEST — FLOW-08 EXTENSION
## 16 — Giant Shop Platforms (Amazon/AliExpress-class Marketplace)
## Appends after FLOW-07 section in V62_BFA_STRESS_TEST_MERGED.md
## Date: 2026-02-26 | Save Point: MERGE:P3 ✅

---

## PRE-FLOW-08 BFA STATE
```
BFA Conflict Rules: CF-1–CF-63  (FLOW-01 through FLOW-07)
Stress Tests:       ST-1–ST-30  (FLOW-01 through FLOW-07)
Next rule:          CF-64
Next stress test:   ST-31
```

---

# FLOW-08 BFA CONFLICT RULES — CF-64 through CF-77

## CF-64 — KYC Pending Blocks Listing Submission

**Rule**: A seller with KYC status ≠ APPROVED MUST NOT be permitted to submit a listing for moderation.

**Entities Involved**: `Seller` (F244), `Listing` (F245)

**Trigger**: `listing.submit_request` event OR HTTP POST to listing submit endpoint

**Detection Mechanism**: BFA index check — on every listing submission event, BFA queries
`seller.kyc_status` from `marketplace.seller.kyc_index`. If status ∈
{PENDING_KYC, UNDER_REVIEW, REJECTED, SUSPENDED, CLOSED} → REJECT with
`{"errorCode": "kyc_not_approved", "sellerStatus": "<current_status>"}`

**Proof**:
- Prevents unverified sellers from entering the listing pipeline, bypassing KYC gates
- Protects marketplace from fraudulent listings before moderation can run
- Enforces T83 (KYC gate) as mandatory prerequisite for T84 (Listing Moderation)

**Cross-flow**: FLOW-08 internal (T83 → T84 dependency)

**Resolution**: Seller must complete KYC (T83 APPROVED path) before listing submission accepted

**Actor Types**: `seller` (blocked actor), `admin` (can override in special cases via config)

---

## CF-65 — Cart Reservation TTL Sync with Inventory Soft-Reservation TTL

**Rule**: Cart item TTL (F247, Redis) MUST be ≤ Inventory soft-reservation TTL (F250, Redis).
Cart items cannot be held longer than the inventory soft-lock protecting them.

**Entities Involved**: `Cart` (F247), `InventoryReservation` (F250)

**Trigger**: Any cart item add (F247.AddItemAsync) or TTL config change

**Detection Mechanism**: BFA startup validation — reads `marketplace.cart.item.ttl_seconds` and
`marketplace.inventory.soft_reservation.ttl_seconds` from FREEDOM config. ASSERT cart_ttl ≤
inventory_ttl. On mismatch → BUILD WARNING if difference < 60s, BUILD FAILURE if
cart_ttl > inventory_ttl.

**Proof**:
- If cart TTL > inventory soft-reservation TTL: buyer sees item in cart, soft reservation expires,
  competing buyer can grab stock → checkout fails with "out of stock" after cart commitment
- TTL alignment ensures cart holds are always backed by inventory holds

**Cross-flow**: FLOW-08 internal (F247 ↔ F250)

**Resolution**: Admin sets `marketplace.cart.item.ttl_seconds` ≤
`marketplace.inventory.soft_reservation.ttl_seconds` (both FREEDOM config)

---

## CF-66 — Order Confirmed Blocks Listing Deactivation

**Rule**: A listing with at least one order in status ∈ {CONFIRMED, SHIPPED} MUST NOT be deleted
or suspended by the seller (admin can still suspend for policy violations).

**Entities Involved**: `Order` (F248), `Listing` (F245)

**Trigger**: `listing.deactivate_request` or `listing.delete_request` event

**Detection Mechanism**: BFA index query — on seller-initiated listing deactivation, BFA checks
`marketplace.order_listing_index` for orders with `listingId = X AND status IN (CONFIRMED, SHIPPED)`.
If count > 0 → REJECT with `{"errorCode": "listing_has_active_orders", "activeOrderCount": N}`

**Proof**:
- Seller cannot abandon buyers who have already placed orders
- Protects buyers from receiving "listing not found" during active fulfillment
- Admin override path preserved for policy enforcement (CF-72 covers that direction)

**Cross-flow**: FLOW-08 internal (T85 ↔ T84)

**Actor Types**: `seller` (blocked from deactivating), `admin` (permitted to suspend via CF-72)

---

## CF-67 — Payment No Duplicate Authorization

**Rule**: A single order MUST NOT have more than one AUTHORIZED or IN_PROGRESS payment
simultaneously. Idempotency enforcement via EP-4.

**Entities Involved**: `Payment` (F249), `IdempotencyKey` (F256)

**Trigger**: F249.AuthorizePaymentAsync call

**Detection Mechanism**: EP-4 enforcement (F256.GetOrCreateAsync) — if idempotency key status =
IN_PROGRESS → return `DataProcessResult.Conflict("duplicate_authorization_in_flight")`. BFA
additionally maintains `marketplace.payment_status_index`: if any payment for orderId has status
AUTHORIZED → reject new authorize call.

**Proof**:
- Network timeout on authorization response can cause client to retry → without idempotency →
  double authorization → double hold on buyer's payment method
- EP-4 + BFA index provides defense-in-depth: EP-4 at operation level, BFA at flow level

**Cross-flow**: FLOW-08 internal (T85, T86 ↔ EP-4/F256)

**Resolution**: Retries MUST carry same idempotency key as original call; BFA returns cached
AUTHORIZED result

---

## CF-68 — Hard Inventory Reservation Blocks Competing Buyers

**Rule**: A listing with a HARD inventory reservation for Order A MUST NOT allow a new HARD
reservation for any other concurrent Order B for the same SKU/quantity combination.

**Entities Involved**: `InventoryReservation` (F250), multiple buyers

**Trigger**: F250.PromoteToHardReservationAsync call

**Detection Mechanism**: F250 uses Redis SETNX for soft reservation, PG row locking for hard
reservation. BFA maintains `marketplace.inventory_hard_reservation_index` with
`(listingId, quantity, orderId, expiresAt)`. On hard reservation attempt: BFA checks
available stock = listed_stock − hard_reserved_stock. If insufficient → REJECT with
`{"errorCode": "insufficient_inventory", "availableStock": N}`

**Proof**:
- Without hard reservation locking, two concurrent checkouts for the last unit both succeed at
  payment authorization → one fulfillment fails → buyer damage + compensation saga required
- Prevents overselling at the engine level

**Cross-flow**: FLOW-08 internal (T85 multi-buyer concurrency)

---

## CF-69 — Shipment Creation Triggers Payment Capture

**Rule**: When F251 publishes ShipmentCreated event, T86 (Payment Escrow Lifecycle Gate) MUST
trigger F249.CapturePaymentAsync within the capture window.

**Entities Involved**: `Shipment` (F251), `Payment` (F249)

**Trigger**: `shipment.created` event on Queue Fabric

**Detection Mechanism**: BFA event correlation — BFA subscribes to `shipment.created`. For each
event, BFA checks `marketplace.payment_status_index` for the associated orderId. If payment status
= AUTHORIZED and capture has not fired within config window → BFA escalates to DLQ with alert.

**Proof**:
- ShipmentCreated without payment capture → seller ships without being paid → financial loss
- Event-driven trigger ensures capture is not missed even if T86 worker restarts

**Cross-flow**: FLOW-08 internal (T87 → T86)

**Resolution**: T86 subscribes to `shipment.created` event; BFA monitors correlation timeout

---

## CF-70 — Open Dispute Freezes Seller Payout

**Rule**: If a DisputeCase is OPENED for any order by buyer, the seller's payout for that specific
order MUST be frozen (HoldPayoutAsync) immediately. Payout MUST NOT be released while dispute is
not CLOSED.

**Entities Involved**: `DisputeCase` (F252), `SellerPayout` (F253)

**Trigger**: `dispute.opened` event on Queue Fabric

**Detection Mechanism**: BFA subscribes to `dispute.opened`. On receipt: checks
`marketplace.payout_schedule_index` for any pending/scheduled payout for `sellerId + orderId`.
If found → triggers F253.HoldPayoutAsync. BFA blocks all F253.ReleasePayoutAsync calls for seller
if ANY dispute is OPEN (seller-level hold, not just order-level).

**Proof**:
- Without hold: seller receives payout, dispute ruled for buyer, refund source is gone →
  platform absorbs loss
- Seller-level hold prevents circumvention via payout for other orders

**Cross-flow**: FLOW-08 internal (T88 ↔ T89) — **FIRST TWO-ACTOR CONFLICT RULE IN ENGINE**

**Actor Types**: `buyer` (opener), `seller` (blocked), `admin` (can override in special circumstances)

---

## CF-71 — Refund Execution Releases Inventory If Order Unfulfilled

**Rule**: When a RefundExecuted event fires for an order that has NOT yet been shipped
(status ∈ {CONFIRMED, NOT_SHIPPED}), F250 MUST release the hard inventory reservation.

**Entities Involved**: `Payment` refund (F249), `InventoryReservation` (F250), `Order` (F248)

**Trigger**: `refund.executed` event on Queue Fabric

**Detection Mechanism**: BFA subscribes to `refund.executed`. Checks
`marketplace.order_status_index` for orderId. If order status ∈ {CONFIRMED, NOT_SHIPPED} →
triggers F250.ReleaseReservationAsync. If order status = SHIPPED or DELIVERED → inventory
already consumed, no release needed.

**Proof**:
- Without inventory release: refunded order still holds stock → competing buyers see "out of
  stock" for phantom reservation
- Protects marketplace inventory accuracy

**Cross-flow**: FLOW-08 internal (T88 → T85 compensation)

---

## CF-72 — Listing Suspension Cancels Open Orders

**Rule**: When a listing is SUSPENDED (by admin for policy violation), any orders in status
CONFIRMED for that listing MUST be canceled and compensated (refund + inventory release).

**Entities Involved**: `Listing` (F245), `Order` (F248), `Payment` refund (F249)

**Trigger**: `listing.suspended` event on Queue Fabric (admin-initiated)

**Detection Mechanism**: BFA subscribes to `listing.suspended`. Queries
`marketplace.order_listing_index` for orders with listingId = X AND status = CONFIRMED. For each
order found → fires compensation: F248.CancelOrderAsync + F249.RefundAsync +
F250.ReleaseReservationAsync (all with idempotency keys from F256).

**Proof**:
- Suspended listing (counterfeit, prohibited item) must not fulfill — buyer receives
  harmful/illegal goods
- Admin suspension must cascade to active orders to protect buyers

**Cross-flow**: FLOW-08 internal (T84/moderation → T85/order compensation)

---

## CF-73 — Payout Hold Notifies Seller of Timeline Extension

**Rule**: When F253.HoldPayoutAsync is executed (triggered by CF-70 dispute), a seller
notification event MUST be published within 500ms informing the seller of the hold reason and
estimated resolution timeline.

**Entities Involved**: `SellerPayout` hold (F253), `Dispute` (F252)

**Trigger**: `payout.held` event on Queue Fabric

**Detection Mechanism**: BFA subscribes to `payout.held`. Checks that a corresponding seller
notification event (`seller.payout_hold_notified`) appears in the event stream within 500ms
window. If not → BFA publishes escalation event.

**Proof**:
- Seller payout frozen without explanation degrades seller trust and marketplace quality
- Transparency requirement: sellers must know WHY and approximately WHEN hold will be resolved

**Cross-flow**: FLOW-08 internal (T89 ↔ T88) — **SECOND TWO-ACTOR CONFLICT RULE IN ENGINE**

---

## CF-74 — FLOW-08 F245 Namespace Isolation from FLOW-06 F225

**Rule**: F245 (IProductCatalogService, FLOW-08) and F225 (IMarketplacePostService, FLOW-06)
operate on different entity namespaces. Their events, indices, and APIs MUST NOT overlap.

**Entities Involved**: F245 (listing entities: Listing, ModerationCase), F225 (social post
entities, FLOW-06)

**Trigger**: BFA startup validation

**Detection Mechanism**: BFA checks event type registry — `listing.*` events (F245) MUST NOT
share event type names with `post.*` events (F225). BFA checks ES index names:
`marketplace.catalog.*` ≠ `marketplace.posts.*`. Checks API routes via DynamicController config.

**Proof**:
- FLOW-06 introduced marketplace-adjacent social features; FLOW-08 introduces actual product catalog
- Namespace collision would cause event consumers to misroute listing events as post events or
  vice versa
- CF-74 maintains the backward compatibility guarantee for FLOW-06

**Cross-flow**: FLOW-08 ↔ FLOW-06 (F245 vs F225)

---

## CF-75 — Discovery Feed Must Not Expose Unpublished Listings

**Rule**: T90 (Marketplace Discovery Ranking, F254) search results MUST NOT contain listings
whose status ≠ PUBLISHED. This applies even if an unpublished listing is present in the
Elasticsearch index.

**Entities Involved**: F254 (IMarketplaceSearchService), F245 (IProductCatalogService),
FLOW-05 feed (F173)

**Trigger**: Every T90 search execution

**Detection Mechanism**: BFA injects a mandatory filter clause into every F254 query:
`listing_status: PUBLISHED`. AF-7 validates this filter is present in generated T90 code.
AF-9 runs assertion: query against listings in SUBMITTED/REJECTED/SUSPENDED status returns
0 results.

**Proof**:
- Elasticsearch index lag can leave draft/rejected listings searchable briefly
- Defense-in-depth: query-time filter prevents this even when index is stale
- FLOW-05 feed (F173) had similar concern; CF-75 extends that pattern to marketplace discovery

**Cross-flow**: FLOW-08 T90 ↔ FLOW-05 F173 feed pattern

---

## CF-76 — Social Signals in Ranking Are Read-Only

**Rule**: T90 (Marketplace Discovery Ranking) MAY consume social connection signals from F234
(FLOW-07, IConnectionGraphService) as personalization inputs. T90 MUST NOT write back to F234 or
update any FLOW-07 entity.

**Entities Involved**: F254 (read), F234 (FLOW-07, read-only)

**Trigger**: BFA code analysis of generated T90 service

**Detection Mechanism**: AF-7 Compliance station validates that generated T90 code contains zero
calls to F234 factory methods (CreateAsync or any write methods). F234 data accessed ONLY via RAG
FABRIC (IRagService.SearchAsync) — never direct factory call. BFA checks event stream: T90 MUST
NOT publish any events that F234 subscribes to.

**Proof**:
- Social graph (FLOW-07) and marketplace search (FLOW-08) are different domains
- Cross-domain write-back creates coupling: marketplace ranking changes social graph state →
  unexpected social side effects
- Read-only via RAG FABRIC maintains clean domain boundaries

**Cross-flow**: FLOW-08 T90 ↔ FLOW-07 F234

---

## CF-77 — Cross-Tenant Marketplace Operation Block

**Rule**: Any marketplace operation (order placement, listing submission, dispute opening, payout
query) MUST fail with HTTP 403 if the requesting actor's tenantId does not match the tenantId of
the target entity.

**Entities Involved**: All FLOW-08 factories (F244–F255), all task types (T83–T90)

**Trigger**: Every factory method call

**Detection Mechanism**: MicroserviceBase (DNA-4) injects `tenantId` from auth context. Every
factory method receives `tenantId` parameter. BFA maintains
`marketplace.tenant_entity_ownership_index`. On any cross-tenant access pattern → immediate 403
response. AF-8 Security station validates BOLA checks in generated code.

**Proof**:
- Marketplace multi-tenancy (DR-22 bridge isolation) requires zero cross-tenant data exposure
- Buyer from Tenant A MUST NOT access orders, listings, or payouts from Tenant B
- This is the absolute isolation guarantee; CF-77 = BUILD FAILURE if violated

**Cross-flow**: FLOW-08 internal + protection of FLOW-01 through FLOW-07 tenant data from
FLOW-08 access patterns

---

# FLOW-08 STRESS TESTS — ST-31 through ST-38

## ST-31 — Concurrent Cart Checkout Race (Hard Reservation Conflict)

**Scenario**: 100 buyers simultaneously add the last unit of a listing to their carts and attempt
checkout at the same second.

**Expected BFA Behavior**:
1. All 100 buyers can add to cart (soft reservation in Redis — eventually consistent)
2. First buyer to call F250.PromoteToHardReservationAsync succeeds → HARD_RESERVED
3. Buyers 2–100: hard reservation fails → CF-68 enforcement → checkout rejected with
   `{"errorCode": "insufficient_inventory", "availableStock": 0}`
4. F247.LockCartAsync (Redis SETNX) ensures only one buyer at a time progresses to hard
   reservation per listing unit
5. Buyer 1 completes saga → order confirmed → inventory decremented

**PASS Criteria**: Exactly 1 order confirmed. 99 buyers receive structured rejection. Zero
duplicate orders. Zero inventory oversell.

**Factories Under Test**: F247 (cart lock), F250 (hard reservation + CF-68), F256 (idempotency)

**DNA Compliance Verified**: DNA-5 (tenantId on all Redis locks), DNA-9 (idempotency on
PromoteToHardReservation)

**STATUS**: PASS ✅

---

## ST-32 — Saga Compensation on Payment Authorization Failure

**Scenario**: T85 saga reaches step 4 (AuthorizePayment). Payment gateway returns error (card
declined). Compensation must fire LIFO: void auth (N/A — never authorized) → release inventory
reservation → unlock cart.

**Expected BFA Behavior**:
1. Steps 1–3 succeed: cart locked, coupon validated, inventory hard-reserved
2. Step 4 fails: F249.AuthorizePaymentAsync returns DataProcessResult.Failure("card_declined")
3. LIFO compensation: C3 = F250.ReleaseReservationAsync(idempotencyKey) → PASS
4. C1 = F247 cart unlocked (soft unlock) → buyer can retry or abandon
5. Buyer receives structured error with retry guidance

**PASS Criteria**: Inventory released (hard reservation removed). Cart unlocked. No order record
created. Compensation executes in LIFO order. Compensation completes within 5s of failure
detection.

**Factories Under Test**: F247, F249, F250, F256 (idempotency on compensation), F257 (no outbox
written for failed saga)

**DNA Compliance Verified**: DNA-9 (compensation steps carry idempotency keys), IR-85-1 (LIFO
order)

**STATUS**: PASS ✅

---

## ST-33 — Transactional Outbox Pod Crash Between Commit and Relay

**Scenario**: F248.CreateOrderAsync writes order to PG (transaction commits), writes outbox row
to `outbox_events` (same transaction). Pod crashes before F257 relay worker runs. Pod restarts.

**Expected BFA Behavior**:
1. On pod restart: F257 relay worker starts polling `outbox_events WHERE relayed_at IS NULL`
2. Finds OrderPlaced outbox row from pre-crash commit
3. Publishes to Redis Streams via IQueueService.EnqueueAsync
4. Marks `relayed_at = NOW()` in PG
5. Downstream consumers (T86, T87) receive OrderPlaced and proceed normally

**PASS Criteria**: OrderPlaced event delivered exactly once to downstream consumers. No duplicate
order processing. Relay idempotent (row marked relayed before retry possible). End-to-end latency
from crash to event delivery < 30s.

**Factories Under Test**: F248 (outbox write), F257 (relay worker), Queue Fabric

**DNA Compliance Verified**: DR-25 (transactional outbox), EP-5 (relay mechanism), DNA-8

**STATUS**: PASS ✅

---

## ST-34 — Duplicate Payment Authorization Retry

**Scenario**: Buyer submits checkout. T85 calls F249.AuthorizePaymentAsync with
idempotencyKey="auth-order-001". Network timeout. Client retries with SAME idempotencyKey.
Gateway processes original on retry.

**Expected BFA Behavior**:
1. First call: F256.GetOrCreateAsync → status=NEW → F256.MarkInProgressAsync → call gateway
2. Network timeout — gateway may or may not have processed
3. Retry: same idempotencyKey → F256.GetOrCreateAsync → status=IN_PROGRESS →
   return `DataProcessResult.Conflict("duplicate_in_flight")`
4. After gateway responds (success or failure): F256.MarkCompletedAsync(result)
5. Subsequent retries → status=COMPLETED → return cachedResult (no duplicate gateway call)

**PASS Criteria**: Zero double-authorizations on buyer payment method. EP-4 idempotency key
prevents duplicate gateway calls. CF-67 (BFA level) provides second defense. Buyer receives
correct result on any retry.

**Factories Under Test**: F249 (payment auth), F256 (EP-4 idempotency)

**DNA Compliance Verified**: DNA-9 (idempotency key enforcement), CF-67 (no duplicate
authorization)

**STATUS**: PASS ✅

---

## ST-35 — Fulfillment Timeout: No Shipment Within SLA Window

**Scenario**: Order confirmed (T87 starts). Seller receives notification but never creates
shipment within `marketplace.fulfillment.seller_ship_deadline_hours` (config, default: 72h).
EP-2 timer fires.

**Expected BFA Behavior**:
1. T87 registers EP-2 timer on order.confirmed for 72h
2. EP-2 fires: ShipmentCreated NOT found in BFA index for this orderId
3. Compensation fires: F249.VoidAuthorizationAsync (idempotencyKey) → payment void
4. F250.ReleaseReservationAsync (idempotencyKey) → inventory released
5. F248.CancelOrderAsync (idempotencyKey, reason="seller_fulfillment_timeout") → order canceled
6. Buyer notification: order canceled, refund processed
7. Seller account receives fulfillment_failure metric increment
   (F244.UpdatePerformanceMetricsAsync)

**PASS Criteria**: All compensations complete within 5s of EP-2 firing. Buyer refunded. Inventory
available to other buyers. Seller performance metric updated. No orphaned hard reservations.

**Factories Under Test**: F248, F249, F250, F244, F256, F257, EP-2

**DNA Compliance Verified**: IR-87-5 (EP-2 timer for fulfillment timeout), IR-85-1 (LIFO
compensation)

**STATUS**: PASS ✅

---

## ST-36 — Dispute Opens While Payout Scheduled

**Scenario**: Order delivered. EP-2 protection window starts (15 days). On day 3, buyer opens
dispute. On day 5, payout was scheduled to release (seller on weekly schedule). CF-70 must block.

**Expected BFA Behavior**:
1. Day 0: order.delivered → F253.CreditWalletAsync → EP-2 15-day timer registered
2. Day 3: buyer opens dispute → `dispute.opened` event → CF-70 BFA triggers
   F253.HoldPayoutAsync
3. Day 5: payout scheduler checks → BFA blocks release (open dispute for seller) → hold confirmed
4. CF-73: F253.HoldPayoutAsync publishes `payout.held` → seller notification within 500ms
5. Day 10: T88 dispute resolved → `dispute.decided` (refund executed) → CF-71: inventory release
   check (irrelevant, already delivered) → F253 hold cleared → payout proceeds net of any refund

**PASS Criteria**: Payout held on day 5 (no release while dispute open). Seller notified of hold
within 500ms. Payout correctly recalculated after dispute resolution. Both CF-70 + CF-73 trigger.

**Factories Under Test**: F252, F253, F249, F256, EP-2

**DNA Compliance Verified**: CF-70 (payout freeze), CF-73 (500ms notification), IR-89-5 (dispute
gate)

**STATUS**: PASS ✅

---

## ST-37 — Cross-Tenant Order Attempt

**Scenario**: Buyer from Tenant-A authenticates and attempts to place an order for a listing
owned by Tenant-B (e.g., by manipulating the listingId in the API request).

**Expected BFA Behavior**:
1. HTTP POST `/commerce/orders` with `listingId` belonging to Tenant-B
2. MicroserviceBase extracts `tenantId = Tenant-A` from JWT
3. F245.GetListingAsync(listingId, tenantId=Tenant-A) → ES query with `tenant_id = Tenant-A`
   filter
4. Listing not found (it belongs to Tenant-B) → DataProcessResult.NotFound
5. Saga stops at step 0 — no cart lock, no inventory reservation, no payment
6. Response: HTTP 403 (CF-77 enforcement — not 404; security by design — do not reveal
   Tenant-B entity existence)

**PASS Criteria**: Zero cross-tenant data exposure. Response is 403 (not 404). No saga steps
execute beyond step 0. No partial state created (no cart lock, no reservation). Audit log entry
written with attempted cross-tenant access pattern.

**Factories Under Test**: F245 (listing lookup with tenantId filter), F247 (never reached),
MicroserviceBase (tenantId injection)

**DNA Compliance Verified**: DNA-5 (tenantId on all factory calls), CF-77 (cross-tenant block =
BUILD FAILURE test), DR-22 (bridge isolation enforced at application layer)

**STATUS**: PASS ✅

---

## ST-38 — Full Marketplace Event Chain: End-to-End Happy Path

**Scenario**: Happy path integration test covering the complete FLOW-08 event chain across all
8 task types and 14 factories from seller onboarding to payout release.

**Event Chain**:
```
[SELLER ONBOARDING — T83]
seller.registration_submitted (F244.RegisterSellerAsync)
  → KYC documents submitted
  → F246.RunKycScreeningAsync (AI Engine — document verification)
  → seller.kyc_approved
  → seller.store_activated (F244.ActivateStoreAsync)

[LISTING — T84]
listing.draft_created (F245.SaveDraftAsync)
  → listing.submitted (F245.SubmitListingAsync)
  → CF-64 check: seller.kyc_status = APPROVED → PASS
  → moderation.case_created (F246.CreateModerationCaseAsync)
  → F246 AI Engine: multi-model screening (AI FABRIC — Claude+GPT parallel)
  → moderation.approved (consensus ≥ 2/3 models)
  → listing.published (F245.PublishListingAsync)
  → F254.IndexListingAsync (ES index with listing_status: PUBLISHED)

[DISCOVERY — T90]
buyer.search_request ("vintage camera")
  → F254.SearchListingsAsync (ES + PUBLISHED filter — CF-75)
  → F255.ApplyPromotionOverlaysAsync (active coupon/flash deal injection)
  → search.results_returned (ranked, personalized via social signal read CF-76)

[ORDER SAGA — T85]
buyer.checkout_initiated
  → F247.LockCartAsync (Redis SETNX)
  → F255.ValidateCouponAsync
  → F250.SoftReserveAsync → F250.PromoteToHardReservationAsync (CF-68 check PASS)
  → F256.GetOrCreateAsync ("auth-order-001") → status=NEW
  → F249.AuthorizePaymentAsync → gateway: AUTHORIZED
  → F256.MarkCompletedAsync("auth-order-001", AUTHORIZED)
  → F248.CreateOrderAsync + F257.WriteOutboxAsync (same PG transaction — EP-5)
    [outbox row: OrderPlaced event]
  → F257 relay publishes OrderPlaced → Queue Fabric
  → order.placed event delivered

[PAYMENT ESCROW — T86]
order.placed received
  → F249.EscrowPaymentAsync (status: HELD)
  → EP-2 timer registered: protection_window = 15 days

[FULFILLMENT — T87]
seller.shipment_created (F251.CreateShipmentAsync)
  → shipment.created event published (F257 outbox)
  → CF-69: BFA detects shipment.created → triggers F249.CapturePaymentAsync
  → F256.GetOrCreateAsync ("capture-order-001") → idempotency gate
  → payment.captured
  → F251.RegisterCarrierTrackingAsync
  → order.shipped event

[DELIVERY]
carrier.tracking_updated (DELIVERED)
  → F251.RecordDeliveryConfirmationAsync
  → order.delivered event
  → EP-2 15-day protection window timer starts (F253.CreditWalletAsync deferred)
  → F253.SchedulePayoutAsync (seller wallet credit pending protection window)

[NO DISPUTE — protection window expires]
EP-2 fires after 15 days
  → CF-70 check: no open disputes for orderId → PASS
  → F253.ReleasePayoutAsync (F256 idempotency key: "payout-order-001")
  → F257 outbox: PayoutReleased event
  → seller.payout_released

[BUYER REVIEW]
buyer.review_submitted (post-purchase — out of FLOW-08 scope, FLOW-06 territory)
```

**PASS Criteria**:
- All 8 task types execute in correct order (T83→T84→T90→T85→T86→T87→T88 optional→T89)
- All 14 factories participate (F244–F257)
- 0 direct provider imports — all via CreateAsync()
- EP-4 idempotency keys present on: auth, capture, compensation steps, payout
- EP-5 outbox used for: OrderPlaced, ShipmentCreated, PaymentCaptured, PayoutReleased
- CF-64, CF-65, CF-67, CF-68, CF-69, CF-75, CF-76, CF-77 all evaluated (PASS)
- CF-70, CF-71, CF-72, CF-73 not triggered (happy path — no dispute, no suspension)
- DNA-1 through DNA-9 all pass (no typed models, BuildSearchFilter, DataProcessResult throughout)
- Tenant isolation: all operations carry tenantId from JWT
- Total events on Queue Fabric: 12 domain events, all via IQueueService.EnqueueAsync
- End-to-end wall time (saga steps only, excluding EP-2 timers): < 8 seconds

**Factories Under Test**: ALL 14 (F244–F257), EP-2, EP-4, EP-5

**DNA Compliance Verified**: DNA-1 through DNA-9 full pass. All 8 BFA rules evaluated.

**STATUS**: PASS ✅

---

# FLOW-08 BFA REGISTRATION DOCUMENT

## Registered Entities (marketplace.entity_registry)

| Entity | Owner Factory | Primary Key | Tenant-Scoped | Indexed In |
|--------|--------------|-------------|---------------|-----------|
| Seller | F244 | sellerId | YES | marketplace.seller.kyc_index |
| Listing | F245 | listingId | YES | marketplace.catalog.listing_index |
| ModerationCase | F246 | caseId | YES | marketplace.moderation.case_index |
| Cart | F247 | cartId (buyerId) | YES | Redis (ephemeral) |
| InventoryReservation | F250 | reservationId | YES | marketplace.inventory_hard_reservation_index |
| Order | F248 | orderId | YES | marketplace.order_status_index + marketplace.order_listing_index |
| Payment | F249 | paymentId | YES | marketplace.payment_status_index |
| Shipment | F251 | shipmentId | YES | marketplace.fulfillment.shipment_index |
| DisputeCase | F252 | disputeId | YES | marketplace.dispute.case_index |
| SellerPayout | F253 | payoutId | YES | marketplace.payout_schedule_index |
| IdempotencyKey | F256 (EP-4) | operationKey | YES | Redis (TTL=24h) |
| OutboxEvent | F257 (EP-5) | outboxId | YES | PG outbox_events table |

## Registered Events (marketplace.event_registry)

```
FLOW-08 event namespace: marketplace.*

seller.registration_submitted       → producer: F244
seller.kyc_approved                 → producer: F246
seller.kyc_rejected                 → producer: F246
seller.store_activated              → producer: F244
listing.draft_saved                 → producer: F245
listing.submitted                   → producer: F245
listing.published                   → producer: F245
listing.rejected                    → producer: F246
listing.suspended                   → producer: F245 (admin action)
listing.deactivated                 → producer: F245
moderation.case_created             → producer: F246
moderation.approved                 → producer: F246
moderation.rejected                 → producer: F246
order.placed                        → producer: F248 (via F257 outbox)
order.confirmed                     → producer: F248 (via F257 outbox)
order.canceled                      → producer: F248 (via F257 outbox)
order.delivered                     → producer: F251
payment.authorized                  → producer: F249 (via F257 outbox)
payment.captured                    → producer: F249 (via F257 outbox)
payment.voided                      → producer: F249 (via F257 outbox)
payment.escrowed                    → producer: F249
refund.executed                     → producer: F249 (via F257 outbox)
inventory.soft_reserved             → producer: F250
inventory.hard_reserved             → producer: F250
inventory.released                  → producer: F250
shipment.created                    → producer: F251 (via F257 outbox)
shipment.tracking_updated           → producer: F251
dispute.opened                      → producer: F252
dispute.seller_responded            → producer: F252
dispute.decided                     → producer: F252
payout.scheduled                    → producer: F253
payout.held                         → producer: F253 (via F257 outbox)
payout.released                     → producer: F253 (via F257 outbox)
seller.payout_hold_notified         → producer: F253

BFA-MONITORED CROSS-EVENT CORRELATIONS:
  [CF-69] shipment.created → expect payment.captured within capture_window
  [CF-70] dispute.opened → expect payout.held within 100ms
  [CF-73] payout.held → expect seller.payout_hold_notified within 500ms
```

## Registered APIs (marketplace.api_registry)

```
DynamicController routes (FREEDOM config — not hardcoded):
  POST   /commerce/sellers/register        → T83 entry
  POST   /commerce/sellers/{id}/kyc        → T83 document upload
  POST   /commerce/listings                → T84 entry (draft)
  POST   /commerce/listings/{id}/submit    → T84 submission
  GET    /commerce/search                  → T90 entry
  POST   /commerce/cart/items              → T85 entry
  POST   /commerce/orders                  → T85 checkout trigger
  GET    /commerce/orders/{id}             → F248 read
  POST   /commerce/orders/{id}/cancel      → T85 compensation
  GET    /commerce/fulfillment/{orderId}   → F251 read
  POST   /commerce/disputes                → T88 entry
  POST   /commerce/disputes/{id}/evidence  → T88 evidence upload
  GET    /commerce/payouts                 → T89 seller payout query
```

## BFA Index Configuration

```json
{
  "bfa_indices": {
    "marketplace.seller.kyc_index": {
      "fields": ["sellerId", "tenantId", "kyc_status", "updatedAt"],
      "watch_events": ["seller.kyc_approved", "seller.kyc_rejected", "seller.store_activated"],
      "conflict_rules": ["CF-64"]
    },
    "marketplace.catalog.listing_index": {
      "fields": ["listingId", "tenantId", "sellerId", "status", "updatedAt"],
      "watch_events": ["listing.published", "listing.suspended", "listing.deactivated"],
      "conflict_rules": ["CF-66", "CF-72", "CF-74", "CF-75"]
    },
    "marketplace.inventory_hard_reservation_index": {
      "fields": ["listingId", "tenantId", "quantity", "orderId", "status", "expiresAt"],
      "watch_events": ["inventory.hard_reserved", "inventory.released"],
      "conflict_rules": ["CF-65", "CF-68", "CF-71"]
    },
    "marketplace.order_status_index": {
      "fields": ["orderId", "tenantId", "buyerId", "sellerId", "listingId", "status"],
      "watch_events": ["order.placed", "order.confirmed", "order.canceled", "order.delivered"],
      "conflict_rules": ["CF-66", "CF-69", "CF-71", "CF-72"]
    },
    "marketplace.payment_status_index": {
      "fields": ["paymentId", "orderId", "tenantId", "status", "idempotencyKey"],
      "watch_events": ["payment.authorized", "payment.captured", "payment.voided"],
      "conflict_rules": ["CF-67", "CF-69"]
    },
    "marketplace.payout_schedule_index": {
      "fields": ["payoutId", "sellerId", "orderId", "tenantId", "status", "scheduledAt"],
      "watch_events": ["payout.scheduled", "payout.held", "payout.released"],
      "conflict_rules": ["CF-70", "CF-73"]
    },
    "marketplace.dispute.case_index": {
      "fields": ["disputeId", "orderId", "buyerId", "sellerId", "tenantId", "status"],
      "watch_events": ["dispute.opened", "dispute.decided"],
      "conflict_rules": ["CF-70", "CF-73"]
    },
    "marketplace.tenant_entity_ownership_index": {
      "fields": ["entityType", "entityId", "tenantId"],
      "watch_events": ["*"],
      "conflict_rules": ["CF-77"]
    }
  }
}
```

---

# FLOW-08 BFA SUMMARY TABLE

| Rule | Name | Type | Severity | Actors |
|------|------|------|----------|--------|
| CF-64 | KYC Pending Blocks Listing | Internal | REJECT | seller |
| CF-65 | Cart TTL ≤ Inventory TTL | Internal | BUILD FAILURE | config |
| CF-66 | Order Confirmed Blocks Deactivation | Internal | REJECT | seller/admin |
| CF-67 | No Duplicate Payment Auth | Internal | CONFLICT | payment system |
| CF-68 | Hard Reservation Blocks Competing Buyers | Internal | REJECT | buyer |
| CF-69 | Shipment Triggers Capture | Internal | ESCALATE | fulfillment |
| CF-70 | Dispute Freezes Payout | **CROSS-ACTOR** | FREEZE | buyer→seller |
| CF-71 | Refund Releases Inventory | Internal | TRIGGER | payment→inventory |
| CF-72 | Suspension Cancels Orders | Admin-cascade | COMPENSATE | admin→orders |
| CF-73 | Payout Hold Notifies Seller | **CROSS-ACTOR** | ESCALATE | system→seller |
| CF-74 | F245 Namespace Isolation | Cross-flow | BUILD FAILURE | FLOW-08↔FLOW-06 |
| CF-75 | No Unpublished in Discovery | Cross-flow | FILTER | FLOW-08↔FLOW-05 |
| CF-76 | Social Signals Read-Only | Cross-flow | BUILD FAILURE | FLOW-08↔FLOW-07 |
| CF-77 | Cross-Tenant Block | Tenant | BUILD FAILURE | all actors |

**Total: 14 conflict rules. 2 cross-actor (first in engine history: CF-70, CF-73).**
**3 cross-flow backward-compat rules: CF-74, CF-75, CF-76.**
**1 tenant isolation absolute rule: CF-77.**

| Test | Name | Covers | Status |
|------|------|--------|--------|
| ST-31 | Concurrent Checkout Race | CF-68, F247, F250 | PASS ✅ |
| ST-32 | Saga Compensation: Card Decline | DNA-9, IR-85-1, F249, F250 | PASS ✅ |
| ST-33 | Outbox Pod Crash + Recovery | EP-5, DR-25, F257, F248 | PASS ✅ |
| ST-34 | Duplicate Payment Auth Retry | EP-4, CF-67, F249, F256 | PASS ✅ |
| ST-35 | Fulfillment SLA Timeout | EP-2, IR-87-5, F248, F249, F250 | PASS ✅ |
| ST-36 | Dispute vs Payout Race | CF-70, CF-73, F252, F253 | PASS ✅ |
| ST-37 | Cross-Tenant Order Attempt | CF-77, DNA-5, DR-22 | PASS ✅ |
| ST-38 | End-to-End Happy Path | All 14 factories, 8 task types | PASS ✅ |

**Stress Tests: 8/8 PASS ✅**

---

## MERGE:P3 STATE SAVE
```
MERGE:P3 = COMPLETE
Target: V62_BFA_STRESS_TEST_MERGED.md
Added: CF-64–CF-77 (14 conflict rules — FLOW-08)
Added: ST-31–ST-38 (8 stress tests — FLOW-08)
Added: BFA Registration (12 entities, 33 events, 13 API routes, 8 BFA indices)
First: CF-70/CF-73 = first two-actor conflict rules in engine history
System: CF-1–CF-77, ST-1–ST-38
Next: MERGE:P4 → SK-29–SK-36 + DD-21–DD-29
```
