/**
 * EnvVar Secrets Provider — ISecretsService implementation.
 * Maps secret paths to environment variable names.
 * Tenant-isolated via path prefix. Read-only in production, read-write for local dev.
 *
 * Path mapping: 'xiigen/ai/key' → 'TENANT_{TENANT_ID}_XIIGEN_AI_KEY'
 *   - slashes → underscores
 *   - uppercase
 *   - prefixed with TENANT_{tenantId}_
 *
 * v4: No tenant_id parameter. Reads TenantContext from CLS.
 * DNA: DataProcessResult (3), tenant from CLS (5), dict payloads (1).
 * Iron Rule: Never log secret values, never return values in list.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ISecretsService } from '../interfaces/secrets.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';

/** Injected environment map — testable without touching process.env. */
export type EnvironMap = Record<string, string | undefined>;

@Injectable()
export class EnvVarSecretsProvider extends ISecretsService {
  private readonly environ: EnvironMap;

  /**
   * @param cls - NestJS CLS service for tenant context
   * @param environ - Injected env map (defaults to process.env). Tests pass a mock map.
   */
  constructor(
    private readonly cls: ClsService,
    environ?: EnvironMap,
  ) {
    super();
    this.environ = environ ?? process.env;
  }

  // ── Tenant extraction ──────────────────────────────

  private getTenantId(): DataProcessResult<string> {
    try {
      const tenant = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      if (!tenant) return DataProcessResult.failure('NO_TENANT', 'TenantContext not found in CLS');
      return DataProcessResult.success(tenant.tenantId);
    } catch {
      return DataProcessResult.failure('NO_TENANT', 'CLS not available');
    }
  }

  // ── Path mapping ───────────────────────────────────

  /**
   * Map a secret path to an environment variable name.
   * 'xiigen/ai/key' for tenant 'acme' → 'TENANT_ACME_XIIGEN_AI_KEY'
   */
  mapPathToEnvVar(tenantId: string, path: string): string {
    const sanitized = path
      .replace(/[/\\]/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toUpperCase();
    const tenantPrefix = tenantId.replace(/[^a-zA-Z0-9_]/g, '').toUpperCase();
    return `TENANT_${tenantPrefix}_${sanitized}`;
  }

  // ── ISecretsService implementation ─────────────────

  async getSecret(
    path: string,
    _version?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    if (!path) return DataProcessResult.failure('INVALID_PATH', 'path cannot be empty');

    const envVar = this.mapPathToEnvVar(tenantId, path);
    const value = this.environ[envVar];

    if (value === undefined || value === null) {
      return DataProcessResult.failure(
        'SECRET_NOT_FOUND',
        `Env var '${envVar}' not set for path '${path}'`,
      );
    }

    return DataProcessResult.success({
      value,
      version: 'env',
      provider: 'env_var',
      cached: false,
      env_var: envVar,
    });
  }

  async setSecret(
    path: string,
    value: string,
    _metadata?: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    if (!path) return DataProcessResult.failure('INVALID_PATH', 'path cannot be empty');
    if (value === null || value === undefined) {
      return DataProcessResult.failure('INVALID_VALUE', 'value cannot be null/undefined');
    }

    const envVar = this.mapPathToEnvVar(tenantId, path);
    (this.environ as Record<string, string>)[envVar] = value;

    return DataProcessResult.success({
      path,
      version: 'env',
      provider: 'env_var',
      env_var: envVar,
    });
  }

  async deleteSecret(path: string): Promise<DataProcessResult<boolean>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    if (!path) return DataProcessResult.failure('INVALID_PATH', 'path cannot be empty');

    const envVar = this.mapPathToEnvVar(tenantId, path);
    if (this.environ[envVar] === undefined) {
      return DataProcessResult.failure(
        'SECRET_NOT_FOUND',
        `Env var '${envVar}' not set for path '${path}'`,
      );
    }

    delete (this.environ as Record<string, string | undefined>)[envVar];
    return DataProcessResult.success(true);
  }

  async listSecrets(prefix?: string): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    const tenantPrefix = `TENANT_${tenantId.replace(/[^a-zA-Z0-9_]/g, '').toUpperCase()}_`;
    const searchPrefix = prefix
      ? `${tenantPrefix}${prefix
          .replace(/[/\\]/g, '_')
          .replace(/[^a-zA-Z0-9_]/g, '')
          .toUpperCase()}`
      : tenantPrefix;

    const results: Array<Record<string, unknown>> = [];

    for (const key of Object.keys(this.environ)) {
      if (key.startsWith(searchPrefix) && this.environ[key] !== undefined) {
        // IRON RULE: Never return values in list — metadata only
        results.push({
          path: key,
          env_var: key,
          provider: 'env_var',
          has_value: true,
        });
      }
    }

    return DataProcessResult.success(results);
  }

  async healthCheck(): Promise<DataProcessResult<boolean>> {
    // EnvVar provider is always healthy — reading env vars cannot fail
    return DataProcessResult.success(true);
  }
}
