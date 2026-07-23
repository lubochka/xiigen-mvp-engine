/**
 * Database Fabric Resolver — config-driven routing to database providers.
 *
 * Resolution flow:
 *   1. Check if index has a provider override → use that provider type
 *   2. Otherwise use default provider type
 *   3. Check cache → if cached and healthy, return it
 *   4. Create from registry factory → health check → cache → return
 *   5. If create/health fails → try fallback provider
 *   6. If fallback fails → return failure
 *
 * Supports: hot-reload config, cache invalidation, per-index overrides.
 *
 * Phase 3.1: Resolver pattern. Works with any IDatabaseService provider.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { IDatabaseService } from '../interfaces/database.interface';
import { DatabaseProviderType } from './base';
import { DatabaseProviderRegistry } from './provider-registry';

export interface DatabaseResolverConfig {
  defaultProvider: string;
  fallbackProvider?: string;
  overrides?: Record<string, string>;
  providers?: Record<string, Record<string, unknown>>;
}

@Injectable()
export class DatabaseFabricResolver {
  private config: DatabaseResolverConfig;
  private readonly registry: DatabaseProviderRegistry;
  private defaultProvider: DatabaseProviderType;
  private fallbackProvider: DatabaseProviderType | undefined;
  private overrides: Record<string, string>;
  private providerConfigs: Record<string, Record<string, unknown>>;
  private readonly cache = new Map<string, IDatabaseService>();

  constructor(config: DatabaseResolverConfig, registry: DatabaseProviderRegistry) {
    this.config = config;
    this.registry = registry;
    this.defaultProvider = config.defaultProvider as DatabaseProviderType;
    this.fallbackProvider = config.fallbackProvider
      ? (config.fallbackProvider as DatabaseProviderType)
      : undefined;
    this.overrides = config.overrides ?? {};
    this.providerConfigs = config.providers ?? {};
  }

  /**
   * Resolve the correct IDatabaseService for the given index.
   * Uses config to determine provider type, then creates/caches it.
   */
  async resolve(index?: string): Promise<DataProcessResult<IDatabaseService>> {
    let providerType = this.defaultProvider;

    // Check per-index overrides
    if (index && this.overrides[index]) {
      providerType = this.overrides[index] as DatabaseProviderType;
    }

    // Check cache
    const cached = this.cache.get(providerType);
    if (cached) {
      const healthy = await this.healthCheck(cached);
      if (healthy) {
        return DataProcessResult.success(cached);
      }
      // Unhealthy — remove from cache and re-create
      this.cache.delete(providerType);
    }

    // Create from registry
    const result = await this.createProvider(providerType);
    if (result.isSuccess) {
      return result;
    }

    // Fallback
    if (this.fallbackProvider && this.fallbackProvider !== providerType) {
      const fallbackResult = await this.createProvider(this.fallbackProvider);
      if (fallbackResult.isSuccess) {
        return fallbackResult;
      }
    }

    return DataProcessResult.failure(
      'RESOLVE_FAILED',
      `Cannot resolve provider. Primary='${providerType}', ` +
        `Fallback='${this.fallbackProvider ?? 'none'}'. Error: ${result.errorMessage}`,
    );
  }

  /**
   * Create a provider instance from the registry and cache it.
   */
  private async createProvider(
    providerType: DatabaseProviderType,
  ): Promise<DataProcessResult<IDatabaseService>> {
    const factoryResult = this.registry.getFactory(providerType);
    if (!factoryResult.isSuccess) {
      return DataProcessResult.failure(
        factoryResult.errorCode ?? 'FACTORY_ERROR',
        factoryResult.errorMessage ?? 'Unknown factory error',
      );
    }

    const factoryFn = factoryResult.data!;
    const providerConfig = this.providerConfigs[providerType] ?? {};

    try {
      const provider = await factoryFn(providerConfig);
      const healthy = await this.healthCheck(provider);
      if (!healthy) {
        return DataProcessResult.failure(
          'PROVIDER_UNHEALTHY',
          `Provider '${providerType}' failed health check`,
        );
      }
      this.cache.set(providerType, provider);
      return DataProcessResult.success(provider);
    } catch (err) {
      return DataProcessResult.failure(
        'PROVIDER_CREATE_ERROR',
        `Failed to create provider '${providerType}': ${err}`,
      );
    }
  }

  /**
   * Check if a provider is healthy.
   */
  private async healthCheck(provider: IDatabaseService): Promise<boolean> {
    const providerWithHealth = provider as unknown as Record<string, unknown>;
    if (typeof providerWithHealth['healthCheck'] === 'function') {
      try {
        const result = await (
          providerWithHealth['healthCheck'] as () => Promise<{ isSuccess?: boolean } | boolean>
        )();
        return (result as { isSuccess?: boolean })?.isSuccess ?? Boolean(result);
      } catch {
        return false;
      }
    }
    // No health check method → assume healthy
    return true;
  }

  /** Return which provider TYPE an index will resolve to. */
  getProviderForIndex(index: string): string {
    return this.overrides[index] ?? this.defaultProvider;
  }

  /** Return the current override map. */
  getOverrides(): Record<string, string> {
    return { ...this.overrides };
  }

  /**
   * Hot-reload configuration. Clears cached providers.
   */
  updateConfig(newConfig: DatabaseResolverConfig): void {
    this.config = newConfig;
    this.defaultProvider = newConfig.defaultProvider as DatabaseProviderType;
    this.fallbackProvider = newConfig.fallbackProvider
      ? (newConfig.fallbackProvider as DatabaseProviderType)
      : undefined;
    this.overrides = newConfig.overrides ?? {};
    this.providerConfigs = newConfig.providers ?? {};
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
