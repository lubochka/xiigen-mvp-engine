/**
 * TenantContext — Immutable context object for the current tenant.
 * Stored in AsyncLocalStorage via @nestjs/cls so any service
 * in the call chain can read it without passing tenant_id as a parameter.
 *
 * This replaces the Python pattern of passing tenant_id: str as first arg to every method.
 */

export interface TenantPlan {
  readonly name: string; // 'free' | 'pro' | 'enterprise'
  readonly maxApiCallsPerMinute: number;
  readonly maxTokensPerDay: number;
  readonly maxStorageMb: number;
}

export interface TenantRecord {
  readonly id: string;
  readonly name: string;
  readonly status: 'active' | 'inactive' | 'suspended';
  readonly plan: TenantPlan;
  readonly configOverrides: Record<string, unknown>;
  readonly apiKeys: Record<string, string>; // provider → encrypted key
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Default plan for new tenants. */
export const DEFAULT_PLAN: TenantPlan = Object.freeze({
  name: 'free',
  maxApiCallsPerMinute: 60,
  maxTokensPerDay: 100_000,
  maxStorageMb: 500,
});

/**
 * Immutable tenant context — set once per request, read by any service.
 * Never constructed directly by services — only by TenantContextMiddleware.
 */
export class TenantContext {
  readonly tenantId: string;
  readonly tenantName: string;
  readonly status: 'active' | 'inactive' | 'suspended';
  readonly plan: TenantPlan;
  readonly configOverrides: Readonly<Record<string, unknown>>;
  readonly apiKeys: Readonly<Record<string, string>>;

  constructor(tenant: TenantRecord) {
    this.tenantId = tenant.id;
    this.tenantName = tenant.name;
    this.status = tenant.status;
    this.plan = Object.freeze({ ...tenant.plan });
    this.configOverrides = Object.freeze({ ...tenant.configOverrides });
    this.apiKeys = Object.freeze({ ...tenant.apiKeys });
    Object.freeze(this);
  }

  /** Check if tenant is active. */
  get isActive(): boolean {
    return this.status === 'active';
  }

  /** Get a config override for this tenant, or undefined. */
  getConfigOverride(key: string): unknown | undefined {
    return this.configOverrides[key];
  }

  /** Get an API key for a provider, or undefined. */
  getApiKey(provider: string): string | undefined {
    return this.apiKeys[provider];
  }

  /** Serialize for logging / debugging. Never exposes API keys. */
  toSafeDict(): Record<string, unknown> {
    return {
      tenant_id: this.tenantId,
      tenant_name: this.tenantName,
      status: this.status,
      plan: this.plan.name,
      config_override_count: Object.keys(this.configOverrides).length,
      api_key_providers: Object.keys(this.apiKeys),
    };
  }
}

/** CLS key used to store TenantContext in AsyncLocalStorage. */
export const TENANT_CONTEXT_KEY = 'tenant';
