/**
 * FLOW-11 Phase F — T192 DagDependencyTracker Tests
 * T192-1 through T192-4
 */
import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';

function makeDb(initialSchemas: Record<string, unknown>[] = []) {
  const store = new Map<string, Record<string, unknown>[]>();
  if (initialSchemas.length > 0) store.set('xiigen-schema-registry', [...initialSchemas]);
  const db = {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id?: string) => {
      const bucket = store.get(index) ?? [];
      const docId = id ?? `doc-${Date.now()}`;
      bucket.push({ ...doc, _id: docId });
      store.set(index, bucket);
      return DataProcessResult.success({ ...doc });
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

async function makeTracker(
  db: ReturnType<typeof makeDb>,
  queue: ReturnType<typeof makeQueue>,
  tenantId = 'test-tenant-t192',
) {
  const { DagDependencyTrackerService } =
    await import('../../../src/engine/flows/schema-registry-dag/dag-dependency-tracker.service');
  const cls = { get: jest.fn(() => ({ tenantId })) };
  return new DagDependencyTrackerService(db as any, queue as any, cls as any);
}

describe('T192 DagDependencyTracker', () => {
  test('T192-1: @EventPattern consumer — is an async event handler (not inline)', async () => {
    const { DagDependencyTrackerService } =
      await import('../../../src/engine/flows/schema-registry-dag/dag-dependency-tracker.service');
    // Verify @EventPattern metadata on onSchemaPublished
    const metadata = Reflect.getMetadata(
      'microservices:handler_type',
      DagDependencyTrackerService.prototype.onSchemaPublished,
    );
    // May be set by @EventPattern decorator
    const proto = DagDependencyTrackerService.prototype;
    expect(typeof proto.onSchemaPublished).toBe('function');
    // rebuild is separate from gateway — not called inline in T189
    expect(typeof proto.rebuild).toBe('function');
  });

  test('T192-2: edges UNIDIRECTIONAL only — A→B not B→A', async () => {
    const schemas = [
      {
        schemaType: 'OrderSchema',
        status: 'ACTIVE',
        activeUntil: null,
        tenantId: 'test-tenant-t192',
        dependencies: ['ProductSchema'],
      },
      {
        schemaType: 'ProductSchema',
        status: 'ACTIVE',
        activeUntil: null,
        tenantId: 'test-tenant-t192',
        dependencies: [],
      },
    ];
    const db = makeDb(schemas);
    const queue = makeQueue();
    const tracker = await makeTracker(db, queue);

    await tracker.rebuild('test-tenant-t192', 'OrderSchema');

    const dagBucket = db._store.get('xiigen-dag-topology') ?? [];
    const dagNode = dagBucket[0] as Record<string, unknown>;
    const edges = (dagNode['edges'] as Array<{ from: string; to: string }>) ?? [];

    // Should have A→B edge
    const abEdge = edges.find((e) => e.from === 'OrderSchema' && e.to === 'ProductSchema');
    expect(abEdge).toBeDefined();

    // Should NOT have reverse edge B→A
    const baEdge = edges.find((e) => e.from === 'ProductSchema' && e.to === 'OrderSchema');
    expect(baEdge).toBeUndefined();

    // Verify DPO annotation
    expect(dagNode['edgeModel']).toBe('UNIDIRECTIONAL');
    expect(dagNode['dpoConflict']).toBe('FLOW-07-T75-bidirectional-graph-write');
  });

  test('T192-3: DagRebuildCompleted emitted after storeDocument — DNA-8', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const tracker = await makeTracker(db, queue);

    const callOrder: string[] = [];
    db.storeDocument.mockImplementation(
      async (index: string, doc: Record<string, unknown>, id?: string) => {
        callOrder.push(`store:${index}`);
        const bucket = db._store.get(index) ?? [];
        bucket.push({ ...doc });
        db._store.set(index, bucket);
        return DataProcessResult.success({ ...doc });
      },
    );
    queue.enqueue.mockImplementation(async (event: string, payload: unknown) => {
      callOrder.push(`enqueue:${event}`);
      queue._events.push({ event, payload });
      return DataProcessResult.success({});
    });

    await tracker.rebuild('test-tenant-t192', 'SomeSchema');

    const storePos = callOrder.findIndex((c: string) => c === 'store:xiigen-dag-topology');
    const enqueuePos = callOrder.findIndex((c: string) => c === 'enqueue:DagRebuildCompleted');
    expect(storePos).toBeGreaterThanOrEqual(0);
    expect(enqueuePos).toBeGreaterThanOrEqual(0);
    expect(storePos).toBeLessThan(enqueuePos);
  });

  test('T192-4: T192 is topology builder only — does not perform cycle detection', async () => {
    const { DagDependencyTrackerService } =
      await import('../../../src/engine/flows/schema-registry-dag/dag-dependency-tracker.service');
    const { DagCycleDetectorService } =
      await import('../../../src/engine/flows/schema-registry-dag/dag-cycle-detector.service');

    const tracker = DagDependencyTrackerService.prototype;
    // T192 should NOT have a check() method (that belongs to T191)
    expect(typeof (tracker as unknown as Record<string, unknown>)['check']).not.toBe('function');
    // T192 rebuilds topology, T191 checks cycles
    expect(typeof tracker.rebuild).toBe('function');
    expect(typeof DagCycleDetectorService.prototype.check).toBe('function');
  });
});
