/**
 * TenantProvisionOrchestrator — T468 [ORCHESTRATION].
 *
 * Idempotent by tenantId. Stores provision record then emits tenant.provisioned.
 * Returns QUEUED immediately — never blocks for downstream steps.
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

export interface TenantProvisionResult {
  provisionId: string;
  status: 'QUEUED';
  tenantId: string;
  provisionedAt: string;
}

export class TenantProvisionOrchestrator {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async provision(
    tenantId: string,
    planId: string,
    metadata?: Record<string, unknown>,
  ): Promise<DataProcessResult<TenantProvisionResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!planId) return DataProcessResult.failure('MISSING_PLAN_ID', 'planId is required');

    // Idempotency: check existing provision
    const existing = await this.db.searchDocuments('flow30-tenant-provisions', { tenantId });
    if (!existing.isSuccess)
      return DataProcessResult.failure(existing.errorCode!, existing.errorMessage!);
    if (existing.data && existing.data.length > 0) {
      const rec = existing.data[0];
      return DataProcessResult.success({
        provisionId: rec['provisionId'] as string,
        status: 'QUEUED' as const,
        tenantId: rec['tenantId'] as string,
        provisionedAt: rec['provisionedAt'] as string,
      });
    }

    const provisionId = randomUUID();
    const provisionedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      provisionId,
      tenantId,
      planId,
      status: 'QUEUED',
      provisionedAt,
      ...(metadata ?? {}),
    };

    const stored = await this.db.storeDocument('flow30-tenant-provisions', doc, provisionId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('tenant.provisioned', {
      provisionId,
      tenantId,
      planId,
      provisionedAt,
    });

    return DataProcessResult.success({
      provisionId,
      status: 'QUEUED' as const,
      tenantId,
      provisionedAt,
    });
  }
}
