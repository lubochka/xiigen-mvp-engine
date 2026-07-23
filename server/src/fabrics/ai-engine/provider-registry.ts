/**
 * AI Provider Registry — catalog of AI provider factory functions.
 * Same pattern as DatabaseProviderRegistry and QueueProviderRegistry.
 *
 * Keyed by provider type string (AiProviderType values).
 * Each entry can optionally store associated ModelProfile list.
 *
 * Phase 4.1: Registry pattern. Factories registered in P4.5.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { IAiProvider } from '../interfaces/ai-provider.interface';
import { ModelProfile } from './base';

/** Factory function: takes provider config → returns IAiProvider. */
export type AiProviderFactory = (config: Record<string, unknown>) => Promise<IAiProvider>;

@Injectable()
export class AiProviderRegistry {
  private readonly factories = new Map<string, AiProviderFactory>();
  private readonly profiles = new Map<string, ModelProfile[]>();
  private readonly metadata = new Map<string, Record<string, unknown>>();

  /**
   * Register a provider factory. Idempotent — overwrites previous.
   */
  register(
    providerType: string,
    factory: AiProviderFactory,
    modelProfiles?: ModelProfile[],
    meta?: Record<string, unknown>,
  ): DataProcessResult<boolean> {
    this.factories.set(providerType, factory);
    this.profiles.set(providerType, modelProfiles ?? []);
    this.metadata.set(providerType, meta ?? {});
    return DataProcessResult.success(true);
  }

  /**
   * Get the factory function for a provider type.
   */
  getFactory(providerType: string): DataProcessResult<AiProviderFactory> {
    const factory = this.factories.get(providerType);
    if (!factory) {
      const available = this.listProviders();
      return DataProcessResult.failure(
        'PROVIDER_NOT_FOUND',
        `AI provider '${providerType}' not registered. Available: [${available.join(', ')}]`,
      );
    }
    return DataProcessResult.success(factory);
  }

  /** Get model profiles associated with a provider. */
  getProfiles(providerType: string): ModelProfile[] {
    return this.profiles.get(providerType) ?? [];
  }

  /** List all registered provider type names. */
  listProviders(): string[] {
    return Array.from(this.factories.keys());
  }

  /** Get metadata for a provider. */
  getMetadata(providerType: string): Record<string, unknown> {
    return this.metadata.get(providerType) ?? {};
  }

  /** Check if a provider type is registered. */
  isRegistered(providerType: string): boolean {
    return this.factories.has(providerType);
  }

  /** Number of registered providers. */
  get count(): number {
    return this.factories.size;
  }

  /** Get all model profiles across all providers. */
  getAllProfiles(): ModelProfile[] {
    const all: ModelProfile[] = [];
    for (const profiles of this.profiles.values()) {
      all.push(...profiles);
    }
    return all;
  }
}
