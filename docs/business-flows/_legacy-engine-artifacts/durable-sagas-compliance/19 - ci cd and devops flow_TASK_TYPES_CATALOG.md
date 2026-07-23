# TASK TYPES CATALOG — FLOW-19: CI/CD & DevOps Control Plane
## Extends TASK_TYPES_CATALOG_MERGED.md | T179-T196 | Templates 36-38
## Pre-existing T1-T178 UNCHANGED ✅

---

## NEW ARCHETYPES — FLOW-19

| Archetype | Task Type(s) | Description |
|-----------|-------------|-------------|
| CATALOG_INGESTION | T179 | Git-triggered component descriptor ingestion with schema validation |
| ENV_PROVISIONING | T181 | Durable, idempotent environment lifecycle from request to ready |
| PIPELINE_CONTRACT | T186 | CI/CD normalization gate across multi-provider pipelines |
| RESTORE_DRILL | T193 | Non-negotiable DR evidence generation with sandbox + smoke verification |

---

## TASK TYPE: T179 — Component Descriptor Ingestion Gate
```
ARCHETYPE: CATALOG_INGESTION (NEW)
ENTRY: Fires on component.descriptor_changed event (Git webhook via F466)
PURPOSE: Ingest, validate, and publish component descriptor from Git to ES catalog.
         Builds dependency edges. Emits component.profile_validated event.
DISTINCT FROM: T169 (INGESTION archetype handles external push events — webhooks from
               3rd-party APIs). T179 handles internal Git descriptor ingestion with
               full schema validation + dependency graph update.
FACTORY DEPENDENCIES: F466, F467, F468, F469 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F466 → DATABASE FABRIC (ES catalog index) + QUEUE FABRIC (events)
  F467 → DATABASE FABRIC (PG profile metadata)
  F468 → DATABASE FABRIC (Neo4j graph) + RAG FABRIC (similarity matching)
  F469 → DATABASE FABRIC (ES full-text search)
AF CONFIGURATION:
  AF-1 (Genesis): generate ingestion service from descriptor schema spec
  AF-2 (Planning): decompose into parse → validate → upsert → graph-update → publish
  AF-4 (RAG): search SK-99 (catalog ingestion patterns) and SK-100 (dependency graph)
  AF-6 (Code Review): verify no typed descriptor models (DNA-1), BuildSearchFilter (DNA-2)
  AF-7 (Compliance): DNA-1 through DNA-9 scan
  AF-8 (Security): no secret values in descriptor, no PII in component profiles
  AF-9 (Judge): validate dedup key format, graph edge integrity, ES mapping compliance
  AF-11 (Feedback): store ingestion quality score for catalog completeness tracking
BFA VALIDATION: CF-214 (descriptor before environment), CF-215 (graph before promotion)
MACHINE (fixed):
  - Dedup key = {repo}@{sha}:{descriptor_path}
  - Profile version = semver from descriptor.version field
  - Dependency edges derived from descriptor.dependencies section
  - Published event always emitted (even for StoredInvalid — validation errors included)
FREEDOM (configurable):
  - Descriptor schema version (v1, v2 — backward compatible)
  - Validation strictness (warn vs block on missing fields)
  - Graph traversal depth for impact analysis
IRON RULES:
  IR-179-1: NEVER store typed descriptor models — Dictionary<string,object> only (DNA-1)
  IR-179-2: NEVER advance catalog state without dedup key check — BUILD FAILURE
  IR-179-3: NEVER skip dependency graph update on valid descriptor — BUILD FAILURE
  IR-179-4: NEVER store secret values found in descriptor content — BUILD FAILURE
  IR-179-5: NEVER skip tenantId scope on ES catalog writes (DNA-5) — BUILD FAILURE
  IR-179-6: NEVER emit profile_validated with incomplete profile version — BUILD FAILURE
QUALITY GATES (AF-9 checks):
  QG-179-1: Descriptor parses to Dictionary without type casting
  QG-179-2: All required profile fields present (owner, criticality, endpoints, auth)
  QG-179-3: Dependency edges reference valid component IDs
  QG-179-4: ES write confirmed with DataProcessResult.Success
  QG-179-5: Dedup table confirms no duplicate processing of same (repo,sha,path)
  QG-179-6: component.profile_validated event emitted with correct payload
```

---

## TASK TYPE: T180 — Dependency Graph Refresh Cycle
```
ARCHETYPE: MODELING
ENTRY: Fires on schedule (configurable interval) or on component.profile_validated event
PURPOSE: Recompute full dependency graph from all active component profiles.
         Detects orphaned components, circular dependencies, critical path changes.
DISTINCT FROM: T179 (T179 handles single-descriptor ingestion; T180 handles
               full-graph recomputation for consistency and health checks).
FACTORY DEPENDENCIES: F467, F468, F469 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F467 → DATABASE FABRIC (PG profile metadata source)
  F468 → DATABASE FABRIC (Neo4j graph rebuild target)
  F469 → DATABASE FABRIC (ES — orphan/circular detection queries)
AF CONFIGURATION:
  AF-2 (Planning): decompose into load → diff → rebuild → validate → report
  AF-4 (RAG): search SK-100 (graph refresh patterns)
  AF-7 (Compliance): DNA-5 scope isolation on all graph operations
  AF-9 (Judge): validate graph acyclicity, critical path validity
BFA VALIDATION: CF-215 (graph must be consistent before promotion gates)
IRON RULES:
  IR-180-1: NEVER mutate graph without diff + validation first — BUILD FAILURE
  IR-180-2: NEVER skip circular dependency detection — BUILD FAILURE
  IR-180-3: ALL graph nodes must have tenantId scope (DNA-5) — BUILD FAILURE
QUALITY GATES (AF-9):
  QG-180-1: Graph refresh completes with DataProcessResult.Success
  QG-180-2: No circular dependencies detected (or explicit override with CF-215 bypass)
  QG-180-3: Orphan count delta reported and alertable
  QG-180-4: Critical path computation result cached for promotion gate use
```

---

## TASK TYPE: T181 — Environment Request Gate
```
ARCHETYPE: ENV_PROVISIONING (NEW)
ENTRY: Fires on env.requested event (from CI pipeline webhook via F479, or manual trigger)
PURPOSE: Validate environment request, check policy (CF-228 sensitive routing),
         reserve idempotency key, emit env.provision_step.queued to start saga.
DISTINCT FROM: T182 (T181 is the gate/validation; T182 is the durable saga execution).
               T181 runs in seconds; T182 may run for minutes.
FACTORY DEPENDENCIES: F470, F474, F476, F477 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F470 → CORE FABRIC (MicroserviceBase) + DATABASE FABRIC (PG env state)
  F474 → DATABASE FABRIC (PG config layers + Redis cache)
  F476 → AI ENGINE FABRIC (policy reasoning) + DATABASE FABRIC (ES policy store)
  F477 → DATABASE FABRIC (PG config snapshots)
AF CONFIGURATION:
  AF-2 (Planning): validate → policy-check → idempotency-reserve → enqueue
  AF-4 (RAG): search SK-101 (environment validation patterns)
  AF-7 (Compliance): DNA-5 tenantId, DNA-3 DataProcessResult
  AF-9 (Judge): validate policy decision completeness, idempotency key uniqueness
BFA VALIDATION: CF-216 (config-before-provisioning), CF-228 (sensitive routing)
MACHINE: Idempotency key = (env_type, pr_number) or request UUID
FREEDOM: Policy strictness, allowed env profiles per tenant tier
IRON RULES:
  IR-181-1: NEVER proceed without PolicyDecision.Allow for sensitive profiles — BUILD FAILURE
  IR-181-2: NEVER provision without valid ConfigBundle — BUILD FAILURE
  IR-181-3: NEVER skip idempotency key reservation — BUILD FAILURE
  IR-181-4: local-sensitive profile MUST enforce zero-egress NetworkPolicy (CF-228) — BUILD FAILURE
QUALITY GATES (AF-9):
  QG-181-1: PolicyDecision contains non-empty obligations list
  QG-181-2: ConfigBundle has all required keys for env profile
  QG-181-3: Idempotency key stored before env.provision_step.queued emitted
  QG-181-4: Environment state = Validating before gate exits
```

---

## TASK TYPE: T182 — IaC Provision Saga
```
ARCHETYPE: DURABLE_SAGA
ENTRY: Fires on env.provision_step.queued event
PURPOSE: Execute full infrastructure provisioning lifecycle:
         plan → apply → deploy → verify resources. Persist StepRun before every
         side effect (EP-4). Register compensation (destroy) plan before apply.
         Enforce concurrency limit per cloud account/region (CF-214).
DISTINCT FROM: T168 (FLOW-14 DURABLE_SAGA handles incremental sync; T182 handles
               infrastructure provisioning with IaC compensation semantics).
FACTORY DEPENDENCIES: F470, F471, F472, F482 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F470 → CORE FABRIC + DATABASE FABRIC (PG state)
  F471 → CORE FABRIC (HTTP — IaC runner) + DATABASE FABRIC (PG IaC outputs)
  F472 → QUEUE FABRIC + DATABASE FABRIC (Redis TTL + PG instance)
  F482 → CORE FABRIC (HTTP — GitOps sync)
AF CONFIGURATION:
  AF-1 (Genesis): generate IaC wrapper service from provider spec
  AF-2 (Planning): plan → validate-plan → store-compensation → apply → gitops-sync → health-check
  AF-4 (RAG): search SK-102 (IaC saga patterns), SK-103 (compensation design)
  AF-6 (Code Review): verify no direct Terraform/Pulumi SDK imports (DR-68)
  AF-7 (Compliance): DNA-3 DataProcessResult, DNA-4 MicroserviceBase, DNA-5 scope
  AF-9 (Judge): validate compensation plan exists before apply, state persisted
MACHINE: State machine: Provisioning → Deploying → Testing → Ready | Failed → Deleting
IRON RULES:
  IR-182-1: NEVER apply IaC without storing compensation plan first (EP-4 pattern) — BUILD FAILURE
  IR-182-2: NEVER advance state without persisting StepRun — BUILD FAILURE
  IR-182-3: NEVER exceed concurrency limit per cloud account (CF-214) — BUILD FAILURE
  IR-182-4: NEVER import Terraform/Pulumi/Crossplane SDK directly (DR-68) — BUILD FAILURE
  IR-182-5: Failed state MUST trigger compensation cleanup — BUILD FAILURE if skipped
  IR-182-6: ALL operations include tenantId scope (DNA-5) — BUILD FAILURE
  IR-182-7: NEVER store secret values in IaC outputs — BUILD FAILURE
QUALITY GATES (AF-9):
  QG-182-1: Compensation plan serialized and stored before Apply call
  QG-182-2: All StepRuns have output_json before next step starts
  QG-182-3: GitOps sync confirms reconciled state before Testing phase
  QG-182-4: Environment reaches Ready within configurable timeout
  QG-182-5: Failed environments trigger compensation and reach Deleted
  QG-182-6: Idempotency verified — re-run of same flow_instance_id is safe
```

---

## TASK TYPE: T183 — Ephemeral Env TTL Expiry Gate
```
ARCHETYPE: VALIDATION
ENTRY: Fires on env.ttl_expired event (from Redis TTL expiry via F472)
PURPOSE: Validate TTL expiry authenticity, transition env to Expiring state,
         trigger cleanup saga (compensation via F471). Prevent orphaned resources.
FACTORY DEPENDENCIES: F470, F472 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F470 → CORE FABRIC + DATABASE FABRIC (PG env state)
  F472 → QUEUE FABRIC + DATABASE FABRIC (Redis + PG)
AF CONFIGURATION:
  AF-2 (Planning): validate expiry → transition state → enqueue cleanup
  AF-7 (Compliance): DNA-5 scope, DNA-3 result
  AF-9 (Judge): verify env not already Deleted before processing expiry
IRON RULES:
  IR-183-1: NEVER delete already-Deleted environment — idempotent cleanup only
  IR-183-2: NEVER skip cleanup on TTL expiry — BUILD FAILURE (resource leak)
  IR-183-3: Cleanup must complete within timeout — DLQ after max retries
QUALITY GATES:
  QG-183-1: Environment state transitions to Expiring before cleanup enqueued
  QG-183-2: Cleanup saga reaches Deleted terminal state
  QG-183-3: Audit event logged for environment deletion
```

---

## TASK TYPE: T184 — Config Layer Resolution Gate
```
ARCHETYPE: VALIDATION
ENTRY: Fires before any deployment step that requires resolved configuration
PURPOSE: Merge config layers (global → tier → tenant → env), validate all required
         keys present, validate all secret references exist in vault (F475),
         cache resolved ConfigBundle, snapshot config version for this deployment.
DISTINCT FROM: T185 (T184 is config resolution; T185 is policy evaluation).
               T184 always precedes T185 in pipeline sequence.
FACTORY DEPENDENCIES: F474, F475, F477 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F474 → DATABASE FABRIC (PG layers + Redis cache)
  F475 → CORE FABRIC (HTTP — vault existence check)
  F477 → DATABASE FABRIC (PG config snapshots)
AF CONFIGURATION:
  AF-2 (Planning): layer-merge → key-validate → secret-ref-validate → cache → snapshot
  AF-7 (Compliance): DNA-5 tenantId, DNA-3 DataProcessResult
  AF-9 (Judge): all required keys present, all secret refs verified
IRON RULES:
  IR-184-1: NEVER store secret VALUES in ConfigBundle — BUILD FAILURE (DR-71)
  IR-184-2: NEVER proceed with missing required keys — BUILD FAILURE
  IR-184-3: NEVER skip secret reference existence check — BUILD FAILURE
  IR-184-4: Config snapshot MUST be stored before deployment step begins — BUILD FAILURE
QUALITY GATES:
  QG-184-1: ConfigBundle contains no secret values — only reference paths
  QG-184-2: All required keys resolved for target env profile
  QG-184-3: All secret references return "exists" from vault check
  QG-184-4: Config version stored and linked to FlowInstance
  QG-184-5: Cache invalidation verified before resolution (not stale)
```

---

## TASK TYPE: T185 — Policy Evaluation Gate
```
ARCHETYPE: VALIDATION
ENTRY: Fires after T184 (config resolved), before environment provisioning
PURPOSE: Evaluate routing/region/logging/data-classification policies.
         Enforce sensitive-data routing to local-only models (CF-228).
         Enforce approved regions. Return PolicyDecision{allow|deny, obligations}.
FACTORY DEPENDENCIES: F476 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F476 → AI ENGINE FABRIC (ABAC policy reasoning) + DATABASE FABRIC (ES policy store)
AF CONFIGURATION:
  AF-2 (Planning): load policies → evaluate attributes → return decision + obligations
  AF-8 (Security): verify policy decision includes data-classification check
  AF-9 (Judge): validate obligations are actionable and complete
IRON RULES:
  IR-185-1: NEVER allow sensitive data routes to external AI providers without PolicyDecision.Allow (CF-228) — BUILD FAILURE
  IR-185-2: NEVER skip region restriction check — BUILD FAILURE
  IR-185-3: PolicyDecision with deny MUST include reason and remediation hint — BUILD FAILURE
QUALITY GATES:
  QG-185-1: PolicyDecision serialized with obligations[] — never empty
  QG-185-2: Sensitive routing obligations enforced before env provisioning
  QG-185-3: Policy evaluation audit event logged
```

---

## TASK TYPE: T186 — Pipeline Contract Normalization Gate
```
ARCHETYPE: PIPELINE_CONTRACT (NEW)
ENTRY: Fires on pipeline.run_started event (from CI webhook via F479)
PURPOSE: Validate that the triggering CI pipeline conforms to the canonical contract
         (build → unit-test → security-scan → package → deploy-ephemeral →
          integration-test → promote → rollback). Emit gate results back to PR.
DISTINCT FROM: T187 (T186 validates STRUCTURE of pipeline; T187 orchestrates
               actual deployment + test execution within a provisioned environment).
FACTORY DEPENDENCIES: F478, F479, F480, F481 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F478 → DATABASE FABRIC (ES — contract definitions)
  F479 → CORE FABRIC (HTTP — CI provider) + QUEUE FABRIC
  F480 → DATABASE FABRIC (ES — artifact metadata)
  F481 → QUEUE FABRIC + DATABASE FABRIC (PG — promotion log)
AF CONFIGURATION:
  AF-1 (Genesis): generate contract validation service from contract spec
  AF-2 (Planning): parse pipeline run → match contract → report gaps → emit gate result
  AF-4 (RAG): search SK-104 (pipeline contract patterns)
  AF-6 (Code Review): verify no hardcoded CI provider values
  AF-7 (Compliance): DNA-5, DNA-3
  AF-9 (Judge): validate all mandatory phases present
MACHINE: Required phases are non-configurable: build, unit-test, security-scan, package
FREEDOM: Optional phases (performance-test, canary), approval gate config per env tier
IRON RULES:
  IR-186-1: NEVER pass gate if mandatory phases are missing — BUILD FAILURE
  IR-186-2: NEVER hardcode CI provider values in contract logic (DNA-7) — BUILD FAILURE
  IR-186-3: NEVER skip artifact registration (F480) for package phase — BUILD FAILURE
  IR-186-4: Gate result MUST be reported back to PR status within timeout — BUILD FAILURE
QUALITY GATES:
  QG-186-1: All 4 mandatory phases present in pipeline run
  QG-186-2: Artifact registered with sha256 and flow_instance_id link
  QG-186-3: PR status check updated with gate result
  QG-186-4: Contract version matched and logged
```

---

## TASK TYPE: T187 — Ephemeral Deploy + Smoke Suite
```
ARCHETYPE: ORCHESTRATION
ENTRY: Fires after T182 reaches Ready state (env.ready event)
PURPOSE: Deploy workload to ready ephemeral environment via GitOps sync (F482),
         then execute smoke + config test suites (F486, F487). Gate pipeline
         on passing ReadinessReport (F488).
FACTORY DEPENDENCIES: F482, F483, F486, F487, F488, F489 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F482 → CORE FABRIC (HTTP — GitOps API)
  F483 → DATABASE FABRIC (ES — drift snapshots)
  F486 → QUEUE FABRIC + DATABASE FABRIC (ES test runs)
  F487 → CORE FABRIC (HTTP — endpoints under test)
  F488 → DATABASE FABRIC (ES + PG — readiness reports)
  F489 → CORE FABRIC (HTTP) + QUEUE FABRIC
AF CONFIGURATION:
  AF-1 (Genesis): generate deployment orchestrator from env profile
  AF-2 (Planning): gitops-sync → wait-healthy → config-tests → smoke → integration → report
  AF-4 (RAG): search SK-105 (deployment orchestration), SK-106 (readiness patterns)
  AF-5 (Multi-model): parallel smoke + integration test execution
  AF-9 (Judge): readiness report completeness, all mandatory suites passed
IRON RULES:
  IR-187-1: NEVER promote without passing ReadinessReport — BUILD FAILURE (DR-72)
  IR-187-2: NEVER skip drift detection after GitOps sync — BUILD FAILURE
  IR-187-3: NEVER run tests before GitOps sync confirms Synced state — BUILD FAILURE
  IR-187-4: ReadinessReport MUST be immutable once generated — BUILD FAILURE if mutated
  IR-187-5: ALL test operations scoped to env_id and tenantId — BUILD FAILURE if missing
QUALITY GATES:
  QG-187-1: GitOps sync status = Synced before test suites start
  QG-187-2: Config test suite passes (all required keys, all vault refs exist)
  QG-187-3: Smoke suite passes (DB, queue, AI provider, RAG connectivity)
  QG-187-4: ReadinessReport.overall_pass = true before promotion allowed
  QG-187-5: Drift detection found no unexpected mutations
```

---

## TASK TYPE: T188 — GitOps Sync & Drift Detection Gate
```
ARCHETYPE: VALIDATION
ENTRY: Fires on deployment.sync_requested event
PURPOSE: Request GitOps sync to target commit SHA. Monitor for OutOfSync.
         Detect config drift post-deploy. Block promotion on unacknowledged drift.
FACTORY DEPENDENCIES: F482, F483, F484 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F482 → CORE FABRIC (HTTP — GitOps)
  F483 → DATABASE FABRIC (ES — drift snapshots)
  F484 → DATABASE FABRIC (ES health) + QUEUE FABRIC
IRON RULES:
  IR-188-1: NEVER report Synced without confirming live==desired — BUILD FAILURE
  IR-188-2: NEVER skip drift detection after apply — BUILD FAILURE
  IR-188-3: Unacknowledged drift blocks promotion (CF-223) — BUILD FAILURE
QUALITY GATES:
  QG-188-1: Sync status confirmed as Synced
  QG-188-2: Drift snapshot stored with desired_ref and diff_summary
  QG-188-3: Health check passing within timeout after sync
```

---

## TASK TYPE: T189 — Integration Test Orchestration
```
ARCHETYPE: ORCHESTRATION
ENTRY: Fires after smoke suite passes (from T187 ReadinessReport partial completion)
PURPOSE: Run parallel integration test suites: DB connectors, queue pub/sub+DLQ,
         AI provider auth+rate-limit+fallback, RAG index+embed+query+ACL,
         management tool API scopes. Collect all results into final readiness report.
FACTORY DEPENDENCIES: F486, F489, F488 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F486 → QUEUE FABRIC + DATABASE FABRIC (ES)
  F489 → CORE FABRIC (HTTP) + QUEUE FABRIC
  F488 → DATABASE FABRIC (ES + PG)
IRON RULES:
  IR-189-1: NEVER mark readiness passed with failed integration suite — BUILD FAILURE
  IR-189-2: ALL suites must complete (pass OR fail) — timeout handled — BUILD FAILURE if hung
  IR-189-3: Results deduped by (env_id, suite_id, run_id) — BUILD FAILURE if duplicate
QUALITY GATES:
  QG-189-1: All configured suites (DB, Queue, AI, RAG) completed
  QG-189-2: DLQ test executed as part of queue suite
  QG-189-3: AI fallback test executed (primary provider disabled → fallback verified)
  QG-189-4: Integration results linked to ReadinessReport artifact
```

---

## TASK TYPE: T190 — Readiness Report Gate
```
ARCHETYPE: VALIDATION
ENTRY: Fires when all test suites complete (all suite.completed events received)
PURPOSE: Aggregate all test results into immutable ReadinessReport.
         Gate promotion on report outcome. Store report as evidence artifact.
FACTORY DEPENDENCIES: F488, F495 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F488 → DATABASE FABRIC (ES + PG — reports)
  F495 → DATABASE FABRIC (PG WORM + ES — audit)
IRON RULES:
  IR-190-1: Report is immutable once generated (append-only) — BUILD FAILURE if mutated
  IR-190-2: Report MUST include all configured suite results — BUILD FAILURE if partial
  IR-190-3: Report MUST be linked to FlowInstance — BUILD FAILURE if unlinked
QUALITY GATES:
  QG-190-1: ReadinessReport contains policy_decisions, per-suite results, artifact links
  QG-190-2: Audit event logged for report generation
  QG-190-3: Promotion gate (F481) can query report by env_id + flow_instance_id
```

---

## TASK TYPE: T191 — Promotion Ladder Gate
```
ARCHETYPE: ORCHESTRATION
ENTRY: Fires on promotion.requested event (from CI or manual trigger via F481)
PURPOSE: Execute dev → stage → prod promotion sequence. Check readiness report,
         BFA validation, DR drill freshness (tier-1), artifact integrity, optional
         human approval. Record promotion decision. Trigger rollback on failure.
FACTORY DEPENDENCIES: F481, F488, F492, F480, F495 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F481 → QUEUE FABRIC + DATABASE FABRIC (PG)
  F488 → DATABASE FABRIC (ES + PG)
  F492 → DATABASE FABRIC (ES WORM — drill evidence)
  F480 → DATABASE FABRIC (ES — artifact metadata)
  F495 → DATABASE FABRIC (PG WORM + ES — audit)
IRON RULES:
  IR-191-1: NEVER promote without passing ReadinessReport (DR-72) — BUILD FAILURE
  IR-191-2: NEVER promote tier-1 component without fresh drill evidence within 7 days (DR-73) — BUILD FAILURE
  IR-191-3: NEVER promote if BFA stress test suite not passed — BUILD FAILURE
  IR-191-4: NEVER promote with unacknowledged drift (CF-223) — BUILD FAILURE
  IR-191-5: Rollback MUST be triggerable within 5 minutes of failed post-deploy check — BUILD FAILURE if not
QUALITY GATES:
  QG-191-1: ReadinessReport.overall_pass = true
  QG-191-2: Tier-1: DrillEvidence exists and is within 7 days
  QG-191-3: Artifact sha256 integrity check passes
  QG-191-4: Promotion decision recorded in promotion log (immutable)
  QG-191-5: Rollback plan stored and verified executable
```

---

## TASK TYPE: T192 — Backup Run Orchestrator
```
ARCHETYPE: DURABLE_SAGA
ENTRY: Fires on schedule (cron) or backup.run_requested event
PURPOSE: Execute datastore-specific backups in parallel. Verify backup integrity.
         Store backup metadata as evidence. Emit backup.completed events.
         Deduplication by (target, backup_id).
FACTORY DEPENDENCIES: F490, F495 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F490 → DATABASE FABRIC (PG + ES metadata) + QUEUE FABRIC
  F495 → DATABASE FABRIC (PG WORM + ES — audit)
IRON RULES:
  IR-192-1: NEVER advance backup state without persisting StepRun (EP-4) — BUILD FAILURE
  IR-192-2: NEVER skip integrity verification after backup — BUILD FAILURE
  IR-192-3: Backup metadata MUST include artifact pointer + sha256 — BUILD FAILURE
  IR-192-4: backup.completed event MUST be emitted for drill saga (T193) to trigger — BUILD FAILURE
QUALITY GATES:
  QG-192-1: All configured datastores backed up in single run
  QG-192-2: Integrity check passes for every backup artifact
  QG-192-3: Audit event logged per backup target
  QG-192-4: Metadata stored with retention_until date per tier policy
```

---

## TASK TYPE: T193 — Restore Drill Saga
```
ARCHETYPE: RESTORE_DRILL (NEW)
ENTRY: Fires on schedule (weekly minimum for tier-1) or restore_drill.requested event
PURPOSE: Execute full restore drill: provision sandbox (F493) → restore backup (F490) →
         run smoke tests in sandbox (F487) → capture DrillResult → store evidence (F492)
         → destroy sandbox → update promotion eligibility.
DISTINCT FROM: T192 (T192 runs backup; T193 runs restore verification in isolated sandbox).
               Together they form the non-negotiable DR evidence pair.
FACTORY DEPENDENCIES: F490, F491, F492, F493, F487, F495 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F490 → DATABASE FABRIC (PG + ES) + QUEUE FABRIC
  F491 → QUEUE FABRIC + DATABASE FABRIC (PG drill state)
  F492 → DATABASE FABRIC (ES WORM — immutable evidence)
  F493 → QUEUE FABRIC + DATABASE FABRIC (PG sandbox state)
  F487 → CORE FABRIC (HTTP — smoke under test)
  F495 → DATABASE FABRIC (PG WORM + ES — audit)
AF CONFIGURATION:
  AF-1 (Genesis): generate drill orchestrator from drill spec
  AF-2 (Planning): provision-sandbox → restore → smoke → capture-result → store-evidence → destroy
  AF-4 (RAG): search SK-107 (DR drill patterns), SK-108 (sandbox isolation)
  AF-8 (Security): sandbox has zero production network access
  AF-9 (Judge): drill evidence completeness, RTO measurement validity
MACHINE: Drill state: Scheduled → SandboxProvisioning → BackupRunning → RestoreRunning → Verifying → Passed/Failed → Cleanup → Completed
FREEDOM: Drill scope (full vs targeted), tier-specific RTO targets, drill frequency
IRON RULES:
  IR-193-1: NEVER allow sandbox to have production network access — BUILD FAILURE (DR-73)
  IR-193-2: NEVER seed sandbox from anything other than backup artifact — BUILD FAILURE
  IR-193-3: NEVER store mutable evidence — DrillResult is append-only (DR-74) — BUILD FAILURE
  IR-193-4: RTO measurement MUST be captured (restore_start → smoke_pass timestamp) — BUILD FAILURE
  IR-193-5: NEVER skip sandbox destruction after drill — BUILD FAILURE (resource leak)
  IR-193-6: Tier-1 components MUST have drill within 7 days for promotion (DR-73) — BUILD FAILURE if expired
  IR-193-7: ALL drill operations scoped to tenantId (DNA-5) — BUILD FAILURE
QUALITY GATES (AF-9):
  QG-193-1: Sandbox provisioned with zero-egress NetworkPolicy confirmed
  QG-193-2: Restore from backup artifact — NOT from production data
  QG-193-3: Smoke suite passes in sandbox (golden path verification)
  QG-193-4: DrillResult.rto_actual_minutes ≤ DrillResult.rto_target_minutes
  QG-193-5: DrillEvidence stored in ES WORM — immutable record confirmed
  QG-193-6: Audit event logged with drill_id, target, pass/fail, RTO
  QG-193-7: Sandbox destroyed — Deleted terminal state confirmed
  QG-193-8: Promotion eligibility updated for target component
```

---

## TASK TYPE: T194 — DR Evidence Gate
```
ARCHETYPE: VALIDATION
ENTRY: Fires on promotion.requested for tier-1 components (checked by T191)
PURPOSE: Verify drill evidence freshness (within 7 days) for tier-1 components.
         Hard-block promotion if evidence expired or missing. Notify owners.
FACTORY DEPENDENCIES: F492, F495 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F492 → DATABASE FABRIC (ES WORM — drill evidence)
  F495 → DATABASE FABRIC (PG WORM + ES — audit)
IRON RULES:
  IR-194-1: NEVER allow tier-1 promotion without fresh drill evidence (DR-73) — BUILD FAILURE
  IR-194-2: Evidence freshness window is configurable but minimum is 7 days — BUILD FAILURE if bypassed
QUALITY GATES:
  QG-194-1: DrillEvidence exists for all tier-1 factories in promotion scope
  QG-194-2: Evidence.created_at within configured freshness window
  QG-194-3: Audit event logged for gate decision
```

---

## TASK TYPE: T195 — Tenant Onboarding Saga
```
ARCHETYPE: DURABLE_SAGA
ENTRY: Fires on tenant.onboarding_requested event (with Idempotency-Key)
PURPOSE: Orchestrate complete tenant onboarding: create tenant record → configure
         identity → allocate storage binding → seed config + entitlements →
         set quotas/rate limits → run tenant smoke tests → activate tenant.
         Idempotent at every step. Compensation on failure.
FACTORY DEPENDENCIES: F497, F498, F499, F501, F500, F474, F495 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F497 → DATABASE FABRIC (PG — tenant master)
  F498 → DATABASE FABRIC (PG + Redis — binding)
  F499 → QUEUE FABRIC + DATABASE FABRIC (PG onboarding saga)
  F501 → DATABASE FABRIC (PG + Redis — tenant config)
  F500 → QUEUE FABRIC + DATABASE FABRIC (PG + ES — metering)
  F474 → DATABASE FABRIC (PG + Redis — config layers)
  F495 → DATABASE FABRIC (PG WORM + ES — audit)
IRON RULES:
  IR-195-1: NEVER create tenant without immutable UUID tenant_id — BUILD FAILURE
  IR-195-2: EVERY onboarding step MUST carry Idempotency-Key (DR-69) — BUILD FAILURE
  IR-195-3: NEVER activate tenant before smoke tests pass — BUILD FAILURE
  IR-195-4: Failed onboarding MUST trigger compensation (delete tenant resources) — BUILD FAILURE
  IR-195-5: Binding MUST match requested isolation tier — BUILD FAILURE if mismatch
  IR-195-6: ALL operations scoped by tenantId (DNA-5) — BUILD FAILURE
QUALITY GATES:
  QG-195-1: Tenant record exists with immutable tenant_id before any subsequent steps
  QG-195-2: Storage binding created and cached in Redis
  QG-195-3: Config seeded with tier defaults + initial overrides
  QG-195-4: Metering ledger initialized (zero usage)
  QG-195-5: Tenant smoke test passes before activation
  QG-195-6: Activation event emitted after smoke pass
  QG-195-7: Onboarding audit trail complete
```

---

## TASK TYPE: T196 — Tenant Offboarding Saga
```
ARCHETYPE: DURABLE_SAGA
ENTRY: Fires on tenant.offboarding_requested event (requires admin approval gate)
PURPOSE: Execute tenant offboarding lifecycle: suspend writes → export data →
         rotate/revoke keys → purge/tombstone data per retention policy →
         delete tenant resources + credentials → preserve audit logs →
         finalize billing → close tenant.
FACTORY DEPENDENCIES: F497, F498, F499, F502, F500, F492, F495 — resolved via CreateAsync()
FABRIC RESOLUTION:
  F497 → DATABASE FABRIC (PG — tenant master)
  F498 → DATABASE FABRIC (PG + Redis — binding cleanup)
  F499 → QUEUE FABRIC + DATABASE FABRIC (PG)
  F502 → QUEUE FABRIC + DATABASE FABRIC (PG lifecycle)
  F500 → QUEUE FABRIC + DATABASE FABRIC (PG + ES)
  F492 → DATABASE FABRIC (ES WORM — preserve drill evidence)
  F495 → DATABASE FABRIC (PG WORM + ES — preserve audit logs)
IRON RULES:
  IR-196-1: NEVER delete audit logs during offboarding (DR-75) — BUILD FAILURE
  IR-196-2: NEVER delete drill evidence during offboarding (DR-74) — BUILD FAILURE
  IR-196-3: NEVER proceed past suspend without admin approval event — BUILD FAILURE
  IR-196-4: Key rotation MUST complete before data purge — BUILD FAILURE if out of order
  IR-196-5: Billing MUST be finalized before tenant_id deactivated — BUILD FAILURE
  IR-196-6: Offboarding is IRREVERSIBLE past purge step — must have confirmation event
QUALITY GATES:
  QG-196-1: Tenant status = Suspended before any data mutation
  QG-196-2: Export artifact created and stored before purge
  QG-196-3: All tenant credentials revoked and keys rotated
  QG-196-4: Data purge respects retention policy (tombstone vs delete)
  QG-196-5: Audit logs preserved — NOT deleted
  QG-196-6: Billing finalized and metering ledger closed
  QG-196-7: Tenant binding removed from resolver cache
```

---

## AF STATION MAPPING — FLOW-19

### INVENTORY SUB-ENGINE
- AF-4 (RAG Task Context): retrieves SK-99 through SK-112 for relevant patterns
- AF-3 (Prompt Library): CI/CD, IaC, GitOps, DR, Multi-Tenant prompts
- Key RAG queries: "catalog ingestion", "environment provisioning", "IaC saga compensation",
  "pipeline contract", "restore drill", "tenant onboarding idempotent"

### SYNTHESIS SUB-ENGINE
- AF-1 (Genesis): generates services from engine contracts (T179-T196)
- AF-5 (Multi-model): parallel generation of IaC wrapper, GitOps adapter, test suites
- AF-10 (Merge): combines multi-model outputs selecting highest DNA compliance score

### JUDGMENT SUB-ENGINE
- AF-6 (Code Review): no direct provider SDK imports; no typed models; BuildSearchFilter
- AF-7 (Compliance): DNA-1 through DNA-9 scan on all generated services
- AF-8 (Security): no secrets in Git/descriptors/IaC outputs; BOLA/BOPLA checks;
  NetworkPolicy enforcement; tenant isolation validation
- AF-9 (Judge): validates iron rules and quality gates per task type
- AF-11 (Feedback): stores generation quality → feeds future improvements

---

## FLOW TEMPLATES — FLOW-19

### Template 36: catalog-inventory-v1
```json
{
  "template_id": "catalog-inventory-v1",
  "flow_name": "FLOW-19-CATALOG",
  "description": "Component descriptor ingestion and dependency graph maintenance",
  "steps": [
    { "step": 1, "task_type": "T179", "factory": "F466", "fabric": "DATABASE(ES)+QUEUE",
      "description": "Ingest component descriptor from Git webhook",
      "on_failure": "emit descriptor.invalid event, store validation errors" },
    { "step": 2, "task_type": "T180", "factory": "F468", "fabric": "DATABASE(Neo4j)+RAG",
      "description": "Refresh dependency graph after successful ingestion",
      "on_failure": "alert — graph refresh failed, catalog still valid" },
    { "step": 3, "task_type": "T179", "factory": "F469", "fabric": "DATABASE(ES)",
      "description": "Update inventory query index",
      "on_failure": "retry with backoff — ES write failure" }
  ],
  "triggers": ["component.descriptor_changed"],
  "idempotency_key": "{repo}@{sha}:{path}",
  "flow_orchestrator": "Skill 09 — IFlowOrchestrator"
}
```

### Template 37: ephemeral-env-pipeline-v1
```json
{
  "template_id": "ephemeral-env-pipeline-v1",
  "flow_name": "FLOW-19-EPHEMERAL-PIPELINE",
  "description": "PR-triggered ephemeral environment + CI/CD gates",
  "steps": [
    { "step": 1, "task_type": "T186", "factory": "F478+F479", "fabric": "DATABASE(ES)+CORE+QUEUE",
      "description": "Validate pipeline contract conformance",
      "on_failure": "block PR with gate failure" },
    { "step": 2, "task_type": "T184", "factory": "F474+F475+F477", "fabric": "DATABASE(PG+Redis)+CORE",
      "description": "Resolve config layers and validate secret refs" },
    { "step": 3, "task_type": "T185", "factory": "F476", "fabric": "AI_ENGINE+DATABASE(ES)",
      "description": "Policy evaluation gate" },
    { "step": 4, "task_type": "T181", "factory": "F470+F474+F476", "fabric": "CORE+DATABASE(PG)+AI_ENGINE",
      "description": "Environment request gate — reserve idempotency key" },
    { "step": 5, "task_type": "T182", "factory": "F470+F471+F472+F482", "fabric": "CORE+DATABASE(PG)+QUEUE",
      "description": "IaC provision saga — plan, store compensation, apply" },
    { "step": 6, "task_type": "T188", "factory": "F482+F483+F484", "fabric": "CORE+DATABASE(ES)+QUEUE",
      "description": "GitOps sync + drift detection" },
    { "step": 7, "task_type": "T187", "factory": "F486+F487+F488+F489", "fabric": "QUEUE+DATABASE(ES+PG)+CORE",
      "description": "Smoke + integration test suites" },
    { "step": 8, "task_type": "T190", "factory": "F488+F495", "fabric": "DATABASE(ES+PG+WORM)",
      "description": "Generate ReadinessReport artifact" },
    { "step": 9, "task_type": "T183", "factory": "F470+F472", "fabric": "CORE+DATABASE(PG)+QUEUE",
      "description": "TTL expiry cleanup (triggered separately on TTL event)" }
  ],
  "triggers": ["pull_request.opened", "pull_request.synchronized"],
  "idempotency_key": "ephemeral:{env_type}:{pr_number}",
  "flow_orchestrator": "Skill 09 — IFlowOrchestrator",
  "compensation_on_failure": "IaC destroy via F471 compensation plan"
}
```

### Template 38: dr-drill-pipeline-v1
```json
{
  "template_id": "dr-drill-pipeline-v1",
  "flow_name": "FLOW-19-DR-DRILL",
  "description": "Scheduled restore drill with evidence generation for tier-1 promotion",
  "steps": [
    { "step": 1, "task_type": "T192", "factory": "F490+F495", "fabric": "DATABASE(PG+ES)+QUEUE",
      "description": "Run datastore backups + verify integrity" },
    { "step": 2, "task_type": "T193", "factory": "F490+F491+F492+F493+F487+F495",
      "fabric": "QUEUE+DATABASE(PG+ES+WORM)+CORE",
      "description": "Full restore drill saga — sandbox → restore → smoke → evidence" },
    { "step": 3, "task_type": "T194", "factory": "F492+F495", "fabric": "DATABASE(ES+WORM+PG)",
      "description": "DR evidence freshness gate for promotion eligibility" }
  ],
  "triggers": ["cron:weekly(tier1)", "restore_drill.requested"],
  "idempotency_key": "drill:{target}:{week_iso}",
  "flow_orchestrator": "Skill 09 — IFlowOrchestrator"
}
```

---

## SAVE POINT: FLOW19:P2:TASK_TYPES ✅
## Next: FLOW19_V62_BFA_STRESS_TEST.md (CF-214-CF-240, ST-104-ST-118)
