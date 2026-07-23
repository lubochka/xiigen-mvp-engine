/**
 * FLOW-30 Phase D — Service Tests (T475, T476, T477) + Integration.
 *
 * T475 TenantHealthScorer
 * T476 UsageMetricsAggregator (SCORE-0 async-only)
 * T477 TenantPolicyEnforcer
 * Integration: full tenant lifecycle chain
 */

import { TenantHealthScorer } from '../../src/engine/flows/tenant-lifecycle/tenant-health-scorer.service';
import { UsageMetricsAggregator } from '../../src/engine/flows/tenant-lifecycle/usage-metrics-aggregator.service';
import { TenantPolicyEnforcer } from '../../src/engine/flows/tenant-lifecycle/tenant-policy-enforcer.service';
import { TenantProvisionOrchestrator } from '../../src/engine/flows/tenant-lifecycle/tenant-provision-orchestrator.service';
import { QuotaEnforcementGate } from '../../src/engine/flows/tenant-lifecycle/quota-enforcement-gate.service';
import { TenantAuditEmitter } from '../../src/engine/flows/tenant-lifecycle/tenant-audit-emitter.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-flow30-d';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeDb(
  metricsDocs: Record<string, unknown>[] = [],
  extraDocs: Record<string, unknown>[] = [],
) {
  const stored: Record<string, unknown>[] = [];
  return {
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) => {
      stored.push(doc);
      return DataProcessResult.success({ ...doc, _id: id ?? 'x' });
    }),
    searchDocuments: jest.fn(async (index: string, _f: Record<string, unknown>) => {
      if (index === 'flow30-usage-metrics') return DataProcessResult.success(metricsDocs);
      if (index === 'flow30-quota-allocations') return DataProcessResult.success(extraDocs);
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

function makeFreedom(rules: Record<string, unknown>[] = []) {
  return {
    get: jest.fn(async () => DataProcessResult.success({ rules })),
  } as any;
}

function makeFailingFreedom() {
  return {
    get: jest.fn(async () => DataProcessResult.failure('CONFIG_NOT_FOUND', 'no config')),
  } as any;
}

// ── T475 TenantHealthScorer ───────────────────────────────────────────────────

describe('TenantHealthScorer (T475)', () => {
  it('F30D-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new TenantHealthScorer(makeDb(), makeQueue());
    const r = await svc.score('');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F30D-2: valid args → success', async () => {
    const svc = new TenantHealthScorer(makeDb(), makeQueue());
    const r = await svc.score(TENANT);
    expect(r.isSuccess).toBe(true);
  });

  it('F30D-3: healthScore is in range 0.0–1.0', async () => {
    const svc = new TenantHealthScorer(
      makeDb([{ errorRate: 0, quotaConsumption: 0 }]),
      makeQueue(),
    );
    const r = await svc.score(TENANT);
    expect(r.data!.healthScore).toBeGreaterThanOrEqual(0.0);
    expect(r.data!.healthScore).toBeLessThanOrEqual(1.0);
  });

  it('F30D-4: high error rate reduces health score', async () => {
    const svc = new TenantHealthScorer(
      makeDb([{ errorRate: 1.0, quotaConsumption: 0 }]),
      makeQueue(),
    );
    const r = await svc.score(TENANT);
    expect(r.data!.healthScore).toBeLessThan(1.0);
  });

  it('F30D-5: perfect metrics → health score = 1.0', async () => {
    const svc = new TenantHealthScorer(
      makeDb([{ errorRate: 0, quotaConsumption: 0 }]),
      makeQueue(),
    );
    const r = await svc.score(TENANT);
    expect(r.data!.healthScore).toBe(1.0);
  });

  it('F30D-6: scoreId is non-empty string', async () => {
    const svc = new TenantHealthScorer(makeDb(), makeQueue());
    const r = await svc.score(TENANT);
    expect(r.data!.scoreId.length).toBeGreaterThan(0);
  });

  it('F30D-7: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new TenantHealthScorer(db, queue);
    await svc.score(TENANT);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F30D-8: emits tenant.health.scored event', async () => {
    const queue = makeQueue();
    const svc = new TenantHealthScorer(makeDb(), queue);
    await svc.score(TENANT);
    expect(queue.enqueue).toHaveBeenCalledWith('tenant.health.scored', expect.any(Object));
  });

  it('F30D-9: DB store failure → error propagated', async () => {
    const svc = new TenantHealthScorer(makeFailingDb(), makeQueue());
    const r = await svc.score(TENANT);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });
});

// ── T476 UsageMetricsAggregator ───────────────────────────────────────────────

describe('UsageMetricsAggregator (T476) — SCORE-0 async-only', () => {
  it('F30D-10: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new UsageMetricsAggregator(makeDb(), makeQueue());
    const r = await svc.aggregate('', '2024-01');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F30D-11: missing period → MISSING_PERIOD', async () => {
    const svc = new UsageMetricsAggregator(makeDb(), makeQueue());
    const r = await svc.aggregate(TENANT, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_PERIOD');
  });

  it('F30D-12: valid args → success', async () => {
    const svc = new UsageMetricsAggregator(makeDb(), makeQueue());
    const r = await svc.aggregate(TENANT, '2024-01');
    expect(r.isSuccess).toBe(true);
  });

  it('F30D-13: period echoed in result', async () => {
    const svc = new UsageMetricsAggregator(makeDb(), makeQueue());
    const r = await svc.aggregate(TENANT, '2024-01');
    expect(r.data!.period).toBe('2024-01');
  });

  it('F30D-14: metricsId is non-empty string', async () => {
    const svc = new UsageMetricsAggregator(makeDb(), makeQueue());
    const r = await svc.aggregate(TENANT, '2024-01');
    expect(r.data!.metricsId.length).toBeGreaterThan(0);
  });

  it('F30D-15: storeDocument() BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new UsageMetricsAggregator(db, queue);
    await svc.aggregate(TENANT, '2024-01');
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F30D-16: emits usage.metrics.aggregated event', async () => {
    const queue = makeQueue();
    const svc = new UsageMetricsAggregator(makeDb(), queue);
    await svc.aggregate(TENANT, '2024-01');
    expect(queue.enqueue).toHaveBeenCalledWith('usage.metrics.aggregated', expect.any(Object));
  });
});

// ── T477 TenantPolicyEnforcer ─────────────────────────────────────────────────

describe('TenantPolicyEnforcer (T477)', () => {
  it('F30D-17: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new TenantPolicyEnforcer(makeDb(), makeQueue(), makeFreedom());
    const r = await svc.enforce('', {});
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('F30D-18: no rules → compliant', async () => {
    const svc = new TenantPolicyEnforcer(makeDb(), makeQueue(), makeFreedom([]));
    const r = await svc.enforce(TENANT, { action: 'read' });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.compliant).toBe(true);
    expect(r.data!.violatedRules).toHaveLength(0);
  });

  it('F30D-19: rules satisfied → compliant', async () => {
    const rules = [{ id: 'rule-1', field: 'action', operator: 'eq', value: 'read' }];
    const svc = new TenantPolicyEnforcer(makeDb(), makeQueue(), makeFreedom(rules));
    const r = await svc.enforce(TENANT, { action: 'read' });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.compliant).toBe(true);
  });

  it('F30D-20: rule violated → POLICY_VIOLATION', async () => {
    const rules = [{ id: 'rule-1', field: 'action', operator: 'eq', value: 'read' }];
    const svc = new TenantPolicyEnforcer(makeDb(), makeQueue(), makeFreedom(rules));
    const r = await svc.enforce(TENANT, { action: 'delete' });
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('POLICY_VIOLATION');
  });

  it('F30D-21: violation logged — storeDocument called', async () => {
    const db = makeDb();
    const rules = [{ id: 'rule-1', field: 'action', operator: 'eq', value: 'read' }];
    const svc = new TenantPolicyEnforcer(db, makeQueue(), makeFreedom(rules));
    await svc.enforce(TENANT, { action: 'delete' });
    expect(db.storeDocument).toHaveBeenCalledWith(
      'flow30-policy-violations',
      expect.any(Object),
      expect.any(String),
    );
  });

  it('F30D-22: violation emits policy.violation.detected', async () => {
    const queue = makeQueue();
    const rules = [{ id: 'rule-1', field: 'action', operator: 'eq', value: 'read' }];
    const svc = new TenantPolicyEnforcer(makeDb(), queue, makeFreedom(rules));
    await svc.enforce(TENANT, { action: 'delete' });
    expect(queue.enqueue).toHaveBeenCalledWith('policy.violation.detected', expect.any(Object));
  });

  it('F30D-23: FREEDOM config failure → error propagated', async () => {
    const svc = new TenantPolicyEnforcer(makeDb(), makeQueue(), makeFailingFreedom());
    const r = await svc.enforce(TENANT, {});
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('CONFIG_NOT_FOUND');
  });

  it('F30D-24: storeDocument() BEFORE enqueue() on violation — DNA-8', async () => {
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
    const rules = [{ id: 'rule-1', field: 'action', operator: 'eq', value: 'read' }];
    const svc = new TenantPolicyEnforcer(db, queue, makeFreedom(rules));
    await svc.enforce(TENANT, { action: 'delete' });
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });
});

// ── Integration: full FLOW-30 tenant lifecycle ────────────────────────────────

describe('FLOW-30 Integration — Tenant Lifecycle', () => {
  it('F30D-25: all 10 FLOW-30 services return DataProcessResult', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const freedom = {
      get: jest.fn(async () => DataProcessResult.success({ default_days: 30, rules: [] })),
    } as any;

    const { TenantProvisionOrchestrator: TPO } =
      await import('../../src/engine/flows/tenant-lifecycle/tenant-provision-orchestrator.service');
    const { ResourceQuotaAllocator: RQA } =
      await import('../../src/engine/flows/tenant-lifecycle/resource-quota-allocator.service');
    const { TenantConfigInheritance: TCI } =
      await import('../../src/engine/flows/tenant-lifecycle/tenant-config-inheritance.service');
    const { QuotaEnforcementGate: QEG } =
      await import('../../src/engine/flows/tenant-lifecycle/quota-enforcement-gate.service');
    const { CrossTenantIsolationCheck: CTIC } =
      await import('../../src/engine/flows/tenant-lifecycle/cross-tenant-isolation-check.service');
    const { TenantAuditEmitter: TAE } =
      await import('../../src/engine/flows/tenant-lifecycle/tenant-audit-emitter.service');
    const { TenantOffboardingHandler: TOH } =
      await import('../../src/engine/flows/tenant-lifecycle/tenant-offboarding-handler.service');
    const { TenantHealthScorer: THS } =
      await import('../../src/engine/flows/tenant-lifecycle/tenant-health-scorer.service');
    const { UsageMetricsAggregator: UMA } =
      await import('../../src/engine/flows/tenant-lifecycle/usage-metrics-aggregator.service');
    const { TenantPolicyEnforcer: TPE } =
      await import('../../src/engine/flows/tenant-lifecycle/tenant-policy-enforcer.service');

    const rqa_freedom = {
      get: jest.fn(async () =>
        DataProcessResult.success({ pro: { computeUnits: 100, storageGb: 50 } }),
      ),
    } as any;

    const results = await Promise.all([
      new TPO(db, queue).provision(TENANT, 'pro'),
      new RQA(db, queue, rqa_freedom).allocate(TENANT, 'pro'),
      new TCI(db, queue).resolve(TENANT, {}, {}, {}),
      new QEG(db, queue).check(TENANT, 'compute'),
      new CTIC(db, queue).check(TENANT, TENANT, 'res-1'),
      new TAE(db, queue).record(TENANT, 'TEST_EVENT', 'entity-1', 'actor-1'),
      new TOH(db, queue, freedom).schedule(TENANT, 'admin-1'),
      new THS(db, queue).score(TENANT),
      new UMA(db, queue).aggregate(TENANT, '2024-01'),
      new TPE(db, queue, freedom).enforce(TENANT, { action: 'read' }),
    ]);

    for (const r of results) {
      expect(r).toHaveProperty('isSuccess');
    }
  });

  it('F30D-26: UNSCOPED_QUERY on all services when tenantId missing', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const freedom = { get: jest.fn(async () => DataProcessResult.success({ rules: [] })) } as any;

    const results = await Promise.all([
      new TenantProvisionOrchestrator(db, queue).provision('', 'pro'),
      new QuotaEnforcementGate(db, queue).check('', 'compute'),
      new TenantAuditEmitter(db, queue).record('', 'EVT', 'e', 'a'),
      new TenantHealthScorer(db, queue).score(''),
      new UsageMetricsAggregator(db, queue).aggregate('', '2024-01'),
      new TenantPolicyEnforcer(db, queue, freedom).enforce('', {}),
    ]);

    for (const r of results) {
      expect(r.isSuccess).toBe(false);
      expect(r.errorCode).toBe('UNSCOPED_QUERY');
    }
  });
});
