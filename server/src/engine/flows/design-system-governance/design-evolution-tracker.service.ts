/**
 * DesignEvolutionTracker — T512 [GOVERNANCE].
 *
 * INSERT-ONLY: tracks strategic design system evolution milestones —
 * architectural shifts, technology migrations, paradigm changes.
 * Immutable evolution history.
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

export interface DesignEvolutionRecord {
  evolutionId: string;
  specId: string;
  milestone: string;
  trackedAt: string;
}

export class DesignEvolutionTracker {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async track(
    tenantId: string,
    specId: string,
    evolution: {
      milestone: string;
      category:
        | 'architectural_shift'
        | 'technology_migration'
        | 'paradigm_change'
        | 'major_version';
      description: string;
    },
  ): Promise<DataProcessResult<DesignEvolutionRecord>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');
    if (!evolution.milestone)
      return DataProcessResult.failure('MISSING_MILESTONE', 'milestone is required');

    const evolutionId = randomUUID();
    const trackedAt = new Date().toISOString();
    const doc: Record<string, unknown> = { evolutionId, tenantId, specId, ...evolution, trackedAt };

    const stored = await this.db.storeDocument('flow31-design-evolutions', doc, evolutionId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.evolution.tracked', {
      evolutionId,
      tenantId,
      specId,
      milestone: evolution.milestone,
      trackedAt,
    });

    return DataProcessResult.success({
      evolutionId,
      specId,
      milestone: evolution.milestone,
      trackedAt,
    });
  }
}
