/**
 * FactoryResolutionContext — context for factory creation.
 *
 * Passed to IExternalServiceFactory.createAsync() for config-first routing:
 *   1. Read config (from FREEDOM layer)
 *   2. Resolve from registry
 *   3. Validate capability
 *   4. Health check
 *   5. Fallback on failure
 *   6. Escalate if all fail
 *
 * Phase 6.1: Foundation type.
 */

import { FabricType } from './fabric-type';

export interface FactoryResolutionContext {
  /** Tenant requesting the resolution. */
  readonly tenantId: string;
  /** Factory identifier (F166, F167, ...). */
  readonly factoryId: string;
  /** Interface name (IInventoryService, IMatchingService, ...). */
  readonly interfaceName: string;
  /** Which fabric this factory resolves through. */
  readonly fabricType: FabricType;
  /** Preferred provider (e.g., 'postgresql', 'redis_streams'). Optional. */
  readonly provider?: string;
  /** Additional config hints (e.g., { index: 'orders' } for DB). */
  readonly config: Record<string, unknown>;
  /** Fallback providers to try if primary fails. */
  readonly fallbackProviders: readonly string[];
}

/** Create a FactoryResolutionContext with sensible defaults. */
export function createResolutionContext(
  overrides: Partial<FactoryResolutionContext> & {
    tenantId: string;
    factoryId: string;
    interfaceName: string;
    fabricType: FabricType;
  },
): FactoryResolutionContext {
  return {
    config: {},
    fallbackProviders: [],
    ...overrides,
  };
}

/** Serialize context to dict (DNA-1). */
export function resolutionContextToDict(ctx: FactoryResolutionContext): Record<string, unknown> {
  return {
    tenant_id: ctx.tenantId,
    factory_id: ctx.factoryId,
    interface_name: ctx.interfaceName,
    fabric_type: ctx.fabricType,
    provider: ctx.provider ?? null,
    config: { ...ctx.config },
    fallback_providers: [...ctx.fallbackProviders],
  };
}
