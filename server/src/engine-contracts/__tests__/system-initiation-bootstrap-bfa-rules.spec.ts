/**
 * FLOW-33 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { SYSTEM_INITIATION_BOOTSTRAP_BFA_RULES } from '../system-initiation-bootstrap-bfa-rules';

describe('FLOW-33 BFA rules — P11 additions (CF-1023..CF-1026)', () => {
  const findRule = (id: string) =>
    SYSTEM_INITIATION_BOOTSTRAP_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-1023 (concurrency) is registered', () => {
    const r = findRule('CF-1023');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-33');
  });

  it('CF-1024 (idempotency) is registered', () => {
    const r = findRule('CF-1024');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-33');
  });

  it('CF-1025 (boundary validation) is registered', () => {
    const r = findRule('CF-1025');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-33');
  });

  it('CF-1026 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-1026');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-33');
  });

  it('all 4 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(SYSTEM_INITIATION_BOOTSTRAP_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(4);
  });
});
