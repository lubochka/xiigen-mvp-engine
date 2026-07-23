/**
 * Secrets Provider Registry — knows which ISecretsService implementations exist.
 *
 * Register provider factories (async functions that create providers from config).
 * Lookup by provider type. Returns DataProcessResult on failures.
 *
 * Phase 5.3: Registry pattern. Same as DatabaseProviderRegistry / QueueProviderRegistry.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { ISecretsService } from '../interfaces/secrets.interface';
import { SecretsProviderType } from './base';

/** Factory function: takes provider config → returns ISecretsService. */
export type SecretsProviderFactory = (config: Record<string, unknown>) => Promise<ISecretsService>;

@Injectable()
export class SecretsProviderRegistry {
  private readonly factories = new Map<SecretsProviderType, SecretsProviderFactory>();
  private readonly metadata = new Map<SecretsProviderType, Record<string, unknown>>();

  /**
   * Register a provider factory. Idempotent — overwrites previous registration.
   */
  register(
    providerType: SecretsProviderType,
    factory: SecretsProviderFactory,
    meta?: Record<string, unknown>,
  ): DataProcessResult<boolean> {
    this.factories.set(providerType, factory);
    this.metadata.set(providerType, meta ?? {});
    return DataProcessResult.success(true);
  }

  /**
   * Get the factory function for a provider type.
   * Returns failure if not registered.
   */
  getFactory(providerType: SecretsProviderType): DataProcessResult<SecretsProviderFactory> {
    const factory = this.factories.get(providerType);
    if (!factory) {
      const available = this.listProviders();
      return DataProcessResult.failure(
        'PROVIDER_NOT_FOUND',
        `Secrets provider '${providerType}' not registered. Available: [${available.join(', ')}]`,
      );
    }
    return DataProcessResult.success(factory);
  }

  /** List all registered provider type names. */
  listProviders(): SecretsProviderType[] {
    return Array.from(this.factories.keys());
  }

  /** Get metadata for a provider type. */
  getMetadata(providerType: SecretsProviderType): Record<string, unknown> {
    return this.metadata.get(providerType) ?? {};
  }

  /** Check if a provider type is registered. */
  isRegistered(providerType: SecretsProviderType): boolean {
    return this.factories.has(providerType);
  }

  /** Number of registered providers. */
  get count(): number {
    return this.factories.size;
  }
}
