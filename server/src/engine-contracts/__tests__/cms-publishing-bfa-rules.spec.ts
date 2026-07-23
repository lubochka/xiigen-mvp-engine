/**
 * FLOW-22 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { CMS_PUBLISHING_BFA_RULES } from '../cms-publishing-bfa-rules';

describe('FLOW-22 BFA rules — P11 additions (CF-973..CF-976)', () => {
  const findRule = (id: string) =>
    CMS_PUBLISHING_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-973 (concurrency) is registered', () => {
    const r = findRule('CF-973');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-22');
  });

  it('CF-974 (idempotency) is registered', () => {
    const r = findRule('CF-974');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-22');
  });

  it('CF-975 (boundary validation) is registered', () => {
    const r = findRule('CF-975');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-22');
  });

  it('CF-976 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-976');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-22');
  });

  it('scope_isolation (CF-22-4) remains the last rule after P11 additions', () => {
    const last = CMS_PUBLISHING_BFA_RULES[CMS_PUBLISHING_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-22-4');
  });
});
