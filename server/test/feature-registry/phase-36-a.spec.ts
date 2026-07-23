/**
 * FLOW-36 Phase A — Foundation + FT Seeding + Schema Verification Tests.
 *
 * 18 tests in 4 groups:
 *   FA-1..FA-5:  Contract validation — all 7 FLOW-36 EngineContracts validate
 *   FA-6..FA-9:  PROHIBITED guard path — portingCandidate=false blocks cost estimation
 *   FA-10..FA-13: Multi-tenant isolation — feature-registry index is tenantId-scoped
 *   FA-14..FA-18: Manifest back-fill — schema v2.0 + portingCandidate fields correct
 *
 * Phase A checklist completion:
 *   CF-808: PROHIBITED guard fires FIRST (verified FA-7)
 *   CF-809: PortingCostEstimator never called for portingCandidate=false (FA-7)
 *   CF-810: PortingProhibited event emitted, not DEFER/BLOCK (FA-8)
 *   schema v2.0: both manifests verified (FA-14, FA-16)
 *   back-fill: figma-plugin + xiigen-capabilities portingCandidate values (FA-17, FA-18)
 */

import { FEATURE_REGISTRY_CONTRACTS } from '../../src/engine-contracts/feature-registry-contracts';
import { PortingDecisionGateService } from '../../src/engine/flows/feature-registry/porting-decision-gate.service';
import {
  FeatureExtractorService,
  classifyPortingCandidate,
} from '../../src/engine/flows/feature-registry/feature-extractor.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Manifests (back-fill verification) ──────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const figmaManifest =
  require('../../../contracts/features/feature-manifest-figma-plugin-v1.json') as {
    schemaVersion: string;
    features: Array<{ ftId: string; productScope: string; portingCandidate?: boolean }>;
  };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const xiigenManifest =
  require('../../../contracts/features/feature-manifest-xiigen-capabilities-v1.json') as {
    schemaVersion: string;
    features: Array<{ ftId: string; portingCandidate: boolean; portingCandidateReason?: string }>;
  };

// ── Mock factories ───────────────────────────────────────────────────────────

function makeRegistry(ftRecord: Record<string, unknown> | null = null) {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      stored.push({ index, doc, id });
      return DataProcessResult.success({ ...doc });
    }),
    searchDocuments: jest.fn(async (_index: string, filter: Record<string, unknown>) => {
      if (!ftRecord || ftRecord['ftId'] !== filter['ftId']) {
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

function makeCostEstimator() {
  return {
    estimate: jest.fn(async () =>
      DataProcessResult.success({
        costEstimateUsd: 500,
        effortDays: 3,
        complexityScore: 30,
        constraintsSummary: [],
        estimatedAt: new Date().toISOString(),
      }),
    ),
  } as any;
}

function makeAiExtractor(features: Array<Record<string, unknown>> = []) {
  return {
    extract: jest.fn(async () =>
      DataProcessResult.success({
        features,
        extractionPrecision: 0.9,
        portingCandidateAccuracy: 0.95,
      }),
    ),
  } as any;
}

const TENANT_A = 'tenant-flow36-a-alpha';
const TENANT_B = 'tenant-flow36-a-beta';
const CORR_ID = 'test-phase-a-001';

// ── GROUP 1: Contract Validation (FA-1..FA-5) ────────────────────────────────

describe('FLOW-36 Phase A — Contract Validation', () => {
  it('FA-1: T567 FeatureExtractor contract validates', () => {
    const c = FEATURE_REGISTRY_CONTRACTS.find((c) => c.taskTypeId === 'T567');
    expect(c).toBeDefined();
    const result = c!.validate();
    expect(result.isSuccess).toBe(true);
  });

  it('FA-2: T568 FeatureSignalAggregator + T569 PortingCostEstimator contracts validate', () => {
    const t568 = FEATURE_REGISTRY_CONTRACTS.find((c) => c.taskTypeId === 'T568');
    const t569 = FEATURE_REGISTRY_CONTRACTS.find((c) => c.taskTypeId === 'T569');
    expect(t568).toBeDefined();
    expect(t569).toBeDefined();
    expect(t568!.validate().isSuccess).toBe(true);
    expect(t569!.validate().isSuccess).toBe(true);
  });

  it('FA-3: T570 PortingDecisionGate contract validates', () => {
    const c = FEATURE_REGISTRY_CONTRACTS.find((c) => c.taskTypeId === 'T570');
    expect(c).toBeDefined();
    expect(c!.validate().isSuccess).toBe(true);
  });

  it('FA-4: T571 PlatformAdapterGenerator + T572 PlatformSimulator contracts validate', () => {
    const t571 = FEATURE_REGISTRY_CONTRACTS.find((c) => c.taskTypeId === 'T571');
    const t572 = FEATURE_REGISTRY_CONTRACTS.find((c) => c.taskTypeId === 'T572');
    expect(t571).toBeDefined();
    expect(t572).toBeDefined();
    expect(t571!.validate().isSuccess).toBe(true);
    expect(t572!.validate().isSuccess).toBe(true);
  });

  it('FA-5: T573 FeaturePortingOrchestrator contract validates — total 7 contracts', () => {
    const t573 = FEATURE_REGISTRY_CONTRACTS.find((c) => c.taskTypeId === 'T573');
    expect(t573).toBeDefined();
    expect(t573!.validate().isSuccess).toBe(true);
    // All 7 contracts present
    expect(FEATURE_REGISTRY_CONTRACTS).toHaveLength(7);
    // All validate cleanly
    const failures = FEATURE_REGISTRY_CONTRACTS.filter((c) => !c.validate().isSuccess);
    expect(failures).toHaveLength(0);
  });
});

// ── GROUP 2: PROHIBITED Guard Path (FA-6..FA-9) ─────────────────────────────

describe('FLOW-36 Phase A — PROHIBITED Guard Path (CF-808, CF-809, CF-810)', () => {
  const engineInternalFt = {
    ftId: 'FT-INTERNAL-519',
    tenantId: TENANT_A,
    portingCandidate: false,
    portingCandidateReason:
      'Engine-internal FamilyMetaImplementationLoop — generation loop is XIIGen core.',
    platforms: [],
    signals: {},
    platformIncompatibilities: [],
  };

  it('FA-6: portingCandidate=false FT → decision outcome is PROHIBITED', async () => {
    const registry = makeRegistry(engineInternalFt);
    const costEstimator = makeCostEstimator();
    const queue = makeQueue();
    const svc = new PortingDecisionGateService(registry, costEstimator, queue);

    const result = await svc.evaluate('FT-INTERNAL-519', TENANT_A, 'canva', 80, CORR_ID);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.decision).toBe('PROHIBITED');
  });

  it('FA-7: portingCandidate=false → PortingCostEstimator NEVER called (CF-808, CF-809)', async () => {
    const registry = makeRegistry(engineInternalFt);
    const costEstimator = makeCostEstimator();
    const queue = makeQueue();
    const svc = new PortingDecisionGateService(registry, costEstimator, queue);

    await svc.evaluate('FT-INTERNAL-519', TENANT_A, 'canva', 80, CORR_ID);

    // Cost estimator must not be called at all — PROHIBITED guard fires first
    expect(costEstimator.estimate).not.toHaveBeenCalled();
  });

  it('FA-8: portingCandidate=false → PortingProhibited event emitted via queue (CF-810)', async () => {
    const registry = makeRegistry(engineInternalFt);
    const costEstimator = makeCostEstimator();
    const queue = makeQueue();
    const svc = new PortingDecisionGateService(registry, costEstimator, queue);

    await svc.evaluate('FT-INTERNAL-519', TENANT_A, 'canva', 80, CORR_ID);

    const prohibitedEvent = queue._events.find(
      (e: { event: string }) => e.event.includes('prohibited') || e.event.includes('PROHIBITED'),
    );
    expect(prohibitedEvent).toBeDefined();
    expect(prohibitedEvent?.data?.['ftId']).toBe('FT-INTERNAL-519');
  });

  it('FA-9: portingCandidate=true baseline — cost estimator IS called', async () => {
    const portableFt = {
      ftId: 'FT-001',
      tenantId: TENANT_A,
      portingCandidate: true,
      platforms: [{ platformId: 'figma', status: 'implemented', adapterMode: 'MODE-B' }],
      signals: { signalScore: 75, portingThresholdMet: true, installs: 1000 },
      platformIncompatibilities: [],
    };
    const registry = makeRegistry(portableFt);
    const costEstimator = makeCostEstimator();
    const queue = makeQueue();
    const svc = new PortingDecisionGateService(registry, costEstimator, queue);

    await svc.evaluate('FT-001', TENANT_A, 'canva', 80, CORR_ID);

    // For portingCandidate=true, the pipeline continues (cost estimator gets called)
    expect(costEstimator.estimate).toHaveBeenCalled();
  });
});

// ── GROUP 3: Multi-Tenant Isolation (FA-10..FA-13) ──────────────────────────

describe('FLOW-36 Phase A — Multi-Tenant Isolation', () => {
  it('FA-10: FeatureExtractorService stores to tenantId-scoped index', async () => {
    const registry = makeRegistry();
    const aiExtractor = makeAiExtractor([
      {
        name: 'SSOAndEmailAuth',
        description: 'Authentication service with OAuth support',
        productScope: 'marketplace-plugin',
        portingConstraints: [],
        platformIncompatibilities: [],
      },
    ]);
    const queue = makeQueue();
    const svc = new FeatureExtractorService(registry, aiExtractor, queue);

    await svc.extractFeatures('source-zip-ref', TENANT_A);

    // All storeDocument calls must use TENANT_A-scoped index
    const storeCallsToWrongTenant = registry._stored.filter((s: { index: string }) =>
      s.index.includes(TENANT_B),
    );
    expect(storeCallsToWrongTenant).toHaveLength(0);

    const storeCallsToCorrectTenant = registry._stored.filter((s: { index: string }) =>
      s.index.includes(TENANT_A),
    );
    expect(storeCallsToCorrectTenant.length).toBeGreaterThan(0);
  });

  it('FA-11: tenant A extraction index = feature-registry-{tenantId}', async () => {
    const registry = makeRegistry();
    const aiExtractor = makeAiExtractor([
      {
        name: 'DesignToCode',
        description: 'CSS extraction pipeline from design tools',
        productScope: 'marketplace-plugin',
        portingConstraints: [],
        platformIncompatibilities: [],
      },
    ]);
    const queue = makeQueue();
    const svc = new FeatureExtractorService(registry, aiExtractor, queue);

    await svc.extractFeatures('figma-ref-001', TENANT_A);

    // Feature stored to feature-registry-{tenantId}
    const featureStore = registry._stored.find(
      (s: { index: string }) => s.index === `feature-registry-${TENANT_A}`,
    );
    expect(featureStore).toBeDefined();
  });

  it('FA-12: tenant A FT not visible to tenant B via registry search', async () => {
    // Registry has FT-001 under TENANT_A
    const tenantAFt = { ftId: 'FT-001', tenantId: TENANT_A, portingCandidate: true };
    const registry = makeRegistry(tenantAFt);

    // Simulate tenant B searching for FT-001 (different tenantId prefix on index)
    // The mock returns results based on ftId match, but the real service uses tenantId-scoped index
    // We verify: PortingDecisionGate for TENANT_B cannot find TENANT_A's FT
    const costEstimator = makeCostEstimator();
    const queue = makeQueue();
    const svc = new PortingDecisionGateService(registry, costEstimator, queue);

    // searchDocuments is called with the tenantId-scoped index name
    // Our mock only matches on ftId, so we verify the index used
    await svc.evaluate('FT-001', TENANT_B, 'canva', 80, CORR_ID);

    // Verify searchDocuments was called — the real isolation is in the index name
    expect(registry.searchDocuments).toHaveBeenCalled();
    const callArgs = registry.searchDocuments.mock.calls[0];
    // Index must be scoped to TENANT_B, not TENANT_A
    expect(callArgs[0]).toContain(TENANT_B);
    expect(callArgs[0]).not.toContain(TENANT_A);
  });

  it('FA-13: classifyPortingCandidate — engine-internal detection is MACHINE (not tenant-tunable)', () => {
    // portingCandidate classification must be deterministic from name/description alone
    // Two calls with same input = same result (no tenant-specific override possible)
    const result1 = classifyPortingCandidate(
      'FamilyMetaImplementationLoop',
      'AI-driven bounded generation loop for the XIIGen engine bootstrap orchestration',
      'xiigen-capability',
    );
    const result2 = classifyPortingCandidate(
      'FamilyMetaImplementationLoop',
      'AI-driven bounded generation loop for the XIIGen engine bootstrap orchestration',
      'xiigen-capability',
    );
    // Must be false — engine-internal pattern
    expect(result1.portingCandidate).toBe(false);
    // Must be deterministic — no randomness, no tenant input
    expect(result1.portingCandidate).toBe(result2.portingCandidate);
    expect(result1.portingCandidateReason).toBe(result2.portingCandidateReason);
  });
});

// ── GROUP 4: Manifest Back-fill Verification (FA-14..FA-18) ─────────────────

describe('FLOW-36 Phase A — Manifest Back-fill Verification', () => {
  it('FA-14: feature-manifest-figma-plugin-v1.json schemaVersion = "2.0"', () => {
    expect(figmaManifest.schemaVersion).toBe('2.0');
  });

  it('FA-15: all FT-001..010 in figma manifest have productScope = "client-capability"', () => {
    expect(figmaManifest.features.length).toBeGreaterThanOrEqual(10);
    for (const ft of figmaManifest.features) {
      expect(ft.productScope).toBe('client-capability');
    }
  });

  it('FA-16: feature-manifest-xiigen-capabilities-v1.json schemaVersion = "2.0"', () => {
    expect(xiigenManifest.schemaVersion).toBe('2.0');
  });

  it('FA-17: engine-internal FT records have portingCandidate=false', () => {
    // FLOW-33 engine-internal task types (T536, T538, T539, T540, T541)
    const engineInternalFtIds = ['FT-100', 'FT-102', 'FT-103', 'FT-104', 'FT-105'];
    for (const ftId of engineInternalFtIds) {
      const ft = xiigenManifest.features.find((f) => f.ftId === ftId);
      expect(ft).toBeDefined();
      expect(ft!.portingCandidate).toBe(false);
      // Must have a reason when portingCandidate=false
      expect(typeof ft!.portingCandidateReason).toBe('string');
      expect(ft!.portingCandidateReason!.length).toBeGreaterThan(0);
    }
  });

  it('FA-18: portable FT records have portingCandidate=true; FLOW-35 internals are false', () => {
    // Portable: FT-101 (T537 GraphRAGTwoLayerSeeder), FT-106 (T542 ContextPackAssembler)
    const portableFtIds = ['FT-101', 'FT-106'];
    for (const ftId of portableFtIds) {
      const ft = xiigenManifest.features.find((f) => f.ftId === ftId);
      expect(ft).toBeDefined();
      expect(ft!.portingCandidate).toBe(true);
    }

    // FLOW-35 internals: FT-108 (RoundSummaryProcessor), FT-109 (MetaDecisionEngine)
    const flow35InternalFtIds = ['FT-108', 'FT-109'];
    for (const ftId of flow35InternalFtIds) {
      const ft = xiigenManifest.features.find((f) => f.ftId === ftId);
      expect(ft).toBeDefined();
      expect(ft!.portingCandidate).toBe(false);
      expect(typeof ft!.portingCandidateReason).toBe('string');
    }
  });
});
