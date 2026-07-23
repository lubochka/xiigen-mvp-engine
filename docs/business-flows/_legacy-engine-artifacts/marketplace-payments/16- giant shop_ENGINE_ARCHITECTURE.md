# XIIGen ENGINE ARCHITECTURE — FLOW-08 EXTENSION
## 16 — Giant Shop Platforms (Amazon/AliExpress-class Marketplace)
## Appends after Family 26 / FLOW-07 section in ENGINE_ARCHITECTURE_MERGED.md
## Date: 2026-02-26 | Save Point: MERGE:P1 ✅

---

## PRE-FLOW-08 ENGINE STATE
```
Factories:        F1–F243   (Families 1–26)
Engine Primitives: EP-1 (State Machine), EP-2 (Durable Timer), EP-3 (Card Schema)
DNA Patterns:     DNA-1–DNA-8
Design Records:   DR-1–DR-20
Next factory:     F244
Next family:      Family 27
```

---

# NEW ENGINE PRIMITIVES — EP-4 AND EP-5

## EP-4 — Idempotency Key Registry

**Purpose**: Assigns, stores, and validates idempotency keys for all non-idempotent saga
operations. Prevents double-charge, double-refund, double-payout, and double-reservation under
network retries, pod restarts, and saga compensation replays.

**Layer**: FABRIC (not a factory — infrastructure primitive used by factory methods)

**Storage**: Redis with configurable TTL. Financial operations: 24h TTL. Non-financial: 1h TTL.

**Key composition**: `{operationName}:{entityId}:{attemptId}:{tenantId}`
Example: `auth:order-abc123:attempt-1:tenant-xyz`

**State Machine**:
```
[key not found]  → GetOrCreateAsync → NEW
NEW              → MarkInProgressAsync → IN_PROGRESS
IN_PROGRESS      → MarkCompletedAsync(result) → COMPLETED
IN_PROGRESS      → MarkFailedAsync(error) → FAILED
COMPLETED        → GetOrCreateAsync → return cachedResult (no-op, idempotent)
IN_PROGRESS (on retry) → GetOrCreateAsync → 409 Conflict (duplicate in flight)
FAILED           → allow retry with new attempt variant key
```

**Factory Interface** (F256 — IIdempotencyKeyRegistry):
```csharp
public interface IIdempotencyKeyRegistry
{
    Task<DataProcessResult<Dictionary<string, object>>> GetOrCreateAsync(
        string operationKey, TimeSpan ttl, string tenantId,
        CancellationToken ct = default);
    Task<DataProcessResult<bool>> MarkInProgressAsync(
        string operationKey, string tenantId, CancellationToken ct = default);
    Task<DataProcessResult<bool>> MarkCompletedAsync(
        string operationKey, Dictionary<string, object> result,
        string tenantId, CancellationToken ct = default);
    Task<DataProcessResult<bool>> MarkFailedAsync(
        string operationKey, string errorCode,
        string tenantId, CancellationToken ct = default);
}
```

**FABRIC RESOLUTION**: F256 → DATABASE FABRIC (Redis) — TTL-backed key-value store

**When mandatory (DNA-9)**: Any factory method that creates, modifies, or deletes financial state
(payments, refunds, payouts, inventory hard-reservations) or sends an event with external side
effects. AF-7 Compliance station enforces: absence of EP-4 call before financial operation =
BUILD FAILURE.

---

## EP-5 — Transactional Outbox Relay

**Purpose**: Guarantees that domain state changes and their associated domain events are either
BOTH committed or BOTH rolled back. Eliminates the "DB commit succeeded, queue publish failed"
dual-write failure class — which is catastrophic in payment and fulfillment flows.

**Layer**: FABRIC (infrastructure primitive — background relay worker)

**Mechanism**:
1. Factory method opens a PG transaction
2. Domain state written to business table (e.g., orders)
3. Domain event written to `outbox_events` table IN THE SAME TRANSACTION
4. Transaction commits atomically (both or neither)
5. F257 background relay worker polls `outbox_events WHERE relayed_at IS NULL`
6. Relay publishes each row to Queue Fabric (IQueueService.EnqueueAsync)
7. Relay marks `relayed_at = NOW()` — row won't be re-published

**Outbox Table Schema**:
```sql
CREATE TABLE outbox_events (
  outbox_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      VARCHAR(128) NOT NULL,
  event_type     VARCHAR(255) NOT NULL,
  payload        JSONB NOT NULL,               -- DNA-1: no typed model
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  relayed_at     TIMESTAMPTZ,                  -- NULL = not yet relayed
  relay_attempts INT DEFAULT 0
);
-- Relay worker index — only unrelayed rows, oldest first
CREATE INDEX idx_outbox_pending
  ON outbox_events (created_at ASC)
  WHERE relayed_at IS NULL;
```

**Factory Interface** (F257 — ITransactionalOutboxRelay):
```csharp
public interface ITransactionalOutboxRelay
{
    // MUST be called within the same IDbTransaction as the domain write
    Task<DataProcessResult<string>> WriteOutboxEventAsync(
        string eventType,
        Dictionary<string, object> payload,
        string tenantId,
        IDbTransaction transaction,
        CancellationToken ct = default);

    // Called by background relay worker only — not by business factory methods
    Task<DataProcessResult<int>> RelayPendingEventsAsync(
        int batchSize, string tenantId,
        CancellationToken ct = default);
}
```

**FABRIC RESOLUTION**: F257 → DATABASE FABRIC (PostgreSQL) for outbox table + QUEUE FABRIC
(Redis Streams) for relay publication

**When mandatory (DNA-8 + DR-25)**: All financial events — OrderPlaced, PaymentAuthorized,
PaymentCaptured, PaymentVoided, RefundExecuted, ShipmentCreated, PayoutReleased, PayoutHeld.
AF-7 Compliance station enforces: financial event factory method calling IQueueService directly
(bypassing F257) = BUILD FAILURE.

---

# DNA PATTERN — DNA-9 (NEW)

## DNA-9 — IDEMPOTENCY-FIRST

**Applies to**: Every factory method that creates, modifies, or deletes financial state
(payments, refunds, payouts, inventory hard-reservations) AND every factory method that sends
a message or event with external side effects (carrier notification, payment gateway call).

**Rule**:
```
BEFORE executing any financial factory operation:
  1. Compose operationKey = "{operationName}:{entityId}:{attemptId}:{tenantId}"
  2. Call F256.GetOrCreateAsync(operationKey, ttl, tenantId)
  3. If result.status == COMPLETED → return result.cachedResult (idempotent no-op)
  4. If result.status == IN_PROGRESS → return DataProcessResult.Conflict("duplicate_in_flight")
  5. If result.status == NEW → proceed; call F256.MarkInProgressAsync
  6. Execute the financial operation
  7. Call F256.MarkCompletedAsync(result) OR F256.MarkFailedAsync(error)
```

**TTL Values (FREEDOM config defaults)**:
- Payment operations (authorize, capture, void, refund): `marketplace.idempotency.financial_ttl` = 24h
- Payout operations: `marketplace.idempotency.payout_ttl` = 24h
- Inventory hard-reservation: `marketplace.idempotency.inventory_ttl` = 1h
- Compensation steps: inherit TTL of the step they compensate

**Iron Rule**: Any financial factory method without EP-4 call = BUILD FAILURE.
AF-7 Compliance station validates statically. AF-9 Judge validates at quality gate.

**Evidence / Rationale**: Network timeouts on payment gateway calls cause clients to retry.
Without idempotency: each retry = new authorization = double hold on buyer's payment method.
ST-34 (Duplicate Payment Authorization Retry) validates this pattern.

**Factories where DNA-9 applies**:
F247 (LockCartAsync), F248 (CreateOrderAsync), F249 (all 6 payment methods),
F250 (PromoteToHardReservationAsync, ReleaseReservationAsync), F252 (RecordDecisionAsync),
F253 (ReleasePayoutAsync, HoldPayoutAsync)

**Factories where DNA-9 is N/A**:
F244, F245, F246 (admin/content ops), F251 (logistics tracking — external events),
F254, F255 (read-only search/compute), F256 (IS the DNA-9 implementation), F257 (infrastructure)

---

# FAMILY 27 — GIANT SHOP MARKETPLACE CORE (F244–F257)

## F244 — ISellerAccountService

**Purpose**: Manages seller identity lifecycle: registration, KYC status, store activation,
and performance metric tracking. Entry point for all seller-side marketplace operations.

**FACTORY RESOLUTION**: F244 → DATABASE FABRIC (PostgreSQL primary, Elasticsearch secondary)
+ QUEUE FABRIC (seller.* events)

**Resolved via**: `IExternalServiceFactory<ISellerAccountService>.CreateAsync(ctx)`
- Config key: `marketplace.sellers.provider`
- Fallback: READ-ONLY mode (returns DataProcessResult.ServiceUnavailable)

**Interface**:
```csharp
public interface ISellerAccountService
{
    Task<DataProcessResult<Dictionary<string, object>>> RegisterSellerAsync(
        Dictionary<string, object> registrationPayload, string tenantId,
        CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> SubmitKycDocumentsAsync(
        string sellerId, Dictionary<string, object> kycPayload,
        string tenantId, CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> UpdateKycStatusAsync(
        string sellerId, string newStatus, string reason,
        string tenantId, CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> ActivateStoreAsync(
        string sellerId, string tenantId, CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> UpdatePerformanceMetricsAsync(
        string sellerId, Dictionary<string, object> metricsPayload,
        string tenantId, CancellationToken ct = default);
}
```

**DNA Compliance**:
- DNA-1: All payloads Dictionary<string,object> (no SellerDto, KycDto)
- DNA-3: DataProcessResult<Dictionary<string,object>> on all methods
- DNA-4: Extends MicroserviceBase (19 components)
- DNA-5: tenantId on every method
- DNA-8: seller.registration_submitted, seller.store_activated via F257 outbox

**Primary Fabric Methods Used**: IDatabaseService.StoreDocument, IDatabaseService.SearchDocuments
(BuildSearchFilter — DNA-2), IQueueService.EnqueueAsync (via F257)

---

## F245 — IProductCatalogService

**Purpose**: Manages product listing lifecycle: draft creation, submission for moderation,
publication to catalog, deactivation, and Elasticsearch indexing for discovery.

**FACTORY RESOLUTION**: F245 → DATABASE FABRIC (Elasticsearch primary — catalog search index,
PostgreSQL secondary — authoritative listing state) + AI ENGINE FABRIC (listing enrichment)

**Interface**:
```csharp
public interface IProductCatalogService
{
    Task<DataProcessResult<Dictionary<string, object>>> SaveDraftAsync(
        Dictionary<string, object> listingPayload, string tenantId,
        CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> SubmitListingAsync(
        string listingId, string tenantId, CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> PublishListingAsync(
        string listingId, string tenantId,
        IDbTransaction transaction, CancellationToken ct = default); // EP-5

    Task<DataProcessResult<bool>> UpdateListingStatusAsync(
        string listingId, string newStatus, string reason,
        string tenantId, CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> GetListingAsync(
        string listingId, string tenantId, CancellationToken ct = default);
}
```

**DNA Compliance**: DNA-1 through DNA-6; DNA-8 (listing.published via F257 outbox);
DNA-2 (BuildSearchFilter on all ES queries — skips empty filters automatically)

**Key Constraint**: CF-75 — every SearchDocuments call from F245 injects mandatory
`listing_status: PUBLISHED` filter. This cannot be overridden via config.

---

## F246 — IListingModerationService

**Purpose**: AI-powered content screening for both listing moderation (product policy) and
seller KYC document screening. Uses AF-5 multi-model parallel orchestration with 2/3 consensus.

**FACTORY RESOLUTION**: F246 → AI ENGINE FABRIC (IAiProvider / AiDispatcher — 3 parallel
models: Claude, GPT-4o, Gemini) + DATABASE FABRIC (PostgreSQL — ModerationCase records)
+ QUEUE FABRIC (moderation.* events)

**Interface**:
```csharp
public interface IListingModerationService
{
    Task<DataProcessResult<Dictionary<string, object>>> CreateModerationCaseAsync(
        string listingId, Dictionary<string, object> listingContent,
        string tenantId, CancellationToken ct = default);

    // Internally calls IAiProvider.GenerateAsync() × 3 via AiDispatcher (AF-5)
    // Returns consensus: {decision, confidence, votes:[], violations:[]}
    Task<DataProcessResult<Dictionary<string, object>>> RunModerationConsensusAsync(
        string caseId, Dictionary<string, object> policyContext,
        string tenantId, CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> RunKycScreeningAsync(
        string sellerId, Dictionary<string, object> kycDocuments,
        string tenantId, CancellationToken ct = default);
}
```

**Multi-model Consensus Logic**:
- ≥ 2/3 APPROVE → moderation.approved
- ≥ 2/3 REJECT → moderation.rejected (violations list returned)
- 1/3 split → moderation.human_review → human queue with EP-2 SLA timer

**DNA Compliance**: DNA-1 through DNA-6; DNA-7 (calls IAiProvider.GenerateAsync(), never
openai.chat()); consensus stored as Dictionary (DNA-1)

---

## F247 — ICartStateService

**Purpose**: Ephemeral cart state management with TTL-backed Redis storage. Handles item
add/remove, coupon pre-validation, cart locking (Redis SETNX) during checkout saga, and
cart-to-order conversion.

**FACTORY RESOLUTION**: F247 → DATABASE FABRIC (Redis primary — ephemeral cart state with TTL)
+ DATABASE FABRIC (PostgreSQL secondary — cart audit trail)

**Interface**:
```csharp
public interface ICartStateService
{
    Task<DataProcessResult<Dictionary<string, object>>> AddItemAsync(
        string buyerId, Dictionary<string, object> item,
        string tenantId, CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> GetCartAsync(
        string buyerId, string tenantId, CancellationToken ct = default);

    // Redis SETNX — prevents concurrent checkouts for same cart
    Task<DataProcessResult<Dictionary<string, object>>> LockCartAsync(
        string buyerId, string correlationId,
        string tenantId, CancellationToken ct = default);

    // Compensation step for saga rollback
    Task<DataProcessResult<bool>> UnlockCartAsync(
        string buyerId, string tenantId, CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> ConvertToOrderAsync(
        string buyerId, string orderId,
        string tenantId, CancellationToken ct = default);
}
```

**DNA Compliance**: DNA-1 through DNA-6; DNA-5 (tenantId scopes all Redis keys:
`cart:{tenantId}:{buyerId}`); DNA-9 (LockCartAsync carries idempotency key)

**CF-65 Enforcement**: Cart item TTL = `marketplace.cart.item.ttl_seconds` (FREEDOM config).
BFA validates cart TTL ≤ inventory soft-reservation TTL at startup.

---

## F248 — IOrderManagementService

**Purpose**: OMS — manages the complete order lifecycle from creation through fulfillment to
completion or cancellation. All order state changes publish events via EP-5 transactional outbox.

**FACTORY RESOLUTION**: F248 → DATABASE FABRIC (PostgreSQL primary — authoritative order state)
+ QUEUE FABRIC (order.* events via F257) + FLOW ENGINE FABRIC (step coordination)

**Interface**:
```csharp
public interface IOrderManagementService
{
    // IDbTransaction REQUIRED — EP-5 outbox in same transaction
    Task<DataProcessResult<Dictionary<string, object>>> CreateOrderAsync(
        Dictionary<string, object> orderPayload, IDbTransaction transaction,
        string tenantId, CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> UpdateOrderStatusAsync(
        string orderId, string newStatus,
        string tenantId, CancellationToken ct = default);

    // Compensation — carries idempotency key (DNA-9)
    Task<DataProcessResult<bool>> CancelOrderAsync(
        string orderId, string reason, string idempotencyKey,
        string tenantId, CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> GetOrderAsync(
        string orderId, string tenantId, CancellationToken ct = default);
}
```

**DNA Compliance**: DNA-1 through DNA-8; DNA-9 (CancelOrderAsync carries idempotency key);
DNA-8 (OrderPlaced, OrderConfirmed, OrderCanceled all via F257.WriteOutboxEventAsync)

**BFA Indices populated**: marketplace.order_status_index, marketplace.order_listing_index

---

## F249 — IPaymentEscrowService

**Purpose**: Full payment lifecycle for marketplace escrow model: authorization → hold/escrow
→ capture (on shipment) → release (after protection window) OR refund (on dispute).
All operations carry EP-4 idempotency keys (DNA-9).

**FACTORY RESOLUTION**: F249 → DATABASE FABRIC (PostgreSQL — authoritative payment state,
Redis — payment status cache for fast reads) + QUEUE FABRIC (payment.* events via F257)

**Interface**:
```csharp
public interface IPaymentEscrowService
{
    // DNA-9: idempotencyKey required
    Task<DataProcessResult<Dictionary<string, object>>> AuthorizePaymentAsync(
        Dictionary<string, object> paymentPayload, string idempotencyKey,
        string tenantId, CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> EscrowPaymentAsync(
        string paymentId, string orderId,
        string tenantId, CancellationToken ct = default);

    // Triggered by shipment.created event (CF-69) — DNA-9 required
    Task<DataProcessResult<Dictionary<string, object>>> CapturePaymentAsync(
        string paymentId, string idempotencyKey,
        string tenantId, CancellationToken ct = default);

    // Compensation — DNA-9 required
    Task<DataProcessResult<bool>> VoidAuthorizationAsync(
        string paymentId, string idempotencyKey,
        string tenantId, CancellationToken ct = default);

    // Triggered by dispute decision (T88) — DNA-9 required
    Task<DataProcessResult<Dictionary<string, object>>> RefundAsync(
        string paymentId, decimal amount, string idempotencyKey,
        string tenantId, CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> GetPaymentStatusAsync(
        string paymentId, string tenantId, CancellationToken ct = default);
}
```

**DNA Compliance**: DNA-1 through DNA-9 (all 9 patterns — F249 is the highest-compliance
factory in the engine; every financial method carries idempotency key)

**IMPORTANT**: F249 never calls Stripe, Braintree, or any payment gateway directly.
All gateway calls are via IAiProvider equivalent — a pluggable IPaymentGatewayProvider
resolved through the AI ENGINE FABRIC extension point for payment gateways.

---

## F250 — IInventoryReservationService

**Purpose**: Two-layer inventory reservation: fast soft-reservation in Redis (cart-level),
durable hard-reservation in PostgreSQL (checkout-level). Hard reservation uses SELECT FOR UPDATE
row lock. Prevents overselling under concurrent checkout.

**FACTORY RESOLUTION**: F250 → DATABASE FABRIC (Redis — soft reservation + TTL) +
DATABASE FABRIC (PostgreSQL — hard reservation with row locking + hard constraint)
+ QUEUE FABRIC (inventory.* events)

**Interface**:
```csharp
public interface IInventoryReservationService
{
    // Fast path — Redis SETNX with TTL
    Task<DataProcessResult<Dictionary<string, object>>> SoftReserveAsync(
        string listingId, int quantity, string buyerId,
        string tenantId, CancellationToken ct = default);

    // Checkout path — releases Redis soft lock, acquires PG row lock
    // DNA-9: idempotencyKey required
    Task<DataProcessResult<Dictionary<string, object>>> PromoteToHardReservationAsync(
        string listingId, int quantity, string orderId, string idempotencyKey,
        string tenantId, CancellationToken ct = default);

    // Compensation — DNA-9 required (CF-68, CF-71, CF-72 all trigger this)
    Task<DataProcessResult<bool>> ReleaseReservationAsync(
        string reservationId, string idempotencyKey,
        string tenantId, CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> GetAvailableStockAsync(
        string listingId, string tenantId, CancellationToken ct = default);
}
```

**DNA Compliance**: DNA-1 through DNA-9

**CF-68 Enforcement**: PromoteToHardReservationAsync checks
`available_stock = listed_stock − hard_reserved_stock` before acquiring PG row lock.
If insufficient → DataProcessResult.Failure("insufficient_inventory", availableStock).

---

## F251 — IFulfillmentOrchestrationService

**Purpose**: Manages shipment lifecycle: creation, carrier tracking webhook relay, delivery
confirmation. Publishes fulfillment events via Queue Fabric (EP-5 outbox for financial events).

**FACTORY RESOLUTION**: F251 → QUEUE FABRIC (Redis Streams — shipment events, tracking webhooks)
+ DATABASE FABRIC (PostgreSQL — shipment records, tracking history)

**Interface**:
```csharp
public interface IFulfillmentOrchestrationService
{
    // shipment.created via F257 outbox (EP-5) — triggers CF-69 → payment capture
    Task<DataProcessResult<Dictionary<string, object>>> CreateShipmentAsync(
        string orderId, Dictionary<string, object> shipmentPayload,
        string tenantId, CancellationToken ct = default);

    Task<DataProcessResult<bool>> RegisterCarrierTrackingAsync(
        string shipmentId, string trackingNumber, string carrierId,
        string tenantId, CancellationToken ct = default);

    // Called by carrier tracking webhook relay
    Task<DataProcessResult<Dictionary<string, object>>> ProcessTrackingUpdateAsync(
        Dictionary<string, object> trackingEvent,
        string tenantId, CancellationToken ct = default);

    // order.delivered → triggers EP-2 protection window (F253)
    Task<DataProcessResult<bool>> RecordDeliveryConfirmationAsync(
        string shipmentId, Dictionary<string, object> deliveryProof,
        string tenantId, CancellationToken ct = default);
}
```

**DNA Compliance**: DNA-1 through DNA-6, DNA-8 (shipment.created via F257 outbox for EP-5)

---

## F252 — IDisputeArbitrationService

**Purpose**: Manages buyer protection dispute lifecycle from opening through evidence collection,
AI-assisted decision support, final decision, and refund execution trigger. Enforces seller
response SLA via EP-2.

**FACTORY RESOLUTION**: F252 → DATABASE FABRIC (PostgreSQL — DisputeCase, evidence records,
decision audit) + AI ENGINE FABRIC (IAiProvider.GenerateAsync — decision support analysis)
+ QUEUE FABRIC (dispute.* events)

**Interface**:
```csharp
public interface IDisputeArbitrationService
{
    // dispute.opened → CF-70 triggers F253.HoldPayoutAsync
    Task<DataProcessResult<Dictionary<string, object>>> OpenDisputeAsync(
        Dictionary<string, object> disputePayload,
        string tenantId, CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> UploadEvidenceAsync(
        string disputeId, Dictionary<string, object> evidence,
        string tenantId, CancellationToken ct = default);

    // Calls IAiProvider.GenerateAsync() for decision support (not binding decision)
    Task<DataProcessResult<Dictionary<string, object>>> GetAiDecisionSupportAsync(
        string disputeId, string tenantId, CancellationToken ct = default);

    // Human decision — DNA-9 idempotencyKey required; triggers refund if applicable
    Task<DataProcessResult<Dictionary<string, object>>> RecordDecisionAsync(
        string disputeId, Dictionary<string, object> decision,
        string idempotencyKey, string tenantId,
        CancellationToken ct = default);
}
```

**DNA Compliance**: DNA-1 through DNA-9; DNA-7 (GetAiDecisionSupportAsync calls IAiProvider,
never SDK directly); audit trail stored as Dictionary (DNA-1)

**CF-70 + CF-73**: OpenDisputeAsync publishes dispute.opened → BFA triggers F253.HoldPayoutAsync
→ F253 publishes payout.held → CF-73 enforces seller.payout_hold_notified within 500ms.

---

## F253 — ISellerPayoutService

**Purpose**: Escrow-style seller payout management. Credits seller wallet on delivery, holds
until protection window expires (EP-2), freezes on dispute (CF-70), and releases after
dispute resolution or window expiry. All payout operations carry EP-4 idempotency keys.

**FACTORY RESOLUTION**: F253 → DATABASE FABRIC (PostgreSQL — payout records, wallet balances,
hold ledger) + QUEUE FABRIC (payout.* events via F257) + DATABASE FABRIC (Redis — payout
status cache)

**Interface**:
```csharp
public interface ISellerPayoutService
{
    // Called on order.delivered — credits wallet, registers EP-2 protection timer
    Task<DataProcessResult<Dictionary<string, object>>> CreditWalletAsync(
        string sellerId, string orderId, decimal amount,
        string tenantId, CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> SchedulePayoutAsync(
        string sellerId, string orderId,
        string tenantId, CancellationToken ct = default);

    // Triggered by CF-70 (dispute.opened) — payout.held via F257 outbox
    Task<DataProcessResult<bool>> HoldPayoutAsync(
        string sellerId, string orderId, string disputeId,
        string tenantId, CancellationToken ct = default);

    // Triggered by EP-2 timer (no dispute) OR dispute.decided (CF-73 cleared)
    // DNA-9: idempotencyKey required
    Task<DataProcessResult<Dictionary<string, object>>> ReleasePayoutAsync(
        string sellerId, string orderId, string idempotencyKey,
        string tenantId, CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> GetPayoutStatusAsync(
        string sellerId, string tenantId, CancellationToken ct = default);
}
```

**DNA Compliance**: DNA-1 through DNA-9; DNA-8 (payout.held, payout.released via F257 outbox)

**PROTECTION WINDOW**: `marketplace.payout.protection_window_days` (FREEDOM config, default: 15)
EP-2 timer registered on delivery confirmation. CF-70 can override EP-2 release before window.

---

## F254 — IMarketplaceSearchService

**Purpose**: Elasticsearch-backed marketplace discovery with mandatory PUBLISHED status filter
(CF-75), social signal personalization (read-only via RAG FABRIC — CF-76), and listing
indexing/de-indexing lifecycle.

**FACTORY RESOLUTION**: F254 → DATABASE FABRIC (Elasticsearch — listing search index, primary)
+ RAG FABRIC (IRagService.SearchAsync — social signals, read-only, CF-76)

**Interface**:
```csharp
public interface IMarketplaceSearchService
{
    // listing_status: PUBLISHED filter MANDATORY (CF-75) — cannot be overridden
    // socialContext OPTIONAL — sourced via IRagService only, never F234 direct (CF-76)
    Task<DataProcessResult<Dictionary<string, object>>> SearchListingsAsync(
        Dictionary<string, object> searchParams,
        Dictionary<string, object>? socialContext,
        string tenantId, CancellationToken ct = default);

    // Called on listing.published — indexes with listing_status: PUBLISHED
    Task<DataProcessResult<bool>> IndexListingAsync(
        string listingId, Dictionary<string, object> listingDoc,
        string tenantId, CancellationToken ct = default);

    // Called on listing.suspended / listing.deactivated
    Task<DataProcessResult<bool>> DeIndexListingAsync(
        string listingId, string tenantId, CancellationToken ct = default);
}
```

**DNA Compliance**: DNA-1 through DNA-6, DNA-2 (BuildSearchFilter on all ES queries)

**Critical**: AF-7 validates socialContext sourcing — zero F234 factory method calls in
generated T90 code. Social signals accessed via IRagService.SearchAsync only (CF-76).

---

## F255 — IPromotionsRulesEngine

**Purpose**: Applies promotion rules (coupons, flash deals, volume discounts) to cart items and
search result overlays. Reads promotion definitions from Redis cache + Elasticsearch. All
promotion state is read-only at query time; writes go via admin flow only.

**FACTORY RESOLUTION**: F255 → DATABASE FABRIC (Redis — active promotions cache, fast reads)
+ DATABASE FABRIC (Elasticsearch — promotion rules index) + DATABASE FABRIC (PostgreSQL —
coupon redemption records)

**Interface**:
```csharp
public interface IPromotionsRulesEngine
{
    // Cart-time coupon validation — checks eligibility, usage limits, expiry
    Task<DataProcessResult<Dictionary<string, object>>> ValidateCouponAsync(
        string couponCode, string buyerId, string listingId,
        string tenantId, CancellationToken ct = default);

    // Post-search overlay — injects flash deal badges, sponsored markers
    Task<DataProcessResult<Dictionary<string, object>[]>> ApplyPromotionOverlaysAsync(
        Dictionary<string, object>[] searchResults,
        string tenantId, CancellationToken ct = default);
}
```

**DNA Compliance**: DNA-1 through DNA-6, DNA-2 (BuildSearchFilter on all promo queries)

**FREEDOM config**: `marketplace.promotions.sponsored_positions` (which search positions
can carry sponsored results), `marketplace.promotions.max_coupon_stack` (stackability rules)

---

## F256 — IIdempotencyKeyRegistry (EP-4 Factory Interface)

*Full specification above under EP-4.*

**FACTORY RESOLUTION**: F256 → DATABASE FABRIC (Redis) with TTL-backed key expiry.

**Summary**: GetOrCreateAsync, MarkInProgressAsync, MarkCompletedAsync, MarkFailedAsync.
This factory IS the DNA-9 pattern implementation. All financial factories depend on it.

---

## F257 — ITransactionalOutboxRelay (EP-5 Factory Interface)

*Full specification above under EP-5.*

**FACTORY RESOLUTION**: F257 → DATABASE FABRIC (PostgreSQL — outbox table) +
QUEUE FABRIC (Redis Streams — relay target).

**Summary**: WriteOutboxEventAsync (called within PG transaction by business factories),
RelayPendingEventsAsync (called by background relay worker only).

---

# DESIGN RECORDS — DR-21 through DR-26

## DR-21 — Saga Orchestrator Over Choreography for Financial Flows

**Decision**: T85, T86, T87, T88, T89 use orchestrator-centric saga coordination.

**Rationale**: Financial flows require deterministic compensation in LIFO order. Orchestrator
sagas provide: explicit step ordering, clear rollback path, debuggable execution trace,
idempotency enforcement point. Choreography's implicit coordination is too fragile for money
movement — a missing event handler means stuck funds.

**Rejected**: Pure choreography (harder to debug, implicit compensations, drift risk);
step-level hybrid (inconsistent failure semantics).

**Impact**: AF-2 (Planning) decomposes each financial task type into ordered steps + named
compensation steps. SK-30 (Saga Compensation Chain) is the canonical generated pattern.

---

## DR-22 — Bridge Tenancy as Default Marketplace Isolation Model

**Decision**: Pooled schema (shared PG tables + tenant_id column + DB-enforced RLS) as default.
Enterprise sellers (configurable tier) graduate to schema-per-tenant.

**Rationale**: Pooled: low cost, fast migrations, works for most SMB sellers.
Schema-per-tenant: stronger isolation blast radius, available via tier graduation.
Database-per-tenant: prohibitive ops cost at scale, reserved for future compliance-driven need.

**Rejected**: Schema-per-tenant as default (migration complexity without benefit for SMBs);
DB-per-tenant as default (ops cost); no isolation tiers (insufficient for enterprise).

**Impact**: CF-77 enforces isolation at application layer. All F244–F255 methods accept tenantId.
Tenant tier stored in `marketplace.tenant.isolation_tier` FREEDOM config.

---

## DR-23 — Idempotency Key TTL = 24h for Payment Operations

**Decision**: EP-4 TTL: financial ops = 24h, non-financial = 1h.

**Rationale**: Payment gateway retry windows are typically 6–12h. 24h provides 2× headroom
without unbounded Redis memory growth (keys auto-expire). Non-financial ops (cart lock, soft
inventory) have shorter natural TTLs so 1h is sufficient.

**Impact**: DNA-9 codifies TTL values as FREEDOM config defaults. F256.GetOrCreateAsync
accepts TTL as parameter — callers set TTL appropriate to their operation type.

---

## DR-24 — Marketplace UI Fabric Contract

**Decision**: All marketplace UI components generated as fabric-first with zero hardcoded
platform-specific values.

**What is configurable (FREEDOM layer)**:
- `marketplace.ui.payment_providers` — list of payment method names/logos
- `marketplace.ui.locale_config` — currency, date format, number format
- `marketplace.ui.checkout_steps_definition` — ordered DAG of checkout steps
- `marketplace.ui.search_facets` — which filters appear on search results
- `marketplace.ui.seller_dashboard_widgets` — seller dashboard composition

**Rationale**: Basic prompt requirement: "UI: Fabric-first, zero platform-specific values."
Marketplace UIs are typically the most platform-coupled layer; this design eliminates
that coupling so the engine can generate for any payment provider, any locale, any workflow.

**Impact**: DynamicController serves all UI config endpoints. DNA-6 enforced throughout.

---

## DR-25 — Transactional Outbox as Mandatory Pattern for Financial Events

**Decision**: All financial events (OrderPlaced, PaymentAuthorized, PaymentCaptured,
PaymentVoided, RefundExecuted, ShipmentCreated, PayoutReleased, PayoutHeld) MUST be written
via EP-5 (F257.WriteOutboxEventAsync) within the same DB transaction as the domain state change.

**Rationale**: The dual-write problem: if DB commits but queue publish fails, money moves
but fulfillment never starts. This is not recoverable without manual intervention. EP-5
guarantees atomic state+event commitment; the relay worker guarantees eventual publication.

**Rejected**: Direct IQueueService.EnqueueAsync after commit (dual-write risk);
saga-level retry (doesn't help if event was never published); deduplication downstream only
(shifts complexity to every consumer).

**Impact**: AF-7 Compliance validates: any financial factory calling IQueueService directly
(bypassing F257) = BUILD FAILURE. SK-32 is the canonical pattern.

---

## DR-26 — Two-Actor BFA Conflict Rules (Buyer vs Seller)

**Decision**: FLOW-08 introduces the first BFA rules that explicitly model cross-actor
conflicts between buyer and seller principals (CF-70, CF-73). Prior rules were within-actor
or within-system.

**Rationale**: Marketplace flows have two independent principals with competing interests:
buyer wants refund, seller wants payout. Without explicit cross-actor rules, the BFA cannot
detect scenarios like "dispute opens after payout already released" or "seller notified of
payout hold but not given reason." CF-70 and CF-73 are the first rules of this type.

**Impact**: BFA conflict rule vocabulary expanded to include `actorTypes` field on each rule.
CF-70: actorTypes = [buyer (opener), seller (blocked)]. CF-73: actorTypes = [system, seller].
AF-9 Judge validates cross-actor rule coverage for any task type touching both actor types.

---

# FAMILY 27 SUMMARY TABLE

| Factory | Interface | Primary Fabric | Secondary Fabrics | Key Methods | DNA-9 |
|---------|-----------|---------------|-------------------|-------------|-------|
| F244 | ISellerAccountService | DB(PG) | DB(ES), Queue | 5 methods | N/A |
| F245 | IProductCatalogService | DB(ES) | DB(PG), AI Engine | 5 methods | N/A |
| F246 | IListingModerationService | AI Engine | DB(PG), Queue | 3 methods | N/A |
| F247 | ICartStateService | DB(Redis) | DB(PG) | 5 methods | YES (LockCart) |
| F248 | IOrderManagementService | DB(PG) | Queue, Flow Engine | 4 methods | YES (CancelOrder) |
| F249 | IPaymentEscrowService | DB(PG) | DB(Redis), Queue | 6 methods | YES (all 6) |
| F250 | IInventoryReservationService | DB(Redis+PG) | Queue | 4 methods | YES (PromoteToHard, Release) |
| F251 | IFulfillmentOrchestrationService | Queue | DB(PG) | 4 methods | N/A |
| F252 | IDisputeArbitrationService | DB(PG) | AI Engine, Queue | 4 methods | YES (RecordDecision) |
| F253 | ISellerPayoutService | DB(PG) | Queue, DB(Redis) | 5 methods | YES (HoldPayout, ReleasePayout) |
| F254 | IMarketplaceSearchService | DB(ES) | RAG Fabric | 3 methods | N/A |
| F255 | IPromotionsRulesEngine | DB(Redis+ES) | DB(PG) | 2 methods | N/A |
| F256 | IIdempotencyKeyRegistry (EP-4) | DB(Redis) | — | 4 methods | IS DNA-9 |
| F257 | ITransactionalOutboxRelay (EP-5) | DB(PG) | Queue | 2 methods | N/A |

**Total: 14 factories, ~56 methods across Family 27**
**DNA-9 applies to: F247, F248, F249, F250, F252, F253 (6 factories)**
**DNA-8 (EP-5 outbox) applies to: F244, F245, F248, F249, F251, F253 (6 factories)**

---

## DNA Compliance Summary — Family 27

| Factory | DNA-1 | DNA-2 | DNA-3 | DNA-4 | DNA-5 | DNA-6 | DNA-7 | DNA-8 | DNA-9 |
|---------|-------|-------|-------|-------|-------|-------|-------|-------|-------|
| F244 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A |
| F245 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A |
| F246 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | N/A |
| F247 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| F248 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| F249 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| F250 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| F251 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A |
| F252 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | ✅ |
| F253 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| F254 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | N/A |
| F255 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | N/A |
| F256 | ✅ | N/A | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | IS |
| F257 | ✅ | N/A | ✅ | ✅ | ✅ | ✅ | ✅ | N/A | N/A |

**Total compliance: 126/126 ✅ (14 factories × 9 patterns, N/A = not applicable)**

---

## Integration Changelog (FLOW-08)

| Date | Operation | Factories | Task Types | BFA Rules | Notes |
|------|-----------|-----------|-----------|-----------|-------|
| 2026-02-26 | FLOW-08 Giant Shop Platforms | F244-F257 (+14) | T83-T90 (+8) | CF-64-CF-77 (+14) | Family 27, Template 18, EP-4/5, DNA-9, DR-21-26 |

---

## System State Update (Post Family 27 / FLOW-08)

| Metric | Pre-FLOW-08 | Post-FLOW-08 | Delta |
|--------|-------------|--------------|-------|
| Factory interfaces | F1-F243 | F1-F257 | +14 |
| Factory families | 26 | 27 | +1 |
| DNA patterns | 8 (DNA-1-DNA-8) | 9 (DNA-1-DNA-9) | +1 |
| Engine primitives | 3 (EP-1/2/3) | 5 (EP-1/2/3/4/5) | +2 |
| Design records | DR-1-DR-20 | DR-1-DR-26 | +6 |

```
FACTORIES (continuous):
  F1-F224    [through Family 24]
  F225-F233  [FLOW-06 Marketplace Publishing, Family 25]
  F234-F243  [FLOW-07 Friend Request & Feed Integration, Family 26]
  F244-F257  [FLOW-08 Giant Shop Platforms, Family 27] ← NEW
  Next: F258
```

---

## SAVE POINT: MERGE:P1 ✅
