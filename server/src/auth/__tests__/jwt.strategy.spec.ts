/**
 * JwtAuthStrategy tests — FLOW-01 Phase A1 + A4 (V-06).
 *
 * Confirms the strategy:
 *   - extracts Bearer tokens correctly (header present/missing/malformed)
 *   - delegates verification to ITokenService.verify
 *   - calls this.success(principal) on verify success
 *   - calls this.fail(reason) on verify failure (passport bridges to 401)
 *   - calls this.error(err) on thrown exception
 *
 * Phase A4 additions:
 *   - on success: writes ScopeContext to CLS under SCOPE_CONTEXT_KEY
 *   - preserves principal.tenantId as scope.tenantId (with TenantContext fallback)
 *   - propagates x-correlation-id header into ScopeContext
 *   - does NOT write to CLS on failure
 */

import { ClsService } from 'nestjs-cls';

import { DataProcessResult } from '../../kernel/data-process-result';
import { TokenVerifyResult, ITokenService } from '../../fabrics/interfaces/token.service.interface';
import { ScopeContext, SCOPE_CONTEXT_KEY } from '../../kernel/scope-isolation';
import {
  TenantContext,
  DEFAULT_PLAN,
  TENANT_CONTEXT_KEY,
} from '../../kernel/multi-tenant/tenant-context';
import { JwtAuthStrategy, extractBearerToken } from '../jwt.strategy';

class StubTokenService implements Partial<ITokenService> {
  public lastToken?: string;
  public throwOnVerify = false;
  public response: DataProcessResult<TokenVerifyResult> = DataProcessResult.success({
    subject: 'u-1',
    tenantId: 'acme',
    roles: ['tenant-user'],
    claims: {},
    expiresAt: 1_000_000,
    jti: 'jti-xyz',
  });

  async verify(token: string): Promise<DataProcessResult<TokenVerifyResult>> {
    this.lastToken = token;
    if (this.throwOnVerify) throw new Error('boom');
    return this.response;
  }
}

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

function waitMacroTick(): Promise<void> {
  // passport success/fail/error are called from a Promise.then — flush the
  // microtask queue once to let them run.
  return new Promise((resolve) => setImmediate(resolve));
}

describe('extractBearerToken', () => {
  it('returns null when header missing', () => {
    expect(extractBearerToken({ headers: {} })).toBeNull();
    expect(extractBearerToken({})).toBeNull();
  });

  it('returns null when scheme is not Bearer', () => {
    expect(extractBearerToken({ headers: { authorization: 'Basic abc' } })).toBeNull();
  });

  it('returns null when token is empty after Bearer prefix', () => {
    expect(extractBearerToken({ headers: { authorization: 'Bearer ' } })).toBeNull();
  });

  it('extracts the token with lowercase header name', () => {
    expect(extractBearerToken({ headers: { authorization: 'Bearer jwt.abc' } })).toBe(
      'jwt.abc',
    );
  });

  it('extracts the token with PascalCase header name', () => {
    expect(extractBearerToken({ headers: { Authorization: 'Bearer jwt.xyz' } })).toBe(
      'jwt.xyz',
    );
  });
});

describe('JwtAuthStrategy', () => {
  let tokens: StubTokenService;
  let cls: FakeCls;
  let strategy: JwtAuthStrategy;
  // Passport success/fail/error are bound at runtime by passport; in tests we stub them directly.
  let successSpy: jest.Mock;
  let failSpy: jest.Mock;
  let errorSpy: jest.Mock;

  beforeEach(() => {
    tokens = new StubTokenService();
    cls = new FakeCls();
    cls.set(TENANT_CONTEXT_KEY, makeTenantContext('acme'));
    strategy = new JwtAuthStrategy(
      tokens as unknown as ITokenService,
      cls as unknown as ClsService,
    );
    successSpy = jest.fn();
    failSpy = jest.fn();
    errorSpy = jest.fn();
    Object.assign(strategy, {
      success: successSpy,
      fail: failSpy,
      error: errorSpy,
    });
  });

  it('calls fail(NO_TOKEN) when Authorization header missing', async () => {
    strategy.authenticate({ headers: {} });
    await waitMacroTick();
    expect(failSpy).toHaveBeenCalledWith('NO_TOKEN');
    expect(successSpy).not.toHaveBeenCalled();
  });

  it('calls success(principal) when ITokenService.verify succeeds', async () => {
    strategy.authenticate({ headers: { authorization: 'Bearer jwt.valid' } });
    await waitMacroTick();
    expect(tokens.lastToken).toBe('jwt.valid');
    expect(successSpy).toHaveBeenCalledTimes(1);
    expect(successSpy.mock.calls[0][0]).toEqual({
      userId: 'u-1',
      tenantId: 'acme',
      roles: ['tenant-user'],
      jti: 'jti-xyz',
      expiresAt: 1_000_000,
    });
  });

  it('calls fail(errorCode) when ITokenService.verify fails', async () => {
    tokens.response = DataProcessResult.failure('TOKEN_EXPIRED', 'expired');
    strategy.authenticate({ headers: { authorization: 'Bearer jwt.stale' } });
    await waitMacroTick();
    expect(failSpy).toHaveBeenCalledWith('TOKEN_EXPIRED');
    expect(successSpy).not.toHaveBeenCalled();
  });

  it('calls error(err) when ITokenService.verify throws', async () => {
    tokens.throwOnVerify = true;
    strategy.authenticate({ headers: { authorization: 'Bearer jwt.broken' } });
    await waitMacroTick();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect((errorSpy.mock.calls[0][0] as Error).message).toBe('boom');
  });

  // ── Phase A4: CLS scope write on success ────────────────────────────────

  it('writes a ScopeContext to CLS on successful verify (principal.tenantId wins)', async () => {
    strategy.authenticate({ headers: { authorization: 'Bearer jwt.valid' } });
    await waitMacroTick();
    const scope = cls.get<ScopeContext>(SCOPE_CONTEXT_KEY);
    expect(scope).toBeInstanceOf(ScopeContext);
    expect(scope?.tenantId).toBe('acme');
    expect(scope?.userId).toBe('u-1');
    expect(scope?.roles).toEqual(['tenant-user']);
  });

  it('propagates the x-correlation-id header into the ScopeContext', async () => {
    strategy.authenticate({
      headers: {
        authorization: 'Bearer jwt.valid',
        'x-correlation-id': 'corr-789',
      },
    });
    await waitMacroTick();
    const scope = cls.get<ScopeContext>(SCOPE_CONTEXT_KEY);
    expect(scope?.correlationId).toBe('corr-789');
  });

  it('accepts correlation-id header in PascalCase too', async () => {
    strategy.authenticate({
      headers: {
        authorization: 'Bearer jwt.valid',
        'X-Correlation-Id': 'corr-pc',
      },
    });
    await waitMacroTick();
    const scope = cls.get<ScopeContext>(SCOPE_CONTEXT_KEY);
    expect(scope?.correlationId).toBe('corr-pc');
  });

  it('falls back to TenantContext.tenantId when principal.tenantId is empty', async () => {
    tokens.response = DataProcessResult.success({
      subject: 'u-2',
      tenantId: '',
      roles: ['tenant-user'],
      claims: {},
      expiresAt: 999,
      jti: 'jti-empty',
    });
    strategy.authenticate({ headers: { authorization: 'Bearer jwt.empty' } });
    await waitMacroTick();
    const scope = cls.get<ScopeContext>(SCOPE_CONTEXT_KEY);
    expect(scope?.tenantId).toBe('acme'); // from TenantContext
  });

  it('does NOT write to CLS when verify fails', async () => {
    tokens.response = DataProcessResult.failure('TOKEN_EXPIRED', 'expired');
    strategy.authenticate({ headers: { authorization: 'Bearer jwt.stale' } });
    await waitMacroTick();
    expect(cls.get(SCOPE_CONTEXT_KEY)).toBeUndefined();
  });

  it('does NOT write to CLS when verify throws', async () => {
    tokens.throwOnVerify = true;
    strategy.authenticate({ headers: { authorization: 'Bearer jwt.broken' } });
    await waitMacroTick();
    expect(cls.get(SCOPE_CONTEXT_KEY)).toBeUndefined();
  });

  it('still writes scope when TenantContext is absent from CLS (uses principal.tenantId)', async () => {
    cls.store.delete(TENANT_CONTEXT_KEY);
    strategy.authenticate({ headers: { authorization: 'Bearer jwt.valid' } });
    await waitMacroTick();
    const scope = cls.get<ScopeContext>(SCOPE_CONTEXT_KEY);
    expect(scope?.tenantId).toBe('acme'); // from principal
  });
});
