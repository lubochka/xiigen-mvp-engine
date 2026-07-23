/**
 * FLOW-10 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { REVIEWS_REPUTATION_BFA_RULES } from '../reviews-reputation-bfa-rules';

describe('FLOW-10 BFA rules — P11 additions (CF-913..CF-918)', () => {
  const findRule = (id: string) =>
    REVIEWS_REPUTATION_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-913 (concurrency — primary path) is registered', () => {
    const r = findRule('CF-913');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-10');
  });

  it('CF-914 (idempotency) is registered', () => {
    const r = findRule('CF-914');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
  });

  it('CF-915 (boundary validation) is registered', () => {
    const r = findRule('CF-915');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
  });

  it('CF-916 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-916');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
  });

  it('CF-917 (concurrency — review-response retraction path) is registered', () => {
    const r = findRule('CF-917');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
  });

  it('CF-918 (idempotency — score-recompute replay) is registered', () => {
    const r = findRule('CF-918');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
  });

  it('scope_isolation (CF-10-4) remains the last rule after P11 additions', () => {
    const last =
      REVIEWS_REPUTATION_BFA_RULES[REVIEWS_REPUTATION_BFA_RULES.length - 1];
    expect(last?.ruleId).toBe('CF-10-4');
    expect(last?.type).toBe('SCOPE_ISOLATION');
  });
});
