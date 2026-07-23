/**
 * TaskDelegationOrchestrator — T422 [ORCHESTRATION].
 *
 * Manages task delegation and reassignment.
 * Insert-only delegation history — never mutate prior records.
 * Detects circular delegation (A→B→A) and returns CIRCULAR_DELEGATION error.
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

export interface DelegationResult {
  delegationId: string;
  delegatedAt: string;
  fromAssignee: string;
  toAssignee: string;
  taskId: string;
}

export class TaskDelegationOrchestrator {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async delegate(
    tenantId: string,
    taskId: string,
    fromAssignee: string,
    toAssignee: string,
    reason: string = '',
  ): Promise<DataProcessResult<DelegationResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!taskId) return DataProcessResult.failure('MISSING_TASK_ID', 'taskId is required');
    if (!fromAssignee)
      return DataProcessResult.failure('MISSING_FROM_ASSIGNEE', 'fromAssignee is required');
    if (!toAssignee)
      return DataProcessResult.failure('MISSING_TO_ASSIGNEE', 'toAssignee is required');

    // Detect circular delegation: check if toAssignee has already delegated to fromAssignee
    const circularCheck = await this.db.searchDocuments('flow27-delegations', {
      tenant_id: tenantId,
      task_id: taskId,
      from_assignee: toAssignee,
      to_assignee: fromAssignee,
    });
    if (circularCheck.isSuccess && circularCheck.data && circularCheck.data.length > 0) {
      return DataProcessResult.failure(
        'CIRCULAR_DELEGATION',
        `Circular delegation detected: ${toAssignee} already delegated to ${fromAssignee}`,
      );
    }

    const delegationId = `del-${tenantId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const delegatedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      delegation_id: delegationId,
      tenant_id: tenantId,
      task_id: taskId,
      from_assignee: fromAssignee,
      to_assignee: toAssignee,
      reason,
      delegated_at: delegatedAt,
    };

    // DNA-8: store BEFORE enqueue — insert-only
    const storeResult = await this.db.storeDocument('flow27-delegations', doc, delegationId);
    if (!storeResult.isSuccess)
      return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);

    await this.queue.enqueue('task.delegated', {
      delegationId,
      tenantId,
      taskId,
      fromAssignee,
      toAssignee,
      delegatedAt,
    });

    return DataProcessResult.success({
      delegationId,
      delegatedAt,
      fromAssignee,
      toAssignee,
      taskId,
    });
  }
}
