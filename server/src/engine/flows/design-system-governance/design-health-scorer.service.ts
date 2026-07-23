/**
 * DesignHealthScorer — T509 [EVALUATION].
 *
 * Scores design system health from operational metrics: error rate, token adoption,
 * component reuse rate, accessibility compliance rate.
 * Classifies HEALTHY / DEGRADED / UNHEALTHY.
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
}

interface IQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

export interface DesignHealthScoreResult {
  healthId: string;
  specId: string;
  healthScore: number;
  classification: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  scoredAt: string;
}

export class DesignHealthScorer {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async score(
    tenantId: string,
    specId: string,
    metrics: {
      errorRate: number; // 0.0–1.0 (lower is better)
      tokenAdoptionRate: number; // 0.0–1.0 (higher is better)
      componentReuseRate: number; // 0.0–1.0 (higher is better)
      accessibilityComplianceRate: number; // 0.0–1.0 (higher is better)
    },
  ): Promise<DataProcessResult<DesignHealthScoreResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');

    // Health = avg of positive indicators, penalized by error rate
    const positiveScore =
      (metrics.tokenAdoptionRate +
        metrics.componentReuseRate +
        metrics.accessibilityComplianceRate) /
      3;
    const healthScore = Math.max(0, positiveScore - metrics.errorRate);

    const classification: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' =
      healthScore >= 0.8 ? 'HEALTHY' : healthScore >= 0.5 ? 'DEGRADED' : 'UNHEALTHY';

    const healthId = randomUUID();
    const scoredAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      healthId,
      tenantId,
      specId,
      healthScore,
      classification,
      metrics,
      scoredAt,
    };

    const stored = await this.db.storeDocument('flow31-health-scores', doc, healthId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.health.scored', {
      healthId,
      tenantId,
      specId,
      healthScore,
      classification,
      scoredAt,
    });

    return DataProcessResult.success({ healthId, specId, healthScore, classification, scoredAt });
  }
}
