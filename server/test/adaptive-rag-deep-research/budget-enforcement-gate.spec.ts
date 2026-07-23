/**
 * BudgetEnforcementGate — Unit Tests (T446).
 *
 * Tests:
 *   BEG-1:  missing tenantId → UNSCOPED_QUERY
 *   BEG-2:  negative requestedTokens → INVALID_TOKEN_COUNT
 *   BEG-3:  negative estimatedCost → INVALID_COST
 *   BEG-4:  within budget → success with remainingTokens/Cost
 *   BEG-5:  tokens exceed remaining → BUDGET_EXCEEDED (hard stop)
 *   BEG-6:  cost exceeds remaining → BUDGET_EXCEEDED (hard stop)
 *   BEG-7:  zero allocation within budget → success (zero fits)
 *   BEG-8:  BUDGET_EXCEEDED stores enforcement record in DB
 */

import { BudgetEnforcementGate } from '../../src/engine/flows/rag-optimization/budget-enforcement-gate.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-beg-test';

function makeDb(
  configDocs: Record<string, unknown>[] = [],
  usageDocs: Record<string, unknown>[] = [],
) {
  const stored: any[] = [];
  return {
    searchDocuments: jest.fn(async (_i: string, filters: any) => {
      if (_i === 'flow29-budget-config') return DataProcessResult.success(configDocs);
      if (_i === 'flow29-budget-usage') return DataProcessResult.success(usageDocs);
      return DataProcessResult.success([]);
    }),
    storeDocument: jest.fn(async (_i: string, doc: any, id?: string) => {
      stored.push({ ...doc, _id: id });
      return DataProcessResult.success({ ...doc });
    }),
    _stored: stored,
  } as any;
}

describe('BudgetEnforcementGate — Unit (T446)', () => {
  it('BEG-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new BudgetEnforcementGate(makeDb());
    const r = await svc.checkBudget('', 1000, 0.5);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('BEG-2: negative tokens → INVALID_TOKEN_COUNT', async () => {
    const svc = new BudgetEnforcementGate(makeDb());
    const r = await svc.checkBudget(TENANT, -1, 0.5);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('INVALID_TOKEN_COUNT');
  });

  it('BEG-3: negative cost → INVALID_COST', async () => {
    const svc = new BudgetEnforcementGate(makeDb());
    const r = await svc.checkBudget(TENANT, 1000, -0.1);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('INVALID_COST');
  });

  it('BEG-4: within budget → success with remaining values', async () => {
    const svc = new BudgetEnforcementGate(makeDb());
    const r = await svc.checkBudget(TENANT, 1000, 0.5);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.allowed).toBe(true);
    expect(r.data!.remainingTokens).toBeGreaterThan(0);
    expect(r.data!.remainingCost).toBeGreaterThan(0);
  });

  it('BEG-5: tokens exceed budget → BUDGET_EXCEEDED', async () => {
    const config = [{ tenant_id: TENANT, active: true, token_limit: 100, cost_limit: 10.0 }];
    const svc = new BudgetEnforcementGate(makeDb(config));
    const r = await svc.checkBudget(TENANT, 200, 0.1);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('BUDGET_EXCEEDED');
  });

  it('BEG-6: cost exceeds budget → BUDGET_EXCEEDED', async () => {
    const config = [{ tenant_id: TENANT, active: true, token_limit: 100_000, cost_limit: 1.0 }];
    const svc = new BudgetEnforcementGate(makeDb(config));
    const r = await svc.checkBudget(TENANT, 100, 5.0);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('BUDGET_EXCEEDED');
  });

  it('BEG-7: zero allocation → success (zero fits)', async () => {
    const svc = new BudgetEnforcementGate(makeDb());
    const r = await svc.checkBudget(TENANT, 0, 0.0);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.allowed).toBe(true);
  });

  it('BEG-8: BUDGET_EXCEEDED stores enforcement record', async () => {
    const config = [{ tenant_id: TENANT, active: true, token_limit: 50, cost_limit: 1.0 }];
    const db = makeDb(config);
    const svc = new BudgetEnforcementGate(db);
    await svc.checkBudget(TENANT, 100, 0.1);
    const enforceRecord = db._stored.find((d: any) => d.event === 'BUDGET_EXCEEDED');
    expect(enforceRecord).toBeDefined();
  });
});
