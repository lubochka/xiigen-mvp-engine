/**
 * DesignContextBuilder — T492 [INGESTION].
 *
 * Builds contextual metadata for design assets:
 * usage context, design system version, team ownership, accessibility annotations.
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

export interface DesignContextResult {
  contextId: string;
  specId: string;
  builtAt: string;
}

export class DesignContextBuilder {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async build(
    tenantId: string,
    specId: string,
    context: Record<string, unknown>,
  ): Promise<DataProcessResult<DesignContextResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');

    const contextId = randomUUID();
    const builtAt = new Date().toISOString();
    const doc: Record<string, unknown> = { contextId, tenantId, specId, context, builtAt };

    const stored = await this.db.storeDocument('flow31-design-contexts', doc, contextId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.context.built', { contextId, tenantId, specId, builtAt });

    return DataProcessResult.success({ contextId, specId, builtAt });
  }
}
