/**
 * ComponentMapParser — T490 [INGESTION].
 *
 * Parses component hierarchy maps from ingested design specs.
 * Extracts component trees, parent-child relationships, and props.
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

export interface ComponentMapResult {
  mapId: string;
  specId: string;
  componentCount: number;
  parsedAt: string;
}

export class ComponentMapParser {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async parse(
    tenantId: string,
    specId: string,
    components: Array<{ name: string; children?: string[]; props?: Record<string, unknown> }>,
  ): Promise<DataProcessResult<ComponentMapResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');
    if (!components.length)
      return DataProcessResult.failure('MISSING_COMPONENTS', 'components are required');

    const mapId = randomUUID();
    const componentCount = components.length;
    const parsedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      mapId,
      tenantId,
      specId,
      components,
      componentCount,
      parsedAt,
    };

    const stored = await this.db.storeDocument('flow31-component-maps', doc, mapId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.components.parsed', {
      mapId,
      tenantId,
      specId,
      componentCount,
      parsedAt,
    });

    return DataProcessResult.success({ mapId, specId, componentCount, parsedAt });
  }
}
