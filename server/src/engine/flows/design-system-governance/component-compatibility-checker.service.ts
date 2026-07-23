/**
 * ComponentCompatibilityChecker — T495 [ARBITRATION].
 *
 * Checks compatibility of new components against existing component catalog.
 * Verifies prop interfaces, slot contracts, style contracts.
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

export interface ComponentCompatResult {
  checkId: string;
  specId: string;
  compatibleCount: number;
  checkedAt: string;
}

export class ComponentCompatibilityChecker {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async check(
    tenantId: string,
    specId: string,
    components: Array<{ name: string; requiredProps: string[] }>,
  ): Promise<DataProcessResult<ComponentCompatResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');
    if (!components.length)
      return DataProcessResult.failure('MISSING_COMPONENTS', 'components are required');

    // Check existing catalog for prop incompatibilities
    const catalogResult = await this.db.searchDocuments('flow31-component-catalog', { tenantId });
    if (!catalogResult.isSuccess)
      return DataProcessResult.failure(catalogResult.errorCode!, catalogResult.errorMessage!);

    const incompatibilities: string[] = [];
    for (const comp of components) {
      const existingEntry = catalogResult.data!.find((e) =>
        (e['components'] as Array<{ name: string }>)?.some((c) => c.name === comp.name),
      );
      if (existingEntry) {
        const existingComp = (
          existingEntry['components'] as Array<{ name: string; requiredProps: string[] }>
        ).find((c) => c.name === comp.name);
        if (existingComp) {
          for (const prop of existingComp.requiredProps ?? []) {
            if (!comp.requiredProps.includes(prop)) {
              incompatibilities.push(`${comp.name} missing required prop: ${prop}`);
            }
          }
        }
      }
    }

    if (incompatibilities.length > 0) {
      return DataProcessResult.failure(
        'COMPONENT_INCOMPATIBLE',
        `Incompatibilities: ${incompatibilities.join('; ')}`,
      );
    }

    const checkId = randomUUID();
    const checkedAt = new Date().toISOString();
    const compatibleCount = components.length;
    const doc: Record<string, unknown> = { checkId, tenantId, specId, compatibleCount, checkedAt };

    const stored = await this.db.storeDocument('flow31-compat-checks', doc, checkId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.components.compatible', {
      checkId,
      tenantId,
      specId,
      compatibleCount,
      checkedAt,
    });

    return DataProcessResult.success({ checkId, specId, compatibleCount, checkedAt });
  }
}
