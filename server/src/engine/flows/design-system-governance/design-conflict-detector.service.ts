/**
 * DesignConflictDetector — T494 [ARBITRATION].
 *
 * Detects structural conflicts between incoming design spec and
 * existing registered design patterns. Hard stop on DESIGN_CONFLICT_DETECTED.
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

export interface DesignConflictScanResult {
  scanId: string;
  specId: string;
  conflicts: Array<{ type: string; value: string; conflictingSpecId: string }>;
  scannedAt: string;
}

export class DesignConflictDetector {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async detect(
    tenantId: string,
    specId: string,
    patternNames: string[],
  ): Promise<DataProcessResult<DesignConflictScanResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');

    // Search existing patterns for conflicts
    const existing = await this.db.searchDocuments('flow31-design-patterns', { tenantId });
    if (!existing.isSuccess)
      return DataProcessResult.failure(existing.errorCode!, existing.errorMessage!);

    const conflicts: Array<{ type: string; value: string; conflictingSpecId: string }> = [];
    for (const reg of existing.data!.filter((r) => r['specId'] !== specId)) {
      const existingPatterns = (reg['patterns'] as Array<{ name: string }>) ?? [];
      for (const existingPattern of existingPatterns) {
        if (patternNames.includes(existingPattern.name)) {
          conflicts.push({
            type: 'pattern',
            value: existingPattern.name,
            conflictingSpecId: reg['specId'] as string,
          });
        }
      }
    }

    if (conflicts.length > 0) {
      return DataProcessResult.failure(
        'DESIGN_CONFLICT_DETECTED',
        `Design conflicts found: ${conflicts.map((c) => c.value).join(', ')}`,
      );
    }

    const scanId = randomUUID();
    const scannedAt = new Date().toISOString();
    const doc: Record<string, unknown> = { scanId, tenantId, specId, conflicts, scannedAt };

    const stored = await this.db.storeDocument('flow31-conflict-scans', doc, scanId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.conflict.clear', { scanId, tenantId, specId, scannedAt });

    return DataProcessResult.success({ scanId, specId, conflicts, scannedAt });
  }
}
