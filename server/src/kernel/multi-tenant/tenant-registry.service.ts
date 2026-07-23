/**
 * TenantRegistry — CRUD service for tenant management.
 *
 * In-memory backed for Phase 1. Will switch to IDatabaseService
 * once fabric interfaces are wired (Phase 2+).
 *
 * All methods return DataProcessResult — never throw for business logic (DNA-3).
 */

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataProcessResult } from '../data-process-result';
import { TenantRecord, TenantPlan, DEFAULT_PLAN } from './tenant-context';
import { ITenantRegistry, QuotaResult } from './tenant-registry.interface';

export interface CreateTenantInput {
  /** Optional fixed ID. When provided (e.g. platform master tenant), uses it instead of randomUUID(). */
  id?: string;
  name: string;
  plan?: Partial<TenantPlan>;
  configOverrides?: Record<string, unknown>;
  apiKeys?: Record<string, string>;
}

export interface UpdateTenantInput {
  name?: string;
  status?: 'active' | 'inactive' | 'suspended';
  plan?: Partial<TenantPlan>;
  configOverrides?: Record<string, unknown>;
  apiKeys?: Record<string, string>;
}

@Injectable()
export class TenantRegistry implements ITenantRegistry {
  private readonly tenants = new Map<string, TenantRecord>();

  /** Create a new tenant. Returns the created record. */
  async create(input: CreateTenantInput): Promise<DataProcessResult<TenantRecord>> {
    if (!input.name || input.name.trim() === '') {
      return DataProcessResult.failure('INVALID_INPUT', 'Tenant name is required');
    }

    // Check for duplicate name
    for (const existing of this.tenants.values()) {
      if (existing.name === input.name.trim()) {
        return DataProcessResult.failure(
          'DUPLICATE_NAME',
          `Tenant with name '${input.name}' already exists`,
        );
      }
    }

    // Reject duplicate ID if a fixed ID was provided
    if (input.id && this.tenants.has(input.id)) {
      return DataProcessResult.failure(
        'DUPLICATE_ID',
        `Tenant with id '${input.id}' already exists`,
      );
    }

    const now = new Date().toISOString();
    const tenant: TenantRecord = {
      id: input.id ?? randomUUID(), // Use provided ID (platform tenants) or generate (regular tenants)
      name: input.name.trim(),
      status: 'active',
      plan: {
        ...DEFAULT_PLAN,
        ...(input.plan ?? {}),
      },
      configOverrides: input.configOverrides ?? {},
      apiKeys: input.apiKeys ?? {},
      createdAt: now,
      updatedAt: now,
    };

    this.tenants.set(tenant.id, tenant);
    return DataProcessResult.success(tenant);
  }

  /** Find a tenant by ID or by name (fallback). */
  async findById(id: string): Promise<DataProcessResult<TenantRecord>> {
    let tenant = this.tenants.get(id);
    // Fallback: allow lookup by name to support human-readable IDs in headers
    if (!tenant) {
      for (const t of this.tenants.values()) {
        if (t.name === id) {
          tenant = t;
          break;
        }
      }
    }
    if (!tenant) {
      return DataProcessResult.failure('NOT_FOUND', `Tenant '${id}' not found`);
    }
    return DataProcessResult.success(tenant);
  }

  /** Find a tenant by name. */
  async findByName(name: string): Promise<DataProcessResult<TenantRecord>> {
    for (const tenant of this.tenants.values()) {
      if (tenant.name === name) {
        return DataProcessResult.success(tenant);
      }
    }
    return DataProcessResult.failure('NOT_FOUND', `Tenant with name '${name}' not found`);
  }

  /** List all tenants, optionally filtered by status. */
  async list(
    status?: 'active' | 'inactive' | 'suspended',
  ): Promise<DataProcessResult<TenantRecord[]>> {
    let records = Array.from(this.tenants.values());
    if (status) {
      records = records.filter((t) => t.status === status);
    }
    return DataProcessResult.success(records);
  }

  /** Update a tenant. Merges provided fields. */
  async update(id: string, input: UpdateTenantInput): Promise<DataProcessResult<TenantRecord>> {
    const existing = this.tenants.get(id);
    if (!existing) {
      return DataProcessResult.failure('NOT_FOUND', `Tenant '${id}' not found`);
    }

    const updated: TenantRecord = {
      ...existing,
      name: input.name?.trim() ?? existing.name,
      status: input.status ?? existing.status,
      plan: input.plan ? { ...existing.plan, ...input.plan } : existing.plan,
      configOverrides: input.configOverrides
        ? { ...existing.configOverrides, ...input.configOverrides }
        : existing.configOverrides,
      apiKeys: input.apiKeys ? { ...existing.apiKeys, ...input.apiKeys } : existing.apiKeys,
      updatedAt: new Date().toISOString(),
    };

    this.tenants.set(id, updated);
    return DataProcessResult.success(updated);
  }

  /** Deactivate (soft delete) a tenant. */
  async deactivate(id: string): Promise<DataProcessResult<TenantRecord>> {
    return this.update(id, { status: 'inactive' });
  }

  /** Count tenants, optionally filtered by status. */
  async count(status?: 'active' | 'inactive' | 'suspended'): Promise<number> {
    if (!status) return this.tenants.size;
    return Array.from(this.tenants.values()).filter((t) => t.status === status).length;
  }

  /**
   * Check quota for a resource against the tenant's plan limits.
   * P26 FIX-4: implements ITenantRegistry.checkQuota.
   *
   * Resource mapping:
   *   'api_calls'   → plan.maxApiCallsPerMinute
   *   'tokens'      → plan.maxTokensPerDay
   *   'storage_mb'  → plan.maxStorageMb
   */
  async checkQuota(
    tenantId: string,
    resource: string,
    amount: number,
  ): Promise<DataProcessResult<QuotaResult>> {
    const found = this.tenants.get(tenantId);
    if (!found) {
      return DataProcessResult.failure('NOT_FOUND', `Tenant '${tenantId}' not found`);
    }

    const plan = found.plan;
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
        // Unknown resources are allowed by default (no quota configured)
        return DataProcessResult.success({
          ok: true,
          remaining: Number.MAX_SAFE_INTEGER,
          resource,
        });
    }

    const ok = amount <= limit;
    const remaining = Math.max(0, limit - amount);
    return DataProcessResult.success({ ok, remaining, resource });
  }

  /** Clear all tenants — for testing only. */
  clear(): void {
    this.tenants.clear();
  }

  // ── P26 FIX-4: Component-20 standard methods ────────────────────────────

  /**
   * Provision a new tenant by ID. P26 standardised entry point.
   * If the tenant already exists, returns the existing record.
   */
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

  /** Get a tenant by ID — P26 name alias for findById(). */
  async getTenant(tenantId: string): Promise<DataProcessResult<TenantRecord>> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return DataProcessResult.failure('TENANT_NOT_FOUND', `Tenant '${tenantId}' not found`);
    }
    return DataProcessResult.success(tenant);
  }

  /** Assert that a tenant exists. Returns failure('TENANT_NOT_FOUND') when absent. */
  async validateTenantExists(tenantId: string): Promise<DataProcessResult<void>> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return DataProcessResult.failure('TENANT_NOT_FOUND', `Tenant '${tenantId}' does not exist`);
    }
    return DataProcessResult.success(undefined);
  }

  /** Set tenant status to 'suspended'. */
  async suspendTenant(tenantId: string, _reason: string): Promise<DataProcessResult<void>> {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return DataProcessResult.failure('TENANT_NOT_FOUND', `Tenant '${tenantId}' not found`);
    }
    const updated: TenantRecord = {
      ...tenant,
      status: 'suspended',
      updatedAt: new Date().toISOString(),
    };
    this.tenants.set(tenantId, updated);
    return DataProcessResult.success(undefined);
  }

  /** Remove a tenant entirely from the registry. */
  async deleteTenant(tenantId: string): Promise<DataProcessResult<void>> {
    if (!this.tenants.has(tenantId)) {
      return DataProcessResult.failure('TENANT_NOT_FOUND', `Tenant '${tenantId}' not found`);
    }
    this.tenants.delete(tenantId);
    return DataProcessResult.success(undefined);
  }
}
