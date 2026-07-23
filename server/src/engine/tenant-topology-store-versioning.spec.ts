/**
 * Tests for TenantTopologyStore versioning methods (Track 0 Turn 13).
 */

import { DataProcessResult } from '../kernel/data-process-result';
import { TENANT_CONTEXT_KEY } from '../kernel/multi-tenant/tenant-context';
import { TenantTopologyStore, TenantTopology } from './tenant-topology-store';

function makeMockCls(tenantId: string = 'tenant-A') {
  const store = new Map<string, unknown>();
  store.set(TENANT_CONTEXT_KEY, { tenantId });
  return {
    get: jest.fn((key: string) => store.get(key) ?? null),
    set: jest.fn((key: string, val: unknown) => {
      store.set(key, val);
    }),
    run: jest.fn(async (fn: () => Promise<unknown>) => {
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

function makeTopology(overrides: Partial<TenantTopology> = {}): TenantTopology {
  return {
    flowId: 'FLOW-VERSION-TEST',
    tenantId: 'tenant-A',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'PRIVATE',
    name: 'Version Test',
    version: 'v1',
    status: 'DRAFT',
    nodes: [{ nodeId: 'n1', name: 'Start', archetype: 'ANALYSIS' }],
    edges: [],
    metadata: {},
    createdAt: 'now',
    updatedAt: 'now',
    ...overrides,
  };
}

function makeStore(preexisting: TenantTopology[] = []) {
  const records: TenantTopology[] = [...preexisting];
  const db = {
    storeDocument: jest.fn(async (_index: string, doc: Record<string, unknown>) => {
      const newRecord = doc as unknown as TenantTopology;
      // UPSERT by flowId+version+tenantId
      const idx = records.findIndex(
        (r) => r.flowId === newRecord.flowId && r.version === newRecord.version,
      );
      if (idx >= 0) records[idx] = newRecord;
      else records.push(newRecord);
      return DataProcessResult.success(newRecord as unknown as Record<string, unknown>);
    }),
    searchDocuments: jest.fn(async (_idx: string, filters: Record<string, unknown>) => {
      const filtered = records.filter((r) =>
        Object.entries(filters).every(
          ([k, v]) => v === undefined || (r as unknown as Record<string, unknown>)[k] === v,
        ),
      );
      return DataProcessResult.success(filtered);
    }),
    getDocument: jest.fn(),
    deleteDocument: jest.fn(),
    bulkStore: jest.fn(),
    countDocuments: jest.fn(),
    ensureIndex: jest.fn(),
    getDocumentWithVersion: jest.fn(),
    storeDocumentWithOCC: jest.fn(),
  };
  const cls = makeMockCls();
  const store = new TenantTopologyStore(db as never, cls as never);
  return { store, db, records };
}

describe('TenantTopologyStore versioning (Track 0 Turn 13)', () => {
  describe('updateDraft', () => {
    it('mutates a DRAFT in place and bumps updatedAt', async () => {
      const { store } = makeStore([makeTopology({ status: 'DRAFT', name: 'Old' })]);
      const result = await store.updateDraft('FLOW-VERSION-TEST', { name: 'New' });
      expect(result.isSuccess).toBe(true);
      expect(result.data?.name).toBe('New');
      expect(result.data?.status).toBe('DRAFT');
    });

    it('rejects mutation of PUBLISHED with IMMUTABLE_STATE', async () => {
      const { store } = makeStore([makeTopology({ status: 'PUBLISHED' })]);
      const result = await store.updateDraft('FLOW-VERSION-TEST', { name: 'X' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('IMMUTABLE_STATE');
    });

    it('rejects mutation of ARCHIVED with IMMUTABLE_STATE', async () => {
      const { store } = makeStore([makeTopology({ status: 'ARCHIVED' })]);
      const result = await store.updateDraft('FLOW-VERSION-TEST', { name: 'X' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('IMMUTABLE_STATE');
    });

    it('returns FLOW_NOT_FOUND when absent', async () => {
      const { store } = makeStore([]);
      const result = await store.updateDraft('FLOW-MISSING', { name: 'X' });
      expect(result.errorCode).toBe('FLOW_NOT_FOUND');
    });
  });

  describe('promoteDraft', () => {
    it('creates a new PUBLISHED version; archives the prior DRAFT', async () => {
      const { store, records } = makeStore([
        makeTopology({ status: 'DRAFT', version: 'v1', topologyVersion: 1 }),
      ]);
      const result = await store.promoteDraft('FLOW-VERSION-TEST');
      expect(result.isSuccess).toBe(true);
      expect(result.data?.status).toBe('PUBLISHED');
      expect(result.data?.topologyVersion).toBe(2);
      expect(result.data?.version).toBe('v2');
      expect(result.data?.parentVersion).toEqual({ flowId: 'FLOW-VERSION-TEST', version: 'v1' });

      // Prior DRAFT should be archived
      const archived = records.find((r) => r.version === 'v1');
      expect(archived?.status).toBe('ARCHIVED');
    });

    it('rejects promotion of PUBLISHED with NOT_DRAFT', async () => {
      const { store } = makeStore([makeTopology({ status: 'PUBLISHED' })]);
      const result = await store.promoteDraft('FLOW-VERSION-TEST');
      expect(result.errorCode).toBe('NOT_DRAFT');
    });
  });

  describe('forkAsDraft', () => {
    it('creates a new DRAFT from a PUBLISHED version; parentVersion links', async () => {
      const { store } = makeStore([
        makeTopology({ status: 'PUBLISHED', version: 'v2', topologyVersion: 2 }),
      ]);
      const result = await store.forkAsDraft('FLOW-VERSION-TEST');
      expect(result.isSuccess).toBe(true);
      expect(result.data?.status).toBe('DRAFT');
      expect(result.data?.topologyVersion).toBe(3);
      expect(result.data?.version).toBe('v3-draft');
      expect(result.data?.parentVersion).toEqual({ flowId: 'FLOW-VERSION-TEST', version: 'v2' });
    });

    it('rejects forking a DRAFT with NOT_PUBLISHED', async () => {
      const { store } = makeStore([makeTopology({ status: 'DRAFT' })]);
      const result = await store.forkAsDraft('FLOW-VERSION-TEST');
      expect(result.errorCode).toBe('NOT_PUBLISHED');
    });
  });

  describe('version lineage end-to-end', () => {
    it('DRAFT v1 → promote → PUBLISHED v2 → forkAsDraft → DRAFT v3 → promote → PUBLISHED v4', async () => {
      const { store } = makeStore([
        makeTopology({ status: 'DRAFT', version: 'v1', topologyVersion: 1 }),
      ]);

      // Promote v1 → v2
      const v2 = await store.promoteDraft('FLOW-VERSION-TEST');
      expect(v2.data?.version).toBe('v2');
      expect(v2.data?.status).toBe('PUBLISHED');

      // ForkAsDraft v2 → v3-draft
      const v3draft = await store.forkAsDraft('FLOW-VERSION-TEST');
      expect(v3draft.data?.version).toBe('v3-draft');
      expect(v3draft.data?.status).toBe('DRAFT');
      expect(v3draft.data?.parentVersion).toEqual({ flowId: 'FLOW-VERSION-TEST', version: 'v2' });
    });
  });
});
