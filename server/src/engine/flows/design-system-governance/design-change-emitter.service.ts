/**
 * DesignChangeEmitter — T508 [BUILD].
 *
 * Emits structured CloudEvents for all design changes (token updates, component
 * changes, pattern changes). Fanout to downstream consumers.
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

export interface DesignChangeEmitResult {
  changeEventId: string;
  specId: string;
  changeCount: number;
  emittedAt: string;
}

export class DesignChangeEmitter {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async emit(
    tenantId: string,
    specId: string,
    changes: Array<{
      changeType: 'token_update' | 'component_change' | 'pattern_change';
      subject: string;
      summary: string;
    }>,
  ): Promise<DataProcessResult<DesignChangeEmitResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');
    if (!changes.length)
      return DataProcessResult.failure('MISSING_CHANGES', 'changes are required');

    const changeEventId = randomUUID();
    const emittedAt = new Date().toISOString();
    const changeCount = changes.length;
    const doc: Record<string, unknown> = {
      changeEventId,
      tenantId,
      specId,
      changes,
      changeCount,
      emittedAt,
    };

    const stored = await this.db.storeDocument('flow31-change-events', doc, changeEventId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.change.emitted', {
      changeEventId,
      tenantId,
      specId,
      changeCount,
      emittedAt,
    });

    return DataProcessResult.success({ changeEventId, specId, changeCount, emittedAt });
  }
}
