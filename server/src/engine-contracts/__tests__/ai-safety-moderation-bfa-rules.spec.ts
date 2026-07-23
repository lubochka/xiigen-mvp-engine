/**
 * FLOW-24 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { AI_SAFETY_MODERATION_BFA_RULES } from '../ai-safety-moderation-bfa-rules';

describe('FLOW-24 BFA rules — P11 additions (CF-981..CF-984)', () => {
  const findRule = (id: string) =>
    AI_SAFETY_MODERATION_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-981 (concurrency) is registered', () => {
    const r = findRule('CF-981');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-24');
  });

  it('CF-982 (idempotency) is registered', () => {
    const r = findRule('CF-982');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-24');
  });

  it('CF-983 (boundary validation) is registered', () => {
    const r = findRule('CF-983');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-24');
  });

  it('CF-984 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-984');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-24');
  });

  it('scope_isolation (CF-24-4) remains the last rule after P11 additions', () => {
    const last = AI_SAFETY_MODERATION_BFA_RULES[AI_SAFETY_MODERATION_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-24-4');
  });
});
