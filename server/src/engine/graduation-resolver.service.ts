/**
 * GraduationResolverService — resolves which AI model to use per curriculum tier,
 * and handles regression reversion when a graduated tier falls below threshold.
 *
 * B-3: Per-tier graduation FREEDOM config + regression reversion.
 *
 * Resolution:
 *   - Tier not graduated → returns 'AI_ENGINE' (paid model token)
 *   - Tier graduated     → returns OSS model string from FREEDOM config
 *   - Regression         → after regressionConsecutiveFailures consecutive
 *                          below-threshold scores, reverts graduated → false
 */

import { Injectable, Optional, Inject, OnModuleInit } from '@nestjs/common';
import { FreedomConfigManager } from '../freedom/config-manager';
import { CurriculumTierResolver, CurriculumTier } from './curriculum-tier-resolver.service';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';

export type ModelToken = string;

const GRADUATION_THRESHOLD_DEFAULTS: Record<CurriculumTier, number> = {
  1: 0.05,
  2: 0.05,
  3: 0.08,
  4: 0.1,
  5: 0.12,
};

const TIER_THRESHOLD_KEYS: Record<CurriculumTier, string> = {
  1: 'shadowRun.graduationThreshold.tier1',
  2: 'shadowRun.graduationThreshold.tier2',
  3: 'shadowRun.graduationThreshold.tier3',
  4: 'shadowRun.graduationThreshold.tier4',
  5: 'shadowRun.graduationThreshold.tier5',
};

/** Per-tier in-memory graduation state. */
interface TierGraduationState {
  graduated: boolean;
  consecutiveFailures: number;
}

const SYSTEM_TENANT = 'system';

@Injectable()
export class GraduationResolverService implements OnModuleInit {
  /** Per-tier graduation state — persisted to ES, rebuilt on startup via onModuleInit. */
  private readonly graduationState = new Map<CurriculumTier, TierGraduationState>();

  constructor(
    @Optional() private readonly freedomConfig?: FreedomConfigManager,
    // CurriculumTierResolver is injected so this service is wired to the resolver
    // dependency declared in S1-04. Not called directly here — kept for DI graph.
    @Optional() private readonly _tierResolver?: CurriculumTierResolver,
    @Optional() @Inject(DATABASE_SERVICE) private readonly db?: IDatabaseService,
  ) {
    // Initialize all tiers as ungraduated — onModuleInit overwrites from ES on startup
    ([1, 2, 3, 4, 5] as CurriculumTier[]).forEach((t) =>
      this.graduationState.set(t, { graduated: false, consecutiveFailures: 0 }),
    );
  }

  /**
   * Rebuild graduation state from ES on startup.
   * Reads one fixed-ID document per tier (graduation-state::tier-N).
   * If ES is unavailable, all tiers default to ungraduated (safe conservative default).
   * DNA-3: never throws.
   */
  async onModuleInit(): Promise<void> {
    if (!this.db) return;
    try {
      for (const tier of [1, 2, 3, 4, 5] as CurriculumTier[]) {
        const result = await this.db.searchDocuments('xiigen-calibration-baseline', {
          eventType: 'GRADUATION_STATE',
          tier,
        });
        if (result.isSuccess && Array.isArray(result.data) && result.data.length > 0) {
          const doc = result.data[0] as Record<string, unknown>;
          const state = this.graduationState.get(tier);
          if (state) {
            state.graduated = doc['graduated'] === true;
            state.consecutiveFailures =
              typeof doc['consecutiveFailures'] === 'number'
                ? (doc['consecutiveFailures'] as number)
                : 0;
          }
        }
      }
    } catch {
      // DNA-3 — never throws; safe default is all tiers ungraduated
    }
  }

  /**
   * Return the AI model token to use for a given tier.
   *   - Tier not graduated → 'AI_ENGINE' (paid model token)
   *   - Tier graduated     → OSS model string from FREEDOM config
   */
  resolveGeneratorForTier(tier: CurriculumTier): ModelToken {
    const state = this.graduationState.get(tier);
    if (state?.graduated) {
      const ossModel = this.getConfigValue(
        'xiigen.oss_target_model',
        'deepseek-coder-v2',
      ) as string;
      return ossModel;
    }
    return 'AI_ENGINE';
  }

  /**
   * Check for regression after a scored generation.
   *   - Below-threshold score: increment consecutiveFailures.
   *   - After regressionConsecutiveFailures consecutive failures on a graduated
   *     tier: revert graduated → false and reset counter.
   *   - Above-threshold score: reset counter to 0.
   * Never throws.
   */
  async checkForRegression(tier: CurriculumTier, score: number): Promise<void> {
    try {
      const threshold = this.getConfigValue(
        TIER_THRESHOLD_KEYS[tier],
        GRADUATION_THRESHOLD_DEFAULTS[tier],
      ) as number;
      const maxConsecutive = this.getConfigValue(
        'shadowRun.regressionConsecutiveFailures',
        2,
      ) as number;

      const state = this.graduationState.get(tier);
      if (!state) return;

      if (score < threshold) {
        state.consecutiveFailures++;
        if (state.graduated && state.consecutiveFailures >= maxConsecutive) {
          state.graduated = false;
          state.consecutiveFailures = 0;
          console.warn(
            `[GraduationResolver] CALIBRATION_REGRESSION: Tier ${tier} reverted to paid model ` +
              `after ${maxConsecutive} consecutive failures below ${threshold}`,
          );
          // Persist updated state (graduated=false) so restart doesn't re-promote
          this.persistGraduationState(tier, false, 0).catch(() => {
            /* non-blocking */
          });
          // Regression-specific observability event (separate from state record)
          this.storeRegressionSignal(tier, threshold, score).catch(() => {
            /* non-blocking */
          });
        }
      } else {
        state.consecutiveFailures = 0;
      }
    } catch {
      // Never throws — defensive wrapper
    }
  }

  /** Mark a tier as graduated (called by shadow run promotion logic). Persists to ES. */
  graduateTier(tier: CurriculumTier): void {
    const state = this.graduationState.get(tier);
    if (state) {
      state.graduated = true;
      state.consecutiveFailures = 0;
      this.persistGraduationState(tier, true, 0).catch(() => {
        /* non-blocking */
      });
    }
  }

  /** Return whether a given tier is currently graduated. */
  isTierGraduated(tier: CurriculumTier): boolean {
    return this.graduationState.get(tier)?.graduated ?? false;
  }

  /** Return current consecutiveFailures count for a tier (for testing/observability). */
  getConsecutiveFailures(tier: CurriculumTier): number {
    return this.graduationState.get(tier)?.consecutiveFailures ?? 0;
  }

  // ── private helpers ─────────────────────────────────────────────────────────

  private getConfigValue(key: string, fallback: unknown): unknown {
    if (!this.freedomConfig) return fallback;
    return this.freedomConfig.getValue(SYSTEM_TENANT, key, fallback);
  }

  /**
   * Upsert the canonical graduation state document for a tier.
   * Fixed document ID (graduation-state::tier-N) → always overwrites → single source of truth.
   * Read back by onModuleInit on restart. Non-blocking — never throws.
   */
  private async persistGraduationState(
    tier: CurriculumTier,
    graduated: boolean,
    consecutiveFailures: number,
  ): Promise<void> {
    if (!this.db) return;
    await this.db
      .storeDocument(
        'xiigen-calibration-baseline',
        {
          eventType: 'GRADUATION_STATE',
          tier,
          graduated,
          consecutiveFailures,
          updatedAt: new Date().toISOString(),
        },
        `graduation-state::tier-${tier}`, // fixed ID — upsert semantics
      )
      .catch(() => {
        /* non-blocking */
      });
  }

  private async storeRegressionSignal(
    tier: CurriculumTier,
    threshold: number,
    score: number,
  ): Promise<void> {
    // DNA-8: store regression event so graduation state can be reconstructed on restart
    if (!this.db) return;
    const id = `graduation-regression::tier-${tier}::${Date.now()}`;
    await this.db
      .storeDocument(
        'xiigen-calibration-baseline',
        {
          eventType: 'GRADUATION_REGRESSION',
          tier,
          threshold,
          score,
          revertedAt: new Date().toISOString(),
        },
        id,
      )
      .catch(() => {
        // Non-blocking — regression signal is observability, never blocks the caller
      });
  }
}
