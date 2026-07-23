/**
 * FLOW-01 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 * Enforcement tests (actually triggering 409/200 behavior) belong in P8.
 */
import { FLOW_01_BFA_RULES } from '../user-registration-bfa-rules';

describe('FLOW-01 BFA rules — P11 additions (CF-850..CF-853)', () => {
  const findRule = (id: string) =>
    FLOW_01_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-850 (concurrency) is registered', () => {
    const r = findRule('CF-850');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-01');
    expect(r?.violationSeverity).toBe('BUILD_FAILURE');
  });

  it('CF-851 (idempotency) is registered', () => {
    const r = findRule('CF-851');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
  });

  it('CF-852 (boundary validation) is registered', () => {
    const r = findRule('CF-852');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
  });

  it('CF-853 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-853');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
  });

  it('scope_isolation (CF-01-4) remains the last rule after P11 additions', () => {
    const last = FLOW_01_BFA_RULES[FLOW_01_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-01-4');
    expect(last?.type).toBe('SCOPE_ISOLATION');
  });
});
