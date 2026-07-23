/**
 * FlowTemplateResolver — T392 [INGESTION].
 *
 * Resolves code generation templates from FREEDOM config (key: flow26_template_registry).
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

interface IFreedom {
  get(key: string): Promise<DataProcessResult<Record<string, unknown>>>;
}

export interface TemplateResolutionResult {
  templateSetId: string;
  resolvedCount: number;
  resolvedAt: string;
}

export class FlowTemplateResolver {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
    private readonly freedom: IFreedom,
  ) {}

  async resolve(
    tenantId: string,
    specId: string,
    archetypes: string[],
  ): Promise<DataProcessResult<TemplateResolutionResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');
    if (!archetypes.length)
      return DataProcessResult.failure('MISSING_ARCHETYPES', 'archetypes are required');

    // Template registry from FREEDOM config — never hardcoded
    const registry = await this.freedom.get('flow26_template_registry');
    if (!registry.isSuccess)
      return DataProcessResult.failure(registry.errorCode!, registry.errorMessage!);

    const templates = registry.data as Record<string, unknown>;
    const resolved: Record<string, string> = {};

    for (const archetype of archetypes) {
      const template = (templates[archetype] ?? templates['default']) as string;
      if (template) resolved[archetype] = template;
    }

    const resolvedCount = Object.keys(resolved).length;
    const templateSetId = randomUUID();
    const resolvedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      templateSetId,
      tenantId,
      specId,
      archetypes,
      resolved,
      resolvedCount,
      resolvedAt,
    };

    const stored = await this.db.storeDocument('flow26-template-sets', doc, templateSetId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('flow.templates.resolved', {
      templateSetId,
      tenantId,
      specId,
      resolvedCount,
      resolvedAt,
    });

    return DataProcessResult.success({ templateSetId, resolvedCount, resolvedAt });
  }
}
