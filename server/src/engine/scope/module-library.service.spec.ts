import 'reflect-metadata';
import { DataProcessResult } from '../../kernel/data-process-result';
import { ModuleLibraryService, MODULE_LIBRARY_INDEX } from './module-library.service';

function makeDb() {
  const store = new Map<string, Record<string, unknown>[]>();
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const bucket = store.get(index) ?? [];
      const existing = bucket.findIndex((d) => d['_id'] === id);
      if (existing >= 0) bucket.splice(existing, 1);
      bucket.push({ ...doc, _id: id });
      store.set(index, bucket);
      return DataProcessResult.success({ ...doc, _id: id });
    }),
    searchDocuments: jest.fn(async (index: string, filter?: Record<string, unknown>) => {
      const records = store.get(index) ?? [];
      if (!filter || Object.keys(filter).length === 0) return DataProcessResult.success(records);
      const filtered = records.filter((r) =>
        Object.entries(filter).every(([k, v]) => v === undefined || r[k] === v),
      );
      return DataProcessResult.success(filtered);
    }),
    getDocument: jest.fn(async (index: string, id: string) => {
      const doc = (store.get(index) ?? []).find((d) => d['_id'] === id);
      return doc ? DataProcessResult.success(doc) : DataProcessResult.failure('NOT_FOUND', '');
    }),
    _store: store,
  };
}

const makeCls = () => ({ get: jest.fn() });

beforeEach(() => jest.clearAllMocks());

describe('ModuleLibraryService', () => {
  it('registerModule: stores entry to module-library with scope=MODULE', async () => {
    const db = makeDb();
    const svc = new ModuleLibraryService(db as any, makeCls() as any);
    const result = await svc.registerModule({
      flowId: 'FLOW-01',
      phase: 'PHASE-A',
      title: 'Test Module',
      description: 'desc',
      ownerId: 'owner-1',
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.scope).toBe('MODULE');
    expect(result.data!.version).toBe('1.0.0');
    const stored = db._store.get(MODULE_LIBRARY_INDEX) ?? [];
    expect(stored.length).toBe(1);
  });

  it('registerModule: idempotent by (ownerId, flowId, phase) — returns existing entry', async () => {
    const db = makeDb();
    const svc = new ModuleLibraryService(db as any, makeCls() as any);
    const first = await svc.registerModule({
      flowId: 'FLOW-01',
      phase: 'PHASE-A',
      title: 'T',
      description: 'd',
      ownerId: 'owner-1',
    });
    const second = await svc.registerModule({
      flowId: 'FLOW-01',
      phase: 'PHASE-A',
      title: 'T2',
      description: 'd2',
      ownerId: 'owner-1',
    });
    expect(second.data!.moduleId).toBe(first.data!.moduleId);
    expect(db._store.get(MODULE_LIBRARY_INDEX)!.length).toBe(1);
  });

  it('browse: returns MODULE + GLOBAL entries, not PRIVATE', async () => {
    const db = makeDb();
    const svc = new ModuleLibraryService(db as any, makeCls() as any);
    // Register a MODULE entry (via registerModule) and manually seed a PRIVATE entry
    await svc.registerModule({
      flowId: 'FLOW-01',
      phase: 'PHASE-A',
      title: 'Pub',
      description: '',
      ownerId: 'o1',
    });
    await db.storeDocument(
      MODULE_LIBRARY_INDEX,
      {
        moduleId: 'priv-1',
        flowId: 'FLOW-02',
        phase: 'PHASE-A',
        scope: 'PRIVATE',
        ownerId: 'o1',
        createdAt: '',
      },
      'priv-1',
    );
    const result = await svc.browse();
    expect(result.isSuccess).toBe(true);
    expect(result.data!.every((e) => e['scope'] !== 'PRIVATE')).toBe(true);
    expect(result.data!.length).toBe(1);
  });

  it('browse: filter by flowId returns matching subset', async () => {
    const db = makeDb();
    const svc = new ModuleLibraryService(db as any, makeCls() as any);
    await svc.registerModule({
      flowId: 'FLOW-01',
      phase: 'P',
      title: 'A',
      description: '',
      ownerId: 'o',
    });
    await svc.registerModule({
      flowId: 'FLOW-02',
      phase: 'P',
      title: 'B',
      description: '',
      ownerId: 'o',
    });
    const result = await svc.browse({ flowId: 'FLOW-01' });
    expect(result.data!.length).toBe(1);
    expect(result.data![0]!['flowId']).toBe('FLOW-01');
  });

  it('incrementAdoptionCount: increments counter on existing entry', async () => {
    const db = makeDb();
    const svc = new ModuleLibraryService(db as any, makeCls() as any);
    const reg = await svc.registerModule({
      flowId: 'F',
      phase: 'P',
      title: 'T',
      description: '',
      ownerId: 'o',
    });
    const moduleId = reg.data!.moduleId;
    await svc.incrementAdoptionCount(moduleId);
    const entry = (db._store.get(MODULE_LIBRARY_INDEX) ?? []).find(
      (e) => e['moduleId'] === moduleId,
    );
    expect(entry?.['adoptionCount']).toBe(1);
  });

  it('incrementAdoptionCount: DNA-3 — failure is non-blocking, returns void', async () => {
    const db = makeDb();
    (db.getDocument as jest.Mock).mockResolvedValue(DataProcessResult.failure('NOT_FOUND', ''));
    const svc = new ModuleLibraryService(db as any, makeCls() as any);
    await expect(svc.incrementAdoptionCount('nonexistent')).resolves.toBeUndefined();
  });

  it('DNA-3: registerModule returns failure on db failure, does not throw', async () => {
    const db = makeDb();
    (db.storeDocument as jest.Mock).mockResolvedValue(DataProcessResult.failure('DB_ERR', 'fail'));
    const svc = new ModuleLibraryService(db as any, makeCls() as any);
    const result = await svc.registerModule({
      flowId: 'F',
      phase: 'P',
      title: 'T',
      description: '',
      ownerId: 'o',
    });
    expect(result.isSuccess).toBe(false);
    expect(() => result).not.toThrow();
  });
});
