/**
 * FlowDependencyMapper — T391 [INGESTION].
 *
 * Maps inter-flow dependencies by checking BFA entity/event/route overlaps.
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

export interface FlowDependencyMapResult {
  mapId: string;
  dependentFlows: string[];
  conflictSurface: string[];
  mappedAt: string;
}

export class FlowDependencyMapper {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async map(
    tenantId: string,
    specId: string,
    entities: string[],
    events: string[],
    routes: string[],
  ): Promise<DataProcessResult<FlowDependencyMapResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');

    // Query existing flow registrations for overlap
    const existingFlows = await this.db.searchDocuments('flow26-registrations', { tenantId });
    if (!existingFlows.isSuccess)
      return DataProcessResult.failure(existingFlows.errorCode!, existingFlows.errorMessage!);

    const dependentFlows: string[] = [];
    const conflictSurface: string[] = [];

    for (const flow of existingFlows.data ?? []) {
      const flowEntities = (flow['entities'] as string[]) ?? [];
      const flowEvents = (flow['events'] as string[]) ?? [];
      const flowRoutes = (flow['routes'] as string[]) ?? [];

      const entityOverlap = entities.filter((e) => flowEntities.includes(e));
      const eventOverlap = events.filter((e) => flowEvents.includes(e));
      const routeOverlap = routes.filter((r) => flowRoutes.includes(r));

      if (entityOverlap.length > 0 || eventOverlap.length > 0 || routeOverlap.length > 0) {
        dependentFlows.push(flow['flowId'] as string);
        conflictSurface.push(...entityOverlap, ...eventOverlap, ...routeOverlap);
      }
    }

    const mapId = randomUUID();
    const mappedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      mapId,
      tenantId,
      specId,
      dependentFlows,
      conflictSurface,
      entities,
      events,
      routes,
      mappedAt,
    };

    const stored = await this.db.storeDocument('flow26-dependency-maps', doc, mapId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('flow.dependencies.mapped', {
      mapId,
      tenantId,
      specId,
      dependentFlows: dependentFlows.length,
      mappedAt,
    });

    return DataProcessResult.success({ mapId, dependentFlows, conflictSurface, mappedAt });
  }
}
