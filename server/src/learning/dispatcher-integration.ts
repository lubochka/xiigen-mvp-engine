/**
 * DispatcherIntegration — enhances AiDispatcher output selection with model preference.
 *
 * When multiple model outputs have similar quality scores (within a configurable gap),
 * uses historical model preference to break ties.
 *
 * Does NOT modify AiDispatcher — just provides a recommendation layer.
 *
 * DNA-3: returns DataProcessResult.
 *
 * Phase 12.2.
 */

import { Injectable, Optional } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { ModelPreferenceTracker } from './model-preference';

@Injectable()
export class DispatcherIntegration {
  /** Score gap threshold: if top two outputs are within this gap, use preference. */
  readonly tieThreshold: number;

  constructor(
    private readonly tracker: ModelPreferenceTracker,
    @Optional() config?: { tieThreshold?: number },
  ) {
    this.tieThreshold = config?.tieThreshold ?? 0.05;
  }

  /**
   * Enhanced output selection: uses model preference to break ties.
   *
   * @param tenantId Tenant scope.
   * @param taskType Task type for preference lookup.
   * @param outputs Scored outputs from AiDispatcher, each with `model_id` and `total_score`.
   * @returns The best output, potentially re-ranked by preference when scores are close.
   */
  enhancedSelect(
    tenantId: string,
    taskType: string,
    outputs: Array<Record<string, unknown>>,
  ): DataProcessResult<Record<string, unknown>> {
    if (!outputs || outputs.length === 0) {
      return DataProcessResult.failure('NO_OUTPUTS', 'No outputs to select from');
    }

    if (outputs.length === 1) {
      return DataProcessResult.success(outputs[0]);
    }

    // Sort by total_score descending
    const sorted = [...outputs].sort(
      (a, b) => ((b.total_score as number) ?? 0) - ((a.total_score as number) ?? 0),
    );

    const topScore = (sorted[0].total_score as number) ?? 0;
    const secondScore = (sorted[1].total_score as number) ?? 0;
    const gap = topScore - secondScore;

    // If clear winner (gap > threshold), use original ranking
    if (gap > this.tieThreshold) {
      return DataProcessResult.success({
        ...sorted[0],
        selection_reason: 'score_gap',
        score_gap: Math.round(gap * 10000) / 10000,
      });
    }

    // Tie scenario: consult model preference
    const rankingResult = this.tracker.getRanking(tenantId, taskType);
    if (!rankingResult.isSuccess || !rankingResult.data || rankingResult.data.length === 0) {
      // No preference data → use original ranking
      return DataProcessResult.success({
        ...sorted[0],
        selection_reason: 'no_preference_data',
      });
    }

    const rankings = rankingResult.data;
    const rankMap = new Map(rankings.map((r, idx) => [r.modelId, idx]));

    // Among outputs within the tie threshold, pick the one with best preference ranking
    const tiedOutputs = sorted.filter(
      (o) => topScore - ((o.total_score as number) ?? 0) <= this.tieThreshold,
    );

    let bestByPreference = tiedOutputs[0];
    let bestPreferenceRank = Infinity;

    for (const output of tiedOutputs) {
      const modelId = (output.model_id as string) ?? '';
      const prefRank = rankMap.get(modelId) ?? Infinity;
      if (prefRank < bestPreferenceRank) {
        bestPreferenceRank = prefRank;
        bestByPreference = output;
      }
    }

    return DataProcessResult.success({
      ...bestByPreference,
      selection_reason: 'preference_tiebreak',
      score_gap: Math.round(gap * 10000) / 10000,
      preferred_model: (bestByPreference.model_id as string) ?? 'unknown',
    });
  }
}
