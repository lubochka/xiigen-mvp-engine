/**
 * FLOW-16 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { MARKETPLACE_PAYMENTS_BFA_RULES } from '../marketplace-payments-bfa-rules';

describe('FLOW-16 BFA rules — P11 additions (CF-949..CF-952)', () => {
  const findRule = (id: string) =>
    MARKETPLACE_PAYMENTS_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-949 (concurrency) is registered', () => {
    const r = findRule('CF-949');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-16');
  });

  it('CF-950 (idempotency) is registered', () => {
    const r = findRule('CF-950');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-16');
  });

  it('CF-951 (boundary validation) is registered', () => {
    const r = findRule('CF-951');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-16');
  });

  it('CF-952 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-952');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-16');
  });

  it('scope_isolation (CF-16-4) remains the last rule after P11 additions', () => {
    const last = MARKETPLACE_PAYMENTS_BFA_RULES[MARKETPLACE_PAYMENTS_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-16-4');
  });
});
