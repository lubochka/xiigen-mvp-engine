/**
 * Database Provider Registry — knows which IDatabaseService implementations exist.
 *
 * Register provider factories (async functions that create providers from config).
 * Lookup by provider type. Returns DataProcessResult on failures.
 *
 * Phase 3.1: Registry pattern. Concrete factories registered in P3.5.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { IDatabaseService } from '../interfaces/database.interface';
import { DatabaseProviderType } from './base';

/** Factory function: takes provider config → returns IDatabaseService. */
export type DatabaseProviderFactory = (
  config: Record<string, unknown>,
) => Promise<IDatabaseService>;

@Injectable()
export class DatabaseProviderRegistry {
  private readonly factories = new Map<DatabaseProviderType, DatabaseProviderFactory>();
  private readonly metadata = new Map<DatabaseProviderType, Record<string, unknown>>();

  /**
   * Register a provider factory. Idempotent — overwrites previous registration.
   */
  register(
    providerType: DatabaseProviderType,
    factory: DatabaseProviderFactory,
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
  getFactory(providerType: DatabaseProviderType): DataProcessResult<DatabaseProviderFactory> {
    const factory = this.factories.get(providerType);
    if (!factory) {
      const available = this.listProviders();
      return DataProcessResult.failure(
        'PROVIDER_NOT_FOUND',
        `Provider '${providerType}' not registered. Available: [${available.join(', ')}]`,
      );
    }
    return DataProcessResult.success(factory);
  }

  /** List all registered provider type names. */
  listProviders(): DatabaseProviderType[] {
    return Array.from(this.factories.keys());
  }

  /** Get metadata for a provider type. */
  getMetadata(providerType: DatabaseProviderType): Record<string, unknown> {
    return this.metadata.get(providerType) ?? {};
  }

  /** Check if a provider type is registered. */
  isRegistered(providerType: DatabaseProviderType): boolean {
    return this.factories.has(providerType);
  }

  /** Number of registered providers. */
  get count(): number {
    return this.factories.size;
  }
}
