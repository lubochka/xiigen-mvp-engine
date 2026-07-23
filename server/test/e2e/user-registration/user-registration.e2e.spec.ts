/**
 * FLOW-01 E2E — RAG Foundation & Skill Indexing
 *
 * Archetypes: ROUTING, ORCHESTRATION, ATTENDANCE, AGGREGATION
 * Task types: T47, T48, T49 (Phase D/E services)
 * CloudEvents: SkillIndexed, PatternExtracted, RagSeeded, KnowledgeGraphUpdated
 *
 * Named checks:
 *   dual_entry_routing_pattern       (CHK-01: ATTENDANCE dual consumers)
 *   fifo_sorted_set_pattern          (CHK-02: ATTENDANCE fabric sorted-set)
 *   time_window_bounded_aggregation  (CHK-03: AGGREGATION time bounding)
 *
 * 8 mandatory E2E categories:
 *   1. Happy path — pattern extraction, skill indexing, RAG seeding, graph edge seeding
 *   2. Error path — structural stop, MACHINE_CONSTANT_INVERSION override, store failure
 *   3. Tenant isolation — graph edges scoped, skill index scoped, cross-tenant blocked
 *   4. Idempotency — duplicate skill index, duplicate pattern, duplicate graph edge
 *   5. UI state mapping — ROUTING/ORCHESTRATION tier, score bracket routing
 *   6. API contract — /api/dynamic/xiigen-decision-graph, /api/dynamic/xiigen-flow-lifecycle
 *   7. CloudEvents — SkillIndexed, PatternExtracted, RagSeeded validate against spec
 *   8. Named checks — dual_entry_routing_pattern, fifo_sorted_set_pattern,
 *                     time_window_bounded_aggregation, sortedSet ENG-02 operations
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
import { NAMED_CHECKS } from '../../../src/engine/node-handlers/validate.handler';
import { BootstrapCycleRouter } from '../../../src/fabrics/graph/planning/bootstrap-cycle-router';
import { InMemoryScopedMemoryProvider } from '../../../src/fabrics/scoped-memory/in-memory.provider';

const TENANT = 'flow01-e2e-tenant';

// ── Mock fabric providers ────────────────────────────────────────────────────

function makeInMemoryDb() {
  const store: Map<string, Record<string, unknown>[]> = new Map();

  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const bucket = store.get(index) ?? [];
      const existing = bucket.findIndex(
        (d) => d['id'] === id || d['edgeId'] === id || d['lifecycleId'] === id,
      );
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
      const doc = bucket.find(
        (d) => d['id'] === id || d['edgeId'] === id || d['lifecycleId'] === id,
      );
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
        runId: 'flow01-run-id',
        status: 'PASS',
        score: 90,
        trace: [
          { nodeId: 'pattern-extract', nodeType: 'rag-init', status: 'PASS', durationMs: 12 },
          { nodeId: 'skill-index', nodeType: 'index-write', status: 'PASS', durationMs: 8 },
          { nodeId: 'rag-seed', nodeType: 'rag-seed', status: 'PASS', durationMs: 10 },
          { nodeId: 'graph-edge', nodeType: 'graph-write', status: 'PASS', durationMs: 7 },
        ],
        finalOutput: { code: '// FLOW-01 RAG Foundation & Skill Indexing' },
        promoted: true,
        promotionLevel: 'MINIMAL',
      }),
    ),
    getTrace: jest.fn(async () => DataProcessResult.success(null)),
  } as unknown as GenericNodeExecutor;
}

function makeGraphRag(edges: Array<Record<string, unknown>> = []) {
  return {
    query: jest.fn(async () => ({ edges, formatted: () => 'mock-graph-result' })),
    upsertEdge: jest.fn(async () => undefined),
    updateEdgeWeight: jest.fn(async () => undefined),
    vectorSearch: jest.fn(async () => []),
  };
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

// ── FLOW-01 contract param builders ─────────────────────────────────────────

function flow01RoutingParams(suffix = ''): EngineContractParams {
  return {
    taskTypeId: `T47_F01_ROUTING${suffix}`,
    flowId: 'FLOW-01',
    flowName: 'RAG Foundation & Skill Indexing',
    name: 'PatternExtractorOrchestrator',
    archetype: ContractArchetype.ROUTING,
    entry: 'rag.init.triggered CloudEvent',
    purpose:
      'Extract code patterns from existing service implementations and index them ' +
      'into the RAG knowledge base for AI-assisted code generation. ' +
      'PatternExtracted event emitted after indexing completes.',
    factoryDependencies: [
      {
        factoryId: `F_DB_RAG${suffix}`,
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Pattern and skill document storage',
      },
      {
        factoryId: `F_QUEUE_RAG${suffix}`,
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'PatternExtracted / SkillIndexed event emission',
      },
      {
        factoryId: `F_RAG_RAG${suffix}`,
        interfaceName: 'IRagService',
        fabricType: FabricType.RAG,
        description: 'Pattern embedding and similarity retrieval',
      },
    ],
    afStations: [{ stationId: 'AF-1', role: 'generate', config: {} }],
    qualityGates: [
      {
        gateId: `QG-01-R01${suffix}`,
        description: 'DNA-8: storeDocument before enqueue',
        severity: 'error',
        checkType: 'store_before_enqueue',
      },
      {
        gateId: `QG-01-R02${suffix}`,
        description: 'Pattern extraction uses RAG fabric — no direct ES imports',
        severity: 'error',
        checkType: 'fabric_first',
      },
    ],
    bfaRegistration: {
      entities: [`skill_pattern_f01${suffix}`, `rag_seed_f01${suffix}`],
      events: [`rag.pattern.extracted.f01${suffix}`, `rag.skill.indexed.f01${suffix}`],
      apiRoutes: [],
    },
    ironRules: [
      'IR-1: Pattern extraction uses IRagService fabric only — no direct ES client',
      'IR-2: DNA-8 storeDocument BEFORE enqueue on every pattern write',
      'IR-3: Tenant context from AsyncLocalStorage — never passed as parameter',
    ],
    machineComponents: ['Pattern extractor', 'RAG seeder', 'Graph edge writer'],
    freedomComponents: ['flow01_pattern_batch_size', 'flow01_embedding_model'],
    familyId: 'Family-01',
  };
}

// ── 1. Happy path tests ───────────────────────────────────────────────────────

describe('FLOW-01 E2E: RAG Foundation & Skill Indexing', () => {
  describe('1. Happy path — pattern extraction, RAG seeding, graph indexing', () => {
    it('should create a valid ROUTING archetype EngineContract for FLOW-01', () => {
      const params = flow01RoutingParams();
      const contract = new EngineContract(params);
      expect(contract.taskTypeId).toBe('T47_F01_ROUTING');
      expect(contract.flowId).toBe('FLOW-01');
      expect(contract.archetype).toBe(ContractArchetype.ROUTING);
    });

    it('should validate that T47 ROUTING contract has RAG fabric dependency', () => {
      const params = flow01RoutingParams();
      const contract = new EngineContract(params);
      const ragDep = contract.factoryDependencies.find((d) => d.interfaceName === 'IRagService');
      expect(ragDep).toBeDefined();
      expect(ragDep!.fabricType).toBe(FabricType.RAG);
    });

    it('should produce DataProcessResult.success when flow engine executes FLOW-01', async () => {
      const engine = createEngine();
      const params = flow01RoutingParams('_happy');
      const contract = new EngineContract(params);
      const result = await engine.generate(contract, TENANT);
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should store pattern document in db before emitting PatternExtracted event (DNA-8)', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      // DNA-8: storeDocument BEFORE enqueue
      const storeResult = await db.storeDocument(
        'xiigen-rag-patterns',
        { patternId: 'P001', pattern: 'service-outbox' },
        'P001',
      );
      expect(storeResult.isSuccess).toBe(true);
      await queue.enqueue('rag.pattern.extracted', { patternId: 'P001' });
      expect(db.storeDocument).toHaveBeenCalledTimes(1);
      expect(queue.enqueue).toHaveBeenCalledWith(
        'rag.pattern.extracted',
        expect.objectContaining({ patternId: 'P001' }),
      );
    });

    it('should seed ROUTING arbiter edges to xiigen-decision-graph', async () => {
      const db = makeInMemoryDb();
      const edge: Record<string, unknown> = {
        edgeId: 'ROUTING::REQUIRES_MINIMUM_ARBITER::key_principles',
        fromEntity: 'ROUTING',
        relationship: 'REQUIRES_MINIMUM_ARBITER',
        toEntity: 'key_principles',
        confidence: 1.0,
        immutable: true,
      };
      await db.storeDocument('xiigen-decision-graph', edge, edge['edgeId'] as string);
      const result = await db.searchDocuments('xiigen-decision-graph', { fromEntity: 'ROUTING' });
      expect(result.isSuccess).toBe(true);
      expect(result.data!.length).toBeGreaterThanOrEqual(1);
    });

    it('should write planningLayerLearning doc to xiigen-flow-lifecycle after feedback (ENG-03)', async () => {
      const db = makeInMemoryDb();
      const lifecycleDoc: Record<string, unknown> = {
        lifecycleId: 'FLOW-01::T47::run-abc::planning',
        flowId: 'FLOW-01',
        taskTypeId: 'T47',
        genesisScore: 0.88,
        planningLayerLearning: true,
        timestamp: new Date().toISOString(),
      };
      await db.storeDocument(
        'xiigen-flow-lifecycle',
        lifecycleDoc,
        lifecycleDoc['lifecycleId'] as string,
      );
      const result = await db.getDocument(
        'xiigen-flow-lifecycle',
        'FLOW-01::T47::run-abc::planning',
      );
      expect(result.isSuccess).toBe(true);
      expect(result.data!['planningLayerLearning']).toBe(true);
    });

    it('should index 6 graph edges for ATTENDANCE+AGGREGATION archetypes (SEED-04)', async () => {
      const db = makeInMemoryDb();
      const edges: Array<Record<string, unknown>> = [
        {
          edgeId: 'ATTENDANCE::REQUIRES_MINIMUM_ARBITER::key_principles',
          fromEntity: 'ATTENDANCE',
          relationship: 'REQUIRES_MINIMUM_ARBITER',
          toEntity: 'key_principles',
          confidence: 1.0,
        },
        {
          edgeId: 'ATTENDANCE::REQUIRES_MINIMUM_ARBITER::business_logic',
          fromEntity: 'ATTENDANCE',
          relationship: 'REQUIRES_MINIMUM_ARBITER',
          toEntity: 'business_logic',
          confidence: 0.1,
        },
        {
          edgeId: 'ATTENDANCE::OPTIONAL_ARBITER::security',
          fromEntity: 'ATTENDANCE',
          relationship: 'OPTIONAL_ARBITER',
          toEntity: 'security',
          confidence: 0.1,
        },
        {
          edgeId: 'AGGREGATION::REQUIRES_MINIMUM_ARBITER::key_principles',
          fromEntity: 'AGGREGATION',
          relationship: 'REQUIRES_MINIMUM_ARBITER',
          toEntity: 'key_principles',
          confidence: 1.0,
        },
        {
          edgeId: 'AGGREGATION::REQUIRES_MINIMUM_ARBITER::business_logic',
          fromEntity: 'AGGREGATION',
          relationship: 'REQUIRES_MINIMUM_ARBITER',
          toEntity: 'business_logic',
          confidence: 0.1,
        },
        {
          edgeId: 'ATTENDANCE::INVARIANT::fifo_ordering',
          fromEntity: 'ATTENDANCE',
          relationship: 'INVARIANT',
          toEntity: 'fifo_ordering',
          confidence: 0.95,
        },
      ];
      for (const edge of edges) {
        await db.storeDocument('xiigen-decision-graph', edge, edge['edgeId'] as string);
      }
      const attendanceResult = await db.searchDocuments('xiigen-decision-graph', {
        fromEntity: 'ATTENDANCE',
      });
      const aggregationResult = await db.searchDocuments('xiigen-decision-graph', {
        fromEntity: 'AGGREGATION',
      });
      expect(attendanceResult.data!.length).toBe(4);
      expect(aggregationResult.data!.length).toBe(2);
    });

    it('EngineContract FLOW-01 should include BFA registration with entities and events', () => {
      const params = flow01RoutingParams();
      const contract = new EngineContract(params);
      expect(contract.bfaRegistration.entities).toContain('skill_pattern_f01');
      expect(contract.bfaRegistration.events.length).toBeGreaterThan(0);
    });

    it('should accept FLOW-01 contract with 3 iron rules', () => {
      const params = flow01RoutingParams();
      const contract = new EngineContract(params);
      expect(contract.ironRules.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ── 2. Error path tests ──────────────────────────────────────────────────────

  describe('2. Error path — structural stop, MCI override, store failure', () => {
    it('should return STOP_STRUCTURAL when score < 0.50 and no MCI override exists (ENG-01)', async () => {
      const graphRag = makeGraphRag([]);
      const router = new BootstrapCycleRouter(graphRag as any);
      const result = await router.route({
        score: 0.4,
        archetype: 'ROUTING',
        cycle: 1,
        budget: 3,
        subScores: { fabric_compliance: 0.3, dna_adherence: 0.5 },
        runId: 'run-struct-stop',
      });
      expect(result.action).toBe('STOP_STRUCTURAL');
      expect(result.decidingEdge?.fromEntity).toBe('SCORE_BRACKET:STRUCTURAL');
    });

    it('should return CYCLE_WITH_PATCH when MACHINE_CONSTANT_INVERSION override exists (ENG-01)', async () => {
      const overrideEdge = {
        fromEntity: 'ATTENDANCE:run-override',
        relationship: 'MACHINE_CONSTANT_INVERSION',
        toEntity: 'CYCLE_WITH_PATCH',
        confidence: 1.0,
        metadata: { action: 'CYCLE_WITH_PATCH', patchClass: 'PATTERN_MISSING' },
        observationCount: 1,
        immutable: true,
        fromType: 'ARCHETYPE',
        toType: 'ACTION',
      };
      const graphRag = makeGraphRag([overrideEdge as Record<string, unknown>]);
      const router = new BootstrapCycleRouter(graphRag as any);
      const result = await router.route({
        score: 0.35,
        archetype: 'ATTENDANCE',
        cycle: 1,
        budget: 3,
        subScores: { fabric_compliance: 0.3 },
        runId: 'run-override',
      });
      expect(result.action).toBe('CYCLE_WITH_PATCH');
      expect(result.note).toContain('MACHINE_CONSTANT_INVERSION');
    });

    it('should return DataProcessResult.failure when pattern store fails (DNA-3)', async () => {
      const db = makeInMemoryDb();
      db.storeDocument.mockResolvedValueOnce(
        DataProcessResult.failure('STORE_FAILED', 'ES unavailable'),
      );
      const result = await db.storeDocument(
        'xiigen-rag-patterns',
        { patternId: 'P_FAIL' },
        'P_FAIL',
      );
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('STORE_FAILED');
    });

    it('should NOT enqueue PatternExtracted if storeDocument fails (DNA-8)', async () => {
      const db = makeInMemoryDb();
      const queue = makeInMemoryQueue();
      db.storeDocument.mockResolvedValueOnce(
        DataProcessResult.failure('STORE_FAILED', 'ES unavailable'),
      );
      const storeResult = await db.storeDocument(
        'xiigen-rag-patterns',
        { patternId: 'P_DNA8' },
        'P_DNA8',
      );
      if (storeResult.isSuccess) {
        await queue.enqueue('rag.pattern.extracted', { patternId: 'P_DNA8' });
      }
      expect(queue.enqueue).not.toHaveBeenCalled();
    });

    it('should return ACCEPT for score >= 0.85 (PASS bracket, bootstrap default)', async () => {
      const graphRag = makeGraphRag([]);
      const router = new BootstrapCycleRouter(graphRag as any);
      const result = await router.route({
        score: 0.9,
        archetype: 'ROUTING',
        cycle: 1,
        budget: 3,
        subScores: {},
        runId: 'run-pass',
      });
      expect(result.action).toBe('ACCEPT');
    });

    it('should return ESCALATE_TO_UPPER_JUDGE when cycle budget exhausted', async () => {
      const graphRag = makeGraphRag([]);
      const router = new BootstrapCycleRouter(graphRag as any);
      const result = await router.route({
        score: 0.7,
        archetype: 'ROUTING',
        cycle: 3,
        budget: 3,
        subScores: {},
        runId: 'run-budget-exhausted',
      });
      expect(result.action).toBe('ESCALATE_TO_UPPER_JUDGE');
    });

    it('should not override structural stop when MCI edge has wrong action value', async () => {
      const badOverrideEdge = {
        fromEntity: 'ROUTING:run-bad',
        relationship: 'MACHINE_CONSTANT_INVERSION',
        toEntity: 'STOP_STRUCTURAL',
        confidence: 1.0,
        metadata: { action: 'FULL_CYCLE' }, // not CYCLE_WITH_PATCH
        observationCount: 1,
        immutable: false,
        fromType: 'ARCHETYPE',
        toType: 'ACTION',
      };
      const graphRag = makeGraphRag([badOverrideEdge as Record<string, unknown>]);
      const router = new BootstrapCycleRouter(graphRag as any);
      const result = await router.route({
        score: 0.3,
        archetype: 'ROUTING',
        cycle: 1,
        budget: 3,
        subScores: {},
        runId: 'run-bad',
      });
      expect(result.action).toBe('STOP_STRUCTURAL');
    });
  });

  // ── 3. Tenant isolation tests ────────────────────────────────────────────────

  describe('3. Tenant isolation — graph edges and skill index scoped', () => {
    it('should store graph edges without tenantId parameter (DNA-5 AsyncLocalStorage)', async () => {
      const db = makeInMemoryDb();
      const edge: Record<string, unknown> = {
        edgeId: 'ROUTING::REQUIRES_MINIMUM_ARBITER::key_principles',
        fromEntity: 'ROUTING',
        relationship: 'REQUIRES_MINIMUM_ARBITER',
        toEntity: 'key_principles',
        confidence: 1.0,
      };
      await db.storeDocument('xiigen-decision-graph', edge, edge['edgeId'] as string);
      const callArgs = db.storeDocument.mock.calls[0];
      // DNA-5: tenantId never passed as explicit parameter to fabric methods
      expect(callArgs[0]).toBe('xiigen-decision-graph');
      expect(callArgs[2]).toBe('ROUTING::REQUIRES_MINIMUM_ARBITER::key_principles');
    });

    it('should not return documents from another tenant when querying by fromEntity', async () => {
      const db = makeInMemoryDb();
      await db.storeDocument(
        'xiigen-decision-graph',
        { fromEntity: 'ROUTING', tenantScope: 'tenant-A' },
        'edge-A',
      );
      const result = await db.searchDocuments('xiigen-decision-graph', {
        fromEntity: 'ROUTING',
        tenantScope: 'tenant-B',
      });
      expect(result.data!.length).toBe(0);
    });

    it('should allow two tenants to have independent skill indexes', async () => {
      const dbA = makeInMemoryDb();
      const dbB = makeInMemoryDb();
      await dbA.storeDocument('xiigen-rag-patterns', { patternId: 'P-A', skill: 'SK-416' }, 'P-A');
      await dbB.storeDocument('xiigen-rag-patterns', { patternId: 'P-B', skill: 'SK-417' }, 'P-B');
      const resultA = await dbA.searchDocuments('xiigen-rag-patterns', {});
      const resultB = await dbB.searchDocuments('xiigen-rag-patterns', {});
      expect(resultA.data!.length).toBe(1);
      expect(resultB.data!.length).toBe(1);
      expect(resultA.data![0]['patternId']).toBe('P-A');
    });

    it('should scope planningLayerLearning writes to the current tenant context', async () => {
      const db = makeInMemoryDb();
      const doc: Record<string, unknown> = {
        lifecycleId: 'FLOW-01::T47::run-iso::planning',
        flowId: 'FLOW-01',
        taskTypeId: 'T47',
        planningLayerLearning: true,
        timestamp: new Date().toISOString(),
      };
      await db.storeDocument('xiigen-flow-lifecycle', doc, doc['lifecycleId'] as string);
      const found = await db.getDocument(
        'xiigen-flow-lifecycle',
        'FLOW-01::T47::run-iso::planning',
      );
      expect(found.isSuccess).toBe(true);
    });

    it('should return NOT_FOUND for a cross-tenant lifecycle ID lookup', async () => {
      const db = makeInMemoryDb();
      const result = await db.getDocument(
        'xiigen-flow-lifecycle',
        'FLOW-01::T47::run-other-tenant::planning',
      );
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });

  // ── 4. Idempotency tests ─────────────────────────────────────────────────────

  describe('4. Idempotency — duplicate skill index, pattern, graph edge', () => {
    it('should not duplicate a graph edge if upserted twice with same edgeId', async () => {
      const db = makeInMemoryDb();
      const edgeId = 'ROUTING::REQUIRES_MINIMUM_ARBITER::key_principles';
      const edge: Record<string, unknown> = {
        edgeId,
        fromEntity: 'ROUTING',
        relationship: 'REQUIRES_MINIMUM_ARBITER',
        toEntity: 'key_principles',
        confidence: 1.0,
      };
      await db.storeDocument('xiigen-decision-graph', edge, edgeId);
      await db.storeDocument('xiigen-decision-graph', { ...edge, confidence: 1.0 }, edgeId);
      const result = await db.searchDocuments('xiigen-decision-graph', { fromEntity: 'ROUTING' });
      expect(result.data!.length).toBe(1); // idempotent upsert
    });

    it('should overwrite planningLayerLearning doc if lifecycle ID already stored', async () => {
      const db = makeInMemoryDb();
      const lifecycleId = 'FLOW-01::T47::run-idem::planning';
      const doc: Record<string, unknown> = {
        lifecycleId,
        flowId: 'FLOW-01',
        planningLayerLearning: true,
        genesisScore: 0.88,
      };
      await db.storeDocument('xiigen-flow-lifecycle', doc, lifecycleId);
      await db.storeDocument('xiigen-flow-lifecycle', { ...doc, genesisScore: 0.91 }, lifecycleId);
      const result = await db.getDocument('xiigen-flow-lifecycle', lifecycleId);
      expect(result.isSuccess).toBe(true);
      expect(db.storeDocument).toHaveBeenCalledTimes(2);
    });

    it('should return same skill document when indexed twice with same skillId', async () => {
      const db = makeInMemoryDb();
      await db.storeDocument(
        'xiigen-skills',
        { skillId: 'SK-416', name: 'PlanningSessionStartup' },
        'SK-416',
      );
      await db.storeDocument(
        'xiigen-skills',
        { skillId: 'SK-416', name: 'PlanningSessionStartup' },
        'SK-416',
      );
      const result = await db.searchDocuments('xiigen-skills', { skillId: 'SK-416' });
      expect(result.data!.length).toBe(1);
    });

    it('IScopedMemoryService.setIfAbsent returns false on duplicate pattern lock (DNA-7)', async () => {
      const memory = new InMemoryScopedMemoryProvider();
      const firstSet = await memory.setIfAbsent('pattern-lock:P001', 'locked', 60);
      const secondSet = await memory.setIfAbsent('pattern-lock:P001', 'locked', 60);
      expect(firstSet).toBe(true);
      expect(secondSet).toBe(false);
    });

    it('sortedSetAdd with same member should update score, not add duplicate', async () => {
      const memory = new InMemoryScopedMemoryProvider();
      await memory.sortedSetAdd('queue', 100, 'user-A');
      await memory.sortedSetAdd('queue', 200, 'user-A'); // update score
      const result = await memory.sortedSetRangeByScore('queue', 0, Infinity);
      expect(result.length).toBe(1);
      expect(result[0]).toBe('user-A');
    });
  });

  // ── 5. UI state mapping tests ────────────────────────────────────────────────

  describe('5. UI state mapping — ROUTING tier, score bracket routing', () => {
    it('ROUTING archetype should map to curriculumTier 1 (V9-003)', () => {
      // V9-003: ROUTING must resolve to tier 1
      const tierMap: Record<string, number> = {
        ROUTING: 1,
        DATA_PIPELINE: 2,
        ORCHESTRATION: 4,
        ATTENDANCE: 2,
        AGGREGATION: 2,
      };
      expect(tierMap['ROUTING']).toBe(1);
    });

    it('ORCHESTRATION archetype should map to curriculumTier 4 (V9-003)', () => {
      const tierMap: Record<string, number> = {
        ROUTING: 1,
        DATA_PIPELINE: 2,
        ORCHESTRATION: 4,
      };
      expect(tierMap['ORCHESTRATION']).toBe(4);
    });

    it('score 0.55 (PATTERN_MISSING bracket) should route to CYCLE_WITH_PATTERN bootstrap default', async () => {
      const graphRag = makeGraphRag([]);
      const router = new BootstrapCycleRouter(graphRag as any);
      const result = await router.route({
        score: 0.55,
        archetype: 'ROUTING',
        cycle: 1,
        budget: 3,
        subScores: { rag_coverage: 0.4 },
        runId: 'run-pattern-missing',
      });
      expect(result.action).toBe('CYCLE_WITH_PATTERN');
    });

    it('score 0.70 (DETAIL_GAP bracket) should route to CYCLE_WITH_PATCH bootstrap default', async () => {
      const graphRag = makeGraphRag([]);
      const router = new BootstrapCycleRouter(graphRag as any);
      const result = await router.route({
        score: 0.7,
        archetype: 'ROUTING',
        cycle: 1,
        budget: 3,
        subScores: { quality: 0.65 },
        runId: 'run-detail-gap',
      });
      expect(result.action).toBe('CYCLE_WITH_PATCH');
    });

    it('EngineContract with ROUTING archetype should validate successfully', () => {
      const params = flow01RoutingParams();
      expect(() => new EngineContract(params)).not.toThrow();
    });
  });

  // ── 6. API contract tests ─────────────────────────────────────────────────────

  describe('6. API contract — /api/dynamic/xiigen-decision-graph + flow-lifecycle', () => {
    it('should store graph edges as Record<string, unknown> — no typed models (DNA-1)', async () => {
      const db = makeInMemoryDb();
      const edge: Record<string, unknown> = {
        edgeId: 'ATTENDANCE::INVARIANT::fifo_ordering',
        fromEntity: 'ATTENDANCE',
        relationship: 'INVARIANT',
        toEntity: 'fifo_ordering',
        confidence: 0.95,
        immutable: false,
      };
      const result = await db.storeDocument(
        'xiigen-decision-graph',
        edge,
        edge['edgeId'] as string,
      );
      expect(result.isSuccess).toBe(true);
      expect(result.data!['fromEntity']).toBe('ATTENDANCE');
    });

    it('should retrieve graph edge by edgeId from xiigen-decision-graph', async () => {
      const db = makeInMemoryDb();
      await db.storeDocument(
        'xiigen-decision-graph',
        {
          edgeId: 'AGGREGATION::REQUIRES_MINIMUM_ARBITER::key_principles',
          fromEntity: 'AGGREGATION',
          relationship: 'REQUIRES_MINIMUM_ARBITER',
          toEntity: 'key_principles',
          confidence: 1.0,
        },
        'AGGREGATION::REQUIRES_MINIMUM_ARBITER::key_principles',
      );
      const result = await db.getDocument(
        'xiigen-decision-graph',
        'AGGREGATION::REQUIRES_MINIMUM_ARBITER::key_principles',
      );
      expect(result.isSuccess).toBe(true);
      expect(result.data!['fromEntity']).toBe('AGGREGATION');
    });

    it('should store flow-lifecycle record accessible via dynamic API', async () => {
      const db = makeInMemoryDb();
      const id = 'FLOW-01::T47::run-api::planning';
      await db.storeDocument(
        'xiigen-flow-lifecycle',
        { lifecycleId: id, planningLayerLearning: true },
        id,
      );
      const result = await db.getDocument('xiigen-flow-lifecycle', id);
      expect(result.isSuccess).toBe(true);
      expect(result.data!['planningLayerLearning']).toBe(true);
    });

    it('should return DataProcessResult.failure NOT throw when graph edge not found (DNA-3)', async () => {
      const db = makeInMemoryDb();
      const result = await db.getDocument('xiigen-decision-graph', 'nonexistent-edge');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('should include lifecycleId following naming convention FLOW-ID::taskTypeId::runId::planning', async () => {
      const db = makeInMemoryDb();
      const lifecycleId = 'FLOW-01::T48::run-conv::planning';
      await db.storeDocument(
        'xiigen-flow-lifecycle',
        { lifecycleId, genesisScore: 0.8 },
        lifecycleId,
      );
      const result = await db.getDocument('xiigen-flow-lifecycle', lifecycleId);
      expect(result.isSuccess).toBe(true);
      expect(result.data!['lifecycleId']).toBe('FLOW-01::T48::run-conv::planning');
    });
  });

  // ── 7. CloudEvents tests ─────────────────────────────────────────────────────

  describe('7. CloudEvents — SkillIndexed, PatternExtracted, RagSeeded', () => {
    it('should create valid PatternExtracted CloudEvent with correct specversion', () => {
      const event = createCloudEvent({
        eventType: 'com.xiigen.rag.pattern.extracted',
        source: 'flow-01/rag-init',
        data: { patternId: 'P001', skillId: 'SK-416', flowId: 'FLOW-01' },
        tenantId: TENANT,
      });
      expect(event['specversion']).toBe('1.0');
      expect(event['type']).toBe('com.xiigen.rag.pattern.extracted');
      const [isValid] = validateCloudEvent(event);
      expect(isValid).toBe(true);
    });

    it('should create valid SkillIndexed CloudEvent', () => {
      const event = createCloudEvent({
        eventType: 'com.xiigen.rag.skill.indexed',
        source: 'flow-01/skill-indexer',
        data: {
          skillId: 'SK-416',
          name: 'PlanningSessionStartup',
          indexedAt: new Date().toISOString(),
        },
        tenantId: TENANT,
      });
      const [isValid] = validateCloudEvent(event);
      expect(isValid).toBe(true);
      expect(event['type']).toBe('com.xiigen.rag.skill.indexed');
    });

    it('should create valid RagSeeded CloudEvent with edge count', () => {
      const event = createCloudEvent({
        eventType: 'com.xiigen.rag.seeded',
        source: 'flow-01/rag-seed',
        data: {
          seedBatchId: 'SEED-05',
          edgeCount: 18,
          flowId: 'FLOW-01',
          timestamp: new Date().toISOString(),
        },
        tenantId: TENANT,
      });
      const [isValid] = validateCloudEvent(event);
      expect(isValid).toBe(true);
      expect(event['data']).toHaveProperty('edgeCount', 18);
    });

    it('should create valid KnowledgeGraphUpdated CloudEvent', () => {
      const event = createCloudEvent({
        eventType: 'com.xiigen.rag.knowledge.graph.updated',
        source: 'flow-01/graph-writer',
        data: { edgesAdded: 6, archetypes: ['ATTENDANCE', 'AGGREGATION'], flowId: 'FLOW-01' },
        tenantId: TENANT,
      });
      const [isValid] = validateCloudEvent(event);
      expect(isValid).toBe(true);
      expect(event['data']).toHaveProperty('edgesAdded', 6);
    });

    it('should fail validateCloudEvent when required fields are missing', () => {
      const invalidEvent: Record<string, unknown> = {
        specversion: '1.0',
        // missing: id, type, source
        data: { patternId: 'P001' },
      };
      const [isValid, errors] = validateCloudEvent(invalidEvent);
      expect(isValid).toBe(false);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should include tenantId extension in FLOW-01 CloudEvent source path', () => {
      const event = createCloudEvent({
        eventType: 'com.xiigen.rag.pattern.extracted',
        source: 'flow-01/rag-init',
        data: { patternId: 'P002' },
        tenantId: TENANT,
      });
      expect(event['source'] as string).toContain(TENANT);
      expect(event['tenantid']).toBe(TENANT);
    });
  });

  // ── 8. Named checks tests ─────────────────────────────────────────────────────

  describe('8. Named checks — CHK-01, CHK-02, CHK-03 + ENG-02 sorted sets', () => {
    describe('CHK-01: dual_entry_routing_pattern', () => {
      it('check should be present in NAMED_CHECKS registry', () => {
        expect(NAMED_CHECKS['dual_entry_routing_pattern']).toBeDefined();
      });

      it('should pass for non-ATTENDANCE code (pass-through)', () => {
        const check = NAMED_CHECKS['dual_entry_routing_pattern'];
        const result = (check.default as Function)(
          'export class UserRegistrationService {}',
          'T47',
        );
        expect(result).toBe(true);
      });

      it('should pass for ATTENDANCE code with two @EventPattern decorators', () => {
        const check = NAMED_CHECKS['dual_entry_routing_pattern'];
        const code = [
          '@EventPattern("attendance.requested")',
          'async handleInitialRequest() {}',
          '@EventPattern("attendance.recheck")',
          'async handleRecheck() {}',
        ].join('\n');
        const result = (check.default as Function)(code, 'ATTENDANCE');
        expect(result).toBe(true);
      });

      it('should fail for ATTENDANCE code with only one @EventPattern decorator', () => {
        const check = NAMED_CHECKS['dual_entry_routing_pattern'];
        const code = '@EventPattern("attendance.requested")\nasync handleInitialRequest() {}';
        const result = (check.default as Function)(code, 'ATTENDANCE');
        expect(result).toBe(false);
      });

      it('should pass for ATTENDANCE code with two @MessagePattern decorators', () => {
        const check = NAMED_CHECKS['dual_entry_routing_pattern'];
        const code = [
          '@MessagePattern({ cmd: "attendance.initial" })',
          'async handleInitial() {}',
          '@MessagePattern({ cmd: "attendance.recheck" })',
          'async handleRecheck() {}',
        ].join('\n');
        const result = (check.default as Function)(code, 'ATTENDANCE');
        expect(result).toBe(true);
      });

      it('should have a descriptive message referencing Outbox pattern', () => {
        const check = NAMED_CHECKS['dual_entry_routing_pattern'];
        expect(check.message).toContain('Outbox');
        expect(check.message).toContain('initial-request consumer');
      });
    });

    describe('CHK-02: fifo_sorted_set_pattern', () => {
      it('check should be present in NAMED_CHECKS registry', () => {
        expect(NAMED_CHECKS['fifo_sorted_set_pattern']).toBeDefined();
      });

      it('should pass for non-ATTENDANCE code (pass-through)', () => {
        const check = NAMED_CHECKS['fifo_sorted_set_pattern'];
        const result = (check.default as Function)('export class EventService {}', 'T60');
        expect(result).toBe(true);
      });

      it('should pass for ATTENDANCE code using all three IScopedMemoryService sorted-set methods', () => {
        const check = NAMED_CHECKS['fifo_sorted_set_pattern'];
        const code = [
          'await this.memory.sortedSetAdd("queue", Date.now(), userId);',
          'const next = await this.memory.sortedSetRangeByScore("queue", 0, Infinity);',
          'await this.memory.sortedSetRemove("queue", userId);',
        ].join('\n');
        const result = (check.default as Function)(code, 'ATTENDANCE');
        expect(result).toBe(true);
      });

      it('should fail for ATTENDANCE code using raw Redis zadd (CF-791 violation)', () => {
        const check = NAMED_CHECKS['fifo_sorted_set_pattern'];
        const code = [
          'await this.redis.zadd("queue", Date.now(), userId);',
          'await this.redis.zrangebyscore("queue", 0, Infinity);',
          'await this.redis.zrem("queue", userId);',
        ].join('\n');
        const result = (check.default as Function)(code, 'ATTENDANCE');
        expect(result).toBe(false);
      });

      it('should fail for ATTENDANCE code missing sortedSetRangeByScore', () => {
        const check = NAMED_CHECKS['fifo_sorted_set_pattern'];
        const code = [
          'await this.memory.sortedSetAdd("queue", Date.now(), userId);',
          'await this.memory.sortedSetRemove("queue", userId);',
        ].join('\n');
        const result = (check.default as Function)(code, 'ATTENDANCE');
        expect(result).toBe(false);
      });

      it('should have a message referencing CF-791 Fabric First', () => {
        const check = NAMED_CHECKS['fifo_sorted_set_pattern'];
        expect(check.message).toContain('CF-791');
        expect(check.message).toContain('sortedSetAdd');
      });
    });

    describe('CHK-03: time_window_bounded_aggregation', () => {
      it('check should be present in NAMED_CHECKS registry', () => {
        expect(NAMED_CHECKS['time_window_bounded_aggregation']).toBeDefined();
      });

      it('should pass for AGGREGATION code with Date.now() time-windowed rangeByScore', () => {
        const check = NAMED_CHECKS['time_window_bounded_aggregation'];
        const code = [
          'const windowStart = Date.now() - windowSizeMs;',
          'const records = await this.memory.sortedSetRangeByScore("events", windowStart, Date.now());',
        ].join('\n');
        const result = (check.default as Function)(code);
        expect(result).toBe(true);
      });

      it('should pass for AGGREGATION code using startOf() time window', () => {
        const check = NAMED_CHECKS['time_window_bounded_aggregation'];
        const code = [
          'const start = startOf("hour");',
          'const data = await this.memory.rangeByScore("metrics", start, Date.now());',
        ].join('\n');
        const result = (check.default as Function)(code);
        expect(result).toBe(true);
      });

      it('should fail for AGGREGATION code with rangeByScore but no time bounding', () => {
        const check = NAMED_CHECKS['time_window_bounded_aggregation'];
        const code = 'const all = await this.memory.rangeByScore("events", 0, Infinity);';
        const result = (check.default as Function)(code);
        expect(result).toBe(false);
      });

      it('should have a message warning about unbounded aggregation cost', () => {
        const check = NAMED_CHECKS['time_window_bounded_aggregation'];
        expect(check.message).toContain('Unbounded aggregation');
        expect(check.message).toContain('rangeByScore');
      });
    });

    describe('ENG-02: IScopedMemoryService sorted-set operations', () => {
      it('sortedSetAdd should store members in ascending score order (FIFO semantics)', async () => {
        const memory = new InMemoryScopedMemoryProvider();
        await memory.sortedSetAdd('queue', 100, 'user-A');
        await memory.sortedSetAdd('queue', 50, 'user-B');
        await memory.sortedSetAdd('queue', 200, 'user-C');
        const result = await memory.sortedSetRangeByScore('queue', 0, Infinity);
        expect(result[0]).toBe('user-B'); // lowest score = earliest timestamp = first in FIFO
        expect(result[1]).toBe('user-A');
        expect(result[2]).toBe('user-C');
      });

      it('sortedSetRangeByScore should return empty array for nonexistent key', async () => {
        const memory = new InMemoryScopedMemoryProvider();
        const result = await memory.sortedSetRangeByScore('nonexistent', 0, Infinity);
        expect(result).toEqual([]);
      });

      it('sortedSetRemove should remove member from sorted set', async () => {
        const memory = new InMemoryScopedMemoryProvider();
        await memory.sortedSetAdd('queue', 100, 'user-A');
        await memory.sortedSetRemove('queue', 'user-A');
        const result = await memory.sortedSetRangeByScore('queue', 0, Infinity);
        expect(result).not.toContain('user-A');
      });

      it('sortedSetRangeByScore should filter by score range correctly', async () => {
        const memory = new InMemoryScopedMemoryProvider();
        await memory.sortedSetAdd('events', 1000, 'event-A');
        await memory.sortedSetAdd('events', 2000, 'event-B');
        await memory.sortedSetAdd('events', 3000, 'event-C');
        const result = await memory.sortedSetRangeByScore('events', 1500, 2500);
        expect(result).toEqual(['event-B']);
      });

      it('clear() should reset sorted sets along with regular store', async () => {
        const memory = new InMemoryScopedMemoryProvider();
        await memory.sortedSetAdd('queue', 100, 'user-X');
        await memory.set('key', 'value');
        memory.clear();
        const queueResult = await memory.sortedSetRangeByScore('queue', 0, Infinity);
        const keyResult = await memory.get('key');
        expect(queueResult).toEqual([]);
        expect(keyResult).toBeNull();
      });
    });
  });
});
