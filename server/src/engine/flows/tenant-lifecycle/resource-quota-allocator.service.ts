/**
 * ResourceQuotaAllocator — T469 [BUILD].
 *
 * Reads quota tiers from FREEDOM config (key: flow30_quota_tiers).
 * Allocates compute and storage quotas. Stores quota doc then emits quota.allocated.
 *
 * DNA-8: storeDocument() BEFORE enqueue().
 * DNA-3: All methods return DataProcessResult — never throw.
 * CF-476: tenantId required — UNSCOPED_QUERY on missing.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { randomUUID } from 'crypto';

interface IDb {
  storeDocument(
    index: string,
    doc: Record<string, unknown>,
    id?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

interface IQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

interface IFreedom {
  get(key: string): Promise<DataProcessResult<Record<string, unknown>>>;
}

export interface QuotaAllocationResult {
  quotaId: string;
  computeUnits: number;
  storageGb: number;
  allocatedAt: string;
}

export class ResourceQuotaAllocator {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
    private readonly freedom: IFreedom,
  ) {}

  async allocate(
    tenantId: string,
    planId: string,
  ): Promise<DataProcessResult<QuotaAllocationResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!planId) return DataProcessResult.failure('MISSING_PLAN_ID', 'planId is required');

    // Read quota tiers from FREEDOM config
    const tierConfig = await this.freedom.get('flow30_quota_tiers');
    if (!tierConfig.isSuccess)
      return DataProcessResult.failure(tierConfig.errorCode!, tierConfig.errorMessage!);

    const tiers = tierConfig.data as Record<string, unknown>;
    const planTier = (tiers[planId] ?? tiers['default'] ?? {}) as Record<string, unknown>;
    const computeUnits = (planTier['computeUnits'] as number) ?? 10;
    const storageGb = (planTier['storageGb'] as number) ?? 5;

    const quotaId = randomUUID();
    const allocatedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      quotaId,
      tenantId,
      planId,
      computeUnits,
      storageGb,
      allocatedAt,
    };

    const stored = await this.db.storeDocument('flow30-quota-allocations', doc, quotaId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('quota.allocated', {
      quotaId,
      tenantId,
      planId,
      computeUnits,
      storageGb,
      allocatedAt,
    });

    return DataProcessResult.success({ quotaId, computeUnits, storageGb, allocatedAt });
  }
}
