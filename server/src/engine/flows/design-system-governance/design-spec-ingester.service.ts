/**
 * DesignSpecIngester — T489 [INGESTION].
 *
 * Ingests and normalizes raw design spec documents into canonical DesignSpecDocuments.
 * Insert-only, idempotent by specId.
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

export interface DesignSpecIngestResult {
  specId: string;
  format: string;
  ingestedAt: string;
}

const SUPPORTED_FORMATS = ['figma', 'json', 'yaml', 'sketch'];

export class DesignSpecIngester {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async ingest(
    tenantId: string,
    rawSpec: Record<string, unknown>,
  ): Promise<DataProcessResult<DesignSpecIngestResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');

    const format = (rawSpec['format'] as string) ?? 'json';
    if (!SUPPORTED_FORMATS.includes(format)) {
      return DataProcessResult.failure(
        'UNSUPPORTED_FORMAT',
        `format must be one of: ${SUPPORTED_FORMATS.join(', ')}`,
      );
    }

    // Idempotency: if specId provided, check if already ingested
    const existingSpecId = rawSpec['specId'] as string | undefined;
    if (existingSpecId) {
      const existing = await this.db.searchDocuments('flow31-design-specs', {
        specId: existingSpecId,
        tenantId,
      });
      if (existing.isSuccess && existing.data!.length > 0) {
        const e = existing.data![0];
        return DataProcessResult.success({
          specId: e['specId'] as string,
          format: e['format'] as string,
          ingestedAt: e['ingestedAt'] as string,
        });
      }
    }

    const specId = existingSpecId ?? randomUUID();
    const ingestedAt = new Date().toISOString();
    const doc: Record<string, unknown> = { specId, tenantId, format, rawSpec, ingestedAt };

    const stored = await this.db.storeDocument('flow31-design-specs', doc, specId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.spec.ingested', { specId, tenantId, format, ingestedAt });

    return DataProcessResult.success({ specId, format, ingestedAt });
  }
}
