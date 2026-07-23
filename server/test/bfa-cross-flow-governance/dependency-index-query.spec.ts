/**
 * DependencyIndexQuery — Unit Tests (T376).
 *
 * Tests:
 *   D-1: returns empty result with NONE severity when no deps found (IR-376-2)
 *   D-2: returns nodes and maxSeverity for found dependencies
 *   D-3: maxSeverity reflects highest severity across all nodes
 *   D-4: returns DataProcessResult.isSuccess=true on valid query
 *   D-5: searchDocuments failure propagates as DataProcessResult.failure
 *   D-6: queryFlowDependencies filters by flow_id
 *   D-7: queryFlowDependencies returns NONE for empty flow result (IR-376-2)
 *   D-8: missing entityId returns failure
 *   D-9: toNode maps raw doc fields to DependencyNode shape
 */

import {
  DependencyIndexQuery,
  DependencySeverity,
} from '../../src/engine/flows/bfa-conflict-arbitration/dependency-index-query.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-alpha';

function makeDb(docs: Record<string, unknown>[] = []) {
  return {
    searchDocuments: jest.fn(async (_index: string, filters: Record<string, unknown>) => {
      const results = docs.filter((doc) => Object.entries(filters).every(([k, v]) => doc[k] === v));
      return DataProcessResult.success(results);
    }),
    storeDocument: jest.fn(async () => DataProcessResult.success({})),
  } as any;
}

function makeFailingDb() {
  return {
    searchDocuments: jest.fn(async () =>
      DataProcessResult.failure('DB_ERROR', 'Simulated DB failure'),
    ),
  } as any;
}

const NODE_CRITICAL: Record<string, unknown> = {
  node_id: 'node-1',
  entity_id: 'PaymentService',
  entity_class: 'service',
  access_type: 'write',
  depends_on: 'OrderSchema',
  severity: 'CRITICAL',
  flow_id: 'FLOW-01',
  task_type: 'T375',
  metadata: {},
  tenant_id: TENANT,
};

const NODE_MEDIUM: Record<string, unknown> = {
  node_id: 'node-2',
  entity_id: 'InvoiceService',
  entity_class: 'service',
  access_type: 'read',
  depends_on: 'OrderSchema',
  severity: 'MEDIUM',
  flow_id: 'FLOW-02',
  task_type: 'T376',
  metadata: {},
  tenant_id: TENANT,
};

describe('DependencyIndexQuery — Unit (T376)', () => {
  it('D-1: empty result returns NONE severity — not an error (IR-376-2)', async () => {
    const svc = new DependencyIndexQuery(makeDb([]));
    const result = await svc.queryDependencies({ entityId: 'NonExistent' }, TENANT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.nodes).toHaveLength(0);
    expect(result.data!.maxSeverity).toBe(DependencySeverity.NONE);
    expect(result.data!.totalCount).toBe(0);
  });

  it('D-2: returns matching nodes for known entity', async () => {
    const db = makeDb([NODE_CRITICAL, NODE_MEDIUM]);
    const svc = new DependencyIndexQuery(db);
    const result = await svc.queryDependencies({ entityId: 'OrderSchema' }, TENANT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.nodes).toHaveLength(2);
    expect(result.data!.totalCount).toBe(2);
  });

  it('D-3: maxSeverity is highest severity across all nodes', async () => {
    const db = makeDb([NODE_CRITICAL, NODE_MEDIUM]);
    const svc = new DependencyIndexQuery(db);
    const result = await svc.queryDependencies({ entityId: 'OrderSchema' }, TENANT);

    expect(result.data!.maxSeverity).toBe(DependencySeverity.CRITICAL);
  });

  it('D-4: returns isSuccess=true on valid query', async () => {
    const svc = new DependencyIndexQuery(makeDb([NODE_MEDIUM]));
    const result = await svc.queryDependencies({ entityId: 'OrderSchema' }, TENANT);
    expect(result.isSuccess).toBe(true);
  });

  it('D-5: searchDocuments failure propagates as DataProcessResult.failure', async () => {
    const svc = new DependencyIndexQuery(makeFailingDb());
    const result = await svc.queryDependencies({ entityId: 'OrderSchema' }, TENANT);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_ERROR');
  });

  it('D-6: queryFlowDependencies filters by flowId', async () => {
    const flow01Node: Record<string, unknown> = {
      ...NODE_CRITICAL,
      flow_id: 'FLOW-01',
      depends_on: 'OrderSchema',
      tenant_id: TENANT,
    };
    const flow02Node: Record<string, unknown> = {
      ...NODE_MEDIUM,
      flow_id: 'FLOW-02',
      depends_on: 'OrderSchema',
      tenant_id: TENANT,
    };
    const db = makeDb([flow01Node, flow02Node]);
    const svc = new DependencyIndexQuery(db);

    const result = await svc.queryFlowDependencies('OrderSchema', 'FLOW-01', TENANT);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.nodes).toHaveLength(1);
    expect(result.data!.nodes[0].flowId).toBe('FLOW-01');
  });

  it('D-7: queryFlowDependencies returns NONE for empty flow result (IR-376-2)', async () => {
    const svc = new DependencyIndexQuery(makeDb([]));
    const result = await svc.queryFlowDependencies('OrderSchema', 'FLOW-99', TENANT);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.maxSeverity).toBe(DependencySeverity.NONE);
  });

  it('D-8: missing entityId returns failure', async () => {
    const svc = new DependencyIndexQuery(makeDb([]));
    const result = await svc.queryDependencies({ entityId: '' }, TENANT);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_ENTITY_ID');
  });

  it('D-9: node shape maps all raw doc fields correctly', async () => {
    const db = makeDb([NODE_CRITICAL]);
    const svc = new DependencyIndexQuery(db);
    const result = await svc.queryDependencies({ entityId: 'OrderSchema' }, TENANT);

    const node = result.data!.nodes[0];
    expect(node.nodeId).toBe('node-1');
    expect(node.entityId).toBe('PaymentService');
    expect(node.entityClass).toBe('service');
    expect(node.accessType).toBe('write');
    expect(node.dependsOn).toBe('OrderSchema');
    expect(node.severity).toBe(DependencySeverity.CRITICAL);
    expect(node.flowId).toBe('FLOW-01');
    expect(node.taskType).toBe('T375');
  });
});
