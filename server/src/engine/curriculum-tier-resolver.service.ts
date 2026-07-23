import { Injectable } from '@nestjs/common';

/** Curriculum tier → training difficulty level.
 * Higher tier = more complex archetype = model needs more examples.
 * Source: FLOW-READINESS-COMBINED-ANALYSIS.md (canonical tier table).
 */
export type CurriculumTier = 1 | 2 | 3 | 4 | 5;

const ARCHETYPE_TIER_MAP: Record<string, CurriculumTier> = {
  ROUTING: 1,
  DATA_PIPELINE: 2,
  VALIDATION: 2,
  TRANSACTION: 3,
  FAN_IN: 3,
  BROADCAST: 3,
  REGISTRATION: 3,
  ORCHESTRATION: 4,
  CONVERGENCE: 4,
  SCHEDULED: 5,
};

/** Pattern types that always resolve to Tier 1 regardless of archetype. */
const TIER_1_PATTERN_TYPES = ['DESIGN_REASONING', 'CONVERGENCE_SESSION'];

@Injectable()
export class CurriculumTierResolver {
  /**
   * Resolve curriculum tier for a given archetype.
   * @param archetype - ContractArchetype string (case-insensitive)
   * @param patternType - Optional pattern type override (DESIGN_REASONING → Tier 1)
   * @throws Error with actionable message listing all valid archetypes if unrecognized
   */
  resolve(archetype: string, patternType?: string): CurriculumTier {
    if (patternType && TIER_1_PATTERN_TYPES.includes(patternType.toUpperCase())) {
      return 1;
    }
    const normalized = archetype.toUpperCase();
    const tier = ARCHETYPE_TIER_MAP[normalized];
    if (tier === undefined) {
      const valid = Object.keys(ARCHETYPE_TIER_MAP).join(', ');
      throw new Error(
        `CurriculumTierResolver: unrecognized archetype "${archetype}". Valid archetypes: ${valid}`,
      );
    }
    return tier;
  }
}
