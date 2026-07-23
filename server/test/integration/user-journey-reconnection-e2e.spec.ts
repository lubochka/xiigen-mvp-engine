/**
 * Track 0 Turn 10 — Integration Test Part A.
 *
 * End-to-end verification: CycleChainOutput → TopologyPublisher → TenantTopologyStore
 * → FlowDefinitionsController → TopologyController bridge → TopologyResponseMapper output.
 *
 * Using an in-memory IDatabaseService mock + a real ClsService to exercise
 * the CLS scope switch path without ES.
 *
 * Verifies:
 *   v17 Finding V — two runs with same userIntent produce TWO library entries (version='v1', flowId differs)
 *   v19 Finding Y — userIntent propagates to TenantTopology.name (not opaque flowId)
 *   v16 Finding U — TopologyController response has `description` field on every node
 *   v24 Finding GG — stored records have connectionType: 'FLOW_SCOPED'
 */

import { ClsService, ClsServiceManager } from 'nestjs-cls';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../src/kernel/multi-tenant/tenant-context';
import { TenantTopologyStore } from '../../src/engine/tenant-topology-store';
import { TopologyPublisher } from '../../src/engine/topology-publisher';
import { FlowDefinitionsController } from '../../src/api/flow-definitions.controller';
import { FlowDefinitionsMapper, ClientFlowSummary } from '../../src/api/flow-definitions.mapper';
import { TopologyController } from '../../src/api/topology.controller';
import {
  TopologyResponseMapper,
  TopologyContractResponse,
} from '../../src/api/topology-response.mapper';
import type { CycleChainOutput } from '../../src/engine/cycle-chain.service';

// In-memory DB — simulates the production ES provider's per-tenant physical
// index naming (${tenantId}_${indexName}) so tenant isolation is enforced
// exactly as production does. We read tenantId from CLS just like the real
// provider does.
function makeInMemoryDb(clsRef: () => ClsService) {
  const indices = new Map<string, Map<string, Record<string, unknown>>>();

  function physicalIndexName(logicalIndex: string): string {
    const cls = clsRef();
    const ctx = cls.get<TenantContext>(TENANT_CONTEXT_KEY);
    const tenantId = ctx?.tenantId ?? 'default';
    return `${tenantId}_${logicalIndex}`;
  }

  function getIndex(physicalName: string): Map<string, Record<string, unknown>> {
    let idx = indices.get(physicalName);
    if (!idx) {
      idx = new Map();
      indices.set(physicalName, idx);
    }
    return idx;
  }

  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, docId?: string) => {
      const physical = physicalIndexName(index);
      const key = docId ?? String(Math.random());
      getIndex(physical).set(key, { ...doc });
      return DataProcessResult.success({ ...doc, _id: key });
    }),
    searchDocuments: jest.fn(
      async (index: string, filters: Record<string, unknown>, _size?: number) => {
        const physical = physicalIndexName(index);
        const all = Array.from(getIndex(physical).values());
        const filtered = all.filter((d) =>
          Object.entries(filters).every(([k, v]) => v === undefined || d[k] === v),
        );
        return DataProcessResult.success(filtered);
      },
    ),
    getDocument: jest.fn(async (index: string, docId: string) => {
      return DataProcessResult.success(getIndex(physicalIndexName(index)).get(docId) ?? null);
    }),
    deleteDocument: jest.fn(async () => DataProcessResult.success(true)),
    bulkStore: jest.fn(async () => DataProcessResult.success({ stored: 0, failed: 0 })),
    countDocuments: jest.fn(async () => DataProcessResult.success(0)),
    ensureIndex: jest.fn(async () => {}),
    getDocumentWithVersion: jest.fn(async () => DataProcessResult.success(null)),
    storeDocumentWithOCC: jest.fn(async () => DataProcessResult.success({})),
    __indices: indices, // for test introspection
  };
}

function makeCycleChainOutput(overrides: Partial<CycleChainOutput> = {}): CycleChainOutput {
  return {
    runId: `run-${Math.random().toString(36).slice(2, 10)}`,
    flowId: `FLOW-CHAIN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    grade: 9,
    totalCostUsd: 0.03,
    planSteps: [],
    leafNodes: [],
    topology: [
      { stepText: 'Accept credentials', verdict: 'LEAF', depth: 0, children: [] },
      { stepText: 'Validate input', verdict: 'LEAF', depth: 0, children: [] },
      { stepText: 'Emit event', verdict: 'LEAF', depth: 0, children: [] },
    ],
    cycles: {} as never,
    pendingImplementations: [],
    status: 'COMPLETE',
    subFlows: [],
    suspensions: [],
    cycleTraces: [],
    ...overrides,
  } as unknown as CycleChainOutput;
}

function makeTenantContext(tenantId: string): TenantContext {
  const now = new Date().toISOString();
  return new TenantContext({
    id: tenantId,
    name: tenantId,
    status: 'active',
    plan: { name: 'free', maxApiCallsPerMinute: 60, maxTokensPerDay: 100_000, maxStorageMb: 500 },
    configOverrides: {},
    apiKeys: {},
    createdAt: now,
    updatedAt: now,
  });
}

async function runInTenant<T>(cls: ClsService, tenantId: string, fn: () => Promise<T>): Promise<T> {
  return cls.run(async () => {
    cls.set(TENANT_CONTEXT_KEY, makeTenantContext(tenantId));
    return fn();
  });
}

describe('Track 0 Turn 10 — User Journey Reconnection integration', () => {
  let cls: ClsService;
  let db: ReturnType<typeof makeInMemoryDb>;
  let store: TenantTopologyStore;
  let publisher: TopologyPublisher;
  let flowDefMapper: FlowDefinitionsMapper;
  let flowDefCtrl: FlowDefinitionsController;
  let topoMapper: TopologyResponseMapper;
  let topoCtrl: TopologyController;

  beforeEach(() => {
    cls = ClsServiceManager.getClsService();
    db = makeInMemoryDb(() => cls);
    store = new TenantTopologyStore(db as never, cls);
    publisher = new TopologyPublisher(store);
    flowDefMapper = new FlowDefinitionsMapper();
    flowDefCtrl = new FlowDefinitionsController(store, flowDefMapper);
    topoMapper = new TopologyResponseMapper();
    // TopologyController requires TopologyStore + db + optional tenantStore + optional mapper
    topoCtrl = new TopologyController(
      { listTopologies: jest.fn().mockResolvedValue(DataProcessResult.success([])) } as never,
      db as never,
      store,
      topoMapper,
    );
  });

  it('v19 Finding Y — publish carries userIntent as human-readable name', async () => {
    const output = makeCycleChainOutput();

    await runInTenant(cls, 'tenant-A', async () => {
      const publishResult = await publisher.publish(output, 'Build a user registration system');
      expect(publishResult.isSuccess).toBe(true);

      const listResponse = (await flowDefCtrl.list('private')) as { flows: ClientFlowSummary[] };
      expect(listResponse.flows).toHaveLength(1);
      expect(listResponse.flows[0].name).toBe('Build a user registration system');
      expect(listResponse.flows[0].name).not.toBe(output.flowId);
    });
  });

  it('v17 Finding V — two runs with same userIntent create TWO library entries', async () => {
    await runInTenant(cls, 'tenant-B', async () => {
      // Run 1
      await publisher.publish(makeCycleChainOutput(), 'Build a payment system');
      // Run 2 (same intent, different runId → different flowId)
      await publisher.publish(makeCycleChainOutput(), 'Build a payment system');

      const listResponse = (await flowDefCtrl.list('private')) as { flows: ClientFlowSummary[] };
      expect(listResponse.flows).toHaveLength(2);
      // Both have the same display name (same intent) but different flowIds
      expect(new Set(listResponse.flows.map((f) => f.name))).toEqual(
        new Set(['Build a payment system']),
      );
      expect(listResponse.flows[0].flow_id).not.toBe(listResponse.flows[1].flow_id);
      // Both use version='v1' per Finding V MVP lock
      expect(listResponse.flows.every((f) => f.version === 'v1')).toBe(true);
    });
  });

  it('TopologyController bridge returns mapped TenantTopology (Finding U description fallback)', async () => {
    const output = makeCycleChainOutput({ flowId: 'FLOW-BRIDGE-TEST' });

    await runInTenant(cls, 'tenant-C', async () => {
      await publisher.publish(output, 'Bridge test flow');

      const topo = (await topoCtrl.getTopology('FLOW-BRIDGE-TEST')) as TopologyContractResponse;
      expect(topo.flowId).toBe('FLOW-BRIDGE-TEST');
      expect(topo.version).toBe('v1');
      // v16 Finding U — every node has a description (node.name fallback)
      expect(
        topo.nodes.every((n) => typeof n.description === 'string' && n.description.length > 0),
      ).toBe(true);
      // Runtime read fields present
      expect(topo.nodes.every((n) => n.id && n.name && n.type)).toBe(true);
    });
  });

  it('v24 Finding GG — stored records have connectionType: FLOW_SCOPED', async () => {
    await runInTenant(cls, 'tenant-D', async () => {
      await publisher.publish(makeCycleChainOutput(), 'Test CF-POLICY-01');

      // Inspect the in-memory index directly — per-tenant physical index naming
      const tenantIndex = db.__indices.get('tenant-D_xiigen-tenant-topologies');
      expect(tenantIndex).toBeDefined();
      const records = Array.from(tenantIndex!.values());
      expect(records.length).toBe(1);
      expect(records[0].connectionType).toBe('FLOW_SCOPED');
    });
  });

  it('Tenant isolation — tenant-A flows invisible to tenant-B', async () => {
    await runInTenant(cls, 'tenant-A', async () => {
      await publisher.publish(makeCycleChainOutput(), 'Tenant A flow');
    });

    const aResponse = await runInTenant(cls, 'tenant-A', async () => {
      return flowDefCtrl.list('private');
    });
    expect((aResponse as { flows: ClientFlowSummary[] }).flows).toHaveLength(1);

    const bResponse = await runInTenant(cls, 'tenant-B', async () => {
      return flowDefCtrl.list('private');
    });
    expect((bResponse as { flows: ClientFlowSummary[] }).flows).toHaveLength(0);
  });
});
