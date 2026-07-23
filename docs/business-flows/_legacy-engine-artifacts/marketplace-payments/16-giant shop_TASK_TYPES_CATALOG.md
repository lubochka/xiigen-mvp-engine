# XIIGen TASK TYPES CATALOG — FLOW-08 EXTENSION
## 16 — Giant Shop Platforms (Amazon/AliExpress-class Marketplace)
## Appends after Family 26 / FLOW-07 section in TASK_TYPES_CATALOG_MERGED.md
## Date: 2026-02-26 | Save Point: MERGE:P2 ✅

---

## PRE-FLOW-08 CATALOG STATE
```
Task Types:     T1–T82   (FLOW-01 through FLOW-07)
Flow Templates: 1–17
Next task type: T83
Next template:  Template 18
```

---

# TASK TYPE: T83 — Seller KYC Verification Gate

**ARCHETYPE**: LIFECYCLE

**ENTRY**: HTTP POST `/commerce/sellers/register` (DynamicController) OR
`seller.resubmit_kyc` event on Queue Fabric

**PURPOSE**: Orchestrate seller onboarding through KYC document collection, AI screening
(F246), regulatory check, and store activation. Maintains explicit state transitions via EP-1
State Machine Registry. Gate prevents any listing submission until KYC status = APPROVED.

**DISTINCT FROM**:
- T77 (Connection Lifecycle Gate, FLOW-07): T77 manages peer-to-peer connection states;
  T83 manages business identity verification with regulatory compliance implications
- T47 (User Registration, FLOW-01): T47 is buyer/user registration (email/social);
  T83 is business entity verification with document submission and AI screening

**FACTORY DEPENDENCIES**: F244, F246 — resolved via CreateAsync()

**FABRIC RESOLUTION**:
- F244 → DATABASE FABRIC (PG primary: seller registry, ES secondary: seller search)
  + QUEUE FABRIC (seller.* events)
- F246 → AI ENGINE FABRIC (AiDispatcher: Claude+GPT-4o+Gemini for KYC document screening)
  + DATABASE FABRIC (PG: ModerationCase records)

**AF CONFIGURATION**:
- AF-1 Genesis: generates ISellerAccountService + IListingModerationService implementations
  sitting on DATABASE FABRIC and AI ENGINE FABRIC respectively
- AF-2 Planning: decomposes into 4 steps:
  S1=RegisterSeller, S2=SubmitKycDocuments, S3=RunKycScreening, S4=ActivateStore
- AF-3 Prompt: KYC document extraction, regulatory compliance classification prompts
- AF-4 RAG: SK-29 (Seller KYC Lifecycle), EP-1 state machine pattern
- AF-5 Multi-model: F246.RunKycScreeningAsync uses AiDispatcher (3 parallel models)
- AF-6 Code Review: validates state transition guards, no status bypass paths
- AF-7 Compliance: DNA-1 (no SellerDto), DNA-5 (tenantId on all calls), DNA-6 (no
  SellerController), DNA-9 N/A (KYC is admin/compliance, not financial)
- AF-8 Security: KYC document access scoped to `sellerId + tenantId`; no cross-seller reads
- AF-9 Judge: validates all 8 iron rules; CF-64 enforcement verified
- AF-10 Merge: consensus aggregation from 3 KYC screening models
- AF-11 Feedback: KYC screening model accuracy (true positive rate vs human review rate)

**BFA VALIDATION**:
- CF-64: T83 APPROVED status is prerequisite for any listing.submit_request (T84 entry)
- CF-77: tenantId isolation — sellers cannot access other tenants' KYC data

**MACHINE / FREEDOM**:
- MACHINE (fixed): state transition order (REGISTERED→PENDING_KYC→UNDER_REVIEW→APPROVED),
  2/3 consensus threshold for KYC screening, CF-64 enforcement is unconditional
- FREEDOM (config): `marketplace.kyc.required_document_types` (what docs must be submitted),
  `marketplace.kyc.human_review_sla_hours` (EP-2 timer for human review fallback),
  `marketplace.kyc.auto_approve_threshold` (confidence score above which no human review)

**IRON RULES**:
- IR-83-1: KYC status MUST transition through EP-1 state machine — no direct DB writes to status
- IR-83-2: F246.RunKycScreeningAsync MUST use AiDispatcher (min 2 models) — single model call = BUILD FAILURE
- IR-83-3: KYC APPROVED transition MUST be atomic with store activation (same PG transaction)
- IR-83-4: seller.registration_submitted event MUST be published via F257 outbox (EP-5)
- IR-83-5: KYC documents MUST be stored in encrypted storage (per DR-22 bridge isolation)
- IR-83-6: No typed models — Dictionary<string,object> throughout (DNA-1)
- IR-83-7: tenantId on every F244 and F246 call (DNA-5)
- IR-83-8: DynamicController only — no SellerController (DNA-6)

**QUALITY GATES**:
- QG-83-1: KYC state machine covers all 6 states (REGISTERED, PENDING_KYC, UNDER_REVIEW,
  APPROVED, REJECTED, SUSPENDED) — generated code must handle all transitions
- QG-83-2: Resubmission path exists — REJECTED → PENDING_KYC allowed, CLOSED → terminal
- QG-83-3: Human review queue path exists — split AI vote routes to human, EP-2 SLA timer set
- QG-83-4: CF-64 enforcement verified — listing submission blocked if status ≠ APPROVED
- QG-83-5: DataProcessResult used throughout — no exceptions for business logic (DNA-3)
- QG-83-6: seller.store_activated event present in event stream after successful T83
- QG-83-7: KYC screening consensus stored in ModerationCase document (retrievable for audit)
- QG-83-8: Performance metrics baseline initialized (F244.UpdatePerformanceMetricsAsync)
  with zero values on store activation

---

# TASK TYPE: T84 — Listing Moderation Saga

**ARCHETYPE**: ORCHESTRATION

**ENTRY**: HTTP POST `/commerce/listings/{id}/submit` (DynamicController) triggering
`listing.submit_request` event on Queue Fabric

**PURPOSE**: Orchestrate product listing through multi-model AI content moderation consensus,
policy rule retrieval via RAG, human review fallback, Elasticsearch publication on approval,
and order cascading compensation on suspension. CF-64 gate is the prerequisite check.

**DISTINCT FROM**:
- T83 (Seller KYC): T83 screens the seller identity; T84 screens the product content
- T72 (Marketplace Post Publishing, FLOW-06): T72 publishes social posts; T84 publishes
  product catalog listings — different entity types, different policy rule sets, different
  Elasticsearch indices (CF-74 enforces namespace isolation)

**FACTORY DEPENDENCIES**: F245, F246, F255 — resolved via CreateAsync()

**FABRIC RESOLUTION**:
- F245 → DATABASE FABRIC (ES: listing index, PG: listing state)
- F246 → AI ENGINE FABRIC (AiDispatcher 3-model parallel) + DATABASE FABRIC (PG: ModerationCase)
- F255 → DATABASE FABRIC (Redis+ES: promotion rules, PG: redemption records)

**AF CONFIGURATION**:
- AF-2 Planning: steps = {CheckKycApproved, RetrievePolicyRules(RAG), RunModerationConsensus,
  EvaluateConsensus, PublishOrRejectOrQueue}
- AF-4 RAG: SK-33 (Listing Moderation Pipeline); policy rules retrieved via
  IRagService.SearchAsync with listing category as query
- AF-5 Multi-model: 3-model parallel moderation via AiDispatcher — APPROVE/REJECT consensus
- AF-7 Compliance: DNA-1 (no ListingDto), CF-74 (event namespace `listing.*` ≠ `post.*`),
  CF-75 (PUBLISHED filter injected into all F254 queries)
- AF-9 Judge: consensus threshold (2/3) enforced; human review path reachable

**BFA VALIDATION**: CF-64 (KYC check at saga entry), CF-66 (confirmed orders block deactivation),
CF-72 (suspension triggers order cancellation cascade), CF-74 (FLOW-06 namespace isolation),
CF-75 (PUBLISHED filter in F254), CF-77 (tenant isolation)

**MACHINE / FREEDOM**:
- MACHINE: 2/3 consensus threshold, CF-64 check is unconditional first step
- FREEDOM: `marketplace.moderation.policy_rules_index` (which RAG index to search for policies),
  `marketplace.moderation.human_review_sla_hours`, `marketplace.moderation.model_providers`
  (which 3 AI models participate in consensus)

**IRON RULES**:
- IR-84-1: CF-64 MUST be checked as FIRST step — listing submission rejected if KYC not APPROVED
- IR-84-2: Policy rules MUST be retrieved via IRagService.SearchAsync (RAG FABRIC) — not hardcoded
- IR-84-3: Moderation MUST use AiDispatcher with ≥ 2 models — single model = BUILD FAILURE
- IR-84-4: listing.published MUST be written via F257 outbox (EP-5) in same tx as PG status update
- IR-84-5: Approved listing MUST be indexed in ES via F254.IndexListingAsync before saga completes
- IR-84-6: Human review path MUST exist — 1/3 split MUST route to human queue with EP-2 timer
- IR-84-7: Event namespace MUST be `listing.*` — never `post.*` (CF-74 enforcement)
- IR-84-8: All F245/F246 calls tenantId-scoped (DNA-5)

**QUALITY GATES**:
- QG-84-1: Consensus result stored in ModerationCase document (audit trail for appeals)
- QG-84-2: REJECTED listings return structured violations list (not generic error)
- QG-84-3: F254.DeIndexListingAsync called on SUSPENDED/REJECTED (CF-75 defense-in-depth)
- QG-84-4: CF-72 cascade verified — suspended listing cancels CONFIRMED orders
- QG-84-5: RAG policy retrieval uses category-specific query, not generic prompt
- QG-84-6: listing.published event appears in event stream on approval path
- QG-84-7: Human review assignment includes moderator SLA timer via EP-2
- QG-84-8: DataProcessResult throughout — no exceptions (DNA-3)

---

# TASK TYPE: T85 — Cart-to-Order Placement Saga

**ARCHETYPE**: ORCHESTRATION

**ENTRY**: HTTP POST `/commerce/orders` (DynamicController) — buyer confirms checkout

**PURPOSE**: The core commerce saga. Executes 5 ordered steps (cart lock → coupon validate
→ hard inventory reserve → payment authorize → order create) with explicit 4-step LIFO
compensation chain on any failure. All financial steps carry EP-4 idempotency keys.
All domain events via EP-5 transactional outbox.

**DISTINCT FROM**:
- T40 (Three-Way Join Gate): T40 merges data streams; T85 executes compensatable financial
  state machine with money movement
- T87 (Fulfillment Fork): T87 manages post-order logistics; T85 manages pre-fulfillment
  cart-to-order conversion with compensation

**FACTORY DEPENDENCIES**: F247, F248, F249, F250, F255, F256, F257 — resolved via CreateAsync()

**FABRIC RESOLUTION**:
- F247 → DATABASE FABRIC (Redis: cart state with TTL)
- F248 → DATABASE FABRIC (PG: order records) + QUEUE FABRIC (order.* via F257)
- F249 → DATABASE FABRIC (PG: payment state, Redis: status cache) + QUEUE FABRIC
- F250 → DATABASE FABRIC (Redis: soft reserve, PG: hard reserve row lock)
- F255 → DATABASE FABRIC (Redis+ES: promotion rules)
- F256 → DATABASE FABRIC (Redis: idempotency keys — EP-4)
- F257 → DATABASE FABRIC (PG: outbox table) + QUEUE FABRIC (Redis Streams relay — EP-5)

**AF CONFIGURATION**:
- AF-2 Planning: S1=LockCart, S2=ValidateCoupon, S3=HardReserveInventory,
  S4=AuthorizePayment, S5=CreateOrder+OutboxWrite
  C4=VoidAuth(if S5 fails), C3=ReleaseReservation, C2=ReleaseCoupon, C1=UnlockCart
- AF-4 RAG: SK-30 (Saga Compensation Chain), SK-31 (Idempotency Key Gate),
  SK-32 (Transactional Outbox Write), SK-34 (Cart-to-Order State Machine)
- AF-7 Compliance: DNA-1 (no CartDto/OrderDto), DNA-9 (F256 call before F249+F250),
  EP-5 (F257 used for OrderPlaced — not direct IQueueService)
- AF-8 Security: BOLA check — buyerId from JWT MUST match cart.buyerId
- AF-9 Judge: compensation LIFO order verified, idempotency key present on S3/S4

**BFA VALIDATION**: CF-65 (cart TTL ≤ inventory TTL), CF-67 (no duplicate payment auth),
CF-68 (hard reservation block competing buyers), CF-77 (cross-tenant block)

**MACHINE / FREEDOM**:
- MACHINE: saga step order S1→S5, compensation LIFO order C4→C1, EP-4 required on S3/S4
- FREEDOM: `marketplace.cart.item.ttl_seconds`, `marketplace.inventory.soft_reservation.ttl_seconds`,
  `marketplace.payment.capture_timing` (on_shipment vs on_delivery),
  `marketplace.saga.compensation_timeout_seconds`

**IRON RULES**:
- IR-85-1: Compensation MUST execute LIFO — C4 before C3 before C2 before C1. No skipping.
- IR-85-2: S4 (AuthorizePayment) MUST call F256.GetOrCreateAsync before calling F249 (DNA-9)
- IR-85-3: S3 (HardReserveInventory) MUST call F256.GetOrCreateAsync (idempotent reservation)
- IR-85-4: S5 (CreateOrder) MUST write F257.WriteOutboxEventAsync in SAME PG transaction
- IR-85-5: Cart lock MUST use Redis SETNX — no optimistic locking for cart (race prevention)
- IR-85-6: BOLA check MUST execute before S1 — buyerId from JWT matches cart owner
- IR-85-7: Compensation failure MUST escalate to DLQ — not silently swallowed
- IR-85-8: No typed models throughout (DNA-1) — no CartDto, OrderDto, PaymentDto

**QUALITY GATES**:
- QG-85-1: End-to-end saga completes in < 8s (excluding async EP-5 relay)
- QG-85-2: 100 concurrent checkouts for 1-unit listing: exactly 1 succeeds (ST-31 pattern)
- QG-85-3: Card decline at S4: C3+C1 compensations both execute; no order record created
- QG-85-4: Idempotent retry: same idempotency key returns cached result, no duplicate
- QG-85-5: order.placed event appears in Queue Fabric within 30s of pod restart (ST-33 pattern)
- QG-85-6: Cross-tenant order attempt returns 403, not 404 (CF-77, ST-37 pattern)
- QG-85-7: DataProcessResult on all steps — no exceptions thrown (DNA-3)
- QG-85-8: All compensation steps carry idempotency keys (not raw retries)

---

# TASK TYPE: T86 — Payment Escrow Lifecycle Gate

**ARCHETYPE**: LIFECYCLE

**ENTRY**: `order.placed` event on Queue Fabric (published by T85 via F257 outbox)

**PURPOSE**: Manages escrow payment lifecycle: hold payment after order placement,
trigger capture when shipment is confirmed (CF-69), manage protection window via EP-2
Durable Timer, and coordinate with T88 (dispute) and T89 (payout release) via BFA events.

**DISTINCT FROM**:
- T85 (Cart-to-Order): T85 authorizes payment; T86 manages what happens to the authorized
  payment across the subsequent lifecycle (escrow → capture → release/refund)
- T89 (Payout Release): T89 releases money TO the seller; T86 manages the buyer payment
  state (hold, capture, void, refund) — different principal, different ledger

**FACTORY DEPENDENCIES**: F249, F256, F257 — resolved via CreateAsync()

**FABRIC RESOLUTION**:
- F249 → DATABASE FABRIC (PG: payment state) + QUEUE FABRIC (payment.* events via F257)
- F256 → DATABASE FABRIC (Redis: EP-4 idempotency keys, 24h TTL for all F249 calls)
- F257 → DATABASE FABRIC (PG: outbox) + QUEUE FABRIC (Redis Streams relay)

**AF CONFIGURATION**:
- AF-2 Planning: states = {AUTHORIZED, ESCROWED, CAPTURED, VOIDED, REFUNDED}
  Transitions: AUTHORIZED→ESCROWED (order.placed), ESCROWED→CAPTURED (shipment.created,
  CF-69), ESCROWED→VOIDED (order.canceled/timeout), CAPTURED→REFUNDED (dispute.decided)
- AF-4 RAG: SK-31 (Idempotency Key Gate), SK-34 (Cart-to-Order State Machine for payment
  state reference), EP-1 state machine pattern
- AF-7 Compliance: DNA-9 (F256 before every F249 call), EP-5 (F257 for all payment events)
- AF-9 Judge: EP-2 timer registered on order.placed; CF-69 correlation timeout monitored

**BFA VALIDATION**: CF-67 (no duplicate authorization), CF-69 (shipment triggers capture),
CF-71 (refund releases inventory if unfulfilled), CF-77 (tenant isolation)

**MACHINE / FREEDOM**:
- MACHINE: state transition order, DNA-9 on every F249 call, EP-5 for every payment event
- FREEDOM: `marketplace.payment.capture_timing` (on_shipment vs on_delivery),
  `marketplace.payment.authorization_hold_days` (how long auth can be held before void),
  `marketplace.payment.idempotency_ttl_hours` (default: 24)

**IRON RULES**:
- IR-86-1: Every F249 call MUST be preceded by F256.GetOrCreateAsync (DNA-9)
- IR-86-2: ESCROWED→CAPTURED transition MUST be triggered by shipment.created event (CF-69)
  — no capture without confirmed shipment
- IR-86-3: EP-2 timer MUST be registered on order.placed for authorization hold expiry
- IR-86-4: All F249 state change events MUST go via F257.WriteOutboxEventAsync (EP-5)
- IR-86-5: REFUNDED state MUST check order fulfillment status (CF-71: release inventory if
  order not yet shipped)
- IR-86-6: Duplicate capture attempt MUST return cached CAPTURED result via EP-4 (not re-capture)
- IR-86-7: Payment state machine transitions MUST be validated against EP-1 registry
- IR-86-8: No typed models (DNA-1); no PaymentDto — Dictionary<string,object> throughout

**QUALITY GATES**:
- QG-86-1: payment.authorized → payment.escrowed transition completes within 1s of order.placed
- QG-86-2: CF-69 correlation: payment.captured appears within
  `marketplace.payment.capture_window_seconds` of shipment.created
- QG-86-3: Duplicate capture with same idempotency key returns cached result (ST-34 pattern)
- QG-86-4: Authorization hold expiry fires via EP-2 — no in-process timer (pod restart safe)
- QG-86-5: CF-71: refund.executed on unshipped order triggers inventory.released event
- QG-86-6: payment.captured event appears in Queue Fabric within 30s of pod restart (EP-5)
- QG-86-7: Payment state machine has no invalid transitions (no CAPTURED→AUTHORIZED)
- QG-86-8: DataProcessResult throughout — no exceptions (DNA-3)

---

# TASK TYPE: T87 — Order Fulfillment Fork

**ARCHETYPE**: ORCHESTRATION

**ENTRY**: `order.confirmed` event on Queue Fabric (published by F248 via F257 outbox)

**PURPOSE**: Orchestrate post-confirmation fulfillment: notify seller, create shipment record,
register carrier tracking, monitor SLA via EP-2 Durable Timer (seller must ship within config
window), and trigger payment capture on shipment creation (CF-69). Executes compensation chain
(payment void + inventory release + order cancel) on SLA timeout.

**DISTINCT FROM**:
- T79 (Four-Way Weight Analysis Fork, FLOW-07): T79 is a parallel data analysis fork;
  T87 is a sequential fulfillment orchestration with SLA gate and financial compensation
- T85 (Cart-to-Order): T85 ends at order.confirmed; T87 begins at order.confirmed

**FACTORY DEPENDENCIES**: F248, F250, F251, F256, F257 — resolved via CreateAsync()

**FABRIC RESOLUTION**:
- F248 → DATABASE FABRIC (PG: order state) + QUEUE FABRIC (order.* events via F257)
- F250 → DATABASE FABRIC (Redis+PG: inventory reservation)
- F251 → QUEUE FABRIC (Redis Streams: shipment events) + DATABASE FABRIC (PG: shipment records)
- F256 → DATABASE FABRIC (Redis: EP-4 keys — compensation steps)
- F257 → DATABASE FABRIC (PG: outbox) + QUEUE FABRIC (relay — EP-5)

**AF CONFIGURATION**:
- AF-2 Planning: S1=NotifySeller, S2=AwaitShipmentCreated(EP-2 SLA timer),
  S3=RegisterCarrierTracking, S4=ProcessDeliveryConfirmation
  Compensation (SLA timeout): C3=VoidPaymentAuth, C2=ReleaseInventory, C1=CancelOrder
- AF-4 RAG: SK-30 (Saga Compensation Chain for SLA timeout path), EP-2 timer pattern
- AF-7 Compliance: DNA-9 (compensation steps carry idempotency keys), EP-5 (shipment.created
  via F257 outbox — triggers CF-69 payment capture)
- AF-9 Judge: EP-2 timer fires; compensation LIFO on timeout

**BFA VALIDATION**: CF-66 (confirmed orders block listing deactivation), CF-69 (shipment triggers
payment capture), CF-77 (tenant isolation)

**MACHINE / FREEDOM**:
- MACHINE: EP-2 SLA timer mandatory, compensation LIFO on timeout, CF-69 shipment→capture
- FREEDOM: `marketplace.fulfillment.seller_ship_deadline_hours` (EP-2 timer duration, default: 72),
  `marketplace.fulfillment.carrier_tracking_required` (boolean),
  `marketplace.fulfillment.delivery_confirmation_source` (carrier vs buyer vs auto-timer)

**IRON RULES**:
- IR-87-1: EP-2 timer MUST be registered immediately on order.confirmed (survives pod restart)
- IR-87-2: shipment.created MUST go via F257.WriteOutboxEventAsync (EP-5) — triggers CF-69
- IR-87-3: SLA timeout compensation MUST execute LIFO: VoidAuth → ReleaseInventory → CancelOrder
- IR-87-4: Compensation steps MUST carry F256 idempotency keys (DNA-9)
- IR-87-5: EP-2 fires at exactly `seller_ship_deadline_hours` — no in-process sleep/delay
- IR-87-6: Seller performance metrics MUST be updated on SLA timeout (F244.UpdatePerformanceMetricsAsync)
- IR-87-7: No typed models (DNA-1) — no ShipmentDto, FulfillmentDto
- IR-87-8: tenantId on all F248/F250/F251 calls (DNA-5)

**QUALITY GATES**:
- QG-87-1: order.shipped event appears in Queue Fabric after shipment.created
- QG-87-2: SLA timeout compensation completes within 5s of EP-2 firing (ST-35 pattern)
- QG-87-3: CF-69 verified: payment.captured follows shipment.created within capture window
- QG-87-4: Seller performance metric incremented on timeout (fulfillment_failure)
- QG-87-5: Carrier tracking registered before seller notification complete
- QG-87-6: order.delivered event triggers EP-2 protection window timer (T86 handoff)
- QG-87-7: Compensation leaves zero orphaned hard reservations (ST-35 PASS criteria)
- QG-87-8: DataProcessResult throughout — no exceptions (DNA-3)

---

# TASK TYPE: T88 — Dispute Resolution Arbitration Gate

**ARCHETYPE**: ORCHESTRATION

**ENTRY**: HTTP POST `/commerce/disputes` (DynamicController) —
buyer opens dispute within protection window; OR `dispute.auto_escalate` event (EP-2 seller
non-response timeout)

**PURPOSE**: Manage buyer protection dispute lifecycle: evidence collection from both parties,
AI-assisted decision support (F252 via IAiProvider), human arbitration decision, and
outcome execution (refund via F249 + inventory release check via CF-71 + payout adjustment
via F253). CF-70 payout freeze is triggered at dispute opening, not at resolution.

**DISTINCT FROM**:
- T83 (KYC Gate): T83 screens sellers before they can list; T88 handles post-purchase
  buyer-seller disputes — entirely different actors and trigger conditions
- T86 (Payment Escrow): T86 manages payment state machine; T88 manages dispute process
  and may instruct T86 to refund — T88 commands, T86 executes

**FACTORY DEPENDENCIES**: F252, F249, F248, F256 — resolved via CreateAsync()

**FABRIC RESOLUTION**:
- F252 → DATABASE FABRIC (PG: DisputeCase, evidence records) + AI ENGINE FABRIC
  (IAiProvider: decision support analysis) + QUEUE FABRIC (dispute.* events)
- F249 → DATABASE FABRIC (PG: payment state) + QUEUE FABRIC (refund.* events via F257)
- F248 → DATABASE FABRIC (PG: order status check for CF-71)
- F256 → DATABASE FABRIC (Redis: EP-4 keys — RecordDecisionAsync requires idempotency)

**AF CONFIGURATION**:
- AF-2 Planning: S1=OpenDispute(CF-70 triggers), S2=SellerResponseWindow(EP-2),
  S3=EvidenceCollection, S4=GetAiDecisionSupport, S5=HumanDecision, S6=ExecuteOutcome
- AF-4 RAG: SK-35 (Dispute Evidence Collection), EP-2 timer pattern for seller SLA
- AF-5 Multi-model: F252.GetAiDecisionSupportAsync calls IAiProvider (decision support,
  NOT binding — human makes final decision)
- AF-7 Compliance: DNA-9 (F256 before RecordDecisionAsync), CF-70 (payout freeze verified),
  CF-71 (inventory release on refund to unshipped order)
- AF-8 Security: Buyer can only open disputes for their own orders (BOLA check);
  Seller can only upload evidence for disputes about their listings
- AF-9 Judge: non-repudiation — decision record includes arbitrator identity + evidence IDs

**BFA VALIDATION**: CF-70 (dispute freezes seller payout), CF-71 (refund releases inventory
if unfulfilled), CF-73 (seller notified of payout hold within 500ms), CF-77 (tenant isolation)

**MACHINE / FREEDOM**:
- MACHINE: CF-70 triggers on open (not configurable), non-repudiation audit trail mandatory
- FREEDOM: `marketplace.dispute.protection_window_days` (how long after delivery buyer can open),
  `marketplace.dispute.seller_response_hours` (EP-2 timer duration, default: 48),
  `marketplace.dispute.evidence_window_hours` (collection window, default: 72),
  `marketplace.dispute.auto_escalate_to_buyer` (boolean — auto-decide for buyer on seller timeout)

**IRON RULES**:
- IR-88-1: CF-70 MUST be triggered immediately on dispute.opened — payout freeze cannot be deferred
- IR-88-2: F252.RecordDecisionAsync MUST call F256.GetOrCreateAsync before executing (DNA-9)
- IR-88-3: Decision record MUST include: arbitratorId, evidenceIds[], decision, rationale, timestamp
  (non-repudiation — DR-26)
- IR-88-4: Refund MUST call F249.RefundAsync with idempotency key from F256
- IR-88-5: CF-71 check MUST occur after refund: if order not shipped, release inventory
- IR-88-6: AI decision support is advisory only — F252.GetAiDecisionSupportAsync result
  is input to human review, not the binding decision
- IR-88-7: Seller response timeout MUST escalate automatically (EP-2) — not rely on polling
- IR-88-8: No typed models (DNA-1) — no DisputeDto, EvidenceDto, DecisionDto

**QUALITY GATES**:
- QG-88-1: CF-70 payout hold confirmed within 100ms of dispute.opened event
- QG-88-2: CF-73 seller notification appears within 500ms of payout.held
- QG-88-3: Seller response EP-2 timer registered on dispute.opened
- QG-88-4: AI decision support includes evidence summary + recommended outcome + confidence
- QG-88-5: Decision record retrievable by arbitratorId + disputeId (audit trail)
- QG-88-6: Refund.executed triggers CF-71 inventory check (observable in event stream)
- QG-88-7: BOLA check: buyerId from JWT matches dispute.buyerId
- QG-88-8: DataProcessResult throughout — no exceptions (DNA-3)

---

# TASK TYPE: T89 — Seller Payout Release Gate

**ARCHETYPE**: LIFECYCLE

**ENTRY**: EP-2 Durable Timer fires (protection window expires, no dispute) OR
`dispute.decided` event (dispute resolved, payout hold cleared)

**PURPOSE**: Manages seller payout release after the buyer protection window expires with no
open disputes, OR after dispute resolution with payout recalculated net of any refund.
CF-70 hold must be verified cleared before any release. All payout operations carry
EP-4 idempotency keys. Payout.released via EP-5 transactional outbox.

**DISTINCT FROM**:
- T86 (Payment Escrow): T86 manages buyer payment state; T89 manages seller payout ledger —
  different principals, different financial accounts, different timing
- T82 (Connection Strength Rebalancer, FLOW-07): Both use EP-2 timer as sole entry trigger,
  but T82 is periodic (every 6h) while T89 is deadline-based (fires once per order)

**FACTORY DEPENDENCIES**: F253, F248, F256, F257 — resolved via CreateAsync()

**FABRIC RESOLUTION**:
- F253 → DATABASE FABRIC (PG: payout records, wallet balances) + QUEUE FABRIC (payout.* via F257)
- F248 → DATABASE FABRIC (PG: order status — verify delivered before payout)
- F256 → DATABASE FABRIC (Redis: EP-4 idempotency keys, 24h TTL)
- F257 → DATABASE FABRIC (PG: outbox) + QUEUE FABRIC (relay — EP-5)

**AF CONFIGURATION**:
- AF-2 Planning: CheckProtectionWindowExpiry → CheckNoOpenDisputes(CF-70 cleared) →
  RecalculatePayoutAmount(net of refunds) → ReleasePayoutAsync(F256 idempotency) →
  WriteOutboxAsync(payout.released via F257)
- AF-4 RAG: SK-31 (Idempotency Key Gate), SK-30 (compensation if release fails)
- AF-7 Compliance: DNA-9 (F256 before F253.ReleasePayoutAsync), EP-5 (payout.released
  via F257 — not direct IQueueService)
- AF-9 Judge: CF-70 cleared verified, idempotency key present, payout amount reconciled

**BFA VALIDATION**: CF-70 (open dispute blocks release), CF-73 (seller notified of holds),
CF-77 (seller can only release their own tenant's payouts)

**MACHINE / FREEDOM**:
- MACHINE: CF-70 open dispute = unconditional block, EP-4 on ReleasePayoutAsync mandatory
- FREEDOM: `marketplace.payout.protection_window_days` (EP-2 timer duration, default: 15),
  `marketplace.payout.schedule` (daily/weekly/on-threshold),
  `marketplace.payout.minimum_payout_amount` (threshold before release)

**IRON RULES**:
- IR-89-1: CF-70 check MUST be atomic with release decision — no TOCTOU race on dispute status
- IR-89-2: F253.ReleasePayoutAsync MUST call F256.GetOrCreateAsync before executing (DNA-9)
- IR-89-3: payout.released MUST go via F257.WriteOutboxEventAsync (EP-5)
- IR-89-4: Payout amount MUST be reconciled: gross amount minus any executed refunds for that order
- IR-89-5: EP-2 timer MUST be the ONLY non-dispute entry trigger — no HTTP endpoint for payout release
- IR-89-6: Dispute path: payout releases ONLY after dispute.decided AND no open dispute remains
- IR-89-7: Release attempt on frozen payout (CF-70 active) MUST return DataProcessResult.Conflict
- IR-89-8: No typed models (DNA-1) — no PayoutDto, WalletDto

**QUALITY GATES**:
- QG-89-1: EP-2 fires at exactly protection_window_days after order.delivered
- QG-89-2: CF-70 cleared check atomic with release (ST-36 pattern — payout not released while
  dispute open on day 5)
- QG-89-3: Duplicate release attempt returns cached payout.released result (EP-4)
- QG-89-4: payout.released event in Queue Fabric within 30s of pod restart (EP-5)
- QG-89-5: Payout amount equals: original_amount - sum(refunds for orderId)
- QG-89-6: seller.payout_hold_notified appears within 500ms when hold is placed (CF-73)
- QG-89-7: BOLA: sellerId in JWT matches payout.sellerId
- QG-89-8: DataProcessResult throughout — no exceptions (DNA-3)

---

# TASK TYPE: T90 — Marketplace Discovery Ranking

**ARCHETYPE**: COMPUTATION

**ENTRY**: HTTP GET `/commerce/search` (DynamicController) — buyer search request

**PURPOSE**: Execute high-performance Elasticsearch listing search with mandatory PUBLISHED
status filter (CF-75), optional social signal personalization via RAG FABRIC (CF-76 read-only),
promotion overlay injection (F255), and sponsored position insertion from FREEDOM config.
Returns ranked, annotated listing results to buyer.

**DISTINCT FROM**:
- T64 (Feed Distribution, FLOW-04): T64 pushes content to feeds; T90 responds to pull
  requests — different trigger model, different data source (social posts vs product listings)
- T78 (Initial Match Scoring, FLOW-07): T78 computes connection compatibility scores;
  T90 computes product relevance + personalization scores — different domains

**FACTORY DEPENDENCIES**: F254, F255, F245 — resolved via CreateAsync()

**FABRIC RESOLUTION**:
- F254 → DATABASE FABRIC (ES: listing search index primary) + RAG FABRIC (social signals,
  read-only via IRagService.SearchAsync — CF-76 enforced)
- F255 → DATABASE FABRIC (Redis+ES: promotion rules) + DATABASE FABRIC (PG: redemption records)
- F245 → DATABASE FABRIC (ES: listing metadata for enrichment)

**AF CONFIGURATION**:
- AF-4 RAG: SK-36 (Marketplace Discovery Ranking); social signal retrieval via
  IRagService.SearchAsync("social_signals", {buyerId}) — NOT F234 CreateAsync (CF-76)
- AF-7 Compliance: CF-75 (PUBLISHED filter mandatory — validated statically in generated code),
  CF-76 (zero F234 factory calls in generated T90 code),
  DNA-1 (no SearchQueryDto/SearchResultDto)
- AF-8 Security: Results scoped to tenantId — no cross-tenant listing exposure
- AF-9 Judge: CF-75 filter present; CF-76 zero F234 imports; promoted results from config only

**BFA VALIDATION**: CF-75 (PUBLISHED filter on all queries), CF-76 (social signals read-only),
CF-77 (tenant isolation)

**MACHINE / FREEDOM**:
- MACHINE: CF-75 PUBLISHED filter is unconditional (cannot be overridden by config)
- FREEDOM: `marketplace.search.ranking_weights` (conversion_rate, recency, seller_score weights),
  `marketplace.ui.search_facets` (which filters shown in UI),
  `marketplace.promotions.sponsored_positions` (which result positions can be sponsored),
  `marketplace.search.social_personalization_enabled` (boolean — enables RAG signal read)

**IRON RULES**:
- IR-90-1: listing_status: PUBLISHED filter MUST be present in every ES query (CF-75) —
  absence = BUILD FAILURE
- IR-90-2: Social signals MUST be accessed via IRagService.SearchAsync ONLY — zero F234
  factory method imports in generated T90 code (CF-76) — violation = BUILD FAILURE
- IR-90-3: Sponsored positions sourced from FREEDOM config only — never from buyer payment
  or arbitrary injection
- IR-90-4: No typed models (DNA-1) — no SearchQueryDto, SearchResultDto, ListingCardDto
- IR-90-5: tenantId on F254.SearchListingsAsync and F255.ApplyPromotionOverlaysAsync (DNA-5)
- IR-90-6: BuildSearchFilter MUST be used on all F254 ES queries (DNA-2: empty field skipping)
- IR-90-7: T90 MUST NOT publish any domain events — computation only, no side effects
- IR-90-8: T90 MUST NOT write to any database — read-only computation task type

**QUALITY GATES**:
- QG-90-1: P95 search latency < 200ms (Elasticsearch query + promotion overlay + social signal)
- QG-90-2: PUBLISHED filter query: 0 results for listings in DRAFT/SUBMITTED/REJECTED/SUSPENDED
- QG-90-3: Social personalization disabled (config) → same results as no socialContext (no error)
- QG-90-4: Sponsored positions are configurable — test with 0 sponsored, 1 sponsored, max sponsored
- QG-90-5: Promotion overlays (flash deal badge, coupon) correctly annotate results
- QG-90-6: Cross-tenant listing exposure = 0 (CF-77, tenantId scoped ES queries)
- QG-90-7: Generated code contains zero F234.CreateAsync calls (CF-76 — static analysis)
- QG-90-8: DataProcessResult returned — no exceptions for empty results or no promotions (DNA-3)

---

# AF STATION MAP — FLOW-08 (11 stations × 8 task types = 88 cells)

| AF Station | T83 KYC Gate | T84 Listing Moderation | T85 Cart-Order Saga | T86 Payment Escrow | T87 Fulfillment Fork | T88 Dispute Arbitration | T89 Payout Release | T90 Discovery Ranking |
|------------|-------------|----------------------|--------------------|--------------------|----------------------|------------------------|-------------------|-----------------------|
| **AF-1 Genesis** | ISellerAccountService + IListingModerationService (AI FABRIC) on DB(PG)+DB(ES) | IProductCatalogService on DB(ES/PG) + IListingModerationService multi-model | ICartStateService(Redis) + IOrderManagementService(PG) + IPaymentEscrowService(PG) + IInventoryReservationService(Redis/PG) | IPaymentEscrowService escrow states on PG + Redis cache | IFulfillmentOrchestrationService(Queue/PG) + IOrderManagementService(PG) | IDisputeArbitrationService(PG/AI) + IPaymentEscrowService | ISellerPayoutService(PG/Queue) + IOrderManagementService | IMarketplaceSearchService(ES) + IPromotionsRulesEngine(Redis/ES) |
| **AF-2 Planning** | S1=Register, S2=SubmitKyc, S3=AiScreen, S4=Activate; EP-1 state machine | S1=CheckKyc(CF-64), S2=RagPolicy, S3=MultiModelConsensus, S4=Evaluate, S5=PublishOrQueue | S1=LockCart, S2=Coupon, S3=HardReserve, S4=AuthPay(EP-4), S5=CreateOrder+Outbox; C4→C1 LIFO | States: AUTHORIZED→ESCROWED→CAPTURED/VOIDED/REFUNDED; EP-2 auth hold timer | S1=NotifySeller, S2=AwaitShipment(EP-2 SLA), S3=RegisterTracking, S4=RecordDelivery; C3→C1 on timeout | S1=OpenDispute(CF-70), S2=SellerWindow(EP-2), S3=Evidence, S4=AiSupport, S5=Decision, S6=Outcome | Check CF-70 cleared → Reconcile amount → Release(EP-4) → Outbox(EP-5) | RetrieveSocialSignals(RAG) → SearchES(CF-75 filter) → ApplyPromotions → RankResults |
| **AF-3 Prompt** | KYC document extraction prompts; regulatory compliance classification; entity screening | Category-specific policy rules; prohibited item detection; AI content classification | Saga step decomposition; compensation chain construction; idempotency key generation pattern | Payment state machine transitions; capture timing rules; escrow lifecycle | Fulfillment SLA enforcement; carrier tracking webhook parsing; delivery confirmation | Evidence analysis; dispute merit assessment; arbitration reasoning; outcome recommendation | Payout reconciliation; protection window expiry handling; dispute clearance verification | Search relevance scoring; promotion overlay logic; personalization signal integration |
| **AF-4 RAG** | SK-29 (Seller KYC Lifecycle); EP-1 state machine; SK-33 (KYC screening variant) | SK-33 (Listing Moderation Pipeline); CF-64 gate pattern; SK-36 (ES indexing for F254) | SK-30 (Saga Compensation Chain); SK-31 (Idempotency Key Gate); SK-32 (Transactional Outbox); SK-34 (Cart-to-Order State Machine) | SK-31 (Idempotency Key Gate); EP-2 timer; SK-30 (partial — escrow lifecycle as saga step) | SK-30 (Compensation Chain — SLA timeout path); EP-2 timer pattern; SK-32 (shipment.created outbox) | SK-35 (Dispute Evidence Collection); EP-2 seller SLA timer; SK-31 (RecordDecision idempotency) | SK-31 (Idempotency Key Gate for ReleasePayoutAsync); SK-32 (payout.released outbox); EP-2 pattern | SK-36 (Marketplace Discovery Ranking); social signal via IRagService (CF-76); F254 ES query patterns |
| **AF-5 Multi-model** | F246 KYC screening: 3-model parallel (Claude+GPT-4o+Gemini); 2/3 consensus → APPROVED/REJECTED/HUMAN | F246 listing moderation: 3-model parallel; 2/3 consensus → APPROVED/REJECTED/HUMAN_REVIEW | Not applicable — saga steps are deterministic orchestration, not AI generation | Not applicable — payment lifecycle is deterministic state machine | Not applicable — logistics tracking is deterministic | F252.GetAiDecisionSupportAsync: IAiProvider (advisory analysis, not binding) | Not applicable — payout calculation is deterministic | Not applicable — ES ranking is deterministic formula |
| **AF-6 Code Review** | State machine guards validated; no status bypass; KYC document encryption present | CF-64 first-step verification; consensus threshold enforced; human review path reachable | Saga step order verified; compensation LIFO verified; BOLA check present; no missing steps | Payment state machine completeness; all transitions handled; EP-2 timer registration present | EP-2 SLA timer registration present; compensation LIFO; seller metric update on timeout | BOLA checks (buyer/seller evidence scope); non-repudiation fields present; CF-70 trigger verified | CF-70 clearance check atomic; payout amount reconciliation logic present | CF-75 PUBLISHED filter present; zero F234 import (CF-76); sponsored positions from config only |
| **AF-7 Compliance** | DNA-1 (no SellerDto/KycDto); DNA-5 (tenantId); DNA-6 (no SellerController); DNA-8 (outbox events) | DNA-1; DNA-5; DNA-6; CF-74 (namespace isolation `listing.*` ≠ `post.*`); CF-75 (F254 PUBLISHED filter) | DNA-1; DNA-9 (F256 before F249+F250); EP-5 (F257 for OrderPlaced not direct IQueueService); DNA-6 | DNA-1; DNA-9 (F256 before every F249 call); EP-5 (F257 for all payment events) | DNA-1; DNA-9 (compensation steps carry EP-4 keys); EP-5 (F257 for shipment.created) | DNA-1; DNA-9 (F256 before RecordDecision); CF-70 trigger on dispute.opened | DNA-1; DNA-9 (F256 before ReleasePayoutAsync); EP-5 (F257 for payout.released) | DNA-1; DNA-2 (BuildSearchFilter); CF-75 (PUBLISHED filter static check); CF-76 (zero F234 imports BUILD FAILURE) |
| **AF-8 Security** | KYC docs scoped to sellerId+tenantId; no cross-seller KYC reads | Listing moderation scoped to listing+seller+tenantId; CF-77 cross-tenant block | BOLA: buyerId in JWT matches cart.buyerId; CF-77: listingId must match tenantId (cross-tenant → 403) | Payment access scoped to buyerId+orderId+tenantId | Fulfillment scoped to orderId+sellerId+tenantId; carrier webhooks authenticated | BOLA buyer side: disputeId must match buyerId; BOLA seller side: evidence scoped to listingId | Seller payout access scoped to sellerId+tenantId; CF-77 | Search results scoped to tenantId (CF-77); social signals scoped to buyerId+tenantId |
| **AF-9 Judge** | IR-83-1 through IR-83-8 all pass; CF-64 enforcement verified; KYC consensus threshold 2/3 | IR-84-1 through IR-84-8 all pass; CF-64 first-step check; CF-74 namespace; CF-75 filter | IR-85-1 through IR-85-8 all pass; LIFO compensation order verified; EP-4 on S3+S4; ST-31 concurrency pattern | IR-86-1 through IR-86-8 all pass; EP-2 timer present; CF-69 correlation | IR-87-1 through IR-87-8 all pass; EP-2 SLA timer; compensation on timeout; CF-69 | IR-88-1 through IR-88-8 all pass; CF-70 immediate trigger; non-repudiation fields; CF-71 | IR-89-1 through IR-89-8 all pass; CF-70 clearance atomic; EP-4 on release; EP-5 outbox | IR-90-1 through IR-90-8 all pass; CF-75 static filter; CF-76 zero F234 imports; read-only verified |
| **AF-10 Merge** | KYC consensus aggregation: 3 model votes → majority decision; split → HUMAN_REVIEW | Listing moderation consensus: 3 votes → majority; violations union from rejecting models | Not applicable — saga is deterministic; no multi-model merge | Not applicable | Not applicable | Dispute AI support: evidence summary + recommendation synthesized from IAiProvider response | Not applicable | Promotion overlay merge: search results annotated with promotion badges from F255 |
| **AF-11 Feedback** | KYC screening model accuracy (true positive rate vs human override rate per model) | Moderation model performance: consensus accuracy, false positive takedowns, human review rate | Saga completion rate; compensation frequency by step (which step fails most); payment decline rate | Payment capture latency; authorization void rate (seller non-fulfillment proxy) | Fulfillment SLA compliance rate; seller timeout rate; carrier tracking accuracy | Dispute resolution time; AI recommendation vs final decision alignment rate | Payout release latency; payout hold rate (dispute frequency) | Search result click-through rate; promotion conversion rate; social signal personalization lift |

---

# FLOW TEMPLATE 18 — giant-shop-marketplace-v1

```json
{
  "flowId": "giant-shop-marketplace-v1",
  "version": "1.0.0",
  "tenantScope": "marketplace",
  "description": "Giant Shop Marketplace — full lifecycle from seller KYC to buyer payout",
  "steps": [
    {
      "stepId": "seller-kyc",
      "taskType": "T83",
      "name": "Seller KYC Verification Gate",
      "entry": "seller.registration_submitted",
      "factories": ["F244", "F246"],
      "fabricHint": {
        "F244": "DATABASE_PG_PRIMARY + DATABASE_ES_SECONDARY + QUEUE",
        "F246": "AI_ENGINE_MULTI_MODEL + DATABASE_PG + QUEUE"
      },
      "enginePrimitives": ["EP-1"],
      "nextOnSuccess": "listing-moderation",
      "nextOnFailure": "seller-kyc-rejected"
    },
    {
      "stepId": "listing-moderation",
      "taskType": "T84",
      "name": "Listing Moderation Saga",
      "entry": "listing.submit_request",
      "prerequisite": "T83.status == APPROVED",
      "factories": ["F245", "F246", "F255"],
      "fabricHint": {
        "F245": "DATABASE_ES_PRIMARY + DATABASE_PG_SECONDARY",
        "F246": "AI_ENGINE_MULTI_MODEL + DATABASE_PG",
        "F255": "DATABASE_REDIS + DATABASE_ES + DATABASE_PG"
      },
      "bfaChecks": ["CF-64", "CF-74", "CF-75"],
      "nextOnSuccess": "discovery-ranking",
      "nextOnFailure": "listing-rejected",
      "nextOnHumanReview": "listing-pending-review"
    },
    {
      "stepId": "discovery-ranking",
      "taskType": "T90",
      "name": "Marketplace Discovery Ranking",
      "entry": "buyer.search_request",
      "factories": ["F254", "F255", "F245"],
      "fabricHint": {
        "F254": "DATABASE_ES_PRIMARY + RAG_FABRIC_READONLY",
        "F255": "DATABASE_REDIS + DATABASE_ES",
        "F245": "DATABASE_ES"
      },
      "bfaChecks": ["CF-75", "CF-76", "CF-77"],
      "nextOnSuccess": "cart-order-saga",
      "continuousStep": true
    },
    {
      "stepId": "cart-order-saga",
      "taskType": "T85",
      "name": "Cart-to-Order Placement Saga",
      "entry": "buyer.checkout_initiated",
      "factories": ["F247", "F248", "F249", "F250", "F255", "F256", "F257"],
      "fabricHint": {
        "F247": "DATABASE_REDIS_PRIMARY",
        "F248": "DATABASE_PG_PRIMARY + QUEUE_VIA_F257",
        "F249": "DATABASE_PG_PRIMARY + DATABASE_REDIS_SECONDARY + QUEUE_VIA_F257",
        "F250": "DATABASE_REDIS_SOFT + DATABASE_PG_HARD",
        "F255": "DATABASE_REDIS + DATABASE_ES",
        "F256": "DATABASE_REDIS_EP4",
        "F257": "DATABASE_PG_OUTBOX + QUEUE_RELAY"
      },
      "enginePrimitives": ["EP-4", "EP-5"],
      "bfaChecks": ["CF-65", "CF-67", "CF-68", "CF-77"],
      "compensations": ["C4:VoidAuth", "C3:ReleaseReservation", "C2:ReleaseCoupon", "C1:UnlockCart"],
      "nextOnSuccess": "payment-escrow",
      "nextOnFailure": "saga-compensation-complete"
    },
    {
      "stepId": "payment-escrow",
      "taskType": "T86",
      "name": "Payment Escrow Lifecycle Gate",
      "entry": "order.placed",
      "factories": ["F249", "F256", "F257"],
      "fabricHint": {
        "F249": "DATABASE_PG_PRIMARY + DATABASE_REDIS_CACHE + QUEUE_VIA_F257",
        "F256": "DATABASE_REDIS_EP4",
        "F257": "DATABASE_PG_OUTBOX + QUEUE_RELAY"
      },
      "enginePrimitives": ["EP-2", "EP-4", "EP-5"],
      "bfaChecks": ["CF-67", "CF-69", "CF-71"],
      "nextOnShipmentCreated": "fulfillment-fork",
      "nextOnTimeout": "payment-void-compensation"
    },
    {
      "stepId": "fulfillment-fork",
      "taskType": "T87",
      "name": "Order Fulfillment Fork",
      "entry": "order.confirmed",
      "factories": ["F248", "F250", "F251", "F256", "F257"],
      "fabricHint": {
        "F248": "DATABASE_PG_PRIMARY + QUEUE_VIA_F257",
        "F250": "DATABASE_REDIS + DATABASE_PG",
        "F251": "QUEUE_REDIS_STREAMS_PRIMARY + DATABASE_PG",
        "F256": "DATABASE_REDIS_EP4",
        "F257": "DATABASE_PG_OUTBOX + QUEUE_RELAY"
      },
      "enginePrimitives": ["EP-2", "EP-4", "EP-5"],
      "bfaChecks": ["CF-66", "CF-69"],
      "nextOnDelivery": "dispute-window",
      "nextOnSlaTimeout": "fulfillment-compensation"
    },
    {
      "stepId": "dispute-window",
      "taskType": "T88",
      "name": "Dispute Resolution Arbitration Gate",
      "entry": "buyer.dispute_opened OR dispute.auto_escalate",
      "optional": true,
      "factories": ["F252", "F249", "F248", "F256"],
      "fabricHint": {
        "F252": "DATABASE_PG_PRIMARY + AI_ENGINE + QUEUE",
        "F249": "DATABASE_PG + QUEUE_VIA_F257",
        "F248": "DATABASE_PG",
        "F256": "DATABASE_REDIS_EP4"
      },
      "enginePrimitives": ["EP-2", "EP-4"],
      "bfaChecks": ["CF-70", "CF-71", "CF-73", "CF-77"],
      "nextOnNoDispute": "payout-release",
      "nextOnDisputeResolved": "payout-release"
    },
    {
      "stepId": "payout-release",
      "taskType": "T89",
      "name": "Seller Payout Release Gate",
      "entry": "EP-2_timer_fired OR dispute.decided",
      "factories": ["F253", "F248", "F256", "F257"],
      "fabricHint": {
        "F253": "DATABASE_PG_PRIMARY + QUEUE_VIA_F257 + DATABASE_REDIS_CACHE",
        "F248": "DATABASE_PG",
        "F256": "DATABASE_REDIS_EP4",
        "F257": "DATABASE_PG_OUTBOX + QUEUE_RELAY"
      },
      "enginePrimitives": ["EP-2", "EP-4", "EP-5"],
      "bfaChecks": ["CF-70", "CF-73", "CF-77"],
      "terminal": true
    }
  ],
  "freedomConfig": {
    "namespace": "marketplace",
    "configKeys": [
      "marketplace.kyc.required_document_types",
      "marketplace.kyc.human_review_sla_hours",
      "marketplace.cart.item.ttl_seconds",
      "marketplace.inventory.soft_reservation.ttl_seconds",
      "marketplace.payment.capture_timing",
      "marketplace.payment.authorization_hold_days",
      "marketplace.payout.protection_window_days",
      "marketplace.payout.schedule",
      "marketplace.fulfillment.seller_ship_deadline_hours",
      "marketplace.dispute.seller_response_hours",
      "marketplace.dispute.evidence_window_hours",
      "marketplace.search.ranking_weights",
      "marketplace.ui.payment_providers",
      "marketplace.ui.locale_config",
      "marketplace.ui.checkout_steps_definition",
      "marketplace.ui.search_facets",
      "marketplace.promotions.sponsored_positions"
    ]
  },
  "bfaRegistration": {
    "entities": ["Seller", "Listing", "ModerationCase", "Cart", "InventoryReservation",
                 "Order", "Payment", "Shipment", "DisputeCase", "SellerPayout",
                 "IdempotencyKey", "OutboxEvent"],
    "eventNamespace": "marketplace.*",
    "conflictRules": ["CF-64", "CF-65", "CF-66", "CF-67", "CF-68", "CF-69", "CF-70",
                      "CF-71", "CF-72", "CF-73", "CF-74", "CF-75", "CF-76", "CF-77"]
  }
}
```

---

# FLOW-08 TASK TYPE SUMMARY

| Task | Name | Archetype | IRs | QGs | AF Cells | Factories |
|------|------|-----------|-----|-----|----------|-----------|
| T83 | Seller KYC Verification Gate | LIFECYCLE | 8 | 8 | 11 | F244, F246 |
| T84 | Listing Moderation Saga | ORCHESTRATION | 8 | 8 | 11 | F245, F246, F255 |
| T85 | Cart-to-Order Placement Saga | ORCHESTRATION | 8 | 8 | 11 | F247, F248, F249, F250, F255, F256, F257 |
| T86 | Payment Escrow Lifecycle Gate | LIFECYCLE | 8 | 8 | 11 | F249, F256, F257 |
| T87 | Order Fulfillment Fork | ORCHESTRATION | 8 | 8 | 11 | F248, F250, F251, F256, F257 |
| T88 | Dispute Resolution Arbitration Gate | ORCHESTRATION | 8 | 8 | 11 | F252, F249, F248, F256 |
| T89 | Seller Payout Release Gate | LIFECYCLE | 8 | 8 | 11 | F253, F248, F256, F257 |
| T90 | Marketplace Discovery Ranking | COMPUTATION | 8 | 8 | 11 | F254, F255, F245 |

**Totals: 8 task types, 64 iron rules, 64 quality gates, 88 AF station cells, 1 flow template**

---

## MERGE:P2 STATE SAVE
```
MERGE:P2 = COMPLETE
Target: TASK_TYPES_CATALOG_MERGED.md
Added: T83–T90 (Family 27 / FLOW-08, 8 full-format engine contracts)
Added: AF Station Map 11×8 = 88 cells (FLOW-08)
Added: Flow Template 18 (giant-shop-marketplace-v1 JSON with fabricHint + freedomConfig)
Added: Task Type Summary Table (64 IRs, 64 QGs, 88 AF cells)
System: 27 families, T1-T90, 18 flow templates
Next: MERGE:P3 → V62_BFA_STRESS_TEST_MERGED.md (CF-64–CF-77 + ST-31–ST-38)
```
