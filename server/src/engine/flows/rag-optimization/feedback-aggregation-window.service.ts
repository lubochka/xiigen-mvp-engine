/**
 * FeedbackAggregationWindow — T460 LEARNING service for FLOW-29.
 *
 * Time-window feedback aggregation that triggers RoutingPolicyUpdater via queue.
 * NEVER calls RoutingPolicyUpdater directly — queue only.
 *
 * Iron rules:
 *   QUEUE_ONLY:  RoutingPolicyUpdater MUST be triggered via IQueueService — never direct call
 *   EMPTY_WINDOW: no feedback in window → record zero-signal result, do NOT trigger update
 *   WINDOW_SIZE:  from FREEDOM config — never hardcoded
 *   CF-476:       tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:        All methods return DataProcessResult<T> — never throw
 *   DNA-8:        storeDocument() BEFORE enqueue()
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface ArmAggregate {
  readonly armId: string;
  readonly averageReward: number;
  readonly sampleCount: number;
}

export interface AggregationResult {
  readonly aggregationId: string;
  readonly tenantId: string;
  readonly windowMinutes: number;
  readonly arms: ArmAggregate[];
  readonly policyUpdateTriggered: boolean;
  readonly aggregatedAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const AGGREGATION_INDEX = 'flow29-feedback-aggregations';
const AGGREGATION_EVENT = 'feedback.aggregation.completed';
const POLICY_UPDATE_EVENT = 'routing.policy.update.triggered';
const DEFAULT_WINDOW_MIN = 60;

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class FeedbackAggregationWindow {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  /**
   * Aggregate feedback for a time window and trigger policy update via queue.
   *
   * QUEUE_ONLY: RoutingPolicyUpdater triggered via queue — never direct call.
   * EMPTY_WINDOW: zero-signal result stored, no policy update triggered.
   * DNA-8: storeDocument() BEFORE enqueue().
   */
  async aggregate(
    tenantId: string,
    windowStartIso: string,
    windowMinutes?: number,
  ): Promise<DataProcessResult<AggregationResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (!windowStartIso || windowStartIso.trim() === '') {
      return DataProcessResult.failure('MISSING_WINDOW_START', 'windowStartIso is required');
    }

    // Read window size from FREEDOM config
    const configResult = await this.db.searchDocuments('flow29-feedback-config', {
      tenant_id: tenantId,
      active: true,
    });
    const config =
      configResult.isSuccess && (configResult.data ?? []).length > 0 ? configResult.data![0] : null;

    const effectiveWindow =
      windowMinutes ?? (config?.['window_minutes'] as number | undefined) ?? DEFAULT_WINDOW_MIN;

    // Read raw feedback in window
    const feedbackResult = await this.db.searchDocuments('flow29-feedback', {
      tenant_id: tenantId,
      window_start: windowStartIso,
      window_minutes: effectiveWindow,
    });
    const rawFeedback = feedbackResult.isSuccess ? (feedbackResult.data ?? []) : [];

    // Aggregate per arm
    const armMap = new Map<string, { totalReward: number; count: number }>();
    for (const fb of rawFeedback) {
      const armId = String(fb['strategy'] ?? 'unknown');
      const reward = Number(fb['rating'] ?? 3) / 5; // normalize 1–5 to 0–1
      const current = armMap.get(armId) ?? { totalReward: 0, count: 0 };
      armMap.set(armId, { totalReward: current.totalReward + reward, count: current.count + 1 });
    }

    const arms: ArmAggregate[] = Array.from(armMap.entries()).map(([armId, stats]) => ({
      armId,
      averageReward: stats.totalReward / stats.count,
      sampleCount: stats.count,
    }));

    const policyUpdateTriggered = arms.length > 0;
    const aggregationId = `agg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const aggregatedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      aggregation_id: aggregationId,
      tenant_id: tenantId,
      window_start: windowStartIso,
      window_minutes: effectiveWindow,
      arms,
      policy_update_triggered: policyUpdateTriggered,
      aggregated_at: aggregatedAt,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.db.storeDocument(AGGREGATION_INDEX, doc, aggregationId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store aggregation result',
      );
    }

    await this.queue.enqueue(AGGREGATION_EVENT, {
      aggregation_id: aggregationId,
      tenant_id: tenantId,
      aggregated_at: aggregatedAt,
    });

    // QUEUE_ONLY: trigger policy update via queue — never direct call
    if (policyUpdateTriggered) {
      await this.queue.enqueue(POLICY_UPDATE_EVENT, {
        aggregation_id: aggregationId,
        tenant_id: tenantId,
        arms,
        triggered_at: aggregatedAt,
      });
    }

    return DataProcessResult.success({
      aggregationId,
      tenantId,
      windowMinutes: effectiveWindow,
      arms,
      policyUpdateTriggered,
      aggregatedAt,
    });
  }
}
