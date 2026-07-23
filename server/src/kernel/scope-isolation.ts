/**
 * DNA-5: Scope Isolation
 * Every query, every write, every event MUST include tenant_id.
 * Missing tenant_id = immediate failure (DataProcessResult.failure), never silent data leak.
 */

import { DataProcessResult } from './data-process-result';

/**
 * Immutable scope context — carried through every operation.
 */
export class ScopeContext {
  readonly tenantId: string;
  readonly userId: string | undefined;
  readonly correlationId: string | undefined;
  readonly roles: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;

  constructor(params: {
    tenantId: string;
    userId?: string;
    correlationId?: string;
    roles?: string[];
    metadata?: Record<string, unknown>;
  }) {
    this.tenantId = params.tenantId;
    this.userId = params.userId;
    this.correlationId = params.correlationId;
    this.roles = Object.freeze(params.roles ?? []);
    this.metadata = Object.freeze(params.metadata ?? {});
    Object.freeze(this);
  }

  /** Serialize for embedding in messages/documents. */
  toDict(): Record<string, unknown> {
    const result: Record<string, unknown> = { tenant_id: this.tenantId };
    if (this.userId) {
      result['user_id'] = this.userId;
    }
    if (this.correlationId) {
      result['correlation_id'] = this.correlationId;
    }
    if (this.roles.length > 0) {
      result['roles'] = [...this.roles];
    }
    return result;
  }

  /** True iff this scope carries the given role. */
  hasRole(role: string): boolean {
    return this.roles.includes(role);
  }

  /** True iff this scope carries any of the given roles. */
  hasAnyRole(roles: readonly string[]): boolean {
    for (const role of roles) {
      if (this.roles.includes(role)) return true;
    }
    return false;
  }
}

/**
 * CLS key used to store ScopeContext in AsyncLocalStorage.
 * Set by ScopeEnrichmentInterceptor (FLOW-01 Phase A2.5) once the JWT principal
 * has been verified and the tenant context is already in place. Guards,
 * services, and interceptors downstream read this instead of reconstructing
 * the scope themselves.
 */
export const SCOPE_CONTEXT_KEY = 'scope';

/**
 * Validate that tenant_id is present and non-empty.
 * DNA-5 Rule: EVERY operation must pass this check. No exceptions.
 */
export function validateScope(tenantId: string | null | undefined): DataProcessResult<string> {
  if (
    tenantId === null ||
    tenantId === undefined ||
    (typeof tenantId === 'string' && tenantId.trim() === '')
  ) {
    return DataProcessResult.failure(
      'SCOPE_MISSING',
      'tenant_id is required — DNA-5 scope isolation violation',
    );
  }
  return DataProcessResult.success(tenantId.trim());
}

/**
 * Stamp tenant_id onto a document before storage.
 * If document already has a different tenant_id → returns DataProcessResult.failure (DNA-3 — never throw).
 * Returns a new object (never mutates input).
 *
 * P26 FIX-3: replaced throw with DataProcessResult.failure.
 */
export function enforceScope(
  document: Record<string, unknown>,
  tenantId: string,
): DataProcessResult<Record<string, unknown>> {
  const doc = { ...document };
  const existing = doc['tenant_id'];
  if (existing !== undefined && existing !== null && existing !== tenantId) {
    return DataProcessResult.failure(
      'SCOPE_VIOLATION',
      `Scope violation: document tenant_id='${existing}' != request tenant_id='${tenantId}'`,
    );
  }
  doc['tenant_id'] = tenantId;
  return DataProcessResult.success(doc);
}

/**
 * Higher-order function wrapper — ensures first argument 'tenantId' is valid.
 * Returns DataProcessResult.failure if missing.
 *
 * In NestJS, the preferred pattern is TenantGuard + AsyncLocalStorage (P1.4).
 * This decorator is kept for compatibility and for functions outside the HTTP pipeline.
 */
export function requireTenantId<TArgs extends unknown[], TResult>(
  fn: (tenantId: string, ...args: TArgs) => TResult | Promise<TResult>,
): (tenantId: string, ...args: TArgs) => TResult | Promise<TResult> {
  return function wrappedFn(tenantId: string, ...args: TArgs): TResult | Promise<TResult> {
    const check = validateScope(tenantId);
    if (!check.isSuccess) {
      // Return the failure result — works for both sync and async callers
      return check as unknown as TResult;
    }

    return fn(tenantId, ...args);
  };
}
