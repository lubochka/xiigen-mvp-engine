# ENGINE_ARCHITECTURE_F11
## XIIGen Engine — FLOW-13 Finance Factory Registry Extension
## Save Point: P1-FACTORIES | Status: COMPLETE ✅
## Extends: F1–F287 | Adds: F288–F329 (42 factories, 6 families)
## Backward compatibility: F1–F287 UNCHANGED

---

## PREREQUISITE STATE (entering FLOW-13)

```
Factories:        F1–F287     (287 total)
Families:         1–31        (31 total)
Engine Primitives: EP-1–EP-5  (Durable Saga, Period Lock ALREADY PRESENT)
DNA Patterns:     DNA-1–DNA-9 (SoD ALREADY PRESENT)
Fabrics:          Skill 01–11 (Bank Fabric, MT Isolation ALREADY PRESENT)
Design Records:   DR-1–DR-28
```

**EP-4 (Durable Saga Runtime) and EP-5 (Period Lock Registry) are already in the engine.**
**DNA-9 (Segregation of Duties) is already enforced by AF-7.**
**FLOW-13 uses these primitives — it does NOT redefine them.**

---

## DESIGN RECORDS DR-29–DR-36

### DR-29: Immutable Finance Audit Trail
**Decision:** Every financial document mutation (invoice, payment, journal entry) MUST produce
an append-only audit record stored via DATABASE FABRIC → Elasticsearch provider (audit index).
The record includes: actor_id, tenant_id, legal_entity_id, action, before_hash, after_hash,
timestamp_utc, correlation_id, flow_id, idempotency_key.
**Rationale:** Finance-grade audit requirements demand tamper-evident, chronologically ordered
history. Mutation-in-place would violate double-entry principles.
**Enforcement:** AF-7 (Compliance) rejects generated code that mutates existing financial
documents without creating a compensating/reversal document.
**Scope:** All Family 33–37 factory operations.

### DR-30: Fiscal Period Scope on Every Query
**Decision:** Every database query on financial data MUST include: tenant_id, legal_entity_id,
fiscal_period (or date range that resolves to a period), ledger_id.
**Rationale:** EP-5 (Period Lock Registry) enforces write-prevention at tenant/entity/ledger/period
scope. Without these four fields, the engine cannot enforce period locks or prevent cross-tenant data bleed.
**Enforcement:** DNA-5 (Scope Isolation) extended for finance to require all four fields. AF-9 validates.
**Exception:** Master data reads (chart of accounts, currency rates) — tenant_id required; period optional.

### DR-31: Compensation-Only Error Handling for Posted Documents
**Decision:** Once a financial document is POSTED to the GL, it MUST NOT be deleted or mutated.
Corrections use compensating documents (credit memo, reversal journal entry).
**Rationale:** Double-entry accounting requires an immutable audit trail. "Soft delete" of posted
documents breaks trial balance integrity.
**Enforcement:** T109 (Double-Entry Validation Gate) IRON RULE IR-109-4: PostAsync returns
DataProcessResult<JournalRef>; reversal MUST be a new document, never an UPDATE.
**Scope:** Families 33 (AP), 34 (AR), 35 (Cash), 36 (Asset) — all posting operations.

### DR-32: SoD Four-Role Separation for Payment Flows
**Decision:** In payment flows, four roles MUST be distinct identities: Initiator, Approver,
Poster (GL), Reconciler. No single user may hold more than one role on the same payment document.
**Rationale:** Finance-grade internal controls require SoD to prevent fraud. DNA-9 enforces
this at code-generation time; CF conflict rules enforce it at BFA registration time.
**Enforcement:** AF-7 validates actor_id fields at each workflow step. T105 (Human Approval Gate)
hard-rejects if approver_id == initiator_id.
**Scope:** Families 33, 34, 35 — all documents with approval+posting steps.

### DR-33: Fabric-First Bank Connectivity
**Decision:** All bank connectivity (payment initiation, statement ingestion, reconciliation)
MUST go through BANK CONNECTIVITY FABRIC (Skill 10 — IBankConnectorService).
Provider selection: ISO 20022 | SWIFT | OpenBanking | Plaid | Mock — all via config.
**Rationale:** Bank provider lock-in is a business risk. Config-driven swapping enables
testing (Mock), gradual migration (OpenBanking → ISO 20022), and multi-bank support.
**Enforcement:** AF-8 (Security) checks that no generated service imports bank-specific SDKs.
**Scope:** Family 35 (Cash & Treasury) — all external bank operations.

### DR-34: Three-Way Match Tolerance as FREEDOM Config
**Decision:** Price and quantity variance thresholds for three-way match MUST be stored in
FREEDOM config (Elasticsearch freedom index), not hardcoded in generated services.
**Rationale:** Different tenants, business units, and vendor categories have different
tolerance levels. Hardcoding creates code-change deployments for business rule adjustments.
**Enforcement:** AF-9 quality gate QG-104-6 rejects code with hardcoded tolerance numbers.
**Scope:** T104 (Three-Way Match Gate), F295–F298.

### DR-35: Multi-Tenant Finance Isolation Tiers
**Decision:** FLOW-13 supports three multi-tenant finance isolation tiers:
  POOLED: shared ES indices with tenant_id + legal_entity_id scoping (default)
  BRIDGE: schema-per-tenant in PostgreSQL for high-compliance tenants
  SILO: separate database clusters for enterprise-grade isolation
Tier selection is config-driven via MULTI-TENANT ISOLATION FABRIC (Skill 11).
**Rationale:** ERP finance customers range from SMB (pooled acceptable) to enterprise banks
(silo required). One-size-fits-all isolation would be over-engineered or under-secure.
**Enforcement:** T112 (Tenant Provision Gate) registers the tenant with the correct tier.
**Scope:** Family 37 (Compliance, Audit & Multi-Tenant Finance).

### DR-36: Revenue Recognition Gate as Mandatory O2C Step
**Decision:** The Order-to-Cash flow MUST include a Revenue Recognition Gate (T110) before
any GL posting of revenue. The gate checks: delivery confirmed, performance obligation met,
contract modification status, allocation of transaction price.
**Rationale:** Revenue recognition is a regulated accounting requirement (IFRS 15 / ASC 606).
Auto-posting revenue without recognition validation creates compliance violations.
**Enforcement:** T110 IRON RULE IR-110-1: DeliveryConfirmationAsync MUST return
DataProcessResult<bool>(true) before RevenuePostAsync is called.
**Scope:** Family 34 (Accounts Receivable), Template 21 (fin-order-to-cash-v1).

---

## FACTORY FAMILY 32 — Finance Master Data & Organization
## Factories: F288–F294 | Fabric: DATABASE FABRIC (Skill 05)

### F288: IChartOfAccountsService
```
FAMILY: 32 — Finance Master Data & Organization
PURPOSE: Manage GL account hierarchy, account codes, account types, and chart-of-accounts versions
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Elasticsearch provider (account search + hierarchy)
CREATION: IExternalServiceFactory<IChartOfAccountsService>.CreateAsync(ctx)
METHODS:
  GetAccountAsync(tenantId, legalEntityId, accountCode)    → DataProcessResult<Dictionary>
  SearchAccountsAsync(tenantId, legalEntityId, filter)     → DataProcessResult<List<Dictionary>>
  CreateAccountAsync(tenantId, accountDoc)                 → DataProcessResult<Dictionary>
  UpdateAccountAsync(tenantId, accountId, patchDoc)        → DataProcessResult<Dictionary>
  ValidateAccountAsync(tenantId, accountCode, postingType) → DataProcessResult<bool>
DNA COMPLIANCE:
  DNA-1: All account documents as Dictionary<string,object> via ParseDocument
  DNA-2: BuildSearchFilter skips empty accountCode/type/period fields
  DNA-3: DataProcessResult<T> on all returns — never throw
  DNA-4: Extends MicroserviceBase (19 components inherited)
  DNA-5: tenant_id + legal_entity_id on EVERY query
  DNA-6: DynamicController — no ChartOfAccountsController entity class
```

### F289: ILegalEntityService
```
FAMILY: 32 — Finance Master Data & Organization
PURPOSE: Manage legal entities, company codes, intercompany relationships, and org hierarchy
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL provider (relational hierarchy)
CREATION: IExternalServiceFactory<ILegalEntityService>.CreateAsync(ctx)
METHODS:
  GetEntityAsync(tenantId, legalEntityId)                  → DataProcessResult<Dictionary>
  ListEntitiesAsync(tenantId, filter)                      → DataProcessResult<List<Dictionary>>
  GetCurrencySettingsAsync(tenantId, legalEntityId)        → DataProcessResult<Dictionary>
  GetIntercompanyRelationsAsync(tenantId, legalEntityId)   → DataProcessResult<List<Dictionary>>
  ValidatePostingCurrencyAsync(tenantId, entityId, currency) → DataProcessResult<bool>
DNA COMPLIANCE: DNA-1 through DNA-6 as above
```

### F290: IFiscalCalendarService
```
FAMILY: 32 — Finance Master Data & Organization
PURPOSE: Manage fiscal periods, fiscal years, period open/close state, and calendar variants
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL provider + EP-5 (Period Lock Registry)
CREATION: IExternalServiceFactory<IFiscalCalendarService>.CreateAsync(ctx)
METHODS:
  GetCurrentPeriodAsync(tenantId, legalEntityId, ledgerId)         → DataProcessResult<Dictionary>
  GetPeriodStateAsync(tenantId, legalEntityId, ledgerId, period)   → DataProcessResult<Dictionary>
  ResolvePeriodForDateAsync(tenantId, legalEntityId, date)         → DataProcessResult<Dictionary>
  IsPeriodOpenAsync(tenantId, legalEntityId, ledgerId, period)     → DataProcessResult<bool>
  GetPeriodRangeAsync(tenantId, legalEntityId, fiscalYear)         → DataProcessResult<List<Dictionary>>
CRITICAL: This factory bridges to EP-5 (Period Lock Registry). IsPeriodOpenAsync checks
          the EP-5 state before returning. NEVER bypass EP-5 with direct DB query.
DNA COMPLIANCE: DNA-1 through DNA-6 + DR-30 (fiscal period scope on every query)
```

### F291: IExchangeRateService
```
FAMILY: 32 — Finance Master Data & Organization
PURPOSE: Manage currency exchange rates, rate types (spot/average/closing), multi-currency conversions
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Elasticsearch provider (rate search by date range)
CREATION: IExternalServiceFactory<IExchangeRateService>.CreateAsync(ctx)
METHODS:
  GetRateAsync(tenantId, fromCurrency, toCurrency, rateType, date) → DataProcessResult<Dictionary>
  ConvertAmountAsync(tenantId, amount, from, to, rateType, date)   → DataProcessResult<Dictionary>
  StoreRateAsync(tenantId, rateDoc)                                → DataProcessResult<Dictionary>
  GetRateHistoryAsync(tenantId, from, to, dateRange)               → DataProcessResult<List<Dictionary>>
DNA COMPLIANCE: DNA-1 through DNA-6
```

### F292: ICostCenterService
```
FAMILY: 32 — Finance Master Data & Organization
PURPOSE: Manage cost centers, profit centers, allocation rules, and controlling dimensions
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL provider
CREATION: IExternalServiceFactory<ICostCenterService>.CreateAsync(ctx)
METHODS:
  GetCostCenterAsync(tenantId, legalEntityId, costCenterId)         → DataProcessResult<Dictionary>
  ValidateCostCenterAsync(tenantId, legalEntityId, costCenterId)    → DataProcessResult<bool>
  GetAllocationRulesAsync(tenantId, legalEntityId, costCenterId)    → DataProcessResult<List<Dictionary>>
  PostAllocationAsync(tenantId, allocationDoc)                      → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6
```

### F293: ITaxCodeService
```
FAMILY: 32 — Finance Master Data & Organization
PURPOSE: Manage tax codes, VAT rates, withholding rules, and tax calculation for transactions
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Elasticsearch provider (tax code lookup)
CREATION: IExternalServiceFactory<ITaxCodeService>.CreateAsync(ctx)
METHODS:
  GetTaxCodeAsync(tenantId, legalEntityId, taxCode)                → DataProcessResult<Dictionary>
  CalculateTaxAsync(tenantId, legalEntityId, taxCode, baseAmount)  → DataProcessResult<Dictionary>
  ValidateTaxCodeAsync(tenantId, legalEntityId, taxCode)           → DataProcessResult<bool>
  GetVATReportDataAsync(tenantId, legalEntityId, period, filter)   → DataProcessResult<List<Dictionary>>
DNA COMPLIANCE: DNA-1 through DNA-6
```

### F294: IVendorMasterService
```
FAMILY: 32 — Finance Master Data & Organization
PURPOSE: Manage vendor master data, payment terms, bank details, tax compliance status
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL provider
CREATION: IExternalServiceFactory<IVendorMasterService>.CreateAsync(ctx)
METHODS:
  GetVendorAsync(tenantId, vendorId)                               → DataProcessResult<Dictionary>
  ValidateVendorActiveAsync(tenantId, vendorId)                    → DataProcessResult<bool>
  GetPaymentTermsAsync(tenantId, vendorId)                         → DataProcessResult<Dictionary>
  ValidateTaxComplianceAsync(tenantId, vendorId)                   → DataProcessResult<bool>
  GetVendorBankDetailsAsync(tenantId, vendorId)                    → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6
```

---

## FACTORY FAMILY 33 — Accounts Payable
## Factories: F295–F301 | Fabric: DATABASE FABRIC + QUEUE FABRIC

### F295: IVendorInvoiceService
```
FAMILY: 33 — Accounts Payable
PURPOSE: Manage vendor invoice lifecycle: submit, match, approve, post, reverse
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → PostgreSQL provider (invoice documents)
  Audit:      DATABASE FABRIC (Skill 05) → Elasticsearch provider (audit index per DR-29)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (invoice.submitted, invoice.posted events)
CREATION: IExternalServiceFactory<IVendorInvoiceService>.CreateAsync(ctx)
METHODS:
  SubmitInvoiceAsync(tenantId, legalEntityId, invoiceDoc)          → DataProcessResult<Dictionary>
  GetInvoiceAsync(tenantId, legalEntityId, invoiceId)              → DataProcessResult<Dictionary>
  RunThreeWayMatchAsync(tenantId, legalEntityId, invoiceId)        → DataProcessResult<Dictionary>
  ApproveInvoiceAsync(tenantId, legalEntityId, invoiceId, actorCtx) → DataProcessResult<Dictionary>
  PostToGLAsync(tenantId, legalEntityId, invoiceId, periodRef)     → DataProcessResult<Dictionary>
  CreateReversalAsync(tenantId, legalEntityId, invoiceId, reason)  → DataProcessResult<Dictionary>
DNA-9 (SoD): submitter_id ≠ approver_id ≠ gl_poster_id (enforced in PostToGLAsync guard)
DR-29: Every PostToGLAsync and CreateReversalAsync writes immutable audit record
DR-30: tenant_id + legal_entity_id + fiscal_period + ledger_id on ALL GL queries
DR-31: PostToGLAsync creates new journal entry; NEVER mutates existing posted document
DNA COMPLIANCE: DNA-1 through DNA-9
```

### F296: IPurchaseOrderService
```
FAMILY: 33 — Accounts Payable
PURPOSE: Manage purchase orders for three-way match: PO header, lines, commitments, changes
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL provider
CREATION: IExternalServiceFactory<IPurchaseOrderService>.CreateAsync(ctx)
METHODS:
  GetPOAsync(tenantId, legalEntityId, poId)                        → DataProcessResult<Dictionary>
  GetPOLinesAsync(tenantId, legalEntityId, poId)                   → DataProcessResult<List<Dictionary>>
  GetPOCommitmentAsync(tenantId, legalEntityId, poId)              → DataProcessResult<Dictionary>
  MatchInvoiceToPOAsync(tenantId, legalEntityId, poId, invoiceId)  → DataProcessResult<Dictionary>
  GetOpenPOsForVendorAsync(tenantId, legalEntityId, vendorId)      → DataProcessResult<List<Dictionary>>
DNA COMPLIANCE: DNA-1 through DNA-6 + DR-30
```

### F297: IGoodsReceiptService
```
FAMILY: 33 — Accounts Payable
PURPOSE: Manage goods receipts for three-way match: receipt confirmation, partial receipts, returns
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Elasticsearch provider (receipt search by PO/vendor)
CREATION: IExternalServiceFactory<IGoodsReceiptService>.CreateAsync(ctx)
METHODS:
  GetReceiptAsync(tenantId, legalEntityId, receiptId)              → DataProcessResult<Dictionary>
  SearchReceiptsForPOAsync(tenantId, legalEntityId, poId)          → DataProcessResult<List<Dictionary>>
  GetReceiptStatusAsync(tenantId, legalEntityId, receiptId)        → DataProcessResult<Dictionary>
  ValidateReceiptQuantityAsync(tenantId, legalEntityId, receiptId, invoiceLines) → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6 + DR-30
```

### F298: IMatchExceptionService
```
FAMILY: 33 — Accounts Payable
PURPOSE: Manage three-way match exceptions: route to DLQ, track resolution, approval override
FABRIC RESOLUTION:
  Storage:  DATABASE FABRIC (Skill 05) → Elasticsearch provider (exception documents)
  Routing:  QUEUE FABRIC (Skill 04) → Redis Streams (DLQ for match.exception events)
CREATION: IExternalServiceFactory<IMatchExceptionService>.CreateAsync(ctx)
METHODS:
  CreateExceptionAsync(tenantId, legalEntityId, exceptionDoc)      → DataProcessResult<Dictionary>
  GetExceptionAsync(tenantId, legalEntityId, exceptionId)          → DataProcessResult<Dictionary>
  RouteToResolutionQueueAsync(tenantId, legalEntityId, exceptionId) → DataProcessResult<bool>
  ApproveExceptionAsync(tenantId, legalEntityId, exceptionId, actorCtx) → DataProcessResult<Dictionary>
  ResolveExceptionAsync(tenantId, legalEntityId, exceptionId, resolution) → DataProcessResult<Dictionary>
DNA-9 (SoD): exception_creator_id ≠ exception_approver_id
DNA COMPLIANCE: DNA-1 through DNA-9
```

### F299: IAPPaymentService
```
FAMILY: 33 — Accounts Payable
PURPOSE: Manage AP payment proposals, payment runs, payment execution, and payment advice
FABRIC RESOLUTION:
  Storage:  DATABASE FABRIC (Skill 05) → PostgreSQL provider
  Execution: BANK CONNECTIVITY FABRIC (Skill 10) → IBankConnectorService (per DR-33)
  Events:   QUEUE FABRIC (Skill 04) → Redis Streams (payment.initiated, payment.settled events)
CREATION: IExternalServiceFactory<IAPPaymentService>.CreateAsync(ctx)
METHODS:
  CreatePaymentProposalAsync(tenantId, legalEntityId, criteria)    → DataProcessResult<Dictionary>
  ApprovePaymentRunAsync(tenantId, legalEntityId, runId, actorCtx) → DataProcessResult<Dictionary>
  ExecutePaymentAsync(tenantId, legalEntityId, runId)              → DataProcessResult<Dictionary>
  GetPaymentStatusAsync(tenantId, legalEntityId, paymentId)        → DataProcessResult<Dictionary>
DNA-9 (SoD): proposer ≠ approver ≠ executor (DR-32: 4-role separation)
DR-33: ExecutePaymentAsync MUST go through BANK CONNECTIVITY FABRIC, never direct bank API
DNA COMPLIANCE: DNA-1 through DNA-9
```

### F300: IAPReconciliationService
```
FAMILY: 33 — Accounts Payable
PURPOSE: Reconcile AP subledger with GL, match bank statements to payments, aging reports
FABRIC RESOLUTION:
  Subledger: DATABASE FABRIC (Skill 05) → PostgreSQL provider
  GL:        DATABASE FABRIC (Skill 05) → Elasticsearch provider (GL journal index)
  Bank:      BANK CONNECTIVITY FABRIC (Skill 10) → IBankConnectorService (statement ingestion)
CREATION: IExternalServiceFactory<IAPReconciliationService>.CreateAsync(ctx)
METHODS:
  RunSubledgerGLSyncAsync(tenantId, legalEntityId, period)         → DataProcessResult<Dictionary>
  GetAPAgingAsync(tenantId, legalEntityId, asOfDate, filter)       → DataProcessResult<List<Dictionary>>
  MatchBankStatementToPaymentsAsync(tenantId, legalEntityId, statementDoc) → DataProcessResult<Dictionary>
  GetReconciliationStatusAsync(tenantId, legalEntityId, period)    → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6 + DR-29 + DR-30
```

### F301: IAPWorkflowService
```
FAMILY: 33 — Accounts Payable
PURPOSE: Orchestrate AP approval workflows, escalation rules, delegation chains (EP-4 integration)
FABRIC RESOLUTION:
  State:  DATABASE FABRIC (Skill 05) → Elasticsearch provider (saga state documents per EP-4)
  Events: QUEUE FABRIC (Skill 04) → Redis Streams (workflow.approval.requested events)
CREATION: IExternalServiceFactory<IAPWorkflowService>.CreateAsync(ctx)
METHODS:
  StartApprovalWorkflowAsync(tenantId, documentId, workflowDef)    → DataProcessResult<Dictionary>
  GetWorkflowStateAsync(tenantId, sagaId)                          → DataProcessResult<Dictionary>
  SubmitApprovalDecisionAsync(tenantId, sagaId, decision, actorCtx) → DataProcessResult<Dictionary>
  EscalateWorkflowAsync(tenantId, sagaId, escalationReason)        → DataProcessResult<Dictionary>
CRITICAL: This factory uses EP-4 (Durable Saga) for wait states.
          Workflow state is stored per EP-4 patterns — never in-memory.
DNA COMPLIANCE: DNA-1 through DNA-9
```

---

## FACTORY FAMILY 34 — Accounts Receivable
## Factories: F302–F308 | Fabric: DATABASE FABRIC + QUEUE FABRIC

### F302: ICustomerInvoiceService
```
FAMILY: 34 — Accounts Receivable
PURPOSE: Manage customer invoice lifecycle: create, approve, send, receive payment, post GL
FABRIC RESOLUTION:
  Primary:  DATABASE FABRIC (Skill 05) → PostgreSQL provider
  Audit:    DATABASE FABRIC (Skill 05) → Elasticsearch provider (audit index)
  Events:   QUEUE FABRIC (Skill 04) → Redis Streams (invoice.sent, payment.received events)
CREATION: IExternalServiceFactory<ICustomerInvoiceService>.CreateAsync(ctx)
METHODS:
  CreateInvoiceAsync(tenantId, legalEntityId, invoiceDoc)          → DataProcessResult<Dictionary>
  ApproveInvoiceAsync(tenantId, legalEntityId, invoiceId, actorCtx) → DataProcessResult<Dictionary>
  PostToGLAsync(tenantId, legalEntityId, invoiceId, periodRef)     → DataProcessResult<Dictionary>
  ApplyPaymentAsync(tenantId, legalEntityId, invoiceId, paymentDoc) → DataProcessResult<Dictionary>
  CreateCreditMemoAsync(tenantId, legalEntityId, invoiceId, reason) → DataProcessResult<Dictionary>
DR-31: Credit memos are new documents — never mutate posted invoice
DNA-9 (SoD): invoice_creator_id ≠ invoice_approver_id ≠ gl_poster_id
DNA COMPLIANCE: DNA-1 through DNA-9
```

### F303: ICustomerMasterService
```
FAMILY: 34 — Accounts Receivable
PURPOSE: Manage customer master: credit limits, payment terms, dunning levels, bank details
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL provider
CREATION: IExternalServiceFactory<ICustomerMasterService>.CreateAsync(ctx)
METHODS:
  GetCustomerAsync(tenantId, legalEntityId, customerId)            → DataProcessResult<Dictionary>
  GetCreditLimitAsync(tenantId, legalEntityId, customerId)         → DataProcessResult<Dictionary>
  ValidateCreditLimitAsync(tenantId, legalEntityId, customerId, amount) → DataProcessResult<Dictionary>
  GetDunningStatusAsync(tenantId, legalEntityId, customerId)       → DataProcessResult<Dictionary>
  UpdateDunningLevelAsync(tenantId, legalEntityId, customerId, level) → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6
```

### F304: IRevenueRecognitionService
```
FAMILY: 34 — Accounts Receivable
PURPOSE: Validate and execute revenue recognition: performance obligations, allocation, timing (IFRS 15)
FABRIC RESOLUTION:
  Storage:  DATABASE FABRIC (Skill 05) → PostgreSQL provider
  Events:   QUEUE FABRIC (Skill 04) → Redis Streams (revenue.recognized events)
CREATION: IExternalServiceFactory<IRevenueRecognitionService>.CreateAsync(ctx)
METHODS:
  ValidatePerformanceObligationAsync(tenantId, legalEntityId, contractId) → DataProcessResult<Dictionary>
  AllocateTransactionPriceAsync(tenantId, legalEntityId, contractId)  → DataProcessResult<Dictionary>
  RecognizeRevenueAsync(tenantId, legalEntityId, contractId, deliveryDoc) → DataProcessResult<Dictionary>
  GetRecognitionScheduleAsync(tenantId, legalEntityId, contractId)    → DataProcessResult<List<Dictionary>>
  DeferRevenueAsync(tenantId, legalEntityId, contractId, reason)      → DataProcessResult<Dictionary>
CRITICAL: RecognizeRevenueAsync MUST check IsPeriodOpenAsync(EP-5) before GL posting (DR-36)
DNA COMPLIANCE: DNA-1 through DNA-9
```

### F305: ICashApplicationService
```
FAMILY: 34 — Accounts Receivable
PURPOSE: Apply customer payments to open invoices, handle partial payments, unapplied cash
FABRIC RESOLUTION:
  Storage: DATABASE FABRIC (Skill 05) → Elasticsearch provider (payment search + matching)
  Bank:    BANK CONNECTIVITY FABRIC (Skill 10) → IBankConnectorService (statement correlation)
CREATION: IExternalServiceFactory<ICashApplicationService>.CreateAsync(ctx)
METHODS:
  ApplyPaymentAsync(tenantId, legalEntityId, paymentDoc, invoiceIds) → DataProcessResult<Dictionary>
  SearchOpenInvoicesAsync(tenantId, legalEntityId, customerId, filter) → DataProcessResult<List<Dictionary>>
  HandleUnappliedCashAsync(tenantId, legalEntityId, paymentDoc)      → DataProcessResult<Dictionary>
  GetCashApplicationStatusAsync(tenantId, legalEntityId, paymentId)  → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6 + DR-30
```

### F306: IDunningService
```
FAMILY: 34 — Accounts Receivable
PURPOSE: Manage collections dunning: aging analysis, dunning notices, escalation, write-off
FABRIC RESOLUTION:
  Storage: DATABASE FABRIC (Skill 05) → Elasticsearch provider (aging buckets)
  Events:  QUEUE FABRIC (Skill 04) → Redis Streams (dunning.notice.sent events)
CREATION: IExternalServiceFactory<IDunningService>.CreateAsync(ctx)
METHODS:
  RunAgingAnalysisAsync(tenantId, legalEntityId, asOfDate, filter)   → DataProcessResult<List<Dictionary>>
  CreateDunningNoticeAsync(tenantId, legalEntityId, customerId, level) → DataProcessResult<Dictionary>
  EscalateCollectionsAsync(tenantId, legalEntityId, customerId)       → DataProcessResult<Dictionary>
  WriteOffReceivableAsync(tenantId, legalEntityId, invoiceId, actorCtx) → DataProcessResult<Dictionary>
DNA-9 (SoD): write-off initiator ≠ write-off approver
DNA COMPLIANCE: DNA-1 through DNA-9
```

### F307: IARReconciliationService
```
FAMILY: 34 — Accounts Receivable
PURPOSE: Reconcile AR subledger with GL, produce AR aging, validate customer balances
FABRIC RESOLUTION:
  Subledger: DATABASE FABRIC (Skill 05) → PostgreSQL provider
  GL:        DATABASE FABRIC (Skill 05) → Elasticsearch provider
CREATION: IExternalServiceFactory<IARReconciliationService>.CreateAsync(ctx)
METHODS:
  RunSubledgerGLSyncAsync(tenantId, legalEntityId, period)          → DataProcessResult<Dictionary>
  GetARAgingAsync(tenantId, legalEntityId, asOfDate, filter)        → DataProcessResult<List<Dictionary>>
  ValidateCustomerBalanceAsync(tenantId, legalEntityId, customerId)  → DataProcessResult<Dictionary>
  GetReconciliationGapAsync(tenantId, legalEntityId, period)        → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6 + DR-29 + DR-30
```

### F308: IBillingService
```
FAMILY: 34 — Accounts Receivable
PURPOSE: Manage recurring billing, project billing, milestone billing, and billing schedules
FABRIC RESOLUTION:
  Storage: DATABASE FABRIC (Skill 05) → PostgreSQL provider
  Events:  QUEUE FABRIC (Skill 04) → Redis Streams (billing.milestone.reached events)
CREATION: IExternalServiceFactory<IBillingService>.CreateAsync(ctx)
METHODS:
  CreateBillingScheduleAsync(tenantId, legalEntityId, scheduleDoc)   → DataProcessResult<Dictionary>
  RunRecurringBillingAsync(tenantId, legalEntityId, period)          → DataProcessResult<List<Dictionary>>
  BillMilestoneAsync(tenantId, legalEntityId, projectId, milestoneId) → DataProcessResult<Dictionary>
  GetBillingScheduleAsync(tenantId, legalEntityId, customerId)       → DataProcessResult<List<Dictionary>>
DNA COMPLIANCE: DNA-1 through DNA-6
```

---

## FACTORY FAMILY 35 — Cash & Treasury
## Factories: F309–F315 | Fabric: DATABASE FABRIC + BANK CONNECTIVITY FABRIC + QUEUE FABRIC

### F309: IBankStatementService
```
FAMILY: 35 — Cash & Treasury
PURPOSE: Ingest and process bank statements; correlate statement lines to payment records
FABRIC RESOLUTION:
  Ingest:  BANK CONNECTIVITY FABRIC (Skill 10) → IBankConnectorService.IngestStatementAsync()
  Storage: DATABASE FABRIC (Skill 05) → Elasticsearch provider (statement line search)
  Events:  QUEUE FABRIC (Skill 04) → Redis Streams (bank.statement.received events)
CREATION: IExternalServiceFactory<IBankStatementService>.CreateAsync(ctx)
METHODS:
  IngestStatementAsync(tenantId, legalEntityId, bankAccountId, statementSource) → DataProcessResult<Dictionary>
  SearchStatementLinesAsync(tenantId, legalEntityId, bankAccountId, filter) → DataProcessResult<List<Dictionary>>
  CorrelateLineToPaymentAsync(tenantId, legalEntityId, statementLineId)     → DataProcessResult<Dictionary>
  GetUnmatchedLinesAsync(tenantId, legalEntityId, bankAccountId, period)    → DataProcessResult<List<Dictionary>>
DR-33: IngestStatementAsync MUST use BANK CONNECTIVITY FABRIC — never parse raw bank files directly
DNA COMPLIANCE: DNA-1 through DNA-6 + DR-33
```

### F310: IPaymentRunService
```
FAMILY: 35 — Cash & Treasury
PURPOSE: Manage payment run lifecycle: proposal, approval, execution, settlement tracking (EP-4 saga)
FABRIC RESOLUTION:
  State:   DATABASE FABRIC (Skill 05) → Elasticsearch provider (saga state per EP-4)
  Execute: BANK CONNECTIVITY FABRIC (Skill 10) → IBankConnectorService.InitiatePaymentAsync()
  Events:  QUEUE FABRIC (Skill 04) → Redis Streams (payment.run.executed events)
CREATION: IExternalServiceFactory<IPaymentRunService>.CreateAsync(ctx)
METHODS:
  CreatePaymentProposalAsync(tenantId, legalEntityId, criteria)     → DataProcessResult<Dictionary>
  ApproveRunAsync(tenantId, legalEntityId, runId, actorCtx)         → DataProcessResult<Dictionary>
  ExecuteRunAsync(tenantId, legalEntityId, runId)                   → DataProcessResult<Dictionary>
  GetRunStatusAsync(tenantId, legalEntityId, runId)                 → DataProcessResult<Dictionary>
  HandleSettlementCallbackAsync(tenantId, legalEntityId, callbackDoc) → DataProcessResult<Dictionary>
CRITICAL: This factory integrates with EP-4 (Durable Saga) for wait states between
          SENT_TO_BANK and SETTLED. HandleSettlementCallbackAsync is the EP-4 signal.
DNA-9 (SoD): proposer ≠ approver ≠ executor (DR-32)
DR-33: ExecuteRunAsync MUST use BANK CONNECTIVITY FABRIC
DNA COMPLIANCE: DNA-1 through DNA-9
```

### F311: ICashForecastService
```
FAMILY: 35 — Cash & Treasury
PURPOSE: Cash position, liquidity forecast, cash flow statement
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Elasticsearch provider (aggregations)
CREATION: IExternalServiceFactory<ICashForecastService>.CreateAsync(ctx)
METHODS:
  GetCashPositionAsync(tenantId, legalEntityId, bankAccountId, asOf)  → DataProcessResult<Dictionary>
  GenerateLiquidityForecastAsync(tenantId, legalEntityId, horizonDays) → DataProcessResult<List<Dictionary>>
  GetCashFlowStatementAsync(tenantId, legalEntityId, period)           → DataProcessResult<Dictionary>
  ProjectCashFlowAsync(tenantId, legalEntityId, criteria)              → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6 + DR-30
```

### F312: IBankReconciliationService
```
FAMILY: 35 — Cash & Treasury
PURPOSE: Reconcile bank statement to GL cash accounts; close reconciliation; manage differences
FABRIC RESOLUTION:
  Bank GL: DATABASE FABRIC (Skill 05) → PostgreSQL provider (GL cash accounts)
  Statement: DATABASE FABRIC (Skill 05) → Elasticsearch provider (statement lines)
  Bank:    BANK CONNECTIVITY FABRIC (Skill 10) → IBankConnectorService.ReconcileAsync()
CREATION: IExternalServiceFactory<IBankReconciliationService>.CreateAsync(ctx)
METHODS:
  StartReconciliationAsync(tenantId, legalEntityId, bankAccountId, period) → DataProcessResult<Dictionary>
  MatchStatementToGLAsync(tenantId, legalEntityId, reconId)               → DataProcessResult<Dictionary>
  GetUnreconciledItemsAsync(tenantId, legalEntityId, reconId)              → DataProcessResult<List<Dictionary>>
  CloseReconciliationAsync(tenantId, legalEntityId, reconId, actorCtx)     → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6 + DR-29 + DR-30
```

### F313: IForeignExchangeService
```
FAMILY: 35 — Cash & Treasury
PURPOSE: Manage FX exposure, revaluation runs, hedge accounting entries
FABRIC RESOLUTION:
  Rates:   DATABASE FABRIC (Skill 05) → Elasticsearch provider (exchange rates via F291)
  Posting: DATABASE FABRIC (Skill 05) → PostgreSQL provider (FX revaluation postings)
  Events:  QUEUE FABRIC (Skill 04) → Redis Streams (fx.revaluation.posted events)
CREATION: IExternalServiceFactory<IForeignExchangeService>.CreateAsync(ctx)
METHODS:
  RunRevaluationAsync(tenantId, legalEntityId, period, currencies)   → DataProcessResult<Dictionary>
  GetFXExposureAsync(tenantId, legalEntityId, currency, asOf)        → DataProcessResult<Dictionary>
  PostRevaluationAsync(tenantId, legalEntityId, revalDoc, periodRef) → DataProcessResult<Dictionary>
  ReverseRevaluationAsync(tenantId, legalEntityId, revalId)          → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6 + DR-29 + DR-30 + DR-31
```

### F314: IIntercompanyService
```
FAMILY: 35 — Cash & Treasury
PURPOSE: Manage intercompany transactions, netting, and reconciliation across legal entities
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL provider
CREATION: IExternalServiceFactory<IIntercompanyService>.CreateAsync(ctx)
METHODS:
  CreateICTransactionAsync(tenantId, fromEntityId, toEntityId, txnDoc)  → DataProcessResult<Dictionary>
  RunNetttingAsync(tenantId, entities, period)                          → DataProcessResult<Dictionary>
  GetICReconciliationStatusAsync(tenantId, entityId, period)            → DataProcessResult<Dictionary>
  PostICEliminationAsync(tenantId, period, actorCtx)                    → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6 + DR-29 + DR-30
```

### F315: ITreasuryWorkflowService
```
FAMILY: 35 — Cash & Treasury
PURPOSE: Orchestrate treasury approval workflows using EP-4 (payment approvals, FX hedge approvals)
FABRIC RESOLUTION:
  State:  DATABASE FABRIC (Skill 05) → Elasticsearch provider (EP-4 saga state)
  Events: QUEUE FABRIC (Skill 04) → Redis Streams
CREATION: IExternalServiceFactory<ITreasuryWorkflowService>.CreateAsync(ctx)
METHODS:
  StartPaymentApprovalAsync(tenantId, runId, workflowDef)            → DataProcessResult<Dictionary>
  GetApprovalStateAsync(tenantId, sagaId)                            → DataProcessResult<Dictionary>
  SubmitApprovalDecisionAsync(tenantId, sagaId, decision, actorCtx)  → DataProcessResult<Dictionary>
  HandleBankEventSignalAsync(tenantId, sagaId, bankEventDoc)          → DataProcessResult<Dictionary>
CRITICAL: HandleBankEventSignalAsync is the EP-4 external signal mechanism for bank callbacks.
          It MUST be idempotent. Duplicate bank callbacks MUST produce same result.
DNA-9 (SoD): treasury workflow enforces 4-role separation (DR-32)
DNA COMPLIANCE: DNA-1 through DNA-9
```

---

## FACTORY FAMILY 36 — Asset & Controlling
## Factories: F316–F321 | Fabric: DATABASE FABRIC + QUEUE FABRIC

### F316: IFixedAssetService
```
FAMILY: 36 — Asset & Controlling
PURPOSE: Manage fixed asset lifecycle: capitalize, depreciate, revalue, dispose
FABRIC RESOLUTION:
  Storage: DATABASE FABRIC (Skill 05) → PostgreSQL provider (asset master + depreciation schedule)
  Posting: DATABASE FABRIC (Skill 05) → Elasticsearch provider (GL journal audit)
  Events:  QUEUE FABRIC (Skill 04) → Redis Streams (asset.capitalized, asset.disposed events)
CREATION: IExternalServiceFactory<IFixedAssetService>.CreateAsync(ctx)
METHODS:
  CapitalizeAssetAsync(tenantId, legalEntityId, assetDoc, periodRef)   → DataProcessResult<Dictionary>
  RunDepreciationAsync(tenantId, legalEntityId, period)                → DataProcessResult<List<Dictionary>>
  GetDepreciationScheduleAsync(tenantId, legalEntityId, assetId)       → DataProcessResult<List<Dictionary>>
  RevalueAssetAsync(tenantId, legalEntityId, assetId, revalDoc)        → DataProcessResult<Dictionary>
  DisposeAssetAsync(tenantId, legalEntityId, assetId, disposalDoc, actorCtx) → DataProcessResult<Dictionary>
DR-31: All asset transactions (capitalization, disposal) post NEW GL entries — never mutate existing
DR-30: tenant_id + legal_entity_id + fiscal_period + ledger_id on all posting queries
DNA COMPLIANCE: DNA-1 through DNA-6 + DR-29 + DR-30 + DR-31
```

### F317: IDepreciationEngineService
```
FAMILY: 36 — Asset & Controlling
PURPOSE: Calculate depreciation for assets (straight-line, declining balance, units-of-production)
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL provider
CREATION: IExternalServiceFactory<IDepreciationEngineService>.CreateAsync(ctx)
METHODS:
  CalculateDepreciationAsync(tenantId, legalEntityId, assetId, period)  → DataProcessResult<Dictionary>
  GetDepreciationMethodAsync(tenantId, legalEntityId, assetId)          → DataProcessResult<Dictionary>
  ValidateDepreciationRunAsync(tenantId, legalEntityId, period)         → DataProcessResult<Dictionary>
  GetAccumulatedDepreciationAsync(tenantId, legalEntityId, assetId)     → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6
```

### F318: ICostAllocationService
```
FAMILY: 36 — Asset & Controlling
PURPOSE: Execute cost allocations across cost centers and profit centers for management accounting
FABRIC RESOLUTION:
  Rules:   DATABASE FABRIC (Skill 05) → Elasticsearch provider (allocation rule search)
  Posting: DATABASE FABRIC (Skill 05) → PostgreSQL provider (allocation journal entries)
  Events:  QUEUE FABRIC (Skill 04) → Redis Streams (allocation.posted events)
CREATION: IExternalServiceFactory<ICostAllocationService>.CreateAsync(ctx)
METHODS:
  RunAllocationCycleAsync(tenantId, legalEntityId, period)             → DataProcessResult<Dictionary>
  GetAllocationRulesAsync(tenantId, legalEntityId, costCenterId)       → DataProcessResult<List<Dictionary>>
  ValidateAllocationAsync(tenantId, legalEntityId, allocationDoc)      → DataProcessResult<Dictionary>
  PostAllocationAsync(tenantId, legalEntityId, allocationDoc, periodRef) → DataProcessResult<Dictionary>
DR-31: Allocation postings are new journal entries — never in-place updates
DNA COMPLIANCE: DNA-1 through DNA-6 + DR-29 + DR-30
```

### F319: IProfitCenterService
```
FAMILY: 36 — Asset & Controlling
PURPOSE: Profit center reporting, internal P&L, segment performance analysis
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Elasticsearch provider (aggregation analytics)
CREATION: IExternalServiceFactory<IProfitCenterService>.CreateAsync(ctx)
METHODS:
  GetProfitCenterPLAsync(tenantId, legalEntityId, profitCenterId, period) → DataProcessResult<Dictionary>
  GetSegmentReportAsync(tenantId, legalEntityId, segmentDimensions, period) → DataProcessResult<Dictionary>
  ValidateProfitCenterAsync(tenantId, legalEntityId, profitCenterId)     → DataProcessResult<bool>
  GetProfitCenterHierarchyAsync(tenantId, legalEntityId)                 → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6 + DR-30
```

### F320: IProjectControllingService
```
FAMILY: 36 — Asset & Controlling
PURPOSE: Project cost tracking, settlement, WIP management, project profitability
FABRIC RESOLUTION:
  Storage: DATABASE FABRIC (Skill 05) → PostgreSQL provider
  Events:  QUEUE FABRIC (Skill 04) → Redis Streams (project.milestone.settled events)
CREATION: IExternalServiceFactory<IProjectControllingService>.CreateAsync(ctx)
METHODS:
  GetProjectCostsAsync(tenantId, legalEntityId, projectId, period)     → DataProcessResult<Dictionary>
  SettleProjectCostsAsync(tenantId, legalEntityId, projectId, actorCtx) → DataProcessResult<Dictionary>
  GetWIPValueAsync(tenantId, legalEntityId, projectId, asOf)            → DataProcessResult<Dictionary>
  GetProjectProfitabilityAsync(tenantId, legalEntityId, projectId)      → DataProcessResult<Dictionary>
DNA-9 (SoD): project_cost_initiator ≠ settlement_approver
DNA COMPLIANCE: DNA-1 through DNA-9
```

### F321: IBudgetControlService
```
FAMILY: 36 — Asset & Controlling
PURPOSE: Budget management, budget vs actual reporting, commitment tracking, budget releases
FABRIC RESOLUTION:
  Storage: DATABASE FABRIC (Skill 05) → Elasticsearch provider (budget documents)
  Events:  QUEUE FABRIC (Skill 04) → Redis Streams (budget.exceeded events)
CREATION: IExternalServiceFactory<IBudgetControlService>.CreateAsync(ctx)
METHODS:
  GetBudgetAsync(tenantId, legalEntityId, costCenterId, period)         → DataProcessResult<Dictionary>
  ValidateBudgetAvailabilityAsync(tenantId, legalEntityId, costCenterId, amount) → DataProcessResult<Dictionary>
  GetBudgetVsActualAsync(tenantId, legalEntityId, costCenterId, period) → DataProcessResult<Dictionary>
  ReleaseBudgetAsync(tenantId, legalEntityId, budgetDoc, actorCtx)      → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6
```

---

## FACTORY FAMILY 37 — Compliance, Audit & Multi-Tenant Finance
## Factories: F322–F329 | Fabric: DATABASE FABRIC + AI ENGINE FABRIC + QUEUE FABRIC

### F322: IFinanceAuditTrailService
```
FAMILY: 37 — Compliance, Audit & Multi-Tenant Finance
PURPOSE: Write and query immutable finance audit trail records (DR-29 enforcement)
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Elasticsearch provider (append-only audit index)
CREATION: IExternalServiceFactory<IFinanceAuditTrailService>.CreateAsync(ctx)
METHODS:
  WriteAuditRecordAsync(tenantId, legalEntityId, auditDoc)            → DataProcessResult<Dictionary>
  QueryAuditTrailAsync(tenantId, legalEntityId, filter)               → DataProcessResult<List<Dictionary>>
  GetDocumentHistoryAsync(tenantId, legalEntityId, documentId)        → DataProcessResult<List<Dictionary>>
  ValidateAuditIntegrityAsync(tenantId, legalEntityId, documentId)    → DataProcessResult<Dictionary>
CRITICAL: WriteAuditRecordAsync is APPEND-ONLY. No update or delete operations.
          Elasticsearch index mapping enforces immutability via write-once policy.
DNA COMPLIANCE: DNA-1 through DNA-6
```

### F323: ISoDValidationService
```
FAMILY: 37 — Compliance, Audit & Multi-Tenant Finance
PURPOSE: Enforce Segregation of Duties — detect role conflicts, validate actor separation
FABRIC RESOLUTION:
  Roles:  DATABASE FABRIC (Skill 05) → Elasticsearch provider (role assignment index)
  Events: QUEUE FABRIC (Skill 04) → Redis Streams (sod.violation.detected events)
CREATION: IExternalServiceFactory<ISoDValidationService>.CreateAsync(ctx)
METHODS:
  ValidateSoDAsync(tenantId, documentId, actorRoles)                  → DataProcessResult<Dictionary>
  DetectConflictsAsync(tenantId, actorId, requestedRole, documentId)  → DataProcessResult<Dictionary>
  RegisterRoleAssignmentAsync(tenantId, actorId, role, documentId)    → DataProcessResult<bool>
  GetSoDViolationsAsync(tenantId, filter)                             → DataProcessResult<List<Dictionary>>
CRITICAL: This factory is called by AF-7 (Compliance station) on EVERY financial task type.
DNA-9: This factory IS the DNA-9 enforcement mechanism at runtime.
DNA COMPLIANCE: DNA-1 through DNA-9
```

### F324: IPeriodCloseOrchestrationService
```
FAMILY: 37 — Compliance, Audit & Multi-Tenant Finance
PURPOSE: Orchestrate period close checklist, gate completion, and period lock via EP-5
FABRIC RESOLUTION:
  State:   DATABASE FABRIC (Skill 05) → Elasticsearch provider (EP-4 saga + EP-5 lock state)
  Events:  QUEUE FABRIC (Skill 04) → Redis Streams (period.close.started, period.locked events)
  AI:      AI ENGINE FABRIC (Skill 07) → AiDispatcher (for anomaly detection in close data)
CREATION: IExternalServiceFactory<IPeriodCloseOrchestrationService>.CreateAsync(ctx)
METHODS:
  StartCloseRunAsync(tenantId, legalEntityId, ledgerId, period, actorCtx) → DataProcessResult<Dictionary>
  GetCloseChecklistAsync(tenantId, legalEntityId, ledgerId, period)       → DataProcessResult<List<Dictionary>>
  CompleteCloseStepAsync(tenantId, closeRunId, stepId, actorCtx)          → DataProcessResult<Dictionary>
  LockPeriodAsync(tenantId, legalEntityId, ledgerId, period, actorCtx)    → DataProcessResult<Dictionary>
  ReopenPeriodAsync(tenantId, legalEntityId, ledgerId, period, actorCtx)  → DataProcessResult<Dictionary>
CRITICAL: LockPeriodAsync writes to EP-5 (Period Lock Registry) — this is the authoritative lock.
          All F290.IsPeriodOpenAsync checks route through EP-5.
          ReopenPeriodAsync requires privileged actor + writes audit record to F322.
DNA-9 (SoD): close_initiator ≠ period_lock_approver
DNA COMPLIANCE: DNA-1 through DNA-9
```

### F325: IFinancialStatementService
```
FAMILY: 37 — Compliance, Audit & Multi-Tenant Finance
PURPOSE: Generate financial statements: trial balance, balance sheet, P&L, cash flow statement
FABRIC RESOLUTION:
  GL:     DATABASE FABRIC (Skill 05) → Elasticsearch provider (journal aggregations)
  Report: DATABASE FABRIC (Skill 05) → PostgreSQL provider (statement snapshots)
  AI:     AI ENGINE FABRIC (Skill 07) → IAiProvider (narrative commentary generation)
CREATION: IExternalServiceFactory<IFinancialStatementService>.CreateAsync(ctx)
METHODS:
  GetTrialBalanceAsync(tenantId, legalEntityId, period, filter)      → DataProcessResult<Dictionary>
  GetBalanceSheetAsync(tenantId, legalEntityId, period)              → DataProcessResult<Dictionary>
  GetIncomeStatementAsync(tenantId, legalEntityId, period)           → DataProcessResult<Dictionary>
  GetCashFlowStatementAsync(tenantId, legalEntityId, period)         → DataProcessResult<Dictionary>
  GenerateStatementCommentaryAsync(tenantId, legalEntityId, period)  → DataProcessResult<Dictionary>
CRITICAL: GenerateStatementCommentaryAsync uses AI ENGINE FABRIC (Skill 07) for narrative.
          Financial data NEVER sent to AI without tenant consent flag (FREEDOM config).
DNA COMPLIANCE: DNA-1 through DNA-6 + DR-30
```

### F326: IVATReportingService
```
FAMILY: 37 — Compliance, Audit & Multi-Tenant Finance
PURPOSE: Generate VAT returns, withholding tax reports, periodic tax filings
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Elasticsearch provider (transaction aggregation)
CREATION: IExternalServiceFactory<IVATReportingService>.CreateAsync(ctx)
METHODS:
  GetVATReturnDataAsync(tenantId, legalEntityId, taxPeriod, taxCode)  → DataProcessResult<Dictionary>
  ValidateVATReturnAsync(tenantId, legalEntityId, returnDoc)          → DataProcessResult<Dictionary>
  GenerateWithholdingReportAsync(tenantId, legalEntityId, period)     → DataProcessResult<Dictionary>
  GetTaxReconciliationAsync(tenantId, legalEntityId, period)          → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6 + DR-30
```

### F327: IConsolidationService
```
FAMILY: 37 — Compliance, Audit & Multi-Tenant Finance
PURPOSE: Multi-entity consolidation: elimination entries, minority interest, FX translation
FABRIC RESOLUTION:
  GL:     DATABASE FABRIC (Skill 05) → Elasticsearch provider (multi-entity GL aggregation)
  Post:   DATABASE FABRIC (Skill 05) → PostgreSQL provider (consolidation entries)
  Events: QUEUE FABRIC (Skill 04) → Redis Streams (consolidation.posted events)
CREATION: IExternalServiceFactory<IConsolidationService>.CreateAsync(ctx)
METHODS:
  RunConsolidationAsync(tenantId, consolidationGroupId, period)       → DataProcessResult<Dictionary>
  PostEliminationEntryAsync(tenantId, consolidationId, elimDoc)       → DataProcessResult<Dictionary>
  GetConsolidatedBalanceSheetAsync(tenantId, consolidationGroupId, period) → DataProcessResult<Dictionary>
  ValidateIntercompanyEliminationAsync(tenantId, consolidationId)     → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6 + DR-29 + DR-30 + DR-31
```

### F328: ITenantFinanceProvisionService
```
FAMILY: 37 — Compliance, Audit & Multi-Tenant Finance
PURPOSE: Provision new finance tenant: isolation tier, chart of accounts template, fiscal calendar, quotas
FABRIC RESOLUTION:
  Isolation: MULTI-TENANT ISOLATION FABRIC (Skill 11) → ITenantIsolationService
  Storage:   DATABASE FABRIC (Skill 05) → Elasticsearch provider (tenant config index)
  Events:    QUEUE FABRIC (Skill 04) → Redis Streams (tenant.finance.provisioned events)
CREATION: IExternalServiceFactory<ITenantFinanceProvisionService>.CreateAsync(ctx)
METHODS:
  ProvisionTenantAsync(tenantId, provisionDoc)                        → DataProcessResult<Dictionary>
  GetTenantFinanceConfigAsync(tenantId)                               → DataProcessResult<Dictionary>
  SetIsolationTierAsync(tenantId, tier)                               → DataProcessResult<Dictionary>
  DecommissionTenantAsync(tenantId, actorCtx)                         → DataProcessResult<Dictionary>
CRITICAL: ProvisionTenantAsync registers isolation tier in Skill 11 (MT Isolation Fabric).
          Tier selection: POOLED | BRIDGE | SILO — config-driven per DR-35.
DNA COMPLIANCE: DNA-1 through DNA-6 + DR-35
```

### F329: IFinanceQuotaService
```
FAMILY: 37 — Compliance, Audit & Multi-Tenant Finance
PURPOSE: Tenant quota enforcement: transaction volume limits, storage limits, noisy-neighbor control
FABRIC RESOLUTION:
  Storage: DATABASE FABRIC (Skill 05) → Redis provider (quota counters — high-frequency reads)
  Events:  QUEUE FABRIC (Skill 04) → Redis Streams (quota.threshold.exceeded events)
CREATION: IExternalServiceFactory<IFinanceQuotaService>.CreateAsync(ctx)
METHODS:
  CheckQuotaAsync(tenantId, operationType, count)                     → DataProcessResult<bool>
  IncrementQuotaAsync(tenantId, operationType, count)                 → DataProcessResult<Dictionary>
  GetQuotaStatusAsync(tenantId)                                       → DataProcessResult<Dictionary>
  SetQuotaLimitAsync(tenantId, limitDoc)                              → DataProcessResult<Dictionary>
CRITICAL: CheckQuotaAsync uses Redis provider for sub-millisecond counter reads.
          When threshold exceeded, publishes event to QUEUE FABRIC (do not block inline).
DNA COMPLIANCE: DNA-1 through DNA-6
```

---

## FLOW-13 FACTORY SUMMARY

| Family | Name | Factories | Count |
|--------|------|-----------|-------|
| 32 | Finance Master Data & Organization | F288–F294 | 7 |
| 33 | Accounts Payable | F295–F301 | 7 |
| 34 | Accounts Receivable | F302–F308 | 7 |
| 35 | Cash & Treasury | F309–F315 | 7 |
| 36 | Asset & Controlling | F316–F321 | 6 |
| 37 | Compliance, Audit & MT Finance | F322–F329 | 8 |
| **TOTAL** | | **F288–F329** | **42** |

## POST-FLOW-13 ENGINE ARCHITECTURE TOTALS

```
Factory Interfaces:  F1–F329    (329 total, +42)
Factory Families:    1–37       (37 total, +6)
Engine Primitives:   EP-1–EP-5  (unchanged — already present)
DNA Patterns:        DNA-1–DNA-9 (unchanged — already present)
Fabrics:             Skill 01–11 (unchanged — already present)
Design Records:      DR-1–DR-36  (+8: DR-29 through DR-36)
```

---
## SAVE POINT: P1-FACTORIES ✅
## NEXT: 13-finance_TASK_TYPES_CATALOG_F13.md (T103–T112)
