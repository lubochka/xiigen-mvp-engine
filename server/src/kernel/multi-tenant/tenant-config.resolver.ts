/**
 * TenantConfigResolver — Per-tenant FREEDOM config resolution.
 *
 * Given a config key + tenantId → returns tenant-specific override if exists,
 * else system default. This is how Tenant-A uses Claude and Tenant-B uses GPT.
 *
 * Reads TenantContext from AsyncLocalStorage — no tenant_id parameter needed.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { TenantContext, TENANT_CONTEXT_KEY } from './tenant-context';
import { DataProcessResult } from '../data-process-result';

@Injectable()
export class TenantConfigResolver {
  /** System-wide defaults. Overridden by tenant-specific values. */
  private readonly systemDefaults = new Map<string, unknown>();

  constructor(private readonly cls: ClsService) {}

  /**
   * Get a config value for the current tenant.
   *
   * Resolution order:
   * 1. Tenant-specific override (from TenantContext.configOverrides)
   * 2. System default (from setSystemDefault)
   * 3. Provided fallback
   * 4. undefined
   */
  get(key: string, fallback?: unknown): unknown {
    // Try tenant override first
    const tenant = this.getCurrentTenant();
    if (tenant) {
      const override = tenant.getConfigOverride(key);
      if (override !== undefined) {
        return override;
      }
    }

    // Fall back to system default
    if (this.systemDefaults.has(key)) {
      return this.systemDefaults.get(key);
    }

    return fallback;
  }

  /**
   * Get config with full resolution context (for debugging/logging).
   * Returns which level the value was resolved from.
   */
  getWithSource(
    key: string,
    fallback?: unknown,
  ): DataProcessResult<{
    value: unknown;
    source: 'tenant_override' | 'system_default' | 'fallback' | 'none';
    tenantId?: string;
  }> {
    const tenant = this.getCurrentTenant();

    // Try tenant override
    if (tenant) {
      const override = tenant.getConfigOverride(key);
      if (override !== undefined) {
        return DataProcessResult.success({
          value: override,
          source: 'tenant_override',
          tenantId: tenant.tenantId,
        });
      }
    }

    // Try system default
    if (this.systemDefaults.has(key)) {
      return DataProcessResult.success({
        value: this.systemDefaults.get(key),
        source: 'system_default',
        tenantId: tenant?.tenantId,
      });
    }

    // Fallback
    if (fallback !== undefined) {
      return DataProcessResult.success({
        value: fallback,
        source: 'fallback',
        tenantId: tenant?.tenantId,
      });
    }

    return DataProcessResult.success({
      value: undefined,
      source: 'none',
      tenantId: tenant?.tenantId,
    });
  }

  /** Set a system-wide default config value. */
  setSystemDefault(key: string, value: unknown): void {
    this.systemDefaults.set(key, value);
  }

  /** Set multiple system defaults at once. */
  setSystemDefaults(defaults: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(defaults)) {
      this.systemDefaults.set(key, value);
    }
  }

  /** Get the current tenant from AsyncLocalStorage, or undefined. */
  private getCurrentTenant(): TenantContext | undefined {
    try {
      return this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
    } catch {
      return undefined;
    }
  }
}
