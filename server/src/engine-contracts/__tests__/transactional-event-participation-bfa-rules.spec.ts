/**
 * FLOW-09 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { FLOW_09_BFA_RULES } from '../transactional-event-participation-bfa-rules';

describe('FLOW-09 BFA rules — P11 additions (CF-903..CF-912)', () => {
  const findRule = (id: string) =>
    FLOW_09_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-903 (concurrency) is registered', () => {
    const r = findRule('CF-903');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-09');
  });

  it('CF-904 (idempotency) is registered', () => {
    const r = findRule('CF-904');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-09');
  });

  it('CF-905 (boundary validation) is registered', () => {
    const r = findRule('CF-905');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-09');
  });

  it('CF-906 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-906');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-09');
  });

  it('CF-907 (concurrency) is registered', () => {
    const r = findRule('CF-907');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-09');
  });

  it('CF-908 (idempotency) is registered', () => {
    const r = findRule('CF-908');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-09');
  });

  it('CF-909 (boundary validation) is registered', () => {
    const r = findRule('CF-909');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-09');
  });

  it('CF-910 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-910');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-09');
  });

  it('CF-911 (concurrency) is registered', () => {
    const r = findRule('CF-911');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-09');
  });

  it('CF-912 (idempotency) is registered', () => {
    const r = findRule('CF-912');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-09');
  });

  it('scope_isolation (CF-09-7) remains the last rule after P11 additions', () => {
    const last = FLOW_09_BFA_RULES[FLOW_09_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-09-7');
    expect(last?.type).toBe('SCOPE_ISOLATION');
  });
});
