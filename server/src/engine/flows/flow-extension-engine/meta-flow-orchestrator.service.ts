/**
 * MetaFlowOrchestrator — T412 [ORCHESTRATION].
 *
 * Top-level orchestrator for the Self-Developing Meta-Flow Engine.
 * Coordinates the full pipeline: spec → validate → build → register → deploy.
 * Idempotent by (tenantId, flowId) — second call returns existing run.
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

export type MetaFlowStatus = 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface MetaFlowRunResult {
  runId: string;
  flowId: string;
  status: MetaFlowStatus;
  initiatedAt: string;
}

export class MetaFlowOrchestrator {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async orchestrate(
    tenantId: string,
    flowId: string,
    spec: Record<string, unknown>,
  ): Promise<DataProcessResult<MetaFlowRunResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');

    // Idempotency check
    const existing = await this.db.searchDocuments('flow26-meta-flow-runs', { flowId, tenantId });
    if (existing.isSuccess && existing.data!.length > 0) {
      const e = existing.data![0];
      return DataProcessResult.success({
        runId: e['runId'] as string,
        flowId: e['flowId'] as string,
        status: e['status'] as MetaFlowStatus,
        initiatedAt: e['initiatedAt'] as string,
      });
    }

    const runId = randomUUID();
    const initiatedAt = new Date().toISOString();
    const status: MetaFlowStatus = 'INITIATED';
    const doc: Record<string, unknown> = { runId, tenantId, flowId, spec, status, initiatedAt };

    const stored = await this.db.storeDocument('flow26-meta-flow-runs', doc, runId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('metaflow.orchestration.initiated', {
      runId,
      tenantId,
      flowId,
      status,
      initiatedAt,
    });

    return DataProcessResult.success({ runId, flowId, status, initiatedAt });
  }
}
