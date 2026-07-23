/**
 * FLOW-32 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { SHARABLE_FLOWS_MARKETPLACE_BFA_RULES } from '../sharable-flows-marketplace-bfa-rules';

describe('FLOW-32 BFA rules — P11 additions (CF-1019..CF-1022)', () => {
  const findRule = (id: string) =>
    SHARABLE_FLOWS_MARKETPLACE_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-1019 (concurrency) is registered', () => {
    const r = findRule('CF-1019');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-32');
  });

  it('CF-1020 (idempotency) is registered', () => {
    const r = findRule('CF-1020');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-32');
  });

  it('CF-1021 (boundary validation) is registered', () => {
    const r = findRule('CF-1021');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-32');
  });

  it('CF-1022 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-1022');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-32');
  });

  it('all 4 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(SHARABLE_FLOWS_MARKETPLACE_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(4);
  });
});
