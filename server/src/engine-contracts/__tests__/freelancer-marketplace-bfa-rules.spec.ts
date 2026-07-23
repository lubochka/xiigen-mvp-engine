/**
 * FLOW-17 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { FREELANCER_MARKETPLACE_BFA_RULES } from '../freelancer-marketplace-bfa-rules';

describe('FLOW-17 BFA rules — P11 additions (CF-953..CF-956)', () => {
  const findRule = (id: string) =>
    FREELANCER_MARKETPLACE_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-953 (concurrency) is registered', () => {
    const r = findRule('CF-953');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-17');
  });

  it('CF-954 (idempotency) is registered', () => {
    const r = findRule('CF-954');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-17');
  });

  it('CF-955 (boundary validation) is registered', () => {
    const r = findRule('CF-955');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-17');
  });

  it('CF-956 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-956');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-17');
  });

  it('scope_isolation (CF-17-4) remains the last rule after P11 additions', () => {
    const last = FREELANCER_MARKETPLACE_BFA_RULES[FREELANCER_MARKETPLACE_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-17-4');
  });
});
