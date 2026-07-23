/**
 * ScopeEnforcer — Validates that a request tenant matches the resource tenant.
 *
 * DNA-3: never throws — returns DataProcessResult.failure on violation.
 *
 * This is a cross-tenant access guard. Use it when a service receives
 * a resource from storage and needs to confirm the requesting tenant
 * is allowed to access it.
 *
 * P26 FIX-3.
 */

import { DataProcessResult } from '../data-process-result';

export class ScopeEnforcer {
  /**
   * Verify that requestTenantId matches resourceTenantId.
   *
   * @param requestTenantId  — the tenant making the request (from AsyncLocalStorage / header)
   * @param resourceTenantId — the tenant that owns the resource (from stored document)
   * @param resourceId       — the resource identifier (for error context)
   *
   * Returns success(undefined) when the tenants match.
   * Returns failure('SCOPE_VIOLATION', ...) when they do not — never throws.
   */
  static enforceScope(
    requestTenantId: string,
    resourceTenantId: string,
    resourceId: string,
  ): DataProcessResult<void> {
    if (requestTenantId !== resourceTenantId) {
      return DataProcessResult.failure(
        'SCOPE_VIOLATION',
        `Tenant ${requestTenantId} cannot access resource ${resourceId} owned by ${resourceTenantId}`,
      );
    }
    return DataProcessResult.success(undefined);
  }
}
