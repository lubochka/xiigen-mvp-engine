/**
 * InMemoryTenantRegistry — lightweight in-memory implementation of ITenantRegistry.
 *
 * Use in unit tests and local dev. No NestJS DI or database required.
 *
 * P26 FIX-4: provides all Component-20 standard methods.
 */

import { randomUUID } from 'crypto';
import { DataProcessResult } from '../data-process-result';
import { TenantRecord, TenantPlan, DEFAULT_PLAN } from './tenant-context';
import { ITenantRegistry, QuotaResult } from './tenant-registry.interface';

export class InMemoryTenantRegistry implements ITenantRegistry {
  private readonly tenants = new Map<string, TenantRecord>();

  // ── P26 Component-20 methods ───────────────────────────────────────────

  async provisionTenant(
    tenantId: string,
    plan: Partial<TenantPlan>,
  ): Promise<DataProcessResult<TenantRecord>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('INVALID_INPUT', 'tenantId is required');
    }
    const existing = this.tenants.get(tenantId);
    if (existing) {
      return DataProcessResult.success(existing);
    }
    const now = new Date().toISOString();
    const tenant: TenantRecord = {
      id: tenantId,
      name: tenantId,
      status: 'active',
      plan: { ...DEFAULT_PLAN, ...plan },
      configOverrides: {},
      apiKeys: {},
      createdAt: now,
      updatedAt: now,
    };
    this.tenants.set(tenantId, tenant);
    return DataProcessResult.success(tenant);
  }

  async getTenant(tenantId: string): Promise<DataProcessResult<TenantRecord>> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return DataProcessResult.failure('TENANT_NOT_FOUND', `Tenant '${tenantId}' not found`);
    }
    return DataProcessResult.success(tenant);
  }

  async validateTenantExists(tenantId: string): Promise<DataProcessResult<void>> {
    if (!this.tenants.has(tenantId)) {
      return DataProcessResult.failure('TENANT_NOT_FOUND', `Tenant '${tenantId}' does not exist`);
    }
    return DataProcessResult.success(undefined);
  }

  async suspendTenant(tenantId: string, _reason: string): Promise<DataProcessResult<void>> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return DataProcessResult.failure('TENANT_NOT_FOUND', `Tenant '${tenantId}' not found`);
    }
    this.tenants.set(tenantId, {
      ...tenant,
      status: 'suspended',
      updatedAt: new Date().toISOString(),
    });
    return DataProcessResult.success(undefined);
  }

  async deleteTenant(tenantId: string): Promise<DataProcessResult<void>> {
    if (!this.tenants.has(tenantId)) {
      return DataProcessResult.failure('TENANT_NOT_FOUND', `Tenant '${tenantId}' not found`);
    }
    this.tenants.delete(tenantId);
    return DataProcessResult.success(undefined);
  }

  // ── Existing ITenantRegistry methods ──────────────────────────────────

  async findById(id: string): Promise<DataProcessResult<TenantRecord>> {
    const tenant = this.tenants.get(id);
    if (!tenant) {
      return DataProcessResult.failure('NOT_FOUND', `Tenant '${id}' not found`);
    }
    return DataProcessResult.success(tenant);
  }

  async findByName(name: string): Promise<DataProcessResult<TenantRecord>> {
    for (const tenant of this.tenants.values()) {
      if (tenant.name === name) {
        return DataProcessResult.success(tenant);
      }
    }
    return DataProcessResult.failure('NOT_FOUND', `Tenant with name '${name}' not found`);
  }

  async list(
    status?: 'active' | 'inactive' | 'suspended',
  ): Promise<DataProcessResult<TenantRecord[]>> {
    let records = Array.from(this.tenants.values());
    if (status) records = records.filter((t) => t.status === status);
    return DataProcessResult.success(records);
  }

  async checkQuota(
    tenantId: string,
    resource: string,
    amount: number,
  ): Promise<DataProcessResult<QuotaResult>> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return DataProcessResult.failure('NOT_FOUND', `Tenant '${tenantId}' not found`);
    }
    const plan = tenant.plan;
    let limit: number;
    switch (resource) {
      case 'api_calls':
        limit = plan.maxApiCallsPerMinute;
        break;
      case 'tokens':
        limit = plan.maxTokensPerDay;
        break;
      case 'storage_mb':
        limit = plan.maxStorageMb;
        break;
      default:
        return DataProcessResult.success({
          ok: true,
          remaining: Number.MAX_SAFE_INTEGER,
          resource,
        });
    }
    const ok = amount <= limit;
    return DataProcessResult.success({ ok, remaining: Math.max(0, limit - amount), resource });
  }

  /** Seed a tenant directly (helper for tests). Returns the ID. */
  seed(overrides: Partial<TenantRecord> & { id?: string } = {}): TenantRecord {
    const id = overrides.id ?? randomUUID();
    const now = new Date().toISOString();
    const tenant: TenantRecord = {
      id,
      name: overrides.name ?? id,
      status: overrides.status ?? 'active',
      plan: overrides.plan ?? { ...DEFAULT_PLAN },
      configOverrides: overrides.configOverrides ?? {},
      apiKeys: overrides.apiKeys ?? {},
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now,
    };
    this.tenants.set(id, tenant);
    return tenant;
  }

  /** Clear all tenants — for testing. */
  clear(): void {
    this.tenants.clear();
  }
}
