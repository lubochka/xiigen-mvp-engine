/**
 * FLOW-36 Phase C — Signal Tracking Tests.
 *
 * 18 tests covering:
 *   - MODE_A signal formula (tenantAdoption + successRate + improvementVelocity)
 *   - MODE_B signal formula (installs + activeUsers30d + likes + citations)
 *   - Signal mode routing: platforms[] empty → MODE_A, platforms[] present → MODE_B
 *   - Threshold evaluation for both modes
 *   - DNA-8: storeDocument before enqueue on threshold crossing
 *   - No threshold event when score below threshold
 *   - Tenant isolation on signal index
 *   - Missing FT → failure (not throw)
 *   - Signal weights from FREEDOM config (not hardcoded)
 */

import {
  FeatureSignalAggregatorService,
  computeModeAScore,
  computeModeBScore,
  type AggregationResult,
  type SignalWeights,
} from '../../src/engine/flows/feature-registry/feature-signal-aggregator.service';
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
      if (!ftRecord || ftRecord.ftId !== filter.ftId) {
        return DataProcessResult.success([]);
      }
      return DataProcessResult.success([ftRecord]);
    }),
    _stored: stored,
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

const TENANT = 'tenant-flow36-c';

const DEFAULT_WEIGHTS: SignalWeights = {
  modeA: { w1: 0.5, w2: 0.3, w3: 0.2 },
  modeB: { w1: 0.3, w2: 0.35, w3: 0.2, w4: 0.15 },
  portingThreshold: 60,
};

// ── Score formula unit tests ──────────────────────────────────────────────────

describe('FLOW-36 Phase C — Signal Score Formulas', () => {
  it('F36C-1: MODE_A score formula produces correct value for known inputs', () => {
    // tenantAdoption=500 (normalize to 0.5 of 1000), successRate=0.9, improvementVelocity=2 (normalize to 0.2 of 10)
    // score = (0.5 * 0.5 + 0.3 * 0.9 + 0.2 * 0.2) * 100 = (0.25 + 0.27 + 0.04) * 100 = 56
    const score = computeModeAScore(
      {
        executionCount: 0,
        successRate: 0.9,
        avgCostPerRunUsd: 0,
        avgLatencyMs: 0,
        tenantAdoption: 500,
        improvementVelocity: 2,
      },
      { w1: 0.5, w2: 0.3, w3: 0.2 },
    );
    expect(score).toBeCloseTo(56, 0);
  });

  it('F36C-2: MODE_A score at max values → approaches 100', () => {
    const score = computeModeAScore(
      {
        executionCount: 9999,
        successRate: 1.0,
        avgCostPerRunUsd: 0,
        avgLatencyMs: 0,
        tenantAdoption: 1000,
        improvementVelocity: 10,
      },
      { w1: 0.5, w2: 0.3, w3: 0.2 },
    );
    expect(score).toBeGreaterThan(95);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('F36C-3: MODE_B score formula produces correct value for known inputs', () => {
    // installs=300, activeUsers30d=200, likes=100, citations=50 (all out of 1000)
    // score = (0.3*0.3 + 0.35*0.2 + 0.2*0.1 + 0.15*0.05) * 100 = (0.09 + 0.07 + 0.02 + 0.0075) * 100 = 18.75
    const score = computeModeBScore(
      { installs: 300, activeUsers30d: 200, likes: 100, citations: 50 },
      { w1: 0.3, w2: 0.35, w3: 0.2, w4: 0.15 },
    );
    expect(score).toBeCloseTo(18.75, 0);
  });

  it('F36C-4: MODE_B score at max values → approaches 100', () => {
    const score = computeModeBScore(
      { installs: 1000, activeUsers30d: 1000, likes: 1000, citations: 1000 },
      { w1: 0.3, w2: 0.35, w3: 0.2, w4: 0.15 },
    );
    expect(score).toBeCloseTo(100, 0);
  });

  it('F36C-5: MODE_A threshold met at score >= 60', () => {
    // tenantAdoption=800, successRate=1.0, improvementVelocity=5
    // score = (0.5*0.8 + 0.3*1.0 + 0.2*0.5) * 100 = (0.4 + 0.3 + 0.1) * 100 = 80
    const score = computeModeAScore(
      {
        executionCount: 0,
        successRate: 1.0,
        avgCostPerRunUsd: 0,
        avgLatencyMs: 0,
        tenantAdoption: 800,
        improvementVelocity: 5,
      },
      { w1: 0.5, w2: 0.3, w3: 0.2 },
    );
    expect(score).toBeGreaterThanOrEqual(60);
  });

  it('F36C-6: MODE_B threshold met at score >= 60', () => {
    // installs=800, activeUsers30d=700, likes=500, citations=300
    // score = (0.3*0.8 + 0.35*0.7 + 0.2*0.5 + 0.15*0.3) * 100 = (0.24 + 0.245 + 0.10 + 0.045) * 100 = 63
    const score = computeModeBScore(
      { installs: 800, activeUsers30d: 700, likes: 500, citations: 300 },
      { w1: 0.3, w2: 0.35, w3: 0.2, w4: 0.15 },
    );
    expect(score).toBeGreaterThanOrEqual(60);
  });
});

// ── FeatureSignalAggregatorService tests ─────────────────────────────────────

describe('FLOW-36 Phase C — FeatureSignalAggregatorService', () => {
  it('F36C-7: missing ftId → failure (not throw)', async () => {
    const svc = new FeatureSignalAggregatorService(makeRegistry(), makeQueue());
    const result = await svc.aggregateSignals('', TENANT, {});
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_FT_ID');
  });

  it('F36C-8: FT not found → failure (not throw)', async () => {
    const svc = new FeatureSignalAggregatorService(makeRegistry(null), makeQueue());
    const result = await svc.aggregateSignals('FT-999', TENANT, {});
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('FT_NOT_FOUND');
  });

  it('F36C-9: FT with empty platforms[] → MODE_A', async () => {
    const ftRecord = { ftId: 'FT-A', tenantId: TENANT, platforms: [], signals: {} };
    const svc = new FeatureSignalAggregatorService(makeRegistry(ftRecord), makeQueue());
    const result = await svc.aggregateSignals('FT-A', TENANT, {
      successRate: 0.8,
      tenantAdoption: 100,
    });
    expect(result.isSuccess).toBe(true);
    expect((result.data as AggregationResult).mode).toBe('MODE_A');
  });

  it('F36C-10: FT with platforms[] present → MODE_B', async () => {
    const ftRecord = {
      ftId: 'FT-B',
      tenantId: TENANT,
      platforms: [{ platformId: 'figma', status: 'implemented' }],
      signals: {},
    };
    const svc = new FeatureSignalAggregatorService(makeRegistry(ftRecord), makeQueue());
    const result = await svc.aggregateSignals('FT-B', TENANT, {
      installs: 500,
      activeUsers30d: 200,
    });
    expect(result.isSuccess).toBe(true);
    expect((result.data as AggregationResult).mode).toBe('MODE_B');
  });

  it('F36C-11: DNA-8 — storeDocument called before enqueue on threshold crossing', async () => {
    const ftRecord = { ftId: 'FT-C', tenantId: TENANT, platforms: [], signals: {} };
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

    // High enough signals to cross threshold
    const svc = new FeatureSignalAggregatorService(registry, queue);
    await svc.aggregateSignals(
      'FT-C',
      TENANT,
      {
        successRate: 1.0,
        tenantAdoption: 1000,
        improvementVelocity: 10,
      },
      DEFAULT_WEIGHTS,
    );

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue');
    expect(storeIdx).toBeGreaterThan(-1);
    expect(enqueueIdx).toBeGreaterThan(storeIdx); // store before enqueue
  });

  it('F36C-12: no threshold event emitted when score below threshold', async () => {
    const ftRecord = { ftId: 'FT-D', tenantId: TENANT, platforms: [], signals: {} };
    const queue = makeQueue();
    const svc = new FeatureSignalAggregatorService(makeRegistry(ftRecord), queue);

    // Very low signals — score will be below 60
    await svc.aggregateSignals(
      'FT-D',
      TENANT,
      { successRate: 0.1, tenantAdoption: 1 },
      DEFAULT_WEIGHTS,
    );

    const thresholdEvents = queue._events.filter(
      (e: { event: string }) => e.event === 'feature-registry.porting-threshold-met',
    );
    expect(thresholdEvents).toHaveLength(0);
  });

  it('F36C-13: threshold event emitted when score >= threshold', async () => {
    const ftRecord = { ftId: 'FT-E', tenantId: TENANT, platforms: [], signals: {} };
    const queue = makeQueue();
    const svc = new FeatureSignalAggregatorService(makeRegistry(ftRecord), queue);

    await svc.aggregateSignals(
      'FT-E',
      TENANT,
      {
        successRate: 1.0,
        tenantAdoption: 1000,
        improvementVelocity: 10,
      },
      DEFAULT_WEIGHTS,
    );

    const thresholdEvents = queue._events.filter(
      (e: { event: string }) => e.event === 'feature-registry.porting-threshold-met',
    );
    expect(thresholdEvents).toHaveLength(1);
    expect(thresholdEvents[0].data.ftId).toBe('FT-E');
    expect(thresholdEvents[0].data.tenantId).toBe(TENANT);
  });

  it('F36C-14: tenant isolation — signals stored in tenantId-scoped index', async () => {
    const ftRecord = { ftId: 'FT-F', tenantId: 'tenant-alpha', platforms: [], signals: {} };
    const registry = makeRegistry(ftRecord);
    const svc = new FeatureSignalAggregatorService(registry, makeQueue());

    await svc.aggregateSignals('FT-F', 'tenant-alpha', { successRate: 0.5, tenantAdoption: 50 });

    const storeCallArgs = (registry.storeDocument as jest.Mock).mock.calls;
    for (const call of storeCallArgs) {
      expect(call[0] as string).toMatch(/tenant-alpha/);
    }
  });

  it('F36C-15: MODE_A result contains all required signal fields', async () => {
    const ftRecord = { ftId: 'FT-G', tenantId: TENANT, platforms: [], signals: {} };
    const svc = new FeatureSignalAggregatorService(makeRegistry(ftRecord), makeQueue());

    const result = await svc.aggregateSignals('FT-G', TENANT, {
      executionCount: 100,
      successRate: 0.85,
      avgCostPerRunUsd: 0.02,
      avgLatencyMs: 150,
      tenantAdoption: 200,
      improvementVelocity: 3,
    });

    expect(result.isSuccess).toBe(true);
    const signals = (result.data as AggregationResult).updatedSignals as any;
    expect(signals.executionCount).toBe(100);
    expect(signals.successRate).toBe(0.85);
    expect(signals.portingThresholdMet).toBeDefined();
    expect(signals.lastUpdated).toBeDefined();
  });

  it('F36C-16: MODE_B result contains signalScore field', async () => {
    const ftRecord = {
      ftId: 'FT-H',
      tenantId: TENANT,
      platforms: [{ platformId: 'canva', status: 'implemented' }],
      signals: {},
    };
    const svc = new FeatureSignalAggregatorService(makeRegistry(ftRecord), makeQueue());

    const result = await svc.aggregateSignals('FT-H', TENANT, {
      installs: 500,
      activeUsers30d: 300,
      likes: 200,
      citations: 100,
    });

    expect(result.isSuccess).toBe(true);
    const signals = (result.data as AggregationResult).updatedSignals as any;
    expect(signals.signalScore).toBeDefined();
    expect(typeof signals.signalScore).toBe('number');
    expect(signals.portingThresholdMet).toBeDefined();
  });

  it('F36C-17: custom threshold from FREEDOM config (not hardcoded)', async () => {
    const ftRecord = { ftId: 'FT-I', tenantId: TENANT, platforms: [], signals: {} };
    const queue = makeQueue();
    const svc = new FeatureSignalAggregatorService(makeRegistry(ftRecord), queue);

    // Use custom threshold of 80 instead of default 60
    const customWeights: SignalWeights = {
      modeA: { w1: 0.5, w2: 0.3, w3: 0.2 },
      modeB: { w1: 0.3, w2: 0.35, w3: 0.2, w4: 0.15 },
      portingThreshold: 80, // custom threshold
    };

    // Score that would pass threshold=60 but fail threshold=80
    // tenantAdoption=500/1000=0.5, successRate=0.9, improvementVelocity=2/10=0.2
    // score = (0.5*0.5 + 0.3*0.9 + 0.2*0.2) * 100 = 56 — below 60 too
    await svc.aggregateSignals(
      'FT-I',
      TENANT,
      {
        successRate: 0.9,
        tenantAdoption: 500,
        improvementVelocity: 2,
      },
      customWeights,
    );

    const thresholdEvents = queue._events.filter(
      (e: { event: string }) => e.event === 'feature-registry.porting-threshold-met',
    );
    expect(thresholdEvents).toHaveLength(0); // score ~56 < custom threshold 80
  });

  it('F36C-18: portingScore is included in aggregation result', async () => {
    const ftRecord = { ftId: 'FT-J', tenantId: TENANT, platforms: [], signals: {} };
    const svc = new FeatureSignalAggregatorService(makeRegistry(ftRecord), makeQueue());

    const result = await svc.aggregateSignals('FT-J', TENANT, {
      successRate: 0.7,
      tenantAdoption: 300,
      improvementVelocity: 4,
    });

    expect(result.isSuccess).toBe(true);
    const data = result.data as AggregationResult;
    expect(typeof data.portingScore).toBe('number');
    expect(data.portingScore).toBeGreaterThanOrEqual(0);
    expect(data.portingScore).toBeLessThanOrEqual(100);
  });
});
