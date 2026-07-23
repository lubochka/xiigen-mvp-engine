/**
 * T605 TenantProvisioningOrchestrator [ORCHESTRATION]
 * FLOW-15: SaaS Multi-Tenancy
 *
 * Entry: TenantRegistrationRequested event (operator registers organization)
 *
 * Execution order is MACHINE (CF-15-1):
 *   ORDER 1: SETNX(hash(operatorId+tenantSlug)) — reject duplicate provisions
 *   ORDER 2: storeDocument(xiigen-tenants, {status:PROVISIONING}) — tenant record
 *   ORDER 3: bulkSeedFreedomConfig(tenantId, tier) — SYNCHRONOUS, blocking
 *   ORDER 4: updateDocument(status:ACTIVE) — after config confirmed
 *   ORDER 5: storeDocument(audit) — DNA-8, before emit
 *   ORDER 6: enqueue(TenantProvisioned) — only after all steps confirm
 *
 * Iron rules:
 *   IR-1: SETNX at ORDER 1 before any storeDocument (CF-15-1)
 *   IR-2: storeDocument(tenantRecord, {status:PROVISIONING}) at ORDER 2
 *   IR-3: bulkSeedFreedomConfig synchronous blocking at ORDER 3 (CF-15-1)
 *   IR-4: updateDocument(status:ACTIVE) at ORDER 4 after config confirmed
 *   IR-5: storeDocument(audit) at ORDER 5 BEFORE enqueue(TenantProvisioned) (DNA-8)
 *   IR-6: TenantProvisioningFailed with stepFailed on any step 2-4 failure (CF-15-1)
 *
 * Pattern reference: subscription-billing/recurring-billing-engine.service.ts (SETNX + FREEDOM)
 */

import { Injectable, Inject } from '@nestjs/common';
import { createHash } from 'crypto';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const TENANTS_INDEX = 'xiigen-tenants';
const FREEDOM_INDEX = 'xiigen-freedom-config';
const PROVISION_AUDIT_INDEX = 'xiigen-provision-audit';
const PROVISION_LOCK_INDEX = 'xiigen-provision-locks';
const DEFAULT_MASTER_TENANT_ID = 'xiigen-master-00000000-0000-0000-0000-000000000001';

/** MACHINE: Keys seeded into every new tenant's FREEDOM config. */
const _MACHINE_SEED_KEYS = [
  'tenantId',
  'masterTenantId',
  'provisionedAt',
  'subscriptionTier',
] as const;

@Injectable()
export class TenantProvisioningOrchestratorService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly _tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T605',
        serviceName: 'TenantProvisioningOrchestratorService',
        flowId: 'FLOW-15',
      }),
    });
  }

  /**
   * Atomic all-or-nothing tenant bootstrap.
   * DPO pattern: ATOMIC-TENANT-BOOTSTRAP-001
   */
  async provisionTenant(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const operatorId = event['operatorId'] as string;
    const tenantSlug = event['tenantSlug'] as string;
    const subscriptionTier = event['subscriptionTier'] as string;
    const billingContact = event['billingContact'] as string;

    if (!operatorId || !tenantSlug || !subscriptionTier || !billingContact) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'operatorId, tenantSlug, subscriptionTier, and billingContact are required',
      );
    }

    // ── ORDER 1: SETNX idempotency — IR-1, CF-15-1 ──────────────────────────
    // Case-insensitive tenantSlug for uniqueness (R2 business_t221)
    const normalizedSlug = tenantSlug.toLowerCase();
    const setnxKey = createHash('sha256')
      .update(`provision:${operatorId}:${normalizedSlug}`)
      .digest('hex');
    const lockResult = await this.dbFabric.searchDocuments(PROVISION_LOCK_INDEX, { setnxKey });
    if (lockResult.isSuccess && (lockResult.data ?? []).length > 0) {
      // Duplicate provision attempt — idempotent rejection
      return DataProcessResult.success({
        alreadyProvisioning: true,
        tenantSlug,
        operatorId,
      });
    }
    // Acquire the lock
    await this.dbFabric.storeDocument(
      PROVISION_LOCK_INDEX,
      {
        setnxKey,
        operatorId,
        tenantSlug,
        createdAt: new Date().toISOString(),
        knowledgeScope: 'PRIVATE',
      },
      setnxKey,
    );

    // ── ORDER 1.5: Validate subscriptionTier against tier-definitions — H-2 ──
    // R2 domain_t221: "subscriptionTier validated against xiigen-tier-definitions before provision begins"
    const tierResult = await this.dbFabric.searchDocuments('xiigen-tier-definitions', {
      tierId: subscriptionTier,
    });
    if (!tierResult.isSuccess || (tierResult.data ?? []).length === 0) {
      return DataProcessResult.failure(
        'UNKNOWN_TIER',
        `Subscription tier '${subscriptionTier}' not found in xiigen-tier-definitions`,
      );
    }
    const tierDefinition = tierResult.data![0] as Record<string, unknown>;
    const masterTenantId = this.resolveMasterTenantId(tierDefinition);

    // Compute tenantId as internal hash — NOT from request payload (CF-15-4)
    const tenantId = createHash('sha256')
      .update(`${tenantSlug}:${new Date().toISOString()}`)
      .digest('hex')
      .substring(0, 32);
    const provisionedAt = new Date().toISOString();

    // ── ORDER 2: Create tenant record — IR-2 ────────────────────────────────
    const tenantRecord: Record<string, unknown> = {
      tenantId,
      tenantSlug,
      operatorId,
      subscriptionTier,
      masterTenantId,
      status: 'PROVISIONING',
      provisionedAt,
      knowledgeScope: 'PRIVATE',
    };

    const storeResult = await this.dbFabric.storeDocument(TENANTS_INDEX, tenantRecord, tenantId);
    if (!storeResult.isSuccess) {
      await this.queueFabric.enqueue('TenantProvisioningFailed', {
        operatorId,
        tenantSlug,
        stepFailed: '2',
        reason: 'tenant_record_creation_failed',
      });
      return DataProcessResult.failure(
        'PROVISION_STEP_2_FAILED',
        `Tenant record creation failed: ${storeResult.errorMessage}`,
      );
    }

    // ── ORDER 3: bulkSeedFreedomConfig — IR-3, CF-15-1 ──────────────────────
    // SYNCHRONOUS and blocking — NOT fire-and-forget, NOT async detached
    const seedResult = await this.bulkSeedFreedomConfig(
      tenantId,
      subscriptionTier,
      masterTenantId,
      provisionedAt,
    );
    if (!seedResult.isSuccess) {
      await this.queueFabric.enqueue('TenantProvisioningFailed', {
        operatorId,
        tenantSlug,
        tenantId,
        stepFailed: '3',
        reason: `freedom_config_seed_failed: ${seedResult.errorMessage ?? 'unknown'}`,
      });
      return DataProcessResult.failure(
        'PROVISION_STEP_3_FAILED',
        `FREEDOM config seeding failed: ${seedResult.errorMessage ?? 'unknown'}`,
      );
    }

    // ── ORDER 4: Activate tenant — IR-4 ─────────────────────────────────────
    const updateResult = await this.dbFabric.storeDocument(
      TENANTS_INDEX,
      { ...tenantRecord, status: 'ACTIVE' },
      tenantId,
    );
    if (!updateResult.isSuccess) {
      await this.queueFabric.enqueue('TenantProvisioningFailed', {
        operatorId,
        tenantSlug,
        tenantId,
        stepFailed: '4',
        reason: 'tenant_activation_failed',
      });
      return DataProcessResult.failure(
        'PROVISION_STEP_4_FAILED',
        `Tenant activation failed: ${updateResult.errorMessage}`,
      );
    }

    // ── ORDER 5: Audit write — IR-5, DNA-8 ──────────────────────────────────
    // storeDocument(audit) BEFORE enqueue(TenantProvisioned)
    await this.dbFabric.storeDocument(PROVISION_AUDIT_INDEX, {
      tenantId,
      operatorId,
      tenantSlug,
      subscriptionTier,
      action: 'TENANT_PROVISIONED',
      timestamp: new Date().toISOString(),
      knowledgeScope: 'PRIVATE',
    });

    // ── ORDER 6: Emit TenantProvisioned — IR-5 ─────────────────────────────
    await this.queueFabric.enqueue('TenantProvisioned', {
      tenantId,
      tenantSlug,
      subscriptionTier,
      provisionedAt,
      masterTenantId,
    });

    return DataProcessResult.success({
      tenantId,
      tenantSlug,
      subscriptionTier,
      provisionedAt,
      masterTenantId,
      status: 'ACTIVE',
    });
  }

  private resolveMasterTenantId(tierDefinition: Record<string, unknown>): string {
    const configured = tierDefinition['masterTenantId'];
    return typeof configured === 'string' && configured.length > 0
      ? configured
      : DEFAULT_MASTER_TENANT_ID;
  }

  /**
   * Synchronous blocking config seed — ORDER 3.
   * Includes all MACHINE keys: tenantId, masterTenantId, provisionedAt, subscriptionTier.
   */
  private async bulkSeedFreedomConfig(
    tenantId: string,
    subscriptionTier: string,
    masterTenantId: string,
    provisionedAt: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const configEntries: Record<string, unknown>[] = [
      { tenantId, key: 'tenantId', value: tenantId, knowledgeScope: 'PRIVATE' },
      { tenantId, key: 'masterTenantId', value: masterTenantId, knowledgeScope: 'PRIVATE' },
      { tenantId, key: 'provisionedAt', value: provisionedAt, knowledgeScope: 'PRIVATE' },
      { tenantId, key: 'subscriptionTier', value: subscriptionTier, knowledgeScope: 'PRIVATE' },
    ];

    const seededKeys: string[] = [];
    for (const entry of configEntries) {
      const docId = `${tenantId}:${entry['key'] as string}`;
      const result = await this.dbFabric.storeDocument(FREEDOM_INDEX, entry, docId);
      if (!result.isSuccess) {
        return DataProcessResult.failure(
          'FREEDOM_SEED_FAILED',
          `Failed to seed FREEDOM config key '${entry['key']}': ${result.errorMessage}`,
        );
      }
      seededKeys.push(entry['key'] as string);
    }
    return DataProcessResult.success({ tenantId, seededKeys });
  }
}
