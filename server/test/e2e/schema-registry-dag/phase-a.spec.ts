/**
 * FLOW-11 Phase A — T189 SchemaRegistrationGateway Tests
 * T189-1 through T189-5
 */
import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';

function makeDb() {
  const store = new Map<string, Record<string, unknown>[]>();
  const enqueuedEvents: Array<{ event: string; payload: unknown }> = [];
  const db = {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id?: string) => {
      const bucket = store.get(index) ?? [];
      const docId = id ?? String(doc['id'] ?? doc['auditId'] ?? doc['key'] ?? `doc-${Date.now()}`);
      const existing = bucket.findIndex(
        (d) => d['id'] === docId || d['auditId'] === docId || d['key'] === docId,
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
    _enqueuedEvents: enqueuedEvents,
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

function makeCls(tenantId = 'test-tenant-t189') {
  return { get: jest.fn(() => ({ tenantId })) };
}

async function makeGateway(
  db: ReturnType<typeof makeDb>,
  queue: ReturnType<typeof makeQueue>,
  tenantId?: string,
) {
  const { DagCycleDetectorService } =
    await import('../../../src/engine/flows/schema-registry-dag/dag-cycle-detector.service');
  const { SchemaVersionManagerService } =
    await import('../../../src/engine/flows/schema-registry-dag/schema-version-manager.service');
  const { SchemaCompatibilityCheckerService } =
    await import('../../../src/engine/flows/schema-registry-dag/schema-compatibility-checker.service');
  const { SchemaRegistrationGatewayService } =
    await import('../../../src/engine/flows/schema-registry-dag/schema-registration-gateway.service');
  const cycleDetector = new DagCycleDetectorService();
  const versionManager = new SchemaVersionManagerService();
  const compatChecker = new SchemaCompatibilityCheckerService();
  const cls = makeCls(tenantId);
  const gw = new SchemaRegistrationGatewayService(
    db as any,
    queue as any,
    cls as any,
    cycleDetector,
    versionManager,
    compatChecker,
  );
  return { gw, cycleDetector, versionManager, compatChecker, cls };
}

const validSchema = {
  type: 'object',
  properties: { name: { type: 'string' } },
  required: ['name'],
};

describe('T189 SchemaRegistrationGateway', () => {
  test('T189-1: structure validation failure before SETNX — empty schemaType rejected', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const { gw } = await makeGateway(db, queue);

    const result = await gw.register({ schemaType: '', jsonSchema: validSchema });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
    // SETNX not consumed — no idempotency key stored
    const idempotencyBucket = db._store.get('xiigen-idempotency-keys') ?? [];
    expect(idempotencyBucket).toHaveLength(0);
  });

  test('T189-2: SETNX dedup — second submission returns SchemaRejected(duplicate_version)', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const { gw } = await makeGateway(db, queue);

    await gw.register({ schemaType: 'TestSchema', jsonSchema: validSchema, version: 'v1' });
    // Second registration with same key
    const result2 = await gw.register({
      schemaType: 'TestSchema',
      jsonSchema: validSchema,
      version: 'v1',
    });
    expect(result2.isSuccess).toBe(true);
    expect(result2.data?.status).toBe('REJECTED');
    expect(result2.data?.reason).toBe('duplicate_version');
    const rejectedEvents = queue._events.filter((e) => e.event === 'SchemaRejected');
    expect(rejectedEvents.length).toBeGreaterThan(0);
  });

  test('T189-3: BREAKING changeType emits SchemaApprovalRequired — never SchemaQueued', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const { gw } = await makeGateway(db, queue);

    // Seed an existing active schema
    await db.storeDocument('xiigen-schema-registry', {
      schemaType: 'OrderSchema',
      version: '1.0.0',
      status: 'ACTIVE',
      activeUntil: null,
      tenantId: 'test-tenant-t189',
      jsonSchema: {
        type: 'object',
        properties: { orderId: { type: 'string' }, amount: { type: 'number' } },
        required: ['orderId', 'amount'],
      },
      connectionType: 'FLOW_SCOPED',
      knowledgeScope: 'PRIVATE',
    });

    // New schema REMOVES required field 'amount' → BREAKING
    const breakingSchema = {
      type: 'object',
      properties: { orderId: { type: 'string' } },
      required: ['orderId'],
    };
    const result = await gw.register({ schemaType: 'OrderSchema', jsonSchema: breakingSchema });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('AWAITING_APPROVAL');

    const approvalEvents = queue._events.filter((e) => e.event === 'SchemaApprovalRequired');
    expect(approvalEvents).toHaveLength(1);

    // CF-11-3: BREAKING must NEVER emit SchemaQueued
    const queuedEvents = queue._events.filter((e) => e.event === 'SchemaQueued');
    expect(queuedEvents).toHaveLength(0);
  });

  test('T189-4: ADDITIVE changeType with no cycle emits SchemaQueued', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const { gw } = await makeGateway(db, queue);

    // New optional field added → ADDITIVE
    const additiveSchema = {
      type: 'object',
      properties: { name: { type: 'string' }, description: { type: 'string' } },
      required: ['name'],
    };
    const result = await gw.register({ schemaType: 'UserSchema', jsonSchema: additiveSchema });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('QUEUED');
    const queuedEvents = queue._events.filter((e) => e.event === 'SchemaQueued');
    expect(queuedEvents).toHaveLength(1);
  });

  test('T189-5: storeDocument(audit) called before enqueue — DNA-8 verified', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const { gw } = await makeGateway(db, queue);

    const callOrder: string[] = [];
    (db.storeDocument as jest.Mock).mockImplementation(
      async (index: string, doc: Record<string, unknown>, id?: string) => {
        callOrder.push(`store:${index}`);
        const bucket = db._store.get(index) ?? [];
        const docId = id ?? String(doc['auditId'] ?? doc['key'] ?? `doc-${Date.now()}`);
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

    await gw.register({ schemaType: 'AuditOrderSchema', jsonSchema: validSchema });

    // Find positions: last storeDocument before first relevant enqueue
    const storeIndices = callOrder.reduce((acc: number[], c, i) => {
      if (c.startsWith('store:')) acc.push(i);
      return acc;
    }, []);
    const storePos = storeIndices[storeIndices.length - 1] ?? -1;
    const enqueuePos = callOrder.findIndex((c: string) => c.startsWith('enqueue:'));
    expect(storePos).toBeGreaterThanOrEqual(0);
    expect(enqueuePos).toBeGreaterThanOrEqual(0);
    expect(storePos).toBeLessThan(enqueuePos);
  });
});
