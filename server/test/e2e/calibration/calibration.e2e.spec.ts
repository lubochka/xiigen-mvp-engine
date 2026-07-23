// Calibration — Logic/E2E tests
// Full chain through CalibrationRunner + OssCurriculumRunner using in-memory DB.

import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import {
  CalibrationRunner,
  CALIBRATION_INDEX,
} from '../../../src/engine/calibration/calibration-runner.service';
import {
  OssCurriculumRunner,
  OSS_CURRICULUM_INDEX,
} from '../../../src/engine/calibration/oss-curriculum-runner.service';

function makeInMemoryDb() {
  const store = new Map<string, Record<string, unknown>[]>();
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const bucket = store.get(index) ?? [];
      bucket.push({ ...doc, _id: id });
      store.set(index, bucket);
      return DataProcessResult.success({ ...doc, _id: id });
    }),
    searchDocuments: jest.fn(async (index: string) => {
      return DataProcessResult.success(store.get(index) ?? []);
    }),
    getDocument: jest.fn(async (index: string, id: string) => {
      const doc = (store.get(index) ?? []).find((d) => d['_id'] === id);
      return doc ? DataProcessResult.success(doc) : DataProcessResult.failure('NOT_FOUND', '');
    }),
    _store: store,
  };
}

function makeMockCls(tenantId = 'e2e-tenant') {
  return { get: jest.fn().mockReturnValue({ tenantId }) };
}

describe('Calibration — Logic/E2E', () => {
  it('full run: CalibrationRunner produces records in calibration-baseline index', async () => {
    const db = makeInMemoryDb();
    const cls = makeMockCls();
    const cycleChain = {
      run: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          grade: 0.91,
          planSteps: [{ index: 1, text: 's', intClause: 'c' }],
          leafNodes: [],
          topology: [],
        }),
      ),
    };
    const ossCurriculum = {
      runForFlow: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          recordsStored: 15,
          modelsViable: [],
          depthOverloadDetected: false,
          signalSummary: {},
        }),
      ),
    };
    const runner = new CalibrationRunner(
      db as any,
      cls as any,
      cycleChain as any,
      ossCurriculum as any,
    );
    const result = await runner.runForFlow({
      flowId: 'FLOW-01',
      userIntent: 'register user',
      phase: 'PHASE-0',
    });
    expect(result.isSuccess).toBe(true);
    const stored = db._store.get(CALIBRATION_INDEX) ?? [];
    expect(stored.length).toBeGreaterThan(0);
    expect(stored[0]!['station']).toBeDefined();
    expect(typeof stored[0]!['depth']).toBe('number');
    expect(stored[0]!['nodeIntent']).toBeDefined();
  });

  it('depth propagation: all records include a numeric depth value', async () => {
    const db = makeInMemoryDb();
    const cls = makeMockCls();
    const cycleChain = {
      run: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success({ grade: 0.88, planSteps: [], leafNodes: [], topology: [] }),
        ),
    };
    const ossCurriculum = {
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
      db as any,
      cls as any,
      cycleChain as any,
      ossCurriculum as any,
    );
    await runner.runForFlow({ flowId: 'FLOW-01', userIntent: 'test', phase: 'PHASE-0' });
    const records = db._store.get(CALIBRATION_INDEX) ?? [];
    records.forEach((r) => expect(typeof r['depth']).toBe('number'));
  });

  it('OSS curriculum: records in oss-curriculum-runs with correct schema', async () => {
    const db = makeInMemoryDb();
    const cls = makeMockCls();
    const runner = new OssCurriculumRunner(db as any, cls as any);
    const result = await runner.runForFlow({
      flowId: 'FLOW-01',
      userIntent: 'test',
      phase: 'PHASE-0',
      cyclesPerModel: 3,
    });
    expect(result.isSuccess).toBe(true);
    const records = db._store.get(OSS_CURRICULUM_INDEX) ?? [];
    expect(records.length).toBe(9); // 3 models × 3 cycles
    records.forEach((r) => {
      expect(r['ossModel']).toBeDefined();
      expect(typeof r['depth']).toBe('number');
      expect(r['nodeIntent']).toBeDefined();
    });
  });

  it('no provider key or secret in any stored record', async () => {
    const db = makeInMemoryDb();
    const cls = makeMockCls();
    const cycleChain = {
      run: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success({ grade: 0.91, planSteps: [], leafNodes: [], topology: [] }),
        ),
    };
    const ossCurriculum = {
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
      db as any,
      cls as any,
      cycleChain as any,
      ossCurriculum as any,
    );
    await runner.runForFlow({ flowId: 'FLOW-01', userIntent: 'test', phase: 'PHASE-0' });
    const allDocs = [...db._store.values()].flat();
    const serialized = JSON.stringify(allDocs);
    expect(serialized).not.toMatch(/sk-ant|sk-[a-z]|AIza|encryptedKey/);
  });

  it('tenant isolation: calibration records tagged with correct tenantId', async () => {
    const db = makeInMemoryDb();
    const cls = makeMockCls('my-tenant');
    const cycleChain = {
      run: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success({ grade: 0.88, planSteps: [], leafNodes: [], topology: [] }),
        ),
    };
    const ossCurriculum = {
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
      db as any,
      cls as any,
      cycleChain as any,
      ossCurriculum as any,
    );
    await runner.runForFlow({ flowId: 'FLOW-01', userIntent: 'test', phase: 'PHASE-0' });
    const records = db._store.get(CALIBRATION_INDEX) ?? [];
    records.forEach((r) => expect(r['tenantId']).toBe('my-tenant'));
  });
});
