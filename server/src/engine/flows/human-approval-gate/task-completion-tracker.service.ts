/**
 * TaskCompletionTracker — T417 [LEARNING].
 *
 * Tracks task completion metrics via queue — ASYNC ONLY.
 * SCORE-0: Never called on live request path. Queue consumer only.
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

export interface TaskCompletionResult {
  trackingId: string;
  taskId: string;
  recordedAt: string;
}

export class TaskCompletionTracker {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async trackCompletion(
    tenantId: string,
    taskId: string,
    completedBy: string,
    completionStatus: string,
    durationMinutes: number,
  ): Promise<DataProcessResult<TaskCompletionResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!taskId) return DataProcessResult.failure('MISSING_TASK_ID', 'taskId is required');
    if (!completedBy)
      return DataProcessResult.failure('MISSING_COMPLETED_BY', 'completedBy is required');
    if (!completionStatus)
      return DataProcessResult.failure('MISSING_COMPLETION_STATUS', 'completionStatus is required');

    const trackingId = `tc-${tenantId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const recordedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      tracking_id: trackingId,
      tenant_id: tenantId,
      task_id: taskId,
      completed_by: completedBy,
      completion_status: completionStatus,
      duration_minutes: durationMinutes,
      recorded_at: recordedAt,
    };

    // DNA-8: store BEFORE enqueue
    const storeResult = await this.db.storeDocument('flow27-task-completions', doc, trackingId);
    if (!storeResult.isSuccess)
      return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);

    await this.queue.enqueue('task.completed', {
      trackingId,
      tenantId,
      taskId,
      completionStatus,
      recordedAt,
    });

    return DataProcessResult.success({
      trackingId,
      taskId,
      recordedAt,
    });
  }
}
