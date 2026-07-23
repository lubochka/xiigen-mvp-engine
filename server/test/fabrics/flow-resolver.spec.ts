/**
 * P5.3 Tests — Flow Engine Fabric Resolver
 *
 * Tests: resolve pair, resolve store, resolve orchestrator, cache, config change,
 *        fallback, provider not found.
 */

import {
  FlowFabricResolver,
  FlowResolverConfig,
  FlowEnginePair,
} from '../../src/fabrics/flow-engine/fabric-resolver';
import {
  IFlowDefinition,
  IFlowOrchestrator,
} from '../../src/fabrics/interfaces/flow-orchestrator.interface';
import { DataProcessResult } from '../../src/kernel/data-process-result';

function createMockFlowPair(): FlowEnginePair {
  const store = {
    loadFlow: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    saveFlow: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    listFlows: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  } as unknown as IFlowDefinition;

  const orchestrator = {
    startFlow: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    executeNode: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    getRunStatus: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    resumeFlow: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    cancelFlow: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
  } as unknown as IFlowOrchestrator;

  return { store, orchestrator };
}

describe('FlowFabricResolver', () => {
  describe('resolve()', () => {
    it('should resolve flow engine pair', async () => {
      const config: FlowResolverConfig = { defaultProvider: 'in_memory' };
      const resolver = new FlowFabricResolver(config);
      const pair = createMockFlowPair();
      resolver.registerProvider('in_memory', async () => pair);

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(true);
      expect(result.data!.store).toBe(pair.store);
      expect(result.data!.orchestrator).toBe(pair.orchestrator);
    });

    it('should cache resolved pair', async () => {
      const resolver = new FlowFabricResolver({ defaultProvider: 'in_memory' });
      const factoryFn = jest.fn().mockResolvedValue(createMockFlowPair());
      resolver.registerProvider('in_memory', factoryFn);

      await resolver.resolve();
      await resolver.resolve();

      expect(factoryFn).toHaveBeenCalledTimes(1);
      expect(resolver.cachedProviders).toContain('in_memory');
    });

    it('should use fallback when primary fails', async () => {
      const resolver = new FlowFabricResolver({
        defaultProvider: 'broken',
        fallbackProvider: 'in_memory',
      });
      const pair = createMockFlowPair();
      resolver.registerProvider('in_memory', async () => pair);

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(true);
      expect(result.data!.store).toBe(pair.store);
    });

    it('should return failure when no providers registered', async () => {
      const resolver = new FlowFabricResolver({ defaultProvider: 'missing' });

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('RESOLVE_FAILED');
    });
  });

  describe('resolveStore()', () => {
    it('should return just the IFlowDefinition', async () => {
      const resolver = new FlowFabricResolver({ defaultProvider: 'in_memory' });
      const pair = createMockFlowPair();
      resolver.registerProvider('in_memory', async () => pair);

      const result = await resolver.resolveStore();
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(pair.store);
    });

    it('should return failure when resolve fails', async () => {
      const resolver = new FlowFabricResolver({ defaultProvider: 'missing' });
      const result = await resolver.resolveStore();
      expect(result.isSuccess).toBe(false);
    });
  });

  describe('resolveOrchestrator()', () => {
    it('should return just the IFlowOrchestrator', async () => {
      const resolver = new FlowFabricResolver({ defaultProvider: 'in_memory' });
      const pair = createMockFlowPair();
      resolver.registerProvider('in_memory', async () => pair);

      const result = await resolver.resolveOrchestrator();
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(pair.orchestrator);
    });
  });

  describe('updateConfig() — hot-reload', () => {
    it('should clear cache and apply new config', async () => {
      const resolver = new FlowFabricResolver({ defaultProvider: 'in_memory' });
      resolver.registerProvider('in_memory', async () => createMockFlowPair());
      resolver.registerProvider('elasticsearch', async () => createMockFlowPair());

      await resolver.resolve();
      expect(resolver.cachedProviders).toHaveLength(1);

      resolver.updateConfig({ defaultProvider: 'elasticsearch' });
      expect(resolver.cachedProviders).toHaveLength(0);

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(true);
      expect(resolver.cachedProviders).toContain('elasticsearch');
    });
  });

  describe('registerProvider()', () => {
    it('should return DataProcessResult success', () => {
      const resolver = new FlowFabricResolver({ defaultProvider: 'in_memory' });
      const result = resolver.registerProvider('in_memory', async () => createMockFlowPair());
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('listRegistered()', () => {
    it('should list all registered providers', () => {
      const resolver = new FlowFabricResolver({ defaultProvider: 'in_memory' });
      resolver.registerProvider('in_memory', async () => createMockFlowPair());
      resolver.registerProvider('elasticsearch', async () => createMockFlowPair());
      expect(resolver.listRegistered()).toEqual(['in_memory', 'elasticsearch']);
    });
  });

  describe('clearCache()', () => {
    it('should remove all cached providers', async () => {
      const resolver = new FlowFabricResolver({ defaultProvider: 'in_memory' });
      resolver.registerProvider('in_memory', async () => createMockFlowPair());
      await resolver.resolve();
      expect(resolver.cachedProviders).toHaveLength(1);

      resolver.clearCache();
      expect(resolver.cachedProviders).toHaveLength(0);
    });
  });
});
