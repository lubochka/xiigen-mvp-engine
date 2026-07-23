/**
 * P5.3 Tests — RAG Fabric Resolver
 *
 * Tests: default InMemory, strategy in config, namespace overrides,
 *        cache, hot-reload, fallback, provider not found.
 */

import { RagFabricResolver, RagResolverConfig } from '../../src/fabrics/rag/fabric-resolver';
import { RagStrategy } from '../../src/fabrics/rag/base';
import { IRagService } from '../../src/fabrics/interfaces/rag.interface';
import { DataProcessResult } from '../../src/kernel/data-process-result';

function createMockRagProvider(name = 'mock'): IRagService {
  return {
    search: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    ingest: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    buildContextPack: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    deleteByFilter: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
  } as unknown as IRagService;
}

describe('RagFabricResolver', () => {
  describe('resolve()', () => {
    it('should resolve default InMemory provider', async () => {
      const config: RagResolverConfig = { defaultProvider: 'in_memory' };
      const resolver = new RagFabricResolver(config);
      const mock = createMockRagProvider();
      resolver.registerProvider('in_memory', async () => mock);

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(mock);
    });

    it('should return cached provider on second call', async () => {
      const config: RagResolverConfig = { defaultProvider: 'in_memory' };
      const resolver = new RagFabricResolver(config);
      const factoryFn = jest.fn().mockResolvedValue(createMockRagProvider());
      resolver.registerProvider('in_memory', factoryFn);

      await resolver.resolve();
      await resolver.resolve();

      expect(factoryFn).toHaveBeenCalledTimes(1);
      expect(resolver.cachedProviders).toContain('in_memory');
    });

    it('should resolve per-namespace overrides', async () => {
      const config: RagResolverConfig = {
        defaultProvider: 'in_memory',
        overrides: { skills: 'pinecone' },
      };
      const resolver = new RagFabricResolver(config);
      const inMemory = createMockRagProvider('im');
      const pinecone = createMockRagProvider('pc');
      resolver.registerProvider('in_memory', async () => inMemory);
      resolver.registerProvider('pinecone', async () => pinecone);

      const defaultResult = await resolver.resolve();
      expect(defaultResult.data).toBe(inMemory);

      const skillsResult = await resolver.resolve('skills');
      expect(skillsResult.data).toBe(pinecone);
    });

    it('should use fallback when primary fails', async () => {
      const config: RagResolverConfig = {
        defaultProvider: 'broken',
        fallbackProvider: 'in_memory',
      };
      const resolver = new RagFabricResolver(config);
      const mock = createMockRagProvider();
      resolver.registerProvider('in_memory', async () => mock);
      // 'broken' not registered — will fail

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(mock);
    });

    it('should return failure when no providers registered', async () => {
      const config: RagResolverConfig = { defaultProvider: 'missing' };
      const resolver = new RagFabricResolver(config);

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('RESOLVE_FAILED');
    });
  });

  describe('getStrategy()', () => {
    it('should return strategy from config', () => {
      const resolver = new RagFabricResolver({
        defaultProvider: 'in_memory',
        strategy: RagStrategy.HYBRID,
      });
      expect(resolver.getStrategy()).toBe(RagStrategy.HYBRID);
    });

    it('should default to VECTOR', () => {
      const resolver = new RagFabricResolver({ defaultProvider: 'in_memory' });
      expect(resolver.getStrategy()).toBe(RagStrategy.VECTOR);
    });
  });

  describe('updateConfig() — hot-reload', () => {
    it('should clear cache and apply new config', async () => {
      const resolver = new RagFabricResolver({ defaultProvider: 'in_memory' });
      resolver.registerProvider('in_memory', async () => createMockRagProvider());
      resolver.registerProvider('pinecone', async () => createMockRagProvider());

      await resolver.resolve(); // cache in_memory
      expect(resolver.cachedProviders).toHaveLength(1);

      resolver.updateConfig({ defaultProvider: 'pinecone' });
      expect(resolver.cachedProviders).toHaveLength(0);

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(true);
      expect(resolver.cachedProviders).toContain('pinecone');
    });
  });

  describe('getProviderForNamespace()', () => {
    it('should return override for namespace', () => {
      const resolver = new RagFabricResolver({
        defaultProvider: 'in_memory',
        overrides: { skills: 'pinecone' },
      });
      expect(resolver.getProviderForNamespace('skills')).toBe('pinecone');
      expect(resolver.getProviderForNamespace('other')).toBe('in_memory');
    });
  });

  describe('listRegistered()', () => {
    it('should list all registered providers', () => {
      const resolver = new RagFabricResolver({ defaultProvider: 'in_memory' });
      resolver.registerProvider('in_memory', async () => createMockRagProvider());
      resolver.registerProvider('pinecone', async () => createMockRagProvider());
      expect(resolver.listRegistered()).toEqual(['in_memory', 'pinecone']);
    });
  });
});
