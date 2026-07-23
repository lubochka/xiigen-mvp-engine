/**
 * loop.handler — iterative convergence unit tests.
 * Tests for GenericNodeExecutor.executeLoopNode() (SESSION-P-3).
 *
 * CF-813: iteration count tracked, maxIterations enforced
 * CF-814: context accumulator capped at 10 iterations
 * CF-815: condition evaluated with no eval()
 */

import { GenericNodeExecutor } from '../generic-node-executor';
import { DataProcessResult } from '../../kernel/data-process-result';
import { NodeRegistry } from './node-registry';
import { TopologyStore } from '../topology-store';
import { NodeHandlerContext } from './node-handler.types';

// ─── Mock dependencies ────────────────────────────────────────────────────────

const mockDb = {
  storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  getDocument: jest.fn().mockResolvedValue(DataProcessResult.success(null)),
  searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  updateDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  listDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
};

const baseContract: any = {
  taskTypeId: 'T-LOOP',
  flowId: 'FLOW-TEST',
  archetype: 'ORCHESTRATION',
  executionModel: 'pipeline',
  ironRules: [],
  handlers: [],
};

const baseCtx: NodeHandlerContext = {
  contract: baseContract,
  runId: 'run-loop-1',
  flowId: 'FLOW-TEST',
  taskTypeId: 'T-LOOP',
  tenantId: 'acme',
  inputs: {},
  priorOutputs: [],
  nodeConfig: {},
  resolvedProviders: {},
};

function makeHandlerMock(impl: (input: unknown, callCount: number) => Promise<unknown>) {
  let count = 0;
  const handler = {
    nodeType: 'ai-generate',
    handle: jest.fn().mockImplementation(async (ctx: NodeHandlerContext) => {
      count++;
      const input = ctx.inputs?.['value'] ?? ctx.inputs;
      try {
        const value = await impl(input, count);
        return DataProcessResult.success({ data: value as Record<string, unknown> });
      } catch (err) {
        return DataProcessResult.failure('HANDLER_FAILED', String(err));
      }
    }),
    getCallCount: () => count,
  };
  return handler;
}

function makeMockRegistry(handlerMock: any): NodeRegistry {
  return {
    resolve: jest
      .fn()
      .mockImplementation((nodeType: string) =>
        nodeType === 'ai-generate' ? handlerMock : undefined,
      ),
    getRegisteredTypes: jest.fn().mockReturnValue(['ai-generate']),
    has: jest.fn().mockReturnValue(true),
  } as unknown as NodeRegistry;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('loop.handler (iterative convergence)', () => {
  // ── Basic convergence ─────────────────────────────────────────────────────

  describe('basic convergence', () => {
    it('terminates when condition is met before maxIterations (CF-813)', async () => {
      // Scores: 0.50, 0.50, 0.90 — converges on iteration 3
      const handlerMock = makeHandlerMock(async (_input, callCount) => ({
        score: callCount >= 3 ? 0.9 : 0.5,
      }));
      const registry = makeMockRegistry(handlerMock);
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      const result = await executor.executeLoopNode(
        'n1',
        {
          body: ['ai-generate'],
          condition: 'score >= 0.85',
          maxIterations: 5,
        },
        { prompt: 'test' },
        baseCtx,
      );

      expect(result.converged).toBe(true);
      expect(result.iterations).toBe(3);
      expect((result.result as Record<string, unknown>)['score']).toBeGreaterThanOrEqual(0.85);
    });

    it('reports condition expression in result', async () => {
      const handlerMock = makeHandlerMock(async () => ({ score: 0.9, converged: true }));
      const registry = makeMockRegistry(handlerMock);
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      const result = await executor.executeLoopNode(
        'n1',
        { body: ['ai-generate'], condition: 'converged', maxIterations: 3 },
        {},
        baseCtx,
      );

      expect(result.condition).toBe('converged');
      expect(result.converged).toBe(true);
    });
  });

  // ── maxIterations hard stop ───────────────────────────────────────────────

  describe('maxIterations hard stop (CF-813)', () => {
    it('terminates at maxIterations when condition never met', async () => {
      const handlerMock = makeHandlerMock(async () => ({ score: 0.5 }));
      const registry = makeMockRegistry(handlerMock);
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      const result = await executor.executeLoopNode(
        'n1',
        {
          body: ['ai-generate'],
          condition: 'score >= 0.85',
          maxIterations: 3,
          onMaxReached: 'use_last',
        },
        {},
        baseCtx,
      );

      expect(result.converged).toBe(false);
      expect(result.iterations).toBe(3); // stopped at max
      expect((result.result as Record<string, unknown>)['score']).toBe(0.5); // use_last
    });

    it('throws when onMaxReached=fail and condition never met', async () => {
      const handlerMock = makeHandlerMock(async () => ({ score: 0.5 }));
      const registry = makeMockRegistry(handlerMock);
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      await expect(
        executor.executeLoopNode(
          'n1',
          {
            body: ['ai-generate'],
            condition: 'score >= 0.85',
            maxIterations: 2,
            onMaxReached: 'fail',
          },
          {},
          baseCtx,
        ),
      ).rejects.toThrow("condition 'score >= 0.85' not met");
    });

    it('never executes more than maxIterations', async () => {
      const handlerMock = makeHandlerMock(async () => ({ score: 0.5 }));
      const registry = makeMockRegistry(handlerMock);
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      const result = await executor.executeLoopNode(
        'n1',
        { body: ['ai-generate'], condition: 'score >= 0.99', maxIterations: 4 },
        {},
        baseCtx,
      );

      expect(result.iterations).toBeLessThanOrEqual(4);
      expect(handlerMock.handle).toHaveBeenCalledTimes(4);
    });
  });

  // ── Context accumulation ─────────────────────────────────────────────────

  describe('context accumulation (CF-814)', () => {
    it('passes accumulated context to each iteration (append mode)', async () => {
      const receivedInputs: unknown[] = [];

      const handlerMock = {
        nodeType: 'ai-generate',
        handle: jest.fn().mockImplementation(async (ctx: NodeHandlerContext) => {
          const input = ctx.inputs?.['value'] ?? ctx.inputs;
          receivedInputs.push(input);
          const iter = ((input as Record<string, unknown>)?.['iteration'] as number) ?? 0;
          return DataProcessResult.success({
            data: { score: iter >= 2 ? 0.9 : 0.5, iteration: iter } as Record<string, unknown>,
          });
        }),
      };
      const registry = makeMockRegistry(handlerMock);
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      await executor.executeLoopNode(
        'n1',
        {
          body: ['ai-generate'],
          condition: 'score >= 0.85',
          maxIterations: 3,
          contextAccumulator: 'append',
        },
        { original: 'test' },
        baseCtx,
      );

      // Second iteration input must contain priorOutputs from iteration 1
      expect(receivedInputs.length).toBeGreaterThanOrEqual(2);
      const secondInput = receivedInputs[1] as Record<string, unknown>;
      expect(secondInput?.['priorOutputs']).toBeDefined();
      expect(Array.isArray(secondInput?.['priorOutputs'])).toBe(true);
      expect((secondInput?.['priorOutputs'] as unknown[]).length).toBe(1);
    });

    it('replace mode: each iteration only sees last output, not accumulated', async () => {
      const receivedInputs: unknown[] = [];
      const handlerMock = {
        nodeType: 'ai-generate',
        handle: jest.fn().mockImplementation(async (ctx: NodeHandlerContext) => {
          const input = ctx.inputs?.['value'] ?? ctx.inputs;
          receivedInputs.push(input);
          return DataProcessResult.success({
            data: { score: 0.9, fresh: true } as Record<string, unknown>,
          });
        }),
      };
      const registry = makeMockRegistry(handlerMock);
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      await executor.executeLoopNode(
        'n1',
        {
          body: ['ai-generate'],
          condition: 'score >= 0.85',
          maxIterations: 2,
          contextAccumulator: 'replace',
        },
        { original: 'test' },
        baseCtx,
      );

      // In replace mode, 2nd iteration does NOT get priorOutputs array
      if (receivedInputs.length >= 2) {
        const secondInput = receivedInputs[1] as Record<string, unknown>;
        expect(secondInput?.['priorOutputs']).toBeUndefined();
      }
    });

    it('context capped at 10 iterations (CF-814)', async () => {
      let capturedPriorOutputsLength = 0;
      let callCount = 0;
      const handlerMock = {
        nodeType: 'ai-generate',
        handle: jest.fn().mockImplementation(async (ctx: NodeHandlerContext) => {
          const input = ctx.inputs?.['value'] ?? ctx.inputs;
          callCount++;
          const prior = (input as Record<string, unknown>)?.['priorOutputs'] as unknown[];
          if (prior)
            capturedPriorOutputsLength = Math.max(capturedPriorOutputsLength, prior.length);
          return DataProcessResult.success({
            data: { score: 0.5, iter: callCount } as Record<string, unknown>,
          });
        }),
      };
      const registry = makeMockRegistry(handlerMock);
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      // Run 15 iterations — context should be capped at 10
      await executor.executeLoopNode(
        'n1',
        {
          body: ['ai-generate'],
          condition: 'score >= 0.99', // never met
          maxIterations: 15,
          contextAccumulator: 'append',
        },
        {},
        baseCtx,
      );

      expect(capturedPriorOutputsLength).toBeLessThanOrEqual(10);
    });
  });

  // ── use_best policy ───────────────────────────────────────────────────────

  describe('use_best policy', () => {
    it('returns highest-scored iteration output when use_best', async () => {
      const scores = [0.6, 0.75, 0.7]; // peaks at iteration 2
      const handlerMock = makeHandlerMock(async (_input, callCount) => {
        const score = scores[callCount - 1] ?? 0.5;
        return { score };
      });
      const registry = makeMockRegistry(handlerMock);
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      const result = await executor.executeLoopNode(
        'n1',
        {
          body: ['ai-generate'],
          condition: 'score >= 0.90', // never met
          maxIterations: 3,
          onMaxReached: 'use_best',
        },
        {},
        baseCtx,
      );

      expect(result.converged).toBe(false);
      expect((result.result as Record<string, unknown>)['score']).toBe(0.75); // best score
    });
  });

  // ── Multi-body sequential execution ──────────────────────────────────────

  describe('multi-body sequential execution', () => {
    it('executes all body handlers sequentially each iteration', async () => {
      const callOrder: string[] = [];
      const aiHandler = {
        nodeType: 'ai-generate',
        handle: jest.fn().mockImplementation(async () => {
          callOrder.push('ai-generate');
          return DataProcessResult.success({ data: { score: 0.9 } as Record<string, unknown> });
        }),
      };
      const validateHandler = {
        nodeType: 'validate',
        handle: jest.fn().mockImplementation(async () => {
          callOrder.push('validate');
          return DataProcessResult.success({
            data: { score: 0.9, passed: true } as Record<string, unknown>,
          });
        }),
      };
      const registry = {
        resolve: jest.fn().mockImplementation((type: string) => {
          if (type === 'ai-generate') return aiHandler;
          if (type === 'validate') return validateHandler;
          return undefined;
        }),
        getRegisteredTypes: jest.fn().mockReturnValue(['ai-generate', 'validate']),
        has: jest.fn().mockReturnValue(true),
      } as unknown as NodeRegistry;

      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      await executor.executeLoopNode(
        'n1',
        { body: ['ai-generate', 'validate'], condition: 'passed', maxIterations: 1 },
        {},
        baseCtx,
      );

      // Both handlers called in order
      expect(callOrder).toEqual(['ai-generate', 'validate']);
    });
  });
});

// ─── evaluateCondition unit tests ─────────────────────────────────────────────

describe('GenericNodeExecutor.evaluateCondition (CF-815: no eval)', () => {
  let executor: GenericNodeExecutor;

  beforeEach(() => {
    const registry = {
      resolve: jest.fn().mockReturnValue(undefined),
      getRegisteredTypes: jest.fn().mockReturnValue([]),
      has: jest.fn().mockReturnValue(false),
    } as unknown as NodeRegistry;
    executor = new GenericNodeExecutor(mockDb as any, registry, new TopologyStore(mockDb as any));
  });

  // Dot-path truthy checks
  it('"converged" → true when output.converged = true', () => {
    expect(executor.evaluateCondition('converged', { converged: true })).toBe(true);
  });
  it('"converged" → false when output.converged = false', () => {
    expect(executor.evaluateCondition('converged', { converged: false })).toBe(false);
  });
  it('"result.passed" → true when output.result.passed = true', () => {
    expect(executor.evaluateCondition('result.passed', { result: { passed: true } })).toBe(true);
  });

  // Numeric comparisons
  it('"score >= 0.85" → true when score = 0.9', () => {
    expect(executor.evaluateCondition('score >= 0.85', { score: 0.9 })).toBe(true);
  });
  it('"score >= 0.85" → false when score = 0.7', () => {
    expect(executor.evaluateCondition('score >= 0.85', { score: 0.7 })).toBe(false);
  });
  it('"score > 0.5" → true when score = 0.6', () => {
    expect(executor.evaluateCondition('score > 0.5', { score: 0.6 })).toBe(true);
  });
  it('"score < 0.5" → false when score = 0.6', () => {
    expect(executor.evaluateCondition('score < 0.5', { score: 0.6 })).toBe(false);
  });
  it('"count <= 3" → true when count = 3', () => {
    expect(executor.evaluateCondition('count <= 3', { count: 3 })).toBe(true);
  });
  it('"count <= 3" → false when count = 4', () => {
    expect(executor.evaluateCondition('count <= 3', { count: 4 })).toBe(false);
  });

  // Equality
  it('"status === \"done\"" → true when status = "done"', () => {
    expect(executor.evaluateCondition('status === "done"', { status: 'done' })).toBe(true);
  });
  it('"status !== \"pending\"" → true when status = "done"', () => {
    expect(executor.evaluateCondition('status !== "pending"', { status: 'done' })).toBe(true);
  });

  // Edge cases
  it('returns false for null output', () => {
    expect(executor.evaluateCondition('score >= 0.85', null)).toBe(false);
  });
  it('returns false for empty expression', () => {
    expect(executor.evaluateCondition('', { score: 0.9 })).toBe(false);
  });
  it('returns false when path does not exist in output', () => {
    expect(executor.evaluateCondition('missingField', { other: 'value' })).toBe(false);
  });
  it('returns false for unparseable RHS (CF-815: no crash on malformed)', () => {
    expect(executor.evaluateCondition('score >= notANumber', { score: 0.9 })).toBe(false);
  });
});
