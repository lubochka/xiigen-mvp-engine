/**
 * FABRIC: ISecretsManager
 *
 * Tenant-scoped secrets store. Reads the current tenant via AsyncLocalStorage
 * internally — callers never pass tenantId (DNA-5).
 *
 * Provider swappable: AWS Secrets Manager, HashiCorp Vault, encrypted ES index.
 * Per CLAUDE.md Rule 2 (Safe Configs) + Rule 14 (FREEDOM over code):
 *   - Credentials NEVER live in source, env vars, or constructor parameters
 *   - Secret keys like `tenant_github_token` are FREEDOM config keys; value
 *     is stored in the secrets provider
 *
 * All methods return DataProcessResult (DNA-3). No throws.
 *
 * XIIGEN-GAP-IMPLEMENTATION-PLAN-v1.1 GAP-25 BLOCK 2: resolved by this interface.
 */

import { DataProcessResult } from '../../kernel/data-process-result';

export const SECRETS_MANAGER_SERVICE = Symbol('ISecretsManager');

export interface ISecretsManager {
  /** Read a secret by key (tenant-scoped via AsyncLocalStorage). */
  get(key: string): Promise<DataProcessResult<string>>;

  /** Store or update a secret. Optional TTL in seconds. */
  set(key: string, value: string, ttlSeconds?: number): Promise<DataProcessResult<void>>;

  /** Rotate a secret — provider decides the new value (e.g. re-generated PAT). */
  rotate(key: string): Promise<DataProcessResult<string>>;

  /** Revoke + remove a secret. Idempotent. */
  revoke(key: string): Promise<DataProcessResult<void>>;
}
