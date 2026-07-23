# XIIGen UNIFIED SOURCE INDEX — FLOW-08 EXTENSION
## 16 — Giant Shop Platforms (Amazon/AliExpress-class Marketplace)
## Appends after FLOW-07 section in UNIFIED_SOURCE_INDEX_MERGED.md
## Date: 2026-02-26 | Save Point: MERGE:P4a ✅

---

## PRE-FLOW-08 INDEX STATE
```
Design Decisions: DD-1–DD-20  (FLOW-01 through FLOW-07)
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

