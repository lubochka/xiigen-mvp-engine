/**
 * Unit tests for all 7 node handlers + NodeRegistry.
 */
import { DataProcessResult } from '../../kernel/data-process-result';
import { NodeHandlerContext } from './node-handler.types';
import { RagRetrieveHandler } from './rag-retrieve.handler';
import { DecomposeHandler } from './decompose.handler';
import { AiGenerateHandler } from './ai-generate.handler';
import { ValidateHandler, NAMED_CHECKS } from './validate.handler';
import { NamedCheckRegistry } from './named-check.registry';
import { ScoreHandler } from './score.handler';
import { FeedbackHandler } from './feedback.handler';
import { RouteHandler } from './route.handler';
import { PlannerHandler } from './planner.handler';
import { ConvergenceHandler } from './convergence.handler';
import { DepthDecisionHandler } from './depth-decision.handler';
import { NodeRegistry } from './node-registry';

// Minimal EngineContract for tests
const baseContract: any = {
  taskTypeId: 'T47',
  archetype: 'SERVICE',
  ironRules: ['Must extend MicroserviceBase'],
  handlers: [],
  machineConstants: [],
};

const baseCtx: NodeHandlerContext = {
  contract: baseContract,
  runId: 'run-1',
  flowId: 'FLOW-01',
  taskTypeId: 'T47',
  tenantId: 'acme',
  inputs: {},
  priorOutputs: [],
  nodeConfig: {},
};

const mockDb = {
  storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  getDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
  bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
};

const mockAi = {
  generate: jest.fn().mockResolvedValue(
    DataProcessResult.success({
      text: 'class UserService extends MicroserviceBase {}',
      model: 'claude-3',
      tokens_used: 100,
    }),
  ),
  generateStructured: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
};

const mockNamedCheckRegistry = new NamedCheckRegistry();

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.searchDocuments.mockResolvedValue(DataProcessResult.success([]));
  mockDb.storeDocument.mockResolvedValue(DataProcessResult.success({}));
  mockAi.generate.mockResolvedValue(
    DataProcessResult.success({
      text: 'class UserService extends MicroserviceBase {}',
      model: 'claude-3',
      tokens_used: 100,
    }),
  );
});

// ── RagRetrieveHandler ──────────────────────────────────
// A-3: RagRetrieveHandler now injects IRagService (not IDatabaseService).
// Tests use a mockRag that implements IRagService.search().

const mockRag = {
  search: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  ingest: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  buildContextPack: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  deleteByFilter: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
};

describe('RagRetrieveHandler', () => {
  beforeEach(() => {
    mockRag.search.mockResolvedValue(DataProcessResult.success([]));
  });

  const handler = new RagRetrieveHandler(mockRag as any);

  it('returns empty ragPatterns when RAG returns empty', async () => {
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['ragPatterns']).toEqual([]);
  });

  it('returns found patterns', async () => {
    mockRag.search.mockResolvedValueOnce(
      DataProcessResult.success([{ id: 'p1', title: 'Pattern 1' }]),
    );
    const result = await handler.handle({
      ...baseCtx,
      nodeConfig: { namespace: 'T47', tags: ['service'] },
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['patternCount']).toBe(1);
    expect(mockRag.search).toHaveBeenCalledWith(
      expect.stringContaining('T47'),
      expect.objectContaining({ namespace: 'T47' }),
    );
  });

  it('fails gracefully when RAG fails', async () => {
    mockRag.search.mockResolvedValueOnce(
      DataProcessResult.failure('RAG_ERROR', 'connection refused'),
    );
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('RAG_RETRIEVE_FAILED');
  });
});

// ── DecomposeHandler ──────────────────────────────────

describe('DecomposeHandler', () => {
  const handler = new DecomposeHandler(mockDb as any);

  it('uses contract.handlers[] when present', async () => {
    const ctx = {
      ...baseCtx,
      contract: {
        ...baseContract,
        handlers: [
          { name: 'step2', order: 1 },
          { name: 'step1', order: 0 },
        ],
      },
    };
    const result = await handler.handle(ctx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['source']).toBe('contract_handlers');
    const steps = result.data?.data?.['planSteps'] as any[];
    expect(steps[0].name).toBe('step1');
    expect(steps[1].name).toBe('step2');
  });

  it('falls back to archetype template', async () => {
    mockDb.searchDocuments.mockResolvedValueOnce(
      DataProcessResult.success([
        { archetype: 'SERVICE', steps: [{ name: 'generate', order: 0 }] },
      ]),
    );
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['source']).toBe('archetype_template');
  });

  it('uses minimal fallback when no template', async () => {
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['source']).toBe('fallback');
  });
});

// ── AiGenerateHandler ──────────────────────────────────

describe('AiGenerateHandler', () => {
  const handler = new AiGenerateHandler(mockAi as any);

  it('generates code and returns it', async () => {
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['generatedCode']).toContain('MicroserviceBase');
  });

  it('fails when AI fails', async () => {
    mockAi.generate.mockResolvedValueOnce(DataProcessResult.failure('AI_ERROR', 'timeout'));
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('AI_GENERATE_FAILED');
  });

  it('includes prior RAG patterns in context', async () => {
    const ctx = {
      ...baseCtx,
      priorOutputs: [
        {
          nodeType: 'rag-retrieve',
          data: { ragPatterns: [{ title: 'Pattern A', summary: 'Do X' }] },
        },
      ],
    };
    const result = await handler.handle(ctx);
    expect(result.isSuccess).toBe(true);
    expect(mockAi.generate).toHaveBeenCalledWith(
      expect.stringContaining('Pattern A'),
      expect.anything(),
    );
  });
});

// ── ValidateHandler ──────────────────────────────────

describe('ValidateHandler', () => {
  const handler = new ValidateHandler(mockDb as any, mockNamedCheckRegistry);

  it('passes with valid code and no arbiters', async () => {
    const ctx = {
      ...baseCtx,
      priorOutputs: [
        {
          nodeType: 'ai-generate',
          data: { generatedCode: 'class X extends MicroserviceBase { constructor() {} }' },
        },
      ],
    };
    const result = await handler.handle(ctx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['passed']).toBe(true);
  });

  it('fails when no generated code', async () => {
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATE_NO_CODE');
  });

  it('runs arbiter checks when arbiters found', async () => {
    mockDb.searchDocuments.mockResolvedValueOnce(
      DataProcessResult.success([{ checkId: 'store_before_enqueue' }]),
    );
    const ctx = {
      ...baseCtx,
      priorOutputs: [
        { nodeType: 'ai-generate', data: { generatedCode: 'enqueue(); storeDocument();' } },
      ],
    };
    const result = await handler.handle(ctx);
    expect(result.isSuccess).toBe(true);
    // store_before_enqueue should fail (enqueue before store)
    expect(result.data?.data?.['failureCount']).toBeGreaterThan(0);
  });
});

// ── ScoreHandler ──────────────────────────────────

describe('ScoreHandler', () => {
  const handler = new ScoreHandler(mockDb as any);

  it('scores code and returns numeric score', async () => {
    const ctx = {
      ...baseCtx,
      priorOutputs: [
        {
          nodeType: 'ai-generate',
          data: {
            generatedCode:
              '@Injectable()\nclass X extends MicroserviceBase {\n  constructor(private db: IDatabaseService) {}\n}',
          },
        },
      ],
    };
    const result = await handler.handle(ctx);
    expect(result.isSuccess).toBe(true);
    expect(typeof result.data?.data?.['score']).toBe('number');
    expect(result.data?.data?.['score']).toBeGreaterThanOrEqual(0);
    expect(result.data?.data?.['score']).toBeLessThanOrEqual(1);
  });

  it('fails when no generated code', async () => {
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SCORE_NO_CODE');
  });

  it('writes checkpoint report on max retries', async () => {
    const ctx = {
      ...baseCtx,
      inputs: { retryCount: 3 },
      nodeConfig: { maxRetries: 3 },
      priorOutputs: [{ nodeType: 'ai-generate', data: { generatedCode: 'class X {}' } }],
    };
    await handler.handle(ctx);
    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-checkpoint-reports',
      expect.objectContaining({ maxRetriesReached: true }),
      expect.any(String),
    );
  });
});

// ── FeedbackHandler ──────────────────────────────────

describe('FeedbackHandler', () => {
  const handler = new FeedbackHandler(mockDb as any);

  it('stores DPO triple with null domain context fields', async () => {
    const ctx = {
      ...baseCtx,
      priorOutputs: [
        {
          nodeType: 'ai-generate',
          data: {
            generatedCode: 'class X extends MicroserviceBase {}',
            modelComparison: {
              chosen: { model: 'claude-opus-4', score: 0.85 },
              rejected: { model: 'claude-sonnet-4', score: 0.72 },
              discarded: null,
              judgeModel: 'claude-sonnet-4-judge',
              shuffleWasApplied: true,
            },
          },
        },
        { nodeType: 'score', data: { score: 0.85 } },
      ],
    };
    const result = await handler.handle(ctx);
    expect(result.isSuccess).toBe(true);
    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-training-data',
      expect.objectContaining({
        domain: null,
        entityType: null,
        conflictType: null,
        ftId: null,
        productScope: null,
      }),
      expect.any(String),
    );
  });

  it('triggers promptOps flag when score < 0.80', async () => {
    const ctx = {
      ...baseCtx,
      priorOutputs: [
        {
          nodeType: 'ai-generate',
          data: {
            generatedCode: 'class X {}',
            modelComparison: {
              chosen: { model: 'claude-opus-4', score: 0.65 },
              rejected: { model: 'claude-sonnet-4', score: 0.5 },
              discarded: null,
              judgeModel: 'claude-sonnet-4-judge',
              shuffleWasApplied: true,
            },
          },
        },
        { nodeType: 'score', data: { score: 0.65 } },
      ],
    };
    const result = await handler.handle(ctx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['promptOpsTriggered']).toBe(true);
  });
});

// ── RouteHandler ──────────────────────────────────

describe('RouteHandler', () => {
  const handler = new RouteHandler();

  it('routes to matching branch', async () => {
    const ctx = {
      ...baseCtx,
      inputs: { event: { type: 'RSVPRequested' } },
      nodeConfig: {
        branches: [
          { field: 'event.type', value: 'RSVPRequested', branch: 'rsvp-path' },
          { field: 'event.type', value: 'TicketPurchaseCompleted', branch: 'ticket-path' },
        ],
      },
    };
    const result = await handler.handle(ctx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['selectedBranch']).toBe('rsvp-path');
  });

  it('falls back to DEFAULT branch when no match', async () => {
    const ctx = {
      ...baseCtx,
      inputs: { event: { type: 'UnknownEvent' } },
      nodeConfig: {
        branches: [
          { field: 'event.type', value: 'RSVPRequested', branch: 'rsvp-path' },
          { field: 'event.type', value: 'DEFAULT', branch: 'default-path' },
        ],
      },
    };
    const result = await handler.handle(ctx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['selectedBranch']).toBe('default-path');
  });

  it('fails when no branches configured and no match', async () => {
    const ctx = {
      ...baseCtx,
      inputs: { event: { type: 'SomeEvent' } },
      nodeConfig: {
        branches: [{ field: 'event.type', value: 'OtherEvent', branch: 'other' }],
      },
    };
    const result = await handler.handle(ctx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('ROUTE_NO_MATCH');
  });

  it('passes through when no branches configured', async () => {
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['selectedBranch']).toBe('DEFAULT');
  });
});

// ── FLOW-02 named checks ──────────────────────────────────

describe('FLOW-02 named checks', () => {
  // fan_in_pattern: Promise.allSettled() mandatory for FAN_IN archetype
  describe('fan_in_pattern', () => {
    it('passes when code uses Promise.allSettled()', () => {
      const code = `const results = await Promise.allSettled([fetchGithub(), fetchPortfolio()]);`;
      const check = NAMED_CHECKS['fan_in_pattern'];
      const regex = check.default as RegExp;
      expect(regex.test(code)).toBe(true);
    });

    it('fails when code uses Promise.all() instead', () => {
      const code = `const results = await Promise.all([fetchGithub(), fetchPortfolio()]);`;
      const check = NAMED_CHECKS['fan_in_pattern'];
      const regex = check.default as RegExp;
      expect(regex.test(code)).toBe(false);
    });
  });

  // degraded_terminal: CONVERGENCE must use success({matchStatus:'pending'}) not failure() for low scores
  describe('degraded_terminal', () => {
    it('passes when code returns success with matchStatus pending for low score', () => {
      const code = `
        if (score < threshold) {
          return DataProcessResult.success({ matchStatus: 'pending', score });
        }
      `;
      const check = NAMED_CHECKS['degraded_terminal'];
      expect((check.default as Function)(code)).toBe(true);
    });

    it('fails when code uses failure() for score-below-threshold condition', () => {
      const code = `
        if (score < threshold) {
          return DataProcessResult.failure('SCORE_TOO_LOW', 'confidence below threshold');
        }
      `;
      const check = NAMED_CHECKS['degraded_terminal'];
      expect((check.default as Function)(code)).toBe(false);
    });

    it('passes when code has no score-related failure at all', () => {
      const code = `return DataProcessResult.success({ matched: true });`;
      const check = NAMED_CHECKS['degraded_terminal'];
      expect((check.default as Function)(code)).toBe(true);
    });
  });

  // convergence_threshold_from_freedom_config: no hardcoded threshold values
  describe('convergence_threshold_from_freedom_config', () => {
    it('fails when code hardcodes a confidence threshold', () => {
      const code = `if (score >= 0.80) { return DataProcessResult.success({ matched: true }); }`;
      const check = NAMED_CHECKS['convergence_threshold_from_freedom_config'];
      expect((check.default as Function)(code)).toBe(false);
    });

    it('passes when code reads threshold from freedom config', () => {
      const code = `
        const threshold = await this.freedomConfig.get('CONVERGENCE_THRESHOLD');
        if (score >= threshold) { return DataProcessResult.success({ matched: true }); }
      `;
      const check = NAMED_CHECKS['convergence_threshold_from_freedom_config'];
      expect((check.default as Function)(code)).toBe(true);
    });
  });
});

// ── NodeRegistry ──────────────────────────────────

describe('NodeRegistry', () => {
  const ragRetrieve = new RagRetrieveHandler(mockDb as any);
  const decompose = new DecomposeHandler(mockDb as any);
  const aiGenerate = new AiGenerateHandler(mockAi as any);
  const validate = new ValidateHandler(mockDb as any, mockNamedCheckRegistry);
  const score = new ScoreHandler(mockDb as any);
  const feedback = new FeedbackHandler(mockDb as any);
  const route = new RouteHandler();
  const mockTeachingRound = {
    run: jest.fn().mockResolvedValue(
      DataProcessResult.success({
        bestOutput: '{}',
        bestModel: 'mock',
        bestScore: 9.0,
        triples: [],
      }),
    ),
  };
  const planner = new PlannerHandler(mockAi as any, mockDb as any);
  const convergence = new ConvergenceHandler(
    mockAi as any,
    mockTeachingRound as any,
    mockDb as any,
  );
  const depthDecision = new DepthDecisionHandler(mockAi as any, mockDb as any);

  const registry = new NodeRegistry(
    ragRetrieve,
    decompose,
    aiGenerate,
    validate,
    score,
    feedback,
    route,
    planner,
    convergence,
    depthDecision,
  );

  it('has all 10 handlers registered', () => {
    const types = registry.getRegisteredTypes();
    expect(types).toHaveLength(10);
    expect(types).toContain('rag-retrieve');
    expect(types).toContain('decompose');
    expect(types).toContain('ai-generate');
    expect(types).toContain('validate');
    expect(types).toContain('score');
    expect(types).toContain('feedback');
    expect(types).toContain('route');
    expect(types).toContain('planner');
    expect(types).toContain('convergence');
    expect(types).toContain('depth-decision');
  });

  it('resolves handler by nodeType', () => {
    expect(registry.resolve('rag-retrieve')).toBe(ragRetrieve);
    expect(registry.resolve('route')).toBe(route);
  });

  it('returns undefined for unknown nodeType', () => {
    expect(registry.resolve('unknown-handler')).toBeUndefined();
  });

  it('has() returns true for registered types', () => {
    expect(registry.has('rag-retrieve')).toBe(true);
    expect(registry.has('route')).toBe(true);
    expect(registry.has('nonexistent')).toBe(false);
  });
});
