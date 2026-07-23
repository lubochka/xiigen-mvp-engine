# FLOW-12 — ERP SYSTEMS ENGINE EXTENSION
## XIIGen Fabric-First Engine Contract
### Session: 2026-02-26 | Based on: 12_* docs + multi-tenant-support.md + SESSION_STATE_MERGE.md

---

## ═══════════════════════════════════════════════════
## PART A — NO-CODE EXPLANATION (READ FIRST)
## ═══════════════════════════════════════════════════

### What FLOW-12 Is

FLOW-12 teaches the XIIGen engine how to generate the fabric-first infrastructure needed to run ERP-class processes. This is NOT an ERP system. It is the engine learning to produce services that can connect to an ERP (like SAP Business One), synchronize master data, orchestrate multi-step financial document chains (Order-to-Cash, Procure-to-Pay, Record-to-Report), and enforce correctness rules that financial systems demand — all on top of existing fabric interfaces.

The six value streams FLOW-12 enables the engine to generate:

1. **Order-to-Cash (O2C)** — Quote → Sales Order → Delivery → A/R Invoice → Payment
2. **Procure-to-Pay (P2P)** — Purchase Request → PO → Goods Receipt → Vendor Invoice → Payment
3. **Record-to-Report (R2R)** — Period-end close: revalue → accrue → validate → seal
4. **Plan-to-Produce** — MRP demand → production order → component issue → receipt → cost rollup
5. **Service-to-Cash** — Service ticket → assign → parts/time → service invoice
6. **Project-to-Profit** — Project budget → purchases/timesheets → margin reporting

### Why This Is Different from Previous Flows

Previous flows (FLOW-01 through FLOW-09) generated services over internal data. FLOW-12 generates services that must:
- Connect to EXTERNAL systems (SAP B1 OData, monday.com GraphQL) through fabric abstractions
- Guarantee financial correctness (no double-posting, reversal-not-delete, period seal immutability)
- Support multi-tenant isolation down to separate DB schemas for regulated tenants
- Handle saga-pattern distributed workflows that can span hours or days
- Enforce RBAC separation of duties (draft vs. posted, clerk vs. finance_admin)

### The Engine Learns Six New Capabilities

| # | Capability | What It Enables |
|---|---|---|
| 1 | ERP Connector Fabric | Engine generates adapters for SAP OData (B1SESSION, OData v3/v4) and work platforms (GraphQL, OAuth 2.0) — both behind fabric interfaces |
| 2 | Document Chain Orchestration | Engine generates append-only document chains with chain integrity checks (no posting without predecessor) |
| 3 | Financial Ledger with Reversal Semantics | Engine generates WORM ledger services — never DELETE, always create reversal document |
| 4 | Saga Coordination | Engine generates durable multi-step workflows with compensation paths (idempotency + outbox + retry) |
| 5 | Three-Way Match Gate | Engine generates P2P validation gates that block AP Invoice posting until PO ↔ GR ↔ Invoice match is confirmed |
| 6 | Multi-Tenant ERP Isolation | Engine generates tenant-aware connection registries with per-tenant KEK encryption, RLS, and quota enforcement |

---

## ═══════════════════════════════════════════════════
## PART B — PHASE PLAN
## ═══════════════════════════════════════════════════

### CRITICAL: Number Correction from Session State

Session state shows FLOW-09 complete with F1-F287, T1-T102.
The draft spec (12_-_ERP_systems_deep_search_engine_multi_tenant.md) used F225-F240 and T72-T79.
Those numbers are TAKEN. FLOW-12 MUST use:

```
FACTORIES:    F288–F303  (16 new)
TASK TYPES:   T103–T110  (8 new)
FAMILY:       32
BFA RULES:    CF-96–CF-107  (12 new)
STRESS TESTS: ST-47–ST-53  (7 new)
TEMPLATE:     Template 20
```

### Phase Map (7 Phases + Appendix)

```
PHASE 0 — RAG Mini-Index         [~15 min] SAVE: state-P0
PHASE 1 — Factory Interfaces     [~30 min] SAVE: state-P1   (F288–F303)
PHASE 2 — Engine Contracts       [~40 min] SAVE: state-P2   (T103–T110)
PHASE 3 — AF Station Mapping     [~20 min] SAVE: state-P3
PHASE 4 — BFA Cross-Flow Rules   [~25 min] SAVE: state-P4   (CF-96–CF-107)
PHASE 5 — Multi-Tenant Layer     [~20 min] SAVE: state-P5
PHASE 6 — Flow Template DAG      [~25 min] SAVE: state-P6   (Template 20)
PHASE 7 — DNA Compliance + State [~15 min] SAVE: state-P7
APPENDIX  — +/- Examples         [reference]
```

Each phase: self-contained, produces a named artifact, can be resumed from checkpoint.

---

## ═══════════════════════════════════════════════════
## PART C — PLAN VALIDATION
## ═══════════════════════════════════════════════════

### Requirement Checklist

| Requirement from basic_prompt.txt | Covered by Phase | Status |
|---|---|---|
| New factory interfaces with CreateAsync() | Phase 1 | ✅ F288–F303, all 16 factories |
| FABRIC RESOLUTION declared for every factory | Phase 1 | ✅ Each factory maps to DB/Queue/AI/RAG fabric |
| Full engine contract format (not one-line stubs) | Phase 2 | ✅ T103–T110 with full 12-field format |
| AF station mapping for the new flow | Phase 3 | ✅ AF-1 through AF-11 mapped |
| BFA cross-flow validation | Phase 4 | ✅ CF-96–CF-107 against FLOW-01–09 |
| Flow template DAG (FlowOrchestrator JSON) | Phase 6 | ✅ Template 20 |
| Genie DNA compliance (all 6+ patterns) | Phase 7 | ✅ DNA-1 through DNA-9 |
| Backward compatibility (F1–F287, T1–T102 unchanged) | All phases | ✅ New ranges only |
| Multi-tenant support | Phase 5 | ✅ Per-tenant schema routing, KEK, RLS |
| Fabric-first UI (no platform-specific values) | Phase 6 | ✅ All UI config via FREEDOM layer |
| No direct provider imports | All phases | ✅ Iron Rules enforce this |
| Reversal-not-delete for financial docs | Phase 1 F295, Phase 2 T107 | ✅ |
| Idempotency keys on all state-changing ops | Phase 1 F294 | ✅ Iron Rule: BUILD FAILURE if absent |
| Saga compensation paths | Phase 1 F293, Phase 2 T103 | ✅ CompensateAsync → T107 |
| Webhook challenge-response verification | Phase 1 F297, Phase 2 T108 | ✅ Iron Rule: cannot bypass |
| Period close immutability | Phase 2 T106 | ✅ Iron Rule: reversal creates new period |
| WORM audit log | Phase 1 F301 | ✅ Every state change writes audit BEFORE return |
| ERP connector abstraction (SAP OData) | Phase 1 F288 | ✅ B1SESSION, OData v3/v4 abstracted |

---

## ═══════════════════════════════════════════════════
## PART D — POSITIVE / NEGATIVE EXAMPLES (for AF-9 Judge)
## ═══════════════════════════════════════════════════

### POSITIVE EXAMPLE — Correct FLOW-12 Service Pattern

```csharp
// ✅ CORRECT: Engine-generated ERP document chain step
public class ERPDocumentChainHandler : MicroserviceBase  // DNA-4: extends base
{
    private readonly IExternalServiceFactory<IDocumentChainService> _chainFactory;
    private readonly IExternalServiceFactory<IIdempotencyService> _idempotencyFactory;
    private readonly IExternalServiceFactory<IAuditLedgerService> _auditFactory;
    private readonly IExternalServiceFactory<IOutboxPublisherService> _outboxFactory;

    public async Task<DataProcessResult<Dictionary<string,object>>> CreateDocumentStep(  // DNA-3
        string tenantId,          // DNA-5: scope isolation
        string docType,
        string parentDocId,
        Dictionary<string,object> payload,  // DNA-1: no typed models
        string idempotencyKey)
    {
        // Check idempotency FIRST
        var idempotencyService = await _idempotencyFactory.CreateAsync(
            new FactoryResolutionContext { TenantId = tenantId });
        var idempotencyCheck = await idempotencyService.CheckOrCreateAsync(tenantId, idempotencyKey, payload.GetHashString());
        if (idempotencyCheck.Data?.IsReplay == true)
            return DataProcessResult<Dictionary<string,object>>.Success(idempotencyCheck.Data.CachedResult);

        // Resolve chain service through fabric — never import DocumentChainServicePostgres directly
        var chainService = await _chainFactory.CreateAsync(
            new FactoryResolutionContext { TenantId = tenantId });

        // Use BuildSearchFilter — DNA-2: empty fields auto-skipped
        var filters = ObjectProcessor.BuildSearchFilter(new Dictionary<string,object> {
            ["tenantId"] = tenantId,
            ["parentDocId"] = parentDocId,
            ["docType"] = docType
        });

        var result = await chainService.CreateDocumentAsync(tenantId, docType, parentDocId, payload, idempotencyKey);

        // Audit BEFORE returning — Iron Rule
        var auditService = await _auditFactory.CreateAsync(new FactoryResolutionContext { TenantId = tenantId });
        await auditService.WriteAuditAsync(tenantId, Context.ActorId, "CREATE_DOCUMENT", result.Data?["docId"]?.ToString(), payload);

        // Outbox in same logical unit
        var outboxService = await _outboxFactory.CreateAsync(new FactoryResolutionContext { TenantId = tenantId });
        await outboxService.WriteToOutboxAsync(tenantId, result.Data?["docId"]?.ToString(), "DocumentCreated", result.Data);

        return result;  // DNA-3: DataProcessResult, never throw
    }
}
```

### NEGATIVE EXAMPLE 1 — Direct Provider Import (BUILD FAILURE)

```csharp
// ❌ WRONG: Imports SAP SDK directly — violates fabric-first
using SAPBusiness1;  // BUILD FAILURE: no direct provider imports

public class ERPDocumentHandler
{
    private readonly B1Connection _sapConnection;  // BUILD FAILURE: typed ERP model

    public async Task<SalesOrder> CreateSalesOrder(SalesOrderDto dto)  // BUILD FAILURE: typed model, not Dictionary
    {
        var order = _sapConnection.SalesOrders.Add(dto);  // BUILD FAILURE: direct provider call
        order.Post();  // BUILD FAILURE: no idempotency key
        return order;  // BUILD FAILURE: typed return, not DataProcessResult
    }
}
```

### NEGATIVE EXAMPLE 2 — Delete on Posted Document (BUILD FAILURE)

```csharp
// ❌ WRONG: DELETE on posted financial document
public async Task CancelInvoice(string invoiceId)
{
    await _db.DeleteDocument(invoiceId);  // BUILD FAILURE: reversal-not-delete violated
    // Original audit trail destroyed, no reversal journal entry, no chain link
}

// ✅ CORRECT pattern:
// Call F295:IReversalService.ReverseDocumentAsync(tenantId, invoiceId, reason, idempotencyKey)
// Creates reversal doc, journal entry, sets original to CANCELLED — never deletes
```

### NEGATIVE EXAMPLE 3 — Period Close Without Approval (BUILD FAILURE)

```csharp
// ❌ WRONG: FinalizeClose with no approval token
await periodCloseService.FinalizeCloseAsync(tenantId, periodId);
// BUILD FAILURE: irreversible operation requires approvalToken (role=finance_admin)

// ✅ CORRECT:
await periodCloseService.FinalizeCloseAsync(
    tenantId, periodId,
    approvalToken: context.GetRequiredApprovalToken("finance_admin"));
```

### NEGATIVE EXAMPLE 4 — Cross-Tenant Document Access (BUILD FAILURE)

```csharp
// ❌ WRONG: No tenantId scope on query
var documents = await _db.SearchDocuments(new { docType = "INVOICE" });
// BUILD FAILURE: DNA-5 violated — tenantId missing from every query

// ✅ CORRECT: tenantId always in FactoryResolutionContext
var chainService = await _chainFactory.CreateAsync(
    new FactoryResolutionContext { TenantId = tenantId });  // Scope enforced
```

---

## ═══════════════════════════════════════════════════
## PHASE 0 — RAG MINI-INDEX (AF-4 Source Map)
## ═══════════════════════════════════════════════════

AF-4 (Task Context RAG) uses this index when generating FLOW-12 services.

| Source | Engine Contribution | Key Patterns Retrieved by AF-4 |
|---|---|---|
| 12_-_ERP_systems.md | ERP module mental model, 6 value streams, document chain topology | Shared master data schema, transactional document chain, financial posting rules |
| 12_-_ERP_systems_deep_search.md | Canonical schemas (erp_document, journal_entry, process_instance, idempotency_key, outbox), reliability patterns, OAuth/RBAC | Saga orchestration, transactional outbox, idempotency key pattern, reversal-not-delete semantics |
| 12_-_ERP_systems_deep_search_engine.md | Flow runtime requirements (state machine, approval steps, compensation paths), CloudEvents, SAP B1SESSION, monday.com GraphQL rate limits | Durable retry/backoff, webhook challenge-response, document reversal artifact |
| multi-tenant-support.md | Hybrid isolation strategy (shared-schema/separate-schema/separate-instance), tenant control plane, per-tenant KEK, RLS | TenantId propagation, object-level authorization, tenant-scoped quotas |
| Skill 01 (MicroserviceBase) | 19 inherited components | ALL generated ERP services extend this — DNA-4 |
| Skill 04 (IQueueService) | Redis Streams consumer groups, Main→Consumed→Archive→DLQ | Saga step event routing, outbox relay |
| Skill 05 (IDatabaseService) | 6 DB providers, BuildSearchFilter, DataProcessResult<T> | ERP document storage, tenant-routed schema selection |
| Skill 06/07 (IAiProvider + AiDispatcher) | Multi-model generation, consensus | ERP code generation + review |
| Skill 08/09 (IFlowDefinition + IFlowOrchestrator) | JSON DAG execution, step-by-step orchestration | FLOW-12 DAG template |

**Skill Gap Analysis**: No existing skill covers SAP OData B1SESSION management or monday.com GraphQL complexity budgets. These are modeled as config-driven connector behaviors within DATABASE and AI ENGINE fabrics — no new skills needed. The engine generates adapter layers on top of existing fabrics.

**STATE SAVE P0 ✅**

---

## ═══════════════════════════════════════════════════
## PHASE 1 — NEW FACTORY INTERFACES (F288–F303)
## ═══════════════════════════════════════════════════

**Rule**: Every interface resolves through an existing FABRIC via `CreateAsync(FactoryResolutionContext)`.
Service code NEVER imports SAP, monday.com, or any provider SDK directly.

**Family 32: ERP Systems Integration**
Covers: ERP connectors, master data, document chains, ledger, saga, idempotency, reversal, outbox, webhooks, matching, period close, tenant registry, audit, reporting, quota enforcement.

---

### F288: IERPConnectorService
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → provider selected per tenant config
  Default: Elasticsearch (ERP document index)
  Enterprise tier: PostgreSQL (separate schema with RLS)
  Fallback: MongoDB (document-native)
PURPOSE: Adapter for external ERP API (SAP B1 OData v4 model)
  - Abstracts OData v3/v4 protocol differences
  - Manages B1SESSION cookie lifecycle (re-login on 401, never logs session token)
  - Handles sticky routing (ROUTEID for load-balanced Service Layer)
  - All ERP entity calls return DataProcessResult<Dictionary<string,object>> (DNA-1, DNA-3)
METHODS:
  ConnectAsync(tenantId, connectionConfig) → DataProcessResult<Dictionary<string,object>>
  QueryEntitiesAsync(tenantId, entitySet, filters) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
  CreateDocumentAsync(tenantId, docType, payload, idempotencyKey) → DataProcessResult<Dictionary<string,object>>
  CancelDocumentAsync(tenantId, docId, reversalPayload) → DataProcessResult<Dictionary<string,object>>
MULTI-TENANT: FactoryResolutionContext.TenantId routes to tenant-specific connection pool
IRON RULE: Never throw for business logic — always DataProcessResult<T>
IRON RULE: B1SESSION never written to logs — BUILD FAILURE if logged
```

### F289: IMasterDataService
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Elasticsearch primary, PostgreSQL for regulated tenants
PURPOSE: Canonical representation of ERP master data (partners, items, warehouses)
  - Tenant-isolated master data store
  - Incremental sync via watermarks from ERP
  - Read-mostly path with cache-aside (Redis via Cache component in MicroserviceBase)
METHODS:
  UpsertPartnerAsync(tenantId, partnerData) → DataProcessResult<string>
  UpsertItemAsync(tenantId, itemData) → DataProcessResult<string>
  SearchPartnersAsync(tenantId, filters) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
  GetExternalMappingAsync(tenantId, systemType, externalId) → DataProcessResult<string>
MULTI-TENANT: Every record has tenantId; BuildSearchFilter auto-skips empty tenantId param (DNA-2)
```

### F290: IDocumentChainService
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL (append-only, immutable once posted)
  Enterprise: separate schema per tenant (t_{tenantId}.erp_document)
PURPOSE: Manages transactional document graph (O2C: Quote→SO→Delivery→Invoice→Payment;
         P2P: PReq→PO→GR→APInvoice→Payment)
  - Creates document chain links (from_doc_id → to_doc_id → link_type)
  - Enforces chain integrity (no posting without predecessor)
  - Immutable once status = POSTED; corrections via F295:IReversalService
METHODS:
  CreateDocumentAsync(tenantId, docType, parentDocId, payload, idempotencyKey) → DataProcessResult<string>
  PostDocumentAsync(tenantId, docId, approverContext) → DataProcessResult<Dictionary<string,object>>
  GetChainAsync(tenantId, rootDocId) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
  ValidateChainIntegrityAsync(tenantId, docId) → DataProcessResult<bool>
MULTI-TENANT: All queries include tenantId scope; RLS policy enforced at DB level for regulated tenants
IRON RULE: PostDocumentAsync requires idempotencyKey — BUILD FAILURE if absent
```

### F291: ILedgerService
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL (append-only journal_entry table)
PURPOSE: Universal Journal pattern — single source of truth for financial postings
  - All operational document postings create immutable journal entries
  - journal_entry rows are WORM (write-once, read-many)
  - Correction = new reversal journal_entry referencing original
  - Derived analytics index synced to Elasticsearch via outbox (F296)
METHODS:
  PostJournalEntryAsync(tenantId, sourceDocId, lines, idempotencyKey) → DataProcessResult<string>
  GetJournalEntriesAsync(tenantId, filters) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
  ReconcileAsync(tenantId, periodId) → DataProcessResult<Dictionary<string,object>>
  ReverseEntryAsync(tenantId, originalJeId, reason, idempotencyKey) → DataProcessResult<string>
MULTI-TENANT: Separate schema for enterprise/regulated. Per-tenant KEK for at-rest encryption of ledger data.
IRON RULE: PostJournalEntry requires idempotencyKey — BUILD FAILURE if absent
```

### F292: IWorkPlatformConnectorService
```
FABRIC RESOLUTION: AI ENGINE FABRIC (Skill 07) → GraphQL provider abstraction
  Config-driven: monday.com is one implementation; swap without code change
PURPOSE: Connector to external work platform (approval workflows, intake, coordination)
  - Manages OAuth 2.0 token lifecycle (PKCE for browser flows)
  - Handles GraphQL complexity budget rate limiting (retry_in_seconds)
  - Webhook URL verification (challenge echo) as first-class method
  - JWT signature verification for signed webhook events
METHODS:
  VerifyWebhookEndpointAsync(tenantId, challenge) → DataProcessResult<string>
  VerifyWebhookSignatureAsync(tenantId, jwtToken, signingSecret) → DataProcessResult<bool>
  QueryBoardAsync(tenantId, graphqlQuery, variables) → DataProcessResult<Dictionary<string,object>>
  MutateItemAsync(tenantId, mutation, variables, idempotencyKey) → DataProcessResult<Dictionary<string,object>>
  GetRateLimitStatusAsync(tenantId) → DataProcessResult<Dictionary<string,object>>
MULTI-TENANT: OAuth tokens stored via per-tenant secret reference (NEVER raw in DB)
IRON RULE: Raw OAuth tokens never stored — BUILD FAILURE if stored directly
```

### F293: ISagaCoordinatorService
```
FABRIC RESOLUTION: QUEUE FABRIC (Skill 04) → Redis Streams consumer groups
PURPOSE: Durable saga orchestration for multi-step ERP flows
  - Maintains process_instance state (O2C, P2P, R2R, etc.)
  - Persists step execution state (process_step) with retry metadata
  - Drives compensating actions on failure (via F295:IReversalService)
  - CorrelationId stable across retries and replays
METHODS:
  StartSagaAsync(tenantId, sagaType, correlationId, initialPayload) → DataProcessResult<string>
  AdvanceStepAsync(tenantId, sagaId, stepName, result) → DataProcessResult<Dictionary<string,object>>
  CompensateAsync(tenantId, sagaId, fromStepName) → DataProcessResult<bool>
  GetSagaStateAsync(tenantId, correlationId) → DataProcessResult<Dictionary<string,object>>
MULTI-TENANT: CorrelationId always prefixed with tenantId: "{tenantId}:{businessKey}"
IRON RULE: StartSagaAsync requires correlationId — BUILD FAILURE if absent
```

### F294: IIdempotencyService
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Redis (fast lookup) with PostgreSQL fallback
PURPOSE: Prevents double-posting across retries and duplicate webhook deliveries
  - Stores (tenantId, key, requestHash, resultRef, expiresAt)
  - Returns cached result if key already processed (idempotent replay)
  - Invalidates keys after configurable TTL
METHODS:
  CheckOrCreateAsync(tenantId, key, requestHash) → DataProcessResult<Dictionary<string,object>>
  StoreResultAsync(tenantId, key, resultRef) → DataProcessResult<bool>
  InvalidateAsync(tenantId, key) → DataProcessResult<bool>
MULTI-TENANT: Unique constraint on (tenantId, key) — cross-tenant key collision impossible
```

### F295: IReversalService
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → same fabric as F290:IDocumentChainService
PURPOSE: Implements reversal-not-delete semantics
  - Creates cancellation document referencing original (audit trail preserved)
  - Reverses all chain links from the cancelled document onward
  - Posts reversal journal entry via F291:ILedgerService
  - Marks original as status=CANCELLED (never deleted)
METHODS:
  ReverseDocumentAsync(tenantId, originalDocId, reason, idempotencyKey) → DataProcessResult<string>
  GetReversalHistoryAsync(tenantId, originalDocId) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
IRON RULE: Original document is NEVER deleted — BUILD FAILURE if DELETE called on posted doc
IRON RULE: Reversal doc MUST reference original doc_id — BUILD FAILURE if absent
```

### F296: IOutboxPublisherService
```
FABRIC RESOLUTION: QUEUE FABRIC (Skill 04) → Redis Streams
PURPOSE: Transactional outbox pattern — eliminates dual-write risk
  - Outbox row written in SAME DB transaction as aggregate update
  - Background relay publishes to queue and marks published_at
  - Guarantees at-least-once event delivery
METHODS:
  WriteToOutboxAsync(tenantId, aggregateId, eventType, payload) → DataProcessResult<string>
  RelayPendingAsync(tenantId, batchSize) → DataProcessResult<int>
  GetPendingCountAsync(tenantId) → DataProcessResult<int>
MULTI-TENANT: All outbox rows include tenantId; relay worker is tenant-aware
```

### F297: IWebhookGatewayService
```
FABRIC RESOLUTION: QUEUE FABRIC (Skill 04) → Redis Streams (webhook events → Main stream)
PURPOSE: Ingests, verifies, and deduplicates inbound webhook events
  - Challenge-response verification on setup (work platform requirement — BLOCKING)
  - JWT signature verification on event receipt
  - Deduplication via F294:IIdempotencyService (event_id as key)
  - Routes normalized events to FLOW-12 saga via F293:ISagaCoordinatorService
METHODS:
  HandleChallengeAsync(challenge) → DataProcessResult<string>
  IngestEventAsync(tenantId, headers, rawPayload) → DataProcessResult<string>
  GetEventStatusAsync(tenantId, eventId) → DataProcessResult<Dictionary<string,object>>
IRON RULE: No event processed without signature verification — BUILD FAILURE if skipped
IRON RULE: Challenge-response cannot be bypassed — BUILD FAILURE
```

### F298: IThreeWayMatchService
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Elasticsearch (match analysis index)
PURPOSE: Validates PO ↔ GoodsReceipt ↔ VendorInvoice three-way match (P2P chain)
  - Compares quantities, amounts, and item codes across the three documents
  - Returns match status: FULL_MATCH, QUANTITY_VARIANCE, PRICE_VARIANCE, MISMATCH
  - Triggers exception workflow via F293:ISagaCoordinatorService on mismatch
METHODS:
  MatchAsync(tenantId, poId, grId, invoiceId) → DataProcessResult<Dictionary<string,object>>
  GetMatchHistoryAsync(tenantId, docId) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
MULTI-TENANT: Match records scoped to tenantId; BuildSearchFilter skips empty fields (DNA-2)
IRON RULE: MISMATCH must NEVER silently advance to posting — BUILD FAILURE
```

### F299: IPeriodCloseService
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL (ledger) + Elasticsearch (analytics)
PURPOSE: Orchestrates period-end closing (Record-to-Report)
  - Currency revaluation, accruals, balance validation, period seal
  - Marks period as CLOSED (immutable); re-open creates new reversal period
METHODS:
  InitiateCloseAsync(tenantId, periodId, idempotencyKey) → DataProcessResult<string>
  RevalueAsync(tenantId, periodId, exchangeRates) → DataProcessResult<Dictionary<string,object>>
  PostAccrualsAsync(tenantId, periodId, accruals, idempotencyKey) → DataProcessResult<bool>
  FinalizeCloseAsync(tenantId, periodId, approvalToken) → DataProcessResult<Dictionary<string,object>>
IRON RULE: FinalizeCloseAsync without approvalToken (role=finance_admin) = BUILD FAILURE
IRON RULE: Period cannot be sealed if unresolved P2P mismatches exist = BUILD FAILURE
```

### F300: IERPTenantConnectionRegistry
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Elasticsearch (tenant config index)
PURPOSE: Manages per-tenant ERP connection configurations
  - Stores connection metadata (base_url, scopes, status) — NEVER raw secrets
  - Maps to vault references for credentials
  - Supports multiple ERP instances per tenant (test vs production)
METHODS:
  RegisterConnectionAsync(tenantId, connectionConfig) → DataProcessResult<string>
  GetConnectionAsync(tenantId, connectionId) → DataProcessResult<Dictionary<string,object>>
  HealthCheckAsync(tenantId, connectionId) → DataProcessResult<Dictionary<string,object>>
  RevokeConnectionAsync(tenantId, connectionId) → DataProcessResult<bool>
IRON RULE: Raw secrets never stored in config — BUILD FAILURE if stored directly
```

### F301: IAuditLedgerService
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Elasticsearch (append-only audit index)
PURPOSE: WORM-equivalent audit log for all ERP actions (who, what, when, tenantId, objectRef, diff)
  - SOC 2 processing integrity and GDPR accountability coverage
  - Tamper-evident (hash chain optional for enterprise tier)
METHODS:
  WriteAuditAsync(tenantId, actorId, action, objectRef, diff) → DataProcessResult<string>
  QueryAuditAsync(tenantId, filters) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
IRON RULE: WriteAuditAsync called BEFORE returning success from any state-changing operation — BUILD FAILURE
```

### F302: IERPReportingService
```
FABRIC RESOLUTION: RAG FABRIC (Skill 00b) → Hybrid strategy (Elasticsearch analytics index)
PURPOSE: Derived analytics over ERP events — NOT authoritative ledger
  - Event-driven: fed by outbox relay (F296) rather than polling
  - Analytics records tagged as derived (source="derived", erp_doc_id="{externalId}")
  - Reconciliation job detects analytics-vs-ERP discrepancies
METHODS:
  IndexDocumentEventAsync(tenantId, event) → DataProcessResult<string>
  SearchReportsAsync(tenantId, reportType, filters) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
  GetReconciliationGapsAsync(tenantId, periodId) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
IRON RULE: Analytics index NEVER used as authoritative ledger — BUILD FAILURE if posting uses analytics store
```

### F303: ITenantQuotaEnforcerService
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Redis (quota counters)
PURPOSE: Enforces per-tenant resource quotas for ERP operations (API calls, sync frequency, document volume)
  - Prevents noisy-neighbor issues in shared schema tier
  - Reads quota config from FREEDOM layer (ES config index)
  - Returns DataProcessResult with quota status (ALLOWED, RATE_LIMITED, EXCEEDED)
METHODS:
  CheckQuotaAsync(tenantId, operationType, cost) → DataProcessResult<Dictionary<string,object>>
  IncrementCounterAsync(tenantId, operationType, amount) → DataProcessResult<bool>
  GetQuotaStatusAsync(tenantId) → DataProcessResult<Dictionary<string,object>>
MULTI-TENANT: Counters namespace: "{tenantId}:{operationType}:{period}"
IRON RULE: Quota check called BEFORE any ERP sync page fetch — BUILD FAILURE if skipped
```

**STATE SAVE P1 ✅**
```
PHASE 1 COMPLETE
FACTORIES ADDED: F288–F303 (16 total, Family 32)
NEXT: Phase 2 — Engine Contracts T103–T110
```

---

## ═══════════════════════════════════════════════════
## PHASE 2 — ENGINE CONTRACTS (T103–T110)
## ═══════════════════════════════════════════════════

### TASK TYPE: T103 — ERP Document Chain Step
```
ARCHETYPE: STATEFUL_ORCHESTRATION
ENTRY: Fires when ISagaCoordinatorService advances to a document-creation step
PURPOSE: Creates a single document in the ERP chain (Quote, SO, Delivery, Invoice, PO, GR, etc.)
         with idempotency guarantee and compensation path
DISTINCT FROM:
  T40 (Three-Way Join Gate) — T103 is linear chain step, not parallel convergence
  T33 (2-way convergence) — T103 creates new documents, not merges
FACTORY DEPENDENCIES:
  F288:IERPConnectorService — resolved via CreateAsync()
  F290:IDocumentChainService — resolved via CreateAsync()
  F294:IIdempotencyService — resolved via CreateAsync()
  F296:IOutboxPublisherService — resolved via CreateAsync()
  F301:IAuditLedgerService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F288 → DATABASE FABRIC (Skill 05) → provider per tenant config
  F290 → DATABASE FABRIC (Skill 05) → PostgreSQL (append-only)
  F294 → DATABASE FABRIC (Skill 05) → Redis + PostgreSQL fallback
  F296 → QUEUE FABRIC (Skill 04) → Redis Streams
  F301 → DATABASE FABRIC (Skill 05) → Elasticsearch (audit index)
AF CONFIGURATION:
  AF-1 Genesis: generates IDocumentChainService implementation on DATABASE FABRIC
  AF-4 RAG: retrieves idempotency key pattern (F294) + outbox pattern (F296) + DNA-1/3/5 patterns
  AF-7 Compliance: validates no typed ERP models (DNA-1), DataProcessResult (DNA-3), tenantId scope (DNA-5)
  AF-9 Judge: validates idempotencyKey present, auditLog written before return, no direct provider import
BFA VALIDATION:
  CF-96: Parent document must exist in chain before child document creation
  CF-97: idempotencyKey must be unique for (tenantId, correlationId, stepName)
  CF-98: tenantId must match across all factories in same step
MACHINE (fixed):
  - idempotencyKey format: "{docType}:{correlationId}:{stepName}"
  - Retry policy: 5 attempts, exponential backoff, max 30 minutes
  - On permanent failure: COMPENSATE → T107 (Reversal/Compensation Step)
  - Audit entry written synchronously before returning result
FREEDOM (configurable):
  - Which DB provider resolves F288 (Elasticsearch, PostgreSQL, MongoDB)
  - Timeout per step (default 300s, max 3600s)
  - Approval required before POSTED status (enable/disable per docType per tenant)
IRON RULES:
  - idempotencyKey MUST be present → BUILD FAILURE
  - tenantId MUST be in FactoryResolutionContext → BUILD FAILURE
  - DataProcessResult<T> on ALL paths — never throw → BUILD FAILURE
  - No direct import of SAP SDK, monday SDK, or any ERP provider → BUILD FAILURE
  - Original document NEVER deleted (reversal only) → BUILD FAILURE
QUALITY GATES (AF-9 Judge):
  - PostDocument only allowed after parent document exists in chain
  - Status POSTED requires approvalToken in context (if approval enabled per FREEDOM config)
  - Outbox entry written in same logical unit as document creation
  - Audit log entry present for every POSTED transition
```

### TASK TYPE: T104 — Three-Way Match Gate
```
ARCHETYPE: VALIDATION_GATE
ENTRY: Fires after GoodsReceipt (GR) created in P2P chain; blocks APInvoice posting until match confirmed
PURPOSE: Validates PO ↔ GR ↔ Vendor Invoice alignment; routes to exception workflow on mismatch
DISTINCT FROM:
  T40 (Three-Way Join Gate) — T104 is a validation gate, not a parallel convergence merge
  T103 (ERP Document Chain Step) — T104 reads documents, does not create them
FACTORY DEPENDENCIES:
  F298:IThreeWayMatchService — resolved via CreateAsync()
  F290:IDocumentChainService — resolved via CreateAsync()
  F293:ISagaCoordinatorService — resolved via CreateAsync()
  F301:IAuditLedgerService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F298 → DATABASE FABRIC (Skill 05) → Elasticsearch (match analysis index)
  F290 → DATABASE FABRIC (Skill 05) → PostgreSQL
  F293 → QUEUE FABRIC (Skill 04) → Redis Streams
  F301 → DATABASE FABRIC (Skill 05) → Elasticsearch (audit)
AF CONFIGURATION:
  AF-2 Planning: decomposes into: fetch PO, fetch GR, fetch Invoice, run match, branch on result
  AF-4 RAG: retrieves branching/decision step patterns from T31/T32 in skill library
  AF-9 Judge: validates MISMATCH path routes to human exception task (T109), not silent fail
BFA VALIDATION:
  CF-99: PO, GR, Invoice must belong to same tenantId (cross-tenant doc prevention)
  CF-100: GR must reference PO in chain (chain integrity)
  CF-101: Amount variance checked against configurable tolerance threshold
MACHINE (fixed):
  - Match statuses: FULL_MATCH, QUANTITY_VARIANCE, PRICE_VARIANCE, MISMATCH
  - FULL_MATCH → advance saga to APInvoice posting step
  - QUANTITY/PRICE_VARIANCE → route to T109 (ERP Approval Gate) with exception context
  - MISMATCH → block saga; emit alert event; require manual resolution
FREEDOM (configurable):
  - Variance tolerance % (per tenant, per item category)
  - Auto-approve minor variances under threshold (per tenant)
  - Exception assignee role (default: ap_clerk)
IRON RULES:
  - MISMATCH must NEVER silently advance to posting → BUILD FAILURE
  - APInvoice posting blocked until match status = FULL_MATCH or manually overridden → BUILD FAILURE
  - Override requires approvalToken with role=finance_admin → BUILD FAILURE
QUALITY GATES (AF-9 Judge):
  - Match result stored and auditable (via F301)
  - Variance amounts captured in match record
  - Every match invocation uses tenantId from FactoryResolutionContext — never inferred
```

### TASK TYPE: T105 — Master Data Sync Step
```
ARCHETYPE: INTEGRATION_SYNC
ENTRY: Triggered by schedule OR connection setup event (F300:IERPTenantConnectionRegistry)
PURPOSE: Incremental sync of ERP master data (partners, items, warehouses) into canonical store
         with watermark-based pagination and deduplication
DISTINCT FROM:
  T103 (document chain step) — T105 syncs reference data, not transactional documents
FACTORY DEPENDENCIES:
  F288:IERPConnectorService — resolved via CreateAsync()
  F289:IMasterDataService — resolved via CreateAsync()
  F294:IIdempotencyService — resolved via CreateAsync()
  F300:IERPTenantConnectionRegistry — resolved via CreateAsync()
  F303:ITenantQuotaEnforcerService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F288 → DATABASE FABRIC (Skill 05) → per-tenant ERP provider
  F289 → DATABASE FABRIC (Skill 05) → Elasticsearch (master data index)
  F294 → DATABASE FABRIC (Skill 05) → Redis
  F300 → DATABASE FABRIC (Skill 05) → Elasticsearch (config)
  F303 → DATABASE FABRIC (Skill 05) → Redis (quota counters)
AF CONFIGURATION:
  AF-1 Genesis: generates sync service using OData watermark pagination on F288
  AF-4 RAG: retrieves incremental sync and watermark patterns from existing skill library
  AF-7 Compliance: validates BuildSearchFilter used (DNA-2), no typed partner/item models (DNA-1)
MACHINE (fixed):
  - OData $filter with $orderby and $skiptoken for pagination
  - B1SESSION re-authentication on 401 (transparent to service logic)
  - Watermark persisted after each page (checkpoint)
  - Deduplication via F294 key: "sync_job:{tenantId}:{entitySet}:{watermark}"
FREEDOM (configurable):
  - Sync frequency (default: hourly; enterprise: real-time event-driven)
  - Entities to sync (partners, items, warehouses — toggleable per tenant)
  - ERP provider type (SAP B1 OData, generic REST, etc.)
IRON RULES:
  - Quota check via F303 BEFORE each sync page → BUILD FAILURE if skipped
  - B1SESSION renewal never stores session token in logs → BUILD FAILURE if logged
  - PII fields (tax_id, addresses) always encrypted at rest via tenant KEK → BUILD FAILURE if not
QUALITY GATES (AF-9 Judge):
  - Watermark always saved to checkpoint before returning from each page
  - Sync job idempotent: re-running same sync window produces same result
```

### TASK TYPE: T106 — Period-End Close Routine
```
ARCHETYPE: SCHEDULED_WORKFLOW
ENTRY: Triggered by schedule event OR manual initiation with periodId + approvalToken
PURPOSE: Automates Record-to-Report close activities (revaluation, accruals, balance validation, close seal)
DISTINCT FROM:
  T103 (single document step) — T106 is a multi-step coordinated accounting workflow
FACTORY DEPENDENCIES:
  F299:IPeriodCloseService — resolved via CreateAsync()
  F291:ILedgerService — resolved via CreateAsync()
  F293:ISagaCoordinatorService — resolved via CreateAsync()
  F301:IAuditLedgerService — resolved via CreateAsync()
  F302:IERPReportingService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F299 → DATABASE FABRIC (Skill 05) → PostgreSQL (ledger, append-only)
  F291 → DATABASE FABRIC (Skill 05) → PostgreSQL (journal entries)
  F293 → QUEUE FABRIC (Skill 04) → Redis Streams
  F301 → DATABASE FABRIC (Skill 05) → Elasticsearch (audit)
  F302 → RAG FABRIC (Skill 00b) → Hybrid (reporting index)
AF CONFIGURATION:
  AF-1 Genesis: generates PeriodCloseService as saga steps on F299 + F291
  AF-2 Planning: decomposes into: init → revalue → post-accruals → validate-balance → seal
  AF-9 Judge: validates FinalizeCloseAsync requires approvalToken; period seal is irreversible
BFA VALIDATION:
  CF-102: All O2C/P2P documents for period must be in terminal state before close
  CF-103: Journal debit totals must equal credit totals for period
  CF-104: No pending outbox events for period
MACHINE (fixed):
  - Close sequence: INIT → REVALUE → ACCRUE → VALIDATE → SEAL
  - Each step is idempotent (can be retried safely)
  - FinalizeCloseAsync requires: approvalToken (role=finance_admin), balance_check=PASSED
  - Sealed period creates immutable snapshot; re-open creates reversal period
FREEDOM (configurable):
  - Exchange rate source for revaluation (per tenant)
  - Accrual rules (config document in FREEDOM layer ES index)
  - Auto-close if balance check passes (enterprise toggle)
IRON RULES:
  - Period cannot be sealed if unresolved P2P mismatches exist → BUILD FAILURE
  - Reversal of closed period creates NEW period (never delete/modify closed period) → BUILD FAILURE
  - FinalizeCloseAsync without approvalToken = BUILD FAILURE
QUALITY GATES (AF-9 Judge):
  - All close steps idempotent and replayable
  - Balance validation produces audit-grade report before seal
  - Sealed period immutable: any subsequent query returns period_status=CLOSED
```

### TASK TYPE: T107 — Reversal / Compensation Step
```
ARCHETYPE: COMPENSATION
ENTRY: Fires when ISagaCoordinatorService calls CompensateAsync OR manual reversal initiated
PURPOSE: Creates cancellation/reversal artifact for any previously posted document
         Preserves audit trail; reverses chain links; posts reversal journal entry
DISTINCT FROM:
  T103 (document creation) — T107 creates reversal documents as compensation
FACTORY DEPENDENCIES:
  F295:IReversalService — resolved via CreateAsync()
  F291:ILedgerService — resolved via CreateAsync()
  F290:IDocumentChainService — resolved via CreateAsync()
  F301:IAuditLedgerService — resolved via CreateAsync()
  F294:IIdempotencyService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F295 → DATABASE FABRIC (Skill 05) → PostgreSQL (same as F290)
  F291 → DATABASE FABRIC (Skill 05) → PostgreSQL (ledger)
  F290 → DATABASE FABRIC (Skill 05) → PostgreSQL
  F301 → DATABASE FABRIC (Skill 05) → Elasticsearch (audit)
  F294 → DATABASE FABRIC (Skill 05) → Redis
AF CONFIGURATION:
  AF-1 Genesis: generates ReversalService on F295 + F291, never calling DELETE
  AF-9 Judge: validates original doc status = CANCELLED, reversal doc created, journal reversed
MACHINE (fixed):
  - ReverseDocumentAsync creates: (1) cancellation doc with link_type=REVERSAL
                                   (2) reversal journal entry
  - Original doc status → CANCELLED; cancellation doc status → POSTED
  - idempotencyKey: "reversal:{originalDocId}:{tenantId}:{reason}"
  - Chain links from original doc cascaded to CANCELLED state
IRON RULES:
  - NEVER call DELETE on any posted ERP document → BUILD FAILURE
  - Reversal doc MUST reference original doc_id → BUILD FAILURE
  - Reversal journal entry MUST balance (debit = credit of original entry) → BUILD FAILURE
QUALITY GATES (AF-9 Judge):
  - Both original and reversal documents remain reportable/queryable
  - Audit trail shows: original → cancelled, reversal doc created, journal reversed
  - Idempotent: reversing same doc twice returns existing reversal (via F294)
```

### TASK TYPE: T108 — Multi-Tenant ERP Connection Bootstrap
```
ARCHETYPE: SETUP_WORKFLOW
ENTRY: Fires when admin creates new ERP connection (tenant onboarding event)
PURPOSE: Establishes tenant-specific ERP + work platform connections
         Verifies webhook endpoints; performs initial master data sync; registers in BFA
FACTORY DEPENDENCIES:
  F300:IERPTenantConnectionRegistry — resolved via CreateAsync()
  F292:IWorkPlatformConnectorService — resolved via CreateAsync()
  F288:IERPConnectorService — resolved via CreateAsync()
  F289:IMasterDataService — resolved via CreateAsync()
  F297:IWebhookGatewayService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F300 → DATABASE FABRIC (Skill 05) → Elasticsearch (tenant config)
  F292 → AI ENGINE FABRIC (Skill 07) → GraphQL provider
  F288 → DATABASE FABRIC (Skill 05) → per-tenant ERP provider
  F289 → DATABASE FABRIC (Skill 05) → Elasticsearch (master data)
  F297 → QUEUE FABRIC (Skill 04) → Redis Streams
AF CONFIGURATION:
  AF-2 Planning: decomposes into: register-connection → verify-webhook → test-erp-auth → initial-sync → register-bfa
  AF-8 Security: validates: OAuth scopes minimized, secrets stored as vault refs, TLS enforced, webhook signature enabled
BFA VALIDATION:
  CF-105: New tenant connection must not duplicate existing (tenantId, systemType, baseUrl)
  CF-106: Webhook endpoint verification must succeed before connection status = ACTIVE
MACHINE (fixed):
  - Webhook verification (challenge echo) is BLOCKING step — cannot proceed if fails
  - Initial master data sync runs T105 for partners + items + warehouses
  - BFA entity registration happens after successful sync
  - Connection status = ACTIVE only after all steps pass
FREEDOM (configurable):
  - ERP product type (SAP B1 OData, generic REST, etc.)
  - OAuth scopes to request (per tenant capability)
  - Initial sync scope (all entities vs subset)
IRON RULES:
  - Raw OAuth tokens NEVER stored in DB — vault reference only → BUILD FAILURE
  - Webhook URL challenge verification cannot be bypassed → BUILD FAILURE
  - TLS required for all ERP and work platform connections → BUILD FAILURE
  - One tenant's connection config NEVER accessible by another → BUILD FAILURE
QUALITY GATES (AF-9 Judge):
  - All secrets stored as vault refs, never raw
  - Health check passes for both ERP and work platform before ACTIVE status
  - BFA registration records all new entities and events
```

### TASK TYPE: T109 — ERP Approval Gate
```
ARCHETYPE: HUMAN_TASK_GATE
ENTRY: Fires when saga step requires human approval before advancing
PURPOSE: Suspends saga execution; routes to approver role; resumes on approve/reject/timeout
         Used for: invoice posting, payment runs, period close seal, three-way match overrides
DISTINCT FROM:
  Previous approval steps in other flows — T109 carries ERP-specific context (docType, amount, RBAC role)
FACTORY DEPENDENCIES:
  F293:ISagaCoordinatorService — resolved via CreateAsync()
  F292:IWorkPlatformConnectorService — resolved via CreateAsync()
  F301:IAuditLedgerService — resolved via CreateAsync()
  F294:IIdempotencyService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F293 → QUEUE FABRIC (Skill 04) → Redis Streams (saga state)
  F292 → AI ENGINE FABRIC (Skill 07) → GraphQL (approval task on work platform board)
  F301 → DATABASE FABRIC (Skill 05) → Elasticsearch (audit)
  F294 → DATABASE FABRIC (Skill 05) → Redis
MACHINE (fixed):
  - Creates approval task on work platform board (via F292)
  - Saga suspends at this step (process_step.status = AWAITING_APPROVAL)
  - On APPROVE: writes approvalToken, advances saga
  - On REJECT: triggers compensation (T107 if document already created)
  - On TIMEOUT: escalates to supervisor role; logs audit event
FREEDOM (configurable):
  - Approver role mapping (finance_admin, ap_clerk, sales_ops, etc.)
  - Approval timeout (default 24h, max 7 days)
  - Auto-approve below threshold (per tenant config)
  - Escalation path
IRON RULES:
  - High-risk actions (payment runs, period close seal) require approval regardless of auto-approve config → BUILD FAILURE
  - approvalToken stored with saga state for downstream idempotency checks → BUILD FAILURE
QUALITY GATES (AF-9 Judge):
  - Suspended saga state persisted durably (survives service restart)
  - Audit entry on every approval/rejection/escalation
  - Timeout without response routes to escalation, never silently advances
```

### TASK TYPE: T110 — ERP Analytics Sync Step
```
ARCHETYPE: DERIVED_DATA_SYNC
ENTRY: Fires on OutboxPublisher relay event after any document POSTED or REVERSED
PURPOSE: Syncs ERP events to derived analytics index (Elasticsearch) for reporting
         Labels all analytics data as derived (not authoritative)
         Provides reconciliation gap detection vs ERP master
FACTORY DEPENDENCIES:
  F302:IERPReportingService — resolved via CreateAsync()
  F296:IOutboxPublisherService — resolved via CreateAsync()
  F301:IAuditLedgerService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F302 → RAG FABRIC (Skill 00b) → Hybrid strategy (Elasticsearch analytics index)
  F296 → QUEUE FABRIC (Skill 04) → Redis Streams (outbox relay)
  F301 → DATABASE FABRIC (Skill 05) → Elasticsearch (audit)
MACHINE (fixed):
  - Event-driven: triggered by outbox relay, NOT polling
  - Analytics index record always tagged: source="derived", erp_doc_id="{externalId}"
  - Reconciliation job scheduled: compares analytics totals vs ERP reports API
  - Discrepancies written as reconciliation_gap events (not auto-corrected)
IRON RULES:
  - Analytics index NEVER used as authoritative ledger → BUILD FAILURE if posting uses analytics store
  - Reconciliation gaps NEVER silently resolved — human review required → BUILD FAILURE
QUALITY GATES (AF-9 Judge):
  - Analytics records have source="derived" tag on every entry
  - Reconciliation gaps produce audit trail entries
  - Gap events always routable to human reviewer (never auto-closed)
```

**STATE SAVE P2 ✅**
```
PHASE 2 COMPLETE
TASK TYPES ADDED: T103–T110 (8 total, Family 32)
NEXT: Phase 3 — AF Station Mapping
```

---

## ═══════════════════════════════════════════════════
## PHASE 3 — AF STATION MAPPING FOR FLOW-12
## ═══════════════════════════════════════════════════

### How the AI Pipeline Generates FLOW-12 Services

```
SUB-ENGINE: INVENTORY (AF-2, AF-3, AF-4)
  AF-2 Planning:
    Decomposes each value stream into step sequences:
      O2C: Quote→SO→Delivery→Invoice→Payment (each step = T103 invocation)
      P2P: PReq→PO→GR→T104(match)→APInvoice→Payment
      R2R: T106 orchestration across F299+F291
    Identifies compensation paths (each T103 step → T107 fallback)
    
  AF-3 Prompt Library:
    Retrieves ERP-domain prompts: "financial posting correctness", "saga compensation", 
    "idempotency key construction", "reversal-not-delete", "WORM audit log"
    
  AF-4 RAG (Task Context):
    Searches skill library using PHASE 0 RAG mini-index
    Retrieves: Skill 04 (queue patterns), Skill 05 (DB patterns), Skill 01 (base inheritance)
    Finds existing T40/T33 patterns for reference (parallel/convergence archetypes)
    Returns: idempotency_key pattern, outbox pattern, BuildSearchFilter pattern

SUB-ENGINE: SYNTHESIS (AF-1, AF-5, AF-10)
  AF-1 Genesis:
    Generates ERP service code from spec
    Input: Task type contract (T103–T110) + factory interfaces (F288–F303)
    Output: MicroserviceBase-extending service that calls CreateAsync() for each factory
    Key generation rules:
      - Every method returns DataProcessResult<T> (DNA-3)
      - All data as Dictionary<string,object> (DNA-1)
      - Every query passes tenantId scope (DNA-5)
      - BuildSearchFilter on all DB calls (DNA-2)
      - No provider SDK imports (only fabric interfaces)
      
  AF-5 Multi-model orchestration:
    Runs generated service code through Claude, OpenAI, Gemini in parallel
    Consensus check: all three models must agree on idempotency key format
    Aggregates: takes best-scored implementation per AiDispatcher (Skill 07)
    
  AF-10 Merge:
    Combines multi-model outputs for each T103–T110 service
    Conflict resolution: strictest DNA compliance wins

SUB-ENGINE: JUDGMENT (AF-6, AF-7, AF-8, AF-9, AF-11)
  AF-6 Code Review:
    Reviews generated service for: error handling completeness, null safety,
    retry coverage, edge cases in saga compensation paths
    
  AF-7 Compliance (DNA patterns):
    Checks ALL 9 DNA patterns on every generated file:
      DNA-1: No typed ERP models (SalesOrder, Invoice classes forbidden)
      DNA-2: BuildSearchFilter on every DB query
      DNA-3: DataProcessResult<T> on every method
      DNA-4: MicroserviceBase inherited
      DNA-5: tenantId in every DB call
      DNA-6: DynamicController (no ERP-entity-specific controllers)
      DNA-7: Factory pattern (CreateAsync for every dependency)
      DNA-8: Config-first routing
      DNA-9: Scope isolation at queue consumer level
      
  AF-8 Security:
    Validates FLOW-12-specific security requirements:
      - OAuth tokens: vault reference only, never raw
      - B1SESSION: never logged, never exposed in DataProcessResult
      - Webhook signatures: JWT verification enforced
      - TLS: all external calls
      - PII fields: tenant KEK encryption enforced
      - RBAC: finance_admin required for FinalizeCloseAsync and payment runs
      
  AF-9 Judge (Iron Rules Check):
    Validates each generated service against Iron Rules for its task type
    FLOW-12 specific checks:
      - idempotencyKey present on every PostDocument, PostJournalEntry, StartSaga call
      - DELETE never called on posted documents (reversal only)
      - FinalizeCloseAsync never called without approvalToken
      - MISMATCH in T104 never silently advances saga
      - Audit written BEFORE success return on every state-change
      
  AF-11 Feedback:
    Stores generation quality score for FLOW-12 services
    Injects user ratings into future prompt context (continuous improvement)
    Tracks: DNA compliance rate, Iron Rule violation rate, AF-9 judge pass rate
```

**STATE SAVE P3 ✅**

---

## ═══════════════════════════════════════════════════
## PHASE 4 — BFA CROSS-FLOW VALIDATION (CF-96–CF-107)
## ═══════════════════════════════════════════════════

### New Entities/Events/APIs Registered in BFA Indices

**New Entities (FLOW-12):**
`ERP_Partner`, `ERP_Item`, `ERP_Warehouse`, `ERP_Document`, `ERP_DocumentLine`,
`DocumentChainLink`, `JournalEntry`, `JournalEntryLine`, `ProcessInstance`,
`ProcessStep`, `IdempotencyKey`, `OutboxEvent`, `MatchRecord`, `AuditLog`,
`TenantConnection`, `ClosedPeriod`

**New Events (FLOW-12):**
`DocumentCreated`, `DocumentPosted`, `DocumentReversed`, `DocumentCancelled`,
`JournalEntryPosted`, `MatchCompleted`, `MatchException`, `SagaStarted`,
`SagaAdvanced`, `SagaCompensated`, `PeriodCloseInitiated`, `PeriodClosed`,
`ConnectionBootstrapped`, `MasterDataSynced`, `ApprovalRequested`, `ApprovalResolved`

### BFA Conflict Rules

**CF-96** — ERP Document Chain Parent Check
```
TYPE: CHAIN_INTEGRITY
FLOWS: FLOW-12 internal
CHECK: Child document (SO, Delivery, Invoice) must have parent document in chain before creation
RESOLUTION: T103 calls ValidateChainIntegrityAsync before CreateDocumentAsync
```

**CF-97** — Idempotency Key Uniqueness
```
TYPE: DUPLICATE_PREVENTION
FLOWS: FLOW-12 internal
CHECK: idempotencyKey must be unique per (tenantId, correlationId, stepName)
RESOLUTION: F294:IIdempotencyService.CheckOrCreateAsync blocks duplicates
```

**CF-98** — Cross-Factory Tenant Consistency
```
TYPE: SCOPE_ISOLATION
FLOWS: FLOW-12 internal; cross-flow with FLOW-01 through FLOW-09
CHECK: All factories in same step must resolve with identical tenantId
RESOLUTION: FactoryResolutionContext.TenantId set once at step entry, passed to all CreateAsync() calls
```

**CF-99** — P2P Three-Way Match Tenant Isolation
```
TYPE: CROSS_TENANT_PREVENTION
FLOWS: FLOW-12 internal
CHECK: PO, GR, and Invoice documents referenced in T104 must all belong to same tenantId
RESOLUTION: T104 validates tenantId on all three documents before calling F298
```

**CF-100** — GR Must Reference PO in Chain
```
TYPE: CHAIN_INTEGRITY
FLOWS: FLOW-12 internal (P2P value stream)
CHECK: GoodsReceipt document must have link_type=CHILD pointing to PurchaseOrder
RESOLUTION: F290:IDocumentChainService.ValidateChainIntegrityAsync
```

**CF-101** — Three-Way Match Variance Tolerance
```
TYPE: BUSINESS_RULE
FLOWS: FLOW-12 internal
CHECK: Amount variance between PO/GR/Invoice checked against tenant-configurable tolerance
RESOLUTION: F298:IThreeWayMatchService reads tolerance from FREEDOM config (ES index)
```

**CF-102** — Period Close Pre-condition: All Documents Terminal
```
TYPE: WORKFLOW_GATE
FLOWS: FLOW-12 internal; cross-flow check against FLOW-01 through FLOW-09 financial entities
CHECK: All O2C/P2P documents for the period must be in terminal state (POSTED, CANCELLED) before period seal
RESOLUTION: F299:IPeriodCloseService checks process_instance states before FinalizeCloseAsync
```

**CF-103** — Journal Balance Enforcement
```
TYPE: FINANCIAL_INTEGRITY
FLOWS: FLOW-12 internal
CHECK: Sum of all debit lines must equal sum of all credit lines for period before close
RESOLUTION: F299 calls F291:ILedgerService.ReconcileAsync; FinalizeCloseAsync blocked if balance_check != PASSED
```

**CF-104** — No Pending Outbox Before Period Close
```
TYPE: EVENTUAL_CONSISTENCY
FLOWS: FLOW-12 internal
CHECK: F296 outbox pending count for period must be zero before FinalizeCloseAsync
RESOLUTION: F299 calls F296:IOutboxPublisherService.GetPendingCountAsync; blocks if > 0
```

**CF-105** — Tenant Connection Deduplication
```
TYPE: RESOURCE_CONFLICT
FLOWS: FLOW-12 internal
CHECK: New connection must not duplicate (tenantId, systemType, baseUrl) combination
RESOLUTION: F300:IERPTenantConnectionRegistry enforces unique constraint
```

**CF-106** — Webhook Verification Before Active Status
```
TYPE: SECURITY_GATE
FLOWS: FLOW-12 internal
CHECK: Connection status cannot be set to ACTIVE until webhook challenge-response verification succeeds
RESOLUTION: T108 makes webhook verification a BLOCKING step — entire bootstrap halts if it fails
```

**CF-107** — Analytics Never Used as Ledger (Cross-FLOW)
```
TYPE: DATA_INTEGRITY
FLOWS: FLOW-12 cross-check; relevant to any other flow that reads FLOW-12 analytics index
CHECK: F302:IERPReportingService analytics index must never be the source for PostJournalEntryAsync calls
RESOLUTION: AF-9 Judge validates that any call to F291:ILedgerService.PostJournalEntryAsync
            never reads from analytics index — must read from F290 (authoritative chain) or F291 (ledger)
```

**STATE SAVE P4 ✅**
```
PHASE 4 COMPLETE
BFA RULES ADDED: CF-96–CF-107 (12 total)
NEXT: Phase 5 — Multi-Tenant Layer
```

---

## ═══════════════════════════════════════════════════
## PHASE 5 — MULTI-TENANT EXTENSION LAYER
## ═══════════════════════════════════════════════════

### Three-Tier Isolation Strategy for FLOW-12

ERP data is uniquely sensitive — financial records, PII, and cross-tenant contamination risks are higher than previous flows. FLOW-12 follows the hybrid isolation model from multi-tenant-support.md:

```
TIER 1: SHARED SCHEMA (Starter/SMB tenants)
  - All tenants share Elasticsearch indices and Redis namespaces
  - Isolation via tenantId field + BuildSearchFilter (DNA-2, DNA-5)
  - Quota enforcement via F303:ITenantQuotaEnforcerService (noisy-neighbor protection)
  - Data encrypted at rest with platform-level key
  - Suitable for: non-regulated tenants, lower document volumes

TIER 2: SEPARATE SCHEMA (Regulated tenants)
  - PostgreSQL: dedicated schema per tenant (t_{tenantId}.erp_document, t_{tenantId}.journal_entry)
  - Elasticsearch: dedicated index per tenant for ledger data
  - RLS enforced at DB level (F290, F291, F295 all route to separate schema via FactoryResolutionContext)
  - Per-tenant KEK (Key Encryption Key) for PII fields: tax_id, addresses, payment references
  - Suitable for: GDPR-regulated tenants, audited entities, financial institutions

TIER 3: SEPARATE INSTANCE (Enterprise tenants)
  - Dedicated microservice instances per tenant
  - F288:IERPConnectorService — dedicated connection pool, no cross-tenant sharing
  - F291:ILedgerService — dedicated PostgreSQL instance (true data isolation)
  - Suitable for: enterprise, multi-jurisdiction, highest regulatory requirements
```

### Tenant Routing in FactoryResolutionContext

```csharp
// Engine-generated pattern — ALL FLOW-12 factories use this
var ctx = new FactoryResolutionContext {
    TenantId = tenantId,
    IsolationTier = tenantConfig.GetIsolationTier(tenantId),  // Shared/Schema/Instance
    SchemaName = tenantConfig.GetSchemaName(tenantId),         // null for shared, t_{id} for schema
    EncryptionKeyRef = tenantConfig.GetKEKRef(tenantId)        // vault ref for per-tenant KEK
};
var chainService = await _chainFactory.CreateAsync(ctx);
// Fabric resolves to correct provider AND schema AND encryption context
```

### FREEDOM Layer Config Documents for FLOW-12

All configurable values stored in Elasticsearch FREEDOM config index (not hardcoded):

| Config Key | Default Value | Tier |
|---|---|---|
| `flow12.{tenantId}.isolation_tier` | SHARED | Admin configurable |
| `flow12.{tenantId}.sync_frequency_minutes` | 60 | FREEDOM |
| `flow12.{tenantId}.match_variance_tolerance_pct` | 0.5 | FREEDOM |
| `flow12.{tenantId}.approval_timeout_hours` | 24 | FREEDOM |
| `flow12.{tenantId}.approval_auto_threshold` | 0 (disabled) | FREEDOM |
| `flow12.{tenantId}.erp_provider_type` | SAP_B1_ODATA | FREEDOM |
| `flow12.{tenantId}.sync_entities` | partners,items,warehouses | FREEDOM |
| `flow12.{tenantId}.ledger_encryption_key_ref` | vault://tenants/{id}/kek | FREEDOM |
| `flow12.{tenantId}.quota.erp_api_calls_per_hour` | 1000 | FREEDOM |
| `flow12.{tenantId}.quota.sync_pages_per_job` | 100 | FREEDOM |

### RBAC Roles for FLOW-12

| Role | Permissions |
|---|---|
| `finance_admin` | FinalizeCloseAsync, payment runs, match override, period re-open |
| `ap_clerk` | Create/post AP invoices, resolve match exceptions |
| `ar_clerk` | Create/post AR invoices, record payments |
| `sales_ops` | Create/post sales orders, deliveries |
| `approver` | Approve/reject pending approval gate tasks (T109) |
| `sync_operator` | Trigger master data sync (T105) |
| `viewer` | Read-only access to chains, reports, audit log |

**STATE SAVE P5 ✅**

---

## ═══════════════════════════════════════════════════
## PHASE 6 — FLOW TEMPLATE DAG (Template 20)
## ═══════════════════════════════════════════════════

### Template 20: FLOW-12 ERP Integration Master DAG

Each top-level path is a sub-DAG registered as a nested flow. The master DAG routes to sub-DAGs based on the incoming business event.

```json
{
  "flowId": "flow-12",
  "version": "1.0.0",
  "description": "ERP Systems Integration — O2C, P2P, R2R value streams",
  "orchestrator": "IFlowOrchestrator",
  "entryEvent": "ERPFlowRequested",
  "tenantScoped": true,
  "steps": [
    {
      "stepId": "step-route",
      "taskType": "ROUTE",
      "description": "Route to value stream sub-DAG",
      "factory": null,
      "conditions": [
        {"if": "event.flowType == 'O2C'", "goto": "step-o2c-quote"},
        {"if": "event.flowType == 'P2P'", "goto": "step-p2p-preq"},
        {"if": "event.flowType == 'R2R'", "goto": "step-r2r-init"},
        {"if": "event.flowType == 'BOOTSTRAP'", "goto": "step-bootstrap"},
        {"if": "event.flowType == 'SYNC'", "goto": "step-sync"}
      ]
    },

    {"stepId": "step-bootstrap",
     "taskType": "T108",
     "description": "Multi-Tenant ERP Connection Bootstrap",
     "factories": ["F300", "F292", "F288", "F289", "F297"],
     "onSuccess": "END",
     "onFailure": "DEAD_LETTER"},

    {"stepId": "step-sync",
     "taskType": "T105",
     "description": "Master Data Sync",
     "factories": ["F288", "F289", "F294", "F300", "F303"],
     "onSuccess": "END",
     "onFailure": "RETRY:3"},

    {"stepId": "step-o2c-quote",
     "taskType": "T103",
     "description": "Create Quote document",
     "factories": ["F288", "F290", "F294", "F296", "F301"],
     "context": {"docType": "QUOTE"},
     "onSuccess": "step-o2c-so",
     "onFailure": "step-compensate"},

    {"stepId": "step-o2c-so",
     "taskType": "T103",
     "description": "Create Sales Order",
     "factories": ["F288", "F290", "F294", "F296", "F301"],
     "context": {"docType": "SALES_ORDER"},
     "onSuccess": "step-o2c-approval",
     "onFailure": "step-compensate"},

    {"stepId": "step-o2c-approval",
     "taskType": "T109",
     "description": "Sales Order approval gate",
     "factories": ["F293", "F292", "F301", "F294"],
     "freedom": {"autoApproveBelow": "${config.flow12.approval_auto_threshold}"},
     "onApprove": "step-o2c-delivery",
     "onReject": "step-compensate"},

    {"stepId": "step-o2c-delivery",
     "taskType": "T103",
     "description": "Create Delivery document",
     "factories": ["F288", "F290", "F294", "F296", "F301"],
     "context": {"docType": "DELIVERY"},
     "onSuccess": "step-o2c-invoice",
     "onFailure": "step-compensate"},

    {"stepId": "step-o2c-invoice",
     "taskType": "T103",
     "description": "Create and post A/R Invoice",
     "factories": ["F288", "F290", "F294", "F296", "F301"],
     "context": {"docType": "AR_INVOICE", "requiresApproval": true},
     "onSuccess": "step-o2c-payment",
     "onFailure": "step-compensate"},

    {"stepId": "step-o2c-payment",
     "taskType": "T103",
     "description": "Record incoming payment and clear receivable",
     "factories": ["F288", "F290", "F291", "F294", "F296", "F301"],
     "context": {"docType": "INCOMING_PAYMENT"},
     "onSuccess": "step-analytics-sync",
     "onFailure": "step-compensate"},

    {"stepId": "step-p2p-preq",
     "taskType": "T103",
     "description": "Create Purchase Requisition",
     "context": {"docType": "PURCHASE_REQUISITION"},
     "onSuccess": "step-p2p-approval",
     "onFailure": "step-compensate"},

    {"stepId": "step-p2p-approval",
     "taskType": "T109",
     "description": "Purchase approval gate",
     "onApprove": "step-p2p-po",
     "onReject": "step-compensate"},

    {"stepId": "step-p2p-po",
     "taskType": "T103",
     "context": {"docType": "PURCHASE_ORDER"},
     "onSuccess": "step-p2p-gr",
     "onFailure": "step-compensate"},

    {"stepId": "step-p2p-gr",
     "taskType": "T103",
     "context": {"docType": "GOODS_RECEIPT"},
     "onSuccess": "step-p2p-match",
     "onFailure": "step-compensate"},

    {"stepId": "step-p2p-match",
     "taskType": "T104",
     "description": "Three-Way Match Gate",
     "factories": ["F298", "F290", "F293", "F301"],
     "onFullMatch": "step-p2p-invoice",
     "onVariance": "step-p2p-match-approval",
     "onMismatch": "ALERT_AND_BLOCK"},

    {"stepId": "step-p2p-match-approval",
     "taskType": "T109",
     "description": "Match exception approval (finance_admin required for override)",
     "onApprove": "step-p2p-invoice",
     "onReject": "step-compensate"},

    {"stepId": "step-p2p-invoice",
     "taskType": "T103",
     "context": {"docType": "AP_INVOICE"},
     "onSuccess": "step-p2p-payment",
     "onFailure": "step-compensate"},

    {"stepId": "step-p2p-payment",
     "taskType": "T103",
     "context": {"docType": "OUTGOING_PAYMENT"},
     "onSuccess": "step-analytics-sync",
     "onFailure": "step-compensate"},

    {"stepId": "step-r2r-init",
     "taskType": "T106",
     "description": "Period-End Close Routine (R2R)",
     "factories": ["F299", "F291", "F293", "F301", "F302"],
     "onSuccess": "step-analytics-sync",
     "onFailure": "step-compensate"},

    {"stepId": "step-compensate",
     "taskType": "T107",
     "description": "Reversal/Compensation Step",
     "factories": ["F295", "F291", "F290", "F301", "F294"],
     "onSuccess": "END_COMPENSATED",
     "onFailure": "DEAD_LETTER"},

    {"stepId": "step-analytics-sync",
     "taskType": "T110",
     "description": "Sync ERP events to analytics index (derived)",
     "factories": ["F302", "F296", "F301"],
     "onSuccess": "END",
     "onFailure": "RETRY:3"}
  ]
}
```

### UI Fabric-First Pattern (All Platforms)

```json
{
  "uiContract": "FLOW_12_FORM_SCHEMA",
  "philosophy": "Zero platform-specific values in schema",
  "fields": [
    {"id": "erpProviderType", "type": "FREEDOM_SELECT",
     "label": "ERP System Type",
     "optionsSource": "config:flow12.erp_provider_options",
     "default": "config:flow12.{tenantId}.erp_provider_type"},

    {"id": "isolationTier", "type": "FREEDOM_SELECT",
     "label": "Data Isolation Tier",
     "optionsSource": "config:flow12.isolation_tier_options",
     "roles": ["admin"]},

    {"id": "syncEntities", "type": "FREEDOM_MULTI_SELECT",
     "label": "Master Data to Sync",
     "optionsSource": "config:flow12.sync_entity_options"},

    {"id": "matchVarianceTolerance", "type": "FREEDOM_NUMBER",
     "label": "Three-Way Match Variance Tolerance (%)",
     "source": "config:flow12.{tenantId}.match_variance_tolerance_pct"},

    {"id": "approvalTimeout", "type": "FREEDOM_DURATION",
     "label": "Approval Gate Timeout",
     "source": "config:flow12.{tenantId}.approval_timeout_hours"},

    {"id": "webhookEndpoint", "type": "FABRIC_ENDPOINT",
     "label": "Work Platform Webhook URL",
     "generated": true,
     "verification": "T108.VerifyWebhookEndpoint"}
  ],
  "note": "No hardcoded URLs, credentials, or platform names. All options from FREEDOM config index."
}
```

**STATE SAVE P6 ✅**

---

## ═══════════════════════════════════════════════════
## PHASE 7 — DNA COMPLIANCE DECLARATION + STATE SAVE
## ═══════════════════════════════════════════════════

### All 9 DNA Patterns Applied to FLOW-12

| DNA | Pattern | FLOW-12 Application |
|---|---|---|
| DNA-1 | ParseDocument (Dictionary only) | No SalesOrder, Invoice, Partner typed classes. All ERP entities as Dictionary<string,object>. Engine rejects typed ERP models at AF-7. |
| DNA-2 | BuildSearchFilter (skip empty) | All F288–F303 calls to IDatabaseService use BuildSearchFilter. F289, F290, F291, F298, F302 all produce empty-field-aware queries. |
| DNA-3 | DataProcessResult<T> | ALL 16 factories return DataProcessResult<T>. AF-7 rejects any method that throws for business logic. Exceptions only for infrastructure failures. |
| DNA-4 | MicroserviceBase | Every generated ERP service extends MicroserviceBase. Gets: DB access, Queue pub/sub, Cache, Auth, Scope isolation, Health checks, Logging, Config, Permissions, ObjectProcessor — free. |
| DNA-5 | Scope Isolation | TenantId on every F288–F303 call. FactoryResolutionContext carries tenantId. CF-98 enforces cross-factory tenant consistency. |
| DNA-6 | DynamicController | No InvoiceController, OrderController, PartnerController. Single DynamicController routes by flow/step/docType from config. |
| DNA-7 | Factory Pattern | All 16 FLOW-12 factories use IExternalServiceFactory<TService>.CreateAsync(). Never new(). Never direct import. |
| DNA-8 | Config-First Routing | All provider selection (which DB tier, which ERP provider, which AI model) reads from FREEDOM config index first. |
| DNA-9 | Scope Isolation at Queue Level | F293 saga streams namespaced: "{tenantId}.erp.{sagaType}". F296 outbox streams: "{tenantId}.erp.outbox". Consumer groups: "erp-{tenantId}-{sagaType}-cg". |

### Backward Compatibility Verification

```
F1–F287:  UNCHANGED — FLOW-12 adds F288–F303 (new range, no conflicts)
T1–T102:  UNCHANGED — FLOW-12 adds T103–T110 (new range, no conflicts)
CF-1–CF-95: UNCHANGED — FLOW-12 adds CF-96–CF-107 (new range)
Templates 1–19: UNCHANGED — FLOW-12 adds Template 20
Families 1–31: UNCHANGED — FLOW-12 adds Family 32
Stress Tests 1–46: New tests ST-47–ST-53 to be added in P4 run
```

### Stress Test Stubs for FLOW-12 (ST-47–ST-53)

```
ST-47: Double-posting prevention — call PostDocumentAsync twice with same idempotencyKey
       EXPECTED: second call returns cached result from F294, no duplicate document
       
ST-48: Saga compensation path — force failure at O2C step-3 (Delivery)
       EXPECTED: T107 reverses SO and Quote; both original docs status=CANCELLED

ST-49: Three-way match block — submit APInvoice before GR exists in chain
       EXPECTED: CF-100 violation detected; saga blocked; no invoice created

ST-50: Period close with pending outbox — attempt FinalizeCloseAsync with pending events
       EXPECTED: CF-104 fires; close blocked; pending count returned in error

ST-51: Cross-tenant document reference — T104 with PO from tenantA and GR from tenantB
       EXPECTED: CF-99 fires; match blocked; audit entry created

ST-52: B1SESSION expiry during sync — session returns 401 mid-page
       EXPECTED: F288 transparently re-authenticates; sync continues from watermark; no session token in logs

ST-53: Analytics-as-ledger violation — attempt to PostJournalEntry reading from F302 analytics index
       EXPECTED: CF-107 fires; AF-9 Judge BUILD FAILURE; generation blocked
```

---

## ═══════════════════════════════════════════════════
## GLOBAL STATE SAVE — FLOW-12 COMPLETE
## ═══════════════════════════════════════════════════

```
══════════════════════════════════════════════
FLOW-12 ERP SYSTEMS ENGINE EXTENSION
STATUS: PLAN COMPLETE — READY FOR EXECUTION
══════════════════════════════════════════════

FACTORIES:   F288–F303  (16 added | total now: F1–F303)
TASK TYPES:  T103–T110  (8 added  | total now: T1–T110)
FAMILY:      32         (1 added  | total now: 1–32)
BFA RULES:   CF-96–CF-107  (12 added | total now: CF-1–CF-107)
STRESS TESTS: ST-47–ST-53 (7 stubs  | total now: ST-1–ST-53)
TEMPLATE:    Template 20  (1 added  | total now: T1–T20)

MERGED FILE UPDATE TARGETS:
  ENGINE_ARCHITECTURE_MERGED.md   → ADD: F288–F303, Family 32
  TASK_TYPES_CATALOG_MERGED.md    → ADD: T103–T110, Template 20
  V62_BFA_STRESS_TEST_MERGED.md   → ADD: CF-96–CF-107, ST-47–ST-53
  SESSION_STATE_MERGE.md          → UPDATE: FLOW-12 COMPLETE

RECOVERY COMMANDS:
  Resume Phase 1: grep "STATE SAVE P0" → start from PHASE 1 header
  Resume Phase 2: grep "STATE SAVE P1" → start from PHASE 2 header
  Resume Phase 3: grep "STATE SAVE P2" → start from PHASE 3 header
  Resume Phase 4: grep "STATE SAVE P3" → start from PHASE 4 header
  Resume Phase 5: grep "STATE SAVE P4" → start from PHASE 5 header
  Resume Phase 6: grep "STATE SAVE P5" → start from PHASE 6 header
  Resume Phase 7: grep "STATE SAVE P6" → start from PHASE 7 header

VALUE STREAMS ENABLED BY FLOW-12:
  ✅ Order-to-Cash (O2C)
  ✅ Procure-to-Pay (P2P) with Three-Way Match Gate
  ✅ Record-to-Report (R2R) with Period Close
  ✅ Master Data Sync (incremental, watermark-based)
  ✅ Multi-Tenant Connection Bootstrap
  ✅ Derived Analytics (non-authoritative reporting)

NEXT FLOW STARTING POINTS:
  FLOW-13: F304+ | T111+ | CF-108+ | ST-54+ | Family 33+
══════════════════════════════════════════════
```
