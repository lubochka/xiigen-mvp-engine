# XIIGen — FLOW-13 MASTER EXECUTION PLAN
## "Enterprise Finance Engine — AP, AR, GL, Treasury, Period Close, Multi-Tenant"
## Date: 2026-02-26 | Status: ALL PHASES COMPLETE ✅
## Resumes from: SESSION_STATE_MERGE.md (FLOW-09 complete, F1-F287, T1-T102)

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 0 — NO-CODE EXPLANATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## The Big Picture (Plain English)

FLOW-13 teaches the XIIGen engine how to generate **enterprise-grade finance flows**.
These are the flows that run SAP-level operations: processing invoices, running payroll
batches, reconciling bank statements, locking fiscal periods, recognizing revenue, and
maintaining the ledger — all across multiple legal entities and tenants.

### Before FLOW-13
The engine knew how to build social flows (posts, events, friends), marketplace flows,
gamification, and multi-tenant control planes. It had no concept of:
- Double-entry accounting constraints (every debit must equal a credit)
- Fiscal period locking (you cannot post to a locked period — ever)
- Three-way match (PO ↔ GR ↔ Invoice must agree before payment)
- Segregation of Duties (the person who initiates cannot approve)
- Durable finance sagas (a payment run takes hours, must survive crashes)

### After FLOW-13
The engine can generate services that:
- **Run AP flows**: vendor invoice → three-way match → approval gate → payment run
- **Run AR flows**: customer invoice → revenue recognition → receipt application → aging
- **Run Period Close**: subledger sync → intercompany → lock → trial balance sign-off
- **Handle Treasury**: bank statement ingestion → payment matching → cash position
- **Enforce Compliance**: SoD checks, immutable audit trails, multi-tenant isolation tiers

### The Six Families (What The Engine Learns)

**Family 32 — Finance Master Data & Organization (F288–F294)**
"What is the chart of accounts, which legal entities exist, what exchange rates apply?"
CoA management, legal entity setup, ledger config, exchange rates, fiscal calendar,
tax authority gateway, and finance master data service.

**Family 33 — Accounts Payable (F295–F301)**
"Invoice received. Is it valid? Does it match the PO? Does it match the goods receipt?
Who approves? When does it pay?"
Invoice processing, PO matching, GR matching, AP subledger, vendor payment, exception
handling, AP approval workflow.

**Family 34 — Accounts Receivable (F302–F308)**
"Customer owes us money. Did they pay? Did we recognize the revenue correctly?
What is the aging? What milestones trigger billing?"
Revenue recognition, AR subledger, customer receipt, AR collector, deferred revenue,
AR aging, project billing.

**Family 35 — Cash & Treasury (F309–F315)**
"Money arrived in the bank. Which payment does it match? What is our cash position?
Can we release this payment batch?"
Bank statement ingestion, payment execution, bank reconciliation, cash position,
treasury workflow, forex settlement, payment validation.

**Family 36 — Asset & Controlling (F316–F321)**
"What assets do we own? How are they depreciating? What does the GL say vs. the subledger?
Which intercompany transactions need elimination?"
Asset accounting, cost center allocation, intercompany clearing, GL journal entry,
period close orchestration, trial balance.

**Family 37 — Compliance, Audit & Multi-Tenant Finance (F322–F329)**
"Is this transaction compliant? Who did what? Are two tenants' data leaking?
Are we running out of quota?"
Audit trail (immutable), approval workflow, document archive, SoD enforcement,
financial reporting, tax compliance, tenant finance config, quota management.

### What We ARE Doing
- ✅ **F288–F329**: 42 new factory interface contracts (Families 32–37) — ENGINE_ARCHITECTURE_F11.md
- ✅ **T103–T112**: 10 full engine contracts (ARCHETYPE, Iron Rules, Quality Gates) — TASK_TYPES_CATALOG_F13.md
- ✅ **110 cells**: AF Station Map (11 stations × 10 task types) — embedded in TASK_TYPES_CATALOG_F13.md
- ✅ **Template 20**: finance-engine-v1 JSON DAG — embedded in TASK_TYPES_CATALOG_F13.md
- ✅ **CF-96–CF-114**: 19 BFA conflict rules (finance-internal + cross-flow) — V62_BFA_STRESS_TEST_F11.md
- ✅ **ST-47–ST-58**: 12 stress tests (period race, SoD bypass, bank mismatch, quota) — V62_BFA_STRESS_TEST_F11.md
- ✅ **DR-29–DR-36**: 8 design records (audit, SoD, tolerance, isolation) — ENGINE_ARCHITECTURE_F11.md
- ✅ **SK-44–SK-53**: 10 skill patterns (saga entry, approval gate, 3-way match...) — SKILLS_FACTORY_RAG.md
- ✅ **DD-38–DD-50**: 13 design decisions — UNIFIED_SOURCE_INDEX_F11.md
- ✅ **EP-4 + EP-5 usage**: Durable Saga Runtime and Period Lock Primitive — both consumed (not redefined)
- ✅ **DNA-9 (SoD)** enforced on all 10 task types — new finance-specific pattern
- ✅ Backward compatibility: **0 breaks** (F1–F287, T1–T102, CF-1–CF-95 untouched)

### What We Are NOT Doing
- ❌ Not writing .NET GL or AP services directly (the ENGINE generates them on fabrics)
- ❌ Not creating typed C# classes (Invoice, Payment, JournalEntry) — Dictionary only (DNA-1)
- ❌ Not making HTTP calls between finance services — all events through QUEUE FABRIC (DNA-4)
- ❌ Not importing database drivers (PostgreSQL, Oracle) — always through DATABASE FABRIC (Skill 05)
- ❌ Not hardcoding tolerance thresholds, tax rates, or approval limits — FREEDOM config (DR-34)
- ❌ Not redefining EP-4/EP-5 — they are consumed by T103/T106, not invented here
- ❌ Not breaking F1–F287 or T1–T102

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 1 — PLAN VALIDATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Validation A: basic_prompt.txt — 12 Required Deliverables

| # | Requirement | Covered By | Status |
|---|-------------|-----------|--------|
| 1 | New factory interfaces registered in factory registry | ENGINE_ARCHITECTURE_F11.md F288–F329 | ✅ |
| 2 | Each factory resolves through an existing FABRIC | ENGINE_ARCHITECTURE_F11.md — FABRIC RESOLUTION column on all 42 | ✅ |
| 3 | New engine contracts (full format) for each task type | TASK_TYPES_CATALOG_F13.md T103–T112 | ✅ |
| 4 | ARCHETYPE, FACTORY DEPENDENCIES, FABRIC RESOLUTION on each T | TASK_TYPES_CATALOG_F13.md | ✅ |
| 5 | AF CONFIGURATION on each task type (all 11 stations mapped) | TASK_TYPES_CATALOG_F13.md — 110 AF cells | ✅ |
| 6 | BFA VALIDATION section on each task type | TASK_TYPES_CATALOG_F13.md — CF refs per T | ✅ |
| 7 | QUALITY GATES / IRON RULES per task type | TASK_TYPES_CATALOG_F13.md — 8 IR + 6 QG per T | ✅ |
| 8 | BFA cross-flow validation (new entities/events registered) | V62_BFA_STRESS_TEST_F11.md CF-96–CF-114 | ✅ |
| 9 | Flow template (JSON DAG for FlowOrchestrator) | TASK_TYPES_CATALOG_F13.md Template-20 | ✅ |
| 10 | Genie DNA compliance on all generated services | UNIFIED_SOURCE_INDEX_F11.md DNA section | ✅ |
| 11 | Skill patterns for AF-4 RAG retrieval | SKILLS_FACTORY_RAG.md SK-44–SK-53 | ✅ |
| 12 | Backward compatibility — T1–T102, F1–F287, CF-1–CF-95 unchanged | Save point checks across all files | ✅ |

## Validation B: Finance Domain Requirements

| Requirement | Task Type | Factory | Design Record |
|-------------|-----------|---------|---------------|
| Three-way match (PO/GR/Invoice) | T104 | F295, F296, F297 | DR-34 |
| Human approval with SoD | T105 | F301, F315, F323 | DNA-9 |
| Period locking (no post to closed) | T106 | F290 + EP-5 | DR-30 |
| Durable saga for long-running ops | T103, T108 | EP-4 | — |
| Double-entry validation | T109 | F288, F293 | — |
| Revenue recognition gate | T110 | F304, F302 | DR-36 |
| Bank reconciliation | T108 | F309, F312 | DR-33 |
| Immutable audit trail | All T (IR-x-4 on every T) | F322 | DR-29 |
| Multi-tenant finance isolation tiers | T112 | F328, F329 | DR-35 |
| Subledger-GL sync validation | T107 | F300, F307, F325 | — |

## Validation C: No Gaps

| Check | Result |
|-------|--------|
| Factory numbering: F287 was last, F288 is first FLOW-13 factory | ✅ No gap |
| Task type numbering: T102 was last, T103 is first FLOW-13 task type | ✅ No gap |
| BFA numbering: CF-95 was last, CF-96 is first FLOW-13 CF rule | ✅ No gap |
| Stress test numbering: ST-46 was last, ST-47 is first FLOW-13 ST | ✅ No gap |
| Design record numbering: DR-28 was last, DR-29 is first FLOW-13 DR | ✅ No gap |
| Skill numbering: SK-43 was last, SK-44 is first FLOW-13 SK | ✅ No gap |
| Design decision numbering: DD-37 was last, DD-38 is first FLOW-13 DD | ✅ No gap |
| Family numbering: Family 31 was last, Family 32 is first FLOW-13 family | ✅ No gap |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 2 — POSITIVE AND NEGATIVE EXAMPLES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## POSITIVE EXAMPLE: Correct Engine-Generated AP Invoice Service

**Scenario:** The engine generates a vendor invoice processing service for tenant "acme-corp".

```csharp
// ✅ CORRECT — Fabric-first, DNA-compliant, engine-generated service

public class VendorInvoiceProcessingService : MicroserviceBase  // DNA-4: extends MicroserviceBase
{
    public async Task<DataProcessResult<Dictionary<string,object>>> ProcessInvoiceAsync(
        string tenantId, string legalEntityId, Dictionary<string,object> invoicePayload)  // DNA-1: Dictionary
    {
        // DNA-5: scope isolation — tenantId on ALL queries
        var filter = BuildSearchFilter(new {    // DNA-2: BuildSearchFilter skips empty fields
            tenant_id = tenantId,
            legal_entity_id = legalEntityId,
            invoice_id = invoicePayload["invoice_id"]
        });

        // ✅ Factory resolution through DATABASE FABRIC (F295 → Skill 05)
        var invoiceService = await _invoiceFactory.CreateAsync(
            new FactoryResolutionContext { TenantId = tenantId });

        // ✅ Period lock check via FABRIC (F290 → EP-5) — BEFORE any write
        var periodCheck = await _calendarFactory.CreateAsync(ctx)
            .Then(s => s.IsPeriodOpenAsync(tenantId, legalEntityId, ledgerId, period));
        if (!periodCheck.IsSuccess || !periodCheck.Data)
            return DataProcessResult<Dictionary>.Failure("PERIOD_NOT_OPEN");  // DNA-3: no throw

        // ✅ Queue event through QUEUE FABRIC (never direct HTTP)
        await _queueService.EnqueueAsync($"finance.invoice.received.{tenantId}", invoicePayload);

        return DataProcessResult<Dictionary>.Success(result);  // DNA-3: DataProcessResult
    }
}
```

**Why this is CORRECT:**
- Extends `MicroserviceBase` (DNA-4) ✅
- Uses `Dictionary<string,object>` not `InvoiceEntity` class (DNA-1) ✅
- Uses `BuildSearchFilter` (DNA-2) ✅
- Returns `DataProcessResult<T>` never throws (DNA-3) ✅
- `tenantId` on every query (DNA-5) ✅
- Factory `CreateAsync()` never `new VendorInvoiceProcessingService()` ✅
- Period lock checked via fabric before posting ✅
- Events through QUEUE FABRIC, not HTTP ✅

---

## NEGATIVE EXAMPLE: What The Engine Must NEVER Generate

```csharp
// ❌ WRONG — Multiple violations, would fail AF-7 Compliance + AF-9 Judge

public class InvoiceService  // ❌ Does NOT extend MicroserviceBase
{
    private readonly NpgsqlConnection _db;  // ❌ Imports specific DB driver (PostgreSQL)
    private readonly OpenAIClient _ai;       // ❌ Imports specific AI provider

    public async Task<Invoice> ProcessInvoice(Invoice invoice)  // ❌ Typed model, not Dictionary
    {
        // ❌ No tenantId scope — will cross-contaminate tenants (CF-109 violation)
        var existing = await _db.QueryAsync<Invoice>("SELECT * FROM invoices WHERE id = @id",
            new { id = invoice.Id });

        // ❌ No period lock check — will post to locked period (CF-100 violation)
        // ❌ No three-way match — will pay without validation (IR-104-1 violation)

        try {
            await _db.ExecuteAsync("INSERT INTO invoices...");  // ❌ Direct DB, not fabric
        } catch (Exception ex) {
            throw new InvoiceException("Failed", ex);  // ❌ Throws — violates DNA-3
        }

        // ❌ HTTP call between services — not through QUEUE FABRIC
        await _httpClient.PostAsync("http://approval-service/approve", content);

        return invoice;  // ❌ Returns typed model, not DataProcessResult<Dictionary>
    }
}
```

**Why this FAILS (build failure — AF-7 + AF-9 reject):**
- Missing `MicroserviceBase` → CF-113 CONFLICT: missing 19 architectural components
- Direct `NpgsqlConnection` → DR-33 violation + AF-8 security rejection
- `Invoice` typed model → DNA-1 violation
- No `tenantId` → CF-109 CONFLICT: tenant data leak
- No period lock → CF-100 CONFLICT: posting to locked period
- `throw` instead of `DataProcessResult` → DNA-3 violation
- HTTP between services → DNA-4 violation (should be QUEUE FABRIC)
- No SoD check → DNA-9 violation

---

## EXAMPLE: Correct vs Wrong Factory Registration

**✅ CORRECT — F295 with fabric resolution declared:**
```
F295: IInvoiceProcessingService
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL provider
RESOLVES VIA: CreateAsync(FactoryResolutionContext { TenantId, LegalEntityId })
CONFIG KEY: finance.invoice.db.provider.{tenantId}
FALLBACK: Elasticsearch read-only replica
```

**❌ WRONG — Missing fabric resolution:**
```
F295: InvoiceProcessingService  // ❌ Class name not interface name
// No fabric resolution declared — engine cannot route at runtime
// Creates new() directly — not via CreateAsync()
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 3 — PHASE EXECUTION PLAN
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Phase Structure (designed for 15–45 min windows with save points)

| Phase | File | Content | Save Point | Status |
|-------|------|---------|-----------|--------|
| P1 | ENGINE_ARCHITECTURE_F11.md | F288–F329, Families 32–37, DR-29–DR-36 | P1-FACTORIES | ✅ |
| P2 | 13-finance_TASK_TYPES_CATALOG_F13.md | T103–T112, AF maps, Template-20 | P2-TASKS | ✅ |
| P3 | 13-finance_V62_BFA_STRESS_TEST_F11.md | CF-96–CF-114, ST-47–ST-58 | P3-BFA | ✅ |
| P4 | 13-finance_SKILLS_FACTORY_RAG.md | SK-44–SK-53 + RAG index | P4-SKILLS | ✅ |
| P5 | 13-finance_UNIFIED_SOURCE_INDEX_F11.md | DD-38–DD-50, concept maps, DNA compliance | P5-INDEX | ✅ |
| P6 | 13-finance_MASTER_EXECUTION_PLAN_F11.md | This file — plan, validation, examples | P6-PLAN | ✅ |
| P7 | 13-finance_SESSION_STATE_F13.md | Updated global state for post-FLOW-13 | P7-STATE | ✅ |

## Recovery Commands

```
Resume from P1: "Continue FLOW-13 from P1-FACTORIES — generate ENGINE_ARCHITECTURE_F11.md (F288–F329)"
Resume from P2: "Continue FLOW-13 from P2-TASKS — generate TASK_TYPES_CATALOG F13 (T103–T112)"
Resume from P3: "Continue FLOW-13 from P3-BFA — generate BFA stress tests (CF-96–CF-114, ST-47–ST-58)"
Resume from P4: "Continue FLOW-13 from P4-SKILLS — generate Skills Factory RAG (SK-44–SK-53)"
Resume from P5: "Continue FLOW-13 from P5-INDEX — generate Unified Source Index (DD-38–DD-50)"
Resume from P6: "Continue FLOW-13 from P6-PLAN — generate Master Execution Plan"
Resume from P7: "Continue FLOW-13 from P7-STATE — generate Session State file"
ALL COMPLETE:    "FLOW-13 complete. Load SESSION_STATE_F13.md and continue with FLOW-14"
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SECTION 4 — FLOW-13 SUMMARY METRICS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Engine State After FLOW-13

```
Factory Interfaces:  F1–F329    (+42 from FLOW-13)
Factory Families:    1–37       (+6 from FLOW-13)
Task Types:          T1–T112    (+10 from FLOW-13)
Flow Templates:      1–20       (+1: Template-20 finance-engine-v1)
BFA Conflict Rules:  CF-1–CF-114  (+19 from FLOW-13)
Stress Tests:        ST-1–ST-58   (+12 from FLOW-13)
DNA Patterns:        DNA-1–DNA-9  (unchanged — DNA-9 SoD consumed)
Engine Primitives:   EP-1–EP-5    (unchanged — EP-4/EP-5 consumed)
Design Records:      DR-1–DR-36   (+8 from FLOW-13)
Skill Patterns:      SK-1–SK-53   (+10 from FLOW-13)
Design Decisions:    DD-1–DD-50   (+13 from FLOW-13)
Iron Rules:          +80          (8 per task type × 10)
Quality Gates:       +60          (6 per task type × 10)
AF Station Cells:    +110         (11 × 10)
```

## New Archetypes Introduced in FLOW-13

| Archetype | First Used | Description |
|-----------|-----------|-------------|
| DURABLE_SAGA | T103 | Long-running saga with EP-4 crash recovery |
| HUMAN_GATE | T105 | Wait state for human approval with SoD validation |
| PROVISIONING | T112 | Tenant onboarding / setup orchestration |

Note: All three may have been registered in prior flows. FLOW-13 uses them; if new, they
are registered here. Existing archetypes (VALIDATION, ORCHESTRATION) continue unchanged.

## Key Finance Invariants Locked In (non-negotiable engine rules)

1. **No post to locked period** — T106 EP-5 + CF-100 enforced by AF-9
2. **Three-way match before payment** — T104 required before T108 (CF-98)
3. **SoD: initiator ≠ approver** — DNA-9 enforced on T103, T105, T108 (CF-111)
4. **Audit trail written BEFORE saga resumes** — IR-105-4 on all approval gates
5. **Double-entry must balance** — T109 IR-109-1, debit = credit always
6. **Tolerance from FREEDOM config** — DR-34, never hardcoded (CF-103)
7. **Immutable audit records** — DR-29, delete = IRON_RULE_VIOLATION
8. **Multi-tenant finance isolation** — DR-35, T112 F328/F329

---
## SAVE POINT: P6-PLAN ✅
## NEXT: 13-finance_SESSION_STATE_F13.md
