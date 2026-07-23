import { ArbiterRegistry, BASE_ARBITERS } from '../../src/engine/arbitration/arbiter-registry';

describe('ArbiterRegistry', () => {
  let registry: ArbiterRegistry;

  beforeEach(() => {
    registry = new ArbiterRegistry();
  });

  it('loads 7 base arbiters on construction (G-2: +business_logic, key_principles, iron_rules)', () => {
    expect(registry.count).toBe(7);
  });

  it('getById returns correct arbiter', () => {
    const result = registry.getById('dna');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.concern).toContain('DNA');
  });

  it('getAll returns all registered arbiters including new G-2 panel', () => {
    expect(registry.getAll().map((a) => a.id)).toEqual(
      expect.arrayContaining([
        'dna',
        'fabric',
        'tenant',
        'xiigen',
        'business_logic',
        'key_principles',
        'iron_rules',
      ]),
    );
  });

  it('register adds a new arbiter', () => {
    registry.register({
      id: 'security',
      concern: 'Security patterns',
      minPassScore: 80,
      weight: 0.05,
      promptTemplate: 'Check for security issues in {{CODE}}',
    });
    expect(registry.count).toBe(8);
    expect(registry.getById('security').isSuccess).toBe(true);
  });

  it('getById fails for unknown arbiter', () => {
    const result = registry.getById('nonexistent');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
  });

  it('all base arbiter prompts contain {{CODE}} placeholder', () => {
    for (const arbiter of registry.getAll()) {
      expect(arbiter.promptTemplate).toContain('{{CODE}}');
    }
  });

  it('arbiter weights sum to ≤ 1.0', () => {
    const total = registry.getAll().reduce((sum, a) => sum + a.weight, 0);
    expect(total).toBeLessThanOrEqual(1.0);
  });

  it('key_principles arbiter is isolated per P20', () => {
    const kp = registry.getById('key_principles').data!;
    expect(kp.promptTemplate).toContain('ISOLATED per P20');
  });

  it('iron_rules arbiter has minPassScore of 90', () => {
    const ir = registry.getById('iron_rules').data!;
    expect(ir.minPassScore).toBe(90);
  });

  it('BASE_ARBITERS is an array — extending arbiters requires no logic change', () => {
    expect(Array.isArray(BASE_ARBITERS)).toBe(true);
    const extended = [
      ...BASE_ARBITERS,
      {
        id: 'custom',
        concern: 'Custom check',
        minPassScore: 60,
        weight: 0.05,
        promptTemplate: 'Custom prompt for {{CODE}}',
      },
    ];
    const extendedRegistry = new ArbiterRegistry(extended);
    expect(extendedRegistry.count).toBe(8);
    expect(extendedRegistry.getById('custom').isSuccess).toBe(true);
  });
});
