/**
 * FLOW-21 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { DYNAMIC_FORMS_WORKFLOWS_BFA_RULES } from '../dynamic-forms-workflows-bfa-rules';

describe('FLOW-21 BFA rules — P11 additions (CF-969..CF-972)', () => {
  const findRule = (id: string) =>
    DYNAMIC_FORMS_WORKFLOWS_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-969 (concurrency) is registered', () => {
    const r = findRule('CF-969');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-21');
  });

  it('CF-970 (idempotency) is registered', () => {
    const r = findRule('CF-970');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-21');
  });

  it('CF-971 (boundary validation) is registered', () => {
    const r = findRule('CF-971');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-21');
  });

  it('CF-972 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-972');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-21');
  });

  it('scope_isolation (CF-21-4) remains the last rule after P11 additions', () => {
    const last = DYNAMIC_FORMS_WORKFLOWS_BFA_RULES[DYNAMIC_FORMS_WORKFLOWS_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-21-4');
  });
});
