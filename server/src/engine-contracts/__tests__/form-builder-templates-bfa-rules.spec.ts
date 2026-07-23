/**
 * FLOW-23 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { FORM_BUILDER_TEMPLATES_BFA_RULES } from '../form-builder-templates-bfa-rules';

describe('FLOW-23 BFA rules — P11 additions (CF-977..CF-980)', () => {
  const findRule = (id: string) =>
    FORM_BUILDER_TEMPLATES_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-977 (concurrency) is registered', () => {
    const r = findRule('CF-977');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-23');
  });

  it('CF-978 (idempotency) is registered', () => {
    const r = findRule('CF-978');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-23');
  });

  it('CF-979 (boundary validation) is registered', () => {
    const r = findRule('CF-979');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-23');
  });

  it('CF-980 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-980');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-23');
  });

  it('scope_isolation (CF-23-4) remains the last rule after P11 additions', () => {
    const last = FORM_BUILDER_TEMPLATES_BFA_RULES[FORM_BUILDER_TEMPLATES_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-23-4');
  });
});
