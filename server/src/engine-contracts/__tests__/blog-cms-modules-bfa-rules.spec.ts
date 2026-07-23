/**
 * FLOW-28 BFA rules — P11 additions.
 * Registration-only gate: each CF-NNN from P10 appears in the rules array.
 */
import { BLOG_CMS_MODULES_BFA_RULES } from '../blog-cms-modules-bfa-rules';

describe('FLOW-28 BFA rules — P11 additions (CF-1003..CF-1006)', () => {
  const findRule = (id: string) =>
    BLOG_CMS_MODULES_BFA_RULES.find((r) => r.ruleId === id);

  it('CF-1003 (concurrency) is registered', () => {
    const r = findRule('CF-1003');
    expect(r).toBeDefined();
    expect(r?.type).toBe('CONCURRENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-28');
  });

  it('CF-1004 (idempotency) is registered', () => {
    const r = findRule('CF-1004');
    expect(r).toBeDefined();
    expect(r?.type).toBe('IDEMPOTENCY_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-28');
  });

  it('CF-1005 (boundary validation) is registered', () => {
    const r = findRule('CF-1005');
    expect(r).toBeDefined();
    expect(r?.type).toBe('ORDERING_CONSTRAINT');
    expect(r?.flowId).toBe('FLOW-28');
  });

  it('CF-1006 (fabric timeout / DNA-8 outbox) is registered', () => {
    const r = findRule('CF-1006');
    expect(r).toBeDefined();
    expect(r?.type).toBe('DNA8_ORDERING');
    expect(r?.flowId).toBe('FLOW-28');
  });

  it('all 4 P11 rules registered — no extras, no omissions', () => {
    const p11Ids = new Set(BLOG_CMS_MODULES_BFA_RULES.map((r) => r.ruleId));
    expect(p11Ids.size).toBe(4);
  });
});
