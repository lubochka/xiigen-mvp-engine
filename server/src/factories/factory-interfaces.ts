/**
 * IExternalServiceFactory — universal factory interface.
 * Every external dependency resolved through createAsync().
 *
 * FactoryRegistryEntry — metadata about a registered factory.
 *
 * Phase 6.1: Foundation types.
 */

import { DataProcessResult } from '../kernel/data-process-result';
import { FabricType } from './fabric-type';
import { FactoryResolutionContext } from './resolution-context';

// ── IExternalServiceFactory ──────────────────────────

/**
 * Universal factory interface.
 * Every dependency the engine generates is resolved through createAsync().
 * Config-first routing: read config → resolve → validate → health check → fallback → escalate.
 */
export abstract class IExternalServiceFactory<TService> {
  /**
   * Create/resolve a service instance via config-first routing.
   * The context contains tenantId, factoryId, fabricType, config hints.
   */
  abstract createAsync(context: FactoryResolutionContext): Promise<DataProcessResult<TService>>;

  /**
   * Check if the target provider is healthy.
   */
  abstract healthCheck(
    context: FactoryResolutionContext,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

// ── FactoryRegistryEntry ─────────────────────────────

/**
 * Metadata about a factory registered in the system catalog.
 * Stored in FactoryRegistry, queried by factoryId/family/fabric.
 */
export interface FactoryRegistryEntry {
  /** Factory identifier (F1, F166, ...). */
  readonly factoryId: string;
  /** Interface name (IInventoryService, IMatchingService, ...). */
  readonly interfaceName: string;
  /** Family grouping (Family-01, Family-25, ...). */
  readonly familyId: string;
  /** Which fabric this factory resolves through. */
  readonly fabricType: FabricType;
  /** Provider identifier (postgresql, redis_streams, stub, ...). */
  readonly provider: string;
  /** Human-readable description. */
  readonly description: string;
  /** Method signatures exposed by this factory. */
  readonly methods: readonly string[];
  /** Status in the promotion ladder. */
  status: string;
  /** Version string. */
  readonly version: string;
  /** Additional config. */
  readonly config: Record<string, unknown>;
}

/** Create a FactoryRegistryEntry with defaults. */
export function createRegistryEntry(
  overrides: Partial<FactoryRegistryEntry> & {
    factoryId: string;
    interfaceName: string;
    familyId: string;
    fabricType: FabricType;
  },
): FactoryRegistryEntry {
  return {
    provider: 'stub',
    description: '',
    methods: [],
    status: 'PLANNED',
    version: '1.0.0',
    config: {},
    ...overrides,
  };
}

/** Serialize FactoryRegistryEntry to dict (DNA-1 snake_case). */
export function registryEntryToDict(entry: FactoryRegistryEntry): Record<string, unknown> {
  return {
    factory_id: entry.factoryId,
    interface_name: entry.interfaceName,
    family_id: entry.familyId,
    fabric_type: entry.fabricType,
    provider: entry.provider,
    description: entry.description,
    methods: [...entry.methods],
    status: entry.status,
    version: entry.version,
    config: { ...entry.config },
  };
}
