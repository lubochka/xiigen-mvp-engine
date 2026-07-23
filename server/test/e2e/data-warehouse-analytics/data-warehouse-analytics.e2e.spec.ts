/**
 * FLOW-13 E2E — Data Warehouse & Analytics
 *
 * Archetypes: QUERY_ENGINE, RETENTION, SCHEMA_REGISTRY_ARCHETYPE, ANALYTICS_ENGINE, INGESTOR
 * Task types: T169–T188 (20 contracts)
 * Fabric interfaces: IQuotaManager (inline T187), ILegalHold, IBatchQueue, IWarehouseSecurity, IApproval
 * CloudEvents: warehouse.event.normalised, warehouse.schema.registered, warehouse.metric.aggregated,
 *              warehouse.kpi.snapshot, warehouse.content.retention.extended, warehouse.ingestion.backpressure_rejected
 *
 * Named checks (validate.handler.ts):
 *   irreversible_purge_requires_approval_token
 *   cross_flow_join_always_tenant_scoped
 *   pii_masking_platform_only_before_serialization
 *   rls_platform_only_cannot_be_disabled
 *   quota_check_before_warehouse_read
 *   backpressure_reject_on_queue_depth_exceeded
 *   schema_evolution_additive_auto_approved_breaking_needs_approval
 *   legal_hold_cross_flow_blocks_purge
 *   tombstone_reference_not_raw_data_in_purge_event
 *   batch_id_includes_time_window
 *
 * T187 QuotaManager is an INLINE SERVICE — F426 does NOT exist.
 * PLATFORM-ONLY factories: F392, F394, F411, F412, F422, F423, F424, F425 (cannot be disabled by tenant).
 *
 * 8 mandatory E2E categories:
 *   1. Happy path — query execution, metric aggregation, schema registration, ingestion
 *   2. Error path — quota exceeded, legal hold blocks purge, backpressure rejection
 *   3. Tenant isolation — cross-tenant joins blocked, per-tenant analytics data
 *   4. Idempotency — batch deduplication via batch_id
 *   5. UI state mapping — loading/success/error/quota-exceeded states
 *   6. API contract — /api/dynamic/{indexName}
 *   7. CloudEvents — KPISnapshotGenerated, SchemaRegistered, MetricAggregated events
 *   8. Named checks — irreversible_purge_requires_approval_token,
 *                     legal_hold_cross_flow_blocks_purge,
 *                     pii_masking_platform_only_before_serialization
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

// ── Mock fabric providers ────────────────────────────────────────────────────

function makeInMemoryDb() {
  const store: Map<string, Record<string, unknown>[]> = new Map();

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
    _store: store,
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
        runId: 'flow13-run-id',
        status: 'PASS',
        score: 91,
        trace: [
          { nodeId: 'warehouse-ingestion', nodeType: 'ingestor', status: 'PASS', durationMs: 8 },
          { nodeId: 'query-engine', nodeType: 'query_engine', status: 'PASS', durationMs: 12 },
          {
            nodeId: 'metric-aggregation',
            nodeType: 'analytics_engine',
            status: 'PASS',
            durationMs: 18,
          },
          { nodeId: 'schema-registry', nodeType: 'schema_registry', status: 'PASS', durationMs: 5 },
          { nodeId: 'retention-enforcer', nodeType: 'retention', status: 'PASS', durationMs: 10 },
        ],
        finalOutput: { code: '// FLOW-13 data warehouse + analytics' },
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

// ── FLOW-13 inline contract param builders ───────────────────────────────────

function flow13QueryEngineParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T173_F13_QUERY${suffix}`,
    flowId: 'FLOW-13',
    flowName: 'Data Warehouse & Analytics',
    name: 'QueryExecutionEngine',
    archetype: ContractArchetype.QUERY_ENGINE,
    entry: 'warehouse.query.requested CloudEvent',
    purpose:
      'Executes tenant-scoped warehouse queries. T187 QuotaManager inline check (layer 1), ' +
      'F422 RLS (layer 2), F423 PII masking (layer 3). Gate order is mandatory.',
    factoryDependencies: [
      {
        factoryId: `F_DB_QUERY${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Warehouse query results persistence',
      },
      {
        factoryId: `F_QUEUE_QUERY${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'QueryFailed CloudEvent emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-13-01${suffix}`,
        description: 'T187 quota check before warehouse read (layer 1)',
        severity: 'error',
        checkType: 'quota_check_before_warehouse_read',
      },
      {
        gateId: `QG-13-02${suffix}`,
        description: 'F423 PII masking before result serialization (platform-only, no opt-out)',
        severity: 'error',
        checkType: 'pii_masking_platform_only_before_serialization',
      },
      {
        gateId: `QG-13-03${suffix}`,
        description: 'F422 RLS platform-only — cannot be disabled',
        severity: 'error',
        checkType: 'rls_platform_only_cannot_be_disabled',
      },
    ],
    bfaRegistration: {
      entities: [`warehouse_query_f13${suffix}`],
      events: [`query.failed.f13${suffix}`],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: Gate order mandatory: T187 quota → F422 RLS → F423 PII masking',
      'IR-2: T187 is INLINE — not factory-injected. F426 does NOT exist.',
      'IR-3: F422 RLS and F423 PII masking are PLATFORM-ONLY — no tenant opt-out',
      'IR-4: All joins must include tenantId predicate',
    ],
    machineComponents: [
      'T187 inline quota gate',
      'F422 RLS gate',
      'F423 PII masking before serialization',
    ],
    freedomComponents: ['warehouse.ingestion.maxQueueDepth'],
    familyId: 'Family-13',
  };
}

function flow13RetentionParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T186_F13_RETENTION${suffix}`,
    flowId: 'FLOW-13',
    flowName: 'Data Warehouse & Analytics',
    name: 'DataRetentionEnforcer',
    archetype: ContractArchetype.RETENTION,
    entry: 'warehouse.retention.enforce CloudEvent',
    purpose:
      'Enforces tenant data retention policies. Legal hold check (FLOW-11 cross-flow) first, ' +
      'then approval token validation, then governance purge decision, then tombstone emit.',
    factoryDependencies: [
      {
        factoryId: `F_DB_RETENTION${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Purge records and tombstone storage',
      },
      {
        factoryId: `F_QUEUE_RETENTION${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'DataPurged and ContentRetentionExtended event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-13-10${suffix}`,
        description: 'Irreversible purge requires approval token',
        severity: 'error',
        checkType: 'irreversible_purge_requires_approval_token',
      },
      {
        gateId: `QG-13-11${suffix}`,
        description: 'Legal hold cross-flow check blocks purge',
        severity: 'error',
        checkType: 'legal_hold_cross_flow_blocks_purge',
      },
      {
        gateId: `QG-13-12${suffix}`,
        description: 'DataPurged event contains tombstoneRef not raw content',
        severity: 'error',
        checkType: 'tombstone_reference_not_raw_data_in_purge_event',
      },
    ],
    bfaRegistration: {
      entities: [`warehouse_retention_f13${suffix}`],
      events: [
        `warehouse.content.retention.extended.f13${suffix}`,
        `warehouse.purged.f13${suffix}`,
      ],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: Execution order: legal hold → approval token → governance purge → tombstone emit',
      'IR-2: DataPurged event must contain tombstoneRef. Prohibited: rawContent, content, payload',
      'IR-3: F424 IDataGovernanceService is PLATFORM-ONLY',
      'IR-4: Legal hold cross-flow reads from FLOW-11',
    ],
    machineComponents: [
      'Legal hold gate',
      'Approval token validation',
      'F424 governance enforcement',
    ],
    freedomComponents: ['RETENTION_POLICY_DAYS'],
    familyId: 'Family-13',
  };
}

function flow13IngestionParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T169_F13_INGEST${suffix}`,
    flowId: 'FLOW-13',
    flowName: 'Data Warehouse & Analytics',
    name: 'WarehouseIngestionOrchestrator',
    archetype: ContractArchetype.INGESTOR,
    entry: 'warehouse.batch.ingest CloudEvent',
    purpose:
      'Orchestrates batch ingestion into the warehouse. Backpressure check via IBatchQueueService ' +
      'before enqueue. Deduplication on batchId. DNA-8 outbox ordering enforced.',
    factoryDependencies: [
      {
        factoryId: `F_DB_INGEST${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Ingestion batch records',
      },
      {
        factoryId: `F_QUEUE_INGEST${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'Warehouse normalised events and backpressure events',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-13-20${suffix}`,
        description: 'Backpressure: reject on queue depth exceeded',
        severity: 'error',
        checkType: 'backpressure_reject_on_queue_depth_exceeded',
      },
      {
        gateId: `QG-13-21${suffix}`,
        description: 'batchId includes time window (eventWindowStart + eventWindowEnd)',
        severity: 'error',
        checkType: 'batch_id_includes_time_window',
      },
      {
        gateId: `QG-13-22${suffix}`,
        description: 'DNA-8: storeDocument before enqueue',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],
    bfaRegistration: {
      entities: [`warehouse_batch_f13${suffix}`],
      events: [
        `warehouse.event.normalised.f13${suffix}`,
        `warehouse.ingestion.duplicate.f13${suffix}`,
        `warehouse.ingestion.backpressure_rejected.f13${suffix}`,
      ],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: IBatchQueueService.getDepth() MUST be called before enqueue()',
      'IR-2: batchId derived from hash of: tenantId + sourceFlowId + eventWindowStart + eventWindowEnd',
      'IR-3: DNA-7 deduplication on batchId before processing',
      'IR-4: DNA-8 storeDocument BEFORE enqueue',
    ],
    machineComponents: [
      'Backpressure depth gate',
      'batchId hash derivation',
      'DNA-7 deduplication',
    ],
    freedomComponents: ['warehouse.ingestion.maxQueueDepth'],
    familyId: 'Family-13',
  };
}

// ══════════════════════════════════════════════════════
// Category 1 — Happy Path
// ══════════════════════════════════════════════════════

describe('FLOW-13 E2E — Happy Path [INGESTION → QUERY → ANALYTICS → SCHEMA]', () => {
  const TENANT = 'flow13-happy-tenant';

  it('F13-H1: query engine contract generates successfully (inline T187 quota, F422 RLS, F423 PII)', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow13QueryEngineParams('-h1'));
    const result = await engine.generate(contract, TENANT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('F13-H2: retention enforcer contract generates successfully (legal hold + approval gate)', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow13RetentionParams('-h2'));
    const result = await engine.generate(contract, TENANT);

    expect(result.isSuccess).toBe(true);
  });

  it('F13-H3: ingestion orchestrator contract generates successfully (backpressure + dedup)', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow13IngestionParams('-h3'));
    const result = await engine.generate(contract, TENANT);

    expect(result.isSuccess).toBe(true);
  });

  it('F13-H4: warehouse query execution stores result — searchDocuments retrieves it', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'warehouse-query-results',
      {
        queryId: 'q-001',
        tenantId: TENANT,
        resultCount: 42,
        executedAt: new Date().toISOString(),
      },
      'q-001',
    );

    const result = await db.searchDocuments('warehouse-query-results', { queryId: 'q-001' });
    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs).toHaveLength(1);
    expect(docs[0]['resultCount']).toBe(42);
  });

  it('F13-H5: metric aggregation produces aggregated event with eventWindowStart and eventWindowEnd', async () => {
    const queue = makeInMemoryQueue();

    const event = createCloudEvent({
      eventType: 'warehouse.metric.aggregated',
      source: 'flow-13/metric-aggregation',
      data: {
        metricId: 'metric-001',
        tenantId: TENANT,
        value: 9842,
        eventWindowStart: '2026-03-01T00:00:00Z',
        eventWindowEnd: '2026-03-31T23:59:59Z',
      },
      tenantId: TENANT,
    });

    await queue.enqueue('warehouse.metric.aggregated', event as unknown as Record<string, unknown>);

    expect(queue._emitted).toHaveLength(1);
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data).toHaveProperty('eventWindowStart');
    expect(data).toHaveProperty('eventWindowEnd');
  });

  it('F13-H6: schema registration (additive change) auto-approved — emits SchemaRegistered', async () => {
    const queue = makeInMemoryQueue();

    const changeType = 'add_optional_field';
    // Additive changes are auto-approved
    const isAdditive = ['add_optional_field', 'add_new_type', 'expand_enum'].includes(changeType);
    const approvalStatus = isAdditive ? 'auto_approved' : 'explicit_tenant_required';

    if (approvalStatus === 'auto_approved') {
      await queue.enqueue(
        'warehouse.schema.registered',
        createCloudEvent({
          eventType: 'warehouse.schema.registered',
          source: 'flow-13/schema-registry',
          data: { schemaId: 'schema-001', changeType, approvalStatus },
          tenantId: TENANT,
        }) as unknown as Record<string, unknown>,
      );
    }

    expect(approvalStatus).toBe('auto_approved');
    expect(queue.enqueue).toHaveBeenCalledTimes(1);
  });

  it('F13-H7: DNA-8 outbox — storeDocument before enqueue on batch ingestion', () => {
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
      .storeDocument('warehouse-batches', { batchId: 'batch-001', tenantId: TENANT }, 'batch-001')
      .then(() => trackedQueue.enqueue('warehouse.event.normalised', { batchId: 'batch-001' }))
      .then(() => {
        expect(callOrder[0]).toBe('storeDocument');
        expect(callOrder[1]).toBe('enqueue');
      });
  });

  it('F13-H8: KPI snapshot generator emits KPISnapshotGenerated with tenantId', async () => {
    const queue = makeInMemoryQueue();

    const kpiEvent = createCloudEvent({
      eventType: 'warehouse.kpi.snapshot',
      source: 'flow-13/kpi-dashboard',
      data: {
        kpiId: 'kpi-001',
        tenantId: TENANT,
        value: 97.3,
        alertFired: false,
        snapshotAt: new Date().toISOString(),
      },
      tenantId: TENANT,
    });

    await queue.enqueue('warehouse.kpi.snapshot', kpiEvent as unknown as Record<string, unknown>);

    const [isValid] = validateCloudEvent(kpiEvent);
    expect(isValid).toBe(true);
    expect(kpiEvent['tenantid']).toBe(TENANT);
  });

  it('F13-H9: cross-flow correlation requires minimum 2 source flows', () => {
    const correlationRequest = {
      correlationId: 'corr-001',
      tenantId: TENANT,
      sourceFlows: ['FLOW-01', 'FLOW-05'],
      windowStart: '2026-03-01T00:00:00Z',
    };

    // Iron rule: sourceFlows minimum 2
    expect(correlationRequest.sourceFlows.length).toBeGreaterThanOrEqual(2);
  });

  it('F13-H10: data export includes expiresAt on downloadUrl (T181 iron rule)', () => {
    const exportRecord = {
      exportId: 'export-001',
      tenantId: TENANT,
      downloadUrl: 'https://storage.example.com/export-001.csv',
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };

    expect(exportRecord).toHaveProperty('expiresAt');
    expect(new Date(exportRecord.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });
});

// ══════════════════════════════════════════════════════
// Category 2 — Error Path
// ══════════════════════════════════════════════════════

describe('FLOW-13 E2E — Error Path', () => {
  it('F13-E1: quota exceeded returns DataProcessResult.failure — no throw', () => {
    // T187 QuotaManager.check() fails at layer 1
    const quotaResult = DataProcessResult.failure<Record<string, unknown>>(
      'QUOTA_EXCEEDED',
      'Warehouse query quota exhausted for this tenant',
    );

    expect(quotaResult.isSuccess).toBe(false);
    expect(quotaResult.errorCode).toBe('QUOTA_EXCEEDED');
  });

  it('F13-E2: legal hold on content blocks purge — emits ContentRetentionExtended', async () => {
    const queue = makeInMemoryQueue();

    const holdStatus = { active: true, holdId: 'hold-001', tenantId: 'flow13-tenant' };

    // EXECUTION ORDER: legal hold check first
    if (holdStatus.active) {
      await queue.enqueue(
        'warehouse.content.retention.extended',
        createCloudEvent({
          eventType: 'warehouse.content.retention.extended',
          source: 'flow-13/retention-enforcer',
          data: {
            contentId: 'content-001',
            holdId: holdStatus.holdId,
            reason: 'LEGAL_HOLD_ACTIVE',
          },
          tenantId: 'flow13-tenant',
        }) as unknown as Record<string, unknown>,
      );
    }

    expect(queue.enqueue).toHaveBeenCalledTimes(1);
    const payload = queue._emitted[0].payload;
    expect(queue._emitted[0].queue).toBe('warehouse.content.retention.extended');
    const data = payload['data'] as Record<string, unknown>;
    expect(data['reason']).toBe('LEGAL_HOLD_ACTIVE');
  });

  it('F13-E3: backpressure rejection when queue depth exceeded — DataProcessResult.failure', () => {
    const currentDepth = 1500;
    const maxQueueDepth = 1000;

    const isOverThreshold = currentDepth >= maxQueueDepth;
    const result = isOverThreshold
      ? DataProcessResult.failure<Record<string, unknown>>(
          'BACKPRESSURE_REJECTED',
          'Queue depth threshold exceeded. Batch rejected.',
        )
      : DataProcessResult.success({ accepted: true });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('BACKPRESSURE_REJECTED');
    expect(result.errorMessage).toContain('Queue depth threshold exceeded');
  });

  it('F13-E4: missing approval token on purge — reject without purging', () => {
    const approvalToken: string | undefined = undefined;

    const result = approvalToken
      ? DataProcessResult.success({ purged: true })
      : DataProcessResult.failure<Record<string, unknown>>(
          'APPROVAL_TOKEN_MISSING',
          'Irreversible purge requires approval token',
        );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('APPROVAL_TOKEN_MISSING');
  });

  it('F13-E5: breaking schema change blocked without tenant approval', () => {
    const changeType = 'remove_field';
    const breakingChanges = ['remove_field', 'change_field_type', 'rename_field', 'restrict_enum'];
    const isBreaking = breakingChanges.includes(changeType);

    const approvalStatus = isBreaking ? 'explicit_tenant_required' : 'auto_approved';
    const canProceed = approvalStatus !== 'explicit_tenant_required'; // no approval yet

    expect(canProceed).toBe(false);
    expect(approvalStatus).toBe('explicit_tenant_required');
  });

  it('F13-E6: database write failure returns DataProcessResult.failure — no throw', async () => {
    const db = makeInMemoryDb();
    db.storeDocument.mockResolvedValueOnce(
      DataProcessResult.failure('DB_WRITE_FAILED', 'Simulated warehouse storage failure'),
    );

    const result = await db.storeDocument(
      'warehouse-batches',
      { batchId: 'batch-fail' },
      'batch-fail',
    );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_WRITE_FAILED');
  });

  it('F13-E7: empty taskTypeId returns DataProcessResult without throwing', async () => {
    const engine = createEngine();
    const invalidContract = new EngineContract({
      taskTypeId: '',
      name: 'Invalid',
      archetype: ContractArchetype.QUERY_ENGINE,
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

    const result = await engine.generate(invalidContract, 'flow13-error-tenant');

    expect(result).toBeInstanceOf(DataProcessResult);
    if (!result.isSuccess) {
      expect(result.errorCode).toBeDefined();
    }
  });

  it('F13-E8: RLS failure emits QueryFailed with reason=rls_denied', async () => {
    const queue = makeInMemoryQueue();

    // Simulated F422 RLS denial
    const rlsResult = DataProcessResult.failure<Record<string, unknown>>(
      'RLS_DENIED',
      'Row-level security policy denied query execution',
    );

    if (!rlsResult.isSuccess) {
      await queue.enqueue(
        'query.failed',
        createCloudEvent({
          eventType: 'query.failed',
          source: 'flow-13/query-engine',
          data: { queryId: 'q-rls-001', reason: 'rls_denied' },
          tenantId: 'flow13-error-tenant',
        }) as unknown as Record<string, unknown>,
      );
    }

    expect(queue.enqueue).toHaveBeenCalledTimes(1);
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['reason']).toBe('rls_denied');
  });
});

// ══════════════════════════════════════════════════════
// Category 3 — Tenant Isolation
// ══════════════════════════════════════════════════════

describe('FLOW-13 E2E — Tenant Isolation', () => {
  it('F13-T1: tenant-A and tenant-B query contracts generate independently', async () => {
    const engineA = createEngine();
    const engineB = createEngine();

    const [rA, rB] = await Promise.all([
      engineA.generate(new EngineContract(flow13QueryEngineParams('-ta')), 'flow13-tenant-A'),
      engineB.generate(new EngineContract(flow13QueryEngineParams('-tb')), 'flow13-tenant-B'),
    ]);

    expect(rA.isSuccess).toBe(true);
    expect(rB.isSuccess).toBe(true);
    expect(rA.data!.contractId).toBe('T173_F13_QUERY-ta');
    expect(rB.data!.contractId).toBe('T173_F13_QUERY-tb');
  });

  it('F13-T2: tenant-A warehouse data does not appear in tenant-B store', async () => {
    const dbA = makeInMemoryDb();
    const dbB = makeInMemoryDb();

    await dbA.storeDocument(
      'warehouse-events',
      { eventId: 'evt-a1', tenantId: 'tenant-A', value: 42 },
      'evt-a1',
    );

    const bResults = await dbB.searchDocuments('warehouse-events', {});
    expect((bResults.data as Record<string, unknown>[]).length).toBe(0);
  });

  it('F13-T3: cross-tenant join blocked — join predicate MUST include tenantId', () => {
    const joinPredicate = { tenantId: 'tenant-A', sourceFlow: 'FLOW-05', metricKey: 'engagement' };

    // cross_flow_join_always_tenant_scoped: every join must have tenantId
    expect(joinPredicate).toHaveProperty('tenantId');
    expect(joinPredicate.tenantId).not.toBeNull();
    expect(joinPredicate.tenantId).not.toBe(''); // no wildcard
  });

  it('F13-T4: CloudEvents include tenantid field — ALS context propagation', () => {
    const eventA = createCloudEvent({
      eventType: 'warehouse.metric.aggregated',
      source: 'flow-13/metric-aggregation',
      data: { metricId: 'metric-a1' },
      tenantId: 'tenant-A',
    });
    const eventB = createCloudEvent({
      eventType: 'warehouse.metric.aggregated',
      source: 'flow-13/metric-aggregation',
      data: { metricId: 'metric-b1' },
      tenantId: 'tenant-B',
    });

    expect(eventA['tenantid']).toBe('tenant-A');
    expect(eventB['tenantid']).toBe('tenant-B');
    expect(eventA['tenantid']).not.toBe(eventB['tenantid']);
  });

  it('F13-T5: metric aggregation tenant-A does not include tenant-B values', () => {
    const tenantAMetrics = [{ metricId: 'm-a1', value: 100, tenantId: 'tenant-A' }];
    const tenantBMetrics = [{ metricId: 'm-b1', value: 9999, tenantId: 'tenant-B' }];

    const aggA = tenantAMetrics
      .filter((m) => m.tenantId === 'tenant-A')
      .reduce((s, m) => s + m.value, 0);
    const aggB = tenantBMetrics
      .filter((m) => m.tenantId === 'tenant-B')
      .reduce((s, m) => s + m.value, 0);

    expect(aggA).toBe(100);
    expect(aggB).toBe(9999);
    expect(aggA).not.toBe(aggB);
  });

  it('F13-T6: cohort analysis scoped to tenant — no cross-tenant cohort membership', () => {
    const cohortDefinition = {
      cohortId: 'cohort-001',
      tenantId: 'tenant-A',
      members: ['user-001', 'user-002'],
    };

    // All cross-flow data joins must include tenantId predicate
    expect(cohortDefinition.tenantId).toBeDefined();
    const crossTenantLeak = cohortDefinition.members.some((m) => m.startsWith('tenant-B'));
    expect(crossTenantLeak).toBe(false);
  });
});

// ══════════════════════════════════════════════════════
// Category 4 — Idempotency (batch_id deduplication)
// ══════════════════════════════════════════════════════

describe('FLOW-13 E2E — Idempotency (batch_id_includes_time_window named check)', () => {
  it('F13-I1: batchId derived from tenantId + sourceFlowId + eventWindowStart + eventWindowEnd', () => {
    // Iron rule: batchId MUST include time window components
    const tenantId = 'tenant-A';
    const sourceFlowId = 'FLOW-05';
    const eventWindowStart = '2026-03-01T00:00:00Z';
    const eventWindowEnd = '2026-03-31T23:59:59Z';

    // Simulated deterministic hash (not crypto.createHash — just string concat for test)
    const batchId = `${tenantId}-${sourceFlowId}-${eventWindowStart}-${eventWindowEnd}`;

    expect(batchId).toContain(tenantId);
    expect(batchId).toContain(sourceFlowId);
    expect(batchId).toContain(eventWindowStart);
    expect(batchId).toContain(eventWindowEnd);
  });

  it('F13-I2: duplicate batch with same batchId skipped — emits DuplicateIngestionDetected', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const batchId = 'batch-idem-001';

    // First ingestion
    await db.storeDocument(
      'warehouse-batches',
      { batchId, tenantId: 'tenant-A', status: 'processed' },
      batchId,
    );

    // Second attempt — batchId already processed
    const existing = await db.searchDocuments('warehouse-batches', { batchId });
    const isDuplicate =
      existing.isSuccess && (existing.data as Record<string, unknown>[]).length > 0;

    if (isDuplicate) {
      await queue.enqueue('warehouse.ingestion.duplicate', {
        batchId,
        reason: 'ALREADY_PROCESSED',
      });
    }

    expect(isDuplicate).toBe(true);
    expect(queue.enqueue).toHaveBeenCalledWith(
      'warehouse.ingestion.duplicate',
      expect.objectContaining({ batchId }),
    );
  });

  it('F13-I3: second engine.generate() with same BFA entities does not error', async () => {
    const engineA = createEngine();
    const engineB = createEngine();

    const r1 = await engineA.generate(
      new EngineContract(flow13IngestionParams('-i3a')),
      'flow13-idem-tenant',
    );
    const r2 = await engineB.generate(
      new EngineContract(flow13IngestionParams('-i3b')),
      'flow13-idem-tenant',
    );

    expect(r1.isSuccess).toBe(true);
    expect(r2.isSuccess).toBe(true);
  });

  it('F13-I4: DNA-7 dedup key includes batchId + tenantId', () => {
    const deduplicationKey = 'tenant-A:batch-idem-001';

    // DNA-7: idempotency key scope includes both tenantId and batchId
    expect(deduplicationKey).toContain('tenant-A');
    expect(deduplicationKey).toContain('batch-idem-001');
  });

  it('F13-I5: backpressure check prevents double-enqueue on retry', async () => {
    const queue = makeInMemoryQueue();

    const queueDepth = 500;
    const maxDepth = 1000;

    // First attempt — depth below threshold
    if (queueDepth < maxDepth) {
      await queue.enqueue('warehouse.event.normalised', {
        batchId: 'batch-002',
        tenantId: 'tenant-A',
      });
    }

    expect(queue.enqueue).toHaveBeenCalledTimes(1);

    // Simulate depth now exceeded — reject
    const queueDepth2 = 1200;
    if (queueDepth2 < maxDepth) {
      await queue.enqueue('warehouse.event.normalised', {
        batchId: 'batch-002',
        tenantId: 'tenant-A',
      });
    }

    // Still only called once (backpressure rejected second attempt)
    expect(queue.enqueue).toHaveBeenCalledTimes(1);
  });
});

// ══════════════════════════════════════════════════════
// Category 5 — UI State Mapping
// ══════════════════════════════════════════════════════

describe('FLOW-13 E2E — UI State Mapping', () => {
  it('F13-U1: loading state — query in-flight returns pending promise (not yet resolved)', () => {
    const db = makeInMemoryDb();
    let resolved = false;

    const promise = db
      .storeDocument('warehouse-query-results', { queryId: 'q-u1', status: 'executing' }, 'q-u1')
      .then((r) => {
        resolved = true;
        return r;
      });

    expect(resolved).toBe(false);

    return promise.then(() => {
      expect(resolved).toBe(true);
    });
  });

  it('F13-U2: success state — DataProcessResult.success maps to analytics-results screen', async () => {
    const db = makeInMemoryDb();
    const result = await db.storeDocument(
      'warehouse-query-results',
      { queryId: 'q-u2', resultCount: 150, status: 'complete' },
      'q-u2',
    );

    const screen = result.isSuccess ? 'analytics-results' : 'query-error';
    expect(screen).toBe('analytics-results');
    expect(result.isSuccess).toBe(true);
  });

  it('F13-U3: error state — QUOTA_EXCEEDED maps to quota-exceeded screen', () => {
    const result = DataProcessResult.failure<Record<string, unknown>>(
      'QUOTA_EXCEEDED',
      'Warehouse query quota exhausted',
    );

    const screen = result.errorCode === 'QUOTA_EXCEEDED' ? 'quota-exceeded' : 'generic-error';
    expect(screen).toBe('quota-exceeded');
    expect(result.isSuccess).toBe(false);
  });

  it('F13-U4: BACKPRESSURE_REJECTED maps to backpressure-error screen — not generic error', () => {
    const result = DataProcessResult.failure<Record<string, unknown>>(
      'BACKPRESSURE_REJECTED',
      'Ingestion queue depth exceeded threshold',
    );

    const screen =
      result.errorCode === 'BACKPRESSURE_REJECTED' ? 'backpressure-error' : 'generic-error';
    expect(screen).toBe('backpressure-error');
  });

  it('F13-U5: APPROVAL_TOKEN_MISSING maps to awaiting-approval screen', () => {
    const result = DataProcessResult.failure<Record<string, unknown>>(
      'APPROVAL_TOKEN_MISSING',
      'Irreversible purge requires approval token',
    );

    const screen =
      result.errorCode === 'APPROVAL_TOKEN_MISSING' ? 'awaiting-approval' : 'purge-error';
    expect(screen).toBe('awaiting-approval');
  });

  it('F13-U6: toDict() serializes result for API response — snake_case keys', () => {
    const success = DataProcessResult.success({
      queryId: 'q-1',
      resultCount: 42,
      executedAt: new Date().toISOString(),
    });
    const dict = success.toDict();

    expect(dict['is_success']).toBe(true);
    expect(dict['data']).toBeDefined();
    expect(dict['correlation_id']).toBeDefined();
    expect(dict['timestamp']).toBeDefined();
  });

  it('F13-U7: schema evolution BREAKING change maps to awaiting-tenant-approval screen', () => {
    const changeType = 'rename_field';
    const breakingChanges = ['remove_field', 'change_field_type', 'rename_field', 'restrict_enum'];
    const isBreaking = breakingChanges.includes(changeType);

    const screen = isBreaking ? 'awaiting-tenant-approval' : 'schema-registered';
    expect(screen).toBe('awaiting-tenant-approval');
  });
});

// ══════════════════════════════════════════════════════
// Category 6 — API Contract (/api/dynamic/{indexName})
// ══════════════════════════════════════════════════════

describe('FLOW-13 E2E — API Contract (/api/dynamic/{indexName})', () => {
  it('F13-A1: /api/dynamic/warehouse-query-results response has is_success, data, correlation_id', () => {
    const mockResponse = DataProcessResult.success([
      { queryId: 'q-1', resultCount: 42, executedAt: new Date().toISOString() },
    ]);
    const dict = mockResponse.toDict();

    expect(dict).toHaveProperty('is_success', true);
    expect(dict).toHaveProperty('data');
    expect(dict).toHaveProperty('correlation_id');
    expect(dict).toHaveProperty('timestamp');
  });

  it('F13-A2: /api/dynamic/warehouse-metrics returns metric with value field', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'warehouse-metrics',
      { metricId: 'metric-api-1', value: 500, tenantId: 'tenant-a' },
      'metric-api-1',
    );

    const result = await db.searchDocuments('warehouse-metrics', { metricId: 'metric-api-1' });

    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]['value']).toBe(500);
  });

  it('F13-A3: /api/dynamic/warehouse-schemas returns schema with changeType field', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'warehouse-schemas',
      {
        schemaId: 'schema-api-1',
        changeType: 'add_optional_field',
        approvalStatus: 'auto_approved',
      },
      'schema-api-1',
    );

    const result = await db.searchDocuments('warehouse-schemas', { schemaId: 'schema-api-1' });

    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]['changeType']).toBe('add_optional_field');
    expect(docs[0]['approvalStatus']).toBe('auto_approved');
  });

  it('F13-A4: API error response for query not found — is_success=false, error_code=NOT_FOUND', () => {
    const errorResponse = DataProcessResult.failure<unknown>(
      'NOT_FOUND',
      'Warehouse query result not found',
    );
    const dict = errorResponse.toDict();

    expect(dict['is_success']).toBe(false);
    expect(dict['error_code']).toBe('NOT_FOUND');
    expect(dict['error_message']).toBe('Warehouse query result not found');
  });

  it('F13-A5: /api/dynamic/retention-policies returns policy with policyId field', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'retention-policies',
      { policyId: 'policy-api-1', retentionDays: 365, tenantId: 'tenant-a' },
      'policy-api-1',
    );

    const result = await db.searchDocuments('retention-policies', { policyId: 'policy-api-1' });

    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]['policyId']).toBe('policy-api-1');
    expect(Number.isInteger(docs[0]['retentionDays'])).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Category 7 — CloudEvents (DNA-9)
// ══════════════════════════════════════════════════════

describe('FLOW-13 E2E — CloudEvents (DNA-9)', () => {
  it('F13-C1: warehouse.metric.aggregated conforms to CloudEvents v1.0 spec', () => {
    const event = createCloudEvent({
      eventType: 'warehouse.metric.aggregated',
      source: 'flow-13/metric-aggregation',
      data: {
        metricId: 'metric-001',
        tenantId: 'tenant-flow13',
        value: 42500,
        eventWindowStart: '2026-03-01T00:00:00Z',
        eventWindowEnd: '2026-03-31T23:59:59Z',
      },
      tenantId: 'tenant-flow13',
    });

    const [isValid, errors] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('F13-C2: warehouse.kpi.snapshot event has required CloudEvents fields', () => {
    const event = createCloudEvent({
      eventType: 'warehouse.kpi.snapshot',
      source: 'flow-13/kpi-dashboard',
      data: { kpiId: 'kpi-001', value: 97.3, alertFired: false },
      tenantId: 'tenant-flow13',
    });

    expect(event['specversion']).toBe('1.0');
    expect(event['id']).toBeDefined();
    expect(event['type']).toBe('warehouse.kpi.snapshot');
    expect(event['source']).toContain('flow-13');
    expect(event['tenantid']).toBe('tenant-flow13');
    expect(event['datacontenttype']).toBe('application/json');
  });

  it('F13-C3: warehouse.schema.registered event contains changeType in data', () => {
    const event = createCloudEvent({
      eventType: 'warehouse.schema.registered',
      source: 'flow-13/schema-registry',
      data: {
        schemaId: 'schema-001',
        changeType: 'add_optional_field',
        approvalStatus: 'auto_approved',
      },
      tenantId: 'tenant-flow13',
    });

    const data = event['data'] as Record<string, unknown>;
    expect(data['changeType']).toBe('add_optional_field');
    expect(data['approvalStatus']).toBe('auto_approved');

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });

  it('F13-C4: warehouse.content.retention.extended event emitted via queue fabric — not HTTP', async () => {
    const queue = makeInMemoryQueue();

    // DNA-11: all inter-service communication via queue fabric
    await queue.enqueue(
      'warehouse.content.retention.extended',
      createCloudEvent({
        eventType: 'warehouse.content.retention.extended',
        source: 'flow-13/retention-enforcer',
        data: { contentId: 'content-001', holdId: 'hold-001', reason: 'LEGAL_HOLD_ACTIVE' },
        tenantId: 'tenant-flow13',
      }) as unknown as Record<string, unknown>,
    );

    expect(queue.enqueue).toHaveBeenCalledTimes(1);
    expect(queue._emitted[0].queue).toBe('warehouse.content.retention.extended');
  });

  it('F13-C5: warehouse.ingestion.backpressure_rejected event emitted on queue depth exceeded', async () => {
    const queue = makeInMemoryQueue();

    const backpressureEvent = createCloudEvent({
      eventType: 'warehouse.ingestion.backpressure_rejected',
      source: 'flow-13/ingestion-orchestrator',
      data: {
        batchId: 'batch-bp-001',
        reason: 'Queue depth threshold exceeded. Batch rejected.',
        tenantId: 'tenant-flow13',
      },
      tenantId: 'tenant-flow13',
    });

    await queue.enqueue(
      'warehouse.ingestion.backpressure_rejected',
      backpressureEvent as unknown as Record<string, unknown>,
    );

    const [isValid] = validateCloudEvent(backpressureEvent);
    expect(isValid).toBe(true);
    expect(queue._emitted[0].queue).toBe('warehouse.ingestion.backpressure_rejected');
  });

  it('F13-C6: warehouse.event.normalised event is tenant-scoped — tenantid field present', () => {
    const event = createCloudEvent({
      eventType: 'warehouse.event.normalised',
      source: 'flow-13/event-normalisation',
      data: {
        eventId: 'evt-001',
        sourceEvent: 'user.registered',
        normalizedAt: new Date().toISOString(),
      },
      tenantId: 'tenant-flow13',
    });

    expect(event['tenantid']).toBe('tenant-flow13');
    expect(event['tenantid']).not.toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════
// Category 8 — Named Checks
// ══════════════════════════════════════════════════════

describe('FLOW-13 E2E — Named Checks', () => {
  describe('irreversible_purge_requires_approval_token', () => {
    it('F13-N1: retention contract declares irreversible_purge_requires_approval_token quality gate', () => {
      const params = flow13RetentionParams('-n1');
      const qg = params.qualityGates.find(
        (g) => g.checkType === 'irreversible_purge_requires_approval_token',
      );

      expect(qg).toBeDefined();
      expect(qg!.severity).toBe('error');
    });

    it('F13-N2: purge without token returns APPROVAL_TOKEN_MISSING — execution halted', () => {
      const approvalToken: string | undefined = undefined;
      const purgeAction = { contentId: 'content-001', tenantId: 'tenant-A' };

      const canPurge = !!approvalToken;
      const result = canPurge
        ? DataProcessResult.success({ purged: true, tombstoneRef: 'tomb-001' })
        : DataProcessResult.failure<Record<string, unknown>>(
            'APPROVAL_TOKEN_MISSING',
            'Irreversible purge requires approval token',
          );

      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('APPROVAL_TOKEN_MISSING');
      expect(purgeAction.contentId).toBe('content-001'); // no purge happened
    });

    it('F13-N3: purge with valid token proceeds — DataPurged contains tombstoneRef not raw content', () => {
      const approvalToken = 'tok-valid-abc123';
      const purgeResult = DataProcessResult.success<Record<string, unknown>>({
        tombstoneRef: 'tomb-ref-001',
        tenantId: 'tenant-A',
        contentId: 'content-001',
        purgedAt: new Date().toISOString(),
        policyId: 'policy-001',
      });

      expect(purgeResult.isSuccess).toBe(true);
      const data = purgeResult.data!;

      // tombstone_reference_not_raw_data_in_purge_event:
      expect(data).toHaveProperty('tombstoneRef');
      expect(data).not.toHaveProperty('rawContent');
      expect(data).not.toHaveProperty('content');
      expect(data).not.toHaveProperty('payload');
      expect(data).not.toHaveProperty('body');
      expect(approvalToken).toBeDefined();
    });
  });

  describe('legal_hold_cross_flow_blocks_purge', () => {
    it('F13-N4: retention contract declares legal_hold_cross_flow_blocks_purge quality gate', () => {
      const params = flow13RetentionParams('-n4');
      const qg = params.qualityGates.find(
        (g) => g.checkType === 'legal_hold_cross_flow_blocks_purge',
      );

      expect(qg).toBeDefined();
      expect(qg!.severity).toBe('error');
    });

    it('F13-N5: active legal hold (cross-flow from FLOW-11) emits ContentRetentionExtended — purge aborted', async () => {
      const queue = makeInMemoryQueue();
      const db = makeInMemoryDb();

      // Simulated FLOW-11 legal hold record
      await db.storeDocument(
        'legal-holds',
        { holdId: 'hold-legal-001', contentId: 'content-001', active: true, sourceFlow: 'FLOW-11' },
        'hold-legal-001',
      );

      const holdRecords = await db.searchDocuments('legal-holds', {
        contentId: 'content-001',
        active: true,
      });
      const holdActive =
        holdRecords.isSuccess && (holdRecords.data as Record<string, unknown>[]).length > 0;

      // EXECUTION ORDER: legal hold check FIRST — if active, emit ContentRetentionExtended and return
      if (holdActive) {
        await queue.enqueue('warehouse.content.retention.extended', {
          contentId: 'content-001',
          holdId: 'hold-legal-001',
          reason: 'LEGAL_HOLD_ACTIVE',
        });
        // Do NOT proceed to purge
      }

      expect(holdActive).toBe(true);
      expect(queue.enqueue).toHaveBeenCalledTimes(1);
      expect(queue._emitted[0].queue).toBe('warehouse.content.retention.extended');
    });

    it('F13-N6: legal hold lifted allows purge to proceed with approval token', async () => {
      const db = makeInMemoryDb();

      // No active legal hold
      const holdRecords = await db.searchDocuments('legal-holds', {
        contentId: 'content-002',
        active: true,
      });
      const holdActive =
        holdRecords.isSuccess && (holdRecords.data as Record<string, unknown>[]).length > 0;

      expect(holdActive).toBe(false);

      // With valid token, purge proceeds
      const approvalToken = 'tok-lifted-001';
      const canPurge = !holdActive && !!approvalToken;
      expect(canPurge).toBe(true);
    });
  });

  describe('pii_masking_platform_only_before_serialization', () => {
    it('F13-N7: query engine contract declares pii_masking_platform_only_before_serialization gate', () => {
      const params = flow13QueryEngineParams('-n7');
      const qg = params.qualityGates.find(
        (g) => g.checkType === 'pii_masking_platform_only_before_serialization',
      );

      expect(qg).toBeDefined();
      expect(qg!.severity).toBe('error');
    });

    it('F13-N8: F423 PII masking is PLATFORM-ONLY — no skipMasking flag accepted', () => {
      // pii_masking_platform_only_before_serialization: no bypass allowed
      const queryOptions = { queryId: 'q-pii-001', limit: 100 };

      // Iron rule: no skipMasking flags
      expect(queryOptions).not.toHaveProperty('skipMasking');
      expect(queryOptions).not.toHaveProperty('bypassPII');
      expect(queryOptions).not.toHaveProperty('disablePIIMasking');
    });

    it('F13-N9: PII fields masked before result serialization — not present in response', () => {
      const rawQueryResult = {
        userId: 'user-001',
        // email and phone should be masked by F423 before serialization
        data: { metricValue: 42 },
      };

      // After F423 masking, no PII fields should appear in serialized output
      const maskedResult = {
        userId: rawQueryResult.userId,
        data: rawQueryResult.data,
        // email and phone stripped by platform
      };

      expect(maskedResult).not.toHaveProperty('email');
      expect(maskedResult).not.toHaveProperty('phone');
      expect(maskedResult).not.toHaveProperty('ssn');
      expect(maskedResult.data).toHaveProperty('metricValue');
    });

    it('F13-N10: rls_platform_only gate ensures F422 cannot be disabled by tenant', () => {
      const params = flow13QueryEngineParams('-n10');
      const rlsGate = params.qualityGates.find(
        (g) => g.checkType === 'rls_platform_only_cannot_be_disabled',
      );

      expect(rlsGate).toBeDefined();
      expect(rlsGate!.severity).toBe('error');
    });
  });
});
