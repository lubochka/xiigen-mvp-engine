# ENGINE ARCHITECTURE — FLOW-18 DELTA
## DevOps Platforms / Flow Creation Engine
## Extends: ENGINE_ARCHITECTURE_MERGED.md (F1-F465, DR-1-DR-65)
## Range: F466-F508 | Families 60-68 | DR-66-DR-74
## Status: FLOW-18 COMPLETE ✅

---

## OVERVIEW

FLOW-18 extends the XIIGen engine to support **dynamic flow creation and execution by user demand**.
The engine gains: a durable Flow Control Plane, a production-grade Flow Execution Runtime,
multi-tenant identity & isolation, AI-powered flow generation, DevOps integration connectors,
and a flow-aware AI Dispatcher. All components sit exclusively on FABRIC INTERFACES.

Mental model alignment: Jenkins controller/agents/shared-libraries maps to
XIIGen Flow Orchestrator / Master Skills / Flow Template Library.
Azure DevOps suite maps to XIIGen Flow Control Plane + Execution Runtime + Genie DNA.

---

## FACTORY REGISTRY — F466-F508

### FAMILY 60 — Flow Control Plane (F466-F471)

```
F466: IFlowDefinitionRegistryService
  PURPOSE: CRUD, versioning, publish/deprecate lifecycle for flow definitions
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (ES) via IDatabaseService.StoreDocument/SearchDocuments
    SECONDARY → DATABASE FABRIC (PG) via IDatabaseService for version lineage audit trail
  METHODS: RegisterDefinitionAsync, PublishVersionAsync, DeprecateVersionAsync,
           GetDefinitionAsync, ListVersionsAsync — all return DataProcessResult<T>
  DNA COMPLIANCE:
    DNA-1: definitions stored as Dictionary<string,object> via ParseDocument
    DNA-2: BuildSearchFilter skips empty name/owner/status fields
    DNA-4: FlowDefinitionRegistryServiceImpl extends MicroserviceBase
    DNA-5: tenantId on every index/query
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"elasticsearch"})
  FREEDOM CONFIG: ES index name, version retention policy, max versions per definition

F467: IFlowVersionService
  PURPOSE: Immutable version artifact management — store, retrieve, validate, diff
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (PG) via IDatabaseService for transactional version records
    SECONDARY → DATABASE FABRIC (ES) for full-text search across version definitions
  METHODS: CreateVersionAsync, GetVersionAsync, CompareVersionsAsync,
           ValidateVersionSchemaAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-2, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"postgresql"})
  FREEDOM CONFIG: schema validation strictness, compatibility check mode (strict/loose)

F468: IFlowTemplateLibraryService
  PURPOSE: Reusable step groups / subflow templates ("Jenkins Shared Libraries" equivalent)
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (ES) via IDatabaseService.StoreDocument/SearchDocuments
    SECONDARY → AI ENGINE FABRIC (Skill 07) via IAiProvider.GenerateAsync for template suggestions
  METHODS: PublishTemplateAsync, SearchTemplatesAsync, InstantiateTemplateAsync,
           TagTemplateAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-2, DNA-4, DNA-5, DNA-6 (DynamicController serves templates)
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"elasticsearch"})
  FREEDOM CONFIG: template visibility (public/private/tenant), max template size

F469: IFlowSchemaValidatorService
  PURPOSE: JSON Schema 2020-12 validation for flow definitions and runtime payloads
  FABRIC RESOLUTION:
    PRIMARY → CORE FABRIC (Skill 01 — ObjectProcessor) via MicroserviceBase.ObjectProcessor
  METHODS: ValidateDefinitionAsync, ValidatePayloadAsync, GenerateSchemaAsync,
           CheckCompatibilityAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1 (validates that payloads use Dictionary not typed models), DNA-4
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"core"})
  FREEDOM CONFIG: validation mode (strict/warn/off), allowed JSON Schema keywords

F470: IFlowPolicyService
  PURPOSE: Approval requirements, authorization constraints, rate limits, PII redaction rules
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (PG) via IDatabaseService for policy records
    SECONDARY → DATABASE FABRIC (Redis) via IDatabaseService for real-time policy cache
  METHODS: GetPolicyAsync, EvaluatePolicyAsync, EnforcePolicyAsync,
           RegisterPolicyAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-2, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"postgresql"})
  FREEDOM CONFIG: default policy template, PII field patterns, rate limit windows

F471: ITriggerDefinitionService
  PURPOSE: Flow trigger registration — manual/API, webhook, timer/schedule, event subscription
  FABRIC RESOLUTION:
    PRIMARY → QUEUE FABRIC (Redis Streams) via IQueueService for event-based triggers
    SECONDARY → DATABASE FABRIC (PG) via IDatabaseService for trigger config persistence
  METHODS: RegisterTriggerAsync, FireTriggerAsync, DisableTriggerAsync,
           ListTriggersAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-2, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"redis-streams"})
  FREEDOM CONFIG: trigger types enabled per tenant, schedule CRON format, webhook HMAC key
```

### FAMILY 61 — Flow Execution Runtime (F472-F477)

```
F472: IFlowExecutionService
  PURPOSE: Lifecycle management of flow execution instances — start, pause, resume, cancel
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (PG) via IDatabaseService for transactional execution state
    SECONDARY → QUEUE FABRIC (Redis Streams) via IQueueService for execution events
  METHODS: StartExecutionAsync, PauseExecutionAsync, ResumeExecutionAsync,
           CancelExecutionAsync, GetExecutionAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3 (DataProcessResult — never throw), DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"postgresql"})
  FREEDOM CONFIG: max concurrent executions per tenant, default timeout, retention period
  STATE MACHINE:
    CREATED → RUNNING → PAUSED|CANCELED|SUCCEEDED|FAILED
    PAUSED → RUNNING (only via HardStopApproval event)

F473: IStepExecutionService
  PURPOSE: Per-step tracking: status, attempts, timings, error info, retry scheduling
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (PG) via IDatabaseService for step records
    SECONDARY → QUEUE FABRIC (Redis Streams) via IQueueService for step events
  METHODS: CreateStepExecutionAsync, UpdateStepStatusAsync, RecordStepOutputAsync,
           ScheduleRetryAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"postgresql"})
  FREEDOM CONFIG: max retry attempts, backoff strategy (linear/exponential/fixed)
  STATE MACHINE:
    PENDING → DISPATCHED → RUNNING → SUCCEEDED|FAILED|TIMED_OUT
    FAILED|TIMED_OUT → RETRY_SCHEDULED → DISPATCHED (bounded by policy)

F474: IExecutionStateService
  PURPOSE: Durable checkpoint persistence — evaluated variables, current step, trace context
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (PG) via IDatabaseService — transactional, ACID guarantees
  METHODS: SaveCheckpointAsync, LoadCheckpointAsync, AdvanceCheckpointAsync,
           RollbackCheckpointAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"postgresql"})
  FREEDOM CONFIG: checkpoint compression, snapshot frequency, checkpoint retention days
  KEY INVARIANT: checkpoint saved BEFORE advancing to next step (mirrors EP-4 cursor pattern)

F475: IHardStopApprovalService
  PURPOSE: Manual approval gate — pause execution, notify approvers, collect decision
  FABRIC RESOLUTION:
    PRIMARY → QUEUE FABRIC (Redis Streams) via IQueueService for approval request/response events
    SECONDARY → DATABASE FABRIC (PG) via IDatabaseService for approval records and audit
  METHODS: RequestApprovalAsync, SubmitApprovalDecisionAsync, TimeoutApprovalAsync,
           GetApprovalStatusAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"redis-streams"})
  FREEDOM CONFIG: approver roles, timeout duration, escalation path, notification channels

F476: IRetrySchedulerService
  PURPOSE: Bounded retry with backoff — idempotency-aware retry scheduling
  FABRIC RESOLUTION:
    PRIMARY → QUEUE FABRIC (Redis Streams) via IQueueService for retry queue
    SECONDARY → DATABASE FABRIC (PG) via IDatabaseService for retry tracking
  METHODS: ScheduleRetryAsync, CancelRetryAsync, GetRetryStatusAsync,
           PurgeExpiredRetriesAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"redis-streams"})
  FREEDOM CONFIG: max retries per step type, backoff multiplier, jitter strategy

F477: IIdempotencyService
  PURPOSE: Deduplication of non-idempotent operations across at-least-once execution
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (Redis) via IDatabaseService for fast dedup key lookup
    SECONDARY → DATABASE FABRIC (PG) via IDatabaseService for durable idempotency records
  METHODS: CheckIdempotencyKeyAsync, RegisterIdempotencyKeyAsync,
           GetCachedResponseAsync, ExpireKeyAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"redis"})
  FREEDOM CONFIG: key TTL, scope (tenant + endpoint), response cache max size
```

### FAMILY 62 — Step & Connector Layer (F478-F482)

```
F478: IStepDispatcherService
  PURPOSE: Routes step tasks from orchestrator to skill workers via queue
  FABRIC RESOLUTION:
    PRIMARY → QUEUE FABRIC (Redis Streams) via IQueueService — Main→Consumed→Archive→DLQ
  METHODS: DispatchStepAsync, AcknowledgeStepAsync, RequeueStepAsync,
           GetDispatchStatusAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"redis-streams"})
  FREEDOM CONFIG: worker labels/capabilities, queue priorities, DLQ threshold

F479: IFlowConnectorRegistryService
  PURPOSE: Flow-scoped connector registration (distinct from F426 DWH connector registry)
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (PG) via IDatabaseService for connector records
  METHODS: RegisterConnectorAsync, GetConnectorAsync, TestConnectorAsync,
           ListConnectorsAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-2, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"postgresql"})
  FREEDOM CONFIG: allowed connector types (oauth/apikey/mtls/webhook), rotation policy

F480: ICredentialResolverService
  PURPOSE: Per-tenant credential resolution for connectors — never exposes raw secrets
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (PG encrypted) via IDatabaseService with encryption at rest
  METHODS: ResolveCredentialAsync, RotateCredentialAsync, RevokeCredentialAsync,
           AuditCredentialAccessAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"postgresql-encrypted"})
  KEY INVARIANT: credentials NEVER returned in raw form — only resolved tokens/headers

F481: IWebhookSourceService
  PURPOSE: External push-based event capture for flow triggers with HMAC verification
  FABRIC RESOLUTION:
    PRIMARY → QUEUE FABRIC (Redis Streams) via IQueueService for ingested events
    SECONDARY → DATABASE FABRIC (Redis) via IDatabaseService for HMAC dedup
  METHODS: ReceiveWebhookAsync, VerifyHmacAsync, PublishWebhookEventAsync,
           RegisterWebhookEndpointAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"redis-streams"})
  KEY INVARIANT: HMAC verification BEFORE any processing (mirrors INV-14-7)

F482: IStepContractService
  PURPOSE: Step type contract registry — inputs, outputs, retry policy, side-effect class
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (ES) via IDatabaseService for contract search/discovery
  METHODS: RegisterStepContractAsync, ValidateStepInputAsync, GetStepContractAsync,
           ListStepContractsAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-2, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"elasticsearch"})
  FREEDOM CONFIG: allowed step types per tenant tier, input validation strictness
```

### FAMILY 63 — Multi-Tenant Identity Layer (F483-F488)

```
F483: ITenantRegistryService
  PURPOSE: Canonical tenant control plane anchor — tenant model, status, tier, region, isolation class
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (PG) via IDatabaseService — source of truth for tenant identity
  METHODS: ProvisionTenantAsync, SuspendTenantAsync, GetTenantAsync,
           UpdateTenantConfigAsync, ListTenantsAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"postgresql"})
  FREEDOM CONFIG: supported isolation classes (pool/bridge/silo), default tier, regions

F484: ITenantContextMiddlewareService
  PURPOSE: Request-scoped tenant resolution at ingress — resolves tenant from domain/token/path
  FABRIC RESOLUTION:
    PRIMARY → CORE FABRIC (Skill 01 — MicroserviceBase) — middleware layer, no DB call on hot path
    SECONDARY → DATABASE FABRIC (Redis) via IDatabaseService for tenant cache
  METHODS: ResolveTenantAsync, SetTenantContextAsync, ValidateTenantContextAsync,
           ClearTenantContextAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-4, DNA-5 (THIS service IS the DNA-5 enforcement point)
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"core"})
  KEY INVARIANT: EVERY request must pass through this middleware — missing tenantId = BUILD FAILURE

F485: ITenantConfigService
  PURPOSE: Hierarchical config — global defaults → tenant overrides → environment overrides
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (PG) via IDatabaseService for config persistence
    SECONDARY → DATABASE FABRIC (Redis) via IDatabaseService for config cache (hot path)
  METHODS: GetConfigAsync, SetConfigAsync, GetEffectiveConfigAsync,
           RollbackConfigAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-2, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"postgresql"})
  FREEDOM CONFIG: config categories (identity/quotas/features/observability), version retention

F486: IScimProvisioningService
  PURPOSE: Enterprise identity provisioning via SCIM 2.0 — HR-driven user/group lifecycle
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (PG) via IDatabaseService for user/group records
    SECONDARY → QUEUE FABRIC (Redis Streams) via IQueueService for provisioning events
  METHODS: ProvisionUserAsync, DeprovisionUserAsync, SyncGroupAsync,
           GetScimResourceAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"postgresql"})
  FREEDOM CONFIG: SCIM endpoint per tenant, user attribute mapping, group sync strategy

F487: ISamlFederationService
  PURPOSE: Enterprise SSO via SAML 2.0 — per-tenant IdP federation
  FABRIC RESOLUTION:
    PRIMARY → CORE FABRIC (HTTP) via MicroserviceBase for SAML assertion exchange
    SECONDARY → DATABASE FABRIC (PG) via IDatabaseService for IdP metadata cache
  METHODS: InitiateSamlFlowAsync, ValidateSamlAssertionAsync, MapSamlClaimsAsync,
           RegisterIdpMetadataAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"core-http"})
  FREEDOM CONFIG: SP metadata URL, assertion consumer service URL, clock skew tolerance

F488: IOidcTokenService
  PURPOSE: OAuth 2.0 + OIDC token issuance and validation with tenant claims
  FABRIC RESOLUTION:
    PRIMARY → CORE FABRIC (HTTP) via MicroserviceBase for OIDC discovery/token exchange
    SECONDARY → DATABASE FABRIC (PG) via IDatabaseService for token audit
  METHODS: IssueTokenAsync, ValidateTokenAsync, RefreshTokenAsync,
           RevokeTokenAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"core-http"})
  FREEDOM CONFIG: token lifetime, tenant claim name, scopes, JWKS rotation interval
```

### FAMILY 64 — Tenant Data Isolation (F489-F492)

```
F489: ITenantRowLevelSecurityService
  PURPOSE: Database-level tenant isolation via RLS policies (distinct from F463 warehouse RLS)
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (PG) via IDatabaseService — enforces RLS policies on all tables
  METHODS: EnableRlsAsync, CreateTenantPolicyAsync, SetSessionTenantAsync,
           ValidateIsolationAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-4, DNA-5 (enforces DNA-5 at DB layer as defense-in-depth)
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"postgresql-rls"})
  PATTERN: ALTER TABLE x ENABLE ROW LEVEL SECURITY; CREATE POLICY tenant_isolation ON x
           USING (tenant_id = current_setting('app.current_tenant')::uuid)
  KEY INVARIANT: RLS enabled before any tenant data written — no exceptions

F490: ITenantSchemaMigrationService
  PURPOSE: Per-tenant schema migration orchestration for bridge/silo isolation models
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (PG) via IDatabaseService for migration execution
    SECONDARY → QUEUE FABRIC (Redis Streams) via IQueueService for migration event fan-out
  METHODS: PlanMigrationAsync, ExecuteMigrationAsync, RollbackMigrationAsync,
           GetMigrationStatusAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"postgresql"})
  FREEDOM CONFIG: migration strategy (expand/migrate/contract), parallel migration slots

F491: ITenantQuotaService
  PURPOSE: Per-tenant resource quotas — API rate limits, execution concurrency, storage caps
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (Redis) via IDatabaseService for real-time quota tracking
    SECONDARY → DATABASE FABRIC (ES) via IDatabaseService for quota metrics history
  METHODS: CheckQuotaAsync, ConsumeQuotaAsync, ResetQuotaAsync,
           GetQuotaUsageAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"redis"})
  FREEDOM CONFIG: quota limits per tier (requests/min, concurrent executions, storage GB)

F492: ITenantFeatureFlagService
  PURPOSE: Per-tenant feature flag and entitlement evaluation
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (PG) via IDatabaseService for flag definitions
    SECONDARY → DATABASE FABRIC (Redis) via IDatabaseService for evaluation cache
  METHODS: IsEnabledAsync, GetEntitlementAsync, SetFlagAsync,
           RolloutToTenantCohortAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-2, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"postgresql"})
  FREEDOM CONFIG: flag rollout strategies (all/cohort/canary), flag categories
```

### FAMILY 65 — Flow Observability (F493-F496)

```
F493: IExecutionAuditService
  PURPOSE: Append-only audit/event log for execution lifecycle — debugging, replay, compliance
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (PG WORM) via IDatabaseService — immutable audit records
    SECONDARY → DATABASE FABRIC (ES) via IDatabaseService for audit search
  METHODS: AppendAuditEventAsync, SearchAuditEventsAsync, GetExecutionTimelineAsync,
           ExportAuditLogAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"postgresql-worm"})
  KEY INVARIANT: audit event appended AFTER every state transition — no exceptions

F494: ITraceContextService
  PURPOSE: W3C Trace Context propagation — traceparent/tracestate across all services/events
  FABRIC RESOLUTION:
    PRIMARY → CORE FABRIC (Skill 01 — MicroserviceBase) — middleware layer
  METHODS: CreateTraceContextAsync, PropagateTraceAsync, ExtractTraceAsync,
           CorrelateSpanAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-4 (all services propagate trace via MicroserviceBase)
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"core-otel"})
  FREEDOM CONFIG: sampling rate per tenant, trace export endpoint (OTLP), trace retention

F495: IPerTenantMetricsService
  PURPOSE: Tenant-attributed metrics with bounded cardinality — execution rates, error rates, latency
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (ES time-series) via IDatabaseService for metrics storage
  METHODS: RecordExecutionMetricAsync, GetTenantMetricsAsync, AlertOnAnomalyAsync,
           ExportMetricsAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"elasticsearch-timeseries"})
  FREEDOM CONFIG: metric label strategy (tier vs per-tenant), retention windows, alert thresholds
  NOTE: avoid raw tenant_id as high-cardinality metric label for pools of many small tenants

F496: IExecutionEventBusService
  PURPOSE: CloudEvents-enveloped event publishing for execution/step lifecycle events
  FABRIC RESOLUTION:
    PRIMARY → QUEUE FABRIC (Redis Streams) via IQueueService — CloudEvents JSON envelope
  METHODS: PublishCloudEventAsync, SubscribeToEventsAsync, FilterEventsAsync,
           ReplayEventsAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"redis-streams"})
  FREEDOM CONFIG: event types enabled per tenant, replay window, DLQ routing
  ENVELOPE FORMAT: CloudEvents 1.0 JSON — specversion/type/source/id/time/subject/data
```

### FAMILY 66 — DevOps Integration Connectors (F497-F501)

```
F497: IJenkinsConnectorService
  PURPOSE: Bidirectional integration with Jenkins — trigger builds, receive status, read logs
  FABRIC RESOLUTION:
    PRIMARY → CORE FABRIC (HTTP) via MicroserviceBase for Jenkins REST API calls
    SECONDARY → DATABASE FABRIC (PG) via IDatabaseService for connection config + audit
  METHODS: TriggerBuildAsync, GetBuildStatusAsync, GetBuildLogsAsync,
           RegisterWebhookAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"core-http"})
  FREEDOM CONFIG: Jenkins base URL, credential ref, pipeline name mapping, polling interval

F498: IAzureDevOpsConnectorService
  PURPOSE: Integration with Azure DevOps — Boards/Repos/Pipelines/Artifacts
  FABRIC RESOLUTION:
    PRIMARY → CORE FABRIC (HTTP) via MicroserviceBase for AzDO REST API calls
    SECONDARY → DATABASE FABRIC (PG) via IDatabaseService for integration config
  METHODS: TriggerPipelineAsync, GetPipelineStatusAsync, CreateWorkItemAsync,
           ListArtifactsAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"core-http"})
  FREEDOM CONFIG: AzDO org URL, PAT credential ref, project mapping, service connection IDs

F499: IAgentPoolService
  PURPOSE: Abstraction over CI/CD agent pools — labels, capabilities, availability
  FABRIC RESOLUTION:
    PRIMARY → QUEUE FABRIC (Redis Streams) via IQueueService for work dispatch
    SECONDARY → DATABASE FABRIC (PG) via IDatabaseService for pool configuration
  METHODS: RequestAgentAsync, ReleaseAgentAsync, GetPoolStatusAsync,
           RegisterAgentAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"redis-streams"})
  FREEDOM CONFIG: pool labels (linux/windows/docker/k8s), max agents per pool, idle timeout

F500: IPipelineTemplateService
  PURPOSE: CI/CD pipeline template library — store, search, generate pipeline configs
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (ES) via IDatabaseService for template search
    SECONDARY → AI ENGINE FABRIC (Skill 07) via IAiProvider.GenerateAsync for AI-assisted generation
  METHODS: StoreTemplateAsync, SearchTemplatesAsync, GeneratePipelineAsync,
           ValidatePipelineAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-2, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"elasticsearch"})
  FREEDOM CONFIG: template languages (Jenkinsfile/YAML/HCL), AI generation model preference

F501: IApprovalGateService
  PURPOSE: CI/CD environment approval gates — policy enforcement before stage promotion
  FABRIC RESOLUTION:
    PRIMARY → QUEUE FABRIC (Redis Streams) via IQueueService for gate events
    SECONDARY → DATABASE FABRIC (PG) via IDatabaseService for gate records
  METHODS: CreateGateAsync, RequestApprovalAsync, ResolveGateAsync,
           TimeoutGateAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"redis-streams"})
  FREEDOM CONFIG: gate types (manual/policy/timer/metrics), timeout duration, approver mapping
```

### FAMILY 67 — AI-Powered Flow Generation (F502-F505)

```
F502: IFlowAwareAiDispatcherService
  PURPOSE: Extends Skill 07 AiDispatcher to select orchestration blueprint based on user intent
  FABRIC RESOLUTION:
    PRIMARY → AI ENGINE FABRIC (Skill 07) via IAiProvider.GenerateAsync — all 4+ providers
    SECONDARY → DATABASE FABRIC (ES) via IDatabaseService for intent classification models
  METHODS: ClassifyIntentAsync, SelectBlueprintAsync, DispatchWithContextAsync,
           AggregateBlueprintResponsesAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"ai-dispatcher"})
  FREEDOM CONFIG: blueprint selection strategy, confidence threshold, fallback blueprint
  DISTINCT FROM: Skill 07 base dispatcher — this adds flow context and blueprint routing

F503: IFlowBlueprintGeneratorService
  PURPOSE: AI-powered generation of complete flow definitions from natural language spec
  FABRIC RESOLUTION:
    PRIMARY → AI ENGINE FABRIC (Skill 07) via IAiProvider.GenerateAsync
    SECONDARY → RAG FABRIC (Skill 00b) via IRagService.SearchAsync for skill/pattern retrieval
  METHODS: GenerateBlueprintAsync, RefineBlueprintAsync, ValidateBlueprintAsync,
           ExplainBlueprintAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"ai-dispatcher"})
  FREEDOM CONFIG: RAG strategy (Hybrid by default), generation model, max blueprint complexity

F504: IFlowIntentRouterService
  PURPOSE: Routes user intent to the correct flow blueprint generation or execution path
  FABRIC RESOLUTION:
    PRIMARY → AI ENGINE FABRIC (Skill 07) via IAiProvider.GenerateAsync for classification
  METHODS: ExtractIntentAsync, RouteToFlowAsync, ScoreIntentAsync,
           GetAlternativeRoutesAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"ai-dispatcher"})
  FREEDOM CONFIG: intent taxonomy, confidence thresholds, multi-intent handling

F505: IStepCodeGeneratorService
  PURPOSE: AF-1 Genesis equivalent for step code — generates MicroserviceBase-compliant step implementations
  FABRIC RESOLUTION:
    PRIMARY → AI ENGINE FABRIC (Skill 07) via IAiProvider.GenerateAsync
    SECONDARY → DATABASE FABRIC (ES) via IDatabaseService for skill pattern retrieval
  METHODS: GenerateStepCodeAsync, ValidateGeneratedCodeAsync, InjectSkillPatternsAsync,
           PromoteGeneratedCodeAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: validates all 6 DNA patterns in generated code before promotion
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"ai-dispatcher"})
  FREEDOM CONFIG: target language (C#/Node.js/Python), promotion ladder (GENERATED→CORE)
```

### FAMILY 68 — Schema & Contract Enforcement (F506-F508)

```
F506: IJsonSchemaValidationService
  PURPOSE: JSON Schema 2020-12 enforcement across all flow definitions and runtime payloads
  FABRIC RESOLUTION:
    PRIMARY → CORE FABRIC (Skill 01 — ObjectProcessor) via MicroserviceBase
  METHODS: ValidateAsync, CompileSchemaAsync, GetValidationErrorsAsync,
           GenerateSchemaFromExampleAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-4 (validates that no typed models sneak through)
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"core"})
  FREEDOM CONFIG: schema draft version, additional keyword support, strict mode

F507: ICloudEventsEnvelopeService
  PURPOSE: CloudEvents 1.0 envelope wrapping/unwrapping for all execution/step events
  FABRIC RESOLUTION:
    PRIMARY → QUEUE FABRIC (Redis Streams) via IQueueService — wraps all outbound events
  METHODS: WrapEventAsync, UnwrapEventAsync, ValidateEnvelopeAsync,
           RouteByEventTypeAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"redis-streams"})
  FREEDOM CONFIG: event type prefix, source URI pattern, data content type

F508: IBackwardCompatibilityCheckerService
  PURPOSE: Validates new flow versions maintain compatibility with existing consumers/executions
  FABRIC RESOLUTION:
    PRIMARY → DATABASE FABRIC (ES) via IDatabaseService for version diff analysis
  METHODS: CheckCompatibilityAsync, GetBreakingChangesAsync, GenerateCompatibilityReportAsync,
           EnforceCompatibilityPolicyAsync — all return DataProcessResult<T>
  DNA COMPLIANCE: DNA-1, DNA-2, DNA-4, DNA-5
  FACTORY RESOLUTION: CreateAsync(FactoryResolutionContext{provider:"elasticsearch"})
  FREEDOM CONFIG: compatibility mode (strict/semver/loose), breaking change categories
```

---

## FAMILY SUMMARY — FLOW-18

| Family | Name | Factories | Fabric(s) |
|--------|------|-----------|-----------|
| 60 | Flow Control Plane | F466-F471 | ES, PG, AI ENGINE, CORE, QUEUE |
| 61 | Flow Execution Runtime | F472-F477 | PG, QUEUE, Redis |
| 62 | Step & Connector Layer | F478-F482 | QUEUE, PG, Redis, ES |
| 63 | Multi-Tenant Identity Layer | F483-F488 | PG, Redis, CORE, QUEUE |
| 64 | Tenant Data Isolation | F489-F492 | PG (RLS), QUEUE, Redis, ES |
| 65 | Flow Observability | F493-F496 | PG (WORM), ES, CORE (OTel), QUEUE |
| 66 | DevOps Integration Connectors | F497-F501 | CORE (HTTP), PG, QUEUE, ES, AI ENGINE |
| 67 | AI-Powered Flow Generation | F502-F505 | AI ENGINE, RAG, ES |
| 68 | Schema & Contract Enforcement | F506-F508 | CORE, QUEUE, ES |

**Total: F466-F508 = 43 factories across 9 families (60-68)**

---

## DESIGN RECORDS — DR-66-DR-74

```
DR-66: Flow Definitions as Immutable Versions (Never Mutable In-Place)
  DECISION: FlowVersions are append-only. Published versions are immutable.
  RATIONALE: Running executions reference a specific version — mutating it would corrupt
             in-flight state. New behavior requires new version via F467.
  ENFORCEMENT: F466 PublishVersionAsync transitions status to ACTIVE (no edit path).
               AF-7 Compliance checks for version mutation attempts.
  ANTI-PATTERN: Allowing PATCH on published version → rejected at BUILD FAILURE

DR-67: Checkpoint-Before-Advance (Mirrors EP-4 Cursor Pattern)
  DECISION: F474 IExecutionStateService must persist checkpoint BEFORE advancing step pointer.
  RATIONALE: If orchestrator crashes after step success but before checkpoint, the step
             re-executes (at-least-once). F477 IIdempotencyService handles deduplication.
  ENFORCEMENT: T183 Fan-Out Coordinator iron rule IR-183-3, T185 Retry Saga IR-185-2.
  ANTI-PATTERN: Advance checkpoint after dispatching next step → possible double execution

DR-68: Tenant Context as Compile-Time Invariant
  DECISION: Missing tenantId in any DB call = BUILD FAILURE (same as DNA-5).
             F484 middleware is the single resolution point — no downstream service resolves tenant.
  RATIONALE: Broken object-level authorization (BOLA) is a top API risk; multi-tenancy
             multiplies this risk. Defense-in-depth: app layer + DB RLS (F489).
  ENFORCEMENT: CF-220, CF-221, AF-7 checks for absent tenantId, AF-8 security scan.
  ANTI-PATTERN: Service resolving tenant from its own DB call → rejected

DR-69: Hard Stop as Queue Event, Not HTTP Block
  DECISION: F475 HardStop approval requests/responses go through QUEUE FABRIC, never HTTP.
  RATIONALE: Blocking HTTP while awaiting human approval introduces timeout risks and ties
             up thread/connection resources. Queue decouples the wait.
  ENFORCEMENT: T182 Approval Gate iron rule IR-182-4, BFA CF-224.
  ANTI-PATTERN: await approvalService.WaitForHumanAsync() → HTTP timeout violation

DR-70: CloudEvents Envelope on All Execution Events
  DECISION: Every execution/step lifecycle event uses F507 CloudEvents 1.0 JSON envelope.
  RATIONALE: Standardized envelope enables cross-service routing, filtering, and
             third-party integration without schema negotiation.
  ENFORCEMENT: F496 enforces envelope on publish. AF-7 checks for raw payload events.
  ANTI-PATTERN: Publishing stepCompleted as {stepKey, output} without CloudEvents → rejected

DR-71: RLS as Defense-in-Depth (Not Replacement for App Scoping)
  DECISION: F489 RLS enforces tenant isolation at DB level IN ADDITION TO app-level BuildSearchFilter.
  RATIONALE: App scoping alone relies on code correctness. DB-level policy provides a
             second barrier against cross-tenant data leakage.
  ENFORCEMENT: CF-220-CF-221, DNA-5, IR-187-1.
  ANTI-PATTERN: Relying only on RLS and omitting tenantId from app queries → rejected

DR-72: AI-Generated Flow Code on Promotion Ladder Only
  DECISION: F505 generated code enters at GENERATED tier and must pass all AF stations
             (AF-6 review, AF-7 compliance, AF-8 security, AF-9 judge) before INJECTED.
  RATIONALE: AI code generation can produce working but non-compliant code.
             The promotion ladder ensures DNA patterns and iron rules are enforced.
  ENFORCEMENT: T192 AI Blueprint Generation quality gates, AF-9 judge.
  ANTI-PATTERN: Directly deploying AI-generated code to CORE → BUILD FAILURE

DR-73: DevOps Connectors via Core Fabric Only (Never Direct SDK Import)
  DECISION: F497 Jenkins and F498 Azure DevOps connectors use CORE FABRIC HTTP,
             never import jenkins-sdk or azure-devops npm packages directly.
  RATIONALE: Provider-specific SDK imports break swappability. New CI/CD system
             = new factory implementing same IConnector interface, no code change.
  ENFORCEMENT: AF-7 compliance scans for forbidden imports, CF-228.
  ANTI-PATTERN: import { JenkinsClient } from '@jenkins/sdk' → BUILD FAILURE

DR-74: Multi-Tenant Observability with Bounded Cardinality
  DECISION: Per-tenant metrics use tier/plan labels by default.
             Raw tenant_id labels only for enterprise tenants or sampled debug mode.
  RATIONALE: High-cardinality metric labels (one per tenant) cause Prometheus/ES overload.
             Tier labels preserve isolation signal at manageable cardinality.
  ENFORCEMENT: F495 metric label strategy configured per FREEDOM config.
               AF-8 checks for unbounded cardinality metric definitions.
  ANTI-PATTERN: RecordMetric(labels: {tenant_id: rawId}) on pooled deployment → rejected
```

---

## BACKWARD COMPATIBILITY — FLOW-18

```
F1-F465:     UNCHANGED ✅
T1-T178:     UNCHANGED ✅
CF-1-CF-213: UNCHANGED ✅
ST-1-ST-103: UNCHANGED ✅
SK-1-SK-98:  UNCHANGED ✅
DD-1-DD-85:  UNCHANGED ✅
DR-1-DR-65:  UNCHANGED ✅
DNA-1-DNA-9: STABLE ✅
EP-1-EP-5:   STABLE ✅ (EP-4 cursor pattern reused by DR-67)
```

---
## SAVE POINT: FLOW18:ENGINE_ARCHITECTURE ✅
## Next: FLOW18_TASK_TYPES_CATALOG.md
## Recovery: "Load FLOW18 engine architecture — F466-F508 / Families 60-68 / DR-66-DR-74"
