/**
 * FLOW-07 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { FLOW_07_BFA_RULES } from '../friend-request-social-feed-bfa-rules';

describe('FLOW-07 BFA rules — P11 additions (CF-884..CF-894)', () => {
  const findRule = (id: string) =>
    FLOW_07_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-884 (concurrency) is registered', () => {
    const r = findRule('CF-884');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-07');
  });

  it('CF-885 (idempotency) is registered', () => {
    const r = findRule('CF-885');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-07');
  });

  it('CF-886 (boundary validation) is registered', () => {
    const r = findRule('CF-886');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-07');
  });

  it('CF-887 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-887');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-07');
  });

  it('CF-888 (concurrency) is registered', () => {
    const r = findRule('CF-888');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-07');
  });

  it('CF-889 (idempotency) is registered', () => {
    const r = findRule('CF-889');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-07');
  });

  it('CF-890 (boundary validation) is registered', () => {
    const r = findRule('CF-890');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-07');
  });

  it('CF-891 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-891');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-07');
  });

  it('CF-892 (concurrency) is registered', () => {
    const r = findRule('CF-892');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-07');
  });

  it('CF-893 (idempotency) is registered', () => {
    const r = findRule('CF-893');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-07');
  });

  it('CF-894 (boundary validation) is registered', () => {
    const r = findRule('CF-894');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-07');
  });

  it('scope_isolation (CF-07-4) remains the last rule after P11 additions', () => {
    const last = FLOW_07_BFA_RULES[FLOW_07_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-07-4');
    expect(last?.type).toBe('SCOPE_ISOLATION');
  });
});
