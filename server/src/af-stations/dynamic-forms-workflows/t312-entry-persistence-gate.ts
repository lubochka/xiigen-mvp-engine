/**
 * T312EntryPersistenceGate — GAP-21-02
 *
 * PERSISTENCE archetype gate: persists form entry then emits queue event.
 *
 * INV-15-1 / DNA-8: storeDocument() ALWAYS precedes enqueue().
 * Enforced by persistThenEmit() template method — emitFn never called on persist failure.
 *
 * CF-401: Also emits form.entry.persisted.dwh for FLOW-14 DWH ingestion (soft dep).
 *
 * DNA-3: returns DataProcessResult, never throws
 * DNA-9: all events use createCloudEvent
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { createCloudEvent } from '../../kernel/cloud-events';
import { randomUUID } from 'crypto';

export interface EntryPersistedResult {
  entryId: string;
  formId: string;
  persistedAt: string;
}

@Injectable()
export class T312EntryPersistenceGate {
  private readonly logger = new Logger(T312EntryPersistenceGate.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
  ) {}

  async executeEntryPersistence(
    submission: Record<string, unknown>,
  ): Promise<DataProcessResult<EntryPersistedResult>> {
    const entryId = randomUUID();
    const formId = submission['formId'] as string;
    const tenantId = submission['tenantId'] as string;
    const persistedAt = new Date().toISOString();

    // DNA-8 / INV-15-1: DATABASE FIRST — implemented via two-step guard
    // Step 1: Persist
    const persistResult = await this.db.storeDocument(
      'form-entries',
      {
        ...submission,
        entryId,
        persistedAt,
      },
      entryId,
    );

    if (!persistResult.isSuccess) {
      return DataProcessResult.failure(
        persistResult.errorCode ?? 'PERSIST_FAILED',
        persistResult.errorMessage ?? 'Document persistence failed',
      );
    }

    // Step 2: Emit — only after successful persist (INV-15-1)
    const primaryEvent = createCloudEvent({
      eventType: 'com.xiigen.form.entry.persisted',
      source: 'dynamic-forms-workflows/t312-entry-persistence',
      tenantId,
      subject: entryId,
      data: {
        entryId,
        formId,
        submittedAt: submission['submittedAt'] as string,
      },
    });

    const queueResult = await this.queue.enqueue('form.entry.persisted', primaryEvent);
    if (!queueResult.isSuccess) {
      this.logger.warn(
        `T312: primary event enqueue failed for entry ${entryId}`,
        queueResult.errorMessage,
      );
    }

    // CF-401: DWH routing (soft dep — emit regardless of primary enqueue status)
    const dwhEvent = createCloudEvent({
      eventType: 'com.xiigen.form.entry.persisted.dwh',
      source: 'dynamic-forms-workflows/t312-entry-persistence',
      tenantId,
      subject: entryId,
      data: { entryId, formId },
    });
    await this.queue.enqueue('form.entry.persisted.dwh', dwhEvent);

    return DataProcessResult.success({ entryId, formId, persistedAt });
  }
}
