/**
 * FLOW-30 Seed Prompts — genesis prompts for T468–T477 (Tenant Lifecycle Manager).
 *
 * Tier-2 platform-level genesis prompts seeded into PromptLibrary at bootstrap.
 *
 * connection_type: FLOW_SCOPED (belongs to FLOW-30 — not tenant-exportable)
 * flow_id: FLOW-30
 */

/** Shape of a FLOW-30 genesis prompt record. */
export interface Flow30GenesisPrompt {
  readonly taskType: string;
  readonly promptText: string;
  readonly connection_type: 'FLOW_SCOPED';
  readonly flow_id: 'FLOW-30';
  readonly version: string;
}

export const T468_GENESIS_PROMPT: Flow30GenesisPrompt = {
  taskType: 'T468',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-30',
  version: '1.0.0',
  promptText: `
You are generating TenantProvisionOrchestrator for the XIIGen Tenant Lifecycle Manager (FLOW-30).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts tenantId, planId, and optional metadata (Record<string, unknown>)
2. Idempotent by tenantId — second call returns existing provision record
3. Stores provision record (insert-only) via IDatabaseService
4. Emits tenant.provisioned CloudEvent via IQueueService after store
5. Returns DataProcessResult<{ provisionId: string; status: 'QUEUED'; tenantId: string; provisionedAt: string }>

## Iron Rules
- storeDocument() MUST be called BEFORE enqueue() — DNA-8
- Return QUEUED immediately — never block for downstream steps
- Idempotent by tenantId — duplicate returns existing without re-storing

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
- Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)
`.trim(),
};

export const T469_GENESIS_PROMPT: Flow30GenesisPrompt = {
  taskType: 'T469',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-30',
  version: '1.0.0',
  promptText: `
You are generating ResourceQuotaAllocator for the XIIGen Tenant Lifecycle Manager (FLOW-30).

## Task
Generate a NestJS service (TypeScript) that:
1. Reads quota tiers from FREEDOM config (key: flow30_quota_tiers)
2. Allocates compute and storage quotas based on tenantId and planId
3. Stores quota document via IDatabaseService, emits quota.allocated event via IQueueService
4. Returns DataProcessResult<{ quotaId: string; computeUnits: number; storageGb: number; allocatedAt: string }>

## Iron Rules
- Quota tiers MUST come from FREEDOM config — never hardcoded
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T470_GENESIS_PROMPT: Flow30GenesisPrompt = {
  taskType: 'T470',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-30',
  version: '1.0.0',
  promptText: `
You are generating TenantConfigInheritance for the XIIGen Tenant Lifecycle Manager (FLOW-30).

## Task
Generate a NestJS service (TypeScript) that:
1. Resolves effective tenant config by merging template hierarchy: global → plan → tenant-override
2. Later layers override earlier (tenant-override wins over plan, plan wins over global)
3. Stores resolved config via IDatabaseService, emits config.resolved event
4. Returns DataProcessResult<{ configId: string; effectiveConfig: Record<string,unknown>; resolvedAt: string }>

## Iron Rules
- Resolution order MUST be: global → plan → tenant-override (later wins)
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T471_GENESIS_PROMPT: Flow30GenesisPrompt = {
  taskType: 'T471',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-30',
  version: '1.0.0',
  promptText: `
You are generating QuotaEnforcementGate for the XIIGen Tenant Lifecycle Manager (FLOW-30).

## Task
Generate a NestJS service (TypeScript) that:
1. Reads current usage and quota limit for the tenant from IDatabaseService
2. If quota exceeded: returns QUOTA_EXCEEDED — hard stop, NO bypass
3. If within quota: stores gate-passed record, emits quota.check.passed event
4. Returns DataProcessResult<{ withinQuota: boolean; currentUsage: number; limit: number }>

## Iron Rules
- HARD STOP if quota exceeded — QUOTA_EXCEEDED error code — NO bypass path
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T472_GENESIS_PROMPT: Flow30GenesisPrompt = {
  taskType: 'T472',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-30',
  version: '1.0.0',
  promptText: `
You are generating CrossTenantIsolationCheck for the XIIGen Tenant Lifecycle Manager (FLOW-30).

## Task
Generate a NestJS service (TypeScript) that:
1. Verifies that requestingTenantId matches the targetTenantId of the resource
2. If mismatch: logs violation to audit store (insert-only), emits isolation.violation.detected, returns ISOLATION_VIOLATION
3. If same tenant: returns isolation check passed
4. Returns DataProcessResult<{ isolated: boolean; requestingTenantId: string; targetTenantId: string }>

## Iron Rules
- ISOLATION_VIOLATION on cross-tenant access — no silent failure
- Violations MUST be logged — storeDocument() BEFORE enqueue() (DNA-8)

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T473_GENESIS_PROMPT: Flow30GenesisPrompt = {
  taskType: 'T473',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-30',
  version: '1.0.0',
  promptText: `
You are generating TenantAuditEmitter for the XIIGen Tenant Lifecycle Manager (FLOW-30).

## Task
Generate a NestJS service (TypeScript) that:
1. Accepts eventType, entityId, actorId, details (Record<string, unknown>)
2. Stores audit record INSERT-ONLY via IDatabaseService — never update, never delete
3. Emits audit.event.recorded CloudEvent via IQueueService after store
4. Returns DataProcessResult<{ auditId: string; recordedAt: string; eventType: string }>

## Iron Rules
- Audit records are IMMUTABLE — insert-only, no updates, no deletes
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T474_GENESIS_PROMPT: Flow30GenesisPrompt = {
  taskType: 'T474',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-30',
  version: '1.0.0',
  promptText: `
You are generating TenantOffboardingHandler for the XIIGen Tenant Lifecycle Manager (FLOW-30).

## Task
Generate a NestJS service (TypeScript) that:
1. Reads data retention period from FREEDOM config (key: flow30_retention_days)
2. Schedules the tenant for offboarding — NEVER immediate deletion
3. Stores offboarding schedule record (insert-only), emits tenant.offboarding.scheduled event
4. Returns DataProcessResult<{ offboardingId: string; scheduledDeleteAt: string; retentionDays: number }>

## Iron Rules
- Retention period MUST come from FREEDOM config — never hardcoded
- Offboarding is NEVER immediate — always scheduled with retention window
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T475_GENESIS_PROMPT: Flow30GenesisPrompt = {
  taskType: 'T475',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-30',
  version: '1.0.0',
  promptText: `
You are generating TenantHealthScorer for the XIIGen Tenant Lifecycle Manager (FLOW-30).

## Task
Generate a NestJS service (TypeScript) that:
1. Reads usage metrics, error rates, and quota consumption from IDatabaseService
2. Computes a health score in range 0.0–1.0
3. Stores health score via IDatabaseService, emits tenant.health.scored event
4. Returns DataProcessResult<{ scoreId: string; healthScore: number; scoredAt: string }>

## Iron Rules
- Health score MUST be in range 0.0–1.0 (inclusive)
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T476_GENESIS_PROMPT: Flow30GenesisPrompt = {
  taskType: 'T476',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-30',
  version: '1.0.0',
  promptText: `
You are generating UsageMetricsAggregator for the XIIGen Tenant Lifecycle Manager (FLOW-30).

## Task
Generate a NestJS service (TypeScript) that:
1. SCORE-0 ASYNC-ONLY: must only be triggered via queue consumer — never on live path
2. Aggregates raw usage events into period-based metrics (compute, storage, requests)
3. Stores aggregated metrics via IDatabaseService, emits usage.metrics.aggregated event
4. Returns DataProcessResult<{ metricsId: string; period: string; aggregatedAt: string }>

## Iron Rules
- ASYNC-ONLY: MUST only be triggered via queue consumer — never on live request path
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

export const T477_GENESIS_PROMPT: Flow30GenesisPrompt = {
  taskType: 'T477',
  connection_type: 'FLOW_SCOPED',
  flow_id: 'FLOW-30',
  version: '1.0.0',
  promptText: `
You are generating TenantPolicyEnforcer for the XIIGen Tenant Lifecycle Manager (FLOW-30).

## Task
Generate a NestJS service (TypeScript) that:
1. Reads active policy rules from FREEDOM config (key: flow30_policy_rules)
2. Evaluates the operation context against policy rules
3. If violation: logs to violation store, emits policy.violation.detected, returns POLICY_VIOLATION
4. Returns DataProcessResult<{ compliant: boolean; violatedRules: string[]; checkedAt: string }>

## Iron Rules
- Policy rules MUST come from FREEDOM config — never hardcoded
- POLICY_VIOLATION error code on breach — no bypass
- storeDocument() MUST be called BEFORE enqueue() — DNA-8

## XIIGen DNA Rules
- Service MUST extend MicroserviceBase (DNA-4)
- ALL methods MUST return DataProcessResult<T> — never throw (DNA-3)
`.trim(),
};

/** All FLOW-30 genesis prompts in task-type order. */
export const TENANT_LIFECYCLE_SEED_PROMPTS: Flow30GenesisPrompt[] = [
  T468_GENESIS_PROMPT,
  T469_GENESIS_PROMPT,
  T470_GENESIS_PROMPT,
  T471_GENESIS_PROMPT,
  T472_GENESIS_PROMPT,
  T473_GENESIS_PROMPT,
  T474_GENESIS_PROMPT,
  T475_GENESIS_PROMPT,
  T476_GENESIS_PROMPT,
  T477_GENESIS_PROMPT,
];
