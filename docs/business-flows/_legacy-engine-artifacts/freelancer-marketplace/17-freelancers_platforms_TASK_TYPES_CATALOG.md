# 17 — Freelancer Marketplace Platform — TASK TYPES CATALOG
## FLOW-15 | T179–T198 | 20 Task Types | 4 New Archetypes
## Continues from T178 (FLOW-14 last task type)

---

## NEW ARCHETYPES IN FLOW-15

| Archetype | First Task | Description |
|-----------|-----------|-------------|
| MARKETPLACE | T179 | Job/profile posting, discovery, and availability flows |
| ESCROW_SAGA | T188 | Durable money-safe saga with idempotency + hold/release/compensate |
| REPUTATION | T197 | Aggregated reputation signal computation from multiple event sources |
| EVIDENCE_CAPTURE | T195 | Periodic/event-triggered evidence collection with privacy controls |

---

## TASK TYPE: T179 — Job Draft & Enrichment Gate
```
ARCHETYPE:    MARKETPLACE
ENTRY:        Client submits job draft via API (DynamicController → FlowOrchestrator)
PURPOSE:      Validate draft fields, trigger AI skill extraction, produce enriched job document
DISTINCT FROM: T167 (connector registration — no AI enrichment), T180 (T179 must complete first)

FACTORY DEPENDENCIES:
  F473 IJobService              — store draft, validate required fields
  F474 IJobEnrichmentService    — AI skill extraction + category mapping
  F468 ISkillTaxonomyService    — normalise extracted skills to taxonomy

FABRIC RESOLUTION:
  F473 → DATABASE FABRIC (PG) + DATABASE FABRIC (ES) + QUEUE FABRIC
  F474 → AI ENGINE FABRIC (AiDispatcher, Skill 07) + DATABASE FABRIC (ES)
  F468 → DATABASE FABRIC (ES) + AI ENGINE FABRIC

AF CONFIGURATION:
  AF-1 Genesis:    Generate job draft validation + enrichment service stubs on fabrics
  AF-2 Planning:   Decompose: validate→enrich→normalise→store enriched document
  AF-3 Prompt Lib: Retrieve "job enrichment" domain prompts
  AF-4 RAG:        Search SK-99 (job enrichment pattern) for reusable extraction logic
  AF-5 Multi-model: Run skill extraction on Claude + GPT; consensus on skill tags
  AF-6 Review:     Check ParseDocument compliance, no typed Job model
  AF-7 Compliance: Verify DNA-1/DNA-5 (ParseDocument + tenantId)
  AF-8 Security:   Verify no PII stored in skill extraction prompt logs
  AF-9 Judge:      Validate enriched doc has skill array and category before advancing
  AF-10 Merge:     Combine multi-model skill tag outputs
  AF-11 Feedback:  Store enrichment quality signal for AF-5 model selection improvement

BFA VALIDATION:
  CF-214: Job draft must have tenantId before any enrichment starts
  CF-215: AI enrichment MUST NOT store raw job description in AI provider logs

MACHINE (fixed):   Draft validation rules, ParseDocument requirement, tenantId enforcement
FREEDOM (config):  AI model for enrichment, extraction confidence threshold, max skill tags, required fields per job type

IRON RULES:
  IR-179-1: Job CANNOT advance to T180 if skill extraction confidence < threshold
  IR-179-2: Job document MUST be Dictionary<string,object> — no typed class allowed
  IR-179-3: tenantId MUST be present on every stored document
  IR-179-4: Enrichment failure returns DataProcessResult with IsSuccess=false — never throws
  IR-179-5: AI provider resolved via config — never hardcoded model name in service code

QUALITY GATES (AF-9):
  QG-179-1: Enriched job has ≥1 skill tag from taxonomy
  QG-179-2: Category mapping present
  QG-179-3: All factory calls return DataProcessResult
  QG-179-4: No typed model classes in generated code
```

---

## TASK TYPE: T180 — Job Publish & Search Index Gate
```
ARCHETYPE:    MARKETPLACE
ENTRY:        Fires after T179 enrichment confirmed (job.enriched event via QUEUE FABRIC)
PURPOSE:      Publish job to search index, set visibility, emit job.published event
DISTINCT FROM: T179 (T179 enriches; T180 makes public), T169 (webhook ingestion, not publish gate)

FACTORY DEPENDENCIES:
  F473 IJobService              — update job status to PUBLISHED
  F475 ISearchIndexService      — index enriched job document for discovery
  F507 INotificationService     — notify matching freelancers (demand-side discovery)

FABRIC RESOLUTION:
  F473 → DATABASE FABRIC (PG + ES) + QUEUE FABRIC
  F475 → DATABASE FABRIC (ES) + QUEUE FABRIC
  F507 → QUEUE FABRIC + CORE FABRIC

AF CONFIGURATION:
  AF-1: Generate publish gate service: check enrichment complete → write ES index → emit event
  AF-4: RAG search SK-100 (idempotent publish pattern)
  AF-7: Verify DNA-5 (tenantId in all ES index writes), DNA-2 (BuildSearchFilter)
  AF-9: Verify job appears in search results after publish (index lag handled)

BFA VALIDATION:
  CF-216: Job publish event must not precede T179 enrichment completion

MACHINE: State transition PARSING→PUBLISHED enforced in F473
FREEDOM: Visibility rules (PUBLIC/INVITE_ONLY/PRIVATE), notification audience rules

IRON RULES:
  IR-180-1: Cannot publish if job.status ≠ PARSING_COMPLETE
  IR-180-2: Search index write uses BuildSearchFilter — empty fields auto-skipped
  IR-180-3: job.published event emitted to QUEUE FABRIC before returning success

QUALITY GATES:
  QG-180-1: Job appears in F475 search results after publish
  QG-180-2: QUEUE FABRIC event confirmed delivered
  QG-180-3: tenantId present in ES index document
```

---

## TASK TYPE: T181 — Talent Match Orchestrator
```
ARCHETYPE:    ORCHESTRATION
ENTRY:        Fires after job.published (subscribed via QUEUE FABRIC consumer group)
PURPOSE:      Rank and surface matched freelancers to client; support client search/browse
DISTINCT FROM: T182 (explicit invites — T181 is passive matching, T182 is active invite)

FACTORY DEPENDENCIES:
  F476 IMatchingService         — score + rank freelancers against job
  F475 ISearchIndexService      — retrieve talent profiles for scoring
  F466 IProfileService          — hydrate freelancer profiles for ranked results

FABRIC RESOLUTION:
  F476 → RAG FABRIC (Skill 00b — scoring) + DATABASE FABRIC (ES)
  F475 → DATABASE FABRIC (ES)
  F466 → DATABASE FABRIC (ES + PG)

AF CONFIGURATION:
  AF-1: Generate matching orchestrator on RAG FABRIC
  AF-4: RAG search SK-101 (talent matching pattern) + SK-37 (RAG scoring, FLOW-09 ref)
  AF-5: Multi-model scoring: Claude + GPT relevance scoring, consensus rank
  AF-9: Verify rank list has tenantId-scoped profiles only

BFA VALIDATION:
  CF-214: Matching query must include tenantId scope
  CF-217: Matched profiles must not cross tenant boundary (DNA-5)

IRON RULES:
  IR-181-1: Every search query uses BuildSearchFilter — empty fields skipped
  IR-181-2: Ranked list scoped to tenantId — cross-tenant profiles never surfaced
  IR-181-3: RAG strategy resolved via FREEDOM config (not hardcoded)

QUALITY GATES:
  QG-181-1: Ranked list returns DataProcessResult with count ≥ 0
  QG-181-2: All profiles in result belong to same tenant
  QG-181-3: RAG strategy selection is config-driven
```

---

## TASK TYPE: T182 — Invite Pipeline Gate
```
ARCHETYPE:    ORCHESTRATION
ENTRY:        Client explicitly sends invitation to specific freelancer for a job
PURPOSE:      Issue invitation, track acceptance/decline/expiry, trigger proposal fast-track
DISTINCT FROM: T181 (passive matching — T182 is active, targeted invite)

FACTORY DEPENDENCIES:
  F477 IInvitationService       — create, track, expire invitations
  F507 INotificationService     — deliver invitation notification
  F479 IProposalService         — fast-track accepted invitation to proposal pipeline

FABRIC RESOLUTION:
  F477 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F507 → QUEUE FABRIC + CORE FABRIC
  F479 → DATABASE FABRIC (PG) + QUEUE FABRIC

MACHINE: Invitation expiry enforced by durable timer (TimerInstance)
FREEDOM: Invitation expiry window, max concurrent invites per job, re-invite policy

IRON RULES:
  IR-182-1: Invitation expires via durable timer — no polling loop in service code
  IR-182-2: Accepted invitation auto-creates pre-filled proposal draft via F479
  IR-182-3: tenantId + jobId + freelancerId uniqueness enforced — no duplicate invites

QUALITY GATES:
  QG-182-1: Invitation event delivered to QUEUE FABRIC
  QG-182-2: Expiry timer registered in TimerInstance table
  QG-182-3: Duplicate invite returns DataProcessResult IsSuccess=false (not exception)
```

---

## TASK TYPE: T183 — Proposal Submission Gate
```
ARCHETYPE:    VALIDATION
ENTRY:        Freelancer submits proposal to published job
PURPOSE:      Validate eligibility, spend tokens (Connects), create proposal record
DISTINCT FROM: T184 (boost auction is a separate gate after T183 succeeds)

FACTORY DEPENDENCIES:
  F479 IProposalService         — create proposal record
  F471 ITokenWalletService      — deduct tokens (idempotent spend)
  F475 ISearchIndexService      — update ranking signals post-submission

FABRIC RESOLUTION:
  F479 → DATABASE FABRIC (PG) + QUEUE FABRIC + F471
  F471 → DATABASE FABRIC (PG immutable ledger) + QUEUE FABRIC
  F475 → DATABASE FABRIC (ES) + QUEUE FABRIC

AF CONFIGURATION:
  AF-4: RAG search SK-102 (idempotent token spend pattern)
  AF-7: Verify DNA-1 (no typed Proposal model), DNA-3 (DataProcessResult)
  AF-8: Security — verify token spend cannot be replayed (idempotency key)
  AF-9: Verify token balance > 0 before deduct; verify idempotency enforced

BFA VALIDATION:
  CF-218: Token spend must be atomic with proposal creation (single transaction scope)

IRON RULES:
  IR-183-1: Token spend and proposal creation are atomic (DB transaction scope)
  IR-183-2: Idempotency key required — duplicate submissions return same result, no double-spend
  IR-183-3: Insufficient tokens → DataProcessResult IsSuccess=false, code=INSUFFICIENT_TOKENS
  IR-183-4: Job must be in PUBLISHED status — reject if CLOSED or EXPIRED
  IR-183-5: Freelancer cannot submit to own job

QUALITY GATES:
  QG-183-1: Token ledger entry created in F471 immutable journal
  QG-183-2: Proposal status = SUBMITTED after gate
  QG-183-3: Idempotent: second call with same key returns original result
  QG-183-4: proposal.submitted event emitted to QUEUE FABRIC
```

---

## TASK TYPE: T184 — Token Spend & Boost Auction Gate
```
ARCHETYPE:    JOIN_GATE
ENTRY:        Fires after T183 success — freelancer optionally boosts proposal visibility
PURPOSE:      Accept optional extra token spend, compute boost rank, update ranking signals
DISTINCT FROM: T183 (submission gate — T184 is optional post-submission boost)

FACTORY DEPENDENCIES:
  F480 IProposalBoostService    — register boost, spend extra tokens
  F471 ITokenWalletService      — deduct boost tokens (idempotent)
  F481 IProposalRankingService  — update display rank with boost weight

FABRIC RESOLUTION:
  F480 → DATABASE FABRIC (PG) + F471 + F475
  F471 → DATABASE FABRIC (PG immutable ledger) + QUEUE FABRIC
  F481 → DATABASE FABRIC (ES) + AI ENGINE FABRIC

MACHINE: Boost token amount is fixed multiplier rules
FREEDOM: Max boost multiplier, auction competition window, boost duration

IRON RULES:
  IR-184-1: Boost requires proposal.status = SUBMITTED — cannot boost shortlisted/rejected proposal
  IR-184-2: Boost token spend is idempotent (idempotency key required)
  IR-184-3: Ranking update via F481 happens AFTER token spend confirmed
  IR-184-4: Boost is optional — T184 gate does not block flow if freelancer skips

QUALITY GATES:
  QG-184-1: Boost token ledger entry exists in F471
  QG-184-2: F481 rank updated with boost signal
  QG-184-3: proposal.boosted event in QUEUE FABRIC
```

---

## TASK TYPE: T185 — Proposal Shortlist Saga
```
ARCHETYPE:    DURABLE_SAGA
ENTRY:        Client shortlists proposal for interview consideration
PURPOSE:      Advance proposal to SHORTLISTED, create interview thread, notify freelancer
DISTINCT FROM: T183 (submission — T185 is client-side selection action)

FACTORY DEPENDENCIES:
  F479 IProposalService         — update proposal to SHORTLISTED
  F508 IMessagingService        — create interview thread
  F507 INotificationService     — notify freelancer of shortlist

FABRIC RESOLUTION:
  F479 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F508 → DATABASE FABRIC (ES) + QUEUE FABRIC
  F507 → QUEUE FABRIC + CORE FABRIC

SAGA COMPENSATION:
  If messaging thread creation fails → rollback proposal status to SUBMITTED
  Compensation event: proposal.shortlist.compensated

IRON RULES:
  IR-185-1: Proposal can only be shortlisted if status = SUBMITTED
  IR-185-2: Saga compensation must restore proposal.status to SUBMITTED on downstream failure
  IR-185-3: At most one active shortlist action per proposal (idempotent)

QUALITY GATES:
  QG-185-1: Messaging thread created and scoped to tenantId + jobId
  QG-185-2: proposal.shortlisted event in QUEUE FABRIC
  QG-185-3: Compensation event verifiable in audit trail
```

---

## TASK TYPE: T186 — Contract Offer & Activation Gate
```
ARCHETYPE:    PROVISIONING
ENTRY:        Client creates contract offer for shortlisted freelancer
PURPOSE:      Create contract in OFFERED state, trigger compliance evaluation, lock proposal
DISTINCT FROM: T187 (activation gate — T186 creates the offer; T187 activates it)

FACTORY DEPENDENCIES:
  F485 IContractService         — create contract record
  F487 IActivationGateService   — queue compliance checks (non-blocking at T186)
  F470 IKYCService              — retrieve current KYC status
  F489 ICompliancePolicyService — evaluate tenant policy gates

FABRIC RESOLUTION:
  F485 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F487 → CORE FABRIC + F470 + F489
  F470 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F489 → DATABASE FABRIC (ES policy docs) + DATABASE FABRIC (PG state)

MACHINE: Contract version pinned to definition version at offer time (F486)
FREEDOM: Required compliance gates per tenant, enterprise governance flags, billing type options

IRON RULES:
  IR-186-1: Contract creation must pin to current FlowDefinition version
  IR-186-2: Compliance gate evaluation is ASYNC — contract enters OFFERED, not blocked here
  IR-186-3: tenantId + clientId + freelancerId on every contract document

QUALITY GATES:
  QG-186-1: Contract record in DATABASE FABRIC with status=OFFERED
  QG-186-2: Compliance evaluation queued via QUEUE FABRIC
  QG-186-3: contract.offered event emitted
```

---

## TASK TYPE: T187 — Contract Activation Compliance Gate
```
ARCHETYPE:    VALIDATION
ENTRY:        Fires when compliance evaluation completes (kyc.verified + policy gates passed)
PURPOSE:      Activate contract — hard-stop if KYC/compliance not satisfied
DISTINCT FROM: T186 (offer creation — T187 is the activation decision gate)

FACTORY DEPENDENCIES:
  F485 IContractService         — transition status OFFERED→ACTIVE
  F487 IActivationGateService   — evaluate all gate statuses
  F470 IKYCService              — verify KYC status = VERIFIED
  F511 ITenantComplianceService — verify all tenant compliance gates passed
  F488 IWorkerClassificationService — check enterprise classification risk

FABRIC RESOLUTION:
  F485 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F487 → CORE FABRIC + F470 + F489 + F511
  F470 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F511 → DATABASE FABRIC (PG) + F470
  F488 → DATABASE FABRIC (ES) + AI ENGINE FABRIC

IRON RULES:
  IR-187-1: Contract CANNOT activate if KYC status ≠ VERIFIED (hard stop — CF-222)
  IR-187-2: Contract CANNOT activate if any required compliance gate = BLOCKED
  IR-187-3: Blocked activation returns DataProcessResult IsSuccess=false with gate list
  IR-187-4: Enterprise worker classification risk MUST be below threshold (CF-223)
  IR-187-5: All gate evaluations go through F487 — never bypass to individual services

QUALITY GATES:
  QG-187-1: All gate statuses = PASSED before ACTIVE
  QG-187-2: Blocked gates surface in DataProcessResult error metadata
  QG-187-3: contract.activated event in QUEUE FABRIC
  QG-187-4: Audit entry created in F512 for activation decision
```

---

## TASK TYPE: T188 — Milestone Creation & Funding Gate
```
ARCHETYPE:    ESCROW_SAGA
ENTRY:        Fires after contract.activated — client creates and funds a milestone
PURPOSE:      Create milestone, fund escrow (idempotent), begin durable money-safe saga
DISTINCT FROM: T190 (release saga — T188 is entry/funding; T190 is review/release)

FACTORY DEPENDENCIES:
  F491 IMilestoneService        — create milestone record
  F492 IEscrowService           — hold funds (idempotent)
  F493 IEscrowLedgerService     — journal FUND entry (append-only)
  F496 IFeeCalculatorService    — compute and journal platform fee

FABRIC RESOLUTION:
  F491 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F492 → DATABASE FABRIC (PG) + F493
  F493 → DATABASE FABRIC (PG append-only)
  F496 → DATABASE FABRIC (PG) + CORE FABRIC

SAGA COMPENSATION:
  If escrow hold fails → rollback milestone to CREATED, reverse fee calculation
  Compensation event: milestone.fund.compensated (logged to F512 audit)

IRON RULES:
  IR-188-1: Escrow hold MUST use idempotency key — duplicate fund attempts safe
  IR-188-2: F493 ledger entry is append-only — FUND type recorded before F492 status update
  IR-188-3: milestone.status must = CREATED before funding (not IN_REVIEW, not FUNDED)
  IR-188-4: Platform fee journaled in same DB transaction as escrow FUND entry
  IR-188-5: Contract must be ACTIVE — cannot fund milestone on PAUSED/CLOSED contract

QUALITY GATES:
  QG-188-1: F493 ledger has FUND entry with idempotency key
  QG-188-2: milestone.status = FUNDED after gate
  QG-188-3: Compensation path tested: duplicate fund returns same result, no double-journal
  QG-188-4: milestone.funded event in QUEUE FABRIC
```

---

## TASK TYPE: T189 — Deliverable Submission Gate
```
ARCHETYPE:    EVIDENCE_CAPTURE
ENTRY:        Freelancer submits deliverable against funded milestone
PURPOSE:      Record immutable deliverable reference, advance milestone to SUBMITTED
DISTINCT FROM: T195 (work diary — T189 is milestone deliverable; T195 is hourly time evidence)

FACTORY DEPENDENCIES:
  F491 IMilestoneService        — transition FUNDED→SUBMITTED
  F499 IDeliverableService      — store immutable deliverable reference
  F500 IWorkEvidenceService     — add deliverable to evidence package
  F507 INotificationService     — notify client of submission

FABRIC RESOLUTION:
  F491 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F499 → DATABASE FABRIC (ES) + CORE FABRIC (object store ref)
  F500 → DATABASE FABRIC (ES)
  F507 → QUEUE FABRIC + CORE FABRIC

IRON RULES:
  IR-189-1: Deliverable is immutable after submission — no update/delete
  IR-189-2: Object reference only — never inline binary in ES
  IR-189-3: milestone.status must = FUNDED before submission
  IR-189-4: tenantId + contractId + milestoneId on every deliverable record

QUALITY GATES:
  QG-189-1: F499 deliverable record created (immutable)
  QG-189-2: milestone.status = SUBMITTED
  QG-189-3: deliverable.submitted event in QUEUE FABRIC
  QG-189-4: Evidence package updated in F500
```

---

## TASK TYPE: T190 — Milestone Review & Release Saga
```
ARCHETYPE:    ESCROW_SAGA
ENTRY:        Client reviews submitted deliverable; approves or disputes
PURPOSE:      Release escrow to freelancer (or branch to dispute); schedule payout; handle auto-release timer
DISTINCT FROM: T188 (funding — T190 is the release/payout end of the saga)

FACTORY DEPENDENCIES:
  F491 IMilestoneService        — transition IN_REVIEW→RELEASED
  F492 IEscrowService           — release funds (idempotent)
  F493 IEscrowLedgerService     — journal RELEASE entry
  F494 IPayoutService           — schedule payout to freelancer
  F495 IPaymentProtectionService — evaluate protection eligibility
  F502 IDisputeService          — open dispute branch if client disputes

FABRIC RESOLUTION:
  F491 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F492 → DATABASE FABRIC (PG) + F493
  F493 → DATABASE FABRIC (PG append-only)
  F494 → QUEUE FABRIC + DATABASE FABRIC (PG)
  F495 → DATABASE FABRIC (ES) + F497
  F502 → DATABASE FABRIC (PG) + QUEUE FABRIC

SAGA COMPENSATION:
  If payout scheduling fails after escrow release → alert F510, flag for manual reconciliation
  (Cannot rollback escrow release once ledger entry written — manual compensation only)

MACHINE: Auto-release timer (configurable window) — durable TimerInstance
FREEDOM: Auto-release window, security hold period, payout batch schedule

IRON RULES:
  IR-190-1: Release BLOCKED if active dispute exists (CF-219)
  IR-190-2: F493 RELEASE ledger entry appended before F492 status update
  IR-190-3: Payout idempotency key required
  IR-190-4: Auto-release via durable timer — never polling loop in service code
  IR-190-5: Post-release rollback impossible — payout failure = manual reconciliation alert

QUALITY GATES:
  QG-190-1: F493 ledger has RELEASE entry
  QG-190-2: milestone.status = RELEASED
  QG-190-3: Payout scheduled in F494 with confirmed idempotency key
  QG-190-4: milestone.released event in QUEUE FABRIC
  QG-190-5: Auto-release timer registered and cancellable on early approval
```

---

## TASK TYPE: T191 — Dispute Open & Escrow Hold Gate
```
ARCHETYPE:    VALIDATION
ENTRY:        Client or freelancer opens dispute on IN_REVIEW milestone
PURPOSE:      Immediately place escrow hold, block release/refund, create dispute record
DISTINCT FROM: T193 (resolution — T191 opens; T193 resolves)

FACTORY DEPENDENCIES:
  F502 IDisputeService          — create dispute record
  F503 IDisputeLedgerHoldService — place escrow hold immediately
  F504 IDisputeEvidenceService  — initialise evidence collection window
  F507 INotificationService     — notify both parties

FABRIC RESOLUTION:
  F502 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F503 → DATABASE FABRIC (PG hold records) + F492
  F504 → DATABASE FABRIC (ES) + CORE FABRIC
  F507 → QUEUE FABRIC + CORE FABRIC

IRON RULES:
  IR-191-1: F503 hold placed ATOMICALLY with F502 dispute creation (same DB transaction scope)
  IR-191-2: After hold placed, F492.ReleaseFundsAsync returns IsSuccess=false (CF-219)
  IR-191-3: Dispute cannot open if milestone.status ≠ IN_REVIEW
  IR-191-4: dispute.opened event emitted to QUEUE FABRIC before returning success

QUALITY GATES:
  QG-191-1: F503 hold record active
  QG-191-2: F492 release attempt returns blocked status
  QG-191-3: Evidence window registered in F504
  QG-191-4: Audit entry in F512 for dispute open action
```

---

## TASK TYPE: T192 — Evidence Collection Orchestrator
```
ARCHETYPE:    ORCHESTRATION
ENTRY:        Fires after T191 — evidence window open for configured duration
PURPOSE:      Orchestrate evidence submission from both parties; notify of window closure
DISTINCT FROM: T191 (opens window — T192 manages the window + orchestrates submissions)

FACTORY DEPENDENCIES:
  F504 IDisputeEvidenceService  — receive and store evidence
  F500 IWorkEvidenceService     — attach work diary/deliverables as evidence
  F505 IArbitrationService      — prepare evidence package for arbitration
  F507 INotificationService     — window open/closing reminders

FABRIC RESOLUTION:
  F504 → DATABASE FABRIC (ES) + CORE FABRIC
  F500 → DATABASE FABRIC (ES)
  F505 → DATABASE FABRIC (PG) + AI ENGINE FABRIC
  F507 → QUEUE FABRIC + CORE FABRIC

MACHINE: Evidence window duration (durable timer), immutable evidence after window close
FREEDOM: Evidence window duration, max evidence items, accepted types

IRON RULES:
  IR-192-1: Evidence immutable after window closes
  IR-192-2: Evidence from work diary (F497/F499) auto-attached at window open
  IR-192-3: AI evidence summarisation (F505) only after window closes, not during

QUALITY GATES:
  QG-192-1: Evidence window timer registered
  QG-192-2: Work diary evidence auto-attached to dispute package
  QG-192-3: Both parties notified of window close
```

---

## TASK TYPE: T193 — Dispute Resolution Gate
```
ARCHETYPE:    JOIN_GATE
ENTRY:        Fires after evidence window closes + arbitration decision available
PURPOSE:      Execute resolution (release to freelancer / refund to client / split); lift escrow hold
DISTINCT FROM: T191 (hold — T193 is the resolution and release/refund execution)

FACTORY DEPENDENCIES:
  F505 IArbitrationService      — confirm decision
  F506 IResolutionService       — execute resolution (idempotent)
  F503 IDisputeLedgerHoldService — lift escrow hold after resolution
  F493 IEscrowLedgerService     — journal resolution entry
  F512 IAuditLogService         — record resolution audit trail

FABRIC RESOLUTION:
  F505 → DATABASE FABRIC (PG) + AI ENGINE FABRIC
  F506 → F492 + F493 + QUEUE FABRIC
  F503 → DATABASE FABRIC (PG) + F492
  F493 → DATABASE FABRIC (PG append-only)
  F512 → DATABASE FABRIC (PG WORM) + DATABASE FABRIC (ES)

IRON RULES:
  IR-193-1: F506 resolution execution is idempotent (idempotency key required)
  IR-193-2: F503 hold MUST be lifted before F506 release/refund executes
  IR-193-3: F493 RESOLVE ledger entry appended (TO_FREELANCER / TO_CLIENT / SPLIT)
  IR-193-4: Audit trail recorded in F512 — append-only

QUALITY GATES:
  QG-193-1: F503 hold lifted
  QG-193-2: F493 journal entry type matches resolution decision
  QG-193-3: dispute.resolved event in QUEUE FABRIC
  QG-193-4: Both parties notified via F507
  QG-193-5: Audit entry verifiable in F512
```

---

## TASK TYPE: T194 — KYC & Compliance Verification Gate
```
ARCHETYPE:    VALIDATION
ENTRY:        Triggered by contract.offered event or compliance expiry reminder
PURPOSE:      Verify KYC status, evaluate enterprise compliance gates, unblock T187 if passed
DISTINCT FROM: T187 (activation gate — T194 is the compliance evaluation engine; T187 acts on its result)

FACTORY DEPENDENCIES:
  F470 IKYCService              — trigger/check KYC verification
  F511 ITenantComplianceService — evaluate per-tenant compliance profile
  F488 IWorkerClassificationService — assess enterprise classification risk
  F514 ICompliancePolicyEngineService — run policy rule evaluation
  F512 IAuditLogService         — record compliance decision

FABRIC RESOLUTION:
  F470 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F511 → DATABASE FABRIC (PG) + F470
  F488 → DATABASE FABRIC (ES) + AI ENGINE FABRIC
  F514 → DATABASE FABRIC (ES) + AI ENGINE FABRIC
  F512 → DATABASE FABRIC (PG WORM) + DATABASE FABRIC (ES)

IRON RULES:
  IR-194-1: KYC VERIFIED result must have expiry > NOW
  IR-194-2: Enterprise compliance gates evaluated per FREEDOM config (not hardcoded)
  IR-194-3: Classification risk assessment below threshold required for enterprise tenants
  IR-194-4: All compliance gate evaluations recorded in F512 audit log
  IR-194-5: KYC evaluation uses AI ENGINE FABRIC for doc analysis (never hardcoded OCR library)

QUALITY GATES:
  QG-194-1: KYC status = VERIFIED with valid expiry
  QG-194-2: All tenant gates = PASSED
  QG-194-3: Audit entry exists for compliance decision
  QG-194-4: kyc.verified event in QUEUE FABRIC (unblocks T187)
```

---

## TASK TYPE: T195 — Work Diary Evidence Cycle
```
ARCHETYPE:    EVIDENCE_CAPTURE
ENTRY:        Periodic timer (configurable interval) while hourly contract is ACTIVE
PURPOSE:      Capture time slot, activity counts, screenshot ref; build hourly billing proof
DISTINCT FROM: T189 (milestone deliverable — T195 is periodic hourly evidence accumulation)

FACTORY DEPENDENCIES:
  F497 IWorkDiaryService        — record time slot with activity
  F498 ITimeTrackingService     — record time entry
  F501 IActivityCaptureService  — record activity counts
  F500 IWorkEvidenceService     — add slot to evidence package
  F495 IPaymentProtectionService — evaluate hourly protection eligibility

FABRIC RESOLUTION:
  F497 → DATABASE FABRIC (ES audit) + DATABASE FABRIC (PG slots)
  F498 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F501 → DATABASE FABRIC (PG numeric) + QUEUE FABRIC
  F500 → DATABASE FABRIC (ES)
  F495 → DATABASE FABRIC (ES) + F497

MACHINE: Screenshot capture interval (periodic TimerInstance), activity count thresholds
FREEDOM: Capture interval, min activity threshold, dispute window, opt-in/opt-out per contract

IRON RULES:
  IR-195-1: Screenshot stored as external ref only — never inline binary in ES (DR-70)
  IR-195-2: Activity counts only — no keylog content ever
  IR-195-3: Work diary access restricted to contract parties only (tenantId + contractId scope)
  IR-195-4: Periodic capture via durable timer — never polling loop

QUALITY GATES:
  QG-195-1: Time slot created in F497 + F498
  QG-195-2: Activity count recorded (number only, no keystroke content)
  QG-195-3: Evidence package updated in F500
  QG-195-4: Screenshot ref is external object ref, not inline data
```

---

## TASK TYPE: T196 — Contest Entry & Handover Gate
```
ARCHETYPE:    MARKETPLACE
ENTRY:        Client awards contest winner; triggers IP handover before prize release
PURPOSE:      Execute contest handover (IP transfer), certify transfer, then release prize
DISTINCT FROM: T188 (milestone funding — T196 is contest-specific with IP transfer requirement)

FACTORY DEPENDENCIES:
  F482 IContestService          — award contest winner
  F483 IContestHandoverService  — initiate and complete ownership transfer
  F516 IIPTransferService       — record and certify IP ownership transfer
  F492 IEscrowService           — release prize after handover CERTIFIED
  F493 IEscrowLedgerService     — journal PRIZE_RELEASE

FABRIC RESOLUTION:
  F482 → DATABASE FABRIC (PG) + DATABASE FABRIC (ES)
  F483 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F516 → DATABASE FABRIC (PG immutable) + QUEUE FABRIC
  F492 → DATABASE FABRIC (PG) + F493
  F493 → DATABASE FABRIC (PG append-only)

IRON RULES:
  IR-196-1: Prize CANNOT release until F516 IP transfer status = CERTIFIED (DR-72)
  IR-196-2: F516 IP transfer record is immutable after CERTIFIED
  IR-196-3: Handover event emitted to QUEUE FABRIC before prize release
  IR-196-4: ownership.transferred event precedes prize.released event in QUEUE FABRIC ordering

QUALITY GATES:
  QG-196-1: F516 IP transfer record = CERTIFIED
  QG-196-2: F493 PRIZE_RELEASE ledger entry exists
  QG-196-3: ownership.transferred event verifiable in QUEUE FABRIC
  QG-196-4: contest.prize.released event in QUEUE FABRIC
```

---

## TASK TYPE: T197 — Reputation Signal Aggregate Gate
```
ARCHETYPE:    REPUTATION
ENTRY:        Fires after contract.closed or milestone.released — collect and aggregate reputation signals
PURPOSE:      Collect review from both parties, compute reputation score update, evaluate tier eligibility
DISTINCT FROM: T181 (matching — T197 is post-completion reputation update, not discovery ranking)

FACTORY DEPENDENCIES:
  F467 IReputationService       — aggregate new review, recompute score
  F472 IFreelancerTierService   — evaluate tier eligibility post-review
  F475 ISearchIndexService      — update profile search index with new score
  F512 IAuditLogService         — record reputation update

FABRIC RESOLUTION:
  F467 → DATABASE FABRIC (ES score queries) + DATABASE FABRIC (PG immutable review log)
  F472 → DATABASE FABRIC (ES) + DATABASE FABRIC (PG tier records)
  F475 → DATABASE FABRIC (ES)
  F512 → DATABASE FABRIC (PG WORM)

MACHINE: Review immutable after submission. Score = computed from ledger (never mutable field)
FREEDOM: Scoring weights, tier promotion thresholds, review eligibility window

IRON RULES:
  IR-197-1: Review is immutable after submission — append only in F467 PG journal
  IR-197-2: Reputation score derived from ledger — never stored as mutable value (DR-73)
  IR-197-3: Tier evaluation fires after score update, not before

QUALITY GATES:
  QG-197-1: Review record appended to F467 immutable journal
  QG-197-2: Score recomputed and updated in ES index
  QG-197-3: Tier eligibility evaluated via F472
  QG-197-4: reputation.updated event in QUEUE FABRIC
```

---

## TASK TYPE: T198 — Enterprise Compliance Report Gate
```
ARCHETYPE:    ACTIVATION
ENTRY:        Scheduled trigger or on-demand request from enterprise program manager
PURPOSE:      Generate spend, compliance, and activity reports; deliver to enterprise stakeholders
DISTINCT FROM: T177 (reverse ETL activation — T198 is compliance report generation, not outbound push)

FACTORY DEPENDENCIES:
  F513 IEnterpriseReportService — generate and schedule reports
  F512 IAuditLogService         — source compliance audit data
  F514 ICompliancePolicyEngineService — include policy evaluation summary
  F490 IEnterpriseGovernanceService — include governance events
  F509 IWebhookNotifyService    — deliver report to registered webhooks

FABRIC RESOLUTION:
  F513 → DATABASE FABRIC (ES aggregation) + AI ENGINE FABRIC
  F512 → DATABASE FABRIC (PG WORM + ES)
  F514 → DATABASE FABRIC (ES) + AI ENGINE FABRIC
  F490 → DATABASE FABRIC (ES) + QUEUE FABRIC
  F509 → QUEUE FABRIC + DATABASE FABRIC (PG webhook registry)

IRON RULES:
  IR-198-1: Report data scoped to tenantId — cross-tenant data never in report (DNA-5)
  IR-198-2: Webhook delivery is idempotent (F509 idempotency key)
  IR-198-3: Report generation queries use BuildSearchFilter — empty fields skipped
  IR-198-4: Audit data from F512 is read-only — no mutations during report generation

QUALITY GATES:
  QG-198-1: Report scoped to single tenantId
  QG-198-2: Webhook delivery confirmed or DLQ'd
  QG-198-3: report.generated event in QUEUE FABRIC
  QG-198-4: Report access logged in F512
```

---

## FLOW TEMPLATES

### Template 36 — marketplace-v1 (Job → Proposal → Shortlist)
```json
{
  "template_id": "marketplace-v1",
  "flow_id": "FLOW-15",
  "description": "Job post, enrich, publish, match, invite, propose, shortlist",
  "steps": [
    { "id": "step-1", "task_type": "T179", "factory": "F473,F474,F468", "on_success": "step-2" },
    { "id": "step-2", "task_type": "T180", "factory": "F473,F475,F507", "on_success": "step-3" },
    { "id": "step-3", "task_type": "T181", "factory": "F476,F475,F466", "on_success": "step-4" },
    { "id": "step-4", "task_type": "T182", "factory": "F477,F507,F479", "on_success": "step-5" },
    { "id": "step-5", "task_type": "T183", "factory": "F479,F471,F475", "on_success": "step-6" },
    { "id": "step-6", "task_type": "T184", "factory": "F480,F471,F481", "on_success": "step-7", "optional": true },
    { "id": "step-7", "task_type": "T185", "factory": "F479,F508,F507", "on_success": "contract-flow" }
  ]
}
```

### Template 37 — contract-escrow-v1 (Contract → Milestone → Release)
```json
{
  "template_id": "contract-escrow-v1",
  "flow_id": "FLOW-15",
  "description": "Contract offer, compliance gate, milestone fund, deliver, review, release",
  "steps": [
    { "id": "step-1", "task_type": "T186", "factory": "F485,F487,F470,F489" },
    { "id": "step-2", "task_type": "T194", "factory": "F470,F511,F488,F514,F512" },
    { "id": "step-3", "task_type": "T187", "factory": "F485,F487,F470,F511,F488" },
    { "id": "step-4", "task_type": "T188", "factory": "F491,F492,F493,F496" },
    { "id": "step-5", "task_type": "T195", "factory": "F497,F498,F501,F500,F495", "periodic": true },
    { "id": "step-6", "task_type": "T189", "factory": "F491,F499,F500,F507" },
    { "id": "step-7", "task_type": "T190", "factory": "F491,F492,F493,F494,F495,F502", "branches": ["dispute-flow", "release"] }
  ]
}
```

### Template 38 — dispute-resolution-v1
```json
{
  "template_id": "dispute-resolution-v1",
  "flow_id": "FLOW-15",
  "description": "Dispute open, evidence, arbitration, resolve",
  "steps": [
    { "id": "step-1", "task_type": "T191", "factory": "F502,F503,F504,F507" },
    { "id": "step-2", "task_type": "T192", "factory": "F504,F500,F505,F507" },
    { "id": "step-3", "task_type": "T193", "factory": "F505,F506,F503,F493,F512" }
  ]
}
```

### Template 39 — enterprise-compliance-v1
```json
{
  "template_id": "enterprise-compliance-v1",
  "flow_id": "FLOW-15",
  "description": "Enterprise KYC gate, governance, audit, report",
  "steps": [
    { "id": "step-1", "task_type": "T194", "factory": "F470,F511,F488,F514,F512" },
    { "id": "step-2", "task_type": "T197", "factory": "F467,F472,F475,F512" },
    { "id": "step-3", "task_type": "T198", "factory": "F513,F512,F514,F490,F509" }
  ]
}
```

---

## BACKWARD COMPATIBILITY

```
T1–T178:    UNCHANGED ✅
T179–T198:  NEW in FLOW-15  (+20 task types)
Templates 1–35: UNCHANGED ✅
Templates 36–39: NEW
```

---

## SAVE POINT: FLOW15:P2:TASK_TYPES ✅
## Next: Load FLOW15_P3_BFA_STRESS_TEST
