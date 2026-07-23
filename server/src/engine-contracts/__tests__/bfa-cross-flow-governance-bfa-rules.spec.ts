/**
 * FLOW-25 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { BFA_CROSS_FLOW_GOVERNANCE_BFA_RULES } from '../bfa-cross-flow-governance-bfa-rules';

describe('FLOW-25 BFA rules — P11 additions (CF-985..CF-988)', () => {
  const findRule = (id: string) =>
    BFA_CROSS_FLOW_GOVERNANCE_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-985 (concurrency) is registered', () => {
    const r = findRule('CF-985');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-25');
  });

  it('CF-986 (idempotency) is registered', () => {
    const r = findRule('CF-986');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-25');
  });

  it('CF-987 (boundary validation) is registered', () => {
    const r = findRule('CF-987');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-25');
  });

  it('CF-988 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-988');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-25');
  });

  it('all 4 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(BFA_CROSS_FLOW_GOVERNANCE_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(4);
  });
});
