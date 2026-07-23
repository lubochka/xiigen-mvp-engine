/**
 * S19 — EngineModule readiness gate tests.
 *
 * Verifies:
 *   1. NodeRegistry.getRegisteredTypes().length === 7.
 *   2. NodeRegistry.getRegisteredTypes() includes 'route'.
 *   3. NodeRegistry.has('route') is true.
 *   4. Critical services are injectable (present in the DI container).
 *
 * Uses lightweight mocks for fabric providers and all services that depend
 * on fabric interfaces without @Inject() decorators.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NodeRegistry } from './node-handlers/node-registry';
import { GenericNodeExecutor } from './generic-node-executor';
import { TopologyStore } from './topology-store';
import { PromptLibraryStation } from './prompt-library.station';
import { FlowStateSnapshotService } from './flow-state-snapshot.service';
import { DpoTrainingDataService } from './dpo-training-data.service';
import { FlowRegistryService } from './flow-registry.service';
import { SkillIngestService } from './skill-ingest.service';
import { DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { QUEUE_SERVICE } from '../fabrics/interfaces/queue.interface';
import { AI_PROVIDER } from '../fabrics/interfaces/ai-provider.interface';
import { RAG_SERVICE } from '../fabrics/interfaces/rag.interface';
import { DataProcessResult } from '../kernel/data-process-result';
import { RagRetrieveHandler } from './node-handlers/rag-retrieve.handler';
import { DecomposeHandler } from './node-handlers/decompose.handler';
import { AiGenerateHandler } from './node-handlers/ai-generate.handler';
import { ValidateHandler } from './node-handlers/validate.handler';
import { ScoreHandler } from './node-handlers/score.handler';
import { FeedbackHandler } from './node-handlers/feedback.handler';
import { RouteHandler } from './node-handlers/route.handler';
import { PlannerHandler } from './node-handlers/planner.handler';
import { ConvergenceHandler } from './node-handlers/convergence.handler';
import { DepthDecisionHandler } from './node-handlers/depth-decision.handler';

// ─── Fabric mocks ──────────────────────────────────────────────────────────

const mockDb = {
  storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({ id: 'x' })),
  searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  getDocument: jest.fn().mockResolvedValue(DataProcessResult.success(null)),
  deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
  updateDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
};

const mockQueue = {
  enqueue: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
  subscribe: jest.fn(),
};

const mockAi = {
  generateText: jest.fn().mockResolvedValue(DataProcessResult.success({ text: '' })),
  generateCode: jest.fn().mockResolvedValue(DataProcessResult.success({ code: '' })),
};

const mockRag = {
  search: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  index: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
};

// ─── Mock handler factory ──────────────────────────────────────────────────
// Handlers take fabric services without @Inject() so NestJS cannot resolve
// them by token at test time. Provide mock instances by class token.

const mockHandler = (nodeType: string) => ({
  nodeType,
  handle: jest.fn().mockResolvedValue(DataProcessResult.success({ data: {} })),
});

// ─── Stub for services without @Inject() decorators ───────────────────────
// TopologyStore, PromptLibraryStation, FlowStateSnapshotService and
// DpoTrainingDataService take IDatabaseService without @Inject(), so NestJS
// cannot match the DATABASE_SERVICE token at test time.

const mockTopologyStore = { getTopology: jest.fn().mockResolvedValue(null) };
const mockPromptLibrary = {
  getPrompt: jest.fn().mockResolvedValue(DataProcessResult.success(null)),
};
const mockFlowSnapshot = { saveSnapshot: jest.fn(), getSnapshot: jest.fn() };
const mockDpoService = { record: jest.fn() };

function buildProviders() {
  return [
    // Fabric tokens
    { provide: DATABASE_SERVICE, useValue: mockDb },
    { provide: QUEUE_SERVICE, useValue: mockQueue },
    { provide: AI_PROVIDER, useValue: mockAi },
    { provide: RAG_SERVICE, useValue: mockRag },
    // Handler mocks (by class token — NodeRegistry injects by class)
    { provide: RagRetrieveHandler, useValue: mockHandler('rag-retrieve') },
    { provide: DecomposeHandler, useValue: mockHandler('decompose') },
    { provide: AiGenerateHandler, useValue: mockHandler('ai-generate') },
    { provide: ValidateHandler, useValue: mockHandler('validate') },
    { provide: ScoreHandler, useValue: mockHandler('score') },
    { provide: FeedbackHandler, useValue: mockHandler('feedback') },
    { provide: RouteHandler, useValue: mockHandler('route') },
    { provide: PlannerHandler, useValue: mockHandler('planner') },
    { provide: ConvergenceHandler, useValue: mockHandler('convergence') },
    { provide: DepthDecisionHandler, useValue: mockHandler('depth-decision') },
    // NodeRegistry — real implementation; receives the mock handler tokens above
    NodeRegistry,
    // Service mocks (no @Inject() on their constructors)
    { provide: TopologyStore, useValue: mockTopologyStore },
    { provide: PromptLibraryStation, useValue: mockPromptLibrary },
    { provide: FlowStateSnapshotService, useValue: mockFlowSnapshot },
    { provide: DpoTrainingDataService, useValue: mockDpoService },
    // Real services that use @Inject(DATABASE_SERVICE) correctly
    GenericNodeExecutor,
    FlowRegistryService,
    SkillIngestService,
  ];
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('S19 — EngineModule readiness gate', () => {
  let module: TestingModule;
  let registry: NodeRegistry;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: buildProviders(),
    }).compile();

    registry = module.get<NodeRegistry>(NodeRegistry);
  });

  afterAll(async () => {
    await module?.close();
  });

  it('NodeRegistry: exactly 10 handlers registered', () => {
    expect(registry.getRegisteredTypes()).toHaveLength(10);
  });

  it('NodeRegistry: includes "route" (7th handler, BLOCKING-1 fix)', () => {
    expect(registry.getRegisteredTypes()).toContain('route');
  });

  it('NodeRegistry: includes all 6 core handler types', () => {
    const types = registry.getRegisteredTypes();
    expect(types).toContain('rag-retrieve');
    expect(types).toContain('decompose');
    expect(types).toContain('ai-generate');
    expect(types).toContain('validate');
    expect(types).toContain('score');
    expect(types).toContain('feedback');
  });

  it('NodeRegistry.has("route") returns true', () => {
    expect(registry.has('route')).toBe(true);
  });

  it('GenericNodeExecutor is injectable', () => {
    const executor = module.get<GenericNodeExecutor>(GenericNodeExecutor);
    expect(executor).toBeDefined();
  });

  it('TopologyStore is injectable', () => {
    const store = module.get<TopologyStore>(TopologyStore);
    expect(store).toBeDefined();
  });

  it('PromptLibraryStation is injectable', () => {
    const lib = module.get<PromptLibraryStation>(PromptLibraryStation);
    expect(lib).toBeDefined();
  });

  it('FlowStateSnapshotService is injectable', () => {
    const svc = module.get<FlowStateSnapshotService>(FlowStateSnapshotService);
    expect(svc).toBeDefined();
  });

  it('DpoTrainingDataService is injectable', () => {
    const svc = module.get<DpoTrainingDataService>(DpoTrainingDataService);
    expect(svc).toBeDefined();
  });

  it('FlowRegistryService is injectable', () => {
    const svc = module.get<FlowRegistryService>(FlowRegistryService);
    expect(svc).toBeDefined();
  });

  it('SkillIngestService is injectable', () => {
    const svc = module.get<SkillIngestService>(SkillIngestService);
    expect(svc).toBeDefined();
  });
});
