# BFA STRESS TEST — FLOW-18 DELTA
## DevOps Platforms / Flow Creation Engine
## Extends: V62_BFA_STRESS_TEST_MERGED.md (CF-1-CF-213, ST-1-ST-103)
## Range: CF-214-CF-236 (23 rules) | ST-104-ST-116 (13 tests)
## Status: FLOW-18 COMPLETE ✅

---

## CONFLICT RULES — CF-214-CF-236

### Group A — Flow Control Plane Integrity (CF-214-CF-219)

```
CF-214: FLOW DEFINITION COLLISION PREVENTION
  RULE: A new flow definition publish (T179) MUST NOT result in two ACTIVE versions
        of the same flow_id within the same tenant scope.
  ENTITIES: IFlowDefinitionRegistryService (F466), IFlowVersionService (F467)
  DETECTION: BFA checks F466 ACTIVE index before T179 commit.
  VIOLATION: Concurrent publish of same flow_id → only first succeeds; second returns conflict.
  CROSS-FLOW: Affects all flows using Template 36 (flow-creation-pipeline-v1)
  ENFORCEMENT: T179 IR-179-1, F466 publish atomic transaction

CF-215: STEP FACTORY REF MUST EXIST
  RULE: Every step in a published flow definition MUST reference a factory (Fxxx) registered
        in IStepContractService (F482). Unregistered factory refs = BUILD FAILURE.
  ENTITIES: F482 IStepContractService, F466-F467 (any published flow)
  DETECTION: AF-9 Judge at T179 publish; BFA real-time check on T181 execution start.
  VIOLATION: Step with factory F999 (not registered) → publish blocked.
  CROSS-FLOW: Affects FLOW-14 flows if new step definitions reference FLOW-18 factories

CF-216: EXECUTION TENANT BOUNDARY
  RULE: An execution's tenantId MUST match the authenticated caller's tenantId at T181 start.
        All step executions within that run inherit the same tenantId.
  ENTITIES: IFlowExecutionService (F472), ITenantContextMiddlewareService (F484)
  DETECTION: T181 gate pre-check; AF-8 security scan on execution start code.
  VIOLATION: tenantId mismatch → execution rejected, security event logged.
  CROSS-FLOW: Applies to ALL flows that use T181 (all Templates 36-38)

CF-217: QUOTA CHECK BEFORE EXECUTION CREATE
  RULE: ITenantQuotaService (F491) quota check MUST complete and pass BEFORE
        IFlowExecutionService (F472) creates execution record.
  ENTITIES: F491, F472
  DETECTION: T181 iron rule IR-181-1; BFA checks step ordering in Template 36-38 DAGs.
  VIOLATION: Execution record created without quota check → audit violation + rollback.
  CROSS-FLOW: Applies to all execution-starting task types (T181, T186, T187, T192)

CF-218: APPROVAL EVENT MUST CARRY EXECUTION CONTEXT
  RULE: All events passing through IHardStopApprovalService (F475) MUST carry
        execution_id and tenantId. Approval without execution context = rejected.
  ENTITIES: F475, F496, T182
  DETECTION: F507 CloudEvents envelope validator; AF-7 compliance.
  VIOLATION: Approval event missing execution_id → DLQ, not processed.
  CROSS-FLOW: Affects Template 38 (devops-bridge-pipeline-v1) approval step

CF-219: APPROVER MUST BELONG TO TENANT
  RULE: Approver identity in T182 MUST be validated against the execution's tenant config
        (ITenantConfigService F485). Cross-tenant approver = security violation.
  ENTITIES: F475, F485, F488
  DETECTION: T182 IR-182-7; AF-8 security scan.
  VIOLATION: Cross-tenant approver → approval rejected, security event raised.
  CROSS-FLOW: Affects any flow using T182 approval gate
```

### Group B — Multi-Tenant Isolation (CF-220-CF-225)

```
CF-220: RLS MUST BE ACTIVE BEFORE TENANT DATA ACCESS
  RULE: ITenantRowLevelSecurityService (F489) RLS policies MUST be enabled BEFORE any
        tenant-scoped data is written or read. No tenant data without RLS.
  ENTITIES: F489, F483 (tenant registry), T187 (provision gate)
  DETECTION: T187 IR-187-1; AF-7 compliance checks for RLS enablement sequence.
  VIOLATION: Tenant data written before RLS enabled → provision rollback.
  CROSS-FLOW: Affects FLOW-08 (F244-F271 tenant isolation) — T187 extends those patterns

CF-221: TENANT CONTEXT MIDDLEWARE MUST BE OPERATIONAL
  RULE: ITenantContextMiddlewareService (F484) MUST be active and resolving correctly
        before any tenant-scoped service starts processing requests.
  ENTITIES: F484, all FLOW-18 tenant-scoped factories
  DETECTION: Health check on F484 at service startup; CF-221 BFA check on request routing.
  VIOLATION: Missing tenant context → all requests rejected until middleware healthy.
  CROSS-FLOW: Cascades to ALL flows — F484 is the DNA-5 enforcement anchor

CF-222: SCHEMA MIGRATION MUST GATE ON FEATURE FLAG
  RULE: T188 Tenant Schema Migration Saga MUST check ITenantFeatureFlagService (F492)
        before executing the CONTRACT phase (dropping old columns/paths).
  ENTITIES: F490, F492
  DETECTION: T188 IR-188-2; BFA verifies T188 DAG has feature-flag gate before contract step.
  VIOLATION: Contract step runs without feature flag gate → potential data loss.
  CROSS-FLOW: Affects FLOW-14 if warehouse schema also has tenant columns to migrate

CF-223: TENANT CREDENTIALS NEVER CROSS ISOLATION BOUNDARY
  RULE: ICredentialResolverService (F480) MUST return credentials scoped to the requesting
        tenant only. Credential resolution for tenant A by tenant B = security violation.
  ENTITIES: F480, F484, T190
  DETECTION: AF-8 security scan; F480 internal tenantId validation.
  VIOLATION: Cross-tenant credential resolution → request rejected, security event raised.
  CROSS-FLOW: Mirrors INV-14-3 for DWH — same isolation rule for flow credentials

CF-224: HARD STOP MUST NOT USE HTTP BLOCKING
  RULE: T182 Hard Stop Approval Gate MUST use QUEUE FABRIC (F475 + F496) for approval
        request/response. Direct HTTP await for approval = BUILD FAILURE (DR-69).
  ENTITIES: F475, F496, IQueueService
  DETECTION: AF-7 compliance scan for blocking HTTP patterns in T182 code.
  VIOLATION: await HTTP approval endpoint → rejected at code generation time.
  CROSS-FLOW: Affects all flows with approval gates (Template 38)

CF-225: SCIM PROVISIONING MUST NOT SHARE ENDPOINT ACROSS TENANTS
  RULE: Each enterprise tenant using IScimProvisioningService (F486) MUST have its own
        SCIM endpoint registration. Shared SCIM endpoint = security violation.
  ENTITIES: F486, F483
  DETECTION: T189 IR-189-3; AF-8 security scan.
  VIOLATION: SCIM endpoint shared → T189 fails BUILD.
  CROSS-FLOW: Affects all FLOW-18 enterprise tenant provisioning flows
```

### Group C — Flow Execution Safety (CF-226-CF-231)

```
CF-226: CHECKPOINT BEFORE ADVANCE (Mirrors INV-14-6 for flows)
  RULE: IExecutionStateService (F474) checkpoint MUST be persisted BEFORE the orchestrator
        advances the step pointer or dispatches the next step. (DR-67)
  ENTITIES: F474, F473, T183, T185
  DETECTION: T183 IR-183-1, T185 IR-185-2; BFA checks step ordering in T183 dispatch code.
  VIOLATION: Step dispatched before checkpoint → potential double execution on crash.
  CROSS-FLOW: Mirrors EP-4 cursor pattern from FLOW-14 (CF-193 equivalent)

CF-227: IDEMPOTENCY KEY REQUIRED FOR RETRY
  RULE: T185 Durable Step Retry Saga MUST register idempotency key via F477 BEFORE
        re-dispatching a step. Retry without idempotency key = risk of duplicate side effects.
  ENTITIES: F477, F476, F478
  DETECTION: T185 IR-185-1; AF-7 compliance scan for missing idempotency registration.
  VIOLATION: Retry dispatch without idempotency key → BUILD FAILURE.
  CROSS-FLOW: Applies to all DURABLE_SAGA task types in FLOW-18

CF-228: DEVOPS CONNECTORS MUST USE CORE FABRIC HTTP
  RULE: F497 and F498 connectors MUST use CORE FABRIC (Skill 01 MicroserviceBase HTTP)
        exclusively. Direct import of Jenkins SDK, AzDO npm package, etc. = BUILD FAILURE. (DR-73)
  ENTITIES: F497, F498, T190
  DETECTION: AF-7 import scanner; AF-8 security scan for SDK imports.
  VIOLATION: import @jenkins/sdk → BUILD FAILURE.
  CROSS-FLOW: Mirrors DR-73; applies to any future DevOps platform connector

CF-229: WEBHOOK HMAC MUST VERIFY BEFORE PROCESSING
  RULE: F481 IWebhookSourceService MUST verify HMAC signature BEFORE any payload
        processing or flow trigger. Payload-first processing = security violation. (Mirrors INV-14-7)
  ENTITIES: F481, T186
  DETECTION: T186 IR-186-1; AF-8 security scan for processing-before-verification.
  VIOLATION: Payload processed without HMAC → security event + execution rejected.
  CROSS-FLOW: Mirrors CF-211 from FLOW-14 DWH webhook

CF-230: AI-GENERATED CODE MUST ENTER PROMOTION LADDER
  RULE: F505 IStepCodeGeneratorService generated code MUST enter at GENERATED tier
        and pass AF-6/AF-7/AF-8/AF-9 before advancing. No direct CORE deployment. (DR-72)
  ENTITIES: F505, T192, promotion ladder
  DETECTION: T192 IR-192-6; AF-9 judge validates promotion tier.
  VIOLATION: Generated code deployed to CORE without promotion ladder → BUILD FAILURE.
  CROSS-FLOW: Applies to all SYNTHESIS archetype task types

CF-231: CLOUD EVENTS ENVELOPE ON ALL EXECUTION EVENTS
  RULE: ALL execution/step lifecycle events published via F496 MUST use F507
        CloudEvents 1.0 envelope. Raw payload events = compliance violation. (DR-70)
  ENTITIES: F496, F507, T181-T186
  DETECTION: AF-7 compliance scan for raw event publication.
  VIOLATION: Raw execution event without CloudEvents envelope → DLQ.
  CROSS-FLOW: Applies to all FLOW-18 execution events
```

### Group D — Cross-Flow Conflict Checks (CF-232-CF-236)

```
CF-232: FLOW-18 TENANT REGISTRY VS FLOW-08 TENANT MODEL
  RULE: FLOW-18 ITenantRegistryService (F483) MUST extend, not replace, FLOW-08
        multi-tenant isolation patterns (F244-F271). Tenant model is additive.
  ENTITIES: F483, FLOW-08 F244-F271
  DETECTION: BFA cross-flow index check at T187 execution.
  VIOLATION: F483 overrides FLOW-08 tenant model → BFA conflict.
  CROSS-FLOW: FLOW-08 tenant isolation is the foundation; F483 adds control plane

CF-233: FLOW-14 CONNECTOR REGISTRY VS FLOW-18 FLOW CONNECTOR REGISTRY
  RULE: F426 (FLOW-14 DWH connector registry) and F479 (FLOW-18 flow connector registry)
        MUST use distinct namespaces. Connector IDs must not collide.
  ENTITIES: F426, F479
  DETECTION: BFA checks connector_id namespace at registration.
  VIOLATION: Connector ID collision → registration rejected.
  CROSS-FLOW: FLOW-14 connectors are for DWH ingestion; FLOW-18 connectors are for flow steps

CF-234: FLOW-18 RLS VS FLOW-14 WAREHOUSE RLS
  RULE: F489 (flow RLS) and F463 (FLOW-14 warehouse RLS) operate on different schemas.
        Cross-schema RLS policy collision must not occur.
  ENTITIES: F489, F463
  DETECTION: BFA checks RLS policy targets at provisioning time.
  VIOLATION: RLS policy applying to wrong schema → audit violation.
  CROSS-FLOW: Two separate RLS enforcement layers — flow layer and warehouse layer

CF-235: FLOW-18 QUOTA SERVICE VS FLOW-14 WAREHOUSE QUOTA
  RULE: F491 (ITenantQuotaService for flows) and F465 (IWarehouseQuotaService FLOW-14)
        track different resource types. Flow quota = execution concurrency;
        warehouse quota = storage/compute. Both apply simultaneously.
  ENTITIES: F491, F465
  DETECTION: BFA cross-flow quota registration at T187 provision.
  VIOLATION: Single quota service covering both domains → incorrect enforcement.
  CROSS-FLOW: Both must be provisioned independently at T187

CF-236: FLOW-18 AUDIT VS FLOW-14 AUDIT
  RULE: F493 (IExecutionAuditService for flows) and F459 (IWarehouseAuditService FLOW-14)
        write to distinct audit stores. Execution audit ≠ warehouse audit.
  ENTITIES: F493, F459
  DETECTION: AF-7 compliance check on audit service usage.
  VIOLATION: Flow execution events written to warehouse audit store → incorrect retention.
  CROSS-FLOW: Each domain maintains independent audit trail
```

---

## BFA RULE SUMMARY TABLE

| Rule | Group | Domain | Trigger Task |
|------|-------|--------|-------------|
| CF-214 | A — Flow Control Plane | Collision Prevention | T179 |
| CF-215 | A | Factory Ref Validation | T179, T181 |
| CF-216 | A | Execution Tenant Boundary | T181, T186, T187, T192 |
| CF-217 | A | Quota Before Create | T181, T186, T192 |
| CF-218 | A | Approval Event Context | T182 |
| CF-219 | A | Approver Tenant Scope | T182 |
| CF-220 | B — Multi-Tenant | RLS Before Data | T187 |
| CF-221 | B | Middleware Health | All FLOW-18 |
| CF-222 | B | Schema Migration Gate | T188 |
| CF-223 | B | Credential Isolation | T190 |
| CF-224 | B | No HTTP Blocking | T182 |
| CF-225 | B | SCIM Endpoint Isolation | T189 |
| CF-226 | C — Execution Safety | Checkpoint Before Advance | T183, T185 |
| CF-227 | C | Idempotency on Retry | T185 |
| CF-228 | C | DevOps Connector Fabric | T190 |
| CF-229 | C | HMAC Before Webhook | T186 |
| CF-230 | C | AI Code Promotion Ladder | T192 |
| CF-231 | C | CloudEvents Envelope | T181-T186 |
| CF-232 | D — Cross-Flow | Tenant Registry Additive | T187 vs FLOW-08 |
| CF-233 | D | Connector Namespace | F426 vs F479 |
| CF-234 | D | RLS Schema Separation | F489 vs F463 |
| CF-235 | D | Quota Domain Separation | F491 vs F465 |
| CF-236 | D | Audit Store Separation | F493 vs F459 |

---

## STRESS TESTS — ST-104-ST-116

```
ST-104: CONCURRENT FLOW PUBLISH RACE
  SCENARIO: 100 concurrent T179 publish requests for same flow_id + tenant
  EXPECTED: Exactly 1 succeeds (first wins); remaining 99 return CF-214 conflict
  FAILURE: Any scenario where 2+ ACTIVE versions exist for same flow_id+tenant
  FACTORIES: F466, F467
  INVARIANT: No partial publish state after all 100 requests complete

ST-105: EXECUTION BURST WITH QUOTA ENFORCEMENT
  SCENARIO: 1000 execution start requests from single tenant in 10 seconds
  EXPECTED: Requests above quota limit receive DataProcessResult(QuotaExceeded) immediately
  FAILURE: Any execution created above quota; quota enforcement latency > 100ms
  FACTORIES: F491 (Redis), F472
  INVARIANT: Total active executions never exceeds tenant quota

ST-106: HARD STOP APPROVAL TIMEOUT CASCADE
  SCENARIO: 50 concurrent executions reach T182 hard stop; approvers go offline
  EXPECTED: All 50 time out cleanly; audit records written; executions marked CANCELED
  FAILURE: Any execution stuck in PAUSED state after timeout; missing audit records
  FACTORIES: F475, F493, F472, F496
  INVARIANT: No execution remains PAUSED after configured timeout

ST-107: CROSS-TENANT EXECUTION ISOLATION
  SCENARIO: Tenant A and Tenant B each start 500 concurrent executions
  EXPECTED: Zero cross-tenant data visibility; independent quota enforcement
  FAILURE: Any execution from A can query/affect B's execution; shared quota consumption
  FACTORIES: F472, F474, F484, F489
  INVARIANT: RLS + middleware isolation holds under 1000 concurrent cross-tenant executions

ST-108: AI BLUEPRINT GENERATION UNDER LOAD
  SCENARIO: 200 concurrent T192 blueprint generation requests
  EXPECTED: All requests complete; multi-model AF-5 runs in parallel; drafts saved
  FAILURE: Model timeout not handled gracefully; duplicate drafts; schema validation skipped
  FACTORIES: F502, F503, F466, F469
  INVARIANT: Generated blueprints all pass F469 schema validation; feedback loop active

ST-109: WEBHOOK BURST WITH HMAC DEDUP
  SCENARIO: Same webhook payload delivered 10x (retrying external system) to T186
  EXPECTED: First delivery triggers execution; remaining 9 deduplicated by F477
  FAILURE: Multiple executions started for same webhook event
  FACTORIES: F481, F477, F472
  INVARIANT: Idempotency key deduplication window holds under burst

ST-110: DURABLE STEP RETRY SAGA — MAX RETRIES
  SCENARIO: Step fails permanently; retry policy allows 5 attempts
  EXPECTED: Exactly 5 attempts; DLQ escalation on 6th failure; audit complete
  FAILURE: More than 5 attempts; DLQ not triggered; audit missing
  FACTORIES: F476, F477, F478, F493
  INVARIANT: Retry count bounded at exactly max_attempts; idempotency on all retries

ST-111: TENANT SCHEMA MIGRATION — EXPAND/MIGRATE/CONTRACT
  SCENARIO: Platform schema V2 requires adding tenant_id column to 50 tables
  EXPECTED: Expand (nullable) → backfill all rows → validate → Contract (NOT NULL + RLS)
  FAILURE: Contract step runs before backfill validates; NULL tenant_id rows remain
  FACTORIES: F490, F492, F489
  INVARIANT: Zero NULL tenant_id rows after contract phase; RLS active on all tables

ST-112: DEVOPS BRIDGE CONNECTOR FAILOVER
  SCENARIO: Primary Jenkins instance goes offline during T190 execution
  EXPECTED: F497 returns DataProcessResult(Unavailable); F476 retry scheduled; audit written
  FAILURE: Exception thrown; retry without idempotency key; credential exposed in error
  FACTORIES: F497, F476, F477, F493, F480
  INVARIANT: Credentials never appear in error messages; retry idempotent

ST-113: MULTI-MODEL BLUEPRINT CONSENSUS FAILURE
  SCENARIO: 3 models generate conflicting blueprints for same intent; AF-10 merge fails
  EXPECTED: Lowest-confidence blueprint rejected; clarification requested to user
  FAILURE: Conflict silently resolved by first-model-wins; invalid blueprint published
  FACTORIES: F502, F503, F469
  INVARIANT: Merge conflict logged; user notified; no invalid blueprint in F466 ACTIVE

ST-114: TENANT PROVISIONING ROLLBACK
  SCENARIO: T187 provision partially completes — registry OK, RLS fails
  EXPECTED: Full rollback — tenant registry record removed, no orphan RLS policies
  FAILURE: Partial tenant state persists (registry entry without RLS)
  FACTORIES: F483, F489, F485, F492, F491
  INVARIANT: Atomic provisioning — all-or-nothing; no partial tenant state

ST-115: CLOUDEVENTS ENVELOPE COMPLIANCE UNDER LOAD
  SCENARIO: 10,000 execution events published via F496 in 60 seconds
  EXPECTED: All events have valid CloudEvents 1.0 envelope; F507 validates all
  FAILURE: Any raw event bypasses F507; CloudEvents validation error silently dropped
  FACTORIES: F496, F507
  INVARIANT: 100% CloudEvents compliance; no raw events reach consumers

ST-116: PER-TENANT METRICS CARDINALITY CONTROL
  SCENARIO: 10,000 tenants active simultaneously; metrics pipeline running
  EXPECTED: Metrics labeled by tier (not raw tenant_id); ES time-series within cardinality budget
  FAILURE: High-cardinality label explosion; ES metrics index grows unbounded
  FACTORIES: F495
  INVARIANT: Label cardinality per metric ≤ configured tier count (DR-74)
```

---

## INVARIANT TABLE — FLOW-18 KEY INVARIANTS

| ID | Invariant | Enforcement |
|----|-----------|-------------|
| INV-18-1 | Flow versions immutable after publish (DR-66) | CF-214, IR-179-1 |
| INV-18-2 | Checkpoint before step advance (DR-67) | CF-226, IR-183-1, IR-185-2 |
| INV-18-3 | Tenant context always resolved (DR-68) | CF-221, DNA-5, F484 |
| INV-18-4 | Hard stop via queue only (DR-69) | CF-224, IR-182-2 |
| INV-18-5 | CloudEvents on all execution events (DR-70) | CF-231, IR-181-3 |
| INV-18-6 | RLS active before tenant data (DR-71) | CF-220, IR-187-1 |
| INV-18-7 | AI code via promotion ladder only (DR-72) | CF-230, IR-192-6 |
| INV-18-8 | DevOps connectors via Core Fabric only (DR-73) | CF-228, IR-190-2 |
| INV-18-9 | Metrics bounded cardinality (DR-74) | ST-116, F495 |
| INV-18-10 | HMAC verify before webhook processing (CF-229) | IR-186-1, ST-109 |
| INV-18-11 | Idempotency key before any retry dispatch | CF-227, IR-185-1, ST-110 |
| INV-18-12 | Approver must belong to execution tenant | CF-219, IR-182-7, ST-107 |

---
## SAVE POINT: FLOW18:BFA_STRESS_TEST ✅
## Next: FLOW18_UNIFIED_SOURCE_INDEX.md + FLOW18_SKILLS_FACTORY_RAG.md
## Recovery: "Load FLOW18 BFA rules — CF-214-CF-236 and stress tests ST-104-ST-116"
