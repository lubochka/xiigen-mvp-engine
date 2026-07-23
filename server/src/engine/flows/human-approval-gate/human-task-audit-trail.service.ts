/**
 * HumanTaskAuditTrail — T421 [GOVERNANCE].
 *
 * Insert-only immutable audit trail for all human task events.
 * Records are never updated or deleted — append-only by design.
 *
 * DNA-8: storeDocument() BEFORE enqueue().
 * DNA-3: All methods return DataProcessResult — never throw.
 * CF-476: tenantId required — UNSCOPED_QUERY on missing.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';

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

export interface AuditRecordResult {
  auditId: string;
  recordedAt: string;
  eventType: string;
}

export class HumanTaskAuditTrail {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async record(
    tenantId: string,
    eventType: string,
    entityId: string,
    actorId: string,
    details: Record<string, unknown> = {},
  ): Promise<DataProcessResult<AuditRecordResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!eventType) return DataProcessResult.failure('MISSING_EVENT_TYPE', 'eventType is required');
    if (!entityId) return DataProcessResult.failure('MISSING_ENTITY_ID', 'entityId is required');
    if (!actorId) return DataProcessResult.failure('MISSING_ACTOR_ID', 'actorId is required');

    const auditId = `audit-${tenantId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const recordedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      audit_id: auditId,
      tenant_id: tenantId,
      event_type: eventType,
      entity_id: entityId,
      actor_id: actorId,
      details,
      recorded_at: recordedAt,
    };

    // DNA-8: store BEFORE enqueue — insert-only, never update
    const storeResult = await this.db.storeDocument('flow27-audit-trail', doc, auditId);
    if (!storeResult.isSuccess)
      return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);

    await this.queue.enqueue('audit.event.recorded', {
      auditId,
      tenantId,
      eventType,
      entityId,
      actorId,
      recordedAt,
    });

    return DataProcessResult.success({
      auditId,
      recordedAt,
      eventType,
    });
  }
}
