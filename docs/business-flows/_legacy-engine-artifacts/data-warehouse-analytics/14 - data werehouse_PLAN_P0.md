# XIIGen — FLOW-14: DATA WAREHOUSE & INTEGRATION ENGINE
## Execution Plan | Date: 2026-02-26 | Save Point: PLAN:P0
## Status: PLAN IN PROGRESS
## Resume: "Continue FLOW-14 from Phase {P0|P1|P2|P3|P4|P5|P6|P7|P8}"

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# §0 — SYSTEM BASELINE (Post FLOW-13)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Artifact | Current (Post-FLOW-13) | FLOW-14 Starts At |
|---|---|---|
| Factory interfaces | F1–F425 | F426 |
| Factory families | 51 | Family 52 |
| Task types | T1–T166 | T167 |
| Flow templates | 1–32 | Template 33 |
| BFA conflict rules | CF-1–CF-191 | CF-192 |
| Stress tests | ST-1–ST-91 | ST-92 |
| Design records | DR-1–DR-57 | DR-58 |
| Design decisions | DD-1–DD-73 | DD-74 |
| Skill patterns | SK-1–SK-88 | SK-89 |
| DNA patterns | DNA-1–DNA-9 | (reuse all 9) |
| Engine primitives | EP-1–EP-5 | (reuse all 5) |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# §1 — NO-CODE EXPLANATION (What We Are Building)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## The Big Picture (Plain English)

FLOW-14 teaches the XIIGen engine how to **generate Data Warehouse & Integration
systems on demand**. The engine already knows how to generate 13 types of business
flows across 51 factory families and 425 factory interfaces. FLOW-14 adds the
ability to ingest data from external SaaS platforms (ClickUp, Zoho CRM, Zoho Desk
and any future connectors), transform it through layered warehouse zones (raw →
staging → core → marts), expose analytics-ready dimensions/facts/KPIs, and push
insights back to source systems.

**The engine is NOT building a specific warehouse. It is learning how to BUILD
warehouses for any tenant, on any connector, with configurable layers — all through
FABRIC interfaces.**

### Before FLOW-14
The engine generates flows that operate within its own ecosystem — user
registration, events, marketplace, finance. All data is created and consumed
internally. External system integration is limited to provider-agnostic AI calls.

### After FLOW-14
The engine becomes a **data integration powerhouse** — it can connect to ANY
external SaaS API (starting with ClickUp + Zoho), pull operational data through
rate-limited, OAuth-secured connectors, land it in immutable raw storage, transform
it through configurable pipelines, model it into star-schema analytics, compute
tenant-scoped KPIs, and push insights back to the source systems. Every step is
a factory interface resolved through an existing fabric.

### What Makes This Different from Prior Flows

| Prior Capability | FLOW-14 Extension |
|---|---|
| Internal event processing (QUEUE FABRIC) | External SaaS API polling + webhook ingestion |
| Single-layer persistence (DATABASE FABRIC) | 6-zone layered warehouse pipeline (raw→staging→core→mart→semantic→activation) |
| Fixed schemas per domain | Schema drift detection + dynamic custom field resolution |
| Internal identity (DNA-5 scope isolation) | Cross-system identity resolution (ClickUp user ↔ Zoho contact) |
| Read-only analytics (existing) | Reverse ETL: push computed insights back to source SaaS |
| Single-source data model | Multi-source star schema with configurable dimensions + facts |
| Static KPI computation | Semantic layer with tenant-scoped KPI registry + single definitions |

### The 6 Warehouse Zones (What the Engine Generates)

```
ZONE 0 — CONNECTION PLANE
  Connector registry + OAuth credential vault + token refresh + webhook receiver
  All tenant-scoped. Credentials encrypted. Health-checked on every use.
  FABRIC: DATABASE FABRIC (credential store) + QUEUE FABRIC (webhook events)

ZONE 1 — RAW LANDING (Bronze)
  Append-only, immutable JSON payloads from external APIs & webhooks.
  Never modified. Used for replay and audit.
  FABRIC: DATABASE FABRIC → Elasticsearch provider (document store)

ZONE 2 — STAGING (Silver)
  Flattened, typed, deduped records. Custom fields resolved dynamically.
  Bad records quarantined with reason. Source object map for cross-system joins.
  FABRIC: DATABASE FABRIC → PostgreSQL provider (relational)

ZONE 3 — CORE MODEL (Gold)
  Star-schema dimensions (dim_user, dim_workspace, dim_account) + facts
  (fact_task_event, fact_deal_stage, fact_time_entry, fact_ticket).
  FABRIC: DATABASE FABRIC → PostgreSQL provider

ZONE 4 — MARTS & SEMANTIC LAYER (Platinum)
  Business-facing aggregates: Delivery mart, Sales mart, Finance mart, Support mart.
  KPI registry with single definitions (cycle time, pipeline velocity, utilization).
  FABRIC: DATABASE FABRIC → configurable analytical provider

ZONE 5 — ACTIVATION (Reverse ETL)
  Threshold-driven push: insights → ClickUp tasks or Zoho field updates.
  FABRIC: QUEUE FABRIC → Redis Streams + AI ENGINE FABRIC for enrichment
```

### How FLOW-14 Integrates with Existing Flows

```
FLOW-08 (Multi-Tenant Engine)  → FLOW-14 inherits tenant control plane,
                                  isolation tiers (pool/bridge/silo),
                                  onboarding orchestration

FLOW-13 (Finance Engine)       → FLOW-14 finance mart can consume F384-F425
                                  GL data for cross-system finance analytics.
                                  FLOW-14 respects INV-13-1 (locked fiscal periods).

FLOW-09/10/11 (Commerce, etc.) → FLOW-14 star schema can dimension existing
                                  operational data for warehouse analytics.

DNA-9 (SoD from FLOW-13)       → FLOW-14 credential management enforces
                                  separation: connector admin ≠ data viewer.

EP-4 (Durable Saga)            → FLOW-14 backfill orchestration uses EP-4
                                  crash recovery for long-running sync jobs.

EP-5 (Fiscal Period Scope)     → FLOW-14 warehouse time partitioning aligns
                                  with EP-5 fiscal period boundaries.
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# §2 — PHASE MAP (9 Phases + Validation)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Phase | Name | Output | Recovery Key | Est. Lines |
|---|---|---|---|---|
| P0 | Plan + RAG mini-index + Examples | This file | PLAN:P0 | Done |
| P1 | Connection + Ingestion + Raw Zone Factories | F426–F443, Families 52-54, DR-58/59 | MERGE:P1 | ~900 |
| P2 | Transform + Warehouse + Metrics + Governance Factories | F444–F465, Families 55-59, DR-60-65 | MERGE:P2 | ~1000 |
| P3 | Task Types T167–T172 (first batch) + AF Maps | Full contracts + AF Map | MERGE:P3 | ~800 |
| P4 | Task Types T173–T178 (second batch) + Templates 33-35 | Full contracts + AF Map + Templates | MERGE:P4 | ~800 |
| P5 | BFA Registration CF-192–CF-213 + ST-92–ST-103 | Conflict rules + stress tests | MERGE:P5 | ~700 |
| P6 | Skills SK-89–SK-98 + Decisions DD-74–DD-85 | Skill patterns + design decisions | MERGE:P6 | ~600 |
| P7 | Merge into all 7 canonical files | All merged outputs | MERGE:P7 | ~2000 |
| P8 | Validation + SESSION_STATE update | All checks PASS report | MERGE:FINAL | ~400 |

Each phase fits a single session window (15–45 min), produces a self-contained
output file, and has a recovery command. All phases produce downloadable .md files.

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# §3 — VALIDATION MATRIX
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Requirement Coverage Check

| # | Requirement (from basic_prompt + 14_-* specs) | Covered By | Phase |
|---|---|---|---|
| R1 | Fabric-first: every factory declares WHICH fabric it resolves through | All F426-F465 have FABRIC RESOLUTION column | P1, P2 |
| R2 | Full engine contracts (not one-line stubs) for all task types | T167-T178 each with ARCHETYPE, FACTORY DEPS, FABRIC RESOLUTION, AF CONFIG, BFA, IRON RULES, QUALITY GATES | P3, P4 |
| R3 | AF station mapping (which AI pipeline generates/reviews/judges) | Each task type has 11-station AF map | P3, P4 |
| R4 | BFA cross-flow validation against FLOW-01 through FLOW-13 | CF-192–CF-213 with explicit cross-flow checks | P5 |
| R5 | DNA compliance on all generated code | DNA-1 through DNA-9 enforced, compliance matrix in P8 | P8 |
| R6 | Backward compatibility (F1-F425, T1-T166 unchanged) | Verified in P8 validation, no modifications to existing artifacts | P8 |
| R7 | External SaaS connectors (ClickUp + Zoho CRM + Zoho Desk) | Family 52: F426-F431, connector registry + credential vault + rate limiting | P1 |
| R8 | Layered warehouse pipeline (raw → staging → core → marts) | Families 54-57: Zone 1-4 factories with zone promotion logic | P1, P2 |
| R9 | Schema drift detection + dynamic custom fields | F438 ISchemaRegistryService + F445 ICustomFieldAdapterService | P1, P2 |
| R10 | Cross-system identity resolution | F448 IIdentityResolutionService via RAG FABRIC (Hybrid strategy) | P2 |
| R11 | Multi-tenant warehouse isolation (pool/bridge/silo) | F465 ITenantWarehouseIsolationService + DR-65 | P2 |
| R12 | Reverse ETL (push insights back to source SaaS) | F456 IReverseEtlService + T178 ACTIVATION archetype | P2, P4 |
| R13 | Star-schema dimensional model (dims + facts + marts) | Family 56: F449-F453 warehouse model layer | P2 |
| R14 | KPI/semantic layer with single definitions | Family 57: F454-F456 metrics + semantic query | P2 |
| R15 | Data quality + observability + freshness | Family 59: F457-F460 quality + governance | P2 |
| R16 | OAuth credential lifecycle (storage, rotation, refresh) | F427 ICredentialVaultService + F428 ITokenRefreshService | P1 |
| R17 | Rate limit management (per-token, 429 backoff) | F430 IRateLimitGuardService + T168 iron rules | P1, P3 |
| R18 | Webhook ingestion with HMAC verification | F429 IWebhookReceiverService + T169 | P1, P3 |
| R19 | Backfill orchestration with EP-4 crash recovery | F436 IBackfillOrchestratorService uses EP-4 durable saga | P1 |
| R20 | Flow templates as JSON DAGs for FlowOrchestrator (Skill 09) | Templates 33-35 (ingest-pipeline-v1, transform-pipeline-v1, analytics-pipeline-v1) | P4 |
| R21 | Multi-source business flows: Lead→Delivery, Plan→Profit, Support→Resolution | Modeled as mart computations + T176/T177 cross-system joins | P4 |
| R22 | PII controls + GDPR-aligned retention | F459 IWarehouseAuditService + DR-63 + CF-207 | P2, P5 |
| R23 | Integration with FLOW-13 finance data for cross-system analytics | CF-208-CF-210 cross-flow rules, T177 consumes FLOW-13 facts | P4, P5 |
| R24 | Immutable audit trail for all warehouse operations | DR-58 inherits DR-50 pattern from FLOW-13 | P1 |
| R25 | Tenant-scoped credentials never cross isolation boundaries | CF-204-CF-206 multi-tenant warehouse isolation rules | P5 |
| R26 | UI fabric-first, zero platform-specific values | All FREEDOM config uses generic selectors, no platform strings | All |

**COVERAGE: 26/26 requirements mapped ✅**

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# §4 — FACTORY INVENTORY (F426–F465, 40 new factories, 8 families)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Family 52 — Connector & Authentication Management (F426–F431)

| # | Interface | Fabric Resolution | Purpose |
|---|---|---|---|
| F426 | IConnectorRegistryService | DATABASE FABRIC (ES) | Connector catalog + provider config per tenant |
| F427 | ICredentialVaultService | DATABASE FABRIC (PG) | Encrypted OAuth token + PAT storage + rotation |
| F428 | ITokenRefreshService | CORE FABRIC (MicroserviceBase HTTP) | OAuth 2.0 refresh + expiry lifecycle management |
| F429 | IWebhookReceiverService | QUEUE FABRIC (Redis Streams) | HMAC-verified webhook normalization + fanout |
| F430 | IRateLimitGuardService | CORE FABRIC (MicroserviceBase cache) | Per-token rate tracking + 429 exponential backoff |
| F431 | IConnectionHealthService | DATABASE FABRIC (ES) | Connector liveness + API quota headroom monitoring |

## Family 53 — Ingestion Orchestration (F432–F437)

| # | Interface | Fabric Resolution | Purpose |
|---|---|---|---|
| F432 | ISyncJobSchedulerService | QUEUE FABRIC (Redis Streams) | Cron + event-triggered sync job dispatch |
| F433 | IIncrementalCursorService | DATABASE FABRIC (PG) | Cursor/watermark state per entity per tenant |
| F434 | IApiPollingService | CORE FABRIC (MicroserviceBase HTTP) | Paginated REST polling with backoff + retry |
| F435 | IWebhookIngestionService | QUEUE FABRIC (Redis Streams) | Deduplicated webhook event processing |
| F436 | IBackfillOrchestratorService | QUEUE FABRIC (Redis Streams) + EP-4 | Historical replay + gap detection (durable saga) |
| F437 | ISyncRunTrackerService | DATABASE FABRIC (PG) | Run status, records in/out, error sampling, lineage |

## Family 54 — Raw Zone & Landing (F438–F441)

| # | Interface | Fabric Resolution | Purpose |
|---|---|---|---|
| F438 | IRawLandingService | DATABASE FABRIC (ES) | Append-only immutable JSON payloads (Bronze) |
| F439 | ISchemaRegistryService | DATABASE FABRIC (ES) | Source schema discovery + drift detection + alerting |
| F440 | ISourceObjectMapService | DATABASE FABRIC (PG) | Cross-system ID mapping (ClickUp ↔ Zoho ↔ internal) |
| F441 | IReplayBufferService | QUEUE FABRIC (Redis Streams) | Raw record replay trigger for reprocessing |

## Family 55 — Transformation & Staging (F442–F448)

| # | Interface | Fabric Resolution | Purpose |
|---|---|---|---|
| F442 | INormalizerService | CORE FABRIC (ObjectProcessor) | Flatten + type + dedupe raw → staging records |
| F443 | ICustomFieldAdapterService | DATABASE FABRIC (PG) | Dynamic custom field resolution (ClickUp 40+ types) |
| F444 | IStagingWriterService | DATABASE FABRIC (PG) | Idempotent upsert to staging tables |
| F445 | IQuarantineService | DATABASE FABRIC (ES) | Bad record isolation + reason capture + alerting |
| F446 | IIdentityResolutionService | DATABASE FABRIC (PG) + RAG FABRIC (Hybrid) | Cross-system user/entity matching with confidence scoring |
| F447 | ICurrencyNormalizerService | DATABASE FABRIC (PG) | Multi-currency standardization (consumes F387 IExchangeRateService) |
| F448 | ITimezoneNormalizerService | CORE FABRIC (ObjectProcessor) | Timezone alignment + EP-5 fiscal period mapping |

## Family 56 — Warehouse Model Layer (F449–F453)

| # | Interface | Fabric Resolution | Purpose |
|---|---|---|---|
| F449 | IDimensionLoaderService | DATABASE FABRIC (PG) | SCD Type 2 dims: dim_user, dim_workspace, dim_account, dim_project |
| F450 | IFactWriterService | DATABASE FABRIC (PG) | Append-only fact writes (task events, deals, tickets, time entries) |
| F451 | IMartBuilderService | DATABASE FABRIC (PG) | Mart aggregation: Delivery, Sales, Finance, Support |
| F452 | ISnapshotService | DATABASE FABRIC (PG) | Daily/weekly pipeline snapshots (deal stages, WIP, backlog) |
| F453 | IRetentionPolicyService | DATABASE FABRIC (PG) | Tenant-scoped data retention enforcement per zone |

## Family 57 — Metrics & Semantic Layer (F454–F456)

| # | Interface | Fabric Resolution | Purpose |
|---|---|---|---|
| F454 | IMetricDefinitionService | DATABASE FABRIC (ES) | KPI registry: cycle time, pipeline velocity, utilization, profitability |
| F455 | ISemanticQueryService | DATABASE FABRIC (PG) | Tenant-scoped KPI query execution with dimension filters |
| F456 | IReverseEtlService | QUEUE FABRIC (Redis Streams) | Activation: threshold-driven push insights → ClickUp/Zoho |

## Family 58 — Data Quality & Observability (F457–F460)

| # | Interface | Fabric Resolution | Purpose |
|---|---|---|---|
| F457 | IFreshnessCheckService | QUEUE FABRIC (Redis Streams) | Sync freshness alerts + volume anomaly detection |
| F458 | IDataQualityRulesService | DATABASE FABRIC (ES) | Configurable quality rule execution + scoring |
| F459 | IWarehouseAuditService | DATABASE FABRIC (PG — WORM) | Row-level access audit + PII tracking (inherits DR-50 pattern) |
| F460 | ILineageTrackerService | DATABASE FABRIC (ES) | End-to-end data lineage: source → raw → staging → core → mart |

## Family 59 — Warehouse Governance & Tenant Isolation (F461–F465)

| # | Interface | Fabric Resolution | Purpose |
|---|---|---|---|
| F461 | ITenantWarehouseIsolationService | CORE FABRIC (MicroserviceBase + Config) | Pool/bridge/silo warehouse model enforcement per tenant |
| F462 | IPiiClassificationService | AI ENGINE FABRIC (LLM) + DATABASE FABRIC (ES) | Automated PII detection + masking rule management |
| F463 | IRowLevelSecurityService | DATABASE FABRIC (PG — RLS policies) | Dynamic RLS policy generation per tenant per zone |
| F464 | IDataExportService | QUEUE FABRIC (Redis Streams) + DATABASE FABRIC (PG) | GDPR data export + right-to-be-forgotten orchestration |
| F465 | IWarehouseQuotaService | DATABASE FABRIC (Redis) | Per-tenant storage/compute/API quota tracking |

**Total: 40 new factories (F426–F465), 8 new families (52–59)**

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# §5 — TASK TYPE INVENTORY (T167–T178, 12 new engine contracts)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| # | Name | Archetype | Key Factories | Purpose |
|---|---|---|---|---|
| T167 | Connector Registration Gate | PROVISIONING | F426,F427,F428,F430,F431 | OAuth flow + credential vault + health probe = connector ready |
| T168 | Incremental Sync Orchestrator | DURABLE_SAGA | F432,F433,F434,F437 | Cron-triggered paginated polling with cursor tracking (EP-4) |
| T169 | Webhook Ingestion Gate | INGESTION | F429,F435,F438 | HMAC-verified webhook → dedupe → raw landing |
| T170 | Backfill Saga | DURABLE_SAGA | F436,F434,F437,F438 | Historical replay with gap detection + EP-4 crash recovery |
| T171 | Raw-to-Staging Transform | TRANSFORM | F442,F443,F444,F445,F446,F448 | Flatten + normalize + quarantine bad records |
| T172 | Schema Drift Detection Gate | VALIDATION | F439,F445,F458 | Detect field additions/removals + alert + quarantine |
| T173 | Dimension/Fact Refresh Cycle | MODELING | F449,F450,F452 | SCD-2 dim reload + fact append + snapshot capture |
| T174 | Mart Build & KPI Refresh | MODELING | F451,F454,F455 | Mart aggregation + KPI computation + semantic cache |
| T175 | Cross-System Identity Join | JOIN_GATE | F446,F440,F449 | Probabilistic ClickUp↔Zoho user matching + dim update |
| T176 | Cross-Flow Analytics Gate | ORCHESTRATION | F451,F455,F450 | Lead→Delivery + Plan→Profit + Support→Resolution join |
| T177 | Reverse ETL Activation Gate | ACTIVATION | F456,F430,F426 | Threshold-triggered push: computed insights → source SaaS |
| T178 | Warehouse Tenant Provision Gate | PROVISIONING | F461,F463,F465,F453 | Onboard new tenant warehouse: schema + RLS + quotas + retention |

### Archetype Summary

| Archetype | Task Types | New to FLOW-14? |
|---|---|---|
| PROVISIONING | T167, T178 | T167 new connector provisioning (not tenant) |
| DURABLE_SAGA | T168, T170 | Reuses EP-4 from FLOW-13, new external API context |
| INGESTION | T169 | **NEW archetype** — external event capture |
| TRANSFORM | T171 | **NEW archetype** — multi-zone data transformation |
| VALIDATION | T172 | Existing archetype, new schema drift context |
| MODELING | T173, T174 | **NEW archetype** — warehouse model refresh cycle |
| JOIN_GATE | T175 | Existing archetype, new probabilistic scoring |
| ORCHESTRATION | T176 | Existing archetype, new cross-flow analytics context |
| ACTIVATION | T177 | **NEW archetype** — outbound push to external SaaS |

**4 new archetypes: INGESTION, TRANSFORM, MODELING, ACTIVATION**

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# §6 — BFA RULE INVENTORY (CF-192–CF-213, 22 new rules)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Range | Category | Count | Description |
|---|---|---|---|
| CF-192–CF-197 | DWH Internal (intra-FLOW-14) | 6 | Zone promotion order, cursor integrity, raw immutability, staging idempotency, fact append-only, mart dependencies |
| CF-198–CF-203 | DWH vs Prior Flows (FLOW-14 vs FLOW-01–13) | 6 | Connector vs auth (FLOW-01), identity vs user svc (FLOW-01), warehouse vs commerce (FLOW-10), finance mart vs GL (FLOW-13), tenant provision vs control plane (FLOW-08), quota vs billing (FLOW-09) |
| CF-204–CF-206 | Multi-Tenant DWH Isolation | 3 | Credential never cross tenant, warehouse schema never cross tenant, RLS policy per zone per tenant |
| CF-207–CF-209 | PII & Compliance | 3 | PII masking before mart, retention policy enforced before delete, audit trail before any warehouse mutation |
| CF-210–CF-213 | External API Safety | 4 | Rate limit before any API call, webhook HMAC before processing, backfill never during peak, reverse ETL never on locked records |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# §7 — FLOW TEMPLATES (Templates 33–35)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| # | Template Name | DAG Steps | Purpose |
|---|---|---|---|
| 33 | ingest-pipeline-v1 | T167→T168→T169→T170→raw-complete | External data capture: connect → poll → webhook → backfill |
| 34 | transform-pipeline-v1 | T171→T172→T175→T173→T174→model-complete | Data transformation: stage → detect drift → identity join → dim/fact → mart |
| 35 | analytics-pipeline-v1 | T176→T177→T178→analytics-complete | Analytics: cross-flow join → reverse ETL → tenant provision |

Each template is a JSON DAG for FlowOrchestrator (Skill 09).
Each step = a factory interface resolved through a fabric via CreateAsync().

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# §8 — DESIGN RECORDS (DR-58–DR-65)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| DR | Title | Decision |
|---|---|---|
| DR-58 | Immutable Raw Zone (Bronze) | All raw payloads are append-only. Never update/delete. Inherits DR-50 audit pattern from FLOW-13 |
| DR-59 | Rate Limit as Fabric Guard | Rate limiting resolved through CORE FABRIC cache, not per-connector code. Config-driven limits per provider per token |
| DR-60 | Schema Drift as FREEDOM Config | New custom fields detected automatically; promotion to staging requires admin approval (FREEDOM) |
| DR-61 | Cross-System Identity as Probabilistic | Identity resolution uses confidence scoring (0.0-1.0). Matches above threshold auto-merge; below threshold queued for human review |
| DR-62 | SCD Type 2 for All Dimensions | Dimension changes create new version rows, never overwrite. Enables point-in-time analytics |
| DR-63 | PII Classification Before Mart Promotion | No record enters mart layer without PII classification pass. Masking rules applied at zone boundary |
| DR-64 | Reverse ETL as Event, Not API Call | Outbound push uses QUEUE FABRIC (Redis Streams), never direct HTTP to external API. Enables retry/DLQ |
| DR-65 | Warehouse Isolation Inherits FLOW-08 Model | Pool/bridge/silo tiers use same F461 pattern as FLOW-08 tenant isolation but scoped to warehouse zones |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# §9 — SKILL PATTERNS (SK-89–SK-98)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| SK | Pattern | Reusable For |
|---|---|---|
| SK-89 | OAuth Credential Lifecycle (vault + refresh + rotation) | Any external SaaS connector beyond ClickUp/Zoho |
| SK-90 | Paginated API Polling with Cursor Watermark | Any REST API with pagination + incremental sync |
| SK-91 | HMAC Webhook Verification + Fanout | Any webhook-enabled SaaS platform |
| SK-92 | Multi-Zone Warehouse Pipeline (raw→staging→core→mart) | Any data warehouse implementation |
| SK-93 | Schema Drift Detection + Dynamic Field Adapter | Any source with evolving schemas (custom fields) |
| SK-94 | Probabilistic Cross-System Identity Resolution | Any multi-source data integration |
| SK-95 | SCD Type 2 Dimension Loader | Any warehouse dimension management |
| SK-96 | KPI Registry with Semantic Query | Any analytics/BI layer |
| SK-97 | Reverse ETL with Threshold Activation | Any insight-to-action automation |
| SK-98 | Data Lineage Tracker (source→raw→staging→core→mart) | Any multi-layer data pipeline observability |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# §10 — DESIGN DECISIONS (DD-74–DD-85)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| DD | Decision | Options Considered | Chosen | Rationale |
|---|---|---|---|---|
| DD-74 | Warehouse storage target | Operational DB only / Dedicated warehouse / Lakehouse | DATABASE FABRIC (provider-agnostic) | Fabric-first: engine code identical, admin swaps provider |
| DD-75 | Ingestion orchestration | In-service scheduler / Airflow / Managed ETL | QUEUE FABRIC (Redis Streams) + EP-4 durable saga | No new infra; reuse existing primitives |
| DD-76 | Raw zone format | Parquet / JSON / Avro | JSON in Elasticsearch | Aligns with DNA-1 (Dictionary), existing ES fabric |
| DD-77 | Identity resolution approach | Deterministic / Probabilistic / Manual | Probabilistic with confidence threshold (FREEDOM config) | Handles fuzzy matches; admin controls threshold |
| DD-78 | Mart refresh strategy | Full rebuild / Incremental / Streaming | Incremental with daily snapshots | Balances freshness vs compute cost; snapshot for point-in-time |
| DD-79 | External API authentication | PAT only / OAuth only / Both | Both (connector-specific FREEDOM config) | ClickUp supports both; Zoho requires OAuth |
| DD-80 | Rate limit strategy | Global shared / Per-token / Per-tenant | Per-token with tenant-level quota ceiling | Matches ClickUp per-token model; prevents one tenant starving others |
| DD-81 | Schema drift handling | Fail fast / Auto-adapt / Admin approval | Auto-detect + admin approval for mart promotion | Prevents breaking mart aggregations from unexpected fields |
| DD-82 | Cross-system time alignment | Source timezone / UTC / Tenant-configurable | UTC storage + EP-5 fiscal period mapping | Universal storage; display in tenant's timezone |
| DD-83 | Reverse ETL trigger | Schedule / Threshold / Manual | Threshold with schedule fallback (FREEDOM) | Admin configures thresholds; schedule catches stragglers |
| DD-84 | PII handling approach | Tokenization / Masking / Encryption | Masking in mart + encryption at rest (FREEDOM config per tenant) | Balance analytics utility vs privacy; admin controls |
| DD-85 | Backfill strategy | Full history / Sliding window / Date range | Date-range slices with durable saga (EP-4) | Manages API quotas; crash-recoverable |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# §11 — POSITIVE EXAMPLES (Expected Correct Output)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### ✅ POSITIVE EXAMPLE 1 — Full Engine Contract (T168)

```
TASK TYPE: T168 — Incremental Sync Orchestrator
ARCHETYPE: DURABLE_SAGA
ENTRY: Cron trigger or manual "sync now" event from SyncJobSchedulerService (F432)
PURPOSE: Execute paginated API polling against external SaaS, track cursor/watermark,
         land records in raw zone. Crash-recoverable via EP-4 durable saga checkpoints.
DISTINCT FROM: T170 (backfill — full history replay) and T169 (webhook — push-based)

FACTORY DEPENDENCIES:
  F432 ISyncJobSchedulerService   — resolved via CreateAsync()
  F433 IIncrementalCursorService  — resolved via CreateAsync()
  F434 IApiPollingService         — resolved via CreateAsync()
  F437 ISyncRunTrackerService     — resolved via CreateAsync()
  F438 IRawLandingService         — resolved via CreateAsync()
  F430 IRateLimitGuardService     — resolved via CreateAsync()

FABRIC RESOLUTION:
  F432 → QUEUE FABRIC (Redis Streams) — job dispatch
  F433 → DATABASE FABRIC (PG) — cursor state
  F434 → CORE FABRIC (MicroserviceBase HTTP) — paginated polling
  F437 → DATABASE FABRIC (PG) — run tracking
  F438 → DATABASE FABRIC (ES) — raw landing
  F430 → CORE FABRIC (MicroserviceBase cache) — rate tracking

AF CONFIGURATION:
  AF-1 Genesis:     Generate sync service on MicroserviceBase + fabric interfaces
  AF-2 Planning:    Decompose into: init cursor → poll page → land raw → advance cursor → repeat/complete
  AF-3 Prompt Lib:  "paginated-api-sync", "rate-limit-backoff", "durable-saga-checkpoint"
  AF-4 RAG:         SK-90 (paginated polling), SK-89 (OAuth lifecycle), EP-4 (durable saga)
  AF-5 Multi-model: Rate limit backoff algorithm generation (Claude vs GPT compete)
  AF-6 Code Review: Cursor overflow, pagination termination, timeout handling
  AF-7 Compliance:  DNA-1 (Dictionary), DNA-2 (BuildSearchFilter), DNA-3 (DataProcessResult),
                    DNA-4 (MicroserviceBase), DNA-5 (tenantId on every query)
  AF-8 Security:    Credential never in logs, token rotation during long sync, TLS enforcement
  AF-9 Judge:       8 iron rules + 6 quality gates (below)
  AF-10 Merge:      Best rate-limit strategy from multi-model competition
  AF-11 Feedback:   Sync success rate, records/second, rate-limit hit ratio

BFA VALIDATION:
  CF-192: Zone promotion order (must land in raw before staging)
  CF-193: Cursor integrity (cursor must advance monotonically)
  CF-210: Rate limit check before every API call
  CF-198: Connector auth vs FLOW-01 user auth (no conflict — different identity planes)

MACHINE/FREEDOM:
  MACHINE: Cursor tracking logic, pagination termination, EP-4 saga state machine
  FREEDOM: Sync frequency (cron expr), page size, rate limit ceiling, retry count,
           backoff multiplier, provider selection (ClickUp/Zoho/future)

IRON RULES:
  IR-168-1: tenantId MUST be on every cursor state write (DNA-5)
  IR-168-2: Raw landing MUST be append-only — no update/delete (DR-58)
  IR-168-3: Rate limit guard MUST be checked before every API call (CF-210)
  IR-168-4: Cursor MUST be persisted via EP-4 checkpoint before advancing (crash recovery)
  IR-168-5: No typed model for API response — Dictionary<string,object> only (DNA-1)
  IR-168-6: Credentials MUST be resolved from ICredentialVaultService, never hardcoded
  IR-168-7: Sync run status MUST be tracked in ISyncRunTrackerService for observability
  IR-168-8: Provider SDK MUST NOT be imported — all calls through CORE FABRIC HTTP

QUALITY GATES:
  QG-168-1: Sync completes without uncaught exceptions → DataProcessResult wraps all
  QG-168-2: Cursor advances = pages polled (no skipped pages)
  QG-168-3: Rate limit 429 responses handled with exponential backoff (not failure)
  QG-168-4: Raw records count matches API pagination total (reconciliation)
  QG-168-5: EP-4 saga can resume from last checkpoint after simulated crash
  QG-168-6: Sync run tracker shows correct status (running/completed/failed/partial)
```

### ✅ POSITIVE EXAMPLE 2 — DNA-compliant service stub (engine-generated)

```csharp
// CORRECT: Connector service generated by engine — fabric-first
public class ClickUpSyncService : MicroserviceBase  // DNA-4: MicroserviceBase
{
    private readonly IExternalServiceFactory<IApiPollingService> _pollingFactory;
    private readonly IExternalServiceFactory<ICredentialVaultService> _vaultFactory;
    private readonly IExternalServiceFactory<IRawLandingService> _rawFactory;
    private readonly IExternalServiceFactory<IRateLimitGuardService> _rateLimitFactory;

    public async Task<DataProcessResult<int>> SyncPageAsync(
        Dictionary<string,object> jobConfig)  // DNA-1: Dictionary, never ClickUpTask model
    {
        var tenantId = GetTenantId();  // DNA-5: scope isolation from MicroserviceBase
        var rateLimit = await _rateLimitFactory.CreateAsync(new(tenantId));
        var canProceed = await rateLimit.CheckAsync(tenantId, "clickup_api");  // CF-210
        if (!canProceed.Success) return canProceed.AsFailure<int>();  // DNA-3

        var vault = await _vaultFactory.CreateAsync(new(tenantId));
        var creds = await vault.GetCredentialsAsync(  // returns Dictionary
            BuildSearchFilter(new { tenantId, provider = "clickup" }));  // DNA-2

        var polling = await _pollingFactory.CreateAsync(new(tenantId, provider: "clickup_api"));
        var page = await polling.PollPageAsync(
            BuildSearchFilter(new { tenantId, cursor = jobConfig["cursor"] }));

        if (!page.Success) return page.AsFailure<int>();  // DNA-3

        var raw = await _rawFactory.CreateAsync(new(tenantId));
        foreach (var record in page.Data)
        {
            record["tenantId"] = tenantId;  // DNA-5: scope isolation
            record["_ingestTimestamp"] = DateTime.UtcNow;
            record["_sourceProvider"] = "clickup";
            await raw.AppendAsync(record);  // DR-58: append-only
        }
        return DataProcessResult<int>.Ok(page.Data.Count);  // DNA-3
    }
    // DynamicController handles routing — DNA-6
}
```

### ✅ POSITIVE EXAMPLE 3 — Factory resolution with fabric mapping

```
F434:IApiPollingService
  ├── Resolved via: CORE FABRIC (MicroserviceBase HTTP extension)
  ├── CreateAsync(ctx) where ctx = { tenantId, provider: "clickup_api" }
  ├── Config routing:
  │   1. Read config: "connectors.clickup.pollingProvider" → "http_paginated"
  │   2. Resolve from registry: HttpPaginatedPollingProvider
  │   3. Validate capability: supports pagination + cursor + rate-limit-aware
  │   4. Health check: connectivity to ClickUp API base URL
  │   5. Fallback: retry with exponential backoff (NOT switch provider)
  │   6. Escalate: DLQ + alert if all retries exhausted
  └── NEVER imports ClickUp SDK or Zoho SDK directly
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# §12 — NEGATIVE EXAMPLES (What the Engine MUST REJECT)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

### ❌ NEGATIVE EXAMPLE 1 — Direct provider import (BUILD FAILURE)

```csharp
// WRONG: Imports Zoho SDK directly — violates fabric-first architecture
using ZohoSDK.CRM;  // ❌ IRON RULE VIOLATION — IR-168-8
public class ZohoCRMService  // ❌ Not extending MicroserviceBase — DNA-4 violation
{
    private readonly ZohoCRMClient _client;  // ❌ Never import provider
    public async Task<List<ZohoDeal>> GetDealsAsync()  // ❌ Typed model — DNA-1
    {
        return await _client.Deals.GetAllAsync();  // ❌ Direct provider call
    }
}
// AF-7 COMPLIANCE FAIL + AF-9 JUDGMENT FAIL + BUILD BLOCKED
```

### ❌ NEGATIVE EXAMPLE 2 — Missing tenantId (DATA LEAK RISK)

```csharp
// WRONG: Raw landing query without tenant isolation
public async Task<DataProcessResult<Dictionary<string,object>>> GetRawAsync(string sourceId)
{
    var filter = BuildSearchFilter(new { sourceId });  // ❌ Missing tenantId! — DNA-5
    return await _db.SearchDocumentsAsync("raw_landing", filter);
    // This returns records from ALL tenants matching sourceId
}
// AF-8 SECURITY FAIL + CF-204 BFA CONFLICT DETECTED + BUILD BLOCKED
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
// CORRECT: var record = ParseDocument(rawJson) → Dictionary<string,object>
// AF-7 COMPLIANCE FAIL — BUILD BLOCKED
```

### ❌ NEGATIVE EXAMPLE 4 — Task type stub (not a full engine contract)

```
// WRONG: One-line stub
T171: Raw-to-Staging (transform JSON to PG tables)
// This is NOT an engine contract. No ARCHETYPE, no FABRIC RESOLUTION,
// no AF CONFIGURATION, no IRON RULES, no QUALITY GATES.
// AF-9 JUDGE WILL REJECT — BUILD BLOCKED
```

### ❌ NEGATIVE EXAMPLE 5 — Raw zone mutation (DR-58 VIOLATION)

```csharp
// WRONG: Updating raw record instead of append-only
public async Task UpdateRawRecordAsync(string id, Dictionary<string,object> updates)
{
    await _rawLanding.UpdateDocumentAsync("raw_landing", id, updates);  // ❌ DR-58 violation!
    // Raw zone is IMMUTABLE. If record needs correction, append a new version.
}
// AF-9 JUDGMENT FAIL + CF-192 (zone promotion order) — BUILD BLOCKED
```

### ❌ NEGATIVE EXAMPLE 6 — Rate limit bypass (CF-210 VIOLATION)

```csharp
// WRONG: Calling external API without rate limit check
public async Task<Dictionary<string,object>> PollDirectAsync(string url)
{
    var response = await _httpClient.GetAsync(url);  // ❌ No rate limit check! — CF-210
    // Also: no credential vault, no tenant scope, no DataProcessResult wrapping
}
// AF-8 SECURITY FAIL + CF-210 BFA CONFLICT — BUILD BLOCKED
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# §13 — MACHINE/FREEDOM CLASSIFICATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Component | Type | Reason |
|---|---|---|
| Zone promotion order (raw→staging→core→mart) | MACHINE | Structural — violations corrupt data pipeline |
| Cursor tracking + pagination logic | MACHINE | State machine — must be deterministic |
| EP-4 durable saga checkpoints | MACHINE | Crash recovery — mathematical state transitions |
| DNA pattern enforcement | MACHINE | Architectural law — no exceptions |
| HMAC webhook signature verification | MACHINE | Cryptographic — must be exact |
| Deduplication logic (idempotent upsert) | MACHINE | Mathematical — hash-based identity |
| SCD Type 2 version management | MACHINE | Structural — insert new row, never update |
| Sync frequency (cron expression) | FREEDOM | Admin-configurable per tenant per connector |
| Page size for API polling | FREEDOM | Admin tunes based on API limits + performance |
| Rate limit ceiling per tenant | FREEDOM | Admin/plan-based throttle |
| Retry count + backoff multiplier | FREEDOM | Operational tuning without code change |
| Provider selection (ClickUp/Zoho/future) | FREEDOM | Connector type per tenant via config |
| Identity match confidence threshold | FREEDOM | Admin sets acceptable match quality |
| KPI definitions (cycle time, velocity) | FREEDOM | Business logic — admin defines formulas |
| Mart refresh schedule | FREEDOM | Operational — hourly/daily/weekly |
| PII masking rules per field | FREEDOM | Compliance — admin configures per tenant |
| Warehouse isolation tier (pool/bridge/silo) | FREEDOM | Admin sets per tenant based on plan/compliance |
| Reverse ETL trigger thresholds | FREEDOM | Admin defines when insights push to source |
| Retention policy per zone per tenant | FREEDOM | Compliance + cost — admin-configurable |
| Data quality rule definitions | FREEDOM | Business rules — admin-editable |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# §14 — MULTI-TENANT EXTENSION (FLOW-14 specific)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FLOW-14 extends the warehouse's multi-tenancy contract on top of existing
FLOW-08 tenant control plane + DNA-5 (Scope Isolation) + DNA-9 (SoD).

Three isolation models supported via F461 (ITenantWarehouseIsolationService):

```
MODEL: pool    → Shared schema, every warehouse query has tenantId filter (default)
                 DNA-5 enforced via MicroserviceBase. Cheapest. Best for small tenants.
                 RLS policies managed by F463.

MODEL: bridge  → Separate Postgres schemas per tenant, search_path scoped
                 Graduated automatically when tenant data exceeds config threshold
                 or when compliance requires logical separation.

MODEL: silo    → Separate database/ES index per tenant
                 Config-driven: "warehouse.isolation.model": "silo"
                 For enterprise tenants with data residency or regulatory needs.
```

Tenant isolation model is FREEDOM config — admin sets it per tenant.
Engine-generated code is IDENTICAL for all three — fabric handles the routing.
Zero code changes needed to upgrade a tenant from pool → bridge → silo.

Additional FLOW-14 tenant concerns:
- Credential vault (F427) is ALWAYS tenant-scoped — no shared credentials
- Each tenant's external SaaS OAuth tokens are encrypted separately
- DNA-9 SoD: connector admin ≠ warehouse data viewer ≠ mart consumer
- Quota tracking (F465) prevents one tenant from consuming all warehouse compute

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# §15 — MINI RAG INDEX (for AI agent context)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Source Documents Available

| # | Document | Content | Key for FLOW-14 |
|---|---|---|---|
| 1 | SESSION_STATE_MERGE.md | Global state: F425/T166/CF-191 | Starting numbers for FLOW-14 |
| 2 | ENGINE_ARCHITECTURE_MERGED.md | F1-F425, EP-1-5, DNA-1-9, DR-1-57 | Existing factories + design records |
| 3 | TASK_TYPES_CATALOG_MERGED.md | T1-T166, AF maps, Templates 1-32 | Existing task types + archetypes |
| 4 | V62_BFA_STRESS_TEST_MERGED.md | CF-1-CF-191, ST-1-ST-91 | Existing BFA rules + stress tests |
| 5 | UNIFIED_SOURCE_INDEX_MERGED.md | DD-1-DD-73, SK index, concept maps | Existing source index |
| 6 | SKILLS_FACTORY_RAG_MERGED.md | SK-1-SK-88, AF-4 RAG patterns | Existing skill patterns |
| 7 | MASTER_EXECUTION_PLAN_MERGED.md | All flow execution plans | FLOW-08 multi-tenant reference |
| 8 | basic_prompt.txt | Engine extension protocol | THE LAW — always reference |
| 9 | 14_-_data_werehouse.md | DWH module descriptions + flows | Source domain requirements |
| 10 | 14_-_data_werehouse_deep_research.md | Architecture + constraints + timeline | Technical requirements + API limits |
| 11 | 14_-_data_werehouse_deep_research_multi_tenant.md | MT isolation patterns | MT design patterns for warehouse |
| 12 | 14_-_data_werehouse_deep_research_multi_tenant_plan.md | Original FLOW-08 DWH plan | RENUMBER: F244→F426 (+182), T83→T167 (+84) |
| 13 | multi-tenant-support.md | Cross-module MT analysis | Portfolio-level MT patterns |
| 14 | xiigen-architect-skill/SKILL.md | Architect methodology | Phase protocol + DNA audit |

## Renumbering from Original DWH Plan

The original DWH plan (doc #12) was written when system was at F243/T82/Family-26.
FLOW-14 applies these offsets:

| Artifact | Original Range | Offset | FLOW-14 Range |
|---|---|---|---|
| Factories | F244-F276 | +182 | F426-F465 (expanded from 33 to 40) |
| Families | 27-33 | +25 | 52-59 (expanded from 7 to 8) |
| Task Types | T83-T88 | +84 | T167-T178 (expanded from 6 to 12) |
| Templates | 18 | +15 | 33-35 (expanded from 1 to 3) |
| BFA Rules | CF-64-CF-75 | +128 | CF-192-CF-213 (expanded from 12 to 22) |
| Stress Tests | ST-31-ST-36 | +61 | ST-92-ST-103 (expanded from 6 to 12) |
| Design Records | DR-21-DR-24 | +37 | DR-58-DR-65 (expanded from 4 to 8) |
| Design Decisions | DD-21-DD-26 | +53 | DD-74-DD-85 (expanded from 6 to 12) |
| Skill Patterns | SK-29-SK-34 | +60 | SK-89-SK-98 (expanded from 6 to 10) |

Expansions reflect: integration with FLOW-08 through FLOW-13 patterns, richer
BFA cross-flow rules, additional archetypes, and new engine primitives consumed.

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# §16 — KEY INVARIANTS — FLOW-14
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| ID | Invariant | Enforcement |
|---|---|---|
| INV-14-1 | Raw zone records are immutable — never updated or deleted | DR-58, CF-192, IR-168-2 |
| INV-14-2 | Rate limit must be checked before every external API call | CF-210, IR-168-3, F430 |
| INV-14-3 | Tenant credentials never cross isolation boundaries | CF-204, DNA-5, F427 tenant scope |
| INV-14-4 | Zone promotion order must be raw→staging→core→mart (never skip) | CF-192, T171/T173/T174 dependency chain |
| INV-14-5 | PII classification must pass before mart promotion | CF-207, DR-63, F462 |
| INV-14-6 | Cursor/watermark must persist before advancing (EP-4) | IR-168-4, T168/T170 durable saga |
| INV-14-7 | Webhook HMAC must verify before processing | CF-211, IR-169-1, F429 |
| INV-14-8 | Identity resolution must not join cross-tenant records | CF-204, IR-175-1 |
| INV-14-9 | Reverse ETL must not push to locked records/periods | CF-213, DR-64 |
| INV-14-10 | All warehouse queries must include tenantId (DNA-5) | DNA-5, CF-204-206 |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# §17 — DELTA SUMMARY (What FLOW-14 Adds)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Metric | Before (Post-FLOW-13) | After (Post-FLOW-14) | Delta |
|---|---|---|---|
| Factory interfaces | 425 | 465 | +40 |
| Factory families | 51 | 59 | +8 |
| Task types | 166 | 178 | +12 |
| Flow templates | 32 | 35 | +3 |
| BFA conflict rules | 191 | 213 | +22 |
| Stress tests | 91 | 103 | +12 |
| Design records | 57 | 65 | +8 |
| Design decisions | 73 | 85 | +12 |
| Skill patterns | 88 | 98 | +10 |
| New archetypes | — | INGESTION, TRANSFORM, MODELING, ACTIVATION | +4 |
| DNA patterns | 9 | 9 | 0 (all reused) |
| Engine primitives | 5 | 5 | 0 (EP-4/EP-5 consumed) |

### First-Time Capabilities in FLOW-14

| Capability | Artifact | Why First |
|---|---|---|
| External SaaS OAuth lifecycle | F427/F428, T167 | Prior flows used static config; FLOW-14 manages live OAuth |
| Hybrid ingestion (polling + webhooks) | F434/F435, T168/T169 | Prior flows consumed internal events; FLOW-14 bridges external APIs |
| Multi-zone warehouse pipeline (raw→staging→core→mart) | T171/T173/T174 | No prior flow had multi-layer transform with zone promotion |
| Schema drift detection + dynamic custom fields | F439/F443, T172 | Prior flows: fixed schemas; FLOW-14: dynamic schema tracking |
| Cross-system identity join (probabilistic) | F446, T175 | Prior joins within one system; T175 joins ClickUp + Zoho + internal |
| Reverse ETL activation | F456, T177 | First time engine generates outbound push to external SaaS |
| Star-schema dimensional modeling | F449/F450, T173 | First time engine generates formal dim/fact warehouse model |
| KPI registry + semantic query | F454/F455, T174 | First configurable metrics layer with single KPI definitions |
| Data lineage tracking | F460, SK-98 | First end-to-end lineage across warehouse zones |
| PII classification with AI | F462 | First AI-powered data classification in warehouse context |
| INGESTION archetype | T169 | New: external event capture into engine |
| TRANSFORM archetype | T171 | New: multi-zone data transformation |
| MODELING archetype | T173/T174 | New: warehouse model refresh cycle |
| ACTIVATION archetype | T177 | New: outbound push to external systems |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# §18 — BACKWARD COMPATIBILITY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
F1-F425:   UNCHANGED ✅ (465 - 40 = 425 pre-existing)
T1-T166:   UNCHANGED ✅ (178 - 12 = 166 pre-existing)
Tpl 1-32:  UNCHANGED ✅ (35 - 3 = 32 pre-existing)
CF-1-191:  UNCHANGED ✅ (213 - 22 = 191 pre-existing)
ST-1-91:   UNCHANGED ✅ (103 - 12 = 91 pre-existing)
SK-1-88:   UNCHANGED ✅ (98 - 10 = 88 pre-existing)
DD-1-73:   UNCHANGED ✅ (85 - 12 = 73 pre-existing)
DR-1-57:   UNCHANGED ✅ (65 - 8 = 57 pre-existing)
DNA-1-9:   STABLE ✅ (no new patterns — all 9 consumed)
EP-1-5:    STABLE ✅ (no new primitives — EP-4/EP-5 consumed)
```

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# §19 — RECOVERY COMMANDS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
"Show FLOW-14 plan"          → This file (FLOW14_PLAN_P0.md)
"Start P1"                   → Generate F426–F443 (Connection + Ingestion + Raw Zone)
"Start P2"                   → Generate F444–F465 (Transform + Warehouse + Metrics + Governance)
"Start P3"                   → Generate T167–T172 (first 6 task type contracts)
"Start P4"                   → Generate T173–T178 + Templates 33-35
"Start P5"                   → Generate CF-192–CF-213 + ST-92–ST-103
"Start P6"                   → Generate SK-89–SK-98 + DD-74–DD-85
"Start P7"                   → Merge into all 7 canonical files
"Start P8"                   → Validation + SESSION_STATE update
"Resume from P{n}"           → Load this file + basic_prompt.txt + SESSION_STATE_MERGE.md
```

---

# PLAN:P0 COMPLETE ✅
# Status: Ready to execute Phase 1 on command "Start P1"
# Resume: "Continue FLOW-14 from P1" → Load this plan + basic_prompt.txt
