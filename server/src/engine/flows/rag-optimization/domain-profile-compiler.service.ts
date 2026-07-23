/**
 * DomainProfileCompiler — T451 BUILD service for FLOW-29.
 *
 * Async domain knowledge profile compilation.
 * Returns QUEUED immediately — never blocks caller.
 *
 * Iron rules:
 *   ASYNC:   compilation triggered via queue — return QUEUED immediately
 *   CF-476:  tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:   All methods return DataProcessResult<T> — never throw
 *   DNA-8:   storeDocument() BEFORE enqueue()
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface CompileJobResult {
  readonly jobId: string;
  readonly status: 'QUEUED';
  readonly tenantId: string;
  readonly domainId: string;
  readonly queuedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const JOBS_INDEX = 'flow29-domain-compile-jobs';
const COMPILE_EVENT = 'domain.profile.compile.triggered';

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class DomainProfileCompiler {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  /**
   * Queue a domain profile compilation job.
   *
   * Returns QUEUED immediately — never processes inline.
   * DNA-8: storeDocument() BEFORE enqueue().
   */
  async compile(
    tenantId: string,
    domainId: string,
    sourceDocs: Record<string, unknown>[],
  ): Promise<DataProcessResult<CompileJobResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!domainId || domainId.trim() === '') {
      return DataProcessResult.failure('MISSING_DOMAIN_ID', 'domainId is required');
    }

    const jobId = `dpc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const queuedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      job_id: jobId,
      tenant_id: tenantId,
      domain_id: domainId,
      source_count: sourceDocs.length,
      status: 'QUEUED',
      queued_at: queuedAt,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.db.storeDocument(JOBS_INDEX, doc, jobId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store compile job',
      );
    }

    await this.queue.enqueue(COMPILE_EVENT, {
      job_id: jobId,
      tenant_id: tenantId,
      domain_id: domainId,
      source_docs: sourceDocs,
      queued_at: queuedAt,
    });

    return DataProcessResult.success({ jobId, status: 'QUEUED', tenantId, domainId, queuedAt });
  }
}
