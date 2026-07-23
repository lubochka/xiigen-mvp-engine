# ENGINE_ARCHITECTURE — FLOW-19: CI/CD & DevOps Control Plane
## Extends ENGINE_ARCHITECTURE_MERGED.md | F466-F502 | Families 60-68 | DR-66-DR-76
## Pre-existing F1-F465 UNCHANGED ✅

---

## FLOW-19 DELTA

| Artifact | Before (Post-FLOW-14) | After (Post-FLOW-19) | Delta |
|----------|----------------------|---------------------|-------|
| Factories | 465 | 502 | +37 |
| Families | 59 | 68 | +9 |
| Design Records | 65 | 76 | +11 |

---

## NEW FACTORIES — F466-F502

### FAMILY 60 — System Catalog & CMDB (F466-F469)

```
FAMILY PURPOSE:
  Treats every runtime, datastore, queue, model provider, CI/CD system, and RAG
  pipeline as a versioned "component" stored as code (catalog-info.yaml → ES).
  Enables live system-map queries, dependency graph traversal, and ownership lookup.
  All services sit on DATABASE FABRIC and AI ENGINE FABRIC — zero direct DB imports.

F466  ICatalogIngestionService
  FABRIC: DATABASE FABRIC (Skill 05 → Elasticsearch — catalog index)
          + QUEUE FABRIC (Skill 04 — descriptor_changed events)
  PURPOSE: Ingest component descriptor YAML from Git webhook; parse, validate
           schema, upsert into ES catalog index, emit component.profile_validated
  METHODS: IngestDescriptorAsync, ValidateProfileAsync, GetProfileVersionAsync
  DNA: DNA-1 (Dictionary parse), DNA-3 (DataProcessResult), DNA-5 (tenantId scope)
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{source=git,schema=v1})

F467  IComponentProfileService
  FABRIC: DATABASE FABRIC (Skill 05 → PostgreSQL — structured profile metadata)
  PURPOSE: Store and version component profiles capturing owner, criticality tier,
           endpoints, auth method, config-sources, dependencies, backup policy,
           RPO/RTO targets, test suites, cost tags, runbook refs
  METHODS: StoreProfileAsync, GetCurrentProfileAsync, ListProfilesByOwnerAsync,
           ComputeDependencyEdgesAsync
  DNA: DNA-1, DNA-2 (BuildSearchFilter — skip empty fields), DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{provider=PG})

F468  IDependencyGraphService
  FABRIC: DATABASE FABRIC (Skill 05 → Neo4j — graph traversal)
          + RAG FABRIC (Skill 00b — similarity search for unknown deps)
  PURPOSE: Build and query directed dependency graph of all catalog components.
           Supports "what breaks if X goes down", transitive impact analysis,
           critical path detection for promotion decisions
  METHODS: UpsertEdgeAsync, GetUpstreamDepsAsync, GetDownstreamDepsAsync,
           ComputeCriticalPathAsync, FindOrphanedComponentsAsync
  DNA: DNA-1, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{provider=Neo4j,strategy=Graph})

F469  IInventoryQueryService
  FABRIC: DATABASE FABRIC (Skill 05 → Elasticsearch — full-text catalog search)
  PURPOSE: Expose live inventory queries across all components.
           Powers CMDB UI, dependency reports, compliance checks, BFA lookups
  METHODS: SearchComponentsAsync, GetComponentsByTierAsync,
           ListComponentsByProviderAsync, GetStaleProfilesAsync
  DNA: DNA-1, DNA-2, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{provider=ES,index=catalog})
```

---

### FAMILY 61 — Environment Factory (F470-F473)

```
FAMILY PURPOSE:
  Provides durable, idempotent provisioning of local (Windows Desktop K8s),
  ephemeral (per-PR namespace), and cloud (Azure/AWS) environments.
  All IaC operations are wrapped in CORE FABRIC; state tracked in DATABASE FABRIC.
  Supports profiles: local-lite, local-full, local-sensitive, ephemeral-standard, cloud-prod.

F470  IEnvironmentProvisionerService
  FABRIC: CORE FABRIC (Skill 01 — MicroserviceBase, idempotency + compensation)
          + DATABASE FABRIC (Skill 05 → PostgreSQL — env instance state table)
  PURPOSE: Orchestrate full environment lifecycle: Requested → Validating →
           Provisioning → Deploying → Testing → Ready → Expiring → Deleted.
           Persists StepRun state before every side effect (outbox pattern).
           Registers idempotency key per (env_type, pr_number) or request UUID.
  METHODS: RequestEnvironmentAsync, GetEnvironmentStateAsync,
           CancelEnvironmentAsync, CleanupExpiredAsync
  DNA: DNA-1, DNA-3, DNA-4 (MicroserviceBase — 19 components), DNA-5
  IRON RULE: Never advance state without persisting StepRun first (EP-4 pattern)
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{env_profile=ephemeral-standard})

F471  IIaCRunnerService
  FABRIC: CORE FABRIC (Skill 01 → HTTP adapter — Terraform/Pulumi API surface)
          + DATABASE FABRIC (Skill 05 → PostgreSQL — IaC state + output storage)
  PURPOSE: Execute IaC plan/apply/destroy for environment resources.
           Wraps Terraform/Pulumi behind stable interface — no direct SDK import.
           Stores plan output and compensation (destroy) plan before apply.
           Enforces concurrency limit per cloud account/region (CF-214).
  METHODS: PlanAsync, ApplyAsync, DestroyAsync, GetIaCStateAsync,
           GetCompensationPlanAsync
  DNA: DNA-1, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{provider=terraform|pulumi,region=X})

F472  IEphemeralEnvService
  FABRIC: QUEUE FABRIC (Skill 04 — env lifecycle events)
          + DATABASE FABRIC (Skill 05 → Redis — TTL tracking; PG — instance record)
  PURPOSE: Manage namespace-per-PR ephemeral environments. Creates K8s namespace
           with ResourceQuota + NetworkPolicy. Enforces TTL via Redis expiry event.
           Emits env.ttl_expired when TTL reached → triggers automatic cleanup.
  METHODS: CreateNamespaceAsync, SetTTLAsync, ExtendTTLAsync,
           DeleteNamespaceAsync, ListActiveAsync
  DNA: DNA-1, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{isolation=namespace,ttl_minutes=720})

F473  ILocalK8sBootstrapService
  FABRIC: CORE FABRIC (Skill 01 — MicroserviceBase, command execution wrapper)
  PURPOSE: Automate single-command bootstrap of Windows Desktop K8s environments
           (Docker Desktop or kind). Deploys platform-core + lite dependencies via
           Helm/Kustomize. Supports profiles: local-lite, local-full, local-sensitive
           (local-sensitive enforces zero external network egress — CF-228).
  METHODS: BootstrapAsync, TeardownAsync, ApplyProfileAsync,
           SeedDataAsync, RunGoldenPathSmokeAsync
  DNA: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{env=local,profile=local-lite})
```

---

### FAMILY 62 — Config & Secrets Governance (F474-F477)

```
FAMILY PURPOSE:
  Implements config-layer merge (global → env → tenant → override), secret-reference
  validation (existence only — never store values), and policy evaluation.
  All resolution through DATABASE FABRIC + CORE FABRIC. Zero direct vault SDK.

F474  IConfigLayerResolverService
  FABRIC: DATABASE FABRIC (Skill 05 → PostgreSQL — config layers)
          + DATABASE FABRIC (Skill 05 → Redis — resolved bundle cache)
  PURPOSE: Merge config layers in priority order: global defaults → tier defaults →
           tenant overrides → environment overrides. Produces a ConfigBundle
           containing resolved keys + secret references (not values). Caches
           resolved bundle per (tenant_id, env_id) with TTL invalidation.
  METHODS: ResolveAsync, ValidateRequiredKeysAsync, InvalidateCacheAsync,
           GetConfigHistoryAsync
  DNA: DNA-1, DNA-2, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{tenant_id=X,env_type=Y})

F475  ISecretRefValidatorService
  FABRIC: CORE FABRIC (Skill 01 → HTTP adapter — Key Vault / Secrets Manager API)
  PURPOSE: Validate that every secret reference in a ConfigBundle EXISTS in the
           target vault (Azure Key Vault or AWS Secrets Manager). Never retrieves
           values — only confirms existence + access permission. Enforces "no secrets
           in Git" (CF-221). Supports rotation-schedule metadata check.
  METHODS: ValidateRefsExistAsync, CheckRotationScheduleAsync,
           ListMissingRefsAsync
  DNA: DNA-1, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{vault=azure-kv|aws-sm})

F476  IPolicyEngineService
  FABRIC: AI ENGINE FABRIC (Skill 07 — policy reasoning for complex ABAC rules)
          + DATABASE FABRIC (Skill 05 → Elasticsearch — policy document store)
  PURPOSE: Evaluate routing/region/logging/data-classification policies.
           Returns PolicyDecision{allow|deny, obligations[], reasoning}.
           Critical for "sensitive data → local-only model" enforcement (CF-228).
           Policy-as-code stored in ES; OPA-compatible rule format.
  METHODS: EvaluatePolicyAsync, StorePolicyAsync, ListActiveRulesAsync,
           GetDecisionHistoryAsync
  DNA: DNA-1, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{policy_set=routing|region|pii})

F477  IConfigVersionService
  FABRIC: DATABASE FABRIC (Skill 05 → PostgreSQL — immutable config snapshots)
  PURPOSE: Store versioned, immutable config snapshots at each deploy/promotion.
           Enables config rollback, drift detection (current vs deployed snapshot),
           and compliance evidence. Links config version to FlowInstance ID.
  METHODS: SnapshotAsync, DiffAsync, RollbackToVersionAsync,
           GetDeployedVersionAsync
  DNA: DNA-1, DNA-2, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{provider=PG})
```

---

### FAMILY 63 — Pipeline Contract Engine (F478-F481)

```
FAMILY PURPOSE:
  Normalizes Jenkins / Azure DevOps / GitHub Actions / GitLab pipelines to a single
  execution contract: build → unit-test → security-scan → package → deploy-ephemeral
  → integration-test → promote → rollback.
  All inter-CI events flow through QUEUE FABRIC. Never direct HTTP between CI systems.

F478  IPipelineContractService
  FABRIC: DATABASE FABRIC (Skill 05 → Elasticsearch — contract definitions)
  PURPOSE: Store and version pipeline contract specifications. A contract defines
           the required phase sequence, mandatory gates (BFA stress test must pass),
           artifact outputs, and provider-specific mappings. Version immutable on publish.
  METHODS: PublishContractAsync, GetContractAsync, ValidatePipelineConformsAsync,
           ListContractsByProviderAsync
  DNA: DNA-1, DNA-2, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{ci_provider=github|ado|jenkins|gitlab})

F479  IPipelineAdapterService
  FABRIC: CORE FABRIC (Skill 01 → HTTP adapter — CI provider webhooks + API)
          + QUEUE FABRIC (Skill 04 — pipeline.status_changed events)
  PURPOSE: Receive webhook events from CI providers, normalize to canonical
           pipeline events, emit to QUEUE FABRIC. Also report gate results back
           to PR status checks. One adapter per CI provider; resolved via config.
           Deduplication by (repo, sha, pipeline_run_id).
  METHODS: ReceiveWebhookAsync, ReportGateResultAsync, TriggerRunAsync,
           GetRunStatusAsync
  DNA: DNA-1, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{ci_provider=X,auth=oauth2})

F480  IArtifactRegistryService
  FABRIC: DATABASE FABRIC (Skill 05 → Elasticsearch — artifact metadata index)
          + CORE FABRIC (Skill 01 → HTTP — object storage / container registry)
  PURPOSE: Track immutable build artifacts (container images, NuGet/NPM packages,
           Helm charts). Stores metadata: artifact_id, kind, digest/sha256, uri,
           flow_instance_id, created_at, retention_until. Enforces immutability.
  METHODS: RegisterArtifactAsync, GetArtifactAsync, ListByFlowAsync,
           ExpireArtifactsAsync, VerifyIntegrityAsync
  DNA: DNA-1, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{registry=acr|ecr|ghcr})

F481  IPromotionGateService
  FABRIC: QUEUE FABRIC (Skill 04 — promotion.requested / promotion.approved events)
          + DATABASE FABRIC (Skill 05 → PostgreSQL — promotion decision log)
  PURPOSE: Orchestrate dev → stage → prod promotion ladder. Checks readiness report
           passes, BFA validation passes, human approval (when required by policy),
           and artifact integrity. Records every promotion decision immutably.
           Emits rollback event if post-deploy checks fail (CF-218).
  METHODS: RequestPromotionAsync, ApprovePromotionAsync, RejectPromotionAsync,
           TriggerRollbackAsync, GetPromotionHistoryAsync
  DNA: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{ladder=dev-stage-prod})
```

---

### FAMILY 64 — GitOps & Deployment Adapter (F482-F485)

```
FAMILY PURPOSE:
  Wraps GitOps reconciliation (Argo CD-compatible model: desired vs live state,
  OutOfSync detection) behind fabric interfaces. Zero direct GitOps SDK imports.
  Drift detection and manifest rendering sit on DATABASE FABRIC + AI ENGINE FABRIC.

F482  IGitOpsAdapterService
  FABRIC: CORE FABRIC (Skill 01 → HTTP adapter — GitOps API / Argo CD REST)
  PURPOSE: Request GitOps sync to a commit SHA; query health/sync status;
           detect OutOfSync (desired vs live state diff). Represents the
           "deployment adapter" between Environment Factory and workload plane.
  METHODS: SyncToRefAsync, GetSyncStatusAsync, GetDiffAsync,
           ForceRefreshAsync, ListApplicationsAsync
  DNA: DNA-1, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{gitops=argocd|flux,env_id=X})

F483  IDriftDetectorService
  FABRIC: DATABASE FABRIC (Skill 05 → Elasticsearch — drift snapshots)
  PURPOSE: Periodically snapshot desired-vs-live state; detect config drift
           (K8s manifest mutations outside GitOps). Emit drift.detected events
           to QUEUE FABRIC. Store drift reports for audit. Supports CF-223.
  METHODS: SnapshotDesiredStateAsync, DetectDriftAsync,
           GetDriftReportAsync, AcknowledgeDriftAsync
  DNA: DNA-1, DNA-2, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{provider=ES,scan_interval=5m})

F484  IDeploymentHealthService
  FABRIC: DATABASE FABRIC (Skill 05 → Elasticsearch — health metrics)
          + QUEUE FABRIC (Skill 04 — deployment.health_changed events)
  PURPOSE: Continuous health monitoring of deployed workloads per environment.
           Aggregates readiness/liveness probe results, rollout progress,
           and error rates. Feeds promotion gate decisions (F481).
  METHODS: GetHealthStatusAsync, WaitForHealthyAsync,
           GetRolloutProgressAsync, RegisterHealthCheckAsync
  DNA: DNA-1, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{env_id=X,provider=ES})

F485  IManifestRendererService
  FABRIC: AI ENGINE FABRIC (Skill 07 — AI-assisted manifest generation from profile)
          + DATABASE FABRIC (Skill 05 → Elasticsearch — rendered manifest cache)
  PURPOSE: Generate Helm values or Kustomize overlays from ComponentProfile +
           EnvironmentProfile. Uses AI ENGINE FABRIC to translate component profile
           fields into K8s-idiomatic manifests. Outputs are cached and versioned.
  METHODS: RenderManifestAsync, GetCachedRenderAsync,
           ValidateManifestAsync, ListRenderedByProfileAsync
  DNA: DNA-1, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{renderer=helm|kustomize})
```

---

### FAMILY 65 — Test Orchestration & Readiness (F486-F489)

```
FAMILY PURPOSE:
  Executes test suites (config-check, smoke, integration, performance) against
  provisioned environments and produces ReadinessReport artifacts. All suite
  execution through QUEUE FABRIC worker fleet; results stored in DATABASE FABRIC.

F486  ITestOrchestratorService
  FABRIC: QUEUE FABRIC (Skill 04 — test.suite_requested / test.completed events)
          + DATABASE FABRIC (Skill 05 → Elasticsearch — test run metadata)
  PURPOSE: Coordinate parallel test suite execution across config, smoke,
           integration, and performance suites. Manages concurrency limits
           per environment. Collects all results and triggers ReadinessReport.
           Deduplication by (env_id, suite_id, run_id).
  METHODS: EnqueueSuitesAsync, GetRunStatusAsync, GetAllResultsAsync,
           CancelRunAsync, RetrySuiteAsync
  DNA: DNA-1, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{env_id=X,suites=[config,smoke,integration]})

F487  ISmokeSuiteRunnerService
  FABRIC: CORE FABRIC (Skill 01 → HTTP adapter — endpoints under test)
  PURPOSE: Execute lightweight "golden path" smoke tests verifying the whole chain
           (DB connectivity, queue pub/sub, AI provider auth, RAG index existence).
           Produces SmokeResult{pass|fail, assertions[], duration_ms}. Per-provider
           test cases driven by ComponentProfile.tests configuration.
  METHODS: RunSmokeAsync, GetLastResultAsync, ListAssertionsAsync,
           RegisterSuiteAsync
  DNA: DNA-1, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{env_id=X,timeout_s=120})

F488  IReadinessReportService
  FABRIC: DATABASE FABRIC (Skill 05 → Elasticsearch — reports)
          + DATABASE FABRIC (Skill 05 → PostgreSQL — structured report metadata)
  PURPOSE: Aggregate all test suite results into a ReadinessReport artifact.
           Report contains: env_id, flow_instance_id, overall_pass, per-suite results,
           policy decisions, artifact links, timestamp. Immutable once emitted.
           Used as gate evidence for promotion (F481) and audit (F495).
  METHODS: GenerateReportAsync, GetReportAsync, ListByEnvAsync,
           IsGatePassingAsync
  DNA: DNA-1, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{env_id=X,provider=ES+PG})

F489  IIntegrationSuiteService
  FABRIC: CORE FABRIC (Skill 01 → HTTP — external system connectivity)
          + QUEUE FABRIC (Skill 04 — test.integration_result events)
  PURPOSE: Run provider-specific integration tests (DB connect+auth+read/write,
           queue publish/consume+DLQ, model auth+rate-limit+fallback,
           RAG index+embed+query+ACL). Results emitted as events and stored.
  METHODS: RunDBSuiteAsync, RunQueueSuiteAsync, RunAISuiteAsync,
           RunRAGSuiteAsync, RunMgmtToolSuiteAsync
  DNA: DNA-1, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{suite_type=db|queue|ai|rag})
```

---

### FAMILY 66 — Backup & DR Drills (F490-F493)

```
FAMILY PURPOSE:
  Implements the non-negotiable DR evidence model:
  Scheduled → SandboxProvisioning → BackupRunning → RestoreRunning → Verifying →
  Passed/Failed → Cleanup → Completed.
  All drill state persisted in DATABASE FABRIC; evidence stored immutably.

F490  IBackupAdapterService
  FABRIC: DATABASE FABRIC (Skill 05 → PG + ES — backup metadata)
          + QUEUE FABRIC (Skill 04 — backup.completed events)
  PURPOSE: Execute datastore-specific backups (ES snapshots to object storage,
           PG WAL archiving + pg_dump, Redis RDB/AOF, MongoDB mongodump,
           K8s Velero-compatible PV snapshots). Stores metadata including
           artifact pointer, sha256, backup_id, target, created_at.
  METHODS: RunBackupAsync, GetBackupMetadataAsync,
           ListBackupsByTargetAsync, VerifyBackupIntegrityAsync
  DNA: DNA-1, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{datastore=es|pg|redis|mongo|k8s})

F491  IRestoreDrillService
  FABRIC: QUEUE FABRIC (Skill 04 — restore_drill.requested / completed events)
          + DATABASE FABRIC (Skill 05 → PostgreSQL — drill instance state)
  PURPOSE: Orchestrate full restore drill lifecycle: provision sandbox environment,
           restore backup to sandbox, run smoke/integration suites in sandbox,
           capture DrillResult{pass|fail, rto_actual_minutes, smoke_results}.
           Emits restore_drill.completed event with evidence link.
  METHODS: StartDrillAsync, GetDrillStatusAsync,
           GetDrillResultAsync, ListDrillsByTargetAsync
  DNA: DNA-1, DNA-3, DNA-4, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{drill_type=full|targeted,tier=1|2|3})

F492  IDrillEvidenceService
  FABRIC: DATABASE FABRIC (Skill 05 → Elasticsearch WORM — immutable evidence index)
  PURPOSE: Store immutable drill evidence artifacts: DrillResult record,
           linked smoke report, RTO measurement, backup artifact pointer.
           Append-only — no update/delete (DR-74). Used for compliance audits
           and tier-1 promotion gate (CF-237).
  METHODS: StoreEvidenceAsync, GetEvidenceAsync,
           ListByTargetAndDateAsync, ExportAuditPackageAsync
  DNA: DNA-1, DNA-3, DNA-5
  IRON RULE: Evidence records are append-only — BUILD FAILURE if update/delete attempted
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{provider=ES-WORM})

F493  IRestoreSandboxService
  FABRIC: QUEUE FABRIC (Skill 04 — sandbox lifecycle events)
          + DATABASE FABRIC (Skill 05 → PostgreSQL — sandbox state)
  PURPOSE: Provision a short-lived isolated sandbox environment specifically for
           restore verification. Inherits from IEnvironmentProvisionerService (F470)
           but with restricted network (no production traffic), short TTL, and
           seeded only from backup artifacts (never production data).
  METHODS: ProvisionSandboxAsync, SeedFromBackupAsync,
           DestroySandboxAsync, GetSandboxStateAsync
  DNA: DNA-1, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{sandbox_type=dr-drill,ttl_minutes=180})
```

---

### FAMILY 67 — Observability & Control Plane Audit (F494-F496)

```
FAMILY PURPOSE:
  Provides DevOps-specific observability: OTel Collector pipeline, immutable
  control-plane audit log, and AI-powered hallucination drift detection for RAG.
  Sits entirely on CORE FABRIC + DATABASE FABRIC + AI ENGINE FABRIC.

F494  IOtelCollectorAdapterService
  FABRIC: CORE FABRIC (Skill 01 → HTTP/gRPC — OTel Collector OTLP endpoint)
          + DATABASE FABRIC (Skill 05 → Elasticsearch — telemetry index)
  PURPOSE: Vendor-agnostic receive/process/export telemetry pipeline.
           Propagates trace IDs from API request → workers → adapters.
           Emits spans for each FlowInstance/StepRun. Supports W3C traceparent.
           Aggregates metrics: flow success rate, step duration, retry count, queue depth.
  METHODS: ExportSpanAsync, ExportMetricAsync, ExportLogAsync,
           GetTraceAsync, BuildTenantDashboardAsync
  DNA: DNA-1, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{backend=es|datadog|azure-monitor})

F495  IControlPlaneAuditService
  FABRIC: DATABASE FABRIC (Skill 05 → PostgreSQL WORM — audit log)
          + DATABASE FABRIC (Skill 05 → Elasticsearch — audit search index)
  PURPOSE: Append-only audit events for every privileged control plane action:
           env create/delete, config resolve, policy deny, backup/restore,
           tenant lifecycle events, secret reference validation.
           Answers "who did what, where, when" for compliance audits.
           Never update/delete — DR-75.
  METHODS: AppendEventAsync, SearchEventsAsync,
           GetEventsByActorAsync, GetEventsByTargetAsync
  DNA: DNA-1, DNA-3, DNA-5
  IRON RULE: Audit records are append-only — BUILD FAILURE if mutation attempted
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{provider=PG-WORM+ES})

F496  IHallucinationDriftService
  FABRIC: AI ENGINE FABRIC (Skill 07 — multi-model scoring)
          + DATABASE FABRIC (Skill 05 → Elasticsearch — drift metrics index)
  PURPOSE: Monitor RAG pipeline output quality over time. Computes drift score
           by comparing current generation quality vs baseline. Alerts on
           "hallucination drift" — when generated code diverges from DNA patterns.
           Feeds AF-11 (Feedback) with generation quality scores.
  METHODS: ScoreGenerationAsync, ComputeDriftAsync,
           GetDriftAlertAsync, UpdateBaselineAsync
  DNA: DNA-1, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{strategy=multi-model-scoring})
```

---

### FAMILY 68 — Multi-Tenant Control Plane (F497-F502)

```
FAMILY PURPOSE:
  Implements the tenant control plane (registry, binding resolver, onboarding,
  metering, config, lifecycle) that underpins all FLOW-19 operations.
  Inherits FLOW-08 multi-tenant patterns (DR-65) and extends them for DevOps plane.
  All isolation enforced at CORE FABRIC level — tenantId on every operation (DNA-5).

F497  ITenantRegistryService
  FABRIC: DATABASE FABRIC (Skill 05 → PostgreSQL — tenants master table)
  PURPOSE: Store tenant master record: tenant_id, display_name, tier, primary_region,
           requested_isolation (pooled|schema|db), billing_account_ref, status,
           created_at. Immutable tenant_id (UUID). Supports SCIM lifecycle.
           Foundation for all tenant-scoped operations.
  METHODS: CreateTenantAsync, GetTenantAsync, UpdateTierAsync,
           ListTenantsByRegionAsync, SuspendTenantAsync
  DNA: DNA-1, DNA-2, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{provider=PG,table=tenants})

F498  ITenantBindingResolverService
  FABRIC: DATABASE FABRIC (Skill 05 → PostgreSQL — binding table)
          + DATABASE FABRIC (Skill 05 → Redis — binding cache)
  PURPOSE: Map tenant_id → storage binding (shared shard / schema / db).
           Resolves on every request; cached in Redis with invalidation on
           binding change. Validates binding type matches tenant tier.
           Never cross-tenant binding (CF-231). Supports binding migration.
  METHODS: ResolveBindingAsync, CreateBindingAsync,
           MigrateIsolationAsync, InvalidateBindingCacheAsync
  DNA: DNA-1, DNA-3, DNA-5
  IRON RULE: Binding cache key MUST include tenant_id — BUILD FAILURE if missing
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{provider=PG+Redis})

F499  ITenantOnboardingService
  FABRIC: QUEUE FABRIC (Skill 04 — tenant.onboarding events)
          + DATABASE FABRIC (Skill 05 → PostgreSQL — onboarding saga state)
  PURPOSE: Orchestrate idempotent tenant onboarding saga:
           Create tenant → Configure identity mapping → Allocate storage binding →
           Seed config + entitlements → Set quotas/rate limits →
           Run tenant smoke tests → Activate tenant.
           Every step carries Idempotency-Key. Compensation on failure (CF-232).
  METHODS: StartOnboardingAsync, GetOnboardingStatusAsync,
           ActivateTenantAsync, RollbackOnboardingAsync
  DNA: DNA-1, DNA-3, DNA-4, DNA-5
  IRON RULE: Every onboarding step must be idempotent — BUILD FAILURE if not
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{tier=standard|premium})

F500  ITenantMeteringService
  FABRIC: QUEUE FABRIC (Skill 04 — usage.event stream)
          + DATABASE FABRIC (Skill 05 → PostgreSQL — metering ledger)
          + DATABASE FABRIC (Skill 05 → Elasticsearch — usage analytics)
  PURPOSE: Ingest per-tenant usage events (canonical schema: tenant_id, metric_name,
           quantity, timestamp, idempotency_key, dimensions). Deduplication by
           (event_id, tenant_id). Periodic reconciliation for correctness.
           Powers cost-per-tenant reporting and billing export.
  METHODS: IngestUsageEventAsync, GetUsageSummaryAsync,
           ExportBillingDataAsync, ReconcileAsync
  DNA: DNA-1, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{provider=PG+ES+Queue})

F501  ITenantConfigLayerService
  FABRIC: DATABASE FABRIC (Skill 05 → PostgreSQL — tenant config tiers)
          + DATABASE FABRIC (Skill 05 → Redis — per-tenant config cache)
  PURPOSE: Provide tenant-specific config layer (top priority in ConfigLayerResolver F474).
           Supports configuration layering: global defaults → tier defaults →
           tenant overrides → environment overrides. Tenant config changes are
           versioned and audited. Feature flags per tenant stored here.
  METHODS: GetTenantConfigAsync, SetOverrideAsync,
           GetFeatureFlagsAsync, SetFeatureFlagAsync, GetConfigVersionAsync
  DNA: DNA-1, DNA-2, DNA-3, DNA-5
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{provider=PG+Redis,tenant_id=X})

F502  ITenantLifecycleService
  FABRIC: QUEUE FABRIC (Skill 04 — tenant.lifecycle events)
          + DATABASE FABRIC (Skill 05 → PostgreSQL — lifecycle saga state)
  PURPOSE: Manage full tenant lifecycle beyond onboarding: Suspend → Resume →
           Offboard. Offboarding saga: suspend writes → export data → rotate/revoke
           keys → purge/tombstone data per retention policy → delete tenant resources
           → preserve audit logs per policy → finalize billing.
           All lifecycle state persisted before side effects.
  METHODS: SuspendTenantAsync, ResumeTenantAsync,
           StartOffboardingAsync, GetLifecycleStatusAsync
  DNA: DNA-1, DNA-3, DNA-4, DNA-5
  IRON RULE: Audit logs MUST be preserved through offboarding — BUILD FAILURE if deleted
  FACTORY RESOLVED VIA: CreateAsync(FactoryResolutionContext{provider=PG+Queue})
```

---

## ENGINE PRIMITIVES — FLOW-19

No new Engine Primitives. EP-1–EP-5 stable and consumed by FLOW-19 as follows:
- EP-4 (Cursor/Watermark Persist) consumed by F490 (backup state tracking)
- EP-5 (Distributed Saga) consumed by F470, F491, F499, F502

---

## DNA PATTERNS — FLOW-19 COMPLIANCE

All 9 DNA patterns (DNA-1 through DNA-9) enforced on every FLOW-19 generated service:

| Pattern | FLOW-19 Application |
|---------|-------------------|
| DNA-1: ParseDocument | All F466-F502 — Dictionary<string,object>, zero typed models |
| DNA-2: BuildQueryFilters | F467, F469, F474, F477, F488, F500 — empty field skip |
| DNA-3: DataProcessResult | All F466-F502 — never throw for business logic |
| DNA-4: MicroserviceBase | F470, F481, F491, F499, F502 — 19-component inheritance |
| DNA-5: Scope Isolation | ALL factories — tenantId on every query without exception |
| DNA-6: DynamicController | All generated API surfaces — no entity-specific controllers |
| DNA-7: ProviderAgnostic | F471 (IaC), F479 (CI adapter), F482 (GitOps) — swappable |
| DNA-8: EventFirst | F472, F481, F486, F499 — QUEUE FABRIC, never direct HTTP |
| DNA-9: SoD (Separation of Duties) | F495 audit, F492 evidence — write-only audit paths |

---

## DESIGN RECORDS — DR-66-DR-76

```
DR-66: Component Descriptors as Code
  Decision: Component profiles stored as YAML in Git repos (catalog-info.yaml pattern),
            ingested via webhook → validated → upserted to ES catalog.
  Rationale: Single source of truth in Git; CI/CD-native versioning and review;
             enables dependency graph automation without manual CMDB maintenance.
  Consequences: Catalog lag equals Git webhook latency (~seconds); acceptable for
                control-plane decisions. Backfill tooling required for existing repos.

DR-67: Namespace-per-PR as Default Ephemeral Isolation
  Decision: Default ephemeral environment isolation = K8s namespace per PR.
            Network policies restrict ingress/egress. ResourceQuota enforced.
            Cluster-per-PR reserved for tier-1 sensitive workloads only.
  Rationale: Namespace isolation is fast (seconds vs minutes for cluster), cost-effective,
             and sufficient when combined with NetworkPolicy and quotas.
             DR-67 supersedes "cluster-per-PR" for standard tier.
  Consequences: Cluster-scoped resources can conflict; must manage with prefix conventions.
                Sensitive profiles (local-sensitive) must enforce zero-egress NetworkPolicy.

DR-68: IaC Behind Fabric — No Direct Terraform/Pulumi SDK Import
  Decision: IIaCRunnerService (F471) wraps Terraform/Pulumi behind CORE FABRIC HTTP
            adapter. Engine-generated services never import terraform/pulumi SDKs directly.
  Rationale: Preserves provider-swappability (Terraform → Pulumi → Crossplane) via config.
             Aligns with fabric-first philosophy. IaC tool is an implementation detail.
  Consequences: Requires a thin IaC API server (or exec wrapper) per provider.
                Config declares which IaC runner to use per environment profile.

DR-69: Idempotency Keys on All Provisioning and Onboarding Endpoints
  Decision: Every "create" endpoint in Environment Factory and Tenant Onboarding
            requires an Idempotency-Key header. Deduplication table per (key, source).
  Rationale: PR webhooks fire multiple times; network retries during provisioning
             would create duplicate environments/tenants without idempotency.
  Consequences: Idempotency table needs TTL cleanup. Response must return same result
                on retry (cached response for TTL window).

DR-70: Config-Layer Merge Hierarchy
  Decision: Config resolution order (lowest → highest priority):
            global-defaults → tier-defaults → tenant-overrides → env-overrides.
            Resolved bundle cached in Redis; invalidated on any layer change.
  Rationale: Supports tenant customization without code forks.
             Environment can override tenant config for ephemeral test isolation.
  Consequences: Cache invalidation must be tenant+env scoped. Never invalidate all.

DR-71: Secret References Only — Never Secret Values in Engine DB
  Decision: ConfigBundle stores only vault reference paths (e.g., kv/prod/svc/key).
            ISecretRefValidatorService (F475) verifies existence, never retrieves value.
  Rationale: Prevents secret sprawl; reduces blast radius; supports key rotation.
  Consequences: Applications resolve their own secrets at startup via vault SDK.
                Engine cannot validate secret VALUE validity — only existence.

DR-72: Readiness Report as First-Class Promotion Gate
  Decision: No deployment can be promoted dev→stage or stage→prod without a
            passing ReadinessReport artifact (F488) linked to that FlowInstance.
            BFA stress tests must be included in the readiness gate.
  Rationale: Prevents undocumented promotions; produces compliance evidence trail.
  Consequences: ReadinessReport must be generated within FlowInstance scope.
                Promotion gate (F481) hard-blocks without valid report.

DR-73: Restore Drills are Non-Negotiable — Tier-1 Blocks Promotion
  Decision: Tier-1 components must have a passing restore drill within the last 7 days
            to be eligible for production promotion. Drill evidence stored in ES WORM.
  Rationale: DR evidence is not optional; un-tested restores are un-tested DR.
             Aligns with 19-* documents' "restore drills: non-negotiable" requirement.
  Consequences: Promotion pipeline must check IDrillEvidenceService (F492) freshness.
                Tier-1 component owners are notified 24h before drill expiry.

DR-74: Immutable Evidence Store (DR Drills + Audit)
  Decision: IDrillEvidenceService (F492) and IControlPlaneAuditService (F495) use
            append-only storage (ES WORM index or PG with no-update triggers).
            No update or delete operations are permitted on evidence records.
  Rationale: Evidence integrity required for compliance and forensics.
             Parallels DR-58 (Immutable Raw Zone) from FLOW-14.

DR-75: Audit Log Survives Tenant Offboarding
  Decision: Audit logs related to a tenant are preserved per retention policy
            even after tenant offboarding/data purge. Logs owned by audit service,
            not tenant data namespace.
  Rationale: Regulatory requirement; forensics access post-offboarding.
  Consequences: Tenant offboarding saga (F502) must NOT delete audit records.

DR-76: Tenant Isolation Inherits FLOW-08 Multi-Tenant Model + Extends for DevOps
  Decision: FLOW-19 multi-tenant patterns build on FLOW-08 (DR-65) tenant model.
            FLOW-19 adds: tenant-scoped environment provisioning, per-tenant
            pipeline contracts, per-tenant config layers, and per-tenant DR drill
            scheduling. All isolation primitives (DNA-5, F461-F463 from FLOW-14)
            remain unchanged.
  Rationale: Consistency across flows; no duplicate isolation frameworks.
```

---

## BACKWARD COMPATIBILITY

```
F1-F465:   UNCHANGED ✅
T1-T178:   UNCHANGED ✅ (task types defined in FLOW19_TASK_TYPES_CATALOG.md)
Tpl 1-35:  UNCHANGED ✅
CF-1-213:  UNCHANGED ✅
ST-1-103:  UNCHANGED ✅
SK-1-98:   UNCHANGED ✅
DD-1-85:   UNCHANGED ✅
DR-1-65:   UNCHANGED ✅
DNA-1-9:   STABLE ✅
EP-1-5:    STABLE ✅
```

---

## SAVE POINT: FLOW19:P1:ENGINES ✅
## Next: FLOW19_TASK_TYPES_CATALOG.md (T179-T196, AF maps, Templates 36-38)
