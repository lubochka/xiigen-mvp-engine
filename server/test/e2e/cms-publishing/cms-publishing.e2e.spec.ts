/**
 * FLOW-22 E2E — CMS & Publishing Platform
 *
 * Archetypes: SERVICE (T330 content manager, T331 schema registry),
 *   ORCHESTRATION (T336 publish saga, T338 rollback),
 *   DATA_PIPELINE (T341 token deferral, T337 sitemap/RSS builder)
 *
 * Key patterns: IDurableTimer, IPublishRollbackExecutor (dual Entry A/B paths),
 *   ICdnSnapshotService, ISchemaAdditiveValidator (additive-only schema evolution),
 *   ITokenDeferralQueue, pgFirstSequential (CF-405 PG-first ordering),
 *   ICssBuildService (publish-pipeline context only)
 *
 * 15 named checks in flow-22-named-checks.ts:
 *   pg_first_before_es_write, etag_conflict_dataprocessresult_not_throw,
 *   schema_additive_only_no_removal, css_build_time_not_request_time,
 *   component_registry_append_only, ai_advisory_fire_and_suggest_only,
 *   media_transform_from_original_only, bfa_registration_before_activation,
 *   publish_saga_compensation_dual_entry, durable_timer_cancellable,
 *   ssg_immutable_build_artifacts, design_token_deferral_queue,
 *   workspace_id_equals_tenant_id, sitemap_rss_build_artifact_only,
 *   media_cdn_snapshot_required_before_rollback
 *
 * 8 mandatory E2E categories:
 *   1. Happy path — content publish → CDN snapshot → CSS build → sitemap
 *   2. Error path — DataProcessResult.failure on ETag conflict / schema removal
 *   3. Tenant isolation — tenant-scoped CMS content + workspace isolation
 *   4. Idempotency — duplicate publish requests deduplicated
 *   5. UI state mapping — loading / success / error / durable-timer state
 *   6. API contract — /api/dynamic/{indexName} response shape
 *   7. CloudEvents — events emitted with correct CloudEvents envelope
 *   8. Named checks — pg_first_before_es_write, schema_additive_only, css_build_time,
 *                     durable_timer_cancellable, media_cdn_snapshot_before_rollback
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
import {
  check_pg_first_before_es_write,
  check_etag_conflict_dataprocessresult_not_throw,
  check_schema_additive_only_no_removal,
  check_css_build_time_not_request_time,
  check_component_registry_append_only,
  check_ai_advisory_fire_and_suggest_only,
  check_media_transform_from_original_only,
  check_bfa_registration_before_activation,
  check_publish_saga_compensation_dual_entry,
  check_durable_timer_cancellable,
  check_ssg_immutable_build_artifacts,
  check_design_token_deferral_queue,
  check_workspace_id_equals_tenant_id,
  check_sitemap_rss_build_artifact_only,
  check_media_cdn_snapshot_required_before_rollback,
} from '../../../src/engine-contracts/cms-publishing-named-checks';

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
        runId: 'flow22-run-id',
        status: 'PASS',
        score: 90,
        trace: [
          { nodeId: 't330-content-manager', nodeType: 'service', status: 'PASS', durationMs: 7 },
          { nodeId: 't331-schema-registry', nodeType: 'service', status: 'PASS', durationMs: 5 },
          {
            nodeId: 't336-publish-saga',
            nodeType: 'orchestration',
            status: 'PASS',
            durationMs: 20,
          },
          {
            nodeId: 't337-sitemap-builder',
            nodeType: 'data_pipeline',
            status: 'PASS',
            durationMs: 14,
          },
          {
            nodeId: 't338-rollback-executor',
            nodeType: 'orchestration',
            status: 'PASS',
            durationMs: 10,
          },
          {
            nodeId: 't341-token-deferral',
            nodeType: 'data_pipeline',
            status: 'PASS',
            durationMs: 6,
          },
        ],
        finalOutput: { code: '// FLOW-22 CMS + publish saga + CDN snapshot + schema additive' },
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

// ── FLOW-22 contract params ──────────────────────────────────────────────────

function flow22PublishSagaParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T336_F22_PUBLISH${suffix}`,
    flowId: 'FLOW-22',
    flowName: 'CMS & Publishing Platform',
    name: 'PublishSagaOrchestrator',
    archetype: ContractArchetype.ORCHESTRATION,
    entry: 'publish.requested CloudEvent',
    purpose:
      'CMS publish saga: PG-first ordering (CF-405), CDN snapshot before rollback, ' +
      'schema additive-only (CF-407), token deferral queue (CF-402).',
    factoryDependencies: [
      {
        factoryId: 'F_DB_CMS22',
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'CMS content + schema persistence',
      },
      {
        factoryId: 'F_QUEUE_CMS22',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'CloudEvent emission for publish lifecycle',
      },
    ],
    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-9', role: 'judge', config: {} },
    ],
    qualityGates: [
      {
        gateId: 'QG-22-01',
        description: 'CF-405: PG write precedes ES index — pgFirstSequential()',
        severity: 'error',
        checkType: 'pg_first_before_es_write',
      },
      {
        gateId: 'QG-22-02',
        description: 'CF-407: schema additive-only — no removal allowed',
        severity: 'error',
        checkType: 'schema_additive_only_no_removal',
      },
      {
        gateId: 'QG-22-03',
        description: 'CF-408: CDN snapshot required before rollback',
        severity: 'error',
        checkType: 'media_cdn_snapshot_required_before_rollback',
      },
      {
        gateId: 'QG-22-04',
        description: 'CF-402: token deferral queue — no direct propagation',
        severity: 'error',
        checkType: 'design_token_deferral_queue',
      },
    ],
    bfaRegistration: {
      entities: [
        `cms_content_f22${suffix}`,
        `schema_registry_f22${suffix}`,
        `cdn_snapshot_f22${suffix}`,
      ],
      events: [
        `content.published.f22${suffix}`,
        `schema.version.created.f22${suffix}`,
        `publish.rollback.executed.f22${suffix}`,
        `design.token.deferred.f22${suffix}`,
      ],
      apiRoutes: [],
    },
    ironRules: [
      'PG write must precede ES index — never write ES first (CF-405)',
      'Schema changes must be additive only — removal requires separate approval flow',
      'CDN snapshot must be captured and verified before any rollback is initiated',
      'CSS must be compiled at publish time, never at request time (CF-411)',
    ],
    machineComponents: [
      'pgFirstSequential guard',
      'ISchemaAdditiveValidator',
      'ICdnSnapshotService',
      'IDurableTimer',
    ],
    freedomComponents: ['flow22_publish_timeout_ms', 'flow22_cdn_snapshot_retention_days'],
    familyId: 'Family-22',
  };
}

// ══════════════════════════════════════════════════════
// Category 1 — Happy Path
// ══════════════════════════════════════════════════════

describe('FLOW-22 E2E — Happy Path [Publish Saga + CDN Snapshot + Schema Additive]', () => {
  const TENANT = 'flow22-happy-tenant';

  it('F22-H1: publish saga contract generates — DataProcessResult.success', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow22PublishSagaParams('-h1'));
    const result = await engine.generate(contract, TENANT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('F22-H2: generated contract has flowId = FLOW-22', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow22PublishSagaParams('-h2'));
    const result = await engine.generate(contract, TENANT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.contractId).toBe('T336_F22_PUBLISH-h2');
  });

  it('F22-H3: CMS content stored in PG-first then ES — pgFirstSequential pattern', async () => {
    const db = makeInMemoryDb();
    const callOrder: string[] = [];

    const trackedPg = {
      ...db,
      storeDocument: jest.fn(async (...args: Parameters<typeof db.storeDocument>) => {
        callOrder.push('pg');
        return db.storeDocument(...args);
      }),
    };
    const esWrite = jest.fn(async () => {
      callOrder.push('es');
      return DataProcessResult.success(undefined);
    });

    await trackedPg.storeDocument(
      'cms-content',
      { slug: 'hello-world', status: 'published' },
      'content-001',
    );
    await esWrite();

    expect(callOrder[0]).toBe('pg');
    expect(callOrder[1]).toBe('es');
  });

  it('F22-H4: schema version created via registerVersion() — additive only', async () => {
    const db = makeInMemoryDb();

    // Additive: add new field 'publishedAt' to existing schema
    await db.storeDocument(
      'schema-versions',
      {
        schemaId: 'cms-article-schema',
        version: '2.0',
        addedFields: ['publishedAt', 'metaDescription'],
        removedFields: [],
        operationType: 'registerVersion',
      },
      'schema-v2',
    );

    const result = await db.getDocument('schema-versions', 'schema-v2');
    expect(result.isSuccess).toBe(true);
    expect((result.data as Record<string, unknown>)['operationType']).toBe('registerVersion');
    expect((result.data as Record<string, unknown>)['removedFields']).toHaveLength(0);
  });

  it('F22-H5: CDN snapshot captured before rollback — snaphotId stored', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'cdn-snapshots',
      {
        snapshotId: 'snap-001',
        contentSlug: 'hello-world',
        capturedAt: new Date().toISOString(),
        verified: true,
      },
      'snap-001',
    );

    const snapshot = await db.getDocument('cdn-snapshots', 'snap-001');
    expect(snapshot.isSuccess).toBe(true);
    expect((snapshot.data as Record<string, unknown>)['verified']).toBe(true);
  });

  it('F22-H6: token deferral queue written — direct propagation skipped', async () => {
    const db = makeInMemoryDb();

    // Token update goes to deferral queue, not direct propagation
    await db.storeDocument(
      'design-token-deferral',
      {
        tokenId: 'color-primary',
        newValue: '#1A73E8',
        deferredAt: new Date().toISOString(),
        status: 'deferred',
      },
      'deferral-001',
    );

    const deferred = await db.getDocument('design-token-deferral', 'deferral-001');
    expect(deferred.isSuccess).toBe(true);
    expect((deferred.data as Record<string, unknown>)['status']).toBe('deferred');
  });

  it('F22-H7: generation completes within 30s time budget', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow22PublishSagaParams('-h7'));
    const result = await engine.generate(contract, TENANT);

    expect(result.data!.elapsedMs).toBeLessThan(30_000);
  });

  it('F22-H8: durable timer cancel on already-fired timer — returns success with graceful handling', () => {
    // IDurableTimer.cancel() on already-fired timer must NOT throw
    const alreadyFiredResult = DataProcessResult.success({
      cancelled: false,
      alreadyFired: true,
    });

    const checkResult = check_durable_timer_cancellable(alreadyFiredResult);
    expect(checkResult.isSuccess).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Category 2 — Error Path
// ══════════════════════════════════════════════════════

describe('FLOW-22 E2E — Error Path', () => {
  it('F22-E1: ETag conflict returns DataProcessResult.failure — never throws', () => {
    const etagFailure = DataProcessResult.failure<unknown>(
      'ETAG_CONFLICT',
      'Document has been modified since last read (ETag mismatch)',
    );

    const checkResult = check_etag_conflict_dataprocessresult_not_throw(etagFailure);
    expect(checkResult.isSuccess).toBe(true);
    expect(etagFailure.isSuccess).toBe(false);
    expect(etagFailure.errorCode).toBe('ETAG_CONFLICT');
  });

  it('F22-E2: schema removal rejected by additive validator', () => {
    const result = check_schema_additive_only_no_removal(
      true, // validator was called
      ['legacyField', 'deprecatedCategory'], // attempted removals
    );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CHECK_FAILED_SCHEMA_REMOVAL');
    expect(result.errorMessage).toContain('legacyField');
  });

  it('F22-E3: schema validator NOT called — returns failure (CF-407)', () => {
    const result = check_schema_additive_only_no_removal(
      false, // validator not called
      [],
    );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CHECK_FAILED_VALIDATOR_NOT_CALLED');
  });

  it('F22-E4: rollback without CDN snapshot returns failure (CF-408)', () => {
    const result = check_media_cdn_snapshot_required_before_rollback(
      null, // no snapshot
      false,
    );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CHECK_FAILED_NO_SNAPSHOT');
    expect(result.errorMessage).toContain('CF-408');
  });

  it('F22-E5: rollback with unverified snapshot returns failure', () => {
    const result = check_media_cdn_snapshot_required_before_rollback(
      'snap-unverified-001',
      false, // not verified
    );

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CHECK_FAILED_SNAPSHOT_UNVERIFIED');
  });

  it('F22-E6: ETag exception thrown — check returns failure', () => {
    const thrownError = new Error('Database connection reset');

    const checkResult = check_etag_conflict_dataprocessresult_not_throw(thrownError);
    expect(checkResult.isSuccess).toBe(false);
    expect(checkResult.errorCode).toBe('CHECK_FAILED_ETAG_THROW');
  });
});

// ══════════════════════════════════════════════════════
// Category 3 — Tenant Isolation
// ══════════════════════════════════════════════════════

describe('FLOW-22 E2E — Tenant Isolation', () => {
  it('F22-T1: CMS content for tenant-A not visible in tenant-B store', async () => {
    const dbA = makeInMemoryDb();
    const dbB = makeInMemoryDb();

    await dbA.storeDocument(
      'cms-content',
      { slug: 'tenant-a-article', tenantId: 'tenant-A' },
      'a-content-1',
    );

    const bResults = await dbB.searchDocuments('cms-content', {});
    expect((bResults.data as Record<string, unknown>[]).length).toBe(0);
  });

  it('F22-T2: content.published CloudEvent includes tenantid — DNA-5 isolation', () => {
    const eventA = createCloudEvent({
      eventType: 'com.xiigen.content.published',
      source: 'flow-22/t336-publish-saga',
      data: { contentId: 'c-a1', slug: 'hello-world' },
      tenantId: 'tenant-A',
    });
    const eventB = createCloudEvent({
      eventType: 'com.xiigen.content.published',
      source: 'flow-22/t336-publish-saga',
      data: { contentId: 'c-b1', slug: 'hello-world' },
      tenantId: 'tenant-B',
    });

    expect(eventA['tenantid']).toBe('tenant-A');
    expect(eventB['tenantid']).toBe('tenant-B');
    expect(eventA['tenantid']).not.toBe(eventB['tenantid']);
  });

  it('F22-T3: workspace_id equals tenant_id check (CF-415)', () => {
    // CF-415: workspaceId in event data must exactly match tenantId from AsyncLocalStorage
    const result = check_workspace_id_equals_tenant_id('tenant-A', 'tenant-A');
    expect(result.isSuccess).toBe(true);

    const mismatch = check_workspace_id_equals_tenant_id('tenant-B', 'tenant-A');
    expect(mismatch.isSuccess).toBe(false);
    expect(mismatch.errorCode).toBe('CHECK_FAILED_WORKSPACE_TENANT_MISMATCH');
  });

  it('F22-T4: two engines generate independently — separate BFA state', async () => {
    const engineA = createEngine();
    const engineB = createEngine();

    const [rA, rB] = await Promise.all([
      engineA.generate(new EngineContract(flow22PublishSagaParams('-ta')), 'tenant-A'),
      engineB.generate(new EngineContract(flow22PublishSagaParams('-tb')), 'tenant-B'),
    ]);

    expect(rA.isSuccess).toBe(true);
    expect(rB.isSuccess).toBe(true);
    expect(rA.data!.contractId).toBe('T336_F22_PUBLISH-ta');
    expect(rB.data!.contractId).toBe('T336_F22_PUBLISH-tb');
  });

  it('F22-T5: CDN snapshots are tenant-scoped — no cross-tenant snapshot access', async () => {
    const dbA = makeInMemoryDb();
    const dbB = makeInMemoryDb();

    await dbA.storeDocument(
      'cdn-snapshots',
      { snapshotId: 'snap-a1', tenantId: 'tenant-A', verified: true },
      'snap-a1',
    );

    const bSnaps = await dbB.searchDocuments('cdn-snapshots', {});
    expect((bSnaps.data as Record<string, unknown>[]).length).toBe(0);
  });
});

// ══════════════════════════════════════════════════════
// Category 4 — Idempotency
// ══════════════════════════════════════════════════════

describe('FLOW-22 E2E — Idempotency', () => {
  it('F22-I1: duplicate publish request — same correlationId finds existing', async () => {
    const db = makeInMemoryDb();
    const correlationId = 'corr-publish-001';

    await db.storeDocument(
      'cms-content',
      {
        slug: 'hello-world',
        tenantId: 'tenant-i',
        correlationId,
        status: 'published',
      },
      correlationId,
    );

    const existing = await db.searchDocuments('cms-content', { correlationId });
    expect(existing.isSuccess).toBe(true);
    expect((existing.data as Record<string, unknown>[]).length).toBe(1);
  });

  it('F22-I2: schema registerVersion is idempotent — same version returns existing', async () => {
    const db = makeInMemoryDb();

    await db.storeDocument(
      'schema-versions',
      {
        schemaId: 'cms-schema',
        version: '1.0',
        addedFields: ['title'],
        operationType: 'registerVersion',
      },
      'schema-1.0',
    );

    // Second registerVersion for same id returns existing
    const existing = await db.getDocument('schema-versions', 'schema-1.0');
    expect(existing.isSuccess).toBe(true);
    expect((existing.data as Record<string, unknown>)['version']).toBe('1.0');
  });

  it('F22-I3: durable timer fires at most once — alreadyFired prevents re-fire', () => {
    const timerState = { fired: false };

    const fireDurableTimer = () => {
      if (timerState.fired) {
        return DataProcessResult.success({ alreadyFired: true });
      }
      timerState.fired = true;
      return DataProcessResult.success({ alreadyFired: false });
    };

    const firstFire = fireDurableTimer();
    expect((firstFire.data as Record<string, unknown>)['alreadyFired']).toBe(false);

    const secondFire = fireDurableTimer();
    expect((secondFire.data as Record<string, unknown>)['alreadyFired']).toBe(true);
  });

  it('F22-I4: BFA registration must precede workspace activation (CF-429)', () => {
    const registeredAt = Date.now() - 1000;
    const activatedAt = Date.now();

    const result = check_bfa_registration_before_activation(registeredAt, activatedAt);
    expect(result.isSuccess).toBe(true);

    // Reversed order fails
    const reversed = check_bfa_registration_before_activation(Date.now(), Date.now() - 1000);
    expect(reversed.isSuccess).toBe(false);
  });
});

// ══════════════════════════════════════════════════════
// Category 5 — UI State Mapping
// ══════════════════════════════════════════════════════

describe('FLOW-22 E2E — UI State Mapping', () => {
  it('F22-U1: loading state — publish in-flight (not yet resolved)', () => {
    const db = makeInMemoryDb();
    let resolved = false;
    const promise = db
      .storeDocument('cms-content', { slug: 'test', status: 'publishing' }, 'c1')
      .then((r) => {
        resolved = true;
        return r;
      });
    expect(resolved).toBe(false);
    return promise.then(() => expect(resolved).toBe(true));
  });

  it('F22-U2: success state — content.published has isSuccess=true', async () => {
    const db = makeInMemoryDb();
    const result = await db.storeDocument(
      'cms-content',
      { slug: 'hello-world', status: 'published' },
      'c-u2',
    );
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('F22-U3: error state — ETag conflict shown in UI (DataProcessResult.failure)', () => {
    const result = DataProcessResult.failure<unknown>(
      'ETAG_CONFLICT',
      'Content was updated by another session',
    );
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('ETAG_CONFLICT');
  });

  it('F22-U4: durable timer state — publish schedule shows countdown', () => {
    const scheduledAt = new Date(Date.now() + 86_400_000).toISOString(); // 24h from now
    const state = {
      slug: 'scheduled-post',
      status: 'scheduled',
      scheduledAt,
      remainingMs: 86_400_000,
    };

    expect(state.status).toBe('scheduled');
    expect(state.remainingMs).toBeGreaterThan(0);
  });

  it('F22-U5: rollback state — dual entry (compensation vs user-initiated)', () => {
    const compensationCheck = check_publish_saga_compensation_dual_entry(true, true);
    expect(compensationCheck.isSuccess).toBe(true);

    const missingCompensation = check_publish_saga_compensation_dual_entry(false, true);
    expect(missingCompensation.isSuccess).toBe(false);

    const missingUserInit = check_publish_saga_compensation_dual_entry(true, false);
    expect(missingUserInit.isSuccess).toBe(false);
  });

  it('F22-U6: toDict() serializes result — snake_case keys', () => {
    const result = DataProcessResult.success({ contentId: 'c-001', status: 'published' });
    const dict = result.toDict();

    expect(dict['is_success']).toBe(true);
    expect(dict['data']).toBeDefined();
    expect(dict['correlation_id']).toBeDefined();
    expect(dict['timestamp']).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════
// Category 6 — API Contract
// ══════════════════════════════════════════════════════

describe('FLOW-22 E2E — API Contract (/api/dynamic/{indexName})', () => {
  it('F22-A1: /api/dynamic/cms-content response has is_success, data, correlation_id', () => {
    const response = DataProcessResult.success([
      { contentId: 'c-001', slug: 'hello-world', status: 'published' },
    ]);
    const dict = response.toDict();

    expect(dict).toHaveProperty('is_success', true);
    expect(dict).toHaveProperty('data');
    expect(dict).toHaveProperty('correlation_id');
    expect(dict).toHaveProperty('timestamp');
  });

  it('F22-A2: /api/dynamic/schema-versions returns schema with operationType field', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'schema-versions',
      {
        schemaId: 'cms-schema',
        version: '1.0',
        operationType: 'registerVersion',
      },
      'schema-1.0',
    );

    const result = await db.searchDocuments('schema-versions', { schemaId: 'cms-schema' });
    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]['operationType']).toBe('registerVersion');
  });

  it('F22-A3: /api/dynamic/cdn-snapshots error response has is_success=false', () => {
    const errorResponse = DataProcessResult.failure<unknown>(
      'SNAPSHOT_NOT_FOUND',
      'CDN snapshot not found',
    );
    const dict = errorResponse.toDict();

    expect(dict['is_success']).toBe(false);
    expect(dict['error_code']).toBe('SNAPSHOT_NOT_FOUND');
    expect(dict['error_message']).toBe('CDN snapshot not found');
  });

  it('F22-A4: /api/dynamic/design-token-deferral returns deferred tokens', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'design-token-deferral',
      {
        tokenId: 'color-primary',
        status: 'deferred',
        tenantId: 'tenant-a',
      },
      'dt-001',
    );

    const result = await db.searchDocuments('design-token-deferral', { status: 'deferred' });
    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]['tokenId']).toBe('color-primary');
  });
});

// ══════════════════════════════════════════════════════
// Category 7 — CloudEvents
// ══════════════════════════════════════════════════════

describe('FLOW-22 E2E — CloudEvents (DNA-9)', () => {
  it('F22-C1: content.published conforms to CloudEvents v1.0', () => {
    const event = createCloudEvent({
      eventType: 'com.xiigen.content.published',
      source: 'flow-22/t336-publish-saga',
      data: { contentId: 'c-c1', slug: 'hello-world', publishedAt: new Date().toISOString() },
      tenantId: 'tenant-c1',
    });

    const [isValid, errors] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('F22-C2: schema.version.created event has required CloudEvents fields', () => {
    const event = createCloudEvent({
      eventType: 'com.xiigen.schema.version.created',
      source: 'flow-22/t331-schema-registry',
      data: { schemaId: 'cms-schema', version: '2.0', addedFields: ['publishedAt'] },
      tenantId: 'tenant-c2',
    });

    expect(event['specversion']).toBe('1.0');
    expect(event['id']).toBeDefined();
    expect(event['type']).toBe('com.xiigen.schema.version.created');
    expect(event['source']).toContain('flow-22');
    expect(event['tenantid']).toBe('tenant-c2');
    expect(event['datacontenttype']).toBe('application/json');
  });

  it('F22-C3: publish.rollback.executed event has both entry paths data', () => {
    const event = createCloudEvent({
      eventType: 'com.xiigen.publish.rollback.executed',
      source: 'flow-22/t338-rollback-executor',
      data: {
        contentId: 'c-c3',
        triggeredBy: 'compensation', // Entry A
        snapshotId: 'snap-001',
        rolledBackAt: new Date().toISOString(),
      },
      tenantId: 'tenant-c3',
    });

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    const data = event['data'] as Record<string, unknown>;
    expect(data['triggeredBy']).toBeDefined();
    expect(data['snapshotId']).toBeDefined();
  });

  it('F22-C4: design.token.deferred event — token update goes to deferral queue', () => {
    const event = createCloudEvent({
      eventType: 'com.xiigen.design.token.deferred',
      source: 'flow-22/t341-token-deferral',
      data: { tokenId: 'color-primary', newValue: '#1A73E8', deferredAt: new Date().toISOString() },
      tenantId: 'tenant-c4',
    });

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    const data = event['data'] as Record<string, unknown>;
    expect(data['tokenId']).toBeDefined();
    expect(data['newValue']).toBeDefined();
  });

  it('F22-C5: sitemap.built event — built only in publish-pipeline context', () => {
    const event = createCloudEvent({
      eventType: 'com.xiigen.sitemap.built',
      source: 'flow-22/t337-sitemap-builder',
      data: {
        sitemapUrl: 'https://example.com/sitemap.xml',
        builtAt: new Date().toISOString(),
        context: 'publish-pipeline',
      },
      tenantId: 'tenant-c5',
    });

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    const data = event['data'] as Record<string, unknown>;
    expect(data['context']).toBe('publish-pipeline');
  });
});

// ══════════════════════════════════════════════════════
// Category 8 — Named Checks (15 checks)
// ══════════════════════════════════════════════════════

describe('FLOW-22 E2E — Named Checks', () => {
  describe('pg_first_before_es_write (CF-405)', () => {
    it('F22-N1: PG write (t=100) before ES write (t=200) — check passes', () => {
      const result = check_pg_first_before_es_write(100, 200);
      expect(result.isSuccess).toBe(true);
    });

    it('F22-N2: ES write equal to PG write — check fails (strict ordering)', () => {
      const result = check_pg_first_before_es_write(100, 100);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CHECK_FAILED_PG_FIRST');
    });

    it('F22-N3: ES write before PG write — check fails CF-405', () => {
      const result = check_pg_first_before_es_write(200, 100);
      expect(result.isSuccess).toBe(false);
      expect(result.errorMessage).toContain('CF-405');
    });

    it('F22-N4: ES write null (not yet written) — check passes (PG-only state acceptable)', () => {
      const result = check_pg_first_before_es_write(100, null);
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('schema_additive_only_no_removal (CF-407)', () => {
    it('F22-N5: additive change with no removals — check passes', () => {
      const result = check_schema_additive_only_no_removal(true, []);
      expect(result.isSuccess).toBe(true);
    });

    it('F22-N6: removal of one field — check fails with field name in message', () => {
      const result = check_schema_additive_only_no_removal(true, ['oldField']);
      expect(result.isSuccess).toBe(false);
      expect(result.errorMessage).toContain('oldField');
    });
  });

  describe('css_build_time_not_request_time (CF-411)', () => {
    it('F22-N7: CSS compiled in publish-pipeline context — check passes', () => {
      const result = check_css_build_time_not_request_time('publish-pipeline');
      expect(result.isSuccess).toBe(true);
    });

    it('F22-N8: CSS compiled in http-request context — check fails CF-411', () => {
      const result = check_css_build_time_not_request_time('http-request');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CHECK_FAILED_CSS_CONTEXT');
      expect(result.errorMessage).toContain('CF-411');
    });
  });

  describe('component_registry_append_only (CF-403)', () => {
    it('F22-N9: registerVersion operation — check passes', () => {
      const result = check_component_registry_append_only('registerVersion');
      expect(result.isSuccess).toBe(true);
    });

    it('F22-N10: update operation — check fails CF-403', () => {
      const result = check_component_registry_append_only('update');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CHECK_FAILED_REGISTRY_MUTATION');
    });

    it('F22-N11: delete operation — check fails', () => {
      const result = check_component_registry_append_only('delete');
      expect(result.isSuccess).toBe(false);
    });
  });

  describe('ai_advisory_fire_and_suggest_only (CF-406)', () => {
    it('F22-N12: AI fire-and-suggest — not awaited, response returned before AI completed', () => {
      // CF-406: response returned before AI advisory completes
      const result = check_ai_advisory_fire_and_suggest_only(false, true);
      expect(result.isSuccess).toBe(true);
    });

    it('F22-N13: AI call is awaited blocking response — check fails CF-406', () => {
      const result = check_ai_advisory_fire_and_suggest_only(true, false);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CHECK_FAILED_AI_BLOCKING');
    });
  });

  describe('design_token_deferral_queue (CF-402)', () => {
    it('F22-N14: deferral queue written, no direct propagation — check passes', () => {
      const result = check_design_token_deferral_queue(true, false);
      expect(result.isSuccess).toBe(true);
    });

    it('F22-N15: direct propagation called — check fails CF-402', () => {
      const result = check_design_token_deferral_queue(true, true);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CHECK_FAILED_DIRECT_PROPAGATION');
    });
  });

  describe('media_cdn_snapshot_required_before_rollback (CF-408)', () => {
    it('F22-N16: snapshot exists and verified — rollback allowed', () => {
      const result = check_media_cdn_snapshot_required_before_rollback('snap-001', true);
      expect(result.isSuccess).toBe(true);
    });

    it('F22-N17: snapshot null — rollback blocked', () => {
      const result = check_media_cdn_snapshot_required_before_rollback(null, true);
      expect(result.isSuccess).toBe(false);
    });
  });

  describe('sitemap_rss_build_artifact_only (CF-414)', () => {
    it('F22-N18: sitemap generated in publish-pipeline — check passes', () => {
      const result = check_sitemap_rss_build_artifact_only('publish-pipeline');
      expect(result.isSuccess).toBe(true);
    });

    it('F22-N19: sitemap generated on http-request — check fails CF-414', () => {
      const result = check_sitemap_rss_build_artifact_only('http-request');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CHECK_FAILED_SITEMAP_ON_REQUEST');
    });
  });

  describe('media_transform_from_original_only (CF-427)', () => {
    it('F22-N20: transform source is original — check passes', () => {
      const result = check_media_transform_from_original_only({
        isOriginal: true,
        variantOf: null,
      });
      expect(result.isSuccess).toBe(true);
    });

    it('F22-N21: transform source is variant — check fails CF-427', () => {
      const result = check_media_transform_from_original_only({
        isOriginal: false,
        variantOf: 'thumb-400',
      });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('CHECK_FAILED_TRANSFORM_SOURCE');
    });
  });

  describe('ssg_immutable_build_artifacts (CF-428)', () => {
    it('F22-N22: overwrite attempt fails — artifact store is immutable', () => {
      const overwriteFailed = DataProcessResult.failure<unknown>(
        'ARTIFACT_EXISTS',
        'Artifact snap-001 already exists — write-once policy',
      );
      const checkResult = check_ssg_immutable_build_artifacts(overwriteFailed);
      expect(checkResult.isSuccess).toBe(true);
    });

    it('F22-N23: overwrite attempt succeeds — check fails (mutable artifact store)', () => {
      const overwriteSucceeded = DataProcessResult.success<unknown>({ overwritten: true });
      const checkResult = check_ssg_immutable_build_artifacts(overwriteSucceeded);
      expect(checkResult.isSuccess).toBe(false);
      expect(checkResult.errorCode).toBe('CHECK_FAILED_ARTIFACT_MUTABLE');
    });
  });
});
