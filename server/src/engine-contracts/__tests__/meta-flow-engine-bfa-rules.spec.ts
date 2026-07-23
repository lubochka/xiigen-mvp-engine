/**
 * FLOW-26 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { META_FLOW_ENGINE_BFA_RULES } from '../meta-flow-engine-bfa-rules';

describe('FLOW-26 BFA rules — P11 additions (CF-989..CF-995)', () => {
  const findRule = (id: string) =>
    META_FLOW_ENGINE_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-989 (concurrency) is registered', () => {
    const r = findRule('CF-989');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-26');
  });

  it('CF-990 (idempotency) is registered', () => {
    const r = findRule('CF-990');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-26');
  });

  it('CF-991 (boundary validation) is registered', () => {
    const r = findRule('CF-991');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-26');
  });

  it('CF-992 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-992');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-26');
  });

  it('CF-993 (concurrency) is registered', () => {
    const r = findRule('CF-993');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-26');
  });

  it('CF-994 (idempotency) is registered', () => {
    const r = findRule('CF-994');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-26');
  });

  it('CF-995 (boundary validation) is registered', () => {
    const r = findRule('CF-995');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-26');
  });

  it('all 7 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(META_FLOW_ENGINE_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(7);
  });
});
