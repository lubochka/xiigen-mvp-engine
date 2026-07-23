/**
 * Vault Secrets Provider backed by Vault KV v2.
 *
 * Tenant data stays in Vault under:
 *   secret/xiigen/tenants/{tenantId}/{path}
 *
 * Provider connection settings are platform deployment settings:
 *   VAULT_ADDR defaults to http://vault:8200 for Docker compose
 *   VAULT_TOKEN is required; the token value is never logged or returned
 *
 * The provider keeps method payloads generic, returns DataProcessResult for
 * business outcomes, and reads tenant identity from the request context.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ISecretsService } from '../interfaces/secrets.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';

const DEFAULT_VAULT_ADDR = 'http://vault:8200';
const VAULT_MOUNT = 'secret';
const TENANT_ROOT = 'xiigen/tenants';
const AUTH_SIGNING_PREFIX = 'xiigen/auth/jwt_signing_key/';

interface VaultKvResponse {
  readonly data?: {
    readonly data?: Record<string, unknown>;
    readonly metadata?: Record<string, unknown>;
  };
}

@Injectable()
export class VaultSecretsProvider extends ISecretsService {
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

  private vaultAddress(): string {
    const raw = process.env['VAULT_ADDR'] ?? DEFAULT_VAULT_ADDR;
    return raw.replace(/\/+$/, '');
  }

  private vaultToken(): DataProcessResult<string> {
    const token = process.env['VAULT_TOKEN'];
    if (typeof token !== 'string' || token.length === 0) {
      return DataProcessResult.failure('VAULT_TOKEN_MISSING', 'VAULT_TOKEN is required');
    }
    return DataProcessResult.success(token);
  }

  private encodeVaultPath(path: string): string {
    return path
      .split('/')
      .filter((segment) => segment.length > 0)
      .map((segment) => encodeURIComponent(segment))
      .join('/');
  }

  private tenantVaultPath(tenantId: string, path: string): DataProcessResult<string> {
    if (!path) return DataProcessResult.failure('INVALID_PATH', 'path cannot be empty');

    if (path.startsWith(AUTH_SIGNING_PREFIX)) {
      const pathTenant = path.slice(AUTH_SIGNING_PREFIX.length);
      if (pathTenant !== tenantId) {
        return DataProcessResult.failure(
          'TENANT_PATH_MISMATCH',
          'secret path tenant does not match current tenant context',
        );
      }
      return DataProcessResult.success(`${TENANT_ROOT}/${tenantId}/auth/jwt_signing_key`);
    }

    if (path.startsWith(`${TENANT_ROOT}/${tenantId}/`)) {
      return DataProcessResult.success(path);
    }

    return DataProcessResult.success(`${TENANT_ROOT}/${tenantId}/${path}`);
  }

  private dataUrl(vaultPath: string): string {
    return `${this.vaultAddress()}/v1/${VAULT_MOUNT}/data/${this.encodeVaultPath(vaultPath)}`;
  }

  private metadataUrl(vaultPath: string): string {
    return `${this.vaultAddress()}/v1/${VAULT_MOUNT}/metadata/${this.encodeVaultPath(vaultPath)}`;
  }

  private headers(token: string): Record<string, string> {
    return {
      'X-Vault-Token': token,
      'Content-Type': 'application/json',
    };
  }

  async getSecret(
    path: string,
    version?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const vaultPath = this.tenantVaultPath(tenantResult.data!, path);
    if (!vaultPath.isSuccess)
      return DataProcessResult.failure(vaultPath.errorCode!, vaultPath.errorMessage!);
    const token = this.vaultToken();
    if (!token.isSuccess) return DataProcessResult.failure(token.errorCode!, token.errorMessage!);

    const query = version ? `?version=${encodeURIComponent(version)}` : '';
    try {
      const res = await fetch(`${this.dataUrl(vaultPath.data!)}${query}`, {
        method: 'GET',
        headers: this.headers(token.data!),
      });
      if (res.status === 404) {
        return DataProcessResult.failure('SECRET_NOT_FOUND', `Secret '${path}' not found`);
      }
      if (!res.ok) {
        return DataProcessResult.failure('VAULT_READ_FAILED', `Vault read failed with ${res.status}`);
      }

      const body = (await res.json()) as VaultKvResponse;
      const payload = body.data?.data;
      if (!payload) {
        return DataProcessResult.failure('SECRET_MALFORMED', `Secret '${path}' has no data`);
      }
      const value = payload['value'];
      if (typeof value !== 'string' || value.length === 0) {
        return DataProcessResult.failure('SECRET_MALFORMED', `Secret '${path}' has no value`);
      }

      const result: Record<string, unknown> = {
        value,
        version: String(body.data?.metadata?.['version'] ?? version ?? ''),
        provider: 'vault',
        cached: false,
      };
      const algorithm = payload['algorithm'];
      if (typeof algorithm === 'string') result['algorithm'] = algorithm;
      return DataProcessResult.success(result);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return DataProcessResult.error('VAULT_READ_ERROR', err.message, err);
    }
  }

  async setSecret(
    path: string,
    value: string,
    metadata?: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const vaultPath = this.tenantVaultPath(tenantResult.data!, path);
    if (!vaultPath.isSuccess)
      return DataProcessResult.failure(vaultPath.errorCode!, vaultPath.errorMessage!);
    const token = this.vaultToken();
    if (!token.isSuccess) return DataProcessResult.failure(token.errorCode!, token.errorMessage!);
    if (value === null || value === undefined) {
      return DataProcessResult.failure('INVALID_VALUE', 'value cannot be null/undefined');
    }

    const data: Record<string, unknown> = { ...(metadata ?? {}), value };
    try {
      const res = await fetch(this.dataUrl(vaultPath.data!), {
        method: 'POST',
        headers: this.headers(token.data!),
        body: JSON.stringify({ data }),
      });
      if (!res.ok) {
        return DataProcessResult.failure('VAULT_WRITE_FAILED', `Vault write failed with ${res.status}`);
      }
      const body = (await res.json().catch(() => ({}))) as VaultKvResponse;
      return DataProcessResult.success({
        path,
        version: String(body.data?.metadata?.['version'] ?? ''),
        provider: 'vault',
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return DataProcessResult.error('VAULT_WRITE_ERROR', err.message, err);
    }
  }

  async deleteSecret(path: string): Promise<DataProcessResult<boolean>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const vaultPath = this.tenantVaultPath(tenantResult.data!, path);
    if (!vaultPath.isSuccess)
      return DataProcessResult.failure(vaultPath.errorCode!, vaultPath.errorMessage!);
    const token = this.vaultToken();
    if (!token.isSuccess) return DataProcessResult.failure(token.errorCode!, token.errorMessage!);

    try {
      const res = await fetch(this.metadataUrl(vaultPath.data!), {
        method: 'DELETE',
        headers: this.headers(token.data!),
      });
      if (res.status === 204 || res.status === 404) return DataProcessResult.success(true);
      if (!res.ok) {
        return DataProcessResult.failure('VAULT_DELETE_FAILED', `Vault delete failed with ${res.status}`);
      }
      return DataProcessResult.success(true);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return DataProcessResult.error('VAULT_DELETE_ERROR', err.message, err);
    }
  }

  async listSecrets(prefix?: string): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const token = this.vaultToken();
    if (!token.isSuccess) return DataProcessResult.failure(token.errorCode!, token.errorMessage!);

    const tenantPath = `${TENANT_ROOT}/${tenantResult.data!}/${prefix ?? ''}`.replace(/\/+$/, '');
    try {
      const res = await fetch(this.metadataUrl(tenantPath), {
        method: 'LIST',
        headers: this.headers(token.data!),
      });
      if (res.status === 404) return DataProcessResult.success([]);
      if (!res.ok) {
        return DataProcessResult.failure('VAULT_LIST_FAILED', `Vault list failed with ${res.status}`);
      }
      const body = (await res.json()) as VaultKvResponse;
      const keys = body.data?.data?.['keys'];
      const values = Array.isArray(keys) ? keys.filter((key) => typeof key === 'string') : [];
      return DataProcessResult.success(
        values.map((key) => ({
          path: `${prefix ?? ''}${key}`,
          provider: 'vault',
          has_value: !String(key).endsWith('/'),
        })),
      );
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return DataProcessResult.error('VAULT_LIST_ERROR', err.message, err);
    }
  }

  async healthCheck(): Promise<DataProcessResult<boolean>> {
    const token = this.vaultToken();
    if (!token.isSuccess) return DataProcessResult.failure(token.errorCode!, token.errorMessage!);
    try {
      const res = await fetch(`${this.vaultAddress()}/v1/sys/health`, {
        method: 'GET',
        headers: this.headers(token.data!),
      });
      return DataProcessResult.success(res.status >= 200 && res.status < 500);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      return DataProcessResult.error('VAULT_HEALTH_ERROR', err.message, err);
    }
  }
}
