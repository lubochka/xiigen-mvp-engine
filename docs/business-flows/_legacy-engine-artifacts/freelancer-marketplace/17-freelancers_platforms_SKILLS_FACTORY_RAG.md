# 17 — Freelancer Marketplace Platform — SKILLS FACTORY RAG
## FLOW-15 | SK-99–SK-110 (12 Skill Patterns) | AF-4 RAG Retrieval Index
## Continues from SK-98 (FLOW-14 last skill)

---

## SKILL OVERVIEW TABLE

| ID | Skill Name | Archetype | Primary Fabrics | AF-4 Trigger Keywords |
|----|-----------|-----------|-----------------|----------------------|
| SK-99 | Job Enrichment AI Pipeline | MARKETPLACE | AI ENGINE + DATABASE | job, enrich, skill extract, taxonomy |
| SK-100 | Idempotent Publish Gate | MARKETPLACE | DATABASE + QUEUE | publish, idempotent, state gate, index |
| SK-101 | RAG-Powered Talent Matching | ORCHESTRATION | RAG + DATABASE | match, rank, score, talent, discovery |
| SK-102 | Idempotent Token Spend Pattern | VALIDATION | DATABASE (ledger) + QUEUE | token, spend, wallet, connect, idempotency |
| SK-103 | Escrow Saga with Compensation | ESCROW_SAGA | DATABASE + QUEUE | escrow, fund, release, saga, compensation |
| SK-104 | Durable Money-Safe Ledger | ESCROW_SAGA | DATABASE (append-only) | ledger, journal, immutable, append |
| SK-105 | Dispute Hold & Lifecycle | VALIDATION | DATABASE + QUEUE | dispute, hold, evidence, arbitration |
| SK-106 | Work Evidence Capture Cycle | EVIDENCE_CAPTURE | DATABASE + QUEUE + CORE | work diary, time track, evidence, screenshot |
| SK-107 | KYC Gate with Policy Engine | VALIDATION | DATABASE + AI ENGINE | kyc, compliance, gate, policy, classification |
| SK-108 | Multi-Aggregate Flow Saga | DURABLE_SAGA | FLOW ENGINE + QUEUE | multi-aggregate, correlation, saga, orchestrate |
| SK-109 | Contest Handover & IP Transfer | MARKETPLACE | DATABASE + QUEUE | contest, handover, IP transfer, prize |
| SK-110 | Reputation Aggregation Engine | REPUTATION | DATABASE (immutable) + ES | reputation, score, review, tier, aggregate |

---

## SKILL DETAILS

---

### SK-99 — Job Enrichment AI Pipeline

```
PATTERN:    AI-powered enrichment of unstructured job description → normalised skill tags + category
ARCHETYPE:  MARKETPLACE
FABRICS:    AI ENGINE FABRIC (AiDispatcher, Skill 07) + DATABASE FABRIC (ES taxonomy)

PROBLEM SOLVED:
  Raw job descriptions contain informal skill references (e.g. "React dev", "JS expert").
  Engine must normalise to taxonomy terms before indexing for accurate matching.

IMPLEMENTATION PATTERN:
  1. Receive job description as Dictionary<string,object> (DNA-1)
  2. Build AI prompt via AF-3 Prompt Library — extract skill list
  3. Dispatch via AiDispatcher (multi-model parallel: Claude + GPT)
  4. Merge skill outputs via AF-10 Merge (consensus: skill present in ≥2 models = confirmed)
  5. Normalise each skill via ISkillTaxonomyService.NormalizeSkillAsync()
  6. Merge normalised skills back into job Dictionary via ObjectProcessor
  7. Return DataProcessResult<Dictionary<string,object>> — never throw

FREEDOM CONFIG:
  ai_enrichment_model: ["claude-sonnet", "gpt-4o"]   # multi-model selection
  extraction_confidence_threshold: 0.7
  max_skill_tags: 20
  taxonomy_version: "v3"

DNA COMPLIANCE:
  ✅ DNA-1: job_data = Dictionary<string,object>
  ✅ DNA-2: BuildSearchFilter on taxonomy ES lookup
  ✅ DNA-3: DataProcessResult<T> on all returns
  ✅ DNA-5: tenantId on taxonomy query

REUSABLE IN:  T179, T474, anywhere AI extracts structured fields from free text
AF-4 KEYWORDS: job enrich, skill extract, taxonomy normalise, AI pipeline
```

---

### SK-100 — Idempotent Publish Gate

```
PATTERN:    State gate that prevents duplicate publishes and handles near-real-time index lag
ARCHETYPE:  MARKETPLACE
FABRICS:    DATABASE FABRIC (PG state + ES index) + QUEUE FABRIC

PROBLEM SOLVED:
  Publish triggered twice (e.g., retry after timeout) must not create duplicate index entries
  or emit duplicate job.published events.

IMPLEMENTATION PATTERN:
  1. Check current status in F473 (PG) — if PUBLISHED, return existing result (idempotent)
  2. Update status PARSING_COMPLETE → PUBLISHED in atomic PG transaction
  3. Write to ES index via F475 (BuildSearchFilter)
  4. Emit job.published to QUEUE FABRIC via outbox (transactional — same DB transaction as status update)
  5. Acknowledge: return DataProcessResult with published document reference

OUTBOX PATTERN:
  OutboxEvent row created in same PG transaction as status change.
  Background relay reads outbox → publishes to QUEUE FABRIC → marks delivered.
  Prevents dual-write failure between PG and QUEUE FABRIC.

DNA COMPLIANCE:
  ✅ DNA-1: All documents as Dictionary<string,object>
  ✅ DNA-2: BuildSearchFilter on ES publish query
  ✅ DNA-5: tenantId in PG + ES
  ✅ DNA-3: DataProcessResult — never throw on duplicate

REUSABLE IN:  T180, any publish/activate gate in any flow
AF-4 KEYWORDS: publish gate, outbox, idempotent publish, index lag
```

---

### SK-101 — RAG-Powered Talent Matching

```
PATTERN:    Config-driven RAG strategy for scoring and ranking talent against job requirements
ARCHETYPE:  ORCHESTRATION
FABRICS:    RAG FABRIC (Skill 00b, config-selected strategy) + DATABASE FABRIC (ES profiles)

PROBLEM SOLVED:
  Matching algorithm must be swappable (cosine similarity, keyword, hybrid, graph)
  without changing orchestration code. Strategy selected via FREEDOM config.

IMPLEMENTATION PATTERN:
  1. Build search context from job enriched skills (Dictionary<string,object>)
  2. Call IRagService.SearchAsync(context, strategyFromConfig)
  3. RAG FABRIC resolves strategy (Vector / Hybrid / Graph) from config
  4. Score each candidate against job requirements
  5. Return ranked DataProcessResult<List<Dictionary<string,object>>>
  6. All candidate profiles tenantId-scoped (DNA-5)

FREEDOM CONFIG:
  matching_rag_strategy: "hybrid"     # split | fanout | tiered | hybrid | graph | vector | multi
  match_score_threshold: 0.6
  max_results: 50

DNA COMPLIANCE:
  ✅ DNA-2: BuildSearchFilter on ES profile query (empty field skipping)
  ✅ DNA-5: tenantId on all ES queries
  ✅ DNA-3: DataProcessResult

REUSABLE IN:  T181, T476, any discovery ranking flow
AF-4 KEYWORDS: talent match, RAG scoring, rank, discovery, hybrid search
```

---

### SK-102 — Idempotent Token Spend Pattern

```
PATTERN:    Atomic token deduction with idempotency key — immutable ledger journal
ARCHETYPE:  VALIDATION
FABRICS:    DATABASE FABRIC (PG — immutable token ledger)

PROBLEM SOLVED:
  Network retries can trigger double-spend on token wallets.
  Must guarantee exactly-once deduction regardless of retry count.

IMPLEMENTATION PATTERN:
  1. Compute idempotencyKey = hash(userId + operationId + amount)
  2. Begin PG transaction
  3. Attempt INSERT into token_ledger (userId, idempotencyKey UNIQUE, amount, type=SPEND)
  4. ON CONFLICT (idempotencyKey) → SELECT existing row → return same DataProcessResult (idempotent)
  5. Validate balance: SELECT SUM(amount) WHERE userId — if insufficient, rollback, return INSUFFICIENT
  6. COMMIT
  7. Emit token.spent event to QUEUE FABRIC via outbox

KEY CONSTRAINT:
  UNIQUE constraint on (userId, idempotencyKey) enforced at DB level — not just application level.
  This is the only safe guarantee for concurrent retry safety.

DNA COMPLIANCE:
  ✅ DNA-3: DataProcessResult — never throw for business logic (balance, duplicate key)
  ✅ DNA-5: tenantId + userId scoped

REUSABLE IN:  T183, T184, F471, any tokenised spend flow
AF-4 KEYWORDS: token spend, idempotency, wallet, connect, deduct, immutable ledger
```

---

### SK-103 — Escrow Saga with Compensation

```
PATTERN:    Multi-step durable saga for escrow operations with rollback compensation
ARCHETYPE:  ESCROW_SAGA
FABRICS:    DATABASE FABRIC (PG) + QUEUE FABRIC

PROBLEM SOLVED:
  Milestone funding involves F492 escrow hold, F493 ledger entry, F496 fee calculation.
  If any step fails mid-saga, prior steps must compensate to avoid orphaned funds.

SAGA STEPS:
  Step 1: F491 CreateMilestone — compensation: F491 delete draft milestone
  Step 2: F496 CalculateFee — compensation: discard fee calculation (no side-effects)
  Step 3: F492 HoldFunds (idempotent) — compensation: F492 ReverseHold
  Step 4: F493 JournalEntry(FUND) — compensation: F493 JournalEntry(FUND_REVERSED) [append-only reversal]
  Step 5: Emit milestone.funded to QUEUE FABRIC

COMPENSATION INVARIANT:
  F493 compensation = append new FUND_REVERSED entry (never delete FUND entry).
  Immutable ledger maintained even during compensation.

FORWARD RECOVERY:
  Each saga step writes to StepInstance table before executing.
  On restart: replay from last incomplete StepInstance.
  Idempotency keys ensure replay safety.

DNA COMPLIANCE:
  ✅ DNA-3: DataProcessResult on every step
  ✅ DNA-5: tenantId + contractId + milestoneId scoped
  ✅ SK-104: Uses Durable Money-Safe Ledger pattern

REUSABLE IN:  T188, T190, T193, any multi-step money saga
AF-4 KEYWORDS: escrow saga, compensation, fund release, idempotent money, saga rollback
```

---

### SK-104 — Durable Money-Safe Ledger

```
PATTERN:    Append-only double-entry journal with idempotency for all financial movements
ARCHETYPE:  ESCROW_SAGA
FABRICS:    DATABASE FABRIC (PG — append-only with UNIQUE idempotency constraint)

PROBLEM SOLVED:
  Mutable balance fields can corrupt under concurrent updates or partial failures.
  Immutable ledger journal is the only safe pattern for money tracking.

IMPLEMENTATION PATTERN:
  Table: escrow_ledger
    id             UUID PK
    tenant_id      UUID NOT NULL (DNA-5)
    contract_id    UUID NOT NULL
    milestone_id   UUID NOT NULL
    entry_type     ENUM(FUND, RELEASE, REFUND, FEE, PAYOUT, FUND_REVERSED, PRIZE_RELEASE)
    amount         DECIMAL(18,6) NOT NULL
    currency       VARCHAR(3) NOT NULL
    idempotency_key VARCHAR(255) UNIQUE NOT NULL
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- NO UPDATED_AT — append only, never update

  CONSTRAINTS:
    UNIQUE(idempotency_key)               -- prevents duplicate entries
    CHECK (amount != 0)                   -- zero-amount entries are logic errors
    NO DELETE GRANT on table              -- enforced at DB role level, not just app level

BALANCE QUERY:
  SELECT SUM(CASE WHEN entry_type IN ('FUND','PRIZE_RELEASE') THEN amount
                  WHEN entry_type IN ('RELEASE','REFUND','FEE','PAYOUT','FUND_REVERSED') THEN -amount
             END) AS balance
  FROM escrow_ledger
  WHERE milestone_id = :milestone_id AND tenant_id = :tenant_id

DNA COMPLIANCE:
  ✅ DNA-1: No typed EscrowLedgerEntry model — query result as Dictionary<string,object>
  ✅ DNA-5: tenant_id on every row
  ✅ DNA-3: DataProcessResult — duplicate idempotency key = same result, not exception

REUSABLE IN:  F493, T188, T190, T193, T196, any ledger-based financial flow
AF-4 KEYWORDS: ledger, journal, append-only, immutable, idempotency key, double-entry
```

---

### SK-105 — Dispute Hold & Lifecycle

```
PATTERN:    Atomic dispute creation + escrow hold placement; full dispute lifecycle management
ARCHETYPE:  VALIDATION
FABRICS:    DATABASE FABRIC (PG) + QUEUE FABRIC

PROBLEM SOLVED:
  Dispute open and escrow hold must be atomic — a released-before-hold race condition
  can allow funds to escape before dispute is active.

IMPLEMENTATION PATTERN:
  1. Begin PG transaction
  2. INSERT dispute record (status=OPEN, milestoneId, tenantId)
  3. INSERT dispute_hold record (milestoneId, status=ACTIVE)
  4. UPDATE escrow_state: blocked=true (F492 checks this before any release)
  5. COMMIT
  6. Emit dispute.opened via outbox → QUEUE FABRIC
  7. F502.ReleaseFundsAsync now returns ESCROW_HOLD_ACTIVE until hold lifted

HOLD LIFT (resolution):
  1. F506 decision confirmed
  2. F493 journal RESOLVE entry
  3. UPDATE dispute_hold: status=LIFTED
  4. F492 unblocked — release/refund proceeds

DNA COMPLIANCE:
  ✅ DNA-3: DataProcessResult on all dispute operations
  ✅ DNA-5: tenantId + contractId + milestoneId scoped

REUSABLE IN:  T191, T193, F502, F503
AF-4 KEYWORDS: dispute hold, escrow block, atomic hold, dispute lifecycle
```

---

### SK-106 — Work Evidence Capture Cycle

```
PATTERN:    Periodic durable timer-triggered evidence capture with privacy controls
ARCHETYPE:  EVIDENCE_CAPTURE
FABRICS:    DATABASE FABRIC (ES + PG) + QUEUE FABRIC + CORE FABRIC (object store ref)

PROBLEM SOLVED:
  Hourly billing evidence (screenshots, activity counts) must be captured periodically,
  stored with strict privacy controls, and made available for dispute evidence packaging.

IMPLEMENTATION PATTERN:
  1. Durable TimerInstance fires every N minutes (FREEDOM config)
  2. F501 captures activity counts (clicks, keystrokes count only — no content)
  3. F497 records time slot with activity summary + screenshot external ref
  4. Screenshot object stored in CORE FABRIC object store (not ES)
  5. F497 ES document: { tenantId, contractId, slotStart, slotEnd, activityCount, screenshotRef }
  6. F500 updates evidence package for this contract
  7. Access control: F497.GetWorkDiaryAsync verifies callerRole ∈ {CLIENT, FREELANCER, ADMIN}

PRIVACY RULES:
  - Screenshot = external object reference ONLY (CF-237)
  - Activity = numeric count ONLY (CF-238)
  - Access = contract parties ONLY (CF-236)
  - Retention = per F515 IDataRetentionService schedule

DNA COMPLIANCE:
  ✅ DNA-1: Slot document as Dictionary (no typed WorkDiarySlot model)
  ✅ DNA-5: tenantId + contractId on every record
  ✅ DNA-3: DataProcessResult

REUSABLE IN:  T195, F497, F498, F500, F501
AF-4 KEYWORDS: work diary, time tracking, evidence capture, screenshot ref, activity count
```

---

### SK-107 — KYC Gate with Policy Engine

```
PATTERN:    Compliance gate evaluation — KYC verification + enterprise policy + classification
ARCHETYPE:  VALIDATION
FABRICS:    DATABASE FABRIC (PG + ES) + AI ENGINE FABRIC

PROBLEM SOLVED:
  Contract activation requires a variable set of compliance checks depending on tenant type
  and jurisdiction. Hard-coding check order breaks multi-tenant flexibility.

IMPLEMENTATION PATTERN:
  1. F511 loads tenant compliance profile (tenantId, required gates, jurisdiction)
  2. F487 evaluates gate list:
     - KYC gate: F470.GetKYCStatusAsync → must = VERIFIED + not expired
     - Policy gate: F489.EvaluatePolicyAsync (per-tenant FREEDOM config rules)
     - Classification gate (ENTERPRISE only): F488.AssessClassificationRiskAsync
  3. All gates = PASSED → return DataProcessResult IsSuccess=true
  4. Any gate FAILED → return DataProcessResult IsSuccess=false, include gate failure list
  5. All gate evaluations recorded in F512 audit log

FREEDOM CONFIG:
  compliance_gates_required: ["kyc", "policy"]          # per tenant config in ES
  enterprise_gates_required: ["kyc", "policy", "classification"]
  kyc_expiry_days: 365
  classification_risk_threshold: "LOW"

DNA COMPLIANCE:
  ✅ DNA-3: DataProcessResult — never throw for compliance failure
  ✅ DNA-5: tenantId on every evaluation
  ✅ DNA-2: BuildSearchFilter on policy rule ES query

REUSABLE IN:  T187, T194, F487, F511
AF-4 KEYWORDS: KYC gate, compliance policy, activation gate, classification, hard stop
```

---

### SK-108 — Multi-Aggregate Flow Saga

```
PATTERN:    Single flow instance coordinating multiple domain aggregates with correlation
ARCHETYPE:  DURABLE_SAGA
FABRICS:    FLOW ENGINE FABRIC (Skill 09) + QUEUE FABRIC

PROBLEM SOLVED:
  A contract flow spans Job → Proposal → Contract → Milestone → Escrow → Dispute.
  The flow orchestrator must correlate all aggregates in one execution narrative.

IMPLEMENTATION PATTERN:
  FlowInstance:
    id: UUID
    flow_key: "contract-escrow-v1"
    subject_refs: [
      { type: "job",      id: jobId },
      { type: "proposal", id: proposalId },
      { type: "contract", id: contractId },
      { type: "milestone",id: milestoneId }
    ]
    correlation_id: UUID         # spans all events for observability
    current_state: "MILESTONE_IN_REVIEW"
    tenant_id: UUID              # DNA-5

  Correlation:
    Every domain event includes correlation_id + tenant_id
    FlowOrchestrator (Skill 09) matches events to FlowInstance via subject_refs

  State persistence:
    StepInstance table: one row per step execution
    Each step idempotent — safe to replay from any StepInstance on restart

DNA COMPLIANCE:
  ✅ DNA-5: tenantId on FlowInstance + every StepInstance
  ✅ DNA-3: DataProcessResult on each step
  ✅ EP-4: Cursor/state persist before advancing (from FLOW-14)

REUSABLE IN:  T188–T193, any multi-aggregate saga across flows
AF-4 KEYWORDS: multi-aggregate, flow instance, correlation, saga, subject refs
```

---

### SK-109 — Contest Handover & IP Transfer

```
PATTERN:    IP ownership transfer gate — mandatory before prize release
ARCHETYPE:  MARKETPLACE
FABRICS:    DATABASE FABRIC (PG immutable) + QUEUE FABRIC

PROBLEM SOLVED:
  Contest prize must not release before intellectual property ownership is legally transferred.
  Transfer record must be immutable (certifiable for legal/compliance purposes).

IMPLEMENTATION PATTERN:
  1. F482 awards winner (contest.winner.awarded event)
  2. F483 initiates handover: creates handover_request record (status=PENDING)
  3. Both parties acknowledge transfer (winner signs off on ownership transfer)
  4. F516 records IP transfer: INSERT ip_transfer (immutable, CERTIFIED status)
  5. F516.CertifyTransferAsync → status locked, no further updates
  6. ownership.transferred event emitted to QUEUE FABRIC
  7. F492 prize release NOW permitted (CF-227 gate checks F516 status)

IMMUTABILITY:
  ip_transfer table: INSERT only. No UPDATE after status=CERTIFIED.
  Enforced via CHECK constraint: UPDATE blocked if current status = CERTIFIED.

DNA COMPLIANCE:
  ✅ DNA-1: Handover document = Dictionary<string,object>
  ✅ DNA-5: tenantId + contestId on every record
  ✅ DNA-3: DataProcessResult

REUSABLE IN:  T196, F483, F516
AF-4 KEYWORDS: contest handover, IP transfer, ownership transfer, prize release gate
```

---

### SK-110 — Reputation Aggregation Engine

```
PATTERN:    Immutable review journal → derived reputation score → tier evaluation
ARCHETYPE:  REPUTATION
FABRICS:    DATABASE FABRIC (PG journal + ES score index)

PROBLEM SOLVED:
  Reputation must be trustworthy — reviews immutable, score derived (not stored as mutable),
  tier computed from score with configurable thresholds.

IMPLEMENTATION PATTERN:
  1. F467 receives new review: INSERT into review_journal (immutable append)
  2. Score recomputation:
     SELECT weighted_avg(rating * weight) FROM review_journal WHERE freelancerId = :id AND tenantId = :tid
     Score weights per category from FREEDOM config (not hardcoded)
  3. Write computed score to ES profile index (upsert — this IS mutable, but derived)
  4. F472 evaluates tier: score >= tier_threshold → promote/demote tier record
  5. F475 updates profile search index with new score + tier
  6. reputation.updated event emitted

REVIEW IMMUTABILITY:
  review_journal: INSERT only. UNIQUE (contractId, reviewerId) — one review per contract per party.
  No UPDATE after insertion. Score is always recomputed, never patched.

FREEDOM CONFIG:
  tier_thresholds: { top_rated: 4.8, rising_talent: 4.5, preferred: 4.2 }
  score_weights: { quality: 0.4, communication: 0.3, deadline: 0.3 }

DNA COMPLIANCE:
  ✅ DNA-1: Review document = Dictionary<string,object>
  ✅ DNA-5: tenantId + freelancerId scoped
  ✅ DNA-3: DataProcessResult

REUSABLE IN:  T197, F467, F472
AF-4 KEYWORDS: reputation, review, score, tier, immutable journal, aggregation
```

---

## AF-4 RAG RETRIEVAL INDEX FOR FLOW-15

When the AF-4 station searches for patterns relevant to FLOW-15 task types, it should retrieve:

| Query Keywords | Skills Retrieved | Task Types Relevant |
|---------------|-----------------|---------------------|
| job enrich, skill extract, AI taxonomy | SK-99 | T179, T474 |
| publish, idempotent, outbox, index | SK-100 | T180 |
| match, talent, RAG, scoring | SK-101 | T181 |
| token, spend, idempotency, wallet | SK-102 | T183, T184 |
| escrow, saga, fund, release, compensation | SK-103 | T188, T190, T193 |
| ledger, append-only, immutable, double-entry | SK-104 | T188, T190, T193, T196 |
| dispute, hold, evidence, arbitration | SK-105 | T191, T192, T193 |
| work diary, time tracking, evidence, screenshot | SK-106 | T195 |
| KYC, compliance, gate, policy, activation | SK-107 | T187, T194 |
| multi-aggregate, flow correlation, saga | SK-108 | T188–T193 |
| contest, IP transfer, handover, prize | SK-109 | T196 |
| reputation, review, score, tier | SK-110 | T197 |

### Cross-Reference with Prior Flow Skills (always check before regenerating):
| Prior Skill | Reusable for FLOW-15 |
|-------------|---------------------|
| SK-37–SK-43 (FLOW-09 search patterns) | F475 ISearchIndexService — reuse, do not regenerate |
| SK-89–SK-98 (FLOW-14 warehouse patterns) | F512 audit + F513 report queries — extend, do not duplicate |
| SK-79–SK-88 (FLOW-13 patterns) | AI pipeline patterns reusable in SK-99 |

---

## BACKWARD COMPATIBILITY

```
SK-1–SK-98:    UNCHANGED ✅
SK-99–SK-110:  NEW in FLOW-15  (+12 skills)
```

---

## SAVE POINT: FLOW15:P4:SKILLS_FACTORY_RAG ✅
## Next: Load FLOW15_P5_UNIFIED_SOURCE_INDEX
