/**
 * Queue Provider Registry — knows which IQueueService implementations exist.
 *
 * Register provider factories (async functions that create providers from config).
 * Lookup by provider type. Returns DataProcessResult on failures.
 *
 * Phase 3.1: Registry pattern. Concrete factories registered in P3.5.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { IQueueService } from '../interfaces/queue.interface';
import { QueueProviderType } from './base';

/** Factory function: takes provider config → returns IQueueService. */
export type QueueProviderFactory = (config: Record<string, unknown>) => Promise<IQueueService>;

@Injectable()
export class QueueProviderRegistry {
  private readonly factories = new Map<QueueProviderType, QueueProviderFactory>();
  private readonly metadata = new Map<QueueProviderType, Record<string, unknown>>();

  /**
   * Register a provider factory. Idempotent — overwrites previous registration.
   */
  register(
    providerType: QueueProviderType,
    factory: QueueProviderFactory,
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
  getFactory(providerType: QueueProviderType): DataProcessResult<QueueProviderFactory> {
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
  listProviders(): QueueProviderType[] {
    return Array.from(this.factories.keys());
  }

  /** Get metadata for a provider type. */
  getMetadata(providerType: QueueProviderType): Record<string, unknown> {
    return this.metadata.get(providerType) ?? {};
  }

  /** Check if a provider type is registered. */
  isRegistered(providerType: QueueProviderType): boolean {
    return this.factories.has(providerType);
  }

  /** Number of registered providers. */
  get count(): number {
    return this.factories.size;
  }
}
