# FLOW-08 — Finance Deep Research Engine (Multi-Tenant ERP-Grade)
## XIIGen Engine Extension Plan
## Save Point: PLAN:P0 | Date: 2026-02-26 | Status: PLAN COMPLETE ✅

---

## PREREQUISITE VERIFICATION

```
Current system state (FLOW-07 FINAL):
  Families:       26       (F1–F243)
  Task Types:     82       (T1–T82)
  BFA Rules:      63       (CF-1–CF-63)
  Stress Tests:   30       (ST-1–ST-30)
  Design Records: 20       (DR-1–DR-20)
  Design Decisions:20      (DD-1–DD-20)
  Skill Patterns: 28       (SK-1–SK-28)
  Flow Templates: 17       (Templates 1–17)
  DNA Patterns:   8        (DNA-1–DNA-8)
  Engine Prims:   3        (EP-1–EP-3)

FLOW-08 starting numbers:
  Next Family:    27       → starts F244
  Next Task Type: T83
  Next BFA Rule:  CF-64
  Next ST:        ST-31
  Next DR:        DR-21
  Next DD:        DD-21
  Next SK:        SK-29
  Next Template:  18
  New EP:         EP-4, EP-5
  New DNA:        DNA-9
  New Fabric:     BANK CONNECTIVITY FABRIC (Skill 10)
                  MULTI-TENANT ISOLATION FABRIC (Skill 11)
```

---

## WHAT FLOW-08 IS

FLOW-08 is the **Finance Deep Research Engine** — an ERP-grade, multi-tenant financial
workflow system. Unlike FLOW-01 through FLOW-07, which extended the engine with new
DOMAIN FAMILIES and TASK TYPES on top of existing fabrics, FLOW-08 does two additional
things:

1. **Extends Layer 0 (Fabric) itself** — adds 2 new swappable fabric interfaces
2. **Adds new Engine Primitives** — EP-4 (Durable Saga) and EP-5 (Period Lock Registry)

These are necessary because finance flows have requirements no prior flow needed:
- Long-running flows that pause for days/weeks waiting for human approval or bank events
- Period lock controls that must be enforced per tenant/legal entity/ledger
- Idempotent, compensation-based error handling (no rollback — only reversal documents)
- Segregation of Duties enforcement at the flow engine level

---

## WHAT THE ENGINE LEARNS TO BUILD (FLOW-08 OUTPUT)

When complete, the engine can generate the following 5 ERP-grade financial flows:

| Flow | Name | Key New Capability |
|------|------|--------------------|
| FIN-01 | Procure-to-Pay (P2P) | Three-way match gate + approval wait state |
| FIN-02 | Order-to-Cash (O2C) | Revenue recognition gate + credit limit check |
| FIN-03 | Record-to-Report (R2R) | Period close orchestration + GL lock |
| FIN-04 | Project-to-Profit | Milestone billing + cost settlement |
| FIN-05 | Treasury & Cash | Bank event correlation + payment run |

---

## PHASE PLAN

### PHASE 1 — Engine Layer Extensions (DR-21 to DR-28, EP-4, EP-5, new Fabrics)
**Duration estimate**: 30–40 min | **Save point**: MERGE:P1
**Produces**: FLOW08_P1_ENGINE_EXTENSIONS.md

What it does:
- Defines BANK CONNECTIVITY FABRIC (Skill 10 — IBankConnectorService)
  Providers: ISO 20022, Plaid, SWIFT, OpenBanking, Mock — all resolved via config
  Methods: InitiatePaymentAsync, IngestStatementAsync, ReconcileAsync
- Defines MULTI-TENANT ISOLATION FABRIC (Skill 11 — ITenantIsolationService)
  Tiers: Pooled, Bridge (schema-per-tenant), Silo (DB-per-tenant)
  Methods: ResolveContextAsync, BindTenantAsync, EnforceIsolationAsync
- Defines EP-4: Durable Saga Runtime
  Long-running flows with explicit wait states (WAITING_APPROVAL, WAITING_BANK_EVENT)
  Idempotency key management, compensation step registry, replay-safe execution
- Defines EP-5: Period Lock Registry
  Scoped to: tenant_id + legal_entity_id + ledger_id + fiscal_period
  States: OPEN → CLOSING_IN_PROGRESS → VALIDATION_FAILED → CLOSED_LOCKED → REOPENED
  Never global; one tenant's close never affects another
- Defines DNA-9: SoD (Segregation of Duties) — no single identity initiates, approves, posts,
  AND reconciles the same financial document. Enforced by AF-7 (Compliance station)
- Design Records DR-21 through DR-28

### PHASE 2 — Factory Families 27–32 (F244–F285, 6 families, 42 interfaces)
**Duration estimate**: 45–60 min | **Save point**: MERGE:P2
**Produces**: FLOW08_P2_FACTORIES.md

Family 27: Finance Master Data        F244–F250  (7 factories)
Family 28: Accounts Payable           F251–F257  (7 factories)
Family 29: Accounts Receivable        F258–F264  (7 factories)
Family 30: Cash & Treasury            F265–F271  (7 factories)
Family 31: Asset & Controlling        F272–F277  (6 factories)
Family 32: Compliance, Audit & MT     F278–F285  (8 factories)

Each factory: full spec with FABRIC RESOLUTION mapping.

### PHASE 3 — Task Types T83–T92 (10 full engine contracts)
**Duration estimate**: 60–90 min | **Save point**: MERGE:P3
**Produces**: FLOW08_P3_TASK_TYPES.md

T83: Durable Saga Entry Gate          DURABLE_SAGA archetype (NEW)
T84: Three-Way Match Gate             VALIDATION
T85: Human Approval Gate             HUMAN_GATE archetype (NEW)
T86: Period Close Orchestrator        ORCHESTRATION
T87: Subledger-GL Sync Gate           VALIDATION
T88: Payment Run Gate                 ORCHESTRATION
T89: Double-Entry Validation Gate     VALIDATION
T90: Revenue Recognition Gate         VALIDATION
T91: Project Milestone Billing Gate   ORCHESTRATION
T92: Tenant Provision Gate            PROVISIONING archetype (NEW)

Each: full engine contract with ARCHETYPE, FACTORY DEPS, FABRIC RESOLUTION,
      AF CONFIGURATION, BFA VALIDATION, MACHINE/FREEDOM, IRON RULES, QUALITY GATES.
      Minimum 8 IRON RULES and 6 QUALITY GATES each.

### PHASE 4 — AF Station Mapping + Flow Templates 18–22
**Duration estimate**: 30–40 min | **Save point**: MERGE:P4
**Produces**: FLOW08_P4_AF_TEMPLATES.md

AF Map: 11 stations × 10 task types = 110 cells
Templates 18–22: one per FIN-01 through FIN-05
Each template: DAG JSON for FlowOrchestrator (Skill 09)
Each step: resolved through a fabric via CreateAsync(), never direct

### PHASE 5 — BFA Conflict Rules CF-64–CF-82 + Stress Tests ST-31–ST-42
**Duration estimate**: 30–40 min | **Save point**: MERGE:P5
**Produces**: FLOW08_P5_BFA.md

19 new conflict rules (CF-64–CF-82)
  - Cross-flow: finance flows vs FLOW-01 through FLOW-07
  - Intra-finance: P2P vs O2C (GL posting conflicts), R2R vs all (period lock priority)
  - Multi-tenant: cross-tenant entity bleed rules
12 stress tests (ST-31–ST-42) — all must PASS
BFA registration: all new entities, events, APIs indexed

### PHASE 6 — Skill Patterns SK-29–SK-38 + DD-21–DD-30 + Source Index
**Duration estimate**: 25–30 min | **Save point**: MERGE:P6
**Produces**: FLOW08_P6_INDEX_SKILLS.md

SK-29: Durable Saga Pattern (EP-4 usage)
SK-30: Period Lock Enforcement
SK-31: Three-Way Match Implementation
SK-32: Double-Entry Journal Guard
SK-33: Multi-Tenant Context Propagation
SK-34: Bank Statement Correlation
SK-35: Idempotency Key Manager Pattern
SK-36: SoD Policy Enforcement (DNA-9)
SK-37: Subledger-GL Sync Pattern
SK-38: Fiscal Calendar Resolver

DD-21 through DD-30: design decisions for new archetypes and finance invariants

### PHASE 7 — Validation + Final Session State
**Duration estimate**: 20 min | **Save point**: MERGE:FINAL
**Produces**: FLOW08_VALIDATION.md + FLOW08_SESSION_STATE_FINAL.md

Full compliance check across all 6 phases:
- Sequence continuity (no gaps in F/T/CF/ST/SK/DR/DD/Template numbers)
- DNA-1 through DNA-9 compliance on all 42 new factories
- AF coverage: all 10 task types have all 11 AF stations mapped
- BFA: all new entities registered, all conflict rules have proofs
- Backward compatibility: T1–T82, F1–F243, CF-1–CF-63 unchanged
- Template integrity: all 5 finance templates are valid DAGs

---

## VALIDATION: DOES THE PLAN COVER ALL REQUIREMENTS?

| Requirement from basic_prompt.txt | Coverage | Phase |
|----------------------------------|----------|-------|
| New factory interfaces registered in factory registry | ✅ | P2 |
| Each factory declares WHICH fabric it resolves through | ✅ | P2 |
| Full engine contract format (not one-line stubs) | ✅ | P3 |
| AF station mapping for new flow | ✅ | P4 |
| BFA cross-flow validation | ✅ | P5 |
| Flow template (DAG) for FlowOrchestrator | ✅ | P4 |
| Genie DNA compliance on all generated services | ✅ | P2+P6 |
| No typed models (ParseDocument / DNA-1) | ✅ | P2 |
| No direct provider imports | ✅ | P1+P2 |
| Backward compatibility (T1-T82, F1-F243 unchanged) | ✅ | P7 |
| UI: fabric-first, zero platform-specific values | ✅ | P1 |

| Requirement from 13-* finance docs | Coverage | Phase |
|------------------------------------|----------|-------|
| P2P: three-way match gate | ✅ T84 | P3 |
| P2P: approval wait state | ✅ T85, EP-4 | P1+P3 |
| O2C: revenue recognition gate | ✅ T90 | P3 |
| O2C: credit limit check | ✅ T92/CF-rules | P3+P5 |
| R2R: period close orchestrator | ✅ T86 | P3 |
| R2R: GL lock per tenant/entity | ✅ EP-5, DNA-9 | P1 |
| Treasury: bank event correlation | ✅ Bank Fabric, T88 | P1+P3 |
| Treasury: payment run gate | ✅ T88 | P3 |
| Project-to-Profit: milestone billing | ✅ T91 | P3 |
| Immutable audit trail | ✅ DNA-9, T89, CF rules | P1+P5 |
| Double-entry validation | ✅ T89 | P3 |
| SoD enforcement | ✅ DNA-9, AF-7 | P1 |
| Multi-tenant isolation (3 tiers) | ✅ MT Fabric, T92, SK-33 | P1+P3 |
| Period lock per tenant/entity/ledger | ✅ EP-5 | P1 |
| ISO 20022 / OpenBanking / SWIFT support | ✅ Bank Fabric providers | P1 |
| Idempotent compensation (no rollback) | ✅ EP-4, SK-35 | P1+P6 |
| CloudEvents-compatible event envelopes | ✅ Queue Fabric extension | P1 |
| Tenant quota / noisy-neighbor control | ✅ MT Fabric, CF rules | P1+P5 |

**Coverage: 35/35 requirements ✅**

---

## POSITIVE EXAMPLES (what correct output looks like)

### ✅ POSITIVE: Factory interface with correct fabric resolution

```
F251: IVendorInvoiceService
  FAMILY: 28 — Accounts Payable
  FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL provider
  METHODS:
    SubmitAsync(tenantId, invoiceDoc)       → DataProcessResult<Dictionary>
    RunThreeWayMatchAsync(tenantId, invoiceId) → DataProcessResult<MatchResult>
    ApproveAsync(tenantId, invoiceId, approverCtx) → DataProcessResult<bool>
    PostToGLAsync(tenantId, invoiceId)      → DataProcessResult<JournalRef>
  CREATION: IExternalServiceFactory<IVendorInvoiceService>.CreateAsync(ctx)
  DNA-9 (SoD): submitter ≠ approver ≠ poster (enforced in PostToGLAsync guard)
```

### ✅ POSITIVE: Task type with full engine contract

```
TASK TYPE: T84 — Three-Way Match Gate
ARCHETYPE: VALIDATION
ENTRY: Fires when IVendorInvoiceService.SubmitAsync completes → queue event
PURPOSE: Compare PO, Goods Receipt, and Vendor Invoice; route to approval or exception
DISTINCT FROM: T89 (Double-Entry Validation — checks GL balance, not document match)
FACTORY DEPENDENCIES: F251 (IVendorInvoiceService), F252 (IPurchaseOrderService),
                      F253 (IReceiptService), F257 (IMatchExceptionService)
FABRIC RESOLUTION:
  F251 → DATABASE FABRIC (PostgreSQL)
  F252 → DATABASE FABRIC (PostgreSQL)
  F253 → DATABASE FABRIC (Elasticsearch — receipt search)
  F257 → QUEUE FABRIC (Redis Streams — DLQ for exceptions)
AF CONFIGURATION:
  AF-1: Genesis generates MatchEvaluationService extending MicroserviceBase
  AF-4: RAG searches SK-31 (Three-Way Match Implementation)
  AF-7: Compliance checks DNA-9 (SoD: submitter ≠ approver)
  AF-9: Judge validates iron rules IR-83 through IR-90
MACHINE/FREEDOM:
  MACHINE: match algorithm logic, GL posting rules, DLQ routing
  FREEDOM: tolerance thresholds (price variance %), escalation rules, approval tiers
IRON RULES (IR-83 to IR-90):
  IR-83: Match result MUST produce DataProcessResult<T>, never throw
  IR-84: All three documents (PO, GR, Invoice) MUST exist before gate fires
  IR-85: tenantId + legalEntityId MUST appear on every document query (DNA-5)
  IR-86: Exception routing MUST go through QUEUE FABRIC to DLQ (never direct HTTP)
  IR-87: Match result MUST be immutable (append-only, never mutate existing record)
  IR-88: SoD enforced: invoice submitter MUST NOT be the match approver
  IR-89: Partial receipts MUST route to exception queue, never auto-approve
  IR-90: Period lock checked BEFORE posting (EP-5 gate; fail if period CLOSED_LOCKED)
QUALITY GATES (QG-83 to QG-88):
  QG-83: All three documents parsed as Dictionary<string,object> — no typed models
  QG-84: BuildSearchFilter skips empty fields on all three document searches
  QG-85: Match result stored via DATABASE FABRIC (not in-memory or file)
  QG-86: Exception documents include correlation_id linking all three source documents
  QG-87: AF-9 confirms price variance tolerance is sourced from FREEDOM config, not code
  QG-88: Replaying the gate with same inputs produces same result (idempotent)
```

### ✅ POSITIVE: Flow template step (fabric-first)

```json
{
  "step_id": "p2p-three-way-match",
  "factory": "F251:IVendorInvoiceService",
  "method": "RunThreeWayMatchAsync",
  "resolution": "CreateAsync(FactoryResolutionContext)",
  "fabric": "DATABASE_FABRIC/PostgreSQL",
  "on_success": "p2p-approval-gate",
  "on_failure": "p2p-match-exception-dlq",
  "timeout_ms": 30000,
  "idempotency_key": "{{flow_id}}.{{invoice_id}}.match"
}
```

---

## NEGATIVE EXAMPLES (what MUST NOT appear)

### ❌ NEGATIVE: Direct provider import in generated service

```csharp
// VIOLATION: imports specific DB driver directly
using Npgsql; // ← BUILD FAILURE — use DATABASE FABRIC
var conn = new NpgsqlConnection(connectionString); // ← BUILD FAILURE
```

### ❌ NEGATIVE: Typed model instead of Dictionary

```csharp
// VIOLATION: typed model — DNA-1 forbids this
public class VendorInvoice {
  public string InvoiceNumber { get; set; } // ← BUILD FAILURE
  public decimal Amount { get; set; }       // ← BUILD FAILURE
}
// CORRECT: var invoice = ParseDocument(doc) → Dictionary<string,object>
```

### ❌ NEGATIVE: Task type stub (incomplete engine contract)

```
T84: Three-Way Match Gate
  — validates PO/GR/Invoice match
  — routes to exception on failure
```
❌ MISSING: ARCHETYPE, FACTORY DEPENDENCIES, FABRIC RESOLUTION, AF CONFIGURATION,
   MACHINE/FREEDOM, IRON RULES, QUALITY GATES — this is a one-line stub, BUILD FAILURE

### ❌ NEGATIVE: Global period lock

```csharp
// VIOLATION: period lock is NEVER global
_periodLockService.LockAllPeriods(); // ← BUILD FAILURE
// CORRECT: must scope to tenant_id + legal_entity_id + ledger_id + fiscal_period
```

### ❌ NEGATIVE: SoD violation

```csharp
// VIOLATION: same identity submits AND approves — DNA-9 forbids this
await invoice.SubmitAsync(userId);
await invoice.ApproveAsync(userId); // ← BUILD FAILURE — approver MUST differ from submitter
```

### ❌ NEGATIVE: Flow template calling service directly (not via factory)

```json
{
  "step_id": "match-invoice",
  "class": "MatchingService",        // ← BUILD FAILURE
  "constructor": "new MatchingService(pgConnection)" // ← BUILD FAILURE
}
// CORRECT: use "factory": "F251:IVendorInvoiceService" + CreateAsync()
```

---

## NEW ENGINE PRIMITIVES INTRODUCED IN FLOW-08

### EP-4: Durable Saga Runtime
**Why new**: FLOW-01–07 used event-driven flows where each step completes synchronously
or via queue. Finance flows require DAYS-LONG waits (AP approval 3-5 business days,
bank settlement 1-3 days). EP-4 adds:
  - Explicit WAIT_STATES: WAITING_APPROVAL | WAITING_BANK_EVENT | WAITING_CLOSE_STEP
  - Saga journal: append-only log of every step outcome (tamper-evident)
  - Compensation registry: every step registers its reversal before executing
  - Idempotency key: every step execution is keyed; replaying produces same outcome
  - Timeout policy: configurable per step, fires DLQ event on expiry

### EP-5: Period Lock Registry
**Why new**: No prior flow needed time-scoped write prevention. Finance GL integrity
requires that once a period closes, NO postings can be made to it.
  - Scoped by: (tenant_id, legal_entity_id, ledger_id, fiscal_period)
  - States: OPEN → CLOSING_IN_PROGRESS → VALIDATION_FAILED → CLOSED_LOCKED → REOPENED
  - Enforcement: DATABASE FABRIC middleware checks lock before any StoreDocument call
    with period-tagged documents — returns DataProcessResult.Fail("PERIOD_LOCKED")
  - Reopen: privileged action, requires dual approval, creates audit record

### DNA-9: Segregation of Duties (SoD)
**Why new**: No prior DNA pattern addressed IDENTITY ROLE separation.
  - Law: No single identity may be both initiator AND approver AND poster AND reconciler
    of the same financial document within the same flow instance
  - Enforcement: AF-7 (Compliance station) validates actor IDs at each gate
  - Stored in: MicroserviceBase auth context (existing infrastructure, new check)

---

## NEW FABRICS INTRODUCED IN FLOW-08

### BANK CONNECTIVITY FABRIC (Skill 10 — IBankConnectorService)
Providers: ISO20022Adapter | PlaidAdapter | SwiftAdapter | OpenBankingAdapter | MockAdapter
Resolved at runtime via config: `bank_connector.provider = "ISO20022"`
Service code NEVER imports a bank SDK directly.
Methods:
  InitiatePaymentAsync(tenantId, paymentDoc) → DataProcessResult<PaymentRef>
  IngestStatementAsync(tenantId, statementDoc) → DataProcessResult<List<StatementLine>>
  ReconcileAsync(tenantId, paymentRef, statementLineId) → DataProcessResult<ReconcileResult>
Config keys: provider, endpoint, credentials_secret_ref, retry_policy, timeout_ms

### MULTI-TENANT ISOLATION FABRIC (Skill 11 — ITenantIsolationService)
Tiers: POOLED (shared schema, tenant_id RLS) | BRIDGE (schema-per-tenant) | SILO (DB-per-tenant)
Tier resolved via tenant registry at startup. Code never checks tier directly.
Methods:
  ResolveContextAsync(requestContext) → TenantIsolationContext
  BindTenantAsync(tenantId, tier) → DataProcessResult<bool>
  EnforceIsolationAsync(query, tenantCtx) → DataProcessResult<ScopedQuery>
  ProvisionTenantAsync(tenantSpec) → DataProcessResult<TenantRef>  [T92 uses this]

---

## NEW FACTORY FAMILIES SUMMARY (F244–F285)

| Family | Name | Factories | Fabric Resolution |
|--------|------|-----------|------------------|
| 27 | Finance Master Data | F244–F250 (7) | DB/ES + Queue |
| 28 | Accounts Payable | F251–F257 (7) | DB/PG + Queue (DLQ) |
| 29 | Accounts Receivable | F258–F264 (7) | DB/PG + Queue |
| 30 | Cash & Treasury | F265–F271 (7) | Bank Fabric + DB/PG + Queue |
| 31 | Asset & Controlling | F272–F277 (6) | DB/PG + AI Engine |
| 32 | Compliance, Audit & MT | F278–F285 (8) | MT Fabric + DB/ES + Queue |
**Total: 42 new factory interfaces (F244–F285)**

---

## NEW TASK TYPES SUMMARY (T83–T92)

| Task | Name | Archetype | Finance Flow |
|------|------|-----------|-------------|
| T83 | Durable Saga Entry Gate | DURABLE_SAGA (NEW) | All finance flows |
| T84 | Three-Way Match Gate | VALIDATION | P2P |
| T85 | Human Approval Gate | HUMAN_GATE (NEW) | P2P, O2C, R2R, P2Profit |
| T86 | Period Close Orchestrator | ORCHESTRATION | R2R |
| T87 | Subledger-GL Sync Gate | VALIDATION | R2R |
| T88 | Payment Run Gate | ORCHESTRATION | Treasury |
| T89 | Double-Entry Validation Gate | VALIDATION | All finance flows |
| T90 | Revenue Recognition Gate | VALIDATION | O2C |
| T91 | Project Milestone Billing Gate | ORCHESTRATION | P2Profit |
| T92 | Tenant Provision Gate | PROVISIONING (NEW) | Multi-tenant onboarding |
**Total: 10 new task types (T83–T92), 4 new archetypes**

---

## FLOW TEMPLATES SUMMARY (Templates 18–22)

| Template | Flow | Key Steps |
|----------|------|-----------|
| 18 | fin-procure-to-pay-v1 | T83→T84→T85→T89→T88 |
| 19 | fin-order-to-cash-v1 | T83→T90→T85→T89 |
| 20 | fin-record-to-report-v1 | T87→T86→T89 |
| 21 | fin-project-to-profit-v1 | T83→T91→T85→T90→T89 |
| 22 | fin-treasury-cash-v1 | T83→T88→T89 |

---

## BFA CONFLICT RULES SUMMARY (CF-64–CF-82, 19 rules)

Categories:
  CF-64–CF-68: Finance-internal (P2P vs R2R, period lock priority over posting)
  CF-69–CF-72: Finance vs prior flows (FLOW-01–07 entity/event conflicts)
  CF-73–CF-76: Multi-tenant isolation (cross-tenant journal bleed, cross-tenant period lock)
  CF-77–CF-82: SoD conflicts (dual-role detection in approval chains)

---

## SKILL PATTERNS SUMMARY (SK-29–SK-38)

| SK | Pattern | Used By |
|----|---------|---------|
| SK-29 | Durable Saga Pattern (EP-4) | T83, T85, T86 |
| SK-30 | Period Lock Enforcement (EP-5) | T86, T87, T89 |
| SK-31 | Three-Way Match Implementation | T84 |
| SK-32 | Double-Entry Journal Guard | T89 |
| SK-33 | Multi-Tenant Context Propagation (DNA-9) | T92, all finance |
| SK-34 | Bank Statement Correlation | T88 |
| SK-35 | Idempotency Key Manager | T83, T88, T89 |
| SK-36 | SoD Policy Enforcement (DNA-9) | T85, T86, T88 |
| SK-37 | Subledger-GL Sync Pattern | T87 |
| SK-38 | Fiscal Calendar Resolver | T86, T90 |

---

## SYSTEM TOTALS AFTER FLOW-08

| Metric | Pre-FLOW-08 | Post-FLOW-08 | Delta |
|--------|-------------|--------------|-------|
| Factory interfaces | 243 | 285 | +42 |
| Factory families | 26 | 32 | +6 |
| Task types | 82 | 92 | +10 |
| Flow templates | 17 | 22 | +5 |
| BFA conflict rules | 63 | 82 | +19 |
| Stress tests | 30 | 42 | +12 |
| Design records | 20 | 28 | +8 |
| Design decisions | 20 | 30 | +10 |
| Skill patterns | 28 | 38 | +10 |
| DNA patterns | 8 | 9 | +1 (DNA-9 SoD) |
| Engine primitives | 3 | 5 | +2 (EP-4, EP-5) |
| Fabric layers | 6 | 8 | +2 (Bank, MT Isolation) |
| New archetypes | — | 4 | DURABLE_SAGA, HUMAN_GATE, PROVISIONING + existing |
| Iron rules (FLOW-08) | — | 80 | +80 (8 per task type × 10) |
| Quality gates (FLOW-08) | — | 60 | +60 (6 per task type × 10) |
| AF station cells (FLOW-08) | — | 110 | +110 (11 × 10) |

---

## RECOVERY COMMANDS

```
"Show FLOW-08 plan"          → This file (FLOW08_MASTER_PLAN.md)
"Start FLOW-08 Phase 1"      → Generate FLOW08_P1_ENGINE_EXTENSIONS.md
"Start FLOW-08 Phase 2"      → Generate FLOW08_P2_FACTORIES.md
"Start FLOW-08 Phase 3"      → Generate FLOW08_P3_TASK_TYPES.md
"Start FLOW-08 Phase 4"      → Generate FLOW08_P4_AF_TEMPLATES.md
"Start FLOW-08 Phase 5"      → Generate FLOW08_P5_BFA.md
"Start FLOW-08 Phase 6"      → Generate FLOW08_P6_INDEX_SKILLS.md
"Start FLOW-08 Phase 7"      → Generate FLOW08_VALIDATION.md + SESSION_STATE_FINAL.md
"Show FLOW-08 state"         → This file (recovery section)
"Validate FLOW-08 plan"      → Section: VALIDATION: DOES THE PLAN COVER ALL REQUIREMENTS?
```

---

## WHAT IS NEW TO THE ENGINE (FIRST-TIME CAPABILITIES IN FLOW-08)

| Capability | Artifact | Why First |
|-----------|----------|-----------|
| Durable wait states (days-long) | EP-4, T83, T85 | All prior flows were sub-second event-driven |
| Human approval as first-class step | T85, EP-4 | Prior flows: no human-in-the-loop blocking step |
| Period lock per tenant/entity/ledger | EP-5, T86 | No prior flow had time-scoped write prevention |
| Compensation-based error handling | EP-4, SK-35 | Prior flows used queue retry/DLQ, not saga compensation |
| Bank connectivity as swappable fabric | Skill 10, Bank Fabric | First external financial institution integration |
| Multi-tenant isolation as engine primitive | Skill 11, MT Fabric, T92 | Prior flows assumed single-tenant context |
| SoD enforcement at engine level | DNA-9, AF-7 | Prior DNA checked code patterns, not identity roles |
| Immutable audit trail (tamper-evident) | EP-4 saga journal, T89 | Prior flows had logging; not cryptographically ordered |
| Double-entry balance validation gate | T89 | No prior flow had accounting invariant as task type |
| 3 new task archetypes | DURABLE_SAGA, HUMAN_GATE, PROVISIONING | Prior: EVENT, ORCHESTRATION, VALIDATION, SCHEDULED only |

---
## PLAN STATUS: COMPLETE ✅
## NEXT ACTION: "Start FLOW-08 Phase 1"
---
