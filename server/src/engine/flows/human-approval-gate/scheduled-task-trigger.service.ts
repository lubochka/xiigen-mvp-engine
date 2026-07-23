/**
 * ScheduledTaskTrigger — T418 [BUILD].
 *
 * Schedules an async task trigger. Idempotent by (taskId, triggerAt)
 * compound key — duplicate returns existing without re-storing.
 *
 * DNA-8: storeDocument() BEFORE enqueue().
 * DNA-3: All methods return DataProcessResult — never throw.
 * CF-476: tenantId required — UNSCOPED_QUERY on missing.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';

interface IDb {
  searchDocuments(
    index: string,
    filter: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>[]>>;
  storeDocument(
    index: string,
    doc: Record<string, unknown>,
    id?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

interface IQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

export interface ScheduledTriggerResult {
  triggerId: string;
  taskId: string;
  triggerAt: string;
  duplicate: boolean;
}

export class ScheduledTaskTrigger {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async schedule(
    tenantId: string,
    taskId: string,
    triggerAt: string,
    payload: Record<string, unknown> = {},
  ): Promise<DataProcessResult<ScheduledTriggerResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!taskId) return DataProcessResult.failure('MISSING_TASK_ID', 'taskId is required');
    if (!triggerAt) return DataProcessResult.failure('MISSING_TRIGGER_AT', 'triggerAt is required');

    // Idempotency check by (taskId, triggerAt) compound key
    const existingResult = await this.db.searchDocuments('flow27-scheduled-triggers', {
      tenant_id: tenantId,
      task_id: taskId,
      trigger_at: triggerAt,
    });
    if (existingResult.isSuccess && existingResult.data && existingResult.data.length > 0) {
      const existing = existingResult.data[0];
      return DataProcessResult.success({
        triggerId: existing['trigger_id'] as string,
        taskId,
        triggerAt,
        duplicate: true,
      });
    }

    const triggerId = `st-${tenantId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const doc: Record<string, unknown> = {
      trigger_id: triggerId,
      tenant_id: tenantId,
      task_id: taskId,
      trigger_at: triggerAt,
      payload,
    };

    // DNA-8: store BEFORE enqueue
    const storeResult = await this.db.storeDocument('flow27-scheduled-triggers', doc, triggerId);
    if (!storeResult.isSuccess)
      return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);

    await this.queue.enqueue('task.trigger.scheduled', {
      triggerId,
      tenantId,
      taskId,
      triggerAt,
    });

    return DataProcessResult.success({
      triggerId,
      taskId,
      triggerAt,
      duplicate: false,
    });
  }
}
