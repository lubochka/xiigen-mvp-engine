/**
 * FLOW-45 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { CYCLE_CHAIN_EXTENSION_BFA_RULES } from '../cycle-chain-extension-bfa-rules';

describe('FLOW-45 BFA rules — P11 additions (CF-1078..CF-1081)', () => {
  const findRule = (id: string) =>
    CYCLE_CHAIN_EXTENSION_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-1078 (concurrency) is registered', () => {
    const r = findRule('CF-1078');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-45');
  });

  it('CF-1079 (idempotency) is registered', () => {
    const r = findRule('CF-1079');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-45');
  });

  it('CF-1080 (boundary validation) is registered', () => {
    const r = findRule('CF-1080');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-45');
  });

  it('CF-1081 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-1081');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-45');
  });

  it('all 4 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(CYCLE_CHAIN_EXTENSION_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(4);
  });
});
