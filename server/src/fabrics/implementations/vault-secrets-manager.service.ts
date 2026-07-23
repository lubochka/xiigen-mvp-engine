/**
 * VaultSecretsManagerService — concrete ISecretsManager backed by HashiCorp
 * Vault OSS.
 *
 * Rule 1 (Fabric First) / D-HIST-001: this is the ONLY file in the codebase
 * that talks to Vault. All callers inject `SECRETS_MANAGER_SERVICE` and never
 * see Vault-specific details.
 *
 * Per-tenant configuration (NO process.env for tenant data):
 *   vault_address — profile-2 FREEDOM key; tenants running their own Vault
 *                   override the default (http://vault:8200). Platform tenants
 *                   share the platform Vault with their own token.
 *   vault_token   — profile-1 FREEDOM key; strictly per-tenant; no default.
 *                   Stored during tenant onboarding via a bootstrap flow that
 *                   runs once with platform-admin context.
 *
 * All methods read vault_address + vault_token per-call from the tenant's
 * AsyncLocalStorage-bound FREEDOM context (DNA-5). Never stored in the
 * constructor — that would freeze the first-requester's tenant.
 *
 * Secret path convention: `secret/data/{tenantId}/{key}` — Vault's KV v2 API
 * wraps the actual value under `.data.data.{key}`.
 *
 * All methods return DataProcessResult (DNA-3); no throws for business conditions.
 *
 * FORK-FLOW-ENGINE-PLAN-v1.1 Phase 1.
 *
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-47
 * @className VaultSecretsManagerService
 */

import { Injectable, Inject } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomBytes } from 'crypto'; // Finding 2: static import — no require() inside methods
import { DataProcessResult } from '../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../kernel/microservice-base';
import { TENANT_CONTEXT_KEY, TenantContext } from '../../kernel/multi-tenant/tenant-context';
import {
  FREEDOM_CONFIG_SERVICE,
  IFreedomConfigService,
} from '../../freedom/freedom-config.interface';
import { XIIGEN_FREEDOM_KEYS } from '../../freedom/config-schema';
import { ISecretsManager } from '../interfaces/secrets-manager.fabric.interface';

const DEFAULT_VAULT_ADDRESS = 'http://vault:8200';
const VAULT_API_PREFIX = '/v1/secret';

@Injectable()
export class VaultSecretsManagerService
  extends MicroserviceBase
  implements ISecretsManager
{
  constructor(
    @Inject(FREEDOM_CONFIG_SERVICE) private readonly freedom: IFreedomConfigService,
    private readonly cls: ClsService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'fabric.secrets.vault',
        serviceName: 'VaultSecretsManagerService',
        flowId: 'FLOW-47',
      }),
    });
  }

  async get(key: string): Promise<DataProcessResult<string>> {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      return DataProcessResult.failure(
        'MISSING_TENANT',
        'tenantId required — AsyncLocalStorage context not set (DNA-5)',
      );
    }

    const addr = await this.resolveVaultAddress();
    const tokenRes = await this.resolveVaultToken();
    if (!tokenRes.isSuccess || !tokenRes.data) {
      return DataProcessResult.failure(
        tokenRes.errorCode ?? 'VAULT_TOKEN_MISSING',
        tokenRes.errorMessage ?? 'vault_token not configured for this tenant',
      );
    }

    const url = `${addr}${VAULT_API_PREFIX}/data/${tenantId}/${key}`;
    try {
      const res = await fetch(url, {
        headers: { 'X-Vault-Token': tokenRes.data },
      });
      if (res.status === 404) {
        return DataProcessResult.failure('NOT_FOUND', `Secret not found: ${key}`);
      }
      if (!res.ok) {
        return DataProcessResult.failure(
          `VAULT_${res.status}`,
          `Vault error ${res.status} reading ${key}`,
        );
      }
      const body = (await res.json()) as Record<string, unknown>;
      const outer = body['data'] as Record<string, unknown> | undefined;
      const inner = outer?.['data'] as Record<string, unknown> | undefined;
      const value = inner?.[key];
      if (typeof value !== 'string' || value.length === 0) {
        return DataProcessResult.failure('KEY_ABSENT', `Key absent in secret payload: ${key}`);
      }
      return DataProcessResult.success(value);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      return DataProcessResult.error('VAULT_UNREACHABLE', e.message, e);
    }
  }

  async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<DataProcessResult<void>> {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      return DataProcessResult.failure(
        'MISSING_TENANT',
        'tenantId required — AsyncLocalStorage context not set (DNA-5)',
      );
    }

    const addr = await this.resolveVaultAddress();
    const tokenRes = await this.resolveVaultToken();
    if (!tokenRes.isSuccess || !tokenRes.data) {
      return DataProcessResult.failure(
        tokenRes.errorCode ?? 'VAULT_TOKEN_MISSING',
        tokenRes.errorMessage ?? 'vault_token not configured for this tenant',
      );
    }

    const url = `${addr}${VAULT_API_PREFIX}/data/${tenantId}/${key}`;
    const options = ttlSeconds ? { ttl: `${ttlSeconds}s` } : undefined;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Vault-Token': tokenRes.data,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: { [key]: value }, ...(options && { options }) }),
      });
      if (!res.ok) {
        const body = await res.text();
        return DataProcessResult.failure(
          `VAULT_${res.status}`,
          `Vault write error ${res.status}: ${body.slice(0, 200)}`,
        );
      }
      return DataProcessResult.success(undefined as unknown as void);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      return DataProcessResult.error('VAULT_UNREACHABLE', e.message, e);
    }
  }

  async rotate(key: string): Promise<DataProcessResult<string>> {
    // Finding 5: GitHub tokens cannot be machine-rotated — the engine cannot
    // invalidate the old PAT on github.com. A user must generate a new one.
    if (key === XIIGEN_FREEDOM_KEYS.TENANT_GITHUB_TOKEN) {
      return DataProcessResult.failure(
        'UNSUPPORTED_ROTATION',
        'GitHub tokens cannot be rotated automatically. ' +
          'Generate a new PAT at github.com/settings/tokens and call set() with the new value.',
      );
    }
    // Engine-managed secrets (DB passwords, app JWT): generate + overwrite
    const newValue = this.generateSecureValue();
    const setRes = await this.set(key, newValue);
    if (!setRes.isSuccess) {
      return DataProcessResult.failure(
        setRes.errorCode ?? 'ROTATE_WRITE_FAILED',
        setRes.errorMessage ?? 'rotate: set() returned !isSuccess',
      );
    }
    return DataProcessResult.success(newValue);
  }

  async revoke(key: string): Promise<DataProcessResult<void>> {
    const tenantId = this.getTenantId();
    if (!tenantId) {
      return DataProcessResult.failure(
        'MISSING_TENANT',
        'tenantId required — AsyncLocalStorage context not set (DNA-5)',
      );
    }

    const addr = await this.resolveVaultAddress();
    const tokenRes = await this.resolveVaultToken();
    if (!tokenRes.isSuccess || !tokenRes.data) {
      return DataProcessResult.failure(
        tokenRes.errorCode ?? 'VAULT_TOKEN_MISSING',
        tokenRes.errorMessage ?? 'vault_token not configured for this tenant',
      );
    }

    // KV v2 permanent delete uses metadata endpoint
    const url = `${addr}${VAULT_API_PREFIX}/metadata/${tenantId}/${key}`;
    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'X-Vault-Token': tokenRes.data },
      });
      if (res.status === 204 || res.status === 404) {
        // Idempotent — already gone is a success outcome
        return DataProcessResult.success(undefined as unknown as void);
      }
      if (!res.ok) {
        return DataProcessResult.failure(
          `VAULT_${res.status}`,
          `Vault revoke error ${res.status} for ${key}`,
        );
      }
      return DataProcessResult.success(undefined as unknown as void);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      return DataProcessResult.error('VAULT_UNREACHABLE', e.message, e);
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────

  /** Read tenant ID from AsyncLocalStorage via CLS. DNA-5. */
  private getTenantId(): string | null {
    try {
      const ctx = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      return ctx?.tenantId ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Resolve vault_address from the tenant's FREEDOM config. Falls back to
   * platform default (http://vault:8200) when tenant has not overridden.
   * Profile-2 key: tenant may point to their own Vault instance.
   */
  private async resolveVaultAddress(): Promise<string> {
    const doc = await this.freedom.get(XIIGEN_FREEDOM_KEYS.VAULT_ADDRESS);
    const value = doc?.['value'];
    return typeof value === 'string' && value.length > 0 ? value : DEFAULT_VAULT_ADDRESS;
  }

  /**
   * Resolve vault_token from the tenant's FREEDOM config. NO default — if
   * absent, every Vault call fails with VAULT_TOKEN_MISSING. Profile-1 key:
   * must be set per tenant during onboarding. Never read from process.env.
   */
  private async resolveVaultToken(): Promise<DataProcessResult<string>> {
    const doc = await this.freedom.get(XIIGEN_FREEDOM_KEYS.VAULT_TOKEN);
    const value = doc?.['value'];
    if (typeof value !== 'string' || value.length === 0) {
      return DataProcessResult.failure(
        'VAULT_TOKEN_MISSING',
        'vault_token not configured for this tenant — set it via onboarding flow',
      );
    }
    return DataProcessResult.success(value);
  }

  /** Generate a cryptographically-strong base64url-encoded value. */
  private generateSecureValue(): string {
    // Finding 2: static `randomBytes` import at top of file; no require() here.
    return randomBytes(32).toString('base64url');
  }
}
