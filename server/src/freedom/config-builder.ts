/**
 * ConfigBuilder — resolves $secret: and $env: references in config dicts.
 *
 * Takes a raw config dict, walks every string value, resolves references
 * through ISecretsService (Secrets Fabric) or process.env, and returns
 * a plain dict with all secrets transparently resolved.
 *
 * Iron Rules:
 *   - Never log resolved secret values
 *   - Never store resolved values in Database Fabric
 *   - Never return resolved values in API responses
 *   - Cache with TTL only (no indefinite caching)
 *   - scope_id (tenant_id) required on every resolve call (DNA-5)
 *
 * Phase 7.4: FREEDOM infrastructure.
 */

import { Injectable, Optional } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { validateScope } from '../kernel/scope-isolation';
import { SecretReference, EnvReference, AnyReference, findReferences } from './secret-reference';

/** Interface for secrets service — matches ISecretsService from Secrets Fabric. */
export interface IConfigSecretsProvider {
  getSecret(
    tenantId: string,
    path: string,
    version?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

@Injectable()
export class ConfigBuilder {
  private readonly secrets: IConfigSecretsProvider | undefined;
  private readonly cacheTtl: number;
  private readonly environ: Record<string, string | undefined>;
  private readonly cache = new Map<string, { value: string; at: number }>();
  private readonly stats = { resolved: 0, cached: 0, failed: 0 };

  constructor(
    @Optional()
    params?: {
      secretsService?: IConfigSecretsProvider;
      cacheTtl?: number;
      environ?: Record<string, string | undefined>;
    },
  ) {
    this.secrets = params?.secretsService;
    this.cacheTtl = params?.cacheTtl ?? 300;
    this.environ = params?.environ ?? process.env;
  }

  /**
   * Walk config dict, resolve all $secret: and $env: references.
   * Returns a new dict with plain values. Original dict is NOT mutated.
   */
  async resolve(
    tenantId: string,
    config: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const scopeCheck = validateScope(tenantId);
    if (!scopeCheck.isSuccess) {
      return DataProcessResult.failure(
        'SCOPE_MISSING',
        scopeCheck.errorMessage ?? 'tenant_id required',
      );
    }

    if (!config || typeof config !== 'object') {
      return DataProcessResult.failure('INVALID_CONFIG', 'config must be an object');
    }

    // Deep copy to avoid mutating the original
    const resolved = JSON.parse(JSON.stringify(config));

    // Find all references
    const refs = findReferences(resolved);
    if (refs.length === 0) {
      return DataProcessResult.success(resolved);
    }

    // Resolve each reference
    const errors: Array<Record<string, unknown>> = [];

    for (const refEntry of refs) {
      const result = await this.resolveSingle(tenantId, refEntry.ref);
      if (result.isSuccess) {
        setNested(resolved, refEntry.configPath, result.data);
      } else {
        errors.push({
          config_path: refEntry.configPath,
          raw_value: refEntry.rawValue,
          error: result.errorMessage,
        });
        this.stats.failed++;
      }
    }

    if (errors.length > 0) {
      return DataProcessResult.failure(
        'RESOLVE_INCOMPLETE',
        `${errors.length} reference(s) failed to resolve`,
        { resolved_config: resolved, errors },
      );
    }

    return DataProcessResult.success(resolved);
  }

  /**
   * Resolve a single reference, checking cache first.
   */
  private async resolveSingle(
    tenantId: string,
    ref: AnyReference,
  ): Promise<DataProcessResult<string>> {
    const cacheKey = `${tenantId}::${ref.cacheKey}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.at < this.cacheTtl * 1000) {
      this.stats.cached++;
      return DataProcessResult.success(cached.value);
    }

    // Resolve
    let result: DataProcessResult<string>;

    if (ref instanceof SecretReference) {
      result = await this.resolveSecret(tenantId, ref);
    } else if (ref instanceof EnvReference) {
      result = this.resolveEnv(ref);
    } else {
      return DataProcessResult.failure('UNKNOWN_REF_TYPE', `Unknown reference type`);
    }

    // Cache on success
    if (result.isSuccess && this.cacheTtl > 0) {
      this.cache.set(cacheKey, { value: result.data!, at: Date.now() });
    }
    if (result.isSuccess) {
      this.stats.resolved++;
    }

    return result;
  }

  /**
   * Resolve a $secret: reference through ISecretsService.
   */
  private async resolveSecret(
    tenantId: string,
    ref: SecretReference,
  ): Promise<DataProcessResult<string>> {
    if (!this.secrets) {
      return DataProcessResult.failure(
        'NO_SECRETS_SERVICE',
        'ISecretsService not configured — cannot resolve $secret: references',
      );
    }

    const result = await this.secrets.getSecret(tenantId, ref.path, ref.version);
    if (!result.isSuccess) {
      return DataProcessResult.failure(
        result.errorCode ?? 'SECRET_RESOLVE_FAILED',
        result.errorMessage ?? `Failed to resolve secret: ${ref.path}`,
      );
    }

    const value = result.data?.value;
    if (typeof value !== 'string') {
      return DataProcessResult.failure(
        'SECRET_NOT_STRING',
        `Secret at '${ref.path}' is not a string`,
      );
    }

    return DataProcessResult.success(value);
  }

  /**
   * Resolve a $env: reference from environment variables.
   */
  private resolveEnv(ref: EnvReference): DataProcessResult<string> {
    const value = this.environ[ref.variable];
    if (value === undefined) {
      return DataProcessResult.failure(
        'ENV_NOT_FOUND',
        `Environment variable '${ref.variable}' not set`,
      );
    }
    return DataProcessResult.success(value);
  }

  /**
   * Invalidate cached resolved values.
   * If tenantId provided, only that tenant's cache. Otherwise all.
   * Returns count removed.
   */
  invalidateCache(tenantId?: string): number {
    if (tenantId) {
      const prefix = `${tenantId}::`;
      const keys = [...this.cache.keys()].filter((k) => k.startsWith(prefix));
      for (const k of keys) this.cache.delete(k);
      return keys.length;
    }
    const count = this.cache.size;
    this.cache.clear();
    return count;
  }

  /** Resolution statistics. */
  getStats(): { resolved: number; cached: number; failed: number } {
    return { ...this.stats };
  }

  /** Cache size. */
  get cacheSize(): number {
    return this.cache.size;
  }

  /** Reset stats (for testing). */
  resetStats(): void {
    this.stats.resolved = 0;
    this.stats.cached = 0;
    this.stats.failed = 0;
  }
}

// ── Nested setter ────────────────────────────────────

/**
 * Set a value in a nested object using dot-notation path.
 * Supports: "key1.key2.key3" for dicts, "key1[0].key2" for arrays.
 */
function setNested(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = parsePath(path);
  let current: Record<string, unknown> = obj as Record<string, unknown>;

  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

function parsePath(path: string): Array<string | number> {
  const parts: Array<string | number> = [];
  for (const segment of path.split('.')) {
    if (segment.includes('[')) {
      const [key, rest] = segment.split('[', 2);
      if (key) parts.push(key);
      const idx = parseInt(rest.replace(']', ''), 10);
      parts.push(idx);
    } else {
      parts.push(segment);
    }
  }
  return parts;
}
