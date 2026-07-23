/**
 * FABRIC 7: ISecretsService (FLOW-35 — Secrets Fabric)
 *
 * Secrets Fabric — 3+ providers resolved at runtime via config.
 * Providers: AWS Secrets Manager, EnvVar, InMemory (test).
 * Service code calls ISecretsService.getSecret(), never boto3 directly.
 *
 * Iron Rule: Never log secret values, never store in DB, never return in API.
 *
 * v4: No tenant_id parameter. Read from CLS internally.
 */

import { DataProcessResult } from '../../kernel/data-process-result';

export abstract class ISecretsService {
  /**
   * Retrieve a secret by path.
   * Returns { value, version, provider, cached }.
   * Path format: 'namespace/key' (e.g. 'xiigen/ai/anthropic_key').
   */
  abstract getSecret(
    path: string,
    version?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;

  /**
   * Store/update a secret.
   * Returns { path, version, provider }.
   */
  abstract setSecret(
    path: string,
    value: string,
    metadata?: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>>;

  /** Delete a secret by path. */
  abstract deleteSecret(path: string): Promise<DataProcessResult<boolean>>;

  /**
   * List secret metadata (paths, versions) under prefix.
   * NEVER returns secret values — only metadata.
   */
  abstract listSecrets(prefix?: string): Promise<DataProcessResult<Array<Record<string, unknown>>>>;

  /** Check provider connectivity. */
  abstract healthCheck(): Promise<DataProcessResult<boolean>>;
}

/** Injection token for ISecretsService. */
export const SECRETS_SERVICE = Symbol('ISecretsService');
