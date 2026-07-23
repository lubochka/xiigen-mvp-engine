/**
 * FLOW-30 Phase C — Service Tests (T471, T472, T473, T474).
 *
 * T471 QuotaEnforcementGate
 * T472 CrossTenantIsolationCheck
 * T473 TenantAuditEmitter
 * T474 TenantOffboardingHandler
 */

import { QuotaEnforcementGate } from '../../src/engine/flows/tenant-lifecycle/quota-enforcement-gate.service';
import { CrossTenantIsolationCheck } from '../../src/engine/flows/tenant-lifecycle/cross-tenant-isolation-check.service';
import { TenantAuditEmitter } from '../../src/engine/flows/tenant-lifecycle/tenant-audit-emitter.service';
import { TenantOffboardingHandler } from '../../src/engine/flows/tenant-lifecycle/tenant-offboarding-handler.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-flow30-c';
const TENANT_B = 'tenant-flow30-c-other';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDb(
  usageDocs: Record<string, unknown>[] = [],
  quotaDocs: Record<string, unknown>[] = [],
) {
  const stored: Record<string, unknown>[] = [];
  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) => {
      stored.push(doc);
      return DataProcessResult.success({ ...doc, _id: id ?? 'x' });
    }),
    searchDocuments: jest.fn(async (index: string, _f: Record<string, unknown>) => {
      if (index === 'flow30-usage-metrics') return DataProcessResult.success(usageDocs);
      if (index === 'flow30-quota-allocations') return DataProcessResult.success(quotaDocs);
      return DataProcessResult.success([]);
    }),
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

function makeFreedom(retentionDays = 30) {
  return {
    get: jest.fn(async () => DataProcessResult.success({ default_days: retentionDays })),
  } as any;
}

function makeFailingFreedom() {
  return {
    get: jest.fn(async () => DataProcessResult.failure('CONFIG_NOT_FOUND', 'no config')),
  } as any;
}

// ── T471 QuotaEnforcementGate ─────────────────────────────────────────────────

describe('QuotaEnforcementGate (T471)', () => {
  it('F30C-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new QuotaEnforcementGate(makeDb(), makeQueue());
    const r = await svc.check('', 'compute');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F30C-2: missing resourceType → MISSING_RESOURCE_TYPE', async () => {
    const svc = new QuotaEnforcementGate(makeDb(), makeQueue());
    const r = await svc.check(TENANT, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_RESOURCE_TYPE');
  });

  it('F30C-3: quota exceeded → QUOTA_EXCEEDED hard stop', async () => {
    const db = makeDb([{ currentUsage: 100 }], [{ computeUnits: 100 }]);
    const svc = new QuotaEnforcementGate(db, makeQueue());
    const r = await svc.check(TENANT, 'compute');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('QUOTA_EXCEEDED');
  });

  it('F30C-4: quota exceeded → no store, no enqueue', async () => {
    const db = makeDb([{ currentUsage: 100 }], [{ computeUnits: 100 }]);
    const queue = makeQueue();
    const svc = new QuotaEnforcementGate(db, queue);
    await svc.check(TENANT, 'compute');
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('F30C-5: within quota → success', async () => {
    const db = makeDb([{ currentUsage: 50 }], [{ computeUnits: 100 }]);
    const svc = new QuotaEnforcementGate(db, makeQueue());
    const r = await svc.check(TENANT, 'compute');
    expect(r.isSuccess).toBe(true);
    expect(r.data!.withinQuota).toBe(true);
  });

  it('F30C-6: within quota → storeDocument() BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
      searchDocuments: jest.fn(async (index: string) => {
        if (index === 'flow30-usage-metrics')
          return DataProcessResult.success([{ currentUsage: 0 }]);
        return DataProcessResult.success([{ computeUnits: 100 }]);
      }),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('m');
      }),
    } as any;
    const svc = new QuotaEnforcementGate(db, queue);
    await svc.check(TENANT, 'compute');
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F30C-7: within quota → emits quota.check.passed', async () => {
    const db = makeDb([{ currentUsage: 0 }], [{ computeUnits: 100 }]);
    const queue = makeQueue();
    const svc = new QuotaEnforcementGate(db, queue);
    await svc.check(TENANT, 'compute');
    expect(queue.enqueue).toHaveBeenCalledWith('quota.check.passed', expect.any(Object));
  });
});

// ── T472 CrossTenantIsolationCheck ────────────────────────────────────────────

describe('CrossTenantIsolationCheck (T472)', () => {
  it('F30C-8: missing requestingTenantId → UNSCOPED_QUERY', async () => {
    const svc = new CrossTenantIsolationCheck(makeDb(), makeQueue());
    const r = await svc.check('', TENANT_B, 'res-1');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F30C-9: cross-tenant mismatch → ISOLATION_VIOLATION', async () => {
    const svc = new CrossTenantIsolationCheck(makeDb(), makeQueue());
    const r = await svc.check(TENANT, TENANT_B, 'res-1');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('ISOLATION_VIOLATION');
  });

  it('F30C-10: violation logged to audit store — storeDocument called', async () => {
    const db = makeDb();
    const svc = new CrossTenantIsolationCheck(db, makeQueue());
    await svc.check(TENANT, TENANT_B, 'res-1');
    expect(db.storeDocument).toHaveBeenCalledWith(
      'flow30-isolation-violations',
      expect.any(Object),
      expect.any(String),
    );
  });

  it('F30C-11: violation emits isolation.violation.detected', async () => {
    const queue = makeQueue();
    const svc = new CrossTenantIsolationCheck(makeDb(), queue);
    await svc.check(TENANT, TENANT_B, 'res-1');
    expect(queue.enqueue).toHaveBeenCalledWith('isolation.violation.detected', expect.any(Object));
  });

  it('F30C-12: same tenant → success, isolated: true', async () => {
    const svc = new CrossTenantIsolationCheck(makeDb(), makeQueue());
    const r = await svc.check(TENANT, TENANT, 'res-1');
    expect(r.isSuccess).toBe(true);
    expect(r.data!.isolated).toBe(true);
  });

  it('F30C-13: same tenant → no store, no enqueue', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new CrossTenantIsolationCheck(db, queue);
    await svc.check(TENANT, TENANT, 'res-1');
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});

// ── T473 TenantAuditEmitter ───────────────────────────────────────────────────

describe('TenantAuditEmitter (T473)', () => {
  it('F30C-14: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new TenantAuditEmitter(makeDb(), makeQueue());
    const r = await svc.record('', 'USER_LOGIN', 'entity-1', 'actor-1');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F30C-15: missing eventType → MISSING_EVENT_TYPE', async () => {
    const svc = new TenantAuditEmitter(makeDb(), makeQueue());
    const r = await svc.record(TENANT, '', 'entity-1', 'actor-1');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_EVENT_TYPE');
  });

  it('F30C-16: valid args → success', async () => {
    const svc = new TenantAuditEmitter(makeDb(), makeQueue());
    const r = await svc.record(TENANT, 'USER_LOGIN', 'entity-1', 'actor-1');
    expect(r.isSuccess).toBe(true);
  });

  it('F30C-17: auditId is non-empty string', async () => {
    const svc = new TenantAuditEmitter(makeDb(), makeQueue());
    const r = await svc.record(TENANT, 'USER_LOGIN', 'entity-1', 'actor-1');
    expect(r.data!.auditId.length).toBeGreaterThan(0);
  });

  it('F30C-18: eventType echoed in result', async () => {
    const svc = new TenantAuditEmitter(makeDb(), makeQueue());
    const r = await svc.record(TENANT, 'USER_LOGIN', 'entity-1', 'actor-1');
    expect(r.data!.eventType).toBe('USER_LOGIN');
  });

  it('F30C-19: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new TenantAuditEmitter(db, queue);
    await svc.record(TENANT, 'USER_LOGIN', 'entity-1', 'actor-1');
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F30C-20: emits audit.event.recorded', async () => {
    const queue = makeQueue();
    const svc = new TenantAuditEmitter(makeDb(), queue);
    await svc.record(TENANT, 'USER_LOGIN', 'entity-1', 'actor-1');
    expect(queue.enqueue).toHaveBeenCalledWith('audit.event.recorded', expect.any(Object));
  });

  it('F30C-21: DB store failure → error propagated', async () => {
    const svc = new TenantAuditEmitter(makeFailingDb(), makeQueue());
    const r = await svc.record(TENANT, 'USER_LOGIN', 'entity-1', 'actor-1');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });
});

// ── T474 TenantOffboardingHandler ─────────────────────────────────────────────

describe('TenantOffboardingHandler (T474)', () => {
  it('F30C-22: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new TenantOffboardingHandler(makeDb(), makeQueue(), makeFreedom());
    const r = await svc.schedule('', 'admin-1');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F30C-23: valid args → success', async () => {
    const svc = new TenantOffboardingHandler(makeDb(), makeQueue(), makeFreedom());
    const r = await svc.schedule(TENANT, 'admin-1');
    expect(r.isSuccess).toBe(true);
  });

  it('F30C-24: retentionDays comes from FREEDOM config', async () => {
    const svc = new TenantOffboardingHandler(makeDb(), makeQueue(), makeFreedom(60));
    const r = await svc.schedule(TENANT, 'admin-1');
    expect(r.data!.retentionDays).toBe(60);
  });

  it('F30C-25: FREEDOM config failure → error propagated', async () => {
    const svc = new TenantOffboardingHandler(makeDb(), makeQueue(), makeFailingFreedom());
    const r = await svc.schedule(TENANT, 'admin-1');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('CONFIG_NOT_FOUND');
  });

  it('F30C-26: scheduledDeleteAt is in the future', async () => {
    const svc = new TenantOffboardingHandler(makeDb(), makeQueue(), makeFreedom(30));
    const r = await svc.schedule(TENANT, 'admin-1');
    const deleteDate = new Date(r.data!.scheduledDeleteAt);
    expect(deleteDate.getTime()).toBeGreaterThan(Date.now());
  });

  it('F30C-27: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new TenantOffboardingHandler(db, queue, makeFreedom());
    await svc.schedule(TENANT, 'admin-1');
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F30C-28: emits tenant.offboarding.scheduled event', async () => {
    const queue = makeQueue();
    const svc = new TenantOffboardingHandler(makeDb(), queue, makeFreedom());
    await svc.schedule(TENANT, 'admin-1');
    expect(queue.enqueue).toHaveBeenCalledWith('tenant.offboarding.scheduled', expect.any(Object));
  });

  it('F30C-29: offboardingId is non-empty string', async () => {
    const svc = new TenantOffboardingHandler(makeDb(), makeQueue(), makeFreedom());
    const r = await svc.schedule(TENANT, 'admin-1');
    expect(r.data!.offboardingId.length).toBeGreaterThan(0);
  });
});
