/**
 * TokenConflictScanner — T497 [ARBITRATION].
 *
 * Scans for token naming conflicts between incoming tokens and existing token library.
 * Hard stop on TOKEN_CONFLICT_DETECTED — no bypass.
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

export interface TokenScanResult {
  scanId: string;
  specId: string;
  scannedCount: number;
  scannedAt: string;
}

export class TokenConflictScanner {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async scan(
    tenantId: string,
    specId: string,
    tokenNames: string[],
  ): Promise<DataProcessResult<TokenScanResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');

    // Search existing token library for conflicts
    const libraryResult = await this.db.searchDocuments('flow31-token-library', { tenantId });
    if (!libraryResult.isSuccess)
      return DataProcessResult.failure(libraryResult.errorCode!, libraryResult.errorMessage!);

    const conflicts: string[] = [];
    for (const libEntry of libraryResult.data!) {
      const existingNames = (libEntry['tokenNames'] as string[]) ?? [];
      for (const name of tokenNames) {
        if (existingNames.includes(name)) {
          conflicts.push(name);
        }
      }
    }

    if (conflicts.length > 0) {
      return DataProcessResult.failure(
        'TOKEN_CONFLICT_DETECTED',
        `Token name conflicts found: ${conflicts.join(', ')}`,
      );
    }

    const scanId = randomUUID();
    const scannedAt = new Date().toISOString();
    const scannedCount = tokenNames.length;
    const doc: Record<string, unknown> = { scanId, tenantId, specId, scannedCount, scannedAt };

    const stored = await this.db.storeDocument('flow31-token-conflict-scans', doc, scanId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.tokens.clear', { scanId, tenantId, specId, scannedAt });

    return DataProcessResult.success({ scanId, specId, scannedCount, scannedAt });
  }
}
