/**
 * FLOW-36 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { FEATURE_REGISTRY_BFA_RULES } from '../feature-registry-bfa-rules';

describe('FLOW-36 BFA rules — P11 additions (CF-1035..CF-1049)', () => {
  const findRule = (id: string) =>
    FEATURE_REGISTRY_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-1035 (concurrency) is registered', () => {
    const r = findRule('CF-1035');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-36');
  });

  it('CF-1036 (idempotency) is registered', () => {
    const r = findRule('CF-1036');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-36');
  });

  it('CF-1037 (boundary validation) is registered', () => {
    const r = findRule('CF-1037');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-36');
  });

  it('CF-1038 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-1038');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-36');
  });

  it('CF-1039 (concurrency) is registered', () => {
    const r = findRule('CF-1039');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-36');
  });

  it('CF-1040 (idempotency) is registered', () => {
    const r = findRule('CF-1040');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-36');
  });

  it('CF-1041 (boundary validation) is registered', () => {
    const r = findRule('CF-1041');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-36');
  });

  it('CF-1042 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-1042');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-36');
  });

  it('CF-1043 (concurrency) is registered', () => {
    const r = findRule('CF-1043');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-36');
  });

  it('CF-1044 (idempotency) is registered', () => {
    const r = findRule('CF-1044');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-36');
  });

  it('CF-1045 (boundary validation) is registered', () => {
    const r = findRule('CF-1045');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-36');
  });

  it('CF-1046 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-1046');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-36');
  });

  it('CF-1047 (concurrency) is registered', () => {
    const r = findRule('CF-1047');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-36');
  });

  it('CF-1048 (idempotency) is registered', () => {
    const r = findRule('CF-1048');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-36');
  });

  it('CF-1049 (boundary validation) is registered', () => {
    const r = findRule('CF-1049');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-36');
  });

  it('all 15 P11 rules registered — no omissions', () => {
    const expected = ['CF-1035', 'CF-1036', 'CF-1037', 'CF-1038', 'CF-1039', 'CF-1040', 'CF-1041', 'CF-1042', 'CF-1043', 'CF-1044', 'CF-1045', 'CF-1046', 'CF-1047', 'CF-1048', 'CF-1049'];
    const registered = expected.filter((id) => findRule(id) !== undefined);
    expect(registered.length).toBe(15);
  });
});
