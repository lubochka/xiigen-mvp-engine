/**
 * Tests for FlowDefinitionsController (Track 0 Turn 5).
 *
 * Covers all 5 routes:
 *   GET /api/flows/definitions                  list (private + global)
 *   GET /api/flows/definitions/:flowId          getById
 *   POST /api/flows/definitions                 save
 *   POST /api/flows/definitions/:flowId/fork    fork
 *   PUT  /api/flows/definitions/:flowId/nodes     updateNodes   (Turn 5)
 *   PUT  /api/flows/definitions/:flowId/freedom   setFreedomConfig (Turn 5)
 *
 * + error paths + DNA-5 overwrite + mapper round-trip.
 */

import { DataProcessResult } from '../kernel/data-process-result';
import { FlowDefinitionsController } from './flow-definitions.controller';
import { FlowDefinitionsMapper, ClientFlowDefinition } from './flow-definitions.mapper';
import { TenantTopology, TenantTopologyStore } from '../engine/tenant-topology-store';

function makeTopology(overrides: Partial<TenantTopology> = {}): TenantTopology {
  return {
    flowId: 'FLOW-TEST',
    tenantId: 'tenant-A',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'PRIVATE',
    name: 'Test Flow',
    version: 'v1',
    status: 'PUBLISHED',
    nodes: [{ nodeId: 'n1', name: 'Start', archetype: 'ANALYSIS' }],
    edges: [],
    metadata: {},
    createdAt: 'now',
    updatedAt: 'now',
    ...overrides,
  };
}

function makeCtrl(storeOverrides: Partial<jest.Mocked<TenantTopologyStore>> = {}): {
  ctrl: FlowDefinitionsController;
  store: jest.Mocked<TenantTopologyStore>;
} {
  const store = {
    listPrivate: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    listGlobalTemplates: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    getById: jest.fn().mockResolvedValue(DataProcessResult.success(null)),
    storePrivate: jest
      .fn()
      .mockImplementation((t) => Promise.resolve(DataProcessResult.success(t))),
    storeGlobalTemplate: jest.fn(),
    forkToPrivate: jest.fn(),
    ...storeOverrides,
  } as unknown as jest.Mocked<TenantTopologyStore>;
  const mapper = new FlowDefinitionsMapper();
  const ctrl = new FlowDefinitionsController(store, mapper);
  return { ctrl, store };
}

describe('FlowDefinitionsController — GET /', () => {
  it('returns empty list when no flows exist', async () => {
    const { ctrl } = makeCtrl();
    const res = await ctrl.list();
    expect(res).toEqual({ flows: [] });
  });

  it('merges private + global templates', async () => {
    const { ctrl } = makeCtrl({
      listPrivate: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success([
            makeTopology({ flowId: 'FLOW-PRIV', knowledgeScope: 'PRIVATE' }),
          ]),
        ),
      listGlobalTemplates: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success([
            makeTopology({ flowId: 'FLOW-GLOB', knowledgeScope: 'GLOBAL' }),
          ]),
        ),
    });
    const res = (await ctrl.list()) as {
      flows: Array<{ flow_id: string; knowledge_scope: string }>;
    };
    expect(res.flows).toHaveLength(2);
    expect(res.flows.map((f) => f.flow_id)).toEqual(['FLOW-PRIV', 'FLOW-GLOB']);
    expect(res.flows[0].knowledge_scope).toBe('PRIVATE');
    expect(res.flows[1].knowledge_scope).toBe('GLOBAL');
  });

  it('honors scope=private filter', async () => {
    const { ctrl, store } = makeCtrl({
      listPrivate: jest
        .fn()
        .mockResolvedValue(DataProcessResult.success([makeTopology({ flowId: 'FLOW-PRIV' })])),
    });
    await ctrl.list('private');
    expect(store.listPrivate).toHaveBeenCalled();
    expect(store.listGlobalTemplates).not.toHaveBeenCalled();
  });

  it('honors scope=global filter', async () => {
    const { ctrl, store } = makeCtrl();
    await ctrl.list('global');
    expect(store.listGlobalTemplates).toHaveBeenCalled();
    expect(store.listPrivate).not.toHaveBeenCalled();
  });

  it('returns error payload when listPrivate fails', async () => {
    const { ctrl } = makeCtrl({
      listPrivate: jest
        .fn()
        .mockResolvedValue(DataProcessResult.failure<never>('NO_TENANT', 'no tenant')),
    });
    const res = (await ctrl.list()) as { error: string; code: string };
    expect(res.code).toBe('NO_TENANT');
  });
});

describe('FlowDefinitionsController — GET /:flowId', () => {
  it('maps server topology to client definition', async () => {
    const topology = makeTopology({
      flowId: 'FLOW-X',
      nodes: [
        {
          nodeId: 'n1',
          name: 'Start',
          archetype: 'ANALYSIS',
          factoryId: 'F1',
          fabric: 'AI_ENGINE',
        },
      ],
      edges: [{ from: 'n1', to: 'n2', event: 'done' }],
    });
    const { ctrl } = makeCtrl({
      getById: jest.fn().mockResolvedValue(DataProcessResult.success(topology)),
    });
    const res = (await ctrl.getById('FLOW-X')) as ClientFlowDefinition;
    expect(res.flow_id).toBe('FLOW-X');
    expect(res.nodes[0].node_id).toBe('n1');
    expect(res.nodes[0].type).toBe('ANALYSIS');
    expect(res.nodes[0].factory_id).toBe('F1');
    expect(res.nodes[0].fabric_type).toBe('AI_ENGINE');
    expect(res.edges[0]).toEqual({ from: 'n1', to: 'n2', event: 'done', condition: undefined });
  });

  it('returns FLOW_NOT_FOUND when store returns null', async () => {
    const { ctrl } = makeCtrl({
      getById: jest.fn().mockResolvedValue(DataProcessResult.success(null)),
    });
    const res = (await ctrl.getById('FLOW-MISSING')) as { code: string };
    expect(res.code).toBe('FLOW_NOT_FOUND');
  });

  // ── Turn 3 (MVP Plan v3, Goal 2) ────────────────────────────────────────

  it('Turn 3: getById passes ?version query to store.getById', async () => {
    const { ctrl, store } = makeCtrl({
      getById: jest.fn().mockResolvedValue(DataProcessResult.success(makeTopology())),
    });
    await ctrl.getById('FLOW-X', 'v2');
    expect(store.getById).toHaveBeenCalledWith('FLOW-X', 'v2');
  });

  it('Turn 3: getById with no version calls store.getById(flowId, undefined)', async () => {
    const { ctrl, store } = makeCtrl({
      getById: jest.fn().mockResolvedValue(DataProcessResult.success(makeTopology())),
    });
    await ctrl.getById('FLOW-X');
    expect(store.getById).toHaveBeenCalledWith('FLOW-X', undefined);
  });

  it('Turn 3: getById version not found error includes version label', async () => {
    const { ctrl } = makeCtrl({
      getById: jest.fn().mockResolvedValue(DataProcessResult.success(null)),
    });
    const res = (await ctrl.getById('FLOW-X', 'v9')) as { error: string; code: string };
    expect(res.code).toBe('FLOW_NOT_FOUND');
    expect(res.error).toContain('v9');
  });
});

describe('FlowDefinitionsController — GET / with flowId + includeVersions (Turn 3)', () => {
  it('Turn 3: returns sorted versions array for a single flowId', async () => {
    const v1 = makeTopology({
      flowId: 'FLOW-X',
      version: 'v1',
      status: 'ARCHIVED',
      updatedAt: '2026-04-01T00:00:00Z',
    });
    const v2Draft = makeTopology({
      flowId: 'FLOW-X',
      version: 'v2-draft',
      status: 'DRAFT',
      updatedAt: '2026-04-05T00:00:00Z',
    });
    const v2 = makeTopology({
      flowId: 'FLOW-X',
      version: 'v2',
      status: 'PUBLISHED',
      updatedAt: '2026-04-10T00:00:00Z',
    });
    const { ctrl } = makeCtrl({
      listPrivate: jest.fn().mockResolvedValue(DataProcessResult.success([v1, v2Draft, v2])),
      listGlobalTemplates: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    });
    const res = (await ctrl.list('all', 'FLOW-X', 'true')) as {
      flows: Array<{ flow_id: string; version: string; status: string }>;
      versions: Array<{ flow_id: string; version: string; status: string }>;
    };
    // flows is returned unmodified (in store order). versions is sorted by
    // status-priority (PUBLISHED > DRAFT > ARCHIVED) then updated_at desc.
    expect(res.versions.map((v) => v.version)).toEqual(['v2', 'v2-draft', 'v1']);
  });

  it('Turn 3: list without includeVersions does NOT include versions field', async () => {
    const { ctrl } = makeCtrl({
      listPrivate: jest.fn().mockResolvedValue(DataProcessResult.success([makeTopology()])),
    });
    const res = (await ctrl.list()) as { flows: unknown[]; versions?: unknown[] };
    expect(res.versions).toBeUndefined();
    expect(Array.isArray(res.flows)).toBe(true);
  });

  it('Turn 3: includeVersions with no flowId is ignored (safety)', async () => {
    const { ctrl } = makeCtrl({
      listPrivate: jest.fn().mockResolvedValue(DataProcessResult.success([makeTopology()])),
    });
    // includeVersions=true without flowId → no versions field (safety guard).
    const res = (await ctrl.list('all', undefined, 'true')) as {
      flows: unknown[];
      versions?: unknown[];
    };
    expect(res.versions).toBeUndefined();
  });

  it('Turn 3: narrows listPrivate by flowId when flowId query is supplied', async () => {
    const { ctrl, store } = makeCtrl({
      listPrivate: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    });
    await ctrl.list('private', 'FLOW-TARGET', undefined);
    expect(store.listPrivate).toHaveBeenCalledWith({ flowId: 'FLOW-TARGET' });
  });

  it('Turn 3: filters globals by flowId client-side when flowId is supplied', async () => {
    const wanted = makeTopology({ flowId: 'FLOW-WANTED', knowledgeScope: 'GLOBAL' });
    const other = makeTopology({ flowId: 'FLOW-OTHER', knowledgeScope: 'GLOBAL' });
    const { ctrl } = makeCtrl({
      listGlobalTemplates: jest.fn().mockResolvedValue(DataProcessResult.success([wanted, other])),
    });
    const res = (await ctrl.list('global', 'FLOW-WANTED', undefined)) as {
      flows: Array<{ flow_id: string }>;
    };
    expect(res.flows.map((f) => f.flow_id)).toEqual(['FLOW-WANTED']);
  });
});

// ── Turn 5 (MVP Plan v3, Goal 4a) — PUT /nodes + PUT /freedom ───────────

describe('FlowDefinitionsController — PUT /:flowId/nodes (Turn 5)', () => {
  it('Turn 5: rejects missing body with MISSING_BODY', async () => {
    const { ctrl } = makeCtrl();
    const res = (await ctrl.updateNodes('FLOW-X', null as unknown as never)) as { code: string };
    expect(res.code).toBe('MISSING_BODY');
  });

  it('Turn 5: rejects missing nodes[] with MISSING_NODES', async () => {
    const { ctrl } = makeCtrl();
    const res = (await ctrl.updateNodes('FLOW-X', { edges: [] } as never)) as {
      code: string;
    };
    expect(res.code).toBe('MISSING_NODES');
  });

  it('Turn 5: delegates to store.updateDraft with translated nodes + edges', async () => {
    const topology = makeTopology({
      flowId: 'FLOW-X',
      nodes: [{ nodeId: 'n1', name: 'Start', archetype: 'ANALYSIS' }],
      edges: [],
    });
    const { ctrl, store } = makeCtrl();
    (store as unknown as { updateDraft: jest.Mock }).updateDraft = jest
      .fn()
      .mockResolvedValue(DataProcessResult.success(topology));
    const res = (await ctrl.updateNodes('FLOW-X', {
      nodes: [{ node_id: 'n1', type: 'ANALYSIS', name: 'Start' }],
      edges: [{ from: 'n1', to: 'n2', event: 'done' }],
    } as never)) as ClientFlowDefinition;
    expect(res.flow_id).toBe('FLOW-X');
    const updateDraft = (store as unknown as { updateDraft: jest.Mock }).updateDraft;
    expect(updateDraft).toHaveBeenCalledTimes(1);
    const patch = updateDraft.mock.calls[0][1];
    expect(patch.nodes).toHaveLength(1);
    expect(patch.nodes[0].nodeId).toBe('n1');
    expect(patch.nodes[0].archetype).toBe('ANALYSIS');
    expect(patch.edges).toHaveLength(1);
    expect(patch.edges[0].from).toBe('n1');
  });

  it('Turn 5: returns IMMUTABLE_STATE when store rejects non-DRAFT target', async () => {
    const { ctrl, store } = makeCtrl();
    (store as unknown as { updateDraft: jest.Mock }).updateDraft = jest
      .fn()
      .mockResolvedValue(
        DataProcessResult.failure('IMMUTABLE_STATE', 'Cannot mutate PUBLISHED topology'),
      );
    const res = (await ctrl.updateNodes('FLOW-X', {
      nodes: [{ node_id: 'n1' }],
    } as never)) as { code: string };
    expect(res.code).toBe('IMMUTABLE_STATE');
  });
});

describe('FlowDefinitionsController — PUT /:flowId/freedom (Turn 5)', () => {
  it('Turn 5: rejects body without freedomConfig object', async () => {
    const { ctrl } = makeCtrl();
    const res = (await ctrl.setFreedomConfig('FLOW-X', {} as never)) as {
      code: string;
    };
    expect(res.code).toBe('MISSING_FREEDOM_CONFIG');
  });

  it('Turn 5: returns FLOW_NOT_FOUND when the flow does not exist', async () => {
    const { ctrl } = makeCtrl({
      getById: jest.fn().mockResolvedValue(DataProcessResult.success(null)),
    });
    const res = (await ctrl.setFreedomConfig('FLOW-GONE', {
      freedomConfig: { key: 'value' },
    })) as { code: string };
    expect(res.code).toBe('FLOW_NOT_FOUND');
  });

  it('Turn 5: merges freedomConfig into metadata and calls updateDraft', async () => {
    const existing = makeTopology({
      flowId: 'FLOW-X',
      status: 'DRAFT',
      metadata: { existingKey: 'keep-me' },
    });
    const { ctrl, store } = makeCtrl({
      getById: jest.fn().mockResolvedValue(DataProcessResult.success(existing)),
    });
    (store as unknown as { updateDraft: jest.Mock }).updateDraft = jest
      .fn()
      .mockImplementation((_flowId, patch) =>
        Promise.resolve(DataProcessResult.success({ ...existing, metadata: patch.metadata })),
      );
    const res = (await ctrl.setFreedomConfig('FLOW-X', {
      freedomConfig: { temperature: 0.5, maxRetries: 3 },
    })) as ClientFlowDefinition;
    const updateDraft = (store as unknown as { updateDraft: jest.Mock }).updateDraft;
    const patch = updateDraft.mock.calls[0][1];
    expect(patch.metadata.existingKey).toBe('keep-me');
    expect(patch.metadata.freedomConfig).toEqual({ temperature: 0.5, maxRetries: 3 });
    expect(res.metadata?.freedomConfig).toBeDefined();
  });

  it('Turn 5: rejects FREEDOM update on PUBLISHED flow via IMMUTABLE_STATE', async () => {
    const existing = makeTopology({ flowId: 'FLOW-X', status: 'PUBLISHED' });
    const { ctrl, store } = makeCtrl({
      getById: jest.fn().mockResolvedValue(DataProcessResult.success(existing)),
    });
    (store as unknown as { updateDraft: jest.Mock }).updateDraft = jest
      .fn()
      .mockResolvedValue(DataProcessResult.failure('IMMUTABLE_STATE', 'Cannot mutate PUBLISHED'));
    const res = (await ctrl.setFreedomConfig('FLOW-X', {
      freedomConfig: {},
    })) as { code: string };
    expect(res.code).toBe('IMMUTABLE_STATE');
  });
});

describe('FlowDefinitionsController — POST /', () => {
  it('upserts a client-supplied definition', async () => {
    const { ctrl, store } = makeCtrl();
    const body: ClientFlowDefinition = {
      flow_id: 'FLOW-NEW',
      name: 'My Flow',
      version: 'v1',
      nodes: [{ node_id: 'n1', type: 'ANALYSIS', name: 'A' }],
      edges: [],
    };
    await ctrl.save(body);
    expect(store.storePrivate).toHaveBeenCalled();
    const stored = store.storePrivate.mock.calls[0][0];
    expect(stored.flowId).toBe('FLOW-NEW');
    expect(stored.nodes[0].nodeId).toBe('n1');
  });

  it('generates a flow_id when absent', async () => {
    const { ctrl, store } = makeCtrl();
    await ctrl.save({
      flow_id: undefined as unknown as string,
      name: 'X',
      version: 'v1',
      nodes: [{ node_id: 'n1' }],
      edges: [],
    });
    const stored = store.storePrivate.mock.calls[0][0];
    expect(stored.flowId).toMatch(/^FLOW-USER-[A-Z0-9]{8}$/);
  });

  it('returns error when body is missing', async () => {
    const { ctrl } = makeCtrl();
    const res = (await ctrl.save(null as unknown as ClientFlowDefinition)) as { code: string };
    expect(res.code).toBe('MISSING_BODY');
  });

  it('returns error when nodes array is missing', async () => {
    const { ctrl } = makeCtrl();
    const res = (await ctrl.save({
      flow_id: 'FLOW-X',
      name: 'X',
      version: 'v1',
      nodes: undefined as unknown as [],
      edges: [],
    })) as { code: string };
    expect(res.code).toBe('MISSING_NODES');
  });
});

describe('FlowDefinitionsController — POST /:flowId/fork', () => {
  it('delegates to forkToPrivate with a generated newFlowId', async () => {
    const { ctrl, store } = makeCtrl({
      forkToPrivate: jest
        .fn()
        .mockImplementation((_src, newFlowId) =>
          Promise.resolve(DataProcessResult.success(makeTopology({ flowId: newFlowId as string }))),
        ),
    });
    const res = (await ctrl.fork('FLOW-GLOBAL')) as ClientFlowDefinition;
    expect(store.forkToPrivate).toHaveBeenCalled();
    expect(res.flow_id).toMatch(/^FLOW-FORK-[A-Z0-9]{8}$/);
  });

  it('returns error when source not found', async () => {
    const { ctrl } = makeCtrl({
      forkToPrivate: jest
        .fn()
        .mockResolvedValue(DataProcessResult.failure<never>('SOURCE_NOT_FOUND', 'nope')),
    });
    const res = (await ctrl.fork('FLOW-MISSING')) as { code: string };
    expect(res.code).toBe('SOURCE_NOT_FOUND');
  });
});

// Turn 5 (MVP Plan v3) replaced the 501 POST stub with PUT /:flowId/freedom.
// Coverage for the new implementation lives in the
// "FlowDefinitionsController — PUT /:flowId/freedom (Turn 5)" block above.
