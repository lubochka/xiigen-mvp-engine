import { MODEL_HINT_FROM_FREEDOM } from '../freedom/config-schema';
/**
 * FLOW-30 Engine Contracts — Tenant Lifecycle Manager.
 * T468–T477 — 10 task types across 5 archetypes.
 *
 * T468: TenantProvisionOrchestrator [ORCHESTRATION] — coordinate full tenant setup
 * T469: ResourceQuotaAllocator      [BUILD]         — allocate quotas from FREEDOM config
 * T470: TenantConfigInheritance     [BUILD]         — resolve config from template hierarchy
 * T471: QuotaEnforcementGate        [GUARD]         — hard stop when quota exceeded
 * T472: CrossTenantIsolationCheck   [GUARD]         — verify cross-tenant data isolation
 * T473: TenantAuditEmitter          [GOVERNANCE]    — immutable tenant lifecycle audit trail
 * T474: TenantOffboardingHandler    [GOVERNANCE]    — graceful offboarding with data retention
 * T475: TenantHealthScorer          [EVALUATION]    — compute per-tenant health score
 * T476: UsageMetricsAggregator      [LEARNING]      — aggregate usage metrics (async-only)
 * T477: TenantPolicyEnforcer        [GUARD]         — enforce tenant policies from FREEDOM config
 *
 * Families: 180 (ORCHESTRATION), 181 (BUILD), 182 (GUARD),
 *           183 (GOVERNANCE), 184 (EVALUATION+LEARNING)
 * Factories: F1200–F1219
 * CF rules:  CF-651–CF-680
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';
import type { TaskTypeStackCoupling } from './stack-coupling';

// ── Shared stack coupling (FLOW-00.2) ─────────────────────────────────────

const TENANT_LIFECYCLE_STACK_COUPLING: TaskTypeStackCoupling = {
  entries: {
    'node-nestjs:server': {
      tier: 'CONCEPT_NEUTRAL',
      stackCategory: 'web-framework',
      dimensions: [],
      neutralConcepts: [
        'NEVER import external SDK directly — use fabric interfaces',
        'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5)',
        'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
        'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
        'DNA-8: storeDocument() BEFORE enqueue() — outbox pattern',
      ],
      implementationNotes:
        'Generate NestJS @Injectable() service extending MicroserviceBase. Inject fabric interfaces via constructor. Return DataProcessResult<T>.',
    },
  },
  supportedServerStacks: ['nestjs'],
};

const TENANT_LIFECYCLE_QUALITY_GATES_CORE = [
  {
    gateId: 'QG-01',
    description: 'All services extend MicroserviceBase (DNA-4)',
    severity: 'error' as const,
    checkType: 'dna_compliance',
  },
  {
    gateId: 'QG-02',
    description: 'No direct SDK imports — only fabric interfaces (Rule 1)',
    severity: 'error' as const,
    checkType: 'fabric_usage',
  },
  {
    gateId: 'QG-03',
    description: 'All methods return DataProcessResult (DNA-3)',
    severity: 'error' as const,
    checkType: 'dna_compliance',
  },
  {
    gateId: 'QG-04',
    description: 'Tenant scope via AsyncLocalStorage — no tenantId param (DNA-5)',
    severity: 'error' as const,
    checkType: 'dna_compliance',
  },
];

const TENANT_LIFECYCLE_IRON_RULES_CORE = [
  'NEVER import database/queue client directly — use fabric interfaces',
  'ALL queries MUST include tenant scope via AsyncLocalStorage (DNA-5, CF-476)',
  'ALL service methods return DataProcessResult<T> — never throw (DNA-3)',
  'ALL services extend MicroserviceBase — no exceptions (DNA-4)',
];

export function createT468Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T468',
    flowId: 'FLOW-30',
    name: 'TenantProvisionOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered when a new tenant must be provisioned in the system',
    purpose:
      'Coordinate the full tenant setup sequence and emit tenant.provisioned event; returns QUEUED immediately',
    distinctFrom: 'T469 (quota allocation — T468 orchestrates the chain, T469 just sets quotas)',
    familyId: 'Family-180',
    factoryDependencies: [
      {
        factoryId: 'F1200',
        interfaceName: 'ITenantProvisionStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Insert-only tenant provision record',
      },
      {
        factoryId: 'F1201',
        interfaceName: 'ITenantSetupNotifier',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Notifies downstream setup steps after storeDocument (DNA-8)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow30', taskType: 'T468', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'orchestration', max_tokens: 4000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
    ],
    qualityGates: [
      ...TENANT_LIFECYCLE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'storeDocument() BEFORE enqueue() (DNA-8)',
        severity: 'error' as const,
        checkType: 'dna_compliance',
      },
    ],
    ironRules: [
      ...TENANT_LIFECYCLE_IRON_RULES_CORE,
      'storeDocument() MUST be called BEFORE enqueue() — DNA-8 outbox pattern',
      'Return QUEUED immediately — never block waiting for downstream steps',
    ],
    bfaRegistration: {
      entities: ['tenant', 'provision_record'],
      events: ['tenant.provisioned'],
      apiRoutes: ['/api/dynamic/flow30-tenant-provisions'],
    },
    machineComponents: [
      'idempotency check by tenantId',
      'insert-only provision record',
      'outbox ordering',
    ],
    freedomComponents: [],
    stackCoupling: TENANT_LIFECYCLE_STACK_COUPLING,
  });
}

export function createT469Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T469',
    flowId: 'FLOW-30',
    name: 'ResourceQuotaAllocator',
    archetype: ContractArchetype.BUILD,
    entry: 'Triggered during tenant provisioning or quota upgrade requests',
    purpose:
      'Read quota tiers from FREEDOM config and allocate compute/storage resources for the tenant',
    distinctFrom: 'T471 (enforcement — T469 allocates, T471 enforces)',
    familyId: 'Family-181',
    factoryDependencies: [
      {
        factoryId: 'F1202',
        interfaceName: 'IQuotaStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Quota document store — upsert by tenantId',
      },
      {
        factoryId: 'F1203',
        interfaceName: 'IQuotaEventEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Emits quota.allocated event after storeDocument (DNA-8)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow30', taskType: 'T469', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'build', max_tokens: 3000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
    ],
    qualityGates: [
      ...TENANT_LIFECYCLE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Quota tiers MUST come from FREEDOM config — never hardcoded',
        severity: 'error' as const,
        checkType: 'freedom_compliance',
      },
    ],
    ironRules: [
      ...TENANT_LIFECYCLE_IRON_RULES_CORE,
      'Quota tiers MUST be read from FREEDOM config key: flow30_quota_tiers',
      'storeDocument() MUST be called BEFORE enqueue() — DNA-8',
    ],
    bfaRegistration: {
      entities: ['tenant', 'quota'],
      events: ['quota.allocated'],
      apiRoutes: ['/api/dynamic/flow30-tenant-quotas'],
    },
    machineComponents: ['quota upsert by tenantId', 'outbox ordering'],
    freedomComponents: [],
    stackCoupling: TENANT_LIFECYCLE_STACK_COUPLING,
  });
}

export function createT470Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T470',
    flowId: 'FLOW-30',
    name: 'TenantConfigInheritance',
    archetype: ContractArchetype.BUILD,
    entry: 'Triggered after quota allocation or when tenant config changes',
    purpose:
      'Resolve effective tenant config by merging global → plan → tenant-override template chain',
    distinctFrom: 'T469 (quota allocation — T470 resolves full config hierarchy)',
    familyId: 'Family-181',
    factoryDependencies: [
      {
        factoryId: 'F1204',
        interfaceName: 'IConfigTemplateStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Reads config template chain in resolution order',
      },
      {
        factoryId: 'F1205',
        interfaceName: 'IConfigResolutionEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Emits config.resolved after storeDocument (DNA-8)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow30', taskType: 'T470', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'build', max_tokens: 3000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
    ],
    qualityGates: [
      ...TENANT_LIFECYCLE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Template resolution order MUST be global → plan → tenant-override',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    ironRules: [
      ...TENANT_LIFECYCLE_IRON_RULES_CORE,
      'Resolution order is always: global → plan → tenant-override (later layers override earlier)',
      'storeDocument() MUST be called BEFORE enqueue() — DNA-8',
    ],
    bfaRegistration: {
      entities: ['tenant', 'config_template'],
      events: ['config.resolved'],
      apiRoutes: ['/api/dynamic/flow30-tenant-configs'],
    },
    machineComponents: [
      'template merge algorithm',
      'resolution order enforcement',
      'outbox ordering',
    ],
    freedomComponents: [],
    stackCoupling: TENANT_LIFECYCLE_STACK_COUPLING,
  });
}

export function createT471Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T471',
    flowId: 'FLOW-30',
    name: 'QuotaEnforcementGate',
    archetype: ContractArchetype.GUARD,
    entry: 'Called before any resource-consuming operation on a tenant',
    purpose: 'Hard stop when tenant quota is exceeded; no bypass path',
    distinctFrom: 'T469 (allocation — T471 enforces existing limits, T469 sets new limits)',
    familyId: 'Family-182',
    factoryDependencies: [
      {
        factoryId: 'F1206',
        interfaceName: 'IQuotaUsageReader',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Reads current usage and quota limit for the tenant',
      },
      {
        factoryId: 'F1207',
        interfaceName: 'IQuotaViolationEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Emits quota.exceeded event when limit breached',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow30', taskType: 'T471', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'guard', max_tokens: 2500 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
    ],
    qualityGates: [
      ...TENANT_LIFECYCLE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'QUOTA_EXCEEDED error code MUST be used — no bypass path',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    ironRules: [
      ...TENANT_LIFECYCLE_IRON_RULES_CORE,
      'HARD STOP on quota exceeded — no bypass path whatsoever',
      'QUOTA_EXCEEDED error code MUST be returned when limit is breached',
    ],
    bfaRegistration: {
      entities: ['tenant', 'quota'],
      events: ['quota.exceeded', 'quota.check.passed'],
      apiRoutes: [],
    },
    machineComponents: ['usage vs limit comparison', 'bypass_allowed=false enforcement'],
    freedomComponents: [],
    stackCoupling: TENANT_LIFECYCLE_STACK_COUPLING,
  });
}

export function createT472Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T472',
    flowId: 'FLOW-30',
    name: 'CrossTenantIsolationCheck',
    archetype: ContractArchetype.GUARD,
    entry: 'Called before any cross-tenant data access or query routing operation',
    purpose: 'Verify tenant data isolation and hard-stop on violation with audit log',
    distinctFrom: 'T471 (quota — T472 checks data isolation, T471 checks resource quotas)',
    familyId: 'Family-182',
    factoryDependencies: [
      {
        factoryId: 'F1208',
        interfaceName: 'IIsolationAuditStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Logs isolation violations — insert-only',
      },
      {
        factoryId: 'F1209',
        interfaceName: 'IIsolationViolationEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Emits isolation.violation.detected on breach',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow30', taskType: 'T472', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'guard', max_tokens: 2500 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
    ],
    qualityGates: [
      ...TENANT_LIFECYCLE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'ISOLATION_VIOLATION error code on breach — no silent failure',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    ironRules: [
      ...TENANT_LIFECYCLE_IRON_RULES_CORE,
      'ISOLATION_VIOLATION error code MUST be returned on any cross-tenant access attempt',
      'All violation attempts MUST be logged — storeDocument BEFORE enqueue (DNA-8)',
    ],
    bfaRegistration: {
      entities: ['tenant'],
      events: ['isolation.violation.detected'],
      apiRoutes: [],
    },
    machineComponents: ['tenant ID comparison', 'insert-only violation log', 'outbox ordering'],
    freedomComponents: [],
    stackCoupling: TENANT_LIFECYCLE_STACK_COUPLING,
  });
}

export function createT473Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T473',
    flowId: 'FLOW-30',
    name: 'TenantAuditEmitter',
    archetype: ContractArchetype.GOVERNANCE,
    entry: 'Called for every significant tenant lifecycle event',
    purpose:
      'Insert-only immutable audit trail for tenant lifecycle; never update or delete records',
    distinctFrom:
      'T474 (offboarding — T473 records events, T474 orchestrates the offboard process)',
    familyId: 'Family-183',
    factoryDependencies: [
      {
        factoryId: 'F1210',
        interfaceName: 'ITenantAuditStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Insert-only tenant audit store',
      },
      {
        factoryId: 'F1211',
        interfaceName: 'IAuditEventEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Emits audit.event.recorded after storeDocument (DNA-8)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow30', taskType: 'T473', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'governance', max_tokens: 3000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
    ],
    qualityGates: [
      ...TENANT_LIFECYCLE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Records are INSERT-ONLY — no updates, no deletes',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    ironRules: [
      ...TENANT_LIFECYCLE_IRON_RULES_CORE,
      'Audit records are IMMUTABLE — insert-only, no updates, no deletes',
      'storeDocument() MUST be called BEFORE enqueue() — DNA-8',
    ],
    bfaRegistration: {
      entities: ['tenant', 'audit_event'],
      events: ['audit.event.recorded'],
      apiRoutes: ['/api/dynamic/flow30-tenant-audit'],
    },
    machineComponents: ['insert-only write enforcement', 'outbox ordering'],
    freedomComponents: [],
    stackCoupling: TENANT_LIFECYCLE_STACK_COUPLING,
  });
}

export function createT474Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T474',
    flowId: 'FLOW-30',
    name: 'TenantOffboardingHandler',
    archetype: ContractArchetype.GOVERNANCE,
    entry: 'Triggered when a tenant requests or is scheduled for offboarding',
    purpose:
      'Schedule graceful tenant offboarding with data retention period; never immediate deletion',
    distinctFrom:
      'T473 (audit — T474 orchestrates offboarding, T473 records the offboarding event)',
    familyId: 'Family-183',
    factoryDependencies: [
      {
        factoryId: 'F1212',
        interfaceName: 'IOffboardingStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Insert-only offboarding schedule record',
      },
      {
        factoryId: 'F1213',
        interfaceName: 'IOffboardingNotifier',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Emits tenant.offboarding.scheduled after storeDocument (DNA-8)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow30', taskType: 'T474', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'governance', max_tokens: 3000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
    ],
    qualityGates: [
      ...TENANT_LIFECYCLE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Retention period MUST come from FREEDOM config — never hardcoded',
        severity: 'error' as const,
        checkType: 'freedom_compliance',
      },
      {
        gateId: 'QG-06',
        description: 'Offboarding MUST be scheduled — never immediate deletion',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    ironRules: [
      ...TENANT_LIFECYCLE_IRON_RULES_CORE,
      'Data retention period MUST come from FREEDOM config key: flow30_retention_days',
      'Offboarding is NEVER immediate — always scheduled with retention window',
      'storeDocument() MUST be called BEFORE enqueue() — DNA-8',
    ],
    bfaRegistration: {
      entities: ['tenant'],
      events: ['tenant.offboarding.scheduled'],
      apiRoutes: ['/api/dynamic/flow30-offboarding'],
    },
    machineComponents: [
      'scheduled deletion (never immediate)',
      'insert-only offboarding record',
      'outbox ordering',
    ],
    freedomComponents: [],
    stackCoupling: TENANT_LIFECYCLE_STACK_COUPLING,
  });
}

export function createT475Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T475',
    flowId: 'FLOW-30',
    name: 'TenantHealthScorer',
    archetype: ContractArchetype.EVALUATION,
    entry: 'Triggered periodically or after significant tenant activity changes',
    purpose:
      'Compute per-tenant health score (0.0–1.0) from usage, error rates, and quota consumption',
    distinctFrom:
      'T476 (metrics aggregation — T475 computes health score, T476 aggregates raw metrics)',
    familyId: 'Family-184',
    factoryDependencies: [
      {
        factoryId: 'F1214',
        interfaceName: 'ITenantHealthStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Stores health score result — upsert by tenantId',
      },
      {
        factoryId: 'F1215',
        interfaceName: 'IHealthScoreEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Emits tenant.health.scored after storeDocument (DNA-8)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow30', taskType: 'T475', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'evaluation', max_tokens: 3000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
    ],
    qualityGates: [
      ...TENANT_LIFECYCLE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Health score MUST be a number 0.0–1.0',
        severity: 'error' as const,
        checkType: 'spec_adherence',
      },
    ],
    ironRules: [
      ...TENANT_LIFECYCLE_IRON_RULES_CORE,
      'Health score MUST be in range 0.0–1.0 (inclusive)',
      'storeDocument() MUST be called BEFORE enqueue() — DNA-8',
    ],
    bfaRegistration: {
      entities: ['tenant', 'health_score'],
      events: ['tenant.health.scored'],
      apiRoutes: ['/api/dynamic/flow30-tenant-health'],
    },
    machineComponents: ['score range validation (0.0–1.0)', 'outbox ordering'],
    freedomComponents: [],
    stackCoupling: TENANT_LIFECYCLE_STACK_COUPLING,
  });
}

export function createT476Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T476',
    flowId: 'FLOW-30',
    name: 'UsageMetricsAggregator',
    archetype: ContractArchetype.LEARNING,
    entry: 'Triggered via queue consumer after usage events — NEVER on live path',
    purpose: 'Aggregate per-tenant usage metrics asynchronously; queue-only (SCORE-0)',
    distinctFrom:
      'T475 (health scoring — T476 aggregates raw metrics, T475 computes derived score)',
    familyId: 'Family-184',
    factoryDependencies: [
      {
        factoryId: 'F1216',
        interfaceName: 'IUsageMetricsStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Stores aggregated usage metrics by tenantId and period',
      },
      {
        factoryId: 'F1217',
        interfaceName: 'IMetricsEventEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Emits usage.metrics.aggregated after storeDocument (DNA-8)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow30', taskType: 'T476', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'learning', max_tokens: 3000 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true, arbiters: ['score-0-async'] },
      },
    ],
    qualityGates: [
      ...TENANT_LIFECYCLE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'SCORE-0: MUST be async-only — never on live request path',
        severity: 'error' as const,
        checkType: 'score_0_compliance',
      },
    ],
    ironRules: [
      ...TENANT_LIFECYCLE_IRON_RULES_CORE,
      'ASYNC-ONLY: UsageMetricsAggregator MUST only be triggered via queue consumer — never on live request path',
      'storeDocument() MUST be called BEFORE enqueue() — DNA-8',
    ],
    bfaRegistration: {
      entities: ['tenant', 'usage_metric'],
      events: ['usage.metrics.aggregated'],
      apiRoutes: [],
    },
    machineComponents: ['async-only guard', 'period-based aggregation', 'outbox ordering'],
    freedomComponents: [],
    stackCoupling: TENANT_LIFECYCLE_STACK_COUPLING,
  });
}

export function createT477Contract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T477',
    flowId: 'FLOW-30',
    name: 'TenantPolicyEnforcer',
    archetype: ContractArchetype.GUARD,
    entry: 'Called before operations that must comply with tenant-level policy constraints',
    purpose: 'Enforce tenant policies from FREEDOM config; POLICY_VIOLATION on breach',
    distinctFrom:
      'T471 (quota — T477 enforces business/compliance policies, T471 enforces resource quotas)',
    familyId: 'Family-182',
    factoryDependencies: [
      {
        factoryId: 'F1218',
        interfaceName: 'ITenantPolicyStore',
        fabricType: FabricType.DATABASE,
        providerHint: 'elasticsearch',
        description: 'Reads active policy document for tenant',
      },
      {
        factoryId: 'F1219',
        interfaceName: 'IPolicyViolationEmitter',
        fabricType: FabricType.QUEUE,
        providerHint: 'redis_streams',
        description: 'Emits policy.violation.detected on breach (DNA-8)',
      },
    ],
    afStations: [
      {
        stationId: 'AF-3',
        role: 'prompt_library',
        config: { domain: 'flow30', taskType: 'T477', tier: 2 },
      },
      {
        stationId: 'AF-1',
        role: 'generate',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { template: 'guard', max_tokens: 2500 },
      },
      {
        stationId: 'AF-9',
        role: 'judge',
        modelHint: MODEL_HINT_FROM_FREEDOM,
        config: { strict_mode: true },
      },
    ],
    qualityGates: [
      ...TENANT_LIFECYCLE_QUALITY_GATES_CORE,
      {
        gateId: 'QG-05',
        description: 'Policy rules MUST come from FREEDOM config — never hardcoded',
        severity: 'error' as const,
        checkType: 'freedom_compliance',
      },
    ],
    ironRules: [
      ...TENANT_LIFECYCLE_IRON_RULES_CORE,
      'Policy rules MUST be read from FREEDOM config — never hardcoded',
      'POLICY_VIOLATION error code MUST be returned on breach — no bypass',
    ],
    bfaRegistration: {
      entities: ['tenant', 'policy'],
      events: ['policy.violation.detected'],
      apiRoutes: [],
    },
    machineComponents: ['policy rule evaluation engine', 'bypass_allowed=false enforcement'],
    freedomComponents: [],
    stackCoupling: TENANT_LIFECYCLE_STACK_COUPLING,
  });
}

/** All FLOW-30 contract factories in task-type order. */
export const TENANT_LIFECYCLE_CONTRACT_FACTORIES: Array<() => EngineContract> = [
  createT468Contract,
  createT469Contract,
  createT470Contract,
  createT471Contract,
  createT472Contract,
  createT473Contract,
  createT474Contract,
  createT475Contract,
  createT476Contract,
  createT477Contract,
];
