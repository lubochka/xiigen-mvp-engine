/**
 * TenantOffboardingHandler — T474 [GOVERNANCE].
 *
 * Reads retention period from FREEDOM config (key: flow30_retention_days).
 * Schedules offboarding — NEVER immediate deletion.
 * Stores offboarding schedule (insert-only) then emits tenant.offboarding.scheduled.
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

export interface OffboardingResult {
  offboardingId: string;
  scheduledDeleteAt: string;
  retentionDays: number;
}

export class TenantOffboardingHandler {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
    private readonly freedom: IFreedom,
  ) {}

  async schedule(
    tenantId: string,
    requestedBy: string,
    reason?: string,
  ): Promise<DataProcessResult<OffboardingResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!requestedBy)
      return DataProcessResult.failure('MISSING_REQUESTED_BY', 'requestedBy is required');

    // Read retention period from FREEDOM config — never hardcoded
    const retentionConfig = await this.freedom.get('flow30_retention_days');
    if (!retentionConfig.isSuccess)
      return DataProcessResult.failure(retentionConfig.errorCode!, retentionConfig.errorMessage!);

    const retentionDays = (retentionConfig.data!['default_days'] as number) ?? 30;

    const offboardingId = randomUUID();
    const scheduledAt = new Date().toISOString();
    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() + retentionDays);
    const scheduledDeleteAt = deleteDate.toISOString();

    const doc: Record<string, unknown> = {
      offboardingId,
      tenantId,
      requestedBy,
      reason: reason ?? '',
      retentionDays,
      scheduledAt,
      scheduledDeleteAt,
    };

    const stored = await this.db.storeDocument('flow30-offboarding-schedules', doc, offboardingId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('tenant.offboarding.scheduled', {
      offboardingId,
      tenantId,
      scheduledDeleteAt,
      retentionDays,
    });

    return DataProcessResult.success({ offboardingId, scheduledDeleteAt, retentionDays });
  }
}
