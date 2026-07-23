# 13-finance_UNIFIED_SOURCE_INDEX_F11
## XIIGen Engine — FLOW-13 Source Index: AF Maps, Flow Templates 20–24, DD-38–DD-47
## Save Point: P5-INDEX | Status: COMPLETE ✅

---

## AF STATION MAPPING — FLOW-13 (T103–T112)
## 11 stations × 10 task types = 110 cells

| Task | AF-1 Genesis | AF-2 Plan | AF-3 Prompts | AF-4 RAG | AF-5 Multi | AF-6 Review | AF-7 Compliance | AF-8 Security | AF-9 Judge | AF-10 Merge | AF-11 Feedback |
|------|-------------|-----------|-------------|---------|-----------|------------|---------------|-------------|-----------|------------|--------------|
| T103 | FinanceSagaEntryService | period→quota→SoD→create | fin-saga-entry | SK-44, SK-47 | Claude+GPT | saga-state init | DNA-1–9; SoD reg | tenant isolation | IR-103-1–8 QG-103-1–6 | merge outputs | saga creation score |
| T104 | ThreeWayMatchService | fetch-PO→GR→Inv→compare→route | p2p-match | SK-46 | Claude+GPT | tolerance-from-config | DNA-1–9; DR-34 | SoD: submit≠approve | IR-104-1–8 QG-104-1–6 | merge outputs | match quality score |
| T105 | FinanceApprovalGateService | emit→wait-EP4→SoD→audit→resume | finance-approval | SK-45, SK-51 | single model | EP-4 no blocking thread | DNA-9: approve≠initiate | no self-approval | IR-105-1–8 QG-105-1–6 | N/A | approval latency |
| T106 | PeriodCloseOrchestratorService | 8-step close sequence | fin-period-close | SK-47, SK-44, SK-52 | Claude+Gemini | all 8 steps DataProcessResult | DNA-9: close≠lock | privileged actor for lock | IR-106-1–8 QG-106-1–6 | merge close steps | close duration |
| T107 | SubledgerGLSyncService | subledger→GL→delta→gate | fin-subledger-sync | SK-52 | single model | gap threshold from config | DNA-1–9; DR-30 | N/A | IR-107-1–8 QG-107-1–6 | N/A | sync gap metrics |
| T108 | PaymentRunOrchestratorService | propose→approve-dual→execute→EP4-wait→recon | fin-payment-run | SK-49, SK-50 | Claude+GPT | bank fabric only | DNA-9: 4-role separation | bank fabric no direct SDK | IR-108-1–8 QG-108-1–6 | merge outputs | payment run SLA |
| T109 | DoubleEntryValidationService | period→accounts→debit=credit→audit | double-entry-guard | SK-48 | single model | DR-31: new entry only | DNA-1–9; zero tolerance | N/A | IR-109-1–8 QG-109-1–6 | N/A | validation accuracy |
| T110 | RevenueRecognitionGateService | delivery→IFRS15→defer-or-recognize→audit | rev-rec-gate | SK-47, SK-53 | Claude | delivery check sync | DNA-1–9; DR-36 | delivery confirmed before revenue | IR-110-1–8 QG-110-1–6 | N/A | recognition accuracy |
| T111 | ProjectMilestoneBillingService | milestone→billing-doc→rev-rec→invoice→post | milestone-billing | SK-53 | Claude+GPT | new invoice per milestone | DNA-9: PM≠finance | period open before billing | IR-111-1–8 QG-111-1–6 | merge outputs | milestone billing SLA |
| T112 | TenantFinanceProvisionService | tier→CoA→calendar→quota→SoD-policy | fin-tenant-provision | SK-47 | single model | idempotent re-provision | DR-35: 3 tiers config | cross-tenant isolation | IR-112-1–8 QG-112-1–6 | N/A | provision success rate |

---

## FLOW TEMPLATES 20–24

### Template 20: fin-procure-to-pay-v1 (FIN-01)

```json
{
  "flow_id": "fin-procure-to-pay-v1",
  "flow_name": "Procure-to-Pay (P2P)",
  "version": "1.0",
  "description": "Requisition → PO → Goods Receipt → Vendor Invoice → Three-Way Match → Approval → GL Post → Payment → Bank Reconciliation",
  "entry_task": "T103",
  "steps": [
    {
      "step_id": "p2p-saga-entry",
      "task_type": "T103",
      "factory": "F290:IFiscalCalendarService + F329:IFinanceQuotaService + F328:ITenantFinanceProvisionService + F323:ISoDValidationService",
      "resolution": "CreateAsync(FactoryResolutionContext)",
      "fabric": "DATABASE_FABRIC/PostgreSQL+Redis + MT_ISOLATION_FABRIC",
      "on_success": "p2p-three-way-match",
      "on_failure": "p2p-saga-failed",
      "idempotency_key": "{{tenant_id}}.p2p.{{invoice_id}}.v1",
      "timeout_ms": 5000
    },
    {
      "step_id": "p2p-three-way-match",
      "task_type": "T104",
      "factory": "F295:IVendorInvoiceService + F296:IPurchaseOrderService + F297:IGoodsReceiptService + F298:IMatchExceptionService",
      "resolution": "CreateAsync(FactoryResolutionContext)",
      "fabric": "DATABASE_FABRIC/PostgreSQL+Elasticsearch + QUEUE_FABRIC/Redis-Streams",
      "on_success": "p2p-invoice-approval",
      "on_failure": "p2p-match-exception",
      "timeout_ms": 30000,
      "idempotency_key": "{{tenant_id}}.p2p.{{invoice_id}}.match"
    },
    {
      "step_id": "p2p-match-exception",
      "task_type": "T104",
      "note": "Routes to DLQ via F298 — human resolves, re-enters at p2p-three-way-match",
      "factory": "F298:IMatchExceptionService",
      "fabric": "QUEUE_FABRIC/Redis-Streams-DLQ",
      "on_resolve": "p2p-three-way-match"
    },
    {
      "step_id": "p2p-invoice-approval",
      "task_type": "T105",
      "factory": "F301:IAPWorkflowService + F323:ISoDValidationService + F322:IFinanceAuditTrailService",
      "resolution": "CreateAsync(FactoryResolutionContext)",
      "fabric": "DATABASE_FABRIC/Elasticsearch(EP-4) + QUEUE_FABRIC/Redis-Streams",
      "on_success": "p2p-double-entry-validation",
      "on_reject": "p2p-invoice-rejected",
      "on_timeout": "p2p-approval-escalate",
      "wait_state": "WAITING_APPROVAL",
      "timeout_hours": "{{freedom.approval.p2p.timeout_hours}}"
    },
    {
      "step_id": "p2p-double-entry-validation",
      "task_type": "T109",
      "factory": "F288:IChartOfAccountsService + F290:IFiscalCalendarService + F322:IFinanceAuditTrailService",
      "resolution": "CreateAsync(FactoryResolutionContext)",
      "fabric": "DATABASE_FABRIC/Elasticsearch+PostgreSQL",
      "on_success": "p2p-payment-run",
      "on_failure": "p2p-posting-failed"
    },
    {
      "step_id": "p2p-payment-run",
      "task_type": "T108",
      "factory": "F299:IAPPaymentService + F310:IPaymentRunService + F315:ITreasuryWorkflowService",
      "resolution": "CreateAsync(FactoryResolutionContext)",
      "fabric": "DATABASE_FABRIC/PostgreSQL + BANK_CONNECTIVITY_FABRIC/configured-provider + QUEUE_FABRIC/Redis-Streams",
      "on_success": "p2p-bank-reconciliation",
      "on_failure": "p2p-payment-failed",
      "wait_state": "WAITING_BANK_EVENT"
    },
    {
      "step_id": "p2p-bank-reconciliation",
      "task_type": "T107",
      "factory": "F300:IAPReconciliationService + F312:IBankReconciliationService",
      "resolution": "CreateAsync(FactoryResolutionContext)",
      "fabric": "DATABASE_FABRIC/PostgreSQL+Elasticsearch + BANK_CONNECTIVITY_FABRIC",
      "on_success": "p2p-complete",
      "on_failure": "p2p-recon-exception"
    }
  ],
  "bfa_entities": ["vendor_invoice", "purchase_order", "goods_receipt", "ap_payment", "bank_statement"],
  "bfa_events": ["invoice.submitted", "match.exception", "approval.requested", "payment.executed", "payment.settled"],
  "conflict_rules": ["CF-96", "CF-97", "CF-98", "CF-100", "CF-102", "CF-111"]
}
```

---

### Template 21: fin-order-to-cash-v1 (FIN-02)

```json
{
  "flow_id": "fin-order-to-cash-v1",
  "flow_name": "Order-to-Cash (O2C)",
  "version": "1.0",
  "description": "Quote/Order → Delivery Confirmation → Revenue Recognition → Customer Invoice → Cash Application → AR Reconciliation",
  "entry_task": "T103",
  "steps": [
    {
      "step_id": "o2c-saga-entry",
      "task_type": "T103",
      "factory": "F290+F329+F328+F323",
      "fabric": "DATABASE_FABRIC + MT_ISOLATION_FABRIC",
      "on_success": "o2c-credit-limit-check"
    },
    {
      "step_id": "o2c-credit-limit-check",
      "task_type": "T103",
      "note": "Uses F303:ICustomerMasterService — credit limit validation sub-step",
      "factory": "F303:ICustomerMasterService",
      "fabric": "DATABASE_FABRIC/PostgreSQL",
      "on_success": "o2c-revenue-recognition",
      "on_failure": "o2c-credit-blocked"
    },
    {
      "step_id": "o2c-revenue-recognition",
      "task_type": "T110",
      "factory": "F304:IRevenueRecognitionService + F302:ICustomerInvoiceService + F290:IFiscalCalendarService + F322:IFinanceAuditTrailService",
      "resolution": "CreateAsync(FactoryResolutionContext)",
      "fabric": "DATABASE_FABRIC/PostgreSQL + QUEUE_FABRIC/Redis-Streams",
      "on_success": "o2c-invoice-approval",
      "on_deferred": "o2c-revenue-deferred"
    },
    {
      "step_id": "o2c-invoice-approval",
      "task_type": "T105",
      "factory": "F302:ICustomerInvoiceService + F323:ISoDValidationService + F322:IFinanceAuditTrailService",
      "fabric": "DATABASE_FABRIC/Elasticsearch(EP-4) + QUEUE_FABRIC",
      "wait_state": "WAITING_APPROVAL",
      "on_success": "o2c-double-entry-validation"
    },
    {
      "step_id": "o2c-double-entry-validation",
      "task_type": "T109",
      "factory": "F288+F290+F322",
      "fabric": "DATABASE_FABRIC/Elasticsearch+PostgreSQL",
      "on_success": "o2c-cash-application"
    },
    {
      "step_id": "o2c-cash-application",
      "task_type": "T103",
      "note": "Uses F305:ICashApplicationService — apply customer payment",
      "factory": "F305:ICashApplicationService",
      "fabric": "DATABASE_FABRIC/Elasticsearch + BANK_CONNECTIVITY_FABRIC",
      "on_success": "o2c-ar-reconciliation"
    },
    {
      "step_id": "o2c-ar-reconciliation",
      "task_type": "T107",
      "factory": "F307:IARReconciliationService + F325:IFinancialStatementService",
      "fabric": "DATABASE_FABRIC/PostgreSQL+Elasticsearch",
      "on_success": "o2c-complete"
    }
  ],
  "bfa_entities": ["customer_invoice", "revenue_recognition", "cash_application", "ar_subledger"],
  "bfa_events": ["invoice.sent", "revenue.recognized", "payment.received", "cash.applied"],
  "conflict_rules": ["CF-96", "CF-101", "CF-105", "CF-106", "CF-111", "CF-113"]
}
```

---

### Template 22: fin-record-to-report-v1 (FIN-03)

```json
{
  "flow_id": "fin-record-to-report-v1",
  "flow_name": "Record-to-Report (R2R)",
  "version": "1.0",
  "description": "Period-end: Subledger Sync → Depreciation → Revaluation → Allocations → Reconciliation → Period Lock → Financial Statements",
  "entry_task": "T106",
  "steps": [
    {
      "step_id": "r2r-subledger-sync",
      "task_type": "T107",
      "factory": "F300:IAPReconciliationService + F307:IARReconciliationService + F325:IFinancialStatementService",
      "fabric": "DATABASE_FABRIC/PostgreSQL+Elasticsearch + BANK_CONNECTIVITY_FABRIC",
      "on_success": "r2r-depreciation",
      "on_failure": "r2r-sync-gap-exception"
    },
    {
      "step_id": "r2r-depreciation",
      "task_type": "T106",
      "note": "Close step: depreciation sub-step",
      "factory": "F316:IFixedAssetService + F317:IDepreciationEngineService",
      "fabric": "DATABASE_FABRIC/PostgreSQL+Elasticsearch",
      "on_success": "r2r-revaluation"
    },
    {
      "step_id": "r2r-revaluation",
      "task_type": "T106",
      "note": "Close step: FX revaluation",
      "factory": "F313:IForeignExchangeService",
      "fabric": "DATABASE_FABRIC/Elasticsearch+PostgreSQL",
      "on_success": "r2r-cost-allocation"
    },
    {
      "step_id": "r2r-cost-allocation",
      "task_type": "T106",
      "note": "Close step: cost allocation cycle",
      "factory": "F318:ICostAllocationService",
      "fabric": "DATABASE_FABRIC/Elasticsearch+PostgreSQL",
      "on_success": "r2r-double-entry-validation"
    },
    {
      "step_id": "r2r-double-entry-validation",
      "task_type": "T109",
      "factory": "F288+F290+F322",
      "fabric": "DATABASE_FABRIC/Elasticsearch+PostgreSQL",
      "on_success": "r2r-period-lock-approval"
    },
    {
      "step_id": "r2r-period-lock-approval",
      "task_type": "T105",
      "note": "Privileged approval required to lock period (DR-32: lock approver ≠ close initiator)",
      "factory": "F324:IPeriodCloseOrchestrationService + F323:ISoDValidationService + F322",
      "fabric": "DATABASE_FABRIC/Elasticsearch(EP-4) + QUEUE_FABRIC",
      "wait_state": "WAITING_APPROVAL",
      "on_success": "r2r-period-lock"
    },
    {
      "step_id": "r2r-period-lock",
      "task_type": "T106",
      "note": "Final step: lock period in EP-5",
      "factory": "F324:IPeriodCloseOrchestrationService",
      "fabric": "DATABASE_FABRIC/Elasticsearch(EP-5)",
      "on_success": "r2r-financial-statements"
    },
    {
      "step_id": "r2r-financial-statements",
      "task_type": "T106",
      "note": "Post-lock: generate financial statements",
      "factory": "F325:IFinancialStatementService",
      "fabric": "DATABASE_FABRIC/Elasticsearch + AI_ENGINE_FABRIC(commentary)",
      "on_success": "r2r-complete"
    }
  ],
  "bfa_entities": ["fiscal_period_state", "gl_journal", "depreciation_posting", "revaluation_posting", "allocation_posting"],
  "bfa_events": ["period.close.started", "subledger.synced", "depreciation.posted", "period.locked"],
  "conflict_rules": ["CF-96", "CF-99", "CF-100", "CF-101", "CF-103", "CF-106"]
}
```

---

### Template 23: fin-project-to-profit-v1 (FIN-04)

```json
{
  "flow_id": "fin-project-to-profit-v1",
  "flow_name": "Project-to-Profit",
  "version": "1.0",
  "description": "Project Plan → Cost Tracking → Milestone Confirmation → Billing → Revenue Recognition → Cost Settlement → Profitability Report",
  "entry_task": "T103",
  "steps": [
    {
      "step_id": "p2p-saga-entry",
      "task_type": "T103",
      "factory": "F290+F329+F328+F323",
      "fabric": "DATABASE_FABRIC + MT_ISOLATION_FABRIC",
      "on_success": "p2p-milestone-billing"
    },
    {
      "step_id": "p2p-milestone-billing",
      "task_type": "T111",
      "factory": "F308:IBillingService + F320:IProjectControllingService + F304:IRevenueRecognitionService + F302:ICustomerInvoiceService",
      "resolution": "CreateAsync(FactoryResolutionContext)",
      "fabric": "DATABASE_FABRIC/PostgreSQL + QUEUE_FABRIC",
      "on_success": "p2p-revenue-recognition",
      "on_failure": "p2p-milestone-not-confirmed"
    },
    {
      "step_id": "p2p-revenue-recognition",
      "task_type": "T110",
      "factory": "F304+F302+F290+F322",
      "fabric": "DATABASE_FABRIC/PostgreSQL + QUEUE_FABRIC",
      "on_success": "p2p-billing-approval"
    },
    {
      "step_id": "p2p-billing-approval",
      "task_type": "T105",
      "factory": "F302+F323+F322",
      "fabric": "DATABASE_FABRIC/Elasticsearch(EP-4) + QUEUE_FABRIC",
      "wait_state": "WAITING_APPROVAL",
      "on_success": "p2p-double-entry-validation"
    },
    {
      "step_id": "p2p-double-entry-validation",
      "task_type": "T109",
      "factory": "F288+F290+F322",
      "fabric": "DATABASE_FABRIC",
      "on_success": "p2p-cost-settlement"
    },
    {
      "step_id": "p2p-cost-settlement",
      "task_type": "T111",
      "note": "Cost settlement sub-step",
      "factory": "F320:IProjectControllingService",
      "fabric": "DATABASE_FABRIC/PostgreSQL + QUEUE_FABRIC",
      "on_success": "p2p-profitability"
    },
    {
      "step_id": "p2p-profitability",
      "task_type": "T106",
      "note": "Profitability reporting sub-step",
      "factory": "F319:IProfitCenterService + F320:IProjectControllingService",
      "fabric": "DATABASE_FABRIC/Elasticsearch",
      "on_success": "p2p-complete"
    }
  ],
  "bfa_entities": ["project_milestone", "billing_document", "revenue_recognition", "cost_settlement"],
  "bfa_events": ["milestone.completed", "billing.created", "revenue.recognized", "project.settled"],
  "conflict_rules": ["CF-96", "CF-105", "CF-106", "CF-107", "CF-111"]
}
```

---

### Template 24: fin-treasury-cash-v1 (FIN-05)

```json
{
  "flow_id": "fin-treasury-cash-v1",
  "flow_name": "Treasury & Cash Management",
  "version": "1.0",
  "description": "Cash Forecast → Payment Proposal → Dual Approval → Bank Execution → EP-4 Wait → Settlement Callback → Reconciliation",
  "entry_task": "T103",
  "steps": [
    {
      "step_id": "treas-saga-entry",
      "task_type": "T103",
      "factory": "F290+F329+F328+F323",
      "fabric": "DATABASE_FABRIC + MT_ISOLATION_FABRIC",
      "on_success": "treas-cash-forecast"
    },
    {
      "step_id": "treas-cash-forecast",
      "task_type": "T103",
      "note": "Cash position check sub-step",
      "factory": "F311:ICashForecastService",
      "fabric": "DATABASE_FABRIC/Elasticsearch",
      "on_success": "treas-payment-run"
    },
    {
      "step_id": "treas-payment-run",
      "task_type": "T108",
      "factory": "F299:IAPPaymentService + F310:IPaymentRunService + F315:ITreasuryWorkflowService + F312:IBankReconciliationService",
      "resolution": "CreateAsync(FactoryResolutionContext)",
      "fabric": "DATABASE_FABRIC/Elasticsearch(EP-4)+PostgreSQL + BANK_CONNECTIVITY_FABRIC/configured + QUEUE_FABRIC",
      "on_success": "treas-bank-reconciliation",
      "on_failure": "treas-payment-failed",
      "wait_state": "WAITING_BANK_EVENT",
      "idempotency_key": "{{tenant_id}}.payment_run.{{run_id}}.v1"
    },
    {
      "step_id": "treas-bank-reconciliation",
      "task_type": "T107",
      "factory": "F312:IBankReconciliationService + F309:IBankStatementService",
      "fabric": "DATABASE_FABRIC/PostgreSQL+Elasticsearch + BANK_CONNECTIVITY_FABRIC",
      "on_success": "treas-gl-validation"
    },
    {
      "step_id": "treas-gl-validation",
      "task_type": "T109",
      "factory": "F288+F290+F322",
      "fabric": "DATABASE_FABRIC",
      "on_success": "treas-complete"
    }
  ],
  "bfa_entities": ["payment_run", "bank_statement", "bank_reconciliation", "treasury_payment"],
  "bfa_events": ["payment.run.created", "payment.executed", "payment.settled", "bank.statement.received"],
  "conflict_rules": ["CF-96", "CF-100", "CF-102", "CF-111", "CF-112"]
}
```

---

## DESIGN DECISIONS DD-38–DD-47

### DD-38: EP-4 Durable Saga as Finance Backbone
**Decision:** ALL finance flows (FIN-01 through FIN-05) MUST use EP-4 (Durable Saga) as
the execution backbone. No finance flow uses synchronous HTTP orchestration.
**Rationale:** Finance flows can pause for days (payment approval, period close sign-off, bank settlement).
HTTP-based orchestration cannot survive process restarts. EP-4 provides durable, replay-safe execution.
**Alternatives considered:** Temporal.io (external dependency — rejected: fabric-first requires
swappable runtime), Choreography only (rejected: no reliable wait state for human approvals).

### DD-39: FREEDOM Config for All Finance Business Rules
**Decision:** ALL thresholds (match tolerance, reconciliation gap, approval timeout, quota limits)
MUST be stored in Elasticsearch FREEDOM index, not in code or fixed config files.
**Rationale:** Finance business rules change frequently (different tenants, different risk policies,
regulatory updates). Code changes require deployments; FREEDOM changes are instant.
**Enforcement:** AF-9 rejects generated services with hardcoded threshold numbers.

### DD-40: AI Commentary as Optional Finance Enhancement
**Decision:** AI-generated financial statement narrative (F325.GenerateStatementCommentaryAsync)
is OPTIONAL and consent-gated. Financial data goes to AI ENGINE FABRIC only if tenant
has explicitly enabled ai_commentary_enabled=true in FREEDOM config.
**Rationale:** Financial data is sensitive. Not all tenants consent to AI processing.
Fabric-first means the provider can be swapped; consent controls WHEN the fabric is invoked.
**Privacy impact:** Financial statement figures never included in AI prompt without consent flag.

### DD-41: Bank Connectivity Fabric Abstraction Level
**Decision:** BANK CONNECTIVITY FABRIC (Skill 10) abstracts at the PROTOCOL level, not the BANK level.
Providers: ISO 20022, SWIFT, OpenBanking, Plaid, Mock.
A single tenant CAN have multiple bank accounts using different protocols simultaneously.
**Rationale:** Enterprise finance tenants use multiple banks. Each bank may use a different protocol.
Provider selection is per-bank-account, not per-tenant.
**Implementation:** FactoryResolutionContext includes bank_account_id → resolves to correct provider.

### DD-42: Double-Entry Enforcement at Task-Type Level
**Decision:** T109 (Double-Entry Validation Gate) is a MANDATORY intermediate step in ALL
finance flow templates that include GL posting. It is NOT an optional validation.
**Rationale:** Unbalanced GL postings are a catastrophic accounting error. Pre-flight
validation prevents data corruption that would require manual correction.
**Template rule:** AF-9 validates every finance template includes T109 before any PostToGLAsync step.

### DD-43: Period Lock Scope Definition
**Decision:** EP-5 Period Lock Registry scope key = tenant_id + legal_entity_id + ledger_id + fiscal_period.
A lock on one scope MUST NOT affect any other scope.
**Rationale:** Multi-entity tenants (parent company + subsidiaries) close periods on different schedules.
Shared-scope locking would serialize all entity closes unnecessarily.
**Implementation:** EP-5 uses composite key hash(tenant_id + entity_id + ledger_id + period) as lock key.

### DD-44: SoD Enforcement at Code Generation Time + Runtime
**Decision:** SoD is enforced at TWO layers:
  1. CODE GENERATION TIME: AF-7 (Compliance) rejects generated services without SoD checks
  2. RUNTIME: F323.ISoDValidationService called at every role assignment
**Rationale:** Code-generation-time enforcement prevents developer bypass; runtime enforcement
prevents configuration bypass. Both layers required for finance-grade internal controls.
**Exception:** Read-only operations (GET, search, report) are exempt from SoD (no data mutation).

### DD-45: Compensation-Only Corrections for Posted Documents
**Decision:** Once a financial document is POSTED (status = POSTED), it is IMMUTABLE.
ALL corrections MUST be new documents (credit memo, reversal journal entry, void payment).
Direct update or delete of posted documents is a BUILD FAILURE condition.
**Rationale:** Double-entry accounting integrity requires a complete audit trail of all
transactions, including corrections. Mutation destroys the audit chain.
**Enforcement:** T109 IRON RULE IR-109-4. AF-7 validates no update/delete on posted docs.

### DD-46: Multi-Tenant Finance Isolation Tier Migration Path
**Decision:** Tenants CAN migrate between isolation tiers (POOLED → BRIDGE → SILO) via a
finance DBA-only operation. Migration requires:
  1. Period must be CLOSED_LOCKED (no active sagas)
  2. Full data export + re-import under new tier
  3. New tenant_id registration with MT Isolation Fabric (Skill 11)
  4. Old tenant_id decommissioned after validation
**Rationale:** Enterprise tenants sometimes outgrow shared isolation as compliance requirements
increase. Migration path prevents vendor lock-in to initial tier choice.
**Implementation:** T112 (Tenant Provision Gate) handles new registration; F328.DecommissionTenantAsync handles old.

### DD-47: Financial Statement AI Commentary Data Boundary
**Decision:** AI ENGINE FABRIC (Skill 07) receives ONLY computed aggregates (variance %, YoY change %)
for commentary generation — NEVER individual transaction records, vendor names, customer names.
**Rationale:** Individual transaction data is PII/commercially sensitive. Aggregate trends are
sufficient for AI-generated narrative and carry lower privacy risk.
**Data minimization:** F325.GenerateStatementCommentaryAsync pre-processes to aggregates before
calling IAiProvider.GenerateAsync(). AF-8 (Security) validates this data boundary.

---

## DESIGN RECORDS CROSS-REFERENCE

| DR | Title | Primary Factories | Enforced By |
|----|-------|------------------|-------------|
| DR-29 | Immutable Finance Audit Trail | F322 | AF-7, T109 IR-109-8, DD-45 |
| DR-30 | Fiscal Period Scope on Every Query | F290, all posting factories | DNA-5 extension, T107 IR-107-6 |
| DR-31 | Compensation-Only Error Handling | F295, F302, F316, F313 | AF-7, DD-45 |
| DR-32 | SoD Four-Role Separation for Payments | F299, F310, F315 | DNA-9, CF-111, DD-44 |
| DR-33 | Fabric-First Bank Connectivity | F309, F310, F312, F313 | AF-8, T108 IR-108-1 |
| DR-34 | Three-Way Match Tolerance as FREEDOM | F295, F296, F297 | AF-9, T104 QG-104-5, DD-39 |
| DR-35 | Multi-Tenant Finance Isolation Tiers | F328, T112 | AF-7, DD-46 |
| DR-36 | Revenue Recognition Gate Mandatory | F304, F302 | T110 IR-110-1, CF-105, DD-42 |

---
## SAVE POINT: P5-INDEX ✅
## NEXT: 13-finance_MASTER_EXECUTION_PLAN_F11.md + SESSION_STATE
