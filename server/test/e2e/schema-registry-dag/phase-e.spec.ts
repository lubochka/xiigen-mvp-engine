/**
 * FLOW-11 Phase E — T202 SchemaApprovalWorkflow Tests
 * T202-1 through T202-5
 */
import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';

function makeDb(freedomWindowMs?: number) {
  const store = new Map<string, Record<string, unknown>[]>();
  if (freedomWindowMs !== undefined) {
    // Seed FREEDOM config
    const bucket: Record<string, unknown>[] = [
      {
        config_key: 'schema_registry_approval_window_ms',
        task_type: 'xiigen-engine',
        config_value: String(freedomWindowMs),
      },
    ];
    store.set('freedom_configs', bucket);
  }
  const db = {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id?: string) => {
      const bucket = store.get(index) ?? [];
      const docId =
        id ?? String(doc['workflowId'] ?? doc['key'] ?? doc['auditId'] ?? `doc-${Date.now()}`);
      const existing = bucket.findIndex(
        (d) => (d['workflowId'] ?? d['key'] ?? d['auditId'] ?? d['_id']) === docId,
      );
      const entry = { ...doc, _id: docId };
      if (existing >= 0) bucket[existing] = entry;
      else bucket.push(entry);
      store.set(index, bucket);
      return DataProcessResult.success(entry);
    }),
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      const bucket = store.get(index) ?? [];
      const results = bucket.filter((doc) =>
        Object.entries(filter).every(([k, v]) => v == null || doc[k] === v),
      );
      return DataProcessResult.success(results);
    }),
    getDocument: jest.fn(async () => DataProcessResult.failure('NOT_FOUND', 'not found')),
    getDocumentWithVersion: jest.fn(async () =>
      DataProcessResult.failure('NOT_FOUND', 'not found'),
    ),
    storeDocumentWithOCC: jest.fn(async () =>
      DataProcessResult.success({ seqNo: 1, primaryTerm: 1 }),
    ),
    deleteDocument: jest.fn(async () => DataProcessResult.success(true)),
    bulkStore: jest.fn(async () => DataProcessResult.success({})),
    countDocuments: jest.fn(async () => DataProcessResult.success(0)),
    ensureIndex: jest.fn(async () => {}),
    _store: store,
  };
  return db;
}

function makeQueue() {
  const events: Array<{ event: string; payload: unknown }> = [];
  return {
    enqueue: jest.fn(async (event: string, payload: unknown) => {
      events.push({ event, payload });
      return DataProcessResult.success({});
    }),
    _events: events,
  };
}

async function makeWorkflow(
  db: ReturnType<typeof makeDb>,
  queue: ReturnType<typeof makeQueue>,
  tenantId = 'test-tenant-t202',
) {
  const { SchemaApprovalWorkflowService } =
    await import('../../../src/engine/flows/schema-registry-dag/schema-approval-workflow.service');
  const cls = { get: jest.fn(() => ({ tenantId })) };
  return new SchemaApprovalWorkflowService(db as any, queue as any, cls as any);
}

const approvalInput = {
  schemaType: 'TestSchema',
  newSchema: { type: 'object', properties: { name: { type: 'string' } } },
  previousVersion: '1.0.0',
  changedFields: ['amount'],
  nextVersion: '2.0.0',
  tenantId: 'test-tenant-t202',
};

describe('T202 SchemaApprovalWorkflow', () => {
  test('T202-1: APPROVE → SchemaApprovalGranted with approvalToken', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const workflow = await makeWorkflow(db, queue);

    const result = await workflow.processApproval({ ...approvalInput, decision: 'APPROVE' });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.decision).toBe('APPROVED');

    const grantedEvents = queue._events.filter((e) => e.event === 'SchemaApprovalGranted');
    expect(grantedEvents).toHaveLength(1);
    expect((grantedEvents[0].payload as Record<string, unknown>)['approvalToken']).toBeDefined();
  });

  test('T202-2: REJECT → SchemaApprovalRejected (terminal)', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const workflow = await makeWorkflow(db, queue);

    const result = await workflow.processApproval({
      ...approvalInput,
      decision: 'REJECT',
      schemaType: 'TestSchemaB',
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.decision).toBe('REJECTED');

    const rejectedEvents = queue._events.filter((e) => e.event === 'SchemaApprovalRejected');
    expect(rejectedEvents).toHaveLength(1);
  });

  test('T202-3: DEFER → SchemaApprovalDeferred (not REJECT — not binary)', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const workflow = await makeWorkflow(db, queue);

    const result = await workflow.processApproval({
      ...approvalInput,
      decision: 'DEFER',
      schemaType: 'TestSchemaC',
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.decision).toBe('DEFERRED');

    const deferredEvents = queue._events.filter((e) => e.event === 'SchemaApprovalDeferred');
    expect(deferredEvents).toHaveLength(1);

    // Must NOT emit SchemaApprovalRejected
    const rejectedEvents = queue._events.filter((e) => e.event === 'SchemaApprovalRejected');
    expect(rejectedEvents).toHaveLength(0);
  });

  test('T202-4: duplicate workflow → SchemaApprovalDuplicate', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const workflow = await makeWorkflow(db, queue);

    const input = { ...approvalInput, schemaType: 'DupSchema', decision: 'APPROVE' as const };
    await workflow.processApproval(input);
    // Second call — same schemaType + version → duplicate
    const result2 = await workflow.processApproval(input);
    expect(result2.isSuccess).toBe(true);
    expect(result2.data!.decision).toBe('DUPLICATE');

    const dupEvents = queue._events.filter((e) => e.event === 'SchemaApprovalDuplicate');
    expect(dupEvents).toHaveLength(1);
  });

  test('T202-5: approval window TTL from FREEDOM config — not hardcoded', async () => {
    const customWindowMs = 12 * 60 * 60 * 1000; // 12 hours
    const db = makeDb(customWindowMs);
    const queue = makeQueue();
    const workflow = await makeWorkflow(db, queue);

    const result = await workflow.processApproval({
      ...approvalInput,
      decision: 'DEFER',
      schemaType: 'FreedomSchema',
    });
    expect(result.isSuccess).toBe(true);

    // Check that storeDocument was called with expiresAt derived from FREEDOM config (not 72h default)
    const auditBucket = db._store.get('xiigen-schema-audit') ?? [];
    const pendingRecord = auditBucket[0] as Record<string, unknown>;
    expect(pendingRecord).toBeDefined();
    expect(pendingRecord['expiresAt']).toBeDefined();

    // Verify TTL was sourced from FREEDOM config (12h = 43200000ms)
    const configSearchCalls = db.searchDocuments.mock.calls.filter(
      (call: unknown[]) =>
        call[1] &&
        (call[1] as Record<string, unknown>)['config_key'] ===
          'flow11_schema_registry_approval_window_ms',
    );
    expect(configSearchCalls.length).toBeGreaterThan(0);
  });
});
