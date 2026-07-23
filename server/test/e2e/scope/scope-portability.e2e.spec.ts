// Scope + Portability — Logic/E2E tests
// Full chain through KnowledgePolicyService, ModuleLibraryService,
// ModuleAdoptionService, ModuleSnapshotService, FreshTenantTestService
// using in-memory DB.

import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import {
  KnowledgePolicyService,
  KNOWLEDGE_POLICY_INDEX,
  PLATFORM_OWNER_ID,
} from '../../../src/engine/scope/knowledge-policy.service';
import {
  ModuleLibraryService,
  MODULE_LIBRARY_INDEX,
} from '../../../src/engine/scope/module-library.service';
import {
  ModuleAdoptionService,
  MODULE_ADOPTIONS_INDEX,
} from '../../../src/engine/scope/module-adoption.service';
import { ModuleSnapshotService } from '../../../src/engine/scope/module-snapshot.service';
import { FreshTenantTestService } from '../../../src/engine/scope/fresh-tenant-test.service';

function makeInMemoryDb() {
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
      const doc = (store.get(index) ?? []).find((d) => d['_id'] === id || d['moduleId'] === id);
      return doc ? DataProcessResult.success(doc) : DataProcessResult.failure('NOT_FOUND', '');
    }),
    _store: store,
  };
}

const makeCls = (tenantId = 'e2e-tenant') => ({ get: jest.fn().mockReturnValue({ tenantId }) });

describe('Scope + Portability — Logic/E2E', () => {
  it('policy resolution chain: most specific policy wins across 3 specificity levels', async () => {
    const db = makeInMemoryDb();
    const cls = makeCls('tenant-e2e');
    const svc = new KnowledgePolicyService(db as any, cls as any);

    // Phase-level: MODULE
    await svc.setPolicy({
      tenantId: 'tenant-e2e',
      flowId: 'FLOW-01',
      phase: 'PHASE-A',
      station: null,
      depth: null,
      scope: 'MODULE',
      pricingModel: null,
      pricePerUse: null,
      ownerId: 'tenant-e2e',
      approvalState: 'APPROVED',
      approvedAt: null,
      approvedBy: null,
    });
    // Station-level: PRIVATE (more specific)
    await svc.setPolicy({
      tenantId: 'tenant-e2e',
      flowId: 'FLOW-01',
      phase: 'PHASE-A',
      station: 'AF-1',
      depth: null,
      scope: 'PRIVATE',
      pricingModel: null,
      pricePerUse: null,
      ownerId: 'tenant-e2e',
      approvalState: 'APPROVED',
      approvedAt: null,
      approvedBy: null,
    });
    // Station+depth: GLOBAL (most specific)
    await svc.setPolicy({
      tenantId: 'tenant-e2e',
      flowId: 'FLOW-01',
      phase: 'PHASE-A',
      station: 'CYCLE-1',
      depth: 0,
      scope: 'GLOBAL',
      pricingModel: null,
      pricePerUse: null,
      ownerId: 'tenant-e2e',
      approvalState: 'APPROVED',
      approvedAt: null,
      approvedBy: null,
    });

    expect((await svc.resolveScope('tenant-e2e', 'FLOW-01', 'PHASE-A', 'CYCLE-1', 0)).scope).toBe(
      'GLOBAL',
    );
    expect((await svc.resolveScope('tenant-e2e', 'FLOW-01', 'PHASE-A', 'AF-1')).scope).toBe(
      'PRIVATE',
    );
    expect((await svc.resolveScope('tenant-e2e', 'FLOW-01', 'PHASE-A')).scope).toBe('MODULE');
  });

  it('platform MODULE policy: applied to new tenant when no tenant policy exists', async () => {
    const db = makeInMemoryDb();
    const cls = makeCls('brand-new-tenant');
    const svc = new KnowledgePolicyService(db as any, cls as any);

    // Bootstrap platform policy for FLOW-05
    await svc.setPolicy({
      tenantId: PLATFORM_OWNER_ID,
      flowId: 'FLOW-05',
      phase: '*',
      station: null,
      depth: null,
      scope: 'MODULE',
      pricingModel: 'FREE',
      pricePerUse: null,
      ownerId: PLATFORM_OWNER_ID,
      approvalState: 'APPROVED',
      approvedAt: null,
      approvedBy: null,
    });

    const resolution = await svc.resolveScope('brand-new-tenant', 'FLOW-05', '*');
    expect(resolution.scope).toBe('MODULE');
  });

  it('module registration + browse: register module, verify scope=MODULE, browse returns it', async () => {
    const db = makeInMemoryDb();
    const svc = new ModuleLibraryService(db as any, makeCls() as any);

    const regResult = await svc.registerModule({
      flowId: 'FLOW-03',
      phase: 'PHASE-B',
      title: 'Auth Flow Module',
      description: 'Handles authentication',
      ownerId: 'e2e-tenant',
      calibrationIds: ['cal-1', 'cal-2'],
    });
    expect(regResult.isSuccess).toBe(true);
    expect(regResult.data!.scope).toBe('MODULE');

    const browseResult = await svc.browse({ flowId: 'FLOW-03' });
    expect(browseResult.isSuccess).toBe(true);
    expect(browseResult.data!.length).toBe(1);
    expect(browseResult.data![0]!['flowId']).toBe('FLOW-03');
    expect(browseResult.data![0]!['title']).toBe('Auth Flow Module');
  });

  it('adoption + RAG copy: adopt() writes record with copiedToRag=true and correct ragNamespace', async () => {
    const db = makeInMemoryDb();
    // Seed a module directly
    const moduleEntry = {
      moduleId: 'mod-e2e-1',
      _id: 'mod-e2e-1',
      flowId: 'FLOW-07',
      phase: 'PHASE-C',
      ownerId: 'e2e-tenant',
      scope: 'MODULE',
      pricingModel: null,
      ragSnapshotId: null,
      adoptionCount: 0,
      createdAt: new Date().toISOString(),
    };
    db._store.set(MODULE_LIBRARY_INDEX, [moduleEntry]);

    const moduleLibrary = new ModuleLibraryService(db as any, makeCls() as any);
    const adoptionSvc = new ModuleAdoptionService(db as any, makeCls() as any, moduleLibrary);

    const result = await adoptionSvc.adopt('adopter-tenant', 'mod-e2e-1');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.copiedToRag).toBe(true);
    expect(result.data!.ragNamespace).toBe('adopted::adopter-tenant::mod-e2e-1');

    const listResult = await adoptionSvc.listAdoptions('adopter-tenant');
    expect(listResult.data!.length).toBe(1);
    expect(listResult.data![0]!['adoptingTenantId']).toBe('adopter-tenant');
  });

  it('portability report shape: runPortabilityTest returns correct schema', async () => {
    const db = makeInMemoryDb();
    const cls = makeCls('main-tenant');
    const moduleLibrary = new ModuleLibraryService(db as any, cls as any);
    const snapshotSvc = new ModuleSnapshotService(db as any, moduleLibrary);

    // Capture a snapshot first
    const snapResult = await snapshotSvc.captureSnapshot({
      tenantId: 'main-tenant',
      flowId: 'FLOW-01',
      phase: 'PHASE-A',
    });
    expect(snapResult.isSuccess).toBe(true);

    // Mock calibration runner — returns success with no records
    const mockCal = {
      runForFlow: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success({
            flowId: 'FLOW-01',
            recordsStored: 0,
            depthsReached: 1,
            regressions: [],
          }),
        ),
    };
    const mockCls = {
      runWith: jest.fn(async (_ctx: unknown, fn: () => Promise<unknown>) => fn()),
    };
    const freshSvc = new FreshTenantTestService(
      db as any,
      mockCls as any,
      snapshotSvc,
      mockCal as any,
    );

    const report = await freshSvc.runPortabilityTest({
      mainTenantId: 'main-tenant',
      flowId: 'FLOW-01',
      phase: 'PHASE-A',
      userIntent: 'test',
      snapshotId: snapResult.data!.snapshotId,
      mainCalibrationRecords: [{ station: 'CYCLE-1', depth: 0, grade: 0.88 }],
    });

    expect(report.isSuccess).toBe(true);
    expect(report.data).toMatchObject({
      flowId: 'FLOW-01',
      phase: 'PHASE-A',
      mainTenantId: 'main-tenant',
      threshold: 0.9,
      recordsChecked: 1,
    });
    expect(report.data!.ephemeralTenantId).toMatch(/^ephemeral-/);
    expect(Array.isArray(report.data!.gaps)).toBe(true);
    expect(typeof report.data!.capturedAt).toBe('string');
  });
});
