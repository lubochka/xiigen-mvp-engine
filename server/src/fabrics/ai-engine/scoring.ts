/**
 * AI Engine Fabric — Output Scoring + Consensus Selection.
 * Scores model outputs against a rubric and selects the best.
 * Used by AiDispatcher for AF-10 Merge pattern.
 *
 * Rubric: { criterion: weight } e.g. { quality: 0.5, length: 0.3, speed: 0.2 }
 * Each criterion scored 0.0–1.0, multiplied by weight, summed for total.
 * Sorted by total_score desc, then cost asc (cheaper wins ties).
 */

export const DEFAULT_RUBRIC: Record<string, number> = {
  quality: 0.5,
  length: 0.3,
  speed: 0.2,
};

export class OutputScorer {
  /**
   * Score and rank outputs. Each output must have at least 'text' and 'model_id'.
   * Returns list sorted by total_score descending, cost ascending for ties.
   */
  scoreOutputs(
    outputs: Array<Record<string, unknown>>,
    rubric?: Record<string, number>,
  ): Array<Record<string, unknown>> {
    if (!outputs || outputs.length === 0) return [];

    const activeRubric = rubric ?? DEFAULT_RUBRIC;
    const scored: Array<Record<string, unknown>> = [];

    for (const out of outputs) {
      if (!out || typeof out !== 'object') continue;

      const text = (out['text'] as string) ?? '';
      const breakdown: Record<string, number> = {};

      for (const [criterion, weight] of Object.entries(activeRubric)) {
        const raw = this.scoreCriterion(criterion, out);
        breakdown[criterion] = Math.round(raw * weight * 10000) / 10000;
      }

      const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

      scored.push({
        model_id: out['model_id'] ?? out['model'] ?? 'unknown',
        text,
        total_score: Math.round(total * 10000) / 10000,
        breakdown,
        cost: (out['cost'] as number) ?? 0,
        tokens_used: out['tokens_used'] ?? {},
      });
    }

    // Sort by score desc, then cost asc (cheaper wins ties)
    scored.sort((a, b) => {
      const scoreDiff = (b['total_score'] as number) - (a['total_score'] as number);
      if (scoreDiff !== 0) return scoreDiff;
      return (a['cost'] as number) - (b['cost'] as number);
    });

    return scored;
  }

  /**
   * Score outputs and return the best one, or undefined if empty.
   */
  selectBest(
    outputs: Array<Record<string, unknown>>,
    rubric?: Record<string, number>,
  ): Record<string, unknown> | undefined {
    const scored = this.scoreOutputs(outputs, rubric);
    return scored[0];
  }

  /**
   * Heuristic scoring for a single criterion. Returns 0.0–1.0.
   * Extensible — subclass and override for custom criteria.
   */
  scoreCriterion(criterion: string, output: Record<string, unknown>): number {
    const text = (output['text'] as string) ?? '';

    switch (criterion) {
      case 'quality': {
        if (!text) return 0.0;
        const len = text.length;
        if (len < 10) return 0.2;
        if (len < 100) return 0.5;
        if (len < 1000) return 0.8;
        return 1.0;
      }

      case 'length': {
        const len = text.length;
        if (len === 0) return 0.0;
        if (len >= 50 && len <= 2000) return 1.0;
        if (len < 50) return len / 50.0;
        return Math.max(0.3, 1.0 - (len - 2000) / 10000.0);
      }

      case 'speed': {
        const elapsed = (output['elapsed_ms'] as number) ?? 0;
        if (elapsed <= 0) return 0.5; // neutral if unknown
        if (elapsed < 500) return 1.0;
        if (elapsed < 2000) return 0.7;
        if (elapsed < 5000) return 0.4;
        return 0.2;
      }

      case 'correctness':
        return this.scoreCriterion('quality', output);

      case 'dna_compliance': {
        if (!text) return 0.0;
        let score = 0.5;
        for (const kw of ['DataProcessResult', 'tenant_id', 'MicroserviceBase']) {
          if (text.includes(kw)) score += 0.15;
        }
        return Math.min(score, 1.0);
      }

      case 'style':
        return text ? 0.7 : 0.0;

      default:
        return 0.5; // unknown criterion = neutral
    }
  }
}
