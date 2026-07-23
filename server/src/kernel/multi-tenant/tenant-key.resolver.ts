/**
 * TenantKeyResolver — Per-tenant API key resolution.
 *
 * Given a provider name (e.g., "anthropic") + tenantId → returns the tenant's
 * API key, or system fallback key. This is how each tenant can bring their own AI keys.
 *
 * Reads TenantContext from AsyncLocalStorage — no tenant_id parameter needed.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { TenantContext, TENANT_CONTEXT_KEY } from './tenant-context';
import { DataProcessResult } from '../data-process-result';

@Injectable()
export class TenantKeyResolver {
  /** System-wide fallback keys (used when tenant has no key for a provider). */
  private readonly systemKeys = new Map<string, string>();

  constructor(private readonly cls: ClsService) {}

  /**
   * Get an API key for a provider.
   *
   * Resolution order:
   * 1. Tenant-specific key (from TenantContext.apiKeys)
   * 2. System fallback key
   * 3. undefined (no key available)
   */
  getKey(provider: string): string | undefined {
    const tenant = this.getCurrentTenant();

    // Try tenant key first
    if (tenant) {
      const tenantKey = tenant.getApiKey(provider);
      if (tenantKey) {
        return tenantKey;
      }
    }

    // Fall back to system key
    return this.systemKeys.get(provider);
  }

  /**
   * Get key with resolution metadata (for logging/debugging).
   */
  getKeyWithSource(provider: string): DataProcessResult<{
    key: string | undefined;
    source: 'tenant' | 'system' | 'none';
    tenantId?: string;
  }> {
    const tenant = this.getCurrentTenant();

    if (tenant) {
      const tenantKey = tenant.getApiKey(provider);
      if (tenantKey) {
        return DataProcessResult.success({
          key: tenantKey,
          source: 'tenant',
          tenantId: tenant.tenantId,
        });
      }
    }

    const systemKey = this.systemKeys.get(provider);
    if (systemKey) {
      return DataProcessResult.success({
        key: systemKey,
        source: 'system',
        tenantId: tenant?.tenantId,
      });
    }

    return DataProcessResult.success({
      key: undefined,
      source: 'none',
      tenantId: tenant?.tenantId,
    });
  }

  /**
   * Require a key — returns DataProcessResult.failure if no key is available.
   * Use this in providers that cannot function without an API key.
   */
  requireKey(provider: string): DataProcessResult<string> {
    const key = this.getKey(provider);
    if (!key) {
      const tenant = this.getCurrentTenant();
      const tenantInfo = tenant ? ` (tenant: ${tenant.tenantId})` : '';
      return DataProcessResult.failure(
        'NO_API_KEY',
        `No API key available for provider '${provider}'${tenantInfo}. ` +
          'Configure a tenant-specific key or set a system fallback.',
      );
    }
    return DataProcessResult.success(key);
  }

  /** Set a system-wide fallback key for a provider. */
  setSystemKey(provider: string, key: string): void {
    this.systemKeys.set(provider, key);
  }

  /** Set multiple system keys at once. */
  setSystemKeys(keys: Record<string, string>): void {
    for (const [provider, key] of Object.entries(keys)) {
      this.systemKeys.set(provider, key);
    }
  }

  /** List providers that have system-level keys configured. */
  listSystemProviders(): string[] {
    return Array.from(this.systemKeys.keys());
  }

  private getCurrentTenant(): TenantContext | undefined {
    try {
      return this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
    } catch {
      return undefined;
    }
  }
}
