# 13-finance_V62_BFA_STRESS_TEST_F11
## XIIGen Engine — FLOW-13 BFA Conflict Rules & Stress Tests
## Save Point: P3-BFA | Status: COMPLETE ✅
## Extends: CF-1–CF-95 | Adds: CF-96–CF-114 (19 rules)
## Extends: ST-1–ST-46 | Adds: ST-47–ST-58 (12 stress tests)
## Backward compatibility: CF-1–CF-95, ST-1–ST-46 UNCHANGED

---

## CONFLICT RULE CATEGORIES FOR FLOW-13

| Category | Rules | Description |
|----------|-------|-------------|
| Finance-Internal | CF-96–CF-101 | P2P/O2C/R2R/Treasury mutual conflicts |
| Finance vs Prior Flows | CF-102–CF-107 | Finance vs FLOW-01 through FLOW-09 |
| Multi-Tenant Isolation | CF-108–CF-111 | Cross-tenant bleed, quota, provision |
| SoD Violations | CF-112–CF-114 | Dual-role detection in approval chains |

---

## CONFLICT RULES CF-96–CF-114

### CF-96: Period Lock Priority Over ALL Finance Posting
```
RULE:         When EP-5 reports CLOSED_LOCKED for tenant/entity/ledger/period,
              ALL posting operations in ALL finance flows (P2P, O2C, Treasury, Asset, Project)
              MUST be blocked — no exceptions, no bypass
AFFECTED FLOWS: FIN-01 (P2P), FIN-02 (O2C), FIN-03 (R2R), FIN-04 (P2Profit), FIN-05 (Treasury)
TRIGGER:      Any factory's PostToGLAsync, ExecutePaymentAsync, PostAllocationAsync,
              CapitalizeAssetAsync, PostRevaluationAsync called during CLOSED_LOCKED period
DETECTION:    BFA checks EP-5 state at registration time; AF-9 validates via T109 iron rule IR-109-3
RESOLUTION:   Request period reopen via F324.ReopenPeriodAsync (privileged actor + audit required)
SEVERITY:     CRITICAL — posting to closed period = financial misstatement
BFA ACTION:   BUILD FAILURE if generated code bypasses EP-5 period check
PROOF:        T106 IR-106-6 + T109 IR-109-3 + T108 IR-108-8 all enforce via EP-5
```

### CF-97: Simultaneous P2P and O2C Quota Exhaustion
```
RULE:         If tenant's finance quota (F329) is exhausted by P2P sagas, O2C sagas for same
              tenant MUST enter QUOTA_WAIT state — not fail permanently
AFFECTED FLOWS: FIN-01 (P2P) vs FIN-02 (O2C)
TRIGGER:      F329.CheckQuotaAsync returns false simultaneously for P2P and O2C initiations
DETECTION:    BFA monitors saga creation rate per tenant per flow type
RESOLUTION:   O2C saga waits with exponential backoff; admin notified via quota.threshold.exceeded event
SEVERITY:     HIGH
BFA ACTION:   ALERT — does not block generation, adds QUOTA_WAIT state to saga template
PROOF:        T103 IR-103-4 (quota check at saga entry)
```

### CF-98: Duplicate Vendor Invoice Detection
```
RULE:         Same vendor + invoice number + amount + fiscal period MUST NOT produce two
              posted journal entries, even if submitted twice from different sessions
AFFECTED FLOWS: FIN-01 (P2P) — IVendorInvoiceService
TRIGGER:      F295.SubmitInvoiceAsync called with duplicate invoice attributes
DETECTION:    BFA indexes invoice fingerprint (vendor_id + invoice_number + amount + period + tenant)
RESOLUTION:   Second submission returns idempotent result (same document_id); no duplicate posting
SEVERITY:     CRITICAL — duplicate payment is a financial control failure
BFA ACTION:   BUILD FAILURE if generated service lacks duplicate detection on SubmitInvoiceAsync
PROOF:        T104 QG-104-6 (idempotency), T109 IR-109-4 (new entry only, not duplicate)
```

### CF-99: Simultaneous Period Close Attempts
```
RULE:         Only ONE period close run may be in CLOSING_IN_PROGRESS state per
              tenant_id + legal_entity_id + ledger_id + fiscal_period at any time
AFFECTED FLOWS: FIN-03 (R2R) — IPeriodCloseOrchestrationService
TRIGGER:      Two concurrent calls to F324.StartCloseRunAsync for same period scope
DETECTION:    BFA checks EP-4 saga active count for T106 per period scope
RESOLUTION:   Second close attempt returns existing close run reference — no duplicate run
SEVERITY:     HIGH
BFA ACTION:   BUILD FAILURE if generated orchestrator lacks close run singleton enforcement
PROOF:        T106 IR-106-1 (period must be OPEN — concurrent runs cannot both see OPEN)
```

### CF-100: Payment Run During Period Close Window
```
RULE:         Treasury payment runs targeting a period MUST be paused if that period's
              close run (T106) is in CLOSING_IN_PROGRESS state
AFFECTED FLOWS: FIN-05 (Treasury) vs FIN-03 (R2R)
TRIGGER:      F310.ExecuteRunAsync called while F324 reports CLOSING_IN_PROGRESS
DETECTION:    BFA cross-references Treasury payment period with R2R close saga state
RESOLUTION:   Payment run deferred to WAITING_CLOSE state; resumes when period is CLOSED_LOCKED
              (payment posting moves to NEXT period if current period locks)
SEVERITY:     HIGH
BFA ACTION:   ALERT + generated Treasury template includes close-window check step
PROOF:        T108 IR-108-8 (period lock before payment proposal)
```

### CF-101: AR Reconciliation Gap Blocks O2C Posting
```
RULE:         If F307.RunSubledgerGLSyncAsync returns a gap > configured threshold,
              ALL new O2C invoice postings for that tenant/entity/period MUST be blocked
AFFECTED FLOWS: FIN-02 (O2C) — IARReconciliationService
TRIGGER:      T107 sync gate returns reconciliation gap above threshold
DETECTION:    BFA monitors T107 outcomes per tenant/period; blocks T109 for AR accounts
RESOLUTION:   Gap must be resolved and T107 re-run before unblocking
SEVERITY:     HIGH
BFA ACTION:   Generated O2C template adds AR sync gate check before posting step
PROOF:        T107 IR-107-4 (gap > threshold blocks period lock)
```

### CF-102: Duplicate Payment Prevention
```
RULE:         Same vendor + bank account + amount + payment run date MUST NOT produce
              two payment executions, even if bank callback is retried
AFFECTED FLOWS: FIN-05 (Treasury) + FIN-01 (P2P payment step)
TRIGGER:      F310.HandleSettlementCallbackAsync receives duplicate bank callback
DETECTION:    BFA indexes payment fingerprint (vendor_id + amount + run_date + tenant + bank_ref)
RESOLUTION:   Duplicate callback is idempotent — returns existing settlement record
SEVERITY:     CRITICAL — duplicate payment is a financial fraud risk
BFA ACTION:   BUILD FAILURE if HandleSettlementCallbackAsync lacks idempotency guard
PROOF:        T108 IR-108-4 (idempotent callback)
```

### CF-103: Unbalanced Journal Entry Attempt
```
RULE:         Any journal entry where debit sum ≠ credit sum MUST be rejected BEFORE
              it touches the posting path — zero tolerance
AFFECTED FLOWS: ALL finance flows (any GL posting step)
TRIGGER:      T109 double-entry validation called with unbalanced entry
DETECTION:    T109 validates debit=credit synchronously before posting
RESOLUTION:   Originating service receives DataProcessResult.Failure with balance detail
SEVERITY:     CRITICAL — unbalanced entry = corrupted ledger
BFA ACTION:   BUILD FAILURE if T109 is not in the posting path for any finance flow template
PROOF:        T109 IR-109-1 (zero tolerance debit=credit)
```

### CF-104: Invalid Account Code for Posting Type
```
RULE:         Posting to a GL account that is not valid for the specified posting type
              (e.g., posting revenue to an expense account) MUST be blocked
AFFECTED FLOWS: ALL finance flows
TRIGGER:      T109 calling F288.ValidateAccountAsync returns false
DETECTION:    T109 quality gate QG-109-2
RESOLUTION:   Originating service receives Failure with invalid account detail
SEVERITY:     HIGH
BFA ACTION:   ALERT if chart of accounts not initialized via T112 (provision gate)
PROOF:        T109 IR-109-2 (every account validated), T112 IR-112-2 (CoA must be initialized)
```

### CF-105: Revenue Recognized Before Delivery Confirmed
```
RULE:         Revenue recognition (T110) MUST NOT proceed if delivery confirmation
              from F304.ValidatePerformanceObligationAsync returns false
AFFECTED FLOWS: FIN-02 (O2C), FIN-04 (Project-to-Profit)
TRIGGER:      F304.RecognizeRevenueAsync called without confirmed delivery
DETECTION:    T110 IR-110-1 enforced; BFA validates flow template step ordering (T110 after delivery)
RESOLUTION:   Revenue deferred to deferred_revenue account; re-triggered on delivery confirmation
SEVERITY:     HIGH
BFA ACTION:   BUILD FAILURE if O2C or P2Profit flow template places T110 before delivery step
PROOF:        T110 IR-110-1 (delivery confirmation mandatory before RecognizeAsync)
```

### CF-106: Revenue/Billing Posting in CLOSED_LOCKED Period
```
RULE:         Revenue recognition (T110) and project milestone billing (T111) MUST check
              period lock state (CF-96) — already covered by CF-96 but registered explicitly
              for O2C and P2Profit BFA entity indices
AFFECTED FLOWS: FIN-02 (O2C), FIN-04 (Project-to-Profit)
TRIGGER:      T110 or T111 firing when period is CLOSED_LOCKED
DETECTION:    BFA entity index includes revenue_recognition + milestone_billing
RESOLUTION:   Standard CF-96 resolution applies
SEVERITY:     CRITICAL
BFA ACTION:   BUILD FAILURE (CF-96 applies + explicit registration for O2C/P2Profit entities)
PROOF:        T110 IR-110-2, T111 IR-111-2
```

### CF-107: Milestone Billing Before Milestone Completion
```
RULE:         F308.BillMilestoneAsync MUST NOT fire unless F320.GetProjectCostsAsync
              confirms milestone status = COMPLETED
AFFECTED FLOWS: FIN-04 (Project-to-Profit)
TRIGGER:      T111 firing without project milestone completion confirmed
DETECTION:    BFA checks T111 step ordering in flow template
RESOLUTION:   Billing blocked; project manager must mark milestone complete
SEVERITY:     HIGH
BFA ACTION:   BUILD FAILURE if P2Profit template places billing before milestone completion step
PROOF:        T111 IR-111-1 (milestone confirmation mandatory before billing)
```

### CF-108: Cross-Tenant Finance Saga Bleed
```
RULE:         Saga correlation_ids MUST be scoped to tenant_id. A saga created for tenant A
              MUST NEVER be visible or actionable from tenant B's context
AFFECTED FLOWS: ALL finance flows (any multi-tenant scenario)
TRIGGER:      F301/F315 workflow service called with tenant_id that differs from saga's tenant
DETECTION:    BFA checks that all saga factory methods include tenant_id scoping (DNA-5)
RESOLUTION:   Cross-tenant call returns DataProcessResult.Failure(403) — not 404
SEVERITY:     CRITICAL
BFA ACTION:   BUILD FAILURE if any factory method lacks tenant_id parameter
PROOF:        T103 IR-103-7 (all four scope fields), DNA-5 (scope isolation)
```

### CF-109: Tenant Correlation ID Uniqueness Violation
```
RULE:         Saga correlation_id MUST be globally unique. Format enforced:
              tenant_id.flow_type.document_id.v{version}
AFFECTED FLOWS: ALL finance flows
TRIGGER:      Two sagas created with same correlation_id (even for different tenants)
DETECTION:    BFA indexes correlation_id in saga creation registry
RESOLUTION:   Second saga creation rejects with idempotency key collision error
SEVERITY:     HIGH
BFA ACTION:   ALERT + idempotency key collision added to T103 iron rules
PROOF:        T103 IR-103-2 (idempotency key format)
```

### CF-110: Cross-Tenant Vendor Invoice Access
```
RULE:         IVendorInvoiceService operations MUST be scoped to tenant_id.
              A vendor invoice for tenant A MUST NOT be readable/matchable from tenant B
AFFECTED FLOWS: FIN-01 (P2P)
TRIGGER:      F295 called without tenant_id — or with wrong tenant_id
DETECTION:    BFA entity index for vendor_invoice includes tenant_id as mandatory partition key
RESOLUTION:   Returns DataProcessResult.Failure(403)
SEVERITY:     CRITICAL
BFA ACTION:   BUILD FAILURE if F295 factory methods lack tenant_id parameter
PROOF:        T104 IR-104-3 (DNA-5 scope isolation on all queries)
```

### CF-111: SoD Conflict — Same Actor as Initiator and Approver
```
RULE:         For ANY finance document, the identity that initiates (submits, creates, proposes)
              MUST NOT be the same identity that approves it
AFFECTED FLOWS: FIN-01 (P2P invoice), FIN-02 (O2C invoice), FIN-05 (Treasury payment run)
TRIGGER:      F301/F315 SubmitApprovalDecisionAsync called where approver_id == initiator_id
DETECTION:    F323.ValidateSoDAsync called by AF-7; BFA checks SoD registration in entity index
RESOLUTION:   Approval rejected with SoD violation; SoD violation event emitted to QUEUE FABRIC
SEVERITY:     CRITICAL — SoD violation = internal control failure
BFA ACTION:   BUILD FAILURE if SoD check not present in generated approval service
PROOF:        DNA-9 (SoD), T105 IR-105-2, CF-111
```

### CF-112: Approval Timeout vs Period Close Deadline Conflict
```
RULE:         When a finance document approval (T105) times out with no decision AND
              the fiscal period's close run (T106) is starting, the document MUST be
              escalated — not auto-approved and not silently dropped
AFFECTED FLOWS: FIN-01 (P2P), FIN-02 (O2C) vs FIN-03 (R2R close timeline)
TRIGGER:      T105 escalation timer fires within 24h of T106 close start
DETECTION:    BFA cross-references T105 saga timeouts with T106 close window from EP-5 calendar
RESOLUTION:   Auto-escalate to next approval tier with CLOSE_DEADLINE urgency flag
SEVERITY:     HIGH
BFA ACTION:   Generated T105 template includes close-deadline proximity check
PROOF:        T105 IR-105-6 (escalation on timeout), T106 MACHINE/FREEDOM (close SLA hours)
```

### CF-113: Cross-Flow Approval Queue Conflict
```
RULE:         P2P approval queue events MUST be segregated from O2C approval queue events.
              Mixed queue consumption could result in wrong approver receiving wrong document
AFFECTED FLOWS: FIN-01 (P2P) vs FIN-02 (O2C)
TRIGGER:      Both flows emitting to same QUEUE FABRIC topic without flow_type discriminator
DETECTION:    BFA checks QUEUE FABRIC topic naming in generated templates
RESOLUTION:   Topics namespaced: finance.approval.{flow_type}.{tenant_id}
SEVERITY:     HIGH
BFA ACTION:   BUILD FAILURE if generated approval events use generic topic without flow_type
PROOF:        T105 AF configuration (QUEUE FABRIC event includes correlation_id, flow_id)
```

### CF-114: Cross-Tenant Config Bleed During Provisioning
```
RULE:         During tenant finance provisioning (T112), the new tenant's chart of accounts,
              fiscal calendar, and quota configuration MUST NOT read or inherit from another
              tenant's config (even if using same CoA template name)
AFFECTED FLOWS: T112 (Tenant Finance Provision Gate)
TRIGGER:      F328.ProvisionTenantAsync reads template without tenant_id scoping
DETECTION:    BFA checks F328 methods all include tenant_id as input parameter
RESOLUTION:   Template is read as a COPY into new tenant's namespace — not a reference
SEVERITY:     CRITICAL
BFA ACTION:   BUILD FAILURE if provisioning service reads template without tenant isolation
PROOF:        T112 IR-112-1 (isolation tier set before any operation), DR-35 (isolation tiers)
```

---

## STRESS TESTS ST-47–ST-58

### ST-47: Three-Way Match Partial Receipt Scenario
```
SCENARIO:     P2P flow. PO for 100 units. GR confirms only 60 units. Invoice claims 100 units.
EXPECTED:     T104 routes to exception queue (F298). F295 invoice stays in MATCH_EXCEPTION.
              F299 payment blocked until exception resolved. Audit record in F322.
MUST PASS:    IR-104-7 (partial receipts → exception), CF-98 (no duplicate invoice)
MUST FAIL IF: Auto-approved despite partial receipt. Payment proceeds before exception resolution.
PROBE:        Replay with full receipt → three-way match passes → proceeds to T105 approval
```

### ST-48: Period Close Blocks Concurrent Posting
```
SCENARIO:     R2R initiates period close (T106). Simultaneously, P2P attempts invoice posting
              (T109) for same tenant/entity/period/ledger.
EXPECTED:     T109 returns DataProcessResult.Failure("PERIOD_CLOSING_IN_PROGRESS").
              P2P saga enters WAITING_PERIOD state. R2R close completes. Period locks.
              P2P saga is escalated with CLOSE_DEADLINE flag (CF-112).
MUST PASS:    CF-96 (period lock blocks all posting), CF-100 (payment deferred during close)
MUST FAIL IF: P2P posting succeeds during close run. Period lock does not block T109.
```

### ST-49: Duplicate Bank Callback Idempotency
```
SCENARIO:     Treasury payment run executed. Bank sends settlement callback.
              Network issue causes bank to send the same callback 3 times.
EXPECTED:     First callback updates payment to SETTLED. Callbacks 2 and 3 return
              same DataProcessResult (idempotent). No duplicate GL postings. Single audit record.
MUST PASS:    T108 IR-108-4 (idempotent callback), CF-102 (duplicate payment prevention)
MUST FAIL IF: Each callback creates a separate payment record. Duplicate GL journal entries posted.
PROBE:        Verify F322 audit trail shows exactly ONE settlement record.
```

### ST-50: Cross-Tenant Vendor Invoice Isolation
```
SCENARIO:     Tenant A submits vendor invoice for vendor_id=V001.
              Tenant B attempts to access vendor invoice for V001 using Tenant A's invoice_id.
EXPECTED:     F295.GetInvoiceAsync returns DataProcessResult.Failure(403).
              No data from Tenant A visible to Tenant B. BFA CF-110 triggered.
MUST PASS:    CF-110, CF-108, DNA-5 (scope isolation), T104 IR-104-3
MUST FAIL IF: Tenant B receives any data from Tenant A's invoice records.
```

### ST-51: SoD Violation Detection — Self-Approval
```
SCENARIO:     User alice@tenant-a submits vendor invoice. Same alice@tenant-a attempts to
              approve the same invoice via T105 Human Approval Gate.
EXPECTED:     F323.ValidateSoDAsync returns Failure. Approval rejected with SoD_VIOLATION.
              SoD.violation.detected event emitted to QUEUE FABRIC. Audit record in F322.
MUST PASS:    CF-111, DNA-9, T105 IR-105-2
MUST FAIL IF: Approval succeeds for self-approving user. No SoD violation event emitted.
PROBE:        Assign a different approver → T105 proceeds normally.
```

### ST-52: Unbalanced Journal Entry Rejection
```
SCENARIO:     P2P posting service attempts to post journal entry: Debit 1000, Credit 950.
              T109 Double-Entry Validation Gate fires.
EXPECTED:     T109 returns DataProcessResult.Failure with balance_delta=50 detail.
              No GL posting occurs. Originating P2P saga enters POSTING_FAILED state.
              Audit pre-flight record written to F322 even for rejected entry.
MUST PASS:    CF-103, T109 IR-109-1 (zero tolerance)
MUST FAIL IF: Partial posting occurs. T109 passes unbalanced entry.
```

### ST-53: Multi-Tenant Period Lock Independence
```
SCENARIO:     Tenant A locks fiscal period 2026-03 (R2R close complete).
              Tenant B is still in period 2026-03 with OPEN state.
EXPECTED:     Tenant A: all posting in 2026-03 is blocked (EP-5 CLOSED_LOCKED).
              Tenant B: posting in 2026-03 continues normally.
              Tenant A's lock has ZERO effect on Tenant B.
MUST PASS:    CF-96, CF-108, DR-35 (multi-tenant isolation)
MUST FAIL IF: Tenant B's posting is affected by Tenant A's period lock.
PROBE:        Lock Tenant B's period → Tenant A still unaffected.
```

### ST-54: Revenue Recognition Deferred on Unconfirmed Delivery
```
SCENARIO:     O2C flow. Customer invoice created. Delivery NOT confirmed (service not rendered).
              Revenue recognition gate (T110) fires.
EXPECTED:     T110 routes revenue to deferred_revenue_account. F304.DeferRevenueAsync called.
              GL posting is a deferred liability entry — not revenue recognition entry.
              When delivery later confirmed → T110 re-fires → revenue recognized.
MUST PASS:    CF-105, T110 IR-110-1 and IR-110-3
MUST FAIL IF: Revenue recognized before delivery. Deferred entry not created.
```

### ST-55: Tenant Provisioning Idempotency
```
SCENARIO:     New tenant provisioned via T112. Network error causes provisioning to be called
              twice with identical parameters.
EXPECTED:     Second call returns existing tenant config reference (idempotent).
              No duplicate chart of accounts, fiscal calendar, or quota records created.
              Single provisioning audit record in F322.
MUST PASS:    T112 IR-112-6 (idempotent re-provision), CF-114 (no cross-tenant bleed)
MUST FAIL IF: Duplicate configurations created. Quota counters doubled. Duplicate fiscal periods in EP-5.
```

### ST-56: Payment Run 4-Role SoD Enforcement
```
SCENARIO:     Treasury payment run (FIN-05). User alice: proposes run. alice also attempts to:
              (a) approve the run, (b) execute the run.
EXPECTED:     (a) Approval by alice rejected (SoD: proposer ≠ approver — DR-32).
              (b) Execution by alice rejected (proposer ≠ executor).
              Both rejections emit SoD.violation.detected events to QUEUE FABRIC.
              A different user bob approves → run proceeds.
MUST PASS:    CF-111, DR-32 (4-role separation), T108 IR-108-2, DNA-9
MUST FAIL IF: Alice can approve or execute her own payment proposal.
```

### ST-57: Subledger-GL Gap Blocks Period Lock
```
SCENARIO:     R2R period close initiates. T107 Subledger-GL Sync runs.
              AR subledger shows balance 1,000,000. GL AR control account shows 995,000. Gap = 5,000.
              Threshold in FREEDOM config = 1,000 max gap.
EXPECTED:     T107 returns Failure with gap_amount=5000 and gap_location=AR_control_account.
              Period close T106 CANNOT lock the period (checklist step blocked).
              Admin receives alert. Gap must be resolved before close can complete.
MUST PASS:    CF-101, T107 IR-107-4 (gap > threshold blocks period lock)
MUST FAIL IF: Period locks despite gap. Gap amount not reported in result.
PROBE:        Resolve gap → re-run T107 → T106 can proceed to lock.
```

### ST-58: Quota Exhaustion Graceful Degradation
```
SCENARIO:     Tenant A has quota limit of 100 concurrent sagas. 100 active sagas exist.
              User attempts to initiate 101st finance saga (P2P).
EXPECTED:     T103 F329.CheckQuotaAsync returns false. Saga creation deferred with QUOTA_WAIT state.
              quota.threshold.exceeded event emitted to QUEUE FABRIC.
              When one of the 100 sagas completes → quota freed → new saga proceeds.
MUST PASS:    CF-97, T103 IR-103-4, F329 CRITICAL note (event on threshold, not blocking inline)
MUST FAIL IF: 101st saga created despite quota. System resource exhaustion occurs. 
              Quota counter blocks inline rather than emitting event.
```

---

## POST-FLOW-13 BFA TOTALS

```
Conflict Rules:  CF-1–CF-114  (114 total, +19)
Stress Tests:    ST-1–ST-58   (58 total, +12)
Categories (FLOW-13): Finance-Internal (6), Finance vs Prior (6), Multi-Tenant (4), SoD (3)
```

---
## SAVE POINT: P3-BFA ✅
## NEXT: 13-finance_SKILLS_FACTORY_RAG.md (SK-44–SK-53)
