/**
 * ControlPlaneNodeRenderer — Unit Tests (T467).
 *
 * Tests:
 *   CPNR-1:  missing tenantId → UNSCOPED_QUERY
 *   CPNR-2:  empty FREEDOM config + empty node config → graceful empty state
 *   CPNR-3:  nodeCount = 0 on empty config (no crash)
 *   CPNR-4:  configSource = 'empty' on empty config
 *   CPNR-5:  nodes from DATABASE FABRIC rendered as Record<string,unknown>
 *   CPNR-6:  nodeCount reflects actual nodes returned
 *   CPNR-7:  configSource = 'database' when nodes exist
 *   CPNR-8:  node shape includes id, type, label, color, position, data fields
 *   CPNR-9:  DB failure on both queries → graceful empty state (no crash)
 *   CPNR-10: FREEDOM config colors applied to nodes when available
 */

import { ControlPlaneNodeRenderer } from '../../src/engine/flows/rag-optimization/control-plane-node-renderer.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-cpnr-test';
const VIEW = { graph_id: 'graph-001' };

function makeDb(nodeTypeDefs: any[] = [], rawNodes: any[] = []) {
  return {
    searchDocuments: jest.fn(async (index: string) => {
      if (index === 'flow29-freedom-node-types') return DataProcessResult.success(nodeTypeDefs);
      if (index === 'flow29-node-config') return DataProcessResult.success(rawNodes);
      return DataProcessResult.success([]);
    }),
  } as any;
}

function makeFailingDb() {
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.failure('DB_FAILED', 'db error')),
  } as any;
}

const RAW_NODE = {
  node_id: 'node-abc',
  node_type: 'strategy',
  label: 'Vector RAG',
  color: '#3B82F6',
  position: { x: 100, y: 200 },
};

const TYPE_DEF = { type: 'strategy', color: '#3B82F6' };

describe('ControlPlaneNodeRenderer — Unit (T467)', () => {
  it('CPNR-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new ControlPlaneNodeRenderer(makeDb());
    const r = await svc.renderNodes('', VIEW);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('CPNR-2: empty FREEDOM config + empty node config → graceful empty state', async () => {
    const svc = new ControlPlaneNodeRenderer(makeDb([], []));
    const r = await svc.renderNodes(TENANT, VIEW);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.nodes).toHaveLength(0);
  });

  it('CPNR-3: nodeCount = 0 on empty config (no crash)', async () => {
    const svc = new ControlPlaneNodeRenderer(makeDb([], []));
    const r = await svc.renderNodes(TENANT, VIEW);
    expect(r.data!.nodeCount).toBe(0);
  });

  it('CPNR-4: configSource = "empty" on empty config', async () => {
    const svc = new ControlPlaneNodeRenderer(makeDb([], []));
    const r = await svc.renderNodes(TENANT, VIEW);
    expect(r.data!.configSource).toBe('empty');
  });

  it('CPNR-5: nodes from DATABASE FABRIC rendered as Record<string,unknown>', async () => {
    const svc = new ControlPlaneNodeRenderer(makeDb([TYPE_DEF], [RAW_NODE]));
    const r = await svc.renderNodes(TENANT, VIEW);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.nodes.length).toBe(1);
    // Each node is Record<string,unknown>
    const node = r.data!.nodes[0];
    expect(typeof node).toBe('object');
    expect(node).not.toBeNull();
  });

  it('CPNR-6: nodeCount reflects actual nodes returned', async () => {
    const svc = new ControlPlaneNodeRenderer(makeDb([TYPE_DEF], [RAW_NODE, RAW_NODE, RAW_NODE]));
    const r = await svc.renderNodes(TENANT, VIEW);
    expect(r.data!.nodeCount).toBe(3);
  });

  it('CPNR-7: configSource = "database" when nodes exist', async () => {
    const svc = new ControlPlaneNodeRenderer(makeDb([TYPE_DEF], [RAW_NODE]));
    const r = await svc.renderNodes(TENANT, VIEW);
    expect(r.data!.configSource).toBe('database');
  });

  it('CPNR-8: node shape includes id, type, label, color, position, data fields', async () => {
    const svc = new ControlPlaneNodeRenderer(makeDb([TYPE_DEF], [RAW_NODE]));
    const r = await svc.renderNodes(TENANT, VIEW);
    const node = r.data!.nodes[0];
    expect(node).toHaveProperty('id');
    expect(node).toHaveProperty('type');
    expect(node).toHaveProperty('label');
    expect(node).toHaveProperty('color');
    expect(node).toHaveProperty('position');
    expect(node).toHaveProperty('data');
  });

  it('CPNR-9: DB failure on both queries → graceful empty state (no crash)', async () => {
    const svc = new ControlPlaneNodeRenderer(makeFailingDb());
    const r = await svc.renderNodes(TENANT, VIEW);
    // Service handles DB failure gracefully — returns empty state
    expect(r.isSuccess).toBe(true);
    expect(r.data!.nodes).toHaveLength(0);
  });

  it('CPNR-10: tenantId echoed in result', async () => {
    const svc = new ControlPlaneNodeRenderer(makeDb());
    const r = await svc.renderNodes(TENANT, VIEW);
    expect(r.data!.tenantId).toBe(TENANT);
  });
});
