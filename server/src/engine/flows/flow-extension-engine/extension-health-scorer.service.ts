/**
 * ExtensionHealthScorer — T411 [EVALUATION].
 *
 * Scores the health of an engine extension (flow) based on operational metrics.
 * Health score 0.0–1.0. Stores score and emits event for monitoring.
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

export interface ExtensionHealthResult {
  scoreId: string;
  flowId: string;
  healthScore: number;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  scoredAt: string;
}

function classifyHealth(score: number): 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' {
  if (score >= 0.8) return 'HEALTHY';
  if (score >= 0.5) return 'DEGRADED';
  return 'UNHEALTHY';
}

export class ExtensionHealthScorer {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async score(
    tenantId: string,
    flowId: string,
    metrics: { errorRate: number; latencyMs: number; successRate: number },
  ): Promise<DataProcessResult<ExtensionHealthResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');

    // Validate metric ranges
    if (metrics.errorRate < 0 || metrics.errorRate > 1) {
      return DataProcessResult.failure('INVALID_METRIC', 'errorRate must be between 0 and 1');
    }
    if (metrics.successRate < 0 || metrics.successRate > 1) {
      return DataProcessResult.failure('INVALID_METRIC', 'successRate must be between 0 and 1');
    }

    // Score: weighted average of successRate (60%), low errorRate (30%), latency factor (10%)
    const latencyFactor = Math.max(0, 1 - metrics.latencyMs / 10000);
    const healthScore =
      Math.round(
        (metrics.successRate * 0.6 + (1 - metrics.errorRate) * 0.3 + latencyFactor * 0.1) * 100,
      ) / 100;

    const status = classifyHealth(healthScore);
    const scoreId = randomUUID();
    const scoredAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      scoreId,
      tenantId,
      flowId,
      healthScore,
      status,
      metrics,
      scoredAt,
    };

    const stored = await this.db.storeDocument('flow26-extension-health', doc, scoreId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('flow.extension.scored', {
      scoreId,
      tenantId,
      flowId,
      healthScore,
      status,
      scoredAt,
    });

    return DataProcessResult.success({ scoreId, flowId, healthScore, status, scoredAt });
  }
}
