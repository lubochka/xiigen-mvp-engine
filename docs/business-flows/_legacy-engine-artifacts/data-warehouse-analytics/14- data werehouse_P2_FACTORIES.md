# XIIGen — FLOW-14 PHASE 2: TRANSFORM + WAREHOUSE + METRICS + GOVERNANCE
# Merged: 2026-02-26 | Source: FLOW14_PLAN_P0.md Phase P2
# Adds: Families 55-59, F444-F465 (22 factories, ~96 methods), DR-60-DR-65
# Depends on: P1 (F426-F443, Families 52-54, DR-58-DR-59)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## PREREQUISITE STATE (entering FLOW-14 P2)

```
Factories:        F1–F443     (P1 added F426–F443 = 18 factories, Families 52-54)
Design Records:   DR-1–DR-59  (P1 added DR-58/59)
Engine Primitives: EP-1–EP-5  (EP-4 consumed by F436, EP-5 consumed by F448)
DNA Patterns:     DNA-1–DNA-9 (all stable)
```

---

## DESIGN RECORDS DR-60–DR-65

### DR-60: Schema Drift as FREEDOM Config
**Decision:** When the Schema Registry (F439) detects new, removed, or type-changed
fields in source data, the system auto-categorizes the drift but NEVER auto-promotes
changed schemas to the mart layer. Raw and staging zones continue processing with new
fields as additional Dictionary keys. Mart promotion of new fields requires explicit
admin approval via ApproveSchemaChangeAsync.
**Rationale:** External SaaS platforms (especially ClickUp custom fields) change schemas
without notice. Auto-promoting every new field would break mart aggregation contracts
and KPI definitions. Auto-rejecting would cause data loss. The hybrid approach (auto-accept
for raw/staging, admin-gate for mart) balances freshness with stability.
**Enforcement:** AF-9 validates that mart builder (F451) only uses fields present in the
approved schema version. CF-192 enforces zone promotion order.
**Scope:** F439, F443, F451, T172 (Schema Drift Detection Gate).

### DR-61: Cross-System Identity as Probabilistic
**Decision:** Identity resolution (F446) uses a confidence scoring model (0.0–1.0) to
match entities across systems (ClickUp users ↔ Zoho contacts ↔ Zoho Desk agents).
Matches above the configurable threshold auto-merge into a unified dimension record.
Matches below threshold queue for human review. No deterministic-only fallback: the
engine always scores, even for exact email matches (score = 1.0).
**Rationale:** Cross-system identity is inherently fuzzy. Same person may have
different emails in ClickUp vs Zoho, different display names, or organizational
aliases. Probabilistic scoring with RAG FABRIC (Hybrid strategy) uses multiple
signals (email similarity, name similarity, organization membership, temporal
correlation) to produce a confidence score. Threshold is FREEDOM config per tenant
because data quality varies.
**Enforcement:** AF-9 validates that T175 (Cross-System Identity Join) enforces
minimum confidence threshold from FREEDOM config. CF-204: matches MUST NOT cross
tenant boundaries. IR-175-1: cross-tenant identity join = BUILD FAILURE.
**Scope:** F446, F440, F449, T175.

### DR-62: SCD Type 2 for All Dimensions
**Decision:** All warehouse dimension tables use Slowly Changing Dimension Type 2 (SCD-2).
When an entity attribute changes (e.g., user changes department, account changes owner),
the existing row gets an `effective_end` timestamp and a new row is inserted with
`effective_start = now()` and `effective_end = null` (current). Dimension primary key
is surrogate (auto-generated), with business key + effective_start as natural unique key.
**Rationale:** Point-in-time analytics require knowing "who was in which department when
this deal closed." SCD-1 (overwrite) loses history. SCD-3 (extra column) doesn't scale.
SCD-2 is the warehouse industry standard for full history preservation.
**Enforcement:** AF-7 validates that F449 IDimensionLoaderService NEVER calls UpdateDocument
on dimension records — always insert new version + close old version. AF-9 quality gate:
"dimension record count monotonically increases."
**Scope:** F449, T173 (Dimension/Fact Refresh Cycle).

### DR-63: PII Classification Before Mart Promotion
**Decision:** No data record enters the mart layer (Zone 4) without first passing through
PII classification (F462). Fields classified as PII are masked, tokenized, or excluded
based on per-tenant FREEDOM config. Classification uses AI ENGINE FABRIC (LLM-based
detection) combined with rule-based patterns (email regex, phone patterns, national IDs).
**Rationale:** Marts are the widest-access analytics layer. PII in marts creates compliance
risk (GDPR, CCPA). Raw and staging zones have restricted access (data engineering only).
Marts are accessed by BI tools, dashboards, and potentially external stakeholders.
Masking at the mart boundary balances analytics utility with privacy.
**Enforcement:** CF-207 BFA rule: mart builder (F451) MUST consume PII-classified records
from F462. AF-8 (Security) validates PII fields are masked before mart write.
**Scope:** F462, F451, T174 (Mart Build & KPI Refresh).

### DR-64: Reverse ETL as Event, Not Direct API Call
**Decision:** All outbound data pushes to external SaaS platforms (reverse ETL) MUST go
through QUEUE FABRIC (Redis Streams) as events, NEVER as direct HTTP calls from the
computing service. The reverse ETL service (F456) publishes activation events to a stream.
A separate consumer reads events and executes the external API call with rate limiting
(F430), retry, and DLQ handling.
**Rationale:** Direct API calls from compute services create tight coupling, make retry
difficult, and bypass rate limit centralization. Event-based activation enables:
(1) decoupled retry/DLQ, (2) rate limit integration via F430, (3) audit trail of all
outbound pushes, (4) batching optimization, (5) easy disable/pause per tenant.
**Enforcement:** AF-8 validates that no generated service in the activation layer makes
direct HTTP calls to external SaaS. CF-213 flags any reverse ETL path that bypasses
QUEUE FABRIC. AF-9 quality gate: all activation events have audit trail in F459.
**Scope:** F456, T177 (Reverse ETL Activation Gate).

### DR-65: Warehouse Isolation Inherits FLOW-08 Tenant Model
**Decision:** Warehouse multi-tenancy uses the same pool/bridge/silo tier model as
FLOW-08 (F244 ITenantContextService) and FLOW-13 (DR-56). The warehouse-specific
implementation (F461 ITenantWarehouseIsolationService) delegates to the existing
MULTI-TENANT ISOLATION FABRIC (Skill 11) for tenant context propagation and isolation
binding. Warehouse adds zone-specific isolation: each zone (raw, staging, core, mart)
can have a DIFFERENT isolation tier per tenant.
**Rationale:** Some tenants may need silo for raw zone (compliance: raw data stays in
tenant-specific storage) but pool for marts (shared analytical compute is acceptable).
Zone-level granularity maximizes flexibility without requiring full silo everywhere.
**Enforcement:** T178 (Warehouse Tenant Provision Gate) validates that isolation tier is
set per zone per tenant. CF-204–CF-206 enforce cross-tenant isolation at each zone boundary.
**Scope:** F461, F463, T178 (Warehouse Tenant Provision Gate).

---

## FACTORY FAMILY 55 — Transformation & Staging
## Factories: F444–F448 | Fabric: DATABASE FABRIC + RAG FABRIC + CORE FABRIC
## Note: F442 (INormalizerService) and F443 (ICustomFieldAdapterService) were delivered
## in P1 as Family 54 preprocessing. Family 55 starts at F444.

### F444: IStagingWriterService
```
FAMILY: 55 — Transformation & Staging
PURPOSE: Idempotent upsert of normalized records into the staging layer (Silver zone).
         Staging tables in PostgreSQL hold flattened, typed, deduped records ready for
         dimensional modeling. Upsert key: (tenantId, provider, entityType, sourceRecordId).
         Duplicate raw records (same source ID + same content hash) are silently deduplicated.
         Changed records (same source ID, different content) create new staging versions.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → PostgreSQL provider (staging schema)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (staging.written, staging.updated)
CREATION: IExternalServiceFactory<IStagingWriterService>.CreateAsync(ctx)
METHODS:
  UpsertRecordAsync(tenantId, provider, entityType, normalizedRecord) → DataProcessResult<Dictionary>
  BulkUpsertAsync(tenantId, provider, entityType, records)       → DataProcessResult<Dictionary>
  GetStagingRecordAsync(tenantId, provider, entityType, sourceId) → DataProcessResult<Dictionary>
  GetStagingVersionsAsync(tenantId, provider, entityType, sourceId) → DataProcessResult<List<Dictionary>>
  GetStagingCountAsync(tenantId, provider, entityType, dateRange) → DataProcessResult<long>
DNA COMPLIANCE:
  DNA-1: All staging records stored as Dictionary<string,object> via ParseDocument — NEVER typed staging models
  DNA-2: BuildSearchFilter on all reads — empty provider/entityType/dateRange fields auto-skipped
  DNA-3: DataProcessResult<T> on all returns
  DNA-4: Extends MicroserviceBase
  DNA-5: tenantId on EVERY upsert and read — staging is tenant-scoped
  DNA-6: DynamicController — no StagingController entity class
CRITICAL:
  - Upsert is idempotent: same (tenantId, provider, entityType, sourceRecordId, contentHash) = no-op.
  - Changed record: new version inserted, previous version gets _supersededAt timestamp.
  - CF-192: Records MUST arrive from raw zone (F438) → normalizer (F442) → staging (F444).
    Direct writes to staging without raw zone landing = CF-192 VIOLATION.
  - Staging enrichment at write: { ...normalizedRecord, _stagingVersion, _stagedAt,
    _sourceRawId (link back to raw zone record), _contentHash }.
MACHINE: Idempotent upsert logic, content hash comparison, version management
FREEDOM: Staging retention period, max versions per record, bulk batch size
```

### F445: IQuarantineService
```
FAMILY: 55 — Transformation & Staging
PURPOSE: Isolate and track records that fail normalization, validation, or schema
         conformance checks. Quarantined records are stored with failure reason, source
         context, and suggested fix. Admin can review, fix, and replay quarantined records.
         Quarantine is the safety net — no data is ever silently dropped.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → Elasticsearch provider (quarantine index)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (quarantine.added, quarantine.resolved)
CREATION: IExternalServiceFactory<IQuarantineService>.CreateAsync(ctx)
METHODS:
  QuarantineRecordAsync(tenantId, record, failureReason, context) → DataProcessResult<Dictionary>
  GetQuarantinedRecordsAsync(tenantId, filter)                   → DataProcessResult<List<Dictionary>>
  ResolveQuarantineAsync(tenantId, quarantineId, resolution)     → DataProcessResult<Dictionary>
  ReplayQuarantinedAsync(tenantId, quarantineId)                 → DataProcessResult<Dictionary>
  GetQuarantineStatsAsync(tenantId, dateRange)                   → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - Failure reasons include: NORMALIZATION_ERROR, SCHEMA_DRIFT_REJECTED, TYPE_MISMATCH,
    MISSING_REQUIRED_FIELD, IDENTITY_RESOLUTION_CONFLICT, PII_CLASSIFICATION_BLOCKED.
  - Resolution options: FIXED_AND_REPLAY, EXCLUDED_WITH_REASON, SCHEMA_UPDATED_REPLAY.
  - ReplayQuarantinedAsync pushes the record back to F441 IReplayBufferService.
  - Quarantine count per tenant per provider is a data quality metric (F458).
  - High quarantine rate triggers alert via F457 IFreshnessCheckService.
MACHINE: Quarantine record structure, resolution state machine, replay routing
FREEDOM: Quarantine alert threshold (% of batch), retention period, auto-resolve rules
```

### F446: IIdentityResolutionService
```
FAMILY: 55 — Transformation & Staging
PURPOSE: Resolve cross-system entity identities using probabilistic scoring.
         Match ClickUp users ↔ Zoho CRM contacts ↔ Zoho Desk agents ↔ internal user
         records. Uses multiple signals: email similarity, name similarity, organization
         membership, temporal correlation. Produces confidence score (0.0–1.0).
         High-confidence matches auto-merge; low-confidence queued for human review.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → PostgreSQL provider (identity_resolution table)
  AI:         RAG FABRIC (Skill 00b) → Hybrid strategy (vector similarity + graph traversal)
  Mapping:    F440 ISourceObjectMapService (cross-system ID storage)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (identity.matched, identity.review_needed)
CREATION: IExternalServiceFactory<IIdentityResolutionService>.CreateAsync(ctx)
METHODS:
  ResolveIdentityAsync(tenantId, sourceRecord, provider)         → DataProcessResult<Dictionary>
  BatchResolveAsync(tenantId, sourceRecords, provider)           → DataProcessResult<List<Dictionary>>
  GetMatchCandidatesAsync(tenantId, entity, signals)             → DataProcessResult<List<Dictionary>>
  ScoreMatchAsync(tenantId, entityA, entityB, signalWeights)     → DataProcessResult<Dictionary>
  ConfirmMatchAsync(tenantId, matchId)                           → DataProcessResult<bool>
  RejectMatchAsync(tenantId, matchId, reason)                    → DataProcessResult<bool>
  GetPendingReviewsAsync(tenantId, filter)                       → DataProcessResult<List<Dictionary>>
  GetUnifiedEntityAsync(tenantId, unifiedEntityId)               → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6 + DNA-9 (SoD: match confirmation ≠ ingestion operator)
CRITICAL:
  - DR-61: Probabilistic scoring ALWAYS used, even for exact email matches (score = 1.0).
  - Scoring signals: email_exact (weight: 0.40), email_domain (0.10), name_fuzzy (0.20),
    org_membership (0.15), temporal_overlap (0.10), manual_override (0.05). FREEDOM: weights.
  - CF-204: Identity resolution MUST NOT join cross-tenant records. tenantId filter on EVERY query.
  - IR-175-1: Cross-tenant identity join = BUILD FAILURE.
  - Auto-merge threshold: default 0.85 (FREEDOM configurable per tenant).
  - Below threshold: queued for human review via GetPendingReviewsAsync.
  - Unified entity: single Dictionary with merged attributes + provenance tracking
    (which field came from which system with which confidence).
  - RAG FABRIC usage: vector similarity on entity name + email for candidate retrieval,
    graph traversal for organizational membership overlap.
MACHINE: Scoring formula (weighted sum), auto-merge logic, provenance tracking structure
FREEDOM: Signal weights, auto-merge threshold, candidate retrieval limit, review queue TTL
```

### F447: ICurrencyNormalizerService
```
FAMILY: 55 — Transformation & Staging
PURPOSE: Normalize multi-currency values from external SaaS records to a common base
         currency for warehouse analytics. Consumes exchange rates from F387
         IExchangeRateService (FLOW-13). Supports spot rates, average rates, and
         closing rates depending on mart context.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → PostgreSQL provider (currency conversion logs)
  Reuse:      F387 IExchangeRateService (FLOW-13) → read-only rate access
CREATION: IExternalServiceFactory<ICurrencyNormalizerService>.CreateAsync(ctx)
METHODS:
  NormalizeCurrencyAsync(tenantId, amount, fromCurrency, date, rateType) → DataProcessResult<Dictionary>
  BatchNormalizeCurrencyAsync(tenantId, records, currencyField, dateField, rateType) → DataProcessResult<List<Dictionary>>
  GetBaseCurrencyAsync(tenantId)                                 → DataProcessResult<string>
  GetConversionLogAsync(tenantId, dateRange)                     → DataProcessResult<List<Dictionary>>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - Zoho CRM deals may have currency fields (Multi-Currency enabled orgs).
  - ClickUp doesn't have native currency — but time-tracking cost rates may be in local currency.
  - Base currency per tenant is FREEDOM config. All mart-level monetary values in base currency.
  - Rate type selection: spot for real-time, average for period aggregates, closing for snapshots.
  - F387 integration: read-only consumption. F447 NEVER writes exchange rates.
  - Conversion log: every normalization recorded for auditability (amount, from, to, rate, date).
MACHINE: Conversion formula (amount × rate), rate type routing, conversion log emission
FREEDOM: Base currency per tenant, default rate type, rate source priority
```

### F448: ITimezoneNormalizerService
```
FAMILY: 55 — Transformation & Staging
PURPOSE: Standardize all timestamps from external SaaS records to UTC for warehouse
         storage. Map timestamps to fiscal periods using EP-5 (Period Lock Registry)
         for cross-flow analytics alignment with FLOW-13 finance data.
FABRIC RESOLUTION:
  Primary:    CORE FABRIC (Skill 01 — ObjectProcessor component)
  Reuse:      F386 IFiscalCalendarService (FLOW-13) → read-only period resolution
CREATION: IExternalServiceFactory<ITimezoneNormalizerService>.CreateAsync(ctx)
METHODS:
  NormalizeTimestampAsync(tenantId, timestamp, sourceTimezone)    → DataProcessResult<Dictionary>
  BatchNormalizeTimestampsAsync(tenantId, records, timestampFields, sourceTimezone) → DataProcessResult<List<Dictionary>>
  MapToFiscalPeriodAsync(tenantId, legalEntityId, utcTimestamp)  → DataProcessResult<Dictionary>
  GetSourceTimezoneAsync(tenantId, connectorId)                  → DataProcessResult<string>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - DD-82: UTC storage + EP-5 fiscal period mapping.
  - ClickUp timestamps: milliseconds since epoch. Source timezone from workspace settings.
  - Zoho timestamps: ISO 8601 with timezone. Convert to UTC.
  - Fiscal period mapping: optional but critical for FLOW-13 integration. If tenant has
    FLOW-13 enabled, every staging record gets `_fiscalPeriod` derived from EP-5.
  - F386 integration: read-only consumption. F448 NEVER modifies fiscal calendars.
MACHINE: UTC conversion logic, epoch-to-ISO conversion, EP-5 period resolution
FREEDOM: Source timezone override per connector, fiscal period mapping enabled/disabled per tenant
```

---

## FACTORY FAMILY 56 — Warehouse Model Layer
## Factories: F449–F453 | Fabric: DATABASE FABRIC (PG)

### F449: IDimensionLoaderService
```
FAMILY: 56 — Warehouse Model Layer
PURPOSE: Load and maintain warehouse dimension tables using SCD Type 2 (DR-62).
         Dimensions: dim_user (unified cross-system), dim_workspace (ClickUp hierarchy),
         dim_account (Zoho CRM accounts), dim_project (cross-system projects),
         dim_date (standard date dimension), dim_connector (source system metadata).
         Each dimension change creates new version row — NEVER overwrites.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → PostgreSQL provider (warehouse dims schema)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (dim.loaded, dim.version_created)
CREATION: IExternalServiceFactory<IDimensionLoaderService>.CreateAsync(ctx)
METHODS:
  LoadDimensionAsync(tenantId, dimType, stagingRecords)           → DataProcessResult<Dictionary>
  GetCurrentDimRecordAsync(tenantId, dimType, businessKey)        → DataProcessResult<Dictionary>
  GetDimHistoryAsync(tenantId, dimType, businessKey, dateRange)   → DataProcessResult<List<Dictionary>>
  CreateDimVersionAsync(tenantId, dimType, businessKey, newAttrs) → DataProcessResult<Dictionary>
  CloseDimVersionAsync(tenantId, dimType, surrogateKey, effectiveEnd) → DataProcessResult<bool>
  GetDimCountAsync(tenantId, dimType)                             → DataProcessResult<long>
  LookupSurrogateKeyAsync(tenantId, dimType, businessKey, asOfDate) → DataProcessResult<long>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - DR-62: SCD Type 2 — NEVER UpdateDocument on dimension records. Always insert new version
    + close prior version. AF-7 rejects Update calls on dim tables.
  - Surrogate key: auto-generated long (bigint). Business key: (tenantId, dimType, naturalKey).
  - dim_user merges identities from F446 (unified entity). Confidence score stored in dim record.
  - dim_date: pre-populated for 10-year range. No external dependency.
  - Each dim record: { surrogateKey, tenantId, businessKey, ...attributes,
    _effectiveStart, _effectiveEnd (null=current), _sourceProvider, _loadedAt }.
  - LookupSurrogateKeyAsync: point-in-time join — given business key + date, return surrogate
    that was current at that date. Critical for fact table foreign key resolution.
MACHINE: SCD-2 version management, surrogate key generation, point-in-time lookup algorithm
FREEDOM: Dimension types enabled per tenant, attribute change detection sensitivity,
         dim_date range (start/end year)
```

### F450: IFactWriterService
```
FAMILY: 56 — Warehouse Model Layer
PURPOSE: Append-only fact table writer for warehouse facts: fact_task_event (ClickUp
         status changes, assignments), fact_deal_stage (Zoho CRM pipeline snapshots),
         fact_time_entry (ClickUp time tracking), fact_ticket (Zoho Desk support tickets),
         fact_invoice (cross-system billing events). Facts reference dimension surrogate
         keys resolved by F449 LookupSurrogateKeyAsync.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → PostgreSQL provider (warehouse facts schema)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (fact.written, fact.batch_completed)
CREATION: IExternalServiceFactory<IFactWriterService>.CreateAsync(ctx)
METHODS:
  WriteFactAsync(tenantId, factType, factRecord)                 → DataProcessResult<Dictionary>
  BulkWriteFactsAsync(tenantId, factType, factRecords)           → DataProcessResult<Dictionary>
  GetFactCountAsync(tenantId, factType, dateRange)               → DataProcessResult<long>
  GetFactSampleAsync(tenantId, factType, filter, sampleSize)     → DataProcessResult<List<Dictionary>>
  ResolveDimensionKeysAsync(tenantId, factRecord, dimMappings)   → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - Facts are APPEND-ONLY. No update. No delete. AF-7 enforces.
  - Each fact record: { factId (auto-generated), tenantId, factType, eventTimestamp,
    _dim_user_sk, _dim_workspace_sk, _dim_account_sk, _dim_date_sk, _dim_connector_sk,
    ...measure fields, _sourceRawId, _sourceStagingId, _loadedAt }.
  - ResolveDimensionKeysAsync: takes staging record → resolves all dimension surrogate keys
    using F449 LookupSurrogateKeyAsync with event timestamp for point-in-time accuracy.
  - fact_task_event measures: statusDuration_ms, priority, blockedDuration_ms.
  - fact_deal_stage measures: dealAmount, dealProbability, stageEntryDuration_hours.
  - fact_time_entry measures: duration_ms, billableFlag, costRate, billRate.
  - fact_ticket measures: resolutionTime_hours, reopenCount, satisfactionScore.
MACHINE: Append-only enforcement, surrogate key resolution, fact schema validation
FREEDOM: Fact types enabled per tenant, measure field selection, date grain (hourly/daily)
```

### F451: IMartBuilderService
```
FAMILY: 56 — Warehouse Model Layer
PURPOSE: Build business-facing aggregate marts from core dimensions and facts.
         Four standard marts: Delivery (execution metrics), Sales (pipeline metrics),
         Finance (profitability metrics), Support (SLA metrics). Marts are materialized
         views refreshed incrementally. Each mart is PII-classified (DR-63) before write.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → PostgreSQL provider (warehouse marts schema)
  PII:        F462 IPiiClassificationService (pre-mart PII check — DR-63)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (mart.refreshed, mart.build_failed)
CREATION: IExternalServiceFactory<IMartBuilderService>.CreateAsync(ctx)
METHODS:
  BuildMartAsync(tenantId, martType, buildConfig)                → DataProcessResult<Dictionary>
  IncrementalRefreshAsync(tenantId, martType, sinceTimestamp)    → DataProcessResult<Dictionary>
  GetMartMetadataAsync(tenantId, martType)                       → DataProcessResult<Dictionary>
  GetMartRecordCountAsync(tenantId, martType)                    → DataProcessResult<long>
  ValidateMartIntegrityAsync(tenantId, martType)                 → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - CF-207: Mart builder MUST consume PII-classified records from F462 BEFORE writing.
  - DR-60: Only fields in admin-approved schema version enter mart (schema drift gate).
  - DR-63: PII fields masked/tokenized/excluded per tenant config before mart write.
  - Delivery mart: cycle_time, throughput, WIP_count, blocked_time per workspace/project.
    Source: fact_task_event + dim_workspace + dim_user.
  - Sales mart: funnel_conversion_rate, stage_velocity, win_rate, pipeline_value per account.
    Source: fact_deal_stage + dim_account + dim_user.
  - Finance mart: project_profitability, cost_vs_budget, utilization_rate per project.
    Source: fact_time_entry + fact_deal_stage + dim_project + dim_user.
    Consumes FLOW-13 finance data if tenant has FLOW-13 enabled (CF-208).
  - Support mart: sla_compliance_rate, resolution_time_avg, reopen_rate, csat_score per account.
    Source: fact_ticket + dim_account + dim_user.
  - Incremental refresh: only process facts loaded since last refresh timestamp.
MACHINE: Mart aggregation queries, PII check enforcement, integrity validation
FREEDOM: Mart types enabled per tenant, refresh schedule (hourly/daily/weekly),
         aggregation grain (daily/weekly/monthly), PII masking rules per mart per tenant
```

### F452: ISnapshotService
```
FAMILY: 56 — Warehouse Model Layer
PURPOSE: Capture periodic snapshots of key business states for trend analysis.
         Pipeline snapshots: deal stage counts and values per day. WIP snapshots:
         active task counts by status per day. Backlog snapshots: open tickets by
         priority per day. Snapshots are immutable fact records — never overwritten.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → PostgreSQL provider (warehouse snapshots schema)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (snapshot.captured)
CREATION: IExternalServiceFactory<ISnapshotService>.CreateAsync(ctx)
METHODS:
  CaptureSnapshotAsync(tenantId, snapshotType, snapshotDate)     → DataProcessResult<Dictionary>
  GetSnapshotAsync(tenantId, snapshotType, snapshotDate)         → DataProcessResult<Dictionary>
  GetSnapshotSeriesAsync(tenantId, snapshotType, dateRange)      → DataProcessResult<List<Dictionary>>
  GetLatestSnapshotAsync(tenantId, snapshotType)                 → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - Snapshots are append-only (like facts). One per (tenantId, snapshotType, snapshotDate).
  - Duplicate capture on same date: silently deduplicate (idempotent).
  - Pipeline snapshot: counts + total value per deal stage. Enables "pipeline movement" analytics.
  - WIP snapshot: counts per task status (open, in_progress, review, done, blocked).
  - Backlog snapshot: open ticket counts per priority + per category.
MACHINE: Snapshot aggregation logic, deduplication, immutability
FREEDOM: Snapshot types enabled per tenant, capture schedule (daily/weekly), retention period
```

### F453: IRetentionPolicyService
```
FAMILY: 56 — Warehouse Model Layer
PURPOSE: Enforce tenant-scoped data retention policies per warehouse zone. Admin
         configures retention period per zone (raw: 365d, staging: 180d, core: indefinite,
         mart: 90d). Expired records are deleted (or archived) on schedule. Deletion
         respects GDPR right-to-erasure timelines when combined with F464 IDataExportService.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → PostgreSQL provider (retention policy config + execution log)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (retention.executed, retention.records_deleted)
CREATION: IExternalServiceFactory<IRetentionPolicyService>.CreateAsync(ctx)
METHODS:
  GetPolicyAsync(tenantId, zone)                                 → DataProcessResult<Dictionary>
  SetPolicyAsync(tenantId, zone, retentionDays)                  → DataProcessResult<Dictionary>
  ExecuteRetentionAsync(tenantId, zone)                          → DataProcessResult<Dictionary>
  GetRetentionLogAsync(tenantId, zone, dateRange)                → DataProcessResult<List<Dictionary>>
  PreviewRetentionAsync(tenantId, zone)                          → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6 + DNA-9 (SoD: retention policy admin ≠ data viewer)
CRITICAL:
  - DR-58 exception: raw zone records CAN be deleted by retention policy after retention
    period expires. This is the ONLY mechanism that deletes raw records.
  - PreviewRetentionAsync: shows count of records that WOULD be deleted — no actual deletion.
  - ExecuteRetentionAsync: logged in F459 IWarehouseAuditService before execution.
  - GDPR: when F464 triggers right-to-erasure, retention service deletes specific user's records
    across all zones (targeted deletion, not bulk retention).
MACHINE: Retention calculation (record age vs policy), targeted deletion logic
FREEDOM: Retention days per zone per tenant, archive-before-delete option, execution schedule
```

---

## FACTORY FAMILY 57 — Metrics & Semantic Layer
## Factories: F454–F456 | Fabric: DATABASE FABRIC + QUEUE FABRIC

### F454: IMetricDefinitionService
```
FAMILY: 57 — Metrics & Semantic Layer
PURPOSE: Manage the KPI registry — single, authoritative definitions of business metrics.
         Each metric has: name, formula (SQL or expression), source tables, dimensions,
         aggregation grain, and thresholds. Admin creates/edits metric definitions in
         FREEDOM config. Engine generates the computation logic from the definition.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → Elasticsearch provider (metric_definitions index)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (metric.defined, metric.updated)
CREATION: IExternalServiceFactory<IMetricDefinitionService>.CreateAsync(ctx)
METHODS:
  DefineMetricAsync(tenantId, metricDoc)                         → DataProcessResult<Dictionary>
  GetMetricAsync(tenantId, metricId)                             → DataProcessResult<Dictionary>
  ListMetricsAsync(tenantId, filter)                             → DataProcessResult<List<Dictionary>>
  UpdateMetricAsync(tenantId, metricId, patchDoc)                → DataProcessResult<Dictionary>
  ValidateMetricFormulaAsync(tenantId, metricDoc)                → DataProcessResult<Dictionary>
  GetMetricLineageAsync(tenantId, metricId)                      → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - Standard metrics pre-seeded per tenant (FREEDOM — admin can customize):
    cycle_time: AVG(task_done_timestamp - task_start_timestamp) per dim_workspace
    pipeline_velocity: SUM(deal_amount × deal_probability) / COUNT(distinct deal) per stage
    utilization: SUM(time_entry_duration) / capacity per dim_user
    project_profitability: (contract_value - SUM(time_cost)) / contract_value per dim_project
    sla_compliance: COUNT(resolved_within_sla) / COUNT(all_tickets) per dim_account
    win_rate: COUNT(won_deals) / COUNT(all_closed_deals) per dim_account
  - ValidateMetricFormulaAsync: checks that referenced tables/fields exist in approved schema.
  - Metric lineage: shows source tables → transformation path → mart output for audit.
MACHINE: Metric validation logic, lineage graph computation
FREEDOM: All metric definitions — formula, source tables, dimensions, thresholds, display format
```

### F455: ISemanticQueryService
```
FAMILY: 57 — Metrics & Semantic Layer
PURPOSE: Execute tenant-scoped KPI queries against mart layer using metric definitions
         from F454. Translates metric definitions into SQL, applies tenant/dimension filters,
         caches results, and returns computed KPI values. This is the analytics API that
         dashboards and BI tools consume.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → PostgreSQL provider (mart schema — read-only)
  Cache:      DATABASE FABRIC (Skill 05) → Redis provider (semantic_cache:{tenantId}:{metricId}, TTL: configurable)
CREATION: IExternalServiceFactory<ISemanticQueryService>.CreateAsync(ctx)
METHODS:
  QueryMetricAsync(tenantId, metricId, dimensionFilters, dateRange) → DataProcessResult<Dictionary>
  QueryMultipleMetricsAsync(tenantId, metricIds, dimensionFilters, dateRange) → DataProcessResult<List<Dictionary>>
  GetCachedResultAsync(tenantId, metricId, queryHash)            → DataProcessResult<Dictionary>
  InvalidateCacheAsync(tenantId, metricId)                       → DataProcessResult<bool>
  ExplainQueryAsync(tenantId, metricId, dimensionFilters)        → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - tenantId injected into EVERY generated SQL query (DNA-5). No cross-tenant data access.
  - Query generation: F454 metric definition → SQL template → inject tenant + dim filters → execute.
  - Cache key: hash of (tenantId, metricId, dimensionFilters, dateRange). TTL is FREEDOM config.
  - ExplainQueryAsync: returns the generated SQL + execution plan for debugging (admin only).
  - RLS (F463) enforced at database level as additional safety layer beyond application-level filter.
MACHINE: SQL generation from metric definitions, cache key computation, RLS enforcement
FREEDOM: Cache TTL per metric, query timeout, max result set size, enabled dimension filters
```

### F456: IReverseEtlService
```
FAMILY: 57 — Metrics & Semantic Layer
PURPOSE: Push computed insights back to external SaaS platforms (reverse ETL / activation).
         Threshold-driven: when a KPI crosses a configured threshold, an activation event
         is published to QUEUE FABRIC. Examples: "overdue high-value deal" → create ClickUp
         task, "SLA breach risk" → update Zoho Desk priority, "utilization above 95%" →
         create ClickUp capacity warning task.
FABRIC RESOLUTION:
  Primary:    QUEUE FABRIC (Skill 04) → Redis Streams (activation.triggered, activation.completed, activation.failed)
  State:      DATABASE FABRIC (Skill 05) → PostgreSQL provider (activation job state + history)
  Rate:       F430 IRateLimitGuardService (rate limit before external API push)
  Creds:      F427 ICredentialVaultService (OAuth tokens for external API writes)
CREATION: IExternalServiceFactory<IReverseEtlService>.CreateAsync(ctx)
METHODS:
  EvaluateThresholdsAsync(tenantId, metricResults)               → DataProcessResult<List<Dictionary>>
  TriggerActivationAsync(tenantId, activationDef, payload)       → DataProcessResult<Dictionary>
  GetActivationHistoryAsync(tenantId, filter)                    → DataProcessResult<List<Dictionary>>
  PauseActivationAsync(tenantId, activationId)                   → DataProcessResult<bool>
  ResumeActivationAsync(tenantId, activationId)                  → DataProcessResult<bool>
  GetActivationStatusAsync(tenantId, activationId)               → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6 + DNA-9 (SoD: activation admin ≠ metric viewer)
CRITICAL:
  - DR-64: Activation goes through QUEUE FABRIC as events — NEVER direct HTTP to external API.
  - CF-213: Reverse ETL MUST NOT push to locked records (e.g., locked fiscal periods in Zoho).
  - Flow: EvaluateThresholdsAsync → TriggerActivationAsync → QUEUE FABRIC → consumer reads →
    F430 rate limit check → F427 credential fetch → external API call → F459 audit log.
  - Activation definitions stored as FREEDOM config: { metricId, operator (>, <, ==),
    threshold, targetProvider, targetAction (create_task, update_field, send_notification),
    cooldownMinutes (prevent repeated triggers) }.
  - Idempotency: activation events carry idempotency key to prevent duplicate external actions.
MACHINE: Threshold evaluation logic, idempotency key generation, cooldown enforcement
FREEDOM: Activation definitions (metric + threshold + target + action), cooldown period,
         target provider/action, enabled/disabled per tenant
```

---

## FACTORY FAMILY 58 — Data Quality & Observability
## Factories: F457–F460 | Fabric: QUEUE FABRIC + DATABASE FABRIC

### F457: IFreshnessCheckService
```
FAMILY: 58 — Data Quality & Observability
PURPOSE: Monitor data freshness across all warehouse zones. Detect when sync hasn't
         run (stale data), when volume drops unexpectedly (broken ingestion), or when
         processing lag exceeds SLA thresholds. Emit alerts via QUEUE FABRIC.
FABRIC RESOLUTION:
  Primary:    QUEUE FABRIC (Skill 04) → Redis Streams (freshness.alert, freshness.check_completed)
  State:      DATABASE FABRIC (Skill 05) → Elasticsearch provider (freshness_history index)
CREATION: IExternalServiceFactory<IFreshnessCheckService>.CreateAsync(ctx)
METHODS:
  CheckFreshnessAsync(tenantId, zone, provider, entityType)      → DataProcessResult<Dictionary>
  CheckVolumeAnomalyAsync(tenantId, zone, provider, entityType)  → DataProcessResult<Dictionary>
  GetFreshnessReportAsync(tenantId, dateRange)                   → DataProcessResult<Dictionary>
  SetFreshnessSlaAsync(tenantId, zone, provider, maxAgeMinutes)  → DataProcessResult<bool>
  GetAlertHistoryAsync(tenantId, filter)                         → DataProcessResult<List<Dictionary>>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - Freshness = time since last successful ingest per (tenantId, zone, provider, entityType).
  - Volume anomaly = today's record count vs 7-day rolling average. Drop > 50% = alert.
  - Freshness SLA is FREEDOM config per tenant per zone per provider.
  - Alerts fan out to QUEUE FABRIC for notification routing (email, Slack, dashboard badge).
MACHINE: Freshness calculation, volume anomaly detection (rolling average + threshold)
FREEDOM: SLA thresholds per zone, volume anomaly sensitivity, alert recipients, check frequency
```

### F458: IDataQualityRulesService
```
FAMILY: 58 — Data Quality & Observability
PURPOSE: Execute configurable data quality rules against warehouse records. Rules include:
         null/empty checks on required fields, enum validity (status values, stage names),
         referential integrity (FK existence), value range checks (amount > 0),
         uniqueness checks, and format validation (email, date). Produces quality score
         per batch and per record.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → Elasticsearch provider (quality_rules index + results)
CREATION: IExternalServiceFactory<IDataQualityRulesService>.CreateAsync(ctx)
METHODS:
  DefineRuleAsync(tenantId, ruleDoc)                             → DataProcessResult<Dictionary>
  ExecuteRulesAsync(tenantId, zone, entityType, records)         → DataProcessResult<Dictionary>
  GetQualityScoreAsync(tenantId, zone, entityType, dateRange)    → DataProcessResult<Dictionary>
  GetFailedRecordsAsync(tenantId, ruleId, dateRange)             → DataProcessResult<List<Dictionary>>
  ListRulesAsync(tenantId, filter)                               → DataProcessResult<List<Dictionary>>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - Rules stored as FREEDOM config — admin defines quality expectations per entity type.
  - Rule execution returns: { totalRecords, passedCount, failedCount, qualityScore (0-100),
    failedByRule: { ruleId: count }, sampleFailures: [...] }.
  - Failed records optionally routed to F445 IQuarantineService.
  - Quality score < threshold → alert via F457 IFreshnessCheckService.
MACHINE: Rule execution engine, quality score calculation, failure sampling
FREEDOM: Rule definitions per entity type per tenant, quality score threshold, quarantine-on-failure flag
```

### F459: IWarehouseAuditService
```
FAMILY: 58 — Data Quality & Observability
PURPOSE: Immutable audit trail for all warehouse operations. Every data mutation (ingest,
         transform, dim load, fact write, mart refresh, retention delete, activation push)
         creates an audit record. Inherits DR-50 (FLOW-13) append-only audit pattern.
         WORM (Write Once Read Many) — audit records NEVER updated or deleted.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → PostgreSQL provider (warehouse_audit table — WORM)
  Index:      DATABASE FABRIC (Skill 05) → Elasticsearch provider (audit search index)
CREATION: IExternalServiceFactory<IWarehouseAuditService>.CreateAsync(ctx)
METHODS:
  LogOperationAsync(tenantId, operationType, context)             → DataProcessResult<Dictionary>
  SearchAuditAsync(tenantId, filter)                              → DataProcessResult<List<Dictionary>>
  GetAuditByRecordAsync(tenantId, recordId)                      → DataProcessResult<List<Dictionary>>
  GetAuditByActorAsync(tenantId, actorId, dateRange)             → DataProcessResult<List<Dictionary>>
  ExportAuditAsync(tenantId, dateRange, format)                  → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - WORM enforcement: LogOperationAsync uses INSERT ONLY — no UPDATE, no DELETE on audit table.
  - Audit record: { auditId, tenantId, actorId, operationType, zone, entityType,
    recordId, beforeHash, afterHash, timestamp_utc, correlationId, flowId, syncRunId }.
  - CF-209: Audit trail MUST be written BEFORE any warehouse mutation is committed.
  - Audit records searchable via Elasticsearch index (separate from WORM PG table).
MACHINE: WORM enforcement, audit record structure, before/after hash computation
FREEDOM: Audit retention period, export format options (JSON/CSV), search index refresh interval
```

### F460: ILineageTrackerService
```
FAMILY: 58 — Data Quality & Observability
PURPOSE: Track end-to-end data lineage across all warehouse zones. For any mart record,
         answer: "where did this data come from?" — trace back through mart → core → staging
         → raw → external API source. For any raw record, answer: "where did this data go?"
         — trace forward to all downstream consumers.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → Elasticsearch provider (lineage_graph index)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (lineage.edge_created)
CREATION: IExternalServiceFactory<ILineageTrackerService>.CreateAsync(ctx)
METHODS:
  RecordLineageEdgeAsync(tenantId, sourceRecord, targetRecord, transformType) → DataProcessResult<Dictionary>
  TraceBackwardAsync(tenantId, recordId, zone)                   → DataProcessResult<List<Dictionary>>
  TraceForwardAsync(tenantId, recordId, zone)                    → DataProcessResult<List<Dictionary>>
  GetLineageGraphAsync(tenantId, entityType, dateRange)          → DataProcessResult<Dictionary>
  GetTransformationChainAsync(tenantId, recordId)                → DataProcessResult<List<Dictionary>>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - Each zone transition creates a lineage edge: { sourceZone, sourceRecordId, targetZone,
    targetRecordId, transformType, timestamp, syncRunId }.
  - Transform types: RAW_INGESTED, NORMALIZED, STAGED, DIM_LOADED, FACT_WRITTEN,
    MART_AGGREGATED, SNAPSHOT_CAPTURED, ACTIVATION_PUSHED.
  - Lineage graph stored in Elasticsearch (document-per-edge for fast traversal).
  - Used by F454 GetMetricLineageAsync to show KPI → source data lineage.
MACHINE: Edge creation, graph traversal (backward/forward), transformation chain assembly
FREEDOM: Lineage retention period, graph visualization depth limit, enabled transform types
```

---

## FACTORY FAMILY 59 — Warehouse Governance & Tenant Isolation
## Factories: F461–F465 | Fabric: CORE FABRIC + AI ENGINE FABRIC + DATABASE FABRIC + QUEUE FABRIC

### F461: ITenantWarehouseIsolationService
```
FAMILY: 59 — Warehouse Governance & Tenant Isolation
PURPOSE: Enforce warehouse-specific multi-tenant isolation tiers (pool/bridge/silo) per
         zone per tenant. Extends FLOW-08 isolation model (Skill 11) with zone-level
         granularity. Admin can configure different isolation per zone — e.g., silo for
         raw (compliance), pool for mart (shared analytics).
FABRIC RESOLUTION:
  Primary:    CORE FABRIC (Skill 01 — MicroserviceBase + Config)
  Reuse:      MULTI-TENANT ISOLATION FABRIC (Skill 11 — from FLOW-08)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (isolation.tier_changed, isolation.graduated)
CREATION: IExternalServiceFactory<ITenantWarehouseIsolationService>.CreateAsync(ctx)
METHODS:
  GetIsolationTierAsync(tenantId, zone)                          → DataProcessResult<Dictionary>
  SetIsolationTierAsync(tenantId, zone, tier)                    → DataProcessResult<Dictionary>
  GraduateTierAsync(tenantId, zone, fromTier, toTier)            → DataProcessResult<Dictionary>
  ValidateIsolationAsync(tenantId)                               → DataProcessResult<Dictionary>
  GetIsolationMatrixAsync(tenantId)                              → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6 + DNA-9 (SoD: isolation admin ≠ data consumer)
CRITICAL:
  - DR-65: Warehouse isolation inherits FLOW-08 tenant model but adds zone granularity.
  - Pool: shared schema, tenantId filter on every query (DNA-5). Default for all zones.
  - Bridge: separate PG schema per tenant per zone. search_path scoped.
  - Silo: separate database/ES index per tenant per zone. Config-driven routing.
  - GraduateTierAsync: live migration from pool→bridge→silo without downtime.
    Uses F441 IReplayBufferService to replay raw records into new isolated storage.
  - ValidateIsolationAsync: confirms no cross-tenant data leakage across all zones.
  - CF-204–CF-206: Isolation enforcement at each zone boundary.
MACHINE: Tier routing logic, graduation migration algorithm, cross-tenant validation
FREEDOM: Tier per zone per tenant (matrix), graduation thresholds (data volume, compliance flag),
         auto-graduation enabled/disabled
```

### F462: IPiiClassificationService
```
FAMILY: 59 — Warehouse Governance & Tenant Isolation
PURPOSE: Classify fields and records for PII (Personally Identifiable Information)
         content using a combination of AI-powered detection (LLM) and rule-based
         patterns (regex for email, phone, national IDs). Classification is a prerequisite
         for mart promotion (DR-63). Masking rules applied based on classification.
FABRIC RESOLUTION:
  Primary:    AI ENGINE FABRIC (Skill 07) → AiDispatcher (Claude for semantic PII detection)
  Rules:      DATABASE FABRIC (Skill 05) → Elasticsearch provider (pii_rules index)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (pii.classified, pii.rule_updated)
CREATION: IExternalServiceFactory<IPiiClassificationService>.CreateAsync(ctx)
METHODS:
  ClassifyRecordAsync(tenantId, record, entityType)              → DataProcessResult<Dictionary>
  BatchClassifyAsync(tenantId, records, entityType)              → DataProcessResult<List<Dictionary>>
  MaskFieldAsync(tenantId, record, fieldName, maskingStrategy)   → DataProcessResult<Dictionary>
  GetPiiRulesAsync(tenantId)                                     → DataProcessResult<List<Dictionary>>
  UpdatePiiRuleAsync(tenantId, ruleId, patchDoc)                 → DataProcessResult<Dictionary>
  GetClassificationReportAsync(tenantId, dateRange)              → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6 + DNA-9 (SoD: PII rule admin ≠ data viewer)
CRITICAL:
  - DR-63: EVERY record MUST be classified before entering mart layer.
  - CF-207: Mart builder (F451) MUST consume classified records from F462.
  - Two-layer detection: (1) rule-based regex for known PII patterns (email, phone, SSN formats),
    (2) AI-based semantic detection via IAiProvider for contextual PII (free-text fields
    containing names, addresses, medical info).
  - Masking strategies: HASH (SHA-256), REDACT (replace with ***), TOKENIZE (reversible token),
    EXCLUDE (field removed from mart record entirely).
  - Classification result per field: { fieldName, piiType (EMAIL, PHONE, NAME, ADDRESS, OTHER),
    confidence, detectionMethod (RULE/AI), recommendedMasking }.
MACHINE: Rule-based regex matching, AI classification orchestration, masking algorithm
FREEDOM: PII rules per tenant, masking strategy per PII type, AI model selection,
         confidence threshold for AI-detected PII, excluded fields whitelist
```

### F463: IRowLevelSecurityService
```
FAMILY: 59 — Warehouse Governance & Tenant Isolation
PURPOSE: Generate and manage database-level Row Level Security (RLS) policies for each
         tenant per warehouse zone. RLS is a defense-in-depth layer beyond application-level
         tenantId filtering (DNA-5). Even if application code has a bug, RLS prevents
         cross-tenant data access at the database engine level.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → PostgreSQL provider (RLS policy management)
CREATION: IExternalServiceFactory<IRowLevelSecurityService>.CreateAsync(ctx)
METHODS:
  CreateRlsPolicyAsync(tenantId, zone, tableName)                → DataProcessResult<Dictionary>
  ValidateRlsPolicyAsync(tenantId, zone, tableName)              → DataProcessResult<bool>
  ListRlsPoliciesAsync(tenantId, zone)                           → DataProcessResult<List<Dictionary>>
  TestRlsIsolationAsync(tenantId, zone, tableName)               → DataProcessResult<Dictionary>
  RevokeRlsPolicyAsync(tenantId, zone, tableName)                → DataProcessResult<bool>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - RLS policies enforce: `WHERE tenant_id = current_setting('app.current_tenant')`.
  - CreateRlsPolicyAsync: generates PostgreSQL CREATE POLICY + ALTER TABLE ENABLE ROW LEVEL SECURITY.
  - TestRlsIsolationAsync: attempts cross-tenant read with test credentials and confirms zero rows.
  - RLS is ADDITIVE to DNA-5 application-level scoping — belt-and-suspenders approach.
  - Applied to: staging tables, dimension tables, fact tables, mart tables, audit tables.
MACHINE: RLS SQL generation, isolation testing, policy validation
FREEDOM: Tables to protect per zone (default: all), test frequency, policy naming convention
```

### F464: IDataExportService
```
FAMILY: 59 — Warehouse Governance & Tenant Isolation
PURPOSE: Orchestrate GDPR data export (right of access) and right-to-erasure across all
         warehouse zones. On export: collect all records for a specific data subject across
         raw → staging → core → mart → audit. On erasure: delete or anonymize all records
         for a data subject while preserving aggregate analytics integrity.
FABRIC RESOLUTION:
  Primary:    QUEUE FABRIC (Skill 04) → Redis Streams (export.requested, export.completed, erasure.completed)
  State:      DATABASE FABRIC (Skill 05) → PostgreSQL provider (export/erasure job state)
  Audit:      F459 IWarehouseAuditService (audit every export/erasure operation)
CREATION: IExternalServiceFactory<IDataExportService>.CreateAsync(ctx)
METHODS:
  RequestExportAsync(tenantId, subjectIdentifier, format)        → DataProcessResult<Dictionary>
  RequestErasureAsync(tenantId, subjectIdentifier, retentionOverride) → DataProcessResult<Dictionary>
  GetExportStatusAsync(tenantId, exportId)                       → DataProcessResult<Dictionary>
  GetErasureStatusAsync(tenantId, erasureId)                     → DataProcessResult<Dictionary>
  DownloadExportAsync(tenantId, exportId)                        → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6 + DNA-9 (SoD: export/erasure admin ≠ data consumer)
CRITICAL:
  - Export traverses all zones using F460 ILineageTrackerService to find all records for subject.
  - Erasure strategy: raw zone → delete record + log deletion in audit; staging → delete;
    core dim → anonymize (replace PII with hash, keep aggregatable attributes);
    fact → anonymize dimension FK (set to "anonymous" dim record); mart → refresh post-erasure.
  - F459 audit: every export and erasure action logged BEFORE execution (DR-50 / CF-209).
  - Erasure is IRREVERSIBLE — confirmation required via idempotency key pattern.
MACHINE: Cross-zone traversal for export, anonymization algorithm, irreversibility enforcement
FREEDOM: Export format (JSON/CSV), erasure anonymization strategy (hash/redact/tombstone),
         retention override (legal hold), confirmation workflow
```

### F465: IWarehouseQuotaService
```
FAMILY: 59 — Warehouse Governance & Tenant Isolation
PURPOSE: Track and enforce per-tenant quotas for warehouse resource consumption:
         storage volume (bytes across all zones), compute (query execution time),
         API calls (external SaaS connector calls per day), and record count (max records
         per entity type). Prevents noisy-neighbor problems in shared infrastructure.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → Redis provider (quota counters — sliding window)
  Metrics:    DATABASE FABRIC (Skill 05) → Elasticsearch provider (quota_history index)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (quota.warning, quota.exceeded)
CREATION: IExternalServiceFactory<IWarehouseQuotaService>.CreateAsync(ctx)
METHODS:
  CheckQuotaAsync(tenantId, quotaType)                           → DataProcessResult<Dictionary>
  RecordUsageAsync(tenantId, quotaType, amount)                  → DataProcessResult<Dictionary>
  GetUsageReportAsync(tenantId, dateRange)                       → DataProcessResult<Dictionary>
  SetQuotaLimitAsync(tenantId, quotaType, limit)                 → DataProcessResult<bool>
  GetQuotaHeadroomAsync(tenantId)                                → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - Quota types: STORAGE_BYTES, COMPUTE_SECONDS, API_CALLS_DAILY, RECORD_COUNT, CONCURRENT_QUERIES.
  - Warning at 80% of limit. Hard block at 100% (configurable: block vs degrade).
  - Quota limits are FREEDOM config per tenant tier (free/standard/enterprise).
  - Integrates with F430 IRateLimitGuardService for API call quotas — F465 sets the ceiling,
    F430 enforces per-call.
  - Quota exceeded → event via QUEUE FABRIC → notification routing → dashboard badge.
MACHINE: Sliding window counter, threshold enforcement, usage aggregation
FREEDOM: Quota limits per tenant tier per quota type, warning threshold percentage,
         exceeded behavior (block/degrade/alert-only), quota reset period
```

---

## PHASE 2 — DNA COMPLIANCE MATRIX

| Factory | DNA-1 | DNA-2 | DNA-3 | DNA-4 | DNA-5 | DNA-6 | DNA-9 | Total |
|---|---|---|---|---|---|---|---|---|
| F444 IStagingWriterService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F445 IQuarantineService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F446 IIdentityResolutionService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 7/7 |
| F447 ICurrencyNormalizerService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F448 ITimezoneNormalizerService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F449 IDimensionLoaderService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F450 IFactWriterService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F451 IMartBuilderService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F452 ISnapshotService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F453 IRetentionPolicyService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 7/7 |
| F454 IMetricDefinitionService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F455 ISemanticQueryService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F456 IReverseEtlService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 7/7 |
| F457 IFreshnessCheckService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F458 IDataQualityRulesService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F459 IWarehouseAuditService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F460 ILineageTrackerService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F461 ITenantWarehouseIsolationService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 7/7 |
| F462 IPiiClassificationService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 7/7 |
| F463 IRowLevelSecurityService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F464 IDataExportService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 7/7 |
| F465 IWarehouseQuotaService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |

**Total: 22 factories, ~96 methods, 100% DNA compliant**
**DNA-9 (SoD) on: F446 (match confirm), F453 (retention admin), F456 (activation admin), F461 (isolation admin), F462 (PII rule admin), F464 (export/erasure admin)**

---

## PHASE 2 — FACTORY SUMMARY

| Family | Range | Count | Key Fabrics | Purpose |
|---|---|---|---|---|
| 55 — Transform & Staging | F444–F448 | 5 | DATABASE (PG) + RAG + CORE | Silver zone + identity + normalization |
| 56 — Warehouse Model | F449–F453 | 5 | DATABASE (PG) + QUEUE | Gold zone: dims, facts, marts, snapshots |
| 57 — Metrics & Semantic | F454–F456 | 3 | DATABASE (ES+PG) + QUEUE | KPI registry + semantic query + reverse ETL |
| 58 — Quality & Observability | F457–F460 | 4 | QUEUE + DATABASE (ES+PG) | Freshness, quality, audit, lineage |
| 59 — Governance & Isolation | F461–F465 | 5 | CORE + AI ENGINE + DATABASE + QUEUE | MT isolation, PII, RLS, export, quotas |
| **Total** | **F444–F465** | **22** | | |

## PHASE 2 — CROSS-REFERENCE TO EXISTING ENGINE + P1

| FLOW-14 P2 Factory | Consumes From | Relationship |
|---|---|---|
| F444 IStagingWriterService | P1: F442 (normalizer output), F438 (raw record link) | Zone 1→2 promotion |
| F445 IQuarantineService | P1: F442/F443 (normalization failures) | Bad record isolation |
| F446 IIdentityResolutionService | P1: F440 (source object map), RAG FABRIC | Cross-system matching |
| F447 ICurrencyNormalizerService | FLOW-13: F387 IExchangeRateService | Exchange rate consumption |
| F448 ITimezoneNormalizerService | FLOW-13: F386 IFiscalCalendarService | EP-5 fiscal period mapping |
| F449 IDimensionLoaderService | F446 (unified entities), F444 (staging records) | Zone 2→3 promotion |
| F450 IFactWriterService | F449 (surrogate key lookup), F444 (staging records) | Zone 2→3 promotion |
| F451 IMartBuilderService | F449/F450 (core model), F462 (PII classification) | Zone 3→4 promotion |
| F456 IReverseEtlService | P1: F430 (rate limit), F427 (credentials) | Outbound activation |
| F459 IWarehouseAuditService | FLOW-13: DR-50 pattern | WORM audit inheritance |
| F461 ITenantWarehouseIsolationService | FLOW-08: Skill 11 MT Isolation Fabric | Isolation tier reuse |
| F462 IPiiClassificationService | AI ENGINE FABRIC (LLM for semantic PII) | AI-powered classification |
| F463 IRowLevelSecurityService | F461 (isolation tier determines RLS scope) | Defense-in-depth |
| F465 IWarehouseQuotaService | P1: F430 (API quota ceiling integration) | Quota ↔ rate limit bridge |

---

## BACKWARD COMPATIBILITY (Phase 2 Check)

```
F1-F443:  UNCHANGED ✅ (F444-F465 are ADDITIVE — no modifications to P1 or prior)
T1-T166:  UNCHANGED ✅ (no task types in P2 — those come in P3/P4)
DR-1-59:  UNCHANGED ✅ (DR-60-65 are ADDITIVE)
CF-1-191: UNCHANGED ✅ (no BFA rules in P2 — those come in P5)
DNA-1-9:  STABLE ✅ (all consumed, none redefined)
EP-1-5:   STABLE ✅ (EP-4/EP-5 consumed, not redefined)
FLOW-13:  F386, F387 consumed READ-ONLY ✅ (no modifications)
FLOW-08:  Skill 11 consumed READ-ONLY ✅ (no modifications)
```

---

## SAVE POINT: FLOW14:P2:COMPLETE ✅

### Recovery Commands
```
"Load P2"                → This file (FLOW14_P2_FACTORIES.md)
"Start P3"               → Generate T167–T172 (first 6 full task type contracts + AF maps)
"Merge P2"               → Append FLOW14_P2_FACTORIES.md → ENGINE_ARCHITECTURE_MERGED.md
"Resume from P2"         → Load FLOW14_PLAN_P0.md + P1 + this file + basic_prompt.txt
```

### Cumulative P1+P2 Totals:
```
Factories:       F426–F465 (40 new, 8 families)
Design Records:  DR-58–DR-65 (8 new)
Methods:         ~178 total across 40 factories
DNA Compliance:  40/40 factories pass (100%)
```

### Next Phase (P3) Will Produce:
- T167: Connector Registration Gate (PROVISIONING)
- T168: Incremental Sync Orchestrator (DURABLE_SAGA)
- T169: Webhook Ingestion Gate (INGESTION)
- T170: Backfill Saga (DURABLE_SAGA)
- T171: Raw-to-Staging Transform (TRANSFORM)
- T172: Schema Drift Detection Gate (VALIDATION)
- Full engine contracts with ARCHETYPE, FACTORY DEPS, FABRIC RESOLUTION, AF CONFIG, BFA, IRON RULES, QUALITY GATES
