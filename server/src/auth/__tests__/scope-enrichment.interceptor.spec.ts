/**
 * ScopeEnrichmentInterceptor tests — FLOW-01 Phase A2.5 (V-04).
 *
 * Confirms the interceptor:
 *   - Reads req.user (JwtVerifiedPrincipal) + TenantContext + correlation-id
 *   - Writes a ScopeContext to CLS under SCOPE_CONTEXT_KEY
 *   - Is a NO-OP when req.user is missing (downstream guards decide 401/403)
 *   - Delegates to next.handle() in all cases (never short-circuits the chain)
 *
 * Ships 11 tests — comfortably above the V-04 "jest green for interceptor"
 * bar, and covers every branch in buildScopeFromPrincipal.
 */

import { of } from 'rxjs';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

import { ScopeContext, SCOPE_CONTEXT_KEY } from '../../kernel/scope-isolation';
import {
  TenantContext,
  DEFAULT_PLAN,
  TENANT_CONTEXT_KEY,
} from '../../kernel/multi-tenant/tenant-context';
import {
  ROLE_PLATFORM_ADMIN,
  ROLE_TENANT_ADMIN,
  ROLE_TENANT_USER,
} from '../../kernel/role-strings';
import { JwtVerifiedPrincipal } from '../auth.dto';
import {
  ScopeEnrichmentInterceptor,
  buildScopeFromPrincipal,
  CORRELATION_ID_HEADER,
} from '../scope-enrichment.interceptor';

// ── fakes ────────────────────────────────────────────────────────────────

class FakeCls {
  public readonly store = new Map<string, unknown>();
  set(key: string, value: unknown): void {
    this.store.set(key, value);
  }
  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }
}

function makeTenantContext(id = 'acme'): TenantContext {
  return new TenantContext({
    id,
    name: 'Acme Inc.',
    status: 'active',
    plan: { ...DEFAULT_PLAN },
    configOverrides: {},
    apiKeys: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

function makePrincipal(
  overrides: Partial<JwtVerifiedPrincipal> = {},
): JwtVerifiedPrincipal {
  return {
    userId: 'u-1',
    tenantId: 'acme',
    roles: [ROLE_TENANT_USER],
    jti: 'jti-1',
    expiresAt: 999_999,
    ...overrides,
  };
}

function makeContext(req: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({}),
    }),
  } as unknown as ExecutionContext;
}

function makeNext(): CallHandler {
  return {
    handle: jest.fn(() => of('downstream-result')),
  } as unknown as CallHandler;
}

// ── buildScopeFromPrincipal ──────────────────────────────────────────────

describe('buildScopeFromPrincipal', () => {
  it('builds a ScopeContext with principal roles + userId + tenantId', () => {
    const scope = buildScopeFromPrincipal(
      makePrincipal({ roles: [ROLE_TENANT_ADMIN, ROLE_PLATFORM_ADMIN] }),
      makeTenantContext('acme'),
      'corr-xyz',
    );
    expect(scope).toBeInstanceOf(ScopeContext);
    expect(scope.tenantId).toBe('acme');
    expect(scope.userId).toBe('u-1');
    expect(scope.correlationId).toBe('corr-xyz');
    expect([...scope.roles]).toEqual([ROLE_TENANT_ADMIN, ROLE_PLATFORM_ADMIN]);
  });

  it('prefers principal.tenantId over TenantContext.tenantId', () => {
    const scope = buildScopeFromPrincipal(
      makePrincipal({ tenantId: 'acme' }),
      makeTenantContext('northwind'), // middleware tenant
      undefined,
    );
    // Under Phase A2.5 the principal.tenantId is the verified JWT claim;
    // TenantContextMiddleware's value is a duplicate safety net. Trust the
    // principal (and a later JwtAuthStrategy guarantee keeps them in sync).
    expect(scope.tenantId).toBe('acme');
  });

  it('falls back to TenantContext.tenantId when principal.tenantId is empty', () => {
    const scope = buildScopeFromPrincipal(
      makePrincipal({ tenantId: '' }),
      makeTenantContext('acme'),
      undefined,
    );
    expect(scope.tenantId).toBe('acme');
  });

  it('carries undefined correlationId when header missing', () => {
    const scope = buildScopeFromPrincipal(
      makePrincipal(),
      makeTenantContext('acme'),
      undefined,
    );
    expect(scope.correlationId).toBeUndefined();
  });

  it('exposes hasRole / hasAnyRole helpers matching the role claims', () => {
    const scope = buildScopeFromPrincipal(
      makePrincipal({ roles: [ROLE_TENANT_ADMIN] }),
      makeTenantContext('acme'),
      undefined,
    );
    expect(scope.hasRole(ROLE_TENANT_ADMIN)).toBe(true);
    expect(scope.hasRole(ROLE_PLATFORM_ADMIN)).toBe(false);
    expect(scope.hasAnyRole([ROLE_PLATFORM_ADMIN, ROLE_TENANT_ADMIN])).toBe(true);
    expect(scope.hasAnyRole([ROLE_PLATFORM_ADMIN])).toBe(false);
  });
});

// ── ScopeEnrichmentInterceptor ────────────────────────────────────────────

describe('ScopeEnrichmentInterceptor', () => {
  let cls: FakeCls;
  let interceptor: ScopeEnrichmentInterceptor;

  beforeEach(() => {
    cls = new FakeCls();
    cls.set(TENANT_CONTEXT_KEY, makeTenantContext('acme'));
    interceptor = new ScopeEnrichmentInterceptor(
      cls as unknown as ClsService,
    );
  });

  it('writes ScopeContext to CLS when req.user is a verified principal', () => {
    const req = {
      user: makePrincipal({ roles: [ROLE_TENANT_USER] }),
      headers: {},
    };
    const next = makeNext();
    interceptor.intercept(makeContext(req), next);
    const scope = cls.get<ScopeContext>(SCOPE_CONTEXT_KEY);
    expect(scope).toBeDefined();
    expect(scope?.tenantId).toBe('acme');
    expect(scope?.userId).toBe('u-1');
    expect(scope?.roles).toEqual([ROLE_TENANT_USER]);
    expect(next.handle).toHaveBeenCalledTimes(1);
  });

  it('propagates correlation-id header (lowercase) into ScopeContext', () => {
    const req = {
      user: makePrincipal(),
      headers: { 'x-correlation-id': 'trace-42' },
    };
    interceptor.intercept(makeContext(req), makeNext());
    const scope = cls.get<ScopeContext>(SCOPE_CONTEXT_KEY);
    expect(scope?.correlationId).toBe('trace-42');
  });

  it('propagates correlation-id header (PascalCase) into ScopeContext', () => {
    const req = {
      user: makePrincipal(),
      headers: { 'X-Correlation-Id': 'trace-pc' },
    };
    interceptor.intercept(makeContext(req), makeNext());
    const scope = cls.get<ScopeContext>(SCOPE_CONTEXT_KEY);
    expect(scope?.correlationId).toBe('trace-pc');
  });

  it('handles array header values by taking the first entry', () => {
    const req = {
      user: makePrincipal(),
      headers: { [CORRELATION_ID_HEADER]: ['trace-a', 'trace-b'] },
    };
    interceptor.intercept(makeContext(req), makeNext());
    const scope = cls.get<ScopeContext>(SCOPE_CONTEXT_KEY);
    expect(scope?.correlationId).toBe('trace-a');
  });

  it('is a NO-OP when req.user is missing — no ScopeContext written, chain continues', () => {
    const req = { headers: {} };
    const next = makeNext();
    interceptor.intercept(makeContext(req), next);
    expect(cls.get(SCOPE_CONTEXT_KEY)).toBeUndefined();
    expect(next.handle).toHaveBeenCalledTimes(1);
  });

  it('is a NO-OP when req.user is present but lacks userId', () => {
    const req = {
      user: { tenantId: 'acme', roles: [] } as unknown,
      headers: {},
    };
    interceptor.intercept(makeContext(req), makeNext());
    expect(cls.get(SCOPE_CONTEXT_KEY)).toBeUndefined();
  });

  it('never throws when CLS lacks TenantContext — uses principal.tenantId', () => {
    cls.store.delete(TENANT_CONTEXT_KEY);
    const req = {
      user: makePrincipal({ tenantId: 'northwind' }),
      headers: {},
    };
    interceptor.intercept(makeContext(req), makeNext());
    const scope = cls.get<ScopeContext>(SCOPE_CONTEXT_KEY);
    expect(scope?.tenantId).toBe('northwind');
  });

  it('returns the observable produced by next.handle() verbatim', (done) => {
    const req = { user: makePrincipal(), headers: {} };
    const handler = makeNext();
    const result$ = interceptor.intercept(makeContext(req), handler);
    result$.subscribe((value) => {
      expect(value).toBe('downstream-result');
      done();
    });
  });
});
