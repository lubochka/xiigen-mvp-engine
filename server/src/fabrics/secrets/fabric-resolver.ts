/**
 * Secrets Fabric Resolver — config-driven routing to secrets providers.
 *
 * Same full pattern as DatabaseFabricResolver:
 *   - Default provider, path-prefix overrides, fallback, health check, caching, hot-reload.
 *
 * Path-prefix overrides: { 'xiigen/ai/*': 'aws_secrets_manager', 'xiigen/dev/*': 'env_var' }
 *
 * Phase 5.3: Full resolver pattern.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { ISecretsService } from '../interfaces/secrets.interface';
import { SecretsProviderType } from './base';
import { SecretsProviderRegistry } from './provider-registry';

export interface SecretsResolverConfig {
  defaultProvider: string;
  fallbackProvider?: string;
  /** Path-prefix overrides: { 'xiigen/ai': 'aws_secrets_manager' } */
  overrides?: Record<string, string>;
  /** Per-provider config blocks. */
  providers?: Record<string, Record<string, unknown>>;
}

@Injectable()
export class SecretsFabricResolver {
  private config: SecretsResolverConfig;
  private readonly registry: SecretsProviderRegistry;
  private readonly cache = new Map<string, ISecretsService>();

  constructor(config: SecretsResolverConfig, registry: SecretsProviderRegistry) {
    this.config = config;
    this.registry = registry;
  }

  /**
   * Resolve the correct ISecretsService for the given path.
   * Checks path-prefix overrides first, then uses default.
   */
  async resolve(path?: string): Promise<DataProcessResult<ISecretsService>> {
    const providerType = this.resolveProviderType(path);

    // Check cache
    const cached = this.cache.get(providerType);
    if (cached) {
      const healthy = await this.healthCheck(cached);
      if (healthy) return DataProcessResult.success(cached);
      this.cache.delete(providerType);
    }

    // Create from registry
    const result = await this.createProvider(providerType as SecretsProviderType);
    if (result.isSuccess) return result;

    // Fallback
    const fallback = this.config.fallbackProvider;
    if (fallback && fallback !== providerType) {
      const fallbackResult = await this.createProvider(fallback as SecretsProviderType);
      if (fallbackResult.isSuccess) return fallbackResult;
    }

    return DataProcessResult.failure(
      'RESOLVE_FAILED',
      `Cannot resolve secrets provider. Primary='${providerType}', ` +
        `Fallback='${fallback ?? 'none'}'. Error: ${result.errorMessage}`,
    );
  }

  /**
   * Determine which provider type should handle a given path.
   * Checks path-prefix overrides (longest match wins), then falls back to default.
   */
  resolveProviderType(path?: string): string {
    if (!path || !this.config.overrides) {
      return this.config.defaultProvider;
    }

    // Find the longest matching prefix override
    let bestMatch = '';
    let bestProvider = this.config.defaultProvider;

    for (const [prefix, provider] of Object.entries(this.config.overrides)) {
      // Strip trailing wildcard for comparison
      const cleanPrefix = prefix.replace(/\*$/, '');
      if (path.startsWith(cleanPrefix) && cleanPrefix.length > bestMatch.length) {
        bestMatch = cleanPrefix;
        bestProvider = provider;
      }
    }

    return bestProvider;
  }

  private async createProvider(
    providerType: SecretsProviderType,
  ): Promise<DataProcessResult<ISecretsService>> {
    const factoryResult = this.registry.getFactory(providerType);
    if (!factoryResult.isSuccess) {
      return DataProcessResult.failure(
        factoryResult.errorCode ?? 'FACTORY_ERROR',
        factoryResult.errorMessage ?? 'Unknown factory error',
      );
    }

    const factoryFn = factoryResult.data!;
    const providerConfig = this.config.providers?.[providerType] ?? {};

    try {
      const provider = await factoryFn(providerConfig);
      const healthy = await this.healthCheck(provider);
      if (!healthy) {
        return DataProcessResult.failure(
          'PROVIDER_UNHEALTHY',
          `Secrets provider '${providerType}' failed health check`,
        );
      }
      this.cache.set(providerType, provider);
      return DataProcessResult.success(provider);
    } catch (err) {
      return DataProcessResult.failure(
        'PROVIDER_CREATE_ERROR',
        `Failed to create secrets provider '${providerType}': ${err}`,
      );
    }
  }

  private async healthCheck(provider: ISecretsService): Promise<boolean> {
    try {
      const result = await provider.healthCheck();
      return result?.isSuccess ?? Boolean(result);
    } catch {
      return false;
    }
  }

  /** Return which provider TYPE a path will resolve to. */
  getProviderForPath(path: string): string {
    return this.resolveProviderType(path);
  }

  /** Return the current override map. */
  getOverrides(): Record<string, string> {
    return { ...(this.config.overrides ?? {}) };
  }

  /** Hot-reload configuration. Clears cached providers. */
  updateConfig(newConfig: SecretsResolverConfig): void {
    this.config = newConfig;
    this.cache.clear();
  }

  /** List currently cached provider types. */
  get cachedProviders(): string[] {
    return Array.from(this.cache.keys());
  }

  /** Clear the provider cache. */
  clearCache(): void {
    this.cache.clear();
  }
}
