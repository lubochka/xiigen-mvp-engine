# XIIGen — FLOW-14 PHASE 4: TASK TYPES T173–T178 + TEMPLATES 33–35
# Merged: 2026-02-26 | Source: FLOW14_PLAN_P0.md Phase P4
# Adds: T173–T178 (6 engine contracts, 48 IRs, 36 QGs), Templates 33–35 (3 DAGs)
# Depends on: P1 (F426-F443), P2 (F444-F465, DR-58-65), P3 (T167-T172)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Extends: T1–T172 | Adds: T173–T178 (6 engine contracts)
## New archetypes introduced: MODELING (T173, T174), ACTIVATION (T177)
## Existing archetypes reused: JOIN_GATE (T175), ORCHESTRATION (T176), PROVISIONING (T178)
## Backward compatibility: T1–T172 UNCHANGED

---

## TASK TYPE: T173 — Dimension/Fact Refresh Cycle
```
ARCHETYPE:  MODELING
ENTRY:      Fires on staging.written event from QUEUE FABRIC (emitted by F444 after staging
            upsert). Also triggered on schedule (nightly full refresh) or by F441 replay.
PURPOSE:    Load staging records into the warehouse core model (Gold zone). SCD Type 2
            dimension versioning: detect attribute changes → close old dim version → insert
            new version. Fact append: resolve dimension surrogate keys via point-in-time
            lookup → append fact record. Capture daily snapshots for trend analysis.
DISTINCT FROM: T174 (Mart Build & KPI Refresh — aggregates core into marts; T173 loads core FROM staging)
               T171 (Raw-to-Staging Transform — transforms raw into staging; T173 models staging into core)
               T160 (FLOW-13 Period Close Orchestrator — finance-specific close cycle;
               T173 is warehouse-generic dimensional modeling)

FACTORY DEPENDENCIES:
  F444: IStagingWriterService            — read staging records (source of truth for core load)
  F449: IDimensionLoaderService          — SCD-2 dimension load + version management
  F450: IFactWriterService               — append-only fact write + dimension FK resolution
  F452: ISnapshotService                 — daily pipeline/WIP/backlog snapshots
  F460: ILineageTrackerService           — record Zone 2→3 lineage edges

FABRIC RESOLUTION:
  F444 → DATABASE FABRIC (Skill 05) → PostgreSQL (staging schema — read)
  F449 → DATABASE FABRIC (Skill 05) → PostgreSQL (warehouse dims schema)
         + QUEUE FABRIC (Skill 04) → Redis Streams (dim.loaded, dim.version_created)
  F450 → DATABASE FABRIC (Skill 05) → PostgreSQL (warehouse facts schema)
         + QUEUE FABRIC (Skill 04) → Redis Streams (fact.written)
  F452 → DATABASE FABRIC (Skill 05) → PostgreSQL (warehouse snapshots schema)
  F460 → DATABASE FABRIC (Skill 05) → Elasticsearch (lineage_graph index)

AF CONFIGURATION:
  AF-1 Genesis:     Generates DimensionFactRefreshService extending MicroserviceBase
  AF-2 Planning:    Decomposes into: read-staging-batch → detect-dim-changes → close-old-versions →
                    insert-new-dim-versions → resolve-surrogate-keys → append-facts →
                    capture-snapshots → record-lineage
  AF-3 Prompt Lib:  Retrieves "scd-type-2-dimension-load", "fact-append-with-surrogate-keys",
                    "point-in-time-dimension-lookup", "daily-snapshot-capture"
  AF-4 RAG:         Searches SK-95 (SCD Type 2 Dimension Loader), SK-92 (Multi-Zone Pipeline)
  AF-5 Multi-model: Parallel: Claude (SCD-2 logic) + GPT (surrogate key resolution)
  AF-6 Code Review: SCD-2 effective_start/end correctness, surrogate key integrity, snapshot idempotency
  AF-7 Compliance:  DNA-1–DNA-9; verifies dims NEVER updated (insert new version only — DR-62),
                    facts append-only, all records Dictionary<string,object>
  AF-8 Security:    No cross-tenant dim/fact access, tenantId on every operation
  AF-9 Judge:       Validates IR-173-1 through IR-173-8 + QG-173-1 through QG-173-6
  AF-10 Merge:      Selects best SCD-2 change detection strategy
  AF-11 Feedback:   Stores dim version creation rate, fact append throughput, snapshot consistency

BFA VALIDATION:
  CF-192: Zone promotion — staging (Zone 2) → core (Zone 3). No skip.
  CF-196: Fact append-only — fact records never updated or deleted
  CF-207: PII awareness — core records carry PII flags from staging for downstream mart masking
  CF-208: FLOW-13 finance integration — if tenant has FLOW-13, dim_account links to F399 customer data

MACHINE/FREEDOM:
  MACHINE:  SCD-2 change detection (attribute-by-attribute comparison), version close logic
            (effective_end = now() - 1ms), surrogate key generation (bigint sequence),
            point-in-time lookup (businessKey + asOfDate → surrogate), fact immutability
  FREEDOM:  Dimension types enabled per tenant, attribute change sensitivity (ignore vs track),
            snapshot schedule (daily/weekly), snapshot types enabled, batch size,
            dim_date range (start/end year)

IRON RULES (IR-173-1 to IR-173-8):
  IR-173-1: Dimension records MUST use SCD-2 — NEVER UpdateDocument on dim tables (DR-62)
  IR-173-2: Fact records MUST be append-only — NEVER update or delete existing facts
  IR-173-3: Surrogate key resolution MUST use point-in-time lookup (businessKey + eventTimestamp)
  IR-173-4: tenantId MUST appear on every dim/fact operation (DNA-5)
  IR-173-5: All dim/fact records stored as Dictionary<string,object> — no typed warehouse models (DNA-1)
  IR-173-6: Lineage edge MUST be recorded in F460 for every staging→core transformation
  IR-173-7: Snapshot capture MUST be idempotent — same date produces same snapshot (deduplicated)
  IR-173-8: DataProcessResult<T> on all paths — dim/fact failures wrapped, never thrown (DNA-3)

QUALITY GATES (QG-173-1 to QG-173-6):
  QG-173-1: SCD-2 version chain: only ONE dim version per businessKey has effective_end = null (current)
  QG-173-2: Fact dimension FKs all resolve to valid surrogate keys — no orphaned FKs
  QG-173-3: Dim version count monotonically increases (new versions, never deletes)
  QG-173-4: BuildSearchFilter skips empty fields on staging reads and dim lookups (DNA-2)
  QG-173-5: Snapshot for same date + type + tenant is idempotent — no duplicate snapshots
  QG-173-6: Lineage graph shows complete staging → dim + staging → fact transformation chain
```

---

## TASK TYPE: T174 — Mart Build & KPI Refresh
```
ARCHETYPE:  MODELING
ENTRY:      Fires on dim.loaded + fact.written events from QUEUE FABRIC (emitted by T173).
            Also triggered on schedule (daily mart refresh) or manual "refresh mart" command.
PURPOSE:    Build business-facing aggregate marts from core dims/facts. Four standard marts:
            Delivery (cycle time, throughput), Sales (pipeline, win rate), Finance (profitability),
            Support (SLA, resolution). PII classification gate (DR-63) enforced before mart write.
            KPI definitions refreshed from F454 metric registry; semantic cache invalidated.
DISTINCT FROM: T173 (Dim/Fact Refresh — loads core model; T174 aggregates core into marts)
               T176 (Cross-Flow Analytics Gate — joins across flows; T174 aggregates within warehouse)
               T165 (FLOW-13 Project Milestone Billing Gate — finance-specific; T174 is analytics-generic)

FACTORY DEPENDENCIES:
  F449: IDimensionLoaderService          — read current dim records for mart joins
  F450: IFactWriterService               — read facts for mart aggregation
  F451: IMartBuilderService              — build/refresh mart aggregations
  F454: IMetricDefinitionService         — KPI definitions for computation
  F455: ISemanticQueryService            — invalidate + warm semantic cache
  F462: IPiiClassificationService        — PII gate before mart write (DR-63)
  F460: ILineageTrackerService           — record Zone 3→4 lineage edges

FABRIC RESOLUTION:
  F449 → DATABASE FABRIC (Skill 05) → PostgreSQL (dims — read)
  F450 → DATABASE FABRIC (Skill 05) → PostgreSQL (facts — read)
  F451 → DATABASE FABRIC (Skill 05) → PostgreSQL (marts schema — write)
         + QUEUE FABRIC (Skill 04) → Redis Streams (mart.refreshed event)
  F454 → DATABASE FABRIC (Skill 05) → Elasticsearch (metric_definitions — read)
  F455 → DATABASE FABRIC (Skill 05) → Redis (semantic cache — invalidate + warm)
  F462 → AI ENGINE FABRIC (Skill 07) → AiDispatcher (PII detection)
         + DATABASE FABRIC (Skill 05) → Elasticsearch (pii_rules)
  F460 → DATABASE FABRIC (Skill 05) → Elasticsearch (lineage_graph)

AF CONFIGURATION:
  AF-1 Genesis:     Generates MartBuildKpiRefreshService extending MicroserviceBase
  AF-2 Planning:    Decomposes into: load-metric-defs → read-core-data → classify-PII →
                    mask-PII-fields → build-mart-aggregation → validate-integrity →
                    refresh-KPI-cache → record-lineage
  AF-3 Prompt Lib:  Retrieves "mart-aggregation-pattern", "kpi-computation", "pii-masking-at-boundary"
  AF-4 RAG:         Searches SK-92 (Multi-Zone Pipeline), SK-96 (KPI Registry + Semantic Query),
                    SK-95 (SCD-2 for dim joins)
  AF-5 Multi-model: Parallel: Claude (mart SQL generation) + GPT (PII classification review)
  AF-6 Code Review: Mart aggregation correctness (group-by alignment), PII masking completeness,
                    cache invalidation race conditions, incremental refresh boundary correctness
  AF-7 Compliance:  DNA-1–DNA-9; verifies DR-63 (PII before mart), DR-60 (only approved schema fields)
  AF-8 Security:    PII fields masked before mart write, no unclassified fields in mart layer
  AF-9 Judge:       Validates IR-174-1 through IR-174-8 + QG-174-1 through QG-174-6
  AF-10 Merge:      Selects best mart aggregation strategy (incremental vs full rebuild)
  AF-11 Feedback:   Stores mart refresh duration, PII classification coverage, cache hit ratio

BFA VALIDATION:
  CF-192: Zone promotion — core (Zone 3) → mart (Zone 4). No skip.
  CF-197: Mart dependency — mart MUST NOT reference raw or staging directly (only via core)
  CF-207: PII classification MUST pass before mart write (DR-63)
  CF-208: FLOW-13 finance integration — finance mart can consume FLOW-13 fact data if enabled

MACHINE/FREEDOM:
  MACHINE:  Mart aggregation SQL generation from metric definitions, PII classification gate
            enforcement, cache invalidation on mart refresh, incremental refresh boundary
            calculation (sinceTimestamp), lineage recording
  FREEDOM:  Mart types enabled per tenant, refresh schedule (hourly/daily/weekly),
            aggregation grain (daily/weekly/monthly), PII masking rules per mart per tenant,
            KPI formula definitions, semantic cache TTL, mart retention period

IRON RULES (IR-174-1 to IR-174-8):
  IR-174-1: PII classification (F462) MUST complete before ANY mart record is written (DR-63)
  IR-174-2: Mart records MUST only reference approved schema fields (DR-60) — drift-blocked fields excluded
  IR-174-3: Mart aggregation MUST read from core dims/facts ONLY — never raw or staging directly (CF-197)
  IR-174-4: tenantId MUST appear on every mart read/write (DNA-5)
  IR-174-5: All mart records stored as Dictionary<string,object> — no typed mart models (DNA-1)
  IR-174-6: Semantic cache MUST be invalidated when mart data changes — stale KPIs = violation
  IR-174-7: Lineage edge MUST be recorded in F460 for every core→mart transformation
  IR-174-8: DataProcessResult<T> on all paths — mart build failures wrapped, never thrown (DNA-3)

QUALITY GATES (QG-174-1 to QG-174-6):
  QG-174-1: PII fields correctly masked in mart output — AF-8 verifies no raw PII in mart
  QG-174-2: Mart record counts reconcile with core fact counts (within aggregation tolerance)
  QG-174-3: KPI computation matches metric definition formula — AF-9 validates SQL vs definition
  QG-174-4: Incremental refresh covers all facts since last refresh — no gaps
  QG-174-5: Semantic cache correctly invalidated and warmed after refresh — query returns fresh data
  QG-174-6: Finance mart integrates FLOW-13 data when tenant has FLOW-13 enabled (CF-208 verified)
```

---

## TASK TYPE: T175 — Cross-System Identity Join
```
ARCHETYPE:  JOIN_GATE
ENTRY:      Fires during T171 (Raw-to-Staging Transform) when new entities are detected,
            OR on schedule (weekly identity reconciliation), OR manually via admin trigger.
PURPOSE:    Execute probabilistic cross-system identity matching: ClickUp users ↔ Zoho CRM
            contacts ↔ Zoho Desk agents ↔ internal user records. Uses multiple scoring
            signals via RAG FABRIC (Hybrid strategy). High-confidence matches auto-merge
            into unified dim_user record. Low-confidence matches queued for human review.
DISTINCT FROM: T40 (Three-Way Join Gate — deterministic merge of three streams; T175 is
               probabilistic scoring across systems)
               T171 (Raw-to-Staging Transform — calls T175 for identity resolution during transform;
               T175 is the dedicated identity matching engine with review workflow)
               T87 (prior JOIN_GATE with probabilistic scoring — if exists; T175 is warehouse-specific)

FACTORY DEPENDENCIES:
  F440: ISourceObjectMapService          — cross-system ID mappings
  F446: IIdentityResolutionService       — probabilistic scoring + match/review workflow
  F449: IDimensionLoaderService          — update dim_user with unified entity on match
  F459: IWarehouseAuditService           — audit trail for all identity decisions

FABRIC RESOLUTION:
  F440 → DATABASE FABRIC (Skill 05) → PostgreSQL (source_object_map)
  F446 → DATABASE FABRIC (Skill 05) → PostgreSQL (identity_resolution table)
         + RAG FABRIC (Skill 00b) → Hybrid strategy (vector + graph)
         + QUEUE FABRIC (Skill 04) → Redis Streams (identity.matched, identity.review_needed)
  F449 → DATABASE FABRIC (Skill 05) → PostgreSQL (dim_user — SCD-2 update)
  F459 → DATABASE FABRIC (Skill 05) → PostgreSQL (WORM audit) + Elasticsearch (audit search)

AF CONFIGURATION:
  AF-1 Genesis:     Generates CrossSystemIdentityJoinService extending MicroserviceBase
  AF-2 Planning:    Decomposes into: collect-unmatched-entities → generate-candidates (RAG) →
                    score-candidates → classify (auto-merge / review / reject) →
                    merge-or-queue → update-dim-user → audit-decisions
  AF-3 Prompt Lib:  Retrieves "probabilistic-identity-resolution", "rag-hybrid-scoring",
                    "scd2-identity-merge"
  AF-4 RAG:         Searches SK-94 (Probabilistic Cross-System Identity Resolution),
                    SK-95 (SCD-2 Dimension Loader), SK-92 (Multi-Zone Pipeline)
  AF-5 Multi-model: Parallel: Claude (scoring formula) + Gemini (candidate retrieval optimization)
  AF-6 Code Review: Cross-tenant isolation in candidate search, confidence score calibration,
                    false positive impact on dim_user integrity, merge conflict resolution
  AF-7 Compliance:  DNA-1–DNA-9; verifies CF-204 (no cross-tenant join), DR-61 (probabilistic scoring)
  AF-8 Security:    PII handled in identity matching (names, emails), no PII in review queue display
                    without masking, tenantId isolation in RAG vector search
  AF-9 Judge:       Validates IR-175-1 through IR-175-8 + QG-175-1 through QG-175-6
  AF-10 Merge:      Selects best scoring weights from multi-model competition
  AF-11 Feedback:   Stores match accuracy, false positive rate, human review approval rate

BFA VALIDATION:
  CF-204: Identity resolution MUST NOT join cross-tenant records — absolute violation
  CF-200: Identity service vs FLOW-01 user service — different identity planes (external vs internal);
          when internal user exists, match adds external source ID to existing dim_user, not duplicate
  CF-207: PII in identity fields — matched identities carry PII classification flags

MACHINE/FREEDOM:
  MACHINE:  Scoring formula: weighted sum of signals (email_exact: 0.40, email_domain: 0.10,
            name_fuzzy: 0.20, org_membership: 0.15, temporal_overlap: 0.10, manual_override: 0.05),
            classification logic (score >= threshold → auto-merge, else → review queue),
            dim_user SCD-2 merge (create new version with unified attributes)
  FREEDOM:  Signal weights (admin-tunable per tenant), auto-merge threshold (default 0.85),
            candidate retrieval limit, review queue TTL, scoring model selection,
            reconciliation schedule

IRON RULES (IR-175-1 to IR-175-8):
  IR-175-1: Identity resolution MUST NOT join records across different tenantIds (CF-204) — BUILD FAILURE
  IR-175-2: All match decisions MUST be audited in F459 (actor, entities, score, decision, timestamp)
  IR-175-3: Auto-merge threshold MUST come from FREEDOM config — never hardcoded (DR-61)
  IR-175-4: Merged dim_user MUST use SCD-2: new version with merged attributes (DR-62)
  IR-175-5: tenantId MUST appear on every candidate search and scoring query (DNA-5)
  IR-175-6: All identity records stored as Dictionary<string,object> — no typed identity models (DNA-1)
  IR-175-7: Low-confidence matches MUST route to review queue — never auto-rejected without review
  IR-175-8: Provenance tracking: merged dim_user record MUST record which field came from which system

QUALITY GATES (QG-175-1 to QG-175-6):
  QG-175-1: Cross-tenant candidate search returns zero results — isolation verified by AF-8
  QG-175-2: Every match produces a confidence score — never binary match/no-match
  QG-175-3: Auto-merged dim_user record preserves provenance for all merged attributes
  QG-175-4: Review queue items include masked identity context + match score + contributing signals
  QG-175-5: DataProcessResult<T> on all paths — identity failures wrapped, never thrown (DNA-3)
  QG-175-6: Reconciliation run on same data produces identical results — deterministic scoring
```

---

## TASK TYPE: T176 — Cross-Flow Analytics Gate
```
ARCHETYPE:  ORCHESTRATION
ENTRY:      Fires on mart.refreshed events from QUEUE FABRIC (emitted by T174) when
            multiple mart types are available. Also triggered on schedule (weekly cross-flow
            analytics) or manually via admin. Requires minimum 2 mart types populated.
PURPOSE:    Join data across warehouse marts to produce the three business flows described
            in the specification: Lead→Delivery (Sales→Work), Plan→Profit (Work→Finance),
            Support→Resolution (Support→Work). These cross-flow joins produce composite
            analytics that no single mart can provide alone.
DISTINCT FROM: T174 (Mart Build — builds individual marts; T176 joins across marts)
               T160 (FLOW-13 Period Close — finance-specific orchestration; T176 is analytics)
               T40 (Three-Way Join Gate — merges data streams; T176 joins analytical marts)

FACTORY DEPENDENCIES:
  F451: IMartBuilderService              — read mart data for cross-flow joins
  F450: IFactWriterService               — write cross-flow composite facts
  F455: ISemanticQueryService            — execute cross-mart KPI queries
  F460: ILineageTrackerService           — record cross-flow lineage

FABRIC RESOLUTION:
  F451 → DATABASE FABRIC (Skill 05) → PostgreSQL (marts — read)
  F450 → DATABASE FABRIC (Skill 05) → PostgreSQL (cross-flow facts — write)
  F455 → DATABASE FABRIC (Skill 05) → PostgreSQL (mart queries) + Redis (semantic cache)
  F460 → DATABASE FABRIC (Skill 05) → Elasticsearch (lineage_graph)

AF CONFIGURATION:
  AF-1 Genesis:     Generates CrossFlowAnalyticsService extending MicroserviceBase
  AF-2 Planning:    Decomposes into: check-mart-availability → lead-to-delivery-join →
                    plan-to-profit-join → support-to-resolution-join → write-composite-facts →
                    refresh-cross-flow-KPIs → record-lineage
  AF-3 Prompt Lib:  Retrieves "cross-flow-analytics", "multi-mart-join", "composite-kpi-computation"
  AF-4 RAG:         Searches SK-96 (KPI Registry + Semantic Query), SK-92 (Multi-Zone Pipeline)
  AF-5 Multi-model: Parallel: Claude (join SQL) + GPT (KPI formula validation)
  AF-6 Code Review: Join correctness (shared dim keys), null handling for missing mart data,
                    partial mart availability (graceful degradation)
  AF-7 Compliance:  DNA-1–DNA-9; verifies cross-flow facts append-only, tenantId everywhere
  AF-8 Security:    No cross-tenant mart joins, PII already masked in mart layer (DR-63)
  AF-9 Judge:       Validates IR-176-1 through IR-176-8 + QG-176-1 through QG-176-6
  AF-10 Merge:      Selects best join strategy for each business flow
  AF-11 Feedback:   Stores cross-flow join match rate, composite KPI coverage

BFA VALIDATION:
  CF-197: Mart dependency chain — cross-flow reads from marts only, never raw/staging/core directly
  CF-201: Cross-flow vs FLOW-10 commerce data — if tenant uses FLOW-10, commerce mart available for join
  CF-208: Cross-flow vs FLOW-13 finance data — finance mart consumes FLOW-13 GL data when enabled

MACHINE/FREEDOM:
  MACHINE:  Cross-flow join logic:
            Lead→Delivery: Sales mart (dim_account, deal_won_date) JOIN Delivery mart (dim_project,
            project_start_date) ON dim_account.businessKey → handover_velocity = start_date - won_date
            Plan→Profit: Delivery mart (dim_project, time_cost) JOIN Sales mart (deal_value)
            → profitability = (deal_value - time_cost) / deal_value
            Support→Resolution: Support mart (dim_account, ticket_count) JOIN Delivery mart
            (dim_project, feature_id) → feature_support_load = tickets per feature
  FREEDOM:  Business flows enabled per tenant, join keys configuration, composite KPI formulas,
            minimum mart types required for join (default 2), graceful degradation policy
            (skip unavailable marts vs fail)

IRON RULES (IR-176-1 to IR-176-8):
  IR-176-1: Cross-flow joins MUST read from mart layer ONLY — never raw/staging/core (CF-197)
  IR-176-2: tenantId MUST appear on every mart read and composite fact write (DNA-5)
  IR-176-3: Composite facts MUST be append-only — same pattern as core facts (CF-196)
  IR-176-4: All composite records stored as Dictionary<string,object> — no typed models (DNA-1)
  IR-176-5: If required mart is unavailable, graceful degradation — DataProcessResult.Partial, not failure
  IR-176-6: Lineage MUST record which marts contributed to each composite fact (F460)
  IR-176-7: Cross-flow KPIs MUST reference definitions from F454 — no hardcoded formulas
  IR-176-8: DataProcessResult<T> on all paths — join failures wrapped, never thrown (DNA-3)

QUALITY GATES (QG-176-1 to QG-176-6):
  QG-176-1: Lead→Delivery join produces handover_velocity for all accounts with both deal and project
  QG-176-2: Plan→Profit join produces profitability for all projects with both time and deal data
  QG-176-3: Support→Resolution join produces feature_support_load where ticket+feature data exists
  QG-176-4: Graceful degradation verified: missing mart → partial result, not failure
  QG-176-5: Composite KPI values match metric definitions from F454
  QG-176-6: No cross-tenant data in any join result — isolation verified by AF-8
```

---

## TASK TYPE: T177 — Reverse ETL Activation Gate
```
ARCHETYPE:  ACTIVATION
ENTRY:      Fires on mart.refreshed + cross-flow KPI computed events (from T174/T176).
            F456 IReverseEtlService evaluates thresholds against KPI results. Threshold
            breach → activation event published to QUEUE FABRIC.
PURPOSE:    Push computed insights back to external SaaS platforms (reverse ETL). When a
            KPI crosses a configured threshold, trigger an action in the source system:
            create ClickUp task, update Zoho CRM deal field, change Zoho Desk priority.
            All outbound pushes go through QUEUE FABRIC (DR-64), never direct HTTP.
DISTINCT FROM: T169 (Webhook Ingestion — inbound from external SaaS; T177 is outbound TO external SaaS)
               T168 (Incremental Sync — inbound polling; T177 is outbound push)
               T88 (if prior ACTIVATION archetype existed — T177 is warehouse-specific with KPI triggers)

FACTORY DEPENDENCIES:
  F427: ICredentialVaultService          — OAuth tokens for external API writes
  F430: IRateLimitGuardService           — rate limit before external push
  F434: IApiPollingService               — reused for external API write calls (HTTP PUT/POST)
  F456: IReverseEtlService              — threshold evaluation + activation dispatch
  F459: IWarehouseAuditService           — audit every outbound push

FABRIC RESOLUTION:
  F427 → DATABASE FABRIC (Skill 05) → PostgreSQL (credential vault — read)
  F430 → CORE FABRIC (Skill 01 — cache) → Redis (rate limit)
  F434 → CORE FABRIC (Skill 01 — MicroserviceBase HTTP) — reused for outbound API calls
  F456 → QUEUE FABRIC (Skill 04) → Redis Streams (activation.triggered/completed/failed)
         + DATABASE FABRIC (Skill 05) → PostgreSQL (activation job state)
  F459 → DATABASE FABRIC (Skill 05) → PostgreSQL (WORM audit)

AF CONFIGURATION:
  AF-1 Genesis:     Generates ReverseEtlActivationService extending MicroserviceBase
  AF-2 Planning:    Decomposes into: evaluate-thresholds → filter-triggered → check-cooldown →
                    publish-activation-event → [consumer]: rate-limit-check → fetch-credential →
                    build-API-request → execute-push → log-audit → ack-or-DLQ
  AF-3 Prompt Lib:  Retrieves "reverse-etl-activation", "threshold-evaluation",
                    "external-api-write-pattern"
  AF-4 RAG:         Searches SK-97 (Reverse ETL with Threshold Activation), SK-89 (OAuth Lifecycle),
                    SK-90 (API Polling — reused for write calls)
  AF-5 Multi-model: Parallel: Claude (threshold logic) + GPT (external API contract generation)
  AF-6 Code Review: Idempotency of external pushes, cooldown enforcement, DLQ handling,
                    rate limit integration, credential refresh during long activation batches
  AF-7 Compliance:  DNA-1–DNA-9; verifies DR-64 (event-based, never direct HTTP), no provider SDK
  AF-8 Security:    Credential from vault only, TLS on external calls, no PII in activation payload
                    without tenant consent, audit before push
  AF-9 Judge:       Validates IR-177-1 through IR-177-8 + QG-177-1 through QG-177-6
  AF-10 Merge:      Selects best threshold evaluation and cooldown strategy
  AF-11 Feedback:   Stores activation success rate, external API response times, cooldown effectiveness

BFA VALIDATION:
  CF-210: Rate limit MUST be checked before every outbound API call
  CF-213: Reverse ETL MUST NOT push to locked records/periods (FLOW-13 fiscal locks)
  CF-204: Activation scoped to tenant — never push data to another tenant's external system

MACHINE/FREEDOM:
  MACHINE:  Threshold evaluation (metric_value [operator] threshold_value), cooldown enforcement
            (last_triggered_at + cooldown_minutes > now → skip), idempotency key per activation
            (tenantId.metricId.thresholdId.date), QUEUE FABRIC event publishing
  FREEDOM:  Activation definitions: { metricId, operator (>, <, ==, >=, <=), threshold,
            targetProvider (clickup/zoho_crm/zoho_desk), targetAction (create_task, update_field,
            send_notification, change_priority), cooldownMinutes, enabled },
            activation batch size, DLQ retry limit, target API endpoint patterns per provider

IRON RULES (IR-177-1 to IR-177-8):
  IR-177-1: Outbound push MUST go through QUEUE FABRIC as event — NEVER direct HTTP (DR-64)
  IR-177-2: Rate limit (F430.CheckAsync) MUST pass before every external API call (CF-210)
  IR-177-3: Credentials MUST come from F427 vault — never hardcoded or cached outside vault
  IR-177-4: CF-213: MUST NOT push to records in locked fiscal periods (FLOW-13 integration)
  IR-177-5: Cooldown MUST be enforced — repeated threshold breaches within cooldown = skip
  IR-177-6: Idempotency key MUST be on every activation event — duplicate pushes prevented
  IR-177-7: Audit record MUST be written to F459 BEFORE external API call executes
  IR-177-8: Provider SDK MUST NOT be imported — external calls via CORE FABRIC HTTP (F434 reuse)

QUALITY GATES (QG-177-1 to QG-177-6):
  QG-177-1: Threshold breach correctly detected — metric value crosses configured boundary
  QG-177-2: Cooldown prevents rapid-fire triggers — same metric+threshold only once per cooldown window
  QG-177-3: Activation event reaches external API and receives success response
  QG-177-4: Failed pushes route to DLQ with full context (tenantId, activation, error, retry count)
  QG-177-5: DataProcessResult<T> on all paths — activation failures wrapped, never thrown (DNA-3)
  QG-177-6: Audit trail shows complete activation history: threshold → event → push → result
```

---

## TASK TYPE: T178 — Warehouse Tenant Provision Gate
```
ARCHETYPE:  PROVISIONING
ENTRY:      Fires when a tenant is onboarded to the warehouse module OR when admin requests
            warehouse provisioning via DynamicController. Also fires when isolation tier
            upgrade requested (pool→bridge→silo). Consumes tenant context from FLOW-08.
PURPOSE:    Provision the warehouse infrastructure for a new tenant: create zone-specific
            isolation (raw/staging/core/mart per DR-65), generate RLS policies, set quotas,
            configure retention policies, seed dim_date, and run smoke tests. Zero code
            changes between pool/bridge/silo — fabric handles routing.
DISTINCT FROM: T166 (FLOW-13 Tenant Finance Provision — provisions finance isolation;
               T178 provisions warehouse zone isolation)
               T167 (Connector Registration — provisions a connector; T178 provisions the
               warehouse storage that connectors feed into)

FACTORY DEPENDENCIES:
  F453: IRetentionPolicyService          — set default retention per zone
  F461: ITenantWarehouseIsolationService — set isolation tier per zone
  F463: IRowLevelSecurityService         — create RLS policies per zone
  F465: IWarehouseQuotaService           — set quota limits per tenant tier
  F449: IDimensionLoaderService          — seed dim_date for new tenant

FABRIC RESOLUTION:
  F453 → DATABASE FABRIC (Skill 05) → PostgreSQL (retention policy config)
  F461 → CORE FABRIC (Skill 01 — MicroserviceBase + Config)
         + MULTI-TENANT ISOLATION FABRIC (Skill 11)
  F463 → DATABASE FABRIC (Skill 05) → PostgreSQL (RLS policy management)
  F465 → DATABASE FABRIC (Skill 05) → Redis (quota counters)
  F449 → DATABASE FABRIC (Skill 05) → PostgreSQL (dim_date seed)

AF CONFIGURATION:
  AF-1 Genesis:     Generates WarehouseTenantProvisionService extending MicroserviceBase
  AF-2 Planning:    Decomposes into: validate-tenant-context → set-isolation-tier-per-zone →
                    create-schemas/indices → create-RLS-policies → set-quotas →
                    set-retention-policies → seed-dim-date → run-smoke-tests → mark-active
  AF-3 Prompt Lib:  Retrieves "warehouse-tenant-provisioning", "rls-policy-generation",
                    "zone-isolation-pattern"
  AF-4 RAG:         Searches SK-92 (Multi-Zone Pipeline), SK-95 (SCD-2 Dimension Loader — for dim_date)
  AF-5 Multi-model: Parallel: Claude (provision orchestration) + GPT (RLS policy generation)
  AF-6 Code Review: RLS policy correctness, quota initialization, isolation tier validation,
                    idempotent re-provisioning, smoke test completeness
  AF-7 Compliance:  DNA-1–DNA-9; verifies DR-65 (zone-level isolation), no cross-tenant leakage
  AF-8 Security:    RLS policies prevent cross-tenant access, quotas prevent resource exhaustion,
                    isolation validated via smoke test (attempt cross-tenant read → zero rows)
  AF-9 Judge:       Validates IR-178-1 through IR-178-8 + QG-178-1 through QG-178-6
  AF-10 Merge:      Selects best provisioning strategy for each isolation tier
  AF-11 Feedback:   Stores provisioning success rate, smoke test pass rate, provision duration

BFA VALIDATION:
  CF-204: No cross-tenant data bleed during provisioning — smoke test validates
  CF-205: Warehouse schema isolation — bridge/silo tenants get dedicated schemas/databases
  CF-206: RLS policy per zone per tenant — pool tenants get RLS, bridge/silo get schema isolation
  CF-199: Warehouse provision vs FLOW-13 finance provision — compatible tier models (DR-65 ↔ DR-56)

MACHINE/FREEDOM:
  MACHINE:  RLS SQL generation (CREATE POLICY, ALTER TABLE ENABLE ROW LEVEL SECURITY),
            schema creation for bridge (CREATE SCHEMA tenant_{id}_{zone}),
            index creation for silo (raw_{tenantId}_{provider}_{entity}_YYYYMM),
            smoke test (cross-tenant read attempt → must return zero rows),
            dim_date seed (10-year range pre-populated)
  FREEDOM:  Isolation tier per zone per tenant (matrix), quota limits per tenant tier
            (free/standard/enterprise), retention days per zone, dim_date year range,
            auto-graduation thresholds (data volume → upgrade tier), provisioning template

IRON RULES (IR-178-1 to IR-178-8):
  IR-178-1: Isolation tier MUST be set for EVERY zone before any warehouse data operation (DR-65)
  IR-178-2: RLS policies MUST be created for pool-tier zones — no unprotected tables
  IR-178-3: Quotas MUST be set before warehouse is marked ACTIVE — prevent unbounded usage
  IR-178-4: Retention policies MUST be set per zone before ACTIVE — prevent unbounded storage growth
  IR-178-5: dim_date MUST be seeded before any fact write (facts reference dim_date FK)
  IR-178-6: Smoke test MUST pass — cross-tenant read returns zero rows — before ACTIVE
  IR-178-7: Provisioning MUST be idempotent — re-provisioning same tenant = no-op, no duplicate schemas
  IR-178-8: Provisioning event MUST be emitted to QUEUE FABRIC on completion

QUALITY GATES (QG-178-1 to QG-178-6):
  QG-178-1: RLS policies correctly generated — AF-8 validates SQL syntax
  QG-178-2: Smoke test: cross-tenant query returns zero rows for ALL zone tables
  QG-178-3: Quota counters initialized in Redis for all quota types
  QG-178-4: dim_date has 10 years of records (365×10 = 3,650+ rows)
  QG-178-5: DataProcessResult<T> on all paths — provision failure must not leave partial config (DNA-3)
  QG-178-6: Re-provisioning same tenant produces no changes — idempotency verified (IR-178-7)
```

---

## TASK TYPE SUMMARY — FLOW-14 T167–T178

| Task Type | Name | Archetype | Key Factories | Phase |
|---|---|---|---|---|
| T167 | Connector Registration Gate | PROVISIONING | F426, F427, F428, F430, F431 | P3 |
| T168 | Incremental Sync Orchestrator | DURABLE_SAGA | F430, F432, F433, F434, F437, F438 | P3 |
| T169 | Webhook Ingestion Gate | INGESTION | F429, F435, F438, F440 | P3 |
| T170 | Backfill Saga | DURABLE_SAGA | F430, F434, F436, F437, F438 | P3 |
| T171 | Raw-to-Staging Transform | TRANSFORM | F438, F442–F448 | P3 |
| T172 | Schema Drift Detection Gate | VALIDATION | F438, F439, F443, F445, F458 | P3 |
| **T173** | **Dimension/Fact Refresh Cycle** | **MODELING** | **F444, F449, F450, F452, F460** | **P4** |
| **T174** | **Mart Build & KPI Refresh** | **MODELING** | **F449–F451, F454–F455, F460, F462** | **P4** |
| **T175** | **Cross-System Identity Join** | **JOIN_GATE** | **F440, F446, F449, F459** | **P4** |
| **T176** | **Cross-Flow Analytics Gate** | **ORCHESTRATION** | **F450, F451, F455, F460** | **P4** |
| **T177** | **Reverse ETL Activation Gate** | **ACTIVATION** | **F427, F430, F434, F456, F459** | **P4** |
| **T178** | **Warehouse Tenant Provision Gate** | **PROVISIONING** | **F449, F453, F461, F463, F465** | **P4** |

---

## FLOW TEMPLATES 33–35 (DAG JSON Definitions)

### FLOW TEMPLATE 33 — ingest-pipeline-v1

```
FLOW: FLOW-14
TEMPLATE: 33
VERSION: 1.0.0
DESCRIPTION: Data Warehouse Ingestion Pipeline — Connect, Poll, Webhook, Backfill → Raw Zone
ORCHESTRATOR: IFlowOrchestrator (Skill 09)
ENTRY_EVENT: WarehouseIngestionRequested
TENANT_SCOPED: true
```

```json
{
  "flowId": "flow-14-ingest",
  "templateId": 33,
  "version": "1.0.0",
  "description": "Data Warehouse Ingestion Pipeline — connect → poll → webhook → backfill → raw",
  "entryEvent": "WarehouseIngestionRequested",
  "tenantScoped": true,
  "steps": [
    {
      "stepId": "step-route",
      "taskType": "ROUTE",
      "description": "Route to ingestion sub-flow based on ingestType",
      "conditions": [
        {"if": "event.ingestType == 'REGISTER_CONNECTOR'", "goto": "step-register"},
        {"if": "event.ingestType == 'INCREMENTAL_SYNC'", "goto": "step-sync"},
        {"if": "event.ingestType == 'WEBHOOK'", "goto": "step-webhook"},
        {"if": "event.ingestType == 'BACKFILL'", "goto": "step-backfill"}
      ]
    },
    {
      "stepId": "step-register",
      "taskType": "T167",
      "description": "Connector Registration — OAuth + vault + health probe",
      "factories": ["F426","F427","F428","F430","F431"],
      "onSuccess": "step-init-sync",
      "onFailure": "DEAD_LETTER"
    },
    {
      "stepId": "step-init-sync",
      "taskType": "T168",
      "description": "First incremental sync after connector registration",
      "factories": ["F430","F432","F433","F434","F437","F438"],
      "freedom": {"syncFrequency": "${config.flow14.{tenantId}.sync_cron}"},
      "onSuccess": "END",
      "onFailure": "RETRY:3:EXPONENTIAL"
    },
    {
      "stepId": "step-sync",
      "taskType": "T168",
      "description": "Scheduled incremental sync — cursor-based polling",
      "factories": ["F430","F432","F433","F434","F437","F438"],
      "onSuccess": "END",
      "onFailure": "RETRY:3:EXPONENTIAL"
    },
    {
      "stepId": "step-webhook",
      "taskType": "T169",
      "description": "Webhook event ingestion — HMAC verify → dedupe → raw land",
      "factories": ["F429","F435","F438","F440"],
      "onSuccess": "END",
      "onFailure": "DEAD_LETTER"
    },
    {
      "stepId": "step-backfill",
      "taskType": "T170",
      "description": "Historical backfill saga — date-range slicing with EP-4",
      "factories": ["F430","F434","F436","F437","F438"],
      "freedom": {"sliceSize": "${config.flow14.{tenantId}.backfill_slice_days}"},
      "onSuccess": "END",
      "onFailure": "RETRY:1:EXPONENTIAL"
    }
  ]
}
```

---

### FLOW TEMPLATE 34 — transform-pipeline-v1

```
FLOW: FLOW-14
TEMPLATE: 34
VERSION: 1.0.0
DESCRIPTION: Data Warehouse Transform Pipeline — Raw → Staging → Core → Marts
ORCHESTRATOR: IFlowOrchestrator (Skill 09)
ENTRY_EVENT: RawDataLanded
TENANT_SCOPED: true
```

```json
{
  "flowId": "flow-14-transform",
  "templateId": 34,
  "version": "1.0.0",
  "description": "Data Warehouse Transform Pipeline — raw → staging → core → marts",
  "entryEvent": "RawDataLanded",
  "tenantScoped": true,
  "steps": [
    {
      "stepId": "step-schema-check",
      "taskType": "T172",
      "description": "Schema drift detection before transform",
      "factories": ["F438","F439","F443","F445","F458"],
      "onSuccess": "step-transform",
      "onFailure": "step-quarantine-alert",
      "onDrift": "step-drift-review"
    },
    {
      "stepId": "step-drift-review",
      "taskType": "T172",
      "description": "Schema drift admin review — block mart promotion for new fields",
      "factories": ["F439"],
      "freedom": {"autoAcceptFieldAdded": "${config.flow14.{tenantId}.schema_auto_accept}"},
      "onApprove": "step-transform",
      "onReject": "step-quarantine-alert"
    },
    {
      "stepId": "step-transform",
      "taskType": "T171",
      "description": "Raw-to-Staging transform — normalize, identity resolve, quarantine",
      "factories": ["F438","F442","F443","F444","F445","F446","F447","F448"],
      "onSuccess": "step-identity",
      "onFailure": "step-quarantine-alert"
    },
    {
      "stepId": "step-identity",
      "taskType": "T175",
      "description": "Cross-system identity join — probabilistic matching",
      "factories": ["F440","F446","F449","F459"],
      "freedom": {"autoMergeThreshold": "${config.flow14.{tenantId}.identity_threshold}"},
      "onSuccess": "step-model",
      "onFailure": "RETRY:2:EXPONENTIAL"
    },
    {
      "stepId": "step-model",
      "taskType": "T173",
      "description": "Dimension/Fact refresh — SCD-2 dims + append-only facts + snapshots",
      "factories": ["F444","F449","F450","F452","F460"],
      "onSuccess": "step-mart",
      "onFailure": "RETRY:2:EXPONENTIAL"
    },
    {
      "stepId": "step-mart",
      "taskType": "T174",
      "description": "Mart build + KPI refresh — PII gate → aggregate → cache refresh",
      "factories": ["F449","F450","F451","F454","F455","F460","F462"],
      "freedom": {"martTypes": "${config.flow14.{tenantId}.enabled_marts}"},
      "onSuccess": "END",
      "onFailure": "RETRY:1:EXPONENTIAL"
    },
    {
      "stepId": "step-quarantine-alert",
      "taskType": "ALERT",
      "description": "Quarantine threshold exceeded or schema drift rejected — notify admin",
      "factories": ["F445","F457"],
      "onSuccess": "END"
    }
  ]
}
```

---

### FLOW TEMPLATE 35 — analytics-pipeline-v1

```
FLOW: FLOW-14
TEMPLATE: 35
VERSION: 1.0.0
DESCRIPTION: Data Warehouse Analytics Pipeline — Cross-Flow Joins → Reverse ETL → Provision
ORCHESTRATOR: IFlowOrchestrator (Skill 09)
ENTRY_EVENT: MartRefreshCompleted
TENANT_SCOPED: true
```

```json
{
  "flowId": "flow-14-analytics",
  "templateId": 35,
  "version": "1.0.0",
  "description": "Data Warehouse Analytics Pipeline — cross-flow → reverse ETL → provision",
  "entryEvent": "MartRefreshCompleted",
  "tenantScoped": true,
  "steps": [
    {
      "stepId": "step-route",
      "taskType": "ROUTE",
      "description": "Route based on analytics action type",
      "conditions": [
        {"if": "event.actionType == 'CROSS_FLOW'", "goto": "step-cross-flow"},
        {"if": "event.actionType == 'ACTIVATION'", "goto": "step-activation"},
        {"if": "event.actionType == 'PROVISION'", "goto": "step-provision"}
      ]
    },
    {
      "stepId": "step-cross-flow",
      "taskType": "T176",
      "description": "Cross-flow analytics — Lead→Delivery, Plan→Profit, Support→Resolution",
      "factories": ["F450","F451","F455","F460"],
      "freedom": {"enabledFlows": "${config.flow14.{tenantId}.cross_flow_joins}"},
      "onSuccess": "step-activation",
      "onFailure": "RETRY:1:EXPONENTIAL"
    },
    {
      "stepId": "step-activation",
      "taskType": "T177",
      "description": "Reverse ETL activation — threshold → push to external SaaS",
      "factories": ["F427","F430","F434","F456","F459"],
      "freedom": {"activations": "${config.flow14.{tenantId}.activation_rules}"},
      "onSuccess": "END",
      "onFailure": "DEAD_LETTER"
    },
    {
      "stepId": "step-provision",
      "taskType": "T178",
      "description": "Warehouse tenant provisioning — isolation + RLS + quotas + dim_date",
      "factories": ["F449","F453","F461","F463","F465"],
      "freedom": {"isolationMatrix": "${config.flow14.{tenantId}.zone_isolation}"},
      "onSuccess": "END",
      "onFailure": "DEAD_LETTER"
    }
  ]
}
```

---

## PHASE 4 — ARCHETYPE REGISTRY UPDATE (Complete FLOW-14)

| Archetype | First Introduced | FLOW-14 Usage | Key Characteristic |
|---|---|---|---|
| PROVISIONING | FLOW-10 | T167, T178 | Setup lifecycle with health validation + smoke test |
| DURABLE_SAGA | FLOW-13 | T168, T170 | EP-4 crash recovery, checkpoint-per-step |
| **INGESTION** | **FLOW-14** | T169 | **External push-based event capture + HMAC** |
| **TRANSFORM** | **FLOW-14** | T171 | **Multi-factory zone-crossing pipeline** |
| VALIDATION | Various | T172 | Rule-based validation with routing |
| **MODELING** | **FLOW-14** | T173, T174 | **Warehouse model refresh: SCD-2 + mart aggregation** |
| JOIN_GATE | Various | T175 | Probabilistic scoring with confidence threshold |
| ORCHESTRATION | Various | T176 | Cross-mart analytical joins |
| **ACTIVATION** | **FLOW-14** | T177 | **Outbound push to external SaaS via QUEUE FABRIC** |

**4 new archetypes: INGESTION, TRANSFORM, MODELING, ACTIVATION**

---

## PHASE 4 — IRON RULE + QUALITY GATE TOTALS

| Task Type | Iron Rules | Quality Gates | Total |
|---|---|---|---|
| T173 Dim/Fact Refresh Cycle | 8 | 6 | 14 |
| T174 Mart Build & KPI Refresh | 8 | 6 | 14 |
| T175 Cross-System Identity Join | 8 | 6 | 14 |
| T176 Cross-Flow Analytics Gate | 8 | 6 | 14 |
| T177 Reverse ETL Activation Gate | 8 | 6 | 14 |
| T178 Warehouse Tenant Provision Gate | 8 | 6 | 14 |
| **TOTAL P4** | **48** | **36** | **84** |
| **CUMULATIVE P3+P4** | **96** | **72** | **168** |

---

## BACKWARD COMPATIBILITY CHECK

```
T1-T172:   UNCHANGED ✅ (T173-T178 are ADDITIVE)
Tpl 1-32:  UNCHANGED ✅ (Templates 33-35 are ADDITIVE)
F1-F465:   UNCHANGED ✅ (no factory modifications)
DR-1-65:   UNCHANGED ✅ (design records referenced, not modified)
CF-1-191:  UNCHANGED ✅ (BFA rules referenced, defined in P5)
```

---

## SAVE POINT: FLOW14:P4:COMPLETE ✅

### Recovery Commands
```
"Load P4"                → This file (FLOW14_P4_TASK_TYPES.md)
"Start P5"               → Generate CF-192–CF-213 + ST-92–ST-103
"Merge P4"               → Append FLOW14_P4_TASK_TYPES.md → TASK_TYPES_CATALOG_MERGED.md
"Resume from P4"         → Load P0 + P1 + P2 + P3 + this file + basic_prompt.txt
```

### Cumulative P1–P4 Totals:
```
Factories:        F426–F465 (40 new, 8 families)
Task Types:       T167–T178 (12 new, 4 new archetypes)
Flow Templates:   33–35 (3 new DAGs)
Design Records:   DR-58–DR-65 (8 new)
Iron Rules:       96 (8 per task type × 12)
Quality Gates:    72 (6 per task type × 12)
AF Station Cells: 132 (11 stations × 12 task types)
Methods:          ~178 across 40 factories
DNA Compliance:   40/40 factories, 12/12 task types (100%)
```

### Next Phase (P5) Will Produce:
- CF-192–CF-213: 22 BFA conflict rules
- ST-92–ST-103: 12 stress tests
