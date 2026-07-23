/**
 * RagQualityTracker — adjusts RAG pattern quality weights based on generation outcomes.
 *
 * Weight calculation:
 *   Initial weight: 0.5
 *   On success: weight += 0.1 × (1 - currentWeight)  → converges toward 1.0
 *   On failure: weight -= 0.1 × currentWeight         → converges toward 0.0
 *   Clamped to [0.01, 1.0]
 *
 * DNA-3: all methods return DataProcessResult.
 * DNA-5: tenantId required.
 *
 * Phase 12.4.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';

// ── Types ───────────────────────────────────────────

interface PatternWeightEntry {
  weight: number;
  successCount: number;
  failureCount: number;
  lastUpdated: string;
}

export interface PatternWeight {
  readonly patternId: string;
  readonly weight: number;
}

// ── Constants ───────────────────────────────────────

const INITIAL_WEIGHT = 0.5;
const ADJUSTMENT_RATE = 0.1;
const MIN_WEIGHT = 0.01;
const MAX_WEIGHT = 1.0;

// ── Tracker ─────────────────────────────────────────

@Injectable()
export class RagQualityTracker {
  /** In-memory store: key = `${tenantId}::${patternId}`. */
  private readonly weights = new Map<string, PatternWeightEntry>();

  /**
   * Record that a pattern was used in a generation that succeeded or failed.
   */
  recordPatternUsage(
    tenantId: string,
    patternId: string,
    success: boolean,
  ): DataProcessResult<boolean> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }
    if (!patternId) {
      return DataProcessResult.failure('MISSING_PATTERN', 'patternId required');
    }

    const key = this.key(tenantId, patternId);
    const entry = this.weights.get(key) ?? {
      weight: INITIAL_WEIGHT,
      successCount: 0,
      failureCount: 0,
      lastUpdated: '',
    };

    if (success) {
      // Converge toward 1.0
      entry.weight += ADJUSTMENT_RATE * (MAX_WEIGHT - entry.weight);
      entry.successCount++;
    } else {
      // Converge toward 0.0
      entry.weight -= ADJUSTMENT_RATE * entry.weight;
      entry.failureCount++;
    }

    // Clamp
    entry.weight = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, entry.weight));
    entry.weight = Math.round(entry.weight * 10000) / 10000;
    entry.lastUpdated = new Date().toISOString();

    this.weights.set(key, entry);
    return DataProcessResult.success(true);
  }

  /**
   * Get the current quality weight for a pattern.
   * Returns INITIAL_WEIGHT if never recorded.
   */
  getWeight(tenantId: string, patternId: string): DataProcessResult<number> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }

    const key = this.key(tenantId, patternId);
    const entry = this.weights.get(key);
    return DataProcessResult.success(entry?.weight ?? INITIAL_WEIGHT);
  }

  /**
   * Get the top N patterns by weight for a tenant.
   */
  getTopPatterns(tenantId: string, n: number): DataProcessResult<PatternWeight[]> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }

    const prefix = `${tenantId}::`;
    const patterns: PatternWeight[] = [];

    for (const [key, entry] of this.weights.entries()) {
      if (key.startsWith(prefix)) {
        const patternId = key.substring(prefix.length);
        patterns.push({ patternId, weight: entry.weight });
      }
    }

    // Sort by weight descending
    patterns.sort((a, b) => b.weight - a.weight);

    return DataProcessResult.success(patterns.slice(0, n));
  }

  /**
   * Manually boost a pattern's weight.
   */
  boostPattern(tenantId: string, patternId: string, amount: number): DataProcessResult<boolean> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }

    const key = this.key(tenantId, patternId);
    const entry = this.weights.get(key) ?? {
      weight: INITIAL_WEIGHT,
      successCount: 0,
      failureCount: 0,
      lastUpdated: '',
    };

    entry.weight = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, entry.weight + amount));
    entry.weight = Math.round(entry.weight * 10000) / 10000;
    entry.lastUpdated = new Date().toISOString();
    this.weights.set(key, entry);

    return DataProcessResult.success(true);
  }

  /**
   * Manually penalize a pattern's weight.
   */
  penalizePattern(tenantId: string, patternId: string, amount: number): DataProcessResult<boolean> {
    return this.boostPattern(tenantId, patternId, -amount);
  }

  /**
   * Get usage stats for a pattern.
   */
  getPatternStats(tenantId: string, patternId: string): DataProcessResult<Record<string, unknown>> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }

    const key = this.key(tenantId, patternId);
    const entry = this.weights.get(key);
    if (!entry) {
      return DataProcessResult.success({
        pattern_id: patternId,
        weight: INITIAL_WEIGHT,
        success_count: 0,
        failure_count: 0,
        last_updated: null,
      });
    }

    return DataProcessResult.success({
      pattern_id: patternId,
      weight: entry.weight,
      success_count: entry.successCount,
      failure_count: entry.failureCount,
      last_updated: entry.lastUpdated,
    });
  }

  /**
   * Clear all data (for testing).
   */
  clear(): void {
    this.weights.clear();
  }

  /** Export full store state for snapshot persistence. */
  exportState(): Array<{ key: string; entry: PatternWeightEntry }> {
    return Array.from(this.weights.entries()).map(([key, entry]) => ({ key, entry: { ...entry } }));
  }

  /** Import store state from a snapshot. Clears existing data first. */
  importState(data: Array<{ key: string; entry: PatternWeightEntry }>): void {
    this.weights.clear();
    for (const { key, entry } of data) {
      this.weights.set(key, entry);
    }
  }

  private key(tenantId: string, patternId: string): string {
    return `${tenantId}::${patternId}`;
  }
}
