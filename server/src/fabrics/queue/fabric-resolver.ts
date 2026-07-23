/**
 * Queue Fabric Resolver — config-driven routing to queue providers.
 *
 * Resolution flow:
 *   1. Check if queue name has a provider override → use that provider type
 *   2. Otherwise use default provider type
 *   3. Check cache → if cached and healthy, return it
 *   4. Create from registry factory → health check → cache → return
 *   5. If create/health fails → try fallback provider
 *   6. If fallback fails → return failure
 *
 * Supports: hot-reload config, cache invalidation, per-queue overrides.
 *
 * Phase 3.1: Resolver pattern. Works with any IQueueService provider.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { IQueueService } from '../interfaces/queue.interface';
import { QueueProviderType } from './base';
import { QueueProviderRegistry } from './provider-registry';

export interface QueueResolverConfig {
  defaultProvider: string;
  fallbackProvider?: string;
  overrides?: Record<string, string>;
  providers?: Record<string, Record<string, unknown>>;
}

@Injectable()
export class QueueFabricResolver {
  private config: QueueResolverConfig;
  private readonly registry: QueueProviderRegistry;
  private defaultProvider: QueueProviderType;
  private fallbackProvider: QueueProviderType | undefined;
  private overrides: Record<string, string>;
  private providerConfigs: Record<string, Record<string, unknown>>;
  private readonly cache = new Map<string, IQueueService>();

  constructor(config: QueueResolverConfig, registry: QueueProviderRegistry) {
    this.config = config;
    this.registry = registry;
    this.defaultProvider = config.defaultProvider as QueueProviderType;
    this.fallbackProvider = config.fallbackProvider
      ? (config.fallbackProvider as QueueProviderType)
      : undefined;
    this.overrides = config.overrides ?? {};
    this.providerConfigs = config.providers ?? {};
  }

  /**
   * Resolve the correct IQueueService for the given queue name.
   */
  async resolve(queueName?: string): Promise<DataProcessResult<IQueueService>> {
    let providerType = this.defaultProvider;

    // Check per-queue overrides
    if (queueName && this.overrides[queueName]) {
      providerType = this.overrides[queueName] as QueueProviderType;
    }

    const cacheKey = `${providerType}:${queueName ?? 'default'}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      const healthy = await this.healthCheck(cached);
      if (healthy) {
        return DataProcessResult.success(cached);
      }
      this.cache.delete(cacheKey);
    }

    // Create from registry
    const result = await this.createProvider(providerType, cacheKey);
    if (result.isSuccess) {
      return result;
    }

    // Fallback
    if (this.fallbackProvider && this.fallbackProvider !== providerType) {
      const fallbackKey = `${this.fallbackProvider}:${queueName ?? 'default'}`;
      const fallbackResult = await this.createProvider(this.fallbackProvider, fallbackKey);
      if (fallbackResult.isSuccess) {
        return fallbackResult;
      }
    }

    return DataProcessResult.failure(
      'RESOLVE_FAILED',
      `Cannot resolve queue provider. Primary='${providerType}', ` +
        `Fallback='${this.fallbackProvider ?? 'none'}'. Error: ${result.errorMessage}`,
    );
  }

  /**
   * Create a provider instance from the registry and cache it.
   */
  private async createProvider(
    providerType: QueueProviderType,
    cacheKey: string,
  ): Promise<DataProcessResult<IQueueService>> {
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
          `Queue provider '${providerType}' failed health check`,
        );
      }
      this.cache.set(cacheKey, provider);
      return DataProcessResult.success(provider);
    } catch (err) {
      return DataProcessResult.failure(
        'PROVIDER_CREATE_ERROR',
        `Failed to create queue provider '${providerType}': ${err}`,
      );
    }
  }

  /**
   * Check if a provider is healthy.
   */
  private async healthCheck(provider: IQueueService): Promise<boolean> {
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
    return true;
  }

  /** Return which provider TYPE a queue will resolve to. */
  getProviderForQueue(queueName: string): string {
    return this.overrides[queueName] ?? this.defaultProvider;
  }

  /** Return the current override map. */
  getOverrides(): Record<string, string> {
    return { ...this.overrides };
  }

  /**
   * Hot-reload configuration. Clears cached providers.
   */
  updateConfig(newConfig: QueueResolverConfig): void {
    this.config = newConfig;
    this.defaultProvider = newConfig.defaultProvider as QueueProviderType;
    this.fallbackProvider = newConfig.fallbackProvider
      ? (newConfig.fallbackProvider as QueueProviderType)
      : undefined;
    this.overrides = newConfig.overrides ?? {};
    this.providerConfigs = newConfig.providers ?? {};
    this.cache.clear();
  }

  /** List currently cached keys. */
  get cachedProviders(): string[] {
    return Array.from(this.cache.keys());
  }

  /** Clear the provider cache. */
  clearCache(): void {
    this.cache.clear();
  }
}
