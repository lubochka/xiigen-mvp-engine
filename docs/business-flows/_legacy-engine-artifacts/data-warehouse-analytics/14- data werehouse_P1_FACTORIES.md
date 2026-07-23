# XIIGen — FLOW-14 PHASE 1: CONNECTION + INGESTION + RAW ZONE
# Merged: 2026-02-26 | Source: FLOW14_PLAN_P0.md Phase P1
# Adds: Families 52-54, F426-F443 (18 factories, ~82 methods), DR-58-DR-59
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## PREREQUISITE STATE (entering FLOW-14 P1)

```
Factories:        F1–F425     (425 total, Families 1–51)
Engine Primitives: EP-1–EP-5  (Durable Saga, Period Lock ALREADY PRESENT)
DNA Patterns:     DNA-1–DNA-9 (SoD ALREADY PRESENT)
Fabrics:          Skill 01–11 (all present)
Design Records:   DR-1–DR-57
```

**EP-4 (Durable Saga Runtime) is consumed by FLOW-14 for backfill crash recovery.**
**DNA-9 (SoD) is consumed: connector admin ≠ warehouse data viewer.**
**FLOW-14 uses these primitives — it does NOT redefine them.**

---

## DESIGN RECORDS DR-58–DR-59

### DR-58: Immutable Raw Zone (Bronze Layer)
**Decision:** All raw payloads ingested from external SaaS APIs and webhooks are
stored as append-only, immutable JSON documents. Records are NEVER updated or deleted
in the raw zone. If a source record is corrected upstream, a new version is appended
with a monotonically increasing `_version` counter and `_ingestTimestamp`.
**Rationale:** Raw zone immutability serves three purposes: (1) audit trail for
compliance — every external record ever received is preserved; (2) replay capability
— any downstream processing error can be corrected by reprocessing raw data; (3)
debugging — the exact API response is available for investigation. This directly
inherits the DR-50 (Immutable Finance Audit Trail) pattern from FLOW-13.
**Enforcement:** AF-7 (Compliance) rejects generated code that calls UpdateDocument
or DeleteDocument on any raw zone index. AF-9 (Judge) validates that raw zone
services use AppendAsync exclusively. CF-192 enforces zone promotion order.
**Scope:** Family 54 (Raw Zone & Landing) — all F438–F441 operations.

### DR-59: Rate Limit as Fabric Guard (Never Per-Connector Code)
**Decision:** All external API rate limit tracking MUST be resolved through CORE FABRIC
(MicroserviceBase cache component) via F430 IRateLimitGuardService. No connector may
implement its own rate limit logic. The guard provides: CheckAsync (can I call?),
RecordCallAsync (track usage), GetHeadroomAsync (how many calls remain?), and
BackoffAsync (wait the computed exponential backoff interval).
**Rationale:** External SaaS APIs have different rate limit models (ClickUp: per-token
per-minute; Zoho: per-edition credit-based with concurrency caps). Centralizing rate
limit enforcement prevents accidental limit exhaustion, enables cross-connector quota
visibility, and supports tenant-level ceiling enforcement to prevent one tenant from
starving others.
**Enforcement:** AF-8 (Security) checks that every generated service calling an
external API passes through IRateLimitGuardService.CheckAsync() BEFORE the HTTP call.
CF-210 BFA rule flags any external API call path that bypasses the rate limit guard.
**Scope:** Families 52–53 (Connector & Ingestion) — all external API operations.

---

## FACTORY FAMILY 52 — Connector & Authentication Management
## Factories: F426–F431 | Fabric: DATABASE FABRIC + QUEUE FABRIC + CORE FABRIC

### F426: IConnectorRegistryService
```
FAMILY: 52 — Connector & Authentication Management
PURPOSE: Manage the connector catalog — which external SaaS platforms each tenant
         can connect to, provider-specific configuration (API base URL, version,
         scopes, webhook endpoint), and connector lifecycle (pending→active→suspended→revoked)
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → Elasticsearch provider (connector catalog index)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (connector.registered, connector.suspended)
CREATION: IExternalServiceFactory<IConnectorRegistryService>.CreateAsync(ctx)
METHODS:
  RegisterConnectorAsync(tenantId, connectorDoc)                 → DataProcessResult<Dictionary>
  GetConnectorAsync(tenantId, connectorId)                       → DataProcessResult<Dictionary>
  ListConnectorsAsync(tenantId, filter)                          → DataProcessResult<List<Dictionary>>
  UpdateConnectorConfigAsync(tenantId, connectorId, patchDoc)    → DataProcessResult<Dictionary>
  SuspendConnectorAsync(tenantId, connectorId, reason)           → DataProcessResult<bool>
  RevokeConnectorAsync(tenantId, connectorId)                    → DataProcessResult<bool>
  GetConnectorCapabilitiesAsync(tenantId, connectorId)           → DataProcessResult<Dictionary>
DNA COMPLIANCE:
  DNA-1: All connector documents as Dictionary<string,object> via ParseDocument
  DNA-2: BuildSearchFilter skips empty provider/status/type fields
  DNA-3: DataProcessResult<T> on all returns — never throw
  DNA-4: Extends MicroserviceBase (19 components inherited)
  DNA-5: tenant_id on EVERY query — connectors are tenant-scoped
  DNA-6: DynamicController — no ConnectorRegistryController entity class
  DNA-9: SoD — connector admin role required for Register/Suspend/Revoke
MACHINE: Connector lifecycle state machine (pending→active→suspended→revoked), HMAC webhook secret generation
FREEDOM: Supported provider list (ClickUp, Zoho CRM, Zoho Desk, future), API versions, base URLs, OAuth scopes
```

### F427: ICredentialVaultService
```
FAMILY: 52 — Connector & Authentication Management
PURPOSE: Securely store, retrieve, and manage OAuth access/refresh tokens, personal
         access tokens (PATs), and webhook secrets for each tenant's external connectors.
         Tokens encrypted at rest. Decrypted only at point of use. Never logged.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → PostgreSQL provider (encrypted credential store)
  Audit:      DATABASE FABRIC (Skill 05) → Elasticsearch provider (credential access audit log)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (credential.stored, credential.rotated, credential.expired)
CREATION: IExternalServiceFactory<ICredentialVaultService>.CreateAsync(ctx)
METHODS:
  StoreCredentialAsync(tenantId, connectorId, credentialDoc)     → DataProcessResult<Dictionary>
  GetCredentialAsync(tenantId, connectorId)                      → DataProcessResult<Dictionary>
  RotateCredentialAsync(tenantId, connectorId, newCredentialDoc) → DataProcessResult<Dictionary>
  RevokeCredentialAsync(tenantId, connectorId)                   → DataProcessResult<bool>
  GetExpiryStatusAsync(tenantId, connectorId)                    → DataProcessResult<Dictionary>
  ValidateCredentialAsync(tenantId, connectorId)                 → DataProcessResult<bool>
DNA COMPLIANCE: DNA-1 through DNA-6 + DNA-9 (SoD: vault admin ≠ connector user)
CRITICAL:
  - Credential data is ALWAYS encrypted before StoreDocument. AES-256-GCM with per-tenant key.
  - GetCredentialAsync returns decrypted token ONLY in memory; NEVER stored in cache/log.
  - Credential access emits audit event (who, when, which connector, which operation).
  - CF-204: Tenant credentials NEVER cross isolation boundaries.
  - DR-59: Rate limit guard has NO access to decrypted tokens — separate concerns.
MACHINE: Encryption algorithm (AES-256-GCM), key derivation, audit event emission
FREEDOM: Per-tenant encryption key rotation schedule, credential expiry warning window
```

### F428: ITokenRefreshService
```
FAMILY: 52 — Connector & Authentication Management
PURPOSE: Manage OAuth 2.0 token refresh lifecycle — proactively refresh tokens before
         expiry, handle refresh failures with retry + alerting, support Zoho CRM's
         expiring-access-token-with-refresh-token model and ClickUp's OAuth authorization
         code flow. Provider-agnostic: never imports ClickUp or Zoho SDK.
FABRIC RESOLUTION:
  Primary:    CORE FABRIC (Skill 01 — MicroserviceBase HTTP component)
  State:      DATABASE FABRIC (Skill 05) → PostgreSQL provider (refresh state tracking)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (token.refreshed, token.refresh_failed)
CREATION: IExternalServiceFactory<ITokenRefreshService>.CreateAsync(ctx)
METHODS:
  RefreshTokenAsync(tenantId, connectorId)                       → DataProcessResult<Dictionary>
  ScheduleRefreshAsync(tenantId, connectorId, expiresAt)         → DataProcessResult<bool>
  GetRefreshStateAsync(tenantId, connectorId)                    → DataProcessResult<Dictionary>
  HandleRefreshFailureAsync(tenantId, connectorId, error)        → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - Proactive refresh: schedule at 80% of token TTL (FREEDOM configurable).
  - Zoho CRM tokens expire; refresh tokens are long-lived but single-use (new refresh
    token issued with each refresh). ITokenRefreshService stores the NEW refresh token
    atomically via F427 ICredentialVaultService.RotateCredentialAsync.
  - ClickUp OAuth tokens: lifetime depends on plan. Refresh via standard OAuth 2.0 flow.
  - All HTTP calls to token endpoints go through CORE FABRIC — NEVER import provider SDK.
  - Refresh failure escalation: retry 3x → suspend connector → alert → DLQ.
MACHINE: Token refresh protocol (OAuth 2.0 RFC 6749), proactive scheduling math (80% TTL)
FREEDOM: Refresh window percentage, retry count, escalation policy, provider token endpoint URLs
```

### F429: IWebhookReceiverService
```
FAMILY: 52 — Connector & Authentication Management
PURPOSE: Receive, verify, normalize, and fan out webhook events from external SaaS
         platforms. ClickUp webhooks verified via HMAC-SHA256 signature in X-Signature
         header. Zoho webhooks verified via organization-scoped validation. All verified
         events normalized to a standard envelope and published to QUEUE FABRIC.
FABRIC RESOLUTION:
  Primary:    QUEUE FABRIC (Skill 04) → Redis Streams (webhook.received.{provider} streams)
  State:      DATABASE FABRIC (Skill 05) → Redis provider (webhook dedup cache, TTL: 24h)
  Audit:      DATABASE FABRIC (Skill 05) → Elasticsearch provider (webhook event audit log)
CREATION: IExternalServiceFactory<IWebhookReceiverService>.CreateAsync(ctx)
METHODS:
  ReceiveWebhookAsync(tenantId, connectorId, headers, body)      → DataProcessResult<Dictionary>
  VerifySignatureAsync(tenantId, connectorId, signature, payload) → DataProcessResult<bool>
  NormalizePayloadAsync(tenantId, provider, rawPayload)           → DataProcessResult<Dictionary>
  DeduplicateAsync(tenantId, eventId, idempotencyKey)             → DataProcessResult<bool>
  FanoutToStreamAsync(tenantId, normalizedEvent)                  → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - HMAC verification is MACHINE — cryptographic, never configurable.
  - ClickUp: X-Signature contains HMAC-SHA256 hash using per-webhook secret (stored in F427).
  - Zoho: webhooks require orgId validation + API key verification.
  - Deduplication uses Redis with eventId as key + 24h TTL to prevent duplicate processing.
  - Normalized envelope: { tenantId, connectorId, provider, eventType, entityType, entityId,
    timestamp, rawPayload, _webhookReceivedAt, _signatureVerified: true }
  - CF-211: Webhook HMAC MUST verify before processing. Unsigned = reject + audit + alert.
  - All raw webhook payloads also land in F438 IRawLandingService (Bronze zone).
MACHINE: HMAC-SHA256 verification, deduplication logic, normalized envelope schema
FREEDOM: Dedup TTL, supported webhook event types per provider, fan-out stream routing
```

### F430: IRateLimitGuardService
```
FAMILY: 52 — Connector & Authentication Management
PURPOSE: Centralized rate limit tracking and enforcement for all external API calls.
         Tracks per-token, per-connector, per-tenant usage against configurable ceilings.
         Provides exponential backoff calculation on 429 responses. Prevents one tenant
         from exhausting shared API quotas across the platform.
FABRIC RESOLUTION:
  Primary:    CORE FABRIC (Skill 01 — MicroserviceBase cache component) → Redis sliding window
  Metrics:    DATABASE FABRIC (Skill 05) → Elasticsearch provider (rate limit metrics history)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (ratelimit.warning, ratelimit.exceeded)
CREATION: IExternalServiceFactory<IRateLimitGuardService>.CreateAsync(ctx)
METHODS:
  CheckAsync(tenantId, connectorId, operationType)               → DataProcessResult<bool>
  RecordCallAsync(tenantId, connectorId, operationType, status)  → DataProcessResult<Dictionary>
  GetHeadroomAsync(tenantId, connectorId)                        → DataProcessResult<Dictionary>
  BackoffAsync(tenantId, connectorId, retryAttempt)              → DataProcessResult<TimeSpan>
  GetUsageReportAsync(tenantId, connectorId, timeRange)          → DataProcessResult<Dictionary>
  SetTenantCeilingAsync(tenantId, connectorId, maxCallsPerMin)   → DataProcessResult<bool>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - CF-210: Rate limit MUST be checked BEFORE every external API call. Bypass = BUILD FAILURE.
  - DR-59: This IS the centralized rate limit guard — connectors MUST NOT implement their own.
  - ClickUp model: per-token limits (100/min for Business; higher for Enterprise). F430
    tracks per-token usage via sliding window in Redis.
  - Zoho model: edition-based credits per day + concurrency cap. F430 tracks both daily
    credit consumption AND concurrent request count.
  - Backoff formula: min(baseDelay * 2^retryAttempt + jitter, maxDelay). MACHINE — never hardcode delays.
  - Tenant ceiling: prevents noisy-neighbor via per-tenant max calls/min (FREEDOM config).
  - Headroom exposed for scheduling: "you have 47 calls remaining this minute."
MACHINE: Sliding window counter logic, exponential backoff formula, concurrent request counting
FREEDOM: Per-provider base limits (ClickUp 100/min, Zoho edition-based), per-tenant ceiling
         override, backoff base delay, max delay, jitter range, warning threshold percentage
```

### F431: IConnectionHealthService
```
FAMILY: 52 — Connector & Authentication Management
PURPOSE: Monitor the liveness and health of each tenant's external connectors.
         Probes API endpoints for availability, tracks response times, monitors
         quota headroom, and triggers suspension when health degrades below threshold.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → Elasticsearch provider (health history index)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (connection.healthy, connection.degraded, connection.failed)
CREATION: IExternalServiceFactory<IConnectionHealthService>.CreateAsync(ctx)
METHODS:
  ProbeHealthAsync(tenantId, connectorId)                        → DataProcessResult<Dictionary>
  GetHealthHistoryAsync(tenantId, connectorId, timeRange)        → DataProcessResult<List<Dictionary>>
  GetQuotaHeadroomAsync(tenantId, connectorId)                   → DataProcessResult<Dictionary>
  EvaluateHealthStatusAsync(tenantId, connectorId)               → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6
MACHINE: Health probe protocol (HTTP HEAD + response time measurement), degradation detection
FREEDOM: Probe interval, degradation threshold (response time, error rate), suspension policy,
         notification targets
```

---

## FACTORY FAMILY 53 — Ingestion Orchestration
## Factories: F432–F437 | Fabric: QUEUE FABRIC + DATABASE FABRIC + CORE FABRIC

### F432: ISyncJobSchedulerService
```
FAMILY: 53 — Ingestion Orchestration
PURPOSE: Schedule, dispatch, and manage sync jobs for data ingestion from external
         SaaS connectors. Supports cron-based scheduling (hourly, daily) and event-triggered
         dispatch (e.g., webhook burst triggers reconciliation sync). All jobs are
         tenant-scoped. Concurrent job limits enforced per tenant.
FABRIC RESOLUTION:
  Primary:    QUEUE FABRIC (Skill 04) → Redis Streams (syncjob.scheduled, syncjob.dispatched)
  State:      DATABASE FABRIC (Skill 05) → PostgreSQL provider (job definitions + schedules)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (syncjob.completed, syncjob.failed)
CREATION: IExternalServiceFactory<ISyncJobSchedulerService>.CreateAsync(ctx)
METHODS:
  ScheduleJobAsync(tenantId, connectorId, jobDefinition)         → DataProcessResult<Dictionary>
  DispatchJobAsync(tenantId, jobId)                              → DataProcessResult<Dictionary>
  GetJobStatusAsync(tenantId, jobId)                             → DataProcessResult<Dictionary>
  ListJobsAsync(tenantId, filter)                                → DataProcessResult<List<Dictionary>>
  PauseJobAsync(tenantId, jobId)                                 → DataProcessResult<bool>
  ResumeJobAsync(tenantId, jobId)                                → DataProcessResult<bool>
  CancelJobAsync(tenantId, jobId, reason)                        → DataProcessResult<bool>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - Per-tenant concurrent job limit enforced (FREEDOM config, default: 3).
  - Job dispatch checks F430 IRateLimitGuardService.GetHeadroomAsync() before dispatching.
  - Job state machine: SCHEDULED → DISPATCHED → RUNNING → COMPLETED/FAILED/CANCELLED.
  - Failed jobs emitted to DLQ with error sampling for diagnostics.
MACHINE: Job state machine, concurrent limit enforcement, dispatch-before-rate-check ordering
FREEDOM: Cron expressions per connector per tenant, concurrent job limit, retry policy,
         job timeout, priority levels
```

### F433: IIncrementalCursorService
```
FAMILY: 53 — Ingestion Orchestration
PURPOSE: Manage cursor/watermark state for incremental data sync. Tracks the latest
         successfully synced record per entity type per connector per tenant. Enables
         resumable sync: after crash or failure, resume from last committed cursor.
         Cursor commit is atomic with raw landing write via EP-4 durable saga checkpoint.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → PostgreSQL provider (cursor state table)
CREATION: IExternalServiceFactory<IIncrementalCursorService>.CreateAsync(ctx)
METHODS:
  GetCursorAsync(tenantId, connectorId, entityType)              → DataProcessResult<Dictionary>
  CommitCursorAsync(tenantId, connectorId, entityType, cursor)   → DataProcessResult<bool>
  ResetCursorAsync(tenantId, connectorId, entityType)            → DataProcessResult<bool>
  GetCursorHistoryAsync(tenantId, connectorId, entityType)       → DataProcessResult<List<Dictionary>>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - CF-193: Cursor MUST advance monotonically — never go backward (except explicit reset).
  - IR-168-4: Cursor MUST be committed via EP-4 checkpoint BEFORE advancing to next page.
  - Cursor format is provider-agnostic: { "value": <any>, "type": "timestamp|offset|page",
    "committedAt": <utc>, "recordCount": <int> }. Stored as Dictionary<string,object> (DNA-1).
  - ResetCursorAsync is PRIVILEGED — requires connector admin role (DNA-9 SoD).
MACHINE: Cursor monotonic advancement logic, EP-4 atomic commit
FREEDOM: Cursor type per provider per entity (timestamp for Zoho `If-Modified-Since`,
         page offset for ClickUp pagination)
```

### F434: IApiPollingService
```
FAMILY: 53 — Ingestion Orchestration
PURPOSE: Execute paginated REST API polling against external SaaS endpoints. Handles
         pagination patterns (offset, cursor, page token), response parsing, and rate
         limit integration. Provider-agnostic: NEVER imports ClickUp or Zoho SDK.
         All HTTP calls go through CORE FABRIC's HTTP component.
FABRIC RESOLUTION:
  Primary:    CORE FABRIC (Skill 01 — MicroserviceBase HTTP component)
CREATION: IExternalServiceFactory<IApiPollingService>.CreateAsync(ctx)
METHODS:
  PollPageAsync(tenantId, connectorId, endpointConfig, cursor)   → DataProcessResult<Dictionary>
  ParsePaginationAsync(responseHeaders, responseBody)            → DataProcessResult<Dictionary>
  HandleErrorResponseAsync(tenantId, connectorId, statusCode, responseBody) → DataProcessResult<Dictionary>
  BuildRequestAsync(tenantId, connectorId, endpointConfig, cursor) → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - IR-168-8: Provider SDK MUST NOT be imported. All calls via CORE FABRIC HTTP.
  - Credentials injected at request-build time from F427 ICredentialVaultService.
  - Rate limit checked via F430 BEFORE every PollPageAsync call (CF-210).
  - ClickUp: 100 tasks/page, pagination via `page` offset. Response includes `last_page` flag.
  - Zoho CRM: records per `GET /{module_api_name}`, pagination via `page` + `per_page`.
    Supports `If-Modified-Since` header for incremental (consumed by F433 cursor).
  - Zoho Desk: root endpoint `desk.zoho.com/api/v1`, requires Authorization + orgId header.
  - Error handling: 429 → F430.BackoffAsync; 401 → F428.RefreshTokenAsync; 5xx → retry per policy.
  - Response body stored as Dictionary<string,object> via ParseDocument — NEVER deserialized to typed model.
MACHINE: HTTP request construction, pagination parsing, error status routing
FREEDOM: Endpoint URL patterns per provider, page size, auth header format, pagination style,
         error retry policy, request timeout
```

### F435: IWebhookIngestionService
```
FAMILY: 53 — Ingestion Orchestration
PURPOSE: Process deduplicated webhook events received by F429 IWebhookReceiverService.
         Transforms normalized webhook events into sync operations: create/update/delete
         records in the raw landing zone (F438). Maintains ordering within entity type.
FABRIC RESOLUTION:
  Primary:    QUEUE FABRIC (Skill 04) → Redis Streams (webhook.ingestion consumer group)
  State:      DATABASE FABRIC (Skill 05) → Redis provider (processing state, dedup window)
CREATION: IExternalServiceFactory<IWebhookIngestionService>.CreateAsync(ctx)
METHODS:
  ProcessWebhookEventAsync(tenantId, normalizedEvent)            → DataProcessResult<Dictionary>
  MapToSyncOperationAsync(tenantId, eventType, payload)          → DataProcessResult<Dictionary>
  BatchProcessAsync(tenantId, events)                            → DataProcessResult<Dictionary>
  GetProcessingStateAsync(tenantId, connectorId)                 → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - Webhook events are consumed from QUEUE FABRIC consumer group — not polled from API.
  - Each event mapped to sync operation: taskCreated → append raw, taskUpdated → append raw version,
    dealStageChanged → append raw, ticketCreated → append raw.
  - Ordering: events for same entityId processed in timestamp order (Redis Streams ordering).
  - Dead webhook events (failed 3x) → DLQ + alert via F457 IFreshnessCheckService.
MACHINE: Event-to-sync-operation mapping, ordering enforcement, DLQ routing
FREEDOM: Supported event types per provider, batch size, DLQ retry limit
```

### F436: IBackfillOrchestratorService
```
FAMILY: 53 — Ingestion Orchestration
PURPOSE: Orchestrate historical data backfill (initial load or gap-fill) from external
         SaaS APIs. Processes date-range slices to manage API quotas. Uses EP-4 durable
         saga for crash recovery — if interrupted mid-backfill, resumes from last checkpoint.
FABRIC RESOLUTION:
  Primary:    QUEUE FABRIC (Skill 04) → Redis Streams (backfill.slice.dispatched, backfill.slice.completed)
  State:      DATABASE FABRIC (Skill 05) → PostgreSQL provider (backfill saga state via EP-4)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (backfill.started, backfill.completed, backfill.failed)
CREATION: IExternalServiceFactory<IBackfillOrchestratorService>.CreateAsync(ctx)
METHODS:
  StartBackfillAsync(tenantId, connectorId, entityType, dateRange) → DataProcessResult<Dictionary>
  ProcessSliceAsync(tenantId, backfillId, sliceDefinition)       → DataProcessResult<Dictionary>
  CheckpointAsync(tenantId, backfillId, sliceId, cursorState)    → DataProcessResult<bool>
  ResumeBackfillAsync(tenantId, backfillId)                      → DataProcessResult<Dictionary>
  GetBackfillProgressAsync(tenantId, backfillId)                 → DataProcessResult<Dictionary>
  CancelBackfillAsync(tenantId, backfillId, reason)              → DataProcessResult<bool>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - EP-4 integration: each slice is an EP-4 saga step with checkpoint after raw landing write.
  - CF-212: Backfill MUST NOT run during peak ingestion hours (FREEDOM configurable).
  - Date-range slicing: split total range into day/week slices to avoid API quota exhaustion.
    Slice size is FREEDOM configurable per provider per entity.
  - Rate limit: each slice checks F430 before polling. If headroom exhausted, slice pauses.
  - Gap detection: compares raw zone record count vs expected (from API total count) per slice.
  - Backfill state: STARTED → SLICING → PROCESSING → CHECKPOINTING → COMPLETED/FAILED/CANCELLED.
MACHINE: EP-4 saga state machine, date-range slicing algorithm, gap detection
FREEDOM: Slice size (1 day / 1 week / custom), peak hours blackout window, max concurrent
         slices, priority relative to incremental sync
```

### F437: ISyncRunTrackerService
```
FAMILY: 53 — Ingestion Orchestration
PURPOSE: Track the lifecycle and metrics of every sync run (incremental, webhook, or
         backfill). Records: records pulled, records landed, records quarantined, errors
         sampled, duration, rate limit hits. Enables observability + debugging + SLA tracking.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → PostgreSQL provider (sync run records)
  Metrics:    DATABASE FABRIC (Skill 05) → Elasticsearch provider (run metrics for dashboards)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (syncrun.completed, syncrun.failed)
CREATION: IExternalServiceFactory<ISyncRunTrackerService>.CreateAsync(ctx)
METHODS:
  CreateRunAsync(tenantId, connectorId, runType, jobId)          → DataProcessResult<Dictionary>
  UpdateProgressAsync(tenantId, runId, progressDoc)              → DataProcessResult<Dictionary>
  CompleteRunAsync(tenantId, runId, summaryDoc)                  → DataProcessResult<Dictionary>
  FailRunAsync(tenantId, runId, errorDoc)                        → DataProcessResult<Dictionary>
  GetRunAsync(tenantId, runId)                                   → DataProcessResult<Dictionary>
  ListRunsAsync(tenantId, connectorId, filter)                   → DataProcessResult<List<Dictionary>>
  GetRunMetricsAsync(tenantId, connectorId, timeRange)           → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6
MACHINE: Run state machine (CREATED → RUNNING → COMPLETED/FAILED), metric aggregation
FREEDOM: Run retention period, error sample size, metric aggregation intervals, alert thresholds
         for failed run count
```

---

## FACTORY FAMILY 54 — Raw Zone & Landing
## Factories: F438–F443 | Fabric: DATABASE FABRIC + QUEUE FABRIC + CORE FABRIC

### F438: IRawLandingService
```
FAMILY: 54 — Raw Zone & Landing
PURPOSE: Append-only storage of immutable JSON payloads from external SaaS APIs and
         webhooks (Bronze zone). Every record that enters the engine through polling or
         webhook is preserved exactly as received. Records partitioned by tenant + provider
         + entity type + ingest date. Supports bulk append for batch processing.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → Elasticsearch provider (raw_landing_{provider}_{entityType} indices)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (raw.landed event per record batch)
CREATION: IExternalServiceFactory<IRawLandingService>.CreateAsync(ctx)
METHODS:
  AppendAsync(tenantId, provider, entityType, rawPayload)        → DataProcessResult<Dictionary>
  BulkAppendAsync(tenantId, provider, entityType, payloads)      → DataProcessResult<Dictionary>
  GetRawRecordAsync(tenantId, provider, entityType, recordId)    → DataProcessResult<Dictionary>
  SearchRawAsync(tenantId, provider, entityType, filter)         → DataProcessResult<List<Dictionary>>
  GetRecordCountAsync(tenantId, provider, entityType, dateRange) → DataProcessResult<long>
  GetLatestIngestTimestampAsync(tenantId, provider, entityType)  → DataProcessResult<DateTime>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - DR-58: Records are IMMUTABLE. AppendAsync and BulkAppendAsync ONLY. NO UpdateDocument. NO DeleteDocument.
  - AF-7 rejects generated code calling Update/Delete on raw zone indices.
  - Every record enriched at append time: { ...<rawPayload>, tenantId, _ingestTimestamp,
    _sourceProvider, _entityType, _sourceRecordId, _version, _syncRunId, _rawHash (SHA-256) }.
  - _rawHash: SHA-256 of the raw payload for integrity verification and deduplication.
  - CF-192: Raw zone is Zone 1. Data MUST land here before moving to staging (Zone 2).
  - Index naming: `raw_{tenantId}_{provider}_{entityType}_YYYYMM` (monthly partitions).
    Tenant-scoped index name prevents cross-tenant data bleed in Elasticsearch.
MACHINE: SHA-256 hash computation, record enrichment, index naming, append-only enforcement
FREEDOM: Index partition strategy (monthly/weekly), record retention period per provider,
         bulk batch size, raw payload size limit
```

### F439: ISchemaRegistryService
```
FAMILY: 54 — Raw Zone & Landing
PURPOSE: Discover, track, and detect drift in source system schemas. Periodically samples
         raw records to detect new fields, removed fields, or type changes. Critical for
         ClickUp custom fields (40+ types) which can be added/removed by any workspace admin
         at any time. Alerts on drift; blocks mart promotion until admin reviews.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → Elasticsearch provider (schema_registry index)
  Events:     QUEUE FABRIC (Skill 04) → Redis Streams (schema.drift_detected, schema.approved)
CREATION: IExternalServiceFactory<ISchemaRegistryService>.CreateAsync(ctx)
METHODS:
  DiscoverSchemaAsync(tenantId, provider, entityType, sampleRecords) → DataProcessResult<Dictionary>
  GetSchemaAsync(tenantId, provider, entityType, version)        → DataProcessResult<Dictionary>
  DetectDriftAsync(tenantId, provider, entityType, newSample)    → DataProcessResult<Dictionary>
  ApproveSchemaChangeAsync(tenantId, schemaChangeId)             → DataProcessResult<bool>
  RejectSchemaChangeAsync(tenantId, schemaChangeId, reason)      → DataProcessResult<bool>
  GetDriftHistoryAsync(tenantId, provider, entityType)           → DataProcessResult<List<Dictionary>>
DNA COMPLIANCE: DNA-1 through DNA-6 + DNA-9 (SoD: schema approval ≠ ingestion operator)
CRITICAL:
  - DR-60: Schema drift detected automatically; promotion to staging requires admin approval (FREEDOM).
  - ClickUp custom fields: GetAccessibleCustomFields API returns current field definitions.
    F439 periodically refreshes and compares against stored schema version.
  - Drift categories: FIELD_ADDED, FIELD_REMOVED, TYPE_CHANGED, ENUM_EXPANDED.
  - FIELD_ADDED: auto-accepted for raw/staging; blocked from mart until admin approves.
  - FIELD_REMOVED: quarantine records missing the field + alert.
  - TYPE_CHANGED: quarantine + alert + require admin approval before staging continues.
MACHINE: Drift detection algorithm (field-by-field comparison), drift categorization
FREEDOM: Schema sample frequency, auto-accept policy for FIELD_ADDED, alert recipients,
         drift severity thresholds
```

### F440: ISourceObjectMapService
```
FAMILY: 54 — Raw Zone & Landing
PURPOSE: Maintain cross-system ID mappings between external SaaS records and internal
         warehouse records. Maps ClickUp taskId ↔ internal staging record, Zoho CRM dealId
         ↔ internal staging record, etc. Enables cross-system joins and lineage tracking.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → PostgreSQL provider (source_object_map table)
CREATION: IExternalServiceFactory<ISourceObjectMapService>.CreateAsync(ctx)
METHODS:
  MapSourceToInternalAsync(tenantId, provider, entityType, sourceId, internalId) → DataProcessResult<Dictionary>
  GetInternalIdAsync(tenantId, provider, entityType, sourceId)   → DataProcessResult<string>
  GetSourceIdAsync(tenantId, internalId)                         → DataProcessResult<Dictionary>
  BatchMapAsync(tenantId, mappings)                              → DataProcessResult<Dictionary>
  GetMappingsByEntityAsync(tenantId, provider, entityType, filter) → DataProcessResult<List<Dictionary>>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - CF-204: Mappings are ALWAYS tenant-scoped. Cross-tenant lookup = BUILD FAILURE.
  - Source IDs are stored as-is from the provider (string). No transformation.
  - Composite key: (tenantId, provider, entityType, sourceId) → unique.
  - Used by F446 IIdentityResolutionService for cross-system user matching.
MACHINE: Composite key uniqueness, mapping immutability (create, never update — new version on change)
FREEDOM: None — this is a MACHINE-only factory. No admin-configurable options.
```

### F441: IReplayBufferService
```
FAMILY: 54 — Raw Zone & Landing
PURPOSE: Trigger reprocessing of raw zone records through the transform pipeline.
         Used when: (1) schema drift resolved and quarantined records need reprocessing,
         (2) transform logic updated and historical records need re-staging,
         (3) identity resolution improved and dim/fact refresh needed.
FABRIC RESOLUTION:
  Primary:    QUEUE FABRIC (Skill 04) → Redis Streams (replay.requested, replay.completed)
  State:      DATABASE FABRIC (Skill 05) → PostgreSQL provider (replay job state)
CREATION: IExternalServiceFactory<IReplayBufferService>.CreateAsync(ctx)
METHODS:
  RequestReplayAsync(tenantId, provider, entityType, dateRange, reason) → DataProcessResult<Dictionary>
  GetReplayStatusAsync(tenantId, replayId)                       → DataProcessResult<Dictionary>
  CancelReplayAsync(tenantId, replayId, reason)                  → DataProcessResult<bool>
  ListReplaysAsync(tenantId, filter)                             → DataProcessResult<List<Dictionary>>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - Replay reads from raw zone (F438 SearchRawAsync) — raw data is immutable, so replay
    is always safe. No data loss risk.
  - Replay publishes raw records back to the transform pipeline via QUEUE FABRIC.
  - Rate-limited: replay jobs respect F430 headroom + per-tenant concurrent limits.
  - CF-192: Replayed records go through the full pipeline: raw → staging → core → mart.
MACHINE: Replay job state machine, raw zone read + re-publish logic
FREEDOM: Max concurrent replays per tenant, replay batch size, priority relative to live ingestion
```

### F442: INormalizerService
```
FAMILY: 54 — Raw Zone & Landing (preprocessing before staging handoff)
PURPOSE: Flatten, normalize, and deduplicate raw JSON records from the Bronze zone
         into staging-ready records. Handles provider-specific normalization: ClickUp
         nested hierarchy flattening, Zoho module record flattening, timestamp standardization
         to UTC, and null/empty field cleanup. Output is a clean Dictionary<string,object>.
FABRIC RESOLUTION:
  Primary:    CORE FABRIC (Skill 01 — ObjectProcessor component via Skill 02)
CREATION: IExternalServiceFactory<INormalizerService>.CreateAsync(ctx)
METHODS:
  NormalizeRecordAsync(tenantId, provider, entityType, rawRecord) → DataProcessResult<Dictionary>
  BatchNormalizeAsync(tenantId, provider, entityType, rawRecords) → DataProcessResult<List<Dictionary>>
  FlattenHierarchyAsync(tenantId, nestedRecord, flatteningRules) → DataProcessResult<Dictionary>
  StandardizeTimestampsAsync(record, sourceTimezone)              → DataProcessResult<Dictionary>
  CleanEmptyFieldsAsync(record)                                  → DataProcessResult<Dictionary>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - All output records are Dictionary<string,object> — NEVER typed models (DNA-1).
  - ClickUp: tasks contain nested custom_fields array → flatten to top-level keys
    with prefix "cf_{field_name}" for each custom field value.
  - Zoho CRM: module records contain lookup fields (Contact_Name, Account_Name) →
    flatten to lookup IDs for join capability.
  - Timestamps: all converted to UTC. Source timezone determined from workspace/org settings.
  - Empty/null fields cleaned via ObjectProcessor (DNA-2 compatible).
MACHINE: Flattening algorithm, UTC conversion, empty field cleanup, dedup hash
FREEDOM: Flattening rules per provider per entity type, custom field prefix format,
         timezone source configuration
```

### F443: ICustomFieldAdapterService
```
FAMILY: 54 — Raw Zone & Landing (preprocessing before staging handoff)
PURPOSE: Dynamically resolve and adapt custom fields from external SaaS platforms,
         especially ClickUp's 40+ custom field types. Maintains a custom field registry
         per tenant per connector and applies type-appropriate value extraction.
         Critical for warehouse correctness — custom fields change without notice.
FABRIC RESOLUTION:
  Primary:    DATABASE FABRIC (Skill 05) → PostgreSQL provider (custom field registry)
CREATION: IExternalServiceFactory<ICustomFieldAdapterService>.CreateAsync(ctx)
METHODS:
  RefreshFieldRegistryAsync(tenantId, connectorId, fieldDefinitions) → DataProcessResult<Dictionary>
  AdaptFieldValueAsync(tenantId, fieldId, fieldType, rawValue)   → DataProcessResult<Dictionary>
  BatchAdaptAsync(tenantId, connectorId, rawRecord)              → DataProcessResult<Dictionary>
  GetFieldRegistryAsync(tenantId, connectorId)                   → DataProcessResult<List<Dictionary>>
  DetectNewFieldsAsync(tenantId, connectorId, rawRecord)         → DataProcessResult<List<Dictionary>>
DNA COMPLIANCE: DNA-1 through DNA-6
CRITICAL:
  - ClickUp custom field types include: short_text, long_text, dropdown, date, number,
    currency, checkbox, email, phone, url, rating, label, relationship, formula, rollup,
    progress, location, tasks, people, files, manual_progress, automatic_progress, etc.
  - Each type requires different value extraction: dropdown → selected option string,
    relationship → list of linked task IDs, people → list of user IDs, date → UTC timestamp.
  - New custom fields detected by comparing rawRecord keys against stored registry.
  - New fields emitted to F439 ISchemaRegistryService for drift tracking.
  - Adapted values are ALWAYS Dictionary<string,object> — NEVER typed custom field models.
MACHINE: Type-specific value extraction logic, new field detection algorithm
FREEDOM: Custom field type mapping overrides, default extraction strategy for unknown types,
         field registry refresh frequency
```

---

## PHASE 1 — DNA COMPLIANCE MATRIX

| Factory | DNA-1 | DNA-2 | DNA-3 | DNA-4 | DNA-5 | DNA-6 | DNA-9 | Total |
|---|---|---|---|---|---|---|---|---|
| F426 IConnectorRegistryService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 7/7 |
| F427 ICredentialVaultService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 7/7 |
| F428 ITokenRefreshService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F429 IWebhookReceiverService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F430 IRateLimitGuardService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F431 IConnectionHealthService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F432 ISyncJobSchedulerService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F433 IIncrementalCursorService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 7/7 |
| F434 IApiPollingService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F435 IWebhookIngestionService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F436 IBackfillOrchestratorService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F437 ISyncRunTrackerService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F438 IRawLandingService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F439 ISchemaRegistryService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 7/7 |
| F440 ISourceObjectMapService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F441 IReplayBufferService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F442 INormalizerService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |
| F443 ICustomFieldAdapterService | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | 6/6 |

**Total: 18 factories, ~82 methods, 100% DNA compliant**
**DNA-9 (SoD) required on: F426 (connector admin), F427 (vault admin), F433 (cursor reset), F439 (schema approval)**

---

## PHASE 1 — FACTORY SUMMARY

| Family | Range | Count | Key Fabrics | Purpose |
|---|---|---|---|---|
| 52 — Connector & Auth | F426–F431 | 6 | DATABASE + QUEUE + CORE | External SaaS connector lifecycle |
| 53 — Ingestion | F432–F437 | 6 | QUEUE + DATABASE + CORE | Sync orchestration + tracking |
| 54 — Raw Zone | F438–F443 | 6 | DATABASE (ES) + QUEUE + CORE | Bronze layer + schema + normalization |
| **Total** | **F426–F443** | **18** | | |

## PHASE 1 — CROSS-REFERENCE TO EXISTING ENGINE

| FLOW-14 Factory | Consumes From | Relationship |
|---|---|---|
| F427 ICredentialVaultService | FLOW-08 F244 ITenantContextService | Tenant context for credential scoping |
| F428 ITokenRefreshService | F427 (vault read/write) | Refresh writes new token to vault |
| F429 IWebhookReceiverService | F427 (webhook secret read) | HMAC verification secret from vault |
| F430 IRateLimitGuardService | CORE FABRIC cache | MicroserviceBase cache component |
| F434 IApiPollingService | F427 (credential), F430 (rate limit) | Auth + throttle before HTTP call |
| F436 IBackfillOrchestratorService | EP-4 Durable Saga | Crash recovery for long-running backfills |
| F438 IRawLandingService | DR-50 pattern (from FLOW-13) | Append-only audit pattern inheritance |
| F439 ISchemaRegistryService | ClickUp Custom Fields API | Dynamic field discovery |
| F442 INormalizerService | Skill 02 ObjectProcessor | DNA-2 compatible field processing |
| F443 ICustomFieldAdapterService | F439 (drift detection feed) | New fields → schema registry |

---

## BACKWARD COMPATIBILITY (Phase 1 Check)

```
F1-F425:  UNCHANGED ✅ (F426-F443 are ADDITIVE — no modifications)
T1-T166:  UNCHANGED ✅ (no task types in P1 — those come in P3/P4)
DR-1-57:  UNCHANGED ✅ (DR-58/59 are ADDITIVE)
CF-1-191: UNCHANGED ✅ (no BFA rules in P1 — those come in P5)
DNA-1-9:  STABLE ✅ (all consumed, none redefined)
EP-1-5:   STABLE ✅ (EP-4 consumed by F436, not redefined)
```

---

## SAVE POINT: FLOW14:P1:COMPLETE ✅

### Recovery Commands
```
"Load P1"                → This file (FLOW14_P1_FACTORIES.md)
"Start P2"               → Generate F444–F465 (Transform + Warehouse + Metrics + Governance)
"Merge P1"               → Append FLOW14_P1_FACTORIES.md → ENGINE_ARCHITECTURE_MERGED.md
"Resume from P1"         → Load FLOW14_PLAN_P0.md + this file + basic_prompt.txt
```

### Next Phase (P2) Will Produce:
- Family 55: Transformation & Staging (F444–F448)
- Family 56: Warehouse Model Layer (F449–F453)
- Family 57: Metrics & Semantic Layer (F454–F456)
- Family 58: Data Quality & Observability (F457–F460)
- Family 59: Warehouse Governance & Tenant Isolation (F461–F465)
- Design Records: DR-60–DR-65
