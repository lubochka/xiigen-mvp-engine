/**
 * ModelSelectionStrategy — selects which AI model to use for a generation.
 *
 * Strategies:
 *   BEST        — always pick the top-ranked model
 *   EXPLORE     — epsilon-greedy: 80% best, 20% random other
 *   ROUND_ROBIN — cycle through models equally
 *
 * Falls back to first available model when no ranking data exists.
 * Strategy is FREEDOM-configurable per tenant.
 *
 * DNA-3: returns DataProcessResult.
 * DNA-5: tenantId required.
 *
 * Phase 12.2.
 */

import { Injectable, Optional } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { ModelPreferenceTracker } from './model-preference';

// ── Strategy Enum ───────────────────────────────────

export enum SelectionStrategy {
  BEST = 'BEST',
  EXPLORE = 'EXPLORE',
  ROUND_ROBIN = 'ROUND_ROBIN',
}

// ── Selector ────────────────────────────────────────

@Injectable()
export class ModelSelectionStrategy {
  /** Round-robin counters per tenant::taskType. */
  private readonly roundRobinCounters = new Map<string, number>();

  /** Exploration rate for EXPLORE strategy (0.0–1.0). */
  readonly exploreRate: number;

  constructor(
    private readonly tracker: ModelPreferenceTracker,
    @Optional() config?: { exploreRate?: number },
  ) {
    this.exploreRate = config?.exploreRate ?? 0.2;
  }

  /**
   * Select a model using the given strategy.
   */
  selectModel(
    tenantId: string,
    taskType: string,
    availableModels: string[],
    strategy: SelectionStrategy = SelectionStrategy.EXPLORE,
  ): DataProcessResult<string> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }
    if (!availableModels || availableModels.length === 0) {
      return DataProcessResult.failure('NO_MODELS', 'No available models provided');
    }

    // Single model → no choice needed
    if (availableModels.length === 1) {
      return DataProcessResult.success(availableModels[0]);
    }

    switch (strategy) {
      case SelectionStrategy.BEST:
        return this.selectBest(tenantId, taskType, availableModels);
      case SelectionStrategy.EXPLORE:
        return this.selectExplore(tenantId, taskType, availableModels);
      case SelectionStrategy.ROUND_ROBIN:
        return this.selectRoundRobin(tenantId, taskType, availableModels);
      default:
        return this.selectBest(tenantId, taskType, availableModels);
    }
  }

  // ── BEST ──────────────────────────────────────────

  private selectBest(
    tenantId: string,
    taskType: string,
    availableModels: string[],
  ): DataProcessResult<string> {
    const bestResult = this.tracker.getBestModel(tenantId, taskType);
    if (!bestResult.isSuccess) {
      return DataProcessResult.success(availableModels[0]);
    }

    const bestModel = bestResult.data;
    if (bestModel && availableModels.includes(bestModel)) {
      return DataProcessResult.success(bestModel);
    }

    // Best model not in available list → fallback
    return DataProcessResult.success(availableModels[0]);
  }

  // ── EXPLORE (epsilon-greedy) ──────────────────────

  private selectExplore(
    tenantId: string,
    taskType: string,
    availableModels: string[],
  ): DataProcessResult<string> {
    // With probability (1 - exploreRate), pick best
    if (Math.random() >= this.exploreRate) {
      return this.selectBest(tenantId, taskType, availableModels);
    }

    // With probability exploreRate, pick a random model (excluding best if possible)
    const bestResult = this.tracker.getBestModel(tenantId, taskType);
    const bestModel = bestResult.isSuccess ? bestResult.data : null;

    const others = bestModel ? availableModels.filter((m) => m !== bestModel) : availableModels;

    if (others.length === 0) {
      return DataProcessResult.success(availableModels[0]);
    }

    const randomIdx = Math.floor(Math.random() * others.length);
    return DataProcessResult.success(others[randomIdx]);
  }

  // ── ROUND_ROBIN ───────────────────────────────────

  private selectRoundRobin(
    tenantId: string,
    taskType: string,
    availableModels: string[],
  ): DataProcessResult<string> {
    const key = `${tenantId}::${taskType}`;
    const counter = this.roundRobinCounters.get(key) ?? 0;
    const idx = counter % availableModels.length;

    this.roundRobinCounters.set(key, counter + 1);

    return DataProcessResult.success(availableModels[idx]);
  }
}
