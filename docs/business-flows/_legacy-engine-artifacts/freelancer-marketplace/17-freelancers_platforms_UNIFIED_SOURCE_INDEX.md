# 17 — Freelancer Marketplace Platform — UNIFIED SOURCE INDEX
## FLOW-15 | DD-86–DD-99 (14 Design Decisions) | DR-66–DR-75 (10 Design Records)
## Continues from DD-85 (FLOW-14 last DD) and DR-65 (FLOW-14 last DR)

---

## DESIGN DECISIONS: DD-86–DD-99

---

### DD-86 — Token Economy: Immutable Ledger vs Mutable Balance Field

```
DECISION:  Token wallet implemented as immutable ledger journal (SK-102 pattern)
           NOT as a mutable balance column

RATIONALE: Mutable balance is vulnerable to lost updates under concurrent retries.
           Immutable ledger + derived balance is the only pattern safe for distributed systems.
           Idempotency key on every spend = exactly-once guarantee regardless of retries.

ALTERNATIVES CONSIDERED:
  - Mutable balance column + optimistic lock: rejected — race condition window exists
  - Redis atomic DECR: rejected — not durable across restarts, not fabric-first

CONSEQUENCES:
  Balance query = aggregate over ledger (slightly slower, fully consistent)
  Audit trail = free (every spend logged with idempotency key)

FREEDOM CONFIG: token_cost_per_proposal, boost_multiplier (per tenant)
IRON RULES:  CF-221, CF-222 enforce this decision
```

---

### DD-87 — Escrow Model: Separate Ledger Service from State Machine

```
DECISION:  F492 IEscrowService manages state machine (FUNDED/RELEASED/etc)
           F493 IEscrowLedgerService manages immutable financial journal
           These are TWO separate factory interfaces, not one

RATIONALE: State machine and financial journal have different access patterns and
           consistency requirements. State machine must respond fast; ledger must be
           append-only with idempotency key constraint.
           Merging them creates coupling that makes ledger immutability harder to enforce.

ALTERNATIVES CONSIDERED:
  - Single EscrowService: rejected — mixing mutable state + immutable journal in one factory
    creates inconsistent DNA-1/DNA-3 enforcement surface

CONSEQUENCES:
  T188/T190/T193 always call both F492 and F493
  F492 state check before F493 journal entry (never journal before state validation)

ENFORCEMENT:  SK-103, SK-104, CF-215
```

---

### DD-88 — Dispute Atomicity: Hold Must Be Placed in Same Transaction as Dispute Creation

```
DECISION:  F502 dispute creation and F503 escrow hold placement are in ONE DB transaction.
           No separation, no async hold.

RATIONALE: A window between dispute creation and hold placement allows a concurrent release
           to escape (funds gone, dispute open). This is an existential correctness requirement.
           The atomic transaction is the only safe design (CF-219, ST-105).

ALTERNATIVES CONSIDERED:
  - QUEUE FABRIC event: dispute.opened → async hold: rejected — async = race condition window
  - Two-phase with compensate: rejected — hold failure after dispute creation = stuck state

CONSEQUENCES:
  F502 and F503 share same DB connection context for this operation
  QUEUE FABRIC event emitted AFTER transaction commits (outbox pattern)

ENFORCEMENT:  CF-219, IR-191-1
```

---

### DD-89 — KYC: External Vendor Routed Through AI ENGINE FABRIC

```
DECISION:  KYC document analysis (OCR, liveness) is treated as an AI ENGINE FABRIC call,
           not a hardcoded vendor SDK import.

RATIONALE: KYC vendor changes are common in regulated environments.
           Routing through IAiProvider.GenerateAsync() enables vendor swap via config.
           This is DNA-4 (MicroserviceBase) + fabric-first principle applied to identity verification.

ALTERNATIVES CONSIDERED:
  - Direct KYC SDK import: rejected — violates fabric-first, locks to one vendor
  - Separate "KYC Fabric": rejected — AI ENGINE FABRIC covers this via model selection config

CONSEQUENCES:
  F470 passes KYC document as base64 + prompt to IAiProvider
  KYC provider config: kyc_provider = "vendor_A_via_claude_tool" or custom model endpoint

FREEDOM CONFIG: kyc_provider_model, required_document_types, expiry_days
ENFORCEMENT:  IR-194-5
```

---

### DD-90 — Multi-Aggregate Correlation: Subject References on FlowInstance

```
DECISION:  FlowInstance carries subject_refs[] array linking all domain aggregates
           (Job, Proposal, Contract, Milestone, Dispute).
           All domain events include correlation_id for cross-service tracing.

RATIONALE: A marketplace contract flow spans 5+ domain aggregates across multiple services.
           Without explicit correlation, distributed traces are unreadable and
           "which dispute belongs to which milestone" requires expensive cross-service queries.

ALTERNATIVES CONSIDERED:
  - Denormalise all IDs into every event: rejected — fragile to schema additions
  - Graph DB for correlation (Neo4j): deferred — viable for analytics, not required for correctness

CONSEQUENCES:
  FlowInstance table has subject_refs JSONB column
  All domain events include correlation_id field (compatible with FLOW-14 F460 lineage tracker)

ENFORCEMENT:  SK-108, T188–T193 step definitions
```

---

### DD-91 — Work Diary Screenshots: External Reference Only, Never Inline

```
DECISION:  F497 stores screenshot as { screenshotRef: "object-store://bucket/key" }
           Never stores base64 or binary inline in ES or PG.

RATIONALE: Inline binary in ES indices degrades search performance and index size dramatically.
           External object store handles binary efficiently.
           Privacy: object store can have separate access policies (signed URLs, expiry).

ALTERNATIVES CONSIDERED:
  - Base64 in ES metadata field: rejected — ES not designed for large binary
  - PostgreSQL BYTEA column: rejected — not fabric-first, locks to PG, huge row sizes

CONSEQUENCES:
  Separate access control layer on object store (signed URL expiry per F497 access check)
  Screenshot ref = opaque string — consuming service resolves via object store API

PRIVACY NOTE:  Access to screenshot ref must go through F497 which enforces CF-236 object-level auth

ENFORCEMENT:  CF-237, DR-70, IR-195-1
```

---

### DD-92 — Reputation: Score is Always Derived, Never Stored as Authoritative Value

```
DECISION:  F467 reputation score is recomputed from review_journal on each update.
           The ES profile index caches the computed score (mutable), but it is DERIVED.
           The review_journal is the single source of truth.

RATIONALE: Mutable reputation scores can be tampered with or drift from the review record.
           Immutable journal + derived score ensures the displayed score is always reconcilable.
           Audit: at any time, score can be recomputed from journal to verify integrity.

ALTERNATIVES CONSIDERED:
  - Store score as primary value, update on each review: rejected — no audit trail, corruption risk
  - Event sourcing with full replay: overkill — simple weighted average from journal is sufficient

ENFORCEMENT:  SK-110, IR-197-2, DR-73
```

---

### DD-93 — Auto-Release Timer: Durable TimerInstance, Not Polling

```
DECISION:  Milestone auto-release (when client does not respond within review window)
           is implemented as a durable TimerInstance entry, not a polling background job.

RATIONALE: Polling jobs are stateless — they don't know which milestones need checking.
           They scale poorly and produce N queries per poll interval.
           Durable timer = one record per pending action, fires exactly once, cancellable.

ALTERNATIVES CONSIDERED:
  - Cron job scanning milestone table: rejected — O(N) scan, race condition on cancellation
  - Redis TTL key: rejected — not durable across Redis restart

CONSEQUENCES:
  TimerInstance table: { fires_at, transition_key, deduplication_key UNIQUE }
  On client approval: TimerInstance.status = CANCELLED (prevents double-release)

ENFORCEMENT:  IR-190-4, IR-182-1, T190 step definition
```

---

### DD-94 — Proposal Ranking: AI Ranking via AI ENGINE FABRIC, Not Hardcoded Score Formula

```
DECISION:  F481 IProposalRankingService uses AI ENGINE FABRIC for relevance scoring
           when boost + signal weighting requires semantic understanding.

RATIONALE: Purely rule-based ranking degrades quickly as job descriptions become varied.
           AI-powered ranking (via AiDispatcher) enables relevance signals beyond keyword match.
           Config-driven model selection allows A/B testing ranking models.

FREEDOM CONFIG: ranking_model: "claude-sonnet", boost_weight: 0.3, recency_decay: 0.1
ENFORCEMENT:  F481 fabric resolution, SK-101
```

---

### DD-95 — Enterprise Compliance Gates: Stored as FREEDOM Config, Not Hardcoded

```
DECISION:  The list of required compliance gates per tenant is stored in Elasticsearch
           as FREEDOM configuration, not hardcoded in F487 or F511.

RATIONALE: Enterprise tenants have different compliance requirements (some need classification,
           some KYC only, some add jurisdiction-specific gates).
           Hardcoding would require code changes per enterprise customer.

CONSEQUENCES:
  F489.EvaluatePolicyAsync loads gate list from ES config per tenantId
  New gate = new ES document, no code deployment

ENFORCEMENT:  IR-194-2, CF-226, DD-95
```

---

### DD-96 — Contest Handover: Separate IP Transfer Service from Escrow

```
DECISION:  F516 IIPTransferService is a separate factory from F492 IEscrowService.
           Certification of IP ownership is a distinct domain from financial escrow.

RATIONALE: IP transfer may have its own legal/compliance requirements independent of payment.
           Separating them allows IP transfer to be enhanced (digital signatures, blockchain ref)
           without changing escrow logic.

CONSEQUENCES:
  T196 calls F483 → F516 → F492 in sequence (IP transfer certify before escrow release)
  F516 record is permanently immutable after CERTIFIED status

ENFORCEMENT:  CF-227, IR-196-1, SK-109
```

---

### DD-97 — Notifications: Reuse FLOW-10 Notification Patterns via F507

```
DECISION:  F507 INotificationService extends/reuses FLOW-10 notification fabric patterns
           rather than building a new notification service from scratch.

RATIONALE: FLOW-10 (F288+) already established notification patterns.
           Building parallel notification infrastructure creates CF-233 conflict risk.
           AF-4 RAG check verifies no duplicate implementation before generating F507 code.

CONSEQUENCES:
  AF-4 MUST search SK-44–SK-55 (FLOW-10 skills) before generating F507 code
  F507 adds marketplace-specific notification types (proposal.received, dispute.opened)
  to existing notification template registry

ENFORCEMENT:  CF-233, IR-197-3 (see AF-4 cross-reference in SK-99-SK-110)
```

---

### DD-98 — Audit Log Compatibility with FLOW-14 DWH

```
DECISION:  F512 IAuditLogService audit event schema is designed to be compatible with
           FLOW-14 F459 IWarehouseAuditService for downstream warehousing.

RATIONALE: Enterprise reporting (T198) relies on DWH analytics.
           Incompatible schemas break F459 ingestion (CF-234).
           Shared event envelope format (tenantId, actorId, action, target, timestamp, correlationId)
           enables zero-transform DWH ingestion.

CONSEQUENCES:
  F512 emits events to QUEUE FABRIC using the F459-compatible schema
  F459 subscribes and ingests without transformation

ENFORCEMENT:  CF-234, DR-75
```

---

### DD-99 — Multi-Tenant Work Diary Isolation: Bridge Model Inherited from FLOW-08

```
DECISION:  Work diary isolation follows the bridge model established in FLOW-08:
           most tenants share schema with RLS enforcement.
           Enterprise tenants can graduate to schema-per-tenant via isolation binding.

RATIONALE: Work diary contains privacy-sensitive evidence — isolation is critical.
           Re-implementing tenant isolation in FLOW-15 would duplicate FLOW-08 patterns.
           Bridge model + FLOW-08 MT ISOLATION FABRIC handles this uniformly.

CONSEQUENCES:
  F497 uses MT ISOLATION FABRIC (Skill 11) for all work diary queries
  Enterprise tenants can have dedicated schema for work diary data

ENFORCEMENT:  DNA-5, FLOW-08 tenant model, SK-106
```

---

## DESIGN RECORDS: DR-66–DR-75

---

### DR-66 — Immutable Escrow Ledger with Idempotency Key as Primary Safety Mechanism

```
DECISION:  All escrow movements are journaled in an append-only table.
           Idempotency key is the UNIQUE constraint at DB level — not application-level check.

RATIONALE: Application-level idempotency checks can fail under concurrent retry.
           DB-level UNIQUE constraint on idempotency_key is the only race-condition-safe guarantee.
           Without this, a network timeout + retry can create duplicate ledger entries.

IRON RULES DERIVED:
  IR-188-1, IR-190-2, IR-193-1, IR-196-4, CF-216
```

---

### DR-67 — Token Wallet: Same Idempotency Pattern as Escrow Ledger

```
DECISION:  F471 token wallet uses identical DB-level idempotency pattern to F493 ledger.
           UNIQUE(userId, idempotencyKey) on token_ledger table.

RATIONALE: Token spend under retry should never double-deduct.
           Same pattern proven by escrow ledger (DR-66) — apply universally to any money/credit operation.

IRON RULES DERIVED: CF-221, CF-222, SK-102
```

---

### DR-68 — Audit Log: DB-Level Append-Only Enforcement (No DELETE Grant on Role)

```
DECISION:  F512 audit log table has NO DELETE or UPDATE grant on the application DB role.
           Enforced at DB GRANT level, not just application code level.

RATIONALE: Application-code-only enforcement can be bypassed by bugs or malicious code.
           DB-level grant revocation is the only guarantee.
           Required for enterprise compliance and dispute defensibility.

IRON RULES DERIVED: CF-215 (extended to audit), ST-118, IR (DR-68)
```

---

### DR-69 — KYC Expiry: Durable Timer on All Verification Records

```
DECISION:  Every F470 KYC verification record has a durable TimerInstance for expiry.
           Timer fires kyc.expired event, which triggers T194 re-evaluation.

RATIONALE: KYC verifications expire (typically 12 months).
           Without expiry enforcement, a verified KYC from 2 years ago could unblock contract activation.
           Durable timer = deterministic, single-fire, cancellable on renewal.

IRON RULES DERIVED: CF-228, IR-194-1
```

---

### DR-70 — Screenshot Storage: External Object Reference Mandatory

```
DECISION:  Work diary screenshots MUST be stored as opaque external object references.
           F497 ES document contains { screenshotRef: "objectstore://..." } only.

RATIONALE: Inline binary in ES degrades index performance dramatically.
           External object store + signed URL access provides both performance and privacy control.
           Signed URL expiry = automatic access revocation for evidence after retention period.

IRON RULES DERIVED: CF-237, IR-195-1, DD-91
```

---

### DR-71 — Deliverable Immutability: No Update After Submission

```
DECISION:  F499 deliverables are immutable after submission.
           UPDATE operations on deliverable records are blocked at application level.
           Reason: deliverables are legal evidence in disputes — tampering must be impossible.

IRON RULES DERIVED: IR-189-1, IR-499
```

---

### DR-72 — IP Transfer Certification: State Locked After CERTIFIED

```
DECISION:  F516 IP transfer records have a CHECK constraint: if current status = CERTIFIED,
           UPDATE is blocked. Enforced at DB level.

RATIONALE: IP transfer certification is a legal act. Post-certification mutation would
           undermine its legal standing and audit integrity.

IRON RULES DERIVED: IR-196-2, CF-227, SK-109
```

---

### DR-73 — Reputation Score: Always Recomputed from Journal, Never Patched

```
DECISION:  F467 reputation score in ES profile index is always replaced by a fresh computation
           from the review_journal. No incremental patch/update formula.

RATIONALE: Incremental patch formulas drift under concurrent reviews.
           Full recompute from immutable journal guarantees score = weighted avg of all reviews.
           Cost: acceptable (review journals are small per user).

IRON RULES DERIVED: IR-197-2, DD-92, SK-110
```

---

### DR-74 — Marketplace Flow Correlation: OpenTelemetry correlation_id on Every Event

```
DECISION:  All FLOW-15 domain events include correlation_id compatible with OpenTelemetry
           distributed tracing. Event envelope: { tenantId, correlationId, eventType, timestamp, payload }.

RATIONALE: A single contract flow spans 20+ events across 7 services.
           Without correlation, distributed trace reconstruction is impossible.
           OpenTelemetry compatibility ensures traces work with existing FLOW-14 observability stack.

IRON RULES DERIVED: DD-90, CF-234, T188–T193 event definitions
```

---

### DR-75 — Audit Schema Compatibility: FLOW-15 Events Must Match FLOW-14 DWH Schema

```
DECISION:  F512 audit events emitted to QUEUE FABRIC must satisfy the FLOW-14 F459 schema contract.
           Required fields: tenant_id, actor_id, action, target_type, target_id, timestamp, correlation_id.
           Any additional FLOW-15 fields are additive (backwards-compatible).

RATIONALE: Enterprise reports (T198) aggregate data from both FLOW-14 DWH and FLOW-15 audit.
           Schema incompatibility would break the F459 ingestion pipeline (CF-234).

ENFORCEMENT: CF-234, DD-98
```

---

## CONCEPT MAP FOR FLOW-15

```
MONEY SAFETY CHAIN:
  SK-102 (Token Ledger) → SK-103 (Escrow Saga) → SK-104 (Durable Ledger)
  → F471 → F492 → F493 → DR-66 → DR-67

COMPLIANCE CHAIN:
  SK-107 (KYC Gate) → T194 → T187 → CF-225/226
  → F470 → F487 → F489 → F511 → DR-69

EVIDENCE CHAIN:
  SK-106 (Work Evidence) → T195 → T189 → T192
  → F497 → F498 → F499 → F500 → DR-70 → DR-71

DISPUTE CHAIN:
  SK-105 (Dispute Hold) → T191 → T192 → T193
  → F502 → F503 → F504 → F505 → F506 → DR-68

REPUTATION CHAIN:
  SK-110 (Reputation) → T197
  → F467 → F472 → F475 → DR-73

MARKETPLACE CHAIN:
  SK-99 (Job Enrich) → SK-100 (Publish Gate) → SK-101 (Talent Match)
  → T179 → T180 → T181 → T182 → T183 → T184 → T185
  → F473 → F474 → F475 → F476 → F477 → F479 → F480 → F481
```

---

## BACKWARD COMPATIBILITY

```
DD-1–DD-85:    UNCHANGED ✅
DD-86–DD-99:   NEW in FLOW-15  (+14 decisions)

DR-1–DR-65:    UNCHANGED ✅
DR-66–DR-75:   NEW in FLOW-15  (+10 records)
```

---

## SAVE POINT: FLOW15:P5:UNIFIED_SOURCE_INDEX ✅
## Next: Load FLOW15_P6_MASTER_EXECUTION_PLAN
