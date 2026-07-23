/**
 * Unit tests for DepthDecisionHandler — Cycle 3 Depth Decision
 * 12 tests following node-handlers.spec.ts pattern
 */

import 'reflect-metadata';
import { DataProcessResult } from '../../kernel/data-process-result';
import { NodeHandlerContext } from './node-handler.types';
import { DepthDecisionHandler } from './depth-decision.handler';

const baseContract: any = {
  taskTypeId: 'T47',
  archetype: 'SERVICE',
  ironRules: [],
  handlers: [],
  machineConstants: [],
};

const sampleVerifiedNode = {
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
    scoringCriteria: ['email uniqueness check passes'],
    acceptanceThreshold: 0.85,
    degradationAcceptable: false,
  },
};

const baseCtx: NodeHandlerContext = {
  contract: baseContract,
  runId: 'run-depth-1',
  flowId: 'FLOW-01',
  taskTypeId: 'T47',
  tenantId: 'acme',
  inputs: {
    verifiedNode: sampleVerifiedNode,
    currentDepth: 1,
    terminationDepth: 3,
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

const mockAi = {
  generate: jest.fn(),
  generateStructured: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
};

const leafResponse = JSON.stringify({
  verdict: 'LEAF',
  justification: 'Single-responsibility node — only one intent clause, no branches',
  signalsEvaluated: ['S1', 'S2', 'S3', 'S4', 'S5'],
  signalsTriggered: [],
  subFlowDecomposition: null,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockDb.storeDocument.mockResolvedValue(DataProcessResult.success({}));
  mockAi.generate.mockResolvedValue(
    DataProcessResult.success({ text: leafResponse, model: 'claude-3', tokens_used: 100 }),
  );
});

describe('DepthDecisionHandler', () => {
  it('returns LEAF immediately at terminationDepth — AI is NOT called', async () => {
    const handler = new DepthDecisionHandler(mockAi as any, mockDb as any);
    const ctx = {
      ...baseCtx,
      inputs: { ...baseCtx.inputs, currentDepth: 3, terminationDepth: 3 },
    };
    const result = await handler.handle(ctx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['verdict']).toBe('LEAF');
    expect(mockAi.generate).not.toHaveBeenCalled();
  });

  it('justification says "bound enforced" when termination bound applies', async () => {
    const handler = new DepthDecisionHandler(mockAi as any, mockDb as any);
    const ctx = {
      ...baseCtx,
      inputs: { ...baseCtx.inputs, currentDepth: 3, terminationDepth: 3 },
    };
    const result = await handler.handle(ctx);
    expect(result.data?.data?.['justification']).toContain('bound enforced');
  });

  it('terminationBoundApplied is true when depth === terminationDepth', async () => {
    const handler = new DepthDecisionHandler(mockAi as any, mockDb as any);
    const ctx = {
      ...baseCtx,
      inputs: { ...baseCtx.inputs, currentDepth: 3, terminationDepth: 3 },
    };
    const result = await handler.handle(ctx);
    expect(result.data?.data?.['terminationBoundApplied']).toBe(true);
  });

  it('calls AI when depth < terminationDepth', async () => {
    const handler = new DepthDecisionHandler(mockAi as any, mockDb as any);
    await handler.handle(baseCtx); // currentDepth=1, terminationDepth=3
    expect(mockAi.generate).toHaveBeenCalledTimes(1);
  });

  it('returns LEAF with signal evidence for simple single-responsibility NODE', async () => {
    mockAi.generate.mockResolvedValue(
      DataProcessResult.success({ text: leafResponse, model: 'claude-3', tokens_used: 100 }),
    );

    const handler = new DepthDecisionHandler(mockAi as any, mockDb as any);
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['verdict']).toBe('LEAF');
    expect((result.data?.data?.['signalsEvaluated'] as string[]).length).toBeGreaterThan(0);
  });

  it('returns EXPAND with sub-flow decomposition for multi-responsibility NODE', async () => {
    const expandResponse = JSON.stringify({
      verdict: 'EXPAND',
      justification: 'Multiple intent clauses detected — S1 triggered',
      signalsEvaluated: ['S1', 'S2', 'S3', 'S4', 'S5'],
      signalsTriggered: ['S1'],
      subFlowDecomposition: [
        { name: 'verify-email', intClause: 'verify their email', isDistinct: true },
        { name: 'send-onboarding', intClause: 'deliver onboarding', isDistinct: true },
      ],
    });
    mockAi.generate.mockResolvedValue(
      DataProcessResult.success({ text: expandResponse, model: 'claude-3', tokens_used: 100 }),
    );

    const handler = new DepthDecisionHandler(mockAi as any, mockDb as any);
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['verdict']).toBe('EXPAND');
    expect(result.data?.data?.['subFlowDecomposition']).toBeDefined();
  });

  it('grade = 0 when AI returns LEAF with no signal evaluation and no bound citation', async () => {
    const noSignalLeafResponse = JSON.stringify({
      verdict: 'LEAF',
      justification: 'simple step',
      signalsEvaluated: [],
      signalsTriggered: [],
      subFlowDecomposition: null,
    });
    mockAi.generate.mockResolvedValue(
      DataProcessResult.success({
        text: noSignalLeafResponse,
        model: 'claude-3',
        tokens_used: 100,
      }),
    );

    const handler = new DepthDecisionHandler(mockAi as any, mockDb as any);
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['grade']).toBe(0);
  });

  it('grade = 0 when AI returns EXPAND with no signal evidence', async () => {
    const noSignalExpandResponse = JSON.stringify({
      verdict: 'EXPAND',
      justification: 'complex',
      signalsEvaluated: [],
      signalsTriggered: [],
      subFlowDecomposition: [{ name: 'sub1', intClause: 'c1', isDistinct: true }],
    });
    mockAi.generate.mockResolvedValue(
      DataProcessResult.success({
        text: noSignalExpandResponse,
        model: 'claude-3',
        tokens_used: 100,
      }),
    );

    const handler = new DepthDecisionHandler(mockAi as any, mockDb as any);
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['grade']).toBe(0);
  });

  it('grade = 0 when EXPAND sub-nodes overlap (isDistinct = false)', async () => {
    const overlappingExpandResponse = JSON.stringify({
      verdict: 'EXPAND',
      justification: 'multiple clauses — S1 triggered',
      signalsEvaluated: ['S1', 'S2'],
      signalsTriggered: ['S1'],
      subFlowDecomposition: [
        { name: 'sub1', intClause: 'c1', isDistinct: false },
        { name: 'sub2', intClause: 'c1', isDistinct: false },
      ],
    });
    mockAi.generate.mockResolvedValue(
      DataProcessResult.success({
        text: overlappingExpandResponse,
        model: 'claude-3',
        tokens_used: 100,
      }),
    );

    const handler = new DepthDecisionHandler(mockAi as any, mockDb as any);
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['grade']).toBe(0);
  });

  it('grade = 1.0 when EXPAND sub-nodes are all distinct', async () => {
    const distinctExpandResponse = JSON.stringify({
      verdict: 'EXPAND',
      justification: 'multiple clauses — S1 triggered',
      signalsEvaluated: ['S1', 'S2', 'S3'],
      signalsTriggered: ['S1'],
      subFlowDecomposition: [
        { name: 'sub1', intClause: 'c1', isDistinct: true },
        { name: 'sub2', intClause: 'c2', isDistinct: true },
      ],
    });
    mockAi.generate.mockResolvedValue(
      DataProcessResult.success({
        text: distinctExpandResponse,
        model: 'claude-3',
        tokens_used: 100,
      }),
    );

    const handler = new DepthDecisionHandler(mockAi as any, mockDb as any);
    const result = await handler.handle(baseCtx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['grade']).toBe(1.0);
  });

  it('never throws — returns DataProcessResult.failure on AI error', async () => {
    mockAi.generate.mockResolvedValue(
      DataProcessResult.failure('AI_TIMEOUT', 'connection timed out'),
    );

    const handler = new DepthDecisionHandler(mockAi as any, mockDb as any);
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

  it('stores visibility record before emit (DNA-8)', async () => {
    const handler = new DepthDecisionHandler(mockAi as any, mockDb as any);
    const result = await handler.handle(baseCtx);

    expect(mockDb.storeDocument).toHaveBeenCalledWith(
      'xiigen-cycle-visibility',
      expect.objectContaining({ cycleType: 'CYCLE_3_DEPTH_DECISION' }),
      expect.any(String),
    );
    expect(mockDb.storeDocument).toHaveBeenCalledTimes(1);
    expect(result.isSuccess).toBe(true);
  });
});
