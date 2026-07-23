/**
 * FLOW-11 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { SCHEMA_REGISTRY_DAG_BFA_RULES } from '../schema-registry-dag-bfa-rules';

describe('FLOW-11 BFA rules — P11 additions (CF-919..CF-928)', () => {
  const findRule = (id: string) =>
    SCHEMA_REGISTRY_DAG_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-919 (concurrency) is registered', () => {
    const r = findRule('CF-919');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-11');
  });

  it('CF-920 (idempotency) is registered', () => {
    const r = findRule('CF-920');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-11');
  });

  it('CF-921 (boundary validation) is registered', () => {
    const r = findRule('CF-921');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-11');
  });

  it('CF-922 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-922');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-11');
  });

  it('CF-923 (concurrency) is registered', () => {
    const r = findRule('CF-923');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-11');
  });

  it('CF-924 (idempotency) is registered', () => {
    const r = findRule('CF-924');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-11');
  });

  it('CF-925 (boundary validation) is registered', () => {
    const r = findRule('CF-925');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-11');
  });

  it('CF-926 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-926');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-11');
  });

  it('CF-927 (concurrency) is registered', () => {
    const r = findRule('CF-927');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-11');
  });

  it('CF-928 (idempotency) is registered', () => {
    const r = findRule('CF-928');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-11');
  });

  it('scope_isolation (CF-11-4) remains the last rule after P11 additions', () => {
    const last = SCHEMA_REGISTRY_DAG_BFA_RULES[SCHEMA_REGISTRY_DAG_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-11-4');
    expect(last?.type).toBe('SCOPE_ISOLATION');
  });
});
