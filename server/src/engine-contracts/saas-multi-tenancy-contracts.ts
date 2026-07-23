/**
 * FLOW-15 Engine Contracts — SaaS Multi-Tenancy
 *
 * T605  TenantProvisioningOrchestrator   archetype: ORCHESTRATION (atomic bootstrap, SETNX)
 * T606  TenantConfigurationManager       archetype: VALIDATION (MACHINE_LOCKED_KEYS, OCC)
 * T607  TenantQuotaMaterializer          archetype: DATA_PIPELINE (Redis MULTI/EXEC)
 * T608  TenantLifecycleManager           archetype: ORCHESTRATION (suspend-not-delete, cascade)
 *
 * DNA-1: All business data uses Record<string, unknown> — no typed interfaces.
 * DNA-3: All methods return DataProcessResult<T> — never throw.
 * DNA-8: storeDocument() BEFORE enqueue() on every transition.
 *
 * T-number note: Design documents (R1/R2) reference T221-T224, but those collide with
 *   FLOW-14 etl-data-integration (T213-T224). Remapped to T605-T608 per CLAUDE.md boundary.
 * Factory note: Design documents reference F230-F238, but those collide with FLOW-07.
 *   Remapped to F1519-F1527 per CLAUDE.md boundary.
 *
 * CF-15-1: T605 SETNX ORDER 1, synchronous bulkSeed ORDER 3, TenantProvisioningFailed
 * CF-15-2: T606 MACHINE_LOCKED_KEYS compile-time constant, ORDER 1 rejection, OCC write
 * CF-15-3: T607 Redis MULTI/EXEC atomicity; T608 suspend-not-delete + cascade
 * CF-15-4: scope_isolation in all arbiterConfig blocks; ALS tenantId exclusively
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';

export const SAAS_MULTI_TENANCY_TASK_TYPES = ['T605', 'T606', 'T607', 'T608'] as const;

// ── T605: TenantProvisioningOrchestrator ────────────────────────────────────

export function createTenantProvisioningOrchestratorContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T605',
    flowId: 'FLOW-15',
    flowName: 'SaaS Multi-Tenancy',
    name: 'TenantProvisioningOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'Triggered by TenantRegistrationRequested event (operator registers organization)',
    purpose:
      'Atomic all-or-nothing tenant bootstrap. SETNX idempotency at ORDER 1, then ' +
      'synchronous blocking sequence: storeDocument(tenant, PROVISIONING) → ' +
      'bulkSeedFreedomConfig(tenantId, tier) → updateDocument(ACTIVE) → audit → ' +
      'enqueue(TenantProvisioned). Partial bootstrap is silent corruption.',
    distinctFrom:
      'T606 TenantConfigurationManager (T605 creates the tenant; T606 updates individual config keys after creation)',

    ironRules: [
      'IR-1: SETNX(hash(operatorId+tenantSlug)) at ORDER 1 — before any storeDocument. ' +
        'Duplicate provision requests rejected idempotently. CF-15-1.',
      'IR-2: storeDocument(tenantRecord, {status:PROVISIONING}) at ORDER 2 — tenant record created.',
      'IR-3: bulkSeedFreedomConfig(tenantId, tier) at ORDER 3 — SYNCHRONOUS blocking. ' +
        'Not fire-and-forget, not async. Includes MACHINE keys: tenantId, masterTenantId, ' +
        'provisionedAt, subscriptionTier. CF-15-1.',
      'IR-4: updateDocument(tenantRecord, {status:ACTIVE}) at ORDER 4 — only after config confirmed.',
      'IR-5: storeDocument(audit) at ORDER 5 BEFORE enqueue(TenantProvisioned). DNA-8. CF-15-1.',
      'IR-6: TenantProvisioningFailed {operatorId, tenantSlug, stepFailed, reason} emitted on any ' +
        'step 2-4 failure. CF-15-1.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'SetnxIdempotency',
          description: 'SETNX(hash(operatorId+tenantSlug)) — reject duplicate provisions',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'CreateTenantRecord',
          description: 'storeDocument(xiigen-tenants, {status:PROVISIONING})',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'BulkSeedFreedomConfig',
          description: 'bulkSeedFreedomConfig(tenantId, tier) — synchronous blocking',
          ironRuleRef: 'IR-3',
        },
        {
          order: 4,
          name: 'ActivateTenant',
          description: 'updateDocument(status:ACTIVE) after config confirmed',
          ironRuleRef: 'IR-4',
        },
        {
          order: 5,
          name: 'AuditWrite',
          description: 'storeDocument(audit) — DNA-8, before enqueue',
          ironRuleRef: 'IR-5',
        },
        {
          order: 6,
          name: 'EmitTenantProvisioned',
          description: 'enqueue(TenantProvisioned) — only after all steps confirm',
          ironRuleRef: 'IR-5',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1519',
        interfaceName: 'ITenantRegistryService',
        fabricType: FabricType.DATABASE,
        description: 'Tenant record CRUD in xiigen-tenants index',
      },
      {
        factoryId: 'F1520',
        interfaceName: 'IFreedomConfigSeedService',
        fabricType: FabricType.DATABASE,
        description: 'Bulk seed FREEDOM config keys for new tenant (shared with T606)',
      },
      {
        factoryId: 'F1521',
        interfaceName: 'IAuditTrailService',
        fabricType: FabricType.DATABASE,
        description: 'Provision audit trail — PLATFORM_ONLY',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'TenantProvisioned / TenantProvisioningFailed event emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-15-01',
        description: 'SETNX at ORDER 1 before any storeDocument (IR-1)',
        severity: 'error',
        checkType: 'setnx_before_operation',
      },
      {
        gateId: 'QG-15-02',
        description: 'bulkSeedFreedomConfig synchronous blocking at ORDER 3 (IR-3)',
        severity: 'error',
        checkType: 'synchronous_seed',
      },
      {
        gateId: 'QG-15-03',
        description: 'storeDocument(audit) before enqueue(TenantProvisioned) (IR-5, DNA-8)',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],

    machineConstants: [
      {
        key: 'PROVISION_STEP_ORDER',
        value: ['SETNX', 'RECORD', 'CONFIG_SEED', 'ACTIVATE', 'AUDIT', 'EMIT'],
        type: 'ordering',
        neverFromConfig: true,
      },
    ],

    bfaRegistration: {
      entities: ['tenant', 'tenant_audit', 'freedom_config'],
      events: ['tenant.provisioned', 'tenant.provisioning.failed'],
      apiRoutes: [],
    },

    machineComponents: [
      'SETNX(hash(operatorId+tenantSlug)) at ORDER 1 — duplicate provision rejected (CF-15-1)',
      'bulkSeedFreedomConfig(tenantId, tier) at ORDER 3 — synchronous blocking (CF-15-1)',
      'MACHINE keys seeded: tenantId, masterTenantId, provisionedAt, subscriptionTier',
      'Outbox: audit storeDocument before TenantProvisioned enqueue (DNA-8)',
      'TenantProvisioningFailed with stepFailed on any step 2-4 failure',
    ],

    freedomComponents: [
      'tenant_default_quota_api_calls — default quota for API calls per hour',
      'tenant_default_quota_storage_gb — default quota for storage in GB',
      'tenant_default_quota_seats — default quota for seats',
    ],
  });
}

// ── T606: TenantConfigurationManager ────────────────────────────────────────

export function createTenantConfigurationManagerContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T606',
    flowId: 'FLOW-15',
    flowName: 'SaaS Multi-Tenancy',
    name: 'TenantConfigurationManager',
    archetype: ContractArchetype.VALIDATION,
    entry: 'Triggered by TenantConfigUpdateRequested event (operator updates config key)',
    purpose:
      'FREEDOM config key management with compile-time immutability guard. ' +
      'MACHINE_LOCKED_KEYS validated at ORDER 1 — zero storage access for locked keys. ' +
      'Mutable keys written via storeDocumentWithOCC (not plain storeDocument). ' +
      'tenantId exclusively from ALS — request body tenantId ignored.',
    distinctFrom:
      'T605 TenantProvisioningOrchestrator (T605 creates tenant + initial config; T606 updates individual keys after creation)',

    ironRules: [
      'IR-1: MACHINE_LOCKED_KEYS = [tenantId, masterTenantId, provisionedAt, subscriptionTier] — ' +
        'compile-time constant. NEVER a database lookup, NEVER in FREEDOM config. CF-15-2.',
      'IR-2: Key mutability checked at ORDER 1. No OCC read, no value validation, no write for locked keys. ' +
        'ConfigKeyImmutable emitted immediately. CF-15-2.',
      'IR-3: storeDocumentWithOCC(config, versionPin) — NOT plain storeDocument. ' +
        'OCC_CONFLICT → emit ConfigUpdateConflict. CF-15-2.',
      'IR-4: storeDocument(audit) at ORDER 5 BEFORE TenantConfigurationUpdated emit. DNA-8.',
      'IR-5: tenantId from ALS only — request body tenantId ignored if present. CF-15-4.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'MachineKeyGuard',
          description: 'MACHINE_LOCKED_KEYS check — reject locked keys immediately',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'OccRead',
          description: 'getDocumentWithVersion(config, tenantId) for versionPin',
          ironRuleRef: 'IR-3',
        },
        {
          order: 3,
          name: 'ValueValidation',
          description: 'Validate value type for known key prefixes (quota_* → positive int)',
          ironRuleRef: 'IR-2',
        },
        {
          order: 4,
          name: 'OccWrite',
          description: 'storeDocumentWithOCC(config, versionPin) — not plain storeDocument',
          ironRuleRef: 'IR-3',
        },
        {
          order: 5,
          name: 'AuditWrite',
          description: 'storeDocument(audit) — DNA-8, before enqueue',
          ironRuleRef: 'IR-4',
        },
        {
          order: 6,
          name: 'EmitConfigUpdated',
          description: 'enqueue(TenantConfigurationUpdated)',
          ironRuleRef: 'IR-4',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1520',
        interfaceName: 'IFreedomConfigSeedService',
        fabricType: FabricType.DATABASE,
        description: 'FREEDOM config management (shared with T605)',
      },
      {
        factoryId: 'F1522',
        interfaceName: 'IConfigKeyValidator',
        fabricType: FabricType.DATABASE,
        description: 'Machine-key registry + value validation',
      },
      {
        factoryId: 'F1523',
        interfaceName: 'IAuditTrailService',
        fabricType: FabricType.DATABASE,
        description: 'Config audit trail — PLATFORM_ONLY',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description:
          'TenantConfigurationUpdated / ConfigKeyImmutable / ConfigUpdateConflict emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-15-04',
        description: 'MACHINE_LOCKED_KEYS at ORDER 1 — no storage for locked keys (IR-1)',
        severity: 'error',
        checkType: 'machine_key_guard',
      },
      {
        gateId: 'QG-15-05',
        description: 'storeDocumentWithOCC not plain storeDocument (IR-3)',
        severity: 'error',
        checkType: 'setnx_before_operation',
      },
    ],

    machineConstants: [
      {
        key: 'MACHINE_LOCKED_KEYS',
        value: ['tenantId', 'masterTenantId', 'provisionedAt', 'subscriptionTier'],
        type: 'constant',
        neverFromConfig: true,
      },
    ],

    bfaRegistration: {
      entities: ['freedom_config', 'config_audit'],
      events: ['tenant.config.updated', 'config.key.immutable', 'config.update.conflict'],
      apiRoutes: [],
    },

    machineComponents: [
      "MACHINE_LOCKED_KEYS = ['tenantId','masterTenantId','provisionedAt','subscriptionTier'] — compile-time (CF-15-2)",
      'Key mutability check at ORDER 1 — no storage for locked keys (CF-15-2)',
      'storeDocumentWithOCC — not plain storeDocument (CF-15-2)',
      'tenantId from ALS only — request body tenantId ignored (CF-15-4)',
      'Outbox: audit storeDocument before TenantConfigurationUpdated enqueue (DNA-8)',
    ],

    freedomComponents: [
      'tenant_config_max_custom_keys — maximum number of custom config keys per tenant',
    ],
  });
}

// ── T607: TenantQuotaMaterializer ───────────────────────────────────────────

export function createTenantQuotaMaterializerContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T607',
    flowId: 'FLOW-15',
    flowName: 'SaaS Multi-Tenancy',
    name: 'TenantQuotaMaterializer',
    archetype: ContractArchetype.DATA_PIPELINE,
    entry:
      'Triggered by TenantProvisioned (T605 output) or TenantConfigurationUpdated (T606 output, quota_* keys only)',
    purpose:
      'Materializes tenant quota counters in Redis using atomic MULTI/EXEC block. ' +
      'Individual SET in a loop leaves inconsistent per-API-type quotas on crash. ' +
      'Quota values loaded from tier definitions — never hardcoded.',
    distinctFrom:
      'T606 TenantConfigurationManager (T606 stores config keys; T607 materializes quota counters in Redis from those keys)',

    ironRules: [
      'IR-1: All quota counter writes in single Redis MULTI/EXEC block — never individual SET loop. ' +
        'EXEC failure → DISCARD → emit TenantQuotaMaterializationFailed. CF-15-3.',
      'IR-2: Quota values from ITenantTierService.getQuotas(subscriptionTier) — never hardcoded literals.',
      "IR-3: TenantConfigurationUpdated processed ONLY if key.startsWith('quota_') — others: return immediately.",
      'IR-4: Quota key format: quota:{ALStenantId}:{quotaType} — tenantId from ALS. CF-15-4.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'QuotaKeyFilter',
          description: "Return immediately if !key.startsWith('quota_')",
          ironRuleRef: 'IR-3',
        },
        {
          order: 2,
          name: 'LoadTierDefinition',
          description: 'Get quota definitions from ITenantTierService',
          ironRuleRef: 'IR-2',
        },
        {
          order: 3,
          name: 'MultiExecWrite',
          description: 'Redis MULTI/EXEC block for all quota counters',
          ironRuleRef: 'IR-1',
        },
        {
          order: 4,
          name: 'EmitMaterialized',
          description: 'enqueue(TenantQuotaMaterialized)',
          ironRuleRef: 'IR-1',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1524',
        interfaceName: 'IQuotaRedisService',
        fabricType: FabricType.DATABASE,
        description: 'Redis MULTI/EXEC quota operations',
      },
      {
        factoryId: 'F1525',
        interfaceName: 'ITenantTierService',
        fabricType: FabricType.DATABASE,
        description: 'Reads tier definitions from config',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'TenantQuotaMaterialized / TenantQuotaMaterializationFailed emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-15-06',
        description: 'Redis MULTI/EXEC block — no individual SET (IR-1)',
        severity: 'error',
        checkType: 'atomic_write',
      },
      {
        gateId: 'QG-15-07',
        description: 'Quota values from tier definitions — no hardcoded literals (IR-2)',
        severity: 'error',
        checkType: 'no_hardcoded_values',
      },
    ],

    bfaRegistration: {
      entities: ['quota_counter'],
      events: ['tenant.quota.materialized', 'tenant.quota.materialization.failed'],
      apiRoutes: [],
    },

    machineComponents: [
      'Redis MULTI/EXEC atomic block for all quota counters — no individual SET loop (CF-15-3)',
      'Quota values from ITenantTierService — never hardcoded literals',
      "TenantConfigurationUpdated processed ONLY if key.startsWith('quota_')",
      'Quota key format: quota:{ALStenantId}:{quotaType} (CF-15-4)',
    ],

    freedomComponents: ['tenant_quota_materialization_retry_limit — max retries on EXEC failure'],
  });
}

// ── T608: TenantLifecycleManager ────────────────────────────────────────────

export function createTenantLifecycleManagerContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T608',
    flowId: 'FLOW-15',
    flowName: 'SaaS Multi-Tenancy',
    name: 'TenantLifecycleManager',
    archetype: ContractArchetype.ORCHESTRATION,
    entry:
      'Triggered by TenantSuspensionRequested / TenantTerminationRequested / TenantReactivationRequested events',
    purpose:
      'Tenant lifecycle state machine: TRIAL→ACTIVE, ACTIVE→SUSPENDED, SUSPENDED→ACTIVE, ' +
      'ACTIVE→CANCELLED, TRIAL→CANCELLED, SUSPENDED→CANCELLED. ' +
      'Suspension = status change ONLY — never deleteDocument. ' +
      'cascadeToSubscriptions:true always on TenantSuspended. ' +
      'Termination delegates purge via DataPurgeRequested to FLOW-13 T216.',
    distinctFrom:
      'T605 TenantProvisioningOrchestrator (T605 creates tenant; T608 manages lifecycle after creation). ' +
      'T210 SubscriptionLifecycleManager (T210 manages subscription state within FLOW-12; T608 manages tenant-level state)',

    ironRules: [
      'IR-1: TenantSuspensionRequested → updateDocument(status:SUSPENDED, accessBlockedAt) ONLY. ' +
        'NO deleteDocument on any suspension path — ever. CF-15-3.',
      'IR-2: TenantSuspended must carry cascadeToSubscriptions:true. ' +
        'FLOW-12 T210 requires it for bulk-suspension. Not configurable. CF-15-3.',
      'IR-3: TenantTerminationRequested → emit TenantTerminated + DataPurgeRequested BOTH. ' +
        'tombstoneRef = hash(tenantId + terminate + timestamp). Never inline deleteAll. CF-15-3.',
      'IR-4: storeDocument(audit) BEFORE every state event emit. DNA-8 on all 3 paths.',
      'IR-5: PAUSED input → TenantLifecycleRejected(INVALID_TRANSITION). ' +
        'PAUSED is a subscription state from FLOW-12, not a valid tenant state.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'ValidateTransition',
          description: 'State machine transition validation (reject PAUSED)',
          ironRuleRef: 'IR-5',
        },
        {
          order: 2,
          name: 'StatusUpdate',
          description: 'updateDocument(xiigen-tenants, {status: newStatus})',
          ironRuleRef: 'IR-1',
        },
        {
          order: 3,
          name: 'AuditWrite',
          description: 'storeDocument(audit) — DNA-8, before event emit',
          ironRuleRef: 'IR-4',
        },
        {
          order: 4,
          name: 'EmitStateEvent',
          description: 'TenantSuspended / TenantTerminated / TenantReactivated',
          ironRuleRef: 'IR-2',
        },
        {
          order: 5,
          name: 'EmitPurgeRequest',
          description: 'DataPurgeRequested on termination path only',
          ironRuleRef: 'IR-3',
        },
      ],
    },

    factoryDependencies: [
      {
        factoryId: 'F1526',
        interfaceName: 'ITenantStateService',
        fabricType: FabricType.DATABASE,
        description: 'Tenant state machine transitions',
      },
      {
        factoryId: 'F1527',
        interfaceName: 'IAuditTrailService',
        fabricType: FabricType.DATABASE,
        description: 'Lifecycle audit trail — PLATFORM_ONLY',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description:
          'TenantSuspended / TenantTerminated / TenantReactivated / DataPurgeRequested / TenantLifecycleRejected emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-15-08',
        description: 'No deleteDocument on suspension path (IR-1)',
        severity: 'error',
        checkType: 'suspend_not_delete',
      },
      {
        gateId: 'QG-15-09',
        description: 'cascadeToSubscriptions:true on TenantSuspended (IR-2)',
        severity: 'error',
        checkType: 'cascade_check',
      },
      {
        gateId: 'QG-15-10',
        description: 'DataPurgeRequested emitted on termination (IR-3)',
        severity: 'error',
        checkType: 'purge_delegation',
      },
    ],

    machineConstants: [
      {
        key: 'VALID_TENANT_STATES',
        value: ['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED'],
        type: 'state_machine',
        neverFromConfig: true,
      },
    ],

    bfaRegistration: {
      entities: ['tenant', 'tenant_audit'],
      events: [
        'tenant.suspended',
        'tenant.terminated',
        'tenant.reactivated',
        'data.purge.requested',
        'tenant.lifecycle.rejected',
      ],
      apiRoutes: [],
    },

    machineComponents: [
      'updateDocument(status:SUSPENDED) ONLY on suspension — no deleteDocument (CF-15-3)',
      'TenantSuspended.cascadeToSubscriptions = true always (CF-15-3)',
      'TenantTerminated + DataPurgeRequested both emitted on termination (CF-15-3)',
      'tombstoneRef = hash(tenantId + terminate + timestamp) — no raw PII',
      'PAUSED input → TenantLifecycleRejected(INVALID_TRANSITION)',
      'Outbox: audit storeDocument before every state event emit (DNA-8)',
    ],

    freedomComponents: [
      'tenant_data_retention_days — data retention period after termination',
      'tenant_reactivation_payment_check — require payment resolution for SUSPENDED→ACTIVE',
    ],
  });
}

// ── Contract factories array (for bootstrapper wiring) ──────────────────────

export const SAAS_MULTI_TENANCY_CONTRACT_FACTORIES = [
  createTenantProvisioningOrchestratorContract,
  createTenantConfigurationManagerContract,
  createTenantQuotaMaterializerContract,
  createTenantLifecycleManagerContract,
];

export const SAAS_MULTI_TENANCY_CONTRACT_DESCRIPTORS = SAAS_MULTI_TENANCY_CONTRACT_FACTORIES.map(
  (f) => {
    const c = f();
    return {
      taskTypeId: c.taskTypeId,
      name: c.name,
      flowId: c.flowId,
      version: 'v1',
    };
  },
);
