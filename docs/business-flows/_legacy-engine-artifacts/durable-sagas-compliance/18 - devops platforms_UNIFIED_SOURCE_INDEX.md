# UNIFIED SOURCE INDEX — FLOW-18 DELTA
## DevOps Platforms / Flow Creation Engine
## Extends: UNIFIED_SOURCE_INDEX_MERGED.md (DD-1-DD-85)
## Range: DD-86-DD-98 (13 decisions)
## Status: FLOW-18 COMPLETE ✅

---

## DESIGN DECISIONS — DD-86-DD-98

```
DD-86: FLOW DEFINITIONS STORED IN ELASTICSEARCH (searchable) + POSTGRESQL (version lineage)
  QUESTION: Where to store flow definitions — single DB or split?
  DECISION: ES for full-text search/discovery (F466); PG for version lineage and atomic publish (F467).
  RATIONALE: ES excels at template search and pattern matching (AF-4 RAG);
             PG provides ACID guarantees needed for atomic version publish.
  REJECTED: Single ES store — lacks transactional guarantees for version collision prevention.
  PATTERN: Dual-write with F466 (ES) as primary search index, F467 (PG) as lineage source of truth.
  IMPACT: CF-214 collision prevention relies on PG transaction; SK-99 RAG relies on ES index.

DD-87: APPROVAL EVENTS VIA QUEUE FABRIC, NOT HTTP POLLING
  QUESTION: How should hard stop approval gates wait for human decisions?
  DECISION: Queue-based approval request/response via F475 + QUEUE FABRIC (DR-69).
  RATIONALE: HTTP blocking for human approval creates thread exhaustion under load.
             Queue decouples the wait; orchestrator resumes from PAUSED state on event receipt.
  REJECTED: Long-polling HTTP endpoint — timeout risk, resource waste, no audit trail.
  PATTERN: PAUSED → HardStopEntered (CloudEvent) → approver acts → HardStopApproved/Rejected → RUNNING/FAILED
  IMPACT: CF-224 enforces this; IR-182-2 makes HTTP blocking a BUILD FAILURE.

DD-88: TENANT RESOLUTION AT INGRESS ONLY (F484 AS SINGLE RESOLUTION POINT)
  QUESTION: Where should tenant context be resolved in the request lifecycle?
  DECISION: F484 ITenantContextMiddlewareService resolves tenant ONCE at ingress.
             All downstream services consume pre-resolved context — never re-resolve.
  RATIONALE: Re-resolution in downstream services creates BOLA risk (OWASP top API risk).
             Single resolution point → single security invariant to enforce (CF-221).
  REJECTED: Per-service tenant resolution — multiple trust boundaries, higher attack surface.
  PATTERN: Ingress middleware → TenantContext → all services read from context, never from payload.
  IMPACT: DR-68 codifies this; CF-221 enforces middleware health as system-wide invariant.

DD-89: RLS AS DEFENSE-IN-DEPTH (APP SCOPING + DB POLICY)
  QUESTION: Is application-layer tenant scoping sufficient or is DB RLS also required?
  DECISION: Both required — app layer (BuildSearchFilter with tenantId) AND DB layer (F489 RLS policies).
  RATIONALE: App scoping relies on code correctness; RLS is a second barrier.
             OWASP and PostgreSQL guidance: rely on DB-level enforcement for high-risk data.
  REJECTED: RLS alone (not possible without app context propagation for session binding).
  PATTERN: F484 sets session tenant → F489 RLS policy uses current_setting → double protection.
  IMPACT: DR-71, CF-220, INV-18-6; ST-107 validates dual-layer isolation under load.

DD-90: CLOUDCLOUDCLOUDCLOUDCLOUDCLOUD EVENTS 1.0 AS STANDARD EVENT ENVELOPE
  QUESTION: What event format standard for execution/step lifecycle events?
  DECISION: CloudEvents 1.0 JSON via F507 ICloudEventsEnvelopeService (DR-70).
  RATIONALE: Standardized envelope enables routing, filtering, and third-party integration
             without per-service schema negotiation. CloudEvents is CNCF standard.
  REJECTED: Custom envelope — not portable, not tooling-compatible.
  PATTERN: Every event: specversion/type/source/id/time/subject/data (CloudEvents 1.0 JSON).
  IMPACT: CF-231 enforces; ST-115 validates 100% compliance under load.

DD-91: W3C TRACE CONTEXT FOR DISTRIBUTED TRACING
  QUESTION: How to correlate traces across orchestrator, skills, and external integrations?
  DECISION: W3C Trace Context (traceparent/tracestate) propagated by F494 ITraceContextService.
  RATIONALE: W3C standard ensures interoperability with OpenTelemetry, Jaeger, Zipkin, etc.
             Every execution/step event carries traceparent in CloudEvents data field.
  REJECTED: Custom correlation IDs — not interoperable with standard tooling.
  PATTERN: F494 creates trace at execution start; propagated through QUEUE FABRIC events.
  IMPACT: DR-74 observability guidance; ST-115 validates trace in all CloudEvents.

DD-92: AI BLUEPRINT GENERATION USES MULTI-MODEL + RAG (HYBRID STRATEGY)
  QUESTION: How to maximize blueprint generation quality and reliability?
  DECISION: AF-5 multi-model (min 2 providers) + AF-4 RAG (Hybrid strategy) via F503.
  RATIONALE: Single model has higher hallucination risk for structured flow DAGs.
             RAG grounds generation in existing verified skill patterns (SK-99-SK-110).
             Multi-model + AF-10 merge reduces individual model failure impact.
  REJECTED: Single-model generation — insufficient reliability for production flow definitions.
  PATTERN: Intent → RAG search → parallel generation (Claude+GPT) → AF-10 consensus → validate.
  IMPACT: T192 AF configuration; IR-192-4; ST-108 validates under load.

DD-93: PROMOTION LADDER FOR AI-GENERATED CODE (GENERATED→CORE)
  QUESTION: Can AI-generated step code be deployed directly to production?
  DECISION: No — all generated code enters at GENERATED tier and must pass all AF stations (DR-72).
  RATIONALE: AF stations (AF-6 code review, AF-7 DNA compliance, AF-8 security, AF-9 judge)
             catch AI code generation errors that human reviewers might miss under time pressure.
  REJECTED: Direct AI code deployment — bypasses DNA pattern enforcement.
  PATTERN: GENERATED → AF-6/7/8/9 → INJECTED (needs human approval) → MINIMAL → CORE.
  IMPACT: CF-230, IR-192-6; T192 quality gates.

DD-94: DEVOPS CONNECTORS SWAPPABLE VIA CONFIG (NO SDK IMPORTS)
  QUESTION: How to add new CI/CD platform connectors without code changes?
  DECISION: All DevOps connectors use CORE FABRIC HTTP (DR-73).
             Adding new platform = registering new F479 connector config, not writing code.
  RATIONALE: Freedom Machine philosophy — config-driven swappability eliminates developer dependency.
             Jenkins today → GitHub Actions tomorrow → config change, not code change.
  REJECTED: Platform SDK imports — locks provider into codebase, breaks swappability.
  PATTERN: F479 registry stores connector config; CORE FABRIC resolves at runtime.
  IMPACT: CF-228, IR-190-2; AF-7 import scanner enforces at code generation time.

DD-95: IDEMPOTENCY KEY AS FIRST-CLASS PRIMITIVE FOR ALL RETRIES
  QUESTION: How to prevent duplicate side effects in at-least-once step execution?
  DECISION: F477 IIdempotencyService registration required before ANY retry dispatch (CF-227).
  RATIONALE: At-least-once queue semantics + crash recovery = potential duplicate dispatches.
             Idempotency keys prevent duplicate state mutations even with multiple deliveries.
  REJECTED: Application-level deduplication only — insufficient for distributed execution.
  PATTERN: Register key (tenant+endpoint+correlationId) → check on retry → deduplicate.
  IMPACT: CF-227, IR-185-1; ST-110 validates exact max-retry boundary.

DD-96: SCHEMA-PER-TENANT MIGRATION USES EXPAND→MIGRATE→CONTRACT
  QUESTION: How to safely introduce schema changes in multi-tenant environments?
  DECISION: Parallel change pattern: expand (additive) → migrate (backfill+dual-write) → contract (enforce).
  RATIONALE: Avoids downtime; enables rollback at any phase; prevents data loss from premature NOT NULL.
  REJECTED: Big-bang migration — high rollback risk, downtime required.
  PATTERN: F490 orchestrates phases; F492 feature flag gates contract phase.
  IMPACT: DD-96, CF-222, T188 iron rules; ST-111 validates full expand/contract cycle.

DD-97: QUOTA ENFORCED AT REDIS (FAST PATH) WITH ES AUDIT
  QUESTION: Where to enforce execution quotas for speed vs durability tradeoff?
  DECISION: F491 uses Redis for real-time enforcement (< 10ms); ES for quota usage history.
  RATIONALE: Quota check is on critical path of T181 execution start.
             Redis atomic INCR provides consistent enforcement without DB round-trips.
             ES provides trend analysis for quota tuning.
  REJECTED: Postgres for quota enforcement — too slow for burst traffic (ST-105 scenario).
  PATTERN: Redis atomic counter → enforce; ES time-series → audit/trend.
  IMPACT: CF-217, IR-181-1; ST-105 validates 1000 req/10s enforcement.

DD-98: PER-TENANT METRICS USE TIER LABELS (BOUNDED CARDINALITY)
  QUESTION: How to provide per-tenant observability without metric label explosion?
  DECISION: F495 defaults to tier/plan labels; raw tenant_id labels only for enterprise tier
             or dynamic sampling (DR-74).
  RATIONALE: Prometheus guidance: unbounded cardinality labels cause scrape/query failure.
             Tier labels (starter/growth/enterprise) provide useful signal at ~3-10 values.
  REJECTED: Raw tenant_id on all metrics — unbounded cardinality for 10,000+ tenant deployments.
  PATTERN: tier=enterprise → full per-tenant labels; tier=starter → pooled tier labels.
  IMPACT: ST-116 validates cardinality control under 10,000 concurrent tenants.
```

---

## CONCEPT MAP — FLOW-18

```
FLOW-18 CONCEPT GRAPH

  FLOW CONTROL PLANE
    ├── IFlowDefinitionRegistryService (F466) ──→ ES index + PG lineage [DD-86]
    ├── IFlowVersionService (F467) ──→ PG transactions [DD-86]
    ├── IFlowTemplateLibraryService (F468) ──→ ES search + AI suggestions
    ├── IFlowSchemaValidatorService (F469) ──→ JSON Schema 2020-12 [DD-90]
    ├── IFlowPolicyService (F470) ──→ PG + Redis cache
    └── ITriggerDefinitionService (F471) ──→ QUEUE FABRIC + PG

  FLOW EXECUTION RUNTIME
    ├── IFlowExecutionService (F472) ──→ PG state + QUEUE events [DD-87]
    ├── IStepExecutionService (F473) ──→ PG + QUEUE
    ├── IExecutionStateService (F474) ──→ PG checkpoints [DR-67, DD-95]
    ├── IHardStopApprovalService (F475) ──→ QUEUE (never HTTP) [DD-87, DR-69]
    ├── IRetrySchedulerService (F476) ──→ QUEUE + PG [DD-95]
    └── IIdempotencyService (F477) ──→ Redis fast + PG durable [DD-95]

  MULTI-TENANT IDENTITY
    ├── ITenantRegistryService (F483) ──→ PG source of truth
    ├── ITenantContextMiddlewareService (F484) ──→ CORE (single resolution) [DD-88, DR-68]
    ├── ITenantConfigService (F485) ──→ PG + Redis cache [DD-97]
    ├── IScimProvisioningService (F486) ──→ PG + QUEUE
    ├── ISamlFederationService (F487) ──→ CORE HTTP + PG
    └── IOidcTokenService (F488) ──→ CORE HTTP + PG

  TENANT DATA ISOLATION
    ├── ITenantRowLevelSecurityService (F489) ──→ PG RLS [DD-89, DR-71]
    ├── ITenantSchemaMigrationService (F490) ──→ PG expand/migrate/contract [DD-96]
    ├── ITenantQuotaService (F491) ──→ Redis fast-path + ES audit [DD-97]
    └── ITenantFeatureFlagService (F492) ──→ PG + Redis cache

  OBSERVABILITY
    ├── IExecutionAuditService (F493) ──→ PG WORM + ES search
    ├── ITraceContextService (F494) ──→ CORE OTel + W3C Trace Context [DD-91]
    ├── IPerTenantMetricsService (F495) ──→ ES time-series + tier labels [DD-98, DR-74]
    └── IExecutionEventBusService (F496) ──→ QUEUE CloudEvents 1.0 [DD-90, DR-70]

  DEVOPS INTEGRATION
    ├── IJenkinsConnectorService (F497) ──→ CORE HTTP (no SDK) [DD-94, DR-73]
    ├── IAzureDevOpsConnectorService (F498) ──→ CORE HTTP (no SDK) [DD-94]
    ├── IAgentPoolService (F499) ──→ QUEUE + PG
    ├── IPipelineTemplateService (F500) ──→ ES + AI ENGINE
    └── IApprovalGateService (F501) ──→ QUEUE + PG

  AI FLOW GENERATION
    ├── IFlowAwareAiDispatcherService (F502) ──→ AI ENGINE (blueprint routing) [DD-92]
    ├── IFlowBlueprintGeneratorService (F503) ──→ AI ENGINE + RAG FABRIC [DD-92, DD-93]
    ├── IFlowIntentRouterService (F504) ──→ AI ENGINE
    └── IStepCodeGeneratorService (F505) ──→ AI ENGINE + ES skills [DD-93]

  SCHEMA & CONTRACT
    ├── IJsonSchemaValidationService (F506) ──→ CORE ObjectProcessor
    ├── ICloudEventsEnvelopeService (F507) ──→ QUEUE CloudEvents [DD-90]
    └── IBackwardCompatibilityCheckerService (F508) ──→ ES diff analysis
```

---

## CROSS-REFERENCE INDEX — FLOW-18

| Source | Concept | Related |
|--------|---------|---------|
| 18_-_devops_platforms.md | Jenkins controller/agents → Flow Orchestrator/Skills | F478 IStepDispatcherService, F499 IAgentPoolService |
| 18_-_devops_platforms.md | Jenkins Shared Libraries → Flow Template Library | F468 IFlowTemplateLibraryService |
| 18_-_devops_platforms_deep_research_engine.md | Flow Control Plane / Data Plane split | Family 60 (Control) vs Family 61 (Execution) |
| 18_-_devops_platforms_deep_research_engine.md | Durable execution state machine | F472-F474, T181-T185 |
| 18_-_devops_platforms_deep_research_engine.md | Hard stop approval pattern | F475, T182, DR-69, CF-224 |
| 18_-_devops_platforms_deep_research_engine.md | CloudEvents 1.0 envelope | F496, F507, DR-70, CF-231 |
| 18_-_devops_platforms_deep_research_engine.md | W3C Trace Context | F494, DD-91 |
| 18_-_devops_platforms_deep_research_engine.md | OpenAPI 3.1 for APIs | Templates 36-38 DAG definitions |
| 18_-_devops_platforms_deep_research_engine_multi_tenant.md | Pool/Bridge/Silo isolation models | F483, F489, F490, T187, DD-89 |
| 18_-_devops_platforms_deep_research_engine_multi_tenant.md | Parallel change (expand/migrate/contract) | F490, T188, DD-96, CF-222 |
| 18_-_devops_platforms_deep_research_engine_multi_tenant.md | PostgreSQL RLS | F489, DR-71, CF-220 |
| 18_-_devops_platforms_deep_research_engine_multi_tenant.md | SCIM 2.0 provisioning | F486, T189 |
| 18_-_devops_platforms_deep_research_engine_multi_tenant.md | OAuth 2.0 + OIDC | F488, T189 |
| 18_-_devops_platforms_deep_research_engine_multi_tenant.md | SAML 2.0 federation | F487, T189 |
| 18_-_devops_platforms_deep_research_engine_multi_tenant.md | Per-tenant metrics cardinality | F495, DR-74, DD-98, CF-225 |
| basic_prompt.txt | Fabric-first all dependencies | All FLOW-18 factories have explicit FABRIC RESOLUTION |
| basic_prompt.txt | DNA-1 ParseDocument | Enforced in all T179-T195 iron rules |
| basic_prompt.txt | DNA-5 Scope Isolation | F484 as single tenant resolution; F489 RLS; CF-220-CF-221 |
| multi-tenant-support.md | Tenant isolation model (F461 FLOW-14) | F483 extends; CF-232 cross-flow check |
| SESSION_STATE_MERGE.md | FLOW-14 DWH connector F426 | F479 uses distinct namespace (CF-233) |
| SESSION_STATE_MERGE.md | FLOW-14 warehouse RLS F463 | F489 separate schema (CF-234) |
| SESSION_STATE_MERGE.md | FLOW-14 quota F465 | F491 separate domain (CF-235) |
| SESSION_STATE_MERGE.md | FLOW-14 audit F459 | F493 separate audit store (CF-236) |

---
## SAVE POINT: FLOW18:UNIFIED_SOURCE_INDEX ✅
## Next: FLOW18_SKILLS_FACTORY_RAG.md
## Recovery: "Load FLOW18 source index — DD-86-DD-98, concept maps, cross-references"
