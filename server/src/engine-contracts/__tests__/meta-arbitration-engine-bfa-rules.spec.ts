/**
 * FLOW-35 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { META_ARBITRATION_ENGINE_BFA_RULES } from '../meta-arbitration-engine-bfa-rules';

describe('FLOW-35 BFA rules — P11 additions (CF-1031..CF-1034)', () => {
  const findRule = (id: string) =>
    META_ARBITRATION_ENGINE_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-1031 (concurrency) is registered', () => {
    const r = findRule('CF-1031');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-35');
  });

  it('CF-1032 (idempotency) is registered', () => {
    const r = findRule('CF-1032');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-35');
  });

  it('CF-1033 (boundary validation) is registered', () => {
    const r = findRule('CF-1033');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-35');
  });

  it('CF-1034 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-1034');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-35');
  });

  it('all 4 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(META_ARBITRATION_ENGINE_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(4);
  });
});
