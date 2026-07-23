/**
 * FLOW-37 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { DESIGN_SYSTEM_GOVERNANCE_BFA_RULES } from '../design-system-governance-bfa-rules';

describe('FLOW-37 BFA rules — P11 additions (CF-1050..CF-1053)', () => {
  const findRule = (id: string) =>
    DESIGN_SYSTEM_GOVERNANCE_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-1050 (concurrency) is registered', () => {
    const r = findRule('CF-1050');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-37');
  });

  it('CF-1051 (idempotency) is registered', () => {
    const r = findRule('CF-1051');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-37');
  });

  it('CF-1052 (boundary validation) is registered', () => {
    const r = findRule('CF-1052');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-37');
  });

  it('CF-1053 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-1053');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-37');
  });

  it('all 4 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(DESIGN_SYSTEM_GOVERNANCE_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(4);
  });
});
