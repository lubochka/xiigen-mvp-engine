/**
 * UsageMetricsAggregator — T476 [LEARNING].
 *
 * SCORE-0 ASYNC-ONLY: must only be triggered via queue consumer — never on live path.
 * Aggregates raw usage events into period-based metrics.
 * Stores aggregated metrics then emits usage.metrics.aggregated.
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

export interface MetricsAggregationResult {
  metricsId: string;
  period: string;
  aggregatedAt: string;
}

export class UsageMetricsAggregator {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  /** ASYNC-ONLY: must only be called from a queue consumer — never on live request path. */
  async aggregate(
    tenantId: string,
    period: string,
  ): Promise<DataProcessResult<MetricsAggregationResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!period) return DataProcessResult.failure('MISSING_PERIOD', 'period is required');

    // Read raw usage events for this period
    const rawResult = await this.db.searchDocuments('flow30-raw-usage-events', {
      tenantId,
      period,
    });
    if (!rawResult.isSuccess)
      return DataProcessResult.failure(rawResult.errorCode!, rawResult.errorMessage!);

    const rawEvents = rawResult.data ?? [];
    const compute = rawEvents.reduce((sum, e) => sum + ((e['compute'] as number) ?? 0), 0);
    const storage = rawEvents.reduce((sum, e) => sum + ((e['storage'] as number) ?? 0), 0);
    const requests = rawEvents.reduce((sum, e) => sum + ((e['requests'] as number) ?? 0), 0);

    const metricsId = randomUUID();
    const aggregatedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      metricsId,
      tenantId,
      period,
      compute,
      storage,
      requests,
      aggregatedAt,
    };

    const stored = await this.db.storeDocument('flow30-usage-metrics', doc, metricsId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('usage.metrics.aggregated', {
      metricsId,
      tenantId,
      period,
      compute,
      storage,
      requests,
      aggregatedAt,
    });

    return DataProcessResult.success({ metricsId, period, aggregatedAt });
  }
}
