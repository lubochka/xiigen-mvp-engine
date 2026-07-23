/**
 * FactoryRegistry — in-memory catalog of factory entries.
 *
 * Stores FactoryRegistryEntry objects keyed by factoryId.
 * Supports lookup by family, fabric type, status.
 * In production, backed by Database Fabric (Elasticsearch).
 *
 * DNA-1: All returns use dict payloads.
 * DNA-3: All methods return DataProcessResult.
 *
 * Phase 6.1: Foundation service.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { FabricType } from './fabric-type';
import { FactoryRegistryEntry, registryEntryToDict } from './factory-interfaces';

@Injectable()
export class FactoryRegistry {
  private readonly entries = new Map<string, FactoryRegistryEntry>();

  /**
   * Register a new factory entry. Rejects duplicates.
   */
  register(entry: FactoryRegistryEntry): DataProcessResult<boolean> {
    if (!entry.factoryId) {
      return DataProcessResult.failure('INVALID_ENTRY', 'factoryId is required');
    }
    if (this.entries.has(entry.factoryId)) {
      return DataProcessResult.failure(
        'FACTORY_EXISTS',
        `Factory ${entry.factoryId} already registered`,
      );
    }
    this.entries.set(entry.factoryId, entry);
    return DataProcessResult.success(true);
  }

  /**
   * Get a factory entry by ID.
   */
  get(factoryId: string): DataProcessResult<FactoryRegistryEntry> {
    const entry = this.entries.get(factoryId);
    if (!entry) {
      return DataProcessResult.failure('FACTORY_NOT_FOUND', `Factory ${factoryId} not in registry`);
    }
    return DataProcessResult.success(entry);
  }

  /**
   * Find all factories in a given family.
   */
  findByFamily(familyId: string): FactoryRegistryEntry[] {
    return [...this.entries.values()].filter((e) => e.familyId === familyId);
  }

  /**
   * Find all factories that resolve through a given fabric.
   */
  findByFabric(fabricType: FabricType): FactoryRegistryEntry[] {
    return [...this.entries.values()].filter((e) => e.fabricType === fabricType);
  }

  /**
   * Find all factories with a given status.
   */
  findByStatus(status: string): FactoryRegistryEntry[] {
    return [...this.entries.values()].filter((e) => e.status === status);
  }

  /**
   * Update the status of a factory entry (promotion ladder).
   */
  updateStatus(factoryId: string, newStatus: string): DataProcessResult<boolean> {
    const entry = this.entries.get(factoryId);
    if (!entry) {
      return DataProcessResult.failure('FACTORY_NOT_FOUND', `Factory ${factoryId} not found`);
    }
    entry.status = newStatus;
    return DataProcessResult.success(true);
  }

  /**
   * Check if a factory is registered.
   */
  has(factoryId: string): boolean {
    return this.entries.has(factoryId);
  }

  /**
   * List all factory entries as dicts (DNA-1).
   */
  listAll(): Array<Record<string, unknown>> {
    return [...this.entries.values()].map(registryEntryToDict);
  }

  /**
   * List all factory IDs.
   */
  listIds(): string[] {
    return [...this.entries.keys()];
  }

  /**
   * Number of registered factories.
   */
  get count(): number {
    return this.entries.size;
  }

  /**
   * Clear all entries (for testing).
   */
  clear(): void {
    this.entries.clear();
  }
}
