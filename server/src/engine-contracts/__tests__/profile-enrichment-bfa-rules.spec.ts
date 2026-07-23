/**
 * FLOW-02 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { FLOW_02_BFA_RULES } from '../profile-enrichment-bfa-rules';

describe('FLOW-02 BFA rules — P11 additions (CF-854..CF-857)', () => {
  const findRule = (id: string) =>
    FLOW_02_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-854 (concurrency) is registered', () => {
    const r = findRule('CF-854');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-02');
  });

  it('CF-855 (idempotency) is registered', () => {
    const r = findRule('CF-855');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
  });

  it('CF-856 (boundary validation) is registered', () => {
    const r = findRule('CF-856');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
  });

  it('CF-857 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-857');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
  });

  it('scope_isolation (CF-02-4) remains the last rule after P11 additions', () => {
    const last = FLOW_02_BFA_RULES[FLOW_02_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-02-4');
    expect(last?.type).toBe('SCOPE_ISOLATION');
  });
});
