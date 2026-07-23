/**
 * FLOW-18 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { VISUAL_FLOW_ENGINE_BFA_RULES } from '../visual-flow-engine-bfa-rules';

describe('FLOW-18 BFA rules — P11 additions (CF-957..CF-960)', () => {
  const findRule = (id: string) =>
    VISUAL_FLOW_ENGINE_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-957 (concurrency) is registered', () => {
    const r = findRule('CF-957');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-18');
  });

  it('CF-958 (idempotency) is registered', () => {
    const r = findRule('CF-958');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-18');
  });

  it('CF-959 (boundary validation) is registered', () => {
    const r = findRule('CF-959');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-18');
  });

  it('CF-960 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-960');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-18');
  });

  it('scope_isolation (CF-18-4) remains the last rule after P11 additions', () => {
    const last = VISUAL_FLOW_ENGINE_BFA_RULES[VISUAL_FLOW_ENGINE_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-18-4');
  });
});
