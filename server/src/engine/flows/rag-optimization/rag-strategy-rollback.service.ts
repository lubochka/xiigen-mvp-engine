/**
 * RAGStrategyRollback — T466 GOVERNANCE service for FLOW-29.
 *
 * Rollback to a previous RAG strategy version via pointer swap.
 * NEVER deletes versions — previous version preserved intact.
 *
 * Iron rules:
 *   POINTER_SWAP:   rollback = pointer update only — never delete
 *   PRESERVE:       previous (current) version MUST remain in DB
 *   CF-476:         tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:          All methods return DataProcessResult<T> — never throw
 *   DNA-8:          storeDocument() BEFORE enqueue()
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface RollbackResult {
  readonly rollbackId: string;
  readonly tenantId: string;
  readonly previousActiveVersion: string;
  readonly rolledBackToVersion: string;
  readonly rolledBackAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const POINTER_INDEX = 'flow29-strategy-pointers';
const ROLLBACK_EVENT = 'rag.strategy.rolled_back';

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class RAGStrategyRollback {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  /**
   * Rollback active RAG strategy to targetVersionId via pointer swap.
   *
   * Reads current active pointer, creates new pointer document pointing to target.
   * Previous active pointer document preserved in DB.
   * DNA-8: storeDocument() BEFORE enqueue().
   */
  async rollback(
    tenantId: string,
    targetVersionId: string,
  ): Promise<DataProcessResult<RollbackResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!targetVersionId || targetVersionId.trim() === '') {
      return DataProcessResult.failure('MISSING_TARGET_VERSION', 'targetVersionId is required');
    }

    // Read current active pointer
    const activeResult = await this.db.searchDocuments(POINTER_INDEX, {
      tenant_id: tenantId,
      active: true,
    });
    const activeDoc = activeResult.isSuccess ? (activeResult.data ?? [])[0] : null;
    const previousActiveVersion = String(activeDoc?.['version_id'] ?? 'none');

    const rollbackId = `rb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const rolledBackAt = new Date().toISOString();

    // New pointer document (pointer swap — previous doc preserved)
    const doc: Record<string, unknown> = {
      rollback_id: rollbackId,
      tenant_id: tenantId,
      version_id: targetVersionId,
      previous_active_version: previousActiveVersion,
      active: true,
      rolled_back_at: rolledBackAt,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.db.storeDocument(POINTER_INDEX, doc, rollbackId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store rollback pointer',
      );
    }

    await this.queue.enqueue(ROLLBACK_EVENT, {
      rollback_id: rollbackId,
      tenant_id: tenantId,
      rolled_back_to_version: targetVersionId,
      previous_active_version: previousActiveVersion,
      rolled_back_at: rolledBackAt,
    });

    return DataProcessResult.success({
      rollbackId,
      tenantId,
      previousActiveVersion,
      rolledBackToVersion: targetVersionId,
      rolledBackAt,
    });
  }
}
