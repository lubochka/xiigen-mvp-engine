/**
 * FLOW-43 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { META_FLOW_ORCHESTRATION_BFA_RULES } from '../meta-flow-orchestration-bfa-rules';

describe('FLOW-43 BFA rules — P11 additions (CF-1070..CF-1073)', () => {
  const findRule = (id: string) =>
    META_FLOW_ORCHESTRATION_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-1070 (concurrency) is registered', () => {
    const r = findRule('CF-1070');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-43');
  });

  it('CF-1071 (idempotency) is registered', () => {
    const r = findRule('CF-1071');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-43');
  });

  it('CF-1072 (boundary validation) is registered', () => {
    const r = findRule('CF-1072');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-43');
  });

  it('CF-1073 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-1073');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-43');
  });

  it('all 4 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(META_FLOW_ORCHESTRATION_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(4);
  });
});
