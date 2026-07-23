/**
 * KnowledgeGraphEditGate — T452 GOVERNANCE service for FLOW-29.
 *
 * FLOW-25 BFA gate must be called before any structural graph edit.
 * GRAPH_EDIT_BLOCKED halts the edit — no bypass.
 *
 * Iron rules:
 *   BFA_GATE:   FLOW-25 BFA gate MUST be checked — no bypass
 *   BLOCKED:    GRAPH_EDIT_BLOCKED halts edit — caller must not proceed
 *   CF-476:     tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:      All methods return DataProcessResult<T> — never throw
 *   DNA-8:      storeDocument() BEFORE enqueue()
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface EditGateResult {
  readonly allowed: boolean;
  readonly gateRef: string;
  readonly editType: string;
  readonly tenantId: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const GATE_INDEX = 'flow29-graph-edit-gates';
const GATE_EVENT = 'graph.edit.gate.checked';
const BFA_CONFIG_INDEX = 'bfa-freedom-config';

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class KnowledgeGraphEditGate {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  /**
   * Check BFA approval before allowing a structural graph edit.
   *
   * Calls FLOW-25 BFA gate via DB lookup (not direct import).
   * DNA-8: storeDocument() BEFORE enqueue().
   */
  async checkEditApproval(
    tenantId: string,
    editType: string,
    affectedNodes: string[],
    requestedBy: string,
  ): Promise<DataProcessResult<EditGateResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!editType || editType.trim() === '') {
      return DataProcessResult.failure('MISSING_EDIT_TYPE', 'editType is required');
    }
    if (!requestedBy || requestedBy.trim() === '') {
      return DataProcessResult.failure('MISSING_ACTOR', 'requestedBy is required');
    }

    // Check BFA gate via DB (FLOW-25 config lookup — not direct import)
    const bfaResult = await this.db.searchDocuments(BFA_CONFIG_INDEX, {
      tenant_id: tenantId,
      config_key: 'graph_edit_allowed',
    });

    const bfaDoc = bfaResult.isSuccess ? (bfaResult.data ?? [])[0] : null;
    const allowed = bfaDoc ? Boolean(bfaDoc['allowed'] ?? true) : true;

    const gateRef = `ggate-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const checkedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      gate_ref: gateRef,
      tenant_id: tenantId,
      edit_type: editType,
      affected_nodes: affectedNodes,
      requested_by: requestedBy,
      allowed,
      checked_at: checkedAt,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.db.storeDocument(GATE_INDEX, doc, gateRef);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store gate decision',
      );
    }

    await this.queue.enqueue(GATE_EVENT, {
      gate_ref: gateRef,
      tenant_id: tenantId,
      edit_type: editType,
      allowed,
      checked_at: checkedAt,
    });

    if (!allowed) {
      return DataProcessResult.failure(
        'GRAPH_EDIT_BLOCKED',
        `BFA gate blocked graph edit of type: ${editType}`,
      );
    }

    return DataProcessResult.success({ allowed: true, gateRef, editType, tenantId });
  }
}
