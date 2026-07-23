# 17 — Freelancer Marketplace Platform — BFA STRESS TEST
## FLOW-15 | CF-214–CF-238 (25 BFA Rules) | ST-104–ST-118 (15 Stress Tests)
## Continues from CF-213 (FLOW-14 last rule)

---

## BFA CONFLICT RULES: CF-214–CF-238

### Group A — Escrow Safety Invariants (CF-214–CF-220)

```
CF-214  ESCROW_HOLD_BEFORE_RELEASE
        Rule:    F492.ReleaseFundsAsync MUST fail if F503.GetHoldStatusAsync = ACTIVE
        Trigger: Any call to F492 release while dispute open
        Check:   T190 MUST call F503.GetHoldStatusAsync before F492.ReleaseFundsAsync
        Violation: DataProcessResult IsSuccess=false, code=ESCROW_HOLD_ACTIVE
        Cross-flow: Applies to all flows that call F492

CF-215  ESCROW_LEDGER_APPEND_ONLY
        Rule:    F493 IEscrowLedgerService MUST be append-only (no UPDATE/DELETE ever)
        Trigger: Any generated code that calls F493
        Check:   AF-7 Compliance scans for any UPDATE/DELETE against F493 table
        Violation: BUILD FAILURE — any mutation of ledger = hard reject

CF-216  ESCROW_FUND_IDEMPOTENCY
        Rule:    Every call to F492.HoldFundsAsync or F493.JournalEntryAsync MUST carry idempotency key
        Trigger: Code generation of any ESCROW_SAGA task type
        Check:   AF-8 Security verifies idempotency key parameter present
        Violation: BUILD FAILURE — money operation without idempotency key

CF-217  ESCROW_FUND_BEFORE_RELEASE
        Rule:    F492 status must = FUNDED before ReleaseFundsAsync can succeed
        Trigger: T190 review/release gate
        Check:   F492 service validates state machine: CREATED→FUNDED→RELEASED only
        Violation: DataProcessResult IsSuccess=false, code=INVALID_STATE_TRANSITION

CF-218  NO_REFUND_AFTER_RELEASE
        Rule:    F492.RefundFundsAsync MUST fail if escrow status = RELEASED
        Trigger: Any refund attempt post-release
        Check:   F492 state machine enforced at DB level (status constraint)
        Violation: DataProcessResult IsSuccess=false, code=ALREADY_RELEASED

CF-219  DISPUTE_BLOCKS_RELEASE
        Rule:    F492 release/refund MUST be blocked while F503 hold is ACTIVE
        Trigger: T191 dispute open gate
        Check:   CF-214 (stronger form). F502 open MUST trigger F503 hold atomically
        Violation: BUILD FAILURE if T191 AF-7 compliance does not verify atomic hold placement

CF-220  PAYOUT_AFTER_RELEASE_ONLY
        Rule:    F494.SchedulePayoutAsync MUST only fire after F493 RELEASE journal entry confirmed
        Trigger: T190 milestone release saga
        Check:   T190 step ordering: F493 RELEASE → F494 schedule (never parallel)
        Violation: BUILD FAILURE — payout before ledger entry
```

---

### Group B — Token Economy Guards (CF-221–CF-224)

```
CF-221  TOKEN_SPEND_ATOMIC_WITH_PROPOSAL
        Rule:    F471 token spend and F479 proposal creation MUST be atomic
        Trigger: T183 proposal submission gate
        Check:   AF-8 verifies single DB transaction scope for spend + create
        Violation: BUILD FAILURE — separate transactions can double-spend on retry

CF-222  TOKEN_SPEND_IDEMPOTENCY
        Rule:    F471.SpendTokensAsync MUST require idempotency key; duplicate key = same result
        Trigger: Any token spend operation (T183, T184)
        Check:   Unique constraint on (userId, idempotencyKey) in token ledger
        Violation: BUILD FAILURE if idempotency key missing

CF-223  INSUFFICIENT_TOKENS_SOFT_FAIL
        Rule:    Insufficient token balance returns DataProcessResult IsSuccess=false — NEVER throws
        Trigger: T183 / T184
        Check:   AF-6 code review verifies no throw for business logic failure
        Violation: Any thrown exception for InsufficientTokens = BUILD FAILURE

CF-224  BOOST_REQUIRES_ACTIVE_PROPOSAL
        Rule:    F480 boost MUST fail if proposal.status ≠ SUBMITTED
        Trigger: T184 boost auction gate
        Check:   F480.BoostProposalAsync validates proposal status before token spend
        Violation: DataProcessResult IsSuccess=false, code=PROPOSAL_NOT_ACTIVE
```

---

### Group C — Compliance Gate Ordering (CF-225–CF-229)

```
CF-225  KYC_BEFORE_CONTRACT_ACTIVATION
        Rule:    F485.ActivateContractAsync MUST fail if F470 KYC status ≠ VERIFIED
        Trigger: T187 activation gate
        Check:   F487.EvaluateActivationReadinessAsync always evaluates F470 first
        Violation: BUILD FAILURE — contract activation without KYC check

CF-226  COMPLIANCE_GATE_BEFORE_ACTIVATION
        Rule:    All tenant compliance gates in F489 MUST pass before T187 activates contract
        Trigger: T187 gate
        Check:   F487 returns gate list; ALL gates must = PASSED
        Violation: DataProcessResult with failed gates list; activation blocked

CF-227  IP_TRANSFER_BEFORE_PRIZE_RELEASE
        Rule:    F492 prize release MUST fail if F516 IPTransfer status ≠ CERTIFIED
        Trigger: T196 contest handover gate
        Check:   F483.CompleteHandoverAsync calls F516.CertifyTransferAsync before F492
        Violation: BUILD FAILURE — prize release without IP transfer certification

CF-228  KYC_EXPIRY_TRIGGERS_CONTRACT_PAUSE
        Rule:    When F470 KYC expires mid-contract, QUEUE FABRIC must emit kyc.expired event
                 and F487 must evaluate contract pause eligibility
        Trigger: F470 KYC expiry timer event
        Check:   TimerInstance registered for KYC expiry; T194 evaluates on expiry
        Violation: Missing expiry timer = BUILD FAILURE

CF-229  ENTERPRISE_CLASSIFICATION_REQUIRED_FOR_ENTERPRISE_TENANTS
        Rule:    F488 worker classification assessment required for enterprise-tier tenants
        Trigger: T187 activation gate when tenant plan = ENTERPRISE
        Check:   F487 checks tenant plan flag; routes to F488 if ENTERPRISE
        Violation: Enterprise activation without classification check = BUILD FAILURE
```

---

### Group D — Cross-Flow Conflicts (CF-230–CF-235)

```
CF-230  FLOW-15 vs FLOW-08 — TENANT IDENTITY PLANE
        Rule:    F466 IProfileService MUST use tenant identity from FLOW-08 auth plane, not re-implement
        Trigger: Any profile creation or lookup
        Check:   F466 resolves tenantId from FLOW-08 IT tenant context — never builds own auth
        Violation: Duplicate tenant identity store = BUILD FAILURE

CF-231  FLOW-15 vs FLOW-14 — DWH ANALYTICS READ-ONLY
        Rule:    FLOW-15 marketplace data written to FLOW-14 DWH (Family 56-57) is READ-ONLY from FLOW-14
                 FLOW-15 must not mutate DWH tables directly
        Trigger: Any F513 report or analytics query
        Check:   FLOW-14 mart data accessed via F455 ISemanticQueryService (read path only)
        Violation: FLOW-15 writing to DWH tables directly = BUILD FAILURE

CF-232  FLOW-15 vs FLOW-09 — SEARCH FABRIC REUSE
        Rule:    F475 ISearchIndexService must reuse FLOW-09 search fabric patterns (SK-37–SK-43)
                 not re-implement search from scratch
        Trigger: Any new search index creation in FLOW-15
        Check:   AF-4 RAG searches SK-37–SK-43 before generating new search code
        Violation: Duplicate search implementation without reusing FLOW-09 patterns

CF-233  FLOW-15 vs FLOW-10 — NOTIFICATION DEDUP
        Rule:    F507 INotificationService must not duplicate F288+ notification patterns from FLOW-10
        Trigger: Any notification factory generation
        Check:   AF-4 checks whether FLOW-10 already has notification fabric; extend vs recreate
        Violation: Parallel notification implementations = BUILD FAILURE

CF-234  FLOW-15 vs FLOW-14 — COMPLIANCE AUDIT SHARED
        Rule:    F512 IAuditLogService audit format must be compatible with FLOW-14 F459 IWarehouseAuditService
        Trigger: Any audit event that is also warehoused for reporting
        Check:   F512 event schema includes all fields required by F459 schema
        Violation: Incompatible audit schemas = downstream DWH load failure

CF-235  FLOW-15 vs ALL FLOWS — TENANT SCOPE ISOLATION
        Rule:    Every FLOW-15 factory method MUST include tenantId scope
                 No query or operation can span tenants
        Trigger: ALL F466-F516 factory generation
        Check:   AF-7 Compliance + AF-9 Judge verify tenantId in every generated query
        Violation: Missing tenantId = BUILD FAILURE (DNA-5)
```

---

### Group E — Privacy & Data Safety (CF-236–CF-238)

```
CF-236  WORK_DIARY_ACCESS_RESTRICTED
        Rule:    F497 work diary data accessible ONLY to contract parties (clientId OR freelancerId)
                 + platform admins. Never exposed to third parties.
        Trigger: Any F497 query or API exposure
        Check:   AF-8 Security verifies object-level authorization on every F497 read
        Violation: Missing object-level auth on work diary = BUILD FAILURE

CF-237  SCREENSHOT_EXTERNAL_REF_ONLY
        Rule:    F497 time slots MUST store screenshot as external object reference
                 Never inline binary or base64 in ES index
        Trigger: F497.RecordTimeSlotAsync
        Check:   AF-7 verifies no binary field in ES document. Object store ref only.
        Violation: Inline screenshot in ES = BUILD FAILURE

CF-238  ACTIVITY_COUNTS_NOT_KEYSTROKES
        Rule:    F501 MUST store numeric activity counts only. No keystroke content, no typed text.
        Trigger: F501.RecordActivityAsync
        Check:   AF-8 Security verifies data schema for F501 — string fields for raw input = FAIL
        Violation: Keystroke content storage = IMMEDIATE BUILD FAILURE (privacy violation)
```

---

## STRESS TESTS: ST-104–ST-118

### Escrow Saga Stress Tests

```
ST-104  DOUBLE_FUND_PREVENTION
        Scenario: Client calls F492.HoldFundsAsync twice with same idempotency key
        Expected: Second call returns same DataProcessResult as first — no second ledger entry
        Validates: CF-216, IR-188-1, F471 unique constraint
        Pass: Single FUND entry in F493, identical response both calls
        Fail: Two FUND entries, double-charge, or exception on duplicate key

ST-105  CONCURRENT_DISPUTE_AND_RELEASE
        Scenario: Client and freelancer simultaneously call dispute open (T191) and release (T190)
        Expected: F503 hold wins — release blocked via CF-219
        Validates: CF-214, CF-219, atomic F502+F503 transaction
        Pass: Dispute hold placed, release returns ESCROW_HOLD_ACTIVE
        Fail: Release succeeds before hold placed

ST-106  PARTIAL_SAGA_FAILURE_COMPENSATION
        Scenario: T188 milestone funding — F492 hold succeeds, F494 fee journal fails
        Expected: Compensation fires, hold reversed, milestone stays CREATED
        Validates: ESCROW_SAGA compensation path, audit trail in F512
        Pass: milestone.fund.compensated event in QUEUE FABRIC, no partial ledger entry
        Fail: Milestone stuck in FUNDED with no fee journal

ST-107  DISPUTE_RESOLUTION_IDEMPOTENCY
        Scenario: T193 resolution gate called twice with same idempotency key
        Expected: Same resolution result, no duplicate ledger entry
        Validates: CF-216 (resolution), IR-193-1
        Pass: Single RESOLVE entry in F493
        Fail: Two resolution entries or inconsistent state

ST-108  AUTO_RELEASE_TIMER_CANCELLATION
        Scenario: T190 auto-release timer fires; client manually approves 1 second before timer
        Expected: Manual approval wins; timer cancelled; no double-release
        Validates: T190 durable timer cancellable on early approval
        Pass: Single RELEASE in F493, TimerInstance cancelled
        Fail: Double RELEASE or race condition
```

---

### Token Economy Stress Tests

```
ST-109  ZERO_TOKEN_BALANCE_PROPOSAL_BLOCK
        Scenario: Freelancer with 0 tokens attempts T183 proposal submission
        Expected: DataProcessResult IsSuccess=false, code=INSUFFICIENT_TOKENS. No proposal record. No token deduct.
        Validates: CF-221, CF-223, IR-183-3
        Pass: No proposal, no ledger entry, clean error result
        Fail: Proposal created with negative token balance, or exception thrown

ST-110  BOOST_ON_NON_SUBMITTED_PROPOSAL
        Scenario: Client shortlists proposal; freelancer then tries T184 boost
        Expected: F480 returns IsSuccess=false, code=PROPOSAL_NOT_ACTIVE
        Validates: CF-224, IR-184-1
        Pass: Boost blocked, no token spend
        Fail: Tokens deducted on non-submittable proposal

ST-111  TOKEN_SPEND_RACE_CONDITION
        Scenario: Same freelancer submits two proposals simultaneously with last 1 token
        Expected: One succeeds, one fails with INSUFFICIENT_TOKENS. DB transaction serialisation enforced.
        Validates: CF-221, DB transaction isolation
        Pass: Exactly one proposal created, one token deducted
        Fail: Both proposals created (overdraft) or both fail (race condition miss)
```

---

### Compliance Gate Stress Tests

```
ST-112  KYC_EXPIRED_MID_CONTRACT
        Scenario: KYC expires while contract is ACTIVE. New milestone funding requested.
        Expected: F487 detects expired KYC; F491 milestone creation blocked; kyc.expired event fired
        Validates: CF-228, IR-194-1
        Pass: Milestone blocked, event fired, T194 re-evaluation triggered
        Fail: Milestone created with expired KYC

ST-113  ENTERPRISE_CONTRACT_WITHOUT_CLASSIFICATION
        Scenario: Enterprise tenant attempts T187 contract activation without F488 classification
        Expected: F487 blocks activation; gateway returns CLASSIFICATION_REQUIRED
        Validates: CF-229, IR-187-4
        Pass: Activation blocked with clear gate failure in result
        Fail: Enterprise contract activates without classification check

ST-114  CROSS_TENANT_PROFILE_EXPOSURE
        Scenario: Tenant A client calls F476 matching; crafted request includes Tenant B freelancer IDs
        Expected: F476 filters by tenantId; Tenant B profiles never returned
        Validates: CF-235, DNA-5, IR-181-2
        Pass: Only Tenant A profiles in result
        Fail: Tenant B profile appears in results
```

---

### Evidence & Privacy Stress Tests

```
ST-115  WORK_DIARY_CROSS_CONTRACT_ACCESS
        Scenario: Freelancer tries to access work diary from a different contract (same tenant)
        Expected: F497 object-level auth blocks access; returns DataProcessResult with AUTH_DENIED
        Validates: CF-236, IR-195-3
        Pass: Access denied; no diary data returned
        Fail: Cross-contract work diary visible

ST-116  INLINE_SCREENSHOT_REJECTION
        Scenario: Generated code attempts to store base64 screenshot inline in ES document
        Expected: AF-7 Compliance catches violation at code generation time — BUILD FAILURE
        Validates: CF-237, DR-70
        Pass: BUILD FAILURE surfaced before code ships
        Fail: Inline screenshot persists to ES

ST-117  CONTEST_PRIZE_WITHOUT_IP_TRANSFER
        Scenario: T196 prize release called without F516 IP transfer completion
        Expected: F492 prize release blocked; returns IP_TRANSFER_REQUIRED
        Validates: CF-227, IR-196-1
        Pass: Prize blocked; F516 status checked before F492 release
        Fail: Prize released with uncertified IP transfer

ST-118  AUDIT_LOG_MUTATION_ATTEMPT
        Scenario: Generated service attempts UPDATE on F512 audit log table
        Expected: AF-7 Compliance catches UPDATE on audit table — BUILD FAILURE
        Validates: CF-215 (broader audit variant), IR (DR-68)
        Pass: BUILD FAILURE at code review stage
        Fail: Mutation of audit log record succeeds
```

---

## BFA REGISTRATION — NEW ENTITIES/EVENTS FOR CF INDEX

### Entities registered for FLOW-15 conflict detection:
```
job, proposal, proposal_boost, contract, milestone, escrow_account,
escrow_ledger_entry, dispute, dispute_evidence, compliance_check,
kyc_record, token_wallet, token_ledger_entry, review, work_diary_slot,
deliverable, contest, contest_entry, ip_transfer, invitation,
consultation_session, audit_log_entry
```

### Events registered for FLOW-15 conflict detection:
```
job.drafted, job.enriched, job.published, job.closed
proposal.submitted, proposal.boosted, proposal.shortlisted, proposal.rejected, proposal.withdrawn
contract.offered, contract.activated, contract.paused, contract.closed
milestone.created, milestone.funded, milestone.submitted, milestone.released, milestone.refunded
dispute.opened, dispute.resolved, dispute.closed
kyc.submitted, kyc.verified, kyc.expired
escrow.held, escrow.released, escrow.refunded
token.spent, token.topped_up
deliverable.submitted
ownership.transferred, contest.prize.released
review.created, reputation.updated
report.generated
```

---

## BACKWARD COMPATIBILITY

```
CF-1–CF-213:   UNCHANGED ✅
CF-214–CF-238: NEW in FLOW-15  (+25 rules)

ST-1–ST-103:   UNCHANGED ✅
ST-104–ST-118: NEW in FLOW-15  (+15 tests)
```

---

## SAVE POINT: FLOW15:P3:BFA_STRESS_TEST ✅
## Next: Load FLOW15_P4_SKILLS
