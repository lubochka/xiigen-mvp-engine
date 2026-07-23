/**
 * TaskTypeRegistrar — T404 [BUILD].
 *
 * Registers new task types into the engine's TaskTypeRegistry.
 * Validates required fields before storing.
 * Idempotent by taskTypeId — second call returns existing without re-storing.
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
  searchDocuments(
    index: string,
    filter: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>[]>>;
}

interface IQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

export interface TaskTypeRegistrationResult {
  registrationId: string;
  taskTypeId: string;
  registeredAt: string;
}

export class TaskTypeRegistrar {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async register(
    tenantId: string,
    taskTypeId: string,
    taskTypeDef: Record<string, unknown>,
  ): Promise<DataProcessResult<TaskTypeRegistrationResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!taskTypeId)
      return DataProcessResult.failure('MISSING_TASK_TYPE_ID', 'taskTypeId is required');

    // Validate required fields
    if (!taskTypeDef['name'] || !taskTypeDef['archetype']) {
      return DataProcessResult.failure(
        'INVALID_TASK_TYPE_DEF',
        'taskTypeDef must include name and archetype',
      );
    }

    // Idempotency check
    const existing = await this.db.searchDocuments('flow26-task-type-registry', {
      taskTypeId,
      tenantId,
    });
    if (existing.isSuccess && existing.data!.length > 0) {
      const e = existing.data![0];
      return DataProcessResult.success({
        registrationId: e['registrationId'] as string,
        taskTypeId: e['taskTypeId'] as string,
        registeredAt: e['registeredAt'] as string,
      });
    }

    const registrationId = randomUUID();
    const registeredAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      registrationId,
      tenantId,
      taskTypeId,
      taskTypeDef,
      registeredAt,
    };

    const stored = await this.db.storeDocument('flow26-task-type-registry', doc, registrationId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('flow.tasktype.registered', {
      registrationId,
      tenantId,
      taskTypeId,
      registeredAt,
    });

    return DataProcessResult.success({ registrationId, taskTypeId, registeredAt });
  }
}
