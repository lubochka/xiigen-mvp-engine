/**
 * FlowSpecParser — T389 [INGESTION].
 *
 * Parses raw flow spec documents into canonical FlowSpecDocument.
 * Idempotent by specId. Insert-only.
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

export interface FlowSpecParseResult {
  specId: string;
  flowId: string;
  taskCount: number;
  parsedAt: string;
}

export class FlowSpecParser {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async parse(
    tenantId: string,
    rawSpec: Record<string, unknown>,
  ): Promise<DataProcessResult<FlowSpecParseResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');

    const flowId = rawSpec['flowId'] as string;
    const name = rawSpec['name'] as string;
    if (!flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required in spec');
    if (!name) return DataProcessResult.failure('MISSING_FLOW_NAME', 'name is required in spec');

    const specId = randomUUID();
    const taskTypes = (rawSpec['taskTypes'] as string[]) ?? [];
    const taskCount = taskTypes.length;

    // Idempotency: check existing
    const existing = await this.db.searchDocuments('flow26-spec-documents', { tenantId, flowId });
    if (!existing.isSuccess)
      return DataProcessResult.failure(existing.errorCode!, existing.errorMessage!);
    if (existing.data && existing.data.length > 0) {
      const rec = existing.data[0];
      return DataProcessResult.success({
        specId: rec['specId'] as string,
        flowId: rec['flowId'] as string,
        taskCount: rec['taskCount'] as number,
        parsedAt: rec['parsedAt'] as string,
      });
    }

    const parsedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      specId,
      tenantId,
      flowId,
      name,
      taskTypes,
      taskCount,
      parsedAt,
    };

    const stored = await this.db.storeDocument('flow26-spec-documents', doc, specId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('flow.spec.parsed', { specId, tenantId, flowId, taskCount, parsedAt });

    return DataProcessResult.success({ specId, flowId, taskCount, parsedAt });
  }
}
