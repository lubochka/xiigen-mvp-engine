# FLOW-08 — GIANT SHOP PLATFORMS
## XIIGen Engine Extension — Master Execution Plan
## Date: 2026-02-26 | Status: PLAN COMPLETE ✅ | Save Point: PLAN:P0

---

# § 0 — SYSTEM STATE BEFORE FLOW-08

```
PRE-FLOW-08 TOTALS (from SESSION_STATE_MERGE.md / FLOW-07 FINAL):
  Factories:       F1–F243   (26 families)
  Task Types:      T1–T82    (17 flow templates)
  BFA Rules:       CF-1–CF-63
  Stress Tests:    ST-1–ST-30
  Design Records:  DR-1–DR-20
  Design Decisions:DD-1–DD-20
  Skill Patterns:  SK-1–SK-28
  Templates:       1–17
  Engine Primitives: EP-1 (State Machine), EP-2 (Durable Timer), EP-3 (Card Schema)
  DNA Patterns:    DNA-1–DNA-8
  DNA Compliance:  604/604

NEXT AVAILABLE NUMBERS:
  Factory: F244   Task Type: T83   BFA Rule: CF-64   Stress Test: ST-31
  Design Record: DR-21   Design Decision: DD-21   Skill: SK-29   Template: 18
```

---

# § 1 — NO-CODE EXPLANATION (WHAT WE ARE BUILDING)

## The Domain: Giant Shop Platforms

FLOW-08 extends the XIIGen engine to generate an **Amazon/AliExpress-class marketplace platform**. This is not one flow — it is a **domain pack** of six interconnected flows that the engine must know how to generate:

1. **Seller Lifecycle** — KYC verification, store setup, performance tracking
2. **Product Catalog + Moderation** — listing lifecycle, AI content screening, policy enforcement
3. **Discovery + Cart** — search/ranking/personalization, cart state, quote generation
4. **Order + Payment Saga** — the most complex flow: escrow-style payment, inventory reservation, multi-step compensation chain
5. **Fulfillment + Logistics** — shipment creation, carrier tracking, delivery confirmation
6. **Dispute + Payout** — buyer protection window, arbitration, refund execution, seller payout release

## What is Genuinely New vs What the Engine Already Has

The engine already knows how to generate services that use DATABASE FABRIC, QUEUE FABRIC, AI ENGINE FABRIC, and RAG FABRIC through factory interfaces. FLOW-06 gave us marketplace listing creation. FLOW-07 gave us feed injection and connection graphs.

**FLOW-08 introduces three things the engine has NEVER seen before:**

### New #1 — Saga-Grade Long-Running Transactions
Every prior flow had steps lasting seconds. The Order Saga can span days: authorize payment → reserve inventory → create shipment (minutes-to-hours) → confirm delivery (days) → release payout (after protection window expires). The engine must know how to generate flows with **explicit compensation chains** — if step 4 of 7 fails, what undoes steps 1, 2, and 3? This is the **Saga Pattern**, and the engine needs EP-4 (Idempotency Key Registry) to make it safe under retries.

### New #2 — Transactional Outbox
Every prior flow published events to the queue after writing to the database. In a payment flow this is fatal: if the DB write succeeds but the event publish fails, you have money captured with no fulfillment triggered. EP-5 (Transactional Outbox Relay) solves this by writing events into the same database transaction as the domain state change, then a background relay publishes them to Redis Streams. This is a new engine primitive, not a new factory.

### New #3 — Two-Actor Role Isolation (Buyer + Seller)
Every prior flow had one actor type. Marketplace flows have **two independent principals**: a buyer (browsing, placing orders, filing disputes) and a seller (listing, fulfilling, receiving payouts). The BFA must detect cross-actor conflicts: can a seller cancel their own buyer's order? Can a buyer's dispute block a seller's pending payout? These role-aware conflict rules are new to the engine's BFA vocabulary.

---

# § 2 — PLAN VALIDATION AGAINST BASIC PROMPT REQUIREMENTS

```
REQUIREMENT → COVERAGE CHECK

✅  NEW FACTORY INTERFACES registered with fabric resolution
    Covered by: F244–F257 (Family 27, 14 factories), each maps to a named FABRIC

✅  NEW ENGINE CONTRACTS (full format — not stubs)
    Covered by: T83–T90 (8 task types, full contract format with IR + QG each)

✅  AF STATION MAPPING for the new flow
    Covered by: 11×8 AF map in Phase 2 output

✅  BFA CROSS-FLOW VALIDATION
    Covered by: CF-64–CF-77 (14 rules), including FLOW-01 through FLOW-07 conflict checks

✅  FLOW TEMPLATE (DAG the engine generates)
    Covered by: Template 18 — giant-shop-marketplace-v1 (JSON DAG)

✅  GENIE DNA COMPLIANCE
    Covered by: All 14 factories comply DNA-1–DNA-8 + new DNA-9 (Idempotency-First)

✅  FABRIC-FIRST UI
    Covered by: DR-24 (Marketplace UI Fabric Contract) — zero platform-specific values

✅  BACKWARD COMPATIBILITY
    Covered by: CF-64–CF-77 explicitly test no regression against T1–T82, F1–F243

✅  ENGINE PRIMITIVES
    Covered by: EP-4 (Idempotency Key Registry), EP-5 (Transactional Outbox Relay)

✅  MULTI-TENANT BRIDGE ISOLATION
    Covered by: DR-22 (Tenant Bridge Isolation for Marketplace), DD-21–DD-29
```

**VALIDATION RESULT: All 10 basic prompt requirements COVERED. Plan is complete.**

---

# § 3 — POSITIVE AND NEGATIVE EXAMPLES

## POSITIVE EXAMPLE — What a correct FLOW-08 engine contract looks like

```
TASK TYPE: T85 — Cart-to-Order Placement Saga
ARCHETYPE: ORCHESTRATION
ENTRY: Fires after buyer confirms checkout (HTTP POST /orders/place via DynamicController)
PURPOSE: Execute multi-step saga: cart validation → inventory reservation →
         payment authorization → order confirmation → fulfillment trigger.
         Compensate (LIFO) on any step failure.
DISTINCT FROM: T33 (2-way convergence, no compensation chain),
               T40 (3-way join gate, no payment steps)
FACTORY DEPENDENCIES:
  F247:ICartStateService, F249:IPaymentEscrowService,
  F250:IInventoryReservationService, F248:IOrderManagementService,
  F256:IIdempotencyKeyRegistry, F257:ITransactionalOutboxRelay
  — ALL resolved via CreateAsync(), config-first routing
FABRIC RESOLUTION:
  F247 → DATABASE FABRIC (Redis) — cart state is ephemeral/TTL
  F249 → DATABASE FABRIC (PG) + QUEUE FABRIC — payment state is durable + event-driven
  F250 → DATABASE FABRIC (Redis+PG) — soft reservation in Redis, hard in PG
  F248 → DATABASE FABRIC (PG) + QUEUE FABRIC — OMS is durable + event-driven
  F256 → DATABASE FABRIC (Redis) — idempotency keys with TTL
  F257 → DATABASE FABRIC (PG) + QUEUE FABRIC — outbox rows → Redis Streams relay
AF CONFIGURATION:
  AF-2 Planning: decompose into 5 saga steps + 4 compensation paths
  AF-4 RAG: SK-30 (Saga Compensation Chain); SK-31 (Idempotency Key Gate)
  AF-7 Compliance: enforce DNA-1 (no CartDto/OrderDto typed models),
                   DNA-9 (payment step MUST carry idempotency key via F256)
  AF-8 Security: BOLA check — buyerId in token must match cart.buyerId
  AF-9 Judge: all 8 iron rules pass + all 8 quality gates pass
BFA VALIDATION: CF-64, CF-65, CF-68 (inventory cross-flow), CF-71 (payment escrow)
MACHINE/FREEDOM:
  MACHINE (fixed by engine): saga step order, compensation LIFO order,
                              idempotency key enforcement
  FREEDOM (admin configurable): payment capture timing (on shipment vs on delivery),
                                 inventory hold duration TTL, partial fill policy
IRON RULES (8):
  IR-83-1: Every payment step MUST carry idempotency key from F256.GetOrCreateAsync()
  IR-83-2: Compensation MUST execute in LIFO order (NEVER skip a step)
  IR-83-3: F257 outbox write MUST be atomic with domain state change (same PG transaction)
  IR-83-4: CartState MUST be locked (Redis SETNX) before reading to prevent race
  IR-83-5: InventoryReservation expiry MUST use EP-2 Durable Timer (not in-process)
  IR-83-6: No typed models — ParseDocument throughout (DNA-1)
  IR-83-7: Scope isolation — tenantId on every DB operation (DNA-5)
  IR-83-8: DynamicController only — no CartController or OrderController (DNA-6)
QUALITY GATES (8): ...
```

## NEGATIVE EXAMPLE — What a WRONG engine extension looks like

```
❌ BAD: "Create an OrderService that imports PostgresOrderRepository,
        calls OpenAI to validate the cart, and returns an OrderDto"
WHY BAD:
  - Imports PostgresOrderRepository directly → violates DATABASE FABRIC
    (must be IOrderManagementService via CreateAsync(), not a direct import)
  - Calls OpenAI directly → violates AI ENGINE FABRIC
    (must be IAiProvider.GenerateAsync(), never openai.chat())
  - Returns OrderDto → violates DNA-1 (no typed models, use ParseDocument)
  - No idempotency key → violates DNA-9 (payment operations must use EP-4)
  - No compensation chain defined → not a Saga, just a function call

❌ BAD: "Task type T85 — places orders (resolves inventory and payment)"
WHY BAD:
  - One-line stub, not a full engine contract
  - Missing ARCHETYPE, FACTORY DEPENDENCIES, FABRIC RESOLUTION,
    AF CONFIGURATION, BFA VALIDATION, IRON RULES, QUALITY GATES
  - Basic prompt explicitly forbids one-line stubs: "full engine contract format required"

❌ BAD: "Add a CheckoutController with endpoints /cart/add, /cart/checkout"
WHY BAD:
  - Violates DNA-6: no entity-specific controllers
  - Must be DynamicController with fabric-driven routing
  - URL is a FREEDOM config value, not hardcoded in the controller

❌ BAD: "Payment service uses tenant_id = userId since all users are separate"
WHY BAD:
  - Violates DNA-5: scope isolation requires explicit tenantId from auth context
  - UserId ≠ TenantId in multi-tenant bridge isolation model (DR-22)
```

---

# § 4 — WHAT FLOW-08 ADDS TO THE ENGINE (INVENTORY)

## New Engine Primitives (2)

| ID | Name | Purpose | Layer |
|----|------|---------|-------|
| EP-4 | Idempotency Key Registry | Assigns, stores (Redis TTL), and validates idempotency keys for all non-idempotent saga operations. Prevents double-charge, double-refund, double-payout. | FABRIC |
| EP-5 | Transactional Outbox Relay | Writes domain events into the same DB transaction as state changes; background relay publishes to Queue Fabric. Eliminates "publish after commit" dual-write failure. | FABRIC |

## New Factory Family: Family 27 — Giant Shop Marketplace Core (F244–F257)

| Factory | Interface | Primary Fabric | Secondary Fabric | Key Domain |
|---------|-----------|----------------|-----------------|------------|
| F244 | ISellerAccountService | DB(PG) | DB(ES), Queue | Seller KYC, store profile |
| F245 | IProductCatalogService | DB(ES) | DB(PG), AI Engine | PIM, variants, attributes |
| F246 | IListingModerationService | AI Engine (Multi-model) | DB(PG), Queue | Content screening, policy |
| F247 | ICartStateService | DB(Redis) | DB(PG) | Cart, quote, TTL state |
| F248 | IOrderManagementService | DB(PG) | Queue, Flow Engine | OMS lifecycle, cancellation |
| F249 | IPaymentEscrowService | DB(PG) | Queue, DB(Redis) | Auth/capture/escrow/release |
| F250 | IInventoryReservationService | DB(Redis+PG) | Queue | Soft/hard reservations |
| F251 | IFulfillmentOrchestrationService | Queue(Redis Streams) | DB(PG) | Shipments, carrier tracking |
| F252 | IDisputeArbitrationService | DB(PG) | AI Engine, Queue | Disputes, evidence, decisions |
| F253 | ISellerPayoutService | DB(PG) | Queue, DB(Redis) | Payout schedule, holds, fees |
| F254 | IMarketplaceSearchService | DB(ES) | RAG Fabric | Search, ranking, personalization |
| F255 | IPromotionsRulesEngine | DB(Redis+ES) | DB(PG) | Coupons, flash deals, pricing |
| F256 | IIdempotencyKeyRegistry | DB(Redis) | — | EP-4 factory interface |
| F257 | ITransactionalOutboxRelay | DB(PG) | Queue | EP-5 factory interface |

**Total: 14 factories, Family 27**

## New Task Types (T83–T90)

| ID | Name | Archetype | Factories | Domain |
|----|------|-----------|-----------|--------|
| T83 | Seller KYC Verification Gate | LIFECYCLE | F244, F246 | Onboarding |
| T84 | Listing Moderation Saga | ORCHESTRATION | F245, F246, F255 | Catalog |
| T85 | Cart-to-Order Placement Saga | ORCHESTRATION | F247, F248, F249, F250, F256, F257 | Commerce core |
| T86 | Payment Escrow Lifecycle Gate | LIFECYCLE | F249, F256, F257 | Payments |
| T87 | Order Fulfillment Fork | ORCHESTRATION | F248, F250, F251, F257 | Fulfillment |
| T88 | Dispute Resolution Arbitration Gate | ORCHESTRATION | F252, F249, F248, F256 | Trust |
| T89 | Seller Payout Release Gate | LIFECYCLE | F253, F248, F257, F256 | Payouts |
| T90 | Marketplace Discovery Ranking | COMPUTATION | F254, F255, F245 | Discovery |

## New BFA Conflict Rules (CF-64–CF-77) — 14 rules

| Rule | Cross-Flow Conflict Being Checked |
|------|----------------------------------|
| CF-64 | Seller KYC pending → BLOCK listing submission (F244 ↔ F245) |
| CF-65 | Cart reservation TTL → SYNC with inventory soft-reservation TTL (F247 ↔ F250) |
| CF-66 | Order in CONFIRMED state → BLOCK seller from delisting (F248 ↔ F245) |
| CF-67 | Payment AUTHORIZED → MUST NOT duplicate-authorize (F249 ↔ F256 idempotency) |
| CF-68 | Inventory HARD_RESERVED → BLOCK competing cart reservation (F250 cross-buyer) |
| CF-69 | Fulfillment SHIPMENT_CREATED → TRIGGER payment capture (F251 ↔ F249) |
| CF-70 | Dispute OPENED → FREEZE seller payout for affected order (F252 ↔ F253) |
| CF-71 | Refund EXECUTED → RELEASE inventory reservation if unfulfilled (F249 ↔ F250) |
| CF-72 | Listing SUSPENDED → CANCEL open orders for that listing (F245 ↔ F248) |
| CF-73 | Seller payout FROZEN → NOTIFY open dispute timeline extension (F253 ↔ F252) |
| CF-74 | FLOW-06 (Marketplace Publishing F225-F233) ↔ FLOW-08 F245 — namespace isolation for listing entities |
| CF-75 | FLOW-05 (Feed F173) ↔ FLOW-08 F254 — discovery feed MUST NOT expose unpublished listings |
| CF-76 | FLOW-07 (F234 connection graph) ↔ FLOW-08 F254 — social signals in ranking are read-only (no write-back) |
| CF-77 | Cross-tenant order attempt → BUILD FAILURE (tenantId isolation for all marketplace entities) |

## New DNA Pattern: DNA-9

```
DNA-9 — IDEMPOTENCY-FIRST
Applies to: Every factory method that creates, modifies, or deletes financial state
            (payments, refunds, payouts, reservations) and any factory method
            that sends a message/event with external side effects.
Rule: MUST call F256:IIdempotencyKeyRegistry.GetOrCreateAsync(operationKey, ttl)
      BEFORE executing the operation. If key already exists and operation was
      COMPLETED → return cached result. If key exists and operation is IN_PROGRESS
      → return 409 Conflict (duplicate in flight). New key → proceed and mark.
Iron Rule: Any financial factory method without idempotency key call = BUILD FAILURE.
Evidence: Prevents double-charge, double-refund, double-payout under saga retries.
```

## New Skill Patterns (SK-29–SK-36)

| Skill | Name | Reused By |
|-------|------|-----------|
| SK-29 | Seller KYC Lifecycle | T83, F244 |
| SK-30 | Saga Compensation Chain | T85, T86, T87, T88, T89 |
| SK-31 | Idempotency Key Gate | T85, T86, T88, T89 — all financial tasks |
| SK-32 | Transactional Outbox Write | T86, T87, T89 — all outbox-publishing tasks |
| SK-33 | Listing Moderation Pipeline | T84, F246 |
| SK-34 | Cart-to-Order State Machine | T85, F247, F248 |
| SK-35 | Dispute Evidence Collection | T88, F252 |
| SK-36 | Marketplace Discovery Ranking | T90, F254, F255 |

## New Design Records (DR-21–DR-26)

| DR | Decision | Why |
|----|----------|-----|
| DR-21 | Saga orchestration over choreography for Order flow | Debuggability + explicit compensations required for financial flows |
| DR-22 | Multi-tenant bridge isolation for marketplace entities | Pooled default + schema-per-tenant graduation for enterprise sellers |
| DR-23 | Idempotency key TTL = 24h for payment operations | Covers retry windows without unbounded Redis memory growth |
| DR-24 | Marketplace UI Fabric Contract — zero platform-specific values | Fabric-first UI per basic prompt requirement |
| DR-25 | Transactional Outbox over dual-write for all financial events | Eliminates payment-confirmed-but-fulfillment-not-triggered class of bug |
| DR-26 | Buyer/Seller role isolation in BFA conflict rules | Two-actor model requires explicit cross-actor conflict detection |

## New Flow Template: Template 18 — giant-shop-marketplace-v1

The DAG the engine generates. Steps: T83 (seller verify) → T84 (listing moderate) →
T90 (discovery index) → T85 (order saga) → T86 (escrow gate) → T87 (fulfillment fork) →
T88 (dispute window) → T89 (payout release). Each step resolved via CreateAsync().

---

# § 5 — PHASED EXECUTION PLAN

Each phase is sized for 15–45 minutes with a save point. Recovery from any phase = re-read the session state file and re-run only that phase's section.

```
PHASE 0 — This document (PLAN:P0) ✅
PHASE 1 — Factory Definitions (F244–F257 + EP-4 + EP-5 + DR-21–DR-26 + DNA-9)
PHASE 2 — Task Type Contracts (T83–T90 full format + AF Map 11×8 + Template 18)
PHASE 3 — BFA Rules + Stress Tests (CF-64–CF-77 + ST-31–ST-38)
PHASE 4 — Index + Skills (DD-21–DD-29 + SK-29–SK-36 + Concept Map + Event Chain)
PHASE 5 — Validation (all checks: backward compat, DNA-9, sequence continuity)
PHASE 6 — Session State Final
```

---

# § 6 — PHASE DETAIL (recovery-ready)

## PHASE 1 — Factory Definitions
**Save Point: MERGE:P1**
**Output File: FLOW08_P1_FACTORIES.md**
**Target merge: ENGINE_ARCHITECTURE_MERGED.md** (append after Family 26 section)
**Duration estimate: 35–45 min**
**Contents:**
- EP-4 spec (IIdempotencyKeyRegistry via F256, Redis TTL mechanism)
- EP-5 spec (ITransactionalOutboxRelay via F257, PG outbox table + relay worker)
- F244–F257 full specifications (interface contract, methods, fabric resolution, DNA compliance)
- DR-21–DR-26 design records
- DNA-9 full specification
- Family 27 summary table
- Integration changelog entry

**Recovery:** "Continue FLOW-08 Phase 1" → generate F244–F257 in full contract format

---

## PHASE 2 — Task Type Contracts
**Save Point: MERGE:P2**
**Output File: FLOW08_P2_TASK_TYPES.md**
**Target merge: TASK_TYPES_CATALOG_MERGED.md** (append after Family 26 / FLOW-07 section)
**Duration estimate: 35–45 min**
**Contents:**
- T83–T90 full engine contracts (ARCHETYPE, FACTORY DEPENDENCIES, FABRIC RESOLUTION,
  AF CONFIGURATION, BFA VALIDATION, MACHINE/FREEDOM, IRON RULES×8, QUALITY GATES×8 each)
- AF Station Map 11×8 = 88 cells (all 11 AF stations × 8 task types)
- Flow Template 18 — giant-shop-marketplace-v1 (JSON DAG with 8 steps + fabricHint)
- Task Type Summary table

**Recovery:** "Continue FLOW-08 Phase 2" → generate T83–T90 in full contract format

---

## PHASE 3 — BFA Rules + Stress Tests
**Save Point: MERGE:P3**
**Output File: FLOW08_P3_BFA.md**
**Target merge: V62_BFA_STRESS_TEST_MERGED.md** (append after FLOW-07 section)
**Duration estimate: 25–35 min**
**Contents:**
- CF-64–CF-77 full conflict rule specifications (with formal proofs)
- ST-31–ST-38 stress test scenarios (8 stress tests)
- BFA registration document for FLOW-08 entities/events/APIs

**Recovery:** "Continue FLOW-08 Phase 3" → generate CF-64–CF-77 + ST-31–ST-38

---

## PHASE 4 — Index + Skill Patterns
**Save Point: MERGE:P4**
**Output File: FLOW08_P4_INDEX_SKILLS.md**
**Target merge:** UNIFIED_SOURCE_INDEX_MERGED.md + SKILLS_FACTORY_RAG_MERGED.md
**Duration estimate: 20–30 min**
**Contents:**
- DD-21–DD-29 design decisions
- SK-29–SK-36 skill pattern specifications (each with: pattern name, applicable task types,
  .NET 9 interface skeleton, key method signatures, AF-4 RAG retrieval hints)
- Concept map (FLOW-08 domain entities + relationships)
- Full event chain (SellerRegistered → ListingSubmitted → ListingPublished →
  OrderPlaced → PaymentAuthorized → InventoryReserved → ShipmentCreated →
  PaymentCaptured → OrderDelivered → DisputeWindow → PayoutReleased)

**Recovery:** "Continue FLOW-08 Phase 4" → generate DD-21–DD-29 + SK-29–SK-36

---

## PHASE 5 — Validation
**Save Point: MERGE:P5**
**Output File: FLOW08_VALIDATION.md**
**Duration estimate: 15–20 min**
**Contents:**
- Backward compatibility check: T1–T82 and F1–F243 unchanged
- Sequence continuity: F244→F257 (no gaps), T83→T90 (no gaps), CF-64→CF-77 (no gaps)
- DNA-9 compliance: all 14 factories annotated
- EP-4/EP-5 integration check: T85, T86, T88, T89 all use F256+F257
- BFA cross-flow: CF-74/CF-75/CF-76 cover FLOW-05/06/07 interactions
- Multi-tenant: DR-22 bridge isolation enforced via CF-77
- AF station coverage: all 8 task types have 11 AF cells populated

**Target: 95/95 checks PASS**

---

## PHASE 6 — Session State Final
**Save Point: MERGE:FINAL**
**Output File: SESSION_STATE_FLOW08_FINAL.md**
**Duration estimate: 10 min**

---

# § 7 — POST-FLOW-08 SYSTEM TOTALS (projected)

| Metric | Pre-FLOW-08 | Post-FLOW-08 | Delta |
|--------|-------------|--------------|-------|
| Factory interfaces | F1–F243 | F1–F257 | +14 |
| Factory families | 26 | 27 | +1 |
| Task types | T1–T82 | T1–T90 | +8 |
| Flow templates | 17 | 18 | +1 |
| BFA conflict rules | CF-1–CF-63 | CF-1–CF-77 | +14 |
| Stress tests | ST-1–ST-30 | ST-1–ST-38 | +8 |
| Design records | DR-1–DR-20 | DR-1–DR-26 | +6 |
| Design decisions | DD-1–DD-20 | DD-1–DD-29 | +9 |
| Skill patterns | SK-1–SK-28 | SK-1–SK-36 | +8 |
| DNA patterns | DNA-1–DNA-8 | DNA-1–DNA-9 | +1 |
| Engine primitives | EP-1/2/3 | EP-1/2/3/4/5 | +2 |
| Iron rules (FLOW-08) | — | 64 | +64 (8×8) |
| Quality gates (FLOW-08) | — | 64 | +64 (8×8) |
| AF station cells (FLOW-08) | — | 88 | +88 (11×8) |

---

# § 8 — FIRST-TIME CAPABILITIES IN FLOW-08

| Capability | Artifact | Why First |
|-----------|----------|-----------|
| Saga compensation chain | T85, T87, SK-30 | All prior flows were fire-and-forget; T85 is the first with explicit LIFO compensation |
| Idempotency key enforcement | EP-4, F256, DNA-9 | No prior flow had payment operations requiring idempotency key guards |
| Transactional outbox | EP-5, F257, SK-32 | All prior flows used dual-write (publish after commit); F257 eliminates this class of bug |
| Two-actor BFA rules | CF-66, CF-70, CF-73, DR-26 | All prior flows had one actor type; marketplace needs buyer vs seller conflict rules |
| Multi-day saga with EP-2 timer gates | T86, T89, DR-23 | Prior EP-2 usage (T82) was periodic; T86/T89 are deadline-triggered after external events |
| AI-powered listing moderation | T84, F246, SK-33 | First use of AI ENGINE FABRIC for compliance/policy decisions (not content generation) |
| Bridge isolation for marketplace tenants | DR-22, CF-77, DD-21 | First explicit multi-tenant isolation model in the engine (all prior flows were single-tenant) |
| Escrow-style payment lifecycle | T86, F249, SK-34 | Prior FLOW-06 had basic payment; T86 introduces hold→capture→release with protection window |

---

# § 9 — MINI-RAG (DOCUMENTS USED TO BUILD THIS PLAN)

For AF-4 retrieval reference during code generation:

| Source Doc | Relevant For |
|-----------|-------------|
| SKILLS_FACTORY_RAG_MERGED.md — Skill 04 (Queue) | F248, F249, F251, F253, F257 queue patterns |
| SKILLS_FACTORY_RAG_MERGED.md — Skill 05 (DB) | F244, F245, F248, F249, F250 database fabric |
| SKILLS_FACTORY_RAG_MERGED.md — Skill 06/07 (AI Engine) | F246 moderation, F252 AI arbitration |
| SKILLS_FACTORY_RAG_MERGED.md — Skill 00b (RAG) | F254 marketplace search ranking |
| SKILLS_FACTORY_RAG_MERGED.md — Skill 08/09 (Flow Engine) | Template 18 DAG definition |
| ENGINE_ARCHITECTURE_MERGED.md — EP-1 (State Machine) | T83 KYC lifecycle, T86 escrow lifecycle |
| ENGINE_ARCHITECTURE_MERGED.md — EP-2 (Durable Timer) | T86 protection window, T89 payout delay |
| ENGINE_ARCHITECTURE_MERGED.md — F234 (Connection Graph) | SK-36 social signals in discovery ranking |
| TASK_TYPES_CATALOG_MERGED.md — T40 (3-Way Join) | T87 Fulfillment Fork pattern |
| TASK_TYPES_CATALOG_MERGED.md — T77 (Connection Lifecycle) | T83 KYC Lifecycle pattern |
| V62_BFA_STRESS_TEST_MERGED.md — CF-52 through CF-63 | CF-74–CF-77 backward compat checks |
| 16_-_giant_shop_platforms_deep_research_genie.md | Domain entity list, state machine shapes |
| 16_-_giant_shop_platforms_deep_research_genie_multi_tenant.md | DR-22 bridge isolation, DD-21–DD-24 |
| multi-tenant-support.md | CF-77 cross-tenant conflict rule, tenant control plane |

---

# § 10 — RECOVERY COMMANDS

```
"Start FLOW-08 Phase 1"   → Generate F244–F257 + EP-4 + EP-5 + DR-21–DR-26 + DNA-9
"Start FLOW-08 Phase 2"   → Generate T83–T90 + AF Map 11×8 + Template 18
"Start FLOW-08 Phase 3"   → Generate CF-64–CF-77 + ST-31–ST-38 + BFA registration
"Start FLOW-08 Phase 4"   → Generate DD-21–DD-29 + SK-29–SK-36 + event chain
"Start FLOW-08 Phase 5"   → Run validation (target 95/95 PASS)
"Start FLOW-08 Phase 6"   → Generate SESSION_STATE_FLOW08_FINAL.md

"Show FLOW-08 plan"       → This file (FLOW08_MASTER_EXECUTION_PLAN.md)
"Show FLOW-08 inventory"  → § 4 (factories, tasks, BFA, DNA, skills summary)
"Show FLOW-08 examples"   → § 3 (positive + negative examples)
"Show FLOW-08 validation" → § 2 (plan validation against basic prompt)

"Start FLOW-09"           → Prerequisite check: F1–F257, T1–T90, CF-1–CF-77
                            Next: F258, T91, CF-78, ST-39, SK-37, DR-27, DD-30, Template 19
```

---

## PLAN:P0 SAVE POINT ✅

```
PLAN:P0 = COMPLETE
Status: Master plan documented, validated, ready for phase execution
Approach: 6 phases, each 15–45 min, independent recovery point
New: Family 27 (F244-F257), T83-T90, CF-64-CF-77, EP-4/EP-5, DNA-9
     DR-21-DR-26, DD-21-DD-29, SK-29-SK-36, Template 18
Domain: Giant Shop Platforms (Amazon/AliExpress class marketplace)
Backward compat: 0 breaking changes to T1-T82, F1-F243
Next: "Start FLOW-08 Phase 1"
```
