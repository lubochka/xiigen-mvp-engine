/**
 * FLOW-31 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { DESIGN_INTELLIGENCE_ENGINE_BFA_RULES } from '../design-intelligence-engine-bfa-rules';

describe('FLOW-31 BFA rules — P11 additions (CF-1015..CF-1018)', () => {
  const findRule = (id: string) =>
    DESIGN_INTELLIGENCE_ENGINE_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-1015 (concurrency) is registered', () => {
    const r = findRule('CF-1015');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-31');
  });

  it('CF-1016 (idempotency) is registered', () => {
    const r = findRule('CF-1016');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-31');
  });

  it('CF-1017 (boundary validation) is registered', () => {
    const r = findRule('CF-1017');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-31');
  });

  it('CF-1018 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-1018');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-31');
  });

  it('all 4 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(DESIGN_INTELLIGENCE_ENGINE_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(4);
  });
});
