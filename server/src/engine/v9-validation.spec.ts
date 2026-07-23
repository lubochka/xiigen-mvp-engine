import { validateCrossModelProvenance } from './v9-validation';

describe('validateCrossModelProvenance (V9-002)', () => {
  function makeValidTriple(): Record<string, unknown> {
    // E4-G1: chosen/rejected models live inside modelComparison (not top-level)
    return {
      modelComparison: {
        chosen: { model: 'gpt-4', code: 'const x = 1;' },
        rejected: { model: 'claude-3', code: 'var x = 1;' },
        shuffleWasApplied: true,
      },
      curriculumTier: 3,
    };
  }

  it('1. valid triple passes — different models, shuffle true, tier 3', () => {
    const result = validateCrossModelProvenance(makeValidTriple());
    expect(result.passed).toBe(true);
    expect(result.code).toBe('V9-002-PASS');
    expect(result.quality).toBe('CROSS_MODEL_VALID');
    expect(result.countsTowardThreshold).toBe(true);
  });

  it('2. same model → V9-002-SAME_MODEL, MONO_MODEL_CALIBRATION', () => {
    const triple = makeValidTriple();
    ((triple['modelComparison'] as Record<string, unknown>)['rejected'] as Record<string, unknown>)[
      'model'
    ] = 'gpt-4';
    const result = validateCrossModelProvenance(triple);
    expect(result.passed).toBe(false);
    expect(result.code).toBe('V9-002-SAME_MODEL');
    expect(result.quality).toBe('MONO_MODEL_CALIBRATION');
    expect(result.countsTowardThreshold).toBe(false);
  });

  it('3. no shuffle → V9-002-NO_SHUFFLE', () => {
    const triple = makeValidTriple();
    (triple['modelComparison'] as Record<string, unknown>)['shuffleWasApplied'] = false;
    const result = validateCrossModelProvenance(triple);
    expect(result.passed).toBe(false);
    expect(result.code).toBe('V9-002-NO_SHUFFLE');
    expect(result.quality).toBe('MONO_MODEL_CALIBRATION');
    expect(result.countsTowardThreshold).toBe(false);
  });

  it('4. missing curriculumTier → V9-002-NO_TIER', () => {
    const triple = makeValidTriple();
    delete triple['curriculumTier'];
    const result = validateCrossModelProvenance(triple);
    expect(result.passed).toBe(false);
    expect(result.code).toBe('V9-002-NO_TIER');
    expect(result.quality).toBe('MONO_MODEL_CALIBRATION');
    expect(result.countsTowardThreshold).toBe(false);
  });

  it('5. missing chosen.model → V9-002-SINGLE_PROVIDER', () => {
    const triple = makeValidTriple();
    delete (
      (triple['modelComparison'] as Record<string, unknown>)['chosen'] as Record<string, unknown>
    )['model'];
    const result = validateCrossModelProvenance(triple);
    expect(result.passed).toBe(false);
    expect(result.code).toBe('V9-002-SINGLE_PROVIDER');
    expect(result.quality).toBe('MONO_MODEL_CALIBRATION');
    expect(result.countsTowardThreshold).toBe(false);
  });

  it('6. never throws on malformed input: null, undefined, {}, { chosen: null }, string-as-input', () => {
    expect(() => validateCrossModelProvenance(null)).not.toThrow();
    expect(() => validateCrossModelProvenance(undefined)).not.toThrow();
    expect(() => validateCrossModelProvenance({})).not.toThrow();
    expect(() => validateCrossModelProvenance({ chosen: null })).not.toThrow();
    // Cast string to satisfy TypeScript — runtime must not throw
    expect(() =>
      validateCrossModelProvenance('string' as unknown as Record<string, unknown>),
    ).not.toThrow();

    // All malformed inputs return a non-throwing result
    expect(validateCrossModelProvenance(null).passed).toBe(false);
    expect(validateCrossModelProvenance(undefined).passed).toBe(false);
    expect(validateCrossModelProvenance({}).passed).toBe(false);
    expect(validateCrossModelProvenance({ chosen: null }).passed).toBe(false);
    expect(
      validateCrossModelProvenance('string' as unknown as Record<string, unknown>).passed,
    ).toBe(false);
  });
});
