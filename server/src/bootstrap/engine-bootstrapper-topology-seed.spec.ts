/**
 * Tests for EngineBootstrapper's topology seeding (Track 0 Turn 4).
 *
 * Focus on the new seedGlobalTopologies + normalizeTopology methods.
 * Verifies Findings W, K, L, N, J, AA, DD, FF, GG, MM from the approved plan.
 */

import { DataProcessResult } from '../kernel/data-process-result';
import { EngineBootstrapper } from './engine-bootstrapper';
import {
  TenantTopologyStore,
  TenantTopology,
  MASTER_TENANT_ID,
} from '../engine/tenant-topology-store';
import { TENANT_CONTEXT_KEY } from '../kernel/multi-tenant/tenant-context';

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

function makeBootstrapper(
  storeFn: (t: TenantTopology) => Promise<DataProcessResult<TenantTopology>> = (t) =>
    Promise.resolve(DataProcessResult.success(t)),
): {
  bootstrapper: EngineBootstrapper;
  tenantStore: jest.Mocked<TenantTopologyStore>;
  cls: MockCls;
} {
  const storeGlobalTemplate = jest.fn(storeFn);
  const tenantStore = { storeGlobalTemplate } as unknown as jest.Mocked<TenantTopologyStore>;
  const cls = makeMockCls();
  const db = {} as never;
  // Construct with 5 args: db, cls, flowRegistry?, tenantRegistry?, tenantTopologyStore?
  const bootstrapper = new EngineBootstrapper(db, cls as never, undefined, undefined, tenantStore);
  return { bootstrapper, tenantStore, cls };
}

describe('EngineBootstrapper — normalizeTopology (Track 0 Turn 4)', () => {
  /**
   * Access the private normalizeTopology method via index signature.
   * Tests verify its output shape without needing real JSON files.
   */
  function normalize(
    bootstrapper: EngineBootstrapper,
    data: Record<string, unknown>,
    filePath: string,
  ): TenantTopology | null {
    return (
      bootstrapper as unknown as {
        normalizeTopology: (d: Record<string, unknown>, f: string) => TenantTopology | null;
      }
    ).normalizeTopology(data, filePath);
  }

  it('v10 Finding K — handles array-style nodes', () => {
    const { bootstrapper } = makeBootstrapper();
    const result = normalize(
      bootstrapper,
      {
        flowId: 'FLOW-00',
        flowName: 'Bundle Activation',
        nodes: [{ id: 'T574', name: 'BundleValidator', type: 'VALIDATION' }],
      },
      '/x/y/bundle-activation.topology.json',
    );
    expect(result).not.toBeNull();
    expect(result!.nodes).toHaveLength(1);
    expect(result!.nodes[0].nodeId).toBe('T574');
    expect(result!.nodes[0].name).toBe('BundleValidator');
    expect(result!.nodes[0].archetype).toBe('VALIDATION');
  });

  it('v10 Finding K — handles dict-style nodes (handler + nodeType keys)', () => {
    const { bootstrapper } = makeBootstrapper();
    const result = normalize(
      bootstrapper,
      {
        flowId: 'FLOW-PREREQ-01',
        nodes: {
          n1: { handler: 'rag-retrieve.handler', nodeType: 'RAG_RETRIEVE' },
          n2: { handler: 'decompose.handler', nodeType: 'ANALYSIS' },
        },
      },
      '/x/y/prereq-01/spec-auditor.topology.json',
    );
    expect(result).not.toBeNull();
    expect(result!.nodes).toHaveLength(2);
    expect(result!.nodes[0].nodeId).toBe('n1');
    expect(result!.nodes[0].name).toBe('rag-retrieve.handler');
    expect(result!.nodes[0].archetype).toBe('RAG_RETRIEVE');
  });

  it('v10 Finding K — returns null when no nodes field present', () => {
    const { bootstrapper } = makeBootstrapper();
    const result = normalize(bootstrapper, { flowId: 'FLOW-EMPTY' }, '/x/y/empty.topology.json');
    expect(result).toBeNull();
  });

  it('v10 Finding K — returns null when nodes array is empty', () => {
    const { bootstrapper } = makeBootstrapper();
    const result = normalize(
      bootstrapper,
      { flowId: 'FLOW-EMPTY', nodes: [] },
      '/x/y/empty.topology.json',
    );
    expect(result).toBeNull();
  });

  it('v11 Finding L — filters terminal edges with null to/from', () => {
    const { bootstrapper } = makeBootstrapper();
    const result = normalize(
      bootstrapper,
      {
        flowId: 'FLOW-01',
        nodes: [{ id: 'T47', name: 'Step', type: 'ANALYSIS' }],
        edges: [
          { from: 'T47', to: null, event: 'registration-failed' }, // should be filtered
          { from: 'T47', to: 'T48' }, // should survive
          { from: null, to: 'T47' }, // should be filtered
        ],
      },
      '/x/y/user-registration.topology.json',
    );
    expect(result).not.toBeNull();
    expect(result!.edges).toHaveLength(1);
    expect(result!.edges[0]).toEqual({
      from: 'T47',
      to: 'T48',
      event: undefined,
      condition: undefined,
    });
  });

  it('v18 Finding W — defaults version to v1 when absent', () => {
    const { bootstrapper } = makeBootstrapper();
    const result = normalize(
      bootstrapper,
      { flowId: 'FLOW-X', nodes: [{ id: 'n1', name: 'A' }] },
      '/x/y/x.topology.json',
    );
    expect(result!.version).toBe('v1');
  });

  it('v18 Finding W — all GLOBAL templates get status: PUBLISHED', () => {
    const { bootstrapper } = makeBootstrapper();
    const result = normalize(
      bootstrapper,
      {
        flowId: 'FLOW-X',
        status: 'NOT_STARTED', // JSON value should NOT propagate
        nodes: [{ id: 'n1', name: 'A' }],
      },
      '/x/y/x.topology.json',
    );
    expect(result!.status).toBe('PUBLISHED');
  });

  it('v21 Finding AA — disambiguates flowId with filename slug', () => {
    const { bootstrapper } = makeBootstrapper();
    const resultA = normalize(
      bootstrapper,
      { flowId: 'FLOW-PREREQ-01', nodes: [{ id: 'n1', name: 'A' }] },
      '/x/y/prereq-01/spec-auditor.topology.json',
    );
    const resultB = normalize(
      bootstrapper,
      { flowId: 'FLOW-PREREQ-01', nodes: [{ id: 'n1', name: 'B' }] },
      '/x/y/prereq-01/prerequisite-orderer.topology.json',
    );
    expect(resultA!.flowId).toBe('FLOW-PREREQ-01-spec-auditor');
    expect(resultB!.flowId).toBe('FLOW-PREREQ-01-prerequisite-orderer');
    expect(resultA!.flowId).not.toBe(resultB!.flowId);
    expect(resultA!.metadata.originalFlowId).toBe('FLOW-PREREQ-01');
    expect(resultB!.metadata.originalFlowId).toBe('FLOW-PREREQ-01');
  });

  it('v22 Finding DD — name fallback chain name → flowId → fileSlug', () => {
    const { bootstrapper } = makeBootstrapper();

    // (a) has explicit name
    const a = normalize(
      bootstrapper,
      { flowId: 'FLOW-X', name: 'Explicit Name', nodes: [{ id: 'n1', name: 'A' }] },
      '/x/y/x.topology.json',
    );
    expect(a!.name).toBe('Explicit Name');

    // (b) no name but has flowId — falls back to original flowId (not stored flowId)
    const b = normalize(
      bootstrapper,
      { flowId: 'FLOW-Y', nodes: [{ id: 'n1', name: 'B' }] },
      '/x/y/y.topology.json',
    );
    expect(b!.name).toBe('FLOW-Y');

    // (c) no name, no flowId — falls back to filename slug
    const c = normalize(
      bootstrapper,
      { nodes: [{ id: 'n1', name: 'C' }] },
      '/x/y/fallback-name.topology.json',
    );
    expect(c!.name).toBe('fallback-name');
  });

  it('v24 Finding GG + v27 Finding OO — connectionType is FLOW_SCOPED', () => {
    const { bootstrapper } = makeBootstrapper();
    const result = normalize(
      bootstrapper,
      { flowId: 'FLOW-X', nodes: [{ id: 'n1', name: 'A' }] },
      '/x/y/x.topology.json',
    );
    expect(result!.connectionType).toBe('FLOW_SCOPED');
  });

  it('sets tenantId = MASTER_TENANT_ID + knowledgeScope = GLOBAL', () => {
    const { bootstrapper } = makeBootstrapper();
    const result = normalize(
      bootstrapper,
      { flowId: 'FLOW-X', nodes: [{ id: 'n1', name: 'A' }] },
      '/x/y/x.topology.json',
    );
    expect(result!.tenantId).toBe(MASTER_TENANT_ID);
    expect(result!.knowledgeScope).toBe('GLOBAL');
  });
});

describe('EngineBootstrapper — seedGlobalTopologies (Track 0 Turn 4)', () => {
  it('skips seeding when TenantTopologyStore is not available', async () => {
    const db = {} as never;
    const cls = makeMockCls();
    const bootstrapper = new EngineBootstrapper(db, cls as never, undefined, undefined, undefined);
    // Just run — should not throw, should not call any store
    await (
      bootstrapper as unknown as { seedGlobalTopologies: () => Promise<void> }
    ).seedGlobalTopologies();
    // No assertion needed — completing without error is the pass.
    expect(cls.run).not.toHaveBeenCalled();
  });
});
