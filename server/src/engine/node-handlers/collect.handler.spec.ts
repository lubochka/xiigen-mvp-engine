/**
 * collect.handler — fan-out/fan-in unit tests.
 * Tests are for GenericNodeExecutor.executeCollectNode() (SESSION-P-2).
 *
 * CF-810: must not block event loop while waiting
 * CF-811: each branch runs in isolated context
 * CF-812: result includes successCount and failureCount
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
  taskTypeId: 'T-COLLECT',
  flowId: 'FLOW-TEST',
  archetype: 'ORCHESTRATION',
  executionModel: 'pipeline',
  ironRules: [],
  handlers: [],
};

const baseCtx: NodeHandlerContext = {
  contract: baseContract,
  runId: 'run-collect-1',
  flowId: 'FLOW-TEST',
  taskTypeId: 'T-COLLECT',
  tenantId: 'acme',
  inputs: {},
  priorOutputs: [],
  nodeConfig: {},
  resolvedProviders: {},
};

// Build a handler mock that resolves or rejects based on input
function makeHandlerMock(impl: (input: unknown) => Promise<unknown>) {
  return {
    nodeType: 'ai-generate',
    handle: jest.fn().mockImplementation(async (ctx: NodeHandlerContext) => {
      const input = ctx.inputs?.['value'] ?? ctx.inputs;
      try {
        const value = await impl(input);
        return DataProcessResult.success({ data: value as Record<string, unknown> });
      } catch (err) {
        return DataProcessResult.failure('BRANCH_FAILED', String(err));
      }
    }),
  };
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

describe('collect.handler (fan-out/fan-in)', () => {
  // ── Basic fan-out/fan-in ──────────────────────────────────────────────────

  describe('basic fan-out/fan-in', () => {
    it('collects 3 parallel results into array', async () => {
      const handlerMock = makeHandlerMock(async (input) => ({ result: `processed-${input}` }));
      const registry = makeMockRegistry(handlerMock);
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      const result = await executor.executeCollectNode(
        'n1',
        {
          fanOut: { source: 'inputArray', handler: 'ai-generate' },
          fanIn: { merge: 'array', timeout: 5000 },
        },
        ['a', 'b', 'c'],
        baseCtx,
      );

      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
      expect(Array.isArray(result.collected)).toBe(true);
      expect((result.collected as unknown[]).length).toBe(3);
    });

    it('passes each item as isolated input to its branch (CF-811)', async () => {
      const receivedInputs: unknown[] = [];
      const handlerMock = makeHandlerMock(async (input) => {
        receivedInputs.push(input);
        return { result: input };
      });
      const registry = makeMockRegistry(handlerMock);
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      await executor.executeCollectNode(
        'n1',
        {
          fanOut: { source: 'inputArray', handler: 'ai-generate' },
          fanIn: { merge: 'array' },
        },
        ['x', 'y', 'z'],
        baseCtx,
      );

      // All 3 items were passed to handler (CF-811: isolated contexts)
      expect(receivedInputs).toHaveLength(3);
    });

    it('result includes successCount, failureCount, failures (CF-812)', async () => {
      const handlerMock = makeHandlerMock(async (input) => ({ result: input }));
      const registry = makeMockRegistry(handlerMock);
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      const result = await executor.executeCollectNode(
        'n1',
        {
          fanOut: { source: 'inputArray', handler: 'ai-generate' },
          fanIn: { merge: 'array' },
        },
        ['a', 'b'],
        baseCtx,
      );

      expect(result).toHaveProperty('successCount');
      expect(result).toHaveProperty('failureCount');
      expect(result).toHaveProperty('failures');
      expect(Array.isArray(result.failures)).toBe(true);
    });
  });

  // ── Partial failure resilience (use_available) ───────────────────────────

  describe('partial failure resilience (use_available)', () => {
    it('returns 2 results when 1 of 3 branches fails', async () => {
      let callCount = 0;
      const handlerMock = makeHandlerMock(async (input) => {
        callCount++;
        if (callCount === 2) throw new Error('branch failed');
        return { result: `ok-${input}` };
      });
      const registry = makeMockRegistry(handlerMock);
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      const result = await executor.executeCollectNode(
        'n1',
        {
          fanOut: { source: 'inputArray', handler: 'ai-generate' },
          fanIn: { merge: 'array', partialFailurePolicy: 'use_available' },
        },
        ['a', 'b', 'c'],
        baseCtx,
      );

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.failures[0].reason).toContain('branch failed');
    });

    it('use_available is the default policy', async () => {
      let callCount = 0;
      const handlerMock = makeHandlerMock(async () => {
        callCount++;
        if (callCount === 1) throw new Error('first failed');
        return { result: 'ok' };
      });
      const registry = makeMockRegistry(handlerMock);
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      // No partialFailurePolicy specified — should default to use_available
      const result = await executor.executeCollectNode(
        'n1',
        {
          fanOut: { source: 'inputArray', handler: 'ai-generate' },
          fanIn: { merge: 'array' },
        },
        ['a', 'b'],
        baseCtx,
      );

      // Should NOT throw; should return partial result
      expect(result.successCount).toBe(1);
      expect(result.failureCount).toBe(1);
    });
  });

  // ── fail_all policy ───────────────────────────────────────────────────────

  describe('fail_all policy', () => {
    it('throws when any branch fails with fail_all policy', async () => {
      let callCount = 0;
      const handlerMock = makeHandlerMock(async () => {
        callCount++;
        if (callCount === 1) throw new Error('branch error');
        return { result: 'ok' };
      });
      const registry = makeMockRegistry(handlerMock);
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      await expect(
        executor.executeCollectNode(
          'n1',
          {
            fanOut: { source: 'inputArray', handler: 'ai-generate' },
            fanIn: { merge: 'array', partialFailurePolicy: 'fail_all' },
          },
          ['a', 'b'],
          baseCtx,
        ),
      ).rejects.toThrow('branches failed');
    });

    it('does not throw when all branches succeed with fail_all policy', async () => {
      const handlerMock = makeHandlerMock(async (input) => ({ result: input }));
      const registry = makeMockRegistry(handlerMock);
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      const result = await executor.executeCollectNode(
        'n1',
        {
          fanOut: { source: 'inputArray', handler: 'ai-generate' },
          fanIn: { merge: 'array', partialFailurePolicy: 'fail_all' },
        },
        ['a', 'b', 'c'],
        baseCtx,
      );

      expect(result.successCount).toBe(3);
      expect(result.failureCount).toBe(0);
    });
  });

  // ── maxParallel batching ───────────────────────────────────────────────────

  describe('maxParallel batching', () => {
    it('processes 5 items when maxParallel=2', async () => {
      const processedInputs: unknown[] = [];
      const handlerMock = makeHandlerMock(async (input) => {
        processedInputs.push(input);
        return { result: input };
      });
      const registry = makeMockRegistry(handlerMock);
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      const result = await executor.executeCollectNode(
        'n1',
        {
          fanOut: { source: 'inputArray', handler: 'ai-generate', maxParallel: 2 },
          fanIn: { merge: 'array' },
        },
        [1, 2, 3, 4, 5],
        baseCtx,
      );

      expect(result.successCount).toBe(5);
      expect(processedInputs).toHaveLength(5);
    });

    it('processes all items when maxParallel=1 (sequential)', async () => {
      const processedOrder: unknown[] = [];
      const handlerMock = makeHandlerMock(async (input) => {
        processedOrder.push(input);
        return { result: input };
      });
      const registry = makeMockRegistry(handlerMock);
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      const result = await executor.executeCollectNode(
        'n1',
        {
          fanOut: { source: 'inputArray', handler: 'ai-generate', maxParallel: 1 },
          fanIn: { merge: 'array' },
        },
        ['first', 'second', 'third'],
        baseCtx,
      );

      expect(result.successCount).toBe(3);
      expect(processedOrder).toEqual(['first', 'second', 'third']);
    });
  });

  // ── Merge strategies ──────────────────────────────────────────────────────

  describe('merge strategies', () => {
    it('merge=array: results are concatenated into an array', async () => {
      const handlerMock = makeHandlerMock(async (input) => ({ item: input }));
      const registry = makeMockRegistry(handlerMock);
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      const result = await executor.executeCollectNode(
        'n1',
        {
          fanOut: { source: 'inputArray', handler: 'ai-generate' },
          fanIn: { merge: 'array' },
        },
        ['a', 'b'],
        baseCtx,
      );

      expect(Array.isArray(result.collected)).toBe(true);
      expect((result.collected as unknown[]).length).toBe(2);
    });

    it('merge=object: results are deep-merged into a single object', async () => {
      let callIdx = 0;
      const handlerMock = makeHandlerMock(async () => {
        callIdx++;
        return { [`key${callIdx}`]: `value${callIdx}` };
      });
      const registry = makeMockRegistry(handlerMock);
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      const result = await executor.executeCollectNode(
        'n1',
        {
          fanOut: { source: 'inputArray', handler: 'ai-generate' },
          fanIn: { merge: 'object' },
        },
        ['a', 'b'],
        baseCtx,
      );

      expect(result.collected).toMatchObject({ key1: 'value1', key2: 'value2' });
    });
  });

  // ── Error: unknown handler ─────────────────────────────────────────────────

  describe('error handling', () => {
    it('records unregistered handler as failure with use_available policy', async () => {
      const registry = {
        resolve: jest.fn().mockReturnValue(undefined),
        getRegisteredTypes: jest.fn().mockReturnValue([]),
        has: jest.fn().mockReturnValue(false),
      } as unknown as NodeRegistry;
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      // use_available (default): branch error captured as failure, not thrown
      const result = await executor.executeCollectNode(
        'n1',
        {
          fanOut: { source: 'inputArray', handler: 'unknown-handler' },
          fanIn: { merge: 'array', partialFailurePolicy: 'use_available' },
        },
        ['a'],
        baseCtx,
      );

      expect(result.failureCount).toBe(1);
      expect(result.successCount).toBe(0);
      expect(result.failures[0].reason).toContain("no handler registered for 'unknown-handler'");
    });

    it('throws when handler type is not registered with fail_all policy', async () => {
      const registry = {
        resolve: jest.fn().mockReturnValue(undefined),
        getRegisteredTypes: jest.fn().mockReturnValue([]),
        has: jest.fn().mockReturnValue(false),
      } as unknown as NodeRegistry;
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      await expect(
        executor.executeCollectNode(
          'n1',
          {
            fanOut: { source: 'inputArray', handler: 'unknown-handler' },
            fanIn: { merge: 'array', partialFailurePolicy: 'fail_all' },
          },
          ['a'],
          baseCtx,
        ),
      ).rejects.toThrow('branches failed');
    });
  });

  // ── Single non-array input ────────────────────────────────────────────────

  describe('single input handling', () => {
    it('wraps a non-array input in a single-item array', async () => {
      const handlerMock = makeHandlerMock(async (input) => ({ result: input }));
      const registry = makeMockRegistry(handlerMock);
      const executor = new GenericNodeExecutor(
        mockDb as any,
        registry,
        new TopologyStore(mockDb as any),
      );

      const result = await executor.executeCollectNode(
        'n1',
        {
          fanOut: { source: 'inputArray', handler: 'ai-generate' },
          fanIn: { merge: 'array' },
        },
        'single-item',
        baseCtx,
      );

      expect(result.successCount).toBe(1);
    });
  });
});
