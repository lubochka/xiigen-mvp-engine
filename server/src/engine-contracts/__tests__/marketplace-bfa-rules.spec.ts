/**
 * FLOW-08 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { FLOW_08_BFA_RULES } from '../marketplace-bfa-rules';

describe('FLOW-08 BFA rules — P11 additions (CF-895..CF-902)', () => {
  const findRule = (id: string) =>
    FLOW_08_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-895 (concurrency) is registered', () => {
    const r = findRule('CF-895');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-08');
  });

  it('CF-896 (idempotency) is registered', () => {
    const r = findRule('CF-896');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-08');
  });

  it('CF-897 (boundary validation) is registered', () => {
    const r = findRule('CF-897');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-08');
  });

  it('CF-898 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-898');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-08');
  });

  it('CF-899 (concurrency) is registered', () => {
    const r = findRule('CF-899');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-08');
  });

  it('CF-900 (idempotency) is registered', () => {
    const r = findRule('CF-900');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-08');
  });

  it('CF-901 (boundary validation) is registered', () => {
    const r = findRule('CF-901');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-08');
  });

  it('CF-902 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-902');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-08');
  });

  it('scope_isolation (CF-08-4) remains the last rule after P11 additions', () => {
    const last = FLOW_08_BFA_RULES[FLOW_08_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-08-4');
    expect(last?.type).toBe('SCOPE_ISOLATION');
  });
});
