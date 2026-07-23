/**
 * FlowEvolutionTracker — T409 [GOVERNANCE].
 *
 * Tracks the evolution history of a flow across versions.
 * INSERT-ONLY — no updates or deletes to audit trail.
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

export interface EvolutionEntryResult {
  entryId: string;
  flowId: string;
  version: string;
  trackedAt: string;
}

export class FlowEvolutionTracker {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async track(
    tenantId: string,
    flowId: string,
    version: string,
    changes: Record<string, unknown>,
  ): Promise<DataProcessResult<EvolutionEntryResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');
    if (!version) return DataProcessResult.failure('MISSING_VERSION', 'version is required');

    const entryId = randomUUID();
    const trackedAt = new Date().toISOString();
    // INSERT-ONLY: governance audit trail
    const doc: Record<string, unknown> = { entryId, tenantId, flowId, version, changes, trackedAt };

    const stored = await this.db.storeDocument('flow26-evolution-history', doc, entryId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('flow.evolution.tracked', {
      entryId,
      tenantId,
      flowId,
      version,
      trackedAt,
    });

    return DataProcessResult.success({ entryId, flowId, version, trackedAt });
  }
}
