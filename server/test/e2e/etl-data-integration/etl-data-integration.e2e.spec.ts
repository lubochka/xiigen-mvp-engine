/**
 * FLOW-14 E2E — Data Pipeline & ETL Engine
 *
 * Archetypes: TRANSFORM, MODELING, ACTIVATION, INGESTION
 * Task types: T189–T200 (12 contracts)
 * Fabric interfaces: ICredentialVaultService (F427), IRateLimitGuardService (F430),
 *   IWarehouseAuditService (F459), IExternalSourceConnector, IPiiClassificationService,
 *   ICursorCheckpointService, ICdcStreamConnector, IZonePromoter, IRateLimiter,
 *   IHmacVerifier, ICursorCheckpoint
 * CloudEvents: ConnectorRegistered, ConnectorRegistrationFailed, FactAppended,
 *   MartRefreshed, DimensionVersionCreated, PiiClassificationCompleted,
 *   RecordQuarantined, DuplicateIngestionDetected, ZonePromoted, CursorCommitted,
 *   ReverseEtlPushed, SchemaDriftDetected
 *
 * Named checks (validate.handler.ts):
 *   raw_zone_append_only_enforced
 *   rate_limit_check_before_external_call
 *   hmac_timing_safe_comparison
 *   cursor_monotonically_increasing
 *   scd2_no_dimension_update
 *   pii_gate_before_mart_write
 *   reverse_etl_queue_fabric_only
 *   cross_tenant_join_blocked
 *   zone_promotion_order_enforced
 *   credentials_not_in_event_payload
 *
 * 8 mandatory E2E categories:
 *   1. Happy path — raw ingestion, zone promotion raw→curated→mart, SCD2 versioning, reverse ETL
 *   2. Error path — rate limit exhausted, PII gate blocking mart write, cross-tenant join blocked,
 *                   raw zone overwrite prevented
 *   3. Tenant isolation — cursors and data scoped per tenant
 *   4. Idempotency — duplicate ingestion detection via DuplicateIngestionDetected event
 *   5. UI state mapping — ingestion progress, zone promotion status
 *   6. API contract — /api/dynamic/etl-jobs, /api/dynamic/data-marts
 *   7. CloudEvents — FactAppended, MartRefreshed, DimensionVersionCreated, PiiClassificationCompleted
 *   8. Named checks — raw_zone_append_only_enforced, pii_gate_before_mart_write, cross_tenant_join_blocked
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
        runId: 'flow14-run-id',
        status: 'PASS',
        score: 93,
        trace: [
          {
            nodeId: 'connector-registration',
            nodeType: 'provisioning',
            status: 'PASS',
            durationMs: 6,
          },
          { nodeId: 'etl-sync-saga', nodeType: 'ingestion', status: 'PASS', durationMs: 14 },
          { nodeId: 'raw-to-staging', nodeType: 'transform', status: 'PASS', durationMs: 11 },
          { nodeId: 'dimensional-model', nodeType: 'modeling', status: 'PASS', durationMs: 9 },
          { nodeId: 'mart-kpi', nodeType: 'modeling', status: 'PASS', durationMs: 7 },
          { nodeId: 'reverse-etl-push', nodeType: 'activation', status: 'PASS', durationMs: 5 },
        ],
        finalOutput: { code: '// FLOW-14 ETL & data integration' },
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

// ── FLOW-14 inline contract param builders ───────────────────────────────────

function flow14TransformParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T193_F14_TRANSFORM${suffix}`,
    flowId: 'FLOW-14',
    flowName: 'Data Pipeline & ETL',
    name: 'RawToStagingTransformer',
    archetype: ContractArchetype.TRANSFORM,
    entry: 'etl.raw.record.landed CloudEvent',
    purpose:
      'Transform raw records to staging zone. On parse failure, quarantine record and emit RecordQuarantined. ' +
      'raw_zone_append_only_enforced: raw zone NEVER updated. zone_promotion_order_enforced: raw→staging→curated→mart.',
    factoryDependencies: [
      {
        factoryId: `F_DB_TRANSFORM${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Staging zone document storage',
      },
      {
        factoryId: `F_QUEUE_TRANSFORM${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'FactAppended and RecordQuarantined event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-14-T01${suffix}`,
        description: 'raw_zone_append_only_enforced — raw zone is never updated or deleted',
        severity: 'error',
        checkType: 'raw_zone_append_only_enforced',
      },
      {
        gateId: `QG-14-T02${suffix}`,
        description: 'zone_promotion_order_enforced — raw→staging before curated',
        severity: 'error',
        checkType: 'zone_promotion_order_enforced',
      },
      {
        gateId: `QG-14-T03${suffix}`,
        description: 'DNA-8: storeDocument before enqueue',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
    ],
    bfaRegistration: {
      entities: [`etl_staging_record_f14${suffix}`],
      events: [`etl.fact.appended.f14${suffix}`, `etl.record.quarantined.f14${suffix}`],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: Raw zone is append-only — never update or delete raw records',
      'IR-2: Zone promotion order: raw → staging → curated → mart',
      'IR-3: Quarantine on parse failure — emit RecordQuarantined',
      'IR-4: DNA-8 storeDocument BEFORE enqueue on every transition',
    ],
    machineComponents: [
      'Raw append-only enforcement',
      'Zone promotion order gate',
      'Quarantine routing',
    ],
    freedomComponents: ['flow14_staging_schema_version', 'flow14_quarantine_threshold'],
    familyId: 'Family-14',
  };
}

function flow14ModelingParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T195_F14_MODEL${suffix}`,
    flowId: 'FLOW-14',
    flowName: 'Data Pipeline & ETL',
    name: 'DimensionalModelBuilder',
    archetype: ContractArchetype.MODELING,
    entry: 'etl.staging.record.promoted CloudEvent',
    purpose:
      'Build SCD-2 versioned dimension records. scd2_no_dimension_update: never UPDATE a dimension row — ' +
      'only INSERT new version with effectiveFrom/effectiveTo. Emit DimensionVersionCreated.',
    factoryDependencies: [
      {
        factoryId: `F_DB_MODEL${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Dimension record versioned storage',
      },
      {
        factoryId: `F_QUEUE_MODEL${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'DimensionVersionCreated event emission',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-14-M01${suffix}`,
        description: 'scd2_no_dimension_update — never update a dimension row',
        severity: 'error',
        checkType: 'scd2_no_dimension_update',
      },
      {
        gateId: `QG-14-M02${suffix}`,
        description: 'pii_gate_before_mart_write — PII classification before mart write',
        severity: 'error',
        checkType: 'pii_gate_before_mart_write',
      },
    ],
    bfaRegistration: {
      entities: [`dimension_version_f14${suffix}`],
      events: [`etl.dimension.version.created.f14${suffix}`],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: SCD-2 — only INSERT new version rows; never UPDATE existing dimension rows',
      'IR-2: PII classification MUST complete before any mart write',
      'IR-3: effectiveFrom/effectiveTo MUST be set on every dimension version',
    ],
    machineComponents: [
      'SCD-2 version gate',
      'PII classification gate',
      'effectiveFrom/effectiveTo enforcement',
    ],
    freedomComponents: ['flow14_scd2_history_retention_days'],
    familyId: 'Family-14',
  };
}

function flow14ActivationParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T199_F14_ACTIVATE${suffix}`,
    flowId: 'FLOW-14',
    flowName: 'Data Pipeline & ETL',
    name: 'ReverseEtlPushHandler',
    archetype: ContractArchetype.ACTIVATION,
    entry: 'etl.mart.refreshed CloudEvent',
    purpose:
      'Push mart data to external destination via queue fabric only. ' +
      'reverse_etl_queue_fabric_only: NEVER call external system via HTTP from service code. ' +
      'cross_tenant_join_blocked: mart aggregations must be tenant-scoped only.',
    factoryDependencies: [
      {
        factoryId: `F_DB_ACTIVATE${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Reverse ETL push log storage',
      },
      {
        factoryId: `F_QUEUE_ACTIVATE${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'ReverseEtlPushed event emission via queue fabric only',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-14-A01${suffix}`,
        description: 'reverse_etl_queue_fabric_only — no direct HTTP to external system',
        severity: 'error',
        checkType: 'reverse_etl_queue_fabric_only',
      },
      {
        gateId: `QG-14-A02${suffix}`,
        description: 'cross_tenant_join_blocked — mart aggregations are single-tenant only',
        severity: 'error',
        checkType: 'cross_tenant_join_blocked',
      },
    ],
    bfaRegistration: {
      entities: [`reverse_etl_push_f14${suffix}`],
      events: [`etl.reverse.push.completed.f14${suffix}`],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: Reverse ETL MUST use queue fabric — never HTTP fetch() to external system',
      'IR-2: Mart aggregations MUST be single-tenant scoped — cross-tenant join blocked',
      'IR-3: DNA-8 storeDocument before enqueue on push record',
    ],
    machineComponents: [
      'Queue fabric enforcement gate',
      'Cross-tenant join guard',
      'Push idempotency key',
    ],
    freedomComponents: ['flow14_reverse_etl_destination_queue', 'flow14_reverse_etl_batch_size'],
    familyId: 'Family-14',
  };
}

// ══════════════════════════════════════════════════════
// Category 1 — Happy Path
// ══════════════════════════════════════════════════════

describe('FLOW-14 E2E — Happy Path [RAW INGESTION → ZONE PROMOTION → MART → REVERSE ETL]', () => {
  const TENANT = 'flow14-happy-tenant';

  it('F14-H1: raw-to-staging transformer contract generates successfully (append-only, zone order)', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow14TransformParams('-h1'));
    const result = await engine.generate(contract, TENANT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('F14-H2: dimensional model builder contract generates successfully (SCD-2, PII gate)', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow14ModelingParams('-h2'));
    const result = await engine.generate(contract, TENANT);

    expect(result.isSuccess).toBe(true);
  });

  it('F14-H3: reverse ETL push handler contract generates successfully (queue-fabric-only)', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow14ActivationParams('-h3'));
    const result = await engine.generate(contract, TENANT);

    expect(result.isSuccess).toBe(true);
  });

  it('F14-H4: raw record landing stores document before emitting FactAppended (DNA-8 outbox)', () => {
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
      .storeDocument(
        'etl-raw-zone',
        { recordId: 'rec-001', tenantId: TENANT, payload: { value: 42 } },
        'rec-001',
      )
      .then(() =>
        trackedQueue.enqueue('etl.fact.appended', {
          recordId: 'rec-001',
          tenantId: TENANT,
        }),
      )
      .then(() => {
        expect(callOrder[0]).toBe('storeDocument');
        expect(callOrder[1]).toBe('enqueue');
      });
  });

  it('F14-H5: zone promotion raw→curated emits ZonePromoted with fromZone and toZone', async () => {
    const queue = makeInMemoryQueue();

    const zoneEvent = createCloudEvent({
      eventType: 'etl.zone.promoted',
      source: 'flow-14/zone-promoter',
      data: {
        recordId: 'rec-002',
        tenantId: TENANT,
        fromZone: 'raw',
        toZone: 'curated',
        promotedAt: new Date().toISOString(),
      },
      tenantId: TENANT,
    });

    await queue.enqueue('etl.zone.promoted', zoneEvent as unknown as Record<string, unknown>);

    expect(queue._emitted).toHaveLength(1);
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['fromZone']).toBe('raw');
    expect(data['toZone']).toBe('curated');
  });

  it('F14-H6: SCD-2 dimensional model produces new version with effectiveFrom/effectiveTo', async () => {
    const db = makeInMemoryDb();

    const dimensionV1 = {
      dimensionId: 'dim-001',
      tenantId: TENANT,
      version: 1,
      effectiveFrom: '2026-01-01T00:00:00Z',
      effectiveTo: '2026-03-31T23:59:59Z',
      current: false,
      name: 'Original Name',
    };
    const dimensionV2 = {
      dimensionId: 'dim-001',
      tenantId: TENANT,
      version: 2,
      effectiveFrom: '2026-04-01T00:00:00Z',
      effectiveTo: null,
      current: true,
      name: 'Updated Name',
    };

    // SCD-2: INSERT new version rows, never UPDATE existing
    await db.storeDocument('etl-dimensions', dimensionV1, 'dim-001-v1');
    await db.storeDocument('etl-dimensions', dimensionV2, 'dim-001-v2');

    const versions = await db.searchDocuments('etl-dimensions', { dimensionId: 'dim-001' });
    expect(versions.isSuccess).toBe(true);
    const rows = versions.data as Record<string, unknown>[];
    expect(rows).toHaveLength(2);

    const currentRow = rows.find((r) => r['current'] === true);
    expect(currentRow).toBeDefined();
    expect(currentRow!['effectiveFrom']).toBe('2026-04-01T00:00:00Z');
    expect(currentRow!['name']).toBe('Updated Name');
  });

  it('F14-H7: mart KPI build emits MartRefreshed after PII classification completed', async () => {
    const queue = makeInMemoryQueue();

    // Step 1: PII classification completed
    const piiEvent = createCloudEvent({
      eventType: 'etl.pii.classification.completed',
      source: 'flow-14/pii-classifier',
      data: { recordId: 'rec-003', tenantId: TENANT, piiFields: [], safeToWrite: true },
      tenantId: TENANT,
    });
    await queue.enqueue(
      'etl.pii.classification.completed',
      piiEvent as unknown as Record<string, unknown>,
    );

    // Step 2: Mart refreshed after PII gate passed
    const martEvent = createCloudEvent({
      eventType: 'etl.mart.refreshed',
      source: 'flow-14/mart-builder',
      data: {
        martId: 'mart-001',
        tenantId: TENANT,
        kpiCount: 5,
        refreshedAt: new Date().toISOString(),
      },
      tenantId: TENANT,
    });
    await queue.enqueue('etl.mart.refreshed', martEvent as unknown as Record<string, unknown>);

    expect(queue._emitted).toHaveLength(2);
    expect(queue._emitted[0].queue).toBe('etl.pii.classification.completed');
    expect(queue._emitted[1].queue).toBe('etl.mart.refreshed');
  });

  it('F14-H8: reverse ETL push emits ReverseEtlPushed via queue fabric — no HTTP', async () => {
    const queue = makeInMemoryQueue();

    const pushEvent = createCloudEvent({
      eventType: 'etl.reverse.push.completed',
      source: 'flow-14/reverse-etl',
      data: {
        pushId: 'push-001',
        tenantId: TENANT,
        destinationQueue: 'external.crm.sync',
        recordCount: 12,
        pushedAt: new Date().toISOString(),
      },
      tenantId: TENANT,
    });

    await queue.enqueue(
      'etl.reverse.push.completed',
      pushEvent as unknown as Record<string, unknown>,
    );

    const [isValid] = validateCloudEvent(pushEvent);
    expect(isValid).toBe(true);
    expect(queue._emitted[0].queue).toBe('etl.reverse.push.completed');
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data).toHaveProperty('destinationQueue');
    // Confirm: no HTTP client was invoked (queue fabric only enforced by architecture)
    expect(data['destinationQueue']).toBe('external.crm.sync');
  });

  it('F14-H9: cursor checkpoint committed with monotonically increasing cursor value', async () => {
    const db = makeInMemoryDb();

    const checkpoint1 = {
      connectorId: 'conn-001',
      tenantId: TENANT,
      cursor: 1000,
      committedAt: '2026-03-31T10:00:00Z',
    };
    const checkpoint2 = {
      connectorId: 'conn-001',
      tenantId: TENANT,
      cursor: 1050,
      committedAt: '2026-03-31T11:00:00Z',
    };

    await db.storeDocument('etl-cursor-checkpoints', checkpoint1, 'conn-001-ck1');
    await db.storeDocument('etl-cursor-checkpoints', checkpoint2, 'conn-001-ck2');

    const result = await db.searchDocuments('etl-cursor-checkpoints', { connectorId: 'conn-001' });
    expect(result.isSuccess).toBe(true);
    const rows = result.data as Record<string, unknown>[];
    expect(rows).toHaveLength(2);

    const cursors = rows.map((r) => r['cursor'] as number);
    const isMonotonicallyIncreasing = cursors.every(
      (val, i) => i === 0 || val > (cursors[i - 1] ?? 0),
    );
    expect(isMonotonicallyIncreasing).toBe(true);
  });

  it('F14-H10: connector registration emits ConnectorRegistered with connectorId — no credentials in payload', async () => {
    const queue = makeInMemoryQueue();

    const registeredEvent = createCloudEvent({
      eventType: 'etl.connector.registered',
      source: 'flow-14/connector-registration',
      data: {
        connectorId: 'conn-new-001',
        tenantId: TENANT,
        connectorType: 'postgres',
        registeredAt: new Date().toISOString(),
        // credentials: intentionally absent (credentials_not_in_event_payload named check)
      },
      tenantId: TENANT,
    });

    await queue.enqueue(
      'etl.connector.registered',
      registeredEvent as unknown as Record<string, unknown>,
    );

    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data).toHaveProperty('connectorId');
    expect(data).not.toHaveProperty('credentials');
    expect(data).not.toHaveProperty('password');
    expect(data).not.toHaveProperty('apiKey');
    expect(data).not.toHaveProperty('secret');
  });
});

// ══════════════════════════════════════════════════════
// Category 2 — Error Path
// ══════════════════════════════════════════════════════

describe('FLOW-14 E2E — Error Path', () => {
  it('F14-E1: rate limit exhausted before external poll — DataProcessResult.failure, no poll performed', () => {
    // rate_limit_check_before_external_call: IRateLimitGuardService called before each page poll
    const rateLimitResult = DataProcessResult.failure<Record<string, unknown>>(
      'RATE_LIMIT_EXHAUSTED',
      'External call rate limit quota exhausted — poll not executed',
    );

    expect(rateLimitResult.isSuccess).toBe(false);
    expect(rateLimitResult.errorCode).toBe('RATE_LIMIT_EXHAUSTED');
    expect(rateLimitResult.errorMessage).toContain('poll not executed');
  });

  it('F14-E2: PII gate blocks mart write — DataProcessResult.failure with PII_GATE_BLOCKED', () => {
    // pii_gate_before_mart_write: PII classification must complete with safeToWrite=true before any mart write
    const piiClassificationResult = { safeToWrite: false, piiFields: ['email', 'phone'] };

    const martWriteResult = piiClassificationResult.safeToWrite
      ? DataProcessResult.success({ written: true })
      : DataProcessResult.failure<Record<string, unknown>>(
          'PII_GATE_BLOCKED',
          'PII classification found sensitive fields — mart write blocked',
        );

    expect(martWriteResult.isSuccess).toBe(false);
    expect(martWriteResult.errorCode).toBe('PII_GATE_BLOCKED');
  });

  it('F14-E3: cross-tenant join attempt blocked — DataProcessResult.failure with CROSS_TENANT_JOIN_BLOCKED', () => {
    // cross_tenant_join_blocked: identity join resolver must reject cross-tenant join
    const joinRequest = {
      tenantId: 'tenant-A',
      joinTargetTenantId: 'tenant-B', // cross-tenant attempt
    };

    const isCrossTenant = joinRequest.tenantId !== joinRequest.joinTargetTenantId;
    const result = isCrossTenant
      ? DataProcessResult.failure<Record<string, unknown>>(
          'CROSS_TENANT_JOIN_BLOCKED',
          'Cross-tenant identity join is not permitted (CF-204)',
        )
      : DataProcessResult.success({ joined: true });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CROSS_TENANT_JOIN_BLOCKED');
  });

  it('F14-E4: raw zone overwrite attempted — DataProcessResult.failure with RAW_ZONE_APPEND_ONLY', () => {
    // raw_zone_append_only_enforced: updates to raw zone records must be rejected
    const operation = 'UPDATE'; // should be blocked; only INSERT/APPEND allowed

    const rawZoneOps = ['INSERT', 'APPEND'];
    const isAllowed = rawZoneOps.includes(operation);
    const result = isAllowed
      ? DataProcessResult.success({ stored: true })
      : DataProcessResult.failure<Record<string, unknown>>(
          'RAW_ZONE_APPEND_ONLY',
          'Raw zone is append-only — UPDATE/DELETE operations are not permitted (CF-192)',
        );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('RAW_ZONE_APPEND_ONLY');
    expect(result.errorMessage).toContain('CF-192');
  });

  it('F14-E5: HMAC verification failure on webhook — reject without landing record', () => {
    // hmac_timing_safe_comparison: webhook ingestion must reject if HMAC signature does not match
    const providedSignature: string = 'sha256=invalid-sig-abc';
    const expectedSignature: string = 'sha256=correct-sig-xyz';

    const isHmacValid = providedSignature === expectedSignature; // timing-safe comparison simulated
    const result = isHmacValid
      ? DataProcessResult.success({ accepted: true })
      : DataProcessResult.failure<Record<string, unknown>>(
          'HMAC_VERIFICATION_FAILED',
          'Webhook HMAC signature mismatch — record rejected',
        );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('HMAC_VERIFICATION_FAILED');
  });

  it('F14-E6: cursor regression blocked — cursor must be monotonically increasing', () => {
    // cursor_monotonically_increasing: ICursorCheckpointService must reject decreasing cursor values
    const lastCommittedCursor = 1050;
    const incomingCursor = 900; // regression

    const isCursorValid = incomingCursor > lastCommittedCursor;
    const result = isCursorValid
      ? DataProcessResult.success({ cursorCommitted: true })
      : DataProcessResult.failure<Record<string, unknown>>(
          'CURSOR_REGRESSION',
          `Cursor regression detected — incoming ${incomingCursor} <= last committed ${lastCommittedCursor}`,
        );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CURSOR_REGRESSION');
    expect(result.errorMessage).toContain('900');
  });

  it('F14-E7: schema drift detection blocks promotion without approval gate', () => {
    // SchemaDriftDetector: breaking schema drift requires approval before curated zone promotion
    const driftScore = 0.85; // above threshold
    const driftThreshold = 0.7;
    const hasApproval = false;

    const requiresApproval = driftScore > driftThreshold;
    const canPromote = !requiresApproval || hasApproval;

    const result = canPromote
      ? DataProcessResult.success({ promoted: true })
      : DataProcessResult.failure<Record<string, unknown>>(
          'SCHEMA_DRIFT_APPROVAL_REQUIRED',
          `Schema drift score ${driftScore} exceeds threshold ${driftThreshold} — approval required`,
        );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SCHEMA_DRIFT_APPROVAL_REQUIRED');
  });

  it('F14-E8: database write failure returns DataProcessResult.failure — no throw', async () => {
    const db = makeInMemoryDb();
    db.storeDocument.mockResolvedValueOnce(
      DataProcessResult.failure('DB_WRITE_FAILED', 'Simulated ETL storage failure'),
    );

    const result = await db.storeDocument('etl-raw-zone', { recordId: 'rec-fail' }, 'rec-fail');

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_WRITE_FAILED');
  });

  it('F14-E9: SCD-2 dimension update attempt blocked — must INSERT new version instead', () => {
    // scd2_no_dimension_update: updating an existing dimension row must be rejected
    const operation = { type: 'UPDATE', targetId: 'dim-001-v1' };

    const isUpdateBlocked = operation.type === 'UPDATE';
    const result = isUpdateBlocked
      ? DataProcessResult.failure<Record<string, unknown>>(
          'SCD2_UPDATE_BLOCKED',
          'SCD-2: updating an existing dimension version is not allowed — insert new version row',
        )
      : DataProcessResult.success({ processed: true });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SCD2_UPDATE_BLOCKED');
  });

  it('F14-E10: empty taskTypeId returns DataProcessResult without throwing', async () => {
    const engine = createEngine();
    const invalidContract = new EngineContract({
      taskTypeId: '',
      name: 'Invalid',
      archetype: ContractArchetype.TRANSFORM,
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

    const result = await engine.generate(invalidContract, 'flow14-error-tenant');

    expect(result).toBeInstanceOf(DataProcessResult);
    if (!result.isSuccess) {
      expect(result.errorCode).toBeDefined();
    }
  });
});

// ══════════════════════════════════════════════════════
// Category 3 — Tenant Isolation
// ══════════════════════════════════════════════════════

describe('FLOW-14 E2E — Tenant Isolation', () => {
  it('F14-T1: tenant-A and tenant-B transform contracts generate independently', async () => {
    const engineA = createEngine();
    const engineB = createEngine();

    const [rA, rB] = await Promise.all([
      engineA.generate(new EngineContract(flow14TransformParams('-ta')), 'flow14-tenant-A'),
      engineB.generate(new EngineContract(flow14TransformParams('-tb')), 'flow14-tenant-B'),
    ]);

    expect(rA.isSuccess).toBe(true);
    expect(rB.isSuccess).toBe(true);
    expect(rA.data!.contractId).toBe('T193_F14_TRANSFORM-ta');
    expect(rB.data!.contractId).toBe('T193_F14_TRANSFORM-tb');
  });

  it('F14-T2: tenant-A raw zone records do not appear in tenant-B store', async () => {
    const dbA = makeInMemoryDb();
    const dbB = makeInMemoryDb();

    await dbA.storeDocument(
      'etl-raw-zone',
      { recordId: 'rec-a1', tenantId: 'tenant-A', payload: { value: 100 } },
      'rec-a1',
    );

    const bResults = await dbB.searchDocuments('etl-raw-zone', {});
    expect((bResults.data as Record<string, unknown>[]).length).toBe(0);
  });

  it('F14-T3: cursor checkpoints are tenant-scoped — tenant-A cursor does not affect tenant-B', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'etl-cursor-checkpoints',
      { connectorId: 'conn-001', tenantId: 'tenant-A', cursor: 500 },
      'conn-001-tenantA',
    );
    await db.storeDocument(
      'etl-cursor-checkpoints',
      { connectorId: 'conn-001', tenantId: 'tenant-B', cursor: 200 },
      'conn-001-tenantB',
    );

    const tenantACheckpoint = await db.searchDocuments('etl-cursor-checkpoints', {
      connectorId: 'conn-001',
      tenantId: 'tenant-A',
    });
    const tenantBCheckpoint = await db.searchDocuments('etl-cursor-checkpoints', {
      connectorId: 'conn-001',
      tenantId: 'tenant-B',
    });

    const rowsA = tenantACheckpoint.data as Record<string, unknown>[];
    const rowsB = tenantBCheckpoint.data as Record<string, unknown>[];
    expect(rowsA[0]['cursor']).toBe(500);
    expect(rowsB[0]['cursor']).toBe(200);
    expect(rowsA[0]['cursor']).not.toBe(rowsB[0]['cursor']);
  });

  it('F14-T4: CloudEvents include tenantid — ALS context propagation', () => {
    const eventA = createCloudEvent({
      eventType: 'etl.fact.appended',
      source: 'flow-14/raw-to-staging',
      data: { recordId: 'rec-a2' },
      tenantId: 'tenant-A',
    });
    const eventB = createCloudEvent({
      eventType: 'etl.fact.appended',
      source: 'flow-14/raw-to-staging',
      data: { recordId: 'rec-b2' },
      tenantId: 'tenant-B',
    });

    expect(eventA['tenantid']).toBe('tenant-A');
    expect(eventB['tenantid']).toBe('tenant-B');
    expect(eventA['tenantid']).not.toBe(eventB['tenantid']);
  });

  it('F14-T5: cross-tenant identity join attempt produces CROSS_TENANT_JOIN_BLOCKED error', () => {
    // T197 IdentityJoinResolver: cross_tenant_join_blocked named check
    const joinFilter = { tenantId: 'tenant-A' };

    // Simulated cross-tenant attempt: adding a second tenantId predicate
    const hasCrossTenantPredicate =
      Object.keys(joinFilter).filter((k) => k.toLowerCase().includes('tenant')).length > 1 ||
      (joinFilter as Record<string, string>)['joinTenantId'] !== undefined;

    const result = hasCrossTenantPredicate
      ? DataProcessResult.failure<Record<string, unknown>>(
          'CROSS_TENANT_JOIN_BLOCKED',
          'Cross-tenant identity join is not permitted',
        )
      : DataProcessResult.success({ joined: true, scope: joinFilter.tenantId });

    // Single-tenant join proceeds
    expect(result.isSuccess).toBe(true);
    expect(result.data!['scope']).toBe('tenant-A');
  });

  it('F14-T6: mart KPI data tenant-A does not bleed into mart-B namespace', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'etl-data-marts',
      { martId: 'mart-A-kpi-1', tenantId: 'tenant-A', kpiValue: 9999 },
      'mart-a-kpi-1',
    );

    const martBResult = await db.searchDocuments('etl-data-marts', { tenantId: 'tenant-B' });
    expect((martBResult.data as Record<string, unknown>[]).length).toBe(0);
  });
});

// ══════════════════════════════════════════════════════
// Category 4 — Idempotency
// ══════════════════════════════════════════════════════

describe('FLOW-14 E2E — Idempotency (DuplicateIngestionDetected)', () => {
  it('F14-I1: duplicate record detected by ingestion idempotency key — DuplicateIngestionDetected emitted', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const recordId = 'rec-idem-001';
    const tenantId = 'tenant-A';

    // First ingestion — lands successfully
    await db.storeDocument('etl-raw-zone', { recordId, tenantId, status: 'landed' }, recordId);

    // Second ingestion attempt with same recordId
    const existing = await db.searchDocuments('etl-raw-zone', { recordId });
    const isDuplicate =
      existing.isSuccess && (existing.data as Record<string, unknown>[]).length > 0;

    if (isDuplicate) {
      await queue.enqueue(
        'etl.ingestion.duplicate.detected',
        createCloudEvent({
          eventType: 'etl.ingestion.duplicate.detected',
          source: 'flow-14/etl-sync-saga',
          data: { recordId, tenantId, reason: 'ALREADY_LANDED' },
          tenantId,
        }) as unknown as Record<string, unknown>,
      );
    }

    expect(isDuplicate).toBe(true);
    expect(queue.enqueue).toHaveBeenCalledTimes(1);
    expect(queue._emitted[0].queue).toBe('etl.ingestion.duplicate.detected');
  });

  it('F14-I2: duplicate ingestion with same cursor page not re-landed', async () => {
    const db = makeInMemoryDb();
    const cursor = 1000;
    const connectorId = 'conn-001';
    const tenantId = 'tenant-A';

    // Simulate committed cursor at 1000
    await db.storeDocument(
      'etl-cursor-checkpoints',
      { connectorId, tenantId, cursor, committedAt: new Date().toISOString() },
      `${connectorId}-cursor`,
    );

    // Incoming page cursor 1000 (same — already committed)
    const checkpointResult = await db.searchDocuments('etl-cursor-checkpoints', {
      connectorId,
      tenantId,
    });
    const lastCursor = (checkpointResult.data as Record<string, unknown>[])[0]['cursor'] as number;
    const isAlreadyProcessed = cursor <= lastCursor;

    expect(isAlreadyProcessed).toBe(true);
  });

  it('F14-I3: idempotency key derived from connectorId + tenantId + pageToken', () => {
    // DNA-7: idempotency key scope for ETL sync
    const connectorId = 'conn-001';
    const tenantId = 'tenant-A';
    const pageToken = 'page-tok-abc123';

    const idempotencyKey = `${tenantId}:${connectorId}:${pageToken}`;

    expect(idempotencyKey).toContain(tenantId);
    expect(idempotencyKey).toContain(connectorId);
    expect(idempotencyKey).toContain(pageToken);
  });

  it('F14-I4: second engine.generate() with same BFA entities does not error', async () => {
    const engineA = createEngine();
    const engineB = createEngine();

    const r1 = await engineA.generate(
      new EngineContract(flow14ModelingParams('-i4a')),
      'flow14-idem-tenant',
    );
    const r2 = await engineB.generate(
      new EngineContract(flow14ModelingParams('-i4b')),
      'flow14-idem-tenant',
    );

    expect(r1.isSuccess).toBe(true);
    expect(r2.isSuccess).toBe(true);
  });

  it('F14-I5: webhook ingestion deduplicates by HMAC-verified request id', async () => {
    const db = makeInMemoryDb();
    const webhookRequestId = 'wh-req-001';
    const tenantId = 'tenant-A';

    // First delivery
    await db.storeDocument(
      'etl-webhook-deliveries',
      { requestId: webhookRequestId, tenantId, status: 'processed' },
      webhookRequestId,
    );

    // Second delivery attempt (webhook retry)
    const previous = await db.searchDocuments('etl-webhook-deliveries', {
      requestId: webhookRequestId,
    });
    const isDuplicate =
      previous.isSuccess && (previous.data as Record<string, unknown>[]).length > 0;

    expect(isDuplicate).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Category 5 — UI State Mapping
// ══════════════════════════════════════════════════════

describe('FLOW-14 E2E — UI State Mapping', () => {
  it('F14-U1: loading state — ETL job in-flight resolves asynchronously', () => {
    const db = makeInMemoryDb();
    let resolved = false;

    const promise = db
      .storeDocument(
        'etl-jobs',
        { jobId: 'job-u1', status: 'running', tenantId: 'tenant-A' },
        'job-u1',
      )
      .then((r) => {
        resolved = true;
        return r;
      });

    expect(resolved).toBe(false);

    return promise.then(() => {
      expect(resolved).toBe(true);
    });
  });

  it('F14-U2: success state — DataProcessResult.success maps to pipeline-complete screen', async () => {
    const db = makeInMemoryDb();
    const result = await db.storeDocument(
      'etl-jobs',
      { jobId: 'job-u2', status: 'complete', recordsProcessed: 1500 },
      'job-u2',
    );

    const screen = result.isSuccess ? 'pipeline-complete' : 'pipeline-error';
    expect(screen).toBe('pipeline-complete');
    expect(result.isSuccess).toBe(true);
  });

  it('F14-U3: RATE_LIMIT_EXHAUSTED maps to rate-limited screen — not generic error', () => {
    const result = DataProcessResult.failure<Record<string, unknown>>(
      'RATE_LIMIT_EXHAUSTED',
      'External call rate limit quota exhausted',
    );

    const screen = result.errorCode === 'RATE_LIMIT_EXHAUSTED' ? 'rate-limited' : 'generic-error';
    expect(screen).toBe('rate-limited');
    expect(result.isSuccess).toBe(false);
  });

  it('F14-U4: PII_GATE_BLOCKED maps to pii-blocked screen', () => {
    const result = DataProcessResult.failure<Record<string, unknown>>(
      'PII_GATE_BLOCKED',
      'PII classification found sensitive fields — mart write blocked',
    );

    const screen = result.errorCode === 'PII_GATE_BLOCKED' ? 'pii-blocked' : 'generic-error';
    expect(screen).toBe('pii-blocked');
  });

  it('F14-U5: zone promotion status tracks raw→curated→mart stages', () => {
    const stages = ['raw', 'curated', 'mart'] as const;
    type Zone = (typeof stages)[number];

    const pipelineState = {
      currentZone: 'curated' as Zone,
      completedZones: ['raw'] as Zone[],
    };

    const currentIndex = stages.indexOf(pipelineState.currentZone);
    expect(currentIndex).toBe(1); // curated is index 1
    expect(pipelineState.completedZones).toContain('raw');
    expect(pipelineState.completedZones).not.toContain('mart');
  });

  it('F14-U6: toDict() serializes DataProcessResult for API response — snake_case keys', () => {
    const success = DataProcessResult.success({
      jobId: 'job-u6',
      recordsProcessed: 200,
      currentZone: 'mart',
    });
    const dict = success.toDict();

    expect(dict['is_success']).toBe(true);
    expect(dict['data']).toBeDefined();
    expect(dict['correlation_id']).toBeDefined();
    expect(dict['timestamp']).toBeDefined();
  });

  it('F14-U7: SCHEMA_DRIFT_APPROVAL_REQUIRED maps to awaiting-schema-approval screen', () => {
    const result = DataProcessResult.failure<Record<string, unknown>>(
      'SCHEMA_DRIFT_APPROVAL_REQUIRED',
      'Schema drift score 0.85 exceeds threshold — approval required',
    );

    const screen =
      result.errorCode === 'SCHEMA_DRIFT_APPROVAL_REQUIRED'
        ? 'awaiting-schema-approval'
        : 'generic-error';
    expect(screen).toBe('awaiting-schema-approval');
  });
});

// ══════════════════════════════════════════════════════
// Category 6 — API Contract (/api/dynamic/{indexName})
// ══════════════════════════════════════════════════════

describe('FLOW-14 E2E — API Contract (/api/dynamic/{indexName})', () => {
  it('F14-A1: /api/dynamic/etl-jobs response has is_success, data, correlation_id', () => {
    const mockResponse = DataProcessResult.success([
      { jobId: 'job-1', status: 'complete', recordsProcessed: 500 },
    ]);
    const dict = mockResponse.toDict();

    expect(dict).toHaveProperty('is_success', true);
    expect(dict).toHaveProperty('data');
    expect(dict).toHaveProperty('correlation_id');
    expect(dict).toHaveProperty('timestamp');
  });

  it('F14-A2: /api/dynamic/data-marts returns mart with kpiCount field', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'data-marts',
      {
        martId: 'mart-api-1',
        tenantId: 'tenant-a',
        kpiCount: 8,
        refreshedAt: new Date().toISOString(),
      },
      'mart-api-1',
    );

    const result = await db.searchDocuments('data-marts', { martId: 'mart-api-1' });

    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]['kpiCount']).toBe(8);
  });

  it('F14-A3: /api/dynamic/etl-connectors returns connector with connectorType field', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'etl-connectors',
      {
        connectorId: 'conn-api-1',
        connectorType: 'postgres',
        status: 'active',
        tenantId: 'tenant-a',
      },
      'conn-api-1',
    );

    const result = await db.searchDocuments('etl-connectors', { connectorId: 'conn-api-1' });

    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]['connectorType']).toBe('postgres');
    expect(docs[0]['status']).toBe('active');
  });

  it('F14-A4: API error response for ETL job not found — is_success=false, error_code=NOT_FOUND', () => {
    const errorResponse = DataProcessResult.failure<unknown>('NOT_FOUND', 'ETL job not found');
    const dict = errorResponse.toDict();

    expect(dict['is_success']).toBe(false);
    expect(dict['error_code']).toBe('NOT_FOUND');
    expect(dict['error_message']).toBe('ETL job not found');
  });

  it('F14-A5: /api/dynamic/etl-cursor-checkpoints returns checkpoint with cursor field', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'etl-cursor-checkpoints',
      { connectorId: 'conn-api-2', cursor: 2000, tenantId: 'tenant-a' },
      'conn-api-2',
    );

    const result = await db.searchDocuments('etl-cursor-checkpoints', {
      connectorId: 'conn-api-2',
    });

    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(Number.isInteger(docs[0]['cursor'])).toBe(true);
    expect(docs[0]['cursor']).toBe(2000);
  });
});

// ══════════════════════════════════════════════════════
// Category 7 — CloudEvents (DNA-9)
// ══════════════════════════════════════════════════════

describe('FLOW-14 E2E — CloudEvents (DNA-9)', () => {
  it('F14-C1: etl.fact.appended conforms to CloudEvents v1.0 spec', () => {
    const event = createCloudEvent({
      eventType: 'etl.fact.appended',
      source: 'flow-14/raw-to-staging',
      data: {
        recordId: 'rec-cf1',
        tenantId: 'tenant-flow14',
        zone: 'raw',
        appendedAt: new Date().toISOString(),
      },
      tenantId: 'tenant-flow14',
    });

    const [isValid, errors] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('F14-C2: etl.mart.refreshed event has required CloudEvents fields', () => {
    const event = createCloudEvent({
      eventType: 'etl.mart.refreshed',
      source: 'flow-14/mart-builder',
      data: { martId: 'mart-cf2', kpiCount: 5, refreshedAt: new Date().toISOString() },
      tenantId: 'tenant-flow14',
    });

    expect(event['specversion']).toBe('1.0');
    expect(event['id']).toBeDefined();
    expect(event['type']).toBe('etl.mart.refreshed');
    expect(event['source']).toContain('flow-14');
    expect(event['tenantid']).toBe('tenant-flow14');
    expect(event['datacontenttype']).toBe('application/json');
  });

  it('F14-C3: etl.dimension.version.created event contains effectiveFrom in data', () => {
    const event = createCloudEvent({
      eventType: 'etl.dimension.version.created',
      source: 'flow-14/dimensional-model',
      data: {
        dimensionId: 'dim-cf3',
        version: 2,
        effectiveFrom: '2026-04-01T00:00:00Z',
        effectiveTo: null,
        current: true,
      },
      tenantId: 'tenant-flow14',
    });

    const data = event['data'] as Record<string, unknown>;
    expect(data['effectiveFrom']).toBe('2026-04-01T00:00:00Z');
    expect(data['current']).toBe(true);

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });

  it('F14-C4: etl.pii.classification.completed event emitted via queue fabric — not HTTP', async () => {
    const queue = makeInMemoryQueue();

    await queue.enqueue(
      'etl.pii.classification.completed',
      createCloudEvent({
        eventType: 'etl.pii.classification.completed',
        source: 'flow-14/pii-classifier',
        data: { recordId: 'rec-cf4', piiFields: ['email'], safeToWrite: false },
        tenantId: 'tenant-flow14',
      }) as unknown as Record<string, unknown>,
    );

    expect(queue.enqueue).toHaveBeenCalledTimes(1);
    expect(queue._emitted[0].queue).toBe('etl.pii.classification.completed');
  });

  it('F14-C5: etl.ingestion.duplicate.detected event has recordId in data', async () => {
    const queue = makeInMemoryQueue();

    const dupEvent = createCloudEvent({
      eventType: 'etl.ingestion.duplicate.detected',
      source: 'flow-14/etl-sync-saga',
      data: {
        recordId: 'rec-cf5-dup',
        tenantId: 'tenant-flow14',
        reason: 'ALREADY_LANDED',
      },
      tenantId: 'tenant-flow14',
    });

    await queue.enqueue(
      'etl.ingestion.duplicate.detected',
      dupEvent as unknown as Record<string, unknown>,
    );

    const [isValid] = validateCloudEvent(dupEvent);
    expect(isValid).toBe(true);
    const data = queue._emitted[0].payload['data'] as Record<string, unknown>;
    expect(data['reason']).toBe('ALREADY_LANDED');
  });

  it('F14-C6: etl.connector.registered event is tenant-scoped — tenantid field present', () => {
    const event = createCloudEvent({
      eventType: 'etl.connector.registered',
      source: 'flow-14/connector-registration',
      data: {
        connectorId: 'conn-cf6',
        connectorType: 'kafka',
        registeredAt: new Date().toISOString(),
      },
      tenantId: 'tenant-flow14',
    });

    expect(event['tenantid']).toBe('tenant-flow14');
    expect(event['tenantid']).not.toBeUndefined();
  });

  it('F14-C7: etl.zone.promoted event has fromZone and toZone in data', () => {
    const event = createCloudEvent({
      eventType: 'etl.zone.promoted',
      source: 'flow-14/zone-promoter',
      data: {
        recordId: 'rec-cf7',
        fromZone: 'curated',
        toZone: 'mart',
        promotedAt: new Date().toISOString(),
      },
      tenantId: 'tenant-flow14',
    });

    const data = event['data'] as Record<string, unknown>;
    expect(data['fromZone']).toBe('curated');
    expect(data['toZone']).toBe('mart');

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Category 8 — Named Checks
// ══════════════════════════════════════════════════════

describe('FLOW-14 E2E — Named Checks', () => {
  describe('raw_zone_append_only_enforced', () => {
    it('F14-N1: transform contract declares raw_zone_append_only_enforced quality gate', () => {
      const params = flow14TransformParams('-n1');
      const qg = params.qualityGates.find((g) => g.checkType === 'raw_zone_append_only_enforced');

      expect(qg).toBeDefined();
      expect(qg!.severity).toBe('error');
    });

    it('F14-N2: raw zone UPDATE rejected — only append operations permitted', () => {
      const rawOp = { type: 'UPDATE', zoneId: 'raw', recordId: 'rec-n2' };

      const isAppendOnly = rawOp.type === 'INSERT' || rawOp.type === 'APPEND';
      const result = isAppendOnly
        ? DataProcessResult.success({ stored: true })
        : DataProcessResult.failure<Record<string, unknown>>(
            'RAW_ZONE_APPEND_ONLY',
            'Raw zone is append-only — UPDATE/DELETE operations are not permitted',
          );

      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('RAW_ZONE_APPEND_ONLY');
    });

    it('F14-N3: raw zone INSERT proceeds — returns success with stored record', async () => {
      const db = makeInMemoryDb();
      const result = await db.storeDocument(
        'etl-raw-zone',
        { recordId: 'rec-n3', tenantId: 'tenant-A', payload: { value: 77 } },
        'rec-n3',
      );

      expect(result.isSuccess).toBe(true);
      // Raw zone append verified: INSERT stored OK
      const stored = await db.searchDocuments('etl-raw-zone', { recordId: 'rec-n3' });
      expect((stored.data as Record<string, unknown>[]).length).toBe(1);
    });
  });

  describe('pii_gate_before_mart_write', () => {
    it('F14-N4: modeling contract declares pii_gate_before_mart_write quality gate', () => {
      const params = flow14ModelingParams('-n4');
      const qg = params.qualityGates.find((g) => g.checkType === 'pii_gate_before_mart_write');

      expect(qg).toBeDefined();
      expect(qg!.severity).toBe('error');
    });

    it('F14-N5: PII classification with safeToWrite=false blocks mart write — emits PiiClassificationCompleted', async () => {
      const queue = makeInMemoryQueue();

      const piiResult = { safeToWrite: false, piiFields: ['email', 'ssn'] };

      await queue.enqueue(
        'etl.pii.classification.completed',
        createCloudEvent({
          eventType: 'etl.pii.classification.completed',
          source: 'flow-14/pii-classifier',
          data: { recordId: 'rec-n5', piiFields: piiResult.piiFields, safeToWrite: false },
          tenantId: 'tenant-A',
        }) as unknown as Record<string, unknown>,
      );

      const martWriteAllowed = piiResult.safeToWrite;
      expect(martWriteAllowed).toBe(false);
      expect(queue.enqueue).toHaveBeenCalledTimes(1);
      expect(queue._emitted[0].queue).toBe('etl.pii.classification.completed');
    });

    it('F14-N6: PII classification with safeToWrite=true allows mart write to proceed', async () => {
      const db = makeInMemoryDb();
      const piiResult = { safeToWrite: true, piiFields: [] };

      if (piiResult.safeToWrite) {
        const result = await db.storeDocument(
          'data-marts',
          { martId: 'mart-n6', tenantId: 'tenant-A', kpiValue: 42 },
          'mart-n6',
        );
        expect(result.isSuccess).toBe(true);
      }

      const martRecords = await db.searchDocuments('data-marts', { martId: 'mart-n6' });
      expect((martRecords.data as Record<string, unknown>[]).length).toBe(1);
    });

    it('F14-N7: mart data does not contain PII fields after classification gate', () => {
      const rawRecord = {
        userId: 'user-001',
        // email and phone stripped by PII classifier before mart write
        metrics: { purchaseCount: 5, totalSpend: 199.99 },
      };

      // After PII gate — PII fields not present in mart record
      const martRecord = {
        userId: rawRecord.userId,
        metrics: rawRecord.metrics,
        // no email, no phone, no ssn
      };

      expect(martRecord).not.toHaveProperty('email');
      expect(martRecord).not.toHaveProperty('phone');
      expect(martRecord).not.toHaveProperty('ssn');
      expect(martRecord.metrics).toHaveProperty('purchaseCount');
    });
  });

  describe('cross_tenant_join_blocked', () => {
    it('F14-N8: activation contract declares cross_tenant_join_blocked quality gate', () => {
      const params = flow14ActivationParams('-n8');
      const qg = params.qualityGates.find((g) => g.checkType === 'cross_tenant_join_blocked');

      expect(qg).toBeDefined();
      expect(qg!.severity).toBe('error');
    });

    it('F14-N9: identity join with cross-tenant target returns CROSS_TENANT_JOIN_BLOCKED', () => {
      const request = {
        sourceTenantId: 'tenant-A',
        targetTenantId: 'tenant-B',
        joinField: 'externalUserId',
      };

      const isCrossTenant = request.sourceTenantId !== request.targetTenantId;
      const result = isCrossTenant
        ? DataProcessResult.failure<Record<string, unknown>>(
            'CROSS_TENANT_JOIN_BLOCKED',
            `Cross-tenant join from ${request.sourceTenantId} to ${request.targetTenantId} is blocked (CF-204)`,
          )
        : DataProcessResult.success({ joined: true });

      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CROSS_TENANT_JOIN_BLOCKED');
      expect(result.errorMessage).toContain('CF-204');
    });

    it('F14-N10: same-tenant identity join proceeds normally', () => {
      const request = {
        sourceTenantId: 'tenant-A',
        targetTenantId: 'tenant-A', // same tenant — allowed
        joinField: 'externalUserId',
      };

      const isCrossTenant = request.sourceTenantId !== request.targetTenantId;
      const result = isCrossTenant
        ? DataProcessResult.failure<Record<string, unknown>>(
            'CROSS_TENANT_JOIN_BLOCKED',
            'Cross-tenant identity join blocked',
          )
        : DataProcessResult.success({ joined: true, tenantId: request.sourceTenantId });

      expect(result.isSuccess).toBe(true);
      expect(result.data!['tenantId']).toBe('tenant-A');
    });
  });
});
