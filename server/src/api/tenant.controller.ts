/**
 * TenantController — admin API for tenant management.
 *
 * POST   /tenants          — create tenant
 * GET    /tenants          — list tenants
 * GET    /tenants/:id      — get tenant details
 * PUT    /tenants/:id/config — update tenant FREEDOM config
 * PUT    /tenants/:id/keys   — set per-tenant API keys
 * PUT    /tenants/:id/quotas — set per-tenant quotas
 * DELETE /tenants/:id      — soft-delete (deactivate)
 *
 * Thin controller — business logic stays in TenantRegistry (P1).
 * DNA-5: tenantId validated before every operation.
 *
 * Phase 9.3: API module.
 */

import { Injectable, Optional } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { TenantRegistry, CreateTenantInput } from '../kernel/multi-tenant/tenant-registry.service';
import { FreedomConfigManager } from '../freedom/config-manager';
import { ByokKeyStoreService } from '../kernel/multi-tenant/byok-key-store.service';

@Injectable()
export class TenantController {
  constructor(
    private readonly registry: TenantRegistry,
    @Optional() private readonly freedom?: FreedomConfigManager,
    @Optional() private readonly byokStore?: ByokKeyStoreService,
  ) {}

  /** POST /tenants — create a new tenant. */
  async create(input: CreateTenantInput): Promise<DataProcessResult<Record<string, unknown>>> {
    const result = await this.registry.create(input);
    if (!result.isSuccess) {
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    }
    return DataProcessResult.success(this.tenantToDict(result.data!));
  }

  /** GET /tenants — list all tenants. */
  async list(): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    const result = await this.registry.list();
    if (!result.isSuccess) {
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    }
    return DataProcessResult.success(result.data!.map((t) => this.tenantToDict(t)));
  }

  /** GET /tenants/:id — get tenant details. */
  async getById(tenantId: string): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenant_id required (DNA-5)');
    }
    const result = await this.registry.findById(tenantId);
    if (!result.isSuccess) {
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    }
    return DataProcessResult.success(this.tenantToDict(result.data!));
  }

  /** PUT /tenants/:id/config — update tenant FREEDOM config. */
  async updateConfig(
    tenantId: string,
    configDoc: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenant_id required (DNA-5)');
    }

    // Verify tenant exists
    const exists = await this.registry.findById(tenantId);
    if (!exists.isSuccess) {
      return DataProcessResult.failure(exists.errorCode!, exists.errorMessage!);
    }

    if (this.freedom) {
      const setResult = this.freedom.setConfig(tenantId, configDoc);
      if (!setResult.isSuccess) {
        return DataProcessResult.failure(setResult.errorCode!, setResult.errorMessage!);
      }
      return DataProcessResult.success({
        tenant_id: tenantId,
        config_updated: true,
        config: setResult.data,
      });
    }

    return DataProcessResult.success({
      tenant_id: tenantId,
      config_updated: false,
      message: 'FreedomConfigManager not available',
    });
  }

  /** PUT /tenants/:id/keys — set per-tenant API keys. */
  async setKeys(
    tenantId: string,
    keys: Record<string, string>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenant_id required (DNA-5)');
    }

    // Phase B-1: write encrypted keys to xiigen-byok-keys before updating in-memory (DNA-8)
    if (this.byokStore) {
      const byokResult = await this.byokStore.writeKeys(tenantId, keys);
      if (!byokResult.isSuccess) {
        return DataProcessResult.failure(byokResult.errorCode!, byokResult.errorMessage!);
      }
    }

    const result = await this.registry.update(tenantId, { apiKeys: keys });
    if (!result.isSuccess) {
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    }
    return DataProcessResult.success({
      tenant_id: tenantId,
      keys_updated: true,
      key_count: Object.keys(keys).length,
      persisted: !!this.byokStore,
    });
  }

  /** PUT /tenants/:id/quotas — set per-tenant quotas. */
  async setQuotas(
    tenantId: string,
    quotas: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenant_id required (DNA-5)');
    }

    const plan: Record<string, unknown> = {};
    if (quotas.maxRequestsPerMinute !== undefined)
      plan.maxRequestsPerMinute = quotas.maxRequestsPerMinute;
    if (quotas.maxTokensPerDay !== undefined) plan.maxTokensPerDay = quotas.maxTokensPerDay;

    const result = await this.registry.update(tenantId, {
      plan: plan as unknown as Record<string, unknown>,
    });
    if (!result.isSuccess) {
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    }
    return DataProcessResult.success({ tenant_id: tenantId, quotas_updated: true });
  }

  /** DELETE /tenants/:id — soft-delete (deactivate). */
  async deactivate(tenantId: string): Promise<DataProcessResult<Record<string, unknown>>> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenant_id required (DNA-5)');
    }

    const result = await this.registry.update(tenantId, { status: 'inactive' });
    if (!result.isSuccess) {
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    }
    return DataProcessResult.success({
      tenant_id: tenantId,
      status: 'inactive',
      deactivated: true,
    });
  }

  // ── Internal ──────────────────────────────────────

  private tenantToDict(tenant: unknown): Record<string, unknown> {
    if (typeof tenant === 'object' && tenant !== null) {
      return { ...(tenant as Record<string, unknown>) };
    }
    return { id: String(tenant) };
  }
}
