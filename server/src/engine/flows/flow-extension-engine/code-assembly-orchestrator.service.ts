/**
 * CodeAssemblyOrchestrator — T397 [ORCHESTRATION].
 *
 * Assembles all code artifacts into a complete deployable set.
 * Idempotent by flowId.
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

export interface CodeAssemblyResult {
  assemblyId: string;
  status: 'QUEUED';
  flowId: string;
  assembledAt: string;
}

export class CodeAssemblyOrchestrator {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async assemble(
    tenantId: string,
    flowId: string,
    artifactIds: Record<string, string>,
  ): Promise<DataProcessResult<CodeAssemblyResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');

    // Idempotency by flowId
    const existing = await this.db.searchDocuments('flow26-code-assemblies', { tenantId, flowId });
    if (!existing.isSuccess)
      return DataProcessResult.failure(existing.errorCode!, existing.errorMessage!);
    if (existing.data && existing.data.length > 0) {
      const rec = existing.data[0];
      return DataProcessResult.success({
        assemblyId: rec['assemblyId'] as string,
        status: 'QUEUED' as const,
        flowId: rec['flowId'] as string,
        assembledAt: rec['assembledAt'] as string,
      });
    }

    const assemblyId = randomUUID();
    const assembledAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      assemblyId,
      tenantId,
      flowId,
      artifactIds,
      status: 'QUEUED',
      assembledAt,
    };

    const stored = await this.db.storeDocument('flow26-code-assemblies', doc, assemblyId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('flow.code.assembled', { assemblyId, tenantId, flowId, assembledAt });

    return DataProcessResult.success({
      assemblyId,
      status: 'QUEUED' as const,
      flowId,
      assembledAt,
    });
  }
}
