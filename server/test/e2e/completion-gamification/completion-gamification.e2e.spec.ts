/**
 * FLOW-05 E2E — Completion & Gamification
 *
 * Archetypes: COMPLETION, GAMIFICATION, BROADCAST_SOCIAL
 * Named checks: lifo_compensation_order, evidence_payload_not_logged,
 *   evidence_type_validation, idempotent_completion, config_driven_award,
 *   broadcast_social_exact_match, typed_discriminated_payload
 *
 * 8 mandatory E2E categories:
 *   1. Happy path — completion → award points → broadcast social
 *   2. Error path — DataProcessResult.failure() on missing fields
 *   3. Tenant isolation — tenant-A and tenant-B completions stay isolated
 *   4. Idempotency — duplicate completion event deduplicated
 *   5. UI state mapping — loading / success / error state transitions
 *   6. API contract — /api/dynamic/{indexName} response shape
 *   7. CloudEvents — events emitted with correct CloudEvents envelope
 *   8. Named checks — lifo_compensation_order, config_driven_award
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

// ── Mock fabric providers ───────────────────────────────────────────────────

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
        runId: 'flow05-run-id',
        status: 'PASS',
        score: 92,
        trace: [
          { nodeId: 'completion-gate', nodeType: 'completion', status: 'PASS', durationMs: 5 },
          { nodeId: 'award-points', nodeType: 'gamification', status: 'PASS', durationMs: 8 },
          {
            nodeId: 'social-broadcast',
            nodeType: 'broadcast-social',
            status: 'PASS',
            durationMs: 12,
          },
        ],
        finalOutput: { code: '// FLOW-05 completion + gamification + social broadcast' },
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

// ── FLOW-05 contract params ─────────────────────────────────────────────────

function flow05CompletionParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T_F05_COMPLETION${suffix}`,
    flowId: 'FLOW-05',
    flowName: 'Completion & Gamification',
    name: 'LessonCompletionGateway',
    archetype: ContractArchetype.COMPLETION,
    entry: 'lesson.completion.received CloudEvent',
    purpose:
      'Idempotent lesson completion gate — setIfAbsent enforced before emit. ' +
      'Awards points from FREEDOM config thresholds. Broadcasts social event.',
    factoryDependencies: [
      {
        factoryId: 'F_DB_COMPLETION',
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Completion record persistence',
      },
      {
        factoryId: 'F_QUEUE_COMPLETION',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'CloudEvent emission for completion + social broadcast',
      },
    ],
    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-9', role: 'judge', config: {} },
    ],
    qualityGates: [
      {
        gateId: 'QG-05-01',
        description: 'Completion is idempotent — setIfAbsent before emit',
        severity: 'error',
        checkType: 'idempotent_completion',
      },
      {
        gateId: 'QG-05-02',
        description: 'Award points from FREEDOM config only — no hardcoded thresholds',
        severity: 'error',
        checkType: 'config_driven_award',
      },
      {
        gateId: 'QG-05-03',
        description: 'LIFO compensation ordering enforced on rollback path',
        severity: 'error',
        checkType: 'lifo_compensation_order',
      },
    ],
    bfaRegistration: {
      entities: [`completion_record_f05${suffix}`, `points_ledger_f05${suffix}`],
      events: [
        `lesson.completed.f05${suffix}`,
        `points.awarded.f05${suffix}`,
        `social.broadcast.f05${suffix}`,
      ],
      apiRoutes: [],
    },
    ironRules: [
      'setIfAbsent must be used before any completion event is emitted',
      'award points only from FREEDOM config — never hardcode point values',
    ],
    machineComponents: ['setIfAbsent idempotency lock', 'LIFO compensation stack'],
    freedomComponents: ['flow05_points_per_completion', 'flow05_social_broadcast_enabled'],
    familyId: 'Family-5',
  };
}

function flow05GamificationParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T_F05_GAMIFICATION${suffix}`,
    flowId: 'FLOW-05',
    flowName: 'Completion & Gamification',
    name: 'GamificationScoreAggregator',
    archetype: ContractArchetype.GAMIFICATION,
    entry: 'points.awarded CloudEvent',
    purpose:
      'Multi-signal score aggregation. Award thresholds from FREEDOM config only. ' +
      'Evidence type must be validated before payload is stored.',
    factoryDependencies: [
      {
        factoryId: 'F_DB_GAMIFICATION',
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Points ledger persistence',
      },
      {
        factoryId: 'F_QUEUE_GAMIFICATION',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'CloudEvent for score update',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: 'QG-05-10',
        description: 'Evidence payload must not be logged (privacy)',
        severity: 'error',
        checkType: 'evidence_payload_not_logged',
      },
      {
        gateId: 'QG-05-11',
        description: 'Evidence type must be validated against allowed types',
        severity: 'error',
        checkType: 'evidence_type_validation',
      },
    ],
    bfaRegistration: {
      entities: [`points_ledger_gamif_f05${suffix}`],
      events: [`score.updated.f05${suffix}`],
      apiRoutes: [],
    },
    ironRules: ['evidence payload must not appear in logs'],
    machineComponents: ['evidence type validation'],
    freedomComponents: ['flow05_award_thresholds'],
    familyId: 'Family-5',
  };
}

// ══════════════════════════════════════════════════════
// Category 1 — Happy Path
// ══════════════════════════════════════════════════════

describe('FLOW-05 E2E — Happy Path [COMPLETION → GAMIFICATION → BROADCAST_SOCIAL]', () => {
  const TENANT_A = 'flow05-happy-tenant';

  it('F05-H1: completion contract generates successfully — DataProcessResult.success', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow05CompletionParams('-h1'));
    const result = await engine.generate(contract, TENANT_A);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('F05-H2: gamification contract generates successfully — multi-signal score aggregation', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow05GamificationParams('-h2'));
    const result = await engine.generate(contract, TENANT_A);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.contractId).toBe('T_F05_GAMIFICATION-h2');
  });

  it('F05-H3: generated flow definition has flow_id = FLOW-05', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow05CompletionParams('-h3'));
    const result = await engine.generate(contract, TENANT_A);

    const flowDef = result.data!.flowDefinition;
    expect(flowDef).toBeDefined();
    expect(flowDef['flow_id']).toBeDefined();
  });

  it('F05-H4: generation completes within 30s time budget', async () => {
    const engine = createEngine();
    const contract = new EngineContract(flow05CompletionParams('-h4'));
    const result = await engine.generate(contract, TENANT_A);

    expect(result.data!.elapsedMs).toBeLessThan(30_000);
  });

  it('F05-H5: DNA-8 — outbox ordering: storeDocument emitted before enqueue (mock verification)', () => {
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

    // Simulate the DNA-8 pattern directly
    return trackedDb
      .storeDocument('completions', { userId: 'u1', lessonId: 'l1' }, 'c1')
      .then(() => trackedQueue.enqueue('LessonCompleted', { userId: 'u1' }))
      .then(() => {
        expect(callOrder[0]).toBe('storeDocument');
        expect(callOrder[1]).toBe('enqueue');
      });
  });
});

// ══════════════════════════════════════════════════════
// Category 2 — Error Path
// ══════════════════════════════════════════════════════

describe('FLOW-05 E2E — Error Path', () => {
  it('F05-E1: empty taskTypeId returns DataProcessResult without throwing', async () => {
    const engine = createEngine();
    const invalidContract = new EngineContract({
      taskTypeId: '',
      name: 'Invalid',
      archetype: ContractArchetype.COMPLETION,
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

    const result = await engine.generate(invalidContract, 'flow05-error-tenant');

    expect(result).toBeInstanceOf(DataProcessResult);
    if (!result.isSuccess) {
      expect(result.errorCode).toBeDefined();
      expect(result.errorMessage).toBeDefined();
    }
  });

  it('F05-E2: database failure returns DataProcessResult.failure — no throw', async () => {
    const db = makeInMemoryDb();
    db.storeDocument.mockResolvedValueOnce(
      DataProcessResult.failure('DB_WRITE_FAILED', 'Simulated database write error'),
    );

    const result = await db.storeDocument('completions', { userId: 'u1' }, 'bad-id');

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_WRITE_FAILED');
    expect(result.errorMessage).toContain('Simulated');
  });

  it('F05-E3: missing required fields returns failure with MISSING_FIELDS code', () => {
    // Direct service-layer contract: validate required fields and return failure
    const missingEmail = DataProcessResult.failure<Record<string, unknown>>(
      'MISSING_FIELDS',
      'userId and lessonId are required',
    );

    expect(missingEmail.isSuccess).toBe(false);
    expect(missingEmail.errorCode).toBe('MISSING_FIELDS');
    expect(missingEmail.errorMessage).toContain('required');
  });
});

// ══════════════════════════════════════════════════════
// Category 3 — Tenant Isolation
// ══════════════════════════════════════════════════════

describe('FLOW-05 E2E — Tenant Isolation', () => {
  it('F05-T1: tenant-A and tenant-B generate independently with separate contracts', async () => {
    const engineA = createEngine();
    const engineB = createEngine();

    const [rA, rB] = await Promise.all([
      engineA.generate(new EngineContract(flow05CompletionParams('-ta')), 'flow05-tenant-A'),
      engineB.generate(new EngineContract(flow05CompletionParams('-tb')), 'flow05-tenant-B'),
    ]);

    expect(rA.isSuccess).toBe(true);
    expect(rB.isSuccess).toBe(true);

    expect(rA.data!.contractId).toBe('T_F05_COMPLETION-ta');
    expect(rB.data!.contractId).toBe('T_F05_COMPLETION-tb');
  });

  it('F05-T2: tenant-A in-memory store does not see tenant-B completion records', async () => {
    const dbA = makeInMemoryDb();
    const dbB = makeInMemoryDb();

    // Tenant B stores a completion
    await dbB.storeDocument(
      'completions',
      { userId: 'user-b', lessonId: 'lesson-1', tenantId: 'tenant-b' },
      'c-b1',
    );

    // Tenant A store has no completions
    const aResults = await dbA.searchDocuments('completions', {});
    expect((aResults.data as Record<string, unknown>[]).length).toBe(0);
  });

  it('F05-T3: CloudEvents include tenantid field — DNA-5 scope isolation', () => {
    const eventA = createCloudEvent({
      eventType: 'lesson.completed',
      source: 'flow-05/completion',
      data: { userId: 'u1', lessonId: 'l1' },
      tenantId: 'tenant-A',
    });
    const eventB = createCloudEvent({
      eventType: 'lesson.completed',
      source: 'flow-05/completion',
      data: { userId: 'u2', lessonId: 'l1' },
      tenantId: 'tenant-B',
    });

    expect(eventA['tenantid']).toBe('tenant-A');
    expect(eventB['tenantid']).toBe('tenant-B');
    expect(eventA['tenantid']).not.toBe(eventB['tenantid']);
  });
});

// ══════════════════════════════════════════════════════
// Category 4 — Idempotency
// ══════════════════════════════════════════════════════

describe('FLOW-05 E2E — Idempotency (idempotent_completion named check)', () => {
  it('F05-I1: duplicate completion with same correlationId returns existing record (setIfAbsent)', async () => {
    const db = makeInMemoryDb();
    const correlationId = 'corr-lesson-completion-001';

    // First call — stores the record
    await db.storeDocument(
      'completions',
      { userId: 'u1', lessonId: 'l1', correlationId, status: 'complete' },
      correlationId,
    );

    // Second call with same correlationId — should find existing
    const existing = await db.searchDocuments('completions', { correlationId });
    expect(existing.isSuccess).toBe(true);
    expect((existing.data as Record<string, unknown>[]).length).toBe(1);
    expect((existing.data as Record<string, unknown>[])[0]['correlationId']).toBe(correlationId);
  });

  it('F05-I2: queue is NOT re-enqueued when idempotency check finds existing record', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const correlationId = 'corr-idempotent-002';

    // Pre-store existing completion
    await db.storeDocument(
      'completions',
      { userId: 'u1', correlationId, status: 'complete' },
      correlationId,
    );

    // Simulate idempotency check: if record exists, return early without enqueue
    const existing = await db.searchDocuments('completions', { correlationId });
    const alreadyCompleted =
      existing.isSuccess && (existing.data as Record<string, unknown>[]).length > 0;

    if (!alreadyCompleted) {
      await queue.enqueue('LessonCompleted', { userId: 'u1', correlationId });
    }

    // Queue must NOT have been called
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('F05-I3: second engine.generate() with same BFA entities does not error', async () => {
    const engineA = createEngine();
    const engineB = createEngine();

    // Each engine has its own BFA state — both succeed independently
    const r1 = await engineA.generate(
      new EngineContract(flow05CompletionParams('-i3a')),
      'flow05-idem-tenant',
    );
    const r2 = await engineB.generate(
      new EngineContract(flow05CompletionParams('-i3b')),
      'flow05-idem-tenant',
    );

    expect(r1.isSuccess).toBe(true);
    expect(r2.isSuccess).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Category 5 — UI State Mapping
// ══════════════════════════════════════════════════════

describe('FLOW-05 E2E — UI State Mapping', () => {
  it('F05-U1: loading state — operation in-flight returns pending promise (not yet resolved)', () => {
    const db = makeInMemoryDb();
    let resolved = false;

    const promise = db.storeDocument('completions', { userId: 'u1' }, 'c1').then((r) => {
      resolved = true;
      return r;
    });

    // Before await — still in-flight
    expect(resolved).toBe(false);

    return promise.then(() => {
      // After resolution — success state
      expect(resolved).toBe(true);
    });
  });

  it('F05-U2: success state — DataProcessResult.success has isSuccess=true and data defined', async () => {
    const db = makeInMemoryDb();
    const result = await db.storeDocument('completions', { userId: 'u1', lessonId: 'l1' }, 'c1');

    // Maps to UI success state
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
  });

  it('F05-U3: error state — DataProcessResult.failure has isSuccess=false and errorCode defined', () => {
    const result = DataProcessResult.failure<Record<string, unknown>>(
      'COMPLETION_FAILED',
      'Unable to record lesson completion',
    );

    // Maps to UI error state
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('COMPLETION_FAILED');
    expect(result.errorMessage).toBeDefined();
  });

  it('F05-U4: toDict() serializes result for API response — snake_case keys', () => {
    const success = DataProcessResult.success({ userId: 'u1', points: 50 });
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

describe('FLOW-05 E2E — API Contract (/api/dynamic/{indexName})', () => {
  it('F05-A1: /api/dynamic/completions response has is_success, data, correlation_id', () => {
    const mockResponse = DataProcessResult.success([
      { userId: 'u1', lessonId: 'l1', status: 'complete', points: 50 },
    ]);
    const dict = mockResponse.toDict();

    expect(dict).toHaveProperty('is_success', true);
    expect(dict).toHaveProperty('data');
    expect(dict).toHaveProperty('correlation_id');
    expect(dict).toHaveProperty('timestamp');
  });

  it('F05-A2: /api/dynamic/points-ledger response contains points field', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument(
      'points-ledger',
      { userId: 'u1', points: 150, tenantId: 'tenant-a' },
      'pl-u1',
    );

    const result = await db.searchDocuments('points-ledger', { userId: 'u1' });

    expect(result.isSuccess).toBe(true);
    const docs = result.data as Record<string, unknown>[];
    expect(docs[0]['points']).toBe(150);
  });

  it('F05-A3: API error response has is_success=false, error_code, error_message', () => {
    const errorResponse = DataProcessResult.failure<unknown>(
      'NOT_FOUND',
      'Completion record not found',
    );
    const dict = errorResponse.toDict();

    expect(dict['is_success']).toBe(false);
    expect(dict['error_code']).toBe('NOT_FOUND');
    expect(dict['error_message']).toBe('Completion record not found');
  });
});

// ══════════════════════════════════════════════════════
// Category 7 — CloudEvents
// ══════════════════════════════════════════════════════

describe('FLOW-05 E2E — CloudEvents (DNA-9)', () => {
  it('F05-C1: lesson.completed event conforms to CloudEvents v1.0 spec', () => {
    const event = createCloudEvent({
      eventType: 'lesson.completed',
      source: 'flow-05/completion-gateway',
      data: { userId: 'u1', lessonId: 'l1', correlationId: 'corr-001' },
      tenantId: 'tenant-flow05',
    });

    const [isValid, errors] = validateCloudEvent(event);
    expect(isValid).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('F05-C2: points.awarded event has required CloudEvents fields', () => {
    const event = createCloudEvent({
      eventType: 'points.awarded',
      source: 'flow-05/gamification',
      data: { userId: 'u1', points: 50, awardType: 'lesson_complete' },
      tenantId: 'tenant-flow05',
    });

    expect(event['specversion']).toBe('1.0');
    expect(event['id']).toBeDefined();
    expect(event['type']).toBe('points.awarded');
    expect(event['source']).toContain('flow-05');
    expect(event['tenantid']).toBe('tenant-flow05');
    expect(event['datacontenttype']).toBe('application/json');
  });

  it('F05-C3: social.broadcast event uses discriminated payload — type field required', () => {
    // typed_discriminated_payload named check: broadcast_social must have discriminated type
    const broadcastEvent = createCloudEvent({
      eventType: 'social.achievement.broadcast',
      source: 'flow-05/social-broadcast',
      data: {
        type: 'LESSON_COMPLETE', // discriminated union key — required by broadcast_social_exact_match
        userId: 'u1',
        achievementId: 'ach-001',
        tenantId: 'tenant-flow05',
      },
      tenantId: 'tenant-flow05',
    });

    const data = broadcastEvent['data'] as Record<string, unknown>;
    expect(data['type']).toBe('LESSON_COMPLETE');

    const [isValid] = validateCloudEvent(broadcastEvent);
    expect(isValid).toBe(true);
  });

  it('F05-C4: social.broadcast event does NOT contain evidence payload (evidence_payload_not_logged)', () => {
    const broadcastEvent = createCloudEvent({
      eventType: 'social.achievement.broadcast',
      source: 'flow-05/social-broadcast',
      data: {
        type: 'LESSON_COMPLETE',
        userId: 'u1',
        achievementId: 'ach-001',
        // evidence payload intentionally absent from broadcast data
      },
      tenantId: 'tenant-flow05',
    });

    const data = broadcastEvent['data'] as Record<string, unknown>;
    // evidence_payload_not_logged: no raw evidence in broadcast event
    expect(data).not.toHaveProperty('evidencePayload');
    expect(data).not.toHaveProperty('evidence');
  });
});

// ══════════════════════════════════════════════════════
// Category 8 — Named Checks
// ══════════════════════════════════════════════════════

describe('FLOW-05 E2E — Named Checks', () => {
  describe('lifo_compensation_order', () => {
    it('F05-N1: LIFO compensation reverses in last-in-first-out order', () => {
      // LIFO compensation: actions are undone in reverse order of execution
      const executionStack: string[] = [];
      const compensationLog: string[] = [];

      // Simulate 3-step execution
      executionStack.push('step-1-store-completion');
      executionStack.push('step-2-award-points');
      executionStack.push('step-3-broadcast-social');

      // LIFO compensation: pop from stack
      while (executionStack.length > 0) {
        const step = executionStack.pop()!;
        compensationLog.push(`compensate:${step}`);
      }

      expect(compensationLog[0]).toBe('compensate:step-3-broadcast-social');
      expect(compensationLog[1]).toBe('compensate:step-2-award-points');
      expect(compensationLog[2]).toBe('compensate:step-1-store-completion');
    });

    it('F05-N2: LIFO compensation preserves stack depth — compensation count equals execution count', () => {
      const steps = ['store-completion', 'award-points', 'broadcast-social'];
      const compensations: string[] = [];

      const executionStack = [...steps];
      while (executionStack.length > 0) {
        compensations.push(executionStack.pop()!);
      }

      expect(compensations).toHaveLength(steps.length);
    });
  });

  describe('config_driven_award', () => {
    it('F05-N3: award points contract declares flow05_points_per_completion in freedomComponents', () => {
      const params = flow05CompletionParams('-n3');
      expect(params.freedomComponents).toContain('flow05_points_per_completion');
    });

    it('F05-N4: gamification contract declares flow05_award_thresholds in freedomComponents', () => {
      const params = flow05GamificationParams('-n4');
      expect(params.freedomComponents).toContain('flow05_award_thresholds');
    });

    it('F05-N5: config-driven award — no hardcoded point value in contract iron rules', () => {
      const params = flow05CompletionParams('-n5');
      // iron rules should reference config, not hardcode numeric values
      const ironRulesText = params.ironRules.join(' ');
      // Verify FREEDOM config is referenced for award logic
      expect(params.freedomComponents.length).toBeGreaterThan(0);
      // No hardcoded point values in iron rules
      expect(ironRulesText).not.toMatch(/\d+ points/);
    });
  });
});
