/**
 * Secrets Fabric — base types, enums, and config.
 *
 * 4 providers: InMemory (test), EnvVar (local dev), AWS Secrets Manager
 * (cloud prod), Vault (local/platform dev).
 * Resolved at runtime via config. Service code calls ISecretsService.getSecret().
 *
 * Iron Rule: Never log secret values, never store in DB, never return in API.
 *
 * Phase 5.1: Types only. Concrete providers in P5.2.
 */

// ── Provider Type Enum ───────────────────────────────

export enum SecretsProviderType {
  IN_MEMORY = 'in_memory',
  ENV_VAR = 'env_var',
  AWS_SECRETS_MANAGER = 'aws_secrets_manager',
  VAULT = 'vault',
}

/** All valid secrets provider type values, for validation. */
export const ALL_SECRETS_PROVIDER_TYPES: readonly SecretsProviderType[] =
  Object.values(SecretsProviderType);

// ── Provider Config ──────────────────────────────────

export interface SecretsProviderConfig {
  /** Which secrets provider to use. */
  readonly providerType: SecretsProviderType;
  /** AWS region (relevant for AWS provider). */
  readonly region: string;
  /** Secret name prefix for tenant isolation. */
  readonly prefix: string;
  /** TTL for cached secrets in seconds (0 = no caching). */
  readonly cacheTtlSeconds: number;
  /** Per-path overrides: { 'xiigen/ai/*': 'aws_secrets_manager' } */
  readonly pathOverrides: Record<string, string>;
  /** Additional provider-specific options. */
  readonly options: Record<string, unknown>;
}

/** Sensible defaults for secrets config. */
export function defaultSecretsConfig(
  overrides?: Partial<SecretsProviderConfig>,
): SecretsProviderConfig {
  return {
    providerType: SecretsProviderType.IN_MEMORY,
    region: 'us-east-1',
    prefix: 'xiigen',
    cacheTtlSeconds: 300,
    pathOverrides: {},
    options: {},
    ...overrides,
  };
}

/** Check if a provider type is valid. */
export function isValidSecretsProvider(providerType: string): providerType is SecretsProviderType {
  return ALL_SECRETS_PROVIDER_TYPES.includes(providerType as SecretsProviderType);
}

/** Serialize SecretsProviderConfig to dict (DNA-1). */
export function secretsConfigToDict(config: SecretsProviderConfig): Record<string, unknown> {
  return {
    provider_type: config.providerType,
    region: config.region,
    prefix: config.prefix,
    cache_ttl_seconds: config.cacheTtlSeconds,
    path_overrides: { ...config.pathOverrides },
    options: { ...config.options },
  };
}
