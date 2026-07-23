import { CurriculumTierResolver } from './curriculum-tier-resolver.service';

describe('CurriculumTierResolver', () => {
  let resolver: CurriculumTierResolver;

  beforeEach(() => {
    resolver = new CurriculumTierResolver();
  });

  it('1. ROUTING → Tier 1', () => {
    expect(resolver.resolve('ROUTING')).toBe(1);
  });

  it('2. DATA_PIPELINE → Tier 2', () => {
    expect(resolver.resolve('DATA_PIPELINE')).toBe(2);
  });

  it('3. VALIDATION → Tier 2', () => {
    expect(resolver.resolve('VALIDATION')).toBe(2);
  });

  it('4. TRANSACTION → Tier 3', () => {
    expect(resolver.resolve('TRANSACTION')).toBe(3);
  });

  it('5. ORCHESTRATION → Tier 4', () => {
    expect(resolver.resolve('ORCHESTRATION')).toBe(4);
  });

  it('6. SCHEDULED → Tier 5', () => {
    expect(resolver.resolve('SCHEDULED')).toBe(5);
  });

  it('7. Case-insensitive: "routing" → Tier 1', () => {
    expect(resolver.resolve('routing')).toBe(1);
  });

  it('8. DESIGN_REASONING patternType → Tier 1 (regardless of archetype)', () => {
    expect(resolver.resolve('ORCHESTRATION', 'DESIGN_REASONING')).toBe(1);
  });

  it('9. CONVERGENCE_SESSION patternType → Tier 1', () => {
    expect(resolver.resolve('SCHEDULED', 'CONVERGENCE_SESSION')).toBe(1);
  });

  it('10. Unknown archetype throws Error', () => {
    expect(() => resolver.resolve('UNKNOWN_TYPE')).toThrow(Error);
  });

  it('11. Error message lists all valid archetypes', () => {
    expect(() => resolver.resolve('BOGUS')).toThrow(
      /Valid archetypes: ROUTING, DATA_PIPELINE, VALIDATION, TRANSACTION, FAN_IN, BROADCAST, REGISTRATION, ORCHESTRATION, CONVERGENCE, SCHEDULED/,
    );
  });
});
