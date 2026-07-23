/**
 * FLOW-27 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { HUMAN_INTERACTION_GATE_BFA_RULES } from '../human-interaction-gate-bfa-rules';

describe('FLOW-27 BFA rules — P11 additions (CF-996..CF-1002)', () => {
  const findRule = (id: string) =>
    HUMAN_INTERACTION_GATE_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-996 (concurrency) is registered', () => {
    const r = findRule('CF-996');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-27');
  });

  it('CF-997 (idempotency) is registered', () => {
    const r = findRule('CF-997');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-27');
  });

  it('CF-998 (boundary validation) is registered', () => {
    const r = findRule('CF-998');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-27');
  });

  it('CF-999 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-999');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-27');
  });

  it('CF-1000 (concurrency) is registered', () => {
    const r = findRule('CF-1000');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-27');
  });

  it('CF-1001 (idempotency) is registered', () => {
    const r = findRule('CF-1001');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-27');
  });

  it('CF-1002 (boundary validation) is registered', () => {
    const r = findRule('CF-1002');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-27');
  });

  it('all 7 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(HUMAN_INTERACTION_GATE_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(7);
  });
});
