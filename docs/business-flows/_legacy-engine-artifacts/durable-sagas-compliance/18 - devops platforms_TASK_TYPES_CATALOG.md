# TASK TYPES CATALOG — FLOW-18 DELTA
## DevOps Platforms / Flow Creation Engine
## Extends: TASK_TYPES_CATALOG_MERGED.md (T1-T178, Templates 1-35)
## Range: T179-T195 (17 task types) | Templates 36-38
## Status: FLOW-18 COMPLETE ✅

---

## NEW ARCHETYPES IN FLOW-18

| Archetype | First Task | Description |
|-----------|-----------|-------------|
| APPROVAL | T182 | Human-in-the-loop hard stop — flow pauses pending decision |
| SYNTHESIS | T192 | AI-powered artifact generation (blueprint/code/config) |
| DevOps_BRIDGE | T190 | Bidirectional bridge to external CI/CD platforms |

---

## TASK TYPE CONTRACTS

---

### T179 — Flow Definition Publish Gate

```
TASK TYPE:     T179 — Flow Definition Publish Gate
ARCHETYPE:     VALIDATION
ENTRY:         Fires when a flow definition reaches DRAFT→PENDING_PUBLISH state
PURPOSE:       Validate, schema-check, and atomically publish a flow version to ACTIVE;
               register in BFA; check backward compatibility against existing active versions
DISTINCT FROM: T180 (compatibility check only) — T179 is the full publish lifecycle gate

FACTORY DEPENDENCIES:
  F466 IFlowDefinitionRegistryService  — resolved via CreateAsync()
  F467 IFlowVersionService             — resolved via CreateAsync()
  F469 IFlowSchemaValidatorService     — resolved via CreateAsync()
  F508 IBackwardCompatibilityCheckerService — resolved via CreateAsync()

FABRIC RESOLUTION:
  F466 → DATABASE FABRIC (ES) + DATABASE FABRIC (PG)
  F467 → DATABASE FABRIC (PG)
  F469 → CORE FABRIC (ObjectProcessor)
  F508 → DATABASE FABRIC (ES)

AF CONFIGURATION:
  AF-1 Genesis:        generates publish validation code from step contract registry (F482)
  AF-2 Planning:       decomposes into schema-check → compat-check → BFA-register → publish
  AF-3 Prompt Library: retrieves flow definition validation prompts
  AF-4 RAG:            searches SK-99 (Flow Definition Patterns) for similar published flows
  AF-5 Multi-model:    parallel schema validation across 2+ validators
  AF-6 Code review:    verifies publish logic handles concurrent publish races
  AF-7 Compliance:     DNA-1 (no typed FlowDefinition models), DNA-5 (tenantId on registry)
  AF-8 Security:       scans for malicious step definitions, injection in condition expressions
  AF-9 Judge:          validates all iron rules pass; checks no breaking change without major version
  AF-10 Merge:         combines multi-model schema validation results
  AF-11 Feedback:      stores publish success/failure rate for AF-3 prompt improvement

BFA VALIDATION:
  CF-214: Flow publish must not collide with existing ACTIVE version of same name+tenant
  CF-215: Published flow step factories must all be registered in F482 StepContractService

MACHINE (fixed):
  Schema validation is always performed (not configurable off)
  Publish is atomic — partial publish = rollback via F467.RollbackVersionAsync
  BFA registration happens synchronously before ACTIVE status is set

FREEDOM (configurable):
  Compatibility check mode (strict/semver/loose) via F508 FREEDOM config
  Max step count per flow definition (per tenant tier)
  Whether AI suggestions are shown at publish time

IRON RULES (BUILD FAILURE if violated):
  IR-179-1: Schema validation pass required before status transition to ACTIVE
  IR-179-2: tenantId present on all F466/F467/F508 calls
  IR-179-3: Backward compatibility check must complete before ACTIVE set
  IR-179-4: No typed FlowDefinition model — must use ParseDocument Dictionary
  IR-179-5: All factory calls via CreateAsync() — never constructor injection
  IR-179-6: Publish event published to F496 CloudEvents bus after success

QUALITY GATES (AF-9 judge validates):
  QG-179-1: Published version is retrievable by ID within 500ms
  QG-179-2: Breaking changes trigger major version bump warning
  QG-179-3: BFA conflict check returns within 2s
  QG-179-4: Concurrent publish of same flow-id handled idempotently
```

---

### T180 — Flow Version Compatibility Check

```
TASK TYPE:     T180 — Flow Version Compatibility Check
ARCHETYPE:     VALIDATION
ENTRY:         Fires before any T179 publish and on-demand from admin
PURPOSE:       Detect breaking changes between flow versions; classify by severity;
               block or warn based on FREEDOM policy
DISTINCT FROM: T179 (full publish gate) — T180 is the compatibility analysis sub-task

FACTORY DEPENDENCIES:
  F467 IFlowVersionService
  F508 IBackwardCompatibilityCheckerService
  F469 IFlowSchemaValidatorService

FABRIC RESOLUTION:
  F467 → DATABASE FABRIC (PG)
  F508 → DATABASE FABRIC (ES)
  F469 → CORE FABRIC

AF CONFIGURATION:
  AF-1: generates diff analysis code
  AF-2: decomposes into step-level diff → transition diff → schema diff → impact assessment
  AF-3: retrieves compatibility check prompt patterns
  AF-4: RAG on SK-100 (Version Compatibility Patterns)
  AF-5: parallel diff across 2 models
  AF-6: reviews diff logic
  AF-7: DNA compliance check
  AF-8: security — checks for downgrade attacks
  AF-9: validates all breaking changes are classified
  AF-10: merges diff results
  AF-11: feedback on false positive/negative rate

BFA VALIDATION:
  CF-215: all step factory refs in new version exist in F482 registry

MACHINE: breaking change detection algorithm is fixed (steps removed/renamed, inputs removed)
FREEDOM: response to breaking change (block/warn/allow) per tenant policy

IRON RULES:
  IR-180-1: diff must be persisted to F467 before result returned
  IR-180-2: tenantId on all fabric calls
  IR-180-3: incompatible version transition blocked in strict mode
  IR-180-4: DataProcessResult returned — no exceptions thrown

QUALITY GATES:
  QG-180-1: diff analysis completes in <3s for flows up to 100 steps
  QG-180-2: all breaking change categories classified (removed-step/changed-input/removed-output)
  QG-180-3: false negative rate on breaking changes < 1% (AF-11 tracks)
```

---

### T181 — Flow Execution Start Gate

```
TASK TYPE:     T181 — Flow Execution Start Gate
ARCHETYPE:     ORCHESTRATION
ENTRY:         Fires when execution start API is called with flow_id + version + input
PURPOSE:       AuthZ check, input schema validation, tenant quota check, execution record
               creation, initial step scheduling, trace context initialization
DISTINCT FROM: T183 Fan-Out (T181 is the start gate; T183 handles parallel step dispatch)

FACTORY DEPENDENCIES:
  F472 IFlowExecutionService
  F473 IStepExecutionService
  F474 IExecutionStateService
  F491 ITenantQuotaService
  F469 IFlowSchemaValidatorService
  F494 ITraceContextService
  F496 IExecutionEventBusService

FABRIC RESOLUTION:
  F472 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F473 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F474 → DATABASE FABRIC (PG)
  F491 → DATABASE FABRIC (Redis)
  F469 → CORE FABRIC
  F494 → CORE FABRIC (OTel)
  F496 → QUEUE FABRIC

AF CONFIGURATION:
  AF-1: generates execution start orchestration
  AF-2: decomposes into quota-check → schema-validate → create-execution → init-trace → dispatch-first-steps
  AF-3: retrieves orchestration start patterns
  AF-4: RAG on SK-101 (Execution Start Patterns), SK-99
  AF-5: multi-model for execution plan generation
  AF-6: reviews race condition handling
  AF-7: DNA compliance — tenantId, DataProcessResult, no typed models
  AF-8: security — input injection, quota bypass checks
  AF-9: judge validates execution isolation
  AF-10: merges execution initialization results
  AF-11: tracks start success rate

BFA VALIDATION:
  CF-216: execution tenantId matches authenticated caller tenantId
  CF-217: quota check must pass before execution record created

MACHINE: trace context creation is always performed
FREEDOM: execution timeout per flow type, input schema validation strictness

IRON RULES:
  IR-181-1: quota check BEFORE execution record creation
  IR-181-2: trace context propagated to all subsequent step events
  IR-181-3: ExecutionStarted CloudEvent published via F496 on success
  IR-181-4: tenantId on execution record and all downstream calls
  IR-181-5: DataProcessResult — no exceptions for quota exceeded (return failure result)
  IR-181-6: execution record created atomically with first step schedule

QUALITY GATES:
  QG-181-1: start gate completes in <500ms (not counting step execution)
  QG-181-2: quota enforcement tested with concurrent start attempts
  QG-181-3: trace context present in all emitted events
  QG-181-4: execution isolation — tenant A cannot access tenant B execution
```

---

### T182 — Hard Stop Approval Gate

```
TASK TYPE:     T182 — Hard Stop Approval Gate
ARCHETYPE:     APPROVAL   ← FLOW-18 FIRST-TIME ARCHETYPE
ENTRY:         Fires when a flow step definition declares type=hard_stop
PURPOSE:       Pause execution, notify designated approvers, collect binary decision,
               resume or abort based on decision; full audit trail
DISTINCT FROM: T181 (execution start gate) — T182 is a mid-flow pause/resume gate
               Distinct from BFA validation — T182 handles human decisions, not rules

FACTORY DEPENDENCIES:
  F472 IFlowExecutionService
  F475 IHardStopApprovalService
  F493 IExecutionAuditService
  F496 IExecutionEventBusService
  F501 IApprovalGateService

FABRIC RESOLUTION:
  F472 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F475 → QUEUE FABRIC + DATABASE FABRIC (PG)
  F493 → DATABASE FABRIC (PG WORM) + DATABASE FABRIC (ES)
  F496 → QUEUE FABRIC (CloudEvents)
  F501 → QUEUE FABRIC + DATABASE FABRIC (PG)

AF CONFIGURATION:
  AF-1: generates approval gate handler
  AF-2: decomposes into pause-execution → notify-approvers → await-event → resolve → resume/abort
  AF-3: retrieves approval gate patterns
  AF-4: RAG on SK-102 (Approval Gate Patterns)
  AF-5: not applicable (human decision point — no multi-model generation)
  AF-6: reviews approval timeout/escalation logic
  AF-7: DNA — tenantId, DataProcessResult, no typed ApprovalRecord model
  AF-8: security — approver identity verification, anti-replay on approval events
  AF-9: judge validates approval event integrity and audit completeness
  AF-10: not applicable
  AF-11: tracks approval turnaround time for FREEDOM config tuning

BFA VALIDATION:
  CF-218: approval events must carry execution_id and tenantId
  CF-219: approver identity validated against F485 ITenantConfigService roles

MACHINE: audit record creation is always performed (DR-70)
FREEDOM: approver roles, timeout duration, escalation path, notification channels

IRON RULES:
  IR-182-1: execution PAUSED state set via F472 before approver notification sent
  IR-182-2: approval request/response via QUEUE FABRIC only — no HTTP blocking (DR-69)
  IR-182-3: HardStopEntered and HardStopApproved/Rejected CloudEvents via F496
  IR-182-4: audit record written to F493 for every approval event
  IR-182-5: tenantId on all F475/F493/F501 calls
  IR-182-6: timeout triggers automatic abort with audit record
  IR-182-7: approver identity cross-checked with tenant config (no cross-tenant approver)
  IR-182-8: DataProcessResult returned for all outcomes — rejection is not an exception

QUALITY GATES:
  QG-182-1: pause-to-notify latency < 2s
  QG-182-2: approval event processed idempotently (F477)
  QG-182-3: audit trail complete for regulator export via F493
  QG-182-4: timeout escalation tested under load
  QG-182-5: cross-tenant approver attempt rejected
  QG-182-6: replay of approval event handled safely
```

---

### T183 — Step Fan-Out Coordinator

```
TASK TYPE:     T183 — Step Fan-Out Coordinator
ARCHETYPE:     ORCHESTRATION
ENTRY:         Fires when DAG analysis finds multiple steps with no dependency between them
PURPOSE:       Dispatch N independent steps in parallel; checkpoint before each dispatch;
               track all step execution IDs for fan-in convergence
DISTINCT FROM: T184 (fan-in convergence) — T183 is the dispatch half
               T40 (three-way join gate) — T183 handles N-way parallel, T40 is 3-stream merge

FACTORY DEPENDENCIES:
  F473 IStepExecutionService
  F474 IExecutionStateService
  F478 IStepDispatcherService
  F496 IExecutionEventBusService
  F477 IIdempotencyService

FABRIC RESOLUTION:
  F473 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F474 → DATABASE FABRIC (PG)
  F478 → QUEUE FABRIC
  F496 → QUEUE FABRIC
  F477 → DATABASE FABRIC (Redis) + DATABASE FABRIC (PG)

AF CONFIGURATION:
  AF-1: generates fan-out dispatch loop
  AF-2: decomposes into checkpoint → create-step-records → dispatch-all → emit-StepScheduled
  AF-3: retrieves parallel dispatch patterns
  AF-4: RAG on SK-103 (Fan-Out Patterns)
  AF-5: multi-model for dispatch strategy (sequential vs batched)
  AF-6: reviews idempotency of dispatch loop
  AF-7: DNA compliance
  AF-8: security — step injection prevention
  AF-9: validates checkpoint-before-advance (DR-67)
  AF-10: merges dispatch strategy
  AF-11: tracks fan-out success rates

BFA VALIDATION:
  CF-215: all dispatched step factory refs exist
  CF-216: all step executions carry same tenantId as parent execution

MACHINE: checkpoint before each dispatch is fixed (DR-67)
FREEDOM: max parallel steps per fan-out, dispatch batch size

IRON RULES:
  IR-183-1: checkpoint saved BEFORE dispatching each step (DR-67)
  IR-183-2: idempotency key registered for each dispatch via F477
  IR-183-3: StepScheduled CloudEvent emitted per step via F496
  IR-183-4: tenantId on every F473/F474/F478 call
  IR-183-5: DataProcessResult — partial dispatch failure triggers full fan-out rollback

QUALITY GATES:
  QG-183-1: N=50 parallel steps dispatched in <5s
  QG-183-2: idempotent re-dispatch (crash + retry) produces no duplicate executions
  QG-183-3: checkpoint persistence validated under load
```

---

### T184 — Step Fan-In Convergence Gate

```
TASK TYPE:     T184 — Step Fan-In Convergence Gate
ARCHETYPE:     JOIN_GATE
ENTRY:         Fires when all steps from a T183 fan-out have reached terminal state
PURPOSE:       Collect all step outputs, validate allSettled semantics, merge outputs,
               advance execution to next DAG node
DISTINCT FROM: T40 (three-way join) — T184 handles N-way, T40 is 3-stream specific
               T183 (fan-out) — T184 is the convergence half

FACTORY DEPENDENCIES:
  F472 IFlowExecutionService
  F473 IStepExecutionService
  F474 IExecutionStateService
  F496 IExecutionEventBusService

FABRIC RESOLUTION:
  F472 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F473 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F474 → DATABASE FABRIC (PG)
  F496 → QUEUE FABRIC

AF CONFIGURATION:
  AF-1: generates convergence collector
  AF-2: decomposes into await-all-terminal → validate-outputs → merge-results → advance-checkpoint
  AF-3: retrieves convergence patterns
  AF-4: RAG on SK-103
  AF-5: multi-model for merge strategy (union/intersect/custom)
  AF-6: reviews output conflict handling
  AF-7: DNA compliance
  AF-8: security — output injection
  AF-9: validates allSettled semantics and merge completeness
  AF-10: merges convergence strategies
  AF-11: tracks convergence wait times

BFA VALIDATION:
  CF-216: all fan-in outputs carry same execution_id

MACHINE: allSettled semantics (wait for all, propagate failures) is fixed
FREEDOM: output merge strategy (first-wins/union/custom), max wait timeout

IRON RULES:
  IR-184-1: convergence waits for ALL dispatched steps (allSettled — not race)
  IR-184-2: failed steps in fan-out do not silently drop outputs
  IR-184-3: checkpoint advanced only after all outputs persisted
  IR-184-4: StepSucceeded/Failed events consumed via QUEUE FABRIC (not polling)
  IR-184-5: tenantId on all calls

QUALITY GATES:
  QG-184-1: N=50 step convergence handled in <10s
  QG-184-2: partial failure correctly propagated to execution status
  QG-184-3: timeout behavior tested
```

---

### T185 — Durable Step Retry Saga

```
TASK TYPE:     T185 — Durable Step Retry Saga
ARCHETYPE:     DURABLE_SAGA
ENTRY:         Fires when a step reaches FAILED or TIMED_OUT and retry policy allows retries
PURPOSE:       Bounded retry with exponential backoff + jitter; idempotency-checked
               re-dispatch; escalate to DLQ after max attempts
DISTINCT FROM: T170 (backfill saga) — T185 is step-level retry, T170 is bulk backfill

FACTORY DEPENDENCIES:
  F473 IStepExecutionService
  F476 IRetrySchedulerService
  F477 IIdempotencyService
  F478 IStepDispatcherService
  F493 IExecutionAuditService

FABRIC RESOLUTION:
  F473 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F476 → QUEUE FABRIC + DATABASE FABRIC (PG)
  F477 → DATABASE FABRIC (Redis) + DATABASE FABRIC (PG)
  F478 → QUEUE FABRIC
  F493 → DATABASE FABRIC (PG WORM) + DATABASE FABRIC (ES)

AF CONFIGURATION:
  AF-1: generates retry saga coordinator
  AF-2: decomposes into check-retry-policy → check-idempotency → schedule-backoff → dispatch → audit
  AF-3: retrieves retry saga patterns
  AF-4: RAG on SK-104 (Retry Saga Patterns)
  AF-5: multi-model for backoff strategy selection
  AF-6: reviews max-retry boundary conditions
  AF-7: DNA compliance
  AF-8: security — retry amplification attacks
  AF-9: validates bounded retry and DLQ escalation
  AF-10: merges retry strategies
  AF-11: tracks retry rates per step type

BFA VALIDATION:
  CF-214: retry must not exceed tenant quota for step executions

MACHINE: DLQ escalation after max retries is fixed
FREEDOM: max attempts, backoff strategy, jitter range per step type

IRON RULES:
  IR-185-1: idempotency key checked BEFORE re-dispatch (F477)
  IR-185-2: checkpoint persisted after each retry attempt (DR-67)
  IR-185-3: retry count bounded by policy — no infinite retries
  IR-185-4: DLQ escalation triggers audit record in F493
  IR-185-5: tenantId on all calls
  IR-185-6: StepRetryScheduled CloudEvent via F496

QUALITY GATES:
  QG-185-1: idempotent retry produces no duplicate side effects
  QG-185-2: DLQ escalation fires at exact max-attempts boundary
  QG-185-3: backoff jitter tested for thundering herd prevention
```

---

### T186 — Webhook Trigger Receptor

```
TASK TYPE:     T186 — Webhook Trigger Receptor
ARCHETYPE:     INGESTION
ENTRY:         Fires when F481 IWebhookSourceService receives external push event
PURPOSE:       HMAC verification → deduplication → trigger matching → execution start
DISTINCT FROM: T169 (DWH webhook ingestion) — T186 is flow-trigger specific, not data ingestion

FACTORY DEPENDENCIES:
  F481 IWebhookSourceService
  F471 ITriggerDefinitionService
  F477 IIdempotencyService
  F472 IFlowExecutionService

FABRIC RESOLUTION:
  F481 → QUEUE FABRIC + DATABASE FABRIC (Redis)
  F471 → QUEUE FABRIC + DATABASE FABRIC (PG)
  F477 → DATABASE FABRIC (Redis) + DATABASE FABRIC (PG)
  F472 → DATABASE FABRIC (PG) + QUEUE FABRIC

AF CONFIGURATION:
  AF-1: generates webhook receptor
  AF-2: HMAC-verify → dedup → match-trigger → start-execution
  AF-3: webhook ingestion prompt patterns
  AF-4: RAG on SK-105 (Webhook Patterns)
  AF-5: not applicable (deterministic verification)
  AF-6: reviews HMAC implementation
  AF-7: DNA compliance
  AF-8: security — HMAC timing attacks, replay attacks
  AF-9: validates HMAC-first invariant
  AF-10: n/a
  AF-11: tracks webhook success/rejection rates

BFA VALIDATION:
  CF-215: triggered flow_id must exist and be ACTIVE
  CF-218: execution tenantId derived from webhook endpoint registration

MACHINE: HMAC verification always first (mirrors INV-14-7)
FREEDOM: HMAC algorithm (SHA-256/SHA-512), dedup window, trigger match strategy

IRON RULES:
  IR-186-1: HMAC verification BEFORE any processing — rejection on failure
  IR-186-2: dedup check via F477 before execution start
  IR-186-3: webhook event published to F496 CloudEvents bus
  IR-186-4: tenantId from webhook registration — never from payload
  IR-186-5: DataProcessResult — HMAC failure is not an exception

QUALITY GATES:
  QG-186-1: HMAC verification < 10ms
  QG-186-2: replay attack rejected by F477 dedup
  QG-186-3: dedup window tested under burst load
```

---

### T187 — Multi-Tenant Provision Gate

```
TASK TYPE:     T187 — Multi-Tenant Provision Gate
ARCHETYPE:     PROVISIONING
ENTRY:         Fires when a new tenant registration is submitted
PURPOSE:       Create tenant record, provision isolation model (pool/bridge/silo),
               initialize RLS policies, set default config, seed feature flags
DISTINCT FROM: T178 (warehouse tenant provision) — T187 is the master tenant provisioning gate

FACTORY DEPENDENCIES:
  F483 ITenantRegistryService
  F484 ITenantContextMiddlewareService
  F489 ITenantRowLevelSecurityService
  F485 ITenantConfigService
  F492 ITenantFeatureFlagService
  F491 ITenantQuotaService

FABRIC RESOLUTION:
  F483 → DATABASE FABRIC (PG)
  F484 → CORE FABRIC + DATABASE FABRIC (Redis)
  F489 → DATABASE FABRIC (PG RLS)
  F485 → DATABASE FABRIC (PG) + DATABASE FABRIC (Redis)
  F492 → DATABASE FABRIC (PG) + DATABASE FABRIC (Redis)
  F491 → DATABASE FABRIC (Redis) + DATABASE FABRIC (ES)

AF CONFIGURATION:
  AF-1: generates tenant provisioning orchestration
  AF-2: registry → RLS-enable → config-init → flags-seed → quota-init → emit-provisioned
  AF-3: tenant provisioning patterns
  AF-4: RAG on SK-106 (Tenant Provisioning Patterns)
  AF-5: n/a
  AF-6: reviews atomic provisioning rollback
  AF-7: DNA — tenantId bootstrapping
  AF-8: security — tenant isolation validation
  AF-9: validates RLS policy active before any tenant data written
  AF-10: n/a
  AF-11: tracks provisioning success rates

BFA VALIDATION:
  CF-220: RLS policies must be active before tenant data access (DR-71)
  CF-221: tenant context middleware must be operational before tenant services start

MACHINE: RLS enablement is always performed
FREEDOM: isolation model (pool/bridge/silo), default tier, region assignment

IRON RULES:
  IR-187-1: RLS policies enabled BEFORE any tenant data written (DR-71)
  IR-187-2: F484 tenant context middleware validated as active
  IR-187-3: TenantProvisioned CloudEvent via F496
  IR-187-4: rollback on any provisioning failure — no partial tenant state
  IR-187-5: DataProcessResult on all provisioning calls
  IR-187-6: default quota set in F491 before tenant can create executions
  IR-187-7: feature flags seeded from tenant tier defaults
  IR-187-8: tenantId generated by F483 — never provided by caller

QUALITY GATES:
  QG-187-1: full provisioning in <5s (pool model)
  QG-187-2: silo provisioning tested with schema migration (F490)
  QG-187-3: cross-tenant isolation validated immediately after provision
```

---

### T188 — Tenant Schema Migration Saga

```
TASK TYPE:     T188 — Tenant Schema Migration Saga
ARCHETYPE:     DURABLE_SAGA
ENTRY:         Fires when platform schema version advances and tenant migration is required
PURPOSE:       Expand → Migrate → Contract pattern for per-tenant schema changes;
               supports cohort rollout, canary, and per-tenant rollback
DISTINCT FROM: T185 (step retry saga) — T188 is schema-level saga across DB

FACTORY DEPENDENCIES:
  F490 ITenantSchemaMigrationService
  F492 ITenantFeatureFlagService
  F493 IExecutionAuditService
  F496 IExecutionEventBusService

FABRIC RESOLUTION:
  F490 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F492 → DATABASE FABRIC (PG) + DATABASE FABRIC (Redis)
  F493 → DATABASE FABRIC (PG WORM) + DATABASE FABRIC (ES)
  F496 → QUEUE FABRIC

AF CONFIGURATION:
  AF-1: generates migration saga
  AF-2: plan → expand → validate-expand → migrate → validate-migrate → contract
  AF-3: migration saga patterns
  AF-4: RAG on SK-107 (Schema Migration Patterns)
  AF-5: n/a
  AF-6: reviews rollback coverage
  AF-7: DNA compliance
  AF-8: security — migration injection, privilege escalation
  AF-9: validates idempotent migration and rollback completeness
  AF-10: n/a
  AF-11: tracks migration failure rates per schema change

BFA VALIDATION:
  CF-222: migration must not run on active tenant without feature-flag gate

MACHINE: expand → migrate → contract order is fixed
FREEDOM: cohort size, canary % before full rollout, migration timeout per tenant

IRON RULES:
  IR-188-1: expand step (additive only) must be validated before migrate step
  IR-188-2: feature flag gate checked before contract step (remove old paths)
  IR-188-3: per-tenant audit record in F493 for each migration phase
  IR-188-4: migration is idempotent — re-run produces same schema state
  IR-188-5: tenantId on all F490/F492 calls

QUALITY GATES:
  QG-188-1: migration rollback tested for every schema change
  QG-188-2: dual-read/dual-write window validated in integration tests
  QG-188-3: NULL tenant_id rows = 0 after migrate phase (invariant)
```

---

### T189 — Tenant Identity Federation Gate

```
TASK TYPE:     T189 — Tenant Identity Federation Gate
ARCHETYPE:     PROVISIONING
ENTRY:         Fires when enterprise tenant configures SAML/OIDC federation or SCIM provisioning
PURPOSE:       Register IdP metadata, validate federation config, enable SSO for tenant,
               configure SCIM endpoint, test connection
DISTINCT FROM: T187 (base tenant provision) — T189 is the enterprise SSO layer

FACTORY DEPENDENCIES:
  F487 ISamlFederationService
  F488 IOidcTokenService
  F486 IScimProvisioningService
  F485 ITenantConfigService

FABRIC RESOLUTION:
  F487 → CORE FABRIC (HTTP) + DATABASE FABRIC (PG)
  F488 → CORE FABRIC (HTTP) + DATABASE FABRIC (PG)
  F486 → DATABASE FABRIC (PG) + QUEUE FABRIC
  F485 → DATABASE FABRIC (PG) + DATABASE FABRIC (Redis)

AF CONFIGURATION:
  AF-1: generates federation configuration handler
  AF-2: validate-idp-metadata → store-config → test-assertion → enable-sso → configure-scim
  AF-3: SSO federation patterns
  AF-4: RAG on SK-108 (Identity Federation Patterns)
  AF-5: n/a
  AF-6: reviews IdP metadata validation
  AF-7: DNA compliance
  AF-8: security — assertion forgery, SCIM injection
  AF-9: validates test assertion success before enabling
  AF-10: n/a
  AF-11: tracks federation errors

BFA VALIDATION:
  CF-221: tenant config must be initialized (T187 complete) before federation

MACHINE: IdP connection test always performed before enabling
FREEDOM: supported protocols (SAML2/OIDC/both), claim mapping, SCIM attribute config

IRON RULES:
  IR-189-1: test assertion must succeed before SSO enabled
  IR-189-2: SAML assertions validated per RFC (signature, audience, NotOnOrAfter)
  IR-189-3: SCIM endpoint registered per tenant — never shared
  IR-189-4: tenantId on all config storage calls
  IR-189-5: DataProcessResult — failed test is not an exception

QUALITY GATES:
  QG-189-1: SAML assertion replay rejected
  QG-189-2: SCIM provisioning tested with HR deprovisioning scenario
  QG-189-3: federation config rollback tested
```

---

### T190 — DevOps Pipeline Bridge Gate

```
TASK TYPE:     T190 — DevOps Pipeline Bridge Gate
ARCHETYPE:     DevOps_BRIDGE   ← FLOW-18 FIRST-TIME ARCHETYPE
ENTRY:         Fires when a flow step targets an external CI/CD platform
PURPOSE:       Bidirectional bridge — trigger pipeline run in Jenkins/AzDO,
               poll/webhook for status, normalize result to flow execution format
DISTINCT FROM: T181 (flow execution start) — T190 is the external CI/CD integration step

FACTORY DEPENDENCIES:
  F497 IJenkinsConnectorService
  F498 IAzureDevOpsConnectorService
  F499 IAgentPoolService
  F480 ICredentialResolverService
  F493 IExecutionAuditService

FABRIC RESOLUTION:
  F497 → CORE FABRIC (HTTP) + DATABASE FABRIC (PG)
  F498 → CORE FABRIC (HTTP) + DATABASE FABRIC (PG)
  F499 → QUEUE FABRIC + DATABASE FABRIC (PG)
  F480 → DATABASE FABRIC (PG encrypted)
  F493 → DATABASE FABRIC (PG WORM) + DATABASE FABRIC (ES)

AF CONFIGURATION:
  AF-1: generates DevOps bridge step
  AF-2: resolve-credential → select-platform-connector → trigger-pipeline → await-status → normalize-result
  AF-3: DevOps bridge patterns
  AF-4: RAG on SK-109 (DevOps Bridge Patterns)
  AF-5: not applicable (deterministic platform call)
  AF-6: reviews credential handling
  AF-7: DNA — no direct SDK imports (DR-73)
  AF-8: security — credential exposure, SSRF via connector URL
  AF-9: validates platform-specific responses normalized correctly
  AF-10: n/a
  AF-11: tracks bridge success/failure rates per platform

BFA VALIDATION:
  CF-228: connector must use CORE FABRIC HTTP — no direct SDK (DR-73)

MACHINE: credential resolution via F480 is fixed — no raw credential in step config
FREEDOM: platform selection (Jenkins/AzDO/both), status polling interval, timeout

IRON RULES:
  IR-190-1: credentials resolved via F480 — never hardcoded (DR-73)
  IR-190-2: platform connector via CORE FABRIC HTTP — no direct SDK import
  IR-190-3: pipeline result normalized to DataProcessResult<T>
  IR-190-4: audit record in F493 for every external platform call
  IR-190-5: tenantId on all calls
  IR-190-6: SSRF prevention — connector URL validated against allowlist

QUALITY GATES:
  QG-190-1: Jenkins and AzDO connectors tested independently
  QG-190-2: credential rotation tested mid-execution
  QG-190-3: timeout and retry behavior validated
```

---

### T191 — Agent Pool Dispatch Gate

```
TASK TYPE:     T191 — Agent Pool Dispatch Gate
ARCHETYPE:     ORCHESTRATION
ENTRY:         Fires when a step requires specific agent capability (label-based routing)
PURPOSE:       Select appropriate agent from pool, dispatch work, handle agent unavailability
DISTINCT FROM: T190 (DevOps bridge) — T191 is the internal agent pool abstraction

FACTORY DEPENDENCIES:
  F499 IAgentPoolService
  F478 IStepDispatcherService
  F476 IRetrySchedulerService

FABRIC RESOLUTION:
  F499 → QUEUE FABRIC + DATABASE FABRIC (PG)
  F478 → QUEUE FABRIC
  F476 → QUEUE FABRIC + DATABASE FABRIC (PG)

AF CONFIGURATION:
  AF-1: generates agent pool dispatcher
  AF-2: select-pool → check-availability → dispatch → retry-on-unavailable
  AF-3: agent pool patterns
  AF-4: RAG on SK-103
  AF-5: multi-model for pool selection strategy
  AF-6: reviews availability race conditions
  AF-7: DNA compliance
  AF-8: security
  AF-9: validates fairness across tenants
  AF-10: merges pool selection strategies
  AF-11: tracks pool utilization

BFA VALIDATION:
  CF-216: dispatched work carries same tenantId as execution

MACHINE: queue-based dispatch (never direct HTTP to agent)
FREEDOM: agent selection strategy (round-robin/least-loaded/label-match), idle timeout

IRON RULES:
  IR-191-1: dispatch via QUEUE FABRIC — never direct HTTP to agent
  IR-191-2: tenantId on agent pool selection
  IR-191-3: unavailable pool triggers retry via F476

QUALITY GATES:
  QG-191-1: fair scheduling across tenants under load
  QG-191-2: pool saturation handled gracefully
```

---

### T192 — AI Flow Blueprint Generation

```
TASK TYPE:     T192 — AI Flow Blueprint Generation
ARCHETYPE:     SYNTHESIS   ← FLOW-18 FIRST-TIME ARCHETYPE
ENTRY:         Fires when user submits natural language flow description
PURPOSE:       Intent extraction → RAG pattern retrieval → multi-model blueprint generation →
               schema validation → compatibility check → draft publication
DISTINCT FROM: AF-1 Genesis (T192 IS a flow using AF stations — it's a meta-task)

FACTORY DEPENDENCIES:
  F502 IFlowAwareAiDispatcherService
  F503 IFlowBlueprintGeneratorService
  F504 IFlowIntentRouterService
  F466 IFlowDefinitionRegistryService
  F469 IFlowSchemaValidatorService

FABRIC RESOLUTION:
  F502 → AI ENGINE FABRIC (Skill 07)
  F503 → AI ENGINE FABRIC + RAG FABRIC (Skill 00b)
  F504 → AI ENGINE FABRIC
  F466 → DATABASE FABRIC (ES) + DATABASE FABRIC (PG)
  F469 → CORE FABRIC

AF CONFIGURATION:
  AF-1: generates the blueprint generation orchestration itself
  AF-2: extract-intent → route → RAG-search → multi-model-generate → validate → save-draft
  AF-3: blueprint generation prompt library
  AF-4: RAG on SK-99 + SK-100 + SK-101 (full flow pattern library)
  AF-5: parallel multi-model blueprint generation (Claude + GPT + Gemini)
  AF-6: reviews generated blueprint for logic errors
  AF-7: DNA compliance check on generated step definitions
  AF-8: security — injection in generated condition expressions
  AF-9: validates generated blueprint passes T179 publish prerequisites
  AF-10: consensus merge of multi-model blueprints (best-of-N)
  AF-11: user ratings injected back to AF-3 for prompt improvement

BFA VALIDATION:
  CF-214: generated flow must not collide with existing active definitions

MACHINE: schema validation of generated blueprint is always performed
FREEDOM: generation models, RAG strategy, confidence threshold for auto-publish vs draft

IRON RULES:
  IR-192-1: generated blueprint stored as Dictionary (ParseDocument) — no typed model
  IR-192-2: schema validated before draft publication
  IR-192-3: AF-11 feedback loop always active — user rating stored
  IR-192-4: multi-model generation uses AF-5 (minimum 2 models)
  IR-192-5: tenantId on all fabric calls
  IR-192-6: generated code enters GENERATED tier — never auto-promoted past INJECTED without human review

QUALITY GATES:
  QG-192-1: generated blueprint parseable by F466 on first attempt ≥ 90% of cases
  QG-192-2: RAG pattern retrieval improves generation quality (AF-11 tracks)
  QG-192-3: multi-model consensus reduces error rate vs single model
  QG-192-4: generated step factory refs all exist in F482 registry
```

---

### T193 — Flow Intent Classification Gate

```
TASK TYPE:     T193 — Flow Intent Classification Gate
ARCHETYPE:     VALIDATION
ENTRY:         Fires before T192 blueprint generation to classify user intent
PURPOSE:       Extract structured intent from natural language; score confidence;
               route to correct blueprint template or escalate to clarification
DISTINCT FROM: T192 (blueprint generation) — T193 is the pre-generation classification step

FACTORY DEPENDENCIES:
  F504 IFlowIntentRouterService
  F503 IFlowBlueprintGeneratorService
  F468 IFlowTemplateLibraryService

FABRIC RESOLUTION:
  F504 → AI ENGINE FABRIC
  F503 → AI ENGINE FABRIC + RAG FABRIC
  F468 → DATABASE FABRIC (ES) + AI ENGINE FABRIC

AF CONFIGURATION:
  AF-1: generates intent classifier
  AF-2: extract-intent → score-confidence → match-template → route-or-clarify
  AF-3: intent classification prompts
  AF-4: RAG on SK-99 (flow patterns for intent matching)
  AF-5: multi-model classification
  AF-6: reviews ambiguity handling
  AF-7: DNA compliance
  AF-8: security — prompt injection
  AF-9: validates routing accuracy
  AF-10: merges classification results
  AF-11: tracks classification accuracy

IRON RULES:
  IR-193-1: confidence below threshold → clarification request, not generation
  IR-193-2: intent classification result stored for AF-11 feedback
  IR-193-3: DataProcessResult for all outcomes including low-confidence

QUALITY GATES:
  QG-193-1: classification accuracy > 85% on test intent set
  QG-193-2: prompt injection rejected before classification
```

---

### T194 — Execution Audit Snapshot Gate

```
TASK TYPE:     T194 — Execution Audit Snapshot Gate
ARCHETYPE:     VALIDATION
ENTRY:         Fires at execution completion and on admin demand
PURPOSE:       Generate complete audit snapshot — all events, states, step results —
               in compliance export format; verify completeness
DISTINCT FROM: T493 (ongoing audit append) — T194 is the retrospective snapshot gate

FACTORY DEPENDENCIES:
  F493 IExecutionAuditService
  F494 ITraceContextService
  F472 IFlowExecutionService

FABRIC RESOLUTION:
  F493 → DATABASE FABRIC (PG WORM) + DATABASE FABRIC (ES)
  F494 → CORE FABRIC (OTel)
  F472 → DATABASE FABRIC (PG) + QUEUE FABRIC

IRON RULES:
  IR-194-1: audit snapshot includes all CloudEvents via F496
  IR-194-2: tenantId on all audit queries
  IR-194-3: snapshot stored in WORM format — no deletion
  IR-194-4: trace correlation validated across all step events

QUALITY GATES:
  QG-194-1: snapshot completeness ≥ 100% of execution events
  QG-194-2: export format machine-readable for compliance tools
```

---

### T195 — Tenant Config Rollout Gate

```
TASK TYPE:     T195 — Tenant Config Rollout Gate
ARCHETYPE:     PROVISIONING
ENTRY:         Fires when a platform config change needs staged rollout to tenant cohorts
PURPOSE:       Version config change, select cohort, validate with canary tenants,
               roll out or rollback based on anomaly detection
DISTINCT FROM: T187 (provision) — T195 is ongoing config lifecycle management

FACTORY DEPENDENCIES:
  F485 ITenantConfigService
  F492 ITenantFeatureFlagService
  F495 IPerTenantMetricsService
  F493 IExecutionAuditService

FABRIC RESOLUTION:
  F485 → DATABASE FABRIC (PG) + DATABASE FABRIC (Redis)
  F492 → DATABASE FABRIC (PG) + DATABASE FABRIC (Redis)
  F495 → DATABASE FABRIC (ES time-series)
  F493 → DATABASE FABRIC (PG WORM) + DATABASE FABRIC (ES)

IRON RULES:
  IR-195-1: canary validation before full rollout
  IR-195-2: config rollback restores prior version (not default)
  IR-195-3: audit record for every config change
  IR-195-4: tenantId on all config operations

QUALITY GATES:
  QG-195-1: config rollback tested for all config categories
  QG-195-2: anomaly detection triggers automatic rollback pause
```

---

## FLOW TEMPLATES — TEMPLATES 36-38

### Template 36 — flow-creation-pipeline-v1

```json
{
  "flow_id": "flow-creation-pipeline-v1",
  "version": "1.0.0",
  "description": "End-to-end flow for user-initiated AI flow blueprint generation and publication",
  "trigger": { "type": "api", "factory": "F471:ITriggerDefinitionService" },
  "steps": [
    {
      "step_key": "classify_intent",
      "task_type": "T193",
      "factory": "F504:IFlowIntentRouterService",
      "fabric": "AI_ENGINE_FABRIC",
      "on_success": "generate_blueprint",
      "on_failure": "request_clarification"
    },
    {
      "step_key": "generate_blueprint",
      "task_type": "T192",
      "factory": "F503:IFlowBlueprintGeneratorService",
      "fabric": "AI_ENGINE_FABRIC + RAG_FABRIC",
      "on_success": "validate_and_publish",
      "on_failure": "refine_blueprint"
    },
    {
      "step_key": "validate_and_publish",
      "task_type": "T179",
      "factory": "F466:IFlowDefinitionRegistryService",
      "fabric": "DATABASE_FABRIC_ES + DATABASE_FABRIC_PG",
      "on_success": "complete",
      "on_failure": "fail"
    }
  ]
}
```

### Template 37 — tenant-onboarding-pipeline-v1

```json
{
  "flow_id": "tenant-onboarding-pipeline-v1",
  "version": "1.0.0",
  "description": "Full tenant provisioning including isolation, identity federation, and config seeding",
  "trigger": { "type": "api", "factory": "F471:ITriggerDefinitionService" },
  "steps": [
    {
      "step_key": "provision_tenant",
      "task_type": "T187",
      "factory": "F483:ITenantRegistryService",
      "fabric": "DATABASE_FABRIC_PG + DATABASE_FABRIC_PG_RLS"
    },
    {
      "step_key": "configure_federation",
      "task_type": "T189",
      "factory": "F487:ISamlFederationService",
      "fabric": "CORE_FABRIC_HTTP + DATABASE_FABRIC_PG",
      "depends_on": ["provision_tenant"]
    },
    {
      "step_key": "schema_migration",
      "task_type": "T188",
      "factory": "F490:ITenantSchemaMigrationService",
      "fabric": "DATABASE_FABRIC_PG + QUEUE_FABRIC",
      "depends_on": ["provision_tenant"]
    }
  ]
}
```

### Template 38 — devops-bridge-pipeline-v1

```json
{
  "flow_id": "devops-bridge-pipeline-v1",
  "version": "1.0.0",
  "description": "Bridge flow to external CI/CD — trigger pipeline, await result, normalize",
  "trigger": { "type": "webhook", "factory": "F481:IWebhookSourceService" },
  "steps": [
    {
      "step_key": "verify_webhook",
      "task_type": "T186",
      "factory": "F481:IWebhookSourceService",
      "fabric": "QUEUE_FABRIC + DATABASE_FABRIC_Redis"
    },
    {
      "step_key": "start_execution",
      "task_type": "T181",
      "factory": "F472:IFlowExecutionService",
      "fabric": "DATABASE_FABRIC_PG + QUEUE_FABRIC",
      "depends_on": ["verify_webhook"]
    },
    {
      "step_key": "bridge_to_devops",
      "task_type": "T190",
      "factory": "F497:IJenkinsConnectorService",
      "fabric": "CORE_FABRIC_HTTP + DATABASE_FABRIC_PG",
      "depends_on": ["start_execution"]
    },
    {
      "step_key": "approval_gate",
      "task_type": "T182",
      "factory": "F475:IHardStopApprovalService",
      "fabric": "QUEUE_FABRIC + DATABASE_FABRIC_PG",
      "depends_on": ["bridge_to_devops"]
    }
  ]
}
```

---

## TASK TYPE SUMMARY — FLOW-18

| Task Type | Archetype | Key Factories | New? |
|-----------|-----------|---------------|------|
| T179 | VALIDATION | F466, F467, F469, F508 | — |
| T180 | VALIDATION | F467, F508, F469 | — |
| T181 | ORCHESTRATION | F472, F473, F474, F491, F494, F496 | — |
| T182 | **APPROVAL** | F472, F475, F493, F496, F501 | ✅ NEW ARCHETYPE |
| T183 | ORCHESTRATION | F473, F474, F478, F496, F477 | — |
| T184 | JOIN_GATE | F472, F473, F474, F496 | — |
| T185 | DURABLE_SAGA | F473, F476, F477, F478, F493 | — |
| T186 | INGESTION | F481, F471, F477, F472 | — |
| T187 | PROVISIONING | F483, F484, F489, F485, F492, F491 | — |
| T188 | DURABLE_SAGA | F490, F492, F493, F496 | — |
| T189 | PROVISIONING | F487, F488, F486, F485 | — |
| T190 | **DevOps_BRIDGE** | F497, F498, F499, F480, F493 | ✅ NEW ARCHETYPE |
| T191 | ORCHESTRATION | F499, F478, F476 | — |
| T192 | **SYNTHESIS** | F502, F503, F504, F466, F469 | ✅ NEW ARCHETYPE |
| T193 | VALIDATION | F504, F503, F468 | — |
| T194 | VALIDATION | F493, F494, F472 | — |
| T195 | PROVISIONING | F485, F492, F495, F493 | — |

---
## SAVE POINT: FLOW18:TASK_TYPES_CATALOG ✅
## Next: FLOW18_BFA_STRESS_TEST.md
## Recovery: "Load FLOW18 task types — T179-T195, Templates 36-38"
