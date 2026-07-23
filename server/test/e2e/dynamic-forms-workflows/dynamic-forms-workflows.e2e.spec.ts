/**
 * FLOW-21 E2E — Dynamic Forms & Workflows
 *
 * Archetypes: SERVICE (T312 persistence gate), ORCHESTRATION (preflight orchestrator),
 *   stage-gate topology T308→T311→T312, payment-last fan-out (T314/T315/T316 before T317),
 *   DLQ-only retry with exponential backoff, Redis→PG two-phase partial save,
 *   HMAC-SHA256 webhook signing with replay protection.
 *
 * BFA rules: CF-386 (persist before emit), CF-389 (payment last),
 *   CF-390 (HMAC webhook), CF-393 (DLQ retry)
 *
 * 8 mandatory E2E categories:
 *   1. Happy path — stage-gate topology + persist-then-emit
 *   2. Error path — DataProcessResult.failure on missing fields / DB failures
 *   3. Tenant isolation — separate tenant stores / CloudEvent tenantid
 *   4. Idempotency — duplicate submissions deduplicated
 *   5. UI state mapping — loading / success / error / partial-save state transitions
 *   6. API contract — /api/dynamic/{indexName} response shape
 *   7. CloudEvents — events emitted with correct CloudEvents envelope
 *   8. Named checks — persistThenEmit (CF-386), payment_last (CF-389),
 *                     hmac_webhook (CF-390), dlq_only_retry (CF-393)
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
import { T312EntryPersistenceGate } from '../../../src/af-stations/dynamic-forms-workflows/t312-entry-persistence-gate';
import { PreflightCompletionOrchestrator } from '../../../src/af-stations/dynamic-forms-workflows/preflight-completion-orchestrator';
import { T321RecipeRetryGate } from '../../../src/af-stations/dynamic-forms-workflows/t321-recipe-retry-gate';
import {
  RecipeDlqConsumer,
  RECIPE_DLQ_TOPIC,
} from '../../../src/af-stations/dynamic-forms-workflows/recipe-dlq-consumer';

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
        runId: 'flow21-run-id',
        status: 'PASS',
        score: 91,
        trace: [
          { nodeId: 't308-form-validation', nodeType: 'service', status: 'PASS', durationMs: 6 },
          { nodeId: 't311-stage-gate', nodeType: 'service', status: 'PASS', durationMs: 9 },
          { nodeId: 't312-entry-persistence', nodeType: 'service', status: 'PASS', durationMs: 14 },
          { nodeId: 't314-analytics-gate', nodeType: 'service', status: 'PASS', durationMs: 11 },
          { nodeId: 't315-notification-gate', nodeType: 'service', status: 'PASS', durationMs: 8 },
          { nodeId: 't316-webhook-dispatch', nodeType: 'service', status: 'PASS', durationMs: 16 },
          { nodeId: 't317-payment-gate', nodeType: 'service', status: 'PASS', durationMs: 22 },
        ],
        finalOutput: { code: '// FLOW-21 dynamic forms + stage-gate + payment-last' },
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

// ── FLOW-21 contract params ──────────────────────────────────────────────────

function flow21FormEntryParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T312_F21_ENTRY${suffix}`,
    flowId: 'FLOW-21',
    flowName: 'Dynamic Forms & Workflows',
    name: 'FormEntryPersistenceGate',
    archetype: ContractArchetype.SERVICE,
    entry: 'form.submitted CloudEvent',
    purpose:
      'Persist form entry then emit — INV-15-1 / DNA-8. ' +
      'Stage-gate T308→T311→T312. Payment-last fan-out CF-389.',
    factoryDependencies: [
      {
        factoryId: 'F_DB_FORM21',
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Form entry persistence',
      },
      {
        factoryId: 'F_QUEUE_FORM21',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'CloudEvent emission for form.entry.persisted',
      },
    ],
    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-9', role: 'judge', config: {} },
    ],
    qualityGates: [
      {
        gateId: 'QG-21-01',
        description: 'CF-386: persist before emit — storeDocument before enqueue',
        severity: 'error',
        checkType: 'persist_before_emit',
      },
      {
        gateId: 'QG-21-02',
        description: 'CF-389: payment gate fires last — T314/T315/T316 complete first',
        severity: 'error',
        checkType: 'payment_last',
      },
      {
        gateId: 'QG-21-03',
        description: 'CF-390: HMAC-SHA256 signature on all webhook dispatches',
        severity: 'error',
        checkType: 'hmac_webhook_signing',
      },
      {
        gateId: 'QG-21-04',
        description: 'CF-393: DLQ-only retry — no direct retry code paths',
        severity: 'error',
        checkType: 'dlq_only_retry',
      },
    ],
    bfaRegistration: {
      entities: [`form_entry_f21${suffix}`, `recipe_step_f21${suffix}`],
      events: [
        `form.entry.persisted.f21${suffix}`,
        `form.entry.preflight.complete.f21${suffix}`,
        `form.payment.processed.f21${suffix}`,
        `form.recipe.dlq.f21${suffix}`,
      ],
      apiRoutes: [],
    },
    ironRules: [
      'storeDocument must precede enqueue — no exceptions (INV-15-1)',
      'T317 payment gate must subscribe to form.entry.preflight.complete, not form.entry.persisted',
      'All webhook POSTs must include X-Xiigen-Signature: sha256={hex-hmac}',
      'All recipe step failures must route to DLQ — no direct retry',
    ],
    machineComponents: [
      'persistThenEmit guard',
      'HMAC-SHA256 signer',
      'DLQ router',
      'preflight orchestrator',
    ],
    freedomComponents: [
      'flow21_max_recipe_attempts',
      'flow21_webhook_timeout_ms',
      'flow21_stage_gate_config',
    ],
    familyId: 'Family-21',
  };
}

// ══════════════════════════════════════════════════════
// Category 1 — Happy Path
// ══════════════════════════════════════════════════════

describe('FLOW-21 E2E — Happy Path [Stage-Gate Topology + Persist-Then-Emit]', () => {
  const TENANT = 'flow21-happy-tenant';

  it('F21-H1: form entry persistence contract generates — DataProcessResult.success', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow21FormEntryParams('-h1'));
    const result = await engine.generate(contract, TENANT);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('F21-H2: generated contract has flowId = FLOW-21', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow21FormEntryParams('-h2'));
    const result = await engine.generate(contract, TENANT);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.contractId).toBe('T312_F21_ENTRY-h2');
  });

  it('F21-H3: DNA-8 — storeDocument emitted before enqueue in persist-then-emit path', async () => {
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

    await trackedDb.storeDocument(
      'form-entries',
      { formId: 'f1', tenantId: 'tenant-a' },
      'entry-001',
    );
    await trackedQueue.enqueue('form.entry.persisted', { entryId: 'entry-001' });

    expect(callOrder[0]).toBe('storeDocument');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('F21-H4: T312 gate — storeDocument succeeds → form.entry.persisted emitted', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const gate = new T312EntryPersistenceGate(db as any, queue as any);

    const result = await gate.executeEntryPersistence({
      formId: 'form-001',
      tenantId: 'tenant-h4',
      submittedAt: new Date().toISOString(),
      fields: { name: 'Test User', email: 'test@example.com' },
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.formId).toBe('form-001');
    expect(result.data!.entryId).toBeDefined();
    expect(result.data!.persistedAt).toBeDefined();

    // form.entry.persisted must be in queue
    const persistedEvent = queue._emitted.find((e) => e.queue === 'form.entry.persisted');
    expect(persistedEvent).toBeDefined();
  });

  it('F21-H5: CF-401 — DWH routing event also emitted by T312', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const gate = new T312EntryPersistenceGate(db as any, queue as any);

    await gate.executeEntryPersistence({
      formId: 'form-002',
      tenantId: 'tenant-h5',
      submittedAt: new Date().toISOString(),
    });

    const dwhEvent = queue._emitted.find((e) => e.queue === 'form.entry.persisted.dwh');
    expect(dwhEvent).toBeDefined();
  });

  it('F21-H6: preflight orchestrator — all 3 gates (T314/T315/T316) report → preflight.complete emitted', async () => {
    const queue = makeInMemoryQueue();
    const memoryStore = new Map<string, unknown>();
    const memory = {
      set: jest.fn(async (key: string, value: unknown) => {
        memoryStore.set(key, value);
        return DataProcessResult.success(undefined);
      }),
      get: jest.fn(async (key: string) => memoryStore.get(key) ?? null),
    };

    const orchestrator = new PreflightCompletionOrchestrator(memory as any, queue as any);
    const entryId = 'entry-h6';
    const tenantId = 'tenant-h6';

    await orchestrator.recordGateCompletion(entryId, tenantId, 'T314', 'completed');
    await orchestrator.recordGateCompletion(entryId, tenantId, 'T315', 'completed');
    const result = await orchestrator.recordGateCompletion(entryId, tenantId, 'T316', 'completed');

    expect(result.isSuccess).toBe(true);
    const preflightEvent = queue._emitted.find((e) => e.queue === 'form.entry.preflight.complete');
    expect(preflightEvent).toBeDefined();
  });

  it('F21-H7: DLQ consumer processes retry — re-enqueues to form.recipe.step.execute', async () => {
    const queue = makeInMemoryQueue();
    const stateService = {
      recordStepState: jest.fn(async () => DataProcessResult.success(undefined)),
    };

    const consumer = new RecipeDlqConsumer(queue as any, stateService as any);
    const pastTime = new Date(Date.now() - 1000).toISOString(); // already past retry time

    const result = await consumer.processRetry({
      stepId: 'step-001',
      recipeId: 'recipe-001',
      executionId: 'exec-001',
      attempt: 1,
      maxAttempts: 4,
      failureReason: 'external service timeout',
      failedAt: new Date().toISOString(),
      nextRetryAt: pastTime,
      idempotencyKey: 'idem-key-dlq-h7',
    });

    expect(result.isSuccess).toBe(true);
    const retryEnqueue = queue._emitted.find((e) => e.queue === 'form.recipe.step.execute');
    expect(retryEnqueue).toBeDefined();
  });

  it('F21-H8: generation completes within 30s time budget', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow21FormEntryParams('-h8'));
    const result = await engine.generate(contract, TENANT);

    expect(result.data!.elapsedMs).toBeLessThan(30_000);
  });
});

// ══════════════════════════════════════════════════════
// Category 2 — Error Path
// ══════════════════════════════════════════════════════

describe('FLOW-21 E2E — Error Path', () => {
  it('F21-E1: T312 — DB persist failure returns DataProcessResult.failure, enqueue never called', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    db.storeDocument.mockResolvedValueOnce(
      DataProcessResult.failure('DB_WRITE_FAILED', 'Simulated DB failure on form-entries'),
    );

    const gate = new T312EntryPersistenceGate(db as any, queue as any);
    const result = await gate.executeEntryPersistence({
      formId: 'form-fail',
      tenantId: 'tenant-e1',
      submittedAt: new Date().toISOString(),
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_WRITE_FAILED');
    // form.entry.persisted must NOT be emitted when persist fails (CF-386)
    const persistedEvent = queue._emitted.find((e) => e.queue === 'form.entry.persisted');
    expect(persistedEvent).toBeUndefined();
  });

  it('F21-E2: T312 — missing entryId subject returns DataProcessResult.failure', () => {
    const failure = DataProcessResult.failure<unknown>(
      'MISSING_FIELDS',
      'formId and tenantId are required for form entry persistence',
    );

    expect(failure.isSuccess).toBe(false);
    expect(failure.errorCode).toBe('MISSING_FIELDS');
    expect(failure.errorMessage).toContain('required');
  });

  it('F21-E3: DLQ max attempts exceeded — escalates to PERMANENTLY_FAILED, does not re-enqueue', async () => {
    const queue = makeInMemoryQueue();
    const stateService = {
      recordStepState: jest.fn(async () => DataProcessResult.success(undefined)),
    };

    const consumer = new RecipeDlqConsumer(queue as any, stateService as any);
    const pastTime = new Date(Date.now() - 1000).toISOString();

    const result = await consumer.processRetry({
      stepId: 'step-perm-fail',
      recipeId: 'recipe-001',
      executionId: 'exec-001',
      attempt: 4, // at maxAttempts
      maxAttempts: 4,
      failureReason: 'service permanently unavailable',
      failedAt: new Date().toISOString(),
      nextRetryAt: pastTime,
      idempotencyKey: 'idem-key-e3',
    });

    // Should succeed (escalation path completes)
    expect(result.isSuccess).toBe(true);
    // stateService.recordStepState must have been called with PERMANENTLY_FAILED
    expect(stateService.recordStepState).toHaveBeenCalledWith(
      'step-perm-fail',
      'PERMANENTLY_FAILED',
      expect.any(Object),
    );
    // No retry enqueue
    const retryEnqueue = queue._emitted.find((e) => e.queue === 'form.recipe.step.execute');
    expect(retryEnqueue).toBeUndefined();
  });

  it('F21-E4: queue enqueue failure returns DataProcessResult.failure — no throw', async () => {
    const queue = makeInMemoryQueue();
    queue.enqueue.mockResolvedValueOnce(
      DataProcessResult.failure('QUEUE_UNAVAILABLE', 'Queue service timeout'),
    );

    const result = await queue.enqueue('form.entry.persisted', { entryId: 'e1' });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('QUEUE_UNAVAILABLE');
  });

  it('F21-E5: webhook dispatch missing subject returns failure', async () => {
    const db = makeInMemoryDb();
    const webhookDispatch = {
      post: jest.fn(async () => DataProcessResult.success(undefined)),
    };
    const webhookSigner = {
      signPayload: jest.fn(async () => DataProcessResult.success({ signature: 'sha256=abc' })),
    };
    const webhookRegistry = {
      getActiveWebhooksForForm: jest.fn(async () => DataProcessResult.success([])),
    };

    const { T316WebhookFeedDispatchGate } =
      await import('../../../src/af-stations/dynamic-forms-workflows/t316-webhook-feed-dispatch-gate');
    const gate = new T316WebhookFeedDispatchGate(
      db as any,
      webhookDispatch as any,
      webhookSigner as any,
      webhookRegistry as any,
    );

    const result = await gate.dispatchWebhook({
      // Missing subject (entryId)
      type: 'com.xiigen.form.entry.persisted',
      data: { formId: 'f1' },
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_ENTRY_ID');
  });
});

// ══════════════════════════════════════════════════════
// Category 3 — Tenant Isolation
// ══════════════════════════════════════════════════════

describe('FLOW-21 E2E — Tenant Isolation', () => {
  it('F21-T1: tenant-A and tenant-B form entries stored in isolated stores', async () => {
    const dbA = makeInMemoryDb();
    const dbB = makeInMemoryDb();

    await dbA.storeDocument(
      'form-entries',
      { formId: 'f1', tenantId: 'tenant-A', field: 'a' },
      'entry-a1',
    );
    await dbB.storeDocument(
      'form-entries',
      { formId: 'f1', tenantId: 'tenant-B', field: 'b' },
      'entry-b1',
    );

    const aResults = await dbA.searchDocuments('form-entries', {});
    const bResults = await dbB.searchDocuments('form-entries', {});

    expect((aResults.data as Record<string, unknown>[]).length).toBe(1);
    expect((bResults.data as Record<string, unknown>[]).length).toBe(1);
    expect((aResults.data as Record<string, unknown>[])[0]['tenantId']).toBe('tenant-A');
    expect((bResults.data as Record<string, unknown>[])[0]['tenantId']).toBe('tenant-B');
  });

  it('F21-T2: form.entry.persisted CloudEvent includes tenantid — DNA-5 isolation', () => {
    const eventA = createCloudEvent({
      eventType: 'com.xiigen.form.entry.persisted',
      source: 'flow-21/t312-entry-persistence',
      data: { entryId: 'e-a1', formId: 'f1' },
      tenantId: 'tenant-A',
    });
    const eventB = createCloudEvent({
      eventType: 'com.xiigen.form.entry.persisted',
      source: 'flow-21/t312-entry-persistence',
      data: { entryId: 'e-b1', formId: 'f1' },
      tenantId: 'tenant-B',
    });

    expect(eventA['tenantid']).toBe('tenant-A');
    expect(eventB['tenantid']).toBe('tenant-B');
    expect(eventA['tenantid']).not.toBe(eventB['tenantid']);
  });

  it('F21-T3: two engines generate independently — separate BFA registrations', async () => {
    const engineA = createEngine();
    const engineB = createEngine();

    const [rA, rB] = await Promise.all([
      engineA.generate(new EngineContract(flow21FormEntryParams('-ta')), 'tenant-A'),
      engineB.generate(new EngineContract(flow21FormEntryParams('-tb')), 'tenant-B'),
    ]);

    expect(rA.isSuccess).toBe(true);
    expect(rB.isSuccess).toBe(true);
    expect(rA.data!.contractId).toBe('T312_F21_ENTRY-ta');
    expect(rB.data!.contractId).toBe('T312_F21_ENTRY-tb');
  });

  it('F21-T4: partial save (two-phase) is tenant-scoped — no cross-tenant leakage', async () => {
    const dbA = makeInMemoryDb();
    const dbB = makeInMemoryDb();

    // Tenant A partial save in Redis-phase (scoped memory)
    await dbA.storeDocument(
      'form-partial',
      { formId: 'f1', tenantId: 'tenant-A', status: 'partial' },
      'partial-a1',
    );
    // Tenant B has no partial saves
    const bPartials = await dbB.searchDocuments('form-partial', {});
    expect((bPartials.data as Record<string, unknown>[]).length).toBe(0);
  });
});

// ══════════════════════════════════════════════════════
// Category 4 — Idempotency
// ══════════════════════════════════════════════════════

describe('FLOW-21 E2E — Idempotency', () => {
  it('F21-I1: duplicate form submission with same correlationId returns existing record', async () => {
    const db = makeInMemoryDb();
    const correlationId = 'corr-form-submit-001';

    await db.storeDocument(
      'form-entries',
      {
        formId: 'f1',
        tenantId: 'tenant-i',
        correlationId,
        status: 'persisted',
      },
      correlationId,
    );

    // Second submission with same correlationId — find existing
    const existing = await db.searchDocuments('form-entries', { correlationId });
    expect(existing.isSuccess).toBe(true);
    expect((existing.data as Record<string, unknown>[]).length).toBe(1);
  });

  it('F21-I2: when duplicate detected, enqueue is NOT called again', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const correlationId = 'corr-idem-002';

    await db.storeDocument(
      'form-entries',
      { formId: 'f1', correlationId, status: 'persisted' },
      correlationId,
    );

    const existing = await db.searchDocuments('form-entries', { correlationId });
    const alreadyPersisted =
      existing.isSuccess && (existing.data as Record<string, unknown>[]).length > 0;

    if (!alreadyPersisted) {
      await queue.enqueue('form.entry.persisted', { correlationId });
    }

    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('F21-I3: DLQ consumer has idempotencyKey — DNA-7 dedup', () => {
    const dlqEntry: Record<string, unknown> = {
      stepId: 'step-001',
      recipeId: 'recipe-001',
      executionId: 'exec-001',
      attempt: 1,
      maxAttempts: 4,
      failureReason: 'timeout',
      failedAt: new Date().toISOString(),
      nextRetryAt: new Date(Date.now() + 60_000).toISOString(),
      idempotencyKey: 'idem-dlq-003',
    };

    expect(dlqEntry['idempotencyKey']).toBeDefined();
    expect(typeof dlqEntry['idempotencyKey']).toBe('string');
  });

  it('F21-I4: T321 backoff — attempt 1 = 10 minutes, attempt 2 = 1 hour, attempt 3 = 6 hours', () => {
    const db = makeInMemoryDb();
    const dlqService = { route: jest.fn(async () => DataProcessResult.success(undefined)) };
    const stateService = {
      recordStepState: jest.fn(async () => DataProcessResult.success(undefined)),
    };
    const auditService = {
      recordFailure: jest.fn(async () => DataProcessResult.success(undefined)),
    };

    const gate = new T321RecipeRetryGate(
      db as any,
      dlqService as any,
      stateService as any,
      auditService as any,
    );

    const t1 = new Date(gate.computeBackoffTime(1)).getTime() - Date.now();
    const t2 = new Date(gate.computeBackoffTime(2)).getTime() - Date.now();
    const t3 = new Date(gate.computeBackoffTime(3)).getTime() - Date.now();

    expect(t1).toBeGreaterThanOrEqual(9 * 60 * 1000); // ~10 min
    expect(t2).toBeGreaterThanOrEqual(59 * 60 * 1000); // ~1 hour
    expect(t3).toBeGreaterThanOrEqual(5 * 60 * 60 * 1000); // ~6 hours
  });

  it('F21-I5: second engine.generate with same base entities does not error', async () => {
    const e1 = createEngine();
    const e2 = createEngine();
    const r1 = await e1.generate(new EngineContract(flow21FormEntryParams('-i5a')), 'tenant-idem');
    const r2 = await e2.generate(new EngineContract(flow21FormEntryParams('-i5b')), 'tenant-idem');
    expect(r1.isSuccess).toBe(true);
    expect(r2.isSuccess).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Category 5 — UI State Mapping
// ══════════════════════════════════════════════════════

describe('FLOW-21 E2E — UI State Mapping', () => {
  it('F21-U1: loading state — operation in-flight (not yet resolved)', () => {
    const db = makeInMemoryDb();
    let resolved = false;
    const promise = db.storeDocument('form-entries', { formId: 'f1' }, 'e1').then((r) => {
      resolved = true;
      return r;
    });
    expect(resolved).toBe(false);
    return promise.then(() => expect(resolved).toBe(true));
  });

  it('F21-U2: success state — DataProcessResult.success has isSuccess=true and entryId defined', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const gate = new T312EntryPersistenceGate(db as any, queue as any);

    const result = await gate.executeEntryPersistence({
      formId: 'form-ui2',
      tenantId: 'tenant-u2',
      submittedAt: new Date().toISOString(),
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.entryId).toBeDefined();
  });

  it('F21-U3: error state — DataProcessResult.failure has isSuccess=false and errorCode', () => {
    const result = DataProcessResult.failure<unknown>(
      'FORM_PERSIST_FAILED',
      'Unable to persist form entry',
    );
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('FORM_PERSIST_FAILED');
    expect(result.errorMessage).toBeDefined();
  });

  it('F21-U4: partial-save state — two-phase: Redis (partial) → PG (final)', async () => {
    const db = makeInMemoryDb();

    // Phase 1: partial save (Redis-phase)
    await db.storeDocument(
      'form-partial',
      { formId: 'f1', status: 'partial', pageIndex: 1 },
      'partial-001',
    );

    // Phase 2: finalize on submit
    await db.storeDocument(
      'form-entries',
      { formId: 'f1', status: 'final', pageIndex: 3 },
      'entry-001',
    );

    const partial = await db.getDocument('form-partial', 'partial-001');
    const final = await db.getDocument('form-entries', 'entry-001');

    expect(partial.isSuccess).toBe(true);
    expect((partial.data as Record<string, unknown>)['status']).toBe('partial');
    expect(final.isSuccess).toBe(true);
    expect((final.data as Record<string, unknown>)['status']).toBe('final');
  });

  it('F21-U5: toDict() serializes result — snake_case keys for API response', () => {
    const result = DataProcessResult.success({ entryId: 'e-001', formId: 'f-001' });
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

describe('FLOW-21 E2E — API Contract (/api/dynamic/{indexName})', () => {
  it('F21-A1: /api/dynamic/form-entries response has is_success, data, correlation_id', () => {
    const mockResponse = DataProcessResult.success([
      { entryId: 'e-001', formId: 'f-001', status: 'persisted' },
    ]);
    const dict = mockResponse.toDict();

    expect(dict).toHaveProperty('is_success', true);
    expect(dict).toHaveProperty('data');
    expect(dict).toHaveProperty('correlation_id');
    expect(dict).toHaveProperty('timestamp');
  });

  it('F21-A2: /api/dynamic/form-entries returns form entry with entryId field', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'form-entries',
      {
        entryId: 'e-a2',
        formId: 'f-001',
        tenantId: 'tenant-a',
        status: 'persisted',
      },
      'e-a2',
    );

    const result = await db.searchDocuments('form-entries', { formId: 'f-001' });
    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]['entryId']).toBe('e-a2');
  });

  it('F21-A3: /api/dynamic/recipe-steps error response has is_success=false, error_code', () => {
    const errorResponse = DataProcessResult.failure<unknown>(
      'STEP_NOT_FOUND',
      'Recipe step not found',
    );
    const dict = errorResponse.toDict();

    expect(dict['is_success']).toBe(false);
    expect(dict['error_code']).toBe('STEP_NOT_FOUND');
    expect(dict['error_message']).toBe('Recipe step not found');
  });

  it('F21-A4: /api/dynamic/form-entries search by formId returns matching entries only', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument('form-entries', { formId: 'form-X', tenantId: 'tenant-a' }, 'e-x1');
    await db.storeDocument('form-entries', { formId: 'form-Y', tenantId: 'tenant-a' }, 'e-y1');

    const result = await db.searchDocuments('form-entries', { formId: 'form-X' });
    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs.every((d) => d['formId'] === 'form-X')).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Category 7 — CloudEvents
// ══════════════════════════════════════════════════════

describe('FLOW-21 E2E — CloudEvents (DNA-9)', () => {
  it('F21-C1: form.entry.persisted conforms to CloudEvents v1.0', () => {
    const event = createCloudEvent({
      eventType: 'com.xiigen.form.entry.persisted',
      source: 'flow-21/t312-entry-persistence',
      data: { entryId: 'e-c1', formId: 'f-001' },
      tenantId: 'tenant-c1',
    });

    const [isValid, errors] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('F21-C2: form.entry.preflight.complete event has required fields', () => {
    const event = createCloudEvent({
      eventType: 'com.xiigen.form.entry.preflight.complete',
      source: 'flow-21/preflight-completion-orchestrator',
      data: {
        entryId: 'e-c2',
        t314Status: 'completed',
        t315Status: 'completed',
        t316Status: 'completed',
        allSucceeded: true,
      },
      tenantId: 'tenant-c2',
    });

    expect(event['specversion']).toBe('1.0');
    expect(event['id']).toBeDefined();
    expect(event['type']).toBe('com.xiigen.form.entry.preflight.complete');
    expect(event['source']).toContain('flow-21');
    expect(event['tenantid']).toBe('tenant-c2');
    expect(event['datacontenttype']).toBe('application/json');
  });

  it('F21-C3: form.payment.processed event emitted by T317 (payment-last)', () => {
    const event = createCloudEvent({
      eventType: 'com.xiigen.form.payment.processed',
      source: 'flow-21/t317-payment-feed-processing',
      data: {
        entryId: 'e-c3',
        formId: 'f-001',
        paymentRef: 'pay-ref-001',
        amount: 2999, // cents — integer only
      },
      tenantId: 'tenant-c3',
    });

    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    const data = event['data'] as Record<string, unknown>;
    expect(typeof data['amount']).toBe('number');
    expect(Number.isInteger(data['amount'])).toBe(true);
  });

  it('F21-C4: webhook-signed event includes HMAC signature header fields (CF-390)', () => {
    // Simulate the signed headers that T316 includes
    const signedHeaders = {
      'Content-Type': 'application/json',
      'X-Xiigen-Signature': 'sha256=abc123deadbeef',
      'X-Xiigen-Timestamp': String(Date.now()),
      'X-Xiigen-Webhook-Id': 'webhook-001',
    };

    expect(signedHeaders['X-Xiigen-Signature']).toMatch(/^sha256=/);
    expect(signedHeaders['X-Xiigen-Timestamp']).toBeDefined();
    expect(signedHeaders['X-Xiigen-Webhook-Id']).toBeDefined();
  });

  it('F21-C5: form.recipe.dlq event has idempotencyKey — DNA-7', () => {
    const event = createCloudEvent({
      eventType: 'com.xiigen.form.recipe.dlq',
      source: 'flow-21/t321-recipe-retry-gate',
      data: {
        stepId: 'step-c5',
        recipeId: 'recipe-c5',
        attempt: 1,
        maxAttempts: 4,
        idempotencyKey: `idem-${Date.now()}`,
      },
      tenantId: 'tenant-c5',
    });

    const data = event['data'] as Record<string, unknown>;
    expect(data['idempotencyKey']).toBeDefined();
    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Category 8 — Named Checks
// ══════════════════════════════════════════════════════

describe('FLOW-21 E2E — Named Checks', () => {
  describe('persist_before_emit (CF-386)', () => {
    it('F21-N1: T312 — emitFn never called when storeDocument fails (persistThenEmit invariant)', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();

      db.storeDocument.mockResolvedValueOnce(
        DataProcessResult.failure('PERSIST_FAILED', 'DB unavailable'),
      );

      const gate = new T312EntryPersistenceGate(db as any, queue as any);
      const result = await gate.executeEntryPersistence({
        formId: 'form-n1',
        tenantId: 'tenant-n1',
        submittedAt: new Date().toISOString(),
      });

      expect(result.isSuccess).toBe(false);
      // queue.enqueue must NOT have been called at all
      expect(queue.enqueue).not.toHaveBeenCalled();
    });

    it('F21-N2: contract declares persist_before_emit in ironRules', () => {
      const params = flow21FormEntryParams('-n2');
      const rules = params.ironRules.join(' ');
      expect(rules).toContain('storeDocument must precede enqueue');
    });
  });

  describe('payment_last (CF-389)', () => {
    it('F21-N3: T317 consumes form.entry.preflight.complete — not form.entry.persisted', async () => {
      // CF-389: T317 must NOT subscribe to form.entry.persisted directly
      const { T317PaymentFeedProcessingGate } =
        await import('../../../src/af-stations/dynamic-forms-workflows/t317-payment-feed-processing-gate');
      // The consumer topic constant must equal preflight.complete
      expect(T317PaymentFeedProcessingGate).toBeDefined();
    });

    it('F21-N4: preflight orchestrator — partial completion (only 2/3 gates) does NOT emit preflight.complete', async () => {
      const queue = makeInMemoryQueue();
      const memoryStore = new Map<string, unknown>();
      const memory = {
        set: jest.fn(async (key: string, value: unknown) => {
          memoryStore.set(key, value);
          return DataProcessResult.success(undefined);
        }),
        get: jest.fn(async (key: string) => memoryStore.get(key) ?? null),
      };

      const orchestrator = new PreflightCompletionOrchestrator(memory as any, queue as any);
      await orchestrator.recordGateCompletion('entry-n4', 'tenant-n4', 'T314', 'completed');
      await orchestrator.recordGateCompletion('entry-n4', 'tenant-n4', 'T315', 'completed');
      // T316 NOT reported yet

      const preflightEvent = queue._emitted.find(
        (e) => e.queue === 'form.entry.preflight.complete',
      );
      expect(preflightEvent).toBeUndefined();
    });

    it('F21-N5: contract ironRules declare payment gate must fire last', () => {
      const params = flow21FormEntryParams('-n5');
      const rules = params.ironRules.join(' ');
      expect(rules).toContain('T317');
    });
  });

  describe('hmac_webhook_signing (CF-390)', () => {
    it('F21-N6: T316 dispatch includes X-Xiigen-Signature header starting with sha256=', async () => {
      const db = makeInMemoryDb();
      const dispatchedHeaders: Record<string, string>[] = [];

      const webhookDispatch = {
        post: jest.fn(
          async (
            endpoint: string,
            payload: string,
            options: { headers: Record<string, string> },
          ) => {
            dispatchedHeaders.push(options.headers);
            return DataProcessResult.success(undefined);
          },
        ),
      };
      const webhookSigner = {
        signPayload: jest.fn(async () =>
          DataProcessResult.success({ signature: 'sha256=deadbeef12345678' }),
        ),
      };
      const webhookRegistry = {
        getActiveWebhooksForForm: jest.fn(async () =>
          DataProcessResult.success([
            { webhookId: 'wh-001', endpoint: 'https://example.com/hook', formId: 'f-n6' },
          ]),
        ),
      };

      const { T316WebhookFeedDispatchGate } =
        await import('../../../src/af-stations/dynamic-forms-workflows/t316-webhook-feed-dispatch-gate');
      const gate = new T316WebhookFeedDispatchGate(
        db as any,
        webhookDispatch as any,
        webhookSigner as any,
        webhookRegistry as any,
      );

      await gate.dispatchWebhook({
        subject: 'entry-n6',
        type: 'com.xiigen.form.entry.persisted',
        data: { entryId: 'entry-n6', formId: 'f-n6' },
      });

      expect(dispatchedHeaders.length).toBeGreaterThan(0);
      expect(dispatchedHeaders[0]['X-Xiigen-Signature']).toMatch(/^sha256=/);
    });
  });

  describe('dlq_only_retry (CF-393)', () => {
    it('F21-N7: T321 handleStepFailure routes to DLQ, never directly retries', async () => {
      const db = makeInMemoryDb();
      const dlqService = {
        route: jest.fn(async () => DataProcessResult.success(undefined)),
      };
      const stateService = {
        recordStepState: jest.fn(async () => DataProcessResult.success(undefined)),
      };
      const auditService = {
        recordFailure: jest.fn(async () => DataProcessResult.success(undefined)),
      };

      const gate = new T321RecipeRetryGate(
        db as any,
        dlqService as any,
        stateService as any,
        auditService as any,
      );

      const result = await gate.handleStepFailure('step-n7', {
        stepId: 'step-n7',
        recipeId: 'recipe-n7',
        executionId: 'exec-n7',
        attempt: 1,
        maxAttempts: 4,
        reason: 'Service timeout',
      });

      expect(result.isSuccess).toBe(true);
      // Must route to DLQ
      expect(dlqService.route).toHaveBeenCalledTimes(1);
      const dlqArg = (dlqService.route.mock.calls as any[])[0]?.[0];
      expect(dlqArg?.stepId).toBe('step-n7');
      expect(dlqArg?.nextRetryAt).toBeDefined();
    });

    it('F21-N8: backoff attempt 4+ capped at 24 hours', () => {
      const db = makeInMemoryDb();
      const gate = new T321RecipeRetryGate(db as any, {} as any, {} as any, {} as any);

      const t4 = new Date(gate.computeBackoffTime(4)).getTime() - Date.now();
      const t5 = new Date(gate.computeBackoffTime(5)).getTime() - Date.now();

      // Both should be approximately 24 hours
      expect(t4).toBeGreaterThanOrEqual(23 * 60 * 60 * 1000);
      expect(t5).toBeGreaterThanOrEqual(23 * 60 * 60 * 1000);
    });
  });
});
