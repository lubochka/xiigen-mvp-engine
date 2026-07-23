import 'reflect-metadata';
import { DataProcessResult } from '../../kernel/data-process-result';
import { FreshTenantTestService, FreshTenantTestInput } from './fresh-tenant-test.service';

const makeSnapshot = (snapshotId = 'snap-1') => ({
  getSnapshot: jest.fn().mockResolvedValue(
    DataProcessResult.success({
      snapshotId,
      tenantId: 'main-tenant',
      flowId: 'FLOW-01',
      phase: 'PHASE-A',
      ragPatternIds: [],
      calibrationRecordIds: [],
      ossRecordIds: [],
      stationDepthPairs: [{ station: 'CYCLE-1', depth: 0 }],
      capturedAt: '',
    }),
  ),
});

function makeDb(freshRecords: unknown[] = []) {
  return {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    searchDocuments: jest.fn(async (_index: string, filter?: Record<string, unknown>) => {
      if (filter?.['tenantId'] && String(filter['tenantId']).startsWith('ephemeral-')) {
        return DataProcessResult.success(freshRecords);
      }
      return DataProcessResult.success([]);
    }),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
  };
}

function makeCalibrationRunner(grade = 0.88) {
  return {
    runForFlow: jest.fn().mockResolvedValue(
      DataProcessResult.success({
        flowId: 'FLOW-01',
        recordsStored: 1,
        depthsReached: 1,
        regressions: [],
      }),
    ),
  };
}

function makeCls() {
  return {
    runWith: jest.fn(async (_ctx: unknown, fn: () => Promise<unknown>) => fn()),
  };
}

const baseInput: FreshTenantTestInput = {
  mainTenantId: 'main-tenant',
  flowId: 'FLOW-01',
  phase: 'PHASE-A',
  userIntent: 'test',
  snapshotId: 'snap-1',
  mainCalibrationRecords: [{ station: 'CYCLE-1', depth: 0, grade: 0.88 }],
};

beforeEach(() => jest.clearAllMocks());

describe('FreshTenantTestService', () => {
  it('runPortabilityTest: uses ephemeral tenantId (ephemeral-*)', async () => {
    const db = makeDb([
      { station: 'CYCLE-1', depth: 0, grade: 0.88, tenantId: 'ephemeral-x', phase: 'PHASE-A' },
    ]);
    const svc = new FreshTenantTestService(
      db as any,
      makeCls() as any,
      makeSnapshot() as any,
      makeCalibrationRunner() as any,
    );
    const result = await svc.runPortabilityTest(baseInput);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.ephemeralTenantId).toMatch(/^ephemeral-/);
  });

  it('runPortabilityTest: passed=true when all parity ≥ 0.90', async () => {
    const db = makeDb([
      { station: 'CYCLE-1', depth: 0, grade: 0.88, tenantId: 'ephemeral-x', phase: 'PHASE-A' },
    ]);
    const svc = new FreshTenantTestService(
      db as any,
      makeCls() as any,
      makeSnapshot() as any,
      makeCalibrationRunner() as any,
    );
    const result = await svc.runPortabilityTest(baseInput);
    expect(result.data!.passed).toBe(true);
    expect(result.data!.gaps).toHaveLength(0);
  });

  it('runPortabilityTest: passed=false when any parity < 0.90', async () => {
    const db = makeDb([
      { station: 'CYCLE-1', depth: 0, grade: 0.5, tenantId: 'ephemeral-x', phase: 'PHASE-A' },
    ]);
    const svc = new FreshTenantTestService(
      db as any,
      makeCls() as any,
      makeSnapshot() as any,
      makeCalibrationRunner() as any,
    );
    const result = await svc.runPortabilityTest(baseInput);
    expect(result.data!.passed).toBe(false);
    expect(result.data!.gaps.length).toBeGreaterThan(0);
  });

  it('classifyGap: parity < 0.70 → class A (RAG dependency)', async () => {
    // main grade 0.88, fresh grade 0.55 → parity = 0.625 < 0.70 → class A
    const db = makeDb([
      { station: 'CYCLE-1', depth: 0, grade: 0.55, tenantId: 'ephemeral-x', phase: 'PHASE-A' },
    ]);
    const svc = new FreshTenantTestService(
      db as any,
      makeCls() as any,
      makeSnapshot() as any,
      makeCalibrationRunner() as any,
    );
    const result = await svc.runPortabilityTest(baseInput);
    const gap = result.data!.gaps[0];
    expect(gap?.gapClass).toBe('A');
  });

  it('classifyGap: parity 0.70-0.85 → class B or C', async () => {
    // main grade 0.88, fresh grade 0.65 → parity = 0.738 → class B
    const db = makeDb([
      { station: 'CYCLE-1', depth: 0, grade: 0.65, tenantId: 'ephemeral-x', phase: 'PHASE-A' },
    ]);
    const svc = new FreshTenantTestService(
      db as any,
      makeCls() as any,
      makeSnapshot() as any,
      makeCalibrationRunner() as any,
    );
    const result = await svc.runPortabilityTest(baseInput);
    const gap = result.data!.gaps[0];
    expect(['B', 'C']).toContain(gap?.gapClass);
  });

  it('runPortabilityTest: report includes required schema fields', async () => {
    const db = makeDb([]);
    const svc = new FreshTenantTestService(
      db as any,
      makeCls() as any,
      makeSnapshot() as any,
      makeCalibrationRunner() as any,
    );
    const result = await svc.runPortabilityTest(baseInput);
    expect(result.data).toMatchObject({
      flowId: 'FLOW-01',
      phase: 'PHASE-A',
      snapshotId: 'snap-1',
      mainTenantId: 'main-tenant',
      threshold: 0.9,
      recordsChecked: 1,
    });
    expect(typeof result.data!.capturedAt).toBe('string');
  });

  it('DNA-3: returns failure when snapshot not found — does not throw', async () => {
    const db = makeDb();
    const badSnapshot = {
      getSnapshot: jest
        .fn()
        .mockResolvedValue(DataProcessResult.failure('NOT_FOUND', 'snap missing')),
    };
    const svc = new FreshTenantTestService(
      db as any,
      makeCls() as any,
      badSnapshot as any,
      makeCalibrationRunner() as any,
    );
    const result = await svc.runPortabilityTest(baseInput);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SNAPSHOT_NOT_FOUND');
    expect(() => result).not.toThrow();
  });

  it('Mode DEVELOPMENT: threshold = 0.90, report never blocks even on gap failures', async () => {
    const db = makeDb([
      { station: 'CYCLE-1', depth: 0, grade: 0.1, tenantId: 'ephemeral-x', phase: 'PHASE-A' },
    ]);
    const svc = new FreshTenantTestService(
      db as any,
      makeCls() as any,
      makeSnapshot() as any,
      makeCalibrationRunner() as any,
    );
    const result = await svc.runPortabilityTest(baseInput);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.threshold).toBe(0.9);
    expect(result.data!.passed).toBe(false);
    expect(() => result).not.toThrow();
  });

  // ── PHASE 1: FREEDOM CONFIG + REAL DEPROVISION ───────────────────────────

  it('FREEDOM config: threshold read from portability.config.threshold.dev', async () => {
    const db = makeDb([]);
    const mockFreedom = {
      get: jest.fn(async (key: string) => {
        if (key === 'portability.config')
          return { threshold: { dev: 0.95 }, gate: { blocking: false } };
        return null;
      }),
    };
    const svc = new FreshTenantTestService(
      db as any,
      makeCls() as any,
      makeSnapshot() as any,
      makeCalibrationRunner() as any,
      mockFreedom as any,
    );
    const result = await svc.runPortabilityTest(baseInput);
    expect(result.data!.threshold).toBe(0.95);
  });

  it('FREEDOM config: falls back to 0.90 when portability.config absent', async () => {
    const db = makeDb([]);
    const mockFreedom = { get: jest.fn().mockResolvedValue(null) };
    const svc = new FreshTenantTestService(
      db as any,
      makeCls() as any,
      makeSnapshot() as any,
      makeCalibrationRunner() as any,
      mockFreedom as any,
    );
    const result = await svc.runPortabilityTest(baseInput);
    expect(result.data!.threshold).toBe(0.9);
  });

  it('real deprovision: deleteDocument called for ephemeral tenant records', async () => {
    // DB has one ephemeral record in calibration-baseline
    const db = {
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      searchDocuments: jest.fn(async (_index: string, filter?: Record<string, unknown>) => {
        if (filter?.['tenantId'] && String(filter['tenantId']).startsWith('ephemeral-')) {
          return DataProcessResult.success([{ _id: 'eph-rec-1', tenantId: filter['tenantId'] }]);
        }
        return DataProcessResult.success([]);
      }),
      getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
      deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    };
    const svc = new FreshTenantTestService(
      db as any,
      makeCls() as any,
      makeSnapshot() as any,
      makeCalibrationRunner() as any,
    );
    await svc.runPortabilityTest(baseInput);
    expect(db.deleteDocument).toHaveBeenCalled();
    const deletedId = (db.deleteDocument as jest.Mock).mock.calls[0]?.[1];
    expect(deletedId).toBe('eph-rec-1');
  });
});
