/**
 * Flow Engine Fabric Resolver — config-driven routing to flow engine providers.
 *
 * Resolves BOTH IFlowDefinition (store) and IFlowOrchestrator (executor) as a pair.
 * Currently only InMemory; extensible for future ES-backed store.
 * Supports: caching, hot-reload config.
 *
 * Phase 5.3: Resolver pattern for flow engine.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { IFlowDefinition, IFlowOrchestrator } from '../interfaces/flow-orchestrator.interface';

/** Factory that creates both store + orchestrator as a pair. */
export type FlowEngineFactory = (
  config: Record<string, unknown>,
) => Promise<{ store: IFlowDefinition; orchestrator: IFlowOrchestrator }>;

export interface FlowResolverConfig {
  /** Default provider identifier (e.g., 'in_memory', 'elasticsearch'). */
  defaultProvider: string;
  /** Fallback provider if default fails. */
  fallbackProvider?: string;
  /** Per-provider config blocks. */
  providers?: Record<string, Record<string, unknown>>;
}

/** Resolved pair of flow engine components. */
export interface FlowEnginePair {
  store: IFlowDefinition;
  orchestrator: IFlowOrchestrator;
}

@Injectable()
export class FlowFabricResolver {
  private config: FlowResolverConfig;
  private readonly factories = new Map<string, FlowEngineFactory>();
  private readonly cache = new Map<string, FlowEnginePair>();

  constructor(config: FlowResolverConfig) {
    this.config = config;
  }

  /**
   * Register a flow engine factory by name.
   */
  registerProvider(name: string, factory: FlowEngineFactory): DataProcessResult<boolean> {
    this.factories.set(name, factory);
    return DataProcessResult.success(true);
  }

  /**
   * Resolve the flow engine pair (store + orchestrator).
   */
  async resolve(): Promise<DataProcessResult<FlowEnginePair>> {
    const providerName = this.config.defaultProvider;

    // Check cache
    const cached = this.cache.get(providerName);
    if (cached) {
      return DataProcessResult.success(cached);
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
      `Cannot resolve flow engine provider. Primary='${providerName}', ` +
        `Fallback='${this.config.fallbackProvider ?? 'none'}'. Error: ${result.errorMessage}`,
    );
  }

  /**
   * Resolve just the store.
   */
  async resolveStore(): Promise<DataProcessResult<IFlowDefinition>> {
    const result = await this.resolve();
    if (!result.isSuccess)
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    return DataProcessResult.success(result.data!.store);
  }

  /**
   * Resolve just the orchestrator.
   */
  async resolveOrchestrator(): Promise<DataProcessResult<IFlowOrchestrator>> {
    const result = await this.resolve();
    if (!result.isSuccess)
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    return DataProcessResult.success(result.data!.orchestrator);
  }

  private async createProvider(name: string): Promise<DataProcessResult<FlowEnginePair>> {
    const factory = this.factories.get(name);
    if (!factory) {
      const available = Array.from(this.factories.keys());
      return DataProcessResult.failure(
        'PROVIDER_NOT_FOUND',
        `Flow engine provider '${name}' not registered. Available: [${available.join(', ')}]`,
      );
    }

    const providerConfig = this.config.providers?.[name] ?? {};

    try {
      const pair = await factory(providerConfig);
      this.cache.set(name, pair);
      return DataProcessResult.success(pair);
    } catch (err) {
      return DataProcessResult.failure(
        'PROVIDER_CREATE_ERROR',
        `Failed to create flow engine provider '${name}': ${err}`,
      );
    }
  }

  /** Hot-reload configuration. Clears cached providers. */
  updateConfig(newConfig: FlowResolverConfig): void {
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
