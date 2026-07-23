/**
 * FLOW-00 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { BUNDLE_ACTIVATION_BFA_RULES } from '../bundle-activation-bfa-rules';

describe('FLOW-00 BFA rules — P11 additions (CF-842..CF-849)', () => {
  const findRule = (id: string) =>
    BUNDLE_ACTIVATION_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-842 (concurrency) is registered', () => {
    const r = findRule('CF-842');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-00');
  });

  it('CF-843 (idempotency) is registered', () => {
    const r = findRule('CF-843');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-00');
  });

  it('CF-844 (boundary validation) is registered', () => {
    const r = findRule('CF-844');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-00');
  });

  it('CF-845 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-845');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-00');
  });

  it('CF-846 (concurrency) is registered', () => {
    const r = findRule('CF-846');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-00');
  });

  it('CF-847 (idempotency) is registered', () => {
    const r = findRule('CF-847');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-00');
  });

  it('CF-848 (boundary validation) is registered', () => {
    const r = findRule('CF-848');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-00');
  });

  it('CF-849 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-849');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-00');
  });

  it('all 8 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(BUNDLE_ACTIVATION_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(8);
  });
});
