/**
 * FLOW-06 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { FLOW_06_BFA_RULES } from '../user-groups-communities-bfa-rules';

describe('FLOW-06 BFA rules — P11 additions (CF-878..CF-883)', () => {
  const findRule = (id: string) =>
    FLOW_06_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-878 (concurrency) is registered', () => {
    const r = findRule('CF-878');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-06');
  });

  it('CF-879 (idempotency) is registered', () => {
    const r = findRule('CF-879');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-06');
  });

  it('CF-880 (boundary validation) is registered', () => {
    const r = findRule('CF-880');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-06');
  });

  it('CF-881 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-881');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-06');
  });

  it('CF-882 (concurrency) is registered', () => {
    const r = findRule('CF-882');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-06');
  });

  it('CF-883 (idempotency) is registered', () => {
    const r = findRule('CF-883');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-06');
  });

  it('scope_isolation (CF-06-4) remains the last rule after P11 additions', () => {
    const last = FLOW_06_BFA_RULES[FLOW_06_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-06-4');
    expect(last?.type).toBe('SCOPE_ISOLATION');
  });
});
