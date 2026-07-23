/**
 * P3.1 — Queue Fabric Resolver Tests.
 *
 * Same resolution pattern as Database resolver — config-driven routing
 * with fallback, health check, caching, hot-reload.
 */

import { QueueFabricResolver, QueueResolverConfig } from '../../src/fabrics/queue/fabric-resolver';
import { QueueProviderRegistry } from '../../src/fabrics/queue/provider-registry';
import { QueueProviderType } from '../../src/fabrics/queue/base';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock providers ───────────────────────────────────

function makeMockQueueProvider(name: string, healthy = true) {
  return {
    _name: name,
    enqueue: jest.fn(),
    dequeue: jest.fn(),
    acknowledge: jest.fn(),
    sendToDlq: jest.fn(),
    healthCheck: jest
      .fn()
      .mockImplementation(async () =>
        healthy
          ? DataProcessResult.success({ status: 'ok', provider: name })
          : DataProcessResult.failure('UNHEALTHY', `${name} is unhealthy`),
      ),
  } as any;
}

function setupQueueRegistry(
  ...providers: Array<{ type: QueueProviderType; name: string; healthy?: boolean }>
): QueueProviderRegistry {
  const registry = new QueueProviderRegistry();
  for (const p of providers) {
    const healthy = p.healthy ?? true;
    registry.register(p.type, async () => makeMockQueueProvider(p.name, healthy));
  }
  return registry;
}

// ── Tests ────────────────────────────────────────────

describe('QueueFabricResolver', () => {
  describe('default routing', () => {
    it('should resolve the default provider when no overrides', async () => {
      const registry = setupQueueRegistry({ type: QueueProviderType.IN_MEMORY, name: 'inmem-q' });
      const resolver = new QueueFabricResolver({ defaultProvider: 'in_memory' }, registry);

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(true);
      expect((result.data! as any)._name).toBe('inmem-q');
    });

    it('should resolve default for unknown queue names', async () => {
      const registry = setupQueueRegistry({ type: QueueProviderType.SQS, name: 'sqs-q' });
      const resolver = new QueueFabricResolver({ defaultProvider: 'sqs' }, registry);

      const result = await resolver.resolve('random.queue.name');
      expect(result.isSuccess).toBe(true);
      expect((result.data! as any)._name).toBe('sqs-q');
    });
  });

  describe('per-queue overrides', () => {
    it('should route specific queue to overridden provider', async () => {
      const registry = setupQueueRegistry(
        { type: QueueProviderType.IN_MEMORY, name: 'inmem' },
        { type: QueueProviderType.SQS, name: 'sqs' },
      );
      const resolver = new QueueFabricResolver(
        {
          defaultProvider: 'in_memory',
          overrides: { 'critical.events': 'sqs' },
        },
        registry,
      );

      const defaultResult = await resolver.resolve('normal.events');
      expect((defaultResult.data! as any)._name).toBe('inmem');

      const overrideResult = await resolver.resolve('critical.events');
      expect((overrideResult.data! as any)._name).toBe('sqs');
    });

    it('should report correct provider via getProviderForQueue', () => {
      const resolver = new QueueFabricResolver(
        {
          defaultProvider: 'in_memory',
          overrides: { 'order.events': 'sqs' },
        },
        new QueueProviderRegistry(),
      );

      expect(resolver.getProviderForQueue('order.events')).toBe('sqs');
      expect(resolver.getProviderForQueue('other')).toBe('in_memory');
    });
  });

  describe('fallback on health failure', () => {
    it('should use fallback when primary is unhealthy', async () => {
      const registry = setupQueueRegistry(
        { type: QueueProviderType.SQS, name: 'sqs-sick', healthy: false },
        { type: QueueProviderType.IN_MEMORY, name: 'inmem-ok' },
      );
      const resolver = new QueueFabricResolver(
        {
          defaultProvider: 'sqs',
          fallbackProvider: 'in_memory',
        },
        registry,
      );

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(true);
      expect((result.data! as any)._name).toBe('inmem-ok');
    });

    it('should fail if both primary and fallback fail', async () => {
      const registry = setupQueueRegistry(
        { type: QueueProviderType.SQS, name: 'sqs-sick', healthy: false },
        { type: QueueProviderType.IN_MEMORY, name: 'inmem-sick', healthy: false },
      );
      const resolver = new QueueFabricResolver(
        { defaultProvider: 'sqs', fallbackProvider: 'in_memory' },
        registry,
      );

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('RESOLVE_FAILED');
    });
  });

  describe('caching', () => {
    it('should cache providers after first resolve', async () => {
      let createCount = 0;
      const registry = new QueueProviderRegistry();
      registry.register(QueueProviderType.IN_MEMORY, async () => {
        createCount++;
        return makeMockQueueProvider('inmem');
      });
      const resolver = new QueueFabricResolver({ defaultProvider: 'in_memory' }, registry);

      await resolver.resolve();
      await resolver.resolve();
      await resolver.resolve();

      expect(createCount).toBe(1);
      expect(resolver.cachedProviders.length).toBeGreaterThan(0);
    });

    it('clearCache should force re-creation', async () => {
      let createCount = 0;
      const registry = new QueueProviderRegistry();
      registry.register(QueueProviderType.IN_MEMORY, async () => {
        createCount++;
        return makeMockQueueProvider('inmem');
      });
      const resolver = new QueueFabricResolver({ defaultProvider: 'in_memory' }, registry);

      await resolver.resolve();
      expect(createCount).toBe(1);

      resolver.clearCache();
      await resolver.resolve();
      expect(createCount).toBe(2);
    });
  });

  describe('hot-reload config', () => {
    it('should switch default provider after updateConfig', async () => {
      const registry = setupQueueRegistry(
        { type: QueueProviderType.IN_MEMORY, name: 'inmem' },
        { type: QueueProviderType.SQS, name: 'sqs' },
      );
      const resolver = new QueueFabricResolver({ defaultProvider: 'in_memory' }, registry);

      const r1 = await resolver.resolve();
      expect((r1.data! as any)._name).toBe('inmem');

      resolver.updateConfig({ defaultProvider: 'sqs' });

      const r2 = await resolver.resolve();
      expect((r2.data! as any)._name).toBe('sqs');
    });

    it('should clear cache on updateConfig', async () => {
      const registry = setupQueueRegistry({ type: QueueProviderType.IN_MEMORY, name: 'inmem' });
      const resolver = new QueueFabricResolver({ defaultProvider: 'in_memory' }, registry);

      await resolver.resolve();
      expect(resolver.cachedProviders.length).toBeGreaterThan(0);

      resolver.updateConfig({ defaultProvider: 'in_memory' });
      expect(resolver.cachedProviders.length).toBe(0);
    });
  });

  describe('missing provider', () => {
    it('should fail when default provider is not registered', async () => {
      const resolver = new QueueFabricResolver(
        { defaultProvider: 'sqs' },
        new QueueProviderRegistry(), // empty
      );

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('RESOLVE_FAILED');
    });

    it('should try fallback when default is not registered', async () => {
      const registry = setupQueueRegistry({ type: QueueProviderType.IN_MEMORY, name: 'inmem' });
      const resolver = new QueueFabricResolver(
        { defaultProvider: 'sqs', fallbackProvider: 'in_memory' },
        registry,
      );

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(true);
      expect((result.data! as any)._name).toBe('inmem');
    });
  });

  describe('factory creation errors', () => {
    it('should handle factory that throws', async () => {
      const registry = new QueueProviderRegistry();
      registry.register(QueueProviderType.SQS, async () => {
        throw new Error('SQS connection failed');
      });
      const resolver = new QueueFabricResolver({ defaultProvider: 'sqs' }, registry);

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(false);
      expect(result.errorMessage).toContain('SQS connection failed');
    });
  });

  describe('DNA-3 compliance', () => {
    it('all resolve calls return DataProcessResult', async () => {
      const registry = setupQueueRegistry({ type: QueueProviderType.IN_MEMORY, name: 'inmem' });
      const resolver = new QueueFabricResolver({ defaultProvider: 'in_memory' }, registry);

      const result = await resolver.resolve();
      expect(result).toBeInstanceOf(DataProcessResult);
    });
  });

  describe('getOverrides', () => {
    it('should return a copy of overrides', () => {
      const resolver = new QueueFabricResolver(
        {
          defaultProvider: 'in_memory',
          overrides: { 'a.events': 'sqs' },
        },
        new QueueProviderRegistry(),
      );
      const ov = resolver.getOverrides();
      expect(ov).toEqual({ 'a.events': 'sqs' });
      ov['new'] = 'xxx';
      expect(resolver.getOverrides()['new']).toBeUndefined();
    });
  });
});
