/**
 * V9-002: Cross-model provenance validation gate.
 * Validates that a DPO triple has genuine cross-model comparison.
 * NEVER throws. NEVER blocks storage. Returns quality tag only.
 */

export type V9ValidationCode =
  | 'V9-002-PASS'
  | 'V9-002-SINGLE_PROVIDER'
  | 'V9-002-SAME_MODEL'
  | 'V9-002-NO_SHUFFLE'
  | 'V9-002-NO_TIER';

export interface V9ValidationResult {
  passed: boolean;
  code: V9ValidationCode;
  quality: 'CROSS_MODEL_VALID' | 'MONO_MODEL_CALIBRATION';
  countsTowardThreshold: boolean;
  reason?: string;
}

/**
 * Validate cross-model provenance of a DPO triple.
 * Rules applied in order — first failure determines quality.
 *
 * Critical constraint: NEVER throws. Input can be null/undefined/malformed.
 */
export function validateCrossModelProvenance(
  triple: Record<string, unknown> | null | undefined,
): V9ValidationResult {
  try {
    if (!triple) {
      return {
        passed: false,
        code: 'V9-002-SINGLE_PROVIDER',
        quality: 'MONO_MODEL_CALIBRATION',
        countsTowardThreshold: false,
        reason: 'triple is null/undefined',
      };
    }

    // E4-G1 fix (FLOW-06): chosen.model is actually at modelComparison.chosen.model, not triple.chosen.model
    const chosenModel =
      getNestedString(triple, 'modelComparison', 'chosen', 'model') ??
      (triple['chosenModel'] as string | undefined);
    const rejectedModel =
      getNestedString(triple, 'modelComparison', 'rejected', 'model') ??
      (triple['rejectedModel'] as string | undefined);

    // Rule 1: chosen.model must exist
    if (!chosenModel) {
      return {
        passed: false,
        code: 'V9-002-SINGLE_PROVIDER',
        quality: 'MONO_MODEL_CALIBRATION',
        countsTowardThreshold: false,
        reason: 'chosen.model missing',
      };
    }
    // Rule 2: rejected.model must exist
    if (!rejectedModel) {
      return {
        passed: false,
        code: 'V9-002-SINGLE_PROVIDER',
        quality: 'MONO_MODEL_CALIBRATION',
        countsTowardThreshold: false,
        reason: 'rejected.model missing',
      };
    }
    // Rule 3: models must differ
    if (chosenModel === rejectedModel) {
      return {
        passed: false,
        code: 'V9-002-SAME_MODEL',
        quality: 'MONO_MODEL_CALIBRATION',
        countsTowardThreshold: false,
        reason: `same model: ${chosenModel}`,
      };
    }
    // Rule 4: shuffle must have been applied
    const comparison = triple['modelComparison'] as Record<string, unknown> | undefined;
    const shuffleApplied = comparison?.['shuffleWasApplied'] as boolean | undefined;
    if (shuffleApplied !== true) {
      return {
        passed: false,
        code: 'V9-002-NO_SHUFFLE',
        quality: 'MONO_MODEL_CALIBRATION',
        countsTowardThreshold: false,
        reason: 'modelComparison.shuffleWasApplied is not true',
      };
    }
    // Rule 5: curriculumTier must be valid integer 1-5
    const tier = triple['curriculumTier'] as number | undefined;
    if (typeof tier !== 'number' || tier < 1 || tier > 5 || !Number.isInteger(tier)) {
      return {
        passed: false,
        code: 'V9-002-NO_TIER',
        quality: 'MONO_MODEL_CALIBRATION',
        countsTowardThreshold: false,
        reason: `curriculumTier invalid: ${tier}`,
      };
    }

    return {
      passed: true,
      code: 'V9-002-PASS',
      quality: 'CROSS_MODEL_VALID',
      countsTowardThreshold: true,
    };
  } catch {
    // NEVER throws
    return {
      passed: false,
      code: 'V9-002-SINGLE_PROVIDER',
      quality: 'MONO_MODEL_CALIBRATION',
      countsTowardThreshold: false,
      reason: 'internal error in validation',
    };
  }
}

function getNestedString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  let current: unknown = obj;
  for (const key of keys) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : undefined;
}
