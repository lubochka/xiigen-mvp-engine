/**
 * UserFeedbackIngest — T449 LEARNING service for FLOW-29.
 *
 * Ingest feedback linked to 6-tuple run context.
 * All 6-tuple fields required — MISSING_RUN_CONTEXT_FIELD on any gap.
 * IMMUTABLE: INSERT-ONLY — no update/delete methods.
 * Idempotent: duplicate feedback (same 6-tuple + rating) returns existing record.
 *
 * Iron rules:
 *   6-TUPLE:  (tenant, session, query_id, model, strategy, timestamp) all required
 *   CF-476:   tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:    All methods return DataProcessResult<T> — never throw
 *   DNA-7:    Duplicate feedback (same 6-tuple + rating) is idempotent
 *   DNA-8:    storeDocument() BEFORE enqueue()
 *   IMMUTABLE: no update or delete methods
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface FeedbackRunContext {
  readonly sessionId: string;
  readonly queryId: string;
  readonly model: string;
  readonly strategy: string;
  readonly runTimestamp: string;
}

export interface FeedbackIngestResult {
  readonly feedbackId: string;
  readonly tenantId: string;
  readonly rating: number;
  readonly idempotent: boolean;
  readonly recordedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const FEEDBACK_INDEX = 'flow29-feedback';
const FEEDBACK_EVENT = 'feedback.ingested';

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class UserFeedbackIngest {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  /**
   * Ingest a feedback record linked to the 6-tuple run context.
   *
   * DNA-8: storeDocument() BEFORE enqueue().
   * DNA-7: Duplicate (same 6-tuple + rating) returns existing record.
   * IMMUTABLE: no update/delete methods on this service.
   */
  async ingest(
    tenantId: string,
    runContext: FeedbackRunContext,
    rating: number,
    comment?: string,
  ): Promise<DataProcessResult<FeedbackIngestResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }

    // Validate 6-tuple completeness
    const missing = this.validateRunContext(runContext);
    if (missing) {
      return DataProcessResult.failure(
        'MISSING_RUN_CONTEXT_FIELD',
        `6-tuple field missing: ${missing}`,
      );
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return DataProcessResult.failure('INVALID_RATING', 'rating must be 1–5');
    }

    // DNA-7: Check for duplicate
    const dupCheck = await this.db.searchDocuments(FEEDBACK_INDEX, {
      tenant_id: tenantId,
      session_id: runContext.sessionId,
      query_id: runContext.queryId,
      model: runContext.model,
      strategy: runContext.strategy,
      run_ts: runContext.runTimestamp,
      rating,
    });
    if (dupCheck.isSuccess && (dupCheck.data ?? []).length > 0) {
      const existing = dupCheck.data![0];
      return DataProcessResult.success({
        feedbackId: String(existing['feedback_id'] ?? 'dup'),
        tenantId,
        rating,
        idempotent: true,
        recordedAt: String(existing['recorded_at'] ?? new Date().toISOString()),
      });
    }

    const feedbackId = `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const recordedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      feedback_id: feedbackId,
      tenant_id: tenantId,
      session_id: runContext.sessionId,
      query_id: runContext.queryId,
      model: runContext.model,
      strategy: runContext.strategy,
      run_ts: runContext.runTimestamp,
      rating,
      comment: comment ?? null,
      recorded_at: recordedAt,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.db.storeDocument(FEEDBACK_INDEX, doc, feedbackId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store feedback',
      );
    }

    await this.queue.enqueue(FEEDBACK_EVENT, {
      feedback_id: feedbackId,
      tenant_id: tenantId,
      session_id: runContext.sessionId,
      rating,
      recorded_at: recordedAt,
    });

    return DataProcessResult.success({
      feedbackId,
      tenantId,
      rating,
      idempotent: false,
      recordedAt,
    });
  }

  private validateRunContext(ctx: FeedbackRunContext): string | null {
    if (!ctx.sessionId || ctx.sessionId.trim() === '') return 'sessionId';
    if (!ctx.queryId || ctx.queryId.trim() === '') return 'queryId';
    if (!ctx.model || ctx.model.trim() === '') return 'model';
    if (!ctx.strategy || ctx.strategy.trim() === '') return 'strategy';
    if (!ctx.runTimestamp || ctx.runTimestamp.trim() === '') return 'runTimestamp';
    return null;
  }
}
