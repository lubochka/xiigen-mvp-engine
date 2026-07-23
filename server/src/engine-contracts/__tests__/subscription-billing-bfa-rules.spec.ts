/**
 * FLOW-12 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { SUBSCRIPTION_BILLING_BFA_RULES } from '../subscription-billing-bfa-rules';

describe('FLOW-12 BFA rules — P11 additions (CF-929..CF-934)', () => {
  const findRule = (id: string) =>
    SUBSCRIPTION_BILLING_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-929 (concurrency — primary path) is registered', () => {
    const r = findRule('CF-929');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-12');
  });

  it('CF-930 (idempotency) is registered', () => {
    const r = findRule('CF-930');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
  });

  it('CF-931 (boundary validation) is registered', () => {
    const r = findRule('CF-931');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
  });

  it('CF-932 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-932');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
  });

  it('CF-933 (concurrency — invoice-billing path) is registered', () => {
    const r = findRule('CF-933');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
  });

  it('CF-934 (idempotency — invoice-charge retry) is registered', () => {
    const r = findRule('CF-934');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
  });

  it('scope_isolation (CF-12-4) remains the last rule after P11 additions', () => {
    const last =
      SUBSCRIPTION_BILLING_BFA_RULES[SUBSCRIPTION_BILLING_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-12-4');
  });
});
