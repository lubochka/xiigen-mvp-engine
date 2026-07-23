/**
 * P5.3 Tests — Secrets Provider Registry + Secrets Fabric Resolver
 *
 * Registry: register all providers, lookup, not-found.
 * Resolver: default routing, path-prefix overrides, fallback, caching, hot-reload.
 */

import { SecretsProviderRegistry } from '../../src/fabrics/secrets/provider-registry';
import {
  SecretsFabricResolver,
  SecretsResolverConfig,
} from '../../src/fabrics/secrets/fabric-resolver';
import { SecretsProviderType } from '../../src/fabrics/secrets/base';
import { ISecretsService } from '../../src/fabrics/interfaces/secrets.interface';
import { DataProcessResult } from '../../src/kernel/data-process-result';

function createMockSecretsProvider(): ISecretsService {
  return {
    getSecret: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    setSecret: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    deleteSecret: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    listSecrets: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    healthCheck: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
  } as unknown as ISecretsService;
}

// ═══════════════════════════════════════════════════════
// SecretsProviderRegistry
// ═══════════════════════════════════════════════════════

describe('SecretsProviderRegistry', () => {
  describe('register', () => {
    it('should register a provider and return success', () => {
      const registry = new SecretsProviderRegistry();
      const result = registry.register(SecretsProviderType.IN_MEMORY, async () =>
        createMockSecretsProvider(),
      );
      expect(result.isSuccess).toBe(true);
    });

    it('should register all 4 provider types', () => {
      const registry = new SecretsProviderRegistry();
      registry.register(SecretsProviderType.IN_MEMORY, async () => createMockSecretsProvider());
      registry.register(SecretsProviderType.ENV_VAR, async () => createMockSecretsProvider());
      registry.register(SecretsProviderType.AWS_SECRETS_MANAGER, async () =>
        createMockSecretsProvider(),
      );
      registry.register(SecretsProviderType.VAULT, async () => createMockSecretsProvider());
      expect(registry.count).toBe(4);
    });

    it('should overwrite on re-register', () => {
      const registry = new SecretsProviderRegistry();
      const factory1 = jest.fn();
      const factory2 = jest.fn();
      registry.register(SecretsProviderType.IN_MEMORY, factory1 as any);
      registry.register(SecretsProviderType.IN_MEMORY, factory2 as any);
      expect(registry.count).toBe(1);
      expect(registry.getFactory(SecretsProviderType.IN_MEMORY).data).toBe(factory2);
    });

    it('should store metadata', () => {
      const registry = new SecretsProviderRegistry();
      registry.register(
        SecretsProviderType.AWS_SECRETS_MANAGER,
        async () => createMockSecretsProvider(),
        { region: 'us-east-1' },
      );
      expect(registry.getMetadata(SecretsProviderType.AWS_SECRETS_MANAGER)).toEqual({
        region: 'us-east-1',
      });
    });
  });

  describe('getFactory', () => {
    it('should return the registered factory', () => {
      const registry = new SecretsProviderRegistry();
      const factory = async () => createMockSecretsProvider();
      registry.register(SecretsProviderType.IN_MEMORY, factory);
      const result = registry.getFactory(SecretsProviderType.IN_MEMORY);
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(factory);
    });

    it('should return failure for unregistered provider', () => {
      const registry = new SecretsProviderRegistry();
      const result = registry.getFactory(SecretsProviderType.AWS_SECRETS_MANAGER);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PROVIDER_NOT_FOUND');
    });

    it('should return DataProcessResult', () => {
      const registry = new SecretsProviderRegistry();
      const result = registry.getFactory(SecretsProviderType.IN_MEMORY);
      expect(result).toBeInstanceOf(DataProcessResult);
    });
  });

  describe('listProviders', () => {
    it('should return empty array initially', () => {
      const registry = new SecretsProviderRegistry();
      expect(registry.listProviders()).toEqual([]);
    });

    it('should list all registered types', () => {
      const registry = new SecretsProviderRegistry();
      registry.register(SecretsProviderType.IN_MEMORY, async () => createMockSecretsProvider());
      registry.register(SecretsProviderType.ENV_VAR, async () => createMockSecretsProvider());
      expect(registry.listProviders()).toHaveLength(2);
    });
  });

  describe('isRegistered', () => {
    it('should return true for registered', () => {
      const registry = new SecretsProviderRegistry();
      registry.register(SecretsProviderType.IN_MEMORY, async () => createMockSecretsProvider());
      expect(registry.isRegistered(SecretsProviderType.IN_MEMORY)).toBe(true);
    });

    it('should return false for unregistered', () => {
      const registry = new SecretsProviderRegistry();
      expect(registry.isRegistered(SecretsProviderType.AWS_SECRETS_MANAGER)).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════
// SecretsFabricResolver
// ═══════════════════════════════════════════════════════

describe('SecretsFabricResolver', () => {
  function createRegistryWithProviders(): SecretsProviderRegistry {
    const registry = new SecretsProviderRegistry();
    registry.register(SecretsProviderType.IN_MEMORY, async () => createMockSecretsProvider());
    registry.register(SecretsProviderType.ENV_VAR, async () => createMockSecretsProvider());
    registry.register(SecretsProviderType.AWS_SECRETS_MANAGER, async () =>
      createMockSecretsProvider(),
    );
    registry.register(SecretsProviderType.VAULT, async () => createMockSecretsProvider());
    return registry;
  }

  describe('resolve()', () => {
    it('should resolve default provider', async () => {
      const registry = createRegistryWithProviders();
      const config: SecretsResolverConfig = { defaultProvider: 'in_memory' };
      const resolver = new SecretsFabricResolver(config, registry);

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(true);
    });

    it('should cache resolved provider', async () => {
      const registry = new SecretsProviderRegistry();
      const factoryFn = jest.fn().mockResolvedValue(createMockSecretsProvider());
      registry.register(SecretsProviderType.IN_MEMORY, factoryFn);
      const resolver = new SecretsFabricResolver({ defaultProvider: 'in_memory' }, registry);

      await resolver.resolve();
      await resolver.resolve();

      expect(factoryFn).toHaveBeenCalledTimes(1);
      expect(resolver.cachedProviders).toContain('in_memory');
    });

    it('should use path-prefix overrides', async () => {
      const registry = createRegistryWithProviders();
      const config: SecretsResolverConfig = {
        defaultProvider: 'in_memory',
        overrides: {
          'xiigen/ai/': 'aws_secrets_manager',
          'xiigen/dev/': 'env_var',
        },
      };
      const resolver = new SecretsFabricResolver(config, registry);

      expect(resolver.resolveProviderType('xiigen/ai/key')).toBe('aws_secrets_manager');
      expect(resolver.resolveProviderType('xiigen/dev/local')).toBe('env_var');
      expect(resolver.resolveProviderType('xiigen/other')).toBe('in_memory');
    });

    it('should pick longest matching prefix', async () => {
      const registry = createRegistryWithProviders();
      const config: SecretsResolverConfig = {
        defaultProvider: 'in_memory',
        overrides: {
          'xiigen/': 'env_var',
          'xiigen/ai/': 'aws_secrets_manager',
        },
      };
      const resolver = new SecretsFabricResolver(config, registry);

      // 'xiigen/ai/' is longer match than 'xiigen/'
      expect(resolver.resolveProviderType('xiigen/ai/key')).toBe('aws_secrets_manager');
      expect(resolver.resolveProviderType('xiigen/db/host')).toBe('env_var');
    });

    it('should use fallback when primary fails', async () => {
      const registry = new SecretsProviderRegistry();
      registry.register(SecretsProviderType.IN_MEMORY, async () => createMockSecretsProvider());
      // 'broken' not registered
      const config: SecretsResolverConfig = {
        defaultProvider: 'broken' as any,
        fallbackProvider: 'in_memory',
      };
      const resolver = new SecretsFabricResolver(config, registry);

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(true);
    });

    it('should return failure when no providers available', async () => {
      const registry = new SecretsProviderRegistry();
      const resolver = new SecretsFabricResolver({ defaultProvider: 'missing' as any }, registry);

      const result = await resolver.resolve();
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('RESOLVE_FAILED');
    });
  });

  describe('updateConfig() — hot-reload', () => {
    it('should clear cache and apply new config', async () => {
      const registry = createRegistryWithProviders();
      const resolver = new SecretsFabricResolver({ defaultProvider: 'in_memory' }, registry);

      await resolver.resolve();
      expect(resolver.cachedProviders).toHaveLength(1);

      resolver.updateConfig({ defaultProvider: 'env_var' });
      expect(resolver.cachedProviders).toHaveLength(0);
    });
  });

  describe('getOverrides()', () => {
    it('should return copy of overrides', () => {
      const config: SecretsResolverConfig = {
        defaultProvider: 'in_memory',
        overrides: { 'ai/*': 'aws_secrets_manager' },
      };
      const resolver = new SecretsFabricResolver(config, new SecretsProviderRegistry());
      const overrides = resolver.getOverrides();
      expect(overrides).toEqual({ 'ai/*': 'aws_secrets_manager' });
    });
  });
});
