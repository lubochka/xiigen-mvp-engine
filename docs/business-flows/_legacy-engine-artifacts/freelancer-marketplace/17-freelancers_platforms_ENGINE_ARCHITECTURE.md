# 17 — Freelancer Marketplace Platform — ENGINE ARCHITECTURE
## FLOW-15 | F466–F516 | Families 60–68
## Status: COMPLETE ✅ | Built from SESSION_STATE FLOW-14 base (F465/T178/CF-213)

---

## FABRIC INTERFACE REFERENCE (unchanged — all FLOW-15 factories resolve through these)

| Fabric | Skill | Providers |
|--------|-------|-----------|
| DATABASE FABRIC | Skill 05 — IDatabaseService | ES, MongoDB, PG, Redis, MySQL, SQLServer |
| QUEUE FABRIC | Skill 04 — IQueueService | Redis Streams (consumer groups) |
| AI ENGINE FABRIC | Skills 06/07 — IAiProvider + AiDispatcher | Claude, OpenAI, Gemini, DeepSeek |
| RAG FABRIC | Skills 00a/00b — IRagService | 7 strategies |
| CORE FABRIC | Skill 01 — MicroserviceBase | 19 components |
| FLOW ENGINE FABRIC | Skills 08/09 — IFlowDefinition + IFlowOrchestrator | JSON DAG + FlowOrchestrator |
| MT ISOLATION FABRIC | Skill 11 — ITenantIsolationService | Inherited from FLOW-08 |

---

## NEW FACTORIES: F466–F516 (51 factories, 9 families)

---

### Family 60 — Identity, Profile & Reputation (F466–F472)

```
F466  IProfileService
      PURPOSE: Manage freelancer/client profiles, portfolio, skills, rates
      FABRIC:  DATABASE FABRIC (ES — profile discovery) + DATABASE FABRIC (PG — authoritative store)
      METHODS: CreateProfileAsync, UpdateProfileAsync, GetProfileAsync, SearchProfilesAsync
               → all return DataProcessResult<T>
      FREEDOM: Profile fields, searchable attributes, rate display settings
      DNA:     ParseDocument (all profile data as Dictionary<string,object>)
               BuildSearchFilter (empty field skip on profile search)
               DNA-5 Scope Isolation: tenantId + userId on every query

F467  IReputationService
      PURPOSE: Aggregate ratings, reviews, completion rates, badges
      FABRIC:  DATABASE FABRIC (ES — score queries) + DATABASE FABRIC (PG — immutable review log)
      METHODS: AddReviewAsync, ComputeScoreAsync, GetReputationSummaryAsync
      FREEDOM: Scoring weights, badge thresholds, minimum review counts
      DNA:     Immutable review append only (PG journal). Score derived, never mutated.
               tenantId isolation on all queries.

F468  ISkillTaxonomyService
      PURPOSE: Maintain skill categories, synonyms, AI-extracted skill normalisation
      FABRIC:  DATABASE FABRIC (ES) + AI ENGINE FABRIC (skill extraction prompts)
      METHODS: NormalizeSkillAsync, SearchSkillsAsync, ExtractSkillsFromTextAsync
      FREEDOM: Taxonomy configuration, AI extraction model selection, synonym maps

F469  IPortfolioService
      PURPOSE: Store and retrieve freelancer work samples, case studies, deliverable previews
      FABRIC:  DATABASE FABRIC (ES — portfolio search) + CORE FABRIC (object store ref)
      METHODS: AddPortfolioItemAsync, GetPortfolioAsync, SearchPortfolioAsync
      DNA:     File references only — never inline binary. tenantId scoped.

F470  IKYCService
      PURPOSE: Trigger, track and gate KYC verification (identity + anti-money-laundering)
      FABRIC:  DATABASE FABRIC (PG — KYC status records) + QUEUE FABRIC (KYC result events)
      METHODS: SubmitKYCAsync, GetKYCStatusAsync, ExpireKYCAsync
               → DataProcessResult<KycStatus> where KycStatus is Dictionary<string,object>
      FREEDOM: KYC provider routing (per tenant config), expiry window, required doc types
      IRON RULES: Contract CANNOT activate while KYC status ≠ VERIFIED

F471  ITokenWalletService
      PURPOSE: Manage proposal submission tokens ("Connects" pattern) — immutable ledger
      FABRIC:  DATABASE FABRIC (PG — immutable token ledger) + QUEUE FABRIC (spend events)
      METHODS: SpendTokensAsync(idempotencyKey), TopUpTokensAsync, GetBalanceAsync
               → all idempotency-key protected. DataProcessResult<T>
      FREEDOM: Token cost per proposal, boost token multiplier, tenant token grants
      IRON RULES: Cannot submit proposal with insufficient tokens. Idempotency key UNIQUE enforced at DB.

F472  IFreelancerTierService
      PURPOSE: Manage tier programs (Preferred Freelancer, Top-Rated, Rising Talent)
      FABRIC:  DATABASE FABRIC (ES — tier queries) + DATABASE FABRIC (PG — tier records)
      METHODS: EvaluateTierEligibilityAsync, PromoteTierAsync, GetTierStatusAsync
      FREEDOM: Tier criteria thresholds, perks per tier, evaluation schedule
```

---

### Family 61 — Job Posting & Talent Discovery (F473–F478)

```
F473  IJobService
      PURPOSE: Full lifecycle of job/project postings (Draft→Parsing→Published→Closed)
      FABRIC:  DATABASE FABRIC (PG — job records) + DATABASE FABRIC (ES — search index) + QUEUE FABRIC
      METHODS: CreateJobAsync, PublishJobAsync, CloseJobAsync, GetJobAsync, SearchJobsAsync
      FREEDOM: Required fields per job type, visibility rules (PUBLIC/INVITE_ONLY/PRIVATE)
      DNA:     ParseDocument — job data as Dictionary<string,object>, no typed Job class
               tenantId + postedBy on every document

F474  IJobEnrichmentService
      PURPOSE: AI-powered skill extraction, category mapping, budget suggestion from job description
      FABRIC:  AI ENGINE FABRIC (Skill 07 — extraction prompt) + DATABASE FABRIC (ES taxonomy)
      METHODS: EnrichJobAsync, ExtractSkillsAsync, SuggestCategoryAsync
               → returns enriched Dictionary merged back via ObjectProcessor
      FREEDOM: Enrichment model selection, extraction confidence threshold, max skill tags

F475  ISearchIndexService
      PURPOSE: Manage near-real-time search index for jobs and talent profiles
      FABRIC:  DATABASE FABRIC (ES — write + read) + QUEUE FABRIC (index refresh events)
      METHODS: IndexDocumentAsync, DeleteIndexDocumentAsync, SearchAsync, RefreshIndexAsync
      FREEDOM: Refresh interval, ranking signals, index sharding strategy
      DNA:     BuildSearchFilter — all empty fields auto-skipped in ES queries

F476  IMatchingService
      PURPOSE: Rank and match freelancers to jobs (and jobs to freelancers) using scoring
      FABRIC:  RAG FABRIC (Skill 00b — scoring strategy) + DATABASE FABRIC (ES)
      METHODS: MatchFreelancersToJobAsync, MatchJobsToFreelancerAsync, ScoreMatchAsync
      FREEDOM: Matching algorithm (config-selected RAG strategy), weight per signal

F477  IInvitationService
      PURPOSE: Send, track and expire invitations from clients to freelancers for specific jobs
      FABRIC:  DATABASE FABRIC (PG) + QUEUE FABRIC (invite events)
      METHODS: SendInvitationAsync, AcceptInvitationAsync, DeclineInvitationAsync, ExpireInvitationAsync
      FREEDOM: Invitation expiry window, max concurrent invites per job, re-invite policy
      DNA:     tenantId + jobId + freelancerId scoped on every record

F478  IJobCatalogService
      PURPOSE: Manage pre-scoped packaged services (Project Catalog / "buy a service" model)
      FABRIC:  DATABASE FABRIC (PG — catalog records) + DATABASE FABRIC (ES — catalog search)
      METHODS: PublishCatalogItemAsync, BuyCatalogItemAsync, GetCatalogAsync
      FREEDOM: Service package fields, pricing tiers, delivery time options
```

---

### Family 62 — Proposal & Bidding Economy (F479–F484)

```
F479  IProposalService
      PURPOSE: Manage full proposal/bid lifecycle (Submitted→Shortlisted→Rejected/Withdrawn)
      FABRIC:  DATABASE FABRIC (PG) + QUEUE FABRIC + F471 ITokenWalletService (token spend)
      METHODS: SubmitProposalAsync(idempotencyKey), ShortlistAsync, RejectAsync, WithdrawAsync
      FREEDOM: Required proposal fields, max proposals per job, cover letter min length
      DNA:     ParseDocument. Idempotency on SubmitProposalAsync (token spend atomicity).

F480  IProposalBoostService
      PURPOSE: Auction-based proposal visibility boosting (extra token spend for placement)
      FABRIC:  DATABASE FABRIC (PG — boost records) + F471 (token ledger) + F475 (ranking signals)
      METHODS: BoostProposalAsync(idempotencyKey), GetBoostRankAsync, ExpireBoostAsync
      FREEDOM: Max boost multiplier, boost duration window, auction competition rules
      IRON RULES: Boost requires active proposal (status = SUBMITTED). Token spend idempotent.

F481  IProposalRankingService
      PURPOSE: Compute and update display rank of proposals on a job, incorporating boosts + signals
      FABRIC:  DATABASE FABRIC (ES — ranking index) + AI ENGINE FABRIC (relevance scoring)
      METHODS: RankProposalsAsync, UpdateRankSignalAsync, GetRankedProposalListAsync
      FREEDOM: Ranking model (AI or rules-based), boost weight, recency decay factor

F482  IContestService
      PURPOSE: Manage creative contest lifecycle (post→receive entries→award winner→handover)
      FABRIC:  DATABASE FABRIC (PG — contest records) + DATABASE FABRIC (ES — entry search)
      METHODS: PostContestAsync, SubmitEntryAsync, AwardWinnerAsync, GetContestAsync
      FREEDOM: Contest duration, entry limits, guaranteed prize flag, anonymisation rules
      DNA:     Entry references deliverables via IDeliverableService (F499)

F483  IContestHandoverService
      PURPOSE: IP/ownership transfer gate — transfers contest entry ownership before prize release
      FABRIC:  DATABASE FABRIC (PG — handover records) + QUEUE FABRIC (ownership events)
      METHODS: InitiateHandoverAsync, CompleteHandoverAsync, GetHandoverStatusAsync
      IRON RULES: Prize CANNOT release until handover status = COMPLETED.
               Ownership transfer event emitted to QUEUE FABRIC before any prize payout.

F484  IConsultationService
      PURPOSE: Manage scheduled paid 1:1 expert sessions (availability, booking, follow-up)
      FABRIC:  DATABASE FABRIC (PG — booking records) + QUEUE FABRIC (booking events)
      METHODS: PublishAvailabilityAsync, BookSessionAsync, CompleteSessionAsync, CancelSessionAsync
      FREEDOM: Session duration options, per-minute vs per-session billing mode, follow-up rules
```

---

### Family 63 — Contract Management (F485–F490)

```
F485  IContractService
      PURPOSE: Contract creation, versioning, state transitions (OFFERED→ACTIVE→PAUSED→CLOSED)
      FABRIC:  DATABASE FABRIC (PG — contract store) + QUEUE FABRIC (contract events)
      METHODS: CreateContractAsync, ActivateContractAsync, PauseContractAsync, CloseContractAsync
      FREEDOM: Contract terms fields, billing type (HOURLY/MILESTONE/FIXED), enterprise governance flags
      DNA:     ParseDocument. tenantId + clientId + freelancerId on every contract document.
               DataProcessResult<T> — never throw for invalid state transitions.

F486  IContractVersioningService
      PURPOSE: Version control for contract definitions (support in-flight instance pinning)
      FABRIC:  DATABASE FABRIC (PG — version table) + DATABASE FABRIC (ES — version search)
      METHODS: CreateVersionAsync, GetVersionAsync, ListVersionsAsync, PinInstanceToVersionAsync
      FREEDOM: Max versions retained, auto-archive policy, version diff visibility

F487  IActivationGateService
      PURPOSE: Orchestrate all pre-activation checks (compliance, payment method, enterprise policy)
      FABRIC:  CORE FABRIC (gate orchestration) + F470 IKYCService + F489 ICompliancePolicyService
      METHODS: EvaluateActivationReadinessAsync, BlockActivationAsync, ClearActivationAsync
      IRON RULES: Returns DataProcessResult with gate status list.
               NEVER throws; blocked gates surface as IsSuccess=false with error metadata.

F488  IWorkerClassificationService
      PURPOSE: Assess misclassification risk for enterprise tenants before contract activation
      FABRIC:  DATABASE FABRIC (ES — policy rules) + AI ENGINE FABRIC (risk assessment)
      METHODS: AssessClassificationRiskAsync, GetClassificationStatusAsync, OverrideClassificationAsync
      FREEDOM: Risk threshold (per enterprise tenant config), AI model selection, override policy

F489  ICompliancePolicyService
      PURPOSE: Evaluate and enforce enterprise compliance policies (per tenant, per jurisdiction)
      FABRIC:  DATABASE FABRIC (ES — policy documents) + DATABASE FABRIC (PG — policy state)
      METHODS: EvaluatePolicyAsync, RegisterPolicyAsync, GetPolicyStatusAsync
      FREEDOM: Policy rules per tenant (FREEDOM config in ES), jurisdiction overrides, hard-stop list

F490  IEnterpriseGovernanceService
      PURPOSE: Enterprise program management: vendor approved lists, reporting, procurement governance
      FABRIC:  DATABASE FABRIC (ES — governance data) + QUEUE FABRIC (audit events)
      METHODS: CheckApprovedVendorListAsync, RecordGovernanceEventAsync, GenerateReportAsync
      DNA:     Append-only audit log. Every action = DataProcessResult. tenantId scoped.
```

---

### Family 64 — Milestone Escrow & Payments (F491–F496)

```
F491  IMilestoneService
      PURPOSE: Milestone lifecycle (CREATED→FUNDED→SUBMITTED→IN_REVIEW→RELEASED/REFUNDED/DISPUTED)
      FABRIC:  DATABASE FABRIC (PG — milestone records) + QUEUE FABRIC (milestone events)
      METHODS: CreateMilestoneAsync, SubmitDeliverableAsync, StartReviewAsync, ApproveMilestoneAsync
               → all return DataProcessResult<T>
      FREEDOM: Auto-release window (configurable per tenant), review period duration
      DNA:     ParseDocument. tenantId + contractId on every record.

F492  IEscrowService
      PURPOSE: Hold, release and refund funds — the escrow state machine
      FABRIC:  DATABASE FABRIC (PG — escrow state) + F493 IEscrowLedgerService
      METHODS: HoldFundsAsync(idempotencyKey), ReleaseFundsAsync(idempotencyKey),
               RefundFundsAsync(idempotencyKey), GetEscrowStatusAsync
      IRON RULES:
        IR-192-1: Cannot release if dispute is OPEN (CF-219)
        IR-192-2: Cannot refund after release
        IR-192-3: Cannot hold if insufficient verified payment method
        IR-192-4: All money operations MUST carry idempotency key
      DNA:     Idempotency key = UNIQUE constraint at DB level. Double-write prevention via outbox.

F493  IEscrowLedgerService
      PURPOSE: Immutable double-entry ledger for all escrow movements (FUND/RELEASE/REFUND/FEE/PAYOUT)
      FABRIC:  DATABASE FABRIC (PG — append-only journal)
      METHODS: JournalEntryAsync(idempotencyKey, type, amount, currency)
               GetLedgerAsync(contractId), ReconcileAsync
      IRON RULES: Journal is APPEND ONLY — no UPDATE or DELETE ever. Enforced at DB (no DELETE grant).
      DNA:     DataProcessResult<T>. tenantId scoped.

F494  IPayoutService
      PURPOSE: Schedule and execute payouts to freelancers after escrow release
      FABRIC:  QUEUE FABRIC (payout commands) + DATABASE FABRIC (PG — payout records)
      METHODS: SchedulePayoutAsync(idempotencyKey), ProcessPayoutAsync, GetPayoutStatusAsync
      FREEDOM: Payout batching window, security hold period (configurable per tenant), currency
      IRON RULES: Payout only after escrow RELEASED status confirmed. Security hold respected.

F495  IPaymentProtectionService
      PURPOSE: Evaluate payment protection eligibility (hourly: work diary evidence; fixed: escrow)
      FABRIC:  DATABASE FABRIC (ES — evidence queries) + F497 IWorkDiaryService
      METHODS: EvaluateHourlyProtectionAsync, EvaluateFixedProtectionAsync, GetProtectionStatusAsync
      FREEDOM: Evidence window, min activity threshold for hourly protection, dispute filing window

F496  IFeeCalculatorService
      PURPOSE: Compute platform fees, service fees, VAT/tax per transaction and per tenant plan
      FABRIC:  DATABASE FABRIC (PG — fee config) + CORE FABRIC
      METHODS: CalculateFeeAsync, GetFeeScheduleAsync
      FREEDOM: Fee percentages per plan tier, volume discounts, enterprise flat-fee overrides
      DNA:     Fee calculation is pure computation via DataProcessResult — never throws.
```

---

### Family 65 — Work Evidence & Time Tracking (F497–F501)

```
F497  IWorkDiaryService
      PURPOSE: Capture hourly work diary (time slots, activity counts, screenshot refs) for billing proof
      FABRIC:  DATABASE FABRIC (ES — work diary search + audit) + DATABASE FABRIC (PG — slot records)
      METHODS: RecordTimeSlotAsync, GetWorkDiaryAsync, SearchWorkDiaryAsync, DeleteSlotAsync
      FREEDOM: Screenshot capture interval, activity count thresholds, dispute window
      DNA:     Screenshot data = external ref only (never inline). tenantId + contractId scoped.
      PRIVACY: Screenshots are privacy-sensitive. Access restricted to contract parties only.

F498  ITimeTrackingService
      PURPOSE: Track manual and automatic time entries for hourly contracts
      FABRIC:  DATABASE FABRIC (PG — time entries) + QUEUE FABRIC (time entry events)
      METHODS: StartTimerAsync, StopTimerAsync, AddManualEntryAsync, GetTimeReportAsync
      FREEDOM: Manual time add policy (allowed/restricted per contract), weekly billing cycle

F499  IDeliverableService
      PURPOSE: Manage deliverable submissions (files, links, previews) for milestone proofs
      FABRIC:  DATABASE FABRIC (ES — deliverable metadata search) + CORE FABRIC (object store ref)
      METHODS: SubmitDeliverableAsync, GetDeliverableAsync, ListDeliverablesAsync
      IRON RULES: Deliverables are immutable after submission (no update/delete). Evidence preservation.
      DNA:     ParseDocument. Object references only — never inline binary in ES.

F500  IWorkEvidenceService
      PURPOSE: Aggregate evidence across time diary + deliverables for protection and dispute support
      FABRIC:  DATABASE FABRIC (ES — evidence aggregate) + F497 + F499
      METHODS: BuildEvidencePackageAsync, ValidateEvidenceForProtectionAsync
      FREEDOM: Evidence package retention period, min evidence requirements per billing type

F501  IActivityCaptureService
      PURPOSE: Record click/keystroke activity counts per time slot (for work diary activity proof)
      FABRIC:  DATABASE FABRIC (PG — activity records, compact numeric) + QUEUE FABRIC
      METHODS: RecordActivityAsync, GetActivitySummaryAsync
      PRIVACY: Activity counts only — no keylog content ever stored. FREEDOM config: opt-in/opt-out.
```

---

### Family 66 — Dispute & Resolution (F502–F506)

```
F502  IDisputeService
      PURPOSE: Manage dispute lifecycle (OPEN→EVIDENCE→IN_REVIEW→RESOLVED→CLOSED)
      FABRIC:  DATABASE FABRIC (PG) + QUEUE FABRIC (dispute events → triggers escrow hold)
      METHODS: OpenDisputeAsync, CloseDisputeAsync, GetDisputeAsync, UpdateDisputeStatusAsync
      IRON RULES:
        IR-502-1: Opening dispute MUST trigger F503.HoldEscrowAsync immediately (via QUEUE FABRIC)
        IR-502-2: Dispute cannot close without resolution type set (TO_FREELANCER/TO_CLIENT/SPLIT)
      DNA:     ParseDocument. tenantId + contractId + milestoneId scoped.

F503  IDisputeLedgerHoldService
      PURPOSE: Place and lift escrow hold during dispute — integrates with F492/F493
      FABRIC:  DATABASE FABRIC (PG — hold records) + F492 IEscrowService
      METHODS: PlaceHoldAsync, LiftHoldAsync, GetHoldStatusAsync
      IRON RULES: Release/Refund on F492 BLOCKED while hold is ACTIVE (CF-219)

F504  IDisputeEvidenceService
      PURPOSE: Collect, store and retrieve evidence submissions during dispute
      FABRIC:  DATABASE FABRIC (ES — evidence metadata) + CORE FABRIC (object store ref)
      METHODS: SubmitEvidenceAsync, GetEvidenceAsync, ListEvidenceAsync
      FREEDOM: Evidence submission window, max evidence items, accepted file types
      DNA:     Evidence is immutable after submission. Object refs only.

F505  IArbitrationService
      PURPOSE: Assign, manage and track arbitration panel decision process
      FABRIC:  DATABASE FABRIC (PG — arbitration records) + AI ENGINE FABRIC (evidence summarisation)
      METHODS: AssignArbitratorAsync, RecordDecisionAsync, GetArbitrationStatusAsync
      FREEDOM: Arbitrator assignment rules (manual/AI-assisted), escalation SLA thresholds

F506  IResolutionService
      PURPOSE: Execute dispute resolution: release/refund/split escrow per decision
      FABRIC:  F492 IEscrowService + F493 IEscrowLedgerService + QUEUE FABRIC (resolution events)
      METHODS: ExecuteResolutionAsync(idempotencyKey, decision), GetResolutionStatusAsync
      IRON RULES: Resolution execution is idempotent (idempotency key). Records decision audit trail.
      DNA:     DataProcessResult<T>. Append-only audit entry after each resolution.
```

---

### Family 67 — Notifications & Communication (F507–F510)

```
F507  INotificationService
      PURPOSE: Send transactional notifications (proposal received, milestone funded, dispute opened…)
      FABRIC:  QUEUE FABRIC (notification commands) + CORE FABRIC (template resolution)
      METHODS: SendNotificationAsync, GetNotificationPreferencesAsync, UpdatePreferencesAsync
      FREEDOM: Per-tenant notification templates, channel priorities (email/push/webhook)

F508  IMessagingService
      PURPOSE: In-platform messaging between contract parties (proposals, Q&A, dispute evidence)
      FABRIC:  DATABASE FABRIC (ES — message search) + QUEUE FABRIC (message delivery)
      METHODS: SendMessageAsync, GetThreadAsync, SearchMessagesAsync
      DNA:     tenantId + threadId scoped. ParseDocument (no typed message model).

F509  IWebhookNotifyService
      PURPOSE: Push platform events to client-registered webhooks (enterprise integrations)
      FABRIC:  QUEUE FABRIC (outbox → webhook delivery) + DATABASE FABRIC (PG — webhook registry)
      METHODS: RegisterWebhookAsync, DeliverEventAsync(idempotencyKey), GetDeliveryStatusAsync
      IRON RULES: Delivery is idempotent. Retry with backoff. Max 5 attempts then DLQ.

F510  IAlertService
      PURPOSE: Generate system/operational alerts (rate limit breached, DLQ spike, compliance expiry)
      FABRIC:  DATABASE FABRIC (ES — alert index) + QUEUE FABRIC
      METHODS: RaiseAlertAsync, GetAlertsAsync, AcknowledgeAlertAsync
```

---

### Family 68 — Enterprise Compliance & Governance (F511–F516)

```
F511  ITenantComplianceService
      PURPOSE: Per-tenant compliance profile: KYC status, jurisdictions, compliance gates active
      FABRIC:  DATABASE FABRIC (PG — compliance profile) + F470 IKYCService
      METHODS: GetComplianceProfileAsync, SetComplianceGateAsync, EvaluateComplianceAsync
      FREEDOM: Per-tenant gate configuration (which checks are required by policy)
      DNA:     tenantId scoped on ALL records. Hard-stop gates stored as FREEDOM config in ES.

F512  IAuditLogService
      PURPOSE: Append-only audit trail for all state changes, money movements and access events
      FABRIC:  DATABASE FABRIC (PG WORM — write-once audit table) + DATABASE FABRIC (ES — audit search)
      METHODS: RecordEventAsync, SearchAuditAsync, ExportAuditAsync
      IRON RULES: Audit log is append-only forever. No UPDATE/DELETE ever. Enforced at DB level.
      DNA:     Every write = new immutable row. tenantId + actorId + action + target + timestamp.

F513  IEnterpriseReportService
      PURPOSE: Generate compliance, spend, and activity reports for enterprise program management
      FABRIC:  DATABASE FABRIC (ES — aggregation queries) + AI ENGINE FABRIC (report summaries)
      METHODS: GenerateSpendReportAsync, GenerateComplianceReportAsync, ScheduleReportAsync
      FREEDOM: Report formats, delivery schedules, aggregation granularity per tenant

F514  ICompliancePolicyEngineService
      PURPOSE: Evaluate complex multi-condition compliance policies (worker classification, GDPR, PCI)
      FABRIC:  DATABASE FABRIC (ES — policy rules) + AI ENGINE FABRIC (policy analysis)
      METHODS: EvaluatePolicyAsync, RegisterPolicyRuleAsync, GetPolicyEvaluationAsync
      FREEDOM: Policy rule sets (stored as FREEDOM config in ES, not hardcoded)

F515  IDataRetentionService
      PURPOSE: Manage data retention schedules (evidence, work diary, contracts) per jurisdiction
      FABRIC:  DATABASE FABRIC (PG — retention policy records) + QUEUE FABRIC (deletion jobs)
      METHODS: SetRetentionPolicyAsync, ProcessRetentionAsync, GetRetentionStatusAsync
      FREEDOM: Retention period per data type per jurisdiction — fully FREEDOM-configurable

F516  IIPTransferService
      PURPOSE: Record and certify intellectual property ownership transfer (contest handover, work product)
      FABRIC:  DATABASE FABRIC (PG — IP transfer records, immutable) + QUEUE FABRIC
      METHODS: RecordIPTransferAsync, CertifyTransferAsync, GetIPStatusAsync
      IRON RULES: IP transfer record is immutable after CERTIFIED status. Append-only.
      DNA:     tenantId + fromParty + toParty + workProductRef + timestamp. ParseDocument only.
```

---

## DNA COMPLIANCE SUMMARY — ALL F466–F516

| DNA Pattern | Enforcement in FLOW-15 |
|-------------|------------------------|
| DNA-1 ParseDocument | All 51 factories use Dictionary<string,object> — no typed models |
| DNA-2 BuildSearchFilter | All ES queries use BuildSearchFilter (F473, F475, F476, F481, F497, F513) |
| DNA-3 DataProcessResult<T> | All 51 factories return DataProcessResult<T> — never throw |
| DNA-4 MicroserviceBase | All generated services extend MicroserviceBase (19 components) |
| DNA-5 Scope Isolation | tenantId mandatory on every factory method, every document, every query |
| DNA-6 DynamicController | No entity-specific controllers generated — DynamicController only |

---

## KEY INVARIANTS — FLOW-15

| ID | Invariant | Enforcement |
|----|-----------|-------------|
| INV-15-1 | Escrow immutable journal — append only | DR-66, F493, IR-492-4 |
| INV-15-2 | Cannot release escrow while dispute OPEN | CF-219, F503, IR-492-1 |
| INV-15-3 | Token wallet spend is idempotent | DR-67, F471, F479 |
| INV-15-4 | KYC must be VERIFIED before contract activation | CF-222, F470, F487 |
| INV-15-5 | IP transfer must be CERTIFIED before prize release | DR-72, F483, F516 |
| INV-15-6 | Audit log is append-only forever | DR-68, F512 |
| INV-15-7 | Work diary screenshot = external ref only (never inline) | DR-70, F497 |
| INV-15-8 | All money ops carry idempotency key | DR-66, F492/F493/F494 |
| INV-15-9 | Deliverables immutable after submission | DR-71, F499 |
| INV-15-10 | tenantId on every factory method — zero exceptions | DNA-5, all F466-F516 |

---

## BACKWARD COMPATIBILITY

```
F1–F465:    UNCHANGED ✅  (465 pre-existing)
F466–F516:  NEW in FLOW-15  (+51 factories, +9 families)

Families 1–59:  UNCHANGED ✅
Families 60–68: NEW

EP-1–EP-5:  STABLE ✅ (no new primitives needed)
DNA-1–DNA-9: STABLE ✅
```

---

## SAVE POINT: FLOW15:P1:ENGINE_ARCHITECTURE ✅
## Next: Load FLOW15_P2_TASK_TYPES
