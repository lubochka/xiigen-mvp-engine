/**
 * BfaConflictScanner — T399 [ARBITRATION].
 *
 * Scans a proposed flow's BFA registrations (entities, events, apiRoutes)
 * against all existing registered flows for conflicts.
 * Hard stop on BFA_CONFLICT_DETECTED — no bypass.
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

export interface BfaScanResult {
  scanId: string;
  flowId: string;
  conflicts: Array<{ type: string; value: string; conflictingFlow: string }>;
  scannedFlowCount: number;
  scannedAt: string;
}

export class BfaConflictScanner {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async scan(
    tenantId: string,
    flowId: string,
    bfaRegistration: { entities: string[]; events: string[]; apiRoutes: string[] },
  ): Promise<DataProcessResult<BfaScanResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');

    // Load all existing flow registrations
    const regResult = await this.db.searchDocuments('flow26-registrations', { tenantId });
    if (!regResult.isSuccess)
      return DataProcessResult.failure(regResult.errorCode!, regResult.errorMessage!);

    const existingFlows = regResult.data!.filter((r) => r['flowId'] !== flowId);
    const conflicts: Array<{ type: string; value: string; conflictingFlow: string }> = [];

    for (const flow of existingFlows) {
      const existingBfa = (flow['bfaRegistration'] ?? {}) as Record<string, unknown>;
      const existingEntities = (existingBfa['entities'] as string[]) ?? [];
      const existingEvents = (existingBfa['events'] as string[]) ?? [];
      const existingRoutes = (existingBfa['apiRoutes'] as string[]) ?? [];
      const conflictingFlowId = flow['flowId'] as string;

      for (const entity of bfaRegistration.entities) {
        if (existingEntities.includes(entity)) {
          conflicts.push({ type: 'entity', value: entity, conflictingFlow: conflictingFlowId });
        }
      }
      for (const event of bfaRegistration.events) {
        if (existingEvents.includes(event)) {
          conflicts.push({ type: 'event', value: event, conflictingFlow: conflictingFlowId });
        }
      }
      for (const route of bfaRegistration.apiRoutes) {
        if (existingRoutes.includes(route)) {
          conflicts.push({ type: 'apiRoute', value: route, conflictingFlow: conflictingFlowId });
        }
      }
    }

    if (conflicts.length > 0) {
      return DataProcessResult.failure(
        'BFA_CONFLICT_DETECTED',
        `BFA conflicts found: ${conflicts.map((c) => `${c.type}:${c.value}`).join(', ')}`,
      );
    }

    const scanId = randomUUID();
    const scannedAt = new Date().toISOString();
    const scannedFlowCount = existingFlows.length;
    const doc: Record<string, unknown> = {
      scanId,
      tenantId,
      flowId,
      conflicts,
      scannedFlowCount,
      scannedAt,
    };

    const stored = await this.db.storeDocument('flow26-bfa-scans', doc, scanId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('flow.bfa.scanned', {
      scanId,
      tenantId,
      flowId,
      scannedFlowCount,
      scannedAt,
    });

    return DataProcessResult.success({ scanId, flowId, conflicts, scannedFlowCount, scannedAt });
  }
}
