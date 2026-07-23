/**
 * ContextEfficiencyCheck — Unit Tests (T457).
 *
 * Tests:
 *   CEC-1:  missing tenantId → UNSCOPED_QUERY
 *   CEC-2:  empty allocation plan → success (0 fits within budget)
 *   CEC-3:  total allocation within budget → success with remaining
 *   CEC-4:  total exceeds budget → CONTEXT_OVER_BUDGET (hard stop)
 *   CEC-5:  CONTEXT_OVER_BUDGET stores record in DB
 *   CEC-6:  section >40% of budget generates suggestion
 *   CEC-7:  suggestions are informational — result has suggestions array
 *   CEC-8:  budget from FREEDOM config used when available
 */

import { ContextEfficiencyCheck } from '../../src/engine/flows/rag-optimization/context-efficiency-check.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-cec-test';

function makeDb(configDocs: Record<string, unknown>[] = []) {
  const stored: any[] = [];
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.success(configDocs)),
    storeDocument: jest.fn(async (_i: string, doc: any, id?: string) => {
      stored.push({ ...doc, _id: id });
      return DataProcessResult.success({});
    }),
    _stored: stored,
  } as any;
}

describe('ContextEfficiencyCheck — Unit (T457)', () => {
  it('CEC-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new ContextEfficiencyCheck(makeDb());
    const r = await svc.checkAllocation('', { retrieval: 1000 });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('CEC-2: empty allocation → success (0 fits)', async () => {
    const svc = new ContextEfficiencyCheck(makeDb());
    const r = await svc.checkAllocation(TENANT, {});
    expect(r.isSuccess).toBe(true);
    expect(r.data!.allowed).toBe(true);
    expect(r.data!.totalAllocated).toBe(0);
  });

  it('CEC-3: allocation within budget → success with remaining', async () => {
    const svc = new ContextEfficiencyCheck(makeDb());
    const r = await svc.checkAllocation(TENANT, { retrieval: 1000, prompt: 500 });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.totalAllocated).toBe(1500);
    expect(r.data!.remaining).toBeGreaterThan(0);
  });

  it('CEC-4: total exceeds budget → CONTEXT_OVER_BUDGET', async () => {
    const config = [{ tenant_id: TENANT, active: true, context_budget: 100 }];
    const svc = new ContextEfficiencyCheck(makeDb(config));
    const r = await svc.checkAllocation(TENANT, { retrieval: 80, prompt: 50 });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('CONTEXT_OVER_BUDGET');
  });

  it('CEC-5: CONTEXT_OVER_BUDGET stores record in DB', async () => {
    const config = [{ tenant_id: TENANT, active: true, context_budget: 50 }];
    const db = makeDb(config);
    const svc = new ContextEfficiencyCheck(db);
    await svc.checkAllocation(TENANT, { retrieval: 100 });
    const record = db._stored.find((d: any) => d.event === 'CONTEXT_OVER_BUDGET');
    expect(record).toBeDefined();
  });

  it('CEC-6: section >40% of budget generates suggestion', async () => {
    const svc = new ContextEfficiencyCheck(makeDb());
    const r = await svc.checkAllocation(TENANT, { retrieval: 60000 }); // 60k of 128k default = ~47%
    expect(r.isSuccess).toBe(true);
    expect(r.data!.suggestions.length).toBeGreaterThan(0);
  });

  it('CEC-7: suggestions are informational — suggestions array always returned', async () => {
    const svc = new ContextEfficiencyCheck(makeDb());
    const r = await svc.checkAllocation(TENANT, { retrieval: 100 });
    expect(r.isSuccess).toBe(true);
    expect(Array.isArray(r.data!.suggestions)).toBe(true);
  });

  it('CEC-8: budget from FREEDOM config used when available', async () => {
    const config = [{ tenant_id: TENANT, active: true, context_budget: 200 }];
    const svc = new ContextEfficiencyCheck(makeDb(config));
    const r = await svc.checkAllocation(TENANT, { retrieval: 150 }); // within 200
    expect(r.isSuccess).toBe(true);
    expect(r.data!.budget).toBe(200);
  });
});
