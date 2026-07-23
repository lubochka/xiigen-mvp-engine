/**
 * FLOW-42 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { RAG_QUALITY_GRAPH_BFA_RULES } from '../rag-quality-graph-bfa-rules';

describe('FLOW-42 BFA rules — P11 additions (CF-1066..CF-1069)', () => {
  const findRule = (id: string) =>
    RAG_QUALITY_GRAPH_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-1066 (concurrency) is registered', () => {
    const r = findRule('CF-1066');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-42');
  });

  it('CF-1067 (idempotency) is registered', () => {
    const r = findRule('CF-1067');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-42');
  });

  it('CF-1068 (boundary validation) is registered', () => {
    const r = findRule('CF-1068');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-42');
  });

  it('CF-1069 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-1069');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-42');
  });

  it('all 4 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(RAG_QUALITY_GRAPH_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(4);
  });
});
