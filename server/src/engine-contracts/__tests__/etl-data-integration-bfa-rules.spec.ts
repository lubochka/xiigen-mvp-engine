/**
 * FLOW-14 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { ETL_DATA_INTEGRATION_BFA_RULES } from '../etl-data-integration-bfa-rules';

describe('FLOW-14 BFA rules — P11 additions (CF-940..CF-944)', () => {
  const findRule = (id: string) =>
    ETL_DATA_INTEGRATION_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-940 (concurrency) is registered', () => {
    const r = findRule('CF-940');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-14');
  });

  it('CF-941 (idempotency) is registered', () => {
    const r = findRule('CF-941');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-14');
  });

  it('CF-942 (boundary validation) is registered', () => {
    const r = findRule('CF-942');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-14');
  });

  it('CF-943 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-943');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-14');
  });

  it('CF-944 (concurrency) is registered', () => {
    const r = findRule('CF-944');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-14');
  });

  it('all 5 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(ETL_DATA_INTEGRATION_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(5);
  });
});
