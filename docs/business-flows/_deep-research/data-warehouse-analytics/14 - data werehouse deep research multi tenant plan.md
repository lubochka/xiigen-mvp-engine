# XIIGen — FLOW-08: DATA WAREHOUSE & INTEGRATION ENGINE
## Execution Plan | Date: 2026-02-26 | Save Point: PLAN:P0
## Status: PLAN COMPLETE ✅ — Awaiting Phase Execution

---

## §0 — SYSTEM BASELINE (Pre-FLOW-08)

| Artifact | Current | Next |
|---|---|---|
| Factory interfaces | F1–F243 | F244 |
| Factory families | 26 | Family 27 |
| Task types | T1–T82 | T83 |
| Flow templates | 17 | Template 18 |
| BFA conflict rules | CF-1–CF-63 | CF-64 |
| Stress tests | ST-1–ST-30 | ST-31 |
| Design records | DR-1–DR-20 | DR-21 |
| Design decisions | DD-1–DD-20 | DD-21 |
| Skill patterns | SK-1–SK-28 | SK-29 |
| DNA patterns | DNA-1–DNA-8 | (reuse all 8) |

---

## §1 — WHAT WE ARE BUILDING (NO CODE EXPLANATION)

FLOW-08 extends the XIIGen engine to **generate** a Data Warehouse & Integration system
that ingests multi-tenant operational data from ClickUp and Zoho (CRM + Desk),
transforms it through layered warehouse zones, and exposes analytics-ready facts,
dimensions, and metrics — all configured at runtime, generated on top of FABRIC interfaces.

**The engine is not building a warehouse. It is learning how to BUILD warehouses on demand.**

Every connector, every sync job, every transform rule, every dimension loader resolves
through an existing fabric interface. No connector imports a Zoho SDK. No transform
imports a PostgreSQL driver. No KPI formula is hardcoded. All are factory-resolved at runtime.

### The 6 Warehouse Zones (what the engine generates)

```
ZONE 0 — CONNECTION PLANE
  Connector registry + OAuth credential vault + token refresh + webhook receiver
  All tenant-scoped. Credentials encrypted. Health-checked on every use.

ZONE 1 — RAW LANDING (Bronze)
  Append-only, immutable JSON payloads from ClickUp/Zoho APIs & webhooks.
  Never modified. Used for replay and audit.
  Resolves through DATABASE FABRIC → Elasticsearch provider (document store).

ZONE 2 — STAGING (Silver)
  Flattened, typed, deduped records. ClickUp custom fields resolved dynamically.
  Bad records quarantined with reason. Source object map for cross-system joins.
  Resolves through DATABASE FABRIC → PostgreSQL provider (relational).

ZONE 3 — CORE MODEL (Gold)
  Star-schema dimensions (dim_user, dim_workspace, dim_account) + facts
  (fact_task_event, fact_deal_stage, fact_time_entry, fact_ticket).
  Resolves through DATABASE FABRIC → PostgreSQL provider.

ZONE 4 — MARTS & SEMANTIC LAYER (Platinum)
  Business-facing aggregates: Delivery mart, Sales mart, Finance mart, Support mart.
  KPI registry with single definitions (cycle time, pipeline velocity, utilization).
  Resolves through DATABASE FABRIC → configurable analytical provider.

ZONE 5 — ACTIVATION (Reverse ETL)
  Threshold-driven push: insights → ClickUp tasks or Zoho field updates.
  Resolves through QUEUE FABRIC → Redis Streams + AI ENGINE FABRIC for enrichment.
```

---

## §2 — PHASE MAP (7 Phases + Validation)

| Phase | Name | Output | Recovery Key | Est. Length |
|---|---|---|---|---|
| P0 | Plan & RAG mini-index | This file | PLAN:P0 | Done |
| P1 | Connector + Ingestion + Raw Zone Factories | F244–F259 + DR-21/22 | MERGE:P1 | ~900 lines |
| P2 | Task Types T83–T85 | Full contracts + AF Map + Template 18 stub | MERGE:P2 | ~700 lines |
| P3 | Transform + Warehouse + Metrics + Governance Factories | F260–F276 + DR-23/24 | MERGE:P3 | ~1000 lines |
| P4 | Task Types T86–T88 + Template 18 | Full contracts + AF Map + Template 18 complete | MERGE:P4 | ~700 lines |
| P5 | BFA Registration + CF-64–CF-75 + ST-31–ST-36 | Conflict rules + stress tests | MERGE:P5 | ~600 lines |
| P6 | Source Index + SK-29–SK-34 + DD-21–DD-26 | Skill patterns + decisions | MERGE:P6 | ~500 lines |
| P7 | Validation | All checks PASS report | MERGE:FINAL | ~300 lines |

Each phase is designed to fit within a single session window (15–45 min),
produces a self-contained output file, and has a recovery command.

---

## §3 — FACTORY INVENTORY (F244–F276, 33 new factories, 7 families)

### Family 27 — Connector & Authentication Management (F244–F249)

| # | Interface | Fabric Resolution | Purpose |
|---|---|---|---|
| F244 | IConnectorRegistryService | DATABASE FABRIC (ES) | Connector catalog + provider config per tenant |
| F245 | ICredentialVaultService | DATABASE FABRIC (PG) | Encrypted OAuth token + PAT storage |
| F246 | ITokenRefreshService | AI ENGINE FABRIC (HTTP extension) | OAuth 2.0 refresh + expiry lifecycle |
| F247 | IWebhookReceiverService | QUEUE FABRIC (Redis Streams) | HMAC-verified webhook normalization + fanout |
| F248 | IRateLimitGuardService | CORE FABRIC (MicroserviceBase cache) | Per-token rate tracking + 429 exponential backoff |
| F249 | IConnectionHealthService | DATABASE FABRIC (ES) | Connector liveness + quota headroom monitoring |

### Family 28 — Ingestion Orchestration (F250–F255)

| # | Interface | Fabric Resolution | Purpose |
|---|---|---|---|
| F250 | ISyncJobSchedulerService | QUEUE FABRIC (Redis Streams) | Cron + event-triggered sync job dispatch |
| F251 | IIncrementalCursorService | DATABASE FABRIC (PG) | Cursor/watermark state per job per tenant |
| F252 | IApiPollingService | AI ENGINE FABRIC (HTTP — extensible connector) | Paginated REST polling with backoff + retry |
| F253 | IWebhookIngestionService | QUEUE FABRIC (Redis Streams) | Deduplicated webhook event processing |
| F254 | IBackfillOrchestratorService | QUEUE FABRIC (Redis Streams) | Historical replay + gap detection |
| F255 | ISyncRunTrackerService | DATABASE FABRIC (PG) | Run status, records in/out, error sampling |

### Family 29 — Raw Zone & Landing (F256–F259)

| # | Interface | Fabric Resolution | Purpose |
|---|---|---|---|
| F256 | IRawLandingService | DATABASE FABRIC (ES) | Append-only immutable JSON payloads |
| F257 | ISchemaRegistryService | DATABASE FABRIC (ES) | Source schema discovery + drift detection |
| F258 | ISourceObjectMapService | DATABASE FABRIC (PG) | Cross-system ID mapping (ClickUp ↔ Zoho) |
| F259 | IReplayBufferService | QUEUE FABRIC (Redis Streams) | Raw record replay trigger for reprocessing |

### Family 30 — Transformation & Staging (F260–F264)

| # | Interface | Fabric Resolution | Purpose |
|---|---|---|---|
| F260 | INormalizerService | CORE FABRIC (ObjectProcessor) | Flatten + type + dedupe raw → staging |
| F261 | ICustomFieldAdapterService | DATABASE FABRIC (PG) | Dynamic ClickUp custom field resolution |
| F262 | IStagingWriterService | DATABASE FABRIC (PG) | Idempotent upsert to staging tables |
| F263 | IQuarantineService | DATABASE FABRIC (ES) | Bad record isolation + reason capture |
| F264 | IIdentityResolutionService | DATABASE FABRIC (PG) + RAG FABRIC (Hybrid) | Email/domain cross-system user matching |

### Family 31 — Warehouse Model Layer (F265–F269)

| # | Interface | Fabric Resolution | Purpose |
|---|---|---|---|
| F265 | IDimensionLoaderService | DATABASE FABRIC (PG) | SCD dims: dim_user, dim_workspace, dim_account |
| F266 | IFactWriterService | DATABASE FABRIC (PG) | Append-only fact writes (task events, deals, tickets) |
| F267 | IMartBuilderService | DATABASE FABRIC (PG) | Mart aggregation: Delivery, Sales, Finance, Support |
| F268 | ISnapshotService | DATABASE FABRIC (PG) | Daily pipeline snapshots (deal stages, WIP) |
| F269 | IRetentionPolicyService | DATABASE FABRIC (PG) | Tenant-scoped data retention enforcement |

### Family 32 — Metrics & Semantic Layer (F270–F272)

| # | Interface | Fabric Resolution | Purpose |
|---|---|---|---|
| F270 | IMetricDefinitionService | DATABASE FABRIC (ES) | KPI registry: cycle time, velocity, utilization |
| F271 | ISemanticQueryService | DATABASE FABRIC (PG) | Tenant-scoped KPI query execution |
| F272 | IReverseEtlService | QUEUE FABRIC (Redis Streams) | Activation: push insights to ClickUp/Zoho |

### Family 33 — Data Quality & Warehouse Governance (F273–F276)

| # | Interface | Fabric Resolution | Purpose |
|---|---|---|---|
| F273 | IFreshnessCheckService | QUEUE FABRIC (Redis Streams) | Sync freshness alerts + volume anomaly detection |
| F274 | IDataQualityRulesService | DATABASE FABRIC (ES) | Configurable quality rule execution |
| F275 | IWarehouseAuditService | DATABASE FABRIC (PG) | Row-level access audit + PII tracking |
| F276 | ITenantWarehouseIsolationService | CORE FABRIC (MicroserviceBase + Config) | Pool/bridge/silo model enforcement per tenant |

**Total: 33 new factories (F244–F276), 7 new families (27–33)**

---

## §4 — TASK TYPE INVENTORY (T83–T88, 6 new engine contracts)

| # | Name | Archetype | Factories | Purpose |
|---|---|---|---|---|
| T83 | OAuth Connector Bootstrap Gate | ORCHESTRATION | F244, F245, F246, F249 | Provision + validate new connector with credential vault |
| T84 | Hybrid Ingestion Dispatcher | ORCHESTRATION | F250, F251, F252, F253, F254, F255 | Fan-out to polling + webhook paths + backfill |
| T85 | Raw-to-Staging Transform Pipeline | TRANSFORM | F256, F257, F258, F260, F261, F262, F263, F264 | Normalize, type, dedupe, resolve custom fields, quarantine |
| T86 | Warehouse Model Refresh Cycle | MODELING | F265, F266, F267, F268 | Dim load + fact append + mart rebuild + snapshot |
| T87 | Cross-System Identity Join Gate | JOIN_GATE | F258, F264, F265 | Merge ClickUp user + Zoho CRM contact + Zoho Desk agent |
| T88 | Activation Trigger & Reverse ETL | ACTIVATION | F270, F271, F272, F273, F275 | Threshold breach → reverse ETL push + audit |

Each task type will be authored in full engine contract format (as per T40/T77 examples):
ARCHETYPE, ENTRY, PURPOSE, DISTINCT FROM, FACTORY DEPENDENCIES, FABRIC RESOLUTION,
AF CONFIGURATION (all 11 stations), BFA VALIDATION, MACHINE/FREEDOM, IRON RULES (≥6),
QUALITY GATES (≥6).

---

## §5 — BFA PREVIEW (CF-64–CF-75, 12 conflict rules)

| # | Rule Name | Conflict Type | Flows Checked |
|---|---|---|---|
| CF-64 | ConnectorCredentialBleed | Cross-tenant credential leak | FLOW-08 vs all |
| CF-65 | DuplicateRawIngestion | Idempotency violation in raw landing | FLOW-08 internal |
| CF-66 | SchemaDriftSilentContinue | Undeclared field change bypasses registry | FLOW-08 vs FLOW-03 |
| CF-67 | CrossTenantWarehouseQuery | Missing tenantId in warehouse read | FLOW-08 vs all |
| CF-68 | RateLimitCascade | 429 from ClickUp/Zoho floods queue | FLOW-08 vs FLOW-04/07 |
| CF-69 | ActivationFeedbackLoop | Reverse ETL creates new source events → re-ingests | FLOW-08 internal |
| CF-70 | StaleCredentialAccess | Token used after rotation | FLOW-08 vs FLOW-03 |
| CF-71 | MartRebuildDuringWrite | Mart aggregation race with ongoing fact writes | FLOW-08 internal |
| CF-72 | PIIInRawZone | PII in unencrypted raw landing | FLOW-08 compliance |
| CF-73 | RetentionBypassByReplay | Replay job rehydrates expired data | FLOW-08 internal |
| CF-74 | IdentityResolutionPollution | Cross-tenant email match in identity resolver | FLOW-08 vs FLOW-07 |
| CF-75 | WebhookHMACSkip | Webhook accepted without signature verification | FLOW-08 vs FLOW-01 |

---

## §6 — STRESS TESTS (ST-31–ST-36)

| # | Scenario | Tests |
|---|---|---|
| ST-31 | 1000 webhooks/min from ClickUp — rate limiter holds | IRateLimitGuardService under load |
| ST-32 | Zoho token expires mid-batch — refresh heals transparently | ITokenRefreshService + IApiPollingService |
| ST-33 | Schema drift on ClickUp custom field — quarantine fires, staging unblocked | ISchemaRegistryService + IQuarantineService |
| ST-34 | Cross-tenant identity match false positive — isolation enforced | IIdentityResolutionService + DNA-5 (scope) |
| ST-35 | Activation reverse ETL triggers re-ingestion loop — circuit breaker fires | IReverseEtlService + CF-69 |
| ST-36 | Mart rebuild collision with live fact writes — MVCC snapshot used | IMartBuilderService + IFactWriterService |

---

## §7 — DESIGN RECORDS (DR-21–DR-24)

| # | Decision | Rationale |
|---|---|---|
| DR-21 | Raw zone uses Elasticsearch (document store) not PostgreSQL | Schema-free append-only; JSON drift handled at read time; replayable without migration |
| DR-22 | Hybrid ingestion (polling + webhooks) as engine default | Best balance of freshness and correctness; polling for reconciliation, webhooks for hot events |
| DR-23 | Cross-system identity uses probabilistic matching + manual confirmation queue | Email collisions across tenants; low-confidence matches routed to confirmation before joining |
| DR-24 | Tenant warehouse isolation defaults to pool (shared schema + row-level scoping); silo upgrade via config | Aligns with bridge/pool/silo model; upgrade path is config-only, no code change |

---

## §8 — SKILL PATTERNS (SK-29–SK-34)

| # | Pattern Name | Reuses | New Capability |
|---|---|---|---|
| SK-29 | OAuth Token Lifecycle | SK-3 (credential store) | Refresh + rotation + expiry cascade |
| SK-30 | Incremental Cursor Sync | SK-8 (event streaming) | Watermark state + gap detection |
| SK-31 | Raw-to-Staging Pipeline | SK-2 (ParseDocument) | Multi-zone transform with quarantine |
| SK-32 | Star Schema Loader | SK-5 (DB fabric) | SCD dim merge + fact append pattern |
| SK-33 | Cross-System Identity Join | SK-13 (graph RAG) | Probabilistic match + confirmation gate |
| SK-34 | Reverse ETL Activation | SK-8 + SK-17 | Threshold trigger + external system push |

---

## §9 — FLOW TEMPLATE PREVIEW (Template 18)

**Flow ID:** `data-warehouse-integration-v1`
**Archetype:** SCHEDULED + EVENT-DRIVEN hybrid
**Steps (DAG):**
```
1. connector-bootstrap       → T83 → F244/F245/F246/F249
2. ingestion-dispatch        → T84 → F250/F251/F252/F253/F254/F255
3. raw-landing               → (fabric: ES write via F256/F257)
4. raw-to-staging            → T85 → F258/F260/F261/F262/F263/F264
5. identity-join             → T87 → F258/F264/F265
6. model-refresh             → T86 → F265/F266/F267/F268
7. quality-check             → F273/F274
8. activation-check          → T88 → F270/F271/F272/F275
```
Each step is a factory interface resolved through a fabric via CreateAsync().
No step imports a provider directly.

---

## §10 — AF STATION MAPPING (FLOW-08 summary)

| Station | Role in FLOW-08 |
|---|---|
| AF-1 Genesis | Generates connector service, ingestion pipeline, transform pipeline, model loaders — all on fabric interfaces |
| AF-2 Planning | Decomposes each zone into ordered steps; maps data lineage from raw → marts |
| AF-3 Prompt Library | Retrieves warehouse domain prompts: medallion architecture, star schema, incremental sync |
| AF-4 RAG (Task Context) | Finds SK-29–SK-34 patterns + existing SK-8 (streaming) + SK-2 (ParseDocument) |
| AF-5 Multi-model | Claude handles connector logic; GPT handles SQL transforms; Gemini handles quality rules |
| AF-6 Code Review | Validates no provider imports; validates idempotency keys on all writes |
| AF-7 Compliance | Enforces DNA-1 (ParseDocument on all JSON), DNA-2 (BuildSearchFilter), DNA-5 (tenantId on every query) |
| AF-8 Security | OWASP checks: HMAC on webhooks, encrypted credential storage, PII classification, cross-tenant isolation |
| AF-9 Judge | Validates against all iron rules; checks quarantine rate < threshold; confirms fabric resolution on every factory |
| AF-10 Merge | Combines warehouse zone outputs into coherent DAG |
| AF-11 Feedback | Stores connector quality scores + schema drift frequency for pipeline optimization |

---

## §11 — PLAN VALIDATION (Requirements Coverage)

### Basic Prompt Requirements ✅

| Requirement | Coverage |
|---|---|
| NEW FACTORY INTERFACES each with fabric resolution | ✅ 33 factories, F244–F276, each has explicit FABRIC RESOLUTION |
| NEW ENGINE CONTRACTS full format (not stubs) | ✅ T83–T88 each get full format in P2/P4 |
| AF STATION MAPPING for new flow | ✅ §10 covers all 11 stations |
| BFA CROSS-FLOW VALIDATION | ✅ CF-64–CF-75 + checks against FLOW-01 to FLOW-07 |
| FLOW TEMPLATE (DAG) | ✅ Template 18 in §9, full JSON in P4 |
| GENIE DNA COMPLIANCE | ✅ DNA-1 through DNA-8 applied; DNA-5 (scope) critical for multi-tenancy |
| No standalone service implementations | ✅ All 33 factories generate on top of fabrics |
| No specific provider imports | ✅ No Zoho SDK, no ClickUp SDK, no PG driver in service code |
| No typed models | ✅ ParseDocument (Dictionary) everywhere; custom fields via dynamic adapter |
| No backward compatibility breaks | ✅ F1–F243, T1–T82 unchanged |
| Fabric-first UI | ✅ DR-24: tenant isolation model via config, zero platform-specific UI values |

### 14-* Document Requirements ✅

| Spec Requirement | Engine Coverage |
|---|---|
| ClickUp hierarchy + work items + time + audit | Family 28 (ingestion) + Family 30 (staging) + T84/T85 |
| Zoho CRM modules + deals + campaigns | Family 28 + IApiPollingService (F252) — module discovery via config |
| Zoho Desk tickets + SLA | Family 28 + staging stg_zoho_desk_ticket via F262 |
| Raw zone (Bronze) — append-only JSON | Family 29 + F256 (IRawLandingService) → DATABASE FABRIC (ES) |
| Staging (Silver) — normalized/typed | Family 30 + F260/F261/F262 → DATABASE FABRIC (PG) |
| Core model (Gold) — dims + facts | Family 31 + F265/F266 → DATABASE FABRIC (PG) |
| Marts (Platinum) — Delivery/Sales/Finance/Support | F267 (IMartBuilderService) + T86 |
| Semantic layer / KPI registry | Family 32 + F270/F271 |
| Reverse ETL activation | F272 (IReverseEtlService) + T88 |
| OAuth + token refresh + rate limiting | Family 27 + T83 |
| Webhook HMAC verification | F247 (IWebhookReceiverService) + CF-75 |
| Schema drift detection | F257 (ISchemaRegistryService) + ST-33 |
| Cross-system identity join | F264 + T87 + SK-33 |
| Multi-tenancy: pool/bridge/silo | F276 + DR-24 + DNA-5 enforcement |
| PII controls + audit trail | F275 + CF-72 + DNA-5 |
| Data quality + freshness checks | F273/F274 + ST-33 + CF-66 |
| Observability (OTel + Prometheus) | MicroserviceBase (DNA-4) + F255 (ISyncRunTrackerService) |
| Idempotency on all writes | DNA-3 (DataProcessResult) + F262 upsert pattern |
| Backward compat (FLOW-01–FLOW-07) | ✅ 0 changes to F1–F243 or T1–T82 |

---

## §12 — POSITIVE EXAMPLES (what correct engine output looks like)

### ✅ POSITIVE EXAMPLE 1 — Factory with correct fabric resolution

```
F252: IApiPollingService
  FABRIC: AI ENGINE FABRIC (extensible HTTP — treated as external provider)
  RESOLVED VIA: CreateAsync(FactoryResolutionContext { provider: "clickup_api", tenantId })
  METHOD: PollAsync(jobConfig: Dictionary<string,object>) → DataProcessResult<IReadOnlyList<Dictionary<string,object>>>
  NOTE: Returns raw Dictionary items, never typed ClickUpTask model. DNA-1 compliant.
  NOTE: tenantId injected from context into every request. DNA-5 compliant.
  FALLBACK: On HTTP 429 — IRateLimitGuardService (F248) schedules retry, returns DataProcessResult.Empty
```

### ✅ POSITIVE EXAMPLE 2 — Task type contract fragment

```
TASK TYPE: T85 — Raw-to-Staging Transform Pipeline
ARCHETYPE: TRANSFORM
ENTRY: Fires when IRawLandingService emits raw.batch.ready event via QUEUE FABRIC
PURPOSE: Normalize, type, dedupe ClickUp/Zoho raw JSON → staging tables
DISTINCT FROM: T31 (NLP transform — AI-driven); T85 is deterministic schema-aware transform
FACTORY DEPENDENCIES: F256, F257, F258, F260, F261, F262, F263, F264 — all via CreateAsync()
FABRIC RESOLUTION:
  F256 → DATABASE FABRIC (ES) read
  F260 → CORE FABRIC (ObjectProcessor / DNA-1 ParseDocument)
  F261 → DATABASE FABRIC (PG) — custom field metadata lookup
  F262 → DATABASE FABRIC (PG) — idempotent upsert
  F263 → DATABASE FABRIC (ES) — quarantine write
  F264 → DATABASE FABRIC (PG) + RAG FABRIC (Hybrid) — identity resolve
IRON RULES:
  IR-85-1: F261 MUST call ISchemaRegistryService.GetFieldMetadata() before accessing any custom field
  IR-85-2: ALL records MUST pass through F262.UpsertAsync() — never direct DB insert
  IR-85-3: Bad records MUST land in F263 — pipeline MUST continue (DataProcessResult.Partial)
  IR-85-4: No typed model may be created in staging — Dictionary<string,object> only (DNA-1)
  IR-85-5: tenantId MUST be injected by MicroserviceBase on every staging write (DNA-5)
  IR-85-6: Identity resolution (F264) MUST NOT join cross-tenant records
```

### ✅ POSITIVE EXAMPLE 3 — DNA-compliant service stub

```csharp
// CORRECT: Connector service generated by engine — fabric-first
public class ClickUpConnectorService : MicroserviceBase  // DNA-4: MicroserviceBase
{
    private readonly IExternalServiceFactory<IApiPollingService> _pollingFactory;
    private readonly IExternalServiceFactory<ICredentialVaultService> _vaultFactory;

    public async Task<DataProcessResult<IReadOnlyList<Dictionary<string,object>>>> PollTasksAsync(
        Dictionary<string,object> jobConfig)  // DNA-1: Dictionary, never ClickUpTask model
    {
        var tenantId = GetTenantId();  // DNA-5: scope isolation from MicroserviceBase
        var vault = await _vaultFactory.CreateAsync(new(tenantId));
        var creds = vault.GetCredentialsAsync(jobConfig);  // returns Dictionary

        var polling = await _pollingFactory.CreateAsync(new(tenantId, provider: "clickup_api"));
        var filter = BuildSearchFilter(new { tenantId, jobConfig });  // DNA-2: empty fields skipped
        return await polling.PollAsync(filter);  // DNA-3: DataProcessResult wraps all returns
    }
    // DynamicController handles routing — DNA-6
}
```

---

## §13 — NEGATIVE EXAMPLES (what the engine MUST REJECT)

### ❌ NEGATIVE EXAMPLE 1 — Direct provider import (BUILD FAILURE)

```csharp
// WRONG: Imports Zoho SDK directly — violates fabric-first architecture
using ZohoSDK.CRM;  // ❌ IRON RULE VIOLATION
public class ZohoCRMService
{
    private readonly ZohoCRMClient _client;  // ❌ Never import provider
    public async Task<List<ZohoDeal>> GetDealsAsync()  // ❌ Typed model
    {
        return await _client.Deals.GetAllAsync();  // ❌ Direct provider call
    }
}
// AF-7 COMPLIANCE FAIL + AF-9 JUDGMENT FAIL + BUILD BLOCKED
```

### ❌ NEGATIVE EXAMPLE 2 — Missing tenantId (DATA LEAK RISK)

```csharp
// WRONG: Raw landing query without tenant isolation — CF-67 CONFLICT
public async Task<DataProcessResult<Dictionary<string,object>>> GetRawRecordAsync(string sourceId)
{
    var filter = BuildSearchFilter(new { sourceId });  // ❌ Missing tenantId!
    // This would return records from ALL tenants matching sourceId
    return await _db.SearchDocumentsAsync("raw_landing", filter);
}
// AF-8 SECURITY FAIL + CF-67 BFA CONFLICT DETECTED + BUILD BLOCKED
```

### ❌ NEGATIVE EXAMPLE 3 — Typed model in warehouse layer (DNA-1 VIOLATION)

```csharp
// WRONG: Typed model instead of ParseDocument
public class StagingRecord  // ❌ typed model — DNA-1 violation
{
    public string TaskId { get; set; }
    public string Status { get; set; }
    // ClickUp has 40+ custom field types — this model breaks on first custom field
}
// CORRECT: var record = ParseDocument(rawJson)  → Dictionary<string,object>
// AF-7 COMPLIANCE FAIL — BUILD BLOCKED
```

### ❌ NEGATIVE EXAMPLE 4 — Task type stub (not a full engine contract)

```
// WRONG: One-line stub
T85: Raw-to-Staging (transform JSON to PG tables)
// This is NOT an engine contract. No ARCHETYPE, no FABRIC RESOLUTION,
// no AF CONFIGURATION, no IRON RULES, no QUALITY GATES.
// AF-9 JUDGE WILL REJECT — BUILD BLOCKED
```

---

## §14 — MULTI-TENANT EXTENSION (FLOW-08 specific)

FLOW-08 introduces the warehouse's multi-tenancy contract on top of existing DNA-5 (Scope Isolation).
Three isolation models are supported via F276 (ITenantWarehouseIsolationService):

```
MODEL: pool    → shared schema, every query has tenantId filter (default)
                  DNA-5 enforced via MicroserviceBase
MODEL: bridge  → separate schema, Postgres search_path scoped per tenant
                  Graduated automatically when tenant exceeds config threshold
MODEL: silo    → separate database, factory resolution points to tenant-specific ES index / PG DB
                  Config-driven: "warehouse.isolation.model": "silo"
```

Tenant isolation model is FREEDOM config — admin sets it per tenant.
Engine-generated code is IDENTICAL for all three — fabric handles the routing.
Zero code changes needed to upgrade a tenant from pool → bridge → silo.

---

## §15 — RECOVERY COMMANDS

```
"Show FLOW-08 plan"          → This file (FLOW08_UNIFIED_EXECUTION_PLAN.md)
"Start P1"                   → Generate FLOW08_P1_FACTORIES.md (F244–F259)
"Start P2"                   → Generate FLOW08_P2_TASK_TYPES_A.md (T83–T85)
"Start P3"                   → Generate FLOW08_P3_FACTORIES.md (F260–F276)
"Start P4"                   → Generate FLOW08_P4_TASK_TYPES_B.md (T86–T88 + Template 18)
"Start P5"                   → Generate FLOW08_P5_BFA.md (CF-64–CF-75 + ST-31–ST-36)
"Start P6"                   → Generate FLOW08_P6_INDEX_SKILLS.md (SK-29–SK-34 + DD-21–DD-26)
"Start P7"                   → Generate FLOW08_P7_VALIDATION.md (all checks)
"Merge P1"                   → Append FLOW08_P1_FACTORIES.md → ENGINE_ARCHITECTURE_MERGED
"Merge P2"                   → Append FLOW08_P2_TASK_TYPES_A.md → TASK_TYPES_CATALOG_MERGED
"Merge P3"                   → Append FLOW08_P3_FACTORIES.md → ENGINE_ARCHITECTURE_MERGED
"Merge P4"                   → Append FLOW08_P4_TASK_TYPES_B.md → TASK_TYPES_CATALOG_MERGED
"Merge P5"                   → Append FLOW08_P5_BFA.md → V62_BFA_STRESS_TEST_MERGED
"Merge P6"                   → Append FLOW08_P6_INDEX_SKILLS.md → SOURCE_INDEX + SKILLS_RAG
```

---

## §16 — DELTA SUMMARY (what FLOW-08 adds to the engine)

| Metric | Before | After | Delta |
|---|---|---|---|
| Factory interfaces | 243 | 276 | +33 |
| Factory families | 26 | 33 | +7 |
| Task types | 82 | 88 | +6 |
| Flow templates | 17 | 18 | +1 |
| BFA conflict rules | 63 | 75 | +12 |
| Stress tests | 30 | 36 | +6 |
| Design records | 20 | 24 | +4 |
| Design decisions | 20 | 26 | +6 |
| Skill patterns | 28 | 34 | +6 |
| New archetypes | — | TRANSFORM, MODELING, ACTIVATION, JOIN_GATE | +4 |

### First-Time Capabilities in FLOW-08

| Capability | Artifact | Why First |
|---|---|---|
| OAuth credential vault with rotation | F245/F246, T83 | Prior flows used static config; FLOW-08 manages live OAuth lifecycle |
| Hybrid ingestion (polling + webhooks) | F252/F253, T84 | Prior flows consumed events from internal queue; FLOW-08 bridges external SaaS APIs |
| Multi-zone warehouse pipeline (raw→staging→core→mart) | T85/T86 | No prior flow had multi-layer transform with zone promotion |
| Schema drift detection + quarantine | F257/F263, T85 | Prior flows: fixed schemas; FLOW-08: dynamic schema tracking |
| Cross-system identity join | F264, T87 | Prior joins were within one system; T87 joins ClickUp + Zoho users |
| Reverse ETL activation | F272, T88 | First time engine generates inbound AND outbound flows to external SaaS |
| Multi-tenancy pool/bridge/silo model | F276, DR-24 | Prior DNA-5 was row-level only; FLOW-08 adds schema + instance tiering |
| TRANSFORM archetype | T85 | All prior archetypes: ORCHESTRATION, COMPUTATION, etc. |
| MODELING archetype | T86 | New: warehouse model refresh cycle |
| ACTIVATION archetype | T88 | New: outbound push to external systems |
| JOIN_GATE with probabilistic scoring | T87 | Prior JOIN_GATEs (T40, T79) were deterministic; T87 adds confidence scoring |

---

## PLAN:P0 COMPLETE ✅
## Status: Ready to execute Phase 1 on command "Start P1"
