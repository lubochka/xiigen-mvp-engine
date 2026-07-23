/**
 * DesignPatternParser — T493 [INGESTION].
 *
 * Parses and catalogs reusable design patterns
 * (layout grids, card patterns, navigation patterns) from design specs.
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

export interface DesignPatternResult {
  catalogId: string;
  specId: string;
  patternCount: number;
  parsedAt: string;
}

export class DesignPatternParser {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async parse(
    tenantId: string,
    specId: string,
    patterns: Array<{ patternId: string; name: string; category: string; components: string[] }>,
  ): Promise<DataProcessResult<DesignPatternResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');
    if (!patterns.length)
      return DataProcessResult.failure('MISSING_PATTERNS', 'patterns are required');

    const catalogId = randomUUID();
    const patternCount = patterns.length;
    const parsedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      catalogId,
      tenantId,
      specId,
      patterns,
      patternCount,
      parsedAt,
    };

    const stored = await this.db.storeDocument('flow31-design-patterns', doc, catalogId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.patterns.parsed', {
      catalogId,
      tenantId,
      specId,
      patternCount,
      parsedAt,
    });

    return DataProcessResult.success({ catalogId, specId, patternCount, parsedAt });
  }
}
