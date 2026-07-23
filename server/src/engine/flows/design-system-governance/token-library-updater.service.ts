/**
 * TokenLibraryUpdater — T505 [BUILD].
 *
 * Updates the token library registry with newly extracted and validated tokens.
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

export interface TokenLibraryUpdateResult {
  updateId: string;
  specId: string;
  tokenCount: number;
  updatedAt: string;
}

export class TokenLibraryUpdater {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async update(
    tenantId: string,
    specId: string,
    tokenNames: string[],
  ): Promise<DataProcessResult<TokenLibraryUpdateResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');

    // Idempotency: return existing if already updated for this specId
    const existing = await this.db.searchDocuments('flow31-token-library', { tenantId, specId });
    if (!existing.isSuccess)
      return DataProcessResult.failure(existing.errorCode!, existing.errorMessage!);
    if (existing.data!.length > 0) {
      const prev = existing.data![0];
      return DataProcessResult.success({
        updateId: prev['updateId'] as string,
        specId,
        tokenCount: prev['tokenCount'] as number,
        updatedAt: prev['updatedAt'] as string,
      });
    }

    const updateId = randomUUID();
    const updatedAt = new Date().toISOString();
    const tokenCount = tokenNames.length;
    const doc: Record<string, unknown> = {
      updateId,
      tenantId,
      specId,
      tokenNames,
      tokenCount,
      updatedAt,
    };

    const stored = await this.db.storeDocument('flow31-token-library', doc, updateId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.tokens.library.updated', {
      updateId,
      tenantId,
      specId,
      tokenCount,
      updatedAt,
    });

    return DataProcessResult.success({ updateId, specId, tokenCount, updatedAt });
  }
}
