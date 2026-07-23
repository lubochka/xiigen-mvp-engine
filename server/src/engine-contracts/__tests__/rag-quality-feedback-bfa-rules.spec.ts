/**
 * FLOW-38 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { RAG_QUALITY_FEEDBACK_BFA_RULES } from '../rag-quality-feedback-bfa-rules';

describe('FLOW-38 BFA rules — P11 additions (CF-1054..CF-1057)', () => {
  const findRule = (id: string) =>
    RAG_QUALITY_FEEDBACK_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-1054 (concurrency) is registered', () => {
    const r = findRule('CF-1054');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-38');
  });

  it('CF-1055 (idempotency) is registered', () => {
    const r = findRule('CF-1055');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-38');
  });

  it('CF-1056 (boundary validation) is registered', () => {
    const r = findRule('CF-1056');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-38');
  });

  it('CF-1057 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-1057');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-38');
  });

  it('all 4 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(RAG_QUALITY_FEEDBACK_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(4);
  });
});
