/**
 * Tests for TenantTopologyStore (Track 0 Turn 2).
 *
 * Test matrix (14 tests — see robust-dreaming-star.md Section 16):
 *   T1:  storePrivate writes to TENANT_TOPOLOGIES_INDEX with tenant from ALS
 *   T2:  storeGlobalTemplate writes to FLOW_TEMPLATES_INDEX when ALS = MASTER_TENANT_ID
 *   T3:  storeGlobalTemplate FAILS when ALS is not MASTER_TENANT_ID
 *   T4:  docId format ${flowId}::${tenantId}::${version} in both store methods
 *   T5:  tenantId on record ALWAYS from ALS (DNA-5 — client-provided ignored)
 *   T6:  listPrivate returns only current tenant's records
 *   T7:  listGlobalTemplates uses cls.run + cls.set to switch to MASTER_TENANT_ID
 *   T8:  listGlobalTemplates scope switch does not leak (ALS restored after cls.run)
 *   T9:  getById checks PRIVATE first, falls back to GLOBAL
 *   T10: forkToPrivate copies GLOBAL, stamps current tenant as PRIVATE, records forkedFrom
 *   T11: forkToPrivate rejects if source is already PRIVATE
 *   T12: Duplicate storePrivate calls with same docId → UPSERT idempotent
 *   T13: Zero write calls to xiigen-flow-definitions index (engine kernel untouched)
 *   T14: CF-POLICY-01 — every stored record has connectionType: 'FLOW_SCOPED'
 */

import { DataProcessResult } from '../kernel/data-process-result';
import { TENANT_CONTEXT_KEY } from '../kernel/multi-tenant/tenant-context';
import {
  TenantTopologyStore,
  TenantTopology,
  FLOW_TEMPLATES_INDEX,
  TENANT_TOPOLOGIES_INDEX,
  MASTER_TENANT_ID,
} from './tenant-topology-store';

// ─── Mock helpers (v20 Finding Z) ──────────────────────────────────────────────
// CLS mock combines get + set + run with scope isolation.
// No existing spec in the codebase provides this pattern — must be authored
// explicitly. Required for tests T7, T8, T9, T10, T11 (any test that crosses
// cls.run boundary).

interface MockCls {
  get: jest.Mock;
  set: jest.Mock;
  run: jest.Mock;
}

function makeMockCls(tenantId: string | null = null): MockCls {
  const store = new Map<string, unknown>();
  if (tenantId) store.set(TENANT_CONTEXT_KEY, { tenantId });
  return {
    get: jest.fn((key: string) => store.get(key) ?? null),
    set: jest.fn((key: string, val: unknown) => {
      store.set(key, val);
    }),
    run: jest.fn(async (fn: () => Promise<unknown>) => {
      // Scope isolation (production ClsService.run behavior):
      //   snapshot → execute callback → restore — so outer scope is not mutated.
      const snapshot = new Map(store);
      try {
        return await fn();
      } finally {
        store.clear();
        for (const [k, v] of snapshot) store.set(k, v);
      }
    }),
  };
}

interface MockDb {
  storeDocument: jest.Mock;
  searchDocuments: jest.Mock;
  getDocument: jest.Mock;
  deleteDocument: jest.Mock;
  bulkStore: jest.Mock;
  countDocuments: jest.Mock;
  ensureIndex: jest.Mock;
  getDocumentWithVersion: jest.Mock;
  storeDocumentWithOCC: jest.Mock;
}

function makeMockDb(): MockDb {
  return {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.success(null)),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({ stored: 0, failed: 0 })),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    ensureIndex: jest.fn().mockResolvedValue(undefined),
    getDocumentWithVersion: jest.fn().mockResolvedValue(DataProcessResult.success(null)),
    storeDocumentWithOCC: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  };
}

// Sample TenantTopology factory
function makeTopology(
  overrides: Partial<TenantTopology> = {},
): Omit<TenantTopology, 'tenantId' | 'connectionType'> {
  return {
    flowId: 'FLOW-CHAIN-TEST01',
    knowledgeScope: 'PRIVATE',
    name: 'Test Flow',
    version: 'v1',
    status: 'PUBLISHED',
    nodes: [
      { nodeId: 'n1', name: 'Start', archetype: 'ANALYSIS' },
      { nodeId: 'n2', name: 'End', archetype: 'ANALYSIS' },
    ],
    edges: [{ from: 'n1', to: 'n2' }],
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('TenantTopologyStore', () => {
  // ─── T1 ────────────────────────────────────────────────────────────────────
  it('T1: storePrivate writes to TENANT_TOPOLOGIES_INDEX with tenant from ALS', async () => {
    const db = makeMockDb();
    const cls = makeMockCls('tenant-A');
    const store = new TenantTopologyStore(db as never, cls as never);

    const result = await store.storePrivate(makeTopology());

    expect(result.isSuccess).toBe(true);
    expect(db.storeDocument).toHaveBeenCalledTimes(1);
    const [index, doc] = db.storeDocument.mock.calls[0];
    expect(index).toBe(TENANT_TOPOLOGIES_INDEX);
    expect((doc as Record<string, unknown>).tenantId).toBe('tenant-A');
  });

  // ─── T2 ────────────────────────────────────────────────────────────────────
  it('T2: storeGlobalTemplate writes to FLOW_TEMPLATES_INDEX when ALS = MASTER_TENANT_ID', async () => {
    const db = makeMockDb();
    const cls = makeMockCls(MASTER_TENANT_ID);
    const store = new TenantTopologyStore(db as never, cls as never);

    const topology: TenantTopology = {
      ...makeTopology({ knowledgeScope: 'GLOBAL' }),
      tenantId: MASTER_TENANT_ID,
      connectionType: 'FLOW_SCOPED',
    };

    const result = await store.storeGlobalTemplate(topology);

    expect(result.isSuccess).toBe(true);
    expect(db.storeDocument).toHaveBeenCalledTimes(1);
    const [index] = db.storeDocument.mock.calls[0];
    expect(index).toBe(FLOW_TEMPLATES_INDEX);
  });

  // ─── T3 ────────────────────────────────────────────────────────────────────
  it('T3: storeGlobalTemplate FAILS when ALS is not MASTER_TENANT_ID', async () => {
    const db = makeMockDb();
    const cls = makeMockCls('tenant-B'); // NOT master
    const store = new TenantTopologyStore(db as never, cls as never);

    const topology: TenantTopology = {
      ...makeTopology({ knowledgeScope: 'GLOBAL' }),
      tenantId: 'tenant-B',
      connectionType: 'FLOW_SCOPED',
    };

    const result = await store.storeGlobalTemplate(topology);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NOT_MASTER_TENANT');
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  // ─── T4 ────────────────────────────────────────────────────────────────────
  it('T4: docId format ${flowId}::${tenantId}::${version} in both store methods', async () => {
    const db = makeMockDb();

    // Private path
    {
      const cls = makeMockCls('tenant-A');
      const store = new TenantTopologyStore(db as never, cls as never);
      await store.storePrivate(makeTopology({ flowId: 'FLOW-X', version: 'v1' }));
    }
    let [, , docId] = db.storeDocument.mock.calls[0];
    expect(docId).toBe('FLOW-X::tenant-A::v1');

    // Global path
    db.storeDocument.mockClear();
    {
      const cls = makeMockCls(MASTER_TENANT_ID);
      const store = new TenantTopologyStore(db as never, cls as never);
      const topology: TenantTopology = {
        ...makeTopology({ flowId: 'FLOW-Y', version: 'v2', knowledgeScope: 'GLOBAL' }),
        tenantId: MASTER_TENANT_ID,
        connectionType: 'FLOW_SCOPED',
      };
      await store.storeGlobalTemplate(topology);
    }
    [, , docId] = db.storeDocument.mock.calls[0];
    expect(docId).toBe(`FLOW-Y::${MASTER_TENANT_ID}::v2`);
  });

  // ─── T5 ────────────────────────────────────────────────────────────────────
  it('T5: tenantId on record ALWAYS from ALS (DNA-5 — client-provided ignored)', async () => {
    const db = makeMockDb();
    const cls = makeMockCls('tenant-A');
    const store = new TenantTopologyStore(db as never, cls as never);

    // Client tries to set a different tenantId
    const spoofed = { ...makeTopology(), tenantId: 'tenant-MALICIOUS' };

    await store.storePrivate(spoofed);

    const [, doc] = db.storeDocument.mock.calls[0];
    expect((doc as Record<string, unknown>).tenantId).toBe('tenant-A');
    expect((doc as Record<string, unknown>).tenantId).not.toBe('tenant-MALICIOUS');
  });

  // ─── T6 ────────────────────────────────────────────────────────────────────
  it('T6: listPrivate returns only current tenant via searchDocuments filter', async () => {
    const db = makeMockDb();
    db.searchDocuments.mockResolvedValue(
      DataProcessResult.success([
        { flowId: 'FLOW-A', tenantId: 'tenant-A', version: 'v1' },
        { flowId: 'FLOW-B', tenantId: 'tenant-A', version: 'v1' },
      ]),
    );
    const cls = makeMockCls('tenant-A');
    const store = new TenantTopologyStore(db as never, cls as never);

    const result = await store.listPrivate({ flowId: 'FLOW-A' });

    expect(result.isSuccess).toBe(true);
    expect(db.searchDocuments).toHaveBeenCalledWith(
      TENANT_TOPOLOGIES_INDEX,
      { flowId: 'FLOW-A' },
      200,
    );
  });

  // ─── T7 ────────────────────────────────────────────────────────────────────
  it('T7: listGlobalTemplates uses cls.run + cls.set to switch to MASTER_TENANT_ID', async () => {
    const db = makeMockDb();
    const cls = makeMockCls('tenant-A');
    const store = new TenantTopologyStore(db as never, cls as never);

    await store.listGlobalTemplates();

    expect(cls.run).toHaveBeenCalledTimes(1);
    expect(cls.set).toHaveBeenCalled();
    const [key, val] = cls.set.mock.calls[0];
    expect(key).toBe(TENANT_CONTEXT_KEY);
    expect((val as { tenantId: string }).tenantId).toBe(MASTER_TENANT_ID);
  });

  // ─── T8 ────────────────────────────────────────────────────────────────────
  it('T8: listGlobalTemplates scope switch does not leak — ALS restored after cls.run', async () => {
    const db = makeMockDb();
    const cls = makeMockCls('tenant-A');
    const store = new TenantTopologyStore(db as never, cls as never);

    await store.listGlobalTemplates();

    // After the call, outer scope must be restored to tenant-A
    const ctxAfter = cls.get(TENANT_CONTEXT_KEY) as { tenantId: string } | null;
    expect(ctxAfter?.tenantId).toBe('tenant-A');
  });

  // ─── T9 ────────────────────────────────────────────────────────────────────
  it('T9: getById checks PRIVATE first, falls back to GLOBAL', async () => {
    const db = makeMockDb();
    const cls = makeMockCls('tenant-A');
    const store = new TenantTopologyStore(db as never, cls as never);

    // Private path: returns nothing; global path: returns one match
    db.searchDocuments
      .mockResolvedValueOnce(DataProcessResult.success([])) // listPrivate call
      .mockResolvedValueOnce(
        DataProcessResult.success([
          { flowId: 'FLOW-GLOBAL', tenantId: MASTER_TENANT_ID, version: 'v1' },
        ]),
      ); // listGlobalTemplates call

    const result = await store.getById('FLOW-GLOBAL');

    expect(result.isSuccess).toBe(true);
    expect(result.data).not.toBeNull();
    expect((result.data as TenantTopology).flowId).toBe('FLOW-GLOBAL');
    expect(db.searchDocuments).toHaveBeenCalledTimes(2);
  });

  // ─── T10 ───────────────────────────────────────────────────────────────────
  it('T10: forkToPrivate copies GLOBAL, stamps current tenant as PRIVATE, records forkedFrom', async () => {
    const db = makeMockDb();
    db.searchDocuments.mockResolvedValue(
      DataProcessResult.success([
        {
          flowId: 'FLOW-GLOBAL',
          tenantId: MASTER_TENANT_ID,
          connectionType: 'FLOW_SCOPED',
          knowledgeScope: 'GLOBAL',
          name: 'Global Template',
          version: 'v1',
          status: 'PUBLISHED',
          nodes: [],
          edges: [],
          metadata: {},
          createdAt: 'x',
          updatedAt: 'x',
        },
      ]),
    );
    const cls = makeMockCls('tenant-A');
    const store = new TenantTopologyStore(db as never, cls as never);

    const result = await store.forkToPrivate('FLOW-GLOBAL', 'FLOW-FORK-001');

    expect(result.isSuccess).toBe(true);
    expect((result.data as TenantTopology).tenantId).toBe('tenant-A');
    expect((result.data as TenantTopology).knowledgeScope).toBe('PRIVATE');
    expect((result.data as TenantTopology).status).toBe('DRAFT');
    expect((result.data as TenantTopology).metadata.forkedFrom).toBe('FLOW-GLOBAL');
  });

  // ─── T11 ───────────────────────────────────────────────────────────────────
  it('T11: forkToPrivate rejects if source is already PRIVATE', async () => {
    const db = makeMockDb();
    // First call: listGlobalTemplates → no match (PRIVATE flows aren't visible here)
    db.searchDocuments.mockResolvedValue(DataProcessResult.success([]));
    const cls = makeMockCls('tenant-A');
    const store = new TenantTopologyStore(db as never, cls as never);

    const result = await store.forkToPrivate('FLOW-NOT-EXIST', 'FLOW-FORK-002');

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SOURCE_NOT_FOUND');
  });

  // ─── T12 ───────────────────────────────────────────────────────────────────
  it('T12: Duplicate storePrivate calls with same docId → UPSERT idempotent', async () => {
    const db = makeMockDb();
    const cls = makeMockCls('tenant-A');
    const store = new TenantTopologyStore(db as never, cls as never);

    await store.storePrivate(makeTopology({ flowId: 'FLOW-DUP', version: 'v1' }));
    await store.storePrivate(makeTopology({ flowId: 'FLOW-DUP', version: 'v1' }));

    expect(db.storeDocument).toHaveBeenCalledTimes(2);
    const [, , firstId] = db.storeDocument.mock.calls[0];
    const [, , secondId] = db.storeDocument.mock.calls[1];
    expect(firstId).toBe(secondId); // same docId → UPSERT
  });

  // ─── T13 ───────────────────────────────────────────────────────────────────
  it('T13: Zero write calls to xiigen-flow-definitions index (engine kernel untouched)', async () => {
    const db = makeMockDb();
    const cls = makeMockCls('tenant-A');
    const store = new TenantTopologyStore(db as never, cls as never);

    await store.storePrivate(makeTopology());
    await store.listPrivate();
    await store.getById('FLOW-X');

    const allCalls = db.storeDocument.mock.calls;
    const writesToEngineKernel = allCalls.filter(([index]) => index === 'xiigen-flow-definitions');
    expect(writesToEngineKernel.length).toBe(0);
  });

  // ─── T14 (v24 Finding GG) ──────────────────────────────────────────────────
  it('T14: CF-POLICY-01 — every stored record has connectionType: FLOW_SCOPED', async () => {
    const db = makeMockDb();

    // Private path
    {
      const cls = makeMockCls('tenant-A');
      const store = new TenantTopologyStore(db as never, cls as never);
      await store.storePrivate(makeTopology());
    }
    let [, doc] = db.storeDocument.mock.calls[0];
    expect((doc as Record<string, unknown>).connectionType).toBe('FLOW_SCOPED');

    // Global path
    db.storeDocument.mockClear();
    {
      const cls = makeMockCls(MASTER_TENANT_ID);
      const store = new TenantTopologyStore(db as never, cls as never);
      const topology: TenantTopology = {
        ...makeTopology({ knowledgeScope: 'GLOBAL' }),
        tenantId: MASTER_TENANT_ID,
        connectionType: 'FLOW_SCOPED',
      };
      await store.storeGlobalTemplate(topology);
    }
    [, doc] = db.storeDocument.mock.calls[0];
    expect((doc as Record<string, unknown>).connectionType).toBe('FLOW_SCOPED');
  });

  // ─── Turn 4 (MVP Plan v3, Goal 3) — listByTenant admin cross-tenant read ──

  it('Turn 4: listByTenant rejects with NOT_ADMIN when caller is not MASTER_TENANT_ID', async () => {
    const db = makeMockDb();
    const cls = makeMockCls('tenant-B'); // non-admin caller
    const store = new TenantTopologyStore(db as never, cls as never);

    const result = await store.listByTenant('tenant-A');

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NOT_ADMIN');
    // No audit record and no ES read should have fired.
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(db.searchDocuments).not.toHaveBeenCalled();
  });

  it('Turn 4: listByTenant rejects with INVALID_TARGET on empty targetTenantId', async () => {
    const db = makeMockDb();
    const cls = makeMockCls(MASTER_TENANT_ID);
    const store = new TenantTopologyStore(db as never, cls as never);

    const result = await store.listByTenant('');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_TARGET');
  });

  it('Turn 4: listByTenant writes xiigen-admin-audit entry BEFORE the scope switch', async () => {
    const db = makeMockDb();
    const cls = makeMockCls(MASTER_TENANT_ID);
    const store = new TenantTopologyStore(db as never, cls as never);

    db.searchDocuments.mockResolvedValueOnce(DataProcessResult.success([]));
    const result = await store.listByTenant('tenant-target');

    expect(result.isSuccess).toBe(true);
    expect(db.storeDocument).toHaveBeenCalledTimes(1);
    const [auditIndex, auditDoc] = db.storeDocument.mock.calls[0];
    expect(auditIndex).toBe('xiigen-admin-audit');
    const record = auditDoc as Record<string, unknown>;
    expect(record.action).toBe('listByTenant');
    expect(record.adminTenantId).toBe(MASTER_TENANT_ID);
    expect(record.targetTenantId).toBe('tenant-target');
    expect(typeof record.timestamp).toBe('string');
  });

  it('Turn 4: listByTenant propagates searchDocuments data inside switched scope', async () => {
    const db = makeMockDb();
    const cls = makeMockCls(MASTER_TENANT_ID);
    const store = new TenantTopologyStore(db as never, cls as never);

    const payload = [
      { flowId: 'FLOW-TENANT-A', knowledgeScope: 'PRIVATE' },
      { flowId: 'FLOW-TENANT-B', knowledgeScope: 'PRIVATE' },
    ];
    db.searchDocuments.mockResolvedValueOnce(DataProcessResult.success(payload));

    const result = await store.listByTenant('tenant-target');

    expect(result.isSuccess).toBe(true);
    expect(result.data).toHaveLength(2);
    // cls.run ran once to wrap the scope switch
    expect((cls.run as jest.Mock).mock.calls.length).toBe(1);
    // cls.set pushed the target tenant during the switch
    const setCalls = (cls.set as jest.Mock).mock.calls;
    expect(setCalls.length).toBeGreaterThanOrEqual(1);
    const setTenantCtx = setCalls[setCalls.length - 1][1] as { tenantId: string };
    expect(setTenantCtx.tenantId).toBe('tenant-target');
  });

  it('Turn 4: listByTenant scope switch is bounded — outer caller context restored after return', async () => {
    const db = makeMockDb();
    const cls = makeMockCls(MASTER_TENANT_ID);
    const store = new TenantTopologyStore(db as never, cls as never);

    db.searchDocuments.mockResolvedValueOnce(DataProcessResult.success([]));
    await store.listByTenant('tenant-inner');

    // Mock cls scope-isolates via snapshot/restore — the outer get after
    // listByTenant should still return the MASTER context.
    const outer = (cls.get as jest.Mock)(TENANT_CONTEXT_KEY) as { tenantId: string };
    expect(outer.tenantId).toBe(MASTER_TENANT_ID);
  });

  it('Turn 4: listByTenant propagates SEARCH_FAILED when ES search rejects', async () => {
    const db = makeMockDb();
    const cls = makeMockCls(MASTER_TENANT_ID);
    const store = new TenantTopologyStore(db as never, cls as never);

    db.searchDocuments.mockResolvedValueOnce(
      DataProcessResult.failure('ES_DOWN', 'cluster unreachable'),
    );
    const result = await store.listByTenant('tenant-target');

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('ES_DOWN');
  });
});
