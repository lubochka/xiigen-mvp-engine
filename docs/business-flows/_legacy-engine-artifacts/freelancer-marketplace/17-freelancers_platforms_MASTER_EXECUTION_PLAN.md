# 17 — Freelancer Marketplace Platform — MASTER EXECUTION PLAN
## FLOW-15 | P6 | Full Engine Extension Summary + AF Station Mapping + BFA Registration
## Continues from FLOW-14 (F465/T178/CF-213/SK-98/DD-85/DR-65)

---

## PHASE MAP (Recovery Reference)

| Phase | File | Save Point | Content |
|-------|------|------------|---------|
| P1 | 17_freelancers_platforms_ENGINE_ARCHITECTURE.md | FLOW15:P1:ENGINE_ARCHITECTURE ✅ | F466–F516, Families 60–68, DNA checks |
| P2 | 17_freelancers_platforms_TASK_TYPES_CATALOG.md | FLOW15:P2:TASK_TYPES ✅ | T179–T198, AF maps, Templates 36–39 |
| P3 | 17_freelancers_platforms_V62_BFA_STRESS_TEST.md | FLOW15:P3:BFA_STRESS_TEST ✅ | CF-214–CF-238, ST-104–ST-118 |
| P4 | 17_freelancers_platforms_SKILLS_FACTORY_RAG.md | FLOW15:P4:SKILLS_FACTORY_RAG ✅ | SK-99–SK-110, AF-4 RAG index |
| P5 | 17_freelancers_platforms_UNIFIED_SOURCE_INDEX.md | FLOW15:P5:UNIFIED_SOURCE_INDEX ✅ | DD-86–DD-99, DR-66–DR-75 |
| **P6** | **17_freelancers_platforms_MASTER_EXECUTION_PLAN.md** | **FLOW15:P6:MASTER_PLAN ✅** | **This file** |

---

## FLOW-15 DELTA SUMMARY

```
BEFORE (Post-FLOW-14):
  Factories:      F1–F465     (465 total)
  Families:       1–59        (59 total)
  Task Types:     T1–T178     (178 total)
  Templates:      1–35        (35 total)
  BFA Rules:      CF-1–CF-213 (213 total)
  Stress Tests:   ST-1–ST-103 (103 total)
  Skill Patterns: SK-1–SK-98  (98 total)
  Design Decs:    DD-1–DD-85  (85 total)
  Design Records: DR-1–DR-65  (65 total)

AFTER (Post-FLOW-15):
  Factories:      F1–F516     (+51)   → Families 60–68 (F466–F516)
  Task Types:     T1–T198     (+20)   → T179–T198
  Templates:      1–39        (+4)    → Templates 36–39
  BFA Rules:      CF-1–CF-238 (+25)   → CF-214–CF-238
  Stress Tests:   ST-1–ST-118 (+15)   → ST-104–ST-118
  Skill Patterns: SK-1–SK-110 (+12)   → SK-99–SK-110
  Design Decs:    DD-1–DD-99  (+14)   → DD-86–DD-99
  Design Records: DR-1–DR-75  (+10)   → DR-66–DR-75
```

---

## FLOW-15 NEW ARCHETYPES

| Archetype | First Task Type | Description |
|-----------|----------------|-------------|
| ESCROW_SAGA | T188 | Multi-step durable saga with financial compensation |
| EVIDENCE_CAPTURE | T195 | Periodic durable timer-triggered evidence harvest |
| REPUTATION | T197 | Aggregated signal computation from immutable review journals |
| ENTERPRISE_COMPLIANCE | T194, T198 | Multi-gate policy + KYC + classification validation |

---

## AF STATION MAPPING — FLOW-15 OPERATION

### How each AF station operates on FLOW-15 task types

---

#### AF-1 (Genesis) — Code Generation from Spec

For every FLOW-15 task type (T179–T198), AF-1 generates services that:
- Extend `MicroserviceBase` (Skill 01 — CORE FABRIC, DNA-4)
- Call factories via `CreateAsync(FactoryResolutionContext)`, never direct imports
- Return `DataProcessResult<Dictionary<string,object>>` — never throw for business logic (DNA-3)
- Use `ParseDocument` for all incoming payloads (DNA-1)
- Scope every DB query with `tenantId` (DNA-5)
- Never emit to queue directly — always through `IQueueService.EnqueueAsync()` (QUEUE FABRIC)

Key generation patterns by domain:
```
T179–T185 (Marketplace):    AF-1 generates JobService, ProposalService on DATABASE + AI ENGINE + RAG FABRIC
T186–T193 (Contract/Escrow): AF-1 generates saga orchestrators on DATABASE + QUEUE FABRIC (SK-103, SK-108)
T194–T196 (Compliance/IP):   AF-1 generates gate services on DATABASE + AI ENGINE FABRIC (SK-107)
T197–T198 (Analytics):       AF-1 generates aggregation services on DATABASE FABRIC append-only patterns (SK-110)
```

---

#### AF-2 (Planning) — Step Decomposition

AF-2 decomposes each FLOW-15 task type into execution steps, paying special attention to:

| Task Type | Planning Note |
|-----------|--------------|
| T183 (Proposal Submission) | Split: token balance check → deduct (idempotent) → proposal store → index |
| T186 (Contract Offer) | Split: contract create → BFA check → KYC gate → terms lock |
| T188 (Milestone Funding) | Split saga: create → fee calc → hold (idempotent) → ledger journal → emit |
| T191 (Dispute Open) | Split: atomic dispute + hold in one transaction → notify → evidence init |
| T195 (Work Evidence) | Split: timer tick → capture → store ref → evidence package → access check |

For ESCROW_SAGA archetypes, AF-2 generates explicit compensation steps for each forward step.

---

#### AF-3 (Prompt Library) — Domain-Specific Prompts

FLOW-15 prompt categories registered in AF-3:

| Category | Trigger | Example Prompts |
|----------|---------|-----------------|
| `marketplace.job_enrich` | T179, SK-99 | "Extract skill taxonomy from: {job_description}" |
| `marketplace.proposal_rank` | T185, SK-101 | "Score proposal fit for job requirements: {requirements}, {proposal}" |
| `compliance.kyc_assess` | T194, SK-107 | "Evaluate worker classification risk for contract: {contract_details}" |
| `reputation.review_extract` | T197, SK-110 | "Identify sentiment signals from review text: {review_text}" |

All prompts stored as `Dictionary<string,object>` in ES prompt index — no hardcoded strings.

---

#### AF-4 (RAG — Task Context) — Skill Pattern Retrieval

FLOW-15 AF-4 retrieval table (new SK-99–SK-110 + most relevant prior skills):

| Generating Task | Top AF-4 Results | Rationale |
|----------------|-----------------|-----------|
| T179 (Job Enrich) | SK-99, SK-37 (FLOW-09 search) | Multi-model AI enrichment + ES taxonomy search |
| T180 (Publish Gate) | SK-100, SK-38 | Idempotent outbox publish + search index |
| T181 (Talent Match) | SK-101, SK-44 (FLOW-10) | RAG strategy matching + scoring |
| T183 (Proposal Sub.) | SK-102, SK-56 (FLOW-11 payment) | Idempotent token spend + wallet |
| T186–T190 (Contract) | SK-103, SK-104, SK-108 | Escrow saga + ledger + multi-aggregate |
| T191–T193 (Dispute) | SK-105, SK-104 | Dispute hold + immutable ledger |
| T194–T195 (Compliance) | SK-107, SK-106 | KYC gate + work evidence capture |
| T196 (Contest) | SK-109, SK-104 | IP transfer + immutable record |
| T197 (Reputation) | SK-110, SK-37 | Reputation aggregation + ES index |

---

#### AF-5 (Multi-Model Orchestration) — Competing Models

For FLOW-15 AI-intensive steps, AF-5 dispatches parallel models via AiDispatcher (Skill 07):

| Task Type | Models Dispatched | Consensus Strategy |
|-----------|------------------|-------------------|
| T179 (Job Enrich) | Claude + GPT-4o | Skill present in ≥2 models = confirmed |
| T181 (Talent Match scores) | Claude + Gemini | Average score across providers |
| T194 (Classification risk) | Claude + GPT-4o | Conservative: take higher risk rating |
| T185 (Proposal rank) | Claude + GPT-4o | Weighted average with feedback loop (AF-11) |

Non-AI steps (T183 token spend, T188 escrow saga) bypass AF-5 — deterministic, not AI-generated.

---

#### AF-6 (Code Review) — Automated Review

AF-6 checks FLOW-15 generated services for:
- All factory calls use `CreateAsync()`, no direct provider instantiation
- No direct `throw` for business logic (DataProcessResult wraps all errors)
- All DB queries include `tenantId` filter
- No typed model classes (only `Dictionary<string,object>`)
- Saga steps each have compensation handler registered before execution

FLOW-15-specific review gates:
- `IEscrowLedgerService`: No UPDATE/DELETE allowed — INSERT only (SK-104)
- `IReviewJournalService`: UNIQUE constraint on (contractId, reviewerId) enforced
- `IIPTransferService`: No UPDATE after CERTIFIED status

---

#### AF-7 (Compliance) — DNA Pattern Enforcement

DNA compliance checks for every FLOW-15 generated file:

| DNA Law | FLOW-15 Application |
|---------|-------------------|
| DNA-1 (ParseDocument) | Job docs, proposal docs, contract docs — all Dictionary, no typed models |
| DNA-2 (BuildSearchFilter) | Profile search, job search, talent match — all empty-field-skipping |
| DNA-3 (DataProcessResult) | Insufficient tokens, KYC failed, escrow conflict — all Result, never throw |
| DNA-4 (MicroserviceBase) | Every new service (F466–F516) extends MicroserviceBase |
| DNA-5 (Scope Isolation) | tenantId on every ES query, PG query, ledger row |
| DNA-6 (DynamicController) | No IJobController, IContractController — all via DynamicController |

Additional FLOW-15 DNA patterns (from DD-86–DD-96):
- Immutable ledger pattern (SK-104): no UPDATE on financial tables
- Idempotency key pattern (SK-102, SK-100): all financial + publish operations

---

#### AF-8 (Security) — Security Scan

FLOW-15 security gates:

| Gate | Enforcement |
|------|------------|
| Token wallet double-spend | Idempotency key UNIQUE at DB level (SK-102) |
| Escrow fund release | CF-220 requires milestone status = COMPLETED |
| Work diary access | Restricted to contract parties only (CF-236) |
| Screenshot content | External ref only — no raw binary in ES (CF-237) |
| KYC expiry | KYC status checked at contract activation, not just at KYC submission |
| IP transfer | No prize release without F516 CERTIFIED status (CF-227) |

---

#### AF-9 (Judge — Quality Context) — Iron Rule Validation

AF-9 validates FLOW-15 generated code against all applicable Iron Rules.
Key quality gates by domain:

| Domain | Critical QG | Failure = |
|--------|------------|-----------|
| Marketplace | QG-179-1: Skill confidence ≥ threshold before publish | BUILD FAILURE |
| Token economy | QG-183-1: Balance check before deduction, idempotency key present | BUILD FAILURE |
| Escrow | QG-188-1: Compensation handler for every saga step | BUILD FAILURE |
| Compliance | QG-187-1: KYC status = VERIFIED before contract activation | BUILD FAILURE |
| Dispute | QG-191-1: Dispute + hold in single DB transaction (atomic) | BUILD FAILURE |
| Reputation | QG-197-1: Review journal append-only, score derived not stored | BUILD FAILURE |

---

#### AF-10 (Merge) — Multi-Model Output Combination

For FLOW-15 AI outputs:
- Job enrichment: consensus merge — skill present in ≥2 models = confirmed tag
- Proposal ranking: weighted average merge — weights from FREEDOM config
- Classification risk: conservative merge — use highest risk rating across models
- Review sentiment: majority vote — signal present in ≥2 models

All merge results stored in ES via AiDispatcher result store, linked to traceId for AF-11 feedback loop.

---

#### AF-11 (Feedback) — Generation Quality Storage

FLOW-15 feedback signals stored for continuous improvement:

| Signal | Source | Injected Into |
|--------|--------|--------------|
| Proposal acceptance rate | Contract created after proposal | T185 ranking quality score |
| Job fill rate | Contract created within N days | T179 enrichment quality score |
| Dispute rate per contract | Dispute opened | T186 contract quality |
| Review volume and score | T197 reviews | T181 matching quality |

AF-11 stores feedback as `Dictionary<string,object>` in ES feedback index.
AiDispatcher (Skill 07) injects top-scoring patterns into future prompts via PromptContextBuilder.

---

## BFA REGISTRATION — FLOW-15 NEW ENTITIES, EVENTS, APIS

These must be indexed in BFA registry before FLOW-15 services deploy:

### New Entity Types (BFA index: `bfa_entities`)
```
job              tenantId, jobId, status, skills[], clientId
proposal         tenantId, proposalId, jobId, freelancerId, tokens_spent
contract         tenantId, contractId, jobId, proposalId, status
milestone        tenantId, milestoneId, contractId, status, escrow_state
escrow_ledger    tenantId, milestoneId, entry_type, amount (append-only)
dispute          tenantId, disputeId, contractId, milestoneId, status
work_diary_slot  tenantId, contractId, slotStart, slotEnd, activityCount
review_journal   tenantId, contractId, freelancerId, rating, created_at
ip_transfer      tenantId, contestId, winnerId, status (CERTIFIED = immutable)
```

### New Domain Events (BFA index: `bfa_events`)
```
job.created              → T179 output
job.enriched             → T179 output → T180 trigger
job.published            → T180 output → T181 trigger
talent.matched           → T181 output
invite.sent              → T182 output
proposal.submitted       → T183 output
proposal.boosted         → T184 output (optional)
proposal.shortlisted     → T185 output → contract flow trigger
contract.offered         → T186 output
contract.activated       → T187 output
milestone.funded         → T188 output → T195 trigger (periodic)
milestone.submitted      → T189 output → T190 trigger
milestone.released       → T190 output
milestone.refunded       → T190 output (alternate path)
dispute.opened           → T191 output
evidence.packaged        → T192 output
dispute.resolved         → T193 output
kyc.verified             → T194 output
work_diary.slot.captured → T195 output (periodic)
contest.winner.awarded   → T196 output
ownership.transferred    → T196 output → prize release trigger
reputation.updated       → T197 output
compliance.report.ready  → T198 output
```

### New API Surfaces (BFA index: `bfa_apis`)
```
POST /jobs                   → F473 CreateJobAsync
PUT  /jobs/{id}/publish      → F473 PublishJobAsync (gate: T180)
GET  /jobs/match             → F476 MatchTalentAsync
POST /proposals              → F479 SubmitProposalAsync (gate: T183 — token check)
POST /proposals/{id}/boost   → F480 BoostProposalAsync
POST /contracts              → F485 CreateContractAsync
PUT  /contracts/{id}/activate → F487 ActivateContractAsync (gate: T187)
POST /milestones/{id}/fund   → F492 FundMilestoneAsync (gate: T188)
POST /milestones/{id}/submit → F499 SubmitDeliverableAsync (gate: T189)
POST /milestones/{id}/release → F492 ReleaseFundsAsync (gate: T190)
POST /disputes               → F502 OpenDisputeAsync (gate: T191 — atomic hold)
POST /disputes/{id}/resolve  → F506 ResolveDisputeAsync (gate: T193)
GET  /work-diary/{contractId} → F497 GetWorkDiaryAsync (access: contract parties only)
POST /contests/{id}/handover → F483 InitiateHandoverAsync (gate: T196)
GET  /reputation/{freelancerId} → F467 GetReputationSummaryAsync
```

---

## CROSS-FLOW DEPENDENCY MAP

### FLOW-15 depends on:

| Flow | Dependency | Gate Event |
|------|-----------|------------|
| FLOW-01 (User Registration) | User must be onboarded before creating freelancer/client profile | UserOnboardingCompleted |
| FLOW-08 (Multi-tenant) | Tenant isolation fabric — F461 ITenantWarehouseIsolationService pattern | TenantProvisioned |
| FLOW-11 (Commerce) | Payment processing for escrow funding — F492 calls underlying payment fabric | PaymentMethodActive |
| FLOW-14 (DWH) | Compliance reports (T198) pull data from warehouse marts — F513 IEnterpriseReportService | WarehouseReady |

### Downstream flows that depend on FLOW-15:

| Downstream | What It Needs | Provided By |
|-----------|--------------|-------------|
| Any future review aggregation | Immutable review_journal | T197 / F467 |
| Any future compliance audit | KYC records + audit log | T194 / F512 |
| Any future analytics flow | Job/contract/reputation events | All T179–T198 events |

---

## FLOW-15 IRON RULES SUMMARY (Non-negotiable across all task types)

| ID | Rule | Enforcement |
|----|------|-------------|
| IR-15-1 | No contract activation without KYC = VERIFIED | T187, T194, CF-219 |
| IR-15-2 | No proposal without sufficient token balance | T183, CF-221 |
| IR-15-3 | No escrow release without milestone status = COMPLETED | T190, CF-220 |
| IR-15-4 | No prize release without F516 CERTIFIED IP transfer | T196, CF-227 |
| IR-15-5 | Dispute open + escrow hold = single atomic transaction | T191, CF-228 |
| IR-15-6 | All ledger writes append-only — no UPDATE/DELETE | SK-104, CF-222 |
| IR-15-7 | Work diary: screenshot = external ref only (no inline binary) | T195, CF-237 |
| IR-15-8 | Work diary: access restricted to contract parties | T195, CF-236 |
| IR-15-9 | Token spend always idempotency-key protected | SK-102, CF-222 |
| IR-15-10 | All financial entries include tenantId (DNA-5) | DNA-5, CF-238 |

---

## FLOW TEMPLATE EXECUTION PATHS

### Template 36 — marketplace-v1 (Job → Shortlist)
```
T179 (enrich) → T180 (publish) → T181 (match) → T182 (invite) →
T183 (propose) → T184 (boost, optional) → T185 (shortlist) → [contract-escrow-v1]
```

### Template 37 — contract-escrow-v1 (Contract → Release)
```
T186 (offer) → T194 (KYC gate) → T187 (activate) → T188 (fund milestone) →
T195 (work evidence, periodic) → T189 (submit deliverable) →
T190 (review + release) → [dispute-resolution-v1 if disputed]
```

### Template 38 — dispute-resolution-v1
```
T191 (open + hold) → T192 (evidence package) → T193 (arbitrate + resolve)
```

### Template 39 — enterprise-compliance-v1
```
T194 (KYC + classification) → T197 (reputation update) → T198 (compliance report)
```

---

## BACKWARD COMPATIBILITY CHECK

```
F1–F465:    UNCHANGED ✅  (pre-FLOW-15 factories, all families 1–59 intact)
T1–T178:    UNCHANGED ✅  (pre-FLOW-15 task types, all AF maps preserved)
Tpl 1–35:   UNCHANGED ✅  (pre-FLOW-15 flow templates)
CF-1–CF-213: UNCHANGED ✅ (pre-FLOW-15 BFA conflict rules)
ST-1–ST-103: UNCHANGED ✅ (pre-FLOW-15 stress tests)
SK-1–SK-98:  UNCHANGED ✅ (pre-FLOW-15 skill patterns)
DD-1–DD-85:  UNCHANGED ✅ (pre-FLOW-15 design decisions)
DR-1–DR-65:  UNCHANGED ✅ (pre-FLOW-15 design records)
DNA-1–DNA-9: STABLE ✅   (no new DNA laws — FLOW-15 adds immutable ledger as named pattern, not new law)
EP-1–EP-5:   STABLE ✅   (EP-4 cursor/state persist consumed again by T188 saga; no new EPs)
```

---

## UPDATED SESSION STATE — POST FLOW-15

```
FACTORIES:        F1–F516     (516 total, Families 1–68)
TASK TYPES:       T1–T198     (198 total)
FLOW TEMPLATES:   1–39        (39 total)
BFA CONFLICT:     CF-1–CF-238 (238 rules)
STRESS TESTS:     ST-1–ST-118 (118 total)
SKILL PATTERNS:   SK-1–SK-110 (110 total)
DESIGN DECISIONS: DD-1–DD-99  (99 total)
DESIGN RECORDS:   DR-1–DR-75  (75 total)
IRON RULES:       ~1,564      (+160: 8 per T × 20 task types)
QUALITY GATES:    ~1,340      (+120: 6 per T × 20 task types)
AF STATION CELLS: ~2,178      (+220: 11 stations × 20 task types)
DNA COMPLIANCE:   ~2,320      (+200 from FLOW-15)
METHODS:          ~2,430      (+200 from FLOW-15)
```

---

## RECOVERY COMMANDS

```
Resume FLOW-15 review:       "All FLOW-15 phases complete. Load SESSION_STATE and review FLOW-15"
Reload marketplace skills:   "Load SK-99–SK-110 for freelancer marketplace patterns"
Check escrow rules:          "Load CF-214–CF-238 for marketplace conflict rules"
Load FLOW-15 task types:     "Load T179–T198 engine contracts"
Load FLOW-15 factories:      "Load F466–F516 factory definitions, Families 60–68"
Check design records:        "Load DR-66–DR-75 for marketplace design records"
Start FLOW-16:               "Start FLOW-16 from F517, T199, CF-239 — see SESSION_STATE"
Merge FLOW-15 into canonical: "Start P7 — merge 17_freelancers_platforms_*.md into 7 canonical files"
```

---

## NEXT FLOW STARTING POINTS

```
FLOW-16: F517+ | T199+ | CF-239+ | ST-119+ | SK-111+ | DD-100+ | DR-76+ | Template 40+ | Family 69+
```

---

## SAVE POINT: FLOW15:P6:MASTER_PLAN ✅
## FLOW-15 COMPLETE ✅
## Next: Merge into canonical 7 files (P7), OR start FLOW-16
