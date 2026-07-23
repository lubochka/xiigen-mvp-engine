/**
 * RAG Fabric Resolver — config-driven routing to RAG providers.
 *
 * Simpler than DB/Queue resolvers — currently only InMemory provider.
 * Extensible for future Pinecone, Weaviate, Neo4j providers.
 * Supports: strategy selection, caching, hot-reload config.
 *
 * Phase 5.3: Same resolver pattern as DatabaseFabricResolver.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { IRagService } from '../interfaces/rag.interface';
import { RagStrategy } from './base';

/** Factory function: takes config → returns IRagService. */
export type RagProviderFactory = (config: Record<string, unknown>) => Promise<IRagService>;

export interface RagResolverConfig {
  /** Default provider identifier (e.g., 'in_memory', 'pinecone'). */
  defaultProvider: string;
  /** Fallback provider if default fails. */
  fallbackProvider?: string;
  /** RAG strategy to use. */
  strategy?: string;
  /** Per-namespace overrides: { 'skills': 'pinecone', 'prompts': 'in_memory' } */
  overrides?: Record<string, string>;
  /** Per-provider config blocks. */
  providers?: Record<string, Record<string, unknown>>;
}

@Injectable()
export class RagFabricResolver {
  private config: RagResolverConfig;
  private readonly factories = new Map<string, RagProviderFactory>();
  private readonly cache = new Map<string, IRagService>();

  constructor(config: RagResolverConfig) {
    this.config = config;
  }

  /**
   * Register a provider factory by name.
   */
  registerProvider(name: string, factory: RagProviderFactory): DataProcessResult<boolean> {
    this.factories.set(name, factory);
    return DataProcessResult.success(true);
  }

  /**
   * Resolve the correct IRagService for the given namespace.
   * Uses config to determine provider, then creates/caches it.
   */
  async resolve(namespace?: string): Promise<DataProcessResult<IRagService>> {
    let providerName = this.config.defaultProvider;

    // Check per-namespace overrides
    if (namespace && this.config.overrides?.[namespace]) {
      providerName = this.config.overrides[namespace];
    }

    // Check cache
    const cached = this.cache.get(providerName);
    if (cached) {
      const healthy = await this.healthCheck(cached);
      if (healthy) return DataProcessResult.success(cached);
      this.cache.delete(providerName);
    }

    // Create from factory
    const result = await this.createProvider(providerName);
    if (result.isSuccess) return result;

    // Fallback
    if (this.config.fallbackProvider && this.config.fallbackProvider !== providerName) {
      const fallbackResult = await this.createProvider(this.config.fallbackProvider);
      if (fallbackResult.isSuccess) return fallbackResult;
    }

    return DataProcessResult.failure(
      'RESOLVE_FAILED',
      `Cannot resolve RAG provider. Primary='${providerName}', ` +
        `Fallback='${this.config.fallbackProvider ?? 'none'}'. Error: ${result.errorMessage}`,
    );
  }

  private async createProvider(name: string): Promise<DataProcessResult<IRagService>> {
    const factory = this.factories.get(name);
    if (!factory) {
      const available = Array.from(this.factories.keys());
      return DataProcessResult.failure(
        'PROVIDER_NOT_FOUND',
        `RAG provider '${name}' not registered. Available: [${available.join(', ')}]`,
      );
    }

    const providerConfig = this.config.providers?.[name] ?? {};

    try {
      const provider = await factory(providerConfig);
      this.cache.set(name, provider);
      return DataProcessResult.success(provider);
    } catch (err) {
      return DataProcessResult.failure(
        'PROVIDER_CREATE_ERROR',
        `Failed to create RAG provider '${name}': ${err}`,
      );
    }
  }

  private async healthCheck(provider: IRagService): Promise<boolean> {
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

  /** Get the current strategy from config. */
  getStrategy(): RagStrategy {
    return (this.config.strategy as RagStrategy) ?? RagStrategy.VECTOR;
  }

  /** Return which provider a namespace will resolve to. */
  getProviderForNamespace(namespace: string): string {
    return this.config.overrides?.[namespace] ?? this.config.defaultProvider;
  }

  /** Hot-reload configuration. Clears cached providers. */
  updateConfig(newConfig: RagResolverConfig): void {
    this.config = newConfig;
    this.cache.clear();
  }

  /** List currently cached provider names. */
  get cachedProviders(): string[] {
    return Array.from(this.cache.keys());
  }

  /** Clear the provider cache. */
  clearCache(): void {
    this.cache.clear();
  }

  /** List registered provider names. */
  listRegistered(): string[] {
    return Array.from(this.factories.keys());
  }
}
