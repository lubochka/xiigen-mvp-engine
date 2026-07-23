/**
 * FLOW-30 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { TENANT_LIFECYCLE_MANAGER_BFA_RULES } from '../tenant-lifecycle-manager-bfa-rules';

describe('FLOW-30 BFA rules — P11 additions (CF-1011..CF-1014)', () => {
  const findRule = (id: string) =>
    TENANT_LIFECYCLE_MANAGER_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-1011 (concurrency) is registered', () => {
    const r = findRule('CF-1011');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-30');
  });

  it('CF-1012 (idempotency) is registered', () => {
    const r = findRule('CF-1012');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-30');
  });

  it('CF-1013 (boundary validation) is registered', () => {
    const r = findRule('CF-1013');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-30');
  });

  it('CF-1014 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-1014');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-30');
  });

  it('all 4 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(TENANT_LIFECYCLE_MANAGER_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(4);
  });
});
