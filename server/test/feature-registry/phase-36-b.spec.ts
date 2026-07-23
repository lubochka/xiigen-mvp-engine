/**
 * FLOW-36 Phase B — Feature Extraction Pipeline Tests.
 *
 * 18 tests covering:
 *   - portingCandidate classification (engine-internal vs portable)
 *   - Amendment 2: both productScopes handled correctly
 *   - FLOW-33 engine-internal task types classified false (T539/T540/T541)
 *   - FLOW-33 portable task types classified true (T537/T542)
 *   - DNA-8: storeDocument before enqueue on extraction complete
 *   - Deduplication: existing FT records not re-stored
 *   - Empty source → failure (not throw)
 *   - AI extraction failure propagated correctly
 *   - Tenant isolation: feature stored in tenantId-scoped index
 */

import {
  FeatureExtractorService,
  classifyPortingCandidate,
  type ExtractionResult,
} from '../../src/engine/flows/feature-registry/feature-extractor.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factories ───────────────────────────────────────────────────────────

function makeRegistry(existingFtIds: string[] = []) {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      stored.push({ index, doc, id });
      return DataProcessResult.success({ ...doc });
    }),
    searchDocuments: jest.fn(async (_index: string, filter: Record<string, unknown>) => {
      if (filter.ftId && existingFtIds.includes(filter.ftId as string)) {
        return DataProcessResult.success([{ ftId: filter.ftId }]);
      }
      return DataProcessResult.success([]);
    }),
    _stored: stored,
  } as any;
}

function makeAiExtractor(
  features: Array<Record<string, unknown>> = [],
  extractionPrecision: number = 0.9,
  fail = false,
) {
  return {
    extract: jest.fn(async () => {
      if (fail) return DataProcessResult.failure('AI_ERROR', 'AI extraction failed');
      return DataProcessResult.success({ features, extractionPrecision });
    }),
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

const TENANT = 'tenant-flow36-b';

// ── portingCandidate classification tests ────────────────────────────────────

describe('FLOW-36 Phase B — portingCandidate Classification', () => {
  it('F36B-1: marketplace-plugin scope is always portingCandidate=true (Amendment 2)', () => {
    const result = classifyPortingCandidate(
      'DesignToCode',
      'Converts design to code',
      'marketplace-plugin',
    );
    expect(result.portingCandidate).toBe(true);
    expect(result.portingCandidateReason).toBeUndefined();
  });

  it('F36B-2: xiigen-capability arbiter → portingCandidate=false (FLOW-33 T539 pattern)', () => {
    const result = classifyPortingCandidate(
      'ImplementFamilyMetaLoop',
      'Implements the family meta loop for consensus gate arbitration',
      'xiigen-capability',
    );
    expect(result.portingCandidate).toBe(false);
    expect(result.portingCandidateReason).toMatch(/Engine-internal|architectural boundary/i);
  });

  it('F36B-3: xiigen-capability five-arbiter consensus gate → portingCandidate=false (T540)', () => {
    const result = classifyPortingCandidate(
      'FiveArbiterConsensusGate',
      'Five arbiter consensus gate for generation loop quality control',
      'xiigen-capability',
    );
    expect(result.portingCandidate).toBe(false);
  });

  it('F36B-4: xiigen-capability regression analysis → portingCandidate=false (T541)', () => {
    const result = classifyPortingCandidate(
      'RegressionImpactAnalyzer',
      'Analyzes regression impact across training traces',
      'xiigen-capability',
    );
    expect(result.portingCandidate).toBe(false);
  });

  it('F36B-5: xiigen-capability bootstrap orchestrator → portingCandidate=false (T536)', () => {
    const result = classifyPortingCandidate(
      'BootstrapOrchestrator',
      'Bootstrap orchestration for self-building engine initialization',
      'xiigen-capability',
    );
    expect(result.portingCandidate).toBe(false);
  });

  it('F36B-6: xiigen-capability GraphRAG seeding → portingCandidate=true (T537 — portable)', () => {
    const result = classifyPortingCandidate(
      'GraphRAGSeeder',
      'Seeds knowledge graph from design patterns and documentation',
      'xiigen-capability',
    );
    expect(result.portingCandidate).toBe(true);
  });

  it('F36B-7: xiigen-capability ContextPack assembly → portingCandidate=true (T542 — portable)', () => {
    const result = classifyPortingCandidate(
      'ContextPackAssembler',
      'Assembles context packs from design documents and API specs',
      'xiigen-capability',
    );
    expect(result.portingCandidate).toBe(true);
  });

  it('F36B-8: xiigen-capability SSOAndEmailAuth → portingCandidate=true (T47 — portable)', () => {
    const result = classifyPortingCandidate(
      'SSOAndEmailAuth',
      'Handles user authentication via SSO and email verification',
      'xiigen-capability',
    );
    expect(result.portingCandidate).toBe(true);
  });
});

// ── FeatureExtractorService tests ─────────────────────────────────────────────

describe('FLOW-36 Phase B — FeatureExtractorService', () => {
  it('F36B-9: empty sourceReference returns failure (not throw)', async () => {
    const svc = new FeatureExtractorService(makeRegistry(), makeAiExtractor(), makeQueue());
    const result = await svc.extractFeatures('', TENANT);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_SOURCE');
  });

  it('F36B-10: missing tenantId returns failure', async () => {
    const svc = new FeatureExtractorService(makeRegistry(), makeAiExtractor(), makeQueue());
    const result = await svc.extractFeatures('zip://source.zip', '');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });

  it('F36B-11: AI extractor failure propagated as DataProcessResult.failure', async () => {
    const svc = new FeatureExtractorService(
      makeRegistry(),
      makeAiExtractor([], 0, true),
      makeQueue(),
    );
    const result = await svc.extractFeatures('zip://source.zip', TENANT);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('AI_ERROR');
  });

  it('F36B-12: AI returns 0 features → failure (not empty success)', async () => {
    const svc = new FeatureExtractorService(makeRegistry(), makeAiExtractor([]), makeQueue());
    const result = await svc.extractFeatures('zip://source.zip', TENANT);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_FEATURES_EXTRACTED');
  });

  it('F36B-13: successful extraction — result has features + extractionId', async () => {
    const rawFeatures = [
      {
        ftId: 'FT-200',
        name: 'SSOAndEmailAuth',
        description: 'Handles authentication',
        productScope: 'xiigen-capability',
        canonicalImplementation: {
          flowId: 'FLOW-01',
          taskTypeId: 'T47',
          serviceClass: 'SSOAndEmailAuth',
          status: 'confirmed',
        },
        platforms: [],
        signals: {},
        portingConstraints: [],
        platformIncompatibilities: [],
      },
    ];
    const registry = makeRegistry();
    const queue = makeQueue();
    const svc = new FeatureExtractorService(registry, makeAiExtractor(rawFeatures), queue);

    const result = await svc.extractFeatures('zip://source.zip', TENANT);
    expect(result.isSuccess).toBe(true);

    const data = result.data as ExtractionResult;
    expect(data.extractionId).toMatch(/extraction::/);
    expect(data.ftCount).toBe(1);
    expect(data.features[0].portingCandidate).toBe(true); // SSOAndEmailAuth is portable
  });

  it('F36B-14: DNA-8 — storeDocument called before enqueue', async () => {
    const rawFeatures = [
      {
        ftId: 'FT-201',
        name: 'DesignToCode',
        description: 'Converts design to code',
        productScope: 'marketplace-plugin',
        canonicalImplementation: {
          flowId: 'FLOW-31',
          taskTypeId: 'T-design',
          serviceClass: 'DesignToCode',
          status: 'confirmed',
        },
        platforms: [],
        signals: {},
        portingConstraints: [],
        platformIncompatibilities: [],
      },
    ];

    const callOrder: string[] = [];
    const registry = {
      storeDocument: jest.fn(async () => {
        callOrder.push('storeDocument');
        return DataProcessResult.success({});
      }),
      searchDocuments: jest.fn(async () => DataProcessResult.success([])),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('msg-id');
      }),
    } as any;

    const svc = new FeatureExtractorService(registry, makeAiExtractor(rawFeatures), queue);
    const result = await svc.extractFeatures('figma://file123', TENANT);

    expect(result.isSuccess).toBe(true);
    // storeDocument must appear before enqueue in call order
    const lastStore = callOrder.lastIndexOf('storeDocument');
    const firstEnqueue = callOrder.indexOf('enqueue');
    expect(lastStore).toBeGreaterThan(-1);
    expect(firstEnqueue).toBeGreaterThan(lastStore);
  });

  it('F36B-15: tenant isolation — FT records stored in tenantId-scoped index', async () => {
    const rawFeatures = [
      {
        ftId: 'FT-202',
        name: 'OnboardingDelivery',
        description: 'Orchestrates onboarding',
        productScope: 'xiigen-capability',
        canonicalImplementation: {
          flowId: 'FLOW-01',
          taskTypeId: 'T49',
          serviceClass: 'OnboardingDelivery',
          status: 'confirmed',
        },
        platforms: [],
        signals: {},
        portingConstraints: [],
        platformIncompatibilities: [],
      },
    ];

    const registry = makeRegistry();
    const svc = new FeatureExtractorService(registry, makeAiExtractor(rawFeatures), makeQueue());
    await svc.extractFeatures('zip://source.zip', 'tenant-alpha');

    // All storeDocument calls should use tenant-scoped indices
    const storeCallArgs = (registry.storeDocument as jest.Mock).mock.calls;
    for (const call of storeCallArgs) {
      const index: string = call[0];
      expect(index).toMatch(/tenant-alpha/);
    }
  });

  it('F36B-16: deduplication — existing FT not re-stored', async () => {
    const rawFeatures = [
      {
        ftId: 'FT-EXISTING',
        name: 'ExistingFeature',
        description: 'Already in registry',
        productScope: 'marketplace-plugin',
        canonicalImplementation: {
          flowId: 'FLOW-01',
          taskTypeId: 'T47',
          serviceClass: 'X',
          status: 'confirmed' as const,
        },
        platforms: [],
        signals: {},
        portingConstraints: [],
        platformIncompatibilities: [],
      },
      {
        ftId: 'FT-NEW',
        name: 'NewFeature',
        description: 'Not yet in registry',
        productScope: 'marketplace-plugin',
        canonicalImplementation: {
          flowId: 'FLOW-02',
          taskTypeId: 'T50',
          serviceClass: 'Y',
          status: 'confirmed' as const,
        },
        platforms: [],
        signals: {},
        portingConstraints: [],
        platformIncompatibilities: [],
      },
    ];

    const registry = makeRegistry(['FT-EXISTING']); // FT-EXISTING already exists
    const svc = new FeatureExtractorService(registry, makeAiExtractor(rawFeatures), makeQueue());

    const result = await svc.extractFeatures('zip://source.zip', TENANT);
    expect(result.isSuccess).toBe(true);
    expect((result.data as ExtractionResult).ftCount).toBe(2); // Both features in result

    // Only FT-NEW should be stored (FT-EXISTING skipped) + 1 audit record
    const storeCallArgs = (registry.storeDocument as jest.Mock).mock.calls;
    const featureStores = storeCallArgs.filter((c) =>
      (c[0] as string).startsWith('feature-registry-'),
    );
    // FT-EXISTING deduped out — only FT-NEW stored
    expect(featureStores.some((c) => c[2] === 'FT-NEW')).toBe(true);
    expect(featureStores.some((c) => c[2] === 'FT-EXISTING')).toBe(false);
  });

  it('F36B-17: engine-internal FT (portingCandidate=false) — platforms[] always empty', async () => {
    const rawFeatures = [
      {
        ftId: 'FT-INTERNAL',
        name: 'ImplementFamilyMetaLoop',
        description: 'Family meta loop for arbiter consensus',
        productScope: 'xiigen-capability',
        canonicalImplementation: {
          flowId: 'FLOW-33',
          taskTypeId: 'T539',
          serviceClass: 'ImplementFamilyMetaLoop',
          status: 'confirmed' as const,
        },
        platforms: [{ platformId: 'figma' }], // AI may try to add a platform — must be stripped
        signals: {},
        portingConstraints: ['requires XIIGen internal state'],
        platformIncompatibilities: [],
      },
    ];

    const svc = new FeatureExtractorService(
      makeRegistry(),
      makeAiExtractor(rawFeatures),
      makeQueue(),
    );
    const result = await svc.extractFeatures('zip://flow33.zip', TENANT);

    expect(result.isSuccess).toBe(true);
    const feature = (result.data as ExtractionResult).features[0];
    expect(feature.portingCandidate).toBe(false);
    expect(feature.platforms).toHaveLength(0); // platforms stripped when portingCandidate=false
    expect(feature.portingCandidateReason).toBeDefined();
  });

  it('F36B-18: FeatureExtractionCompleted event contains extractionId + tenantId + ftCount', async () => {
    const rawFeatures = [
      {
        ftId: 'FT-300',
        name: 'UserRegistration',
        description: 'User registration and onboarding',
        productScope: 'xiigen-capability',
        canonicalImplementation: {
          flowId: 'FLOW-01',
          taskTypeId: 'T47',
          serviceClass: 'SSOAndEmailAuth',
          status: 'confirmed' as const,
        },
        platforms: [],
        signals: {},
        portingConstraints: [],
        platformIncompatibilities: [],
      },
    ];

    const queue = makeQueue();
    const svc = new FeatureExtractorService(makeRegistry(), makeAiExtractor(rawFeatures), queue);
    const result = await svc.extractFeatures('zip://source.zip', TENANT);

    expect(result.isSuccess).toBe(true);
    const events = queue._events;
    const completionEvent = events.find((e) => e.event === 'feature-registry.extraction.completed');
    expect(completionEvent).toBeDefined();
    expect(completionEvent!.data.tenantId).toBe(TENANT);
    expect(completionEvent!.data.ftCount).toBe(1);
    expect(completionEvent!.data.extractionId).toBeDefined();
  });
});
