/**
 * TenantHealthScorer — T475 [EVALUATION].
 *
 * Reads usage metrics, error rates, quota consumption.
 * Computes health score in range 0.0–1.0.
 * Stores health score then emits tenant.health.scored.
 *
 * DNA-8: storeDocument() BEFORE enqueue().
 * DNA-3: All methods return DataProcessResult — never throw.
 * CF-476: tenantId required — UNSCOPED_QUERY on missing.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { randomUUID } from 'crypto';

interface IDb {
  storeDocument(
    index: string,
    doc: Record<string, unknown>,
    id?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
  searchDocuments(
    index: string,
    filter: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>[]>>;
}

interface IQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

export interface HealthScoreResult {
  scoreId: string;
  healthScore: number;
  scoredAt: string;
}

export class TenantHealthScorer {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async score(tenantId: string): Promise<DataProcessResult<HealthScoreResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');

    // Read usage metrics
    const metricsResult = await this.db.searchDocuments('flow30-usage-metrics', { tenantId });
    if (!metricsResult.isSuccess)
      return DataProcessResult.failure(metricsResult.errorCode!, metricsResult.errorMessage!);

    const metrics = metricsResult.data ?? [];
    const errorRate = metrics.length > 0 ? ((metrics[0]['errorRate'] as number) ?? 0) : 0;
    const quotaConsumption =
      metrics.length > 0 ? ((metrics[0]['quotaConsumption'] as number) ?? 0) : 0;

    // Compute score 0.0–1.0: penalize error rate and high quota consumption
    let healthScore = 1.0;
    healthScore -= Math.min(errorRate, 1.0) * 0.5; // error rate penalty (up to 0.5)
    healthScore -= Math.min(quotaConsumption, 1.0) * 0.3; // quota penalty (up to 0.3)
    healthScore = Math.max(0.0, Math.min(1.0, healthScore));

    const scoreId = randomUUID();
    const scoredAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      scoreId,
      tenantId,
      healthScore,
      errorRate,
      quotaConsumption,
      scoredAt,
    };

    const stored = await this.db.storeDocument('flow30-health-scores', doc, scoreId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('tenant.health.scored', { scoreId, tenantId, healthScore, scoredAt });

    return DataProcessResult.success({ scoreId, healthScore, scoredAt });
  }
}
