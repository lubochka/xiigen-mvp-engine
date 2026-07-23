/**
 * P3.1 — Database Fabric Resolver Tests.
 *
 * Verifies: default routing, per-index overrides, fallback on health failure,
 * provider caching, cache invalidation, hot-reload config, missing provider error.
 */

import {
  DatabaseFabricResolver,
  DatabaseResolverConfig,
} from '../../src/fabrics/database/fabric-resolver';
import { DatabaseProviderRegistry } from '../../src/fabrics/database/provider-registry';
import { DatabaseProviderType } from '../../src/fabrics/database/base';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock providers ───────────────────────────────────

function makeMockProvider(name: string, healthy = true) {
  return {
    _name: name,
    _healthy: healthy,
    storeDocument: jest.fn(),
    searchDocuments: jest.fn(),
    getDocument: jest.fn(),
    deleteDocument: jest.fn(),
    bulkStore: jest.fn(),
    countDocuments: jest.fn(),
    healthCheck: jest
      .fn()
      .mockImplementation(async () =>
        healthy
          ? DataProcessResult.success({ status: 'ok', provider: name })
          : DataProcessResult.failure('UNHEALTHY', `${name} is unhealthy`),
      ),
  } as any;
}

function setupRegistry(
  ...providers: Array<{ type: DatabaseProviderType; name: string; healthy?: boolean }>
): DatabaseProviderRegistry {
  const registry = new DatabaseProviderRegistry();
  for (const p of providers) {
    const healthy = p.healthy ?? true;
    registry.register(p.type, async () => makeMockProvider(p.name, healthy), {
      name: p.name,
    });
  }
  return registry;
}

// ── Tests ────────────────────────────────────────────

describe('DatabaseFabricResolver', () => {
  describe('default routing', () => {
    it('should resolve the default provider when no overrides', async () => {
      const registry = setupRegistry({ type: DatabaseProviderType.IN_MEMORY, name: 'inmem' });
      const config: DatabaseResolverConfig = {
        defaultProvider: 'in_memory',
      };
      const resolver = new DatabaseFabricResolver(config, registry);

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(true);
      expect((result.data! as any)._name).toBe('inmem');
    });

    it('should resolve default provider regardless of index when no override matches', async () => {
      const registry = setupRegistry({ type: DatabaseProviderType.ELASTICSEARCH, name: 'es' });
      const config: DatabaseResolverConfig = {
        defaultProvider: 'elasticsearch',
      };
      const resolver = new DatabaseFabricResolver(config, registry);

      const result = await resolver.resolve('some-random-index');
      expect(result.isSuccess).toBe(true);
      expect((result.data! as any)._name).toBe('es');
    });
  });

  describe('per-index overrides', () => {
    it('should route specific index to overridden provider', async () => {
      const registry = setupRegistry(
        { type: DatabaseProviderType.ELASTICSEARCH, name: 'es' },
        { type: DatabaseProviderType.POSTGRESQL, name: 'pg' },
      );
      const config: DatabaseResolverConfig = {
        defaultProvider: 'elasticsearch',
        overrides: { orders: 'postgresql' },
      };
      const resolver = new DatabaseFabricResolver(config, registry);

      // Default
      const esResult = await resolver.resolve('logs');
      expect((esResult.data! as any)._name).toBe('es');

      // Override
      const pgResult = await resolver.resolve('orders');
      expect((pgResult.data! as any)._name).toBe('pg');
    });

    it('should report correct provider for index via getProviderForIndex', () => {
      const registry = setupRegistry({ type: DatabaseProviderType.IN_MEMORY, name: 'inmem' });
      const config: DatabaseResolverConfig = {
        defaultProvider: 'in_memory',
        overrides: { orders: 'postgresql', logs: 'elasticsearch' },
      };
      const resolver = new DatabaseFabricResolver(config, registry);

      expect(resolver.getProviderForIndex('orders')).toBe('postgresql');
      expect(resolver.getProviderForIndex('logs')).toBe('elasticsearch');
      expect(resolver.getProviderForIndex('anything')).toBe('in_memory');
    });
  });

  describe('fallback on health failure', () => {
    it('should use fallback when primary provider is unhealthy', async () => {
      const registry = setupRegistry(
        { type: DatabaseProviderType.ELASTICSEARCH, name: 'es-sick', healthy: false },
        { type: DatabaseProviderType.IN_MEMORY, name: 'inmem-healthy' },
      );
      const config: DatabaseResolverConfig = {
        defaultProvider: 'elasticsearch',
        fallbackProvider: 'in_memory',
      };
      const resolver = new DatabaseFabricResolver(config, registry);

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(true);
      expect((result.data! as any)._name).toBe('inmem-healthy');
    });

    it('should fail if both primary and fallback are unhealthy', async () => {
      const registry = setupRegistry(
        { type: DatabaseProviderType.ELASTICSEARCH, name: 'es-sick', healthy: false },
        { type: DatabaseProviderType.IN_MEMORY, name: 'inmem-sick', healthy: false },
      );
      const config: DatabaseResolverConfig = {
        defaultProvider: 'elasticsearch',
        fallbackProvider: 'in_memory',
      };
      const resolver = new DatabaseFabricResolver(config, registry);

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('RESOLVE_FAILED');
    });

    it('should succeed without fallback if primary is healthy', async () => {
      const registry = setupRegistry({ type: DatabaseProviderType.ELASTICSEARCH, name: 'es-ok' });
      const config: DatabaseResolverConfig = {
        defaultProvider: 'elasticsearch',
        // No fallback configured
      };
      const resolver = new DatabaseFabricResolver(config, registry);

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(true);
    });
  });

  describe('caching', () => {
    it('should cache providers after first resolve', async () => {
      let createCount = 0;
      const registry = new DatabaseProviderRegistry();
      registry.register(DatabaseProviderType.IN_MEMORY, async () => {
        createCount++;
        return makeMockProvider('inmem');
      });
      const resolver = new DatabaseFabricResolver({ defaultProvider: 'in_memory' }, registry);

      await resolver.resolve();
      await resolver.resolve();
      await resolver.resolve();

      // Factory called only once — subsequent calls use cache
      expect(createCount).toBe(1);
      expect(resolver.cachedProviders).toContain('in_memory');
    });

    it('should evict cache when provider becomes unhealthy', async () => {
      let healthy = true;
      let createCount = 0;
      const registry = new DatabaseProviderRegistry();
      registry.register(DatabaseProviderType.IN_MEMORY, async () => {
        createCount++;
        return makeMockProvider('inmem', healthy);
      });
      const resolver = new DatabaseFabricResolver({ defaultProvider: 'in_memory' }, registry);

      // First call: healthy, cached
      const r1 = await resolver.resolve();
      expect(r1.isSuccess).toBe(true);
      expect(createCount).toBe(1);

      // Make provider unhealthy — next resolve should evict + re-create
      const cachedProvider = r1.data! as any;
      cachedProvider._healthy = false;
      cachedProvider.healthCheck.mockImplementation(async () =>
        DataProcessResult.failure('UNHEALTHY', 'now sick'),
      );

      // Re-resolve (new factory call returns healthy)
      healthy = true;
      const r2 = await resolver.resolve();
      expect(r2.isSuccess).toBe(true);
      expect(createCount).toBe(2);
    });

    it('clearCache should force re-creation on next resolve', async () => {
      let createCount = 0;
      const registry = new DatabaseProviderRegistry();
      registry.register(DatabaseProviderType.IN_MEMORY, async () => {
        createCount++;
        return makeMockProvider('inmem');
      });
      const resolver = new DatabaseFabricResolver({ defaultProvider: 'in_memory' }, registry);

      await resolver.resolve();
      expect(createCount).toBe(1);

      resolver.clearCache();
      await resolver.resolve();
      expect(createCount).toBe(2);
    });
  });

  describe('hot-reload config', () => {
    it('should switch default provider after updateConfig', async () => {
      const registry = setupRegistry(
        { type: DatabaseProviderType.IN_MEMORY, name: 'inmem' },
        { type: DatabaseProviderType.ELASTICSEARCH, name: 'es' },
      );
      const resolver = new DatabaseFabricResolver({ defaultProvider: 'in_memory' }, registry);

      const r1 = await resolver.resolve();
      expect((r1.data! as any)._name).toBe('inmem');

      // Hot-reload
      resolver.updateConfig({ defaultProvider: 'elasticsearch' });

      const r2 = await resolver.resolve();
      expect((r2.data! as any)._name).toBe('es');
    });

    it('should clear cache on updateConfig', async () => {
      const registry = setupRegistry({ type: DatabaseProviderType.IN_MEMORY, name: 'inmem' });
      const resolver = new DatabaseFabricResolver({ defaultProvider: 'in_memory' }, registry);

      await resolver.resolve();
      expect(resolver.cachedProviders.length).toBe(1);

      resolver.updateConfig({ defaultProvider: 'in_memory' });
      expect(resolver.cachedProviders.length).toBe(0);
    });

    it('should update overrides on updateConfig', async () => {
      const registry = setupRegistry(
        { type: DatabaseProviderType.IN_MEMORY, name: 'inmem' },
        { type: DatabaseProviderType.POSTGRESQL, name: 'pg' },
      );
      const resolver = new DatabaseFabricResolver({ defaultProvider: 'in_memory' }, registry);

      expect(resolver.getProviderForIndex('orders')).toBe('in_memory');

      resolver.updateConfig({
        defaultProvider: 'in_memory',
        overrides: { orders: 'postgresql' },
      });
      expect(resolver.getProviderForIndex('orders')).toBe('postgresql');
    });
  });

  describe('missing provider error', () => {
    it('should fail when default provider is not registered', async () => {
      const registry = new DatabaseProviderRegistry(); // empty
      const resolver = new DatabaseFabricResolver({ defaultProvider: 'elasticsearch' }, registry);

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('RESOLVE_FAILED');
    });

    it('should try fallback when default is not registered', async () => {
      const registry = setupRegistry({ type: DatabaseProviderType.IN_MEMORY, name: 'inmem' });
      const resolver = new DatabaseFabricResolver(
        {
          defaultProvider: 'elasticsearch', // not registered
          fallbackProvider: 'in_memory',
        },
        registry,
      );

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(true);
      expect((result.data! as any)._name).toBe('inmem');
    });
  });

  describe('factory creation errors', () => {
    it('should handle factory that throws', async () => {
      const registry = new DatabaseProviderRegistry();
      registry.register(DatabaseProviderType.ELASTICSEARCH, async () => {
        throw new Error('Connection refused');
      });
      const resolver = new DatabaseFabricResolver({ defaultProvider: 'elasticsearch' }, registry);

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('RESOLVE_FAILED');
      expect(result.errorMessage).toContain('Connection refused');
    });
  });

  describe('getOverrides', () => {
    it('should return a copy of overrides', () => {
      const resolver = new DatabaseFabricResolver(
        {
          defaultProvider: 'in_memory',
          overrides: { orders: 'postgresql', logs: 'elasticsearch' },
        },
        new DatabaseProviderRegistry(),
      );
      const overrides = resolver.getOverrides();
      expect(overrides).toEqual({ orders: 'postgresql', logs: 'elasticsearch' });
      // Ensure it's a copy (mutation doesn't affect resolver)
      overrides['new_index'] = 'something';
      expect(resolver.getOverrides()['new_index']).toBeUndefined();
    });
  });

  describe('DNA-3 compliance', () => {
    it('all resolve calls return DataProcessResult', async () => {
      const registry = setupRegistry({ type: DatabaseProviderType.IN_MEMORY, name: 'inmem' });
      const resolver = new DatabaseFabricResolver({ defaultProvider: 'in_memory' }, registry);

      const result = await resolver.resolve();
      expect(result).toBeInstanceOf(DataProcessResult);
    });
  });
});
