/**
 * AdaptiveRagRouter — T441 ORCHESTRATION service for FLOW-29.
 *
 * Entry point for the Adaptive RAG Deep Research Engine.
 * Routes queries to VECTOR | GRAPH | HYBRID | SELF_REFLECT
 * based on a bandit policy stored in IDatabaseService.
 *
 * Iron rules (enforced — not configurable):
 *   DNA-8:   storeDocument() BEFORE enqueue()
 *   CF-476:  tenantId required on all operations — UNSCOPED_QUERY on missing
 *   DNA-3:   All methods return DataProcessResult<T> — never throw
 *   POLICY:  Route selection reads policy from DB — never hardcoded
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export type RetrievalMode = 'VECTOR' | 'GRAPH' | 'HYBRID' | 'SELF_REFLECT';

export interface RoutingDecision {
  readonly routingId: string;
  readonly mode: RetrievalMode;
  readonly confidence: number;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly decidedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ROUTING_INDEX = 'flow29-routing-decisions';
const ROUTING_EVENT = 'routing.decision.recorded';
const POLICY_INDEX = 'flow29-bandit-policy';
const DEFAULT_MODE: RetrievalMode = 'HYBRID';

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AdaptiveRagRouter {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  /**
   * Route a query to the appropriate retrieval mode.
   *
   * DNA-8: storeDocument() BEFORE enqueue().
   * POLICY: reads bandit policy from DB — never hardcoded.
   */
  async routeQuery(
    sessionId: string,
    tenantId: string,
    queryText: string,
    queryFeatures: Record<string, unknown> = {},
  ): Promise<DataProcessResult<RoutingDecision>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!sessionId || sessionId.trim() === '') {
      return DataProcessResult.failure('MISSING_SESSION_ID', 'sessionId is required');
    }
    if (!queryText || queryText.trim() === '') {
      return DataProcessResult.failure('MISSING_QUERY_TEXT', 'queryText is required');
    }

    // Read bandit policy from DB (FREEDOM-backed)
    const policyResult = await this.db.searchDocuments(POLICY_INDEX, {
      tenant_id: tenantId,
      active: true,
    });
    const policy =
      policyResult.isSuccess && (policyResult.data ?? []).length > 0 ? policyResult.data![0] : null;

    const mode = this.selectMode(policy, queryFeatures);
    const confidence = this.computeConfidence(policy, mode);

    const routingId = `route-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const decidedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      routing_id: routingId,
      session_id: sessionId,
      tenant_id: tenantId,
      mode,
      confidence,
      query_features: queryFeatures,
      decided_at: decidedAt,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.db.storeDocument(ROUTING_INDEX, doc, routingId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store routing decision',
      );
    }

    await this.queue.enqueue(ROUTING_EVENT, {
      routing_id: routingId,
      session_id: sessionId,
      tenant_id: tenantId,
      mode,
      confidence,
      decided_at: decidedAt,
    });

    return DataProcessResult.success({
      routingId,
      mode,
      confidence,
      sessionId,
      tenantId,
      decidedAt,
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private selectMode(
    policy: Record<string, unknown> | null,
    queryFeatures: Record<string, unknown>,
  ): RetrievalMode {
    if (!policy) return DEFAULT_MODE;

    const weights = policy['mode_weights'] as Record<string, number> | undefined;
    if (!weights) return DEFAULT_MODE;

    // Epsilon-greedy: if explore flag set in features, pick random from valid modes
    const explore = queryFeatures['explore'] === true;
    const modes: RetrievalMode[] = ['VECTOR', 'GRAPH', 'HYBRID', 'SELF_REFLECT'];

    if (explore) {
      const idx = Math.floor(Math.random() * modes.length);
      return modes[idx];
    }

    // Greedy: pick highest weight
    let best: RetrievalMode = DEFAULT_MODE;
    let bestWeight = -1;
    for (const mode of modes) {
      const w = weights[mode] ?? 0;
      if (w > bestWeight) {
        bestWeight = w;
        best = mode;
      }
    }
    return best;
  }

  private computeConfidence(policy: Record<string, unknown> | null, mode: RetrievalMode): number {
    if (!policy) return 0.5;
    const weights = policy['mode_weights'] as Record<string, number> | undefined;
    if (!weights) return 0.5;
    const total = Object.values(weights).reduce((s, v) => s + v, 0);
    if (total === 0) return 0.5;
    return Math.min(1, (weights[mode] ?? 0) / total);
  }
}
