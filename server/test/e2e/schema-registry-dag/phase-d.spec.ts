/**
 * FLOW-11 Phase D — T194 SchemaPublisher Tests
 * T194-1 through T194-6
 */
import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';

function makeDb() {
  const store = new Map<string, Record<string, unknown>[]>();
  const db = {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id?: string) => {
      const bucket = store.get(index) ?? [];
      const docId = id ?? String(doc['schemaId'] ?? doc['auditId'] ?? `doc-${Date.now()}`);
      const existing = bucket.findIndex(
        (d) => (d['schemaId'] ?? d['auditId'] ?? d['_id']) === docId,
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
    getDocument: jest.fn(async (index: string, id: string) => {
      const bucket = store.get(index) ?? [];
      const doc = bucket.find((d) => (d['schemaId'] ?? d['_id']) === id);
      return doc
        ? DataProcessResult.success(doc)
        : DataProcessResult.failure('NOT_FOUND', 'not found');
    }),
    getDocumentWithVersion: jest.fn(async (index: string, id: string) => {
      const bucket = store.get(index) ?? [];
      const doc = bucket.find((d) => (d['schemaId'] ?? d['_id']) === id);
      if (doc) return DataProcessResult.success({ doc, seqNo: 1, primaryTerm: 1 });
      return DataProcessResult.failure('NOT_FOUND', 'not found');
    }),
    storeDocumentWithOCC: jest.fn(async () =>
      DataProcessResult.success({ seqNo: 2, primaryTerm: 1 }),
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

async function makePublisher(
  db: ReturnType<typeof makeDb>,
  queue: ReturnType<typeof makeQueue>,
  tenantId = 'test-tenant-t194',
) {
  const { SchemaPublisherService } =
    await import('../../../src/engine/flows/schema-registry-dag/schema-publisher.service');
  const cls = { get: jest.fn(() => ({ tenantId })) };
  return new SchemaPublisherService(db as any, queue as any, cls as any);
}

const newSchema = { type: 'object', properties: { name: { type: 'string' } } };

describe('T194 SchemaPublisher (OCC)', () => {
  test('T194-1: ADDITIVE schema publishes successfully with OCC — SchemaPublished emitted', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const publisher = await makePublisher(db, queue);

    const result = await publisher.publish({
      schemaType: 'UserSchema',
      newSchema,
      version: '1.1.0',
      changeType: 'ADDITIVE',
      tenantId: 'test-tenant-t194',
    });

    expect(result.isSuccess).toBe(true);
    const publishedEvents = queue._events.filter((e) => e.event === 'SchemaPublished');
    expect(publishedEvents).toHaveLength(1);
  });

  test('T194-2: BREAKING with valid approvalToken publishes — SchemaPublishConflict not emitted', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const publisher = await makePublisher(db, queue);

    // Seed approval token
    const approvalToken = 'valid-token-abc';
    await db.storeDocument(
      'xiigen-idempotency-keys',
      {
        key: `approval-token-${approvalToken}`,
        workflowId: 'wf-1',
        tenantId: 'test-tenant-t194',
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      `approval-token-${approvalToken}`,
    );

    const result = await publisher.publish({
      schemaType: 'OrderSchema',
      newSchema,
      version: '2.0.0',
      changeType: 'BREAKING',
      approvalToken,
      tenantId: 'test-tenant-t194',
    });

    expect(result.isSuccess).toBe(true);
    const conflictEvents = queue._events.filter((e) => e.event === 'SchemaPublishConflict');
    expect(conflictEvents).toHaveLength(0);
  });

  test('T194-3: BREAKING without approvalToken → SchemaPublishBlocked', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const publisher = await makePublisher(db, queue);

    const result = await publisher.publish({
      schemaType: 'OrderSchema',
      newSchema,
      version: '2.0.0',
      changeType: 'BREAKING',
      // no approvalToken
      tenantId: 'test-tenant-t194',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PUBLISH_BLOCKED');
    const blockedEvents = queue._events.filter((e) => e.event === 'SchemaPublishBlocked');
    expect(blockedEvents).toHaveLength(1);
  });

  test('T194-4: OCC conflict → SchemaPublishConflict; no silent overwrite', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const publisher = await makePublisher(db, queue);

    // Seed an existing schema document (so getDocumentWithVersion finds it)
    await db.storeDocument(
      'xiigen-schema-registry',
      {
        schemaId: 'schema-ConflictSchema-1.1.0',
        schemaType: 'ConflictSchema',
        version: '1.0.0',
        status: 'ACTIVE',
        activeUntil: null,
        tenantId: 'test-tenant-t194',
      },
      'schema-ConflictSchema-1.1.0',
    );

    // Mock storeDocumentWithOCC to return OCC_CONFLICT
    db.storeDocumentWithOCC.mockResolvedValueOnce(
      DataProcessResult.failure('OCC_CONFLICT', 'Version changed'),
    );

    const result = await publisher.publish({
      schemaType: 'ConflictSchema',
      newSchema,
      version: '1.1.0',
      changeType: 'ADDITIVE',
      tenantId: 'test-tenant-t194',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('OCC_CONFLICT');
    const conflictEvents = queue._events.filter((e) => e.event === 'SchemaPublishConflict');
    expect(conflictEvents).toHaveLength(1);
  });

  test('T194-5: prior version marked with activeUntil after new version published', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const publisher = await makePublisher(db, queue);

    // Seed existing active schema (different schemaId)
    await db.storeDocument(
      'xiigen-schema-registry',
      {
        schemaId: 'schema-ProductSchema-1.0.0',
        schemaType: 'ProductSchema',
        version: '1.0.0',
        status: 'ACTIVE',
        activeUntil: null,
        tenantId: 'test-tenant-t194',
      },
      'schema-ProductSchema-1.0.0',
    );

    await publisher.publish({
      schemaType: 'ProductSchema',
      newSchema,
      version: '1.1.0',
      changeType: 'ADDITIVE',
      tenantId: 'test-tenant-t194',
    });

    const bucket = db._store.get('xiigen-schema-registry') ?? [];
    const oldSchema = bucket.find((d) => d['schemaId'] === 'schema-ProductSchema-1.0.0');
    // Prior version should have activeUntil set (superseded)
    expect(oldSchema?.['activeUntil']).toBeDefined();
    expect(oldSchema?.['activeUntil']).not.toBeNull();
  });

  test('T194-6: storeDocument(audit) called before enqueue(SchemaPublished) — DNA-8', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const publisher = await makePublisher(db, queue);

    const callOrder: string[] = [];
    (db.storeDocument as jest.Mock).mockImplementation(
      async (index: string, doc: Record<string, unknown>, id?: string) => {
        callOrder.push(`store:${index}`);
        const bucket = db._store.get(index) ?? [];
        const docId = id ?? `doc-${Date.now()}`;
        bucket.push({ ...doc, _id: docId });
        db._store.set(index, bucket);
        return DataProcessResult.success({ ...doc });
      },
    );
    (queue.enqueue as jest.Mock).mockImplementation(async (event: string, payload: unknown) => {
      callOrder.push(`enqueue:${event}`);
      queue._events.push({ event, payload });
      return DataProcessResult.success({});
    });

    await publisher.publish({
      schemaType: 'AuditSchema',
      newSchema,
      version: '1.0.0',
      changeType: 'ADDITIVE',
      tenantId: 'test-tenant-t194',
    });

    const auditStorePos = callOrder.findIndex((c: string) => c === 'store:xiigen-schema-audit');
    const publishedEnqueuePos = callOrder.findIndex((c: string) => c === 'enqueue:SchemaPublished');
    expect(auditStorePos).toBeGreaterThanOrEqual(0);
    expect(publishedEnqueuePos).toBeGreaterThanOrEqual(0);
    expect(auditStorePos).toBeLessThan(publishedEnqueuePos);
  });
});
