/**
 * FLOW-05 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { FLOW_05_BFA_RULES } from '../completion-gamification-bfa-rules';

describe('FLOW-05 BFA rules — P11 additions (CF-867..CF-877)', () => {
  const findRule = (id: string) =>
    FLOW_05_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-867 (concurrency) is registered', () => {
    const r = findRule('CF-867');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-05');
  });

  it('CF-868 (idempotency) is registered', () => {
    const r = findRule('CF-868');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-05');
  });

  it('CF-869 (boundary validation) is registered', () => {
    const r = findRule('CF-869');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-05');
  });

  it('CF-870 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-870');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-05');
  });

  it('CF-871 (concurrency) is registered', () => {
    const r = findRule('CF-871');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-05');
  });

  it('CF-872 (idempotency) is registered', () => {
    const r = findRule('CF-872');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-05');
  });

  it('CF-873 (boundary validation) is registered', () => {
    const r = findRule('CF-873');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-05');
  });

  it('CF-874 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-874');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-05');
  });

  it('CF-875 (concurrency) is registered', () => {
    const r = findRule('CF-875');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-05');
  });

  it('CF-876 (idempotency) is registered', () => {
    const r = findRule('CF-876');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-05');
  });

  it('CF-877 (boundary validation) is registered', () => {
    const r = findRule('CF-877');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-05');
  });

  it('scope_isolation (CF-05-4) remains the last rule after P11 additions', () => {
    const last = FLOW_05_BFA_RULES[FLOW_05_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-05-4');
    expect(last?.type).toBe('SCOPE_ISOLATION');
  });
});
