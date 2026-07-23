/**
 * ComponentCatalogUpdater — T506 [BUILD].
 *
 * Updates the component catalog with newly validated components.
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

export interface ComponentCatalogUpdateResult {
  catalogId: string;
  specId: string;
  componentCount: number;
  updatedAt: string;
}

export class ComponentCatalogUpdater {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async update(
    tenantId: string,
    specId: string,
    components: Array<{ name: string; requiredProps: string[] }>,
  ): Promise<DataProcessResult<ComponentCatalogUpdateResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');
    if (!components.length)
      return DataProcessResult.failure('MISSING_COMPONENTS', 'components are required');

    // Idempotency: return existing if already updated for this specId
    const existing = await this.db.searchDocuments('flow31-component-catalog', {
      tenantId,
      specId,
    });
    if (!existing.isSuccess)
      return DataProcessResult.failure(existing.errorCode!, existing.errorMessage!);
    if (existing.data!.length > 0) {
      const prev = existing.data![0];
      return DataProcessResult.success({
        catalogId: prev['catalogId'] as string,
        specId,
        componentCount: prev['componentCount'] as number,
        updatedAt: prev['updatedAt'] as string,
      });
    }

    const catalogId = randomUUID();
    const updatedAt = new Date().toISOString();
    const componentCount = components.length;
    const doc: Record<string, unknown> = {
      catalogId,
      tenantId,
      specId,
      components,
      componentCount,
      updatedAt,
    };

    const stored = await this.db.storeDocument('flow31-component-catalog', doc, catalogId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.catalog.updated', {
      catalogId,
      tenantId,
      specId,
      componentCount,
      updatedAt,
    });

    return DataProcessResult.success({ catalogId, specId, componentCount, updatedAt });
  }
}
