/**
 * FLOW-29 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { ADAPTIVE_RAG_DEEP_RESEARCH_BFA_RULES } from '../adaptive-rag-deep-research-bfa-rules';

describe('FLOW-29 BFA rules — P11 additions (CF-1007..CF-1010)', () => {
  const findRule = (id: string) =>
    ADAPTIVE_RAG_DEEP_RESEARCH_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-1007 (concurrency) is registered', () => {
    const r = findRule('CF-1007');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-29');
  });

  it('CF-1008 (idempotency) is registered', () => {
    const r = findRule('CF-1008');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-29');
  });

  it('CF-1009 (boundary validation) is registered', () => {
    const r = findRule('CF-1009');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-29');
  });

  it('CF-1010 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-1010');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-29');
  });

  it('all 4 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(ADAPTIVE_RAG_DEEP_RESEARCH_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(4);
  });
});
