/**
 * FLOW-47 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { MODULE_LIFECYCLE_BFA_RULES } from '../module-lifecycle-bfa-rules';

describe('FLOW-47 BFA rules — P11 additions (CF-1096..CF-1099)', () => {
  const findRule = (id: string) =>
    MODULE_LIFECYCLE_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-1096 (concurrency) is registered', () => {
    const r = findRule('CF-1096');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-47');
  });

  it('CF-1097 (idempotency) is registered', () => {
    const r = findRule('CF-1097');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-47');
  });

  it('CF-1098 (boundary validation) is registered', () => {
    const r = findRule('CF-1098');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-47');
  });

  it('CF-1099 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-1099');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-47');
  });

  it('all 4 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(MODULE_LIFECYCLE_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(4);
  });
});
