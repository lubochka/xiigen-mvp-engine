/**
 * ControlPlaneGraphEdit — T462 GOVERNANCE service for FLOW-29.
 *
 * Versioned structural graph edit — requires prior T452 BFA approval (gateRef).
 * Every edit creates a new version document — NEVER mutates in place.
 *
 * Iron rules:
 *   INSERT_ONLY:    every edit creates new version document — never mutate
 *   BFA_REQUIRED:   gateRef from T452 approval MUST be provided
 *   CF-476:         tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:          All methods return DataProcessResult<T> — never throw
 *   DNA-8:          storeDocument() BEFORE enqueue()
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface GraphEditResult {
  readonly editVersionId: string;
  readonly tenantId: string;
  readonly gateRef: string;
  readonly editType: string;
  readonly affectedNodes: string[];
  readonly appliedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const EDITS_INDEX = 'flow29-graph-edit-versions';
const EDIT_EVENT = 'rag.graph.edit.applied';

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ControlPlaneGraphEdit {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  /**
   * Apply a versioned structural graph edit.
   *
   * Requires gateRef from prior T452 approval — no bypass.
   * Creates new version document — NEVER mutates existing.
   * DNA-8: storeDocument() BEFORE enqueue().
   */
  async applyEdit(
    tenantId: string,
    gateRef: string,
    editType: string,
    affectedNodes: string[],
    editPayload: Record<string, unknown>,
  ): Promise<DataProcessResult<GraphEditResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!gateRef || gateRef.trim() === '') {
      return DataProcessResult.failure(
        'MISSING_GATE_REF',
        'gateRef from T452 approval is required',
      );
    }
    if (!editType || editType.trim() === '') {
      return DataProcessResult.failure('MISSING_EDIT_TYPE', 'editType is required');
    }

    const editVersionId = `gev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const appliedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      edit_version_id: editVersionId,
      tenant_id: tenantId,
      gate_ref: gateRef,
      edit_type: editType,
      affected_nodes: affectedNodes,
      edit_payload: editPayload,
      applied_at: appliedAt,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.db.storeDocument(EDITS_INDEX, doc, editVersionId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store graph edit version',
      );
    }

    await this.queue.enqueue(EDIT_EVENT, {
      edit_version_id: editVersionId,
      tenant_id: tenantId,
      gate_ref: gateRef,
      edit_type: editType,
      affected_nodes: affectedNodes,
      applied_at: appliedAt,
    });

    return DataProcessResult.success({
      editVersionId,
      tenantId,
      gateRef,
      editType,
      affectedNodes,
      appliedAt,
    });
  }
}
