/**
 * AI Fabric Resolver — config-driven AI provider routing.
 * Same pattern as DatabaseFabricResolver and QueueFabricResolver.
 *
 * Resolution:
 *   1. Check if model_id has a provider override → use that provider type
 *   2. Otherwise use default provider type
 *   3. Check cache → if cached and healthy, return it
 *   4. Create from registry → health check → cache → return
 *   5. If fail → try fallback
 *
 * Phase 4.1: Resolver pattern. Works with any IAiProvider.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { IAiProvider } from '../interfaces/ai-provider.interface';
import { AiProviderRegistry } from './provider-registry';

export interface AiResolverConfig {
  defaultProvider: string;
  fallbackProvider?: string;
  /** Maps model_id → provider_type. E.g. { 'claude-opus-4-5': 'anthropic', 'gpt-5': 'openai' } */
  modelRouting?: Record<string, string>;
  providers?: Record<string, Record<string, unknown>>;
}

@Injectable()
export class AiFabricResolver {
  private config: AiResolverConfig;
  private readonly registry: AiProviderRegistry;
  private defaultProvider: string;
  private fallbackProvider: string | undefined;
  private modelRouting: Record<string, string>;
  private providerConfigs: Record<string, Record<string, unknown>>;
  private readonly cache = new Map<string, IAiProvider>();

  constructor(config: AiResolverConfig, registry: AiProviderRegistry) {
    this.config = config;
    this.registry = registry;
    this.defaultProvider = config.defaultProvider;
    this.fallbackProvider = config.fallbackProvider;
    this.modelRouting = config.modelRouting ?? {};
    this.providerConfigs = config.providers ?? {};
  }

  /**
   * Resolve the correct IAiProvider for a given model ID.
   */
  async resolve(modelId?: string): Promise<DataProcessResult<IAiProvider>> {
    let providerType = this.defaultProvider;

    // Check model-specific routing
    if (modelId && this.modelRouting[modelId]) {
      providerType = this.modelRouting[modelId];
    }

    // Check cache
    const cached = this.cache.get(providerType);
    if (cached) {
      const healthy = await this.healthCheck(cached);
      if (healthy) {
        return DataProcessResult.success(cached);
      }
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
      `Cannot resolve AI provider. Primary='${providerType}', ` +
        `Fallback='${this.fallbackProvider ?? 'none'}'. Error: ${result.errorMessage}`,
    );
  }

  private async createProvider(providerType: string): Promise<DataProcessResult<IAiProvider>> {
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
          `AI provider '${providerType}' failed health check`,
        );
      }
      this.cache.set(providerType, provider);
      return DataProcessResult.success(provider);
    } catch (err) {
      return DataProcessResult.failure(
        'PROVIDER_CREATE_ERROR',
        `Failed to create AI provider '${providerType}': ${err}`,
      );
    }
  }

  private async healthCheck(provider: IAiProvider): Promise<boolean> {
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

  /** Return which provider a model will resolve to. */
  getProviderForModel(modelId: string): string {
    return this.modelRouting[modelId] ?? this.defaultProvider;
  }

  /** Return the current model routing map. */
  getModelRouting(): Record<string, string> {
    return { ...this.modelRouting };
  }

  /** Hot-reload configuration. Clears cache. */
  updateConfig(newConfig: AiResolverConfig): void {
    this.config = newConfig;
    this.defaultProvider = newConfig.defaultProvider;
    this.fallbackProvider = newConfig.fallbackProvider;
    this.modelRouting = newConfig.modelRouting ?? {};
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
