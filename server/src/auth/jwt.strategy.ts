/**
 * JwtAuthStrategy — FLOW-01 Phase A1 + A4 (V-06 CLS scope write).
 *
 * Custom Passport strategy that delegates 100% to ITokenService.verify.
 *
 * Rationale (Rule 1 Fabric First): the Auth Fabric already owns JWT signing
 * and verification via per-tenant signing keys. Re-verifying in passport-jwt
 * would create two verification paths and duplicate the signing-key fetch
 * logic. Single source of truth = ITokenService.
 *
 * Behaviour:
 *   - Extract Bearer token from Authorization header.
 *   - Call ITokenService.verify(token) which reads CLS tenant + fetches that
 *     tenant's signing key + verifies signature + checks exp + enforces
 *     tenantId claim match (V-16 structural guarantee).
 *   - On success: attach { userId, tenantId, roles, jti, expiresAt } to req.user
 *     AND write ScopeContext to CLS under SCOPE_CONTEXT_KEY (Phase A4).
 *   - On failure: delegate to passport's `this.fail(reason)` → @nestjs/passport
 *     maps this to UnauthorizedException.
 *
 * Strategy name: `jwt` → used via `@UseGuards(AuthGuard('jwt'))` on protected
 * routes, OR via APP_GUARD global registration (Phase A4).
 *
 * Why the CLS write happens here (not in ScopeEnrichmentInterceptor alone)
 * -----------------------------------------------------------------------
 * NestJS executes guards BEFORE interceptors. MasterTenantGuard (and a
 * future RolesGuard) read ScopeContext from CLS to enforce authorisation.
 * If scope enrichment lived only in an APP_INTERCEPTOR, those guards would
 * run against an empty CLS and always throw NO_SCOPE. Writing scope as part
 * of JWT authentication closes that gap — by the time the next guard in the
 * APP_GUARD chain runs, CLS is ready. The interceptor remains wired as a
 * defensive secondary write for non-JWT auth paths (future SSO, API keys,
 * etc.) and for HTTP tests that bypass Passport.
 */

import { Injectable, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as PassportBaseStrategy } from 'passport-strategy';
import { ClsService } from 'nestjs-cls';

import {
  TOKEN_SERVICE,
  ITokenService,
} from '../fabrics/interfaces/token.service.interface';
import { ScopeContext, SCOPE_CONTEXT_KEY } from '../kernel/scope-isolation';
import {
  TenantContext,
  TENANT_CONTEXT_KEY,
} from '../kernel/multi-tenant/tenant-context';
import { JwtVerifiedPrincipal } from './auth.dto';
import { CORRELATION_ID_HEADER } from './scope-enrichment.interceptor';

/** Request shape we care about — only headers. Kept narrow for tests. */
export interface AuthenticateRequest {
  headers?: Record<string, string | string[] | undefined>;
}

export const BEARER_PREFIX = 'Bearer ';

export function extractBearerToken(req: AuthenticateRequest): string | null {
  const header = req?.headers?.['authorization'] ?? req?.headers?.['Authorization'];
  if (typeof header !== 'string') return null;
  if (!header.startsWith(BEARER_PREFIX)) return null;
  const token = header.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}

/** Read the first matching correlation-id header value (lowercase/PascalCase). */
function readCorrelationId(req: AuthenticateRequest): string | undefined {
  const headers = req?.headers ?? {};
  const raw =
    headers[CORRELATION_ID_HEADER] ??
    headers['X-Correlation-Id'] ??
    headers['X-CORRELATION-ID'];
  if (Array.isArray(raw)) return raw[0];
  return typeof raw === 'string' && raw.length > 0 ? raw : undefined;
}

/**
 * Passport expects strategies to call these on `this` at runtime.
 * The base Strategy class doesn't declare them as TS members, so we narrow
 * the shape we actually rely on.
 */
interface PassportStrategyCallbacks {
  success(user: unknown, info?: unknown): void;
  fail(challenge?: unknown, status?: number): void;
  error(err: Error): void;
}

@Injectable()
export class JwtAuthStrategy extends PassportStrategy(
  PassportBaseStrategy as unknown as new () => object,
  'jwt',
) {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokens: ITokenService,
    private readonly cls: ClsService,
  ) {
    super();
  }

  /**
   * Passport-strategy contract. Runs on every request guarded by
   * AuthGuard('jwt'). Must call `this.success(user)`, `this.fail(reason)`,
   * or `this.error(err)`.
   *
   * MUST be a prototype method (not an arrow-function class property) — Passport
   * calls this via a clone created with `Object.create(prototype)`, then binds
   * `success / fail / error` on the clone. A prototype method invoked on the
   * clone sees `this === clone` (callbacks bound). An arrow-function class
   * property would capture `this` lexically at construction time (the original
   * instance, where Passport never binds those callbacks) and fail at runtime
   * with `self.fail is not a function`.
   *
   * The nested promise callback uses `self = this` captured when the method
   * runs (i.e. on the clone) so the async continuation also sees the bound
   * callbacks.
   */
  public authenticate(req: AuthenticateRequest): void {
    const self = this as unknown as PassportStrategyCallbacks & {
      tokens: ITokenService;
      cls: ClsService;
      writeScopeToCls: JwtAuthStrategy['writeScopeToCls'];
    };
    const token = extractBearerToken(req);
    if (!token) {
      self.fail('NO_TOKEN');
      return;
    }

    // Fire-and-forget; passport's signature is sync but async is idiomatic here.
    void self.tokens
      .verify(token)
      .then((result) => {
        if (!result.isSuccess || !result.data) {
          self.fail(result.errorCode ?? 'TOKEN_INVALID');
          return;
        }
        const verified = result.data;
        const principal: JwtVerifiedPrincipal = {
          userId: verified.subject,
          tenantId: verified.tenantId,
          roles: verified.roles,
          jti: verified.jti,
          expiresAt: verified.expiresAt,
        };
        // Phase A4 (V-06): populate CLS scope so downstream guards
        // (MasterTenantGuard, future RolesGuard) can read it without
        // waiting for the APP_INTERCEPTOR pass. Idempotent vs the
        // interceptor's secondary write.
        self.writeScopeToCls(principal, readCorrelationId(req));
        self.success(principal);
      })
      .catch((e: unknown) => {
        const err = e instanceof Error ? e : new Error(String(e));
        self.error(err);
      });
  }

  /**
   * Build a ScopeContext from the verified principal and persist it in CLS.
   * Falls back to TenantContext.tenantId when the principal's claim is
   * missing or empty (matches ScopeEnrichmentInterceptor resolution order).
   *
   * Exposed as a protected method so tests can verify the CLS write
   * independently of the async verify pipeline.
   */
  protected writeScopeToCls(
    principal: JwtVerifiedPrincipal,
    correlationId?: string,
  ): void {
    const tenantContext = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
    const fromPrincipal =
      typeof principal.tenantId === 'string' && principal.tenantId.length > 0
        ? principal.tenantId
        : undefined;
    const fromContext = tenantContext ? tenantContext.tenantId : undefined;
    const tenantId = fromPrincipal ?? fromContext ?? '';
    const scope = new ScopeContext({
      tenantId,
      userId: principal.userId,
      correlationId,
      roles: [...principal.roles],
    });
    this.cls.set(SCOPE_CONTEXT_KEY, scope);
  }

  /**
   * @nestjs/passport's PassportStrategy mixin requires every subclass to
   * implement `validate(...)`. Our strategy performs verification in
   * authenticate() directly (single source of truth = ITokenService.verify),
   * so this method is never reached in practice. Present only to satisfy
   * the mixin type.
   */
  public readonly validate = async (): Promise<void> => undefined;
}
