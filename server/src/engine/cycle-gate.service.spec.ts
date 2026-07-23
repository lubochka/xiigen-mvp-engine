import 'reflect-metadata';
import { DataProcessResult } from '../kernel/data-process-result';
import { CycleGateService, CycleGateInput } from './cycle-gate.service';

const makeDb = () => ({
  storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
});

const makeFreedom = (spendLimit = 10, forbiddenImports: string[] = []) => ({
  get: jest.fn(async (key: string) => {
    if (key === 'metaArbiter.spendLimit') return spendLimit;
    if (key === 'forbidden_imports') return forbiddenImports;
    return null;
  }),
});

const makeInput = (overrides: Partial<CycleGateInput> = {}): CycleGateInput => ({
  sessionId: 'sess-001',
  tenantId: 'tenant-alpha',
  cycleLabel: 'CYCLE-1',
  accumulatedCostUsd: 0,
  nodeOutput: JSON.stringify({ structure: 'user-auth', intent: { purpose: 'login' } }),
  ...overrides,
});

describe('CycleGateService', () => {
  // ── POSITIVE ───────────────────────────────────────────────────────────────

  it('CONTINUE when cost below limit and no security violations', async () => {
    const svc = new CycleGateService(makeDb() as any, makeFreedom(10) as any);
    const result = await svc.check(makeInput({ accumulatedCostUsd: 3 }));
    expect(result.isSuccess).toBe(true);
    expect(result.data!.verdict).toBe('CONTINUE');
    expect(result.data!.spendVerdict).toBe('CONTINUE');
    expect(result.data!.securityVerdict).toBe('CONTINUE');
  });

  it('HALT when accumulated cost equals spend limit', async () => {
    const svc = new CycleGateService(makeDb() as any, makeFreedom(10) as any);
    const result = await svc.check(makeInput({ accumulatedCostUsd: 10 }));
    expect(result.data!.verdict).toBe('HALT');
    expect(result.data!.spendVerdict).toBe('HALT');
    expect(result.data!.haltReason).toContain('Spend limit');
  });

  it('HALT when NODE output contains elasticsearch client import', async () => {
    const svc = new CycleGateService(makeDb() as any, makeFreedom(10) as any);
    const maliciousNode = JSON.stringify({
      structure: 'search-service',
      constraints: [`import { Client } from '@elastic/elasticsearch'`],
    });
    const result = await svc.check(makeInput({ nodeOutput: maliciousNode }));
    expect(result.data!.verdict).toBe('HALT');
    expect(result.data!.securityVerdict).toBe('HALT');
    expect(result.data!.securityViolations.length).toBeGreaterThan(0);
  });

  it('HALT when NODE output contains hardcoded password', async () => {
    const svc = new CycleGateService(makeDb() as any, makeFreedom(10) as any);
    const node = JSON.stringify({ constraints: [`password: 'hunter2longpass'`] });
    const result = await svc.check(makeInput({ nodeOutput: node }));
    expect(result.data!.verdict).toBe('HALT');
  });

  it('HALT when FREEDOM config forbidden_imports present in NODE output', async () => {
    const svc = new CycleGateService(makeDb() as any, makeFreedom(10, ['moment']) as any);
    const node = JSON.stringify({ structure: 'date-service', constraints: [`import moment`] });
    const result = await svc.check(makeInput({ nodeOutput: node }));
    expect(result.data!.verdict).toBe('HALT');
    expect(result.data!.securityViolations.some((v) => v.includes('moment'))).toBe(true);
  });

  it('DNA-8: stores to xiigen-cycle-visibility before returning', async () => {
    const db = makeDb();
    const svc = new CycleGateService(db as any, makeFreedom(10) as any);
    await svc.check(makeInput());
    // Wait for async non-blocking store (best-effort)
    await new Promise((r) => setTimeout(r, 20));
    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-cycle-visibility',
      expect.objectContaining({ sessionId: 'sess-001', cycleLabel: 'CYCLE-1' }),
      expect.any(String),
    );
  });

  it('spend HALT stores to spend-events (DNA-8)', async () => {
    const db = makeDb();
    const svc = new CycleGateService(db as any, makeFreedom(10) as any);
    await svc.check(makeInput({ accumulatedCostUsd: 15 }));
    await new Promise((r) => setTimeout(r, 20));
    const calls = (db.storeDocument as jest.Mock).mock.calls;
    const spendCall = calls.find((c) => c[0] === 'spend-events');
    expect(spendCall).toBeDefined();
    expect(spendCall[1]).toMatchObject({ event: 'spend.limit.exceeded' });
  });

  it('security HALT stores to security-violations (DNA-8)', async () => {
    const db = makeDb();
    const svc = new CycleGateService(db as any, makeFreedom(10) as any);
    const node = JSON.stringify({ x: `password: 'supersecretpass'` });
    await svc.check(makeInput({ nodeOutput: node }));
    await new Promise((r) => setTimeout(r, 20));
    const calls = (db.storeDocument as jest.Mock).mock.calls;
    const secCall = calls.find((c) => c[0] === 'security-violations');
    expect(secCall).toBeDefined();
  });

  it('cycleLabel appears in visibility record', async () => {
    const db = makeDb();
    const svc = new CycleGateService(db as any, makeFreedom(10) as any);
    await svc.check(makeInput({ cycleLabel: 'CYCLE-2' }));
    await new Promise((r) => setTimeout(r, 20));
    const calls = (db.storeDocument as jest.Mock).mock.calls;
    const visCall = calls.find((c) => c[0] === 'xiigen-cycle-visibility');
    expect(visCall[1]).toMatchObject({ cycleLabel: 'CYCLE-2' });
  });

  // ── NEGATIVE (DNA-3) ──────────────────────────────────────────────────────

  it('DNA-3: returns CONTINUE (not throws) when no db and no freedom config', async () => {
    const svc = new CycleGateService(); // no dependencies
    const result = await svc.check(makeInput({ accumulatedCostUsd: 5 }));
    expect(result.isSuccess).toBe(true);
    expect(result.data!.verdict).toBe('CONTINUE');
  });

  it('DNA-3: returns CONTINUE when FREEDOM config throws', async () => {
    const badFreedom = { get: jest.fn().mockRejectedValue(new Error('FREEDOM down')) };
    const svc = new CycleGateService(makeDb() as any, badFreedom as any);
    const result = await svc.check(makeInput());
    expect(result.isSuccess).toBe(true);
    expect(result.data!.verdict).toBe('CONTINUE');
  });

  // ── SCOPE isolation tests ──────────────────────────────────────────────────

  it('SCOPE-1: spend-events record includes tenantId from CycleGateInput', async () => {
    const db = makeDb();
    const svc = new CycleGateService(db as any, makeFreedom(10) as any);
    await svc.check(makeInput({ accumulatedCostUsd: 15, tenantId: 'acme-corp' }));
    await new Promise((r) => setTimeout(r, 20));
    const calls = (db.storeDocument as jest.Mock).mock.calls;
    const spendCall = calls.find((c) => c[0] === 'spend-events');
    expect(spendCall).toBeDefined();
    expect(spendCall[1]).toMatchObject({ tenantId: 'acme-corp' });
  });

  it('SCOPE-2: security-violations record includes tenantId from CycleGateInput', async () => {
    const db = makeDb();
    const svc = new CycleGateService(db as any, makeFreedom(10) as any);
    const node = JSON.stringify({ x: `password: 'supersecretpass'` });
    await svc.check(makeInput({ nodeOutput: node, tenantId: 'acme-corp' }));
    await new Promise((r) => setTimeout(r, 20));
    const calls = (db.storeDocument as jest.Mock).mock.calls;
    const secCall = calls.find((c) => c[0] === 'security-violations');
    expect(secCall).toBeDefined();
    expect(secCall[1]).toMatchObject({ tenantId: 'acme-corp' });
  });
});
