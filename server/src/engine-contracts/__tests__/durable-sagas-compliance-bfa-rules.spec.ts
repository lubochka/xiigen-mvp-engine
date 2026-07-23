/**
 * FLOW-19 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { DURABLE_SAGAS_COMPLIANCE_BFA_RULES } from '../durable-sagas-compliance-bfa-rules';

describe('FLOW-19 BFA rules — P11 additions (CF-961..CF-964)', () => {
  const findRule = (id: string) =>
    DURABLE_SAGAS_COMPLIANCE_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-961 (concurrency) is registered', () => {
    const r = findRule('CF-961');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-19');
  });

  it('CF-962 (idempotency) is registered', () => {
    const r = findRule('CF-962');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-19');
  });

  it('CF-963 (boundary validation) is registered', () => {
    const r = findRule('CF-963');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-19');
  });

  it('CF-964 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-964');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-19');
  });

  it('scope_isolation (CF-19-4) remains the last rule after P11 additions', () => {
    const last = DURABLE_SAGAS_COMPLIANCE_BFA_RULES[DURABLE_SAGAS_COMPLIANCE_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-19-4');
  });
});
