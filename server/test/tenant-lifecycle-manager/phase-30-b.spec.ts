/**
 * FLOW-30 Phase B — Service Tests (T468, T469, T470).
 *
 * T468 TenantProvisionOrchestrator
 * T469 ResourceQuotaAllocator
 * T470 TenantConfigInheritance
 */

import { TenantProvisionOrchestrator } from '../../src/engine/flows/tenant-lifecycle/tenant-provision-orchestrator.service';
import { ResourceQuotaAllocator } from '../../src/engine/flows/tenant-lifecycle/resource-quota-allocator.service';
import { TenantConfigInheritance } from '../../src/engine/flows/tenant-lifecycle/tenant-config-inheritance.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-flow30-b';
const PLAN = 'pro';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDb(existingDocs: Record<string, unknown>[] = []) {
  const stored: Record<string, unknown>[] = [];
  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) => {
      stored.push(doc);
      return DataProcessResult.success({ ...doc, _id: id ?? 'x' });
    }),
    searchDocuments: jest.fn(async (_i: string, _f: Record<string, unknown>) =>
      DataProcessResult.success(existingDocs),
    ),
    _stored: stored,
  } as any;
}

function makeFailingDb() {
  return {
    storeDocument: jest.fn(async () => DataProcessResult.failure('STORAGE_FAILED', 'write error')),
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
  } as any;
}

function makeQueue() {
  const events: any[] = [];
  return {
    enqueue: jest.fn(async (evt: string, data: any) => {
      events.push({ evt, data });
      return DataProcessResult.success('m');
    }),
    _events: events,
  } as any;
}

function makeFreedom(
  tiers: Record<string, unknown> = { pro: { computeUnits: 100, storageGb: 50 } },
) {
  return {
    get: jest.fn(async (_key: string) => DataProcessResult.success(tiers)),
  } as any;
}

function makeFailingFreedom() {
  return {
    get: jest.fn(async () => DataProcessResult.failure('CONFIG_NOT_FOUND', 'no config')),
  } as any;
}

// ── T468 TenantProvisionOrchestrator ─────────────────────────────────────────

describe('TenantProvisionOrchestrator (T468)', () => {
  it('F30B-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new TenantProvisionOrchestrator(makeDb(), makeQueue());
    const r = await svc.provision('', PLAN);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F30B-2: missing planId → MISSING_PLAN_ID', async () => {
    const svc = new TenantProvisionOrchestrator(makeDb(), makeQueue());
    const r = await svc.provision(TENANT, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_PLAN_ID');
  });

  it('F30B-3: valid args → success', async () => {
    const svc = new TenantProvisionOrchestrator(makeDb(), makeQueue());
    const r = await svc.provision(TENANT, PLAN);
    expect(r.isSuccess).toBe(true);
  });

  it('F30B-4: returns status QUEUED', async () => {
    const svc = new TenantProvisionOrchestrator(makeDb(), makeQueue());
    const r = await svc.provision(TENANT, PLAN);
    expect(r.data!.status).toBe('QUEUED');
  });

  it('F30B-5: provisionId is non-empty string', async () => {
    const svc = new TenantProvisionOrchestrator(makeDb(), makeQueue());
    const r = await svc.provision(TENANT, PLAN);
    expect(r.data!.provisionId.length).toBeGreaterThan(0);
  });

  it('F30B-6: tenantId echoed in result', async () => {
    const svc = new TenantProvisionOrchestrator(makeDb(), makeQueue());
    const r = await svc.provision(TENANT, PLAN);
    expect(r.data!.tenantId).toBe(TENANT);
  });

  it('F30B-7: idempotent — second call returns existing without re-storing', async () => {
    const existingDoc = {
      provisionId: 'existing-id',
      tenantId: TENANT,
      provisionedAt: '2024-01-01T00:00:00.000Z',
    };
    const db = makeDb([existingDoc]);
    const svc = new TenantProvisionOrchestrator(db, makeQueue());
    const r = await svc.provision(TENANT, PLAN);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.provisionId).toBe('existing-id');
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('F30B-8: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
      searchDocuments: jest.fn(async () => DataProcessResult.success([])),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('m');
      }),
    } as any;
    const svc = new TenantProvisionOrchestrator(db, queue);
    await svc.provision(TENANT, PLAN);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F30B-9: DB store failure → error propagated', async () => {
    const svc = new TenantProvisionOrchestrator(makeFailingDb(), makeQueue());
    const r = await svc.provision(TENANT, PLAN);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('F30B-10: emits tenant.provisioned event', async () => {
    const queue = makeQueue();
    const svc = new TenantProvisionOrchestrator(makeDb(), queue);
    await svc.provision(TENANT, PLAN);
    expect(queue.enqueue).toHaveBeenCalledWith('tenant.provisioned', expect.any(Object));
  });
});

// ── T469 ResourceQuotaAllocator ───────────────────────────────────────────────

describe('ResourceQuotaAllocator (T469)', () => {
  it('F30B-11: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new ResourceQuotaAllocator(makeDb(), makeQueue(), makeFreedom());
    const r = await svc.allocate('', PLAN);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F30B-12: missing planId → MISSING_PLAN_ID', async () => {
    const svc = new ResourceQuotaAllocator(makeDb(), makeQueue(), makeFreedom());
    const r = await svc.allocate(TENANT, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_PLAN_ID');
  });

  it('F30B-13: valid args → success', async () => {
    const svc = new ResourceQuotaAllocator(makeDb(), makeQueue(), makeFreedom());
    const r = await svc.allocate(TENANT, PLAN);
    expect(r.isSuccess).toBe(true);
  });

  it('F30B-14: quota values come from FREEDOM config', async () => {
    const svc = new ResourceQuotaAllocator(
      makeDb(),
      makeQueue(),
      makeFreedom({ pro: { computeUnits: 100, storageGb: 50 } }),
    );
    const r = await svc.allocate(TENANT, PLAN);
    expect(r.data!.computeUnits).toBe(100);
    expect(r.data!.storageGb).toBe(50);
  });

  it('F30B-15: FREEDOM config failure → error propagated', async () => {
    const svc = new ResourceQuotaAllocator(makeDb(), makeQueue(), makeFailingFreedom());
    const r = await svc.allocate(TENANT, PLAN);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('CONFIG_NOT_FOUND');
  });

  it('F30B-16: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('m');
      }),
    } as any;
    const svc = new ResourceQuotaAllocator(db, queue, makeFreedom());
    await svc.allocate(TENANT, PLAN);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F30B-17: emits quota.allocated event', async () => {
    const queue = makeQueue();
    const svc = new ResourceQuotaAllocator(makeDb(), queue, makeFreedom());
    await svc.allocate(TENANT, PLAN);
    expect(queue.enqueue).toHaveBeenCalledWith('quota.allocated', expect.any(Object));
  });

  it('F30B-18: quotaId is non-empty string', async () => {
    const svc = new ResourceQuotaAllocator(makeDb(), makeQueue(), makeFreedom());
    const r = await svc.allocate(TENANT, PLAN);
    expect(r.data!.quotaId.length).toBeGreaterThan(0);
  });
});

// ── T470 TenantConfigInheritance ──────────────────────────────────────────────

describe('TenantConfigInheritance (T470)', () => {
  it('F30B-19: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new TenantConfigInheritance(makeDb(), makeQueue());
    const r = await svc.resolve('', {}, {}, {});
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F30B-20: valid args → success', async () => {
    const svc = new TenantConfigInheritance(makeDb(), makeQueue());
    const r = await svc.resolve(TENANT, { a: 1 }, { b: 2 }, { c: 3 });
    expect(r.isSuccess).toBe(true);
  });

  it('F30B-21: global → plan → tenant-override merge order (later wins)', async () => {
    const svc = new TenantConfigInheritance(makeDb(), makeQueue());
    const r = await svc.resolve(
      TENANT,
      { key: 'global', x: 1 },
      { key: 'plan', y: 2 },
      { key: 'tenant', z: 3 },
    );
    expect(r.data!.effectiveConfig['key']).toBe('tenant');
    expect(r.data!.effectiveConfig['x']).toBe(1);
    expect(r.data!.effectiveConfig['y']).toBe(2);
    expect(r.data!.effectiveConfig['z']).toBe(3);
  });

  it('F30B-22: plan overrides global when no tenant-override', async () => {
    const svc = new TenantConfigInheritance(makeDb(), makeQueue());
    const r = await svc.resolve(TENANT, { key: 'global' }, { key: 'plan' }, {});
    expect(r.data!.effectiveConfig['key']).toBe('plan');
  });

  it('F30B-23: configId is non-empty string', async () => {
    const svc = new TenantConfigInheritance(makeDb(), makeQueue());
    const r = await svc.resolve(TENANT, {}, {}, {});
    expect(r.data!.configId.length).toBeGreaterThan(0);
  });

  it('F30B-24: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('m');
      }),
    } as any;
    const svc = new TenantConfigInheritance(db, queue);
    await svc.resolve(TENANT, {}, {}, {});
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F30B-25: DB store failure → error propagated', async () => {
    const svc = new TenantConfigInheritance(makeFailingDb(), makeQueue());
    const r = await svc.resolve(TENANT, {}, {}, {});
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('F30B-26: emits config.resolved event', async () => {
    const queue = makeQueue();
    const svc = new TenantConfigInheritance(makeDb(), queue);
    await svc.resolve(TENANT, {}, {}, {});
    expect(queue.enqueue).toHaveBeenCalledWith('config.resolved', expect.any(Object));
  });

  it('F30B-27: resolvedAt is ISO string', async () => {
    const svc = new TenantConfigInheritance(makeDb(), makeQueue());
    const r = await svc.resolve(TENANT, {}, {}, {});
    expect(r.data!.resolvedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
