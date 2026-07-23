/**
 * Promotion Ladder — tracks code maturity for generated artifacts.
 *
 * State machine: GENERATED → INJECTED → MINIMAL → CORE
 *   - GENERATED: just output by AF pipeline
 *   - INJECTED: injected into flow, passes basic tests
 *   - MINIMAL: passes DNA validation + BFA checks — deployable
 *   - CORE: production-hardened, full test coverage
 *
 * DNA-3: promote/demote return DataProcessResult.
 *
 * Phase 7.1: Guardrails.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';

/** Promotion levels — ordered by maturity. */
export enum PromotionLevel {
  GENERATED = 0,
  INJECTED = 1,
  MINIMAL = 2,
  CORE = 3,
}

/** All promotion level names, for display. */
export const PROMOTION_LEVEL_NAMES: Record<PromotionLevel, string> = {
  [PromotionLevel.GENERATED]: 'GENERATED',
  [PromotionLevel.INJECTED]: 'INJECTED',
  [PromotionLevel.MINIMAL]: 'MINIMAL',
  [PromotionLevel.CORE]: 'CORE',
};

@Injectable()
export class PromotionLadder {
  private readonly levels = new Map<string, PromotionLevel>();

  /**
   * Register an artifact at a given level (default: GENERATED).
   */
  register(artifactId: string, level: PromotionLevel = PromotionLevel.GENERATED): void {
    this.levels.set(artifactId, level);
  }

  /**
   * Get the current promotion level of an artifact.
   * Returns GENERATED if not registered.
   */
  getLevel(artifactId: string): PromotionLevel {
    return this.levels.get(artifactId) ?? PromotionLevel.GENERATED;
  }

  /**
   * Get the level name as a string.
   */
  getLevelName(artifactId: string): string {
    return PROMOTION_LEVEL_NAMES[this.getLevel(artifactId)];
  }

  /**
   * Promote an artifact one level up.
   * Fails if already at CORE.
   */
  promote(artifactId: string): DataProcessResult<string> {
    const current = this.getLevel(artifactId);

    if (current >= PromotionLevel.CORE) {
      return DataProcessResult.failure('ALREADY_CORE', `${artifactId} is already at CORE level`);
    }

    const newLevel = (current + 1) as PromotionLevel;
    this.levels.set(artifactId, newLevel);
    return DataProcessResult.success(PROMOTION_LEVEL_NAMES[newLevel]);
  }

  /**
   * Demote an artifact one level down.
   * Fails if already at GENERATED.
   */
  demote(artifactId: string): DataProcessResult<string> {
    const current = this.getLevel(artifactId);

    if (current <= PromotionLevel.GENERATED) {
      return DataProcessResult.failure(
        'ALREADY_GENERATED',
        `${artifactId} is already at GENERATED level`,
      );
    }

    const newLevel = (current - 1) as PromotionLevel;
    this.levels.set(artifactId, newLevel);
    return DataProcessResult.success(PROMOTION_LEVEL_NAMES[newLevel]);
  }

  /**
   * Check if an artifact meets the minimum deployment threshold.
   * Default minimum: MINIMAL.
   */
  canDeploy(artifactId: string, minLevel: PromotionLevel = PromotionLevel.MINIMAL): boolean {
    return this.getLevel(artifactId) >= minLevel;
  }

  /**
   * Check if an artifact is registered.
   */
  has(artifactId: string): boolean {
    return this.levels.has(artifactId);
  }

  /**
   * Number of tracked artifacts.
   */
  get count(): number {
    return this.levels.size;
  }

  /**
   * List all artifacts at a given level.
   */
  listByLevel(level: PromotionLevel): string[] {
    return [...this.levels.entries()].filter(([, l]) => l === level).map(([id]) => id);
  }

  /**
   * Clear all tracked artifacts (for testing).
   */
  clear(): void {
    this.levels.clear();
  }
}
