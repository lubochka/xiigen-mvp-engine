# SKILLS FACTORY RAG — FLOW-19: CI/CD & DevOps Control Plane
## Extends SKILLS_FACTORY_RAG_MERGED.md | SK-99-SK-112
## Pre-existing SK-1-SK-98 UNCHANGED ✅

---

## AF-4 RAG SEARCH INDEX — FLOW-19 ADDITIONS

These skills are indexed by AF-4 (RAG Task Context) for retrieval when generating
FLOW-19 services. Each skill includes: pattern description, DNA applicability,
primary use factories, and AF-4 query terms.

---

## SK-99: Component Descriptor Ingestion Pattern
```
SKILL: SK-99
PATTERN: Component Descriptor Ingestion — Git Webhook to ES Catalog
APPLIES TO: F466 ICatalogIngestionService, T179 CATALOG_INGESTION archetype
PRIMARY DNA: DNA-1 (Dictionary parse), DNA-2 (BuildSearchFilter), DNA-3, DNA-5

DESCRIPTION:
  Pattern for ingesting YAML component descriptors from Git webhooks into
  Elasticsearch catalog. Core structure:
  1. Receive webhook payload → extract repo, sha, path, content
  2. Dedup check: lookup dedup_key = {repo}@{sha}:{path} in dedup table
  3. Parse YAML content → Dictionary<string,object> (NEVER typed models — DNA-1)
  4. Schema validation: check required fields (owner, criticality, endpoints, auth)
  5. Secret scan: AI-powered check for secret patterns in content (CF-221)
  6. Upsert to ES catalog index with tenantId scope (DNA-5)
  7. Emit component.profile_validated event via QUEUE FABRIC
  8. Return DataProcessResult<CatalogIngestionResult> (DNA-3)

KEY CODE PATTERN:
  var descriptor = ObjectProcessor.ParseDocument(rawYamlContent);  // DNA-1
  var filter = BuildSearchFilter(new { tenant_id, component_id });  // DNA-2
  var result = await _database.SearchDocumentsAsync(filter);        // never null check
  return DataProcessResult<T>.Success(data) or .Failure(reason);    // DNA-3

AF-4 RETRIEVAL QUERIES: "catalog ingestion", "descriptor yaml parse",
  "component profile ingest", "git webhook catalog"
```

---

## SK-100: Dependency Graph Build Pattern
```
SKILL: SK-100
PATTERN: Neo4j Dependency Graph — Build + Refresh + Circular Detection
APPLIES TO: F468 IDependencyGraphService, T180 MODELING
PRIMARY DNA: DNA-1, DNA-3, DNA-5

DESCRIPTION:
  Pattern for building and maintaining a directed dependency graph in Neo4j
  using DATABASE FABRIC. Never imports Neo4j driver directly — resolves through
  DatabaseService.CreateAsync(provider=Neo4j).

  Core operations:
  - UpsertEdge: MERGE pattern — idempotent edge creation
  - GetUpstream: MATCH (a)-[*]->(b) with tenantId scope
  - Circular detection: DFS with visited set; emit circular_dependency.detected
  - Critical path: Longest path algorithm for deployment ordering

  FREEDOM config: traversal depth (default 5), circular detection mode (warn|block)

AF-4 RETRIEVAL QUERIES: "dependency graph neo4j", "circular dependency detection",
  "component dependency", "critical path graph"
```

---

## SK-101: Environment Validation Gate Pattern
```
SKILL: SK-101
PATTERN: Idempotent Environment Request Gate with Policy Check
APPLIES TO: F470, F474, F476, T181 ENV_PROVISIONING archetype
PRIMARY DNA: DNA-1, DNA-3, DNA-4, DNA-5

DESCRIPTION:
  Pattern for validating environment requests before provisioning begins.
  Critical invariant: reserve idempotency key BEFORE emitting provision event.

  Sequence:
  1. Validate request payload → Dictionary parse (DNA-1)
  2. Check idempotency: SELECT FROM idempotency_keys WHERE key = {env_type}:{pr_number}
     → If found: return cached response (idempotent replay)
  3. Resolve ConfigBundle via F474 (T184 must have completed)
  4. Evaluate policy via F476 → PolicyDecision must be Allow
  5. INSERT idempotency key record (before any state change — EP-4 pattern)
  6. Transition env state to Validating → emit env.provision_step.queued
  7. Return DataProcessResult<EnvironmentRequestResult>

  IRON RULE: Idempotency key insert is the point-of-no-return before emit.
             If insert fails, return error. If emit fails after insert, replay is safe.

AF-4 RETRIEVAL QUERIES: "environment request gate", "idempotency env provisioning",
  "ephemeral environment validation", "policy before provision"
```

---

## SK-102: IaC Provision Saga Pattern
```
SKILL: SK-102
PATTERN: Durable IaC Provisioning Saga with Compensation
APPLIES TO: F470, F471, F472, F482, T182 DURABLE_SAGA
PRIMARY DNA: DNA-1, DNA-3, DNA-4, DNA-5

DESCRIPTION:
  Pattern for orchestrating IaC provisioning as a durable saga with compensation.
  The "store compensation before apply" rule is non-negotiable (EP-4).

  State machine steps (each persisted as StepRun before execution):
  STEP 1: Plan → validate IaC plan; store compensation (destroy) plan
  STEP 2: Apply → call IIaCRunnerService.ApplyAsync(); never direct SDK import (DR-68)
  STEP 3: Wait → poll for apply completion with timeout + backoff
  STEP 4: Sync → call IGitOpsAdapterService.SyncToRefAsync()
  STEP 5: Health → call IDeploymentHealthService.WaitForHealthyAsync()
  STEP 6: Verify → transition to Ready; emit env.ready event

  On any step failure:
  - Retrieve compensation plan from storage
  - Execute IIaCRunnerService.DestroyAsync() with compensation plan
  - Transition to Deleted terminal state
  - Emit env.provision_failed event

  CONCURRENCY: Check CF-214 concurrency lock before Step 2.

AF-4 RETRIEVAL QUERIES: "IaC saga compensation", "terraform fabric", "provision durable saga",
  "environment lifecycle state machine", "cloud provisioning saga"
```

---

## SK-103: Saga Compensation Design Pattern
```
SKILL: SK-103
PATTERN: Generic Saga Compensation Registration and Execution
APPLIES TO: F470, F491, F499, F502, all DURABLE_SAGA archetypes
PRIMARY DNA: DNA-1, DNA-3, DNA-4, DNA-5

DESCRIPTION:
  Reusable pattern for registering and executing compensation in any DURABLE_SAGA.
  Used across: Environment provisioning, Restore drills, Tenant onboarding, Offboarding.

  REGISTRATION (before each side-effect step):
  1. Build compensation payload: Dictionary<string,object> describing undo operation
  2. Store compensation in DATABASE FABRIC BEFORE executing side effect (EP-4)
  3. Include: step_name, compensation_type, compensation_payload, saga_id, tenant_id

  EXECUTION (on saga failure):
  1. Load all stored compensation records in REVERSE order
  2. Execute each compensation operation via original factory (never direct call)
  3. Mark each compensation as executed; update saga state
  4. Emit saga.compensation_completed when all done
  5. Transition saga to terminal Compensated state

  GUARD: Compensation operations must be idempotent (EP-4 pattern — safe re-run).

AF-4 RETRIEVAL QUERIES: "saga compensation", "rollback distributed transaction",
  "undo operation pattern", "durable saga failure handling"
```

---

## SK-104: Pipeline Contract Normalization Pattern
```
SKILL: SK-104
PATTERN: Multi-Provider CI/CD Pipeline Contract Validation
APPLIES TO: F478, F479, F480, T186 PIPELINE_CONTRACT archetype
PRIMARY DNA: DNA-1, DNA-3, DNA-5, DNA-7 (ProviderAgnostic)

DESCRIPTION:
  Pattern for normalizing CI/CD pipeline runs from any provider into a canonical
  contract. Core principle: CI provider is an implementation detail (DNA-7).

  Canonical pipeline phases (order enforced):
  1. build — compile/build artifacts
  2. unit-test — unit tests pass
  3. security-scan — SAST/vulnerability scan
  4. package — container image / package built and pushed
  (Optional:) 5. performance-test, 6. canary, 7. human-approval

  Contract validation algorithm:
  1. Receive pipeline.run_started webhook via F479 (provider-normalized)
  2. Parse phases from pipeline run → Dictionary[] of {phase_name, status, artifacts}
  3. Check mandatory phases present: ["build", "unit-test", "security-scan", "package"]
  4. For each present phase: validate output artifacts if required
  5. Register artifacts via F480 (package phase → container image registration)
  6. Emit gate_result back to PR via F479.ReportGateResultAsync()

  FREEDOM config: optional phases, approval gate triggers per env tier

AF-4 RETRIEVAL QUERIES: "pipeline contract", "CI normalization", "multi-provider CI",
  "build unit-test security package", "pipeline phase validation"
```

---

## SK-105: Deployment Orchestration Pattern
```
SKILL: SK-105
PATTERN: GitOps Sync → Health Check → Test Suite → Readiness Gate
APPLIES TO: F482, F483, F484, F486, F487, F488, T187 ORCHESTRATION
PRIMARY DNA: DNA-1, DNA-3, DNA-5

DESCRIPTION:
  Pattern for orchestrating the complete deploy-and-verify lifecycle within a
  provisioned environment. Critical ordering: sync → healthy → test → report.

  Step sequence:
  1. F482.SyncToRefAsync(commit_sha) → wait for sync_status = Synced
  2. F483.DetectDriftAsync() → assert no unexpected drift
  3. F484.WaitForHealthyAsync(timeout=5min) → all workloads Ready/Running
  4. F486.EnqueueSuitesAsync([config, smoke, integration]) → parallel execution
  5. F487.RunSmokeAsync() → golden path verification
  6. F489.RunDBSuiteAsync(), RunQueueSuiteAsync(), RunAISuiteAsync(), RunRAGSuiteAsync()
  7. F488.GenerateReportAsync(env_id, flow_instance_id) → ReadinessReport artifact
  8. Gate: F488.IsGatePassingAsync() → only then emit env.readiness_confirmed

  IRON RULE: Steps 1-3 must complete before steps 4-6 begin.
             ReadinessReport (Step 7) is the ONLY gate for promotion.

AF-4 RETRIEVAL QUERIES: "deployment orchestration", "gitops sync health", "smoke test suite",
  "readiness report gate", "test orchestration after deploy"
```

---

## SK-106: Readiness Report Pattern
```
SKILL: SK-106
PATTERN: Immutable ReadinessReport Artifact Generation
APPLIES TO: F488 IReadinessReportService, T190 VALIDATION
PRIMARY DNA: DNA-1, DNA-3, DNA-5

DESCRIPTION:
  ReadinessReport is an immutable artifact generated at the end of every
  test orchestration phase. It serves as the ONLY gate for promotion decisions.

  Report structure (Dictionary<string,object> — DNA-1):
  {
    report_id: UUID,
    env_id: ...,
    flow_instance_id: ...,
    tenant_id: ...,         ← DNA-5
    overall_pass: true/false,
    generated_at: ISO8601,
    suites: [
      { suite_id, suite_type, pass, assertions_count, failed_assertions, duration_ms }
    ],
    policy_decisions: [ { policy_id, allow, obligations[] } ],
    artifact_links: [ { artifact_id, kind, sha256, uri } ],
    config_version: ...,
    drift_status: clean|acknowledged|unacknowledged
  }

  Immutability: Once GenerateReportAsync completes, report stored in ES.
                No update operations permitted. New report requires new FlowInstance.

AF-4 RETRIEVAL QUERIES: "readiness report", "promotion gate evidence",
  "deployment verification artifact", "test suite aggregate"
```

---

## SK-107: Restore Drill Orchestration Pattern
```
SKILL: SK-107
PATTERN: Non-Negotiable DR Drill Saga with Isolated Sandbox
APPLIES TO: F490, F491, F492, F493, F487, T193 RESTORE_DRILL archetype
PRIMARY DNA: DNA-1, DNA-3, DNA-4, DNA-5

DESCRIPTION:
  Pattern for the complete restore drill lifecycle. Two invariants:
  1. Sandbox is ALWAYS isolated from production (zero-egress NetworkPolicy — CF-228)
  2. Evidence is ALWAYS stored immutably before sandbox destruction (CF-234)

  Drill lifecycle:
  1. F490.RunBackupAsync() → verify integrity (T192 must complete first — CF-233)
  2. F493.ProvisionSandboxAsync(zero_egress=true) → namespace with NetworkPolicy
  3. F493.SeedFromBackupAsync(backup_artifact_pointer) → NEVER from production
  4. F490.RestoreAsync(sandbox_env_id, backup_id) → measure restore_start_time
  5. F487.RunSmokeAsync(env=sandbox) → golden path in isolated sandbox
  6. Capture RTO: restore_end_time - restore_start_time → DrillResult
  7. F492.StoreEvidenceAsync(DrillResult) → ES WORM append-only (CF-234)
  8. Emit restore_drill.completed event
  9. F493.DestroySandboxAsync() → MUST complete (CF-220 equivalent for sandbox)
  10. Update promotion eligibility for target component

  TIMING: Start → SandboxReady → RestoreComplete → SmokePass = measured as RTO

AF-4 RETRIEVAL QUERIES: "restore drill", "DR evidence", "sandbox restore verification",
  "backup restore smoke", "disaster recovery drill"
```

---

## SK-108: Sandbox Isolation Pattern
```
SKILL: SK-108
PATTERN: Zero-Egress Isolated Sandbox Environment for DR Drills
APPLIES TO: F493 IRestoreSandboxService, T193 RESTORE_DRILL
PRIMARY DNA: DNA-1, DNA-3, DNA-5

DESCRIPTION:
  Sandboxes for DR drills have STRICTER isolation than regular ephemeral envs.
  No external network egress permitted. Data source is backup artifacts ONLY.

  K8s manifest additions for sandbox namespace (generated by F485 ManifestRenderer):
  - NetworkPolicy: deny all egress except internal cluster DNS
  - ResourceQuota: stricter limits (drill is read-heavy, not write-heavy)
  - Namespace name: {tenant_id}-sandbox-drill-{drill_id} (CF-230 scoped)
  - Label: sandbox_type=dr-drill

  Seed validation:
  1. Seed source MUST be backup artifact pointer (sha256 verified — CF-225)
  2. NEVER accept direct database connection as seed source
  3. Seed is one-time operation; no live data after initial restore

AF-4 RETRIEVAL QUERIES: "sandbox isolation dr", "zero egress namespace",
  "restore sandbox", "drill environment isolation"
```

---

## SK-109: Config Layer Resolution Pattern
```
SKILL: SK-109
PATTERN: Multi-Layer Config Merge with Secret Reference Validation
APPLIES TO: F474, F475, F477, T184 VALIDATION
PRIMARY DNA: DNA-1, DNA-2, DNA-3, DNA-5

DESCRIPTION:
  Config resolution produces a ConfigBundle — never stores secret values (DR-71).
  Layer priority (highest wins): env-override > tenant-override > tier-default > global-default

  Resolution algorithm:
  1. Load all 4 layers from DATABASE FABRIC (PG)
  2. Merge: start with global, apply tier, apply tenant, apply env override
  3. Result: ConfigBundle = Dictionary<string,object> of {key: value|secretRef}
  4. Identify all secretRef entries: values starting with "kv/" or "arn:aws:secretsmanager"
  5. F475.ValidateRefsExistAsync(secretRefs) → existence check only, NEVER retrieve value
  6. If any ref missing → return DataProcessResult.Failure with missing ref list
  7. F477.SnapshotAsync(ConfigBundle, flow_instance_id) → immutable version snapshot
  8. Cache resolved bundle in Redis: key = {tenant_id}:{env_id}:config with TTL

  Cache invalidation: Any layer change triggers targeted invalidation (CF-229 — tenant-scoped).

AF-4 RETRIEVAL QUERIES: "config layer merge", "secret reference validation",
  "config bundle resolve", "environment config tenant config"
```

---

## SK-110: Policy-as-Code Evaluation Pattern
```
SKILL: SK-110
PATTERN: ABAC Policy Evaluation for Routing and Data Classification
APPLIES TO: F476 IPolicyEngineService, T185 VALIDATION
PRIMARY DNA: DNA-1, DNA-3, DNA-5

DESCRIPTION:
  Policies stored as documents in Elasticsearch (OPA-compatible rule format).
  Resolved via DATABASE FABRIC. AI ENGINE FABRIC used for complex ABAC reasoning.

  Evaluation sequence:
  1. Load applicable policies: filter by policy_set, tenant_id, component_id
  2. Build evaluation context: Dictionary{subject, resource, action, environment, data_classification}
  3. Evaluate routing rules: sensitive data → local_only = true
  4. Evaluate region rules: check allowed_regions list
  5. Evaluate logging rules: PII redaction requirements
  6. Collect all applicable obligations
  7. Return PolicyDecision{allow|deny, obligations[], reasoning, evaluated_at}

  CRITICAL: If data_classification=sensitive AND target=external_ai_provider → DENY (CF-228)
  FREEDOM config: policy sets per tenant tier, strictness level

AF-4 RETRIEVAL QUERIES: "policy evaluation ABAC", "data classification routing",
  "sensitive data policy", "policy engine fabric", "routing policy decision"
```

---

## SK-111: Tenant Onboarding Idempotent Saga Pattern
```
SKILL: SK-111
PATTERN: Idempotent Multi-Step Tenant Onboarding with Compensation
APPLIES TO: F497-F502, T195 DURABLE_SAGA
PRIMARY DNA: DNA-1, DNA-3, DNA-4, DNA-5

DESCRIPTION:
  Tenant onboarding is a distributed transaction that MUST be idempotent at
  every step. Uses Idempotency-Key header for the entire saga and per-step.

  Onboarding saga steps (each stored in PG as SagaStep before execution):
  1. CreateTenant → INSERT tenants with UUID; idempotent via ON CONFLICT DO NOTHING
  2. ConfigureIdentity → create tenant claim + SSO config; idempotent via upsert
  3. AllocateBinding → create storage binding per isolation tier; idempotent
  4. SeedConfig → insert tier defaults + initial overrides; idempotent via version check
  5. SetQuotas → configure rate limits and resource quotas; idempotent via upsert
  6. RunSmokeTest → F487 smoke against new tenant sandbox (isolated) → must pass
  7. ActivateTenant → UPDATE tenants SET status='active'; emit tenant.activated event

  Compensation (reverse order on failure):
  - DeleteTenant → remove tenant record if not yet activated
  - RemoveBinding → delete storage binding
  - RevokeIdentity → remove SSO config
  (Never delete audit events — DR-75)

AF-4 RETRIEVAL QUERIES: "tenant onboarding saga", "multi-tenant provision idempotent",
  "tenant creation compensation", "SaaS tenant onboarding"
```

---

## SK-112: Control Plane Audit Pattern
```
SKILL: SK-112
PATTERN: Append-Only Immutable Audit Trail for Control Plane Events
APPLIES TO: F495 IControlPlaneAuditService, all FLOW-19 saga archetypes
PRIMARY DNA: DNA-1, DNA-3, DNA-5

DESCRIPTION:
  Every privileged control plane action produces an audit event.
  Events are append-only (DR-74, DR-75). No update or delete.

  Audit event structure (Dictionary<string,object> — DNA-1):
  {
    event_id: UUID,
    tenant_id: ...,           ← DNA-5
    actor: {id, type, ip},
    action: {type, target_type, target_id},
    outcome: {success|failure|denied},
    reason: ...,
    timestamp: ISO8601,
    flow_instance_id: ...,    ← links to workflow context
    source_plane: devops|warehouse|...
  }

  Storage: PG WORM (trigger prevents UPDATE/DELETE) + ES (searchable index).
  Retention: Follow DR-75 — audit logs survive tenant offboarding.

  Categories of mandatory audit events in FLOW-19:
  - env.created, env.destroyed, env.ttl_expired
  - config.resolved, config.snapshotted
  - policy.denied, policy.allowed
  - backup.completed, drill.completed, drill.failed
  - tenant.onboarding.started/completed/failed
  - tenant.offboarding.started/completed
  - promotion.approved, promotion.rejected, promotion.rollback
  - secret_ref.validated, secret_ref.missing

AF-4 RETRIEVAL QUERIES: "audit trail append only", "control plane audit",
  "immutable audit log", "WORM audit", "compliance event log"
```

---

## SAVE POINT: FLOW19:P4a:SKILLS ✅
