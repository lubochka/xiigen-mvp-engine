/**
 * FLOW-15 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { SAAS_MULTI_TENANCY_BFA_RULES } from '../saas-multi-tenancy-bfa-rules';

describe('FLOW-15 BFA rules — P11 additions (CF-945..CF-948)', () => {
  const findRule = (id: string) =>
    SAAS_MULTI_TENANCY_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-945 (concurrency) is registered', () => {
    const r = findRule('CF-945');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-15');
  });

  it('CF-946 (idempotency) is registered', () => {
    const r = findRule('CF-946');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-15');
  });

  it('CF-947 (boundary validation) is registered', () => {
    const r = findRule('CF-947');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-15');
  });

  it('CF-948 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-948');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-15');
  });

  it('scope_isolation (CF-15-4) remains the last rule after P11 additions', () => {
    const last = SAAS_MULTI_TENANCY_BFA_RULES[SAAS_MULTI_TENANCY_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-15-4');
  });
});
