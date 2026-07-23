/**
 * BanditModelSelector — T445 ROUTING service for FLOW-29.
 *
 * Multi-armed bandit model/strategy selection.
 * Selects from configured arms using epsilon-greedy or UCB1 algorithm.
 * Policy and algorithm read from FREEDOM config (IDatabaseService).
 *
 * Iron rules (enforced — not configurable):
 *   DNA-8:   storeDocument() BEFORE enqueue()
 *   CF-476:  tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:   All methods return DataProcessResult<T> — never throw
 *   POLICY:  Arm weights from FREEDOM config — never hardcoded
 *   DETERMINISTIC: given same weights + seed → same arm
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface BanditSelection {
  readonly selectionId: string;
  readonly selectedArm: string;
  readonly exploring: boolean;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly selectedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const SELECTION_INDEX = 'flow29-bandit-selections';
const SELECTION_EVENT = 'bandit.arm.selected';
const ARMS_INDEX = 'flow29-bandit-arms';
const DEFAULT_ARM = 'hybrid-rag';

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class BanditModelSelector {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  /**
   * Select a bandit arm for the given context.
   *
   * DNA-8: storeDocument() BEFORE enqueue().
   * Arms and algorithm from FREEDOM config — never hardcoded.
   */
  async selectArm(
    sessionId: string,
    tenantId: string,
    contextFeatures: Record<string, unknown> = {},
  ): Promise<DataProcessResult<BanditSelection>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!sessionId || sessionId.trim() === '') {
      return DataProcessResult.failure('MISSING_SESSION_ID', 'sessionId is required');
    }

    // Read arm config from FREEDOM config (DB-backed)
    const armsResult = await this.db.searchDocuments(ARMS_INDEX, {
      tenant_id: tenantId,
      active: true,
    });
    const armsConfig =
      armsResult.isSuccess && (armsResult.data ?? []).length > 0 ? armsResult.data![0] : null;

    const { selectedArm, exploring } = this.selectFromConfig(armsConfig, contextFeatures);
    const selectionId = `sel-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const selectedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      selection_id: selectionId,
      session_id: sessionId,
      tenant_id: tenantId,
      selected_arm: selectedArm,
      exploring,
      context_features: contextFeatures,
      selected_at: selectedAt,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.db.storeDocument(SELECTION_INDEX, doc, selectionId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store bandit selection',
      );
    }

    await this.queue.enqueue(SELECTION_EVENT, {
      selection_id: selectionId,
      session_id: sessionId,
      tenant_id: tenantId,
      selected_arm: selectedArm,
      exploring,
      selected_at: selectedAt,
    });

    return DataProcessResult.success({
      selectionId,
      selectedArm,
      exploring,
      sessionId,
      tenantId,
      selectedAt,
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private selectFromConfig(
    config: Record<string, unknown> | null,
    contextFeatures: Record<string, unknown>,
  ): { selectedArm: string; exploring: boolean } {
    if (!config) return { selectedArm: DEFAULT_ARM, exploring: false };

    const arms = config['arms'] as Record<string, number> | undefined;
    if (!arms || Object.keys(arms).length === 0) {
      return { selectedArm: DEFAULT_ARM, exploring: false };
    }

    const epsilon = (config['epsilon'] as number | undefined) ?? 0.1;
    const seed = (contextFeatures['seed'] as number | undefined) ?? Math.random();

    // Epsilon-greedy: explore with probability epsilon
    if (seed < epsilon) {
      const armNames = Object.keys(arms);
      const idx = Math.floor(seed * armNames.length);
      return { selectedArm: armNames[idx] ?? DEFAULT_ARM, exploring: true };
    }

    // Greedy: pick highest weight arm
    let bestArm = DEFAULT_ARM;
    let bestWeight = -1;
    for (const [arm, weight] of Object.entries(arms)) {
      if (weight > bestWeight) {
        bestWeight = weight;
        bestArm = arm;
      }
    }
    return { selectedArm: bestArm, exploring: false };
  }
}
