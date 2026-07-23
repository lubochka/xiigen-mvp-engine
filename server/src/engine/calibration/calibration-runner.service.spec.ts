import 'reflect-metadata';
import { DataProcessResult } from '../../kernel/data-process-result';
import {
  CalibrationRunner,
  CalibrationRecord,
  CALIBRATION_INDEX,
} from './calibration-runner.service';

const mockDb = {
  storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
};
const mockCls = { get: jest.fn().mockReturnValue({ tenantId: 'test-tenant' }) };
const mockCycleChain = {
  run: jest.fn().mockResolvedValue(
    DataProcessResult.success({
      grade: 0.91,
      planSteps: [{ index: 1, text: 'step 1', intClause: 'clause 1' }],
      leafNodes: [],
      topology: [],
    }),
  ),
};
const mockOssCurriculum = {
  runForFlow: jest.fn().mockResolvedValue(
    DataProcessResult.success({
      recordsStored: 15,
      modelsViable: ['deepseek-coder:6.7b'],
      depthOverloadDetected: false,
      signalSummary: {},
    }),
  ),
};

const makeRunner = () =>
  new CalibrationRunner(
    mockDb as any,
    mockCls as any,
    mockCycleChain as any,
    mockOssCurriculum as any,
  );

beforeEach(() => jest.clearAllMocks());

describe('CalibrationRunner', () => {
  // ── POSITIVE ─────────────────────────────────────────────────────────────

  it('happy path: runs 3 cycle chain calls (CALIBRATION_RUNS = 3)', async () => {
    const runner = makeRunner();
    await runner.runForFlow({ flowId: 'FLOW-01', userIntent: 'test', phase: 'PHASE-0' });
    expect(mockCycleChain.run).toHaveBeenCalledTimes(3);
  });

  it('DNA-8: storeDocument called BEFORE OssCurriculumRunner.runForFlow', async () => {
    const order: string[] = [];
    mockDb.storeDocument.mockImplementationOnce(async () => {
      order.push('store');
      return DataProcessResult.success({});
    });
    mockOssCurriculum.runForFlow.mockImplementationOnce(async () => {
      order.push('oss');
      return DataProcessResult.success({
        recordsStored: 0,
        modelsViable: [],
        depthOverloadDetected: false,
        signalSummary: {},
      });
    });
    const runner = makeRunner();
    await runner.runForFlow({ flowId: 'FLOW-01', userIntent: 'test', phase: 'PHASE-0' });
    const storeIdx = order.indexOf('store');
    const ossIdx = order.indexOf('oss');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(ossIdx).toBeGreaterThan(storeIdx);
  });

  it('record schema: station, depth, nodeIntent, model, grade all present', async () => {
    const runner = makeRunner();
    await runner.runForFlow({ flowId: 'FLOW-01', userIntent: 'test', phase: 'PHASE-0' });
    const stored = (mockDb.storeDocument as jest.Mock).mock.calls[0]?.[1] as Record<
      string,
      unknown
    >;
    expect(stored['station']).toBeDefined();
    expect(typeof stored['depth']).toBe('number');
    expect(stored['nodeIntent']).toBeDefined();
    expect(stored['model']).toBeDefined();
    expect(typeof stored['grade']).toBe('number');
  });

  it('ITEM-2: extracts actual model name from leafNodes[0].model (not cycle-chain-commercial)', async () => {
    mockCycleChain.run.mockResolvedValueOnce(
      DataProcessResult.success({
        grade: 0.91,
        planSteps: [{ index: 1, text: 'step 1', intClause: 'clause 1' }],
        leafNodes: [{ model: 'claude-3-5-sonnet-20241022', structure: 'test' }],
        topology: [],
      }),
    );
    const runner = makeRunner();
    await runner.runForFlow({ flowId: 'FLOW-01', userIntent: 'test', phase: 'PHASE-0' });
    const stored = (mockDb.storeDocument as jest.Mock).mock.calls[0]?.[1] as Record<
      string,
      unknown
    >;
    expect(stored['model']).toBe('claude-3-5-sonnet-20241022');
  });

  it('ITEM-2: falls back to cycle-chain-commercial when leafNodes is empty', async () => {
    const runner = makeRunner(); // mockCycleChain returns leafNodes: []
    await runner.runForFlow({ flowId: 'FLOW-01', userIntent: 'test', phase: 'PHASE-0' });
    const stored = (mockDb.storeDocument as jest.Mock).mock.calls[0]?.[1] as Record<
      string,
      unknown
    >;
    expect(stored['model']).toBe('cycle-chain-commercial');
  });

  it('stores to xiigen-calibration-baseline index', async () => {
    const runner = makeRunner();
    await runner.runForFlow({ flowId: 'FLOW-01', userIntent: 'test', phase: 'PHASE-0' });
    const index = (mockDb.storeDocument as jest.Mock).mock.calls[0]?.[0];
    expect(index).toBe(CALIBRATION_INDEX);
  });

  it('detectRegressions: flags when grade drops > 0.05 at matching (station, depth)', () => {
    const baseline: CalibrationRecord[] = [
      {
        flowId: 'FLOW-01',
        station: 'CYCLE-1',
        depth: 0,
        nodeIntent: 'test',
        model: 'claude',
        grade: 0.93,
        testDefinitionFile: '',
        ragContextSize: 0,
        graphContextSize: 0,
        phase: 'PHASE-0',
        tenantId: 'test',
        createdAt: '',
      },
    ];
    const delta: CalibrationRecord[] = [{ ...baseline[0]!, grade: 0.81 }];
    expect(CalibrationRunner.detectRegressions(baseline, delta)).toHaveLength(1);
  });

  it('detectRegressions: depth-0 vs depth-1 is NOT a regression (different depth)', () => {
    const baseline: CalibrationRecord[] = [
      {
        flowId: 'FLOW-01',
        station: 'CYCLE-2',
        depth: 0,
        nodeIntent: 'test',
        model: 'claude',
        grade: 0.89,
        testDefinitionFile: '',
        ragContextSize: 0,
        graphContextSize: 0,
        phase: 'PHASE-0',
        tenantId: 'test',
        createdAt: '',
      },
    ];
    const delta: CalibrationRecord[] = [{ ...baseline[0]!, depth: 1, grade: 0.74 }];
    // Depth mismatch → no regression comparison
    expect(CalibrationRunner.detectRegressions(baseline, delta)).toHaveLength(0);
  });

  it('detectDepthOverload: true when depth-1 grade drops > 0.10 vs depth-0', () => {
    const depth0: CalibrationRecord[] = [
      {
        flowId: 'FLOW-01',
        station: 'CYCLE-2',
        depth: 0,
        nodeIntent: 'test',
        model: 'llama3:8b',
        grade: 0.74,
        testDefinitionFile: '',
        ragContextSize: 0,
        graphContextSize: 0,
        phase: 'PHASE-0',
        tenantId: 'test',
        createdAt: '',
      },
    ];
    const depth1: CalibrationRecord[] = [{ ...depth0[0]!, depth: 1, grade: 0.44 }];
    expect(CalibrationRunner.detectDepthOverload(depth0, depth1)).toBe(true);
  });

  // ── NEGATIVE ─────────────────────────────────────────────────────────────

  it('DNA-3: cycle chain failure does not throw — continues with remaining runs', async () => {
    mockCycleChain.run.mockResolvedValueOnce(DataProcessResult.failure('CYCLE_FAIL', 'error'));
    const runner = makeRunner();
    const result = await runner.runForFlow({
      flowId: 'FLOW-01',
      userIntent: 'test',
      phase: 'PHASE-0',
    });
    expect(() => result).not.toThrow();
    expect(result.isSuccess).toBe(true); // other 2 runs succeed
  });

  it('DNA-3: NO_TENANT returns failure without throwing', async () => {
    const noCls = { get: jest.fn().mockReturnValue(null) };
    const runner = new CalibrationRunner(
      mockDb as any,
      noCls as any,
      mockCycleChain as any,
      mockOssCurriculum as any,
    );
    const result = await runner.runForFlow({
      flowId: 'FLOW-01',
      userIntent: 'test',
      phase: 'PHASE-0',
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_TENANT');
  });

  // ── PHASE 1: FREEDOM CONFIG ──────────────────────────────────────────────

  it('FREEDOM config: overrides run count when calibration.config.runs is set', async () => {
    const mockFreedom = {
      get: jest.fn(async (key: string) => {
        if (key === 'calibration.config') return { runs: 5, terminationDepth: 3 };
        return null;
      }),
    };
    const runner = new CalibrationRunner(
      mockDb as any,
      mockCls as any,
      mockCycleChain as any,
      mockOssCurriculum as any,
      undefined, // policyService
      undefined, // moduleSnapshot
      undefined, // freshTenantTest
      mockFreedom as any,
    );
    await runner.runForFlow({ flowId: 'FLOW-01', userIntent: 'test', phase: 'PHASE-0' });
    expect(mockCycleChain.run).toHaveBeenCalledTimes(5);
  });

  it('FREEDOM config: falls back to 3 runs when config absent', async () => {
    const mockFreedom = { get: jest.fn().mockResolvedValue(null) };
    const runner = new CalibrationRunner(
      mockDb as any,
      mockCls as any,
      mockCycleChain as any,
      mockOssCurriculum as any,
      undefined,
      undefined,
      undefined,
      mockFreedom as any,
    );
    await runner.runForFlow({ flowId: 'FLOW-01', userIntent: 'test', phase: 'PHASE-0' });
    expect(mockCycleChain.run).toHaveBeenCalledTimes(3);
  });

  // ── P3: GRADUATION TRIGGER ───────────────────────────────────────────────

  it('P3: calls graduateTier(3) for deepseek-coder:6.7b when OSS curriculum marks it viable', async () => {
    const mockGraduationResolver = { graduateTier: jest.fn() };
    const runner = new CalibrationRunner(
      mockDb as any,
      mockCls as any,
      mockCycleChain as any,
      mockOssCurriculum as any,
      undefined, // policyService
      undefined, // moduleSnapshot
      undefined, // freshTenantTest
      undefined, // freedomConfig
      mockGraduationResolver as any,
    );
    await runner.runForFlow({ flowId: 'FLOW-01', userIntent: 'test', phase: 'PHASE-0' });
    // deepseek-coder:6.7b maps to tier 3 per OSS_MODEL_TO_TIER
    expect(mockGraduationResolver.graduateTier).toHaveBeenCalledWith(3);
    expect(mockGraduationResolver.graduateTier).toHaveBeenCalledTimes(1);
  });

  it('P3: does NOT call graduateTier when modelsViable is empty', async () => {
    const mockGraduationResolver = { graduateTier: jest.fn() };
    const emptyOss = {
      runForFlow: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          recordsStored: 0,
          modelsViable: [],
          depthOverloadDetected: false,
          signalSummary: {},
        }),
      ),
    };
    const runner = new CalibrationRunner(
      mockDb as any,
      mockCls as any,
      mockCycleChain as any,
      emptyOss as any,
      undefined,
      undefined,
      undefined,
      undefined,
      mockGraduationResolver as any,
    );
    await runner.runForFlow({ flowId: 'FLOW-01', userIntent: 'test', phase: 'PHASE-0' });
    expect(mockGraduationResolver.graduateTier).not.toHaveBeenCalled();
  });

  it('P3: calls graduateTier for each viable model (llama3:8b → tier 1, codellama:13b → tier 2)', async () => {
    const mockGraduationResolver = { graduateTier: jest.fn() };
    const multiModelOss = {
      runForFlow: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          recordsStored: 20,
          modelsViable: ['llama3:8b', 'codellama:13b'],
          depthOverloadDetected: false,
          signalSummary: {},
        }),
      ),
    };
    const runner = new CalibrationRunner(
      mockDb as any,
      mockCls as any,
      mockCycleChain as any,
      multiModelOss as any,
      undefined,
      undefined,
      undefined,
      undefined,
      mockGraduationResolver as any,
    );
    await runner.runForFlow({ flowId: 'FLOW-01', userIntent: 'test', phase: 'PHASE-0' });
    expect(mockGraduationResolver.graduateTier).toHaveBeenCalledWith(1);
    expect(mockGraduationResolver.graduateTier).toHaveBeenCalledWith(2);
    expect(mockGraduationResolver.graduateTier).toHaveBeenCalledTimes(2);
  });

  it('P3: skips graduation when OSS curriculum fails (DNA-3 compliance)', async () => {
    const mockGraduationResolver = { graduateTier: jest.fn() };
    const failOss = {
      runForFlow: jest
        .fn()
        .mockResolvedValue(DataProcessResult.failure('OSS_FAIL', 'curriculum error')),
    };
    const runner = new CalibrationRunner(
      mockDb as any,
      mockCls as any,
      mockCycleChain as any,
      failOss as any,
      undefined,
      undefined,
      undefined,
      undefined,
      mockGraduationResolver as any,
    );
    const result = await runner.runForFlow({
      flowId: 'FLOW-01',
      userIntent: 'test',
      phase: 'PHASE-0',
    });
    // Never throws, never graduates
    expect(result.isSuccess).toBe(true);
    expect(mockGraduationResolver.graduateTier).not.toHaveBeenCalled();
  });
});
