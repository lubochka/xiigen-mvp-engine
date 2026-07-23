# 13-finance_SKILLS_FACTORY_RAG
## XIIGen Engine — FLOW-13 Finance Skill Patterns: SK-44–SK-53
## Save Point: P4-SKILLS | Status: COMPLETE ✅
## Extends: SK-1–SK-43 | Adds: SK-44–SK-53 (10 finance skill patterns)
## Used by: AF-4 (RAG — Task Context) to search reusable finance patterns

---

## RAG STRATEGY FOR FLOW-13

All SK-44–SK-53 patterns are indexed by AF-4 (RAG station) using HYBRID strategy
(keyword + semantic). When AF-1 (Genesis) generates a finance service, AF-4 retrieves
the relevant SK pattern and injects it into the generation context.

```
Retrieval triggers:
  "three-way match"       → SK-46
  "durable saga"          → SK-44
  "period lock"           → SK-47
  "double-entry"          → SK-48
  "multi-tenant finance"  → SK-51
  "bank statement"        → SK-49
  "idempotency"           → SK-50
  "SoD"/"segregation"     → SK-51
  "subledger"/"GL sync"   → SK-52
  "fiscal calendar"       → SK-53
  "revenue recognition"   → SK-47 + SK-53
```

---

## SK-44: Finance Durable Saga Entry Pattern

**Purpose:** Entry pattern for long-running finance sagas using EP-4. Registers saga with
period check, quota check, and SoD role registration before proceeding.

**Primary Implementation (.NET 9):**
```csharp
// SKILL: Finance Durable Saga Entry
// ALL document access via Dictionary<string,object> — no typed models (DNA-1)
// ALL returns via DataProcessResult<T> — never throw (DNA-3)
// ALL services via factory CreateAsync() — never new() (DNA-4)

public class FinanceSagaEntryService : MicroserviceBase
{
    public async Task<DataProcessResult<Dictionary<string,object>>> StartSagaAsync(
        string tenantId, string legalEntityId, string ledgerId,
        string fiscalPeriod, string flowType, string documentId, Dictionary<string,object> initiatorCtx)
    {
        // 1. Quota check (F329) — fail fast before any saga creation
        var quotaResult = await _quotaFactory.CreateAsync(ctx)
            .Then(s => s.CheckQuotaAsync(tenantId, flowType, 1));
        if (!quotaResult.IsSuccess) return DataProcessResult<Dictionary>.Failure("QUOTA_EXCEEDED");

        // 2. Period open check (F290 → EP-5)
        var periodResult = await _calendarFactory.CreateAsync(ctx)
            .Then(s => s.IsPeriodOpenAsync(tenantId, legalEntityId, ledgerId, fiscalPeriod));
        if (!periodResult.IsSuccess || !periodResult.Data)
            return DataProcessResult<Dictionary>.Failure("PERIOD_NOT_OPEN");

        // 3. Tenant provisioned check (F328)
        var tenantConfig = await _tenantFactory.CreateAsync(ctx)
            .Then(s => s.GetTenantFinanceConfigAsync(tenantId));
        if (!tenantConfig.IsSuccess) return DataProcessResult<Dictionary>.Failure("TENANT_NOT_PROVISIONED");

        // 4. SoD — register initiator role (F323)
        var initiatorId = (string)initiatorCtx["actor_id"];
        var sodResult = await _sodFactory.CreateAsync(ctx)
            .Then(s => s.RegisterRoleAssignmentAsync(tenantId, initiatorId, "INITIATOR", documentId));

        // 5. Build idempotency key
        var idempotencyKey = $"{tenantId}.{flowType}.{documentId}.v1";

        // 6. Create EP-4 saga (DATABASE FABRIC)
        var sagaDoc = new Dictionary<string,object>
        {
            ["saga_id"] = idempotencyKey,
            ["tenant_id"] = tenantId,
            ["legal_entity_id"] = legalEntityId,
            ["ledger_id"] = ledgerId,
            ["fiscal_period"] = fiscalPeriod,
            ["flow_type"] = flowType,
            ["document_id"] = documentId,
            ["state"] = "INITIATED",
            ["initiator_id"] = initiatorId,
            ["created_at"] = DateTime.UtcNow,
            ["isolation_tier"] = tenantConfig.Data["isolation_tier"]
        };

        var filter = BuildSearchFilter(new { saga_id = idempotencyKey });
        // Idempotency: check if saga already exists
        var existingResult = await _dbService.SearchDocuments("finance_sagas", filter);
        if (existingResult.IsSuccess && existingResult.Data.Any())
            return DataProcessResult<Dictionary>.Success(existingResult.Data.First());

        return await _dbService.StoreDocument("finance_sagas", sagaDoc);
    }
}
```

**Five Language Alternatives:**
- Node.js: `async startSaga(tenantId, legalEntityId, ledgerId, period, flowType, docId, ctx)`
  Uses saga-service through factory. Returns `{success, data, error}` pattern.
- Python: `async def start_saga(tenant_id, legal_entity_id, ledger_id, period, flow_type, doc_id, ctx)`
  All dicts, no dataclasses. Returns `DataProcessResult` equivalent.
- Java: `CompletableFuture<DataProcessResult<Map<String,Object>>> startSagaAsync(...)`
  All Maps, no entity classes.
- Rust: `async fn start_saga(...) -> Result<HashMap<String, Value>, FinanceError>`
- PHP: `public function startSaga(string $tenantId, ...) : DataProcessResult`

**Used by:** T103, T108 (payment run saga entry)
**References:** EP-4 (Durable Saga Runtime), F290, F323, F328, F329

---

## SK-45: Finance Human Approval Wait State Pattern

**Purpose:** EP-4 wait state pattern for human approvals in finance workflows.
Pause saga, emit event, wait for external signal, validate SoD on resume.

**Primary Implementation (.NET 9):**
```csharp
// SKILL: Finance Human Approval Wait State
// Extends EP-4 wait state with finance-specific SoD enforcement

public class FinanceApprovalGateService : MicroserviceBase
{
    public async Task<DataProcessResult<Dictionary<string,object>>> RequestApprovalAsync(
        string tenantId, string sagaId, string documentId, string documentType,
        string initiatorId, Dictionary<string,object> approvalConfig)
    {
        // 1. Update saga state to WAITING_APPROVAL in EP-4
        var sagaUpdate = new Dictionary<string,object>
        {
            ["state"] = "WAITING_APPROVAL",
            ["approval_requested_at"] = DateTime.UtcNow,
            ["initiator_id"] = initiatorId,
            ["document_type"] = documentType,
            ["timeout_hours"] = approvalConfig["timeout_hours"] // FREEDOM config
        };
        await _dbService.StoreDocument($"finance_sagas/{sagaId}", sagaUpdate);

        // 2. Emit approval.requested event to QUEUE FABRIC (never direct HTTP)
        var approvalEvent = new Dictionary<string,object>
        {
            ["event_type"] = "approval.requested",
            ["tenant_id"] = tenantId,
            ["saga_id"] = sagaId,
            ["document_id"] = documentId,
            ["document_type"] = documentType,
            ["flow_id"] = sagaUpdate["flow_id"],
            ["correlation_id"] = $"{tenantId}.{sagaId}.approval",
            ["timestamp_utc"] = DateTime.UtcNow
        };
        await _queueService.EnqueueAsync($"finance.approval.{documentType}.{tenantId}", approvalEvent);

        return DataProcessResult<Dictionary>.Success(sagaUpdate);
    }

    public async Task<DataProcessResult<Dictionary<string,object>>> ProcessApprovalDecisionAsync(
        string tenantId, string sagaId, string approverId, string decision,
        Dictionary<string,object> actorCtx)
    {
        // 1. Load saga — get initiator_id for SoD check
        var sagaResult = await _dbService.SearchDocuments("finance_sagas",
            BuildSearchFilter(new { saga_id = sagaId, tenant_id = tenantId }));
        var saga = sagaResult.Data.First();
        var initiatorId = (string)saga["initiator_id"];

        // 2. SoD validation — approver MUST NOT equal initiator (DNA-9 IR-105-2)
        if (approverId == initiatorId)
        {
            await _sodFactory.CreateAsync(ctx)
                .Then(s => s.DetectConflictsAsync(tenantId, approverId, "APPROVER", (string)saga["document_id"]));
            return DataProcessResult<Dictionary>.Failure("SOD_VIOLATION: approver == initiator");
        }

        // 3. Write audit record BEFORE resuming saga (IR-105-4)
        var auditDoc = new Dictionary<string,object>
        {
            ["actor_id"] = approverId,
            ["decision"] = decision,
            ["timestamp_utc"] = DateTime.UtcNow,
            ["saga_id"] = sagaId,
            ["document_id"] = saga["document_id"],
            ["tenant_id"] = tenantId
        };
        await _auditFactory.CreateAsync(ctx).Then(s => s.WriteAuditRecordAsync(tenantId, (string)saga["legal_entity_id"], auditDoc));

        // 4. Resume saga (update EP-4 state)
        var resumeState = decision == "APPROVED" ? "APPROVAL_GRANTED" : "APPROVAL_REJECTED";
        var stateUpdate = new Dictionary<string,object>
        {
            ["state"] = resumeState,
            ["approver_id"] = approverId,
            ["decision"] = decision,
            ["decided_at"] = DateTime.UtcNow
        };
        return await _dbService.StoreDocument($"finance_sagas/{sagaId}", stateUpdate);
    }
}
```

**Used by:** T105, T106 (close approval step), T108 (payment approval)
**References:** EP-4, F301, F315, F323, F322, DNA-9

---

## SK-46: Three-Way Match Implementation Pattern

**Purpose:** Core algorithm for P2P three-way match (PO ↔ GR ↔ Invoice).
Tolerance thresholds from FREEDOM config. Exception routing to DLQ.

**Primary Implementation (.NET 9):**
```csharp
// SKILL: Three-Way Match
// Tolerance from FREEDOM config (DR-34) — never hardcoded
// Partial receipts ALWAYS route to exception — never auto-approved (IR-104-7)

public class ThreeWayMatchService : MicroserviceBase
{
    public async Task<DataProcessResult<Dictionary<string,object>>> RunMatchAsync(
        string tenantId, string legalEntityId, string invoiceId)
    {
        // 1. Fetch all three documents via fabric interfaces (all as Dictionary)
        var filter = BuildSearchFilter(new { invoice_id = invoiceId, tenant_id = tenantId, legal_entity_id = legalEntityId });
        var invoiceResult = await _invoiceFactory.CreateAsync(ctx).Then(s => s.GetInvoiceAsync(tenantId, legalEntityId, invoiceId));
        var invoice = invoiceResult.Data; // Dictionary<string,object>

        var poResult = await _poFactory.CreateAsync(ctx)
            .Then(s => s.GetPOAsync(tenantId, legalEntityId, (string)invoice["po_id"]));
        var grResult = await _grFactory.CreateAsync(ctx)
            .Then(s => s.SearchReceiptsForPOAsync(tenantId, legalEntityId, (string)invoice["po_id"]));

        if (!poResult.IsSuccess || !grResult.IsSuccess)
            return DataProcessResult<Dictionary>.Failure("PREREQUISITE_DOCUMENTS_MISSING");

        var po = poResult.Data;
        var gr = grResult.Data.FirstOrDefault();

        // 2. Fetch tolerance from FREEDOM config (DR-34) — never hardcoded
        var tolerance = await _config.GetAsync<decimal>($"finance.match.price_tolerance.{tenantId}");

        // 3. Compare quantities
        var invoiceQty = Convert.ToDecimal(invoice["quantity"]);
        var grQty = gr != null ? Convert.ToDecimal(gr["quantity_received"]) : 0m;
        var poQty = Convert.ToDecimal(po["quantity_ordered"]);

        // Partial receipt detection — ALWAYS exception (IR-104-7)
        if (grQty < poQty)
        {
            return await RouteToExceptionAsync(tenantId, legalEntityId, invoiceId,
                "PARTIAL_RECEIPT", invoiceResult.Data, po, gr, correlation: $"{tenantId}.{invoiceId}.match");
        }

        // 4. Compare prices
        var invoicePrice = Convert.ToDecimal(invoice["unit_price"]);
        var poPrice = Convert.ToDecimal(po["unit_price"]);
        var priceDelta = Math.Abs(invoicePrice - poPrice) / poPrice;

        if (priceDelta > tolerance)
        {
            return await RouteToExceptionAsync(tenantId, legalEntityId, invoiceId,
                "PRICE_VARIANCE", invoiceResult.Data, po, gr, correlation: $"{tenantId}.{invoiceId}.match");
        }

        // 5. Match passed — update invoice status (append-only result doc)
        var matchResult = new Dictionary<string,object>
        {
            ["match_id"] = $"{tenantId}.{invoiceId}.matchresult",
            ["invoice_id"] = invoiceId,
            ["po_id"] = invoice["po_id"],
            ["gr_id"] = gr?["receipt_id"],
            ["status"] = "MATCHED",
            ["price_delta_pct"] = priceDelta,
            ["tenant_id"] = tenantId,
            ["legal_entity_id"] = legalEntityId,
            ["matched_at"] = DateTime.UtcNow,
            ["correlation_id"] = $"{tenantId}.{invoiceId}.match"
        };
        return await _dbService.StoreDocument("finance_match_results", matchResult);
    }

    private async Task<DataProcessResult<Dictionary<string,object>>> RouteToExceptionAsync(
        string tenantId, string legalEntityId, string invoiceId, string exceptionType,
        Dictionary<string,object> invoice, Dictionary<string,object> po, Dictionary<string,object> gr,
        string correlation)
    {
        var exceptionDoc = new Dictionary<string,object>
        {
            ["exception_id"] = $"{tenantId}.{invoiceId}.exception",
            ["exception_type"] = exceptionType,
            ["invoice_id"] = invoiceId,
            ["po_id"] = invoice["po_id"],
            ["gr_id"] = gr?["receipt_id"],
            ["correlation_id"] = correlation,
            ["tenant_id"] = tenantId,
            ["legal_entity_id"] = legalEntityId,
            ["created_at"] = DateTime.UtcNow
        };
        // Store exception + route to DLQ via QUEUE FABRIC (never direct HTTP — IR-104-4)
        await _exceptionFactory.CreateAsync(ctx).Then(s => s.CreateExceptionAsync(tenantId, legalEntityId, exceptionDoc));
        await _queueService.EnqueueAsync($"finance.match.exception.{tenantId}", exceptionDoc);
        return DataProcessResult<Dictionary>.Failure(exceptionType, exceptionDoc);
    }
}
```

**Used by:** T104
**References:** F295, F296, F297, F298, DR-34

---

## SK-47: Period Lock Enforcement Pattern

**Purpose:** Check EP-5 period lock state before any posting operation.
Works with IFiscalCalendarService (F290) which bridges to EP-5.

**Primary Implementation (.NET 9):**
```csharp
// SKILL: Period Lock Enforcement
// ALWAYS call this before any posting. Never bypass EP-5.

public static class PeriodLockGuard
{
    public static async Task<DataProcessResult<bool>> AssertPeriodOpenAsync(
        IFiscalCalendarService calendarService,
        string tenantId, string legalEntityId, string ledgerId, string fiscalPeriod)
    {
        var result = await calendarService.IsPeriodOpenAsync(tenantId, legalEntityId, ledgerId, fiscalPeriod);
        if (!result.IsSuccess)
            return DataProcessResult<bool>.Failure("PERIOD_CHECK_FAILED");

        if (!result.Data)
            return DataProcessResult<bool>.Failure("PERIOD_NOT_OPEN",
                new Dictionary<string,object>
                {
                    ["tenant_id"] = tenantId,
                    ["legal_entity_id"] = legalEntityId,
                    ["ledger_id"] = ledgerId,
                    ["fiscal_period"] = fiscalPeriod,
                    ["reason"] = "CLOSED_LOCKED_OR_CLOSING"
                });

        return DataProcessResult<bool>.Success(true);
    }
}

// Usage pattern in any posting service:
// var periodCheck = await PeriodLockGuard.AssertPeriodOpenAsync(calendarService, tenantId, entityId, ledgerId, period);
// if (!periodCheck.IsSuccess) return DataProcessResult<T>.FromFailure(periodCheck);
// ... proceed with posting ...
```

**Used by:** T103, T104, T106, T107, T108, T109, T110, T111
**References:** EP-5 (Period Lock Registry), F290

---

## SK-48: Double-Entry Journal Guard Pattern

**Purpose:** Validate debit=credit balance, account validity, and period open
before any GL posting. Used as pre-flight by all finance flow posting steps.

**Primary Implementation (.NET 9):**
```csharp
// SKILL: Double-Entry Journal Guard
// Zero tolerance: debit MUST equal credit in base currency (IR-109-1)

public class DoubleEntryValidationService : MicroserviceBase
{
    public async Task<DataProcessResult<Dictionary<string,object>>> ValidateJournalEntryAsync(
        string tenantId, string legalEntityId, string ledgerId, string fiscalPeriod,
        List<Dictionary<string,object>> journalLines)
    {
        // 1. Period open check (SK-47)
        var calendarService = await _calendarFactory.CreateAsync(ctx).Result;
        var periodCheck = await PeriodLockGuard.AssertPeriodOpenAsync(calendarService,
            tenantId, legalEntityId, ledgerId, fiscalPeriod);
        if (!periodCheck.IsSuccess) return DataProcessResult<Dictionary>.FromFailure(periodCheck);

        // 2. Validate account codes (F288 — never cache account validity)
        var accountService = await _accountFactory.CreateAsync(ctx).Result;
        foreach (var line in journalLines)
        {
            var acctCode = (string)line["account_code"];
            var postingType = (string)line["posting_type"];
            var acctCheck = await accountService.ValidateAccountAsync(tenantId, legalEntityId, acctCode, postingType);
            if (!acctCheck.IsSuccess || !acctCheck.Data)
                return DataProcessResult<Dictionary>.Failure($"INVALID_ACCOUNT: {acctCode}");
        }

        // 3. Debit/Credit balance check — zero tolerance base currency (IR-109-1)
        var debits = journalLines.Where(l => (string)l["line_type"] == "DEBIT")
                                 .Sum(l => Convert.ToDecimal(l["amount_base_currency"]));
        var credits = journalLines.Where(l => (string)l["line_type"] == "CREDIT")
                                  .Sum(l => Convert.ToDecimal(l["amount_base_currency"]));

        if (debits != credits)
            return DataProcessResult<Dictionary>.Failure("UNBALANCED_JOURNAL",
                new Dictionary<string,object>
                {
                    ["debit_total"] = debits,
                    ["credit_total"] = credits,
                    ["delta"] = debits - credits
                });

        // 4. Write pre-flight audit record (F322) BEFORE posting (IR-109-8)
        var auditDoc = new Dictionary<string,object>
        {
            ["audit_type"] = "JOURNAL_VALIDATION",
            ["line_count"] = journalLines.Count,
            ["debit_total"] = debits,
            ["credit_total"] = credits,
            ["validated_at"] = DateTime.UtcNow,
            ["tenant_id"] = tenantId,
            ["legal_entity_id"] = legalEntityId,
            ["ledger_id"] = ledgerId,
            ["fiscal_period"] = fiscalPeriod
        };
        await _auditFactory.CreateAsync(ctx).Then(s => s.WriteAuditRecordAsync(tenantId, legalEntityId, auditDoc));

        return DataProcessResult<Dictionary>.Success(new Dictionary<string,object>
        {
            ["validation_status"] = "BALANCED",
            ["debit_total"] = debits,
            ["credit_total"] = credits,
            ["line_count"] = journalLines.Count
        });
    }
}
```

**Used by:** T109 (primary), all finance flows with GL posting step
**References:** F288, F290, F322, EP-5

---

## SK-49: Bank Statement Correlation Pattern

**Purpose:** Correlate bank statement lines to payment records using BANK CONNECTIVITY
FABRIC (Skill 10). Idempotent. Never direct bank API calls.

**Primary Implementation (.NET 9):**
```csharp
// SKILL: Bank Statement Correlation
// BANK CONNECTIVITY FABRIC always — never direct bank SDK (DR-33)

public class BankStatementCorrelationService : MicroserviceBase
{
    public async Task<DataProcessResult<Dictionary<string,object>>> CorrelateStatementAsync(
        string tenantId, string legalEntityId, string bankAccountId, Dictionary<string,object> statementDoc)
    {
        // 1. Ingest via BANK CONNECTIVITY FABRIC (Skill 10) — not raw file parsing
        var bankService = await _bankFactory.CreateAsync(ctx).Result; // IBankConnectorService
        var ingestResult = await bankService.IngestStatementAsync(tenantId, legalEntityId, bankAccountId, statementDoc);
        if (!ingestResult.IsSuccess) return DataProcessResult<Dictionary>.FromFailure(ingestResult);

        // 2. Store statement lines via DATABASE FABRIC (Elasticsearch)
        var statementLines = (List<Dictionary<string,object>>)ingestResult.Data["lines"];
        var storeResults = new List<Dictionary<string,object>>();

        foreach (var line in statementLines)
        {
            line["tenant_id"] = tenantId;
            line["legal_entity_id"] = legalEntityId;
            line["bank_account_id"] = bankAccountId;
            line["ingested_at"] = DateTime.UtcNow;
            // Idempotency: line_reference is the natural key
            var existing = await _dbService.SearchDocuments("bank_statement_lines",
                BuildSearchFilter(new { line_reference = line["line_reference"], bank_account_id = bankAccountId, tenant_id = tenantId }));
            if (!existing.Data.Any())
                storeResults.Add((await _dbService.StoreDocument("bank_statement_lines", line)).Data);
        }

        // 3. Correlation — match each line to a payment record
        var correlations = new List<Dictionary<string,object>>();
        foreach (var line in storeResults)
        {
            var matchedPayment = await _dbService.SearchDocuments("finance_payments",
                BuildSearchFilter(new
                {
                    bank_reference = line["bank_reference"],
                    amount = line["amount"],
                    tenant_id = tenantId,
                    legal_entity_id = legalEntityId
                }));
            if (matchedPayment.IsSuccess && matchedPayment.Data.Any())
            {
                correlations.Add(new Dictionary<string,object>
                {
                    ["line_id"] = line["line_id"],
                    ["payment_id"] = matchedPayment.Data.First()["payment_id"],
                    ["status"] = "MATCHED",
                    ["tenant_id"] = tenantId
                });
            }
        }

        return DataProcessResult<Dictionary>.Success(new Dictionary<string,object>
        {
            ["lines_ingested"] = storeResults.Count,
            ["lines_correlated"] = correlations.Count,
            ["correlations"] = correlations
        });
    }
}
```

**Used by:** T108, F309, F312
**References:** BANK CONNECTIVITY FABRIC (Skill 10), DR-33, F309, F312

---

## SK-50: Idempotency Key Manager Pattern

**Purpose:** Generate, validate, and enforce idempotency keys for finance operations.
Prevents duplicate postings, duplicate payments, and duplicate saga creation.

**Primary Implementation (.NET 9):**
```csharp
// SKILL: Idempotency Key Manager
// Format: tenant_id.operation_type.document_id.v{version}

public static class IdempotencyKeyManager
{
    public static string GenerateKey(string tenantId, string operationType, string documentId, int version = 1)
        => $"{tenantId}.{operationType}.{documentId}.v{version}";

    public static async Task<DataProcessResult<T>> ExecuteIdempotentAsync<T>(
        IDatabaseService dbService,
        string idempotencyKey,
        string collectionName,
        Func<Task<DataProcessResult<T>>> operation)
    {
        // Check for existing result
        var existing = await dbService.SearchDocuments(collectionName,
            BuildSearchFilter(new { idempotency_key = idempotencyKey }));

        if (existing.IsSuccess && existing.Data.Any())
        {
            // Return existing result — idempotent (same key = same result)
            return DataProcessResult<T>.Success(
                (T)(object)existing.Data.First());
        }

        // Execute operation — store result with idempotency key
        var result = await operation();
        if (result.IsSuccess)
        {
            var doc = new Dictionary<string,object>
            {
                ["idempotency_key"] = idempotencyKey,
                ["result"] = result.Data,
                ["created_at"] = DateTime.UtcNow
            };
            await dbService.StoreDocument(collectionName, doc);
        }
        return result;
    }
}
```

**Used by:** T103, T108, T109, F310
**References:** EP-4 (Durable Saga idempotency), CF-98, CF-102

---

## SK-51: SoD Policy Enforcement Pattern

**Purpose:** Enforce Segregation of Duties (DNA-9) at runtime. Register roles,
detect conflicts, emit violation events. Used by AF-7 (Compliance station).

**Primary Implementation (.NET 9):**
```csharp
// SKILL: SoD Policy Enforcement (DNA-9)
// Called by AF-7 (Compliance) on every finance task type

public class SoDEnforcementService : MicroserviceBase
{
    // Finance SoD role matrix — sourced from FREEDOM config
    private static readonly Dictionary<string, string[]> ConflictingRoles = new()
    {
        ["INITIATOR"] = new[] { "APPROVER", "GL_POSTER", "RECONCILER" },
        ["APPROVER"]  = new[] { "INITIATOR", "GL_POSTER" },
        ["GL_POSTER"] = new[] { "INITIATOR", "APPROVER" },
        ["RECONCILER"] = new[] { "INITIATOR", "GL_POSTER" }
    };

    public async Task<DataProcessResult<Dictionary<string,object>>> ValidateSoDAsync(
        string tenantId, string documentId, Dictionary<string,object> actorRoles)
    {
        var violations = new List<Dictionary<string,object>>();

        foreach (var entry in actorRoles)
        {
            var actorId = entry.Key;
            var role = (string)entry.Value;

            // Check if this actor has a conflicting role on this document
            var existingRoles = await _dbService.SearchDocuments("finance_role_assignments",
                BuildSearchFilter(new { tenant_id = tenantId, actor_id = actorId, document_id = documentId }));

            if (existingRoles.IsSuccess)
            {
                foreach (var existingAssignment in existingRoles.Data)
                {
                    var existingRole = (string)existingAssignment["role"];
                    if (ConflictingRoles.ContainsKey(role) && ConflictingRoles[role].Contains(existingRole))
                    {
                        violations.Add(new Dictionary<string,object>
                        {
                            ["actor_id"] = actorId,
                            ["conflicting_role"] = existingRole,
                            ["requested_role"] = role,
                            ["document_id"] = documentId,
                            ["tenant_id"] = tenantId,
                            ["detected_at"] = DateTime.UtcNow
                        });
                    }
                }
            }
        }

        if (violations.Any())
        {
            // Emit SOD violation event to QUEUE FABRIC
            foreach (var v in violations)
                await _queueService.EnqueueAsync($"finance.sod.violation.{tenantId}", v);

            return DataProcessResult<Dictionary>.Failure("SOD_VIOLATIONS_DETECTED",
                new Dictionary<string,object> { ["violations"] = violations });
        }

        return DataProcessResult<Dictionary>.Success(new Dictionary<string,object>
        {
            ["status"] = "SOD_VALID",
            ["document_id"] = documentId,
            ["tenant_id"] = tenantId
        });
    }
}
```

**Used by:** T103, T104, T105, T106, T108, T112 — AF-7 on all finance task types
**References:** DNA-9, CF-111, F323

---

## SK-52: Subledger-GL Sync Pattern

**Purpose:** Compare AP/AR subledger balances to GL control accounts.
Surface delta amounts. Gate period lock on sync result.

**Primary Implementation (.NET 9):**
```csharp
// SKILL: Subledger-GL Sync
// Runs as part of period close (T106) and on-demand (T107)

public class SubledgerGLSyncService : MicroserviceBase
{
    public async Task<DataProcessResult<Dictionary<string,object>>> SyncSubledgerToGLAsync(
        string tenantId, string legalEntityId, string ledgerId, string fiscalPeriod,
        string subledgerType) // "AP" or "AR"
    {
        // 1. Get subledger balance (PostgreSQL via DATABASE FABRIC)
        var subledgerTotal = subledgerType == "AP"
            ? await _apReconFactory.CreateAsync(ctx).Then(s => s.RunSubledgerGLSyncAsync(tenantId, legalEntityId, fiscalPeriod))
            : await _arReconFactory.CreateAsync(ctx).Then(s => s.RunSubledgerGLSyncAsync(tenantId, legalEntityId, fiscalPeriod));

        // 2. Get GL control account balance (Elasticsearch via DATABASE FABRIC)
        var controlAccountFilter = BuildSearchFilter(new
        {
            tenant_id = tenantId,
            legal_entity_id = legalEntityId,
            ledger_id = ledgerId,
            fiscal_period = fiscalPeriod,
            account_type = subledgerType == "AP" ? "AP_CONTROL" : "AR_CONTROL"
        });
        var glBalance = await _dbService.SearchDocuments("finance_gl_journals", controlAccountFilter);

        // 3. Calculate delta
        var subledgerAmount = (decimal)subledgerTotal.Data["total_balance"];
        var glAmount = glBalance.Data.Sum(d => Convert.ToDecimal(d["net_amount"]));
        var delta = Math.Abs(subledgerAmount - glAmount);

        // 4. Get threshold from FREEDOM config
        var threshold = await _config.GetAsync<decimal>($"finance.sync.gap_threshold.{subledgerType}.{tenantId}");

        var syncResult = new Dictionary<string,object>
        {
            ["subledger_type"] = subledgerType,
            ["subledger_balance"] = subledgerAmount,
            ["gl_balance"] = glAmount,
            ["delta"] = delta,
            ["threshold"] = threshold,
            ["status"] = delta <= threshold ? "IN_SYNC" : "GAP_DETECTED",
            ["tenant_id"] = tenantId,
            ["legal_entity_id"] = legalEntityId,
            ["ledger_id"] = ledgerId,
            ["fiscal_period"] = fiscalPeriod,
            ["synced_at"] = DateTime.UtcNow
        };

        // Write sync audit record (DR-29)
        await _auditFactory.CreateAsync(ctx).Then(s => s.WriteAuditRecordAsync(tenantId, legalEntityId, syncResult));

        if (delta > threshold)
            return DataProcessResult<Dictionary>.Failure("SYNC_GAP_EXCEEDS_THRESHOLD", syncResult);

        return DataProcessResult<Dictionary>.Success(syncResult);
    }
}
```

**Used by:** T107, T106 (close checklist step)
**References:** F300, F307, F322, CF-101

---

## SK-53: Fiscal Calendar Resolver Pattern

**Purpose:** Resolve fiscal period from calendar date. Check period open state.
Central utility for all finance services that need period context.

**Primary Implementation (.NET 9):**
```csharp
// SKILL: Fiscal Calendar Resolver
// Always resolves through IFiscalCalendarService (F290) — never hardcoded dates

public class FiscalCalendarResolver : MicroserviceBase
{
    public async Task<DataProcessResult<Dictionary<string,object>>> ResolvePeriodContextAsync(
        string tenantId, string legalEntityId, string ledgerId, DateTime transactionDate)
    {
        var calendarService = await _calendarFactory.CreateAsync(ctx).Result;

        // 1. Resolve period from date
        var periodResult = await calendarService.ResolvePeriodForDateAsync(tenantId, legalEntityId, transactionDate);
        if (!periodResult.IsSuccess)
            return DataProcessResult<Dictionary>.Failure("PERIOD_RESOLUTION_FAILED");

        var period = (string)periodResult.Data["fiscal_period"];
        var fiscalYear = (string)periodResult.Data["fiscal_year"];

        // 2. Check period state
        var isOpen = await calendarService.IsPeriodOpenAsync(tenantId, legalEntityId, ledgerId, period);

        return DataProcessResult<Dictionary>.Success(new Dictionary<string,object>
        {
            ["fiscal_period"] = period,
            ["fiscal_year"] = fiscalYear,
            ["ledger_id"] = ledgerId,
            ["legal_entity_id"] = legalEntityId,
            ["tenant_id"] = tenantId,
            ["is_open"] = isOpen.IsSuccess && isOpen.Data,
            ["period_state"] = isOpen.Data ? "OPEN" : "CLOSED_OR_LOCKED",
            ["resolved_at"] = DateTime.UtcNow
        });
    }
}
```

**Used by:** T106, T110, T111 — any finance operation that needs period context from a date
**References:** F290, EP-5, DR-30

---

## SKILLS SUMMARY — FLOW-13

| SK | Pattern | Primary Use | Task Types |
|----|---------|-------------|-----------|
| SK-44 | Finance Durable Saga Entry | EP-4 saga creation with period/quota/SoD checks | T103, T108 |
| SK-45 | Finance Human Approval Wait State | EP-4 wait + SoD enforcement on resume | T105, T106, T108 |
| SK-46 | Three-Way Match Implementation | P2P match algorithm + DLQ routing | T104 |
| SK-47 | Period Lock Enforcement | Pre-posting guard via EP-5 | T103–T112 (all) |
| SK-48 | Double-Entry Journal Guard | Debit=credit + account validity + audit | T109 |
| SK-49 | Bank Statement Correlation | Bank fabric ingestion + payment matching | T108, F309, F312 |
| SK-50 | Idempotency Key Manager | Duplicate-safe execution for all finance ops | T103, T108, T109 |
| SK-51 | SoD Policy Enforcement | DNA-9 runtime enforcement, violation events | T103–T112 (all) |
| SK-52 | Subledger-GL Sync | AP/AR subledger vs GL delta detection | T107, T106 |
| SK-53 | Fiscal Calendar Resolver | Date → fiscal period resolution | T106, T110, T111 |

## POST-FLOW-13 SKILLS TOTALS
```
Skill Patterns: SK-1–SK-53  (53 total, +10)
```

---
## SAVE POINT: P4-SKILLS ✅
## NEXT: 13-finance_UNIFIED_SOURCE_INDEX_F11.md + AF maps + templates
