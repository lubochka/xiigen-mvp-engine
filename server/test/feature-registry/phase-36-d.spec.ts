/**
 * FLOW-36 Phase D — Porting Decision Engine Tests.
 *
 * 18 tests covering:
 *   - PortingCostEstimatorService
 *   - PortingDecisionGateService: PROHIBITED / BLOCKED / DEFER / APPROVE paths
 *   - CF-808: PROHIBITED guard is FIRST (no cost estimation for portingCandidate=false)
 *   - CF-809: PortingCostEstimator MUST NOT run when portingCandidate=false
 *   - DNA-8: storeDocument before enqueue on all decision outcomes
 *   - FLOW-33 engine-internal FT (T539) → PROHIBITED emitted
 *   - Figma FT-001 → APPROVE for Canva target (when score + cost conditions met)
 *   - Tenant isolation on decision index
 */

import {
  PortingCostEstimatorService,
  type CostEstimate,
} from '../../src/engine/flows/feature-registry/porting-cost-estimator.service';
import {
  PortingDecisionGateService,
  type PortingDecisionResult,
} from '../../src/engine/flows/feature-registry/porting-decision-gate.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factories ───────────────────────────────────────────────────────────

function makeRegistry(ftRecord: Record<string, unknown> | null = null) {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      stored.push({ index, doc, id });
      return DataProcessResult.success({ ...doc });
    }),
    searchDocuments: jest.fn(async (_index: string, filter: Record<string, unknown>) => {
      if (!ftRecord || ftRecord.ftId !== filter.ftId) return DataProcessResult.success([]);
      return DataProcessResult.success([ftRecord]);
    }),
    _stored: stored,
  } as any;
}

function makeRag(constraints: string[] = [], avgEffortDays: number = 5) {
  return {
    search: jest.fn(async () => DataProcessResult.success({ constraints, avgEffortDays })),
  } as any;
}

function makeQueue() {
  const events: Array<{ event: string; data: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (event: string, data: Record<string, unknown>) => {
      events.push({ event, data });
      return DataProcessResult.success('msg-id');
    }),
    _events: events,
  } as any;
}

function makeCostEstimator(costUsd: number = 1000, fail = false) {
  return {
    estimate: jest.fn(async () => {
      if (fail) return DataProcessResult.failure('COST_ERROR', 'RAG estimation failed');
      return DataProcessResult.success({
        costEstimateUsd: costUsd,
        effortDays: 5,
        complexityScore: 40,
        constraintsSummary: [],
        estimatedAt: new Date().toISOString(),
      });
    }),
  } as any;
}

const TENANT = 'tenant-flow36-d';
const CORR_ID = 'test-corr-001';

// ── PortingCostEstimatorService tests ─────────────────────────────────────────

describe('FLOW-36 Phase D — PortingCostEstimatorService', () => {
  it('F36D-1: portingCandidate=false FT → PORTING_PROHIBITED failure (CF-809)', async () => {
    const ftRecord = {
      ftId: 'FT-INTERNAL-519',
      tenantId: TENANT,
      portingCandidate: false,
      portingCandidateReason: 'Engine-internal generation loop',
      platforms: [],
      signals: {},
    };
    const svc = new PortingCostEstimatorService(makeRegistry(ftRecord), makeRag());
    const result = await svc.estimate('FT-INTERNAL-519', TENANT, 'canva');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PORTING_PROHIBITED');
  });

  it('F36D-2: portingCandidate=true → successful cost estimate', async () => {
    const ftRecord = {
      ftId: 'FT-001',
      tenantId: TENANT,
      portingCandidate: true,
      platforms: [{ platformId: 'figma', status: 'implemented' }],
      signals: {},
    };
    const svc = new PortingCostEstimatorService(
      makeRegistry(ftRecord),
      makeRag(['requires canvas API'], 8),
    );
    const result = await svc.estimate('FT-001', TENANT, 'canva');
    expect(result.isSuccess).toBe(true);
    const data = result.data as CostEstimate;
    expect(data.costEstimateUsd).toBeGreaterThan(0);
    expect(data.effortDays).toBe(8);
    expect(data.targetPlatform).toBe('canva');
  });

  it('F36D-3: missing ftId → failure', async () => {
    const svc = new PortingCostEstimatorService(makeRegistry(), makeRag());
    const result = await svc.estimate('', TENANT, 'canva');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_FT_ID');
  });

  it('F36D-4: FT not found → failure', async () => {
    const svc = new PortingCostEstimatorService(makeRegistry(null), makeRag());
    const result = await svc.estimate('FT-MISSING', TENANT, 'canva');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('FT_NOT_FOUND');
  });
});

// ── PortingDecisionGateService tests ──────────────────────────────────────────

describe('FLOW-36 Phase D — PortingDecisionGateService', () => {
  it('F36D-5: CF-808 — PROHIBITED guard fires FIRST for portingCandidate=false', async () => {
    const ftRecord = {
      ftId: 'FT-T539',
      tenantId: TENANT,
      portingCandidate: false,
      portingCandidateReason:
        'Engine-internal. ImplementFamilyMetaLoop exposes generation internals.',
      platformIncompatibilities: [],
      platforms: [],
    };
    const costEstimator = makeCostEstimator();
    const queue = makeQueue();

    const svc = new PortingDecisionGateService(makeRegistry(ftRecord), costEstimator, queue);
    const result = await svc.evaluate('FT-T539', TENANT, 'figma', 80, CORR_ID);

    expect(result.isSuccess).toBe(true);
    expect((result.data as PortingDecisionResult).decision).toBe('PROHIBITED');
    // CF-809: cost estimator MUST NOT be called
    expect(costEstimator.estimate).not.toHaveBeenCalled();
  });

  it('F36D-6: PROHIBITED — PortingProhibited event emitted with ftId + reason', async () => {
    const ftRecord = {
      ftId: 'FT-T540',
      tenantId: TENANT,
      portingCandidate: false,
      portingCandidateReason: 'Five-arbiter consensus gate is engine-internal.',
      platformIncompatibilities: [],
      platforms: [],
    };
    const queue = makeQueue();
    const svc = new PortingDecisionGateService(makeRegistry(ftRecord), makeCostEstimator(), queue);
    await svc.evaluate('FT-T540', TENANT, 'canva', 80, CORR_ID);

    const prohibitedEvent = queue._events.find(
      (e: { event: string }) => e.event === 'feature-registry.porting-prohibited',
    );
    expect(prohibitedEvent).toBeDefined();
    expect(prohibitedEvent!.data.ftId).toBe('FT-T540');
    expect(prohibitedEvent!.data.reason).toContain('engine-internal');
  });

  it('F36D-7: DNA-8 — storeDocument called before enqueue on PROHIBITED decision', async () => {
    const ftRecord = {
      ftId: 'FT-T541',
      tenantId: TENANT,
      portingCandidate: false,
      portingCandidateReason: 'Engine-internal regression analyzer.',
      platformIncompatibilities: [],
      platforms: [],
    };

    const callOrder: string[] = [];
    const registry = {
      storeDocument: jest.fn(async () => {
        callOrder.push('storeDocument');
        return DataProcessResult.success({});
      }),
      searchDocuments: jest.fn(async () => DataProcessResult.success([ftRecord])),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('msg-id');
      }),
    } as any;

    const svc = new PortingDecisionGateService(registry, makeCostEstimator(), queue);
    await svc.evaluate('FT-T541', TENANT, 'canva', 80, CORR_ID);

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThan(-1);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('F36D-8: BLOCKED — platform in platformIncompatibilities', async () => {
    const ftRecord = {
      ftId: 'FT-001',
      tenantId: TENANT,
      portingCandidate: true,
      platformIncompatibilities: ['miro'],
      platforms: [{ platformId: 'figma', status: 'implemented' }],
    };
    const queue = makeQueue();
    const svc = new PortingDecisionGateService(makeRegistry(ftRecord), makeCostEstimator(), queue);
    const result = await svc.evaluate('FT-001', TENANT, 'miro', 80, CORR_ID);

    expect(result.isSuccess).toBe(true);
    expect((result.data as PortingDecisionResult).decision).toBe('BLOCK');
    const blockedEvent = queue._events.find(
      (e: { event: string }) => e.event === 'feature-registry.porting-blocked',
    );
    expect(blockedEvent).toBeDefined();
  });

  it('F36D-9: DEFER — porting score below threshold', async () => {
    const ftRecord = {
      ftId: 'FT-001',
      tenantId: TENANT,
      portingCandidate: true,
      platformIncompatibilities: [],
      platforms: [],
    };
    const queue = makeQueue();
    const svc = new PortingDecisionGateService(
      makeRegistry(ftRecord),
      makeCostEstimator(1000),
      queue,
    );

    // Score 30 < threshold 60
    const result = await svc.evaluate('FT-001', TENANT, 'canva', 30, CORR_ID, {
      portingThreshold: 60,
      maxPortingCostUsd: 5000,
    });

    expect(result.isSuccess).toBe(true);
    expect((result.data as PortingDecisionResult).decision).toBe('DEFER');
    const deferEvent = queue._events.find(
      (e: { event: string }) => e.event === 'feature-registry.porting-deferred',
    );
    expect(deferEvent).toBeDefined();
    expect((result.data as PortingDecisionResult).estimatedReadyDate).toBeDefined();
  });

  it('F36D-10: BLOCK — cost exceeds max porting cost (score OK but cost too high)', async () => {
    const ftRecord = {
      ftId: 'FT-001',
      tenantId: TENANT,
      portingCandidate: true,
      platformIncompatibilities: [],
      platforms: [],
    };
    const queue = makeQueue();
    const svc = new PortingDecisionGateService(
      makeRegistry(ftRecord),
      makeCostEstimator(10000),
      queue,
    );

    // Score 80 >= threshold 60, but cost $10000 > maxCost $5000
    const result = await svc.evaluate('FT-001', TENANT, 'canva', 80, CORR_ID, {
      portingThreshold: 60,
      maxPortingCostUsd: 5000,
    });

    expect(result.isSuccess).toBe(true);
    expect((result.data as PortingDecisionResult).decision).toBe('BLOCK');
  });

  it('F36D-11: APPROVE — FT-001 porting to Canva with score >= threshold and cost within limit', async () => {
    const ftRecord = {
      ftId: 'FT-001',
      tenantId: TENANT,
      portingCandidate: true,
      platformIncompatibilities: [],
      platforms: [{ platformId: 'figma', status: 'implemented' }],
    };
    const queue = makeQueue();
    const svc = new PortingDecisionGateService(
      makeRegistry(ftRecord),
      makeCostEstimator(2000),
      queue,
    );

    // Score 75 >= threshold 60, cost $2000 < maxCost $5000
    const result = await svc.evaluate('FT-001', TENANT, 'canva', 75, CORR_ID, {
      portingThreshold: 60,
      maxPortingCostUsd: 5000,
    });

    expect(result.isSuccess).toBe(true);
    expect((result.data as PortingDecisionResult).decision).toBe('APPROVE');
    const approvedEvent = queue._events.find(
      (e: { event: string }) => e.event === 'feature-registry.porting-approved',
    );
    expect(approvedEvent).toBeDefined();
    expect(approvedEvent!.data.ftId).toBe('FT-001');
  });

  it('F36D-12: APPROVE — decision contains portingScore and costEstimateUsd', async () => {
    const ftRecord = {
      ftId: 'FT-001',
      tenantId: TENANT,
      portingCandidate: true,
      platformIncompatibilities: [],
      platforms: [],
    };
    const svc = new PortingDecisionGateService(
      makeRegistry(ftRecord),
      makeCostEstimator(1500),
      makeQueue(),
    );
    const result = await svc.evaluate('FT-001', TENANT, 'canva', 70, CORR_ID, {
      portingThreshold: 60,
      maxPortingCostUsd: 5000,
    });

    expect(result.isSuccess).toBe(true);
    const data = result.data as PortingDecisionResult;
    expect(data.portingScore).toBe(70);
    expect(data.costEstimateUsd).toBe(1500);
  });

  it('F36D-13: DNA-8 — storeDocument before enqueue on APPROVE decision', async () => {
    const ftRecord = {
      ftId: 'FT-001',
      tenantId: TENANT,
      portingCandidate: true,
      platformIncompatibilities: [],
      platforms: [],
    };

    const callOrder: string[] = [];
    const registry = {
      storeDocument: jest.fn(async () => {
        callOrder.push('storeDocument');
        return DataProcessResult.success({});
      }),
      searchDocuments: jest.fn(async () => DataProcessResult.success([ftRecord])),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('msg-id');
      }),
    } as any;

    const svc = new PortingDecisionGateService(registry, makeCostEstimator(1000), queue);
    await svc.evaluate('FT-001', TENANT, 'canva', 80, CORR_ID, {
      portingThreshold: 60,
      maxPortingCostUsd: 5000,
    });

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThan(-1);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('F36D-14: tenant isolation — decision stored in tenantId-scoped index', async () => {
    const ftRecord = {
      ftId: 'FT-001',
      tenantId: 'tenant-beta',
      portingCandidate: true,
      platformIncompatibilities: [],
      platforms: [],
    };
    const registry = makeRegistry(ftRecord);
    const svc = new PortingDecisionGateService(registry, makeCostEstimator(1000), makeQueue());
    await svc.evaluate('FT-001', 'tenant-beta', 'canva', 80, CORR_ID, {
      portingThreshold: 60,
      maxPortingCostUsd: 5000,
    });

    const storeCallArgs = (registry.storeDocument as jest.Mock).mock.calls;
    for (const call of storeCallArgs) {
      expect(call[0] as string).toMatch(/tenant-beta/);
    }
  });

  it('F36D-15: missing tenantId → failure (not throw)', async () => {
    const svc = new PortingDecisionGateService(makeRegistry(), makeCostEstimator(), makeQueue());
    const result = await svc.evaluate('FT-001', '', 'canva', 80, CORR_ID);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });

  it('F36D-16: cost estimator failure propagated correctly', async () => {
    const ftRecord = {
      ftId: 'FT-001',
      tenantId: TENANT,
      portingCandidate: true,
      platformIncompatibilities: [],
      platforms: [],
    };
    const svc = new PortingDecisionGateService(
      makeRegistry(ftRecord),
      makeCostEstimator(0, true),
      makeQueue(),
    );
    const result = await svc.evaluate('FT-001', TENANT, 'canva', 80, CORR_ID);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('COST_ERROR');
  });

  it('F36D-17: FLOW-33 T539 ImplementFamilyMetaLoop → PROHIBITED, no cost estimator call', async () => {
    // Simulates the exact FLOW-33 engine-internal scenario from the reference plan
    const ftRecord = {
      ftId: 'FT-T539-ENGINE',
      tenantId: TENANT,
      portingCandidate: false,
      portingCandidateReason:
        'Engine-internal. Porting would expose XIIGen generation internals to an untrusted third-party platform runtime.',
      platformIncompatibilities: [],
      platforms: [],
    };
    const costEstimator = makeCostEstimator();
    const queue = makeQueue();
    const svc = new PortingDecisionGateService(makeRegistry(ftRecord), costEstimator, queue);

    const result = await svc.evaluate('FT-T539-ENGINE', TENANT, 'figma', 95, CORR_ID);

    expect(result.isSuccess).toBe(true);
    expect((result.data as PortingDecisionResult).decision).toBe('PROHIBITED');
    expect(costEstimator.estimate).not.toHaveBeenCalled();

    const prohibitedEvent = queue._events.find(
      (e: { event: string }) => e.event === 'feature-registry.porting-prohibited',
    );
    expect(prohibitedEvent).toBeDefined();
    expect(prohibitedEvent!.data.reason).toContain('XIIGen generation internals');
  });

  it('F36D-18: FT not found → failure', async () => {
    const svc = new PortingDecisionGateService(
      makeRegistry(null),
      makeCostEstimator(),
      makeQueue(),
    );
    const result = await svc.evaluate('FT-MISSING', TENANT, 'canva', 80, CORR_ID);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('FT_NOT_FOUND');
  });
});
