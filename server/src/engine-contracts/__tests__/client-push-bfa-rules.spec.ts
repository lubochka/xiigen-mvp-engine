/**
 * FLOW-40 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { CLIENT_PUSH_BFA_RULES } from '../client-push-bfa-rules';

describe('FLOW-40 BFA rules — P11 additions (CF-1062..CF-1065)', () => {
  const findRule = (id: string) =>
    CLIENT_PUSH_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-1062 (concurrency) is registered', () => {
    const r = findRule('CF-1062');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-40');
  });

  it('CF-1063 (idempotency) is registered', () => {
    const r = findRule('CF-1063');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-40');
  });

  it('CF-1064 (boundary validation) is registered', () => {
    const r = findRule('CF-1064');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-40');
  });

  it('CF-1065 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-1065');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-40');
  });

  it('all 4 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(CLIENT_PUSH_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(4);
  });
});
