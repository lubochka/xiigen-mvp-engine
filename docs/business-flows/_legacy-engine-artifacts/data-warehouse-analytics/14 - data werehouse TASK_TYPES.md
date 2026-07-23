# XIIGen — FLOW-14 PHASE 3: TASK TYPES T167–T172
# Merged: 2026-02-26 | Source: FLOW14_PLAN_P0.md Phase P3
# Adds: T167–T172 (6 engine contracts, 48 iron rules, 36 quality gates)
# Depends on: P1 (F426-F443), P2 (F444-F465, DR-58-DR-65)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Extends: T1–T166 | Adds: T167–T172 (6 engine contracts)
## New archetypes introduced: INGESTION (T169), TRANSFORM (T171)
## Existing archetypes reused: PROVISIONING (T167), DURABLE_SAGA (T168, T170), VALIDATION (T172)
## Backward compatibility: T1–T166 UNCHANGED

---

## TASK TYPE: T167 — Connector Registration Gate
```
ARCHETYPE:  PROVISIONING
ENTRY:      Admin initiates connector setup via DynamicController — provides: provider type
            (clickup/zoho_crm/zoho_desk), OAuth redirect callback or PAT, tenant context.
            Fires ConnectorRegistrationRequested event on QUEUE FABRIC.
PURPOSE:    Orchestrate the full lifecycle of registering an external SaaS connector for a
            tenant: validate provider config → execute OAuth authorization code flow (or PAT
            validation) → store encrypted credentials in vault → generate webhook secrets →
            probe API health → register connector as ACTIVE. If any step fails, rollback to
            PENDING state with diagnostic context.
DISTINCT FROM: T178 (Warehouse Tenant Provision Gate — provisions the warehouse zones per tenant;
               T167 provisions the external connector that feeds data INTO the warehouse)
               T166 (FLOW-13 Tenant Finance Provision Gate — provisions finance-specific isolation;
               T167 provisions external SaaS API connectivity)

FACTORY DEPENDENCIES:
  F426: IConnectorRegistryService       — register/update connector lifecycle
  F427: ICredentialVaultService          — store encrypted OAuth/PAT credentials
  F428: ITokenRefreshService             — schedule proactive token refresh
  F430: IRateLimitGuardService           — initialize rate limit counters for new connector
  F431: IConnectionHealthService         — health probe after credential store

FABRIC RESOLUTION:
  F426 → DATABASE FABRIC (Skill 05) → Elasticsearch (connector catalog)
         + QUEUE FABRIC (Skill 04) → Redis Streams (connector.registered event)
  F427 → DATABASE FABRIC (Skill 05) → PostgreSQL (encrypted credential store)
         + Elasticsearch (credential audit log)
  F428 → CORE FABRIC (Skill 01 — MicroserviceBase HTTP) for OAuth token endpoint calls
         + DATABASE FABRIC (Skill 05) → PostgreSQL (refresh state)
  F430 → CORE FABRIC (Skill 01 — MicroserviceBase cache) → Redis (rate limit counters)
  F431 → DATABASE FABRIC (Skill 05) → Elasticsearch (health history)

AF CONFIGURATION:
  AF-1 Genesis:     Generates ConnectorRegistrationService extending MicroserviceBase
  AF-2 Planning:    Decomposes into: validate-config → OAuth-exchange → store-credentials →
                    generate-webhook-secret → schedule-refresh → init-rate-limit → health-probe → activate
  AF-3 Prompt Lib:  Retrieves "oauth-authorization-code-flow", "credential-vault-pattern",
                    "rate-limit-initialization" domain prompts
  AF-4 RAG:         Searches SK-89 (OAuth Credential Lifecycle), SK-91 (HMAC Webhook Verification)
  AF-5 Multi-model: Parallel generation: Claude (primary OAuth flow) + GPT (credential encryption review)
  AF-6 Code Review: OAuth state parameter CSRF protection, token storage encryption, webhook secret entropy
  AF-7 Compliance:  DNA-1–DNA-9; verifies credential never in logs, DynamicController, MicroserviceBase
  AF-8 Security:    TLS enforcement on OAuth redirect, credential encryption at rest (AES-256-GCM),
                    webhook secret minimum entropy, PAT never stored in plaintext
  AF-9 Judge:       Validates IR-167-1 through IR-167-8 + QG-167-1 through QG-167-6
  AF-10 Merge:      Combines multi-model outputs; selects most robust OAuth error handling
  AF-11 Feedback:   Stores connector registration success/failure patterns for future improvement

BFA VALIDATION:
  CF-198: Connector auth vs FLOW-01 user auth — different identity planes, no conflict
  CF-199: Connector credential store vs FLOW-13 finance credential isolation — separate vaults
  CF-204: Tenant credentials NEVER cross isolation boundaries — connector scoped to single tenant
  CF-210: Rate limit counters initialized BEFORE any API call allowed through new connector

MACHINE/FREEDOM:
  MACHINE:  OAuth authorization code exchange protocol (RFC 6749), credential encryption (AES-256-GCM),
            webhook secret generation (256-bit random), connector lifecycle state machine
            (PENDING → AUTHORIZING → ACTIVE → SUSPENDED → REVOKED)
  FREEDOM:  OAuth scopes per provider, redirect URLs, supported provider list, token refresh window
            percentage, health probe interval, suspension policy after N consecutive failures

IRON RULES (IR-167-1 to IR-167-8):
  IR-167-1: tenantId MUST appear on every credential operation (DNA-5) — no shared credentials
  IR-167-2: Credentials MUST be encrypted (AES-256-GCM) BEFORE StoreDocument call (F427)
  IR-167-3: OAuth state parameter MUST include CSRF token — validated on callback
  IR-167-4: Webhook secret MUST have minimum 256-bit entropy — generated via cryptographic PRNG
  IR-167-5: Provider SDK MUST NOT be imported — OAuth exchange via CORE FABRIC HTTP (IR-168-8 pattern)
  IR-167-6: Token refresh schedule MUST be created via F428 BEFORE connector marked ACTIVE
  IR-167-7: Rate limit counters MUST be initialized via F430 BEFORE connector marked ACTIVE
  IR-167-8: Health probe MUST return success via F431 BEFORE connector marked ACTIVE

QUALITY GATES (QG-167-1 to QG-167-6):
  QG-167-1: All connector documents parsed as Dictionary<string,object> — no typed models (DNA-1)
  QG-167-2: Credential never appears in application logs or error messages — verified by AF-8
  QG-167-3: DataProcessResult<T> returned on all paths including OAuth failure — no exceptions (DNA-3)
  QG-167-4: Replaying registration with same tenant+provider produces same connector — idempotent
  QG-167-5: Revoking connector also revokes credentials and cancels refresh schedule atomically
  QG-167-6: AF-9 confirms connector lifecycle state machine is complete — no unreachable states
```

---

## TASK TYPE: T168 — Incremental Sync Orchestrator
```
ARCHETYPE:  DURABLE_SAGA
ENTRY:      Cron trigger from F432 ISyncJobSchedulerService (scheduled sync) OR
            manual "sync now" event via DynamicController. Fires SyncJobDispatched event.
PURPOSE:    Execute paginated API polling against an external SaaS connector, track
            cursor/watermark state for incremental sync, land all records in the raw zone
            (Bronze). Uses EP-4 durable saga for crash recovery — if interrupted mid-sync,
            resumes from last committed cursor checkpoint. Each page poll is an EP-4 saga
            step: check rate limit → poll page → land in raw → commit cursor → repeat.
DISTINCT FROM: T170 (Backfill Saga — full history replay with date-range slicing; T168 is
               incremental from last cursor position)
               T169 (Webhook Ingestion — push-based; T168 is pull-based polling)
               T157 (FLOW-13 Finance Durable Saga Entry — finance-specific with EP-5 period lock;
               T168 uses EP-4 but without period lock, since external data is time-continuous)

FACTORY DEPENDENCIES:
  F430: IRateLimitGuardService           — check rate limit BEFORE every API call
  F432: ISyncJobSchedulerService         — job dispatch and lifecycle
  F433: IIncrementalCursorService        — cursor read/commit per entity per tenant
  F434: IApiPollingService               — paginated HTTP polling via CORE FABRIC
  F437: ISyncRunTrackerService           — run metrics and status tracking
  F438: IRawLandingService               — append-only raw zone write

FABRIC RESOLUTION:
  F430 → CORE FABRIC (Skill 01 — cache) → Redis (rate limit sliding window)
         + DATABASE FABRIC (Skill 05) → Elasticsearch (rate limit metrics history)
  F432 → QUEUE FABRIC (Skill 04) → Redis Streams (syncjob.dispatched, syncjob.completed)
         + DATABASE FABRIC (Skill 05) → PostgreSQL (job definitions)
  F433 → DATABASE FABRIC (Skill 05) → PostgreSQL (cursor state table)
  F434 → CORE FABRIC (Skill 01 — MicroserviceBase HTTP)
  F437 → DATABASE FABRIC (Skill 05) → PostgreSQL (sync run) + Elasticsearch (run metrics)
  F438 → DATABASE FABRIC (Skill 05) → Elasticsearch (raw_landing indices — append-only)
         + QUEUE FABRIC (Skill 04) → Redis Streams (raw.landed event)

AF CONFIGURATION:
  AF-1 Genesis:     Generates IncrementalSyncService extending MicroserviceBase
  AF-2 Planning:    Decomposes into: init-run → load-cursor → [rate-check → poll-page →
                    land-raw → commit-cursor → advance] (loop) → complete-run
  AF-3 Prompt Lib:  Retrieves "paginated-api-sync", "rate-limit-backoff", "durable-saga-checkpoint"
  AF-4 RAG:         Searches SK-90 (Paginated API Polling with Cursor), SK-89 (OAuth Lifecycle),
                    EP-4 (Durable Saga Runtime from FLOW-13)
  AF-5 Multi-model: Parallel generation: Claude (polling loop) + GPT (backoff algorithm)
  AF-6 Code Review: Cursor overflow, pagination termination, timeout handling, rate limit 429 recovery
  AF-7 Compliance:  DNA-1–DNA-9; verifies no typed API response models, no provider SDK import
  AF-8 Security:    Credential never in logs, TLS enforcement, token rotation mid-sync handling
  AF-9 Judge:       Validates IR-168-1 through IR-168-8 + QG-168-1 through QG-168-6
  AF-10 Merge:      Selects best rate-limit backoff strategy from multi-model competition
  AF-11 Feedback:   Stores sync success rate, records/second, rate-limit hit ratio

BFA VALIDATION:
  CF-192: Zone promotion order — records MUST land in raw (Zone 1) before any downstream processing
  CF-193: Cursor integrity — cursor MUST advance monotonically, never go backward
  CF-198: Connector auth vs FLOW-01 user auth — separate identity planes
  CF-210: Rate limit guard MUST be checked BEFORE every external API call

MACHINE/FREEDOM:
  MACHINE:  EP-4 saga state machine (INIT → POLLING → CHECKPOINTING → COMPLETED/FAILED),
            cursor advancement logic (monotonic), pagination termination detection (last_page flag
            or empty response), SHA-256 raw record hashing for dedup
  FREEDOM:  Sync frequency (cron expression per connector per tenant), page size, rate limit
            ceiling per tenant, retry count, backoff multiplier (exponential), backoff max delay,
            provider selection (ClickUp/Zoho CRM/Zoho Desk/future), entity types to sync

IRON RULES (IR-168-1 to IR-168-8):
  IR-168-1: tenantId MUST appear on every cursor state write (DNA-5)
  IR-168-2: Raw landing MUST be append-only — no UpdateDocument, no DeleteDocument (DR-58)
  IR-168-3: Rate limit guard (F430.CheckAsync) MUST be called BEFORE every PollPageAsync call (CF-210)
  IR-168-4: Cursor MUST be committed via EP-4 checkpoint BEFORE advancing to next page
  IR-168-5: No typed model for API response — Dictionary<string,object> only (DNA-1)
  IR-168-6: Credentials MUST be resolved from F427 ICredentialVaultService, never hardcoded
  IR-168-7: Sync run status MUST be tracked in F437 ISyncRunTrackerService for observability
  IR-168-8: Provider SDK MUST NOT be imported — all HTTP calls through CORE FABRIC

QUALITY GATES (QG-168-1 to QG-168-6):
  QG-168-1: Sync completes without uncaught exceptions — DataProcessResult wraps all returns
  QG-168-2: Cursor advances = pages polled (no skipped pages) — reconciliation check
  QG-168-3: Rate limit 429 responses handled with exponential backoff — not treated as failure
  QG-168-4: Raw records count matches API pagination total (within tolerance) — reconciliation
  QG-168-5: EP-4 saga can resume from last checkpoint after simulated crash — crash recovery test
  QG-168-6: Sync run tracker shows correct status (running/completed/failed/partial)
```

---

## TASK TYPE: T169 — Webhook Ingestion Gate
```
ARCHETYPE:  INGESTION
ENTRY:      External SaaS platform sends HTTP POST to webhook endpoint registered via T167.
            F429 IWebhookReceiverService receives, verifies HMAC, normalizes, publishes to
            QUEUE FABRIC. T169 consumes from the normalized webhook stream.
PURPOSE:    Process verified, deduplicated webhook events from external SaaS platforms.
            Map each event to a sync operation (create/update/delete in raw zone), maintain
            ordering within entity type, and ensure exactly-once processing via dedup +
            idempotency key. This is the push-based complement to T168's pull-based polling.
DISTINCT FROM: T168 (Incremental Sync Orchestrator — pull-based periodic polling; T169 is push-based
               near-real-time event capture)
               T170 (Backfill Saga — historical replay; T169 is current event processing)
               T84 (FLOW-08 ingestion — internal; T169 bridges external SaaS webhooks)

FACTORY DEPENDENCIES:
  F429: IWebhookReceiverService          — HMAC verification + normalization (upstream)
  F435: IWebhookIngestionService         — event-to-sync-operation mapping
  F438: IRawLandingService               — append-only raw zone write
  F440: ISourceObjectMapService          — register source IDs for cross-system joins

FABRIC RESOLUTION:
  F429 → QUEUE FABRIC (Skill 04) → Redis Streams (webhook.received.{provider} — published to)
         + DATABASE FABRIC (Skill 05) → Redis (dedup cache, TTL 24h)
         + Elasticsearch (webhook audit log)
  F435 → QUEUE FABRIC (Skill 04) → Redis Streams (webhook.ingestion consumer group)
         + DATABASE FABRIC (Skill 05) → Redis (processing state)
  F438 → DATABASE FABRIC (Skill 05) → Elasticsearch (raw landing indices — append-only)
  F440 → DATABASE FABRIC (Skill 05) → PostgreSQL (source_object_map table)

AF CONFIGURATION:
  AF-1 Genesis:     Generates WebhookIngestionService extending MicroserviceBase
  AF-2 Planning:    Decomposes into: consume-event → verify-dedup → map-to-sync-op →
                    land-raw → register-source-map → ack-event
  AF-3 Prompt Lib:  Retrieves "hmac-webhook-verification", "event-deduplication", "exactly-once-processing"
  AF-4 RAG:         Searches SK-91 (HMAC Webhook Verification + Fanout), SK-90 (polling pattern for fallback)
  AF-5 Multi-model: Parallel generation: Claude (event mapping) + Gemini (dedup strategy)
  AF-6 Code Review: HMAC verification timing-safe comparison, dedup race conditions, ordering guarantees
  AF-7 Compliance:  DNA-1–DNA-9; verifies no typed webhook payload models, DynamicController for endpoint
  AF-8 Security:    HMAC signature MUST be verified before any processing; unsigned events rejected;
                    webhook secret from F427 credential vault only; TLS on webhook endpoint
  AF-9 Judge:       Validates IR-169-1 through IR-169-8 + QG-169-1 through QG-169-6
  AF-10 Merge:      Combines outputs; selects most robust dedup strategy
  AF-11 Feedback:   Stores webhook delivery reliability, dedup hit rate, processing latency

BFA VALIDATION:
  CF-192: Zone promotion order — webhook data lands in raw (Zone 1) first
  CF-204: Tenant isolation — webhook events scoped to tenant that registered the connector
  CF-211: Webhook HMAC MUST verify before processing — unsigned events = DROP + alert + audit

MACHINE/FREEDOM:
  MACHINE:  HMAC-SHA256 timing-safe verification, idempotency key extraction from event payload,
            deduplication via Redis cache (eventId → TTL), event ordering within entity type
            (Redis Streams consumer group guarantees ordering per stream key)
  FREEDOM:  Supported webhook event types per provider, dedup TTL, DLQ retry limit, batch size,
            event type → sync operation mapping (ClickUp: taskCreated→append, taskUpdated→append,
            taskDeleted→append-with-deletion-marker)

IRON RULES (IR-169-1 to IR-169-8):
  IR-169-1: HMAC signature MUST be verified (timing-safe comparison) BEFORE any event processing
  IR-169-2: Unsigned or invalid-signature events MUST be rejected, logged to audit, and alerted (CF-211)
  IR-169-3: tenantId MUST be resolved from the registered webhook → connector → tenant chain (DNA-5)
  IR-169-4: Raw landing write MUST be append-only (DR-58) — webhook deletions stored as markers
  IR-169-5: Deduplication MUST use eventId as idempotency key — duplicate events silently dropped
  IR-169-6: Source object mapping MUST be created in F440 for every new entity seen in webhooks
  IR-169-7: Failed events (3x retry) MUST route to DLQ via QUEUE FABRIC — never silently dropped
  IR-169-8: Provider SDK MUST NOT be imported — webhook payload parsed as Dictionary<string,object> (DNA-1)

QUALITY GATES (QG-169-1 to QG-169-6):
  QG-169-1: HMAC verification rejects tampered payloads — AF-8 confirms timing-safe comparison
  QG-169-2: Duplicate events produce no new raw records — dedup verified by AF-9
  QG-169-3: Event ordering within entity type maintained — earlier events processed before later
  QG-169-4: DLQ events retain full context for debugging (tenantId, event, error, retry count)
  QG-169-5: DataProcessResult<T> on all paths including verification failure — never throw (DNA-3)
  QG-169-6: Webhook endpoint responds within 5s to external platform (prevent webhook disable)
```

---

## TASK TYPE: T170 — Backfill Saga
```
ARCHETYPE:  DURABLE_SAGA
ENTRY:      Admin initiates via DynamicController — provides: tenantId, connectorId,
            entityType, dateRange (start, end), priority. Fires BackfillRequested event
            on QUEUE FABRIC. Can also auto-trigger when gap detected by T168 reconciliation.
PURPOSE:    Orchestrate historical data backfill from external SaaS APIs using date-range
            slicing. Splits total range into manageable slices (day/week) to respect API
            quotas. Uses EP-4 durable saga for crash recovery — each slice is an EP-4 step
            with checkpoint. Detects gaps by comparing raw zone record count vs API total.
DISTINCT FROM: T168 (Incremental Sync — from last cursor; T170 covers arbitrary historical range)
               T169 (Webhook Ingestion — push-based current events; T170 is pull-based historical)
               T157 (FLOW-13 Finance Saga — finance-specific; T170 is connector-agnostic backfill)

FACTORY DEPENDENCIES:
  F430: IRateLimitGuardService           — rate limit check per slice
  F434: IApiPollingService               — paginated HTTP polling per slice
  F436: IBackfillOrchestratorService     — saga state, slicing, checkpoint, gap detection
  F437: ISyncRunTrackerService           — backfill run metrics
  F438: IRawLandingService               — append-only raw zone write per slice

FABRIC RESOLUTION:
  F430 → CORE FABRIC (Skill 01 — cache) → Redis (rate limit)
  F434 → CORE FABRIC (Skill 01 — MicroserviceBase HTTP)
  F436 → QUEUE FABRIC (Skill 04) → Redis Streams (backfill.slice.dispatched/completed)
         + DATABASE FABRIC (Skill 05) → PostgreSQL (EP-4 saga state)
  F437 → DATABASE FABRIC (Skill 05) → PostgreSQL + Elasticsearch
  F438 → DATABASE FABRIC (Skill 05) → Elasticsearch (raw landing — append-only)

AF CONFIGURATION:
  AF-1 Genesis:     Generates BackfillSagaService extending MicroserviceBase
  AF-2 Planning:    Decomposes into: init-saga → compute-slices → [dispatch-slice →
                    rate-check → poll-slice-pages → land-raw → checkpoint → gap-check] (loop) →
                    reconcile → complete-saga
  AF-3 Prompt Lib:  Retrieves "durable-saga-date-slicing", "backfill-gap-detection",
                    "rate-limit-aware-batching"
  AF-4 RAG:         Searches SK-90 (Paginated Polling), SK-85 (EP-4 Durable Saga from FLOW-13),
                    SK-89 (OAuth Lifecycle)
  AF-5 Multi-model: Parallel: Claude (slicing + gap detection) + GPT (EP-4 state machine review)
  AF-6 Code Review: Slice boundary correctness, EP-4 checkpoint completeness, quota exhaustion handling
  AF-7 Compliance:  DNA-1–DNA-9; verifies EP-4 saga registration, no typed models, no provider SDK
  AF-8 Security:    Credential rotation during long backfills, TLS enforcement, tenant isolation
  AF-9 Judge:       Validates IR-170-1 through IR-170-8 + QG-170-1 through QG-170-6
  AF-10 Merge:      Selects best slicing strategy from multi-model competition
  AF-11 Feedback:   Stores backfill throughput, gap detection accuracy, quota utilization efficiency

BFA VALIDATION:
  CF-192: Zone promotion order — backfilled records land in raw (Zone 1)
  CF-193: Cursor integrity — backfill cursors within each slice advance monotonically
  CF-210: Rate limit guard checked before every API call within every slice
  CF-212: Backfill MUST NOT run during peak ingestion hours (FREEDOM configurable blackout)

MACHINE/FREEDOM:
  MACHINE:  EP-4 saga state machine (STARTED → SLICING → slice[n]: POLLING → CHECKPOINTING →
            slice[n+1] → RECONCILING → COMPLETED/FAILED), date-range slicing algorithm (split
            total range into day/week slices), gap detection (raw count vs API total per slice)
  FREEDOM:  Slice size (1 day / 1 week / custom), peak hours blackout window, max concurrent
            slices, priority relative to incremental sync, date range for backfill,
            gap tolerance percentage (allow small discrepancies)

IRON RULES (IR-170-1 to IR-170-8):
  IR-170-1: Backfill MUST be registered as EP-4 durable saga BEFORE any slice processes
  IR-170-2: Each slice MUST checkpoint via EP-4 after raw zone landing — crash-recoverable
  IR-170-3: Rate limit (F430.CheckAsync) MUST be checked before every API call within each slice
  IR-170-4: Raw landing MUST be append-only (DR-58) — backfill records may overlap with incremental
  IR-170-5: Deduplication: if raw zone already has record with same sourceId + contentHash, skip append
  IR-170-6: CF-212: Backfill jobs MUST NOT dispatch slices during configured peak blackout window
  IR-170-7: tenantId MUST appear on every operation within every slice (DNA-5)
  IR-170-8: Provider SDK MUST NOT be imported — all polling through F434 IApiPollingService (CORE FABRIC)

QUALITY GATES (QG-170-1 to QG-170-6):
  QG-170-1: EP-4 saga can resume from last checkpoint after simulated crash mid-slice
  QG-170-2: Gap detection triggers when raw count < API total by > tolerance percentage
  QG-170-3: Backfill respects peak blackout — no API calls during configured window
  QG-170-4: Concurrent slice limit enforced — never exceeds max_concurrent_slices config
  QG-170-5: DataProcessResult<T> on all paths — saga failures tracked, never thrown (DNA-3)
  QG-170-6: Backfill run tracker (F437) shows accurate per-slice progress and overall completion %
```

---

## TASK TYPE: T171 — Raw-to-Staging Transform
```
ARCHETYPE:  TRANSFORM
ENTRY:      Fires on raw.landed event from QUEUE FABRIC (emitted by F438 after raw zone append).
            Also triggered by F441 IReplayBufferService for reprocessing scenarios.
PURPOSE:    Transform raw JSON records from Bronze zone into normalized, flattened, deduped
            staging records in Silver zone. Pipeline: parse raw → resolve custom fields →
            normalize timestamps/currency → identity resolution → quarantine bad records →
            upsert staging. This is the core ETL step of the warehouse pipeline.
DISTINCT FROM: T172 (Schema Drift Detection — detects schema changes; T171 does the actual transform)
               T168 (Incremental Sync — gets data from external API; T171 processes what T168 landed)
               T173 (Dimension/Fact Refresh — models core zone from staging; T171 produces staging)

FACTORY DEPENDENCIES:
  F438: IRawLandingService               — read raw records to transform
  F442: INormalizerService               — flatten, dedupe, standardize
  F443: ICustomFieldAdapterService       — dynamic custom field value extraction
  F444: IStagingWriterService            — idempotent staging upsert
  F445: IQuarantineService               — bad record isolation
  F446: IIdentityResolutionService       — cross-system entity matching
  F447: ICurrencyNormalizerService       — multi-currency standardization
  F448: ITimezoneNormalizerService       — UTC conversion + EP-5 fiscal period mapping

FABRIC RESOLUTION:
  F438 → DATABASE FABRIC (Skill 05) → Elasticsearch (raw landing — read)
  F442 → CORE FABRIC (Skill 01 — ObjectProcessor)
  F443 → DATABASE FABRIC (Skill 05) → PostgreSQL (custom field registry)
  F444 → DATABASE FABRIC (Skill 05) → PostgreSQL (staging schema)
         + QUEUE FABRIC (Skill 04) → Redis Streams (staging.written event)
  F445 → DATABASE FABRIC (Skill 05) → Elasticsearch (quarantine index)
         + QUEUE FABRIC (Skill 04) → Redis Streams (quarantine.added event)
  F446 → DATABASE FABRIC (Skill 05) → PostgreSQL (identity table) + RAG FABRIC (Hybrid strategy)
  F447 → DATABASE FABRIC (Skill 05) → PostgreSQL (conversion log) + F387 (FLOW-13 rates — read-only)
  F448 → CORE FABRIC (Skill 01 — ObjectProcessor) + F386 (FLOW-13 fiscal calendar — read-only)

AF CONFIGURATION:
  AF-1 Genesis:     Generates RawToStagingTransformService extending MicroserviceBase
  AF-2 Planning:    Decomposes into: read-raw → resolve-custom-fields → normalize-timestamps →
                    normalize-currency → resolve-identity → validate-quality → quarantine-or-stage
  AF-3 Prompt Lib:  Retrieves "raw-to-staging-transform", "custom-field-adaptation",
                    "identity-resolution-probabilistic", "quarantine-pattern"
  AF-4 RAG:         Searches SK-92 (Multi-Zone Warehouse Pipeline), SK-93 (Schema Drift + Custom Field),
                    SK-94 (Probabilistic Identity Resolution), SK-95 (SCD-2 Dimension Loader)
  AF-5 Multi-model: Parallel: Claude (transform pipeline) + Gemini (custom field adapter)
  AF-6 Code Review: Custom field type handling completeness, identity resolution edge cases,
                    quarantine vs silent drop (NEVER silent drop), staging idempotency
  AF-7 Compliance:  DNA-1–DNA-9; verifies all staging records are Dictionary<string,object>,
                    no typed models, BuildSearchFilter on all reads, tenantId on every operation
  AF-8 Security:    No PII promotion without classification, no cross-tenant identity joins (CF-204)
  AF-9 Judge:       Validates IR-171-1 through IR-171-8 + QG-171-1 through QG-171-6
  AF-10 Merge:      Combines multi-model outputs; selects most robust custom field handling
  AF-11 Feedback:   Stores transform success rate, quarantine rate, identity resolution match rate

BFA VALIDATION:
  CF-192: Zone promotion order — raw (Zone 1) → staging (Zone 2). No skip.
  CF-194: Staging idempotency — same raw record processed twice produces identical staging record
  CF-204: Identity resolution MUST NOT join cross-tenant records — tenantId filter on every query
  CF-207: PII check awareness — staging records flagged for future PII classification (DR-63)

MACHINE/FREEDOM:
  MACHINE:  Transform pipeline ordering (custom fields → timestamps → currency → identity → validate),
            quarantine routing (never silent drop), staging idempotent upsert (content hash dedup),
            identity resolution scoring formula, UTC conversion logic
  FREEDOM:  Custom field prefix format, timezone source per connector, base currency per tenant,
            identity match confidence threshold, quarantine alert threshold (% of batch),
            batch size, reprocessing priority

IRON RULES (IR-171-1 to IR-171-8):
  IR-171-1: tenantId MUST appear on every staging write and every identity resolution query (DNA-5)
  IR-171-2: All staging records MUST be Dictionary<string,object> — NO typed staging models (DNA-1)
  IR-171-3: Records that fail normalization MUST route to quarantine (F445) — NEVER silently dropped
  IR-171-4: Staging upsert MUST be idempotent — same raw record re-processed = no new staging version
  IR-171-5: Identity resolution (F446) MUST NOT join cross-tenant records (CF-204) — BUILD FAILURE
  IR-171-6: Currency normalization MUST use F387 exchange rates — no hardcoded rates
  IR-171-7: Timestamp normalization MUST convert to UTC — no local timezone in staging records (DD-82)
  IR-171-8: Every staging record MUST link back to source raw record via _sourceRawId field

QUALITY GATES (QG-171-1 to QG-171-6):
  QG-171-1: DataProcessResult<T> on all transform paths — no exceptions thrown (DNA-3)
  QG-171-2: BuildSearchFilter skips empty fields on raw zone reads and staging writes (DNA-2)
  QG-171-3: Quarantine records include failure reason, source raw ID, and tenant context
  QG-171-4: Identity resolution produces confidence score on every match — never binary match/no-match
  QG-171-5: Transform is replayable — F441 replay produces identical staging output from same raw input
  QG-171-6: AF-9 confirms all 40+ ClickUp custom field types have extraction logic in F443
```

---

## TASK TYPE: T172 — Schema Drift Detection Gate
```
ARCHETYPE:  VALIDATION
ENTRY:      Fires periodically (FREEDOM configurable schedule) OR on demand when F442
            INormalizerService encounters unknown fields. Samples recent raw records and
            compares field set against stored schema version in F439 ISchemaRegistryService.
PURPOSE:    Detect and categorize schema changes in external SaaS source data. ClickUp
            workspaces can add/remove custom fields at any time. Zoho CRM modules can
            gain new fields per edition upgrade. T172 detects these changes, categorizes
            them (FIELD_ADDED, FIELD_REMOVED, TYPE_CHANGED, ENUM_EXPANDED), and routes
            to appropriate action: auto-accept for raw/staging, admin-gate for mart.
DISTINCT FROM: T171 (Raw-to-Staging Transform — transforms data; T172 validates the schema
               T171 relies on is still accurate)
               T158 (FLOW-13 Three-Way Match — validates document matching; T172 validates
               source system schema integrity)

FACTORY DEPENDENCIES:
  F438: IRawLandingService               — sample recent raw records for schema analysis
  F439: ISchemaRegistryService           — schema discovery, drift detection, approval workflow
  F443: ICustomFieldAdapterService       — custom field registry refresh on schema change
  F445: IQuarantineService               — quarantine records with type-changed fields
  F458: IDataQualityRulesService         — update quality rules when schema changes

FABRIC RESOLUTION:
  F438 → DATABASE FABRIC (Skill 05) → Elasticsearch (raw landing — read)
  F439 → DATABASE FABRIC (Skill 05) → Elasticsearch (schema_registry index)
         + QUEUE FABRIC (Skill 04) → Redis Streams (schema.drift_detected, schema.approved)
  F443 → DATABASE FABRIC (Skill 05) → PostgreSQL (custom field registry)
  F445 → DATABASE FABRIC (Skill 05) → Elasticsearch (quarantine index)
  F458 → DATABASE FABRIC (Skill 05) → Elasticsearch (quality_rules index)

AF CONFIGURATION:
  AF-1 Genesis:     Generates SchemaDriftDetectionService extending MicroserviceBase
  AF-2 Planning:    Decomposes into: sample-raw → discover-schema → compare-stored →
                    categorize-drift → route-action (auto-accept / quarantine / admin-gate)
  AF-3 Prompt Lib:  Retrieves "schema-drift-detection", "custom-field-discovery",
                    "elt-schema-evolution"
  AF-4 RAG:         Searches SK-93 (Schema Drift Detection + Dynamic Field Adapter)
  AF-5 Multi-model: Parallel: Claude (drift categorization) + GPT (impact assessment)
  AF-6 Code Review: Edge cases: field name collision after rename, type narrowing vs widening,
                    enum value removal impact on existing staging records
  AF-7 Compliance:  DNA-1–DNA-9; verifies schema stored as Dictionary, no typed schema models
  AF-8 Security:    Schema changes don't expose PII through new field paths without classification
  AF-9 Judge:       Validates IR-172-1 through IR-172-8 + QG-172-1 through QG-172-6
  AF-10 Merge:      Combines outputs; selects most accurate drift categorization
  AF-11 Feedback:   Stores drift detection accuracy, false positive rate, admin approval latency

BFA VALIDATION:
  CF-192: Zone promotion — schema drift blocks mart promotion until admin approves (DR-60)
  CF-195: Schema approval vs staging — approved changes flow to staging; rejected changes quarantine
  CF-207: PII classification — new fields must pass PII classification before mart promotion

MACHINE/FREEDOM:
  MACHINE:  Schema comparison algorithm (field-by-field: name, type, nullability), drift
            categorization logic (FIELD_ADDED, FIELD_REMOVED, TYPE_CHANGED, ENUM_EXPANDED),
            impact scoring (how many existing staging/core/mart records affected)
  FREEDOM:  Schema sample frequency, auto-accept policy for FIELD_ADDED (raw/staging only),
            alert recipients, drift severity thresholds (FIELD_REMOVED = HIGH,
            TYPE_CHANGED = CRITICAL, FIELD_ADDED = LOW), admin approval timeout

IRON RULES (IR-172-1 to IR-172-8):
  IR-172-1: Schema comparison MUST be field-by-field — never hash-based (miss individual changes)
  IR-172-2: FIELD_REMOVED drift MUST quarantine records missing the field + emit HIGH severity alert
  IR-172-3: TYPE_CHANGED drift MUST quarantine affected records + require admin approval (CRITICAL)
  IR-172-4: FIELD_ADDED in raw/staging: auto-accept. FIELD_ADDED in mart: admin-gate (DR-60)
  IR-172-5: tenantId MUST scope all schema operations — each tenant has independent schema versions
  IR-172-6: Schema version MUST be monotonically increasing — no version rollback
  IR-172-7: Custom field registry (F443) MUST be refreshed when ClickUp custom field schema changes
  IR-172-8: All schema drift events MUST be logged to F459 IWarehouseAuditService (audit trail)

QUALITY GATES (QG-172-1 to QG-172-6):
  QG-172-1: DataProcessResult<T> on all drift detection paths — never throw (DNA-3)
  QG-172-2: FIELD_REMOVED correctly detected when sampling N records (configurable N)
  QG-172-3: TYPE_CHANGED correctly detected: e.g., string→number, dropdown→multi-select
  QG-172-4: Admin approval workflow produces clear before/after schema diff for review
  QG-172-5: Schema version history maintained — can compare any two versions
  QG-172-6: AF-9 confirms: no unhandled drift category — every drift type has a routing action
```

---

## PHASE 3 — AF STATION SUMMARY MAP (T167–T172)

| Station | T167 (Connector) | T168 (Sync) | T169 (Webhook) | T170 (Backfill) | T171 (Transform) | T172 (Schema) |
|---|---|---|---|---|---|---|
| AF-1 Genesis | Connector reg svc | Incremental sync svc | Webhook ingest svc | Backfill saga svc | Transform svc | Schema drift svc |
| AF-2 Planning | 8-step provision | Loop: rate→poll→land→cursor | 6-step: consume→verify→map→land | Loop: slice→poll→land→checkpoint | 7-step transform pipeline | 5-step: sample→discover→compare→route |
| AF-3 Prompt | oauth-flow, vault | paginated-sync, saga | hmac-verify, dedup | saga-slicing, gap | raw-to-staging, custom-field | schema-drift, elt-evolution |
| AF-4 RAG | SK-89, SK-91 | SK-90, SK-89, EP-4 | SK-91, SK-90 | SK-90, SK-85, SK-89 | SK-92, SK-93, SK-94, SK-95 | SK-93 |
| AF-5 Multi | OAuth + encryption | Polling + backoff | Mapping + dedup | Slicing + EP-4 review | Pipeline + custom field | Categorization + impact |
| AF-6 Review | CSRF, encryption | Cursor overflow, timeout | HMAC timing-safe | Slice boundary, quota | Custom field completeness | Type change edge cases |
| AF-7 Compliance | DNA-1–9, DynCtrl | DNA-1–9, no SDK | DNA-1–9, DynCtrl | DNA-1–9, EP-4 | DNA-1–9, no typed models | DNA-1–9, Dict schemas |
| AF-8 Security | TLS, AES-256, entropy | Cred not in logs, TLS | HMAC verify first, TLS | Cred rotation mid-run | No PII skip, no cross-tenant | PII on new fields |
| AF-9 Judge | 8 IRs + 6 QGs | 8 IRs + 6 QGs | 8 IRs + 6 QGs | 8 IRs + 6 QGs | 8 IRs + 6 QGs | 8 IRs + 6 QGs |
| AF-10 Merge | Best OAuth error handling | Best backoff strategy | Best dedup strategy | Best slicing strategy | Best custom field handling | Best categorization |
| AF-11 Feedback | Success/failure patterns | Records/sec, rate hits | Delivery reliability | Throughput, gap accuracy | Transform rate, quarantine % | Drift accuracy, false + |

---

## PHASE 3 — ARCHETYPE REGISTRY UPDATE

| Archetype | First Introduced | FLOW-14 Usage | Key Characteristic |
|---|---|---|---|
| PROVISIONING | FLOW-10 (estimated) | T167 (Connector Registration) | Setup/teardown lifecycle with health validation |
| DURABLE_SAGA | FLOW-13 (T157) | T168, T170 | EP-4 crash recovery, checkpoint-per-step |
| **INGESTION** | **FLOW-14 (T169)** | T169 (Webhook Ingestion) | **NEW: External push-based event capture with HMAC verification** |
| **TRANSFORM** | **FLOW-14 (T171)** | T171 (Raw-to-Staging) | **NEW: Multi-factory pipeline across warehouse zones** |
| VALIDATION | FLOW-01+ (various) | T172 (Schema Drift Detection) | Existing: rule-based validation with routing |

---

## PHASE 3 — BACKWARD COMPATIBILITY CHECK

```
T1-T166:   UNCHANGED ✅ (T167-T172 are ADDITIVE)
F1-F465:   UNCHANGED ✅ (no factory modifications — task types reference existing factories)
DR-1-65:   UNCHANGED ✅ (task types reference existing DRs, no modifications)
CF-1-191:  UNCHANGED ✅ (BFA rules referenced but not defined here — defined in P5)
EP-1-5:    STABLE ✅ (EP-4 consumed by T168/T170, not redefined)
SK-1-88:   UNCHANGED ✅ (skills referenced by AF-4 RAG, not modified)
```

---

## PHASE 3 — IRON RULE + QUALITY GATE TOTALS

| Task Type | Iron Rules | Quality Gates | Total Checks |
|---|---|---|---|
| T167 Connector Registration Gate | 8 (IR-167-1 to IR-167-8) | 6 (QG-167-1 to QG-167-6) | 14 |
| T168 Incremental Sync Orchestrator | 8 (IR-168-1 to IR-168-8) | 6 (QG-168-1 to QG-168-6) | 14 |
| T169 Webhook Ingestion Gate | 8 (IR-169-1 to IR-169-8) | 6 (QG-169-1 to QG-169-6) | 14 |
| T170 Backfill Saga | 8 (IR-170-1 to IR-170-8) | 6 (QG-170-1 to QG-170-6) | 14 |
| T171 Raw-to-Staging Transform | 8 (IR-171-1 to IR-171-8) | 6 (QG-171-1 to QG-171-6) | 14 |
| T172 Schema Drift Detection Gate | 8 (IR-172-1 to IR-172-8) | 6 (QG-172-1 to QG-172-6) | 14 |
| **TOTAL P3** | **48** | **36** | **84** |

---

## SAVE POINT: FLOW14:P3:COMPLETE ✅

### Recovery Commands
```
"Load P3"                → This file (FLOW14_P3_TASK_TYPES.md)
"Start P4"               → Generate T173–T178 + Templates 33-35
"Merge P3"               → Append FLOW14_P3_TASK_TYPES.md → TASK_TYPES_CATALOG_MERGED.md
"Resume from P3"         → Load FLOW14_PLAN_P0.md + P1 + P2 + this file + basic_prompt.txt
```

### Cumulative P1+P2+P3 Totals:
```
Factories:       F426–F465 (40 new, 8 families)
Task Types:      T167–T172 (6 new, 2 new archetypes: INGESTION, TRANSFORM)
Design Records:  DR-58–DR-65 (8 new)
Iron Rules:      48 (8 per task type × 6)
Quality Gates:   36 (6 per task type × 6)
AF Station Cells: 66 (11 stations × 6 task types)
Methods:         ~178 total across 40 factories
DNA Compliance:  40/40 factories pass, 6/6 task types pass (100%)
```

### Next Phase (P4) Will Produce:
- T173: Dimension/Fact Refresh Cycle (MODELING)
- T174: Mart Build & KPI Refresh (MODELING)
- T175: Cross-System Identity Join (JOIN_GATE)
- T176: Cross-Flow Analytics Gate (ORCHESTRATION)
- T177: Reverse ETL Activation Gate (ACTIVATION)
- T178: Warehouse Tenant Provision Gate (PROVISIONING)
- Templates 33-35 (ingest-pipeline-v1, transform-pipeline-v1, analytics-pipeline-v1)
