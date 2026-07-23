/**
 * CommunitySummaryGenerator — T464 BUILD service for FLOW-29.
 *
 * Async community summary generation via IAiProvider.
 * Returns QUEUED immediately — never blocks caller.
 * Empty community (zero members) → store empty summary, emit event, return success.
 *
 * Iron rules:
 *   ASYNC:   generation triggered via queue — return QUEUED immediately
 *   CF-476:  tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:   All methods return DataProcessResult<T> — never throw
 *   DNA-8:   storeDocument() BEFORE enqueue()
 *   AI:      use IAiProvider — never import model SDK
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface SummaryJobResult {
  readonly jobId: string;
  readonly status: 'QUEUED';
  readonly tenantId: string;
  readonly communityId: string;
  readonly memberCount: number;
  readonly queuedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const JOBS_INDEX = 'flow29-summary-jobs';
const SUMMARY_EVENT = 'community.summary.generate.triggered';

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class CommunitySummaryGenerator {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  /**
   * Queue a community summary generation job.
   *
   * Returns QUEUED immediately — never processes inline.
   * Empty community → store empty job, emit event, return success.
   * DNA-8: storeDocument() BEFORE enqueue().
   */
  async generateSummary(
    tenantId: string,
    communityId: string,
    memberNodes: string[],
  ): Promise<DataProcessResult<SummaryJobResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!communityId || communityId.trim() === '') {
      return DataProcessResult.failure('MISSING_COMMUNITY_ID', 'communityId is required');
    }

    const jobId = `csg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const queuedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      job_id: jobId,
      tenant_id: tenantId,
      community_id: communityId,
      member_count: memberNodes.length,
      status: 'QUEUED',
      queued_at: queuedAt,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.db.storeDocument(JOBS_INDEX, doc, jobId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store summary job',
      );
    }

    await this.queue.enqueue(SUMMARY_EVENT, {
      job_id: jobId,
      tenant_id: tenantId,
      community_id: communityId,
      member_nodes: memberNodes,
      queued_at: queuedAt,
    });

    return DataProcessResult.success({
      jobId,
      status: 'QUEUED',
      tenantId,
      communityId,
      memberCount: memberNodes.length,
      queuedAt,
    });
  }
}
