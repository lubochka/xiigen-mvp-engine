/**
 * feedback.handler.spec.ts — Unit tests for determineDpoQuality (V9-002 gate)
 * and G5 GraphRAG fire-and-forget sync behaviour.
 *
 * 6 determineDpoQuality cases + 2 G5 tests.
 */
import 'reflect-metadata';
import { determineDpoQuality, FeedbackHandler } from './feedback.handler';
import { DataProcessResult } from '../../kernel/data-process-result';
import { IDatabaseService } from '../../fabrics/interfaces/database.interface';
import { IFreedomConfigService } from '../../freedom/freedom-config.interface';
import { GraphRagSyncService } from '../graph-rag-sync.service';

/** Build a minimal triple shape that passes the INVALID check (has chosen.code, rejected.code, prompt.system). */
function buildValidShape(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    chosen: { code: 'class Foo extends MicroserviceBase {}' },
    rejected: { code: 'class Foo {}' },
    prompt: { system: 'You are an expert NestJS developer.' },
    chosenModel: 'gpt-4o',
    rejectedModel: 'claude-3-opus',
    shuffleWasApplied: true,
    curriculumTier: 3,
    ...overrides,
  };
}

describe('determineDpoQuality', () => {
  it('returns CROSS_MODEL_VALID when different models, shuffle=true, tier=3', () => {
    const result = determineDpoQuality(buildValidShape() as never);
    expect(result.quality).toBe('CROSS_MODEL_VALID');
    expect(result.countsTowardThreshold).toBe(true);
  });

  it('returns MONO_MODEL_CALIBRATION when chosenModel === rejectedModel', () => {
    const result = determineDpoQuality(
      buildValidShape({ chosenModel: 'gpt-4o', rejectedModel: 'gpt-4o' }) as never,
    );
    expect(result.quality).toBe('MONO_MODEL_CALIBRATION');
    expect(result.countsTowardThreshold).toBe(false);
  });

  it('returns MONO_MODEL_CALIBRATION when shuffleWasApplied=false', () => {
    const result = determineDpoQuality(buildValidShape({ shuffleWasApplied: false }) as never);
    expect(result.quality).toBe('MONO_MODEL_CALIBRATION');
    expect(result.countsTowardThreshold).toBe(false);
  });

  it('returns MONO_MODEL_CALIBRATION when curriculumTier is null/missing', () => {
    const result = determineDpoQuality(buildValidShape({ curriculumTier: null }) as never);
    expect(result.quality).toBe('MONO_MODEL_CALIBRATION');
    expect(result.countsTowardThreshold).toBe(false);
  });

  it('returns INVALID when chosen.code is missing', () => {
    const result = determineDpoQuality(buildValidShape({ chosen: { code: '' } }) as never);
    expect(result.quality).toBe('INVALID');
    expect(result.countsTowardThreshold).toBe(false);
  });

  it('returns INVALID when prompt.system is null', () => {
    const result = determineDpoQuality(
      buildValidShape({ prompt: { system: null, user: 'generate' } }) as never,
    );
    expect(result.quality).toBe('INVALID');
    expect(result.countsTowardThreshold).toBe(false);
  });
});

// ── G5: GraphRAG fire-and-forget sync ──────────────────────────────────────

function makeMockDb(): IDatabaseService {
  return {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  } as unknown as IDatabaseService;
}

function makeMockFreedomConfig(syncMode: string): IFreedomConfigService {
  return {
    get: jest.fn().mockImplementation(async (key: string) => {
      if (key === 'xiigen.graphrag.syncMode') {
        return { value: syncMode };
      }
      return null;
    }),
    set: jest.fn(),
  } as unknown as IFreedomConfigService;
}

function makeMinimalCtx() {
  return {
    contract: { ironRules: [], archetype: 'service' },
    taskTypeId: 'T-001',
    runId: 'run-1',
    flowId: 'flow-1',
    tenantId: 'tenant-acme',
    priorOutputs: [
      {
        nodeType: 'ai-generate',
        data: {
          generatedCode: 'class Foo extends MicroserviceBase {}',
          modelComparison: {
            chosen: { model: 'gpt-4o', score: 0.91 },
            rejected: { model: 'claude-3-opus', score: 0.75 },
            shuffleWasApplied: true,
          },
          tripleStatus: 'ACCEPTED',
        },
      },
      {
        nodeType: 'score',
        data: { score: 0.91 },
      },
    ],
    nodeConfig: {},
    resolvedProviders: {},
  };
}

describe('FeedbackHandler G5 — GraphRAG sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('syncMode=disabled: GraphRagSyncService.syncTriple is never called', async () => {
    const db = makeMockDb();
    const freedomConfig = makeMockFreedomConfig('disabled');
    const graphRagSync = {
      syncTriple: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    } as unknown as GraphRagSyncService;

    const handler = new FeedbackHandler(
      db,
      undefined, // feedbackStore
      undefined, // promptEvolver
      undefined, // ai
      undefined, // ragTracker
      undefined, // requiredProviderValidator
      freedomConfig,
      graphRagSync,
    );

    const result = await handler.handle(makeMinimalCtx() as never);

    expect(result.isSuccess).toBe(true);
    expect(graphRagSync.syncTriple).not.toHaveBeenCalled();
  });

  it('syncMode=per-triple: handler returns before graphrag sync completes (fire-and-forget)', async () => {
    const db = makeMockDb();
    const freedomConfig = makeMockFreedomConfig('per-triple');

    // syncTriple resolves after a delay to confirm fire-and-forget
    let syncResolved = false;
    const graphRagSync = {
      syncTriple: jest.fn().mockImplementation(async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
        syncResolved = true;
        return DataProcessResult.success({ syncedCount: 1, failedCount: 0, skippedCount: 0 });
      }),
    } as unknown as GraphRagSyncService;

    const handler = new FeedbackHandler(
      db,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      freedomConfig,
      graphRagSync,
    );

    const result = await handler.handle(makeMinimalCtx() as never);

    // handler returns success immediately (before sync resolves)
    expect(result.isSuccess).toBe(true);
    // syncTriple was invoked (fire-and-forget kick-off happened)
    expect(graphRagSync.syncTriple).toHaveBeenCalledWith(expect.any(String), 'tenant-acme');
    // But the async work hasn't finished yet (fire-and-forget)
    expect(syncResolved).toBe(false);
  });
});
