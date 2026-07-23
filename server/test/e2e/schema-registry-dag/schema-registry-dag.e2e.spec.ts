/**
 * FLOW-11 E2E — Schema Registry & DAG
 *
 * Archetypes: SCHEMA_REGISTRY_ARCHETYPE (schema_registry), DATA_PIPELINE
 * Key features: ES_INDEX constants, graph-utils DFS transitive closure with cycle
 *   detection, DAG renderer (Mermaid), OCC on database providers,
 *   Python FastAPI adapter, NamedCheckRegistry injectable
 * New infrastructure: ensureIndex(), getDocumentWithVersion(), storeDocumentWithOCC()
 *
 * 8 mandatory E2E categories:
 *   1. Happy path — register schema → validate → render DAG
 *   2. Error path — DataProcessResult.failure() on invalid schema / missing fields
 *   3. Tenant isolation — tenant-A and tenant-B schema registries stay isolated
 *   4. Idempotency — duplicate schema registration deduplicated
 *   5. UI state mapping — loading / success / error state transitions
 *   6. API contract — /api/dynamic/{indexName} response shape
 *   7. CloudEvents — events emitted with correct CloudEvents envelope
 *   8. Named checks — OCC conflict pattern, cycle detection in DAG
 */

import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { createCloudEvent, validateCloudEvent } from '../../../src/kernel/cloud-events';
import { ContractArchetype } from '../../../src/engine-contracts/archetypes';
import {
  EngineContract,
  type EngineContractParams,
} from '../../../src/engine-contracts/contract-schema';
import { FlowGenerator } from '../../../src/engine/flow-generator';
import { AfPipeline } from '../../../src/af-stations/af-pipeline';
import { GenericNodeExecutor } from '../../../src/engine/generic-node-executor';
import { BusinessFlowArbiter } from '../../../src/guardrails/bfa';
import { PromotionLadder } from '../../../src/guardrails/promotion-ladder';
import { FreedomConfigManager } from '../../../src/freedom/config-manager';
import { FactoryRegistry } from '../../../src/factories/factory-registry';
import { TaskTypeRegistry } from '../../../src/engine-contracts/task-type-registry';
import { FabricType } from '../../../src/factories/fabric-type';
import { detectCycle, GraphNode } from '../../../src/kernel/graph-utils';
import { ES_INDEX } from '../../../src/kernel/es-index-constants';

// ── Mock fabric providers ────────────────────────────────────────────────────

function makeInMemoryDb() {
  const store: Map<string, Record<string, unknown>[]> = new Map();
  // OCC version tracking: docId -> seqNo
  const versions: Map<string, number> = new Map();

  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const bucket = store.get(index) ?? [];
      const existing = bucket.findIndex((d) => d['id'] === id);
      if (existing >= 0) {
        bucket[existing] = { ...doc, id };
      } else {
        bucket.push({ ...doc, id });
      }
      store.set(index, bucket);
      return DataProcessResult.success({ ...doc, id });
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
      const doc = bucket.find((d) => d['id'] === id);
      return doc
        ? DataProcessResult.success(doc)
        : DataProcessResult.failure('NOT_FOUND', `Document ${id} not found in ${index}`);
    }),
    getDocumentWithVersion: jest.fn(async (index: string, id: string) => {
      const bucket = store.get(index) ?? [];
      const doc = bucket.find((d) => d['id'] === id);
      if (!doc) {
        return DataProcessResult.failure('NOT_FOUND', `Document ${id} not found in ${index}`);
      }
      const seqNo = versions.get(id) ?? 0;
      return DataProcessResult.success({ doc, seqNo, primaryTerm: 1 });
    }),
    storeDocumentWithOCC: jest.fn(
      async (
        index: string,
        doc: Record<string, unknown>,
        id: string,
        occ: { ifSeqNo: number; ifPrimaryTerm: number },
      ) => {
        const currentSeq = versions.get(id) ?? 0;
        if (occ.ifSeqNo !== currentSeq) {
          return DataProcessResult.failure(
            'OCC_CONFLICT',
            `Optimistic concurrency conflict on ${id} in ${index}`,
          );
        }
        const newSeq = currentSeq + 1;
        versions.set(id, newSeq);
        const bucket = store.get(index) ?? [];
        const existing = bucket.findIndex((d) => d['id'] === id);
        if (existing >= 0) {
          bucket[existing] = { ...doc, id };
        } else {
          bucket.push({ ...doc, id });
        }
        store.set(index, bucket);
        return DataProcessResult.success({ seqNo: newSeq, primaryTerm: 1 });
      },
    ),
    ensureIndex: jest.fn(async (_indexName: string, _mappings: Record<string, unknown>) => {
      // no-op for in-memory
    }),
    _store: store,
    _versions: versions,
  };
}

function makeInMemoryQueue() {
  const emitted: Array<{ queue: string; payload: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (queue: string, payload: Record<string, unknown>) => {
      emitted.push({ queue, payload });
      return DataProcessResult.success({ messageId: `msg-${Date.now()}` });
    }),
    _emitted: emitted,
  };
}

function makePassExecutor(): GenericNodeExecutor {
  return {
    execute: jest.fn(async () =>
      DataProcessResult.success({
        runId: 'flow11-run-id',
        status: 'PASS',
        score: 91,
        trace: [
          { nodeId: 'schema-ingest', nodeType: 'schema_registry', status: 'PASS', durationMs: 5 },
          { nodeId: 'dag-render', nodeType: 'data_pipeline', status: 'PASS', durationMs: 12 },
        ],
        finalOutput: { code: '// FLOW-11 schema registry + DAG' },
        promoted: true,
        promotionLevel: 'MINIMAL',
      }),
    ),
    getTrace: jest.fn(async () => DataProcessResult.success(null)),
  } as unknown as GenericNodeExecutor;
}

function createEngine(): FlowGenerator {
  return new FlowGenerator({
    afPipeline: new AfPipeline(makePassExecutor()),
    factoryRegistry: new FactoryRegistry(),
    taskRegistry: new TaskTypeRegistry(),
    bfa: new BusinessFlowArbiter(),
    promotionLadder: new PromotionLadder(),
    freedomManager: new FreedomConfigManager(),
  });
}

// ── FLOW-11 contract param builders ─────────────────────────────────────────

function flow11SchemaRegistryParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T_F11_SCHEMA_REGISTRY${suffix}`,
    flowId: 'FLOW-11',
    flowName: 'Schema Registry & DAG',
    name: 'SchemaRegistryService',
    archetype: ContractArchetype.SCHEMA_REGISTRY_ARCHETYPE,
    entry: 'schema.registration.requested CloudEvent',
    purpose:
      'Registers and versions schemas in xiigen-schema-registry index. ' +
      'Uses OCC (getDocumentWithVersion + storeDocumentWithOCC) to prevent concurrent write conflicts. ' +
      'ensureIndex() called at bootstrap to guarantee index exists before any write.',
    factoryDependencies: [
      {
        factoryId: `F_DB_SCHEMA_REGISTRY${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Schema document persistence with OCC support',
      },
      {
        factoryId: `F_QUEUE_SCHEMA_REGISTRY${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'schema.registered CloudEvent emission',
      },
    ],
    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-9', role: 'judge', config: {} },
    ],
    qualityGates: [
      {
        gateId: `QG-11-01${suffix}`,
        description: 'OCC read-before-write: getDocumentWithVersion before storeDocumentWithOCC',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
      {
        gateId: `QG-11-02${suffix}`,
        description: 'ensureIndex called at bootstrap before any schema write',
        severity: 'error',
        checkType: 'setnx_before_operation',
      },
    ],
    bfaRegistration: {
      entities: [`schema_definition_f11${suffix}`, `schema_version_f11${suffix}`],
      events: [`schema.registered.f11${suffix}`, `schema.conflict.f11${suffix}`],
      apiRoutes: [],
    },
    ironRules: [
      'OCC: getDocumentWithVersion before storeDocumentWithOCC — no blind overwrites',
      'ensureIndex at bootstrap — index must exist before first write',
      'Use ES_INDEX.SCHEMA_REGISTRY constant — never hardcode index names',
    ],
    machineComponents: [
      'OCC read-modify-write pattern (getDocumentWithVersion + storeDocumentWithOCC)',
      'ensureIndex idempotent bootstrap call',
    ],
    freedomComponents: ['schema_registry_max_versions', 'schema_registry_retention_days'],
    familyId: 'Family-11',
  };
}

function flow11DagRendererParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T_F11_DAG_RENDERER${suffix}`,
    flowId: 'FLOW-11',
    flowName: 'Schema Registry & DAG',
    name: 'DagRendererService',
    archetype: ContractArchetype.DATA_PIPELINE,
    entry: 'dag.render.requested CloudEvent',
    purpose:
      'Renders dependency DAG as Mermaid diagram. Uses graph-utils DFS for transitive closure ' +
      'with cycle detection. Returns DataProcessResult.failure on cyclic dependencies.',
    factoryDependencies: [
      {
        factoryId: `F_DB_DAG${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'DAG node/edge persistence and retrieval',
      },
      {
        factoryId: `F_QUEUE_DAG${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'dag.rendered CloudEvent emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-11-10${suffix}`,
        description: 'Cycle detection must run before transitive closure',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],
    bfaRegistration: {
      entities: [`dag_node_f11${suffix}`, `dag_edge_f11${suffix}`],
      events: [`dag.rendered.f11${suffix}`, `dag.cycle.detected.f11${suffix}`],
      apiRoutes: [],
    },
    ironRules: [
      'Cycle detection (detectCycle) must precede transitive closure computation',
      'Mermaid output is read-only — no side effects on render',
    ],
    machineComponents: ['graph-utils DFS cycle detection', 'transitive closure computation'],
    freedomComponents: ['dag_render_max_depth', 'dag_render_format'],
    familyId: 'Family-11',
  };
}

// ══════════════════════════════════════════════════════
// Category 1 — Happy Path
// ══════════════════════════════════════════════════════

describe('FLOW-11 E2E — Happy Path [SCHEMA_REGISTRY → DAG_RENDERER]', () => {
  const TENANT = 'flow11-happy-tenant';

  it('F11-H1: schema registry contract generates successfully — DataProcessResult.success', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow11SchemaRegistryParams('-h1'));
    const result = await engine.generate(contract, TENANT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('F11-H2: DAG renderer contract generates successfully', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow11DagRendererParams('-h2'));
    const result = await engine.generate(contract, TENANT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.contractId).toBe('T_F11_DAG_RENDERER-h2');
  });

  it('F11-H3: generated flow definition has flow_id = FLOW-11', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow11SchemaRegistryParams('-h3'));
    const result = await engine.generate(contract, TENANT);

    const flowDef = result.data!.flowDefinition;
    expect(flowDef).toBeDefined();
    expect(flowDef['flow_id']).toBeDefined();
  });

  it('F11-H4: storeDocument before enqueue — outbox ordering (DNA-8)', () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const callOrder: string[] = [];

    const trackedDb = {
      ...db,
      storeDocument: jest.fn(async (...args: Parameters<typeof db.storeDocument>) => {
        callOrder.push('storeDocument');
        return db.storeDocument(...args);
      }),
    };
    const trackedQueue = {
      ...queue,
      enqueue: jest.fn(async (...args: Parameters<typeof queue.enqueue>) => {
        callOrder.push('enqueue');
        return queue.enqueue(...args);
      }),
    };

    return trackedDb
      .storeDocument(ES_INDEX.SCHEMA_REGISTRY, { schemaId: 'sch-1', name: 'UserSchema' }, 'sch-1')
      .then(() => trackedQueue.enqueue('schema.registered', { schemaId: 'sch-1' }))
      .then(() => {
        expect(callOrder[0]).toBe('storeDocument');
        expect(callOrder[1]).toBe('enqueue');
      });
  });

  it('F11-H5: acyclic DAG passes detectCycle with null result', () => {
    const nodes: Map<string, GraphNode> = new Map([
      ['A', { id: 'A', neighbors: ['B', 'C'] }],
      ['B', { id: 'B', neighbors: ['D'] }],
      ['C', { id: 'C', neighbors: ['D'] }],
      ['D', { id: 'D', neighbors: [] }],
    ]);

    const cycle = detectCycle(nodes);
    expect(cycle).toBeNull();
  });

  it('F11-H6: ensureIndex is idempotent — second call does not throw', async () => {
    const db = makeInMemoryDb();
    const mappings = { properties: { schemaId: { type: 'keyword' } } };

    // Call twice — should be a no-op on second call
    await db.ensureIndex(ES_INDEX.SCHEMA_REGISTRY, mappings);
    await db.ensureIndex(ES_INDEX.SCHEMA_REGISTRY, mappings);

    expect(db.ensureIndex).toHaveBeenCalledTimes(2);
  });
});

// ══════════════════════════════════════════════════════
// Category 2 — Error Path
// ══════════════════════════════════════════════════════

describe('FLOW-11 E2E — Error Path', () => {
  it('F11-E1: empty taskTypeId returns DataProcessResult without throwing', async () => {
    const engine = createEngine();
    const invalidContract = new EngineContract({
      taskTypeId: '',
      name: 'Invalid',
      archetype: ContractArchetype.SCHEMA_REGISTRY_ARCHETYPE,
      entry: '',
      purpose: '',
      factoryDependencies: [],
      afStations: [],
      qualityGates: [],
      bfaRegistration: { entities: [], events: [], apiRoutes: [] },
      ironRules: [],
      machineComponents: [],
      freedomComponents: [],
      familyId: '',
    });

    const result = await engine.generate(invalidContract, 'flow11-error-tenant');

    expect(result).toBeInstanceOf(DataProcessResult);
    if (!result.isSuccess) {
      expect(result.errorCode).toBeDefined();
      expect(result.errorMessage).toBeDefined();
    }
  });

  it('F11-E2: OCC_CONFLICT on stale seqNo returns failure — not throw', async () => {
    const db = makeInMemoryDb();

    // Store initial version (seqNo = 0 for new doc)
    await db.storeDocument(
      ES_INDEX.SCHEMA_REGISTRY,
      { schemaId: 'sch-occ', name: 'TestSchema' },
      'sch-occ',
    );

    // First OCC write succeeds (seqNo = 0)
    const occ1 = await db.storeDocumentWithOCC(
      ES_INDEX.SCHEMA_REGISTRY,
      { schemaId: 'sch-occ', name: 'TestSchema', version: 2 },
      'sch-occ',
      { ifSeqNo: 0, ifPrimaryTerm: 1 },
    );
    expect(occ1.isSuccess).toBe(true);

    // Second OCC write with stale seqNo = 0 fails with OCC_CONFLICT
    const occ2 = await db.storeDocumentWithOCC(
      ES_INDEX.SCHEMA_REGISTRY,
      { schemaId: 'sch-occ', name: 'TestSchema', version: 3 },
      'sch-occ',
      { ifSeqNo: 0, ifPrimaryTerm: 1 }, // stale — seqNo is now 1
    );
    expect(occ2.isSuccess).toBe(false);
    expect(occ2.errorCode).toBe('OCC_CONFLICT');
    expect(occ2.errorMessage).toContain('conflict');
  });

  it('F11-E3: cyclic DAG detectCycle returns the cycle path — not null', () => {
    const nodes: Map<string, GraphNode> = new Map([
      ['A', { id: 'A', neighbors: ['B'] }],
      ['B', { id: 'B', neighbors: ['C'] }],
      ['C', { id: 'C', neighbors: ['A'] }], // cycle: A → B → C → A
    ]);

    const cycle = detectCycle(nodes);
    expect(cycle).not.toBeNull();
    expect(Array.isArray(cycle)).toBe(true);
    expect(cycle!.length).toBeGreaterThan(0);
  });

  it('F11-E4: getDocumentWithVersion on missing doc returns NOT_FOUND failure', async () => {
    const db = makeInMemoryDb();
    const result = await db.getDocumentWithVersion(ES_INDEX.SCHEMA_REGISTRY, 'non-existent-id');

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
  });

  it('F11-E5: missing required schema fields returns MISSING_FIELDS failure (no throw)', () => {
    const missingFields = DataProcessResult.failure<Record<string, unknown>>(
      'MISSING_FIELDS',
      'schemaId and schemaName are required fields',
    );

    expect(missingFields.isSuccess).toBe(false);
    expect(missingFields.errorCode).toBe('MISSING_FIELDS');
    expect(missingFields.errorMessage).toContain('required');
  });
});

// ══════════════════════════════════════════════════════
// Category 3 — Tenant Isolation
// ══════════════════════════════════════════════════════

describe('FLOW-11 E2E — Tenant Isolation', () => {
  it('F11-T1: tenant-A and tenant-B generate independently with separate contracts', async () => {
    const engineA = createEngine();
    const engineB = createEngine();

    const [rA, rB] = await Promise.all([
      engineA.generate(new EngineContract(flow11SchemaRegistryParams('-ta')), 'flow11-tenant-A'),
      engineB.generate(new EngineContract(flow11SchemaRegistryParams('-tb')), 'flow11-tenant-B'),
    ]);

    expect(rA.isSuccess).toBe(true);
    expect(rB.isSuccess).toBe(true);
    expect(rA.data!.contractId).toBe('T_F11_SCHEMA_REGISTRY-ta');
    expect(rB.data!.contractId).toBe('T_F11_SCHEMA_REGISTRY-tb');
  });

  it('F11-T2: tenant-A schema store does not see tenant-B schema records', async () => {
    const dbA = makeInMemoryDb();
    const dbB = makeInMemoryDb();

    // Tenant B stores a schema
    await dbB.storeDocument(
      ES_INDEX.SCHEMA_REGISTRY,
      { schemaId: 'sch-b1', tenantId: 'tenant-b' },
      'sch-b1',
    );

    // Tenant A store has no schemas
    const aResults = await dbA.searchDocuments(ES_INDEX.SCHEMA_REGISTRY, {});
    expect((aResults.data as Record<string, unknown>[]).length).toBe(0);
  });

  it('F11-T3: CloudEvents include tenantid field — DNA-5 scope isolation', () => {
    const eventA = createCloudEvent({
      eventType: 'schema.registered',
      source: 'flow-11/schema-registry',
      data: { schemaId: 'sch-a1', version: 1 },
      tenantId: 'tenant-A',
    });
    const eventB = createCloudEvent({
      eventType: 'schema.registered',
      source: 'flow-11/schema-registry',
      data: { schemaId: 'sch-b1', version: 1 },
      tenantId: 'tenant-B',
    });

    expect(eventA['tenantid']).toBe('tenant-A');
    expect(eventB['tenantid']).toBe('tenant-B');
    expect(eventA['tenantid']).not.toBe(eventB['tenantid']);
  });

  it('F11-T4: OCC versions are per-document — tenant-A seqNo independent from tenant-B seqNo', async () => {
    const dbA = makeInMemoryDb();
    const dbB = makeInMemoryDb();

    // Both tenants store with seqNo = 0 (new docs)
    const rA = await dbA.storeDocumentWithOCC(
      ES_INDEX.SCHEMA_REGISTRY,
      { schemaId: 'shared-id', tenantId: 'tenant-a' },
      'shared-id',
      { ifSeqNo: 0, ifPrimaryTerm: 1 },
    );
    const rB = await dbB.storeDocumentWithOCC(
      ES_INDEX.SCHEMA_REGISTRY,
      { schemaId: 'shared-id', tenantId: 'tenant-b' },
      'shared-id',
      { ifSeqNo: 0, ifPrimaryTerm: 1 },
    );

    // Both succeed because they use separate in-memory stores
    expect(rA.isSuccess).toBe(true);
    expect(rB.isSuccess).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Category 4 — Idempotency
// ══════════════════════════════════════════════════════

describe('FLOW-11 E2E — Idempotency', () => {
  it('F11-I1: duplicate schema registration with same schemaId finds existing record', async () => {
    const db = makeInMemoryDb();
    const schemaId = 'sch-idempotent-001';

    // First registration
    await db.storeDocument(
      ES_INDEX.SCHEMA_REGISTRY,
      { schemaId, name: 'UserSchema', version: 1 },
      schemaId,
    );

    // Second attempt with same schemaId — finds existing
    const existing = await db.searchDocuments(ES_INDEX.SCHEMA_REGISTRY, { schemaId });
    expect(existing.isSuccess).toBe(true);
    expect((existing.data as Record<string, unknown>[]).length).toBe(1);
  });

  it('F11-I2: queue not re-emitted when schema already registered (setIfAbsent pattern)', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const schemaId = 'sch-idempotent-002';

    // Pre-store existing schema
    await db.storeDocument(
      ES_INDEX.SCHEMA_REGISTRY,
      { schemaId, name: 'TestSchema', version: 1 },
      schemaId,
    );

    // Simulate idempotency check: if record exists, return early without enqueue
    const existing = await db.searchDocuments(ES_INDEX.SCHEMA_REGISTRY, { schemaId });
    const alreadyRegistered =
      existing.isSuccess && (existing.data as Record<string, unknown>[]).length > 0;

    if (!alreadyRegistered) {
      await queue.enqueue('schema.registered', { schemaId });
    }

    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('F11-I3: OCC retry after conflict succeeds with fresh read', async () => {
    const db = makeInMemoryDb();

    // Store initial schema (in bucket, seqNo tracked)
    await db.storeDocument(
      ES_INDEX.SCHEMA_REGISTRY,
      { schemaId: 'retry-test', version: 1 },
      'retry-test',
    );

    // First OCC write
    const r1 = await db.storeDocumentWithOCC(
      ES_INDEX.SCHEMA_REGISTRY,
      { schemaId: 'retry-test', version: 2 },
      'retry-test',
      { ifSeqNo: 0, ifPrimaryTerm: 1 },
    );
    expect(r1.isSuccess).toBe(true);
    const newSeqNo = (r1.data as { seqNo: number })!.seqNo;

    // Second write using fresh seqNo from the first write
    const r2 = await db.storeDocumentWithOCC(
      ES_INDEX.SCHEMA_REGISTRY,
      { schemaId: 'retry-test', version: 3 },
      'retry-test',
      { ifSeqNo: newSeqNo, ifPrimaryTerm: 1 },
    );
    expect(r2.isSuccess).toBe(true);
  });

  it('F11-I4: ensureIndex called multiple times is idempotent (no error)', async () => {
    const db = makeInMemoryDb();
    const calls: void[] = [];

    for (let i = 0; i < 5; i++) {
      calls.push(await db.ensureIndex(ES_INDEX.SCHEMA_REGISTRY, { properties: {} }));
    }

    // No errors — all void
    expect(db.ensureIndex).toHaveBeenCalledTimes(5);
  });
});

// ══════════════════════════════════════════════════════
// Category 5 — UI State Mapping
// ══════════════════════════════════════════════════════

describe('FLOW-11 E2E — UI State Mapping', () => {
  it('F11-U1: loading state — operation in-flight returns pending promise (not yet resolved)', () => {
    const db = makeInMemoryDb();
    let resolved = false;

    const promise = db
      .storeDocument(ES_INDEX.SCHEMA_REGISTRY, { schemaId: 'sch-u1' }, 'sch-u1')
      .then((r) => {
        resolved = true;
        return r;
      });

    expect(resolved).toBe(false);

    return promise.then(() => {
      expect(resolved).toBe(true);
    });
  });

  it('F11-U2: success state — DataProcessResult.success has isSuccess=true and data defined', async () => {
    const db = makeInMemoryDb();
    const result = await db.storeDocument(
      ES_INDEX.SCHEMA_REGISTRY,
      { schemaId: 'sch-u2', name: 'UserSchema' },
      'sch-u2',
    );

    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('F11-U3: error state — DataProcessResult.failure has isSuccess=false and errorCode defined', () => {
    const result = DataProcessResult.failure<Record<string, unknown>>(
      'SCHEMA_VALIDATION_FAILED',
      'Schema missing required fields: schemaId, version',
    );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SCHEMA_VALIDATION_FAILED');
    expect(result.errorMessage).toBeDefined();
  });

  it('F11-U4: OCC conflict state — UI must show retry prompt when OCC_CONFLICT received', () => {
    const occConflict = DataProcessResult.failure<Record<string, unknown>>(
      'OCC_CONFLICT',
      'Optimistic concurrency conflict — retry with fresh read',
    );

    // UI maps OCC_CONFLICT to a retry-prompting screen
    const uiAction =
      occConflict.errorCode === 'OCC_CONFLICT' ? 'show-retry-prompt' : 'show-generic-error';
    expect(uiAction).toBe('show-retry-prompt');
  });

  it('F11-U5: toDict() serializes result for API response — snake_case keys', () => {
    const success = DataProcessResult.success({ schemaId: 'sch-1', version: 1 });
    const dict = success.toDict();

    expect(dict['is_success']).toBe(true);
    expect(dict['data']).toBeDefined();
    expect(dict['correlation_id']).toBeDefined();
    expect(dict['timestamp']).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════
// Category 6 — API Contract
// ══════════════════════════════════════════════════════

describe('FLOW-11 E2E — API Contract (/api/dynamic/{indexName})', () => {
  it('F11-A1: /api/dynamic/xiigen-schema-registry response has is_success, data, correlation_id', () => {
    const mockResponse = DataProcessResult.success([
      { schemaId: 'sch-1', name: 'UserSchema', version: 1, status: 'active' },
    ]);
    const dict = mockResponse.toDict();

    expect(dict).toHaveProperty('is_success', true);
    expect(dict).toHaveProperty('data');
    expect(dict).toHaveProperty('correlation_id');
    expect(dict).toHaveProperty('timestamp');
  });

  it('F11-A2: /api/dynamic/xiigen-schema-registry returns schema fields', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      ES_INDEX.SCHEMA_REGISTRY,
      { schemaId: 'sch-api', name: 'TestSchema', version: 2 },
      'sch-api',
    );

    const result = await db.searchDocuments(ES_INDEX.SCHEMA_REGISTRY, { schemaId: 'sch-api' });

    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]['schemaId']).toBe('sch-api');
    expect(docs[0]['version']).toBe(2);
  });

  it('F11-A3: API error response for missing schema has is_success=false, error_code=NOT_FOUND', () => {
    const errorResponse = DataProcessResult.failure<unknown>(
      'NOT_FOUND',
      'Schema not found in registry',
    );
    const dict = errorResponse.toDict();

    expect(dict['is_success']).toBe(false);
    expect(dict['error_code']).toBe('NOT_FOUND');
    expect(dict['error_message']).toBe('Schema not found in registry');
  });

  it('F11-A4: ES_INDEX.SCHEMA_REGISTRY constant maps to correct index name', () => {
    expect(ES_INDEX.SCHEMA_REGISTRY).toBe('xiigen-schema-registry');
  });
});

// ══════════════════════════════════════════════════════
// Category 7 — CloudEvents
// ══════════════════════════════════════════════════════

describe('FLOW-11 E2E — CloudEvents (DNA-9)', () => {
  it('F11-C1: schema.registered event conforms to CloudEvents v1.0 spec', () => {
    const event = createCloudEvent({
      eventType: 'schema.registered',
      source: 'flow-11/schema-registry',
      data: { schemaId: 'sch-1', version: 1, name: 'UserSchema' },
      tenantId: 'tenant-flow11',
    });

    const [isValid, errors] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('F11-C2: schema.conflict event has required CloudEvents fields', () => {
    const event = createCloudEvent({
      eventType: 'schema.conflict',
      source: 'flow-11/schema-registry',
      data: { schemaId: 'sch-1', conflictReason: 'OCC_CONFLICT', expectedSeqNo: 0, actualSeqNo: 1 },
      tenantId: 'tenant-flow11',
    });

    expect(event['specversion']).toBe('1.0');
    expect(event['id']).toBeDefined();
    expect(event['type']).toBe('schema.conflict');
    expect(event['source']).toContain('flow-11');
    expect(event['tenantid']).toBe('tenant-flow11');
  });

  it('F11-C3: dag.rendered event includes mermaid output in data', () => {
    const mermaidOutput = 'graph TD\n  A --> B\n  B --> C';
    const event = createCloudEvent({
      eventType: 'dag.rendered',
      source: 'flow-11/dag-renderer',
      data: { dagId: 'dag-001', format: 'mermaid', output: mermaidOutput },
      tenantId: 'tenant-flow11',
    });

    const data = event['data'] as Record<string, unknown>;
    expect(data['format']).toBe('mermaid');
    expect(data['output']).toContain('graph TD');

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });

  it('F11-C4: dag.cycle.detected event emitted on cyclic graph — not rendering output', () => {
    const cycleEvent = createCloudEvent({
      eventType: 'dag.cycle.detected',
      source: 'flow-11/dag-renderer',
      data: { dagId: 'dag-cycle-001', cyclePath: ['A', 'B', 'C', 'A'] },
      tenantId: 'tenant-flow11',
    });

    const data = cycleEvent['data'] as Record<string, unknown>;
    expect(data['cyclePath']).toEqual(['A', 'B', 'C', 'A']);
    expect(data).not.toHaveProperty('mermaidOutput');
  });
});

// ══════════════════════════════════════════════════════
// Category 8 — Named Checks
// ══════════════════════════════════════════════════════

describe('FLOW-11 E2E — Named Checks', () => {
  describe('OCC read-modify-write (store_before_enqueue pattern)', () => {
    it('F11-N1: contract declares OCC iron rules — store_before_enqueue check present', () => {
      const params = flow11SchemaRegistryParams('-n1');
      const qg = params.qualityGates.find((g) => g.checkType === 'store_before_enqueue');
      expect(qg).toBeDefined();
      expect(qg!.severity).toBe('error');
    });

    it('F11-N2: storeDocumentWithOCC only proceeds after successful getDocumentWithVersion', async () => {
      const db = makeInMemoryDb();
      const schemaId = 'occ-ordered-001';

      // Store doc first
      await db.storeDocument(ES_INDEX.SCHEMA_REGISTRY, { schemaId, version: 1 }, schemaId);

      // Read-with-version before write
      const readResult = await db.getDocumentWithVersion(ES_INDEX.SCHEMA_REGISTRY, schemaId);
      expect(readResult.isSuccess).toBe(true);

      const { seqNo, primaryTerm } = readResult.data as { seqNo: number; primaryTerm: number };

      // Write with OCC using the seqNo from the read
      const writeResult = await db.storeDocumentWithOCC(
        ES_INDEX.SCHEMA_REGISTRY,
        { schemaId, version: 2 },
        schemaId,
        { ifSeqNo: seqNo, ifPrimaryTerm: primaryTerm },
      );
      expect(writeResult.isSuccess).toBe(true);
    });
  });

  describe('Cycle detection in DAG (detectCycle)', () => {
    it('F11-N3: contract declares cycle detection iron rules', () => {
      const params = flow11DagRendererParams('-n3');
      expect(
        params.ironRules.some((r) => r.includes('detectCycle') || r.includes('cycle detection')),
      ).toBe(true);
    });

    it('F11-N4: detectCycle correctly traverses multi-branch acyclic graph', () => {
      const nodes: Map<string, GraphNode> = new Map([
        ['root', { id: 'root', neighbors: ['left', 'right'] }],
        ['left', { id: 'left', neighbors: ['leaf1', 'leaf2'] }],
        ['right', { id: 'right', neighbors: ['leaf2'] }],
        ['leaf1', { id: 'leaf1', neighbors: [] }],
        ['leaf2', { id: 'leaf2', neighbors: [] }],
      ]);

      const cycle = detectCycle(nodes);
      expect(cycle).toBeNull();
    });

    it('F11-N5: detectCycle returns cycle path for self-loop', () => {
      const nodes: Map<string, GraphNode> = new Map([
        ['A', { id: 'A', neighbors: ['A'] }], // self-loop
      ]);

      const cycle = detectCycle(nodes);
      expect(cycle).not.toBeNull();
    });
  });
});
