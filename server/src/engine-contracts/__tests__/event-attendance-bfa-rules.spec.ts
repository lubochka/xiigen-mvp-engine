/**
 * FLOW-04 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { FLOW_04_BFA_RULES } from '../event-attendance-bfa-rules';

describe('FLOW-04 BFA rules — P11 additions (CF-863..CF-866)', () => {
  const findRule = (id: string) =>
    FLOW_04_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-863 (concurrency) is registered', () => {
    const r = findRule('CF-863');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-04');
  });

  it('CF-864 (idempotency) is registered', () => {
    const r = findRule('CF-864');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
  });

  it('CF-865 (boundary validation) is registered', () => {
    const r = findRule('CF-865');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
  });

  it('CF-866 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-866');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
  });

  it('scope_isolation (CF-04-4) remains the last rule after P11 additions', () => {
    const last = FLOW_04_BFA_RULES[FLOW_04_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-04-4');
    expect(last?.type).toBe('SCOPE_ISOLATION');
  });
});
