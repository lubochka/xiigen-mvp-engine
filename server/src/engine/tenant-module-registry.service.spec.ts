/**
 * Tests for TenantModuleRegistry (Turn 6 — MVP Plan v3, Goals 4b + 4c + 4d).
 *
 * Covers:
 *   - onModuleInit calls ensureIndex with keyword mappings (tenantId, flowId, packageId)
 *   - registerInstall writes a Linked-mode record stamped with CLS tenantId (DNA-5)
 *   - registerInstall rejects missing CLS context (NO_TENANT)
 *   - registerInstall rejects invalid input (INVALID_INPUT)
 *   - listLinkedModules returns flowIds filtered by target tenantId
 *   - listLinkedModules rejects empty target (INVALID_TARGET)
 */

import { DataProcessResult } from '../kernel/data-process-result';
import { TENANT_CONTEXT_KEY } from '../kernel/multi-tenant/tenant-context';
import {
  TENANT_MODULE_REGISTRY_INDEX,
  TenantModuleRegistry,
} from './tenant-module-registry.service';

function makeMockCls(tenantId: string | null = null) {
  const store = new Map<string, unknown>();
  if (tenantId) store.set(TENANT_CONTEXT_KEY, { tenantId });
  return {
    get: jest.fn((key: string) => store.get(key) ?? null),
    set: jest.fn((key: string, val: unknown) => {
      store.set(key, val);
    }),
    run: jest.fn(async (fn: () => Promise<unknown>) => fn()),
  };
}

function makeMockDb() {
  return {
    ensureIndex: jest.fn().mockResolvedValue(undefined),
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  };
}

describe('TenantModuleRegistry — onModuleInit', () => {
  it('ensures xiigen-tenant-module-registry index with keyword mappings', async () => {
    const db = makeMockDb();
    const cls = makeMockCls();
    const svc = new TenantModuleRegistry(db as never, cls as never);

    await svc.onModuleInit();

    expect(db.ensureIndex).toHaveBeenCalledTimes(1);
    const [indexName, mappings] = db.ensureIndex.mock.calls[0];
    expect(indexName).toBe(TENANT_MODULE_REGISTRY_INDEX);
    expect(mappings).toEqual(
      expect.objectContaining({
        properties: expect.objectContaining({
          tenantId: { type: 'keyword' },
          flowId: { type: 'keyword' },
          packageId: { type: 'keyword' },
          version: { type: 'keyword' },
          installedAt: { type: 'date' },
          linkedMode: { type: 'boolean' },
        }),
      }),
    );
  });
});

describe('TenantModuleRegistry — registerInstall', () => {
  it('writes a Linked-mode record stamped with CLS tenantId (DNA-5)', async () => {
    const db = makeMockDb();
    const cls = makeMockCls('tenant-A');
    const svc = new TenantModuleRegistry(db as never, cls as never);

    const result = await svc.registerInstall({
      packageId: 'PKG-1',
      flowId: 'FLOW-SRC-1',
      version: 'v2',
    });

    expect(result.isSuccess).toBe(true);
    expect(db.storeDocument).toHaveBeenCalledTimes(1);
    const [index, record, docId] = db.storeDocument.mock.calls[0];
    expect(index).toBe(TENANT_MODULE_REGISTRY_INDEX);
    const rec = record as Record<string, unknown>;
    expect(rec.tenantId).toBe('tenant-A');
    expect(rec.packageId).toBe('PKG-1');
    expect(rec.flowId).toBe('FLOW-SRC-1');
    expect(rec.version).toBe('v2');
    expect(rec.linkedMode).toBe(true);
    expect(typeof rec.installedAt).toBe('string');
    expect(docId).toBe('tenant-A::PKG-1');
  });

  it('defaults version to v1 when absent', async () => {
    const db = makeMockDb();
    const cls = makeMockCls('tenant-A');
    const svc = new TenantModuleRegistry(db as never, cls as never);

    await svc.registerInstall({
      packageId: 'PKG-1',
      flowId: 'FLOW-SRC-1',
    } as never);

    const record = db.storeDocument.mock.calls[0][1] as Record<string, unknown>;
    expect(record.version).toBe('v1');
  });

  it('rejects when CLS has no tenant context with NO_TENANT', async () => {
    const db = makeMockDb();
    const cls = makeMockCls(null);
    const svc = new TenantModuleRegistry(db as never, cls as never);

    const result = await svc.registerInstall({ packageId: 'P', flowId: 'F', version: 'v1' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_TENANT');
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('rejects missing packageId or flowId with INVALID_INPUT', async () => {
    const db = makeMockDb();
    const cls = makeMockCls('tenant-A');
    const svc = new TenantModuleRegistry(db as never, cls as never);

    const noPkg = await svc.registerInstall({ packageId: '', flowId: 'F', version: 'v1' });
    expect(noPkg.errorCode).toBe('INVALID_INPUT');
    const noFlow = await svc.registerInstall({ packageId: 'P', flowId: '', version: 'v1' });
    expect(noFlow.errorCode).toBe('INVALID_INPUT');
    expect(db.storeDocument).not.toHaveBeenCalled();
  });
});

describe('TenantModuleRegistry — listLinkedModules', () => {
  it('returns flowIds for a target tenantId (via tenantId filter)', async () => {
    const db = makeMockDb();
    const cls = makeMockCls('tenant-A');
    const svc = new TenantModuleRegistry(db as never, cls as never);

    db.searchDocuments.mockResolvedValueOnce(
      DataProcessResult.success([
        { tenantId: 'tenant-A', packageId: 'PKG-1', flowId: 'FLOW-1', linkedMode: true },
        { tenantId: 'tenant-A', packageId: 'PKG-2', flowId: 'FLOW-2', linkedMode: true },
      ]),
    );
    const result = await svc.listLinkedModules('tenant-A');

    expect(result.isSuccess).toBe(true);
    expect(result.data).toEqual(['FLOW-1', 'FLOW-2']);
    expect(db.searchDocuments).toHaveBeenCalledWith(
      TENANT_MODULE_REGISTRY_INDEX,
      { tenantId: 'tenant-A' },
      200,
    );
  });

  it('rejects empty targetTenantId with INVALID_TARGET', async () => {
    const db = makeMockDb();
    const cls = makeMockCls('tenant-A');
    const svc = new TenantModuleRegistry(db as never, cls as never);

    const result = await svc.listLinkedModules('');
    expect(result.errorCode).toBe('INVALID_TARGET');
    expect(db.searchDocuments).not.toHaveBeenCalled();
  });

  it('propagates search failures via SEARCH_FAILED', async () => {
    const db = makeMockDb();
    const cls = makeMockCls('tenant-A');
    const svc = new TenantModuleRegistry(db as never, cls as never);

    db.searchDocuments.mockResolvedValueOnce(
      DataProcessResult.failure('ES_DOWN', 'cluster unreachable'),
    );
    const result = await svc.listLinkedModules('tenant-A');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('ES_DOWN');
  });
});
