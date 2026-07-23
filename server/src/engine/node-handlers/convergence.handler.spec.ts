/**
 * Unit tests for ConvergenceHandler — Cycle 2 Self-Judge Teaching Round NODE Generation
 * Tests the new design: delegates N-round loop to TeachingRoundService, runs arbiter panel.
 */

import 'reflect-metadata';
import { DataProcessResult } from '../../kernel/data-process-result';
import { NodeHandlerContext } from './node-handler.types';
import { ConvergenceHandler } from './convergence.handler';

const baseContract: any = {
  taskTypeId: 'T47',
  archetype: 'SERVICE',
  ironRules: ['Must extend MicroserviceBase'],
  handlers: [],
  machineConstants: [],
};

const baseCtx: NodeHandlerContext = {
  contract: baseContract,
  runId: 'run-conv-1',
  flowId: 'FLOW-01',
  taskTypeId: 'T47',
  tenantId: 'acme',
  inputs: {
    stepText: 'Confirm the email address is not already registered',
    constraints: ['No typed models'],
    stepType: 'REGISTRATION',
  },
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

const nodeJson = JSON.stringify({
  structure: {
    inputShape: ['email'],
    outputShape: ['uniquenessStatus'],
    triggers: ['registration-requested'],
    emits: ['uniqueness-checked'],
    dependencies: [],
  },
  intent: {
    purpose: 'Confirm the email address is not already registered',
    invariants: ['No duplicate emails'],
    failureModes: ['email already exists', 'lookup service unavailable'],
    domainConcepts: ['email uniqueness'],
  },
  constraints: ['No typed models'],
  quality: {
    scoringCriteria: ['email uniqueness check passes', 'error returned for duplicate'],
    acceptanceThreshold: 0.85,
    degradationAcceptable: false,
  },
});

const passingArbiterResponse = JSON.stringify({
  verdict: 'PASS',
  criterion: 'IronRules',
  detail: 'NODE is compliant',
});

function makeMockTeachingRound(nodeOutput = nodeJson, score = 9.0, fail = false) {
  return {
    run: jest.fn().mockResolvedValue(
      fail
        ? DataProcessResult.failure('NO_ROUNDS', 'no rounds completed')
        : DataProcessResult.success({
            bestOutput: nodeOutput,
            bestModel: 'mock-gemini',
            bestScore: score,
            triples: [
              {
                round: 1,
                chosen: { text: nodeOutput, model: 'mock-gemini', score },
                rejected: { text: nodeOutput, model: 'mock-openai', score: score - 2 },
                discarded: null,
                totalCost: 0.002,
              },
            ],
          }),
    ),
  };
}

const mockAi = {
  generate: jest.fn(),
  generateStructured: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.storeDocument.mockResolvedValue(DataProcessResult.success({}));
  mockAi.generate.mockResolvedValue(
    DataProcessResult.success({
      text: passingArbiterResponse,
      model: 'claude-3',
      tokens_used: 50,
    }),
  );
});

describe('ConvergenceHandler', () => {
  it('returns failure if stepText is empty', async () => {
    const tr = makeMockTeachingRound();
    const handler = new ConvergenceHandler(mockAi as any, tr as any, mockDb as any);
    const ctx = { ...baseCtx, inputs: { ...baseCtx.inputs, stepText: '' } };
    const result = await handler.handle(ctx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CONVERGENCE_MISSING_STEP');
  });

  it('returns failure if constraints is empty', async () => {
    const tr = makeMockTeachingRound();
    const handler = new ConvergenceHandler(mockAi as any, tr as any, mockDb as any);
    const ctx = { ...baseCtx, inputs: { ...baseCtx.inputs, constraints: [] } };
    const result = await handler.handle(ctx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CONVERGENCE_MISSING_CONSTRAINTS');
  });

  it('returns CONVERGENCE_ROUNDS_FAILED when teachingRound.run() fails', async () => {
    const tr = makeMockTeachingRound(nodeJson, 9.0, true);
    const handler = new ConvergenceHandler(mockAi as any, tr as any, mockDb as any);
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CONVERGENCE_ROUNDS_FAILED');
  });

  it('calls teachingRound.run() with options including nodePrompt and judgeSystemPrompt', async () => {
    const tr = makeMockTeachingRound();
    const handler = new ConvergenceHandler(mockAi as any, tr as any, mockDb as any);
    await handler.handle(baseCtx);

    expect(tr.run).toHaveBeenCalledTimes(1);
    const opts = (tr.run as jest.Mock).mock.calls[0]?.[0];
    expect(opts.nodePrompt).toBeDefined();
    expect(opts.judgeSystemPrompt).toBeDefined();
    expect(opts.stepText).toBe('Confirm the email address is not already registered');
    expect(opts.constraints).toEqual(['No typed models']);
    expect(opts.flowId).toBe('FLOW-01');
    expect(opts.runId).toBe('run-conv-1');
    expect(opts.tenantId).toBe('acme');
  });

  it('nodePrompt contains QUESTION YOURSELF section', async () => {
    const tr = makeMockTeachingRound();
    const handler = new ConvergenceHandler(mockAi as any, tr as any, mockDb as any);
    await handler.handle(baseCtx);

    const opts = (tr.run as jest.Mock).mock.calls[0]?.[0];
    expect(opts.nodePrompt).toContain('QUESTION YOURSELF');
  });

  it('DNA-8: stores CYCLE-4 record before arbiter calls', async () => {
    const storeOrder: string[] = [];
    const arbiterCallOrder: number[] = [];
    let arbiterCallCount = 0;

    const db = {
      ...mockDb,
      storeDocument: jest.fn().mockImplementation(async (index: string) => {
        storeOrder.push(index);
        return DataProcessResult.success({});
      }),
    };

    const aiWithOrder = {
      ...mockAi,
      generate: jest.fn().mockImplementation(async () => {
        arbiterCallOrder.push(storeOrder.length);
        arbiterCallCount++;
        return DataProcessResult.success({
          text: passingArbiterResponse,
          model: 'claude-3',
          tokens_used: 50,
        });
      }),
    };

    const tr = makeMockTeachingRound();
    const handler = new ConvergenceHandler(aiWithOrder as any, tr as any, db as any);
    await handler.handle(baseCtx);

    // CYCLE-4 must be stored (xiigen-training-data) before any arbiter call
    const cycle4StoreIdx = storeOrder.indexOf('xiigen-training-data');
    expect(cycle4StoreIdx).toBeGreaterThanOrEqual(0);
    // Every arbiter call should happen after cycle4 was stored
    for (const callTime of arbiterCallOrder) {
      expect(callTime).toBeGreaterThan(cycle4StoreIdx);
    }
  });

  it('stores CYCLE-4 record with station=CYCLE-4 and status=PENDING_IMPLEMENTATION', async () => {
    const tr = makeMockTeachingRound();
    const handler = new ConvergenceHandler(mockAi as any, tr as any, mockDb as any);
    await handler.handle(baseCtx);

    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-training-data',
      expect.objectContaining({
        station: 'CYCLE-4',
        status: 'PENDING_IMPLEMENTATION',
        bestTeachingModel: 'mock-gemini',
        bestTeachingScore: 9.0,
      }),
      expect.any(String),
    );
  });

  it('stores cycle-visibility with cycleType=CYCLE-2 (DNA-8)', async () => {
    const tr = makeMockTeachingRound();
    const handler = new ConvergenceHandler(mockAi as any, tr as any, mockDb as any);
    const result = await handler.handle(baseCtx);

    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-cycle-visibility',
      expect.objectContaining({ cycleType: 'CYCLE-2' }),
      expect.any(String),
    );
    expect(result.isSuccess).toBe(true);
  });

  it('BLOCK from any arbiter sets accepted=false and grade=0', async () => {
    const blockAi = {
      ...mockAi,
      generate: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          text: JSON.stringify({
            verdict: 'BLOCK',
            criterion: 'IronRules',
            detail: 'violation found',
          }),
          model: 'claude-3',
          tokens_used: 50,
        }),
      ),
    };

    const tr = makeMockTeachingRound();
    const ctx = { ...baseCtx, inputs: { ...baseCtx.inputs, challengerRoles: ['IronRules'] } };
    const handler = new ConvergenceHandler(blockAi as any, tr as any, mockDb as any);
    const result = await handler.handle(ctx);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['accepted']).toBe(false);
    expect(result.data?.data?.['grade']).toBe(0);
  });

  it('grade = bestScore/10 when no blocks', async () => {
    const tr = makeMockTeachingRound(nodeJson, 9.0);
    const ctx = { ...baseCtx, inputs: { ...baseCtx.inputs, challengerRoles: ['IronRules'] } };
    const handler = new ConvergenceHandler(mockAi as any, tr as any, mockDb as any);
    const result = await handler.handle(ctx);

    expect(result.isSuccess).toBe(true);
    // grade = 9.0 / 10 = 0.9, accepted = 0.9 >= 0.85 (default gradeThreshold)
    expect(result.data?.data?.['grade']).toBeCloseTo(0.9, 5);
    expect(result.data?.data?.['accepted']).toBe(true);
  });

  it('stores node-definitions only when accepted=true', async () => {
    const tr = makeMockTeachingRound(nodeJson, 9.0); // score=9.0, grade=0.9 >= 0.85
    const ctx = { ...baseCtx, inputs: { ...baseCtx.inputs, challengerRoles: ['IronRules'] } };
    const handler = new ConvergenceHandler(mockAi as any, tr as any, mockDb as any);
    await handler.handle(ctx);

    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-node-definitions',
      expect.objectContaining({ winningNode: expect.any(Object), stepText: expect.any(String) }),
      expect.any(String),
    );
  });

  it('does not store node-definitions when accepted=false (BLOCK)', async () => {
    const blockAi = {
      ...mockAi,
      generate: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          text: JSON.stringify({ verdict: 'BLOCK', criterion: 'IronRules', detail: 'block' }),
          model: 'claude-3',
          tokens_used: 50,
        }),
      ),
    };

    const tr = makeMockTeachingRound();
    const ctx = { ...baseCtx, inputs: { ...baseCtx.inputs, challengerRoles: ['IronRules'] } };
    const handler = new ConvergenceHandler(blockAi as any, tr as any, mockDb as any);
    await handler.handle(ctx);

    const nodeDefCalls = (mockDb.storeDocument as jest.Mock).mock.calls.filter(
      (call: unknown[]) => call[0] === 'xiigen-node-definitions',
    );
    expect(nodeDefCalls.length).toBe(0);
  });

  it('result contains winningNode, bestModel, bestScore, grade, accepted', async () => {
    const tr = makeMockTeachingRound(nodeJson, 9.0);
    const ctx = { ...baseCtx, inputs: { ...baseCtx.inputs, challengerRoles: ['IronRules'] } };
    const handler = new ConvergenceHandler(mockAi as any, tr as any, mockDb as any);
    const result = await handler.handle(ctx);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['winningNode']).toBeDefined();
    expect(result.data?.data?.['bestModel']).toBe('mock-gemini');
    expect(result.data?.data?.['bestScore']).toBe(9.0);
    expect(result.data?.data?.['grade']).toBeCloseTo(0.9, 5);
    expect(result.data?.data?.['accepted']).toBe(true);
  });

  it('arbiter receives parentNode from challengerContext (two-layer rule)', async () => {
    const capturedArbiterPrompts: string[] = [];
    const aiCapture = {
      ...mockAi,
      generate: jest.fn().mockImplementation(async (prompt: string) => {
        capturedArbiterPrompts.push(prompt);
        return DataProcessResult.success({
          text: passingArbiterResponse,
          model: 'claude-3',
          tokens_used: 50,
        });
      }),
    };

    const parentNode = {
      structure: { inputShape: ['userId'], outputShape: ['token'] },
      intent: { purpose: 'Establish user identity in the system' },
      constraints: ['No typed models'],
      quality: { scoringCriteria: ['identity created'] },
    };

    const tr = makeMockTeachingRound();
    const ctx = {
      ...baseCtx,
      inputs: {
        ...baseCtx.inputs,
        challengerRoles: ['IronRules'],
        challengerContext: { parentNode, parentDepth: 1, delegatedScope: 'email check' },
      },
    };
    const handler = new ConvergenceHandler(aiCapture as any, tr as any, mockDb as any);
    await handler.handle(ctx);

    expect(capturedArbiterPrompts.length).toBeGreaterThan(0);
    // Arbiter prompt must reference PARENT NODE
    expect(capturedArbiterPrompts[0]).toContain('PARENT NODE');
    expect(capturedArbiterPrompts[0]).toContain('Establish user identity');

    // Teaching round's nodePrompt must NOT contain parentNode content
    const trOpts = (tr.run as jest.Mock).mock.calls[0]?.[0];
    expect(trOpts.nodePrompt).not.toContain('Establish user identity');
  });

  it('calls arbiters with FAST role', async () => {
    const capturedOpts: any[] = [];
    const aiCapture = {
      ...mockAi,
      generate: jest.fn().mockImplementation(async (_prompt: string, opts: any) => {
        capturedOpts.push(opts);
        return DataProcessResult.success({
          text: passingArbiterResponse,
          model: 'claude-3',
          tokens_used: 50,
        });
      }),
    };

    const tr = makeMockTeachingRound();
    const ctx = { ...baseCtx, inputs: { ...baseCtx.inputs, challengerRoles: ['IronRules'] } };
    const handler = new ConvergenceHandler(aiCapture as any, tr as any, mockDb as any);
    await handler.handle(ctx);

    expect(capturedOpts.length).toBeGreaterThan(0);
    // AiModelRole.FAST = 'fast'
    expect(capturedOpts[0]?.role).toBe('fast');
  });

  // ── GAP-A test: depth and nodeIntent passed to TeachingRoundService ──────

  it('GAP-A: passes depth and nodeIntent to TeachingRoundService.run()', async () => {
    const tr = makeMockTeachingRound();
    const ctx = {
      ...baseCtx,
      inputs: {
        ...baseCtx.inputs,
        stepText: 'verify email before granting access',
        challengerContext: { parentDepth: 1 }, // parentDepth=1 → nodeDepth=2
      },
    };
    const handler = new ConvergenceHandler(mockAi as any, tr as any, mockDb as any);
    await handler.handle(ctx);

    const trOpts = (tr.run as jest.Mock).mock.calls[0]?.[0];
    expect(trOpts.depth).toBe(2);
    expect(trOpts.nodeIntent).toBe('verify email before granting access');
  });

  // ── Plan B Phase 0 observability tests ──────────────────────────────────────

  it('result contains rejectionReason when arbiter blocks (Plan B Phase 0)', async () => {
    const blockAi = {
      ...mockAi,
      generate: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          text: JSON.stringify({
            verdict: 'BLOCK',
            criterion: 'IronRules',
            detail: 'violates no-throw rule',
          }),
          model: 'claude-3',
          tokens_used: 50,
        }),
      ),
    };
    const tr = makeMockTeachingRound();
    const ctx = { ...baseCtx, inputs: { ...baseCtx.inputs, challengerRoles: ['IronRules'] } };
    const handler = new ConvergenceHandler(blockAi as any, tr as any, mockDb as any);
    const result = await handler.handle(ctx);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['accepted']).toBe(false);
    const rejectionReason = result.data?.data?.['rejectionReason'] as string | undefined;
    expect(rejectionReason).toBeDefined();
    expect(rejectionReason).toMatch(/ARBITER_BLOCK/);
    expect(rejectionReason).toMatch(/IronRules/);
  });

  it('result contains rejectionReason when grade below threshold (Plan B Phase 0)', async () => {
    // Score 5.0 → grade 0.5, below default threshold 0.85 — no arbiter BLOCK
    const tr = makeMockTeachingRound(nodeJson, 5.0);
    const handler = new ConvergenceHandler(mockAi as any, tr as any, mockDb as any);
    const result = await handler.handle(baseCtx);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['accepted']).toBe(false);
    const rejectionReason = result.data?.data?.['rejectionReason'] as string | undefined;
    expect(rejectionReason).toBeDefined();
    expect(rejectionReason).toMatch(/GRADE_BELOW_THRESHOLD/);
  });

  // ── G1: Differentiated prompt routing tests ────────────────────────────────

  it('G1: passes nodePromptB to TeachingRoundService when prevCycleSummaries present and FREEDOM enabled', async () => {
    const mockFreedomConfig = {
      get: jest.fn().mockImplementation(async (key: string) => {
        if (key === 'xiigen.convergence.modelBEnriched') return { value: true };
        return null;
      }),
    };
    const tr = makeMockTeachingRound();
    const ctx = {
      ...baseCtx,
      inputs: {
        ...baseCtx.inputs,
        prevCycleSummaries: ['Step 1: Email uniqueness check node'],
      },
    };
    const handler = new ConvergenceHandler(
      mockAi as any,
      tr as any,
      mockDb as any,
      mockFreedomConfig as any,
    );
    await handler.handle(ctx);

    const trOpts = (tr.run as jest.Mock).mock.calls[0]?.[0];
    expect(trOpts.nodePromptB).toBeDefined();
    expect(trOpts.nodePromptB).toContain('PREVIOUS CYCLES');
    expect(trOpts.nodePromptB).toContain('Step 1: Email uniqueness check node');
  });

  it('G1: passes nodePromptB=undefined when FREEDOM disabled (default: false)', async () => {
    const tr = makeMockTeachingRound();
    const ctx = {
      ...baseCtx,
      inputs: {
        ...baseCtx.inputs,
        prevCycleSummaries: ['Step 1: some summary'],
      },
    };
    // No freedomConfig injected → defaults to false
    const handler = new ConvergenceHandler(mockAi as any, tr as any, mockDb as any);
    await handler.handle(ctx);

    const trOpts = (tr.run as jest.Mock).mock.calls[0]?.[0];
    expect(trOpts.nodePromptB).toBeUndefined();
  });

  it('G1: passes nodePromptB=undefined when prevCycleSummaries is empty', async () => {
    const mockFreedomConfig = {
      get: jest.fn().mockImplementation(async (key: string) => {
        if (key === 'xiigen.convergence.modelBEnriched') return { value: true };
        return null;
      }),
    };
    const tr = makeMockTeachingRound();
    const ctx = {
      ...baseCtx,
      inputs: {
        ...baseCtx.inputs,
        prevCycleSummaries: [], // empty — no enrichment
      },
    };
    const handler = new ConvergenceHandler(
      mockAi as any,
      tr as any,
      mockDb as any,
      mockFreedomConfig as any,
    );
    await handler.handle(ctx);

    const trOpts = (tr.run as jest.Mock).mock.calls[0]?.[0];
    expect(trOpts.nodePromptB).toBeUndefined();
  });

  it('G1: buildEnrichedNodePrompt includes PREVIOUS CYCLES section with ordered summaries', async () => {
    const mockFreedomConfig = {
      get: jest.fn().mockImplementation(async (key: string) => {
        if (key === 'xiigen.convergence.modelBEnriched') return { value: true };
        return null;
      }),
    };
    const tr = makeMockTeachingRound();
    const ctx = {
      ...baseCtx,
      inputs: {
        ...baseCtx.inputs,
        prevCycleSummaries: ['First summary', 'Second summary'],
      },
    };
    const handler = new ConvergenceHandler(
      mockAi as any,
      tr as any,
      mockDb as any,
      mockFreedomConfig as any,
    );
    await handler.handle(ctx);

    const trOpts = (tr.run as jest.Mock).mock.calls[0]?.[0];
    expect(trOpts.nodePromptB).toContain('Step 1: First summary');
    expect(trOpts.nodePromptB).toContain('Step 2: Second summary');
  });

  it('G1: buildEnrichedNodePrompt base prompt identical to buildNodePrompt content when no extra', async () => {
    const mockFreedomConfig = {
      get: jest.fn().mockImplementation(async (key: string) => {
        if (key === 'xiigen.convergence.modelBEnriched') return { value: true };
        return null;
      }),
    };
    const tr = makeMockTeachingRound();
    const ctx = {
      ...baseCtx,
      inputs: {
        ...baseCtx.inputs,
        prevCycleSummaries: ['A summary'],
      },
    };
    const handler = new ConvergenceHandler(
      mockAi as any,
      tr as any,
      mockDb as any,
      mockFreedomConfig as any,
    );
    await handler.handle(ctx);

    const trOpts = (tr.run as jest.Mock).mock.calls[0]?.[0];
    // nodePromptB must start with the same content as nodePrompt
    expect(trOpts.nodePromptB.startsWith(trOpts.nodePrompt)).toBe(true);
  });

  it('G1: prevCycleSummaries missing from inputs treated as [] not error', async () => {
    const tr = makeMockTeachingRound();
    // No prevCycleSummaries in ctx inputs
    const handler = new ConvergenceHandler(mockAi as any, tr as any, mockDb as any);
    const result = await handler.handle(baseCtx);

    expect(result.isSuccess).toBe(true);
    // nodePromptB undefined (no summaries)
    const trOpts = (tr.run as jest.Mock).mock.calls[0]?.[0];
    expect(trOpts.nodePromptB).toBeUndefined();
  });

  // ── G4: Dynamic arbiter expansion tests ────────────────────────────────────

  it('G4: dynamic arbiters disabled (default): runDynamicArbiters not called', async () => {
    const capturedPrompts: string[] = [];
    const aiSpy = {
      ...mockAi,
      generate: jest.fn().mockImplementation(async (prompt: string) => {
        capturedPrompts.push(prompt);
        return DataProcessResult.success({
          text: passingArbiterResponse,
          model: 'claude-3',
          tokens_used: 50,
        });
      }),
    };

    const tr = makeMockTeachingRound();
    const ctx = { ...baseCtx, inputs: { ...baseCtx.inputs, challengerRoles: ['IronRules'] } };
    const handler = new ConvergenceHandler(aiSpy as any, tr as any, mockDb as any);
    const result = await handler.handle(ctx);

    expect(result.isSuccess).toBe(true);
    // No calls to identifyUncoveredConcerns (which uses FAST role prompt)
    // Only 1 arbiter call (base arbiter only)
    expect(capturedPrompts.length).toBe(1); // 1 base arbiter
  });

  it('G4: dynamic arbiters enabled: called only when base arbiters PASS', async () => {
    const mockFreedomConfig = {
      get: jest.fn().mockImplementation(async (key: string) => {
        if (key === 'xiigen.convergence.dynamicArbiters') return { value: true };
        return null;
      }),
    };

    const capturedPrompts: string[] = [];
    const aiSpy = {
      ...mockAi,
      generate: jest.fn().mockImplementation(async (prompt: string) => {
        capturedPrompts.push(prompt);
        // Return PASS for base arbiter, then empty uncovered for dynamic
        if (prompt.includes('Identify which')) {
          return DataProcessResult.success({
            text: JSON.stringify({ uncovered: [] }),
            model: 'claude-3',
            tokens_used: 50,
          });
        }
        return DataProcessResult.success({
          text: passingArbiterResponse,
          model: 'claude-3',
          tokens_used: 50,
        });
      }),
    };

    const tr = makeMockTeachingRound();
    const ctx = { ...baseCtx, inputs: { ...baseCtx.inputs, challengerRoles: ['IronRules'] } };
    const handler = new ConvergenceHandler(
      aiSpy as any,
      tr as any,
      mockDb as any,
      mockFreedomConfig as any,
    );
    const result = await handler.handle(ctx);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['accepted']).toBe(true);
    // identifyUncoveredConcerns was called (dynamic arbiters enabled, base passed)
    const uncoveredCall = capturedPrompts.find((p) => p.includes('Identify which'));
    expect(uncoveredCall).toBeDefined();
  });

  it('G4: dynamic arbiters enabled: NOT called when base arbiter BLOCKs (guard)', async () => {
    const mockFreedomConfig = {
      get: jest.fn().mockImplementation(async (key: string) => {
        if (key === 'xiigen.convergence.dynamicArbiters') return { value: true };
        return null;
      }),
    };

    const capturedPrompts: string[] = [];
    const blockAi = {
      ...mockAi,
      generate: jest.fn().mockImplementation(async (prompt: string) => {
        capturedPrompts.push(prompt);
        return DataProcessResult.success({
          text: JSON.stringify({ verdict: 'BLOCK', criterion: 'IronRules', detail: 'violation' }),
          model: 'claude-3',
          tokens_used: 50,
        });
      }),
    };

    const tr = makeMockTeachingRound();
    const ctx = { ...baseCtx, inputs: { ...baseCtx.inputs, challengerRoles: ['IronRules'] } };
    const handler = new ConvergenceHandler(
      blockAi as any,
      tr as any,
      mockDb as any,
      mockFreedomConfig as any,
    );
    await handler.handle(ctx);

    // identifyUncoveredConcerns should NOT be called when base blocked
    const uncoveredCall = capturedPrompts.find((p) => p.includes('Identify which'));
    expect(uncoveredCall).toBeUndefined();
  });

  it('G4: identifyUncoveredConcerns: calls AI judge with base arbiter names and NODE constraints', async () => {
    const mockFreedomConfig = {
      get: jest.fn().mockImplementation(async (key: string) => {
        if (key === 'xiigen.convergence.dynamicArbiters') return { value: true };
        return null;
      }),
    };

    let uncoveredPrompt = '';
    const aiSpy = {
      ...mockAi,
      generate: jest.fn().mockImplementation(async (prompt: string) => {
        if (prompt.includes('Identify which')) {
          uncoveredPrompt = prompt;
          return DataProcessResult.success({
            text: JSON.stringify({ uncovered: [] }),
            model: 'claude-3',
            tokens_used: 50,
          });
        }
        return DataProcessResult.success({
          text: passingArbiterResponse,
          model: 'claude-3',
          tokens_used: 50,
        });
      }),
    };

    const tr = makeMockTeachingRound();
    const ctx = {
      ...baseCtx,
      inputs: { ...baseCtx.inputs, challengerRoles: ['IronRules', 'Domain'] },
    };
    const handler = new ConvergenceHandler(
      aiSpy as any,
      tr as any,
      mockDb as any,
      mockFreedomConfig as any,
    );
    await handler.handle(ctx);

    expect(uncoveredPrompt).toContain('IronRules');
    expect(uncoveredPrompt).toContain('Base arbiters');
  });

  it('G4: identifyUncoveredConcerns: constraint identified by AI when uncovered', async () => {
    const mockFreedomConfig = {
      get: jest.fn().mockImplementation(async (key: string) => {
        if (key === 'xiigen.convergence.dynamicArbiters') return { value: true };
        return null;
      }),
    };

    const aiSpy = {
      ...mockAi,
      generate: jest.fn().mockImplementation(async (prompt: string) => {
        if (prompt.includes('Identify which')) {
          return DataProcessResult.success({
            text: JSON.stringify({ uncovered: ['No typed models'] }),
            model: 'claude-3',
            tokens_used: 50,
          });
        }
        if (prompt.includes('Evaluate whether')) {
          return DataProcessResult.success({
            text: JSON.stringify({ verdict: 'PASS', reason: 'Constraint satisfied' }),
            model: 'claude-3',
            tokens_used: 50,
          });
        }
        return DataProcessResult.success({
          text: passingArbiterResponse,
          model: 'claude-3',
          tokens_used: 50,
        });
      }),
    };

    const tr = makeMockTeachingRound();
    const ctx = { ...baseCtx, inputs: { ...baseCtx.inputs, challengerRoles: ['IronRules'] } };
    const handler = new ConvergenceHandler(
      aiSpy as any,
      tr as any,
      mockDb as any,
      mockFreedomConfig as any,
    );
    const result = await handler.handle(ctx);

    expect(result.isSuccess).toBe(true);
    const dynResults = result.data?.data?.['dynamicArbiterResults'] as any[];
    expect(dynResults.length).toBeGreaterThan(0);
    expect(dynResults[0].concern).toBe('No typed models');
  });

  it('G4: identifyUncoveredConcerns: AI failure returns [] without throwing (DNA-3 fail-safe)', async () => {
    const mockFreedomConfig = {
      get: jest.fn().mockImplementation(async (key: string) => {
        if (key === 'xiigen.convergence.dynamicArbiters') return { value: true };
        return null;
      }),
    };

    const aiSpy = {
      ...mockAi,
      generate: jest.fn().mockImplementation(async (prompt: string) => {
        if (prompt.includes('Identify which')) {
          // Invalid JSON → should gracefully return []
          return DataProcessResult.success({
            text: 'NOT_VALID_JSON',
            model: 'claude-3',
            tokens_used: 50,
          });
        }
        return DataProcessResult.success({
          text: passingArbiterResponse,
          model: 'claude-3',
          tokens_used: 50,
        });
      }),
    };

    const tr = makeMockTeachingRound();
    const ctx = { ...baseCtx, inputs: { ...baseCtx.inputs, challengerRoles: ['IronRules'] } };
    const handler = new ConvergenceHandler(
      aiSpy as any,
      tr as any,
      mockDb as any,
      mockFreedomConfig as any,
    );
    const result = await handler.handle(ctx);

    expect(result.isSuccess).toBe(true);
    // No dynamic arbiters ran (uncovered = [] due to parse failure)
    const dynResults = result.data?.data?.['dynamicArbiterResults'] as any[];
    expect(dynResults).toEqual([]);
  });

  it('G4-CC: identifyUncoveredConcerns: includes prevCycleSummaries in prompt when provided', async () => {
    const mockFreedomConfig = {
      get: jest.fn().mockImplementation(async (key: string) => {
        if (key === 'xiigen.convergence.dynamicArbiters') return { value: true };
        return null;
      }),
    };

    let uncoveredPrompt = '';
    const aiSpy = {
      ...mockAi,
      generate: jest.fn().mockImplementation(async (prompt: string) => {
        if (prompt.includes('Identify which')) {
          uncoveredPrompt = prompt;
          return DataProcessResult.success({
            text: JSON.stringify({ uncovered: [] }),
            model: 'claude-3',
            tokens_used: 50,
          });
        }
        return DataProcessResult.success({
          text: passingArbiterResponse,
          model: 'claude-3',
          tokens_used: 50,
        });
      }),
    };

    const tr = makeMockTeachingRound();
    const ctx = {
      ...baseCtx,
      inputs: {
        ...baseCtx.inputs,
        challengerRoles: ['IronRules'],
        prevCycleSummaries: ['Step 1: Email uniqueness check', 'Step 2: Token generation'],
      },
    };
    const handler = new ConvergenceHandler(
      aiSpy as any,
      tr as any,
      mockDb as any,
      mockFreedomConfig as any,
    );
    await handler.handle(ctx);

    expect(uncoveredPrompt).toContain('Previous cycle decisions');
    expect(uncoveredPrompt).toContain('Email uniqueness check');
    expect(uncoveredPrompt).toContain('Token generation');
  });

  it('G4: dynamic arbiter BLOCK sets accepted=false and populates rejectionReason', async () => {
    const mockFreedomConfig = {
      get: jest.fn().mockImplementation(async (key: string) => {
        if (key === 'xiigen.convergence.dynamicArbiters') return { value: true };
        return null;
      }),
    };

    const aiSpy = {
      ...mockAi,
      generate: jest.fn().mockImplementation(async (prompt: string) => {
        if (prompt.includes('Identify which')) {
          return DataProcessResult.success({
            text: JSON.stringify({ uncovered: ['No typed models constraint'] }),
            model: 'claude-3',
            tokens_used: 50,
          });
        }
        if (prompt.includes('Evaluate whether')) {
          return DataProcessResult.success({
            text: JSON.stringify({ verdict: 'BLOCK', reason: 'Uses typed interfaces' }),
            model: 'claude-3',
            tokens_used: 50,
          });
        }
        return DataProcessResult.success({
          text: passingArbiterResponse,
          model: 'claude-3',
          tokens_used: 50,
        });
      }),
    };

    const tr = makeMockTeachingRound();
    const ctx = { ...baseCtx, inputs: { ...baseCtx.inputs, challengerRoles: ['IronRules'] } };
    const handler = new ConvergenceHandler(
      aiSpy as any,
      tr as any,
      mockDb as any,
      mockFreedomConfig as any,
    );
    const result = await handler.handle(ctx);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['accepted']).toBe(false);
    const rejectionReason = result.data?.data?.['rejectionReason'] as string;
    expect(rejectionReason).toContain('Dynamic arbiter BLOCK');
    expect(rejectionReason).toContain('No typed models constraint');
  });

  it('G4: dynamic arbiter CONCERN does not block — accepted stays true', async () => {
    const mockFreedomConfig = {
      get: jest.fn().mockImplementation(async (key: string) => {
        if (key === 'xiigen.convergence.dynamicArbiters') return { value: true };
        return null;
      }),
    };

    const aiSpy = {
      ...mockAi,
      generate: jest.fn().mockImplementation(async (prompt: string) => {
        if (prompt.includes('Identify which')) {
          return DataProcessResult.success({
            text: JSON.stringify({ uncovered: ['Some constraint'] }),
            model: 'claude-3',
            tokens_used: 50,
          });
        }
        if (prompt.includes('Evaluate whether')) {
          return DataProcessResult.success({
            text: JSON.stringify({ verdict: 'CONCERN', reason: 'Partial coverage' }),
            model: 'claude-3',
            tokens_used: 50,
          });
        }
        return DataProcessResult.success({
          text: passingArbiterResponse,
          model: 'claude-3',
          tokens_used: 50,
        });
      }),
    };

    const tr = makeMockTeachingRound(nodeJson, 9.0);
    const ctx = { ...baseCtx, inputs: { ...baseCtx.inputs, challengerRoles: ['IronRules'] } };
    const handler = new ConvergenceHandler(
      aiSpy as any,
      tr as any,
      mockDb as any,
      mockFreedomConfig as any,
    );
    const result = await handler.handle(ctx);

    expect(result.isSuccess).toBe(true);
    // CONCERN does not BLOCK → accepted should be true (if score >= threshold)
    expect(result.data?.data?.['accepted']).toBe(true);
  });

  it('G4: DNA-8: stores each dynamic arbiter evaluation to xiigen-dynamic-arbiter-results', async () => {
    const mockFreedomConfig = {
      get: jest.fn().mockImplementation(async (key: string) => {
        if (key === 'xiigen.convergence.dynamicArbiters') return { value: true };
        return null;
      }),
    };

    const db = {
      ...mockDb,
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };

    const aiSpy = {
      ...mockAi,
      generate: jest.fn().mockImplementation(async (prompt: string) => {
        if (prompt.includes('Identify which')) {
          return DataProcessResult.success({
            text: JSON.stringify({ uncovered: ['Constraint A', 'Constraint B'] }),
            model: 'claude-3',
            tokens_used: 50,
          });
        }
        if (prompt.includes('Evaluate whether')) {
          return DataProcessResult.success({
            text: JSON.stringify({ verdict: 'PASS', reason: 'OK' }),
            model: 'claude-3',
            tokens_used: 50,
          });
        }
        return DataProcessResult.success({
          text: passingArbiterResponse,
          model: 'claude-3',
          tokens_used: 50,
        });
      }),
    };

    const tr = makeMockTeachingRound();
    const ctx = { ...baseCtx, inputs: { ...baseCtx.inputs, challengerRoles: ['IronRules'] } };
    const handler = new ConvergenceHandler(
      aiSpy as any,
      tr as any,
      db as any,
      mockFreedomConfig as any,
    );
    await handler.handle(ctx);

    // 2 dynamic evaluations stored to xiigen-dynamic-arbiter-results
    const dynStoreCalls = (db.storeDocument as jest.Mock).mock.calls.filter(
      (call: unknown[]) => call[0] === 'xiigen-dynamic-arbiter-results',
    );
    expect(dynStoreCalls.length).toBe(2);
    expect(dynStoreCalls[0][1]).toMatchObject({
      concern: expect.any(String),
      verdict: expect.any(String),
      tenantId: 'acme',
      connectionType: 'FLOW_SCOPED',
    });
  });
});
