/**
 * ITenantRegistry — formal interface for tenant registry operations.
 *
 * TenantRegistry implements this. QuotaEnforcer depends on this.
 * MicroserviceBase Component 20 references this.
 *
 * P26 FIX-4.
 */

import { DataProcessResult } from '../data-process-result';
import { TenantRecord } from './tenant-context';

export interface QuotaResult {
  /** Whether the quota check passed. */
  ok: boolean;
  /** How many units remain after this check. */
  remaining: number;
  /** The resource that was checked. */
  resource: string;
}

export interface ITenantRegistry {
  /** Find a tenant by its ID. */
  findById(id: string): Promise<DataProcessResult<TenantRecord>>;

  /** Find a tenant by its name. */
  findByName(name: string): Promise<DataProcessResult<TenantRecord>>;

  /** List all tenants, optionally filtered by status. */
  list(status?: 'active' | 'inactive' | 'suspended'): Promise<DataProcessResult<TenantRecord[]>>;

  /**
   * Check whether the tenant has quota remaining for the given resource.
   *
   * @param tenantId  — the tenant to check
   * @param resource  — e.g. 'api_calls', 'tokens', 'storage_mb'
   * @param amount    — units requested
   */
  checkQuota(
    tenantId: string,
    resource: string,
    amount: number,
  ): Promise<DataProcessResult<QuotaResult>>;

  // ── P26 FIX-4: Component-20 standard methods ────────────────────────────

  /**
   * Provision a new tenant. Returns the created TenantRecord.
   * Equivalent to create() but standardised as part of Component 20.
   */
  provisionTenant(
    tenantId: string,
    plan: Partial<import('./tenant-context').TenantPlan>,
  ): Promise<DataProcessResult<TenantRecord>>;

  /**
   * Get a tenant by ID (P26 name alias for findById).
   * Returns failure('TENANT_NOT_FOUND', ...) when absent — never throws.
   */
  getTenant(tenantId: string): Promise<DataProcessResult<TenantRecord>>;

  /**
   * Assert that a tenant exists.
   * Returns success(undefined) when found, failure('TENANT_NOT_FOUND', ...) otherwise.
   */
  validateTenantExists(tenantId: string): Promise<DataProcessResult<void>>;

  /**
   * Set tenant status to 'suspended'. Records the reason.
   * Returns failure if the tenant does not exist.
   */
  suspendTenant(tenantId: string, reason: string): Promise<DataProcessResult<void>>;

  /**
   * Remove a tenant entirely from the registry.
   * Returns failure if the tenant does not exist.
   */
  deleteTenant(tenantId: string): Promise<DataProcessResult<void>>;
}

/** Injection token for ITenantRegistry. */
export const TENANT_REGISTRY = 'ITenantRegistry';
