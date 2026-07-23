/**
 * PromptAbTester — manages A/B testing of prompt versions.
 *
 * Selects champion or candidate based on configurable split ratio.
 * Records results per version. Auto-promotes candidates that beat champions.
 *
 * Split ratio default: 80% champion / 20% candidate (FREEDOM-configurable).
 * Auto-promotion: candidate avgScore > champion avgScore + threshold, with minSamples met.
 *
 * DNA-3: all methods return DataProcessResult.
 * DNA-5: tenantId required where applicable.
 *
 * Phase 12.3.
 */

import { Injectable, Optional } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { PromptVersionStore } from './prompt-version-store';
import {
  type PromptVersion,
  type PromptTestResult,
  type PromptStats,
  type PromotionConfig,
  DEFAULT_PROMOTION_CONFIG,
} from './prompt-types';

// ── PromotionResult ─────────────────────────────────

export interface PromotionResult {
  readonly promoted: boolean;
  readonly versionId?: string;
  readonly reason: string;
}

// ── A/B Tester ──────────────────────────────────────

@Injectable()
export class PromptAbTester {
  /** Test results per prompt version ID. */
  private readonly results = new Map<string, PromptTestResult[]>();

  /** Champion traffic ratio (0.0–1.0). Default 0.8 = 80% champion. */
  readonly championRatio: number;

  /** Promotion config. */
  readonly promotionConfig: PromotionConfig;

  constructor(
    private readonly store: PromptVersionStore,
    @Optional() config?: { championRatio?: number; promotionConfig?: Partial<PromotionConfig> },
  ) {
    this.championRatio = config?.championRatio ?? 0.8;
    this.promotionConfig = { ...DEFAULT_PROMOTION_CONFIG, ...config?.promotionConfig };
  }

  /**
   * Select a prompt version for a generation run.
   * Returns champion (championRatio %) or a random candidate (1 - championRatio %).
   */
  selectPrompt(tenantId: string, taskType: string, role: string): DataProcessResult<PromptVersion> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }

    const championResult = this.store.getChampion(taskType, role);
    const champion = championResult.isSuccess ? championResult.data : null;

    const candidatesResult = this.store.getCandidates(taskType, role);
    const candidates = candidatesResult.isSuccess ? candidatesResult.data! : [];

    // No champion and no candidates → nothing to select
    if (!champion && candidates.length === 0) {
      return DataProcessResult.failure(
        'NO_PROMPTS',
        `No prompt versions available for ${taskType}/${role}`,
      );
    }

    // No candidates → always champion
    if (candidates.length === 0 && champion) {
      return DataProcessResult.success(champion);
    }

    // No champion → pick first candidate
    if (!champion && candidates.length > 0) {
      return DataProcessResult.success(candidates[0]);
    }

    // Both exist → A/B split
    if (Math.random() < this.championRatio) {
      return DataProcessResult.success(champion!);
    }

    // Pick a random candidate
    const idx = Math.floor(Math.random() * candidates.length);
    return DataProcessResult.success(candidates[idx]);
  }

  /**
   * Record a test result for a prompt version.
   */
  recordResult(
    tenantId: string,
    promptVersionId: string,
    score: number,
    passed: boolean,
    taskType = '',
  ): DataProcessResult<boolean> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }

    const existing = this.results.get(promptVersionId) ?? [];
    existing.push({
      promptVersionId,
      tenantId,
      score,
      passed,
      taskType,
      timestamp: new Date().toISOString(),
    });
    this.results.set(promptVersionId, existing);

    return DataProcessResult.success(true);
  }

  /**
   * Get aggregated statistics for a prompt version.
   */
  getStats(promptVersionId: string): DataProcessResult<PromptStats> {
    const results = this.results.get(promptVersionId) ?? [];
    const sampleCount = results.length;

    if (sampleCount === 0) {
      return DataProcessResult.success({
        versionId: promptVersionId,
        avgScore: 0,
        sampleCount: 0,
        passRate: 0,
        confidenceLevel: 'low',
      });
    }

    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const passCount = results.filter((r) => r.passed).length;

    let confidenceLevel: 'low' | 'medium' | 'high' = 'low';
    if (sampleCount >= 20) confidenceLevel = 'high';
    else if (sampleCount >= 5) confidenceLevel = 'medium';

    return DataProcessResult.success({
      versionId: promptVersionId,
      avgScore: Math.round((totalScore / sampleCount) * 10000) / 10000,
      sampleCount,
      passRate: Math.round((passCount / sampleCount) * 10000) / 10000,
      confidenceLevel,
    });
  }

  /**
   * Check if any candidate should be promoted for a task type + role.
   *
   * Promotion criteria:
   * 1. Candidate has >= minSamples results
   * 2. Candidate avgScore > champion avgScore + scoreThreshold
   *
   * If promoted: candidate → champion, old champion → retired.
   */
  checkPromotion(taskType: string, role: string): DataProcessResult<PromotionResult> {
    if (!this.promotionConfig.autoPromote) {
      return DataProcessResult.success({
        promoted: false,
        reason: 'Auto-promotion disabled',
      });
    }

    const championResult = this.store.getChampion(taskType, role);
    const champion = championResult.isSuccess ? championResult.data : null;

    const candidatesResult = this.store.getCandidates(taskType, role);
    const candidates = candidatesResult.isSuccess ? candidatesResult.data! : [];

    if (candidates.length === 0) {
      return DataProcessResult.success({
        promoted: false,
        reason: 'No candidates',
      });
    }

    // Get champion stats
    const championStats = champion
      ? this.getStats(champion.id).data!
      : { avgScore: 0, sampleCount: 0 };

    // Check each candidate
    for (const candidate of candidates) {
      const candidateStats = this.getStats(candidate.id).data!;

      // Check minimum samples
      if (candidateStats.sampleCount < this.promotionConfig.minSamples) {
        continue;
      }

      // Check score threshold
      const scoreDelta = candidateStats.avgScore - championStats.avgScore;
      if (scoreDelta >= this.promotionConfig.scoreThreshold) {
        // Promote!
        const promoteResult = this.store.promote(candidate.id);
        if (promoteResult.isSuccess) {
          return DataProcessResult.success({
            promoted: true,
            versionId: candidate.id,
            reason: `Score delta ${Math.round(scoreDelta * 10000) / 10000} >= threshold ${this.promotionConfig.scoreThreshold}`,
          });
        }
      }
    }

    return DataProcessResult.success({
      promoted: false,
      reason: 'No candidate met promotion criteria',
    });
  }

  /**
   * Get all test results for a prompt version (raw).
   */
  getResults(promptVersionId: string): PromptTestResult[] {
    return [...(this.results.get(promptVersionId) ?? [])];
  }

  /**
   * Clear all results (for testing).
   */
  clear(): void {
    this.results.clear();
  }

  /** Export full store state for snapshot persistence. */
  exportState(): Array<{ promptVersionId: string; results: PromptTestResult[] }> {
    return Array.from(this.results.entries()).map(([promptVersionId, results]) => ({
      promptVersionId,
      results: [...results],
    }));
  }

  /** Import store state from a snapshot. Clears existing data first. */
  importState(data: Array<{ promptVersionId: string; results: PromptTestResult[] }>): void {
    this.results.clear();
    for (const { promptVersionId, results } of data) {
      this.results.set(promptVersionId, results);
    }
  }
}
