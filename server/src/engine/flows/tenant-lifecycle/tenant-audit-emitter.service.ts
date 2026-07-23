/**
 * TenantAuditEmitter — T473 [GOVERNANCE].
 *
 * INSERT-ONLY audit records — never update, never delete.
 * Stores audit record then emits audit.event.recorded.
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

export interface AuditEmitResult {
  auditId: string;
  recordedAt: string;
  eventType: string;
}

export class TenantAuditEmitter {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async record(
    tenantId: string,
    eventType: string,
    entityId: string,
    actorId: string,
    details?: Record<string, unknown>,
  ): Promise<DataProcessResult<AuditEmitResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!eventType) return DataProcessResult.failure('MISSING_EVENT_TYPE', 'eventType is required');
    if (!entityId) return DataProcessResult.failure('MISSING_ENTITY_ID', 'entityId is required');
    if (!actorId) return DataProcessResult.failure('MISSING_ACTOR_ID', 'actorId is required');

    const auditId = randomUUID();
    const recordedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      auditId,
      tenantId,
      eventType,
      entityId,
      actorId,
      recordedAt,
      ...(details ?? {}),
    };

    const stored = await this.db.storeDocument('flow30-audit-records', doc, auditId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('audit.event.recorded', {
      auditId,
      tenantId,
      eventType,
      entityId,
      actorId,
      recordedAt,
    });

    return DataProcessResult.success({ auditId, recordedAt, eventType });
  }
}
