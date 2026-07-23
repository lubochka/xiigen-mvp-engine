import 'reflect-metadata';
import { DataProcessResult } from '../../kernel/data-process-result';
import {
  OssCurriculumRunner,
  OssCurriculumRecord,
  OSS_CURRICULUM_INDEX,
  RAG_PATTERNS_INDEX,
} from './oss-curriculum-runner.service';

const mockDb = {
  storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
};
const mockCls = { get: jest.fn().mockReturnValue({ tenantId: 'test-tenant' }) };

const makeRunner = () => new OssCurriculumRunner(mockDb as any, mockCls as any);

beforeEach(() => jest.clearAllMocks());

describe('OssCurriculumRunner', () => {
  it('stores to xiigen-oss-curriculum-runs index', async () => {
    const runner = makeRunner();
    await runner.runForFlow({
      flowId: 'FLOW-01',
      userIntent: 'test',
      phase: 'PHASE-0',
      cyclesPerModel: 2,
    });
    const storeCalls = (mockDb.storeDocument as jest.Mock).mock.calls;
    const ossStores = storeCalls.filter((c) => c[0] === OSS_CURRICULUM_INDEX);
    expect(ossStores.length).toBeGreaterThan(0);
  });

  it('record schema: ossModel, station, depth, nodeIntent, cycle, grade all present', async () => {
    const runner = makeRunner();
    await runner.runForFlow({
      flowId: 'FLOW-01',
      userIntent: 'test',
      phase: 'PHASE-0',
      cyclesPerModel: 1,
    });
    const storeCalls = (mockDb.storeDocument as jest.Mock).mock.calls;
    const record = storeCalls.find((c) => c[0] === OSS_CURRICULUM_INDEX)?.[1] as Record<
      string,
      unknown
    >;
    expect(record?.['ossModel']).toBeDefined();
    expect(record?.['station']).toBeDefined();
    expect(typeof record?.['depth']).toBe('number');
    expect(record?.['nodeIntent']).toBeDefined();
    expect(typeof record?.['cycle']).toBe('number');
    expect(typeof record?.['grade']).toBe('number');
  });

  it('grade ≥ 0.85: seeds RAG (stores to xiigen-rag-patterns)', async () => {
    const runner = makeRunner();
    jest.spyOn(runner, 'runOssModelCycle').mockResolvedValue(0.88);
    await runner.runForFlow({
      flowId: 'FLOW-01',
      userIntent: 'test',
      phase: 'PHASE-0',
      cyclesPerModel: 1,
    });
    const ragStores = (mockDb.storeDocument as jest.Mock).mock.calls.filter(
      (c) => c[0] === RAG_PATTERNS_INDEX,
    );
    expect(ragStores.length).toBeGreaterThan(0);
  });

  it('grade < 0.85: does NOT seed RAG (prevents contamination)', async () => {
    const runner = makeRunner();
    jest.spyOn(runner, 'runOssModelCycle').mockResolvedValue(0.6);
    await runner.runForFlow({
      flowId: 'FLOW-01',
      userIntent: 'test',
      phase: 'PHASE-0',
      cyclesPerModel: 1,
    });
    const ragStores = (mockDb.storeDocument as jest.Mock).mock.calls.filter(
      (c) => c[0] === RAG_PATTERNS_INDEX,
    );
    expect(ragStores).toHaveLength(0);
  });

  it('computeSignal: UP when grades improve by > 0.05 first-to-last 3', () => {
    const runner = makeRunner();
    const records = [0.41, 0.51, 0.61, 0.65, 0.7].map(
      (grade, i): OssCurriculumRecord => ({
        ossModel: 'llama3:8b',
        station: 'CYCLE-1',
        depth: 0,
        nodeIntent: 'test',
        cycle: i + 1,
        grade,
        ragContextSize: 0,
        graphContextSize: 0,
        phase: 'PHASE-0',
        flowId: 'FLOW-01',
        tenantId: 'test',
        createdAt: '',
      }),
    );
    expect(runner.computeSignal(records)).toBe('UP');
  });

  it('computeSignal: DOWN when grades decline by > 0.05 (depth-overload pattern)', () => {
    const runner = makeRunner();
    const records = [0.61, 0.59, 0.58, 0.57, 0.55].map(
      (grade, i): OssCurriculumRecord => ({
        ossModel: 'llama3:8b',
        station: 'CYCLE-2',
        depth: 1,
        nodeIntent: 'test',
        cycle: i + 1,
        grade,
        ragContextSize: 0,
        graphContextSize: 0,
        phase: 'PHASE-0',
        flowId: 'FLOW-01',
        tenantId: 'test',
        createdAt: '',
      }),
    );
    expect(runner.computeSignal(records)).toBe('DOWN');
  });

  it('detectDepthOverload: true when depth-1 grade drops > 0.10 vs depth-0', () => {
    const runner = makeRunner();
    const d0: OssCurriculumRecord[] = [
      {
        ossModel: 'llama3:8b',
        station: 'CYCLE-2',
        depth: 0,
        nodeIntent: '',
        cycle: 1,
        grade: 0.74,
        ragContextSize: 0,
        graphContextSize: 0,
        phase: 'PHASE-0',
        flowId: 'F',
        tenantId: 't',
        createdAt: '',
      },
    ];
    const d1: OssCurriculumRecord[] = [{ ...d0[0]!, depth: 1, grade: 0.44 }];
    expect(runner.detectDepthOverload(d0, d1)).toBe(true);
  });

  it('DNA-3: NO_TENANT returns failure without throwing', async () => {
    const noCls = { get: jest.fn().mockReturnValue(null) };
    const runner = new OssCurriculumRunner(mockDb as any, noCls as any);
    const result = await runner.runForFlow({ flowId: 'F', userIntent: 't', phase: 'P' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_TENANT');
  });

  it('DNA-3: storeDocument failure per cycle does not halt runner', async () => {
    mockDb.storeDocument.mockResolvedValueOnce(DataProcessResult.failure('DB_FAIL', 'error'));
    const runner = makeRunner();
    const result = await runner.runForFlow({
      flowId: 'FLOW-01',
      userIntent: 'test',
      phase: 'PHASE-0',
      cyclesPerModel: 2,
    });
    expect(() => result).not.toThrow();
    expect(result.isSuccess).toBe(true);
  });

  // ── PHASE 1: FREEDOM CONFIG + AI PROVIDER ────────────────────────────────

  it('FREEDOM config: overrides cycle count from oss.config.cyclesPerModel', async () => {
    const mockFreedom = {
      get: jest.fn(async (key: string) => {
        if (key === 'oss.config') return { cyclesPerModel: 2, models: ['llama3:8b'] };
        return null;
      }),
    };
    const runner = new OssCurriculumRunner(
      mockDb as any,
      mockCls as any,
      undefined,
      mockFreedom as any,
    );
    await runner.runForFlow({ flowId: 'F', userIntent: 'test', phase: 'P' });
    const ossCalls = (mockDb.storeDocument as jest.Mock).mock.calls.filter(
      (c: unknown[]) => c[0] === OSS_CURRICULUM_INDEX,
    );
    // 1 model × 2 cycles = 2 records
    expect(ossCalls.length).toBe(2);
  });

  it('FREEDOM config: overrides models list from oss.config.models', async () => {
    const mockFreedom = {
      get: jest.fn(async (key: string) => {
        if (key === 'oss.config') return { cyclesPerModel: 1, models: ['llama3:8b'] };
        return null;
      }),
    };
    const runner = new OssCurriculumRunner(
      mockDb as any,
      mockCls as any,
      undefined,
      mockFreedom as any,
    );
    await runner.runForFlow({ flowId: 'F', userIntent: 'test', phase: 'P' });
    const records = (mockDb.storeDocument as jest.Mock).mock.calls
      .filter((c: unknown[]) => c[0] === OSS_CURRICULUM_INDEX)
      .map((c: unknown[]) => (c[1] as Record<string, unknown>)['ossModel']);
    expect(records.every((m: unknown) => m === 'llama3:8b')).toBe(true);
  });

  it('AI provider: called when available, grade extracted from JSON response', async () => {
    const mockAi = {
      generate: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          text: '{"output":"plan step","grade":0.82}',
          model: 'llama3:8b',
        }),
      ),
    };
    const runner = new OssCurriculumRunner(
      mockDb as any,
      mockCls as any,
      undefined,
      undefined,
      mockAi as any,
    );
    const grade = await runner.runOssModelCycle(
      'llama3:8b',
      {
        flowId: 'F',
        userIntent: 'test',
        phase: 'P',
      },
      1,
      'tenant-1',
    );
    expect(mockAi.generate).toHaveBeenCalledTimes(1);
    expect(grade).toBeCloseTo(0.82);
  });

  it('AI provider: falls back to simulation when provider absent', async () => {
    const runner = new OssCurriculumRunner(mockDb as any, mockCls as any);
    const grade = await runner.runOssModelCycle(
      'llama3:8b',
      {
        flowId: 'F',
        userIntent: 'test',
        phase: 'P',
      },
      1,
      'tenant-1',
    );
    // Simulation: 0.45 + 0 * 0.04 = 0.45
    expect(grade).toBeCloseTo(0.45);
  });

  it('AI provider: falls back to simulation when generate() fails', async () => {
    const mockAi = {
      generate: jest.fn().mockResolvedValue(DataProcessResult.failure('PROVIDER_ERROR', 'fail')),
    };
    const runner = new OssCurriculumRunner(
      mockDb as any,
      mockCls as any,
      undefined,
      undefined,
      mockAi as any,
    );
    const grade = await runner.runOssModelCycle(
      'llama3:8b',
      {
        flowId: 'F',
        userIntent: 'test',
        phase: 'P',
      },
      3,
      'tenant-1',
    );
    // Simulation cycle 3: 0.45 + 2 * 0.04 = 0.53
    expect(grade).toBeCloseTo(0.53);
  });

  // ── GAP-B tests: seedFromDpoTriples pre-seeds RAG before OSS cycles ──────

  it('GAP-B: pre-seeds RAG from DPO triples with chosen.score ≥ 8.5 before OSS cycles', async () => {
    const dbWithTriples = {
      ...mockDb,
      searchDocuments: jest.fn().mockImplementation(async (index: string) => {
        if (index === 'xiigen-training-data') {
          return DataProcessResult.success([
            {
              station: 'CYCLE-2',
              flowId: 'FLOW-01',
              depth: 0,
              nodeIntent: 'register user',
              knowledgeScope: 'PRIVATE',
              tenantId: 'test-tenant',
              chosen: { text: 'good output', model: 'mock-gemini', score: 9.0 },
            },
            {
              station: 'CYCLE-2',
              flowId: 'FLOW-01',
              depth: 0,
              nodeIntent: 'verify email',
              knowledgeScope: 'PRIVATE',
              tenantId: 'test-tenant',
              chosen: { text: 'excellent output', model: 'mock-openai', score: 8.7 },
            },
          ]);
        }
        return DataProcessResult.success([]);
      }),
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };

    const runner = new OssCurriculumRunner(
      dbWithTriples as any,
      mockCls as any,
      undefined,
      undefined,
      undefined,
    );
    jest.spyOn(runner, 'runOssModelCycle').mockResolvedValue(0.6);

    await runner.runForFlow({
      flowId: 'FLOW-01',
      userIntent: 'test',
      phase: 'P',
      cyclesPerModel: 1,
    });

    // RAG_PATTERNS_INDEX stores should include 2 DPO-seeded entries (one per winner)
    const ragStores = (dbWithTriples.storeDocument as jest.Mock).mock.calls.filter(
      (c: unknown[]) => c[0] === RAG_PATTERNS_INDEX,
    );
    const dpoSeeds = ragStores.filter((c: unknown[]) => {
      const doc = c[1] as Record<string, unknown>;
      return doc['source'] === 'dpo-commercial-winner';
    });
    expect(dpoSeeds.length).toBe(2);
  });

  it('GAP-B: does not pre-seed from DPO triples with chosen.score < 8.5', async () => {
    const dbWithLowScoreTriples = {
      ...mockDb,
      searchDocuments: jest.fn().mockImplementation(async (index: string) => {
        if (index === 'xiigen-training-data') {
          return DataProcessResult.success([
            {
              station: 'CYCLE-2',
              flowId: 'FLOW-01',
              depth: 0,
              knowledgeScope: 'PRIVATE',
              tenantId: 'test-tenant',
              chosen: { text: 'mediocre output', model: 'mock-gemini', score: 7.5 },
            },
          ]);
        }
        return DataProcessResult.success([]);
      }),
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };

    const runner = new OssCurriculumRunner(
      dbWithLowScoreTriples as any,
      mockCls as any,
      undefined,
      undefined,
      undefined,
    );
    jest.spyOn(runner, 'runOssModelCycle').mockResolvedValue(0.6);

    await runner.runForFlow({
      flowId: 'FLOW-01',
      userIntent: 'test',
      phase: 'P',
      cyclesPerModel: 1,
    });

    const ragStores = (dbWithLowScoreTriples.storeDocument as jest.Mock).mock.calls.filter(
      (c: unknown[]) => c[0] === RAG_PATTERNS_INDEX,
    );
    const dpoSeeds = ragStores.filter((c: unknown[]) => {
      const doc = c[1] as Record<string, unknown>;
      return doc['source'] === 'dpo-commercial-winner';
    });
    // Score 7.5 < 8.5 threshold — no DPO seeds
    expect(dpoSeeds.length).toBe(0);
  });

  // ── SCOPE isolation tests ────────────────────────────────────────────────

  it('SCOPE-1: seedFromDpoTriples only seeds from triples matching caller tenant (PRIVATE)', async () => {
    const dbWithMixedTenants = {
      ...mockDb,
      searchDocuments: jest.fn().mockImplementation(async (index: string) => {
        if (index === 'xiigen-training-data') {
          return DataProcessResult.success([
            // Caller's own record — should be seeded
            {
              station: 'CYCLE-2',
              flowId: 'FLOW-01',
              depth: 0,
              nodeIntent: 'own',
              knowledgeScope: 'PRIVATE',
              tenantId: 'test-tenant',
              chosen: { text: 'good output', model: 'mock-gemini', score: 9.0 },
            },
            // Other tenant's record — must be filtered out
            {
              station: 'CYCLE-2',
              flowId: 'FLOW-01',
              depth: 0,
              nodeIntent: 'other',
              knowledgeScope: 'PRIVATE',
              tenantId: 'other-tenant',
              chosen: { text: 'other output', model: 'mock-openai', score: 9.5 },
            },
          ]);
        }
        return DataProcessResult.success([]);
      }),
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };

    const runner = new OssCurriculumRunner(
      dbWithMixedTenants as any,
      mockCls as any,
      undefined,
      undefined,
      undefined,
    );
    jest.spyOn(runner, 'runOssModelCycle').mockResolvedValue(0.6);

    await runner.runForFlow({
      flowId: 'FLOW-01',
      userIntent: 'test',
      phase: 'P',
      cyclesPerModel: 1,
    });

    const ragStores = (dbWithMixedTenants.storeDocument as jest.Mock).mock.calls.filter(
      (c: unknown[]) => c[0] === RAG_PATTERNS_INDEX,
    );
    const dpoSeeds = ragStores.filter((c: unknown[]) => {
      const doc = c[1] as Record<string, unknown>;
      return doc['source'] === 'dpo-commercial-winner';
    });
    // Only 1 seed (the caller's own record; other tenant filtered out)
    expect(dpoSeeds.length).toBe(1);
  });

  it('SCOPE-2: MODULE-scoped triples are visible to any tenant in seedFromDpoTriples', async () => {
    const dbWithModuleTriple = {
      ...mockDb,
      searchDocuments: jest.fn().mockImplementation(async (index: string) => {
        if (index === 'xiigen-training-data') {
          return DataProcessResult.success([
            {
              station: 'CYCLE-2',
              flowId: 'FLOW-01',
              depth: 0,
              nodeIntent: 'shared',
              knowledgeScope: 'MODULE',
              tenantId: 'module-owner',
              chosen: { text: 'module output', model: 'mock-gemini', score: 9.1 },
            },
          ]);
        }
        return DataProcessResult.success([]);
      }),
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };

    // Different tenant calling the runner — MODULE triple should still be seeded
    const otherTenantCls = { get: jest.fn().mockReturnValue({ tenantId: 'any-other-tenant' }) };
    const runner = new OssCurriculumRunner(
      dbWithModuleTriple as any,
      otherTenantCls as any,
      undefined,
      undefined,
      undefined,
    );
    jest.spyOn(runner, 'runOssModelCycle').mockResolvedValue(0.6);

    await runner.runForFlow({
      flowId: 'FLOW-01',
      userIntent: 'test',
      phase: 'P',
      cyclesPerModel: 1,
    });

    const ragStores = (dbWithModuleTriple.storeDocument as jest.Mock).mock.calls.filter(
      (c: unknown[]) => c[0] === RAG_PATTERNS_INDEX,
    );
    const dpoSeeds = ragStores.filter((c: unknown[]) => {
      const doc = c[1] as Record<string, unknown>;
      return doc['source'] === 'dpo-commercial-winner';
    });
    // MODULE triple visible to any tenant — 1 seed expected
    expect(dpoSeeds.length).toBe(1);
  });
});
