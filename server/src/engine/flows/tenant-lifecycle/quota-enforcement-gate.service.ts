/**
 * QuotaEnforcementGate — T471 [GUARD].
 *
 * Hard stop if quota exceeded — QUOTA_EXCEEDED, NO bypass.
 * If within quota: stores gate-passed record then emits quota.check.passed.
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
  searchDocuments(
    index: string,
    filter: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>[]>>;
}

interface IQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

export interface QuotaCheckResult {
  withinQuota: boolean;
  currentUsage: number;
  limit: number;
}

export class QuotaEnforcementGate {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async check(
    tenantId: string,
    resourceType: string,
  ): Promise<DataProcessResult<QuotaCheckResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!resourceType)
      return DataProcessResult.failure('MISSING_RESOURCE_TYPE', 'resourceType is required');

    // Read current usage
    const usageResult = await this.db.searchDocuments('flow30-usage-metrics', {
      tenantId,
      resourceType,
    });
    if (!usageResult.isSuccess)
      return DataProcessResult.failure(usageResult.errorCode!, usageResult.errorMessage!);

    const usageDocs = usageResult.data ?? [];
    const currentUsage = usageDocs.length > 0 ? ((usageDocs[0]['currentUsage'] as number) ?? 0) : 0;

    // Read quota limit
    const quotaResult = await this.db.searchDocuments('flow30-quota-allocations', { tenantId });
    if (!quotaResult.isSuccess)
      return DataProcessResult.failure(quotaResult.errorCode!, quotaResult.errorMessage!);

    const quotaDocs = quotaResult.data ?? [];
    const limit =
      quotaDocs.length > 0
        ? ((quotaDocs[0][resourceType === 'compute' ? 'computeUnits' : 'storageGb'] as number) ?? 0)
        : 0;

    // Hard stop if exceeded — NO bypass
    if (currentUsage >= limit) {
      return DataProcessResult.failure(
        'QUOTA_EXCEEDED',
        `Quota exceeded: ${currentUsage} >= ${limit}`,
      );
    }

    // Within quota — store gate-passed record then emit
    const gateId = randomUUID();
    const checkedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      gateId,
      tenantId,
      resourceType,
      currentUsage,
      limit,
      checkedAt,
    };

    const stored = await this.db.storeDocument('flow30-quota-gate-passed', doc, gateId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('quota.check.passed', {
      gateId,
      tenantId,
      resourceType,
      currentUsage,
      limit,
      checkedAt,
    });

    return DataProcessResult.success({ withinQuota: true, currentUsage, limit });
  }
}
