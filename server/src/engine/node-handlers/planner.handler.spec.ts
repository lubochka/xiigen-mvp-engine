/**
 * Unit tests for PlannerHandler — Cycle 1 AI Planning
 * 13 tests following the pattern from node-handlers.spec.ts
 */

import 'reflect-metadata';
import { DataProcessResult } from '../../kernel/data-process-result';
import { NodeHandlerContext } from './node-handler.types';
import { PlannerHandler } from './planner.handler';

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
  runId: 'run-planner-1',
  flowId: 'FLOW-01',
  taskTypeId: 'T47',
  tenantId: 'acme',
  inputs: {
    userIntent: 'When a user registers, verify their email and deliver onboarding',
    constraints: ['No typed models', 'No throw for business logic'],
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

const cleanPlannerResponse = JSON.stringify({
  steps: [
    {
      index: 1,
      text: 'Confirm the email address is not already registered',
      intClause: 'registers',
      dependencies: [],
    },
    {
      index: 2,
      text: 'Send a verification message to the provided address',
      intClause: 'verify their email',
      dependencies: [1],
    },
    {
      index: 3,
      text: 'Grant access after the address is confirmed',
      intClause: 'verify their email',
      dependencies: [2],
    },
    {
      index: 4,
      text: 'Provide workspace setup materials',
      intClause: 'deliver onboarding',
      dependencies: [3],
    },
    {
      index: 5,
      text: 'Send the first tutorial to the member',
      intClause: 'deliver onboarding',
      dependencies: [3],
    },
  ],
});

const passingReviewerResponse = JSON.stringify({
  coverage: [
    { clause: 'registers', verdict: 'COVERED', step: 1 },
    { clause: 'verify their email', verdict: 'COVERED', step: 2 },
    { clause: 'deliver onboarding', verdict: 'COVERED', step: 4 },
  ],
  abstractionViolations: [],
  responsibilityFlags: [],
  dependencyGaps: [],
});

const mockAi = {
  generate: jest.fn(),
  generateStructured: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.storeDocument.mockResolvedValue(DataProcessResult.success({}));
  // Default: planner call returns clean steps, reviewer returns passing review
  mockAi.generate
    .mockResolvedValueOnce(
      DataProcessResult.success({
        text: cleanPlannerResponse,
        model: 'claude-3',
        tokens_used: 100,
      }),
    )
    .mockResolvedValueOnce(
      DataProcessResult.success({
        text: passingReviewerResponse,
        model: 'claude-3',
        tokens_used: 50,
      }),
    );
});

describe('PlannerHandler', () => {
  it('returns failure if userIntent is empty', async () => {
    const handler = new PlannerHandler(mockAi as any, mockDb as any);
    const ctx = { ...baseCtx, inputs: { ...baseCtx.inputs, userIntent: '' } };
    const result = await handler.handle(ctx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PLANNER_MISSING_INTENT');
  });

  it('returns failure if constraints is empty', async () => {
    const handler = new PlannerHandler(mockAi as any, mockDb as any);
    const ctx = { ...baseCtx, inputs: { ...baseCtx.inputs, constraints: [] } };
    const result = await handler.handle(ctx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PLANNER_MISSING_CONSTRAINTS');
  });

  it('calls plannerAI with assembled context package', async () => {
    const handler = new PlannerHandler(mockAi as any, mockDb as any);
    await handler.handle(baseCtx);
    expect(mockAi.generate).toHaveBeenCalledWith(
      expect.stringContaining('When a user registers'),
      expect.objectContaining({ systemPrompt: expect.stringContaining('QUESTION YOURSELF') }),
    );
  });

  it('calls reviewerAI with plan steps and original intent', async () => {
    const handler = new PlannerHandler(mockAi as any, mockDb as any);
    await handler.handle(baseCtx);
    // Second call to generate is the reviewer
    expect(mockAi.generate).toHaveBeenCalledTimes(2);
    const secondCallArgs = mockAi.generate.mock.calls[1];
    expect(secondCallArgs[0]).toContain('When a user registers');
  });

  it('returns PlannerOutput with grade when plan passes review', async () => {
    const handler = new PlannerHandler(mockAi as any, mockDb as any);
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['planSteps']).toBeDefined();
    expect(result.data?.data?.['grade']).toBeDefined();
    expect(typeof result.data?.data?.['grade']).toBe('number');
  });

  it('grade is 1.0 when all checks pass', async () => {
    mockAi.generate.mockReset();
    mockDb.storeDocument.mockResolvedValue(DataProcessResult.success({}));
    const perfectReviewerResponse = JSON.stringify({
      coverage: [{ clause: 'c1', verdict: 'COVERED', step: 1 }],
      abstractionViolations: [],
      responsibilityFlags: [],
      dependencyGaps: [],
    });
    mockAi.generate
      .mockResolvedValueOnce(
        DataProcessResult.success({
          text: cleanPlannerResponse,
          model: 'claude-3',
          tokens_used: 100,
        }),
      )
      .mockResolvedValueOnce(
        DataProcessResult.success({
          text: perfectReviewerResponse,
          model: 'claude-3',
          tokens_used: 50,
        }),
      );

    const handler = new PlannerHandler(mockAi as any, mockDb as any);
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['grade']).toBe(1.0);
  });

  it('grade is below threshold when abstraction violation found (weighted: 0.65)', async () => {
    // Option C weighted formula: abstraction=0 → grade = 1×0.40 + 0×0.35 + 1×0.15 + 1×0.10 = 0.65
    mockAi.generate.mockReset();
    mockDb.storeDocument.mockResolvedValue(DataProcessResult.success({}));
    const abstractionViolationResponse = JSON.stringify({
      coverage: [{ clause: 'c1', verdict: 'COVERED', step: 1 }],
      abstractionViolations: ['step 1: NestJS found'],
      responsibilityFlags: [],
      dependencyGaps: [],
    });
    mockAi.generate
      .mockResolvedValueOnce(
        DataProcessResult.success({
          text: cleanPlannerResponse,
          model: 'claude-3',
          tokens_used: 100,
        }),
      )
      .mockResolvedValueOnce(
        DataProcessResult.success({
          text: abstractionViolationResponse,
          model: 'claude-3',
          tokens_used: 50,
        }),
      );

    const handler = new PlannerHandler(mockAi as any, mockDb as any);
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);
    const grade = result.data?.data?.['grade'] as number;
    expect(grade).toBeCloseTo(0.65, 5); // 0.40 + 0 + 0.15 + 0.10
    expect(grade).toBeLessThan(0.85); // rejected
  });

  it('grade stays above threshold when only dependency gap found (weighted: 0.90)', async () => {
    // Option C weighted formula: dependency=0 → grade = 1×0.40 + 1×0.35 + 1×0.15 + 0×0.10 = 0.90
    // Design intent: missing dep notation alone (format issue) should not kill a good plan.
    // Once Option B prompt fix takes effect, the planner declares deps → dependency=1 → grade=1.0.
    mockAi.generate.mockReset();
    mockDb.storeDocument.mockResolvedValue(DataProcessResult.success({}));
    const depGapResponse = JSON.stringify({
      coverage: [{ clause: 'c1', verdict: 'COVERED', step: 1 }],
      abstractionViolations: [],
      responsibilityFlags: [],
      dependencyGaps: ['step 2: depends on step 3 which is not declared'],
    });
    mockAi.generate
      .mockResolvedValueOnce(
        DataProcessResult.success({
          text: cleanPlannerResponse,
          model: 'claude-3',
          tokens_used: 100,
        }),
      )
      .mockResolvedValueOnce(
        DataProcessResult.success({ text: depGapResponse, model: 'claude-3', tokens_used: 50 }),
      );

    const handler = new PlannerHandler(mockAi as any, mockDb as any);
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);
    const grade = result.data?.data?.['grade'] as number;
    expect(grade).toBeCloseTo(0.9, 5); // 0.40 + 0.35 + 0.15 + 0
    expect(grade).toBeGreaterThanOrEqual(0.85); // accepted — format issue, not correctness
  });

  it('grade drops proportionally for PARTIAL coverage', async () => {
    mockAi.generate.mockReset();
    mockDb.storeDocument.mockResolvedValue(DataProcessResult.success({}));
    const partialCoverageResponse = JSON.stringify({
      coverage: [
        { clause: 'registers', verdict: 'COVERED', step: 1 },
        { clause: 'verify their email', verdict: 'PARTIAL', step: 2 },
        { clause: 'deliver onboarding', verdict: 'COVERED', step: 4 },
      ],
      abstractionViolations: [],
      responsibilityFlags: [],
      dependencyGaps: [],
    });
    mockAi.generate
      .mockResolvedValueOnce(
        DataProcessResult.success({
          text: cleanPlannerResponse,
          model: 'claude-3',
          tokens_used: 100,
        }),
      )
      .mockResolvedValueOnce(
        DataProcessResult.success({
          text: partialCoverageResponse,
          model: 'claude-3',
          tokens_used: 50,
        }),
      );

    const handler = new PlannerHandler(mockAi as any, mockDb as any);
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);
    const grade = result.data?.data?.['grade'] as number;
    expect(grade).toBeGreaterThan(0);
    expect(grade).toBeLessThan(1);
  });

  it('accepted is false when grade < gradeThreshold', async () => {
    mockAi.generate.mockReset();
    mockDb.storeDocument.mockResolvedValue(DataProcessResult.success({}));
    const lowGradeResponse = JSON.stringify({
      coverage: [{ clause: 'c1', verdict: 'MISSING', step: 0 }],
      abstractionViolations: [],
      responsibilityFlags: [],
      dependencyGaps: [],
    });
    mockAi.generate
      .mockResolvedValueOnce(
        DataProcessResult.success({
          text: cleanPlannerResponse,
          model: 'claude-3',
          tokens_used: 100,
        }),
      )
      .mockResolvedValueOnce(
        DataProcessResult.success({ text: lowGradeResponse, model: 'claude-3', tokens_used: 50 }),
      );

    const handler = new PlannerHandler(mockAi as any, mockDb as any);
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['accepted']).toBe(false);
  });

  it('never throws — returns DataProcessResult.failure on AI error', async () => {
    mockAi.generate.mockReset();
    mockDb.storeDocument.mockResolvedValue(DataProcessResult.success({}));
    mockAi.generate.mockResolvedValue(
      DataProcessResult.failure('AI_TIMEOUT', 'connection timed out'),
    );

    const handler = new PlannerHandler(mockAi as any, mockDb as any);
    let result: DataProcessResult<any> | undefined;
    let threw = false;
    try {
      result = await handler.handle(baseCtx);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    expect(result?.isSuccess).toBe(false);
  });

  it('stores visibility record before any downstream emit (DNA-8)', async () => {
    mockAi.generate.mockReset();
    mockDb.storeDocument.mockResolvedValue(DataProcessResult.success({}));
    mockAi.generate
      .mockResolvedValueOnce(
        DataProcessResult.success({
          text: cleanPlannerResponse,
          model: 'claude-3',
          tokens_used: 100,
        }),
      )
      .mockResolvedValueOnce(
        DataProcessResult.success({
          text: passingReviewerResponse,
          model: 'claude-3',
          tokens_used: 50,
        }),
      );

    const handler = new PlannerHandler(mockAi as any, mockDb as any);
    const result = await handler.handle(baseCtx);

    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-cycle-visibility',
      expect.objectContaining({ cycleType: 'CYCLE_1_PLANNER' }),
      expect.any(String),
    );
    // storeDocument must have been called before result returned
    expect(mockDb.storeDocument).toHaveBeenCalledTimes(1);
    expect(result.isSuccess).toBe(true);
  });

  it('retries once if planner output contains technology names', async () => {
    mockAi.generate.mockReset();
    mockDb.storeDocument.mockResolvedValue(DataProcessResult.success({}));

    const techNamePlanResponse = JSON.stringify({
      steps: [
        {
          index: 1,
          text: 'Set up a NestJS service to handle the registration',
          intClause: 'registers',
          dependencies: [],
        },
      ],
    });

    mockAi.generate
      .mockResolvedValueOnce(
        DataProcessResult.success({
          text: techNamePlanResponse,
          model: 'claude-3',
          tokens_used: 100,
        }),
      )
      .mockResolvedValueOnce(
        DataProcessResult.success({
          text: cleanPlannerResponse,
          model: 'claude-3',
          tokens_used: 100,
        }),
      )
      .mockResolvedValueOnce(
        DataProcessResult.success({
          text: passingReviewerResponse,
          model: 'claude-3',
          tokens_used: 50,
        }),
      );

    const handler = new PlannerHandler(mockAi as any, mockDb as any);
    await handler.handle(baseCtx);

    // First call = planner (returns tech names), second call = retry, third call = reviewer
    expect(mockAi.generate).toHaveBeenCalledTimes(3);
  });
});
