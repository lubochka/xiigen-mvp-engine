/**
 * DomainGraphIndexRebuild — T465 BUILD service for FLOW-29.
 *
 * Async index rebuild with live query continuity.
 * Live queries continue using previous index during rebuild.
 * NEVER rebuilds in-place — always creates new index, swaps pointer when complete.
 * Rebuild failure MUST leave previous index intact.
 *
 * Iron rules:
 *   ASYNC:        rebuild triggered via queue — return QUEUED immediately
 *   DUAL_INDEX:   build new index alongside old — never in-place
 *   CF-476:       tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:        All methods return DataProcessResult<T> — never throw
 *   DNA-8:        storeDocument() BEFORE enqueue()
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface RebuildJobResult {
  readonly jobId: string;
  readonly status: 'QUEUED';
  readonly tenantId: string;
  readonly domainId: string;
  readonly previousIndex: string;
  readonly newIndexVersion: string;
  readonly queuedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const JOBS_INDEX = 'flow29-index-rebuild-jobs';
const REBUILD_EVENT = 'domain.graph.index.rebuild.triggered';

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class DomainGraphIndexRebuild {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  /**
   * Queue an async index rebuild job.
   *
   * Returns QUEUED immediately — live queries continue on previous index.
   * New index built alongside old (dual-index pattern).
   * DNA-8: storeDocument() BEFORE enqueue().
   */
  async rebuild(
    tenantId: string,
    domainId: string,
    indexVersion: string,
  ): Promise<DataProcessResult<RebuildJobResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!domainId || domainId.trim() === '') {
      return DataProcessResult.failure('MISSING_DOMAIN_ID', 'domainId is required');
    }
    if (!indexVersion || indexVersion.trim() === '') {
      return DataProcessResult.failure('MISSING_INDEX_VERSION', 'indexVersion is required');
    }

    // Read current active index to preserve it
    const activeResult = await this.db.searchDocuments('flow29-domain-indexes', {
      tenant_id: tenantId,
      domain_id: domainId,
      active: true,
    });
    const activeDoc = activeResult.isSuccess ? (activeResult.data ?? [])[0] : null;
    const previousIndex = String(activeDoc?.['index_version'] ?? 'none');
    const newIndexVersion = `${indexVersion}-${Date.now()}`;

    const jobId = `dgir-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const queuedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      job_id: jobId,
      tenant_id: tenantId,
      domain_id: domainId,
      previous_index: previousIndex,
      new_index_version: newIndexVersion,
      status: 'QUEUED',
      queued_at: queuedAt,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.db.storeDocument(JOBS_INDEX, doc, jobId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store rebuild job',
      );
    }

    await this.queue.enqueue(REBUILD_EVENT, {
      job_id: jobId,
      tenant_id: tenantId,
      domain_id: domainId,
      previous_index: previousIndex,
      new_index_version: newIndexVersion,
      queued_at: queuedAt,
    });

    return DataProcessResult.success({
      jobId,
      status: 'QUEUED',
      tenantId,
      domainId,
      previousIndex,
      newIndexVersion,
      queuedAt,
    });
  }
}
