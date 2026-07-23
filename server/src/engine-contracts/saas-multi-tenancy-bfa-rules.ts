/**
 * FLOW-15 BFA Rules — SaaS Multi-Tenancy
 *
 * CF-15-1: T605 atomic bootstrap (SETNX + synchronous FREEDOM seed + TenantProvisioningFailed)
 * CF-15-2: T606 MACHINE_LOCKED_KEYS compile-time constant + OCC write
 * CF-15-3: T607 Redis MULTI/EXEC atomicity + T608 suspend-not-delete + cascade
 * CF-15-4: scope_isolation arbiter FC-32 compliance across all 4 services
 */

export const SAAS_MULTI_TENANCY_BFA_RULES = [
  {
    ruleId: 'CF-15-1',
    flowId: 'FLOW-15',
    description:
      'T605 TenantProvisioningOrchestrator: atomic bootstrap is MACHINE-FIXED. ' +
      'SETNX(hash(operatorId+tenantSlug)) at ORDER 1 before any storeDocument. ' +
      'bulkSeedFreedomConfig(tenantId, tier) at ORDER 3 is synchronous and blocking — ' +
      'not fire-and-forget, not async. ' +
      'TenantProvisioned emitted ONLY after all 4 steps (record, config, update, audit) confirm. ' +
      'Partial bootstrap: tenant exists in xiigen-tenants but has no FREEDOM config — ' +
      'every downstream flow reads null config and falls back to wrong defaults silently. ' +
      'TenantProvisioningFailed emitted with stepFailed on any step failure. ' +
      'SF-CHECK-1.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-15-2',
    flowId: 'FLOW-15',
    description:
      'T606 TenantConfigurationManager: MACHINE_LOCKED_KEYS is a compile-time constant — ' +
      'never a database lookup, never stored in FREEDOM config. ' +
      "MACHINE_LOCKED_KEYS = ['tenantId','masterTenantId','provisionedAt','subscriptionTier']. " +
      'Key mutability validated at ORDER 1 — no OCC read, no value validation, no write for locked keys. ' +
      'ConfigKeyImmutable emitted immediately on locked key rejection. ' +
      'storeDocumentWithOCC — not plain storeDocument. ' +
      'Runtime locked-key lookup is attackable: write to locked-key list first, then override tenantId. ' +
      'tenantId from ALS only — request body tenantId ignored. ' +
      'SF-CHECK-2.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-15-3',
    flowId: 'FLOW-15',
    description:
      'T607 TenantQuotaMaterializer: Redis MULTI/EXEC atomic block for ALL quota counters. ' +
      'Individual SET commands in a loop leave inconsistent per-API-type quotas on crash. ' +
      'Quota values from tier definitions at runtime — never hardcoded literals. ' +
      "TenantConfigurationUpdated processed only if key.startsWith('quota_'). " +
      'T608 TenantLifecycleManager: TenantSuspensionRequested = updateDocument(status:SUSPENDED) ONLY. ' +
      'deleteDocument on suspension is irreversible data loss — reactivation impossible. ' +
      'TenantSuspended must carry cascadeToSubscriptions:true — absence means FLOW-12 billing continues. ' +
      'TenantTerminated delegates purge via DataPurgeRequested to FLOW-13 T216 — never inline deleteAll. ' +
      'SF-CHECK-3 + SF-CHECK-4 + SF-CHECK-5.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  // P11 (CF-945..CF-948) — edge-case coverage from docs/flow-coverage/saas-multi-tenancy/P10-server-specs.md
  {
    ruleId: 'CF-945',
    flowId: 'FLOW-15',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-5 Optimistic concurrency on POST /api/dynamic/saas-multi-tenancy — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-946',
    flowId: 'FLOW-15',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-6 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-947',
    flowId: 'FLOW-15',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-8 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-948',
    flowId: 'FLOW-15',
    type: 'DNA8_ORDERING',
    description:
      'EC-9 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
  {
    ruleId: 'CF-15-4',
    flowId: 'FLOW-15',
    description:
      'scope_isolation arbiter present in all arbiterConfig blocks (FC-32 / SK-526). ' +
      'xiigen-tenants records are PRIVATE per tenant. ' +
      'xiigen-freedom-config tenant-specific keys are PRIVATE; ' +
      'platform-level tier definitions are GLOBAL (intentional). ' +
      'quota key format: quota:{ALStenantId}:{type} — no shared namespace. ' +
      'T605 computes tenantId as internal hash — not from request payload. ' +
      'T606/T607/T608 tenantId exclusively from ALS. ' +
      'IAuditTrailService (F1521/F1523/F1527) is PLATFORM_ONLY.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
  },
];
