/**
 * FLOW-34 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { MARKETPLACE_PLUGIN_ADAPTER_BFA_RULES } from '../marketplace-plugin-adapter-bfa-rules';

describe('FLOW-34 BFA rules — P11 additions (CF-1027..CF-1030)', () => {
  const findRule = (id: string) =>
    MARKETPLACE_PLUGIN_ADAPTER_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-1027 (concurrency) is registered', () => {
    const r = findRule('CF-1027');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-34');
  });

  it('CF-1028 (idempotency) is registered', () => {
    const r = findRule('CF-1028');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-34');
  });

  it('CF-1029 (boundary validation) is registered', () => {
    const r = findRule('CF-1029');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-34');
  });

  it('CF-1030 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-1030');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-34');
  });

  it('all 4 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(MARKETPLACE_PLUGIN_ADAPTER_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(4);
  });
});
