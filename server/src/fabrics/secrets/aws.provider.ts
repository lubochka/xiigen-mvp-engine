/**
 * AWS Secrets Manager Provider — ISecretsService implementation.
 * Uses IAsyncSecretsManagerClient protocol (no real SDK import).
 * TTL-based cache to avoid repeated API calls.
 * Tenant-isolated via secret name prefix: {prefix}/{tenantId}/{path}
 *
 * v4: No tenant_id parameter. Reads TenantContext from CLS.
 * DNA: DataProcessResult (3), tenant from CLS (5), dict payloads (1).
 * Iron Rule: Never log secret values, never return values in list.
 *
 * Phase 5.2: Protocol-based. Real @aws-sdk/client-secrets-manager in P13.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ISecretsService } from '../interfaces/secrets.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';
import { IAsyncSecretsManagerClient } from './protocols';
import { SecretsProviderConfig, defaultSecretsConfig, SecretsProviderType } from './base';

/** Cache entry with TTL tracking. */
interface CacheEntry {
  data: Record<string, unknown>;
  cachedAt: number;
}

@Injectable()
export class AWSSecretsManagerProvider extends ISecretsService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly config: SecretsProviderConfig;

  constructor(
    private readonly cls: ClsService,
    private readonly client: IAsyncSecretsManagerClient,
    config?: Partial<SecretsProviderConfig>,
  ) {
    super();
    this.config = defaultSecretsConfig({
      providerType: SecretsProviderType.AWS_SECRETS_MANAGER,
      ...config,
    });
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

  // ── Secret name mapping ────────────────────────────

  /**
   * Build the AWS secret name: {prefix}/{tenantId}/{path}
   * Tenant isolation enforced via name prefix.
   */
  buildSecretName(tenantId: string, path: string): string {
    return `${this.config.prefix}/${tenantId}/${path}`;
  }

  /** Build cache key: tenantId::path */
  private cacheKey(tenantId: string, path: string): string {
    return `${tenantId}::${path}`;
  }

  // ── Cache management ───────────────────────────────

  /**
   * Check if a cache entry is still valid (within TTL).
   */
  private isCacheValid(entry: CacheEntry): boolean {
    if (this.config.cacheTtlSeconds <= 0) return false;
    const elapsed = (Date.now() - entry.cachedAt) / 1000;
    return elapsed < this.config.cacheTtlSeconds;
  }

  /**
   * Invalidate cache entries.
   * @param tenantId - If provided, only invalidate entries for this tenant
   * @param path - If provided (with tenantId), invalidate specific entry
   */
  invalidateCache(tenantId?: string, path?: string): void {
    if (tenantId && path) {
      this.cache.delete(this.cacheKey(tenantId, path));
    } else if (tenantId) {
      const prefix = `${tenantId}::`;
      for (const key of [...this.cache.keys()]) {
        if (key.startsWith(prefix)) this.cache.delete(key);
      }
    } else {
      this.cache.clear();
    }
  }

  /** Get current cache size (for testing). */
  get cacheSize(): number {
    return this.cache.size;
  }

  // ── ISecretsService implementation ─────────────────

  async getSecret(
    path: string,
    version?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    if (!path) return DataProcessResult.failure('INVALID_PATH', 'path cannot be empty');

    // Check cache (skip if version-specific request)
    if (!version) {
      const key = this.cacheKey(tenantId, path);
      const cached = this.cache.get(key);
      if (cached && this.isCacheValid(cached)) {
        return DataProcessResult.success({ ...cached.data, cached: true });
      }
    }

    // Call AWS SDK via protocol interface
    try {
      const secretName = this.buildSecretName(tenantId, path);
      const params: { SecretId: string; VersionId?: string } = { SecretId: secretName };
      if (version) params.VersionId = version;

      const result = await this.client.getSecretValue(params);

      const data: Record<string, unknown> = {
        value: result.SecretString ?? null,
        version: result.VersionId ?? 'unknown',
        provider: 'aws_secrets_manager',
        cached: false,
        arn: result.ARN,
      };

      // Cache the result (if TTL > 0 and no specific version requested)
      if (!version && this.config.cacheTtlSeconds > 0) {
        this.cache.set(this.cacheKey(tenantId, path), {
          data,
          cachedAt: Date.now(),
        });
      }

      return DataProcessResult.success(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('ResourceNotFoundException') || message.includes('not found')) {
        return DataProcessResult.failure('SECRET_NOT_FOUND', `Secret '${path}' not found in AWS`);
      }
      return DataProcessResult.failure('PROVIDER_ERROR', `AWS Secrets Manager error: ${message}`);
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
    const tenantId = tenantResult.data!;

    if (!path) return DataProcessResult.failure('INVALID_PATH', 'path cannot be empty');
    if (value === null || value === undefined) {
      return DataProcessResult.failure('INVALID_VALUE', 'value cannot be null/undefined');
    }

    const secretName = this.buildSecretName(tenantId, path);

    try {
      // Attempt put (update existing)
      const result = await this.client.putSecretValue({
        SecretId: secretName,
        SecretString: value,
      });

      // Invalidate cache on write
      this.invalidateCache(tenantId, path);

      return DataProcessResult.success({
        path,
        version: result.VersionId ?? 'unknown',
        provider: 'aws_secrets_manager',
        arn: result.ARN,
      });
    } catch (putErr: unknown) {
      // If secret doesn't exist, create it
      const putMessage = putErr instanceof Error ? putErr.message : String(putErr);
      if (putMessage.includes('ResourceNotFoundException') || putMessage.includes('not found')) {
        try {
          const tags = metadata
            ? Object.entries(metadata).map(([k, v]) => ({ Key: k, Value: String(v) }))
            : [];

          const createResult = await this.client.createSecret({
            Name: secretName,
            SecretString: value,
            Description: (metadata?.['description'] as string) ?? '',
            Tags: tags,
          });

          // Invalidate cache after create
          this.invalidateCache(tenantId, path);

          return DataProcessResult.success({
            path,
            version: createResult.VersionId ?? 'unknown',
            provider: 'aws_secrets_manager',
            arn: createResult.ARN,
            created: true,
          });
        } catch (createErr: unknown) {
          return DataProcessResult.failure(
            'PROVIDER_ERROR',
            `AWS create secret error: ${createErr instanceof Error ? createErr.message : String(createErr)}`,
          );
        }
      }
      return DataProcessResult.failure('PROVIDER_ERROR', `AWS put secret error: ${putMessage}`);
    }
  }

  async deleteSecret(path: string): Promise<DataProcessResult<boolean>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    if (!path) return DataProcessResult.failure('INVALID_PATH', 'path cannot be empty');

    const secretName = this.buildSecretName(tenantId, path);

    try {
      await this.client.deleteSecret({
        SecretId: secretName,
        ForceDeleteWithoutRecovery: true,
      });

      // Invalidate cache on delete
      this.invalidateCache(tenantId, path);

      return DataProcessResult.success(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('ResourceNotFoundException') || message.includes('not found')) {
        return DataProcessResult.failure('SECRET_NOT_FOUND', `Secret '${path}' not found in AWS`);
      }
      return DataProcessResult.failure('PROVIDER_ERROR', `AWS delete secret error: ${message}`);
    }
  }

  async listSecrets(prefix?: string): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    const namePrefix = prefix
      ? `${this.config.prefix}/${tenantId}/${prefix}`
      : `${this.config.prefix}/${tenantId}/`;

    try {
      const result = await this.client.listSecrets({
        Filters: [{ Key: 'name', Values: [namePrefix] }],
      });

      // IRON RULE: Never return secret values — metadata only
      const entries = (result.SecretList ?? []).map((entry) => ({
        path: entry.Name ?? '',
        description: entry.Description ?? '',
        last_changed: entry.LastChangedDate?.toISOString() ?? null,
        last_accessed: entry.LastAccessedDate?.toISOString() ?? null,
        provider: 'aws_secrets_manager',
        arn: entry.ARN ?? null,
      }));

      return DataProcessResult.success(entries);
    } catch (err: unknown) {
      return DataProcessResult.failure(
        'PROVIDER_ERROR',
        `AWS list secrets error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async healthCheck(): Promise<DataProcessResult<boolean>> {
    try {
      // Lightweight probe — list max 1 secret
      await this.client.listSecrets({ MaxResults: 1 });
      return DataProcessResult.success(true);
    } catch (err: unknown) {
      return DataProcessResult.failure(
        'UNHEALTHY',
        `AWS Secrets Manager health failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
