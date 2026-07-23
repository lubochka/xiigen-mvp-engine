import 'reflect-metadata';
import { DataProcessResult } from '../../kernel/data-process-result';
import { ModuleAdoptionService, MODULE_ADOPTIONS_INDEX } from './module-adoption.service';
import { MODULE_LIBRARY_INDEX } from './module-library.service';

function makeDb(seedModule?: Record<string, unknown>) {
  const store = new Map<string, Record<string, unknown>[]>();
  if (seedModule) {
    store.set(MODULE_LIBRARY_INDEX, [seedModule]);
  }
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
      const doc = (store.get(index) ?? []).find((d) => d['_id'] === id || d['moduleId'] === id);
      return doc ? DataProcessResult.success(doc) : DataProcessResult.failure('NOT_FOUND', '');
    }),
    _store: store,
  };
}

const seedModule = {
  moduleId: 'mod-1',
  _id: 'mod-1',
  flowId: 'FLOW-01',
  phase: 'PHASE-A',
  ownerId: 'owner-1',
  scope: 'MODULE',
  pricingModel: null,
  ragSnapshotId: null,
  adoptionCount: 0,
  createdAt: '',
};

const makeModuleLibrary = () => ({
  incrementAdoptionCount: jest.fn().mockResolvedValue(undefined),
});

const makeCls = () => ({ get: jest.fn() });

beforeEach(() => jest.clearAllMocks());

describe('ModuleAdoptionService', () => {
  it('adopt: writes adoption record to xiigen-module-adoptions', async () => {
    const db = makeDb(seedModule);
    const svc = new ModuleAdoptionService(db as any, makeCls() as any, makeModuleLibrary() as any);
    const result = await svc.adopt('adopter-1', 'mod-1');
    expect(result.isSuccess).toBe(true);
    const adoptions = db._store.get(MODULE_ADOPTIONS_INDEX) ?? [];
    expect(adoptions.length).toBe(1);
    expect(adoptions[0]!['adoptingTenantId']).toBe('adopter-1');
  });

  it('adopt: sets copiedToRag=true after RAG copy', async () => {
    const db = makeDb(seedModule);
    const svc = new ModuleAdoptionService(db as any, makeCls() as any, makeModuleLibrary() as any);
    const result = await svc.adopt('adopter-1', 'mod-1');
    expect(result.data!.copiedToRag).toBe(true);
  });

  it('adopt: ragNamespace = adopted::{adoptingTenantId}::{moduleId}', async () => {
    const db = makeDb(seedModule);
    const svc = new ModuleAdoptionService(db as any, makeCls() as any, makeModuleLibrary() as any);
    const result = await svc.adopt('adopter-1', 'mod-1');
    expect(result.data!.ragNamespace).toBe('adopted::adopter-1::mod-1');
  });

  it('adopt: returns ALREADY_ADOPTED if duplicate adoption exists', async () => {
    const db = makeDb(seedModule);
    const svc = new ModuleAdoptionService(db as any, makeCls() as any, makeModuleLibrary() as any);
    await svc.adopt('adopter-1', 'mod-1');
    const second = await svc.adopt('adopter-1', 'mod-1');
    expect(second.isSuccess).toBe(false);
    expect(second.errorCode).toBe('ALREADY_ADOPTED');
  });

  it('adopt: increments module adoptionCount (non-blocking)', async () => {
    const db = makeDb(seedModule);
    const moduleLibrary = makeModuleLibrary();
    const svc = new ModuleAdoptionService(db as any, makeCls() as any, moduleLibrary as any);
    await svc.adopt('adopter-1', 'mod-1');
    await new Promise((r) => setImmediate(r)); // let non-blocking fire
    expect(moduleLibrary.incrementAdoptionCount).toHaveBeenCalledWith('mod-1');
  });

  it('listAdoptions: returns all adoptions for tenantId', async () => {
    const db = makeDb(seedModule);
    const svc = new ModuleAdoptionService(db as any, makeCls() as any, makeModuleLibrary() as any);
    await svc.adopt('adopter-1', 'mod-1');
    const result = await svc.listAdoptions('adopter-1');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.length).toBe(1);
  });

  it('DNA-3: adopt returns failure when moduleId not found in library', async () => {
    const db = makeDb(); // no seeded module
    const svc = new ModuleAdoptionService(db as any, makeCls() as any, makeModuleLibrary() as any);
    const result = await svc.adopt('adopter-1', 'nonexistent');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MODULE_NOT_FOUND');
  });

  // ── PHASE 1: REAL RAG COPY ───────────────────────────────────────────────

  it('real RAG copy: queries source RAG records by (ownerId, moduleId) and writes to adopter namespace', async () => {
    const ragSource = {
      _id: 'rag-src-1',
      moduleId: 'mod-1',
      ownerId: 'owner-1',
      content: 'rag pattern',
      knowledgeScope: 'MODULE',
      tenantId: 'owner-1',
    };
    const db = {
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      searchDocuments: jest.fn(async (index: string, filter?: Record<string, unknown>) => {
        if (index === 'xiigen-rag-patterns' && filter?.['ownerId'] === 'owner-1')
          return DataProcessResult.success([ragSource]);
        return DataProcessResult.success([]);
      }),
      getDocument: jest.fn().mockResolvedValue(DataProcessResult.success(seedModule)),
    };
    const svc = new ModuleAdoptionService(db as any, makeCls() as any, makeModuleLibrary() as any);
    await svc.adopt('adopter-1', 'mod-1');

    const ragWrites = (db.storeDocument as jest.Mock).mock.calls.filter(
      (c: unknown[]) => c[0] === 'xiigen-rag-patterns',
    );
    expect(ragWrites.length).toBeGreaterThan(0);
    const writtenRecord = ragWrites[0]![1] as Record<string, unknown>;
    expect(writtenRecord['namespace']).toBe('adopted::adopter-1::mod-1');
    expect(writtenRecord['tenantId']).toBe('adopter-1');
    expect(writtenRecord['ownerId']).toBe('adopter-1');
    expect(writtenRecord['copiedFromOwner']).toBe('owner-1');
  });

  it('DNA-8: adoption record stored before RAG copy dispatch', async () => {
    const storeCalls: string[] = [];
    const db = {
      storeDocument: jest.fn(async (index: string, _doc: Record<string, unknown>, _id: string) => {
        storeCalls.push(index);
        return DataProcessResult.success({});
      }),
      searchDocuments: jest.fn(async () => DataProcessResult.success([])),
      getDocument: jest.fn(async () => DataProcessResult.success(seedModule)),
    };
    const svc = new ModuleAdoptionService(db as any, makeCls() as any, makeModuleLibrary() as any);
    await svc.adopt('adopter-1', 'mod-1');
    const adoptionIdx = storeCalls.indexOf(MODULE_ADOPTIONS_INDEX);
    const ragIdx = storeCalls.indexOf('xiigen-rag-patterns');
    expect(adoptionIdx).toBeGreaterThanOrEqual(0);
    if (ragIdx >= 0) {
      expect(adoptionIdx).toBeLessThan(ragIdx);
    }
  });
});
