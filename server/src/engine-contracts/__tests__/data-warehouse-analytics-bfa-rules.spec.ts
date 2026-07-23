/**
 * FLOW-13 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { DATA_WAREHOUSE_ANALYTICS_BFA_RULES } from '../data-warehouse-analytics-bfa-rules';

describe('FLOW-13 BFA rules — P11 additions (CF-935..CF-939)', () => {
  const findRule = (id: string) =>
    DATA_WAREHOUSE_ANALYTICS_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-935 (concurrency) is registered', () => {
    const r = findRule('CF-935');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-13');
  });

  it('CF-936 (idempotency) is registered', () => {
    const r = findRule('CF-936');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-13');
  });

  it('CF-937 (boundary validation) is registered', () => {
    const r = findRule('CF-937');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-13');
  });

  it('CF-938 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-938');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-13');
  });

  it('CF-939 (concurrency) is registered', () => {
    const r = findRule('CF-939');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-13');
  });

  it('all 5 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(DATA_WAREHOUSE_ANALYTICS_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(5);
  });
});
