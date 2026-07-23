/**
 * HumanTaskAssigner — T416 [ORCHESTRATION].
 *
 * Assigns a task to a user or group with deadline and priority.
 * Insert-only — assignment records are never mutated.
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

export interface TaskAssignmentResult {
  assignmentId: string;
  assignedAt: string;
  assigneeId: string;
  taskId: string;
  deadline: string;
  priority: string;
}

export class HumanTaskAssigner {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async assignTask(
    tenantId: string,
    taskId: string,
    assigneeId: string,
    deadline: string,
    priority: string,
  ): Promise<DataProcessResult<TaskAssignmentResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!taskId) return DataProcessResult.failure('MISSING_TASK_ID', 'taskId is required');
    if (!assigneeId)
      return DataProcessResult.failure('MISSING_ASSIGNEE_ID', 'assigneeId is required');
    if (!deadline) return DataProcessResult.failure('MISSING_DEADLINE', 'deadline is required');
    if (!priority) return DataProcessResult.failure('MISSING_PRIORITY', 'priority is required');

    const assignmentId = `ta-${tenantId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const assignedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      assignment_id: assignmentId,
      tenant_id: tenantId,
      task_id: taskId,
      assignee_id: assigneeId,
      deadline,
      priority,
      assigned_at: assignedAt,
    };

    // DNA-8: store BEFORE enqueue — insert-only
    const storeResult = await this.db.storeDocument('flow27-task-assignments', doc, assignmentId);
    if (!storeResult.isSuccess)
      return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);

    await this.queue.enqueue('task.assigned', {
      assignmentId,
      tenantId,
      taskId,
      assigneeId,
      assignedAt,
    });

    return DataProcessResult.success({
      assignmentId,
      assignedAt,
      assigneeId,
      taskId,
      deadline,
      priority,
    });
  }
}
