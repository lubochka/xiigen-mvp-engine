# XIIGen SKILLS FACTORY RAG — FLOW-08 EXTENSION
## 16 — Giant Shop Platforms (Amazon/AliExpress-class Marketplace)
## Appends into SKILLS_FACTORY_RAG_MERGED.md + UNIFIED_SOURCE_INDEX_MERGED.md
## Date: 2026-02-26 | Save Point: MERGE:P4 ✅

---

## PRE-FLOW-08 SKILL STATE
```
Skill Patterns:   SK-1–SK-28  (FLOW-01 through FLOW-07)
Design Decisions: DD-1–DD-20  (FLOW-01 through FLOW-07)
Next skill:       SK-29
Next decision:    DD-21
```

---

# DESIGN DECISIONS — DD-21 through DD-29

## DD-21 — Bridge Tenancy as the Default Isolation Model

**Decision**: FLOW-08 marketplace entities use bridge isolation: pooled schema (shared PG tables
with `tenant_id` column + DB-enforced row-level security) by default, with a config-driven
graduation path to schema-per-tenant for enterprise sellers requiring stronger isolation.

**Context**: The 16-* multi-tenant research documents identified three models (shared schema,
separate schema, separate DB). Bridge isolation balances cost efficiency with correctness.

**Alternatives Rejected**:
- Shared schema only: blast radius too high for financial entities (payments, payouts)
- Separate DB per tenant: ops cost prohibitive at large tenant counts
- Schema per tenant as default: migration complexity without clear benefit for SMB sellers

**Consequences**:
- CF-77 enforces isolation at application layer (plus DB-layer RLS as defense-in-depth)
- F244–F255 all accept `tenantId` as first-class parameter (not optional)
- DR-22 formalizes the graduation path: pool → schema → instance based on seller tier config
- New sellers default to pool tier; enterprise sellers (config flag) use schema tier

---

## DD-22 — Saga Orchestration Over Choreography for Financial Flows

**Decision**: T85 (Cart-to-Order Saga), T86 (Payment Escrow), T87 (Fulfillment Fork), T88
(Dispute), and T89 (Payout Release) use orchestrator-centric saga coordination (not event
choreography).

**Context**: The deep research doc identified orchestrator sagas vs choreography sagas as the
key strategic choice. Financial flows require deterministic compensation and explicit rollback.

**Alternatives Rejected**:
- Choreography: harder to debug; compensation chains are implicit; retry semantics unclear
- Hybrid per-step: inconsistent behavior makes it hard to reason about failure modes

**Consequences**:
- T85 has an explicit 5-step sequence with 4 named compensation steps
- AF-2 (Planning station) must decompose each saga task type into ordered steps + compensations
- EP-4 (Idempotency Key Registry) is mandatory for all financial step invocations
- SK-30 (Saga Compensation Chain) is the canonical pattern for all financial task types

---

## DD-23 — Idempotency Key TTL = 24 Hours for Payment Operations

**Decision**: EP-4 idempotency keys for payment operations (authorize, capture, void, refund,
payout) expire after 24 hours. Non-payment operations (inventory, cart) expire after 1 hour.

**Context**: Must cover all realistic retry windows without unbounded Redis memory growth.
Payment gateway retry windows are typically 6–12 hours; 24h provides 2× headroom.

**Alternatives Rejected**:
- 1 hour for payments: too short for some gateway retry policies (network outages, bank windows)
- 7 days: Redis memory cost unjustifiable; idempotency keys accumulate faster than TTL

**Consequences**:
- F256.GetOrCreateAsync(operationKey, ttl) accepts TTL as parameter
- Financial factory methods pass `TimeSpan.FromHours(24)` to F256
- Non-financial factory methods pass `TimeSpan.FromHours(1)` to F256
- DNA-9 codifies these TTL values as FREEDOM config defaults

---

## DD-24 — Transactional Outbox as Mandatory Pattern for Financial Events

**Decision**: Any event that carries financial state (OrderPlaced, PaymentAuthorized,
PaymentCaptured, PaymentVoided, RefundExecuted, ShipmentCreated, PayoutReleased, PayoutHeld)
MUST be written to the EP-5 outbox table within the same database transaction as the domain state
change. Direct IQueueService.EnqueueAsync calls are PROHIBITED for financial events.

**Context**: The dual-write problem (DB commit succeeds, queue publish fails) is catastrophic in
payment flows. EP-5 Transactional Outbox eliminates this class of bug entirely.

**Alternatives Rejected**:
- Direct publish after commit: silently fails under pod restart, network partition
- Saga-level retry: does not help if the event was never published before the retry window
- At-least-once with deduplication downstream: shifts complexity to every consumer

**Consequences**:
- F257 (ITransactionalOutboxRelay) is a REQUIRED dependency for all financial factories
- AF-7 Compliance station validates that financial event factories use F257, not direct queue calls
- SK-32 (Transactional Outbox Write) is the canonical pattern for financial event publication
- ST-33 stress test validates crash-recovery behavior

---

## DD-25 — AI Listing Moderation Uses Parallel Multi-Model Consensus

**Decision**: T84 (Listing Moderation Saga) uses AF-5 multi-model orchestration with a 2/3
majority consensus rule. Moderation decisions require ≥ 2 of 3 AI models (Claude, GPT-4o,
Gemini) to agree. A split (1/3 or 0/3) routes to human review queue.

**Context**: F246 (IListingModerationService) uses AI ENGINE FABRIC. Single-model decisions on
policy compliance are unreliable. Multi-model consensus reduces false positive takedowns and
false negative approvals.

**Alternatives Rejected**:
- Single model: vendor-specific biases, no appeal path if model changes behavior
- Sequential fallback (not parallel): slower; first model's decision biases the second
- Unanimous (3/3): too many human review escalations for borderline content

**Consequences**:
- F246.RunModerationConsensusAsync returns consensus result + individual model votes
- Consensus stored in ModerationCase document (Dictionary<string,object> via DNA-1)
- Split results (1/3): ModerationCase.status = HUMAN_REVIEW, timer set for SLA response
- AF-9 Judge validates that consensus threshold is enforced (not bypassed)

---

## DD-26 — Discovery Ranking Uses Social Signals as Read-Only Input

**Decision**: T90 (Marketplace Discovery Ranking) MAY consume connection graph signals from F234
(FLOW-07) as a personalization input, but ONLY via RAG FABRIC (IRagService.SearchAsync). Zero
direct F234 factory calls from T90 generated code. CF-76 enforces this at BFA level.

**Context**: Social graph data (who is connected to whom, connection strength) is a valuable
personalization signal for marketplace search. But FLOW-07 and FLOW-08 are different domains.

**Alternatives Rejected**:
- Direct F234 factory call from T90: creates compile-time coupling between FLOW-07 and FLOW-08
- No social signals in ranking: misses significant personalization quality improvement
- Bidirectional (ranking writes social signals back): violates single responsibility; T90 would
  modify FLOW-07 state — unacceptable cross-domain write

**Consequences**:
- F254.SearchListingsAsync accepts optional `socialSignalContext` (Dictionary<string,object>)
- Social signals retrieved via IRagService.SearchAsync before the F254 call
- CF-76 + AF-7 validate no direct F234 import in T90 generated code
- SK-36 includes the social signal RAG retrieval pattern

---

## DD-27 — Hard Inventory Reservation Uses Redis SETNX + PostgreSQL Row Lock

**Decision**: F250 implements a two-layer reservation: soft reservation in Redis (fast, eventually
consistent, TTL-backed) and hard reservation in PostgreSQL (serialized, ACID, permanent until
saga completes or compensation fires).

**Context**: Single-layer Redis reservation risks race conditions at high concurrency (two buyers
claiming same unit). Single-layer PG reservation is a latency bottleneck for browse-and-add-to-
cart (read-heavy) operations.

**Alternatives Rejected**:
- Redis-only: SETNX is fast but Redis is not ACID; hard reservations can be lost on Redis failure
- PG-only: cart add latency becomes 10–50ms instead of <1ms; poor UX for browsing
- Optimistic locking (version field): higher conflict rate at peak, harder compensation

**Consequences**:
- F250.SoftReserveAsync = Redis SETNX with TTL = `marketplace.inventory.soft_reservation.ttl`
- F250.PromoteToHardReservationAsync = Redis release + PG INSERT with SELECT FOR UPDATE
- CF-65 enforces cart TTL ≤ soft reservation TTL (aligned expiry)
- CF-68 enforces one HARD reservation per unit (PG uniqueness constraint as backstop)

---

## DD-28 — Marketplace UI Follows Fabric-First, Zero Platform-Specific Values

**Decision**: All marketplace UI components (product listing cards, checkout flow, seller
dashboard, dispute interface) are generated as fabric-first components. No hardcoded platform
values (no "Stripe" in UI, no "PostgreSQL" in UI, no hardcoded currency symbols or country codes).
All values sourced from FREEDOM config via DynamicController.

**Context**: Basic prompt requirement: "UI: Fabric-first, zero platform-specific values."
Marketplace UIs are typically the most platform-coupled part of an e-commerce system.

**Alternatives Rejected**:
- Platform-specific UI components: locks the generated system to one payment provider,
  one currency, one locale — violates the Freedom Machine philosophy
- Generic config without fabric awareness: loses ability to swap providers at runtime

**Consequences**:
- DR-24 formalizes the Marketplace UI Fabric Contract
- All payment provider logos/names sourced from `marketplace.ui.payment_providers` config
- All currency formatting sourced from `marketplace.ui.locale_config` config
- All checkout steps sourced from `marketplace.ui.checkout_steps_definition` config (DAG)
- DynamicController serves all UI configuration endpoints — no entity-specific controllers

---

## DD-29 — Seller Payout Uses Wallet Credit + Protection Window, Not Immediate Transfer

**Decision**: F253 credits seller wallet on delivery confirmation but holds actual bank transfer
until the buyer protection window (default: 15 days, configurable) expires. If no dispute opens
within the window, payout releases automatically. This is the "escrow-style" payout model.

**Context**: AliExpress escrow-style model from 16-* research. Protects buyers when sellers
have already been paid. Common in cross-border commerce.

**Alternatives Rejected**:
- Immediate payout on delivery: no protection for buyer if item arrives damaged/wrong after
  seller payout; platform must absorb refund cost
- Hold until buyer explicit confirm: most buyers never confirm; payouts never release
- Fixed 30-day window: too long for domestic commerce; too short for cross-border

**Consequences**:
- F253.CreditWalletAsync (on delivery) vs F253.ReleasePayoutAsync (after window)
- EP-2 Durable Timer registers window on delivery confirmation
- CF-70 dispute freeze overrides EP-2 timer release if dispute opens within window
- Window duration is FREEDOM config: `marketplace.payout.protection_window_days` (default: 15)
- SK-30 (Saga Compensation Chain) covers payout hold/release as named compensation step

---

# SKILL PATTERNS — SK-29 through SK-36

---

## SK-29 — Seller KYC Lifecycle Pattern

**Applicable Task Types**: T83 (Seller KYC Verification Gate)
**Primary Factories**: F244 (ISellerAccountService), F246 (IListingModerationService)
**Engine Primitive**: EP-1 (State Machine Registry) — KYC has explicit state transitions

**Pattern Description**:
KYC verification is a long-running lifecycle with external dependencies (document verification,
regulatory screening) and human review fallback. The pattern uses EP-1 State Machine to track
seller status across async steps.

**KYC State Machine**:
```
REGISTERED → PENDING_KYC → UNDER_REVIEW → APPROVED
                                        ↘ REJECTED → PENDING_KYC (resubmission allowed)
APPROVED → SUSPENDED → APPROVED (admin reinstatement)
APPROVED → CLOSED (permanent)
```

**.NET 9 Interface Skeleton**:
```csharp
// F244 — via IExternalServiceFactory<ISellerAccountService>.CreateAsync(ctx)
public interface ISellerAccountService
{
    Task<DataProcessResult<Dictionary<string, object>>> RegisterSellerAsync(
        Dictionary<string, object> registrationPayload,
        string tenantId,
        CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> SubmitKycDocumentsAsync(
        string sellerId,
        Dictionary<string, object> kycPayload, // DNA-1: no KycDocumentDto
        string tenantId,
        CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> UpdateKycStatusAsync(
        string sellerId,
        string newStatus, // from state machine — EP-1
        string reason,
        string tenantId,
        CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> ActivateStoreAsync(
        string sellerId,
        string tenantId,
        CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> UpdatePerformanceMetricsAsync(
        string sellerId,
        Dictionary<string, object> metricsPayload, // fulfillment_failure, dispute_rate, etc
        string tenantId,
        CancellationToken ct = default);
}
```

**AF-4 RAG Retrieval Hints**:
- Search: "state machine lifecycle gate" → retrieves SK-7 (EP-1 state machine pattern, FLOW-06)
- Search: "KYC document verification AI screening" → retrieves SK-33 (moderation pipeline)
- Search: "seller performance metrics update" → retrieves SK-29 (this skill)

**DNA Compliance**:
- DNA-1: All payloads are Dictionary<string,object> (no SellerDto, no KycDto)
- DNA-3: All methods return DataProcessResult<Dictionary<string,object>>
- DNA-4: RegisterSellerAsync, SubmitKycDocumentsAsync extend MicroserviceBase
- DNA-5: `tenantId` parameter on every method
- DNA-8: seller.registration_submitted event via EP-5 outbox (atomic with PG write)

---

## SK-30 — Saga Compensation Chain Pattern

**Applicable Task Types**: T85 (Cart-to-Order), T86 (Payment Escrow), T87 (Fulfillment Fork),
                           T88 (Dispute Arbitration), T89 (Payout Release)
**Primary Factories**: F247, F248, F249, F250, F252, F253, F256, F257
**Engine Primitive**: EP-4 (Idempotency Key Registry) — all compensation steps carry keys

**Pattern Description**:
The saga compensation chain is the core pattern for long-running financial transactions. Each saga
step registers a compensating action (in reverse order). If any step fails, compensations execute
LIFO. All compensation steps are idempotent via EP-4.

**Compensation Structure**:
```
SAGA STEP REGISTER ORDER (forward):
  S1: LockCart           COMPENSATION C1: UnlockCart
  S2: ValidateCoupon     COMPENSATION C2: ReleaseCoupon
  S3: HardReserveInventory COMPENSATION C3: ReleaseReservation
  S4: AuthorizePayment   COMPENSATION C4: VoidAuthorization
  S5: CreateOrder        COMPENSATION C5: CancelOrder + F257 outbox

COMPENSATION EXECUTION ORDER (LIFO on failure at step N):
  Fail at S4: execute C3 → C2 → C1 (skip C4: payment never authorized)
  Fail at S5: execute C4 → C3 → C2 → C1
```

**Key Invariants**:
1. Every compensation step calls F256.GetOrCreateAsync before executing (idempotent)
2. F257.WriteOutboxAsync used in S5 (CreateOrder) — compensations check outbox status
3. Compensation execution MUST log each step result (DataProcessResult) to audit trail
4. Compensation failure escalates to DLQ — NOT silently swallowed

**.NET 9 Pattern Skeleton**:
```csharp
// All saga steps return DataProcessResult<SagaStepResult> (Dictionary-backed)
public async Task<DataProcessResult<Dictionary<string, object>>> ExecuteSagaAsync(
    Dictionary<string, object> sagaPayload,
    string tenantId,
    string correlationId,
    CancellationToken ct)
{
    var compensations = new Stack<Func<Task<DataProcessResult<Dictionary<string,object>>>>>();

    // S1: Lock cart
    var cartKey = $"cart-lock-{correlationId}";
    var idempotencyKey = await _f256.GetOrCreateAsync(cartKey, TimeSpan.FromHours(1));
    if (idempotencyKey.Value["status"]?.ToString() == "COMPLETED")
        return DataProcessResult<Dictionary<string,object>>.Success(
            (Dictionary<string,object>)idempotencyKey.Value["cachedResult"]);

    var s1 = await _f247.LockCartAsync(sagaPayload, tenantId, ct);
    if (!s1.IsSuccess) return s1; // No compensation needed — nothing executed
    compensations.Push(() => _f247.UnlockCartAsync(sagaPayload, tenantId, ct));

    // S3: Hard reserve (similar pattern)
    var s3 = await _f250.PromoteToHardReservationAsync(sagaPayload, tenantId, ct);
    if (!s3.IsSuccess)
    {
        await ExecuteCompensationsAsync(compensations); // LIFO
        return s3;
    }
    compensations.Push(() => _f250.ReleaseReservationAsync(
        sagaPayload, tenantId, TimeSpan.FromHours(24), ct));

    // ... S4, S5 follow same pattern
    return DataProcessResult<Dictionary<string,object>>.Success(result);
}
```

**AF-4 RAG Retrieval Hints**:
- Search: "compensation LIFO saga pattern" → retrieves SK-30
- Search: "DataProcessResult financial flow" → retrieves SK-30
- Search: "idempotency key saga step" → retrieves SK-30 + SK-31

---

## SK-31 — Idempotency Key Gate Pattern

**Applicable Task Types**: T85, T86, T87, T88, T89 (all financial task types)
**Primary Factories**: F256 (IIdempotencyKeyRegistry — EP-4)
**Applies When**: DNA-9 violation risk — any factory method that creates, modifies, or deletes
financial state

**Pattern Description**:
The Idempotency Key Gate is a short circuit inserted BEFORE every financial operation. If the
key already exists and the operation is COMPLETED, return the cached result immediately. If
IN_PROGRESS, return 409 Conflict. Only NEW keys proceed to execution.

**State Machine**:
```
[not found] → GetOrCreateAsync → NEW → MarkInProgressAsync → [execute op]
                                                             → MarkCompletedAsync(result)
                                                             OR
                                                             → MarkFailedAsync(error)
[found] → status=IN_PROGRESS → 409 Conflict (duplicate in flight)
[found] → status=COMPLETED → return cachedResult (no-op)
[found] → status=FAILED → allow retry (create new attempt key variant)
```

**.NET 9 Interface Skeleton**:
```csharp
// F256 — via IExternalServiceFactory<IIdempotencyKeyRegistry>.CreateAsync(ctx)
public interface IIdempotencyKeyRegistry
{
    Task<DataProcessResult<Dictionary<string, object>>> GetOrCreateAsync(
        string operationKey,    // e.g. "auth-{orderId}-{attemptNum}"
        TimeSpan ttl,           // 24h for financial, 1h for inventory
        string tenantId,
        CancellationToken ct = default);

    Task<DataProcessResult<bool>> MarkInProgressAsync(
        string operationKey, string tenantId, CancellationToken ct = default);

    Task<DataProcessResult<bool>> MarkCompletedAsync(
        string operationKey,
        Dictionary<string, object> result, // cached for future retries
        string tenantId,
        CancellationToken ct = default);

    Task<DataProcessResult<bool>> MarkFailedAsync(
        string operationKey,
        string errorCode,
        string tenantId,
        CancellationToken ct = default);
}
```

**AF-4 RAG Retrieval Hints**:
- Search: "idempotency key payment retry" → retrieves SK-31
- Search: "duplicate prevention financial" → retrieves SK-31
- Search: "EP-4 idempotency registry" → retrieves SK-31

**DNA Compliance**:
- DNA-1: Dictionary<string,object> for result storage (no IdempotencyResultDto)
- DNA-3: DataProcessResult<T> on all methods
- DNA-9: This skill IS the DNA-9 implementation pattern

---

## SK-32 — Transactional Outbox Write Pattern

**Applicable Task Types**: T85 (OrderPlaced), T86 (PaymentCaptured), T87 (ShipmentCreated),
                           T89 (PayoutReleased, PayoutHeld)
**Primary Factories**: F257 (ITransactionalOutboxRelay — EP-5)
**Applies When**: Any factory method that publishes a financial domain event

**Pattern Description**:
The Transactional Outbox Write Pattern guarantees that domain state changes and their associated
events are either BOTH committed or BOTH rolled back. The factory writes an outbox row in the
same PG transaction as the domain state change. F257's background relay worker polls
`outbox_events WHERE relayed_at IS NULL` and publishes to Queue Fabric.

**Outbox Table Schema**:
```sql
CREATE TABLE outbox_events (
  outbox_id    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    VARCHAR(128) NOT NULL,           -- DNA-5
  event_type   VARCHAR(255) NOT NULL,           -- e.g. "order.placed"
  payload      JSONB NOT NULL,                  -- DNA-1: no typed model
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  relayed_at   TIMESTAMPTZ,                     -- NULL = not yet published
  relay_attempts INT DEFAULT 0
);
CREATE INDEX ON outbox_events (relayed_at, created_at) WHERE relayed_at IS NULL;
```

**.NET 9 Interface Skeleton**:
```csharp
// F257 — via IExternalServiceFactory<ITransactionalOutboxRelay>.CreateAsync(ctx)
public interface ITransactionalOutboxRelay
{
    // Called WITHIN an existing PG transaction (IDbTransaction passed in)
    Task<DataProcessResult<string>> WriteOutboxEventAsync(
        string eventType,
        Dictionary<string, object> payload, // DNA-1
        string tenantId,
        IDbTransaction transaction,         // MUST be the same transaction as domain write
        CancellationToken ct = default);

    // Called by background relay worker — not by business logic
    Task<DataProcessResult<int>> RelayPendingEventsAsync(
        int batchSize,
        string tenantId,
        CancellationToken ct = default);
}
```

**Usage Pattern (within a factory method)**:
```csharp
// F248.CreateOrderAsync — inside a unit of work
await using var tx = await _db.BeginTransactionAsync(ct);
// Write domain state (DNA-1: Dictionary, not OrderEntity)
var orderDoc = BuildSearchFilter(payload); // DNA-2
var writeResult = await _db.StoreDocumentAsync("orders", orderDoc, tenantId, ct);
// Write outbox event in SAME transaction
await _f257.WriteOutboxEventAsync(
    "order.placed", orderDoc, tenantId, tx, ct);
await tx.CommitAsync(ct);
// F257 relay worker will publish to Queue Fabric asynchronously
```

**AF-4 RAG Retrieval Hints**:
- Search: "transactional outbox financial event" → retrieves SK-32
- Search: "EP-5 outbox relay pattern" → retrieves SK-32
- Search: "atomic state change event publish" → retrieves SK-32

---

## SK-33 — Listing Moderation Pipeline Pattern

**Applicable Task Types**: T84 (Listing Moderation Saga)
**Primary Factories**: F245 (IProductCatalogService), F246 (IListingModerationService)
**Engine Primitive**: AF-5 Multi-model orchestration (AI ENGINE FABRIC)

**Pattern Description**:
Listing moderation uses multi-model AI consensus for policy compliance decisions. Three models
run in parallel (AF-5 AiDispatcher). A 2/3 majority determines APPROVED or REJECTED. Split
decisions (1/3) route to human review queue.

**Moderation Pipeline**:
```
listing.submitted
  → AF-4 RAG: retrieve category policy rules (IRagService.SearchAsync)
  → AF-5 Multi-model: [Claude, GPT-4o, Gemini] in parallel
       Each model receives: listing content + category policy rules
       Each returns: {decision: APPROVE|REJECT, confidence: 0-1, violations: []}
  → AiDispatcher consensus aggregation:
       ≥ 2 APPROVE → moderation.approved
       ≥ 2 REJECT → moderation.rejected (with violations list)
       1/2 split → moderation.human_review (assign to moderation queue)
  → F245.UpdateListingStatusAsync (result stored as Dictionary)
  → F257.WriteOutboxEventAsync (moderation event — EP-5)
```

**.NET 9 Interface Skeleton**:
```csharp
// F246 — via IExternalServiceFactory<IListingModerationService>.CreateAsync(ctx)
public interface IListingModerationService
{
    Task<DataProcessResult<Dictionary<string, object>>> CreateModerationCaseAsync(
        string listingId,
        Dictionary<string, object> listingContent, // DNA-1
        string tenantId,
        CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> RunModerationConsensusAsync(
        string caseId,
        Dictionary<string, object> policyContext, // from RAG
        string tenantId,
        CancellationToken ct = default);  // internally calls IAiProvider.GenerateAsync()

    Task<DataProcessResult<Dictionary<string, object>>> RunKycScreeningAsync(
        string sellerId,
        Dictionary<string, object> kycDocuments, // DNA-1
        string tenantId,
        CancellationToken ct = default);
}
```

**AF-4 RAG Retrieval Hints**:
- Search: "multi-model consensus AI moderation" → retrieves SK-33
- Search: "listing policy compliance AI" → retrieves SK-33
- Search: "human review queue moderation" → retrieves SK-33

---

## SK-34 — Cart-to-Order State Machine Pattern

**Applicable Task Types**: T85 (Cart-to-Order Placement Saga)
**Primary Factories**: F247 (ICartStateService), F248 (IOrderManagementService)
**Engine Primitive**: EP-1 (State Machine Registry) — cart/order state transitions

**Pattern Description**:
Cart state and order state are distinct state machines with a transition gate between them.
Cart: EMPTY → ACTIVE → LOCKED (during checkout) → CONVERTED (order placed) or ABANDONED.
Order: CREATED → CONFIRMED → SHIPPED → DELIVERED → COMPLETED or CANCELED.

**.NET 9 Interface Skeleton**:
```csharp
// F247 — Cart via IExternalServiceFactory<ICartStateService>.CreateAsync(ctx)
public interface ICartStateService
{
    Task<DataProcessResult<Dictionary<string, object>>> AddItemAsync(
        string buyerId, Dictionary<string, object> item, string tenantId,
        CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> LockCartAsync(
        string buyerId, string correlationId, string tenantId,
        CancellationToken ct = default);  // Redis SETNX

    Task<DataProcessResult<bool>> UnlockCartAsync(
        string buyerId, string tenantId,
        CancellationToken ct = default);  // compensation

    Task<DataProcessResult<Dictionary<string, object>>> ConvertToOrderAsync(
        string buyerId, string orderId, string tenantId,
        CancellationToken ct = default);
}

// F248 — Order via IExternalServiceFactory<IOrderManagementService>.CreateAsync(ctx)
public interface IOrderManagementService
{
    Task<DataProcessResult<Dictionary<string, object>>> CreateOrderAsync(
        Dictionary<string, object> orderPayload, // DNA-1
        IDbTransaction transaction,              // EP-5 outbox same tx
        string tenantId,
        CancellationToken ct = default);

    Task<DataProcessResult<bool>> CancelOrderAsync(
        string orderId, string reason, string idempotencyKey, string tenantId,
        CancellationToken ct = default);  // compensation

    Task<DataProcessResult<Dictionary<string, object>>> UpdateOrderStatusAsync(
        string orderId, string newStatus, string tenantId,
        CancellationToken ct = default);
}
```

**AF-4 RAG Retrieval Hints**:
- Search: "cart state machine Redis lock" → retrieves SK-34
- Search: "order lifecycle OMS state" → retrieves SK-34
- Search: "cart to order conversion" → retrieves SK-34

---

## SK-35 — Dispute Evidence Collection Pattern

**Applicable Task Types**: T88 (Dispute Resolution Arbitration Gate)
**Primary Factories**: F252 (IDisputeArbitrationService), F249 (IPaymentEscrowService)
**Engine Primitive**: EP-2 (Durable Timer) — seller response SLA, evidence collection deadline

**Pattern Description**:
Dispute resolution is a multi-party structured workflow with evidence, SLA timers, AI-assisted
decision support, and protected financial outcomes. The pattern enforces: buyer evidence upload
→ seller response window (EP-2 timer) → AI review → human decision → refund/deny → payout
adjustment.

**Dispute State Machine**:
```
OPENED → SELLER_RESPONSE_PENDING (EP-2 timer: seller_response_hours)
       → [seller responds] EVIDENCE_COLLECTION (EP-2 timer: evidence_window_hours)
       → UNDER_AI_REVIEW (F252 calls IAiProvider for decision support)
       → PENDING_DECISION
       → DECIDED (with rationale + outcome)
         → [if refund] REFUND_EXECUTION → CLOSED
         → [if denied] CLOSED
       → [seller no-response timeout] ESCALATED → DECIDED (auto-favor-buyer)
```

**.NET 9 Interface Skeleton**:
```csharp
// F252 — via IExternalServiceFactory<IDisputeArbitrationService>.CreateAsync(ctx)
public interface IDisputeArbitrationService
{
    Task<DataProcessResult<Dictionary<string, object>>> OpenDisputeAsync(
        Dictionary<string, object> disputePayload, // DNA-1
        string tenantId, CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> UploadEvidenceAsync(
        string disputeId, Dictionary<string, object> evidence,
        string tenantId, CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>>> GetAiDecisionSupportAsync(
        string disputeId, string tenantId,
        CancellationToken ct = default); // calls IAiProvider.GenerateAsync() — AI ENGINE FABRIC

    Task<DataProcessResult<Dictionary<string, object>>> RecordDecisionAsync(
        string disputeId, Dictionary<string, object> decision, // DNA-1
        string idempotencyKey, string tenantId,
        CancellationToken ct = default);
}
```

**AF-4 RAG Retrieval Hints**:
- Search: "dispute evidence arbitration AI" → retrieves SK-35
- Search: "buyer protection window dispute" → retrieves SK-35
- Search: "EP-2 seller response SLA" → retrieves SK-35

---

## SK-36 — Marketplace Discovery Ranking Pattern

**Applicable Task Types**: T90 (Marketplace Discovery Ranking)
**Primary Factories**: F254 (IMarketplaceSearchService), F255 (IPromotionsRulesEngine)
**Fabric**: DATABASE FABRIC (ES — primary search engine) + RAG FABRIC (social signal retrieval)

**Pattern Description**:
Discovery ranking combines Elasticsearch relevance scoring with promotion overlays and optional
social personalization signals (read-only via RAG FABRIC — CF-76). Results are filtered to
PUBLISHED listings only (CF-75). Promotion overlays (coupons, flash deals) are applied post-search.

**Ranking Pipeline**:
```
buyer.search_request (query, filters, buyerId, tenantId)
  → [optional] IRagService.SearchAsync("social_signals", {buyerId}) → socialSignalContext
  → F254.SearchListingsAsync(query, filters, tenantId):
       ES query with mandatory filter: listing_status = PUBLISHED (CF-75)
       Relevance scoring: BM25 + conversion_rate + seller_score + recency
       Social boost: if socialSignalContext → boost listings from connected sellers (CF-76)
  → F255.ApplyPromotionOverlaysAsync(searchResults, tenantId):
       Flash deal badges
       Coupon eligibility markers
       Sponsored placement injection (FREEDOM config: sponsored_positions)
  → return ranked results (Dictionary<string,object>[] — DNA-1)
```

**.NET 9 Interface Skeleton**:
```csharp
// F254 — via IExternalServiceFactory<IMarketplaceSearchService>.CreateAsync(ctx)
public interface IMarketplaceSearchService
{
    Task<DataProcessResult<Dictionary<string, object>>> SearchListingsAsync(
        Dictionary<string, object> searchParams,    // DNA-1: no SearchQuery typed model
        Dictionary<string, object>? socialContext,  // optional — read-only from RAG (CF-76)
        string tenantId,
        CancellationToken ct = default);

    Task<DataProcessResult<bool>> IndexListingAsync(
        string listingId,
        Dictionary<string, object> listingDoc,      // DNA-1
        string tenantId,
        CancellationToken ct = default);

    Task<DataProcessResult<bool>> DeIndexListingAsync(
        string listingId, string tenantId,
        CancellationToken ct = default);
}

// F255 — via IExternalServiceFactory<IPromotionsRulesEngine>.CreateAsync(ctx)
public interface IPromotionsRulesEngine
{
    Task<DataProcessResult<Dictionary<string, object>>> ValidateCouponAsync(
        string couponCode, string buyerId, string listingId,
        string tenantId, CancellationToken ct = default);

    Task<DataProcessResult<Dictionary<string, object>[]>> ApplyPromotionOverlaysAsync(
        Dictionary<string, object>[] searchResults,
        string tenantId,
        CancellationToken ct = default);
}
```

**AF-4 RAG Retrieval Hints**:
- Search: "Elasticsearch marketplace listing ranking" → retrieves SK-36
- Search: "promotion overlay search results" → retrieves SK-36
- Search: "social signal personalization read-only" → retrieves SK-36

---

# FLOW-08 CONCEPT MAP

```
FLOW-08 DOMAIN ENTITIES AND RELATIONSHIPS

[Seller] ─── KYC verified by ──→ [ModerationCase (KYC)]
    │                                    │ (F246 AI screening)
    │ creates                            ↓
    ↓                              [ModerationCase (Listing)]
[Listing] ─── screened by ────────────── ↑
    │                              (F246 multi-model consensus)
    │ published to
    ↓
[SearchIndex] ←── ranked by ──── [DiscoveryRanking]
    │                              (F254 + F255 overlays)
    │ discovered by
    ↓
[Cart] ─── converted to ──→ [Order] ─── triggers ──→ [Payment]
  (F247)          (T85 saga)  (F248)                    (F249)
                                │                          │
                           protected by                 captured after
                                │                          │
                           [InventoryReservation]      [Shipment] ←── fulfills
                               (F250)                    (F251)
                                                           │
                                                    delivered → starts
                                                           │
                                               [BuyerProtectionWindow] (EP-2)
                                                           │
                                            no dispute → [SellerPayout] (F253)
                                            dispute →   [DisputeCase] (F252)
                                                              │
                                                     decided → [Refund] (F249)
                                                              │
                                                         payout adjusted
```

# FLOW-08 COMPLETE EVENT CHAIN

```
1.  seller.registration_submitted    (F244 → EP-5 outbox)
2.  seller.kyc_approved              (F246 → EP-5 outbox)
3.  seller.store_activated           (F244 → EP-5 outbox)
4.  listing.draft_saved              (F245 — local, no outbox)
5.  listing.submitted                (F245 → EP-5 outbox)
6.  moderation.case_created          (F246)
7.  moderation.approved              (F246 → EP-5 outbox)
8.  listing.published                (F245 → EP-5 outbox → F254 index)
9.  inventory.soft_reserved          (F250 — local Redis)
10. inventory.hard_reserved          (F250 — PG row lock + EP-5 outbox)
11. order.placed                     (F248 → EP-5 outbox → downstream T86/T87)
12. payment.authorized               (F249 → EP-5 outbox)
13. order.confirmed                  (F248 → EP-5 outbox)
14. payment.escrowed                 (F249)
15. shipment.created                 (F251 → EP-5 outbox → triggers CF-69)
16. payment.captured                 (F249 → EP-5 outbox)
17. shipment.tracking_updated        (F251 — carrier webhook relay)
18. order.delivered                  (F251 → EP-5 outbox)
19. payout.scheduled                 (F253 → EP-2 timer: protection_window_days)
    [BRANCH A — No dispute]
20a. [EP-2 fires: protection window expired]
21a. payout.released                 (F253 → EP-5 outbox)
22a. seller.payout_released          (F253)
    [BRANCH B — Dispute opened]
20b. dispute.opened                  (F252 → Queue Fabric → CF-70 triggers)
21b. payout.held                     (F253 → EP-5 outbox → CF-73: 500ms notification)
22b. seller.payout_hold_notified     (F253)
23b. dispute.seller_responded        (F252)
24b. dispute.decided                 (F252)
25b. refund.executed                 (F249 → EP-5 outbox → CF-71: inventory check)
26b. payout.released (net of refund) (F253 → EP-5 outbox)
```

**Total domain events in FLOW-08: 26 (happy path: 22, dispute branch: +4)**
**All financial events (11–26) via EP-5 transactional outbox**
**All events carry tenantId (DNA-5)**
**Zero direct provider imports — all via fabric interfaces**

---

## MERGE:P4 STATE SAVE
```
MERGE:P4 = COMPLETE
Targets:
  SKILLS_FACTORY_RAG_MERGED.md    → SK-29–SK-36 appended
  UNIFIED_SOURCE_INDEX_MERGED.md  → DD-21–DD-29 + concept map + event chain appended
Added: DD-21–DD-29 (9 design decisions — FLOW-08)
Added: SK-29–SK-36 (8 skill patterns — FLOW-08)
Added: Concept map (8 entity types, relationships)
Added: Complete event chain (26 events, branching at dispute)
System: DD-1–DD-29, SK-1–SK-36
Next: MERGE:P5 → Validation (target: 95/95 PASS)
```
