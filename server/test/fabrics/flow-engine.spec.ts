/**
 * Tests for InMemory Flow Store + Orchestrator.
 * Verifies DAG storage, versioning, execution, resume, cancel, tenant isolation.
 */

import { InMemoryFlowStore } from '../../src/fabrics/flow-engine/in-memory-flow-store';
import {
  InMemoryFlowOrchestrator,
  FlowStatus,
} from '../../src/fabrics/flow-engine/in-memory-orchestrator';
import { NodeStatus } from '../../src/fabrics/interfaces/flow-orchestrator.interface';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';

function mockCls(tenantId: string) {
  const tenant = new TenantContext({
    id: tenantId,
    name: `T-${tenantId}`,
    status: 'active',
    plan: { ...DEFAULT_PLAN },
    configOverrides: {},
    apiKeys: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return {
    get: jest
      .fn()
      .mockImplementation((key: string) => (key === TENANT_CONTEXT_KEY ? tenant : undefined)),
  } as any;
}

/** Simple 3-node DAG: start → process → end */
function simpleFlowDef(): Record<string, unknown> {
  return {
    name: 'test-flow',
    nodes: [
      { node_id: 'start', type: 'start' },
      { node_id: 'process', type: 'task', handler: 'process_handler' },
      { node_id: 'end', type: 'end' },
    ],
    edges: [
      { source: 'start', target: 'process' },
      { source: 'process', target: 'end' },
    ],
  };
}

/** Flow with human approval node */
function approvalFlowDef(): Record<string, unknown> {
  return {
    name: 'approval-flow',
    nodes: [
      { node_id: 'start', type: 'start' },
      { node_id: 'review', type: 'human_approval' },
      { node_id: 'end', type: 'end' },
    ],
    edges: [
      { source: 'start', target: 'review' },
      { source: 'review', target: 'end' },
    ],
  };
}

// ═══════════════════════════════════════════════════════
// Flow Store Tests
// ═══════════════════════════════════════════════════════

describe('InMemoryFlowStore', () => {
  describe('saveFlow', () => {
    it('should save a flow definition', async () => {
      const store = new InMemoryFlowStore(mockCls('t1'));
      const result = await store.saveFlow(simpleFlowDef());
      expect(result.isSuccess).toBe(true);
      expect(result.data!['flow_id']).toBeDefined();
      expect(result.data!['version']).toBe('1');
      expect(result.data!['tenant_id']).toBe('t1');
      expect(result.data!['status']).toBe('draft');
    });

    it('should increment version on re-save', async () => {
      const store = new InMemoryFlowStore(mockCls('t1'));
      const flow = simpleFlowDef();
      const v1 = await store.saveFlow(flow);
      const flowId = v1.data!['flow_id'] as string;
      const v2 = await store.saveFlow({ ...flow, flow_id: flowId });
      expect(v2.data!['version']).toBe('2');
    });

    it('should reject flow without name', async () => {
      const store = new InMemoryFlowStore(mockCls('t1'));
      const result = await store.saveFlow({ nodes: [] });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_NAME');
    });
  });

  describe('loadFlow', () => {
    it('should load latest version by default', async () => {
      const store = new InMemoryFlowStore(mockCls('t1'));
      const flow = simpleFlowDef();
      const v1 = await store.saveFlow(flow);
      const flowId = v1.data!['flow_id'] as string;
      await store.saveFlow({ ...flow, flow_id: flowId, description: 'updated' });

      const loaded = await store.loadFlow(flowId);
      expect(loaded.isSuccess).toBe(true);
      expect(loaded.data!['version']).toBe('2');
      expect(loaded.data!['description']).toBe('updated');
    });

    it('should load specific version', async () => {
      const store = new InMemoryFlowStore(mockCls('t1'));
      const flow = simpleFlowDef();
      const v1 = await store.saveFlow(flow);
      const flowId = v1.data!['flow_id'] as string;
      await store.saveFlow({ ...flow, flow_id: flowId });

      const loaded = await store.loadFlow(flowId, '1');
      expect(loaded.data!['version']).toBe('1');
    });

    it('should return NOT_FOUND for missing flow', async () => {
      const store = new InMemoryFlowStore(mockCls('t1'));
      const result = await store.loadFlow('nonexistent');
      expect(result.errorCode).toBe('FLOW_NOT_FOUND');
    });
  });

  describe('listFlows', () => {
    it('should list tenant flows', async () => {
      const store = new InMemoryFlowStore(mockCls('t1'));
      await store.saveFlow({ name: 'flow-a' });
      await store.saveFlow({ name: 'flow-b' });
      const result = await store.listFlows();
      expect(result.data!.length).toBe(2);
    });

    it('should filter by status', async () => {
      const store = new InMemoryFlowStore(mockCls('t1'));
      await store.saveFlow({ name: 'draft-flow', status: 'draft' });
      await store.saveFlow({ name: 'active-flow', status: 'active' });
      const result = await store.listFlows({ status: 'active' });
      expect(result.data!.length).toBe(1);
      expect(result.data![0]['name']).toBe('active-flow');
    });
  });

  describe('tenant isolation', () => {
    it('should not return flows from other tenants', async () => {
      const storeA = new InMemoryFlowStore(mockCls('tA'));
      await storeA.saveFlow({ name: 'secret-flow' });

      const storeB = new InMemoryFlowStore(mockCls('tB'));
      const result = await storeB.listFlows();
      expect(result.data!.length).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════
// Flow Orchestrator Tests
// ═══════════════════════════════════════════════════════

describe('InMemoryFlowOrchestrator', () => {
  function createOrchestrator(tenantId: string) {
    const cls = mockCls(tenantId);
    const store = new InMemoryFlowStore(cls);
    const orch = new InMemoryFlowOrchestrator(cls, store);
    return { cls, store, orch };
  }

  describe('startFlow', () => {
    it('should start a flow and return run_id', async () => {
      const { store, orch } = createOrchestrator('t1');
      const saved = await store.saveFlow(simpleFlowDef());
      const flowId = saved.data!['flow_id'] as string;

      const result = await orch.startFlow(flowId, { spec: 'T44' });
      expect(result.isSuccess).toBe(true);
      expect(result.data!['run_id']).toBeDefined();
      expect(result.data!['status']).toBe(FlowStatus.RUNNING);
      expect(result.data!['first_node']).toBe('start');
    });

    it('should fail for missing flow', async () => {
      const { orch } = createOrchestrator('t1');
      const result = await orch.startFlow('nonexistent', {});
      expect(result.errorCode).toBe('FLOW_NOT_FOUND');
    });

    it('should fail for empty flow (no nodes)', async () => {
      const { store, orch } = createOrchestrator('t1');
      await store.saveFlow({ name: 'empty', nodes: [], edges: [] });
      const flows = await store.listFlows();
      const flowId = flows.data![0]['flow_id'] as string;

      const result = await orch.startFlow(flowId, {});
      expect(result.errorCode).toBe('EMPTY_FLOW');
    });
  });

  describe('executeNode', () => {
    it('should execute a node and return output', async () => {
      const { store, orch } = createOrchestrator('t1');
      const saved = await store.saveFlow(simpleFlowDef());
      const flowId = saved.data!['flow_id'] as string;
      const started = await orch.startFlow(flowId, { data: 'input' });
      const runId = started.data!['run_id'] as string;

      const result = await orch.executeNode(runId, 'start', { step: 'first' });
      expect(result.isSuccess).toBe(true);
      expect(result.data!['status']).toBe(NodeStatus.COMPLETED);
      expect(result.data!['next_nodes']).toContain('process');
    });

    it('should complete flow at end node', async () => {
      const { store, orch } = createOrchestrator('t1');
      const saved = await store.saveFlow(simpleFlowDef());
      const flowId = saved.data!['flow_id'] as string;
      const started = await orch.startFlow(flowId, {});
      const runId = started.data!['run_id'] as string;

      await orch.executeNode(runId, 'start', {});
      await orch.executeNode(runId, 'process', {});
      await orch.executeNode(runId, 'end', {});

      const status = await orch.getRunStatus(runId);
      expect(status.data!['status']).toBe(FlowStatus.COMPLETED);
    });

    it('should pause on human_approval node', async () => {
      const { store, orch } = createOrchestrator('t1');
      const saved = await store.saveFlow(approvalFlowDef());
      const flowId = saved.data!['flow_id'] as string;
      const started = await orch.startFlow(flowId, {});
      const runId = started.data!['run_id'] as string;

      await orch.executeNode(runId, 'start', {});
      const result = await orch.executeNode(runId, 'review', {});

      expect(result.data!['status']).toBe(NodeStatus.WAITING_FOR_USER);

      const status = await orch.getRunStatus(runId);
      expect(status.data!['status']).toBe(FlowStatus.PAUSED);
    });

    it('should reject execution on wrong tenant', async () => {
      // Use a mutable CLS mock so we can swap tenant mid-test
      let currentTenantId = 't1';
      const mutableCls = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key !== TENANT_CONTEXT_KEY) return undefined;
          return new TenantContext({
            id: currentTenantId,
            name: `T-${currentTenantId}`,
            status: 'active',
            plan: { ...DEFAULT_PLAN },
            configOverrides: {},
            apiKeys: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }),
      } as any;

      const store = new InMemoryFlowStore(mutableCls);
      const orch = new InMemoryFlowOrchestrator(mutableCls, store);

      const saved = await store.saveFlow(simpleFlowDef());
      const flowId = saved.data!['flow_id'] as string;
      const started = await orch.startFlow(flowId, {});
      const runId = started.data!['run_id'] as string;

      // Switch to tenant t2
      currentTenantId = 't2';
      const result = await orch.executeNode(runId, 'start', {});
      expect(result.errorCode).toBe('TENANT_MISMATCH');
    });
  });

  describe('resumeFlow', () => {
    it('should resume from waiting node', async () => {
      const { store, orch } = createOrchestrator('t1');
      const saved = await store.saveFlow(approvalFlowDef());
      const flowId = saved.data!['flow_id'] as string;
      const started = await orch.startFlow(flowId, {});
      const runId = started.data!['run_id'] as string;

      await orch.executeNode(runId, 'start', {});
      await orch.executeNode(runId, 'review', {});

      const result = await orch.resumeFlow(runId, 'review', { approved: true });
      expect(result.isSuccess).toBe(true);
      expect(result.data!['status']).toBe(NodeStatus.COMPLETED);
      expect(result.data!['next_nodes']).toContain('end');

      const status = await orch.getRunStatus(runId);
      expect(status.data!['status']).toBe(FlowStatus.RUNNING);
    });

    it('should reject resume on non-waiting node', async () => {
      const { store, orch } = createOrchestrator('t1');
      const saved = await store.saveFlow(simpleFlowDef());
      const flowId = saved.data!['flow_id'] as string;
      const started = await orch.startFlow(flowId, {});
      const runId = started.data!['run_id'] as string;

      const result = await orch.resumeFlow(runId, 'start', {});
      expect(result.errorCode).toBe('NOT_WAITING');
    });
  });

  describe('cancelFlow', () => {
    it('should cancel a running flow', async () => {
      const { store, orch } = createOrchestrator('t1');
      const saved = await store.saveFlow(simpleFlowDef());
      const flowId = saved.data!['flow_id'] as string;
      const started = await orch.startFlow(flowId, {});
      const runId = started.data!['run_id'] as string;

      const result = await orch.cancelFlow(runId, 'User requested');
      expect(result.isSuccess).toBe(true);

      const status = await orch.getRunStatus(runId);
      expect(status.data!['status']).toBe(FlowStatus.CANCELLED);
    });

    it('should cancel pending nodes', async () => {
      const { store, orch } = createOrchestrator('t1');
      const saved = await store.saveFlow(simpleFlowDef());
      const flowId = saved.data!['flow_id'] as string;
      const started = await orch.startFlow(flowId, {});
      const runId = started.data!['run_id'] as string;

      await orch.cancelFlow(runId, 'abort');
      const status = await orch.getRunStatus(runId);
      const nodeStatuses = status.data!['node_statuses'] as Record<string, Record<string, unknown>>;
      const allCancelled = Object.values(nodeStatuses).every(
        (ns) => ns['status'] === NodeStatus.CANCELLED,
      );
      expect(allCancelled).toBe(true);
    });

    it('should reject cancel on completed flow', async () => {
      const { store, orch } = createOrchestrator('t1');
      const saved = await store.saveFlow(simpleFlowDef());
      const flowId = saved.data!['flow_id'] as string;
      const started = await orch.startFlow(flowId, {});
      const runId = started.data!['run_id'] as string;

      await orch.executeNode(runId, 'start', {});
      await orch.executeNode(runId, 'process', {});
      await orch.executeNode(runId, 'end', {});

      const result = await orch.cancelFlow(runId, 'too late');
      expect(result.errorCode).toBe('RUN_TERMINAL');
    });
  });

  describe('testing helpers', () => {
    it('should track active and total runs', async () => {
      const { store, orch } = createOrchestrator('t1');
      const saved = await store.saveFlow(simpleFlowDef());
      const flowId = saved.data!['flow_id'] as string;

      expect(orch.totalRuns).toBe(0);
      await orch.startFlow(flowId, {});
      expect(orch.totalRuns).toBe(1);
      expect(orch.activeRuns).toBe(1);
    });
  });
});
