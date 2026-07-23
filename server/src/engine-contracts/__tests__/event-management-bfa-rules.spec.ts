/**
 * FLOW-03 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { FLOW_03_BFA_RULES } from '../event-management-bfa-rules';

describe('FLOW-03 BFA rules — P11 additions (CF-858..CF-862)', () => {
  const findRule = (id: string) =>
    FLOW_03_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-858 (concurrency — primary path) is registered', () => {
    const r = findRule('CF-858');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-03');
  });

  it('CF-859 (idempotency) is registered', () => {
    const r = findRule('CF-859');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
  });

  it('CF-860 (boundary validation) is registered', () => {
    const r = findRule('CF-860');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
  });

  it('CF-861 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-861');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
  });

  it('CF-862 (concurrency — secondary capacity path) is registered', () => {
    const r = findRule('CF-862');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
  });

  it('scope_isolation (CF-03-4) remains the last rule after P11 additions', () => {
    const last = FLOW_03_BFA_RULES[FLOW_03_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-03-4');
    expect(last?.type).toBe('SCOPE_ISOLATION');
  });
});
