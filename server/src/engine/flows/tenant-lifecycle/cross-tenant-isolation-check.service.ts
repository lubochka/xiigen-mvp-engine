/**
 * CrossTenantIsolationCheck — T472 [GUARD].
 *
 * Verifies requestingTenantId matches targetTenantId.
 * On mismatch: logs violation (insert-only) then emits isolation.violation.detected → ISOLATION_VIOLATION.
 * On match: returns isolation check passed.
 *
 * DNA-8: storeDocument() BEFORE enqueue().
 * DNA-3: All methods return DataProcessResult — never throw.
 * CF-476: requestingTenantId required — UNSCOPED_QUERY on missing.
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

export interface IsolationCheckResult {
  isolated: boolean;
  requestingTenantId: string;
  targetTenantId: string;
}

export class CrossTenantIsolationCheck {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async check(
    requestingTenantId: string,
    targetTenantId: string,
    resourceId: string,
  ): Promise<DataProcessResult<IsolationCheckResult>> {
    if (!requestingTenantId)
      return DataProcessResult.failure('UNSCOPED_QUERY', 'requestingTenantId is required');
    if (!targetTenantId)
      return DataProcessResult.failure('MISSING_TARGET_TENANT', 'targetTenantId is required');
    if (!resourceId)
      return DataProcessResult.failure('MISSING_RESOURCE_ID', 'resourceId is required');

    // Mismatch → log violation then error
    if (requestingTenantId !== targetTenantId) {
      const violationId = randomUUID();
      const detectedAt = new Date().toISOString();
      const doc: Record<string, unknown> = {
        violationId,
        requestingTenantId,
        targetTenantId,
        resourceId,
        detectedAt,
      };

      const stored = await this.db.storeDocument('flow30-isolation-violations', doc, violationId);
      if (!stored.isSuccess)
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

      await this.queue.enqueue('isolation.violation.detected', {
        violationId,
        requestingTenantId,
        targetTenantId,
        resourceId,
        detectedAt,
      });

      return DataProcessResult.failure(
        'ISOLATION_VIOLATION',
        `Cross-tenant access: ${requestingTenantId} → ${targetTenantId}`,
      );
    }

    // Same tenant — pass
    return DataProcessResult.success({ isolated: true, requestingTenantId, targetTenantId });
  }
}
