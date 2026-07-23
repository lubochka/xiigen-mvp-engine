/**
 * DesignVersionTracker — T507 [GOVERNANCE].
 *
 * INSERT-ONLY version history for design system evolution. Records version,
 * changeset summary, author, timestamp. Immutable changelog.
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

export interface DesignVersionRecord {
  versionId: string;
  specId: string;
  version: string;
  trackedAt: string;
}

export class DesignVersionTracker {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async track(
    tenantId: string,
    specId: string,
    versionEntry: {
      version: string;
      changesetSummary: string;
      author?: string;
    },
  ): Promise<DataProcessResult<DesignVersionRecord>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');
    if (!versionEntry.version)
      return DataProcessResult.failure('MISSING_VERSION', 'version is required');
    if (!versionEntry.changesetSummary)
      return DataProcessResult.failure('MISSING_CHANGESET', 'changesetSummary is required');

    const versionId = randomUUID();
    const trackedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      versionId,
      tenantId,
      specId,
      ...versionEntry,
      trackedAt,
    };

    const stored = await this.db.storeDocument('flow31-design-versions', doc, versionId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.version.tracked', {
      versionId,
      tenantId,
      specId,
      version: versionEntry.version,
      trackedAt,
    });

    return DataProcessResult.success({
      versionId,
      specId,
      version: versionEntry.version,
      trackedAt,
    });
  }
}
