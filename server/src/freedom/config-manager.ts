/**
 * FreedomConfigManager — CRUD for admin-configurable values.
 *
 * Storage: (tenantId, configKey) → config document (dict).
 * All documents are Record<string, unknown> — DNA-1 compliance.
 * All mutations validate scope (DNA-5) and return DataProcessResult (DNA-3).
 *
 * Resolution order (3-tier):
 *   1. Tenant override (from IDatabaseService index 'freedom_configs')
 *   2. Global default (in-memory defaults map)
 *   3. Hardcoded fallback (caller-supplied or undefined)
 *
 * When IDatabaseService is injected, reads/writes go to the database.
 * When not injected (dev/test), falls back to in-memory Map.
 *
 * Phase 7.4: FREEDOM infrastructure.
 * P26 FIX-7: backed by IDatabaseService.
 */

import { Injectable, Optional, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../kernel/data-process-result';
import { validateScope } from '../kernel/scope-isolation';
import { validateConfigDoc } from './config-schema';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { TENANT_CONTEXT_KEY, TenantContext } from '../kernel/multi-tenant/tenant-context';
import { IFreedomConfigService } from './freedom-config.interface';

/** Index name used in IDatabaseService for freedom configs. */
const FREEDOM_INDEX = 'freedom_configs';

@Injectable()
export class FreedomConfigManager implements IFreedomConfigService {
  /** (tenantId, configKey) → config document. Used when no db injected. */
  private readonly store = new Map<string, Record<string, unknown>>();
  /** Global defaults: configKey → default value. */
  private readonly defaults = new Map<string, unknown>();
  /** Audit trail. */
  private readonly audit: Array<Record<string, unknown>> = [];

  constructor(
    @Optional()
    @Inject(DATABASE_SERVICE)
    private readonly db?: IDatabaseService,
    @Optional() private readonly cls?: ClsService,
  ) {}

  /**
   * IFreedomConfigService.get — tenant-scoped read keyed by config_key only.
   * Tenant is read from CLS AsyncLocalStorage (DNA-5). Returns null if no
   * tenant context, no config doc, or DB error. Uses DB path when available.
   *
   * Phase C12 (DEV-115, 2026-04-26): closed the broken IFreedomConfigService
   * contract — VaultSecretsManagerService and 10+ engine services call
   * `this.freedom.get(key)` per the interface; FreedomConfigManager only had
   * `getConfig(tenantId, key)` / `getConfigAsync(...)`. Adding this method
   * makes the binding `useExisting: FreedomConfigManager` (in freedom.module.ts)
   * structurally correct.
   */
  async get(configKey: string): Promise<Record<string, unknown> | null> {
    const tenantId = this.getTenantId();
    if (!tenantId) return null;
    const result = await this.getConfigAsync(tenantId, configKey);
    return result.isSuccess && result.data ? (result.data as Record<string, unknown>) : null;
  }

  private getTenantId(): string | null {
    if (!this.cls) return null;
    try {
      const ctx = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      return ctx?.tenantId ?? null;
    } catch {
      return null;
    }
  }

  private storeKey(tenantId: string, configKey: string): string {
    return `${tenantId}::${configKey}`;
  }

  /**
   * Store or update a FREEDOM config. Validates scope and document.
   * Uses in-memory store (synchronous path, backward-compatible).
   * For DB-backed writes use setConfigAsync().
   */
  setConfig(
    tenantId: string,
    configDoc: Record<string, unknown>,
  ): DataProcessResult<Record<string, unknown>> {
    const scope = validateScope(tenantId);
    if (!scope.isSuccess) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenant_id required (DNA-5)');
    }

    // Deep copy + stamp tenant
    const doc: Record<string, unknown> = { ...configDoc, tenant_id: tenantId };

    // Validate
    const validation = validateConfigDoc(doc);
    if (!validation.isSuccess) {
      return DataProcessResult.failure(validation.errorCode!, validation.errorMessage!);
    }

    const key = this.storeKey(tenantId, doc.config_key as string);
    const isUpdate = this.store.has(key);
    const oldValue = isUpdate ? this.store.get(key)!.value : undefined;

    const now = Date.now();
    doc.updated_at = now;
    if (!isUpdate) {
      doc.created_at = now;
    } else {
      doc.created_at = this.store.get(key)!.created_at ?? now;
    }

    this.store.set(key, doc);

    // Audit
    this.audit.push({
      action: isUpdate ? 'update' : 'create',
      tenant_id: tenantId,
      config_key: doc.config_key,
      old_value: oldValue ?? null,
      new_value: doc.value,
      timestamp: now,
    });

    return DataProcessResult.success({ ...doc });
  }

  /**
   * Store or update a FREEDOM config, backed by IDatabaseService when available.
   * 3-tier write: database (if injected) + in-memory cache.
   * P26 FIX-7.
   */
  async setConfigAsync(
    tenantId: string,
    configDoc: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    // Validate and build doc via sync path first
    const memResult = this.setConfig(tenantId, configDoc);
    if (!memResult.isSuccess) return memResult;

    // Persist to DB if available
    if (this.db) {
      const doc = memResult.data!;
      const dbResult = await this.db.storeDocument(
        FREEDOM_INDEX,
        doc,
        this.storeKey(tenantId, doc.config_key as string),
      );
      if (!dbResult.isSuccess) {
        // Rollback in-memory on DB failure
        this.store.delete(this.storeKey(tenantId, doc.config_key as string));
        return DataProcessResult.failure(
          dbResult.errorCode!,
          `FreedomConfig DB write failed: ${dbResult.errorMessage}`,
        );
      }
    }

    return memResult;
  }

  /**
   * Get a config value. Falls back to default if not set for tenant.
   * Uses in-memory store (synchronous path, backward-compatible).
   * For DB-backed reads use getConfigAsync().
   */
  getConfig(tenantId: string, configKey: string): DataProcessResult<Record<string, unknown>> {
    const scope = validateScope(tenantId);
    if (!scope.isSuccess) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenant_id required (DNA-5)');
    }

    const key = this.storeKey(tenantId, configKey);
    const doc = this.store.get(key);
    if (doc) {
      return DataProcessResult.success({ ...doc });
    }

    // Fallback to default
    if (this.defaults.has(configKey)) {
      return DataProcessResult.success({
        config_key: configKey,
        value: this.defaults.get(configKey),
        tenant_id: tenantId,
        is_default: true,
      });
    }

    return DataProcessResult.failure(
      'NOT_FOUND',
      `Config '${configKey}' not set and no default exists`,
    );
  }

  /**
   * Get a config value with 3-tier resolution:
   *   1. Tenant override from IDatabaseService
   *   2. Global default (in-memory)
   *   3. NOT_FOUND failure
   *
   * P26 FIX-7.
   */
  async getConfigAsync(
    tenantId: string,
    configKey: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const scope = validateScope(tenantId);
    if (!scope.isSuccess) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenant_id required (DNA-5)');
    }

    // Tier 1: tenant override from database
    if (this.db) {
      const dbResult = await this.db.searchDocuments(FREEDOM_INDEX, {
        tenant_id: tenantId,
        config_key: configKey,
      });
      if (dbResult.isSuccess && dbResult.data && dbResult.data.length > 0) {
        const doc = dbResult.data[0];
        // Cache in-memory for subsequent sync reads
        this.store.set(this.storeKey(tenantId, configKey), { ...doc });
        return DataProcessResult.success({ ...doc });
      }
    }

    // Tier 2: in-memory (may have been set via setConfig)
    const memResult = this.getConfig(tenantId, configKey);
    if (memResult.isSuccess) {
      return memResult;
    }

    // Tier 3: NOT_FOUND
    return DataProcessResult.failure(
      'NOT_FOUND',
      `Config '${configKey}' not set and no default exists`,
    );
  }

  /**
   * Convenience: get just the value, with optional fallback.
   */
  getValue(tenantId: string, configKey: string, fallback: unknown = undefined): unknown {
    const result = this.getConfig(tenantId, configKey);
    if (result.isSuccess) {
      return result.data!.value ?? fallback;
    }
    return fallback;
  }

  /**
   * Delete a config. Reverts to default if one exists.
   */
  deleteConfig(tenantId: string, configKey: string): DataProcessResult<boolean> {
    const scope = validateScope(tenantId);
    if (!scope.isSuccess) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenant_id required (DNA-5)');
    }

    const key = this.storeKey(tenantId, configKey);
    if (!this.store.has(key)) {
      return DataProcessResult.failure('NOT_FOUND', `Config '${configKey}' not set`);
    }

    const old = this.store.get(key)!;
    this.store.delete(key);

    this.audit.push({
      action: 'delete',
      tenant_id: tenantId,
      config_key: configKey,
      old_value: old.value ?? null,
      timestamp: Date.now(),
    });

    return DataProcessResult.success(true);
  }

  /**
   * List all configs for a tenant, optionally filtered by task_type.
   */
  listConfigs(
    tenantId: string,
    taskType?: string,
  ): DataProcessResult<Array<Record<string, unknown>>> {
    const scope = validateScope(tenantId);
    if (!scope.isSuccess) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenant_id required (DNA-5)');
    }

    const results: Array<Record<string, unknown>> = [];
    for (const [, doc] of this.store) {
      if (doc.tenant_id !== tenantId) continue;
      if (taskType && doc.task_type !== taskType) continue;
      results.push({ ...doc });
    }

    return DataProcessResult.success(results);
  }

  /**
   * Set a global default for a config key.
   */
  setDefault(configKey: string, value: unknown): void {
    this.defaults.set(configKey, value);
  }

  /**
   * Get audit trail for a tenant, optionally filtered by config_key.
   */
  getAuditTrail(tenantId: string, configKey?: string): Array<Record<string, unknown>> {
    return this.audit.filter(
      (a) => a.tenant_id === tenantId && (configKey === undefined || a.config_key === configKey),
    );
  }

  /** Total number of stored configs. */
  get totalConfigs(): number {
    return this.store.size;
  }

  /** Clear all (for testing). */
  clear(): void {
    this.store.clear();
    this.defaults.clear();
    this.audit.length = 0;
  }
}
