/**
 * TokenConsistencyGate — T501 [GUARD].
 *
 * Ensures all token references in components point to valid tokens in the
 * token library. TOKEN_REFERENCE_BROKEN — no bypass.
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

export interface TokenConsistencyGateResult {
  gateId: string;
  specId: string;
  checkedCount: number;
  checkedAt: string;
}

export class TokenConsistencyGate {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async check(
    tenantId: string,
    specId: string,
    tokenRefs: string[],
  ): Promise<DataProcessResult<TokenConsistencyGateResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');

    // Fetch token library to validate references
    const libraryResult = await this.db.searchDocuments('flow31-token-library', { tenantId });
    if (!libraryResult.isSuccess)
      return DataProcessResult.failure(libraryResult.errorCode!, libraryResult.errorMessage!);

    const allKnownTokens = new Set<string>();
    for (const entry of libraryResult.data!) {
      const names = (entry['tokenNames'] as string[]) ?? [];
      for (const name of names) allKnownTokens.add(name);
    }

    const broken: string[] = [];
    for (const ref of tokenRefs) {
      if (!allKnownTokens.has(ref)) {
        broken.push(ref);
      }
    }

    if (broken.length > 0) {
      return DataProcessResult.failure(
        'TOKEN_REFERENCE_BROKEN',
        `Broken token references: ${broken.join(', ')}`,
      );
    }

    const gateId = randomUUID();
    const checkedAt = new Date().toISOString();
    const checkedCount = tokenRefs.length;
    const doc: Record<string, unknown> = { gateId, tenantId, specId, checkedCount, checkedAt };

    const stored = await this.db.storeDocument('flow31-token-consistency-gates', doc, gateId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.tokens.consistent', { gateId, tenantId, specId, checkedAt });

    return DataProcessResult.success({ gateId, specId, checkedCount, checkedAt });
  }
}
