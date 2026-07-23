/**
 * PromptVersionPromoter — T450 GOVERNANCE service for FLOW-29.
 *
 * Immutable prompt version promotion ladder: DRAFT→CANDIDATE→TESTED→ACTIVE→ARCHIVED.
 * Promote = create new version document. NEVER edit existing version in place.
 *
 * Iron rules:
 *   INSERT_ONLY:  every promotion creates new document — never update
 *   LADDER_ORDER: DRAFT→CANDIDATE→TESTED→ACTIVE→ARCHIVED only
 *   CF-476:       tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:        All methods return DataProcessResult<T> — never throw
 *   DNA-8:        storeDocument() BEFORE enqueue()
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export type PromptVersionStatus = 'DRAFT' | 'CANDIDATE' | 'TESTED' | 'ACTIVE' | 'ARCHIVED';

export interface PromotionResult {
  readonly versionId: string;
  readonly promptId: string;
  readonly fromStatus: PromptVersionStatus;
  readonly toStatus: PromptVersionStatus;
  readonly tenantId: string;
  readonly promotedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const VERSIONS_INDEX = 'flow29-prompt-versions';
const PROMOTE_EVENT = 'rag.prompt.promoted';

const LADDER: PromptVersionStatus[] = ['DRAFT', 'CANDIDATE', 'TESTED', 'ACTIVE', 'ARCHIVED'];

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class PromptVersionPromoter {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  /**
   * Promote a prompt version to the next rung in the ladder.
   *
   * Creates new version document — NEVER edits existing.
   * DNA-8: storeDocument() BEFORE enqueue().
   */
  async promote(
    tenantId: string,
    promptId: string,
    fromStatus: PromptVersionStatus,
  ): Promise<DataProcessResult<PromotionResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!promptId || promptId.trim() === '') {
      return DataProcessResult.failure('MISSING_PROMPT_ID', 'promptId is required');
    }

    const fromIdx = LADDER.indexOf(fromStatus);
    if (fromIdx === -1) {
      return DataProcessResult.failure('INVALID_STATUS', `Unknown status: ${fromStatus}`);
    }
    if (fromIdx === LADDER.length - 1) {
      return DataProcessResult.failure('ALREADY_ARCHIVED', 'Cannot promote beyond ARCHIVED');
    }

    const toStatus = LADDER[fromIdx + 1];
    const versionId = `pv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const promotedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      version_id: versionId,
      tenant_id: tenantId,
      prompt_id: promptId,
      from_status: fromStatus,
      to_status: toStatus,
      promoted_at: promotedAt,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.db.storeDocument(VERSIONS_INDEX, doc, versionId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store promotion',
      );
    }

    await this.queue.enqueue(PROMOTE_EVENT, {
      version_id: versionId,
      tenant_id: tenantId,
      prompt_id: promptId,
      from_status: fromStatus,
      to_status: toStatus,
      promoted_at: promotedAt,
    });

    return DataProcessResult.success({
      versionId,
      promptId,
      fromStatus,
      toStatus,
      tenantId,
      promotedAt,
    });
  }
}
