/**
 * P4.1 — AI Fabric Resolver Tests.
 *
 * Same resolution pattern as Database/Queue resolvers.
 * Model-specific routing: { 'claude-opus-4-5': 'anthropic', 'gpt-5.2': 'openai' }
 */

import { AiFabricResolver, AiResolverConfig } from '../../src/fabrics/ai-engine/fabric-resolver';
import { AiProviderRegistry } from '../../src/fabrics/ai-engine/provider-registry';
import { AiProviderType } from '../../src/fabrics/ai-engine/base';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock providers ───────────────────────────────────

function makeMockAiProvider(name: string, healthy = true) {
  return {
    _name: name,
    generate: jest.fn(),
    generateStructured: jest.fn(),
    getModelInfo: jest.fn().mockReturnValue({ model: name }),
    healthCheck: jest
      .fn()
      .mockImplementation(async () =>
        healthy
          ? DataProcessResult.success({ status: 'ok' })
          : DataProcessResult.failure('UNHEALTHY', `${name} sick`),
      ),
  } as any;
}

function setupRegistry(
  ...providers: Array<{ type: string; name: string; healthy?: boolean }>
): AiProviderRegistry {
  const registry = new AiProviderRegistry();
  for (const p of providers) {
    const healthy = p.healthy ?? true;
    registry.register(p.type, async () => makeMockAiProvider(p.name, healthy));
  }
  return registry;
}

// ── Tests ────────────────────────────────────────────

describe('AiFabricResolver', () => {
  describe('default routing', () => {
    it('should resolve the default provider when no model routing', async () => {
      const registry = setupRegistry({ type: AiProviderType.MOCK, name: 'mock-ai' });
      const resolver = new AiFabricResolver({ defaultProvider: 'mock' }, registry);

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(true);
      expect((result.data as any)._name).toBe('mock-ai');
    });

    it('should resolve default for unknown model IDs', async () => {
      const registry = setupRegistry({ type: AiProviderType.ANTHROPIC, name: 'claude' });
      const resolver = new AiFabricResolver({ defaultProvider: 'anthropic' }, registry);

      const result = await resolver.resolve('some-unknown-model');
      expect(result.isSuccess).toBe(true);
      expect((result.data as any)._name).toBe('claude');
    });
  });

  describe('model-specific routing', () => {
    it('should route specific model to its provider', async () => {
      const registry = setupRegistry(
        { type: AiProviderType.MOCK, name: 'mock' },
        { type: AiProviderType.ANTHROPIC, name: 'claude' },
        { type: AiProviderType.OPENAI, name: 'gpt' },
      );
      const resolver = new AiFabricResolver(
        {
          defaultProvider: 'mock',
          modelRouting: {
            'claude-opus-4-5': 'anthropic',
            'gpt-5.2': 'openai',
          },
        },
        registry,
      );

      const claudeResult = await resolver.resolve('claude-opus-4-5');
      expect((claudeResult.data as any)._name).toBe('claude');

      const gptResult = await resolver.resolve('gpt-5.2');
      expect((gptResult.data as any)._name).toBe('gpt');

      // Unknown model → default
      const defaultResult = await resolver.resolve('llama-3');
      expect((defaultResult.data as any)._name).toBe('mock');
    });

    it('should report correct provider via getProviderForModel', () => {
      const resolver = new AiFabricResolver(
        {
          defaultProvider: 'mock',
          modelRouting: { 'claude-opus-4-5': 'anthropic' },
        },
        new AiProviderRegistry(),
      );

      expect(resolver.getProviderForModel('claude-opus-4-5')).toBe('anthropic');
      expect(resolver.getProviderForModel('unknown')).toBe('mock');
    });
  });

  describe('fallback on health failure', () => {
    it('should use fallback when primary is unhealthy', async () => {
      const registry = setupRegistry(
        { type: AiProviderType.ANTHROPIC, name: 'claude-sick', healthy: false },
        { type: AiProviderType.MOCK, name: 'mock-ok' },
      );
      const resolver = new AiFabricResolver(
        { defaultProvider: 'anthropic', fallbackProvider: 'mock' },
        registry,
      );

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(true);
      expect((result.data as any)._name).toBe('mock-ok');
    });

    it('should fail if both primary and fallback fail', async () => {
      const registry = setupRegistry(
        { type: AiProviderType.ANTHROPIC, name: 'claude-sick', healthy: false },
        { type: AiProviderType.MOCK, name: 'mock-sick', healthy: false },
      );
      const resolver = new AiFabricResolver(
        { defaultProvider: 'anthropic', fallbackProvider: 'mock' },
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
      const registry = new AiProviderRegistry();
      registry.register(AiProviderType.MOCK, async () => {
        createCount++;
        return makeMockAiProvider('mock');
      });
      const resolver = new AiFabricResolver({ defaultProvider: 'mock' }, registry);

      await resolver.resolve();
      await resolver.resolve();
      await resolver.resolve();

      expect(createCount).toBe(1);
      expect(resolver.cachedProviders).toContain('mock');
    });

    it('clearCache should force re-creation', async () => {
      let createCount = 0;
      const registry = new AiProviderRegistry();
      registry.register(AiProviderType.MOCK, async () => {
        createCount++;
        return makeMockAiProvider('mock');
      });
      const resolver = new AiFabricResolver({ defaultProvider: 'mock' }, registry);

      await resolver.resolve();
      resolver.clearCache();
      await resolver.resolve();

      expect(createCount).toBe(2);
    });
  });

  describe('hot-reload config', () => {
    it('should switch default provider after updateConfig', async () => {
      const registry = setupRegistry(
        { type: AiProviderType.MOCK, name: 'mock' },
        { type: AiProviderType.ANTHROPIC, name: 'claude' },
      );
      const resolver = new AiFabricResolver({ defaultProvider: 'mock' }, registry);

      const r1 = await resolver.resolve();
      expect((r1.data as any)._name).toBe('mock');

      resolver.updateConfig({ defaultProvider: 'anthropic' });

      const r2 = await resolver.resolve();
      expect((r2.data as any)._name).toBe('claude');
    });

    it('should clear cache on updateConfig', async () => {
      const registry = setupRegistry({ type: AiProviderType.MOCK, name: 'mock' });
      const resolver = new AiFabricResolver({ defaultProvider: 'mock' }, registry);

      await resolver.resolve();
      expect(resolver.cachedProviders.length).toBe(1);

      resolver.updateConfig({ defaultProvider: 'mock' });
      expect(resolver.cachedProviders.length).toBe(0);
    });

    it('should update model routing on updateConfig', () => {
      const resolver = new AiFabricResolver({ defaultProvider: 'mock' }, new AiProviderRegistry());

      expect(resolver.getProviderForModel('claude-opus-4-5')).toBe('mock');

      resolver.updateConfig({
        defaultProvider: 'mock',
        modelRouting: { 'claude-opus-4-5': 'anthropic' },
      });
      expect(resolver.getProviderForModel('claude-opus-4-5')).toBe('anthropic');
    });
  });

  describe('missing provider', () => {
    it('should fail when default provider is not registered', async () => {
      const resolver = new AiFabricResolver(
        { defaultProvider: 'anthropic' },
        new AiProviderRegistry(),
      );

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('RESOLVE_FAILED');
    });

    it('should try fallback when default is not registered', async () => {
      const registry = setupRegistry({ type: AiProviderType.MOCK, name: 'mock' });
      const resolver = new AiFabricResolver(
        { defaultProvider: 'anthropic', fallbackProvider: 'mock' },
        registry,
      );

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(true);
      expect((result.data as any)._name).toBe('mock');
    });
  });

  describe('factory errors', () => {
    it('should handle factory that throws', async () => {
      const registry = new AiProviderRegistry();
      registry.register(AiProviderType.ANTHROPIC, async () => {
        throw new Error('API key invalid');
      });
      const resolver = new AiFabricResolver({ defaultProvider: 'anthropic' }, registry);

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(false);
      expect(result.errorMessage).toContain('API key invalid');
    });
  });

  describe('getModelRouting', () => {
    it('should return a copy of model routing', () => {
      const resolver = new AiFabricResolver(
        {
          defaultProvider: 'mock',
          modelRouting: { 'claude-opus-4-5': 'anthropic' },
        },
        new AiProviderRegistry(),
      );

      const routing = resolver.getModelRouting();
      expect(routing).toEqual({ 'claude-opus-4-5': 'anthropic' });
      routing['new-model'] = 'openai';
      expect(resolver.getModelRouting()['new-model']).toBeUndefined();
    });
  });

  describe('DNA-3 compliance', () => {
    it('all resolve calls return DataProcessResult', async () => {
      const registry = setupRegistry({ type: AiProviderType.MOCK, name: 'mock' });
      const resolver = new AiFabricResolver({ defaultProvider: 'mock' }, registry);

      const result = await resolver.resolve();
      expect(result).toBeInstanceOf(DataProcessResult);
    });
  });
});
