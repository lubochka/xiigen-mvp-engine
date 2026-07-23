# FLOW-12 — ERP Systems Engine Extension
## XIIGen Fabric-First Engine Contract | Multi-Tenant Adapted
### Based on: 12_-_ERP_systems.md, 12_-_ERP_systems_deep_search.md, 12_-_ERP_systems_deep_search_engine.md, multi-tenant-support.md

---

## PHASE 0 — RAG MINI-INDEX (AF-4 Source Map)

AF-4 (Task Context RAG) uses this index when generating FLOW-12 services.
Every cited source is grounded in the uploaded specification files.

| Source Document | Engine Contribution | Key Patterns AF-4 Retrieves |
|---|---|---|
| 12_-_ERP_systems.md | ERP module mental model, 6 value streams (R2R, O2C, P2P, P2Produce, Service2Cash, Project2Profit), document chain topology | Shared master data schema, transactional document chain, financial posting rules |
| 12_-_ERP_systems_deep_search.md | Canonical data models (erp_document, journal_entry, process_instance, idempotency_key, outbox), reliability patterns, OAuth/RBAC design, SAP OData connector constraints | Saga orchestration, transactional outbox, idempotency key pattern, reversal-not-delete semantics |
| 12_-_ERP_systems_deep_search_engine.md | Flow runtime requirements (state machine, approval steps, timer steps, compensation paths), CloudEvents envelope, SAP B1SESSION session handling, monday.com GraphQL rate limits | Durable retry/backoff, webhook challenge-response, document reversal artifact, rate-limit-aware execution |
| multi-tenant-support.md | Hybrid isolation strategy (shared-schema baseline, separate-schema for regulated, separate-instance for enterprise), tenant control plane vs data plane, per-tenant KEK, RLS enforcement, OTLP tenant labels | TenantId propagation, object-level authorization, tenant-scoped quotas, noisy-neighbor guardrails |
| Skill 04 (IQueueService) | Redis Streams consumer groups, Main→Consumed→Archive→DLQ | Saga step event routing |
| Skill 05 (IDatabaseService) | 6 DB providers, BuildSearchFilter, DataProcessResult<T> | ERP document storage, tenant-routed schema selection |
| Skill 06/07 (IAiProvider + AiDispatcher) | Multi-model generation, consensus aggregation | ERP code generation + review |
| Skill 08/09 (IFlowDefinition + IFlowOrchestrator) | JSON DAG execution, step-by-step orchestration | FLOW-12 DAG template |
| Skill 01 (MicroserviceBase) | 19 inherited components | ALL generated ERP services extend this |

**Skill Gap Analysis**: No existing skill covers SAP OData session management or monday.com GraphQL rate-limit budgets. These are modeled as config-driven connector behaviors within the DATABASE and QUEUE fabrics respectively — no new skills needed; the engine generates the adapter layer on top of existing fabrics.

---

## PHASE 1 — NEW FACTORY INTERFACES (F225–F240)

**Rule**: Every interface resolves through an existing FABRIC via `CreateAsync(FactoryResolutionContext)`. Service code never imports SAP, monday.com, or any provider SDK directly.

### F225: IERPConnectorService
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → provider selected per tenant config
  Default: Elasticsearch (ERP document index)
  Enterprise tier: PostgreSQL (separate schema with RLS)
  Fallback: MongoDB (document-native)
PURPOSE: Adapter for external ERP API (SAP B1 OData v4 model)
  - Abstracts OData v3/v4 protocol differences
  - Manages B1SESSION cookie lifecycle (re-login on 401)
  - Handles sticky routing (ROUTEID)
  - All ERP entity calls return DataProcessResult<Dictionary<string,object>>
METHODS:
  ConnectAsync(tenantId, connectionConfig) → DataProcessResult<ConnectionToken>
  QueryEntitiesAsync(tenantId, entitySet, filters) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
  CreateDocumentAsync(tenantId, docType, payload, idempotencyKey) → DataProcessResult<Dictionary<string,object>>
  CancelDocumentAsync(tenantId, docId, reversalPayload) → DataProcessResult<Dictionary<string,object>>
MULTI-TENANT: FactoryResolutionContext.TenantId routes to tenant-specific connection pool
IRON RULE: Never throw for business logic — always DataProcessResult<T>
```

### F226: IMasterDataService
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Elasticsearch primary, PostgreSQL for regulated tenants
PURPOSE: Canonical representation of ERP master data (partners, items, warehouses)
  - Tenant-isolated master data store
  - Incremental sync via watermarks from ERP
  - Read-mostly path with cache-aside (Redis via Cache component in MicroserviceBase)
METHODS:
  UpsertPartnerAsync(tenantId, partnerData) → DataProcessResult<string> (partnerId)
  UpsertItemAsync(tenantId, itemData) → DataProcessResult<string>
  SearchPartnersAsync(tenantId, filters) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
  GetExternalMappingAsync(tenantId, systemType, externalId) → DataProcessResult<string>
MULTI-TENANT: Every record has tenantId; BuildSearchFilter auto-skips empty tenantId param
```

### F227: IDocumentChainService
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL (append-only, immutable once posted)
  Enterprise: separate schema per tenant (t_{tenantId}.erp_document)
PURPOSE: Manages the transactional document graph (O2C: Quote→SO→Delivery→Invoice→Payment;
         P2P: PReq→PO→GR→APInvoice→Payment)
  - Creates document chain links (from_doc_id → to_doc_id → link_type)
  - Enforces chain integrity (no circular chains, no posting without predecessor)
  - Immutable once status = POSTED; corrections via F232:IReversalService
METHODS:
  CreateDocumentAsync(tenantId, docType, parentDocId, payload, idempotencyKey) → DataProcessResult<string>
  PostDocumentAsync(tenantId, docId, approverContext) → DataProcessResult<Dictionary<string,object>>
  GetChainAsync(tenantId, rootDocId) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
  ValidateChainIntegrityAsync(tenantId, docId) → DataProcessResult<bool>
MULTI-TENANT: All queries include tenantId scope; RLS policy enforced at DB level for regulated tenants
IRON RULE: PostDocumentAsync requires idempotencyKey — BUILD FAILURE if absent
```

### F228: ILedgerService
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL (append-only journal_entry table)
PURPOSE: Universal Journal pattern — single source of truth for financial postings
  - All operational document postings create immutable journal entries
  - journal_entry rows are WORM (write-once, read-many)
  - Correction = new reversal journal_entry referencing original
  - Derived analytics index synced to Elasticsearch via outbox
METHODS:
  PostJournalEntryAsync(tenantId, sourceDocId, lines, idempotencyKey) → DataProcessResult<string>
  GetJournalEntriesAsync(tenantId, filters) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
  ReconcileAsync(tenantId, periodId) → DataProcessResult<Dictionary<string,object>>
  ReverseEntryAsync(tenantId, originalJeId, reason, idempotencyKey) → DataProcessResult<string>
MULTI-TENANT: Separate schema for enterprise/regulated (finance module: separate instance preferred)
             Per-tenant KEK for at-rest encryption of ledger data
```

### F229: IWorkPlatformConnectorService
```
FABRIC RESOLUTION: AI ENGINE FABRIC (Skill 07) → GraphQL provider abstraction
  Treats monday.com GraphQL API as one provider implementation
  Config-driven: swap to other work platforms without code change
PURPOSE: Connector to external work platform (approval workflows, intake, coordination)
  - Manages OAuth 2.0 token lifecycle (PKCE for browser flows)
  - Handles GraphQL complexity budget rate limiting (retry_in_seconds)
  - Webhook URL verification (challenge echo) as first-class method
  - JWT signature verification for signed webhook events
METHODS:
  VerifyWebhookEndpointAsync(tenantId, challenge) → DataProcessResult<string> (echoes challenge)
  VerifyWebhookSignatureAsync(tenantId, jwtToken, signingSecret) → DataProcessResult<bool>
  QueryBoardAsync(tenantId, graphqlQuery, variables) → DataProcessResult<Dictionary<string,object>>
  MutateItemAsync(tenantId, mutation, variables, idempotencyKey) → DataProcessResult<Dictionary<string,object>>
  GetRateLimitStatusAsync(tenantId) → DataProcessResult<Dictionary<string,object>>
MULTI-TENANT: OAuth tokens stored via per-tenant secret reference (never raw in DB)
```

### F230: ISagaCoordinatorService
```
FABRIC RESOLUTION: QUEUE FABRIC (Skill 04) → Redis Streams consumer groups
PURPOSE: Durable saga orchestration for multi-step ERP flows
  - Maintains process_instance state (O2C, P2P, R2R, etc.)
  - Persists step execution state (process_step table) with retry metadata
  - Drives compensating actions on failure (via F232:IReversalService)
  - Correlation ID stable across retries and replays
METHODS:
  StartSagaAsync(tenantId, sagaType, correlationId, initialPayload) → DataProcessResult<string>
  AdvanceStepAsync(tenantId, sagaId, stepName, result) → DataProcessResult<Dictionary<string,object>>
  CompensateAsync(tenantId, sagaId, fromStepName) → DataProcessResult<bool>
  GetSagaStateAsync(tenantId, correlationId) → DataProcessResult<Dictionary<string,object>>
MULTI-TENANT: CorrelationId always prefixed with tenantId: "{tenantId}:{businessKey}"
IRON RULE: StartSagaAsync requires correlationId — BUILD FAILURE if absent
```

### F231: IIdempotencyService
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Redis (fast lookup) with PostgreSQL fallback
PURPOSE: Prevents double-posting across retries and duplicate webhook deliveries
  - Stores (tenantId, key, requestHash, resultRef, expiresAt)
  - Returns cached result if key already processed (idempotent replay)
  - Invalidates keys after configurable TTL
METHODS:
  CheckOrCreateAsync(tenantId, key, requestHash) → DataProcessResult<IdempotencyCheckResult>
  StoreResultAsync(tenantId, key, resultRef) → DataProcessResult<bool>
  InvalidateAsync(tenantId, key) → DataProcessResult<bool>
MULTI-TENANT: Unique constraint on (tenantId, key) — cross-tenant key collision impossible
```

### F232: IReversalService
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → same fabric as F227:IDocumentChainService
PURPOSE: Implements reversal-not-delete semantics
  - Creates cancellation document referencing original (audit trail preserved)
  - Reverses all chain links from the cancelled document onward
  - Posts reversal journal entry via F228:ILedgerService
  - Marks original as status=CANCELLED (never deleted)
METHODS:
  ReverseDocumentAsync(tenantId, originalDocId, reason, idempotencyKey) → DataProcessResult<string>
  GetReversalHistoryAsync(tenantId, originalDocId) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
IRON RULE: Original document is NEVER deleted — BUILD FAILURE if DELETE called on posted doc
```

### F233: IOutboxPublisherService
```
FABRIC RESOLUTION: QUEUE FABRIC (Skill 04) → Redis Streams
PURPOSE: Transactional outbox pattern — eliminates dual-write risk
  - Outbox row written in SAME DB transaction as aggregate update
  - Background relay publishes to queue and marks published_at
  - Guarantees at-least-once event delivery
METHODS:
  WriteToOutboxAsync(tenantId, aggregateId, eventType, payload) → DataProcessResult<string>
  RelayPendingAsync(tenantId, batchSize) → DataProcessResult<int> (count published)
  GetPendingCountAsync(tenantId) → DataProcessResult<int>
MULTI-TENANT: All outbox rows include tenantId; relay worker is tenant-aware
```

### F234: IWebhookGatewayService
```
FABRIC RESOLUTION: QUEUE FABRIC (Skill 04) → Redis Streams (webhook events → Main stream)
PURPOSE: Ingests, verifies, and deduplicates inbound webhook events
  - Challenge-response verification on setup (work platform requirement)
  - JWT signature verification on event receipt
  - Deduplication via F231:IIdempotencyService (event_id as key)
  - Routes normalized events to FLOW-12 saga via F230:ISagaCoordinatorService
METHODS:
  HandleChallengeAsync(challenge) → DataProcessResult<string>
  IngestEventAsync(tenantId, headers, rawPayload) → DataProcessResult<string>
  GetEventStatusAsync(tenantId, eventId) → DataProcessResult<Dictionary<string,object>>
IRON RULE: No event processed without signature verification — BUILD FAILURE if verification skipped
```

### F235: IThreeWayMatchService
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Elasticsearch (match analysis index)
PURPOSE: Validates PO ↔ GoodsReceipt ↔ VendorInvoice three-way match (P2P chain)
  - Compares quantities, amounts, and item codes across the three documents
  - Returns match status: FULL_MATCH, QUANTITY_VARIANCE, PRICE_VARIANCE, MISMATCH
  - Triggers exception workflow via F230:ISagaCoordinatorService on mismatch
METHODS:
  MatchAsync(tenantId, poId, grId, invoiceId) → DataProcessResult<Dictionary<string,object>>
  GetMatchHistoryAsync(tenantId, docId) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
MULTI-TENANT: Match records scoped to tenantId; BuildSearchFilter skips empty fields
```

### F236: IPeriodCloseService
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → PostgreSQL (ledger) + Elasticsearch (analytics)
PURPOSE: Orchestrates period-end closing (Record-to-Report)
  - Currency revaluation (exchange rate adjustments as journal entries)
  - Accruals (expenses not yet invoiced posted as journal entries)
  - Balance validation before close (debit=credit enforcement)
  - Marks period as CLOSED (immutable); re-open creates new reversal period
METHODS:
  InitiateCloseAsync(tenantId, periodId, idempotencyKey) → DataProcessResult<string>
  RevalueAsync(tenantId, periodId, exchangeRates) → DataProcessResult<Dictionary<string,object>>
  PostAccrualsAsync(tenantId, periodId, accruals, idempotencyKey) → DataProcessResult<bool>
  FinalizeCloseAsync(tenantId, periodId) → DataProcessResult<Dictionary<string,object>>
IRON RULE: FinalizeCloseAsync irreversible — requires explicit approval token in context
```

### F237: IERPTenantConnectionRegistry
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Elasticsearch (tenant config index)
PURPOSE: Manages per-tenant ERP connection configurations
  - Stores connection metadata (base_url, scopes, status) — NEVER raw secrets
  - Maps to secret vault references (secret_ref) for credentials
  - Supports multiple ERP instances per tenant (e.g., test vs production)
  - Provides health-check status per connection
METHODS:
  RegisterConnectionAsync(tenantId, connectionConfig) → DataProcessResult<string>
  GetConnectionAsync(tenantId, connectionId) → DataProcessResult<Dictionary<string,object>>
  HealthCheckAsync(tenantId, connectionId) → DataProcessResult<Dictionary<string,object>>
  RevokeConnectionAsync(tenantId, connectionId) → DataProcessResult<bool>
MULTI-TENANT: Primary key is (tenantId, connectionId) — strict isolation
```

### F238: IAuditLedgerService
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Elasticsearch (append-only audit index)
PURPOSE: WORM-equivalent audit log for all ERP actions (who, what, when, tenantId, objectRef, diff)
  - Every PostDocument, ReverseDocument, PeriodClose writes audit entry
  - Tenant-scoped; tamper-evident (hash chain optional for enterprise)
  - SOC 2 processing integrity and GDPR accountability coverage
METHODS:
  WriteAuditAsync(tenantId, actorId, action, objectRef, diff) → DataProcessResult<string>
  QueryAuditAsync(tenantId, filters) → DataProcessResult<IEnumerable<Dictionary<string,object>>>
IRON RULE: WriteAuditAsync called BEFORE returning success from any state-changing operation
```

### F239: IERPReportingService
```
FABRIC RESOLUTION: RAG FABRIC (Skill 00b) → Hybrid strategy (in-memory + Elasticsearch)
  Treats reporting queries as retrieval tasks against derived analytics index
PURPOSE: Cross-flow ERP reporting (O2C pipeline status, aged receivables, inventory turns, P&L)
  - Reads from derived analytics index (NOT authoritative ledger)
  - Reports always labeled "mirrored_from_erp" if sourced from ERP sync
  - Provides reconciliation gap analysis (internal vs ERP totals)
METHODS:
  GetO2CPipelineAsync(tenantId, filters) → DataProcessResult<Dictionary<string,object>>
  GetAgedReceivablesAsync(tenantId, asOfDate) → DataProcessResult<Dictionary<string,object>>
  GetProfitabilityAsync(tenantId, projectId, filters) → DataProcessResult<Dictionary<string,object>>
  ReconcileWithERPAsync(tenantId, periodId) → DataProcessResult<Dictionary<string,object>>
MULTI-TENANT: Reports never cross tenantId boundary; BuildSearchFilter enforces
```

### F240: ITenantQuotaEnforcerService
```
FABRIC RESOLUTION: DATABASE FABRIC (Skill 05) → Redis (fast counter lookups)
PURPOSE: Per-tenant resource quota enforcement (noisy-neighbor prevention)
  - Tracks: API calls/min, workflow steps/day, document postings/hour, webhook events/min
  - Returns 429 behavior via DataProcessResult<T> (never throw) when quota exceeded
  - Quota config loaded from tenant config index (FREEDOM layer)
  - Enterprise tiers have higher quotas; shared-schema tenants share infrastructure pool
METHODS:
  CheckQuotaAsync(tenantId, quotaType, increment) → DataProcessResult<QuotaCheckResult>
  GetUsageAsync(tenantId, quotaType, window) → DataProcessResult<Dictionary<string,object>>
  ResetCounterAsync(tenantId, quotaType) → DataProcessResult<bool>
MULTI-TENANT: Redis key format: "quota:{tenantId}:{quotaType}:{window}" — strict isolation
```

---

## PHASE 2 — NEW ENGINE CONTRACTS (T72–T79)

### TASK TYPE: T72 — ERP Document Chain Step
```
ARCHETYPE: STATEFUL_ORCHESTRATION
ENTRY: Fires when ISagaCoordinatorService advances to a document-creation step
PURPOSE: Creates a single document in the ERP chain (Quote, SO, Delivery, Invoice, PO, GR, etc.)
         with idempotency guarantee and compensation path
DISTINCT FROM:
  T40 (Three-Way Join Gate) — T72 is linear chain step, not parallel convergence
  T33 (2-way convergence) — T72 creates new documents, not merges
FACTORY DEPENDENCIES:
  F225:IERPConnectorService — resolved via CreateAsync()
  F227:IDocumentChainService — resolved via CreateAsync()
  F231:IIdempotencyService — resolved via CreateAsync()
  F233:IOutboxPublisherService — resolved via CreateAsync()
  F238:IAuditLedgerService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F225 → DATABASE FABRIC (Skill 05) → provider per tenant config
  F227 → DATABASE FABRIC (Skill 05) → PostgreSQL (append-only)
  F231 → DATABASE FABRIC (Skill 05) → Redis + PostgreSQL fallback
  F233 → QUEUE FABRIC (Skill 04) → Redis Streams
  F238 → DATABASE FABRIC (Skill 05) → Elasticsearch (audit index)
AF CONFIGURATION:
  AF-1 Genesis: generates IDocumentChainService implementation on DATABASE FABRIC
  AF-4 RAG: retrieves idempotency key pattern from F231 + outbox pattern from F233
  AF-7 Compliance: validates DNA-1 (no typed ERP models), DNA-3 (DataProcessResult), DNA-5 (tenantId scope)
  AF-9 Judge: validates idempotencyKey present, auditLog written, no direct provider import
BFA VALIDATION:
  Check: Does parent document exist in chain? (CF-42)
  Check: Is idempotencyKey unique for this (tenantId, correlationId, step)? (CF-43)
  Check: Does tenantId match across all factories in this step? (CF-44)
MACHINE (fixed):
  - idempotencyKey format: "{docType}:{correlationId}:{stepName}"
  - Retry policy: 5 attempts, exponential backoff, max 30 min
  - On permanent failure: COMPENSATE → T77 (Reversal/Compensation Step)
  - Audit entry written synchronously before returning result
FREEDOM (configurable):
  - Which DB provider resolves F225 (Elasticsearch, PostgreSQL, MongoDB)
  - Timeout per step (default 300s, max 3600s)
  - Approval required before POSTED status (enable/disable per docType)
IRON RULES:
  - idempotencyKey MUST be present → BUILD FAILURE
  - tenantId MUST be in FactoryResolutionContext → BUILD FAILURE
  - DataProcessResult<T> on ALL paths — never throw → BUILD FAILURE
  - No direct import of SAP SDK, monday SDK, or any ERP provider → BUILD FAILURE
  - Original document NEVER deleted (reversal only) → BUILD FAILURE
QUALITY GATES (AF-9 Judge):
  - PostDocument only allowed after parent document exists in chain
  - Status POSTED requires approvalToken in context (if approval enabled)
  - Outbox entry written in same logical unit as document creation
  - Audit log entry present for every POSTED transition
```

### TASK TYPE: T73 — Three-Way Match Gate
```
ARCHETYPE: VALIDATION_GATE
ENTRY: Fires after GoodsReceipt (GR) created in P2P chain; blocks APInvoice posting until match confirmed
PURPOSE: Validates PO ↔ GR ↔ Vendor Invoice alignment; routes to exception workflow on mismatch
DISTINCT FROM:
  T40 (Three-Way Join Gate) — T73 is a validation gate, not a parallel convergence merge
  T72 (ERP Document Chain Step) — T73 reads documents, does not create them
FACTORY DEPENDENCIES:
  F235:IThreeWayMatchService — resolved via CreateAsync()
  F227:IDocumentChainService — resolved via CreateAsync()
  F230:ISagaCoordinatorService — resolved via CreateAsync()
  F238:IAuditLedgerService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F235 → DATABASE FABRIC (Skill 05) → Elasticsearch (match analysis index)
  F227 → DATABASE FABRIC (Skill 05) → PostgreSQL
  F230 → QUEUE FABRIC (Skill 04) → Redis Streams
  F238 → DATABASE FABRIC (Skill 05) → Elasticsearch (audit)
AF CONFIGURATION:
  AF-2 Planning: decomposes into: fetch PO, fetch GR, fetch Invoice, run match, branch on result
  AF-4 RAG: retrieves branching/decision step patterns from T31/T32 in skill library
  AF-9 Judge: validates that MISMATCH path routes to human exception task (not silent fail)
BFA VALIDATION:
  Check: Are PO, GR, Invoice all belonging to same tenantId? (CF-44 — cross-tenant document prevention)
  Check: Does GR reference the PO in chain? (CF-42 — chain integrity)
  Check: Amount variance within tolerance? (CF-45 — configurable tolerance threshold)
MACHINE (fixed):
  - Match statuses: FULL_MATCH, QUANTITY_VARIANCE, PRICE_VARIANCE, MISMATCH
  - FULL_MATCH → advance saga to APInvoice posting step
  - QUANTITY/PRICE_VARIANCE → route to human exception task (T78: Approval Gate)
  - MISMATCH → block saga; emit alert event; require manual resolution
FREEDOM (configurable):
  - Variance tolerance % (per tenant, per item category)
  - Auto-approve minor variances under threshold
  - Exception assignee role (default: ap_clerk)
IRON RULES:
  - MISMATCH must NEVER silently advance to posting → BUILD FAILURE
  - APInvoice posting blocked until match status = FULL_MATCH or manually overridden → BUILD FAILURE
  - Override requires approvalToken with role = finance_admin → BUILD FAILURE
QUALITY GATES (AF-9 Judge):
  - Match result stored and auditable
  - Variance amounts captured in match record
  - Every match invocation uses tenantId from context — never inferred
```

### TASK TYPE: T74 — Master Data Sync Step
```
ARCHETYPE: INTEGRATION_SYNC
ENTRY: Triggered by schedule OR connection setup event (F237:IERPTenantConnectionRegistry)
PURPOSE: Incremental sync of ERP master data (partners, items, warehouses) into canonical store
         with watermark-based pagination and deduplication
DISTINCT FROM:
  T72 (document chain step) — T74 syncs reference data, not transactional documents
FACTORY DEPENDENCIES:
  F225:IERPConnectorService — resolved via CreateAsync()
  F226:IMasterDataService — resolved via CreateAsync()
  F231:IIdempotencyService — resolved via CreateAsync()
  F237:IERPTenantConnectionRegistry — resolved via CreateAsync()
  F240:ITenantQuotaEnforcerService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F225 → DATABASE FABRIC (Skill 05) → per-tenant ERP provider
  F226 → DATABASE FABRIC (Skill 05) → Elasticsearch (master data index)
  F231 → DATABASE FABRIC (Skill 05) → Redis
  F237 → DATABASE FABRIC (Skill 05) → Elasticsearch (config)
  F240 → DATABASE FABRIC (Skill 05) → Redis (quota counters)
AF CONFIGURATION:
  AF-1 Genesis: generates sync service using OData watermark pagination on F225
  AF-4 RAG: retrieves incremental sync patterns from existing skill library
  AF-7 Compliance: validates BuildSearchFilter used, no typed partner/item models
MACHINE (fixed):
  - OData $filter with $orderby and $skiptoken for pagination
  - B1SESSION re-authentication on 401 (transparent to service logic)
  - Watermark persisted after each page (checkpoint)
  - Deduplication via F231 (sync_job:{tenantId}:{entitySet}:{watermark})
FREEDOM (configurable):
  - Sync frequency (default: hourly; enterprise: real-time event-driven)
  - Entities to sync (partners, items, warehouses — toggleable per tenant)
  - ERP provider type (SAP OData, generic REST, etc.)
IRON RULES:
  - Quota check via F240 BEFORE each sync page → BUILD FAILURE if skipped
  - B1SESSION renewal never stores session token in plain log → BUILD FAILURE if logged
  - PII fields (tax_id, addresses) always encrypted at rest via tenant KEK → BUILD FAILURE if not
```

### TASK TYPE: T75 — Period-End Close Routine
```
ARCHETYPE: SCHEDULED_WORKFLOW
ENTRY: Triggered by schedule event OR manual initiation with periodId + approvalToken
PURPOSE: Automates Record-to-Report close activities (revaluation, accruals, balance validation, close seal)
DISTINCT FROM:
  T72 (single document step) — T75 is a multi-step coordinated accounting workflow
FACTORY DEPENDENCIES:
  F236:IPeriodCloseService — resolved via CreateAsync()
  F228:ILedgerService — resolved via CreateAsync()
  F230:ISagaCoordinatorService — resolved via CreateAsync()
  F238:IAuditLedgerService — resolved via CreateAsync()
  F239:IERPReportingService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F236 → DATABASE FABRIC (Skill 05) → PostgreSQL (ledger, append-only)
  F228 → DATABASE FABRIC (Skill 05) → PostgreSQL (journal entries)
  F230 → QUEUE FABRIC (Skill 04) → Redis Streams
  F238 → DATABASE FABRIC (Skill 05) → Elasticsearch (audit)
  F239 → RAG FABRIC (Skill 00b) → Hybrid (reporting index)
AF CONFIGURATION:
  AF-1 Genesis: generates PeriodCloseService as saga steps on F236 + F228
  AF-2 Planning: decomposes into: init → revalue → post-accruals → validate-balance → seal
  AF-9 Judge: validates FinalizeCloseAsync requires approvalToken; period seal is irreversible
BFA VALIDATION:
  Check: Are all O2C/P2P documents for period in terminal state before close? (CF-46)
  Check: Journal debit totals = credit totals for period? (CF-47)
  Check: No pending outbox events for period? (CF-48)
MACHINE (fixed):
  - Close sequence: INIT → REVALUE → ACCRUE → VALIDATE → SEAL
  - Each step is idempotent (can be retried safely)
  - FinalizeCloseAsync requires: approvalToken (role=finance_admin), balance_check=PASSED
  - Sealed period creates immutable snapshot; re-open creates reversal period
FREEDOM (configurable):
  - Which exchange rate source for revaluation (per tenant)
  - Accrual rules (config document in FREEDOM layer)
  - Auto-close if balance check passes (enterprise toggle)
IRON RULES:
  - Period cannot be sealed if unresolved P2P mismatches exist → BUILD FAILURE
  - Reversal of closed period creates NEW period (never delete/modify closed period) → BUILD FAILURE
  - FinalizeCloseAsync without approvalToken = BUILD FAILURE
```

### TASK TYPE: T76 — Reversal / Compensation Step
```
ARCHETYPE: COMPENSATION
ENTRY: Fires when ISagaCoordinatorService calls CompensateAsync OR manual reversal initiated
PURPOSE: Creates cancellation/reversal artifact for any previously posted document
         Preserves audit trail; reverses chain links; posts reversal journal entry
DISTINCT FROM:
  T72 (document creation) — T76 creates reversal documents as compensation for T72
FACTORY DEPENDENCIES:
  F232:IReversalService — resolved via CreateAsync()
  F228:ILedgerService — resolved via CreateAsync()
  F227:IDocumentChainService — resolved via CreateAsync()
  F238:IAuditLedgerService — resolved via CreateAsync()
  F231:IIdempotencyService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F232 → DATABASE FABRIC (Skill 05) → PostgreSQL (same fabric as F227)
  F228 → DATABASE FABRIC (Skill 05) → PostgreSQL (ledger)
  F227 → DATABASE FABRIC (Skill 05) → PostgreSQL
  F238 → DATABASE FABRIC (Skill 05) → Elasticsearch (audit)
  F231 → DATABASE FABRIC (Skill 05) → Redis
AF CONFIGURATION:
  AF-1 Genesis: generates ReversalService sitting on F232 + F228, never calling DELETE
  AF-9 Judge: validates original document status set to CANCELLED, new reversal doc created, journal reversed
MACHINE (fixed):
  - ReverseDocumentAsync creates: (1) cancellation doc with link_type=REVERSAL (2) reversal journal entry
  - Original doc status → CANCELLED (immutable); cancellation doc status → POSTED
  - idempotencyKey: "reversal:{originalDocId}:{tenantId}:{reason}"
  - Chain links from original doc cascaded to CANCELLED state
IRON RULES:
  - NEVER call DELETE on any posted ERP document → BUILD FAILURE
  - Reversal doc MUST reference original doc_id → BUILD FAILURE
  - Reversal journal entry MUST balance (debit = credit of original entry) → BUILD FAILURE
QUALITY GATES (AF-9 Judge):
  - Both original and reversal documents remain reportable/queryable
  - Audit trail shows: original → cancelled, reversal doc created, journal reversed
  - idempotent: reversing same doc twice returns existing reversal (via F231)
```

### TASK TYPE: T77 — Multi-Tenant ERP Connection Bootstrap
```
ARCHETYPE: SETUP_WORKFLOW
ENTRY: Fires when admin creates new ERP connection (tenant onboarding event)
PURPOSE: Establishes tenant-specific ERP + work platform connections
         Verifies webhook endpoints; performs initial master data sync; registers in BFA
FACTORY DEPENDENCIES:
  F237:IERPTenantConnectionRegistry — resolved via CreateAsync()
  F229:IWorkPlatformConnectorService — resolved via CreateAsync()
  F225:IERPConnectorService — resolved via CreateAsync()
  F226:IMasterDataService — resolved via CreateAsync()
  F234:IWebhookGatewayService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F237 → DATABASE FABRIC (Skill 05) → Elasticsearch (tenant config)
  F229 → AI ENGINE FABRIC (Skill 07) → GraphQL provider
  F225 → DATABASE FABRIC (Skill 05) → per-tenant ERP provider
  F226 → DATABASE FABRIC (Skill 05) → Elasticsearch
  F234 → QUEUE FABRIC (Skill 04) → Redis Streams
AF CONFIGURATION:
  AF-2 Planning: decomposes into: register-connection → verify-webhook → test-erp-auth → initial-sync → register-bfa
  AF-8 Security: validates: OAuth scopes minimized, secrets stored as vault refs, TLS enforced, webhook signature enabled
MACHINE (fixed):
  - Webhook verification (challenge echo) is BLOCKING step — cannot proceed if fails
  - Initial master data sync runs T74 for partners + items + warehouses
  - BFA entity registration happens after successful sync
  - Connection status = ACTIVE only after all steps pass
FREEDOM (configurable):
  - Which ERP product type (SAP B1, generic OData, etc.)
  - OAuth scopes to request (per tenant capability)
  - Initial sync scope (all entities vs subset)
IRON RULES:
  - Raw OAuth tokens NEVER stored in DB — vault reference only → BUILD FAILURE
  - Webhook URL challenge verification cannot be bypassed → BUILD FAILURE
  - TLS required for all ERP and work platform connections → BUILD FAILURE
  - tenantId isolation: one tenant's connection config never accessible by another → BUILD FAILURE
```

### TASK TYPE: T78 — ERP Approval Gate
```
ARCHETYPE: HUMAN_TASK_GATE
ENTRY: Fires when saga step requires human approval before advancing (invoice posting, payment run, period close)
PURPOSE: Suspends saga execution; routes to approver role; resumes on approve/reject/timeout
DISTINCT FROM:
  T36 (approval step in other flows) — T78 carries ERP-specific approval context (docType, amount, RBAC role)
FACTORY DEPENDENCIES:
  F230:ISagaCoordinatorService — resolved via CreateAsync()
  F229:IWorkPlatformConnectorService — resolved via CreateAsync()
  F238:IAuditLedgerService — resolved via CreateAsync()
  F231:IIdempotencyService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F230 → QUEUE FABRIC (Skill 04) → Redis Streams (saga state)
  F229 → AI ENGINE FABRIC (Skill 07) → GraphQL (approval task on work platform board)
  F238 → DATABASE FABRIC (Skill 05) → Elasticsearch (audit)
  F231 → DATABASE FABRIC (Skill 05) → Redis
MACHINE (fixed):
  - Creates approval task on work platform board (via F229)
  - Saga suspends at this step (process_step.status = AWAITING_APPROVAL)
  - On APPROVE: writes approvalToken, advances saga
  - On REJECT: triggers compensation (T76 if document already created)
  - On TIMEOUT: escalates to supervisor role; logs audit event
FREEDOM (configurable):
  - Approver role mapping (finance_admin, ap_clerk, sales_ops, etc.)
  - Approval timeout (default 24h, max 7 days)
  - Auto-approve below threshold (per tenant config)
  - Escalation path
IRON RULES:
  - High-risk actions (payment runs, period close seal) require approval regardless of auto-approve config → BUILD FAILURE
  - approvalToken stored with saga state for downstream idempotency checks → BUILD FAILURE
```

### TASK TYPE: T79 — ERP Analytics Sync Step
```
ARCHETYPE: DERIVED_DATA_SYNC
ENTRY: Fires on OutboxPublisher relay event after any document POSTED or REVERSED
PURPOSE: Syncs ERP events to derived analytics index (Elasticsearch) for reporting
         Labels all analytics data as derived (not authoritative)
         Provides reconciliation gap detection vs ERP master
FACTORY DEPENDENCIES:
  F239:IERPReportingService — resolved via CreateAsync()
  F233:IOutboxPublisherService — resolved via CreateAsync()
  F238:IAuditLedgerService — resolved via CreateAsync()
FABRIC RESOLUTION:
  F239 → RAG FABRIC (Skill 00b) → Hybrid strategy (Elasticsearch analytics index)
  F233 → QUEUE FABRIC (Skill 04) → Redis Streams (outbox relay)
  F238 → DATABASE FABRIC (Skill 05) → Elasticsearch (audit)
MACHINE (fixed):
  - Event-driven: triggered by outbox relay (not polling)
  - Analytics index record always tagged: source="derived", erp_doc_id="{externalId}"
  - Reconciliation job scheduled: compares analytics totals vs ERP reports API
  - Discrepancies written as reconciliation_gap events (not auto-corrected)
IRON RULES:
  - Analytics index NEVER used as authoritative ledger → BUILD FAILURE if posting uses analytics store
  - Reconciliation gaps NEVER silently resolved — human review required → BUILD FAILURE
```

---

## PHASE 3 — AF STATION MAPPING FOR FLOW-12

### How Each AF Station Processes FLOW-12

**AF-1 (Genesis)** — Code Generation
- Generates all FLOW-12 services extending `MicroserviceBase` (Skill 01, all 19 components)
- NEVER imports SAP OData SDK, monday.com JS SDK, or any ERP provider package
- Every external call goes through F225:IERPConnectorService or F229:IWorkPlatformConnectorService
- Uses `Dictionary<string,object>` via ParseDocument for all ERP documents — no typed models
- Generates idempotency key construction inline per T72/T73/T76 iron rules

**AF-2 (Planning)** — Decomposition
- Decomposes FLOW-12 into 5 sub-flows: O2C, P2P, R2R, ConnectionBootstrap, AnalyticsSync
- Each sub-flow maps to a saga type in F230:ISagaCoordinatorService
- Step dependency graph: T77 (bootstrap) must complete before T72/T73/T74 can run
- Period close (T75) blocked until all in-period T72 steps in terminal state (BFA CF-46)

**AF-3 (Prompt Library)** — Domain Prompts
- Retrieves ERP-domain prompts: "implement reversal-not-delete", "three-way match validation", "period-end close saga"
- Prompt library keys: `erp.document_chain`, `erp.saga_compensation`, `erp.period_close`, `erp.multi_tenant_isolation`

**AF-4 (RAG — Task Context)** — Skill Reuse
- Pattern: idempotency key → F231:IIdempotencyService (from Phase 0 RAG index)
- Pattern: transactional outbox → F233:IOutboxPublisherService
- Pattern: saga with compensation → F230:ISagaCoordinatorService + T76
- Pattern: webhook verification → F234:IWebhookGatewayService
- Pattern: OData session management → F225:IERPConnectorService (B1SESSION re-auth)
- Pattern: multi-tenant scope → DNA-5 (tenantId on every query, BuildSearchFilter)

**AF-5 (Multi-model Orchestration)** — Competing Models
- Parallel generation of T72 ERP document chain step across Claude, GPT, Gemini
- Consensus: ALL models must produce DataProcessResult<T>, no typed models, no direct imports
- Divergence in session management strategies → AF-10 merge selects most defensive approach

**AF-6 (Code Review)** — Automated Review
- Checks: no `new SapB1Client()` or `new MondayClient()` anywhere in generated code
- Checks: all queries include tenantId parameter
- Checks: idempotencyKey present in every CreateDocument/PostDocument call
- Checks: no `catch (Exception e) { throw; }` — must return DataProcessResult error

**AF-7 (Compliance)** — DNA Pattern Validation
- DNA-1: All ERP entities parsed as `Dictionary<string,object>` — fail if typed class found (e.g., `SalesOrderModel`)
- DNA-2: BuildSearchFilter used in all FLOW-12 query methods — fail if direct filter construction
- DNA-3: DataProcessResult<T> on ALL paths — fail if any void return or exception throw
- DNA-4: All generated services extend MicroserviceBase — fail if standalone class
- DNA-5: tenantId on EVERY document/query/event — fail if missing
- DNA-6: DynamicController used — no ERP-specific controller (no `ERPDocumentController`)

**AF-8 (Security)** — Security Scan
- OAuth tokens: never in DB plain text — vault reference only
- Webhook signatures: JWT verification enforced
- TLS: all outbound connector calls must use HTTPS
- PII in master data: tax_id, addresses encrypted with per-tenant KEK
- Session tokens (B1SESSION): never logged
- Separation of duties: draft vs posted RBAC roles validated

**AF-9 (Judge — Quality Context)** — Iron Rule Validation
Validates all task types in FLOW-12 against their IRON RULES.
Key check set for FLOW-12:
1. idempotencyKey present in all state-changing calls
2. No DELETE on posted documents (reversal only)
3. Webhook verification not bypassable
4. Period seal requires approvalToken
5. Analytics store never used as authoritative ledger
6. Cross-tenant document access impossible (tenantId enforced at all layers)

**AF-10 (Merge)** — Output Combination
- Merges multi-model generated ERP services
- Preference for most conservative idempotency strategy
- Preference for most complete audit trail coverage

**AF-11 (Feedback)** — Quality Store
- Stores generation quality scores for FLOW-12 task types
- User approval ratings on generated ERP flows injected into future AF-1 prompts
- Tracks: "did generated code handle B1SESSION re-auth correctly?" as quality dimension

---

## PHASE 4 — BFA CROSS-FLOW VALIDATION

### New BFA Entity Registrations (FLOW-12)

```
ENTITIES: erp_document, erp_document_line, document_chain_link, journal_entry,
          journal_entry_line, erp_partner, erp_item, erp_warehouse,
          process_instance, process_step, idempotency_key, outbox,
          integration_mapping, audit_log, tenant_connection, period_close

EVENTS: O2CStarted, O2CAdvanced, O2CCompleted, O2CFailed,
        P2PStarted, P2PAdvanced, P2PCompleted, P2PFailed,
        R2RCloseInitiated, R2RCloseSealed, PeriodReopened,
        DocumentPosted, DocumentReversed, DocumentCancelled,
        ThreeWayMatchPassed, ThreeWayMatchFailed,
        MasterDataSynced, ConnectionEstablished, ApprovalGranted, ApprovalRejected,
        AuditLogWritten, QuotaExceeded, WebhookVerified, WebhookIngested

APIs: /erp/connections, /erp/documents, /erp/chain, /erp/ledger,
      /erp/master-data, /erp/period-close, /erp/reports,
      /webhooks/erp, /webhooks/work-platform,
      /erp/approvals, /erp/reversal
```

### New Conflict Rules (CF-42–CF-53)

**CF-42 — Document Chain Integrity Violation**
```
TRIGGER: Any T72 step attempts PostDocument where parent document is not in POSTED state
CONFLICT: Chain integrity violation (e.g., posting invoice before delivery exists)
RESOLUTION: Block posting; return DataProcessResult error with CF-42 code
CROSS-FLOW: Affects O2C and P2P sub-flows; checked before every T72 execution
```

**CF-43 — Duplicate Idempotency Key**
```
TRIGGER: F231:IIdempotencyService detects same (tenantId, key, requestHash) already processed
CONFLICT: Potential double-posting
RESOLUTION: Return cached result immediately; do not re-execute; log deduplication event
CROSS-FLOW: Applies to T72, T73, T75, T76, T78 across all ERP flows
```

**CF-44 — Cross-Tenant Document Access**
```
TRIGGER: Any factory call where tenantId in FactoryResolutionContext ≠ tenantId on document
CONFLICT: Critical security violation — tenant data exposure
RESOLUTION: Immediate BUILD FAILURE; escalate to security alert; block flow execution
CROSS-FLOW: Highest priority conflict rule; checked at EVERY fabric call in FLOW-12
```

**CF-45 — Three-Way Match Variance Threshold**
```
TRIGGER: Match result = QUANTITY_VARIANCE or PRICE_VARIANCE
CONFLICT: Invoice differs from PO/GR within acceptable tolerance
RESOLUTION: Route to human exception (T78 approval gate); block APInvoice posting
CROSS-FLOW: Specifically between T73 (match) and T72 (APInvoice posting step)
```

**CF-46 — Period Close with Open Documents**
```
TRIGGER: T75 FinalizeCloseAsync called while open O2C/P2P documents exist for period
CONFLICT: Cannot seal period with unresolved transactions
RESOLUTION: Block seal; return list of open documents requiring resolution
CROSS-FLOW: Between T75 (period close) and all T72/T73 steps for the period
```

**CF-47 — Journal Imbalance**
```
TRIGGER: Period validation detects sum(debit) ≠ sum(credit) for period
CONFLICT: Accounting integrity violation
RESOLUTION: Block FinalizeCloseAsync; alert finance_admin role; require manual investigation
CROSS-FLOW: Between T75 validation step and F228:ILedgerService
```

**CF-48 — Pending Outbox During Close**
```
TRIGGER: Unrelayed outbox events exist for period when close initiated
CONFLICT: Analytics index may be stale; close reporting would be incomplete
RESOLUTION: Drain outbox before allowing period validation step
CROSS-FLOW: Between T79 (analytics sync) and T75 (period close) 
```

**CF-49 — Quota Exceeded**
```
TRIGGER: F240:ITenantQuotaEnforcerService returns QUOTA_EXCEEDED
CONFLICT: Noisy-neighbor risk; tenant exhausting shared infrastructure pool
RESOLUTION: Return 429-equivalent DataProcessResult; log quota event; throttle caller
CROSS-FLOW: Applied at ingress of T72, T73, T74, T75 for all tenants
```

**CF-50 — Reversal of Non-Posted Document**
```
TRIGGER: T76 reversal attempted on document with status ≠ POSTED
CONFLICT: Logical error; reversal only valid for posted documents
RESOLUTION: Return DataProcessResult error CF-50; block reversal; suggest correct action
```

**CF-51 — Missing Approval Token for High-Risk Action**
```
TRIGGER: PostDocumentAsync for Invoice/Payment/PeriodClose called without approvalToken
CONFLICT: Separation of duties violation
RESOLUTION: BUILD FAILURE; block execution; alert security
CROSS-FLOW: T72 (for invoice/payment doc types), T75 (period seal), T78 (approval gate)
```

**CF-52 — Stale Session Token Logged**
```
TRIGGER: AF-8 Security scan detects B1SESSION token in any log output
CONFLICT: Credential exposure risk
RESOLUTION: BUILD FAILURE; scrub log; rotate session
```

**CF-53 — Analytics Authoritative Misuse**
```
TRIGGER: Any service routes a PostJournalEntry call through F239:IERPReportingService
CONFLICT: Analytics index (derived) used as authoritative ledger — data integrity violation
RESOLUTION: BUILD FAILURE; redirect to F228:ILedgerService
```

### Backward Compatibility Check

```
EXISTING FLOWS FLOW-01 through FLOW-05: No entity overlap with FLOW-12 ERP entities
EXISTING T1–T71: No conflict — T72–T79 use new factory interfaces F225–F240
EXISTING F1–F224: No modification — F225–F240 are additive
EXISTING CF-1–CF-41: No modification — CF-42–CF-53 are additive
EXISTING SK-1–SK-16: No modification — no new skills added
✅ BACKWARD COMPATIBLE
```

---

## PHASE 5 — MULTI-TENANT EXTENSION LAYER

### Hybrid Isolation Strategy (from multi-tenant-support.md)

```
TIER 1 — Shared-Schema (default, pooled):
  Target: SMB tenants, lower volume ERP flows
  Implementation:
    - Single Elasticsearch index with tenantId field on every document
    - BuildSearchFilter enforces tenantId scope (DNA-2)
    - Redis quota counters keyed by "quota:{tenantId}:{type}:{window}"
    - Per-tenant idempotency key namespace: (tenantId, key) unique constraint
    - AF-7 Compliance validates tenantId on every generated query

TIER 2 — Separate-Schema (regulated tenants):
  Target: Finance/ERP tenants with audit/compliance requirements
  Implementation:
    - F227:IDocumentChainService resolves to PostgreSQL with schema t_{tenantId}
    - F228:ILedgerService resolves to append-only schema t_{tenantId}.journal_entry
    - RLS policies: SET app.tenant_id = '{tenantId}' per connection
    - Per-tenant KEK for encryption of PII fields (tax_id, addresses, bank accounts)
    - Dedicated outbox relay worker per tenant (no cross-tenant processing)
    - FactoryResolutionContext.IsolationTier = "separate_schema" routes to correct pool

TIER 3 — Separate-Instance (enterprise):
  Target: Large enterprise, data residency requirements, customer-managed keys
  Implementation:
    - F228:ILedgerService resolves to dedicated DB instance per tenant
    - Customer-managed KEK (CMK) via external vault integration
    - Dedicated Kubernetes namespace with ResourceQuota + LimitRange
    - Separate Redis cluster per tenant for quota enforcement
    - OTLP pipeline with per-tenant trace export target
    - FactoryResolutionContext.IsolationTier = "separate_instance"
```

### Multi-Tenant Guardrails Across All Phases

**Tenant Context Propagation**
```
Every HTTP request → resolve tenantId from JWT sub claim + tenant registry lookup
Every queue event → CloudEvent source field = "urn:engine:tenant:{tenantId}"
Every saga → correlationId prefixed with tenantId
Every OTLP span → baggage.tenant_id = "{tenantId}" (never propagate secrets/PII in baggage)
W3C Trace Context headers for trace propagation across services
```

**Object-Level Authorization**
```
Every endpoint accepting a docId, sagaId, periodId, connectionId:
  1. Resolve tenantId from auth context
  2. Load object from fabric
  3. Assert object.tenantId == authContext.tenantId → 403 if not
  4. CF-44 fires immediately on mismatch
This check runs BEFORE any business logic — never after.
```

**Per-Tenant Quota Contracts**
```
Shared-schema tier:
  api_calls: 1000/min
  workflow_steps: 10000/day
  document_postings: 500/hour
  webhook_events: 200/min

Separate-schema tier (regulated):
  api_calls: 5000/min
  workflow_steps: 50000/day
  document_postings: 5000/hour
  webhook_events: 1000/min

Separate-instance tier (enterprise):
  api_calls: configurable (FREEDOM layer)
  workflow_steps: configurable
  document_postings: configurable
  webhook_events: configurable
```

**Per-Tenant Encryption**
```
Shared-schema: platform-managed AES-256 key at rest (Elasticsearch/PostgreSQL encryption)
Separate-schema: per-tenant DEK wrapped by platform KEK (NIST SP 800-57 lifecycle)
Separate-instance: per-tenant DEK wrapped by customer CMK (CMK rotatable by tenant)
PII fields always encrypted regardless of tier: tax_id, addresses, bank_account_refs
Secrets (OAuth tokens, B1SESSION) → vault reference only (never DEK-encrypted in DB)
```

**Tenant-Aware Observability**
```
OTLP metrics: labels { tenant_id, flow_id, step_name, isolation_tier }
OTLP traces: baggage.tenant_id (bounded — no PII/secrets)
OTLP logs: tenant_id structured field; B1SESSION and OAuth tokens REDACTED
Dashboards: per-tenant ERP flow success rate, idempotency dedup rate, quota utilization
Alerting: per-tenant saga stuck threshold, quota approaching limit (80%), close failure rate
```

**Multi-Tenant Testing Checklist** (from multi-tenant-support.md)
```
□ Cross-tenant isolation test: tenant A cannot read/write tenant B documents (CF-44)
□ Idempotency test: duplicate webhook delivery does not double-post (CF-43)
□ Quota enforcement test: shared-schema tenant cannot consume enterprise quota
□ Reversal safety test: reversal creates new doc, original not deleted
□ Period close guard test: cannot seal with open documents (CF-46)
□ Schema isolation test: t_acme.erp_document not accessible from t_globex connection
□ Secret isolation test: tenant A vault ref not resolvable by tenant B factory context
□ Audit log completeness: every POSTED transition has audit entry (AF-9 gate)
□ Noisy-neighbor load test: shared-schema tenant under load does not impact others
□ Restore drill: per-tenant point-in-time restore without cross-tenant data restore
```

---

## PHASE 6 — FLOW TEMPLATE DAG + DNA COMPLIANCE

### Flow-Definition JSON (Engine Generates This — NOT Hand-Written)

```json
{
  "flowId": "flow-12-erp-o2c",
  "flowName": "Order-to-Cash ERP Flow",
  "version": "1.0",
  "tenantResolution": "FactoryResolutionContext.TenantId",
  "trigger": {
    "type": "WEBHOOK",
    "source": "work-platform.board.item.updated",
    "filter": { "status": "Approved", "boardType": "sales_pipeline" },
    "handler": "F234:IWebhookGatewayService.IngestEventAsync",
    "verification": "F234:IWebhookGatewayService.HandleChallengeAsync",
    "deduplication": "F231:IIdempotencyService.CheckOrCreateAsync"
  },
  "steps": [
    {
      "id": "step-quota-check",
      "taskType": "T72",
      "factory": "F240:ITenantQuotaEnforcerService",
      "action": "CheckQuotaAsync",
      "quotaType": "workflow_steps",
      "onExceeded": { "status": "QUOTA_EXCEEDED", "conflictRule": "CF-49" }
    },
    {
      "id": "step-start-saga",
      "taskType": "T72",
      "factory": "F230:ISagaCoordinatorService",
      "action": "StartSagaAsync",
      "params": {
        "sagaType": "O2C",
        "correlationId": "{tenantId}:{webhookEventId}",
        "idempotencyKey": "o2c-start:{tenantId}:{webhookEventId}"
      }
    },
    {
      "id": "step-create-quote",
      "taskType": "T72",
      "factory": "F227:IDocumentChainService",
      "action": "CreateDocumentAsync",
      "params": {
        "docType": "QUOTE",
        "idempotencyKey": "QUOTE:{correlationId}:create",
        "payload": "ParseDocument({webhookPayload})"
      },
      "onError": {
        "remedy": "RETRY",
        "retryPolicy": { "maxAttempts": 5, "backoff": "EXPONENTIAL", "maxDelay": "30m" }
      }
    },
    {
      "id": "step-create-sales-order",
      "taskType": "T72",
      "factory": "F227:IDocumentChainService",
      "action": "CreateDocumentAsync",
      "params": {
        "docType": "SALES_ORDER",
        "parentDocId": "{step-create-quote.result.docId}",
        "idempotencyKey": "SO:{correlationId}:create"
      },
      "bfaChecks": ["CF-42"],
      "onError": {
        "remedy": "COMPENSATE",
        "compensationStep": "step-reverse-quote"
      }
    },
    {
      "id": "step-approval-gate",
      "taskType": "T78",
      "factory": "F230:ISagaCoordinatorService",
      "action": "SuspendForApproval",
      "params": {
        "approverRole": "sales_ops",
        "timeoutHours": 24,
        "escalateToRole": "finance_admin"
      }
    },
    {
      "id": "step-post-sales-order",
      "taskType": "T72",
      "factory": "F227:IDocumentChainService",
      "action": "PostDocumentAsync",
      "params": {
        "docId": "{step-create-sales-order.result.docId}",
        "approverContext": "{step-approval-gate.result.approvalToken}",
        "idempotencyKey": "SO:{correlationId}:post"
      },
      "onError": {
        "remedy": "COMPENSATE",
        "compensationStep": "step-reverse-sales-order"
      }
    },
    {
      "id": "step-emit-posted-event",
      "taskType": "T79",
      "factory": "F233:IOutboxPublisherService",
      "action": "WriteToOutboxAsync",
      "params": {
        "eventType": "erp.document.posted",
        "cloudEvent": {
          "specversion": "1.0",
          "id": "{correlationId}:so:posted",
          "source": "urn:engine:tenant:{tenantId}",
          "type": "erp.document.posted",
          "time": "{now}",
          "data": {
            "docType": "SALES_ORDER",
            "docId": "{step-post-sales-order.result.docId}",
            "tenantId": "{tenantId}",
            "correlationId": "{correlationId}"
          }
        }
      }
    },
    {
      "id": "step-reverse-sales-order",
      "taskType": "T76",
      "factory": "F232:IReversalService",
      "action": "ReverseDocumentAsync",
      "isCompensation": true,
      "params": {
        "originalDocId": "{step-create-sales-order.result.docId}",
        "reason": "SAGA_COMPENSATION",
        "idempotencyKey": "reversal:SO:{correlationId}"
      }
    },
    {
      "id": "step-reverse-quote",
      "taskType": "T76",
      "factory": "F232:IReversalService",
      "action": "ReverseDocumentAsync",
      "isCompensation": true,
      "params": {
        "originalDocId": "{step-create-quote.result.docId}",
        "reason": "SAGA_COMPENSATION",
        "idempotencyKey": "reversal:QUOTE:{correlationId}"
      }
    }
  ],
  "promotionLadder": "GENERATED → INJECTED → MINIMAL → CORE"
}
```

### DNA Compliance Validation

```
DNA-1 ParseDocument ✅
  All ERP document payloads handled as Dictionary<string,object>
  ParseDocument({webhookPayload}) in step-create-quote
  No SalesOrderModel, InvoiceModel, PartnerModel anywhere in generated code

DNA-2 BuildSearchFilter ✅
  All query methods in F225/F226/F227/F228/F235/F239 use BuildSearchFilter
  Empty tenantId, empty docType, empty status → auto-skipped (never fail on null)

DNA-3 DataProcessResult<T> ✅
  ALL factory methods return DataProcessResult<T>
  Compensation paths return DataProcessResult<bool>
  Never throw for business logic; exceptions only for unrecoverable infrastructure errors

DNA-4 MicroserviceBase ✅
  ERPDocumentChainService extends MicroserviceBase (inherits 19 components)
  LedgerService extends MicroserviceBase
  SagaCoordinatorService extends MicroserviceBase
  No standalone service classes

DNA-5 Scope Isolation ✅
  tenantId on EVERY document, query, event, saga, audit log
  BuildSearchFilter always includes tenantId as first filter
  CF-44 fires immediately on mismatch
  FactoryResolutionContext.TenantId routes to correct DB pool/schema/instance

DNA-6 DynamicController ✅
  No ERPDocumentController, no InvoiceController, no SalesOrderController
  Single DynamicController routes via flow definition
  All ERP endpoints resolved through flow DAG, not entity-specific controllers
```

### Sample CloudEvent Payload (FLOW-12 Standard)

```json
{
  "specversion": "1.0",
  "id": "01JCK2X9P2F6B0J7Z9W2Y5Q8QK",
  "source": "urn:engine:tenant:acme",
  "type": "erp.document.posted",
  "time": "2026-02-26T10:00:00Z",
  "datacontenttype": "application/json",
  "data": {
    "docType": "AR_INVOICE",
    "docId": "doc_9a8b7c",
    "externalErpId": "12345",
    "correlationId": "acme:ord-2026-0042",
    "tenantId": "acme",
    "chain": ["quote_001", "so_042", "delivery_033", "doc_9a8b7c"],
    "idempotencyKey": "AR_INVOICE:acme:ord-2026-0042:post"
  }
}
```

---

## PHASE 7 — STATE SAVE / RECOVERY PROTOCOL

### Checkpoint File

```
FLOW-12 ENGINE EXTENSION — STATE CHECKPOINT
Generated: 2026-02-26
Status: COMPLETE (all 7 phases)

PHASE 0 — RAG Mini-Index:          ✅ COMPLETE
PHASE 1 — Factory Interfaces:      ✅ COMPLETE (F225–F240, 16 factories)
PHASE 2 — Engine Contracts:        ✅ COMPLETE (T72–T79, 8 task types)
PHASE 3 — AF Station Mapping:      ✅ COMPLETE (AF-1 through AF-11)
PHASE 4 — BFA Validation:          ✅ COMPLETE (CF-42–CF-53, 12 conflict rules)
PHASE 5 — Multi-Tenant Extension:  ✅ COMPLETE (3-tier hybrid isolation)
PHASE 6 — Flow Template + DNA:     ✅ COMPLETE (O2C DAG + all 6 DNA patterns)
PHASE 7 — State Save:              ✅ THIS FILE

CATALOG DELTA:
  Factories: F224 (prev) → F240 (new); 16 added
  Task Types: T71 (prev) → T79 (new); 8 added
  Conflict Rules: CF-41 (prev) → CF-53 (new); 12 added
  Skills: SK-16 (unchanged — no new skills needed)
  Backward compatibility: ✅ T1–T71 and F1–F224 unchanged

GAPS / KNOWN UNKNOWNS (not blocking, require tenant-level config):
  - Specific jurisdiction retention periods (config per tenant, not hardcoded)
  - Whether tenant requires SAP B1 draft-only vs full posting (FREEDOM config)
  - Specific approval matrix per tenant (FREEDOM config)
  - Manufacturing/MRP scope — not included in T72–T79 (separate FLOW-13 candidate)

RECOVERY INSTRUCTIONS:
  If interrupted during Phase 2 (task types):
    → Resume at T73+ (T72 was last completed)
    → All factory interfaces from Phase 1 are stable dependencies
  If interrupted during Phase 5 (multi-tenant):
    → Core engine contracts (Phases 1–4) are complete and usable
    → Multi-tenant layer is an overlay — can be applied per-factory
  
NEXT MILESTONE:
  - Family 25 / F241 scope: Manufacturing/MRP extension (FLOW-13)
  - T80 candidate: Production Order Step (Plan-to-Produce value stream)
  - T81 candidate: MRP Proposal Gate
```

---

## APPENDIX — POSITIVE / NEGATIVE EXAMPLES (Reference for AF-9 Judge)

### ✅ POSITIVE EXAMPLE — Generated ERP Service Fragment

```csharp
// CORRECT: Extends MicroserviceBase (DNA-4)
public class DocumentChainService : MicroserviceBase, IDocumentChainService
{
    private readonly IExternalServiceFactory<IDatabaseService> _dbFactory;
    private readonly IExternalServiceFactory<IIdempotencyService> _idempotencyFactory;

    public async Task<DataProcessResult<string>> CreateDocumentAsync(
        string tenantId, string docType, string parentDocId,
        Dictionary<string, object> payload, string idempotencyKey) // DNA-1: Dictionary
    {
        // DNA-5: Scope isolation — tenantId first
        if (string.IsNullOrEmpty(tenantId))
            return DataProcessResult<string>.Failure("tenantId required"); // DNA-3

        // Check idempotency first
        var idempotencyService = await _idempotencyFactory.CreateAsync(
            new FactoryResolutionContext { TenantId = tenantId });
        var idempotencyCheck = await idempotencyService.CheckOrCreateAsync(tenantId, idempotencyKey, payload.GetHashCode().ToString());
        if (idempotencyCheck.IsSuccess && idempotencyCheck.Data?.AlreadyProcessed == true)
            return DataProcessResult<string>.Success(idempotencyCheck.Data.ResultRef); // CF-43 dedup

        var db = await _dbFactory.CreateAsync(new FactoryResolutionContext { TenantId = tenantId }); // Fabric-first

        // DNA-2: BuildSearchFilter skips empty fields
        var filters = BuildSearchFilter(new Dictionary<string, object>
        {
            { "tenantId", tenantId },
            { "docId", parentDocId } // auto-skipped if null
        });

        // ... create document logic using db.StoreDocumentAsync
        // DNA-1: Result is Dictionary, not typed model
        var docRecord = new Dictionary<string, object>
        {
            { "tenantId", tenantId }, { "docType", docType },
            { "status", "DRAFT" }, { "parentDocId", parentDocId }
        };

        var result = await db.StoreDocumentAsync(tenantId, "erp_document", docRecord);
        return result.IsSuccess
            ? DataProcessResult<string>.Success(result.Data) // DNA-3
            : DataProcessResult<string>.Failure(result.ErrorMessage); // DNA-3: never throw
    }
}
```

### ❌ NEGATIVE EXAMPLE — What AF-9 Must REJECT

```csharp
// WRONG: Does NOT extend MicroserviceBase → DNA-4 violation → BUILD FAILURE
public class SalesOrderService
{
    // WRONG: Direct SAP SDK import → fabric-first violation → BUILD FAILURE
    private readonly SapB1Client _sapClient = new SapB1Client("server=sap01;db=ACME");

    // WRONG: Typed model → DNA-1 violation → BUILD FAILURE
    public async Task<SalesOrder> CreateSalesOrderAsync(SalesOrderModel model)
    {
        // WRONG: No tenantId → DNA-5 violation → BUILD FAILURE
        // WRONG: No idempotencyKey → T72 Iron Rule → BUILD FAILURE
        var result = await _sapClient.SalesOrders.AddAsync(model);

        // WRONG: throws exception for business logic → DNA-3 violation → BUILD FAILURE
        if (result == null) throw new Exception("SAP returned null");

        // WRONG: Returns typed model, not DataProcessResult<T> → DNA-3 → BUILD FAILURE
        return result;
    }

    // WRONG: Deletes original document → T76 Iron Rule → BUILD FAILURE
    public async Task CancelOrderAsync(int docEntry)
    {
        await _sapClient.SalesOrders.DeleteAsync(docEntry); // NEVER DELETE POSTED DOCS
    }
}
```
