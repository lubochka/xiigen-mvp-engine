# 13-finance_TASK_TYPES_CATALOG_F13
## XIIGen Engine — FLOW-13 Finance Task Types: T103–T112
## Save Point: P2-TASKS | Status: COMPLETE ✅
## Extends: T1–T102 | Adds: T103–T112 (10 engine contracts)
## Backward compatibility: T1–T102 UNCHANGED

---

## TASK TYPE: T103 — Finance Durable Saga Entry Gate
```
ARCHETYPE:  DURABLE_SAGA
ENTRY:      Fires when a finance flow is initiated (P2P, O2C, R2R, P2Profit, Treasury)
PURPOSE:    Register a new EP-4 durable saga instance with idempotency key, assign correlation_id,
            route to correct finance sub-flow based on flow_type config
DISTINCT FROM: T83 (Generic Durable Saga Entry Gate) — T103 is finance-specific: validates
               fiscal period is open (EP-5), verifies tenant isolation tier (DR-35), checks
               SoD role registration (DNA-9) before saga proceeds
FACTORY DEPENDENCIES:
  F290: IFiscalCalendarService   — verify period is open before saga starts
  F323: ISoDValidationService    — register initiator role at saga start
  F328: ITenantFinanceProvisionService — verify tenant is provisioned
  F329: IFinanceQuotaService     — quota check before saga creation
FABRIC RESOLUTION:
  F290 → DATABASE FABRIC (Skill 05) → PostgreSQL + EP-5 (Period Lock Registry)
  F323 → DATABASE FABRIC (Skill 05) → Elasticsearch (role index) + QUEUE FABRIC (SoD events)
  F328 → MULTI-TENANT ISOLATION FABRIC (Skill 11) + DATABASE FABRIC (Skill 05)
  F329 → DATABASE FABRIC (Skill 05) → Redis provider (quota counters)
AF CONFIGURATION:
  AF-1 Genesis:    Generates FinanceSagaEntryService extending MicroserviceBase
  AF-2 Planning:   Decomposes into: period-check → quota-check → SoD-register → saga-create
  AF-3 Prompt Lib: Retrieves finance saga entry patterns from prompt library
  AF-4 RAG:        Searches SK-44 (Finance Durable Saga Pattern), SK-47 (Period Lock Enforcement)
  AF-5 Multi-model: Parallel generation: Claude (primary) + GPT (review)
  AF-6 Code Review: Automated review of saga state initialization
  AF-7 Compliance:  Checks DNA-1–DNA-9; verifies SoD registration present
  AF-8 Security:    Verifies tenant isolation tier respected; no cross-tenant data access
  AF-9 Judge:       Validates IR-103-1 through IR-103-8 + QG-103-1 through QG-103-6
  AF-10 Merge:      Combines multi-model outputs
  AF-11 Feedback:   Stores generation quality for saga entry patterns
BFA VALIDATION:
  CF-96: Period lock conflict with R2R flow (period close + new saga = potential deadlock)
  CF-97: Quota violation cross-flow (P2P + O2C simultaneous on same tenant/period)
  CF-109: Cross-tenant saga bleed (saga correlation_id must be scoped to tenant_id)
MACHINE/FREEDOM:
  MACHINE:  Saga state initialization, idempotency key generation, EP-4 registration format
  FREEDOM:  Saga timeout values, retry policies, escalation thresholds, approval tiers (via config)
IRON RULES (IR-103-1 to IR-103-8):
  IR-103-1: Saga MUST be registered in EP-4 before any sub-step executes
  IR-103-2: Idempotency key MUST be: tenant_id.flow_type.document_id.v{version}
  IR-103-3: IFiscalCalendarService.IsPeriodOpenAsync MUST return true before saga proceeds
  IR-103-4: Quota check MUST pass before saga creation (F329.CheckQuotaAsync)
  IR-103-5: SoD initiator role MUST be registered via F323 at saga entry
  IR-103-6: Saga state MUST be persisted via DATABASE FABRIC — never in-memory
  IR-103-7: All four fields required: tenant_id, legal_entity_id, ledger_id, fiscal_period
  IR-103-8: If period is CLOSED_LOCKED, saga MUST fail with DataProcessResult.Failure — never proceed
QUALITY GATES (QG-103-1 to QG-103-6):
  QG-103-1: All factory inputs parsed as Dictionary<string,object> — no typed models (DNA-1)
  QG-103-2: BuildSearchFilter skips empty fields on period and tenant lookups (DNA-2)
  QG-103-3: DataProcessResult<T> returned on all paths — no exceptions thrown (DNA-3)
  QG-103-4: AF-9 confirms idempotency: same inputs → same saga_id, no duplicate creation
  QG-103-5: Saga entry audit record written to F322 (IFinanceAuditTrailService) on creation
  QG-103-6: Tenant isolation tier stored in saga context — not re-queried on each step
```

---

## TASK TYPE: T104 — Three-Way Match Gate
```
ARCHETYPE:  VALIDATION
ENTRY:      Fires when IVendorInvoiceService.SubmitAsync completes → queue event (QUEUE FABRIC)
PURPOSE:    Compare Purchase Order, Goods Receipt, and Vendor Invoice; route to approval or
            exception queue; enforce tolerance thresholds from FREEDOM config (DR-34)
DISTINCT FROM: T109 (Double-Entry Validation Gate — checks GL debit=credit balance, not document match)
               T105 (Human Approval Gate — waits for human; T104 is automated matching)
FACTORY DEPENDENCIES:
  F295: IVendorInvoiceService    — retrieve and update invoice match status
  F296: IPurchaseOrderService    — retrieve PO and lines for matching
  F297: IGoodsReceiptService     — retrieve GR and validate quantities
  F298: IMatchExceptionService   — route exceptions to DLQ queue
FABRIC RESOLUTION:
  F295 → DATABASE FABRIC (Skill 05) → PostgreSQL (invoice) + Elasticsearch (audit)
         + QUEUE FABRIC (Skill 04) → Redis Streams (invoice events)
  F296 → DATABASE FABRIC (Skill 05) → PostgreSQL (PO documents)
  F297 → DATABASE FABRIC (Skill 05) → Elasticsearch (receipt search)
  F298 → DATABASE FABRIC (Skill 05) → Elasticsearch (exception documents)
         + QUEUE FABRIC (Skill 04) → Redis Streams (DLQ for match.exception)
AF CONFIGURATION:
  AF-1 Genesis:    Generates ThreeWayMatchService extending MicroserviceBase
  AF-2 Planning:   Decomposes into: fetch-PO → fetch-GR → fetch-Invoice → compare → route
  AF-3 Prompt Lib: Retrieves three-way match patterns
  AF-4 RAG:        Searches SK-46 (Three-Way Match Implementation)
  AF-5 Multi-model: Parallel generation for match algorithm
  AF-6 Code Review: Reviews tolerance threshold extraction from FREEDOM config
  AF-7 Compliance:  DNA-1–DNA-9; verifies DR-34 (tolerance in FREEDOM, not hardcoded)
  AF-8 Security:    Verifies SoD: invoice submitter ≠ match approver
  AF-9 Judge:       Validates IR-104-1 through IR-104-8 + QG-104-1 through QG-104-6
  AF-10 Merge:      Combines outputs
  AF-11 Feedback:   Stores match quality scores
BFA VALIDATION:
  CF-96:  Period lock — match attempt on CLOSED_LOCKED period must fail
  CF-98:  Duplicate invoice detection across P2P flow instances
  CF-110: Cross-tenant vendor invoice access prevention
MACHINE/FREEDOM:
  MACHINE:  Match algorithm logic (PO line vs GR line vs invoice line), DLQ routing pattern
  FREEDOM:  Price variance threshold %, quantity tolerance, auto-approve threshold, escalation tier
IRON RULES (IR-104-1 to IR-104-8):
  IR-104-1: All three documents MUST exist and be retrieved before match gate fires
  IR-104-2: Match result MUST return DataProcessResult<T> — never throw
  IR-104-3: tenant_id + legal_entity_id MUST appear on every document query (DNA-5)
  IR-104-4: Exception routing MUST use QUEUE FABRIC → DLQ — never direct HTTP call
  IR-104-5: Match result document MUST be append-only (DR-29) — never mutate source documents
  IR-104-6: SoD enforced: invoice submitter_id MUST NOT equal match approver_id (DNA-9)
  IR-104-7: Partial receipts MUST route to exception — never auto-approved
  IR-104-8: Period lock checked via F290.IsPeriodOpenAsync BEFORE any posting action
QUALITY GATES (QG-104-1 to QG-104-6):
  QG-104-1: All three documents parsed as Dictionary<string,object> — no typed models
  QG-104-2: BuildSearchFilter skips empty fields on PO/GR/invoice searches
  QG-104-3: Match result stored via DATABASE FABRIC (not in-memory or file system)
  QG-104-4: Exception documents include correlation_id linking PO + GR + Invoice
  QG-104-5: AF-9 confirms price variance tolerance sourced from FREEDOM config (DR-34)
  QG-104-6: Replaying gate with same inputs produces same result (idempotent)
```

---

## TASK TYPE: T105 — Human Approval Gate
```
ARCHETYPE:  HUMAN_GATE
ENTRY:      Fires when a finance document reaches PENDING_APPROVAL state in EP-4 saga
PURPOSE:    Pause saga execution; emit approval.requested event; wait for human decision
            (approve/reject/escalate); resume saga on decision; enforce SoD identity check
DISTINCT FROM: T103 (Saga Entry — starts the flow; T105 pauses it for human decision)
               T104 (Three-Way Match — automated; T105 requires a human actor)
FACTORY DEPENDENCIES:
  F301: IAPWorkflowService       — AP approval workflow (invoices, payments)
  F315: ITreasuryWorkflowService — Treasury approval workflow (payment runs, FX)
  F323: ISoDValidationService    — validate approver ≠ initiator at decision time
  F322: IFinanceAuditTrailService — record approval decision immutably
FABRIC RESOLUTION:
  F301 → DATABASE FABRIC (Skill 05) → Elasticsearch (EP-4 saga state)
         + QUEUE FABRIC (Skill 04) → Redis Streams (approval events)
  F315 → DATABASE FABRIC (Skill 05) → Elasticsearch (EP-4 saga state)
         + QUEUE FABRIC (Skill 04) → Redis Streams
  F323 → DATABASE FABRIC (Skill 05) → Elasticsearch (role index)
         + QUEUE FABRIC (Skill 04) → Redis Streams (SoD violation events)
  F322 → DATABASE FABRIC (Skill 05) → Elasticsearch (audit index — append-only)
AF CONFIGURATION:
  AF-1 Genesis:    Generates FinanceApprovalGateService extending MicroserviceBase
  AF-2 Planning:   Decomposes into: emit-event → wait-EP4 → validate-SoD → record-decision → resume
  AF-3 Prompt Lib: Retrieves human-gate patterns for finance approvals
  AF-4 RAG:        Searches SK-45 (Finance Durable Saga — wait state patterns), SK-51 (SoD Policy)
  AF-5 Multi-model: Single model sufficient (deterministic state machine)
  AF-6 Code Review: Verifies EP-4 wait state properly set — no blocking threads
  AF-7 Compliance:  Verifies DNA-9: approver ≠ initiator ENFORCED at code level
  AF-8 Security:    Verifies approval decision cannot be self-submitted
  AF-9 Judge:       Validates IR-105-1 through IR-105-8 + QG-105-1 through QG-105-6
  AF-10 Merge:      N/A (single model)
  AF-11 Feedback:   Stores approval decision latency for SLA tracking
BFA VALIDATION:
  CF-111: SoD conflict — same actor as initiator attempting approval
  CF-112: Timeout conflict — approval timeout vs period close deadline
  CF-113: Cross-flow approval queue conflict (P2P approval vs O2C approval on same tenant)
MACHINE/FREEDOM:
  MACHINE:  EP-4 wait state pattern, SoD check execution, audit record format
  FREEDOM:  Approval timeout (hours), escalation ladder, delegation rules, reminder intervals
IRON RULES (IR-105-1 to IR-105-8):
  IR-105-1: Saga MUST enter WAITING_APPROVAL state in EP-4 before emitting approval event
  IR-105-2: Approval decision MUST NOT be processed if approver_id == initiator_id (DNA-9)
  IR-105-3: Approval timeout value MUST come from FREEDOM config — never hardcoded
  IR-105-4: Approval decision MUST be written to F322 (audit trail) before saga resumes
  IR-105-5: Rejected approvals MUST emit rejection event to QUEUE FABRIC — never silently drop
  IR-105-6: Escalation MUST fire if no decision within timeout — handled by EP-4 timer
  IR-105-7: Delegate approvals MUST record delegator_id + delegate_id in audit record
  IR-105-8: DataProcessResult<T> returned on all paths — no exceptions thrown
QUALITY GATES (QG-105-1 to QG-105-6):
  QG-105-1: EP-4 saga state persisted via DATABASE FABRIC — no in-memory wait
  QG-105-2: Approval event includes correlation_id, flow_id, document_id, tenant_id
  QG-105-3: SoD validation called at decision time (not at emit time — actor may change)
  QG-105-4: Audit record includes: actor_id, decision, timestamp_utc, saga_id, document_id
  QG-105-5: Replaying decision with same saga_id is idempotent — no duplicate approvals
  QG-105-6: AF-9 confirms escalation timer wired to EP-4 (not a cron job)
```

---

## TASK TYPE: T106 — Period Close Orchestrator
```
ARCHETYPE:  ORCHESTRATION
ENTRY:      Fires when finance team initiates period close (explicit action, not automated)
PURPOSE:    Orchestrate period close checklist: accruals, depreciation, revaluation, allocations,
            subledger sync, reconciliation gates → lock period in EP-5 on all checks passed
DISTINCT FROM: T107 (Subledger-GL Sync — one reconciliation step; T106 is the full close workflow)
               T103 (Saga Entry Gate — starts individual document flows; T106 is the close cycle itself)
FACTORY DEPENDENCIES:
  F290: IFiscalCalendarService          — get period state, check prerequisites
  F300: IAPReconciliationService        — AP subledger sync step
  F307: IARReconciliationService        — AR subledger sync step
  F313: IForeignExchangeService         — revaluation run
  F316: IFixedAssetService              — depreciation run
  F318: ICostAllocationService          — allocation cycle
  F324: IPeriodCloseOrchestrationService — orchestration state + period lock
FABRIC RESOLUTION:
  F290 → DATABASE FABRIC → PostgreSQL + EP-5 (Period Lock Registry)
  F300 → DATABASE FABRIC → PostgreSQL + Elasticsearch + BANK CONNECTIVITY FABRIC
  F307 → DATABASE FABRIC → PostgreSQL + Elasticsearch
  F313 → DATABASE FABRIC → Elasticsearch (rates) + PostgreSQL (postings)
  F316 → DATABASE FABRIC → PostgreSQL (assets) + Elasticsearch (GL audit)
  F318 → DATABASE FABRIC → Elasticsearch (rules) + PostgreSQL (postings)
  F324 → DATABASE FABRIC → Elasticsearch (EP-4 saga + EP-5 state) + QUEUE FABRIC + AI ENGINE FABRIC
AF CONFIGURATION:
  AF-1 Genesis:    Generates PeriodCloseOrchestratorService extending MicroserviceBase
  AF-2 Planning:   Decomposes into 8 sequential close steps with gate conditions
  AF-3 Prompt Lib: Retrieves period close orchestration patterns
  AF-4 RAG:        Searches SK-47 (Period Lock Enforcement), SK-44 (Durable Saga), SK-52 (Subledger-GL)
  AF-5 Multi-model: Parallel review of close step ordering (Claude + Gemini)
  AF-6 Code Review: Verifies all 8 steps produce DataProcessResult + audit records
  AF-7 Compliance:  DNA-1–DNA-9; verifies SoD: close initiator ≠ period lock approver
  AF-8 Security:    Verifies period lock requires privileged actor role
  AF-9 Judge:       Validates IR-106-1 through IR-106-8 + QG-106-1 through QG-106-6
  AF-10 Merge:      Combines close step implementations
  AF-11 Feedback:   Stores close duration metrics
BFA VALIDATION:
  CF-96: Period lock priority — R2R close blocks ALL posting in P2P/O2C for that period
  CF-99: Simultaneous close attempts on same tenant/entity/period
  CF-100: Treasury payment run during period close window
MACHINE/FREEDOM:
  MACHINE:  Close step ordering, EP-5 lock mechanism, reconciliation gate logic
  FREEDOM:  Close checklist items, tolerance thresholds for reconciliation gaps, close SLA hours
IRON RULES (IR-106-1 to IR-106-8):
  IR-106-1: Period MUST be in OPEN state (EP-5) before close run starts
  IR-106-2: AP and AR subledger sync MUST complete before period lock is possible
  IR-106-3: Depreciation run MUST complete for ALL asset books before period lock
  IR-106-4: Revaluation run MUST complete for ALL foreign currency positions
  IR-106-5: Period lock (EP-5.LockPeriod) MUST require a different actor than close initiator (DNA-9)
  IR-106-6: Period lock MUST block ALL posting factories for that tenant/entity/ledger/period
  IR-106-7: Close run MUST produce a DataProcessResult<CloseReport> — never throw
  IR-106-8: Failed close steps MUST surface actionable checklist item — never silently pass
QUALITY GATES (QG-106-1 to QG-106-6):
  QG-106-1: Close checklist stored via DATABASE FABRIC — not in-memory
  QG-106-2: Each close step writes audit record to F322 (IFinanceAuditTrailService)
  QG-106-3: Reconciliation gaps surfaced with exact delta amount — not "reconciliation failed"
  QG-106-4: EP-5 lock state reflects CLOSED_LOCKED only after ALL required steps pass
  QG-106-5: Close run report includes: step results, actors, timestamps, correlation_ids
  QG-106-6: Reopen requires explicit privileged actor + reason — not auto-unlocked on timeout
```

---

## TASK TYPE: T107 — Subledger-GL Sync Gate
```
ARCHETYPE:  VALIDATION
ENTRY:      Fires during period close checklist (T106) OR on-demand reconciliation request
PURPOSE:    Validate that AP/AR/Asset subledger balances match GL control account balances;
            surface reconciliation gaps; block period lock if deltas exceed threshold
DISTINCT FROM: T106 (Period Close Orchestrator — full close workflow; T107 is one validation step)
               T109 (Double-Entry Validation — checks single journal entry balance; T107 checks subledger vs GL)
FACTORY DEPENDENCIES:
  F300: IAPReconciliationService  — AP subledger vs GL control account
  F307: IARReconciliationService  — AR subledger vs GL control account
  F325: IFinancialStatementService — trial balance for cross-check
FABRIC RESOLUTION:
  F300 → DATABASE FABRIC → PostgreSQL (AP subledger) + Elasticsearch (GL journal) + BANK CONNECTIVITY FABRIC
  F307 → DATABASE FABRIC → PostgreSQL (AR subledger) + Elasticsearch (GL journal)
  F325 → DATABASE FABRIC → Elasticsearch (GL aggregation) + PostgreSQL (statement snapshots)
AF CONFIGURATION:
  AF-1 Genesis:    Generates SubledgerGLSyncService extending MicroserviceBase
  AF-4 RAG:        Searches SK-52 (Subledger-GL Sync Pattern)
  AF-7 Compliance: DNA-1–DNA-9; verifies DR-30 (period scope on all queries)
  AF-9 Judge:      Validates IR-107-1 through IR-107-8 + QG-107-1 through QG-107-6
BFA VALIDATION:
  CF-101: Subledger gap conflict — AR gap > threshold blocks ALL O2C posting
  CF-96:  Period lock enforcement during sync
MACHINE/FREEDOM:
  MACHINE:  Sync algorithm, delta calculation, blocking threshold logic
  FREEDOM:  Acceptable reconciliation gap (amount/%), auto-resolution rules, alert recipients
IRON RULES (IR-107-1 to IR-107-8):
  IR-107-1: AP sync MUST compare PostgreSQL subledger total to Elasticsearch GL control account
  IR-107-2: AR sync MUST compare PostgreSQL subledger total to Elasticsearch GL control account
  IR-107-3: Delta calculation MUST account for in-flight transactions (pending queue events)
  IR-107-4: Gap > threshold MUST block period lock in EP-5 — not just a warning
  IR-107-5: Sync result MUST be DataProcessResult<SyncReport> — no exceptions
  IR-107-6: tenant_id + legal_entity_id + ledger_id + fiscal_period on ALL subledger queries
  IR-107-7: Sync MUST be idempotent — running twice produces same delta
  IR-107-8: Sync report MUST write audit record to F322
QUALITY GATES (QG-107-1 to QG-107-6):
  QG-107-1: AP and AR sync run independently (parallel via QUEUE FABRIC events)
  QG-107-2: Gap amounts expressed in base currency of legal entity
  QG-107-3: In-flight transactions identified by QUEUE FABRIC event state (not clock time)
  QG-107-4: All document lookups use Dictionary<string,object> — no typed models
  QG-107-5: BuildSearchFilter applied on all GL journal searches — empty fields skipped
  QG-107-6: AF-9 confirms gap threshold sourced from FREEDOM config
```

---

## TASK TYPE: T108 — Payment Run Gate
```
ARCHETYPE:  ORCHESTRATION
ENTRY:      Fires when treasury initiates payment run; or when bank settlement callback arrives
PURPOSE:    Orchestrate full payment run lifecycle: proposal → dual-approval → bank execution →
            EP-4 wait for bank settlement → reconciliation; idempotent callback handling
DISTINCT FROM: T105 (Human Approval Gate — one approval step; T108 is the full payment run orchestration)
               T103 (Saga Entry — creates the saga; T108 is the core payment orchestration)
FACTORY DEPENDENCIES:
  F299: IAPPaymentService        — payment proposal and AP-side execution
  F310: IPaymentRunService       — payment run lifecycle + bank execution
  F312: IBankReconciliationService — post-settlement reconciliation
  F315: ITreasuryWorkflowService — payment approval workflow (EP-4)
FABRIC RESOLUTION:
  F299 → DATABASE FABRIC → PostgreSQL + BANK CONNECTIVITY FABRIC (Skill 10) + QUEUE FABRIC
  F310 → DATABASE FABRIC → Elasticsearch (EP-4 state) + BANK CONNECTIVITY FABRIC + QUEUE FABRIC
  F312 → DATABASE FABRIC → PostgreSQL (GL) + Elasticsearch (statements) + BANK CONNECTIVITY FABRIC
  F315 → DATABASE FABRIC → Elasticsearch (EP-4 saga) + QUEUE FABRIC
AF CONFIGURATION:
  AF-1 Genesis:    Generates PaymentRunOrchestratorService extending MicroserviceBase
  AF-2 Planning:   Decomposes into: propose → approve-dual → execute → EP4-wait → reconcile
  AF-4 RAG:        Searches SK-49 (Bank Statement Correlation), SK-50 (Idempotency Key Manager)
  AF-7 Compliance: DNA-9: 4-role separation (DR-32); DR-33: bank via BANK CONNECTIVITY FABRIC only
  AF-8 Security:   Payment execution path requires bank fabric — no direct bank API calls
  AF-9 Judge:      Validates IR-108-1 through IR-108-8 + QG-108-1 through QG-108-6
BFA VALIDATION:
  CF-100: Treasury payment run during R2R period close window (conflict)
  CF-102: Duplicate payment prevention (same vendor, same period, same amount)
  CF-112: Payment timeout vs period close deadline
MACHINE/FREEDOM:
  MACHINE:  Payment run lifecycle states, EP-4 bank-wait pattern, idempotency key format
  FREEDOM:  Payment run approval tiers, bank connectivity provider (ISO 20022/SWIFT/OpenBanking),
            settlement timeout, retry policy, dual-control thresholds
IRON RULES (IR-108-1 to IR-108-8):
  IR-108-1: Payment execution MUST use BANK CONNECTIVITY FABRIC — never direct bank SDK (DR-33)
  IR-108-2: Payment run MUST require dual approval (SoD: proposer ≠ approver, DR-32)
  IR-108-3: EP-4 saga MUST enter WAITING_BANK_EVENT state after execution — never polling loop
  IR-108-4: Bank settlement callback MUST be idempotent (duplicate callbacks → same result)
  IR-108-5: Failed payments MUST NOT be retried automatically without explicit approval
  IR-108-6: All payment events MUST go through QUEUE FABRIC — never direct service-to-service HTTP
  IR-108-7: Payment audit record written to F322 at each lifecycle stage
  IR-108-8: Period lock checked BEFORE payment proposal creation (no payments in CLOSED_LOCKED period)
QUALITY GATES (QG-108-1 to QG-108-6):
  QG-108-1: Payment run proposal includes payment list with vendor + amount + bank details
  QG-108-2: Bank connectivity provider resolved via config (not hardcoded to ISO 20022)
  QG-108-3: Idempotency key format: tenant_id.payment_run_id.v{version}
  QG-108-4: Settlement reconciliation runs via F312 — not inline in payment run saga
  QG-108-5: Rejected payments emit to DLQ via QUEUE FABRIC with reason code
  QG-108-6: AF-9 confirms EP-4 wait state used — no Thread.Sleep or polling
```

---

## TASK TYPE: T109 — Double-Entry Validation Gate
```
ARCHETYPE:  VALIDATION
ENTRY:      Fires before ANY GL posting across all finance flows (P2P, O2C, R2R, P2Profit, Treasury)
PURPOSE:    Validate that proposed journal entry has debit sum == credit sum; verify accounts exist
            in chart of accounts; check period is open; enforce single-transaction atomicity
DISTINCT FROM: T107 (Subledger-GL Sync — compares two balances; T109 validates a single new entry)
               T104 (Three-Way Match — document matching; T109 is pure accounting invariant)
FACTORY DEPENDENCIES:
  F288: IChartOfAccountsService  — validate account codes and posting types
  F290: IFiscalCalendarService   — verify period is open (EP-5)
  F293: ITaxCodeService          — validate tax codes on taxable lines
  F322: IFinanceAuditTrailService — write pre-post validation record
FABRIC RESOLUTION:
  F288 → DATABASE FABRIC → Elasticsearch (account hierarchy search)
  F290 → DATABASE FABRIC → PostgreSQL + EP-5 (Period Lock Registry)
  F293 → DATABASE FABRIC → Elasticsearch (tax code lookup)
  F322 → DATABASE FABRIC → Elasticsearch (audit index — append-only)
AF CONFIGURATION:
  AF-1 Genesis:    Generates DoubleEntryValidationService extending MicroserviceBase
  AF-4 RAG:        Searches SK-48 (Double-Entry Journal Guard)
  AF-7 Compliance: DNA-1–DNA-9; verifies DR-31 (compensation-only corrections)
  AF-9 Judge:      Validates IR-109-1 through IR-109-8 + QG-109-1 through QG-109-6
BFA VALIDATION:
  CF-96: Period lock enforcement
  CF-103: Unbalanced journal entry attempted (debit ≠ credit)
  CF-104: Invalid account code for posting type
MACHINE/FREEDOM:
  MACHINE:  Debit=credit validation algorithm, account validity check, period lock enforcement
  FREEDOM:  Tolerance for rounding differences (currency-specific), custom posting rules
IRON RULES (IR-109-1 to IR-109-8):
  IR-109-1: Debit sum MUST equal credit sum — zero tolerance (no rounding exceptions in base currency)
  IR-109-2: Every account code MUST be validated via F288 before posting proceeds
  IR-109-3: Period MUST be OPEN in EP-5 — CLOSED_LOCKED returns Failure immediately
  IR-109-4: PostAsync creates a NEW journal entry document — never updates existing (DR-31)
  IR-109-5: Validation result MUST be DataProcessResult<JournalValidationResult> — no throws
  IR-109-6: All four scope fields required: tenant_id, legal_entity_id, ledger_id, fiscal_period
  IR-109-7: Tax code validated for all lines with tax_code field present
  IR-109-8: Validation record written to F322 before posting proceeds (audit pre-flight)
QUALITY GATES (QG-109-1 to QG-109-6):
  QG-109-1: Journal entry parsed as Dictionary<string,object> list — no typed JournalLine model
  QG-109-2: BuildSearchFilter applied on account code lookups — empty posting_type skipped
  QG-109-3: Rounding tolerance sourced from FREEDOM config (currency-specific)
  QG-109-4: Validation gate is synchronous — no async external calls inside debit=credit check
  QG-109-5: AF-9 confirms gate fires on EVERY posting path — no bypass code paths
  QG-109-6: Idempotent: validating the same journal entry twice produces same result
```

---

## TASK TYPE: T110 — Revenue Recognition Gate
```
ARCHETYPE:  VALIDATION
ENTRY:      Fires in O2C flow after delivery confirmation; before revenue posting to GL
PURPOSE:    Validate IFRS 15 / ASC 606 criteria: performance obligation satisfied, transaction
            price allocated, timing criteria met; authorize or defer revenue recognition
DISTINCT FROM: T109 (Double-Entry Validation — accounting balance check; T110 is revenue policy enforcement)
               T105 (Human Approval — general approval; T110 is automated revenue criteria check
                     with optional escalation on complex contracts)
FACTORY DEPENDENCIES:
  F304: IRevenueRecognitionService — recognition criteria, deferral, posting authorization
  F302: ICustomerInvoiceService    — link revenue recognition to customer invoice
  F290: IFiscalCalendarService     — period open check (EP-5)
  F322: IFinanceAuditTrailService  — record recognition decision
FABRIC RESOLUTION:
  F304 → DATABASE FABRIC → PostgreSQL (recognition records) + QUEUE FABRIC (revenue events)
  F302 → DATABASE FABRIC → PostgreSQL (invoices) + Elasticsearch (audit)
  F290 → DATABASE FABRIC → PostgreSQL + EP-5
  F322 → DATABASE FABRIC → Elasticsearch (audit — append-only)
AF CONFIGURATION:
  AF-1 Genesis:    Generates RevenueRecognitionGateService extending MicroserviceBase
  AF-4 RAG:        Searches SK-53 (Fiscal Calendar Resolver), SK-47 (Period Lock)
  AF-7 Compliance: DNA-1–DNA-9; verifies DR-36 (recognition gate mandatory in O2C)
  AF-9 Judge:      Validates IR-110-1 through IR-110-8 + QG-110-1 through QG-110-6
BFA VALIDATION:
  CF-105: Revenue recognized before delivery confirmed (timing conflict)
  CF-106: Revenue recognition in CLOSED_LOCKED period
MACHINE/FREEDOM:
  MACHINE:  IFRS 15 / ASC 606 criteria validation logic, deferral posting mechanism
  FREEDOM:  Revenue recognition policy (point-in-time vs over-time), contract modification rules,
            auto-defer vs escalate thresholds
IRON RULES (IR-110-1 to IR-110-8):
  IR-110-1: Delivery confirmation MUST return DataProcessResult<bool>(true) before RecognizeAsync
  IR-110-2: Period MUST be OPEN in EP-5 before revenue posting
  IR-110-3: Deferred revenue MUST create a deferred revenue liability posting — not just skip revenue
  IR-110-4: Contract modifications MUST re-evaluate recognition criteria from scratch
  IR-110-5: Recognition decision MUST be written to F322 before GL posting proceeds
  IR-110-6: Revenue recognition records are APPEND-ONLY (DR-31)
  IR-110-7: Multi-element arrangements MUST allocate transaction price before any single element recognized
  IR-110-8: DataProcessResult<T> returned on all paths — no exceptions
QUALITY GATES (QG-110-1 to QG-110-6):
  QG-110-1: Recognition criteria stored as Dictionary<string,object> — no typed RevRecModel
  QG-110-2: BuildSearchFilter applied on contract and obligation lookups
  QG-110-3: Deferred revenue schedule accessible via GetRecognitionScheduleAsync (F304)
  QG-110-4: AF-9 confirms delivery confirmation check is synchronous (not async event-driven)
  QG-110-5: Policy (point-in-time vs over-time) sourced from FREEDOM config
  QG-110-6: Replaying gate for same contract+delivery produces same recognition decision
```

---

## TASK TYPE: T111 — Project Milestone Billing Gate
```
ARCHETYPE:  ORCHESTRATION
ENTRY:      Fires when project milestone is marked complete in Project-to-Profit flow
PURPOSE:    Trigger milestone billing: validate milestone completion, create billing document,
            apply revenue recognition, post to GL, notify customer
DISTINCT FROM: T110 (Revenue Recognition Gate — validates recognition criteria; T111 orchestrates
               the billing and posting workflow triggered by milestone)
FACTORY DEPENDENCIES:
  F308: IBillingService              — create milestone billing document
  F320: IProjectControllingService   — validate milestone completion + cost settlement
  F304: IRevenueRecognitionService   — revenue recognition for milestone (defers to T110)
  F302: ICustomerInvoiceService      — create customer invoice from billing document
FABRIC RESOLUTION:
  F308 → DATABASE FABRIC → PostgreSQL (billing schedules) + QUEUE FABRIC (milestone events)
  F320 → DATABASE FABRIC → PostgreSQL (project costs) + QUEUE FABRIC
  F304 → DATABASE FABRIC → PostgreSQL (recognition) + QUEUE FABRIC
  F302 → DATABASE FABRIC → PostgreSQL (invoices) + Elasticsearch (audit)
AF CONFIGURATION:
  AF-1 Genesis:    Generates ProjectMilestoneBillingService extending MicroserviceBase
  AF-4 RAG:        Searches SK-53 (Fiscal Calendar Resolver)
  AF-7 Compliance: DNA-1–DNA-9; verifies DR-31 (new invoice per milestone, not mutation)
  AF-9 Judge:      Validates IR-111-1 through IR-111-8 + QG-111-1 through QG-111-6
BFA VALIDATION:
  CF-107: Milestone billing before milestone completion confirmed
  CF-106: Billing in CLOSED_LOCKED period
MACHINE/FREEDOM:
  MACHINE:  Milestone completion validation, billing document creation, revenue trigger
  FREEDOM:  Billing type (fixed-price / T&M / cost-plus), invoice timing, retainage rules
IRON RULES (IR-111-1 to IR-111-8):
  IR-111-1: Milestone completion MUST be confirmed via F320 before billing document created
  IR-111-2: Period MUST be OPEN (EP-5) before billing posting
  IR-111-3: Revenue recognition gate (T110) MUST fire before GL revenue posting
  IR-111-4: Each milestone produces a NEW billing document — never amends prior
  IR-111-5: Cost settlement MUST occur in same period as billing (not deferred)
  IR-111-6: SoD: project manager confirming milestone ≠ finance approving billing (DNA-9)
  IR-111-7: Billing document writes audit record to F322 on creation
  IR-111-8: DataProcessResult<T> on all paths
QUALITY GATES (QG-111-1 to QG-111-6):
  QG-111-1: Milestone data parsed as Dictionary<string,object>
  QG-111-2: Revenue recognition sub-gate (T110) called inline — not skipped
  QG-111-3: Customer invoice linked to project via project_id field (for audit trail)
  QG-111-4: Billing schedule sourced from FREEDOM config (not hardcoded dates)
  QG-111-5: Cost settlement and billing are atomic (same EP-4 saga step)
  QG-111-6: AF-9 confirms revenue recognition fires before GL posting
```

---

## TASK TYPE: T112 — Tenant Finance Provision Gate
```
ARCHETYPE:  PROVISIONING
ENTRY:      Fires when a new tenant is onboarded to the finance module
PURPOSE:    Provision finance-specific tenant configuration: isolation tier, chart of accounts
            template, fiscal calendar, bank connectivity config, quota limits, SoD policies
DISTINCT FROM: T103 (Saga Entry — starts a flow for existing tenant; T112 creates the tenant's finance setup)
FACTORY DEPENDENCIES:
  F328: ITenantFinanceProvisionService — register isolation tier, base config
  F329: IFinanceQuotaService           — set initial quota limits
  F290: IFiscalCalendarService         — create fiscal calendar for tenant
  F288: IChartOfAccountsService        — initialize chart of accounts from template
FABRIC RESOLUTION:
  F328 → MULTI-TENANT ISOLATION FABRIC (Skill 11) + DATABASE FABRIC → Elasticsearch (tenant config)
         + QUEUE FABRIC → Redis Streams (tenant.finance.provisioned events)
  F329 → DATABASE FABRIC → Redis provider (quota counters)
  F290 → DATABASE FABRIC → PostgreSQL + EP-5 (register first fiscal period)
  F288 → DATABASE FABRIC → Elasticsearch (chart of accounts index)
AF CONFIGURATION:
  AF-1 Genesis:    Generates TenantFinanceProvisionService extending MicroserviceBase
  AF-7 Compliance: DNA-1–DNA-9; DR-35 (3 isolation tiers config-driven)
  AF-8 Security:   Verifies cross-tenant isolation enforced from first provision
  AF-9 Judge:      Validates IR-112-1 through IR-112-8 + QG-112-1 through QG-112-6
BFA VALIDATION:
  CF-114: Cross-tenant config bleed during provisioning
  CF-109: Tenant correlation_id uniqueness
MACHINE/FREEDOM:
  MACHINE:  Isolation tier registration, EP-5 first period creation, SoD policy binding
  FREEDOM:  Chart of accounts template, fiscal year start, isolation tier (POOLED/BRIDGE/SILO),
            quota limits, bank connectivity provider
IRON RULES (IR-112-1 to IR-112-8):
  IR-112-1: Isolation tier MUST be set in MULTI-TENANT ISOLATION FABRIC (Skill 11) before any finance op
  IR-112-2: Chart of accounts MUST be initialized from a validated template — no empty CoA
  IR-112-3: Fiscal calendar MUST have at least one OPEN period created in EP-5
  IR-112-4: Quota limits MUST be set in F329 before first saga can start (T103 checks quotas)
  IR-112-5: SoD policy MUST be registered in F323 for the tenant before any posting
  IR-112-6: Provisioning MUST be idempotent — re-provisioning same tenant_id is a no-op
  IR-112-7: Provisioning event MUST be emitted to QUEUE FABRIC on completion
  IR-112-8: DataProcessResult<T> on all paths — provisioning failure must not partially configure tenant
QUALITY GATES (QG-112-1 to QG-112-6):
  QG-112-1: Provisioning doc parsed as Dictionary<string,object>
  QG-112-2: Isolation tier sourced from FREEDOM config (DR-35)
  QG-112-3: Quota limits sourced from FREEDOM config — not hardcoded per tenant
  QG-112-4: First fiscal period registered in EP-5 with OPEN state
  QG-112-5: Provisioning audit record written to F322
  QG-112-6: AF-9 confirms re-provision of same tenant_id is idempotent (IR-112-6 verified)
```

---

## TASK TYPE SUMMARY — FLOW-13 T103–T112

| Task Type | Name | Archetype | Key Factories |
|-----------|------|-----------|---------------|
| T103 | Finance Durable Saga Entry Gate | DURABLE_SAGA | F290, F323, F328, F329 |
| T104 | Three-Way Match Gate | VALIDATION | F295, F296, F297, F298 |
| T105 | Human Approval Gate | HUMAN_GATE | F301, F315, F323, F322 |
| T106 | Period Close Orchestrator | ORCHESTRATION | F290, F300, F307, F313, F316, F318, F324 |
| T107 | Subledger-GL Sync Gate | VALIDATION | F300, F307, F325 |
| T108 | Payment Run Gate | ORCHESTRATION | F299, F310, F312, F315 |
| T109 | Double-Entry Validation Gate | VALIDATION | F288, F290, F293, F322 |
| T110 | Revenue Recognition Gate | VALIDATION | F304, F302, F290, F322 |
| T111 | Project Milestone Billing Gate | ORCHESTRATION | F308, F320, F304, F302 |
| T112 | Tenant Finance Provision Gate | PROVISIONING | F328, F329, F290, F288 |

**New Archetypes used:** DURABLE_SAGA (T103), HUMAN_GATE (T105), PROVISIONING (T112)
**All three were registered in prior flows — FLOW-13 uses them, does not redefine them.**

## POST-FLOW-13 TASK TYPES TOTALS
```
Task Types: T1–T112  (112 total, +10)
New Iron Rules:   80  (8 per task type × 10)
New Quality Gates: 60 (6 per task type × 10)
AF Station Cells: 110 (11 × 10)
```

---
## SAVE POINT: P2-TASKS ✅
## NEXT: 13-finance_V62_BFA_STRESS_TEST_F11.md (CF-96–CF-114, ST-47–ST-58)
