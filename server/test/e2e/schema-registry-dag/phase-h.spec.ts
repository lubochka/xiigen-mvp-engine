/**
 * FLOW-11 Phase H — T203-T208 Tests
 * T203-1, T203-2, T204-3, T205-4, T206-5, T207-6, T208-7
 */
import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';

function makeDb(initialData: Partial<Record<string, Record<string, unknown>[]>> = {}) {
  const store = new Map<string, Record<string, unknown>[]>();
  for (const [idx, docs] of Object.entries(initialData)) {
    store.set(idx, [...(docs ?? [])]);
  }
  const db = {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id?: string) => {
      const bucket = store.get(index) ?? [];
      const docId = id ?? `doc-${Date.now()}`;
      bucket.push({ ...doc, _id: docId });
      store.set(index, bucket);
      return DataProcessResult.success({ ...doc, _id: docId });
    }),
    searchDocuments: jest.fn(
      async (
        index: string,
        filter: Record<string, unknown>,
        size?: number,
        fromOffset?: number,
      ) => {
        const bucket = store.get(index) ?? [];
        let results = bucket.filter((doc) =>
          Object.entries(filter).every(([k, v]) => v == null || doc[k] === v),
        );
        const offset = fromOffset ?? 0;
        const limit = size ?? results.length;
        results = results.slice(offset, offset + limit);
        return DataProcessResult.success(results);
      },
    ),
    getDocument: jest.fn(async (index: string, id: string) => {
      const bucket = store.get(index) ?? [];
      const doc = bucket.find((d) => d['_id'] === id || d['schemaId'] === id);
      return doc
        ? DataProcessResult.success(doc)
        : DataProcessResult.failure('NOT_FOUND', 'not found');
    }),
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

function makeCls(tenantId = 'test-tenant-t203') {
  return { get: jest.fn(() => ({ tenantId })) };
}

describe('T203 SchemaMigrationOrchestrator', () => {
  test('T203-1: migration only on BREAKING — not on ADDITIVE publish', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const { SchemaMigrationOrchestratorService } =
      await import('../../../src/engine/flows/schema-registry-dag/schema-migration-orchestrator.service');
    const cls = makeCls();
    const orchestrator = new SchemaMigrationOrchestratorService(
      db as any,
      queue as any,
      cls as any,
    );

    // ADDITIVE event — should NOT trigger migration
    await orchestrator.onSchemaPublished({
      schemaType: 'TestSchema',
      version: '1.1.0',
      changeType: 'ADDITIVE',
      tenantId: 'test-tenant-t203',
    });

    const migrationEvents = queue._events.filter((e) => e.event === 'SchemaMigrationCompleted');
    expect(migrationEvents).toHaveLength(0);
  });

  test('T203-2: paginated processing — no all-at-once result set', async () => {
    const docs = Array.from({ length: 150 }, (_, i) => ({
      id: `doc-${i}`,
      schemaType: 'BigSchema',
      schemaVersion: '1.0.0',
      tenantId: 'test-tenant-t203',
      _id: `doc-${i}`,
    }));
    const db = makeDb({ 'xiigen-documents-BigSchema': docs });
    const queue = makeQueue();
    const { SchemaMigrationOrchestratorService } =
      await import('../../../src/engine/flows/schema-registry-dag/schema-migration-orchestrator.service');
    const cls = makeCls();
    const orchestrator = new SchemaMigrationOrchestratorService(
      db as any,
      queue as any,
      cls as any,
    );

    const result = await orchestrator.migrate({
      schemaType: 'BigSchema',
      newVersion: '2.0.0',
      previousVersion: '1.0.0',
      tenantId: 'test-tenant-t203',
    });

    expect(result.isSuccess).toBe(true);
    // Verify paginated calls (should be called at least twice for 150 docs with PAGE_SIZE=100)
    const searchCalls = db.searchDocuments.mock.calls.filter(
      (c: unknown[]) => c[0] === 'xiigen-documents-BigSchema',
    );
    expect(searchCalls.length).toBeGreaterThanOrEqual(2);
  });
});

describe('T204 DagConflictDetector', () => {
  test('T204-3: T204 has no ES calls — pure topology analysis', () => {
    const {
      DagConflictDetectorService,
    } = require('../../../src/engine/flows/schema-registry-dag/dag-conflict-detector.service');
    expect(DagConflictDetectorService.length).toBe(0); // no constructor dependencies

    const detector = new DagConflictDetectorService();
    const result = detector.detectConflicts({
      schemaType: 'TestSchema',
      newDeps: ['ExistingSchema'],
      existingGraph: { ExistingSchema: [] },
    });
    expect(result).not.toBeInstanceOf(Promise);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.hasConflicts).toBe(false);
  });
});

describe('T205 SchemaValidationService', () => {
  test('T205-4: validates against document.schemaVersion pin — not getCurrentVersion()', async () => {
    const db = makeDb({
      'xiigen-schema-registry': [
        {
          schemaType: 'UserSchema',
          version: '1.0.0',
          status: 'ACTIVE',
          tenantId: 'test-tenant-t203',
          jsonSchema: {
            type: 'object',
            properties: { name: { type: 'string' } },
            required: ['name'],
          },
        },
        {
          schemaType: 'UserSchema',
          version: '2.0.0', // BREAKING — removed 'name'
          status: 'ACTIVE',
          tenantId: 'test-tenant-t203',
          jsonSchema: {
            type: 'object',
            properties: { email: { type: 'string' } },
            required: ['email'],
          },
        },
      ],
    });
    const { SchemaValidationService } =
      await import('../../../src/engine/flows/schema-registry-dag/schema-validation.service');
    const cls = makeCls();
    const validator = new SchemaValidationService(db as any, cls as any);

    // Document was valid at v1.0.0 — validate against PINNED version
    const document = { schemaVersion: '1.0.0', name: 'Alice' };
    const result = await validator.validate({ document, schemaType: 'UserSchema' });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.valid).toBe(true);
    expect(result.data!.validatedAgainstVersion).toBe('1.0.0');

    // Verify it searched for v1.0.0, not v2.0.0
    const searchCalls = db.searchDocuments.mock.calls;
    const versionFilter = searchCalls.find(
      (c: unknown[]) => (c[1] as Record<string, unknown>)['version'] === '1.0.0',
    );
    expect(versionFilter).toBeDefined();
  });
});

describe('T206 SchemaQualityAnalyzer', () => {
  test('T206-5: quality analysis does not call updateDocument on any schema', async () => {
    const db = makeDb({
      'xiigen-schema-registry': [
        { schemaType: 'A', status: 'ACTIVE', activeUntil: null, tenantId: 'test-tenant-t203' },
      ],
    });
    const { SchemaQualityAnalyzerService } =
      await import('../../../src/engine/flows/schema-registry-dag/schema-quality-analyzer.service');
    const cls = makeCls();
    const analyzer = new SchemaQualityAnalyzerService(db as any, cls as any);

    const result = await analyzer.analyze();
    expect(result.isSuccess).toBe(true);
    expect(result.data!.totalSchemas).toBe(1);

    // No storeDocument or deleteDocument calls (read-only)
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(db.deleteDocument).not.toHaveBeenCalled();
  });
});

describe('T207 SchemaExportService', () => {
  test('T207-6: export scoped to tenantId from ALS; only activeUntil:null schemas', async () => {
    const db = makeDb({
      'xiigen-schema-registry': [
        {
          schemaId: 'a',
          schemaType: 'A',
          status: 'ACTIVE',
          activeUntil: null,
          tenantId: 'test-tenant-t203',
        },
        {
          schemaId: 'b',
          schemaType: 'B',
          status: 'DEPRECATED',
          activeUntil: '2026-01-01',
          tenantId: 'test-tenant-t203',
        },
        {
          schemaId: 'c',
          schemaType: 'C',
          status: 'ACTIVE',
          activeUntil: null,
          tenantId: 'other-tenant',
        },
      ],
    });
    const { SchemaExportService } =
      await import('../../../src/engine/flows/schema-registry-dag/schema-export.service');
    const cls = makeCls();
    const exporter = new SchemaExportService(db as any, cls as any);

    const result = await exporter.export();
    expect(result.isSuccess).toBe(true);

    // Verify tenantId filter was applied (from ALS)
    const searchCalls = db.searchDocuments.mock.calls;
    const lastCall = searchCalls[searchCalls.length - 1];
    expect((lastCall[1] as Record<string, unknown>)['tenantId']).toBe('test-tenant-t203');
    expect((lastCall[1] as Record<string, unknown>)['activeUntil']).toBeNull();
  });
});

describe('T208 DagVisualizationGateway', () => {
  test('T208-7: routes to T199 for mermaid; unknown format → RouteRejected', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const mockRender = jest.fn().mockResolvedValue(DataProcessResult.success('graph TD; A-->B'));
    const mockRenderGateway = { renderDag: mockRender };
    const mockTopologyBuilder = {
      buildTopology: jest
        .fn()
        .mockResolvedValue(DataProcessResult.success({ nodes: [], edges: [] })),
    };

    const { DagVisualizationGatewayService } =
      await import('../../../src/engine/flows/schema-registry-dag/dag-visualization-gateway.service');
    const cls = makeCls();
    const gateway = new DagVisualizationGatewayService(
      db as any,
      queue as any,
      cls as any,
      mockRenderGateway as any,
      mockTopologyBuilder as any,
    );

    // mermaid → delegates to T199
    const mermaidResult = await gateway.visualize({ format: 'mermaid', flowId: 'FLOW-11' });
    expect(mermaidResult.isSuccess).toBe(true);
    expect(mockRender).toHaveBeenCalled();

    // unknown format → RouteRejected
    const unknownResult = await gateway.visualize({ format: 'pdf' });
    expect(unknownResult.isSuccess).toBe(false);
    expect(unknownResult.errorCode).toBe('ROUTE_REJECTED');
    const rejectedEvents = queue._events.filter((e) => e.event === 'RouteRejected');
    expect(rejectedEvents).toHaveLength(1);
  });
});
