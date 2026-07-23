/**
 * ContractCodeEmitter — T396 [BUILD].
 *
 * Emits EngineContract TypeScript file using correct bfaRegistration/machineComponents/freedomComponents shape.
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

export interface ContractEmitResult {
  artifactId: string;
  contractCount: number;
  emittedAt: string;
}

export class ContractCodeEmitter {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async emit(
    tenantId: string,
    flowId: string,
    taskTypes: Array<{
      taskTypeId: string;
      name: string;
      archetype: string;
      bfaRegistration: { entities: string[]; events: string[]; apiRoutes: string[] };
      machineComponents: string[];
      freedomComponents: string[];
    }>,
  ): Promise<DataProcessResult<ContractEmitResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');
    if (!taskTypes.length)
      return DataProcessResult.failure('MISSING_TASK_TYPES', 'taskTypes are required');

    // Validate correct contract shape — bfaRegistration/machineComponents/freedomComponents
    for (const tt of taskTypes) {
      if (!tt.bfaRegistration || !tt.machineComponents || !tt.freedomComponents) {
        return DataProcessResult.failure(
          'INVALID_CONTRACT_SHAPE',
          `Contract for ${tt.taskTypeId} must use bfaRegistration/machineComponents/freedomComponents`,
        );
      }
    }

    const artifactId = randomUUID();
    const contractCount = taskTypes.length;
    const emittedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      artifactId,
      tenantId,
      flowId,
      taskTypes,
      contractCount,
      emittedAt,
    };

    const stored = await this.db.storeDocument('flow26-contract-artifacts', doc, artifactId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('flow.contract.emitted', {
      artifactId,
      tenantId,
      flowId,
      contractCount,
      emittedAt,
    });

    return DataProcessResult.success({ artifactId, contractCount, emittedAt });
  }
}
