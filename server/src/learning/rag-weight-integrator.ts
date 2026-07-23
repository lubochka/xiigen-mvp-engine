/**
 * RagWeightIntegrator — re-ranks RAG search results using quality weights.
 *
 * Multiplies each result's relevance score by its quality weight from RagQualityTracker.
 * Re-sorts by weighted score descending.
 *
 * Does NOT modify AF-4 or IRagService — provides a recommendation layer.
 *
 * DNA-3: returns DataProcessResult.
 *
 * Phase 12.4.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { RagQualityTracker } from './rag-quality-tracker';

@Injectable()
export class RagWeightIntegrator {
  constructor(private readonly tracker: RagQualityTracker) {}

  /**
   * Re-rank RAG search results by multiplying relevance × quality weight.
   *
   * Each result is expected to have:
   *   - id or pattern_id: string — pattern identifier
   *   - score or relevance: number — original relevance score
   *
   * Returns results with added `weighted_score` and `quality_weight` fields.
   */
  reRankResults(
    tenantId: string,
    results: Array<Record<string, unknown>>,
  ): DataProcessResult<Array<Record<string, unknown>>> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }

    if (!results || results.length === 0) {
      return DataProcessResult.success([]);
    }

    const reRanked: Array<Record<string, unknown>> = [];

    for (const result of results) {
      const patternId = (result.id as string) ?? (result.pattern_id as string) ?? '';
      const relevance = (result.score as number) ?? (result.relevance as number) ?? 0;

      // Get quality weight
      const weightResult = this.tracker.getWeight(tenantId, patternId);
      const qualityWeight = weightResult.isSuccess ? weightResult.data! : 0.5;

      const weightedScore = Math.round(relevance * qualityWeight * 10000) / 10000;

      reRanked.push({
        ...result,
        quality_weight: qualityWeight,
        weighted_score: weightedScore,
        original_score: relevance,
      });
    }

    // Sort by weighted_score descending
    reRanked.sort((a, b) => (b.weighted_score as number) - (a.weighted_score as number));

    return DataProcessResult.success(reRanked);
  }
}
