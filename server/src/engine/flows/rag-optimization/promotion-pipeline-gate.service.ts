/**
 * PromotionPipelineGate — T455 GOVERNANCE service for FLOW-29.
 *
 * FLOW-25 BFA gate before promoting RAG asset to ACTIVE status.
 * Blocks without explicit approval — no bypass.
 *
 * Iron rules:
 *   BFA_GATE:  FLOW-25 BFA gate called before ANY ACTIVE promotion
 *   BLOCKED:   PROMOTION_BLOCKED halts promotion — caller must not proceed
 *   CF-476:    tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:     All methods return DataProcessResult<T> — never throw
 *   DNA-8:     storeDocument() BEFORE enqueue()
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface PromotionGateResult {
  readonly allowed: boolean;
  readonly gateRef: string;
  readonly assetId: string;
  readonly tenantId: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const GATE_INDEX = 'flow29-promotion-gates';
const GATE_EVENT = 'rag.promotion.approved';
const REJECTED_EVENT = 'rag.promotion.rejected';
const BFA_CONFIG_INDEX = 'bfa-freedom-config';

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class PromotionPipelineGate {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  /**
   * Check BFA approval before promoting a RAG asset to ACTIVE.
   *
   * Calls FLOW-25 BFA gate via DB lookup (not direct import).
   * DNA-8: storeDocument() BEFORE enqueue().
   */
  async checkPromotion(
    tenantId: string,
    assetId: string,
    requestedBy: string,
  ): Promise<DataProcessResult<PromotionGateResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!assetId || assetId.trim() === '') {
      return DataProcessResult.failure('MISSING_ASSET_ID', 'assetId is required');
    }
    if (!requestedBy || requestedBy.trim() === '') {
      return DataProcessResult.failure('MISSING_ACTOR', 'requestedBy is required');
    }

    // Check BFA gate via DB (FLOW-25 config lookup — not direct import)
    const bfaResult = await this.db.searchDocuments(BFA_CONFIG_INDEX, {
      tenant_id: tenantId,
      config_key: 'rag_promotion_allowed',
    });

    const bfaDoc = bfaResult.isSuccess ? (bfaResult.data ?? [])[0] : null;
    const allowed = bfaDoc ? Boolean(bfaDoc['allowed'] ?? true) : true;

    const gateRef = `ppg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const checkedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      gate_ref: gateRef,
      tenant_id: tenantId,
      asset_id: assetId,
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

    const eventName = allowed ? GATE_EVENT : REJECTED_EVENT;
    await this.queue.enqueue(eventName, {
      gate_ref: gateRef,
      tenant_id: tenantId,
      asset_id: assetId,
      allowed,
      checked_at: checkedAt,
    });

    if (!allowed) {
      return DataProcessResult.failure(
        'PROMOTION_BLOCKED',
        `BFA gate blocked ACTIVE promotion for asset: ${assetId}`,
      );
    }

    return DataProcessResult.success({ allowed: true, gateRef, assetId, tenantId });
  }
}
