# FLOW-20 TASK TYPES CATALOG
## Sponsored Content + Graph API + Deep Search + Multi-Tenant Isolation
## Task Types T179–T198 (20 full engine contracts)
## Save Point: FLOW20:P2:TASKS ✅

---

```
Pre-FLOW-20: T1–T178 (178 total)
Post-FLOW-20: T1–T198 (198 total, +20)

All task types follow the full engine contract format:
ARCHETYPE | ENTRY | PURPOSE | DISTINCT FROM
FACTORY DEPENDENCIES | FABRIC RESOLUTION
AF CONFIGURATION | BFA VALIDATION
MACHINE / FREEDOM | IRON RULES | QUALITY GATES
```

---

## T179 — Graph Read Gate

```
TASK TYPE: T179 — Graph Read Gate
ARCHETYPE: REQUEST_RESPONSE (synchronous, <200ms p99)
ENTRY: GET /{version}/{nodeId}/{edge}?fields=... with Bearer token
       F578 TenantEdgeResolver already resolved tenantId into scope context
PURPOSE: Execute a graph read: validate request, plan query, enforce permissions,
         fan out to domain services, return authorized partial or full result set.
DISTINCT FROM:
  T180 (Graph Write) — T179 is read-only, no mutation events emitted
  T191 (Schema Field Projection Gate) — T191 resolves projection metadata;
        T179 executes the full read pipeline using T191 output

FACTORY DEPENDENCIES: F467, F468, F469, F473, F474, F488, F489, F490, F491
FABRIC RESOLUTION:
  F467 → DATABASE FABRIC → Elasticsearch (version manifest)
  F468 → CORE FABRIC (request normalisation)
  F469 → DATABASE FABRIC → Elasticsearch (cursor index)
  F473 → DATABASE FABRIC → Elasticsearch (schema + field-permission)
  F474 → AI ENGINE FABRIC (plan optimisation) + DATABASE FABRIC → ES
  F488 → RAG FABRIC (policy retrieval) + DATABASE FABRIC → ES (audit log)
  F489 → QUEUE FABRIC → Redis Streams (federation fan-out)
  F490 → DATABASE FABRIC → Redis (node cache)
  F491 → DATABASE FABRIC → Redis (edge cache)

AF CONFIGURATION:
  AF-1 Genesis:     Generate graph read service on MicroserviceBase; uses F488 per-node/field
  AF-2 Planning:    S1(version) → S2(normalize) → S3(project fields) → S4(plan) →
                    S5(cache check) → S6(fan-out) → S7(permission filter) → S8(partial-error build)
  AF-3 Prompt Lib:  Graph API read-path domain prompts; partial-auth patterns
  AF-4 RAG:         SK-99 (graph auth pattern), SK-100 (partial-error pattern); T180 (write gate reuse)
  AF-5 Multi-model: Field projection correctness scored across models
  AF-6 Code Review: Verify no typed model returned; Dictionary-only results; allSettled semantics
  AF-7 Compliance:  DNA-1 ParseDocument (no typed GraphNode class), DNA-2 BuildSearchFilter,
                    DNA-3 DataProcessResult, DNA-4 MicroserviceBase, DNA-5 Scope Isolation
  AF-8 Security:    F488 per-node/field auth verified; no field leakage on partial auth
  AF-9 Judge:       Validates all IRON RULES and QUALITY GATES
  AF-10 Merge:      Conservative score on divergence > 10% (DD-97 applied to code quality)
  AF-11 Feedback:   Graph read latency + partial-auth ratio stored for improvement

BFA VALIDATION:
  Gate: Node types must be registered in schema registry (F472) before read pipeline ships
  Gate: No T179 read returns data created by FLOW-13 finance engine without explicit DR-77 config
  Cross-check: GraphRead entities ≠ FLOW-10 CRM entities (different domains — PASS with annotation)
  Cross-check: T179 depth limit config (F466) ≠ conflict with FLOW-08 tenant quota (F581)

MACHINE:
  Version resolution: unknown version → 404-result (never 500)
  Tenant resolution: F578 scope context ALWAYS used; user header tenantId rejected
  Permission decision: F488 per-node per-edge per-field — never per-request only
  Depth limit: F466 FREEDOM config enforced; over-depth request → partial-error (not 400)
  Cache invalidation: write-through (not lazy) for F490/F491

FREEDOM:
  Depth limit per tenant/app tier (F466)
  Pagination page size per app tier (F469)
  Cache TTL per node type (F490)
  Deprecation warning window (F467 — default 90 days)

IRON RULES:
  IR-179-1: F578 tenantId from scope context ONLY. User-supplied tenant header = BUILD FAILURE.
  IR-179-2: F488 called per node, per edge, per field. Single per-request decision = BUILD FAILURE.
  IR-179-3: Partial authorization returns HTTP 200 with errors array, not HTTP 403.
  IR-179-4: F468 normalisation BEFORE F473 projection. Raw path used in projection = BUILD FAILURE.
  IR-179-5: Depth limit violation → partial-error result. Hard rejection (400) = BUILD FAILURE.
  IR-179-6: All factory calls via CreateAsync(). Direct instantiation = BUILD FAILURE.
  IR-179-7: All results DataProcessResult<T>. Exception for permission deny = BUILD FAILURE.
  IR-179-8: F489 fan-out via QUEUE FABRIC only. Direct HTTP to domain services = BUILD FAILURE.

QUALITY GATES (AF-9):
  QG-179-1: Depth limit enforcement verified by integration test (request exceeding limit)
  QG-179-2: Partial-auth format: { data: {...}, errors: [...] } — schema validated
  QG-179-3: F490/F491 cache hit verified for hot node types (popular pages/posts)
  QG-179-4: Tenant isolation — cross-tenant node access returns empty (not error-leaking)
  QG-179-5: F489 allSettled: one domain service timeout = partial result, not total failure
  QG-179-6: F467 deprecation header present in response for deprecated version requests
```

---

## T180 — Graph Write Gate

```
TASK TYPE: T180 — Graph Write Gate
ARCHETYPE: REQUEST_RESPONSE (synchronous, <500ms p99 incl. policy check)
ENTRY: POST/PUT/DELETE /{version}/{nodeId}/{edge} with write scope token
       F578 tenantId in scope context; F480 scope enforcement confirmed write scope
PURPOSE: Execute a graph write: validate scope, check content policy, enforce rate limit,
         write via domain service, emit mutation event for cache invalidation and
         downstream consumption (webhooks, feed, search index).
DISTINCT FROM:
  T179 (Graph Read) — T180 mutates state, emits events, invalidates cache
  T183 (Creative Ingestion) — T183 is ad-specific write with review pipeline;
        T180 is general platform graph write (posts, comments, profile updates)

FACTORY DEPENDENCIES: F467, F468, F478, F480, F488, F490, F491, F493, F494, F496
FABRIC RESOLUTION:
  F467 → DATABASE FABRIC → Elasticsearch (version manifest)
  F468 → CORE FABRIC (request normalisation)
  F478 → DATABASE FABRIC → PG (consent) + QUEUE FABRIC (withdrawal events)
  F480 → DATABASE FABRIC → Redis (scope cache) + ES (scope rules)
  F488 → RAG FABRIC + DATABASE FABRIC → ES (audit)
  F490 → DATABASE FABRIC → Redis (node cache — invalidation on write)
  F491 → DATABASE FABRIC → Redis (edge cache — invalidation on write)
  F493 → DATABASE FABRIC → PG (subscription registry)
  F494 → DATABASE FABRIC → ES (subscription filter index)
  F496 → QUEUE FABRIC + CORE FABRIC (HMAC signing)

AF CONFIGURATION:
  AF-1 Genesis:     Generate graph write service; outbox pattern for mutation events
  AF-2 Planning:    S1(version) → S2(normalize) → S3(scope check) → S4(content policy) →
                    S5(permission check) → S6(rate limit) → S7(write) → S8(cache invalidate) →
                    S9(webhook fan-out)
  AF-3 Prompt Lib:  Graph write + outbox pattern; webhook delivery prompts
  AF-4 RAG:         SK-101 (webhook HMAC pattern); T181 (webhook delivery reuse)
  AF-6 Code Review: Atomic write + cache invalidation; HMAC on all webhook paths
  AF-7 Compliance:  DNA-1–5; DR-69 (HMAC mandatory); no direct cache manipulation post-write
  AF-8 Security:    F480 scope verified before any mutation; write scope never inferred
  AF-9 Judge:       Validates all IRON RULES
  AF-11 Feedback:   Write latency + webhook delivery success rate stored

BFA VALIDATION:
  Gate: Mutation events must not conflict with FLOW-04 post-publishing event schema
  Cross-check: Graph write post.created ≠ FLOW-04 ContentPublished (same domain — flag for dedup)
  Gate: Cache invalidation events do not conflict with FLOW-02 social graph cache keys

MACHINE:
  Scope enforcement: write scope MUST be present; admin cannot override scope requirement
  Mutation event: ALWAYS emitted after successful write for downstream cache + webhooks
  HMAC: ALL webhook deliveries signed — no unsigned delivery path

FREEDOM:
  Rate limit on writes per app/token (F582 FREEDOM config)
  Webhook subscription max per app (F493 FREEDOM config)
  Content policy sensitivity level (F514 FREEDOM config)

IRON RULES:
  IR-180-1: F480 scope check BEFORE any write operation. Write without scope = BUILD FAILURE.
  IR-180-2: F490/F491 cache invalidation MUST fire on successful write. Stale cache = BUILD FAILURE.
  IR-180-3: F496 webhook delivery MUST use HMAC signing. Unsigned dispatch = BUILD FAILURE.
  IR-180-4: Write mutation event via QUEUE FABRIC only. Direct HTTP notify to subscribers = BUILD FAILURE.
  IR-180-5: F478 consent checked for writes that publish to audience. Broadcast without consent = BUILD FAILURE.
  IR-180-6: F488 permission check BEFORE write. No post-write permission rollback = BUILD FAILURE.
  IR-180-7: All results DataProcessResult<T>.
  IR-180-8: All factory calls via CreateAsync().

QUALITY GATES (AF-9):
  QG-180-1: Scope gate verified: token with read-only scope cannot write (integration test)
  QG-180-2: Cache invalidation: node cache miss after successful write (verified by T179 follow-up)
  QG-180-3: Webhook HMAC: subscriber can verify signature with shared secret
  QG-180-4: Mutation event in QUEUE FABRIC within 100ms of write (SLO test)
  QG-180-5: Idempotency: duplicate write with same idempotency key = no second event emitted
  QG-180-6: Rate limit: write beyond quota returns 429 DataProcessResult with Retry-After
```

---

## T181 — Webhook Delivery Orchestrator

```
TASK TYPE: T181 — Webhook Delivery Orchestrator
ARCHETYPE: ORCHESTRATION (event-driven, async, retry-with-backoff)
ENTRY: Mutation event consumed from QUEUE FABRIC (from T180 S9 fan-out)
       F494 filter resolves matching subscriptions
PURPOSE: Deliver platform events to subscribed developer apps with HMAC signature,
         deduplication, retry backoff, DLQ escalation, and delivery audit logging.
DISTINCT FROM:
  T180 (Graph Write) — T180 triggers the event; T181 owns delivery lifecycle
  T198 (Developer Analytics) — T181 logs delivery outcomes; T198 aggregates them

FACTORY DEPENDENCIES: F493, F494, F495, F496, F497, F576
FABRIC RESOLUTION:
  F493 → DATABASE FABRIC → PostgreSQL (subscription registry)
  F494 → DATABASE FABRIC → Elasticsearch (subscription filter index)
  F495 → QUEUE FABRIC → Redis Streams (retry queue, DLQ)
  F496 → QUEUE FABRIC (delivery) + CORE FABRIC (HMAC)
  F497 → DATABASE FABRIC → Redis (SETNX dedup)
  F576 → DATABASE FABRIC → Elasticsearch (developer dashboard aggregate)

AF CONFIGURATION:
  AF-1 Genesis:     Generate delivery orchestrator on MicroserviceBase
  AF-2 Planning:    S1(filter subs) → S2(dedup check) → S3(sign payload) → S4(deliver) →
                    S5(log outcome) → S6(retry schedule if failed) → S7(DLQ if exhausted)
  AF-3 Prompt Lib:  Webhook delivery + retry backoff pattern prompts
  AF-4 RAG:         SK-101 (HMAC delivery pattern); T180 (event schema reuse)
  AF-6 Code Review: Retry idempotency; DLQ after max attempts; no silent drop
  AF-7 Compliance:  DR-69 (HMAC mandatory); DNA-3 DataProcessResult; DNA-5 scope isolation
  AF-8 Security:    HMAC on every delivery; dedup key prevents replay amplification
  AF-9 Judge:       Validates all IRON RULES
  AF-11 Feedback:   Delivery success rate, p99 delivery latency stored

BFA VALIDATION:
  Gate: Webhook event schema compatible with FLOW-04 post events (shared event bus)
  Cross-check: Delivery dedup keys do not collide with FLOW-08 notification dedup keys

MACHINE:
  HMAC: every delivery signed — no exception
  Max attempts: FREEDOM config (default 5); after max → DLQ + FAILED subscription status
  Retry backoff: exponential with jitter (MACHINE formula: 2^n × 1000ms ± 20% jitter)
  Delivery timeout per attempt: 30s (MACHINE — not configurable)

FREEDOM:
  Max retry attempts (default 5)
  Retry window (max delay cap, default 24h)
  Subscription event filter expressions (per-subscription FREEDOM)
  Priority lane assignment per advertiser tier (F517 FREEDOM config)

IRON RULES:
  IR-181-1: DeliverAsync MUST compute HMAC before any HTTP dispatch. No HMAC = BUILD FAILURE.
  IR-181-2: F497 dedup check BEFORE delivery attempt. Duplicate delivery = BUILD FAILURE.
  IR-181-3: F495 retry schedule MUST use exponential backoff. Linear retry = BUILD FAILURE.
  IR-181-4: F495 DLQ after max attempts. Silent drop on exhaustion = BUILD FAILURE.
  IR-181-5: Delivery outcome logged to F576 ALWAYS. Silent success = BUILD FAILURE.
  IR-181-6: All results DataProcessResult<T>.
  IR-181-7: All factory calls via CreateAsync().
  IR-181-8: Subscription FAILED status set after DLQ. No auto-re-enable = BUILD FAILURE.

QUALITY GATES (AF-9):
  QG-181-1: HMAC verification: subscriber test using provided secret succeeds
  QG-181-2: Dedup: same deliveryId delivered twice → second attempt skipped
  QG-181-3: Retry: simulated endpoint 500 → retry with exponential backoff (integration test)
  QG-181-4: DLQ: after max attempts → subscription status = FAILED (state verified)
  QG-181-5: Delivery latency: p99 first attempt < 5s from event ingestion
  QG-181-6: Developer dashboard shows correct delivery success/failure stats
```

---

## T182 — Payment Method Registration Gate

```
TASK TYPE: T182 — Payment Method Registration Gate
ARCHETYPE: VALIDATION (synchronous, stateful, PCI-scoped)
ENTRY: POST /ad-accounts/{accountId}/payment-methods with raw payment instrument
       Caller has billing:write scope (F480 verified)
PURPOSE: Accept payment instrument, tokenize via external vault (never store raw PAN),
         bind tokenized reference to billing account, confirm PCI boundary compliance.
DISTINCT FROM:
  T188 (Spend Billing Gate) — T182 registers the method; T188 charges it
  T195 (Financial Reconciliation) — T195 reconciles charges; T182 is one-time registration

FACTORY DEPENDENCIES: F498, F501, F505, F570
FABRIC RESOLUTION:
  F498 → DATABASE FABRIC → PostgreSQL (ad account validation)
  F501 → DATABASE FABRIC → PostgreSQL (billing account update)
  F505 → DATABASE FABRIC → PostgreSQL (token reference storage, PCI out-of-scope)
  F570 → DATABASE FABRIC → Elasticsearch (audit log)

AF CONFIGURATION:
  AF-1 Genesis:     Generate payment registration service; PCI tokenization boundary enforced
  AF-2 Planning:    S1(scope check) → S2(account validation) → S3(tokenize) → S4(bind) → S5(audit)
  AF-3 Prompt Lib:  PCI tokenization boundary prompts; never log raw card data
  AF-4 RAG:         SK-103 (payment tokenization pattern)
  AF-7 Compliance:  DR-70 (PCI boundary); AF-8 rejects any field named card_number/pan/cvv
  AF-8 Security:    Raw PAN cannot appear in any log, queue event, or stored field
  AF-9 Judge:       Validates all IRON RULES
  AF-11 Feedback:   Tokenization success rate, vault latency stored

BFA VALIDATION:
  Gate: F498 ad account must exist and not be suspended before payment method binding
  Cross-check: Payment token reference format compatible with FLOW-13 finance billing schema

MACHINE:
  Raw card data: NEVER stored, logged, or emitted to any queue
  PCI boundary: F505 is the ONLY service that receives raw payment data
  Tokenization: synchronous — no async tokenization path exists
  Audit log: every payment method registration logged to F570 regardless of outcome

FREEDOM:
  Supported payment instrument types (credit card / wire / invoice) — per account tier
  Multi-payment-method: max number per account (FREEDOM config)

IRON RULES:
  IR-182-1: Raw card data (card_number, CVV, full PAN) NEVER stored. = BUILD FAILURE if found.
  IR-182-2: F505 tokenization BEFORE any storage. Binding without token = BUILD FAILURE.
  IR-182-3: F570 audit log MUST fire on every registration attempt (success or failure).
  IR-182-4: F498 account validation BEFORE tokenization. Orphaned token = BUILD FAILURE.
  IR-182-5: All factory calls via CreateAsync().
  IR-182-6: All results DataProcessResult<T>.
  IR-182-7: Tokenization error → DataProcessResult Error (not HTTP 500).
  IR-182-8: F501 binding update is atomic with token storage. Partial bind = BUILD FAILURE.

QUALITY GATES (AF-9):
  QG-182-1: PCI scan: no log entry or queue event contains card_number/CVV (automated scan)
  QG-182-2: Orphaned token: vault token created but bind fails → cleanup triggered
  QG-182-3: Duplicate registration: same card tokenized twice → second token bound (no raw data)
  QG-182-4: Suspended account: payment method registration rejected with correct error result
  QG-182-5: Audit log: every attempt (success/fail) has matching audit entry in F570
```

---

## T183 — Creative Ingestion Gate

```
TASK TYPE: T183 — Creative Ingestion Gate
ARCHETYPE: VALIDATION (multi-step, async review trigger)
ENTRY: POST /ad-accounts/{accountId}/creatives with asset binary + metadata
       ads:write scope (F480); billing account active (F501)
PURPOSE: Ingest ad creative asset, validate format, dispatch transcoding if needed,
         score quality, auto-classify content, enqueue for review, set initial
         approval status to PENDING (blocking auction eligibility until approved).
DISTINCT FROM:
  T180 (Graph Write) — T180 is general content write; T183 is ad-specific creative
        ingestion with mandatory review pipeline (DD-100)
  T187 (Ad Review Gate) — T183 is ingestion entry point; T187 is the review decision step

FACTORY DEPENDENCIES: F508, F509, F510, F512, F513, F514, F517, F518, F533
FABRIC RESOLUTION:
  F508 → DATABASE FABRIC → ES (metadata) + Object Store (binary)
  F509 → AI ENGINE FABRIC (variant generation)
  F510 → AI ENGINE FABRIC (quality scoring) + DATABASE FABRIC → ES
  F512 → CORE FABRIC (async transcode job)
  F513 → AI ENGINE FABRIC + RAG FABRIC (IAB taxonomy)
  F514 → DATABASE FABRIC → ES (content policy rules, FREEDOM config)
  F517 → QUEUE FABRIC → Redis Streams (review queue)
  F518 → DATABASE FABRIC → PostgreSQL (review decision, append-only)
  F533 → DATABASE FABRIC → Elasticsearch (ad catalog)

AF CONFIGURATION:
  AF-1 Genesis:     Generate creative ingestion service on MicroserviceBase
  AF-2 Planning:    S1(scope) → S2(format validate) → S3(store asset) → S4(transcode if video) →
                    S5(quality score) → S6(tag+classify) → S7(policy check) → S8(set PENDING) →
                    S9(enqueue review)
  AF-3 Prompt Lib:  Creative ingestion + content policy gate prompts
  AF-4 RAG:         SK-110 (creative review gate pattern); T187 (review pipeline reuse)
  AF-5 Multi-model: Quality scoring run across multiple models (DD-97 conservative divergence)
  AF-6 Code Review: PENDING status set before review enqueue; no auction before approval
  AF-7 Compliance:  DNA-1–5; DD-100 (approval before eligibility); IR-183-1 enforced
  AF-8 Security:    No unsigned asset accepted; hash validation on binary upload
  AF-9 Judge:       Validates all IRON RULES
  AF-11 Feedback:   Creative quality scores + review outcome rate stored for model improvement

BFA VALIDATION:
  Gate: F533 catalog update event must not conflict with FLOW-04 content moderation pipeline
  Cross-check: Creative asset IDs not colliding with FLOW-04 media asset namespace
  Gate: Review queue events compatible with existing QUEUE FABRIC consumer group schema

MACHINE:
  Approval status: initial = PENDING. NEVER starts as approved.
  Auction eligibility: BLOCKED until F518 records approved decision (DD-100)
  Content policy: evaluated before review enqueue — prohibited category → REJECTED immediately
  SHA-256 hash: computed on ingestion for deduplication and integrity

FREEDOM:
  Allowed creative formats per placement (FREEDOM config via F532)
  Quality score threshold for expedited vs standard review lane (F517 FREEDOM config)
  Variant auto-generation on/off per account tier (F509 FREEDOM config)

IRON RULES:
  IR-183-1: Initial review status = PENDING. Approved on ingestion = BUILD FAILURE.
  IR-183-2: F514 policy check BEFORE F517 review enqueue. Policy violation = REJECT, not PENDING.
  IR-183-3: F533 catalog updated with PENDING status BEFORE review queue enqueue.
  IR-183-4: F512 transcode dispatched for video assets. Untranscoded video in catalog = BUILD FAILURE.
  IR-183-5: SHA-256 hash computed and stored on every asset ingestion.
  IR-183-6: All results DataProcessResult<T>.
  IR-183-7: All factory calls via CreateAsync().
  IR-183-8: F508 asset store BEFORE F517 review enqueue. Enqueue without stored asset = BUILD FAILURE.

QUALITY GATES (AF-9):
  QG-183-1: Status gate: newly ingested creative has catalog status = PENDING (verified)
  QG-183-2: Policy gate: prohibited category creative rejected before reaching review queue
  QG-183-3: Transcode: video asset has all required format variants before PENDING set
  QG-183-4: Hash: duplicate hash creative identified and linked (not duplicated)
  QG-183-5: Quality score: available in ES before review enqueue (reviewer context enriched)
  QG-183-6: Auction ineligibility: T184 cannot select PENDING creative (integration test)
```

---

## T184 — Ad Auction Orchestrator

```
TASK TYPE: T184 — Ad Auction Orchestrator
ARCHETYPE: ORCHESTRATION (latency-critical, <50ms p99, stateless function)
ENTRY: Ad slot context + viewer context emitted by feed/search service
       F578 tenantId resolved; F525 consent gate confirmed BEFORE this task fires
PURPOSE: Run the full ad auction pipeline: load eligible candidates, compute quality
         scores, apply pricing model, enforce frequency/pacing, determine winner,
         insert into slot via F536, log impression, decrement budget async.
DISTINCT FROM:
  T185 (Impression Attribution) — T185 processes post-auction impression signals;
        T184 is the real-time auction decision
  T190 (Tenant Quota Gate) — T190 enforces platform quotas; T184 is the auction itself

FACTORY DEPENDENCIES: F525, F527, F528, F529, F530, F531, F532, F534, F536, F537, F541, F542, F543
FABRIC RESOLUTION:
  F525 → DATABASE FABRIC → Redis (consent cache) + PG (authoritative)
  F527 → DATABASE FABRIC → ES (catalog) + Redis (eligibility cache)
  F528 → AI ENGINE FABRIC (quality scoring) + DATABASE FABRIC → ES
  F529 → DATABASE FABRIC → ES (pricing FREEDOM config)
  F530 → DATABASE FABRIC → Redis (INCR atomic counters)
  F531 → DATABASE FABRIC → Redis (pacing state)
  F532 → DATABASE FABRIC → ES (slot definition FREEDOM config)
  F534 → AI ENGINE FABRIC + DATABASE FABRIC → ES
  F536 → QUEUE FABRIC → Redis Streams (feed injection)
  F537 → QUEUE FABRIC → Redis Streams (impression log)
  F541 → DATABASE FABRIC → ES + Redis (eligibility cache)
  F542 → DATABASE FABRIC → Redis ONLY (stateless auction, DD-88)
  F543 → QUEUE FABRIC (async budget decrement) + DATABASE FABRIC → Redis

AF CONFIGURATION:
  AF-1 Genesis:     Generate auction orchestrator on MicroserviceBase; Redis-only path enforced
  AF-2 Planning:    S1(consent gate) → S2(slot resolve) → S3(eligibility load) → S4(quality score) →
                    S5(pricing) → S6(freq cap) → S7(pacing signal) → S8(auction) →
                    S9(insert) → S10(impression log async) → S11(budget decrement async)
  AF-3 Prompt Lib:  Auction latency budget prompts; consent-before-targeting pattern
  AF-4 RAG:         SK-102 (stateless auction Redis pattern); SK-104 (consent gate pattern)
  AF-5 Multi-model: Quality scoring conservative divergence > 10% (DD-97)
  AF-6 Code Review: Redis-only in critical path; async for impression/budget (non-blocking)
  AF-7 Compliance:  DNA-1–5; DR-71 (50ms SLO); DR-72 (consent before targeting);
                    DR-74 (Redis-only auction state); DD-100 (approved creative only)
  AF-8 Security:    F525 consent gate cannot be bypassed; F541 approval status hard-filtered
  AF-9 Judge:       Validates all IRON RULES; p99 latency test in quality suite
  AF-10 Merge:      Conservative model score on divergence (DD-97)
  AF-11 Feedback:   Win rate, fill rate, quality score distribution, p99 latency stored

BFA VALIDATION:
  Gate: Impression log events must not conflict with FLOW-04 analytics event schema
  Gate: Feed injection slot IDs compatible with FLOW-04 feed distribution slot schema
  Cross-check: Auction budget counters (Redis) isolated from FLOW-13 financial ledger (PG)
  Gate: Consent check for targeting compatible with FLOW-08 consent schema

MACHINE:
  Consent gate (F525): BLOCKING before targeting evaluation (DD-89, DR-72)
  Creative approval (F541 + F518): APPROVED status required — hard filter (DD-100)
  Political verification (F538 via F534): dual gate — both classifier + verification (DD-90)
  Auction state: Redis ONLY in critical path — no PG/ES write (DD-88, DR-74)
  Impression + budget: async post-auction (non-blocking render path)
  No-fill: valid result; never error on empty auction

FREEDOM:
  Pricing model variant per placement (F529 FREEDOM config)
  Frequency cap values per campaign (F530 FREEDOM config)
  Quality score threshold for auction inclusion (F528 FREEDOM config)
  Multi-model quality conservative threshold (DD-97 — FREEDOM config: default 10%)
  Depth limit for ad slot targeting context (F466 extended to auction context)

IRON RULES:
  IR-184-1: F542 RunAuctionAsync reads Redis ONLY. Non-Redis fabric call = BUILD FAILURE.
  IR-184-2: F541 eligibility check: creative with status ≠ "approved" excluded. No override = BUILD FAILURE.
  IR-184-3: F525 consent check BEFORE F519 targeting evaluation. Reversed order = BUILD FAILURE.
  IR-184-4: Political ad: both F535 classifier AND F538 verification pass. One gate only = BUILD FAILURE.
  IR-184-5: F537 impression log via QUEUE FABRIC async. Synchronous impression write = BUILD FAILURE.
  IR-184-6: F543 budget decrement via QUEUE FABRIC async. Synchronous decrement in auction = BUILD FAILURE.
  IR-184-7: No-fill result = DataProcessResult<Success> with empty winner. Exception = BUILD FAILURE.
  IR-184-8: All factory calls via CreateAsync().

QUALITY GATES (AF-9):
  QG-184-1: Consent gate: viewer without targeting consent → no targeted ad delivered (integration test)
  QG-184-2: Approval gate: PENDING creative never wins auction (integration test)
  QG-184-3: p99 latency: RunAuctionAsync < 50ms (Redis-only load test)
  QG-184-4: Political dual gate: F538 missing verification → ad excluded regardless of classifier
  QG-184-5: No-fill: empty eligible set → no-fill result, no error, slot remains empty
  QG-184-6: Multi-model quality divergence > 10%: lower score used (DD-97 verified by unit test)
  QG-184-7: Budget exhaustion: campaign paused after last budget counter decremented
```

---

## T185 — Impression Attribution Gate

```
TASK TYPE: T185 — Impression Attribution Gate
ARCHETYPE: EVENT_PROCESSING (async, fraud-gated, append-only)
ENTRY: Impression event consumed from F537 (QUEUE FABRIC impression stream)
PURPOSE: Process raw impression event: enrich with viewability, apply fraud gate
         (blocking), attribute credit to ad touchpoints, emit billing event if billable.
DISTINCT FROM:
  T186 (Click Attribution) — T185 is impression path; T186 is click path
  T184 (Auction Orchestrator) — T184 produces impressions; T185 processes them
  T197 (Fraud Quarantine) — T197 handles quarantined events; T185 is the pre-quarantine gate

FACTORY DEPENDENCIES: F544, F549, F554, F555, F560, F562, F564
FABRIC RESOLUTION:
  F544 → QUEUE FABRIC (impression stream) + DATABASE FABRIC → ES
  F549 → DATABASE FABRIC → Elasticsearch (viewability log)
  F554 → AI ENGINE FABRIC + DATABASE FABRIC → ES (IVT detection)
  F555 → AI ENGINE FABRIC + DATABASE FABRIC → ES (click fraud — applied to impression context)
  F560 → QUEUE FABRIC → DLQ + DATABASE FABRIC → ES (quarantine audit)
  F562 → DATABASE FABRIC → PostgreSQL (spend ledger, append-only)
  F564 → QUEUE FABRIC (billing consumer) + DATABASE FABRIC → PG

AF CONFIGURATION:
  AF-1 Genesis:     Generate impression attribution service on MicroserviceBase
  AF-2 Planning:    S1(consume) → S2(viewability enrich) → S3(IVT score) → S4(fraud gate) →
                    S5(attribution) → S6(billing emit) → S7(ledger append)
  AF-3 Prompt Lib:  Fraud gate before billing pattern; append-only ledger prompts
  AF-4 RAG:         SK-107 (fraud gate blocking pattern); SK-105 (append-only ledger pattern)
  AF-6 Code Review: Fraud gate is blocking (not async filter); ledger is append-only
  AF-7 Compliance:  DD-91 (append-only ledger); DD-99 (fraud gate before billing); DR-75
  AF-9 Judge:       Validates all IRON RULES
  AF-11 Feedback:   IVT rate, viewability rate, attribution latency stored

BFA VALIDATION:
  Gate: Billing events must not conflict with FLOW-13 finance engine billing schema
  Cross-check: Impression attribution events compatible with FLOW-04 analytics events
  Gate: Spend ledger schema compatible with FLOW-13 general ledger integration (DR-75)

MACHINE:
  Fraud gate: BLOCKING before billing event emission (DD-99)
  Ledger: APPEND-ONLY (DD-91, DR-75)
  Viewability threshold: MRC standard (50% pixels, 1 continuous second) — MACHINE
  Attribution model: resolved from F550/F552 (FREEDOM config per advertiser)

FREEDOM:
  Attribution window (F553/F561 per advertiser account — DD-101)
  IVT confidence threshold for quarantine (F554/F555 FREEDOM config)
  Viewability strict mode (strict MRC vs relaxed) — per campaign FREEDOM config

IRON RULES:
  IR-185-1: F554/F555 fraud scoring BEFORE billing event emission. Reversed order = BUILD FAILURE.
  IR-185-2: Fraud score above threshold → F560 quarantine BEFORE billing. Billing then quarantine = BUILD FAILURE.
  IR-185-3: F562 ledger: AppendLedgerEntryAsync ONLY. UpdateLedgerEntry = BUILD FAILURE.
  IR-185-4: Attribution window from F553/F561 FREEDOM config. Hardcoded window = BUILD FAILURE.
  IR-185-5: QUEUE FABRIC consumption: AcknowledgeAsync only after ledger append success.
  IR-185-6: All results DataProcessResult<T>.
  IR-185-7: All factory calls via CreateAsync().
  IR-185-8: F564 billing event only emitted after fraud gate PASS. No pre-screening bill = BUILD FAILURE.

QUALITY GATES (AF-9):
  QG-185-1: Fraud gate: simulated high-IVT impression → quarantined, not billed
  QG-185-2: Ledger append: no UPDATE on spend_ledger table (PG schema constraint test)
  QG-185-3: Attribution window: advertiser with 28d window receives credit for 25d-old impression
  QG-185-4: Viewability: sub-threshold impression flagged as not billable in correct pricing models
  QG-185-5: QUEUE ACK: ACK only after ledger write (failure = re-consume, no double-bill test)
```

---

## T186 — Click Attribution Gate

```
TASK TYPE: T186 — Click Attribution Gate
ARCHETYPE: EVENT_PROCESSING (async, fraud-gated, higher fraud sensitivity than T185)
ENTRY: Click event consumed from F545 click log (QUEUE FABRIC)
PURPOSE: Process click event: validate against served impression (anti-fraud),
         deduplicate, apply fraud gate (blocking, higher sensitivity than impressions),
         attribute conversion credit, emit billing event.
DISTINCT FROM:
  T185 (Impression Attribution) — T186 is click path; fraud sensitivity is higher
        (clicks drive CPC billing; inflated clicks = direct revenue fraud)
  T197 (Fraud Quarantine) — T197 handles quarantined events post-gate; T186 is the gate

FACTORY DEPENDENCIES: F545, F554, F555, F556, F558, F559, F560, F562, F564
FABRIC RESOLUTION:
  F545 → QUEUE FABRIC + DATABASE FABRIC → ES (click log)
  F554 → AI ENGINE FABRIC + DATABASE FABRIC → ES
  F555 → AI ENGINE FABRIC + DATABASE FABRIC → ES (click fraud primary detector)
  F556 → AI ENGINE FABRIC + DATABASE FABRIC → Redis (bot detection)
  F558 → DATABASE FABRIC → Redis (device fingerprint)
  F559 → AI ENGINE FABRIC + DATABASE FABRIC → ES (behaviour anomaly)
  F560 → QUEUE FABRIC → DLQ + DATABASE FABRIC → ES
  F562 → DATABASE FABRIC → PostgreSQL (append-only ledger)
  F564 → QUEUE FABRIC + DATABASE FABRIC → PG

AF CONFIGURATION:
  AF-1 Genesis:     Generate click attribution service; higher fraud threshold than T185
  AF-2 Planning:    S1(consume) → S2(impression correlation) → S3(dedup) → S4(bot check) →
                    S5(click fraud score) → S6(behaviour anomaly) → S7(fraud gate) →
                    S8(attribution) → S9(billing emit) → S10(ledger append)
  AF-4 RAG:         SK-107 (fraud gate blocking); SK-105 (append-only ledger)
  AF-7 Compliance:  DD-91; DD-99; DR-75; higher fraud sensitivity than T185
  AF-9 Judge:       Validates all IRON RULES; click-to-impression correlation test

BFA VALIDATION:
  Cross-check: Click events compatible with FLOW-04 post analytics schema
  Gate: CPC billing events compatible with FLOW-13 revenue recognition gate (DR-57)

MACHINE:
  Fraud gate: BLOCKING before billing (DD-99); stricter threshold than T185 (MACHINE: clicks drive direct revenue)
  Impression correlation: click without matching served impression → QUARANTINE
  Deduplication: same click event twice → second silently dropped (not billed)
  Ledger: APPEND-ONLY (DD-91)

FREEDOM:
  Click fraud sensitivity threshold (FREEDOM config per placement type)
  Attribution window (F553/F561 per advertiser — DD-101)
  Bot confidence threshold for quarantine (F556 FREEDOM config)

IRON RULES:
  IR-186-1: Impression correlation: click without matching F537 impression record → quarantine. No billing.
  IR-186-2: Fraud gate blocking BEFORE billing. Any bill before fraud gate = BUILD FAILURE.
  IR-186-3: F562 AppendLedgerEntryAsync ONLY. Update = BUILD FAILURE.
  IR-186-4: Dedup: same clickId billed twice = BUILD FAILURE.
  IR-186-5: Attribution window from F553/F561. Hardcoded window = BUILD FAILURE.
  IR-186-6: All results DataProcessResult<T>.
  IR-186-7: All factory calls via CreateAsync().
  IR-186-8: F560 quarantine before any billing attempt. No "bill then review" = BUILD FAILURE.

QUALITY GATES (AF-9):
  QG-186-1: Impression correlation: orphan click (no matching impression) → quarantined
  QG-186-2: Dedup: duplicate clickId → exactly one billing event emitted
  QG-186-3: Bot gate: simulated bot pattern → click quarantined, not billed
  QG-186-4: Ledger: no update on spend_ledger for clicks (PG constraint test)
  QG-186-5: Behaviour anomaly: velocity-based click fraud pattern → quarantine triggered
```

---

## T187 — Ad Review Gate

```
TASK TYPE: T187 — Ad Review Gate
ARCHETYPE: VALIDATION (multi-stage: automated + optional human escalation)
ENTRY: Review item dequeued from F517 (QUEUE FABRIC review queue, from T183 enqueue)
PURPOSE: Execute ad review pipeline: automated policy check, political dual-gate,
         brand safety score, human escalation if required, record append-only decision,
         update catalog approval status to APPROVED/REJECTED/RESTRICTED.
DISTINCT FROM:
  T183 (Creative Ingestion) — T183 sets status to PENDING; T187 resolves to final status
  T184 (Auction Orchestrator) — T184 checks the approval status set by T187

FACTORY DEPENDENCIES: F514, F515, F516, F517, F518, F533, F534, F535, F538, F539
FABRIC RESOLUTION:
  F514 → DATABASE FABRIC → ES (content policy FREEDOM config)
  F515 → DATABASE FABRIC → ES (prohibited category registry)
  F516 → DATABASE FABRIC → ES (sensitive topic index)
  F517 → QUEUE FABRIC → Redis Streams (review queue)
  F518 → DATABASE FABRIC → PostgreSQL (review decision, append-only)
  F533 → DATABASE FABRIC → ES (catalog approval status update)
  F534 → AI ENGINE FABRIC + DATABASE FABRIC → ES
  F535 → AI ENGINE FABRIC (political classifier)
  F538 → DATABASE FABRIC → PG (political verification records)
  F539 → AI ENGINE FABRIC + DATABASE FABRIC → ES (brand safety)

AF CONFIGURATION:
  AF-1 Genesis:     Generate review gate service; dual-gate pattern for political content
  AF-2 Planning:    S1(dequeue) → S2(prohibited check) → S3(sensitive topic detect) →
                    S4(political classifier) → S5(political verify if political) →
                    S6(brand safety score) → S7(auto-decide or escalate) →
                    S8(record decision) → S9(update catalog)
  AF-3 Prompt Lib:  Political dual-gate prompts; brand safety decision prompts
  AF-4 RAG:         SK-110 (creative review gate); SK-111 (political dual-gate pattern)
  AF-5 Multi-model: Brand safety scoring across models; conservative on divergence (DD-97)
  AF-7 Compliance:  DD-90 (political dual gate); DR-73; DD-100 (decision gate for auction)
  AF-8 Security:    Political verification checked regardless of classifier confidence
  AF-9 Judge:       Validates all IRON RULES; political dual-gate integration test

BFA VALIDATION:
  Gate: Review decisions must not conflict with FLOW-03 content moderation schema
  Cross-check: Ad review prohibited categories compatible with FLOW-04 content moderation rules
  Gate: Political verification records compatible with FLOW-08 identity schema

MACHINE:
  Prohibited category: immediate REJECT, no human escalation path overrides this
  Political dual gate: both classifier AND verification required (DD-90, DR-73)
  Decision: APPEND-ONLY record (DD-91); no modification
  Human escalation: MACHINE criteria (prohibited = no; sensitive topic detected = yes)

FREEDOM:
  Auto-approve threshold (brand safety score minimum — FREEDOM config)
  Human review SLA per priority lane (FREEDOM config via F517)
  Sensitive topic list (FREEDOM config via F516)
  Brand safety blocking categories per advertiser (F539 FREEDOM config)

IRON RULES:
  IR-187-1: Prohibited category → REJECT immediately. Human override of prohibited = BUILD FAILURE.
  IR-187-2: Political ad: F535 classifier AND F538 verification BOTH required. One gate = BUILD FAILURE.
  IR-187-3: F518 decision record: AppendDecisionAsync ONLY. Update/delete = BUILD FAILURE.
  IR-187-4: F533 catalog status updated AFTER F518 decision recorded. Reversed order = BUILD FAILURE.
  IR-187-5: Human escalation: decision not recorded until human approves/rejects. Auto-approve on timeout = BUILD FAILURE.
  IR-187-6: All results DataProcessResult<T>.
  IR-187-7: All factory calls via CreateAsync().
  IR-187-8: Brand safety score computed BEFORE final decision. Decision without score = BUILD FAILURE.

QUALITY GATES (AF-9):
  QG-187-1: Political dual gate: ad with political keyword but no F538 verification → REJECTED
  QG-187-2: Prohibited category: tobacco ad → REJECTED immediately, no human escalation offered
  QG-187-3: Decision audit: approved creative has append-only decision trail (no updates)
  QG-187-4: Catalog sync: APPROVED decision in F518 → catalog status APPROVED within 5s
  QG-187-5: Auction gate: creative approved by T187 → now eligible in T184 (integration test)
```

---

## T188 — Spend Billing Gate

```
TASK TYPE: T188 — Spend Billing Gate
ARCHETYPE: FINANCIAL (append-only, fraud-screened events only)
ENTRY: Billing-eligible event consumed from F564 (post fraud gate from T185/T186)
PURPOSE: Evaluate billability (viewability threshold, engagement minimum), write
         append-only billing entry to spend ledger (F562), emit budget decrement
         event, trigger invoice threshold check.
DISTINCT FROM:
  T185/T186 (Attribution Gates) — T185/T186 route to T188 after fraud screening;
             T188 is the financial record step
  T195 (Financial Reconciliation) — T195 reconciles end-of-period; T188 is per-event

FACTORY DEPENDENCIES: F562, F564, F565, F506, F543
FABRIC RESOLUTION:
  F562 → DATABASE FABRIC → PostgreSQL (append-only spend ledger)
  F564 → QUEUE FABRIC (billing consumer) + DATABASE FABRIC → PG
  F565 → AI ENGINE FABRIC (invoice narrative) + DATABASE FABRIC → PG
  F506 → DATABASE FABRIC → PG (budget) + Redis (live counter)
  F543 → QUEUE FABRIC (async budget decrement) + DATABASE FABRIC → Redis

AF CONFIGURATION:
  AF-1 Genesis:     Generate billing gate on MicroserviceBase; append-only enforced at schema level
  AF-2 Planning:    S1(consume) → S2(billability check) → S3(pricing calc) →
                    S4(ledger append) → S5(budget decrement async) → S6(invoice threshold check)
  AF-7 Compliance:  DD-91 (append-only); DR-75 (ledger schema contract)
  AF-9 Judge:       Validates all IRON RULES

BFA VALIDATION:
  Gate: Billing events compatible with FLOW-13 financial engine integration
  Cross-check: Spend ledger schema (F562) compatible with FLOW-14 data warehouse ingestion

MACHINE:
  Ledger: APPEND-ONLY (DD-91); no UPDATE/DELETE on billing records
  Budget decrement: async via F543 (never in billing critical path — DD-88)
  Fraud pre-screen: T188 only receives fraud-screened events (from T185/T186)

FREEDOM:
  Billability threshold per pricing model (CPM viewability, CPC engagement minimum)
  Invoice trigger threshold per account (FREEDOM config via F501)
  Currency and tax rate (FREEDOM config via F565)

IRON RULES:
  IR-188-1: F562 AppendLedgerEntryAsync ONLY. UpdateLedger = BUILD FAILURE.
  IR-188-2: Non-fraud-screened event in T188 = BUILD FAILURE. T185/T186 gate must precede.
  IR-188-3: Budget decrement via F543 QUEUE event. Synchronous decrement in T188 = BUILD FAILURE.
  IR-188-4: Billability result stored with ledger entry. Unbillable entry not in ledger.
  IR-188-5: All results DataProcessResult<T>.
  IR-188-6: All factory calls via CreateAsync().
  IR-188-7: Double-bill protection: same event_id billed twice = BUILD FAILURE (idempotency check).
  IR-188-8: QUEUE ACK only after successful ledger append.

QUALITY GATES (AF-9):
  QG-188-1: Append-only: no UPDATE on spend_ledger (DB constraint test)
  QG-188-2: Idempotency: same billing event processed twice → one ledger entry
  QG-188-3: Budget sync: decrement event reaches F543 within 200ms of ledger append
  QG-188-4: Invoice threshold: account hits 90% of monthly threshold → alert emitted
```

---

## T189 — Flow Version Publish Gate

```
TASK TYPE: T189 — Flow Version Publish Gate
ARCHETYPE: PROVISIONING (immutable snapshot, version lifecycle management)
ENTRY: POST /flows/{flowId}/publish with spec snapshot + semver
       platform:admin scope (F480)
PURPOSE: Publish a new immutable flow version: validate spec, create snapshot,
         validate backward compatibility (F580), record immutable version document,
         update current version pointer. No modification of published versions.
DISTINCT FROM:
  T196 (Attribution Config Gate) — T196 configures FREEDOM config docs;
        T189 versions entire flow specifications

FACTORY DEPENDENCIES: F571, F572, F579, F580
FABRIC RESOLUTION:
  F571 → DATABASE FABRIC → Elasticsearch (immutable flow version index)
  F572 → DATABASE FABRIC → ES (governance policy)
  F579 → DATABASE FABRIC → ES (BFA conflict index)
  F580 → DATABASE FABRIC → ES (compatibility matrix)

AF CONFIGURATION:
  AF-1 Genesis:     Generate flow versioning service; immutable doc ID pattern
  AF-2 Planning:    S1(scope check) → S2(spec validate) → S3(compat check) →
                    S4(BFA conflict check) → S5(publish snapshot) → S6(update current pointer)
  AF-7 Compliance:  DD-95 (immutable snapshots); DR-76 (version contract)
  AF-9 Judge:       Validates all IRON RULES

IRON RULES:
  IR-189-1: FlowVersion document ID = {flowId}:{semver}. Non-version-embedded ID = BUILD FAILURE.
  IR-189-2: No UpdateVersionAsync method. Any update to published version = BUILD FAILURE.
  IR-189-3: F580 compat check BEFORE F571 publish. Incompatible version published = BUILD FAILURE.
  IR-189-4: F579 BFA conflict check BEFORE publish. Conflicting flow version = BUILD FAILURE.
  IR-189-5: All results DataProcessResult<T>.
  IR-189-6: All factory calls via CreateAsync().
  IR-189-7: Status transition: DRAFT → REVIEW → PUBLISHED (unidirectional). Skipping REVIEW = BUILD FAILURE.
  IR-189-8: Rollback = new PUBLISHED version with previous spec. Not modification.

QUALITY GATES (AF-9):
  QG-189-1: Immutability: published version ES doc cannot be overwritten (index mapping test)
  QG-189-2: Compat check: breaking interface change blocked before publish
  QG-189-3: BFA conflict: conflicting entity registration blocks publish
  QG-189-4: Rollback: rollback to v1 creates v3 with v1 spec (not modifying v1 or v2)
```

---

## T190 — Tenant Quota Enforcement Gate

```
TASK TYPE: T190 — Tenant Quota Enforcement Gate
ARCHETYPE: GUARDRAIL (per-tenant, non-shared pool, DD-98)
ENTRY: Every API request before domain processing; called by F582 rate limit router
PURPOSE: Enforce per-tenant API quotas (requests/min, requests/day, concurrent connections)
         using per-tenant Redis counters (not shared pool). Return 429 on exhaustion.
DISTINCT FROM:
  T192 (API Rate Limit Gate) — T192 is per-app/endpoint; T190 is per-tenant platform quota
  T179/T180 (Graph Gates) — those are request processing; T190 is the upstream quota check

FACTORY DEPENDENCIES: F581, F582, F583, F577
FABRIC RESOLUTION:
  F581 → DATABASE FABRIC → Redis (per-tenant quota counters)
  F582 → CORE FABRIC + Redis (rate limit routing)
  F583 → DATABASE FABRIC → Redis (burst detection) + ES (metrics)
  F577 → DATABASE FABRIC → ES (error budget / SLO tracking)

IRON RULES:
  IR-190-1: Quota counters are per-tenant (not shared pool). Shared counter = BUILD FAILURE.
  IR-190-2: Quota exhaustion returns DataProcessResult with 429 status. Exception = BUILD FAILURE.
  IR-190-3: F583 noisy neighbor detection: burst above fair-share → throttle (not drop silently).
  IR-190-4: Quota limits from FREEDOM config only. Hardcoded limits = BUILD FAILURE.
  IR-190-5: All results DataProcessResult<T>.
  IR-190-6: All factory calls via CreateAsync().
  IR-190-7: Retry-After header populated on 429 result. Missing header = BUILD FAILURE.
  IR-190-8: Tenant identity from F578 scope context only. User-supplied tenant = BUILD FAILURE.

QUALITY GATES (AF-9):
  QG-190-1: Tenant isolation: tenant A quota exhaustion does not affect tenant B (concurrent test)
  QG-190-2: Noisy neighbor: tenant burst beyond fair share → throttled; others unaffected
  QG-190-3: FREEDOM config: quota limits updated via config (no code deploy required)
  QG-190-4: Error budget: quota enforcement events feed SLO tracking (F577 verified)
```

---

## T191 — Schema Field Projection Gate

```
TASK TYPE: T191 — Schema Field Projection Gate
ARCHETYPE: QUERY (metadata resolution, synchronous, <10ms)
ENTRY: Field projection context from T179/T180 S3 (F473 call)
PURPOSE: Resolve the authorized field set for a graph response: apply scope requirements,
         depth limit, privacy rules, and produce the projection mask used by T179 fan-out.
DISTINCT FROM:
  T179 (Graph Read) — T179 calls T191 as sub-step S3; T191 is the projection resolver only

FACTORY DEPENDENCIES: F466, F472, F473, F480, F487
FABRIC RESOLUTION:
  F466 → DATABASE FABRIC → ES (depth FREEDOM config)
  F472 → DATABASE FABRIC → ES (schema registry)
  F473 → DATABASE FABRIC → ES (field projection + permissions)
  F480 → DATABASE FABRIC → Redis (scope cache)
  F487 → CORE FABRIC (partial error builder)

IRON RULES:
  IR-191-1: Depth limit from F466 FREEDOM config. Hardcoded depth = BUILD FAILURE.
  IR-191-2: Fields requiring elevated scope silently excluded (not errored) unless explicitly requested.
  IR-191-3: Partial errors assembled by F487. Hand-crafted error array = BUILD FAILURE.
  IR-191-4: Schema version pinned to request version. Cross-version field leak = BUILD FAILURE.
  IR-191-5: All results DataProcessResult<T>.
  IR-191-6: All factory calls via CreateAsync().
  IR-191-7: Projection result is Dictionary (no typed FieldProjection class = BUILD FAILURE).
  IR-191-8: Empty requested fields → all authorized fields returned (implicit wildcard is safe default).

QUALITY GATES (AF-9):
  QG-191-1: Elevated scope field excluded for basic token (integration test)
  QG-191-2: Depth limit enforced: nested beyond limit → partial error, not 400
  QG-191-3: Schema version pinning: v1 request cannot expose v2-only fields
```

---

## T192 — API Rate Limit Gate

```
TASK TYPE: T192 — API Rate Limit Gate
ARCHETYPE: GUARDRAIL (per-app, per-endpoint, token-bucket)
ENTRY: Every API request; evaluated after T190 (tenant quota) passes
PURPOSE: Enforce per-app, per-endpoint rate limits using token bucket algorithm.
         Separate from T190 (tenant quota) — this is app-level granular limiting.
DISTINCT FROM:
  T190 (Tenant Quota) — T190 is platform-wide tenant; T192 is per-app per-endpoint

FACTORY DEPENDENCIES: F471, F580, F581, F582
FABRIC RESOLUTION:
  F471 → DATABASE FABRIC → Redis (token bucket) + ES (pattern index)
  F580 → DATABASE FABRIC → ES (compatibility matrix — rate limit schema compat check)
  F581 → DATABASE FABRIC → Redis (quota counters)
  F582 → CORE FABRIC + Redis (rate limit router)

IRON RULES:
  IR-192-1: Rate limits per-tenant (not shared). Shared limit = BUILD FAILURE.
  IR-192-2: Rate limit config from FREEDOM config only. Hardcoded = BUILD FAILURE.
  IR-192-3: 429 result includes Retry-After. Missing header = BUILD FAILURE.
  IR-192-4: Abuse signal from F471 escalated to F573. Silent drop = BUILD FAILURE.
  IR-192-5: All results DataProcessResult<T>.
  IR-192-6: All factory calls via CreateAsync().
  IR-192-7: Rate limit counter increment is atomic (Redis INCR). Non-atomic = BUILD FAILURE.
  IR-192-8: Rate limit bypass for internal system tokens. No bypass for user app tokens.

QUALITY GATES (AF-9):
  QG-192-1: Token bucket: request N+1 over limit within window returns 429 with Retry-After
  QG-192-2: Per-app isolation: app A exhausted does not limit app B (same tenant)
  QG-192-3: FREEDOM config: limit change takes effect within 60s (no redeploy)
```

---

## T193 — Consent Verification Gate

```
TASK TYPE: T193 — Consent Verification Gate
ARCHETYPE: COMPLIANCE (blocking gate, privacy-first)
ENTRY: Targeting evaluation context from T184 S1 (before F519 targeting evaluation)
PURPOSE: Verify viewer targeting consent before any targeting evaluation occurs.
         No consent → skip all targeting (not filter after). Returns consent context
         dictionary for downstream evaluation (DD-89, DR-72).
DISTINCT FROM:
  T184 (Auction Orchestrator) — T184 calls T193 as first step; T193 owns consent logic only

FACTORY DEPENDENCIES: F478, F525, F570
FABRIC RESOLUTION:
  F478 → DATABASE FABRIC → PG (consent records) + QUEUE FABRIC (withdrawal events)
  F525 → DATABASE FABRIC → Redis (consent cache) + PG (authoritative)
  F570 → DATABASE FABRIC → ES (audit log)

IRON RULES:
  IR-193-1: Consent check BEFORE targeting evaluation. Any targeting without consent check = BUILD FAILURE.
  IR-193-2: No consent → SKIP all targeting. Post-filter pattern = BUILD FAILURE.
  IR-193-3: F525 Redis cache read (fast path); F478 PG for authoritative (cache miss).
  IR-193-4: Consent status change via F478 event → F525 cache invalidated within 30s.
  IR-193-5: Consent verification logged to F570.
  IR-193-6: All results DataProcessResult<T>.
  IR-193-7: All factory calls via CreateAsync().
  IR-193-8: Consent withdrawal event MUST trigger immediate cache invalidation.

QUALITY GATES (AF-9):
  QG-193-1: No-consent viewer: targeting evaluation steps skipped entirely (trace verified)
  QG-193-2: Consent withdrawal: targeting blocked within 30s of withdrawal event
  QG-193-3: Cache coherence: F525 Redis matches F478 PG after cache miss refresh
```

---

## T194 — App OAuth Consent Gate

```
TASK TYPE: T194 — App OAuth Consent Gate
ARCHETYPE: IDENTITY (OAuth 2.0 + scope consent flow)
ENTRY: OAuth authorization request from developer app; user authentication confirmed
PURPOSE: Present scope consent UX, record user consent to requested app scopes,
         issue authorization code for token exchange. Sensitive scopes require
         review-approved app (F479 gate — DR-67).
DISTINCT FROM:
  T193 (Consent Verification) — T193 is runtime targeting consent; T194 is app scope grant

FACTORY DEPENDENCIES: F475, F476, F478, F479, F480
FABRIC RESOLUTION:
  F475 → DATABASE FABRIC → PG (app registry)
  F476 → DATABASE FABRIC → PG + Redis (token issuance)
  F478 → DATABASE FABRIC → PG (consent record) + QUEUE FABRIC
  F479 → AI ENGINE FABRIC + DATABASE FABRIC → ES (review status check)
  F480 → DATABASE FABRIC → Redis (scope enforcement)

IRON RULES:
  IR-194-1: Sensitive scope request from non-reviewed app → REJECT. No override = BUILD FAILURE.
  IR-194-2: Consent record written BEFORE authorization code issued.
  IR-194-3: Restricted scope: human review approved in F479 required. Auto-approve = BUILD FAILURE.
  IR-194-4: Token issued only after consent record committed.
  IR-194-5: All results DataProcessResult<T>.
  IR-194-6: All factory calls via CreateAsync().
  IR-194-7: PKCE required for public clients. No PKCE for public client = BUILD FAILURE.
  IR-194-8: Consent scope audit logged to F570.

QUALITY GATES (AF-9):
  QG-194-1: Sensitive scope: unreviewed app gets sensitive scope rejected
  QG-194-2: PKCE: public client without code_challenge rejected
  QG-194-3: Consent record: authorization code issued only after consent committed to PG
```

---

## T195 — Financial Reconciliation Gate

```
TASK TYPE: T195 — Financial Reconciliation Gate
ARCHETYPE: FINANCIAL (period-end, append-only correction, SOC2 compliant)
ENTRY: Scheduled trigger (end-of-billing-period) or on-demand admin trigger
PURPOSE: Reconcile spend ledger (F562) against billing system totals, identify
         discrepancies, issue offset corrections (append-only), generate reconciliation
         report for audit.
DISTINCT FROM:
  T188 (Spend Billing Gate) — T188 is per-event billing; T195 is period reconciliation

FACTORY DEPENDENCIES: F562, F563, F566, F570
FABRIC RESOLUTION:
  F562 → DATABASE FABRIC → PG (spend ledger, append-only)
  F563 → DATABASE FABRIC → PG (reversal records, append-only)
  F566 → DATABASE FABRIC → ES + DW (reporting aggregate)
  F570 → DATABASE FABRIC → ES (audit log)

IRON RULES:
  IR-195-1: Corrections are OFFSET ENTRIES in F562. Update/delete = BUILD FAILURE.
  IR-195-2: Reconciliation report stored in audit log (F570).
  IR-195-3: Discrepancy threshold alert if variance > 0.1% of period spend (MACHINE).
  IR-195-4: Reversal records in F563 are append-only.
  IR-195-5: All results DataProcessResult<T>.
  IR-195-6: All factory calls via CreateAsync().
  IR-195-7: Reconciliation run idempotent: same period reconciled twice = same result.
  IR-195-8: Offset entry references original entry ID. Orphaned offset = BUILD FAILURE.

QUALITY GATES (AF-9):
  QG-195-1: Offset correction: original + offset = net correct amount (sum test)
  QG-195-2: Idempotency: reconciliation run twice on same period = no duplicate offsets
  QG-195-3: Audit: every reconciliation run has audit log entry with variance amount
```

---

## T196 — Attribution Window Config Gate

```
TASK TYPE: T196 — Attribution Window Config Gate
ARCHETYPE: CONFIGURATION (FREEDOM config update, per advertiser account)
ENTRY: PUT /ad-accounts/{accountId}/attribution-config with window spec
       ads:settings:write scope (F480)
PURPOSE: Update per-advertiser attribution window configuration in FREEDOM config
         (F561): click window, view window, attribution model, cross-device toggle.
         Config takes effect on next conversion attribution cycle.
DISTINCT FROM:
  T189 (Flow Version Publish) — T189 versions flow specs; T196 updates FREEDOM config

FACTORY DEPENDENCIES: F498, F553, F561, F570
FABRIC RESOLUTION:
  F498 → DATABASE FABRIC → PG (account validation)
  F553 → DATABASE FABRIC → ES (window config read)
  F561 → DATABASE FABRIC → ES (FREEDOM config, update)
  F570 → DATABASE FABRIC → ES (audit log)

IRON RULES:
  IR-196-1: Attribution window stored in F561 FREEDOM config. Hardcoded window = BUILD FAILURE.
  IR-196-2: F498 account validation BEFORE config update.
  IR-196-3: Config change logged to F570 with before/after values.
  IR-196-4: Click window: 1–90 days (MACHINE range). Out-of-range = BUILD FAILURE.
  IR-196-5: View window: 0–7 days (0 = view attribution disabled). Out-of-range = BUILD FAILURE.
  IR-196-6: All results DataProcessResult<T>.
  IR-196-7: All factory calls via CreateAsync().
  IR-196-8: Config update takes effect within 60s. Stale window after 60s = BUILD FAILURE.

QUALITY GATES (AF-9):
  QG-196-1: Range validation: 91-day click window rejected with correct error
  QG-196-2: Propagation: updated window used in next attribution cycle (T185/T186)
  QG-196-3: Audit: config change has before/after audit entry (F570)
```

---

## T197 — Fraud Quarantine Gate

```
TASK TYPE: T197 — Fraud Quarantine Gate
ARCHETYPE: SECURITY (blocking, append-only audit, IAB TechLab reporting)
ENTRY: Fraud-flagged event from T185/T186 fraud scoring step
PURPOSE: Quarantine fraudulent events synchronously before billing reaches F562.
         Store quarantine record, report to IAB TechLab fraud pipeline, credit
         advertiser account for quarantined impressions/clicks.
DISTINCT FROM:
  T185/T186 (Attribution Gates) — those detect fraud; T197 is the quarantine action

FACTORY DEPENDENCIES: F555, F560, F563, F566, F570
FABRIC RESOLUTION:
  F555 → AI ENGINE FABRIC + DATABASE FABRIC → ES (fraud evidence)
  F560 → QUEUE FABRIC → DLQ + DATABASE FABRIC → ES (quarantine audit)
  F563 → DATABASE FABRIC → PG (reversal records for post-billing fraud)
  F566 → DATABASE FABRIC → ES + DW (fraud impact reporting)
  F570 → DATABASE FABRIC → ES (audit log)

IRON RULES:
  IR-197-1: Quarantine BEFORE billing event emission. Post-bill quarantine = BUILD FAILURE.
  IR-197-2: Quarantine record stored in F560 DLQ audit (append-only).
  IR-197-3: Advertiser credit issued for quarantined events (offset entry in F563).
  IR-197-4: IAB TechLab report emitted for quarantine batches (QUEUE FABRIC event).
  IR-197-5: All results DataProcessResult<T>.
  IR-197-6: All factory calls via CreateAsync().
  IR-197-7: Quarantine record contains fraud evidence (signal types + scores). Empty evidence = BUILD FAILURE.
  IR-197-8: Credit issuance idempotent: double-quarantine of same event = one credit.

QUALITY GATES (AF-9):
  QG-197-1: High-IVT impression: quarantined, billed = $0, credit issued (end-to-end test)
  QG-197-2: Double quarantine: same event flagged twice → one quarantine record, one credit
  QG-197-3: Audit: quarantine has fraud evidence, IAB report event, credit record (all 3 verified)
```

---

## T198 — Developer Analytics Aggregator

```
TASK TYPE: T198 — Developer Analytics Aggregator
ARCHETYPE: REPORTING (async aggregation, near-real-time, read-only output)
ENTRY: Scheduled trigger (every 5 min); consumes API request telemetry from F471/F582
PURPOSE: Aggregate API usage metrics per app per endpoint: request count, error rate,
         latency percentiles, quota utilisation. Store in F567 developer analytics index.
         Serve via F576 developer dashboard.
DISTINCT FROM:
  T181 (Webhook Delivery) — T181 logs delivery outcomes; T198 aggregates them
  T190 (Tenant Quota Gate) — T190 enforces quotas; T198 reports on quota consumption

FACTORY DEPENDENCIES: F471, F567, F576, F577
FABRIC RESOLUTION:
  F471 → DATABASE FABRIC → Redis (request telemetry) + ES (pattern index)
  F567 → DATABASE FABRIC → Elasticsearch (developer analytics aggregate index)
  F576 → DATABASE FABRIC → Elasticsearch (dashboard index)
  F577 → DATABASE FABRIC → Elasticsearch (error budget / SLO index)

IRON RULES:
  IR-198-1: Aggregation is APPEND-ONLY to F567. No update to historical aggregates = BUILD FAILURE.
  IR-198-2: Aggregation window = 5 min (FREEDOM config default). Hardcoded window = BUILD FAILURE.
  IR-198-3: F577 error budget updated in same aggregation run.
  IR-198-4: Data retention: aggregates kept per F572 governance policy (FREEDOM config).
  IR-198-5: All results DataProcessResult<T>.
  IR-198-6: All factory calls via CreateAsync().
  IR-198-7: Dashboard query reads only from F576 aggregate. Direct query of raw telemetry = BUILD FAILURE.
  IR-198-8: Aggregation run idempotent: same window aggregated twice = same result (no duplicates).

QUALITY GATES (AF-9):
  QG-198-1: Latency p99: aggregation run completes within 30s for 1M events
  QG-198-2: Dashboard accuracy: F576 aggregate matches raw event count within 0.1%
  QG-198-3: Error budget: SLO breach (> 1% error rate) triggers alert via F577
  QG-198-4: Idempotency: aggregation re-run for same window = no duplicate entries
```

---

## TASK TYPES SUMMARY — FLOW-20

| # | Task Type | Archetype | Key Factories | Key Design Decision |
|---|-----------|-----------|---------------|---------------------|
| T179 | Graph Read Gate | REQUEST_RESPONSE | F467-F491 | DD-87 per-node/field auth; DD-86 REST paths |
| T180 | Graph Write Gate | REQUEST_RESPONSE | F467-F496 | DD-92 HMAC webhooks; DD-87 scope |
| T181 | Webhook Delivery Orchestrator | ORCHESTRATION | F493-F497 | DD-92 HMAC mandatory; retry DLQ |
| T182 | Payment Method Registration | VALIDATION | F498-F570 | DD-93 tokenization-only |
| T183 | Creative Ingestion Gate | VALIDATION | F508-F533 | DD-100 PENDING initial status |
| T184 | Ad Auction Orchestrator | ORCHESTRATION | F525-F543 | DD-88 Redis-only; DD-89 consent gate; DD-97 |
| T185 | Impression Attribution Gate | EVENT_PROCESSING | F544-F564 | DD-99 fraud gate; DD-91 append-only |
| T186 | Click Attribution Gate | EVENT_PROCESSING | F545-F564 | DD-99 higher sensitivity; impression correlation |
| T187 | Ad Review Gate | VALIDATION | F514-F539 | DD-90 dual gate; DD-100 approval gate |
| T188 | Spend Billing Gate | FINANCIAL | F562-F543 | DD-91 append-only; fraud pre-screened |
| T189 | Flow Version Publish Gate | PROVISIONING | F571-F580 | DD-95 immutable snapshots |
| T190 | Tenant Quota Enforcement Gate | GUARDRAIL | F581-F583 | DD-98 per-tenant isolation |
| T191 | Schema Field Projection Gate | QUERY | F466-F487 | DD-96 depth FREEDOM; DD-87 partial auth |
| T192 | API Rate Limit Gate | GUARDRAIL | F471-F582 | DD-98 per-tenant; token bucket |
| T193 | Consent Verification Gate | COMPLIANCE | F478-F570 | DD-89 blocking before evaluation |
| T194 | App OAuth Consent Gate | IDENTITY | F475-F480 | DR-67 scope review gates |
| T195 | Financial Reconciliation Gate | FINANCIAL | F562-F570 | DD-91 offset entries only |
| T196 | Attribution Window Config Gate | CONFIGURATION | F553-F570 | DD-101 FREEDOM config per account |
| T197 | Fraud Quarantine Gate | SECURITY | F555-F570 | DD-99 blocking before billing |
| T198 | Developer Analytics Aggregator | REPORTING | F471-F577 | near-real-time SLO tracking |

---

## SAVE POINT: FLOW20:P2:TASKS ✅
## Phase 2 COMPLETE: T179–T198 (20 full engine contracts)
## Recovery: "Continue FLOW-20 Phase P3" → FLOW20_BFA_STRESS_TEST.md
