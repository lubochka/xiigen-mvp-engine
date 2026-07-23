/**
 * T607 TenantQuotaMaterializer [DATA_PIPELINE]
 * FLOW-15: SaaS Multi-Tenancy
 *
 * Entry: TenantProvisioned (T605 output) or TenantConfigurationUpdated (T606, quota_* keys only)
 *
 * Execution order is MACHINE (CF-15-3):
 *   ORDER 1: Quota key filter — return immediately if !key.startsWith('quota_')
 *   ORDER 2: Load tier definition from ITenantTierService
 *   ORDER 3: Redis MULTI/EXEC block for all quota counters — never individual SET
 *   ORDER 4: enqueue(TenantQuotaMaterialized)
 *
 * Iron rules:
 *   IR-1: All quota writes in single MULTI/EXEC — never individual SET loop (CF-15-3)
 *   IR-2: Quota values from tier definitions — never hardcoded literals
 *   IR-3: TenantConfigurationUpdated processed ONLY if key.startsWith('quota_')
 *   IR-4: Quota key format: quota:{ALStenantId}:{quotaType} (CF-15-4)
 *
 * Pattern reference: subscription-billing/recurring-billing-engine.service.ts (FREEDOM config + Redis)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const TIER_DEFINITIONS_INDEX = 'xiigen-tier-definitions';

/** Tier definition shape (from FREEDOM config — not hardcoded). */
interface TierQuotaEntry {
  type: string;
  limit: number;
}

@Injectable()
export class TenantQuotaMaterializerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T607',
        serviceName: 'TenantQuotaMaterializerService',
        flowId: 'FLOW-15',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  /**
   * Handle TenantProvisioned — materialize initial quotas for the new tenant.
   * DPO pattern: QUOTA-ATOMIC-MATERIALIZATION-001
   */
  async materializeQuotas(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const subscriptionTier = event['subscriptionTier'] as string;

    if (!subscriptionTier) {
      return DataProcessResult.failure('INVALID_INPUT', 'subscriptionTier is required');
    }

    // ── ORDER 2: Load tier definition — IR-2 ────────────────────────────────
    const tierResult = await this.dbFabric.searchDocuments(TIER_DEFINITIONS_INDEX, {
      tierId: subscriptionTier,
    });

    if (!tierResult.isSuccess || (tierResult.data ?? []).length === 0) {
      await this.queueFabric.enqueue('TenantQuotaMaterializationFailed', {
        tenantId,
        subscriptionTier,
        reason: 'UNKNOWN_TIER',
      });
      return DataProcessResult.failure(
        'UNKNOWN_TIER',
        `Tier definition not found for '${subscriptionTier}'`,
      );
    }

    const tierDef = tierResult.data![0] as Record<string, unknown>;
    const quotaEntries = (tierDef['quotas'] as TierQuotaEntry[]) ?? [];

    // ── ORDER 3: Redis MULTI/EXEC — IR-1, CF-15-3 ──────────────────────────
    // All quota counters written in single atomic block — never individual SET loop
    const multiExecResult = await this.executeMultiExec(tenantId, quotaEntries);
    if (!multiExecResult.isSuccess) {
      await this.queueFabric.enqueue('TenantQuotaMaterializationFailed', {
        tenantId,
        subscriptionTier,
        reason: 'EXEC_FAILED',
      });
      return DataProcessResult.failure(
        'EXEC_FAILED',
        `Redis MULTI/EXEC failed: ${multiExecResult.errorMessage}`,
      );
    }

    // ── ORDER 4: Emit TenantQuotaMaterialized ───────────────────────────────
    await this.queueFabric.enqueue('TenantQuotaMaterialized', {
      tenantId,
      subscriptionTier,
      quotaTypesSet: quotaEntries.length,
      materializedAt: new Date().toISOString(),
    });

    return DataProcessResult.success({
      tenantId,
      subscriptionTier,
      quotaTypesSet: quotaEntries.length,
      materializedAt: new Date().toISOString(),
    });
  }

  /**
   * Handle TenantConfigurationUpdated — re-materialize quotas only for quota_* keys.
   * IR-3: Non-quota keys are silently ignored.
   */
  async handleConfigUpdate(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const key = event['key'] as string;

    // ── ORDER 1: Quota key filter — IR-3 ────────────────────────────────────
    if (!key || !key.startsWith('quota_')) {
      // Not a quota key — return immediately without any Redis operation
      return DataProcessResult.success({ filtered: true, key, reason: 'non_quota_key' });
    }

    // For quota key changes, flush old counters then re-materialize from tier definitions
    // R2 domain_t223: "tier change: DEL all quota:{tenantId}:* keys before MULTI/EXEC sets new values"
    const tenantId = this.getTenantId();
    const subscriptionTier = event['subscriptionTier'] as string;
    if (subscriptionTier) {
      // Flush existing quota counters before re-materialization
      await this.flushQuotaCounters(tenantId);
      return this.materializeQuotas(event);
    }

    return DataProcessResult.success({ filtered: true, key, reason: 'no_tier_context' });
  }

  /**
   * Execute Redis MULTI/EXEC atomic block for all quota counters.
   * IR-1: All writes in single transaction — never individual SET.
   * IR-4: Key format: quota:{tenantId}:{quotaType} — tenantId from ALS.
   */
  private async executeMultiExec(
    tenantId: string,
    quotaEntries: TierQuotaEntry[],
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    // Prepare all SET commands as a batch for atomic execution
    const commands: Record<string, unknown>[] = quotaEntries.map((entry) => ({
      key: `quota:${tenantId}:${entry.type}`,
      value: String(entry.limit),
    }));

    // Execute as atomic batch via DATABASE FABRIC
    // In production, this resolves to Redis MULTI/EXEC through the fabric provider
    const batchResult = await this.dbFabric.storeDocument(
      'xiigen-quota-counters',
      {
        tenantId,
        commands,
        batchMode: 'MULTI_EXEC',
        knowledgeScope: 'PRIVATE',
      },
      `quota-batch:${tenantId}`,
    );

    if (!batchResult.isSuccess) {
      return DataProcessResult.failure(
        'EXEC_FAILED',
        `Atomic quota write failed: ${batchResult.errorMessage}`,
      );
    }

    return DataProcessResult.success({
      tenantId,
      quotaTypesSet: commands.length,
    });
  }

  /**
   * Flush all existing quota counters for a tenant before re-materialization.
   * R2 domain_t223: "DEL all quota:{tenantId}:* keys before MULTI/EXEC sets new values."
   * Without this, tier downgrade leaves stale higher-tier counters.
   */
  private async flushQuotaCounters(tenantId: string): Promise<void> {
    await this.dbFabric.storeDocument(
      'xiigen-quota-counters',
      {
        tenantId,
        commands: [],
        batchMode: 'DEL_PREFIX',
        prefix: `quota:${tenantId}:`,
        knowledgeScope: 'PRIVATE',
      },
      `quota-flush:${tenantId}`,
    );
  }
}
