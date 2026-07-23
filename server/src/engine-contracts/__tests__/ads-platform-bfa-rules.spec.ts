/**
 * FLOW-20 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { ADS_PLATFORM_BFA_RULES } from '../ads-platform-bfa-rules';

describe('FLOW-20 BFA rules — P11 additions (CF-965..CF-968)', () => {
  const findRule = (id: string) =>
    ADS_PLATFORM_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-965 (concurrency) is registered', () => {
    const r = findRule('CF-965');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-20');
  });

  it('CF-966 (idempotency) is registered', () => {
    const r = findRule('CF-966');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-20');
  });

  it('CF-967 (boundary validation) is registered', () => {
    const r = findRule('CF-967');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-20');
  });

  it('CF-968 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-968');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-20');
  });

  it('scope_isolation (CF-20-4) remains the last rule after P11 additions', () => {
    const last = ADS_PLATFORM_BFA_RULES[ADS_PLATFORM_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-20-4');
  });
});
