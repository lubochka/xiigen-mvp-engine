/**
 * ModelPreferenceTracker — tracks which AI model performs best per task type.
 *
 * Records generation results (model + score) and builds rankings.
 * Supports decay: older results weighted less via configurable halflife.
 * Minimum sample size before a model appears in rankings.
 *
 * DNA-3: all methods return DataProcessResult.
 * DNA-5: tenantId required.
 *
 * Phase 12.2.
 */

import { Injectable, Optional } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';

// ── Types ───────────────────────────────────────────

/** A single generation result for a model. */
export interface ModelResult {
  readonly modelId: string;
  readonly taskType: string;
  readonly score: number;
  readonly passed: boolean;
  readonly recordedAt: number; // epoch ms for decay calc
}

/** Aggregated ranking for a model on a task type. */
export interface ModelRanking {
  readonly modelId: string;
  readonly avgScore: number;
  readonly count: number;
  readonly passRate: number;
  readonly lastUsed: string; // ISO timestamp
}

// ── Tracker ─────────────────────────────────────────

@Injectable()
export class ModelPreferenceTracker {
  /** In-memory store: key = `${tenantId}::${taskType}`, value = results array. */
  private readonly results = new Map<string, ModelResult[]>();

  /** Minimum results before a model appears in rankings. */
  readonly minSamples: number;
  /** Decay halflife in number of generations. */
  readonly decayHalflife: number;

  constructor(@Optional() config?: { minSamples?: number; decayHalflife?: number }) {
    this.minSamples = config?.minSamples ?? 3;
    this.decayHalflife = config?.decayHalflife ?? 50;
  }

  /**
   * Record a generation result for a model.
   */
  recordResult(
    tenantId: string,
    taskType: string,
    modelId: string,
    score: number,
    passed = true,
  ): DataProcessResult<boolean> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }

    const key = this.key(tenantId, taskType);
    const existing = this.results.get(key) ?? [];
    existing.push({
      modelId,
      taskType,
      score,
      passed,
      recordedAt: Date.now(),
    });
    this.results.set(key, existing);

    return DataProcessResult.success(true);
  }

  /**
   * Get ranked models for a specific task type.
   * Models with fewer than minSamples results are excluded.
   * Results are decay-weighted: newer results count more.
   */
  getRanking(tenantId: string, taskType: string): DataProcessResult<ModelRanking[]> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }

    const key = this.key(tenantId, taskType);
    const results = this.results.get(key) ?? [];

    const rankings = this.buildRankings(results);
    return DataProcessResult.success(rankings);
  }

  /**
   * Get the best model for a task type (top of ranking), or null if insufficient data.
   */
  getBestModel(tenantId: string, taskType: string): DataProcessResult<string | null> {
    const rankingResult = this.getRanking(tenantId, taskType);
    if (!rankingResult.isSuccess)
      return DataProcessResult.failure(
        rankingResult.errorCode ?? 'RANKING_FAILED',
        rankingResult.errorMessage ?? 'Failed to get ranking',
      );

    const rankings = rankingResult.data!;
    if (rankings.length === 0) {
      return DataProcessResult.success(null);
    }

    return DataProcessResult.success(rankings[0].modelId);
  }

  /**
   * Get global ranking across all task types for a tenant.
   */
  getGlobalRanking(tenantId: string): DataProcessResult<ModelRanking[]> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }

    const allResults: ModelResult[] = [];
    const prefix = `${tenantId}::`;

    for (const [key, results] of this.results.entries()) {
      if (key.startsWith(prefix)) {
        allResults.push(...results);
      }
    }

    const rankings = this.buildRankings(allResults);
    return DataProcessResult.success(rankings);
  }

  /**
   * Get raw result count for a tenant + task type.
   */
  getResultCount(tenantId: string, taskType: string): number {
    return (this.results.get(this.key(tenantId, taskType)) ?? []).length;
  }

  /**
   * Clear all data (for testing).
   */
  clear(): void {
    this.results.clear();
  }

  /** Export full store state for snapshot persistence. */
  exportState(): Array<{ key: string; results: ModelResult[] }> {
    return Array.from(this.results.entries()).map(([key, results]) => ({
      key,
      results: [...results],
    }));
  }

  /** Import store state from a snapshot. Clears existing data first. */
  importState(data: Array<{ key: string; results: ModelResult[] }>): void {
    this.results.clear();
    for (const { key, results } of data) {
      this.results.set(key, results);
    }
  }

  // ── Internal ──────────────────────────────────────

  private buildRankings(results: ModelResult[]): ModelRanking[] {
    if (results.length === 0) return [];

    // Group by model
    const modelMap = new Map<
      string,
      {
        weightedScoreSum: number;
        weightSum: number;
        count: number;
        passCount: number;
        lastRecordedAt: number;
      }
    >();

    // Find the newest result for decay reference
    const newestAt = Math.max(...results.map((r) => r.recordedAt));

    for (const r of results) {
      const existing = modelMap.get(r.modelId) ?? {
        weightedScoreSum: 0,
        weightSum: 0,
        count: 0,
        passCount: 0,
        lastRecordedAt: 0,
      };

      // Decay weight: more recent = higher weight
      const age = newestAt - r.recordedAt;
      // Using exponential decay based on index position rather than time
      // halflife = N generations → weight = 0.5^(age_in_generations / halflife)
      // Approximate age_in_generations by ranking this result's position
      const decayWeight = Math.pow(0.5, age / (this.decayHalflife * 1000 + 1));

      existing.weightedScoreSum += r.score * decayWeight;
      existing.weightSum += decayWeight;
      existing.count++;
      if (r.passed) existing.passCount++;
      if (r.recordedAt > existing.lastRecordedAt) {
        existing.lastRecordedAt = r.recordedAt;
      }
      modelMap.set(r.modelId, existing);
    }

    // Build rankings, filtering by minSamples
    const rankings: ModelRanking[] = [];

    for (const [modelId, data] of modelMap.entries()) {
      if (data.count < this.minSamples) continue;

      const avgScore = data.weightSum > 0 ? data.weightedScoreSum / data.weightSum : 0;

      rankings.push({
        modelId,
        avgScore: Math.round(avgScore * 10000) / 10000,
        count: data.count,
        passRate: Math.round((data.passCount / data.count) * 10000) / 10000,
        lastUsed: new Date(data.lastRecordedAt).toISOString(),
      });
    }

    // Sort by avgScore descending
    rankings.sort((a, b) => b.avgScore - a.avgScore);

    return rankings;
  }

  private key(tenantId: string, taskType: string): string {
    return `${tenantId}::${taskType}`;
  }
}
