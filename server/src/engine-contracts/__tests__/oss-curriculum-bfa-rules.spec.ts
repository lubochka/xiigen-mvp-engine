/**
 * FLOW-39 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { OSS_CURRICULUM_BFA_RULES } from '../oss-curriculum-bfa-rules';

describe('FLOW-39 BFA rules — P11 additions (CF-1058..CF-1061)', () => {
  const findRule = (id: string) =>
    OSS_CURRICULUM_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-1058 (concurrency) is registered', () => {
    const r = findRule('CF-1058');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-39');
  });

  it('CF-1059 (idempotency) is registered', () => {
    const r = findRule('CF-1059');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-39');
  });

  it('CF-1060 (boundary validation) is registered', () => {
    const r = findRule('CF-1060');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-39');
  });

  it('CF-1061 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-1061');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-39');
  });

  it('all 4 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(OSS_CURRICULUM_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(4);
  });
});
