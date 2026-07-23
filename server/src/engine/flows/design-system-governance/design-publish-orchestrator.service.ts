/**
 * DesignPublishOrchestrator — T513 [ORCHESTRATION].
 *
 * Orchestrates publication of validated design system: coordinates token library
 * publish, component catalog publish, pattern library publish.
 * Idempotent by (tenantId, specId).
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

export interface DesignPublishResult {
  publishId: string;
  specId: string;
  status: 'PUBLISHED';
  publishedAt: string;
}

export class DesignPublishOrchestrator {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async publish(
    tenantId: string,
    specId: string,
    targets: Array<'token_library' | 'component_catalog' | 'pattern_library'>,
  ): Promise<DataProcessResult<DesignPublishResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');
    if (!targets.length)
      return DataProcessResult.failure('MISSING_TARGETS', 'publish targets are required');

    // Idempotency: return existing if already published for this specId
    const existing = await this.db.searchDocuments('flow31-publish-runs', { tenantId, specId });
    if (!existing.isSuccess)
      return DataProcessResult.failure(existing.errorCode!, existing.errorMessage!);
    if (existing.data!.length > 0) {
      const prev = existing.data![0];
      return DataProcessResult.success({
        publishId: prev['publishId'] as string,
        specId,
        status: 'PUBLISHED' as const,
        publishedAt: prev['publishedAt'] as string,
      });
    }

    const publishId = randomUUID();
    const publishedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      publishId,
      tenantId,
      specId,
      targets,
      status: 'PUBLISHED',
      publishedAt,
    };

    const stored = await this.db.storeDocument('flow31-publish-runs', doc, publishId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.published', { publishId, tenantId, specId, publishedAt });

    return DataProcessResult.success({ publishId, specId, status: 'PUBLISHED', publishedAt });
  }
}
