import 'reflect-metadata';
import { DataProcessResult } from '../../kernel/data-process-result';
import { ModuleSnapshotService } from './module-snapshot.service';

function makeDb(
  ragRecords: unknown[] = [],
  calRecords: unknown[] = [],
  ossRecords: unknown[] = [],
  graphRecords: unknown[] = [],
  promptRecords: unknown[] = [],
) {
  return {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    searchDocuments: jest.fn(async (_index: string, filter?: Record<string, unknown>) => {
      const phase = filter?.['phase'];
      if (_index === 'xiigen-rag-patterns') {
        return DataProcessResult.success(
          ragRecords.filter((r: any) => !phase || r.phase === phase),
        );
      }
      if (_index === 'xiigen-calibration-baseline') {
        return DataProcessResult.success(
          calRecords.filter((r: any) => !phase || r.phase === phase),
        );
      }
      if (_index === 'xiigen-oss-curriculum-runs') {
        return DataProcessResult.success(
          ossRecords.filter((r: any) => !phase || r.phase === phase),
        );
      }
      if (_index === 'xiigen-decision-graph') {
        return DataProcessResult.success(
          graphRecords.filter((r: any) => !phase || r.phase === phase),
        );
      }
      if (_index === 'xiigen-prompts') {
        return DataProcessResult.success(
          promptRecords.filter((r: any) => !phase || r.phase === phase),
        );
      }
      return DataProcessResult.success([]);
    }),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
  };
}

const makeModuleLibrary = () => ({
  registerModule: jest.fn().mockResolvedValue(DataProcessResult.success({ moduleId: 'lib-1' })),
});

beforeEach(() => jest.clearAllMocks());

describe('ModuleSnapshotService', () => {
  it('captureSnapshot: queries rag-patterns, calibration-baseline, oss-curriculum-runs, decision-graph, prompts', async () => {
    const db = makeDb(
      [{ _id: 'rag-1', phase: 'PHASE-A', tenantId: 'tenant-1' }],
      [{ _id: 'cal-1', phase: 'PHASE-A', tenantId: 'tenant-1', station: 'CYCLE-1', depth: 0 }],
      [{ _id: 'oss-1', phase: 'PHASE-A', tenantId: 'tenant-1' }],
      [{ _id: 'gr-1', phase: 'PHASE-A', ownerId: 'tenant-1' }],
      [{ _id: 'pr-1', phase: 'PHASE-A', flowId: 'FLOW-01' }],
    );
    const svc = new ModuleSnapshotService(db as any, makeModuleLibrary() as any);
    const result = await svc.captureSnapshot({
      tenantId: 'tenant-1',
      flowId: 'FLOW-01',
      phase: 'PHASE-A',
    });
    expect(result.isSuccess).toBe(true);
    expect(db.searchDocuments).toHaveBeenCalledWith('xiigen-rag-patterns', expect.any(Object));
    expect(db.searchDocuments).toHaveBeenCalledWith(
      'xiigen-calibration-baseline',
      expect.any(Object),
    );
    expect(db.searchDocuments).toHaveBeenCalledWith(
      'xiigen-oss-curriculum-runs',
      expect.any(Object),
    );
    expect(db.searchDocuments).toHaveBeenCalledWith('xiigen-decision-graph', expect.any(Object));
    expect(db.searchDocuments).toHaveBeenCalledWith('xiigen-prompts', expect.any(Object));
  });

  it('captureSnapshot: includes stationDepthPairs from calibration records', async () => {
    const calRecords = [
      { _id: 'c1', phase: 'PHASE-A', tenantId: 't1', station: 'CYCLE-1', depth: 0 },
      { _id: 'c2', phase: 'PHASE-A', tenantId: 't1', station: 'CYCLE-2', depth: 1 },
    ];
    const db = makeDb([], calRecords, []);
    const svc = new ModuleSnapshotService(db as any, makeModuleLibrary() as any);
    const result = await svc.captureSnapshot({ tenantId: 't1', flowId: 'F', phase: 'PHASE-A' });
    expect(result.data!.stationDepthPairs).toHaveLength(2);
    expect(result.data!.stationDepthPairs).toEqual(
      expect.arrayContaining([
        { station: 'CYCLE-1', depth: 0 },
        { station: 'CYCLE-2', depth: 1 },
      ]),
    );
  });

  it('captureSnapshot: registers snapshot in module-library via registerModule', async () => {
    const db = makeDb();
    const moduleLibrary = makeModuleLibrary();
    const svc = new ModuleSnapshotService(db as any, moduleLibrary as any);
    await svc.captureSnapshot({ tenantId: 't1', flowId: 'FLOW-01', phase: 'PHASE-A' });
    expect(moduleLibrary.registerModule).toHaveBeenCalledWith(
      expect.objectContaining({ flowId: 'FLOW-01', phase: 'PHASE-A', ownerId: 't1' }),
    );
  });

  it('captureSnapshot: DNA-8 — snapshot saved before library registration', async () => {
    const db = makeDb();
    const callOrder: string[] = [];
    const moduleLibrary = {
      registerModule: jest.fn(async () => {
        callOrder.push('library');
        return DataProcessResult.success({ moduleId: 'lib-1' });
      }),
    };
    // Patch captureSnapshot to track snapshot save
    const svc = new ModuleSnapshotService(db as any, moduleLibrary as any);
    const originalCapture = svc.captureSnapshot.bind(svc);
    const snapshotSet = (svc as any).snapshots as Map<string, unknown>;
    const originalSnapshotSet = snapshotSet.set.bind(snapshotSet);
    snapshotSet.set = (key: string, val: unknown) => {
      callOrder.push('snapshot');
      return originalSnapshotSet(key, val);
    };
    await originalCapture({ tenantId: 't1', flowId: 'F', phase: 'P' });
    const snapshotFirst = callOrder.indexOf('snapshot');
    const libraryFirst = callOrder.indexOf('library');
    expect(snapshotFirst).toBeGreaterThanOrEqual(0);
    expect(snapshotFirst).toBeLessThan(libraryFirst);
  });

  it('getSnapshot: returns NOT_FOUND failure when snapshotId absent', async () => {
    const db = makeDb();
    const svc = new ModuleSnapshotService(db as any, makeModuleLibrary() as any);
    const result = await svc.getSnapshot('nonexistent');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
  });

  it('getSnapshot: returns snapshot when found', async () => {
    const db = makeDb();
    const svc = new ModuleSnapshotService(db as any, makeModuleLibrary() as any);
    const created = await svc.captureSnapshot({ tenantId: 't1', flowId: 'F', phase: 'P' });
    const fetched = await svc.getSnapshot(created.data!.snapshotId);
    expect(fetched.isSuccess).toBe(true);
    expect(fetched.data!.snapshotId).toBe(created.data!.snapshotId);
  });

  it('DNA-3: captureSnapshot returns failure on db error, does not throw', async () => {
    const db = makeDb();
    (db.searchDocuments as jest.Mock).mockRejectedValue(new Error('db crash'));
    const svc = new ModuleSnapshotService(db as any, makeModuleLibrary() as any);
    const result = await svc.captureSnapshot({ tenantId: 't1', flowId: 'F', phase: 'P' });
    expect(result.isSuccess).toBe(false);
    expect(() => result).not.toThrow();
  });

  // ── ISSUE-3 FIX: graph edges + prompt versions captured in snapshot ────────

  it('Issue-3: snapshot includes graphEdgeIds from xiigen-decision-graph', async () => {
    const db = makeDb(
      [],
      [],
      [],
      [
        { _id: 'gr-1', phase: 'PHASE-A', ownerId: 't1' },
        { _id: 'gr-2', phase: 'PHASE-A', ownerId: 't1' },
      ],
      [],
    );
    const svc = new ModuleSnapshotService(db as any, makeModuleLibrary() as any);
    const result = await svc.captureSnapshot({ tenantId: 't1', flowId: 'F', phase: 'PHASE-A' });
    expect(result.data!.graphEdgeIds).toEqual(expect.arrayContaining(['gr-1', 'gr-2']));
  });

  it('Issue-3: snapshot includes promptVersionIds from xiigen-prompts', async () => {
    const db = makeDb([], [], [], [], [{ _id: 'pr-1', phase: 'PHASE-A', flowId: 'F' }]);
    const svc = new ModuleSnapshotService(db as any, makeModuleLibrary() as any);
    const result = await svc.captureSnapshot({ tenantId: 't1', flowId: 'F', phase: 'PHASE-A' });
    expect(result.data!.promptVersionIds).toEqual(['pr-1']);
  });
});
