/**
 * DependencyIndexQuery — CF-476 Scope Enforcement Tests (T376).
 *
 * CF-476: EVERY query includes tenant scope.
 * IR-376-3: Unscoped query → DataProcessResult.failure.
 *
 * Tests:
 *   SC-1: empty tenantId returns failure with UNSCOPED_QUERY code (IR-376-3)
 *   SC-2: whitespace-only tenantId is rejected (IR-376-3)
 *   SC-3: valid tenantId is accepted and forwarded to searchDocuments
 *   SC-4: searchDocuments always receives tenant_id in filters (CF-476)
 *   SC-5: tenant-A query does NOT return tenant-B documents (cross-tenant isolation)
 *   SC-6: queryFlowDependencies also enforces tenant scope (CF-476)
 *   SC-7: queryFlowDependencies with empty tenantId returns failure
 *   SC-8: queryFlowDependencies with empty flowId returns failure
 */

import {
  DependencyIndexQuery,
  DependencySeverity,
} from '../../src/engine/flows/bfa-conflict-arbitration/dependency-index-query.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

function makeCapturingDb(docs: Record<string, unknown>[] = []) {
  const capturedFilters: Record<string, unknown>[] = [];
  const db = {
    searchDocuments: jest.fn(async (_index: string, filters: Record<string, unknown>) => {
      capturedFilters.push({ ...filters });
      const results = docs.filter((doc) => Object.entries(filters).every(([k, v]) => doc[k] === v));
      return DataProcessResult.success(results);
    }),
    _capturedFilters: capturedFilters,
  } as any;
  return db;
}

const TENANT_A = 'tenant-alpha';
const TENANT_B = 'tenant-beta';

const NODE_A: Record<string, unknown> = {
  node_id: 'node-a',
  entity_id: 'ServiceA',
  entity_class: 'service',
  access_type: 'write',
  depends_on: 'SharedEntity',
  severity: 'HIGH',
  flow_id: 'FLOW-01',
  task_type: 'T375',
  metadata: {},
  tenant_id: TENANT_A,
};

const NODE_B: Record<string, unknown> = {
  node_id: 'node-b',
  entity_id: 'ServiceB',
  entity_class: 'service',
  access_type: 'read',
  depends_on: 'SharedEntity',
  severity: 'MEDIUM',
  flow_id: 'FLOW-03',
  task_type: 'T376',
  metadata: {},
  tenant_id: TENANT_B,
};

describe('DependencyIndexQuery — CF-476 Scope Enforcement (T376)', () => {
  it('SC-1: empty tenantId returns failure with UNSCOPED_QUERY code (IR-376-3)', async () => {
    const svc = new DependencyIndexQuery(makeCapturingDb());
    const result = await svc.queryDependencies({ entityId: 'OrderSchema' }, '');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNSCOPED_QUERY');
    expect(result.errorMessage).toContain('CF-476');
  });

  it('SC-2: whitespace-only tenantId is rejected (IR-376-3)', async () => {
    const svc = new DependencyIndexQuery(makeCapturingDb());
    const result = await svc.queryDependencies({ entityId: 'OrderSchema' }, '   ');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('SC-3: valid tenantId is accepted', async () => {
    const db = makeCapturingDb([]);
    const svc = new DependencyIndexQuery(db);
    const result = await svc.queryDependencies({ entityId: 'OrderSchema' }, TENANT_A);
    expect(result.isSuccess).toBe(true);
  });

  it('SC-4: searchDocuments always receives tenant_id in filter (CF-476)', async () => {
    const db = makeCapturingDb([]);
    const svc = new DependencyIndexQuery(db);
    await svc.queryDependencies({ entityId: 'OrderSchema' }, TENANT_A);

    const filters = db._capturedFilters[0];
    expect(filters).toHaveProperty('tenant_id', TENANT_A);
  });

  it('SC-5: tenant-A query does NOT return tenant-B documents (cross-tenant isolation)', async () => {
    const db = makeCapturingDb([NODE_A, NODE_B]);
    const svc = new DependencyIndexQuery(db);
    const result = await svc.queryDependencies({ entityId: 'SharedEntity' }, TENANT_A);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.nodes).toHaveLength(1);
    expect(result.data!.nodes[0].nodeId).toBe('node-a');
    // node-b (tenant-B) must NOT appear
    expect(result.data!.nodes.find((n) => n.nodeId === 'node-b')).toBeUndefined();
  });

  it('SC-6: queryFlowDependencies also enforces tenant scope (CF-476)', async () => {
    const db = makeCapturingDb([]);
    const svc = new DependencyIndexQuery(db);
    await svc.queryFlowDependencies('OrderSchema', 'FLOW-01', TENANT_A);

    const filters = db._capturedFilters[0];
    expect(filters).toHaveProperty('tenant_id', TENANT_A);
    expect(filters).toHaveProperty('flow_id', 'FLOW-01');
  });

  it('SC-7: queryFlowDependencies with empty tenantId returns failure', async () => {
    const svc = new DependencyIndexQuery(makeCapturingDb());
    const result = await svc.queryFlowDependencies('OrderSchema', 'FLOW-01', '');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('SC-8: queryFlowDependencies with empty flowId returns failure', async () => {
    const svc = new DependencyIndexQuery(makeCapturingDb());
    const result = await svc.queryFlowDependencies('OrderSchema', '', TENANT_A);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_FLOW_ID');
  });
});
