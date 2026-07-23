/**
 * InMemory Secrets Provider — ISecretsService implementation.
 * Iron Rule: Never log secret values, never return values in list.
 *
 * v4: No tenant_id parameter. Reads TenantContext from CLS.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { ISecretsService } from '../interfaces/secrets.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';

interface SecretEntry {
  value: string;
  version: string;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  tenantId: string;
  path: string;
}

@Injectable()
export class InMemorySecretsProvider extends ISecretsService {
  /** Key: `${tenantId}::${path}` → SecretEntry */
  private readonly store = new Map<string, SecretEntry>();

  constructor(private readonly cls: ClsService) {
    super();
  }

  private getTenantId(): DataProcessResult<string> {
    try {
      const tenant = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      if (!tenant) return DataProcessResult.failure('NO_TENANT', 'TenantContext not found in CLS');
      return DataProcessResult.success(tenant.tenantId);
    } catch {
      return DataProcessResult.failure('NO_TENANT', 'CLS not available');
    }
  }

  private storeKey(tenantId: string, path: string): string {
    return `${tenantId}::${path}`;
  }

  async getSecret(
    path: string,
    version?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    if (!path) return DataProcessResult.failure('INVALID_PATH', 'path cannot be empty');

    const key = this.storeKey(tenantId, path);
    const entry = this.store.get(key);
    if (!entry) {
      return DataProcessResult.failure('SECRET_NOT_FOUND', `Secret '${path}' not found`);
    }

    if (version && entry.version !== version) {
      return DataProcessResult.failure(
        'VERSION_MISMATCH',
        `Requested version '${version}', current is '${entry.version}'`,
      );
    }

    return DataProcessResult.success({
      value: entry.value,
      version: entry.version,
      provider: 'in_memory',
      cached: false,
    });
  }

  async setSecret(
    path: string,
    value: string,
    metadata?: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    if (!path) return DataProcessResult.failure('INVALID_PATH', 'path cannot be empty');
    if (value === null || value === undefined) {
      return DataProcessResult.failure('INVALID_VALUE', 'value cannot be null/undefined');
    }

    const key = this.storeKey(tenantId, path);
    const now = Date.now();
    const existing = this.store.get(key);
    const version = randomUUID().slice(0, 8);

    this.store.set(key, {
      value,
      version,
      metadata: metadata ? structuredClone(metadata) : {},
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      tenantId,
      path,
    });

    return DataProcessResult.success({
      path,
      version,
      provider: 'in_memory',
    });
  }

  async deleteSecret(path: string): Promise<DataProcessResult<boolean>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    if (!path) return DataProcessResult.failure('INVALID_PATH', 'path cannot be empty');

    const key = this.storeKey(tenantId, path);
    if (!this.store.has(key)) {
      return DataProcessResult.failure('SECRET_NOT_FOUND', `Secret '${path}' not found`);
    }

    this.store.delete(key);
    return DataProcessResult.success(true);
  }

  async listSecrets(prefix?: string): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    const tenantPrefix = `${tenantId}::`;
    const fullPrefix = `${tenantPrefix}${prefix ?? ''}`;
    const results: Array<Record<string, unknown>> = [];

    for (const [key, entry] of this.store.entries()) {
      if (key.startsWith(fullPrefix)) {
        // NEVER return values in list — metadata only (Iron Rule)
        results.push({
          path: entry.path,
          version: entry.version,
          updated_at: entry.updatedAt,
          has_metadata: Object.keys(entry.metadata).length > 0,
        });
      }
    }

    return DataProcessResult.success(results);
  }

  async healthCheck(): Promise<DataProcessResult<boolean>> {
    return DataProcessResult.success(true);
  }

  // ── Testing helpers ─────────────────────────────────

  get count(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}
