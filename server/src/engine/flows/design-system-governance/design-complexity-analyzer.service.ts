/**
 * DesignComplexityAnalyzer — T502 [EVALUATION].
 *
 * Scores design complexity: component tree depth, prop count, token usage breadth,
 * pattern reuse ratio. Produces complexity score 0.0–1.0.
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

export interface DesignComplexityResult {
  analysisId: string;
  specId: string;
  complexityScore: number;
  analyzedAt: string;
}

export class DesignComplexityAnalyzer {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async analyze(
    tenantId: string,
    specId: string,
    metrics: {
      componentTreeDepth: number;
      totalPropCount: number;
      uniqueTokensUsed: number;
      patternReuseRatio: number; // 0.0–1.0 (higher = more reuse = less complex)
    },
  ): Promise<DataProcessResult<DesignComplexityResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');

    // Weighted complexity: depth(30%) + props(20%) + tokens(20%) − reuseBonus(30%)
    const depthNorm = Math.min(metrics.componentTreeDepth / 10, 1.0);
    const propNorm = Math.min(metrics.totalPropCount / 50, 1.0);
    const tokenNorm = Math.min(metrics.uniqueTokensUsed / 30, 1.0);
    const reuseBonus = Math.max(0, metrics.patternReuseRatio);

    const raw = depthNorm * 0.3 + propNorm * 0.2 + tokenNorm * 0.2 - reuseBonus * 0.3;
    const complexityScore = Math.min(Math.max(raw, 0.0), 1.0);

    const analysisId = randomUUID();
    const analyzedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      analysisId,
      tenantId,
      specId,
      complexityScore,
      metrics,
      analyzedAt,
    };

    const stored = await this.db.storeDocument('flow31-complexity-analyses', doc, analysisId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.complexity.scored', {
      analysisId,
      tenantId,
      specId,
      complexityScore,
      analyzedAt,
    });

    return DataProcessResult.success({ analysisId, specId, complexityScore, analyzedAt });
  }
}
